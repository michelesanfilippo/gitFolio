import { basePath } from '@/config/brand';
import type { CvDocument } from '@/core/schema/cv';
import type { DesignSettings } from '@/core/schema/design';
import type { RenderResult, WorkerRequest, WorkerResponse } from './protocol';

/**
 * Renderer PDF in Web Worker. Una sola richiesta in volo: se ne arrivano altre nel frattempo
 * vince l'ultima (le intermedie risolvono con `null` = superata).
 */
export function createPdfRenderer() {
  const worker = new Worker(new URL('./pdf.worker.ts', import.meta.url), { type: 'module' });
  const baseUrl = `${location.origin}${basePath}`;
  let seq = 0;
  let inFlight: { id: number; resolve: (r: RenderResult | null) => void; reject: (e: Error) => void } | null = null;
  let pending: { req: WorkerRequest; resolve: (r: RenderResult | null) => void; reject: (e: Error) => void } | null = null;

  const start = (req: WorkerRequest, resolve: (r: RenderResult | null) => void, reject: (e: Error) => void) => {
    inFlight = { id: req.id, resolve, reject };
    worker.postMessage(req);
  };

  worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
    const cur = inFlight;
    if (!cur || cur.id !== e.data.id) return;
    inFlight = null;
    if (e.data.ok) cur.resolve({ buffer: e.data.buffer, ms: e.data.ms });
    else cur.reject(new Error(e.data.error));
    if (pending) {
      const next = pending;
      pending = null;
      start(next.req, next.resolve, next.reject);
    }
  };
  worker.onerror = (e) => inFlight?.reject(new Error(e.message));

  return {
    render(doc: CvDocument, design: DesignSettings): Promise<RenderResult | null> {
      return new Promise((resolve, reject) => {
        const req: WorkerRequest = { id: ++seq, doc, design, baseUrl };
        pending?.resolve(null); // superata
        if (inFlight) pending = { req, resolve, reject };
        else start(req, resolve, reject);
      });
    },
    dispose() {
      worker.terminate();
    },
  };
}
export type PdfRenderer = ReturnType<typeof createPdfRenderer>;
