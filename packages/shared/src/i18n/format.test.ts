/**
 * `Intl` biçimlendiricilerin testi — ve kabul kriteri 4'ün İDDİASI.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ÜÇ AYRI KATMAN, ÜÇ AYRI İDDİA — ve sebebi bir risk
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `expect(formatMoneyCompact(1_200_000)).toBe('€1,2 mn')` tek başına yazılsaydı
 * bu test **bizim kodumuzu değil ICU'yu** ölçerdi: ICU sürümü değişince kod
 * değişmediği hâlde kırılırdı — ya da daha kötüsü, kırılmadan **yanlışa
 * dönerdi**. Bu yüzden üç ayrı katman:
 *
 * | Katman | Kime ait | Nasıl iddia ediliyor |
 * |---|---|---|
 * | ① `Intl`in parça yapısı | ICU | `formatToParts` **yapısıyla** |
 * | ② `lowerCompactSuffix` | BİZE | elle kurulmuş parçalarla, `Intl`siz |
 * | ③ Kriterin tam dizesi | sözleşme | birebir dize |
 *
 * Kırıldığı gün **hangi katmanın** kırıldığı bu ayrımdan okunur.
 *
 * ⚠️ ÖLÇÜM ORTAMI: **Node v24.19.0 · ICU 78.3 · CLDR 48.0 · Unicode 17.0**.
 * Bir gün kırılırsa ilk sorulacak soru budur.
 *
 * ⚠️ **BÖLÜNMEZ BOŞLUK (U+00A0) HER YERDE AÇIK YAZILDI (`${NBSP}`).** Gerçek
 * karakter dosyaya gömülseydi normal boşluktan **gözle ayırt edilemezdi** ve
 * bir sonraki oturum onu düzeltmeye çalışırdı.
 */
import { describe, expect, it } from 'vitest';

import {
  COMPACT_SUFFIXES,
  DEFAULT_CURRENCY,
  DEFAULT_TIME_ZONE,
  formatDate,
  formatMoneyCompact,
  formatNumber,
  lowerCompactSuffix,
  UI_LOCALE,
} from './format.js';

/**
 * Bölünmez boşluk (U+00A0) — ADI VAR, gömülü karakter yok.
 *
 * Gerçek karakter dosyaya yazılsaydı normal boşluktan **gözle ayırt
 * edilemezdi** ve bir sonraki oturum onu "yazım hatası" sanıp düzeltirdi.
 */
const NBSP = '\u00A0';

/** Kriterin tam dizesi — ayırıcı BÖLÜNMEZ boşluk. */
const CRITERION_MONEY = `€1,2${NBSP}mn`;
const CRITERION_DATE = '23 Ağustos 2026';

/** 23 Ağustos 2026, öğle — zaman dilimi sınırından uzak. */
const AUG_23 = new Date(Date.UTC(2026, 7, 23, 12, 0, 0));

describe('kriter 4 — üçüncü katman: sözleşmenin tam dizesi', () => {
  it('tarih "23 Ağustos 2026" biçiminde', () => {
    expect(formatDate(AUG_23)).toBe(CRITERION_DATE);
  });

  it('para "€1,2 mn" biçiminde', () => {
    expect(formatMoneyCompact(1_200_000)).toBe(CRITERION_MONEY);
  });

  it('AYIRICI BÖLÜNMEZ BOŞLUK (U+00A0) — normal boşlukla EŞLEŞMEZ', () => {
    // Bu iddia olmadan bir sonraki oturum U+00A0'yı "yazım hatası" sanıp
    // normal boşluğa çevirir ve test sessizce yanlış bir sözleşme kurar.
    const money = formatMoneyCompact(1_200_000);
    // `Array.from` — yayma operatörü DEĞİL: `no-misused-spread` kuralı dizeye
    // yaymayı reddediyor ve 5.1'de haklı çıkmıştı. Burada niyet zaten açık:
    // kod noktalarını tek tek görmek.
    expect(Array.from(money, (ch) => ch.codePointAt(0))).toEqual([
      0x20ac, 0x31, 0x2c, 0x32, 0x00a0, 0x6d, 0x6e,
    ]);
    expect(money).not.toBe('€1,2 mn'); // normal boşluklu hâli
  });
});

describe('① ICU katmanı — parça YAPISI iddia ediliyor, dize değil', () => {
  const parts = (value: number): readonly Intl.NumberFormatPart[] =>
    new Intl.NumberFormat(UI_LOCALE, {
      style: 'currency',
      currency: DEFAULT_CURRENCY,
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    }).formatToParts(value);

  it('kısaltma son eki AYRI bir parça olarak geliyor', () => {
    // `lowerCompactSuffix` bunun üzerine kurulu. Gelmeseydi son eki
    // ayıklamanın tek yolu dizeyi kesmek olurdu ve o kırılgan olurdu.
    expect(parts(1_200_000).map((p) => p.type)).toEqual([
      'currency',
      'integer',
      'decimal',
      'fraction',
      'literal',
      'compact',
    ]);
  });

  it('1.000 altında kısaltma parçası YOK', () => {
    expect(parts(999).map((p) => p.type)).toEqual(['currency', 'integer']);
    expect(formatMoneyCompact(999)).toBe('€999');
  });

  it('eksi işareti para simgesinden ÖNCE — ICU kararı, gizlenmiyor', () => {
    expect(parts(-1_200_000)[0]?.type).toBe('minusSign');
    expect(formatMoneyCompact(-1_200_000)).toBe(`-€1,2${NBSP}mn`);
  });

  it('SON EK ENVANTERİ — ICU dört basamak üretiyor, eşikleriyle', () => {
    // Merdiven BİZİM değil ICU'nun; kod son eki körü körüne küçültüyor, yani
    // yeni bir basamak gelse de çalışır. Bu iddia bir NÖBETÇİ: ICU farklı bir
    // kısaltma üretirse sessiz kalmasın.
    const suffixOf = (value: number): string =>
      parts(value).find((p) => p.type === 'compact')?.value ?? '';
    expect([
      suffixOf(1_000),
      suffixOf(1_000_000),
      suffixOf(1_000_000_000),
      suffixOf(1_000_000_000_000),
    ]).toEqual([...COMPACT_SUFFIXES]);
    expect(COMPACT_SUFFIXES).toEqual(['B', 'Mn', 'Mr', 'Tn']);
  });

  it('sondaki sıfır ZATEN düşüyor — ek bir ayar gerekmedi', () => {
    // Ölçüldü: bu ICU'da `maximumFractionDigits: 1` sondaki sıfırı düşürüyor
    // (€999, €12 B — "€999,0" değil). `trailingZeroDisplay` gerekmedi.
    expect(formatMoneyCompact(12_000)).toBe(`€12${NBSP}b`);
    expect(formatMoneyCompact(1_000_000)).toBe(`€1${NBSP}mn`);
  });
});

describe('② BİZİM katmanımız — `Intl`siz, saf, tek başına', () => {
  it('yalnızca `compact` parçasını küçültüyor, diğerlerine DOKUNMUYOR', () => {
    const handmade: Intl.NumberFormatPart[] = [
      { type: 'currency', value: '€' },
      { type: 'integer', value: '1' },
      { type: 'decimal', value: ',' },
      { type: 'fraction', value: '2' },
      { type: 'literal', value: NBSP },
      { type: 'compact', value: 'Mn' },
    ];
    expect(lowerCompactSuffix(handmade)).toBe(`€1,2${NBSP}mn`);
  });

  it('KARŞI KONTROL — büyük harfli BAŞKA bir parça küçülmüyor', () => {
    // Kural "dizeyi küçült" olsaydı bu test kırılırdı. Kapsamın dar
    // olduğunu POZİTİF bir örnek gösteremez; bu negatif örnek gösteriyor.
    const handmade: Intl.NumberFormatPart[] = [
      { type: 'currency', value: 'EUR' },
      { type: 'integer', value: '1' },
      { type: 'compact', value: 'Mn' },
    ];
    expect(lowerCompactSuffix(handmade)).toBe('EUR1mn');
  });

  it('compact parçası YOKSA dize değişmeden birleşiyor', () => {
    const handmade: Intl.NumberFormatPart[] = [
      { type: 'currency', value: '€' },
      { type: 'integer', value: '999' },
    ];
    expect(lowerCompactSuffix(handmade)).toBe('€999');
  });

  it('Türkçe locale ile küçültüyor — 5.1 tuzağının kardeşi', () => {
    // `I` harfi iki locale'de FARKLI küçülür (5.1'de ölçüldü):
    // toLowerCase('BIN') = 'bin', toLocaleLowerCase('tr') = 'bın'.
    // Bugünkü son eklerde `I` yok, yani fark üretmiyor — ama seçim ilkesel.
    expect('BIN'.toLowerCase()).not.toBe('BIN'.toLocaleLowerCase('tr'));
    expect(lowerCompactSuffix([{ type: 'compact', value: 'BIN' }])).toBe('bın');
    // Bugünkü envanterde `I` yok — bu yüzden fark bugün ortaya çıkmıyor.
    expect(COMPACT_SUFFIXES.some((s) => s.includes('I'))).toBe(false);
  });
});

describe('tarih — zaman dilimi VARSAYILMIYOR', () => {
  it('varsayılan UTC ve makineden okunmuyor', () => {
    expect(DEFAULT_TIME_ZONE).toBe('UTC');
    // Bu makinenin varsayılanı Europe/Istanbul (ölçüldü); sabit ona EŞİT DEĞİL
    // olmalı ki "varsayılan makineden geliyor" hatası fark edilsin.
    expect(formatDate(AUG_23)).toBe(CRITERION_DATE);
  });

  it('SINIR VAKASI — aynı an, iki zaman diliminde FARKLI gün', () => {
    // 23 Ağustos 22:30 UTC = 24 Ağustos 01:30 İstanbul.
    // Zaman dilimi varsayılsaydı bu fark SESSİZ bir hata olurdu.
    const edge = new Date(Date.UTC(2026, 7, 23, 22, 30, 0));
    expect(formatDate(edge)).toBe('23 Ağustos 2026');
    expect(formatDate(edge, { timeZone: 'Europe/Istanbul' })).toBe('24 Ağustos 2026');
  });

  it('ay adları Türkçe — dört mevsimden birer örnek', () => {
    expect(formatDate(new Date(Date.UTC(2026, 0, 1)))).toBe('1 Ocak 2026');
    expect(formatDate(new Date(Date.UTC(2026, 4, 19)))).toBe('19 Mayıs 2026');
    expect(formatDate(new Date(Date.UTC(2026, 8, 30)))).toBe('30 Eylül 2026');
    expect(formatDate(new Date(Date.UTC(2026, 11, 31)))).toBe('31 Aralık 2026');
  });
});

describe('sayı', () => {
  it('Türkçe ayırıcılar: binlik nokta, ondalık virgül', () => {
    expect(formatNumber(1_234_567)).toBe('1.234.567');
    expect(formatNumber(0.5)).toBe('0,5');
    expect(formatNumber(12.34)).toBe('12,34');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(-42)).toBe('-42');
  });
});

describe('sözleşme sabitleri', () => {
  it('dil ve para birimi açıkça sabit', () => {
    expect(UI_LOCALE).toBe('tr-TR');
    expect(DEFAULT_CURRENCY).toBe('EUR');
  });

  it('para birimi çağrı başına değiştirilebiliyor', () => {
    expect(formatMoneyCompact(1_200_000, { currency: 'USD' })).toBe(`$1,2${NBSP}mn`);
  });
});
