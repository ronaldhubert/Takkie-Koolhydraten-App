// Kleine hulpfuncties: datums, escapeHtml, gram-opmaak.
// Klassiek script (geen module): deelt globale functies en variabelen met de andere bestanden in js/.
// Zie ARCHITECTURE.md voor de laadvolgorde.

function formatDateLocal(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getTodayString() {
    return formatDateLocal(new Date());
}

function getYesterdayString() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return formatDateLocal(d);
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function parseGramNumber(val) {
    if (typeof val === 'number') return val;
    const match = String(val ?? '').match(/\d+(\.\d+)?/);
    return match ? Math.round(parseFloat(match[0])) : 0;
}

function formatGramLabel(val, unit = 'g') {
    const num = parseGramNumber(val);
    return `${num}${unit}`;
}
