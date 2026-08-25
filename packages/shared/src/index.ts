/**
 * `@fms/shared` — İZOMORFİK kök giriş.
 *
 * Bu paket hiçbir şeye bağımlı değildir (bkz. CLAUDE.md §2.4 katman kuralları).
 *
 * ⚠️ BU GİRİŞTEN ÜÇÜNCÜ TARAF PAKET SIZDIRILMAZ.
 * Buradan dışa aktarılan her şey **hem tarayıcıda hem motorda** çalışmalıdır.
 * Motor (K3) ve tarayıcı (K1) bu girişi paylaşıyor; buraya `zod` gibi bir
 * bağımlılığı çeken bir modül eklenirse, o bağımlılık **ikisine birden** bulaşır.
 *
 * Ölçülmüş örnek (Faz 2.1): `env.ts` bu barrel'dan dışa aktarılırken
 * `import { EngineError } from '@fms/shared'` yazan motor, `env.js` üzerinden
 * **Zod'u da yüklüyordu**. K3 ihlali değildi (yan etki yok) ama Faz 1 hata
 * #11'in aynı sınıfıydı — orada tarayıcı yönünde, orada motor yönünde.
 * Çözüm: `env` 2.2a'da `@fms/shared/server` alt yoluna taşındı ve bu giriş
 * yeniden bağımlılıksız hâle geldi.
 *
 * **Sunucuya özgü olan her şey → `@fms/shared/server`.**
 */
export type { AppPath, BasePathConfig } from './base-path.js';
export {
  apiPath,
  basePath,
  basePathConfig,
  configureBasePath,
  DEFAULT_BASE_PATH,
  deriveBasePathConfig,
  joinBasePath,
  normalizeBasePath,
  resetBasePathForTests,
} from './base-path.js';
export {
  CORRELATION_HEADER,
  createCorrelationId,
  isAcceptableCorrelationId,
  isCorrelationId,
  truncateForLog,
} from './correlation.js';
export type {
  AppErrorOptions,
  ErrorContext,
  ErrorContextValue,
  ErrorKind,
  SerializedAppError,
  SerializedCause,
} from './errors.js';
export {
  AppError,
  DataProviderError,
  DomainError,
  EngineError,
  ERROR_KINDS,
  ForbiddenError,
  isAppError,
  isUserFaultError,
  NotFoundError,
  USER_FAULT_ERROR_KINDS,
  ValidationError,
} from './errors.js';
export type { EventThrottle } from './event-throttle.js';
export {
  createEventThrottle,
  DEFAULT_THROTTLE_WINDOW_MS,
  MAX_TRACKED_FINGERPRINTS,
} from './event-throttle.js';
export type { LogContextEnvelope, LogContextEnvelopeValue } from './log-context.js';
export {
  LOG_CONTEXT_ENVELOPE_VERSION,
  serializeLogContext,
  toLogContextEnvelope,
} from './log-context.js';
export type { LogContext, LogFormat, Logger, LogLevel, LogMethod, LogValue } from './logger.js';
export { createNoopLogger, LOG_FORMATS, LOG_LEVELS, normalizeLogArgs } from './logger.js';
export { isSensitiveKey, redactContext, REDACTED, SENSITIVE_KEY_PATTERNS } from './redact.js';
export type { TelemetryCollectBehavior, TelemetryDataCollection } from './telemetry-policy.js';
export { TELEMETRY_DATA_COLLECTION } from './telemetry-policy.js';
