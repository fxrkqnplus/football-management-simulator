import { describe, expect, it } from 'vitest';

import {
  BASE_TEXT_STEP,
  DEFAULT_ROOT_FONT_SCALE,
  FONT_STACKS,
  FONT_WEIGHTS,
  ROOT_FONT_SCALES,
  rootFontScaleFactor,
  TEXT_SCALE,
} from './typography.js';

describe('§7.3 tipografi envanteri', () => {
  it('sekiz basamak spec ile BİREBİR — size VE lineHeight', () => {
    // Yalnızca `size`ı karşılaştıran bir test yanlış bir `lineHeight`ı geçirirdi.
    expect(TEXT_SCALE).toEqual({
      '--text-2xs': { size: 10, lineHeight: 14 },
      '--text-xs': { size: 11, lineHeight: 16 },
      '--text-sm': { size: 13, lineHeight: 18 },
      '--text-base': { size: 14, lineHeight: 20 },
      '--text-lg': { size: 16, lineHeight: 24 },
      '--text-xl': { size: 20, lineHeight: 28 },
      '--text-2xl': { size: 26, lineHeight: 34 },
      '--text-3xl': { size: 34, lineHeight: 42 },
    });
  });

  it('dört ağırlık spec ile BİREBİR', () => {
    expect(FONT_WEIGHTS).toEqual({
      '--weight-normal': 400,
      '--weight-medium': 500,
      '--weight-semibold': 600,
      '--weight-bold': 700,
    });
  });

  it('iki font yığını spec ile BİREBİR', () => {
    expect(FONT_STACKS).toEqual({
      '--font-ui': "'Inter', system-ui, -apple-system, sans-serif",
      '--font-mono': "'JetBrains Mono', ui-monospace, monospace",
    });
  });

  it('boyutlar KESİN ARTAN — ölçek sırası bir iddia', () => {
    const sizes = Object.values(TEXT_SCALE).map((s) => s.size);
    for (let i = 1; i < sizes.length; i += 1) {
      expect(sizes[i], `basamak ${String(i)}`).toBeGreaterThan(sizes[i - 1] ?? 0);
    }
  });

  it('satır yüksekliği HER basamakta boyuttan büyük', () => {
    for (const [name, step] of Object.entries(TEXT_SCALE)) {
      expect(step.lineHeight, name).toBeGreaterThan(step.size);
    }
  });

  it('gövde varsayılanı §7.3’ün işaretlediği basamak (14/20)', () => {
    expect(BASE_TEXT_STEP).toBe('--text-base');
    expect(TEXT_SCALE[BASE_TEXT_STEP]).toEqual({ size: 14, lineHeight: 20 });
  });
});

describe('§7.3 erişilebilirlik ölçeği', () => {
  it('dört ölçek spec ile BİREBİR — %90 / %100 / %115 / %130', () => {
    expect([...ROOT_FONT_SCALES]).toEqual([90, 100, 115, 130]);
  });

  it('varsayılan %100 ve listede', () => {
    expect(DEFAULT_ROOT_FONT_SCALE).toBe(100);
    expect(ROOT_FONT_SCALES).toContain(DEFAULT_ROOT_FONT_SCALE);
  });

  it('ölçekler KESİN ARTAN', () => {
    for (let i = 1; i < ROOT_FONT_SCALES.length; i += 1) {
      expect(ROOT_FONT_SCALES[i]).toBeGreaterThan(ROOT_FONT_SCALES[i - 1] ?? 0);
    }
  });

  it('çarpan yüzdeden türetiliyor — %100 nötr', () => {
    expect(rootFontScaleFactor(100)).toBe(1);
    expect(rootFontScaleFactor(90)).toBeCloseTo(0.9, 12);
    expect(rootFontScaleFactor(115)).toBeCloseTo(1.15, 12);
    expect(rootFontScaleFactor(130)).toBeCloseTo(1.3, 12);
  });

  it('en küçük ölçekte gövde metni hâlâ 12px üstünde — okunabilirlik sınırı', () => {
    // 14 x 0,9 = 12,6. Bu bir ÖLÇÜM, spec'te yazan bir eşik değil; ölçek
    // değişirse burada görünür.
    const base = TEXT_SCALE[BASE_TEXT_STEP].size;
    expect(base * rootFontScaleFactor(90)).toBeGreaterThan(12);
  });
});
