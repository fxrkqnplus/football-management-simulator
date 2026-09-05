import { describe, expect, it } from 'vitest';

import {
  ACCENT_HOVER_MIN_LIGHTNESS_DELTA,
  ALPHA_COLOR_TOKENS,
  type ColorTokenKey,
  DARK_COLOR_TOKENS,
  deriveLightChromatic,
  LIGHT_COLOR_OVERRIDES,
  LIGHT_SPEC_OVERRIDES,
  LIGHT_UNDEFINED_IN_SPEC,
  LIGHT_WRITTEN_TOKENS,
  resolveTheme,
} from './color.js';
import { perceptualLightness } from './contrast.js';

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

  it('AÇIK temanın SPEC’TEN gelen sekizi BİREBİR — fazlası yok, azı yok', () => {
    // ⚠️ `LIGHT_SPEC_OVERRIDES`, `LIGHT_COLOR_OVERRIDES` DEĞİL: ikincisi
    // 6.3b'de yazılan on ikiyi de içeriyor. Otoriteden geleni ölçen iddia
    // yalnızca birincisine bakmalı — yoksa yazdığımız değerleri spec'e ait
    // sanan bir test doğardı.
    expect(LIGHT_SPEC_OVERRIDES).toEqual(SPEC_LIGHT);
  });

  it('her değer #RRGGBB ya da #RRGGBBAA biçiminde', () => {
    for (const [name, value] of Object.entries(DARK_COLOR_TOKENS)) {
      expect(value, name).toMatch(/^#[0-9A-F]{6}([0-9A-F]{2})?$/);
    }
    for (const [name, value] of Object.entries(LIGHT_COLOR_OVERRIDES)) {
      expect(value, name).toMatch(/^#[0-9A-F]{6}([0-9A-F]{2})?$/);
    }
  });

  it('her anahtar CSS özel özellik adı (-- ile başlar)', () => {
    for (const name of Object.keys(DARK_COLOR_TOKENS)) {
      expect(name.startsWith('--'), name).toBe(true);
    }
  });
});

describe('§7.1 AÇIK TEMA — TOPLANAN / YAZILAN ayrımı, boşluk yok, çakışma yok', () => {
  it('spec’ten gelen SEKİZ + yazılan ON İKİ = koyu temanın YİRMİSİ (KAPSAYICILIK)', () => {
    const fromSpec = Object.keys(LIGHT_SPEC_OVERRIDES) as ColorTokenKey[];
    const written = Object.keys(LIGHT_WRITTEN_TOKENS) as ColorTokenKey[];
    const union = [...fromSpec, ...written].sort((a, b) => a.localeCompare(b));
    const all = (Object.keys(DARK_COLOR_TOKENS) as ColorTokenKey[]).sort((a, b) =>
      a.localeCompare(b),
    );

    // İki yarım ayrı ayrı sayılıyor — "kaç token spec'ten, kaç token yazıldı"
    // sorusu bir cümlede değil bir TESTTE yaşıyor.
    expect(fromSpec).toHaveLength(8);
    expect(written).toHaveLength(12);
    // Boşluk yok: birleşim tam kümeyi veriyor.
    expect(union).toEqual(all);
    // Çakışma yok: hiçbir token iki listede birden değil.
    expect(new Set(union).size).toBe(union.length);
  });

  it('YAZILAN on iki, spec’in TANIMSIZ bıraktığı on ikiyle BİREBİR aynı küme', () => {
    // Yazdığımız bir token, spec'in zaten verdiği bir token olamaz.
    expect(
      (Object.keys(LIGHT_WRITTEN_TOKENS) as ColorTokenKey[]).sort((a, b) => a.localeCompare(b)),
    ).toEqual([...LIGHT_UNDEFINED_IN_SPEC].sort((a, b) => a.localeCompare(b)));
  });

  it('birleşik harita YİRMİ token taşıyor ve iki kaynağın üstünü örtmüyor', () => {
    expect(Object.keys(LIGHT_COLOR_OVERRIDES)).toHaveLength(20);
    for (const [name, value] of Object.entries(LIGHT_SPEC_OVERRIDES)) {
      expect(LIGHT_COLOR_OVERRIDES[name as ColorTokenKey], name).toBe(value);
    }
    for (const [name, value] of Object.entries(LIGHT_WRITTEN_TOKENS)) {
      expect(LIGHT_COLOR_OVERRIDES[name as ColorTokenKey], name).toBe(value);
    }
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

  it('spec’in tanımsız bıraktıklarının HİÇBİRİ SPEC listesinde değil', () => {
    // Kayıt silinmiyor: bir gün "bu değerler spec'ten mi?" diye sorulduğunda
    // cevap bu iddiada.
    for (const name of LIGHT_UNDEFINED_IN_SPEC) {
      expect(Object.hasOwn(LIGHT_SPEC_OVERRIDES, name), name).toBe(false);
    }
  });
});

describe('§7.1 AÇIK TEMA — yazılan değerlerin DAYANAKLARI', () => {
  it('koyu temanın İKİ EŞİTLİĞİ açık temada da korunuyor', () => {
    // koyu: --bg-active == --border-default (#2A3140)
    expect(DARK_COLOR_TOKENS['--bg-active']).toBe(DARK_COLOR_TOKENS['--border-default']);
    expect(LIGHT_COLOR_OVERRIDES['--bg-active']).toBe(LIGHT_COLOR_OVERRIDES['--border-default']);

    // koyu: --text-inverse == --bg-base (#0B0E14)
    expect(DARK_COLOR_TOKENS['--text-inverse']).toBe(DARK_COLOR_TOKENS['--bg-base']);
    expect(LIGHT_COLOR_OVERRIDES['--text-inverse']).toBe(LIGHT_COLOR_OVERRIDES['--bg-base']);
  });

  it('KROMATİK YEDİ, kuralın çıktısıyla BİREBİR — ikinci bir temsil değil', () => {
    // `deriveLightChromatic()` kuralı taşıyor; `LIGHT_WRITTEN_TOKENS`taki
    // hexler onun ARTEFAKTI. Kural değişirse ya da hexler elle düzenlenirse
    // bu iddia kırılır (CSS tazelik nöbetçisiyle aynı yapı).
    const derived = deriveLightChromatic();
    expect(Object.keys(derived).sort((a, b) => a.localeCompare(b))).toEqual(
      [
        '--accent',
        '--accent-hover',
        '--accent-muted',
        '--danger',
        '--info',
        '--success',
        '--warning',
      ].sort((a, b) => a.localeCompare(b)),
    );
    for (const [name, value] of Object.entries(derived)) {
      expect(LIGHT_WRITTEN_TOKENS[name as keyof typeof LIGHT_WRITTEN_TOKENS], name).toBe(value);
    }
  });

  it('--accent-muted alfası koyu temadakiyle AYNI, RGB’si yeni vurgudan', () => {
    const light = LIGHT_COLOR_OVERRIDES['--accent-muted'];
    expect(light.slice(7)).toBe(DARK_COLOR_TOKENS['--accent-muted'].slice(7));
    expect(light.slice(0, 7)).toBe(LIGHT_COLOR_OVERRIDES['--accent']);
  });

  it('--bg-input, --bg-base ile --bg-surface ARASINDA (koyu temanın konumu)', () => {
    const l = (hex: string): number => perceptualLightness(hex);
    // koyuda: bg-base < bg-input < bg-surface
    expect(l(DARK_COLOR_TOKENS['--bg-base'])).toBeLessThan(l(DARK_COLOR_TOKENS['--bg-input']));
    expect(l(DARK_COLOR_TOKENS['--bg-input'])).toBeLessThan(l(DARK_COLOR_TOKENS['--bg-surface']));
    // açıkta da aynı sıra
    expect(l(LIGHT_COLOR_OVERRIDES['--bg-base'])).toBeLessThan(
      l(LIGHT_COLOR_OVERRIDES['--bg-input']),
    );
    expect(l(LIGHT_COLOR_OVERRIDES['--bg-input'])).toBeLessThan(
      l(LIGHT_COLOR_OVERRIDES['--bg-surface']),
    );
  });

  it('kenarlık rampası SIRALI: subtle daha soluk, strong daha güçlü', () => {
    const l = (hex: string): number => perceptualLightness(hex);
    // Açık temada "güçlü" = daha koyu.
    expect(l(LIGHT_COLOR_OVERRIDES['--border-subtle'])).toBeGreaterThan(
      l(LIGHT_COLOR_OVERRIDES['--border-default']),
    );
    expect(l(LIGHT_COLOR_OVERRIDES['--border-default'])).toBeGreaterThan(
      l(LIGHT_COLOR_OVERRIDES['--border-strong']),
    );
  });

  it('--accent ve --accent-hover ALGISAL olarak ayırt edilebilir', () => {
    const delta =
      perceptualLightness(LIGHT_COLOR_OVERRIDES['--accent']) -
      perceptualLightness(LIGHT_COLOR_OVERRIDES['--accent-hover']);
    expect(delta).toBeGreaterThanOrEqual(ACCENT_HOVER_MIN_LIGHTNESS_DELTA);
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

  it('açık tema YİRMİ token döndürüyor — 6.3b’de tamamlandı', () => {
    const light = resolveTheme('light');
    expect(Object.keys(light)).toHaveLength(20);
    expect(light).toEqual(LIGHT_COLOR_OVERRIDES);
  });

  it('açık temada HİÇBİR token koyu değerini DEVRALMIYOR', () => {
    // 6.3'te bu iddia "tanımsızlar haritada yok" biçimindeydi; artık hepsi var
    // ve kontrol tersine döndü: hiçbiri koyu temanın değerini taşımamalı.
    // ⚠️ Bir istisna ölçüldü ve adıyla yazılıyor — aşağıya bak.
    const light = resolveTheme('light');
    const inherited = (Object.keys(DARK_COLOR_TOKENS) as ColorTokenKey[]).filter(
      (name) => light[name] === DARK_COLOR_TOKENS[name],
    );
    expect(inherited).toEqual([]);
  });

  it('döndürülen nesne kaynağın kopyası — çağıran onu değiştirirse token bozulmaz', () => {
    const first = resolveTheme('dark');
    (first as Record<string, string>)['--accent'] = '#FF0000';
    expect(resolveTheme('dark')['--accent']).toBe('#00C46A');
  });
});
