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
 * ⚠️ **4.9'DA ZİNCİR İKİDEN DÖRDE ÇIKTI ve bağ güçlendi:**
 * `people.nationality_country_id` ile `players.person_id` ikisi de **`NOT NULL`**
 * — yani sıra bozulursa hata **gürültülü** patlıyor. `competitions.country_id`
 * nullable olduğu için aynı hata orada **sessiz** geçerdi ve deliği kapatan şey
 * bir test (`world-seed-data.test.ts`in `countryKey` iddiası). Fark yapısal ve
 * yazılı olması gerekiyor: aynı desen iki farklı güvence seviyesi veriyor.
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

import { generatePlayerSeeds } from './player-generator.js';
import type { PersonSeed, PlayerSeed } from './player-seed-data.js';
import {
  buildCompetitionsUpsertSql,
  buildCountriesUpsertSql,
  buildPeopleUpsertSql,
  buildPlayersUpsertSql,
} from './seed-sql.js';
import type { CompetitionSeed, CountrySeed } from './world-seed-data.js';
import { SEED_COMPETITIONS, SEED_COUNTRIES } from './world-seed-data.js';

export interface SeedWorldOptions {
  readonly executor: SqlExecutor;
  readonly logger: Logger;
  /** Varsayılan `SEED_COUNTRIES`. Testler kendi kümelerini verebilsin diye açık. */
  readonly countries?: readonly CountrySeed[];
  /** Varsayılan `SEED_COMPETITIONS`. */
  readonly competitions?: readonly CompetitionSeed[];
  /** Varsayılan `generatePlayerSeeds().people` (5.000) — Faz 4.9. */
  readonly people?: readonly PersonSeed[];
  /** Varsayılan `generatePlayerSeeds().players` (5.000) — Faz 4.9. */
  readonly players?: readonly PlayerSeed[];
}

export interface SeedWorldResult {
  /** Veritabanının `RETURNING` ile bildirdiği ülke anahtarları — sıralı. */
  readonly countryKeys: readonly string[];
  /** Veritabanının `RETURNING` ile bildirdiği yarışma anahtarları — sıralı. */
  readonly competitionKeys: readonly string[];
  /** Veritabanının `RETURNING` ile bildirdiği kişi anahtarları — sıralı. */
  readonly peopleKeys: readonly string[];
  /**
   * Veritabanının `RETURNING` ile bildirdiği `person_id`ler — **sayısal**
   * sıralı. `players` `key` taşımadığı için çakışma sütunu `person_id` ve
   * dönen değer bir tamsayı; dizge sıralaması `10 < 9` derdi.
   */
  readonly playerPersonIds: readonly number[];
}

interface KeyRow {
  readonly key: string;
}

interface PersonIdRow {
  readonly person_id: number;
}

/**
 * Dünya çekirdeğini yazar: 6 ülke + 11 yarışma (6 lig + 5 kupa) + **5.000 kişi
 * ve 5.000 oyuncu** (Faz 4.9, kabul kriteri 1).
 *
 * **İdempotenttir** — aynı veriyle iki kez koşmak satır sayısını değiştirmez ve
 * elle bozulmuş bir satırı **onarır** (`seed-sql.ts`in `DO UPDATE` gerekçesi).
 * **Deterministiktir** (K2) — rastgelelik kaynağı yok: ülke/yarışma verisi
 * sabit, oyuncu verisi **satır indeksinden saf olarak türetiliyor**
 * (`player-generator.ts`).
 *
 * ⚠️ Bu fonksiyon **master tabloya yazıyor** ve bu K4'ün §3.4.1'de yazılı,
 * adıyla sayılmış istisnası. Oyun kodu bu yolu kullanamaz: `packages/engine`
 * ve `apps/web` `@fms/data-cli`yi import edemez (`arch:check` ① katman tablosu).
 */
export async function seedWorld(options: SeedWorldOptions): Promise<SeedWorldResult> {
  // ⚠️ Jeneratör YALNIZCA varsayılan gerektiğinde koşuyor. Testler kendi
  // kümelerini verdiğinde 5.000 satırlık üretimi ödemek gereksiz olurdu — ve
  // `??` sağ tarafını yalnızca `undefined` durumunda değerlendiriyor.
  const defaults = (): { people: readonly PersonSeed[]; players: readonly PlayerSeed[] } =>
    generatePlayerSeeds();

  const {
    executor,
    logger,
    countries = SEED_COUNTRIES,
    competitions = SEED_COMPETITIONS,
  } = options;

  const generated =
    options.people === undefined || options.players === undefined ? defaults() : null;
  const people = options.people ?? generated?.people ?? [];
  const players = options.players ?? generated?.players ?? [];

  logger.info(
    {
      countries: countries.length,
      competitions: competitions.length,
      people: people.length,
      players: players.length,
    },
    'seed.world.start',
  );

  const result = await executor.transaction(async (tx): Promise<SeedWorldResult> => {
    // ⚠️ SIRA BAĞLAYICI VE ÜÇ ADIMI DA BİR ÖNCEKİNE DAYANIYOR:
    //   `competitions.country_id`         ← `countries` (nullable, hata SESSİZ)
    //   `people.nationality_country_id`   ← `countries` (NOT NULL, hata GÜRÜLTÜLÜ)
    //   `players.person_id`               ← `people`    (NOT NULL, hata GÜRÜLTÜLÜ)
    // Üçü tek işlemde: ikincisi patlarsa veritabanı yarım seed edilmiş kalmaz.
    const countryRows = await tx.rows<KeyRow>(buildCountriesUpsertSql(countries));
    const competitionRows = await tx.rows<KeyRow>(buildCompetitionsUpsertSql(competitions));

    // Boş küme için ifade üretilmiyor: `INSERT … VALUES` gövdesiz SQL sözdizimi
    // hatası verir. Testler `people: []` verebildiği için bu bir yol, bir uç
    // durum değil.
    const peopleRows =
      people.length === 0 ? [] : await tx.rows<KeyRow>(buildPeopleUpsertSql(people));
    const playerRows =
      players.length === 0 ? [] : await tx.rows<PersonIdRow>(buildPlayersUpsertSql(players));

    return {
      countryKeys: countryRows.map((row) => row.key).sort(),
      competitionKeys: competitionRows.map((row) => row.key).sort(),
      peopleKeys: peopleRows.map((row) => row.key).sort(),
      // Sayısal sıralama — `RETURNING` sırası PostgreSQL'in garantisi değil,
      // ve `sort()` varsayılanı DİZGE sıralaması yapar (`10 < 9`).
      playerPersonIds: playerRows.map((row) => row.person_id).sort((a, b) => a - b),
    };
  });

  logger.info(
    {
      countriesWritten: result.countryKeys.length,
      competitionsWritten: result.competitionKeys.length,
      peopleWritten: result.peopleKeys.length,
      playersWritten: result.playerPersonIds.length,
    },
    'seed.world.done',
  );

  return result;
}
