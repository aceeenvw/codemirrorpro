```
        ╔══════════════════════════════════════════════════════╗
        ║                                                      ║
        ║         ⊹  C O D E M I R R O R   P R O  ⊹            ║
        ║                                                      ║
        ║       A fancier, mobile-ready text editor for        ║
        ║                    SillyTavern                       ║
        ║                                                      ║
        ╚══════════════════════════════════════════════════════╝
```

**Syntax highlighting · Find & replace · Mobile toolbar · Themes · i18n · Live settings**

[![Version](https://img.shields.io/badge/version-2.0.0-7aa?style=flat-square&labelColor=1a1a1a)](CHANGELOG.md)
[![SillyTavern](https://img.shields.io/badge/SillyTavern-1.12%2B-c99?style=flat-square&labelColor=1a1a1a)](https://github.com/SillyTavern/SillyTavern)
[![Platform](https://img.shields.io/badge/platform-desktop%20%C2%B7%20mobile-b9b?style=flat-square&labelColor=1a1a1a)](#mobile-support)
[![Author](https://img.shields.io/badge/author-aceenvw-9c9?style=flat-square&labelColor=1a1a1a)](https://github.com/aceeenvw)
[![License](https://img.shields.io/badge/license-AGPLv3-999?style=flat-square&labelColor=1a1a1a)](LICENSE)
[![Build](https://img.shields.io/badge/build-webpack-bbb?style=flat-square&labelColor=1a1a1a)](#tech-stack)
[![i18n](https://img.shields.io/badge/i18n-EN%20%C2%B7%20RU-aaf?style=flat-square&labelColor=1a1a1a)](i18n)

[Features](#-features) · [Install](#-install) · [Usage](#-usage) · [Settings](#-settings) · [Changelog](CHANGELOG.md) · [Credits](#-acknowledgements)

---

## ⟡ About

**⊹ CODE MIRROR PRO ⊹** is a maintained, modernized fork of [SillyTavern/Extension-CodeMirror](https://github.com/SillyTavern/Extension-CodeMirror) by **Cohee1207**. The upstream extension is a clean idea — swap SillyTavern's "expand text area" popup with a real CodeMirror editor — but hasn't seen updates since early 2025 and only highlighted CSS, had no find-and-replace on desktop, no settings, no theme options, and a mobile UX limited to a single absolute-positioned Search button.

This fork keeps the core intent and visual style, fixes every bug found during audit, adds syntax detection for five languages, a unified desktop + mobile toolbar, seven themes, full find-and-replace, a proper settings panel in the Extensions drawer, English + Russian i18n, and live reconfiguration — change a setting and every open editor updates instantly.

---

## ◆ Features

### ◇ Syntax highlighting for five languages

Automatically detects CSS, Markdown, HTML, JSON, and JavaScript based on SillyTavern field hints (e.g. `customCSS`, regex scripts, world info JSON) with a content-sniffing fallback. Manually override via the language chip in the toolbar.

### ◇ Unified toolbar (desktop + mobile)

Search · Replace · Paste · Copy all · Undo · Redo · Fullscreen · Settings. Icons only on mobile with 44px touch targets; icons + labels on desktop. Toolbar position (top / bottom) is configurable.

### ◇ Seven themes

- **Follow SillyTavern** (inherits SmartTheme CSS variables — default)
- One Dark · Dracula
- Solarized Light · Solarized Dark
- GitHub Light · GitHub Dark

Theme change applies **live** to every open editor via CodeMirror 6's Compartment reconfiguration.

### ◇ Proper find & replace

CodeMirror 6's native panel, styled to match SillyTavern. `Ctrl+F` / `Ctrl+H` on desktop, toolbar buttons everywhere.

### ◇ Settings drawer

A real UI in the SillyTavern Extensions settings page. Toggle line numbers, word wrap, active line highlight, bracket matching, auto-close brackets, font size, default language, enabled languages, toolbar visibility/position, mobile toolbar, auto-fullscreen on mobile, and interface language. Every change applies immediately — no reload.

### ◇ Internationalization

English primary, Russian secondary. Locale auto-detects from SillyTavern's UI language and `navigator.language`, overridable from the settings drawer. Flat JSON files in `i18n/` — contributor-friendly.

### ◇ Mobile polish

- 44–48px touch targets
- iOS 16px-input trick to prevent auto-zoom
- Safe-area insets for notched devices
- Sticky toolbar positioned above the keyboard
- Auto-fullscreen option
- Firefox `:has` fallback class for dialog sizing

### ◈ Under the hood

Modern, lean, correct.

- CodeMirror 6 Compartments for live reconfiguration (no editor rebuild on setting change)
- Lazy language loaders inlined into a single bundle by webpack
- Self-contained themes — no external theme packages in dependencies
- Zero feedback loops on input sync (upstream-compatible fix)
- Proper `editor.destroy()` on dialog close, observer tear-down on `pagehide`
- `role`/`aria-label`/`aria-multiline` on editor host for screen readers
- Settings persisted via `extension_settings.codeMirrorPro`

---

## ◆ Install

### Option 1 — From the SillyTavern UI (recommended)

1. Open **Extensions → Manage Extensions → Install from URL**
2. Paste:
   ```
   https://github.com/aceeenvw/codemirrorpro.git
   ```
3. Reload SillyTavern.

### Option 2 — Manual clone

```
cd /path/to/SillyTavern/public/scripts/extensions/third-party
git clone https://github.com/aceeenvw/codemirrorpro.git
```

### Option 3 — Symlink (for development)

```
ln -s /path/to/your/local/codemirrorpro-fork \
      /path/to/SillyTavern/public/scripts/extensions/third-party/codemirrorpro
```

> **Note.** This extension ships a pre-built bundle at `dist/index.js`. Users do **not** need to run `npm install` — SillyTavern loads the bundle directly. Only maintainers running the fork locally need Node.js (see [Build](#-build)).

### ⚠ Conflict warning

If the original `Extension-CodeMirror` is installed, disable or remove it before installing this fork — both extensions observe the same `textarea.maximized_textarea` element and will attach duplicate editors.

Disable via **Extensions → Manage Extensions**, or remove the folder:

```
rm -rf /path/to/SillyTavern/public/scripts/extensions/third-party/Extension-CodeMirror
```

After install, reload SillyTavern. The extension appears as **⊹ CODE MIRROR PRO ⊹** in the Extensions drawer.

---

## ◆ Usage

### Open the editor

Click any **"Expand text area"** button in the SillyTavern UI (near character description, custom CSS field, regex scripts, world info entries, etc.).

### Desktop shortcuts

```
  Ctrl+F      Open search
  Ctrl+H      Open replace
  Ctrl+Z      Undo
  Ctrl+Y      Redo  (or Ctrl+Shift+Z)
  Esc         Close search panel
  Tab         Insert indent (respects selection)
```

### Toolbar (top or bottom of editor)

```
  [CSS ▾]  [🔍] [↔] [📋] [📄] [↺] [↻] [⛶] [⚙]          Ln 12, Col 5 · 1 234 chars
   │        │    │    │    │    │   │   │   │
   │        │    │    │    │    │   │   │   └─ Quick settings popover
   │        │    │    │    │    │   │   └───── Fullscreen toggle
   │        │    │    │    │    │   └───────── Redo
   │        │    │    │    │    └───────────── Undo
   │        │    │    │    └────────────────── Copy all
   │        │    │    └─────────────────────── Paste from clipboard
   │        │    └──────────────────────────── Find & replace
   │        └───────────────────────────────── Find
   └────────────────────────────────────────── Language override chip
```

---

## ⟡ Settings

Open **Extensions → ⊹ CODE MIRROR PRO ⊹**.

| Section | Setting | Default |
|---|---|---|
| **Language** | Interface language | `Automatic` |
| **Appearance** | Theme | `Follow SillyTavern` |
| **Appearance** | Font size | `14` |
| **Editor** | Show line numbers | `on` |
| **Editor** | Word wrap | `on` |
| **Editor** | Highlight active line | `on` |
| **Editor** | Bracket matching | `on` |
| **Editor** | Auto-close brackets | `on` |
| **Languages** | Default language | `Markdown` |
| **Languages** | Enabled: CSS / Markdown / HTML / JSON / JavaScript | all `on` |
| **Toolbar** | Show toolbar | `on` |
| **Toolbar** | Position | `top` |
| **Mobile** | Mobile toolbar | `on` |
| **Mobile** | Auto-fullscreen on mobile | `off` |

All changes apply immediately to every open editor.

---

## ⟡ Mobile Support

The editor detects touch devices via `matchMedia('(pointer: coarse)')` and SillyTavern's `isMobile()` helper, and adapts:

- Toolbar buttons become 44px icon-only tap targets
- Status bar hidden to save horizontal space
- Input font-size forced to 16px to prevent iOS auto-zoom
- Safe-area insets respected
- Fullscreen toggle available (optional auto-fullscreen on dialog open)
- Search / replace panel sized and positioned for small viewports

---

## ⟡ i18n

Two locales shipped in `i18n/`:

| Code | Language | Status |
|---|---|---|
| `en-us` | English | primary, complete |
| `ru-ru` | Русский | complete |

### Adding a new locale

1. Copy `i18n/en-us.json` → `i18n/<code>.json` (e.g. `de-de.json`)
2. Translate values, keep keys identical
3. Register in `manifest.json` under the `i18n` block
4. Register in `src/index.js` via `registerDict('<code>', dict)`
5. Add to `AVAILABLE` in `src/i18n.js`
6. Submit a pull request

Missing keys fall back to English silently.

---

## ⟡ Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Editor | **CodeMirror 6** | `@codemirror/view` · `@codemirror/state` · `@codemirror/search` · `@codemirror/commands` · `@codemirror/language` · `@codemirror/autocomplete` |
| Languages | `@codemirror/lang-css` · `-markdown` · `-html` · `-json` · `-javascript` | Eager-inlined via webpack |
| Highlighting | `@lezer/highlight` tags | Self-contained themes, no external theme packs |
| Styling | Plain CSS | SmartTheme CSS variables |
| i18n | Flat JSON resource files | `en-us` · `ru-ru` |
| Build | **webpack 5** | Single bundle output `dist/index.js` |
| Persistence | `extension_settings.codeMirrorPro` | Via SillyTavern context |

---

## ⟡ File Layout

```
codemirrorpro/
├── manifest.json
├── package.json
├── webpack.config.js
├── LICENSE
├── README.md
├── CHANGELOG.md
├── dist/
│   └── index.js             pre-built bundle (committed)
├── i18n/
│   ├── en-us.json           English (primary)
│   └── ru-ru.json           Russian
├── src/
│   ├── index.js             entry · observer · bootstrap
│   ├── editor.js            setupCodeMirror(), Compartments, teardown
│   ├── settings.js          schema, drawer UI, persistence
│   ├── languages.js         detection + lazy loaders
│   ├── themes.js            7 themes incl. SmartTheme-aware auto
│   ├── toolbar.js           unified PC + mobile toolbar
│   ├── i18n.js              t(), setLocale(), detection
│   ├── build-info.js        build metadata + stable-ID helper
│   └── style.css
└── .github/workflows/
    └── build.yml            auto-rebuild dist/ on push
```

---

## ⟡ Build

Only required if you are forking or developing locally.

```
git clone https://github.com/aceeenvw/codemirrorpro.git
cd codemirrorpro
npm install
npm run build        # production, minified
npm run build:dev    # development, with source maps
npm run watch        # auto-rebuild on file change
```

The committed `dist/index.js` is what SillyTavern loads; rebuild and commit it with any source change.

---

## ⟡ Verifying Authorship

```js
// In DevTools console, with any editor dialog open:
JSON.parse(atob(document.querySelector('[data-cmp-build]').dataset.cmpBuild))
// → { a: "aceenvw", v: "2.0.0", t: <timestamp> }

// Or:
globalThis.CodeMirrorPro
// → { version: "2.0.0", author: "aceenvw", stopObserver: ƒ }
```

---

## ◆ Changelog

See [CHANGELOG.md](CHANGELOG.md).

---

## ◆ Acknowledgements

```
                      ╭───────────────────────╮
                      │    With gratitude to  │
                      ╰───────────────────────╯
```

### ✦ Upstream author

**[Cohee1207](https://github.com/Cohee1207)** — creator of the original [Extension-CodeMirror](https://github.com/SillyTavern/Extension-CodeMirror). The core idea (swap the maximized textarea with CodeMirror 6), the MutationObserver attach pattern, and the baseline SmartTheme-aware styling are their work. This fork stands on their shoulders.

### ✦ SillyTavern team

**[SillyTavern contributors](https://github.com/SillyTavern/SillyTavern/graphs/contributors)** — for building and maintaining the platform and exposing the context APIs (`SillyTavern.getContext`, `extension_settings`, `isMobile`) this fork relies on.

### ✦ CodeMirror team

**[Marijn Haverbeke](https://github.com/marijnh)** and contributors — for CodeMirror 6, the lean architecture that makes Compartment-based live reconfiguration possible.

### ✦ Fork author

**aceenvw** — fork maintenance, bug audit, language auto-detection, theme system, unified toolbar, settings drawer, i18n (EN + RU), mobile polish.

---

## ⟡ License

AGPL-3.0-or-later. Inherited from upstream. All original copyright notices are preserved in [LICENSE](LICENSE).

---

## ⟡ Contributing

Pull requests welcome. Ideas for future versions:

```
  v2.1   Language: YAML, Python, TypeScript, XML
  v2.2   Snippets / templates per field type
  v2.3   Diff view between character card versions
  v3.0   Multi-cursor UX polish · vim keybindings option
```

---

```
    ⊹                                                               ⊹
         Built with care for the SillyTavern community.
    ⊹                                                               ⊹
```
