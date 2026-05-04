# Changelog

## 2.2.5 — Audit pass: dead code, correctness, security, comment discipline (2026-05)

Purpose-driven sweep of every source file for bugs, dead code, and comment bloat. Net: -89 source lines, no behavior change for users.

### ✦ Bugs fixed

- **`build-info.js::deriveOffset`** was using plain `*` multiplication for FNV-1a hashing — since JS numbers are 64-bit floats, values above 2^53 lose precision and the hash result is non-standard. Switched to `Math.imul` (the `stableId` function already did this correctly). Result: deterministic 32-bit FNV-1a, matches the reference spec.
- **`search-panel.js`** dead `flags` local variable on the regex path (computed but never used).
- **`search-panel.js`** never-registered `listener = { update: offUpdate }` object + never-dispatched `cmp-sp-refresh` custom event listener. Pure dead code: the actual update path flows through the panel's returned `update()` method (which works correctly).
- **`search-panel.js`** unreachable branch `if (e.shiftKey && e.ctrlKey) replaceAll; else if (e.ctrlKey || e.metaKey) replaceAll` — first condition was a subset of the second, so it never fired. Collapsed.
- **`search-panel.js`** toggle handlers on `tCase` / `tWord` / `tRegex` rebuilt `q` then `commit()` immediately re-built it again. Removed the duplicate construction — toggle handlers now just call `commit()` directly since the click handler already updated the DOM state that `queryOpts()` reads.
- **`search-panel.js`** prev/next/replace toolbar buttons didn't call `commit()` before operating, so if the user flipped a toggle and hit a chevron without typing, the stale query would fire. Added `commit()` at the start of every action path.
- **`search-panel.js::destroy()`** didn't clear the pending `commitTimer` — on rapid open/close, a stale setTimeout could fire against a destroyed panel. Fixed.
- **`editor.js::openQuickSettings`** had `const close` declared *after* `const off` referenced it. Technically safe because `off` is only invoked inside a `setTimeout(0)` that runs after full initialization, but confusing. Reordered declarations so `close` is defined before its first reference.

### ✦ Dead code removed

- `settings.js::resolveLocale` — exported, never imported.
- `settings.js::DEFAULTS.findReplace` — property on the settings defaults, never read.
- `i18n.js::getLocale` — exported, never used externally.
- `i18n.js::LOCALE_EVENT` — re-exported constant, never used externally.
- `index.js` — no-op `onLocaleChange(() => { /* propagated ... */ })` listener removed along with its stale comment.
- `index.js` import of `onLocaleChange` removed since it was only used by the dead listener.
- `editor.js` — inline `ids` array in `openLangPicker` replaced with the `LANGUAGES` import from `languages.js` (which previously had an unused export that this now consumes).
- `editor.js` — inline theme-id array in `openQuickSettings` extracted to a module-level `THEME_IDS` constant for single-source-of-truth.

### ✦ Comment discipline

Per fork convention (minimal, structured, logic-critical only):

- Removed the big `/** Fixes upstream bugs: #1 #2 #4 ... */` block from `setupCodeMirror` — stale internal issue refs, readers go to CHANGELOG.
- Removed five `// Group: history` / `// Group: search` / etc. labels in `toolbar.js` (groupings are self-evident from the variable names).
- Removed `// Assemble with visual separators between groups.` before the trivial `groups.forEach` loop.
- Trimmed narrative module headers in `languages.js`, `themes.js`, `i18n.js`.
- Removed `// Static markup only — no user-supplied values interpolated.` note inside `openQuickSettings`, replaced with a one-liner next to `pop.innerHTML`.
- Trimmed `// Initial query snapshot.`, `// Helpers`, `// Event wiring`, `// Initial count render.`, `// Refresh count when editor selection moves ...` etc. from `search-panel.js`.

### ✦ Security review

- `npm audit`: 0 vulnerabilities (prod + dev).
- No `eval`, `new Function`, `document.write`, `location.href=`, `window.open`, `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `postMessage` in source.
- Two remaining `innerHTML` assignments (`settings.js`, `editor.js::openQuickSettings`) confirmed unchanged since last audit: both are static template strings with zero runtime interpolation.
- No new `globalThis` writes. Debug surface remains a frozen object.
- Digital signature sinks intact: delta-encoded bytes in `build-info.js` still reconstruct the author string and still seed the FNV offset (now via `Math.imul` for correctness).

---

## 2.2.4 — True equal spacing between toolbar icons (2026-05)

### ✦ Polish

- **Every icon-to-icon gap is now identical regardless of group boundary.** 2.2.3 still had uneven rhythm because the separator element had non-zero margins on top of the flex `gap`, so gaps around a separator were wider than gaps between adjacent buttons. Fixed by:
  - Setting flex `gap: 4px` on `.cmp--btn-group` (applies to every flex child equally — buttons and separators alike).
  - Giving the separator `margin: 0` so it contributes only its 1px visual line without extra spacing.
  - Result: cross-group gap is exactly `4px + 1px sep + 4px = 9px`, within-group gap is `4px + 0 + 4px = 8px`. Still subtly visually grouped via the separator line but the icons sit on a uniform grid.
- **Separator height** 20px → 18px (small nudge to stay visually subordinate to the icons it's dividing).
- **Separator color** switched from theme border variable to `color-mix` on body color at 22% — renders more consistently across SmartTheme variants.

### ✦ Mobile

- Mobile button group gap bumped to `6px` per Material's 8dp touch-target spacing guideline (prevents mis-taps on adjacent buttons).
- Mobile separator also normalized to `margin: 0`, height `22px` to match the larger 44×44 buttons.

---

## 2.2.3 — Spacing rhythm + tighter status strip (2026-05)

### ✦ Polish

- **Even icon spacing across toolbar groups.** Previously: `gap: 2px` between buttons inside a group, but separators added `margin: 0 6px` on both sides — 14px total around a separator vs 2px between adjacent buttons, producing an uneven visual rhythm. Now: `gap: 2px` within group + separator `margin: 0 3px` = consistent 8px between groups (2 + 1 + 3+3 = 9 effective), 2px within. Groups are visually distinct without feeling like buttons are missing.
- **Toolbar container gap** reduced from `10px` → `8px`, vertical padding from `8px` → `6px`. Trims ~4px off the toolbar height.
- **Separator** shortened from `height: 22px` → `20px` and opacity from `0.5` → `0.45` for a softer cluster-separator.

### ✦ Layout

- **Status strip height reduced**: `min-height: 28px` → `20px`, padding `4px 10px` → `2px 10px`, font size `11px` → `10.5px`, opacity `0.8` → `0.75`. Gains roughly 10px of vertical space back for the code. Still readable, still shows position + chars, just doesn't eat as much real estate.
- **Status border-top** switched from SmartTheme border var to a soft `color-mix` against body color (15%) for a gentler divider that adapts per theme.

Net effect: code area gained ~14px of vertical space; button spacing is visually balanced.

---

## 2.2.2 — Toolbar icons-only + status bar at bottom everywhere (2026-05)

### ✦ UX

- **Toolbar is now icons-only on every viewport** — text labels (`.cmp--btn-label`) are globally hidden. Button width reduced from `min-height: 36px; padding: 6px 10px` to `min-width: 36px; min-height: 36px; padding: 6px` — compact square buttons with Font Awesome icons only. Titles + aria-labels preserved for tooltips and screen readers.
- **Status bar moved to a dedicated bottom strip on desktop too** (previously inline in the top toolbar on desktop, bottom strip only on mobile). Now `Ln 15, Col 62 · 16,625 chars` lives below the code on every viewport, never crowding the top bar or overlapping typed text.

### ✦ Bug fixes

- **Search panel was too tall**, pushing the code significantly below the fold. Previously `max-height: 40dvh` desktop / `50dvh` mobile. Now clamped to the smaller of an absolute pixel cap (`140px` desktop / `240px` mobile) or `30dvh` / `40dvh`. Two rows of 36px inputs + padding + gap fits comfortably in ~110px, so the new cap is right-sized for content without starving the editor.
- **Search panel internal padding tightened** from `10px 12px; gap: 8px` → `8px 10px; gap: 6px` (and mobile from `12px` → `10px`) for a denser, less-wasteful layout.

---

## 2.2.1 — Search panel layout + UX cleanup (2026-05)

### ✦ Bug fixes

- **Editor content disappeared when search panel opened** — the host's flex layout wasn't propagated into `.cm-editor`, so CM6's internal layout gave the panel all available space and starved the scroller to 0 height. Fixed by making `.cm-editor` a flex-column of its own (`display: flex`, `flex-direction: column`, `height: 100%`), giving `.cm-scroller` `flex: 1 1 auto; min-height: 0`, and pinning `.cm-panels` to `flex: 0 0 auto` so panels never steal scroller space.
- **Panel could overflow the dialog** on narrow widths or very tall mobile layouts. Added `max-height: 40dvh` (desktop) / `50dvh` (mobile) with `overflow-y: auto`, plus `max-width: 100%` and `box-sizing: border-box` so panel contents always fit the container.
- **Rows didn't wrap gracefully** on narrow widths — inputs and button clusters would get cut off. Added `flex-wrap: wrap` on rows with explicit flex-basis values on field vs controls.

### ✦ UX

- **Merged Find and Replace toolbar buttons into a single Search button** (magnifying glass icon). The panel itself exposes both Find and Replace rows always, so two entry points was redundant friction. One button, one panel, both features accessible.
- Removed unused `findNext` / `findPrevious` imports from `toolbar.js`.

---

## 2.2.0 — Custom search & replace panel (2026-05)

Replaced CodeMirror 6's default search panel with a custom implementation via `search({ createPanel })`. The default CM6 panel's cramped horizontal layout, tiny inputs, and awkward mobile behavior were the root of the discomfort — not a problem fixable by CSS alone.

### ✦ Desktop layout

- **Two-row layout** instead of cramped horizontal inputs:
  - Row 1: `[Find input with inline toggles & count] [↑ Prev] [↓ Next] [× Close]`
  - Row 2: `[Replace input] [Replace] [Replace all]`
- **Inline icon toggles** inside the find input (match case `Aa`, whole word `W`, regex `*`) with clear on/off states using the accent color. No more guessing which tiny checkbox is which.
- **Live match count** (`3 of 14` or `No results`) beside the find input, with tabular numerals so it never jitters.
- **Replace all** is rendered as the primary (accent-filled) action. Replace-one is secondary.
- **Focus-ring on the field wrapper** — the whole search input lights up with a 3px glow on focus, not just the tiny input itself.

### ✦ Mobile bottom-sheet layout

- **Full-width bottom sheet** (panel docks at bottom on mobile instead of top, so the keyboard doesn't push it off-screen).
- **Vertical stacking**: each row stretches to 100% width; Find/Replace inputs are full-width, buttons are distributed with `flex: 1` so they fill available space comfortably.
- **44×44pt touch targets** on every button and toggle.
- **16px input font** to prevent iOS focus-zoom.
- **Safe-area padding** on the bottom so the sheet clears the home indicator.
- **Count rendered on its own line** centered, so there's no squeeze.

### ✦ Keyboard shortcuts

- `Ctrl+F` — open search, focus find input, select existing query
- `Ctrl+H` — open search, focus replace input
- `Enter` in find → next match. `Shift+Enter` → previous match
- `Enter` in replace → replace current. `Ctrl+Enter` → replace all
- `Esc` anywhere in panel → close
- Debounced 80ms search-as-you-type so long queries don't thrash large documents

### ✦ Accessibility

- `role="search"` on the panel, ARIA `aria-pressed` on toggles, `aria-label` / localized `title` on every icon button
- Focus-visible outlines on every interactive element (previously absent on CM defaults)
- Screen readers announce the match count text
- All labels and titles are fully localized and live-update on language change

### ✦ Visual

- Backdrop-blurred panel matching the toolbar aesthetic
- Slide-in animation (160ms, respects `prefers-reduced-motion`)
- Red hover state on the close button signals the destructive-ish action
- All color uses `color-mix` against SmartTheme CSS variables so it fits every ST theme
- Old CM6 default panel DOM is hidden via `.cm-panel.cm-search > :not(.cmp-sp) { display: none }` as a safety net

### ✦ Under the hood

- New module: `src/search-panel.js` implements `createPanel` for `@codemirror/search`
- New i18n keys: `cmp.search.find_placeholder`, `replace_placeholder`, `match_case`, `whole_word`, `regex`, `previous`, `next`, `close`, `replace_one`, `replace_all`, `no_results`, `count_of`, `count_total` (EN + RU)
- `countMatches()` uses `SearchCursor` / `RegExpCursor` directly so count is exact and tracks the currently-selected match index
- Toolbar Replace button now targets `.cmp-sp input[name="replace"]` instead of the old `.cm-panel.cm-search` selector

---

## 2.1.0 — Toolbar UI/UX polish (2026-05)

### ✦ UX overhaul

- **Logical button grouping**: buttons are now clustered by function with thin vertical separators between groups:
  - History: Undo · Redo
  - Search: Find · Replace
  - Clipboard: Paste · Copy
  - View: Fullscreen · Settings
  Previously all 8 buttons sat in one undifferentiated row.
- **Comfortable sizing**: desktop buttons bumped from 32×32px to 36px min-height with 10px horizontal padding; mobile from 44×44 to 44×44 with larger radius (10px) for a softer touch target.
- **Settings button accent**: the gear button is rendered in the theme's quote-color (accent) to signal it's the entry point to customization, not just another tool.
- **Active-state pill** for toggle buttons (fullscreen engaged): fills with a translucent accent-color background and changes the icon color so the user can see at a glance that they're in fullscreen mode. `aria-pressed` set correctly for screen readers.

### ✦ Visual polish

- **Backdrop-blurred toolbar**: 8px blur + 140% saturation behind the toolbar with a subtle vertical gradient, following the SillyTavern dialog aesthetic.
- **Softer corners**: button radius 4px → 8px, chip radius stays at 999px, toolbar popovers 12px.
- **Language chip**: now uses uppercase 11px letter-spacing-0.04em text on a subtle surface-tinted pill — more clearly "status + clickable" vs the previous flat outline.
- **Tabular numerals** on the status bar so position doesn't jitter as digits change (`font-variant-numeric: tabular-nums`).
- **Scrollbar hidden** on the toolbar overflow path — swipe works on mobile, wheel works on desktop, no ugly 17px gray rail.
- **Popovers animate in** with a 140ms pop-in (opacity + translateY + scale) using the Material easing curve `cubic-bezier(0.2, 0, 0, 1)`.

### ✦ Interaction quality

- **Scale-on-press** (`transform: scale(0.96)`) for buttons and chip, 120ms settle. Matches Apple HIG "scale feedback" and Material press-state layers without a ripple lib.
- **Color-mix press/hover states** using `color-mix(in srgb, var(--SmartThemeBodyColor) N%, transparent)` so states adapt correctly in every ST theme without hardcoded rgba values.
- **Focus-visible rings** (2px solid accent, 2px offset) on every button, chip, and popover item — meets WCAG 2.4.7 and Apple HIG "Focus States". Previously no keyboard-focus indication at all.
- **Reduced-motion respect**: `@media (prefers-reduced-motion: reduce)` disables all transitions and scale transforms. Users with vestibular sensitivity are honored per WCAG 2.3.3.
- **Touch tuning**: `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation` (kills 300ms tap delay on mobile), `user-select: none`.

### ✦ Popovers

- **Viewport-aware positioning**: language picker and quick-settings popovers now flip above or shift horizontally if they would overflow the viewport.
- **Escape to close**: `Esc` now dismisses both popovers. Click-outside still works.
- **ARIA semantics**: lang picker is `role="menu"` with `role="menuitem"` children and `aria-current="true"` on the active language. Quick-settings popover is `role="dialog"` with localized `aria-label`.
- **Drop-shadow refined**: two-layer shadow (12px spread + 2px sharpness) replaces the previous flat `0 6px 20px` for more depth on top of blurred backgrounds.

---

## 2.0.3 — Status bar cosmetics + cleanup (2026-05)

### ✦ Bug fixes

- **Status bar overlapped typed text on mobile** — `Ln N, Col M · chars` was rendered inline inside the top toolbar where the text line fell over the first lines of content. Split the status into a dedicated bottom strip on mobile with `border-top` + safe-area-aware padding; stays inline in the toolbar on desktop.
- **Top-bar buttons unresponsive after 2.0.2 event firewall** — the capture-phase `stopPropagation` added around the toolbar root prevented events from reaching descendant buttons. Fixed by removing the firewall entirely (see below).

### ✦ Cleanup

- **Removed the 2.0.2 close-shield machinery.** The previous "dialog closes on fullscreen click" report turned out to be a conflict with a different extension, not a SillyTavern bug. Removed: capture-phase toolbar firewall, per-button multi-phase propagation stops, `dialog.close` monkey-patch shield, `cancel` event guard, `CMP_DEBUG` logging. Kept: `type=button`, `formnovalidate`, single `stopPropagation` on click, and the CSS/inline-style approach for sizing — all of which are independently useful and add no complexity.
- Comment discipline sweep: trimmed per-line narration in `toolbar.js`, tightened module-level doc strings.

---

## 2.0.1 — Fullscreen + locale fix (2026-05)

### ✦ Bug fixes

- **Fullscreen toggle collapsed immediately** — SillyTavern's dialog.popup JS applies inline `width`/`top`/`left`/`transform` that outranked our `:has`-scoped CSS rule. Fixed by writing `!important` inline style properties from JS (`width: 100dvw`, `height: 100dvh`, `inset: 0`, `margin: 0`, `transform: none`) when fullscreen is engaged, plus a `MutationObserver` that re-asserts them if ST overwrites them during a resize/drag. Inline styles are snapshotted on enter and restored verbatim on exit. CSS now also resizes ST's inner `.popup-body` / `.popup-content` / `.dialogue_popup_holder` wrappers so the editor fills the viewport.
- **Default locale was Russian on non-English systems** — upstream default was `locale: 'auto'`, which correctly detected the OS/browser locale but violated "English first" policy. Changed default to `'en-us'`. Added one-shot migration (`_localeMigrated` flag) that forces `en-us` on load for anyone whose settings were auto-normalized to a non-English locale. Users who want auto-detection can still opt in via the settings dropdown.

### ✦ Modernization

- Comment discipline pass: trimmed narration from module headers and inline comments per fork conventions (logic-critical only).
- Fullscreen property application refactored into a shared `FS_PROPS` constant array to eliminate duplication between the class+inline paths.

---

## 2.0.0 — Fork baseline (2026-05)

First release of ⊹ CODE MIRROR PRO ⊹ — maintained fork of
[SillyTavern/Extension-CodeMirror](https://github.com/SillyTavern/Extension-CodeMirror) by Cohee1207.

### ✦ Bug fixes

- **Context read safety** — original `const { isMobile } = SillyTavern.getContext();` runs at module top level and crashes if the SillyTavern global or `getContext` is not yet available (or if `isMobile` changes shape between ST versions). Replaced with a late-bound helper that tries `SillyTavern.getContext().isMobile` as function or boolean and falls back to `matchMedia('(pointer: coarse)')` and user-agent sniffing.
- **Observer never torn down** — upstream's MutationObserver runs for the page lifetime with no teardown. Now disconnected on `pagehide`.
- **Observer `subtree` missing** — upstream watched only direct children of `<body>`. Now watches subtree to survive any future ST layout changes, with a per-target `WeakSet` guard against double-attach.
- **Double-attach on re-render** — if a dialog's content re-renders, upstream appends another `.codemirror-host` next to the first and `target.classList.add('displayNone')` fires twice. Guarded with `ATTACHED` WeakSet.
- **Input sync feedback loop** — CM's update listener sets `target.value` and dispatches `input`; if any ST code writes back, it retriggers CM. Guarded with a `syncing` flag.
- **Parent null deref** — `target.parentElement.appendChild(host)` crashed if the textarea was detached. Now null-checked.
- **Focus before layout** — upstream's `editor.focus()` fires before first paint, producing an invisible cursor on Firefox mobile. Wrapped in `requestAnimationFrame`.
- **No editor cleanup on close** — upstream never calls `editor.destroy()`; CM's internal listeners leaked one set per dialog open. Now destroyed on `dialog.close` and on detach via MutationObserver.
- **CSS `:has` Firefox fallback** — upstream relies on `dialog.popup:has(.codemirror-host) { width: unset }`, unsupported in Firefox ≤ 120. Added `.cmp--active-dialog` class applied by JS as fallback.
- **Tab key accessibility** — upstream bound `{ key: 'Tab', run: insertTab }` unconditionally, trapping keyboard users inside the editor. Replaced with `indentWithTab` which respects focus semantics.
- **Missing screen-reader labels** — editor host now exposes `role="textbox"`, `aria-multiline="true"`, and a localized `aria-label`.
- **Mobile search button overlap** — upstream's absolute-positioned search button sat over the last lines of content. Replaced by a unified sticky toolbar.
- **Desktop had no search UI** — `Ctrl+F` worked but there was no discoverable button. Toolbar now shows Search and Replace on both desktop and mobile.
- **Word wrap always forced** — upstream hardcoded `EditorView.lineWrapping`. Now a user setting (default `on`), applied live via Compartment.
- **Panel styling on mobile** — upstream's search panel could be pushed offscreen. Now `position: sticky` with `z-index: 3` and mobile-aware min-heights.

### ✦ New features

- **Auto language detection** for CSS, Markdown, HTML, JSON, JavaScript based on textarea `data-for` / `name` / `id` hints plus content sniffing. Manual override via language chip in toolbar.
- **Unified toolbar** (desktop + mobile): Search · Replace · Paste · Copy all · Undo · Redo · Fullscreen · Settings · live status bar (line, col, chars).
- **Quick-settings popover** in-editor: theme, font size, line numbers, word wrap — no need to leave the dialog.
- **Full settings drawer** in ST Extensions page with every option below.
- **Seven themes**: Follow SillyTavern (default, inherits SmartTheme vars) · One Dark · Dracula · Solarized Light · Solarized Dark · GitHub Light · GitHub Dark. Live-switchable.
- **Find & replace** panel wired to `Ctrl+F` / `Ctrl+H` and toolbar.
- **Paste from clipboard** button with permission-denied fallback.
- **Copy all** button.
- **Fullscreen toggle** (dialog-level; optional auto-fullscreen on mobile).
- **Live reconfiguration** via CodeMirror 6 Compartments — every setting update reaches every open editor instantly, no rebuild.
- **i18n** — English primary + Russian secondary, locale auto-detected from ST/navigator and overridable.
- **Mobile polish**: 44–48px touch targets, iOS 16px-input zoom-prevention, safe-area insets, sticky toolbar above keyboard.
- **Settings persistence** via `extension_settings.codeMirrorPro` with deep-merge of defaults for forward compatibility.
- **Debug handle** on `globalThis.CodeMirrorPro` exposing version, author, and `stopObserver()` for troubleshooting.

### ✦ Modernization

- Split from monolithic `src/index.js` into `editor.js`, `settings.js`, `languages.js`, `themes.js`, `toolbar.js`, `i18n.js`, `build-info.js`.
- webpack 5 config with dev/prod modes, source maps in dev, `splitChunks: false` so ST can load the single `dist/index.js`.
- Eager-inlined dynamic `import()` for language packs — no runtime chunk fetch required.
- Self-contained themes built from `@lezer/highlight` tags — zero external theme dependencies, smaller bundle than using community theme packs.
- `manifest.json` now declares `i18n` block per SillyTavern 1.12+ convention.
- `auto_update: true` preserved.
- `npm run build:dev` and `npm run watch` added alongside `npm run build`.

---

## 1.0.0 — Original by Cohee1207

- Swap `textarea.maximized_textarea` with CodeMirror 6 editor
- CSS syntax highlighting when `data-for="customCSS"`
- Mobile-only absolute-positioned Search button
- SmartTheme-aware styling
