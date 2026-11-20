// Favorieten (saved_items) beheren, wijzigen en verwijderen.
// Klassiek script (geen module): deelt globale functies en variabelen met de andere bestanden in js/.
// Zie ARCHITECTURE.md voor de laadvolgorde.

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
