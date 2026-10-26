'use client';

import { Segmented, Toggle } from '@/components/ui/controls';
import { duplicateAt, move, removeAt, update } from '@/core/content/list';
import { CONTACT_KINDS, CONTACT_LABEL, CONTACT_PLACEHOLDER } from '@/core/icons/contact-icons';
import type { RichText } from '@/core/richtext/ast';
import { astToHtml } from '@/core/richtext/to-html';
import { newId, type ContactKind, type CvDocument } from '@/core/schema/cv';
import type { DesignSettings } from '@/core/schema/design';
import { formatMonth } from '@/templates/labels';
import { RichTextEditor } from '@/features/richtext/rich-text-editor';
import type { SetDesign } from '../panels';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { AddButton, Card, ContactGlyph, DeleteButton, FieldGrid, IconButton, ItemActions, MonthField, TagsField, TextField, VisibilityButton, inputCls } from './ui';

export type SetDoc = (fn: (d: CvDocument) => CvDocument) => void;

/** Tutto ciò che gli editor delle sezioni condividono. */
export interface EditorCtx {
  doc: CvDocument;
  setDoc: SetDoc;
  design: DesignSettings;
  set: SetDesign;
  /** Cambia quando si carica un documento: ricrea gli editor di testo con il nuovo contenuto. */
  docKey: number;
  isOpen: (id: string) => boolean;
  toggle: (id: string) => void;
  open: (id: string) => void;
}

function RichField({ ctx, id, label, value, onChange }: { ctx: EditorCtx; id: string; label: string; value?: RichText; onChange: (v: RichText) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted">{label}</span>
      <RichTextEditor key={`${ctx.docKey}-${id}`} label={label} initialHtml={astToHtml(value ?? [])} onChange={onChange} />
    </div>
  );
}

const range = (start?: string, end?: string, current?: boolean, locale: CvDocument['locale'] = 'en') =>
  [formatMonth(start, locale), current ? 'Present' : formatMonth(end, locale)].filter(Boolean).join(' – ');

/* ------------------------------------------------------------ dati personali */

export function PersonalEditor({ ctx }: { ctx: EditorCtx }) {
  const { doc, setDoc } = ctx;
  const p = doc.personal;
  const patch = (x: Partial<typeof p>) => setDoc((d) => ({ ...d, personal: { ...d.personal, ...x } }));
  return (
    <FieldGrid cols={1}>
      <TextField label="Full name" value={p.fullName} placeholder="Your name" onChange={(v) => patch({ fullName: v })} maxLength={100} />
      <TextField label="Professional title" value={p.headline ?? ''} placeholder="e.g. Senior Designer" onChange={(v) => patch({ headline: v })} maxLength={120} />
    </FieldGrid>
  );
}

/* ----------------------------------------------------------------- contatti */

export function ContactsEditor({ ctx }: { ctx: EditorCtx }) {
  const { doc, setDoc, design, set } = ctx;
  const contacts = doc.personal.contacts;
  const setContacts = (fn: (c: typeof contacts) => typeof contacts) => setDoc((d) => ({ ...d, personal: { ...d.personal, contacts: fn(d.personal.contacts) } }));
  const style = design.contacts;
  return (
    <>
      <ul className="flex flex-col gap-2.5">
        {contacts.map((c, i) => (
          <li key={c.id} className={`flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-bg/40 p-2 ${c.visible ? '' : 'opacity-60'}`}>
            <span className="relative">
              <ContactGlyph kind={c.kind} className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-accent-text" />
              <select aria-label="Contact type" value={c.kind} className={`${inputCls} w-[7.4rem] pl-8`}
                onChange={(e) => setContacts((l) => update(l, c.id, { kind: e.target.value as ContactKind }))}>
                {CONTACT_KINDS.map((k) => <option key={k} value={k}>{CONTACT_LABEL[k]}</option>)}
              </select>
            </span>
            <input aria-label={`${CONTACT_LABEL[c.kind]} value`} className={`${inputCls} flex-1 basis-40`} value={c.value} maxLength={200} placeholder={CONTACT_PLACEHOLDER[c.kind]}
              onChange={(e) => setContacts((l) => update(l, c.id, { value: e.target.value }))} />
            <span className="ml-auto flex items-center">
            <VisibilityButton noun={CONTACT_LABEL[c.kind].toLowerCase()} visible={c.visible} onToggle={() => setContacts((l) => update(l, c.id, { visible: !c.visible }))} />
            <IconButton label="Move contact up" disabled={i === 0} onClick={() => setContacts((l) => move(l, i, -1))}><ArrowUp className="size-4" aria-hidden /></IconButton>
            <IconButton label="Move contact down" disabled={i === contacts.length - 1} onClick={() => setContacts((l) => move(l, i, 1))}><ArrowDown className="size-4" aria-hidden /></IconButton>
            <DeleteButton label={`Delete ${CONTACT_LABEL[c.kind].toLowerCase()}`} onConfirm={() => setContacts((l) => removeAt(l, i))} />
            </span>
          </li>
        ))}
      </ul>
      <AddButton label="Add contact" onClick={() => setContacts((l) => [...l, { id: newId(), kind: l.some((x) => x.kind === 'email') ? 'link' : 'email', value: '', visible: true }])} />

      <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Icons</h4>
        <Toggle label="Show an icon before each contact" checked={style.icons} onChange={(v) => set('contacts', { icons: v })} />
        {style.icons ? (
          <>
            <Segmented label="Icon color" value={style.iconColor} onChange={(v) => set('contacts', { iconColor: v })}
              options={[{ value: 'auto', label: 'Auto' }, { value: 'black', label: 'Black' }, { value: 'white', label: 'White' }, { value: 'primary', label: 'Main' }, { value: 'accent', label: 'Accent' }]} />
            <Segmented label="Icon size" value={style.iconSize} onChange={(v) => set('contacts', { iconSize: v })}
              options={[{ value: 8, label: 'S' }, { value: 10, label: 'M' }, { value: 12, label: 'L' }, { value: 14, label: 'XL' }]} />
            <p className="text-xs text-muted">Auto picks black or white, whichever reads best on the background behind the contact. White icons need a dark background (e.g. a dark side column).</p>
          </>
        ) : null}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ profilo */

export function ProfileEditor({ ctx }: { ctx: EditorCtx }) {
  return <RichField ctx={ctx} id="profile" label="Summary" value={ctx.doc.profile} onChange={(v) => ctx.setDoc((d) => ({ ...d, profile: v }))} />;
}

/* ------------------------------------------------------------- esperienze */

export function ExperienceEditor({ ctx }: { ctx: EditorCtx }) {
  const { doc, setDoc } = ctx;
  const items = doc.experience;
  const upd = (id: string, patch: Partial<(typeof items)[number]>) => setDoc((d) => ({ ...d, experience: update(d.experience, id, patch) }));
  return (
    <>
      {items.map((e, i) => {
        const key = `exp-${e.id}`;
        return (
          <Card key={e.id} id={key} variant="item" open={ctx.isOpen(key)} onToggle={ctx.toggle}
            title={e.role || 'New experience'} subtitle={[e.company, range(e.dates.start, e.dates.end, e.dates.current, doc.locale)].filter(Boolean).join(' · ')}
            actions={<ItemActions noun="experience" index={i} count={items.length}
              onMove={(dir) => setDoc((d) => ({ ...d, experience: move(d.experience, i, dir) }))}
              onDuplicate={() => setDoc((d) => ({ ...d, experience: duplicateAt(d.experience, i) }))}
              onDelete={() => setDoc((d) => ({ ...d, experience: removeAt(d.experience, i) }))} />}>
            <FieldGrid>
              <TextField label="Job title" value={e.role} onChange={(v) => upd(e.id, { role: v })} placeholder="Role" maxLength={120} />
              <TextField label="Company" value={e.company ?? ''} onChange={(v) => upd(e.id, { company: v })} placeholder="Company" maxLength={120} />
              <TextField label="Location" value={e.location ?? ''} onChange={(v) => upd(e.id, { location: v })} placeholder="City, Country" maxLength={120} />
              <span />
              <MonthField label="Start" value={e.dates.start} onChange={(v) => upd(e.id, { dates: { ...e.dates, start: v } })} />
              <MonthField label="End" value={e.dates.end} disabled={e.dates.current} onChange={(v) => upd(e.id, { dates: { ...e.dates, end: v } })} />
            </FieldGrid>
            <Toggle label="I currently work here" checked={Boolean(e.dates.current)} onChange={(v) => upd(e.id, { dates: { ...e.dates, current: v || undefined } })} />
            <RichField ctx={ctx} id={key} label="Description" value={e.description} onChange={(v) => upd(e.id, { description: v })} />
          </Card>
        );
      })}
      <AddButton label="Add experience" onClick={() => {
        const id = newId();
        setDoc((d) => ({ ...d, experience: [...d.experience, { id, role: '', dates: {} }] }));
        ctx.open(`exp-${id}`);
      }} />
    </>
  );
}

/* -------------------------------------------------------------- formazione */

export function EducationEditor({ ctx }: { ctx: EditorCtx }) {
  const { doc, setDoc } = ctx;
  const items = doc.education;
  const upd = (id: string, patch: Partial<(typeof items)[number]>) => setDoc((d) => ({ ...d, education: update(d.education, id, patch) }));
  return (
    <>
      {items.map((e, i) => {
        const key = `edu-${e.id}`;
        return (
          <Card key={e.id} id={key} variant="item" open={ctx.isOpen(key)} onToggle={ctx.toggle}
            title={e.degree || 'New education'} subtitle={[e.school, range(e.dates.start, e.dates.end, e.dates.current, doc.locale)].filter(Boolean).join(' · ')}
            actions={<ItemActions noun="education entry" index={i} count={items.length}
              onMove={(dir) => setDoc((d) => ({ ...d, education: move(d.education, i, dir) }))}
              onDuplicate={() => setDoc((d) => ({ ...d, education: duplicateAt(d.education, i) }))}
              onDelete={() => setDoc((d) => ({ ...d, education: removeAt(d.education, i) }))} />}>
            <FieldGrid>
              <TextField label="Degree / course" value={e.degree} onChange={(v) => upd(e.id, { degree: v })} placeholder="Degree" maxLength={120} />
              <TextField label="School" value={e.school ?? ''} onChange={(v) => upd(e.id, { school: v })} placeholder="University or school" maxLength={120} />
              <TextField label="Location" value={e.location ?? ''} onChange={(v) => upd(e.id, { location: v })} placeholder="City, Country" maxLength={120} />
              <span />
              <MonthField label="Start" value={e.dates.start} onChange={(v) => upd(e.id, { dates: { ...e.dates, start: v } })} />
              <MonthField label="End" value={e.dates.end} disabled={e.dates.current} onChange={(v) => upd(e.id, { dates: { ...e.dates, end: v } })} />
            </FieldGrid>
            <Toggle label="Still studying" checked={Boolean(e.dates.current)} onChange={(v) => upd(e.id, { dates: { ...e.dates, current: v || undefined } })} />
            <RichField ctx={ctx} id={key} label="Details (thesis, grade...)" value={e.description} onChange={(v) => upd(e.id, { description: v })} />
          </Card>
        );
      })}
      <AddButton label="Add education" onClick={() => {
        const id = newId();
        setDoc((d) => ({ ...d, education: [...d.education, { id, degree: '', dates: {} }] }));
        ctx.open(`edu-${id}`);
      }} />
    </>
  );
}

/* ------------------------------------------------------------- competenze */

const LEVELS = [{ value: 0, label: 'No bar' }, ...[1, 2, 3, 4, 5].map((n) => ({ value: n, label: `Level ${n} / 5` }))];

export function SkillsEditor({ ctx }: { ctx: EditorCtx }) {
  const { doc, setDoc } = ctx;
  const groups = doc.skills;
  const updGroup = (id: string, fn: (g: (typeof groups)[number]) => (typeof groups)[number]) => setDoc((d) => ({ ...d, skills: d.skills.map((g) => (g.id === id ? fn(g) : g)) }));
  return (
    <>
      {groups.map((g, i) => {
        const key = `skg-${g.id}`;
        return (
          <Card key={g.id} id={key} variant="item" open={ctx.isOpen(key)} onToggle={ctx.toggle}
            title={g.name || 'Skill group'} subtitle={`${g.skills.length} skill${g.skills.length === 1 ? '' : 's'}`}
            actions={<ItemActions noun="skill group" index={i} count={groups.length}
              onMove={(dir) => setDoc((d) => ({ ...d, skills: move(d.skills, i, dir) }))}
              onDuplicate={() => setDoc((d) => ({ ...d, skills: duplicateAt(d.skills, i) }))}
              onDelete={() => setDoc((d) => ({ ...d, skills: removeAt(d.skills, i) }))} />}>
            <TextField label="Group name" value={g.name ?? ''} placeholder="e.g. Tools" onChange={(v) => updGroup(g.id, (x) => ({ ...x, name: v }))} maxLength={80} />
            <ul className="flex flex-col gap-2">
              {g.skills.map((s, j) => (
                <li key={s.id} className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-bg/40 p-1.5">
                  <input aria-label="Skill name" className={`${inputCls} flex-1 basis-32`} value={s.name} maxLength={80} placeholder="Skill"
                    onChange={(e) => updGroup(g.id, (x) => ({ ...x, skills: update(x.skills, s.id, { name: e.target.value }) }))} />
                  <select aria-label={`Level of ${s.name || 'skill'}`} className={`${inputCls} w-28`} value={s.level ?? 0}
                    onChange={(e) => updGroup(g.id, (x) => ({ ...x, skills: update(x.skills, s.id, { level: Number(e.target.value) || undefined }) }))}>
                    {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                  <span className="ml-auto flex items-center">
                  <IconButton label="Move skill up" disabled={j === 0} onClick={() => updGroup(g.id, (x) => ({ ...x, skills: move(x.skills, j, -1) }))}><ArrowUp className="size-4" aria-hidden /></IconButton>
                  <IconButton label="Move skill down" disabled={j === g.skills.length - 1} onClick={() => updGroup(g.id, (x) => ({ ...x, skills: move(x.skills, j, 1) }))}><ArrowDown className="size-4" aria-hidden /></IconButton>
                  <DeleteButton label="Delete skill" onConfirm={() => updGroup(g.id, (x) => ({ ...x, skills: removeAt(x.skills, j) }))} />
                  </span>
                </li>
              ))}
            </ul>
            <AddButton label="Add skill" onClick={() => updGroup(g.id, (x) => ({ ...x, skills: [...x.skills, { id: newId(), name: '' }] }))} />
            <p className="text-xs text-muted">Levels only show if “Level bars” is chosen in Style &gt; Skills.</p>
          </Card>
        );
      })}
      <AddButton label="Add skill group" onClick={() => {
        const id = newId();
        setDoc((d) => ({ ...d, skills: [...d.skills, { id, name: '', skills: [{ id: newId(), name: '' }] }] }));
        ctx.open(`skg-${id}`);
      }} />
    </>
  );
}

/* ------------------------------------------------------------------ lingue */

export function LanguagesEditor({ ctx }: { ctx: EditorCtx }) {
  const { doc, setDoc } = ctx;
  const items = doc.languages;
  const upd = (id: string, patch: Partial<(typeof items)[number]>) => setDoc((d) => ({ ...d, languages: update(d.languages, id, patch) }));
  return (
    <>
      <ul className="flex flex-col gap-2.5">
        {items.map((l, i) => (
          <li key={l.id} className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-bg/40 p-2">
            <input aria-label="Language" className={`${inputCls} flex-1 basis-28`} value={l.name} maxLength={60} placeholder="Language" onChange={(e) => upd(l.id, { name: e.target.value })} />
            <input aria-label="Level" className={`${inputCls} w-24`} value={l.level} maxLength={40} placeholder="B2" onChange={(e) => upd(l.id, { level: e.target.value })} />
            <select aria-label={`Bar for ${l.name || 'language'}`} className={`${inputCls} w-24`} value={l.value ?? 0} onChange={(e) => upd(l.id, { value: Number(e.target.value) || undefined })}>
              {LEVELS.map((x) => <option key={x.value} value={x.value}>{x.value ? `${x.value} / 5` : 'No bar'}</option>)}
            </select>
            <span className="ml-auto flex items-center">
            <IconButton label="Move language up" disabled={i === 0} onClick={() => setDoc((d) => ({ ...d, languages: move(d.languages, i, -1) }))}><ArrowUp className="size-4" aria-hidden /></IconButton>
            <IconButton label="Move language down" disabled={i === items.length - 1} onClick={() => setDoc((d) => ({ ...d, languages: move(d.languages, i, 1) }))}><ArrowDown className="size-4" aria-hidden /></IconButton>
            <DeleteButton label="Delete language" onConfirm={() => setDoc((d) => ({ ...d, languages: removeAt(d.languages, i) }))} />
            </span>
          </li>
        ))}
      </ul>
      <AddButton label="Add language" onClick={() => setDoc((d) => ({ ...d, languages: [...d.languages, { id: newId(), name: '', level: '' }] }))} />
    </>
  );
}

/* ---------------------------------------------------------- certificazioni */

export function CertificationsEditor({ ctx }: { ctx: EditorCtx }) {
  const { doc, setDoc } = ctx;
  const items = doc.certifications;
  const upd = (id: string, patch: Partial<(typeof items)[number]>) => setDoc((d) => ({ ...d, certifications: update(d.certifications, id, patch) }));
  return (
    <>
      {items.map((c, i) => {
        const key = `cert-${c.id}`;
        return (
          <Card key={c.id} id={key} variant="item" open={ctx.isOpen(key)} onToggle={ctx.toggle}
            title={c.name || 'New certification'} subtitle={[c.issuer, formatMonth(c.date, doc.locale)].filter(Boolean).join(' · ')}
            actions={<ItemActions noun="certification" index={i} count={items.length}
              onMove={(dir) => setDoc((d) => ({ ...d, certifications: move(d.certifications, i, dir) }))}
              onDuplicate={() => setDoc((d) => ({ ...d, certifications: duplicateAt(d.certifications, i) }))}
              onDelete={() => setDoc((d) => ({ ...d, certifications: removeAt(d.certifications, i) }))} />}>
            <FieldGrid>
              <TextField label="Name" value={c.name} onChange={(v) => upd(c.id, { name: v })} maxLength={150} />
              <TextField label="Issuer" value={c.issuer ?? ''} onChange={(v) => upd(c.id, { issuer: v })} maxLength={120} />
              <MonthField label="Date" value={c.date} onChange={(v) => upd(c.id, { date: v })} />
              <TextField label="Verification link" value={c.url ?? ''} placeholder="example.com/verify" onChange={(v) => upd(c.id, { url: v })} maxLength={300} />
            </FieldGrid>
          </Card>
        );
      })}
      <AddButton label="Add certification" onClick={() => {
        const id = newId();
        setDoc((d) => ({ ...d, certifications: [...d.certifications, { id, name: '' }] }));
        ctx.open(`cert-${id}`);
      }} />
    </>
  );
}

/* ----------------------------------------------------------------- progetti */

export function ProjectsEditor({ ctx }: { ctx: EditorCtx }) {
  const { doc, setDoc } = ctx;
  const items = doc.projects;
  const upd = (id: string, patch: Partial<(typeof items)[number]>) => setDoc((d) => ({ ...d, projects: update(d.projects, id, patch) }));
  return (
    <>
      {items.map((p, i) => {
        const key = `prj-${p.id}`;
        return (
          <Card key={p.id} id={key} variant="item" open={ctx.isOpen(key)} onToggle={ctx.toggle}
            title={p.name || 'New project'} subtitle={p.role}
            actions={<ItemActions noun="project" index={i} count={items.length}
              onMove={(dir) => setDoc((d) => ({ ...d, projects: move(d.projects, i, dir) }))}
              onDuplicate={() => setDoc((d) => ({ ...d, projects: duplicateAt(d.projects, i) }))}
              onDelete={() => setDoc((d) => ({ ...d, projects: removeAt(d.projects, i) }))} />}>
            <FieldGrid>
              <TextField label="Project name" value={p.name} onChange={(v) => upd(p.id, { name: v })} maxLength={120} />
              <TextField label="Your role" value={p.role ?? ''} onChange={(v) => upd(p.id, { role: v })} maxLength={120} />
              <TextField label="Link" value={p.url ?? ''} placeholder="example.com/project" onChange={(v) => upd(p.id, { url: v })} maxLength={300} />
              <TagsField label="Technologies" value={p.tech ?? []} placeholder="React, Node" onChange={(v) => upd(p.id, { tech: v })} />
            </FieldGrid>
            <RichField ctx={ctx} id={key} label="Description" value={p.description} onChange={(v) => upd(p.id, { description: v })} />
          </Card>
        );
      })}
      <AddButton label="Add project" onClick={() => {
        const id = newId();
        setDoc((d) => ({ ...d, projects: [...d.projects, { id, name: '' }] }));
        ctx.open(`prj-${id}`);
      }} />
    </>
  );
}

/* ------------------------------------------------- sezioni personalizzate */

export function CustomEditor({ ctx, id }: { ctx: EditorCtx; id: string }) {
  const sec = ctx.doc.custom.find((c) => c.id === id);
  if (!sec) return null;
  return <RichField ctx={ctx} id={id} label="Text" value={sec.body} onChange={(v) => ctx.setDoc((d) => ({ ...d, custom: update(d.custom, id, { body: v }) }))} />;
}

