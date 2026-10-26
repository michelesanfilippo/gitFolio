'use client';

import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { normalizeUrl, sanitizePastedHtml } from '@/core/richtext/sanitize';
import type { RichText } from '@/core/richtext/ast';
import { tiptapToAst } from '@/core/richtext/tiptap-to-ast';

interface Props { initialHtml: string; onChange: (ast: RichText) => void; label: string }

export function RichTextEditor({ initialHtml, onChange, label }: Props) {
  const editor = useEditor({
    immediatelyRender: false, // export statico: niente mismatch di idratazione
    extensions: [
      StarterKit.configure({
        heading: { levels: [3] },
        codeBlock: false, code: false, blockquote: false, horizontalRule: false, strike: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https', isAllowedUri: (url) => normalizeUrl(url) !== null },
      }),
    ],
    content: initialHtml,
    editorProps: {
      attributes: { 'aria-label': label, 'data-testid': 'rte', class: 'min-h-28 rounded-b-md border border-border bg-surface p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_a]:underline [&_h3]:font-bold' },
      transformPastedHTML: sanitizePastedHtml, // Word / Google Docs / web -> HTML pulito prima dello schema
    },
    onUpdate: ({ editor: e }) => onChange(tiptapToAst(e.getJSON())),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive('bold') ?? false, italic: e?.isActive('italic') ?? false, underline: e?.isActive('underline') ?? false,
      ul: e?.isActive('bulletList') ?? false, ol: e?.isActive('orderedList') ?? false, link: e?.isActive('link') ?? false,
      undo: e?.can().undo() ?? false, redo: e?.can().redo() ?? false,
    }),
  });
  if (!editor) return null;
  const s = state ?? { bold: false, italic: false, underline: false, ul: false, ol: false, link: false, undo: false, redo: false };

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const raw = window.prompt('URL', prev ?? 'https://');
    if (raw === null) return;
    if (raw.trim() === '') return void editor.chain().focus().extendMarkRange('link').unsetLink().run();
    const href = normalizeUrl(raw);
    if (href) editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  };

  const btn = (name: string, active: boolean, run: () => void, disabled = false) => (
    <button key={name} type="button" aria-label={name} aria-pressed={active} disabled={disabled} onClick={run}
      className={`rounded px-2 py-1 text-xs ${active ? 'bg-accent font-semibold text-accent-fg' : 'hover:bg-border'} disabled:opacity-40`}>
      {name}
    </button>
  );
  const chain = () => editor.chain().focus();

  return (
    <div className="col-span-2">
      <div role="toolbar" aria-label={`${label} toolbar`} className="flex flex-wrap gap-1 rounded-t-md border border-b-0 border-border bg-bg p-1">
        {btn('Bold', s.bold, () => chain().toggleBold().run())}
        {btn('Italic', s.italic, () => chain().toggleItalic().run())}
        {btn('Underline', s.underline, () => chain().toggleUnderline().run())}
        {btn('Bullets', s.ul, () => chain().toggleBulletList().run())}
        {btn('Numbered', s.ol, () => chain().toggleOrderedList().run())}
        {btn('Link', s.link, setLink)}
        {btn('Clear', false, () => chain().clearNodes().unsetAllMarks().run())}
        {btn('Undo', false, () => chain().undo().run(), !s.undo)}
        {btn('Redo', false, () => chain().redo().run(), !s.redo)}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
