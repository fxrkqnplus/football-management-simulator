import type { ErrorContextValue } from './errors.js';

/**
 * Logger ARAYÜZÜ — izomorfik (K8).
 *
 * ⚠️ BURADA UYGULAMA YOK, YALNIZCA SÖZLEŞME VAR. Bu bilinçli:
 *   • Sunucu uygulaması (pino) `@fms/shared/server` altında — Node'a bağlı.
 *   • Tarayıcı uygulaması `apps/web/src/lib/logger.ts` içinde — `console`'a bağlı.
 *   • Motor (K3) **hiçbirini** alamaz: `arch:check` kısıtlı alt yol kuralı onu
 *     `server` girişinden men ediyor, `console` da ESLint'te yasak.
 *
 * **Motor neden loglamaz:** log yazmak bir yan etkidir; K3 motorun yan etki
 * üretmesini yasaklıyor. Motor `debugTrace` **döndürür**, çağıran taraf onu
 * `correlationId` ile ilişkilendirip loglar (`docs/spec/09` §11.1/§11.2).
 * Bu arayüzün kökte durması zararsız — tip tek başına bir logger vermiyor.
 *
 * K8: `console.*` her yerde yasak. Tek istisna tarayıcı uygulamasının kendisi
 * ve o dosya tek satırlık, gerekçeli bir `eslint-disable` taşır.
 */

/** Log eşikleri — pino ile aynı sıralama, en yüksekten en düşüğe. */
export const LOG_LEVELS = {
  fatal: 'fatal',
  error: 'error',
  warn: 'warn',
  info: 'info',
  debug: 'debug',
  trace: 'trace',
} as const;

export type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];

/**
 * Çıktı biçimi.
 *
 * ⚠️ `NODE_ENV` KOKLANMAZ. Faz 1 hata #9/#10'un dersi: Vite derleme sırasında
 * `process.env.NODE_ENV`'i kendisi değiştiriyordu ve ona bakan kapı yanlış
 * şeyi ölçüyordu. Biçim kararı **açık bir bayrakla** (`LOG_FORMAT`) verilir,
 * ortamdan çıkarsanmaz.
 */
export const LOG_FORMATS = {
  /** Üretim varsayılanı: tek satır JSON, makine okur. */
  json: 'json',
  /** Geliştirme: `pino-pretty` ile renkli, insan okur. */
  pretty: 'pretty',
} as const;

export type LogFormat = (typeof LOG_FORMATS)[keyof typeof LOG_FORMATS];

/**
 * Log bağlamında durabilecek değerler.
 *
 * `ErrorContextValue`'yu yeniden kullanıyor (JSON-güvenli ilkeller + sığ dizi),
 * üstüne yalnızca `Error` ekliyor. Gerekçe 2.1'dekiyle aynı: bu veri loglara ve
 * Sentry'ye gidiyor, iç içe nesneye izin vermek "bütün istek gövdesini logla"
 * alışkanlığını mümkün kılar. `Error` istisnası zorunlu — 2.4'teki exception
 * filter hatayı loglayacak.
 */
export type LogValue = ErrorContextValue | Error;

export type LogContext = Readonly<Record<string, LogValue>>;

/**
 * Bir log seviyesi çağrısı.
 *
 * İki biçim de kabul edilir. Yalnızca mesaj yazmak mümkün olmasaydı her basit
 * satır `logger.info({}, '…')` olurdu; o sürtünme insanları `console`'a geri
 * iter ve K8 kâğıt üstünde kalırdı.
 */
export interface LogMethod {
  (message: string): void;
  (context: LogContext, message: string): void;
}

/**
 * Uygulamanın tek loglama sözleşmesi.
 *
 * `child()` gözlemlenebilirlik zincirinin taşıyıcısı: middleware istek başına
 * `logger.child({ correlationId })` üretir ve o zincirdeki her satır kimliği
 * otomatik taşır (`docs/spec/09` §11.1). 2.3'te `AsyncLocalStorage` ile bağlanacak.
 */
export interface Logger {
  readonly level: LogLevel;
  readonly fatal: LogMethod;
  readonly error: LogMethod;
  readonly warn: LogMethod;
  readonly info: LogMethod;
  readonly debug: LogMethod;
  readonly trace: LogMethod;
  /** Verilen bağlamı kalıcı olarak taşıyan yeni bir logger. */
  child(bindings: LogContext): Logger;
}

/**
 * Hiçbir şey yazmayan logger.
 *
 * Testlerde ve loglamanın istenmediği bağlamlarda kullanılır. `null` geçirip
 * her çağrı yerinde kontrol etmekten iyidir: çağıran taraf koşulsuz
 * `logger.info(...)` yazar.
 */
export function createNoopLogger(level: LogLevel = LOG_LEVELS.info): Logger {
  const noop: LogMethod = () => {
    // bilerek boş
  };
  const logger: Logger = {
    level,
    fatal: noop,
    error: noop,
    warn: noop,
    info: noop,
    debug: noop,
    trace: noop,
    child: () => logger,
  };
  return logger;
}

/**
 * `LogMethod`'un iki biçimini tek bir şekle indirger.
 *
 * Uygulamaların (pino ve tarayıcı) ikisi de aynı ayrıştırmaya ihtiyaç duyuyor;
 * burada bir kez yazılıyor ki ikisi ayrışmasın.
 */
export function normalizeLogArgs(
  first: LogContext | string,
  second?: string,
): { context: LogContext; message: string } {
  if (typeof first === 'string') return { context: {}, message: first };
  return { context: first, message: second ?? '' };
}
