// ==========================================
// SUPABASE SETUP & GLOBALS
// ==========================================
let currentUser = null;
let currentRecipeIndex = null;
let editingMealIndex = null;
let editingFavoriteIndex = null;
let previousTabBeforeFavorites = 'home';

let teamRealtimeChannel = null;

let appState = {
    water: 0,
    meals: [],
    recipes: [],
    savedItems: [],
    goals: { carbs: 25, fat: 110, protein: 90, kcal: 2000 },
    points: 0,
    streak: 0,
    dailyLogId: null,
    geminiApiKey: null,
    displayName: '',
    petChoice: 'takkie',
    teamId: null,
    team: null,
    teamMembers: [],
    teamStreak: 0,
    teamMessages: []
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
    { text: "Wat er vandaag ook gebeurt: Takkie kwispelt en Siepie spint altijd voor jou!", author: "— Takkie & Siepie" },
    { text: "Koolhydraten? Kun je daar achteraan rennen? Nee? Nou, geef mij dan maar een plakje worst!", author: "— Takkie" },
    { text: "Ik doe al jaren aan intermittent fasting: ik slaap gewoon zestien uur per dag op de bank.", author: "— Siepie" },
    { text: "Als jij dat laatste blokje kaas echt niet meer op kunt... ik offer me wel weer op hoor. Heel onbaatzuchtig.", author: "— Takkie" },
    { text: "Mensen tellen macro's, ik tel alleen hoe vaak mijn etensbakje per dag vol zit. Tot nu toe: te weinig.", author: "— Siepie" },
    { text: "Mijn ideale ketodieet bestaat uit 50% spek, 50% kaas en 100% kruimels die jij 'per ongeluk' laat vallen.", author: "— Takkie" },
    { text: "Ik heb net drie minuten naar een vlieg gestaard; volgens mij heb ik mijn sportdoel voor deze week weer gehaald.", author: "— Siepie" },
    { text: "Zeg maar tegen de weegschaal dat ik zware botjes heb... en een heel groot hart!", author: "— Takkie" },
    { text: "Wist je dat spinnen calorieën verbrandt? Niet bij jou, maar je mag mij best een uurtje aaien om het te testen.", author: "— Siepie" },
    { text: "Groenten zijn prima hoor, vooral als je ze eerst voert aan een koe en er daarna een biefstukje van bakt!", author: "— Takkie" },
    { text: "Wij hebben besloten: elke keer als jij braaf water drinkt, krijgen wij een snoepje. Eerlijke deal toch?", author: "— Takkie & Siepie" }
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
    const authImg = document.getElementById('auth-pet-img');
    if (authImg) {
        authImg.src = Math.random() < 0.5 ? 'takkie.png' : 'siepie.png';
    }
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
    await window.supabaseClient
        .from('profiles')
        .update({ streak: appState.streak })
        .eq('id', currentUser.id);
}

function getDefaultDisplayName() {
    if (appState.displayName) return appState.displayName;
    const saved = localStorage.getItem('takkie_display_name');
    if (saved) return saved;
    if (currentUser && currentUser.email) {
        const prefix = currentUser.email.split('@')[0];
        return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return 'Keto Maatje';
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
        appState.displayName = profileData.display_name || getDefaultDisplayName();
        appState.petChoice = profileData.pet_choice || localStorage.getItem('takkie_pet_choice') || 'takkie';
        appState.teamId = profileData.team_id || null;
        if (profileData.gemini_api_key) {
            appState.geminiApiKey = profileData.gemini_api_key.trim();
        }
    } else {
        appState.displayName = getDefaultDisplayName();
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
    await loadTeamData();
    renderApp();
}

function getLevelTitle(pts) {
    let title = "⭐ Level 1: Keto Snuffelaar";
    if (pts > 50) title = "🌟 Level 2: Speelse Vetverbrander";
    if (pts > 150) title = "🏆 Level 3: Takkie's Vrolijke Vriendje";
    if (pts > 300) title = "👑 Level 4: Siep's Spinnende Kampioen";
    if (pts > 600) title = "🐾 Level 5: Keto Koning(in)";
    return title;
}

async function addPoints(amount) {
    if (!currentUser) return;
    const oldLevel = getLevelTitle(appState.points);
    appState.points += amount;
    const newLevel = getLevelTitle(appState.points);
    renderApp();
    await window.supabaseClient
        .from('profiles')
        .update({ points: appState.points })
        .eq('id', currentUser.id);

    if (oldLevel !== newLevel && appState.teamId) {
        await sendTeamMessage(
            'system',
            `🌟 Miauw! ${getDefaultDisplayName()} is nu ${newLevel}!`,
            null,
            'siepie'
        );
    }
}

async function updateWater(amount) {
    if (!currentUser || !appState.dailyLogId) return;
    const prevWater = appState.water;
    appState.water = amount;
    renderApp();
    await window.supabaseClient
        .from('daily_logs')
        .update({ water: amount })
        .eq('id', appState.dailyLogId);

    if (prevWater < 8 && amount >= 8 && appState.teamId) {
        const sentKey = `takkie_water_goal_${getTodayString()}_${currentUser.id}`;
        if (!localStorage.getItem(sentKey)) {
            localStorage.setItem(sentKey, '1');
            await sendTeamMessage(
                'system',
                `💧 Woef! ${getDefaultDisplayName()} heeft de drinkbak leeg!`,
                null,
                'takkie'
            );
        }
    }
    if (appState.teamId) {
        refreshTeamMembersCoop();
    }
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
    if (appState.teamId) {
        refreshTeamMembersCoop();
    }
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
let editingDrinkOriginalAmount = 1;
let editingDrinkPerGlass = { carbs: 0, fat: 0, protein: 0 };

function toggleEditDrinkAmountVisibility() {
    const typeVal = document.getElementById('edit-meal-type')?.value || '';
    const isDrink = typeVal.includes('Drank');
    const wrapper = document.getElementById('edit-meal-amount-wrapper');
    if (wrapper) {
        wrapper.style.display = isDrink ? 'block' : 'none';
    }
}

window.openEditMeal = function(idx) {
    const meal = appState.meals[idx];
    if (!meal) return;
    editingMealIndex = idx;

    const typeSelect = document.getElementById('edit-meal-type');
    if (typeSelect) {
        const exists = Array.from(typeSelect.options).some(opt => opt.value === meal.type);
        if (!exists && meal.type) {
            const opt = document.createElement('option');
            opt.value = meal.type;
            opt.textContent = meal.type;
            typeSelect.appendChild(opt);
        }
        typeSelect.value = meal.type || '🍳 Ontbijt';
    }

    const isDrink = (meal.type || '').includes('Drank');
    let rawName = meal.name || '';
    let amount = 1;

    if (isDrink) {
        const match = rawName.match(/^(\d+)\s*x\s+(.+)$/i);
        if (match) {
            amount = Math.max(1, parseInt(match[1], 10) || 1);
            rawName = match[2];
        }
    }

    editingDrinkOriginalAmount = amount;
    const totalC = Number(meal.carbs) || 0;
    const totalF = Number(meal.fat) || 0;
    const totalP = Number(meal.protein) || 0;

    editingDrinkPerGlass = {
        carbs: totalC / amount,
        fat: totalF / amount,
        protein: totalP / amount
    };

    document.getElementById('edit-meal-name').value = rawName;
    if (document.getElementById('edit-meal-amount')) {
        document.getElementById('edit-meal-amount').value = amount;
    }
    document.getElementById('edit-meal-carbs').value = totalC;
    document.getElementById('edit-meal-fat').value = totalF;
    document.getElementById('edit-meal-protein').value = totalP;

    toggleEditDrinkAmountVisibility();

    const fb = document.getElementById('ai-edit-meal-feedback');
    if (fb) fb.style.display = 'none';

    switchTab('edit-meal');
};

async function saveEditedMeal() {
    if (editingMealIndex === null || !appState.meals[editingMealIndex]) return;
    const meal = appState.meals[editingMealIndex];

    const newType = document.getElementById('edit-meal-type').value;
    let newName = document.getElementById('edit-meal-name').value.trim();
    const newCarbs = parseInt(document.getElementById('edit-meal-carbs').value, 10) || 0;
    const newFat = parseInt(document.getElementById('edit-meal-fat').value, 10) || 0;
    const newProtein = parseInt(document.getElementById('edit-meal-protein').value, 10) || 0;

    if (!newName) return alert("Vul alsjeblieft een naam in!");

    const isDrink = newType.includes('Drank');
    const newAmount = isDrink
        ? Math.max(1, parseInt(document.getElementById('edit-meal-amount')?.value, 10) || 1)
        : 1;

    if (isDrink) {
        const cleanDrinkName = newName.replace(/^(\d+)\s*x\s+/i, '');
        newName = `${newAmount}x ${cleanDrinkName}`;
    }

    const oldName = meal.name;
    const oldType = meal.type;

    meal.type = newType;
    meal.name = newName;
    meal.carbs = newCarbs;
    meal.fat = newFat;
    meal.protein = newProtein;

    if (isDrink && newAmount !== editingDrinkOriginalAmount) {
        const nextWater = Math.max(0, Math.min(8, appState.water + (newAmount - editingDrinkOriginalAmount)));
        await updateWater(nextWater);
    } else {
        renderApp();
    }

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

// ==========================================
// TEAMS ("TAKKIE'S ROELEKETOE CLUBJES") & REALTIME CHAT
// ==========================================
function generateInviteCode() {
    const digits = Math.floor(1000 + Math.random() * 9000);
    return `TK-${digits}`;
}

async function saveMemberIdentity(displayName, petChoice) {
    if (!currentUser) return;
    const cleanName = (displayName || '').trim() || getDefaultDisplayName();
    const cleanPet = petChoice === 'siepie' ? 'siepie' : 'takkie';
    appState.displayName = cleanName;
    appState.petChoice = cleanPet;
    localStorage.setItem('takkie_display_name', cleanName);
    localStorage.setItem('takkie_pet_choice', cleanPet);

    await window.supabaseClient
        .from('profiles')
        .update({ display_name: cleanName, pet_choice: cleanPet })
        .eq('id', currentUser.id);
}

async function createTeam() {
    if (!currentUser) return;
    const teamName = (document.getElementById('new-team-name')?.value || '').trim();
    if (!teamName) {
        alert("Geef jullie nieuwe clubje eerst een gezellige naam (bijv. Keto Kanjers)!");
        return;
    }

    const nameInput = document.getElementById('team-display-name-input')?.value;
    const petInput = document.getElementById('team-pet-choice-input')?.value;
    await saveMemberIdentity(nameInput, petInput);

    const inviteCode = generateInviteCode();
    const { data: createdTeam, error } = await window.supabaseClient
        .from('teams')
        .insert([{ name: teamName, invite_code: inviteCode, created_by: currentUser.id }])
        .select()
        .single();

    if (error || !createdTeam) {
        alert("Kon het clubje nog niet aanmaken in Supabase. Controleer of je supabase-teams-setup.sql hebt uitgevoerd in de Supabase SQL Editor!\n\nDetails: " + (error?.message || 'Onbekende fout'));
        return;
    }

    appState.teamId = createdTeam.id;
    appState.team = createdTeam;

    await window.supabaseClient
        .from('profiles')
        .update({ team_id: createdTeam.id, display_name: appState.displayName, pet_choice: appState.petChoice })
        .eq('id', currentUser.id);

    await sendTeamMessage(
        'system',
        `🐾 Woef! ${appState.displayName} heeft het clubje "${createdTeam.name}" opgericht! Deel code ${createdTeam.invite_code} met je maatje(s).`,
        null,
        'takkie'
    );

    document.getElementById('new-team-name').value = '';
    await loadTeamData();
    renderApp();
}

async function joinTeamByCode() {
    if (!currentUser) return;
    const rawCode = (document.getElementById('join-team-code')?.value || '').trim().toUpperCase();
    if (!rawCode) {
        alert("Vul de 6-karakter uitnodigingscode van het clubje in (bijv. TK-4821)!");
        return;
    }

    const nameInput = document.getElementById('team-display-name-input')?.value;
    const petInput = document.getElementById('team-pet-choice-input')?.value;
    await saveMemberIdentity(nameInput, petInput);

    const { data: foundTeam, error } = await window.supabaseClient
        .from('teams')
        .select('*')
        .ilike('invite_code', rawCode)
        .maybeSingle();

    if (error) {
        alert("Kon niet zoeken naar het clubje. Controleer of supabase-teams-setup.sql is uitgevoerd in Supabase!\n\nDetails: " + error.message);
        return;
    }
    if (!foundTeam) {
        alert(`Geen clubje gevonden met code "${rawCode}". Controleer de code even bij je maatje!`);
        return;
    }

    appState.teamId = foundTeam.id;
    appState.team = foundTeam;

    await window.supabaseClient
        .from('profiles')
        .update({ team_id: foundTeam.id, display_name: appState.displayName, pet_choice: appState.petChoice })
        .eq('id', currentUser.id);

    await sendTeamMessage(
        'system',
        `🎉 Kwispel! ${appState.displayName} is lid geworden van jullie clubje!`,
        null,
        appState.petChoice
    );

    document.getElementById('join-team-code').value = '';
    await loadTeamData();
    renderApp();
}

async function leaveTeam() {
    if (!currentUser || !appState.teamId) return;
    if (!confirm("Weet je zeker dat je dit clubje vriendelijk wilt verlaten?")) return;

    await sendTeamMessage(
        'system',
        `🐾 ${getDefaultDisplayName()} heeft het clubje verlaten. Tot snel weer!`,
        null,
        appState.petChoice
    );

    if (teamRealtimeChannel) {
        window.supabaseClient.removeChannel(teamRealtimeChannel);
        teamRealtimeChannel = null;
    }

    appState.teamId = null;
    appState.team = null;
    appState.teamMembers = [];
    appState.teamMessages = [];
    appState.teamStreak = 0;

    await window.supabaseClient
        .from('profiles')
        .update({ team_id: null })
        .eq('id', currentUser.id);

    renderApp();
}

function subscribeToTeamRealtime(teamId) {
    if (!teamId) return;
    if (teamRealtimeChannel) {
        window.supabaseClient.removeChannel(teamRealtimeChannel);
        teamRealtimeChannel = null;
    }

    teamRealtimeChannel = window.supabaseClient
        .channel('team-huiskamer-' + teamId)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'team_messages',
                filter: `team_id=eq.${teamId}`
            },
            async (payload) => {
                const newMsg = payload.new;
                if (!newMsg) return;
                const alreadyExists = appState.teamMessages.some(m => m.id === newMsg.id);
                if (!alreadyExists) {
                    appState.teamMessages.push(newMsg);
                    if (appState.teamMessages.length > 50) {
                        appState.teamMessages = appState.teamMessages.slice(-50);
                    }
                    renderTeamChat();
                    updateSosBannerAndBadge();
                }
                if (newMsg.msg_type === 'system') {
                    await refreshTeamMembersCoop();
                }
            }
        )
        .subscribe();
}

async function refreshTeamMembersCoop() {
    if (!currentUser || !appState.teamId) return;
    const today = getTodayString();

    const { data: members } = await window.supabaseClient
        .from('profiles')
        .select('*')
        .eq('team_id', appState.teamId);

    if (!members || members.length === 0) return;

    const memberIds = members.map(m => m.id);

    const { data: todayLogs } = await window.supabaseClient
        .from('daily_logs')
        .select('*')
        .in('user_id', memberIds)
        .eq('date', today);

    const { data: allMemberMeals } = await window.supabaseClient
        .from('meals')
        .select('user_id, date, type, name')
        .in('user_id', memberIds)
        .order('date', { ascending: false });

    const waterByUser = {};
    (todayLogs || []).forEach(l => {
        waterByUser[l.user_id] = Number(l.water) || 0;
    });

    const todayMealsByUser = {};
    const datesByUser = {};
    memberIds.forEach(uid => {
        todayMealsByUser[uid] = [];
        datesByUser[uid] = new Set();
    });

    (allMemberMeals || []).forEach(m => {
        if (datesByUser[m.user_id]) {
            datesByUser[m.user_id].add(m.date);
        }
        if (m.date === today && todayMealsByUser[m.user_id]) {
            todayMealsByUser[m.user_id].push(m);
        }
    });

    // Bereken Team Streak (Kwispel-keten): elke dag dat ALLE leden minimaal 1 maaltijd logden
    let coopStreak = 0;
    let checkDate = new Date();
    for (let i = 0; i < 365; i++) {
        let dStr = formatDateLocal(checkDate);
        const allLogged = memberIds.every(uid => datesByUser[uid] && datesByUser[uid].has(dStr));
        if (allLogged) {
            coopStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            if (i === 0) {
                checkDate.setDate(checkDate.getDate() - 1);
                dStr = formatDateLocal(checkDate);
                const allLoggedYesterday = memberIds.every(uid => datesByUser[uid] && datesByUser[uid].has(dStr));
                if (allLoggedYesterday) {
                    coopStreak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                    continue;
                }
            }
            break;
        }
    }
    appState.teamStreak = coopStreak;

    appState.teamMembers = members.map(m => {
        const isMe = m.id === currentUser.id;
        const mMeals = todayMealsByUser[m.id] || [];
        const mWater = isMe ? appState.water : (waterByUser[m.id] || 0);
        let statusParts = [];
        if (mMeals.length > 0) {
            const latestMeal = mMeals[mMeals.length - 1];
            statusParts.push(`Heeft ${(latestMeal.type || 'maaltijd').toLowerCase()} gelogd (${mMeals.length}x)`);
        } else {
            statusParts.push('Nog geen hapje gelogd vandaag');
        }
        statusParts.push(`💧 ${mWater}/8 glazen`);

        return {
            id: m.id,
            displayName: m.display_name || (isMe ? getDefaultDisplayName() : 'Clublid'),
            petChoice: m.pet_choice || 'takkie',
            points: Number(m.points) || 0,
            streak: isMe ? (appState.streak || 0) : (Number(m.streak) || 0),
            waterToday: mWater,
            mealsCountToday: mMeals.length,
            statusText: statusParts.join(' • ')
        };
    });

    renderTeamCoopDashboard();
}

async function loadTeamData() {
    if (!currentUser) return;
    if (!appState.teamId) {
        appState.team = null;
        appState.teamMembers = [];
        appState.teamMessages = [];
        renderTeamSection();
        return;
    }

    const { data: teamRow } = await window.supabaseClient
        .from('teams')
        .select('*')
        .eq('id', appState.teamId)
        .maybeSingle();

    if (!teamRow) {
        appState.teamId = null;
        appState.team = null;
        renderTeamSection();
        return;
    }

    appState.team = teamRow;

    const { data: msgRows } = await window.supabaseClient
        .from('team_messages')
        .select('*')
        .eq('team_id', appState.teamId)
        .order('created_at', { ascending: false })
        .limit(50);

    appState.teamMessages = (msgRows || []).reverse();

    await refreshTeamMembersCoop();
    subscribeToTeamRealtime(appState.teamId);
    renderTeamSection();
    updateSosBannerAndBadge();
}

async function sendTeamMessage(msgType, content, recipePayload = null, overridePet = null) {
    if (!currentUser || !appState.teamId) return;
    const text = (content || '').trim();
    if (!text) return;

    const newMsg = {
        team_id: appState.teamId,
        user_id: currentUser.id,
        sender_name: msgType === 'system' ? 'Takkie & Siep' : getDefaultDisplayName(),
        sender_pet: overridePet || appState.petChoice || 'takkie',
        msg_type: msgType,
        content: text,
        recipe_payload: recipePayload
    };

    const { data: inserted } = await window.supabaseClient
        .from('team_messages')
        .insert([newMsg])
        .select()
        .single();

    if (inserted) {
        const exists = appState.teamMessages.some(m => m.id === inserted.id);
        if (!exists) {
            appState.teamMessages.push(inserted);
            if (appState.teamMessages.length > 50) {
                appState.teamMessages = appState.teamMessages.slice(-50);
            }
        }
        renderTeamChat();
        renderSharedRecipesList();
        updateSosBannerAndBadge();
    }
}

window.shareRecipeWithTeam = async function(recipeIdx, evt = null) {
    if (evt) evt.stopPropagation();
    if (!appState.teamId) {
        alert("Je zit nog niet in een clubje! Ga naar het tabblad '🐾 Clubje' om een clubje te maken of lid te worden.");
        switchTab('team');
        return;
    }
    const r = appState.recipes[recipeIdx];
    if (!r) return;

    const payload = {
        name: r.name,
        carbs: r.carbs,
        fat: r.fat,
        protein: r.protein,
        kcal: r.kcal,
        ingredients: r.ingredients || '',
        prep: r.prep || ''
    };

    await sendTeamMessage(
        'recipe',
        `📖 Woef! ${getDefaultDisplayName()} heeft het recept "${r.name}" gedeeld met jullie clubje!`,
        payload
    );

    alert(`Woef! "${r.name}" staat nu in Takkie & Siep's Huiskamer voor je hele clubje!`);
    switchTab('team');
};

window.addSharedRecipeToMine = async function(msgIdx) {
    const msg = appState.teamMessages[msgIdx];
    if (!msg || !msg.recipe_payload) return;
    const rp = msg.recipe_payload;
    const c = parseGramNumber(rp.carbs);
    const f = parseGramNumber(rp.fat);
    const p = parseGramNumber(rp.protein);
    const kcal = (c * 4) + (p * 4) + (f * 9);

    // Voeg toe aan favorieten (saved_items)
    const fav = {
        user_id: currentUser.id,
        type: 'meal',
        name: rp.name,
        carbs: c,
        fat: f,
        protein: p
    };
    const { data: insertedFav } = await window.supabaseClient
        .from('saved_items')
        .insert([fav])
        .select()
        .single();
    appState.savedItems.push(insertedFav || fav);

    // Voeg ook toe aan eigen receptenboek als hij daar nog niet in staat
    const alreadyInRecipes = appState.recipes.some(r => (r.name || '').toLowerCase() === (rp.name || '').toLowerCase());
    if (!alreadyInRecipes) {
        await saveRecipe(rp.name, c, f, p, kcal, rp.ingredients || '', rp.prep || '');
    } else {
        renderApp();
    }

    alert(`💖 "${rp.name}" is toegevoegd aan jouw favorieten én je receptenboek!`);
};

window.sendHugToSosSender = async function(senderName) {
    await sendTeamMessage('reaction', `❤️ Dikke knuffel voor ${senderName} van ${getDefaultDisplayName()}!`);
};

function updateSosBannerAndBadge() {
    const bannerEl = document.getElementById('global-sos-banner');
    const textEl = document.getElementById('global-sos-text');
    const badgeEl = document.getElementById('nav-team-badge');
    if (!bannerEl || !appState.teamId || appState.teamMessages.length === 0) {
        if (bannerEl) bannerEl.style.display = 'none';
        if (badgeEl) badgeEl.style.display = 'none';
        return;
    }

    const cutoff = Date.now() - (6 * 60 * 60 * 1000); // Laatste 6 uur
    const recentSos = [...appState.teamMessages]
        .reverse()
        .find(m => m.msg_type === 'sos' && m.user_id !== currentUser?.id && new Date(m.created_at).getTime() > cutoff);

    if (recentSos) {
        bannerEl.style.display = 'flex';
        if (textEl) textEl.innerText = recentSos.content;
        if (badgeEl) badgeEl.style.display = 'flex';
    } else {
        bannerEl.style.display = 'none';
        if (badgeEl) badgeEl.style.display = 'none';
    }
}

function renderTeamCoopDashboard() {
    const members = appState.teamMembers || [];
    const totalWater = members.reduce((sum, m) => sum + (Number(m.waterToday) || 0), 0);
    const goalWater = Math.max(8, members.length * 8);

    const streakTextEl = document.getElementById('team-streak-text');
    if (streakTextEl) {
        streakTextEl.innerText = `🔥 ${appState.teamStreak || 0} dagen`;
    }

    const waterTextEl = document.getElementById('team-water-text');
    if (waterTextEl) {
        waterTextEl.innerText = `${totalWater} / ${goalWater} glazen`;
    }

    const waterBarEl = document.getElementById('team-water-bar');
    if (waterBarEl) {
        waterBarEl.style.width = `${Math.min(100, (totalWater / goalWater) * 100)}%`;
    }

    const membersListEl = document.getElementById('team-members-list');
    if (membersListEl) {
        if (members.length === 0) {
            membersListEl.innerHTML = "<p style='font-size:0.82rem; color:#666;'>Leden worden geladen...</p>";
        } else {
            membersListEl.innerHTML = members.map(m => {
                const petImg = m.petChoice === 'siepie' ? 'siepie.png' : 'takkie.png';
                const lvl = getLevelTitle(m.points);
                return `<div class="member-card">
                    <img src="${petImg}" alt="${escapeHtml(m.petChoice)}" class="member-pet-icon">
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <strong style="font-size: 0.92rem;">${escapeHtml(m.displayName)}</strong>
                            <span style="font-size: 0.75rem; font-weight: 700; background: white; border: 2px solid var(--border-color); border-radius: 10px; padding: 1px 6px;">🔥 ${m.streak}d</span>
                        </div>
                        <div style="font-size: 0.75rem; color: var(--takkie-red); font-weight: 700;">${escapeHtml(lvl)}</div>
                        <div style="font-size: 0.78rem; color: #333; margin-top: 2px;">${escapeHtml(m.statusText)}</div>
                    </div>
                </div>`;
            }).join('');
        }
    }
}

function formatChatTime(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

function renderTeamChat() {
    const chatListEl = document.getElementById('team-chat-list');
    if (!chatListEl) return;

    if (!appState.teamMessages || appState.teamMessages.length === 0) {
        chatListEl.innerHTML = "<p style='text-align:center; color:#666; font-size:0.82rem; margin:auto;'>Nog geen berichtjes in de Huiskamer! Stuur het eerste pootje of een lief berichtje.</p>";
        return;
    }

    chatListEl.innerHTML = appState.teamMessages.map((m, idx) => {
        const timeStr = formatChatTime(m.created_at);
        const petIcon = m.sender_pet === 'siepie' ? '🐱' : '🐶';
        const isMine = currentUser && m.user_id === currentUser.id;

        if (m.msg_type === 'reaction') {
            return `<div class="chat-reaction-badge">
                <div>${escapeHtml(m.content)}</div>
                <div style="font-size: 0.68rem; font-weight: 600; color: #444; margin-top: 2px;">${petIcon} ${escapeHtml(m.sender_name)} • ${timeStr}</div>
            </div>`;
        }

        if (m.msg_type === 'system') {
            return `<div class="chat-system-msg">
                ${escapeHtml(m.content)} <span style="font-weight:400; color:#666;">(${timeStr})</span>
            </div>`;
        }

        if (m.msg_type === 'sos') {
            const hugBtn = !isMine
                ? `<div style="margin-top:6px;"><button onclick="sendHugToSosSender('${escapeHtml(m.sender_name)}')" class="btn" style="padding:4px 10px; font-size:0.75rem; background:white;">❤️ Stuur direct een knuffel!</button></div>`
                : '';
            return `<div class="chat-sos-msg">
                <div>${escapeHtml(m.content)}</div>
                <div style="font-size:0.7rem; color:#555; margin-top:2px;">${timeStr}</div>
                ${hugBtn}
            </div>`;
        }

        if (m.msg_type === 'recipe' && m.recipe_payload) {
            const rp = m.recipe_payload;
            return `<div class="chat-system-msg" style="background: #F1FAEE; border-style: solid;">
                <span class="shared-recipe-badge">🐾 Gedeeld Club-Recept</span>
                <div style="font-size: 0.9rem; margin: 2px 0;">📖 ${escapeHtml(rp.name)}</div>
                <div style="font-size: 0.75rem; color: #444; margin-bottom: 6px;">${escapeHtml(rp.carbs)} • ${escapeHtml(rp.fat)} • ${escapeHtml(rp.protein)}</div>
                <button onclick="addSharedRecipeToMine(${idx})" class="btn" style="padding: 5px 10px; font-size: 0.75rem; background: var(--accent-yellow);">💖 Voeg toe aan mijn favorieten</button>
            </div>`;
        }

        return `<div class="chat-msg ${isMine ? 'mine' : ''}">
            <div class="chat-msg-header">
                <span>${petIcon} ${escapeHtml(m.sender_name)}</span>
                <span>${timeStr}</span>
            </div>
            <div>${escapeHtml(m.content)}</div>
        </div>`;
    }).join('');

    chatListEl.scrollTop = chatListEl.scrollHeight;
}

function renderSharedRecipesList() {
    const listEl = document.getElementById('team-shared-recipes-list');
    if (!listEl) return;

    const recipeMsgs = (appState.teamMessages || [])
        .map((m, idx) => ({ msg: m, idx }))
        .filter(item => item.msg.msg_type === 'recipe' && item.msg.recipe_payload);

    if (recipeMsgs.length === 0) {
        listEl.innerHTML = "<p style='text-align:center; color:#666; font-size:0.82rem;'>Nog geen recepten gedeeld in het clubje. Open een recept in je Receptenboek en klik op <b>🐾 Deel met mijn clubje</b>!</p>";
        return;
    }

    listEl.innerHTML = recipeMsgs.reverse().map(({ msg, idx }) => {
        const rp = msg.recipe_payload;
        return `<div class="recipe-card" style="cursor: default; justify-content: space-between; gap: 10px;">
            <div style="flex: 1;">
                <span class="shared-recipe-badge">🐾 Gedeeld door ${escapeHtml(msg.sender_name)}</span>
                <div class="recipe-title">${escapeHtml(rp.name)}</div>
                <div class="recipe-macros">${escapeHtml(rp.carbs)} • ${escapeHtml(rp.fat)} • ${escapeHtml(rp.protein)} • ${escapeHtml(rp.kcal)}</div>
            </div>
            <button onclick="addSharedRecipeToMine(${idx})" class="btn" style="padding: 6px 10px; font-size: 0.75rem; background: var(--accent-yellow); flex-shrink: 0;">💖 + Favoriet</button>
        </div>`;
    }).join('');
}

function renderTeamSection() {
    const noGroupEl = document.getElementById('team-no-group');
    const activeGroupEl = document.getElementById('team-active-group');
    if (!noGroupEl || !activeGroupEl) return;

    const nameInputNoGroup = document.getElementById('team-display-name-input');
    if (nameInputNoGroup && !nameInputNoGroup.value) {
        nameInputNoGroup.value = getDefaultDisplayName();
    }
    const petInputNoGroup = document.getElementById('team-pet-choice-input');
    if (petInputNoGroup) {
        petInputNoGroup.value = appState.petChoice || 'takkie';
    }

    if (!appState.teamId || !appState.team) {
        noGroupEl.style.display = 'block';
        activeGroupEl.style.display = 'none';
        return;
    }

    noGroupEl.style.display = 'none';
    activeGroupEl.style.display = 'block';

    const teamNameEl = document.getElementById('active-team-name');
    if (teamNameEl) teamNameEl.innerText = `🐾 ${appState.team.name}`;
    const teamCodeEl = document.getElementById('active-team-code');
    if (teamCodeEl) teamCodeEl.innerText = appState.team.invite_code;

    const activeMemberName = document.getElementById('active-member-name');
    if (activeMemberName && document.activeElement !== activeMemberName) {
        activeMemberName.value = getDefaultDisplayName();
    }
    const activeMemberPet = document.getElementById('active-member-pet');
    if (activeMemberPet && document.activeElement !== activeMemberPet) {
        activeMemberPet.value = appState.petChoice || 'takkie';
    }

    renderTeamCoopDashboard();
    renderTeamChat();
    renderSharedRecipesList();
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
    if (tabId === 'team') {
        const badgeEl = document.getElementById('nav-team-badge');
        if (badgeEl) badgeEl.style.display = 'none';
        if (appState.teamId) {
            refreshTeamMembersCoop();
        }
    }

    let navTabId = tabId;
    if (tabId === 'recipe-detail' || tabId === 'add-recipe' || tabId === 'edit-recipe') navTabId = 'recipes';
    if (tabId === 'log-drink' || tabId === 'favorites' || tabId === 'edit-favorite') navTabId = 'log';
    if (tabId === 'edit-meal') navTabId = 'home';

    const navBtn = document.querySelector(".nav-item[data-tab='" + navTabId + "']");
    if (navBtn) navBtn.classList.add('active');
    window.scrollTo(0, 0);
}

let lastQuoteIndex = -1;
let lastShownPet = 'siepie';
function getRandomQuote() {
    let idx = Math.floor(Math.random() * motivationalQuotes.length);
    if (motivationalQuotes.length > 1 && idx === lastQuoteIndex) {
        idx = (idx + 1) % motivationalQuotes.length;
    }
    lastQuoteIndex = idx;
    const q = motivationalQuotes[idx];

    // Kies precies 1 dier (Takkie of Siepie) passend bij de quote of afwisselend
    let pet = 'takkie';
    const author = q.author || '';
    if (author.includes('Siep') && !author.includes('Takkie')) {
        pet = 'siepie';
    } else if (author.includes('Takkie') && !author.includes('Siep')) {
        pet = 'takkie';
    } else {
        pet = (lastShownPet === 'takkie') ? 'siepie' : 'takkie';
    }
    lastShownPet = pet;

    const avatarClass = (pet === 'siepie') ? 'siep-avatar' : 'takkie-avatar';
    const homeAvatar = document.getElementById('home-pet-avatar');
    if (homeAvatar) homeAvatar.className = avatarClass;
    const quoteAvatar = document.getElementById('quote-pet-avatar');
    if (quoteAvatar) quoteAvatar.className = avatarClass;

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

let editingRecipeIndex = null;
let editRecipeReturnTab = 'recipes';

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

window.openEditRecipe = function(index, fromTab = 'recipes', evt = null) {
    if (evt) evt.stopPropagation();
    const r = appState.recipes[index];
    if (!r) return;
    editingRecipeIndex = index;
    editRecipeReturnTab = fromTab;

    document.getElementById('edit-recipe-name').value = r.name || '';
    document.getElementById('edit-recipe-carbs').value = parseGramNumber(r.carbs);
    document.getElementById('edit-recipe-fat').value = parseGramNumber(r.fat);
    document.getElementById('edit-recipe-protein').value = parseGramNumber(r.protein);
    document.getElementById('edit-recipe-ingredients').value = r.ingredients || '';
    document.getElementById('edit-recipe-prep').value = r.prep || '';

    switchTab('edit-recipe');
};

async function saveEditedRecipe() {
    if (editingRecipeIndex === null || !appState.recipes[editingRecipeIndex]) return;
    const r = appState.recipes[editingRecipeIndex];

    const newName = document.getElementById('edit-recipe-name').value.trim();
    const c = parseInt(document.getElementById('edit-recipe-carbs').value, 10) || 0;
    const f = parseInt(document.getElementById('edit-recipe-fat').value, 10) || 0;
    const p = parseInt(document.getElementById('edit-recipe-protein').value, 10) || 0;
    const kcal = (c * 4) + (p * 4) + (f * 9);
    const newIngredients = document.getElementById('edit-recipe-ingredients').value.trim();
    const newPrep = document.getElementById('edit-recipe-prep').value.trim();

    if (!newName) return alert("Geef je recept nog even een leuke naam!");

    const oldName = r.name;
    const updatedFields = {
        name: newName,
        carbs: formatGramLabel(c, 'g KH'),
        fat: formatGramLabel(f, 'g Vet'),
        protein: formatGramLabel(p, 'g Eiwit'),
        kcal: formatGramLabel(kcal, ' kcal'),
        ingredients: newIngredients,
        prep: newPrep
    };

    Object.assign(r, updatedFields);
    renderApp();

    if (r.id) {
        await window.supabaseClient
            .from('recipes')
            .update(updatedFields)
            .eq('id', r.id);
    } else if (currentUser) {
        await window.supabaseClient
            .from('recipes')
            .update(updatedFields)
            .eq('user_id', currentUser.id)
            .eq('name', oldName);
    }

    const targetIdx = editingRecipeIndex;
    editingRecipeIndex = null;
    window.openRecipePage(targetIdx);
}

window.deleteRecipe = async function(index, evt = null) {
    if (evt) evt.stopPropagation();
    const r = appState.recipes[index];
    if (!r) return;
    if (!confirm(`Weet je zeker dat je het recept "${r.name}" wilt verwijderen?`)) return;

    appState.recipes.splice(index, 1);
    if (currentRecipeIndex === index) currentRecipeIndex = null;
    renderApp();

    if (r.id) {
        await window.supabaseClient.from('recipes').delete().eq('id', r.id);
    } else if (currentUser) {
        await window.supabaseClient
            .from('recipes')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('name', r.name);
    }

    switchTab('recipes');
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
    if (document.getElementById('water-goal-message')) {
        const waterMsgEl = document.getElementById('water-goal-message');
        if (appState.water >= 8) {
            waterMsgEl.style.display = 'flex';
            const waterPet = document.getElementById('water-pet-avatar');
            const waterSpeech = document.getElementById('water-goal-speech');
            const isSiep = (lastShownPet === 'siepie');
            if (waterPet) waterPet.className = isSiep ? 'siep-avatar' : 'takkie-avatar';
            if (waterSpeech) {
                waterSpeech.innerText = isSiep
                    ? '"Miauw! Je hebt al je water op vandaag, goed zo!"'
                    : '"Woef! Je hebt al je water op vandaag, goed zo!"';
            }
        } else {
            waterMsgEl.style.display = 'none';
        }
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
            "<div style='flex-grow: 1;'>" +
            "<div class='recipe-title'>" + escapeHtml(r.name) + "</div>" +
            "<div class='recipe-macros'>" + escapeHtml(r.carbs) + " • " + escapeHtml(r.fat) + " • " + escapeHtml(r.protein) + " • " + escapeHtml(r.kcal) + "</div>" +
            "<div style='margin-top: 6px;'>" +
            "<button onclick='shareRecipeWithTeam(" + idx + ", event)' style='background:none; border:none; color:#1b4332; cursor:pointer; font-size:0.75rem; font-family:inherit; font-weight:700; padding:0; margin-right:12px;'>🐾 Deel met clubje</button>" +
            "<button onclick='openEditRecipe(" + idx + ", \"recipes\", event)' style='background:none; border:none; color:var(--siep-blue); cursor:pointer; font-size:0.75rem; font-family:inherit; font-weight:700; padding:0; margin-right:12px;'>✏️ Bewerken</button>" +
            "<button onclick='deleteRecipe(" + idx + ", event)' style='background:none; border:none; color:var(--takkie-red); cursor:pointer; font-size:0.75rem; font-family:inherit; font-weight:600; padding:0;'>🗑️ Verwijderen</button>" +
            "</div>" +
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

    renderTeamSection();
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

    if (document.getElementById('edit-meal-type')) {
        document.getElementById('edit-meal-type').addEventListener('change', toggleEditDrinkAmountVisibility);
    }

    if (document.getElementById('edit-meal-amount')) {
        document.getElementById('edit-meal-amount').addEventListener('input', (e) => {
            const amt = Math.max(1, parseInt(e.target.value, 10) || 1);
            document.getElementById('edit-meal-carbs').value = Math.round(editingDrinkPerGlass.carbs * amt);
            document.getElementById('edit-meal-fat').value = Math.round(editingDrinkPerGlass.fat * amt);
            document.getElementById('edit-meal-protein').value = Math.round(editingDrinkPerGlass.protein * amt);
        });
    }

    ['carbs', 'fat', 'protein'].forEach(macro => {
        const el = document.getElementById('edit-meal-' + macro);
        if (el) {
            el.addEventListener('input', () => {
                const amt = Math.max(1, parseInt(document.getElementById('edit-meal-amount')?.value, 10) || 1);
                editingDrinkPerGlass[macro] = (parseInt(el.value, 10) || 0) / amt;
            });
        }
    });

    if (document.getElementById('btn-update-meal')) {
        document.getElementById('btn-update-meal').addEventListener('click', saveEditedMeal);
    }

    if (document.getElementById('btn-autofill-edit-meal')) {
        document.getElementById('btn-autofill-edit-meal').addEventListener('click', async (e) => {
            const typeVal = document.getElementById('edit-meal-type').value || '';
            const isDrink = typeVal.includes('Drank');
            const context = isDrink ? 'drink' : 'meal';
            await analyzeNutritionWithAI(
                document.getElementById('edit-meal-name').value,
                context,
                'edit-meal-carbs',
                'edit-meal-fat',
                'edit-meal-protein',
                'ai-edit-meal-feedback',
                e.currentTarget
            );
            if (isDrink) {
                const amt = Math.max(1, parseInt(document.getElementById('edit-meal-amount')?.value, 10) || 1);
                const c1 = parseInt(document.getElementById('edit-meal-carbs').value, 10) || 0;
                const f1 = parseInt(document.getElementById('edit-meal-fat').value, 10) || 0;
                const p1 = parseInt(document.getElementById('edit-meal-protein').value, 10) || 0;
                editingDrinkPerGlass = { carbs: c1, fat: f1, protein: p1 };
                document.getElementById('edit-meal-carbs').value = c1 * amt;
                document.getElementById('edit-meal-fat').value = f1 * amt;
                document.getElementById('edit-meal-protein').value = p1 * amt;
            }
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

    function appendCustomIngredientCard(name, isChecked = true) {
        const container = document.getElementById('fridge-ingredients');
        if (!container || !name) return;
        const existing = Array.from(container.querySelectorAll('input[type="checkbox"]'))
            .find(cb => cb.value.toLowerCase() === name.toLowerCase());
        if (existing) {
            if (isChecked) existing.checked = true;
            return;
        }
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = name;
        cb.checked = isChecked;
        label.appendChild(cb);
        label.appendChild(document.createTextNode(' 🥗 ' + name));
        container.appendChild(label);
    }

    // Laad eerder toegevoegde eigen ingrediënten uit localStorage
    try {
        const savedCustomIngs = JSON.parse(localStorage.getItem('takkie_custom_ingredients') || '[]');
        if (Array.isArray(savedCustomIngs)) {
            savedCustomIngs.forEach(ing => appendCustomIngredientCard(ing, false));
        }
    } catch (_e) {}

    function handleAddCustomIngredient() {
        const inputEl = document.getElementById('custom-ingredient-input');
        if (!inputEl) return;
        const raw = inputEl.value.trim();
        if (!raw) return;
        raw.split(',').map(s => s.trim()).filter(Boolean).forEach(part => {
            appendCustomIngredientCard(part, true);
            try {
                const list = JSON.parse(localStorage.getItem('takkie_custom_ingredients') || '[]');
                if (!list.some(x => x.toLowerCase() === part.toLowerCase())) {
                    list.push(part);
                    localStorage.setItem('takkie_custom_ingredients', JSON.stringify(list));
                }
            } catch (_e) {}
        });
        inputEl.value = '';
    }

    if (document.getElementById('btn-add-custom-ingredient')) {
        document.getElementById('btn-add-custom-ingredient').addEventListener('click', handleAddCustomIngredient);
    }

    if (document.getElementById('custom-ingredient-input')) {
        document.getElementById('custom-ingredient-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomIngredient();
            }
        });
    }

    if (document.getElementById('btn-generate-ai')) {
        document.getElementById('btn-generate-ai').addEventListener('click', async (e) => {
            handleAddCustomIngredient();
            const checked = Array.from(document.querySelectorAll('#fridge-ingredients input[type="checkbox"]:checked'))
                .map(cb => cb.value);
            if (checked.length === 0) {
                alert("Vink eerst één of meer lekkere ingrediënten aan (of typ een eigen ingrediënt)!");
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

    if (document.getElementById('btn-edit-recipe-detail')) {
        document.getElementById('btn-edit-recipe-detail').addEventListener('click', () => {
            if (currentRecipeIndex !== null) {
                window.openEditRecipe(currentRecipeIndex, 'recipe-detail');
            }
        });
    }

    if (document.getElementById('btn-delete-recipe-detail')) {
        document.getElementById('btn-delete-recipe-detail').addEventListener('click', () => {
            if (currentRecipeIndex !== null) {
                window.deleteRecipe(currentRecipeIndex);
            }
        });
    }

    if (document.getElementById('btn-cancel-edit-recipe')) {
        document.getElementById('btn-cancel-edit-recipe').addEventListener('click', () => {
            editingRecipeIndex = null;
            switchTab(editRecipeReturnTab || 'recipes');
        });
    }

    if (document.getElementById('btn-update-recipe')) {
        document.getElementById('btn-update-recipe').addEventListener('click', saveEditedRecipe);
    }

    if (document.getElementById('btn-share-recipe-team')) {
        document.getElementById('btn-share-recipe-team').addEventListener('click', () => {
            if (currentRecipeIndex !== null) {
                window.shareRecipeWithTeam(currentRecipeIndex);
            }
        });
    }

    // Teams & Huiskamer Chat event listeners
    if (document.getElementById('btn-create-team')) {
        document.getElementById('btn-create-team').addEventListener('click', createTeam);
    }

    if (document.getElementById('btn-join-team')) {
        document.getElementById('btn-join-team').addEventListener('click', joinTeamByCode);
    }

    if (document.getElementById('btn-leave-team')) {
        document.getElementById('btn-leave-team').addEventListener('click', leaveTeam);
    }

    if (document.getElementById('btn-copy-team-code')) {
        document.getElementById('btn-copy-team-code').addEventListener('click', async () => {
            const code = appState.team?.invite_code || '';
            if (!code) return;
            try {
                await navigator.clipboard.writeText(code);
                alert(`Code ${code} is gekopieerd! Stuur 'm naar je maatje.`);
            } catch (_e) {
                prompt("Kopieer deze uitnodigingscode:", code);
            }
        });
    }

    if (document.getElementById('btn-save-member-settings')) {
        document.getElementById('btn-save-member-settings').addEventListener('click', async () => {
            const nameVal = document.getElementById('active-member-name')?.value;
            const petVal = document.getElementById('active-member-pet')?.value;
            await saveMemberIdentity(nameVal, petVal);
            await refreshTeamMembersCoop();
            alert("Woef! Je naam en icoontje in het clubje zijn bijgewerkt.");
        });
    }

    if (document.getElementById('btn-send-chat')) {
        document.getElementById('btn-send-chat').addEventListener('click', async () => {
            const inputEl = document.getElementById('team-chat-input');
            if (!inputEl || !inputEl.value.trim()) return;
            const txt = inputEl.value.trim();
            inputEl.value = '';
            await sendTeamMessage('text', txt);
        });
    }

    if (document.getElementById('team-chat-input')) {
        document.getElementById('team-chat-input').addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const inputEl = e.currentTarget;
                if (!inputEl.value.trim()) return;
                const txt = inputEl.value.trim();
                inputEl.value = '';
                await sendTeamMessage('text', txt);
            }
        });
    }

    document.querySelectorAll('.btn-reaction').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const reactionText = e.currentTarget.getAttribute('data-reaction');
            if (reactionText) {
                await sendTeamMessage('reaction', reactionText);
            }
        });
    });

    if (document.getElementById('btn-team-sos')) {
        document.getElementById('btn-team-sos').addEventListener('click', async () => {
            await sendTeamMessage(
                'sos',
                `❤️ ${getDefaultDisplayName()} kan nu wel wat lieve woordjes gebruiken!`
            );
        });
    }

    if (document.getElementById('btn-goto-sos-chat')) {
        document.getElementById('btn-goto-sos-chat').addEventListener('click', () => {
            switchTab('team');
            const chatInput = document.getElementById('team-chat-input');
            if (chatInput) chatInput.focus();
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
