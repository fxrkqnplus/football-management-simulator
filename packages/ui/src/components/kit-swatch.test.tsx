/**
 * KitSwatch testleri.
 *
 * TAKLİT ETMEDİĞİ: jsdom SVG'yi **çizmez** (`getBoundingClientRect` 0×0,
 * `getBBox` yok) ve Tailwind sınıflarını CSS'e çevirmez — burada iddia edilen
 * şey **yolların, `fill` niteliklerinin ve sınıfların DOM'da olduğu**, ekranda
 * görünen forma değil. Gerçek doğrulama **Faz 17** (G-02, Playwright), görsel
 * doğrulama **Faz 49** (G-05).
 *
 * ⚠️ SVG elemanında `className` bir `SVGAnimatedString` — sınıf
 * `getAttribute('class')` ile okunuyor; `element.className` bir dize değil.
 *
 * ⚠️ ui ↔ db kopya eşitliği (`KIT_TYPES` · `KIT_COLOR_SLOTS`) BU DOSYADA
 * DEĞİL, `scripts/inventory-guards.test.mjs` ④'te — `packages/ui` db'yi import
 * edemez (§2.4). Burada iddia edilen, sözleşme §1.7'nin literal listesi; iki
 * nöbetçi aynı mutasyonu iki yönden yakalar.
 */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithI18n, testText } from '../test/render.js';
import {
  isKitColor,
  isKitType,
  KIT_COLOR_SLOTS,
  KIT_SWATCH_KEYS,
  KIT_SWATCH_OUTLINE_CLASS,
  KIT_SWATCH_PATHS,
  KIT_SWATCH_SIZE_CLASSES,
  KIT_SWATCH_SIZES,
  KIT_SWATCH_VIEWBOX,
  KIT_TYPE_KEY_NAMES,
  KIT_TYPES,
  KitSwatch,
  kitSwatchColors,
  type KitType,
  kitTypeKeyName,
} from './kit-swatch.js';

/** Sözleşme §1.7 literalleri — prose'dan değil buradan. */
const CONTRACT_KIT_TYPES = ['home', 'away', 'third'];
const CONTRACT_COLOR_SLOTS = [2, 3];

const TWO = ['#FFCC00', '#A90432'];
const THREE = ['#FFCC00', '#A90432', '#000000'];

const HEX_PATTERN = /#[0-9a-fA-F]{3,8}\b/;

const classOf = (element: Element): string => element.getAttribute('class') ?? '';

describe('kapalı küme kopyaları — sözleşme §1.7 ile birebir, sıra dahil', () => {
  it('`KIT_TYPES` üç tür, o sırayla', () => {
    expect([...KIT_TYPES]).toEqual(CONTRACT_KIT_TYPES);
  });

  it('`KIT_COLOR_SLOTS` 2 ve 3, o sırayla', () => {
    expect([...KIT_COLOR_SLOTS]).toEqual(CONTRACT_COLOR_SLOTS);
  });

  it('HER türün anahtar adı var, ad türü taşıyor, adlar benzersiz', () => {
    expect(Object.keys(KIT_TYPE_KEY_NAMES).sort()).toEqual([...KIT_TYPES].sort());
    const names: string[] = [];
    for (const kind of KIT_TYPES) {
      const name = KIT_TYPE_KEY_NAMES[kind];
      // `kindHome` → `kind.home`: ad, türün kendi anahtarına gidiyor.
      expect(name).toBe(`kind${kind.charAt(0).toUpperCase()}${kind.slice(1)}`);
      expect(KIT_SWATCH_KEYS[name]).toContain(`.kind.${kind}`);
      names.push(name);
    }
    expect(new Set(names).size).toBe(names.length);
  });

  it('anahtar sayısı listeden: tür başına bir', () => {
    expect(Object.keys(KIT_SWATCH_KEYS)).toHaveLength(KIT_TYPES.length);
  });

  it('`isKitType` kümeyi tanıyor, dışını reddediyor', () => {
    for (const kind of KIT_TYPES) expect(isKitType(kind)).toBe(true);
    expect(isKitType('Home')).toBe(false);
    expect(isKitType('fourth')).toBe(false);
    expect(isKitType('')).toBe(false);
  });
});

describe('`kitTypeKeyName` — saf', () => {
  it('her tür kendi anahtar adına', () => {
    for (const kind of KIT_TYPES) expect(kitTypeKeyName(kind)).toBe(KIT_TYPE_KEY_NAMES[kind]);
  });

  it('küme dışı tür — RangeError, mesaj Türkçe, değeri ve geçerli kümeyi söylüyor', () => {
    expect(() => kitTypeKeyName('fourth')).toThrow(RangeError);
    expect(() => kitTypeKeyName('fourth')).toThrow(/fourth/);
    expect(() => kitTypeKeyName('fourth')).toThrow(/home, away, third/);
  });
});

describe('`isKitColor` — `#RRGGBB`, ne eksik ne fazla', () => {
  it('altı haneli hex, büyük ve küçük harf', () => {
    expect(isKitColor('#FFCC00')).toBe(true);
    expect(isKitColor('#ffcc00')).toBe(true);
    expect(isKitColor('#0a1B2c')).toBe(true);
  });

  it('kısa biçim · adlı renk · diyezsiz · yedi hane · boşluk · hex dışı hane REDDEDİLİR', () => {
    for (const bad of [
      '#FFF',
      'white',
      'FFCC00',
      '#FFCC000',
      ' #FFCC00',
      '#FFCC00 ',
      '#GGGGGG',
      '',
    ]) {
      expect(isKitColor(bad), bad).toBe(false);
    }
  });
});

describe('`kitSwatchColors` — saf', () => {
  it('iki yuva: gövde · kollar, yaka kolların rengini alıyor', () => {
    expect(kitSwatchColors(TWO)).toEqual({
      body: '#FFCC00',
      sleeves: '#A90432',
      collar: '#A90432',
    });
  });

  it('üç yuva: yaka üçüncü renk', () => {
    expect(kitSwatchColors(THREE)).toEqual({
      body: '#FFCC00',
      sleeves: '#A90432',
      collar: '#000000',
    });
  });

  it('yuva sayısı `KIT_COLOR_SLOTS` dışında — RangeError, mesaj sayıyı ve geçerli kümeyi söylüyor', () => {
    for (const colors of [[], ['#FFCC00'], [...THREE, '#FFFFFF']]) {
      expect(() => kitSwatchColors(colors), String(colors.length)).toThrow(RangeError);
      expect(() => kitSwatchColors(colors)).toThrow(new RegExp(String(colors.length)));
    }
    expect(() => kitSwatchColors([])).toThrow(/2 veya 3/);
  });

  it('geçersiz renk — RangeError, mesaj değeri söylüyor; hangi konumda olursa olsun', () => {
    expect(() => kitSwatchColors(['#FFF', '#A90432'])).toThrow(RangeError);
    expect(() => kitSwatchColors(['#FFF', '#A90432'])).toThrow(/#FFF/);
    expect(() => kitSwatchColors(['#FFCC00', 'red'])).toThrow(RangeError);
    expect(() => kitSwatchColors(['#FFCC00', '#A90432', 'black'])).toThrow(/black/);
  });

  it('her geçerli yuva sayısı için bir örnek geçiyor — listeden', () => {
    for (const slots of KIT_COLOR_SLOTS) {
      const colors = Array.from({ length: slots }, (_, i) => `#${String(i).repeat(6)}`);
      expect(() => kitSwatchColors(colors)).not.toThrow();
    }
  });
});

describe('silüet ve sınıflar — token var, sabit hex yok', () => {
  it('üç parça: iki kol, gövde, yaka; yollar dolu ve birbirinden farklı', () => {
    const all = [...KIT_SWATCH_PATHS.sleeves, KIT_SWATCH_PATHS.body, KIT_SWATCH_PATHS.collar];
    expect(KIT_SWATCH_PATHS.sleeves).toHaveLength(2);
    for (const d of all) expect(d.trim()).not.toBe('');
    expect(new Set(all).size).toBe(all.length);
  });

  it('kontur `var(--border-strong)` — hex değil; boyut sınıfları listeden', () => {
    expect(KIT_SWATCH_OUTLINE_CLASS).toContain('var(--border-strong)');
    expect(KIT_SWATCH_OUTLINE_CLASS).not.toMatch(HEX_PATTERN);
    expect(Object.keys(KIT_SWATCH_SIZE_CLASSES).sort()).toEqual([...KIT_SWATCH_SIZES].sort());
    for (const size of KIT_SWATCH_SIZES) {
      expect(KIT_SWATCH_SIZE_CLASSES[size].trim()).not.toBe('');
      expect(KIT_SWATCH_SIZE_CLASSES[size]).not.toMatch(HEX_PATTERN);
    }
  });
});

describe('KitSwatch — render', () => {
  it('HER tür: `role=img`, `aria-label` = t(kind.<tür>), `data-kind`, `data-slots`', () => {
    for (const kind of KIT_TYPES) {
      const { unmount } = renderWithI18n(<KitSwatch kind={kind} colors={TWO} />);
      const root = screen.getByRole('img');
      expect(root.getAttribute('aria-label')).toBe(
        testText(KIT_SWATCH_KEYS[KIT_TYPE_KEY_NAMES[kind]]),
      );
      expect(root.getAttribute('data-kind')).toBe(kind);
      expect(root.getAttribute('data-slots')).toBe(String(TWO.length));
      unmount();
    }
  });

  it('renkler parçalara `fill` ile OLDUĞU GİBİ gidiyor — iki yuvada yaka = kollar', () => {
    renderWithI18n(<KitSwatch kind="home" colors={TWO} />);
    const root = screen.getByRole('img');
    const fills = (part: string): string[] =>
      [...root.querySelectorAll(`[data-part="${part}"]`)].map((p) => p.getAttribute('fill') ?? '');
    expect(fills('sleeves')).toEqual(['#A90432', '#A90432']);
    expect(fills('body')).toEqual(['#FFCC00']);
    expect(fills('collar')).toEqual(['#A90432']);
  });

  it('üç yuvada yaka üçüncü renk; `data-slots` 3', () => {
    renderWithI18n(<KitSwatch kind="third" colors={THREE} />);
    const root = screen.getByRole('img');
    expect(root.querySelector('[data-part="collar"]')?.getAttribute('fill')).toBe('#000000');
    expect(root.getAttribute('data-slots')).toBe('3');
  });

  it('SVG: erişilebilirlik ağacından gizli, viewBox sabitten, kontur sınıfı üzerinde, yollar sabitten', () => {
    renderWithI18n(<KitSwatch kind="away" colors={TWO} />);
    const svg = screen.getByRole('img').querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('viewBox')).toBe(KIT_SWATCH_VIEWBOX);
    expect(classOf(svg ?? document.body)).toContain(KIT_SWATCH_OUTLINE_CLASS);
    const paths = [...(svg?.querySelectorAll('path') ?? [])].map((p) => p.getAttribute('d'));
    expect(paths).toEqual([
      ...KIT_SWATCH_PATHS.sleeves,
      KIT_SWATCH_PATHS.body,
      KIT_SWATCH_PATHS.collar,
    ]);
  });

  it('boyut: varsayılan `md`, `sm` verilince `sm`; çağıranın `className`i uygulanıyor', () => {
    const md = KIT_SWATCH_SIZE_CLASSES.md.split(' ')[0] ?? '';
    const sm = KIT_SWATCH_SIZE_CLASSES.sm.split(' ')[0] ?? '';

    const { unmount } = renderWithI18n(<KitSwatch kind="home" colors={TWO} />);
    expect(screen.getByRole('img').className).toContain(md);
    unmount();

    renderWithI18n(<KitSwatch kind="home" colors={TWO} size="sm" className="ml-1" />);
    const root = screen.getByRole('img');
    expect(root.className).toContain(sm);
    expect(root.className).not.toContain(md);
    expect(root.className).toContain('ml-1');
  });

  it('geçersiz renk / yuva sayısı / tür render sırasında da RangeError — bileşen bir forma uydurmuyor', () => {
    expect(() => renderWithI18n(<KitSwatch kind="home" colors={['#FFCC00']} />)).toThrow(
      RangeError,
    );
    expect(() => renderWithI18n(<KitSwatch kind="home" colors={['#FFF', '#000']} />)).toThrow(
      RangeError,
    );
    // Tip dışı tür: API'den gelen dize tip taşımaz; daraltma burada kasıtlı.
    const kind = 'fourth' as KitType;
    expect(() => renderWithI18n(<KitSwatch kind={kind} colors={TWO} />)).toThrow(RangeError);
  });
});
