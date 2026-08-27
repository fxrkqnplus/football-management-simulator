/**
 * Entegrasyon testlerinin ORTAK fixture'ları.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN VAR — ölçülmüş bir bedelden doğdu (Faz 3.4)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `0001` `countries`e sekiz sütun ekledi, sekizinin altısı `NOT NULL`. O anda
 * **üç ayrı entegrasyon dosyasındaki** `INSERT INTO "countries" (…)` satırları
 * bir anda geçersizleşti ve `pnpm test:db` 14 test birden kırıldı. Satırlar
 * birbirinin kopyasıydı — yani tek bir gerçeğin üç yerde yaşayan üç kopyası.
 *
 * `PROJECT_MEMORY.md` günlük #23'ün kuralı: *"bir düzeltme, hatanın görüldüğü
 * yeri değil SINIFININ geçtiği her yeri kapsar"*. Burada bir adım öteye
 * gidiliyor: sınıf tek bir yere indiriliyor ki bir dahaki sefere üç yer
 * olmasın. `0002` yeni bir `NOT NULL` sütun eklediğinde düzeltilecek tek yer
 * bu dosya olacak.
 *
 * **Faz 3.5'te sınandı ve tuttu:** `0002` beş tablo getirdi, `clubs` tek başına
 * on beş `NOT NULL` sütun taşıyor. Tek bir `INSERT` kopyası testlere dağılmadı;
 * beş yeni fixture da buraya yazıldı.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ TİPLİ `NULL` VE TİPLİ CAST ZORUNLU — günlük #24'ün genişlemiş hâli
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Çok satırlı bir `VALUES` listesinde PostgreSQL sütunun ortak tipini **önce**
 * çözüyor. `jsonb` literalleri bu yüzden `::jsonb` alıyordu (#24). `0002` aynı
 * sınıfı iki yeni biçimde getiriyor:
 *
 * - Bir sütunun **her satırı `NULL`** ise tip `unknown` → `text`e düşer;
 *   `text` → `integer` örtük ataması **yok** ve `INSERT` patlar. Bu yüzden
 *   nullable tamsayı sütunlarına `NULL::integer` yazılıyor.
 * - Yabancı anahtarlar skaler alt sorguyla (`(SELECT "id" FROM …)`) çözülüyor;
 *   alt sorgunun tipi kesin olduğu için o taraf sorun çıkarmıyor — ama aynı
 *   sütunun `NULL` olan satırı yine tiplenmek zorunda.
 *
 * Dize sütunlarında (`char`, `text`) sorun yok: `text` → `char(n)` ataması var.
 * Kural yine de basit tutuldu — **kaybolabilecek her tipe cast yazılır**.
 *
 * ⚠️ Bu dosya `.itest.ts` DEĞİL — Vitest'in `integration/**\/*.itest.ts` deseni
 * onu bir test dosyası olarak toplamaz. `tsconfig.json` `integration/**\/*`
 * kapsadığı için tip denetiminin İÇİNDE, `tsconfig.build.json` `integration`ı
 * dışladığı için `dist/`in DIŞINDA.
 */
import { createFileMigrationSource } from '../src/migrate/file-source.js';
import { orderJournalEntries, parseMigrationJournal } from '../src/migrate/journal.js';

const quote = (value: string): string => `'${value.replace(/'/g, "''")}'`;

/**
 * `countries` satırı — yalnızca sınanan alanlar dışarıdan veriliyor.
 *
 * Geri kalanı geçerli bir varsayılan alıyor: bir negatif testte reddin sebebi
 * **tek** olmalı, yoksa test kendi fixture'ının eksikliğini ölçer (3.2b
 * günlük #17).
 */
export interface CountryFixture {
  readonly key: string;
  readonly code: string;
  readonly nameKey?: string;
  readonly source?: string;
  readonly externalIds?: string;
  readonly confederation?: string;
  readonly flagAssetId?: string | null;
  readonly footballLevel?: number;
  readonly uefaCoefficient?: string;
  readonly currencyCode?: string;
  readonly workPermitRuleKey?: string;
}

/** `countries`in TÜM `NOT NULL` sütunlarını dolduran tek `INSERT` üretir. */
export function countryInsertSql(rows: readonly CountryFixture[]): string {
  const values = rows
    .map((row) =>
      [
        quote(row.key),
        quote(row.code),
        quote(row.nameKey ?? `country.${row.key}`),
        quote(row.source ?? 'pack'),
        `${quote(row.externalIds ?? '{}')}::jsonb`,
        quote(row.confederation ?? 'UEFA'),
        row.flagAssetId == null ? 'NULL' : quote(row.flagAssetId),
        String(row.footballLevel ?? 50),
        quote(row.uefaCoefficient ?? '10.000'),
        quote(row.currencyCode ?? 'EUR'),
        quote(row.workPermitRuleKey ?? 'none'),
      ].join(','),
    )
    .join('),\n      (');

  return `
    INSERT INTO "countries"
      ("key","code","name_key","source","external_ids","confederation","flag_asset_id",
       "football_level","uefa_coefficient","currency_code","work_permit_rule_key")
    VALUES
      (${values})
  `;
}

/** Nullable tamsayı — tipli `NULL` (bkz. dosya başlığındaki #24 notu). */
const intOrNull = (value: number | null | undefined): string =>
  value == null ? 'NULL::integer' : String(value);

/** Nullable dize — tipli `NULL`; `char(n)` sütunlarına atama castı mevcut. */
const textOrNull = (value: string | null | undefined): string =>
  value == null ? 'NULL::text' : quote(value);

/** Bir varlığın kimliğini anahtarından çözen skaler alt sorgu. */
const idOf = (table: string, column: string, value: string | null | undefined): string =>
  value == null
    ? 'NULL::integer'
    : `(SELECT "id" FROM "${table}" WHERE "${column}" = ${quote(value)})`;

/** `stadiums` satırı — yalnızca sınanan alanlar dışarıdan veriliyor. */
export interface StadiumFixture {
  readonly key: string;
  readonly name?: string;
  readonly city?: string;
  readonly source?: string;
  readonly externalIds?: string;
  readonly capacity?: number;
  readonly seatedCapacity?: number;
  readonly pitchQuality?: number;
  readonly builtYear?: number | null;
  readonly assetId?: string | null;
}

/** `stadiums`in TÜM `NOT NULL` sütunlarını dolduran tek `INSERT` üretir. */
export function stadiumInsertSql(rows: readonly StadiumFixture[]): string {
  const values = rows
    .map((row) =>
      [
        quote(row.key),
        quote(row.source ?? 'pack'),
        `${quote(row.externalIds ?? '{}')}::jsonb`,
        quote(row.name ?? `Stadyum ${row.key}`),
        quote(row.city ?? 'İstanbul'),
        String(row.capacity ?? 50_000),
        String(row.seatedCapacity ?? 48_000),
        String(row.pitchQuality ?? 15),
        intOrNull(row.builtYear === undefined ? 2011 : row.builtYear),
        textOrNull(row.assetId === undefined ? null : row.assetId),
      ].join(','),
    )
    .join('),\n      (');

  return `
    INSERT INTO "stadiums"
      ("key","source","external_ids","name","city","capacity","seated_capacity",
       "pitch_quality","built_year","asset_id")
    VALUES
      (${values})
  `;
}

/**
 * `clubs` satırı.
 *
 * Yabancı anahtarlar **anahtarla** veriliyor (`countryCode` · `competitionKey` ·
 * `stadiumKey`) ve skaler alt sorguyla çözülüyor; testin sabit bir `id`
 * varsayması gerekmiyor. `competitionKey`/`stadiumKey` **`null` verilebilir** —
 * milli takım vakası (Faz 41) ve iki sütunun nullable olma sebebi.
 */
export interface ClubFixture {
  readonly key: string;
  readonly countryCode: string;
  readonly competitionKey?: string | null;
  readonly stadiumKey?: string | null;
  readonly source?: string;
  readonly externalIds?: string;
  readonly name?: string;
  readonly shortName?: string;
  readonly abbreviation?: string;
  readonly foundedYear?: number | null;
  readonly city?: string;
  readonly reputation?: number;
  readonly colorPrimary?: string;
  readonly colorSecondary?: string;
  readonly colorTertiary?: string | null;
  readonly crestAssetId?: string | null;
  readonly crestSeed?: number;
  readonly supporterCount?: number;
  readonly supporterExpectation?: number;
  readonly isNational?: boolean;
}

/** `clubs`un TÜM `NOT NULL` sütunlarını dolduran tek `INSERT` üretir. */
export function clubInsertSql(rows: readonly ClubFixture[]): string {
  const values = rows
    .map((row) =>
      [
        quote(row.key),
        quote(row.source ?? 'pack'),
        `${quote(row.externalIds ?? '{}')}::jsonb`,
        idOf('competitions', 'key', row.competitionKey === undefined ? null : row.competitionKey),
        idOf('countries', 'code', row.countryCode),
        quote(row.name ?? row.key),
        quote(row.shortName ?? row.key),
        quote(row.abbreviation ?? row.key.slice(0, 3).toUpperCase().padEnd(3, 'X')),
        intOrNull(row.foundedYear === undefined ? 1905 : row.foundedYear),
        quote(row.city ?? 'İstanbul'),
        idOf('stadiums', 'key', row.stadiumKey === undefined ? null : row.stadiumKey),
        String(row.reputation ?? 120),
        quote(row.colorPrimary ?? '#A90432'),
        quote(row.colorSecondary ?? '#FBB800'),
        textOrNull(row.colorTertiary === undefined ? null : row.colorTertiary),
        textOrNull(row.crestAssetId === undefined ? null : row.crestAssetId),
        String(row.crestSeed ?? 1),
        String(row.supporterCount ?? 1_000_000),
        String(row.supporterExpectation ?? 70),
        String(row.isNational ?? false),
      ].join(','),
    )
    .join('),\n      (');

  return `
    INSERT INTO "clubs"
      ("key","source","external_ids","competition_id","country_id","name","short_name",
       "abbreviation","founded_year","city","stadium_id","reputation","color_primary",
       "color_secondary","color_tertiary","crest_asset_id","crest_seed","supporter_count",
       "supporter_expectation","is_national")
    VALUES
      (${values})
  `;
}

/** `club_facilities` satırı — altı tesis düzeyi, hepsi 1-20. */
export interface ClubFacilitiesFixture {
  readonly clubKey: string;
  readonly trainingGround?: number;
  readonly youthAcademy?: number;
  readonly youthRecruitment?: number;
  readonly medicalCentre?: number;
  readonly dataAnalysis?: number;
  readonly stadiumQuality?: number;
}

export function clubFacilitiesInsertSql(rows: readonly ClubFacilitiesFixture[]): string {
  const values = rows
    .map((row) =>
      [
        idOf('clubs', 'key', row.clubKey),
        String(row.trainingGround ?? 16),
        String(row.youthAcademy ?? 15),
        String(row.youthRecruitment ?? 14),
        String(row.medicalCentre ?? 15),
        String(row.dataAnalysis ?? 12),
        String(row.stadiumQuality ?? 17),
      ].join(','),
    )
    .join('),\n      (');

  return `
    INSERT INTO "club_facilities"
      ("club_id","training_ground","youth_academy","youth_recruitment","medical_centre",
       "data_analysis","stadium_quality")
    VALUES
      (${values})
  `;
}

/**
 * `club_finances_base` satırı — tutarlar **kuruş/cent** cinsinden.
 *
 * Değerler `bigint | string` alıyor, `number` **almıyor**: bir fixture'ın kendisi
 * 2⁵³ üstünü `number` ile taşıyamaz ve testin ölçmek istediği hassasiyeti daha
 * SQL'e ulaşmadan kaybederdi.
 */
export interface ClubFinancesFixture {
  readonly clubKey: string;
  readonly balance?: bigint | string;
  readonly transferBudget?: bigint | string;
  readonly wageBudget?: bigint | string;
  readonly matchdayIncomeAnnual?: bigint | string;
  readonly tvIncomeAnnual?: bigint | string;
  readonly sponsorIncomeAnnual?: bigint | string;
  readonly merchandiseIncomeAnnual?: bigint | string;
  readonly currencyCode?: string;
}

export function clubFinancesInsertSql(rows: readonly ClubFinancesFixture[]): string {
  const money = (value: bigint | string | undefined, fallback: string): string =>
    `${String(value ?? fallback)}::bigint`;

  const values = rows
    .map((row) =>
      [
        idOf('clubs', 'key', row.clubKey),
        money(row.balance, '4500000000'),
        money(row.transferBudget, '2200000000'),
        money(row.wageBudget, '420000000'),
        money(row.matchdayIncomeAnnual, '900000000'),
        money(row.tvIncomeAnnual, '1800000000'),
        money(row.sponsorIncomeAnnual, '1100000000'),
        money(row.merchandiseIncomeAnnual, '600000000'),
        quote(row.currencyCode ?? 'TRY'),
      ].join(','),
    )
    .join('),\n      (');

  return `
    INSERT INTO "club_finances_base"
      ("club_id","balance","transfer_budget","wage_budget","matchday_income_annual",
       "tv_income_annual","sponsor_income_annual","merchandise_income_annual","currency_code")
    VALUES
      (${values})
  `;
}

/** `rivalries` satırı — iki taraf da anahtarla veriliyor. */
export interface RivalryFixture {
  readonly clubAKey: string;
  readonly clubBKey: string;
  readonly intensity?: number;
  readonly nameKey?: string | null;
}

export function rivalryInsertSql(rows: readonly RivalryFixture[]): string {
  const values = rows
    .map((row) =>
      [
        idOf('clubs', 'key', row.clubAKey),
        idOf('clubs', 'key', row.clubBKey),
        String(row.intensity ?? 10),
        textOrNull(row.nameKey === undefined ? null : row.nameKey),
      ].join(','),
    )
    .join('),\n      (');

  return `
    INSERT INTO "rivalries" ("club_a_id","club_b_id","intensity","name_key")
    VALUES
      (${values})
  `;
}

/** `kit_templates` satırı — oyunun kendi şablonu, pakette değil. */
export interface KitTemplateFixture {
  readonly code: string;
  readonly nameKey?: string;
  readonly svgPath?: string;
  readonly colorSlots?: number;
}

export function kitTemplateInsertSql(rows: readonly KitTemplateFixture[]): string {
  const values = rows
    .map((row) =>
      [
        quote(row.code),
        quote(row.nameKey ?? `kit.template.${row.code}`),
        quote(row.svgPath ?? `kits/templates/${row.code}.svg`),
        String(row.colorSlots ?? 2),
      ].join(','),
    )
    .join('),\n      (');

  return `
    INSERT INTO "kit_templates" ("code","name_key","svg_path","color_slots")
    VALUES
      (${values})
  `;
}

/**
 * `club_kits` satırı.
 *
 * `assetId` **verilmezse `null`** — ve bu bir eksiklik değil: prosedürel yedek
 * her zaman var (`template_id` NOT NULL), `null` yalnızca *"paket görsel
 * taşımıyor"* demek (K9).
 */
export interface ClubKitFixture {
  readonly clubKey: string;
  readonly templateCode: string;
  readonly kitType?: string;
  readonly color1?: string;
  readonly color2?: string;
  readonly color3?: string | null;
  readonly assetId?: string | null;
}

export function clubKitInsertSql(rows: readonly ClubKitFixture[]): string {
  const values = rows
    .map((row) =>
      [
        idOf('clubs', 'key', row.clubKey),
        quote(row.kitType ?? 'home'),
        idOf('kit_templates', 'code', row.templateCode),
        quote(row.color1 ?? '#A90432'),
        quote(row.color2 ?? '#FBB800'),
        textOrNull(row.color3 === undefined ? null : row.color3),
        textOrNull(row.assetId === undefined ? null : row.assetId),
      ].join(','),
    )
    .join('),\n      (');

  return `
    INSERT INTO "club_kits"
      ("club_id","kit_type","template_id","color1","color2","color3","asset_id")
    VALUES
      (${values})
  `;
}

/** `referees` satırı — altı nitelik 1-20, `person_id` YOK (Faz 4). */
export interface RefereeFixture {
  readonly key: string;
  readonly countryCode: string;
  readonly source?: string;
  readonly externalIds?: string;
  readonly strictness?: number;
  readonly foulTolerance?: number;
  readonly homeBias?: number;
  readonly consistency?: number;
  readonly advantagePlay?: number;
  readonly bigGameExperience?: number;
}

export function refereeInsertSql(rows: readonly RefereeFixture[]): string {
  const values = rows
    .map((row) =>
      [
        quote(row.key),
        // Hakemler v1'de PROSEDÜREL üretiliyor: pakette `referees.json` yok
        // (`spec/12` §17.2'de ölçüldü), o yüzden varsayılan köken `procedural`.
        quote(row.source ?? 'procedural'),
        `${quote(row.externalIds ?? '{}')}::jsonb`,
        idOf('countries', 'code', row.countryCode),
        String(row.strictness ?? 12),
        String(row.foulTolerance ?? 11),
        String(row.homeBias ?? 10),
        String(row.consistency ?? 14),
        String(row.advantagePlay ?? 13),
        String(row.bigGameExperience ?? 9),
      ].join(','),
    )
    .join('),\n      (');

  return `
    INSERT INTO "referees"
      ("key","source","external_ids","country_id","strictness","foul_tolerance",
       "home_bias","consistency","advantage_play","big_game_experience")
    VALUES
      (${values})
  `;
}

/**
 * Gerçek migration zincirinin etiketleri — journal'dan **okunuyor**.
 *
 * Koşucunun davranışını sınayan testler (`runner.itest.ts`) "hangi etiketler
 * uygulandı" diye soruyor; bunu elle yazılmış bir listeye bağlamak, her yeni
 * migration'da alakasız testleri kırar ve o kırılma hiçbir şey öğretmez.
 * Journal burada *test edilen şey* değil, **girdi**.
 *
 * ⚠️ Şema İÇERİĞİNİ sınayan testler (`round-trip`, `schema-constraints`) bunu
 * kullanmaz: orada beklenen tablo ve sütun adları AÇIKÇA yazılır, çünkü test
 * edilen şey tam olarak onlardır.
 */
export async function chainTags(drizzleDir: string): Promise<readonly string[]> {
  const source = createFileMigrationSource(drizzleDir);
  const journal = parseMigrationJournal(await source.readJournal());
  return orderJournalEntries(journal).map((entry) => entry.tag);
}
