import { MAX_TEMPLATES, type SavedCvData } from '@/core/saved/saved-cv';
import { getSupabase } from './supabase';

export interface TemplateRow { id: string; name: string; thumbnail: string | null; updated_at: string; share_id: string | null }
export interface TemplateFull extends TemplateRow { data: unknown }

/** Il database rifiuta il 6° CV (trigger `template_limit`). */
export class TemplateLimitError extends Error {
  constructor() { super(`You can save up to ${MAX_TEMPLATES} templates. Delete one to save a new one.`); }
}

const COLS = 'id, name, thumbnail, updated_at, share_id';

async function db() {
  const sb = await getSupabase();
  if (!sb) throw new Error('Accounts are not enabled on this site yet.');
  return sb;
}

const fail = (error: { message: string }): never => {
  throw /template_limit/.test(error.message) ? new TemplateLimitError() : new Error(error.message);
};

export async function listTemplates(): Promise<TemplateRow[]> {
  const { data, error } = await (await db()).from('templates').select(COLS).order('updated_at', { ascending: false });
  if (error) fail(error);
  return (data ?? []) as TemplateRow[];
}

export async function getTemplate(id: string): Promise<TemplateFull> {
  const { data, error } = await (await db()).from('templates').select(`${COLS}, data`).eq('id', id).single();
  if (error) fail(error);
  return data as TemplateFull;
}

export async function createTemplate(name: string, data: SavedCvData, thumbnail?: string): Promise<TemplateRow> {
  const { data: row, error } = await (await db()).from('templates').insert({ name, data, thumbnail: thumbnail ?? null }).select(COLS).single();
  if (error) fail(error);
  return row as TemplateRow;
}

export async function updateTemplate(id: string, patch: { name?: string; data?: SavedCvData; thumbnail?: string }): Promise<TemplateRow> {
  const { data: row, error } = await (await db()).from('templates').update(patch).eq('id', id).select(COLS).single();
  if (error) fail(error);
  return row as TemplateRow;
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await (await db()).from('templates').delete().eq('id', id);
  if (error) fail(error);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Crea (o restituisce) il link segreto di condivisione: chi lo apre riceve solo il design, mai i contenuti. */
export async function shareTemplate(row: TemplateRow): Promise<string> {
  if (row.share_id) return row.share_id;
  const share = crypto.randomUUID();
  const { data, error } = await (await db()).from('templates').update({ share_id: share }).eq('id', row.id).select('share_id').single();
  if (error) fail(error);
  return (data as { share_id: string }).share_id;
}

/** Disattiva il link: chi lo aveva non può più aprirlo. */
export async function unshareTemplate(id: string): Promise<void> {
  const { error } = await (await db()).from('templates').update({ share_id: null }).eq('id', id);
  if (error) fail(error);
}

/** Design condiviso da un altro utente (funziona anche senza login). null se il link non esiste o è stato disattivato. */
export async function getSharedDesign(share: string): Promise<{ name: string; design: unknown } | null> {
  if (!UUID.test(share)) return null;
  const { data, error } = await (await db()).rpc('shared_design', { share });
  if (error) fail(error);
  const row = (data as Array<{ name: string; design: unknown }> | null)?.[0];
  return row?.design ? row : null;
}
