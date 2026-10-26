'use client';

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { Rotate3d } from 'lucide-react';
import { withBasePath } from '@/config/brand';

const REST = { rx: 5, ry: -1 };   // posa di riposo (vista leggermente dall'alto)
const SWAY = { rx: 1.2, ry: 4 };  // ampiezza del dondolio (gradi)
const SWAY_S = 9;                 // periodo del dondolio
const DEG_PER_PX = 0.45;          // sensibilità del trascinamento
const RX_MAX = 35;                // inclinazione verticale massima
const FRICTION = 3.5;             // decadimento dello slancio (1/s)
const RETURN_AFTER_MS = 1800;     // dopo il rilascio torna di fronte dopo questo tempo
const RETURN_RATE = 2.5;          // velocità del ritorno (1/s)
const EDGES = 12;                 // strati che formano lo spessore
const NUDGE_FIRST_MS = 1400;      // invito all'interazione: mezzo giro avanti e indietro, finché l'utente non lo tocca
const NUDGE_EVERY_MS = 6500;
const NUDGE_MS = 1700;
const NUDGE_DEG = 28;

/**
 * iPhone realizzato in CSS (nessuna libreria 3D): finitura arancio, spessore, retro con fotocamere, Dynamic Island.
 * Dondola da solo; si può ruotare trascinandolo (con slancio), poi torna lentamente di fronte.
 * Finché non viene toccato, ogni tanto accenna una rotazione e mostra `hint` (es. "Drag to rotate").
 * `children` è lo schermo: per ora una schermata statica della home; in seguito si potrà sostituire con un <video>.
 */
export function PhoneMock({ children, hint }: { children?: ReactNode; hint?: string }) {
  const scene = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const s = useRef({ rx: 0, ry: 0, vx: 0, vy: 0, id: -1, x: 0, y: 0, t: 0, last: 0, n: 0, touched: false });
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0, prev = performance.now();
    const start = prev;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
      const st = s.current;
      if (st.id === -1) {
        st.ry += st.vy * dt; st.rx += st.vx * dt;
        const f = Math.exp(-FRICTION * dt); st.vy *= f; st.vx *= f;
        if (Date.now() - st.last > RETURN_AFTER_MS) { // torna di fronte (al giro intero più vicino)
          const k = 1 - Math.exp(-RETURN_RATE * dt);
          st.ry += (Math.round(st.ry / 360) * 360 - st.ry) * k; st.rx -= st.rx * k;
        }
        st.rx = Math.max(-RX_MAX, Math.min(RX_MAX, st.rx));
      }
      st.n = 0;
      const since = now - start - NUDGE_FIRST_MS;
      if (!reduce && !st.touched && since >= 0) {
        const p = (since % NUDGE_EVERY_MS) / NUDGE_MS; // oscillazione smorzata: destra, sinistra, ferma
        if (p < 1) st.n = NUDGE_DEG * Math.sin(p * Math.PI * 2) * (1 - p) ** 0.7;
      }
      const w = reduce ? 0 : Math.sin((now / 1000 / SWAY_S) * Math.PI * 2);
      const c = reduce ? 0 : Math.cos((now / 1000 / SWAY_S) * Math.PI * 2);
      if (body.current) body.current.style.transform =
        `rotateX(${REST.rx + SWAY.rx * c + st.rx}deg) rotateY(${REST.ry + SWAY.ry * w + st.ry + st.n}deg)`;
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const st = s.current;
    st.ry += st.n; st.n = 0; // l'eventuale invito in corso diventa la posizione di partenza: nessuno scatto
    Object.assign(st, { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), vx: 0, vy: 0, touched: true });
    setTouched(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    scene.current?.classList.add('is-dragging');
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const st = s.current;
    if (st.id !== e.pointerId) return;
    const now = performance.now(), dt = Math.max(1, now - st.t) / 1000;
    const dy = (e.clientX - st.x) * DEG_PER_PX, dx = -(e.clientY - st.y) * DEG_PER_PX;
    st.ry += dy; st.rx = Math.max(-RX_MAX, Math.min(RX_MAX, st.rx + dx));
    st.vy = dy / dt; st.vx = dx / dt;  // velocità istantanea: diventa lo slancio al rilascio
    Object.assign(st, { x: e.clientX, y: e.clientY, t: now, last: Date.now() });
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const st = s.current;
    if (st.id !== e.pointerId) return;
    if (performance.now() - st.t > 80) { st.vx = 0; st.vy = 0; } // fermo prima di rilasciare: nessuno slancio
    st.id = -1; st.last = Date.now();
    scene.current?.classList.remove('is-dragging');
  };

  return (
    <div ref={scene} className="phone-scene" aria-hidden onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <div className="phone-shadow" />
      {hint && (
        <span className={`phone-hint${touched ? ' is-hidden' : ''}`}>
          <Rotate3d aria-hidden size={14} strokeWidth={2} />
          {hint}
        </span>
      )}
      <div ref={body} className="phone-sway">
        {Array.from({ length: EDGES }, (_, k) => <span key={k} className="phone-edge" style={{ ['--k' as string]: k }} />)}
        <span className="phone-btn phone-btn-action" />
        <span className="phone-btn phone-btn-vol-up" />
        <span className="phone-btn phone-btn-vol-down" />
        <span className="phone-btn phone-btn-power" />
        <div className="phone-back">
          <div className="phone-cams">
            <span className="phone-lens phone-lens-1" />
            <span className="phone-lens phone-lens-2" />
            <span className="phone-lens phone-lens-3" />
            <span className="phone-flash" />
          </div>
        </div>
        <div className="phone">
          <div className="phone-bezel">
            <div className="phone-screen">
              <span className="phone-island" />
              <div className="phone-status">
                <span>9:41</span>
                <span className="phone-status-icons">
                  <svg viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx=".8" /><rect x="5" y="5.5" width="3" height="6.5" rx=".8" /><rect x="10" y="3" width="3" height="9" rx=".8" /><rect x="15" y="0" width="3" height="12" rx=".8" /></svg>
                  <svg viewBox="0 0 26 12" fill="none" stroke="currentColor"><rect x=".6" y=".6" width="21" height="10.8" rx="3.2" opacity=".5" /><rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor" stroke="none" /><path d="M24 4v4" strokeWidth="1.6" strokeLinecap="round" opacity=".6" /></svg>
                </span>
              </div>
              {children ?? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="phone-img" src={withBasePath('/brand/phone-home.webp')} alt="" width={800} height={1648} loading="eager" draggable={false} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
