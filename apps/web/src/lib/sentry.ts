import { createEventThrottle, isUserFaultError, TELEMETRY_DATA_COLLECTION } from '@fms/shared';
import type { ErrorEvent, EventHint } from '@sentry/react';
import { init } from '@sentry/react';

/**
 * Tarayıcı Sentry kurulumu — `docs/ROADMAP.md` Faz 2 madde 2.5b.
 *
 * Sunucu tarafı `apps/api/src/instrument.ts`. İki dosyanın **ortak kararları
 * kopyalanmıyor**, `@fms/shared`'dan geliyor (`isUserFaultError`,
 * `createEventThrottle`): `apps/web` `apps/api`'yi import edemez (CLAUDE.md
 * §2.4) ve iki kopya kaçınılmaz olarak ayrışırdı (SAPMA-013).
 *
 * ── SUNUCUDAN AYRILAN YAN: GÜRÜLTÜ FİLTRELERİ ────────────────────────────
 * `denyUrls` ve `ignoreErrors` **yalnızca tarayıcıda** var ve bu doğru:
 * ikisi de tarayıcı ortamına özgü kirliliği eliyor (eklentiler, düzen
 * motorunun kendi uyarıları). Sunucuda karşılıkları yok, olsaydı ölü
 * yapılandırma olurdu.
 *
 * ── `--import` KISITI BURADA YOK ─────────────────────────────────────────
 * Risk R1 (ESM import yükseltmesi) sunucuya özgüydü: orada SDK, Node'un
 * modül yükleyicisini enstrümante ediyor ve geç kalırsa sessizce eksik
 * kalıyordu. Tarayıcı SDK'sı böyle bir yükleyici kancası kurmuyor; `main.tsx`
 * içinde, React ağacı kurulmadan **önce** çağrılması yeterli.
 */

/** Derleme zamanında Vite tarafından yerine konur (`vite.config.ts` `define`). */
declare const __FMS_SENTRY_DSN__: string;
declare const __FMS_SENTRY_RELEASE__: string;
declare const __FMS_SERVER_MODE__: string;

/**
 * Kaldırılan varsayılan entegrasyonun adı — oturum (release health) zarfını yayan.
 *
 * ⚠️ SUNUCUDAKİNDEN FARKLI OLABİLİR ve bu yüzden **ölçüldü**, varsayılmadı.
 * Node SDK'sında entegrasyonun adı `ProcessSession`; tarayıcı SDK'sında
 * `BrowserSession`. Aynı işi yapan iki farklı ad — sunucudaki sabiti buraya
 * kopyalasaydık filtre **sessizce hiçbir şeyi kaldırmaz** ve Karar 14 yalnızca
 * sunucuda geçerli olurdu.
 */
export const SESSION_INTEGRATION = 'BrowserSession';

/**
 * Tarayıcı ortamına özgü gürültü — bu adreslerden gelen hata Sentry'ye gitmez.
 *
 * Eklenti kodu bizim kodumuz değil ve düzeltemeyeceğimiz hatalar üretiyor;
 * kotayı (5.000 olay/ay, `spec/10` §13.5) yakmaları saf kayıp olurdu.
 */
export const DENY_URLS: readonly RegExp[] = [
  /extensions\//i,
  /^chrome:\/\//i,
  /^chrome-extension:\/\//i,
  /^moz-extension:\/\//i,
  /^safari-(web-)?extension:\/\//i,
];

/**
 * Mesajına bakılarak elenen hatalar.
 *
 * `ResizeObserver loop…` bir **tarayıcı uyarısıdır, hata değil**: düzen
 * motoru bir kareyi atladığında üretilir, kullanıcı hiçbir şey fark etmez ve
 * düzeltilecek bir şey yoktur. Sentry'de ilk sıraya yerleşip gerçek hataları
 * gizlemesiyle bilinir. İki metin varyantı da tarayıcıya göre değişiyor.
 */
export const IGNORE_ERRORS: readonly (string | RegExp)[] = [
  /ResizeObserver loop limit exceeded/,
  /ResizeObserver loop completed with undelivered notifications/,
];

/**
 * Olay kısıtlayıcı — Karar 4'ün son maddesi.
 *
 * ⚠️ TARAYICIDA SUNUCUDAN DAHA AKUT. Bir render döngüsü veya kısır bir
 * `useEffect` saniyede yüzlerce özdeş hata üretebilir; aylık kotanın tamamı
 * dakikalar içinde yanar ve gerçek arızalar görünmez olur.
 */
const throttle = createEventThrottle();

/** Bir olayın parmak izi — hata tipi + mesajı (sunucudakiyle aynı kural). */
export function fingerprintOf(event: ErrorEvent): string {
  const first = event.exception?.values?.[0];
  return `${first?.type ?? 'bilinmiyor'}:${first?.value ?? ''}`;
}

/**
 * Bir olay Sentry'ye gönderilmeli mi?
 *
 * Sunucudaki `shouldReport` ile **aynı iki eleme, aynı sırayla**:
 *   ① kullanıcı hatası → hiç gönderilmez, kısıtlayıcıya uğramaz
 *   ② kısıtlama → aynı parmak izi pencere içinde zaten gittiyse düşürülür
 *
 * Dışa aktarılıyor çünkü `beforeSend` kapanışta saklı kalsaydı sınanamazdı
 * (`spec/09` §11.5).
 */
export function shouldReport(event: ErrorEvent, hint: EventHint | undefined, now: number): boolean {
  if (isUserFaultError(hint?.originalException)) return false;
  return throttle.shouldAllow(fingerprintOf(event), now);
}

/**
 * Sentry'yi kurar. `main.tsx`'ten, React ağacı kurulmadan önce çağrılır.
 *
 * DSN boşsa **hiç kurulmaz** — sunucudaki kararla aynı: kurulmamış bir SDK'nın
 * `captureException`ı sessiz bir no-op ve bu, "DSN yokken ağ isteği gitmiyor"
 * iddiasının en dolaysız hâli.
 *
 * @returns kurulum yapıldıysa `true`
 */
export function setupBrowserSentry(dsn: string, release: string, environment: string): boolean {
  if (dsn === '') return false;

  init({
    dsn,
    environment,
    ...(release === '' ? {} : { release }),

    // Karar 4 — kota disiplini. Performans izleme 1–5 kullanıcı için kotaya
    // değmez; ölçüm ihtiyacını 2.7'nin `measure()`ı karşılayacak.
    tracesSampleRate: 0,
    sampleRate: 1.0,
    // Karar 17 — açık toplama politikası, `sendDefaultPii` DEĞİL.
    // Gerekçe ve ölçüm: `@fms/shared/src/telemetry-policy.ts`.
    dataCollection: { ...TELEMETRY_DATA_COLLECTION, httpBodies: [] },

    // Karar 14 — oturum (release health) zarfı istenmedi. 2.5a'da sunucuda
    // ölçüldü: `release` ayarlıyken SDK hata zarfının yanında bir `session`
    // zarfı daha yolluyor.
    integrations: (defaults) =>
      defaults.filter((integration) => integration.name !== SESSION_INTEGRATION),

    denyUrls: [...DENY_URLS],
    ignoreErrors: [...IGNORE_ERRORS],

    beforeSend: (event: ErrorEvent, hint: EventHint): ErrorEvent | null =>
      shouldReport(event, hint, Date.now()) ? event : null,
  });

  return true;
}

/** `main.tsx`'in çağırdığı sarmalayıcı — derleme zamanı sabitlerini okur. */
export function setupBrowserSentryFromBuild(): boolean {
  return setupBrowserSentry(__FMS_SENTRY_DSN__, __FMS_SENTRY_RELEASE__, __FMS_SERVER_MODE__);
}
