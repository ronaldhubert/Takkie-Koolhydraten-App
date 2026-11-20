// Gemini AI: macro-analyse, receptgeneratie en lokale fallback.
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
// AI ANALYSE (GEMINI API + FALLBACK)
// ==========================================
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
        // Als er een Supabase Edge Function 'gemini-ai' is ingesteld, probeer die dan aan te roepen
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

async function analyzeNutritionWithAI(inputName, contextType, carbsId, fatId, proteinId, feedbackId, btnEl) {
    const description = (inputName || '').trim();
    const fbEl = feedbackId ? document.getElementById(feedbackId) : null;
    if (!description) {
        if (fbEl) {
            fbEl.style.display = 'block';
            fbEl.innerText = "🐾 Typ eerst even wat je eet of drinkt, dan rekenen Takkie & Siep de macro's voor je uit!";
        } else {
            showInlineMessage(btnEl, "Typ eerst even wat je eet of drinkt, dan rekenen Takkie & Siep de macro's voor je uit!", 'error');
        }
        return;
    }
    const originalBtnText = btnEl ? btnEl.innerText : '';
    if (btnEl) {
        btnEl.disabled = true;
        btnEl.innerText = '🐾 Takkie & Siep rekenen met AI...';
    }
    if (fbEl) {
        fbEl.style.display = 'block';
        fbEl.innerText = '🐶 Snuffel snuffel... macro\'s worden berekend...';
    }

    const isDrink = contextType === 'drink';
    const prompt = `Je bent de liefdevolle keto-voedingsexpert van Takkie & Siep.
Bereken een realistische schatting van de netto koolhydraten (carbs), vetten (fat) en eiwitten (protein) in hele grammen voor het volgende ${isDrink ? 'drankje (LET OP: geef de waarden per 1 standaard glas/kopje, tenzij de gebruiker expliciet een specifieke hoeveelheid in ml noemt)' : 'gerecht of voedingsmiddel'}:
"${description}"

Geef ALLEEN een geldig JSON-object terug in dit formaat:
{
  "carbs": <geheel getal in grammen>,
  "fat": <geheel getal in grammen>,
  "protein": <geheel getal in grammen>,
  "explanation": "<korte, warme Nederlandse toelichting van 1 zin namens Takkie & Siep over de aangenomen portie en macro's>"
}`;

    try {
        const result = await callGeminiJson(prompt);
        const c = Math.max(0, Math.round(Number(result.carbs) || 0));
        const f = Math.max(0, Math.round(Number(result.fat) || 0));
        const p = Math.max(0, Math.round(Number(result.protein) || 0));

        document.getElementById(carbsId).value = c;
        document.getElementById(fatId).value = f;
        document.getElementById(proteinId).value = p;

        if (fbEl) {
            fbEl.innerHTML = `✨ <b>AI Analyse:</b> ${escapeHtml(result.explanation || `Berekend op ${c}g KH, ${f}g vet en ${p}g eiwit.`)}`;
        }
    } catch (err) {
        const fallback = localFallbackNutrition(description);
        document.getElementById(carbsId).value = fallback.carbs;
        document.getElementById(fatId).value = fallback.fat;
        document.getElementById(proteinId).value = fallback.protein;

        if (fbEl) {
            if (err.message === 'NO_API_KEY') {
                fbEl.innerHTML = `⚠️ <b>Gemini API-key nog niet gevonden in Supabase:</b> We hebben nu een snelle schatting ingevuld. Sla je sleutel op in de <code>app_settings</code> tabel in Supabase.`;
            } else {
                fbEl.innerHTML = `⚠️ <b>AI tijdelijk niet bereikbaar (${escapeHtml(err.message)}):</b> We hebben een standaard schatting ingevuld.`;
            }
        }
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
        kcal: kcal,
        ingredients: Array.isArray(result.ingredients) ? result.ingredients.join('\n') : String(result.ingredients || ''),
        prep: Array.isArray(result.prep) ? result.prep.join('\n') : String(result.prep || '')
    };
}

function generateSmartRecipeFallback(selectedIngredients) {
    const items = selectedIngredients.length > 0 ? selectedIngredients : ['Eieren', 'Roomboter', 'Avocado'];
    const macroMap = {
        'Eieren': { c: 1, f: 11, p: 13, line: '- 2 verse vrije-uitloop eieren', step: 'Klop of bak de eieren zachtjes zodat ze heerlijk smeuïg blijven.' },
        'Spek': { c: 0, f: 20, p: 12, line: '- 4 plakjes krokant ontbijtspek', step: 'Bak het spek in een koekenpan tot het goudbruin en knapperig is.' },
        'Avocado': { c: 2, f: 15, p: 2, line: '- 1 rijpe avocado in plakjes', step: 'Snijd de avocado in mooie partjes en leg deze liefdevol op het bord.' },
        'Roomboter': { c: 0, f: 12, p: 0, line: '- Een flinke klont roomboter', step: 'Smelt een royale klont roomboter in de warme pan voor extra smaak en brandstof.' },
        'Kruidenboter': { c: 0, f: 12, p: 0, line: '- Een lekkere lepel kruidenboter', step: 'Laat een klontje kruidenboter zachtjes smelten over het gerecht.' },
        'Zalm': { c: 0, f: 18, p: 25, line: '- 150g verse zalmfilet', step: 'Bak de zalmfilet op de huid in 4-5 minuutjes mooi rosé vanbinnen.' },
        'Ribeye': { c: 0, f: 28, p: 32, line: '- 180g malse ribeye steak', step: 'Schroei de ribeye op hoog vuur dicht en laat hem even rusten onder een dekentje van folie.' },
        'Kipfilet': { c: 0, f: 4, p: 35, line: '- 150g malse kipfilet in blokjes', step: 'Bak de kipfilet goudbruin en gaar in de pan.' },
        'Kipfilet beleg': { c: 0, f: 2, p: 12, line: '- 4 plakjes kipfilet beleg', step: 'Rol de plakjes kipfilet beleg gezellig op als rolletjes.' },
        'Ham': { c: 1, f: 4, p: 14, line: '- 4 plakjes lekkere achterham', step: 'Snijd of rol de plakjes ham en voeg ze toe.' },
        'Kaas': { c: 0, f: 17, p: 13, line: '- 50g geraspte of plakjes volvette kaas', step: 'Laat de kaas heerlijk smelten voor een romig laagje.' },
        'Brie': { c: 0, f: 18, p: 11, line: '- 60g romige Franse brie in plakjes', step: 'Leg de plakjes romige brie erop zodat ze zacht worden.' },
        'Kwark': { c: 5, f: 8, p: 12, line: '- 150g volle romige kwark', step: 'Schep de volle kwark in een gezellig kommetje.' },
        'Hüttenkäse': { c: 3, f: 4, p: 12, line: '- 100g frisse Hüttenkäse', step: 'Schep de frisse Hüttenkäse erbij en roer zachtjes door.' },
        'Pecannoten': { c: 1, f: 18, p: 2, line: '- Een handje (25g) knapperige pecannoten', step: 'Hak de pecannoten grof en strooi ze er als knapperige topping overheen.' },
        'Walnoten': { c: 1, f: 16, p: 4, line: '- Een handje (25g) walnoten', step: 'Breek de walnoten in stukjes en strooi ze er liefdevol overheen.' }
    };

    let c = 1, f = 0, p = 0;
    const ingLines = [];
    const prepLines = [];

    items.forEach((item, idx) => {
        const info = macroMap[item] || { c: 1, f: 10, p: 8, line: `- ${item}`, step: `Bereid ${item.toLowerCase()} met aandacht.` };
        c += info.c;
        f += info.f;
        p += info.p;
        ingLines.push(info.line);
        prepLines.push(`${idx + 1}. ${info.step}`);
    });

    ingLines.push('- Snufje zeezout en zwarte peper');
    prepLines.push(`${prepLines.length + 1}. Breng op smaak met peper en zeezout, en geniet samen met Takkie & Siep!`);

    const kcal = (c * 4) + (p * 4) + (f * 9);
    const title = items.length === 1
        ? `Takkie's Liefdevolle ${items[0]} Schotel`
        : `Siep & Takkie's ${items.slice(0, 2).join(' & ')} Feestje`;

    return {
        name: title,
        carbs: c,
        fat: f,
        protein: p,
        kcal: kcal,
        ingredients: ingLines.join('\n'),
        prep: prepLines.join('\n')
    };
}
