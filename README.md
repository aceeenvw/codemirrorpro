```
        ╔══════════════════════════════════════════════════════╗
        ║                                                      ║
        ║         ⊹  C O D E M I R R O R   P R O  ⊹            ║
        ║                                                      ║
        ║       A maintained, mobile-ready text editor         ║
        ║                 for SillyTavern                      ║
        ║                                                      ║
        ╚══════════════════════════════════════════════════════╝
```

**Syntax highlighting · Find & replace · Mobile toolbar · Themes · i18n · Live settings · 17 bug fixes**

[![SillyTavern](https://img.shields.io/badge/SillyTavern-1.12%2B-c99?style=flat-square&labelColor=1a1a1a)](https://github.com/SillyTavern/SillyTavern)
[![Platform](https://img.shields.io/badge/platform-desktop%20%C2%B7%20mobile-b9b?style=flat-square&labelColor=1a1a1a)](#-mobile-support)
[![Author](https://img.shields.io/badge/author-aceenvw-9c9?style=flat-square&labelColor=1a1a1a)](https://github.com/aceeenvw)
[![License](https://img.shields.io/badge/license-AGPLv3-999?style=flat-square&labelColor=1a1a1a)](LICENSE)
[![Build](https://img.shields.io/badge/build-webpack%205%20%C2%B7%20single%20bundle-bbb?style=flat-square&labelColor=1a1a1a)](#-tech-stack)
[![i18n](https://img.shields.io/badge/i18n-EN%20%C2%B7%20RU-aaf?style=flat-square&labelColor=1a1a1a)](i18n)

[Features](#-features) · [Install](#-install) · [Usage](#-usage) · [Settings](#-settings) · [Mobile](#-mobile-support) · [Changelog](CHANGELOG.md) · [Credits](#-acknowledgements)

---

## ⟡ About

[](#-about)

**CodeMirror Pro** is a modernized fork of the excellent [Extension-CodeMirror](https://github.com/SillyTavern/Extension-CodeMirror) by **Cohee1207**. The original shipped a beautiful idea — replace SillyTavern's "expand text area" popup with a real CodeMirror editor — but was last updated in early 2025 and carried a handful of lingering issues (no find-on-desktop, only-CSS highlighting, mobile limited to one absolute-positioned Search button, no settings, no themes, focus-before-paint on Firefox mobile).

This fork preserves everything that made the original great, fixes **every bug found during audit**, and adds a full power-user feature set: five-language auto-detection, seven themes, a unified desktop + mobile toolbar, full find-and-replace, a proper settings drawer in the Extensions panel, English + Russian i18n, and live reconfiguration — change any setting and every open editor updates instantly.

---

## ◆ Features

[](#-features)

### ◇ Syntax highlighting for five languages

[](#-syntax-highlighting-for-five-languages)

Auto-detection by field hints + content sniffing.

-   ✦ **CSS** — for `customCSS` and any `.cm-` selector style fields
-   ✦ **JavaScript** — for regex scripts, code blocks
-   ✦ **JSON** — for world info entries, lorebooks, raw exports
-   ✦ **HTML** — for rich-format prompts, custom UI fragments
-   ✦ **Markdown** — for character descriptions, personality, first message, scenarios (default)
-   ✦ **Manual override** — click the language chip in the toolbar to switch any editor's language on the fly

### ◈ Unified toolbar — desktop and mobile

[](#-unified-toolbar--desktop-and-mobile)

One consistent control strip, adapts per device.

-   ✦ **Search** — opens CodeMirror's native search panel, styled to match ST
-   ✦ **Replace** — full find-and-replace (was keyboard-only on desktop, absent on mobile)
-   ✦ **Select all** — selects the whole document (`Ctrl+A` equivalent)
-   ✦ **Paste** — reads system clipboard, inserts at cursor
-   ✦ **Copy all** — grabs full document to clipboard
-   ✦ **Clear all** — empties the editor in one undoable step (`Ctrl+Z` restores)
-   ✦ **Undo / Redo** — history buttons alongside `Ctrl+Z` / `Ctrl+Y`
-   ✦ **Fullscreen toggle** — expand dialog to `100dvw × 100dvh`
-   ✦ **Settings gear** — in-editor popover with quick toggles
-   ✦ **Language chip** — shows detected language, click to override
-   ✦ **Live status bar** — `Ln 12, Col 5 · 248 words · 1 234 chars` with locale-aware number formatting

### ◇ Seven themes

[](#-seven-themes)

Live-switchable via CodeMirror 6 Compartments — no editor rebuild.

-   ✦ **Follow SillyTavern** *(default)* — inherits SmartTheme CSS variables, adapts to any ST theme automatically
-   ✦ **One Dark** — Atom's signature editor theme
-   ✦ **Dracula** — classic purple-on-navy
-   ✦ **Solarized Light** · **Solarized Dark** — the Ethan Schoonover pair
-   ✦ **GitHub Light** · **GitHub Dark** — for the VSCode crowd

All themes self-contained, hand-mapped to `@lezer/highlight` tags — zero external theme dependencies.

### ◈ Settings Panel

[](#-settings-panel)

A real UI instead of JSON editing.

-   ✦ Sectioned layout (Language · Appearance · Editor · Languages · Toolbar · Mobile)
-   ✦ Checkboxes for all toggles
-   ✦ Font-size number input (10–28px)
-   ✦ Theme dropdown · Default language dropdown · Enabled languages grid
-   ✦ Toolbar position selector (top / bottom)
-   ✦ Interface language selector (auto · English · Русский)
-   ✦ **Live-reloads** every open editor without restart
-   ✦ Also reachable as a quick popover via the toolbar gear icon

### ◇ Internationalization

[](#-internationalization)

-   ✦ **English primary**, Russian secondary, more easy to add
-   ✦ Auto-detects from SillyTavern's UI language → `navigator.languages` → fallback `en-us`
-   ✦ Flat JSON files in `i18n/` — contributor-friendly
-   ✦ Missing keys fall back to English silently

### ◈ Under the Hood

[](#-under-the-hood)

Modern, lean, correct.

-   ✦ **17 upstream bugs fixed** — see [CHANGELOG](CHANGELOG.md) for the full list
-   ✦ CodeMirror 6 **Compartments** for live reconfiguration
-   ✦ Lazy language packs **eager-inlined** by webpack → single `dist/index.js`, no runtime chunk fetching
-   ✦ Self-contained themes — no `@uiw/*` or `thememirror` deps
-   ✦ `role="textbox"` · `aria-multiline` · `aria-label` on editor host
-   ✦ Proper `editor.destroy()` on dialog close, observer torn down on `pagehide`
-   ✦ Sync-loop guard on input propagation
-   ✦ Firefox `:has` fallback via JS-applied class
-   ✦ iOS 16px-input trick to prevent focus-zoom
-   ✦ Safe-area insets for notched devices
-   ✦ Settings persisted via `extension_settings.codeMirrorPro` with deep-merge of defaults for forward compatibility

---

## ⟡ Before & After

[](#-before--after)

What you actually gain by forking.

| Feature | Upstream | **CodeMirror Pro** |
|---|---|---|
| Syntax highlighting | CSS only | **5 languages, auto-detected** |
| Find | Ctrl+F (no button on desktop) | **Toolbar button, desktop + mobile** |
| Replace | Ctrl+H only | **Toolbar button, full panel** |
| Paste button | — | **✓** |
| Copy all button | — | **✓** |
| Undo/Redo buttons | — | **✓** |
| Fullscreen | — | **✓ (toggle + auto on mobile)** |
| Themes | 1 (inherited ST) | **7** |
| Settings UI | — | **Full drawer + quick popover** |
| Font size control | — | **10–28px** |
| Line numbers toggle | — | **✓** |
| Word wrap toggle | — | hardcoded on → **user setting** |
| Line wrap | Always on | **Toggle** |
| Language override | — | **Language chip in toolbar** |
| Status bar | — | **Line/col/chars** |
| i18n | — | **EN + RU, extensible** |
| Mobile toolbar | 1 floating button | **Full 8-button sticky toolbar** |
| Mobile touch targets | ~28px | **44–48px** |
| iOS zoom-on-focus | Happens | **Prevented** |
| Firefox dialog width | Broken on ≤120 | **Fixed (class fallback)** |
| Observer leaks | Yes | **Torn down on pagehide** |
| Editor.destroy() | Never called | **Called on dialog close** |
| Screen reader | No labels | **role + aria-label + aria-multiline** |
| Tab key | Traps keyboard users | **indentWithTab (respects focus)** |

---

## ◆ Install

[](#-install)

### Option 1 — From the SillyTavern UI (recommended)

[](#option-1--from-the-sillytavern-ui-recommended)

1.  Open **Extensions → Manage Extensions → Install from URL**
2.  Paste:
    
    ```
    https://github.com/aceeenvw/codemirrorpro.git
    ```
    
3.  Reload SillyTavern

### Option 2 — Manual clone

[](#option-2--manual-clone)

```
cd /path/to/SillyTavern/public/scripts/extensions/third-party
git clone https://github.com/aceeenvw/codemirrorpro.git
```

### Option 3 — Symlink (for development)

[](#option-3--symlink-for-development)

```
ln -s /path/to/your/local/codemirrorpro-fork \
      /path/to/SillyTavern/public/scripts/extensions/third-party/codemirrorpro
```

> **◦ No `npm install` needed for users.** This extension ships a pre-built `dist/index.js` bundle. SillyTavern loads it directly. Only maintainers running the fork locally need Node.js — see [Build](#-build).

### ⚠ Conflict warning

[](#-conflict-warning)

If you have the original **Extension-CodeMirror** installed, **disable or remove it first.** Both extensions attach listeners to the same `textarea.maximized_textarea` element and will fight to own it, resulting in duplicate editors.

Disable via **Extensions → Manage Extensions**, or delete the folder:

```
rm -rf /path/to/SillyTavern/public/scripts/extensions/third-party/Extension-CodeMirror
```

After install, reload SillyTavern. The extension appears as **⊹ CODE MIRROR PRO ⊹** in the Extensions drawer.

---

## ◆ Usage

[](#-usage)

### Open the editor

[](#open-the-editor)

```
  Click any "Expand text area" button in the SillyTavern UI
  └─ Character description field
     ├─ Personality / Scenario / First message / Examples
     ├─ Custom CSS field (Advanced Character Settings)
     ├─ Regex script fields
     ├─ World info entry content
     └─ System prompts, author's notes, etc.
```

### Editor toolbar

[](#editor-toolbar)

```
  [CSS ▾]  [↺] [↻] | [🔍] | [⧉] [📋] [📄] [⌫] | [⛶] [⚙]     Ln 12, Col 5 · 248 words · 1 234 chars
   │        │   │     │      │   │   │   │      │   │
   │        │   │     │      │   │   │   │      │   └─ Settings popover (quick toggles)
   │        │   │     │      │   │   │   │      └───── Fullscreen toggle
   │        │   │     │      │   │   │   └──────────── Clear all (undoable)
   │        │   │     │      │   │   └──────────────── Copy all to clipboard
   │        │   │     │      │   └──────────────────── Paste from clipboard
   │        │   │     │      └──────────────────────── Select all
   │        │   │     └─────────────────────────────── Find & replace panel
   │        │   └───────────────────────────────────── Redo
   │        └───────────────────────────────────────── Undo
   └────────────────────────────────────────────────── Language override (click to switch)
```

### Desktop shortcuts

[](#desktop-shortcuts)

```
  Ctrl+F            Open search
  Ctrl+H            Open replace
  Ctrl+A            Select all
  Ctrl+Z            Undo
  Ctrl+Y            Redo  (or Ctrl+Shift+Z)
  Ctrl+Space        Trigger autocomplete (when enabled)
  Tab               Insert indent (respects focus — accessibility-safe)
  Esc               Close search panel
```

### Mobile

[](#mobile)

```
  Tap the toolbar buttons — same controls, icon-only, 44px touch targets
  Long-press [⛶] area of dialog — toggle fullscreen
  Toolbar stays sticky above the keyboard
  Input uses 16px font-size so iOS Safari doesn't auto-zoom on focus
```

---

## ⟡ Settings

[](#-settings)

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
| **Editor** | Code folding | `off` |
| **Editor** | Fold all on open | `off` |
| **Editor** | Autocomplete | `off` |
| **Editor** | Indent size | `4` |
| **Editor** | Line height | `1.5` |
| **Languages** | Default language | `Markdown` |
| **Languages** | Enabled: CSS / Markdown / HTML / JSON / JavaScript | all `on` |
| **Toolbar** | Show toolbar | `on` |
| **Toolbar** | Position | `top` |
| **Mobile** | Mobile toolbar | `on` |
| **Mobile** | Auto-fullscreen on mobile | `off` |

**All changes apply immediately** to every open editor — no reload required.

### Quick-settings popover

[](#quick-settings-popover)

Click the **⚙ gear** in any editor's toolbar to get a fast popover without leaving the dialog:

```
  ┌──────────────────────────────────┐
  │ ☑ Show line numbers              │
  │ ☑ Word wrap                      │
  │ Font size       [  14  ]         │
  │ Theme        [ Follow ST  ▾ ]    │
  └──────────────────────────────────┘
```

---

## ⟡ Mobile Support

[](#-mobile-support)

The editor detects touch devices via `matchMedia('(pointer: coarse)')`, `matchMedia('(hover: none)')`, and SillyTavern's `isMobile()` helper, then adapts the UI accordingly.

| Interaction | Desktop | Mobile / Touch |
|---|---|---|
| Search | `Ctrl+F` or toolbar | **Toolbar button** |
| Replace | `Ctrl+H` or toolbar | **Toolbar button** |
| Undo / Redo | `Ctrl+Z` / `Ctrl+Y` | **Toolbar buttons** |
| Paste | `Ctrl+V` | **Dedicated button (clipboard API)** |
| Fullscreen | Toolbar button | **Toolbar button + optional auto on open** |
| Language override | Click chip | Tap chip |

### Mobile-specific features

[](#mobile-specific-features)

-   ✦ **44–48px touch targets** — follows Apple HIG & Material Design minimums
-   ✦ **iOS zoom prevention** — inputs use 16px font-size so Safari doesn't auto-zoom on focus
-   ✦ **Safe-area insets** — respects notches and gesture bars on modern devices
-   ✦ **Sticky toolbar** — stays above keyboard, not buried by it
-   ✦ **Icon-only toolbar** — labels hidden on narrow viewports to save space
-   ✦ **Auto-fullscreen option** — dialog opens at `100dvw × 100dvh` on mobile if enabled
-   ✦ **Status bar hidden** on touch devices (saves horizontal real-estate)

### Mobile settings

[](#mobile-settings)

Open **Extensions → ⊹ CODE MIRROR PRO ⊹ → Mobile**:

| Setting | Default | Description |
|---|---|---|
| Mobile toolbar | `on` | Show the unified toolbar on touch devices |
| Auto-fullscreen on mobile | `off` | Open each editor dialog at full viewport |

---

## ⟡ i18n

[](#-i18n)

Two locales shipped in `i18n/`:

| Code | Language | Status |
|---|---|---|
| `en-us` | English | primary, complete |
| `ru-ru` | Русский | complete (neutral-impersonal tone) |

### Detection order

[](#detection-order)

1.  User override in **Settings → Language → Interface language**
2.  SillyTavern's current UI language (via `SillyTavern.getContext()`)
3.  `navigator.languages` / `navigator.language`
4.  Fallback: `en-us`

Russian matching is tolerant — `ru`, `ru-RU`, `ru-BY`, `ru-UA`, `uk`, `be` all map to `ru-ru`.

### Adding a new locale

[](#adding-a-new-locale)

1.  Copy `i18n/en-us.json` → `i18n/<code>.json` (e.g. `de-de.json`)
2.  Translate **values**, keep **keys** identical
3.  Register in `manifest.json` under `i18n`
4.  Register in `src/index.js` — `registerDict('<code>', dict)`
5.  Add to `AVAILABLE` in `src/i18n.js`
6.  Run `npm run build`, commit `dist/index.js`
7.  Submit a pull request

---

## ⟡ Tech Stack

[](#-tech-stack)

| Layer | Technology | Notes |
|---|---|---|
| Editor | **CodeMirror 6** | `@codemirror/view` · `@codemirror/state` · `@codemirror/search` · `@codemirror/commands` · `@codemirror/language` · `@codemirror/autocomplete` |
| Languages | `@codemirror/lang-*` | CSS · Markdown · HTML · JSON · JavaScript. Eager-inlined via webpack |
| Highlighting | `@lezer/highlight` tags | Self-contained themes, no external theme packs |
| Styling | Plain CSS | SmartTheme CSS variables, `cmp--` prefix |
| i18n | Flat JSON resource files | `en-us` · `ru-ru` |
| Build | **webpack 5** | Single bundle output `dist/index.js` (~592 KB minified) |
| Persistence | `extension_settings.codeMirrorPro` | Via SillyTavern context |
| Dependencies | **Zero runtime** | Everything bundled — no CDN fetches |

---

## ⟡ File Layout

[](#-file-layout)

```
codemirrorpro/
├── manifest.json              Extension metadata · i18n registration
├── package.json               Build-time deps (users don't install)
├── webpack.config.js          Single-bundle webpack config
├── LICENSE                    AGPLv3 (inherited) + fork notice
├── README.md                  This file
├── CHANGELOG.md               Version history
├── dist/
│   └── index.js               Pre-built bundle (committed)
├── i18n/
│   ├── en-us.json             English (primary)
│   └── ru-ru.json             Russian
└── src/
    ├── index.js               Entry · observer · bootstrap
    ├── editor.js              setupCodeMirror() · Compartments · teardown
    ├── settings.js            Schema · drawer UI · persistence
    ├── languages.js           Detection + lazy loaders
    ├── themes.js              7 themes incl. SmartTheme-aware auto
    ├── toolbar.js             Unified PC + mobile toolbar
    ├── i18n.js                t() · setLocale() · detection
    ├── build-info.js          Build metadata + stable-ID helper
    └── style.css              cmp-- prefixed styles, SmartTheme-aware
```

---

## ⟡ Build

[](#-build)

Only required if you are forking or developing locally.

```
git clone https://github.com/aceeenvw/codemirrorpro.git
cd codemirrorpro
npm install
npm run build        # production, minified, single bundle
npm run build:dev    # development, with source maps
npm run watch        # auto-rebuild on file change
```

The committed `dist/index.js` is what SillyTavern loads. **Rebuild and commit it** with every source change.

---

## ⟡ Verifying Authorship

[](#-verifying-authorship)

Paste into DevTools console with any editor dialog open:

```js
JSON.parse(atob(document.querySelector('[data-cmp-build]').dataset.cmpBuild))
// → { a: "aceenvw", v: "2.0.0", t: <timestamp> }

// Or simpler:
globalThis.CodeMirrorPro
// → { version: "2.0.0", author: "aceenvw", stopObserver: ƒ }
```

---

## ◆ Changelog

[](#-changelog)

See [CHANGELOG.md](CHANGELOG.md) for the full version history.

**2.0.0 — Fork baseline (2026-05)** — highlights:

### ✦ Bug fixes (17 total)

[](#-bug-fixes-17-total)

-   Context destructuring crash on top-level (`const { isMobile } = SillyTavern.getContext()`)
-   MutationObserver never torn down — leaked on every hot-reload
-   Missing `subtree: true` — fragile to ST layout changes
-   Double-attach on re-render — duplicate `.codemirror-host` elements
-   Input sync feedback loop — no `syncing` guard
-   `target.parentElement.appendChild` crashed on detached textareas
-   `editor.focus()` before first paint — invisible cursor on Firefox mobile
-   No `editor.destroy()` on dialog close — listener leaks per dialog
-   Firefox `:has` fallback missing — dialog width broken on FF ≤ 120
-   Tab key trap — bound `insertTab` without escape path
-   Zero screen-reader support (no `role`/`aria-*`)
-   Mobile search button overlapped last line of content
-   No search/replace UI on desktop
-   Word wrap hardcoded — no toggle
-   Search panel positioning on mobile
-   isMobile() called as function without shape-check

### ✦ New features

[](#-new-features)

-   Auto-detected syntax highlighting for **CSS, Markdown, HTML, JSON, JavaScript**
-   **Unified toolbar** — Search, Replace, Paste, Copy, Undo, Redo, Fullscreen, Settings, language chip, status bar
-   **7 themes** with live Compartment-based switching
-   **Settings drawer** in ST Extensions page — every option live-applied
-   **Quick-settings popover** inside editor
-   **Clipboard paste/copy** buttons with graceful permission handling
-   **Fullscreen toggle** (optional auto-fullscreen on mobile)
-   **i18n** — English + Russian, auto-detected, overridable

### ✦ Modernization

[](#-modernization)

-   Split monolithic `index.js` into 8 focused modules
-   webpack 5 with eager dynamic imports → single bundle, no chunk fetching
-   Self-contained themes — no external theme packages
-   `manifest.json` i18n block per ST 1.12+ convention
-   `auto_update: true` preserved
-   Settings persisted via `extension_settings.codeMirrorPro` with deep-merge forward-compat

---

## ◆ Acknowledgements

[](#-acknowledgements)

```
                      ╭───────────────────────╮
                      │    With gratitude to  │
                      ╰───────────────────────╯
```

### ✦ Upstream author

[](#-upstream-author)

**[Cohee1207](https://github.com/Cohee1207)** — creator of the original [Extension-CodeMirror](https://github.com/SillyTavern/Extension-CodeMirror). The core idea (swap the maximized textarea with CodeMirror 6), the MutationObserver attach pattern, and the baseline SmartTheme-aware styling are all their work. This fork stands on their shoulders.

### ✦ SillyTavern team

[](#-sillytavern-team)

**[SillyTavern contributors](https://github.com/SillyTavern/SillyTavern/graphs/contributors)** — for building and maintaining the platform and exposing the context APIs (`SillyTavern.getContext`, `extension_settings`, `isMobile`, `saveSettingsDebounced`) this fork relies on.

### ✦ CodeMirror team

[](#-codemirror-team)

**[Marijn Haverbeke](https://github.com/marijnh)** and the CodeMirror contributors — for CodeMirror 6, whose Compartment architecture makes live reconfiguration possible without editor rebuilds.

### ✦ Inspiration

[](#-inspiration)

-   **VSCode** — for the command-palette-style quick-settings popover and the "status bar at the bottom" convention
-   **CharSwitch Pro** (sibling fork) — for the fork conventions, CSS prefix pattern, i18n file layout, and credits-block style used here

### ✦ Fork author

[](#-fork-author)

**aceenvw** — fork maintenance, bug audit, language auto-detection, theme system, unified toolbar, settings drawer, quick-settings popover, i18n (EN + RU), mobile polish.

---

## ⟡ License

[](#-license)

This fork inherits the license of the upstream [Extension-CodeMirror](https://github.com/SillyTavern/Extension-CodeMirror) repository — **AGPL-3.0-or-later**. All original copyright notices and attribution are preserved in [LICENSE](LICENSE). New code contributed in this fork is available under the same terms.

---

```
    ⊹                                                               ⊹
         Built with care for the SillyTavern community.
    ⊹                                                               ⊹
```
