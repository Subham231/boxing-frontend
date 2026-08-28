importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAxY5fBm_NxO1Zazb3m3rOGUfUvNS1duUU',
  authDomain: 'the-user-info-boxing.firebaseapp.com',
  projectId: 'the-user-info-boxing',
  storageBucket: 'the-user-info-boxing.firebasestorage.app',
  messagingSenderId: '253875884536',
  appId: '1:253875884536:web:4110313b3f7d912de5860d',
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  self.registration.showNotification(notification.title || 'SparAI is live', {
    body: notification.body || 'Your AI boxing coach is ready.',
    icon: '/icons/icon-192.png',
    data: { url: '/dashboard' },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || '/dashboard'));
});
