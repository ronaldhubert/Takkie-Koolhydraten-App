// Gebruikersdata uit Supabase: laden, streak, punten, water, maaltijden en recepten opslaan, profieldoelen.
// Klassiek script (geen module): deelt globale functies en variabelen met de andere bestanden in js/.
// Zie ARCHITECTURE.md voor de laadvolgorde.

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

async function loadDateLog(dateStr) {
    if (!currentUser) return;
    const targetDate = dateStr || getTodayString();
    appState.activeDate = (targetDate === getTodayString()) ? null : targetDate;

    const { data: logData } = await window.supabaseClient
        .from('daily_logs')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('date', targetDate)
        .maybeSingle();

    if (logData) {
        appState.dailyLogId = logData.id;
        appState.water = logData.water || 0;
    } else {
        const { data: newLog } = await window.supabaseClient
            .from('daily_logs')
            .insert([{ user_id: currentUser.id, date: targetDate, water: 0 }])
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
        .eq('date', targetDate);
    appState.meals = mealsData || [];

    // Laad ook de maaltijden van de dag vóór targetDate voor de "🔄 Gisteren" dropdown
    const [y, m, d] = targetDate.split('-').map(Number);
    const prevDateObj = new Date(y, m - 1, d);
    prevDateObj.setDate(prevDateObj.getDate() - 1);
    const prevDateStr = formatDateLocal(prevDateObj);
    const { data: yesterdayMealsData } = await window.supabaseClient
        .from('meals')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('date', prevDateStr);
    appState.yesterdayMeals = yesterdayMealsData || [];

    renderApp();
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

    await loadDateLog(today);

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
    registerServiceWorker().then(() => {
        if ('Notification' in window && Notification.permission === 'granted') subscribeToPush();
    });
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
    const prevWater = appState.water;
    appState.water = amount;
    renderApp();
    await window.supabaseClient
        .from('daily_logs')
        .update({ water: amount })
        .eq('id', appState.dailyLogId);

    if (prevWater < 8 && amount >= 8 && appState.teamId && !isViewingOtherDay()) {
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
    const activeDate = getActiveDateString();
    const newMeal = {
        user_id: currentUser.id,
        date: activeDate,
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
        if (isShareLogsEnabled() && !isViewingOtherDay()) {
            const kcal = Math.round((Number(carbs) || 0) * 4 + (Number(protein) || 0) * 4 + (Number(fat) || 0) * 9);
            sendTeamMessage('system', `📝 ${getDefaultDisplayName()} heeft gelogd: ${type} ${name} (${kcal} kcal)`, null, appState.petChoice);
        }
    }
}

function isShareLogsEnabled() {
    return localStorage.getItem('takkie_share_logs') !== '0';
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
    const targetDate = getActiveDateString();
    const [y, m, d] = targetDate.split('-').map(Number);
    const prevDateObj = new Date(y, m - 1, d);
    prevDateObj.setDate(prevDateObj.getDate() - 1);
    const yesterday = formatDateLocal(prevDateObj);
    const { data: yesterdayMeals } = await window.supabaseClient
        .from('meals')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('date', yesterday);

    if (!yesterdayMeals || yesterdayMeals.length === 0) {
        const msg = "Woef! We vonden geen gelogde hapjes van gisteren. Voeg vandaag lekker iets nieuws toe!";
        const speechEl = document.getElementById('takkie-speech');
        if (speechEl) speechEl.innerText = `"${msg}"`;
        showInlineMessage('btn-repeat', msg, 'info');
        return;
    }

    const toInsert = yesterdayMeals.map(m => ({
        user_id: currentUser.id,
        date: targetDate,
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
