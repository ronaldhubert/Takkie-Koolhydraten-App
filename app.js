// ==========================================
// SUPABASE SETUP & GLOBALS
// ==========================================
let currentUser = null;
let appState = {
    water: 0,
    meals: [],
    recipes: [],
    goals: { carbs: 25, fat: 110, protein: 90, kcal: 2000 },
    points: 0,
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

function getTodayString() { return new Date().toISOString().split('T')[0]; }

// ==========================================
// AUTHENTICATIE LOGICA
// ==========================================
async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) { currentUser = session.user; showApp(); await loadUserData(); }
    else { showAuth(); }

    supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session) { currentUser = session.user; showApp(); await loadUserData(); }
        else { currentUser = null; showAuth(); }
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
// ==========================================
// DATABASE LOGICA
// ==========================================
async function loadUserData() {
    if (!currentUser) return;
    const today = getTodayString();
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
    if (profileData) {
        appState.points = profileData.points || 0;
        appState.goals.carbs = profileData.goal_carbs || 25;
        appState.goals.fat = profileData.goal_fat || 110;
        appState.goals.protein = profileData.goal_protein || 90;
        appState.goals.kcal = profileData.goal_kcal || 2000;
    }
    const { data: logData } = await supabase.from('daily_logs').select('*').eq('user_id', currentUser.id).eq('date', today).single();
    if (logData) {
        appState.dailyLogId = logData.id; appState.water = logData.water || 0;
    } else {
        const { data: newLog } = await supabase.from('daily_logs').insert([{ user_id: currentUser.id, date: today, water: 0 }]).select().single();
        if (newLog) { appState.dailyLogId = newLog.id; appState.water = 0; }
    }
    const { data: mealsData } = await supabase.from('meals').select('*').eq('user_id', currentUser.id).eq('date', today);
    if (mealsData) appState.meals = mealsData;
    const { data: recipesData } = await supabase.from('recipes').select('*').eq('user_id', currentUser.id);
    if (recipesData) appState.recipes = recipesData;
    renderApp();
}

async function addPoints(amount) {
    if (!currentUser) return;
    appState.points += amount; renderApp();
    await supabase.from('profiles').update({ points: appState.points }).eq('id', currentUser.id);
}
async function updateWater(amount) {
    if (!currentUser || !appState.dailyLogId) return;
    appState.water = amount; renderApp();
    await supabase.from('daily_logs').update({ water: amount }).eq('id', appState.dailyLogId);
}
async function saveMeal(type, name, carbs, fat, protein) {
    if (!currentUser) return;
    const newMeal = { user_id: currentUser.id, date: getTodayString(), type, name, carbs, fat, protein };
    appState.meals.push(newMeal); renderApp();
    await supabase.from('meals').insert([newMeal]);
}
async function saveRecipe(name, carbs, fat, protein, kcal, ingredients, prep) {
    if (!currentUser) return;
    const newRecipe = { user_id: currentUser.id, name, carbs, fat, protein, kcal, ingredients, prep };
    appState.recipes.push(newRecipe); renderApp();
    await supabase.from('recipes').insert([newRecipe]);
}
async function updateProfileGoals() {
    if (!currentUser) return;
    appState.goals.carbs = parseInt(document.getElementById('slider-carbs').value);
    appState.goals.fat = parseInt(document.getElementById('slider-fat').value);
    appState.goals.protein = parseInt(document.getElementById('slider-protein').value);
    appState.goals.kcal = parseInt(document.getElementById('slider-kcal').value);
    renderApp();
    await supabase.from('profiles').update({ goal_carbs: appState.goals.carbs, goal_fat: appState.goals.fat, goal_protein: appState.goals.protein, goal_kcal: appState.goals.kcal }).eq('id', currentUser.id);
}
window.deleteMeal = async function(idx) {
// ==========================================
// UI EN EVENTS (uit oud script)
// ==========================================
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    let targetTab = document.getElementById('tab-' + tabId);
    if (targetTab) targetTab.classList.add('active');
    let navBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    if (navBtn) navBtn.classList.add('active');
    window.scrollTo(0, 0);
}
function autoFillNutrition(inputName, carbsId, fatId, proteinId) {
    let name = inputName.toLowerCase(); let c = 0, f = 0, p = 0;
    if (name.includes('wijn') || name.includes('alcohol')) { c = 3; }
    else if (name.includes('koffie') || name.includes('thee')) { f = 5; }
    else if (name.includes('bulletproof')) { f = 15; p = 1; }
    else if (name.includes('ei')) { c = 1; f = 15; p = 13; }
    else if (name.includes('zalm') || name.includes('vis')) { f = 18; p = 22; }
    else if (name.includes('avocado')) { c = 2; f = 15; p = 2; }
    else if (name.includes('noten')) { c = 2; f = 21; p = 3; }
    else if (name.includes('salade')) { c = 4; f = 25; p = 10; }
    else if (name.includes('vlees')) { f = 35; p = 35; }
    else { c = 2; f = 10; p = 10; }
    document.getElementById(carbsId).value = c; document.getElementById(fatId).value = f; document.getElementById(proteinId).value = p;
    if(c+f+p > 0) alert("Takkie snuffelt: 'Woef! Ik ruik " + c + "g KH, " + f + "g Vet en " + p + "g Ei!'");
}
function getRandomQuote() {
    let q = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    if(document.getElementById('current-quote')) document.getElementById('current-quote').innerText = `"${q.text}"`;
    if(document.getElementById('current-author')) document.getElementById('current-author').innerText = q.author;
}
function updateLevel(pts) {
    let title = "⭐ Level 1: Liefhebber";
    if (pts > 50) title = "🌟 Level 2: Fijnproever"; if (pts > 200) title = "🏆 Level 3: Keto Koning"; if (pts > 500) title = "👑 Level 4: Takkie's Held";
    if(document.getElementById('level-display')) document.getElementById('level-display').innerText = title;
}
function updateSlidersLive() {
    document.getElementById('slider-carb-val').innerText = document.getElementById('slider-carbs').value + 'g';
    document.getElementById('slider-fat-val').innerText = document.getElementById('slider-fat').value + 'g';
    document.getElementById('slider-protein-val').innerText = document.getElementById('slider-protein').value + 'g';
    document.getElementById('slider-kcal-val').innerText = document.getElementById('slider-kcal').value + ' kcal';
}
window.openRecipePage = function(index) {
    let r = appState.recipes[index];
    document.getElementById('detail-title').innerText = "📖 " + r.name;
    document.getElementById('detail-badges').innerHTML = `<span class="badge-carb">${r.carbs}</span> <span class="badge-fat">${r.fat}</span> <span class="badge-protein">${r.protein}</span> <span class="badge-kcal">${r.kcal}</span>`;
    document.getElementById('detail-ingredients').innerHTML = (r.ingredients||"").split('\n').map(line => `<div>${line}</div>`).join('');
    document.getElementById('detail-prep').innerHTML = (r.prep||"").split('\n').map(line => `<div style="margin-bottom:6px;">${line}</div>`).join('');
    switchTab('recipe-detail');
}

    if(confirm("Weet je zeker dat je dit hapje wilt vergeten?")) {
        const mealToDel = appState.meals[idx];
function renderApp() {
    if(document.getElementById('display-points')) document.getElementById('display-points').innerText = appState.points;
    if(document.getElementById('points-display')) document.getElementById('points-display').innerText = `Punten: ${appState.points} pt`;
    updateLevel(appState.points);
    for(let i=1; i<=8; i++) {
        let drop = document.getElementById('drop-' + i);
        if(drop) { if(i <= appState.water) { drop.classList.add('active'); drop.innerHTML = '💧'; } else { drop.classList.remove('active'); drop.innerHTML = '💧'; } }
    }
    let tc = 0, tf = 0, tp = 0; let html = '';
    appState.meals.forEach((m, idx) => {
        tc += Number(m.carbs)||0; tf += Number(m.fat)||0; tp += Number(m.protein)||0;
        html += `<div class="meal-item"><div style="flex-grow:1;"><strong>${m.type}</strong><br>${m.name}</div><div style="text-align: right; font-size: 0.8rem;"><span style="color:var(--takkie-red); font-weight:700;">${m.carbs}g</span> | <span style="color:#B2530C; font-weight:700;">${m.fat}g</span> | <span style="color:#1b4332; font-weight:700;">${m.protein}g</span><br><button onclick="deleteMeal(${idx})" style="background:none; border:none; color:red; cursor:pointer; font-size:0.75rem; margin-top:4px;">Verwijderen</button></div></div>`;
    });
    if (appState.meals.length === 0) html = `<p style="text-align:center; color:#666; font-size: 0.9rem;">Nog geen hapjes vandaag! Vergeet niet te eten, lieverd.</p>`;
    if(document.getElementById('meal-list')) document.getElementById('meal-list').innerHTML = html;

    let gc = appState.goals.carbs, gf = appState.goals.fat, gp = appState.goals.protein, gkcal = appState.goals.kcal;
    let tkcal = (tc*4) + (tp*4) + (tf*9);
    
    if(document.getElementById('total-carbs')) { document.getElementById('total-carbs').innerText = `${tc} / ${gc}g`; document.getElementById('bar-carbs').style.width = Math.min(100, (tc/gc)*100) + '%'; }
    if(document.getElementById('total-fat')) { document.getElementById('total-fat').innerText = `${tf} / ${gf}g`; document.getElementById('bar-fat').style.width = Math.min(100, (tf/gf)*100) + '%'; }
    if(document.getElementById('total-protein')) { document.getElementById('total-protein').innerText = `${tp} / ${gp}g`; document.getElementById('bar-protein').style.width = Math.min(100, (tp/gp)*100) + '%'; }
    if(document.getElementById('total-kcal')) { document.getElementById('total-kcal').innerText = `${tkcal} / ${gkcal}`; document.getElementById('bar-kcal').style.width = Math.min(100, (tkcal/gkcal)*100) + '%'; }

    let rhtml = '';
    appState.recipes.forEach((r, idx) => {
        rhtml += `<div class="recipe-card" onclick="openRecipePage(${idx})"><div style="font-size: 1.5rem; margin-right: 12px;">🥣</div><div><div class="recipe-title">${r.name}</div><div class="recipe-macros">${r.carbs} • ${r.fat} • ${r.protein} • ${r.kcal}</div></div></div>`;
    });
    if(document.getElementById('recipe-list')) document.getElementById('recipe-list').innerHTML = rhtml;

    if(document.getElementById('slider-carbs')) {
        document.getElementById('slider-carbs').value = gc; document.getElementById('slider-fat').value = gf;
        document.getElementById('slider-protein').value = gp; document.getElementById('slider-kcal').value = gkcal;
        updateSlidersLive();
    }
// ==========================================
// EVENT LISTENERS
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    if(document.getElementById('btn-login')) {
        document.getElementById('btn-login').addEventListener('click', async () => {
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if(error) showAuthError(error.message);
        });
    }
    if(document.getElementById('btn-register')) {
        document.getElementById('btn-register').addEventListener('click', async () => {
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            const { error } = await supabase.auth.signUp({ email, password });
            if(error) showAuthError(error.message); else alert("Account aangemaakt! Bevestig je e-mail (indien nodig) of je bent direct ingelogd.");
        });
    }
    if(document.getElementById('btn-logout')) document.getElementById('btn-logout').addEventListener('click', async () => await supabase.auth.signOut() );

    document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', (e) => switchTab(e.currentTarget.getAttribute('data-tab'))));
    document.querySelectorAll('.water-drop').forEach(drop => drop.addEventListener('click', async () => {
        let val = parseInt(drop.getAttribute('data-val'));
        await updateWater(val); await addPoints(2);
        if(val === 8) alert("Woef! Je hebt al je water op vandaag, goed zo!");
    }));

    if(document.getElementById('btn-autofill-drink')) document.getElementById('btn-autofill-drink').addEventListener('click', () => autoFillNutrition(document.getElementById('drink-name').value, 'drink-carbs', 'drink-fat', 'drink-protein'));
    if(document.getElementById('btn-autofill-meal')) document.getElementById('btn-autofill-meal').addEventListener('click', () => autoFillNutrition(document.getElementById('new-meal-name').value, 'new-meal-carbs', 'new-meal-fat', 'new-meal-protein'));

    if(document.getElementById('btn-save-meal')) {
        document.getElementById('btn-save-meal').addEventListener('click', async () => {
            let n = document.getElementById('new-meal-name').value, t = document.getElementById('new-meal-type').value;
            let c = parseInt(document.getElementById('new-meal-carbs').value)||0, f = parseInt(document.getElementById('new-meal-fat').value)||0, p = parseInt(document.getElementById('new-meal-protein').value)||0;
            if(!n) return alert('Vul alsjeblieft een maaltijdnaam in!');
            await saveMeal(t, n, c, f, p); await addPoints(10);
            document.getElementById('new-meal-name').value = ''; switchTab('home');
        });
    }
    if(document.getElementById('btn-save-drink')) {
        document.getElementById('btn-save-drink').addEventListener('click', async () => {
            let n = document.getElementById('drink-name').value, a = parseInt(document.getElementById('drink-amount').value)||1;
            let c = parseInt(document.getElementById('drink-carbs').value)||0, f = parseInt(document.getElementById('drink-fat').value)||0, p = parseInt(document.getElementById('drink-protein').value)||0;
            if(!n) return alert('Vul even in wat je drinkt!');
            await saveMeal('🥤 Drank', `${a}x ${n}`, c*a, f*a, p*a);
            await updateWater(Math.min(8, appState.water + a)); await addPoints(5);
            document.getElementById('drink-name').value = ''; switchTab('home');
        });
    }
    if(document.getElementById('btn-new-quote')) document.getElementById('btn-new-quote').addEventListener('click', getRandomQuote);
    if(document.getElementById('slider-carbs')) {
        ['carbs','fat','protein','kcal'].forEach(x => {
            document.getElementById('slider-'+x).addEventListener('input', updateSlidersLive);
            document.getElementById('slider-'+x).addEventListener('change', updateProfileGoals);
        });
    }
    checkUser();
});

}

        appState.meals.splice(idx, 1); renderApp();
        if(mealToDel.id) await supabase.from('meals').delete().eq('id', mealToDel.id);
    }
}

function showAuthError(msg) {
    const errEl = document.getElementById('auth-error-message');
    errEl.innerText = msg; errEl.style.display = 'block';
}
