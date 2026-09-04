import { describe, expect, it } from 'vitest';

import {
  ALPHA_COLOR_TOKENS,
  type ColorTokenKey,
  DARK_COLOR_TOKENS,
  LIGHT_COLOR_OVERRIDES,
  LIGHT_UNDEFINED_IN_SPEC,
  resolveTheme,
} from './color.js';

/**
 * `docs/spec/05-design-system.md` §7.1'in KOYU tema bloğu, birebir.
 *
 * ⚠️ Bu liste spec'ten **elle** kopyalandı ve bu bir sınır: dosyayı ayrıştıran
 * bir test daha güçlü olurdu (5.7'nin `glossary-check`i gibi). Ayrıştırma
 * YAZILMADI çünkü §7.1 bir CSS **kod bloğu** ve iki tema aynı özellik adlarını
 * iki kez tanımlıyor — ayrıştırıcının hangi bloğun hangisi olduğunu bilmesi
 * için blok yorumlarına (`/* Koyu tema *\/`) güvenmesi gerekirdi ve bir yorum
 * biçimi sözleşme değildir.
 *
 * **Sınır sessiz bırakılmıyor:** bu kopya bayatlayabilir, ve bayatladığında
 * hiçbir şey ötmez. Karşı önlem, kopyanın **tek bir yerde** yaşaması —
 * üretim tarafı (`color.ts`) bu listeyi import etmiyor, yani iki kopya
 * birbirini doğruluyor, üçüncü bir kopya yok.
 */
const SPEC_DARK = {
  '--bg-base': '#0B0E14',
  '--bg-surface': '#12161F',
  '--bg-elevated': '#1A1F2B',
  '--bg-hover': '#222835',
  '--bg-active': '#2A3140',
  '--bg-input': '#0F131B',
  '--border-subtle': '#1E2430',
  '--border-default': '#2A3140',
  '--border-strong': '#3A4354',
  '--text-primary': '#E8ECF3',
  '--text-secondary': '#9BA6B8',
  '--text-muted': '#64707F',
  '--text-inverse': '#0B0E14',
  '--accent': '#00C46A',
  '--accent-hover': '#00D975',
  '--accent-muted': '#00C46A26',
  '--danger': '#E5484D',
  '--warning': '#F5A524',
  '--success': '#30A46C',
  '--info': '#4A9EFF',
};

/** §7.1'in AÇIK tema bloğu — spec'in **verdiği** sekiz satır. */
const SPEC_LIGHT = {
  '--bg-base': '#F5F7FA',
  '--bg-surface': '#FFFFFF',
  '--bg-elevated': '#FFFFFF',
  '--bg-hover': '#EDF0F5',
  '--border-default': '#D8DEE8',
  '--text-primary': '#151A22',
  '--text-secondary': '#5A6675',
  '--text-muted': '#8A94A3',
};

describe('§7.1 renk token envanteri', () => {
  it('KOYU tema spec ile BİREBİR — ad ve değer', () => {
    // Uzunluk değil içerik: `length === 20` yanlış yazılmış bir hex'i geçirir.
    expect(DARK_COLOR_TOKENS).toEqual(SPEC_DARK);
  });

  it('AÇIK tema spec ile BİREBİR — fazlası yok, azı yok', () => {
    expect(LIGHT_COLOR_OVERRIDES).toEqual(SPEC_LIGHT);
  });

  it('her değer #RRGGBB ya da #RRGGBBAA biçiminde', () => {
    for (const [name, value] of Object.entries(DARK_COLOR_TOKENS)) {
      expect(value, name).toMatch(/^#[0-9A-F]{6}([0-9A-F]{2})?$/);
    }
    for (const [name, value] of Object.entries(LIGHT_COLOR_OVERRIDES)) {
      expect(value, name).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('her anahtar CSS özel özellik adı (-- ile başlar)', () => {
    for (const name of Object.keys(DARK_COLOR_TOKENS)) {
      expect(name.startsWith('--'), name).toBe(true);
    }
  });
});

describe('§7.1 AÇIK TEMA EKSİKLİĞİ — boşluk yok, çakışma yok', () => {
  it('geçersiz kılınan + tanımsız = koyu temanın anahtar kümesi (KAPSAYICILIK)', () => {
    const overridden = Object.keys(LIGHT_COLOR_OVERRIDES) as ColorTokenKey[];
    const union = [...overridden, ...LIGHT_UNDEFINED_IN_SPEC].sort((a, b) => a.localeCompare(b));
    const all = (Object.keys(DARK_COLOR_TOKENS) as ColorTokenKey[]).sort((a, b) =>
      a.localeCompare(b),
    );

    // Boşluk yok: birleşim tam kümeyi veriyor.
    expect(union).toEqual(all);
    // Çakışma yok: hiçbir token iki listede birden değil.
    expect(new Set(union).size).toBe(union.length);
  });

  it('tanımsız liste ADIYLA sabit — bir değer eklenirse ya da bir ad düşerse kırılır', () => {
    expect([...LIGHT_UNDEFINED_IN_SPEC]).toEqual([
      '--bg-active',
      '--bg-input',
      '--border-subtle',
      '--border-strong',
      '--text-inverse',
      '--accent',
      '--accent-hover',
      '--accent-muted',
      '--danger',
      '--warning',
      '--success',
      '--info',
    ]);
  });

  it('tanımsızların HİÇBİRİ açık tema haritasında sessizce yer almıyor', () => {
    for (const name of LIGHT_UNDEFINED_IN_SPEC) {
      expect(Object.hasOwn(LIGHT_COLOR_OVERRIDES, name), name).toBe(false);
    }
  });
});

describe('§7.1 kenar durumlar — spec böyle yazıyor, düzeltilmiyor', () => {
  it('AÇIK temada --bg-surface ve --bg-elevated AYNI değer (#FFFFFF)', () => {
    // Bir yazım hatası gibi görünüyor ama otorite #1 spec. İddia ediliyor ki
    // bir gün "yanlışlıkla aynı olmuş" diye sessizce ayrılmasın.
    expect(LIGHT_COLOR_OVERRIDES['--bg-surface']).toBe(LIGHT_COLOR_OVERRIDES['--bg-elevated']);
  });

  it('KOYU temada --bg-active ve --border-default AYNI değer (#2A3140)', () => {
    expect(DARK_COLOR_TOKENS['--bg-active']).toBe(DARK_COLOR_TOKENS['--border-default']);
  });

  it('KOYU temada --text-inverse ve --bg-base AYNI değer (#0B0E14)', () => {
    expect(DARK_COLOR_TOKENS['--text-inverse']).toBe(DARK_COLOR_TOKENS['--bg-base']);
  });

  it('alfa taşıyan token listesi TAM — 8 haneli olan her token listede', () => {
    const eightDigit = Object.entries(DARK_COLOR_TOKENS)
      .filter(([, value]) => value.length === 9)
      .map(([name]) => name);
    expect(eightDigit).toEqual([...ALPHA_COLOR_TOKENS]);
  });

  it('--accent-muted, --accent ile aynı RGB üzerine alfa ekliyor', () => {
    expect(DARK_COLOR_TOKENS['--accent-muted'].slice(0, 7)).toBe(DARK_COLOR_TOKENS['--accent']);
  });
});

describe('resolveTheme', () => {
  it('koyu tema 20 token birden döndürüyor', () => {
    expect(resolveTheme('dark')).toEqual(DARK_COLOR_TOKENS);
  });

  it('açık tema YALNIZCA tanımlı sekizi döndürüyor — tanımsızlar devralınmıyor', () => {
    const light = resolveTheme('light');
    expect(light).toEqual(LIGHT_COLOR_OVERRIDES);
    // Sessiz devralma reddedildi: --bg-input açık temada YOK, koyu değerini
    // (#0F131B) taşımıyor.
    expect(Object.hasOwn(light, '--bg-input')).toBe(false);
  });

  it('döndürülen nesne kaynağın kopyası — çağıran onu değiştirirse token bozulmaz', () => {
    const first = resolveTheme('dark');
    (first as Record<string, string>)['--accent'] = '#FF0000';
    expect(resolveTheme('dark')['--accent']).toBe('#00C46A');
  });
});
