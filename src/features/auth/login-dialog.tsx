'use client';

import { MailCheck } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/modal';
import { withBasePath } from '@/config/brand';
import { CONFIRM_EMAIL, useAuth } from './auth-context';

const inputCls = 'w-full rounded-md border border-border bg-bg px-3 py-2.5 text-sm text-fg placeholder:text-muted';
const oauthCls = 'flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-bg px-4 py-2.5 text-sm font-semibold text-fg transition-colors hover:border-accent hover:text-accent-text disabled:opacity-50';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.5 14.6 2.6 12 2.6 6.9 2.6 2.8 6.7 2.8 11.9S6.9 21.2 12 21.2c5.3 0 8.8-3.7 8.8-9 0-.6-.1-1.1-.2-1.6H12z" />
  </svg>
);
const GithubIcon = () => (
  <svg viewBox="0 0 16 16" className="size-5" fill="currentColor" aria-hidden>
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
    <rect width="24" height="24" rx="4" fill="#0A66C2" />
    <path fill="#fff" d="M7.1 9.6h2.6V18H7.1zM8.4 5.4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM11.3 9.6h2.5v1.15h.04c.35-.66 1.2-1.36 2.47-1.36 2.64 0 3.13 1.74 3.13 4V18h-2.6v-4.1c0-.98-.02-2.24-1.36-2.24-1.37 0-1.58 1.07-1.58 2.17V18h-2.6z" />
  </svg>
);

export function LoginDialog() {
  const auth = useAuth();
  const locale = useLocale();
  const { loginOpen, loginMode, closeLogin, status } = auth;
  const [mode, setMode] = useState(loginMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [confirm, setConfirm] = useState(false);

  useEffect(() => { if (loginOpen) { setMode(loginMode); setError(undefined); setConfirm(false); } }, [loginOpen, loginMode]);
  useEffect(() => { if (status === 'in') closeLogin(); }, [status, closeLogin]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(undefined);
    const result = mode === 'login' ? await auth.signInEmail(email.trim(), password) : await auth.signUpEmail(email.trim(), password);
    setBusy(false);
    if (result === CONFIRM_EMAIL) return setConfirm(true);
    if (result) setError(result);
  }
  async function oauth(provider: 'google' | 'github' | 'linkedin_oidc') {
    setBusy(true); setError(undefined);
    const err = await auth.signInOAuth(provider);
    if (err) { setError(err); setBusy(false); }
  }

  return (
    <Modal open={loginOpen} onClose={closeLogin} title={confirm ? 'Check your inbox' : mode === 'login' ? 'Log in' : 'Create your account'}>
      {status === 'disabled' ? (
        <p className="text-sm text-muted">Accounts are not enabled on this site yet. You can keep using the editor and download your PDF without one.</p>
      ) : confirm ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <MailCheck className="size-10 text-accent" aria-hidden />
          <p className="text-sm text-muted">We sent a confirmation link to <strong className="text-fg">{email}</strong>. Open it to finish creating your account.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2.5">
            <button type="button" className={oauthCls} disabled={busy} onClick={() => void oauth('google')}><GoogleIcon /> Continue with Google</button>
            <button type="button" className={oauthCls} disabled={busy} onClick={() => void oauth('github')}><GithubIcon /> Continue with GitHub</button>
            <button type="button" className={oauthCls} disabled={busy} onClick={() => void oauth('linkedin_oidc')}><LinkedInIcon /> Continue with LinkedIn</button>
          </div>
          <p className="flex items-center gap-3 text-xs text-muted before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">or with email</p>
          <form onSubmit={submit} className="flex flex-col gap-3" noValidate={false}>
            <label className="flex flex-col gap-1.5 text-xs text-muted">Email
              <input className={inputCls} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-muted">Password
              <input className={inputCls} type="password" required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'register' ? 'At least 8 characters' : ''} />
            </label>
            {error ? <p role="alert" className="rounded-md border border-red-400/40 bg-red-400/10 p-2.5 text-xs text-red-300">{error}</p> : null}
            <button type="submit" disabled={busy} className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50">
              {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Register now'}
            </button>
          </form>
          <p className="text-center text-sm text-muted">
            {mode === 'login' ? 'New here? ' : 'Already have an account? '}
            <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(undefined); }} className="font-semibold text-accent-text underline-offset-4 hover:underline">
              {mode === 'login' ? 'Register now' : 'Log in'}
            </button>
          </p>
          <p className="text-center text-xs text-muted">
            By continuing you accept our <a href={withBasePath(`/${locale}/privacy/`)} className="underline underline-offset-2 hover:text-fg">privacy policy</a>.
          </p>
        </div>
      )}
    </Modal>
  );
}
