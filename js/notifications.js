// Meldingen en Web Push (service worker, abonnementen).
// Klassiek script (geen module): deelt globale functies en variabelen met de andere bestanden in js/.
// Zie ARCHITECTURE.md voor de laadvolgorde.

function updateNotificationButton() {
    const btn = document.getElementById('btn-enable-notifications');
    if (!btn) return;
    if (!('Notification' in window)) {
        btn.style.display = 'none';
    } else if (Notification.permission === 'granted') {
        btn.innerText = '🔔 Meldingen staan aan';
    } else if (Notification.permission === 'denied') {
        btn.innerText = '🔕 Meldingen geblokkeerd in je browser';
    }
}

const VAPID_PUBLIC_KEY = 'BOUMIGWtX4L7uQ5jL3c8U1ZR_6DZ3tJQRrY0BtXLcTMA3hyFfFBOvyRy2hH-U2GrNQPnZiFMMVh1kl35F47a0ek';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
}

async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return null;
    try {
        return await navigator.serviceWorker.register('sw.js');
    } catch (e) {
        console.warn('Service worker registratie mislukt', e);
        return null;
    }
}

// Zet Web Push aan voor dit apparaat (werkt ook als de app gesloten is)
async function subscribeToPush() {
    if (!currentUser || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    if (Notification.permission !== 'granted') return false;
    try {
        const reg = await registerServiceWorker();
        if (!reg) return false;
        await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
        }
        const json = sub.toJSON();
        const { error } = await window.supabaseClient.from('push_subscriptions').upsert([{
            user_id: currentUser.id,
            endpoint: json.endpoint,
            p256dh: json.keys.p256dh,
            auth: json.keys.auth
        }], { onConflict: 'endpoint' });
        if (error) {
            console.warn('Push-gegevens opslaan mislukt', error.message);
            return false;
        }
        return true;
    } catch (e) {
        console.warn('Push aanzetten mislukt', e);
        return false;
    }
}

async function enableNotifications() {
    if (!('Notification' in window)) {
        alert('Deze browser ondersteunt geen meldingen. Op een iPhone werkt dit alleen als je de app eerst op het beginscherm zet (Deel → Zet op beginscherm) en vanaf dat icoon opent.');
        return;
    }
    await Notification.requestPermission();
    updateNotificationButton();
    if (Notification.permission === 'granted') {
        const pushOk = await subscribeToPush();
        showTeamNotification('Takkie & Siep', pushOk
            ? 'Woef! Je krijgt nu ook een melding als de app dicht is 🐾'
            : 'Woef! Je krijgt nu een melding bij nieuwe berichtjes 🐾');
    }
}

function showTeamNotification(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const options = { body, icon: 'takkie.png', tag: 'takkie-team-chat' };
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
        navigator.serviceWorker.getRegistration().then(reg => {
            if (reg) reg.showNotification(title, options);
            else new Notification(title, options);
        }).catch(() => { try { new Notification(title, options); } catch (e) {} });
    } else {
        try { new Notification(title, options); } catch (e) {}
    }
}

function notifyNewTeamMessage(msg) {
    if (!msg || (currentUser && msg.user_id === currentUser.id)) return;
    if (msg.recipient_id && msg.recipient_id !== (currentUser && currentUser.id)) return;
    const teamTabActive = document.getElementById('tab-team') &&
        document.getElementById('tab-team').classList.contains('active');
    if (!document.hidden && teamTabActive) return;
    let title = msg.msg_type === 'system' ? '🐾 Takkie & Siep' : `💬 ${msg.sender_name || 'Clubje'}`;
    if (msg.recipient_id) title = `💌 Privébericht van ${msg.sender_name || 'een clublid'}`;
    showTeamNotification(title, msg.content || 'Nieuw berichtje!');
}

function initNotificationEvents() {
    if (document.getElementById('btn-enable-notifications')) {
        document.getElementById('btn-enable-notifications').addEventListener('click', enableNotifications);
        updateNotificationButton();
    }
}
