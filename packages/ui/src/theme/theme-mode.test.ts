import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_THEME_PREFERENCE,
  isThemePreference,
  readSystemPrefersDark,
  readSystemPrefersReducedMotion,
  resolveThemeMode,
  THEME_MODES,
  THEME_PREFERENCES,
} from './theme-mode.js';

describe('tercih ve mod envanteri', () => {
  it('üç tercih spec ile BİREBİR', () => {
    expect([...THEME_PREFERENCES]).toEqual(['dark', 'light', 'system']);
  });

  it('iki mod — `system` bir MOD DEĞİL', () => {
    expect([...THEME_MODES]).toEqual(['dark', 'light']);
    expect((THEME_MODES as readonly string[]).includes('system')).toBe(false);
  });

  it('varsayılan KOYU — §7.1 "Koyu tema (varsayılan)"', () => {
    expect(DEFAULT_THEME_PREFERENCE).toBe('dark');
  });

  it('varsayılan `system` DEĞİL — açık tema §7.1’de eksik tanımlı', () => {
    expect(DEFAULT_THEME_PREFERENCE).not.toBe('system');
  });
});

describe('resolveThemeMode — saf, ve KAPSAYICI', () => {
  it('açık tercihler ortam sinyalini YOK SAYIYOR', () => {
    expect(resolveThemeMode('dark', false)).toBe('dark');
    expect(resolveThemeMode('dark', true)).toBe('dark');
    expect(resolveThemeMode('light', false)).toBe('light');
    expect(resolveThemeMode('light', true)).toBe('light');
  });

  it('`system` sinyali İZLİYOR', () => {
    expect(resolveThemeMode('system', true)).toBe('dark');
    expect(resolveThemeMode('system', false)).toBe('light');
  });

  it('ALTI kombinasyonun ALTISI da çözülmüş bir mod veriyor (kapsayıcılık)', () => {
    // Üç tercih x iki sinyal = altı. Bir tercih eklenirse bu test onu da
    // gezer ve `system` gibi çözülmemiş bir değer dönerse kırılır.
    let checked = 0;
    for (const preference of THEME_PREFERENCES) {
      for (const signal of [true, false]) {
        const mode = resolveThemeMode(preference, signal);
        expect(THEME_MODES, `${preference}/${String(signal)}`).toContain(mode);
        checked += 1;
      }
    }
    expect(checked).toBe(6);
  });

  it('saf — aynı girdi her zaman aynı çıktı', () => {
    expect(resolveThemeMode('system', true)).toBe(resolveThemeMode('system', true));
  });
});

describe('isThemePreference — SESSİZ VARSAYILAN YOK', () => {
  it('üç geçerli değeri tanıyor', () => {
    for (const preference of THEME_PREFERENCES) {
      expect(isThemePreference(preference), preference).toBe(true);
    }
  });

  it('bozuk değer `dark`a DÜŞMÜYOR, false dönüyor', () => {
    for (const bad of ['DARK', 'auto', '', null, undefined, 0, {}, ['dark']]) {
      expect(isThemePreference(bad), JSON.stringify(bad)).toBe(false);
    }
  });
});

describe('ORTAMI OKUYAN YARI — jsdom’da `matchMedia` YOK, ölçülen tek şey bu', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('KONTROL: bu ortamda `matchMedia` gerçekten tanımsız', () => {
    // 6.0'ın ölçümünün bu dosyada da geçerli olduğunu iddia ediyor. Bir gün
    // jsdom onu eklerse bu test kırılır ve aşağıdaki iki yedek davranışın
    // gerekçesi yeniden değerlendirilir.
    expect(typeof globalThis.matchMedia).toBe('undefined');
  });

  it('`matchMedia` yokken KOYU tema seçiliyor — SEÇİM, sessiz değil', () => {
    expect(readSystemPrefersDark()).toBe(true);
  });

  it('`matchMedia` yokken hareket AZALTILMIYOR — ters yön, ve bilinçli', () => {
    expect(readSystemPrefersReducedMotion()).toBe(false);
  });

  it('`matchMedia` VARSA sorgusu okunuyor — sahte bir uygulamayla iki yönlü', () => {
    // Yedek davranışın "her zaman true dönüyor" olmadığını ayıran vaka.
    const fake = vi.fn((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? false : true,
    }));
    vi.stubGlobal('matchMedia', fake);

    expect(readSystemPrefersDark()).toBe(false);
    expect(readSystemPrefersReducedMotion()).toBe(true);
    expect(fake).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    expect(fake).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('sorgu dizeleri SABİT — yanlış yazılmış bir medya sorgusu sessizce false döner', () => {
    const seen: string[] = [];
    vi.stubGlobal('matchMedia', (query: string) => {
      seen.push(query);
      return { matches: false };
    });
    readSystemPrefersDark();
    readSystemPrefersReducedMotion();
    expect(seen).toEqual(['(prefers-color-scheme: dark)', '(prefers-reduced-motion: reduce)']);
  });
});
