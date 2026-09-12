/**
 * PlayerPortrait testleri.
 *
 * ⚠️ **jsdom GÖRSEL YÜKLEMİYOR** (6.5 `avatar.test.tsx` ölçümü): `AvatarImage`
 * `onLoad`/`onError` bekliyor, jsdom ikisini de tetiklemiyor, `<img>` bu
 * ortamda **hiç çizilmiyor**. Sınanan şey **yedek** (silüet) ve kökün
 * şekli/boyutu; sınır gizlenmiyor, **iddia ediliyor** ("ORTAM SINIRI" testi).
 *
 * ⚠️ Radix yedeği **bir makro görev sonra** çiziyor (`delayMs={0}`) — yedek
 * iddiaları `findBy*` ile. SVG elemanında `className` `SVGAnimatedString` —
 * sınıf `getAttribute('class')` ile okunuyor.
 *
 * **TAKLİT ETMEDİĞİ:** görselin gerçekten çizildiği, `alt`ın `<img>`e ulaştığı,
 * `object-cover`ın kare olmayan kaynağı doldurduğu — **Faz 17** (Playwright,
 * G-02); `--radius-md`/token renklerinin ekranda uygulandığı — jsdom
 * `getComputedStyle` `var()` çözmüyor (6.0 ölçümü), sınıf adı iddia ediliyor;
 * görsel doğrulama **Faz 49** (G-05). Yüz hizalı kırpma, `PORTRAIT_STYLE`,
 * prosedürel avatar (Faz 9) ve varlık getirme (Faz 7) bu bileşenin işi değil,
 * testi de yok.
 */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithI18n, testText } from '../test/render.js';
import { SPACE_BASE_PX, SPACE_SCALE } from '../tokens/geometry.js';
import { CLUB_CREST_SIZES } from './club-crest.js';
import * as PlayerPortraitModule from './player-portrait.js';
import {
  PLAYER_PORTRAIT_KEYS,
  PLAYER_PORTRAIT_SIZES,
  PlayerPortrait,
  playerPortraitPixelSize,
  type PlayerPortraitProps,
  type PlayerPortraitSize,
} from './player-portrait.js';

/** `spec/05` §7.5: *"Dokunma hedefi minimum 44×44px"* — kaynak spec, liste değil. */
const TOUCH_TARGET_MIN_PX = 44;

/** Radix Avatar kökü — `I18nextProvider` DOM üretmediği için ilk eleman. */
function rootOf(container: HTMLElement): HTMLElement {
  const el = container.firstElementChild;
  if (!(el instanceof HTMLElement)) throw new Error('Portre kökü bulunamadı');
  return el;
}

/** SVG'de `className` `SVGAnimatedString` — dize olarak nitelikten. */
function classOf(el: Element): string {
  return el.getAttribute('class') ?? '';
}

const SIZE_NAMES = Object.keys(PLAYER_PORTRAIT_SIZES) as readonly PlayerPortraitSize[];

describe('playerPortraitPixelSize — saf', () => {
  it('her boyut adı listedeki px değerini veriyor', () => {
    for (const [name, px] of Object.entries(PLAYER_PORTRAIT_SIZES)) {
      expect(playerPortraitPixelSize(name), name).toBe(px);
    }
  });

  it('listede olmayan ad RangeError — sessizce varsayılana düşmüyor', () => {
    expect(() => playerPortraitPixelSize('xl')).toThrow(RangeError);
    expect(() => playerPortraitPixelSize('xl')).toThrow(/xl/);
    // Mesaj geçerli adları LİSTEDEN sayıyor.
    expect(() => playerPortraitPixelSize('xl')).toThrow(
      Object.keys(PLAYER_PORTRAIT_SIZES).join(' | '),
    );
    expect(() => playerPortraitPixelSize('')).toThrow(RangeError);
  });
});

describe('PLAYER_PORTRAIT_SIZES — kalibrasyon envanteri', () => {
  it('üç boyut, hepsi 4px ızgarada ve `sm < md < lg`', () => {
    expect(SIZE_NAMES).toEqual(['sm', 'md', 'lg']);
    for (const name of SIZE_NAMES) {
      expect(PLAYER_PORTRAIT_SIZES[name] % SPACE_BASE_PX, name).toBe(0);
    }
    expect(PLAYER_PORTRAIT_SIZES.sm).toBeLessThan(PLAYER_PORTRAIT_SIZES.md);
    expect(PLAYER_PORTRAIT_SIZES.md).toBeLessThan(PLAYER_PORTRAIT_SIZES.lg);
  });

  it('dosya başındaki gerekçe sayılarla tutuyor: `--space-8` · `--space-12` · 2×`--space-12`', () => {
    expect(PLAYER_PORTRAIT_SIZES.sm).toBe(SPACE_SCALE['--space-8']);
    expect(PLAYER_PORTRAIT_SIZES.md).toBe(SPACE_SCALE['--space-12']);
    expect(PLAYER_PORTRAIT_SIZES.lg).toBe(2 * SPACE_SCALE['--space-12']);
  });

  it('`md` tek başına bir dokunma hedefi (≥ 44), `sm` DEĞİL — iki yönlü', () => {
    expect(PLAYER_PORTRAIT_SIZES.md).toBeGreaterThanOrEqual(TOUCH_TARGET_MIN_PX);
    expect(PLAYER_PORTRAIT_SIZES.sm).toBeLessThan(TOUCH_TARGET_MIN_PX);
  });

  it('bir yüz bir kalkandan daha çok piksel ister — her basamak armanınkinden büyük', () => {
    for (const name of SIZE_NAMES) {
      expect(PLAYER_PORTRAIT_SIZES[name], name).toBeGreaterThan(CLUB_CREST_SIZES[name]);
    }
  });
});

describe('PlayerPortrait — render', () => {
  it('yedek `role="img"` ve erişilebilir adı ÇEVİRİ ANAHTARINDAN', async () => {
    renderWithI18n(<PlayerPortrait name="Arda Güler" />);
    const fallback = await screen.findByRole('img', {
      name: testText(PLAYER_PORTRAIT_KEYS.alt),
    });
    expect(fallback.tagName).toBe('SPAN');
    // Silüet SVG'si erişilebilirlik ağacında YOK — ad yedekten geliyor.
    const svg = fallback.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('silüet: baş (`circle`) + omuz (`path`), SVG ad alanında', async () => {
    const { container } = renderWithI18n(<PlayerPortrait name="Arda Güler" />);
    await screen.findByRole('img', { name: testText(PLAYER_PORTRAIT_KEYS.alt) });
    const head = container.querySelector('circle');
    const shoulders = container.querySelector('path');
    expect(head?.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(shoulders?.namespaceURI).toBe('http://www.w3.org/2000/svg');
  });

  it('BAŞ HARF YOK — silüet bir kimlik uydurmuyor', async () => {
    const { container } = renderWithI18n(<PlayerPortrait name="Arda Güler" />);
    await screen.findByRole('img', { name: testText(PLAYER_PORTRAIT_KEYS.alt) });
    expect(screen.queryByText('AG')).toBeNull();
    expect(container.querySelector('text')).toBeNull();
  });

  it('kök `--radius-md` taşıyor; `Avatar`ın `--radius-full`ı ve armanın `--radius-sm`i YOK', () => {
    const { container } = renderWithI18n(<PlayerPortrait name="Arda Güler" />);
    const root = rootOf(container);
    expect(root.className).toContain('rounded-[var(--radius-md)]');
    expect(root.className).not.toContain('rounded-[var(--radius-full)]');
    expect(root.className).not.toContain('rounded-[var(--radius-sm)]');
  });

  it('varsayılan boyut `md` — inline px, listeden', () => {
    const { container } = renderWithI18n(<PlayerPortrait name="Arda Güler" />);
    const root = rootOf(container);
    expect(root.style.width).toBe(`${String(PLAYER_PORTRAIT_SIZES.md)}px`);
    expect(root.style.height).toBe(`${String(PLAYER_PORTRAIT_SIZES.md)}px`);
  });

  it('her boyut adı kökün genişlik/yüksekliğine LİSTEDEN gidiyor', () => {
    for (const name of SIZE_NAMES) {
      const { container, unmount } = renderWithI18n(
        <PlayerPortrait name="Arda Güler" size={name} />,
      );
      const root = rootOf(container);
      expect(root.style.width, name).toBe(`${String(PLAYER_PORTRAIT_SIZES[name])}px`);
      expect(root.style.height, name).toBe(`${String(PLAYER_PORTRAIT_SIZES[name])}px`);
      unmount();
    }
  });

  it('çağıranın `className`i uygulanıyor, portre şekli kalıyor', () => {
    const { container } = renderWithI18n(<PlayerPortrait name="Arda Güler" className="ring-1" />);
    const root = rootOf(container);
    expect(root.className).toContain('ring-1');
    expect(root.className).toContain('rounded-[var(--radius-md)]');
  });

  it('silüet yüzeyleri TOKEN’DAN — baş ve omuz aynı çift, sabit hex yok', async () => {
    const { container } = renderWithI18n(<PlayerPortrait name="Arda Güler" />);
    await screen.findByRole('img', { name: testText(PLAYER_PORTRAIT_KEYS.alt) });
    const head = container.querySelector('circle');
    const shoulders = container.querySelector('path');
    if (head === null || shoulders === null) throw new Error('Silüet bulunamadı');
    for (const shape of [head, shoulders]) {
      expect(classOf(shape)).toContain('fill-[var(--bg-active)]');
      expect(classOf(shape)).toContain('stroke-[var(--border-strong)]');
    }
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    // Etiketsiz `font-[var(`/`text-[var(` BU DOSYANIN çizdiği elemanlarda YOK
    // (ölçüm: dosya başı). Kapsam bilerek SVG ile sınırlı: `AvatarFallback`ın
    // kendi sınıfları `avatar.tsx`in — ilk yazımda `container.innerHTML`
    // taranınca oradan `text-[var(--text-secondary)]` geldi ve aynı ölçüm
    // `text-[…var(--text-sm)]` ile `font-[…var(--font-ui)]`nin tailwind-merge'de
    // SİLİNDİĞİNİ gösterdi (ÇIKTI'da İSTEK).
    for (const el of container.querySelectorAll('svg, svg *')) {
      expect(classOf(el), el.tagName).not.toMatch(/font-\[var\(|text-\[var\(/);
    }
  });

  it('ORTAM SINIRI ADIYLA: `src` verilse de jsdom’da `<img>` HİÇ çizilmiyor', async () => {
    const { container } = renderWithI18n(
      <PlayerPortrait name="Arda Güler" src="/player-12847-128.webp" />,
    );
    // Yedek çizildi (görsel yüklenmedi diye) — ve `<img>` DOM'da yok. "Görsel
    // çiziliyor" iddiası burada KANITLANAMAZ: Faz 17 (G-02).
    await screen.findByRole('img', { name: testText(PLAYER_PORTRAIT_KEYS.alt) });
    expect(container.querySelector('img')).toBeNull();
  });

  it('listede olmayan boyut render sırasında da RangeError', () => {
    const bogus = 'xl' as unknown as PlayerPortraitSize;
    expect(() => renderWithI18n(<PlayerPortrait name="Arda Güler" size={bogus} />)).toThrow(
      RangeError,
    );
  });
});

describe('sözleşme §1.6', () => {
  it('`shape` prop’u YOK (K-6) — tip düzeyinde', () => {
    // Derleme iddiası: `PlayerPortraitProps`a `shape` eklenirse bu atama
    // TS2322 ile kırılır (`pnpm --filter @fms/ui typecheck`); vitest yalnızca
    // çalışma zamanı değerini görür.
    const hasShape: 'shape' extends keyof PlayerPortraitProps ? true : false = false;
    expect(hasShape).toBe(false);
    expect(Object.keys(PLAYER_PORTRAIT_SIZES)).not.toContain('shape');
  });

  it('modül `_KEYS` ile biten TEK BİR şey dışa aktarıyor', () => {
    const keysExports = Object.keys(PlayerPortraitModule).filter((name) => name.endsWith('_KEYS'));
    expect(keysExports).toEqual(['PLAYER_PORTRAIT_KEYS']);
  });
});
