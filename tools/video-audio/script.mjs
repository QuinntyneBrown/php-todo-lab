/**
 * Shared script.md parser and spoken-text rules for the video tools.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const WORDS_PER_MINUTE = 150;
export const GAP_PARAGRAPH = 0.45; // seconds of silence between paragraphs
export const GAP_SECTION = 1.0; // seconds of silence at a section boundary
export const LEAD_IN = 0.6;
export const TAIL = 1.2;

// ---------------------------------------------------------------- parsing

export function parseScript(markdown, lexicon) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const errors = [];
  const sections = [];
  let title = null;
  let number = null;
  let current = null;
  let buffer = [];
  let bufferStart = 0;

  const flush = () => {
    if (buffer.length === 0) return;
    const raw = buffer.join(' ').replace(/\s+/g, ' ').trim();
    buffer = [];
    if (!current) {
      errors.push(`line ${bufferStart}: narration before the first "## Section" heading`);
      return;
    }
    addParagraph(current, raw, bufferStart, lexicon);
  };

  lines.forEach((line, i) => {
    const n = i + 1;
    const trimmed = line.trim();
    if (title === null) {
      if (trimmed === '') return;
      const m = trimmed.match(/^# (\d{2}) · (.+)$/);
      if (!m) errors.push(`line ${n}: first line must be "# NN · Title"`);
      number = m ? m[1] : '00';
      title = m ? m[2].trim() : trimmed;
      // The intro paragraphs before the first "##" belong to an implicit section.
      current = { title: 'Introduction', line: n, paragraphs: [], implicit: true };
      sections.push(current);
      return;
    }
    if (trimmed.startsWith('```')) errors.push(`line ${n}: fenced code blocks are not allowed in script.md`);
    if (trimmed.startsWith('|')) errors.push(`line ${n}: tables are not allowed in script.md`);
    if (/<[a-zA-Z/][^>]*>/.test(trimmed)) errors.push(`line ${n}: HTML is not allowed in script.md`);
    if (/\[[^\]]+\]\([^)]+\)/.test(trimmed)) errors.push(`line ${n}: links are not allowed in script.md`);
    if (/^#{3,}\s/.test(trimmed)) errors.push(`line ${n}: only "#" and "##" headings are allowed`);

    if (trimmed.startsWith('## ')) {
      flush();
      current = { title: trimmed.slice(3).trim(), line: n, paragraphs: [] };
      sections.push(current);
      return;
    }
    const pause = trimmed.match(/^\[pause (\d+(?:\.\d+)?)s\]$/);
    if (pause) {
      flush();
      current.paragraphs.push({ kind: 'pause', seconds: Number(pause[1]), line: n });
      return;
    }
    if (trimmed === '') {
      flush();
      return;
    }
    if (trimmed.startsWith('- ')) {
      flush();
      addParagraph(current, trimmed.slice(2).trim(), n, lexicon);
      return;
    }
    if (buffer.length === 0) bufferStart = n;
    buffer.push(trimmed);
  });
  flush();

  // Drop an empty implicit intro section.
  if (sections[0]?.implicit && sections[0].paragraphs.length === 0) sections.shift();

  for (const s of sections) {
    const words = s.paragraphs.reduce((sum, p) => sum + (p.words || 0), 0);
    s.words = words;
    const speech = words / WORDS_PER_MINUTE;
    if (speech > 9) errors.push(`section "${s.title}" is about ${speech.toFixed(1)} minutes of speech; keep sections under ~9 minutes`);
  }
  if (errors.length) {
    console.error(`script.md has ${errors.length} problem(s):\n  - ${errors.join('\n  - ')}`);
    process.exit(1);
  }
  return { number, title, sections };
}

function addParagraph(section, raw, line, lexicon) {
  let speaker = 'narrator';
  let text = raw;
  const m = raw.match(/^\*\*([^*]+):\*\*\s*(.+)$/);
  if (m) {
    speaker = m[1].trim();
    text = m[2].trim();
  }
  const caption = plainText(text);
  section.paragraphs.push({
    kind: 'speech',
    speaker,
    raw: text,
    caption,
    spoken: speakable(text, lexicon),
    words: countWords(caption),
    line,
  });
}

export function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Text as shown in captions and matched by slide cues: markdown markers removed. */
export function plainText(text) {
  return text.replace(/`([^`]*)`/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/(^|\s)\*([^*]+)\*(?=\s|$|[.,;:!?])/g, '$1$2');
}

/** Text handed to the synthesizer: lexicon applied, identifiers split into words. */
export function speakable(text, lexicon) {
  const keys = Object.keys(lexicon).sort((a, b) => b.length - a.length);
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const applyLexicon = (s) => {
    for (const key of keys) {
      const re = new RegExp(`(^|[^A-Za-z0-9_])${escape(key)}(?=$|[^A-Za-z0-9_])`, 'g');
      s = s.replace(re, (_, pre) => `${pre}\u0000${lexicon[key]}\u0000`);
    }
    return s.replace(/\u0000/g, '');
  };
  const humanize = (code) => {
    if (lexicon[code] !== undefined) return lexicon[code];
    let s = code.replace(/\(\)$/, '').replace(/^\$/, '');
    s = s.replace(/\\/g, ' ').replace(/::/g, ' ').replace(/->/g, ' ').replace(/[_/]/g, ' ');
    s = s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
    return applyLexicon(s.replace(/\s+/g, ' ').trim());
  };
  let out = text.replace(/`([^`]*)`/g, (_, code) => ` ${humanize(code)} `);
  out = plainText(out);
  out = applyLexicon(out);
  return out.replace(/\s+/g, ' ').replace(/\s+([.,;:!?])/g, '$1').replace(/\s+'s\b/g, "'s").trim();
}

export async function loadLexicon() {
  const raw = JSON.parse(await fs.readFile(path.join(here, 'pronunciations.json'), 'utf8'));
  delete raw._comment;
  return raw;
}

