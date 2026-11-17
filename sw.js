// Service worker: ontvangt pushmeldingen, ook als de app gesloten is
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data ? event.data.text() : '' }; }
    const title = data.title || '🐾 Takkie & Siep';
    const options = {
        body: data.body || 'Nieuw berichtje in het clubje!',
        icon: 'takkie.png',
        badge: 'takkie.png',
        tag: 'takkie-team-chat',
        data: { url: data.url || './' }
    };
    event.waitUntil((async () => {
        // Als de app zichtbaar open staat, toont de app zelf al een melding
        const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        if (wins.some(w => w.visibilityState === 'visible')) return;
        await self.registration.showNotification(title, options);
    })());
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = (event.notification.data && event.notification.data.url) || './';
    event.waitUntil((async () => {
        const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const w of wins) {
            if ('focus' in w) return w.focus();
        }
        return self.clients.openWindow(target);
    })());
});
