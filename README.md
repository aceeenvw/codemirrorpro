<div align="center">

# ⊹ CODE MIRROR PRO ⊹

A comfortable expanded text editor for SillyTavern — on desktop and mobile.

[Highlights](#highlights) · [Install](#install) · [Usage](#usage) · [Settings](#settings) · [Troubleshooting](#troubleshooting)

</div>

## Highlights

| Feature | What it does |
| --- | --- |
| Language highlighting | CSS, JavaScript, JSON, HTML, Markdown, and plain text; automatic detection with a manual language picker. |
| Search & replace | Case-sensitive, whole-word, and regular-expression search, with previous/next navigation and replacement. |
| SillyTavern macros | Suggestions from the host registry, argument-signature hints, and highlighting for macro names, nested calls, and scoped closing tags. |
| Markdown tools | Selection-aware formatting from a compact menu or SillyTavern-compatible keyboard shortcuts. |
| Editing profiles | Optional code/prose presets, with your explicit preferences taking precedence. |
| Token count | Count the current editor's text on demand using SillyTavern's tokenizer. |
| Appearance | Follow the SillyTavern theme or choose One Dark, Solarized Light/Dark, GitHub Light/Dark, or Dracula. |
| Mobile controls | Scrollable toolbar, large touch targets, fullscreen, and popovers sized to the visible screen. |

## Install

1. Open **Extensions → Install extension** in SillyTavern.
2. Paste `https://github.com/aceeenvw/codemirrorpro` and install.
3. Reload SillyTavern.
4. Open **Extensions → ⊹ CODE MIRROR PRO ⊹** to adjust preferences.

Disable the original Extension-CodeMirror if it is installed, so both extensions do not replace the same editor.

## Usage

Click SillyTavern's **expand** button beside a text field. CodeMirror Pro replaces the expanded textarea and keeps changes synchronized with the original field as you type. Closing the editor follows SillyTavern's normal behavior; it is not a separate save/cancel workflow.

The toolbar provides undo/redo, search, formatting, token count, select all, paste, copy all, clear, profiles, fullscreen, and quick settings. The language chip selects the highlighting mode for the current editor. Swipe the toolbar or use its arrows when controls do not fit.

### Search & replace

Open **Search** or press **Ctrl/Cmd+F**. Enter a query, select case/whole-word/regex options, and use the arrows or Enter/Shift+Enter to navigate. The replacement field supports replacing one match or all matches. Escape closes the search panel.

Match counts use the same query rules as navigation. Large documents or very numerous matches show a partial or paused count to keep the interface responsive. This does not prevent searching or replacing.

### Macro suggestions

In a macro-enabled field, type `{{` and a name to see suggestions, or press **Ctrl+Space**. Suggestions include visible registry aliases and documented argument signatures. Nested macro names and `{{/name}}` closing tags are supported.

Completion follows SillyTavern's macro autocomplete settings, including disabled completion and its minimum-length preference. The language-completion toggle controls code-language suggestions separately. These tools edit literal text; they do not evaluate macros.

### Markdown formatting

Use **Format text** to toggle bold, italic, underline-style `__`, inline code, or strikethrough around a selection. With an empty selection, formatting inserts paired markers; a caret inside a word formats that word. Each formatting action can be undone separately.

For fields with SillyTavern Markdown hotkeys enabled:

| Shortcut | Markers |
| --- | --- |
| Ctrl+B | `**bold**` |
| Ctrl+I | `*italic*` |
| Ctrl+U | `__text__` |
| Ctrl+K | `` `code` `` |
| Ctrl+Shift+Backquote | `~~strikethrough~~` |

These shortcuts respect the host's Markdown-hotkey preference. The formatting menu remains available for prose and Markdown editors.

### Editing profiles

Profiles are **off by default**. Enable **Use field-aware profiles** for automatic field-based defaults, or choose a profile for one editor from **Editing profile**:

- **Prose:** wrapping on, line numbers and bracket helpers off, Markdown highlighting where enabled.
- **Code:** wrapping off, line numbers, bracket helpers and folding on.
- **Use my settings:** use your editor preferences directly.
- **Automatic:** use field-based profiles only when the setting is enabled.

Explicit editor preferences override profile defaults. A language selected with the language picker wins over profile language choices. Per-editor profile and language choices last until that editor closes.

### Token count

Click **Count tokens** to count the entire current document. The result appears in the toolbar and becomes **Recount** when the text changes.

This counts literal editor text, before macro substitution or prompt assembly. It uses the current SillyTavern tokenizer, which may request counts from the configured backend. Counting is never triggered per keystroke. A timeout is shown if the host takes too long; another request becomes available when that request finishes.

## Settings

The Extensions drawer contains appearance, language, editor, toolbar, and mobile preferences. The gear in an open editor provides quick access to wrapping, line numbers, folding, language completion, font size, line height, and theme.

Appearance and editor controls apply live, as do toolbar visibility/position and profile changes. Default-language and enabled-language changes apply to newly opened editors; use the language picker to change an existing editor. **Fold all on open**, mobile auto-fullscreen, and remembered fullscreen are opening preferences.

The interface supports English and Russian. **Automatic** follows SillyTavern's interface language, with English as the fallback.

### Mobile

- Enable **Mobile toolbar** to keep touch controls visible.
- Use **Auto-fullscreen on mobile** if you prefer an expanded editor that fills the available screen.
- Fullscreen and open popovers follow the visible viewport when the soft keyboard changes its size.
- Touch devices use at least a 16px editor font to avoid focus zoom; larger font choices are preserved.
- The desktop position/word/character strip is hidden on mobile. Token results remain in the toolbar.

## Troubleshooting

| Problem | Check |
| --- | --- |
| The ordinary textarea still appears | Reload after installing; confirm the extension is enabled and another CodeMirror extension is disabled. |
| Highlighting is unexpected | Use the language chip. Field purpose takes priority over content detection, so prompt tags and macro braces are not treated as HTML or JSON automatically. |
| No macro suggestions | Check that the original field supports macros and that SillyTavern's macro autocomplete is enabled. |
| A profile does not change a setting | Explicit preferences take precedence over presets. Reset settings if you want to return to untouched defaults. |
| Paste fails | Clipboard access requires browser permission and a secure context. Native paste into the editor still works. |
| Token count fails or times out | Check the current model/tokenizer and backend connection in SillyTavern, then retry when the pending request finishes. |

## Credits & license

Maintained by **aceenvw**. Based on [Extension-CodeMirror](https://github.com/SillyTavern/Extension-CodeMirror) by **Cohee1207**, using [CodeMirror 6](https://codemirror.net/).

Licensed under [AGPL-3.0-or-later](LICENSE).
