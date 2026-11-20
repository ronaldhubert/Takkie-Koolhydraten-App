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

function resolveAnchorElement(targetOrId) {
    if (!targetOrId) return null;
    if (typeof targetOrId === 'string') {
        return document.getElementById(targetOrId) || document.querySelector(targetOrId);
    }
    return targetOrId;
}

function showInlineMessage(targetOrId, message, type = 'info', durationMs = 5000) {
    const anchor = resolveAnchorElement(targetOrId);
    if (!anchor || !anchor.parentNode) return;

    const container = anchor.closest('.meal-item, .recipe-card, .member-card') || anchor;
    const next = container.nextElementSibling;
    if (next && next.classList && next.classList.contains('inline-notice')) {
        next.remove();
    }

    const box = document.createElement('div');
    box.className = `inline-notice inline-notice-${type}`;
    const icon = type === 'error' ? '🐾' : type === 'success' ? '✅' : '🐶';
    box.innerHTML = `<span style="flex:1;">${icon} ${escapeHtml(message)}</span><button type="button" class="inline-notice-close" aria-label="Sluiten">✕</button>`;
    box.querySelector('.inline-notice-close').addEventListener('click', (e) => {
        e.stopPropagation();
        box.remove();
    });

    container.insertAdjacentElement('afterend', box);
    if (box.scrollIntoView) {
        try { box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (_e) {}
    }

    if (durationMs > 0) {
        setTimeout(() => {
            if (box.parentNode) box.remove();
        }, durationMs);
    }
}

function showInlineConfirm(targetOrId, questionText, onConfirm, confirmLabel = 'Ja, verwijderen') {
    const anchor = resolveAnchorElement(targetOrId);
    if (!anchor || !anchor.parentNode) return;

    const container = anchor.closest('.meal-item, .recipe-card, .member-card') || anchor;
    const next = container.nextElementSibling;
    if (next && next.classList && next.classList.contains('inline-confirm')) {
        next.remove();
    }

    const box = document.createElement('div');
    box.className = 'inline-confirm';
    box.innerHTML = `
        <div class="inline-confirm-text">🐾 ${escapeHtml(questionText)}</div>
        <div class="inline-confirm-actions">
            <button type="button" class="btn-inline-yes">${escapeHtml(confirmLabel)}</button>
            <button type="button" class="btn-inline-no">Annuleren</button>
        </div>
    `;
    box.addEventListener('click', (e) => e.stopPropagation());
    box.querySelector('.btn-inline-yes').addEventListener('click', async (e) => {
        e.stopPropagation();
        box.remove();
        await onConfirm();
    });
    box.querySelector('.btn-inline-no').addEventListener('click', (e) => {
        e.stopPropagation();
        box.remove();
    });

    container.insertAdjacentElement('afterend', box);
    if (box.scrollIntoView) {
        try { box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (_e) {}
    }
}
