/// <reference lib="webworker" />
import { createElement, type ReactElement } from 'react';
import { Font, pdf, type DocumentProps } from '@react-pdf/renderer';
import { getFont, pdfFontSources } from '@/config/fonts';
import { FlexTemplate } from '@/templates/flex-template';
import type { WorkerRequest, WorkerResponse } from './protocol';

const registered = new Set<string>();
let hyphenationOff = false;

function ensureFonts(ids: string[], baseUrl: string) {
  if (!hyphenationOff) {
    Font.registerHyphenationCallback((word) => [word]); // niente sillabazione: testo estratto/ATS pulito
    hyphenationOff = true;
  }
  for (const id of ids) {
    if (registered.has(id)) continue;
    const font = getFont(id);
    Font.register({ family: font.id, fonts: pdfFontSources(font, baseUrl) });
    registered.add(id);
  }
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, doc, design, baseUrl } = e.data;
  const t0 = performance.now();
  try {
    ensureFonts([design.typography.headingFont, design.typography.bodyFont], baseUrl);
    const blob = await pdf(createElement(FlexTemplate, { doc, design }) as unknown as ReactElement<DocumentProps>).toBlob();
    const buffer = await blob.arrayBuffer();
    const msg: WorkerResponse = { id, ok: true, buffer, ms: Math.round(performance.now() - t0) };
    (self as unknown as Worker).postMessage(msg, [buffer]);
  } catch (err) {
    const msg: WorkerResponse = { id, ok: false, error: err instanceof Error ? err.message : String(err) };
    (self as unknown as Worker).postMessage(msg);
  }
};
