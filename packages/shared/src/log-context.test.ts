import { describe, expect, it } from 'vitest';

import {
  LOG_CONTEXT_ENVELOPE_VERSION,
  serializeLogContext,
  toLogContextEnvelope,
} from './log-context.js';
import { REDACTED } from './redact.js';

describe('toLogContextEnvelope', () => {
  it('sürüm damgası koyar', () => {
    expect(toLogContextEnvelope({ correlationId: 'abc' }).v).toBe(LOG_CONTEXT_ENVELOPE_VERSION);
  });

  it('taşınabilir ilkelleri geçirir', () => {
    const envelope = toLogContextEnvelope({
      correlationId: 'abc',
      turnId: 12,
      replayed: true,
    });
    expect(envelope.ctx).toEqual({ correlationId: 'abc', turnId: 12, replayed: true });
  });

  it('boş bağlamda boş zarf üretir — hata değil', () => {
    // Bağlamsız çalışan bir arka plan görevi normaldir (`server/context.ts`).
    expect(toLogContextEnvelope({}).ctx).toEqual({});
  });

  // ── ZORUNLU NEGATİF TEST 3 ────────────────────────────────────────────
  // Zarf yalnızca loga gitmiyor: argv'ye yazıldığında `ps` çıktısında başka
  // kullanıcılara da görünür. Hassas alan zarfa GİRMEMELİ.
  it('hassas alanı redakte eder — zarf argv ve kuyruğa da gidiyor', () => {
    const envelope = toLogContextEnvelope({
      correlationId: 'abc',
      password: 'hunter2',
      JWT_SECRET: 'çok-gizli',
      apiKey: 'sk-123',
    });

    expect(envelope.ctx['correlationId']).toBe('abc');
    expect(envelope.ctx['password']).toBe(REDACTED);
    expect(envelope.ctx['JWT_SECRET']).toBe(REDACTED);
    expect(envelope.ctx['apiKey']).toBe(REDACTED);
  });

  it('redakte edilmiş zarfın SERİLEŞTİRİLMİŞ hâlinde de sır yok', () => {
    // Yukarıdaki test nesneye bakıyor; sızıntı asıl dizgede olurdu.
    const raw = serializeLogContext({ correlationId: 'abc', password: 'hunter2' });
    expect(raw).not.toContain('hunter2');
    expect(raw).toContain(REDACTED);
  });

  it('taşınamayan değerleri zarfa koymaz', () => {
    const envelope = toLogContextEnvelope({
      correlationId: 'abc',
      failure: new Error('patladı'),
      tags: ['a', 'b'],
      missing: null,
    });

    // `Error` JSON'da `{}` olur (sessiz veri kaybı), dizi argv'yi şişirir,
    // `null` zincir kimliği için anlamsız — üçü de düşürülür.
    expect(envelope.ctx).toEqual({ correlationId: 'abc' });
  });
});

describe('serializeLogContext', () => {
  it('tek satırlık JSON üretir — argv belirteci olarak taşınabilir', () => {
    const raw = serializeLogContext({ correlationId: 'abc', note: 'iki\nsatır' });
    expect(raw).not.toContain('\n');
    expect(JSON.parse(raw)).toEqual({
      v: LOG_CONTEXT_ENVELOPE_VERSION,
      ctx: { correlationId: 'abc', note: 'iki\nsatır' },
    });
  });

  it('Türkçe karakterleri bozmadan taşır', () => {
    // Süreç sınırında kodlama en olası sessiz bozulma noktası.
    const raw = serializeLogContext({ note: 'ğüşiöç ĞÜŞİÖÇ' });
    expect(JSON.parse(raw)).toMatchObject({ ctx: { note: 'ğüşiöç ĞÜŞİÖÇ' } });
  });
});
