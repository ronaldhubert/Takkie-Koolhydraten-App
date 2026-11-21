// Gemini AI: interactieve dialoog voor macro-analyse (met snelknoppen voor gram, ml, plakjes, aantal), receptgeneratie en lokale fallback.
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
    ml: ['50 ml', '100 ml', '150 ml', '250 ml', '330 ml'],
    plakjes: ['1 plakje', '2 plakjes', '3 plakjes', '4 plakjes', '6 plakjes'],
    el: ['½ el', '1 el', '2 el', '1 tl'],
    tl: ['½ tl', '1 tl', '2 tl', '1 el'],
    keuze: []
};

const UNIT_SELECT_OPTIONS = [
    { value: 'g', label: 'gram (g)' },
    { value: 'ml', label: 'ml' },
    { value: 'plakjes', label: 'plakjes' },
    { value: 'stuks', label: 'stuks' },
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

    const models = ['gemini-3.8-flash', 'gemini-flash-latest'];
    let lastError = null;

    for (const model of models) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: {
                    temperature: 0.2,
                    responseMimeType: 'application/json'
                }
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            lastError = new Error(errData?.error?.message || `HTTP ${response.status}`);
            continue;
        }

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
    const subject = (questionObj.subject || questionObj.question || 'Onderdeel').trim();
    const typed = (customValue || '').trim();
    if (typed) {
        const hasUnitAlready = /[a-zA-Z]/.test(typed);
        const unitSuffix = (!hasUnitAlready && customUnit) ? ` ${customUnit}` : '';
        return `${subject}: ${typed}${unitSuffix}`;
    }
    if (selectedChip) {
        return `${subject}: ${selectedChip}`;
    }
    return '';
}

async function assessOrCalculateWithAI(description, contextType) {
    const isDrink = contextType === 'drink';
    const prompt = `Je bent de liefdevolle keto-voedingsexpert van Takkie & Siep.
De gebruiker wil het volgende ${isDrink ? 'drankje (per glas/kopje)' : 'gerecht of voedingsmiddel'} loggen:
"${description}"

STAP 1: Beoordeel of de hoeveelheden, aantallen, gewichten (gram/ml/plakjes/stuks) of soort/bereiding duidelijk genoeg zijn om de macronutriënten betrouwbaar te berekenen.
- Als belangrijke hoeveelheden ontbreken (bijv. "roerei met spek" zonder aantal eieren of gram/plakjes spek; "kwark met noten" zonder gram kwark of gram noten; "kaas" zonder aantal plakjes of gram; "koffie" zonder te weten of het zwart of met melk/room is; "vlees/vis/kip" zonder gewicht in gram), zet dan "complete": false en stel 1 tot maximaal 3 korte, vriendelijke vervolgvragen.
- Kies per vraag de meest passende eenheid ("unit") uit: "stuks", "g", "ml", "plakjes", "el", "tl", of "keuze".
- Geef per vraag 3 tot 5 handige snelknop-opties in "options" (bijv. bij eieren: ["1 ei", "2 eieren", "3 eieren", "4 eieren"]; bij spek: ["2 plakjes (30g)", "3 plakjes (45g)", "4 plakjes (60g)", "75 g"]; bij vlees/vis/kwark: ["100 g", "150 g", "200 g", "250 g"]; bij drank/room: ["50 ml", "150 ml", "200 ml", "250 ml"]).
- Als de invoer WEL al specifiek genoeg is (bijv. "2 eieren met 50g spek" of "200g ribeye met 15g kruidenboter" of "1 glas droge witte wijn"), zet dan "complete": true en bereken direct de macro's.

Geef ALLEEN een geldig JSON-object terug in exact één van deze twee formaten:
Formaat A (als alles al duidelijk is):
{
  "complete": true,
  "carbs": <geheel getal netto koolhydraten in gram>,
  "fat": <geheel getal vetten in gram>,
  "protein": <geheel getal eiwitten in gram>,
  "explanation": "<korte, warme Nederlandse toelichting van 1 zin namens Takkie & Siep over de berekende portie en macro's>"
}

Formaat B (als verduidelijking nodig is):
{
  "complete": false,
  "questions": [
    {
      "id": "q1",
      "subject": "<kort onderwerp, bijv. Eieren of Spek of Bereiding>",
      "question": "<korte vriendelijke vraag in het Nederlands>",
      "unit": "<stuks|g|ml|plakjes|el|tl|keuze>",
      "options": ["<optie 1>", "<optie 2>", "<optie 3>", "<optie 4>"]
    }
  ]
}`;

    return await callGeminiJson(prompt);
}

async function calculateNutritionDirect(description, answersList, contextType) {
    const isDrink = contextType === 'drink';
    const extraDetails = (answersList && answersList.length > 0)
        ? `\nAanvullende antwoorden van de gebruiker:\n- ${answersList.join('\n- ')}`
        : '';

    const prompt = `Je bent de liefdevolle keto-voedingsexpert van Takkie & Siep.
Bereken een nauwkeurige schatting van de netto koolhydraten (carbs), vetten (fat) en eiwitten (protein) in hele grammen voor het volgende ${isDrink ? 'drankje (geef de waarden per 1 glas/kopje, tenzij de gebruiker een specifieke hoeveelheid in ml koos)' : 'gerecht of voedingsmiddel'}:
Omschrijving: "${description}"${extraDetails}

Geef ALLEEN een geldig JSON-object terug in dit formaat:
{
  "carbs": <geheel getal in grammen>,
  "fat": <geheel getal in grammen>,
  "protein": <geheel getal in grammen>,
  "refinedName": "<beknopte omschrijving inclusief de gekozen hoeveelheden, bijv. '2 roereieren met 3 plakjes spek'>",
  "explanation": "<korte, warme Nederlandse toelichting van 1 zin namens Takkie & Siep over de aangenomen portie en macro's>"
}`;

    return await callGeminiJson(prompt);
}

function renderClarifyingDialog(fbEl, questions, onConfirmAnswers, onSkip) {
    if (!fbEl) return;
    fbEl.style.display = 'block';

    const normalizedQuestions = (questions || []).slice(0, 3).map((q, idx) => {
        const unit = UNIT_QUICK_PICKS[q.unit] ? q.unit : 'g';
        const defaultOpts = UNIT_QUICK_PICKS[unit] || [];
        const opts = (Array.isArray(q.options) && q.options.length > 0) ? q.options : defaultOpts;
        return {
            id: q.id || ('q' + idx),
            subject: q.subject || `Vraag ${idx + 1}`,
            question: q.question || `Hoeveel ${q.subject || ''} bedoel je?`,
            unit,
            options: opts
        };
    });

    const stateByQ = normalizedQuestions.map(q => ({
        selectedChip: q.options[0] || '',
        customVal: '',
        customUnit: q.unit === 'keuze' ? '' : q.unit
    }));

    const questionsHtml = normalizedQuestions.map((q, qIdx) => {
        const petIcon = qIdx % 2 === 0 ? '🐶 Takkie' : '🐱 Siepie';
        const chipsHtml = q.options.map((opt, oIdx) => `
            <button type="button" class="ai-q-chip${oIdx === 0 ? ' active' : ''}" data-q-idx="${qIdx}" data-chip-val="${escapeHtml(opt)}">${escapeHtml(opt)}</button>
        `).join('');

        const unitOptionsHtml = UNIT_SELECT_OPTIONS.map(u => `
            <option value="${u.value}"${u.value === stateByQ[qIdx].customUnit ? ' selected' : ''}>${u.label}</option>
        `).join('');

        const inputPlaceholder = q.unit === 'keuze'
            ? 'Of typ zelf...'
            : 'Eigen aantal/gewicht...';

        return `
            <div class="ai-q-block" data-q-block="${qIdx}">
                <div class="ai-q-title">${petIcon} vraagt: ${escapeHtml(q.question)}</div>
                <div class="ai-q-chips">${chipsHtml}</div>
                <div class="ai-q-custom-row">
                    <span class="ai-q-custom-label">Of zelf:</span>
                    <input type="${q.unit === 'keuze' ? 'text' : 'number'}" min="0" step="any" class="ai-q-input" data-q-input="${qIdx}" placeholder="${inputPlaceholder}">
                    <select class="ai-q-unit" data-q-unit="${qIdx}">${unitOptionsHtml}</select>
                </div>
            </div>`;
    }).join('');

    fbEl.innerHTML = `
        <div class="ai-dialog-box">
            <div class="ai-dialog-intro">🐾 Even samen precies maken voor de beste macro's! Tik op een snelknop of vul het zelf in:</div>
            ${questionsHtml}
            <div class="ai-dialog-actions">
                <button type="button" class="btn ai-dialog-submit" id="btn-ai-dialog-confirm">✅ Bereken macro's</button>
                <button type="button" class="btn ai-dialog-skip" id="btn-ai-dialog-skip">⏭️ Sla over</button>
            </div>
        </div>`;

    fbEl.querySelectorAll('.ai-q-chip').forEach(chipBtn => {
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
            }
        });
    });

    fbEl.querySelectorAll('.ai-q-input').forEach(inp => {
        inp.addEventListener('input', () => {
            const qIdx = parseInt(inp.getAttribute('data-q-input'), 10);
            stateByQ[qIdx].customVal = inp.value;
            const block = fbEl.querySelector(`[data-q-block="${qIdx}"]`);
            if (block) {
                if (inp.value.trim()) {
                    block.querySelectorAll('.ai-q-chip').forEach(b => b.classList.remove('active'));
                }
            }
        });
    });

    fbEl.querySelectorAll('.ai-q-unit').forEach(sel => {
        sel.addEventListener('change', () => {
            const qIdx = parseInt(sel.getAttribute('data-q-unit'), 10);
            stateByQ[qIdx].customUnit = sel.value;
        });
    });

    const confirmBtn = fbEl.querySelector('#btn-ai-dialog-confirm');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            const answers = normalizedQuestions
                .map((q, idx) => formatClarifyingAnswer(q, stateByQ[idx].selectedChip, stateByQ[idx].customVal, stateByQ[idx].customUnit))
                .filter(Boolean);
            onConfirmAnswers(answers);
        });
    }

    const skipBtn = fbEl.querySelector('#btn-ai-dialog-skip');
    if (skipBtn) {
        skipBtn.addEventListener('click', () => {
            onSkip();
        });
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

    if (fbEl) {
        fbEl.style.display = 'block';
        fbEl.innerHTML = `✨ <b>AI Analyse:</b> ${escapeHtml(result.explanation || `Berekend op ${c}g KH, ${f}g vet en ${p}g eiwit.`)}`;
    }
}

function applyFallbackToDom(description, err, carbsId, fatId, proteinId, fbEl) {
    const fallback = localFallbackNutrition(description);
    if (document.getElementById(carbsId)) document.getElementById(carbsId).value = fallback.carbs;
    if (document.getElementById(fatId)) document.getElementById(fatId).value = fallback.fat;
    if (document.getElementById(proteinId)) document.getElementById(proteinId).value = fallback.protein;

    if (fbEl) {
        fbEl.style.display = 'block';
        if (err && err.message === 'NO_API_KEY') {
            fbEl.innerHTML = `⚠️ <b>Gemini API-key nog niet gevonden in Supabase:</b> We hebben nu een snelle schatting ingevuld. Sla je sleutel op in de <code>app_settings</code> tabel in Supabase.`;
        } else {
            fbEl.innerHTML = `⚠️ <b>AI tijdelijk niet bereikbaar (${escapeHtml(err?.message || 'fout')}):</b> We hebben een standaard schatting ingevuld.`;
        }
    }
}

async function analyzeNutritionWithAI(inputName, contextType, carbsId, fatId, proteinId, feedbackId, btnEl) {
    const description = (inputName || '').trim();
    const fbEl = feedbackId ? document.getElementById(feedbackId) : null;
    if (!description) {
        if (fbEl) fbEl.style.display = 'none';
        showInlineMessage(btnEl, "Typ eerst even wat je eet of drinkt, dan rekenen Takkie & Siep de macro's voor je uit!");
        return;
    }
    if (btnEl) clearInlineMessages(btnEl.closest('.widget'));

    // Zoek het bijbehorende naam-invoerveld zodat we het na de dialoog kunnen aanvullen met de gekozen hoeveelheden
    const widgetEl = btnEl ? btnEl.closest('.widget') : null;
    const nameInputEl = widgetEl ? widgetEl.querySelector('input[type="text"]') : null;

    const originalBtnText = btnEl ? btnEl.innerText : '';
    if (btnEl) {
        btnEl.disabled = true;
        btnEl.innerText = '🐾 Takkie & Siep kijken mee...';
    }
    if (fbEl) {
        fbEl.style.display = 'block';
        fbEl.innerText = '🐶 Snuffel snuffel... even kijken of alles duidelijk is...';
    }

    try {
        const assessment = await assessOrCalculateWithAI(description, contextType);

        if (assessment && assessment.complete === false && Array.isArray(assessment.questions) && assessment.questions.length > 0 && fbEl) {
            if (btnEl) {
                btnEl.disabled = false;
                btnEl.innerText = originalBtnText;
            }

            return await new Promise((resolve) => {
                const runFinalCalculation = async (answersList) => {
                    if (btnEl) {
                        btnEl.disabled = true;
                        btnEl.innerText = '🐾 Takkie & Siep rekenen met AI...';
                    }
                    fbEl.innerText = '🐶 Snuffel snuffel... macro\'s worden nu precies berekend...';
                    try {
                        const finalResult = await calculateNutritionDirect(description, answersList, contextType);
                        applyNutritionResultToDom(finalResult, carbsId, fatId, proteinId, fbEl, answersList.length > 0 ? nameInputEl : null);
                    } catch (err2) {
                        applyFallbackToDom(description, err2, carbsId, fatId, proteinId, fbEl);
                    } finally {
                        if (btnEl) {
                            btnEl.disabled = false;
                            btnEl.innerText = originalBtnText;
                        }
                        resolve();
                    }
                };

                renderClarifyingDialog(
                    fbEl,
                    assessment.questions,
                    (answers) => runFinalCalculation(answers),
                    () => runFinalCalculation([])
                );
            });
        }

        // Invoer was al specifiek genoeg: vul direct de berekende macro's in
        applyNutritionResultToDom(assessment, carbsId, fatId, proteinId, fbEl, null);
    } catch (err) {
        applyFallbackToDom(description, err, carbsId, fatId, proteinId, fbEl);
    } finally {
        if (btnEl) {
            btnEl.disabled = false;
            btnEl.innerText = originalBtnText;
        }
    }
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
