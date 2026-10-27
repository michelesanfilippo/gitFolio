'use client';

import { ArrowDown, ArrowUp, ChevronDown, Copy, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { CONTACT_ICONS } from '@/core/icons/contact-icons';
import type { ContactKind } from '@/core/schema/cv';

export const inputCls = 'field';

/* ------------------------------------------------------------------ campi */

export function TextField({ label, value, onChange, placeholder, hint, maxLength = 200 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string; maxLength?: number;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted">
      {label}
      <input className={inputCls} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {hint ? <span className="text-[11px] text-muted/80">{hint}</span> : null}
    </label>
  );
}

export function MonthField({ label, value, onChange, disabled }: { label: string; value?: string; onChange: (v: string | undefined) => void; disabled?: boolean }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted">
      {label}
      <input type="month" className={`${inputCls} disabled:opacity-40`} value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value || undefined)} />
    </label>
  );
}

/** Elenco di parole separate da virgole (es. tecnologie): si modifica come testo, si salva come array. */
export function TagsField({ label, value, onChange, placeholder }: { label: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [text, setText] = useState(value.join(', '));
  return (
    <TextField label={label} value={text} placeholder={placeholder} hint="Separate with commas"
      onChange={(t) => { setText(t); onChange(t.split(',').map((x) => x.trim()).filter(Boolean)); }} />
  );
}

export const FieldGrid = ({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 }) => (
  <div className={`grid gap-3 ${cols === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>{children}</div>
);

/* ---------------------------------------------------------------- pulsanti */

export function IconButton({ label, onClick, disabled, danger, active, children }: {
  label: string; onClick: () => void; disabled?: boolean; danger?: boolean; active?: boolean; children: ReactNode;
}) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} aria-pressed={active}
      className={`grid size-8 shrink-0 place-items-center rounded-md transition-colors duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 ${
        danger ? 'text-muted hover:bg-red-400/10 hover:text-red-300' : active === false ? 'text-muted/60 hover:bg-border hover:text-fg' : 'text-muted hover:bg-border hover:text-fg'}`}>
      {children}
    </button>
  );
}

/** Pulsante di eliminazione a due passaggi (primo clic arma, secondo conferma) per non cancellare per sbaglio. */
export function DeleteButton({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  return armed ? (
    <Button variant="danger-solid" size="sm" className="shrink-0 px-2" aria-label={`Confirm: ${label}`} onClick={onConfirm} onBlur={() => setArmed(false)} autoFocus icon={<Trash2 />}>
      Confirm
    </Button>
  ) : (
    <IconButton label={label} danger onClick={() => setArmed(true)}><Trash2 className="size-4" aria-hidden /></IconButton>
  );
}

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="outline" onClick={onClick} className="w-full border-dashed" icon={<Plus />}>{label}</Button>
  );
}

/* ----------------------------------------------------------------- icone */

export function ContactGlyph({ kind, className = 'size-4' }: { kind: ContactKind; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {CONTACT_ICONS[kind].map((pr, i) =>
        pr.t === 'path' ? <path key={i} d={pr.d} /> : pr.t === 'circle' ? <circle key={i} cx={pr.cx} cy={pr.cy} r={pr.r} /> : <rect key={i} x={pr.x} y={pr.y} width={pr.w} height={pr.h} rx={pr.rx} />,
      )}
    </svg>
  );
}

/* ----------------------------------------------------------- contenitori */

interface CardProps {
  id: string;
  title: ReactNode;
  subtitle?: string;
  open: boolean;
  onToggle: (id: string) => void;
  /** Pulsanti a destra dell'intestazione (fuori dal pulsante di apertura: niente controlli annidati). */
  actions?: ReactNode;
  dimmed?: boolean;
  variant?: 'section' | 'item';
  children: ReactNode;
}

/** Scheda richiudibile: ogni sezione (e ogni voce) è una "tab" che si apre e si chiude. */
export function Card({ id, title, subtitle, open, onToggle, actions, dimmed, variant = 'section', children }: CardProps) {
  const item = variant === 'item';
  return (
    <section className={`rounded-xl border ${item ? 'border-border bg-bg/40' : 'border-border bg-surface'} ${dimmed ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-1 pr-1.5">
        <button type="button" aria-expanded={open} aria-controls={`card-${id}`} onClick={() => onToggle(id)}
          className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 text-left ${item ? 'py-2' : 'py-3'}`}>
          <ChevronDown className={`size-4 shrink-0 text-muted transition-transform ${open ? '' : '-rotate-90'}`} aria-hidden />
          <span className="min-w-0">
            <span className={`block truncate font-semibold ${item ? 'text-sm' : 'text-sm'}`}>{title}</span>
            {subtitle ? <span className="block truncate text-xs text-muted">{subtitle}</span> : null}
          </span>
        </button>
        {actions}
      </div>
      <div id={`card-${id}`} hidden={!open} className="flex flex-col gap-4 border-t border-border p-3.5">{children}</div>
    </section>
  );
}

/** Pulsanti standard di una voce: su, giù, duplica, elimina. */
export function ItemActions({ index, count, onMove, onDuplicate, onDelete, noun }: {
  index: number; count: number; onMove: (dir: -1 | 1) => void; onDuplicate?: () => void; onDelete: () => void; noun: string;
}) {
  return (
    <>
      <IconButton label={`Move ${noun} up`} disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp className="size-4" aria-hidden /></IconButton>
      <IconButton label={`Move ${noun} down`} disabled={index === count - 1} onClick={() => onMove(1)}><ArrowDown className="size-4" aria-hidden /></IconButton>
      {onDuplicate ? <IconButton label={`Duplicate ${noun}`} onClick={onDuplicate}><Copy className="size-4" aria-hidden /></IconButton> : null}
      <DeleteButton label={`Delete ${noun}`} onConfirm={onDelete} />
    </>
  );
}

export function VisibilityButton({ visible, onToggle, noun }: { visible: boolean; onToggle: () => void; noun: string }) {
  return (
    <IconButton label={visible ? `Hide ${noun} from the CV` : `Show ${noun} in the CV`} active={visible} onClick={onToggle}>
      {visible ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
    </IconButton>
  );
}
