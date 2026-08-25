import {
  apiPath,
  type AppPath,
  CORRELATION_HEADER,
  createCorrelationId,
  DomainError,
  type Logger,
} from '@fms/shared';

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
    throw new DomainError({
      code: 'api.networkError',
      message: `API isteği ağ katmanında düştü: ${method} ${url}`,
      context: { method, url, correlationId },
      cause,
    });
  }

  const serverCorrelationId = response.headers.get(CORRELATION_HEADER);

  if (serverCorrelationId !== null && serverCorrelationId !== correlationId) {
    // Zincir koptu ama istek çalıştı. Uyarı basılır, iş düşürülmez —
    // 2.3a'daki geçersiz başlık kararının istemci tarafındaki aynadaki hâli.
    logger.warn(
      { code: 'api.correlationMismatch', sent: correlationId, received: serverCorrelationId },
      'Sunucu farklı bir correlationId döndürdü — zincir kopuk',
    );
  }

  if (!response.ok) {
    logger.error(
      { code: 'api.requestFailed', method, url, status: response.status },
      'API isteği başarısız döndü',
    );
    throw new DomainError({
      code: 'api.requestFailed',
      message: `API ${String(response.status)} döndü: ${method} ${url}`,
      context: { method, url, status: response.status, correlationId },
    });
  }

  const data = (await response.json()) as T;
  logger.info({ code: 'api.response', method, url, status: response.status }, 'API yanıtı alındı');

  return { data, correlationId, serverCorrelationId };
}
