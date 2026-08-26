/**
 * Hata izleme servisine NE GÖNDERİLECEĞİ politikası — Karar 17 (2.5b).
 *
 * ⚠️ İZOMORFİK VE BAĞIMLILIKSIZ. Kökte duruyor çünkü **iki taraf da** aynı
 * politikayı uyguluyor (`apps/api/src/instrument.ts`,
 * `apps/web/src/lib/sentry.ts`). İki kopya kaçınılmaz olarak ayrışırdı ve
 * ayrışmanın bedeli bu dosyada bir **gizlilik sızıntısı** olur (SAPMA-013).
 *
 * Sentry tipleri BİLEREK import edilmiyor: kök giriş üçüncü taraf paket
 * sızdırmaz (`index.ts` başlığı). Nesne yapısal olarak Sentry'nin
 * `DataCollection` tipiyle uyumlu; uyumsuzlaşırsa **derleme kırılır** ve bu
 * istenen davranıştır — sessizce sürüklenmesindense yüksek sesle durması iyi.
 *
 * ── NEDEN AÇIKÇA YAZILIYOR: ÖLÇÜM ────────────────────────────────────────
 * `sendDefaultPii: false` (eski seçenek) **"hiçbir şey toplama" demek değil**.
 * `@sentry/node` 10.70.0'da ölçüldü — `sendDefaultPii: false` ile seçeneği
 * hiç vermemek **birebir aynı** sonucu üretiyor ve o sonuç şu:
 *
 *   userInfo       : false                                    ✅
 *   cookies        : { deny: [forwarded, -ip, remote-, via, -user] }  ← TOPLANIYOR
 *   httpHeaders    : request + response, aynı dar deny listesi        ← TOPLANIYOR
 *   urlQueryParams : aynı dar deny listesi                            ← TOPLANIYOR
 *   httpBodies     : []                                       ✅
 *
 * Yani yalnızca IP'yle ilgili birkaç anahtar eleniyor. Çerez, Faz 13'ten
 * itibaren **oturum jetonu** taşıyacak; sorgu dizesi ise 2.3c'de zaten
 * loglardan çıkarılmıştı (`?token=…` redaksiyondan geçmeden satıra girerdi).
 * İkisinin Sentry'ye gitmesi ROADMAP'in *"KVKK açısından istenen varsayılan"*
 * niyetiyle çelişiyordu.
 *
 * Ek olarak `sendDefaultPii` v10'da **kullanımdan kaldırıldı** ve v11'de
 * silinecek. Sessizce silinseydi yukarıdaki varsayılanlar yürürlüğe girerdi.
 */

/** Anahtar-değer verisinin toplanma davranışı (Sentry `CollectBehavior`). */
export type TelemetryCollectBehavior = boolean | { allow: string[] } | { deny: string[] };

/** Sentry `DataCollection` ile yapısal olarak uyumlu politika şekli. */
export interface TelemetryDataCollection {
  readonly userInfo: boolean;
  readonly cookies: TelemetryCollectBehavior;
  readonly httpHeaders: { request: TelemetryCollectBehavior; response: TelemetryCollectBehavior };
  readonly httpBodies: readonly string[];
  readonly urlQueryParams: TelemetryCollectBehavior;
}

/**
 * Politika: **hiçbiri**.
 *
 * Teşhis için gereken bağlamı zaten kendi loglarımız taşıyor — `http.request`
 * (metot · yol · durum · süre) ve `http.exception` (kind · code · redakte
 * context). Sentry'nin ayrıca çerez ve başlık toplamasına ihtiyaç yok; olsa
 * bile bedeli, kazancından ağır.
 */
export const TELEMETRY_DATA_COLLECTION: TelemetryDataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: { request: false, response: false },
  httpBodies: [],
  urlQueryParams: false,
};
