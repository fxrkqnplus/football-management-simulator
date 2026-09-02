/**
 * `player_stats_history` ENVANTER TESTİ — 33 sütun, LİSTE olarak.
 *
 * ⚠️ **BU TABLONUN SÜTUN LİSTESİ BİR SÖZLEŞME, BİR AYRINTI DEĞİL.** `spec/02`
 * §4.3 her niteliği bu sütunlardan **adıyla** hesaplıyor (`passing` ← pas
 * isabeti + hacim, `finishing` ← gol/xG, `reflexes` ← kurtarış oranı + xGA
 * farkı). Bir sütunun adı sessizce değişirse Faz 10'un türetme tablosu
 * ayrışır — ve bu, çalışma zamanında *"nitelik biraz farklı çıktı"* diye
 * görünür, bir hata olarak değil.
 *
 * 4.4'ün dersi burada uygulanıyor: `expect(columns.length).toBe(33)` yanlış adlı
 * bir sütunu geçirirdi, `toEqual([...])` geçirmez. **Özetler körlenebilir,
 * envanterler kör kalmaz.**
 */
import { getTableColumns } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { playerStatsHistory } from './player-stats-history.js';

const columns = getTableColumns(playerStatsHistory);
const fields = Object.keys(columns);

/** xG ailesi — tek yerde, üç iddia da bunu okuyor. */
const XG_FIELDS = ['xg', 'xa', 'xga'] as const;

describe('player_stats_history — sütun envanteri', () => {
  it('33 sütun, `spec/01` §3.1 SIRASIYLA, EKSİKSİZ', () => {
    expect(fields).toEqual([
      'id',
      'playerId',
      'seasonYear',
      'competitionId',
      'clubId',
      'appearances',
      'minutes',
      'goals',
      'assists',
      'xg',
      'xa',
      'passesAttempted',
      'passesCompleted',
      'progressivePasses',
      'dribblesAttempted',
      'dribblesCompleted',
      'duelsWon',
      'duelsTotal',
      'aerialsWon',
      'aerialsTotal',
      'tackles',
      'interceptions',
      'blocks',
      'foulsCommitted',
      'yellowCards',
      'redCards',
      'saves',
      'goalsConceded',
      'xga',
      'cleanSheets',
      'penaltiesSaved',
      'createdAt',
      'updatedAt',
    ]);
  });

  it('sayı 33 ve 33`ünün de adı BENZERSİZ', () => {
    expect(fields).toHaveLength(33);
    expect(new Set(fields).size).toBe(33);
  });

  it('her sütun snake_case adını taşıyor', () => {
    const toSnake = (name: string): string => name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    for (const field of fields) {
      expect(columns[field as keyof typeof columns].name).toBe(toSnake(field));
    }
  });
});

describe('NULLABILITY — tek nullable sütun `clubId`, ve bu 4.1`in kararı', () => {
  /**
   * ⚠️ **BU BİR ENVANTER, BİR ÖRNEK DEĞİL.** *"`clubId` nullable"* diye tek bir
   * iddia yazmak, ikinci bir sütunun sessizce nullable olmasına izin verirdi.
   * Liste biçimi *"başka hiçbiri değil"*i de söylüyor — ve `NOT NULL` yazmayı
   * unutmak bu şemada gerçekten olabilecek bir şey (fixture'lar `INSERT`i tam
   * yazdığı için testler yine geçerdi).
   */
  it('NULLABLE olanların TAM listesi — yalnızca `clubId`', () => {
    const nullable = fields.filter((field) => !columns[field as keyof typeof columns].notNull);
    expect(nullable).toEqual(['clubId']);
  });

  /**
   * `saves`/`goalsConceded`/`xga`/`cleanSheets`/`penaltiesSaved` bir saha
   * oyuncusunda **0**'dır, *"bilinmiyor"* değil — `player_attributes`ta bir
   * kalecinin `finishing`inin yazılmasıyla aynı ilke. SAPMA-026'nın TERSİ vaka:
   * orada bilgi yoktu, burada bilgi var ve değeri sıfır.
   */
  it('kaleci sütunları da `NOT NULL` — saha oyuncusunda 0, "bilinmiyor" değil', () => {
    for (const field of ['saves', 'goalsConceded', 'xga', 'cleanSheets', 'penaltiesSaved']) {
      expect(columns[field as keyof typeof columns].notNull).toBe(true);
    }
  });
});

describe('TİP KARARLARI — ondalık ve tamsayı ayrımı', () => {
  /**
   * ⚠️ §3.1.2 ⑥'nın dersi: `mode: 'number'` **sessizce yanlış sayı** döndürüyor.
   * xG ailesi `numeric` seçildi çünkü Faz 19 kariyer toplamlarını **topluyor** ve
   * kayan nokta toplama sırasına göre farklı sonuç verir. Bu test tipin
   * `real`/`double precision`a kaymasını gürültülü kılıyor.
   */
  it('xG ailesi `numeric(6,2)` — kayan nokta DEĞİL', () => {
    for (const field of XG_FIELDS) {
      expect(columns[field].getSQLType()).toBe('numeric(6, 2)');
    }
  });

  it('sayaçların TAMAMI `integer` — smallint sınırı kariyer toplamında dar', () => {
    const counters = fields.filter(
      (field) =>
        !['id', 'createdAt', 'updatedAt', ...XG_FIELDS].includes(field) &&
        !['playerId', 'competitionId', 'clubId', 'seasonYear'].includes(field),
    );
    // 33 − id − iki zaman damgası − üç xG − dört kimlik/sezon = 23. Sayı
    // TAHMİN EDİLMEDİ: önce 22 yazıldı ve test onu **anında reddetti** (3.5'in
    // dersi — bir tahmin teste yazılırsa hemen ötüyor, belgeye yazılırsa hiç).
    expect(counters).toHaveLength(23);
    for (const field of counters) {
      expect(columns[field as keyof typeof columns].getSQLType()).toBe('integer');
    }
  });

  it('`seasonYear` bir SÜTUN, bir tablo değil — §3.1.1', () => {
    expect(columns.seasonYear.getSQLType()).toBe('integer');
    expect(fields).not.toContain('seasonId');
  });
});
