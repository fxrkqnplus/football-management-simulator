/**
 * StarRating testleri — sözleşme 6.6 §1.2'nin iddiaları.
 *
 * ⚠️ Geçerli değer kümesi **listeden türetiliyor** (`STAR_STEP` … `STAR_MAX`),
 * sayısı prose'a yazılmıyor. Yuvarlama sınanmıyor — bileşen yapmıyor (spec
 * §6.2 motorun formülü); yuvarlanmamış girdi burada bir **hata**, bir
 * gösterim değil.
 *
 * ⚠️ **jsdom SINIRI:** SVG ölçülmez, `var()` çözülmez. Burada durum listesi
 * (`data-star-state`), `fill`/`stroke` nitelik değerleri ve çokgen noktaları
 * iddia ediliyor; yıldızın **göründüğü** Faz 17 (G-02) / Faz 49 (G-05).
 *
 * **TAKLİT ETMEDİĞİ:** etkileşimli derecelendirme (yok) · potansiyel
 * aralığının veri kaynağı (Faz 31).
 */
import { screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { renderWithI18n, testI18n, testText } from '../test/render.js';
import * as StarRatingModule from './star-rating.js';
import {
  formatStarValue,
  isStarValue,
  STAR_CENTER,
  STAR_FILL_EMPTY,
  STAR_FILL_FULL,
  STAR_HALF_POINTS,
  STAR_HALF_VERTICES,
  STAR_MAX,
  STAR_POINTS,
  STAR_RATING_KEYS,
  STAR_STATES,
  STAR_STEP,
  STAR_STROKE_POTENTIAL,
  STAR_VERTICES,
  STAR_VIEWBOX,
  starDataValue,
  StarRating,
  type StarState,
  starStates,
  starVertices,
} from './star-rating.js';

const EN_DASH = String.fromCodePoint(0x2013);

/** Görüntü kümesi — `{0,5; 1; …; 5}`, listeden. */
const VALID_VALUES: readonly number[] = Array.from(
  { length: STAR_MAX / STAR_STEP },
  (_, i) => (i + 1) * STAR_STEP,
);

/** `common:ui.starRating.aria` → i18next deposundaki yol (`ui.starRating.aria`). */
const ariaStorePath = STAR_RATING_KEYS.aria.split(':')[1] ?? '';
const ARIA_TEMPLATE = `${testText(STAR_RATING_KEYS.aria)}|{{value}}|{{max}}`;

beforeAll(() => {
  expect(ariaStorePath).not.toBe('');
  testI18n().addResource('tr', 'common', ariaStorePath, ARIA_TEMPLATE);
});

afterAll(() => {
  testI18n().addResource('tr', 'common', ariaStorePath, testText(STAR_RATING_KEYS.aria));
});

/** SVG'de `className` `SVGAnimatedString` — sınıf `class` niteliğinden okunur. */
const classOf = (element: Element): string => element.getAttribute('class') ?? '';

const starsOf = (root: HTMLElement): Element[] => Array.from(root.querySelectorAll('svg'));
const statesOf = (root: HTMLElement): (string | null)[] =>
  starsOf(root).map((star) => star.getAttribute('data-star-state'));

describe('anahtar sözleşmesi — grup `starRating`, modül başına TEK `_KEYS`', () => {
  it('iki anahtar, ikisi de `common:ui.starRating.` ile başlıyor', () => {
    expect(Object.keys(STAR_RATING_KEYS).sort()).toEqual(['aria', 'unknown']);
    for (const value of Object.values(STAR_RATING_KEYS)) {
      expect(value).toMatch(/^common:ui\.starRating\.[a-z][a-zA-Z0-9]*$/);
    }
  });

  it('modül `_KEYS` ile biten TAM BİR şey dışa aktarıyor', () => {
    const keysExports = Object.keys(StarRatingModule).filter((name) => name.endsWith('_KEYS'));
    expect(keysExports).toEqual(['STAR_RATING_KEYS']);
  });
});

describe('ölçek spec/04 §6.2’den — `max` prop’u YOK', () => {
  it('STAR_MAX = 5, STAR_STEP = 0,5; görüntü kümesi on değer, hepsi geçerli', () => {
    expect(STAR_MAX).toBe(5);
    expect(STAR_STEP).toBe(0.5);
    expect(VALID_VALUES).toHaveLength(10);
    expect(VALID_VALUES[0]).toBe(STAR_STEP);
    expect(VALID_VALUES.at(-1)).toBe(STAR_MAX);
    for (const value of VALID_VALUES) expect(isStarValue(value), String(value)).toBe(true);
  });

  it('0, çeyrek, aralık dışı ve sonlu olmayan → geçersiz', () => {
    for (const bad of [0, -0.5, 0.25, 2.25, 5.5, 1.2, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(isStarValue(bad), String(bad)).toBe(false);
    }
  });

  it('dört durum — liste', () => {
    expect(STAR_STATES).toEqual(['full', 'half', 'empty', 'potential']);
  });
});

describe('`starStates` — saf, uzunluk daima STAR_MAX', () => {
  it('her geçerli değer: dolu sayısı = tam kısım, yarım = kesir varsa bir, gerisi boş', () => {
    for (const value of VALID_VALUES) {
      const states = starStates(value);
      expect(states, String(value)).toHaveLength(STAR_MAX);
      const full = states.filter((s) => s === 'full').length;
      const half = states.filter((s) => s === 'half').length;
      const empty = states.filter((s) => s === 'empty').length;
      expect(full, String(value)).toBe(Math.floor(value));
      expect(half, String(value)).toBe(Number.isInteger(value) ? 0 : 1);
      expect(full + half + empty, String(value)).toBe(STAR_MAX);
      expect(states, String(value)).not.toContain('potential');
    }
  });

  it('sıra: dolular önde, yarım ortada, boşlar arkada', () => {
    expect(starStates(2.5)).toEqual(['full', 'full', 'half', 'empty', 'empty']);
    expect(starStates(0.5)).toEqual(['half', 'empty', 'empty', 'empty', 'empty']);
    expect(starStates(5)).toEqual(['full', 'full', 'full', 'full', 'full']);
  });

  it('aralık: bilinen (min) önde, `max`ın dokunduğu yıldızlar `potential` — KALİBRASYON birebir', () => {
    expect(starStates([2.5, 4])).toEqual(['full', 'full', 'half', 'potential', 'empty']);
    expect(starStates([2, 3.5])).toEqual(['full', 'full', 'potential', 'potential', 'empty']);
    expect(starStates([0.5, 5])).toEqual([
      'half',
      'potential',
      'potential',
      'potential',
      'potential',
    ]);
    expect(starStates([4.5, 5])).toEqual(['full', 'full', 'full', 'full', 'half']);
  });

  it('aralıkta potansiyel sayısı = ceil(max) − ceil(min) — kural yeniden koşturuluyor', () => {
    for (const min of VALID_VALUES) {
      for (const max of VALID_VALUES) {
        if (min >= max) continue;
        const states = starStates([min, max]);
        expect(states, `${String(min)}–${String(max)}`).toHaveLength(STAR_MAX);
        const potential = states.filter((s) => s === 'potential').length;
        expect(potential, `${String(min)}–${String(max)}`).toBe(Math.ceil(max) - Math.ceil(min));
        // Bilinen kısım tek başına verilen `min` ile aynı.
        const known = starStates(min).map((s, i) => (s === 'empty' ? states[i] : s));
        expect(states).toEqual(known);
      }
    }
  });

  it('geçersiz değer → RangeError, girdi mesajda', () => {
    expect(() => starStates(0)).toThrow(RangeError);
    expect(() => starStates(0)).toThrow(/: 0$/);
    expect(() => starStates(2.25)).toThrow(RangeError);
    expect(() => starStates(5.5)).toThrow(RangeError);
    expect(() => starStates(Number.NaN)).toThrow(RangeError);
  });

  it('geçersiz aralık → RangeError: ters, eşit, adım dışı uç, 0', () => {
    expect(() => starStates([3, 2])).toThrow(RangeError);
    expect(() => starStates([2, 2])).toThrow(RangeError);
    expect(() => starStates([2, 2])).toThrow(/value/);
    expect(() => starStates([0, 3])).toThrow(RangeError);
    expect(() => starStates([1, 5.5])).toThrow(RangeError);
    expect(() => starStates([1.25, 3])).toThrow(RangeError);
  });
});

describe('metinler — `formatNumber` (`@fms/shared`) insan yüzü, JS yazımı makine yüzü', () => {
  it('`formatStarValue`: `2,5`, `3`, `2,5–4` (U+2013)', () => {
    expect(formatStarValue(2.5)).toBe('2,5');
    expect(formatStarValue(3)).toBe('3');
    const range = formatStarValue([2.5, 4]);
    expect(range).toBe(`2,5${EN_DASH}4`);
    expect(range.codePointAt(3)).toBe(0x2013);
  });

  it('`starDataValue`: `2.5`, `3`, `2.5–4`', () => {
    expect(starDataValue(2.5)).toBe('2.5');
    expect(starDataValue(3)).toBe('3');
    expect(starDataValue([2.5, 4])).toBe(`2.5${EN_DASH}4`);
  });

  it('ikisi de geçersiz girdide RangeError', () => {
    expect(() => formatStarValue(0)).toThrow(RangeError);
    expect(() => formatStarValue([4, 2.5])).toThrow(RangeError);
    expect(() => starDataValue(6)).toThrow(RangeError);
    expect(() => starDataValue([2, 2])).toThrow(RangeError);
  });
});

describe('geometri — saf fonksiyondan, elle yazılmış koordinat yok', () => {
  it('on köşe, viewBox içinde, tepe ve alt iç köşe eksen üstünde', () => {
    expect(STAR_VERTICES).toHaveLength(10);
    expect(STAR_VERTICES).toEqual(starVertices());
    for (const v of STAR_VERTICES) {
      expect(v.x).toBeGreaterThanOrEqual(0);
      expect(v.x).toBeLessThanOrEqual(STAR_VIEWBOX);
      expect(v.y).toBeGreaterThanOrEqual(0);
      expect(v.y).toBeLessThanOrEqual(STAR_VIEWBOX);
    }
    expect(STAR_VERTICES[0]).toEqual({ x: STAR_CENTER, y: STAR_CENTER - 11 });
    expect(STAR_VERTICES[5]?.x).toBe(STAR_CENTER);
    expect(STAR_VERTICES[5]?.y).toBeGreaterThan(STAR_CENTER);
  });

  it('`x` aynası: köşe k ile 10 − k eksen etrafında simetrik', () => {
    for (let k = 1; k < 5; k += 1) {
      const left = STAR_VERTICES[10 - k];
      const right = STAR_VERTICES[k];
      expect(left?.y).toBeCloseTo(right?.y ?? Number.NaN, 3);
      expect((left?.x ?? 0) + (right?.x ?? 0)).toBeCloseTo(2 * STAR_CENTER, 3);
    }
  });

  it('yarım yıldız: eksenin solundaki ALTI köşe, sırası korunmuş, uçları eksende', () => {
    expect(STAR_HALF_VERTICES).toHaveLength(6);
    for (const v of STAR_HALF_VERTICES) expect(v.x).toBeLessThanOrEqual(STAR_CENTER);
    expect(STAR_HALF_VERTICES[0]).toEqual(STAR_VERTICES[0]);
    expect(STAR_HALF_VERTICES[1]).toEqual(STAR_VERTICES[5]);
    expect(STAR_HALF_VERTICES.slice(2)).toEqual(STAR_VERTICES.slice(6));
  });

  it('`points` dizeleri köşe listesinden — `x,y` çiftleri boşlukla', () => {
    expect(STAR_POINTS.split(' ')).toHaveLength(10);
    expect(STAR_HALF_POINTS.split(' ')).toHaveLength(6);
    expect(STAR_POINTS).toMatch(/^(-?\d+(\.\d+)?,-?\d+(\.\d+)? ?)+$/);
  });

  it('renkler token — sabit hex YOK', () => {
    for (const color of [STAR_FILL_FULL, STAR_FILL_EMPTY, STAR_STROKE_POTENTIAL]) {
      expect(color).toMatch(/^var\(--[a-z-]+\)$/);
    }
    expect(STAR_FILL_FULL).toBe('var(--warning)');
    expect(STAR_FILL_EMPTY).toBe('var(--border-strong)');
    expect(STAR_STROKE_POTENTIAL).toBe('var(--accent)');
  });
});

describe('StarRating — render (değer)', () => {
  it('kök `role="img"`, beş SVG, durumlar `starStates` ile aynı, `data-value`', () => {
    renderWithI18n(<StarRating value={2.5} />);
    const root = screen.getByRole('img');
    expect(root.tagName).toBe('SPAN');
    expect(root.getAttribute('data-value')).toBe('2.5');
    expect(statesOf(root)).toEqual([...starStates(2.5)]);
    for (const star of starsOf(root)) {
      expect(star.getAttribute('aria-hidden')).toBe('true');
      expect(star.getAttribute('viewBox')).toBe(
        `0 0 ${String(STAR_VIEWBOX)} ${String(STAR_VIEWBOX)}`,
      );
    }
  });

  it('`aria-label` = t(aria, { value: formatNumber, max: STAR_MAX }) — `2,5`, anahtar iddia ediliyor', () => {
    renderWithI18n(<StarRating value={2.5} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe(
      `${testText(STAR_RATING_KEYS.aria)}|2,5|${String(STAR_MAX)}`,
    );
  });

  it('dolu → `--warning` dolgu; boş → `--border-strong`; yarım → boş zemin + yarım çokgen', () => {
    renderWithI18n(<StarRating value={2.5} />);
    const [full, , half, , empty] = starsOf(screen.getByRole('img'));
    const polygons = (star: Element | undefined): Element[] =>
      Array.from(star?.querySelectorAll('polygon') ?? []);

    expect(polygons(full)).toHaveLength(1);
    expect(polygons(full)[0]?.getAttribute('fill')).toBe(STAR_FILL_FULL);
    expect(polygons(full)[0]?.getAttribute('points')).toBe(STAR_POINTS);

    expect(polygons(empty)).toHaveLength(1);
    expect(polygons(empty)[0]?.getAttribute('fill')).toBe(STAR_FILL_EMPTY);

    expect(polygons(half)).toHaveLength(2);
    expect(polygons(half)[0]?.getAttribute('fill')).toBe(STAR_FILL_EMPTY);
    expect(polygons(half)[0]?.getAttribute('points')).toBe(STAR_POINTS);
    expect(polygons(half)[1]?.getAttribute('fill')).toBe(STAR_FILL_FULL);
    expect(polygons(half)[1]?.getAttribute('points')).toBe(STAR_HALF_POINTS);
  });

  it('her geçerli değer çiziliyor ve durum listesiyle birebir', () => {
    for (const value of VALID_VALUES) {
      const { unmount } = renderWithI18n(<StarRating value={value} />);
      expect(statesOf(screen.getByRole('img')), String(value)).toEqual([...starStates(value)]);
      unmount();
    }
  });

  it('`className` birleşiyor, diğer `span` nitelikleri geçiyor', () => {
    renderWithI18n(<StarRating value={3} className="ml-1" data-testid="sr" />);
    const root = screen.getByTestId('sr');
    expect(root.className).toContain('ml-1');
    expect(root.getAttribute('role')).toBe('img');
  });
});

describe('StarRating — render (aralık)', () => {
  it('potansiyel yıldız: dolgu yok, kontur `--accent`; `data-value` ve `aria-label` uçları taşıyor', () => {
    renderWithI18n(<StarRating range={[2.5, 4]} />);
    const root = screen.getByRole('img');
    expect(root.getAttribute('data-value')).toBe(`2.5${EN_DASH}4`);
    expect(root.getAttribute('aria-label')).toBe(
      `${testText(STAR_RATING_KEYS.aria)}|2,5${EN_DASH}4|${String(STAR_MAX)}`,
    );
    const states: readonly StarState[] = starStates([2.5, 4]);
    expect(statesOf(root)).toEqual([...states]);
    const potential = starsOf(root)[states.indexOf('potential')];
    const polygon = potential?.querySelector('polygon');
    expect(polygon?.getAttribute('fill')).toBe('none');
    expect(polygon?.getAttribute('stroke')).toBe(STAR_STROKE_POTENTIAL);
    expect(polygon?.getAttribute('points')).toBe(STAR_POINTS);
  });
});

describe('StarRating — BİLİNMİYOR', () => {
  it('`?` glifi, `aria-label` = t(unknown), yıldız YOK, `data-value` YOK', () => {
    renderWithI18n(<StarRating />);
    const root = screen.getByRole('img');
    expect(root.textContent).toBe('?');
    expect(root.getAttribute('aria-label')).toBe(testText(STAR_RATING_KEYS.unknown));
    expect(root.hasAttribute('data-value')).toBe(false);
    expect(starsOf(root)).toHaveLength(0);
    expect(root.className).toContain('font-[family-name:var(--font-ui)]');
    expect(root.className).toContain('text-[var(--text-secondary)]');
    expect(root.className).not.toMatch(/font-\[var\(/);
  });

  it('SVG yıldız sınıfı `class` niteliğinden okunuyor — boyut sınıfı taşıyor', () => {
    renderWithI18n(<StarRating value={1} />);
    const star = starsOf(screen.getByRole('img'))[0];
    expect(star).toBeDefined();
    expect(classOf(star ?? document.body)).toContain('h-4');
  });
});

describe('StarRating — geçersiz girdi RangeError, sessiz kırpma YOK', () => {
  it('`value` ve `range` birlikte → RangeError', () => {
    expect(() => renderWithI18n(<StarRating value={3} range={[2, 4]} />)).toThrow(RangeError);
  });

  it('0, çeyrek, aralık dışı → RangeError', () => {
    expect(() => renderWithI18n(<StarRating value={0} />)).toThrow(RangeError);
    expect(() => renderWithI18n(<StarRating value={2.25} />)).toThrow(RangeError);
    expect(() => renderWithI18n(<StarRating value={5.5} />)).toThrow(RangeError);
  });

  it('ters / eşit / adım dışı aralık → RangeError', () => {
    expect(() => renderWithI18n(<StarRating range={[4, 2.5]} />)).toThrow(RangeError);
    expect(() => renderWithI18n(<StarRating range={[3, 3]} />)).toThrow(RangeError);
    expect(() => renderWithI18n(<StarRating range={[0, 3]} />)).toThrow(RangeError);
  });
});
