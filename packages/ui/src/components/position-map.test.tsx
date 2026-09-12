/**
 * PositionMap testleri.
 *
 * TAKLİT ETMEDİĞİ: jsdom SVG'yi **çizmez** (`getBoundingClientRect` 0×0,
 * `getBBox` yok) ve Tailwind sınıflarını CSS'e çevirmez — burada iddia edilen
 * şey **koordinatların, niteliklerin ve sınıfların DOM'da olduğu** ve saf
 * geometrinin sayısal iddiaları; ekranda görünen saha değil. Gerçek doğrulama
 * **Faz 17** (G-02, Playwright), görsel doğrulama **Faz 49** (G-05).
 *
 * ⚠️ SVG elemanında `className` bir `SVGAnimatedString` — sınıf
 * `getAttribute('class')` ile okunuyor; `element.className` bir dize değil.
 *
 * ⚠️ **ENTERPOLASYON — fixture'a yer tutucu bu dosyada ekleniyor** (MoraleIcon
 * emsali): `test/render.tsx` kaynağı anahtardan **türetiyor** ve bir yer
 * tutucu türetemez. O metinle `t(aria, { entries })` iç `t(entry, …)`yi ve o
 * da `t(position.x)` / `t(level.y)`yi **sessizce yutardı**. Bu dosya `aria`ya
 * `|{{entries}}`, `entry`ye `{{position}}|{{level}}` ekliyor (Türkçe değil,
 * anahtar metni + yer tutucu) ve `afterAll`da geri alıyor. Yer tutucu ADLARI
 * (`entries` · `position` · `level`) `apps/web/src/locales/tr/common.json` ile
 * **elle** hizalı — `i18n:check` yer tutucu adlarını denetlemiyor; bilinen
 * sınır, burada yazılı.
 *
 * ⚠️ ui ↔ db kopya eşitliği (`POSITION_CODES` · `POSITION_LEVELS`) BU DOSYADA
 * DEĞİL, `scripts/inventory-guards.test.mjs` ④'te — `packages/ui` db'yi import
 * edemez (§2.4). Burada iddia edilen, sözleşme §1.8'in literal listesi; iki
 * nöbetçi aynı mutasyonu iki yönden yakalar.
 */
import { screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { renderWithI18n, testI18n, testText } from '../test/render.js';
import {
  isPositionCode,
  isPositionLevel,
  PITCH_GEOMETRY,
  PITCH_LINE_CLASS,
  PITCH_STROKE,
  PITCH_SURFACE_CLASS,
  POSITION_CODES,
  POSITION_COORDINATES,
  POSITION_ENTRY_SEPARATOR,
  POSITION_KEY_NAMES,
  POSITION_LEVEL_KEY_NAMES,
  POSITION_LEVEL_MARKERS,
  POSITION_LEVELS,
  POSITION_MAP_KEYS,
  POSITION_MAP_SIZE_CLASSES,
  POSITION_MAP_SIZES,
  POSITION_MAP_VIEWBOX,
  POSITION_MARKER_RADIUS,
  POSITION_UNSET_MARKER,
  type PositionCode,
  positionEntriesText,
  type PositionEntry,
  PositionMap,
  positionMapEntries,
} from './position-map.js';

/** Sözleşme §1.8 literalleri — prose'dan değil buradan. */
const CONTRACT_CODES = ['GK', 'DC', 'DL', 'DR', 'DM', 'MC', 'ML', 'MR', 'AMC', 'AML', 'AMR', 'ST'];
const CONTRACT_LEVELS = ['natural', 'accomplished', 'competent', 'awkward', 'ineffectual'];

const HEX_PATTERN = /#[0-9a-fA-F]{3,8}\b/;

const classOf = (element: Element | null): string => element?.getAttribute('class') ?? '';

const storePath = (key: string): string => key.split(':')[1] ?? '';
const ARIA_TEMPLATE = `${testText(POSITION_MAP_KEYS.aria)}|{{entries}}`;
const ENTRY_TEMPLATE = '{{position}}|{{level}}';

beforeAll(() => {
  expect(storePath(POSITION_MAP_KEYS.aria)).not.toBe('');
  expect(storePath(POSITION_MAP_KEYS.entry)).not.toBe('');
  testI18n().addResource('tr', 'common', storePath(POSITION_MAP_KEYS.aria), ARIA_TEMPLATE);
  testI18n().addResource('tr', 'common', storePath(POSITION_MAP_KEYS.entry), ENTRY_TEMPLATE);
});

afterAll(() => {
  testI18n().addResource(
    'tr',
    'common',
    storePath(POSITION_MAP_KEYS.aria),
    testText(POSITION_MAP_KEYS.aria),
  );
  testI18n().addResource(
    'tr',
    'common',
    storePath(POSITION_MAP_KEYS.entry),
    testText(POSITION_MAP_KEYS.entry),
  );
});

/** Beklenen girdi metni — fixture şablonuyla aynı biçim. */
const expectedEntry = (entry: PositionEntry): string =>
  `${testText(POSITION_MAP_KEYS[POSITION_KEY_NAMES[entry.position]])}|${testText(
    POSITION_MAP_KEYS[POSITION_LEVEL_KEY_NAMES[entry.level]],
  )}`;

const TWO: readonly PositionEntry[] = [
  { position: 'GK', level: 'natural' },
  { position: 'DC', level: 'accomplished' },
];

/** Beş seviyenin her biri bir mevkide — biçim iddiaları için. */
const ALL_LEVELS: readonly PositionEntry[] = POSITION_LEVELS.map((level, i) => ({
  position: POSITION_CODES[i] ?? 'GK',
  level,
}));

/**
 * `GK` → `Gk`, `AMC` → `Amc`, `natural` → `Natural`: anahtar ADI segmenti.
 * İlk harf BÜYÜTÜLÜR (kodda zaten büyük, seviyede küçük — ikisi de buradan
 * geçer); gerisi küçültülür.
 */
const pascalSegment = (value: string): string =>
  `${value.charAt(0).toUpperCase()}${value.slice(1).toLowerCase()}`;

describe('kapalı küme kopyaları — sözleşme §1.8 ile birebir, sıra dahil', () => {
  it('`POSITION_CODES` on iki kod, o sırayla (kaleci → savunma → orta saha → hücum)', () => {
    expect([...POSITION_CODES]).toEqual(CONTRACT_CODES);
  });

  it('`POSITION_LEVELS` beş derece, o sırayla (en iyiden en kötüye)', () => {
    expect([...POSITION_LEVELS]).toEqual(CONTRACT_LEVELS);
  });

  it('HER kodun anahtar adı var, ad kodu küçük harfle taşıyor, adlar benzersiz', () => {
    expect(Object.keys(POSITION_KEY_NAMES).sort()).toEqual([...POSITION_CODES].sort());
    const names: string[] = [];
    for (const code of POSITION_CODES) {
      const name = POSITION_KEY_NAMES[code];
      // `AMC` → `positionAmc` → `position.amc` (segment kuralı: küçük harf).
      expect(name).toBe(`position${pascalSegment(code)}`);
      expect(POSITION_MAP_KEYS[name]).toContain(`.position.${code.toLowerCase()}`);
      names.push(name);
    }
    expect(new Set(names).size).toBe(names.length);
  });

  it('HER seviyenin anahtar adı var, ad seviyeyi taşıyor, adlar benzersiz', () => {
    expect(Object.keys(POSITION_LEVEL_KEY_NAMES).sort()).toEqual([...POSITION_LEVELS].sort());
    const names: string[] = [];
    for (const level of POSITION_LEVELS) {
      const name = POSITION_LEVEL_KEY_NAMES[level];
      expect(name).toBe(`level${pascalSegment(level)}`);
      expect(POSITION_MAP_KEYS[name]).toContain(`.level.${level}`);
      names.push(name);
    }
    expect(new Set(names).size).toBe(names.length);
  });

  it('anahtar sayısı listeden: mevki + seviye + aria · entry · empty', () => {
    expect(Object.keys(POSITION_MAP_KEYS)).toHaveLength(
      POSITION_CODES.length + POSITION_LEVELS.length + 3,
    );
  });

  it('`isPositionCode` / `isPositionLevel` kümeyi tanıyor, dışını (küçük/büyük harf dahil) reddediyor', () => {
    for (const code of POSITION_CODES) expect(isPositionCode(code)).toBe(true);
    for (const level of POSITION_LEVELS) expect(isPositionLevel(level)).toBe(true);
    expect(isPositionCode('gk')).toBe(false);
    expect(isPositionCode('CB')).toBe(false);
    expect(isPositionCode('')).toBe(false);
    expect(isPositionLevel('Natural')).toBe(false);
    expect(isPositionLevel('unconvincing')).toBe(false);
  });
});

describe('koordinatlar — KALİBRASYON; geometri iddiaları sayıyla', () => {
  const { width, height } = POSITION_MAP_VIEWBOX;
  const point = (code: PositionCode): { x: number; y: number } => POSITION_COORDINATES[code];

  it('viewBox `0 0 68 105` — oran spec/05 §7.6 (105×68), dikey', () => {
    expect(width).toBe(68);
    expect(height).toBe(105);
    expect(height).toBeGreaterThan(width);
  });

  it('HER kodun koordinatı var, hepsi FARKLI, hepsi işaret yarıçapıyla birlikte viewBox İÇİNDE', () => {
    expect(Object.keys(POSITION_COORDINATES).sort()).toEqual([...POSITION_CODES].sort());
    const seen = new Set<string>();
    for (const code of POSITION_CODES) {
      const { x, y } = point(code);
      expect(x - POSITION_MARKER_RADIUS, code).toBeGreaterThanOrEqual(0);
      expect(x + POSITION_MARKER_RADIUS, code).toBeLessThanOrEqual(width);
      expect(y - POSITION_MARKER_RADIUS, code).toBeGreaterThanOrEqual(0);
      expect(y + POSITION_MARKER_RADIUS, code).toBeLessThanOrEqual(height);
      seen.add(`${String(x)},${String(y)}`);
    }
    expect(seen.size).toBe(POSITION_CODES.length);
  });

  it('KALE ALTTA: kaleci en büyük y, forvet en küçük y; hatlar kaleden hücuma doğru azalıyor', () => {
    const ys = POSITION_CODES.map((code) => point(code).y);
    expect(point('GK').y).toBe(Math.max(...ys));
    expect(point('ST').y).toBe(Math.min(...ys));
    const spine = (['GK', 'DC', 'DM', 'MC', 'AMC', 'ST'] as const).map((code) => point(code).y);
    for (let i = 1; i < spine.length; i += 1) {
      expect(spine[i], `hat ${String(i)}`).toBeLessThan(spine[i - 1] ?? Number.NaN);
    }
  });

  it('merkez mevkiler ortada; sol/sağ çiftler merkeze göre AYNA ve aynı hatta', () => {
    for (const code of ['GK', 'DC', 'DM', 'MC', 'AMC', 'ST'] as const) {
      expect(point(code).x, code).toBe(width / 2);
    }
    const pairs = [
      ['DL', 'DC', 'DR'],
      ['ML', 'MC', 'MR'],
      ['AML', 'AMC', 'AMR'],
    ] as const;
    for (const [left, centre, right] of pairs) {
      expect(point(left).x + point(right).x, `${left}/${right}`).toBe(width);
      expect(point(left).y).toBe(point(right).y);
      expect(point(centre).y).toBe(point(left).y);
      expect(point(left).x).toBeLessThan(point(centre).x);
      expect(point(centre).x).toBeLessThan(point(right).x);
    }
  });

  it('saha çizgileri: dış çizgi çizgi kalınlığının yarısı kadar içeride, orta çizgi ve yuvarlak tam ortada', () => {
    const { outline, halfway, centreCircle } = PITCH_GEOMETRY;
    expect(outline.x).toBe(PITCH_STROKE / 2);
    expect(outline.y).toBe(PITCH_STROKE / 2);
    expect(outline.x + outline.width).toBe(width - PITCH_STROKE / 2);
    expect(outline.y + outline.height).toBe(height - PITCH_STROKE / 2);
    expect(halfway.y).toBe(height / 2);
    expect(centreCircle.cx).toBe(width / 2);
    expect(centreCircle.cy).toBe(height / 2);
    // 1 birim = 1 m: orta yuvarlak 9,15 m.
    expect(centreCircle.r).toBe(9.15);
  });

  it('iki ceza sahası: biri üst kale çizgisinden, biri alt; FIFA ölçüsü 40,32 × 16,5; dış çizginin içinde', () => {
    const { outline, penaltyAreas } = PITCH_GEOMETRY;
    expect(penaltyAreas).toHaveLength(2);
    const [top, bottom] = penaltyAreas;
    expect(top.y).toBe(outline.y);
    expect(bottom.y + bottom.height).toBe(outline.y + outline.height);
    for (const area of penaltyAreas) {
      expect(area.width).toBe(40.32);
      expect(area.height).toBe(16.5);
      expect(area.x).toBeGreaterThan(outline.x);
      expect(area.x + area.width).toBeLessThan(outline.x + outline.width);
      // Yatayda ortalı.
      expect(area.x + area.width / 2).toBeCloseTo(width / 2, 10);
    }
  });
});

describe('işaret biçimleri — altı demet, hepsi farklı, hepsi token', () => {
  const bundles = [...POSITION_LEVELS.map((l) => POSITION_LEVEL_MARKERS[l]), POSITION_UNSET_MARKER];

  it('HER seviyenin biçimi var; beş seviye + verilmeyen = altı FARKLI demet', () => {
    expect(Object.keys(POSITION_LEVEL_MARKERS).sort()).toEqual([...POSITION_LEVELS].sort());
    expect(new Set(bundles.map((b) => JSON.stringify(b))).size).toBe(bundles.length);
  });

  it('sözleşme §1.8: natural dolu accent · accomplished %70 · competent kontur · awkward kesikli · ineffectual soluk', () => {
    const m = POSITION_LEVEL_MARKERS;
    expect(m.natural.circleClass).toContain('fill-[var(--accent)]');
    expect(m.natural.fillOpacity).toBe(1);
    expect(m.accomplished.circleClass).toContain('fill-[var(--accent)]');
    expect(m.accomplished.fillOpacity).toBe(0.7);
    expect(m.competent.circleClass).toContain('stroke-[var(--accent)]');
    expect(m.competent.circleClass).not.toContain('fill-[var(--accent)]');
    expect(m.awkward.strokeDasharray).toBeDefined();
    for (const level of POSITION_LEVELS) {
      if (level !== 'awkward') expect(m[level].strokeDasharray, level).toBeUndefined();
    }
    expect(m.ineffectual.opacity).toBeLessThan(1);
    // Verilmeyen, en soluk — ineffectual'dan da ayrışsın.
    expect(POSITION_UNSET_MARKER.opacity).toBeLessThan(m.ineffectual.opacity);
    expect(POSITION_UNSET_MARKER.strokeDasharray).toBeUndefined();
  });

  it('hiçbir sınıfta sabit hex yok; her sınıf `var(--…)` taşıyor; boyut sınıfları listeden', () => {
    for (const b of bundles) {
      for (const cls of [b.circleClass, b.textClass]) {
        expect(cls).not.toMatch(HEX_PATTERN);
        expect(cls).toContain('var(--');
      }
    }
    for (const cls of [PITCH_SURFACE_CLASS, PITCH_LINE_CLASS]) {
      expect(cls).not.toMatch(HEX_PATTERN);
      expect(cls).toContain('var(--');
    }
    expect(PITCH_LINE_CLASS).toContain('var(--border-strong)');
    expect(PITCH_SURFACE_CLASS).toContain('var(--bg-elevated)');
    expect(Object.keys(POSITION_MAP_SIZE_CLASSES).sort()).toEqual([...POSITION_MAP_SIZES].sort());
    for (const size of POSITION_MAP_SIZES) {
      expect(POSITION_MAP_SIZE_CLASSES[size].trim()).not.toBe('');
    }
  });

  it('SVG metni `fill` ile boyanır — metin sınıfları `fill-[…]`, `text-[…]` değil (tailwind-merge ölçümü)', () => {
    for (const b of bundles) {
      expect(b.textClass).toMatch(/^fill-\[var\(--[a-z-]+\)\]$/);
    }
  });
});

describe('`positionMapEntries` — saf', () => {
  it('geçerli liste olduğu gibi ve aynı sırayla; boş liste boş', () => {
    expect(positionMapEntries(TWO)).toEqual(TWO);
    expect(positionMapEntries(ALL_LEVELS)).toEqual(ALL_LEVELS);
    expect(positionMapEntries([])).toEqual([]);
  });

  it('on iki mevkinin hepsi bir arada geçiyor — listeden', () => {
    const all = POSITION_CODES.map((position) => ({ position, level: 'competent' as const }));
    expect(positionMapEntries(all)).toHaveLength(POSITION_CODES.length);
  });

  it('küme dışı kod — RangeError, mesaj Türkçe, değeri ve geçerli kümeyi söylüyor', () => {
    const bad = [{ position: 'CB', level: 'natural' }];
    expect(() => positionMapEntries(bad)).toThrow(RangeError);
    expect(() => positionMapEntries(bad)).toThrow(/CB/);
    expect(() => positionMapEntries(bad)).toThrow(/GK, DC/);
    expect(() => positionMapEntries([{ position: 'gk', level: 'natural' }])).toThrow(RangeError);
  });

  it('küme dışı seviye — RangeError, mesaj değeri ve geçerli kümeyi söylüyor', () => {
    const bad = [{ position: 'GK', level: 'unconvincing' }];
    expect(() => positionMapEntries(bad)).toThrow(RangeError);
    expect(() => positionMapEntries(bad)).toThrow(/unconvincing/);
    expect(() => positionMapEntries(bad)).toThrow(/natural, accomplished/);
  });

  it('aynı mevki iki kez — RangeError, mesaj mevkiyi söylüyor; farklı seviyede bile', () => {
    const dup = [
      { position: 'ST', level: 'natural' },
      { position: 'ST', level: 'awkward' },
    ];
    expect(() => positionMapEntries(dup)).toThrow(RangeError);
    expect(() => positionMapEntries(dup)).toThrow(/ST/);
  });
});

describe('`positionEntriesText` — saf', () => {
  it('ayraç sabitten: boş → boş, tek → kendisi, çok → ayraçla', () => {
    expect(POSITION_ENTRY_SEPARATOR).toBe(', ');
    expect(positionEntriesText([])).toBe('');
    expect(positionEntriesText(['a'])).toBe('a');
    expect(positionEntriesText(['a', 'b', 'c'])).toBe(
      ['a', 'b', 'c'].join(POSITION_ENTRY_SEPARATOR),
    );
  });
});

describe('PositionMap — render', () => {
  const markers = (root: Element): Element[] => [...root.querySelectorAll('[data-position]')];

  it('`role=img`; `aria-label` = t(aria, { entries }) ve her girdi t(entry, { t(position.x), t(level.y) })', () => {
    renderWithI18n(<PositionMap positions={TWO} />);
    const svg = screen.getByRole('img');
    expect(svg.getAttribute('aria-label')).toBe(
      `${testText(POSITION_MAP_KEYS.aria)}|${TWO.map(expectedEntry).join(POSITION_ENTRY_SEPARATOR)}`,
    );
    expect(svg.getAttribute('data-count')).toBe(String(TWO.length));
    expect(svg.getAttribute('viewBox')).toBe('0 0 68 105');
  });

  it('DAİMA on iki işaret, `POSITION_CODES` sırasıyla; verilenler `data-level` taşıyor, verilmeyenler taşımıyor', () => {
    renderWithI18n(<PositionMap positions={TWO} />);
    const all = markers(screen.getByRole('img'));
    expect(all.map((g) => g.getAttribute('data-position'))).toEqual([...POSITION_CODES]);
    const given = new Map(TWO.map((e) => [e.position, e.level]));
    for (const g of all) {
      const code = g.getAttribute('data-position') ?? '';
      const level = given.get(code as PositionCode);
      if (level === undefined) {
        expect(g.hasAttribute('data-level'), code).toBe(false);
      } else {
        expect(g.getAttribute('data-level'), code).toBe(level);
      }
    }
  });

  it('işaret içinde İNGİLİZCE KOD (K-8); `<title>` yalnızca verilenlerde ve t(entry) ile', () => {
    renderWithI18n(<PositionMap positions={TWO} />);
    const all = markers(screen.getByRole('img'));
    for (const g of all) {
      const code = g.getAttribute('data-position') ?? '';
      expect(g.querySelector('text')?.textContent).toBe(code);
      const title = g.querySelector('title');
      const entry = TWO.find((e) => e.position === code);
      if (entry === undefined) {
        expect(title, code).toBeNull();
      } else {
        expect(title?.textContent, code).toBe(expectedEntry(entry));
      }
    }
  });

  it('HER seviye kendi biçimini alıyor: daire sınıfı, fill-opacity, kesiklik, opaklık; verilmeyen soluk boş', () => {
    renderWithI18n(<PositionMap positions={ALL_LEVELS} />);
    const all = markers(screen.getByRole('img'));
    const byCode = new Map(all.map((g) => [g.getAttribute('data-position'), g]));
    for (const entry of ALL_LEVELS) {
      const g = byCode.get(entry.position);
      const style = POSITION_LEVEL_MARKERS[entry.level];
      expect(g, entry.position).toBeDefined();
      const circle = g?.querySelector('circle') ?? null;
      expect(classOf(circle)).toBe(style.circleClass);
      expect(circle?.getAttribute('fill-opacity')).toBe(String(style.fillOpacity));
      expect(classOf(g?.querySelector('text') ?? null)).toBe(style.textClass);
      expect(g?.getAttribute('opacity')).toBe(String(style.opacity));
      if (style.strokeDasharray === undefined) {
        expect(g?.hasAttribute('stroke-dasharray')).toBe(false);
      } else {
        expect(g?.getAttribute('stroke-dasharray')).toBe(style.strokeDasharray);
      }
    }
    const unset = all.find((g) => !g.hasAttribute('data-level'));
    expect(unset).toBeDefined();
    expect(classOf(unset?.querySelector('circle') ?? null)).toBe(POSITION_UNSET_MARKER.circleClass);
    expect(unset?.getAttribute('opacity')).toBe(String(POSITION_UNSET_MARKER.opacity));
  });

  it('saha: zemin, dış çizgi, orta çizgi, orta yuvarlak, iki ceza sahası — token sınıflarıyla', () => {
    renderWithI18n(<PositionMap positions={[]} />);
    const svg = screen.getByRole('img');
    const pitch = (name: string): Element[] => [...svg.querySelectorAll(`[data-pitch="${name}"]`)];
    expect(pitch('surface')).toHaveLength(1);
    expect(pitch('outline')).toHaveLength(1);
    expect(pitch('halfway')).toHaveLength(1);
    expect(pitch('centre-circle')).toHaveLength(1);
    expect(pitch('penalty-area')).toHaveLength(PITCH_GEOMETRY.penaltyAreas.length);
    expect(classOf(pitch('surface')[0] ?? null)).toBe(PITCH_SURFACE_CLASS);
    expect(classOf(pitch('lines')[0] ?? null)).toBe(PITCH_LINE_CLASS);
    expect(pitch('centre-circle')[0]?.getAttribute('r')).toBe(
      String(PITCH_GEOMETRY.centreCircle.r),
    );
  });

  it('BOŞ liste: `aria-label` = t(empty), `data-count` 0, `<title>` yok, on iki soluk işaret yine var', () => {
    renderWithI18n(<PositionMap positions={[]} />);
    const svg = screen.getByRole('img');
    expect(svg.getAttribute('aria-label')).toBe(testText(POSITION_MAP_KEYS.empty));
    expect(svg.getAttribute('data-count')).toBe('0');
    expect(svg.querySelectorAll('title')).toHaveLength(0);
    const all = markers(svg);
    expect(all).toHaveLength(POSITION_CODES.length);
    for (const g of all) expect(g.hasAttribute('data-level')).toBe(false);
  });

  it('boyut: varsayılan `md`, `sm` verilince `sm`; yazı tipi sınıfı ETİKETLİ; çağıranın `className`i uygulanıyor', () => {
    const md = POSITION_MAP_SIZE_CLASSES.md.split(' ')[0] ?? '';
    const sm = POSITION_MAP_SIZE_CLASSES.sm.split(' ')[0] ?? '';

    const { unmount } = renderWithI18n(<PositionMap positions={TWO} />);
    expect(classOf(screen.getByRole('img'))).toContain(md);
    expect(classOf(screen.getByRole('img'))).toContain('font-[family-name:var(--font-ui)]');
    unmount();

    renderWithI18n(<PositionMap positions={TWO} size="sm" className="mx-auto" />);
    const svg = screen.getByRole('img');
    expect(classOf(svg)).toContain(sm);
    expect(classOf(svg)).not.toContain(md);
    expect(classOf(svg)).toContain('mx-auto');
  });

  it('tekrar / küme dışı girdi render sırasında da RangeError — bileşen bir mevki uydurmuyor', () => {
    const dup: readonly PositionEntry[] = [
      { position: 'GK', level: 'natural' },
      { position: 'GK', level: 'natural' },
    ];
    expect(() => renderWithI18n(<PositionMap positions={dup} />)).toThrow(RangeError);
    // Tip dışı kod: API'den gelen dize tip taşımaz; daraltma burada kasıtlı.
    const bad = [{ position: 'CB' as PositionCode, level: 'natural' as const }];
    expect(() => renderWithI18n(<PositionMap positions={bad} />)).toThrow(RangeError);
  });
});
