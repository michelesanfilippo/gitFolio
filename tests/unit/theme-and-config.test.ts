import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { availableWeights, fonts, pdfFontSources } from '@/config/fonts';
import { palettes } from '@/config/palettes';
import { contrastRatio, isValidHex, readableOn } from '@/core/theme/contrast';

describe('contrast', () => {
  it('matches WCAG reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(contrastRatio('#C6F36B', '#171918')).toBeGreaterThan(12); // brand lime on matte black
    expect(contrastRatio('#C6F36B', '#FFFFFF')).toBeLessThan(2); // lime on white must NOT carry text
  });
  it('picks readable text colour', () => {
    expect(readableOn('#171918')).toBe('#FFFFFF');
    expect(readableOn('#C6F36B')).toBe('#000000');
  });
  it('validates hex', () => {
    expect(isValidHex('#abc')).toBe(true);
    expect(isValidHex('#12345')).toBe(false);
  });
});

describe('palettes', () => {
  it('has at least 12 with unique ids and valid colours', () => {
    expect(palettes.length).toBeGreaterThanOrEqual(12);
    expect(new Set(palettes.map((p) => p.id)).size).toBe(palettes.length);
    for (const { id, label: _label, ...colors } of palettes) {
      for (const v of Object.values(colors)) expect(isValidHex(v), `${id} ${v}`).toBe(true);
    }
  });
  it('body text is readable on every palette background (>= 4.5:1)', () => {
    for (const p of palettes) expect(contrastRatio(p.text, p.background), p.id).toBeGreaterThanOrEqual(4.5);
  });
});

describe('fonts', () => {
  it('has at least 15 families across all 6 categories, each with a regular 400', () => {
    expect(fonts.length).toBeGreaterThanOrEqual(15);
    expect(new Set(fonts.map((f) => f.category)).size).toBe(6);
    for (const f of fonts) expect(availableWeights(f.id)).toContain(400);
  });
  it('every referenced file exists, every weight/style combo is covered, licence present', () => {
    for (const f of fonts) {
      const sources = pdfFontSources(f, '');
      expect(sources).toHaveLength(10);
      for (const s of sources) expect(existsSync(`public${s.src}`), s.src).toBe(true);
      expect(existsSync(`public/fonts/${f.id}/LICENSE.txt`), `${f.id} licence`).toBe(true);
    }
  });
});
