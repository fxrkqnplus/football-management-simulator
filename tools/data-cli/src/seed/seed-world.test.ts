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

import { seedWorld } from './seed-world.js';
import { SEED_COMPETITIONS, SEED_COUNTRIES } from './world-seed-data.js';

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

describe('seedWorld — orkestrasyon kararları', () => {
  it('iki ifadeyi TEK işlemde koşuyor', async () => {
    const fake = createFakeExecutor();
    await seedWorld({ executor: fake.executor, logger });

    expect(fake.transactions()).toBe(1);
    expect(fake.statements).toHaveLength(2);
  });

  it('`countries` `competitions`tan ÖNCE — FK alt sorgusu buna bağlı', async () => {
    const fake = createFakeExecutor();
    await seedWorld({ executor: fake.executor, logger });

    expect(fake.statements[0]).toContain('INSERT INTO "countries"');
    expect(fake.statements[1]).toContain('INSERT INTO "competitions"');
    // Ve ikinci ifade gerçekten birinciye dayanıyor.
    expect(fake.statements[1]).toContain('SELECT "id" FROM "countries"');
  });

  it('dönen anahtarları SIRALIYOR — `RETURNING` sırası garanti değil', async () => {
    // Sahte, satırları bilerek TERS veriyor. Sıralama `seedWorld`ün işi olmasa
    // determinizm testi planlayıcının keyfine bağlı kalırdı.
    const fake = createFakeExecutor();
    const result = await seedWorld({ executor: fake.executor, logger });

    expect(result.countryKeys).toEqual([...result.countryKeys].sort());
    expect(result.competitionKeys).toEqual([...result.competitionKeys].sort());
    expect(result.countryKeys).toHaveLength(6);
    expect(result.competitionKeys).toHaveLength(11);
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
    });

    expect(info).toHaveBeenCalledWith({ countries: 6, competitions: 11 }, 'seed.world.start');
    expect(info).toHaveBeenCalledWith(
      { countriesWritten: 6, competitionsWritten: 11 },
      'seed.world.done',
    );
  });
});
