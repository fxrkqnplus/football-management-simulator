import 'reflect-metadata';

import { EventEmitter } from 'node:events';

import { CORRELATION_HEADER, createCorrelationId, type Logger, type LogLevel } from '@fms/shared';
import { getLogContext, runWithLogContext } from '@fms/shared/server';
import { describe, expect, it, vi } from 'vitest';

import { CorrelationMiddleware } from './correlation.middleware.js';
import {
  levelForStatus,
  pathWithoutQuery,
  RequestLogMiddleware,
} from './request-log.middleware.js';

/**
 * İstek loglaması testleri — `docs/spec/09` §11.1 zincirinin dördüncü halkası.
 *
 * Express nesneleri sahtelenmiş; uçtan uca doğrulama gerçek `curl` duman
 * testinde ve gerçek tarayıcıda yapılıyor (2.3c kapanış kanıtı).
 *
 * ⚠️ SAHTE `response` bir GERÇEK `EventEmitter` — düz nesne değil. 2.3b'de
 * `App.test.tsx` sahteleri düz nesneydi ve `apiRequest` yanıt başlığını
 * okumaya başlayınca altı test birden kırıldı (günlük #30). Bir sahte, taklit
 * ettiği sözleşmenin **kullanılan yüzeyini** taklit etmeli: burada o yüzey
 * `on('finish')` + `statusCode`.
 */

interface Recorded {
  readonly level: LogLevel;
  readonly context: Record<string, unknown>;
  readonly message: string;
}

function recordingLogger(): { records: Recorded[]; asLogger: Logger } {
  const records: Recorded[] = [];
  const method =
    (level: LogLevel) =>
    (first: unknown, second?: string): void => {
      records.push({
        level,
        context: (typeof first === 'string' ? {} : first) as Record<string, unknown>,
        message: typeof first === 'string' ? first : (second ?? ''),
      });
    };
  const stub = {
    level: 'info',
    fatal: method('fatal'),
    error: method('error'),
    warn: method('warn'),
    info: method('info'),
    debug: method('debug'),
    trace: method('trace'),
    child: (): unknown => stub,
  };
  return { records, asLogger: stub as unknown as Logger };
}

/** `finish` olayı yayabilen sahte yanıt. */
class FakeResponse extends EventEmitter {
  statusCode = 200;
  readonly headers: Record<string, string> = {};
  setHeader(name: string, value: string): void {
    this.headers[name] = value;
  }
  finish(status: number): void {
    this.statusCode = status;
    this.emit('finish');
  }
}

function fakeRequest(url: string, incomingId?: string): unknown {
  return {
    method: 'GET',
    originalUrl: url,
    header: (name: string) => (name === CORRELATION_HEADER ? incomingId : undefined),
  };
}

/** İki middleware'i ÜRETİMDEKİ sırayla zincirler. */
function runChain(options: {
  readonly url?: string;
  readonly incomingId?: string;
  readonly status?: number;
  readonly reverseOrder?: boolean;
}): { records: Recorded[]; response: FakeResponse } {
  const { records, asLogger } = recordingLogger();
  const correlation = new CorrelationMiddleware(asLogger);
  const requestLog = new RequestLogMiddleware(asLogger);

  const request = fakeRequest(options.url ?? '/fms/api/health', options.incomingId);
  const response = new FakeResponse();

  const first = options.reverseOrder === true ? requestLog : correlation;
  const second = options.reverseOrder === true ? correlation : requestLog;

  first.use(request as never, response as never, () => {
    second.use(request as never, response as never, () => undefined);
  });

  response.finish(options.status ?? 200);
  return { records, response };
}

/** Sadece `http.request` satırları (middleware'in `warn`ları hariç). */
function requestLines(records: Recorded[]): Recorded[] {
  return records.filter((r) => r.context['code'] === 'http.request');
}

describe('levelForStatus — Karar 11', () => {
  it('2xx ve 3xx → info', () => {
    expect(levelForStatus(200)).toBe('info');
    expect(levelForStatus(204)).toBe('info');
    expect(levelForStatus(302)).toBe('info');
  });

  it('4xx → warn', () => {
    expect(levelForStatus(400)).toBe('warn');
    expect(levelForStatus(404)).toBe('warn');
    expect(levelForStatus(499)).toBe('warn');
  });

  it('5xx → error', () => {
    expect(levelForStatus(500)).toBe('error');
    expect(levelForStatus(503)).toBe('error');
  });
});

describe('pathWithoutQuery — sorgu dizesi loglanmaz', () => {
  it('sorgu dizesini atar', () => {
    expect(pathWithoutQuery('/fms/api/players?search=abc')).toBe('/fms/api/players');
  });

  it('sorgu yoksa yolu aynen döner', () => {
    expect(pathWithoutQuery('/fms/api/health')).toBe('/fms/api/health');
  });

  it('SIR sorgu dizesinde gelse bile satıra girmez', () => {
    // Redaksiyon anahtar ADINA bakıyor; sorgu dizesi satıra tek bir DİZGE
    // olarak girseydi hiçbir anahtar eşleşmesine takılmazdı.
    expect(pathWithoutQuery('/fms/api/login?token=cok-gizli')).not.toContain('cok-gizli');
  });
});

// ── ZORUNLU NEGATİF TEST (a) ────────────────────────────────────────────
describe('istek satırı correlationId taşıyor', () => {
  it('log satırında correlationId VAR', () => {
    const { records } = runChain({});
    const line = requestLines(records)[0];

    expect(line).toBeDefined();
    expect(typeof line?.context['correlationId']).toBe('string');
  });

  // ── ZORUNLU NEGATİF TEST (b) ──────────────────────────────────────────
  it('yanıt BAŞLIĞINDAKİ id ile log satırındaki id AYNI', () => {
    const { records, response } = runChain({});
    const line = requestLines(records)[0];

    expect(response.headers[CORRELATION_HEADER]).toBeDefined();
    expect(line?.context['correlationId']).toBe(response.headers[CORRELATION_HEADER]);
  });

  it('istemcinin gönderdiği kimlik kabul edilirse log satırı ONU taşır', () => {
    const incomingId = createCorrelationId();
    const { records, response } = runChain({ incomingId });

    expect(requestLines(records)[0]?.context['correlationId']).toBe(incomingId);
    expect(response.headers[CORRELATION_HEADER]).toBe(incomingId);
  });
});

// ── ZORUNLU NEGATİF TEST (c) ────────────────────────────────────────────
describe('hata durumlarında da satır çıkıyor', () => {
  it('404 → warn seviyesinde satır', () => {
    const { records } = runChain({ url: '/fms/api/yok', status: 404 });
    const line = requestLines(records)[0];

    expect(line?.level).toBe('warn');
    expect(line?.context['status']).toBe(404);
    expect(line?.context['path']).toBe('/fms/api/yok');
    expect(line?.context['correlationId']).toBeDefined();
  });

  it('500 → error seviyesinde satır, kimlik yine taşınıyor', () => {
    const { records } = runChain({ status: 500 });
    const line = requestLines(records)[0];

    expect(line?.level).toBe('error');
    expect(line?.context['correlationId']).toBeDefined();
  });
});

describe('satırın alanları', () => {
  it('metot, yol, durum ve süre taşıyor', () => {
    const { records } = runChain({ url: '/fms/api/health?x=1', status: 200 });
    const line = requestLines(records)[0];

    expect(line?.context['code']).toBe('http.request');
    expect(line?.context['method']).toBe('GET');
    expect(line?.context['path']).toBe('/fms/api/health');
    expect(line?.context['status']).toBe(200);
    expect(typeof line?.context['durationMs']).toBe('number');
    expect(line?.message).toBe('İstek tamamlandı');
  });

  it('istek başına TEK satır — çift loglama yok', () => {
    const { records } = runChain({});
    expect(requestLines(records)).toHaveLength(1);
  });

  it('yanıt sonlanmadan HİÇBİR satır yazılmaz', () => {
    const { records, asLogger } = recordingLogger();
    const response = new FakeResponse();

    new RequestLogMiddleware(asLogger).use(
      fakeRequest('/fms/api/health') as never,
      response as never,
      () => undefined,
    );

    // `finish` yayılmadı: satır olmamalı.
    expect(requestLines(records)).toHaveLength(0);
  });
});

// ── SIRA BAĞIMLILIĞI ────────────────────────────────────────────────────
// `app.module.ts`'teki middleware sırası bir yorum değil, bir SÖZLEŞME.
describe('middleware SIRASI önemli — ters sırada zincir kopuyor', () => {
  it('DOĞRU sıra (correlation önce): satır kimlik taşıyor', () => {
    const { records } = runChain({});
    expect(requestLines(records)[0]?.context['correlationId']).toBeDefined();
  });

  it('TERS sıra (request-log önce): satır KİMLİKSİZ — ve bu sessiz bir kopma', () => {
    const { records } = runChain({ reverseOrder: true });
    const line = requestLines(records)[0];

    // Satır yine yazılıyor — kopukluğun belirtisi yok. Testin varlık sebebi bu:
    // sıra bozulursa hiçbir kapı ötmez, yalnızca zincir sessizce kopar.
    expect(line).toBeDefined();
    expect(line?.context['correlationId']).toBeUndefined();
  });
});

// ── ÖLÇÜLMÜŞ TUZAK: ALS bağlamı `finish` anında kaybolabilir ────────────
describe('bağlam BAŞLANGIÇTA yakalanıyor, finish anındaki ortama güvenilmiyor', () => {
  it('bağlam finish anında KAYBOLSA bile satır kimliği taşır', () => {
    const { records, asLogger } = recordingLogger();
    const response = new FakeResponse();
    const correlationId = createCorrelationId();

    // Middleware bağlam İÇİNDE çalışıyor…
    runWithLogContext({ correlationId }, () => {
      new RequestLogMiddleware(asLogger).use(
        fakeRequest('/fms/api/health') as never,
        response as never,
        () => undefined,
      );
    });

    // …ama `finish` bağlamın DIŞINDAN yayılıyor. Ölçüldü (2.3c): sentetik bir
    // EventEmitter'da `getLogContext()` burada boş döner. Bağlam başlangıçta
    // yakalanmasaydı satır kimliksiz çıkardı.
    response.finish(200);

    expect(requestLines(records)[0]?.context['correlationId']).toBe(correlationId);
  });

  it('KONTROL: aynı anda ortam bağlamı gerçekten BOŞ', () => {
    // Yukarıdaki testin DOĞRU SEBEPLE geçtiğinin kanıtı. Bu olmadan test,
    // ortam bağlamı kazara taşınıyor olsa da geçerdi ve "başlangıçta yakalama"
    // tasarımı hiçbir şey kanıtlamazdı (günlük #16'nın dersi).
    const seen = vi.fn();
    const response = new FakeResponse();

    runWithLogContext({ correlationId: 'X' }, () => {
      response.on('finish', () => {
        seen(getLogContext());
      });
    });
    response.finish(200);

    expect(seen).toHaveBeenCalledWith({});
  });
});
