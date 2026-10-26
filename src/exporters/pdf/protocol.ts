import type { CvDocument } from '@/core/schema/cv';
import type { DesignSettings } from '@/core/schema/design';

export interface WorkerRequest { id: number; doc: CvDocument; design: DesignSettings; baseUrl: string }
export type WorkerResponse =
  | { id: number; ok: true; buffer: ArrayBuffer; ms: number }
  | { id: number; ok: false; error: string };

export interface RenderResult { buffer: ArrayBuffer; ms: number }
