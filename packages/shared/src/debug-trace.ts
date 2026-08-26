import type { ErrorContext } from './errors.js';
import { ValidationError } from './errors.js';
import type { LogContext, LogValue } from './logger.js';

/**
 * `debugTrace` standardı — K7, `docs/spec/09` §11.2.
 *
 * ⚠️ BU DOSYA SAFTIR VE SAF KALMALIDIR (K3). Motor bunu kullanacak: hiçbir Node
 * API'si, `Date.now()`, `Math.random()`, modül düzeyi değiştirilebilir durum yok.
 * Buraya bir import eklemeden önce o importun motorda da geçerli olduğunu
 * doğrula (`packages/engine/src/observability-from-engine.test.ts` bunu ölçüyor).
 *
 * ── MOTOR LOG YAZMAZ, İZ DÖNDÜRÜR ────────────────────────────────────────
 * 2.2a'da verilen karar: log yazmak bir yan etkidir ve K3 motorun yan etki
 * üretmesini yasaklıyor. Bu yüzden buradaki hiçbir fonksiyon `Logger`
 * **çağırmaz** — bir nesne **döndürür**. Loglamayı çağıran taraf yapar
 * (`docs/spec/09` §11.1). `traceToLogContext()` yalnızca köprüdür: izi log
 * bağlamı şekline çevirir, kendisi hiçbir şey yazmaz.
 *
 * ── `input` NEDEN `Record<string, unknown>` DEĞİL (SAPMA-016) ─────────────
 * `docs/spec/09` §11.2 `input: Record<string, unknown>` yazıyordu; burada
 * `ErrorContext`'e (düz, JSON-güvenli ilkeller + sığ dizi) daraltıldı.
 * Gerekçe 2.1'deki `AppError.context` daraltmasının birebir aynısı: bu veri
 * **loglara ve Sentry'ye gidiyor**. İç içe nesneye izin vermek "bütün varlığı
 * ize koy" alışkanlığını mümkün kılar ve sızıntı yüzeyi açar; dar tip fırlatan
 * tarafı **alan seçmeye** zorlar.
 *
 * Elenen alternatif: tipi geniş bırakıp düzleştirme sırasında `[NESTED]` ile
 * temizlemek. Sızıntıyı yine engellerdi ama korumayı **derleme zamanından
 * çalışma zamanına** taşırdı — geliştirici bütün nesneyi koyar, düzleştirici
 * sessizce temizler, kimse yanlış yaptığını fark etmez. Bu projede tekrar
 * tekrar ölçülen ders: sessizce düzelten bir mekanizma, kırılan bir
 * mekanizmadan kötüdür.
 *
 * ── `output` NEDEN SERBEST ───────────────────────────────────────────────
 * `output` hesaplamanın **asıl sonucudur** (bir transfer kararı, bir olay
 * listesi). Daraltmak `DebugTrace<T>`'yi kendi işinde işe yaramaz kılardı ve
 * her çağıranı sonucu ikinci kez düz bir şekle kopyalamaya zorlardı.
 * Redaksiyon kaygısı yalnızca **loglanan** veriye ait ve `output` loglanmıyor:
 * log hattına tek köprü `traceToLogContext()` ve o `output`'a hiç dokunmuyor.
 * İki kilit birden var — bir test bunu sabitliyor, VE biri elle
 * `logger.info({ output }, …)` yazarsa `LogValue` nesne kabul etmediği için
 * **derleme kırılır**. Disiplin çalışma zamanına bırakılmadı.
 */

/** İzdeki tek bir ara adım. `value` spec §11.2'deki gibi dar tutuldu. */
export interface DebugTraceStep {
  readonly name: string;
  readonly value: number | string;
  /** "Neden bu değer?" — K7'nin cevaplanabilir kılmak istediği soru. */
  readonly reason?: string;
}

/**
 * Bir hesaplamanın gerekçesi (K7).
 *
 * `summary` **Türkçe, insan okunabilir tek cümledir** (spec §11.2). Zorunlu
 * olması bilinçli: gerekçesiz bir iz, "neden bu oldu?" sorusunu cevaplamayan
 * bir sayı yığınıdır.
 */
export interface DebugTrace<T> {
  readonly module: string;
  readonly input: ErrorContext;
  readonly steps: readonly DebugTraceStep[];
  readonly output: T;
  readonly summary: string;
  /** Deterministik yeniden üretim için `SeededRng` tohumu (K2). Faz 22+. */
  readonly seed?: string;
}

/** `createDebugTrace()` girdisi. */
export interface DebugTraceInit {
  readonly module: string;
  readonly input?: ErrorContext;
  readonly seed?: string;
}

/**
 * Adım biriktiren kurucu.
 *
 * `step()` **yeni bir kurucu döndürmez, aynısını döndürür** ve içeride bir
 * diziye yazar — ama o dizi fonksiyon kapsamında yaşar, modül düzeyinde
 * değil. K3'ün yasakladığı şey modül düzeyi durumdur; yerel değişkenler saf
 * bir fonksiyonun normal işleyişidir.
 */
export interface DebugTraceBuilder<T> {
  step(name: string, value: number | string, reason?: string): DebugTraceBuilder<T>;
  /** İzi kapatır. Kapatıldıktan sonra dondurulur; sonradan değiştirilemez. */
  done(output: T, summary: string): DebugTrace<T>;
}

/** `traceToLogContext()` çıktısındaki kararlı `code` alanı. */
export const DEBUG_TRACE_LOG_CODE = 'debug.trace';

/** Düzleştirmede kullanılan ön ekler — 2.8 paneli ve log okuyucuları için kararlı. */
export const DEBUG_TRACE_INPUT_PREFIX = 'input.';
export const DEBUG_TRACE_STEP_PREFIX = 'step.';

function requireNonEmpty(value: string, field: string, code: string): void {
  if (value.trim() === '') {
    throw new ValidationError({
      code,
      message: `debugTrace '${field}' alanı boş olamaz. Gerekçesiz bir iz K7'yi karşılamaz.`,
      context: { field },
    });
  }
}

/**
 * Yeni bir iz kurucusu açar.
 *
 * @example
 * const trace = createDebugTrace<{ decision: string }>({
 *   module: 'ai.transferTarget',
 *   input: { clubId: 42, budget: 12_000_000 },
 * })
 *   .step('positionNeed', 0.71, 'Derinlik 2/4, yaş riski yüksek')
 *   .step('targetScore', 0.58)
 *   .done({ decision: 'bid' }, 'Stoper ihtiyacı yüksek; hedef bütçeye uyuyor.');
 */
export function createDebugTrace<T>(init: DebugTraceInit): DebugTraceBuilder<T> {
  requireNonEmpty(init.module, 'module', 'debugTrace.moduleRequired');

  const steps: DebugTraceStep[] = [];

  const builder: DebugTraceBuilder<T> = {
    step(name: string, value: number | string, reason?: string): DebugTraceBuilder<T> {
      requireNonEmpty(name, 'step.name', 'debugTrace.stepNameRequired');
      // `exactOptionalPropertyTypes` açık: `{ reason: undefined }` geçirilemez,
      // bu yüzden alan ancak gerçekten bir gerekçe varsa kuruluyor.
      steps.push(reason === undefined ? { name, value } : { name, value, reason });
      return builder;
    },

    done(output: T, summary: string): DebugTrace<T> {
      requireNonEmpty(summary, 'summary', 'debugTrace.summaryRequired');

      const base = {
        module: init.module,
        input: init.input ?? {},
        // Kurucu kapandıktan sonra `step()` çağrılırsa iz DEĞİŞMESİN diye kopya.
        steps: Object.freeze([...steps]),
        output,
        summary,
      };

      const trace: DebugTrace<T> = init.seed === undefined ? base : { ...base, seed: init.seed };

      // Donduruluyor: bu bir denetim kaydı. 2.8 paneli ona referans tutacak ve
      // sonradan değiştirilmiş bir gerekçe, hiç gerekçe olmamasından kötüdür.
      return Object.freeze(trace);
    },
  };

  return builder;
}

/**
 * Bu değer bir `DebugTrace` mi?
 *
 * 2.8'deki hata ayıklama paneli izleri **keyfi kaynaklardan** alacak (SSE
 * akışı, kayıt geçmişi); tip koruyucusu o sınırın tek yerde durmasını sağlıyor.
 */
export function isDebugTrace(value: unknown): value is DebugTrace<unknown> {
  if (typeof value !== 'object' || value === null) return false;

  // ⚠️ `Partial<DebugTrace<unknown>>`e DEĞİL, `Record<string, unknown>`e
  // daraltılıyor. İlk yazımda ilki kullanılmıştı ve lint haklı çıktı: o cast
  // alanların tiplerini ZATEN doğru varsayıyor, bu yüzden `input !== null`
  // kontrolü "gereksiz koşul" görünüyordu. Oysa çalışma zamanında
  // `typeof null === 'object'`ttir ve kontrol tam olarak orada gerekli —
  // yani cast, koruyucunun korumak istediği şeyi tip düzeyinde siliyordu.
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['module'] === 'string' &&
    typeof candidate['summary'] === 'string' &&
    Array.isArray(candidate['steps']) &&
    typeof candidate['input'] === 'object' &&
    candidate['input'] !== null
  );
}

/**
 * İzi **düz** bir log bağlamına çevirir — log hattına tek köprü.
 *
 * ⚠️ NEDEN DÜZLEŞTİRME ŞART: `redactContext()` **sığdır**, özyinelemez
 * (`packages/shared/src/redact.ts`). `logger.info({ trace }, …)` yazılsaydı
 * `trace.input.password` redaksiyondan **kaçardı** — üstelik `LogValue` iç içe
 * nesne kabul etmediği için zaten derlenmezdi. Düzleştirme ikisini birden
 * çözüyor: `input.password` anahtarı, redaksiyonun ALT DİZE eşleşmesi
 * sayesinde `password` parçasıyla eşleşiyor ve `[REDACTED]` oluyor.
 *
 * Redaksiyonu bu fonksiyon **YAPMAZ** — logger yapıyor (2.2b). `docs/spec/09`
 * §11.5: hiçbir kural iki yerde denetlenmez; burada tekrarlansaydı ikisi
 * zamanla ayrışırdı.
 *
 * `output` bilerek DIŞARIDA — dosya başındaki gerekçeye bakınız.
 */
export function traceToLogContext(trace: DebugTrace<unknown>): LogContext {
  const context: Record<string, LogValue> = {
    code: DEBUG_TRACE_LOG_CODE,
    module: trace.module,
  };

  if (trace.seed !== undefined) context['seed'] = trace.seed;

  for (const [key, value] of Object.entries(trace.input)) {
    context[`${DEBUG_TRACE_INPUT_PREFIX}${key}`] = value;
  }

  for (const step of trace.steps) {
    context[`${DEBUG_TRACE_STEP_PREFIX}${step.name}`] = step.value;
    if (step.reason !== undefined) {
      context[`${DEBUG_TRACE_STEP_PREFIX}${step.name}.reason`] = step.reason;
    }
  }

  return context;
}
