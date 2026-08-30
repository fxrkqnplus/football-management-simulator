/**
 * SEED'İN GERÇEK VERİTABANI KANITI — Faz 3.8, gerçek PostgreSQL 18 konteyneri.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN BU DOSYA `packages/db/integration/` ALTINDA DEĞİL
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Oraya konsaydı test `@fms/data-cli`yi import etmek zorunda kalırdı ve
 * `packages/db` katmanının tek izinli bağı `@fms/shared`. **Ölçüldü**, tahmin
 * edilmedi: bir sonda dosyası konup `pnpm arch:check` koşuldu →
 *   `[layer-direction]` katman ihlali · `[undeclared-dependency]`
 * yani iki kural birden ötüyor. Bu yüzden `vitest.integration.config.ts` çok
 * projeli hâle getirildi ve test kendi paketinin altında duruyor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * *"İKİNCİ KOŞU PATLAMADI"* İDEMPOTENTLİK KANITI DEĞİLDİR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `DO UPDATE` seçildiğine göre iddia şu: **seed bozuk bir satırı ONARIR.**
 * Aşağıdaki negatif test bunu iddia ediyor — satır kasten bozuluyor, seed
 * yeniden koşuyor, hem satır sayısının değişmediği hem değerin **onarıldığı**
 * okunuyor. Üçüncü adım olmadan test yalnızca *"patlamadı"* derdi ve bu, 3.2b'de
 * ölçülen kör karşılaştırıcı boşluğuyla aynı sınıf olurdu (on beş pozitif test
 * kör bir karşılaştırıcıyla da geçiyordu).
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

import {
  competitionNameKey,
  countryNameKey,
  SEED_COMPETITIONS,
  SEED_COUNTRIES,
  SEED_SOURCE,
  seedWorld,
} from '../src/seed/index.js';

const logger = createNoopLogger();

/**
 * Migration dosyaları `packages/db/drizzle` altında ve o dizin paketin
 * `exports` haritasında **yok** (yalnızca `dist/` yayınlanıyor). Göreli yol
 * bilinçli: paket düzeni değişirse test **gürültülü** kırılır, sessizce başka
 * bir dizini okumaz.
 */
const DRIZZLE_DIR = fileURLToPath(new URL('../../../packages/db/drizzle', import.meta.url));

/**
 * Bir koşudan diğerine BİREBİR aynı kalması gereken sütunlar. Denetim zaman
 * damgaları burada **yok** ve bu dışlama sessiz değil: aşağıda kendi testi var,
 * `created_at` sabitliği ve `updated_at` ilerlemesi ayrıca **okunup iddia**
 * ediliyor. 3.2b'nin sequence kararıyla aynı biçim — *tanım karşılaştırılır,
 * konum karşılaştırılmaz*, ama konum yine de raporlanır.
 */
const EXCLUDED_FROM_COMPARISON = ['created_at', 'updated_at'] as const;

interface CountryRow {
  readonly id: number;
  readonly key: string;
  readonly code: string;
  readonly name_key: string;
  readonly source: string;
  readonly external_ids: Record<string, unknown>;
  readonly confederation: string;
  readonly flag_asset_id: string | null;
  readonly football_level: number;
  readonly uefa_coefficient: string;
  readonly currency_code: string;
  readonly work_permit_rule_key: string;
  readonly created_at: Date;
  readonly updated_at: Date;
}

interface CompetitionRow {
  readonly id: number;
  readonly key: string;
  readonly country_id: number | null;
  readonly code: string;
  readonly name_key: string;
  readonly type: string;
  readonly tier: number | null;
  readonly reputation: number;
  readonly logo_asset_id: string | null;
  readonly rules: Record<string, unknown>;
  readonly season_start_month: number;
  readonly season_end_month: number;
  readonly created_at: Date;
  readonly updated_at: Date;
}

let container: StartedPostgreSqlContainer;
let close: () => Promise<void>;
let executor: SqlExecutor;

const readCountries = async (): Promise<readonly CountryRow[]> =>
  executor.rows<CountryRow>('SELECT * FROM "countries" ORDER BY "key"');

const readCompetitions = async (): Promise<readonly CompetitionRow[]> =>
  executor.rows<CompetitionRow>('SELECT * FROM "competitions" ORDER BY "key"');

const countOf = async (table: string): Promise<number> => {
  const rows = await executor.rows<{ n: string }>(`SELECT count(*)::text AS n FROM "${table}"`);
  return Number(rows[0]?.n);
};

/**
 * Karşılaştırmadan denetim zaman damgalarını çıkarır — dışlama TEK yerde.
 *
 * `delete` yerine filtreli yeniden kurma: `no-dynamic-delete` kuralı açık ve
 * haklı — dinamik `delete` nesnenin gizli sınıfını bozar ve tip sistemi
 * anahtarın var olduğunu doğrulayamaz.
 */
function withoutTimestamps(row: CountryRow | CompetitionRow): Record<string, unknown> {
  const excluded = new Set<string>(EXCLUDED_FROM_COMPARISON);
  return Object.fromEntries(Object.entries(row).filter(([field]) => !excluded.has(field)));
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
}, 180_000);

afterAll(async () => {
  await close();
  await container.stop();
});

describe('kabul kriteri 2 — seed gerçek PostgreSQL 18`e yazıyor', () => {
  it('ilk koşu 6 ülke + 11 yarışma yazıyor', async () => {
    const result = await seedWorld({ executor, logger });

    // `RETURNING` — veritabanının bildirdiği, girdinin sayılmadığı rakam.
    expect(result.countryKeys).toHaveLength(6);
    expect(result.competitionKeys).toHaveLength(11);

    // Ve tablodan bağımsız olarak sayılıyor.
    expect(await countOf('countries')).toBe(6);
    expect(await countOf('competitions')).toBe(11);
  });

  it('6 lig + 5 kupa ayrımı veritabanında da geçerli', async () => {
    const rows = await readCompetitions();
    expect(rows.filter((row) => row.type === 'league')).toHaveLength(6);
    expect(rows.filter((row) => row.type === 'continental')).toHaveLength(3);
    expect(rows.filter((row) => row.type === 'domestic_cup')).toHaveLength(2);
  });

  it('yabancı anahtar ANAHTARLA çözüldü — doğru ülkeye bağlandı', async () => {
    const countries = await readCountries();
    const idToKey = new Map(countries.map((row) => [row.id, row.key]));
    const competitions = await readCompetitions();
    const seedByKey = new Map(SEED_COMPETITIONS.map((row) => [row.key, row]));

    for (const row of competitions) {
      const expectedKey = seedByKey.get(row.key)?.countryKey ?? null;
      const actualKey = row.country_id === null ? null : (idToKey.get(row.country_id) ?? null);
      expect(actualKey).toBe(expectedKey);
    }
  });

  it('üç kıta turnuvası `country_id` NULL, `tier` NULL ile yazıldı', async () => {
    const rows = (await readCompetitions()).filter((row) => row.type === 'continental');
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.country_id).toBeNull();
      expect(row.tier).toBeNull();
    }
  });

  it('K5 — tabloda görünen ad değil i18n ANAHTARI duruyor', async () => {
    for (const row of await readCountries()) {
      expect(row.name_key).toBe(countryNameKey(row.code));
    }
    for (const row of await readCompetitions()) {
      expect(row.name_key).toBe(competitionNameKey(row.code));
    }
    // Karşı örnek: Türkçe görünen ad tabloya HİÇ girmedi.
    const hits = await executor.rows<{ n: string }>(
      `SELECT count(*)::text AS n FROM "competitions" WHERE "name_key" LIKE '%Süper%'`,
    );
    expect(Number(hits[0]?.n)).toBe(0);
  });

  it('`rules` jsonb`i kayıpsız gidip geliyor — iç içe nesne ve diziler dahil', async () => {
    const rows = await readCompetitions();
    const byKey = new Map(rows.map((row) => [row.key, row]));

    for (const seed of SEED_COMPETITIONS) {
      expect(byKey.get(seed.key)?.rules).toEqual(seed.rules);
    }

    // Boş dizi ve `null` alanlar da korunuyor — jsonb`in sessizce
    // normalleştirmediğini gösteren iki uç.
    expect(byKey.get('facup')?.rules).toMatchObject({
      transferWindows: [],
      squadRegistration: { maxSquadSize: null, maxForeign: null, homegrownMin: null },
      extraTimeSubstitution: true,
    });
    expect(byKey.get('superlig')?.rules).toMatchObject({
      playoffSpots: 0,
      extraTimeSubstitution: false,
    });
  });

  it('her satır `source` taşıyor ve CHECK kısıtından geçti', async () => {
    for (const row of await readCountries()) expect(row.source).toBe(SEED_SOURCE);
    const rows = await executor.rows<{ source: string }>('SELECT "source" FROM "competitions"');
    for (const row of rows) expect(row.source).toBe(SEED_SOURCE);
  });

  it('varlık kimlikleri NULL kaldı — K9, prosedürel yedek beklenen durum', async () => {
    for (const row of await readCountries()) expect(row.flag_asset_id).toBeNull();
    for (const row of await readCompetitions()) expect(row.logo_asset_id).toBeNull();
  });
});

describe('idempotentlik — "patlamadı" değil, ONARDI', () => {
  it('ikinci koşu satır sayısını DEĞİŞTİRMİYOR ve bozulan satırı ONARIYOR', async () => {
    const before = await countOf('countries');
    const original = (await readCountries()).find((row) => row.key === 'turkiye');
    expect(original).toBeDefined();

    // ── Satır KASTEN bozuluyor: iki farklı tipte alan birden.
    await executor.run(
      `UPDATE "countries"
          SET "uefa_coefficient" = 0,
              "football_level"   = 1,
              "confederation"    = 'BOZUK'
        WHERE "key" = 'turkiye'`,
    );
    const corrupted = (await readCountries()).find((row) => row.key === 'turkiye');
    expect(corrupted?.confederation).toBe('BOZUK');

    await seedWorld({ executor, logger });

    const repaired = (await readCountries()).find((row) => row.key === 'turkiye');
    expect(await countOf('countries')).toBe(before);
    expect(repaired?.confederation).toBe(original?.confederation);
    expect(repaired?.uefa_coefficient).toBe(original?.uefa_coefficient);
    expect(repaired?.football_level).toBe(original?.football_level);
  });

  it('`DO UPDATE` satırı YENİDEN YARATMIYOR — kimlikler sabit', async () => {
    // Kimlik değişseydi Faz 4`ün yabancı anahtarları her seed koşusunda kopardı.
    const idsBefore = (await readCountries()).map((row) => `${row.key}:${String(row.id)}`);
    await seedWorld({ executor, logger });
    expect((await readCountries()).map((row) => `${row.key}:${String(row.id)}`)).toEqual(idsBefore);
  });

  it('yarışma tarafı da idempotent — 11 satır sabit', async () => {
    await seedWorld({ executor, logger });
    await seedWorld({ executor, logger });
    expect(await countOf('competitions')).toBe(11);
  });
});

describe('K2 — determinizm, ve zaman damgalarının DIŞLANMASI sessiz değil', () => {
  it('iki koşu, zaman damgaları dışında BİREBİR aynı satırları bırakıyor', async () => {
    await seedWorld({ executor, logger });
    const countriesFirst = (await readCountries()).map(withoutTimestamps);
    const competitionsFirst = (await readCompetitions()).map(withoutTimestamps);

    await seedWorld({ executor, logger });

    expect((await readCountries()).map(withoutTimestamps)).toEqual(countriesFirst);
    expect((await readCompetitions()).map(withoutTimestamps)).toEqual(competitionsFirst);
  });

  it('dışlanan alanlar AÇIKÇA ikisi — liste büyürse bu test kırılır', () => {
    expect([...EXCLUDED_FROM_COMPARISON]).toEqual(['created_at', 'updated_at']);
  });

  it('`created_at` SABİT, `updated_at` İLERLİYOR — ölçülüp iddia ediliyor', async () => {
    const before = (await readCountries()).find((row) => row.key === 'turkiye');
    expect(before).toBeDefined();

    await seedWorld({ executor, logger });
    const after = (await readCountries()).find((row) => row.key === 'turkiye');

    // `created_at` DO UPDATE listesinde yok → satırın doğuş anı korunuyor.
    expect(after?.created_at.getTime()).toBe(before?.created_at.getTime());
    // `updated_at` açıkça `now()` alıyor → `defaultNow()` yalnızca INSERT`te
    // işlediği için bu satır olmasa damga BAYAT kalırdı.
    expect(after?.updated_at.getTime()).toBeGreaterThan(before?.updated_at.getTime() ?? 0);
  });
});

describe('KAPATILMAYAN DELİK, KOŞAN BİR TESTLE GÖRÜNÜR', () => {
  it('`ON CONFLICT (key)` `code` çakışmasını GÖRMÜYOR — 23505 ile ölüyor', async () => {
    // Delik bilerek kapatılmadı: `key`i yeni ama `code`u mevcut bir satır, seed
    // verisinin KENDİSİNİN yanlış olduğu anlamına gelir (anahtar yeniden
    // adlandırılmış, kod bırakılmış). O durumda gürültülü ölmek, sessizce yanlış
    // satırı güncellemekten iyidir. Test hatanın HANGİ kısıttan geldiğini
    // adıyla iddia ediyor — "bir şey patladı" yeterli bir kanıt değil.
    const failure = await seedWorld({
      executor,
      logger,
      countries: [
        {
          key: 'yeni-anahtar-ayni-kod',
          code: 'TUR', // `turkiye` satırı bu kodu zaten taşıyor.
          confederation: 'UEFA',
          footballLevel: 1,
          uefaCoefficient: '0.000',
          currencyCode: 'TRY',
          workPermitRuleKey: 'none',
          externalIds: {},
        },
      ],
      competitions: [],
    }).then(
      () => null,
      (error: unknown) => error as { code?: string; constraint_name?: string; message?: string },
    );

    expect(failure).not.toBeNull();
    expect(failure?.code).toBe('23505');
    expect(failure?.constraint_name).toBe('countries_code_unique');

    // Ve işlem geri alındı: yarım satır kalmadı.
    expect(await countOf('countries')).toBe(6);
  });
});

describe('KAPSAM SINIRI — 3.8 ne YAPMIYOR', () => {
  it('`clubs` BOŞ kaldı — kulüp verisi Faz 8`in işi', async () => {
    // 3.9 `EXPLAIN ANALYZE`ı hangi veriyle ölçeceğine karar verirken bunu
    // bilmek zorunda: `clubs_name_trgm_idx` bugün BOŞ bir tabloyu indeksliyor.
    expect(await countOf('clubs')).toBe(0);
  });

  it('`federations` BOŞ kaldı — kabul kriterinde yok (K12)', async () => {
    expect(await countOf('federations')).toBe(0);
  });

  it('seed YENİ MIGRATION yazmadı — zincir 10 adımda', async () => {
    const rows = await executor.rows<{ n: string }>(
      'SELECT count(*)::text AS n FROM "fms_meta"."migrations"',
    );
    // ⚠️ İDDİA HÂLÂ 3.8 HAKKINDA: *"seed bir migration YAZMADI"*. Sayı zincirin
    // bugünkü uzunluğu ve her yeni migration'da güncellenir — 4.3 `0005`i
    // ekledi (5 → 6), 4.4 `0006`yı ekledi (6 → 7), 4.5 **İKİ** migration ekledi
    // (`0007` + `0008`, 7 → 9), 4.6 `0009`u ekledi (9 → 10). Kırılması istenen
    // davranış: seed bir gün sessizce migration yazarsa bu satır öter.
    expect(Number(rows[0]?.n)).toBe(10);
  });

  it('master tabloların hepsi hâlâ yerinde — 4.3`te 11 → 13, 4.5`te → 15, 4.6`da → 18', async () => {
    const rows = await executor.rows<{ n: string }>(
      `SELECT count(*)::text AS n FROM "information_schema"."tables"
        WHERE "table_schema" = 'public' AND "table_type" = 'BASE TABLE'`,
    );
    expect(Number(rows[0]?.n)).toBe(18);
  });

  it('seed edilen ülke sayısı, ROADMAP Faz 8`in ülke listesiyle aynı', () => {
    expect(SEED_COUNTRIES.map((row) => row.code).sort()).toEqual([
      'ENG',
      'ESP',
      'FRA',
      'GER',
      'ITA',
      'TUR',
    ]);
  });
});
