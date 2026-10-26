// AST minimale per testo ricco (sottoinsieme dello schema TipTap previsto). Fonte unica per PDF/DOCX/MD/HTML.
export interface Inline {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  link?: string;
}
export type Block =
  | { type: 'p'; content: Inline[] }
  | { type: 'ul'; items: Inline[][] }
  | { type: 'ol'; items: Inline[][] };
export type RichText = Block[];

type Part = Inline | string;
const inl = (parts: Part[]): Inline[] => parts.map((c) => (typeof c === 'string' ? { text: c } : c));

export const p = (...content: Part[]): Block => ({ type: 'p', content: inl(content) });
export const ul = (...items: Part[][]): Block => ({ type: 'ul', items: items.map(inl) });
