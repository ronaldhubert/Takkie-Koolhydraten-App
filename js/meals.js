// Gelogde maaltijden/drankjes wijzigen en verwijderen, en de formulieren om nieuwe te loggen.
// Klassiek script (geen module): deelt globale functies en variabelen met de andere bestanden in js/.
// Zie ARCHITECTURE.md voor de laadvolgorde.

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

function initMealEvents() {
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
}

function initLogEvents() {
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
}
