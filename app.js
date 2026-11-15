// ==========================================
// SUPABASE SETUP & GLOBALS
// ==========================================
let currentUser = null;
let currentRecipeIndex = null;
let appState = {
    water: 0,
    meals: [],
    recipes: [],
    savedItems: [],
    goals: { carbs: 25, fat: 110, protein: 90, kcal: 2000 },
    points: 0,
    streak: 0,
    dailyLogId: null
};

const motivationalQuotes = [
    { text: "Woef! Vandaag zorgen we heel lief en goed voor elkaar.", author: "— Takkie & Siep" },
    { text: "Elke kleine stap is er een naar een gelukkig en gezond gevoel. Je doet het ontzettend goed!", author: "— Takkie de Hond" },
    { text: "Miauw... neem even een rustig momentje voor jezelf vandaag. Je mag trots op je zijn.", author: "— Siep de Kat" },
    { text: "Zachtjes volhouden is ook winnen. Takkie kwispelt speciaal voor jou!", author: "— Takkie & Siep" },
    { text: "Laat los wat niet lukt, morgen is er weer een prachtige dag om opnieuw te stralen.", author: "— Takkie" },
    { text: "Je bent een kanjer, elke dag een klein stukje sterker en liever voor je lijf.", author: "— Takkie & Siep" }
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
    return match ? Math.round( parseFloat(match[0]) ) : 0;
}

function formatGramLabel(val, unit = 'g') {
    const num = parseGramNumber(val);
    return `${num}${unit}`;
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
            // Sta toe dat vandaag nog niet gelogd is als gisteren wel gelogd was
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
// UI EN EVENTS
// ==========================================
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const targetTab = document.getElementById('tab-' + tabId);
    if (targetTab) targetTab.classList.add('active');

    // Koppel sub-tabs aan hun hoofd-navigatieknop
    let navTabId = tabId;
    if (tabId === 'recipe-detail' || tabId === 'add-recipe') navTabId = 'recipes';
    if (tabId === 'log-drink') navTabId = 'log';

    const navBtn = document.querySelector(".nav-item[data-tab='" + navTabId + "']");
    if (navBtn) navBtn.classList.add('active');
    window.scrollTo(0, 0);
}

function autoFillNutrition(inputName, carbsId, fatId, proteinId) {
    const name = inputName.toLowerCase();
    let c = 0, f = 0, p = 0;
    if (name.includes('wijn') || name.includes('alcohol')) { c = 3; }
    else if (name.includes('bulletproof')) { f = 15; p = 1; }
    else if (name.includes('koffie') || name.includes('thee')) { f = 5; }
    else if (name.includes('ei')) { c = 1; f = 15; p = 13; }
    else if (name.includes('zalm') || name.includes('vis')) { f = 18; p = 22; }
    else if (name.includes('avocado')) { c = 2; f = 15; p = 2; }
    else if (name.includes('noten')) { c = 2; f = 21; p = 3; }
    else if (name.includes('salade')) { c = 4; f = 25; p = 10; }
    else if (name.includes('vlees') || name.includes('ribeye') || name.includes('spek')) { f = 35; p = 35; }
    else { c = 2; f = 10; p = 10; }
    document.getElementById(carbsId).value = c;
    document.getElementById(fatId).value = f;
    document.getElementById(proteinId).value = p;
}

function generateSmartRecipe(selectedIngredients) {
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

function getRandomQuote() {
    const q = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    if (document.getElementById('current-quote')) document.getElementById('current-quote').innerText = `"${q.text}"`;
    if (document.getElementById('current-author')) document.getElementById('current-author').innerText = q.author;
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
            // Klik op het hoogste gevulde glas zet hem 1 terug, anders naar clickedVal
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

    // Update favorieten dropdowns
    let mealOptions = "<option value=''>-- Geen favoriet geselecteerd --</option>";
    let drinkOptions = "<option value=''>-- Geen favoriet geselecteerd --</option>";
    appState.savedItems.forEach((item, idx) => {
        const opt = "<option value='" + idx + "'>" + escapeHtml(item.name) + " (" + (Number(item.carbs) || 0) + "g KH)</option>";
        if (item.type === 'meal') mealOptions += opt;
        else if (item.type === 'drink') drinkOptions += opt;
    });
    if (document.getElementById('favorite-meals-select')) document.getElementById('favorite-meals-select').innerHTML = mealOptions;
    if (document.getElementById('favorite-drinks-select')) document.getElementById('favorite-drinks-select').innerHTML = drinkOptions;
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
        document.getElementById('btn-generate-ai').addEventListener('click', async () => {
            const checked = Array.from(document.querySelectorAll('#fridge-ingredients input[type="checkbox"]:checked'))
                .map(cb => cb.value);
            if (checked.length === 0) {
                alert("Vink eerst één of meer lekkere ingrediënten aan die je in huis hebt!");
                return;
            }
            const generated = generateSmartRecipe(checked);
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

    // Maaltijden & Dranken loggen
    if (document.getElementById('btn-autofill-drink')) {
        document.getElementById('btn-autofill-drink').addEventListener('click', () =>
            autoFillNutrition(document.getElementById('drink-name').value, 'drink-carbs', 'drink-fat', 'drink-protein')
        );
    }

    if (document.getElementById('btn-autofill-meal')) {
        document.getElementById('btn-autofill-meal').addEventListener('click', () =>
            autoFillNutrition(document.getElementById('new-meal-name').value, 'new-meal-carbs', 'new-meal-fat', 'new-meal-protein')
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
