// ==========================================
// SUPABASE SETUP & GLOBALS
// ==========================================
let currentUser = null;
let currentRecipeIndex = null;
let editingMealIndex = null;
let editingFavoriteIndex = null;
let previousTabBeforeFavorites = 'home';

let appState = {
    water: 0,
    meals: [],
    recipes: [],
    savedItems: [],
    goals: { carbs: 25, fat: 110, protein: 90, kcal: 2000 },
    points: 0,
    streak: 0,
    dailyLogId: null,
    geminiApiKey: null
};

const motivationalQuotes = [
    { text: "Woef! Vandaag zorgen we heel lief en goed voor elkaar.", author: "— Takkie & Siepie" },
    { text: "Elke kleine stap is er een naar een gelukkig en gezond gevoel. Je doet het ontzettend goed!", author: "— Takkie de Hond" },
    { text: "Miauw... neem even een rustig momentje voor jezelf vandaag. Je mag trots op je zijn.", author: "— Siepie de Kat" },
    { text: "Zachtjes volhouden is ook winnen. Takkie kwispelt speciaal voor jou!", author: "— Takkie & Siepie" },
    { text: "Laat los wat niet lukt, morgen is er weer een prachtige dag om opnieuw te stralen.", author: "— Takkie" },
    { text: "Je bent een kanjer, elke dag een klein stukje sterker en liever voor je lijf.", author: "— Takkie & Siepie" },
    { text: "Snuffel de dag vrolijk tegemoet! Eén gezond hapje tegelijk is al helemaal geweldig.", author: "— Takkie" },
    { text: "Prrrr... rek je even lekker uit zoals ik op het vloerkleed. Jij verdient vandaag alle zachtheid.", author: "— Siepie" },
    { text: "Ook op een regenachtige dag ben jij ons eigen warme zonnetje in huis.", author: "— Takkie & Siepie" },
    { text: "Vergeet je niet een lekker glaasje water te drinken? Wij slobberen gezellig met je mee!", author: "— Takkie" },
    { text: "Je hoeft helemaal niet streng te zijn voor jezelf; liefdevol zorgen werkt veel beter.", author: "— Siepie" },
    { text: "Mijn korte pootjes zetten kleine stapjes, maar ik kom altijd waar ik wezen wil. Jij ook!", author: "— Takkie" },
    { text: "Een klontje roomboter, een eitje en een dikke knuffel van ons: dat wordt een topdag!", author: "— Takkie & Siepie" },
    { text: "Miauw! Kijk eens in de spiegel en geef jezelf een complimentje. Wij vinden je prachtig.", author: "— Siepie" },
    { text: "Als het even lastig is, kruip ik dicht tegen je aan. Samen kunnen we alles aan!", author: "— Takkie" },
    { text: "Gezond voor jezelf zorgen is het mooiste cadeautje dat je jezelf vandaag kunt geven.", author: "— Takkie & Siepie" },
    { text: "Soms heb je een sprint-dag, soms een dutjes-dag op de vensterbank. Allebei is helemaal goed.", author: "— Siepie" },
    { text: "Woef! Mijn staartje maakt overuren omdat ik zo blij ben dat je zo goed voor jezelf zorgt.", author: "— Takkie" },
    { text: "Foutjes bestaan helemaal niet in ons dagboekje, alleen nieuwe kansen om lief te beginnen.", author: "— Takkie & Siepie" },
    { text: "Luister goed naar je buikje en je hartje, die weten precies wat je nodig hebt vandaag.", author: "— Siepie" },
    { text: "Kom, we gaan met onze neus in de wind en maken er een vrolijk avontuur van!", author: "— Takkie" },
    { text: "Elke keer dat je iets gezonds kiest, geven Takkie en ik elkaar een vrolijke high-five met onze pootjes.", author: "— Siepie" },
    { text: "Je doet het op jouw eigen tempo, en dat tempo is precies goed zoals het is.", author: "— Takkie & Siepie" },
    { text: "Zelfs de allerlangste wandeling begint met één vrolijk huppeltje naar de voordeur.", author: "— Takkie" },
    { text: "Spinnend op schoot fluister ik het nog een keer: je bent goed bezig, lieverd!", author: "— Siepie" },
    { text: "Wees net zo lief voor jezelf als je altijd voor ons bent. Dat heb je dubbel en dwars verdiend.", author: "— Takkie & Siepie" },
    { text: "Een lekkere maaltijd klaarmaken voor jezelf is pure liefde op een bordje.", author: "— Takkie" },
    { text: "Maak je niet druk om gisteren of morgen; vandaag liggen we lekker warm in het zonnetje.", author: "— Siepie" },
    { text: "Woef woef! Ik geef je een natte neuzen-kus omdat je zo dapper volhoudt.", author: "— Takkie" },
    { text: "Geen haast, geen stress, alleen een kopje thee en een rustig muziekje. Prrrr...", author: "— Siepie" },
    { text: "Wat er vandaag ook gebeurt: Takkie kwispelt en Siepie spint altijd voor jou!", author: "— Takkie & Siepie" }
];

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
// AUTHENTICATIE LOGICA
// ==========================================
async function checkUser() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (session) {
        currentUser = session.user;
        showApp();
        await loadUserData();
    } else {
        showAuth();
    }

    window.supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        if (session) {
            const isDifferentUser = !currentUser || currentUser.id !== session.user.id;
            currentUser = session.user;
            showApp();
            if (isDifferentUser) {
                await loadUserData();
            }
        } else {
            currentUser = null;
            showAuth();
        }
    });
}

function showAuth() {
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
}

function showApp() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    getRandomQuote();
}

function showAuthError(msg) {
    const errEl = document.getElementById('auth-error-message');
    if (errEl) {
        errEl.innerText = msg;
        errEl.style.display = 'block';
    }
}

// ==========================================
// DATABASE LOGICA
// ==========================================
async function calculateStreak() {
    if (!currentUser) return;
    const { data } = await window.supabaseClient.from('meals')
        .select('date')
        .eq('user_id', currentUser.id)
        .order('date', { ascending: false });

    if (!data || data.length === 0) {
        appState.streak = 0;
        return;
    }

    const uniqueDates = [...new Set(data.map(d => d.date))];
    let streak = 0;
    let checkDate = new Date();

    for (let i = 0; i < uniqueDates.length; i++) {
        let dStr = formatDateLocal(checkDate);
        if (uniqueDates.includes(dStr)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            if (i === 0) {
                checkDate.setDate(checkDate.getDate() - 1);
                dStr = formatDateLocal(checkDate);
                if (uniqueDates.includes(dStr)) {
                    streak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                    continue;
                }
            }
            break;
        }
    }
    appState.streak = streak;
}

async function loadUserData() {
    if (!currentUser) return;
    const today = getTodayString();

    const { data: profileData } = await window.supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

    if (profileData) {
        appState.points = profileData.points || 0;
        appState.goals.carbs = profileData.goal_carbs || 25;
        appState.goals.fat = profileData.goal_fat || 110;
        appState.goals.protein = profileData.goal_protein || 90;
        appState.goals.kcal = profileData.goal_kcal || 2000;
        if (profileData.gemini_api_key) {
            appState.geminiApiKey = profileData.gemini_api_key.trim();
        }
    } else {
        await window.supabaseClient.from('profiles').upsert([{
            id: currentUser.id,
            points: 0,
            goal_carbs: 25,
            goal_fat: 110,
            goal_protein: 90,
            goal_kcal: 2000
        }]);
    }

    if (!appState.geminiApiKey) {
        await getGeminiApiKey();
    }

    const { data: logData } = await window.supabaseClient
        .from('daily_logs')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('date', today)
        .maybeSingle();

    if (logData) {
        appState.dailyLogId = logData.id;
        appState.water = logData.water || 0;
    } else {
        const { data: newLog } = await window.supabaseClient
            .from('daily_logs')
            .insert([{ user_id: currentUser.id, date: today, water: 0 }])
            .select()
            .single();
        if (newLog) {
            appState.dailyLogId = newLog.id;
            appState.water = 0;
        }
    }

    const { data: mealsData } = await window.supabaseClient
        .from('meals')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('date', today);
    appState.meals = mealsData || [];

    const { data: recipesData } = await window.supabaseClient
        .from('recipes')
        .select('*')
        .eq('user_id', currentUser.id);
    appState.recipes = recipesData || [];

    const { data: savedItemsData } = await window.supabaseClient
        .from('saved_items')
        .select('*')
        .eq('user_id', currentUser.id);
    appState.savedItems = savedItemsData || [];

    await calculateStreak();
    renderApp();
}

async function addPoints(amount) {
    if (!currentUser) return;
    appState.points += amount;
    renderApp();
    await window.supabaseClient
        .from('profiles')
        .update({ points: appState.points })
        .eq('id', currentUser.id);
}

async function updateWater(amount) {
    if (!currentUser || !appState.dailyLogId) return;
    appState.water = amount;
    renderApp();
    await window.supabaseClient
        .from('daily_logs')
        .update({ water: amount })
        .eq('id', appState.dailyLogId);
}

async function saveMeal(type, name, carbs, fat, protein) {
    if (!currentUser) return;
    const newMeal = {
        user_id: currentUser.id,
        date: getTodayString(),
        type,
        name,
        carbs: Number(carbs) || 0,
        fat: Number(fat) || 0,
        protein: Number(protein) || 0
    };
    const { data: inserted } = await window.supabaseClient
        .from('meals')
        .insert([newMeal])
        .select()
        .single();
    appState.meals.push(inserted || newMeal);
    await calculateStreak();
    renderApp();
}

async function saveRecipe(name, carbs, fat, protein, kcal, ingredients, prep) {
    if (!currentUser) return null;
    const newRecipe = {
        user_id: currentUser.id,
        name,
        carbs: formatGramLabel(carbs, 'g KH'),
        fat: formatGramLabel(fat, 'g Vet'),
        protein: formatGramLabel(protein, 'g Eiwit'),
        kcal: formatGramLabel(kcal, ' kcal'),
        ingredients,
        prep
    };
    const { data: inserted } = await window.supabaseClient
        .from('recipes')
        .insert([newRecipe])
        .select()
        .single();
    const saved = inserted || newRecipe;
    appState.recipes.push(saved);
    renderApp();
    return appState.recipes.length - 1;
}

async function repeatYesterdayMeals() {
    if (!currentUser) return;
    const yesterday = getYesterdayString();
    const { data: yesterdayMeals } = await window.supabaseClient
        .from('meals')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('date', yesterday);

    if (!yesterdayMeals || yesterdayMeals.length === 0) {
        alert("Woef! We vonden geen gelogde hapjes van gisteren. Voeg vandaag lekker iets nieuws toe!");
        return;
    }

    const today = getTodayString();
    const toInsert = yesterdayMeals.map(m => ({
        user_id: currentUser.id,
        date: today,
        type: m.type,
        name: m.name,
        carbs: Number(m.carbs) || 0,
        fat: Number(m.fat) || 0,
        protein: Number(m.protein) || 0
    }));

    const { data: inserted } = await window.supabaseClient
        .from('meals')
        .insert(toInsert)
        .select();

    if (inserted && inserted.length > 0) {
        appState.meals.push(...inserted);
    } else {
        appState.meals.push(...toInsert);
    }

    await calculateStreak();
    await addPoints(10);
    const speechEl = document.getElementById('takkie-speech');
    if (speechEl) {
        speechEl.innerText = `"Woef! We hebben je ${toInsert.length} hapje(s) van gisteren weer klaargezet!"`;
    }
}

async function updateProfileGoals() {
    if (!currentUser) return;
    appState.goals.carbs = parseInt(document.getElementById('slider-carbs').value, 10);
    appState.goals.fat = parseInt(document.getElementById('slider-fat').value, 10);
    appState.goals.protein = parseInt(document.getElementById('slider-protein').value, 10);
    appState.goals.kcal = parseInt(document.getElementById('slider-kcal').value, 10);
    renderApp();
    await window.supabaseClient.from('profiles').update({
        goal_carbs: appState.goals.carbs,
        goal_fat: appState.goals.fat,
        goal_protein: appState.goals.protein,
        goal_kcal: appState.goals.kcal
    }).eq('id', currentUser.id);
}

// ==========================================
// GELOGDE MAALTIJD / DRANK WIJZIGEN & VERWIJDEREN
// ==========================================
window.openEditMeal = function(idx) {
    const meal = appState.meals[idx];
    if (!meal) return;
    editingMealIndex = idx;

    const typeSelect = document.getElementById('edit-meal-type');
    if (typeSelect) {
        // Voeg eventueel afwijkend type toe als optie zodat niets verloren gaat
        const exists = Array.from(typeSelect.options).some(opt => opt.value === meal.type);
        if (!exists && meal.type) {
            const opt = document.createElement('option');
            opt.value = meal.type;
            opt.textContent = meal.type;
            typeSelect.appendChild(opt);
        }
        typeSelect.value = meal.type || '🍳 Ontbijt';
    }

    document.getElementById('edit-meal-name').value = meal.name || '';
    document.getElementById('edit-meal-carbs').value = Number(meal.carbs) || 0;
    document.getElementById('edit-meal-fat').value = Number(meal.fat) || 0;
    document.getElementById('edit-meal-protein').value = Number(meal.protein) || 0;

    const fb = document.getElementById('ai-edit-meal-feedback');
    if (fb) fb.style.display = 'none';

    switchTab('edit-meal');
};

async function saveEditedMeal() {
    if (editingMealIndex === null || !appState.meals[editingMealIndex]) return;
    const meal = appState.meals[editingMealIndex];

    const newType = document.getElementById('edit-meal-type').value;
    const newName = document.getElementById('edit-meal-name').value.trim();
    const newCarbs = parseInt(document.getElementById('edit-meal-carbs').value, 10) || 0;
    const newFat = parseInt(document.getElementById('edit-meal-fat').value, 10) || 0;
    const newProtein = parseInt(document.getElementById('edit-meal-protein').value, 10) || 0;

    if (!newName) return alert("Vul alsjeblieft een naam in!");

    const oldName = meal.name;
    const oldType = meal.type;

    meal.type = newType;
    meal.name = newName;
    meal.carbs = newCarbs;
    meal.fat = newFat;
    meal.protein = newProtein;

    renderApp();

    if (meal.id) {
        await window.supabaseClient
            .from('meals')
            .update({ type: newType, name: newName, carbs: newCarbs, fat: newFat, protein: newProtein })
            .eq('id', meal.id);
    } else if (currentUser) {
        await window.supabaseClient
            .from('meals')
            .update({ type: newType, name: newName, carbs: newCarbs, fat: newFat, protein: newProtein })
            .eq('user_id', currentUser.id)
            .eq('date', meal.date || getTodayString())
            .eq('name', oldName)
            .eq('type', oldType);
    }

    editingMealIndex = null;
    switchTab('home');
}

window.deleteMeal = async function(idx) {
    if (confirm("Weet je zeker dat je dit hapje wilt vergeten?")) {
        const mealToDel = appState.meals[idx];
        appState.meals.splice(idx, 1);
        renderApp();
        if (mealToDel && mealToDel.id) {
            await window.supabaseClient.from('meals').delete().eq('id', mealToDel.id);
            await calculateStreak();
            renderApp();
        }
    }
};

// ==========================================
// FAVORIETEN BEHEREN, WIJZIGEN & VERWIJDEREN
// ==========================================
function openFavoritesManager(fromTab) {
    previousTabBeforeFavorites = fromTab || 'home';
    renderApp();
    switchTab('favorites');
}

window.openEditFavorite = function(idx) {
    const fav = appState.savedItems[idx];
    if (!fav) return;
    editingFavoriteIndex = idx;

    document.getElementById('edit-fav-type').value = fav.type || 'meal';
    document.getElementById('edit-fav-name').value = fav.name || '';
    document.getElementById('edit-fav-carbs').value = Number(fav.carbs) || 0;
    document.getElementById('edit-fav-fat').value = Number(fav.fat) || 0;
    document.getElementById('edit-fav-protein').value = Number(fav.protein) || 0;

    const fb = document.getElementById('ai-edit-fav-feedback');
    if (fb) fb.style.display = 'none';

    switchTab('edit-favorite');
};

async function saveEditedFavorite() {
    if (editingFavoriteIndex === null || !appState.savedItems[editingFavoriteIndex]) return;
    const fav = appState.savedItems[editingFavoriteIndex];

    const newType = document.getElementById('edit-fav-type').value;
    const newName = document.getElementById('edit-fav-name').value.trim();
    const newCarbs = parseInt(document.getElementById('edit-fav-carbs').value, 10) || 0;
    const newFat = parseInt(document.getElementById('edit-fav-fat').value, 10) || 0;
    const newProtein = parseInt(document.getElementById('edit-fav-protein').value, 10) || 0;

    if (!newName) return alert("Vul alsjeblieft een naam voor je favoriet in!");

    const oldName = fav.name;
    const oldType = fav.type;

    fav.type = newType;
    fav.name = newName;
    fav.carbs = newCarbs;
    fav.fat = newFat;
    fav.protein = newProtein;

    renderApp();

    if (fav.id) {
        await window.supabaseClient
            .from('saved_items')
            .update({ type: newType, name: newName, carbs: newCarbs, fat: newFat, protein: newProtein })
            .eq('id', fav.id);
    } else if (currentUser) {
        await window.supabaseClient
            .from('saved_items')
            .update({ type: newType, name: newName, carbs: newCarbs, fat: newFat, protein: newProtein })
            .eq('user_id', currentUser.id)
            .eq('name', oldName)
            .eq('type', oldType);
    }

    editingFavoriteIndex = null;
    switchTab('favorites');
}

window.deleteFavorite = async function(idx) {
    const fav = appState.savedItems[idx];
    if (!fav) return;
    if (!confirm(`Weet je zeker dat je favoriet "${fav.name}" wilt verwijderen?`)) return;

    appState.savedItems.splice(idx, 1);
    renderApp();

    if (fav.id) {
        await window.supabaseClient.from('saved_items').delete().eq('id', fav.id);
    } else if (currentUser) {
        await window.supabaseClient
            .from('saved_items')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('name', fav.name)
            .eq('type', fav.type);
    }
};

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

    const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
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
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return JSON.parse(rawText);
    }

    throw lastError || new Error('Kon geen verbinding maken met Gemini AI.');
}

async function analyzeNutritionWithAI(inputName, contextType, carbsId, fatId, proteinId, feedbackId, btnEl) {
    const description = (inputName || '').trim();
    if (!description) {
        alert("Typ eerst even wat je eet of drinkt, dan rekenen Takkie & Siep de macro's voor je uit!");
        return;
    }

    const fbEl = feedbackId ? document.getElementById(feedbackId) : null;
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
        'Zalm': { c: 0, f: 18, p: 25, line: '- 150g verse zalmfilet', step: 'Bak de zalmfilet op de huid in 4-5 minuutjes mooi rosé vanbinnen.' },
        'Ribeye': { c: 0, f: 28, p: 32, line: '- 180g malse ribeye steak', step: 'Schroei de ribeye op hoog vuur dicht en laat hem even rusten onder een dekentje van folie.' }
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

// ==========================================
// UI EN EVENTS
// ==========================================
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const targetTab = document.getElementById('tab-' + tabId);
    if (targetTab) targetTab.classList.add('active');

    if (tabId === 'home' || tabId === 'quotes') {
        getRandomQuote();
    }

    let navTabId = tabId;
    if (tabId === 'recipe-detail' || tabId === 'add-recipe') navTabId = 'recipes';
    if (tabId === 'log-drink' || tabId === 'favorites' || tabId === 'edit-favorite') navTabId = 'log';
    if (tabId === 'edit-meal') navTabId = 'home';

    const navBtn = document.querySelector(".nav-item[data-tab='" + navTabId + "']");
    if (navBtn) navBtn.classList.add('active');
    window.scrollTo(0, 0);
}

let lastQuoteIndex = -1;
function getRandomQuote() {
    let idx = Math.floor(Math.random() * motivationalQuotes.length);
    if (motivationalQuotes.length > 1 && idx === lastQuoteIndex) {
        idx = (idx + 1) % motivationalQuotes.length;
    }
    lastQuoteIndex = idx;
    const q = motivationalQuotes[idx];
    if (document.getElementById('takkie-speech')) {
        document.getElementById('takkie-speech').innerText = `"${q.text}"`;
    }
    if (document.getElementById('current-quote')) {
        document.getElementById('current-quote').innerText = `"${q.text}"`;
    }
    if (document.getElementById('current-author')) {
        document.getElementById('current-author').innerText = q.author;
    }
}

function updateLevel(pts) {
    let title = "⭐ Level 1: Keto Snuffelaar";
    if (pts > 50) title = "🌟 Level 2: Speelse Vetverbrander";
    if (pts > 150) title = "🏆 Level 3: Takkie's Vrolijke Vriendje";
    if (pts > 300) title = "👑 Level 4: Siep's Spinnende Kampioen";
    if (pts > 600) title = "🐾 Level 5: Keto Koning(in)";
    if (document.getElementById('level-display')) {
        document.getElementById('level-display').innerText = title;
    }
}

function updateSlidersLive() {
    document.getElementById('slider-carb-val').innerText = document.getElementById('slider-carbs').value + 'g';
    document.getElementById('slider-fat-val').innerText = document.getElementById('slider-fat').value + 'g';
    document.getElementById('slider-protein-val').innerText = document.getElementById('slider-protein').value + 'g';
    document.getElementById('slider-kcal-val').innerText = document.getElementById('slider-kcal').value + ' kcal';
}

window.openRecipePage = function(index) {
    const r = appState.recipes[index];
    if (!r) return;
    currentRecipeIndex = index;
    document.getElementById('detail-title').innerText = "📖 " + r.name;
    document.getElementById('detail-badges').innerHTML =
        "<span class='badge-carb'>" + escapeHtml(r.carbs) + "</span> " +
        "<span class='badge-fat'>" + escapeHtml(r.fat) + "</span> " +
        "<span class='badge-protein'>" + escapeHtml(r.protein) + "</span> " +
        "<span class='badge-kcal'>" + escapeHtml(r.kcal) + "</span>";
    document.getElementById('detail-ingredients').innerHTML = (r.ingredients || "")
        .split('\n')
        .map(line => "<div>" + escapeHtml(line) + "</div>")
        .join('');
    document.getElementById('detail-prep').innerHTML = (r.prep || "")
        .split('\n')
        .map(line => "<div style='margin-bottom:6px;'>" + escapeHtml(line) + "</div>")
        .join('');
    switchTab('recipe-detail');
};

function renderApp() {
    if (document.getElementById('display-points')) document.getElementById('display-points').innerText = appState.points;
    if (document.getElementById('points-display')) document.getElementById('points-display').innerText = "Punten: " + appState.points + " pt";

    if (document.getElementById('streak-display')) document.getElementById('streak-display').innerText = "🔥 " + (appState.streak || 0) + " dagen";
    if (document.getElementById('streak-count-text')) document.getElementById('streak-count-text').innerText = (appState.streak || 0);

    updateLevel(appState.points);

    if (document.getElementById('water-text')) document.getElementById('water-text').innerText = appState.water + " / 8 glazen";
    let waterHtml = '';
    for (let i = 1; i <= 8; i++) {
        const filledClass = (i <= appState.water) ? 'filled' : '';
        waterHtml += "<div class='water-drop " + filledClass + "' data-val='" + i + "'>💧</div>";
    }
    if (document.getElementById('water-container')) {
        document.getElementById('water-container').innerHTML = waterHtml;
        document.querySelectorAll('.water-drop').forEach(drop => drop.addEventListener('click', async () => {
            const clickedVal = parseInt(drop.getAttribute('data-val'), 10);
            const prevWater = appState.water;
            const nextWater = (clickedVal === prevWater) ? clickedVal - 1 : clickedVal;
            await updateWater(nextWater);
            if (nextWater > prevWater) {
                await addPoints(2);
                if (nextWater === 8) alert("Woef! Je hebt al je water op vandaag, goed zo!");
            }
        }));
    }

    let tc = 0, tf = 0, tp = 0;
    let html = '';
    appState.meals.forEach((m, idx) => {
        const mc = Number(m.carbs) || 0;
        const mf = Number(m.fat) || 0;
        const mp = Number(m.protein) || 0;
        tc += mc; tf += mf; tp += mp;
        html += "<div class='meal-item'>" +
            "<div style='flex-grow:1;'><strong>" + escapeHtml(m.type) + "</strong><br>" + escapeHtml(m.name) + "</div>" +
            "<div style='text-align: right; font-size: 0.8rem;'>" +
            "<span style='color:var(--takkie-red); font-weight:700;'>" + mc + "g</span> | " +
            "<span style='color:#B2530C; font-weight:700;'>" + mf + "g</span> | " +
            "<span style='color:#1b4332; font-weight:700;'>" + mp + "g</span><br>" +
            "<button onclick='openEditMeal(" + idx + ")' style='background:none; border:none; color:var(--siep-blue); cursor:pointer; font-size:0.75rem; font-family:inherit; font-weight:700; margin-top:4px; margin-right:8px;'>✏️ Wijzigen</button>" +
            "<button onclick='deleteMeal(" + idx + ")' style='background:none; border:none; color:var(--takkie-red); cursor:pointer; font-size:0.75rem; font-family:inherit; font-weight:600; margin-top:4px;'>Verwijderen</button>" +
            "</div></div>";
    });
    if (appState.meals.length === 0) {
        html = "<p style='text-align:center; color:#666; font-size: 0.9rem;'>Nog geen hapjes vandaag! Vergeet niet te eten, lieverd.</p>";
    }
    if (document.getElementById('meal-list')) document.getElementById('meal-list').innerHTML = html;

    const gc = appState.goals.carbs;
    const gf = appState.goals.fat;
    const gp = appState.goals.protein;
    const gkcal = appState.goals.kcal;
    const tkcal = (tc * 4) + (tp * 4) + (tf * 9);

    if (document.getElementById('carb-text')) {
        document.getElementById('carb-text').innerText = tc + "g / " + gc + "g";
        document.getElementById('carb-bar').style.width = Math.min(100, (tc / gc) * 100) + '%';
        document.getElementById('carb-bar').style.background = (tc > gc) ? 'var(--takkie-red)' : 'var(--accent-green)';
    }
    if (document.getElementById('fat-text')) {
        document.getElementById('fat-text').innerText = tf + "g / " + gf + "g";
        document.getElementById('fat-bar').style.width = Math.min(100, (tf / gf) * 100) + '%';
        document.getElementById('fat-bar').style.backgroundColor = (tf > gf) ? 'var(--takkie-red)' : 'var(--accent-fat)';
    }
    if (document.getElementById('protein-text')) {
        document.getElementById('protein-text').innerText = tp + "g / " + gp + "g";
        document.getElementById('protein-bar').style.width = Math.min(100, (tp / gp) * 100) + '%';
    }
    if (document.getElementById('kcal-text')) {
        document.getElementById('kcal-text').innerText = tkcal + " / " + gkcal + " kcal";
        document.getElementById('kcal-bar').style.width = Math.min(100, (tkcal / gkcal) * 100) + '%';
    }

    let rhtml = '';
    appState.recipes.forEach((r, idx) => {
        rhtml += "<div class='recipe-card' onclick='openRecipePage(" + idx + ")'>" +
            "<div style='font-size: 1.5rem; margin-right: 12px;'>🍲</div>" +
            "<div><div class='recipe-title'>" + escapeHtml(r.name) + "</div>" +
            "<div class='recipe-macros'>" + escapeHtml(r.carbs) + " • " + escapeHtml(r.fat) + " • " + escapeHtml(r.protein) + " • " + escapeHtml(r.kcal) + "</div>" +
            "</div></div>";
    });
    if (appState.recipes.length === 0) {
        rhtml = "<p style='text-align:center; color:#666; font-size:0.85rem;'>Nog geen recepten opgeslagen! Gebruik Takkie & Siep's Keuken hierboven of voeg je eigen recept toe.</p>";
    }
    if (document.getElementById('recipe-list')) document.getElementById('recipe-list').innerHTML = rhtml;

    if (document.getElementById('slider-carbs')) {
        document.getElementById('slider-carbs').value = gc;
        document.getElementById('slider-fat').value = gf;
        document.getElementById('slider-protein').value = gp;
        document.getElementById('slider-kcal').value = gkcal;
        updateSlidersLive();
    }

    // Update favorieten dropdowns & beheeroverzicht
    let mealOptions = "<option value=''>-- Geen favoriet geselecteerd --</option>";
    let drinkOptions = "<option value=''>-- Geen favoriet geselecteerd --</option>";
    let favManageHtml = '';

    appState.savedItems.forEach((item, idx) => {
        const ic = Number(item.carbs) || 0;
        const ifat = Number(item.fat) || 0;
        const ip = Number(item.protein) || 0;
        const opt = "<option value='" + idx + "'>" + escapeHtml(item.name) + " (" + ic + "g KH)</option>";
        if (item.type === 'meal') mealOptions += opt;
        else if (item.type === 'drink') drinkOptions += opt;

        const badgeLabel = item.type === 'drink' ? '🥤 Drank' : '🍽️ Maaltijd';
        favManageHtml += "<div class='meal-item'>" +
            "<div style='flex-grow:1;'><strong>" + badgeLabel + "</strong><br>" + escapeHtml(item.name) + "</div>" +
            "<div style='text-align: right; font-size: 0.8rem;'>" +
            "<span style='color:var(--takkie-red); font-weight:700;'>" + ic + "g</span> | " +
            "<span style='color:#B2530C; font-weight:700;'>" + ifat + "g</span> | " +
            "<span style='color:#1b4332; font-weight:700;'>" + ip + "g</span><br>" +
            "<button onclick='openEditFavorite(" + idx + ")' style='background:none; border:none; color:var(--siep-blue); cursor:pointer; font-size:0.75rem; font-family:inherit; font-weight:700; margin-top:4px; margin-right:8px;'>✏️ Wijzigen</button>" +
            "<button onclick='deleteFavorite(" + idx + ")' style='background:none; border:none; color:var(--takkie-red); cursor:pointer; font-size:0.75rem; font-family:inherit; font-weight:600; margin-top:4px;'>Verwijderen</button>" +
            "</div></div>";
    });

    if (appState.savedItems.length === 0) {
        favManageHtml = "<p style='text-align:center; color:#666; font-size:0.85rem;'>Je hebt nog geen favorieten opgeslagen. Vink bij het loggen van een maaltijd of drankje <b>💖 Sla op in mijn favorieten</b> aan!</p>";
    }

    if (document.getElementById('favorite-meals-select')) document.getElementById('favorite-meals-select').innerHTML = mealOptions;
    if (document.getElementById('favorite-drinks-select')) document.getElementById('favorite-drinks-select').innerHTML = drinkOptions;
    if (document.getElementById('favorites-manage-list')) document.getElementById('favorites-manage-list').innerHTML = favManageHtml;
}

// ==========================================
// EVENT LISTENERS
// ==========================================
document.addEventListener("DOMContentLoaded", () => {

    if (document.getElementById('btn-login')) {
        document.getElementById('btn-login').addEventListener('click', async () => {
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
            if (error) showAuthError(error.message);
        });
    }

    if (document.getElementById('btn-register')) {
        document.getElementById('btn-register').addEventListener('click', async () => {
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            const { error } = await window.supabaseClient.auth.signUp({ email, password });
            if (error) showAuthError(error.message);
            else alert("Account aangemaakt! Bevestig je e-mail (indien nodig) of je bent direct ingelogd.");
        });
    }

    if (document.getElementById('btn-logout')) {
        document.getElementById('btn-logout').addEventListener('click', async () => {
            await window.supabaseClient.auth.signOut();
        });
    }

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.currentTarget.getAttribute('data-tab')));
    });

    // Dashboard snelknoppen
    if (document.getElementById('nav-log')) {
        document.getElementById('nav-log').addEventListener('click', () => switchTab('log'));
    }

    if (document.getElementById('nav-drink')) {
        document.getElementById('nav-drink').addEventListener('click', () => switchTab('log-drink'));
    }

    if (document.getElementById('btn-favorite')) {
        document.getElementById('btn-favorite').addEventListener('click', () => {
            switchTab('log');
            const favSelect = document.getElementById('favorite-meals-select');
            if (favSelect) favSelect.focus();
        });
    }

    if (document.getElementById('btn-repeat')) {
        document.getElementById('btn-repeat').addEventListener('click', repeatYesterdayMeals);
    }

    // Gelogde maaltijd / drank wijzigen knoppen
    if (document.getElementById('btn-cancel-edit-meal')) {
        document.getElementById('btn-cancel-edit-meal').addEventListener('click', () => {
            editingMealIndex = null;
            switchTab('home');
        });
    }

    if (document.getElementById('btn-update-meal')) {
        document.getElementById('btn-update-meal').addEventListener('click', saveEditedMeal);
    }

    if (document.getElementById('btn-autofill-edit-meal')) {
        document.getElementById('btn-autofill-edit-meal').addEventListener('click', (e) => {
            const typeVal = document.getElementById('edit-meal-type').value || '';
            const context = typeVal.includes('Drank') ? 'drink' : 'meal';
            analyzeNutritionWithAI(
                document.getElementById('edit-meal-name').value,
                context,
                'edit-meal-carbs',
                'edit-meal-fat',
                'edit-meal-protein',
                'ai-edit-meal-feedback',
                e.currentTarget
            );
        });
    }

    // Favorieten beheren & wijzigen knoppen
    if (document.getElementById('btn-manage-favs-meal')) {
        document.getElementById('btn-manage-favs-meal').addEventListener('click', () => {
            const selVal = document.getElementById('favorite-meals-select').value;
            if (selVal !== "") {
                previousTabBeforeFavorites = 'log';
                window.openEditFavorite(parseInt(selVal, 10));
            } else {
                openFavoritesManager('log');
            }
        });
    }

    if (document.getElementById('btn-manage-favs-drink')) {
        document.getElementById('btn-manage-favs-drink').addEventListener('click', () => {
            const selVal = document.getElementById('favorite-drinks-select').value;
            if (selVal !== "") {
                previousTabBeforeFavorites = 'log-drink';
                window.openEditFavorite(parseInt(selVal, 10));
            } else {
                openFavoritesManager('log-drink');
            }
        });
    }

    if (document.getElementById('btn-profile-favorites')) {
        document.getElementById('btn-profile-favorites').addEventListener('click', () => openFavoritesManager('profile'));
    }

    if (document.getElementById('btn-back-from-favorites')) {
        document.getElementById('btn-back-from-favorites').addEventListener('click', () => switchTab(previousTabBeforeFavorites));
    }

    if (document.getElementById('btn-cancel-edit-favorite')) {
        document.getElementById('btn-cancel-edit-favorite').addEventListener('click', () => {
            editingFavoriteIndex = null;
            switchTab('favorites');
        });
    }

    if (document.getElementById('btn-update-favorite')) {
        document.getElementById('btn-update-favorite').addEventListener('click', saveEditedFavorite);
    }

    if (document.getElementById('btn-autofill-edit-fav')) {
        document.getElementById('btn-autofill-edit-fav').addEventListener('click', (e) => {
            const context = document.getElementById('edit-fav-type').value === 'drink' ? 'drink' : 'meal';
            analyzeNutritionWithAI(
                document.getElementById('edit-fav-name').value,
                context,
                'edit-fav-carbs',
                'edit-fav-fat',
                'edit-fav-protein',
                'ai-edit-fav-feedback',
                e.currentTarget
            );
        });
    }

    // Recepten knoppen
    if (document.getElementById('btn-back-recipes')) {
        document.getElementById('btn-back-recipes').addEventListener('click', () => switchTab('recipes'));
    }

    if (document.getElementById('btn-cancel-recipe')) {
        document.getElementById('btn-cancel-recipe').addEventListener('click', () => switchTab('recipes'));
    }

    if (document.getElementById('btn-add-recipe')) {
        document.getElementById('btn-add-recipe').addEventListener('click', () => switchTab('add-recipe'));
    }

    if (document.getElementById('btn-generate-ai')) {
        document.getElementById('btn-generate-ai').addEventListener('click', async (e) => {
            const checked = Array.from(document.querySelectorAll('#fridge-ingredients input[type="checkbox"]:checked'))
                .map(cb => cb.value);
            if (checked.length === 0) {
                alert("Vink eerst één of meer lekkere ingrediënten aan die je in huis hebt!");
                return;
            }
            const btn = e.currentTarget;
            const origText = btn.innerText;
            btn.disabled = true;
            btn.innerText = '🐾 Takkie & Siep kokkerellen met AI...';

            let generated;
            try {
                generated = await generateRecipeWithAI(checked);
            } catch (_err) {
                generated = generateSmartRecipeFallback(checked);
            } finally {
                btn.disabled = false;
                btn.innerText = origText;
            }

            const newIdx = await saveRecipe(
                generated.name,
                generated.carbs,
                generated.fat,
                generated.protein,
                generated.kcal,
                generated.ingredients,
                generated.prep
            );
            await addPoints(10);
            if (newIdx !== null) {
                window.openRecipePage(newIdx);
            }
        });
    }

    if (document.getElementById('btn-save-recipe')) {
        document.getElementById('btn-save-recipe').addEventListener('click', async () => {
            const name = document.getElementById('recipe-name').value.trim();
            const carbs = parseInt(document.getElementById('recipe-carbs').value, 10) || 0;
            const fat = parseInt(document.getElementById('recipe-fat').value, 10) || 0;
            const protein = parseInt(document.getElementById('recipe-protein').value, 10) || 0;
            const kcal = (carbs * 4) + (protein * 4) + (fat * 9);
            const ingredients = document.getElementById('recipe-ingredients').value.trim();
            const prep = document.getElementById('recipe-prep').value.trim();

            if (!name) return alert("Geef je recept nog even een leuke naam!");

            const newIdx = await saveRecipe(name, carbs, fat, protein, kcal, ingredients, prep);
            await addPoints(15);

            document.getElementById('recipe-name').value = '';
            document.getElementById('recipe-ingredients').value = '';
            document.getElementById('recipe-prep').value = '';

            if (newIdx !== null) {
                window.openRecipePage(newIdx);
            } else {
                switchTab('recipes');
            }
        });
    }

    if (document.getElementById('btn-log-recipe')) {
        document.getElementById('btn-log-recipe').addEventListener('click', async () => {
            if (currentRecipeIndex === null || !appState.recipes[currentRecipeIndex]) return;
            const r = appState.recipes[currentRecipeIndex];
            const c = parseGramNumber(r.carbs);
            const f = parseGramNumber(r.fat);
            const p = parseGramNumber(r.protein);
            await saveMeal('🍲 Recept', r.name, c, f, p);
            await addPoints(10);
            switchTab('home');
        });
    }

    // AI Analyse bij Maaltijd & Drank toevoegen
    if (document.getElementById('btn-autofill-drink')) {
        document.getElementById('btn-autofill-drink').addEventListener('click', (e) =>
            analyzeNutritionWithAI(
                document.getElementById('drink-name').value,
                'drink',
                'drink-carbs',
                'drink-fat',
                'drink-protein',
                'ai-drink-feedback',
                e.currentTarget
            )
        );
    }

    if (document.getElementById('btn-autofill-meal')) {
        document.getElementById('btn-autofill-meal').addEventListener('click', (e) =>
            analyzeNutritionWithAI(
                document.getElementById('new-meal-name').value,
                'meal',
                'new-meal-carbs',
                'new-meal-fat',
                'new-meal-protein',
                'ai-meal-feedback',
                e.currentTarget
            )
        );
    }

    if (document.getElementById('btn-save-meal')) {
        document.getElementById('btn-save-meal').addEventListener('click', async () => {
            const n = document.getElementById('new-meal-name').value.trim();
            const t = document.getElementById('new-meal-type').value;
            const c = parseInt(document.getElementById('new-meal-carbs').value, 10) || 0;
            const f = parseInt(document.getElementById('new-meal-fat').value, 10) || 0;
            const p = parseInt(document.getElementById('new-meal-protein').value, 10) || 0;
            if (!n) return alert("Vul alsjeblieft een maaltijdnaam in!");

            await saveMeal(t, n, c, f, p);
            await addPoints(10);

            if (document.getElementById('save-favorite-meal').checked) {
                const fav = { user_id: currentUser.id, type: 'meal', name: n, carbs: c, fat: f, protein: p };
                const { data: insertedFav } = await window.supabaseClient.from('saved_items').insert([fav]).select().single();
                appState.savedItems.push(insertedFav || fav);
                renderApp();
            }

            document.getElementById('new-meal-name').value = '';
            document.getElementById('save-favorite-meal').checked = false;
            const fb = document.getElementById('ai-meal-feedback');
            if (fb) fb.style.display = 'none';
            switchTab('home');
        });
    }

    if (document.getElementById('btn-save-drink')) {
        document.getElementById('btn-save-drink').addEventListener('click', async () => {
            const n = document.getElementById('drink-name').value.trim();
            const a = parseInt(document.getElementById('drink-amount').value, 10) || 1;
            const c = parseInt(document.getElementById('drink-carbs').value, 10) || 0;
            const f = parseInt(document.getElementById('drink-fat').value, 10) || 0;
            const p = parseInt(document.getElementById('drink-protein').value, 10) || 0;
            if (!n) return alert("Vul even in wat je drinkt!");

            await saveMeal('🥤 Drank', a + "x " + n, c * a, f * a, p * a);
            await updateWater(Math.min(8, appState.water + a));
            await addPoints(5);

            if (document.getElementById('save-favorite-drink').checked) {
                const fav = { user_id: currentUser.id, type: 'drink', name: n, carbs: c, fat: f, protein: p };
                const { data: insertedFav } = await window.supabaseClient.from('saved_items').insert([fav]).select().single();
                appState.savedItems.push(insertedFav || fav);
                renderApp();
            }

            document.getElementById('drink-name').value = '';
            document.getElementById('save-favorite-drink').checked = false;
            const fb = document.getElementById('ai-drink-feedback');
            if (fb) fb.style.display = 'none';
            switchTab('home');
        });
    }

    if (document.getElementById('favorite-meals-select')) {
        document.getElementById('favorite-meals-select').addEventListener('change', (e) => {
            if (e.target.value === "") return;
            const item = appState.savedItems[e.target.value];
            if (item) {
                document.getElementById('new-meal-name').value = item.name;
                document.getElementById('new-meal-carbs').value = item.carbs;
                document.getElementById('new-meal-fat').value = item.fat;
                document.getElementById('new-meal-protein').value = item.protein;
            }
        });
    }

    if (document.getElementById('favorite-drinks-select')) {
        document.getElementById('favorite-drinks-select').addEventListener('change', (e) => {
            if (e.target.value === "") return;
            const item = appState.savedItems[e.target.value];
            if (item) {
                document.getElementById('drink-name').value = item.name;
                document.getElementById('drink-carbs').value = item.carbs;
                document.getElementById('drink-fat').value = item.fat;
                document.getElementById('drink-protein').value = item.protein;
            }
        });
    }

    if (document.getElementById('btn-new-quote')) {
        document.getElementById('btn-new-quote').addEventListener('click', getRandomQuote);
    }

    if (document.getElementById('slider-carbs')) {
        ['carbs', 'fat', 'protein', 'kcal'].forEach(x => {
            document.getElementById('slider-' + x).addEventListener('input', updateSlidersLive);
            document.getElementById('slider-' + x).addEventListener('change', updateProfileGoals);
        });
    }

    checkUser();
});
