// Logboek met grafieken: weken, dagen en dagdetails.
// Klassiek script (geen module): deelt globale functies en variabelen met de andere bestanden in js/.
// Zie ARCHITECTURE.md voor de laadvolgorde.

// ==========================================
// LOGBOEK: WEKEN > DAGEN > DAGDETAILS
// ==========================================
const historyState = { view: 'weeks', pageOffset: 0, weekStart: null, day: null, metric: 'carbs' };
const HISTORY_METRICS = {
    carbs: { label: 'Koolhydraten', short: 'KH', unit: 'g' },
    protein: { label: 'Eiwit', short: 'Eiwit', unit: 'g' },
    fat: { label: 'Vet', short: 'Vet', unit: 'g' },
    kcal: { label: 'Calorieën', short: 'kcal', unit: ' kcal' }
};
function metricGoal() {
    return appState.goals[historyState.metric] || 1;
}
function renderMetricPicker() {
    const el = document.getElementById('history-metric');
    if (!el) return;
    el.innerHTML = Object.keys(HISTORY_METRICS).map(k => {
        const active = historyState.metric === k;
        return `<button type="button" class="hist-metric-btn${active ? ' active' : ''}" data-hist-metric="${k}">${HISTORY_METRICS[k].label}</button>`;
    }).join('');
}
const HISTORY_WEEKS_PER_PAGE = 3;
const DAY_NAMES_SHORT = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
const MONTH_NAMES_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

function mealKcal(m) {
    return Math.round((Number(m.carbs) || 0) * 4 + (Number(m.protein) || 0) * 4 + (Number(m.fat) || 0) * 9);
}

function parseLocalDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function getMondayOf(dateObj) {
    const d = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    const diff = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - diff);
    return d;
}

function addDays(dateObj, n) {
    const d = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    d.setDate(d.getDate() + n);
    return d;
}

function shortDateLabel(dateObj) {
    return `${dateObj.getDate()} ${MONTH_NAMES_SHORT[dateObj.getMonth()]}`;
}

function getISOWeekNumber(dateObj) {
    const d = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

async function fetchHistoryRange(startStr, endStr) {
    const result = { meals: [], water: {} };
    if (!currentUser) return result;
    const { data: meals } = await window.supabaseClient
        .from('meals')
        .select('*')
        .eq('user_id', currentUser.id)
        .gte('date', startStr)
        .lte('date', endStr);
    result.meals = meals || [];
    const { data: logs } = await window.supabaseClient
        .from('daily_logs')
        .select('date, water')
        .eq('user_id', currentUser.id)
        .gte('date', startStr)
        .lte('date', endStr);
    (logs || []).forEach(l => { result.water[l.date] = l.water || 0; });
    return result;
}

function summarizeDay(meals, dateStr) {
    const dayMeals = meals.filter(m => m.date === dateStr);
    return {
        date: dateStr,
        count: dayMeals.length,
        kcal: dayMeals.reduce((s, m) => s + mealKcal(m), 0),
        carbs: dayMeals.reduce((s, m) => s + (Number(m.carbs) || 0), 0),
        fat: dayMeals.reduce((s, m) => s + (Number(m.fat) || 0), 0),
        protein: dayMeals.reduce((s, m) => s + (Number(m.protein) || 0), 0),
        meals: dayMeals
    };
}

function buildBarChart(items) {
    // items: [{ label, sublabel, value, extra, action, highlight }]
    const goal = metricGoal();
    const unit = HISTORY_METRICS[historyState.metric].unit;
    const max = Math.max(goal * 1.15, ...items.map(i => i.value), 1);
    const goalPct = Math.min(100, (goal / max) * 100);
    const bars = items.map(i => {
        const h = Math.max(i.value > 0 ? 4 : 0, (i.value / max) * 100);
        const over = i.value > goal ? ' hist-bar-over' : '';
        return `
            <button type="button" class="hist-col" ${i.action}>
                <div class="hist-value">${i.value > 0 ? i.value : '–'}</div>
                <div class="hist-bar-area"><div class="hist-goal-tick" style="bottom: ${goalPct}%;"></div>
                    <div class="hist-bar${over}${i.highlight ? ' hist-bar-today' : ''}" style="height: ${h}%;"></div>
                </div>
                <div class="hist-label">${i.label}</div>
                <div class="hist-sublabel">${i.sublabel}</div>
                <div class="hist-extra">${i.extra}</div>
            </button>`;
    }).join('');
    return `
        <div class="hist-chart">
            <div class="hist-cols">${bars}</div>
            <div style="font-size:0.7rem; color:#888; text-align:center; margin-top:4px;">${HISTORY_METRICS[historyState.metric].label} · stippellijn = dagdoel (${goal}${unit})</div>
        </div>`;
}

async function renderHistory() {
    const navEl = document.getElementById('history-nav');
    const contentEl = document.getElementById('history-content');
    if (!navEl || !contentEl || !currentUser) return;
    renderMetricPicker();

    contentEl.innerHTML = '<p style="color:#666;">Even laden... 🐾</p>';
    const thisMonday = getMondayOf(new Date());
    const todayStr = getTodayString();

    if (historyState.view === 'weeks') {
        const newestStart = addDays(thisMonday, -7 * historyState.pageOffset * HISTORY_WEEKS_PER_PAGE);
        const weekStarts = [];
        for (let i = HISTORY_WEEKS_PER_PAGE - 1; i >= 0; i--) weekStarts.push(addDays(newestStart, -7 * i));
        const rangeStart = formatDateLocal(weekStarts[0]);
        const rangeEnd = formatDateLocal(addDays(weekStarts[weekStarts.length - 1], 6));
        const data = await fetchHistoryRange(rangeStart, rangeEnd);

        const items = weekStarts.map(ws => {
            const days = [];
            for (let d = 0; d < 7; d++) days.push(summarizeDay(data.meals, formatDateLocal(addDays(ws, d))));
            const logged = days.filter(d => d.count > 0);
            const m = historyState.metric;
            const avgKcal = logged.length ? Math.round(logged.reduce((s, d) => s + d.kcal, 0) / logged.length) : 0;
            const avgCarbs = logged.length ? Math.round(logged.reduce((s, d) => s + d.carbs, 0) / logged.length) : 0;
            const avgMetric = logged.length ? Math.round(logged.reduce((s, d) => s + d[m], 0) / logged.length) : 0;
            const isThis = formatDateLocal(ws) === formatDateLocal(thisMonday);
            return {
                label: `Week ${getISOWeekNumber(ws)}`,
                sublabel: `${shortDateLabel(ws)} – ${shortDateLabel(addDays(ws, 6))}`,
                value: avgMetric,
                extra: logged.length ? `${m === 'kcal' ? avgCarbs + 'g KH' : avgKcal + ' kcal'} · ${logged.length}/7 dgn` : 'niets gelogd',
                action: `data-hist-week="${formatDateLocal(ws)}"`,
                highlight: isThis
            };
        });

        navEl.innerHTML = `
            <button type="button" class="btn btn-auto hist-nav-btn" data-hist-prev>← Eerder</button>
            <span style="font-weight:700; font-size:0.85rem; text-align:center;">Gemiddeld per dag</span>
            <button type="button" class="btn btn-auto hist-nav-btn" data-hist-next ${historyState.pageOffset === 0 ? 'disabled style="opacity:0.4;"' : ''}>Later →</button>`;
        contentEl.innerHTML = buildBarChart(items) + '<p style="font-size:0.8rem; color:#666; margin:8px 0 0;">Tik op een week om de dagen te zien.</p>';
        return;
    }

    if (historyState.view === 'days') {
        const ws = parseLocalDate(historyState.weekStart);
        const data = await fetchHistoryRange(historyState.weekStart, formatDateLocal(addDays(ws, 6)));
        const items = [];
        for (let d = 0; d < 7; d++) {
            const dayObj = addDays(ws, d);
            const dateStr = formatDateLocal(dayObj);
            const s = summarizeDay(data.meals, dateStr);
            items.push({
                label: DAY_NAMES_SHORT[dayObj.getDay()],
                sublabel: shortDateLabel(dayObj),
                value: s[historyState.metric],
                extra: s.count ? (historyState.metric === 'kcal' ? `${s.carbs}g KH` : `${s.kcal} kcal`) : '–',
                action: `data-hist-day="${dateStr}"`,
                highlight: dateStr === todayStr
            });
        }
        navEl.innerHTML = `
            <button type="button" class="btn btn-auto hist-nav-btn" data-hist-back-weeks>← Weken</button>
            <span style="font-weight:700; font-size:0.85rem; text-align:center;">Week ${getISOWeekNumber(ws)}<br><span style="font-weight:500;">${shortDateLabel(ws)} – ${shortDateLabel(addDays(ws, 6))}</span></span>
            <span style="width:70px;"></span>`;
        contentEl.innerHTML = buildBarChart(items) + '<p style="font-size:0.8rem; color:#666; margin:8px 0 0;">Tik op een dag voor de details.</p>';
        return;
    }

    // Dagdetails
    const dayObj = parseLocalDate(historyState.day);
    const data = await fetchHistoryRange(historyState.day, historyState.day);
    const s = summarizeDay(data.meals, historyState.day);
    const water = data.water[historyState.day] || 0;
    const goals = appState.goals;
    navEl.innerHTML = `
        <button type="button" class="btn btn-auto hist-nav-btn" data-hist-back-days>← Week</button>
        <span style="font-weight:700; font-size:0.85rem; text-align:center;">${DAY_NAMES_SHORT[dayObj.getDay()]} ${shortDateLabel(dayObj)}</span>
        <span style="width:70px;"></span>`;
    const mealsHtml = s.meals.length
        ? s.meals.map(m => `
            <div class="hist-meal">
                <div style="font-weight:700;">${escapeHtml(m.type || '')} ${escapeHtml(m.name || '')}</div>
                <div style="font-size:0.8rem; color:#555;">${Number(m.carbs) || 0}g KH · ${Number(m.fat) || 0}g Vet · ${Number(m.protein) || 0}g Eiwit · ${mealKcal(m)} kcal</div>
            </div>`).join('')
        : '<p style="color:#666;">Geen maaltijden gelogd op deze dag.</p>';
    contentEl.innerHTML = `
        <div class="hist-summary">
            <div><strong>${s.kcal}</strong><br><span>kcal / ${goals.kcal}</span></div>
            <div><strong>${s.carbs}g</strong><br><span>KH / ${goals.carbs}</span></div>
            <div><strong>${s.fat}g</strong><br><span>Vet / ${goals.fat}</span></div>
            <div><strong>${s.protein}g</strong><br><span>Eiwit / ${goals.protein}</span></div>
        </div>
        <p style="margin:8px 0;">💧 <strong>${water}</strong> / 8 glazen water</p>
        ${mealsHtml}`;
}

document.addEventListener('click', (e) => {
    const mt = e.target.closest('[data-hist-metric]');
    if (mt && document.getElementById('history-widget') && document.getElementById('history-widget').contains(mt)) {
        historyState.metric = mt.getAttribute('data-hist-metric');
        renderHistory();
        return;
    }
    const t = e.target.closest('[data-hist-week], [data-hist-day], [data-hist-prev], [data-hist-next], [data-hist-back-weeks], [data-hist-back-days]');
    if (!t || !document.getElementById('history-widget') || !document.getElementById('history-widget').contains(t)) return;
    if (t.hasAttribute('data-hist-week')) {
        historyState.view = 'days';
        historyState.weekStart = t.getAttribute('data-hist-week');
    } else if (t.hasAttribute('data-hist-day')) {
        historyState.view = 'day';
        historyState.day = t.getAttribute('data-hist-day');
    } else if (t.hasAttribute('data-hist-prev')) {
        historyState.pageOffset += 1;
    } else if (t.hasAttribute('data-hist-next')) {
        if (historyState.pageOffset > 0) historyState.pageOffset -= 1;
    } else if (t.hasAttribute('data-hist-back-weeks')) {
        historyState.view = 'weeks';
    } else if (t.hasAttribute('data-hist-back-days')) {
        historyState.view = 'days';
    }
    renderHistory();
});
