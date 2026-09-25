'use client';

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  type Firestore,
} from 'firebase/firestore';

/**
 * Configuration web Firebase : publique par nature (identifie le projet),
 * la sécurité repose sur les règles Firestore et sur App Check.
 */
/** Développement local sans projet Firebase : émulateurs Auth (9099) et Firestore (8080). */
const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === '1';

const config = useEmulators
  ? {
      apiKey: 'demo-key',
      authDomain: 'localhost',
      projectId: 'demo-atelier',
      storageBucket: '',
      messagingSenderId: '',
      appId: '1:0:web:demo',
    }
  : {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
    };

export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.projectId && config.appId);
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export function firebaseApp(): FirebaseApp {
  if (app) return app;
  app = getApps().length ? getApp() : initializeApp(config);
  if (typeof window !== 'undefined' && !useEmulators) void initAppCheck(app);
  return app;
}

async function initAppCheck(instance: FirebaseApp) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey) return;
  try {
    const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import('firebase/app-check');
    initializeAppCheck(instance, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    console.warn('[firebase] App Check indisponible', err);
  }
}

let authInstance: Auth | null = null;

export function auth(): Auth {
  if (authInstance) return authInstance;
  authInstance = getAuth(firebaseApp());
  if (useEmulators) connectAuthEmulator(authInstance, 'http://127.0.0.1:9099', { disableWarnings: true });
  return authInstance;
}

/**
 * Firestore avec cache persistant multi-onglets (IndexedDB) : l'écriture est
 * instantanée hors ligne puis synchronisée. Repli mémoire si IndexedDB est
 * indisponible (navigation privée).
 */
export function firestore(): Firestore {
  if (db) return db;
  const instance = firebaseApp();
  let localCache;
  try {
    localCache =
      typeof window !== 'undefined' && 'indexedDB' in window
        ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        : memoryLocalCache();
  } catch {
    localCache = memoryLocalCache();
  }
  db = initializeFirestore(instance, { localCache, ignoreUndefinedProperties: true });
  if (useEmulators) connectFirestoreEmulator(db, '127.0.0.1', 8080);
  return db;
}

/** Réinitialise les singletons après terminate() (déconnexion). */
export function resetFirestoreInstance() {
  db = null;
}
