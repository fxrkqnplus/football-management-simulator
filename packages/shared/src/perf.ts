import { ValidationError } from './errors.js';

/**
 * Performans bütçesi sarmalayıcısı — `docs/spec/09` §11.6, Faz 2 kabul kriteri 5.
 *
 * ⚠️ İZOMORFİK AMA MOTORA YASAK (Karar 6).
 *
 * `performance.now()` hem Node 24'te hem tarayıcıda global; bu yüzden modül
 * izomorfik kök girişte durabiliyor. Ama motor onu **import EDEMEZ** ve bu
 * iki ayrı hatla zorlanıyor:
 *   ① `arch:check` → `ENGINE_FORBIDDEN_CALLS` zaten `performance.now`
 *      çağrısını motorda yasaklıyor (Faz 1.6).
 *   ② `arch:check` → `ENGINE_FORBIDDEN_SHARED_EXPORTS` `measure` adını
 *      motorda yasaklıyor (Faz 2.7). ①'in yakalayamadığını yakalar: motor
 *      `performance.now`u kendisi çağırmadan, buradan **ödünç** alabilirdi.
 *
 * **Neden motor kendini ölçemez:** ölçmek zaman okumaktır ve K3 motoru zamandan
 * arındırıyor. Aynı girdinin aynı çıktıyı vermesi (K2) ölçüme bakan bir dalın
 * olmamasını gerektirir. Ölçüm motoru **dışarıdan** sarmalar: çağıran taraf
 * `measure(…, () => engine.simulate(…))` yazar.
 *
 * ── UYARIYI BU MODÜL BASMAZ ──────────────────────────────────────────────
 * K8 gereği uyarı `logger.warn`dan geçmeli, ama bu modül `Logger`'ı bilmez —
 * `onExceeded` diye bir fonksiyon çağırır ve bağımlılığı çağıran taraf kurar
 * (2.3c deseni). `onExceeded` verilmese bile ihlal **kaybolmaz**: `exceeded`
 * bayrağı her zaman dönüş değerinde taşınır.
 */

/** Tek bir ölçümün sonucu. */
export interface Measurement<T> {
  readonly name: string;
  /** `performance.now()` farkı, milisaniye. */
  readonly durationMs: number;
  readonly budgetMs: number;
  readonly exceeded: boolean;
  /** Ölçülen fonksiyonun dönüş değeri — ölçüm çağrıyı yutmaz. */
  readonly value: T;
}

/** Bütçe aşımını bildiren fonksiyon. Uygulaması çağıran tarafta (logger). */
export type BudgetReporter = (measurement: Measurement<unknown>) => void;

export interface MeasureOptions {
  /** Bütçe tablosundaki metrik adı (`docs/spec/09` §11.6). */
  readonly name: string;
  /** Milisaniye cinsinden üst sınır. */
  readonly budgetMs: number;
  /** Bütçe AŞILIRSA çağrılır. Aşılmazsa hiç çağrılmaz. */
  readonly onExceeded?: BudgetReporter;
}

/** Bir değer `then` taşıyor mu? */
function isThenable(value: unknown): boolean {
  return (
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}

/**
 * Eşzamanlı bir işi ölçer ve bütçeyle karşılaştırır.
 *
 * ⚠️ EŞZAMANSIZ İŞ KABUL ETMEZ — SESSİZCE YANLIŞ ÖLÇMEKTENSE FIRLATIR.
 * `measure(…, () => fetchAll())` yazılsaydı ölçülen şey **promise'in
 * kurulması** olurdu, işin süresi değil; sonuç her zaman "0,1 ms, bütçe
 * içinde" derdi ve kapı hiç ötmezdi. Yanlış bir yeşil, hiç ölçüm olmamasından
 * kötüdür (`base-path.ts` ile aynı "sessizce yanlış üretme" duruşu).
 * Eşzamansız ölçüm `pnpm perf:budget` kapısıyla birlikte gelecek (Faz 6, G-01).
 *
 * @throws {ValidationError} `fn` bir thenable döndürürse.
 */
export function measure<T>(options: MeasureOptions, fn: () => T): Measurement<T> {
  const startedAt = performance.now();
  const value = fn();
  const durationMs = performance.now() - startedAt;

  if (isThenable(value)) {
    throw new ValidationError({
      code: 'perf.asyncNotSupported',
      message:
        `measure('${options.name}') eşzamansız bir değer aldı. Ölçülen süre işin ` +
        `değil promise'in kurulma süresidir ve bütçe kontrolü anlamsız olur.`,
      context: { name: options.name, budgetMs: options.budgetMs },
    });
  }

  const exceeded = durationMs > options.budgetMs;
  const measurement: Measurement<T> = {
    name: options.name,
    durationMs,
    budgetMs: options.budgetMs,
    exceeded,
    value,
  };

  if (exceeded && options.onExceeded !== undefined) options.onExceeded(measurement);

  return measurement;
}
