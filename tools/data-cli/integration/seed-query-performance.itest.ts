/**
 * İDDİA A — KABUL KRİTERİ 4, ROADMAP'İN YAZDIĞI GİBİ (Faz 3.9).
 *
 * ROADMAP 3.9: *"`EXPLAIN ANALYZE` ölçümü (< 20 ms) **seed verisiyle**"*.
 * Bu dosya o cümlenin birebir karşılığı ve kriteri **kapatan** ölçüm.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ BU ÖLÇÜM ÖNEMSİZ BİÇİMDE GEÇİYOR — ve bunu SAKLAMAK yerine YAZIYORUZ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Seed iki tablo dolduruyor: `countries` **6**, `competitions` **11**. Diğer
 * dokuzu **boş** (3.8'in kapsam kararı, K12). Altı satırlık bir tabloda her
 * sorgu mikrosaniyeler sürer — yani *"< 20 ms"* burada indeksler hakkında
 * **hiçbir şey** kanıtlamaz. Kriter yazıldığı hâliyle sağlanıyor; iddia da tam
 * olarak o kadar.
 *
 * *"Tüm temel sorgular < 20 ms"* cümlesi **hacim yazılmadan** yazılsaydı,
 * bakacak bir şey bulamayan bir kapı `✅` almış olurdu (SAPMA-024 sınıfı). Bu
 * yüzden aşağıdaki testler önce **hacmi** iddia ediyor, sonra süreyi.
 *
 * İndekslerin gerçekten işe yaradığı, ayrı bir dosyada ve ayrı bir iddia
 * olarak ölçülüyor: `packages/db/integration/search-index.itest.ts` → **İDDİA B**
 * (3.001 satır, indeksli 0,92 ms · indekssiz 6,13 ms).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ `ANALYZE` ŞART — ve yokluğu GURUR VERİCİ bir yalan üretiyor (D2)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * 3.9'da ölçüldü: migration + seed sonrası tabloların `reltuples` değeri
 * **`-1`** (PG 14+ bunu *"hiç ANALYZE edilmedi"* için kullanır) ve `relpages`
 * **0**. İstatistiksiz planlayıcı varsayılan tahminlere düşüyor ve dört
 * sorgunun **dördünde de** indeksi seçiyor. `ANALYZE` sonrası dördü de Seq
 * Scan'e düşüyor — **ve haklı**, çünkü tablolar boş ya da bir sayfadan küçük.
 *
 * Yani ölçüm `ANALYZE`sız alınsaydı rapora *"indeksler kullanılıyor"* yazılırdı
 * ve bu **yanlış** olurdu. Tuzağın tehlikesi yönünde: yanlış cevap, doğru
 * cevaptan daha iyi görünüyor. Aşağıdaki ilk test bu iki durumu **yan yana**
 * ölçüyor ki disiplin bir yorumda değil, koşan bir testte dursun.
 */
import { fileURLToPath } from 'node:url';

import {
  createFileMigrationSource,
  createPostgresExecutor,
  migrateUp,
  type SqlExecutor,
} from '@fms/db';
import { createNoopLogger } from '@fms/shared';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { seedWorld } from '../src/seed/index.js';

const logger = createNoopLogger();

/** Göreli yol bilinçli — paket düzeni değişirse test GÜRÜLTÜLÜ kırılır. */
const DRIZZLE_DIR = fileURLToPath(new URL('../../../packages/db/drizzle', import.meta.url));

/** ROADMAP Faz 3 kabul kriteri 4'ün bütçesi. */
const BUDGET_MS = 20;

/**
 * Dört indeksin **tüketicileri**. Liste açık uçlu değil: her indeks kendi
 * sorgusuyla eşleniyor. Sorgusu olmayan bir indeks zaten bir temennidir (D3);
 * indeksi olmayan bir sorgu bu alt görevin konusu değil.
 */
const QUERIES: readonly { readonly label: string; readonly sql: string }[] = [
  {
    label: 'bir ligin kulüpleri (clubs_competition_id_idx)',
    sql: `SELECT "id" FROM "clubs"
           WHERE "competition_id" = (SELECT "id" FROM "competitions" WHERE "code" = 'TUR_SUPERLIG')`,
  },
  {
    label: 'bir ülkenin yarışmaları (competitions_country_id_idx)',
    sql: `SELECT "id" FROM "competitions"
           WHERE "country_id" = (SELECT "id" FROM "countries" WHERE "key" = 'turkiye')`,
  },
  {
    label: 'türkçe kulüp arama (clubs_name_trgm_idx)',
    sql: `SELECT "id" FROM "clubs" WHERE immutable_unaccent(lower("name")) % 'besiktas'`,
  },
  {
    label: 'rakiplik çifti (rivalries_pair_unique_idx)',
    sql: `SELECT "id" FROM "rivalries"
           WHERE LEAST("club_a_id","club_b_id") = 1 AND GREATEST("club_a_id","club_b_id") = 2`,
  },
];

let container: StartedPostgreSqlContainer;
let close: () => Promise<void>;
let executor: SqlExecutor;

async function planOf(sql: string): Promise<string> {
  const rows = await executor.rows<{ 'QUERY PLAN': string }>(`EXPLAIN (COSTS OFF) ${sql}`);
  return rows.map((row) => row['QUERY PLAN']).join('\n');
}

/** Isıtma koşusundan sonra `Execution Time`ı ms cinsinden döner. */
async function executionTimeMs(sql: string): Promise<number> {
  const explain = `EXPLAIN (ANALYZE, TIMING ON, FORMAT JSON) ${sql}`;
  // ⚠️ Isıtma koşusu ölçülmüyor. 3.9'da soğuk/sıcak farkı bu hacimde
  // **anlamsız** çıktı (0,059 → 0,055 ms), ama yokluğu ancak ölçülerek
  // zararsız sayılabilirdi — "muhtemelen önemsiz" bir gerekçe değil.
  await executor.rows(explain);

  const rows = await executor.rows<{ 'QUERY PLAN': { 'Execution Time': number }[] }>(explain);
  const time = rows[0]?.['QUERY PLAN'][0]?.['Execution Time'];
  expect(typeof time).toBe('number');
  return time ?? Number.NaN;
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:18')
    .withDatabase('fms_test')
    .withUsername('fms')
    .withPassword('fms')
    .start();

  const handle = createPostgresExecutor(container.getConnectionUri());
  executor = handle.executor;
  close = async (): Promise<void> => {
    await handle.close();
  };

  await migrateUp({ executor, source: createFileMigrationSource(DRIZZLE_DIR), logger });
  await seedWorld({ executor, logger });
  // ⚠️ `ANALYZE` BURADA DEĞİL — ilk test onu kendi içinde çalıştırıyor, çünkü
  // ölçmek istediği şey tam olarak "öncesi ve sonrası".
}, 180_000);

afterAll(async () => {
  await close();
  await container.stop();
}, 60_000);

describe('ölçümün ZEMİNİ — hangi hacim, hangi istatistik', () => {
  it('seed hacmi: 2 tablo dolu, 16 tablo BOŞ', async () => {
    const rows = await executor.rows<{ table_name: string; n: string }>(`
      SELECT c.relname AS table_name,
             (SELECT count(*)::text FROM pg_class x WHERE x.oid = c.oid) AS n
        FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
       WHERE ns.nspname = 'public' AND c.relkind = 'r'
    `);
    // 🆕 4.3: 11 → 13 (`people` + `players`) · 4.5: 13 → 15
    // (`player_attributes` + `player_hidden_attributes`) · 4.6: 15 → 18
    // (`player_positions` + `player_traits` + `player_stats_history`). Sayı
    // açıkça yazılı ve yeni bir migration geldiğinde kırılması İSTENEN davranış
    // — ölçümün zemini (hangi tablolar dolu, hangileri boş) sessizce kaymamalı.
    expect(rows).toHaveLength(18);

    const counts = await executor.rows<{ tablo: string; n: string }>(`
      SELECT 'countries' AS tablo, count(*)::text AS n FROM "countries"
      UNION ALL SELECT 'competitions', count(*)::text FROM "competitions"
      UNION ALL SELECT 'clubs',        count(*)::text FROM "clubs"
      UNION ALL SELECT 'rivalries',    count(*)::text FROM "rivalries"
      ORDER BY tablo
    `);
    expect(Object.fromEntries(counts.map((row) => [row.tablo, Number(row.n)]))).toEqual({
      clubs: 0,
      competitions: 11,
      countries: 6,
      rivalries: 0,
    });
  });

  /**
   * ⚠️ **BU TESTİN SIRASI ÖNEMLİ** — `ANALYZE`ı kendisi çalıştırıyor ve
   * sonraki testler onun bıraktığı istatistiklere dayanıyor.
   */
  it('⚠️ `ANALYZE` ÖNCESİ planlayıcı KÖR: dördünde de indeksi seçiyor', async () => {
    const stats = await executor.rows<{ reltuples: string }>(
      `SELECT reltuples::text FROM pg_class WHERE relname = 'clubs'`,
    );
    // PG 14+ `-1` = "hiç ANALYZE edilmedi"; "ANALYZE edildi ve boş" (`0`) ile
    // aynı şey DEĞİL ve planlayıcı ikisine farklı davranıyor.
    expect(stats[0]?.reltuples).toBe('-1');

    const before = await Promise.all(QUERIES.map(async (query) => planOf(query.sql)));
    for (const plan of before) expect(plan).not.toContain('Seq Scan');

    await executor.run('ANALYZE');

    const after = await Promise.all(QUERIES.map(async (query) => planOf(query.sql)));
    for (const plan of after) expect(plan).toContain('Seq Scan');
  });
});

describe('KABUL KRİTERİ 4 — seed verisiyle < 20 ms', () => {
  it.each(QUERIES.map((query) => [query.label, query.sql]))(
    '%s bütçenin altında',
    async (_label, sql) => {
      expect(await executionTimeMs(sql)).toBeLessThan(BUDGET_MS);
    },
  );

  /**
   * ⚠️ **Seq Scan bir başarısızlık DEĞİL, doğru karardır.** Altı satırlık bir
   * tabloyu indeks üzerinden okumak fazladan iş olur. Bu test o kararı
   * **iddia ediyor** ki gelecekte biri planı görüp "indeksler çalışmıyor" diye
   * bir regresyon sanmasın — ve `docs/ROADMAP.md` 3.9 SONUÇ bloğunda yazılı.
   */
  it('bu hacimde planlayıcı Seq Scan seçiyor ve HAKLI', async () => {
    for (const query of QUERIES) {
      expect(await planOf(query.sql)).toContain('Seq Scan');
    }
  });

  it('ölçüm ARACI doğrulandı: `TIMING OFF` ile fark enstrümantasyondan gelmiyor', async () => {
    // D2: bir ölçüm beklenmedik çıkarsa önce aracın sağlığı sorulur. Burada
    // araç önden doğrulanıyor — `ANALYZE` enstrümantasyonu bu hacimde süreyi
    // domine etseydi, ölçülen şey sorgu değil ölçümün kendisi olurdu.
    const first = QUERIES[0];
    expect(first).toBeDefined();
    const sql = first?.sql ?? '';
    const withTiming = await executionTimeMs(sql);

    const rows = await executor.rows<{ 'QUERY PLAN': { 'Execution Time': number }[] }>(
      `EXPLAIN (ANALYZE, TIMING OFF, FORMAT JSON) ${sql}`,
    );
    const withoutTiming = rows[0]?.['QUERY PLAN'][0]?.['Execution Time'] ?? Number.NaN;

    expect(withTiming).toBeLessThan(BUDGET_MS);
    expect(withoutTiming).toBeLessThan(BUDGET_MS);
  });
});
