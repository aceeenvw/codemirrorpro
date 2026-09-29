import { EditorSelection, Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { isolateHistory } from '@codemirror/commands';

export const FORMATS = Object.freeze([
    { id: 'bold', marker: '**', icon: 'fa-solid fa-bold' },
    { id: 'italic', marker: '*', icon: 'fa-solid fa-italic' },
    { id: 'underline', marker: '__', icon: 'fa-solid fa-underline' },
    { id: 'code', marker: '`', icon: 'fa-solid fa-code' },
    { id: 'strike', marker: '~~', icon: 'fa-solid fa-strikethrough' },
]);

export function formatSelection(view, marker) {
    const state = view.state;
    const changes = state.changeByRange(range => {
        let { from, to } = range;
        const line = state.doc.lineAt(from);
        if (range.empty && state.selection.ranges.length === 1 && from > line.from && from < line.to) {
            const text = line.text;
            const index = from - line.from;
            if (!/\s/.test(text[index - 1]) && !/\s/.test(text[index])) {
                while (from > line.from && !/\s/.test(text[from - line.from - 1])) from--;
                while (to < line.to && !/\s/.test(text[to - line.from])) to++;
            }
        }
        const selected = state.doc.sliceString(from, to);
        const length = marker.length;
        const outside = from >= length && to + length <= state.doc.length
            && state.doc.sliceString(from - length, from) === marker
            && state.doc.sliceString(to, to + length) === marker;
        if (outside) {
            return { changes: [{ from: from - length, to: from }, { from: to, to: to + length }],
                range: range.empty ? EditorSelection.cursor(range.head - length) : EditorSelection.range(from - length, to - length) };
        }
        if (selected.length >= length * 2 && selected.startsWith(marker) && selected.endsWith(marker)) {
            const insert = selected.slice(length, -length);
            return { changes: { from, to, insert }, range: range.empty
                ? EditorSelection.cursor(Math.max(from, Math.min(from + insert.length, range.head - length)))
                : EditorSelection.range(from, from + insert.length) };
        }
        const inner = selected.replace(/\s+$/, '');
        const insert = marker + inner + marker + selected.slice(inner.length);
        return { changes: { from, to, insert }, range: range.empty ? EditorSelection.cursor(range.head + length)
            : EditorSelection.range(from + length, from + length + inner.length) };
    });
    view.dispatch({ ...changes, scrollIntoView: true,
        annotations: [isolateHistory.of('full'), Transaction.userEvent.of('input.format')] });
    view.focus();
    return true;
}

export function markdownHotkeys(target) {
    return EditorView.domEventHandlers({ keydown(event, view) {
        if (!target.classList.contains('mdHotkeys') || !globalThis.SillyTavern?.getContext?.()?.powerUserSettings?.enable_md_hotkeys) return false;
        if (!event.ctrlKey || event.altKey || event.metaKey) return false;
        let marker;
        if (event.shiftKey && event.code === 'Backquote') marker = '~~';
        else if (!event.shiftKey) marker = { b: '**', i: '*', u: '__', k: '`' }[event.key.toLowerCase()];
        if (!marker) return false;
        event.preventDefault();
        return formatSelection(view, marker);
    } });
}
