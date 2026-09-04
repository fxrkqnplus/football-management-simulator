import { describe, expect, it } from 'vitest';

import {
  blendTowardWhite,
  CONTRAST_TARGET_AA,
  contrastRatio,
  ensureContrast,
  LINEARIZATION_THRESHOLD,
  linearizeChannel,
  pickAccessibleForeground,
  relativeLuminance,
} from './contrast.js';

/** WCAG 2.0'ın özgün metnindeki eşik. Bu testin karşı kontrolü. */
const LEGACY_THRESHOLD = 0.03928;

describe('relativeLuminance — TÜRETİLEBİLİR çapalar', () => {
  it('beyaz 1, siyah 0', () => {
    // Bu iki değer tanımdan geliyor, bir ölçümden değil: her kanal 255 iken
    // doğrusal değer 1, ve 0.2126 + 0.7152 + 0.0722 = 1.
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 12);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 12);
  });

  it('katsayılar toplamı 1 — saf kanallar bunu gösteriyor', () => {
    const r = relativeLuminance('#FF0000');
    const g = relativeLuminance('#00FF00');
    const b = relativeLuminance('#0000FF');
    expect(r).toBeCloseTo(0.2126, 12);
    expect(g).toBeCloseTo(0.7152, 12);
    expect(b).toBeCloseTo(0.0722, 12);
    expect(r + g + b).toBeCloseTo(1, 12);
  });

  it('küçük harfli hex de kabul ediliyor', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(relativeLuminance('#FFFFFF'), 12);
  });

  it('ALFA taşıyan token SESSİZCE KIRPILMIYOR, fırlatıyor', () => {
    // #00C46A26 sekiz haneli. parseInt ile kırpılsaydı hesap #00C46A'ya
    // yapılırdı ve hiçbir şey ötmezdi.
    expect(() => relativeLuminance('#00C46A26')).toThrow(TypeError);
  });

  it('#RGB kısaltması ve bozuk girdi fırlatıyor', () => {
    expect(() => relativeLuminance('#FFF')).toThrow(TypeError);
    expect(() => relativeLuminance('00C46A')).toThrow(TypeError);
    expect(() => relativeLuminance('#GGGGGG')).toThrow(TypeError);
    expect(() => relativeLuminance('')).toThrow(TypeError);
  });
});

describe('contrastRatio — TÜRETİLEBİLİR çapalar', () => {
  it('siyah–beyaz tam olarak 21', () => {
    // (1 + 0.05) / (0 + 0.05) = 21. Tanımdan.
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 10);
  });

  it('aynı renk tam olarak 1', () => {
    expect(contrastRatio('#7A2E38', '#7A2E38')).toBeCloseTo(1, 12);
  });

  it('simetrik — sıra sonucu değiştirmiyor', () => {
    expect(contrastRatio('#0B0E14', '#00C46A')).toBeCloseTo(
      contrastRatio('#00C46A', '#0B0E14'),
      12,
    );
  });

  it('her zaman ≥ 1', () => {
    expect(contrastRatio('#0B0E14', '#12161F')).toBeGreaterThanOrEqual(1);
  });
});

describe('DOĞRUSALLAŞTIRMA EŞİĞİ — 8 bit girdide iki değer EŞDEĞER', () => {
  it('256 kanal değerinin HEPSİNDE iki eşik aynı sonucu veriyor', () => {
    // Bu bir örnek testi değil, bir KANIT: iddia bu palete değil 8 bitlik
    // sRGB'nin kendisine bağlı. 0.03928 x 255 = 10,016… ve 0.04045 x 255 =
    // 10,315… — aralarında hiçbir tam sayı yok.
    for (let value = 0; value <= 255; value += 1) {
      const current = linearizeChannel(value, LINEARIZATION_THRESHOLD);
      const legacy = linearizeChannel(value, LEGACY_THRESHOLD);
      expect(current, `kanal ${String(value)}`).toBe(legacy);
    }
  });

  it('iki eşiğin arasına düşen tam sayı YOK — sınır adıyla ölçülüyor', () => {
    const lower = LEGACY_THRESHOLD * 255;
    const upper = LINEARIZATION_THRESHOLD * 255;
    expect(lower).toBeLessThan(upper);
    expect(Math.floor(lower)).toBe(Math.floor(upper));
    // 10 iki eşiğin de ALTINDA, 11 iki eşiğin de ÜSTÜNDE.
    expect(10 / 255).toBeLessThanOrEqual(LEGACY_THRESHOLD);
    expect(11 / 255).toBeGreaterThan(LINEARIZATION_THRESHOLD);
  });

  it('KARŞI KONTROL: eşik gerçekten bir dal seçiyor — uydurma bir değerle fark ÇIKIYOR', () => {
    // Yukarıdaki eşdeğerlik "fonksiyon eşiği hiç kullanmıyor" ile de geçerdi.
    // Bu vaka onu ayırıyor: makul olmayan bir eşik farklı sonuç veriyor.
    expect(linearizeChannel(50, 0.5)).not.toBe(linearizeChannel(50, LINEARIZATION_THRESHOLD));
  });
});

describe('ensureContrast — §7.1 kulüp rengi entegrasyonu', () => {
  const DARK_SURFACE = '#12161F';
  const LIGHT_SURFACE = '#FFFFFF';

  it('hedef zaten sağlanıyorsa renge DOKUNMUYOR', () => {
    const result = ensureContrast('#00C46A', DARK_SURFACE);
    expect(result.adjusted).toBe(false);
    expect(result.reachedTarget).toBe(true);
    expect(result.color).toBe('#00C46A');
    expect(result.lightenPercent).toBe(0);
    expect(result.ratio).toBeGreaterThanOrEqual(CONTRAST_TARGET_AA);
  });

  it('koyu zeminde düşük kontrastlı bir kulüp rengini AÇIKLAŞTIRIYOR', () => {
    // Koyu lacivert bir kulüp rengi: koyu zeminde okunmaz.
    const before = contrastRatio('#1B2A4A', DARK_SURFACE);
    expect(before).toBeLessThan(CONTRAST_TARGET_AA);

    const result = ensureContrast('#1B2A4A', DARK_SURFACE);
    expect(result.adjusted).toBe(true);
    expect(result.reachedTarget).toBe(true);
    expect(result.ratio).toBeGreaterThanOrEqual(CONTRAST_TARGET_AA);
    expect(result.lightenPercent).toBeGreaterThan(0);
  });

  it('EN AZ gereken kadar açıklaştırıyor — BİR ADIM AZI hedefi tutmuyor', () => {
    const result = ensureContrast('#1B2A4A', DARK_SURFACE);
    expect(result.reachedTarget).toBe(true);
    expect(result.lightenPercent).toBeGreaterThan(0);

    // GERÇEK minimallik kontrolü: bir önceki adım hedefin ALTINDA olmalı.
    // Bu satır olmadan test, %100 açıklaştıran bir uygulamayla da geçerdi.
    const oneStepLess = blendTowardWhite('#1B2A4A', result.lightenPercent - 1);
    expect(contrastRatio(oneStepLess, DARK_SURFACE)).toBeLessThan(CONTRAST_TARGET_AA);
  });

  it('blendTowardWhite: %0 aynı renk, %100 beyaz', () => {
    expect(blendTowardWhite('#1B2A4A', 0)).toBe('#1B2A4A');
    expect(blendTowardWhite('#1B2A4A', 100)).toBe('#FFFFFF');
  });

  it('AÇIK zeminde hedefe ULAŞILAMIYOR — ve bu SESSİZ DEĞİL', () => {
    // Spec'in fiili "açıklaştırmak"; açık zeminde beyaza yaklaşmak oranı
    // DÜŞÜRÜR. Fonksiyon koyulaştırma EKLEMİYOR (spec'te yazmıyor), sınırı
    // BEYAN EDİYOR.
    const result = ensureContrast('#00C46A', LIGHT_SURFACE);
    expect(result.reachedTarget).toBe(false);
    expect(result.ratio).toBeLessThan(CONTRAST_TARGET_AA);
    // Ulaşılamasa bile en iyi adayı döndürüyor, `undefined` ya da girdi değil.
    expect(result.color).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('beyaz zeminde beyaza karışım oranı ARTTIRMIYOR — en iyisi 0 adım', () => {
    const result = ensureContrast('#00C46A', LIGHT_SURFACE);
    expect(result.lightenPercent).toBe(0);
    expect(result.adjusted).toBe(false);
  });

  it('özel bir hedef oranı kabul ediyor', () => {
    const relaxed = ensureContrast('#00C46A', LIGHT_SURFACE, 2);
    expect(relaxed.reachedTarget).toBe(true);
    expect(relaxed.adjusted).toBe(false);
  });

  it('döndürülen renk geçerli bir 6 haneli hex', () => {
    const result = ensureContrast('#1B2A4A', DARK_SURFACE);
    expect(result.color).toMatch(/^#[0-9A-F]{6}$/);
  });
});

describe('pickAccessibleForeground', () => {
  it('koyu bantta AÇIK metni, açık bantta KOYU metni seçiyor', () => {
    const candidates = ['#E8ECF3', '#0B0E14'];
    // Bant 1-3 koyu kırmızı: açık metin kazanmalı.
    expect(pickAccessibleForeground('#7A2E38', candidates).color).toBe('#E8ECF3');
    // Bant 10-11 sarı: koyu metin kazanmalı.
    expect(pickAccessibleForeground('#BFA83C', candidates).color).toBe('#0B0E14');
  });

  it('döndürdüğü oran, seçtiği rengin gerçek oranı', () => {
    const picked = pickAccessibleForeground('#BFA83C', ['#E8ECF3', '#0B0E14']);
    expect(picked.ratio).toBeCloseTo(contrastRatio(picked.color, '#BFA83C'), 12);
  });

  it('eşitlikte İLK aday kazanıyor — deterministik', () => {
    const picked = pickAccessibleForeground('#808080', ['#000000', '#000000']);
    expect(picked.color).toBe('#000000');
  });

  it('tek aday varsa onu döndürüyor', () => {
    expect(pickAccessibleForeground('#7A2E38', ['#E8ECF3']).color).toBe('#E8ECF3');
  });

  it('boş aday listesi fırlatıyor', () => {
    expect(() => pickAccessibleForeground('#7A2E38', [])).toThrow(TypeError);
  });
});
