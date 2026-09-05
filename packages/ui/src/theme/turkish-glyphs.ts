/**
 * Türkçe'ye özgü kod noktaları — font alt kümesi kapsamının ÖLÇÜLEBİLİR hâli.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN BİR LİSTE, VE NEDEN KOD NOKTASI
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `docs/spec/05-design-system.md` §7.3: *"Türkçe karakterler (ğ Ğ ü Ü ş Ş ı İ
 * ö Ö ç Ç) her iki fontta tam desteklidir; alt küme (subset) oluştururken
 * `latin-ext` dahil edilmeli."*
 *
 * Bu cümle bir **iddia** ve iddialar ölçülür. Ölçmek için harfin kendisi değil
 * **kod noktası** gerekiyor: bir `unicode-range` aralıklarla yazılıyor
 * (`U+0100-02BA` gibi) ve *"ş bu aralıkta mı"* sorusu ancak `U+015F` ile
 * sorulabilir.
 *
 * ⚠️ **BU, 5.1'İN `İ`/`ı` TUZAĞININ KARDEŞİ AMA AYNISI DEĞİL.** Orası
 * **büyük/küçük harf dönüşümü** (`I`→`i` uyum sınıfını değiştirir, `İ`→`i̇`
 * dizeyi uzatır); burası **glif kapsamı** — hangi woff2 dosyasının o harfi
 * taşıdığı. İki ayrı soru, ikisi de Türkçe'ye özgü.
 */

/**
 * Türkçe alfabesinin Latin temelinden **ayrılan** on iki harfi, büyük ve
 * küçük çiftleriyle.
 *
 * ⚠️ Bir SAYI değil bir LİSTE: `fonts.test.ts` her kod noktasının **hangi alt
 * kümede** olduğunu tek tek ölçüyor, ve iki alt kümeye **bölündüklerini**
 * ayrıca iddia ediyor.
 */
export const TURKISH_CODE_POINTS = [
  { char: 'ç', codePoint: 0x00e7, name: 'LATIN SMALL LETTER C WITH CEDILLA' },
  { char: 'Ç', codePoint: 0x00c7, name: 'LATIN CAPITAL LETTER C WITH CEDILLA' },
  { char: 'ğ', codePoint: 0x011f, name: 'LATIN SMALL LETTER G WITH BREVE' },
  { char: 'Ğ', codePoint: 0x011e, name: 'LATIN CAPITAL LETTER G WITH BREVE' },
  { char: 'ı', codePoint: 0x0131, name: 'LATIN SMALL LETTER DOTLESS I' },
  { char: 'İ', codePoint: 0x0130, name: 'LATIN CAPITAL LETTER I WITH DOT ABOVE' },
  { char: 'ö', codePoint: 0x00f6, name: 'LATIN SMALL LETTER O WITH DIAERESIS' },
  { char: 'Ö', codePoint: 0x00d6, name: 'LATIN CAPITAL LETTER O WITH DIAERESIS' },
  { char: 'ş', codePoint: 0x015f, name: 'LATIN SMALL LETTER S WITH CEDILLA' },
  { char: 'Ş', codePoint: 0x015e, name: 'LATIN CAPITAL LETTER S WITH CEDILLA' },
  { char: 'ü', codePoint: 0x00fc, name: 'LATIN SMALL LETTER U WITH DIAERESIS' },
  { char: 'Ü', codePoint: 0x00dc, name: 'LATIN CAPITAL LETTER U WITH DIAERESIS' },
] as const;
