/**
 * TRANSFER ARAMA ZEMİNİ — indeks envanteri + yaş→tarih çevriminin sınırları.
 *
 * ⚠️ **İKİ AYRI İDDİA VAR VE İKİSİ DE GEREKLİ:**
 * ① indeksler **şema tanımında** duruyor, adları tek bir modülden geliyor ve
 *   sütun sırası (`primary_position` → `current_ability`) korunuyor
 * ② çevrimin **sınırları** doğru — ve sınırlar bir kalibrasyon değil, yaşın
 *   tanımından çıkan bir sonuç, yani sabitlenebilir
 *
 * ℹ️ İndeksin gerçekten **kullanıldığı** burada iddia EDİLMİYOR: bir birim
 * testi Postgres'e soru sormaz (2.3b) ve planlayıcı davranışı 4.10'un işi.
 * Katalog tarafındaki karşılığı `schema-constraints.itest.ts`te.
 */
import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import { clubs } from './clubs.js';
import { people } from './people.js';
import { players } from './players.js';
import { ageRangeToBirthDateRange, TRANSFER_SEARCH_INDEXES } from './transfer-search.js';

/**
 * ⚠️ `config.name` `string | undefined` — drizzle indeks adını zorunlu
 * tutmuyor. `undefined`lar **filtrelenmiyor**, `(adsız)` diye görünür
 * kılınıyor: filtrelense adsız bir indeks listeden sessizce düşerdi ve
 * aşağıdaki `clubs` karşı kontrolü onu göremezdi.
 */
const indexNamesOf = (table: Parameters<typeof getTableConfig>[0]): string[] =>
  getTableConfig(table)
    .indexes.map((entry) => entry.config.name ?? '(adsız)')
    .sort();

describe('TRANSFER_SEARCH_INDEXES — şema tanımından okunuyor', () => {
  it('`players` bileşik indeksi TANIMLI ve adı modülden geliyor', () => {
    expect(indexNamesOf(players)).toContain(TRANSFER_SEARCH_INDEXES.playersPositionAbility);
  });

  it('`people` doğum tarihi indeksi TANIMLI ve adı modülden geliyor', () => {
    expect(indexNamesOf(people)).toContain(TRANSFER_SEARCH_INDEXES.peopleBirthDate);
  });

  /**
   * ⚠️ KARŞI KONTROL (D3) — 4.7'nin `isUnique` dersinin aynısı.
   *
   * `getTableConfig(...).indexes` var olmayan bir alan olsaydı yukarıdaki iki
   * iddia **boş bir diziye** bakardı ve `toContain` kırılırdı — yani orada
   * körlük riski yok. Asıl risk ters yönde: alan var ama `config.name`
   * `undefined` dönseydi iki iddia da kırılırdı ve sebebi görünmezdi. Bu test
   * okuma yolunun **başka bir tabloda da çalıştığını** gösteriyor: `clubs`
   * 3.7'de iki indeks aldı ve ikisi de adıyla görünmeli.
   */
  it('KARŞI KONTROL — okuma yolu `clubs`ın 3.7 indekslerini de görüyor', () => {
    expect(indexNamesOf(clubs)).toEqual(['clubs_competition_id_idx', 'clubs_name_trgm_idx']);
  });

  /**
   * SIRA BİR TERCİH DEĞİL: `primary_position` eşitlik, `current_ability`
   * aralık yüklemi. Ters sırada mevki eşitliği indeksin arama sınırına hiç
   * giremezdi — gerekçe `transfer-search.ts` başlığında.
   */
  it('bileşik indeksin sütun SIRASI: eşitlik önce, aralık sonra', () => {
    const composite = getTableConfig(players).indexes.find(
      (entry) => entry.config.name === TRANSFER_SEARCH_INDEXES.playersPositionAbility,
    );

    expect(composite).toBeDefined();
    expect(
      composite?.config.columns.map((column) => ('name' in column ? column.name : '(ifade)')),
    ).toEqual(['primary_position', 'current_ability']);
  });

  it('iki indeks adı BENZERSİZ ve ikisi de `_idx` ile bitiyor', () => {
    const names = Object.values(TRANSFER_SEARCH_INDEXES);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) {
      expect(name.endsWith('_idx')).toBe(true);
    }
  });
});

describe('ageRangeToBirthDateRange — sınırlar', () => {
  /**
   * Kriter 3'ün sorgusunun kendi yükleminin çevrimi: "20–24 yaş".
   * Referans günü sabit — `Date.now()` kullanılsaydı test her gün başka bir
   * şey iddia ederdi (K2'nin ruhu).
   */
  it('20–24 yaş, 2026-09-01 referansıyla', () => {
    expect(ageRangeToBirthDateRange(20, 24, '2026-09-01')).toEqual({
      from: '2001-09-02',
      to: '2006-09-01',
    });
  });

  /**
   * SINIR DAHİL — `<` yazılsaydı iki uç da sessizce kayardı ve hata ancak
   * 4.10'un ölçümünde bir satır sayısı olarak görünürdü (4.5'in `CA <= PA`
   * karşı örneğiyle aynı sınıf).
   */
  it('`to` ucu DAHİL — o gün TAM minAge olan aralıkta', () => {
    // 2006-09-01 doğumlu 2026-09-01'de tam 20 → dahil.
    expect(ageRangeToBirthDateRange(20, 24, '2026-09-01').to).toBe('2006-09-01');
    // Bir gün sonrası 19 yaşında → aralığın dışında.
    expect(ageRangeToBirthDateRange(19, 24, '2026-09-01').to).toBe('2007-09-01');
  });

  it('`from` ucu DAHİL — o gün maxAge+1 olan aralığın DIŞINDA', () => {
    // 2001-09-01 doğumlu 2026-09-01'de tam 25 → hariç; ilk dahil gün ertesi.
    expect(ageRangeToBirthDateRange(20, 24, '2026-09-01').from).toBe('2001-09-02');
  });

  it('tek yaşlık aralık (minAge === maxAge) bir yıllık pencere veriyor', () => {
    const range = ageRangeToBirthDateRange(20, 20, '2026-09-01');
    expect(range).toEqual({ from: '2005-09-02', to: '2006-09-01' });
  });

  it('minAge 0 kabul ediliyor — yeni doğan referans gününde dahil', () => {
    expect(ageRangeToBirthDateRange(0, 0, '2026-09-01')).toEqual({
      from: '2025-09-02',
      to: '2026-09-01',
    });
  });

  /**
   * ⚠️ ARTIK YIL KELEPÇESİ — sessiz bir GÜN KAYMASI sınıfı.
   *
   * `Date.UTC(1979, 1, 29)` 1979-02-29 diye bir gün olmadığı için **1979-03-01**
   * üretir, yani sonuç bir sonraki aya taşar. Kelepçesiz `from` 1979-03-02
   * çıkardı ve **1979-03-01 doğumlu birini dışarıda bırakırdı** — oysa o kişi
   * 2004-02-29'da 24 yaşında (25 olması 2004-03-01).
   *
   * Hiçbir tip kontrolü bunu göremez: iki değer de geçerli bir `YYYY-MM-DD`.
   */
  it('artık yıl — 29 Şubat referansında `from` ucu bir gün KAYMIYOR', () => {
    // 2004-02-29 − 25y → 1979-02-29 yok → kelepçe 1979-02-28 → +1 gün.
    expect(ageRangeToBirthDateRange(20, 24, '2004-02-29').from).toBe('1979-03-01');
  });

  it('artık yıl — 29 Şubat referansında `to` ucu da kelepçeleniyor', () => {
    // 2004-02-29 − 21y → 1983-02-29 yok → kelepçe 1983-02-28.
    // Kelepçesiz 1983-03-01 çıkardı ve o kişi referans gününde 20 yaşında.
    expect(ageRangeToBirthDateRange(21, 24, '2004-02-29').to).toBe('1983-02-28');
  });

  it('artık yıl — hedef yıl da artıksa gün KORUNUYOR (kelepçe gereksiz yere ötmüyor)', () => {
    // 2004-02-29 − 20y → 1984-02-29 var (1984 artık yıl).
    expect(ageRangeToBirthDateRange(20, 24, '2004-02-29').to).toBe('1984-02-29');
  });
});

describe('ageRangeToBirthDateRange — REDDEDİLEN girdiler', () => {
  it('minAge > maxAge REDDEDİLİYOR', () => {
    expect(() => ageRangeToBirthDateRange(25, 20, '2026-09-01')).toThrow(RangeError);
  });

  it('negatif yaş REDDEDİLİYOR', () => {
    expect(() => ageRangeToBirthDateRange(-1, 20, '2026-09-01')).toThrow(RangeError);
  });

  it('tam sayı olmayan yaş REDDEDİLİYOR', () => {
    expect(() => ageRangeToBirthDateRange(20.5, 24, '2026-09-01')).toThrow(RangeError);
  });

  it('bozuk biçimli referans REDDEDİLİYOR', () => {
    expect(() => ageRangeToBirthDateRange(20, 24, '01/09/2026')).toThrow(RangeError);
    expect(() => ageRangeToBirthDateRange(20, 24, '2026-9-1')).toThrow(RangeError);
  });

  /**
   * ⚠️ Biçimi doğru ama takvimde OLMAYAN gün. `Date.UTC(2026, 1, 30)` bunu
   * sessizce 2026-03-02'ye kaydırır ve aralık **hiçbir uyarı vermeden** kayar —
   * reddedilmesi gerekiyor.
   */
  it('takvimde olmayan gün REDDEDİLİYOR (sessiz kayma değil)', () => {
    expect(() => ageRangeToBirthDateRange(20, 24, '2026-02-30')).toThrow(RangeError);
    expect(() => ageRangeToBirthDateRange(20, 24, '2025-02-29')).toThrow(RangeError);
  });

  it('KARŞI ÖRNEK — gerçek artık gün KABUL EDİLİYOR', () => {
    expect(() => ageRangeToBirthDateRange(20, 24, '2024-02-29')).not.toThrow();
  });
});
