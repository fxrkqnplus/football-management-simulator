import 'reflect-metadata';

import { CORRELATION_HEADER, createCorrelationId, isCorrelationId } from '@fms/shared';
import { getLogContext } from '@fms/shared/server';
import { describe, expect, it, vi } from 'vitest';

import { CorrelationMiddleware } from './correlation.middleware.js';

/**
 * `correlationId` middleware testleri — `docs/spec/09` §11.1 zincirinin başı.
 *
 * Express nesneleri sahtelenmiş: gerçek bir HTTP sunucusu kurmak bu davranışı
 * kanıtlamak için gerekmiyor ve testi yavaşlatırdı. Uçtan uca doğrulama
 * `apps/api` duman testinde (gerçek curl) yapılıyor.
 */

interface FakeResponse {
  headers: Record<string, string>;
  setHeader: (name: string, value: string) => void;
}

function fakeRequest(header?: string): { header: (name: string) => string | undefined } {
  return {
    header: (name: string) => (name === CORRELATION_HEADER ? header : undefined),
  };
}

function fakeResponse(): FakeResponse {
  const headers: Record<string, string> = {};
  return {
    headers,
    setHeader(name, value) {
      headers[name] = value;
    },
  };
}

/** Sahte logger — yalnızca `warn` çağrılarını kaydeder. */
function fakeLogger(): { warn: ReturnType<typeof vi.fn>; asLogger: never } {
  const warn = vi.fn();
  const stub = {
    level: 'info',
    fatal: vi.fn(),
    error: vi.fn(),
    warn,
    info: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    child: (): unknown => stub,
  };
  return { warn, asLogger: stub as never };
}

/** Middleware'i çalıştırıp zincir içinde görülen bağlamı döner. */
function run(header?: string): {
  seenContext: Record<string, unknown>;
  response: FakeResponse;
  warn: ReturnType<typeof vi.fn>;
} {
  const { warn, asLogger } = fakeLogger();
  const middleware = new CorrelationMiddleware(asLogger);
  const response = fakeResponse();
  let seenContext: Record<string, unknown> = {};

  middleware.use(
    fakeRequest(header) as never,
    response as never,
    (() => {
      seenContext = { ...getLogContext() };
    }) as never,
  );

  return { seenContext, response, warn };
}

describe('CorrelationMiddleware — gidiş-dönüş', () => {
  it('geçerli gelen başlığı KULLANIR', () => {
    const incoming = createCorrelationId();
    const { seenContext, response } = run(incoming);

    expect(seenContext['correlationId']).toBe(incoming);
    expect(response.headers[CORRELATION_HEADER]).toBe(incoming);
  });

  it("gelen kimliği yanıt başlığına geri yazar — istemci aynı id'yi görür", () => {
    const incoming = createCorrelationId();
    const { response } = run(incoming);
    expect(response.headers[CORRELATION_HEADER]).toBe(incoming);
  });

  it('v4 kimliği de kabul eder — zinciri başka bir taraf başlatmış olabilir', () => {
    const v4 = '018f3c9a-1b2c-4d3e-8f45-6a7b8c9d0e1f';
    const { seenContext } = run(v4);
    expect(seenContext['correlationId']).toBe(v4);
  });
});

describe('CorrelationMiddleware — negatif senaryolar', () => {
  it('BAŞLIKSIZ istek: sunucu kendi kimliğini üretir', () => {
    const { seenContext, response, warn } = run(undefined);

    const generated = seenContext['correlationId'];
    expect(typeof generated).toBe('string');
    expect(isCorrelationId(String(generated))).toBe(true);
    expect(response.headers[CORRELATION_HEADER]).toBe(generated);
    // Başlığın olmaması normal — uyarı BASILMAZ.
    expect(warn).not.toHaveBeenCalled();
  });

  it('BOŞ başlık: yok sayılır, uyarı basılmaz', () => {
    const { seenContext, warn } = run('');
    expect(isCorrelationId(String(seenContext['correlationId']))).toBe(true);
    expect(warn).not.toHaveBeenCalled();
  });

  it('GEÇERSİZ başlık: istek REDDEDİLMEZ, yeni kimlik üretilir ve uyarılır', () => {
    // Karar: bozuk bir izleme başlığı yüzünden kullanıcının işlemini düşürmek
    // çözdüğünden çok sorun yaratır. Ama sessizce yutulmuş da olmamalı.
    const { seenContext, response, warn } = run('bu-gecerli-degil');

    const generated = String(seenContext['correlationId']);
    expect(isCorrelationId(generated)).toBe(true);
    expect(response.headers[CORRELATION_HEADER]).toBe(generated);
    expect(warn).toHaveBeenCalledTimes(1);

    const [context, message] = warn.mock.calls[0] as [Record<string, unknown>, string];
    expect(context['code']).toBe('correlation.invalidHeader');
    expect(context['received']).toBe('bu-gecerli-degil');
    expect(context['correlationId']).toBe(generated);
    expect(message).toContain('Geçersiz');
  });

  it('AŞIRI UZUN başlık loga KIRPILARAK girer', () => {
    const { warn } = run('x'.repeat(500));
    const [context] = warn.mock.calls[0] as [Record<string, unknown>];
    expect(String(context['received'])).toHaveLength(25); // 24 + '…'
  });

  it('SATIR SONU içeren başlık log enjeksiyonu yapamaz', () => {
    const { warn } = run('sahte\n{"level":30,"msg":"uydurma"}');
    const [context] = warn.mock.calls[0] as [Record<string, unknown>];
    expect(String(context['received'])).not.toContain('\n');
  });
});

describe('CorrelationMiddleware — bağlam sınırı', () => {
  it('zincir DIŞINDA bağlam sızmıyor', () => {
    run(createCorrelationId());
    expect(getLogContext()).toEqual({});
  });

  it('iki ardışık istek AYRI kimlik alır', () => {
    const first = run(undefined).seenContext['correlationId'];
    const second = run(undefined).seenContext['correlationId'];
    expect(first).not.toBe(second);
  });
});
