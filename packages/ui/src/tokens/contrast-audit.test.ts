/**
 * KONTRAST DENETİMİ — hangi çiftler denetleniyor, ve hangisi geçiyor.
 *
 * ⚠️ **DENETLENEN ÇİFTLERİN LİSTESİ BURADA YAZILI.** *"Kontrast tamam"* diyen
 * ama neye baktığını söylemeyen bir kapı, bakacak bir şey bulamamış olabilir
 * (SAPMA-024). Aşağıdaki her `describe` bloğu **hangi çiftlere baktığını**
 * adıyla söylüyor ve sayısını iddia ediyor.
 *
 * ⚠️ **BU BİR EKRAN ÖLÇÜMÜ DEĞİL.** 6.0 ölçtü: jsdom `getComputedStyle()` bir
 * `var(--x)` değerini **çözmüyor** ve `getBoundingClientRect()` **0×0**
 * döndürüyor. Yani *"ekranda şu renk çıkıyor"* bugün iddia edilemez. Buradaki
 * iddialar **token değerleri** üzerine kurulu saf aritmetik.
 */
import { describe, expect, it } from 'vitest';

import { ATTRIBUTE_BANDS } from './attribute-scale.js';
import { DARK_COLOR_TOKENS, LIGHT_COLOR_OVERRIDES } from './color.js';
import { CONTRAST_TARGET_AA, contrastRatio, pickAccessibleForeground } from './contrast.js';

/** Rozetin sayısı için iki aday: koyu temanın ana metni ve ters metni. */
const BADGE_FOREGROUNDS = [
  DARK_COLOR_TOKENS['--text-primary'],
  DARK_COLOR_TOKENS['--text-inverse'],
] as const;

describe('DENETİM ① — sekiz bandın üzerindeki SAYI okunabilir mi', () => {
  it('sekiz bandın HEPSİ, iki adaydan en iyisiyle AA (4.5:1) sağlıyor', () => {
    // Ölçüldü: TEK BİR metin rengi sekiz bandın hepsinde yetmiyor — koyu
    // bantlar açık metin, açık bantlar koyu metin istiyor. Seçim bir tercih
    // değil bir HESAP (`pickAccessibleForeground`).
    expect(ATTRIBUTE_BANDS).toHaveLength(8);
    for (const band of ATTRIBUTE_BANDS) {
      const picked = pickAccessibleForeground(band.color, BADGE_FOREGROUNDS);
      expect(picked.ratio, `${band.label} (${band.color})`).toBeGreaterThanOrEqual(
        CONTRAST_TARGET_AA,
      );
    }
  });

  it('KARŞI KONTROL: tek bir metin rengi YETMİYOR — iki aday gerçekten gerekli', () => {
    // Bu vaka olmadan yukarıdaki test "iki aday gereksiz" ihtimalini
    // ayıramazdı (bir mutasyonun hiçbir şeyi kırmaması KODUN GEREKSİZ olduğu
    // anlamına da gelebilir).
    const withPrimaryOnly = ATTRIBUTE_BANDS.filter(
      (b) => contrastRatio(b.color, DARK_COLOR_TOKENS['--text-primary']) >= CONTRAST_TARGET_AA,
    );
    const withInverseOnly = ATTRIBUTE_BANDS.filter(
      (b) => contrastRatio(b.color, DARK_COLOR_TOKENS['--text-inverse']) >= CONTRAST_TARGET_AA,
    );
    expect(withPrimaryOnly.length).toBeLessThan(ATTRIBUTE_BANDS.length);
    expect(withInverseOnly.length).toBeLessThan(ATTRIBUTE_BANDS.length);
    // Ve ikisi birlikte tamamı ediyor: kümeler ayrık değil ama birleşimleri tam.
    const covered = new Set([...withPrimaryOnly, ...withInverseOnly]);
    expect(covered.size).toBe(ATTRIBUTE_BANDS.length);
  });
});

describe('DENETİM ② — komşu bantlar RENKLE ayrılıyor mu (spec sorusu)', () => {
  it('komşu bant kontrastlarının HİÇBİRİ 2:1 bile değil — ölçüm spec’i doğruluyor', () => {
    // §7.2 renk körlüğü modunda "sayı kalınlaşır ve arka plan deseni eklenir"
    // diyor. Bu ölçüm o kararın GEREKÇESİ: parlaklık tek başına komşu bantları
    // ayırmıyor — tam renkli görüşte bile.
    const ratios = ATTRIBUTE_BANDS.slice(0, -1).map((band, index) =>
      contrastRatio(band.color, ATTRIBUTE_BANDS[index + 1]?.color ?? band.color),
    );
    expect(ratios).toHaveLength(7);
    for (const ratio of ratios) {
      expect(ratio).toBeLessThan(2);
    }
    // En yüksek komşu farkı da 2'nin altında; en düşüğü 1'e çok yakın.
    expect(Math.max(...ratios)).toBeLessThan(2);
    expect(Math.min(...ratios)).toBeLessThan(1.1);
  });
});

describe('DENETİM ③ — tema içi metin/zemin çiftleri', () => {
  /** Koyu tema: üç metin × üç zemin = dokuz çift. */
  const DARK_PAIRS = [
    ['--text-primary', '--bg-base'],
    ['--text-primary', '--bg-surface'],
    ['--text-primary', '--bg-elevated'],
    ['--text-secondary', '--bg-base'],
    ['--text-secondary', '--bg-surface'],
    ['--text-secondary', '--bg-elevated'],
    ['--text-muted', '--bg-base'],
    ['--text-muted', '--bg-surface'],
    ['--text-muted', '--bg-elevated'],
  ] as const;

  it('koyu temada DOKUZ çift denetleniyor — liste burada', () => {
    expect(DARK_PAIRS).toHaveLength(9);
  });

  it('--text-primary ve --text-secondary üç zeminde de AA sağlıyor', () => {
    for (const [text, surface] of DARK_PAIRS) {
      if (text === '--text-muted') continue;
      const ratio = contrastRatio(DARK_COLOR_TOKENS[text], DARK_COLOR_TOKENS[surface]);
      expect(ratio, `${text} / ${surface}`).toBeGreaterThanOrEqual(CONTRAST_TARGET_AA);
    }
  });

  it('⚠️ --text-muted ÜÇ ZEMİNDE DE AA SAĞLAMIYOR — ölçüm, gevşetme değil', () => {
    // Bir beklenen kırılma GEVŞETİLMEZ, İDDİA GÜNCELLENİR. Bu bir kusur
    // raporu: "muted" bilinçli olarak düşük kontrastlı bir token, ama AA'nın
    // altında kaldığı YAZILI olmalı ki 6.8 ve Faz 49 onu bir bulgu olarak
    // devralsın, keşfetmesin.
    for (const surface of ['--bg-base', '--bg-surface', '--bg-elevated'] as const) {
      const ratio = contrastRatio(DARK_COLOR_TOKENS['--text-muted'], DARK_COLOR_TOKENS[surface]);
      expect(ratio, `--text-muted / ${surface}`).toBeLessThan(CONTRAST_TARGET_AA);
      // Yine de 3:1'in üstünde: büyük metin ve arayüz bileşeni sınırını geçiyor.
      expect(ratio, `--text-muted / ${surface}`).toBeGreaterThan(3);
    }
  });

  it('açık temada ÜÇ metin × İKİ zemin = altı çift; --text-muted burada da AA ALTINDA', () => {
    const surfaces = ['--bg-base', '--bg-surface'] as const;
    const texts = ['--text-primary', '--text-secondary', '--text-muted'] as const;
    let audited = 0;
    for (const text of texts) {
      for (const surface of surfaces) {
        const ratio = contrastRatio(LIGHT_COLOR_OVERRIDES[text], LIGHT_COLOR_OVERRIDES[surface]);
        audited += 1;
        if (text === '--text-muted') {
          expect(ratio, `${text} / ${surface}`).toBeLessThan(CONTRAST_TARGET_AA);
        } else {
          expect(ratio, `${text} / ${surface}`).toBeGreaterThanOrEqual(CONTRAST_TARGET_AA);
        }
      }
    }
    expect(audited).toBe(6);
  });
});

describe('DENETİM ④ — varsayılan vurgu rengi', () => {
  it('--accent koyu zeminde AA sağlıyor', () => {
    expect(
      contrastRatio(DARK_COLOR_TOKENS['--accent'], DARK_COLOR_TOKENS['--bg-surface']),
    ).toBeGreaterThanOrEqual(CONTRAST_TARGET_AA);
  });

  it('--text-inverse, --accent üzerinde AA sağlıyor (vurgulu buton metni)', () => {
    expect(
      contrastRatio(DARK_COLOR_TOKENS['--text-inverse'], DARK_COLOR_TOKENS['--accent']),
    ).toBeGreaterThanOrEqual(CONTRAST_TARGET_AA);
  });

  it('⚠️ --accent AÇIK temada TANIMSIZ — koyu değeri beyaz zeminde AA ALTINDA', () => {
    // Bu, LIGHT_UNDEFINED_IN_SPEC'in neden bir eksiklik olduğunun ölçümü:
    // koyu temanın accent'i açık temaya devralınsaydı okunmazdı.
    expect(
      contrastRatio(DARK_COLOR_TOKENS['--accent'], LIGHT_COLOR_OVERRIDES['--bg-surface']),
    ).toBeLessThan(CONTRAST_TARGET_AA);
  });
});

describe('DENETİM ⑤ — BU DENETİMİN GÖRMEDİKLERİ', () => {
  it('alfa taşıyan token denetlenmiyor ve bu ADIYLA yazılı', () => {
    // #00C46A26 yarı saydam; gerçek oranı altındaki yüzeye bağlı ve §7.1 o
    // yüzeyi söylemiyor. Denetim onu ATLIYOR — "0 ihlal" ile "hiçbir şeye
    // bakmadı" ayırt edilebilir olsun diye burada iddia ediliyor.
    expect(() => contrastRatio(DARK_COLOR_TOKENS['--accent-muted'], '#000000')).toThrow(TypeError);
  });

  it('anlamsal renkler (danger/warning/success/info) HENÜZ denetlenmiyor', () => {
    // Gerekçe: §7.1 bunların hangi zemin üzerinde, metin mi dolgu mu olarak
    // kullanılacağını SÖYLEMİYOR. Denetlenecek çifti spec vermeden seçmek,
    // kimsenin belirlemediği alana değer uydurmak olurdu (SAPMA-026).
    // Sahibi: 6.4 (Badge, Toast) — o gün kullanım yeri belli olacak.
    for (const name of ['--danger', '--warning', '--success', '--info'] as const) {
      expect(DARK_COLOR_TOKENS[name]).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});
