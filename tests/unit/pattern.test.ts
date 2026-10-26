import { describe, expect, it } from 'vitest';
import { defaultPattern, generatePattern, PATTERN_ANCHORS, PATTERN_KINDS, patternRegion, type PatternSettings } from '@/core/pattern/patterns';

const base: PatternSettings = { ...defaultPattern, kind: 'stars', visibility: 0.5, fade: 0.6 };
const region = { x: 0, y: 0, width: 300, height: 300 };

describe('patternRegion', () => {
  it('anchors to corners and edges', () => {
    expect(patternRegion({ ...base, anchor: 'top-right', widthPct: 50, heightPct: 40 }, 600, 800)).toEqual({ x: 300, y: 0, width: 300, height: 320 });
    expect(patternRegion({ ...base, anchor: 'bottom-left', widthPct: 25, heightPct: 25 }, 600, 800)).toEqual({ x: 0, y: 600, width: 150, height: 200 });
    expect(patternRegion({ ...base, anchor: 'top', heightPct: 10 }, 600, 800)).toEqual({ x: 0, y: 0, width: 600, height: 80 });
    expect(patternRegion({ ...base, anchor: 'full' }, 600, 800)).toEqual({ x: 0, y: 0, width: 600, height: 800 });
  });
});

describe('generatePattern', () => {
  it('returns nothing for none or empty regions', () => {
    expect(generatePattern({ ...base, kind: 'none' }, region)).toEqual([]);
    expect(generatePattern(base, { x: 0, y: 0, width: 0, height: 10 })).toEqual([]);
  });

  it('produces shapes for every kind, deterministically', () => {
    for (const kind of PATTERN_KINDS.filter((k) => k !== 'none')) {
      const a = generatePattern({ ...base, kind }, region);
      expect(a.length, kind).toBeGreaterThan(5);
      expect(generatePattern({ ...base, kind }, region), `${kind} deterministic`).toEqual(a);
    }
  });

  it('works for every anchor', () => {
    for (const anchor of PATTERN_ANCHORS) expect(generatePattern({ ...base, anchor }, region).length, anchor).toBeGreaterThan(5);
  });

  it('fades away from the anchor and respects visibility', () => {
    const shapes = generatePattern({ ...base, kind: 'dots', anchor: 'top-left', fade: 1, visibility: 0.8 }, region);
    const max = Math.max(...shapes.map((s) => s.opacity));
    expect(max).toBeLessThanOrEqual(0.8);
    const near = shapes.filter((s) => s.type === 'circle' && s.cx < 40 && s.cy < 40).map((s) => s.opacity);
    const far = shapes.filter((s) => s.type === 'circle' && s.cx > 220 && s.cy > 220).map((s) => s.opacity);
    expect(Math.min(...near)).toBeGreaterThan(far.length ? Math.max(...far) : 0);
  });

  it('without fade all elements share the same opacity', () => {
    const shapes = generatePattern({ ...base, fade: 0, visibility: 0.3 }, region);
    expect(new Set(shapes.map((s) => s.opacity))).toEqual(new Set([0.3]));
  });

  it('caps the number of elements on huge regions with tiny tiles', () => {
    const shapes = generatePattern({ ...base, kind: 'dots', size: 2, spacing: 1, fade: 0 }, { x: 0, y: 0, width: 2000, height: 3000 });
    expect(shapes.length).toBeLessThanOrEqual(1700);
  });

  it('only emits valid numbers in paths', () => {
    for (const s of generatePattern({ ...base, kind: 'leaves' }, region)) {
      if (s.type === 'path') expect(s.d).not.toMatch(/NaN|undefined/);
    }
  });
});
