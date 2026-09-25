'use client';

import { BookOpen, Library, LogOut, Monitor, Moon, Coffee, Sun, UserRound } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useTheme, type ThemePreference } from '@/components/providers/theme-provider';
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/dropdown-menu';
import { signOutEverywhere } from '@/lib/firebase/auth';
import { cn, hardNavigate } from '@/lib/utils';

export function Avatar({ size = 32, className }: { size?: number; className?: string }) {
  const { profile, displayName, user } = useAuth();
  const url = profile.avatarUrl || user?.photoURL || '';
  return (
    <span
      className={cn('inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold text-white', className)}
      style={{ width: size, height: size, background: profile.avatarColor, fontSize: size * 0.42 }}
      aria-hidden
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        displayName.charAt(0).toUpperCase()
      )}
    </span>
  );
}

const THEMES: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Jour', icon: <Sun /> },
  { value: 'sepia', label: 'Sépia', icon: <Coffee /> },
  { value: 'night', label: 'Nuit', icon: <Moon /> },
  { value: 'system', label: 'Système', icon: <Monitor /> },
];

export function UserMenu({ mid }: { mid?: string }) {
  const { displayName, user } = useAuth();
  const { preference, setPreference } = useTheme();
  return (
    <Menu>
      <MenuTrigger asChild>
        <button
          type="button"
          className="rounded-full ring-offset-2 ring-offset-bg transition hover:ring-2 hover:ring-border-strong"
          aria-label="Menu du compte"
        >
          <Avatar />
        </button>
      </MenuTrigger>
      <MenuContent>
        <div className="px-2.5 pt-1.5 pb-2">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="truncate text-xs text-faint">{user?.isAnonymous ? 'Compte d’essai' : user?.email}</p>
        </div>
        <MenuSeparator />
        <MenuItem icon={<Library />} href="/bibliotheque">
          Bibliothèque
        </MenuItem>
        {mid && (
          <MenuItem icon={<BookOpen />} href={`/liseuse?m=${mid}`}>
            Liseuse
          </MenuItem>
        )}
        <MenuItem icon={<UserRound />} href="/compte">
          Compte & confidentialité
        </MenuItem>
        <MenuSeparator />
        <MenuLabel>Thème</MenuLabel>
        <div className="grid grid-cols-4 gap-1 px-1.5 pb-1.5">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setPreference(t.value)}
              aria-pressed={preference === t.value}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg py-2 text-[11px] text-muted transition hover:bg-surface-2 [&>svg]:size-4',
                preference === t.value && 'bg-surface-2 text-text ring-1 ring-border',
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        <MenuSeparator />
        <MenuItem
          icon={<LogOut />}
          onSelect={async () => {
            await signOutEverywhere();
            hardNavigate('/');
          }}
        >
          Se déconnecter
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
