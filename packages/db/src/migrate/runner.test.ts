/**
 * Koşucunun KARAR mantığının birim testleri.
 *
 * ⚠️ **Bu testler koşucunun ÜRETİMDE çalıştığını KANITLAMAZ.** Sahte bir
 * çalıştırıcı, Postgres'in gerçekte nasıl davrandığını (DDL'in işlemselliği,
 * `information_schema`'nın işlem içindeki görünürlüğü, çok ifadeli SQL'in kabulü)
 * taklit etmez — Faz 2 §5 **D5** bunun üç örneğini kaydetti. Sözleşmenin kanıtı
 * `packages/db/integration/runner.itest.ts`, gerçek konteynerle.
 *
 * Buradaki testlerin işi başka: **dallanmaları** kapsamak. Her dallanmayı gerçek
 * bir veritabanıyla sınamak, denemesi 5.592 ms eden bir konteyner açılışı demek
 * (3.0'da ölçüldü) ve pratikte çoğu dal hiç sınanmazdı.
 */
import { createNoopLogger } from '@fms/shared';
import { describe, expect, it } from 'vitest';

import type { SqlExecutor } from './executor.js';
import { isRollbackSignal } from './executor.js';
import type { MigrationSource } from './runner.js';
import { migrateDown, migrateUp } from './runner.js';

const logger = createNoopLogger();

interface FakeTable {
  columns: string[];
  rowCount: number;
}

/**
 * Sahte çalıştırıcı.
 *
 * Postgres'i **simüle etmiyor** — yalnızca koşucunun sorduğu üç soruya
 * (uygulananlar, tablolar, sütunlar/satırlar) senaryoya göre cevap veriyor ve
 * `DROP TABLE`/`DROP COLUMN` gördüğünde kendi tablo haritasını güncelliyor.
 * Amaç koşucunun **kararını** görmek, veritabanını taklit etmek değil.
 */
class FakeExecutor implements SqlExecutor {
  public readonly ran: string[] = [];
  public rollbacks = 0;
  public commits = 0;

  public constructor(
    private applied: { tag: string; idx: number; hash: string }[] = [],
    private tables: Map<string, FakeTable> = new Map(),
  ) {}

  public async run(sql: string): Promise<void> {
    this.ran.push(sql);
    const dropTable = /DROP TABLE "?([a-z_]+)"?/i.exec(sql);
    if (dropTable?.[1] !== undefined) this.tables.delete(dropTable[1]);

    const dropColumn = /ALTER TABLE "?([a-z_]+)"?\s+DROP COLUMN "?([a-z_]+)"?/i.exec(sql);
    if (dropColumn?.[1] !== undefined && dropColumn[2] !== undefined) {
      const table = this.tables.get(dropColumn[1]);
      if (table) table.columns = table.columns.filter((column) => column !== dropColumn[2]);
    }

    const del = /DELETE FROM .*migrations.* WHERE "tag" = '([^']+)'/i.exec(sql);
    if (del?.[1] !== undefined) this.applied = this.applied.filter((row) => row.tag !== del[1]);

    const ins = /VALUES \('([^']+)', (\d+), '([^']+)'\)/.exec(sql);
    if (ins?.[1] !== undefined && ins[2] !== undefined && ins[3] !== undefined) {
      this.applied.push({ tag: ins[1], idx: Number(ins[2]), hash: ins[3] });
    }
    return Promise.resolve();
  }

  public rows<T>(sql: string): Promise<readonly T[]> {
    if (sql.includes('migrations')) return Promise.resolve(this.applied as unknown as T[]);
    if (sql.includes('information_schema.tables')) {
      return Promise.resolve(
        [...this.tables.keys()].sort().map((table) => ({ table_name: table })) as unknown as T[],
      );
    }
    if (sql.includes('information_schema.columns')) {
      const match = /table_name = '([^']+)'/.exec(sql);
      const columns = this.tables.get(match?.[1] ?? '')?.columns ?? [];
      return Promise.resolve(columns.map((column) => ({ column_name: column })) as unknown as T[]);
    }
    if (sql.includes('count(*)')) {
      const match = /FROM "public"\."([^"]+)"/.exec(sql);
      return Promise.resolve([
        { n: this.tables.get(match?.[1] ?? '')?.rowCount ?? 0 },
      ] as unknown as T[]);
    }
    return Promise.resolve([]);
  }

  public async transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T> {
    const snapshotApplied = [...this.applied];
    const snapshotTables = new Map(
      [...this.tables].map(([key, value]) => [key, { ...value, columns: [...value.columns] }]),
    );
    try {
      const result = await fn(this);
      this.commits += 1;
      return result;
    } catch (error) {
      this.applied = snapshotApplied;
      this.tables = snapshotTables;
      this.rollbacks += 1;
      throw error;
    }
  }
}

const JOURNAL = JSON.stringify({
  version: '7',
  dialect: 'postgresql',
  entries: [
    { idx: 0, version: '7', when: 1, tag: '0000_countries_initial', breakpoints: true },
    { idx: 1, version: '7', when: 2, tag: '0001_add_code', breakpoints: true },
  ],
});

const source = (overrides: Partial<MigrationSource> = {}): MigrationSource => ({
  readJournal: () => Promise.resolve(JOURNAL),
  readUp: (tag) => Promise.resolve(`-- up ${tag}`),
  readDown: (tag) =>
    Promise.resolve(
      tag === '0001_add_code'
        ? 'ALTER TABLE "countries" DROP COLUMN "code";'
        : 'DROP TABLE "countries";',
    ),
  hashUp: (tag) => Promise.resolve(`hash-${tag}`),
  ...overrides,
});

describe('migrateUp', () => {
  it('bekleyen migration’ları sırayla uygular ve takip satırı yazar', async () => {
    const executor = new FakeExecutor();
    const result = await migrateUp({ executor, source: source(), logger });

    expect(result.applied).toEqual(['0000_countries_initial', '0001_add_code']);
    expect(executor.commits).toBe(2);
    expect(executor.ran.filter((sql) => sql.includes('INSERT INTO'))).toHaveLength(2);
  });

  // İDEMPOTENSLİK: ikinci koşu hiçbir şey yapmamalı.
  it('ikinci kez koşulduğunda hiçbir şey yapmaz', async () => {
    const executor = new FakeExecutor();
    await migrateUp({ executor, source: source(), logger });
    const before = executor.ran.length;

    const second = await migrateUp({ executor, source: source(), logger });

    expect(second.applied).toEqual([]);
    // Yalnızca meta tablo + okuma; hiçbir migration SQL'i koşmadı.
    expect(executor.ran.filter((sql) => sql.includes('-- up'))).toHaveLength(2);
    expect(executor.ran.length).toBeGreaterThan(before - 1);
  });

  it('uygulanmış dosya değişmişse durur', async () => {
    const executor = new FakeExecutor();
    await migrateUp({ executor, source: source(), logger });

    const tampered = source({ hashUp: () => Promise.resolve('BASKA_HASH') });
    await expect(migrateUp({ executor, source: tampered, logger })).rejects.toThrow(
      expect.objectContaining({ code: 'migration.appliedHashMismatch' }),
    );
  });
});

describe('migrateDown', () => {
  const seeded = (): FakeExecutor =>
    new FakeExecutor(
      [
        { tag: '0000_countries_initial', idx: 0, hash: 'hash-0000_countries_initial' },
        { tag: '0001_add_code', idx: 1, hash: 'hash-0001_add_code' },
      ],
      new Map([['countries', { columns: ['id', 'key', 'code'], rowCount: 6 }]]),
    );

  it('ölçülen veri kaybını izinsiz uygulamaz ve işlemi geri alır', async () => {
    const executor = seeded();
    await expect(migrateDown({ executor, source: source(), logger }, { steps: 1 })).rejects.toThrow(
      expect.objectContaining({ code: 'migration.downWouldLoseData' }),
    );
    expect(executor.rollbacks).toBe(1);
    expect(executor.commits).toBe(0);
  });

  it('açık izinle geri alır', async () => {
    const executor = seeded();
    const result = await migrateDown(
      { executor, source: source(), logger },
      { steps: 1, allowDataLoss: true },
    );
    expect(result.reverted).toEqual(['0001_add_code']);
    expect(result.loss.items).toEqual([
      { kind: 'column', table: 'countries', column: 'code', rowsAtRisk: 6 },
    ]);
    expect(executor.commits).toBe(1);
  });

  // Kuru çalıştırma: rapor GERÇEK, etki YOK.
  it('kuru çalıştırmada ölçer ama hiçbir şeyi kalıcı yapmaz', async () => {
    const executor = seeded();
    const result = await migrateDown(
      { executor, source: source(), logger },
      { steps: 2, dryRun: true, allowDataLoss: true },
    );

    expect(result.dryRun).toBe(true);
    expect(result.loss.hasStructuralLoss).toBe(true);
    expect(executor.rollbacks).toBe(1);
    expect(executor.commits).toBe(0);
  });

  it('kayıp yoksa izin bayrağı gerekmez', async () => {
    const executor = new FakeExecutor(
      [{ tag: '0000_countries_initial', idx: 0, hash: 'hash-0000_countries_initial' }],
      new Map(),
    );
    const noop = source({ readDown: () => Promise.resolve('-- indeks düşürmek kayıpsızdır') });

    const result = await migrateDown({ executor, source: noop, logger }, { steps: 1 });

    expect(result.loss.hasStructuralLoss).toBe(false);
    expect(executor.commits).toBe(1);
  });

  it('geri alma dosyası yoksa veritabanına dokunmadan durur', async () => {
    const executor = seeded();
    const missing = source({ readDown: () => Promise.resolve(null) });

    await expect(migrateDown({ executor, source: missing, logger }, { steps: 1 })).rejects.toThrow(
      expect.objectContaining({ code: 'migration.downScriptMissing' }),
    );
    expect(executor.commits).toBe(0);
    expect(executor.rollbacks).toBe(0);
  });

  it('uygulanandan fazla adım isteğini reddeder', async () => {
    const executor = seeded();
    await expect(migrateDown({ executor, source: source(), logger }, { steps: 5 })).rejects.toThrow(
      expect.objectContaining({ code: 'migration.downStepsTooMany' }),
    );
  });
});

describe('RollbackSignal', () => {
  it('yalnızca kendi türünü tanır', () => {
    expect(isRollbackSignal(new Error('başka'))).toBe(false);
  });
});
