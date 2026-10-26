'use client';

import { useEffect, useRef, useState } from 'react';
import { Range } from '@/components/ui/controls';
import { PHOTO_MAX_BYTES, PHOTO_TYPES, validatePhotoFile, type PhotoError } from '@/core/photo/crop';
import { loadPhoto, renderPhoto, type PhotoSource } from '@/core/photo/process';

const messages: Record<PhotoError, string> = {
  type: 'Unsupported file. Use a JPEG, PNG or WebP image.',
  size: `File too large (max ${PHOTO_MAX_BYTES / 1024 / 1024} MB).`,
  decode: 'The image could not be read. Try another file.',
};

/** Selezione + ritaglio quadrato della foto. Tutto locale: l'immagine non lascia mai il browser. */
export function PhotoField({ photo, onChange }: { photo: string | undefined; onChange: (dataUrl: string | undefined) => void }) {
  const [src, setSrc] = useState<PhotoSource>();
  const [zoom, setZoom] = useState(1);
  const [fx, setFx] = useState(0);
  const [fy, setFy] = useState(0);
  const [error, setError] = useState<PhotoError>();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!src) return;
    try { onChange(renderPhoto(src, zoom, fx, fy)); } catch { setError('decode'); }
  }, [src, zoom, fx, fy]); // eslint-disable-line react-hooks/exhaustive-deps

  async function pick(file: File | undefined) {
    if (!file) return;
    const invalid = validatePhotoFile(file);
    if (invalid) return setError(invalid);
    try {
      const loaded = await loadPhoto(file);
      setError(undefined); setZoom(1); setFx(0); setFy(0);
      setSrc(loaded);
    } catch {
      setError('decode');
    }
  }

  const remove = () => {
    src?.bitmap.close();
    setSrc(undefined); setError(undefined); onChange(undefined);
    if (input.current) input.current.value = '';
  };

  return (
    <div className="col-span-2 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="Photo preview" className="size-14 rounded-full border border-border object-cover" />
        ) : (
          <div className="grid size-14 place-items-center rounded-full border border-dashed border-border text-xs text-muted" aria-hidden>None</div>
        )}
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-fg focus-within:outline focus-within:outline-2">
            {photo ? 'Change photo' : 'Add photo'}
            <input ref={input} type="file" accept={PHOTO_TYPES.join(',')} data-testid="photo-input" className="sr-only"
              onChange={(e) => void pick(e.target.files?.[0])} />
          </label>
          {photo ? <button type="button" onClick={remove} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-border">Remove</button> : null}
        </div>
      </div>
      {error ? <p role="alert" className="text-xs text-red-400">{messages[error]}</p> : null}
      {src ? (
        <div className="grid grid-cols-2 gap-3">
          <Range label="Zoom" value={zoom} min={1} max={4} step={0.05} onChange={setZoom} unit="x" />
          <Range label="Horizontal" value={fx} min={-1} max={1} step={0.05} onChange={setFx} />
          <Range label="Vertical" value={fy} min={-1} max={1} step={0.05} onChange={setFy} />
        </div>
      ) : null}
      <p className="text-xs text-muted">Processed in your browser. The photo is never uploaded.</p>
    </div>
  );
}
