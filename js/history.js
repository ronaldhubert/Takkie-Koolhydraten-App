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
const HISTORY_WEEKS_PER_PAGE = 4;
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

function buildCarbLineChartLast10Days(meals, isForPdf = false) {
    const carbGoal = Number(appState.goals?.carbs) || 25;
    const todayObj = new Date();
    const days = [];
    for (let i = 9; i >= 0; i--) {
        const dObj = addDays(todayObj, -i);
        const ds = formatDateLocal(dObj);
        const s = summarizeDay(meals || [], ds);
        days.push({
            dObj,
            ds,
            dayName: DAY_NAMES_SHORT[dObj.getDay()],
            shortDate: `${dObj.getDate()}/${dObj.getMonth() + 1}`,
            carbs: s.carbs,
            hasData: s.count > 0,
            isToday: i === 0
        });
    }

    const maxVal = Math.max(carbGoal * 1.25, ...days.map(d => d.carbs), 10);
    const svgW = 520;
    const svgH = isForPdf ? 130 : 165;
    const padL = 36;
    const padR = 18;
    const padT = isForPdf ? 20 : 26;
    const padB = isForPdf ? 30 : 36;
    const plotW = svgW - padL - padR;
    const plotH = svgH - padT - padB;

    const getX = (idx) => padL + (idx / (days.length - 1)) * plotW;
    const getY = (val) => padT + plotH - Math.min(1, Math.max(0, val / maxVal)) * plotH;

    const goalY = Math.round(getY(carbGoal) * 10) / 10;
    const baseY = padT + plotH;

    const coords = days.map((d, idx) => ({
        ...d,
        x: Math.round(getX(idx) * 10) / 10,
        y: Math.round(getY(d.carbs) * 10) / 10
    }));

    const cardStyle = isForPdf
        ? 'background:#FFFFFF; border:3px solid #1A1A1A; border-radius:14px; padding:7px 12px; margin-bottom:7px; page-break-inside:avoid; break-inside:avoid; box-sizing:border-box;'
        : 'background:#FFFDF9; border:3px solid var(--border-color); border-radius:16px; padding:10px 12px; box-shadow:3px 3px 0px var(--border-color); margin-bottom:12px;';

    // Voor PDF: teken op een 2x canvas en zet om naar PNG data-URL zodat html2canvas/html2pdf alle lijnen, punten en waarden 100% betrouwbaar rendert
    if (isForPdf && typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        const scale = 2;
        canvas.width = svgW * scale;
        canvas.height = svgH * scale;
        const ctx = canvas.getContext && canvas.getContext('2d');
        if (ctx) {
            ctx.scale(scale, scale);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, svgW, svgH);

            // Vlakvulling onder de lijn
            ctx.beginPath();
            ctx.moveTo(coords[0].x, baseY);
            coords.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.lineTo(coords[coords.length - 1].x, baseY);
            ctx.closePath();
            ctx.fillStyle = 'rgba(6, 214, 160, 0.14)';
            ctx.fill();

            // Verticale hulplijnen per dag
            ctx.strokeStyle = '#EFEFEF';
            ctx.lineWidth = 1;
            coords.forEach(p => {
                ctx.beginPath();
                ctx.moveTo(p.x, padT);
                ctx.lineTo(p.x, baseY);
                ctx.stroke();
            });

            // X-as basislijn
            ctx.strokeStyle = '#1A1A1A';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(padL, baseY);
            ctx.lineTo(svgW - padR, baseY);
            ctx.stroke();

            // Rode gestippelde doellijn
            ctx.save();
            ctx.strokeStyle = '#E63946';
            ctx.lineWidth = 1.8;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(padL, goalY);
            ctx.lineTo(svgW - padR, goalY);
            ctx.stroke();
            ctx.restore();

            // Y-as labels (doel & 0g)
            ctx.textAlign = 'right';
            ctx.font = 'bold 10px Fredoka, Arial, sans-serif';
            ctx.fillStyle = '#E63946';
            ctx.fillText(`${carbGoal}g`, padL - 5, goalY + 3);
            ctx.font = '600 10px Fredoka, Arial, sans-serif';
            ctx.fillStyle = '#666666';
            ctx.fillText('0g', padL - 5, baseY + 3);

            // Verbindingslijn tussen de 10 dagen
            ctx.strokeStyle = '#1A1A1A';
            ctx.lineWidth = 2.8;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            coords.forEach((p, idx) => {
                if (idx === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.stroke();

            // Punten, waarden en daglabels
            ctx.textAlign = 'center';
            coords.forEach(p => {
                const ok = p.carbs <= carbGoal;
                const dotFill = !p.hasData ? '#E0E0E0' : (ok ? '#06D6A0' : '#E63946');
                const valColor = !p.hasData ? '#888888' : (ok ? '#1B4332' : '#B71C1C');
                const valText = p.hasData ? `${p.carbs}g` : '–';
                const valY = Math.max(13, p.y - 9);

                // Bolletje
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.isToday ? 6 : 5, 0, Math.PI * 2);
                ctx.fillStyle = dotFill;
                ctx.fill();
                ctx.lineWidth = 2.2;
                ctx.strokeStyle = '#1A1A1A';
                ctx.stroke();

                // Waarde boven bolletje
                ctx.font = 'bold 11px Fredoka, Arial, sans-serif';
                ctx.fillStyle = valColor;
                ctx.fillText(valText, p.x, valY);

                // Dagnaam & datum onder de as
                ctx.font = `${p.isToday ? 'bold' : '600'} 11px Fredoka, Arial, sans-serif`;
                ctx.fillStyle = p.isToday ? '#E63946' : '#1A1A1A';
                ctx.fillText(p.dayName, p.x, baseY + 14);

                ctx.font = '600 9.5px Fredoka, Arial, sans-serif';
                ctx.fillStyle = '#666666';
                ctx.fillText(p.shortDate, p.x, baseY + 27);
            });

            const dataUrl = canvas.toDataURL('image/png');
            return `
                <div style="${cardStyle}">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:4px;">
                        <div style="font-size:13px; font-weight:700;">📈 Koolhydraten per dag (laatste 10 dagen)</div>
                        <span style="background:#FFEEEE; color:#E63946; border:1.5px solid #1A1A1A; border-radius:999px; padding:1px 8px; font-weight:700; font-size:10px;">🎯 Dagdoel: max ${carbGoal}g</span>
                    </div>
                    <img src="${dataUrl}" alt="Koolhydraten laatste 10 dagen" style="display:block; width:100%; height:auto;" />
                </div>`;
        }
    }

    const linePoints = coords.map(p => `${p.x},${p.y}`).join(' ');
    const areaPoints = `${coords[0].x},${baseY} ${linePoints} ${coords[coords.length - 1].x},${baseY}`;

    const dotsAndLabelsSvg = coords.map(p => {
        const ok = p.carbs <= carbGoal;
        const dotFill = !p.hasData ? '#E0E0E0' : (ok ? '#06D6A0' : '#E63946');
        const valColor = !p.hasData ? '#888888' : (ok ? '#1B4332' : '#B71C1C');
        const valText = p.hasData ? `${p.carbs}g` : '–';
        const valY = Math.max(13, p.y - 9);
        const dayWeight = p.isToday ? '700' : '600';
        const dayColor = p.isToday ? '#E63946' : '#1A1A1A';
        return `
            <g>
                <line x1="${p.x}" y1="${padT}" x2="${p.x}" y2="${baseY}" stroke="#EFEFEF" stroke-width="1" />
                <text x="${p.x}" y="${valY}" text-anchor="middle" font-size="11" font-weight="700" fill="${valColor}" font-family="Fredoka, Arial, sans-serif">${valText}</text>
                <circle cx="${p.x}" cy="${p.y}" r="${p.isToday ? 6 : 5}" fill="${dotFill}" stroke="#1A1A1A" stroke-width="2.2" />
                <text x="${p.x}" y="${baseY + 14}" text-anchor="middle" font-size="11" font-weight="${dayWeight}" fill="${dayColor}" font-family="Fredoka, Arial, sans-serif">${p.dayName}</text>
                <text x="${p.x}" y="${baseY + 27}" text-anchor="middle" font-size="9.5" font-weight="600" fill="#666666" font-family="Fredoka, Arial, sans-serif">${p.shortDate}</text>
            </g>`;
    }).join('');

    return `
        <div style="${cardStyle}">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:4px;">
                <div style="font-size:${isForPdf ? '13px' : '0.84rem'}; font-weight:700;">📈 Koolhydraten per dag (laatste 10 dagen)</div>
                <span style="background:#FFEEEE; color:#E63946; border:1.5px solid #1A1A1A; border-radius:999px; padding:1px 8px; font-weight:700; font-size:${isForPdf ? '10px' : '0.7rem'};">🎯 Dagdoel: max ${carbGoal}g</span>
            </div>
            <svg viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}" style="display:block; width:100%; height:auto; overflow:visible;">
                <polygon points="${areaPoints}" fill="rgba(6, 214, 160, 0.14)" />
                <line x1="${padL}" y1="${baseY}" x2="${svgW - padR}" y2="${baseY}" stroke="#1A1A1A" stroke-width="2" />
                <line x1="${padL}" y1="${goalY}" x2="${svgW - padR}" y2="${goalY}" stroke="#E63946" stroke-width="1.8" stroke-dasharray="5,4" />
                <text x="${padL - 5}" y="${goalY + 3}" text-anchor="end" font-size="10" font-weight="700" fill="#E63946" font-family="Fredoka, Arial, sans-serif">${carbGoal}g</text>
                <text x="${padL - 5}" y="${baseY + 3}" text-anchor="end" font-size="10" font-weight="600" fill="#666666" font-family="Fredoka, Arial, sans-serif">0g</text>
                <polyline fill="none" stroke="#1A1A1A" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" points="${linePoints}" />
                ${dotsAndLabelsSvg}
            </svg>
        </div>`;
}

function buildTop5MealsAndDrinksHtml(mealsList, isForPdf = false) {
    const mealCounts = new Map();
    const drinkCounts = new Map();

    (mealsList || []).forEach(m => {
        const isDrink = (m.type || '').includes('Drank');
        const rawName = (m.name || '').trim();
        if (!rawName) return;
        const cleanName = rawName.replace(/^(\d+)\s*x\s+/i, '').trim();
        if (!cleanName) return;
        const key = cleanName.toLowerCase();
        const targetMap = isDrink ? drinkCounts : mealCounts;
        if (!targetMap.has(key)) {
            targetMap.set(key, { name: cleanName, count: 0, carbs: 0, fat: 0, protein: 0 });
        }
        const entry = targetMap.get(key);
        entry.count += 1;
        entry.carbs += Number(m.carbs) || 0;
        entry.fat += Number(m.fat) || 0;
        entry.protein += Number(m.protein) || 0;
    });

    const getTop5ListHtml = (mapObj, emptyText) => {
        const top5 = Array.from(mapObj.values())
            .sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name, 'nl'))
            .slice(0, 5);
        if (top5.length === 0) {
            return `<div style="font-size:${isForPdf ? '11px' : '0.78rem'}; color:#777; font-style:italic;">${emptyText}</div>`;
        }
        return top5.map((item, idx) => {
            const avgC = Math.round(item.carbs / item.count);
            const avgP = Math.round(item.protein / item.count);
            const avgF = Math.round(item.fat / item.count);
            return `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:5px 0; border-bottom:1px dashed #DDD; font-size:${isForPdf ? '11px' : '0.8rem'};">
                    <div style="font-weight:600; color:#1A1A1A; min-width:0; overflow:hidden; text-overflow:ellipsis;">${idx + 1}. ${escapeHtml(item.name)}</div>
                    <div style="white-space:nowrap; font-size:${isForPdf ? '10px' : '0.74rem'}; color:#444; flex-shrink:0;">
                        <span style="font-weight:700; background:#FFF9E6; border:1.5px solid #1A1A1A; border-radius:999px; padding:1px 7px;">${item.count}×</span>
                        <span style="margin-left:4px; color:#666;">(${avgC}g KH • ${avgP}g E • ${avgF}g V)</span>
                    </div>
                </div>`;
        }).join('');
    };

    if (isForPdf) {
        return `
            <div style="display:flex; gap:10px; align-items:stretch; margin-top:2px; padding-bottom:4px; page-break-inside:avoid; break-inside:avoid; box-sizing:border-box;">
                <div style="flex:1; min-width:0; background:#FFFFFF; border:3px solid #1A1A1A; border-radius:14px; padding:8px 12px 10px 12px; box-sizing:border-box; page-break-inside:avoid; break-inside:avoid;">
                    <div style="font-size:12px; font-weight:700; margin-bottom:4px;">🍽️ Top 5 Maaltijden (laatste 4 weken)</div>
                    ${getTop5ListHtml(mealCounts, 'Nog geen maaltijden gelogd in deze 4 weken.')}
                </div>
                <div style="flex:1; min-width:0; background:#FFFFFF; border:3px solid #1A1A1A; border-radius:14px; padding:8px 12px 10px 12px; box-sizing:border-box; page-break-inside:avoid; break-inside:avoid;">
                    <div style="font-size:12px; font-weight:700; margin-bottom:4px;">🥤 Top 5 Drankjes (laatste 4 weken)</div>
                    ${getTop5ListHtml(drinkCounts, 'Nog geen drankjes gelogd in deze 4 weken.')}
                </div>
            </div>`;
    }

    return `
        <div style="display:flex; flex-direction:column; gap:10px; margin-top:14px;">
            <div style="background:#FFFDF9; border:3px solid var(--border-color); border-radius:14px; padding:10px 12px; box-shadow:3px 3px 0px var(--border-color);">
                <div style="font-size:0.86rem; font-weight:700; margin-bottom:6px;">🍽️ Top 5 Meest Gebruikte Maaltijden <span style="font-weight:500; font-size:0.75rem; color:#555;">(laatste 4 weken)</span></div>
                ${getTop5ListHtml(mealCounts, 'Nog geen maaltijden gelogd in de laatste 4 weken.')}
            </div>
            <div style="background:#FFFDF9; border:3px solid var(--border-color); border-radius:14px; padding:10px 12px; box-shadow:3px 3px 0px var(--border-color);">
                <div style="font-size:0.86rem; font-weight:700; margin-bottom:6px;">🥤 Top 5 Meest Gebruikte Drankjes <span style="font-weight:500; font-size:0.75rem; color:#555;">(laatste 4 weken)</span></div>
                ${getTop5ListHtml(drinkCounts, 'Nog geen drankjes gelogd in de laatste 4 weken.')}
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

        const last4StartStr = formatDateLocal(addDays(thisMonday, -21));
        const last4EndStr = formatDateLocal(addDays(thisMonday, 6));
        let last4WeeksMeals = data.meals;
        if (rangeStart !== last4StartStr || rangeEnd !== last4EndStr) {
            const last4Data = await fetchHistoryRange(last4StartStr, last4EndStr);
            last4WeeksMeals = last4Data.meals;
        }

        const lineChartEl = document.getElementById('history-line-chart');
        if (lineChartEl) lineChartEl.innerHTML = buildCarbLineChartLast10Days(last4WeeksMeals, false);

        navEl.innerHTML = `
            <button type="button" class="btn btn-auto hist-nav-btn" data-hist-prev>← Eerder</button>
            <span style="font-weight:700; font-size:0.85rem; text-align:center;">Gemiddeld per dag (4 weken)</span>
            <button type="button" class="btn btn-auto hist-nav-btn" data-hist-next ${historyState.pageOffset === 0 ? 'disabled style="opacity:0.4;"' : ''}>Later →</button>`;
        contentEl.innerHTML = `
            ${buildBarChart(chartItems)}
            <div style="font-weight:700; font-size:0.84rem; margin-bottom:6px;">🐾 Overzicht per week (tik voor alle dagen):</div>
            <div class="hist-cards-list">${weekCardsHtml}</div>
            ${buildTop5MealsAndDrinksHtml(last4WeeksMeals, false)}`;
        return;
    }

    if (historyState.view === 'days') {
        const ws = parseLocalDate(historyState.weekStart);
        const weekEndStr = formatDateLocal(addDays(ws, 6));
        const data = await fetchHistoryRange(historyState.weekStart, weekEndStr);
        const last4StartStr = formatDateLocal(addDays(thisMonday, -21));
        const last4EndStr = formatDateLocal(addDays(thisMonday, 6));
        const last4Data = await fetchHistoryRange(last4StartStr, last4EndStr);
        const last4WeeksMeals = last4Data.meals;
        const lineChartEl = document.getElementById('history-line-chart');
        if (lineChartEl) lineChartEl.innerHTML = buildCarbLineChartLast10Days(last4WeeksMeals, false);
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
            <div style="font-weight:700; font-size:0.84rem; margin-bottom:6px;">🐾 Dagen in Week ${getISOWeekNumber(ws)} (tik op een dag om die te openen op Home):</div>
            <div class="hist-cards-list">${dayCardsHtml}</div>
            ${buildTop5MealsAndDrinksHtml(last4WeeksMeals, false)}`;
        return;
    }

    // Dagdetails (startpunt om deze dag te bekijken én te wijzigen)
    await loadDateLog(historyState.day);
    const dayObj = parseLocalDate(historyState.day);
    const s = summarizeDay(appState.meals, historyState.day);
    const water = appState.water || 0;
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
        waterDots += `<button type="button" onclick="setHistoryDayWater(${i})" title="Zet water op ${i} glazen" style="background:none; border:none; padding:0 1px; cursor:pointer; font-size:0.95rem; opacity:${i <= water ? '1' : '0.25'};">💧</button>`;
    }

    const mealsHtml = appState.meals.length
        ? appState.meals.map((m, idx) => {
            const favInfo = getMealFavoriteInfo(m);
            const isFav = favInfo.favIdx !== -1;
            const heartIcon = isFav ? '❤️' : '🤍';
            const heartTitle = isFav ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten';
            return `
            <div class="hist-meal meal-item" style="display:block;">
                <div class="hist-meal-top">
                    <span>${escapeHtml(m.type || '🍽️')} — ${escapeHtml(m.name || '')}</span>
                    <span style="white-space:nowrap;">
                        <button type="button" onclick="toggleHistoryDayFavorite(${idx})" title="${heartTitle}" style="background:none; border:none; cursor:pointer; font-size:0.85rem; padding:0; margin-right:6px; vertical-align:middle;">${heartIcon}</button>
                        <button type="button" onclick="openHistoryDayEditMeal(${idx})" style="background:none; border:none; color:var(--siep-blue); cursor:pointer; font-size:0.75rem; font-family:inherit; font-weight:700; padding:0; margin-right:6px;">✏️ Wijzigen</button>
                        <button type="button" onclick="deleteHistoryDayMeal(${idx}, this)" style="background:none; border:none; color:var(--takkie-red); cursor:pointer; font-size:0.75rem; font-family:inherit; font-weight:600; padding:0;">Verwijderen</button>
                    </span>
                </div>
                <div class="hist-badge-row">
                    <span class="hist-macro-pill hist-pill-carb">${Number(m.carbs) || 0}g KH</span>
                    <span class="hist-macro-pill hist-pill-fat">${Number(m.fat) || 0}g Vet</span>
                    <span class="hist-macro-pill hist-pill-prot">${Number(m.protein) || 0}g Eiwit</span>
                    <span class="hist-macro-pill hist-pill-kcal">${mealKcal(m)} kcal</span>
                </div>
            </div>`;
        }).join('')
        : '<p style="color:#666; text-align:center;">Geen maaltijden of drankjes gelogd op deze dag.</p>';

    contentEl.innerHTML = `
        <div class="btn-grid" style="margin-top:0; margin-bottom:12px;">
            <button type="button" class="btn btn-drink" onclick="openHistoryDayAddMeal()">🍽️ Maaltijd Toevoegen</button>
            <button type="button" class="btn btn-drink" onclick="openHistoryDayAddDrink()">🥤 Drank Loggen</button>
            <button type="button" class="btn" style="grid-column: span 2; background: var(--accent-yellow); padding: 9px;" onclick="openHistoryDayOnHome()">✏️ Open deze dag op Home</button>
        </div>
        <div class="hist-summary">
            ${makeTile('🥑 Koolhydraten', s.carbs, goals.carbs, 'g', 'var(--takkie-red)')}
            ${makeTile('🧈 Vetten', s.fat, goals.fat, 'g', '#B2530C')}
            ${makeTile('🥩 Eiwitten', s.protein, goals.protein, 'g', '#1b4332')}
            ${makeTile('⚡ Calorieën', s.kcal, goals.kcal, '', '#5a189a')}
        </div>
        <div class="hist-water-box">
            <span>Drinkbak (tik op 💧): <strong>${water} / 8 glazen</strong></span>
            <span>${waterDots}</span>
        </div>
        <div style="font-weight:700; font-size:0.85rem; margin-bottom:6px;">🍽️ Gelogde hapjes & drankjes (${appState.meals.length}):</div>
        ${mealsHtml}`;
}

window.openHistoryDayOnHome = async function() {
    if (!historyState.day) return;
    appState.returnToHistoryDay = false;
    await loadDateLog(historyState.day);
    switchTab('home');
};

window.openHistoryDayAddMeal = async function() {
    if (!historyState.day) return;
    await loadDateLog(historyState.day);
    appState.returnToHistoryDay = true;
    switchTab('log');
};

window.openHistoryDayAddDrink = async function() {
    if (!historyState.day) return;
    await loadDateLog(historyState.day);
    appState.returnToHistoryDay = true;
    switchTab('log-drink');
};

window.openHistoryDayEditMeal = async function(idx) {
    if (!historyState.day) return;
    await loadDateLog(historyState.day);
    appState.returnToHistoryDay = true;
    window.openEditMeal(idx);
};

window.toggleHistoryDayFavorite = async function(idx) {
    await window.toggleMealFavorite(idx);
    await renderHistory();
};

window.deleteHistoryDayMeal = function(idx, btnEl) {
    const anchor = btnEl || document.getElementById('history-content');
    showInlineConfirm(anchor, "Weet je zeker dat je dit hapje wilt verwijderen?", async () => {
        const mealToDel = appState.meals[idx];
        const drinkGlasses = getDrinkGlassesCount(mealToDel);
        appState.meals.splice(idx, 1);
        if (drinkGlasses > 0) {
            await updateWater(Math.max(0, appState.water - drinkGlasses));
        }
        if (mealToDel && mealToDel.id) {
            await window.supabaseClient.from('meals').delete().eq('id', mealToDel.id);
            await calculateStreak();
        }
        renderApp();
        await renderHistory();
    });
};

window.setHistoryDayWater = async function(clickedVal) {
    const prevWater = appState.water;
    const nextWater = (clickedVal === prevWater) ? clickedVal - 1 : clickedVal;
    await updateWater(nextWater);
    await renderHistory();
};

async function exportHistoryToPdf() {
    if (!currentUser) return;
    const btn = document.getElementById('btn-export-history-pdf');
    const origText = btn ? btn.innerText : '📄 Exporteer PDF';
    if (btn) {
        btn.disabled = true;
        btn.innerText = '🐾 PDF maken...';
    }

    try {
        // Altijd een overzicht van de laatste 4 weken, inclusief de huidige week
        const PDF_WEEKS_COUNT = 4;
        const thisMonday = getMondayOf(new Date());
        const newestStart = thisMonday;
        const weekStarts = [];
        for (let i = 0; i < PDF_WEEKS_COUNT; i++) {
            weekStarts.push(addDays(newestStart, -7 * i));
        }
        const oldestStart = weekStarts[weekStarts.length - 1];
        const newestEnd = addDays(newestStart, 6);
        const startStr = formatDateLocal(oldestStart);
        const endStr = formatDateLocal(newestEnd);
        const periodTitle = `Week ${getISOWeekNumber(oldestStart)} t/m Week ${getISOWeekNumber(newestStart)} (${shortDateLabel(oldestStart)} – ${shortDateLabel(newestEnd)} ${newestEnd.getFullYear()})`;
        const fileSlug = `${startStr}-tm-${endStr}`;

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

        const goalCell = (ok, label, hasData, isFooter = false) => {
            const borderStyle = isFooter ? 'border-top:2px solid #1A1A1A; border:1px solid #1A1A1A;' : 'border:1px solid #1A1A1A;';
            if (!hasData) {
                return `<td style="padding:2.5px 5px; ${borderStyle} text-align:center; background:#F5F5F5; color:#888; font-size:10.5px;">–</td>`;
            }
            const bg = ok ? '#D8F3DC' : '#FFE5E5';
            const fg = ok ? '#1B4332' : '#B71C1C';
            return `<td style="padding:2.5px 5px; ${borderStyle} text-align:center; background:${bg}; color:${fg}; font-weight:700; font-size:10.5px;">${label}</td>`;
        };

        // 1. Bouw per week (laatste 4 weken incl. huidige week) een kader met een tabel per dag van de week
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

            const dayRowsHtml = weekDays.map(x => {
                const dayLabel = `${DAY_NAMES_FULL[x.dObj.getDay()]} ${shortDateLabel(x.dObj)}`;
                const hasDayMeals = x.s.count > 0;
                const hasDayWater = hasDayMeals || x.water > 0;
                return `
                    <tr>
                        <td style="padding:2.5px 7px; border:1px solid #1A1A1A; font-weight:600; font-size:10.5px; background:#FFFDF9;">${dayLabel}</td>
                        ${goalCell(checkGoal('carbs', x.s.carbs), `${x.s.carbs} g`, hasDayMeals)}
                        ${goalCell(checkGoal('protein', x.s.protein), `${x.s.protein} g`, hasDayMeals)}
                        ${goalCell(checkGoal('fat', x.s.fat), `${x.s.fat} g`, hasDayMeals)}
                        ${goalCell(checkGoal('kcal', x.s.kcal), `${x.s.kcal}`, hasDayMeals)}
                        ${goalCell(checkGoal('water', x.water), `${x.water}/8`, hasDayWater)}
                    </tr>`;
            }).join('');

            return `
                <div style="background:#FFFFFF; border:3px solid #1A1A1A; border-radius:14px; padding:7px 12px; margin-bottom:7px; page-break-inside:avoid; break-inside:avoid; box-sizing:border-box;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:4px;">
                        <div style="font-size:13px; font-weight:700;">📊 Week ${getISOWeekNumber(ws)} <span style="font-weight:600; font-size:11px; color:#555;">(${shortDateLabel(ws)} – ${shortDateLabel(we)})</span></div>
                        <div style="font-size:9.5px; font-weight:700; background:#FFF9E6; border:1.5px solid #1A1A1A; border-radius:999px; padding:1px 8px;">
                            ${nMeals}/7 dagen gelogd
                        </div>
                    </div>

                    <table style="width:100%; border-collapse:collapse; border:2px solid #1A1A1A;">
                        <thead>
                            <tr style="background:#FFF9E6; font-size:10.5px;">
                                <th style="padding:3.5px 7px; border:1px solid #1A1A1A; text-align:left;">Dag</th>
                                <th style="padding:3.5px 5px; border:1px solid #1A1A1A; text-align:center;">🥑 Koolhydraat <span style="font-weight:500; font-size:9.5px; color:#555;">(≤${goals.carbs}g)</span></th>
                                <th style="padding:3.5px 5px; border:1px solid #1A1A1A; text-align:center;">🥩 Eiwit <span style="font-weight:500; font-size:9.5px; color:#555;">(≥${goals.protein}g)</span></th>
                                <th style="padding:3.5px 5px; border:1px solid #1A1A1A; text-align:center;">🧈 Vet <span style="font-weight:500; font-size:9.5px; color:#555;">(≤${goals.fat}g)</span></th>
                                <th style="padding:3.5px 5px; border:1px solid #1A1A1A; text-align:center;">⚡ Kcal <span style="font-weight:500; font-size:9.5px; color:#555;">(≤${goals.kcal})</span></th>
                                <th style="padding:3.5px 5px; border:1px solid #1A1A1A; text-align:center;">💧 Water <span style="font-weight:500; font-size:9.5px; color:#555;">(≥8)</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dayRowsHtml}
                        </tbody>
                        <tfoot>
                            <tr style="font-weight:700;">
                                <td style="padding:2.5px 7px; border:1px solid #1A1A1A; font-size:10.5px; background:#F1FAEE;">Gemiddeld</td>
                                ${goalCell(checkGoal('carbs', avgC), `${avgC} g`, hasMeals, true)}
                                ${goalCell(checkGoal('protein', avgP), `${avgP} g`, hasMeals, true)}
                                ${goalCell(checkGoal('fat', avgF), `${avgF} g`, hasMeals, true)}
                                ${goalCell(checkGoal('kcal', avgK), `${avgK}`, hasMeals, true)}
                                ${goalCell(checkGoal('water', avgW), `${avgW}/8`, nWater > 0, true)}
                            </tr>
                        </tfoot>
                    </table>
                </div>`;
        }).join('');

        // 2. Top 5 meest gebruikte maaltijden en Top 5 meest gebruikte drankjes over de laatste 4 weken
        const topListsHtml = buildTop5MealsAndDrinksHtml(data.meals, true);

        const carbLineChartPdfHtml = buildCarbLineChartLast10Days(data.meals, true);

        const reportHtml = `
            <div style="font-family:'Fredoka', Arial, sans-serif; color:#1A1A1A; background:#FFFDF9; padding:10px 12px 18px 12px; width:760px; box-sizing:border-box;">
                <div style="background:#F1FAEE; border:3px solid #1A1A1A; border-radius:16px; padding:8px 14px; margin-bottom:7px; display:flex; justify-content:space-between; align-items:center; gap:12px;">
                    <div>
                        <div style="color:#E63946; font-size:17px; font-weight:700; margin-bottom:1px;">🐾 Takkie & Siep's Keto Logboek (Laatste 4 Weken)</div>
                        <div style="font-size:12px; font-weight:700;">Maatje: ${escapeHtml(userName)} • Periode: ${escapeHtml(periodTitle)}</div>
                    </div>
                    <img src="takkie.png" alt="Takkie" style="height:38px; width:auto;">
                </div>

                ${carbLineChartPdfHtml}
                ${weeksOverviewHtml}
                ${topListsHtml}

                <div style="text-align:center; font-size:9.5px; color:#666; margin-top:6px;">
                    🐾 Met liefde gemaakt in Takkie & Siep's Keto Tracker — "Elke kleine stap telt!"
                </div>
            </div>`;

        if (typeof window.html2pdf === 'function') {
            const wrapper = document.createElement('div');
            wrapper.style.width = '760px';
            wrapper.style.flexShrink = '0';
            wrapper.innerHTML = reportHtml;
            document.body.appendChild(wrapper);
            try {
                await window.html2pdf()
                    .set({
                        margin: [6, 6, 6, 6],
                        filename: `Takkie-Siep-Logboek-${fileSlug}.pdf`,
                        image: { type: 'jpeg', quality: 0.96 },
                        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
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
        const chosenDate = t.getAttribute('data-hist-day');
        appState.returnToHistoryDay = false;
        loadDateLog(chosenDate).then(() => switchTab('home'));
        return;
    } else if (t.hasAttribute('data-hist-prev')) {
        historyState.pageOffset += 1;
    } else if (t.hasAttribute('data-hist-next')) {
        if (historyState.pageOffset > 0) historyState.pageOffset -= 1;
    } else if (t.hasAttribute('data-hist-back-weeks')) {
        historyState.view = 'weeks';
        if (isViewingOtherDay()) loadDateLog(getTodayString());
    } else if (t.hasAttribute('data-hist-back-days')) {
        historyState.view = 'days';
        if (isViewingOtherDay()) loadDateLog(getTodayString());
    }
    renderHistory();
});
