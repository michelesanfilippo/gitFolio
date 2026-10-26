import { MAX_TEMPLATES, type SavedCvData } from '@/core/saved/saved-cv';
import { getSupabase } from './supabase';

export interface TemplateRow { id: string; name: string; thumbnail: string | null; updated_at: string }
export interface TemplateFull extends TemplateRow { data: unknown }

/** Il database rifiuta il 6° CV (trigger `template_limit`). */
export class TemplateLimitError extends Error {
  constructor() { super(`You can save up to ${MAX_TEMPLATES} templates. Delete one to save a new one.`); }
}

const COLS = 'id, name, thumbnail, updated_at';

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
