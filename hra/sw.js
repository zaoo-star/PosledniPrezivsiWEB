// ☢️ Pustina - Service Worker pro push notifikace
// UMÍSTĚNÍ: vedle index.html na serveru (stejná složka!)

const ICON = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">☢️</text></svg>');

// Okamžitá aktivace bez čekání na zavření tabů
self.addEventListener('install', function(event) {
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(clients.claim());
});

// Klik na notifikaci → fokusuj nebo otevři okno hry
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
            for (var i = 0; i < list.length; i++) {
                if ('focus' in list[i]) return list[i].focus();
            }
            if (clients.openWindow) return clients.openWindow('./');
        })
    );
});

// Zprávy z hlavní stránky (hlavní způsob volání notifikací)
self.addEventListener('message', function(event) {
    if (!event.data || event.data.type !== 'SHOW_NOTIFICATION') return;
    var d = event.data;
    self.registration.showNotification(d.title || '☢️ Pustina', {
        body: d.body || '',
        icon: ICON,
        badge: ICON,
        tag: d.tag || ('pustina-' + Date.now()),
        renotify: true,
        vibrate: [200, 100, 200],
        silent: d.silent || false
    });
});

// Server-side push (pro budoucí použití)
self.addEventListener('push', function(event) {
    var data = {};
    if (event.data) {
        try { data = event.data.json(); } catch(e) { data = { title: event.data.text() }; }
    }
    event.waitUntil(
        self.registration.showNotification(data.title || '☢️ Pustina', {
            body: data.body || '',
            icon: ICON,
            badge: ICON,
            tag: data.tag || 'pustina',
            renotify: true,
            vibrate: [200, 100, 200]
        })
    );
});
