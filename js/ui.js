// Navigatie (tabbladen), quotes tonen, level, sliders en renderApp (het hoofdscherm tekenen).
// Klassiek script (geen module): deelt globale functies en variabelen met de andere bestanden in js/.
// Zie ARCHITECTURE.md voor de laadvolgorde.

// ==========================================
// UI EN EVENTS
// ==========================================
function switchTab(tabId) {
    clearInlineMessages();
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const targetTab = document.getElementById('tab-' + tabId);
    if (targetTab) targetTab.classList.add('active');

    if (tabId === 'home' || tabId === 'quotes') {
        getRandomQuote();
    }
    if (tabId === 'history') {
        renderHistory();
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
    if (tabId === 'log' || tabId === 'log-drink' || tabId === 'edit-meal' || tabId === 'favorites' || tabId === 'edit-favorite') navTabId = 'home';

    const navBtn = document.querySelector(".nav-item[data-tab='" + navTabId + "']");
    if (navBtn) navBtn.classList.add('active');
    window.scrollTo(0, 0);
}

let lastQuoteIndex = -1;
let lastShownPet = 'siepie';
function getRandomQuote() {
    // Wissel elke keer strikt af tussen Takkie en Siepie
    const pet = (lastShownPet === 'takkie') ? 'siepie' : 'takkie';
    lastShownPet = pet;

    const matchingIndices = motivationalQuotes
        .map((item, i) => ({ item, i }))
        .filter(({ item, i }) => {
            if (motivationalQuotes.length > 1 && i === lastQuoteIndex) return false;
            const author = item.author || '';
            if (pet === 'takkie') return author.includes('Takkie');
            return author.includes('Siep');
        })
        .map(x => x.i);

    let idx;
    if (matchingIndices.length > 0) {
        idx = matchingIndices[Math.floor(Math.random() * matchingIndices.length)];
    } else {
        idx = Math.floor(Math.random() * motivationalQuotes.length);
        if (motivationalQuotes.length > 1 && idx === lastQuoteIndex) {
            idx = (idx + 1) % motivationalQuotes.length;
        }
    }
    lastQuoteIndex = idx;
    const q = motivationalQuotes[idx];

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

function renderApp() {
    if (document.getElementById('display-points')) document.getElementById('display-points').innerText = appState.points;
    if (document.getElementById('points-display')) document.getElementById('points-display').innerText = "Punten: " + appState.points + " pt";

    if (document.getElementById('streak-display')) document.getElementById('streak-display').innerText = "🔥 " + (appState.streak || 0) + " dagen";
    if (document.getElementById('streak-count-text')) document.getElementById('streak-count-text').innerText = (appState.streak || 0);

    const homeTitleEl = document.getElementById('home-log-title');
    const dateBannerEl = document.getElementById('active-date-banner');
    const dateBannerTextEl = document.getElementById('active-date-banner-text');
    if (isViewingOtherDay()) {
        const friendly = formatFriendlyDateNL(getActiveDateString());
        if (homeTitleEl) homeTitleEl.innerText = `📖 Log van ${friendly}`;
        if (dateBannerEl) dateBannerEl.style.display = 'flex';
        if (dateBannerTextEl) dateBannerTextEl.innerText = `📅 Je wijzigt nu: ${friendly}`;
    } else {
        if (homeTitleEl) homeTitleEl.innerText = '📖 Vandaag Loggen';
        if (dateBannerEl) dateBannerEl.style.display = 'none';
    }

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
        const favInfo = getMealFavoriteInfo(m);
        const isFav = favInfo.favIdx !== -1;
        const heartIcon = isFav ? '❤️' : '🤍';
        const heartTitle = isFav ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten';
        html += "<div class='meal-item'>" +
            "<div style='flex-grow:1;'><strong>" + escapeHtml(m.type) + "</strong><br>" + escapeHtml(m.name) + "</div>" +
            "<div style='text-align: right; font-size: 0.8rem;'>" +
            "<span style='color:var(--takkie-red); font-weight:700;'>" + mc + "g</span> | " +
            "<span style='color:#B2530C; font-weight:700;'>" + mf + "g</span> | " +
            "<span style='color:#1b4332; font-weight:700;'>" + mp + "g</span><br>" +
            "<button onclick='toggleMealFavorite(" + idx + ")' title='" + heartTitle + "' style='background:none; border:none; cursor:pointer; font-size:0.85rem; padding:0; margin-top:4px; margin-right:8px; vertical-align:middle;'>" + heartIcon + "</button>" +
            "<button onclick='openEditMeal(" + idx + ")' style='background:none; border:none; color:var(--siep-blue); cursor:pointer; font-size:0.75rem; font-family:inherit; font-weight:700; margin-top:4px; margin-right:8px;'>✏️ Wijzigen</button>" +
            "<button onclick='deleteMeal(" + idx + ", this)' style='background:none; border:none; color:var(--takkie-red); cursor:pointer; font-size:0.75rem; font-family:inherit; font-weight:600; margin-top:4px;'>Verwijderen</button>" +
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

    // Update favorieten dropdowns & beheeroverzicht (alfabetisch: eerst maaltijden, dan drankjes)
    let mealOptions = "<option value=''>-- Geen favoriet geselecteerd --</option>";
    let drinkOptions = "<option value=''>-- Geen favoriet geselecteerd --</option>";
    let quickFavOptions = "<option value=''>⭐ Favoriet</option>";
    let favManageHtml = '';

    const indexedFavs = (appState.savedItems || []).map((item, idx) => ({ item, idx }));
    const sortByName = (a, b) => (a.item.name || '').localeCompare(b.item.name || '', 'nl', { sensitivity: 'base' });
    const mealFavs = indexedFavs.filter(x => x.item.type !== 'drink').sort(sortByName);
    const drinkFavs = indexedFavs.filter(x => x.item.type === 'drink').sort(sortByName);

    const renderFavManageRow = ({ item, idx }) => {
        const ic = Number(item.carbs) || 0;
        const ifat = Number(item.fat) || 0;
        const ip = Number(item.protein) || 0;
        const badgeLabel = item.type === 'drink' ? '🥤 Drank' : '🍽️ Maaltijd';
        return "<div class='meal-item'>" +
            "<div style='flex-grow:1;'><strong>" + badgeLabel + "</strong><br>" + escapeHtml(item.name) + "</div>" +
            "<div style='text-align: right; font-size: 0.8rem;'>" +
            "<span style='color:var(--takkie-red); font-weight:700;'>" + ic + "g</span> | " +
            "<span style='color:#B2530C; font-weight:700;'>" + ifat + "g</span> | " +
            "<span style='color:#1b4332; font-weight:700;'>" + ip + "g</span><br>" +
            "<button onclick='openEditFavorite(" + idx + ")' style='background:none; border:none; color:var(--siep-blue); cursor:pointer; font-size:0.75rem; font-family:inherit; font-weight:700; margin-top:4px; margin-right:8px;'>✏️ Wijzigen</button>" +
            "<button onclick='deleteFavorite(" + idx + ", this)' style='background:none; border:none; color:var(--takkie-red); cursor:pointer; font-size:0.75rem; font-family:inherit; font-weight:600; margin-top:4px;'>Verwijderen</button>" +
            "</div></div>";
    };

    mealFavs.forEach(({ item, idx }) => {
        const ic = Number(item.carbs) || 0;
        mealOptions += "<option value='" + idx + "'>" + escapeHtml(item.name) + " (" + ic + "g KH)</option>";
        quickFavOptions += "<option value='" + idx + "'>🍽️ " + escapeHtml(item.name) + " (" + ic + "g KH)</option>";
        favManageHtml += renderFavManageRow({ item, idx });
    });

    if (mealFavs.length > 0) {
        quickFavOptions += "<option value='' disabled>──────────────────</option>";
    }
    if (mealFavs.length > 0 && drinkFavs.length > 0) {
        favManageHtml += "<hr style='border: 0; border-top: 3px solid var(--border-color); margin: 14px 0;'>";
    }

    drinkFavs.forEach(({ item, idx }) => {
        const ic = Number(item.carbs) || 0;
        drinkOptions += "<option value='" + idx + "'>" + escapeHtml(item.name) + " (" + ic + "g KH)</option>";
        quickFavOptions += "<option value='" + idx + "'>🥤 " + escapeHtml(item.name) + " (" + ic + "g KH)</option>";
        favManageHtml += renderFavManageRow({ item, idx });
    });

    if (appState.savedItems.length === 0) {
        quickFavOptions += "<option value='' disabled>Nog geen favorieten</option>";
        favManageHtml = "<p style='text-align:center; color:#666; font-size:0.85rem;'>Je hebt nog geen favorieten opgeslagen. Klik op het hartje 🤍 bij een gelogde maaltijd of vink <b>💖 Sla op in mijn favorieten</b> aan!</p>";
    }

    if (document.getElementById('btn-favorite')) document.getElementById('btn-favorite').innerHTML = quickFavOptions;
    if (document.getElementById('favorite-meals-select')) document.getElementById('favorite-meals-select').innerHTML = mealOptions;
    if (document.getElementById('favorite-drinks-select')) document.getElementById('favorite-drinks-select').innerHTML = drinkOptions;
    if (document.getElementById('favorites-manage-list')) document.getElementById('favorites-manage-list').innerHTML = favManageHtml;

    // Update "🔄 Gisteren" dropdown (ontdubbeld & alfabetisch: eerst maaltijden, dan drankjes)
    let yesterdayOptions = "<option value=''>🔄 Gisteren</option>";
    const seenYesterdayKeys = new Set();
    const uniqueYesterday = [];
    (appState.yesterdayMeals || []).forEach((item, idx) => {
        const isDrinkItem = (item.type || '').includes('Drank');
        const cleanKey = (isDrinkItem ? 'drink:' : 'meal:') + (item.name || '').trim().toLowerCase();
        if (!seenYesterdayKeys.has(cleanKey)) {
            seenYesterdayKeys.add(cleanKey);
            uniqueYesterday.push({ item, idx });
        }
    });
    const yMeals = uniqueYesterday.filter(x => !(x.item.type || '').includes('Drank')).sort(sortByName);
    const yDrinks = uniqueYesterday.filter(x => (x.item.type || '').includes('Drank')).sort(sortByName);

    yMeals.forEach(({ item, idx }) => {
        const ic = Number(item.carbs) || 0;
        yesterdayOptions += "<option value='" + idx + "'>🍽️ " + escapeHtml(item.name) + " (" + ic + "g KH)</option>";
    });
    if (yMeals.length > 0 && yDrinks.length > 0) {
        yesterdayOptions += "<option value='' disabled>──────────────────</option>";
    }
    yDrinks.forEach(({ item, idx }) => {
        const ic = Number(item.carbs) || 0;
        yesterdayOptions += "<option value='" + idx + "'>🥤 " + escapeHtml(item.name) + " (" + ic + "g KH)</option>";
    });
    if ((appState.yesterdayMeals || []).length > 1) {
        yesterdayOptions += "<option value='' disabled>──────────────────</option>";
        yesterdayOptions += "<option value='all'>🔄 Alles van gisteren (" + appState.yesterdayMeals.length + ")</option>";
    }
    if (uniqueYesterday.length === 0) {
        yesterdayOptions += "<option value='' disabled>Geen hapjes van gisteren</option>";
    }
    if (document.getElementById('btn-repeat')) document.getElementById('btn-repeat').innerHTML = yesterdayOptions;

    renderTeamSection();
}

function initNavEvents() {
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

    if (document.getElementById('btn-home-goto-history')) {
        document.getElementById('btn-home-goto-history').addEventListener('click', () => switchTab('history'));
    }

    if (document.getElementById('btn-back-from-log')) {
        document.getElementById('btn-back-from-log').addEventListener('click', () => {
            if (appState.returnToHistoryDay) {
                appState.returnToHistoryDay = false;
                switchTab('history');
            } else {
                switchTab('home');
            }
        });
    }

    if (document.getElementById('btn-back-from-drink')) {
        document.getElementById('btn-back-from-drink').addEventListener('click', () => {
            if (appState.returnToHistoryDay) {
                appState.returnToHistoryDay = false;
                switchTab('history');
            } else {
                switchTab('home');
            }
        });
    }

    if (document.getElementById('btn-return-today')) {
        document.getElementById('btn-return-today').addEventListener('click', async () => {
            appState.returnToHistoryDay = false;
            await loadDateLog(getTodayString());
        });
    }

    if (document.getElementById('btn-favorite')) {
        document.getElementById('btn-favorite').addEventListener('change', async (e) => {
            const val = e.target.value;
            e.target.value = '';
            if (val === '') return;
            const item = appState.savedItems[parseInt(val, 10)];
            if (!item) return;

            const c = Number(item.carbs) || 0;
            const f = Number(item.fat) || 0;
            const p = Number(item.protein) || 0;

            if (item.type === 'drink') {
                await saveMeal('🥤 Drank', '1x ' + item.name, c, f, p);
                await updateWater(Math.min(8, appState.water + 1));
                await addPoints(5);
            } else {
                const hour = new Date().getHours();
                let mealType = '⚡ Snack';
                if (hour >= 5 && hour < 11) mealType = '🍳 Ontbijt';
                else if (hour >= 11 && hour < 16) mealType = '🥗 Lunch';
                else if (hour >= 16 && hour < 21) mealType = '🍲 Avondeten';
                await saveMeal(mealType, item.name, c, f, p);
                await addPoints(10);
            }
        });
    }

    if (document.getElementById('btn-repeat')) {
        document.getElementById('btn-repeat').addEventListener('change', async (e) => {
            const val = e.target.value;
            e.target.value = '';
            if (val === '') return;
            if (val === 'all') {
                await repeatYesterdayMeals();
                return;
            }
            const item = (appState.yesterdayMeals || [])[parseInt(val, 10)];
            if (!item) return;

            const c = Number(item.carbs) || 0;
            const f = Number(item.fat) || 0;
            const p = Number(item.protein) || 0;
            const isDrink = (item.type || '').includes('Drank');

            if (isDrink) {
                const amtMatch = (item.name || '').match(/^(\d+)\s*x\s+/i);
                const glasses = amtMatch ? Math.max(1, parseInt(amtMatch[1], 10)) : 1;
                await saveMeal('🥤 Drank', item.name, c, f, p);
                await updateWater(Math.min(8, appState.water + glasses));
                await addPoints(5);
            } else {
                await saveMeal(item.type || '🍽️ Maaltijd', item.name, c, f, p);
                await addPoints(10);
            }
        });
    }
}

function initProfileEvents() {
    if (document.getElementById('setting-share-logs')) {
        const shareBox = document.getElementById('setting-share-logs');
        shareBox.checked = isShareLogsEnabled();
        shareBox.addEventListener('change', () => {
            localStorage.setItem('takkie_share_logs', shareBox.checked ? '1' : '0');
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
}
