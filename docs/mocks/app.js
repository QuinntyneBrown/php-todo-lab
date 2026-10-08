/* Mock-only helpers. Not part of the product.
   1. ?theme=light|dark forces a theme (the product follows the OS only, L2-026).
   2. Fills [data-today] with the current weekday and date in the user's locale (L2-022.4).
   3. Sets each progress ring from its data-progress (0 to 1).
   4. Carries ?theme across mock links, and drives the launcher's theme switch. */
(() => {
  const theme = new URLSearchParams(location.search).get('theme');
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;

  const RING = 125.66;

  document.addEventListener('DOMContentLoaded', () => {
    const now = new Date();
    const fmt = { weekday: { weekday: 'long' }, date: { day: 'numeric', month: 'long' } };
    document.querySelectorAll('[data-today]').forEach((el) => {
      el.textContent = now.toLocaleDateString(undefined, fmt[el.dataset.today]);
    });

    document.querySelectorAll('.ring__fill[data-progress]').forEach((c) => {
      c.style.strokeDashoffset = String(RING * (1 - Number(c.dataset.progress)));
    });

    if (theme) {
      document.querySelectorAll('a[href]').forEach((a) => {
        const href = a.getAttribute('href');
        if (!/\.html(#|$)/.test(href) || /^[a-z]+:/i.test(href)) return;
        const [path, hash] = href.split('#');
        a.setAttribute('href', `${path}?theme=${theme}${hash ? `#${hash}` : ''}`);
      });
    }

    document.querySelectorAll('[data-set-theme]').forEach((b) => {
      b.setAttribute('aria-pressed', String((theme || 'auto') === b.dataset.setTheme));
      b.addEventListener('click', () => {
        const url = new URL(location.href);
        if (b.dataset.setTheme === 'auto') url.searchParams.delete('theme');
        else url.searchParams.set('theme', b.dataset.setTheme);
        location.href = url.toString();
      });
    });
  });
})();
