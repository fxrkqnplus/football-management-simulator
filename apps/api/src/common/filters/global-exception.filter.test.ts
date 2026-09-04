import 'reflect-metadata';

import {
  CORRELATION_HEADER,
  DataProviderError,
  DomainError,
  EngineError,
  ERROR_KINDS,
  ForbiddenError,
  type Logger,
  type LogLevel,
  NotFoundError,
  REDACTED,
  ValidationError,
} from '@fms/shared';
import { runWithLogContext } from '@fms/shared/server';
import type { ArgumentsHost } from '@nestjs/common';
import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import {
  describeUnknown,
  GlobalExceptionFilter,
  resolveException,
  STATUS_BY_KIND,
  UNEXPECTED_CODE,
} from './global-exception.filter.js';

/**
 * Global hata filtresi testleri — Faz 2 madde 2.4.
 *
 * Bu dosya **birim** seviyesi: eşleme tabloları, gövde şekli, redaksiyon.
 * Gerçek HTTP üzerinden uçtan uca doğrulama ayrı dosyada
 * (`global-exception.filter.http.test.ts`) — orada gerçek bir Nest uygulaması
 * ayağa kalkıyor ve gövde tel üzerinden okunuyor.
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

interface Captured {
  status?: number;
  body?: Record<string, unknown>;
}

/** Express `Response`un filtrenin KULLANDIĞI yüzeyini taklit eder. */
function fakeHost(captured: Captured, header?: string): ArgumentsHost {
  const response = {
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(payload: Record<string, unknown>) {
      captured.body = payload;
      return this;
    },
    getHeader(name: string): string | undefined {
      return name === CORRELATION_HEADER ? header : undefined;
    },
  };
  return {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
}

function runFilter(
  exception: unknown,
  options: { header?: string; contextId?: string } = {},
): { captured: Captured; records: Recorded[] } {
  const captured: Captured = {};
  const { records, asLogger } = recordingLogger();
  const filter = new GlobalExceptionFilter(asLogger);
  const host = fakeHost(captured, options.header);

  if (options.contextId === undefined) {
    filter.catch(exception, host);
  } else {
    runWithLogContext({ correlationId: options.contextId }, () => {
      filter.catch(exception, host);
    });
  }
  return { captured, records };
}

// ── ① EŞLEME TAM KAPSAYICI ──────────────────────────────────────────────
describe('STATUS_BY_KIND — her ErrorKind eşlenmiş', () => {
  it('ERROR_KINDS içindeki HER değerin durum kodu var', () => {
    // Derleme zamanı kapısı `Record<ErrorKind, number>`. Bu, aynı iddianın
    // ÇALIŞMA ZAMANI ikinci hattı: tablo bir gün `Partial` yapılırsa veya
    // tip gevşetilirse burada kırılır.
    for (const kind of Object.values(ERROR_KINDS)) {
      expect(typeof STATUS_BY_KIND[kind]).toBe('number');
    }
  });

  it('tablo fazladan anahtar TAŞIMIYOR', () => {
    expect(Object.keys(STATUS_BY_KIND).sort()).toEqual(Object.values(ERROR_KINDS).sort());
  });

  it('her hata sınıfı beklenen durum koduna düşüyor', () => {
    const cases = [
      [new ValidationError({ code: 'x.y', message: 'm' }), 400],
      [new DomainError({ code: 'x.y', message: 'm' }), 409],
      [new NotFoundError({ code: 'x.y', message: 'm' }), 404],
      [new ForbiddenError({ code: 'x.y', message: 'm' }), 403],
      [new EngineError({ code: 'x.y', message: 'm' }), 500],
      [new DataProviderError({ code: 'x.y', message: 'm' }), 502],
    ] as const;

    for (const [error, status] of cases) {
      expect(resolveException(error).status).toBe(status);
    }
  });
});

// ── ④ `Error` OLMAYAN FIRLATMA ──────────────────────────────────────────
describe('Error olmayan fırlatmalar da yakalanıyor', () => {
  it("throw 'metin' → 500, filtre patlamıyor", () => {
    const { captured } = runFilter('bir şeyler ters gitti');

    expect(captured.status).toBe(500);
    expect(captured.body?.['code']).toBe(UNEXPECTED_CODE);
  });

  it('throw { foo: 1 } → 500', () => {
    const { captured, records } = runFilter({ foo: 1 });

    expect(captured.status).toBe(500);
    // Nesne loga anlamlı biçimde iniyor — `[object Object]` değil.
    expect(records[0]?.context['detail']).toBe('{"foo":1}');
  });

  it('throw null → 500, filtre `null.message` okumaya kalkmıyor', () => {
    const { captured, records } = runFilter(null);

    expect(captured.status).toBe(500);
    expect(records[0]?.context['detail']).toBe('null');
  });

  it('throw undefined → 500', () => {
    expect(runFilter(undefined).captured.status).toBe(500);
  });

  it('döngüsel nesne fırlatılsa bile açıklama üretiliyor', () => {
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    // `[object Object]` DEĞİL: durumu adlandıran bir metin. Lint
    // (`no-base-to-string`) bu ayrımı yakaladı ve haklıydı.
    expect(describeUnknown(circular)).toBe('[döngüsel nesne]');
  });

  it('sembol ve fonksiyon fırlatması da açıklanabiliyor', () => {
    expect(describeUnknown(Symbol('test'))).toBe('Symbol(test)');
    expect(
      describeUnknown(function boom() {
        return 1;
      }),
    ).toBe('[function boom]');
  });
});

// ── ③ BİLİNMEYEN HATA → 500, AYRINTI YALNIZCA LOGDA ─────────────────────
describe('bilinmeyen hata: gövdede İÇ AYRINTI YOK', () => {
  it('yığın izi, iç mesaj ve context gövdeye GİRMİYOR', () => {
    const secret = new TypeError('İç ayrıntı: /srv/fms/dist/gizli-modul.js patladı');
    const { captured } = runFilter(secret);

    const body = JSON.stringify(captured.body);
    expect(captured.status).toBe(500);
    expect(body).not.toContain('gizli-modul');
    expect(body).not.toContain('İç ayrıntı');
    expect(body).not.toContain('TypeError');
    expect(captured.body?.['context']).toBeUndefined();
    expect(captured.body?.['stack']).toBeUndefined();
    expect(captured.body?.['message']).toBeUndefined();
  });

  it('aynı ayrıntı LOGDA var — bilgi kaybolmuyor, yer değiştiriyor', () => {
    const { records } = runFilter(new TypeError('gizli-modul patladı'));
    const line = records[0];

    expect(line?.level).toBe('error');
    expect(String(line?.context['detail'])).toContain('gizli-modul');
    expect(typeof line?.context['stack']).toBe('string');
  });

  it('4xx için yığın izi LOGA da yazılmıyor — beklenen durum, gürültü değil', () => {
    const { records } = runFilter(new NotFoundError({ code: 'player.notFound', message: 'yok' }));

    expect(records[0]?.level).toBe('warn');
    expect(records[0]?.context['stack']).toBeUndefined();
  });
});

// ── ⑤ TÜRKÇE MESAJ + `code` ─────────────────────────────────────────────
describe('gövde sözleşmesi: code + Türkçe mesaj + status', () => {
  it('bilinen hatanın `code`u gövdede AYNEN dönüyor (i18n anahtarı)', () => {
    const { captured } = runFilter(
      new DomainError({ code: 'transfer.budgetExceeded', message: 'geliştirici mesajı' }),
    );

    expect(captured.body?.['code']).toBe('transfer.budgetExceeded');
    expect(captured.body?.['status']).toBe(409);
    expect(captured.body?.['message']).toBeUndefined();
  });

  it('GELİŞTİRİCİ mesajı gövdeye SIZMIYOR', () => {
    const { captured, records } = runFilter(
      new DomainError({ code: 'transfer.budgetExceeded', message: 'iç geliştirici notu' }),
    );

    expect(JSON.stringify(captured.body)).not.toContain('iç geliştirici notu');
    // …ama logda duruyor.
    expect(records[0]?.context['detail']).toBe('iç geliştirici notu');
  });

  it('context gövdede dönüyor — Faz 5 mesajı bundan kuracak', () => {
    const { captured } = runFilter(
      new DomainError({
        code: 'transfer.budgetExceeded',
        message: 'm',
        context: { budget: 12_400_000, offer: 18_000_000 },
      }),
    );

    expect(captured.body?.['context']).toEqual({ budget: 12_400_000, offer: 18_000_000 });
  });
});

// ── ⑦ REDAKSİYON ────────────────────────────────────────────────────────
describe('redaksiyon — context hem loga hem gövdeye redakte gidiyor', () => {
  it('hassas alan LOGDA [REDACTED]', () => {
    const { records } = runFilter(
      new ValidationError({
        code: 'auth.badLogin',
        message: 'm',
        context: { password: 'hunter2' },
      }),
    );

    expect(records[0]?.context['password']).toBe(REDACTED);
    expect(JSON.stringify(records[0]?.context)).not.toContain('hunter2');
  });

  it('hassas alan GÖVDEDE de [REDACTED] — istemciye de sızmıyor', () => {
    const { captured } = runFilter(
      new ValidationError({
        code: 'auth.badLogin',
        message: 'm',
        context: { password: 'hunter2', apiKey: 'sk-1', field: 'email' },
      }),
    );

    const context = captured.body?.['context'] as Record<string, unknown>;
    expect(context['password']).toBe(REDACTED);
    expect(context['apiKey']).toBe(REDACTED);
    // Zararsız alan korunuyor — redaksiyon her şeyi silmiyor.
    expect(context['field']).toBe('email');
    expect(JSON.stringify(captured.body)).not.toContain('hunter2');
  });
});

// ── Nest'in kendi HTTP hataları ─────────────────────────────────────────
describe('HttpException 500e çevrilmiyor — anlamlı durum korunuyor', () => {
  it('NotFoundException → 404', () => {
    const { captured } = runFilter(new NotFoundException());

    expect(captured.status).toBe(404);
    expect(captured.body?.['code']).toBe('http.404');
    expect(captured.body?.['message']).toBeUndefined();
  });

  it('403 → yetki metni', () => {
    const { captured } = runFilter(new HttpException('yok', HttpStatus.FORBIDDEN));
    expect(captured.status).toBe(403);
    expect(captured.body?.['message']).toBeUndefined();
  });

  it('5xx HttpException → genel metin, iç mesaj sızmıyor', () => {
    const { captured } = runFilter(new HttpException('iç detay', HttpStatus.BAD_GATEWAY));

    expect(captured.status).toBe(502);
    expect(captured.body?.['message']).toBeUndefined();
    expect(JSON.stringify(captured.body)).not.toContain('iç detay');
  });
});

// ── ⑥ correlationId GÖVDEDE ─────────────────────────────────────────────
describe('correlationId gövdede — 2.6 "Hata bildir" bunu gönderecek', () => {
  it('ALS bağlamından alınıyor', () => {
    const { captured } = runFilter(new NotFoundError({ code: 'a.b', message: 'm' }), {
      contextId: 'ctx-kimlik',
    });

    expect(captured.body?.['correlationId']).toBe('ctx-kimlik');
  });

  it('ALS BOŞSA yanıt başlığından alınıyor — zincir kopmuyor', () => {
    // 2.3c'de ölçüldü ki ALS'in varlığı çağrının nereden geldiğine bağlı.
    // Yedek olmasaydı hata yanıtı kimliksiz kalırdı — tam da kimliğe en çok
    // ihtiyaç duyulan anda.
    const { captured } = runFilter(new NotFoundError({ code: 'a.b', message: 'm' }), {
      header: 'baslik-kimlik',
    });

    expect(captured.body?.['correlationId']).toBe('baslik-kimlik');
  });

  it('ALS varsa BAŞLIĞA tercih ediliyor', () => {
    const { captured } = runFilter(new NotFoundError({ code: 'a.b', message: 'm' }), {
      contextId: 'ctx-kimlik',
      header: 'baslik-kimlik',
    });

    expect(captured.body?.['correlationId']).toBe('ctx-kimlik');
  });

  it('hiçbiri yoksa alan hiç KONMUYOR — boş dizge dönmüyor', () => {
    const { captured } = runFilter(new NotFoundError({ code: 'a.b', message: 'm' }));

    expect(captured.body).not.toHaveProperty('correlationId');
  });
});
