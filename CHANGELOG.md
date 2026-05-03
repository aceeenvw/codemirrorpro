# Changelog

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
- New `.github/workflows/build.yml` auto-rebuilds `dist/index.js` on push to `master`, keeping the committed bundle in sync with source.
- `npm run build:dev` and `npm run watch` added alongside `npm run build`.

---

## 1.0.0 — Original by Cohee1207

- Swap `textarea.maximized_textarea` with CodeMirror 6 editor
- CSS syntax highlighting when `data-for="customCSS"`
- Mobile-only absolute-positioned Search button
- SmartTheme-aware styling
