# Tasks design system

Extracted from [docs/mocks](../mocks/README.md) on 8 October 2026. Open [index.html](index.html) locally (works from `file://`); press `t` or use the navigation button to switch theme.

The system documents the visual and interaction language of the one-screen to-do app specified in `docs/specs/L2.md` (L2-001 to L2-031, L2-042). It is a design artifact like the mocks: per `AGENTS.md` it has no tests. Its stylesheet is the reference the Angular components in `frontend/` follow.

```
tokens/tokens.css            source of truth: primitives, semantic tokens, light and dark
tokens/tokens.json           DTCG export generated from tokens.css
tokens/contrast-pairs.json   every fg/bg pairing the components rely on (checked)
assets/components.css        the component CSS, token-only, with data-state hooks
assets/ds.css, ds.js         documentation chrome: theme toggle, live token values and ratios
foundations/ components/ patterns/   one page each, linked below
```

## Foundations

| Page | Covers |
|---|---|
| [Color](foundations/color.html) | Ink, sea, sun and red ramps; semantic roles; both themes; every contrast pair, live. |
| [Typography](foundations/typography.html) | Bricolage Grotesque for display, Figtree for text; nine sizes; role shorthands. |
| [Spacing](foundations/spacing.html) | The 4px scale, inside versus between, and the three control heights. |
| [Layout](foundations/layout.html) | L2-027 breakpoints, the 560/640px task column, grid, gutters and margins. |
| [Elevation](foundations/elevation.html) | Four shadows, the canvas, surface and raised hierarchy, and z-order. |
| [Shape](foundations/shape.html) | Five radii plus full, and which radius fits which size; border widths. |
| [Motion](foundations/motion.html) | Five durations, the completion choreography and reduced motion. |
| [Iconography](foundations/iconography.html) | Stroke icons on a 24-unit grid, the icon sheet and labelling rules. |
| [Theming](foundations/theming.html) | Light and dark from prefers-color-scheme, token tiers, adding a theme. |
| [Responsive](foundations/responsive.html) | Mobile first, per-component breakpoint behaviour and touch rules. |
| [Accessibility](foundations/accessibility.html) | WCAG 2.2 AA commitments, L2-029/L2-030 and the testing procedure. |
| [Content](foundations/content.html) | Voice, sentence case, verbs, numbers, dates, error and empty-state formulas. |

## Components

| Component | Group | Variants | States | Source mocks |
|---|---|---|---|---|
| [Button](components/button.html) | Actions | primary, secondary, ghost, link, danger, ghost-danger, icon, block, collapse | default, hover, focus, active, disabled, loading, pressed | states.composer, states.toolbar, notifications, states.row |
| [Button group](components/button-group.html) | Actions | segmented (2–4 options), compact; toolbar | default, hover, focus, pressed, disabled | states.toolbar, page.filter-* |
| [Link](components/link.html) | Actions | inline, standalone with icon, external | default, hover, focus, visited | index (launcher), mock notes |
| [Menu](components/menu.html) | Actions | icons, shortcuts, sections, danger item, checkable | default, hover, focus, disabled, checked, open | none (D22) |
| [Text field](components/text-field.html) | Inputs | default, filled, with counter, prefix/suffix, search, password | default, hover, focus, invalid, read-only, disabled | states.composer, states.row |
| [Textarea](components/textarea.html) | Inputs | fixed, auto-grow, with counter | default, hover, focus, invalid, read-only, disabled | none (D22) |
| [Select](components/select.html) | Inputs | native, with placeholder option | default, hover, focus, invalid, disabled | none (D22) |
| [Checkbox](components/checkbox.html) | Inputs | square, round (task), with description, group | default, hover, focus, active, checked, indeterminate, invalid, disabled | states.row, page.loaded |
| [Radio group](components/radio-group.html) | Inputs | vertical, horizontal, card | default, hover, focus, checked, invalid, disabled | none (D22) |
| [Switch](components/switch.html) | Inputs | label end, label start, with description | off, on, hover, focus, disabled | none (D22) |
| [Form field](components/form-field.html) | Inputs | label + hint + message + counter | default, invalid | states.composer, notifications |
| [Form layout](components/form-layout.html) | Inputs | single column, split, inline, actions bar, error summary | default, submitting | states.composer |
| [Composer](components/composer.html) | Inputs | default; icon-only button at XS | default, focused, typing, counter, at limit, empty submit, task limit, server error | states.composer, notifications |
| [App header](components/app-header.html) | Navigation | with progress, all done, XS compact | 0 left, partial, all done | page.loaded, page.all-done, page.empty |
| [Sidebar navigation](components/sidebar-navigation.html) | Navigation | grouped, collapsible, with badges, collapsed | default, hover, focus, current, expanded | none (D22) |
| [Tabs](components/tabs.html) | Navigation | underline, pill, with counts, scrollable | default, hover, focus, selected, disabled | none (D22) |
| [Breadcrumb](components/breadcrumb.html) | Navigation | full, collapsed | default, hover, focus, current | none (D22) |
| [Pagination](components/pagination.html) | Navigation | numbered, previous/next, with summary | default, hover, focus, current, disabled | none (D22) |
| [Skip link](components/skip-link.html) | Navigation | single | hidden, focused | none (D22) |
| [Card](components/card.html) | Containers | flush, with header/body/footer, interactive, selected | default, hover, focus, selected | every page.*, index (tiles) |
| [Dialog](components/dialog.html) | Containers | default, destructive, form, scrollable, sheet | open, busy, invalid | none (D22; L2-022) |
| [Tooltip](components/tooltip.html) | Containers | text, with shortcut, above, below | hidden, visible | none (D22) |
| [Divider](components/divider.html) | Containers | horizontal, vertical, labelled | – | row and section borders |
| [Layout primitives](components/layout-primitives.html) | Containers | container, grid, auto grid, stack, cluster | – | every page.* (.app) |
| [Task item](components/task-item.html) | Data display | active, done, editing, long title | hover, focus, pending, completing frames, done, editing, invalid, leaving | states.row, page.loaded, page.long-titles |
| [List](components/list.html) | Data display | simple, two-line, with icon, interactive, plain | default, hover, focus, selected | page.loaded |
| [Table](components/table.html) | Data display | default, dense, sortable, selectable, sticky, stacked | default, hover, selected, loading, empty | notifications (announcements table) |
| [Description list](components/description-list.html) | Data display | vertical, horizontal | – | none (D22) |
| [Avatar](components/avatar.html) | Data display | image, initials, icon, group, status | – | none (D22) |
| [Badge](components/badge.html) | Data display | neutral, accent, info, success, warning, danger, solid, count | – | mock .tag on every gallery |
| [Chip](components/chip.html) | Data display | filter, input, static | default, hover, focus, pressed, disabled | index (theme chips) |
| [Toast](components/toast.html) | Feedback | neutral with action, danger, with icon, dismissible | entering, static, hover-paused, leaving | notifications, page.deleted |
| [Alert](components/alert.html) | Feedback | info, success, warning, danger; flush, compact; actions, dismissible | – | page.load-error, page.offline, notifications |
| [Inline message](components/inline-message.html) | Feedback | hint, error, success | – | states.composer, states.row, notifications |
| [Progress](components/progress.html) | Feedback | ring, bar determinate, indeterminate, success, danger | 0%, partial, complete | page.loaded, page.all-done |
| [Spinner](components/spinner.html) | Feedback | sm, md, lg, inline with text | spinning, reduced motion | none (D22) |
| [Skeleton](components/skeleton.html) | Feedback | text, title, circle, rect, task row | shimmer, reduced motion | page.loading |
| [Empty state](components/empty-state.html) | Feedback | first run, all done, filter empty, compact | – | page.empty, page.all-done, page.filter-*.empty |
| [Error page](components/error-page.html) | Feedback | 404, 500, offline | – | none (D22) |

Components whose source is "none (D22)" are the starred core set the mocks have not needed yet. Their pages are marked *Not used in v1*.

## Patterns

| Pattern | Covers |
|---|---|
| [Forms](patterns/forms.html) | The composer and inline edit: validation timing, keeping text, server messages. |
| [Feedback and loading](patterns/feedback-and-loading.html) | Optimistic updates, revert on failure, skeletons, undo and announcements. |
| [Empty and error states](patterns/empty-and-error-states.html) | First run, filter empty, all done, load error and offline. |
| [Navigation and structure](patterns/navigation-and-structure.html) | One screen, landmarks, a single h1 and the filter in the URL. |
| [Dialogs and overlays](patterns/dialogs-and-overlays.html) | Why v1 has no modals and when an overlay would be right. |
| [Tables and lists](patterns/tables-and-lists.html) | The task list's order, wrapping and density; when a table fits. |
| [Notifications](patterns/notifications.html) | Toast versus banner versus notice versus field message. |
| [Content and tone](patterns/content-and-tone.html) | L2-025 voice and the product's microcopy library. |

## Tokens

- `tokens/tokens.css` — source of truth. Three tiers: primitives (`--palette-*`, `--font-*`), semantic (`--color-*`, `--text-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--duration-*`, `--ease-*`, `--z-*`, `--layout-*`, `--target-*`, `--control-height-*`) and component tokens declared in `assets/components.css`. Dark is `[data-theme="dark"]` and the identical `prefers-color-scheme: dark` block.
- `tokens/tokens.json` — DTCG export (`$type`, `$value`, aliases as `{group.token}`, dark under `$extensions`). Regenerate after any change to `tokens.css`.
- `tokens/contrast-pairs.json` — the checked pairs; add one whenever a component introduces a new foreground/background pairing.

Commands (from the repository root; the scripts ship with the `extracting-design-systems` skill):

```sh
python .claude/skills/extracting-design-systems/scripts/check_contrast.py docs/design-system/tokens/tokens.css
python .claude/skills/extracting-design-systems/scripts/tokens_to_json.py docs/design-system/tokens/tokens.css
python .claude/skills/extracting-design-systems/scripts/check_design_system.py docs/design-system
```

## Mock class to system class

The mocks and the Angular components still use the mock class names. The system renames them to the catalog's component vocabulary:

| Mock (styles/app.css) | System (assets/components.css) |
|---|---|
| `.app` | `.container` |
| `.head`, `.head__day`, `.head__date` | `.app-header`, `.app-header__title`, `.app-header__subtitle` |
| `.progress`, `.progress__text/__num/__label` | `.progress-summary`, `.progress-summary__text/__num/__label` |
| `.ring-wrap`, `.ring`, `.ring__track/__fill/__done` | `.progress-ring`, `.progress-ring__svg`, `.progress-ring__track/__fill/__done` (`--progress: 0..1`, `pathLength="100"`) |
| `.card` | `.card` |
| `.composer`, `.composer__field` | `.composer`, `.composer__field` |
| `.composer__input` | `.input.input--filled.input--lg` (+ `.input--with-count`) |
| `.composer__count`, `.is-max` | `.field__count`, `[data-limit="reached"]` |
| `.composer__btn` | `.btn.btn--primary.btn--lg.btn--collapse` with `.btn__label` |
| `.composer__error` | `.message.message--error.composer__message` |
| `.composer.shake` | `.composer--shake` |
| `.toolbar` | `.toolbar` |
| `.seg`, `.seg__pill`, `.seg__btn`, `.seg__n` | `.segmented`, `.segmented__indicator`, `.segmented__option`, `.segmented__count` |
| `.link-btn` | `.btn.btn--ghost` |
| `.list`, `.item` | `.task-list`, `.task` |
| `.item.is-done`, `.is-pending`, `.enter`, `.leave` | `.task--done`, `[aria-busy="true"]`, `.task--entering`, `.task--leaving` |
| `.check`, `.check__input/__box/__tick` | `.checkbox.checkbox--round` > `.checkbox__control` > `.checkbox__input` + `.checkbox__box` > `.checkbox__tick` |
| `.item.just-done` (burst) | `.checkbox--burst` |
| `.title`, `.title__btn` | `.task__title`, `.task__title-btn` |
| `.edit`, `.edit__msg` | `.input.task__edit`, `.message.message--error.task__message` |
| `.del` | `.btn.btn--icon.btn--ghost-danger.task__delete` |
| `.state`, `.state__art`, `.state__title`, `.state__text` | `.empty-state`, `.empty-state__art`, `.empty-state__title`, `.empty-state__text` |
| `.state__art .a/.b/.b--quiet/.c/.d/.e` | `.art-fill`, `.art-line`, `.art-line--quiet`, `.art-highlight`, `.art-ray`, `.art-paper` |
| `.skeleton`, `li`, `.skeleton__dot`, `.skeleton__bar` | `.skeleton-list`, `.skeleton-row`, `.skeleton.skeleton--circle`, `.skeleton` |
| `.banner`, `.banner__icon`, `.banner button` | `.alert.alert--danger.alert--flush`, `.alert__icon`, `.btn` (takes the alert's tone) |
| `.notice` | `.alert.alert--warning.alert--compact` |
| `.toasts`, `.toast`, `.toast.is-error` | `.toast-region`, `.toast`, `.toast--danger` |
| `.toast__msg`, `.toast__btn` | `.toast__message`, `.btn.btn--ghost` inside `.toast` |
| `.sr-only` | `.visually-hidden` (`.sr-only` kept as alias) |
| mock-only `.tag` | `.badge.badge--accent` |
| mock-only `.chips button[aria-pressed]` | `.chip[aria-pressed]` |
| mock-only `.table-wrap`, `.table` | `.table-wrap`, `.table` |
| mock-only `.tile` | `.card.card--interactive` |
| mock-only `.is-hover`, `.is-focus`, `.is-focus-ring`, `.frame-1/2`, `.is-frozen` | `data-state="hover|focus"`, `.task[data-frame]`, `[data-frozen]` |

## Drift found in the mocks

| Id | Mock | Issue | Resolution |
|---|---|---|---|
| D1 | styles/tokens.css `--line-strong` | Comment claims "3:1+ for control boundaries" but #8a9aa8 is 2.89:1 on `--paper` and 2.53:1 on `--mist`, so checkbox rings and input edges fail WCAG 1.4.11. | New `--palette-ink-450` #6f8294 is `--color-border-strong` (3.96:1 surface, 3.40:1 canvas). #8a9aa8 survives as `--palette-ink-400` for `--color-fg-disabled`. |
| D2 | styles/app.css `.composer__input` | Transparent border on `--paper-sunk` (1.08:1 against the card) leaves the field with no visible boundary (1.4.11). | `.input--filled` keeps the sunken fill and gains a 1.5px `--color-border-strong` edge at rest. |
| D3 | styles/tokens.css `--sea` as text | #0b7f74 is 4.19:1 on `--mist` (links on page fail) and exactly 4.50:1 for "Clear completed" on its hover tint. | `--color-fg-link` and `--color-fg-accent` use `--palette-sea-700` #0b6b61 (5.47:1 canvas, 5.88:1 hover tint). `--color-accent` stays #0b7f74 for fills. |
| D4 | styles/tokens.css dark `--ink` #eaf1f6 vs light `--mist` #e9eef3 | Two near-identical colours (ΔL < 1%) with separate names. | Merged into `--palette-ink-50` #e9eef3. |
| D5 | styles/tokens.css dark `--paper` #14222d vs light `--ink` #10222f | Near-duplicates. | Merged into `--palette-ink-900` #10222f (dark surface still reads above the #0b141b canvas). |
| D6 | styles/app.css `.composer__btn:hover` | `filter: brightness(1.08)` cannot be themed or contrast-checked. | `--color-accent-hover` / `--color-accent-active` tokens. |
| D7 | styles/app.css `.toast__btn:hover` | Raw `rgb(127 127 127 / .2)`. | `--color-bg-inverse-hover`. |
| D8 | styles/app.css `.seg__pill`, `.toast` | Raw shadows; the pill's light-theme shadow colour `rgb(16 34 47 / .18)` was also used in dark. | `--shadow-1` (pill) and `--shadow-4` (toast), redefined per theme. |
| D9 | styles/app.css `.seg__pill` (dark) | `--paper` pill on `--paper-sunk` track is 1.05:1 in dark; the selected filter is hard to see. | Indicator uses `--color-bg-surface-raised` (lighter in dark) plus `--shadow-1`; selection is also carried by weight and `aria-pressed`. |
| D10 | styles/app.css radii | 9 distinct radii: 4, 7, 8, 10, 12, 14, 20px, 999px, 50%. | Five steps + full: 4 (xs), 8 (sm), 12 (md), 16 (lg), 20 (xl). 10px (`.edit`, `.banner button`, `.toast__btn`) → 12; 14px (`.toast`) → 16; 7px (`.skeleton__bar`) → full. |
| D11 | styles/app.css spacing | Off-grid 2, 3, 6, 10, 14, 17, 18px. | Snapped to the 4px scale: 3 → 4 (segmented inset), 6 → 8 or 4, 10 → 12 (toolbar) or 8 (title), 14 → 16 (notice, counter, skeleton gap), 18 → 16 (toast), 17px skeleton padding → row `min-height` 60px. |
| D12 | styles/app.css font sizes | 13px (`.8125rem` counts), 15px (`.composer__error`), 17px (`1.0625rem` inputs), 22px (`.state__title`) are off the scale; the two field errors used different sizes (15 vs 14px). | 13 → 14 (`--font-size-sm`); 15 → 14 so both field errors match; 17 → 18 (`--font-size-lg`, still ≥ 16px for iOS); 22 → 24 (`--font-size-2xl`). |
| D13 | styles/app.css `.toast__btn` | Weight 700 is the only 700 in the product. | 600 (`--font-weight-semibold`), the button weight everywhere. |
| D14 | styles/app.css line heights | 1.4 (`.title__btn`), 1.15 (`.progress__text`), 1.05 (mock headings). | 1.5 (`--line-height-normal`), 1.2 (`--line-height-snug`), 1 (`--line-height-tight`). |
| D15 | styles/app.css durations | 12 distinct values (.06s to 1.4s). | Five tokens: 150 (.12, .15s), 200 (.18, .2, .22s), 250 (.25, .28, .3s), 450ms (.45s); shimmer 1.4s → `3 × --duration-deliberate` (1350ms); tick delay .06s → `0.3 × --duration-base`. |
| D16 | pages/states.row.html, `.check__input:focus-visible` | Checkbox focus ring offset 3px; L2-030.2 specifies 2px. | `--focus-ring-offset` 2px everywhere. |
| D17 | styles/app.css `.check__box`, `.banner__icon` | 26px checkbox and 22px icon are off-grid. | 24px (`--space-6`) checkbox; icons 16 / 20 / 24px. |
| D18 | styles/app.css `@media (max-width: 575.98px)` | Desktop-first overrides. | Mobile-first: XS is the base, `@media (min-width: 36rem)` adds the SM layout. |
| D19 | styles/app.css `.notice svg` | Offline icon is `currentColor` (ink), so the notice's tone is carried by the background alone. | Icon uses `--color-warning-icon`; tone is colour + icon + text. |
| D20 | styles/app.css `.toasts` | Raw `z-index: 10`. | `--z-toast`. |
| D21 | styles/app.css reduced motion | Blanket `* { animation-duration: .001ms !important }` override. | Durations are zeroed in tokens; looping indicators (shimmer, spinner, indeterminate bar) are stopped explicitly. |
| D22 | — (system addition) | No mock shows info status, exit/spring easings, a 2xl breakpoint, or the starred core components (menu, dialog, table, tabs …). | Info uses a blue ramp derived from the ink hue; additions are documented as such on their pages and are not used by v1 (L2-022: one screen, no modals). |
| D23 | pages/page.all-done.html `.head` | At 320–360px "All done" beside the weekday leaves the title about 130px; the mock overflows horizontally (L2-027.5). | Open. `.app-header__title` wraps with `overflow-wrap: anywhere` so nothing overflows; proposed fix: below SM show only the ticked ring and keep "All done" in the live region. Needs a decision before the frontend copies it. |

## Verification

Run on 8 October 2026.

| Check | Command | Result |
|---|---|---|
| Contrast, both themes | `check_contrast.py docs/design-system/tokens/tokens.css` | 144 passed, 0 failed (72 pairs × light and dark) |
| Structure | `check_design_system.py docs/design-system` | 60 pages (39 components, 8 patterns), 0 errors, 0 warnings |
| Token coverage | script over `foundations/*.html` | all 208 tokens in `tokens.css` have a `data-token` cell on exactly one foundation page |
| DTCG export | `tokens_to_json.py docs/design-system/tokens/tokens.css` | 264 entries written to `tokens/tokens.json` |
| Screenshots | Playwright (Chromium), every page at 360 and 1280 px, light and dark | 240 renders: no horizontal page scroll, no console errors. Reviewed by eye: index, color, button, task-item, dialog (full page), plus each page writer's own samples. |
| Mocks loop | `docs/mocks/styles/tokens.css` now imports `tokens/tokens.css` and aliases the mock names; screenshots of page.loaded, states.row, states.toolbar, notifications, index and todo.html before and after | No breakage. Light theme picks up D1 (darker control rings). |

Remaining differences between the mocks and the system (open drift):

- The mocks link the system tokens but not `assets/components.css`: their markup still uses the mock class names (see the mapping above), so component-level corrections (D2, D3 link colour, D6, D9–D19) show in this documentation but not yet in the mocks or in `frontend/`.
- `frontend/src/styles/tokens.scss` still holds the original mock values; porting `tokens.css` there is a production change and needs a requirement, design and mock under AGENTS.md before implementation.
- D23 (all-done header at 320–360 px) is open.
