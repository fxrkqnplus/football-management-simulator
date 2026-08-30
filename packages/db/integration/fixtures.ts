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

/**
 * `players.id`yi KİŞİNİN anahtarından çözen iki kademeli alt sorgu (Faz 4.5).
 *
 * ⚠️ **AYRI BİR YARDIMCI, `idOf('players', 'key', …)` DEĞİL** — ve sebebi
 * yapısal: `players` `key` sütunu **taşımıyor** (§3.1.0'ın altı taşıyıcısı
 * arasında değil, uydu tablo). Bir oyuncuya testten erişmenin tek yolu kişisi.
 *
 * ⚠️ **G-17 TAM BURADA YAŞIYOR.** İki kademe var çünkü `people.id` ile
 * `players.id` **farklı** kimlikler ve ikisi de `integer`: iç sorgu kişiyi,
 * dış sorgu oyuncuyu veriyor. İç sorgu tek başına kullanılsaydı `player_id`
 * sütununa bir **kişi kimliği** yazılırdı, FK bunu yakalamazdı (o kimlikte bir
 * oyuncu büyük olasılıkla vardır — yalnızca yanlış oyuncudur) ve testler yeşil
 * kalırdı. Fonksiyonun adı ayrımı görünür tutuyor; tip seviyesinde kapanması
 * Faz 12'nin işi (G-17).
 */
const playerIdOfPerson = (personKey: string): string =>
  `(SELECT "id" FROM "players" WHERE "person_id" = (SELECT "id" FROM "people" WHERE "key" = ${quote(personKey)}))`;

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
  /**
   * 🆕 Faz 4.4 — kulüp başkanı (`people.key`). Verilmezse `null` = bilinmiyor.
   *
   * ⚠️ **`clubKey` gibi ZORUNLU DEĞİL ve bu kasıtlı:** sütun nullable, yani
   * *"başkanı bilinmiyor"* geçerli bir durum. Karşılaştır: `RefereeFixture.personKey`
   * **zorunlu**, çünkü `referees.person_id` `NOT NULL`.
   */
  readonly chairmanPersonKey?: string | null;
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
        idOf('people', 'key', row.chairmanPersonKey === undefined ? null : row.chairmanPersonKey),
      ].join(','),
    )
    .join('),\n      (');

  return `
    INSERT INTO "clubs"
      ("key","source","external_ids","competition_id","country_id","name","short_name",
       "abbreviation","founded_year","city","stadium_id","reputation","color_primary",
       "color_secondary","color_tertiary","crest_asset_id","crest_seed","supporter_count",
       "supporter_expectation","is_national","chairman_person_id")
    VALUES
      (${values})
  `;
}

/**
 * `federations` satırı — Faz 4.4'te fixture'a alındı.
 *
 * **Neden şimdi:** `federations` bugüne kadar testlerde ham `INSERT` ile
 * yazılıyordu ve iki yerde kopyası vardı. `0006` tabloya
 * `president_person_id`i ekliyor ve kopyalar aynı anda güncellenmek zorunda
 * kalırdı — dosyanın başlığındaki #23 kuralının tam olarak tarif ettiği durum
 * (*"bir düzeltme, hatanın görüldüğü yeri değil SINIFININ geçtiği her yeri
 * kapsar"*). Sınıf tek bir yere indiriliyor.
 *
 * `presidentPersonKey` verilmezse `null` — sütun nullable ve `ON DELETE SET NULL`
 * alan **tek** FK'nın kaynağı (bkz. `src/schema/federations.ts` başlığı).
 */
export interface FederationFixture {
  readonly countryCode: string;
  readonly name?: string;
  readonly foundedYear?: number | null;
  readonly assetId?: string | null;
  readonly presidentPersonKey?: string | null;
}

/** `federations`ın TÜM `NOT NULL` sütunlarını dolduran tek `INSERT` üretir. */
export function federationInsertSql(rows: readonly FederationFixture[]): string {
  const values = rows
    .map((row) =>
      [
        idOf('countries', 'code', row.countryCode),
        quote(row.name ?? `${row.countryCode} Futbol Federasyonu`),
        intOrNull(row.foundedYear === undefined ? 1923 : row.foundedYear),
        textOrNull(row.assetId === undefined ? null : row.assetId),
        idOf('people', 'key', row.presidentPersonKey === undefined ? null : row.presidentPersonKey),
      ].join(','),
    )
    .join('),\n      (');

  return `
    INSERT INTO "federations"
      ("country_id","name","founded_year","asset_id","president_person_id")
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

/**
 * `referees` satırı — altı nitelik 1-20.
 *
 * ⚠️ **`personKey` ZORUNLU (Faz 4.4).** `referees.person_id` `NOT NULL`: bir
 * hakem bir kişidir ve kişisiz bir hakem satırı yoktur. Diğer iki ileri FK
 * (`clubs.chairman_person_id`, `federations.president_person_id`) nullable, o
 * yüzden onların fixture alanları isteğe bağlı — üçü aynı migration'da geldi ama
 * üçü aynı sözleşmeyi taşımıyor.
 *
 * ✅ **`personKey`in gösterdiği kişi ARTIK `['referee']` TAŞIYOR (Faz 4.5, G-18
 * kapandı).** 4.4'te bu mümkün değildi: kapalı küme `player | staff | manager |
 * chairman` hakemi ifade etmiyordu ve CHECK boş diziyi de reddediyordu, yani
 * hakem kişileri `personInsertSql`in `['player']` varsayılanına düşüyordu —
 * *entegrasyon testlerindeki her hakem oyuncu olarak kayıtlıydı.* O gün bu bir
 * *"modelleme iddiası değil"* diye yazılmıştı ve doğruydu, ama SAPMA-026'nın
 * yasağı (*"kimsenin belirlemediği alana değer uydurma"*) yine de ihlal
 * ediliyordu — yalnızca yazılı olarak.
 *
 * `0008` kümeye `'referee'` ekledi. **Hakem kişisi yazan her fixture artık
 * `personType: ['referee']` verir** ve varsayılana düşmediği `schema-constraints`
 * testinde `referees ⋈ people` join'iyle ayrıca **iddia edilir** — bir
 * konvansiyonun koşan bir nöbetçisi olmazsa ateşlendiğinde hiçbir şey olmaz
 * (SAPMA-033).
 */
export interface RefereeFixture {
  readonly key: string;
  readonly countryCode: string;
  readonly personKey: string;
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
        idOf('people', 'key', row.personKey),
      ].join(','),
    )
    .join('),\n      (');

  return `
    INSERT INTO "referees"
      ("key","source","external_ids","country_id","strictness","foul_tolerance",
       "home_bias","consistency","advantage_play","big_game_experience","person_id")
    VALUES
      (${values})
  `;
}

/**
 * `people` satırı — Faz 4.3.
 *
 * ⚠️ `personType` bir **dizi** ve tipli literal ZORUNLU: çok satırlı bir
 * `VALUES` listesinde tipsiz bir `ARRAY[...]` ortak tip çözümünde `text[]`e
 * düşmeyebilir. Dosya başlığındaki kural (*"kaybolabilecek her tipe cast
 * yazılır"*) dizilerde de geçerli — ve burada bedeli daha ağır olurdu, çünkü
 * `person_type` sütunu bir CHECK taşıyor ve yanlış tip **kısıt hatası** olarak
 * görünürdü, tip hatası olarak değil.
 */
export interface PersonFixture {
  readonly key: string;
  readonly countryCode: string;
  readonly secondCountryCode?: string | null;
  readonly source?: string;
  readonly externalIds?: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly commonName?: string | null;
  readonly birthDate?: string;
  readonly birthCity?: string | null;
  readonly portraitAssetId?: string | null;
  readonly portraitSeed?: number;
  readonly gender?: string;
  readonly personType?: readonly string[];
}

/** `people`ın TÜM `NOT NULL` sütunlarını dolduran tek `INSERT` üretir. */
export function personInsertSql(rows: readonly PersonFixture[]): string {
  const values = rows
    .map((row) =>
      [
        quote(row.key),
        quote(row.source ?? 'pack'),
        `${quote(row.externalIds ?? '{}')}::jsonb`,
        quote(row.firstName ?? 'Ad'),
        quote(row.lastName ?? 'Soyad'),
        textOrNull(row.commonName === undefined ? null : row.commonName),
        `${quote(row.birthDate ?? '1998-03-14')}::date`,
        idOf('countries', 'code', row.countryCode),
        idOf(
          'countries',
          'code',
          row.secondCountryCode === undefined ? null : row.secondCountryCode,
        ),
        textOrNull(row.birthCity === undefined ? 'İstanbul' : row.birthCity),
        textOrNull(row.portraitAssetId === undefined ? null : row.portraitAssetId),
        String(row.portraitSeed ?? 1),
        quote(row.gender ?? 'male'),
        `ARRAY[${(row.personType ?? ['player']).map(quote).join(',')}]::text[]`,
      ].join(','),
    )
    .join('),\n      (');

  return `
    INSERT INTO "people"
      ("key","source","external_ids","first_name","last_name","common_name","birth_date",
       "nationality_country_id","second_nationality_country_id","birth_city",
       "portrait_asset_id","portrait_seed","gender","person_type")
    VALUES
      (${values})
  `;
}

/**
 * `players` satırı — Faz 4.3.
 *
 * `personKey` `people.key`i çözüyor, `clubKey` `clubs.key`i. `clubKey`
 * verilmezse oyuncu **serbest** (`club_id IS NULL`) — `spec/01`'in kendi
 * ifadesi ve `ON DELETE SET NULL`ın hedef durumu.
 */
export interface PlayerFixture {
  readonly personKey: string;
  readonly clubKey?: string | null;
  readonly squadNumber?: number | null;
  readonly primaryPosition?: string;
  readonly heightCm?: number;
  readonly weightKg?: number;
  readonly preferredFootRight?: number;
  readonly preferredFootLeft?: number;
  readonly currentAbility?: number;
  readonly potentialAbility?: number;
  readonly paRangeMin?: number;
  readonly paRangeMax?: number;
  readonly isNewgen?: boolean;
  readonly retiredAt?: string | null;
}

/** `players`ın TÜM `NOT NULL` sütunlarını dolduran tek `INSERT` üretir. */
export function playerInsertSql(rows: readonly PlayerFixture[]): string {
  const values = rows
    .map((row) =>
      [
        idOf('people', 'key', row.personKey),
        idOf('clubs', 'key', row.clubKey === undefined ? null : row.clubKey),
        intOrNull(row.squadNumber === undefined ? 10 : row.squadNumber),
        quote(row.primaryPosition ?? 'MC'),
        String(row.heightCm ?? 180),
        String(row.weightKg ?? 75),
        String(row.preferredFootRight ?? 18),
        String(row.preferredFootLeft ?? 8),
        String(row.currentAbility ?? 130),
        String(row.potentialAbility ?? 150),
        String(row.paRangeMin ?? 140),
        String(row.paRangeMax ?? 160),
        String(row.isNewgen ?? false),
        row.retiredAt == null ? 'NULL::date' : `${quote(row.retiredAt)}::date`,
      ].join(','),
    )
    .join('),\n      (');

  return `
    INSERT INTO "players"
      ("person_id","club_id","squad_number","primary_position","height_cm","weight_kg",
       "preferred_foot_right","preferred_foot_left","current_ability","potential_ability",
       "pa_range_min","pa_range_max","is_newgen","retired_at")
    VALUES
      (${values})
  `;
}

/**
 * `player_attributes` satırı — Faz 4.5. **47 sütunluk `INSERT` YALNIZCA BURADA.**
 *
 * ⚠️ Bu fonksiyonun var olma sebebi günlük **#28**: `0001` altı `NOT NULL` sütun
 * ekledi, üç ayrı dosyadaki `INSERT` kopyaları bir anda geçersizleşti ve **14
 * test** kırıldı. 47 sütunluk bir `INSERT` dağıtılsaydı, 48'inci sütunu ekleyen
 * gün üç dosyayı birden düzeltmek gerekirdi.
 *
 * ⚠️ **Alan adları `VISIBLE_ATTRIBUTES`ten TÜRETİLMİYOR ve bu kasıtlı.** Sabitten
 * türetilseydi, sabitin kendisi bozulduğunda fixture da onunla birlikte bozulur
 * ve `player-attributes.test.ts`in envanter iddiası **fixture tarafından
 * doğrulanmış gibi** görünürdü. Burada sütun adları bağımsız yazılıyor: iki
 * liste ayrışırsa `INSERT` gürültülü patlar (`column "..." does not exist`).
 *
 * Değerler bir **profil** taşıyor, hepsi aynı sayı değil: bir orta saha
 * oyuncusunun makul dağılımı (kaleci nitelikleri 1-3 arasında, `spec/02` §4.1'in
 * kendi kuralı). Hepsi 10 olsaydı, sütun sırası karışsa bile hiçbir test ötmezdi.
 */
export interface PlayerAttributesFixture {
  readonly personKey: string;
  /** Tüm SAHA niteliklerini tek seferde ezer — kaleci nitelikleri hariç. */
  readonly outfieldOverride?: number;
  /** Tüm KALECİ niteliklerini tek seferde ezer. */
  readonly goalkeepingOverride?: number;
  /** Transfer arama testleri için tek tek ezilebilen üç sütun (Faz 4.8'in tüketicileri). */
  readonly finishing?: number;
  readonly passing?: number;
  readonly pace?: number;
}

export function playerAttributesInsertSql(rows: readonly PlayerAttributesFixture[]): string {
  const values = rows
    .map((row) => {
      const out = (value: number): string => String(row.outfieldOverride ?? value);
      const gk = (value: number): string => String(row.goalkeepingOverride ?? value);
      return [
        playerIdOfPerson(row.personKey),
        // Teknik (14)
        out(9),
        out(12),
        out(14),
        String(row.finishing ?? row.outfieldOverride ?? 11),
        out(15),
        out(8),
        out(10),
        out(11),
        out(6),
        out(9),
        String(row.passing ?? row.outfieldOverride ?? 16),
        out(12),
        out(10),
        out(15),
        // Zihinsel (14)
        out(11),
        out(13),
        out(10),
        out(14),
        out(13),
        out(15),
        out(16),
        out(12),
        out(9),
        out(13),
        out(12),
        out(15),
        out(16),
        out(14),
        // Fiziksel (8)
        out(13),
        out(14),
        out(12),
        out(10),
        out(15),
        String(row.pace ?? row.outfieldOverride ?? 13),
        out(16),
        out(11),
        // Kaleci (11) — saha oyuncusunda 1-3 (`spec/02` §4.1)
        gk(2),
        gk(1),
        gk(3),
        gk(2),
        gk(1),
        gk(3),
        gk(2),
        gk(1),
        gk(2),
        gk(3),
        gk(1),
      ].join(',');
    })
    .join('),\n      (');

  return `
    INSERT INTO "player_attributes"
      ("player_id",
       "corners","crossing","dribbling","finishing","first_touch","free_kick_taking",
       "heading","long_shots","long_throws","marking","passing","penalty_taking",
       "tackling","technique",
       "aggression","anticipation","bravery","composure","concentration","decisions",
       "determination","flair","leadership","off_the_ball","positioning","teamwork",
       "vision","work_rate",
       "acceleration","agility","balance","jumping_reach","natural_fitness","pace",
       "stamina","strength",
       "aerial_reach","command_of_area","communication","eccentricity","handling",
       "kicking","one_on_ones","reflexes","rushing_out","tendency_to_punch","throwing")
    VALUES
      (${values})
  `;
}

/**
 * `player_hidden_attributes` satırı — Faz 4.5. **10 sütunluk `INSERT` tek yerde.**
 *
 * Değerler yine bir profil: `professionalism` yüksek, `dirtiness` düşük — yani
 * `spec/02` §4.6'nın `derivePersonality` zincirinde ayırt edilebilir bir kişilik
 * üretecek bir satır. Faz 10 bu fixture'ı bir başlangıç noktası olarak
 * kullanabilir; hepsi 10 olan bir satır orada hiçbir kuralı ayırt etmezdi.
 */
export interface PlayerHiddenAttributesFixture {
  readonly personKey: string;
  readonly override?: number;
  readonly injuryProneness?: number;
}

export function playerHiddenAttributesInsertSql(
  rows: readonly PlayerHiddenAttributesFixture[],
): string {
  const values = rows
    .map((row) => {
      const v = (value: number): string => String(row.override ?? value);
      return [
        playerIdOfPerson(row.personKey),
        v(15),
        v(13),
        String(row.injuryProneness ?? row.override ?? 6),
        v(4),
        v(14),
        v(17),
        v(12),
        v(11),
        v(9),
        v(16),
      ].join(',');
    })
    .join('),\n      (');

  return `
    INSERT INTO "player_hidden_attributes"
      ("player_id","consistency","important_matches","injury_proneness","dirtiness",
       "pressure","professionalism","ambition","loyalty","adaptability","temperament")
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
