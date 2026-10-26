'use client';

import { ChevronDown, Search } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { withBasePath } from '@/config/brand';
import { fontCategories, fonts, getFont, type FontCategory } from '@/config/fonts';

const categoryLabel: Record<FontCategory, string> = {
  sans: 'Sans serif', serif: 'Serif', modern: 'Modern', classic: 'Classic', tech: 'Technical', elegant: 'Elegant',
};

const loaded = new Set<string>();
/** Carica (on demand) il peso 400 di una famiglia per mostrarne il nome nel suo stesso font. */
function loadPreview(ids: string[]) {
  for (const id of ids) {
    if (loaded.has(id)) continue;
    loaded.add(id);
    const file = getFont(id).files.find((f) => f.weight === 400 && f.style === 'normal');
    if (!file) continue;
    const face = new FontFace(`gf-${id}`, `url(${withBasePath(`/fonts/${id}/${file.file}`)})`);
    face.load().then((f) => document.fonts.add(f)).catch(() => loaded.delete(id));
  }
}

export function FontPicker({ label, value, onChange }: { label: string; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();

  useEffect(() => loadPreview([value]), [value]);
  useEffect(() => { if (open) loadPreview(fonts.map((f) => f.id)); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return fontCategories
      .map((c) => ({ category: c, items: fonts.filter((f) => f.category === c && (!q || f.label.toLowerCase().includes(q))) }))
      .filter((g) => g.items.length);
  }, [query]);

  const current = getFont(value);
  return (
    <div ref={root} className="relative col-span-2 flex flex-col gap-1.5 text-xs text-muted">
      <span id={`${listId}-l`}>{label}</span>
      <button ref={trigger} type="button" aria-haspopup="dialog" aria-expanded={open} aria-labelledby={`${listId}-l ${listId}-v`}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2.5 text-left text-base text-fg hover:border-muted">
        <span id={`${listId}-v`} style={{ fontFamily: `gf-${current.id}, system-ui` }}>{current.label}</span>
        <ChevronDown className="size-4 text-muted" aria-hidden />
      </button>
      {open ? (
        <div role="dialog" aria-label={label} className="absolute left-0 right-0 top-full z-30 mt-1 rounded-lg border border-border bg-surface shadow-xl">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="size-4 text-muted" aria-hidden />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search fonts" aria-label="Search fonts"
              className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-muted" />
          </div>
          <div id={listId} className="max-h-72 overflow-y-auto py-1">
            {groups.length === 0 ? <p className="px-3 py-4 text-sm text-muted">No font found.</p> : null}
            {groups.map((g) => (
              <div key={g.category}>
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{categoryLabel[g.category]}</p>
                {g.items.map((f) => (
                  <button key={f.id} type="button" aria-pressed={f.id === value}
                    onClick={() => { onChange(f.id); setOpen(false); trigger.current?.focus(); }}
                    style={{ fontFamily: `gf-${f.id}, system-ui` }}
                    className={`block w-full px-3 py-1.5 text-left text-base ${f.id === value ? 'bg-accent text-accent-fg' : 'text-fg hover:bg-border'}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
