'use client';

import type { ReactNode } from 'react';

const label = 'flex flex-col gap-1 text-xs text-muted';
const input = 'rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-fg';

export function Group({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="border-b border-border py-3">
      <summary className="cursor-pointer select-none text-sm font-semibold">{title}</summary>
      <div className="mt-3 grid grid-cols-2 gap-3">{children}</div>
    </details>
  );
}

export function Select<T extends string | number>({ label: l, value, options, onChange, wide }: {
  label: string; value: T; options: Array<{ value: T; label: string; group?: string }>; onChange: (v: T) => void; wide?: boolean;
}) {
  const groups = [...new Set(options.map((o) => o.group))];
  const parse = (raw: string) => (typeof value === 'number' ? (Number(raw) as T) : (raw as T));
  return (
    <label className={`${label} ${wide ? 'col-span-2' : ''}`}>
      {l}
      <select className={input} value={String(value)} onChange={(e) => onChange(parse(e.target.value))}>
        {groups.map((g) => {
          const items = options.filter((o) => o.group === g).map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>);
          return g ? <optgroup key={g} label={g}>{items}</optgroup> : items;
        })}
      </select>
    </label>
  );
}

export function Range({ label: l, value, min, max, step = 1, onChange, unit = '' }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string;
}) {
  return (
    <label className={label}>
      <span className="flex justify-between"><span>{l}</span><span className="tabular-nums text-fg">{value}{unit}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="accent-[var(--accent)]" />
    </label>
  );
}

export function Toggle({ label: l, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-[var(--accent)]" />
      {l}
    </label>
  );
}

export function ColorField({ label: l, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className={label}>
      {l}
      <span className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent" aria-label={l} />
        <input type="text" value={value} maxLength={7} spellCheck={false} onChange={(e) => onChange(e.target.value)} className={`${input} w-full font-mono`} aria-label={`${l} HEX`} />
      </span>
    </label>
  );
}

export function Segmented<T extends string | number>({ label: l, value, options, onChange, wide }: {
  label: string; value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void; wide?: boolean;
}) {
  return (
    <div className={`${label} ${wide ? 'col-span-2' : ''}`} role="group" aria-label={l}>
      {l}
      <div className="flex overflow-hidden rounded-md border border-border">
        {options.map((o) => (
          <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}
            className={`flex-1 px-2 py-1.5 text-xs ${o.value === value ? 'bg-accent font-semibold text-accent-fg' : 'bg-surface text-fg hover:bg-border'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
