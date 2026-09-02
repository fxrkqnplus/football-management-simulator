/**
 * `player_positions` ENVANTER TESTİ.
 *
 * ⚠️ **BU DOSYANIN EN ÖNEMLİ İDDİASI BİR TABLONUN KENDİSİ HAKKINDA DEĞİL —
 * İKİ TABLONUN AYNI KÜMEYİ PAYLAŞTIĞI HAKKINDA.** `players.primary_position` ve
 * `player_positions.position` aynı on iki kodu kabul etmek zorunda; ayrışsalardı
 * bir oyuncunun birincil mevkisi kendi yetkinlik matrisinde **bulunmayan** bir
 * kod olurdu ve hiçbir veritabanı kısıtı bunu görmezdi (iki ayrı CHECK, iki ayrı
 * tablo). Şema dosyası kümeyi `players.ts`ten **ithal ederek** bunu yapısal
 * olarak imkânsız kılıyor; bu test o ithalin sürdüğünü iddia ediyor.
 *
 * 4.5'in üç katmanlı deseni geçerli: sabit → TS alanı → snake_case sütun adı.
 * Katalog katmanı (CHECK'lerin gerçekten var olduğu) birim testinin işi **değil**
 * — birim testi Postgres'e sormaz (2.3b); o iddia `schema-constraints.itest.ts`te.
 */
import { getTableColumns } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { playerPositions, POSITION_LEVELS } from './player-positions.js';
import { PLAYER_POSITIONS } from './players.js';

const levels = [...POSITION_LEVELS];

describe('POSITION_LEVELS — `spec/01` §3.1 envanteri', () => {
  it('BEŞ yetkinlik derecesi — spec sırasıyla, EKSİKSİZ', () => {
    expect(levels).toEqual(['natural', 'accomplished', 'competent', 'awkward', 'ineffectual']);
  });

  it('sayı 5 ve beşinin de adı BENZERSİZ', () => {
    expect(levels).toHaveLength(5);
    expect(new Set(levels).size).toBe(5);
  });

  /**
   * Sıra bir süs değil: liste en iyiden en kötüye ve Faz 10'un türetmesi
   * (`spec/02` §4.2, oynanan dakikalardan yetkinlik) ile Faz 6'nın arayüz renk
   * skalası ikisi de bu sıraya yaslanacak. Ters çevrilmesi sessiz olmasın.
   */
  it('sıra EN İYİDEN EN KÖTÜYE — ilk `natural`, son `ineffectual`', () => {
    expect(levels[0]).toBe('natural');
    expect(levels.at(-1)).toBe('ineffectual');
  });
});

describe('player_positions tablosu', () => {
  it('beş sütun, TAM SIRASIYLA', () => {
    expect(Object.keys(getTableColumns(playerPositions))).toEqual([
      'playerId',
      'position',
      'level',
      'createdAt',
      'updatedAt',
    ]);
  });

  it('sütunlar snake_case adlarını taşıyor', () => {
    const columns = getTableColumns(playerPositions);
    expect(columns.playerId.name).toBe('player_id');
    expect(columns.position.name).toBe('position');
    expect(columns.level.name).toBe('level');
  });

  it('üç veri sütunu da `NOT NULL` — ikisi PK parçası, biri zorunlu', () => {
    const columns = getTableColumns(playerPositions);
    expect(columns.playerId.notNull).toBe(true);
    expect(columns.position.notNull).toBe(true);
    expect(columns.level.notNull).toBe(true);
  });

  /**
   * ⚠️ **AYRI BİR `id` YOK — ve bu bir 1:N kararının izi.** Bileşik PK
   * `(player_id, position)` bir oyuncunun aynı mevkide iki yetkinlik satırı
   * taşımasını engelliyor; ayrı bir `serial id` o tekliği açardı ve *"hangisi
   * geçerli?"* sorusu şemada cevapsız kalırdı (`player_attributes`ta PK = FK'nin
   * verdiği garantinin buradaki karşılığı).
   */
  it('ayrı bir `id` sütunu YOK', () => {
    expect(Object.keys(getTableColumns(playerPositions))).not.toContain('id');
  });
});

describe('MEVKİ KÜMESİ İKİ TABLODA AYNI — ayrışma yapısal olarak imkânsız', () => {
  it('küme `players.ts`ten geliyor ve on iki kod taşıyor', () => {
    expect([...PLAYER_POSITIONS]).toHaveLength(12);
    expect([...PLAYER_POSITIONS]).toEqual([
      'GK',
      'DC',
      'DL',
      'DR',
      'DM',
      'MC',
      'ML',
      'MR',
      'AMC',
      'AML',
      'AMR',
      'ST',
    ]);
  });

  /**
   * ⚠️ İki kümenin ADI aynı olmasaydı bu test yazılamazdı — ve tam olarak bu
   * yüzden değerli: `player-positions.ts` kendi listesini yazsaydı burada iki
   * ayrı diziyi karşılaştırmak gerekirdi ve o karşılaştırma **elle bakım**
   * isterdi (desen F1). Tek sabit, bakım gerektirmeyen bir değişmez.
   */
  it('mevki ve yetkinlik kümeleri KESİŞMİYOR — iki CHECK iki farklı sütunda', () => {
    const overlap = [...PLAYER_POSITIONS].filter((position) =>
      (levels as readonly string[]).includes(position),
    );
    expect(overlap).toEqual([]);
  });
});
