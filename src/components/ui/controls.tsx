'use client';

import type { ReactNode } from 'react';

const labelCls = 'flex flex-col gap-1.5 text-xs text-muted';
const inputCls = 'field field-surface';

/** Blocco con titolo e suggerimento: raggruppa controlli correlati in linguaggio semplice. */
export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-border py-5 first:pt-1 last:border-b-0">
      <div>
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        {hint ? <p className="mt-0.5 text-xs leading-relaxed text-muted">{hint}</p> : null}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-3 gap-y-4">{children}</div>
    </section>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="col-span-2 text-xs leading-relaxed text-muted">{children}</p>;
}

export function Select<T extends string | number>({ label, value, options, onChange, wide }: {
  label: string; value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void; wide?: boolean;
}) {
  const parse = (raw: string) => (typeof value === 'number' ? (Number(raw) as T) : (raw as T));
  return (
    <label className={`${labelCls} ${wide ? 'col-span-2' : ''}`}>
      {label}
      <select className={inputCls} value={String(value)} onChange={(e) => onChange(parse(e.target.value))}>
        {options.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function Range({ label, value, min, max, step = 1, onChange, unit = '', wide }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string; wide?: boolean;
}) {
  return (
    <label className={`${labelCls} ${wide ? 'col-span-2' : ''}`}>
      <span className="flex justify-between"><span>{label}</span><span className="tabular-nums text-fg">{value}{unit}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-5 accent-[var(--accent)]" />
    </label>
  );
}

export function Toggle({ label, checked, onChange, wide = true }: { label: string; checked: boolean; onChange: (v: boolean) => void; wide?: boolean }) {
  return (
    <label className={`flex cursor-pointer items-center gap-2.5 text-sm ${wide ? 'col-span-2' : ''}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-[var(--accent)]" />
      {label}
    </label>
  );
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className={labelCls}>
      {label}
      <span className="flex items-center gap-2">
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'} onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-9 w-11 shrink-0 cursor-pointer rounded-md border border-border bg-transparent transition-[border-color] duration-200 hover:border-muted" aria-label={label} />
        <input type="text" value={value} maxLength={7} spellCheck={false} onChange={(e) => onChange(e.target.value)} className={`${inputCls} w-full min-w-0 font-mono`} aria-label={`${label} HEX`} />
      </span>
    </label>
  );
}

export function Segmented<T extends string | number>({ label, value, options, onChange, wide = true }: {
  label: string; value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void; wide?: boolean;
}) {
  return (
    <div className={`${labelCls} ${wide ? 'col-span-2' : ''}`} role="group" aria-label={label}>
      {label}
      <div className="flex overflow-hidden rounded-md border border-border">
        {options.map((o) => (
          <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}
            className={`flex-1 px-2 py-2 text-xs transition-colors duration-200 ${o.value === value ? 'bg-accent font-semibold text-accent-fg' : 'bg-surface text-fg hover:bg-border'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Scelta visiva: ogni opzione mostra una piccola anteprima sopra l'etichetta. */
export function Choice<T extends string | number>({ label, value, options, onChange, cols = 4 }: {
  label: string; value: T; options: Array<{ value: T; label: string; preview?: ReactNode }>; onChange: (v: T) => void; cols?: 3 | 4 | 5;
}) {
  const grid = { 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5' }[cols];
  return (
    <fieldset className="col-span-2 min-w-0">
      <legend className="mb-1.5 text-xs text-muted">{label}</legend>
      <div className={`grid ${grid} gap-2`}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button key={String(o.value)} type="button" aria-pressed={on} onClick={() => onChange(o.value)}
              className={`flex flex-col items-center gap-1.5 rounded-lg border px-1 py-2 text-[11px] leading-tight transition-colors ${on ? 'border-accent bg-accent/15 text-fg' : 'border-border bg-surface text-muted hover:border-muted hover:text-fg'}`}>
              {o.preview ? <span className="grid h-9 w-full place-items-center" aria-hidden>{o.preview}</span> : null}
              <span className={on ? 'font-semibold' : ''}>{o.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
