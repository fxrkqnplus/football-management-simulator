import { describe, expect, it } from 'vitest';

import {
  DURATIONS_MS,
  durationsForMotionPreference,
  EASING,
  RADIUS_SCALE,
  SHADOW_SCALE,
  SPACE_BASE_PX,
  SPACE_SCALE,
  Z_INDEX,
} from './geometry.js';

describe('§7.4 boşluk ölçeği', () => {
  it('on bir basamak spec ile BİREBİR', () => {
    expect(SPACE_SCALE).toEqual({
      '--space-0': 0,
      '--space-1': 4,
      '--space-2': 8,
      '--space-3': 12,
      '--space-4': 16,
      '--space-5': 20,
      '--space-6': 24,
      '--space-8': 32,
      '--space-10': 40,
      '--space-12': 48,
      '--space-16': 64,
    });
  });

  it('AD ile DEĞER arasındaki desen tutuyor: --space-N = N x 4px', () => {
    // Deseni ayrıca doğrulamak, bir gün `--space-10: 44px` yazılmasını
    // engelliyor. Envanterin uzunluğu bunu göremezdi.
    for (const [name, value] of Object.entries(SPACE_SCALE)) {
      const step = Number(name.replace('--space-', ''));
      expect(value, name).toBe(step * SPACE_BASE_PX);
    }
  });

  it('taban birim 4px', () => {
    expect(SPACE_BASE_PX).toBe(4);
  });

  it('atlanan basamaklar spec’te YOK ve eklenmedi', () => {
    for (const missing of ['--space-7', '--space-9', '--space-11', '--space-14']) {
      expect(Object.hasOwn(SPACE_SCALE, missing), missing).toBe(false);
    }
  });

  it('değerler KESİN ARTAN', () => {
    const values = Object.values(SPACE_SCALE);
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i]).toBeGreaterThan(values[i - 1] ?? -1);
    }
  });
});

describe('§7.4 yarıçap, gölge, yumuşatma', () => {
  it('beş yarıçap spec ile BİREBİR', () => {
    expect(RADIUS_SCALE).toEqual({
      '--radius-sm': 3,
      '--radius-md': 5,
      '--radius-lg': 8,
      '--radius-xl': 12,
      '--radius-full': 9999,
    });
  });

  it('üç gölge spec ile BİREBİR', () => {
    expect(SHADOW_SCALE).toEqual({
      '--shadow-sm': '0 1px 2px rgba(0,0,0,.32)',
      '--shadow-md': '0 4px 12px rgba(0,0,0,.38)',
      '--shadow-lg': '0 12px 32px rgba(0,0,0,.44)',
    });
  });

  it('gölge opaklıkları ARTAN — sm < md < lg', () => {
    const alpha = (shadow: string): number =>
      Number.parseFloat(shadow.slice(shadow.lastIndexOf(',') + 1).replace(')', ''));
    expect(alpha(SHADOW_SCALE['--shadow-sm'])).toBeLessThan(alpha(SHADOW_SCALE['--shadow-md']));
    expect(alpha(SHADOW_SCALE['--shadow-md'])).toBeLessThan(alpha(SHADOW_SCALE['--shadow-lg']));
  });

  it('tek yumuşatma eğrisi spec ile BİREBİR', () => {
    expect(EASING).toEqual({ '--ease-out': 'cubic-bezier(.16,1,.3,1)' });
  });
});

describe('§7.4 katman sırası', () => {
  it('yedi katman spec ile BİREBİR', () => {
    expect(Z_INDEX).toEqual({
      '--z-base': 0,
      '--z-dropdown': 100,
      '--z-sticky': 200,
      '--z-overlay': 300,
      '--z-modal': 400,
      '--z-toast': 500,
      '--z-tooltip': 600,
    });
  });

  it('MONOTON ARTAN — sıra bir iddia, değerler değil', () => {
    // Biri 250'ye çekilirse sıra bozulur ve --z-sticky bir açılır menünün
    // üstüne çıkar. Değerleri tek tek karşılaştırmak bunu göremezdi.
    const values = Object.values(Z_INDEX);
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i], `katman ${String(i)}`).toBeGreaterThan(values[i - 1] ?? -1);
    }
  });

  it('modal, overlay’in üstünde ve toast, modal’ın üstünde', () => {
    expect(Z_INDEX['--z-modal']).toBeGreaterThan(Z_INDEX['--z-overlay']);
    expect(Z_INDEX['--z-toast']).toBeGreaterThan(Z_INDEX['--z-modal']);
    expect(Z_INDEX['--z-tooltip']).toBeGreaterThan(Z_INDEX['--z-toast']);
  });
});

describe('§7.4 hareket süreleri', () => {
  it('üç süre spec ile BİREBİR', () => {
    expect(DURATIONS_MS).toEqual({
      '--duration-fast': 120,
      '--duration-normal': 200,
      '--duration-slow': 320,
    });
  });

  it('süreler KESİN ARTAN', () => {
    expect(DURATIONS_MS['--duration-fast']).toBeLessThan(DURATIONS_MS['--duration-normal']);
    expect(DURATIONS_MS['--duration-normal']).toBeLessThan(DURATIONS_MS['--duration-slow']);
  });

  it('hareket azaltılmadığında süreler DEĞİŞMİYOR', () => {
    expect(durationsForMotionPreference(false)).toEqual(DURATIONS_MS);
  });

  it('hareket azaltıldığında TÜM süreler 0ms — §7.4’ün kuralı', () => {
    const reduced = durationsForMotionPreference(true);
    expect(reduced).toEqual({
      '--duration-fast': 0,
      '--duration-normal': 0,
      '--duration-slow': 0,
    });
    // "TÜM" bir iddia: anahtar kümesi daralmamalı.
    expect(Object.keys(reduced)).toEqual(Object.keys(DURATIONS_MS));
  });

  it('döndürülen nesne kaynağın kopyası — çağıran onu değiştirirse token bozulmaz', () => {
    const first = durationsForMotionPreference(false);
    first['--duration-fast'] = 999;
    expect(DURATIONS_MS['--duration-fast']).toBe(120);
  });
});
