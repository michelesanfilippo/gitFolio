'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { withBasePath } from '@/config/brand';
import { presets } from '@/config/presets';

const STEP_MS = 2600;          // pausa tra un avanzamento automatico e il successivo
const FIRST_MS = 1100;         // il primo avanzamento parte subito, senza far aspettare
const PX_PER_CARD = 150;       // trascinando il mouse/dito di tanti px l'anello avanza di una card
const IDLE_RESUME_MS = 3500;   // dopo un gesto manuale l'autoplay riprende dopo questo tempo
const CLICK_SLOP = 6;          // sotto questa distanza un gesto è un clic, non un trascinamento
const SLICES = 9;              // fette verticali per card: la card segue la curva dell'anello (effetto "bendable")
const INERTIA_S = 0.35;        // quanto lontano porta lo slancio del rilascio (secondi di velocità residua)

/**
 * Carosello 3D: i template sono su un anello inclinato (profondità) che avanza da solo card per card.
 * A mano: trascina col mouse/dito, tasti ←/→, oppure clicca una card laterale per portarla davanti
 * (cliccando quella davanti si apre l'editor). Il mouse sopra NON ferma l'avanzamento; si ferma solo col focus da tastiera
 * o durante un gesto. Con "riduci movimento" è una fila piatta scorrevole.
 */
export function TemplateCarousel({ locale, label, cta }: { locale: string; label: string; cta: string }) {
  const n = presets.length;
  const angle = 360 / n;
  const [pos, setPos] = useState(0);            // posizione in "card" (frazionaria durante il trascinamento)
  const [dragging, setDragging] = useState(false);
  const paused = useRef(false);                 // focus da tastiera
  const lastTouch = useRef(0);                  // ultimo gesto manuale
  const drag = useRef({ x: 0, start: 0, moved: 0, id: -1 });
  const justDragged = useRef(false);
  const samples = useRef<Array<{ t: number; p: number }>>([]); // ultime posizioni per stimare la velocità
  const [glide, setGlide] = useState(650);        // durata dell'animazione di aggancio (più lunga dopo uno slancio)
  const reduce = useRef(false);

  const front = ((Math.round(pos) % n) + n) % n;

  useEffect(() => {
    reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce.current) return;
    const tick = () => {
      if (paused.current || document.hidden || drag.current.id !== -1) return;
      if (Date.now() - lastTouch.current < IDLE_RESUME_MS) return;
      setPos((p) => Math.round(p) + 1);
    };
    let id = 0;
    const first = window.setTimeout(() => { tick(); id = window.setInterval(tick, STEP_MS); }, FIRST_MS);
    return () => { window.clearTimeout(first); window.clearInterval(id); };
  }, []);

  const go = useCallback((delta: number) => {
    lastTouch.current = Date.now();
    setPos((p) => Math.round(p) + delta);
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { x: e.clientX, start: pos, moved: 0, id: e.pointerId };
    justDragged.current = false;
    samples.current = [];
    setGlide(650);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    d.moved = Math.max(d.moved, Math.abs(dx));
    if (d.moved > CLICK_SLOP) {
      if (!dragging) { setDragging(true); e.currentTarget.setPointerCapture(e.pointerId); }
      lastTouch.current = Date.now();
      const np = d.start - dx / PX_PER_CARD; // trascinando a destra le card di sinistra passano davanti
      setPos(np);
      const now = performance.now();
      samples.current = [...samples.current.filter((x) => now - x.t < 120), { t: now, p: np }];
    }
  };
  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d.id !== e.pointerId) return;
    drag.current = { ...d, id: -1 };
    if (d.moved > CLICK_SLOP) {
      justDragged.current = true; // il clic che segue il rilascio non deve aprire l'editor
      window.setTimeout(() => { justDragged.current = false; }, 0);
      lastTouch.current = Date.now();
      // slancio: velocità (card/s) degli ultimi ~100 ms, proiettata in avanti e poi agganciata alla card più vicina
      const sm = samples.current;
      const a = sm[0], z = sm[sm.length - 1];
      const stale = !z || performance.now() - z.t > 90; // fermo prima di rilasciare: nessuno slancio
      const v = !stale && a && z && z.t > a.t ? ((z.p - a.p) / (z.t - a.t)) * 1000 : 0;
      const carry = Math.max(-3, Math.min(3, v * INERTIA_S));
      setGlide(650 + Math.min(700, Math.abs(carry) * 260));
      setPos((p) => Math.round(p + carry));
    }
    setDragging(false);
  };

  /** Luce in base all'angolo rispetto allo spettatore: davanti piena, ai lati sempre più scura. */
  const lit = (i: number) => {
    let d = (((i - pos) % n) + n) % n;
    if (d > n / 2) d -= n;
    return 0.35 + 0.65 * Math.max(0, Math.cos((d * angle * Math.PI) / 180)) ** 1.6;
  };

  /** Card davanti: apre l'editor. Card laterale: la porta davanti. */
  const onCardClick = (e: React.MouseEvent, i: number) => {
    if (justDragged.current) return e.preventDefault();
    if (i === front) return;
    e.preventDefault();
    lastTouch.current = Date.now();
    const base = Math.round(pos);
    let delta = (((i - front) % n) + n) % n;
    if (delta > n / 2) delta -= n;
    setPos(base + delta);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  };

  return (
    <section aria-label={label} className="ring-section border-t border-border bg-bg pb-2 pt-2" onKeyDown={onKeyDown}
      onFocusCapture={(e) => { if ((e.target as HTMLElement).matches(':focus-visible')) paused.current = true; }}
      onBlurCapture={() => { paused.current = false; }}>
      <div className="ring-stage" style={{ ['--n' as string]: n, ['--glide' as string]: dragging ? '0ms' : `${glide}ms`, touchAction: 'pan-y', cursor: dragging ? 'grabbing' : 'grab' }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <div className="ring-tilt">
          <ul className="ring-track" style={{ transform: `translateZ(calc(var(--ring-r) * -1)) rotateY(${-pos * angle}deg)` }}>
            {presets.map((p, i) => (
              <li key={p.id} className="ring-card" aria-current={i === front ? 'true' : undefined}
                style={{ ['--a' as string]: `${i * angle}deg`, ['--lit' as string]: lit(i).toFixed(3),
                  ['--img1' as string]: `url(${withBasePath(`/templates/${p.id}-c1.webp`)})`, ['--img2' as string]: `url(${withBasePath(`/templates/${p.id}-c2.webp`)})` }}>
                <a href={withBasePath(`/${locale}/editor/?preset=${p.id}`)} title={p.blurb} draggable={false} aria-label={`${p.name} CV template`} onClick={(e) => onCardClick(e, i)}
                  className="ring-link">
                  {Array.from({ length: SLICES }, (_, j) => (
                    <span key={j} aria-hidden className="ring-slice" style={{ ['--j' as string]: j }} />
                  ))}
                  {/* faccia interna: un solo piano, visibile solo per le card sul lato opposto dell'anello */}
                  <span aria-hidden className="ring-back" />
                  <span aria-hidden className="ring-cta"><span>{cta} →</span></span>
                  <span aria-hidden className="ring-label">{p.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

    </section>
  );
}
