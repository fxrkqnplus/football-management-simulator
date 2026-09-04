import { describe, expect, it } from 'vitest';

import {
  ATTRIBUTE_BANDS,
  ATTRIBUTE_MAX,
  ATTRIBUTE_MIN,
  bandForAttribute,
  bandForAttributeRange,
} from './attribute-scale.js';

/** `docs/spec/05-design-system.md` §7.2'nin sekiz satırı, birebir. */
const SPEC_BANDS = [
  { min: 1, max: 3, color: '#7A2E38', label: 'çok zayıf' },
  { min: 4, max: 6, color: '#B04A3C', label: 'zayıf' },
  { min: 7, max: 9, color: '#C77E3A', label: 'vasat altı' },
  { min: 10, max: 11, color: '#BFA83C', label: 'vasat' },
  { min: 12, max: 13, color: '#8FA83C', label: 'iyi' },
  { min: 14, max: 15, color: '#5FA84C', label: 'çok iyi' },
  { min: 16, max: 17, color: '#34A85E', label: 'mükemmel' },
  { min: 18, max: 20, color: '#1FB58A', label: 'dünya klasmanı' },
];

describe('§7.2 bant envanteri', () => {
  it('sekiz bant spec ile BİREBİR — sınır, hex ve etiket', () => {
    // 4.5'in dersi: `length === 8` yanlış bir hex'i geçirir, `toEqual` geçirmez.
    expect(ATTRIBUTE_BANDS).toEqual(SPEC_BANDS);
  });

  it('ölçek sınırları §7.2 ile aynı (1–20)', () => {
    expect(ATTRIBUTE_MIN).toBe(1);
    expect(ATTRIBUTE_MAX).toBe(20);
    expect(ATTRIBUTE_BANDS[0].min).toBe(ATTRIBUTE_MIN);
    expect(ATTRIBUTE_BANDS.at(-1)?.max).toBe(ATTRIBUTE_MAX);
  });

  it('sekiz hex benzersiz — iki bant aynı rengi taşımıyor', () => {
    const colors = ATTRIBUTE_BANDS.map((b) => b.color);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('sekiz etiket benzersiz', () => {
    const labels = ATTRIBUTE_BANDS.map((b) => b.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('§7.2 KAPSAYICILIK — boşluk yok, çakışma yok', () => {
  it('1…20 arasındaki HER değer TAM OLARAK BİR banda düşüyor', () => {
    // 4.9'un ABILITY_BAND_WEIGHTS nöbetçisinin emsali: bir envanterin UZUNLUĞU
    // tek başına kör bir kontrol. `18-20` yerine `18-19` yazılsaydı uzunluk
    // yine 8 olurdu ve yalnızca bu test kırılırdı.
    for (let value = ATTRIBUTE_MIN; value <= ATTRIBUTE_MAX; value += 1) {
      const matches = ATTRIBUTE_BANDS.filter((b) => value >= b.min && value <= b.max);
      expect(matches, `değer ${String(value)}`).toHaveLength(1);
    }
  });

  it('bantlar bitişik ve artan — her bandın min değeri öncekinin max+1 değeri', () => {
    for (let i = 1; i < ATTRIBUTE_BANDS.length; i += 1) {
      const previous = ATTRIBUTE_BANDS[i - 1];
      const current = ATTRIBUTE_BANDS[i];
      expect(current?.min, `bant ${String(i)}`).toBe((previous?.max ?? 0) + 1);
    }
  });

  it('her bandın min değeri max değerinden büyük değil', () => {
    for (const band of ATTRIBUTE_BANDS) {
      expect(band.min).toBeLessThanOrEqual(band.max);
    }
  });

  it('bant genişlikleri EŞİT DEĞİL — uçlar 3, orta 2 (spec böyle)', () => {
    const widths = ATTRIBUTE_BANDS.map((b) => b.max - b.min + 1);
    expect(widths).toEqual([3, 3, 3, 2, 2, 2, 2, 3]);
    // Toplam 20: kapsayıcılık testinin ikinci bir yönden doğrulaması.
    expect(widths.reduce((a, b) => a + b, 0)).toBe(ATTRIBUTE_MAX);
  });
});

describe('bandForAttribute', () => {
  it('sınır değerleri doğru banda düşüyor', () => {
    expect(bandForAttribute(1).color).toBe('#7A2E38');
    expect(bandForAttribute(3).color).toBe('#7A2E38');
    expect(bandForAttribute(4).color).toBe('#B04A3C');
    expect(bandForAttribute(9).color).toBe('#C77E3A');
    expect(bandForAttribute(10).color).toBe('#BFA83C');
    expect(bandForAttribute(17).color).toBe('#34A85E');
    expect(bandForAttribute(18).color).toBe('#1FB58A');
    expect(bandForAttribute(20).color).toBe('#1FB58A');
  });

  it('aralık dışı değer SESSİZCE KIRPILMIYOR, fırlatıyor', () => {
    expect(() => bandForAttribute(0)).toThrow(RangeError);
    expect(() => bandForAttribute(21)).toThrow(RangeError);
    expect(() => bandForAttribute(-5)).toThrow(RangeError);
  });

  it('tam sayı olmayan değer fırlatıyor', () => {
    expect(() => bandForAttribute(12.5)).toThrow(RangeError);
    expect(() => bandForAttribute(Number.NaN)).toThrow(RangeError);
  });
});

describe('bandForAttributeRange — §7.2 belirsizlik gösterimi', () => {
  it('§7.2 örneği: 13–17 aralığının ortası 15', () => {
    expect(bandForAttributeRange(13, 17)).toEqual(bandForAttribute(15));
  });

  it('tek değerlik aralık, o değerin bandı', () => {
    expect(bandForAttributeRange(7, 7)).toEqual(bandForAttribute(7));
  });

  it('çift uzunluklu aralıkta AŞAĞI yuvarlıyor — kalibrasyon, spec değil', () => {
    // 13–16'nın ortası 14,5. Aşağı yuvarlama: 14. Yukarı yuvarlama 15 verirdi
    // ve oyuncuyu sistematik olarak daha iyi gösterirdi.
    expect(bandForAttributeRange(13, 16)).toEqual(bandForAttribute(14));
    expect(bandForAttributeRange(9, 12)).toEqual(bandForAttribute(10));
  });

  it('ters aralık fırlatıyor', () => {
    expect(() => bandForAttributeRange(17, 13)).toThrow(RangeError);
  });

  it('aralık dışı sınır fırlatıyor', () => {
    expect(() => bandForAttributeRange(19, 25)).toThrow(RangeError);
  });
});
