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

function findInsertTarget(anchor) {
    if (!anchor) return null;
    // Als de knop in een 2-koloms .btn-grid zit: plaats na de 2e knop van die rij zodat de rij-indeling heel blijft
    const grid = anchor.closest('.btn-grid');
    if (grid) {
        const btns = Array.from(grid.querySelectorAll(':scope > .btn'));
        const idx = btns.indexOf(anchor);
        if (idx !== -1) {
            const rowEndBtn = (idx % 2 === 0 && idx + 1 < btns.length) ? btns[idx + 1] : btns[idx];
            return rowEndBtn;
        }
        return grid;
    }
    // Als de knop in een lijst-item of kaartje zit
    const card = anchor.closest('.meal-item, .recipe-card, .member-card');
    if (card) return card;
    // Als de knop in een horizontale flex-rij zit
    const parent = anchor.parentElement;
    if (parent && parent.style && parent.style.display === 'flex' && parent.style.flexDirection !== 'column') {
        return parent;
    }
    return anchor;
}

function clearInlineMessages(scopeEl) {
    const root = scopeEl || document;
    root.querySelectorAll('.inline-notice').forEach(el => el.remove());
}

function showInlineMessage(targetOrId, message) {
    const anchor = resolveAnchorElement(targetOrId);
    if (!anchor || !anchor.parentNode) return;

    clearInlineMessages();

    const insertAfterEl = findInsertTarget(anchor);
    if (!insertAfterEl || !insertAfterEl.parentNode) return;

    const box = document.createElement('div');
    box.className = 'inline-notice';
    box.innerText = message;
    box._anchor = anchor;
    box._createdAt = Date.now();

    insertAfterEl.insertAdjacentElement('afterend', box);
}

// Verwijder rode meldingen (.inline-notice) zodra de gebruiker op een ander UI-element klikt of focust.
// Bevestigingsvragen (.inline-confirm) met Ja/Annuleren blijven gewoon staan.
document.addEventListener('pointerdown', (e) => {
    document.querySelectorAll('.inline-notice').forEach(box => {
        if (box.contains(e.target)) return;
        box.remove();
    });
}, true);

document.addEventListener('focusin', (e) => {
    document.querySelectorAll('.inline-notice').forEach(box => {
        if (box._anchor && box._anchor.contains(e.target) && (Date.now() - (box._createdAt || 0) < 150)) return;
        if (box.contains(e.target)) return;
        box.remove();
    });
}, true);

function showInlineConfirm(targetOrId, questionText, onConfirm, confirmLabel = 'Ja, verwijderen') {
    const anchor = resolveAnchorElement(targetOrId);
    if (!anchor || !anchor.parentNode) return;

    const scope = anchor.closest('.widget, .auth-form') || anchor.parentElement || document;
    scope.querySelectorAll('.inline-confirm').forEach(el => el.remove());

    const insertAfterEl = findInsertTarget(anchor);
    if (!insertAfterEl || !insertAfterEl.parentNode) return;

    const box = document.createElement('div');
    box.className = 'inline-confirm';
    box.innerHTML = `
        <span>${escapeHtml(questionText)}</span>
        <span class="inline-confirm-actions">
            <button type="button" class="btn-inline-yes">${escapeHtml(confirmLabel)}</button>
            <button type="button" class="btn-inline-no">Annuleren</button>
        </span>
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

    insertAfterEl.insertAdjacentElement('afterend', box);
}
