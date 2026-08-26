import { LOG_LEVELS, REDACTED } from '@fms/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBrowserLogger } from './logger.js';

/**
 * Tarayıcı logger'ı testleri.
 *
 * Sunucu logger'ıyla **aynı** sözleşmeyi sınıyorlar: aynı seviyeler, aynı
 * eşik davranışı, aynı redaksiyon. İki uygulamanın ayrışması bu testlerde
 * görünür — nitekim redaksiyon bilerek paylaşılıyor (`@fms/shared/redact`),
 * iki kopya yazılsaydı kaçınılmaz olarak ayrışırdı.
 */

interface Spies {
  debug: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
}

function spyOnConsole(): Spies {
  const spies: Spies = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  vi.stubGlobal('console', { ...console, ...spies });
  return spies;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createBrowserLogger — seviye eşleşmesi', () => {
  it('her seviye doğru console metoduna gider', () => {
    const spies = spyOnConsole();
    const logger = createBrowserLogger({ level: LOG_LEVELS.trace });

    logger.trace('t');
    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');
    logger.fatal('f');

    // trace ve debug → console.debug · fatal ve error → console.error
    expect(spies.debug).toHaveBeenCalledTimes(2);
    expect(spies.info).toHaveBeenCalledTimes(1);
    expect(spies.warn).toHaveBeenCalledTimes(1);
    expect(spies.error).toHaveBeenCalledTimes(2);
  });

  it('eşiğin altındaki seviye YAZILMAZ', () => {
    const spies = spyOnConsole();
    const logger = createBrowserLogger({ level: LOG_LEVELS.warn });

    logger.info('görünmemeli');
    logger.debug('bu da');
    logger.warn('görünmeli');

    expect(spies.info).not.toHaveBeenCalled();
    expect(spies.debug).not.toHaveBeenCalled();
    expect(spies.warn).toHaveBeenCalledTimes(1);
  });
});

describe('createBrowserLogger — bağlam', () => {
  it('mesaj ve bağlamı birlikte geçirir', () => {
    const spies = spyOnConsole();
    const logger = createBrowserLogger({ level: LOG_LEVELS.info });

    logger.info({ correlationId: 'abc-123', clubId: 42 }, 'tıklandı');

    expect(spies.info).toHaveBeenCalledWith('tıklandı', {
      correlationId: 'abc-123',
      clubId: 42,
    });
  });

  it('yalnızca mesajla çağrılabilir', () => {
    const spies = spyOnConsole();
    createBrowserLogger({ level: LOG_LEVELS.info }).info('sade');
    expect(spies.info).toHaveBeenCalledWith('sade', {});
  });

  it('child bağlamı birleştirir ve taşır', () => {
    const spies = spyOnConsole();
    const logger = createBrowserLogger({ level: LOG_LEVELS.info });

    logger.child({ correlationId: 'zincir-1' }).info({ clubId: 7 }, 'istek');

    expect(spies.info).toHaveBeenCalledWith('istek', { correlationId: 'zincir-1', clubId: 7 });
  });

  it('child üstündeki bağlamı EZMEZ, ekler', () => {
    const spies = spyOnConsole();
    const logger = createBrowserLogger({ level: LOG_LEVELS.info, bindings: { app: 'fms' } });

    logger.child({ screen: 'squad' }).info('gezinme');

    expect(spies.info).toHaveBeenCalledWith('gezinme', { app: 'fms', screen: 'squad' });
  });
});

describe('createBrowserLogger — redaksiyon (sunucuyla AYNI kural)', () => {
  it('hassas alanları redakte eder', () => {
    const spies = spyOnConsole();
    const logger = createBrowserLogger({ level: LOG_LEVELS.info });

    logger.info({ userPassword: 'hunter2', clubId: 7 }, 'form gönderildi');

    expect(spies.info).toHaveBeenCalledWith('form gönderildi', {
      userPassword: REDACTED,
      clubId: 7,
    });
  });

  it('child bağlamındaki sır da redakte edilir', () => {
    const spies = spyOnConsole();
    const logger = createBrowserLogger({ level: LOG_LEVELS.info });

    logger.child({ accessToken: 'gizli' }).info('istek');

    const [, context] = spies.info.mock.calls[0] as [string, Record<string, unknown>];
    expect(context['accessToken']).toBe(REDACTED);
    expect(JSON.stringify(context)).not.toContain('gizli');
  });
});
