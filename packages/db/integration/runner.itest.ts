/**
 * Migration koşucusunun GERÇEK PostgreSQL'e karşı sözleşme testleri.
 *
 * **Neden ayrı dosya ve ayrı komut:** tek konteyner açılışı 5.592 ms
 * (Faz 3.0'da ölçüldü). Bu dosya varsayılan `pnpm test`'e girseydi her kapı
 * koşusu saniyelerden dakikalara çıkardı. `pnpm test:db` ile koşar ve
 * `docs/spec/09-quality-protocol.md` §11.5 faz kapanış listesine **yazıldı** —
 * yazılmasaydı hiç koşulmazdı, G-01'in birebir aynı hatası.
 *
 * **Birim testleriyle iş bölümü:** `src/migrate/*.test.ts` koşucunun
 * *dallanmalarını* kapsar (sahte çalıştırıcıyla, hızlı). Bu dosya Postgres'in
 * gerçekten öyle DAVRANDIĞINI kapsar — çünkü sahte bir veritabanına karşı
 * "çalışıyor" demek Faz 2 §5 **D5** deseninin ta kendisidir.
 */
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createNoopLogger } from '@fms/shared';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { SqlExecutor } from '../src/migrate/executor.js';
import { createFileMigrationSource } from '../src/migrate/file-source.js';
import { createPostgresExecutor } from '../src/migrate/postgres-executor.js';
import { migrateDown, migrateUp } from '../src/migrate/runner.js';

const logger = createNoopLogger();
const DRIZZLE_DIR = fileURLToPath(new URL('../drizzle', import.meta.url));

let container: StartedPostgreSqlContainer;
let close: () => Promise<void>;
let executor: SqlExecutor;

beforeAll(async () => {
  // İmaj etiketi `docker-compose.yml` ile AYNI majör olmalı: koşucuyu 16'ya karşı
  // kanıtlayıp 18'de çalıştırmak, kanıtı başka bir sürüme yazmak olurdu.
  container = await new PostgreSqlContainer('postgres:18')
    .withDatabase('fms_test')
    .withUsername('fms')
    .withPassword('fms')
    .start();

  const handle = createPostgresExecutor(container.getConnectionUri());
  executor = handle.executor;
  // Ok fonksiyonuna sarılıyor, metot referansı olarak alınmıyor:
  // `close = handle.close` `this` bağını koparır (`@typescript-eslint/unbound-method`).
  close = async (): Promise<void> => {
    await handle.close();
  };
}, 180_000);

afterAll(async () => {
  await close();
  await container.stop();
}, 60_000);

afterEach(async () => {
  await executor.run(`
    DROP SCHEMA IF EXISTS "fms_meta" CASCADE;
    DROP SCHEMA IF EXISTS "public" CASCADE;
    CREATE SCHEMA "public";
  `);
});

const source = createFileMigrationSource(DRIZZLE_DIR);

async function tableExists(name: string): Promise<boolean> {
  const rows = await executor.rows<{ ok: boolean }>(
    `SELECT to_regclass('public.${name}') IS NOT NULL AS ok`,
  );
  return rows[0]?.ok === true;
}

describe('migrateUp — gerçek Postgres', () => {
  it('çok ifadeli migration’ı uygular ve takip tablosunu KENDİ şemasında kurar', async () => {
    const result = await migrateUp({ executor, source, logger });

    expect(result.applied).toEqual(['0000_countries_initial']);
    expect(await tableExists('countries')).toBe(true);

    // Takip tablosu `public`'te DEĞİL — 3.2b'nin şema karşılaştırmasını
    // kirletmemesi için (runner.ts'teki META_SCHEMA gerekçesi).
    const inPublic = await executor.rows<{ n: number | string }>(
      `SELECT count(*)::int AS n FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'migrations'`,
    );
    expect(Number(inPublic[0]?.n)).toBe(0);

    const tracked = await executor.rows<{ tag: string }>(
      `SELECT "tag" FROM "fms_meta"."migrations"`,
    );
    expect(tracked.map((row) => row.tag)).toEqual(['0000_countries_initial']);
  });

  it('ikinci koşuda hiçbir şey yapmaz (idempotens)', async () => {
    await migrateUp({ executor, source, logger });
    const second = await migrateUp({ executor, source, logger });
    expect(second.applied).toEqual([]);
  });

  // ⚠️ NEGATİF TEST — kısmi uygulama OLMAMALI.
  // Postgres'te DDL işlemseldir; koşucu her migration'ı tek işleme sarıyor.
  it('bozuk bir migration KISMİ şema bırakmaz', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'fms-mig-'));
    await mkdir(path.join(dir, 'meta'), { recursive: true });
    await writeFile(
      path.join(dir, 'meta', '_journal.json'),
      JSON.stringify({
        version: '7',
        dialect: 'postgresql',
        entries: [{ idx: 0, version: '7', when: 1, tag: '0000_broken', breakpoints: true }],
      }),
      'utf8',
    );
    // İlk ifade geçerli, ikincisi kasıtlı olarak bozuk.
    await writeFile(
      path.join(dir, '0000_broken.sql'),
      'CREATE TABLE "half_applied" (id integer);\nCREATE TABLE "" (id integer);',
      'utf8',
    );

    await expect(
      migrateUp({ executor, source: createFileMigrationSource(dir), logger }),
    ).rejects.toThrow();

    expect(await tableExists('half_applied')).toBe(false);

    const tracked = await executor.rows<{ n: number | string }>(
      `SELECT count(*)::int AS n FROM "fms_meta"."migrations"`,
    );
    expect(Number(tracked[0]?.n)).toBe(0);
  });
});

describe('migrateDown — gerçek Postgres', () => {
  it('ÖLÇÜLEN veri kaybını izinsiz uygulamaz ve şemayı bırakmaz', async () => {
    await migrateUp({ executor, source, logger });
    await executor.run(
      `INSERT INTO "countries" ("key","code","name_key") VALUES ('turkiye','TUR','country.tur')`,
    );

    await expect(migrateDown({ executor, source, logger }, { steps: 1 })).rejects.toThrow(
      expect.objectContaining({ code: 'migration.downWouldLoseData' }),
    );

    // İşlem geri alındı: tablo da takip satırı da yerinde.
    expect(await tableExists('countries')).toBe(true);
    const rows = await executor.rows<{ n: number | string }>(
      `SELECT count(*)::int AS n FROM "countries"`,
    );
    expect(Number(rows[0]?.n)).toBe(1);
  });

  it('kuru çalıştırma GERÇEK ölçer ama hiçbir şeyi kalıcı yapmaz', async () => {
    await migrateUp({ executor, source, logger });
    await executor.run(
      `INSERT INTO "countries" ("key","code","name_key") VALUES ('turkiye','TUR','country.tur'), ('ingiltere','ENG','country.eng')`,
    );

    const result = await migrateDown(
      { executor, source, logger },
      { steps: 1, dryRun: true, allowDataLoss: true },
    );

    expect(result.dryRun).toBe(true);
    expect(result.loss.items).toEqual([{ kind: 'table', table: 'countries', rowsAtRisk: 2 }]);
    // Rapor gerçek veriye dayandı — ve tablo hâlâ duruyor.
    expect(await tableExists('countries')).toBe(true);
  });

  it('boş tabloyu düşürmek yapısal kayıptır ama sıfır satır etkiler', async () => {
    await migrateUp({ executor, source, logger });

    const result = await migrateDown(
      { executor, source, logger },
      { steps: 1, allowDataLoss: true },
    );

    expect(result.loss.totalRowsAtRisk).toBe(0);
    expect(result.loss.hasStructuralLoss).toBe(true);
    expect(await tableExists('countries')).toBe(false);
  });

  it('açık izinle geri alır ve takip satırını siler', async () => {
    await migrateUp({ executor, source, logger });

    const result = await migrateDown(
      { executor, source, logger },
      { steps: 1, allowDataLoss: true },
    );

    expect(result.reverted).toEqual(['0000_countries_initial']);
    expect(await tableExists('countries')).toBe(false);

    const tracked = await executor.rows<{ n: number | string }>(
      `SELECT count(*)::int AS n FROM "fms_meta"."migrations"`,
    );
    expect(Number(tracked[0]?.n)).toBe(0);
  });

  it('geri alındıktan sonra tekrar uygulanabilir', async () => {
    await migrateUp({ executor, source, logger });
    await migrateDown({ executor, source, logger }, { steps: 1, allowDataLoss: true });

    const again = await migrateUp({ executor, source, logger });

    expect(again.applied).toEqual(['0000_countries_initial']);
    expect(await tableExists('countries')).toBe(true);
  });
});
