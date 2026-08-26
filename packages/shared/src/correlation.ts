/**
 * `correlationId` üretimi ve doğrulaması — `docs/spec/09` §11.1.
 *
 * ⚠️ K2 SINIRI — BU OYUN RASTGELELİĞİ DEĞİLDİR.
 * `SeededRng` kapsamına girmez ve `Math.random()` yasağı onu ilgilendirmez:
 * `correlationId` bir **izleme kimliğidir**, oyun kararlarına girmez, kayda
 * yazılmaz, liderlik tablosunu etkilemez. Deterministik olması hem gereksiz
 * hem zararlı olurdu (iki farklı isteğin aynı id'yi alması zinciri bozardı).
 *
 * Yine de motor bunu **import edemez**: `arch:check` `engine-forbidden-import`
 * kuralı `packages/engine`'in bu adları almasını yasaklar. Sebep K3 — motor
 * saftır; bir `correlationId` üretmek zaman ve entropi okumak demektir.
 * Motor iz (`debugTrace`) döndürür, kimliği çağıran taraf ilişkilendirir.
 *
 * ── NEDEN BAĞIMLILIK EKLENMEDİ ───────────────────────────────────────────
 * `uuid` paketi v7 üretiyor ama buradaki iş **biçimlendirmedir**: entropi
 * `crypto.getRandomValues`'tan geliyor (onu biz yazmıyoruz), geri kalanı
 * RFC 9562'nin bit yerleşimi. Yirmi beş satırlık, tamamı test edilebilir bir
 * fonksiyon için hem `DEPENDENCY-WATCH` satırı hem tarayıcı paketi ağırlığı
 * üstlenmek orantısız olurdu.
 *
 * ── NEDEN v4 DEĞİL v7 ────────────────────────────────────────────────────
 * `crypto.randomUUID()` hazır ama **v4** üretir — tamamen rastgele.
 * v7'nin ilk 48 biti milisaniye damgasıdır, yani id'ler **zaman sıralıdır**:
 * loglar kimliğe göre sıralandığında kronolojik çıkar ve veritabanı indeksinde
 * kümelenir. `spec/09` §11.1 bunu açıkça istiyor.
 */

/** İstek/yanıt başlığı. Tek yerde tanımlı; elle yazılmaz. */
export const CORRELATION_HEADER = 'x-correlation-id';

/** RFC 9562 UUID biçimi, sürüm ve varyant nibble'ları dahil. */
const UUID_V7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Herhangi bir RFC 9562 sürümünü kabul eden gevşek biçim. */
const UUID_ANY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
  return out;
}

/**
 * Yeni bir zaman sıralı `correlationId` üretir (UUID v7, RFC 9562).
 *
 * Yerleşim: 48 bit ms damgası · 4 bit sürüm (7) · 12 bit rastgele ·
 * 2 bit varyant (10) · 62 bit rastgele.
 *
 * @param now Damga kaynağı. Testlerin zamanı sabitleyebilmesi için parametre;
 *   üretimde çağrılmaz ve `Date.now()`a düşer.
 */
export function createCorrelationId(now: number = Date.now()): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // İlk 6 bayt: big-endian 48 bit milisaniye damgası.
  // `Number` 53 bit tam sayı taşıyabiliyor, 48 bit damga sığıyor —
  // BigInt gerekmiyor ve tarayıcı paketine ağırlık binmiyor.
  const ms = Math.floor(now);
  bytes[0] = (ms / 2 ** 40) & 0xff;
  bytes[1] = (ms / 2 ** 32) & 0xff;
  bytes[2] = (ms / 2 ** 24) & 0xff;
  bytes[3] = (ms / 2 ** 16) & 0xff;
  bytes[4] = (ms / 2 ** 8) & 0xff;
  bytes[5] = ms & 0xff;

  // 7. baytın üst nibble'ı sürüm (7), 9. baytın üst iki biti varyant (10).
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = toHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Bizim ürettiğimiz biçim mi (v7)? */
export function isCorrelationId(value: string): boolean {
  return UUID_V7_PATTERN.test(value);
}

/**
 * Dışarıdan gelen bir `X-Correlation-Id` kabul edilebilir mi?
 *
 * v7 ŞART DEĞİL, herhangi bir geçerli UUID kabul edilir. Gerekçe: zinciri
 * başlatan taraf her zaman biz olmayabiliriz — bir ters vekil, bir yük
 * dengeleyici veya ileride başka bir istemci kendi kimliğini üretebilir.
 * Sıkı v7 dayatmak, taşınan bir kimliği gereksiz yere atıp zinciri koparırdı.
 * Aranan şey biçim güvenliğidir: sabit uzunluk, sabit alfabe, enjeksiyon yok.
 */
export function isAcceptableCorrelationId(value: string): boolean {
  return UUID_ANY_PATTERN.test(value);
}

/**
 * Reddedilen bir başlık değerini loga yazılabilir hale getirir.
 *
 * Ham değer loga OLDUĞU GİBİ girmez: dış girdi keyfi uzunlukta olabilir,
 * satır sonu içerebilir (log enjeksiyonu) veya bir sırrın yanlışlıkla
 * başlığa konmuş hâli olabilir. Kısaltma bu üçünü birden kapatır.
 */
export function truncateForLog(value: string, maxLength = 24): string {
  const singleLine = value.replace(/[\r\n\t]/g, ' ');
  return singleLine.length <= maxLength ? singleLine : `${singleLine.slice(0, maxLength)}…`;
}
