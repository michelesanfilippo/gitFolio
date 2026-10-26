'use client';

import { ArrowDown, ArrowUp, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Segmented, Select, Toggle } from '@/components/ui/controls';
import { moveWithinColumn, effectiveOrder, insertRelative, isStandard, newCustomSection, sectionTitle } from '@/core/content/order';
import type { RichText } from '@/core/richtext/ast';
import type { Locale } from '@/core/schema/cv';
import { RichTextEditor } from '@/features/richtext/rich-text-editor';
import { labels } from '@/templates/labels';
import {
  CertificationsEditor, ContactsEditor, CustomEditor, EducationEditor, ExperienceEditor, LanguagesEditor, PersonalEditor,
  ProfileEditor, ProjectsEditor, SkillsEditor, type EditorCtx,
} from './editors';
import { Card, DeleteButton, IconButton, TextField, VisibilityButton } from './ui';

type Base = Omit<EditorCtx, 'isOpen' | 'toggle' | 'open'>;

export function ContentPanel({ base, showText, setShowText, text, onStartOver }: { base: Base; showText: boolean; setShowText: (v: boolean) => void; text?: string[]; onStartOver: () => void }) {
  const { doc, setDoc, design, set } = base;
  const [openSet, setOpenSet] = useState<Set<string>>(() => new Set(['personal']));
  const ctx: EditorCtx = useMemo(() => ({
    ...base,
    isOpen: (id) => openSet.has(id),
    toggle: (id) => setOpenSet((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }),
    open: (id) => setOpenSet((s) => new Set(s).add(id)),
  }), [base, openSet]);

  const L = labels[doc.locale];
  const order = effectiveOrder(design.page.sectionOrder, doc);
  const side = new Set(design.page.sidebarSections);
  const hidden = new Set(doc.hiddenSections);
  const twoCols = design.page.columns === 2;
  const titleOf = (id: string) => sectionTitle(id, doc, L);

  const setSide = (id: string, toSide: boolean) =>
    set('page', { sidebarSections: toSide ? [...design.page.sidebarSections.filter((x) => x !== id), id] : design.page.sidebarSections.filter((x) => x !== id), sectionOrder: order });
  const flowSide: ReadonlySet<string> = twoCols ? side : new Set<string>(); // con 1 colonna c'è un solo flusso
  const moveSection = (id: string, dir: -1 | 1) => set('page', { sectionOrder: moveWithinColumn(order, flowSide, id, dir) });
  const toggleHidden = (id: string) => setDoc((d) => ({ ...d, hiddenSections: d.hiddenSections.includes(id) ? d.hiddenSections.filter((x) => x !== id) : [...d.hiddenSections, id] }));
  const rename = (id: string, v: string) =>
    setDoc((d) => isStandard(id)
      ? { ...d, sectionTitles: v.trim() ? { ...d.sectionTitles, [id]: v } : Object.fromEntries(Object.entries(d.sectionTitles).filter(([k]) => k !== id)) }
      : { ...d, custom: d.custom.map((c) => (c.id === id ? { ...c, title: v } : c)) });
  const removeCustom = (id: string) => {
    setDoc((d) => ({ ...d, custom: d.custom.filter((c) => c.id !== id), hiddenSections: d.hiddenSections.filter((x) => x !== id) }));
    set('page', { sectionOrder: order.filter((x) => x !== id), sidebarSections: design.page.sidebarSections.filter((x) => x !== id) });
  };

  const summary = (id: string): string => {
    const n = (k: number, noun: string) => `${k} ${noun}${k === 1 ? '' : 's'}`;
    switch (id) {
      case 'contacts': return n(doc.personal.contacts.filter((c) => c.visible && c.value.trim()).length, 'contact');
      case 'profile': return doc.profile?.length ? 'Summary text' : 'Empty';
      case 'experience': return n(doc.experience.length, 'entry').replace('entrys', 'entries');
      case 'education': return n(doc.education.length, 'entry').replace('entrys', 'entries');
      case 'projects': return n(doc.projects.length, 'project');
      case 'skills': return n(doc.skills.length, 'group');
      case 'languages': return n(doc.languages.length, 'language');
      case 'certifications': return n(doc.certifications.length, 'certification');
      default: return 'Custom section';
    }
  };

  const body = (id: string): ReactNode => {
    switch (id) {
      case 'contacts': return <ContactsEditor ctx={ctx} />;
      case 'profile': return <ProfileEditor ctx={ctx} />;
      case 'experience': return <ExperienceEditor ctx={ctx} />;
      case 'education': return <EducationEditor ctx={ctx} />;
      case 'projects': return <ProjectsEditor ctx={ctx} />;
      case 'skills': return <SkillsEditor ctx={ctx} />;
      case 'languages': return <LanguagesEditor ctx={ctx} />;
      case 'certifications': return <CertificationsEditor ctx={ctx} />;
      default: return <CustomEditor ctx={ctx} id={id} />;
    }
  };

  const allKeys = ['personal', ...order, 'add', 'tools', 'draft'];

  return (
    <div className="flex flex-col gap-3 pb-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs leading-relaxed text-muted">Each section is a tab: open it to edit, hide it with the eye, move it with the arrows.</p>
        <span className="flex shrink-0 gap-1">
          <IconButton label="Expand all sections" onClick={() => setOpenSet(new Set(allKeys))}><ChevronsUpDown className="size-4" aria-hidden /></IconButton>
          <IconButton label="Collapse all sections" onClick={() => setOpenSet(new Set())}><ChevronsDownUp className="size-4" aria-hidden /></IconButton>
        </span>
      </div>

      <Card id="personal" title="Personal details" subtitle={[doc.personal.fullName, doc.personal.headline].filter(Boolean).join(' · ')} open={ctx.isOpen('personal')} onToggle={ctx.toggle}>
        <PersonalEditor ctx={ctx} />
        <p className="text-xs text-muted">Your photo is in the <strong className="text-fg">Photo</strong> tab. Email, phone and links are in <strong className="text-fg">Contacts</strong> below.</p>
      </Card>

      {order.map((id) => {
        const inSide = side.has(id);
        const flow = order.filter((x) => flowSide.has(x) === flowSide.has(id));
        const idx = flow.indexOf(id);
        const count = flow.length;
        const custom = !isStandard(id);
        return (
          <Card key={id} id={id} open={ctx.isOpen(id)} onToggle={ctx.toggle} dimmed={hidden.has(id)}
            title={<>{titleOf(id)}{hidden.has(id) ? <span className="ml-2 rounded bg-border px-1.5 py-0.5 text-[10px] font-normal text-muted">hidden</span> : null}</>}
            subtitle={`${summary(id)} · ${inSide && twoCols ? 'side column' : 'main column'}`}
            actions={
              <>
                <VisibilityButton noun="section" visible={!hidden.has(id)} onToggle={() => toggleHidden(id)} />
                <IconButton label="Move section up" disabled={idx <= 0} onClick={() => moveSection(id, -1)}><ArrowUp className="size-4" aria-hidden /></IconButton>
                <IconButton label="Move section down" disabled={idx >= count - 1} onClick={() => moveSection(id, 1)}><ArrowDown className="size-4" aria-hidden /></IconButton>
                {custom ? <DeleteButton label="Delete section" onConfirm={() => removeCustom(id)} /> : null}
              </>
            }>
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3">
              <TextField label="Section title" maxLength={80} value={custom ? (doc.custom.find((c) => c.id === id)?.title ?? '') : (doc.sectionTitles[id] ?? '')}
                placeholder={isStandard(id) ? L[id] : 'Section title'} onChange={(v) => rename(id, v)}
                hint={isStandard(id) ? 'Leave empty for the default title.' : undefined} />
              <Segmented label="Show in" value={inSide ? 'side' : 'main'} onChange={(v) => setSide(id, v === 'side')}
                options={[{ value: 'main', label: 'Main column' }, { value: 'side', label: 'Side column' }]} />
              {!twoCols && inSide ? <p className="text-xs text-amber-300">The side column appears when you choose two columns in Layout.</p> : null}
            </div>
            {body(id)}
          </Card>
        );
      })}

      <AddSection ctx={ctx} order={order} side={side} onCreate={(id) => ctx.open(id)} />

      <Card id="tools" title="Language & recruiter check" subtitle="Default section titles, ATS text" open={ctx.isOpen('tools')} onToggle={ctx.toggle}>
        <Select wide label="Language of the default section titles (Experience, Education…)" value={doc.locale}
          onChange={(v: Locale) => setDoc((d) => ({ ...d, locale: v }))}
          options={[{ value: 'en', label: 'English' }, { value: 'it', label: 'Italiano' }, { value: 'fr', label: 'Français' }, { value: 'de', label: 'Deutsch' }, { value: 'es', label: 'Español' }]} />
        <Toggle label="Show the text a recruiter's software (ATS) reads" checked={showText} onChange={setShowText} />
        {showText && text ? (
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-bg p-3 text-xs">
            {text.map((p, i) => `— page ${i + 1} —\n${p}`).join('\n')}
          </pre>
        ) : null}
      </Card>

      <Card id="draft" title="Your draft" subtitle="Saved automatically on this device" open={ctx.isOpen('draft')} onToggle={ctx.toggle}>
        <p className="text-xs leading-relaxed text-muted">
          Everything you type is saved automatically in this browser, so a refresh or a closed tab will not lose your work. Nothing is uploaded unless you log in and press <strong className="text-fg">Save template</strong>.
        </p>
        <div className="flex items-center gap-2">
          <DeleteButton label="Start over with the placeholder CV" onConfirm={onStartOver} />
          <span className="text-xs text-muted">Start over: clears the draft on this device and restores the placeholder text.</span>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------ nuova sezione */

function AddSection({ ctx, order, side, onCreate }: { ctx: EditorCtx; order: string[]; side: ReadonlySet<string>; onCreate: (id: string) => void }) {
  const { doc, setDoc, design, set } = ctx;
  const [title, setTitle] = useState('');
  const [body, setBody] = useState<RichText>([]);
  const [column, setColumn] = useState<'main' | 'side'>('main');
  const [anchor, setAnchor] = useState('end');
  const [where, setWhere] = useState<'before' | 'after'>('after');
  const [formKey, setFormKey] = useState(0);
  const [done, setDone] = useState<string>();

  const L = labels[doc.locale];
  const inColumn = order.filter((id) => side.has(id) === (column === 'side'));
  const anchorOk = anchor === 'end' || inColumn.includes(anchor);
  const effectiveAnchor = anchorOk ? anchor : 'end';

  function create() {
    const sec = newCustomSection(title.trim() || 'New section', body);
    const nextOrder = insertRelative(effectiveOrder(design.page.sectionOrder, { custom: [...doc.custom, sec] }), sec.id, effectiveAnchor === 'end' ? null : effectiveAnchor, where);
    setDoc((d) => ({ ...d, custom: [...d.custom, sec] }));
    set('page', { sectionOrder: nextOrder, sidebarSections: column === 'side' ? [...design.page.sidebarSections, sec.id] : design.page.sidebarSections });
    onCreate(sec.id);
    setTitle(''); setBody([]); setAnchor('end'); setFormKey((k) => k + 1);
    setDone(`Added “${sec.title}” to the ${column === 'side' ? 'side' : 'main'} column.`);
    window.setTimeout(() => setDone(undefined), 4000);
  }

  return (
    <Card id="add" title="Add a new section" subtitle="Your own title + text, placed where you want" open={ctx.isOpen('add')} onToggle={ctx.toggle}>
      <TextField label="Section title" value={title} onChange={setTitle} placeholder="e.g. Volunteering" maxLength={80} />
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Text</span>
        <RichTextEditor key={`${ctx.docKey}-new-${formKey}`} label="New section text" initialHtml="" onChange={setBody} />
      </div>
      <Segmented label="Where" value={column} onChange={(v) => { setColumn(v); setAnchor('end'); }}
        options={[{ value: 'main', label: 'Main column' }, { value: 'side', label: 'Side column' }]} />
      <Select wide label="Position" value={effectiveAnchor} onChange={setAnchor}
        options={[{ value: 'end', label: `At the end of the ${column} column` }, ...inColumn.map((id) => ({ value: id, label: sectionTitle(id, doc, L) }))]} />
      {effectiveAnchor !== 'end' ? (
        <Segmented label="Relative to that section" value={where} onChange={setWhere} options={[{ value: 'before', label: 'Above it' }, { value: 'after', label: 'Below it' }]} />
      ) : null}
      {column === 'side' && design.page.columns !== 2 ? <p className="text-xs text-amber-300">The side column appears when you choose two columns in Layout.</p> : null}
      <button type="button" onClick={create}
        className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90">
        Add section
      </button>
      {done ? <p role="status" className="text-xs text-accent-text">{done}</p> : null}
    </Card>
  );
}

