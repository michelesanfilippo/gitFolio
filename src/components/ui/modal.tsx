'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Button } from './button';

const CLOSE_MS = 180; // durata dell'uscita (vedi .modal-closing in globals.css)

/** Finestra di dialogo basata sul <dialog> nativo: focus trap, Esc e sfondo oscurato gratis. Entra con scala + fade, esce specularmente. */
export function Modal({ open, onClose, title, children, size = 'md' }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; size?: 'md' | 'lg';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [rendered, setRendered] = useState(open); // il contenuto resta montato durante l'animazione di uscita

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) {
      setRendered(true);
      d.classList.remove('modal-closing');
      if (!d.open) d.showModal();
      return;
    }
    if (!d.open) return;
    d.classList.add('modal-closing');
    const t = window.setTimeout(() => { d.close(); d.classList.remove('modal-closing'); setRendered(false); }, CLOSE_MS);
    return () => window.clearTimeout(t);
  }, [open]);

  return (
    <dialog ref={ref} aria-labelledby={titleId} onClose={onClose} onCancel={(e) => { e.preventDefault(); onClose(); }}
      onMouseDown={(e) => { if (e.target === ref.current) onClose(); }}
      className={`modal m-auto w-[calc(100%-2rem)] ${size === 'lg' ? 'max-w-2xl' : 'max-w-md'} rounded-2xl border border-border bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/70`}>
      {rendered ? (
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-xl font-bold">{title}</h2>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close" className="-m-1.5"><X aria-hidden /></Button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
