/**
 * İDDİA A — FAZ 4 KABUL KRİTERİ 3, ROADMAP'İN YAZDIĞI GİBİ (Faz 4.10).
 *
 * ROADMAP kriter 3: *"«20–24 yaş, sağ bek, CA>120» sorgusu **5.000 oyuncu
 * hacminde** < 50 ms"* (SAPMA-031 — `değer<15M` yüklemi Faz 30/32'ye taşındı,
 * çünkü `marketValue` `player_state`'te ve o §3.2 save katmanı). Bu dosya o
 * cümlenin birebir karşılığı ve kriteri **kapatan** ölçüm.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ BU ÖLÇÜM SÜRE TARAFINDA ÖNEMSİZ BİÇİMDE GEÇİYOR — ve SAKLAMAK yerine YAZIYORUZ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * 3.9 aynı durumu yaşadı ve `seed-query-performance.itest.ts` başlığına yazdı:
 * *"Altı satırlık bir tabloda her sorgu mikrosaniyeler sürer — yani «< 20 ms»
 * burada indeksler hakkında **hiçbir şey** kanıtlamaz."* 5.000 satır 6'dan
 * büyük ama hâlâ küçük: ölçülen medyan **~0,4 ms**, bütçe **50 ms** — yani
 * bütçenin yaklaşık **yüzde biri**. Kriter yazıldığı hâliyle **sağlanıyor**;
 * iddia da tam olarak o kadar. *"İndeks çalışıyor"* cümlesi bu ölçümden
 * **çıkarılamaz** — o, ayrı bir dosyanın (İDDİA B) işi.
 *
 * ⚠️ **AMA "ÖNEMSİZ" YALNIZCA SÜRE İÇİN DOĞRU — PLAN ÖNEMSİZ DEĞİL.** Aşağıdaki
 * plan testleri bu hacimde bile keskin bir şey ölçüyor ve sonuç 4.8'in açık
 * bıraktığı soruyu cevaplıyor (aşağıda).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ İSTATİSTİK DENETİMİ `last_analyze` İLE — `reltuples` İLE **DEĞİL**
 * ────────────────────────────────────────────────────────────────────────────
 *
 * ROADMAP 4.10 maddesi başlangıçta *"`ANALYZE` şart (`reltuples != -1`
 * denetlenir)"* diyordu. **4.9 bunu çürüttü ve düzeltme ROADMAP'e yazıldı:**
 * `autovacuum=on` / `autovacuum_naptime=60s` ile 5.000 satırlık INSERT
 * autoanalyze eşiğini aşıyor ve istatistik **kimse `ANALYZE` çağırmadan**
 * ~15 sn içinde doluyor. Yani `reltuples != -1` **yeşil verir ama `ANALYZE`ın
 * koştuğunu göstermez** — bir kapının baktığını göstermeden onaylaması (D3'ün
 * ölçüm tarafındaki biçimi).
 *
 * Burada denetlenen alan **`last_analyze`**: o yalnızca **elle** çalıştırılan
 * `ANALYZE` ile doluyor (4.9'da +60 sn'de bile `NULL` kaldı, ölçüldü). Ve
 * **karşı kontrol zorunlu** — `last_analyze` dolu ama tablo boş olsaydı iddia
 * bedavaya geçerdi, o yüzden `n_live_tup` de okunuyor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `ANALYZE` ÖNCESİ DURUM YARIŞTAN ÇEKİLDİ — ve tarif ÖLÇÜLEREK doğrulandı (D2)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * *"`ANALYZE` öncesi"* bir durum değil bir **yarış** (4.9, günlük #35): aynı
 * iddia seed'den 1 sn sonra `-1`, 20 sn sonra `5000` verir. Zamana bağlı bir
 * iddia *"bazen yeşil"* olurdu ve o, olmayan bir testten kötüdür.
 *
 * Çözüm `beforeAll`da: iki tablo seed'den **önce**
 * `ALTER TABLE … SET (autovacuum_enabled = false)` alıyor. **Tarif bir iddiadır
 * ve ölçüldü** — ayrı bir sonda betiğiyle, aynı koşuda bir **karşı kontrolle**:
 *
 * | Tablo | `autovacuum_enabled` | +20 sn | +60 sn |
 * |---|---|---|---|
 * | `players` | **false** | `reltuples=-1`, `last_autoanalyze=YOK` | aynı |
 * | `people` (kontrol) | true (varsayılan) | **`reltuples=5000`, damgalandı** | aynı |
 *
 * Yani ayar gerçekten ısırıyor ve *"öncesi"* artık saate değil **ayara** bağlı.
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

import { SEED_PLAYER_COUNT, SEED_REFERENCE_DATE, seedWorld } from '../src/seed/index.js';

const logger = createNoopLogger();

/** Göreli yol bilinçli — paket düzeni değişirse test GÜRÜLTÜLÜ kırılır. */
const DRIZZLE_DIR = fileURLToPath(new URL('../../../packages/db/drizzle', import.meta.url));

/** ROADMAP Faz 4 kabul kriteri 3'ün bütçesi. */
const BUDGET_MS = 50;

/** Süre bir sayı değil bir DAĞILIM — tek örneklem bir ölçüm değildir. */
const SAMPLES = 9;

/**
 * Kriter 3'ün sorgusu — **üç** yüklem.
 *
 * ⚠️ Yaş yüklemi burada `ageRangeToBirthDateRange` ile sabit tarihlere
 * çevriliyor ve çevrim **ikinci kez yazılmıyor**: `age()`/`now()` `STABLE`
 * olduğu için indekslenemiyor (4.8'de ölçüldü) ve `transfer-search.ts`in
 * başlığı uyarıyor — iki yerde yazılan bir çevrim sessizce ayrışır, sorgu
 * **doğru cevabı vermeye devam eder**, yalnızca farklı satırlar döner.
 * Seed doğum tarihlerini de aynı fonksiyondan üretti (4.9) ve `SEED_REFERENCE_DATE`
 * **aynı sabit**.
 */
const AGE_RANGE = ageRangeToBirthDateRange(20, 24, SEED_REFERENCE_DATE);

const CRITERION_SQL = `
  SELECT p."id"
    FROM "players" p
    JOIN "people" pe ON pe."id" = p."person_id"
   WHERE pe."birth_date" BETWEEN '${AGE_RANGE.from}'::date AND '${AGE_RANGE.to}'::date
     AND p."primary_position" = 'DR'
     AND p."current_ability" > 120`;

let container: StartedPostgreSqlContainer;
let close: () => Promise<void>;
let executor: SqlExecutor;

/** `ANALYZE`dan ÖNCE alınan plan — yarıştan çekilmiş durumda okundu. */
let planBeforeAnalyze = '';
/** Isıtmasız İLK koşunun süresi (ms) ve `BUFFERS` çıktısı. */
let firstRunMs = Number.NaN;
let firstRunBuffers = '';

const planOf = async (): Promise<string> => {
  const rows = await executor.rows<{ 'QUERY PLAN': string }>(
    `EXPLAIN (COSTS OFF) ${CRITERION_SQL}`,
  );
  return rows.map((row) => row['QUERY PLAN']).join('\n');
};

const executionTimeMs = async (timing: 'ON' | 'OFF' = 'ON'): Promise<number> => {
  const rows = await executor.rows<{ 'QUERY PLAN': { 'Execution Time': number }[] }>(
    `EXPLAIN (ANALYZE, TIMING ${timing}, FORMAT JSON) ${CRITERION_SQL}`,
  );
  const time = rows[0]?.['QUERY PLAN'][0]?.['Execution Time'];
  expect(typeof time).toBe('number');
  return time ?? Number.NaN;
};

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

  // ⚠️ SEED'DEN ÖNCE: "ANALYZE öncesi" durumu yarıştan çekiliyor (dosya başlığı).
  await executor.run('ALTER TABLE "people" SET (autovacuum_enabled = false)');
  await executor.run('ALTER TABLE "players" SET (autovacuum_enabled = false)');

  await seedWorld({ executor, logger });

  // İstatistik YOKKEN plan — bu satırın sırası bir zorunluluk.
  planBeforeAnalyze = await planOf();

  // ⚠️ Isıtmasız İLK koşu: soğuk önbellek iddiası ancak burada ölçülebilir.
  const buffers = await executor.rows<{ 'QUERY PLAN': string }>(
    `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${CRITERION_SQL}`,
  );
  firstRunBuffers = buffers.map((row) => row['QUERY PLAN']).join('\n');
  firstRunMs = Number(/Execution Time: ([\d.]+) ms/.exec(firstRunBuffers)?.[1] ?? Number.NaN);

  // Kriter 3'ün ölçümü İSTATİSTİKLE alınır — bu satır bir konfor değil ŞART.
  await executor.run('ANALYZE "people"');
  await executor.run('ANALYZE "players"');
}, 240_000);

afterAll(async () => {
  await close();
  await container.stop();
}, 60_000);

describe('ölçümün ZEMİNİ — önce HACİM, sonra süre', () => {
  /**
   * ⚠️ Sıra bir tercih değil: *"tüm temel sorgular < 50 ms"* cümlesi **hacim
   * yazılmadan** yazılsaydı, bakacak bir şey bulamayan bir kapı `✅` almış
   * olurdu (SAPMA-024). 3.9'un aynı dosyadaki dersinin tekrarı.
   */
  it('hacim: `people` 5.000 · `players` 5.000', async () => {
    expect(await scalar(`SELECT count(*)::text AS v FROM "people"`)).toBe(
      String(SEED_PLAYER_COUNT),
    );
    expect(await scalar(`SELECT count(*)::text AS v FROM "players"`)).toBe(
      String(SEED_PLAYER_COUNT),
    );
  });

  it('⚠️ İSTATİSTİK DENETİMİ `last_analyze` İLE — `reltuples` ile DEĞİL', async () => {
    // `reltuples != -1` autoanalyze sayesinde `ANALYZE` hiç çağrılmadan da
    // doğru olur (4.9, günlük #35). `last_analyze` yalnızca ELLE çalıştırılan
    // `ANALYZE` ile dolar.
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
    // `last_analyze` dolu ama tablo boş olsaydı yukarıdaki iddia bedavaya
    // geçerdi. Bu satır onu kapatıyor.
    for (const table of ['people', 'players']) {
      expect(
        await scalar(
          `SELECT n_live_tup::text AS v FROM pg_stat_all_tables WHERE relname = '${table}'`,
        ),
      ).toBe(String(SEED_PLAYER_COUNT));
    }
  });

  it('sorgu DOĞRU satırları getiriyor — 27 (4.9`da üç yöntemle ölçüldü)', async () => {
    // Süre ölçümü boş bir sonuç kümesinin üstünde anlamsız olurdu.
    expect(await scalar(`SELECT count(*)::text AS v FROM (${CRITERION_SQL}) t`)).toBe('27');
  });
});

describe('KABUL KRİTERİ 3 — 5.000 oyuncu hacminde < 50 ms', () => {
  it('medyan VE en kötü örneklem bütçenin altında', async () => {
    // Tek bir örneklem bir ölçüm değildir. Isıtma koşusu ölçülmüyor.
    await executionTimeMs();

    const samples: number[] = [];
    for (let i = 0; i < SAMPLES; i += 1) samples.push(await executionTimeMs());
    samples.sort((a, b) => a - b);

    const median = samples[Math.floor(SAMPLES / 2)] ?? Number.NaN;
    const worst = samples[SAMPLES - 1] ?? Number.NaN;

    expect(median).toBeLessThan(BUDGET_MS);
    expect(worst).toBeLessThan(BUDGET_MS);
    // Yerelde ölçüldü (PG 18.6, amd64): medyan ~0,43 ms · en kötü ~0,46 ms.
    // Sayı makineye göre değişir; iddia edilen şey BÜTÇENİN ALTINDA olması.
    expect(median).toBeGreaterThan(0);
  });

  it('⚠️ ISITMASIZ İLK KOŞU da bütçenin altında — soğuk önbellek ayrı işaretlendi', () => {
    // Ölçüm `beforeAll`da, herhangi bir ısıtmadan ÖNCE alındı; burada yalnızca
    // okunuyor — o yüzden bu test `async` DEĞİL.
    expect(Number.isFinite(firstRunMs)).toBe(true);
    expect(firstRunMs).toBeLessThan(BUDGET_MS);

    // ⚠️ Ve ölçüm aracının gerçekten buffer saydığı doğrulanıyor — `Buffers:`
    // satırı yoksa "soğuk/sıcak farkı yok" iddiası hiçbir şeye bakmıyor demektir.
    expect(firstRunBuffers).toContain('Buffers:');
    // ℹ️ ÖLÇÜLDÜ: bu hacimde `shared hit=140`, `read=0` — 5.000 satır seed'den
    // hemen sonra zaten shared buffers'ta. Yani **soğuk/sıcak ayrımı bu hacimde
    // GÖZLEMLENEBİLİR DEĞİL** ve bu bir eksiklik değil bir ölçüm sonucu (3.9
    // aynı sonuca 0,059 → 0,055 ms ile varmıştı). İddia edilmiyor, RAPORLANIYOR.
  });

  it('ölçüm ARACI doğrulandı: `TIMING OFF` ile de bütçenin altında (D2)', async () => {
    // Enstrümantasyon süreyi domine etseydi, ölçülen şey sorgu değil ölçümün
    // kendisi olurdu.
    expect(await executionTimeMs('OFF')).toBeLessThan(BUDGET_MS);
    expect(await executionTimeMs('ON')).toBeLessThan(BUDGET_MS);
  });
});

describe('⚠️ PLAN — süre ÖNEMSİZ ama plan DEĞİL', () => {
  /**
   * ⚠️ **4.8'İN AÇIK BIRAKTIĞI SORU BURADA CEVAPLANIYOR.**
   *
   * `transfer-search.ts` başlığı şunu yazmıştı: *"JOIN'in hangi taraftan
   * başlayacağı **seçiciliğe** bağlı. Planlayıcı `people`den başlarsa bu indeks
   * aralık taramasını taşır; `players`tan başlarsa `person_id` PK erişimiyle
   * gider ve indeks kullanılmaz. **Hangisi olduğu 4.10'un ölçümüdür.**"*
   *
   * **Cevap: hiçbiri.** Planlayıcı bir **Hash Join** kuruyor ve iki tarafı
   * ayrı ayrı değerlendiriyor — ve ikisine **farklı** karar veriyor:
   *
   * | Taraf | Yüklemin seçiciliği | Karar |
   * |---|---|---|
   * | `players` | 75 / 5.000 = **%1,5** | **Bitmap Index Scan** (bileşik indeks) |
   * | `people` | 1.776 / 5.000 = **%35,5** | **Seq Scan** — indeks kullanılmıyor |
   *
   * Yani `0011`in **iki indeksi aynı sorguda, aynı hacimde, zıt** davranıyor ve
   * ayraç **seçicilik**. 3.9'un *"ayraç hacim değil seçicilik"* dersinin en dar
   * biçimi: burada hacim bir **değişken bile değil**, iki taraf da 5.000 satır.
   */
  it('`players` tarafı BİLEŞİK İNDEKSİ kullanıyor', async () => {
    const plan = await planOf();
    expect(plan).toContain('players_primary_position_current_ability_idx');
    expect(plan).toContain('Bitmap Index Scan');
  });

  it('⚠️ `people` tarafı indeksi KULLANMIYOR — ve bu DOĞRU karar', async () => {
    // Yaş penceresi `people`ın %35,5'ini tutuyor; o kadar satırı indeks
    // üzerinden okumak fazladan iş olur. Bu bir regresyon değil, planlayıcının
    // haklı kararı — ve iddia edilmesinin sebebi, gelecekte biri planı görüp
    // "indeks çalışmıyor" diye bir hata sanmasın.
    const plan = await planOf();
    expect(plan).toContain('Seq Scan on people');
    expect(plan).not.toContain('people_birth_date_idx');
  });

  /**
   * ⚠️ **`ANALYZE` ŞART OLDUĞUNUN KANITI — VE BU BİR YORUM DEĞİL, KOŞAN BİR TEST.**
   *
   * İstatistiksiz planlayıcı **iki indeksi de** seçiyor. Ölçüm `ANALYZE`sız
   * alınsaydı rapora *"her iki indeks de kullanılıyor"* yazılırdı ve bu
   * **yanlış** olurdu — 3.9'un tarif ettiği tuzağın birebir tekrarı, ve yönü
   * yine tehlikeli: **yanlış cevap, doğru cevaptan daha iyi görünüyor.**
   */
  it('⚠️ `ANALYZE` ÖNCESİ plan FARKLI — istatistiksiz planlayıcı İKİ indeksi de seçiyor', () => {
    expect(planBeforeAnalyze).toContain('people_birth_date_idx');
    expect(planBeforeAnalyze).toContain('players_primary_position_current_ability_idx');
    expect(planBeforeAnalyze).not.toContain('Seq Scan on people');
  });

  it('plan KARARLI — aynı sorgu, aynı istatistik, tek plan', async () => {
    // 27 satır küçük bir sayı: plan seçimi sınırdaysa küçük bir dalgalanma onu
    // çevirebilirdi. Bu test ölçümün tekrarlanabilir olduğunu sabitliyor.
    const plans = new Set<string>();
    for (let i = 0; i < 5; i += 1) plans.add(await planOf());
    expect(plans.size).toBe(1);
  });
});

describe('KAPSAM SINIRI — İDDİA A ne KANITLAMIYOR', () => {
  it('⚠️ bu dosya "indeks çalışıyor" DEMİYOR — o iddia ayrı bir dosyada (İDDİA B)', async () => {
    // Bütçenin yaklaşık yüzde biri kullanılıyor; aynı sorgu indekssiz de
    // rahatlıkla bütçenin altında kalır. Yani süre tarafı indeksler hakkında
    // hiçbir şey söylemiyor — ve bu, koşan bir iddiayla görünür tutuluyor.
    const withIndex = await executionTimeMs();
    expect(withIndex).toBeLessThan(BUDGET_MS / 10);

    const withoutIndex = await executor.transaction(async (tx) => {
      // ⚠️ `SET LOCAL` AYRI BİR ÇAĞRI — aynı ifadeye eklenemez (3.9'da ölçüldü).
      await tx.run('SET LOCAL enable_indexscan = off');
      await tx.run('SET LOCAL enable_bitmapscan = off');
      const rows = await tx.rows<{ 'QUERY PLAN': { 'Execution Time': number }[] }>(
        `EXPLAIN (ANALYZE, TIMING ON, FORMAT JSON) ${CRITERION_SQL}`,
      );
      return rows[0]?.['QUERY PLAN'][0]?.['Execution Time'] ?? Number.NaN;
    });

    // İndekssiz hâli DE bütçenin altında — kriterin bu hacimde indeksler
    // hakkında hiçbir şey kanıtlamadığının doğrudan kanıtı.
    expect(withoutIndex).toBeLessThan(BUDGET_MS);
  });

  it('`SET LOCAL` SIZMADI — sonraki plan yine bileşik indeksi kullanıyor', async () => {
    // Sızsaydı bu dosyadaki önceki plan testleri bundan sonra yanlış sebeple
    // geçerdi (3.9'un aynı nöbetçisi).
    expect(await planOf()).toContain('players_primary_position_current_ability_idx');
  });
});
