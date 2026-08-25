import { describe, expect, it } from 'vitest';

import {
  createEventThrottle,
  DEFAULT_THROTTLE_WINDOW_MS,
  MAX_TRACKED_FINGERPRINTS,
} from './event-throttle.js';

/**
 * Parmak izi kısıtlayıcı testleri — Karar 4'ün son maddesi (2.5b).
 *
 * Zaman **parametre** olduğu için sahte saat kurmaya gerek yok: düz sayılarla
 * yazılıyor ve testler deterministik. Modülün saf tutulmasının pratik getirisi
 * tam olarak bu.
 */

describe('createEventThrottle', () => {
  it('ilk görüşte geçiriyor', () => {
    expect(createEventThrottle().shouldAllow('a', 0)).toBe(true);
  });

  it('pencere İÇİNDE aynı parmak izini düşürüyor', () => {
    const throttle = createEventThrottle(1000);

    expect(throttle.shouldAllow('a', 0)).toBe(true);
    expect(throttle.shouldAllow('a', 1)).toBe(false);
    expect(throttle.shouldAllow('a', 999)).toBe(false);
  });

  it('pencere DOLUNCA yeniden geçiriyor', () => {
    const throttle = createEventThrottle(1000);

    expect(throttle.shouldAllow('a', 0)).toBe(true);
    expect(throttle.shouldAllow('a', 1000)).toBe(true);
  });

  it('pencere sınırı KAPSAYICI değil — tam sınırda geçiyor', () => {
    // `now - previous < windowMs` olduğu için tam sınır geçer. Bir gün `<=`
    // yapılırsa bu test kırılır ve değişiklik bilinçli olmak zorunda kalır.
    const throttle = createEventThrottle(1000);
    throttle.shouldAllow('a', 0);
    expect(throttle.shouldAllow('a', 999)).toBe(false);
    expect(throttle.shouldAllow('a', 1000)).toBe(true);
  });

  it('geçen her olay pencereyi YENİDEN başlatıyor', () => {
    const throttle = createEventThrottle(1000);

    expect(throttle.shouldAllow('a', 0)).toBe(true);
    expect(throttle.shouldAllow('a', 1000)).toBe(true); // geçti, sayaç sıfırlandı
    expect(throttle.shouldAllow('a', 1500)).toBe(false); // yeni pencerenin içinde
  });

  it('FARKLI parmak izleri birbirini etkilemiyor', () => {
    const throttle = createEventThrottle(1000);

    expect(throttle.shouldAllow('a', 0)).toBe(true);
    expect(throttle.shouldAllow('b', 0)).toBe(true);
    expect(throttle.shouldAllow('a', 1)).toBe(false);
    expect(throttle.shouldAllow('b', 1)).toBe(false);
  });

  it('iki AYRI kısıtlayıcı birbirinin sayacını görmüyor', () => {
    // Durum modül düzeyinde değil, fabrikanın kapanışında. Sunucu ve tarayıcı
    // (ve testler) birbirinin penceresini paylaşmamalı.
    const first = createEventThrottle(1000);
    const second = createEventThrottle(1000);

    expect(first.shouldAllow('a', 0)).toBe(true);
    expect(second.shouldAllow('a', 0)).toBe(true);
  });

  it('varsayılan pencere beş dakika', () => {
    expect(DEFAULT_THROTTLE_WINDOW_MS).toBe(5 * 60 * 1000);

    const throttle = createEventThrottle();
    expect(throttle.shouldAllow('a', 0)).toBe(true);
    expect(throttle.shouldAllow('a', DEFAULT_THROTTLE_WINDOW_MS - 1)).toBe(false);
    expect(throttle.shouldAllow('a', DEFAULT_THROTTLE_WINDOW_MS)).toBe(true);
  });
});

describe('bellek tavanı — sınırsız büyüme yok', () => {
  it('tavana ulaşınca harita boşalıyor ve kısıtlama sıfırlanıyor', () => {
    // Uzun ömürlü bir sunucu sürecinde her yeni hata metni yeni bir anahtar
    // demek. Tavan olmasaydı harita sessizce büyümeye devam ederdi.
    const throttle = createEventThrottle(10_000);

    throttle.shouldAllow('ilk', 0);
    expect(throttle.shouldAllow('ilk', 1)).toBe(false); // kısıtlanıyor

    // Tavana kadar benzersiz anahtar üret.
    for (let i = 0; i < MAX_TRACKED_FINGERPRINTS; i += 1) {
      throttle.shouldAllow(`dolgu-${String(i)}`, 1);
    }

    // Harita boşaldığı için 'ilk' artık bilinmiyor → yeniden geçiyor.
    expect(throttle.shouldAllow('ilk', 2)).toBe(true);
  });

  it('tavan makul bir sayı — sıfır veya negatif değil', () => {
    expect(MAX_TRACKED_FINGERPRINTS).toBeGreaterThan(0);
  });
});
