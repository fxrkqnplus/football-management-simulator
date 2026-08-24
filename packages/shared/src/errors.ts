/**
 * Tipli hata sınıfları — K1.3.
 *
 * ⚠️ BU DOSYA SAFTIR VE SAF KALMALIDIR (K3).
 * Hiçbir import yok, hiçbir Node API'si yok, `Date.now()` yok, `Math.random()`
 * yok, modül düzeyi değiştirilebilir durum yok. Sebebi mimari: `packages/engine`
 * bu sınıfları kullanacak ve motor `@fms/shared`'dan yalnızca **tip ve saf
 * yardımcı** alabilir (CLAUDE.md §2.4). Buraya bir `import` eklemeden önce o
 * importun motorda da geçerli olduğunu doğrula.
 *
 * ── ÜÇ TASARIM KARARI ────────────────────────────────────────────────────
 *
 * 1. `httpStatus` BU SINIFLARDA YOK (SAPMA-010).
 *    Yol haritası alanı burada listeliyordu. HTTP bir **taşıma katmanı**
 *    kaygısıdır; motor HTTP bilmez ve aynı hata kuyruğa, SSE'ye veya CLI'a da
 *    gidebilir — oralarda durum kodunun anlamı yoktur. Eşleme
 *    `apps/api`'deki exception filter'a ait (2.4).
 *    Eşlemenin sürüklenme (drift) riski tip seviyesinde kapatılır: filter
 *    `Record<ErrorKind, number>` tutar, yani yeni bir `ErrorKind` eklenip
 *    eşlemeye yazılmazsa **derleme kırılır**. "Ayrı tablo unutulur" itirazı
 *    bu yüzden geçerli değil.
 *
 * 2. KULLANICIYA GÖSTERİLECEK METİN BURADA ÜRETİLMEZ.
 *    K1.3 eyleme dönüştürülebilir Türkçe mesaj istiyor, K5 arayüzde sabit
 *    Türkçe metni yasaklıyor, i18n ise Faz 5'te geliyor. Üçü ancak şöyle
 *    uzlaşır: **sözleşme `code` + `context`'tir.**
 *      - `code` zaten i18n anahtarı biçimindedir (`namespace.dot.notation`,
 *        CLAUDE.md §1.3). Faz 5'te `t('errors:' + code, context)` olur ve
 *        **hiçbir fırlatma yerine dokunulmaz** — iş bir eşleme tablosu yazmaya
 *        iner, yüzlerce dosyayı gezip metin sökmeye değil.
 *      - `context` mesajın içine gireceği sayıları **yapısal** taşır:
 *        "Bütçe: €12,4 mn, Teklif: €18,0 mn" cümlesi bir dizgi olarak değil,
 *        `{ budget: 12400000, offer: 18000000 }` olarak durur.
 *      - `message` **geliştirici içindir**: loga ve Sentry'ye gider, çevrilmez,
 *        kullanıcıya gösterilmesi hedeflenmez.
 *
 * 3. `context` DAR TİPLİDİR — `Record<string, unknown>` DEĞİL.
 *    Bu alan loglara ve Sentry'ye gidiyor. Serbest bırakılırsa içine bütün bir
 *    istek gövdesi veya varlık nesnesi konur ve sır sızdırma yüzeyi açılır.
 *    Tip yalnızca JSON-güvenli ilkel değerlere ve sığ dizilere izin verir; bu,
 *    fırlatan tarafı **alan seçmeye** zorlar.
 *    Anahtar adına göre redaksiyon (`password`, `token`, …) ikinci savunma
 *    hattıdır ve 2.2'de logger ile **birlikte** tasarlanır — iki katman aynı
 *    yerde kurulsun ki iş bölümü tek yerde yazılı olsun.
 */

/**
 * Hatanın taşımadan bağımsız türü.
 *
 * `enum` yerine `as const` nesne (CLAUDE.md §1.3): çalışma zamanında düz bir
 * nesne kalır, tip tarafında birebir literal birleşim üretir ve exception
 * filter'daki eşlemenin tam kapsayıcı (exhaustive) olmasını sağlar.
 */
export const ERROR_KINDS = {
  /** İş kuralı ihlali — girdi geçerli ama işlem alan kurallarına aykırı. */
  domain: 'domain',
  /** Girdi biçimi/şekli geçersiz — Zod ihlali veya programcı hatası. */
  validation: 'validation',
  /** Simülasyon motorunda değişmez (invariant) kırıldı. */
  engine: 'engine',
  /** Dış veri kaynağı (API, paket, dosya) beklenen cevabı vermedi. */
  dataProvider: 'dataProvider',
  /** İstenen varlık yok. */
  notFound: 'notFound',
  /** Varlık var ama bu kullanıcı için erişim yok. */
  forbidden: 'forbidden',
} as const;

export type ErrorKind = (typeof ERROR_KINDS)[keyof typeof ERROR_KINDS];

/**
 * `context` içinde durabilecek değerler.
 *
 * Bilerek dar: iç içe nesne YOK. Bir varlığın tamamını bağlama koymak isteyen
 * kişi hangi alanların gerçekten gerektiğini düşünmek zorunda kalsın.
 * Sığ dizi, "eksik alanlar" gibi listeler için açık bırakıldı.
 */
export type ErrorContextValue =
  string | number | boolean | null | readonly string[] | readonly number[];

export type ErrorContext = Readonly<Record<string, ErrorContextValue>>;

/** Her hata sınıfının kurucu seçenekleri. */
export interface AppErrorOptions {
  /**
   * Makine tarafından okunan, kararlı kimlik. i18n anahtarı biçiminde yazılır:
   * `alan.olay` (örn. `transfer.budgetExceeded`, `basePath.doubleSlash`).
   * Faz 5'te bu değer doğrudan çeviri anahtarına dönüşür.
   */
  readonly code: string;
  /** GELİŞTİRİCİ mesajı. Loga gider, çevrilmez, kullanıcıya gösterilmez. */
  readonly message: string;
  /** Mesajın sayısal/adsal hammaddesi. Kullanıcı metni bundan üretilir. */
  readonly context?: ErrorContext;
  /** Sarmalanan alt hata. `Error.cause` üzerinden taşınır. */
  readonly cause?: unknown;
}

/** `toJSON()` çıktısında sarmalanan hatanın sığ özeti. */
export interface SerializedCause {
  readonly name: string;
  readonly message: string;
}

/** Bir hatanın günlüğe yazılabilir, JSON-güvenli gösterimi. */
export interface SerializedAppError {
  readonly name: string;
  readonly kind: ErrorKind;
  readonly code: string;
  readonly message: string;
  readonly context: ErrorContext;
  readonly cause?: SerializedCause;
}

/**
 * Tüm uygulama hatalarının tabanı.
 *
 * `abstract`: doğrudan `new AppError(...)` yapılmaz, hata her zaman türünü
 * söyler. `instanceof AppError` ile "bu bizim tanıdığımız bir hata mı?"
 * sorusu tek satırda cevaplanır — exception filter'ın (2.4) ilk dalı budur.
 */
export abstract class AppError extends Error {
  readonly kind: ErrorKind;
  readonly code: string;
  readonly context: ErrorContext;

  protected constructor(kind: ErrorKind, options: AppErrorOptions) {
    // `exactOptionalPropertyTypes` açık: `{ cause: undefined }` geçirilemez,
    // bu yüzden seçenek nesnesi ancak gerçekten bir sebep varsa kuruluyor.
    super(options.message, options.cause === undefined ? undefined : { cause: options.cause });

    this.kind = kind;
    this.code = options.code;
    this.context = options.context ?? {};

    // `name` sınıf adından türetilir; her alt sınıfta elle yazmak, bir gün
    // birinin kopyalayıp güncellemeyi unutmasına açık kapı bırakırdı.
    this.name = new.target.name;

    // ⚠️ BU SATIR BUGÜN GEREKSİZ, YARIN GEREKLİ OLABİLİR.
    // `Error` alt sınıflaması, sınıflar ES5 fonksiyonlarına indirildiğinde
    // prototip zincirini kaybeder ve `instanceof AltSınıf` sessizce `false`
    // döner. Bugünkü hedef ES2024 (tsconfig.base) ve Vite varsayılanı modern
    // tarayıcı, yani sorun yok — ama `apps/web` derleme hedefi bir gün
    // düşürülürse (örn. Faz 49 mobil cila) kırılma YALNIZCA TARAYICIDA olur:
    // testler Node'da koşuyor, hiçbir kapı görmez. Bir satırın maliyeti,
    // o hatanın maliyetinin yanında yok.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Günlüğe yazılabilir gösterim.
   *
   * NEDEN VAR: `JSON.stringify(new Error('x'))` **`{}`** üretir — `message`,
   * `name` ve `stack` `Error` üzerinde numaralandırılamaz (non-enumerable)
   * alanlardır. Yani bir hatayı olduğu gibi serileştiren her log satırı sessizce
   * boşalır. Bu, yapılandırılmış loglamanın (2.2) en sık düştüğü tuzak.
   *
   * `stack` BİLEREK DIŞARIDA: bu çıktı hem loga hem — yanlışlıkla — HTTP
   * gövdesine girebilir ve yığın izi sunucu dosya yollarını sızdırır. Yığın izi
   * logger tarafından ayrı bir alanda taşınır (2.2).
   */
  toJSON(): SerializedAppError {
    const base = {
      name: this.name,
      kind: this.kind,
      code: this.code,
      message: this.message,
      context: this.context,
    };

    // Sebep zinciri SIĞ özetlenir: tam nesneyi gömmek, sarmalanan bir hatanın
    // kendi bağlamını (belki de bir sırrı) habersizce dışarı taşır.
    const { cause } = this;
    if (cause instanceof Error) {
      return { ...base, cause: { name: cause.name, message: cause.message } };
    }
    return base;
  }
}

/** İş kuralı ihlali. Girdi geçerli, işlem alan kurallarına aykırı. */
export class DomainError extends AppError {
  constructor(options: AppErrorOptions) {
    super(ERROR_KINDS.domain, options);
  }
}

/** Girdi biçimi geçersiz — Zod ihlali veya programcı hatası. */
export class ValidationError extends AppError {
  constructor(options: AppErrorOptions) {
    super(ERROR_KINDS.validation, options);
  }
}

/** Simülasyon motorunda değişmez kırıldı. Tur geri alınmalıdır (spec/09 §11.3). */
export class EngineError extends AppError {
  constructor(options: AppErrorOptions) {
    super(ERROR_KINDS.engine, options);
  }
}

/** Dış veri kaynağı beklenen cevabı vermedi. Genellikle yeniden denenebilir. */
export class DataProviderError extends AppError {
  constructor(options: AppErrorOptions) {
    super(ERROR_KINDS.dataProvider, options);
  }
}

/** İstenen varlık yok. */
export class NotFoundError extends AppError {
  constructor(options: AppErrorOptions) {
    super(ERROR_KINDS.notFound, options);
  }
}

/** Varlık var ama bu kullanıcı erişemez. */
export class ForbiddenError extends AppError {
  constructor(options: AppErrorOptions) {
    super(ERROR_KINDS.forbidden, options);
  }
}

/**
 * Bilinen bir uygulama hatası mı?
 *
 * `instanceof AppError` doğrudan da yazılabilir; bu sarmalayıcı `unknown`
 * daraltmasını tek yerde tutuyor ve `catch (e: unknown)` bloklarında okunur
 * kalıyor.
 */
export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}
