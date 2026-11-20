// Inloggen, registreren, wachtwoord vergeten/herstel en tonen van het inlogscherm.
// Klassiek script (geen module): deelt globale functies en variabelen met de andere bestanden in js/.
// Zie ARCHITECTURE.md voor de laadvolgorde.

// ==========================================
// AUTHENTICATIE LOGICA
// ==========================================
let passwordRecoveryMode = /type=recovery/.test(window.location.hash || '');

function showRecoveryForm() {
    passwordRecoveryMode = true;
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('auth-main-form').style.display = 'none';
    document.getElementById('auth-forgot-form').style.display = 'none';
    document.getElementById('auth-recovery-form').style.display = 'block';
}

async function checkUser() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (passwordRecoveryMode && session) {
        showRecoveryForm();
    } else if (session) {
        currentUser = session.user;
        showApp();
        await loadUserData();
    } else {
        showAuth();
    }

    window.supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        if (_event === 'PASSWORD_RECOVERY') {
            showRecoveryForm();
            return;
        }
        if (passwordRecoveryMode) return;
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

function showAuthError(msg, targetId = 'btn-login') {
    showInlineMessage(targetId, msg);
}

function initAuthEvents() {
    if (document.getElementById('btn-login')) {
        document.getElementById('btn-login').addEventListener('click', async () => {
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
            if (error) showInlineMessage('btn-login', error.message);
        });
    }

    if (document.getElementById('btn-register')) {
        document.getElementById('btn-register').addEventListener('click', async () => {
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            const { error } = await window.supabaseClient.auth.signUp({ email, password });
            if (error) {
                showInlineMessage('btn-register', error.message);
            } else {
                showInlineMessage('btn-register', 'Account aangemaakt! Bevestig je e-mail (indien nodig) of je bent direct ingelogd.');
            }
        });
    }

    if (document.getElementById('btn-forgot-password')) {
        document.getElementById('btn-forgot-password').addEventListener('click', () => {
            clearInlineMessages();
            document.getElementById('auth-main-form').style.display = 'none';
            document.getElementById('auth-forgot-form').style.display = 'block';
            document.getElementById('forgot-message').style.display = 'none';
            const typed = document.getElementById('auth-email').value.trim();
            document.getElementById('forgot-email').value = typed;
            document.getElementById('forgot-email').focus();
        });
    }

    if (document.getElementById('btn-back-to-login')) {
        document.getElementById('btn-back-to-login').addEventListener('click', () => {
            clearInlineMessages();
            document.getElementById('auth-forgot-form').style.display = 'none';
            document.getElementById('auth-main-form').style.display = 'block';
        });
    }

    if (document.getElementById('btn-send-reset')) {
        const sendReset = async () => {
            const btn = document.getElementById('btn-send-reset');
            const email = document.getElementById('forgot-email').value.trim();
            if (!email) {
                showInlineMessage('btn-send-reset', 'Vul je e-mailadres in.');
                return;
            }
            btn.disabled = true;
            btn.innerText = 'Even geduld...';
            try {
                const redirectTo = window.location.origin + window.location.pathname;
                const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
                if (error) showInlineMessage('btn-send-reset', error.message);
                else showInlineMessage('btn-send-reset', 'Woef! We hebben een herstellink gemaild naar ' + email + '. Check ook je spam.');
            } catch (e) {
                showInlineMessage('btn-send-reset', 'Er ging iets mis: ' + (e.message || e));
            }
            btn.disabled = false;
            btn.innerText = '📧 Stuur herstellink';
        };
        document.getElementById('btn-send-reset').addEventListener('click', sendReset);
        document.getElementById('forgot-email').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendReset();
        });
    }

    if (document.getElementById('btn-save-new-password')) {
        document.getElementById('btn-save-new-password').addEventListener('click', async () => {
            const p1 = document.getElementById('new-password').value;
            const p2 = document.getElementById('new-password-repeat').value;
            if (p1.length < 6) {
                showInlineMessage('btn-save-new-password', 'Kies een wachtwoord van minimaal 6 tekens.');
                return;
            }
            if (p1 !== p2) {
                showInlineMessage('btn-save-new-password', 'De twee wachtwoorden zijn niet hetzelfde.');
                return;
            }
            const { error } = await window.supabaseClient.auth.updateUser({ password: p1 });
            if (error) {
                showInlineMessage('btn-save-new-password', error.message);
                return;
            }
            showInlineMessage('btn-save-new-password', 'Gelukt! Je nieuwe wachtwoord is opgeslagen.');
            setTimeout(() => {
                window.location.href = window.location.origin + window.location.pathname;
            }, 1200);
        });
    }

    if (document.getElementById('btn-logout')) {
        document.getElementById('btn-logout').addEventListener('click', async () => {
            await window.supabaseClient.auth.signOut();
        });
    }
}
