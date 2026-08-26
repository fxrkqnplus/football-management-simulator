import { describe, expect, it } from 'vitest';

import { LOG_CONTEXT_ENVELOPE_VERSION, serializeLogContext } from '../log-context.js';
import { REDACTED } from '../redact.js';
import { deserializeLogContext } from './log-context.js';

describe('deserializeLogContext — gidiş-dönüş', () => {
  it('serileştirilen bağlamı aynen geri verir', () => {
    const original = { correlationId: 'c-1', saveId: 'save-9', turnId: 12, replayed: false };
    expect(deserializeLogContext(serializeLogContext(original))).toEqual(original);
  });

  it('boş zarfı boş bağlam olarak çözer', () => {
    expect(deserializeLogContext(serializeLogContext({}))).toEqual({});
  });

  it('Türkçe karakterler süreç sınırını geçen dizgede bozulmuyor', () => {
    const restored = deserializeLogContext(serializeLogContext({ note: 'ğüşiöç ĞÜŞİÖÇ' }));
    expect(restored).toEqual({ note: 'ğüşiöç ĞÜŞİÖÇ' });
  });

  it('redakte edilmiş alan zarfın ötesine işaretli geçer', () => {
    // Sır kaybolmaz, `[REDACTED]` olarak görünür — log okuyan alanın var
    // olduğunu ve redakte edildiğini görür.
    const restored = deserializeLogContext(serializeLogContext({ password: 'hunter2' }));
    expect(restored).toEqual({ password: REDACTED });
  });
});

// ── ZORUNLU NEGATİF TESTLER 1 ve 2 ──────────────────────────────────────
// Zarf DIŞ GİRDİDİR: onu çözen süreç, üreten süreç değil. Aradan argv,
// ortam değişkeni veya Redis geçiyor.
describe('deserializeLogContext — bozuk girdi reddedilir', () => {
  it('bozuk JSON → null', () => {
    expect(deserializeLogContext('{ bu json değil')).toBeNull();
  });

  it('boş dizge → null', () => {
    expect(deserializeLogContext('')).toBeNull();
  });

  it('eksik alan (ctx yok) → null', () => {
    expect(deserializeLogContext(JSON.stringify({ v: LOG_CONTEXT_ENVELOPE_VERSION }))).toBeNull();
  });

  it('eksik alan (sürüm yok) → null', () => {
    expect(deserializeLogContext(JSON.stringify({ ctx: { correlationId: 'c-1' } }))).toBeNull();
  });

  it('BAŞKA SÜRÜMDEN gelen zarf → null', () => {
    // Dağıtım sırasında worker eski, API yeni olabilir. Sürüm damgası tam
    // olarak bu durumu "eksik alan"dan ayırmak için var.
    const raw = JSON.stringify({
      v: LOG_CONTEXT_ENVELOPE_VERSION + 1,
      ctx: { correlationId: 'c-1' },
    });
    expect(deserializeLogContext(raw)).toBeNull();
  });

  it('fazladan alan taşıyan zarf → null (şema strict)', () => {
    const raw = JSON.stringify({
      v: LOG_CONTEXT_ENVELOPE_VERSION,
      ctx: { correlationId: 'c-1' },
      extra: 'kurcalanmış',
    });
    expect(deserializeLogContext(raw)).toBeNull();
  });

  it('iç içe nesne taşıyan zarf → null (değer tipi dar)', () => {
    const raw = JSON.stringify({
      v: LOG_CONTEXT_ENVELOPE_VERSION,
      ctx: { nested: { a: 1 } },
    });
    expect(deserializeLogContext(raw)).toBeNull();
  });

  it('JSON ama nesne değil (dizi / dizge / null) → null', () => {
    expect(deserializeLogContext('[]')).toBeNull();
    expect(deserializeLogContext('"metin"')).toBeNull();
    expect(deserializeLogContext('null')).toBeNull();
  });
});
