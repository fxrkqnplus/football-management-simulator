/**
 * SEED'İN YAZMA YOLU — ham SQL, `SqlExecutor` üzerinden.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN `db.writable` DEĞİL — K4'ün AÇIK istisnası
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `docs/spec/01-database.md` §3.4.1'in *"Ne korunuyor, ne korunmuyor"* tablosu
 * bu hattı **adıyla** sayıyor: *"Seed / veri aracı (`tools/data-cli`, Faz 3.8)
 * — **AÇIK** — master veriyi dolduran hat."* Yani burada yeni bir istisna icat
 * edilmiyor, **yazılı olan** kullanılıyor.
 *
 * `db.writable` yapısal olarak kullanılamaz: master tablo verildiğinde parametre
 * tipi `never` (`packages/db/src/client/world-db.ts`). Zorlamak `as unknown as`
 * yazmak demekti — ve o, §3.4.1'in saydığı **üç K4 atlama yolundan biri**.
 * Bilerek bir tane yazmak, `arch:check` ⑨'un varlık sebebi olan ayrımı
 * (*"unuttum" ile "bilerek" arasındaki fark*) siler.
 *
 * ⚠️ **BEDELİ DÜRÜSTÇE: ham SQL'de sütun adları tip denetimi GÖRMEZ.**
 * `"uefa_coeficient"` yazılsa `tsc` sessiz kalır. Bu delik kapatıldı ve
 * kapatılma biçimi ölçülebilir: `seed-sql.test.ts` sütun listesini Drizzle'ın
 * `getTableColumns()` metadatasıyla **karşılaştırıyor** —
 *   ① seed'in yazdığı her sütun tabloda gerçekten var mı
 *   ② tablonun `NOT NULL` + varsayılansız her sütununu seed yazıyor mu
 * İkincisi asıl nöbetçi: Faz 4 bu tablolara `NOT NULL` bir sütun eklerse test
 * **kırılır**, seed sessizce eksik yazmaya devam etmez. 3.7 günlük #37'nin
 * dersi (*"şemada kaybolan şeyin nöbetçisi derleyici değil"*) buraya uygulandı.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * SÜTUN LİSTESİ TEK YERDE: `INSERT` ve `DO UPDATE SET` AYRIŞAMAZ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Bir upsert aynı sütun kümesini **iki kez** sayar: `INSERT (…)` listesinde ve
 * `ON CONFLICT … DO UPDATE SET` listesinde. Elle yazılsalardı yedinci sütun
 * eklendiği gün biri güncellenip diğeri unutulabilirdi — ve sonuç **sessiz**
 * olurdu: satır eklenir ama güncellenmez, yani seed ikinci koşuda o sütunu
 * onarmaz. `data-pack-columns.ts`in `DATA_SOURCES` gerekçesiyle aynı sınıf
 * (`arch:check` ⑧'in doğuş sebebi). Burada iki liste de **tek bir `bindings`
 * dizisinden** türetiliyor; ayrışmaları yapısal olarak imkânsız.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * TİPLİ `NULL` VE TİPLİ CAST — ölçülmüş bir tuzak (günlük #24)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Çok satırlı bir `VALUES` listesinde PostgreSQL sütunun ortak tipini **önce**
 * çözüyor; hepsi tırnaklı literal olan bir sütun `unknown` → **`text`**e düşüyor
 * ve `text` → `jsonb` örtük ataması **yok**. Aynı sınıf `NULL` sütunlarda da
 * geçerli. Kural: **kaybolabilecek her tipe cast yazılır** (`::jsonb`,
 * `::numeric`, `NULL::integer`, `NULL::text`).
 *
 * ⚠️ `packages/db/integration/fixtures.ts` aynı deseni taşıyor ama **kopyalanmadı**
 * ve kopyalanmamalı: o **test** kodu ve test-özel varsayılanlar taşıyor
 * (`?? 'pack'`, `?? 'İstanbul'`). Ortak olan şey fonksiyon değil **desen**; bir
 * fixture'ı ingest hattına taşımak o varsayılanları üretim verisine sürüklerdi.
 * 3.4'te bir kopyalama 14 test kırmıştı (günlük #28) — ders, kopyalamanın kendisi.
 */
import { competitionRulesSchema, externalIdsSchema } from '@fms/db';

import type { PersonSeed, PlayerSeed } from './player-seed-data.js';
import type { CompetitionSeed, CountrySeed } from './world-seed-data.js';
import { competitionNameKey, countryNameKey, SEED_SOURCE } from './world-seed-data.js';

/**
 * Tek tırnak kaçışı — SQL literali.
 *
 * Seed verisi repoda sabit ve dışarıdan girdi almıyor, yani bu bir enjeksiyon
 * savunması **değil**; `Kupası` gibi kesme işareti taşıyabilecek adların
 * doğru yazılması için. Yine de kural istisnasız uygulanıyor: dizge üreten
 * tek kapı bu, ve Faz 8 aynı hattı gerçek paket verisiyle besleyecek.
 */
export function quote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/** `jsonb` literali — cast ZORUNLU (günlük #24). */
export function jsonbLiteral(value: unknown): string {
  return `${quote(JSON.stringify(value))}::jsonb`;
}

/** `numeric` literali — dizge olarak taşınır, kayan noktaya çevrilmez. */
export function numericLiteral(value: string): string {
  return `${quote(value)}::numeric`;
}

/** Nullable tamsayı — tipli `NULL`. */
export function intOrNull(value: number | null): string {
  return value === null ? 'NULL::integer' : String(value);
}

/** Nullable dize — tipli `NULL`. */
export function textOrNull(value: string | null): string {
  return value === null ? 'NULL::text' : quote(value);
}

/**
 * `date` literali — cast ZORUNLU, `jsonb` ile aynı sebeple (günlük #24).
 *
 * Çok satırlı bir `VALUES` listesinde hepsi tırnaklı literal olan bir sütun
 * `unknown` → **`text`**e düşüyor. `text` → `date` ataması `INSERT` bağlamında
 * çalışır ama kural burada da istisnasız uygulanıyor: **kaybolabilecek her tipe
 * cast yazılır.** Bir sütunun bugün örtük çevrimi olması yarın da olacağı
 * anlamına gelmez ve fark sessiz olurdu.
 */
export function dateLiteral(value: string): string {
  return `${quote(value)}::date`;
}

/** Nullable tarih — tipli `NULL`. `null` = *"hâlâ aktif"* (`players.retired_at`). */
export function dateOrNull(value: string | null): string {
  return value === null ? 'NULL::date' : dateLiteral(value);
}

/** `boolean` literali. `players.is_newgen` DEFAULT taşımıyor — değer ZORUNLU. */
export function boolLiteral(value: boolean): string {
  return value ? 'true' : 'false';
}

/**
 * `text[]` literali — cast ZORUNLU.
 *
 * `people.person_type` şemanın **ilk dizi sütunu** (`people.ts` başlığı) ve
 * `ARRAY[...]` biçimi cast'siz `text[]` yerine `unknown[]` çözülebiliyor.
 * Boş dizi ayrıca **yasak**: `people_person_type_check` `cardinality > 0`
 * istiyor (4.3'te bilerek) — üreteç boş dizi yazmıyor, ama burada da
 * gürültülü durmak, veritabanına boş bir dizi göndermekten iyi.
 */
export function textArrayLiteral(values: readonly string[]): string {
  if (values.length === 0) {
    throw new RangeError('`person_type` boş olamaz — people_person_type_check reddeder');
  }
  return `ARRAY[${values.map((value) => quote(value)).join(', ')}]::text[]`;
}

/**
 * Bir varlığın kimliğini **anahtarından** çözen skaler alt sorgu.
 *
 * Kimlikler `serial`, yani seed onları bilemez ve bilmemeli — bildiği tek
 * dayanak `key`. Alt sorgunun tipi kesin olduğu için `unknown` çözümlemesi
 * (günlük #24) bu tarafta sorun çıkarmıyor; ama aynı sütunun **`NULL` olan**
 * satırı yine tiplenmek zorunda, o yüzden `NULL::integer` dönülüyor.
 *
 * ⚠️ Anahtar bulunamazsa alt sorgu `NULL` döner. `country_id` nullable olduğu
 * için bu **sessizce** geçerdi — yani yazım hatası taşıyan bir `countryKey`
 * hiçbir hata üretmeden yarışmayı ülkesiz bırakırdı. Delik iki yerden
 * kapatılıyor: `world-seed-data.test.ts` her `countryKey`in `SEED_COUNTRIES`te
 * var olduğunu iddia ediyor, entegrasyon testi de yazıldıktan sonra gerçek
 * bağın kurulduğunu okuyor.
 */
export function scalarIdByKey(table: string, key: string | null): string {
  return key === null
    ? 'NULL::integer'
    : `(SELECT "id" FROM "${table}" WHERE "key" = ${quote(key)})`;
}

/** Bir sütun ile onun satır başına SQL değerini üreten bağ. */
export interface ColumnBinding<TRow> {
  readonly column: string;
  readonly value: (row: TRow) => string;
}

/**
 * `INSERT … ON CONFLICT (key) DO UPDATE … RETURNING key` üretir.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN `DO UPDATE`, `DO NOTHING` DEĞİL — ikisi FARKLI SÖZLEŞME
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `DO NOTHING` elle yapılmış düzeltmeleri korur. Ama master veride korunacak
 * elle bir düzeltme **yoktur** — K4'ün var olma sebebi tam olarak budur, dünya
 * paylaşımlı ve değişmez, kullanıcıya özel her şey `save_deltas`a gider. Seed
 * bu tabloların **doğruluk kaynağıdır**.
 *
 * Bedeli somut: Faz 7–9 güncellenmiş bir paketle yeniden koştuğunda `DO NOTHING`
 * o güncellemeyi **sessizce** yok sayardı — satır sayısı doğru, veri bayat,
 * hiçbir kapı ötmez. `DO UPDATE` ile ikinci koşu bozuk bir satırı **onarır** ve
 * bu bir iddia olarak değil **negatif testle** kanıtlanıyor (`world-seed.itest.ts`:
 * satır kasten bozulur, seed yeniden koşar, değerin onarıldığı okunur).
 * *"İkinci koşu patlamadı"* idempotentlik kanıtı **değildir**.
 *
 * ⚠️ **`updated_at` AÇIKÇA SET EDİLİYOR.** `defaultNow()` yalnızca `INSERT`te
 * işler; `DO UPDATE` yolunda dokunulmazsa zaman damgası **bayat kalır** ve
 * "bu satır en son ne zaman seed edildi" sorusu yanlış cevaplanır.
 * `created_at` bilerek SET edilmiyor — satırın doğuş anı bir kez yazılır.
 *
 * ⚠️ **`ON CONFLICT (key)` TEK BENZERSİZLİK YOLU DEĞİL.** `countries.code` ve
 * `competitions.code` de `UNIQUE` ve bu çakışma yolu buradan **görünmez**:
 * `key`i yeni ama `code`u mevcut bir satır `23505` ile koşuyu öldürür, çakışma
 * dalı hiç devreye girmez. Delik **bilerek kapatılmadı** ve gerekçesi şu: böyle
 * bir satır seed verisinin **kendisinin yanlış** olduğu anlamına gelir (bir
 * anahtar yeniden adlandırılmış ama kodu bırakılmış), ve o durumda gürültülü
 * ölmek doğru davranıştır — sessizce yanlış satırı güncellemektense. Kapatılmayan
 * delik **koşan bir testle görünür** tutuluyor: entegrasyon testi mevcut bir
 * `code`u yeni bir `key` altında yazmayı deniyor ve hatanın **hangi kısıttan**
 * geldiğini adıyla iddia ediyor (G-11'in 3.5'teki biçimi).
 *
 * ⚠️ Aynı girdi her zaman aynı dizgeyi üretir — `Date.now()`, `Math.random()`
 * veya nesne anahtar sırasına bağlı hiçbir şey yok (K2, `seed-sql.test.ts`).
 */
export function buildUpsertSql<TRow>(options: {
  readonly table: string;
  readonly conflictColumn: string;
  readonly bindings: readonly ColumnBinding<TRow>[];
  readonly rows: readonly TRow[];
}): string {
  const { table, conflictColumn, bindings, rows } = options;

  const columnList = bindings.map((binding) => `"${binding.column}"`).join(', ');
  const valueRows = rows
    .map((row) => `    (${bindings.map((binding) => binding.value(row)).join(', ')})`)
    .join(',\n');

  // Çakışma sütununun kendisi güncellenmez: eşleşmenin dayanağı odur.
  const assignments = bindings
    .filter((binding) => binding.column !== conflictColumn)
    .map((binding) => `    "${binding.column}" = EXCLUDED."${binding.column}"`);

  return [
    `INSERT INTO "${table}" (${columnList})`,
    'VALUES',
    valueRows,
    `ON CONFLICT ("${conflictColumn}") DO UPDATE SET`,
    // `updated_at` listeye SON eklenir ve `EXCLUDED`den DEĞİL `now()`tan gelir —
    // `EXCLUDED."updated_at"` INSERT'in varsayılanını taşır, güncelleme anını değil.
    [...assignments, '    "updated_at" = now()'].join(',\n'),
    `RETURNING "${conflictColumn}"`,
  ].join('\n');
}

/**
 * `countries` sütun bağları — §3.1.0'ın üç sütunu (`key`, `source`,
 * `external_ids`) dahil, `id`/`created_at`/`updated_at` hariç (üçü de
 * varsayılanlı).
 */
export const COUNTRY_BINDINGS: readonly ColumnBinding<CountrySeed>[] = [
  { column: 'key', value: (row) => quote(row.key) },
  { column: 'code', value: (row) => quote(row.code) },
  // K5 — görünen ad koda gömülmez; i18n anahtarı türetiliyor.
  { column: 'name_key', value: (row) => quote(countryNameKey(row.code)) },
  { column: 'source', value: () => quote(SEED_SOURCE) },
  // Zod ZORUNLU: `jsonb` yalnızca "geçerli JSON mu" diye bakar, `wikidatta`
  // yazım hatasını veritabanı seviyesinde hiçbir şey yakalamaz (§3.1.0).
  {
    column: 'external_ids',
    value: (row) => jsonbLiteral(externalIdsSchema.parse(row.externalIds)),
  },
  { column: 'confederation', value: (row) => quote(row.confederation) },
  // K9 — bayrak yoksa prosedürel üretilir; `null` gerçek ve beklenen durum.
  { column: 'flag_asset_id', value: () => textOrNull(null) },
  { column: 'football_level', value: (row) => String(row.footballLevel) },
  { column: 'uefa_coefficient', value: (row) => numericLiteral(row.uefaCoefficient) },
  { column: 'currency_code', value: (row) => quote(row.currencyCode) },
  { column: 'work_permit_rule_key', value: (row) => quote(row.workPermitRuleKey) },
];

/** `competitions` sütun bağları. */
export const COMPETITION_BINDINGS: readonly ColumnBinding<CompetitionSeed>[] = [
  { column: 'key', value: (row) => quote(row.key) },
  { column: 'source', value: () => quote(SEED_SOURCE) },
  {
    column: 'external_ids',
    value: (row) => jsonbLiteral(externalIdsSchema.parse(row.externalIds)),
  },
  // FK anahtarla çözülür — kimlikler `serial`, seed onları bilemez.
  { column: 'country_id', value: (row) => scalarIdByKey('countries', row.countryKey) },
  { column: 'code', value: (row) => quote(row.code) },
  { column: 'name_key', value: (row) => quote(competitionNameKey(row.code)) },
  { column: 'type', value: (row) => quote(row.type) },
  // `null` = kademesiz (SAPMA-026 ②) — tipli NULL şart.
  { column: 'tier', value: (row) => intOrNull(row.tier) },
  { column: 'reputation', value: (row) => String(row.reputation) },
  { column: 'logo_asset_id', value: () => textOrNull(null) },
  // `competitions.ts` başlığının şartı: *"yazan her yol `parse()`ten geçer"*.
  { column: 'rules', value: (row) => jsonbLiteral(competitionRulesSchema.parse(row.rules)) },
  { column: 'season_start_month', value: (row) => String(row.seasonStartMonth) },
  { column: 'season_end_month', value: (row) => String(row.seasonEndMonth) },
];

/**
 * `people` sütun bağları — §3.1.0'ın üç sütunu dahil, 14 sütun (Faz 4.9).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * SATIR BAŞINA DEĞİŞMEYEN DÖRT SÜTUN — ve dördünün de gerekçesi ayrı
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `common_name` · `birth_city` · `portrait_asset_id` **`null`**,
 * `gender` **`'male'`**, `person_type` **`['player']`**. Hiçbiri jeneratörden
 * gelmiyor ve bu bir eksiklik değil, `flag_asset_id`in emsali (`world-seed-data`
 * dosyasının *"`externalIds` HEPSİNDE BOŞ — ve bu D1 disiplini"* bölümü):
 *
 * - `common_name` — bir lakap **gerçek dünya verisidir**, kalibrasyon değil.
 *   Uydurulmuş bir "Vinicius Jr" hiçbir şeyi ölçmez. Faz 9'un ingesti yazar.
 * - `birth_city` — `people.ts` doğrudan yazmış: *"`null` = bilinmiyor.
 *   Uydurulmuş bir şehir, eksik bir şehirden kötüdür (SAPMA-026 ③)."*
 * - `portrait_asset_id` — K9'un prosedürel yedeği; `null` **beklenen** durum
 *   ve tohumu `portrait_seed` taşıyor.
 * - `gender` — seed'in altı yarışması erkek ligleri (`SEED_COMPETITIONS`);
 *   bir kadın futbolu dağılımı uydurmak, kimsenin belirlemediği bir alana değer
 *   yazmak olurdu (SAPMA-026). Kadın futbolu ROADMAP'in hiçbir fazında **yok**
 *   (arandı) — yani bu bir kapsam kararı değil, kapsamın **kendisi**.
 * - `person_type` — beşi de yazılabilirdi ama 4.9'un ürettiği satırlar
 *   yalnızca **oyuncu**: `staff`/`managers` tabloları 4.9'da boş kalıyor, yani
 *   `['staff']` yazmak var olmayan bir personel kaydını ima ederdi.
 */
export const PEOPLE_BINDINGS: readonly ColumnBinding<PersonSeed>[] = [
  { column: 'key', value: (row) => quote(row.key) },
  { column: 'source', value: () => quote(SEED_SOURCE) },
  { column: 'external_ids', value: () => jsonbLiteral(externalIdsSchema.parse({})) },
  { column: 'first_name', value: (row) => quote(row.firstName) },
  { column: 'last_name', value: (row) => quote(row.lastName) },
  { column: 'common_name', value: () => textOrNull(null) },
  { column: 'birth_date', value: (row) => dateLiteral(row.birthDate) },
  // FK anahtarla çözülür — kimlikler `serial`, seed onları bilemez.
  {
    column: 'nationality_country_id',
    value: (row) => scalarIdByKey('countries', row.nationalityCountryKey),
  },
  {
    column: 'second_nationality_country_id',
    value: (row) => scalarIdByKey('countries', row.secondNationalityCountryKey),
  },
  { column: 'birth_city', value: () => textOrNull(null) },
  { column: 'portrait_asset_id', value: () => textOrNull(null) },
  { column: 'portrait_seed', value: (row) => String(row.portraitSeed) },
  { column: 'gender', value: () => quote('male') },
  { column: 'person_type', value: () => textArrayLiteral(['player']) },
];

/**
 * `players` sütun bağları — 14 sütun (Faz 4.9).
 *
 * ⚠️ **`players` §3.1.0 sütunlarını TAŞIMIYOR** (`data-pack-columns.ts`in
 * ölçülmüş listesi): ne `key`, ne `source`, ne `external_ids`. Kimliği taşıyan
 * satır `people`. Bu, çakışma sütununun neden `person_id` olduğunu da
 * açıklıyor — `key` yok, ama `person_id` **UNIQUE** (4.3'te ölçüldü).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * SATIR BAŞINA DEĞİŞMEYEN DÖRT SÜTUN
 * ────────────────────────────────────────────────────────────────────────────
 *
 * - `club_id` **`null`** → **5.000'in 5.000'i serbest oyuncu.** `clubs` boş
 *   (`world-seed.itest.ts` bunu koşan bir testle iddia ediyor) ve kulüp verisi
 *   **Faz 8**'in işi. Bilinçli, ve koşan bir testle iddia ediliyor: bir gün
 *   kulüp seed'i gelirse bu satır öter.
 * - `squad_number` **`null`** → `players.ts`: *"`null` = numarasız"*. Kulübü
 *   olmayan bir oyuncunun forma numarası **türetilmiş bir yalan** olurdu; ve
 *   Faz 11'in doğrulayıcısı *"forma numaraları kulüp içinde benzersiz"* diyor,
 *   yani numara kulübe bağlı bir kavram.
 * - `is_newgen` **`false`** → `players.ts` sütunu *"Üretilmiş oyuncu mu
 *   (Faz 40)"* diye tanımlıyor: **altyapıdan oyun oynanırken doğan** oyuncu.
 *   Bu satırlar prosedürel **veridir**, prosedürel **newgen** değil — ve fark
 *   zaten `source = 'procedural'` ile taşınıyor. `true` yazmak Faz 40'ın hiç
 *   üretmediği 5.000 newgen'i ima ederdi.
 * - `retired_at` **`null`** → *"`null` = hâlâ aktif"*. Emekli bir oyuncu, hiç
 *   oynamamış bir kariyerin emeklisi olurdu.
 */
export const PLAYER_BINDINGS: readonly ColumnBinding<PlayerSeed>[] = [
  { column: 'person_id', value: (row) => scalarIdByKey('people', row.personKey) },
  { column: 'club_id', value: () => intOrNull(null) },
  { column: 'squad_number', value: () => intOrNull(null) },
  { column: 'primary_position', value: (row) => quote(row.primaryPosition) },
  { column: 'height_cm', value: (row) => String(row.heightCm) },
  { column: 'weight_kg', value: (row) => String(row.weightKg) },
  { column: 'preferred_foot_right', value: (row) => String(row.preferredFootRight) },
  { column: 'preferred_foot_left', value: (row) => String(row.preferredFootLeft) },
  { column: 'current_ability', value: (row) => String(row.currentAbility) },
  { column: 'potential_ability', value: (row) => String(row.potentialAbility) },
  { column: 'pa_range_min', value: (row) => String(row.paRangeMin) },
  { column: 'pa_range_max', value: (row) => String(row.paRangeMax) },
  { column: 'is_newgen', value: () => boolLiteral(false) },
  { column: 'retired_at', value: () => dateOrNull(null) },
];

/** 6 ülkelik upsert. */
export function buildCountriesUpsertSql(rows: readonly CountrySeed[]): string {
  return buildUpsertSql({
    table: 'countries',
    conflictColumn: 'key',
    bindings: COUNTRY_BINDINGS,
    rows,
  });
}

/**
 * 11 yarışmalık upsert.
 *
 * ⚠️ `countries` upsert'i **önce** koşmak zorunda: `country_id` skaler alt
 * sorgusu o satırları okuyor. Sıra `seed-world.ts`te tek bir işlemde sabit.
 */
export function buildCompetitionsUpsertSql(rows: readonly CompetitionSeed[]): string {
  return buildUpsertSql({
    table: 'competitions',
    conflictColumn: 'key',
    bindings: COMPETITION_BINDINGS,
    rows,
  });
}

/**
 * 5.000 kişilik upsert (Faz 4.9).
 *
 * ⚠️ `countries` upsert'i **önce** koşmak zorunda: `nationality_country_id`
 * skaler alt sorgusu o satırları okuyor **ve sütun `NOT NULL`**. Sıra bozulsa
 * alt sorgu `NULL` döner ve `INSERT` gürültülü patlar — `country_id`nin
 * nullable olduğu `competitions` tarafından farkı tam olarak bu:
 * orada aynı hata **sessiz** geçerdi (`seed-sql.ts`in `scalarIdByKey` notu).
 */
export function buildPeopleUpsertSql(rows: readonly PersonSeed[]): string {
  return buildUpsertSql({
    table: 'people',
    conflictColumn: 'key',
    bindings: PEOPLE_BINDINGS,
    rows,
  });
}

/**
 * 5.000 oyunculuk upsert (Faz 4.9).
 *
 * ⚠️ **Çakışma sütunu `key` DEĞİL `person_id`** — `players` §3.1.0 sütunlarını
 * taşımıyor. `person_id` `UNIQUE` (4.3), yani `ON CONFLICT` için geçerli bir
 * arbitre; `RETURNING "person_id"` de bu yüzden **dizge değil tamsayı** dönüyor
 * ve `seed-world.ts` onu sayısal olarak sıralıyor.
 *
 * ⚠️ `people` upsert'i **önce** koşmak zorunda: `person_id` alt sorgusu o
 * satırları okuyor ve sütun `NOT NULL`.
 */
export function buildPlayersUpsertSql(rows: readonly PlayerSeed[]): string {
  return buildUpsertSql({
    table: 'players',
    conflictColumn: 'person_id',
    bindings: PLAYER_BINDINGS,
    rows,
  });
}
