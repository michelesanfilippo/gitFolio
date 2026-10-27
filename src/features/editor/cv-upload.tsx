'use client';

import { Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import type { CvDocument } from '@/core/schema/cv';
import { parseCvText, textToLines, type TextLine } from '@/importers/text-cv';

// "Upload CV": il CV attuale dell'utente (PDF, Word o testo) viene letto nel browser e i contenuti riconosciuti sostituiscono
// quelli dell'editor. Nulla viene caricato altrove. L'utente rivede tutto nella scheda Content.

const MAX_BYTES = 15 * 1024 * 1024;
export const ACCEPT = '.pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown';

async function readLines(file: File): Promise<TextLine[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return (await import('@/importers/pdf')).pdfToLines(await file.arrayBuffer());
  if (name.endsWith('.docx') || file.type.includes('wordprocessingml')) return (await import('@/importers/docx')).docxToLines(await file.arrayBuffer());
  if (name.endsWith('.doc')) throw new Error('Old .doc files are not supported: save it as .docx or PDF first.');
  return textToLines(await file.text());
}

export function CvUploadButton({ getDoc, onApply }: { getDoc: () => CvDocument; onApply: (doc: CvDocument, found: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handle(file: File | undefined) {
    if (input.current) input.current.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) return toast.error('The file is too large (max 15 MB).');
    setBusy(true);
    try {
      const lines = await readLines(file);
      const r = parseCvText(lines, getDoc());
      onApply(r.doc, r.found);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'The file could not be read.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input ref={input} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => void handle(e.target.files?.[0])} />
      <Button variant="secondary" onClick={() => input.current?.click()} loading={busy} icon={<Upload />}
        title="Reads your current CV (PDF, Word or text) and fills in the editor. Everything stays in your browser."
        className="hover:!border-accent hover:!text-accent-text">Upload CV</Button>
    </>
  );
}
