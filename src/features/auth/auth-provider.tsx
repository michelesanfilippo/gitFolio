'use client';

import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CONFIRM_EMAIL } from './auth-context';
import { getSupabase, shouldBootstrapAuth, supabaseConfigured } from '@/lib/supabase';
import { AuthContext, type AuthContextValue, type AuthStatus, type LinkedInIdentity, type LoginMode, type Profile } from './auth-context';
import { LoginDialog } from './login-dialog';

function friendly(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Wrong email or password.';
  if (/already registered|already been registered/i.test(message)) return 'An account with this email already exists. Try logging in.';
  if (/email not confirmed/i.test(message)) return 'Please confirm your email first: check your inbox.';
  if (/password.*(short|least|weak)/i.test(message)) return 'Choose a longer password (at least 8 characters).';
  if (/rate limit|too many/i.test(message)) return 'Too many attempts. Please wait a minute and try again.';
  return message;
}

const returnUrl = () => `${window.location.origin}${window.location.pathname}${window.location.search}`;
// Il popup torna su una pagina leggera (la home della lingua) che completa il login e si chiude da sola.
const POPUP_FLAG = 'oauth-popup';
const popupReturnUrl = () => `${window.location.origin}${window.location.pathname.replace(/editor\/?$/, '')}?${POPUP_FLAG}=1`;
const POPUP_TIMEOUT_MS = 5 * 60 * 1000;

function linkedInOf(s: Session | null): LinkedInIdentity | undefined {
  const id = s?.user.identities?.find((i) => i.provider === 'linkedin_oidc');
  if (!id) return undefined;
  const d = { ...s!.user.user_metadata, ...id.identity_data } as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
  return { name: str(d.name) ?? str(d.full_name), email: str(d.email), picture: str(d.picture) ?? str(d.avatar_url) };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>('login');
  const beforeRedirect = useRef<(() => void) | null>(null);
  const started = useRef<Promise<SupabaseClient | null> | null>(null);

  const loadProfile = useCallback(async (sb: SupabaseClient, uid: string) => {
    const { data } = await sb.from('profiles').select('id, username, default_photo').eq('id', uid).maybeSingle();
    if (data) return setProfile(data as Profile);
    const { data: created } = await sb.from('profiles').insert({ id: uid }).select('id, username, default_photo').maybeSingle();
    setProfile((created as Profile | null) ?? { id: uid, username: null, default_photo: null });
  }, []);

  const apply = useCallback((sb: SupabaseClient, s: Session | null) => {
    setSession(s);
    setStatus(s ? 'in' : 'out');
    if (s) setTimeout(() => void loadProfile(sb, s.user.id), 0); // fuori dal callback di supabase-js (evita deadlock)
    else setProfile(null);
  }, [loadProfile]);

  /** Inizializza il client una sola volta e si abbona ai cambi di sessione. */
  const start = useCallback((): Promise<SupabaseClient | null> => {
    started.current ??= (async () => {
      const sb = await getSupabase();
      if (!sb) return null;
      const { data } = await sb.auth.getSession();
      apply(sb, data.session);
      sb.auth.onAuthStateChange((_event, s) => apply(sb, s));
      return sb;
    })();
    return started.current;
  }, [apply]);

  useEffect(() => {
    if (!supabaseConfigured) return setStatus('disabled');
    if (shouldBootstrapAuth()) void start();
    else setStatus('out');
  }, [start]);

  // Siamo il popup del login: appena la sessione è salvata (la finestra principale la legge dallo storage condiviso) si chiude.
  useEffect(() => {
    if (status !== 'in' || !new URLSearchParams(window.location.search).has(POPUP_FLAG)) return;
    window.close();
  }, [status]);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    userId: session?.user.id,
    email: session?.user.email ?? undefined,
    profile,
    linkedIn: linkedInOf(session),
    loginOpen, loginMode,
    openLogin: (mode = 'login') => { setLoginMode(mode); setLoginOpen(true); void start(); },
    closeLogin: () => setLoginOpen(false),
    async signInOAuth(provider) {
      const sb = await start();
      if (!sb) return 'Accounts are not enabled on this site yet.';
      beforeRedirect.current?.();
      const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: returnUrl() } });
      return error ? friendly(error.message) : null;
    },
    async signInOAuthPopup(provider, signal) {
      const sb = await start();
      if (!sb) return 'Accounts are not enabled on this site yet.';
      const { data: cur } = await sb.auth.getSession();
      const opts = { redirectTo: popupReturnUrl(), skipBrowserRedirect: true };
      // già loggati con un altro metodo: si collega LinkedIn allo stesso account invece di cambiarlo
      const { data, error } = cur.session ? await sb.auth.linkIdentity({ provider, options: opts }) : await sb.auth.signInWithOAuth({ provider, options: opts });
      if (error || !data.url) return friendly(error?.message ?? 'Could not start the login.');
      const w = window.open(data.url, 'gitfolio-oauth', 'popup,width=520,height=700');
      if (!w) { // popup bloccato: redirect classico (la bozza dell'editor passa per sessionStorage)
        beforeRedirect.current?.();
        window.location.assign(data.url.replace(encodeURIComponent(popupReturnUrl()), encodeURIComponent(returnUrl())));
        return null;
      }
      // La pagina di LinkedIn isola il popup (COOP), quindi `w.closed` non è affidabile: si attende che il popup salvi
      // nello storage condiviso una sessione con l'identità del provider.
      return new Promise<string | null>((resolve) => {
        const check = async () => {
          const { data: s } = await sb.auth.getSession();
          if (!s.session?.user.identities?.some((i) => i.provider === provider)) return;
          apply(sb, s.session);
          finish(null);
        };
        const onStorage = (e: StorageEvent) => { if (e.key?.startsWith('sb-')) void check(); };
        const { data: { subscription } } = sb.auth.onAuthStateChange(() => void check());
        const timer = window.setTimeout(() => finish('LinkedIn login timed out. Please try again.'), POPUP_TIMEOUT_MS);
        const onAbort = () => { try { w.close(); } catch { /* finestra già isolata */ } finish('cancelled'); };
        function finish(r: string | null) {
          window.clearTimeout(timer); window.removeEventListener('storage', onStorage); subscription.unsubscribe(); signal?.removeEventListener('abort', onAbort);
          resolve(r);
        }
        window.addEventListener('storage', onStorage);
        signal?.addEventListener('abort', onAbort);
      });
    },
    async signInEmail(email, password) {
      const sb = await start();
      if (!sb) return 'Accounts are not enabled on this site yet.';
      const { error } = await sb.auth.signInWithPassword({ email, password });
      return error ? friendly(error.message) : null;
    },
    async signUpEmail(email, password) {
      const sb = await start();
      if (!sb) return 'Accounts are not enabled on this site yet.';
      const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: returnUrl() } });
      if (error) return friendly(error.message);
      return data.session ? null : CONFIRM_EMAIL;
    },
    async signOut() {
      const sb = await start();
      await sb?.auth.signOut();
    },
    async updateProfile(patch) {
      const sb = await start();
      if (!sb || !session) return 'You are not logged in.';
      const { data, error } = await sb.from('profiles').update(patch).eq('id', session.user.id).select('id, username, default_photo').single();
      if (error) return error.message;
      setProfile(data as Profile);
      return null;
    },
    beforeRedirect,
  }), [status, session, profile, loginOpen, loginMode, start, apply]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      <LoginDialog />
    </AuthContext.Provider>
  );
}
