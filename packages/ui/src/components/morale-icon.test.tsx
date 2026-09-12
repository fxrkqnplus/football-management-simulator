/**
 * MoraleIcon testleri.
 *
 * TAKLİT ETMEDİĞİ: jsdom SVG'yi **çizmez** (`getBoundingClientRect` 0×0,
 * `getBBox` yok) ve Tailwind sınıflarını CSS'e çevirmez — burada iddia edilen
 * şey **yolların, niteliklerin ve sınıfların DOM'da olduğu**, ekranda görünen
 * ok değil. Gerçek doğrulama **Faz 17** (G-02, Playwright), görsel doğrulama
 * **Faz 49** (G-05).
 *
 * ⚠️ **ENTERPOLASYON — fixture'a yer tutucu bu dosyada ekleniyor, ve sebebi
 * ölçülebilir.** `test/render.tsx` kaynağı anahtardan **türetiyor**
 * (`[moraleIcon.aria]`) ve bir yer tutucu türetemez. O metinle
 * `t(aria, { level })` çağrısı iç `t(level.x)`i **sessizce yutar**: seviye
 * anahtarı hiç çözülmese de test yeşil kalırdı. Bu dosya kendi anahtarına
 * `|{{level}}` ekliyor (Türkçe değil, anahtar metni + yer tutucu) ve
 * `afterAll`da geri alıyor. Yer tutucu ADI (`level`)
 * `apps/web/src/locales/tr/common.json` ile **elle** hizalı — `i18n:check`
 * yer tutucu adlarını denetlemiyor; bilinen sınır, burada yazılı.
 *
 * ⚠️ **SVG'de `className` bir dize DEĞİL.** `SVGElement.className` bir
 * `SVGAnimatedString` (`{ baseVal, animVal }`); `expect(svg.className)
 * .toContain('h-5')` *"expected [] to include 'h-5'"* diye düşüyor (ölçüldü,
 * ilk koşuda üç test) — nesne `[]`e çevriliyor, yani `.not.toContain` aynı
 * nesnede **sessizce geçerdi** (boyut testindeki `.not.toContain(md)` iddiası
 * o yüzden tek başına kanıt değildi).
 * Bu dosya sınıfı `class` niteliğinden okuyor (`classOf`); HTML elemanı
 * sınayan kardeş testler (`form-indicator.test.tsx`, `<ol>`/`<li>`) için
 * `className` dize ve bu tuzak yok.
 */
import { screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { renderWithI18n, testI18n, testText } from '../test/render.js';
import {
  MORALE_ICON_KEYS,
  MORALE_ICON_SIZE_CLASSES,
  MORALE_ICON_SIZES,
  MORALE_LEVEL_CLASSES,
  MORALE_LEVEL_GLYPHS,
  MORALE_LEVEL_KEY_NAMES,
  MORALE_LEVELS,
  MORALE_MAX,
  MORALE_MIN,
  MoraleIcon,
  moraleLevelFor,
  type MoraleLevelKey,
} from './morale-icon.js';

/** `common:ui.moraleIcon.aria` → i18next deposundaki yol (`ui.moraleIcon.aria`). */
const ariaStorePath = MORALE_ICON_KEYS.aria.split(':')[1] ?? '';
const ARIA_TEMPLATE = `${testText(MORALE_ICON_KEYS.aria)}|{{level}}`;

beforeAll(() => {
  expect(ariaStorePath).not.toBe('');
  testI18n().addResource('tr', 'common', ariaStorePath, ARIA_TEMPLATE);
});

afterAll(() => {
  testI18n().addResource('tr', 'common', ariaStorePath, testText(MORALE_ICON_KEYS.aria));
});

/** Sözleşme §1.4'ün beş satırı, birebir — sınırlar prose'dan değil buradan. */
const CONTRACT_LEVELS = [
  { key: 'veryLow', min: 0, max: 19 },
  { key: 'low', min: 20, max: 39 },
  { key: 'neutral', min: 40, max: 60 },
  { key: 'high', min: 61, max: 80 },
  { key: 'veryHigh', min: 81, max: 100 },
];

/** 50 etrafındaki ayna: `v ↔ 100 − v`. */
const MIRROR: Record<MoraleLevelKey, MoraleLevelKey> = {
  veryLow: 'veryHigh',
  low: 'high',
  neutral: 'neutral',
  high: 'low',
  veryHigh: 'veryLow',
};

const LEVEL_KEYS = MORALE_LEVELS.map((level) => level.key);

/** SVG'de `className` `SVGAnimatedString` — sınıf `class` niteliğinden okunur (dosya başı). */
const classOf = (element: Element): string => element.getAttribute('class') ?? '';

describe('seviye envanteri — KALİBRASYON, sayı listeden', () => {
  it('beş dilim sözleşme §1.4 ile BİREBİR', () => {
    // `length === 5` yanlış bir sınırı geçirir, `toEqual` geçirmez.
    expect(MORALE_LEVELS).toEqual(CONTRACT_LEVELS);
  });

  it('ölçek sınırları `spec/01`:987 ile aynı (0–100) ve liste onları kapsıyor', () => {
    expect(MORALE_MIN).toBe(0);
    expect(MORALE_MAX).toBe(100);
    expect(MORALE_LEVELS.at(0)?.min).toBe(MORALE_MIN);
    expect(MORALE_LEVELS.at(-1)?.max).toBe(MORALE_MAX);
  });

  it('KAPSAYICILIK — 0…100 arasındaki HER tam sayı TAM OLARAK BİR dilimde', () => {
    for (let value = MORALE_MIN; value <= MORALE_MAX; value += 1) {
      const matches = MORALE_LEVELS.filter((l) => value >= l.min && value <= l.max);
      expect(matches, `değer ${String(value)}`).toHaveLength(1);
    }
  });

  it('dilimler bitişik ve artan — her dilimin min değeri öncekinin max+1 değeri', () => {
    for (let i = 1; i < MORALE_LEVELS.length; i += 1) {
      const previous = MORALE_LEVELS[i - 1];
      const current = MORALE_LEVELS[i];
      expect(current?.min).toBe((previous?.max ?? Number.NaN) + 1);
    }
  });

  it('nötr dilim 50 MERKEZLİ ve tek sayıda değer; dört uç dilim eşit genişlikte', () => {
    const neutral = MORALE_LEVELS.find((l) => l.key === 'neutral');
    expect(neutral).toBeDefined();
    expect((neutral?.min ?? 0) + (neutral?.max ?? 0)).toBe(2 * 50);
    const width = (l: { min: number; max: number }): number => l.max - l.min + 1;
    expect(width(neutral ?? { min: 0, max: 0 }) % 2).toBe(1);
    const outer = MORALE_LEVELS.filter((l) => l.key !== 'neutral').map(width);
    expect(new Set(outer).size).toBe(1);
    // 101 değer = 4 × uç + nötr — fazlalık nötrde (dosya başındaki gerekçe).
    expect(outer.reduce((sum, w) => sum + w, 0) + width(neutral ?? { min: 0, max: 0 })).toBe(
      MORALE_MAX - MORALE_MIN + 1,
    );
  });

  it('AYNA SİMETRİSİ — `v ↔ 100 − v` dilimleri çift çift değiştiriyor, 101 değerde', () => {
    for (let value = MORALE_MIN; value <= MORALE_MAX; value += 1) {
      const mirrored = moraleLevelFor(MORALE_MAX - value).key;
      expect(mirrored, `değer ${String(value)}`).toBe(MIRROR[moraleLevelFor(value).key]);
    }
  });

  it('HER seviyenin anahtar adı var, ad seviyeyi taşıyor, adlar benzersiz', () => {
    expect(Object.keys(MORALE_LEVEL_KEY_NAMES).sort()).toEqual([...LEVEL_KEYS].sort());
    const names: string[] = [];
    for (const key of LEVEL_KEYS) {
      const name = MORALE_LEVEL_KEY_NAMES[key];
      // `levelVeryLow` → `level.veryLow`: ad, seviyenin kendi anahtarına gidiyor.
      expect(name).toBe(`level${key.charAt(0).toUpperCase()}${key.slice(1)}`);
      expect(MORALE_ICON_KEYS[name]).toContain(`.level.${key}`);
      names.push(name);
    }
    expect(new Set(names).size).toBe(names.length);
  });

  it('anahtar sayısı listeden: seviye + aria', () => {
    expect(Object.keys(MORALE_ICON_KEYS)).toHaveLength(MORALE_LEVELS.length + 1);
  });
});

describe('renk ve biçim — iki kanal', () => {
  it('renkler sözleşme §1.4: danger · warning · text-secondary · success · success', () => {
    expect(MORALE_LEVEL_CLASSES.veryLow).toContain('var(--danger)');
    expect(MORALE_LEVEL_CLASSES.low).toContain('var(--warning)');
    expect(MORALE_LEVEL_CLASSES.neutral).toContain('var(--text-secondary)');
    expect(MORALE_LEVEL_CLASSES.high).toContain('var(--success)');
    expect(MORALE_LEVEL_CLASSES.veryHigh).toContain('var(--success)');
  });

  it('HER seviyenin sınıfı ve glifi var; hiçbir sınıfta sabit hex yok', () => {
    expect(Object.keys(MORALE_LEVEL_CLASSES).sort()).toEqual([...LEVEL_KEYS].sort());
    expect(Object.keys(MORALE_LEVEL_GLYPHS).sort()).toEqual([...LEVEL_KEYS].sort());
    for (const key of LEVEL_KEYS) {
      expect(MORALE_LEVEL_CLASSES[key].trim()).not.toBe('');
      expect(MORALE_LEVEL_CLASSES[key]).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(MORALE_LEVEL_GLYPHS[key].length).toBeGreaterThan(0);
      for (const d of MORALE_LEVEL_GLYPHS[key]) expect(d.trim()).not.toBe('');
    }
  });

  it('beş glif BEŞİ DE FARKLI — high ve veryHigh aynı rengi paylaşıyor, biçim ayırıyor', () => {
    const glyphs = LEVEL_KEYS.map((key) => JSON.stringify(MORALE_LEVEL_GLYPHS[key]));
    expect(new Set(glyphs).size).toBe(LEVEL_KEYS.length);
    expect(MORALE_LEVEL_CLASSES.high).toBe(MORALE_LEVEL_CLASSES.veryHigh);
    expect(MORALE_LEVEL_GLYPHS.high).not.toEqual(MORALE_LEVEL_GLYPHS.veryHigh);
  });

  it('ÇİFT oklar tek oklardan fazla yol taşıyor; çizgi tek yol', () => {
    expect(MORALE_LEVEL_GLYPHS.veryHigh.length).toBeGreaterThan(MORALE_LEVEL_GLYPHS.high.length);
    expect(MORALE_LEVEL_GLYPHS.veryLow.length).toBeGreaterThan(MORALE_LEVEL_GLYPHS.low.length);
    expect(MORALE_LEVEL_GLYPHS.neutral).toHaveLength(1);
  });

  it('boyut envanteri: her boyutun sınıfı var', () => {
    expect(Object.keys(MORALE_ICON_SIZE_CLASSES).sort()).toEqual([...MORALE_ICON_SIZES].sort());
    for (const size of MORALE_ICON_SIZES) {
      expect(MORALE_ICON_SIZE_CLASSES[size].trim()).not.toBe('');
    }
  });
});

describe('`moraleLevelFor` — saf', () => {
  it('her dilimin iki sınırı da o dilime düşüyor — listeden türetilmiş', () => {
    for (const level of MORALE_LEVELS) {
      expect(moraleLevelFor(level.min).key).toBe(level.key);
      expect(moraleLevelFor(level.max).key).toBe(level.key);
    }
  });

  it('50 nötr — merkez', () => {
    expect(moraleLevelFor(50).key).toBe('neutral');
  });

  it('aralık dışı SESSİZCE KIRPILMIYOR — RangeError', () => {
    expect(() => moraleLevelFor(-1)).toThrow(RangeError);
    expect(() => moraleLevelFor(101)).toThrow(RangeError);
    expect(() => moraleLevelFor(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it('tam sayı olmayan değer — RangeError, mesaj Türkçe ve değeri söylüyor', () => {
    expect(() => moraleLevelFor(50.5)).toThrow(RangeError);
    expect(() => moraleLevelFor(50.5)).toThrow(/50\.5/);
    expect(() => moraleLevelFor(Number.NaN)).toThrow(RangeError);
  });
});

describe('MoraleIcon — render', () => {
  it('HER seviye: `role=img`, `data-level`, `aria-label` = t(aria) + t(level.x), sınıf, yollar', () => {
    for (const level of MORALE_LEVELS) {
      const { unmount } = renderWithI18n(<MoraleIcon morale={level.min} />);
      const icon = screen.getByRole('img');
      expect(icon.getAttribute('data-level')).toBe(level.key);
      expect(icon.getAttribute('aria-label')).toBe(
        `${testText(MORALE_ICON_KEYS.aria)}|${testText(
          MORALE_ICON_KEYS[MORALE_LEVEL_KEY_NAMES[level.key]],
        )}`,
      );
      const first = MORALE_LEVEL_CLASSES[level.key].split(' ')[0] ?? '';
      expect(classOf(icon)).toContain(first);
      const paths = [...icon.querySelectorAll('path')].map((p) => p.getAttribute('d'));
      expect(paths).toEqual([...MORALE_LEVEL_GLYPHS[level.key]]);
      unmount();
    }
  });

  it('renk çizime `currentColor` ile ulaşıyor — sınıf boşa yazılmıyor (DZ-10)', () => {
    renderWithI18n(<MoraleIcon morale={90} />);
    const icon = screen.getByRole('img');
    expect(icon.getAttribute('stroke')).toBe('currentColor');
    expect(icon.getAttribute('fill')).toBe('none');
  });

  it('boyut: varsayılan `md`, `sm` verilince `sm`', () => {
    const { unmount } = renderWithI18n(<MoraleIcon morale={50} />);
    const md = MORALE_ICON_SIZE_CLASSES.md.split(' ')[0] ?? '';
    expect(classOf(screen.getByRole('img'))).toContain(md);
    unmount();

    renderWithI18n(<MoraleIcon morale={50} size="sm" />);
    const sm = MORALE_ICON_SIZE_CLASSES.sm.split(' ')[0] ?? '';
    expect(classOf(screen.getByRole('img'))).toContain(sm);
    expect(classOf(screen.getByRole('img'))).not.toContain(md);
  });

  it('aralık dışı moral render sırasında da RangeError — bileşen bir seviye uydurmuyor', () => {
    expect(() => renderWithI18n(<MoraleIcon morale={101} />)).toThrow(RangeError);
    expect(() => renderWithI18n(<MoraleIcon morale={50.5} />)).toThrow(RangeError);
  });

  it('çağıranın `className`i uygulanıyor', () => {
    renderWithI18n(<MoraleIcon morale={10} className="ml-1" />);
    expect(classOf(screen.getByRole('img'))).toContain('ml-1');
  });
});
