/* Shared slide runtime for docs/videos: shows one <section> at a time, builds the
   header from body[data-parts], highlights code, expands progressive templates.
   Navigation: ?slide=N or #N (1-based), arrow keys / space. The video builder
   calls window.__slides.show(i) (0-based). */
(function () {
  const body = document.body;
  const number = body.dataset.videoNumber || '';
  const title = body.dataset.videoTitle || document.title;
  const parts = (body.dataset.parts || '').split('|').filter(Boolean);

  // Expand progressive-build sections from <template> elements.
  document.querySelectorAll('section[data-template]').forEach((section) => {
    const tpl = document.getElementById(section.dataset.template);
    if (!tpl) return;
    const clone = tpl.content.cloneNode(true);
    const items = Array.from(clone.querySelectorAll('.item'));
    if (section.dataset.show) {
      const n = Number(section.dataset.show);
      items.forEach((el, i) => { if (i >= n) el.classList.add('hidden'); });
    }
    if (section.dataset.highlight) {
      const [a, b] = section.dataset.highlight.split('-').map(Number);
      const lo = a, hi = b || a;
      items.forEach((el, i) => { const k = i + 1; if (k < lo || k > hi) el.classList.add('dim'); });
    }
    section.appendChild(clone);
  });

  const sections = Array.from(document.querySelectorAll('section'));

  // Header, progress bar, footer.
  const header = document.createElement('div');
  header.className = 'deck-header';
  header.innerHTML = '<div class="series"><b>php-todo-lab for .NET developers</b><span class="num">Video ' + number + '</span></div><div class="parts">' +
    parts.map((p) => '<span>' + escapeHtml(p) + '</span>').join('') + '</div>';
  body.appendChild(header);
  const progress = document.createElement('div');
  progress.className = 'deck-progress';
  body.appendChild(progress);
  const footer = document.createElement('div');
  footer.className = 'deck-footer';
  body.appendChild(footer);

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Code highlighting.
  const KEYWORDS = {
    php: 'abstract and array as break callable case catch class clone const continue declare default do echo else elseif enum extends final finally fn for foreach function global if implements instanceof insteadof interface match namespace new or private protected public readonly require return static switch throw trait try use var while yield true false null self parent',
    cs: 'abstract as async await base bool break case catch checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach get goto if implicit in init int interface internal is lock long namespace new null object operator out override params private protected public readonly record ref required return sbyte sealed set short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using var virtual void volatile where while with yield',
    ts: 'abstract as async await break case catch class const continue debugger default delete do else enum export extends false finally for from function if implements import in instanceof interface let new null of package private protected public return static super switch this throw true try type typeof var void while with yield readonly',
    sql: 'SELECT FROM WHERE AND OR NOT NULL IS IN INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE INDEX PRIMARY KEY CHAR VARCHAR TIMESTAMP ORDER BY DESC ASC LIMIT FOR UPDATE COUNT BEGIN COMMIT ROLLBACK ON DROP IF EXISTS DATABASE CHARACTER COLLATE GRANT ALL PRIVILEGES TO',
    sh: 'cd cp php composer npm npx node docker git export echo',
    yaml: 'true false null on off',
    json: 'true false null',
    md: '',
    xml: '',
    ini: '',
  };
  function tokenize(src, lang) {
    const kw = new Set((KEYWORDS[lang] || '').split(/\s+/).filter(Boolean));
    const re = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*|#(?!\[)[^\n]*|--[^\n]*)|('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`)|(#\[[^\]]*\]|\[[A-Z][\w]*(?:\([^)]*\))?\])|(\$[A-Za-z_]\w*)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)(?=\s*\()|(\b[A-Z][A-Za-z0-9_]*\b)|([A-Za-z_]\w*)/g;
    let out = '';
    let last = 0;
    let m;
    while ((m = re.exec(src))) {
      out += escapeHtml(src.slice(last, m.index));
      last = re.lastIndex;
      const text = escapeHtml(m[0]);
      if (m[1]) {
        // '#' comments only in sh/yaml/ini; '--' only in sql; in other languages treat as plain
        const isHash = m[0].startsWith('#');
        const isDash = m[0].startsWith('--');
        if ((isHash && !['sh', 'yaml', 'ini', 'php'].includes(lang)) || (isDash && lang !== 'sql') || (isHash && lang === 'php' && !m[0].startsWith('# '))) {
          out += text;
        } else out += '<span class="tok-cmt">' + text + '</span>';
      } else if (m[2]) out += '<span class="tok-str">' + text + '</span>';
      else if (m[3]) out += '<span class="tok-attr">' + text + '</span>';
      else if (m[4]) out += '<span class="tok-var">' + text + '</span>';
      else if (m[5]) out += '<span class="tok-num">' + text + '</span>';
      else if (m[6]) out += kw.has(m[6]) ? '<span class="tok-kw">' + text + '</span>' : '<span class="tok-fn">' + text + '</span>';
      else if (m[7]) out += kw.has(m[7]) ? '<span class="tok-kw">' + text + '</span>' : '<span class="tok-type">' + text + '</span>';
      else if (m[8]) out += kw.has(m[8]) ? '<span class="tok-kw">' + text + '</span>' : text;
      else out += text;
    }
    out += escapeHtml(src.slice(last));
    return out;
  }
  function parseMarks(spec) {
    const set = new Set();
    (spec || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((part) => {
      const [a, b] = part.split('-').map(Number);
      for (let i = a; i <= (b || a); i++) set.add(i);
    });
    return set;
  }
  document.querySelectorAll('pre.code').forEach((pre) => {
    const lang = pre.dataset.lang || '';
    const marks = parseMarks(pre.dataset.mark);
    const numbered = pre.hasAttribute('data-numbers');
    const text = pre.textContent.replace(/^\n/, '').replace(/\n\s*$/, '');
    const lines = text.split('\n');
    pre.innerHTML = lines.map((line, i) => {
      const n = i + 1;
      const cls = 'line' + (marks.has(n) ? ' mark' : '');
      return '<span class="' + cls + '">' + (numbered ? '<span class="ln">' + n + '</span>' : '') + tokenize(line, lang) + '</span>';
    }).join('');
  });

  // Show one slide.
  let current = -1;
  function show(i) {
    i = Math.max(0, Math.min(sections.length - 1, i));
    sections.forEach((s, k) => s.classList.toggle('active', k === i));
    current = i;
    const part = Number(sections[i].dataset.part || 0);
    header.querySelectorAll('.parts span').forEach((el, k) => el.classList.toggle('active', k === part));
    progress.style.width = parts.length ? ((part + 1) / parts.length) * 100 + '%' : '0';
    footer.innerHTML = '<span>' + escapeHtml(number ? number + ' · ' + title : title) + '</span><span class="counter">' + (i + 1) + ' / ' + sections.length + '</span>';
    return Promise.resolve(true);
  }
  function fromLocation() {
    const q = new URLSearchParams(location.search).get('slide');
    const h = location.hash.replace('#', '');
    const n = Number(q || h);
    return n >= 1 ? n - 1 : 0;
  }
  show(fromLocation());
  window.addEventListener('hashchange', () => show(fromLocation()));
  window.addEventListener('keydown', (e) => {
    if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); show(current + 1); }
    if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); show(current - 1); }
    if (e.key === 'Home') show(0);
    if (e.key === 'End') show(sections.length - 1);
  });
  window.__slides = { count: sections.length, show: show, get current() { return current; } };
})();
