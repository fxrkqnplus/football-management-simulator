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

import {
  ATTRIBUTE_BADGE_FOREGROUNDS,
  ATTRIBUTE_PATTERN_ALPHA,
  attributeBadgeForeground,
  attributePatternComposite,
} from '../components/attribute-badge.js';
import { ATTRIBUTE_BANDS } from './attribute-scale.js';
import { DARK_COLOR_TOKENS, LIGHT_COLOR_OVERRIDES } from './color.js';
import { CONTRAST_TARGET_AA, contrastRatio, pickAccessibleForeground } from './contrast.js';
import { foregroundForTone, SEMANTIC_TONE_TOKENS, SEMANTIC_TONES } from './semantic-tone.js';

/**
 * Rozetin sayısı için iki aday: koyu temanın ana metni ve ters metni.
 *
 * ⚠️ 6.6'ya kadar bu liste BURADA elle yazılıydı (`BADGE_FOREGROUNDS`) ve
 * bileşen yoktu. Bileşen doğduğunda (`attribute-badge.tsx`) aynı listeyi
 * dışa aktardı; iki liste bir gün ayrışmasın diye denetim artık bileşenin
 * listesini **import ediyor** (sözleşme 6.6 §1.1: *"iki liste → bir"*).
 */
const BADGE_FOREGROUNDS = ATTRIBUTE_BADGE_FOREGROUNDS;

describe('DENETİM ① — sekiz bandın üzerindeki SAYI okunabilir mi', () => {
  it('aday listesi bileşenden geliyor ve koyu temanın iki metin token DEĞERİ', () => {
    expect(BADGE_FOREGROUNDS).toEqual([
      DARK_COLOR_TOKENS['--text-primary'],
      DARK_COLOR_TOKENS['--text-inverse'],
    ]);
  });

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

describe('DENETİM ⑦ — AttributeBadge: sekiz bant × (DÜZ + DESEN BİLEŞKESİ) ≥ AA (6.6)', () => {
  /**
   * ① yalnızca düz bandı denetliyordu. 6.6'nın yedekli kodlaması bandın
   * üstüne `ATTRIBUTE_PATTERN_ALPHA` oranında siyah çizgi bindiriyor; sayı
   * çizginin ÜSTÜNE de düşüyor. Bu blok, bileşenin seçtiği ön planın iki
   * zeminde de (düz · bileşke) AA'yı geçtiğini iddia ediyor. Kapsam
   * `ATTRIBUTE_BANDS.length`ten — 16 çift, sayı listeden.
   */
  it('bileşenin seçtiği ön plan, her bantta hem düz hem bileşke üzerinde AA', () => {
    let audited = 0;
    for (const band of ATTRIBUTE_BANDS) {
      const picked = attributeBadgeForeground(band);
      expect(BADGE_FOREGROUNDS).toContain(picked);
      const composite = attributePatternComposite(band.color);
      expect(composite).toMatch(/^#[0-9A-F]{6}$/);
      expect(contrastRatio(picked, band.color), `${band.label} düz`).toBeGreaterThanOrEqual(
        CONTRAST_TARGET_AA,
      );
      expect(contrastRatio(picked, composite), `${band.label} bileşke`).toBeGreaterThanOrEqual(
        CONTRAST_TARGET_AA,
      );
      audited += 2;
    }
    expect(audited).toBe(ATTRIBUTE_BANDS.length * 2);
  });

  it('bileşke düz banttan FARKLI — desen kanalı ölü değil (alfa > 0)', () => {
    // Alfa 0 olsaydı bileşke = düz ve yukarıdaki test ①'in kopyası olurdu.
    // Alfanın ölçümü `attribute-badge.test.tsx`te; burada yalnızca kanalın
    // canlı olduğu iddia ediliyor.
    expect(ATTRIBUTE_PATTERN_ALPHA).toBeGreaterThan(0);
    for (const band of ATTRIBUTE_BANDS) {
      expect(attributePatternComposite(band.color), band.label).not.toBe(band.color);
    }
  });

  it('KARŞI KONTROL: bileşke, açık metinli bantlarda kontrastı YÜKSELTİYOR, koyu metinlilerde DÜŞÜRÜYOR', () => {
    // Siyah mürekkebin gerekçesi (bileşen başlığı): koyu çizgi açık metnin
    // payını büyütür, koyu metninkini küçültür — sınır koyu metinli bantta.
    // İki yön de gerçekten oluşuyor; biri boş kalsaydı liste gereksizdi.
    let raised = 0;
    let lowered = 0;
    for (const band of ATTRIBUTE_BANDS) {
      const picked = attributeBadgeForeground(band);
      const plain = contrastRatio(picked, band.color);
      const composite = contrastRatio(picked, attributePatternComposite(band.color));
      if (composite > plain) raised += 1;
      if (composite < plain) lowered += 1;
    }
    expect(raised).toBeGreaterThan(0);
    expect(lowered).toBeGreaterThan(0);
    expect(raised + lowered).toBe(ATTRIBUTE_BANDS.length);
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

describe('DENETİM ⑥ — 6.3b’DE YAZILAN ON İKİ AÇIK TEMA TOKEN’I', () => {
  /** En katı yüzey: `--bg-base`. `--bg-surface` (#FFFFFF) daha açık. */
  const STRICT = LIGHT_COLOR_OVERRIDES['--bg-base'];
  const SURFACE = LIGHT_COLOR_OVERRIDES['--bg-surface'];

  const CHROMATIC = [
    '--accent',
    '--accent-hover',
    '--danger',
    '--warning',
    '--success',
    '--info',
  ] as const;

  it('ALTI kromatik token, EN KATI yüzeyde (--bg-base) AA sağlıyor', () => {
    for (const name of CHROMATIC) {
      const ratio = contrastRatio(LIGHT_COLOR_OVERRIDES[name], STRICT);
      expect(ratio, `${name} / --bg-base`).toBeGreaterThanOrEqual(CONTRAST_TARGET_AA);
    }
  });

  it('aynı altısı --bg-surface’te de sağlıyor — katı yüzey seçimi DOĞRULANIYOR', () => {
    // Karşı kontrol: en katı yüzeyi geçen bir renk daha açık olanı da geçmeli.
    // Bu vaka olmasa "yanlış yüzeye göre ölçtük" ihtimali ayrılamazdı.
    for (const name of CHROMATIC) {
      const strict = contrastRatio(LIGHT_COLOR_OVERRIDES[name], STRICT);
      const surface = contrastRatio(LIGHT_COLOR_OVERRIDES[name], SURFACE);
      expect(surface, name).toBeGreaterThanOrEqual(strict);
      expect(surface, `${name} / --bg-surface`).toBeGreaterThanOrEqual(CONTRAST_TARGET_AA);
    }
  });

  it('⚠️ KOYU temanın kromatikleri açık zeminde GEÇMİYORDU — yazılmalarının sebebi', () => {
    // Ölçüm 6.3'te yapıldı ve karar buradan çıktı: "tema-bağımsız" okuması
    // çöktü. Beşinin BEŞİ de AA'nın altında.
    for (const name of ['--accent', '--danger', '--warning', '--success', '--info'] as const) {
      expect(contrastRatio(DARK_COLOR_TOKENS[name], STRICT), name).toBeLessThan(CONTRAST_TARGET_AA);
    }
  });

  it('--text-inverse, açık temanın vurgusu ÜZERİNDE okunur', () => {
    for (const name of ['--accent', '--accent-hover'] as const) {
      const ratio = contrastRatio(
        LIGHT_COLOR_OVERRIDES['--text-inverse'],
        LIGHT_COLOR_OVERRIDES[name],
      );
      expect(ratio, `--text-inverse / ${name}`).toBeGreaterThanOrEqual(CONTRAST_TARGET_AA);
    }
  });

  it('--text-primary, BEŞ yapısal nötrün hepsinde AA sağlıyor', () => {
    for (const name of [
      '--bg-active',
      '--bg-input',
      '--border-subtle',
      '--border-strong',
      '--text-inverse',
    ] as const) {
      const ratio = contrastRatio(
        LIGHT_COLOR_OVERRIDES['--text-primary'],
        LIGHT_COLOR_OVERRIDES[name],
      );
      expect(ratio, `--text-primary / ${name}`).toBeGreaterThanOrEqual(CONTRAST_TARGET_AA);
    }
  });

  it('⚠️ KENARLIKLAR 3:1’İN ALTINDA — spec’in kendi seçimi, gevşetilmedi', () => {
    // `--border-default` SPEC'TEN geliyor ve zemine karşı 1,26. Yazdığımız
    // subtle/strong da aynı ailede. Bu bir kusur raporu: WCAG'ın arayüz
    // bileşeni sınırı 3:1 ve bu palet onu kenarlıklarda karşılamıyor.
    // Sahibi 6.8 — orada `--text-muted` kararıyla birlikte ele alınacak.
    for (const name of ['--border-subtle', '--border-default', '--border-strong'] as const) {
      expect(contrastRatio(LIGHT_COLOR_OVERRIDES[name], STRICT), name).toBeLessThan(3);
    }
  });
});

describe('DENETİM ⑤ — BU DENETİMİN GÖRMEDİKLERİ', () => {
  it('alfa taşıyan token denetlenmiyor ve bu ADIYLA yazılı', () => {
    // #00C46A26 yarı saydam; gerçek oranı altındaki yüzeye bağlı ve §7.1 o
    // yüzeyi söylemiyor. Denetim onu ATLIYOR — "0 ihlal" ile "hiçbir şeye
    // bakmadı" ayırt edilebilir olsun diye burada iddia ediliyor.
    expect(() => contrastRatio(DARK_COLOR_TOKENS['--accent-muted'], '#000000')).toThrow(TypeError);
  });

  /**
   * ⚠️ **BU VAKA 6.5'TE GERÇEK BİR DENETİME ÇEVRİLDİ.**
   *
   * 6.2'nin metni şuydu: *"anlamsal renkler HENÜZ denetlenmiyor … §7.1
   * bunların hangi zemin üzerinde, metin mi dolgu mu olarak kullanılacağını
   * SÖYLEMİYOR … **Sahibi: 6.4 (Badge, Toast)** — o gün kullanım yeri belli
   * olacak."*
   *
   * ⚠️ **Sahip doğruydu, NUMARA BAYATTI:** Badge ve Toast ROADMAP'te **6.5**'te
   * (6.4'ün listesi Button · Input · Select · Combobox · Checkbox · RadioGroup ·
   * Slider · Switch · Tabs). Gerçek sahip bir **numara** değil bir **bileşen**;
   * kullanım yeri 6.5'te doğdu ve karar `tokens/semantic-tone.ts`te yazıldı:
   * zemin **dolgu** (gerekçe, depo içi emsal), ön plan **hesaplanmış** (ölçüm).
   *
   * Artık denetlenecek bir çift **var**, yani bu test bir yer tutucu olmaktan
   * çıkıp gerçek bir kapı oldu: her anlamsal ton, üzerine yazılan metinle
   * **WCAG AA (4,5:1)** eşiğini geçiyor mu?
   */
  it('anlamsal renkler DOLGU olarak AA geçiyor — çift 6.5’te karara bağlandı', () => {
    // ⚠️ Kapsam BASILMIYOR, İDDİA EDİLİYOR: `process.stdout.write` bu pakette
    // K8 tarafından yasak ve `types: []` yüzünden tipi de yok. "0 ihlal" ile
    // "hiçbir şeye bakmadı" ayrımı, denetlenen çift SAYISININ iddia edilmesiyle
    // sağlanıyor — bu dosyanın kendi başlığındaki kuralın aynısı.
    let audited = 0;
    for (const tone of SEMANTIC_TONES) {
      const background = DARK_COLOR_TOKENS[SEMANTIC_TONE_TOKENS[tone]];
      const { color, ratio } = foregroundForTone(tone);
      expect(background).toMatch(/^#[0-9A-F]{6}$/);
      expect(ratio, `${tone} (${color} / ${background})`).toBeGreaterThanOrEqual(
        CONTRAST_TARGET_AA,
      );
      expect(contrastRatio(color, background)).toBeCloseTo(ratio, 10);
      audited += 1;
    }
    expect(audited).toBe(SEMANTIC_TONES.length);
    expect(audited).toBe(4);
  });
});
