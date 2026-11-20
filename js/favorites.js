// Favorieten (saved_items) beheren, wijzigen en verwijderen.
// Klassiek script (geen module): deelt globale functies en variabelen met de andere bestanden in js/.
// Zie ARCHITECTURE.md voor de laadvolgorde.

// ==========================================
// FAVORIETEN BEHEREN, WIJZIGEN & VERWIJDEREN
// ==========================================
function getMealFavoriteInfo(meal) {
    const isDrink = (meal?.type || '').includes('Drank');
    const favType = isDrink ? 'drink' : 'meal';
    const rawName = (meal?.name || '').trim();
    const amountMatch = isDrink ? rawName.match(/^(\d+)\s*x\s+(.+)$/i) : null;
    const glasses = amountMatch ? Math.max(1, parseInt(amountMatch[1], 10)) : 1;
    const cleanName = (amountMatch ? amountMatch[2] : rawName).trim();
    const favIdx = (appState.savedItems || []).findIndex(
        f => (f.type || 'meal') === favType && (f.name || '').trim().toLowerCase() === cleanName.toLowerCase()
    );
    return {
        favIdx,
        favType,
        cleanName,
        carbs: Math.round((Number(meal?.carbs) || 0) / glasses),
        fat: Math.round((Number(meal?.fat) || 0) / glasses),
        protein: Math.round((Number(meal?.protein) || 0) / glasses)
    };
}

window.toggleMealFavorite = async function(mealIdx) {
    const meal = appState.meals[mealIdx];
    if (!meal || !currentUser) return;
    const info = getMealFavoriteInfo(meal);
    if (!info.cleanName) return;

    if (info.favIdx !== -1) {
        const removed = appState.savedItems[info.favIdx];
        appState.savedItems.splice(info.favIdx, 1);
        renderApp();
        if (removed && removed.id) {
            await window.supabaseClient.from('saved_items').delete().eq('id', removed.id);
        } else {
            await window.supabaseClient
                .from('saved_items')
                .delete()
                .eq('user_id', currentUser.id)
                .eq('name', removed.name)
                .eq('type', removed.type);
        }
    } else {
        const fav = {
            user_id: currentUser.id,
            type: info.favType,
            name: info.cleanName,
            carbs: info.carbs,
            fat: info.fat,
            protein: info.protein
        };
        appState.savedItems.push(fav);
        renderApp();
        const { data: insertedFav } = await window.supabaseClient
            .from('saved_items')
            .insert([fav])
            .select()
            .single();
        if (insertedFav) {
            const idx = appState.savedItems.indexOf(fav);
            if (idx !== -1) appState.savedItems[idx] = insertedFav;
        }
    }
};

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
    let newCarbs = parseInt(document.getElementById('edit-fav-carbs').value, 10) || 0;
    let newFat = parseInt(document.getElementById('edit-fav-fat').value, 10) || 0;
    let newProtein = parseInt(document.getElementById('edit-fav-protein').value, 10) || 0;

    if (!newName) {
        showInlineMessage('btn-update-favorite', "Vul alsjeblieft een naam voor je favoriet in!", 'error');
        return;
    }

    const oldName = (fav.name || '').trim();
    const oldType = fav.type || 'meal';
    const oldCarbs = Number(fav.carbs) || 0;
    const oldFat = Number(fav.fat) || 0;
    const oldProtein = Number(fav.protein) || 0;

    // Als de naam van de favoriet is aangepast maar de macro-velden nog op de oude waarden staan, herbereken macro's automatisch
    if (
        newName.toLowerCase() !== oldName.toLowerCase() &&
        newCarbs === oldCarbs &&
        newFat === oldFat &&
        newProtein === oldProtein
    ) {
        await analyzeNutritionWithAI(
            newName,
            newType === 'drink' ? 'drink' : 'meal',
            'edit-fav-carbs',
            'edit-fav-fat',
            'edit-fav-protein',
            'ai-edit-fav-feedback',
            document.getElementById('btn-update-favorite')
        );
        newCarbs = parseInt(document.getElementById('edit-fav-carbs').value, 10) || 0;
        newFat = parseInt(document.getElementById('edit-fav-fat').value, 10) || 0;
        newProtein = parseInt(document.getElementById('edit-fav-protein').value, 10) || 0;
    }

    fav.type = newType;
    fav.name = newName;
    fav.carbs = newCarbs;
    fav.fat = newFat;
    fav.protein = newProtein;

    // Werk ook vandaag gelogde items die bij deze favoriet horen bij met de nieuwe macronutriënten
    for (const m of (appState.meals || [])) {
        const isDrinkMeal = (m.type || '').includes('Drank');
        const mRawName = (m.name || '').trim();
        const amtMatch = isDrinkMeal ? mRawName.match(/^(\d+)\s*x\s+(.+)$/i) : null;
        const glasses = amtMatch ? Math.max(1, parseInt(amtMatch[1], 10)) : 1;
        const mCleanName = (amtMatch ? amtMatch[2] : mRawName).trim();

        if (mCleanName.toLowerCase() === oldName.toLowerCase()) {
            const updatedMealName = isDrinkMeal ? `${glasses}x ${newName}` : newName;
            const updatedCarbs = newCarbs * glasses;
            const updatedFat = newFat * glasses;
            const updatedProtein = newProtein * glasses;
            m.name = updatedMealName;
            m.carbs = updatedCarbs;
            m.fat = updatedFat;
            m.protein = updatedProtein;

            if (m.id) {
                await window.supabaseClient
                    .from('meals')
                    .update({ name: updatedMealName, carbs: updatedCarbs, fat: updatedFat, protein: updatedProtein })
                    .eq('id', m.id);
            }
        }
    }

    // Werk ook het invulformulier bij als deze favoriet daar geselecteerd stond
    if (newType === 'meal' && document.getElementById('new-meal-name')) {
        const curInput = document.getElementById('new-meal-name').value.trim();
        if (!curInput || curInput.toLowerCase() === oldName.toLowerCase()) {
            document.getElementById('new-meal-name').value = newName;
            document.getElementById('new-meal-carbs').value = newCarbs;
            document.getElementById('new-meal-fat').value = newFat;
            document.getElementById('new-meal-protein').value = newProtein;
        }
    } else if (newType === 'drink' && document.getElementById('drink-name')) {
        const curInput = document.getElementById('drink-name').value.trim();
        if (!curInput || curInput.toLowerCase() === oldName.toLowerCase()) {
            document.getElementById('drink-name').value = newName;
            document.getElementById('drink-carbs').value = newCarbs;
            document.getElementById('drink-fat').value = newFat;
            document.getElementById('drink-protein').value = newProtein;
        }
    }

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

window.deleteFavorite = async function(idx, btnEl = null) {
    const fav = appState.savedItems[idx];
    if (!fav) return;
    const anchor = btnEl || document.getElementById('favorites-manage-list');
    showInlineConfirm(anchor, `Weet je zeker dat je favoriet "${fav.name}" wilt verwijderen?`, async () => {
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
    });
};

function initFavoriteEvents() {
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
}
