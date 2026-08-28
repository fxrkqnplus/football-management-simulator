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
 * ⚠️ **3.7'DE BURADA PERFORMANS İDDİASI YOKTU** — tek soru *"planlayıcı indeksi
 * SEÇİYOR mu"* idi. **Faz 3.9 dosyanın sonuna İDDİA B'yi ekledi:** indeksin
 * *gerekçesi*, yani sentetik hacimde süre ve indekssiz karşılaştırma.
 *
 * ⚠️ **Kabul kriteri 4 (*"< 20 ms **seed verisiyle**"*) BURADA DEĞİL.** O,
 * `tools/data-cli/integration/seed-query-performance.itest.ts`te — seed
 * `@fms/data-cli`de ve `packages/db` onu import **edemez** (`arch:check` ①).
 * İki dosya iki ayrı iddia taşıyor ve birleştirilmeleri, ölçülmemiş bir hacmi
 * ölçülmüş gibi gösterirdi.
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

  /**
   * ⚠️ **PLAN SEÇİMİ HACME DEĞİL, SEÇİCİLİĞE BAĞLI — 3.9'da ölçüldü.**
   *
   * Yukarıdaki test `'besiktas'` arıyor ve **tek** satır eşleşiyor. Aynı
   * tabloda, aynı hacimde (3.001 satır), **çok** satırla eşleşen bir terim
   * arandığında planlayıcı GIN indeksini **bırakıyor** ve Seq Scan seçiyor —
   * ve haklı: eşleşen satırların çoğunu okuyacaksa indeks üzerinden gitmek
   * fazladan iş olur.
   *
   * Bu satır olmadan *"3.000 satırda indeks kullanılıyor"* cümlesi **hacme**
   * bağlı bir kural gibi okunurdu. Değil.
   */
  it('KONTROL: aynı hacimde SEÇİCİ OLMAYAN terim indeksi kullanmıyor', async () => {
    // `kulup1234` üretilmiş 3.000 `Kulup N` adının hepsiyle trigram paylaşıyor.
    const plan = await planFor(`${NORMALIZED_NAME} % 'kulup1234'`);
    expect(plan).toContain('Seq Scan');
    expect(plan).not.toContain('clubs_name_trgm_idx');
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

/**
 * ────────────────────────────────────────────────────────────────────────────
 * İDDİA B — İNDEKSİN GEREKÇESİ (Faz 3.9). Kabul kriterini KAPATMAZ.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Kriter 4 *"seed verisiyle"* diyor ve seed hacminde (6 ülke + 11 yarışma,
 * `clubs` **boş**) her sorgu zaten mikrosaniyeler sürüyor — orada bir süre
 * ölçmek indeks hakkında **hiçbir şey** söylemez. O ölçüm İDDİA A ve ayrı
 * dosyada. Burada sorulan şey farklı: **bu indeksler neden var?**
 *
 * Cevap bir karşılaştırma: aynı sorgu, aynı veri, indeksli ve indekssiz.
 * Tek bir süre sayısı bunu gösteremez — 0,9 ms "hızlı" mı? Neye göre?
 *
 * ⚠️ **ÖLÇÜM ARACININ KENDİSİ DOĞRULANDI (D2).** 3.9'da üç tuzak ölçüldü:
 * ① **soğuk koşu** — ilk ve beşinci koşu arasında anlamlı fark **çıkmadı**
 *   (0,059 → 0,055 ms); veri shared buffers'a hemen giriyor. Yine de ısıtma
 *   koşusu yapılıyor, çünkü yokluğunun zararsız olduğu **bu hacimde** ölçüldü.
 * ② **`TIMING ON` enstrümantasyonu** — `TIMING OFF` ile fark **yok**
 *   (0,050–0,054 ms her ikisinde); yani ölçülen şey ölçümün kendisi değil.
 * ③ **`ANALYZE` yapılmamış tablo** — bu, üçünün içinde **tek gerçek tuzak**
 *   çıktı ve yönü tehlikeli: istatistiksiz planlayıcı dört sorgunun
 *   **dördünde de** indeksi seçiyor, `ANALYZE` sonrası dördü de Seq Scan'e
 *   düşüyor. Yani ölçüm `ANALYZE`sız alınsaydı *"indeksler kullanılıyor"*
 *   diye **yanlış ama gurur verici** bir sonuç yazılırdı. `beforeAll`
 *   `ANALYZE "clubs"` çalıştırıyor ve bu satır bir konfor değil, **şart**.
 */
describe('İDDİA B — indeksin gerekçesi: indeksli vs indekssiz, 3.001 satır', () => {
  /** Isıtma koşusundan sonra `Execution Time`ı ms cinsinden döner. */
  /**
   * ⚠️ `SET LOCAL` AYRI BİR ÇAĞRI — aynı ifadeye eklenemez.
   *
   * 3.9'da ölçüldü: `postgres.js` `unsafe()`e çok ifadeli bir dize verildiğinde
   * dönen şekil tek ifadelidekinden **farklı** ve `rows[0]['QUERY PLAN']`
   * `undefined` geliyor. Belirti yanıltıcıydı — bir tip hatası gibi göründü,
   * oysa sebep sürücünün çok-ifade davranışı. `run()` + `rows()` ayrımı hem
   * çalışıyor hem niyeti görünür kılıyor.
   */
  async function withIndexesDisabled(tx: SqlExecutor): Promise<void> {
    await tx.run('SET LOCAL enable_indexscan = off');
    await tx.run('SET LOCAL enable_bitmapscan = off');
  }

  async function executionTimeMs(sql: string, disableIndexes = false): Promise<number> {
    // ⚠️ İşlem içinde: `SET LOCAL` işlem bitince kendiliğinden geri alınır.
    // Oturum düzeyinde `SET` bırakılsaydı SONRAKİ testler indekssiz koşardı ve
    // bozulma sessiz olurdu.
    return executor.transaction(async (tx) => {
      if (disableIndexes) await withIndexesDisabled(tx);

      const explain = `EXPLAIN (ANALYZE, TIMING ON, FORMAT JSON) ${sql}`;
      // Isıtma — ölçülmüyor.
      await tx.rows(explain);

      const rows = await tx.rows<{ 'QUERY PLAN': { 'Execution Time': number }[] }>(explain);
      const time = rows[0]?.['QUERY PLAN'][0]?.['Execution Time'];
      expect(typeof time).toBe('number');
      return time ?? Number.NaN;
    });
  }

  const SEARCH = `SELECT "id" FROM "clubs" WHERE ${NORMALIZED_NAME} % 'besiktas'`;

  it('Türkçe arama indeksle 20 ms bütçesinin ALTINDA', async () => {
    const withIndex = await executionTimeMs(SEARCH);
    expect(withIndex).toBeLessThan(20);
  });

  it('⚠️ İNDEKSSİZ AYNI SORGU DAHA YAVAŞ — indeksin var olma sebebi ÖLÇÜLDÜ', async () => {
    // Tek başına bir süre sayısı hiçbir şey kanıtlamaz. Karşılaştırma kanıtlar.
    // Yerelde ölçüldü (PG 18.6, 3.001 satır): indeksli 0,92 ms · indekssiz
    // 6,13 ms. Oran makineye göre değişir; iddia edilen şey **yön**.
    const withIndex = await executionTimeMs(SEARCH);
    const withoutIndex = await executionTimeMs(SEARCH, true);

    expect(withoutIndex).toBeGreaterThan(withIndex);
  });

  it('KONTROL: indeks kapatma gerçekten Seq Scan`e düşürüyor', async () => {
    // Yukarıdaki karşılaştırma, `SET LOCAL` hiçbir şey yapmasaydı da "geçebilir"
    // görünürdü (iki ölçüm arasındaki gürültü). Bu test kapatmanın GERÇEKTEN
    // planı değiştirdiğini sabitliyor — nöbetçinin nöbetçisi.
    const plan = await executor.transaction(async (tx) => {
      await withIndexesDisabled(tx);
      const rows = await tx.rows<{ 'QUERY PLAN': string }>(`EXPLAIN (COSTS OFF) ${SEARCH}`);
      return rows.map((row) => row['QUERY PLAN']).join('\n');
    });

    expect(plan).toContain('Seq Scan');
    expect(plan).not.toContain('clubs_name_trgm_idx');
  });

  it('`SET LOCAL` sızmadı — sonraki sorgu indeksi yine kullanıyor', async () => {
    // İşlem dışında plan normale dönmüş olmalı; dönmediyse bu dosyadaki
    // önceki plan testleri bundan sonra yanlış sebeple geçerdi.
    const rows = await executor.rows<{ 'QUERY PLAN': string }>(`EXPLAIN (COSTS OFF) ${SEARCH}`);
    expect(rows.map((row) => row['QUERY PLAN']).join('\n')).toContain('clubs_name_trgm_idx');
  });
});
