# ADR 0001 — Motore PDF: @react-pdf/renderer in Web Worker

Stato: **accettato** (Fase 0, 2026-10-26) · Piano B: Typst WASM · Piano C: pdfmake

## Contesto
Requisiti: PDF con testo selezionabile, link funzionanti, font incorporati, multipagina senza testo tagliato,
anteprima fedele all'export, nessun server (GitHub Pages), nessun watermark.

## Decisione
Template = funzioni pure `(CvDocument, DesignSettings) -> albero react-pdf`.
Lo stesso PDF alimenta anteprima (pdf.js su canvas), download, estrazione testo ATS e conteggio link.
Il rendering gira in un Web Worker (`src/exporters/pdf/pdf.worker.ts`), una richiesta in volo, ultima vince.

## Esito dello spike (Chromium, build statica servita sotto `/gitFolio/` come Pages)

| Criterio | Risultato |
|---|---|
| Latenza render+analisi, CV 2 pagine | ~250-320 ms (target <= 500 ms) |
| CV molto lungo (32 esperienze, 7 pagine) | ~290 ms |
| Testo selezionabile / estraibile (pdf.js) | OK, ordine di lettura corretto |
| Link cliccabili (annotazioni `/Link`) | OK (10 nel CV corto, 38 nel lungo) |
| Font incorporati (45 famiglie, 300-700 + italic) | OK, subset Latin, caricati on demand dal worker |
| Accenti IT/FR/DE/ES e simboli `€ & % # © ™` | OK con font TTF/WOFF incorporati |
| Paginazione (header voce non orfano, sidebar ripetuta) | OK; `minPresenceAhead` su titoli e intestazioni |
| Layout 1/2 colonne, sidebar a tutta altezza su ogni pagina | OK (`fixed` absolute) |
| Orientamento landscape, A4/Letter, palette scura | OK |
| Paste da Word sporco -> sanificato -> PDF | OK (vedi `scripts/rte-check.mjs`) |
| Errori console / richieste fallite | nessuno |

## Limiti noti / da gestire
- Glifi fuori dal subset Latin (es. `→`, `▪`, CJK, cirillico) non sono nei font: bullet disegnati con `View`, nessuna promessa su altri alfabeti (RTL e non-latini fuori scope v1).
- Il motore usa flexbox, non CSS grid: i template devono essere pensati per flex.
- Bundle: `react-pdf` e `pdf.js` sono caricati solo nella route editor/lab (non nella home).
- Il plugin `next-intl/plugin` carica `@swc/core`, che su Windows con ACL restrittive su `C:\` non parte: usato alias manuale
  (`turbopack.resolveAlias` in `next.config.ts`). Se si passa a webpack servirà l'equivalente `resolve.alias`.
- Export HTML/DOCX non riusano questo albero: usano lo stesso `RichText` AST + `CvDocument` con serializzatori propri (Fase 2).

## Conseguenze
Un solo albero di rendering => nessuna divergenza anteprima/PDF. Contributori scrivono template in React.
Se in futuro la tipografia risultasse insufficiente, il contratto `(doc, design) -> output` permette di sostituire il motore (Typst WASM) senza toccare modello dati ed editor.
