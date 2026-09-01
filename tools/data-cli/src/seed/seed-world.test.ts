/**
 * ORKESTRASYONUN BİRİM TESTİ — sahte `SqlExecutor` ile.
 *
 * İş bölümü `packages/db/src/migrate/executor.ts` başlığında yazılı ve burada
 * birebir uygulanıyor:
 *
 *   birim testi  → **kararları** kapsar (hangi ifade, hangi sırada, tek işlemde mi)
 *   entegrasyon  → **sözleşmeyi** kapsar (PostgreSQL gerçekten öyle mi davranıyor)
 *
 * ⚠️ Sahte bir çalıştırıcı **tek başına hiçbir şey kanıtlamaz** — Faz 2 §5 D5'in
 * örneklerinden biri tam olarak buydu. Bu yüzden aynı fonksiyon
 * `integration/world-seed.itest.ts`te gerçek PG18 konteynerine karşı da koşuyor.
 * İkisi yerini asla değiştirmez.
 *
 * Buradaki üç iddia entegrasyon testinin **göremediği** şeyler:
 *   ① iki ifade TEK bir işlemin içinde mi
 *   ② `countries` `competitions`tan ÖNCE mi (FK alt sorgusu buna bağlı)
 *   ③ hata durumunda işlem geri mi alınıyor
 * Gerçek veritabanında ①–③ doğru sonuç ürettiği için ayırt edilemezler; sıra
 * bozulsa entegrasyon testi *"`country_id` NULL geldi"* derdi ama **neden**
 * olduğunu söylemezdi.
 */
import type { SqlExecutor } from '@fms/db';
import { createNoopLogger } from '@fms/shared';
import { describe, expect, it, vi } from 'vitest';

import { generatePlayerSeeds } from './player-generator.js';
import { SEED_PLAYER_COUNT } from './player-seed-data.js';
import { seedWorld } from './seed-world.js';
import { SEED_COMPETITIONS, SEED_COUNTRIES } from './world-seed-data.js';

/** Küçük küme — bu dosyanın iddiaları SIRA hakkında, hacim hakkında değil. */
const SAMPLE = generatePlayerSeeds(3);

const logger = createNoopLogger();

interface FakeExecutor {
  readonly executor: SqlExecutor;
  /** Çalıştırılan her ifade, sırasıyla. */
  readonly statements: string[];
  /** Kaç kez `transaction()` açıldı. */
  readonly transactions: () => number;
}

/**
 * `rows()` çağrılarına, ifadedeki tablo adına göre sahte `RETURNING` satırları
 * döndürür. Sıra **bilerek karıştırılmış**: `seedWorld` sıralamayı kendisi
 * yapmazsa determinizm iddiası çöker ve bu test onu yakalar.
 */
function createFakeExecutor(options: { readonly failOnCompetitions?: boolean } = {}): FakeExecutor {
  const statements: string[] = [];
  let transactionCount = 0;

  const rows = <T>(statement: string): Promise<readonly T[]> => {
    statements.push(statement);
    if (statement.includes('INSERT INTO "competitions"')) {
      if (options.failOnCompetitions === true) {
        return Promise.reject(new Error('yarışma yazımı patladı'));
      }
      return Promise.resolve(
        [...SEED_COMPETITIONS].map((row) => ({ key: row.key })).reverse() as T[],
      );
    }
    if (statement.includes('INSERT INTO "people"')) {
      return Promise.resolve([...SAMPLE.people].map((row) => ({ key: row.key })).reverse() as T[]);
    }
    if (statement.includes('INSERT INTO "players"')) {
      // ⚠️ `person_id` bir TAMSAYI ve sıra bilerek karıştırılmış: `seedWorld`
      // dizge sıralaması yapsaydı `10 < 9` derdi ve bu test onu yakalar.
      return Promise.resolve([{ person_id: 10 }, { person_id: 9 }, { person_id: 2 }] as T[]);
    }
    return Promise.resolve([...SEED_COUNTRIES].map((row) => ({ key: row.key })).reverse() as T[]);
  };

  const executor: SqlExecutor = {
    run: (statement: string): Promise<void> => {
      statements.push(statement);
      return Promise.resolve();
    },
    rows,
    transaction: async <T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T> => {
      transactionCount += 1;
      return fn(executor);
    },
  };

  return { executor, statements, transactions: () => transactionCount };
}

/** Varsayılan 5.000 satır yerine küçük kümeyle koşan çağrı. */
const seedSample = async (fake: FakeExecutor): ReturnType<typeof seedWorld> =>
  seedWorld({
    executor: fake.executor,
    logger,
    people: SAMPLE.people,
    players: SAMPLE.players,
  });

describe('seedWorld — orkestrasyon kararları', () => {
  it('DÖRT ifadeyi TEK işlemde koşuyor (4.9`da ikiden dörde çıktı)', async () => {
    const fake = createFakeExecutor();
    await seedSample(fake);

    expect(fake.transactions()).toBe(1);
    expect(fake.statements).toHaveLength(4);
  });

  it('⚠️ SIRA: countries → competitions → people → players, ve her adım öncekine DAYANIYOR', async () => {
    const fake = createFakeExecutor();
    await seedSample(fake);

    expect(fake.statements[0]).toContain('INSERT INTO "countries"');
    expect(fake.statements[1]).toContain('INSERT INTO "competitions"');
    expect(fake.statements[2]).toContain('INSERT INTO "people"');
    expect(fake.statements[3]).toContain('INSERT INTO "players"');

    // Bağımlılıklar iddia ediliyor — sıra bir tercih değil bir zorunluluk.
    expect(fake.statements[1]).toContain('SELECT "id" FROM "countries"');
    expect(fake.statements[2]).toContain('SELECT "id" FROM "countries"');
    expect(fake.statements[3]).toContain('SELECT "id" FROM "people"');
  });

  it('dönen anahtarları SIRALIYOR — `RETURNING` sırası garanti değil', async () => {
    // Sahte, satırları bilerek TERS veriyor. Sıralama `seedWorld`ün işi olmasa
    // determinizm testi planlayıcının keyfine bağlı kalırdı.
    const fake = createFakeExecutor();
    const result = await seedSample(fake);

    expect(result.countryKeys).toEqual([...result.countryKeys].sort());
    expect(result.competitionKeys).toEqual([...result.competitionKeys].sort());
    expect(result.peopleKeys).toEqual([...result.peopleKeys].sort());
    expect(result.countryKeys).toHaveLength(6);
    expect(result.competitionKeys).toHaveLength(11);
    expect(result.peopleKeys).toHaveLength(3);
  });

  it('⚠️ `person_id` SAYISAL sıralanıyor — dizge sıralaması `10 < 9` derdi', async () => {
    const fake = createFakeExecutor();
    const result = await seedSample(fake);

    expect(result.playerPersonIds).toEqual([2, 9, 10]);
    // Karşı örnek: dizge sıralaması bu diziyi BOZARDI.
    expect([10, 9, 2].map(String).sort()).toEqual(['10', '2', '9']);
  });

  it('varsayılan küme 5.000 kişi + 5.000 oyuncu — kabul kriteri 1', async () => {
    const fake = createFakeExecutor();
    await seedWorld({ executor: fake.executor, logger });

    // Sahte `RETURNING` küçük kalıyor; iddia GİRDİDE, yani üretilen SQL'in
    // satır sayısında. (Kaç satır YAZILDIĞI entegrasyon testinin işi.)
    const peopleStatement = fake.statements[2] ?? '';
    const playersStatement = fake.statements[3] ?? '';
    expect(peopleStatement.split('\n').filter((line) => line.startsWith('    ('))).toHaveLength(
      SEED_PLAYER_COUNT,
    );
    expect(playersStatement.split('\n').filter((line) => line.startsWith('    ('))).toHaveLength(
      SEED_PLAYER_COUNT,
    );
  });

  it('BOŞ küme için ifade HİÇ üretilmiyor — gövdesiz `VALUES` sözdizimi hatası', async () => {
    const fake = createFakeExecutor();
    await seedWorld({ executor: fake.executor, logger, people: [], players: [] });

    expect(fake.statements).toHaveLength(2);
    expect(fake.statements.join('\n')).not.toContain('INSERT INTO "people"');
    expect(fake.statements.join('\n')).not.toContain('INSERT INTO "players"');
  });

  it('ikinci ifade patlarsa hata YUTULMUYOR — işlem geri alınabilsin', async () => {
    const fake = createFakeExecutor({ failOnCompetitions: true });

    await expect(seedWorld({ executor: fake.executor, logger })).rejects.toThrow(
      'yarışma yazımı patladı',
    );
    // Ülke ifadesi koşmuştu; işlemin geri alınması `SqlExecutor`ın sözleşmesi
    // ve gerçek davranışı entegrasyon testinde kanıtlanıyor.
    expect(fake.statements[0]).toContain('INSERT INTO "countries"');
  });

  it('kendi veri kümesi verilebiliyor — varsayılanlar ezilebilir', async () => {
    const fake = createFakeExecutor();
    await seedWorld({
      executor: fake.executor,
      logger,
      countries: SEED_COUNTRIES.slice(0, 1),
      competitions: [],
      people: [],
      players: [],
    });

    // Tek satırlık `VALUES` listesi.
    expect(fake.statements[0]?.split('\n').filter((line) => line.startsWith('    ('))).toHaveLength(
      1,
    );
  });

  it('başlangıç ve bitiş satırlarını logluyor — K8, `console` yok', async () => {
    const fake = createFakeExecutor();
    const info = vi.fn();
    await seedWorld({
      executor: fake.executor,
      logger: { ...logger, info },
      people: SAMPLE.people,
      players: SAMPLE.players,
    });

    expect(info).toHaveBeenCalledWith(
      { countries: 6, competitions: 11, people: 3, players: 3 },
      'seed.world.start',
    );
    expect(info).toHaveBeenCalledWith(
      { countriesWritten: 6, competitionsWritten: 11, peopleWritten: 3, playersWritten: 3 },
      'seed.world.done',
    );
  });
});
