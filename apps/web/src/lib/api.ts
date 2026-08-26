import {
  apiPath,
  type AppError,
  type AppPath,
  assertInvariant,
  CORRELATION_HEADER,
  createCorrelationId,
  DataProviderError,
  DomainError,
  ERROR_KINDS,
  type ErrorContext,
  type Logger,
} from '@fms/shared';
import { captureException } from '@sentry/react';

import { rememberCorrelationId } from './correlation-context.js';
import { createBrowserLogger } from './logger.js';

/**
 * Tarayıcı → sunucu `correlationId` zincirinin BAŞLADIĞI yer — `spec/09` §11.1.
 *
 * Zincirin tarifi şöyle başlıyor: *"Kullanıcı tıklar → Frontend correlationId
 * üretir (uuid v7) → HTTP başlığı: X-Correlation-Id"*. 2.3a sunucu yarısını
 * kurdu (middleware, ALS, gidiş-dönüş); burası **istemci yarısı**.
 *
 * ── NEDEN HER `fetch` BURADAN GEÇMELİ ────────────────────────────────────
 * Çıplak `fetch` çağrısı başlık koymaz ve zincir **sessizce** kopar: istek
 * çalışır, sunucu kendi kimliğini üretir, iki taraftaki loglar birbirine
 * bağlanamaz. Kopukluğun belirtisi yok — bu yüzden tek kapı gerekiyor.
 * (Faz 5+'ta bir ESLint kuralı doğrudan `fetch` kullanımını yasaklayabilir;
 * bugün kapı var ama zorlayıcı değil.)
 *
 * ── LOGGER İLK KEZ BURADA KULLANILIYOR ───────────────────────────────────
 * `createBrowserLogger` 2.2b'de yazıldı ve test edildi ama **hiçbir yerden
 * import edilmiyordu**; ağaç sarsma onu üretim paketinden tamamen siliyordu
 * (günlük #19). Bu dosya onu gerçekten çağırıyor, yani paket bugün büyüyecek
 * — beklenen ve ölçülen bir artış.
 */

/** Modül düzeyi kök logger. İstek başına `child()` ile kimlik bağlanır. */
const baseLogger: Logger = createBrowserLogger({ level: 'info' });

/**
 * HTTP durumuna göre hata sınıfı seçer.
 *
 * ⚠️ 2.5b'DE DÜZELTİLDİ — 2.3b'de her başarısız yanıt `DomainError` oluyordu
 * ve o **yanlış modellemeydi**: `DomainError` bir **iş kuralı ihlalidir**
 * ("bütçen yetmiyor"), yani kullanıcı hatası. Sunucudan gelen bir **500** ise
 * kullanıcı hatası değil, sistem arızasıdır.
 *
 * Hata 2.5b'de filtreleme kuralı yazılırken ortaya çıktı: `USER_FAULT_ERROR_KINDS`
 * `domain`'i susturuyor, dolayısıyla **her 500 sessizce Sentry'den düşerdi**.
 * Belirtisi olmayan bir kayıp — hata izleme kurulu görünür, en önemli olayları
 * hiç görmezdi.
 *
 * Tarayıcı açısından API bir **yukarı akış veri kaynağıdır**; ulaşılamaması ya
 * da 5xx dönmesi tam olarak `DataProviderError`ın tarifi ("dış veri kaynağı
 * beklenen cevabı vermedi, genellikle yeniden denenebilir").
 */
function failureFor(
  status: number | undefined,
  options: { code: string; message: string; context: ErrorContext; cause?: unknown },
): AppError {
  const isUpstreamFault = status === undefined || status >= 500;
  const construct = isUpstreamFault ? DataProviderError : DomainError;
  return options.cause === undefined
    ? new construct({ code: options.code, message: options.message, context: options.context })
    : new construct({
        code: options.code,
        message: options.message,
        context: options.context,
        cause: options.cause,
      });
}

/**
 * Hatayı Sentry'ye kimlikli olarak bildirir.
 *
 * ⚠️ TARAYICI ZİNCİRİNİN SENTRY UCU. `spec/09` §11.1 zinciri *"Hata olursa
 * Sentry'ye id ile gider"* diyor; sunucu tarafında bunu exception filter
 * yapıyor (2.4), istemcide burası.
 *
 * Etiket şekli sunucudakiyle BİREBİR aynı (`correlationId`, `errorKind`,
 * `errorCode`) — böylece Sentry'de tek bir arama iki tarafı da getiriyor.
 *
 * Neyin gönderilmeyeceğine burada karar VERİLMİYOR: `beforeSend`
 * (`lib/sentry.ts`) tek karar noktası. İkinci bir filtre kurmak iki karar
 * noktası üretirdi ve ayrışırlardı (SAPMA-013).
 */
function reportToSentry(error: AppError, correlationId: string): void {
  captureException(error, {
    tags: { correlationId, errorKind: error.kind, errorCode: error.code },
  });
}

export interface ApiRequestResult<T> {
  readonly data: T;
  /** Bu istek için ÜRETTİĞİMİZ kimlik. Sunucu logunda aranacak değer budur. */
  readonly correlationId: string;
  /**
   * Sunucunun yanıt başlığında geri verdiği kimlik.
   *
   * Neden ayrı alan: zincirin kapandığının **kanıtı** budur. `null` ise
   * sunucu başlığı hiç yazmamış (eski sürüm veya araya giren vekil);
   * farklıysa gönderdiğimiz kimlik kabul edilmemiş demektir.
   */
  readonly serverCorrelationId: string | null;
}

/**
 * API'ye kimlikli istek gönderir.
 *
 * ⚠️ Yol **sabit kodlanmaz** (K6): `apiPath()` alt yolu ve `/api` ön ekini
 * tek kaynaktan üretir. Burada `/api/...` yazmak `/fms` dağıtımında kırılırdı.
 *
 * @param path API'ye göreli yol — `/health`, `/api/health` DEĞİL.
 * @throws {DomainError} yanıt `2xx` değilse. Hata gövdesinin tipli ayrıştırması
 *   ve Türkçe kullanıcı mesajı 2.4'teki exception filter ile birlikte gelecek;
 *   bugün sözleşme `code` + `context` (SAPMA-010).
 */
export async function apiRequest<T>(
  path: AppPath,
  init: RequestInit = {},
): Promise<ApiRequestResult<T>> {
  const correlationId = createCorrelationId();
  // Karar 19 — bir render hatası olursa "Hata bildir" bu kimliği taşıyacak.
  // Çökme çoğu zaman başarısız bir isteğin ARDINDAN gelir; ikisini bağlayan
  // tek şey bu satır.
  rememberCorrelationId(correlationId);
  const url = apiPath(path);
  const method = init.method ?? 'GET';

  const headers = new Headers(init.headers);
  headers.set(CORRELATION_HEADER, correlationId);

  // Zincirdeki HER satır kimliği taşısın diye istek başına child logger.
  const logger = baseLogger.child({ correlationId });
  logger.info({ code: 'api.request', method, url }, 'API isteği gönderiliyor');

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers, credentials: 'include' });
  } catch (cause: unknown) {
    // Ağ katmanı hatası: sunucuya hiç ulaşılamadı, dolayısıyla sunucu tarafında
    // eşleşecek bir log satırı YOK. Sessizce yutulmuyor — loglanıp yeniden
    // fırlatılıyor (CLAUDE.md §1.3).
    logger.error({ code: 'api.networkError', method, url }, 'API isteği ağ katmanında düştü');
    // Sunucuya HİÇ ulaşılamadı — yukarı akış arızası, kullanıcı hatası değil.
    const failure = failureFor(undefined, {
      code: 'api.networkError',
      message: `API isteği ağ katmanında düştü: ${method} ${url}`,
      context: { method, url, correlationId },
      cause,
    });
    reportToSentry(failure, correlationId);
    throw failure;
  }

  const serverCorrelationId = response.headers.get(CORRELATION_HEADER);

  /**
   * ⚠️ ZİNCİR DEĞİŞMEZİ — Faz 2.7'de `logger.warn`dan `assertInvariant`a çevrildi.
   *
   * Denetlenen şey aynı: sunucunun geri verdiği kimlik ya yoktur ya da
   * gönderdiğimizle aynıdır. Değişen şey **kipe göre davranış**:
   *   • Geliştirme derlemesi → FIRLATIR. 2.3c bir alt görevi bu zincirin
   *     kapandığını kanıtlamaya harcadı; sessizce bozulursa çürür.
   *   • Üretim derlemesi → `logger.warn` basıp DEVAM EDER. 2.3b'nin
   *     "iş düşürülmez" kararı burada aynen geçerli — bozuk bir izleme
   *     başlığı kullanıcının işlemini düşürmemeli.
   *
   * Karar iptal edilmedi, KAPSAMI DARALTILDI (SAPMA-018).
   *
   * `kind: dataProvider` bilinçli (Karar 18): bu bir **motor** değişmezi değil,
   * yukarı akışın (sunucu ya da araya giren vekil) tutarsız cevabı.
   * `engine` denseydi exception filter'ın durum kodu ve Sentry elemesi yanlış
   * yönlendirilirdi.
   *
   * Uyarıyı bu modül basmaz — bildiriciyi `main.tsx` kuruyor (2.3c deseni).
   */
  assertInvariant(serverCorrelationId === null || serverCorrelationId === correlationId, {
    code: 'api.correlationMismatch',
    message: 'Sunucu farklı bir correlationId döndürdü — zincir kopuk',
    context: {
      method,
      url,
      sent: correlationId,
      received: serverCorrelationId ?? '',
    },
    kind: ERROR_KINDS.dataProvider,
  });

  if (!response.ok) {
    logger.error(
      { code: 'api.requestFailed', method, url, status: response.status },
      'API isteği başarısız döndü',
    );
    const failure = failureFor(response.status, {
      code: 'api.requestFailed',
      message: `API ${String(response.status)} döndü: ${method} ${url}`,
      context: { method, url, status: response.status, correlationId },
    });
    reportToSentry(failure, correlationId);
    throw failure;
  }

  const data = (await response.json()) as T;
  logger.info({ code: 'api.response', method, url, status: response.status }, 'API yanıtı alındı');

  return { data, correlationId, serverCorrelationId };
}
