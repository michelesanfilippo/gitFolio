// CSV (RFC 4180): campi tra virgolette con virgole, a capo e "" al loro interno.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim()));
}

/**
 * Righe come oggetti chiave → valore. Alcuni export di LinkedIn iniziano con righe di note: l'intestazione è la prima riga
 * che contiene `key` tra le colonne.
 */
export function csvRecords(text: string, key: string): Array<Record<string, string>> {
  const rows = parseCsv(text);
  const h = rows.findIndex((r) => r.some((c) => c.trim() === key));
  if (h < 0) return [];
  const head = rows[h]!.map((c) => c.trim());
  return rows.slice(h + 1).map((r) => Object.fromEntries(head.map((k, i) => [k, (r[i] ?? '').trim()])));
}
