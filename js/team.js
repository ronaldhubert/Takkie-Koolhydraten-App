// Clubje: aanmaken, joinen, verlaten, ledenstatus, co-op dashboard en het clubje-tabblad.
// Klassiek script (geen module): deelt globale functies en variabelen met de andere bestanden in js/.
// Zie ARCHITECTURE.md voor de laadvolgorde.

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
                        ${m.id !== currentUser.id ? `<button type="button" class="btn" style="margin: 6px 0 0; padding: 4px 10px; font-size: 0.75rem; background: white; width: auto;" onclick="openDirectMessage('${m.id}')">✉️ Stuur bericht</button>` : ''}
                    </div>
                </div>`;
            }).join('');
        }
    }
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

function initTeamEvents() {
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
}
