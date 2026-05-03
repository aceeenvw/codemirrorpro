// Self-contained CM6 themes. No external theme packages — keeps bundle lean.
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as T } from '@lezer/highlight';

function buildTheme(name, palette, dark) {
    const theme = EditorView.theme({
        '&': {
            color: palette.fg,
            backgroundColor: palette.bg,
        },
        '.cm-content': { caretColor: palette.caret },
        '&.cm-focused .cm-cursor': { borderLeftColor: palette.caret },
        '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
            backgroundColor: palette.selection,
        },
        '.cm-activeLine': { backgroundColor: palette.activeLine },
        '.cm-activeLineGutter': { backgroundColor: palette.activeLineGutter },
        '.cm-gutters': {
            backgroundColor: palette.gutterBg,
            color: palette.gutterFg,
            border: 'none',
        },
        '.cm-panels': {
            backgroundColor: palette.panelBg,
            color: palette.fg,
        },
        '.cm-panels.cm-panels-bottom': { borderTop: `1px solid ${palette.border}` },
        '.cm-panels.cm-panels-top': { borderBottom: `1px solid ${palette.border}` },
        '.cm-searchMatch': {
            backgroundColor: palette.matchBg,
            outline: `1px solid ${palette.matchOutline}`,
        },
        '.cm-searchMatch.cm-searchMatch-selected': {
            backgroundColor: palette.matchSelectedBg,
        },
        '.cm-matchingBracket, .cm-nonmatchingBracket': {
            backgroundColor: palette.bracketBg,
            outline: `1px solid ${palette.bracketOutline}`,
        },
        '.cm-tooltip': {
            backgroundColor: palette.panelBg,
            border: `1px solid ${palette.border}`,
            color: palette.fg,
        },
    }, { dark });

    const highlight = HighlightStyle.define([
        { tag: T.keyword, color: palette.keyword, fontWeight: '600' },
        { tag: [T.name, T.deleted, T.character, T.propertyName, T.macroName], color: palette.name },
        { tag: [T.function(T.variableName), T.labelName], color: palette.function },
        { tag: [T.color, T.constant(T.name), T.standard(T.name)], color: palette.constant },
        { tag: [T.definition(T.name), T.separator], color: palette.fg },
        { tag: [T.typeName, T.className, T.number, T.changed, T.annotation, T.modifier, T.self, T.namespace], color: palette.type },
        { tag: [T.operator, T.operatorKeyword, T.url, T.escape, T.regexp, T.link, T.special(T.string)], color: palette.operator },
        { tag: [T.meta, T.comment], color: palette.comment, fontStyle: 'italic' },
        { tag: T.strong, fontWeight: '700' },
        { tag: T.emphasis, fontStyle: 'italic' },
        { tag: T.strikethrough, textDecoration: 'line-through' },
        { tag: T.link, color: palette.link, textDecoration: 'underline' },
        { tag: T.heading, color: palette.heading, fontWeight: '700' },
        { tag: [T.atom, T.bool, T.special(T.variableName)], color: palette.atom },
        { tag: [T.processingInstruction, T.string, T.inserted], color: palette.string },
        { tag: T.invalid, color: palette.invalid },
    ]);

    return { name, dark, extension: [theme, syntaxHighlighting(highlight)] };
}

// SmartTheme-aware palette. Reads CSS vars so highlighting inherits ST look.
function autoPalette() {
    const css = (v, fb) => {
        try {
            const raw = getComputedStyle(document.body).getPropertyValue(v).trim();
            return raw || fb;
        } catch { return fb; }
    };
    const quote = css('--SmartThemeQuoteColor', '#b48ead');
    const em = css('--SmartThemeEmColor', '#d08770');
    const body = css('--SmartThemeBodyColor', '#e0e0e0');
    const bg = 'transparent';
    return {
        fg: body,
        bg,
        caret: body,
        selection: 'rgba(200,200,200,0.2)',
        activeLine: 'rgba(200,200,200,0.06)',
        activeLineGutter: 'rgba(200,200,200,0.1)',
        gutterBg: 'transparent',
        gutterFg: 'rgba(200,200,200,0.5)',
        panelBg: css('--SmartThemeBlurTintColor', 'rgba(0,0,0,0.6)'),
        border: css('--SmartThemeBorderColor', 'rgba(255,255,255,0.15)'),
        matchBg: 'rgba(255, 200, 0, 0.25)',
        matchOutline: 'rgba(255, 200, 0, 0.5)',
        matchSelectedBg: 'rgba(255, 200, 0, 0.45)',
        bracketBg: 'rgba(120, 180, 255, 0.25)',
        bracketOutline: 'rgba(120, 180, 255, 0.5)',
        keyword: em,
        name: body,
        function: css('--SmartThemeUnderlineColor', '#8fbcbb'),
        constant: em,
        type: '#ebcb8b',
        operator: '#81a1c1',
        comment: 'rgba(200,200,200,0.5)',
        link: quote,
        heading: em,
        atom: em,
        string: quote,
        invalid: '#bf616a',
    };
}

const ONE_DARK = {
    fg: '#abb2bf', bg: '#282c34', caret: '#528bff',
    selection: 'rgba(82, 139, 255, 0.25)',
    activeLine: '#2c313a', activeLineGutter: '#2c313a',
    gutterBg: '#282c34', gutterFg: '#495162',
    panelBg: '#21252b', border: '#181a1f',
    matchBg: 'rgba(255, 184, 108, 0.3)', matchOutline: 'rgba(255, 184, 108, 0.6)',
    matchSelectedBg: 'rgba(255, 184, 108, 0.5)',
    bracketBg: 'rgba(82, 139, 255, 0.2)', bracketOutline: 'rgba(82, 139, 255, 0.5)',
    keyword: '#c678dd', name: '#e06c75', function: '#61afef',
    constant: '#d19a66', type: '#e5c07b', operator: '#56b6c2',
    comment: '#5c6370', link: '#98c379', heading: '#e06c75',
    atom: '#d19a66', string: '#98c379', invalid: '#e06c75',
};

const DRACULA = {
    fg: '#f8f8f2', bg: '#282a36', caret: '#f8f8f0',
    selection: 'rgba(189, 147, 249, 0.3)',
    activeLine: '#44475a', activeLineGutter: '#44475a',
    gutterBg: '#282a36', gutterFg: '#6272a4',
    panelBg: '#21222c', border: '#191a21',
    matchBg: 'rgba(255, 184, 108, 0.3)', matchOutline: 'rgba(255, 184, 108, 0.6)',
    matchSelectedBg: 'rgba(255, 184, 108, 0.5)',
    bracketBg: 'rgba(139, 233, 253, 0.2)', bracketOutline: '#8be9fd',
    keyword: '#ff79c6', name: '#f8f8f2', function: '#50fa7b',
    constant: '#bd93f9', type: '#8be9fd', operator: '#ff79c6',
    comment: '#6272a4', link: '#8be9fd', heading: '#ff79c6',
    atom: '#bd93f9', string: '#f1fa8c', invalid: '#ff5555',
};

const SOLARIZED_LIGHT = {
    fg: '#586e75', bg: '#fdf6e3', caret: '#586e75',
    selection: 'rgba(7, 54, 66, 0.15)',
    activeLine: '#eee8d5', activeLineGutter: '#eee8d5',
    gutterBg: '#fdf6e3', gutterFg: '#93a1a1',
    panelBg: '#eee8d5', border: '#93a1a1',
    matchBg: 'rgba(181, 137, 0, 0.25)', matchOutline: 'rgba(181, 137, 0, 0.6)',
    matchSelectedBg: 'rgba(181, 137, 0, 0.45)',
    bracketBg: 'rgba(38, 139, 210, 0.2)', bracketOutline: '#268bd2',
    keyword: '#859900', name: '#268bd2', function: '#268bd2',
    constant: '#d33682', type: '#b58900', operator: '#859900',
    comment: '#93a1a1', link: '#268bd2', heading: '#cb4b16',
    atom: '#d33682', string: '#2aa198', invalid: '#dc322f',
};

const SOLARIZED_DARK = {
    fg: '#839496', bg: '#002b36', caret: '#839496',
    selection: 'rgba(147, 161, 161, 0.2)',
    activeLine: '#073642', activeLineGutter: '#073642',
    gutterBg: '#002b36', gutterFg: '#586e75',
    panelBg: '#073642', border: '#586e75',
    matchBg: 'rgba(181, 137, 0, 0.3)', matchOutline: 'rgba(181, 137, 0, 0.6)',
    matchSelectedBg: 'rgba(181, 137, 0, 0.5)',
    bracketBg: 'rgba(38, 139, 210, 0.25)', bracketOutline: '#268bd2',
    keyword: '#859900', name: '#268bd2', function: '#268bd2',
    constant: '#d33682', type: '#b58900', operator: '#859900',
    comment: '#586e75', link: '#268bd2', heading: '#cb4b16',
    atom: '#d33682', string: '#2aa198', invalid: '#dc322f',
};

const GITHUB_LIGHT = {
    fg: '#24292f', bg: '#ffffff', caret: '#24292f',
    selection: 'rgba(3, 102, 214, 0.15)',
    activeLine: '#f6f8fa', activeLineGutter: '#f6f8fa',
    gutterBg: '#ffffff', gutterFg: '#8b949e',
    panelBg: '#f6f8fa', border: '#d0d7de',
    matchBg: 'rgba(255, 223, 93, 0.5)', matchOutline: '#d4a72c',
    matchSelectedBg: 'rgba(255, 185, 0, 0.6)',
    bracketBg: 'rgba(3, 102, 214, 0.15)', bracketOutline: '#0366d6',
    keyword: '#cf222e', name: '#24292f', function: '#8250df',
    constant: '#0550ae', type: '#953800', operator: '#cf222e',
    comment: '#6e7781', link: '#0969da', heading: '#0550ae',
    atom: '#0550ae', string: '#0a3069', invalid: '#cf222e',
};

const GITHUB_DARK = {
    fg: '#c9d1d9', bg: '#0d1117', caret: '#c9d1d9',
    selection: 'rgba(56, 139, 253, 0.25)',
    activeLine: '#161b22', activeLineGutter: '#161b22',
    gutterBg: '#0d1117', gutterFg: '#6e7681',
    panelBg: '#161b22', border: '#30363d',
    matchBg: 'rgba(187, 128, 9, 0.4)', matchOutline: '#bb8009',
    matchSelectedBg: 'rgba(210, 153, 34, 0.6)',
    bracketBg: 'rgba(56, 139, 253, 0.25)', bracketOutline: '#388bfd',
    keyword: '#ff7b72', name: '#c9d1d9', function: '#d2a8ff',
    constant: '#79c0ff', type: '#ffa657', operator: '#ff7b72',
    comment: '#8b949e', link: '#79c0ff', heading: '#79c0ff',
    atom: '#79c0ff', string: '#a5d6ff', invalid: '#ff7b72',
};

export function getTheme(id) {
    switch (id) {
        case 'one-dark': return buildTheme('one-dark', ONE_DARK, true);
        case 'dracula': return buildTheme('dracula', DRACULA, true);
        case 'solarized-light': return buildTheme('solarized-light', SOLARIZED_LIGHT, false);
        case 'solarized-dark': return buildTheme('solarized-dark', SOLARIZED_DARK, true);
        case 'github-light': return buildTheme('github-light', GITHUB_LIGHT, false);
        case 'github-dark': return buildTheme('github-dark', GITHUB_DARK, true);
        case 'auto':
        default:
            return buildTheme('auto', autoPalette(), true);
    }
}
