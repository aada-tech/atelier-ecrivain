'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onAuthStateChanged, getRedirectResult, type User } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase/client';
import { ensureProfile, subscribeProfile, updateProfile, DEFAULT_PROFILE, type Profile } from '@/lib/data/profile';

type Status = 'loading' | 'signed-in' | 'signed-out' | 'unconfigured';

interface AuthContextValue {
  status: Status;
  user: User | null;
  profile: Profile;
  profileReady: boolean;
  displayName: string;
  saveProfile: (patch: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}

/** Variante qui retourne l'utilisateur garanti (sous <RequireAuth>). */
export function useUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error('Utilisateur non connecté');
  return user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured();
  const [status, setStatus] = useState<Status>(configured ? 'loading' : 'unconfigured');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    if (!configured) return;
    const a = auth();
    getRedirectResult(a).catch(() => {});
    return onAuthStateChanged(a, (u) => {
      setUser(u);
      setStatus(u ? 'signed-in' : 'signed-out');
      if (!u) {
        setProfile(DEFAULT_PROFILE);
        setProfileReady(false);
      }
    });
  }, [configured]);

  useEffect(() => {
    if (!user) return;
    let created = false;
    return subscribeProfile(
      user.uid,
      (p, exists) => {
        if (!exists && !created) {
          created = true;
          void ensureProfile(user.uid, user.displayName?.split(' ')[0] ?? '');
        }
        setProfile(p);
        setProfileReady(true);
      },
      () => setProfileReady(true),
    );
  }, [user]);

  const value = useMemo<AuthContextValue>(() => {
    const displayName =
      profile.penName || user?.displayName?.split(' ')[0] || (user?.isAnonymous ? 'Invité·e' : user?.email?.split('@')[0]) || 'Écrivain';
    return {
      status,
      user,
      profile,
      profileReady,
      displayName,
      saveProfile: async (patch) => {
        if (!user) return;
        setProfile((p) => ({ ...p, ...patch }));
        await updateProfile(user.uid, patch);
      },
    };
  }, [status, user, profile, profileReady]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
