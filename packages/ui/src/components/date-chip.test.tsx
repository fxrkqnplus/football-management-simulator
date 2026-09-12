/**
 * DateChip testleri.
 *
 * ⚠️ **`formatDate` BURADA YENİDEN SINANMIYOR.** Ay adları, CLDR verisi,
 * `DEFAULT_TIME_ZONE`nin makineden okunmadığı — hepsi `@fms/shared`in
 * `format.test.ts`inde. Burada üç şey var: **geçiş** (çağrı oraya gidiyor mu,
 * `timeZone` oraya ulaşıyor mu — iddia `formatDate`in kendi çıktısına
 * eşitlik), **biçim** (kriter dizesi `23 Ağustos 2026` geliyor mu) ve
 * **ikili gösterim** (`dateTime` UTC ISO, metin zaman dilimine göre; aynı an
 * tek gerçek).
 *
 * ⚠️ **`render` KULLANILIYOR, `renderWithI18n` DEĞİL — ve bu bir iddia.**
 * Bileşen anahtar taşımıyor; i18next sağlayıcısı OLMADAN çalışması, sözleşme
 * §1.10'un *"anahtar YOK"* cümlesinin çalışma zamanındaki karşılığı.
 *
 * ⚠️ **tailwind-merge İDDİALARI ÖLÇÜLDÜ (3.6.0), TAHMİN DEĞİL:**
 *   · `text-[var(--text-2xs)] text-[var(--text-secondary)]` → yalnızca
 *     ikincisi (etiketsiz boyut, renk tarafından siliniyor);
 *   · `text-[length:var(--text-2xs)] text-[var(--text-secondary)]` → ikisi de
 *     kalıyor;
 *   · çağıranın `text-[var(--danger)]`i nötr rengi eziyor, etiketli boyuta
 *     dokunmuyor.
 * Aşağıdaki sınıf iddiaları **birleşik `className`** üzerinde — `cn()`den
 * çıkan dize, bileşenin sabiti değil — çünkü silinme oradan sonra görünür.
 *
 * **TAKLİT ETMEDİĞİ:** göreli zaman · zaman dilimi tespiti (varsayılan UTC,
 * `@fms/shared` kararı) · saat gösterimi · çipin ekrandaki görünümü — jsdom
 * `getComputedStyle` `var()` çözmüyor (6.0 ölçümü), sınıf adları iddia
 * ediliyor. Görsel doğrulama **Faz 17** (Playwright, G-02) ve **Faz 49** (G-05).
 */
import { DEFAULT_TIME_ZONE, formatDate } from '@fms/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BADGE_VARIANT_CLASSES } from './badge.js';
import * as DateChipModule from './date-chip.js';
import { DateChip, dateChipContent } from './date-chip.js';

/** Kriterin tam dizesi — `format.test.ts` ile aynı an: 23 Ağustos 2026, öğle UTC. */
const CRITERION_DATE = '23 Ağustos 2026';
const AUG_23 = new Date(Date.UTC(2026, 7, 23, 12, 0, 0));

/**
 * Zaman dilimi SINIR vakası — `format.ts` ③'te ölçüldü:
 * 23 Ağustos 22:30 UTC = 24 Ağustos 01:30 İstanbul.
 */
const EDGE = new Date(Date.UTC(2026, 7, 23, 22, 30, 0));
const ISTANBUL = 'Europe/Istanbul';

/** `new Date('x')` fırlatmaz; `getTime()` NaN döner. Kapı bizim. */
const INVALID = new Date('geçersiz');

describe('dateChipContent — saf', () => {
  it('BİÇİM: kriter dizesi `23 Ağustos 2026`', () => {
    expect(dateChipContent(AUG_23).text).toBe(CRITERION_DATE);
  });

  it('GEÇİŞ: metin `formatDate`in kendisi — biçim yeniden yazılmıyor', () => {
    for (const date of [
      AUG_23,
      new Date(Date.UTC(2026, 0, 1)),
      new Date(Date.UTC(2026, 4, 19)),
      new Date(Date.UTC(2026, 11, 31, 23, 59, 59)),
    ]) {
      expect(dateChipContent(date).text).toBe(formatDate(date));
    }
  });

  it('`dateTime` UTC ISO 8601 — `toISOString()` ile birebir, `Z` sonekli', () => {
    const { dateTime } = dateChipContent(AUG_23);
    expect(dateTime).toBe(AUG_23.toISOString());
    expect(dateTime).toBe('2026-08-23T12:00:00.000Z');
  });

  it('GEÇİŞ: `timeZone` `formatDate`e ULAŞIYOR — sınır vakasında gün DEĞİŞİYOR', () => {
    // Değer ICU'nun; iddia edilen şey seçeneğin yutulmadığı: İstanbul çıktısı
    // shared'ın İstanbul çıktısına eşit ve UTC çıktısından farklı.
    expect(dateChipContent(EDGE).text).toBe(CRITERION_DATE);
    expect(dateChipContent(EDGE, ISTANBUL).text).toBe(formatDate(EDGE, { timeZone: ISTANBUL }));
    expect(dateChipContent(EDGE, ISTANBUL).text).toBe('24 Ağustos 2026');
    expect(dateChipContent(EDGE, ISTANBUL).text).not.toBe(dateChipContent(EDGE).text);
  });

  it('`dateTime` zaman diliminden BAĞIMSIZ — aynı an, iki metin, TEK ISO', () => {
    // Makine için gösterim UTC'de sabit kalır; insan için gösterim dilime göre.
    expect(dateChipContent(EDGE, ISTANBUL).dateTime).toBe(dateChipContent(EDGE).dateTime);
    expect(dateChipContent(EDGE, ISTANBUL).dateTime).toBe(EDGE.toISOString());
  });

  it('`timeZone` verilmezse varsayılan `DEFAULT_TIME_ZONE` — `undefined` seçeneklere SIZMIYOR', () => {
    expect(DEFAULT_TIME_ZONE).toBe('UTC');
    expect(dateChipContent(EDGE, undefined).text).toBe(formatDate(EDGE));
    expect(dateChipContent(EDGE, undefined).text).toBe(
      formatDate(EDGE, { timeZone: DEFAULT_TIME_ZONE }),
    );
  });

  it('GEÇERSİZ tarih `RangeError`, Türkçe mesaj, girdi mesajda', () => {
    expect(Number.isNaN(INVALID.getTime())).toBe(true);
    expect(() => dateChipContent(INVALID)).toThrow(RangeError);
    expect(() => dateChipContent(INVALID)).toThrow(/geçerli bir tarih bekliyor/);
    expect(() => dateChipContent(INVALID)).toThrow(/Invalid Date/);
  });

  it('ret BİZİM kapıdan — `toISOString()`in İngilizce `RangeError`u değil', () => {
    // DZ-05: hangi kısıt reddetti, adıyla. `toISOString()` da RangeError
    // fırlatır ("Invalid time value"); oraya ulaşılmadığı mesajdan belli.
    expect(() => INVALID.toISOString()).toThrow(/Invalid time value/);
    expect(() => dateChipContent(INVALID)).not.toThrow(/Invalid time value/);
  });

  it('GEÇERSİZ zaman dilimi `Intl`in kendi `RangeError`uyla düşüyor — yutulmuyor', () => {
    // İkinci bir IANA doğrulaması YAZILMADI (dosya başı); sessiz kalmadığı
    // burada ölçülüyor ki "yazılmadı" bir eksik değil, ölçülmüş bir karar olsun.
    expect(() => dateChipContent(AUG_23, 'Mars/Olympus_Mons')).toThrow(RangeError);
  });
});

describe('DateChip — render', () => {
  it('kök `<time dateTime>`: makine için ISO, insan için Türkçe — i18next sağlayıcısı OLMADAN', () => {
    render(<DateChip date={AUG_23} data-testid="tarih" />);
    const el = screen.getByTestId('tarih');
    expect(el.tagName).toBe('TIME');
    expect(el.getAttribute('datetime')).toBe(AUG_23.toISOString());
    expect(el.textContent).toBe(CRITERION_DATE);
  });

  it('`timeZone` bileşenden geçiyor; `dateTime` yine UTC ISO', () => {
    render(<DateChip date={EDGE} timeZone={ISTANBUL} data-testid="tarih" />);
    const el = screen.getByTestId('tarih');
    expect(el.textContent).toBe('24 Ağustos 2026');
    expect(el.getAttribute('datetime')).toBe(EDGE.toISOString());
  });

  it('nötr yüzey `BADGE_VARIANT_CLASSES.neutral`den — sınıf sınıf, kopya değil referans', () => {
    render(<DateChip date={AUG_23} data-testid="tarih" />);
    const classes = screen.getByTestId('tarih').className.split(' ');
    const neutral = BADGE_VARIANT_CLASSES.neutral.split(' ');
    expect(neutral.length).toBeGreaterThan(0);
    for (const cls of neutral) {
      expect(classes).toContain(cls);
    }
  });

  it('boyut ve aile sınıfları ETİKETLİ ve nötr rengin YANINDA duruyor — birleşik `className`de', () => {
    // Ölçüldü (dosya başı): etiketsiz `text-[var(--text-2xs)]` nötr yüzeyin
    // `text-[var(--text-secondary)]`i tarafından silinirdi.
    render(<DateChip date={AUG_23} data-testid="tarih" />);
    const className = screen.getByTestId('tarih').className;
    expect(className).toContain('text-[length:var(--text-2xs)]');
    expect(className).toContain('font-[family-name:var(--font-ui)]');
    expect(className).toContain('text-[var(--text-secondary)]');
    expect(className).toContain('tabular-nums');
    expect(className).not.toMatch(/text-\[var\(--text-2xs\)\]/);
    expect(className).not.toMatch(/font-\[var\(/);
  });

  it('çağıranın `className`i uygulanıyor; çağıranın RENGİ nötr rengi eziyor, BOYUTU silmiyor', () => {
    // tailwind-merge ölçümü (dosya başı): renk ile etiketli boyut ayrı grupta.
    render(<DateChip date={AUG_23} className="text-[var(--danger)]" data-testid="tarih" />);
    const className = screen.getByTestId('tarih').className;
    expect(className).toContain('text-[var(--danger)]');
    expect(className).not.toContain('text-[var(--text-secondary)]');
    expect(className).toContain('text-[length:var(--text-2xs)]');
  });

  it('GEÇERSİZ tarih render sırasında `RangeError` — sessizce boş çip yok', () => {
    expect(() => render(<DateChip date={INVALID} />)).toThrow(RangeError);
  });

  it('sabit hex yok', () => {
    render(<DateChip date={AUG_23} data-testid="tarih" />);
    expect(screen.getByTestId('tarih').className).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe('sözleşme §1.10 — anahtar YOK', () => {
  it('modül `_KEYS` ile biten HİÇBİR şey dışa aktarmıyor', () => {
    // Aktarsaydı `i18n-keys.test.ts` ② YÖN ① onu "kayıtsız" diye kırardı;
    // buradaki iddia sebebi adıyla söylüyor.
    const keysExports = Object.keys(DateChipModule).filter((name) => name.endsWith('_KEYS'));
    expect(keysExports).toEqual([]);
  });
});
