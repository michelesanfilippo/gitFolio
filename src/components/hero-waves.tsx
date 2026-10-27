// Poche linee ondulate lime, a tutta larghezza, molto trasparenti, in lento movimento. Ogni onda ha una propria "fascia"
// verticale più larga della sua ampiezza, quindi non si sovrappongono mai. SVG statico generato in fase di build; il moto è
// una sola animazione CSS per onda (translateX di un periodo, in loop): niente JS lato client, fermo con "riduci movimento".
const W = 1600;
const H = 520;

interface Wave { y: number; amp: number; cycles: number; phase: number; width: number; opacity: number; seconds: number; dir: 1 | -1 }

// Fasce da 100 unità con ampiezza massima 30: distanza minima tra due onde = 100 - 2*30 = 40 > 0.
// `cycles` interi: l'onda è periodica sulla larghezza W, quindi disegnata su 2W e traslata di W si ripete senza cuciture.
const WAVES: Wave[] = [
  { y: 70, amp: 24, cycles: 2, phase: 0.4, width: 1.6, opacity: 0.085, seconds: 38, dir: 1 },
  { y: 170, amp: 30, cycles: 2, phase: 2.1, width: 1.4, opacity: 0.06, seconds: 52, dir: -1 },
  { y: 270, amp: 22, cycles: 3, phase: 4.0, width: 1.8, opacity: 0.095, seconds: 44, dir: 1 },
  { y: 370, amp: 30, cycles: 2, phase: 1.2, width: 1.4, opacity: 0.06, seconds: 60, dir: -1 },
  { y: 470, amp: 25, cycles: 2, phase: 3.3, width: 1.6, opacity: 0.085, seconds: 47, dir: 1 },
];

/** Curva liscia su due larghezze (da -W a W): quadratiche che passano per i punti medi di una polilinea campionata. */
function path({ y, amp, cycles, phase }: Wave): string {
  const n = 128;
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const x = -W + (i * 2 * W) / n;
    return [x, y + amp * Math.sin(phase + (x / W) * cycles * Math.PI * 2)] as const;
  });
  const f = (v: number) => Math.round(v * 10) / 10;
  let d = `M${f(pts[0]![0])} ${f(pts[0]![1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, yy] = pts[i]!, [nx, ny] = pts[i + 1]!;
    d += ` Q${f(x)} ${f(yy)} ${f((x + nx) / 2)} ${f((yy + ny) / 2)}`;
  }
  const last = pts[pts.length - 1]!;
  return `${d} L${f(last[0])} ${f(last[1])}`;
}

export function HeroWaves() {
  return (
    <svg className="pointer-events-none absolute inset-0 -z-10 h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden focusable="false">
      {WAVES.map((w) => (
        <path key={w.y} className="hero-wave" d={path(w)} fill="none" stroke="#C6F36B" strokeOpacity={w.opacity} strokeWidth={w.width} strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{ animationDuration: `${w.seconds}s`, animationDirection: w.dir === 1 ? 'normal' : 'reverse' }} />
      ))}
    </svg>
  );
}
