'use client';

import { createContext, useContext, type MutableRefObject } from 'react';

export interface Profile { id: string; username: string | null; default_photo: string | null }
export type AuthStatus = 'loading' | 'out' | 'in' | 'disabled';
export type LoginMode = 'login' | 'register';
type Provider = 'google' | 'github';

export interface AuthContextValue {
  status: AuthStatus;
  userId?: string;
  email?: string;
  profile: Profile | null;
  loginOpen: boolean;
  loginMode: LoginMode;
  openLogin: (mode?: LoginMode) => void;
  closeLogin: () => void;
  signInOAuth: (provider: Provider) => Promise<string | null>;
  signInEmail: (email: string, password: string) => Promise<string | null>;
  /** null = ok (loggato), 'confirm' = controlla la mail, altrimenti messaggio di errore */
  signUpEmail: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<Profile, 'username' | 'default_photo'>>) => Promise<string | null>;
  /** L'editor registra qui come salvare la bozza prima di un redirect OAuth (la pagina si ricarica). */
  beforeRedirect: MutableRefObject<(() => void) | null>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

export const CONFIRM_EMAIL = 'confirm';

