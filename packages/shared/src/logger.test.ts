import { describe, expect, it, vi } from 'vitest';

import { createNoopLogger, LOG_FORMATS, LOG_LEVELS, normalizeLogArgs } from './logger.js';

/**
 * Kök logger modülünün testleri — arayüz sabitleri ve izomorfik yardımcılar.
 *
 * Bu dosyada pino da `console` da yok; buradaki her şey motorun da tarayıcının
 * da görebildiği yüzey.
 */

describe('normalizeLogArgs — iki çağrı biçimini tek şekle indirger', () => {
  it('yalnızca mesaj verildiğinde bağlam boş olur', () => {
    expect(normalizeLogArgs('sade mesaj')).toEqual({ context: {}, message: 'sade mesaj' });
  });

  it('bağlam + mesaj verildiğinde ikisi de korunur', () => {
    expect(normalizeLogArgs({ clubId: 42 }, 'teklif')).toEqual({
      context: { clubId: 42 },
      message: 'teklif',
    });
  });

  it('bağlam verilip mesaj unutulursa boş dizgiye düşer — çökmez', () => {
    // Aşırı katı olmak burada zarar verir: eksik mesaj yüzünden log satırının
    // tamamen kaybolması, boş mesajlı bir satırdan kötüdür.
    expect(normalizeLogArgs({ clubId: 42 })).toEqual({ context: { clubId: 42 }, message: '' });
  });

  it('iki uygulama da AYNI yardımcıyı kullanır — ayrışma noktası tek', () => {
    // Bu fonksiyon hem pino hem tarayıcı logger'ında çağrılıyor. Ayrı ayrı
    // yazılsalardı biri `undefined` mesajı `'undefined'` diye basardı,
    // diğeri boş bırakırdı ve fark aylar sonra bir log satırında görünürdü.
    expect(normalizeLogArgs({}, undefined).message).toBe('');
  });
});

describe('createNoopLogger', () => {
  it('altı seviyenin hepsi çağrılabilir ve hiçbir şey yapmaz', () => {
    const logger = createNoopLogger();
    expect(() => {
      logger.fatal('f');
      logger.error({ a: 1 }, 'e');
      logger.warn('w');
      logger.info('i');
      logger.debug('d');
      logger.trace('t');
    }).not.toThrow();
  });

  it('child KENDİSİNİ döner — zincir kurmaya çalışan kod da çalışır', () => {
    const logger = createNoopLogger();
    expect(logger.child({ correlationId: 'x' })).toBe(logger);
  });

  it('seviye verilmezse info olur, verilirse korunur', () => {
    expect(createNoopLogger().level).toBe(LOG_LEVELS.info);
    expect(createNoopLogger(LOG_LEVELS.debug).level).toBe(LOG_LEVELS.debug);
  });

  it('hiçbir çıktı üretmez — console dokunulmaz', () => {
    const spy = vi.fn();
    vi.stubGlobal('console', {
      ...console,
      log: spy,
      info: spy,
      warn: spy,
      error: spy,
      debug: spy,
    });
    try {
      createNoopLogger(LOG_LEVELS.trace).error({ err: new Error('x') }, 'olmamalı');
      expect(spy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('sabitler', () => {
  it('altı log seviyesi tanımlı', () => {
    expect(Object.keys(LOG_LEVELS)).toEqual(['fatal', 'error', 'warn', 'info', 'debug', 'trace']);
  });

  it('iki biçim tanımlı ve değerleri kendi adları', () => {
    expect(LOG_FORMATS).toEqual({ json: 'json', pretty: 'pretty' });
  });
});
