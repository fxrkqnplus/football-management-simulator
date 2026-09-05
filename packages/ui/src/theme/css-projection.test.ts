import { describe, expect, it } from 'vitest';

import {
  DARK_COLOR_TOKENS,
  DURATIONS_MS,
  LIGHT_COLOR_OVERRIDES,
  LIGHT_UNDEFINED_IN_SPEC,
} from '../tokens/index.js';
import { GENERATED_CSS_PATH, renderTokenCss } from './css-projection.js';
import generatedOnDisk from './tokens.generated.css?raw';

describe('TAZELİK NÖBETÇİSİ — üretilmiş CSS kaynağıyla aynı mı', () => {
  it('üretilmiş dosya boş değil', () => {
    // `?raw` içe aktarımı dosya yoksa DERLEME anında kırılır, yani "var mı"
    // sorusu bu testten önce cevaplanıyor. Kalan risk boş bir dosya.
    expect(generatedOnDisk.length, GENERATED_CSS_PATH).toBeGreaterThan(0);
  });

  it('diskteki dosya, TS kaynağından yeniden üretilenle BİREBİR aynı', () => {
    // Bu, iki temsil arasındaki çift yönlü eşleşmeden DAHA GÜÇLÜ: eksik de
    // fazlalık da aynı karşılaştırmada ötüyor. Emsal: docs/schema/world.md'nin
    // ER bloğu ve er-diagram.itest.ts.
    expect(generatedOnDisk).toBe(renderTokenCss());
  });
});

describe('üretilmiş CSS içeriği', () => {
  const css = renderTokenCss();

  it('ELLE DÜZENLEME uyarısı taşıyor', () => {
    expect(css).toContain('ÜRETİLMİŞ DOSYA — ELLE DÜZENLEME.');
    expect(css).toContain('scripts/generate-theme-css.mjs');
  });

  it(':root KOYU temanın YİRMİ token’ının hepsini taşıyor', () => {
    for (const [name, value] of Object.entries(DARK_COLOR_TOKENS)) {
      expect(css, name).toContain(`${name}: ${value};`);
    }
  });

  it('açık tema bloğu SEKİZ geçersiz kılmanın hepsini taşıyor', () => {
    const lightBlock = css.slice(css.indexOf("[data-theme='light']"));
    for (const [name, value] of Object.entries(LIGHT_COLOR_OVERRIDES)) {
      expect(lightBlock, name).toContain(`${name}: ${value};`);
    }
  });

  it('açık tema bloğu tanımsız ON İKİ token’ın HİÇBİRİNİ tanımlamıyor', () => {
    const lightBlockStart = css.indexOf("[data-theme='light'] {");
    const lightBlock = css.slice(lightBlockStart, css.indexOf('}', lightBlockStart));
    for (const name of LIGHT_UNDEFINED_IN_SPEC) {
      expect(lightBlock.includes(`${name}:`), name).toBe(false);
    }
  });

  it('⚠️ EKSİKLİK ÇIKTIDA GÖRÜNÜR — on iki token yorumda ADIYLA listeleniyor', () => {
    // CSS'te "tanımsız" diye bir değer yok: geçersiz kılınmayan token :root'tan
    // DEVRALINIR. 6.2 o davranışı reddetmişti; burada saklanmıyor, YAZILIYOR.
    // "0 bulundu" ile "hiçbir şeye bakmadı" ayırt edilebilir olmalı.
    expect(css).toContain('AÇIK TEMA TAMAMLANMAMIŞ');
    for (const name of LIGHT_UNDEFINED_IN_SPEC) {
      expect(css, name).toContain(`   *   ${name}`);
    }
  });

  it('hareket azaltma bloğu ÜÇ sürenin ÜÇÜNÜ de sıfırlıyor', () => {
    const block = css.slice(css.indexOf("[data-reduced-motion='reduce']"));
    for (const name of Object.keys(DURATIONS_MS)) {
      expect(block, name).toContain(`${name}: 0ms;`);
    }
  });

  it('tema-bağımsız token’lar :root’ta, açık tema bloğunda TEKRARLANMIYOR', () => {
    const lightStart = css.indexOf("[data-theme='light'] {");
    const lightBlock = css.slice(lightStart, css.indexOf('}', lightStart));
    expect(lightBlock).not.toContain('--space-');
    expect(lightBlock).not.toContain('--radius-');
    expect(lightBlock).not.toContain('--z-');
    expect(lightBlock).not.toContain('--font-');
  });

  it('satır yüksekliği AYRI bir token olarak yansıtılıyor', () => {
    // §7.3 `10px/14px` diye yazıyor; CSS'te tek bir özellik iki değer taşıyamaz.
    expect(css).toContain('--text-base: 14px;');
    expect(css).toContain('--text-base-line: 20px;');
  });

  it('deterministik — iki çağrı aynı metni veriyor', () => {
    expect(renderTokenCss()).toBe(css);
  });
});
