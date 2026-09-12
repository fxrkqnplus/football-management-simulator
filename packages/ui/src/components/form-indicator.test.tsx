/**
 * FormIndicator testleri.
 *
 * TAKLİT ETMEDİĞİ: jsdom `title`ı bir tooltip olarak ÇİZMEZ ve Tailwind
 * sınıflarını CSS'e çevirmez — burada iddia edilen şey **niteliğin ve sınıfın
 * DOM'da olduğu**, ekranda görünen renk/tooltip değil. Gerçek doğrulama
 * **Faz 17** (G-02, Playwright), görsel doğrulama **Faz 49** (G-05).
 *
 * ⚠️ **ENTERPOLASYON — fixture'a yer tutucu bu dosyada ekleniyor, ve sebebi
 * ölçülebilir.** `test/render.tsx` kaynağı anahtardan **türetiyor**
 * (`[formIndicator.aria]`) ve bir yer tutucu türetemez — anahtar onu
 * taşımıyor. O metinle `t(aria, { count })` çağrısı `count`u **sessizce
 * yutar**: `count` hiç geçirilmese de test yeşil kalırdı. Bu dosya kendi
 * anahtarına `{{count}}` ekliyor (Türkçe değil, yine anahtar metni + yer
 * tutucu) ve `afterAll`da geri alıyor. Yer tutucu ADI (`count`)
 * `apps/web/src/locales/tr/common.json` ile **elle** hizalı — `i18n:check`
 * yer tutucu adlarını denetlemiyor; bilinen sınır, burada yazılı.
 */
import { screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { renderWithI18n, testI18n, testText } from '../test/render.js';
import { SEMANTIC_TONE_CLASSES } from '../tokens/semantic-tone.js';
import { BADGE_VARIANT_CLASSES } from './badge.js';
import {
  FORM_INDICATOR_DEFAULT_MAX,
  FORM_INDICATOR_KEYS,
  FORM_INDICATOR_SIZE_CLASSES,
  FORM_INDICATOR_SIZES,
  FORM_RESULT_CLASSES,
  FORM_RESULT_KEY_NAMES,
  FORM_RESULTS,
  FormIndicator,
  type FormResult,
  isFormResult,
  lastResults,
} from './form-indicator.js';

/** `common:ui.formIndicator.aria` → i18next deposundaki yol (`ui.formIndicator.aria`). */
const ariaStorePath = FORM_INDICATOR_KEYS.aria.split(':')[1] ?? '';
const ARIA_TEMPLATE = `${testText(FORM_INDICATOR_KEYS.aria)}{{count}}`;

beforeAll(() => {
  expect(ariaStorePath).not.toBe('');
  testI18n().addResource('tr', 'common', ariaStorePath, ARIA_TEMPLATE);
});

afterAll(() => {
  testI18n().addResource('tr', 'common', ariaStorePath, testText(FORM_INDICATOR_KEYS.aria));
});

const SEVEN: readonly FormResult[] = ['win', 'draw', 'loss', 'win', 'win', 'draw', 'loss'];

const shownResults = (): (string | null)[] =>
  screen.getAllByRole('listitem').map((li) => li.getAttribute('data-result'));

describe('sonuç envanteri — sayı LİSTEDEN türetiliyor', () => {
  it('üç sonuç, ROADMAP sırasıyla (G/B/M)', () => {
    expect(FORM_RESULTS).toEqual(['win', 'draw', 'loss']);
  });

  it('`isFormResult` İKİ YÖNLÜ — üyeye evet, yabancıya/büyük harfe/boşa hayır', () => {
    for (const result of FORM_RESULTS) expect(isFormResult(result)).toBe(true);
    expect(isFormResult('x')).toBe(false);
    expect(isFormResult('WIN')).toBe(false);
    expect(isFormResult('')).toBe(false);
  });

  it('HER sonucun kısa ve uzun anahtar adı var, adlar sonucu taşıyor ve çapraz bağlı değil', () => {
    expect(Object.keys(FORM_RESULT_KEY_NAMES).sort()).toEqual([...FORM_RESULTS].sort());
    const names: string[] = [];
    for (const result of FORM_RESULTS) {
      const { short, long } = FORM_RESULT_KEY_NAMES[result];
      // `winShort` → `win.short`: ad, sonucun kendi anahtarına gidiyor.
      expect(short).toBe(`${result}Short`);
      expect(long).toBe(`${result}Long`);
      expect(FORM_INDICATOR_KEYS[short]).toContain(`.${result}.short`);
      expect(FORM_INDICATOR_KEYS[long]).toContain(`.${result}.long`);
      names.push(short, long);
    }
    expect(new Set(names).size).toBe(names.length);
  });

  it('anahtar sayısı listeden: sonuç × 2 + aria + empty', () => {
    expect(Object.keys(FORM_INDICATOR_KEYS)).toHaveLength(FORM_RESULTS.length * 2 + 2);
  });

  it('varsayılan pencere `spec/01`:990 ile aynı — son 5 maç', () => {
    expect(FORM_INDICATOR_DEFAULT_MAX).toBe(5);
  });
});

describe('renk sınıfları — kaynak paylaşılıyor, kopyalanmıyor', () => {
  it('galibiyet ve mağlubiyet Toast/Badge ile AYNI anlamsal kaynaktan', () => {
    expect(FORM_RESULT_CLASSES.win).toBe(SEMANTIC_TONE_CLASSES.success);
    expect(FORM_RESULT_CLASSES.loss).toBe(SEMANTIC_TONE_CLASSES.danger);
  });

  it('beraberlik NÖTR yüzey — Badge ile aynı, anlamsal token DEĞİL', () => {
    expect(FORM_RESULT_CLASSES.draw).toBe(BADGE_VARIANT_CLASSES.neutral);
    expect(FORM_RESULT_CLASSES.draw).not.toMatch(/--(info|success|warning|danger)\)/);
    expect(FORM_RESULT_CLASSES.draw).toContain('--bg-elevated');
  });

  it('HER sonucun ve HER boyutun sınıfı var; hiçbirinde sabit hex yok', () => {
    expect(Object.keys(FORM_RESULT_CLASSES).sort()).toEqual([...FORM_RESULTS].sort());
    expect(Object.keys(FORM_INDICATOR_SIZE_CLASSES).sort()).toEqual(
      [...FORM_INDICATOR_SIZES].sort(),
    );
    for (const result of FORM_RESULTS) {
      expect(FORM_RESULT_CLASSES[result].trim()).not.toBe('');
      expect(FORM_RESULT_CLASSES[result]).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
    for (const size of FORM_INDICATOR_SIZES) {
      expect(FORM_INDICATOR_SIZE_CLASSES[size].trim()).not.toBe('');
      expect(FORM_INDICATOR_SIZE_CLASSES[size]).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
});

describe('`lastResults` — saf', () => {
  it('SON `max` elemanı alıyor (en yeniler), sırayı koruyor, ters çevirmiyor', () => {
    expect(lastResults(SEVEN, 5)).toEqual(['loss', 'win', 'win', 'draw', 'loss']);
    expect(lastResults(SEVEN, 1)).toEqual(['loss']);
  });

  it('`max` verilmezse varsayılan pencere', () => {
    expect(lastResults(SEVEN)).toEqual(lastResults(SEVEN, FORM_INDICATOR_DEFAULT_MAX));
    expect(lastResults(SEVEN)).toHaveLength(FORM_INDICATOR_DEFAULT_MAX);
  });

  it('dizi pencereden kısaysa OLDUĞU GİBİ; boşsa boş; girdi değişmiyor', () => {
    const three: readonly FormResult[] = ['win', 'draw', 'loss'];
    expect(lastResults(three, 5)).toEqual(['win', 'draw', 'loss']);
    expect(lastResults(three, 3)).toEqual(['win', 'draw', 'loss']);
    expect(lastResults([], 5)).toEqual([]);
    expect(three).toEqual(['win', 'draw', 'loss']);
    expect(lastResults(three, 5)).not.toBe(three);
  });

  it('küme dışı sonuç SESSİZCE KIRPILMIYOR — RangeError, mesaj değeri söylüyor', () => {
    expect(() => lastResults(['win', 'victory'], 5)).toThrow(RangeError);
    expect(() => lastResults(['win', 'victory'], 5)).toThrow(/victory/);
    expect(() => lastResults(['W'], 5)).toThrow(RangeError);
  });

  it('geçersiz `max` — 0, negatif, kesirli, NaN → RangeError', () => {
    for (const max of [0, -1, 2.5, Number.NaN]) {
      expect(() => lastResults(SEVEN, max), `max ${String(max)}`).toThrow(RangeError);
    }
  });
});

describe('FormIndicator — render', () => {
  it('liste + maç başına öğe: harf t(short), `title` t(long), `data-result`', () => {
    renderWithI18n(<FormIndicator results={['win', 'draw', 'loss']} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    for (const [index, result] of FORM_RESULTS.entries()) {
      const item = items[index];
      expect(item?.textContent).toBe(
        testText(FORM_INDICATOR_KEYS[FORM_RESULT_KEY_NAMES[result].short]),
      );
      expect(item?.getAttribute('title')).toBe(
        testText(FORM_INDICATOR_KEYS[FORM_RESULT_KEY_NAMES[result].long]),
      );
      expect(item?.getAttribute('data-result')).toBe(result);
    }
  });

  it('`aria-label` t(aria) ve `count` GÖSTERİLEN maç sayısı — `max` değil', () => {
    renderWithI18n(<FormIndicator results={['win', 'draw', 'loss']} />);
    // Üç sonuç, pencere beş → "Son 3 maç", "Son 5 maç" değil.
    expect(screen.getByRole('list').getAttribute('aria-label')).toBe(
      `${testText(FORM_INDICATOR_KEYS.aria)}3`,
    );
  });

  it('varsayılan pencere: yedi sonuçtan SON beşi, eski→yeni sırayla', () => {
    renderWithI18n(<FormIndicator results={SEVEN} />);
    expect(shownResults()).toEqual(['loss', 'win', 'win', 'draw', 'loss']);
    expect(screen.getByRole('list').getAttribute('aria-label')).toBe(
      `${testText(FORM_INDICATOR_KEYS.aria)}${String(FORM_INDICATOR_DEFAULT_MAX)}`,
    );
  });

  it('`max` prop pencereyi daraltıyor', () => {
    renderWithI18n(<FormIndicator results={SEVEN} max={3} />);
    expect(shownResults()).toEqual(['win', 'draw', 'loss']);
  });

  it('HER sonuç kendi renk sınıfını taşıyor', () => {
    renderWithI18n(<FormIndicator results={[...FORM_RESULTS]} />);
    for (const item of screen.getAllByRole('listitem')) {
      const result = item.getAttribute('data-result') as FormResult;
      const first = FORM_RESULT_CLASSES[result].split(' ')[0] ?? '';
      expect(first).not.toBe('');
      expect(item.className).toContain(first);
    }
  });

  it('boyut: varsayılan `md`, `sm` verilince `sm`', () => {
    const { unmount } = renderWithI18n(<FormIndicator results={['win']} />);
    const md = FORM_INDICATOR_SIZE_CLASSES.md.split(' ')[0] ?? '';
    expect(screen.getByRole('listitem').className).toContain(md);
    unmount();

    renderWithI18n(<FormIndicator results={['win']} size="sm" />);
    const sm = FORM_INDICATOR_SIZE_CLASSES.sm.split(' ')[0] ?? '';
    expect(screen.getByRole('listitem').className).toContain(sm);
    expect(screen.getByRole('listitem').className).not.toContain(md);
  });

  it('BOŞ dizi: liste yok, t(empty) `--text-muted` ile', () => {
    renderWithI18n(<FormIndicator results={[]} />);
    expect(screen.queryByRole('list')).toBeNull();
    const empty = screen.getByText(testText(FORM_INDICATOR_KEYS.empty));
    expect(empty.tagName).toBe('SPAN');
    expect(empty.className).toContain('--text-muted');
  });

  it('küme dışı sonuç render sırasında da RangeError — bileşen bir yedek uydurmuyor', () => {
    const bogus = ['win', 'victory'] as unknown as readonly FormResult[];
    expect(() => renderWithI18n(<FormIndicator results={bogus} />)).toThrow(RangeError);
  });

  it('çağıranın `className`i hem listeye hem boş hâle uygulanıyor', () => {
    const { unmount } = renderWithI18n(<FormIndicator results={['win']} className="mt-2" />);
    expect(screen.getByRole('list').className).toContain('mt-2');
    unmount();

    renderWithI18n(<FormIndicator results={[]} className="mt-2" />);
    expect(screen.getByText(testText(FORM_INDICATOR_KEYS.empty)).className).toContain('mt-2');
  });
});
