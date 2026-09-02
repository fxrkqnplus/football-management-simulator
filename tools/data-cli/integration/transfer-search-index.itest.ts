/**
 * İDDİA B — İNDEKSİN GEREKÇESİ (Faz 4.10). KABUL KRİTERİNİ **KAPATMAZ**.
 *
 * ROADMAP 4.10: *"**A** = 5.000 (kriteri kapatır) / **B** = sentetik hacim
 * (indeksin gerekçesi)"*. A ayrı bir dosyada
 * (`transfer-search-criterion.itest.ts`) ve orada ölçülen şey **bütçe**;
 * burada sorulan şey farklı: **`0011`in iki indeksi neden var?**
 *
 * Cevap bir karşılaştırma: aynı sorgu, aynı veri, indeksli ve indekssiz.
 * Tek bir süre sayısı bunu gösteremez — 2,2 ms *"hızlı"* mı? Neye göre?
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ 3.9'UN `search-index.itest.ts` DESENİ KOPYALANMADI, **UYARLANDI** — fark:
 * ────────────────────────────────────────────────────────────────────────────
 *
 * | | 3.9 (İDDİA B) | 4.10 (bu dosya) |
 * |---|---|---|
 * | Yer | `packages/db/integration/` | **`tools/data-cli/integration/`** |
 * | Sabitler | yerel | **`SEED_REFERENCE_DATE` paylaşılıyor** |
 * | İndeks | tek (GIN, `clubs`) | **iki** (`players` bileşik + `people` tarih) |
 * | Sorgu | tek tablo | **JOIN** — iki taraf ayrı ayrı karar alıyor |
 *
 * Yer farkının sebebi **yapısal**: yaş yükleminin tarihe çevrimi
 * `ageRangeToBirthDateRange` + `SEED_REFERENCE_DATE` çiftiyle yapılıyor ve o
 * sabit `tools/data-cli`de yaşıyor (`packages/db` onu import **edemez** —
 * katman yönü). İkinci bir referans tarihi yazmak, `transfer-search.ts`
 * başlığının adıyla yasakladığı şey olurdu: *"çevrimin kendisi bir ifadedir ve
 * iki yerde yazılırsa sessizce ayrışır."*
 *
 * ⚠️ **VE 4.9'UN ENVANTER NÖBETÇİSİ GEVŞETİLMEDİ.**
 * `seed-query-performance.itest.ts` *"4 tablo dolu, 18 tablo BOŞ"* diye **tam
 * bir envanter** iddia ediyor ve o nöbetçi 4.9'da tam olarak *"yeni bir tablo
 * dolduğu gün öter"* diye yazıldı. Bu dosyanın sentetik satırları oraya
 * girseydi **öterdi — ve haklı olarak**. Çözüm nöbetçiyi gevşetmek değil
 * (D6: *"önce hangisinin yanlış olduğunu sor"* — cevap: nöbetçi doğru):
 * **ayrı dosya → ayrı konteyner → ayrı veritabanı.** Bedeli ~6 sn konteyner
 * açılışı; karşılığı, iki ölçümün birbirinin verisini hiç görmemesi.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * HACİM ARANDI, TAHMİN EDİLMEDİ — ve merdivenin sonucu ŞAŞIRTICI ÇIKTI
 * ────────────────────────────────────────────────────────────────────────────
 *
 * 3.9'un *"3.001"*i **oradaki** indeks ve **oradaki** seçicilik içindi; buraya
 * kopyalanamazdı. Yedi kademeli bir merdiven koşturuldu (aynı üretim, her
 * kademede `ANALYZE`, beş örneklem medyanı):
 *
 * | Hacim | Eşleşen | Bileşik idx? | Tarih idx? | İndeksli | İndekssiz | Oran |
 * |---|---|---|---|---|---|---|
 * | 1.000 | 2 (%0,20) | ✅ | ✅ | 0,062 ms | 0,128 ms | 2,06× |
 * | 2.500 | 5 (%0,20) | ✅ | ✅ | 0,112 ms | 0,297 ms | 2,65× |
 * | 5.000 | 17 (%0,34) | ✅ | ✅ | 0,200 ms | 0,595 ms | 2,97× |
 * | 10.000 | 34 (%0,34) | ✅ | ✅ | 0,408 ms | 1,262 ms | 3,09× |
 * | 25.000 | 89 (%0,36) | ✅ | ✅ | 1,030 ms | 2,958 ms | 2,87× |
 * | **50.000** | **178 (%0,36)** | ✅ | ✅ | **2,201 ms** | **6,078 ms** | **2,76×** |
 * | 200.000 | 725 (%0,36) | ✅ | ✅ | 9,442 ms | 16,346 ms | 1,73× |
 *
 * ⚠️ **ARANAN "çevrilme noktası" BULUNAMADI — ve yokluğu bir BULGU.** Planlayıcı
 * seçici yüklemde indeksi **1.000 satırda bile** seçiyor; 200 kat hacim
 * değişimi kararı **hiç** çevirmedi. Çeviren tek şey **seçicilik** oldu (aşağıdaki
 * seçici-olmayan test her kademede Seq Scan verdi). Yani 3.9'un
 * *"indeks seçiminin ayracı hacim değil SEÇİCİLİK"* dersi burada iki boyutlu
 * olarak ölçüldü: hacim **200×** değişti, karar değişmedi; seçicilik
 * **%0,36 → %94** değişti, karar **çevrildi**.
 *
 * **Seçilen hacim 50.000 ve bu bir tercih değil bir ATIF:** ROADMAP **Faz 32**
 * kabul kriteri *"**50.000 oyuncuda** tüm filtreler < 300 ms"* diyor — yani bu
 * indekslerin gerçek tüketicisinin kendi hedef hacmi. Bir sayı uydurmak yerine
 * tüketicinin yazdığı sayı kullanıldı.
 *
 * ℹ️ *"Ayrıştı"* iki şey demek olabilir — **plan** değişti ve/veya **süre**
 * değişti — ve ikisi ayrı iddiadır. Merdivende plan hiç değişmedi, süre her
 * kademede ayrıştı; ikisi de yukarıda ayrı sütunlarda.
 */
import { fileURLToPath } from 'node:url';

import {
  ageRangeToBirthDateRange,
  createFileMigrationSource,
  createPostgresExecutor,
  migrateUp,
  type SqlExecutor,
} from '@fms/db';
import { createNoopLogger } from '@fms/shared';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { SEED_REFERENCE_DATE } from '../src/seed/index.js';

const logger = createNoopLogger();

const DRIZZLE_DIR = fileURLToPath(new URL('../../../packages/db/drizzle', import.meta.url));

/** ROADMAP Faz 32'nin hedef hacmi — uydurulmadı, atıf yapıldı (dosya başlığı). */
const SYNTHETIC_ROWS = 50_000;

/** `people.key` öneki — seed namespace'inden (`seed-player-`) AYRI. */
const SYNTHETIC_KEY_PREFIX = 'synth-';

const AGE_RANGE = ageRangeToBirthDateRange(20, 24, SEED_REFERENCE_DATE);

/** Kriter 3'ün şekli — **seçici** terim (ölçüldü: %0,36). */
const SELECTIVE_SQL = `
  SELECT p."id"
    FROM "players" p
    JOIN "people" pe ON pe."id" = p."person_id"
   WHERE pe."birth_date" BETWEEN '${AGE_RANGE.from}'::date AND '${AGE_RANGE.to}'::date
     AND p."primary_position" = 'DR'
     AND p."current_ability" > 120`;

/**
 * **Seçici OLMAYAN** terim — aynı sorgu şekli, aynı sütunlar, aynı hacim.
 * Tek fark: üç yüklem de kümenin neredeyse tamamını tutuyor (ölçüldü: %94).
 * Ayracın **hacim değil seçicilik** olduğunu gösteren şey bu simetri.
 */
const NON_SELECTIVE_SQL = `
  SELECT p."id"
    FROM "players" p
    JOIN "people" pe ON pe."id" = p."person_id"
   WHERE pe."birth_date" BETWEEN '1970-01-01'::date AND '2026-01-01'::date
     AND p."primary_position" <> 'ZZ'
     AND p."current_ability" > 45`;

let container: StartedPostgreSqlContainer;
let close: () => Promise<void>;
let executor: SqlExecutor;

const planOf = async (sql: string): Promise<string> => {
  const rows = await executor.rows<{ 'QUERY PLAN': string }>(`EXPLAIN (COSTS OFF) ${sql}`);
  return rows.map((row) => row['QUERY PLAN']).join('\n');
};

/**
 * ⚠️ `SET LOCAL` **AYRI BİR ÇAĞRI** — aynı ifadeye eklenemez.
 * 3.9'da ölçüldü: `postgres.js` `unsafe()`e çok ifadeli bir dize verildiğinde
 * dönen şekil tek ifadelidekinden **farklı** ve `rows[0]['QUERY PLAN']`
 * `undefined` geliyor. Belirti bir tip hatası gibi görünüyordu; sebep sürücünün
 * çok-ifade davranışıydı.
 */
const disableIndexes = async (tx: SqlExecutor): Promise<void> => {
  await tx.run('SET LOCAL enable_indexscan = off');
  await tx.run('SET LOCAL enable_bitmapscan = off');
};

const executionTimeMs = async (sql: string, withoutIndexes = false): Promise<number> =>
  // ⚠️ İşlem içinde: `SET LOCAL` işlem bitince kendiliğinden geri alınır.
  // Oturum düzeyinde `SET` bırakılsaydı SONRAKİ testler indekssiz koşardı ve
  // bozulma SESSİZ olurdu.
  executor.transaction(async (tx) => {
    if (withoutIndexes) await disableIndexes(tx);
    const explain = `EXPLAIN (ANALYZE, TIMING ON, FORMAT JSON) ${sql}`;
    await tx.rows(explain); // ısıtma — ölçülmüyor
    const rows = await tx.rows<{ 'QUERY PLAN': { 'Execution Time': number }[] }>(explain);
    const time = rows[0]?.['QUERY PLAN'][0]?.['Execution Time'];
    expect(typeof time).toBe('number');
    return time ?? Number.NaN;
  });

const scalar = async (sql: string): Promise<string> => {
  const rows = await executor.rows<{ v: string }>(sql);
  return rows[0]?.v ?? '';
};

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

  // Tek ülke yeter: `people.nationality_country_id` **NOT NULL**, yani
  // çözülemeyen bir anahtar burada GÜRÜLTÜLÜ patlar (4.9'un ölçtüğü fark).
  await executor.run(`
    INSERT INTO "countries"
      ("key","code","name_key","source","external_ids","confederation","flag_asset_id",
       "football_level","uefa_coefficient","currency_code","work_permit_rule_key")
    VALUES ('turkiye','TUR','country.tur','procedural','{}'::jsonb,'UEFA',NULL::text,
            80,'50.000'::numeric,'TRY','none')
  `);

  const rows = String(SYNTHETIC_ROWS);
  // Üretim SQL tarafında (`generate_series`) — 3.9'un `clubs` fixture'ıyla aynı
  // desen. Satır satır INSERT etmek 50.000'de dakikalar sürerdi.
  await executor.run(`
    INSERT INTO "people"
      ("key","source","external_ids","first_name","last_name","common_name","birth_date",
       "nationality_country_id","second_nationality_country_id","birth_city",
       "portrait_asset_id","portrait_seed","gender","person_type")
    SELECT '${SYNTHETIC_KEY_PREFIX}'||lpad(g::text,7,'0'),'procedural','{}'::jsonb,
           'Ad','Soyad',NULL::text,
           (DATE '${SEED_REFERENCE_DATE}'
              - (INTERVAL '1 year' * (16 + (g % 23)))
              - (INTERVAL '1 day' * (g % 365)))::date,
           c."id", NULL::integer, NULL::text, NULL::text, g % 2000000, 'male',
           ARRAY['player']::text[]
      FROM generate_series(1, ${rows}) g, "countries" c
     WHERE c."code" = 'TUR'
  `);
  await executor.run(`
    INSERT INTO "players"
      ("person_id","club_id","squad_number","primary_position","height_cm","weight_kg",
       "preferred_foot_right","preferred_foot_left","current_ability","potential_ability",
       "pa_range_min","pa_range_max","is_newgen","retired_at")
    SELECT p."id", NULL::integer, NULL::smallint,
           (ARRAY['GK','DC','DL','DR','DM','MC','ML','MR','AMC','AML','AMR','ST'])[1 + (g % 12)],
           175, 72, 15, 5,
           40 + (g % 100), 40 + (g % 100) + 10,
           40 + (g % 100), 40 + (g % 100) + 10,
           false, NULL::date
      FROM generate_series(1, ${rows}) g
      JOIN "people" p ON p."key" = '${SYNTHETIC_KEY_PREFIX}'||lpad(g::text,7,'0')
  `);

  // ⚠️ ŞART, konfor değil: istatistiksiz planlayıcı indeksi her durumda seçer
  // ve bu YANLIŞ CEVABIN DOĞRU GÖRÜNMESİDİR (3.9 · 4.9 günlük #35).
  await executor.run('ANALYZE "people"');
  await executor.run('ANALYZE "players"');
}, 300_000);

afterAll(async () => {
  await close();
  await container.stop();
}, 60_000);

describe('ölçümün ZEMİNİ — hacim ve istatistik', () => {
  it('sentetik hacim: 50.000 kişi + 50.000 oyuncu (ROADMAP Faz 32`nin hedefi)', async () => {
    expect(await scalar(`SELECT count(*)::text AS v FROM "people"`)).toBe(String(SYNTHETIC_ROWS));
    expect(await scalar(`SELECT count(*)::text AS v FROM "players"`)).toBe(String(SYNTHETIC_ROWS));
  });

  it('istatistik ELLE kuruldu — `last_analyze` dolu (KARAR: `reltuples` değil)', async () => {
    for (const table of ['people', 'players']) {
      expect(
        await scalar(
          `SELECT coalesce(last_analyze::text,'YOK') AS v
             FROM pg_stat_all_tables WHERE relname = '${table}'`,
        ),
      ).not.toBe('YOK');
    }
  });

  it('⚠️ KARŞI KONTROL: istatistik BOŞ bir tablonun istatistiği değil', async () => {
    for (const table of ['people', 'players']) {
      expect(
        await scalar(
          `SELECT n_live_tup::text AS v FROM pg_stat_all_tables WHERE relname = '${table}'`,
        ),
      ).toBe(String(SYNTHETIC_ROWS));
    }
  });

  it('iki terimin seçicilikleri GERÇEKTEN zıt — %0,36 ve %94', async () => {
    // Ölçümün tamamı bu farkın üstünde duruyor; iddia edilmezse "seçici" ve
    // "seçici olmayan" yalnızca isim olurdu.
    const selective = Number(await scalar(`SELECT count(*)::text AS v FROM (${SELECTIVE_SQL}) t`));
    const broad = Number(await scalar(`SELECT count(*)::text AS v FROM (${NON_SELECTIVE_SQL}) t`));

    expect(selective).toBe(178);
    expect(broad).toBe(47_000);
    expect(selective / SYNTHETIC_ROWS).toBeLessThan(0.01);
    expect(broad / SYNTHETIC_ROWS).toBeGreaterThan(0.9);
  });
});

describe('⚠️ AYRAÇ HACİM DEĞİL SEÇİCİLİK — aynı hacim, aynı sütunlar, ZIT karar', () => {
  it('SEÇİCİ terim: iki indeks de kullanılıyor', async () => {
    const plan = await planOf(SELECTIVE_SQL);
    expect(plan).toContain('players_primary_position_current_ability_idx');
    expect(plan).toContain('people_birth_date_idx');
  });

  it('SEÇİCİ OLMAYAN terim: planlayıcı İKİ indeksi de BIRAKIYOR — ve haklı', async () => {
    // Eşleşen satırların %94'ünü okuyacaksa indeks üzerinden gitmek fazladan iş
    // olur. Bu satır olmadan "50.000 satırda indeks kullanılıyor" cümlesi
    // **hacme** bağlı bir kural gibi okunurdu. Değil.
    const plan = await planOf(NON_SELECTIVE_SQL);
    expect(plan).toContain('Seq Scan');
    expect(plan).not.toContain('players_primary_position_current_ability_idx');
    expect(plan).not.toContain('people_birth_date_idx');
  });
});

describe('İNDEKSİN GEREKÇESİ — indeksli vs indekssiz, 50.000 satır', () => {
  it('⚠️ İNDEKSSİZ AYNI SORGU DAHA YAVAŞ — indekslerin var olma sebebi ÖLÇÜLDÜ', async () => {
    // Tek başına bir süre sayısı hiçbir şey kanıtlamaz. Karşılaştırma kanıtlar.
    // Yerelde ölçüldü (PG 18.6, amd64, 50.000 satır): indeksli 2,20 ms ·
    // indekssiz 6,08 ms → 2,76×. Oran makineye göre değişir; iddia edilen şey
    // **YÖN**.
    const withIndex = await executionTimeMs(SELECTIVE_SQL);
    const withoutIndex = await executionTimeMs(SELECTIVE_SQL, true);

    expect(withoutIndex).toBeGreaterThan(withIndex);
  });

  it('KONTROL: indeks kapatma GERÇEKTEN Seq Scan`e düşürüyor', async () => {
    // Yukarıdaki karşılaştırma, `SET LOCAL` hiçbir şey yapmasaydı da
    // "geçebilir" görünürdü (iki ölçüm arasındaki gürültü). Bu test kapatmanın
    // planı gerçekten değiştirdiğini sabitliyor — nöbetçinin nöbetçisi.
    const plan = await executor.transaction(async (tx) => {
      await disableIndexes(tx);
      const rows = await tx.rows<{ 'QUERY PLAN': string }>(`EXPLAIN (COSTS OFF) ${SELECTIVE_SQL}`);
      return rows.map((row) => row['QUERY PLAN']).join('\n');
    });

    expect(plan).toContain('Seq Scan');
    expect(plan).not.toContain('players_primary_position_current_ability_idx');
    expect(plan).not.toContain('people_birth_date_idx');
  });

  it('`SET LOCAL` SIZMADI — sonraki sorgu indeksleri yine kullanıyor', async () => {
    // Sızsaydı bu dosyadaki plan testleri bundan sonra yanlış sebeple geçerdi.
    const plan = await planOf(SELECTIVE_SQL);
    expect(plan).toContain('players_primary_position_current_ability_idx');
    expect(plan).toContain('people_birth_date_idx');
  });
});

describe('KAPSAM SINIRI — İDDİA B ne KANITLAMIYOR', () => {
  it('⚠️ bu dosya KABUL KRİTERİNİ KAPATMIYOR — hacim 5.000 DEĞİL', async () => {
    // Kriter 3 hacmi **5.000** yazıyor; buradaki 50.000 sentetik satır o
    // cümlenin karşılığı değil, indekslerin gerekçesi. Kriteri kapatan ölçüm
    // `transfer-search-criterion.itest.ts`te.
    expect(SYNTHETIC_ROWS).not.toBe(5000);
    expect(await scalar(`SELECT count(*)::text AS v FROM "players"`)).not.toBe('5000');
  });

  it('seed hattı bu veritabanına HİÇ dokunmadı — envanter nöbetçisi ayrı konteynerde', async () => {
    // 4.9'un `seed-query-performance` envanteri (*"4 tablo dolu, 18 boş"*)
    // başka bir dosyada ve başka bir konteynerde; buradaki satırlar onu
    // GÖREMEZ. Anahtar öneki de ayrı, yani bir gün aynı veritabanında
    // buluşsalar bile çakışmazlar.
    expect(
      await scalar(`SELECT count(*)::text AS v FROM "people" WHERE "key" LIKE 'seed-player-%'`),
    ).toBe('0');
    expect(
      await scalar(
        `SELECT count(*)::text AS v FROM "people" WHERE "key" LIKE '${SYNTHETIC_KEY_PREFIX}%'`,
      ),
    ).toBe(String(SYNTHETIC_ROWS));
  });
});
