import { EditorState } from '@codemirror/state';
import { Decoration, ViewPlugin } from '@codemirror/view';
import { insertCompletionText } from '@codemirror/autocomplete';

export function macroEligible(target) {
    return ['', 'true'].includes(target.getAttribute('data-macros'));
}

export function macroStem(text, position) {
    const start = Math.max(0, position - 4096);
    const before = text.slice(start, position);
    const tokens = /{{|}}/g;
    const stack = [];
    let token;
    while ((token = tokens.exec(before))) {
        if (token[0] === '{{') stack.push(token.index);
        else stack.pop();
    }
    if (!stack.length) return null;
    const opening = stack.at(-1) + 2;
    const content = before.slice(opening);
    const match = /^\s*([!?]*\s*)(\/?[a-z\d_-]*)$/i.exec(content);
    if (!match) return null;
    return { from: start + opening + content.length - match[2].length, name: match[2], content };
}

export function macroAllowed(target, preferences, stem, explicit) {
    const mode = target.dataset.macrosAutocomplete || 'default';
    if (!macroEligible(target) || mode === 'hide' || preferences?.state === 0) return false;
    if (!explicit && mode !== 'always' && !preferences?.showInAllMacroFields) return false;
    return explicit || preferences?.state !== 1 || stem.content.trim().length >= 2;
}

export function createMacroSource(target, contextProvider = () => globalThis.SillyTavern?.getContext?.()) {
    return context => {
        const stem = macroStem(context.state.doc.sliceString(Math.max(0, context.pos - 4096), context.pos), Math.min(context.pos, 4096));
        if (!stem) return null;
        stem.from += Math.max(0, context.pos - 4096);
        const host = contextProvider();
        if (!macroAllowed(target, host?.powerUserSettings?.stscript?.autocomplete, stem, context.explicit)) return null;
        const registry = host?.macros?.registry;
        if (!registry?.getAllMacros) return null;
        const closing = stem.name.startsWith('/');
        const definitions = registry.getAllMacros({ excludeHiddenAliases: true });
        if (!Array.isArray(definitions)) return null;
        const options = definitions.slice(0, 500)
            .filter(def => def && typeof def.name === 'string' && /^[a-z][\w-]*$/i.test(def.name))
            .map(def => {
                const name = `${closing ? '/' : ''}${def.name}`;
                const args = closing || !Array.isArray(def.unnamedArgDefs) ? [] : def.unnamedArgDefs.slice(0, 12)
                    .filter(arg => arg && typeof arg.name === 'string');
                const signature = `{{${name}${args.map(arg => `::${arg.optional ? '[' : ''}${arg.name}${arg.optional ? ']' : ''}`).join('')}${!closing && def.list ? '::…' : ''}}}`;
                return {
                    label: name, type: 'variable', detail: signature,
                    info: typeof def.description === 'string' ? def.description.slice(0, 2000) : '',
                    apply(view, _completion, from, to) {
                        const tail = view.state.doc.sliceString(to, Math.min(view.state.doc.length, to + 8));
                        const needsArgument = !closing && (def.minArgs > 0 || def.list?.min > 0);
                        const separator = needsArgument && !/^\s*::/.test(tail) ? '::' : '';
                        const hasClosing = /^\s*(?:}}|::)/.test(tail);
                        const insert = name + separator + (hasClosing ? '' : '}}');
                        const transaction = insertCompletionText(view.state, insert, from, to);
                        view.dispatch({ ...transaction, selection: { anchor: from + name.length + separator.length } });
                    },
                };
            });
        const suffix = context.state.doc.sliceString(context.pos, Math.min(context.pos + 128, context.state.doc.length)).match(/^[\w-]*/)[0];
        return { from: stem.from, to: context.pos + suffix.length, options, validFor: /^\/?[\w-]*$/ };
    };
}

export function macroMarks(text, offset = 0) {
    const marks = [];
    const tokens = /{{|}}|::/g;
    let depth = 0;
    let token;
    while ((token = tokens.exec(text))) {
        if (token[0] === '::') {
            if (depth) marks.push({ from: offset + token.index, to: offset + token.index + 2, kind: 'delimiter' });
            continue;
        }
        marks.push({ from: offset + token.index, to: offset + token.index + 2, kind: 'delimiter' });
        if (token[0] === '}}') { depth = Math.max(0, depth - 1); continue; }
        depth++;
        const name = /^\s*[!?]*\s*(\/?[a-z][\w-]*)/i.exec(text.slice(token.index + 2, token.index + 130));
        if (name) {
            const from = offset + token.index + 2 + name[0].length - name[1].length;
            marks.push({ from, to: from + name[1].length, kind: 'name' });
        }
    }
    return marks;
}

export function macroExtensions(target, source) {
    if (!macroEligible(target)) return [];
    const highlighting = ViewPlugin.fromClass(class {
        constructor(view) { this.decorations = this.build(view); }
        update(update) {
            if (update.docChanged || update.viewportChanged) this.decorations = this.build(update.view);
        }
        build(view) {
            const ranges = [];
            let previousEnd = -1;
            for (const visible of view.visibleRanges) {
                const from = Math.max(previousEnd, view.state.doc.lineAt(visible.from).from);
                const to = Math.min(view.state.doc.lineAt(visible.to).to, from + 100000);
                if (to <= from) continue;
                previousEnd = to;
                for (const mark of macroMarks(view.state.doc.sliceString(from, to), from)) {
                    ranges.push(Decoration.mark({ class: `cmp-macro-${mark.kind}` }).range(mark.from, mark.to));
                }
            }
            return Decoration.set(ranges, true);
        }
    }, { decorations: plugin => plugin.decorations });
    return [EditorState.languageData.of(() => [{ autocomplete: source }]), highlighting];
}
