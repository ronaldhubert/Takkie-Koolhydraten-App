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
    const oldFavInfo = getMealFavoriteInfo(meal);

    const newType = document.getElementById('edit-meal-type').value;
    let newName = document.getElementById('edit-meal-name').value.trim();
    let newCarbs = parseInt(document.getElementById('edit-meal-carbs').value, 10) || 0;
    let newFat = parseInt(document.getElementById('edit-meal-fat').value, 10) || 0;
    let newProtein = parseInt(document.getElementById('edit-meal-protein').value, 10) || 0;

    if (!newName) {
        showInlineMessage('btn-update-meal', "Vul alsjeblieft een naam in!", 'error');
        return;
    }

    const isDrink = newType.includes('Drank');
    const newAmount = isDrink
        ? Math.max(1, parseInt(document.getElementById('edit-meal-amount')?.value, 10) || 1)
        : 1;
    const cleanNewName = newName.replace(/^(\d+)\s*x\s+/i, '').trim();

    // Als de naam is gewijzigd maar de macro's nog op de oude waarden staan, herbereken macro's automatisch
    if (
        cleanNewName.toLowerCase() !== oldFavInfo.cleanName.toLowerCase() &&
        newCarbs === (Number(meal.carbs) || 0) &&
        newFat === (Number(meal.fat) || 0) &&
        newProtein === (Number(meal.protein) || 0)
    ) {
        await analyzeNutritionWithAI(
            cleanNewName,
            isDrink ? 'drink' : 'meal',
            'edit-meal-carbs',
            'edit-meal-fat',
            'edit-meal-protein',
            'ai-edit-meal-feedback',
            document.getElementById('btn-update-meal')
        );
        const c1 = parseInt(document.getElementById('edit-meal-carbs').value, 10) || 0;
        const f1 = parseInt(document.getElementById('edit-meal-fat').value, 10) || 0;
        const p1 = parseInt(document.getElementById('edit-meal-protein').value, 10) || 0;
        newCarbs = isDrink ? c1 * newAmount : c1;
        newFat = isDrink ? f1 * newAmount : f1;
        newProtein = isDrink ? p1 * newAmount : p1;
    }

    if (isDrink) {
        newName = `${newAmount}x ${cleanNewName}`;
    } else {
        newName = cleanNewName;
    }

    const oldName = meal.name;
    const oldType = meal.type;

    meal.type = newType;
    meal.name = newName;
    meal.carbs = newCarbs;
    meal.fat = newFat;
    meal.protein = newProtein;

    // Als dit item ook in de favorieten staat, werk dan ook de favoriet en zijn macronutriënten bij
    if (oldFavInfo.favIdx !== -1 && appState.savedItems[oldFavInfo.favIdx]) {
        const fav = appState.savedItems[oldFavInfo.favIdx];
        const prevFavName = fav.name;
        const prevFavType = fav.type;
        fav.type = isDrink ? 'drink' : 'meal';
        fav.name = cleanNewName;
        fav.carbs = Math.round(newCarbs / newAmount);
        fav.fat = Math.round(newFat / newAmount);
        fav.protein = Math.round(newProtein / newAmount);

        if (fav.id) {
            await window.supabaseClient
                .from('saved_items')
                .update({ type: fav.type, name: fav.name, carbs: fav.carbs, fat: fav.fat, protein: fav.protein })
                .eq('id', fav.id);
        } else if (currentUser) {
            await window.supabaseClient
                .from('saved_items')
                .update({ type: fav.type, name: fav.name, carbs: fav.carbs, fat: fav.fat, protein: fav.protein })
                .eq('user_id', currentUser.id)
                .eq('name', prevFavName)
                .eq('type', prevFavType);
        }
    }

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
    if (appState.returnToHistoryDay) {
        appState.returnToHistoryDay = false;
        switchTab('history');
    } else {
        switchTab('home');
    }
}

window.deleteMeal = async function(idx, btnEl = null) {
    const anchor = btnEl || document.getElementById('meal-list');
    showInlineConfirm(anchor, "Weet je zeker dat je dit hapje wilt vergeten?", async () => {
        const mealToDel = appState.meals[idx];
        appState.meals.splice(idx, 1);
        renderApp();
        if (mealToDel && mealToDel.id) {
            await window.supabaseClient.from('meals').delete().eq('id', mealToDel.id);
            await calculateStreak();
            renderApp();
        }
    });
};

function initMealEvents() {
    // Gelogde maaltijd / drank wijzigen knoppen
    if (document.getElementById('btn-cancel-edit-meal')) {
        document.getElementById('btn-cancel-edit-meal').addEventListener('click', () => {
            editingMealIndex = null;
            if (appState.returnToHistoryDay) {
                appState.returnToHistoryDay = false;
                switchTab('history');
            } else {
                switchTab('home');
            }
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

    if (document.getElementById('edit-meal-name')) {
        document.getElementById('edit-meal-name').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('btn-autofill-edit-meal')?.click();
            }
        });
    }
}

function updateMealWizardKcal() {
    const c = parseInt(document.getElementById('new-meal-carbs')?.value, 10) || 0;
    const f = parseInt(document.getElementById('new-meal-fat')?.value, 10) || 0;
    const p = parseInt(document.getElementById('new-meal-protein')?.value, 10) || 0;
    const kcal = (c * 4) + (p * 4) + (f * 9);
    const el = document.getElementById('meal-summary-kcal');
    if (el) el.innerText = `${kcal} kcal`;
}

function updateDrinkWizardKcal() {
    const a = Math.max(1, parseInt(document.getElementById('drink-amount')?.value, 10) || 1);
    const c = parseInt(document.getElementById('drink-carbs')?.value, 10) || 0;
    const f = parseInt(document.getElementById('drink-fat')?.value, 10) || 0;
    const p = parseInt(document.getElementById('drink-protein')?.value, 10) || 0;
    const kcal = ((c * 4) + (p * 4) + (f * 9)) * a;
    const el = document.getElementById('drink-summary-kcal');
    if (el) el.innerText = `${kcal} kcal`;
}

function setMealWizardStep(step, summaryData = null) {
    [1, 2, 3].forEach(n => {
        const panel = document.getElementById('meal-wizard-step-' + n);
        if (panel) panel.style.display = (n === step) ? 'block' : 'none';
        const pill = document.getElementById('meal-step-pill-' + n);
        if (pill) {
            pill.classList.toggle('active', n === step);
            pill.classList.toggle('done', n < step);
        }
    });

    const petEl = document.getElementById('meal-wizard-pet');
    const speechEl = document.getElementById('meal-wizard-speech');
    if (step === 1) {
        if (petEl) petEl.className = 'takkie-avatar';
        if (speechEl) speechEl.innerText = '"Woef! Wat heb je lekker gegeten? 🍽️"';
        const hour = new Date().getHours();
        const typeEl = document.getElementById('new-meal-type');
        if (typeEl) {
            if (hour >= 5 && hour < 11) typeEl.value = '🍳 Ontbijt';
            else if (hour >= 11 && hour < 16) typeEl.value = '🥗 Lunch';
            else if (hour >= 16 && hour < 21) typeEl.value = '🍲 Avondeten';
            else typeEl.value = '⚡ Snack';
        }
    } else if (step === 2) {
        if (petEl) petEl.className = 'siep-avatar';
        if (speechEl) speechEl.innerText = '"Miauw! Hoeveel had je van elk onderdeel? Tik op een snelknop of pas het aan 🐾"';
    } else if (step === 3) {
        if (petEl) petEl.className = 'takkie-avatar';
        if (speechEl) speechEl.innerText = '"Woef! We hebben het samengevat. Klopt dit zo? 🥰"';
        const t = document.getElementById('new-meal-type')?.value || '🍽️ Maaltijd';
        const n = document.getElementById('new-meal-name')?.value.trim() || '';
        const titleEl = document.getElementById('meal-summary-title');
        if (titleEl) titleEl.innerText = `${t} — ${n}`;
        const explEl = document.getElementById('meal-summary-explanation');
        if (explEl) {
            const explText = summaryData?.explanation || 'Controleer hieronder de macro\'s en pas ze zo nodig nog aan.';
            explEl.innerHTML = `✨ <b>Samenvatting:</b> ${escapeHtml(explText)}`;
        }
        updateMealWizardKcal();
    }
}

function setDrinkWizardStep(step, summaryData = null) {
    [1, 2, 3].forEach(n => {
        const panel = document.getElementById('drink-wizard-step-' + n);
        if (panel) panel.style.display = (n === step) ? 'block' : 'none';
        const pill = document.getElementById('drink-step-pill-' + n);
        if (pill) {
            pill.classList.toggle('active', n === step);
            pill.classList.toggle('done', n < step);
        }
    });

    const petEl = document.getElementById('drink-wizard-pet');
    const speechEl = document.getElementById('drink-wizard-speech');
    if (step === 1) {
        if (petEl) petEl.className = 'siep-avatar';
        if (speechEl) speechEl.innerText = '"Miauw! Wat heb je lekker gedronken? 🥤"';
    } else if (step === 2) {
        if (petEl) petEl.className = 'takkie-avatar';
        if (speechEl) speechEl.innerText = '"Woef! Hoe groot was je glas of kopje? 🐾"';
    } else if (step === 3) {
        if (petEl) petEl.className = 'siep-avatar';
        if (speechEl) speechEl.innerText = '"Miauw! Dit hebben we berekend. Klopt de samenvatting zo? 🥰"';
        const n = document.getElementById('drink-name')?.value.trim() || '';
        const titleEl = document.getElementById('drink-summary-title');
        if (titleEl) titleEl.innerText = `🥤 ${n}`;
        const explEl = document.getElementById('drink-summary-explanation');
        if (explEl) {
            const explText = summaryData?.explanation || 'Controleer hieronder het aantal glazen en de macro\'s.';
            explEl.innerHTML = `✨ <b>Samenvatting:</b> ${escapeHtml(explText)}`;
        }
        updateDrinkWizardKcal();
    }
}

function initLogEvents() {
    // 3-Staps Wizard bij Maaltijd & Drank toevoegen
    if (document.getElementById('btn-autofill-drink')) {
        document.getElementById('btn-autofill-drink').addEventListener('click', (e) => {
            const val = (document.getElementById('drink-name')?.value || '').trim();
            if (!val) {
                showInlineMessage('btn-autofill-drink', 'Typ eerst even wat je hebt gedronken!');
                return;
            }
            analyzeNutritionWithAI(
                val,
                'drink',
                'drink-carbs',
                'drink-fat',
                'drink-protein',
                'ai-drink-feedback',
                e.currentTarget,
                {
                    onEnterStep2: () => setDrinkWizardStep(2),
                    onBackToStep1: () => setDrinkWizardStep(1),
                    onEnterStep3: (summary) => setDrinkWizardStep(3, summary)
                }
            );
        });
    }

    if (document.getElementById('btn-autofill-meal')) {
        document.getElementById('btn-autofill-meal').addEventListener('click', (e) => {
            const val = (document.getElementById('new-meal-name')?.value || '').trim();
            if (!val) {
                showInlineMessage('btn-autofill-meal', 'Typ eerst even wat je hebt gegeten!');
                return;
            }
            analyzeNutritionWithAI(
                val,
                'meal',
                'new-meal-carbs',
                'new-meal-fat',
                'new-meal-protein',
                'ai-meal-feedback',
                e.currentTarget,
                {
                    onEnterStep2: () => setMealWizardStep(2),
                    onBackToStep1: () => setMealWizardStep(1),
                    onEnterStep3: (summary) => setMealWizardStep(3, summary)
                }
            );
        });
    }

    ['new-meal-carbs', 'new-meal-fat', 'new-meal-protein'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateMealWizardKcal);
    });

    ['drink-amount', 'drink-carbs', 'drink-fat', 'drink-protein'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateDrinkWizardKcal);
    });

    if (document.getElementById('btn-meal-step3-back-step2')) {
        document.getElementById('btn-meal-step3-back-step2').addEventListener('click', () => {
            document.getElementById('btn-autofill-meal')?.click();
        });
    }
    if (document.getElementById('btn-meal-step3-back-step1')) {
        document.getElementById('btn-meal-step3-back-step1').addEventListener('click', () => {
            setMealWizardStep(1);
        });
    }
    if (document.getElementById('btn-drink-step3-back-step2')) {
        document.getElementById('btn-drink-step3-back-step2').addEventListener('click', () => {
            document.getElementById('btn-autofill-drink')?.click();
        });
    }
    if (document.getElementById('btn-drink-step3-back-step1')) {
        document.getElementById('btn-drink-step3-back-step1').addEventListener('click', () => {
            setDrinkWizardStep(1);
        });
    }

    if (document.getElementById('new-meal-name')) {
        document.getElementById('new-meal-name').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('btn-autofill-meal')?.click();
            }
        });
    }

    if (document.getElementById('drink-name')) {
        document.getElementById('drink-name').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('btn-autofill-drink')?.click();
            }
        });
    }

    if (document.getElementById('btn-save-meal')) {
        document.getElementById('btn-save-meal').addEventListener('click', async () => {
            const n = document.getElementById('new-meal-name').value.trim();
            const t = document.getElementById('new-meal-type').value;
            const c = parseInt(document.getElementById('new-meal-carbs').value, 10) || 0;
            const f = parseInt(document.getElementById('new-meal-fat').value, 10) || 0;
            const p = parseInt(document.getElementById('new-meal-protein').value, 10) || 0;
            if (!n) {
                showInlineMessage('btn-save-meal', "Vul alsjeblieft een maaltijdnaam in!", 'error');
                return;
            }

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
            setMealWizardStep(1);
            if (appState.returnToHistoryDay) {
                appState.returnToHistoryDay = false;
                switchTab('history');
            } else {
                switchTab('home');
            }
        });
    }

    if (document.getElementById('btn-save-drink')) {
        document.getElementById('btn-save-drink').addEventListener('click', async () => {
            const n = document.getElementById('drink-name').value.trim();
            const a = parseInt(document.getElementById('drink-amount').value, 10) || 1;
            const c = parseInt(document.getElementById('drink-carbs').value, 10) || 0;
            const f = parseInt(document.getElementById('drink-fat').value, 10) || 0;
            const p = parseInt(document.getElementById('drink-protein').value, 10) || 0;
            if (!n) {
                showInlineMessage('btn-save-drink', "Vul even in wat je drinkt!", 'error');
                return;
            }

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
            setDrinkWizardStep(1);
            if (appState.returnToHistoryDay) {
                appState.returnToHistoryDay = false;
                switchTab('history');
            } else {
                switchTab('home');
            }
        });
    }

    if (document.getElementById('favorite-meals-select')) {
        document.getElementById('favorite-meals-select').addEventListener('change', (e) => {
            if (e.target.value === "") return;
            const item = appState.savedItems[e.target.value];
            e.target.value = "";
            if (item) {
                document.getElementById('new-meal-name').value = item.name;
                document.getElementById('new-meal-carbs').value = item.carbs;
                document.getElementById('new-meal-fat').value = item.fat;
                document.getElementById('new-meal-protein').value = item.protein;
                setMealWizardStep(3, { explanation: `Gekozen uit je favorieten: ${item.name}.` });
            }
        });
    }

    if (document.getElementById('favorite-drinks-select')) {
        document.getElementById('favorite-drinks-select').addEventListener('change', (e) => {
            if (e.target.value === "") return;
            const item = appState.savedItems[e.target.value];
            e.target.value = "";
            if (item) {
                document.getElementById('drink-name').value = item.name;
                document.getElementById('drink-carbs').value = item.carbs;
                document.getElementById('drink-fat').value = item.fat;
                document.getElementById('drink-protein').value = item.protein;
                setDrinkWizardStep(3, { explanation: `Gekozen uit je favorieten: ${item.name}.` });
            }
        });
    }
}
