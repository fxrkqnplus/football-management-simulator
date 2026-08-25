import {
  DataProviderError,
  DomainError,
  EngineError,
  ERROR_KINDS,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@fms/shared';
import type { EventHint } from '@sentry/node';
import { close, isInitialized } from '@sentry/node';
import { afterEach, describe, expect, it } from 'vitest';

import { setupSentry, shouldReport, UNREPORTED_ERROR_KINDS } from './instrument.js';

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

// ── ③ `beforeSend` FİLTRELEME ───────────────────────────────────────────
describe('shouldReport — hangi hata Sentry’ye GİTMEZ (Karar 4)', () => {
  it('ValidationError GÖNDERİLMEZ — kullanıcı hatası', () => {
    expect(shouldReport(hintFor(new ValidationError({ code: 'a.b', message: 'm' })))).toBe(false);
  });

  it('DomainError GÖNDERİLMEZ — kullanıcı hatası', () => {
    expect(shouldReport(hintFor(new DomainError({ code: 'a.b', message: 'm' })))).toBe(false);
  });

  it('EngineError GÖNDERİLİR — değişmez kırıldı, bizim hatamız', () => {
    expect(shouldReport(hintFor(new EngineError({ code: 'a.b', message: 'm' })))).toBe(true);
  });

  it('DataProviderError GÖNDERİLİR — yukarı akış düştü', () => {
    expect(shouldReport(hintFor(new DataProviderError({ code: 'a.b', message: 'm' })))).toBe(true);
  });

  it('NotFoundError ve ForbiddenError GÖNDERİLİR — 4xx ama bakmak isteriz', () => {
    // Bilinçli: beklenmedik bir 404/403 çoğu zaman yönlendirme veya yetki
    // hatasının belirtisi. Listenin dar tutulmasının sebebi bu.
    expect(shouldReport(hintFor(new NotFoundError({ code: 'a.b', message: 'm' })))).toBe(true);
    expect(shouldReport(hintFor(new ForbiddenError({ code: 'a.b', message: 'm' })))).toBe(true);
  });

  it('bizim olmayan hatalar GÖNDERİLİR', () => {
    expect(shouldReport(hintFor(new TypeError('beklenmedik')))).toBe(true);
    expect(shouldReport(hintFor('düz dizge'))).toBe(true);
    expect(shouldReport(hintFor(null))).toBe(true);
  });

  it('hint hiç yoksa GÖNDERİLİR — bilinmeyen olayı susturmuyoruz', () => {
    expect(shouldReport(undefined)).toBe(true);
    expect(shouldReport({})).toBe(true);
  });

  it('susturulan liste GEÇERLİ ErrorKind değerlerinden oluşuyor', () => {
    // Liste bir gün elle düzenlenip yazım hatası yapılırsa filtre sessizce
    // hiçbir şeyi susturmaz hâle gelirdi — belirtisi olmayan bir bozulma.
    const known = Object.values(ERROR_KINDS);
    for (const kind of UNREPORTED_ERROR_KINDS) {
      expect(known).toContain(kind);
    }
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

  it('DSN varsa ve env geçerliyse SDK KURULUYOR', () => {
    expect(setupSentry({ ...VALID_ENV, SENTRY_DSN: 'https://anahtar@o0.ingest.sentry.io/1' })).toBe(
      true,
    );
    expect(isInitialized()).toBe(true);
  });
});
