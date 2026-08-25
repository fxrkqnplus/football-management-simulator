import { type Logger as PinoLogger, pino } from 'pino';

import {
  LOG_FORMATS,
  type LogContext,
  type LogFormat,
  type Logger,
  type LogLevel,
  normalizeLogArgs,
} from '../logger.js';
import { redactContext } from '../redact.js';

/**
 * `Logger` arayüzünün pino uygulaması — YALNIZCA SUNUCU.
 *
 * ⚠️ Bu dosya `@fms/shared/server` altında olduğu için `apps/web`, `packages/ui`
 * ve `packages/engine` onu göremez (`arch:check` `restricted-subpath`).
 * Sınırın gerçekten çalıştığı 2.2a'da ölçüldü: `sideEffects: false` ve tsconfig
 * `types: []` bu sızıntıyı **engellemiyordu**, tek yapısal bekçi `arch:check`.
 *
 * ── REDAKSİYON NEDEN pino'nun `redact` SEÇENEĞİYLE DEĞİL ─────────────────
 * pino'nun kendi `redact` seçeneği **tam yol** sözdizimi ister
 * (`req.headers.authorization`). Bizim kuralımız anahtar adında **alt dize**
 * araması ve bağlam anahtarları önceden bilinmiyor — pino'nun sözdizimi bunu
 * ifade edemez. Ayrıca aynı redaksiyonu tarayıcı logger'ı da kullanmak zorunda;
 * pino'ya bağlarsak iki uygulama ayrışır. Bu yüzden redaksiyon pino'ya
 * verilmeden ÖNCE, izomorfik `redactContext()` ile uygulanıyor.
 */

export interface ServerLoggerOptions {
  readonly level: LogLevel;
  /** `NODE_ENV` KOKLANMAZ — biçim açık bayrakla gelir (Faz 1 hata #10). */
  readonly format: LogFormat;
  /** Kök logger adı; her satırda `name` alanı olarak görünür. */
  readonly name?: string;
  /** Her satıra eklenecek sabit alanlar (`service`, `version`…). */
  readonly base?: LogContext;
}

/** `AppError` gibi kendi serileştirmesini taşıyan hatalar. */
type SelfSerializingError = Error & { toJSON: () => Record<string, unknown> };

function hasToJson(value: Error): value is SelfSerializingError {
  return typeof (value as { toJSON?: unknown }).toJSON === 'function';
}

/** pino satırlarında `Error` alanları için kullanılan serileştirici. */
function serializeValue(value: unknown): unknown {
  if (value instanceof Error) {
    // AppError kendi `toJSON()`unu taşıyor (mesajı ve `code`u korur; düz bir
    // Error `JSON.stringify` ile boşalır — 2.1'de ölçüldü). Düz hatalar için
    // en azından ad + mesaj + yığın izi çıkarılır.
    const serialized: Record<string, unknown> = hasToJson(value)
      ? { ...value.toJSON() }
      : { name: value.name, message: value.message };
    // Yığın izi YALNIZCA logda taşınır; `AppError.toJSON()` onu bilerek
    // dışarıda bırakıyor çünkü aynı çıktı HTTP gövdesine de girebiliyor.
    serialized['stack'] = value.stack;
    return serialized;
  }
  return value;
}

function prepare(context: LogContext): Record<string, unknown> {
  const redacted = redactContext(context);
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(redacted)) {
    output[key] = serializeValue(value);
  }
  return output;
}

/** pino örneğini `Logger` arayüzüne sarar. */
function wrap(instance: PinoLogger, level: LogLevel): Logger {
  const method =
    (fn: (obj: Record<string, unknown>, msg: string) => void) =>
    (first: LogContext | string, second?: string): void => {
      const { context, message } = normalizeLogArgs(first, second);
      fn(prepare(context), message);
    };

  return {
    level,
    fatal: method((o, m) => {
      instance.fatal(o, m);
    }),
    error: method((o, m) => {
      instance.error(o, m);
    }),
    warn: method((o, m) => {
      instance.warn(o, m);
    }),
    info: method((o, m) => {
      instance.info(o, m);
    }),
    debug: method((o, m) => {
      instance.debug(o, m);
    }),
    trace: method((o, m) => {
      instance.trace(o, m);
    }),
    child: (bindings: LogContext): Logger => wrap(instance.child(prepare(bindings)), level),
  };
}

/**
 * Sunucu logger'ı kurar.
 *
 * @param destination Testler için yazılabilir hedef. Verilmezse pino kendi
 *   varsayılanına (stdout) yazar — bu, K8'in `process.stdout.write` yasağını
 *   ihlal etmez çünkü yazan biz değil, kütüphanenin kendisi.
 */
export function createServerLogger(
  options: ServerLoggerOptions,
  destination?: NodeJS.WritableStream,
): Logger {
  const base = options.base === undefined ? undefined : prepare(options.base);

  // `pretty` bilinçli olarak SESSİZCE JSON'a düşmez: `pino-pretty` kurulu
  // değilse pino açılışta yüksek sesle hata verir. Sessiz düşüş, bu projenin
  // tekrar tekrar kapattığı hata sınıfının ta kendisi (Faz 1 hata #8).
  const transport =
    options.format === LOG_FORMATS.pretty
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' } }
      : undefined;

  const pinoOptions = {
    level: options.level,
    ...(options.name === undefined ? {} : { name: options.name }),
    ...(base === undefined ? {} : { base }),
    ...(transport === undefined ? {} : { transport }),
  };

  const instance = destination === undefined ? pino(pinoOptions) : pino(pinoOptions, destination);
  return wrap(instance, options.level);
}
