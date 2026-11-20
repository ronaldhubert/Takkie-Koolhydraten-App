// Logboek met grafieken: weken, dagen, dagdetails en PDF-export.
// Klassiek script (geen module): deelt globale functies en variabelen met de andere bestanden in js/.
// Zie ARCHITECTURE.md voor de laadvolgorde.

// ==========================================
// LOGBOEK: WEKEN > DAGEN > DAGDETAILS + PDF
// ==========================================
const historyState = { view: 'weeks', pageOffset: 0, weekStart: null, day: null, metric: 'carbs' };
const HISTORY_METRICS = {
    carbs: { label: 'Koolhydraten', short: 'KH', unit: 'g', icon: '🥑' },
    protein: { label: 'Eiwit', short: 'Eiwit', unit: 'g', icon: '🥩' },
    fat: { label: 'Vet', short: 'Vet', unit: 'g', icon: '🧈' },
    kcal: { label: 'Calorieën', short: 'kcal', unit: ' kcal', icon: '⚡' }
};
function metricGoal() {
    return appState.goals[historyState.metric] || 1;
}
function renderMetricPicker() {
    const el = document.getElementById('history-metric');
    if (!el) return;
    el.innerHTML = Object.keys(HISTORY_METRICS).map(k => {
        const active = historyState.metric === k;
        const m = HISTORY_METRICS[k];
        return `<button type="button" class="hist-metric-btn${active ? ' active' : ''}" data-hist-metric="${k}">${m.icon} ${m.label}</button>`;
    }).join('');
}
const HISTORY_WEEKS_PER_PAGE = 3;
const DAY_NAMES_SHORT = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
const DAY_NAMES_FULL = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
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
    const metricKey = historyState.metric;
    const metricInfo = HISTORY_METRICS[metricKey];
    const goal = metricGoal();
    const unit = metricInfo.unit;
    const max = Math.max(goal * 1.15, ...items.map(i => i.value), 1);
    const goalPct = Math.min(100, (goal / max) * 100);
    const bars = items.map(i => {
        const h = Math.max(i.value > 0 ? 6 : 0, (i.value / max) * 100);
        const isOver = (metricKey === 'carbs' || metricKey === 'kcal') && i.value > goal;
        const overClass = isOver ? ' hist-bar-over' : '';
        return `
            <button type="button" class="hist-col" ${i.action}>
                <div class="hist-value">${i.value > 0 ? i.value : '–'}</div>
                <div class="hist-bar-area"><div class="hist-goal-tick" style="bottom: ${goalPct}%;"></div>
                    <div class="hist-bar hist-bar-${metricKey}${overClass}${i.highlight ? ' hist-bar-today' : ''}" style="height: ${h}%;"></div>
                </div>
                <div class="hist-label">${i.label}</div>
                <div class="hist-sublabel">${i.sublabel}</div>
                <div class="hist-extra">${i.extra}</div>
            </button>`;
    }).join('');
    return `
        <div class="hist-chart">
            <div class="hist-cols">${bars}</div>
            <div class="hist-chart-legend">
                <span>${metricInfo.icon} <strong>${metricInfo.label}</strong> (${unit.trim()})</span>
                <span class="hist-goal-pill">🎯 Dagdoel: ${goal}${unit}</span>
            </div>
        </div>`;
}

async function renderHistory() {
    const navEl = document.getElementById('history-nav');
    const contentEl = document.getElementById('history-content');
    if (!navEl || !contentEl || !currentUser) return;
    renderMetricPicker();

    contentEl.innerHTML = '<p style="color:#666;">Even snuffelen in je logboek... 🐾</p>';
    const thisMonday = getMondayOf(new Date());
    const todayStr = getTodayString();

    if (historyState.view === 'weeks') {
        const newestStart = addDays(thisMonday, -7 * historyState.pageOffset * HISTORY_WEEKS_PER_PAGE);
        const weekStarts = [];
        for (let i = HISTORY_WEEKS_PER_PAGE - 1; i >= 0; i--) weekStarts.push(addDays(newestStart, -7 * i));
        const rangeStart = formatDateLocal(weekStarts[0]);
        const rangeEnd = formatDateLocal(addDays(weekStarts[weekStarts.length - 1], 6));
        const data = await fetchHistoryRange(rangeStart, rangeEnd);

        const weekSummaries = weekStarts.map(ws => {
            const wsStr = formatDateLocal(ws);
            const days = [];
            let totalWater = 0;
            for (let d = 0; d < 7; d++) {
                const ds = formatDateLocal(addDays(ws, d));
                days.push(summarizeDay(data.meals, ds));
                totalWater += (data.water[ds] || 0);
            }
            const logged = days.filter(d => d.count > 0);
            const avgKcal = logged.length ? Math.round(logged.reduce((s, d) => s + d.kcal, 0) / logged.length) : 0;
            const avgCarbs = logged.length ? Math.round(logged.reduce((s, d) => s + d.carbs, 0) / logged.length) : 0;
            const avgFat = logged.length ? Math.round(logged.reduce((s, d) => s + d.fat, 0) / logged.length) : 0;
            const avgProt = logged.length ? Math.round(logged.reduce((s, d) => s + d.protein, 0) / logged.length) : 0;
            const m = historyState.metric;
            const avgMetric = logged.length ? Math.round(logged.reduce((s, d) => s + d[m], 0) / logged.length) : 0;
            const isThis = wsStr === formatDateLocal(thisMonday);
            return {
                ws,
                wsStr,
                weekNum: getISOWeekNumber(ws),
                rangeLabel: `${shortDateLabel(ws)} – ${shortDateLabel(addDays(ws, 6))}`,
                loggedDays: logged.length,
                avgKcal,
                avgCarbs,
                avgFat,
                avgProt,
                avgMetric,
                totalWater,
                isThis
            };
        });

        const chartItems = weekSummaries.map(w => ({
            label: `Week ${w.weekNum}`,
            sublabel: w.rangeLabel,
            value: w.avgMetric,
            extra: w.loggedDays ? `${w.loggedDays}/7 dgn` : 'leeg',
            action: `data-hist-week="${w.wsStr}"`,
            highlight: w.isThis
        }));

        const weekCardsHtml = [...weekSummaries].reverse().map(w => `
            <button type="button" class="hist-card${w.isThis ? ' hist-card-highlight' : ''}${w.loggedDays === 0 ? ' hist-card-empty' : ''}" data-hist-week="${w.wsStr}">
                <div class="hist-card-header">
                    <span class="hist-card-title">📅 Week ${w.weekNum} <span style="font-weight:500; font-size:0.8rem; color:#555;">(${w.rangeLabel})</span></span>
                    <span class="hist-card-meta">${w.loggedDays}/7 dgn 👉</span>
                </div>
                ${w.loggedDays > 0 ? `
                    <div class="hist-badge-row">
                        <span class="hist-macro-pill hist-pill-carb">Gem. ${w.avgCarbs}g KH</span>
                        <span class="hist-macro-pill hist-pill-fat">${w.avgFat}g Vet</span>
                        <span class="hist-macro-pill hist-pill-prot">${w.avgProt}g Eiwit</span>
                        <span class="hist-macro-pill hist-pill-kcal">${w.avgKcal} kcal</span>
                        <span class="hist-macro-pill hist-pill-water">💧 ${w.totalWater} glazen</span>
                    </div>
                ` : `<div style="font-size:0.78rem; color:#666;">Nog geen maaltijden gelogd in deze week.</div>`}
            </button>
        `).join('');

        navEl.innerHTML = `
            <button type="button" class="btn btn-auto hist-nav-btn" data-hist-prev>← Eerder</button>
            <span style="font-weight:700; font-size:0.85rem; text-align:center;">Gemiddeld per dag (3 weken)</span>
            <button type="button" class="btn btn-auto hist-nav-btn" data-hist-next ${historyState.pageOffset === 0 ? 'disabled style="opacity:0.4;"' : ''}>Later →</button>`;
        contentEl.innerHTML = `
            ${buildBarChart(chartItems)}
            <div style="font-weight:700; font-size:0.84rem; margin-bottom:6px;">🐾 Overzicht per week (tik voor alle dagen):</div>
            <div class="hist-cards-list">${weekCardsHtml}</div>`;
        return;
    }

    if (historyState.view === 'days') {
        const ws = parseLocalDate(historyState.weekStart);
        const data = await fetchHistoryRange(historyState.weekStart, formatDateLocal(addDays(ws, 6)));
        const chartItems = [];
        const dayRows = [];
        for (let d = 0; d < 7; d++) {
            const dayObj = addDays(ws, d);
            const dateStr = formatDateLocal(dayObj);
            const s = summarizeDay(data.meals, dateStr);
            const water = data.water[dateStr] || 0;
            const isToday = dateStr === todayStr;
            chartItems.push({
                label: DAY_NAMES_SHORT[dayObj.getDay()],
                sublabel: shortDateLabel(dayObj),
                value: s[historyState.metric],
                extra: s.count ? `${s.count}x` : '–',
                action: `data-hist-day="${dateStr}"`,
                highlight: isToday
            });
            dayRows.push({ dayObj, dateStr, s, water, isToday });
        }

        const dayCardsHtml = dayRows.map(({ dayObj, dateStr, s, water, isToday }) => `
            <button type="button" class="hist-card${isToday ? ' hist-card-highlight' : ''}${s.count === 0 && water === 0 ? ' hist-card-empty' : ''}" data-hist-day="${dateStr}">
                <div class="hist-card-header">
                    <span class="hist-card-title">${DAY_NAMES_FULL[dayObj.getDay()]} ${shortDateLabel(dayObj)}${isToday ? ' <span style="color:var(--takkie-red);">(Vandaag)</span>' : ''}</span>
                    <span class="hist-card-meta">${s.count} hapje(s) 👉</span>
                </div>
                ${s.count > 0 || water > 0 ? `
                    <div class="hist-badge-row">
                        <span class="hist-macro-pill hist-pill-carb">${s.carbs}g KH</span>
                        <span class="hist-macro-pill hist-pill-fat">${s.fat}g Vet</span>
                        <span class="hist-macro-pill hist-pill-prot">${s.protein}g Eiwit</span>
                        <span class="hist-macro-pill hist-pill-kcal">${s.kcal} kcal</span>
                        <span class="hist-macro-pill hist-pill-water">💧 ${water}/8</span>
                    </div>
                ` : `<div style="font-size:0.78rem; color:#666;">Geen hapjes of water gelogd.</div>`}
            </button>
        `).join('');

        navEl.innerHTML = `
            <button type="button" class="btn btn-auto hist-nav-btn" data-hist-back-weeks>← Weken</button>
            <span style="font-weight:700; font-size:0.85rem; text-align:center;">Week ${getISOWeekNumber(ws)}<br><span style="font-weight:500;">${shortDateLabel(ws)} – ${shortDateLabel(addDays(ws, 6))}</span></span>
            <span style="width:70px;"></span>`;
        contentEl.innerHTML = `
            ${buildBarChart(chartItems)}
            <div style="font-weight:700; font-size:0.84rem; margin-bottom:6px;">🐾 Dagen in Week ${getISOWeekNumber(ws)} (tik voor alle maaltijden):</div>
            <div class="hist-cards-list">${dayCardsHtml}</div>`;
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
        <span style="font-weight:700; font-size:0.9rem; text-align:center;">${DAY_NAMES_FULL[dayObj.getDay()]} ${shortDateLabel(dayObj)}</span>
        <span style="width:70px;"></span>`;

    const makeTile = (title, val, goal, unit, color) => {
        const pct = Math.min(100, Math.round((val / Math.max(1, goal)) * 100));
        return `
            <div class="hist-summary-tile">
                <div class="hist-summary-top">
                    <span>${title}</span>
                    <span style="color:${color};">${val}${unit} <span style="color:#666; font-weight:500;">/ ${goal}${unit}</span></span>
                </div>
                <div class="hist-summary-bar">
                    <div class="hist-summary-fill" style="width:${pct}%; background:${color};"></div>
                </div>
            </div>`;
    };

    let waterDots = '';
    for (let i = 1; i <= 8; i++) {
        waterDots += `<span style="opacity:${i <= water ? '1' : '0.25'};">💧</span>`;
    }

    const mealsHtml = s.meals.length
        ? s.meals.map(m => `
            <div class="hist-meal">
                <div class="hist-meal-top">
                    <span>${escapeHtml(m.type || '🍽️')} — ${escapeHtml(m.name || '')}</span>
                </div>
                <div class="hist-badge-row">
                    <span class="hist-macro-pill hist-pill-carb">${Number(m.carbs) || 0}g KH</span>
                    <span class="hist-macro-pill hist-pill-fat">${Number(m.fat) || 0}g Vet</span>
                    <span class="hist-macro-pill hist-pill-prot">${Number(m.protein) || 0}g Eiwit</span>
                    <span class="hist-macro-pill hist-pill-kcal">${mealKcal(m)} kcal</span>
                </div>
            </div>`).join('')
        : '<p style="color:#666; text-align:center;">Geen maaltijden of drankjes gelogd op deze dag.</p>';

    contentEl.innerHTML = `
        <div class="hist-summary">
            ${makeTile('🥑 Koolhydraten', s.carbs, goals.carbs, 'g', 'var(--takkie-red)')}
            ${makeTile('🧈 Vetten', s.fat, goals.fat, 'g', '#B2530C')}
            ${makeTile('🥩 Eiwitten', s.protein, goals.protein, 'g', '#1b4332')}
            ${makeTile('⚡ Calorieën', s.kcal, goals.kcal, '', '#5a189a')}
        </div>
        <div class="hist-water-box">
            <span>Takkie & Siep's Drinkbak: <strong>${water} / 8 glazen</strong></span>
            <span>${waterDots}</span>
        </div>
        <div style="font-weight:700; font-size:0.85rem; margin-bottom:6px;">🍽️ Gelogde hapjes & drankjes (${s.meals.length}):</div>
        ${mealsHtml}`;
}

async function exportHistoryToPdf() {
    if (!currentUser) return;
    const btn = document.getElementById('btn-export-history-pdf');
    const origText = btn ? btn.innerText : '📄 Exporteer PDF';
    if (btn) {
        btn.disabled = true;
        btn.innerText = '🐾 PDF maken...';
    }

    try {
        const thisMonday = getMondayOf(new Date());
        let startStr, endStr, periodTitle, fileSlug;
        let weekStarts = [];

        if (historyState.view === 'day' && historyState.day) {
            const dObj = parseLocalDate(historyState.day);
            const ws = getMondayOf(dObj);
            const we = addDays(ws, 6);
            weekStarts = [ws];
            startStr = formatDateLocal(ws);
            endStr = formatDateLocal(we);
            periodTitle = `Week ${getISOWeekNumber(ws)} & ${DAY_NAMES_FULL[dObj.getDay()]} ${shortDateLabel(dObj)} ${dObj.getFullYear()}`;
            fileSlug = historyState.day;
        } else if (historyState.view === 'days' && historyState.weekStart) {
            const ws = parseLocalDate(historyState.weekStart);
            const we = addDays(ws, 6);
            weekStarts = [ws];
            startStr = formatDateLocal(ws);
            endStr = formatDateLocal(we);
            periodTitle = `Week ${getISOWeekNumber(ws)} (${shortDateLabel(ws)} – ${shortDateLabel(we)} ${we.getFullYear()})`;
            fileSlug = `week-${getISOWeekNumber(ws)}-${startStr}`;
        } else {
            const newestStart = addDays(thisMonday, -7 * historyState.pageOffset * HISTORY_WEEKS_PER_PAGE);
            for (let i = 0; i < HISTORY_WEEKS_PER_PAGE; i++) {
                weekStarts.push(addDays(newestStart, -7 * i));
            }
            const oldestStart = weekStarts[weekStarts.length - 1];
            const newestEnd = addDays(newestStart, 6);
            startStr = formatDateLocal(oldestStart);
            endStr = formatDateLocal(newestEnd);
            periodTitle = `Week ${getISOWeekNumber(oldestStart)} t/m Week ${getISOWeekNumber(newestStart)} (${shortDateLabel(oldestStart)} – ${shortDateLabel(newestEnd)} ${newestEnd.getFullYear()})`;
            fileSlug = `${startStr}-tm-${endStr}`;
        }

        const data = await fetchHistoryRange(startStr, endStr);
        const userName = appState.displayName || getDefaultDisplayName();
        const goals = appState.goals;

        // Hulpfuncties om te bepalen of een doel is gehaald
        const checkGoal = (key, val) => {
            if (key === 'carbs') return val <= goals.carbs;
            if (key === 'fat') return val <= goals.fat;
            if (key === 'protein') return val >= goals.protein;
            if (key === 'kcal') return val <= goals.kcal;
            if (key === 'water') return val >= 8;
            return false;
        };

        const goalCell = (ok, label, hasData) => {
            if (!hasData) {
                return `<td style="padding:5px 6px; border:1px solid #1A1A1A; text-align:center; background:#F5F5F5; color:#888;">–</td>`;
            }
            const bg = ok ? '#D8F3DC' : '#FFE5E5';
            const fg = ok ? '#1B4332' : '#B71C1C';
            const icon = ok ? '✅' : '❌';
            return `<td style="padding:5px 6px; border:1px solid #1A1A1A; text-align:center; background:${bg}; color:${fg}; font-weight:700;">${icon} ${label}</td>`;
        };

        const goalSummaryTile = (title, ruleText, avgText, ok, daysHit, daysTotal, hasData) => {
            const bg = !hasData ? '#F5F5F5' : (ok ? '#D8F3DC' : '#FFE5E5');
            const fg = !hasData ? '#666' : (ok ? '#1B4332' : '#B71C1C');
            const statusText = !hasData ? 'Nog niet gelogd' : (ok ? '✅ DOEL GEHAALD' : '❌ NIET GEHAALD');
            return `
                <div style="background:${bg}; color:${fg}; border:2.5px solid #1A1A1A; border-radius:12px; padding:8px 6px; text-align:center;">
                    <div style="font-size:11px; font-weight:700; color:#1A1A1A;">${title}</div>
                    <div style="font-size:10px; color:#555; margin-bottom:3px;">Doel: ${ruleText}</div>
                    <div style="font-size:14px; font-weight:700;">${avgText}</div>
                    <div style="font-size:10px; font-weight:700; margin-top:2px;">${statusText}</div>
                    <div style="font-size:10px; color:#333; margin-top:1px;">${daysHit}/${daysTotal} dgn gehaald</div>
                </div>`;
        };

        // 1. Bouw het Weekoverzicht (bovenaan de PDF) waarin per doel direct zichtbaar is wat wel/niet is gehaald
        const weeksOverviewHtml = weekStarts.map(ws => {
            const we = addDays(ws, 6);
            const weekDays = [];
            for (let d = 0; d < 7; d++) {
                const dObj = addDays(ws, d);
                const ds = formatDateLocal(dObj);
                const s = summarizeDay(data.meals, ds);
                const water = data.water[ds] || 0;
                weekDays.push({ dObj, ds, s, water });
            }

            const mealDays = weekDays.filter(x => x.s.count > 0);
            const nMeals = mealDays.length;
            const hasMeals = nMeals > 0;
            const avgC = hasMeals ? Math.round(mealDays.reduce((a, b) => a + b.s.carbs, 0) / nMeals) : 0;
            const avgP = hasMeals ? Math.round(mealDays.reduce((a, b) => a + b.s.protein, 0) / nMeals) : 0;
            const avgF = hasMeals ? Math.round(mealDays.reduce((a, b) => a + b.s.fat, 0) / nMeals) : 0;
            const avgK = hasMeals ? Math.round(mealDays.reduce((a, b) => a + b.s.kcal, 0) / nMeals) : 0;

            const waterLoggedDays = weekDays.filter(x => x.s.count > 0 || x.water > 0);
            const nWater = waterLoggedDays.length;
            const avgW = nWater ? Math.round((waterLoggedDays.reduce((a, b) => a + b.water, 0) / nWater) * 10) / 10 : 0;

            const hitsC = mealDays.filter(x => checkGoal('carbs', x.s.carbs)).length;
            const hitsP = mealDays.filter(x => checkGoal('protein', x.s.protein)).length;
            const hitsF = mealDays.filter(x => checkGoal('fat', x.s.fat)).length;
            const hitsK = mealDays.filter(x => checkGoal('kcal', x.s.kcal)).length;
            const hitsW = waterLoggedDays.filter(x => checkGoal('water', x.water)).length;

            const dayRowsHtml = weekDays.map(({ dObj, ds, s, water }) => {
                const hasDayMeals = s.count > 0;
                const hasDayWater = s.count > 0 || water > 0;
                const okC = hasDayMeals && checkGoal('carbs', s.carbs);
                const okP = hasDayMeals && checkGoal('protein', s.protein);
                const okF = hasDayMeals && checkGoal('fat', s.fat);
                const okK = hasDayMeals && checkGoal('kcal', s.kcal);
                const okW = hasDayWater && checkGoal('water', water);
                const goalsMetCount = (okC ? 1 : 0) + (okP ? 1 : 0) + (okF ? 1 : 0) + (okK ? 1 : 0) + (okW ? 1 : 0);
                const isSelectedDay = historyState.view === 'day' && historyState.day === ds;

                return `
                    <tr style="${isSelectedDay ? 'outline:2px solid #E63946;' : ''}">
                        <td style="padding:5px 8px; border:1px solid #1A1A1A; font-weight:700; background:#FFFDF9;">
                            ${DAY_NAMES_SHORT[dObj.getDay()].toUpperCase()} ${shortDateLabel(dObj)}
                        </td>
                        ${goalCell(okC, `${s.carbs}g`, hasDayMeals)}
                        ${goalCell(okP, `${s.protein}g`, hasDayMeals)}
                        ${goalCell(okF, `${s.fat}g`, hasDayMeals)}
                        ${goalCell(okK, `${s.kcal}`, hasDayMeals)}
                        ${goalCell(okW, `${water}/8`, hasDayWater)}
                        <td style="padding:5px 6px; border:1px solid #1A1A1A; text-align:center; font-weight:700; background:${!hasDayWater ? '#F5F5F5' : (goalsMetCount >= 4 ? '#D8F3DC' : '#FFF9E6')};">
                            ${hasDayWater ? `${goalsMetCount}/5 ${goalsMetCount === 5 ? '⭐' : ''}` : '–'}
                        </td>
                    </tr>`;
            }).join('');

            return `
                <div style="background:#FFFFFF; border:3px solid #1A1A1A; border-radius:18px; padding:12px 14px; margin-bottom:14px; page-break-inside:avoid;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
                        <div style="font-size:16px; font-weight:700;">📊 Weekoverzicht — Week ${getISOWeekNumber(ws)} (${shortDateLabel(ws)} – ${shortDateLabel(we)})</div>
                        <div style="font-size:11px; font-weight:700; background:#FFF9E6; border:2px solid #1A1A1A; border-radius:999px; padding:2px 10px;">
                            ✅ Groen = doel gehaald • ❌ Rood = doel niet gehaald
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns:repeat(5, 1fr); gap:6px; margin-bottom:10px;">
                        ${goalSummaryTile('🥑 Koolhydraten', `max ${goals.carbs}g`, `Gem. ${avgC}g`, checkGoal('carbs', avgC), hitsC, nMeals || 7, hasMeals)}
                        ${goalSummaryTile('🥩 Eiwitten', `min ${goals.protein}g`, `Gem. ${avgP}g`, checkGoal('protein', avgP), hitsP, nMeals || 7, hasMeals)}
                        ${goalSummaryTile('🧈 Vetten', `max ${goals.fat}g`, `Gem. ${avgF}g`, checkGoal('fat', avgF), hitsF, nMeals || 7, hasMeals)}
                        ${goalSummaryTile('⚡ Calorieën', `max ${goals.kcal}`, `Gem. ${avgK}`, checkGoal('kcal', avgK), hitsK, nMeals || 7, hasMeals)}
                        ${goalSummaryTile('💧 Drinkbak', 'min 8 glazen', `Gem. ${avgW}/8`, checkGoal('water', avgW), hitsW, nWater || 7, nWater > 0)}
                    </div>

                    <table style="width:100%; border-collapse:collapse; font-size:11.5px;">
                        <thead>
                            <tr style="background:#FFD166;">
                                <th style="padding:5px 8px; border:1px solid #1A1A1A; text-align:left;">Dag</th>
                                <th style="padding:5px 6px; border:1px solid #1A1A1A; text-align:center;">🥑 KH (≤${goals.carbs}g)</th>
                                <th style="padding:5px 6px; border:1px solid #1A1A1A; text-align:center;">🥩 Eiwit (≥${goals.protein}g)</th>
                                <th style="padding:5px 6px; border:1px solid #1A1A1A; text-align:center;">🧈 Vet (≤${goals.fat}g)</th>
                                <th style="padding:5px 6px; border:1px solid #1A1A1A; text-align:center;">⚡ Kcal (≤${goals.kcal})</th>
                                <th style="padding:5px 6px; border:1px solid #1A1A1A; text-align:center;">💧 Water (8)</th>
                                <th style="padding:5px 6px; border:1px solid #1A1A1A; text-align:center;">Doelen</th>
                            </tr>
                        </thead>
                        <tbody>${dayRowsHtml}</tbody>
                    </table>
                </div>`;
        }).join('');

        const reportHtml = `
            <div style="font-family:'Fredoka', Arial, sans-serif; color:#1A1A1A; background:#FFFDF9; padding:18px; box-sizing:border-box;">
                <div style="background:#F1FAEE; border:4px solid #1A1A1A; border-radius:20px; padding:16px 18px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; gap:14px;">
                    <div>
                        <div style="color:#E63946; font-size:22px; font-weight:700; margin-bottom:2px;">🐾 Takkie & Siep's Keto Logboek</div>
                        <div style="font-size:14px; font-weight:700;">Maatje: ${escapeHtml(userName)} • Periode: ${escapeHtml(periodTitle)}</div>
                        <div style="font-size:12px; color:#555; margin-top:4px;">Jouw dagdoelen: max ${goals.carbs}g KH • min ${goals.protein}g Eiwit • max ${goals.fat}g Vet • max ${goals.kcal} kcal • 8 glazen water</div>
                    </div>
                    <img src="takkie.png" alt="Takkie" style="height:54px; width:auto;">
                </div>

                ${weeksOverviewHtml}

                <div style="text-align:center; font-size:11px; color:#666; margin-top:10px;">
                    🐾 Met liefde gemaakt in Takkie & Siep's Keto Tracker — "Elke kleine stap telt!"
                </div>
            </div>`;

        if (typeof window.html2pdf === 'function') {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = reportHtml;
            document.body.appendChild(wrapper);
            try {
                await window.html2pdf()
                    .set({
                        margin: [8, 8, 8, 8],
                        filename: `Takkie-Siep-Logboek-${fileSlug}.pdf`,
                        image: { type: 'jpeg', quality: 0.96 },
                        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#FFFDF9' },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    })
                    .from(wrapper.firstElementChild)
                    .save();
            } finally {
                wrapper.remove();
            }
        } else {
            const printWin = window.open('', '_blank');
            if (printWin) {
                printWin.document.write(`<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><title>Takkie & Siep Logboek</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&display=swap"></head><body style="margin:0; background:#FFFDF9;">${reportHtml}<script>window.onload=()=>{setTimeout(()=>window.print(),300);};<\/script></body></html>`);
                printWin.document.close();
            } else {
                showInlineMessage('btn-export-history-pdf', 'PDF-bibliotheek kon nog niet laden. Vernieuw de pagina en probeer het opnieuw.');
            }
        }
    } catch (e) {
        showInlineMessage('btn-export-history-pdf', 'Exporteren naar PDF mislukte: ' + (e.message || e));
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = origText;
        }
    }
}

document.addEventListener('click', (e) => {
    const pdfBtn = e.target.closest('#btn-export-history-pdf');
    if (pdfBtn) {
        exportHistoryToPdf();
        return;
    }
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
