import {
  DataProviderError,
  DEFAULT_THROTTLE_WINDOW_MS,
  DomainError,
  EngineError,
  ERROR_KINDS,
  ForbiddenError,
  NotFoundError,
  USER_FAULT_ERROR_KINDS,
  ValidationError,
} from '@fms/shared';
import type { ErrorEvent } from '@sentry/node';
import type { EventHint } from '@sentry/node';
import { close, getClient, isInitialized } from '@sentry/node';
import { afterEach, describe, expect, it } from 'vitest';

import { fingerprintOf, setupSentry, shouldReport } from './instrument.js';

/**
 * Sentry enstrümantasyonu testleri — Faz 2 madde 2.5a.
 *
 * Burada sınanan iki iddia var:
 *   ① `beforeSend` kuralı doğru mu (hangi hata gönderilmez)
 *   ② DSN boşken veya env geçersizken SDK **hiç kurulmuyor** mu
 *
 * `beforeSend`in kendisi bir kapanış içinde saklı olsaydı sınanamazdı; bu
 * yüzden karar `shouldReport` olarak dışa aktarıldı (`spec/09` §11.5: bir
 * kuralın kablolaması sınanabilir olmalı).
 *
 * Zarfın gerçekten `correlationId` taşıdığı ayrı dosyada, **gerçek bir
 * yakalama sunucusuna** karşı doğrulanıyor (`sentry-envelope.http.test.ts`).
 */

/** Zod'un kabul edeceği asgari geçerli ortam. */
const VALID_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  PUBLIC_BASE_PATH: '/fms',
  PUBLIC_URL: 'https://fxrkqn.org/fms',
  API_PORT: '3001',
  WEB_PORT: '3000',
  DATABASE_URL: 'postgresql://fms:pw@localhost:5432/fms',
  POSTGRES_USER: 'fms',
  POSTGRES_PASSWORD: 'pw',
  POSTGRES_DB: 'fms',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'x'.repeat(32),
  SETUP_TOKEN: 'y'.repeat(32),
  EMERGENCY_ADMIN_TOKEN: 'z'.repeat(32),
  EMAIL_FROM: 'noreply@fxrkqn.org',
  SERVER_MODE: 'private',
  DATA_MODE: 'full',
};

afterEach(async () => {
  // Kurulan istemci sonraki teste sızmasın.
  if (isInitialized()) await close(0);
});

function hintFor(error: unknown): EventHint {
  return { originalException: error };
}

/**
 * ⚠️ HER ÇAĞRI BENZERSİZ BİR PARMAK İZİ ÜRETİR.
 *
 * `shouldReport` modül düzeyinde tek bir kısıtlayıcı kullanıyor ve o durum
 * dosyadaki testler arasında **paylaşılıyor**. Aynı parmak izini iki test
 * kullansaydı ikincisi kısıtlamaya takılır ve "filtre çalışmıyor" gibi
 * görünürdü — testin kendisi kırılır, kod değil (günlük #20'nin dersi).
 */
let sequence = 0;
function eventFor(message: string): ErrorEvent {
  sequence += 1;
  return {
    type: undefined,
    exception: { values: [{ type: `Tip${String(sequence)}`, value: message }] },
  };
}

/** Kısıtlamayı devre dışı bırakacak kadar ileri bir zaman damgası. */
function freshTime(): number {
  return sequence * 60 * 60 * 1000;
}

/** Tek satırda: bu hata gönderilir mi? */
function reports(error: unknown, message = 'm'): boolean {
  return shouldReport(eventFor(message), hintFor(error), freshTime());
}

// ── ③ `beforeSend` FİLTRELEME ───────────────────────────────────────────
describe('shouldReport — hangi hata Sentry’ye GİTMEZ (Karar 4)', () => {
  it('ValidationError GÖNDERİLMEZ — kullanıcı hatası', () => {
    expect(reports(new ValidationError({ code: 'a.b', message: 'm' }))).toBe(false);
  });

  it('DomainError GÖNDERİLMEZ — kullanıcı hatası', () => {
    expect(reports(new DomainError({ code: 'a.b', message: 'm' }))).toBe(false);
  });

  it('EngineError GÖNDERİLİR — değişmez kırıldı, bizim hatamız', () => {
    expect(reports(new EngineError({ code: 'a.b', message: 'm' }))).toBe(true);
  });

  it('DataProviderError GÖNDERİLİR — yukarı akış düştü', () => {
    expect(reports(new DataProviderError({ code: 'a.b', message: 'm' }))).toBe(true);
  });

  it('NotFoundError ve ForbiddenError GÖNDERİLİR — 4xx ama bakmak isteriz', () => {
    // Bilinçli: beklenmedik bir 404/403 çoğu zaman yönlendirme veya yetki
    // hatasının belirtisi. Listenin dar tutulmasının sebebi bu.
    expect(reports(new NotFoundError({ code: 'a.b', message: 'm' }))).toBe(true);
    expect(reports(new ForbiddenError({ code: 'a.b', message: 'm' }))).toBe(true);
  });

  it('bizim olmayan hatalar GÖNDERİLİR', () => {
    expect(reports(new TypeError('beklenmedik'))).toBe(true);
    expect(reports('düz dizge')).toBe(true);
    expect(reports(null)).toBe(true);
  });

  it('hint hiç yoksa GÖNDERİLİR — bilinmeyen olayı susturmuyoruz', () => {
    expect(shouldReport(eventFor('a'), undefined, freshTime())).toBe(true);
    expect(shouldReport(eventFor('b'), {}, freshTime())).toBe(true);
  });

  it('susturulan liste GEÇERLİ ErrorKind değerlerinden oluşuyor', () => {
    // Liste bir gün elle düzenlenip yazım hatası yapılırsa filtre sessizce
    // hiçbir şeyi susturmaz hâle gelirdi — belirtisi olmayan bir bozulma.
    const known = Object.values(ERROR_KINDS);
    for (const kind of USER_FAULT_ERROR_KINDS) {
      expect(known).toContain(kind);
    }
  });
});

// ── KARAR 4 SON MADDESİ: PARMAK İZİ KISITLAMASI ─────────────────────────
describe('shouldReport — aynı parmak izi pencere içinde DÜŞÜRÜLÜR', () => {
  it('aynı hata pencere içinde ikinci kez gönderilmiyor', () => {
    const event = eventFor('döngüde tekrar eden hata');
    const hint = hintFor(new EngineError({ code: 'engine.invariant', message: 'm' }));
    const t0 = freshTime();

    expect(shouldReport(event, hint, t0)).toBe(true);
    expect(shouldReport(event, hint, t0 + 1_000)).toBe(false);
    expect(shouldReport(event, hint, t0 + 60_000)).toBe(false);
  });

  it('pencere dolunca yeniden gönderiliyor — süregelen arıza görünmez olmuyor', () => {
    const event = eventFor('süregelen arıza');
    const hint = hintFor(new EngineError({ code: 'engine.invariant', message: 'm' }));
    const t0 = freshTime();

    expect(shouldReport(event, hint, t0)).toBe(true);
    expect(shouldReport(event, hint, t0 + DEFAULT_THROTTLE_WINDOW_MS)).toBe(true);
  });

  it('FARKLI parmak izleri birbirini kısıtlamıyor', () => {
    const hint = hintFor(new EngineError({ code: 'engine.invariant', message: 'm' }));
    const t0 = freshTime();

    expect(shouldReport(eventFor('birinci'), hint, t0)).toBe(true);
    expect(shouldReport(eventFor('ikinci'), hint, t0)).toBe(true);
  });

  it('kullanıcı hatası kısıtlayıcıya UĞRAMIYOR — sıra bu yüzden önemli', () => {
    // Uğrasaydı bir kullanıcı hatası, aynı parmak izini taşıyan gerçek bir
    // arızanın penceresini işgal edebilirdi.
    const event = eventFor('aynı parmak izi');
    const t0 = freshTime();

    expect(shouldReport(event, hintFor(new DomainError({ code: 'a.b', message: 'm' })), t0)).toBe(
      false,
    );
    // Kullanıcı hatası pencereyi TUTMADI: aynı parmak izi sistem hatası olarak gelince geçiyor.
    expect(shouldReport(event, hintFor(new EngineError({ code: 'a.b', message: 'm' })), t0)).toBe(
      true,
    );
  });
});

describe('fingerprintOf', () => {
  it('tip ve mesajdan kararlı bir parmak izi üretiyor', () => {
    expect(
      fingerprintOf({
        type: undefined,
        exception: { values: [{ type: 'TypeError', value: 'x' }] },
      }),
    ).toBe('TypeError:x');
  });

  it('istisna bilgisi eksikse de bir dizge dönüyor — çökmüyor', () => {
    expect(fingerprintOf({ type: undefined })).toBe('bilinmiyor:');
  });
});

// ── ⑤ DSN BOŞSA SDK KAPALI ──────────────────────────────────────────────
describe('setupSentry — kurulum koşulları', () => {
  it('DSN boşsa SDK KURULMUYOR', () => {
    expect(setupSentry({ ...VALID_ENV, SENTRY_DSN: '' })).toBe(false);
    expect(isInitialized()).toBe(false);
  });

  it('DSN hiç yoksa SDK KURULMUYOR', () => {
    expect(setupSentry(VALID_ENV)).toBe(false);
    expect(isInitialized()).toBe(false);
  });

  it('env GEÇERSİZSE SDK kurulmuyor — ve fırlatmıyor', () => {
    // Enstrümantasyon uygulamanın açılıp açılmayacağına karar VERMEZ.
    // Fırlatsaydı `main.ts`'in biçimlendirilmiş teşhisinin yerini alırdı ve
    // CI'daki "Eksik ortam değişkeniyle API AÇILMAMALI" testi yanlış mesajı
    // görürdü.
    expect(() => setupSentry({ SENTRY_DSN: 'https://k@o.ingest.sentry.io/1' })).not.toThrow();
    expect(setupSentry({ SENTRY_DSN: 'https://k@o.ingest.sentry.io/1' })).toBe(false);
    expect(isInitialized()).toBe(false);
  });

  it('KARAR 17 — toplama politikası GERÇEKTEN uygulanıyor', () => {
    // ⚠️ Ölçüldü (2.5b): `sendDefaultPii: false` ile seçeneği hiç vermemek
    // BİREBİR aynı ve ikisi de çerez/başlık/sorgu dizesini TOPLUYOR
    // (yalnızca IP'yle ilgili birkaç anahtar eleniyor). Bu yüzden "seçeneği
    // verdik" demek yetmez, çözülmüş politikaya bakılır.
    setupSentry({ ...VALID_ENV, SENTRY_DSN: 'https://anahtar@o0.ingest.sentry.io/1' });
    const resolved = getClient()?.getDataCollectionOptions();

    expect(resolved?.userInfo).toBe(false);
    expect(resolved?.cookies).toBe(false);
    expect(resolved?.urlQueryParams).toBe(false);
    expect(resolved?.httpHeaders).toEqual({ request: false, response: false });
    expect(resolved?.httpBodies).toEqual([]);
  });

  it('DSN varsa ve env geçerliyse SDK KURULUYOR', () => {
    expect(setupSentry({ ...VALID_ENV, SENTRY_DSN: 'https://anahtar@o0.ingest.sentry.io/1' })).toBe(
      true,
    );
    expect(isInitialized()).toBe(true);
  });
});
