import { describe, expect, it } from 'vitest';

import {
  CORRELATION_HEADER,
  createCorrelationId,
  isAcceptableCorrelationId,
  isCorrelationId,
  truncateForLog,
} from './correlation.js';

describe('createCorrelationId — RFC 9562 v7 biçimi', () => {
  it('doğru biçimde üretir', () => {
    for (let i = 0; i < 100; i += 1) {
      expect(isCorrelationId(createCorrelationId())).toBe(true);
    }
  });

  it('sürüm nibble 7, varyant nibble 8-b arasında', () => {
    const id = createCorrelationId();
    expect(id[14]).toBe('7');
    expect('89ab').toContain(id[19]);
  });

  it('36 karakter, dört tire, tümü küçük harf', () => {
    const id = createCorrelationId();
    expect(id).toHaveLength(36);
    expect(id.split('-')).toHaveLength(5);
    expect(id).toBe(id.toLowerCase());
  });

  it('ZAMAN SIRALI — v4 yerine v7 seçilmesinin tek sebebi bu', () => {
    // İlk 48 bit ms damgası. Farklı damgalarla üretilen id'ler sözlük
    // sırasında da kronolojik olmalı; loglar kimliğe göre sıralandığında
    // zaman sırası çıkıyor demek.
    const early = createCorrelationId(1_000_000_000_000);
    const late = createCorrelationId(1_900_000_000_000);
    expect(early < late).toBe(true);
  });

  it('damga id içinde doğru kodlanıyor', () => {
    const ms = 0x0123456789ab;
    const id = createCorrelationId(ms);
    expect(id.slice(0, 8) + id.slice(9, 13)).toBe('0123456789ab');
  });

  it('aynı milisaniyede bile ÇAKIŞMIYOR — rastgele bitler ayırıyor', () => {
    const fixed = 1_700_000_000_000;
    const ids = new Set(Array.from({ length: 500 }, () => createCorrelationId(fixed)));
    expect(ids.size).toBe(500);
  });

  it('kesirli damga tam sayıya indirilir — NaN veya bozuk bayt üretmez', () => {
    expect(isCorrelationId(createCorrelationId(1_700_000_000_000.9))).toBe(true);
  });
});

describe('isCorrelationId — bizim ürettiğimiz biçim', () => {
  it('v7 kabul eder', () => {
    expect(isCorrelationId('018f3c9a-1b2c-7d3e-8f45-6a7b8c9d0e1f')).toBe(true);
  });

  it('v4 REDDEDER — kendi çıktımız her zaman v7', () => {
    expect(isCorrelationId('018f3c9a-1b2c-4d3e-8f45-6a7b8c9d0e1f')).toBe(false);
  });

  it('bozuk biçimleri reddeder', () => {
    for (const bad of [
      '',
      'merhaba',
      '018f3c9a1b2c7d3e8f456a7b8c9d0e1f',
      '018f3c9a-1b2c-7d3e-8f45-6a7b8c9d0e1',
      '018F3C9A-1B2C-7D3E-8F45-6A7B8C9D0E1F',
      '018f3c9a-1b2c-7d3e-cf45-6a7b8c9d0e1f',
    ]) {
      expect(isCorrelationId(bad)).toBe(false);
    }
  });
});

describe('isAcceptableCorrelationId — DIŞARIDAN gelen değer', () => {
  it('v4 de kabul edilir — zinciri başka bir taraf başlatmış olabilir', () => {
    // Ters vekil, yük dengeleyici veya başka bir istemci kendi kimliğini
    // üretebilir. Sıkı v7 dayatmak taşınan kimliği atıp zinciri koparırdı.
    expect(isAcceptableCorrelationId('018f3c9a-1b2c-4d3e-8f45-6a7b8c9d0e1f')).toBe(true);
    expect(isAcceptableCorrelationId('018f3c9a-1b2c-7d3e-8f45-6a7b8c9d0e1f')).toBe(true);
  });

  it('biçimsiz veya enjeksiyon denemesi olan değerleri reddeder', () => {
    for (const bad of [
      '',
      'a',
      '../../etc/passwd',
      'x'.repeat(500),
      '018f3c9a-1b2c-7d3e-8f45-6a7b8c9d0e1f\nSAHTE-LOG-SATIRI',
      '<script>alert(1)</script>',
    ]) {
      expect(isAcceptableCorrelationId(bad)).toBe(false);
    }
  });

  it('sürüm nibble 0 veya 9+ olanı reddeder', () => {
    expect(isAcceptableCorrelationId('018f3c9a-1b2c-0d3e-8f45-6a7b8c9d0e1f')).toBe(false);
    expect(isAcceptableCorrelationId('018f3c9a-1b2c-9d3e-8f45-6a7b8c9d0e1f')).toBe(false);
  });
});

describe('truncateForLog — reddedilen değeri loga hazırlar', () => {
  it('kısa değeri olduğu gibi bırakır', () => {
    expect(truncateForLog('kisa')).toBe('kisa');
  });

  it('uzun değeri kırpar', () => {
    expect(truncateForLog('x'.repeat(500))).toBe(`${'x'.repeat(24)}…`);
  });

  it('SATIR SONLARINI temizler — log enjeksiyonu kapanır', () => {
    // Bu olmadan saldırgan başlığa "\n{"level":30,"msg":"sahte"}" koyup
    // log akışına uydurma satır sokabilirdi.
    expect(truncateForLog('a\nb\rc\td')).toBe('a b c d');
  });
});

describe('CORRELATION_HEADER', () => {
  it('küçük harf — Node başlıkları küçük harfte normalize eder', () => {
    expect(CORRELATION_HEADER).toBe('x-correlation-id');
  });
});
