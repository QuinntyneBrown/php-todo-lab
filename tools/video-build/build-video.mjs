#!/usr/bin/env node
/**
 * Video builder for docs/videos.
 *
 *   node tools/video-build/build-video.mjs docs/videos/NN-topic [--check | --slides-only] [--fps 15]
 *
 * Resolves every slide's data-cue to a time on the narration (section boundaries are
 * exact; inside a section the time is estimated from word counts), screenshots each
 * slide at 1920x1080 in headless Chromium, writes captions from the script, and
 * encodes <folder>/<folder-name>.mp4 (libx264 + aac, captions burned in).
 *
 * Environment: EDGE_PATH (Chromium/Chrome/Edge binary), FFMPEG_PATH, FFPROBE_PATH.
 * Without a timing manifest (run generate-audio.mjs first) --check estimates times
 * from word counts so cues can be validated before synthesis.
 */
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const run = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';
const WIDTH = 1920;
const HEIGHT = 1080;
const WORDS_PER_MINUTE = 150;
const MIN_SLIDE = 4;
const MAX_SLIDE = 90;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const folderArg = args.find((a) => !a.startsWith('--') && a !== option('--fps'));
if (!folderArg) {
  console.error('Usage: build-video.mjs <video-folder> [--check | --slides-only] [--fps 15]');
  process.exit(2);
}
const folder = path.resolve(folderArg);
const folderName = path.basename(folder);
const cacheDir = path.join(repoRoot, '.cache', folderName);
const slidesPath = path.join(folder, 'slides.html');
const scriptPath = path.join(folder, 'script.md');
const manifestPath = path.join(cacheDir, 'timing.json');
const mp3Path = path.join(folder, `${folderName}.mp3`);
const mp4Path = path.join(folder, `${folderName}.mp4`);
const FPS = Number(option('--fps', '15'));

// ---------------------------------------------------------------- timing

const { parseScript, loadLexicon } = await import(pathToFileURL(path.join(repoRoot, 'tools/video-audio/script.mjs')).href);
const lexicon = await loadLexicon();

let manifest = null;
try {
  manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
} catch {
  if (!flag('--check')) {
    console.error(`No timing manifest at ${path.relative(repoRoot, manifestPath)}. Run generate-audio.mjs first.`);
    process.exit(1);
  }
  console.log('No timing manifest yet: estimating times from word counts.');
  manifest = estimateManifest(parseScript(await fs.readFile(scriptPath, 'utf8'), lexicon));
}

function estimateManifest(script) {
  let t = 0.6;
  const sections = script.sections.map((s, index) => {
    if (index > 0) t += 1.0;
    const start = t;
    const paragraphs = s.paragraphs.map((p, pi) => {
      if (p.kind === 'pause') {
        t += p.seconds;
        return { index: pi, kind: 'pause', start: t - p.seconds, end: t };
      }
      if (pi > 0) t += 0.45;
      const start = t;
      t += (p.words / WORDS_PER_MINUTE) * 60;
      return { index: pi, kind: 'speech', speaker: p.speaker, text: p.caption, words: p.words, start, end: t };
    });
    return { index, title: s.title, start, end: t, paragraphs };
  });
  return { number: script.number, title: script.title, sections, duration: t + 1.2, mp3Duration: t + 1.2, estimated: true };
}

// ---------------------------------------------------------------- slides

const html = await fs.readFile(slidesPath, 'utf8');
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], decode(m[2])]));
const body = attrs(html.match(/<body[^>]*>/)?.[0] || '');
const parts = (body['data-parts'] || '').split('|').filter(Boolean);
const slides = [...html.matchAll(/<section\b[^>]*>/g)].map((m, index) => ({ index, ...attrs(m[0]) }));
if (slides.length === 0) fail('slides.html has no <section> elements');

const flatParagraphs = manifest.sections.flatMap((s) => s.paragraphs.filter((p) => p.kind === 'speech').map((p) => ({ ...p, section: s })));
const normalize = (s) => s.replace(/\s+/g, ' ').trim();

function resolveCue(cue) {
  const needle = normalize(cue);
  const hits = [];
  for (const s of manifest.sections) {
    if (normalize(s.title) === needle) hits.push({ time: s.start, where: `section "${s.title}"` });
  }
  for (const p of flatParagraphs) {
    const text = normalize(p.text);
    let from = 0;
    while (true) {
      const at = text.indexOf(needle, from);
      if (at < 0) break;
      const wordsBefore = text.slice(0, at).split(/\s+/).filter(Boolean).length;
      const time = at === 0 ? p.start : p.start + (wordsBefore / p.words) * (p.end - p.start);
      hits.push({ time, where: `paragraph ${p.section.index + 1}.${p.index + 1}` });
      from = at + 1;
    }
  }
  return hits;
}

const problems = [];
const schedule = slides.map((slide) => {
  if (slide.index === 0) return { ...slide, time: 0 };
  if (!slide['data-cue']) {
    problems.push(`slide ${slide.index + 1} (#${slide.id || '?'}) has no data-cue`);
    return { ...slide, time: null };
  }
  const hits = resolveCue(slide['data-cue']);
  if (hits.length === 0) problems.push(`slide ${slide.index + 1} (#${slide.id || '?'}): cue not found in script: "${slide['data-cue']}"`);
  if (hits.length > 1) problems.push(`slide ${slide.index + 1} (#${slide.id || '?'}): cue occurs ${hits.length} times: "${slide['data-cue']}"`);
  return { ...slide, time: hits[0]?.time ?? null, where: hits[0]?.where };
});
for (let i = 1; i < schedule.length; i++) {
  const prev = schedule[i - 1].time;
  const cur = schedule[i].time;
  if (prev !== null && cur !== null && cur <= prev) problems.push(`slide ${i + 1} (#${schedule[i].id || '?'}) is cued at ${fmt(cur)}, not after slide ${i} (${fmt(prev)}): cues must be in narration order`);
  const part = Number(schedule[i]['data-part'] ?? 0);
  if (parts.length && (part < 0 || part >= parts.length)) problems.push(`slide ${i + 1}: data-part ${part} is outside data-parts (${parts.length} parts)`);
}
const total = manifest.mp3Duration || manifest.duration;
for (let i = 0; i < schedule.length; i++) {
  const start = schedule[i].time;
  const end = i + 1 < schedule.length ? schedule[i + 1].time : total;
  if (start === null || end === null) continue;
  schedule[i].duration = end - start;
}

console.log(`${folderName}: ${slides.length} slides, ${parts.length} parts, narration ${fmt(total)}${manifest.estimated ? ' (estimated)' : ''}`);
for (const s of schedule) {
  const warn = s.duration !== undefined && (s.duration < MIN_SLIDE || s.duration > MAX_SLIDE) ? '  <-- outside 4-90 s' : '';
  console.log(`  ${String(s.index + 1).padStart(2)}  ${s.time === null ? '  ?:??' : fmt(s.time)}  ${s.duration === undefined ? '     ' : (s.duration.toFixed(1) + 's').padStart(6)}  #${(s.id || '').padEnd(28)} ${s.where || ''}${warn}`);
}
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
if (flag('--check')) process.exit(0);
if (manifest.estimated) fail('cannot render without a timing manifest');

// ---------------------------------------------------------------- rendering

const framesDir = path.join(cacheDir, 'slides');
await fs.rm(framesDir, { recursive: true, force: true });
await fs.mkdir(framesDir, { recursive: true });
await renderSlides(slides.length, framesDir);
console.log(`rendered ${slides.length} slides to ${path.relative(repoRoot, framesDir)}`);
if (flag('--slides-only')) process.exit(0);

// ---------------------------------------------------------------- captions

const assPath = path.join(cacheDir, 'captions.ass');
await fs.writeFile(assPath, buildAss(flatParagraphs));

// ---------------------------------------------------------------- encoding

const listPath = path.join(cacheDir, 'frames.txt');
const lines = [];
for (const s of schedule) {
  lines.push(`file '${path.join(framesDir, frameName(s.index))}'`);
  lines.push(`duration ${Math.max(0.05, s.duration).toFixed(3)}`);
}
lines.push(`file '${path.join(framesDir, frameName(schedule.length - 1))}'`); // concat demuxer quirk: repeat the last frame
await fs.writeFile(listPath, lines.join('\n') + '\n');

const assArg = assPath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
await run(FFMPEG, [
  '-y', '-v', 'error', '-stats',
  '-f', 'concat', '-safe', '0', '-i', listPath,
  '-i', mp3Path,
  '-vf', `fps=${FPS},ass='${assArg}',format=yuv420p`,
  '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'stillimage', '-crf', '23', '-g', String(FPS * 10),
  '-c:a', 'aac', '-b:a', '96k',
  '-movflags', '+faststart', '-shortest',
  mp4Path,
], { maxBuffer: 64 * 1024 * 1024 });

const { stdout } = await run(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration:stream=codec_name,width,height', '-of', 'default=noprint_wrappers=1', mp4Path]);
console.log(`wrote ${path.relative(repoRoot, mp4Path)}\n${stdout.trim()}`);

// ---------------------------------------------------------------- helpers

function frameName(index) {
  return `slide-${String(index + 1).padStart(2, '0')}.png`;
}

function fmt(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function assTime(seconds) {
  const cs = Math.round(seconds * 100);
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`;
}

/** Splits each paragraph into caption cues of at most two ~44-character lines, timed by word share. */
function buildAss(paragraphs) {
  const MAX_CHARS = 88;
  const cues = [];
  for (const p of paragraphs) {
    const text = p.speaker === 'narrator' ? p.text : `${p.speaker}: ${p.text}`;
    const chunks = chunkText(text, MAX_CHARS);
    const totalWords = chunks.reduce((n, c) => n + c.split(/\s+/).length, 0);
    let t = p.start;
    for (const chunk of chunks) {
      const share = chunk.split(/\s+/).length / totalWords;
      const end = t + share * (p.end - p.start);
      cues.push({ start: t, end: Math.max(t + 0.3, end - 0.05), text: wrap(chunk) });
      t = end;
    }
  }
  const escape = (s) => s.replace(/\{/g, '(').replace(/\}/g, ')').replace(/\n/g, '\\N');
  const header = [
    '[Script Info]', 'ScriptType: v4.00+', `PlayResX: ${WIDTH}`, `PlayResY: ${HEIGHT}`, 'WrapStyle: 2', 'ScaledBorderAndShadow: yes', '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    'Style: Default,DejaVu Sans,36,&H00FFFFFF,&H00FFFFFF,&H00000000,&H88000000,0,0,0,0,100,100,0,0,3,8,0,2,200,200,34,1', '',
    '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];
  const events = cues.map((c) => `Dialogue: 0,${assTime(c.start)},${assTime(c.end)},Default,,0,0,0,,${escape(c.text)}`);
  return header.concat(events).join('\n') + '\n';
}

function chunkText(text, max) {
  const words = text.split(/\s+/);
  const chunks = [];
  let current = [];
  const flush = () => {
    if (current.length) chunks.push(current.join(' '));
    current = [];
  };
  for (const word of words) {
    const candidate = [...current, word].join(' ');
    if (candidate.length > max) flush();
    current.push(word);
    // Prefer breaking after sentence or clause ends once a chunk is reasonably full.
    const joined = current.join(' ');
    if (joined.length > max * 0.6 && /[.!?;:]$/.test(word)) flush();
  }
  flush();
  return chunks;
}

function wrap(text) {
  if (text.length <= 44) return text;
  const words = text.split(' ');
  let best = '';
  let line = '';
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (candidate.length > text.length / 2 && line) {
      best = line;
      break;
    }
    line = candidate;
  }
  if (!best) return text;
  return `${best}\n${text.slice(best.length + 1)}`;
}

/** Headless Chromium through the DevTools protocol; falls back to one --screenshot launch per slide. */
async function renderSlides(count, outDir) {
  const browser = process.env.EDGE_PATH || (await findBrowser());
  if (!browser) fail('No Chromium/Chrome/Edge found. Set EDGE_PATH to the browser binary.');
  const url = pathToFileURL(slidesPath).href;
  try {
    await renderWithCdp(browser, url, count, outDir);
  } catch (e) {
    console.warn(`DevTools rendering failed (${e.message}); falling back to --screenshot per slide`);
    for (let i = 0; i < count; i++) {
      const out = path.join(outDir, frameName(i));
      await run(browser, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--window-size=${WIDTH},${HEIGHT}`, '--virtual-time-budget=2000', `--screenshot=${out}`, `${url}?slide=${i + 1}`]);
    }
  }
}

async function findBrowser() {
  const candidates = [
    '/opt/pw-browsers/chromium', 'chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable', 'microsoft-edge', 'msedge',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ];
  for (const c of candidates) {
    try {
      if (c.includes('/') || c.includes(':')) {
        await fs.access(c);
        return c;
      }
      const { stdout } = await run(process.platform === 'win32' ? 'where' : 'which', [c]);
      if (stdout.trim()) return stdout.trim().split('\n')[0];
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

async function renderWithCdp(browser, url, count, outDir) {
  const proc = spawn(browser, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--window-size=${WIDTH},${HEIGHT}`, '--remote-debugging-port=0', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(() => reject(new Error('browser did not report a DevTools endpoint')), 15000);
    proc.stderr.on('data', (chunk) => {
      buffer += chunk.toString();
      const m = buffer.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) {
        clearTimeout(timer);
        resolve(m[1]);
      }
    });
    proc.on('exit', (code) => reject(new Error(`browser exited with code ${code}`)));
  });
  try {
    const cdp = await connect(wsUrl);
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const page = (method, params = {}) => cdp.send(method, params, sessionId);
    await page('Page.enable');
    await page('Runtime.enable');
    await page('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });
    const loaded = cdp.waitFor('Page.loadEventFired', sessionId);
    await page('Page.navigate', { url });
    await loaded;
    await page('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => true)', awaitPromise: true });
    const { result } = await page('Runtime.evaluate', { expression: 'window.__slides ? window.__slides.count : -1', returnByValue: true });
    if (result.value !== count) throw new Error(`slides.js reports ${result.value} slides, the HTML has ${count}`);
    for (let i = 0; i < count; i++) {
      await page('Runtime.evaluate', { expression: `window.__slides.show(${i})`, awaitPromise: true });
      await new Promise((r) => setTimeout(r, 60));
      const { data } = await page('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await fs.writeFile(path.join(outDir, frameName(i)), Buffer.from(data, 'base64'));
      if (process.stdout.isTTY) process.stdout.write(`\rrendered ${i + 1}/${count}`);
    }
    if (process.stdout.isTTY) process.stdout.write('\n');
    cdp.close();
  } finally {
    proc.kill();
  }
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    const listeners = [];
    ws.addEventListener('open', () => resolve(api));
    ws.addEventListener('error', (e) => reject(new Error(`DevTools websocket error: ${e.message || 'unknown'}`)));
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? reject(new Error(`${msg.error.message}`)) : resolve(msg.result);
      } else if (msg.method) {
        for (const l of [...listeners]) {
          if (l.method === msg.method && (!l.sessionId || l.sessionId === msg.sessionId)) {
            listeners.splice(listeners.indexOf(l), 1);
            l.resolve(msg.params);
          }
        }
      }
    });
    const api = {
      send(method, params = {}, sessionId) {
        const msgId = ++id;
        return new Promise((resolve, reject) => {
          pending.set(msgId, { resolve, reject });
          ws.send(JSON.stringify({ id: msgId, method, params, sessionId }));
        });
      },
      waitFor(method, sessionId) {
        return new Promise((resolve) => listeners.push({ method, sessionId, resolve }));
      },
      close() {
        ws.close();
      },
    };
  });
}
