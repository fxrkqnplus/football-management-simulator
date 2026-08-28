/**
 * SEED ORKESTRASYONU — tek işlem, sabit sıra, ölçülen sonuç.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN TEK İŞLEM
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `competitions.country_id` skaler alt sorguyla `countries`ten çözülüyor, yani
 * ikinci ifade birincinin çıktısına bağlı. Ayrı işlemlerde koşsalardı ve ikinci
 * ifade patlasaydı, veritabanı **yarım seed edilmiş** kalırdı: ülkeler var,
 * yarışmalar yok — ve bir sonraki koşu bunu fark etmezdi çünkü `DO UPDATE` her
 * iki durumda da sessizce başarılı olur. `SqlExecutor.transaction` geri
 * çağrının fırlattığı her hatada işlemi geri alıyor (`executor.ts` sözleşmesi).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN `RETURNING` — "kaç satır yazıldı" ÖLÇÜLÜR, VARSAYILMAZ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `rows.length` girdiyi sayardı, veritabanının ne yaptığını değil. `RETURNING
 * "key"` çıktıyı **veritabanından** okuyor: `ON CONFLICT` dalına düşen satırlar
 * da döner, yani sayı hem ilk hem sonraki koşularda 6 ve 11 olmalı. Fark
 * çıkarsa bu bir bulgudur, gizlenecek bir gürültü değil.
 *
 * ⚠️ Dönen anahtarlar **sıralanıyor**. `RETURNING` sırası PostgreSQL'in
 * garantisi değil ve sıralanmazsa determinizm testi kodun değil planlayıcının
 * keyfine göre kırılırdı — 3.2b'nin sequence kararının aynı sınıfı: *tanım
 * karşılaştırılır, konum karşılaştırılmaz*.
 */
import type { SqlExecutor } from '@fms/db';
import type { Logger } from '@fms/shared';

import { buildCompetitionsUpsertSql, buildCountriesUpsertSql } from './seed-sql.js';
import type { CompetitionSeed, CountrySeed } from './world-seed-data.js';
import { SEED_COMPETITIONS, SEED_COUNTRIES } from './world-seed-data.js';

export interface SeedWorldOptions {
  readonly executor: SqlExecutor;
  readonly logger: Logger;
  /** Varsayılan `SEED_COUNTRIES`. Testler kendi kümelerini verebilsin diye açık. */
  readonly countries?: readonly CountrySeed[];
  /** Varsayılan `SEED_COMPETITIONS`. */
  readonly competitions?: readonly CompetitionSeed[];
}

export interface SeedWorldResult {
  /** Veritabanının `RETURNING` ile bildirdiği ülke anahtarları — sıralı. */
  readonly countryKeys: readonly string[];
  /** Veritabanının `RETURNING` ile bildirdiği yarışma anahtarları — sıralı. */
  readonly competitionKeys: readonly string[];
}

interface KeyRow {
  readonly key: string;
}

/**
 * Dünya çekirdeğini yazar: 6 ülke + 11 yarışma (6 lig + 5 kupa).
 *
 * **İdempotenttir** — aynı veriyle iki kez koşmak satır sayısını değiştirmez ve
 * elle bozulmuş bir satırı **onarır** (`seed-sql.ts`in `DO UPDATE` gerekçesi).
 * **Deterministiktir** (K2) — rastgelelik kaynağı yok, girdi sabit.
 *
 * ⚠️ Bu fonksiyon **master tabloya yazıyor** ve bu K4'ün §3.4.1'de yazılı,
 * adıyla sayılmış istisnası. Oyun kodu bu yolu kullanamaz: `packages/engine`
 * ve `apps/web` `@fms/data-cli`yi import edemez (`arch:check` ① katman tablosu).
 */
export async function seedWorld(options: SeedWorldOptions): Promise<SeedWorldResult> {
  const {
    executor,
    logger,
    countries = SEED_COUNTRIES,
    competitions = SEED_COMPETITIONS,
  } = options;

  logger.info(
    { countries: countries.length, competitions: competitions.length },
    'seed.world.start',
  );

  const result = await executor.transaction(async (tx): Promise<SeedWorldResult> => {
    // Sıra bağlayıcı: yarışmaların `country_id`si bu satırlardan çözülüyor.
    const countryRows = await tx.rows<KeyRow>(buildCountriesUpsertSql(countries));
    const competitionRows = await tx.rows<KeyRow>(buildCompetitionsUpsertSql(competitions));

    return {
      countryKeys: countryRows.map((row) => row.key).sort(),
      competitionKeys: competitionRows.map((row) => row.key).sort(),
    };
  });

  logger.info(
    {
      countriesWritten: result.countryKeys.length,
      competitionsWritten: result.competitionKeys.length,
    },
    'seed.world.done',
  );

  return result;
}
