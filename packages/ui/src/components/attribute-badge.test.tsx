/**
 * AttributeBadge testleri — sözleşme 6.6 §1.1'in iddiaları.
 *
 * ⚠️ **ALFA SAYISI BURAYA KOPYALANMIYOR, KURAL YENİDEN KOŞTURULUYOR.**
 * `ATTRIBUTE_PATTERN_ALPHA` dosya başında *"ölçüldü"* diye yazılı; ölçüm
 * yeniden yapılmazsa o cümle bayat bir iddiaya döner (DZ-01). Aşağıdaki
 * `largestPassingAlpha` sözleşmenin kuralını (0,05 adım · sekiz bant · seçilen
 * ön plan · bileşke ≥ 4,5) gerçek `contrast.ts` fonksiyonlarıyla koşturuyor
 * ve sabitin ona **eşit** olduğunu iddia ediyor. Karşı kontrol: aynı kural
 * **beyaz** mürekkeple 0 veriyor — mürekkep beyaza dönerse ilk kırılan bu.
 *
 * ⚠️ **jsdom SINIRI:** `getComputedStyle` `var()` çözmüyor, `background-image`
 * uygulanmıyor (6.0 ölçümü). Burada sınıf adı, inline `--band-pattern`
 * değişkeni ve `style.backgroundColor` iddia ediliyor — jsdom hex'i
 * `rgb(r, g, b)`ye çeviriyor, karşılaştırma o biçimle. Çizginin gerçekten
 * çizildiği **Faz 17** (G-02) / **Faz 49** (G-05).
 *
 * **TAKLİT ETMEDİĞİ:** CVD modunun açılması (`[data-cvd]` setter'ı 6.8) —
 * burada yalnızca seçici literali ve onun `CVD_ATTRIBUTE` ile çakıştığı
 * iddia ediliyor; sınıfın derlendiği bileşen başlığında `compile` ile
 * ölçüldü, testte değil.
 */
import { screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { renderWithI18n, testI18n, testText } from '../test/render.js';
import { CVD_ATTRIBUTE } from '../theme/apply-theme.js';
import {
  ATTRIBUTE_BANDS,
  ATTRIBUTE_MAX,
  ATTRIBUTE_MIN,
  bandForAttribute,
} from '../tokens/attribute-scale.js';
import { DARK_COLOR_TOKENS } from '../tokens/color.js';
import {
  blendTowardBlack,
  blendTowardWhite,
  CONTRAST_TARGET_AA,
  contrastRatio,
} from '../tokens/contrast.js';
import * as AttributeBadgeModule from './attribute-badge.js';
import {
  ATTRIBUTE_BADGE_CVD_CLASSES,
  ATTRIBUTE_BADGE_CVD_SELECTOR,
  ATTRIBUTE_BADGE_FOREGROUNDS,
  ATTRIBUTE_BADGE_KEYS,
  ATTRIBUTE_BADGE_SIZE_CLASSES,
  ATTRIBUTE_BADGE_SIZES,
  ATTRIBUTE_BAND_KEY_ORDER,
  ATTRIBUTE_BAND_PATTERNS,
  ATTRIBUTE_PATTERN_ALPHA,
  ATTRIBUTE_PATTERN_GEOMETRY,
  AttributeBadge,
  attributeBadgeForeground,
  attributeBandPattern,
  attributePatternComposite,
  formatAttributeValue,
} from './attribute-badge.js';

const EN_DASH = String.fromCodePoint(0x2013);

/** `common:ui.attributeBadge.label` → i18next deposundaki yol (`ui.attributeBadge.label`). */
const labelStorePath = ATTRIBUTE_BADGE_KEYS.label.split(':')[1] ?? '';
const LABEL_TEMPLATE = `${testText(ATTRIBUTE_BADGE_KEYS.label)}|{{value}}|{{band}}`;

beforeAll(() => {
  expect(labelStorePath).not.toBe('');
  testI18n().addResource('tr', 'common', labelStorePath, LABEL_TEMPLATE);
});

afterAll(() => {
  testI18n().addResource('tr', 'common', labelStorePath, testText(ATTRIBUTE_BADGE_KEYS.label));
});

/** jsdom `style.backgroundColor`ı `rgb(r, g, b)` olarak serileştiriyor. */
const hexToRgbCss = (hex: string): string => {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgb(${String(r)}, ${String(g)}, ${String(b)})`;
};

const bandIndexOf = (value: number): number =>
  ATTRIBUTE_BANDS.findIndex((band) => band === bandForAttribute(value));

/** Sözleşmenin kuralı — 0,05 adım, tek yer. `alpha × 100` yüzdeyi verir. */
type Blend = (hex: string, percent: number) => string;

const ALPHA_STEPS = 20; // 0 … 1, 0,05 adımla → 21 aday

function passesAt(alpha: number, blend: Blend): boolean {
  return ATTRIBUTE_BANDS.every((band) => {
    const composite = blend(band.color, Math.round(alpha * 100));
    const bestFloor = Math.max(
      ...ATTRIBUTE_BADGE_FOREGROUNDS.map((candidate) =>
        Math.min(contrastRatio(candidate, band.color), contrastRatio(candidate, composite)),
      ),
    );
    return bestFloor >= CONTRAST_TARGET_AA;
  });
}

function largestPassingAlpha(blend: Blend): number {
  const passing: number[] = [];
  for (let step = 0; step <= ALPHA_STEPS; step += 1) {
    const alpha = step / ALPHA_STEPS;
    if (passesAt(alpha, blend)) passing.push(alpha);
  }
  return Math.max(...passing);
}

describe('anahtar sözleşmesi — grup `attributeBadge`, DÜZ nesne, modül başına TEK `_KEYS`', () => {
  it('her değer `common:ui.attributeBadge.` ile başlıyor ve düz bir dize', () => {
    for (const [name, value] of Object.entries(ATTRIBUTE_BADGE_KEYS)) {
      expect(typeof value, name).toBe('string');
      expect(value, name).toMatch(
        /^common:ui\.attributeBadge\.[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)*$/,
      );
    }
  });

  it('modül `_KEYS` ile biten TAM BİR şey dışa aktarıyor', () => {
    const keysExports = Object.keys(AttributeBadgeModule).filter((name) => name.endsWith('_KEYS'));
    expect(keysExports).toEqual(['ATTRIBUTE_BADGE_KEYS']);
  });

  it('bant sırası → anahtar adı: `ATTRIBUTE_BANDS` kadar, hepsi farklı, hepsi kayıtlı', () => {
    expect(ATTRIBUTE_BAND_KEY_ORDER).toHaveLength(ATTRIBUTE_BANDS.length);
    expect(new Set(ATTRIBUTE_BAND_KEY_ORDER).size).toBe(ATTRIBUTE_BANDS.length);
    for (const name of ATTRIBUTE_BAND_KEY_ORDER) {
      expect(ATTRIBUTE_BADGE_KEYS[name]).toMatch(/^common:ui\.attributeBadge\.band\./);
    }
  });

  it('bant anahtarları + `unknown` + `label` = anahtar nesnesinin tamamı', () => {
    const names = Object.keys(ATTRIBUTE_BADGE_KEYS).sort();
    expect(names).toEqual([...ATTRIBUTE_BAND_KEY_ORDER, 'label', 'unknown'].sort());
  });
});

describe('ön plan — HESAP, tercih değil (sözleşme §0 istisna ②)', () => {
  it('adaylar koyu temanın iki metin token DEĞERİ — liste, sıra deterministik', () => {
    expect(ATTRIBUTE_BADGE_FOREGROUNDS).toEqual([
      DARK_COLOR_TOKENS['--text-primary'],
      DARK_COLOR_TOKENS['--text-inverse'],
    ]);
  });

  it('her bant için seçilen aday listeden ve hem düz hem bileşke üzerinde AA', () => {
    let audited = 0;
    for (const band of ATTRIBUTE_BANDS) {
      const picked = attributeBadgeForeground(band);
      expect(ATTRIBUTE_BADGE_FOREGROUNDS).toContain(picked);
      expect(contrastRatio(picked, band.color), `${band.label} düz`).toBeGreaterThanOrEqual(
        CONTRAST_TARGET_AA,
      );
      expect(
        contrastRatio(picked, attributePatternComposite(band.color)),
        `${band.label} bileşke`,
      ).toBeGreaterThanOrEqual(CONTRAST_TARGET_AA);
      audited += 1;
    }
    expect(audited).toBe(ATTRIBUTE_BANDS.length);
  });

  it('KARŞI KONTROL: iki aday da gerçekten seçiliyor — tek renk yetseydi liste gereksizdi', () => {
    const picked = new Set(ATTRIBUTE_BANDS.map((band) => attributeBadgeForeground(band)));
    expect(picked.size).toBe(ATTRIBUTE_BADGE_FOREGROUNDS.length);
  });

  it('seçim, iki oranın DÜŞÜĞÜNÜ en yüksek yapan aday — kural yeniden koşturuluyor', () => {
    for (const band of ATTRIBUTE_BANDS) {
      const composite = attributePatternComposite(band.color);
      const floors = ATTRIBUTE_BADGE_FOREGROUNDS.map((candidate) =>
        Math.min(contrastRatio(candidate, band.color), contrastRatio(candidate, composite)),
      );
      const bestFloor = Math.max(...floors);
      const winner = ATTRIBUTE_BADGE_FOREGROUNDS[floors.indexOf(bestFloor)];
      expect(attributeBadgeForeground(band), band.label).toBe(winner);
    }
  });
});

describe('desen alfası — ÖLÇÜM yeniden koşturuluyor, sayı kopyalanmıyor', () => {
  it('siyah mürekkeple 0,05 adımlarla en büyük geçen alfa = ATTRIBUTE_PATTERN_ALPHA', () => {
    expect(largestPassingAlpha(blendTowardBlack)).toBeCloseTo(ATTRIBUTE_PATTERN_ALPHA, 10);
  });

  it('bir adım fazlası (alfa + 0,05) EN AZ BİR bandı AA altına düşürüyor — minimallik değil, maksimallik', () => {
    expect(passesAt(ATTRIBUTE_PATTERN_ALPHA, blendTowardBlack)).toBe(true);
    expect(passesAt(ATTRIBUTE_PATTERN_ALPHA + 1 / ALPHA_STEPS, blendTowardBlack)).toBe(false);
  });

  it('KARŞI KONTROL: BEYAZ mürekkeple aynı kural 0 veriyor — sözleşmenin literali ölü kanal', () => {
    // Bant 1 (`#B04A3C`) düz zeminde 4,5'in hemen üstünde; her beyaz karışım
    // onu AA'nın altına düşürüyor. Mürekkep beyaza dönerse ilk kırılan bu.
    expect(largestPassingAlpha(blendTowardWhite)).toBe(0);
  });

  it('bileşke, siyaha karışım — `blendTowardBlack(color, alfa×100)` ile birebir', () => {
    for (const band of ATTRIBUTE_BANDS) {
      expect(attributePatternComposite(band.color)).toBe(
        blendTowardBlack(band.color, Math.round(ATTRIBUTE_PATTERN_ALPHA * 100)),
      );
    }
    expect(attributePatternComposite('#808080', 0)).toBe('#808080');
  });

  it('alfa 0…1 aralığında ve 0,05 ızgarasında', () => {
    expect(ATTRIBUTE_PATTERN_ALPHA).toBeGreaterThan(0);
    expect(ATTRIBUTE_PATTERN_ALPHA).toBeLessThanOrEqual(1);
    expect((ATTRIBUTE_PATTERN_ALPHA * ALPHA_STEPS) % 1).toBeCloseTo(0, 10);
  });
});

describe('desen envanteri — SEKİZ FARKLI desen, sayı listeden', () => {
  it('geometri ve desen listeleri `ATTRIBUTE_BANDS` uzunluğunda', () => {
    expect(ATTRIBUTE_PATTERN_GEOMETRY).toHaveLength(ATTRIBUTE_BANDS.length);
    expect(ATTRIBUTE_BAND_PATTERNS).toHaveLength(ATTRIBUTE_BANDS.length);
  });

  it('desenlerin HEPSİ farklı — tek desen komşu bantları ayırmaz', () => {
    expect(new Set(ATTRIBUTE_BAND_PATTERNS).size).toBe(ATTRIBUTE_BANDS.length);
  });

  it('komşu bantlar AÇIYLA ayrılıyor — kalibrasyonun iddiası', () => {
    for (let index = 0; index < ATTRIBUTE_PATTERN_GEOMETRY.length - 1; index += 1) {
      const current = ATTRIBUTE_PATTERN_GEOMETRY[index];
      const next = ATTRIBUTE_PATTERN_GEOMETRY[index + 1];
      expect(current?.angle, `bant ${String(index)}↔${String(index + 1)}`).not.toBe(next?.angle);
    }
  });

  it('her desen `repeating-linear-gradient` ve SİYAH mürekkep taşıyor, alfa sabitle', () => {
    for (const pattern of ATTRIBUTE_BAND_PATTERNS) {
      expect(pattern).toMatch(/^repeating-linear-gradient\(\d+deg, /);
      expect(pattern).toContain(`rgba(0,0,0,${String(ATTRIBUTE_PATTERN_ALPHA)})`);
      expect(pattern).not.toContain('rgba(255,255,255');
    }
  });

  it('liste, saf fonksiyonun sabit alfayla çıktısıyla birebir', () => {
    ATTRIBUTE_BANDS.forEach((_, index) => {
      expect(ATTRIBUTE_BAND_PATTERNS[index]).toBe(
        attributeBandPattern(index, ATTRIBUTE_PATTERN_ALPHA),
      );
    });
  });

  it('`attributeBandPattern` sıra ve alfa dışında RangeError — sessiz kırpma yok', () => {
    expect(() => attributeBandPattern(-1, 0.1)).toThrow(RangeError);
    expect(() => attributeBandPattern(ATTRIBUTE_BANDS.length, 0.1)).toThrow(RangeError);
    expect(() => attributeBandPattern(1.5, 0.1)).toThrow(RangeError);
    expect(() => attributeBandPattern(0, -0.05)).toThrow(RangeError);
    expect(() => attributeBandPattern(0, 1.05)).toThrow(RangeError);
    expect(() => attributeBandPattern(0, Number.NaN)).toThrow(RangeError);
    // Uçlar geçerli.
    expect(attributeBandPattern(0, 0)).toContain('rgba(0,0,0,0)');
    expect(attributeBandPattern(ATTRIBUTE_BANDS.length - 1, 1)).toContain('rgba(0,0,0,1)');
  });
});

describe('CVD aktivasyonu — TEK yol, seçici `CVD_ATTRIBUTE` ile çakışık', () => {
  it('seçici sabiti `[data-cvd]` — `CVD_ATTRIBUTE`ten türetilmiş', () => {
    expect(ATTRIBUTE_BADGE_CVD_SELECTOR).toBe(`[${CVD_ATTRIBUTE}]`);
  });

  it('İKİ sınıf literali de `[[data-cvd]_&]:` ile başlıyor — keyfi varyant, seçici içeride', () => {
    // Tailwind keyfi varyantı `[<seçici>]:`; seçici `[data-cvd]_&` olduğu için
    // literal ÇİFT köşeli parantezle başlıyor. Ön ek seçici sabitinden kuruluyor.
    const variantPrefix = `[${ATTRIBUTE_BADGE_CVD_SELECTOR}_&]:`;
    expect(variantPrefix).toBe(`[[${CVD_ATTRIBUTE}]_&]:`);
    const classes = ATTRIBUTE_BADGE_CVD_CLASSES.split(' ');
    expect(classes).toHaveLength(2);
    for (const cls of classes) {
      expect(cls.startsWith(variantPrefix), cls).toBe(true);
    }
    expect(classes).toContain(`${variantPrefix}font-bold`);
    expect(classes).toContain(`${variantPrefix}[background-image:var(--band-pattern)]`);
  });
});

describe('`formatAttributeValue` — saf, JSX dışında', () => {
  it('değer → ondalıksız dize; aralık → U+2013 ayraçlı', () => {
    expect(formatAttributeValue(15)).toBe('15');
    expect(formatAttributeValue(ATTRIBUTE_MIN)).toBe('1');
    expect(formatAttributeValue(ATTRIBUTE_MAX)).toBe('20');
    const range = formatAttributeValue([13, 17]);
    expect(range).toBe(`13${EN_DASH}17`);
    expect(range.codePointAt(2)).toBe(0x2013);
    expect(range).not.toContain('-');
  });

  it('değer 1–20 tam sayı değilse RangeError', () => {
    for (const bad of [0, 21, 1.5, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => formatAttributeValue(bad), String(bad)).toThrow(RangeError);
    }
  });

  it('aralık: uçlar 1–20 tam sayı ve `min < max` — eşit uçlar bir aralık DEĞİL', () => {
    expect(() => formatAttributeValue([0, 5])).toThrow(RangeError);
    expect(() => formatAttributeValue([5, 21])).toThrow(RangeError);
    expect(() => formatAttributeValue([2.5, 7])).toThrow(RangeError);
    expect(() => formatAttributeValue([17, 13])).toThrow(RangeError);
    expect(() => formatAttributeValue([13, 13])).toThrow(RangeError);
    expect(() => formatAttributeValue([13, 13])).toThrow(/value/);
  });
});

describe('boyut ve sınıf sözleşmesi — etiketli değerler', () => {
  it('her boyutun sınıfı var ve yazı boyutu `length:` etiketli (ölçüldü)', () => {
    expect(Object.keys(ATTRIBUTE_BADGE_SIZE_CLASSES).sort()).toEqual(
      [...ATTRIBUTE_BADGE_SIZES].sort(),
    );
    for (const size of ATTRIBUTE_BADGE_SIZES) {
      expect(ATTRIBUTE_BADGE_SIZE_CLASSES[size]).toMatch(/text-\[length:var\(--text-[a-z0-9]+\)\]/);
      expect(ATTRIBUTE_BADGE_SIZE_CLASSES[size]).not.toMatch(/text-\[var\(/);
      expect(ATTRIBUTE_BADGE_SIZE_CLASSES[size]).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
});

describe('AttributeBadge — render (değer)', () => {
  it('sayıyı basıyor, bant zeminini ve hesaplanmış ön planı inline taşıyor', () => {
    const value = 15;
    const index = bandIndexOf(value);
    const band = ATTRIBUTE_BANDS[index];
    renderWithI18n(<AttributeBadge value={value} />);
    const badge = screen.getByText('15');
    expect(badge.tagName).toBe('SPAN');
    expect(badge.getAttribute('data-band-index')).toBe(String(index));
    expect(badge.style.backgroundColor).toBe(hexToRgbCss(band?.color ?? ''));
    expect(badge.style.color).toBe(hexToRgbCss(attributeBadgeForeground(bandForAttribute(value))));
  });

  it('`--band-pattern` HER ZAMAN inline — bandın kendi deseni', () => {
    const value = 3;
    const index = bandIndexOf(value);
    renderWithI18n(<AttributeBadge value={value} />);
    const badge = screen.getByText('3');
    expect(badge.style.getPropertyValue('--band-pattern')).toBe(ATTRIBUTE_BAND_PATTERNS[index]);
  });

  it('`aria-label` = t(label, { value, band }) — bant adı `t()` üzerinden, anahtar iddia ediliyor', () => {
    const value = 15;
    const keyName = ATTRIBUTE_BAND_KEY_ORDER[bandIndexOf(value)];
    expect(keyName).toBeDefined();
    renderWithI18n(<AttributeBadge value={value} />);
    expect(screen.getByText('15').getAttribute('aria-label')).toBe(
      `${testText(ATTRIBUTE_BADGE_KEYS.label)}|15|${testText(
        ATTRIBUTE_BADGE_KEYS[keyName ?? 'bandVeryPoor'],
      )}`,
    );
  });

  it('1…20 her değer çiziliyor ve bant sırası `bandForAttribute` ile aynı — kapsayıcılık', () => {
    for (let value = ATTRIBUTE_MIN; value <= ATTRIBUTE_MAX; value += 1) {
      const { unmount } = renderWithI18n(<AttributeBadge value={value} />);
      const badge = screen.getByText(String(value));
      expect(badge.getAttribute('data-band-index')).toBe(String(bandIndexOf(value)));
      unmount();
    }
  });

  it('temel sınıflar: mono yazı tipi `family-name:` etiketli, tabular, orta ağırlık, CVD literalleri', () => {
    renderWithI18n(<AttributeBadge value={10} />);
    const cls = screen.getByText('10').className;
    expect(cls).toContain('font-[family-name:var(--font-mono)]');
    expect(cls).toContain('tabular-nums');
    expect(cls).toContain('font-medium');
    for (const cvd of ATTRIBUTE_BADGE_CVD_CLASSES.split(' ')) {
      expect(cls).toContain(cvd);
    }
    expect(cls).not.toMatch(/font-\[var\(/);
  });

  it('varsayılan `md`; `sm` kendi sınıfını taşıyor', () => {
    const { unmount } = renderWithI18n(<AttributeBadge value={10} />);
    expect(screen.getByText('10').className).toContain(ATTRIBUTE_BADGE_SIZE_CLASSES.md);
    unmount();
    renderWithI18n(<AttributeBadge value={10} size="sm" />);
    expect(screen.getByText('10').className).toContain(ATTRIBUTE_BADGE_SIZE_CLASSES.sm);
    expect(screen.getByText('10').className).not.toContain(ATTRIBUTE_BADGE_SIZE_CLASSES.md);
  });

  it('`className` birleşiyor, diğer `span` nitelikleri geçiyor', () => {
    renderWithI18n(<AttributeBadge value={10} className="ml-1" data-testid="ab" />);
    const badge = screen.getByTestId('ab');
    expect(badge.className).toContain('ml-1');
    expect(badge.textContent).toBe('10');
  });
});

describe('AttributeBadge — render (aralık)', () => {
  it('`13–17` basıyor; rengi ARALIĞIN ORTASI belirliyor', () => {
    renderWithI18n(<AttributeBadge range={[13, 17]} />);
    const badge = screen.getByText(`13${EN_DASH}17`);
    expect(badge.getAttribute('data-band-index')).toBe(String(bandIndexOf(15)));
    expect(badge.style.backgroundColor).toBe(hexToRgbCss(bandForAttribute(15).color));
  });

  it('aralık ortası bant sınırında AŞAĞI yuvarlanıyor — 10–13 → 11 (vasat), 12 (iyi) değil', () => {
    renderWithI18n(<AttributeBadge range={[10, 13]} />);
    const badge = screen.getByText(`10${EN_DASH}13`);
    expect(badge.getAttribute('data-band-index')).toBe(String(bandIndexOf(11)));
    expect(bandIndexOf(11)).not.toBe(bandIndexOf(12));
  });

  it('`aria-label` aralık metnini U+2013 ile taşıyor', () => {
    const keyName = ATTRIBUTE_BAND_KEY_ORDER[bandIndexOf(15)];
    renderWithI18n(<AttributeBadge range={[13, 17]} />);
    expect(screen.getByText(`13${EN_DASH}17`).getAttribute('aria-label')).toBe(
      `${testText(ATTRIBUTE_BADGE_KEYS.label)}|13${EN_DASH}17|${testText(
        ATTRIBUTE_BADGE_KEYS[keyName ?? 'bandVeryPoor'],
      )}`,
    );
  });
});

describe('AttributeBadge — BİLİNMİYOR', () => {
  it('`?` glifi, yüzey token’ları, `aria-label` = t(unknown), bant sırası YOK, desen `none`', () => {
    renderWithI18n(<AttributeBadge />);
    const badge = screen.getByText('?');
    expect(badge.getAttribute('aria-label')).toBe(testText(ATTRIBUTE_BADGE_KEYS.unknown));
    expect(badge.hasAttribute('data-band-index')).toBe(false);
    expect(badge.className).toContain('bg-[var(--bg-elevated)]');
    expect(badge.className).toContain('text-[var(--text-secondary)]');
    expect(badge.style.backgroundColor).toBe('');
    expect(badge.style.getPropertyValue('--band-pattern')).toBe('none');
  });

  it('bilinmiyor hâlinde de CVD literalleri ve boyut sınıfı var — tek gövde', () => {
    renderWithI18n(<AttributeBadge size="sm" className="ml-1" />);
    const cls = screen.getByText('?').className;
    expect(cls).toContain(ATTRIBUTE_BADGE_SIZE_CLASSES.sm);
    expect(cls).toContain('ml-1');
    for (const cvd of ATTRIBUTE_BADGE_CVD_CLASSES.split(' ')) {
      expect(cls).toContain(cvd);
    }
  });
});

describe('AttributeBadge — geçersiz girdi RangeError, sessiz kırpma YOK', () => {
  it('`value` ve `range` birlikte → RangeError', () => {
    expect(() => renderWithI18n(<AttributeBadge value={15} range={[13, 17]} />)).toThrow(
      RangeError,
    );
  });

  it('aralık dışı / tam sayı olmayan değer → RangeError', () => {
    expect(() => renderWithI18n(<AttributeBadge value={0} />)).toThrow(RangeError);
    expect(() => renderWithI18n(<AttributeBadge value={21} />)).toThrow(RangeError);
    expect(() => renderWithI18n(<AttributeBadge value={7.5} />)).toThrow(RangeError);
  });

  it('ters / eşit / aralık dışı uçlar → RangeError', () => {
    expect(() => renderWithI18n(<AttributeBadge range={[17, 13]} />)).toThrow(RangeError);
    expect(() => renderWithI18n(<AttributeBadge range={[13, 13]} />)).toThrow(RangeError);
    expect(() => renderWithI18n(<AttributeBadge range={[0, 20]} />)).toThrow(RangeError);
  });
});
