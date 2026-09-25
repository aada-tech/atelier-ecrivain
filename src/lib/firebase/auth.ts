'use client';

import {
  EmailAuthProvider,
  GoogleAuthProvider,
  isSignInWithEmailLink,
  linkWithCredential,
  linkWithPopup,
  reauthenticateWithPopup,
  sendSignInLinkToEmail,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailLink,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  deleteUser,
  type User,
  type AuthError,
} from 'firebase/auth';
import { clearIndexedDbPersistence, terminate } from 'firebase/firestore';
import { auth, firestore } from './client';

const EMAIL_KEY = 'atelier:email-for-signin';

function googleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

/** Connexion Google. Un compte d'essai anonyme est converti (ses manuscrits sont conservés). */
export async function signInWithGoogle(): Promise<void> {
  const a = auth();
  const current = a.currentUser;
  try {
    if (current?.isAnonymous) {
      try {
        await linkWithPopup(current, googleProvider());
        return;
      } catch (err) {
        const e = err as AuthError;
        if (e.code === 'auth/credential-already-in-use') {
          const cred = GoogleAuthProvider.credentialFromError(e);
          if (cred) {
            await signInWithCredential(a, cred);
            return;
          }
        }
        throw err;
      }
    }
    await signInWithPopup(a, googleProvider());
  } catch (err) {
    const code = (err as AuthError).code;
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(a, googleProvider());
      return;
    }
    throw err;
  }
}

export async function sendMagicLink(email: string): Promise<void> {
  const url = `${window.location.origin}/connexion?lien=1`;
  await sendSignInLinkToEmail(auth(), email, { url, handleCodeInApp: true });
  try {
    window.localStorage.setItem(EMAIL_KEY, email);
  } catch {}
}

export function isMagicLink(href: string): boolean {
  return isSignInWithEmailLink(auth(), href);
}

export function storedMagicLinkEmail(): string | null {
  try {
    return window.localStorage.getItem(EMAIL_KEY);
  } catch {
    return null;
  }
}

export async function completeMagicLink(email: string, href: string): Promise<void> {
  const a = auth();
  const current = a.currentUser;
  if (current?.isAnonymous) {
    const cred = EmailAuthProvider.credentialWithLink(email, href);
    try {
      await linkWithCredential(current, cred);
    } catch (err) {
      if ((err as AuthError).code === 'auth/email-already-in-use' || (err as AuthError).code === 'auth/credential-already-in-use') {
        await signInWithEmailLink(a, email, href);
      } else throw err;
    }
  } else {
    await signInWithEmailLink(a, email, href);
  }
  try {
    window.localStorage.removeItem(EMAIL_KEY);
  } catch {}
}

export async function startAnonymousTrial(): Promise<void> {
  await signInAnonymously(auth());
}

/**
 * Déconnexion « propre » : purge le cache hors ligne Firestore (IndexedDB)
 * et les préférences locales liées au compte — important sur un appareil partagé.
 */
export async function signOutEverywhere(): Promise<void> {
  await fbSignOut(auth());
  try {
    const db = firestore();
    await terminate(db);
    await clearIndexedDbPersistence(db);
  } catch (err) {
    console.warn('[auth] purge du cache local incomplète', err);
  }
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith('atelier:') && key !== 'atelier:theme') window.localStorage.removeItem(key);
    }
  } catch {}
}

/** Suppression définitive du compte d'authentification (après effacement des données). */
export async function deleteAuthAccount(user: User): Promise<void> {
  try {
    await deleteUser(user);
  } catch (err) {
    if ((err as AuthError).code === 'auth/requires-recent-login') {
      const isGoogle = user.providerData.some((p) => p.providerId === 'google.com');
      if (!isGoogle) throw err;
      await reauthenticateWithPopup(user, googleProvider());
      await deleteUser(user);
      return;
    }
    throw err;
  }
}

export function describeAuthError(err: unknown): string {
  const code = (err as AuthError)?.code ?? '';
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Fenêtre de connexion fermée avant la fin.';
    case 'auth/unauthorized-domain':
      return 'Ce domaine n’est pas autorisé dans la configuration Firebase.';
    case 'auth/operation-not-allowed':
      return 'Cette méthode de connexion n’est pas activée pour ce projet.';
    case 'auth/invalid-email':
      return 'Adresse e-mail invalide.';
    case 'auth/invalid-action-code':
    case 'auth/expired-action-code':
      return 'Ce lien de connexion a expiré ou a déjà été utilisé.';
    case 'auth/network-request-failed':
      return 'Connexion réseau indisponible.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Réessayez dans quelques minutes.';
    case 'auth/web-storage-unsupported':
      return 'Le stockage du navigateur est bloqué (navigation privée ?).';
    case 'auth/requires-recent-login':
      return 'Par sécurité, reconnectez-vous puis réessayez.';
    default:
      return 'La connexion a échoué. Réessayez.';
  }
}
