/**
 * Dinamik anahtar beyanının NÖBETÇİSİ — beyan, ait olduğu yerde korunuyor.
 *
 * ⚠️ **BEYAN ETMEK, GÖRMEZDEN GELMEKTİR.** `DYNAMIC_KEY_PREFIXES`e eklenen her
 * ön ek, o ön ekle başlayan **bütün** anahtarları `i18n:check`in
 * *"kullanılmayan anahtar"* denetiminden çıkarır. `common:diagnostics.`
 * eklenseydi on bir anahtar birden sessizleşir ve kapı orada körelirdi.
 * Bu yüzden liste **bir sayı değil bir LİSTE** olarak sabitleniyor
 * (`NAMESPACES` ve `VISIBLE_ATTRIBUTES` emsali): bir satır eklemek bu testi
 * kırar ve ekleyeni gerekçe yazmaya zorlar.
 *
 * ⚠️ **İKİNCİ İDDİA AYRI BİR ŞEY SÖYLÜYOR:** liste doğru uzunlukta olabilir ve
 * yine de **ölü** olabilir — bir yazım hatası (`common:contry.`) hiçbir
 * anahtarla eşleşmez, hiçbir şeyi susturmaz ve hiçbir şey de söylemez. Sessizce
 * yanlış bir beyan, beyan olmamasından daha kötüdür: okuyana o ailenin
 * korunduğunu düşündürür. Bu yüzden her ön ekin **en az bir gerçek anahtarla**
 * eşleştiği ayrıca ölçülüyor.
 */
import { describe, expect, it } from 'vitest';

import common from '../locales/tr/common.json';
import errors from '../locales/tr/errors.json';
import { DYNAMIC_KEY_PREFIXES } from './i18n-dynamic-keys.js';

/** Çeviri ağacını `ns:a.b.c` biçimine düzleştirir. */
function flatten(tree: Record<string, unknown>, namespace: string): string[] {
  const keys: string[] = [];
  const walk = (node: Record<string, unknown>, prefix: string): void => {
    for (const [key, value] of Object.entries(node)) {
      const path = prefix === '' ? key : `${prefix}.${key}`;
      if (typeof value === 'object' && value !== null) {
        walk(value as Record<string, unknown>, path);
        continue;
      }
      keys.push(`${namespace}:${path}`);
    }
  };
  walk(tree, '');
  return keys;
}

const ALL_KEYS = [...flatten(common, 'common'), ...flatten(errors, 'errors')];

describe('DYNAMIC_KEY_PREFIXES', () => {
  it('liste TEK TEK sabit — bir satır eklemek bu testi kırar', () => {
    expect(DYNAMIC_KEY_PREFIXES).toEqual([
      'common:country.',
      'common:competition.',
      'errors:status.',
    ]);
  });

  it('her ön ek EN AZ BİR gerçek anahtarla eşleşiyor — ölü beyan yok', () => {
    for (const prefix of DYNAMIC_KEY_PREFIXES) {
      const matched = ALL_KEYS.filter((key) => key.startsWith(prefix));
      expect(matched.length, `'${prefix}' hiçbir anahtarla eşleşmiyor`).toBeGreaterThan(0);
    }
  });

  it('kapsanan anahtar sayıları — beyanın MALİYETİ görünür', () => {
    // Bir ön ekin kaç anahtarı sustuğunu bilmeden "dar tutuldu" denemez.
    // 5.0'ın dinamik aile tablosu: ülke+yarışma 17, errors:status 4.
    const counted = Object.fromEntries(
      DYNAMIC_KEY_PREFIXES.map((prefix) => [
        prefix,
        ALL_KEYS.filter((key) => key.startsWith(prefix)).length,
      ]),
    );
    expect(counted).toEqual({
      'common:country.': 6,
      'common:competition.': 11,
      'errors:status.': 4,
    });
  });

  it('ön ekler NOKTA ile bitiyor — komşu anahtarı yanlışlıkla yutmasın', () => {
    // `common:country` (noktasız) bir gün `countryside` diye bir anahtar
    // eklenirse onu da susturur. Nokta o sınırı kapatıyor.
    for (const prefix of DYNAMIC_KEY_PREFIXES) {
      expect(prefix.endsWith('.'), prefix).toBe(true);
      expect(prefix).toContain(':');
    }
  });
});
