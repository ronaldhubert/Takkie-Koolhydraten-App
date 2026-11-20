// Huiskamer-chat: berichten, privéberichten, SOS, gedeelde recepten en realtime updates.
// Klassiek script (geen module): deelt globale functies en variabelen met de andere bestanden in js/.
// Zie ARCHITECTURE.md voor de laadvolgorde.

function getMemberName(userId) {
    const mem = (appState.teamMembers || []).find(x => x.id === userId);
    return mem ? mem.displayName : 'clublid';
}

window.openDirectMessage = function(recipientId, btnEl = null) {
    const old = document.getElementById('dm-inline-box');
    if (old) old.remove();
    const name = getMemberName(recipientId);
    const anchor = (btnEl && btnEl.closest('.member-card')) || btnEl || document.getElementById('team-members-list');
    if (!anchor || !anchor.parentNode) return;

    const box = document.createElement('div');
    box.id = 'dm-inline-box';
    box.style.cssText = 'background:#FFF9E6; border:2px solid var(--border-color); border-radius:14px; padding:12px; margin:8px 0; box-shadow:2px 2px 0px var(--border-color);';
    box.innerHTML = `
        <div style="font-weight:700; font-size:0.88rem; margin-bottom:4px;">✉️ Privébericht aan ${escapeHtml(name)}</div>
        <div style="font-size:0.76rem; color:#666; margin-bottom:8px;">Alleen jij en ${escapeHtml(name)} zien dit bericht in de Huiskamer.</div>
        <textarea id="dm-text" rows="2" maxlength="300" placeholder="Typ een lief berichtje..." style="width:100%; box-sizing:border-box; font-family:inherit; padding:8px; margin-bottom:8px; border:2px solid var(--border-color); border-radius:10px;"></textarea>
        <div style="display:flex; gap:8px;">
            <button type="button" class="btn" id="dm-cancel" style="flex:1; padding:8px; background:#eee;">Annuleren</button>
            <button type="button" class="btn" id="dm-send" style="flex:1; padding:8px; background-color: var(--accent-green);">🐾 Versturen</button>
        </div>`;
    anchor.insertAdjacentElement('afterend', box);
    const textEl = document.getElementById('dm-text');
    textEl.focus();
    document.getElementById('dm-cancel').addEventListener('click', () => box.remove());
    document.getElementById('dm-send').addEventListener('click', async () => {
        const text = textEl.value.trim();
        if (!text) {
            showInlineMessage('dm-send', 'Typ eerst een lief berichtje!', 'error');
            return;
        }
        const sendBtn = document.getElementById('dm-send');
        sendBtn.disabled = true;
        const ok = await sendTeamMessage('text', text, null, null, recipientId);
        if (ok === false) {
            sendBtn.disabled = false;
            return;
        }
        box.remove();
        showInlineMessage(anchor, `Privébericht verstuurd aan ${name}!`, 'success');
    });
};

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
                    notifyNewTeamMessage(newMsg);
                }
                if (newMsg.msg_type === 'system') {
                    await refreshTeamMembersCoop();
                }
            }
        )
        .subscribe();
}

async function sendTeamMessage(msgType, content, recipePayload = null, overridePet = null, recipientId = null) {
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
    if (recipientId) newMsg.recipient_id = recipientId;

    const { data: inserted, error: sendError } = await window.supabaseClient
        .from('team_messages')
        .insert([newMsg])
        .select()
        .single();
    if (sendError && recipientId) {
        showInlineMessage('dm-send', 'Het privébericht kon niet worden verstuurd. Heb je supabase-direct-messages.sql al uitgevoerd in Supabase? (' + sendError.message + ')', 'error', 8000);
        return false;
    }

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
        switchTab('team');
        showInlineMessage('btn-create-team', "Je zit nog niet in een clubje! Maak hieronder een clubje aan of word lid met een code.", 'info', 7000);
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

    switchTab('team');
    showInlineMessage('team-chat-list', `Woef! "${r.name}" staat nu in Takkie & Siep's Huiskamer voor je hele clubje!`, 'success');
};

window.addSharedRecipeToMine = async function(msgIdx, btnEl = null) {
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

    showInlineMessage(btnEl || 'team-shared-recipes-list', `💖 "${rp.name}" is toegevoegd aan jouw favorieten én je receptenboek!`, 'success');
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
                <button onclick="addSharedRecipeToMine(${idx}, this)" class="btn" style="padding: 5px 10px; font-size: 0.75rem; background: var(--accent-yellow);">💖 Voeg toe aan mijn favorieten</button>
            </div>`;
        }

        const privateLabel = m.recipient_id
            ? `<div style="font-size:0.68rem; font-weight:700; color:var(--takkie-red);">🔒 ${isMine ? 'Privé aan ' + escapeHtml(getMemberName(m.recipient_id)) : 'Privé voor jou'}</div>`
            : '';
        return `<div class="chat-msg ${isMine ? 'mine' : ''}"${m.recipient_id ? ' style="border-style: dashed;"' : ''}>
            <div class="chat-msg-header">
                <span>${petIcon} ${escapeHtml(m.sender_name)}</span>
                <span>${timeStr}</span>
            </div>
            ${privateLabel}
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
            <button onclick="addSharedRecipeToMine(${idx}, this)" class="btn" style="padding: 6px 10px; font-size: 0.75rem; background: var(--accent-yellow); flex-shrink: 0;">💖 + Favoriet</button>
        </div>`;
    }).join('');
}

function initChatEvents() {
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
}
