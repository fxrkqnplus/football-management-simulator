/**
 * ANLAMSAL TON KARARININ TESTİ — 6.2'nin açık bıraktığı maddeyi kapatıyor.
 *
 * Karar iki yarıdan oluşuyor ve testler ikisini **ayrı ayrı** sınıyor:
 *   ① **Zemin dolgu** — bu bir GEREKÇE (depo içi emsal, `Button.destructive`).
 *      Test yalnızca sınıf tablosunun tutarlı ve kapsayıcı olduğunu iddia eder.
 *   ② **Ön plan hesaplanmış** — bu bir ÖLÇÜM. Test `pickAccessibleForeground`in
 *      seçtiği adayın gerçekten **daha yüksek kontrast** verdiğini ve sınıf
 *      tablosundaki token ile **örtüştüğünü** iddia eder.
 */
import { describe, expect, it } from 'vitest';

import { DARK_COLOR_TOKENS } from './color.js';
import { contrastRatio } from './contrast.js';
import {
  foregroundForTone,
  SEMANTIC_TONE_CLASSES,
  SEMANTIC_TONE_TOKENS,
  SEMANTIC_TONES,
} from './semantic-tone.js';

describe('① ton envanteri — sayı LİSTEDEN türetiliyor', () => {
  it('dört ton, hiçbiri tekrarlamıyor', () => {
    expect(SEMANTIC_TONES).toHaveLength(4);
    expect(new Set(SEMANTIC_TONES).size).toBe(SEMANTIC_TONES.length);
  });

  it('HER tonun bir token ve bir sınıf karşılığı var — kapsayıcılık', () => {
    expect(Object.keys(SEMANTIC_TONE_TOKENS).sort()).toEqual([...SEMANTIC_TONES].sort());
    expect(Object.keys(SEMANTIC_TONE_CLASSES).sort()).toEqual([...SEMANTIC_TONES].sort());
  });

  it('token adları `spec/05` §7.1 kümesinden — uydurulmuş renk yok', () => {
    for (const tone of SEMANTIC_TONES) {
      expect(DARK_COLOR_TOKENS[SEMANTIC_TONE_TOKENS[tone]]).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('sınıflarda SABİT HEX yok — açık temada sessizce yanlış renk olmasın', () => {
    for (const tone of SEMANTIC_TONES) {
      expect(SEMANTIC_TONE_CLASSES[tone]).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
});

describe('② ön plan HESAPLANIYOR — seçilmiyor', () => {
  it('HER ton için seçilen aday gerçekten daha yüksek kontrast veriyor', () => {
    for (const tone of SEMANTIC_TONES) {
      const background = DARK_COLOR_TOKENS[SEMANTIC_TONE_TOKENS[tone]];
      const chosen = foregroundForTone(tone);
      const other =
        chosen.color === DARK_COLOR_TOKENS['--text-inverse']
          ? DARK_COLOR_TOKENS['--text-primary']
          : DARK_COLOR_TOKENS['--text-inverse'];

      expect(chosen.ratio).toBeGreaterThanOrEqual(contrastRatio(other, background));
    }
  });

  it('HESAP ile SINIF TABLOSU örtüşüyor — yazılan token, hesaplananla aynı', () => {
    // ⚠️ Bu testin varlık sebebi: sınıf tablosu ELLE yazılıyor
    // (`text-[var(--text-inverse)]`), hesap ise koddan geliyor. İkisi bir gün
    // ayrışabilir — bu test o ayrışmayı kırmızıya çevirir.
    for (const tone of SEMANTIC_TONES) {
      const chosen = foregroundForTone(tone);
      const expectedToken =
        chosen.color === DARK_COLOR_TOKENS['--text-inverse'] ? '--text-inverse' : '--text-primary';
      expect(SEMANTIC_TONE_CLASSES[tone]).toContain(`text-[var(${expectedToken})]`);
    }
  });

  /**
   * ⚠️ **KAPSAM BASILMIYOR, İDDİA EDİLİYOR.** `process.stdout.write` bu pakette
   * **K8 tarafından yasak** (muafiyet yalnızca `scripts/` ve `tools/`) ve
   * `types: []` yüzünden `process` tipi de yok. Bir nöbetçinin rahatlığı için
   * ikisi de açılmaz — testteki karşılığı, ölçümün **her ton için gerçekten
   * koştuğunu** iddia etmek.
   */
  it('HESAP HER TON İÇİN KOŞUYOR — "0 bulundu" ile "bakılmadı" ayrılsın', () => {
    const measured = SEMANTIC_TONES.map((tone) => foregroundForTone(tone));
    expect(measured).toHaveLength(SEMANTIC_TONES.length);
    // Her ölçüm gerçek bir hesap üretmiş olmalı: sonlu, pozitif ve 1'den büyük
    // bir oran. Boş bir döngü ya da sessizce atlanan bir ton burada görünür.
    for (const { color, ratio } of measured) {
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      expect(Number.isFinite(ratio)).toBe(true);
      expect(ratio).toBeGreaterThan(1);
    }
  });
});
