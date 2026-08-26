import { Writable } from 'node:stream';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  assertInvariant,
  ASSERTION_MODES,
  assertionMode,
  configureAssertions,
  type InvariantViolation,
  resetAssertionsForTests,
} from './assert.js';
import {
  DataProviderError,
  DomainError,
  EngineError,
  ERROR_KINDS,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from './errors.js';
import { LOG_FORMATS, LOG_LEVELS } from './logger.js';
import { REDACTED } from './redact.js';
import { createServerLogger } from './server/logger.js';

afterEach(() => {
  resetAssertionsForTests();
});

describe('varsayılan kip', () => {
  it('hiç yapılandırılmadan `throw` — güvenli taraf', () => {
    // ⚠️ Bu testin değeri VARSAYILANI sabitlemek. Varsayılan bir gün
    // `report`a çevrilirse motor, sunucu ve worker sessizce devam eder ve
    // spec/09 §11.3'ün "ihlal → tur geri alınır" şartı kâğıtta kalır.
    expect(assertionMode()).toBe(ASSERTION_MODES.throw);
  });

  it('koşul doğruysa hiçbir şey olmuyor ve `true` dönüyor', () => {
    expect(assertInvariant(true, { code: 'x.ok', message: 'olmaz' })).toBe(true);
  });

  it('koşul yanlışsa varsayılan olarak EngineError fırlatıyor', () => {
    expect(() =>
      assertInvariant(false, { code: 'engine.noKeeper', message: 'Kadroda kaleci yok' }),
    ).toThrow(EngineError);
  });

  it('fırlatılan hata `code` ve `context`i koruyor', () => {
    try {
      assertInvariant(false, {
        code: 'engine.noKeeper',
        message: 'Kadroda kaleci yok',
        context: { clubId: 42, goalkeepers: 0 },
      });
      expect.unreachable('fırlatmalıydı');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(EngineError);
      expect((error as EngineError).code).toBe('engine.noKeeper');
      expect((error as EngineError).kind).toBe(ERROR_KINDS.engine);
      expect((error as EngineError).context).toEqual({ clubId: 42, goalkeepers: 0 });
    }
  });
});

describe('`kind` seçeneği — Karar 18: sınıflandırma bağlamdan bağımsız değildir', () => {
  it.each([
    [ERROR_KINDS.domain, DomainError],
    [ERROR_KINDS.validation, ValidationError],
    [ERROR_KINDS.engine, EngineError],
    [ERROR_KINDS.dataProvider, DataProviderError],
    [ERROR_KINDS.notFound, NotFoundError],
    [ERROR_KINDS.forbidden, ForbiddenError],
  ])('%s → doğru sınıf', (kind, ctor) => {
    // Altı `ErrorKind`in altısı da eşlemede: eşleme `Record<ErrorKind, …>`
    // olduğu için yenisi eklenip yazılmazsa DERLEME kırılır (SAPMA-010 kapısı).
    // Bu test o kapının çalışma zamanı yüzünü sabitliyor.
    expect(() => assertInvariant(false, { code: 'k', message: 'm', kind })).toThrow(ctor);
  });
});

describe('`report` kipi — tarayıcı üretim davranışı', () => {
  it('fırlatmıyor, bildiriyor ve `false` dönüyor', () => {
    const report = vi.fn<(violation: InvariantViolation) => void>();
    configureAssertions({ mode: ASSERTION_MODES.report, report });

    const held = assertInvariant(false, {
      code: 'api.correlationMismatch',
      message: 'Zincir kopuk',
      context: { sent: 'a', received: 'b' },
      kind: ERROR_KINDS.dataProvider,
    });

    expect(held).toBe(false);
    expect(report).toHaveBeenCalledTimes(1);
    expect(report.mock.calls[0]?.[0]).toEqual({
      code: 'api.correlationMismatch',
      message: 'Zincir kopuk',
      context: { sent: 'a', received: 'b' },
      kind: ERROR_KINDS.dataProvider,
    });
  });

  it('koşul doğruyken bildirici HİÇ çağrılmıyor', () => {
    const report = vi.fn<(violation: InvariantViolation) => void>();
    configureAssertions({ mode: ASSERTION_MODES.report, report });
    expect(assertInvariant(true, { code: 'x', message: 'm' })).toBe(true);
    expect(report).not.toHaveBeenCalled();
  });

  it('`context` verilmezse bildiriciye boş nesne gidiyor', () => {
    const report = vi.fn<(violation: InvariantViolation) => void>();
    configureAssertions({ mode: ASSERTION_MODES.report, report });
    assertInvariant(false, { code: 'x', message: 'm' });
    expect(report.mock.calls[0]?.[0].context).toEqual({});
  });

  it('`resetAssertionsForTests` güvenli tarafa geri dönüyor', () => {
    configureAssertions({ mode: ASSERTION_MODES.report, report: () => undefined });
    expect(assertionMode()).toBe(ASSERTION_MODES.report);
    resetAssertionsForTests();
    expect(assertionMode()).toBe(ASSERTION_MODES.throw);
    expect(() => assertInvariant(false, { code: 'x', message: 'm' })).toThrow(EngineError);
  });
});

describe('bildirilen ihlal GERÇEK logger hattından geçince redakte oluyor', () => {
  it('`password` alanı `[REDACTED]` oluyor (K8 + 2.2b)', () => {
    // Uyarı `logger.warn` üzerinden gidiyor (K8) ve modül logger'ı BİLMİYOR —
    // bağımlılığı bu test kuruyor, tıpkı `main.tsx`in ürün tarafında kurduğu
    // gibi (2.3c `contextProvider` deseni).
    const chunks: string[] = [];
    const stream = new Writable({
      write(chunk: Buffer | string, _encoding, callback): void {
        chunks.push(String(chunk));
        callback();
      },
    });
    const logger = createServerLogger(
      { level: LOG_LEVELS.info, format: LOG_FORMATS.json, name: 'test' },
      stream,
    );

    configureAssertions({
      mode: ASSERTION_MODES.report,
      report: (violation) => {
        logger.warn({ ...violation.context, code: violation.code }, violation.message);
      },
    });

    assertInvariant(false, {
      code: 'auth.tokenMismatch',
      message: 'Değişmez kırıldı',
      context: { userId: 7, sessionToken: 'çok-gizli' },
    });

    const line = JSON.parse(chunks.join('').trim()) as Record<string, unknown>;
    expect(line['sessionToken']).toBe(REDACTED);
    expect(line['userId']).toBe(7);
    expect(line['code']).toBe('auth.tokenMismatch');
    expect(line['level']).toBe(40);
    expect(chunks.join('')).not.toContain('çok-gizli');
  });
});
