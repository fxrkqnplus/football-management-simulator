/**
 * İki okumanın AYRIŞTIĞI vakayı sabitleyen test.
 *
 * Bugün şemada çok sütunlu FK **yok** (12/12 tek sütunlu, ölçüldü), yani ayrım
 * hiçbir fark üretmiyor. Tam da bu yüzden yazılıyor: fark üretmediği gün
 * sabitlenmezse, ilk çok sütunlu FK geldiğinde iki tüketici sessizce farklı
 * cevap alır ve hiçbir kapı ötmez.
 */
import { describe, expect, it } from 'vitest';

import { foreignKeyNullability } from './foreign-key-nullability.js';

describe('foreignKeyNullability — tek sütunlu FK (bugünkü şemanın tamamı)', () => {
  it('NOT NULL sütun: ne opsiyonel ne SET NULL`a uygun', () => {
    expect(foreignKeyNullability([false])).toEqual({ anyNullable: false, allNullable: false });
  });

  it('nullable sütun: hem opsiyonel hem SET NULL`a uygun', () => {
    expect(foreignKeyNullability([true])).toEqual({ anyNullable: true, allNullable: true });
  });

  it('tek sütunda iki okuma HER ZAMAN aynı cevabı verir', () => {
    for (const nullable of [true, false]) {
      const facts = foreignKeyNullability([nullable]);
      expect(facts.anyNullable).toBe(facts.allNullable);
    }
  });
});

describe('foreignKeyNullability — çok sütunlu FK, iki okuma AYRIŞIYOR', () => {
  it('hepsi nullable: ikisi de true', () => {
    expect(foreignKeyNullability([true, true])).toEqual({ anyNullable: true, allNullable: true });
  });

  it('hiçbiri nullable değil: ikisi de false', () => {
    expect(foreignKeyNullability([false, false])).toEqual({
      anyNullable: false,
      allNullable: false,
    });
  });

  /**
   * ⚠️ BU TESTİN TAMAMI BU VAKA İÇİN VAR.
   *
   * Karışık bir FK'da ilişki **opsiyoneldir** (bir sütun boş olabildiği için
   * bağ kurulmayabilir) ama `ON DELETE SET NULL` **uygulanamaz**: PostgreSQL
   * bütün sütunları `NULL` yapmak zorunda ve `NOT NULL` olan biri silmeyi
   * çalışma zamanında reddeder.
   *
   * Tek bir paylaşılan yüklem yazılsaydı, hangisi seçilirse seçilsin
   * tüketicilerden biri **yanlış** cevap alırdı.
   */
  it('KARIŞIK: ilişki opsiyonel AMA SET NULL uygulanamaz', () => {
    expect(foreignKeyNullability([true, false])).toEqual({
      anyNullable: true,
      allNullable: false,
    });
  });

  it('KARIŞIK — sıra fark etmiyor', () => {
    expect(foreignKeyNullability([false, true])).toEqual(foreignKeyNullability([true, false]));
  });
});

describe('foreignKeyNullability — boş liste sessiz bir varsayılana düşmüyor', () => {
  /**
   * `[].every()` **true**, `[].some()` **false** döner — yani korumasız bir
   * uygulama *"hepsi nullable ama hiçbiri nullable değil"* diyen tutarsız bir
   * cevap üretirdi ve `SET NULL` bir hayalet FK'ya uygulanabilir görünürdü.
   */
  it('ikisi de false — SET NULL güvenli tarafta reddediliyor', () => {
    expect(foreignKeyNullability([])).toEqual({ anyNullable: false, allNullable: false });
  });

  it('KONTROL DENEYİ: korumasız `every` burada true dönerdi', () => {
    // Koruma kaldırılırsa bu satır `true` olurdu; testin ölçtüğü şey tam olarak bu.
    expect([].every((value: boolean) => value)).toBe(true);
    expect(foreignKeyNullability([]).allNullable).toBe(false);
  });
});
