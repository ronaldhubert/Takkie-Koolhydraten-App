// Receptenboek: receptpagina, bewerken, verwijderen en "Bedenk een recept".
// Klassiek script (geen module): deelt globale functies en variabelen met de andere bestanden in js/.
// Zie ARCHITECTURE.md voor de laadvolgorde.

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

function initRecipeEvents() {
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
}
