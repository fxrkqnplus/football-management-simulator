/**
 * `Intl` tabanlı biçimlendiriciler — tarih, para, sayı.
 *
 * SAF: bağımlılık yok, `Math.random()` yok, **`Date.now()` yok**, modül
 * düzeyinde değiştirilebilir durum yok. `Intl` yerleşiktir (ECMA-402), yani
 * `CLAUDE.md` §2.4'ün *"`packages/shared` hiçbir paketi import etmez"* kuralını
 * ihlal etmiyor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * İKİ KATMAN AYRI TUTULUYOR — ve bu bir test stratejisi kararı
 * ────────────────────────────────────────────────────────────────────────────
 *
 * ① **`Intl`in ürettiği parçalar** — ICU'ya ait. Sürüm değişince değişebilir.
 * ② **Bizim son işlemimiz** — bugün tek bir şey: kısaltma son ekini küçültmek.
 *
 * `expect(formatMoneyCompact(1_200_000)).toBe('€1,2 mn')` iddiası **ikisini
 * birden** ölçer; kırıldığı gün hangisinin kırıldığı belli olmaz. Bu yüzden
 * testte üç ayrı iddia var: ICU'nun **parça yapısı**, bizim **saf son
 * işlemimiz**, ve kriterin **tam dizesi**.
 *
 * ⚠️ ÖLÇÜMÜN YAPILDIĞI ORTAM — bir gün kırılırsa İLK sorulacak soru budur:
 * **Node v24.19.0 · ICU 78.3 · CLDR 48.0 · Unicode 17.0 · tz 2026b.**
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ÖLÇÜLMÜŞ ÜÇ TUZAK
 * ────────────────────────────────────────────────────────────────────────────
 *
 * **① AYIRICI BOŞLUK U+00A0 (BÖLÜNMEZ), U+0020 DEĞİL.**
 * `€1,2 Mn` dizesinin kod noktaları: `U+20AC U+0031 U+002C U+0032 **U+00A0**
 * U+004D U+006E`. Normal boşlukla yazılmış bir karşılaştırma **eşleşmez**.
 * Boşluk **korunuyor** ve bu bilinçli: bölünmez boşluk sayı ile birimin satır
 * sonunda ayrılmasını engeller, yani doğru tipografi. Testte kod noktasıyla
 * ayrıca iddia ediliyor ki bir daha kimse tahmin etmesin.
 *
 * **② `compactDisplay: 'long'` PARA İLE ÇALIŞMIYOR.** Ölçüldü:
 * `style` verilmeden `1,2 milyon` / `1,5 bin` (zaten küçük harf) üretiyor, ama
 * `style: 'currency'` ile **`€1,2 Mn`**'e düşüyor — yani uzun biçim para
 * tarafında bir çözüm değil. Küçültmeyi biz yapmak zorundayız.
 *
 * **③ VARSAYILAN ZAMAN DİLİMİ SESSİZ BİR HATA KAYNAĞI.** Bu makinede
 * `Intl.DateTimeFormat().resolvedOptions().timeZone` → `Europe/Istanbul`.
 * Ölçülmüş sınır vakası: `2026-08-23T22:30:00Z` → UTC'de **23 Ağustos**,
 * İstanbul'da **24 Ağustos**. Yani zaman dilimi varsayılırsa aynı girdi
 * makineye göre **farklı gün** basar. `DEFAULT_TIME_ZONE` açıkça `'UTC'`;
 * çağıran isterse değiştirir, ama **varsayılan asla makineden gelmez**.
 */

/** Arayüz dili. İngilizce v2'de gelecek (`CLAUDE.md` §16.1). */
export const UI_LOCALE = 'tr-TR';

/**
 * Varsayılan zaman dilimi — makineden **okunmaz**.
 *
 * Gerekçe yukarıda ③'te ölçüldü. 4.9'un `SEED_REFERENCE_DATE` kararının
 * kardeşi: aynı girdi her makinede aynı çıktıyı vermeli.
 */
export const DEFAULT_TIME_ZONE = 'UTC';

/** Oyunun para birimi. TRY bu fazın kapsamında değil (K12). */
export const DEFAULT_CURRENCY = 'EUR';

/**
 * ICU'nun ürettiği kısaltma son ekleri — ÖLÇÜLMÜŞ ENVANTER, tahmin değil.
 *
 * `notation: 'compact'` bu dört basamağı üretiyor (eşikler de ölçüldü):
 * `1.000` → `B` · `1.000.000` → `Mn` · `1.000.000.000` → `Mr` ·
 * `1.000.000.000.000` → `Tn`. 1.000'in altında son ek **yok**.
 *
 * ⚠️ **Bu sabit bir davranış tanımı DEĞİL, bir NÖBETÇİ.** Merdiven bizim
 * değil ICU'nun; biz yalnızca son eki küçültüyoruz, yani yeni bir basamak
 * gelse de kod çalışır. Ama liste bir testte iddia ediliyor: ICU bir gün
 * farklı bir kısaltma üretirse **sessiz kalmasın**, bir insan baksın.
 */
export const COMPACT_SUFFIXES = ['B', 'Mn', 'Mr', 'Tn'] as const;

/** `formatDate` seçenekleri. */
export interface FormatDateOptions {
  /** IANA zaman dilimi. Varsayılan `DEFAULT_TIME_ZONE` — makineden okunmaz. */
  readonly timeZone?: string;
}

/** `formatMoneyCompact` seçenekleri. */
export interface FormatMoneyOptions {
  /** ISO 4217 kodu. Varsayılan `DEFAULT_CURRENCY`. */
  readonly currency?: string;
}

/**
 * ② KATMANI — saf son işlem, `Intl`den bağımsız test edilebilir.
 *
 * Yalnızca `type === 'compact'` parçasını küçültür; **dizenin tamamına
 * dokunmaz**. Gerekçe 5.1'de ölçüldü: Türkçe küçük harf dönüşümü güvenli
 * değildir — `I` uyum sınıfını değiştirir, `İ` dizeyi **uzatır**. Kural bu
 * yüzden dizeye değil **parçaya** uygulanıyor.
 *
 * Locale açıkça `tr` seçildi çünkü basılan metin Türkçe. Bugün fark
 * üretmiyor (`B`/`Mn`/`Mr`/`Tn` içinde `I` yok, ölçüldü) ama seçim
 * **ilkeseldir**, tesadüfe bırakılmadı.
 */
export function lowerCompactSuffix(parts: readonly Intl.NumberFormatPart[]): string {
  return parts
    .map((part) => (part.type === 'compact' ? part.value.toLocaleLowerCase('tr') : part.value))
    .join('');
}

/**
 * Tarihi `23 Ağustos 2026` biçiminde döner.
 *
 * `Date.now()` YOK: biçimlendirilecek an **parametre**. Zaman dilimi
 * varsayılmaz (dosya başı ③).
 */
export function formatDate(date: Date, options: FormatDateOptions = {}): string {
  return new Intl.DateTimeFormat(UI_LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: options.timeZone ?? DEFAULT_TIME_ZONE,
  }).format(date);
}

/**
 * Parayı `€1,2 mn` biçiminde döner.
 *
 * ⚠️ Ayırıcı **bölünmez boşluk** (U+00A0) — `Intl`den öyle geliyor ve
 * korunuyor (dosya başı ①).
 * ⚠️ Eksi işareti para simgesinden **önce** gelir (`-€1,2 mn`). Bu ICU'nun
 * tr-TR kararı; `signDisplay` seçeneklerinin **hiçbiri** konumu değiştirmiyor
 * (beşi de ölçüldü). Davranış gizlenmiyor, testte iddia ediliyor.
 */
export function formatMoneyCompact(amount: number, options: FormatMoneyOptions = {}): string {
  const parts = new Intl.NumberFormat(UI_LOCALE, {
    style: 'currency',
    currency: options.currency ?? DEFAULT_CURRENCY,
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).formatToParts(amount);

  return lowerCompactSuffix(parts);
}

/** Sayıyı Türkçe binlik/ondalık ayırıcılarıyla döner: `1.234.567` · `0,5`. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat(UI_LOCALE).format(value);
}
