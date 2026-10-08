#!/usr/bin/env node
/**
 * Narration generator for docs/videos.
 *
 *   node tools/video-audio/generate-audio.mjs docs/videos/NN-topic [--dry-run] [--force]
 *   node tools/video-audio/generate-audio.mjs --say "text" --out file.mp3
 *
 * Parses script.md strictly, speaks each paragraph with the free edge-tts package
 * (Microsoft Edge read-aloud; no key, no Azure), joins the clips with short gaps,
 * writes <folder>/<folder-name>.mp3 and a timing manifest at
 * .cache/<folder-name>/timing.json that the video builder syncs slides to.
 *
 * Environment: PYTHON (interpreter that has edge-tts, default python3),
 * EDGE_VOICE / EDGE_VOICE_2 (narrator / second speaker), FFMPEG_PATH, FFPROBE_PATH.
 */
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GAP_PARAGRAPH, GAP_SECTION, LEAD_IN, TAIL, WORDS_PER_MINUTE, loadLexicon, parseScript, speakable } from './script.mjs';

const run = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

const PYTHON = process.env.PYTHON || 'python3';
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';
const VOICE_1 = process.env.EDGE_VOICE || 'en-US-AndrewMultilingualNeural';
const VOICE_2 = process.env.EDGE_VOICE_2 || 'en-US-AvaMultilingualNeural';
const CONCURRENCY = 4;

// ---------------------------------------------------------------- CLI

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

if (option('--say') !== undefined) {
  const out = option('--out') || path.join(repoRoot, '.cache', 'pronunciation-test.mp3');
  const lexicon = await loadLexicon();
  const spoken = speakable(option('--say'), lexicon);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await synthesize(spoken, VOICE_1, out);
  console.log(`Spoken as: "${spoken}"\nWrote ${out}`);
  process.exit(0);
}

const folderArg = args.find((a) => !a.startsWith('--') && a !== option('--out'));
if (!folderArg) {
  console.error('Usage: generate-audio.mjs <video-folder> [--dry-run] [--force] | --say "text" [--out file]');
  process.exit(2);
}
const folder = path.resolve(folderArg);
const folderName = path.basename(folder);
const scriptPath = path.join(folder, 'script.md');
const cacheDir = path.join(repoRoot, '.cache', folderName);
const mp3Path = path.join(folder, `${folderName}.mp3`);
const manifestPath = path.join(cacheDir, 'timing.json');

const lexicon = await loadLexicon();
const script = parseScript(await fs.readFile(scriptPath, 'utf8'), lexicon);
report(script);

if (flag('--dry-run')) process.exit(0);

await fs.mkdir(path.join(cacheDir, 'clips'), { recursive: true });
await generate(script);

// ---------------------------------------------------------------- reporting

function report(script) {
  const paragraphs = script.sections.flatMap((s) => s.paragraphs);
  const words = paragraphs.reduce((n, p) => n + (p.words || 0), 0);
  const pauses = paragraphs.filter((p) => p.kind === 'pause').reduce((n, p) => n + p.seconds, 0);
  const speech = paragraphs.filter((p) => p.kind === 'speech');
  const gaps = speech.length * GAP_PARAGRAPH + script.sections.length * GAP_SECTION + LEAD_IN + TAIL;
  const seconds = (words / WORDS_PER_MINUTE) * 60 + pauses + gaps;
  console.log(`# ${script.number} · ${script.title}`);
  console.log(`${script.sections.length} sections, ${speech.length} paragraphs, ${words} words, estimated ${fmt(seconds)} at ${WORDS_PER_MINUTE} wpm`);
  for (const s of script.sections) {
    console.log(`  - ${s.title}: ${s.words} words (~${fmt((s.words / WORDS_PER_MINUTE) * 60)})`);
  }
  const speakers = [...new Set(speech.map((p) => p.speaker))];
  if (speakers.length > 1) console.log(`speakers: ${speakers.join(', ')}`);
}

function fmt(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds - m * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- synthesis

async function synthesize(text, voice, outFile) {
  await run(PYTHON, ['-m', 'edge_tts', '--voice', voice, '--text', text, '--write-media', outFile], {
    maxBuffer: 16 * 1024 * 1024,
  });
}

async function duration(file) {
  const { stdout } = await run(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return Number(stdout.trim());
}

async function withRetry(fn, attempts = 4) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastError;
}

async function generate(script) {
  const speech = script.sections.flatMap((s) => s.paragraphs.filter((p) => p.kind === 'speech'));
  const force = flag('--force');

  // 1. Synthesize every paragraph to a cached WAV (24 kHz mono), a few at a time.
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < speech.length) {
      const p = speech[next++];
      const voice = p.speaker === 'narrator' ? VOICE_1 : VOICE_2;
      const hash = createHash('sha1').update(`${voice}\n${p.spoken}`).digest('hex').slice(0, 16);
      const mp3 = path.join(cacheDir, 'clips', `${hash}.mp3`);
      const wav = path.join(cacheDir, 'clips', `${hash}.wav`);
      p.clip = wav;
      if (force || !(await exists(wav))) {
        await withRetry(() => synthesize(p.spoken, voice, mp3));
        await run(FFMPEG, ['-y', '-v', 'error', '-i', mp3, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
      }
      p.duration = await duration(wav);
      done++;
      if (process.stdout.isTTY) process.stdout.write(`\rsynthesized ${done}/${speech.length}`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, speech.length) }, worker));
  console.log(`${process.stdout.isTTY ? '\n' : ''}synthesized ${done} paragraphs`);

  // 2. Lay the clips out on a timeline with silence between them.
  const silences = new Map();
  const silence = async (seconds) => {
    const key = seconds.toFixed(3);
    if (!silences.has(key)) {
      const file = path.join(cacheDir, 'clips', `silence-${key}.wav`);
      await run(FFMPEG, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', key, '-c:a', 'pcm_s16le', file]);
      silences.set(key, file);
    }
    return silences.get(key);
  };

  const entries = [];
  let t = 0;
  const push = async (file, seconds) => {
    entries.push({ file, seconds });
    t += seconds;
  };
  await push(await silence(LEAD_IN), LEAD_IN);
  const manifest = { number: script.number, title: script.title, folder: folderName, sections: [] };
  for (const [si, s] of script.sections.entries()) {
    if (si > 0) await push(await silence(GAP_SECTION), GAP_SECTION);
    const section = { index: si, title: s.title, start: round(t), paragraphs: [] };
    for (const [pi, p] of s.paragraphs.entries()) {
      if (p.kind === 'pause') {
        await push(await silence(p.seconds), p.seconds);
        section.paragraphs.push({ index: pi, kind: 'pause', start: round(t - p.seconds), end: round(t) });
        continue;
      }
      if (pi > 0 && s.paragraphs[pi - 1].kind === 'speech') await push(await silence(GAP_PARAGRAPH), GAP_PARAGRAPH);
      const start = t;
      await push(p.clip, p.duration);
      section.paragraphs.push({
        index: pi,
        kind: 'speech',
        speaker: p.speaker,
        text: p.caption,
        words: p.words,
        start: round(start),
        end: round(t),
      });
    }
    section.end = round(t);
    manifest.sections.push(section);
  }
  await push(await silence(TAIL), TAIL);
  manifest.duration = round(t);

  // 3. Concatenate and encode the MP3, then record the real duration.
  const listFile = path.join(cacheDir, 'concat.txt');
  await fs.writeFile(listFile, entries.map((e) => `file '${e.file.replace(/'/g, "'\\''")}'`).join('\n') + '\n');
  await run(FFMPEG, ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-c:a', 'libmp3lame', '-b:a', '64k', mp3Path]);
  manifest.mp3Duration = await duration(mp3Path);
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`wrote ${path.relative(repoRoot, mp3Path)} (${fmt(manifest.mp3Duration)})`);
  console.log(`wrote ${path.relative(repoRoot, manifestPath)}`);
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}
async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
