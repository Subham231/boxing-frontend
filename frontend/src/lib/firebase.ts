import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAxY5fBm_NxO1Zazb3m3rOGUfUvNS1duUU",
  authDomain: "the-user-info-boxing.firebaseapp.com",
  projectId: "the-user-info-boxing",
  storageBucket: "the-user-info-boxing.firebasestorage.app",
  messagingSenderId: "253875884536",
  appId: "1:253875884536:web:4110313b3f7d912de5860d",
  measurementId: "G-5BLSXNX7EB",
};

// Avoid re-initializing during Next.js hot reload / multiple imports.
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(firebaseApp);

// Explicitly enforce permanent browserLocalPersistence to prevent session loss on browser reload/reopen
if (typeof window !== 'undefined') {
  setPersistence(firebaseAuth, browserLocalPersistence).catch((err) => {
    console.warn('[Firebase Auth] Failed to set local persistence:', err);
  });
}
