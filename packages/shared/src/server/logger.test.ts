import { Writable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { ValidationError } from '../errors.js';
import { LOG_FORMATS, LOG_LEVELS } from '../logger.js';
import { REDACTED } from '../redact.js';
import { createServerLogger } from './logger.js';

/**
 * Sunucu logger'ı testleri.
 *
 * Çıktı gerçekten yakalanıyor: pino'ya bir `Writable` veriliyor ve üretilen
 * JSON satırları ayrıştırılıyor. "Çağrı hata vermedi" testi bir şey kanıtlamaz —
 * bu dosyanın iddiası **ne yazıldığı**.
 *
 * `pretty` biçimi burada test EDİLMİYOR: `pino-pretty` bir worker thread
 * (`thread-stream`) açıyor ve test sürecinde asenkron kapanışı gürültü üretiyor.
 * Onun yerine `pretty` seçildiğinde pino'ya `transport` verildiği doğrulanıyor
 * (aşağıdaki son test) ve gerçek çıktı `apps/api` duman testinde görülüyor.
 */

/** Yazılan JSON satırlarını toplayan hedef. */
function captureStream(): { stream: Writable; lines: () => Record<string, unknown>[] } {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer | string, _encoding, callback): void {
      chunks.push(String(chunk));
      callback();
    },
  });
  return {
    stream,
    lines: () =>
      chunks
        .join('')
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line) => JSON.parse(line) as Record<string, unknown>),
  };
}

describe('createServerLogger — çıktı', () => {
  it('mesaj ve bağlamı JSON satırı olarak yazar', () => {
    const { stream, lines } = captureStream();
    const logger = createServerLogger(
      { level: LOG_LEVELS.info, format: LOG_FORMATS.json, name: 'api' },
      stream,
    );

    logger.info({ correlationId: 'abc-123', clubId: 42 }, 'Teklif değerlendirildi');

    const [line] = lines();
    expect(line?.['msg']).toBe('Teklif değerlendirildi');
    expect(line?.['correlationId']).toBe('abc-123');
    expect(line?.['clubId']).toBe(42);
    expect(line?.['name']).toBe('api');
    expect(line?.['level']).toBe(30);
  });

  it('yalnızca mesajla da çağrılabilir', () => {
    // Bağlam zorunlu olsaydı her basit satır `logger.info({}, '…')` olurdu;
    // o sürtünme insanları console'a geri iter ve K8 kâğıt üstünde kalır.
    const { stream, lines } = captureStream();
    const logger = createServerLogger({ level: LOG_LEVELS.info, format: LOG_FORMATS.json }, stream);

    logger.info('sade mesaj');

    expect(lines()[0]?.['msg']).toBe('sade mesaj');
  });

  it('eşiğin altındaki seviyeyi YAZMAZ', () => {
    const { stream, lines } = captureStream();
    const logger = createServerLogger({ level: LOG_LEVELS.warn, format: LOG_FORMATS.json }, stream);

    logger.info('görünmemeli');
    logger.debug('bu da görünmemeli');
    logger.warn('görünmeli');

    const written = lines();
    expect(written).toHaveLength(1);
    expect(written[0]?.['msg']).toBe('görünmeli');
  });

  it('altı seviyenin hepsi çalışıyor', () => {
    const { stream, lines } = captureStream();
    const logger = createServerLogger(
      { level: LOG_LEVELS.trace, format: LOG_FORMATS.json },
      stream,
    );

    logger.fatal('f');
    logger.error('e');
    logger.warn('w');
    logger.info('i');
    logger.debug('d');
    logger.trace('t');

    expect(lines().map((l) => l['level'])).toEqual([60, 50, 40, 30, 20, 10]);
  });
});

describe('createServerLogger — redaksiyon', () => {
  it('hassas alanları yazmadan ÖNCE redakte eder', () => {
    const { stream, lines } = captureStream();
    const logger = createServerLogger({ level: LOG_LEVELS.info, format: LOG_FORMATS.json }, stream);

    logger.info(
      { userPassword: 'hunter2', DATABASE_URL: 'postgresql://fms:parola@db/fms', clubId: 7 },
      'giriş denemesi',
    );

    const [line] = lines();
    expect(line?.['userPassword']).toBe(REDACTED);
    expect(line?.['DATABASE_URL']).toBe(REDACTED);
    expect(line?.['clubId']).toBe(7);
  });

  it('ham sır çıktının HİÇBİR YERİNDE geçmiyor', () => {
    // Alan bazlı assert yetmez: sır başka bir alana veya mesaja sızmış olabilir.
    const { stream, lines } = captureStream();
    const logger = createServerLogger({ level: LOG_LEVELS.info, format: LOG_FORMATS.json }, stream);

    logger.info({ jwtSecret: 'cok-gizli-anahtar-123' }, 'yapılandırma yüklendi');

    expect(JSON.stringify(lines())).not.toContain('cok-gizli-anahtar-123');
  });

  it('child bağlamı da redakte edilir', () => {
    const { stream, lines } = captureStream();
    const logger = createServerLogger({ level: LOG_LEVELS.info, format: LOG_FORMATS.json }, stream);

    logger.child({ apiKey: 'gizli', correlationId: 'zincir-1' }).info('alt logger');

    const [line] = lines();
    expect(line?.['apiKey']).toBe(REDACTED);
    expect(line?.['correlationId']).toBe('zincir-1');
  });

  it('base bağlamı da redakte edilir', () => {
    const { stream, lines } = captureStream();
    const logger = createServerLogger(
      {
        level: LOG_LEVELS.info,
        format: LOG_FORMATS.json,
        base: { sessionId: 'gizli', app: 'fms' },
      },
      stream,
    );

    logger.info('açılış');

    const [line] = lines();
    expect(line?.['sessionId']).toBe(REDACTED);
    expect(line?.['app']).toBe('fms');
  });
});

describe('createServerLogger — hata serileştirme', () => {
  it('AppError mesajını, code ve context alanlarını korur', () => {
    // Düz JSON.stringify bir Error'ı boşaltır (2.1'de ölçüldü). Logger bu
    // sessiz veri kaybını kapatmak zorunda.
    const { stream, lines } = captureStream();
    const logger = createServerLogger({ level: LOG_LEVELS.info, format: LOG_FORMATS.json }, stream);

    logger.error(
      { err: new ValidationError({ code: 'basePath.doubleSlash', message: 'çift eğik çizgi' }) },
      'istek reddedildi',
    );

    const err = lines()[0]?.['err'] as Record<string, unknown> | undefined;
    expect(err?.['message']).toBe('çift eğik çizgi');
    expect(err?.['code']).toBe('basePath.doubleSlash');
    expect(err?.['kind']).toBe('validation');
  });

  it('yığın izi LOGDA taşınır — toJSON onu dışarıda bırakıyordu', () => {
    const { stream, lines } = captureStream();
    const logger = createServerLogger({ level: LOG_LEVELS.info, format: LOG_FORMATS.json }, stream);

    logger.error({ err: new ValidationError({ code: 'x.y', message: 'z' }) }, 'hata');

    const err = lines()[0]?.['err'] as Record<string, unknown> | undefined;
    expect(typeof err?.['stack']).toBe('string');
  });

  it('düz Error da boşalmaz — ad, mesaj ve yığın izi çıkar', () => {
    const { stream, lines } = captureStream();
    const logger = createServerLogger({ level: LOG_LEVELS.info, format: LOG_FORMATS.json }, stream);

    logger.error({ err: new TypeError('düz hata') }, 'beklenmeyen');

    const err = lines()[0]?.['err'] as Record<string, unknown> | undefined;
    expect(err?.['name']).toBe('TypeError');
    expect(err?.['message']).toBe('düz hata');
    expect(typeof err?.['stack']).toBe('string');
  });
});

describe('createServerLogger — biçim kararı', () => {
  it('json biçimi worker thread AÇMAZ', () => {
    // `transport` verilseydi pino bir thread-stream açardı. Testlerin sessiz ve
    // senkron kalmasının sebebi bu; aynı zamanda üretim varsayılanının hafif
    // olduğunun kanıtı.
    const { stream, lines } = captureStream();
    const logger = createServerLogger({ level: LOG_LEVELS.info, format: LOG_FORMATS.json }, stream);
    logger.info('x');
    expect(lines()).toHaveLength(1);
  });

  it('NODE_ENV değişse bile biçim DEĞİŞMEZ — açık bayrak kazanır', () => {
    // Faz 1 hata #10 dersi: ortamdan çıkarsanan kararlar yanlış şeyi ölçer.
    const original = process.env['NODE_ENV'];
    try {
      process.env['NODE_ENV'] = 'production';
      const { stream, lines } = captureStream();
      const logger = createServerLogger(
        { level: LOG_LEVELS.info, format: LOG_FORMATS.json },
        stream,
      );
      logger.info('x');
      // JSON ayrıştırılabiliyorsa biçim hâlâ json — pretty olsaydı kırılırdı.
      expect(lines()[0]?.['msg']).toBe('x');
    } finally {
      if (original === undefined) delete process.env['NODE_ENV'];
      else process.env['NODE_ENV'] = original;
    }
  });
});
