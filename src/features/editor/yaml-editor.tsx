'use client';

import { Check, Copy, Download, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import type { CvDocument } from '@/core/schema/cv';
import type { KeyboardEvent } from 'react';
import { fromYaml, toYaml } from '@/core/yaml/cv-yaml';

// Editor YAML (stile RenderCV): lo stesso contenuto della scheda Content come testo. Ogni modifica valida viene applicata
// al CV dopo una breve pausa; gli errori di sintassi sono mostrati sotto senza toccare il CV.

const APPLY_MS = 600;

export function YamlEditor({ doc, onApply }: { doc: CvDocument; onApply: (doc: CvDocument) => void }) {
  const [text, setText] = useState(() => toYaml(doc));
  const [error, setError] = useState<string>();
  const [dirty, setDirty] = useState(false);
  const docRef = useRef(doc);
  docRef.current = doc;
  const lastApplied = useRef(text); // testo generato dall'ultima applicazione: se il CV cambia altrove si rigenera

  // il CV cambia da fuori (upload, LinkedIn, caricamento): il testo si allinea, senza perdere ciò che si sta scrivendo
  useEffect(() => {
    const fresh = toYaml(doc);
    if (!dirty && fresh !== lastApplied.current) { lastApplied.current = fresh; setText(fresh); }
  }, [doc, dirty]);

  useEffect(() => {
    if (!dirty) return;
    const t = window.setTimeout(() => {
      const r = fromYaml(text, docRef.current);
      if (!r.ok) return setError(r.error);
      setError(undefined);
      lastApplied.current = toYaml(r.doc);
      onApply(r.doc);
      setDirty(false);
    }, APPLY_MS);
    return () => window.clearTimeout(t);
  }, [text, dirty, onApply]);

  const copy = async () => { await navigator.clipboard.writeText(text); toast.ok('YAML copied.'); };
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/yaml' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'gitfolio-cv.yaml' });
    a.click();
    URL.revokeObjectURL(url);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Tab') return; // Tab inserisce due spazi (lo YAML non ammette tabulazioni)
    e.preventDefault();
    const el = e.currentTarget, s = el.selectionStart, end = el.selectionEnd;
    const next = `${text.slice(0, s)}  ${text.slice(end)}`;
    setText(next); setDirty(true);
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 2; });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <p className="text-xs leading-relaxed text-muted">
        Edit the CV as text. Long texts accept a light markdown: <code className="text-fg">**bold**</code>, <code className="text-fg">_italic_</code>, lines starting with <code className="text-fg">- </code> become bullets. Dates are <code className="text-fg">YYYY-MM</code>; use <code className="text-fg">end: present</code> for a current job.
      </p>
      <textarea value={text} onChange={(e) => { setText(e.target.value); setDirty(true); }} onKeyDown={onKey} spellCheck={false} aria-label="CV as YAML" aria-invalid={Boolean(error)}
        className="field scroll-thin min-h-[50dvh] flex-1 resize-y whitespace-pre font-mono text-[12.5px] leading-relaxed" />
      <div className="flex min-h-5 items-center gap-2 text-xs">
        {error ? <span role="alert" className="flex items-center gap-1.5 text-amber-300"><TriangleAlert className="size-3.5 shrink-0" aria-hidden /> {error}</span>
          : dirty ? <span className="text-muted">Applying…</span>
          : <span role="status" className="flex items-center gap-1.5 text-muted"><Check className="size-3.5 text-accent" aria-hidden /> In sync with the preview</span>}
        <span className="ml-auto flex gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => void copy()} icon={<Copy />}>Copy</Button>
          <Button variant="ghost" size="sm" onClick={download} icon={<Download />}>Download .yaml</Button>
        </span>
      </div>
    </div>
  );
}
