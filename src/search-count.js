export function createMatchCounter({ maxLength = 250000, maxMatches = 10000, budget = 16 } = {}) {
    let doc;
    let query;
    let ranges = [];
    let limited = false;
    let skipped = false;
    return (state, nextQuery) => {
        if (doc !== state.doc || !query?.eq(nextQuery)) {
            doc = state.doc;
            query = nextQuery;
            ranges = [];
            limited = false;
            skipped = query.valid && doc.length > maxLength;
            if (query.valid && !skipped) {
                const cursor = query.getCursor(state);
                const started = performance.now();
                while (!cursor.next().done) {
                    ranges.push({ ...cursor.value });
                    if (ranges.length >= maxMatches || performance.now() - started >= budget) {
                        limited = true;
                        break;
                    }
                }
            }
        }
        const selection = state.selection.main;
        let low = 0, high = ranges.length;
        while (low < high) {
            const mid = (low + high) >>> 1;
            if (ranges[mid].from < selection.from) low = mid + 1;
            else high = mid;
        }
        const match = ranges[low];
        const current = match?.from === selection.from && match.to === selection.to ? low + 1 : 0;
        return { total: ranges.length, current, limited, skipped };
    };
}
