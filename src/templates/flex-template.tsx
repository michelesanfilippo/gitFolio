import { Circle, Document, Image, Link, Page, Path, Svg, Text, View } from '@react-pdf/renderer';
import type { Styles } from '@react-pdf/renderer';
import type { ReactNode } from 'react';
import type { Block, Inline, RichText } from '@/core/richtext/ast';
import type { CvDocument, DateRange } from '@/core/schema/cv';
import { SECTION_ORDER, type DesignSettings, type SectionId } from '@/core/schema/design';
import { generatePattern, patternRegion, resolvePatternColor } from '@/core/pattern/patterns';
import { shapeBox } from '@/core/photo/shapes';
import { contrastRatio, readableOn } from '@/core/theme/contrast';
import { formatMonth, labels, type Labels } from './labels';

/**
 * Template configurabile: layout 1/2 colonne, stili di titolo/divisore/bullet/competenze guidati da DesignSettings.
 * Funzione pura (doc, design) -> albero react-pdf: stesso albero per anteprima ed export.
 */

type Style = Styles[string];

const PAGE_SIZES = { A4: [595.28, 841.89], LETTER: [612, 792] } as const;
const COLUMN_GAP = 18;

interface Ctx {
  doc: CvDocument;
  d: DesignSettings;
  L: Labels;
  body: Style;
  small: Style;
}

const dateText = (r: DateRange, ctx: Ctx) => {
  const start = formatMonth(r.start, ctx.doc.locale);
  const end = r.current ? ctx.L.present : formatMonth(r.end, ctx.doc.locale);
  return [start, end].filter(Boolean).join(' – ');
};

function Inlines({ items, ctx }: { items: Inline[]; ctx: Ctx }) {
  const { colors } = ctx.d;
  return (
    <>
      {items.map((it, i) => {
        const style: Style = {
          ...(it.bold ? { fontWeight: 700 } : {}),
          ...(it.italic ? { fontStyle: 'italic' } : {}),
          ...(it.underline || it.link ? { textDecoration: 'underline' } : {}),
          ...(it.link ? { color: colors.primary } : {}),
        };
        return it.link ? (
          <Link key={i} src={it.link} style={style}>{it.text}</Link>
        ) : (
          <Text key={i} style={style}>{it.text}</Text>
        );
      })}
    </>
  );
}

function BulletMark({ ctx }: { ctx: Ctx }) {
  const { bullet } = ctx.d.style;
  const size = ctx.d.typography.bodySize;
  const top = (size * ctx.d.typography.lineHeight) / 2 - 1.5;
  const c = ctx.d.colors.primary;
  if (bullet === 'none') return null;
  const box: Style = { width: 12, paddingTop: top };
  if (bullet === 'dot') return <View style={box}><View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: c }} /></View>;
  if (bullet === 'square') return <View style={box}><View style={{ width: 3, height: 3, backgroundColor: c }} /></View>;
  return <View style={{ width: 12 }}><Text style={{ color: c }}>{bullet === 'dash' ? '–' : '›'}</Text></View>;
}

function Rich({ blocks, ctx }: { blocks?: RichText; ctx: Ctx }) {
  if (!blocks?.length) return null;
  return (
    <>
      {blocks.map((b: Block, i) =>
        b.type === 'p' ? (
          <Text key={i} style={{ ...ctx.body, marginBottom: 3 }}><Inlines items={b.content} ctx={ctx} /></Text>
        ) : (
          <View key={i} style={{ marginBottom: 3 }}>
            {b.items.map((item, j) => (
              <View key={j} style={{ flexDirection: 'row', marginBottom: 1.5 }} wrap={false}>
                {b.type === 'ol' ? <Text style={{ ...ctx.body, width: 14 }}>{j + 1}.</Text> : <BulletMark ctx={ctx} />}
                <Text style={{ ...ctx.body, flex: 1 }}><Inlines items={item} ctx={ctx} /></Text>
              </View>
            ))}
          </View>
        ),
      )}
    </>
  );
}

function SectionTitle({ children, ctx }: { children: string; ctx: Ctx }) {
  const { typography: ty, colors, style } = ctx.d;
  const text: Style = {
    fontFamily: ty.headingFont, fontWeight: ty.headingWeight, fontSize: ty.headingSize, color: colors.heading,
    letterSpacing: ty.letterSpacing + (ty.uppercaseHeadings ? 0.6 : 0),
    textTransform: ty.uppercaseHeadings ? 'uppercase' : 'none',
  };
  const wrap: Style = { marginBottom: 6 };
  const label = <Text style={text}>{children}</Text>;
  switch (style.titleStyle) {
    case 'underline':
      return <View minPresenceAhead={60} style={{ ...wrap, borderBottomWidth: 1, borderBottomColor: colors.primary, paddingBottom: 2 }}>{label}</View>;
    case 'overline':
      return <View minPresenceAhead={60} style={{ ...wrap, borderTopWidth: 1.5, borderTopColor: colors.primary, paddingTop: 3 }}>{label}</View>;
    case 'bar':
      return (
        <View minPresenceAhead={60} style={{ ...wrap, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 3, height: ty.headingSize * 1.1, backgroundColor: colors.accent, marginRight: 6 }} />
          {label}
        </View>
      );
    case 'box':
      return <View minPresenceAhead={60} style={{ ...wrap, backgroundColor: colors.badge, borderLeftWidth: 3, borderLeftColor: colors.accent, paddingVertical: 3, paddingHorizontal: 6 }}>{label}</View>;
    default:
      return <View minPresenceAhead={60} style={wrap}>{label}</View>;
  }
}

function Section({ title, children, ctx }: { title: string; children: ReactNode; ctx: Ctx }) {
  return (
    <View style={{ marginBottom: ctx.d.page.sectionGap }}>
      <SectionTitle ctx={ctx}>{title}</SectionTitle>
      {children}
    </View>
  );
}

function Items<T extends { id: string }>({ items, ctx, render }: { items: T[]; ctx: Ctx; render: (item: T) => ReactNode }) {
  const { divider } = ctx.d.style;
  const gap = ctx.d.page.itemGap;
  const line: Style | null =
    divider === 'none' ? null : {
      borderBottomWidth: divider === 'thick' ? 1.5 : 0.5,
      borderBottomStyle: divider === 'dotted' ? 'dotted' : divider === 'dashed' ? 'dashed' : 'solid',
      borderBottomColor: ctx.d.colors.divider,
      marginTop: gap / 2,
    };
  return (
    <>
      {items.map((item, i) => (
        <View key={item.id} style={{ marginBottom: i === items.length - 1 ? 0 : gap }}>
          {render(item)}
          {line && i < items.length - 1 ? <View style={line} /> : null}
        </View>
      ))}
    </>
  );
}

function EntryHeader({ title, sub, range, ctx }: { title: string; sub?: string; range: DateRange; ctx: Ctx }) {
  const { dateStyle } = ctx.d.page;
  const { colors } = ctx.d;
  const dates = dateText(range, ctx);
  const titleNode = <Text style={{ ...ctx.body, fontWeight: 700, color: colors.heading }}>{title}</Text>;
  const subNode = sub ? <Text style={{ ...ctx.body, color: colors.secondary }}>{sub}</Text> : null;
  const dateNode = dates ? <Text style={{ ...ctx.small, color: colors.secondary }}>{dates}</Text> : null;
  if (dateStyle === 'right') {
    return (
      <View wrap={false} minPresenceAhead={70} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
        <View style={{ flex: 1, paddingRight: 8 }}>{titleNode}{subNode}</View>
        {dateNode}
      </View>
    );
  }
  return (
    <View wrap={false} minPresenceAhead={70} style={{ marginBottom: 2 }}>
      <Text>{titleNode}{dateStyle === 'inline' && dates ? <Text style={{ ...ctx.small, color: colors.secondary }}>{'  ·  '}{dates}</Text> : null}</Text>
      {subNode}
      {dateStyle === 'below' ? dateNode : null}
    </View>
  );
}

function SkillBar({ level, ctx }: { level: number; ctx: Ctx }) {
  return (
    <View style={{ height: 3, backgroundColor: ctx.d.colors.divider, borderRadius: 1.5, marginTop: 2 }}>
      <View style={{ height: 3, width: `${Math.min(5, Math.max(0, level)) * 20}%`, backgroundColor: ctx.d.colors.accent, borderRadius: 1.5 }} />
    </View>
  );
}

function Skills({ ctx }: { ctx: Ctx }) {
  const { skillStyle } = ctx.d.style;
  const { colors } = ctx.d;
  // Con sidebar riempita col colore badge, i tag usano lo sfondo pagina per restare visibili.
  const tagBg = ctx.d.style.sidebarFill && ctx.d.page.columns === 2 ? colors.background : colors.badge;
  const tagText = contrastRatio(colors.text, tagBg) >= 4.5 ? colors.text : readableOn(tagBg);
  return (
    <>
      {ctx.doc.skills.map((g) => (
        <View key={g.id} style={{ marginBottom: 6 }} wrap={false}>
          {g.name ? <Text style={{ ...ctx.small, fontWeight: 700, color: colors.secondary, marginBottom: 2 }}>{g.name}</Text> : null}
          {skillStyle === 'tags' && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {g.skills.map((s) => (
                <View key={s.name} style={{ backgroundColor: tagBg, borderRadius: 3, paddingVertical: 1.5, paddingHorizontal: 5, marginRight: 4, marginBottom: 4 }}>
                  <Text style={{ ...ctx.small, color: tagText }}>{s.name}</Text>
                </View>
              ))}
            </View>
          )}
          {skillStyle === 'inline' && <Text style={ctx.body}>{g.skills.map((s) => s.name).join(' · ')}</Text>}
          {skillStyle === 'list' && g.skills.map((s) => (
            <View key={s.name} style={{ flexDirection: 'row' }}><BulletMark ctx={ctx} /><Text style={ctx.body}>{s.name}</Text></View>
          ))}
          {skillStyle === 'bars' && g.skills.map((s) => (
            <View key={s.name} style={{ marginBottom: 3 }}>
              <Text style={ctx.body}>{s.name}</Text>
              {s.level ? <SkillBar level={s.level} ctx={ctx} /> : null}
            </View>
          ))}
        </View>
      ))}
    </>
  );
}

function LanguagesBlock({ ctx }: { ctx: Ctx }) {
  return (
    <>
      {ctx.doc.languages.map((l) => (
        <View key={l.id} style={{ marginBottom: 3 }} wrap={false}>
          <Text style={ctx.body}><Text style={{ fontWeight: 700 }}>{l.name}</Text><Text style={{ color: ctx.d.colors.secondary }}>{'  '}{l.level}</Text></Text>
          {ctx.d.style.skillStyle === 'bars' && l.value ? <SkillBar level={l.value} ctx={ctx} /> : null}
        </View>
      ))}
    </>
  );
}

function ContactLines({ ctx, stacked }: { ctx: Ctx; stacked: boolean }) {
  const { personal: p } = ctx.doc;
  const { colors } = ctx.d;
  const lines: ReactNode[] = [];
  if (p.email) lines.push(<Link key="m" src={`mailto:${p.email}`} style={{ color: colors.text, textDecoration: 'none' }}>{p.email}</Link>);
  if (p.phone) lines.push(<Text key="t">{p.phone}</Text>);
  if (p.location) lines.push(<Text key="l">{p.location}</Text>);
  for (const l of p.links) lines.push(<Link key={l.id} src={l.url} style={{ color: colors.primary }}>{l.label ?? l.url}</Link>);
  if (stacked) return <>{lines.map((n, i) => <Text key={i} style={{ ...ctx.body, marginBottom: 2 }}>{n}</Text>)}</>;
  return (
    <Text style={{ ...ctx.small, color: colors.text, textAlign: ctx.d.style.headerAlign }}>
      {lines.flatMap((n, i) => (i ? [<Text key={`s${i}`} style={{ color: colors.secondary }}>{'   |   '}</Text>, n] : [n]))}
    </Text>
  );
}

function Photo({ ctx }: { ctx: Ctx }) {
  const src = ctx.doc.personal.photo;
  if (!src) return null;
  const { size, shape, borderWidth, borderColor } = ctx.d.photo;
  const bw = Math.max(0, borderWidth);
  // `size` è l'ingombro totale: il bordo sta dentro (la foto si restringe). Il bordo è un contenitore colorato
  // con padding (non border-width sull'immagine, che react-pdf non disegna in modo affidabile).
  const outer = shapeBox(shape, size);
  const inner = shapeBox(shape, size - 2 * bw);
  const image = (
    <Image
      src={src}
      style={{
        width: inner.width, height: inner.height, objectFit: 'cover',
        borderTopLeftRadius: inner.radii[0], borderTopRightRadius: inner.radii[1], borderBottomRightRadius: inner.radii[2], borderBottomLeftRadius: inner.radii[3],
      }}
    />
  );
  if (!bw) return image;
  return (
    <View
      style={{
        width: outer.width, height: outer.height, alignItems: 'center', justifyContent: 'center',
        backgroundColor: borderColor || ctx.d.colors.primary,
        borderTopLeftRadius: outer.radii[0], borderTopRightRadius: outer.radii[1], borderBottomRightRadius: outer.radii[2], borderBottomLeftRadius: outer.radii[3],
      }}
    >
      {image}
    </View>
  );
}

/** Decorazione di sfondo: SVG assoluto, ripetuto su ogni pagina, sotto al contenuto. */
function PatternLayer({ ctx, pageW, pageH }: { ctx: Ctx; pageW: number; pageH: number }) {
  const pat = ctx.d.pattern;
  if (pat.kind === 'none') return null;
  const region = patternRegion(pat, pageW, pageH);
  const shapes = generatePattern(pat, region);
  if (!shapes.length) return null;
  const color = resolvePatternColor(pat, ctx.d.colors, contrastRatio);
  return (
    <Svg fixed viewBox={`0 0 ${region.width} ${region.height}`} style={{ position: 'absolute', left: region.x, top: region.y, width: region.width, height: region.height }}>
      {shapes.map((sh, i) => {
        const paint = sh.fill ? { fill: color } : { fill: 'none', stroke: color, strokeWidth: sh.strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
        return sh.type === 'circle'
          ? <Circle key={i} cx={sh.cx} cy={sh.cy} r={sh.r} opacity={sh.opacity} {...paint} />
          : <Path key={i} d={sh.d} opacity={sh.opacity} {...paint} />;
      })}
    </Svg>
  );
}

/**
 * Blocco intestazione: foto + nome formano UN solo gruppo. `headerAlign` posiziona il gruppo intero
 * (sinistra/centro/destra), quindi spostare il nome sposta anche la foto; `photo.position` ne decide
 * il lato rispetto al nome.
 */
function Header({ ctx, withContacts }: { ctx: Ctx; withContacts: boolean }) {
  const { personal } = ctx.doc;
  const { typography: ty, colors, style, photo } = ctx.d;
  const align = style.headerAlign;
  const edge = align === 'left' ? 'flex-start' : align === 'center' ? 'center' : 'flex-end';
  const hasPhoto = Boolean(personal.photo);
  const stacked = hasPhoto && photo.position === 'top';
  const photoFirst = hasPhoto && photo.position === 'left';
  // Testo accanto alla foto: allineato al lato vicino alla foto; sopra/senza foto segue headerAlign.
  const textAlign = hasPhoto && !stacked ? (photoFirst ? 'left' : 'right') : align;
  const textEdge = textAlign === 'left' ? 'flex-start' : textAlign === 'center' ? 'center' : 'flex-end';

  const text = (
    <View style={{ alignItems: textEdge, flexShrink: 1 }}>
      <Text style={{ fontFamily: ty.headingFont, fontWeight: ty.headingWeight, fontSize: ty.nameSize, color: colors.primary, lineHeight: 1.1, textAlign }}>{personal.fullName}</Text>
      {personal.headline ? <Text style={{ ...ctx.body, fontSize: ty.bodySize * 1.25, color: colors.secondary, marginTop: 3, textAlign }}>{personal.headline}</Text> : null}
    </View>
  );
  const photoBox = hasPhoto ? (
    <View style={stacked ? { marginBottom: 8 } : photoFirst ? { marginRight: 14 } : { marginLeft: 14 }}><Photo ctx={ctx} /></View>
  ) : null;

  return (
    <View wrap={false} style={{ marginBottom: ctx.d.page.sectionGap, width: '100%' }}>
      {/* gruppo foto+nome: unico blocco, posizionato da headerAlign (sposta insieme foto e nome) */}
      <View style={{ width: '100%', flexDirection: stacked ? 'column' : 'row', justifyContent: stacked ? 'flex-start' : edge, alignItems: stacked ? edge : 'center' }}>
        {photoFirst || stacked ? photoBox : null}
        {text}
        {hasPhoto && !photoFirst && !stacked ? photoBox : null}
      </View>
      {withContacts ? <View style={{ marginTop: 8, width: '100%', alignItems: edge }}><ContactLines ctx={ctx} stacked={false} /></View> : null}
    </View>
  );
}

function sections(ctx: Ctx) {
  const { doc, L } = ctx;
  const out: Partial<Record<SectionId, ReactNode>> = {};
  if (doc.profile?.length) out.profile = <Section title={L.profile} ctx={ctx}><Rich blocks={doc.profile} ctx={ctx} /></Section>;
  if (doc.experience.length) out.experience = (
    <Section title={L.experience} ctx={ctx}>
      <Items items={doc.experience} ctx={ctx} render={(e) => (
        <>
          <EntryHeader title={e.role} sub={[e.company, e.location].filter(Boolean).join(' · ')} range={e.dates} ctx={ctx} />
          <Rich blocks={e.description} ctx={ctx} />
        </>
      )} />
    </Section>
  );
  if (doc.education.length) out.education = (
    <Section title={L.education} ctx={ctx}>
      <Items items={doc.education} ctx={ctx} render={(e) => (
        <>
          <EntryHeader title={e.degree} sub={[e.school, e.location].filter(Boolean).join(' · ')} range={e.dates} ctx={ctx} />
          <Rich blocks={e.description} ctx={ctx} />
        </>
      )} />
    </Section>
  );
  if (doc.projects.length) out.projects = (
    <Section title={L.projects} ctx={ctx}>
      <Items items={doc.projects} ctx={ctx} render={(pr) => (
        <View wrap={false}>
          <Text style={{ ...ctx.body, fontWeight: 700, color: ctx.d.colors.heading }}>
            {pr.name}{pr.role ? <Text style={{ fontWeight: 400, color: ctx.d.colors.secondary }}>{`  ·  ${pr.role}`}</Text> : null}
          </Text>
          {pr.url ? <Link src={pr.url} style={{ ...ctx.small, color: ctx.d.colors.primary }}>{pr.url.replace(/^https?:\/\//, '')}</Link> : null}
          <Rich blocks={pr.description} ctx={ctx} />
          {pr.tech?.length ? <Text style={{ ...ctx.small, color: ctx.d.colors.secondary }}>{pr.tech.join(' · ')}</Text> : null}
        </View>
      )} />
    </Section>
  );
  if (doc.skills.length) out.skills = <Section title={L.skills} ctx={ctx}><Skills ctx={ctx} /></Section>;
  if (doc.languages.length) out.languages = <Section title={L.languages} ctx={ctx}><LanguagesBlock ctx={ctx} /></Section>;
  if (doc.certifications.length) out.certifications = (
    <Section title={L.certifications} ctx={ctx}>
      <Items items={doc.certifications} ctx={ctx} render={(c) => (
        <View wrap={false}>
          <Text style={{ ...ctx.body, fontWeight: 700 }}>{c.name}</Text>
          <Text style={{ ...ctx.small, color: ctx.d.colors.secondary }}>{[c.issuer, formatMonth(c.date, doc.locale)].filter(Boolean).join(' · ')}</Text>
          {c.url ? <Link src={c.url} style={{ ...ctx.small, color: ctx.d.colors.primary }}>{L.verify}</Link> : null}
        </View>
      )} />
    </Section>
  );
  return out;
}

export function FlexTemplate({ doc, design }: { doc: CvDocument; design: DesignSettings }) {
  const { typography: ty, colors, page } = design;
  const L = labels[doc.locale];
  const base: Style = { fontFamily: ty.bodyFont, fontWeight: ty.bodyWeight, letterSpacing: ty.letterSpacing };
  const ctx: Ctx = {
    doc, d: design, L,
    body: { ...base, fontSize: ty.bodySize, lineHeight: ty.lineHeight, color: colors.text, textAlign: ty.align },
    small: { ...base, fontSize: ty.bodySize * 0.9, lineHeight: ty.lineHeight, color: colors.text },
  };
  const built = sections(ctx);

  const [w0, h0] = PAGE_SIZES[page.size];
  const portrait = page.orientation === 'portrait';
  const pageW = portrait ? w0 : h0;
  const pageH = portrait ? h0 : w0;
  const { top, right, bottom, left } = page.margins;
  const inner = pageW - left - right;
  const sideLeft = page.sidebarSide === 'left';

  // Assegnazione sezioni -> colonna. Con 1 colonna (o colonna laterale vuota) tutto fluisce in un'unica colonna.
  const sideIds = new Set(page.sidebarSections);
  const twoCol = page.columns === 2 && sideIds.size > 0;
  const contactsInSide = twoCol && sideIds.has('contacts');
  const offset = (id: SectionId) => (twoCol && sideIds.has(id) ? Math.max(0, page.sidebarOffsets[id] ?? 0) : 0);
  const pick = (inSide: boolean) =>
    SECTION_ORDER.filter((id) => id !== 'contacts' && (twoCol ? sideIds.has(id) === inSide : !inSide) && built[id])
      .map((id) => <View key={id} style={offset(id) ? { marginTop: offset(id) } : undefined}>{built[id]}</View>);
  const main = pick(false);
  const side = pick(true);

  const sideW = (inner - COLUMN_GAP) * (page.columnRatio / 100);
  const mainW = inner - COLUMN_GAP - sideW;
  const fill = design.style.sidebarFill;
  const heightMode = page.sidebarHeight;
  const card = fill && heightMode === 'content'; // riquadro alto quanto il contenuto

  const sidebar = (
    <View style={{ width: sideW, ...(card ? { backgroundColor: colors.badge, borderRadius: 6, padding: 10, alignSelf: 'flex-start' } : {}) }}>
      {contactsInSide ? <View style={offset('contacts') ? { marginTop: offset('contacts') } : undefined}><Section title={L.contacts} ctx={ctx}><ContactLines ctx={ctx} stacked /></Section></View> : null}
      {side}
    </View>
  );
  const mainCol = (
    <View style={{ width: mainW }}>
      <Header ctx={ctx} withContacts={!contactsInSide} />
      {main}
    </View>
  );
  const bgWidth = sideW + (sideLeft ? left : right) + COLUMN_GAP / 2;
  const bgBase: Style = { position: 'absolute', top: 0, ...(sideLeft ? { left: 0 } : { right: 0 }), width: bgWidth, backgroundColor: colors.badge };

  return (
    <Document title={`${doc.personal.fullName} — CV`} author={doc.personal.fullName} language={doc.locale}>
      <Page
        size={page.size}
        orientation={page.orientation}
        wrap
        style={{ paddingTop: top, paddingBottom: bottom, paddingLeft: left, paddingRight: right, backgroundColor: colors.background, ...base }}
      >
        {/* livelli di sfondo (sotto il contenuto): riempimento colonna laterale, poi pattern */}
        {twoCol && fill && heightMode === 'full' ? <View fixed style={{ ...bgBase, bottom: 0 }} /> : null}
        {twoCol && fill && heightMode === 'custom' ? <View style={{ ...bgBase, height: (pageH * page.sidebarHeightPct) / 100 }} /> : null}
        <PatternLayer ctx={ctx} pageW={pageW} pageH={pageH} />
        {twoCol ? (
          <>
            <View style={{ flexDirection: sideLeft ? 'row' : 'row-reverse', justifyContent: 'space-between' }}>
              {sidebar}
              {mainCol}
            </View>
          </>
        ) : (
          <>
            <Header ctx={ctx} withContacts />
            {main}
          </>
        )}
      </Page>
    </Document>
  );
}
