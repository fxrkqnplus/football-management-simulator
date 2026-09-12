/**
 * CurrencyValue testleri.
 *
 * ⚠️ **`formatMoneyCompact` BURADA YENİDEN SINANMIYOR.** ICU'nun parça yapısı,
 * kısaltma merdiveni, eksi işaretinin konumu — hepsi `@fms/shared`in
 * `format.test.ts`inde. Burada iki şey var: **geçiş** (çağrı oraya gidiyor mu,
 * `currency` oraya ulaşıyor mu — iddia `formatMoneyCompact`in kendi çıktısına
 * eşitlik) ve **biçim** (kriter dizesi `€1,2 mn` kod noktalarıyla geliyor mu).
 *
 * ⚠️ **`render` KULLANILIYOR, `renderWithI18n` DEĞİL — ve bu bir iddia.**
 * Bileşen anahtar taşımıyor; i18next sağlayıcısı OLMADAN çalışması, sözleşme
 * §1.9'un *"anahtar YOK"* cümlesinin çalışma zamanındaki karşılığı.
 *
 * **TAKLİT ETMEDİĞİ:** `--font-mono`/`tabular-nums`in ekranda uygulandığı —
 * jsdom `getComputedStyle` `var()` çözmüyor (6.0 ölçümü); sınıf adı iddia
 * ediliyor. Görsel doğrulama **Faz 17** (Playwright, G-02) ve **Faz 49** (G-05).
 */
import { formatMoneyCompact } from '@fms/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import * as CurrencyValueModule from './currency-value.js';
import { CurrencyValue, currencyValueText } from './currency-value.js';

/**
 * Bölünmez boşluk (U+00A0) — ADI VAR, gömülü karakter yok (`format.test.ts`
 * emsali: gerçek karakter normal boşluktan gözle ayırt edilemezdi).
 *
 * ⚠️ `format.test.ts` bunu bir kaçış dizisiyle yazıyor; burada kod noktası
 * **sayı olarak** veriliyor ve bu ölçülmüş bir F2 vakası: bu alt görevde
 * yazma katmanı kaçış dizisini iki kez gerçek U+00A0 karakterine çevirdi
 * (`od -c` ile görüldü: `302 240`). Salt ASCII bir yazım o katmandan
 * bağımsız — dosyada gömülü U+00A0 OLMADIĞI `grep -c` ile 0 ölçüldü.
 */
const NBSP = String.fromCodePoint(0x00a0);

/** Kriterin tam dizesi — küçük harf `mn` (Faz 5 kararı), ayırıcı U+00A0. */
const CRITERION_MONEY = `€1,2${NBSP}mn`;

describe('currencyValueText — saf', () => {
  it('BİÇİM: kriter dizesi `€1,2 mn` — kod noktalarıyla', () => {
    const text = currencyValueText(1_200_000);
    expect(text).toBe(CRITERION_MONEY);
    // `Array.from` — yayma operatörü DEĞİL (`no-misused-spread`); niyet kod
    // noktalarını tek tek görmek: U+00A0 normal boşluk değil.
    expect(Array.from(text, (ch) => ch.codePointAt(0))).toEqual([
      0x20ac, 0x31, 0x2c, 0x32, 0x00a0, 0x6d, 0x6e,
    ]);
    expect(text).not.toBe('€1,2 mn'); // normal boşluklu hâli
  });

  it('GEÇİŞ: çıktı `formatMoneyCompact`in kendisi — biçim yeniden yazılmıyor', () => {
    for (const amount of [0, 950, 12_500, 1_200_000, -1_200_000, 3_000_000_000]) {
      expect(currencyValueText(amount)).toBe(formatMoneyCompact(amount));
    }
  });

  it('GEÇİŞ: `currency` `formatMoneyCompact`e ULAŞIYOR', () => {
    // Değer ICU'nun; iddia edilen şey seçeneğin yutulmadığı: USD çıktısı
    // shared'ın USD çıktısına eşit ve EUR çıktısından farklı.
    expect(currencyValueText(1_200_000, 'USD')).toBe(
      formatMoneyCompact(1_200_000, { currency: 'USD' }),
    );
    expect(currencyValueText(1_200_000, 'USD')).not.toBe(currencyValueText(1_200_000));
  });

  it('`currency` verilmezse varsayılan (EUR) — `undefined` seçeneklere SIZMIYOR', () => {
    expect(currencyValueText(1_200_000, undefined)).toBe(formatMoneyCompact(1_200_000));
  });

  it('SONLU OLMAYAN tutar `RangeError` — sessizce `€NaN` basılmıyor', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() => currencyValueText(bad)).toThrow(RangeError);
      expect(() => currencyValueText(bad)).toThrow(/sonlu bir sayı olmalı/);
    }
  });

  it('hata mesajı GİRDİYİ taşıyor — hangi değerle kırıldığı görünür', () => {
    expect(() => currencyValueText(Number.POSITIVE_INFINITY)).toThrow(/Infinity/);
  });
});

describe('CurrencyValue — render', () => {
  it('metin `formatMoneyCompact`ten, i18next sağlayıcısı OLMADAN', () => {
    render(<CurrencyValue amount={1_200_000} data-testid="para" />);
    expect(screen.getByTestId('para').textContent).toBe(CRITERION_MONEY);
  });

  it('kök bir `<span>` ve mono + eş genişlikli rakam sınıflarını taşıyor', () => {
    render(<CurrencyValue amount={1_200_000} data-testid="para" />);
    const el = screen.getByTestId('para');
    expect(el.tagName).toBe('SPAN');
    // ⚠️ `family-name:` ETİKETİ İDDİA EDİLİYOR — ölçüldü: etiketsiz
    // `font-[var(--font-mono)]` Tailwind 4.3.3'te `font-weight` olarak
    // derleniyor ve tailwind-merge'de `font-medium` tarafından siliniyor.
    expect(el.className).toContain('font-[family-name:var(--font-mono)]');
    expect(el.className).toContain('tabular-nums');
    expect(el.className).not.toMatch(/font-\[var\(/);
  });

  it('`currency` bileşenden geçiyor', () => {
    render(<CurrencyValue amount={1_200_000} currency="USD" data-testid="para" />);
    expect(screen.getByTestId('para').textContent).toBe(
      formatMoneyCompact(1_200_000, { currency: 'USD' }),
    );
  });

  it('çağıranın `className`i uygulanıyor ve çağıranın AĞIRLIĞI mono yazı tipini SİLMİYOR', () => {
    // tailwind-merge ölçümü: etiketsiz biçimde `font-medium` mono sınıfını
    // ezerdi; etiketli biçimde ikisi ayrı grupta.
    render(<CurrencyValue amount={950} className="font-medium" data-testid="para" />);
    const el = screen.getByTestId('para');
    expect(el.className).toContain('font-medium');
    expect(el.className).toContain('font-[family-name:var(--font-mono)]');
  });

  it('renk sınıfı YOK — bağlamın rengini devralıyor', () => {
    render(<CurrencyValue amount={950} data-testid="para" />);
    expect(screen.getByTestId('para').className).not.toMatch(/text-\[/);
  });

  it('sabit hex yok', () => {
    render(<CurrencyValue amount={950} data-testid="para" />);
    expect(screen.getByTestId('para').className).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe('sözleşme §1.9 — anahtar YOK', () => {
  it('modül `_KEYS` ile biten HİÇBİR şey dışa aktarmıyor', () => {
    // Aktarsaydı `i18n-keys.test.ts` ② YÖN ① onu "kayıtsız" diye kırardı;
    // buradaki iddia sebebi adıyla söylüyor.
    const keysExports = Object.keys(CurrencyValueModule).filter((name) => name.endsWith('_KEYS'));
    expect(keysExports).toEqual([]);
  });
});
