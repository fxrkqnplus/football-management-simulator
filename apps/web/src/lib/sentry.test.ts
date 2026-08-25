import {
  DataProviderError,
  DEFAULT_THROTTLE_WINDOW_MS,
  DomainError,
  EngineError,
  ValidationError,
} from '@fms/shared';
import type { ErrorEvent, EventHint } from '@sentry/react';
import { close, getClient, isInitialized } from '@sentry/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  DENY_URLS,
  fingerprintOf,
  IGNORE_ERRORS,
  SESSION_INTEGRATION,
  setupBrowserSentry,
  shouldReport,
} from './sentry.js';

/**
 * Tarayıcı Sentry kurulumu testleri — Faz 2 madde 2.5b.
 *
 * Sunucu tarafının (`apps/api/src/instrument.test.ts`) aynası. Ortak kararlar
 * (`isUserFaultError`, kısıtlayıcı) `@fms/shared`'dan geldiği için burada
 * yeniden sınanmıyor; sınanan şey **bu tarafın kablolaması**.
 */

/** Ağa çıkmayan ama biçimi geçerli bir DSN. */
const TEST_DSN = 'https://anahtar@127.0.0.1/1';

afterEach(async () => {
  if (isInitialized()) await close(0);
});

/**
 * ⚠️ HER ÇAĞRI BENZERSİZ PARMAK İZİ ÜRETİR — kısıtlayıcı modül düzeyinde ve
 * testler arasında paylaşılıyor. Aynı parmak izini iki test kullansaydı
 * ikincisi kısıtlamaya takılır ve "filtre çalışmıyor" gibi görünürdü.
 */
let sequence = 0;
function eventFor(message: string): ErrorEvent {
  sequence += 1;
  return {
    type: undefined,
    exception: { values: [{ type: `Tip${String(sequence)}`, value: message }] },
  };
}

function freshTime(): number {
  return sequence * 60 * 60 * 1000;
}

function hintFor(error: unknown): EventHint {
  return { originalException: error };
}

function reports(error: unknown): boolean {
  return shouldReport(eventFor('mesaj'), hintFor(error), freshTime());
}

describe('shouldReport — sunucuyla AYNI kural', () => {
  it('ValidationError ve DomainError GÖNDERİLMEZ (kullanıcı hatası)', () => {
    expect(reports(new ValidationError({ code: 'a.b', message: 'm' }))).toBe(false);
    expect(reports(new DomainError({ code: 'a.b', message: 'm' }))).toBe(false);
  });

  it('DataProviderError ve EngineError GÖNDERİLİR (sistem hatası)', () => {
    // `api.ts` 5xx ve ağ hatalarını `DataProviderError` yapıyor — bu satır o
    // modellemenin Sentry ucunda gerçekten işe yaradığının kanıtı.
    expect(reports(new DataProviderError({ code: 'api.requestFailed', message: 'm' }))).toBe(true);
    expect(reports(new EngineError({ code: 'a.b', message: 'm' }))).toBe(true);
  });

  it('bizim olmayan hatalar GÖNDERİLİR', () => {
    expect(reports(new TypeError('render patladı'))).toBe(true);
    expect(reports('düz dizge')).toBe(true);
  });

  it('aynı parmak izi pencere içinde DÜŞÜRÜLÜR — render döngüsü koruması', () => {
    const event = eventFor('döngüde tekrar eden render hatası');
    const hint = hintFor(new TypeError('render'));
    const t0 = freshTime();

    expect(shouldReport(event, hint, t0)).toBe(true);
    expect(shouldReport(event, hint, t0 + 1_000)).toBe(false);
    expect(shouldReport(event, hint, t0 + DEFAULT_THROTTLE_WINDOW_MS)).toBe(true);
  });
});

describe('fingerprintOf', () => {
  it('tip ve mesajdan kararlı parmak izi üretiyor', () => {
    expect(
      fingerprintOf({
        type: undefined,
        exception: { values: [{ type: 'TypeError', value: 'x' }] },
      }),
    ).toBe('TypeError:x');
  });

  it('istisna bilgisi yoksa da çökmüyor', () => {
    expect(fingerprintOf({ type: undefined })).toBe('bilinmiyor:');
  });
});

describe('gürültü filtreleri — tarayıcıya özgü', () => {
  it('eklenti adresleri deny listesinde', () => {
    const urls = [
      'chrome-extension://abc/content.js',
      'moz-extension://abc/content.js',
      'safari-web-extension://abc/content.js',
      'https://site.com/extensions/foo.js',
    ];
    for (const url of urls) {
      expect(DENY_URLS.some((pattern) => pattern.test(url))).toBe(true);
    }
  });

  it('kendi paketimiz deny listesinde DEĞİL — kendi hatalarımızı susturmuyoruz', () => {
    const own = 'https://fxrkqn.org/fms/assets/index-abc123.js';
    expect(DENY_URLS.some((pattern) => pattern.test(own))).toBe(false);
  });

  it('ResizeObserver gürültüsünün iki metin varyantı da eleniyor', () => {
    const messages = [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications.',
    ];
    for (const message of messages) {
      expect(
        IGNORE_ERRORS.some((rule) =>
          typeof rule === 'string' ? message.includes(rule) : rule.test(message),
        ),
      ).toBe(true);
    }
  });
});

// ── ⑤ DSN BOŞSA SDK KAPALI ──────────────────────────────────────────────
describe('setupBrowserSentry — kurulum koşulları', () => {
  it('DSN boşsa SDK KURULMUYOR', () => {
    expect(setupBrowserSentry('', 'fms@test', 'private')).toBe(false);
    expect(isInitialized()).toBe(false);
  });

  it('DSN varsa KURULUYOR ve kararlar uygulanıyor', () => {
    expect(setupBrowserSentry(TEST_DSN, 'fms@test', 'private')).toBe(true);
    expect(isInitialized()).toBe(true);

    const options = getClient()?.getOptions();
    expect(options?.tracesSampleRate).toBe(0);
    expect(options?.sampleRate).toBe(1.0);

    expect(options?.release).toBe('fms@test');
    expect(options?.environment).toBe('private');
  });

  it('OTURUM entegrasyonu KALDIRILMIŞ — Karar 14 tarayıcıda da geçerli', () => {
    // ⚠️ Entegrasyonun adı sunucudakinden FARKLI (`BrowserSession` vs
    // `ProcessSession`) ve ölçülerek bulundu. Sunucudaki sabit kopyalansaydı
    // filtre sessizce hiçbir şeyi kaldırmaz, yan kanal tarayıcıda açık kalırdı.
    setupBrowserSentry(TEST_DSN, 'fms@test', 'private');
    expect(getClient()?.getIntegrationByName(SESSION_INTEGRATION)).toBeUndefined();
  });

  it('KARAR 17 — toplama politikası GERÇEKTEN uygulanıyor', () => {
    // ⚠️ `options.dataCollection`a değil, istemcinin ÇÖZÜLMÜŞ politikasına
    // bakılıyor. Ölçüldü (2.5b): `sendDefaultPii: false` ile hiçbir şey
    // vermemek aynı sonucu üretiyor ve o sonuç çerez/başlık/sorgu dizesini
    // TOPLUYOR. Yani "seçeneği verdik" demek yetmez — etkisi görülmeli.
    setupBrowserSentry(TEST_DSN, 'fms@test', 'private');
    const resolved = getClient()?.getDataCollectionOptions();

    expect(resolved?.userInfo).toBe(false);
    expect(resolved?.cookies).toBe(false);
    expect(resolved?.urlQueryParams).toBe(false);
    expect(resolved?.httpHeaders).toEqual({ request: false, response: false });
    expect(resolved?.httpBodies).toEqual([]);
  });

  it('release boşsa alan hiç KONMUYOR', () => {
    setupBrowserSentry(TEST_DSN, '', 'private');
    expect(getClient()?.getOptions().release).toBeUndefined();
  });
});
