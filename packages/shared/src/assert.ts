import {
  type AppError,
  type AppErrorOptions,
  DataProviderError,
  DomainError,
  EngineError,
  ERROR_KINDS,
  type ErrorContext,
  type ErrorKind,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from './errors.js';

/**
 * Değişmez (invariant) kontrolleri — `docs/spec/09` §11.3, Faz 2 kabul kriteri 4.
 *
 * ⚠️ BU DOSYA SAFTIR VE SAF KALMALIDIR (K3). Motor bunu kullanacak: hiçbir Node
 * API'si, `process.env` okuması, `Date.now()`, `Math.random()` yok.
 * `packages/engine/src/observability-from-engine.test.ts` bunu ölçüyor.
 *
 * ── `NODE_ENV` KOKLANMIYOR ───────────────────────────────────────────────
 * Faz 1 hata #10'un dersi: `process.env.NODE_ENV`'e bakan bir kapı yanlış şeyi
 * ölçer (Vite onu derleme sırasında kendisi değiştiriyor). Bu modül ortamı
 * **hiç okumaz**; kip yalnızca `configureAssertions()` ile, çağıran tarafın
 * açık kararıyla değişir. Tarayıcı bu kararı derleme zamanı sabitinden
 * (`__FMS_DEV__`, Vite `define`) türetir.
 *
 * ── VARSAYILAN `throw` — GÜVENLİ TARAF ───────────────────────────────────
 * Hiç yapılandırılmazsa değişmez ihlali **fırlatır**. Bu, motorun, sunucunun,
 * worker'ın ve tüm testlerin varsayılanıdır ve `docs/spec/09` §11.3 ile
 * tutarlı: *"İhlal → tur geri alınır ve hata raporlanır."* Sessizce devam
 * etmek yalnızca **tarayıcı üretim derlemesinde** doğru: orada bir savunma
 * kontrolünün kullanıcının ekranını karartması, kontrolün önlemeye çalıştığı
 * hasardan büyüktür.
 *
 * ⚠️ Sunucu tarafında bugün `configureAssertions()` çağıran **kimse yok** ve
 * bu bilinçli (SAPMA-017): `apps/api`'de tek bir `assertInvariant` çağrı yeri
 * olmadığı için oraya bir bayrak eklemek, tüketicisi olmayan spekülatif
 * yapılandırma olurdu (K12) ve iki kip **koşularak ayırt edilemezdi**.
 * Motor `assertInvariant` kullanmaya başladığında (Faz 16/22) karar yeniden
 * açılır; o gün bayrak `LOG_FORMAT`'ın deseniyle **açık bir Zod enum'u**
 * olarak gelir, `NODE_ENV`'den çıkarsanmaz.
 *
 * ── NEDEN `asserts condition` İMZASI KULLANILMIYOR ───────────────────────
 * TypeScript'in `asserts condition` imzası "bu satırdan sonra koşul kesin
 * doğrudur" der. `report` kipinde fonksiyon **fırlatmıyor**, yani o söz
 * yalan olurdu: üretimde koşul yanlışken derleyici tipi daraltır ve sonraki
 * satırlar var olmayan bir garantiye dayanır. Bunun yerine **`boolean`
 * dönüyor** — çağıran taraf ihlalde ne yapacağına kendisi karar verir.
 */

/** Değişmez ihlalinde ne olacağı. */
export const ASSERTION_MODES = {
  /** Fırlat. Motor, sunucu, worker ve testlerin varsayılanı. */
  throw: 'throw',
  /** Bildir ve devam et. Yalnızca tarayıcı üretim derlemesi. */
  report: 'report',
} as const;

export type AssertionMode = (typeof ASSERTION_MODES)[keyof typeof ASSERTION_MODES];

/** Bildirilen ihlalin tam kaydı. Log satırının hammaddesi. */
export interface InvariantViolation {
  readonly code: string;
  readonly message: string;
  readonly context: ErrorContext;
  readonly kind: ErrorKind;
}

/**
 * İhlali bildiren fonksiyon.
 *
 * ⚠️ Bu modül `Logger`'ı **bilmez** — bir fonksiyon çağırır. 2.3c'de aynı
 * problem aynı şekilde çözülmüştü (`contextProvider: getLogContext`):
 * bağımlılığı çağıran taraf kurar. Aksi hâlde saf bir modül logger'a bağlanır
 * ve motor onu import edemez hale gelirdi.
 */
export type InvariantReporter = (violation: InvariantViolation) => void;

/**
 * Kip + bildirici, **ayrılmaz** bir çift olarak.
 *
 * Ayrık birleşim (CLAUDE.md §1.3) bilinçli: `report` kipini bildirici
 * olmadan kurmak **temsil edilemez**. Ayrı iki alan olsaydı
 * `{ mode: 'report' }` yazmak mümkün olurdu ve sonuç, her ihlalin sessizce
 * kaybolduğu bir yapılandırma olurdu — kapının en kötü hâli.
 */
export type AssertionPolicy =
  | { readonly mode: typeof ASSERTION_MODES.throw }
  | { readonly mode: typeof ASSERTION_MODES.report; readonly report: InvariantReporter };

/** `assertInvariant()` girdisi. */
export interface AssertInvariantOptions {
  /** Kararlı, makine tarafından okunan kimlik — i18n anahtarı biçiminde. */
  readonly code: string;
  /** GELİŞTİRİCİ mesajı. Loga gider, çevrilmez. */
  readonly message: string;
  /** Mesajın yapısal hammaddesi. Redaksiyondan geçer. */
  readonly context?: ErrorContext;
  /**
   * Hangi hata sınıfı fırlatılacak. Varsayılan `engine`.
   *
   * ⚠️ DEĞİŞTİRİLEBİLİR OLMASI KARAR 18'İN SONUCU: *"bir sınıflandırma
   * bağlamdan bağımsız değildir."* Bir motor değişmezi `engine`'dir, ama
   * tarayıcıda sunucunun tutarsız bir başlık döndürmesi bir **yukarı akış
   * anomalisidir** (`dataProvider`) — ikisine aynı etiketi vermek,
   * sınıflandırmayı tüketen her kuralı (exception filter durum kodu,
   * Sentry `beforeSend` elemesi) yanlış yönlendirirdi.
   */
  readonly kind?: ErrorKind;
}

/**
 * `ErrorKind` → hata üreteci.
 *
 * `Record<ErrorKind, …>` — `Partial` DEĞİL. Yeni bir `ErrorKind` eklenip
 * buraya yazılmazsa **derleme kırılır**; 2.4'teki `STATUS_BY_KIND` ile aynı
 * kapı, aynı gerekçe (SAPMA-010).
 */
const ERROR_BY_KIND: Record<ErrorKind, (options: AppErrorOptions) => AppError> = {
  [ERROR_KINDS.domain]: (options) => new DomainError(options),
  [ERROR_KINDS.validation]: (options) => new ValidationError(options),
  [ERROR_KINDS.engine]: (options) => new EngineError(options),
  [ERROR_KINDS.dataProvider]: (options) => new DataProviderError(options),
  [ERROR_KINDS.notFound]: (options) => new NotFoundError(options),
  [ERROR_KINDS.forbidden]: (options) => new ForbiddenError(options),
};

const STRICT_POLICY: AssertionPolicy = { mode: ASSERTION_MODES.throw };

// ─── Modül düzeyi tekil ──────────────────────────────────────────────────
//
// `base-path.ts` ve `apps/web/src/lib/correlation-context.ts` ile aynı desen.
// K3'ün global durum yasağı `packages/engine` içindir ve `arch:check` onu
// orada denetler; burası `packages/shared`. Yine de motor bu tekili
// DEĞİŞTİREMEZ: `configureAssertions` `arch:check`'in
// `ENGINE_FORBIDDEN_SHARED_EXPORTS` listesinde. Yani motorun gördüğü kip her
// zaman varsayılan `throw`'dur ve motor kendi değişmez kontrolünü gevşetemez.
let policy: AssertionPolicy = STRICT_POLICY;

/** Uygulama açılışında bir kez çağrılır (yalnızca tarayıcı bootstrap'ı, 2.7). */
export function configureAssertions(next: AssertionPolicy): void {
  policy = next;
}

/** Yalnızca testler için — tekil durumu güvenli tarafa (`throw`) döndürür. */
export function resetAssertionsForTests(): void {
  policy = STRICT_POLICY;
}

/** Etkin kip. Teşhis ve testler için okunur. */
export function assertionMode(): AssertionMode {
  return policy.mode;
}

/**
 * Bir değişmezi denetler.
 *
 * @param condition Doğru olması BEKLENEN koşul.
 * @returns Değişmez tuttu mu. `false` yalnızca `report` kipinde dönebilir —
 *   `throw` kipinde ihlal zaten fırlatır.
 * @throws {AppError} `throw` kipinde ve koşul yanlışsa. Sınıf `options.kind`
 *   ile seçilir, varsayılanı `EngineError`.
 */
export function assertInvariant(condition: boolean, options: AssertInvariantOptions): boolean {
  if (condition) return true;

  const violation: InvariantViolation = {
    code: options.code,
    message: options.message,
    context: options.context ?? {},
    kind: options.kind ?? ERROR_KINDS.engine,
  };

  if (policy.mode === ASSERTION_MODES.report) {
    // Fırlatma DEĞİL bildirme: üretimde bir savunma kontrolü kullanıcının
    // işini düşürmemeli. Bildirici zorunlu olduğu için ihlal sessizce
    // kaybolamaz (bkz. `AssertionPolicy` ayrık birleşimi).
    policy.report(violation);
    return false;
  }

  throw ERROR_BY_KIND[violation.kind]({
    code: violation.code,
    message: violation.message,
    context: violation.context,
  });
}
