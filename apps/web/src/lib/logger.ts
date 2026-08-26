/* eslint-disable no-console --
 * K8'İN TEK MEŞRU İSTİSNASI — bu dosya.
 *
 * K8 `console.*` kullanımını her yerde yasaklıyor ve gerekçesi doğru: yapısal
 * olmayan, `correlationId` taşımayan, filtrelenemeyen log satırları hata ayıklamayı
 * çökertir. Ama kural bir yerde kırılmak zorunda: tarayıcıda logger'ın kendisi
 * sonunda bir şeye yazmalı ve orada tek seçenek `console`.
 *
 * İstisna dosya bazında, tek satırlık ve gerekçeli. Kural GLOBAL kalıyor;
 * `apps/web` içindeki başka hiçbir dosya `console` çağıramaz — çağırırsa lint
 * kırar. Aranan şey buydu: kaçış deliği değil, işaretlenmiş tek kapı.
 */
import {
  LOG_LEVELS,
  type LogContext,
  type Logger,
  type LogLevel,
  type LogMethod,
  normalizeLogArgs,
  redactContext,
} from '@fms/shared';

import { publishLogEntry } from './log-buffer.js';

/**
 * Derleme zamanında Vite tarafından yerine konur (`vite.config.ts` `define`).
 * `NODE_ENV` KOKLANMIYOR — 2.6/2.7'deki aynı desen.
 */
declare const __FMS_DEV__: boolean;

/**
 * `Logger` arayüzünün tarayıcı uygulaması.
 *
 * Sunucu tarafı pino kullanıyor (`@fms/shared/server`); bu dosya aynı arayüzü
 * `console` üzerinde uyguluyor. İki uygulamanın **tek ortak noktası arayüz**:
 * pino tarayıcıya hiç girmiyor (2.2a'da ölçülen sınır) ve `console` sunucuya
 * hiç girmiyor.
 *
 * Redaksiyon paylaşılıyor: `redactContext` izomorfik olduğu için tarayıcı da
 * sunucu da **aynı** kuralı uyguluyor. İki kopya yazılsaydı kaçınılmaz olarak
 * ayrışırdı (`docs/spec/09` §11.5).
 */

/** Eşik karşılaştırması için sayısal ağırlık — pino ile aynı sıralama. */
const LEVEL_WEIGHT: Readonly<Record<LogLevel, number>> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

type ConsoleWriter = (message: string, context: Record<string, unknown>) => void;

const WRITERS: Readonly<Record<LogLevel, ConsoleWriter>> = {
  trace: (m, c) => {
    console.debug(m, c);
  },
  debug: (m, c) => {
    console.debug(m, c);
  },
  info: (m, c) => {
    console.info(m, c);
  },
  warn: (m, c) => {
    console.warn(m, c);
  },
  error: (m, c) => {
    console.error(m, c);
  },
  fatal: (m, c) => {
    console.error(m, c);
  },
};

export interface BrowserLoggerOptions {
  readonly level: LogLevel;
  /** Her satıra eklenecek sabit alanlar. 2.3'te `correlationId` buraya girecek. */
  readonly bindings?: LogContext;
}

export function createBrowserLogger(options: BrowserLoggerOptions): Logger {
  const bindings = options.bindings ?? {};
  const threshold = LEVEL_WEIGHT[options.level];

  const method = (level: LogLevel): LogMethod => {
    const write = (first: LogContext | string, second?: string): void => {
      if (LEVEL_WEIGHT[level] < threshold) return;
      const { context, message } = normalizeLogArgs(first, second);
      const redacted = redactContext({ ...bindings, ...context });
      WRITERS[level](message, redacted);

      // ⚠️ HATA AYIKLAMA PANELİ YAYINI — YALNIZCA GELİŞTİRME (2.8).
      // `__FMS_DEV__` derleme zamanı sabiti; üretimde dal ölüyor,
      // `publishLogEntry` kullanılmaz hale geliyor ve ağaç sarsma
      // `log-buffer.js`'i paketten tamamen siliyor (paket ölçümüyle doğrulanır).
      //
      // Yayınlanan bağlam **redakte edilmiş** olan: panel bu satırları ekrana
      // basıyor ve ham bağlam yayınlansaydı redaksiyon (2.2b) delinirdi.
      if (__FMS_DEV__) {
        publishLogEntry({ at: Date.now(), level, message, context: redacted });
      }
    };
    return write;
  };

  const logger: Logger = {
    level: options.level,
    fatal: method(LOG_LEVELS.fatal),
    error: method(LOG_LEVELS.error),
    warn: method(LOG_LEVELS.warn),
    info: method(LOG_LEVELS.info),
    debug: method(LOG_LEVELS.debug),
    trace: method(LOG_LEVELS.trace),
    child: (extra: LogContext): Logger =>
      createBrowserLogger({ level: options.level, bindings: { ...bindings, ...extra } }),
  };

  return logger;
}
