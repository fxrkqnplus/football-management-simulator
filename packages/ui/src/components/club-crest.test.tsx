/**
 * ClubCrest testleri.
 *
 * ⚠️ **jsdom GÖRSEL YÜKLEMİYOR** (6.5 `avatar.test.tsx` ölçümü): `AvatarImage`
 * `onLoad`/`onError` bekliyor, jsdom ikisini de tetiklemiyor, `<img>` bu
 * ortamda **hiç çizilmiyor**. Bu yüzden burada sınanan şey **yedek** (kalkan +
 * baş harf) ve kökün şekli/boyutu. Gizlenmiyor, **iddia ediliyor** ("ORTAM
 * SINIRI" testi).
 *
 * ⚠️ Radix yedeği **bir makro görev sonra** çiziyor (`delayMs={0}` sıfır
 * gecikme, sıfır bekleme değil) — yedek iddiaları `findBy*` ile.
 *
 * ⚠️ SVG elemanında `className` bir `SVGAnimatedString`dir, dize değil —
 * sınıf `getAttribute('class')` ile okunuyor.
 *
 * **TAKLİT ETMEDİĞİ:** görselin gerçekten çizildiği, `alt`ın `<img>`e ulaştığı,
 * `object-contain`ın armayı kırpmadığı — **Faz 17** (Playwright, G-02);
 * `--radius-sm`/token renklerinin ekranda uygulandığı — jsdom
 * `getComputedStyle` `var()` çözmüyor (6.0 ölçümü), sınıf adı iddia ediliyor;
 * görsel doğrulama **Faz 49** (G-05). Prosedürel arma (Faz 8) ve varlık
 * getirme (Faz 7) bu bileşenin işi değil, testi de yok.
 */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithI18n, testText } from '../test/render.js';
import { SPACE_BASE_PX, SPACE_SCALE } from '../tokens/geometry.js';
import * as ClubCrestModule from './club-crest.js';
import {
  CLUB_CREST_KEYS,
  CLUB_CREST_SIZES,
  ClubCrest,
  clubCrestPixelSize,
  type ClubCrestSize,
  initialsOf,
} from './club-crest.js';

/** Radix Avatar kökü — `I18nextProvider` DOM üretmediği için ilk eleman. */
function rootOf(container: HTMLElement): HTMLElement {
  const el = container.firstElementChild;
  if (!(el instanceof HTMLElement)) throw new Error('Arma kökü bulunamadı');
  return el;
}

/** SVG'de `className` `SVGAnimatedString` — dize olarak nitelikten. */
function classOf(el: Element): string {
  return el.getAttribute('class') ?? '';
}

const SIZE_NAMES = Object.keys(CLUB_CREST_SIZES) as readonly ClubCrestSize[];

describe('initialsOf — saf', () => {
  it('tek kelime → tek harf', () => {
    expect(initialsOf('Galatasaray')).toBe('G');
    expect(initialsOf('Trabzonspor')).toBe('T');
  });

  it('iki kelime → iki harf', () => {
    expect(initialsOf('Fenerbahçe SK')).toBe('FS');
    expect(initialsOf('Beşiktaş JK')).toBe('BJ');
  });

  it('EN FAZLA iki harf — üçüncü kelime atlanıyor', () => {
    expect(initialsOf('Real Sociedad de Fútbol')).toBe('RS');
    for (const name of [
      'Galatasaray',
      'Fenerbahçe SK',
      'Real Sociedad de Fútbol',
      'ßtraße ßtadt',
      '1. FC Köln',
    ]) {
      expect(Array.from(initialsOf(name)).length, name).toBeLessThanOrEqual(2);
    }
  });

  it('harf taşımayan kelimeler ATLANIYOR — sayı ve noktalama baş harf olmuyor', () => {
    expect(initialsOf('1. FC Köln')).toBe('FK');
    expect(initialsOf('1907 Fenerbahçe')).toBe('F');
  });

  it('TÜRKÇE büyük harf: `i` → `İ`, `ı` → `I` — `toUpperCase()` ile FARKLI sonuç', () => {
    expect(initialsOf('istanbul başakşehir')).toBe('İB');
    expect(initialsOf('ığdır')).toBe('I');
    expect(initialsOf('çaykur rizespor')).toBe('ÇR');
    // Yerel-bağımsız dönüşüm `i`yi `I` yapardı; iki yol gerçekten ayrışıyor,
    // "aynı şey" diye sadeleştirilemez.
    expect(initialsOf('istanbul')).not.toBe('istanbul'.charAt(0).toUpperCase());
    expect('istanbul'.charAt(0).toUpperCase()).toBe('I');
  });

  it('genişleyen büyük harf (`ß` → `SS`) tek kod noktasına kırpılıyor', () => {
    expect(initialsOf('ß')).toBe('S');
    expect(initialsOf('ßtraße ßtadt')).toBe('SS');
  });

  it('fazla ve baştaki/sondaki boşluk sorun değil', () => {
    expect(initialsOf('  Adana   Demirspor ')).toBe('AD');
  });

  it('hiç harf yoksa RangeError — Türkçe mesaj, girdi mesajda', () => {
    for (const bad of ['', '1907', '---', '   ']) {
      expect(() => initialsOf(bad), JSON.stringify(bad)).toThrow(RangeError);
      expect(() => initialsOf(bad), JSON.stringify(bad)).toThrow(/en az bir harf/);
    }
    expect(() => initialsOf('1907')).toThrow(/1907/);
  });
});

describe('clubCrestPixelSize — saf', () => {
  it('her boyut adı listedeki px değerini veriyor', () => {
    for (const [name, px] of Object.entries(CLUB_CREST_SIZES)) {
      expect(clubCrestPixelSize(name), name).toBe(px);
    }
  });

  it('listede olmayan ad RangeError — sessizce varsayılana düşmüyor', () => {
    expect(() => clubCrestPixelSize('xl')).toThrow(RangeError);
    expect(() => clubCrestPixelSize('xl')).toThrow(/xl/);
    // Mesaj geçerli adları LİSTEDEN sayıyor.
    expect(() => clubCrestPixelSize('xl')).toThrow(Object.keys(CLUB_CREST_SIZES).join(' | '));
    expect(() => clubCrestPixelSize('')).toThrow(RangeError);
  });
});

describe('CLUB_CREST_SIZES — kalibrasyon envanteri', () => {
  it('üç boyut, hepsi 4px ızgarada ve `sm < md < lg`', () => {
    expect(SIZE_NAMES).toEqual(['sm', 'md', 'lg']);
    for (const name of SIZE_NAMES) {
      expect(CLUB_CREST_SIZES[name] % SPACE_BASE_PX, name).toBe(0);
    }
    expect(CLUB_CREST_SIZES.sm).toBeLessThan(CLUB_CREST_SIZES.md);
    expect(CLUB_CREST_SIZES.md).toBeLessThan(CLUB_CREST_SIZES.lg);
  });

  it('her değer boşluk ölçeğinin bir basamağı — dosya başındaki gerekçe sayılarla tutuyor', () => {
    expect(CLUB_CREST_SIZES.sm).toBe(SPACE_SCALE['--space-6']);
    expect(CLUB_CREST_SIZES.md).toBe(SPACE_SCALE['--space-10']);
    expect(CLUB_CREST_SIZES.lg).toBe(SPACE_SCALE['--space-16']);
  });
});

describe('ClubCrest — render', () => {
  it('yedek `role="img"` ve erişilebilir adı ÇEVİRİ ANAHTARINDAN', async () => {
    renderWithI18n(<ClubCrest name="Galatasaray" />);
    const fallback = await screen.findByRole('img', { name: testText(CLUB_CREST_KEYS.alt) });
    expect(fallback.tagName).toBe('SPAN');
    // Kalkan SVG'si erişilebilirlik ağacında YOK — ad yedekten geliyor.
    const svg = fallback.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('baş harfler yedekte SVG `<text>` olarak çiziliyor', async () => {
    renderWithI18n(<ClubCrest name="Galatasaray SK" />);
    const text = await screen.findByText('GS');
    expect(text.tagName).toBe('text');
    expect(text.namespaceURI).toBe('http://www.w3.org/2000/svg');
  });

  it('kök `--radius-sm` taşıyor, `Avatar`ın `--radius-full`ı EZİLMİŞ — iki yönlü', () => {
    const { container } = renderWithI18n(<ClubCrest name="Galatasaray" />);
    const root = rootOf(container);
    expect(root.className).toContain('rounded-[var(--radius-sm)]');
    expect(root.className).not.toContain('rounded-[var(--radius-full)]');
  });

  it('varsayılan boyut `md` — inline px, listeden', () => {
    const { container } = renderWithI18n(<ClubCrest name="Galatasaray" />);
    const root = rootOf(container);
    expect(root.style.width).toBe(`${String(CLUB_CREST_SIZES.md)}px`);
    expect(root.style.height).toBe(`${String(CLUB_CREST_SIZES.md)}px`);
  });

  it('her boyut adı kökün genişlik/yüksekliğine LİSTEDEN gidiyor', () => {
    for (const name of SIZE_NAMES) {
      const { container, unmount } = renderWithI18n(<ClubCrest name="Galatasaray" size={name} />);
      const root = rootOf(container);
      expect(root.style.width, name).toBe(`${String(CLUB_CREST_SIZES[name])}px`);
      expect(root.style.height, name).toBe(`${String(CLUB_CREST_SIZES[name])}px`);
      unmount();
    }
  });

  it('çağıranın `className`i uygulanıyor, arma şekli kalıyor', () => {
    const { container } = renderWithI18n(<ClubCrest name="Galatasaray" className="ring-1" />);
    const root = rootOf(container);
    expect(root.className).toContain('ring-1');
    expect(root.className).toContain('rounded-[var(--radius-sm)]');
  });

  it('baş harf yazı tipi `family-name:` ETİKETLİ — etiketsiz `font-[var(` YOK', async () => {
    renderWithI18n(<ClubCrest name="Galatasaray" />);
    const text = await screen.findByText('G');
    // Ölçüldü (Tailwind 4.3.3): etiketsiz biçim `font-weight` üretiyor ve
    // tailwind-merge'de `font-semibold` tarafından siliniyor.
    expect(classOf(text)).toContain('font-[family-name:var(--font-ui)]');
    expect(classOf(text)).toContain('font-semibold');
    expect(classOf(text)).not.toMatch(/font-\[var\(/);
  });

  it('kalkan ve baş harf yüzeyleri TOKEN’DAN — sabit hex yok', async () => {
    const { container } = renderWithI18n(<ClubCrest name="Galatasaray" />);
    const text = await screen.findByText('G');
    const path = container.querySelector('path');
    if (path === null) throw new Error('Kalkan yolu bulunamadı');
    expect(classOf(path)).toContain('fill-[var(--bg-active)]');
    expect(classOf(path)).toContain('stroke-[var(--border-strong)]');
    expect(classOf(text)).toContain('fill-[var(--text-primary)]');
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('ORTAM SINIRI ADIYLA: `src` verilse de jsdom’da `<img>` HİÇ çizilmiyor', async () => {
    const { container } = renderWithI18n(<ClubCrest name="Galatasaray" src="/gs-64.webp" />);
    // Yedek çizildi (görsel yüklenmedi diye) — ve `<img>` DOM'da yok. "Görsel
    // çiziliyor" iddiası burada KANITLANAMAZ: Faz 17 (G-02).
    await screen.findByRole('img', { name: testText(CLUB_CREST_KEYS.alt) });
    expect(container.querySelector('img')).toBeNull();
  });

  it('harfsiz ad render sırasında da RangeError — bileşen bir baş harf uydurmuyor', () => {
    expect(() => renderWithI18n(<ClubCrest name="1907" />)).toThrow(RangeError);
  });

  it('listede olmayan boyut render sırasında da RangeError', () => {
    const bogus = 'xl' as unknown as ClubCrestSize;
    expect(() => renderWithI18n(<ClubCrest name="Galatasaray" size={bogus} />)).toThrow(RangeError);
  });
});

describe('sözleşme §0 — anahtar sabiti', () => {
  it('modül `_KEYS` ile biten TEK BİR şey dışa aktarıyor', () => {
    const keysExports = Object.keys(ClubCrestModule).filter((name) => name.endsWith('_KEYS'));
    expect(keysExports).toEqual(['CLUB_CREST_KEYS']);
  });
});
