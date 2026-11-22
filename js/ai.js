// Gemini AI: 3-staps wizard & interactieve dialoog voor macro-analyse (met slimme uitsplitsing per onderdeel in gram, ml, plakjes, glazen, aantal), receptgeneratie en lokale fallback.
// Klassiek script (geen module): deelt globale functies en variabelen met de andere bestanden in js/.
// Zie ARCHITECTURE.md voor de laadvolgorde.

async function getGeminiApiKey() {
    if (appState.geminiApiKey) return appState.geminiApiKey;
    if (!currentUser) return '';

    const { data: settingRow } = await window.supabaseClient
        .from('app_settings')
        .select('value')
        .eq('key', 'gemini_api_key')
        .maybeSingle();

    if (settingRow && settingRow.value) {
        appState.geminiApiKey = settingRow.value.trim();
        return appState.geminiApiKey;
    }
    return '';
}

// ==========================================
// AI ANALYSE & DIALOOG (GEMINI API + FALLBACK)
// ==========================================
const UNIT_QUICK_PICKS = {
    stuks: ['1 stuk', '2 stuks', '3 stuks', '4 stuks', '6 stuks'],
    g: ['25 g', '50 g', '100 g', '150 g', '200 g'],
    ml: ['50 ml', '100 ml', '150 ml', '200 ml', '250 ml'],
    glazen: ['½ glas (100 ml)', '1 glas (200 ml)', '2 glazen (400 ml)', '50 ml'],
    plakjes: ['1 plakje', '2 plakjes', '3 plakjes', '4 plakjes', '50 g'],
    el: ['1 klontje/el (10g)', '2 el (20g)', '1 tl (5g)', 'Zonder'],
    tl: ['½ tl', '1 tl', '2 tl', '1 el'],
    keuze: []
};

const UNIT_SELECT_OPTIONS = [
    { value: 'g', label: 'gram (g)' },
    { value: 'ml', label: 'ml' },
    { value: 'plakjes', label: 'plakjes' },
    { value: 'stuks', label: 'stuks' },
    { value: 'glazen', label: 'glas/glazen' },
    { value: 'el', label: 'eetlepel (el)' },
    { value: 'tl', label: 'theelepel (tl)' },
    { value: '', label: 'vrij' }
];

function localFallbackNutrition(inputName) {
    const name = inputName.toLowerCase();
    let c = 0, f = 0, p = 0;
    if (name.includes('wijn') || name.includes('alcohol')) { c = 3; f = 0; p = 0; }
    else if (name.includes('bulletproof')) { c = 0; f = 15; p = 1; }
    else if (name.includes('koffie') || name.includes('thee')) { c = 0; f = 5; p = 0; }
    else if (name.includes('ei')) { c = 1; f = 15; p = 13; }
    else if (name.includes('zalm') || name.includes('vis') || name.includes('makreel') || name.includes('haring')) { c = 0; f = 18; p = 22; }
    else if (name.includes('avocado')) { c = 2; f = 15; p = 2; }
    else if (name.includes('noten') || name.includes('amandel') || name.includes('walnoot')) { c = 2; f = 21; p = 5; }
    else if (name.includes('kaas') || name.includes('brie') || name.includes('oude kaas')) { c = 0; f = 16; p = 12; }
    else if (name.includes('salade')) { c = 4; f = 25; p = 10; }
    else if (name.includes('vlees') || name.includes('ribeye') || name.includes('spek') || name.includes('kip') || name.includes('gehakt')) { c = 0; f = 30; p = 32; }
    else { c = 2; f = 10; p = 10; }
    return { carbs: c, fat: f, protein: p };
}

// Controleert of elk genoemd onderdeel in de invoer al een duidelijke hoeveelheid of maat bevat
function isDescriptionComplete(description) {
    const parts = (description || '')
        .split(/\s*(?:,|\bmet\b|\ben\b|\bplus\b|&)\s*/i)
        .map(s => s.trim())
        .filter(Boolean);
    if (parts.length === 0) return false;
    const qtyPattern = /(?:\b\d+\b|\d+\s*(?:g|gr|gram|ml|l|cl|dl|el|tl|stuks?)\b|½|¼|¾|\b(?:een|één|twee|drie|vier|vijf|zes|halve|half|kwart|glas|glazen|glaasje|kop|kopje|kopjes|mok|beker|plak|plakje|plakjes|snee|sneetje|stuk|stuks|handje|schaaltje|bakje|kom|kommetje|blikje|flesje|portie|eetlepel|eetlepels|theelepel|theelepels|klontje|scheut|scheutje)\b)/i;
    return parts.every(part => qtyPattern.test(part));
}

// Slimme lokale uitsplitsing per onderdeel als vangnet wanneer AI niet bereikbaar is
function localIngredientQuestionsFallback(description, contextType) {
    if (contextType === 'drink') {
        return [{
            id: 'q1',
            subject: '🥤 ' + description,
            question: `Hoe groot is je glas/kopje ${description}?`,
            unit: 'glazen',
            options: ['1 kopje (150 ml)', '1 glas (200 ml)', 'Groot glas (250 ml)', 'Met scheutje room'],
            defaultOption: '1 glas (200 ml)'
        }];
    }

    const parts = description
        .split(/\s*(?:,|\bmet\b|\ben\b|\bplus\b|&)\s*/i)
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 4);

    const list = (parts.length > 0 ? parts : [description]).map((part, idx) => {
        const low = part.toLowerCase();
        const numMatch = part.match(/^(\d+)\s+(.+)$/);
        const countNum = numMatch ? parseInt(numMatch[1], 10) : null;

        if (low.includes('ei')) {
            const opts = ['1 ei', '2 eieren', '3 eieren', '4 eieren'];
            const def = countNum ? `${countNum} ${countNum === 1 ? 'ei' : 'eieren'}` : '2 eieren';
            if (!opts.includes(def)) opts.unshift(def);
            return { id: 'q' + idx, subject: '🥚 Eieren', question: 'Hoeveel eieren?', unit: 'stuks', options: opts, defaultOption: def };
        }
        if (low.includes('spek') || low.includes('bacon') || low.includes('ham') || low.includes('kaas') || low.includes('beleg')) {
            const opts = ['1 plakje', '2 plakjes', '3 plakjes', '4 plakjes', '50 g'];
            const def = countNum ? `${countNum} ${countNum === 1 ? 'plakje' : 'plakjes'}` : '2 plakjes';
            if (!opts.includes(def)) opts.unshift(def);
            return { id: 'q' + idx, subject: '🥓 ' + part, question: `Hoeveel ${part}?`, unit: 'plakjes', options: opts, defaultOption: def };
        }
        if (low.includes('melk') || low.includes('drink') || low.includes('wijn') || low.includes('water') || low.includes('koffie') || low.includes('thee') || low.includes('bouillon')) {
            const opts = ['½ glas (100 ml)', '1 glas (200 ml)', '2 glazen (400 ml)', '50 ml'];
            const def = countNum === 2 ? '2 glazen (400 ml)' : '1 glas (200 ml)';
            return { id: 'q' + idx, subject: '🥛 ' + part, question: `Hoeveel ${part}?`, unit: 'glazen', options: opts, defaultOption: def };
        }
        if (low.includes('noten') || low.includes('walnot') || low.includes('pecan') || low.includes('amandel')) {
            return { id: 'q' + idx, subject: '🥜 ' + part, question: `Hoeveel gram ${part}?`, unit: 'g', options: ['15 g (klein handje)', '30 g (handje)', '50 g'], defaultOption: '30 g (handje)' };
        }
        return {
            id: 'q' + idx,
            subject: '🍽️ ' + part,
            question: `Hoeveel gram ${part}?`,
            unit: 'g',
            options: ['50 g', '100 g', '150 g', '200 g'],
            defaultOption: '125 g'
        };
    });

    if (/gebakken|roerei|omelet|biefstuk|ribeye|zalm|kip/i.test(description) && list.length < 4) {
        list.push({
            id: 'q_fat',
            subject: '🧈 Bereiding',
            question: 'Waar is het in gebakken?',
            unit: 'el',
            options: ['1 klontje roomboter (10g)', '1 el olijfolie', 'Zonder boter/olie'],
            defaultOption: '1 klontje roomboter (10g)'
        });
    }
    return list;
}

let preferredGeminiModel = null;
const aiAssessCache = new Map();
const aiCalcCache = new Map();

async function callGeminiJson(promptText) {
    const apiKey = await getGeminiApiKey();
    if (!apiKey) {
        const { data: fnData, error: fnError } = await window.supabaseClient.functions.invoke('gemini-ai', {
            body: { prompt: promptText }
        });
        if (!fnError && fnData) {
            return typeof fnData === 'string' ? JSON.parse(fnData) : fnData;
        }
        throw new Error('NO_API_KEY');
    }

    const baseModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
    const models = preferredGeminiModel
        ? [preferredGeminiModel, ...baseModels.filter(m => m !== preferredGeminiModel)]
        : baseModels;
    let lastError = null;

    for (const model of models) {
        const supportsThinkingConfig = model.includes('2.5') || model === 'gemini-flash-latest';
        const genConfig = {
            temperature: 0.2,
            responseMimeType: 'application/json'
        };
        if (supportsThinkingConfig) {
            genConfig.thinkingConfig = { thinkingBudget: 0 };
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: genConfig
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            lastError = new Error(errData?.error?.message || `HTTP ${response.status}`);
            continue;
        }

        preferredGeminiModel = model;
        const data = await response.json();
        const rawText = (data?.candidates?.[0]?.content?.parts?.[0]?.text || '')
            .replace(/^```json\s*/i, '')
            .replace(/```\s*$/i, '')
            .trim();
        return JSON.parse(rawText);
    }

    throw lastError || new Error('Kon geen verbinding maken met Gemini AI.');
}

function formatClarifyingAnswer(questionObj, selectedChip, customValue, customUnit) {
    const rawSubject = (questionObj.subject || questionObj.question || 'Onderdeel').replace(/^[^\wA-Za-zÀ-ÿ]+/, '').trim();
    const typed = (customValue || '').trim();
    if (typed) {
        const hasUnitAlready = /[a-zA-Z]/.test(typed);
        const unitSuffix = (!hasUnitAlready && customUnit) ? ` ${customUnit}` : '';
        return `${rawSubject}: ${typed}${unitSuffix}`;
    }
    if (selectedChip) {
        return `${rawSubject}: ${selectedChip}`;
    }
    return '';
}

async function assessOrCalculateWithAI(description, contextType, forceWizardQuestions = false) {
    const cacheKey = `${contextType}|${forceWizardQuestions ? 'force' : 'auto'}|${description.trim().toLowerCase()}`;
    if (aiAssessCache.has(cacheKey)) {
        return await aiAssessCache.get(cacheKey);
    }

    const isDrink = contextType === 'drink';
    const prompt = `Je bent de keto-voedingsexpert van Takkie & Siep.
Invoer (${isDrink ? 'drankje' : 'maaltijd'}): "${description}"

TAAK:
${forceWizardQuestions
    ? 'Splits uit in 1-4 losse onderdelen zodat de gebruiker per onderdeel de hoeveelheid kan kiezen.'
    : '1. Als ELK genoemd onderdeel al een aantal/gewicht/maat heeft (bijv. "1 glas melk", "2 gebakken eieren met 1 plakje spek", "150g zalm", "kopje koffie"): geef direct "complete": true terug met berekende "carbs", "fat", "protein", "refinedName" en "explanation" (stel GEEN extra vragen over bakboter).\n2. Als van een onderdeel de hoeveelheid ontbreekt: geef "complete": false met "questions" per onderdeel.'}

EENHEDEN (bij "complete": false):
- Eieren/stuks -> "unit": "stuks", options bijv. ["1 ei", "2 eieren", "3 eieren", "4 eieren"]
- Spek/kaas/ham/plakjes -> "unit": "plakjes", options bijv. ["1 plakje", "2 plakjes", "3 plakjes", "4 plakjes", "50 g"]
- Melk/wijn/koffie/thee/drank -> "unit": "glazen", options bijv. ["½ glas (100 ml)", "1 glas (200 ml)", "2 glazen (400 ml)", "50 ml"]
- Vlees/vis/kip/groente/zuivel/noten -> "unit": "g", options bijv. ["50 g", "100 g", "150 g", "200 g", "250 g"]
- Boter/olie/saus -> "unit": "el", options bijv. ["1 klontje roomboter (10g)", "1 el olijfolie", "Zonder boter/olie"]
- Noemde de gebruiker al een aantal voor een onderdeel, zet dat als "defaultOption"; kies anders de gangbare portie.

Geef ALLEEN JSON terug:
Bij "complete": true:
{"complete":true,"carbs":0,"fat":0,"protein":0,"refinedName":"...","explanation":"Korte warme Takkie & Siep toelichting (1-2 zinnen)"}
Bij "complete": false:
{"complete":false,"questions":[{"id":"q1","subject":"🥚 Onderdeel","question":"Hoeveel ...?","unit":"stuks","options":["..."],"defaultOption":"..."}]}`;

    const reqPromise = callGeminiJson(prompt).catch(err => {
        aiAssessCache.delete(cacheKey);
        throw err;
    });
    aiAssessCache.set(cacheKey, reqPromise);
    return await reqPromise;
}

async function calculateNutritionDirect(description, answersList, contextType) {
    const normAnswers = (answersList || []).map(a => a.trim()).filter(Boolean);
    const cacheKey = `${contextType}|${description.trim().toLowerCase()}|${normAnswers.join('||').toLowerCase()}`;
    if (aiCalcCache.has(cacheKey)) {
        return await aiCalcCache.get(cacheKey);
    }

    const isDrink = contextType === 'drink';
    const extraDetails = normAnswers.length > 0
        ? `\nHoeveelheden: ${normAnswers.join(', ')}`
        : '';

    const prompt = `Je bent de keto-voedingsexpert van Takkie & Siep.
Bereken netto koolhydraten (carbs), vetten (fat) en eiwitten (protein) in hele grammen voor dit ${isDrink ? 'drankje' : 'gerecht'}:
"${description}"${extraDetails}

Geef ALLEEN JSON terug:
{
  "carbs": <geheel getal in g>,
  "fat": <geheel getal in g>,
  "protein": <geheel getal in g>,
  "refinedName": "<natuurlijke Nederlandse naam inclusief hoeveelheden, bijv. '3 gebakken eieren met 2 plakjes spek en 1 glas melk'>",
  "explanation": "<korte, warme Nederlandse toelichting van 1-2 zinnen namens Takkie & Siep>"
}`;

    const reqPromise = callGeminiJson(prompt).catch(err => {
        aiCalcCache.delete(cacheKey);
        throw err;
    });
    aiCalcCache.set(cacheKey, reqPromise);
    return await reqPromise;
}

function renderClarifyingDialog(fbEl, questions, onConfirmAnswers, onSkip, dialogOpts = {}) {
    if (!fbEl) return;
    fbEl.style.display = 'block';
    const isWizard = !!dialogOpts.isWizard;
    const onBackToStep1 = dialogOpts.onBackToStep1 || null;
    const onPrefetchAnswers = dialogOpts.onPrefetchAnswers || null;
    let prefetchTimer = null;

    const normalizedQuestions = (questions || []).slice(0, 4).map((q, idx) => {
        const unit = UNIT_QUICK_PICKS[q.unit] ? q.unit : 'g';
        const defaultOpts = UNIT_QUICK_PICKS[unit] || [];
        const opts = (Array.isArray(q.options) && q.options.length > 0) ? q.options : defaultOpts;
        const defOpt = (q.defaultOption && opts.includes(q.defaultOption)) ? q.defaultOption : (opts[1] || opts[0] || '');
        return {
            id: q.id || ('q' + idx),
            subject: q.subject || `Onderdeel ${idx + 1}`,
            question: q.question || `Hoeveel ${q.subject || ''}?`,
            unit,
            options: opts,
            defaultOption: defOpt
        };
    });

    const stateByQ = normalizedQuestions.map(q => ({
        selectedChip: q.defaultOption,
        customVal: '',
        customUnit: (q.unit === 'keuze') ? '' : q.unit
    }));

    const questionsHtml = normalizedQuestions.map((q, qIdx) => {
        const chipsHtml = q.options.map((opt) => {
            const isActive = opt === q.defaultOption;
            return `<button type="button" class="ai-q-chip${isActive ? ' active' : ''}" data-q-idx="${qIdx}" data-chip-val="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`;
        }).join('');

        const unitOptionsHtml = UNIT_SELECT_OPTIONS.map(u => `
            <option value="${u.value}"${u.value === stateByQ[qIdx].customUnit ? ' selected' : ''}>${u.label}</option>
        `).join('');

        return `
            <div class="ai-q-block" data-q-block="${qIdx}">
                <div class="ai-q-title">${escapeHtml(q.subject)} <span style="font-weight:500; color:#555; font-size:0.78rem;">— ${escapeHtml(q.question)}</span></div>
                <div class="ai-q-chips">
                    ${chipsHtml}
                    <button type="button" class="ai-q-chip ai-q-chip-other" data-q-other="${qIdx}">✏️ Anders...</button>
                </div>
                <div class="ai-q-custom-row" data-q-custom-row="${qIdx}" style="display: none;">
                    <input type="text" class="ai-q-input" data-q-input="${qIdx}" placeholder="Typ aantal of gewicht...">
                    <select class="ai-q-unit" data-q-unit="${qIdx}">${unitOptionsHtml}</select>
                </div>
            </div>`;
    }).join('');

    const submitLabel = isWizard ? '🐾 Naar samenvatting →' : '✅ Bereken macro\'s';
    const backOrSkipHtml = isWizard && onBackToStep1
        ? `<button type="button" class="btn ai-dialog-skip" id="btn-ai-dialog-back1">← Terug</button>`
        : `<button type="button" class="btn ai-dialog-skip" id="btn-ai-dialog-skip">⏭️ Sla over</button>`;

    fbEl.innerHTML = `
        <div class="ai-dialog-box">
            <div class="ai-dialog-intro">🐾 De meest gangbare portie staat al geel aangevinkt. Tik om iets aan te passen:</div>
            ${questionsHtml}
            <div class="ai-dialog-actions">
                ${backOrSkipHtml}
                <button type="button" class="btn ai-dialog-submit" id="btn-ai-dialog-confirm">${submitLabel}</button>
            </div>
        </div>`;

    const collectCurrentAnswers = () => normalizedQuestions
        .map((q, idx) => formatClarifyingAnswer(q, stateByQ[idx].selectedChip, stateByQ[idx].customVal, stateByQ[idx].customUnit))
        .filter(Boolean);

    const schedulePrefetch = (delayMs = 150) => {
        if (!onPrefetchAnswers) return;
        if (prefetchTimer) clearTimeout(prefetchTimer);
        prefetchTimer = setTimeout(() => {
            onPrefetchAnswers(collectCurrentAnswers());
        }, delayMs);
    };

    // Start direct op de achtergrond met het voorberekenen van de voorgeselecteerde standaardporties
    schedulePrefetch(0);

    fbEl.querySelectorAll('.ai-q-chip:not(.ai-q-chip-other)').forEach(chipBtn => {
        chipBtn.addEventListener('click', () => {
            const qIdx = parseInt(chipBtn.getAttribute('data-q-idx'), 10);
            const val = chipBtn.getAttribute('data-chip-val');
            stateByQ[qIdx].selectedChip = val;
            stateByQ[qIdx].customVal = '';

            const block = fbEl.querySelector(`[data-q-block="${qIdx}"]`);
            if (block) {
                block.querySelectorAll('.ai-q-chip').forEach(b => b.classList.remove('active'));
                chipBtn.classList.add('active');
                const inp = block.querySelector(`[data-q-input="${qIdx}"]`);
                if (inp) inp.value = '';
                const customRow = block.querySelector(`[data-q-custom-row="${qIdx}"]`);
                if (customRow) customRow.style.display = 'none';
            }
            schedulePrefetch(100);
        });
    });

    fbEl.querySelectorAll('.ai-q-chip-other').forEach(otherBtn => {
        otherBtn.addEventListener('click', () => {
            const qIdx = parseInt(otherBtn.getAttribute('data-q-other'), 10);
            const block = fbEl.querySelector(`[data-q-block="${qIdx}"]`);
            if (!block) return;
            block.querySelectorAll('.ai-q-chip').forEach(b => b.classList.remove('active'));
            otherBtn.classList.add('active');
            const customRow = block.querySelector(`[data-q-custom-row="${qIdx}"]`);
            if (customRow) {
                customRow.style.display = 'flex';
                const inp = block.querySelector(`[data-q-input="${qIdx}"]`);
                if (inp) inp.focus();
            }
        });
    });

    fbEl.querySelectorAll('.ai-q-input').forEach(inp => {
        inp.addEventListener('input', () => {
            const qIdx = parseInt(inp.getAttribute('data-q-input'), 10);
            stateByQ[qIdx].customVal = inp.value;
            schedulePrefetch(350);
        });
    });

    fbEl.querySelectorAll('.ai-q-unit').forEach(sel => {
        sel.addEventListener('change', () => {
            const qIdx = parseInt(sel.getAttribute('data-q-unit'), 10);
            stateByQ[qIdx].customUnit = sel.value;
            schedulePrefetch(150);
        });
    });

    const confirmBtn = fbEl.querySelector('#btn-ai-dialog-confirm');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            if (prefetchTimer) clearTimeout(prefetchTimer);
            onConfirmAnswers(collectCurrentAnswers());
        });
    }

    const skipBtn = fbEl.querySelector('#btn-ai-dialog-skip');
    if (skipBtn) {
        skipBtn.addEventListener('click', () => onSkip());
    }

    const back1Btn = fbEl.querySelector('#btn-ai-dialog-back1');
    if (back1Btn && onBackToStep1) {
        back1Btn.addEventListener('click', () => onBackToStep1());
    }
}

function applyNutritionResultToDom(result, carbsId, fatId, proteinId, fbEl, nameInputEl) {
    const c = Math.max(0, Math.round(Number(result.carbs) || 0));
    const f = Math.max(0, Math.round(Number(result.fat) || 0));
    const p = Math.max(0, Math.round(Number(result.protein) || 0));

    if (document.getElementById(carbsId)) document.getElementById(carbsId).value = c;
    if (document.getElementById(fatId)) document.getElementById(fatId).value = f;
    if (document.getElementById(proteinId)) document.getElementById(proteinId).value = p;

    if (nameInputEl && result.refinedName && typeof result.refinedName === 'string' && result.refinedName.trim()) {
        nameInputEl.value = result.refinedName.trim();
    }

    const explText = result.explanation || `Berekend op ${c}g KH, ${f}g vet en ${p}g eiwit.`;
    if (fbEl) {
        fbEl.style.display = 'block';
        fbEl.innerHTML = `✨ <b>AI Analyse:</b> ${escapeHtml(explText)}`;
    }
    return { carbs: c, fat: f, protein: p, refinedName: result.refinedName || '', explanation: explText };
}

function applyFallbackToDom(description, err, carbsId, fatId, proteinId, fbEl) {
    const fallback = localFallbackNutrition(description);
    if (document.getElementById(carbsId)) document.getElementById(carbsId).value = fallback.carbs;
    if (document.getElementById(fatId)) document.getElementById(fatId).value = fallback.fat;
    if (document.getElementById(proteinId)) document.getElementById(proteinId).value = fallback.protein;

    const explText = (err && err.message === 'NO_API_KEY')
        ? 'Gemini API-key niet gevonden: snelle standaard schatting ingevuld.'
        : `Standaard schatting ingevuld voor "${description}".`;

    if (fbEl) {
        fbEl.style.display = 'block';
        fbEl.innerHTML = `⚠️ <b>Schatting:</b> ${escapeHtml(explText)}`;
    }
    return { carbs: fallback.carbs, fat: fallback.fat, protein: fallback.protein, refinedName: description, explanation: explText };
}

function setAiLoadingState(btnEl, fbEl, loadingText) {
    if (btnEl) {
        btnEl.disabled = true;
        btnEl.classList.add('btn-loading');
        btnEl.innerHTML = `<span class="ai-spinner"></span> <span>⏳ AI-analyse bezig...</span>`;
    }
    if (fbEl) {
        fbEl.style.display = 'block';
        fbEl.innerHTML = `
            <div class="ai-loading-box">
                <div class="ai-loading-row">
                    <span class="ai-spinner"></span>
                    <span>🐾 ${escapeHtml(loadingText)}</span>
                </div>
                <div class="ai-loading-bar-track"><div class="ai-loading-bar-fill"></div></div>
            </div>`;
    }
}

function clearAiLoadingButton(btnEl, originalBtnHtml) {
    if (btnEl) {
        btnEl.disabled = false;
        btnEl.classList.remove('btn-loading');
        btnEl.innerHTML = originalBtnHtml;
    }
}

async function analyzeNutritionWithAI(inputName, contextType, carbsId, fatId, proteinId, feedbackId, btnEl, wizardCallbacks = null) {
    const description = (inputName || '').trim();
    const fbEl = feedbackId ? document.getElementById(feedbackId) : null;
    if (!description) {
        if (fbEl) fbEl.style.display = 'none';
        showInlineMessage(btnEl, "Typ eerst even wat je eet of drinkt!");
        return null;
    }
    if (btnEl) clearInlineMessages(btnEl.closest('.widget'));

    const isWizard = !!wizardCallbacks;
    const forceStep2 = !!(isWizard && wizardCallbacks.forceStep2);
    const alreadyComplete = !forceStep2 && isDescriptionComplete(description);
    const widgetEl = btnEl ? btnEl.closest('.widget') : null;
    const nameInputEl = widgetEl ? widgetEl.querySelector('input[type="text"]') : null;

    const originalBtnHtml = btnEl ? btnEl.innerHTML : '';

    // Als elk onderdeel al een duidelijke hoeveelheid heeft (bijv. "1 glas melk" of "2 gebakken eieren met 1 plakje spek"),
    // sla Stap 2 dan direct over en bereken meteen de samenvatting voor Stap 3!
    if (alreadyComplete) {
        setAiLoadingState(btnEl, fbEl, 'Alles is al duidelijk! Takkie & Siep berekenen direct je samenvatting...');
        let summary;
        try {
            const directResult = await calculateNutritionDirect(description, [], contextType);
            summary = applyNutritionResultToDom(directResult, carbsId, fatId, proteinId, fbEl, nameInputEl);
        } catch (errDirect) {
            summary = applyFallbackToDom(description, errDirect, carbsId, fatId, proteinId, fbEl);
        } finally {
            clearAiLoadingButton(btnEl, originalBtnHtml);
        }
        if (isWizard && wizardCallbacks.onEnterStep3) {
            wizardCallbacks.onEnterStep3(summary);
        }
        return summary;
    }

    if (isWizard && wizardCallbacks.onEnterStep2) {
        wizardCallbacks.onEnterStep2();
    }
    setAiLoadingState(btnEl, fbEl, 'Snuffel snuffel... Takkie & Siep splitsen je onderdelen uit...');

    let questionsToAsk = null;
    let directAssessment = null;

    try {
        const assessment = await assessOrCalculateWithAI(description, contextType, forceStep2);
        if (!forceStep2 && assessment && assessment.complete === true) {
            if (assessment.carbs !== undefined) {
                directAssessment = assessment;
            } else {
                directAssessment = await calculateNutritionDirect(description, [], contextType);
            }
        } else if (assessment && Array.isArray(assessment.questions) && assessment.questions.length > 0) {
            questionsToAsk = assessment.questions;
        } else {
            questionsToAsk = localIngredientQuestionsFallback(description, contextType);
        }
    } catch (_err) {
        if (isWizard) {
            questionsToAsk = localIngredientQuestionsFallback(description, contextType);
        } else {
            clearAiLoadingButton(btnEl, originalBtnHtml);
            return applyFallbackToDom(description, _err, carbsId, fatId, proteinId, fbEl);
        }
    }

    clearAiLoadingButton(btnEl, originalBtnHtml);

    if (questionsToAsk && fbEl) {
        return await new Promise((resolve) => {
            const runFinalCalculation = async (answersList) => {
                const confirmBtnEl = fbEl.querySelector('#btn-ai-dialog-confirm') || btnEl;
                const origConfirmHtml = confirmBtnEl ? confirmBtnEl.innerHTML : '';
                setAiLoadingState(confirmBtnEl, fbEl, 'Takkie & Siep berekenen nu je samenvatting en macro\'s...');
                let summary;
                try {
                    const finalResult = await calculateNutritionDirect(description, answersList, contextType);
                    summary = applyNutritionResultToDom(finalResult, carbsId, fatId, proteinId, fbEl, answersList.length > 0 ? nameInputEl : null);
                } catch (err2) {
                    const fallbackName = answersList.length > 0 ? `${description} (${answersList.join(', ')})` : description;
                    if (nameInputEl && answersList.length > 0) nameInputEl.value = fallbackName;
                    summary = applyFallbackToDom(fallbackName, err2, carbsId, fatId, proteinId, fbEl);
                } finally {
                    clearAiLoadingButton(confirmBtnEl, origConfirmHtml);
                }
                if (isWizard && wizardCallbacks.onEnterStep3) {
                    wizardCallbacks.onEnterStep3(summary);
                }
                resolve(summary);
            };

            renderClarifyingDialog(
                fbEl,
                questionsToAsk,
                (answers) => runFinalCalculation(answers),
                () => runFinalCalculation([]),
                {
                    isWizard,
                    onPrefetchAnswers: (answers) => {
                        calculateNutritionDirect(description, answers, contextType).catch(() => {});
                    },
                    onBackToStep1: isWizard && wizardCallbacks.onBackToStep1
                        ? () => {
                            wizardCallbacks.onBackToStep1();
                            resolve(null);
                        }
                        : null
                }
            );
        });
    }

    const summary = applyNutritionResultToDom(directAssessment || {}, carbsId, fatId, proteinId, fbEl, null);
    if (isWizard && wizardCallbacks.onEnterStep3) {
        wizardCallbacks.onEnterStep3(summary);
    }
    return summary;
}

async function generateRecipeWithAI(selectedIngredients) {
    const prompt = `Je bent de liefdevolle keto-kok van Takkie & Siep (in warme Fiep Westendorp sfeer).
Bedenk een heerlijk, makkelijk ketogeen recept op basis van deze ingrediënten: ${selectedIngredients.join(', ')}.
Je mag standaard keuken-smaakmakers zoals peper, zeezout, kruiden of olijfolie/roomboter toevoegen.

Geef ALLEEN een geldig JSON-object terug in exact dit formaat:
{
  "name": "<gezellige naam van het recept>",
  "carbs": <geheel getal netto koolhydraten per portie in gram>,
  "fat": <geheel getal vetten per portie in gram>,
  "protein": <geheel getal eiwitten per portie in gram>,
  "ingredients": "<ingrediëntenlijst met hoeveelheden, gescheiden door \\n en beginnend met '- '>",
  "prep": "<genummerde bereidingsstappen, gescheiden door \\n>"
}`;

    const result = await callGeminiJson(prompt);
    const c = Math.max(0, Math.round(Number(result.carbs) || 0));
    const f = Math.max(0, Math.round(Number(result.fat) || 0));
    const p = Math.max(0, Math.round(Number(result.protein) || 0));
    const kcal = (c * 4) + (p * 4) + (f * 9);

    return {
        name: result.name || `Takkie & Siep's ${selectedIngredients[0]} Creatie`,
        carbs: c,
        fat: f,
        protein: p,
        kcal,
        ingredients: result.ingredients || selectedIngredients.map(i => `- ${i}`).join('\n'),
        prep: result.prep || '1. Bereid de ingrediënten met liefde en serveer direct.'
    };
}

function generateSmartRecipeFallback(selectedIngredients) {
    const main = selectedIngredients[0];
    const second = selectedIngredients[1] || "Keto Kruiden";
    let c = 1, f = 35, p = 28;
    if (selectedIngredients.includes("Ribeye")) { f += 15; p += 20; }
    if (selectedIngredients.includes("Avocado")) { c += 2; f += 15; }
    const kcal = (c * 4) + (p * 4) + (f * 9);
    const ingList = selectedIngredients.map(i => `- Een flinke portie ${i.toLowerCase()}`).join('\n') + "\n- Snufje zeezout en peper";
    const prepText = `1. Snijd de ${selectedIngredients.join(' en ').toLowerCase()} in mooie stukjes.\n2. Verhit een klontje roomboter of olijfolie in je favoriete koekenpan.\n3. Bak alles op een rustig vuurtje goudbruin en gaar.\n4. Serveer op een gezellig bordje terwijl Takkie en Siep lief toekijken!`;
    return {
        name: `Takkie & Siep's ${main} & ${second} Feestje`,
        carbs: c,
        fat: f,
        protein: p,
        kcal,
        ingredients: ingList,
        prep: prepText
    };
}
