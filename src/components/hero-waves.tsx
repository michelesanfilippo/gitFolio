// Poche linee ondulate lime, a tutta larghezza, molto trasparenti. Ogni onda ha una propria "fascia" verticale più larga della
// sua ampiezza, quindi non si sovrappongono mai. SVG statico generato in fase di build (nessun JS lato client).
const W = 1600;
const H = 520;

interface Wave { y: number; amp: number; cycles: number; phase: number; width: number; opacity: number }

// Fasce da 100 unità con ampiezza massima 30: distanza minima tra due onde = 100 - 2*30 = 40 > 0.
const WAVES: Wave[] = [
  { y: 70, amp: 24, cycles: 2.2, phase: 0.4, width: 1.6, opacity: 0.16 },
  { y: 170, amp: 30, cycles: 1.6, phase: 2.1, width: 1.4, opacity: 0.12 },
  { y: 270, amp: 22, cycles: 2.8, phase: 4.0, width: 1.8, opacity: 0.18 },
  { y: 370, amp: 30, cycles: 1.9, phase: 1.2, width: 1.4, opacity: 0.12 },
  { y: 470, amp: 25, cycles: 2.4, phase: 3.3, width: 1.6, opacity: 0.16 },
];

/** Curva liscia: quadratiche che passano per i punti medi di una polilinea campionata. */
function path({ y, amp, cycles, phase }: Wave): string {
  const n = 64;
  const pts = Array.from({ length: n + 1 }, (_, i) => [(i * W) / n, y + amp * Math.sin(phase + (i / n) * cycles * Math.PI * 2)] as const);
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
        <path key={w.y} d={path(w)} fill="none" stroke="#C6F36B" strokeOpacity={w.opacity} strokeWidth={w.width} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}
