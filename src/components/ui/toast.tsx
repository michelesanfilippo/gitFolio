'use client';

import { AlertTriangle, Check, X } from 'lucide-react';
import { useEffect, useRef, useSyncExternalStore } from 'react';

// Notifiche in basso a destra. `toast.ok('…')` / `toast.error('…')` da qualsiasi punto; <Toaster /> montato una volta
// nella pagina. Scompaiono da sole (pausa col mouse sopra), lette dagli screen reader (status / alert).

export interface Toast { id: number; kind: 'ok' | 'error'; text: string; leaving?: boolean }

const OK_MS = 3800;
const ERROR_MS = 8000;
const LEAVE_MS = 220;

let items: Toast[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const snapshot = () => items;

function dismiss(id: number) {
  if (!items.some((t) => t.id === id && !t.leaving)) return;
  items = items.map((t) => (t.id === id ? { ...t, leaving: true } : t)); emit();
  window.setTimeout(() => { items = items.filter((t) => t.id !== id); emit(); }, LEAVE_MS);
}

function push(kind: Toast['kind'], text: string) {
  const id = ++seq;
  items = [...items.filter((t) => t.text !== text || t.leaving), { id, kind, text }].slice(-4); // stesso testo: niente doppioni
  emit();
  return id;
}

export const toast = {
  ok: (text: string) => push('ok', text),
  error: (text: string) => push('error', text),
  dismiss,
};

function Item({ t }: { t: Toast }) {
  const timer = useRef(0);
  const left = useRef(t.kind === 'ok' ? OK_MS : ERROR_MS);
  const started = useRef(0);
  const start = () => { started.current = Date.now(); timer.current = window.setTimeout(() => dismiss(t.id), left.current); };
  const pause = () => { window.clearTimeout(timer.current); left.current = Math.max(600, left.current - (Date.now() - started.current)); };
  useEffect(() => { start(); return () => window.clearTimeout(timer.current); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div role={t.kind === 'error' ? 'alert' : 'status'} onMouseEnter={pause} onMouseLeave={start}
      className={`toast ${t.leaving ? 'toast-leave' : ''} pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl border px-3.5 py-3 text-sm shadow-2xl ${
        t.kind === 'error' ? 'border-red-400/40 bg-[#2a1b1b] text-red-100' : 'border-border bg-surface text-fg'}`}>
      {t.kind === 'ok'
        ? <span className="toast-check mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent text-accent-fg"><Check className="size-3.5" strokeWidth={3} aria-hidden /></span>
        : <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-300" aria-hidden />}
      <span className="min-w-0 flex-1 leading-snug">{t.text}</span>
      <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" data-tip="Dismiss" className="-m-1 rounded-md p-1 text-muted transition-colors hover:bg-border hover:text-fg"><X className="size-4" aria-hidden /></button>
    </div>
  );
}

export function Toaster() {
  const list = useSyncExternalStore(subscribe, snapshot, snapshot);
  if (!list.length) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
      {list.map((t) => <Item key={t.id} t={t} />)}
    </div>
  );
}
