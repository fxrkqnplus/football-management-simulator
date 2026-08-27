/**
 * K4'ün İKİNCİ HATTI — veritabanı rolü. Faz 3.3.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN İKİNCİ BİR HAT
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Birinci hat tip seviyesinde (`src/client/master.ts`) ve **derleme zamanında**
 * korur. Üç yol onu atlar:
 *
 *   ① `as unknown as` dönüşümü
 *   ② `SqlExecutor` üzerinden ham SQL
 *   ③ Tip sistemini hiç görmeyen bir istemci (psql, bir bakım betiği)
 *
 * Bu dosya, veritabanı seviyesindeki hattın o üçünü de kapattığını **ölçüyor**.
 * Ham SQL testi ②'nin doğrudan karşılığı: tip sistemi orada yok ama izin var.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ HAT BUGÜN KURULMUYOR — BORÇ-007, Faz 12
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Kısıtlanacak bir uygulama bağlantısı **henüz yok**: `apps/api` veritabanına
 * Faz 12'de bağlanıyor. Bugün rol oluşturmak, tüketicisi olmayan bir
 * yapılandırma yazmak olurdu — SAPMA-017'nin reddettiği şey (*"kanıtlanamaz →
 * işaretlenemez"*).
 *
 * Ama **mekanizmanın çalıştığı bugün kanıtlanıyor**, çünkü:
 * ① `GRANT`/`REVOKE` ifadeleri migration'lara ait ve migration'lar bugün başlıyor
 * ② Faz 12 bunu yeniden keşfetmek zorunda kalmamalı
 *
 * Yani bu test bir **çalışan belge**: "yapılabilir" iddiasını "ölçüldü"ye çeviriyor.
 */
import { fileURLToPath } from 'node:url';

import { createNoopLogger } from '@fms/shared';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createWorldDb, type WorldDbHandle } from '../src/client/index.js';
import type { SqlExecutor } from '../src/migrate/executor.js';
import { createFileMigrationSource } from '../src/migrate/file-source.js';
import { createPostgresExecutor } from '../src/migrate/postgres-executor.js';
import { migrateUp } from '../src/migrate/runner.js';
import { countries } from '../src/schema/countries.js';
import { countryInsertSql } from './fixtures.js';

const logger = createNoopLogger();
const DRIZZLE_DIR = fileURLToPath(new URL('../drizzle', import.meta.url));

const APP_ROLE = 'fms_app_probe';
const APP_PASSWORD = 'probe';

let container: StartedPostgreSqlContainer;
let closeOwner: () => Promise<void>;
let closeApp: () => Promise<void>;
let owner: SqlExecutor;
let app: SqlExecutor;
let world: WorldDbHandle;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:18')
    .withDatabase('fms_test')
    .withUsername('fms')
    .withPassword('fms')
    .start();

  const ownerHandle = createPostgresExecutor(container.getConnectionUri());
  owner = ownerHandle.executor;
  closeOwner = async (): Promise<void> => {
    await ownerHandle.close();
  };

  // Şemayı SAHİP rol kurar — migration ayrıcalıklı yoldur ve öyle kalmalı.
  await migrateUp({ executor: owner, source: createFileMigrationSource(DRIZZLE_DIR), logger });

  // Uygulama rolü: yalnızca okuma.
  await owner.run(`
    CREATE ROLE ${APP_ROLE} LOGIN PASSWORD '${APP_PASSWORD}';
    GRANT USAGE ON SCHEMA public TO ${APP_ROLE};
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${APP_ROLE};
  `);

  const url = new URL(container.getConnectionUri());
  url.username = APP_ROLE;
  url.password = APP_PASSWORD;
  world = createWorldDb(container.getConnectionUri());

  const appHandle = createPostgresExecutor(url.toString());
  app = appHandle.executor;
  closeApp = async (): Promise<void> => {
    await appHandle.close();
  };
}, 180_000);

afterAll(async () => {
  await world.close();
  await closeApp();
  await closeOwner();
  await container.stop();
}, 60_000);

describe('master salt-okunurluğu — veritabanı rolü (BORÇ-007 mekanizma kanıtı)', () => {
  it('uygulama rolü master tabloyu OKUYABİLİR', async () => {
    const rows = await app.rows<{ n: number | string }>(
      `SELECT count(*)::int AS n FROM "countries"`,
    );
    expect(Number(rows[0]?.n)).toBe(0);
  });

  // ⚠️ ASIL KANIT: tip sistemi burada YOK — bu ham SQL. Yine de reddediliyor.
  it.each([
    ['INSERT', countryInsertSql([{ key: 'x', code: 'XXX' }])],
    ['UPDATE', `UPDATE "countries" SET "name_key" = 'y'`],
    ['DELETE', `DELETE FROM "countries"`],
  ])('uygulama rolü %s yapamaz — ham SQL bile reddediliyor', async (_name, statement) => {
    await expect(app.run(statement)).rejects.toThrow(/permission denied/i);
  });

  // Karşı örnek: reddin ROLE bağlı olduğunu, tabloya değil, gösteriyor.
  // Bu olmadan "hiç kimse yazamıyor" durumundan ayırt edilemezdi (D3, iki yönlü nöbetçi).
  it('SAHİP rol aynı tabloya yazabiliyor — kısıt role bağlı', async () => {
    await owner.run(countryInsertSql([{ key: 'turkiye', code: 'TUR' }]));
    const rows = await owner.rows<{ n: number | string }>(
      `SELECT count(*)::int AS n FROM "countries"`,
    );
    expect(Number(rows[0]?.n)).toBe(1);
    await owner.run(`DELETE FROM "countries"`);
  });
});

/**
 * D5 — `createWorldDb` GERÇEKTEN çalışıyor mu.
 *
 * Tip seviyesi koruması `master-write-control.test-d.ts` ile kanıtlandı, ama o
 * kanıt yalnızca DERLEME zamanına ait: fabrikanın çalışma zamanında bir bağlantı
 * kurup sorgu döndürdüğünü göstermiyor. Tüketicisi olmayan bir fabrika, hiç
 * koşulmamış kod demektir (Faz 2 §5 **D5**).
 */
describe('createWorldDb — çalışma zamanı (D5)', () => {
  it('master istemcisi gerçek bir sorgu döndürüyor', async () => {
    const rows = await world.master.select().from(countries);
    expect(Array.isArray(rows)).toBe(true);
  });

  it('writable istemcisi de okuyabiliyor — aynı bağlantı, dar yazma yüzeyi', async () => {
    const rows = await world.writable.select().from(countries);
    expect(Array.isArray(rows)).toBe(true);
  });
});
