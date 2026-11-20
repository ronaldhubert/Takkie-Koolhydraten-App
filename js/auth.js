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

function showAuthError(msg) {
    const errEl = document.getElementById('auth-error-message');
    if (errEl) {
        errEl.innerText = msg;
        errEl.style.display = 'block';
    }
}

function initAuthEvents() {
    if (document.getElementById('btn-login')) {
        document.getElementById('btn-login').addEventListener('click', async () => {
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
            if (error) showAuthError(error.message);
        });
    }

    if (document.getElementById('btn-register')) {
        document.getElementById('btn-register').addEventListener('click', async () => {
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            const errEl = document.getElementById('auth-error-message');
            if (errEl) {
                errEl.style.background = '';
                errEl.style.color = '';
            }
            const { error } = await window.supabaseClient.auth.signUp({ email, password });
            if (error) {
                showAuthError(error.message);
            } else if (errEl) {
                errEl.innerText = 'Woef! Account aangemaakt! Bevestig je e-mail (indien nodig) of je bent direct ingelogd. 🐾';
                errEl.style.background = '#E8F5E9';
                errEl.style.color = '#1B5E20';
                errEl.style.display = 'block';
            }
        });
    }

    if (document.getElementById('btn-forgot-password')) {
        document.getElementById('btn-forgot-password').addEventListener('click', () => {
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
            document.getElementById('auth-forgot-form').style.display = 'none';
            document.getElementById('auth-main-form').style.display = 'block';
        });
    }

    if (document.getElementById('btn-send-reset')) {
        const sendReset = async () => {
            const btn = document.getElementById('btn-send-reset');
            const msgEl = document.getElementById('forgot-message');
            const email = document.getElementById('forgot-email').value.trim();
            const show = (text, ok) => {
                msgEl.innerText = text;
                msgEl.style.display = 'block';
                msgEl.style.background = ok ? '#E8F5E9' : '';
                msgEl.style.color = ok ? '#1B5E20' : '';
            };
            if (!email) {
                show('Vul je e-mailadres in.', false);
                return;
            }
            btn.disabled = true;
            btn.innerText = 'Even geduld...';
            try {
                const redirectTo = window.location.origin + window.location.pathname;
                const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
                if (error) show(error.message, false);
                else show('Woef! We hebben een herstellink gemaild naar ' + email + '. Check ook je spam 🐾', true);
            } catch (e) {
                show('Er ging iets mis: ' + (e.message || e), false);
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
            const errEl = document.getElementById('recovery-error-message');
            errEl.style.display = 'none';
            if (p1.length < 6) {
                errEl.innerText = 'Kies een wachtwoord van minimaal 6 tekens.';
                errEl.style.display = 'block';
                return;
            }
            if (p1 !== p2) {
                errEl.innerText = 'De twee wachtwoorden zijn niet hetzelfde.';
                errEl.style.display = 'block';
                return;
            }
            const { error } = await window.supabaseClient.auth.updateUser({ password: p1 });
            if (error) {
                errEl.style.background = '';
                errEl.style.color = '';
                errEl.innerText = error.message;
                errEl.style.display = 'block';
                return;
            }
            errEl.innerText = 'Gelukt! Je nieuwe wachtwoord is opgeslagen 🐶';
            errEl.style.background = '#E8F5E9';
            errEl.style.color = '#1B5E20';
            errEl.style.display = 'block';
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
