import {
  type AppError,
  CORRELATION_HEADER,
  type ErrorContext,
  type ErrorKind,
  isAppError,
  type Logger,
  redactContext,
} from '@fms/shared';
import { getLogContext } from '@fms/shared/server';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Inject,
} from '@nestjs/common';
import { captureException } from '@sentry/node';
import type { Response } from 'express';

// DI belirteci hiçbir şey import etmeyen ayrı modülden geliyor: `@Inject(...)`
// modül gövdesi değerlendirilirken çalışır ve belirteç o an tanımlı olmalıdır.
// `app.module.ts`'te tanımlı olsaydı dairesel bağımlılık doğardı (SAPMA-014).
import { LOGGER } from '../tokens.js';

/**
 * Global hata filtresi — `docs/ROADMAP.md` Faz 2 madde 2.4.
 *
 * 2.1'de kurulan altyapının kullanıldığı yer: hata sınıfları taşımadan bağımsız
 * `kind` taşıyor, HTTP eşlemesi **burada** yapılıyor (SAPMA-010).
 *
 * ── İŞ BÖLÜMÜ: BU FİLTRE İLE `RequestLogMiddleware` ARASINDA ─────────────
 * İki satır **farklı sorulara** cevap veriyor ve farklı `code` taşıyor:
 *
 *   `http.request`   (middleware, 2.3c) → **NE OLDU**: metot · yol · durum ·
 *                                          süre. Her istekte, tam bir tane.
 *   `http.exception` (bu dosya)         → **NEDEN**: kind · code · redakte
 *                                          context · (5xx ise) yığın izi.
 *
 * Kodların ayrı olması sayımı belirsizlikten kurtarıyor: *"kaç istek düştü?"*
 * sorusu `http.request` + `status >= 500` ile cevaplanır ve **tek** satır
 * sayılır. Bu filtrenin satırı teşhis içindir, sayaç değil. İkisi aynı
 * `correlationId`'yi taşıdığı için log'da yan yana gelirler.
 *
 * Yığın izi **yalnızca 5xx'te**: 4xx beklenen bir durumdur (kullanıcı yanlış
 * şey istedi), yığın izi orada gürültüdür ve dosya yollarını sızdırır.
 *
 * ── GÖVDEDE NE VAR, NE YOK ───────────────────────────────────────────────
 * Bilinen `AppError` → `{ status, code, context, correlationId }`
 * Bilinmeyen her şey → `{ status: 500, code: 'error.unexpected', correlationId }`
 *                      — **context YOK, yığın izi YOK, iç mesaj YOK.**
 *
 * ⚠️ **`message` ALANI 5.4'TE GÖVDEDEN ÇIKARILDI — BORÇ-005 ÖDENDİ.**
 * Bu bir **API yüzeyi değişikliğidir** ve sessizce yapılmadı: alan Türkçe
 * kullanıcı metni taşıyordu (`MESSAGE_BY_KIND`) ve K5 onu koda gömülü sabit
 * metin sayıyordu. Borcun kütükteki çözümü de buydu: *"tablo silinir ve
 * istemci `t('errors:' + code, context)` ile üretir."*
 * ⚠️ **TÜKETİCİSİ SIFIRDI — ölçüldü, varsayılmadı.** İlk okumada
 * `apps/web/src/lib/api.ts`in alanı kullandığı sanıldı; kaynak takip edilince
 * görüldü ki o dosya hata gövdesini **hiç parse etmiyor**: `response.json()`
 * yalnızca **başarı** yolunda çalışıyor, hata yolunda ondan önce fırlatılıyor.
 * İstemcinin geliştirici mesajı zaten `status` + `method` + `url`den kuruluyor.
 * Yani bu bir API yüzeyi değişikliği ama **kırdığı hiçbir çağrı yeri yok**
 * (tek depo, tek istemci, sıfır tüketici).
 *
 * `context`in bilinen hatalarda gövdeye girmesi bilinçli: 2.1'in sözleşmesi
 * `code` + `context` ve Faz 5 istemcide `t('errors:' + code, context)`
 * yapacak. Context gövdede dönmezse o cümle kurulamaz. Yine de gövdeye giden
 * context **redaksiyondan geçiyor** — `ErrorContext` zaten dar tipli (iç içe
 * nesne yok), redaksiyon ikinci hat.
 *
 * Bilinmeyen hatada hiçbir ayrıntı verilmemesinin sebebi farklı: orada
 * `context` diye bir sözleşme yok, elde yalnızca yakalanan nesnenin iç
 * mesajı ve yığın izi var — ikisi de sunucu iç yapısını sızdırır.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(@Inject(LOGGER) private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const correlationId = resolveCorrelationId(response);

    const resolved = resolveException(exception);
    const level = resolved.status >= 500 ? 'error' : 'warn';

    // Yığın izi yalnızca beklenmeyen (5xx) hatalarda ve YALNIZCA logda.
    const stack =
      resolved.status >= 500 && exception instanceof Error ? exception.stack : undefined;

    this.logger[level](
      {
        ...(correlationId === undefined ? {} : { correlationId }),
        code: 'http.exception',
        kind: resolved.kind,
        errorCode: resolved.code,
        status: resolved.status,
        // Geliştirici mesajı loga gider, gövdeye DEĞİL.
        detail: resolved.detail,
        ...(resolved.context === undefined ? {} : redactContext(resolved.context)),
        ...(stack === undefined ? {} : { stack }),
      },
      'İstek hatayla sonuçlandı',
    );

    // ── SENTRY (2.5a) ────────────────────────────────────────────────────
    // Yakalanan HER hata gönderiliyor; neyin düşürüleceğine **yalnızca**
    // `instrument.ts`'teki `beforeSend` karar veriyor. Burada ikinci bir
    // filtre kurmak iki karar noktası üretirdi ve ikisi kaçınılmaz olarak
    // ayrışırdı (SAPMA-013).
    //
    // NestJS exception filter'ı istisnayı **yutuyor**, yani Sentry'nin kendi
    // Express hata ara katmanı onu hiç görmüyor — açık `captureException`
    // zorunlu. SDK kurulmamışsa (DSN boş) bu çağrı sessiz bir no-op.
    captureException(exception, {
      tags: {
        ...(correlationId === undefined ? {} : { correlationId }),
        errorKind: resolved.kind,
        errorCode: resolved.code,
      },
      extra: { status: resolved.status },
    });

    response.status(resolved.status).json({
      status: resolved.status,
      code: resolved.code,
      ...(correlationId === undefined ? {} : { correlationId }),
      ...(resolved.context === undefined
        ? {}
        : { context: redactContext(resolved.context) as ErrorContext }),
    });
  }
}

/**
 * `ErrorKind` → HTTP durum kodu.
 *
 * ⚠️ `Record<ErrorKind, number>` — `Partial` DEĞİL. SAPMA-010'un tüm gerekçesi
 * buydu: `httpStatus` alanı hata sınıflarından çıkarıldı çünkü HTTP bir taşıma
 * kaygısı; itiraz ("ayrı tablo unutulur, sürüklenir") tip seviyesinde
 * kapatıldı. Yeni bir `ErrorKind` eklenip buraya yazılmazsa **derleme kırılır**.
 *
 * ÖLÇÜLDÜ (2.4): `ERROR_KINDS`'a sahte bir `suspended` girdisi eklendi →
 * `error TS2741: Property 'suspended' is missing in type ... but required in
 * type 'Record<ErrorKind, number>'`. Kapı gerçekten ötüyor.
 *
 * ── SEÇİMLERİN GEREKÇESİ ─────────────────────────────────────────────────
 * `validation` → **400**: gövdenin biçimi/şekli bozuk.
 * `domain`     → **409**: gövde geçerli, ama **mevcut durumla çakışıyor** —
 *                bütçe yetmiyor, kadro dolu, transfer dönemi kapalı. 422
 *                düşünüldü ve elendi: 422 "anlamsal olarak bozuk içerik"
 *                demek ve `validation`(400) ile bulanıklaşırdı. 400 = şekil,
 *                409 = durum ayrımı temiz.
 * `notFound`   → **404** · `forbidden` → **403**: doğrudan karşılıkları.
 * `engine`     → **500**: motorda değişmez kırıldı, bu BİZİM hatamız.
 * `dataProvider` → **502**: yukarı akış (API/paket) cevap vermedi; istemcinin
 *                yeniden denemesi anlamlı, 500'den ayrılması bu yüzden değerli.
 */
export const STATUS_BY_KIND: Record<ErrorKind, number> = {
  validation: 400,
  domain: 409,
  notFound: 404,
  forbidden: 403,
  engine: 500,
  dataProvider: 502,
};

/**
 * ⚠️ `MESSAGE_BY_KIND` ve `UNEXPECTED_MESSAGE` **5.4'TE SİLİNDİ** — BORÇ-005.
 *
 * İkisi de kullanıcıya gösterilen Türkçe metni koda gömüyordu. Sözleşmenin
 * aslı zaten `code` + `context`ti ve tablo bir **yedekti**; artık metni istemci
 * üretiyor: `t('errors:code.' + code, { defaultValue: t('errors:status.' + status) })`.
 *
 * ⚠️ **YEDEK `kind` ÜZERİNE DEĞİL `status` ÜZERİNE KURULDU — SAPMA-038.**
 * Doğal aday `kind`di ama ölçüldü: **`kind` gövdeye hiç girmiyor**, yalnızca
 * log bağlamında var. İstemci onu göremiyor. `status` gövdede **var** ve
 * `exceptionMessageFor` zaten tam olarak ona bakıyordu — o eşleme artık
 * `apps/web/src/locales/tr/errors.json` içindeki `status.*` ailesi.
 */
/** Bilinmeyen hata gövdesinin kodu. i18n anahtarı biçiminde (CLAUDE.md §1.3). */
export const UNEXPECTED_CODE = 'error.unexpected';

interface ResolvedException {
  readonly status: number;
  readonly code: string;
  readonly kind: ErrorKind | 'http' | 'unknown';
  /** Geliştirici ayrıntısı — YALNIZCA loga gider. */
  readonly detail: string;
  /** Yalnızca bilinen `AppError`larda dolu. */
  readonly context?: ErrorContext;
}

/**
 * Yakalanan her şeyi tek bir şekle indirger.
 *
 * Üç dal, sırası önemli:
 *   1. Bizim `AppError`ımız — tam sözleşme (`kind`, `code`, `context`).
 *   2. Nest'in `HttpException`ı — eşleşmeyen rota (404), gövde doğrulaması vb.
 *      Bunlar bizim değil ama **anlamlı** durum kodları taşıyor; 500'e
 *      çevirmek bilgi kaybı olurdu.
 *   3. Geri kalan HER ŞEY — `throw 'metin'`, `throw { a: 1 }`, `throw null`
 *      dahil. JavaScript herhangi bir değerin fırlatılmasına izin veriyor ve
 *      `instanceof Error` varsayan bir filtre bu durumda **kendisi patlar**.
 */
export function resolveException(exception: unknown): ResolvedException {
  if (isAppError(exception)) {
    const error: AppError = exception;
    return {
      status: STATUS_BY_KIND[error.kind],
      code: error.code,
      kind: error.kind,
      detail: error.message,
      context: error.context,
    };
  }

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    return {
      status,
      // `http.404` gibi — i18n anahtarı biçimini koruyor, yani Faz 5'te
      // çevrilebilir ve bugün makine tarafından ayırt edilebilir.
      code: `http.${String(status)}`,
      kind: 'http',
      detail: exception.message,
    };
  }

  return {
    status: 500,
    code: UNEXPECTED_CODE,
    kind: 'unknown',
    // ⚠️ `String(exception)` — `exception.message` DEĞİL. Fırlatılan şey bir
    // `Error` olmayabilir; `null.message` okunması filtrenin kendisini
    // düşürürdü ve o an hiçbir yanıt dönmezdi.
    detail: describeUnknown(exception),
  };
}

/**
 * `Error` olmayan bir fırlatmayı loglanabilir tek satıra indirger.
 *
 * ⚠️ `String(value)` HER DAL İÇİN KULLANILAMAZ ve bunu lint yakaladı
 * (`no-base-to-string`): bir nesne için `String({...})` → `'[object Object]'`
 * üretir, yani **hiçbir bilgi taşımayan** bir teşhis satırı. Kural bastırılmadı,
 * dallar tek tek ayrıldı — çünkü kuralın uyarısı burada haklıydı.
 *
 * Dal sırası anlamlı: `null` ve `undefined` nesne dalından **önce** eleniyor,
 * çünkü `typeof null === 'object'`.
 */
export function describeUnknown(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      // Döngüsel referans — sessiz yutma değil, bilinçli geri düşüş
      // (CLAUDE.md §1.3): amacımız teşhis metni üretmek ve `JSON.stringify`in
      // başarısızlığının tek anlamlı sebebi bu. `[object Object]` yerine
      // durumu ADLANDIRAN bir metin dönülüyor.
      return '[döngüsel nesne]';
    }
  }

  if (typeof value === 'symbol') return value.toString();
  if (typeof value === 'function') return `[function ${value.name}]`;
  if (typeof value === 'string') return value;

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  // Buraya düşmek teorik olarak imkânsız: yukarıdaki dallar `typeof`un tüm
  // sonuçlarını tüketiyor. Yine de `String(unknown)` yazmıyoruz — lint haklı
  // olarak onu reddediyor ve `[object Object]` üretmesi zaten istemediğimiz şey.
  return '[bilinmeyen değer]';
}

/**
 * İsteğin `correlationId`si.
 *
 * ⚠️ İKİ KAYNAK, BİLİNÇLİ. Önce `AsyncLocalStorage`, sonra yanıt başlığı.
 *
 * 2.3c'de ölçüldü ki ALS bağlamının varlığı çağrının nereden geldiğine bağlı
 * ve her zaman garanti değil. Filtre isteğin senkron/promise zincirinde
 * çalıştığı için bağlam **bugün** mevcut — ama yedek üç satır ve alternatif,
 * kimliksiz bir hata yanıtı: kullanıcı "Hata bildir" dediğinde (2.6)
 * gönderecek bir şeyi olmaz ve zincir tam da en gerekli anda kopar.
 *
 * Yanıt başlığı güvenilir bir yedek çünkü `CorrelationMiddleware` onu
 * `next()`ten ÖNCE, senkron olarak yazıyor (2.3a).
 */
export function resolveCorrelationId(response: Response): string | undefined {
  const fromContext = getLogContext()['correlationId'];
  if (typeof fromContext === 'string' && fromContext !== '') return fromContext;

  const fromHeader = response.getHeader(CORRELATION_HEADER);
  return typeof fromHeader === 'string' && fromHeader !== '' ? fromHeader : undefined;
}
