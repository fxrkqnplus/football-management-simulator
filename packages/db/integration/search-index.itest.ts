/**
 * TÜRKÇE ARAMA İNDEKSİ — Faz 3.7.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN AYRI BİR DOSYA
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `round-trip` migration'ın doğruluğunu, `schema-constraints` şemanın neyi
 * reddettiğini sınıyor. Burada üçüncü bir soru var: **indeks işe yarıyor mu.**
 * Bir indeksin `pg_indexes`te görünmesi kullanıldığını göstermez — PostgreSQL
 * küçük tablolarda ardışık taramayı tercih eder ve sorgu ifadesi indeks
 * ifadesinden bir karakter bile ayrılırsa indeks **sessizce** devre dışı kalır.
 * Bu, D3'ün ta kendisi: *"bir kapının 'temiz' demesi baktığını göstermez."*
 *
 * ⚠️ **`EXPLAIN ANALYZE` PERFORMANS İDDİASI BURADA YOK.** *"< 20 ms"* Faz 3'ün
 * 4. kabul kriteri ve **3.9'un işi** (seed verisiyle). Buradaki tek soru
 * *"planlayıcı indeksi SEÇİYOR mu"* — süre değil, plan.
 */
import { fileURLToPath } from 'node:url';

import { createNoopLogger } from '@fms/shared';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { SqlExecutor } from '../src/migrate/executor.js';
import { createFileMigrationSource } from '../src/migrate/file-source.js';
import { createPostgresExecutor } from '../src/migrate/postgres-executor.js';
import { migrateUp } from '../src/migrate/runner.js';
import {
  IMMUTABLE_UNACCENT_FN,
  REQUIRED_EXTENSIONS,
  searchNormalizedSql,
} from '../src/schema/search.js';
import { countryInsertSql, stadiumInsertSql } from './fixtures.js';

const logger = createNoopLogger();
const DRIZZLE_DIR = fileURLToPath(new URL('../drizzle', import.meta.url));

/** Planlayıcının GIN indeksini seçmesi için yeterli satır. */
const CLUB_ROWS = 3_000;

let container: StartedPostgreSqlContainer;
let close: () => Promise<void>;
let executor: SqlExecutor;

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

  await executor.run(countryInsertSql([{ key: 'turkiye', code: 'TUR' }]));
  await executor.run(stadiumInsertSql([{ key: 'arama-stadi' }]));
  // Gerçekçi hacim: ROADMAP Faz 8 ~118 kulüp diyor, ama planlayıcıyı ardışık
  // taramadan vazgeçirmek için daha fazlası gerekiyor. Sayı bir performans
  // iddiası DEĞİL — yalnızca planın anlamlı olmasını sağlıyor.
  await executor.run(`
    INSERT INTO "clubs"
      ("key","source","external_ids","country_id","name","short_name","abbreviation","city",
       "stadium_id","reputation","color_primary","color_secondary","crest_seed",
       "supporter_count","supporter_expectation","is_national")
    SELECT 'kulup-'||g,'procedural','{}'::jsonb, c."id", 'Kulup '||g, 'K'||g, 'K'||lpad(g::text,2,'0'),
           'Şehir', s."id", 100, '#000000', '#FFFFFF', g, 1000, 50, false
      FROM generate_series(1, ${String(CLUB_ROWS)}) g, "countries" c, "stadiums" s
     WHERE c."code" = 'TUR' AND s."key" = 'arama-stadi'
  `);
  await executor.run(`
    INSERT INTO "clubs"
      ("key","source","external_ids","country_id","name","short_name","abbreviation","city",
       "stadium_id","reputation","color_primary","color_secondary","crest_seed",
       "supporter_count","supporter_expectation","is_national")
    SELECT 'besiktas','pack','{}'::jsonb, c."id", 'Beşiktaş', 'Beşiktaş', 'BJK',
           'İstanbul', s."id", 145, '#000000', '#FFFFFF', 1, 15000000, 80, false
      FROM "countries" c, "stadiums" s WHERE c."code" = 'TUR' AND s."key" = 'arama-stadi'
  `);
  await executor.run(`ANALYZE "clubs"`);
}, 180_000);

afterAll(async () => {
  await close();
  await container.stop();
}, 60_000);

/** İndeks ifadesiyle BİREBİR aynı — ayrışırsa planlayıcı indeksi seçmez. */
const NORMALIZED_NAME = searchNormalizedSql('"name"');

describe('uzantılar ve sarmalayıcı kuruldu', () => {
  it('iki uzantı da mevcut', async () => {
    const rows = await executor.rows<{ extname: string; extversion: string }>(
      `SELECT extname, extversion FROM pg_extension ORDER BY extname`,
    );
    const installed = rows.map((row) => row.extname);
    for (const required of REQUIRED_EXTENSIONS) expect(installed).toContain(required);
  });

  /**
   * ⚠️ SARMALAYICI `IMMUTABLE` İŞARETLİ VE BU BİR İDDİA.
   *
   * Gerçekte `unaccent` `STABLE`; sözlüğü (`unaccent.rules`) bir majör
   * yükseltmede değişebilir ve indeks eski normalleştirmeyle kalır. Bu test o
   * riski **gürültülüye çeviriyor**: sözlük değişirse burada kırılır ve hata
   * dağıtımdan önce görülür.
   */
  it('sarmalayıcı IMMUTABLE işaretli — indeks ifadesi bunu ZORUNLU kılıyor', async () => {
    const rows = await executor.rows<{ volatility: string; wrapper: string }>(`
      SELECT provolatile AS volatility, proname AS wrapper
        FROM pg_proc WHERE proname = '${IMMUTABLE_UNACCENT_FN}'
    `);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.volatility).toBe('i');

    // KARŞI ÖRNEK: sarmaladığı fonksiyon `IMMUTABLE` DEĞİL — iddianın neden
    // gerekli olduğu ve neden bir bedel taşıdığı burada görülüyor.
    const source = await executor.rows<{ volatility: string }>(
      `SELECT provolatile AS volatility FROM pg_proc WHERE proname = 'unaccent'`,
    );
    expect(source.length).toBeGreaterThan(0);
    for (const row of source) expect(row.volatility).toBe('s');
  });

  /**
   * SÖZLÜK NÖBETÇİSİ — çıktı sabitleniyor.
   *
   * `unaccent.rules` değişirse bu iddia kırılır. Kırılırsa yapılacak şey
   * `REINDEX` (migration başlığında yazılı), ama **önce burada görülür**.
   */
  it.each([
    ['Beşiktaş', 'Besiktas'],
    ['Fenerbahçe', 'Fenerbahce'],
    ['Göztepe', 'Goztepe'],
    ['Şanlıurfaspor', 'Sanliurfaspor'],
    ['Ümraniyespor', 'Umraniyespor'],
    ['İstanbul', 'Istanbul'],
  ])('sarmalayıcı %s → %s', async (input, expected) => {
    const rows = await executor.rows<{ out: string }>(
      `SELECT ${IMMUTABLE_UNACCENT_FN}('${input}') AS out`,
    );
    expect(rows[0]?.out).toBe(expected);
  });
});

describe('Faz 8 kabul kriteri — `besiktas` → `Beşiktaş`', () => {
  /**
   * ⚠️ NEGATİF/KONTROL — DÜZ `pg_trgm` BUNU SAĞLAMIYOR.
   *
   * Bu satır olmadan aşağıdaki pozitif test *"pg_trgm zaten çalışıyordu"* diye
   * okunabilirdi ve `unaccent` katmanının varlık sebebi görünmez olurdu.
   * Ölçüm 3.1'de alınmıştı; burada **koşar hâlde** duruyor.
   */
  it('KONTROL: normalleştirmesiz benzerlik eşiğin ALTINDA kalıyor', async () => {
    const rows = await executor.rows<{ sim: string; matched: boolean; threshold: string }>(
      `SELECT round(similarity('Beşiktaş','besiktas')::numeric, 4)::text AS sim,
              ('Beşiktaş' % 'besiktas')                                  AS matched,
              show_limit()::text                                          AS threshold`,
    );
    expect(rows[0]?.sim).toBe('0.2857');
    expect(rows[0]?.matched).toBe(false);
    expect(rows[0]?.threshold).toBe('0.3');
  });

  it('normalleştirmeyle benzerlik 1,0 ve eşleşiyor', async () => {
    const rows = await executor.rows<{ sim: string; matched: boolean }>(
      `SELECT round(similarity(${IMMUTABLE_UNACCENT_FN}(lower('Beşiktaş')),
                               ${IMMUTABLE_UNACCENT_FN}(lower('besiktas')))::numeric, 4)::text AS sim,
              (${IMMUTABLE_UNACCENT_FN}(lower('Beşiktaş'))
                 % ${IMMUTABLE_UNACCENT_FN}(lower('besiktas')))                                AS matched`,
    );
    expect(rows[0]?.sim).toBe('1.0000');
    expect(rows[0]?.matched).toBe(true);
  });

  it('gerçek tabloda ASCII sorgu Türkçe adı BULUYOR', async () => {
    const rows = await executor.rows<{ name: string }>(
      `SELECT "name" FROM "clubs" WHERE ${NORMALIZED_NAME} % 'besiktas'`,
    );
    expect(rows.map((row) => row.name)).toEqual(['Beşiktaş']);
  });
});

describe('⚠️ İNDEKSİN VARLIĞI YETMEZ — PLANLAYICI ONU SEÇİYOR MU (D3)', () => {
  async function planFor(whereSql: string): Promise<string> {
    const rows = await executor.rows<{ 'QUERY PLAN': string }>(
      `EXPLAIN (COSTS OFF) SELECT "id" FROM "clubs" WHERE ${whereSql}`,
    );
    return rows.map((row) => row['QUERY PLAN']).join('\n');
  }

  it('trigram sorgusu GIN indeksini kullanıyor', async () => {
    const plan = await planFor(`${NORMALIZED_NAME} % 'besiktas'`);
    expect(plan).toContain('clubs_name_trgm_idx');
    expect(plan).toContain('Bitmap Index Scan');
  });

  /**
   * ⚠️ EN ÖNEMLİ NEGATİF TEST — İFADE AYRIŞIRSA İNDEKS SESSİZCE DEVRE DIŞI.
   *
   * `lower()` atlanmış bir sorgu **doğru cevabı vermeye devam edebilir** ama
   * indeksi kullanamaz: sonuç doğru, performans çöker ve hiçbir şey ötmez.
   * Bu yüzden ifade `search.ts`te **tek bir yerde** üretiliyor ve sorgu tarafı
   * oradan okuyor.
   */
  it('KONTROL: ifade AYRIŞIRSA indeks kullanılmıyor', async () => {
    const plan = await planFor(`${IMMUTABLE_UNACCENT_FN}("name") % 'besiktas'`);
    expect(plan).not.toContain('clubs_name_trgm_idx');
    expect(plan).toContain('Seq Scan');
  });

  it('FK indeksleri de seçiliyor — `ON DELETE RESTRICT` denetiminin taşıyıcısı', async () => {
    const plan = await planFor(`"competition_id" = 1`);
    expect(plan).toContain('clubs_competition_id_idx');
  });

  it('dört indeksin dördü de gerçekten yaratıldı', async () => {
    const rows = await executor.rows<{ indexname: string }>(`
      SELECT indexname FROM pg_indexes
       WHERE schemaname = 'public' AND indexname LIKE '%_idx'
       ORDER BY indexname
    `);
    expect(rows.map((row) => row.indexname)).toEqual([
      'clubs_competition_id_idx',
      'clubs_name_trgm_idx',
      'competitions_country_id_idx',
      'rivalries_pair_unique_idx',
    ]);
  });
});
