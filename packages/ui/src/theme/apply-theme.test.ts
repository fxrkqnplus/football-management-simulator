import { beforeEach, describe, expect, it } from 'vitest';

import { CONTRAST_TARGET_AA, contrastRatio, DARK_COLOR_TOKENS } from '../tokens/index.js';
import {
  applyTheme,
  CLUB_ACCENT_TOKEN,
  FONT_SCALE_ATTRIBUTE,
  MOTION_ATTRIBUTE,
  THEME_ATTRIBUTE,
} from './apply-theme.js';

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
});

describe('applyTheme — DOM işaretleme', () => {
  it('üç niteliği de yazıyor', () => {
    applyTheme(root, { mode: 'dark', reducedMotion: false, fontScale: 100 });
    expect(root.getAttribute(THEME_ATTRIBUTE)).toBe('dark');
    expect(root.getAttribute(MOTION_ATTRIBUTE)).toBe('no-preference');
    expect(root.getAttribute(FONT_SCALE_ATTRIBUTE)).toBe('100');
  });

  it('açık temayı işaretliyor', () => {
    applyTheme(root, { mode: 'light', reducedMotion: false, fontScale: 100 });
    expect(root.getAttribute(THEME_ATTRIBUTE)).toBe('light');
  });

  it('hareket azaltma AÇIK — CSS seçicisinin beklediği değer', () => {
    applyTheme(root, { mode: 'dark', reducedMotion: true, fontScale: 100 });
    expect(root.getAttribute(MOTION_ATTRIBUTE)).toBe('reduce');
  });

  it('dört font ölçeğinin dördü de yazılıyor', () => {
    for (const scale of [90, 100, 115, 130] as const) {
      applyTheme(root, { mode: 'dark', reducedMotion: false, fontScale: scale });
      expect(root.getAttribute(FONT_SCALE_ATTRIBUTE), String(scale)).toBe(String(scale));
    }
  });

  it('yeniden uygulamak önceki değeri EZİYOR, biriktirmiyor', () => {
    applyTheme(root, { mode: 'light', reducedMotion: true, fontScale: 130 });
    applyTheme(root, { mode: 'dark', reducedMotion: false, fontScale: 90 });
    expect(root.getAttribute(THEME_ATTRIBUTE)).toBe('dark');
    expect(root.getAttribute(MOTION_ATTRIBUTE)).toBe('no-preference');
    expect(root.getAttribute(FONT_SCALE_ATTRIBUTE)).toBe('90');
  });
});

describe('applyTheme — kulüp vurgusu §7.1', () => {
  it('kulüp rengi YOKSA --accent hiç yazılmıyor', () => {
    const result = applyTheme(root, { mode: 'dark', reducedMotion: false, fontScale: 100 });
    expect(result.accent).toBeUndefined();
    expect(root.style.getPropertyValue(CLUB_ACCENT_TOKEN)).toBe('');
  });

  it('kontrastı yeterli bir kulüp rengi DEĞİŞTİRİLMEDEN yazılıyor', () => {
    const result = applyTheme(root, {
      mode: 'dark',
      reducedMotion: false,
      fontScale: 100,
      clubColor: '#FFD200',
    });
    expect(result.accent?.adjusted).toBe(false);
    expect(result.accent?.reachedTarget).toBe(true);
    expect(root.style.getPropertyValue(CLUB_ACCENT_TOKEN)).toBe('#FFD200');
  });

  it('koyu bir kulüp rengi KOYU temada açıklaştırılıyor ve AA’ya çıkıyor', () => {
    const result = applyTheme(root, {
      mode: 'dark',
      reducedMotion: false,
      fontScale: 100,
      clubColor: '#1B2A4A',
    });
    expect(result.accent?.adjusted).toBe(true);
    expect(result.accent?.reachedTarget).toBe(true);
    expect(result.accent?.ratio).toBeGreaterThanOrEqual(CONTRAST_TARGET_AA);
    // Yazılan değer HESAPLANMIŞ olan, girdi değil.
    expect(root.style.getPropertyValue(CLUB_ACCENT_TOKEN)).toBe(result.accent?.color);
    expect(root.style.getPropertyValue(CLUB_ACCENT_TOKEN)).not.toBe('#1B2A4A');
  });

  it('AÇIK temada hedefe ulaşılamıyor — sınır SESSİZ DEĞİL, sonuçta duruyor', () => {
    // 6.2'nin beyan ettiği sınır: spec'in fiili "açıklaştırmak" ve açık zeminde
    // beyaza yaklaşmak oranı DÜŞÜRÜR. Burada düzeltilmiyor — sahibi 6.8.
    const result = applyTheme(root, {
      mode: 'light',
      reducedMotion: false,
      fontScale: 100,
      clubColor: '#00C46A',
    });
    expect(result.accent?.reachedTarget).toBe(false);
    expect(result.accent?.ratio).toBeLessThan(CONTRAST_TARGET_AA);
    // Yine de bir renk yazılıyor: `undefined` ya da boş değil.
    expect(root.style.getPropertyValue(CLUB_ACCENT_TOKEN)).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('kulüp rengi kaldırılınca özellik SİLİNİYOR, eski değer kalmıyor', () => {
    applyTheme(root, {
      mode: 'dark',
      reducedMotion: false,
      fontScale: 100,
      clubColor: '#1B2A4A',
    });
    expect(root.style.getPropertyValue(CLUB_ACCENT_TOKEN)).not.toBe('');

    applyTheme(root, { mode: 'dark', reducedMotion: false, fontScale: 100 });
    expect(root.style.getPropertyValue(CLUB_ACCENT_TOKEN)).toBe('');
  });

  it('kontrast DOĞRU YÜZEYE karşı ölçülüyor — koyu ve açık farklı sonuç veriyor', () => {
    // Karşı kontrol: tek bir sabit yüzeye karşı ölçen bir uygulama bu vakayı
    // geçemez.
    const onDark = applyTheme(root, {
      mode: 'dark',
      reducedMotion: false,
      fontScale: 100,
      clubColor: '#00C46A',
    });
    const onLight = applyTheme(root, {
      mode: 'light',
      reducedMotion: false,
      fontScale: 100,
      clubColor: '#00C46A',
    });
    expect(onDark.accent?.ratio).not.toBeCloseTo(onLight.accent?.ratio ?? 0, 3);
    expect(onDark.accent?.ratio).toBeCloseTo(
      contrastRatio('#00C46A', DARK_COLOR_TOKENS['--bg-surface']),
      10,
    );
  });
});
