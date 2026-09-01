/**
 * FAZ 4.9 — 5.000 SAHTE OYUNCUNUN DAĞILIM VERİSİ.
 *
 * Faz 4'ün **1. kabul kriteri** budur (`docs/ROADMAP.md`): *"5.000 sahte oyuncu
 * seed → şema tutarlı"*. `world-seed-data.ts`in biçimi birebir izleniyor:
 * sayılar burada **veri olarak** duruyor ve `player-seed-data.test.ts` onları
 * kriterin kendisi olarak iddia ediyor — bir ağırlığı değiştirmek testi kırar,
 * sessiz kalmaz.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ BU DAĞILIMLAR `spec`TE YAZILI DEĞİL — VE BU YÜZDEN GÖRÜNÜR OLMAK ZORUNDA
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Mevki dağılımı, yaş piramidi, CA bantları, ayak profili, uyruk payları:
 * hiçbiri `docs/spec/`te tanımlı değil (arandı, tek tek). SAPMA-026 *"kimsenin
 * belirlemediği alana değer uydurma"* diyor — ama **seed verisi tanımı gereği
 * uydurmadır**; yasak olan şey uydurmayı **gizlemektir**. `world-seed-data.ts`in
 * *"SAYISAL DEĞERLER KALİBRASYONDUR, ÖLÇÜM DEĞİL"* bölümüyle aynı sözleşme:
 * bunlar **kalibrasyon**, rapora *"ölçüldü"* diye yazılmazlar, ve Faz 8–10
 * gerçek veriyle geldiğinde değişmeleri **beklenir**.
 *
 * ⚠️ **`current_ability` HİÇBİR NİTELİK SATIRINDAN TÜREMİYOR — ölçülmüş bir
 * kapsam sonucu, bir tasarım tercihi değil.** `docs/spec/02-attributes.md` §4.2
 * CA'yı `round(Σ(attribute × weight) / Σ(weight) × 10)` ile **niteliklerden**
 * hesaplıyor. 4.9 nitelik tablolarına (`player_attributes`,
 * `player_hidden_attributes`, `player_positions`, `player_traits`,
 * `player_stats_history`) **hiç yazmıyor**: 47+10 sütuna değer yazmak bir
 * **dağılım** kararıdır ve dağılımın sahibi **Faz 10**'dur (nitelik türetme
 * motoru). Yani aşağıdaki CA değerleri **serbest duruyor** — bugün zararsız
 * (kabul kriteri 3'ün sorgusu yalnızca `players`a bakıyor), ama Faz 10 nitelik
 * motorunu yazdığında bu 5.000 satır **tutarsız** olacak.
 *
 * ⚠️ Ve Faz 10 onları **düzeltemez**: girdisi `player_stats_history` ve bu
 * satırların istatistik geçmişi **yok** (ölçüldü — ROADMAP Faz 10 kapsamı).
 * Satırların **ömrü** bu yüzden ayrı bir boşluk olarak kaydedildi:
 * `docs/SPEC-COVERAGE-GAPS.md` **G-20**, sahibi **Faz 9**. Boşluğun kaydı
 * `players`ın kendi başlığında değil burada, çünkü onu doğuran şey şema değil
 * **bu dosyanın verisi**.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `SEED_REFERENCE_DATE` — UYDURULMADI, ROADMAP FAZ 16'DAN OKUNDU
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Yaş, `Date.now()`tan **türetilmez**. Türetilseydi aynı tohum yarın farklı
 * satır üretirdi ve *"iki koşu birebir aynı"* iddiası veri hakkında değil
 * **saat** hakkında olurdu; üstelik 4.10'un kriter 3 ölçümü her gün kayardı.
 *
 * Gün **seçilmedi, ölçüldü**: `docs/ROADMAP.md` Faz 16 (Takvim ve Tur Motoru)
 * kapsamında *"sezon takvimi (**1 Temmuz 2026 başlangıç**)"* yazıyor — yani
 * dünyanın takvimi repoda **zaten tanımlı** ve sahibi Faz 16. Seed yaşları o
 * güne göre hesaplıyor: seed'de 20 yaşında olan bir oyuncu, dünyanın **ilk
 * turunda** da 20 yaşındadır.
 *
 * ℹ️ Altı seed liginin altısı da `seasonStartMonth: 8` taşıyor (sayıldı,
 * `SEED_COMPETITIONS`) — yani sezonun *maçları* ağustosta başlıyor, *takvimi*
 * 1 temmuzda. Referans günü takvimin başı, maçların başı değil: transfer
 * dönemi, sözleşme sayacı ve yaş okuması hep takvim gününe bakar.
 *
 * ⚠️ **Bu sabit `ageRangeToBirthDateRange` ile BİRLİKTE kullanılır ve tek
 * yerde durur.** `packages/db/src/schema/transfer-search.ts` başlığı şartı
 * yazmış: *"çevrimin kendisi bir ifadedir ve iki yerde yazılırsa sessizce
 * ayrışır — sorgu doğru cevabı vermeye devam eder, yalnızca farklı satırlar
 * döner ve hiçbir kapı ötmez."* Seed doğum tarihlerini o fonksiyonun **kendi
 * tanımından** üretiyor (aşağıda, `player-generator.ts`), 4.10'un ölçümü de
 * aynı fonksiyonu ve aynı sabiti okuyacak.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `key` NAMESPACE'İ AYRI — VE BU BİR ÇAKIŞMA KORUMASIDIR, SÜSLEME DEĞİL
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `docs/spec/12-data-packs.md` §17.4 paket anahtarını `player-12847` biçiminde
 * yazıyor ve `people.ts` başlığı *"o anahtar bu sütuna düşecek"* diyor. Seed
 * o namespace'i **kullanmıyor**: bu satırlar `source = 'procedural'` ve Faz 9
 * gerçek `player-*` anahtarlarını yazacak. Aynı namespace paylaşılsaydı
 * prosedürel bir satırla paket satırı `ON CONFLICT (key)` üzerinde **çakışır**
 * ve biri diğerini **sessizce** ezerdi. Önek o yüzden var ve
 * `people.key` **tablo çapında UNIQUE** (`data-pack-columns.ts`).
 */
import type { PlayerPosition } from '@fms/db';

/**
 * Yaşın hangi güne göre hesaplandığı (`YYYY-MM-DD`).
 *
 * ROADMAP Faz 16'nın *"1 Temmuz 2026 başlangıç"* takvimi. Gerekçe ve neden
 * `Date.now()` olmadığı dosya başlığında.
 *
 * ⚠️ **4.10 bu sabiti buradan okur.** İki yerde ayrı ayrı yazılırsa iki sayı da
 * makul görünür ve fark **sessiz** kalır.
 */
export const SEED_REFERENCE_DATE = '2026-07-01';

/** Kabul kriteri 1'in sayısı. Listeye bir satır eklemek testi kırar. */
export const SEED_PLAYER_COUNT = 5000;

/** `people.key` öneki — paket namespace'inden ayrı tutulur (dosya başlığı). */
export const SEED_PLAYER_KEY_PREFIX = 'seed-player-';

/**
 * Anahtar biçimi: `seed-player-00001` … `seed-player-05000`.
 *
 * Sıfır dolgusu bir süs değil: dolgusuz yazılsa `seed-player-10` ile
 * `seed-player-2` sözlük sırasında ters düşerdi ve `ORDER BY "key"` ile okuyan
 * her karşılaştırma indeks sırasına bağımlı hâle gelirdi.
 */
export function seedPlayerKey(index: number): string {
  return `${SEED_PLAYER_KEY_PREFIX}${String(index + 1).padStart(5, '0')}`;
}

/** Ağırlıklı bir dağılım girdisi. Ağırlıklar **1.000 üzerinden** yazılır. */
export interface Weighted<T> {
  readonly value: T;
  readonly weight: number;
}

/**
 * Ağırlık toplamı — her dağılım için **1.000**.
 *
 * Bin üzerinden yazılmasının sebebi okunabilirlik değil **denetlenebilirlik**:
 * testler her tablonun toplamının tam olarak bu sayı olduğunu iddia ediyor,
 * yani bir ağırlığı değiştirip diğerini düzeltmeyi unutmak **kırılıyor**.
 */
export const WEIGHT_TOTAL = 1000;

/**
 * MEVKİ DAĞILIMI — bir futbol dünyasının kaba mevki piramidi.
 *
 * ⚠️ **`'DR'` (sağ bek) payı kabul kriteri 3'ün doğrudan girdisi**
 * (*"20–24 yaş, **sağ bek**, CA>120"*). Pay sıfıra yakın olsaydı 4.10 boş bir
 * sonuç kümesini ölçerdi ve *"< 50 ms"* hiçbir şey kanıtlamazdı — 3.9'un
 * `< 20 ms` vakasının birebir aynısı. Payın **yüksek** olması da ölçmez:
 * 3.9'un dersi *"indeks seçiminin ayracı hacim değil **seçicilik**"*.
 *
 * ℹ️ Kümenin kendisi uydurulmadı — `PLAYER_POSITIONS` (`players.ts`, `spec/01`
 * §3.1'in on iki kodu) **birebir** kullanılıyor ve testi ikisinin aynı olduğunu
 * iddia ediyor. Ağırlıklar kalibrasyondur.
 */
export const POSITION_WEIGHTS: readonly Weighted<PlayerPosition>[] = [
  { value: 'GK', weight: 100 },
  { value: 'DC', weight: 140 },
  { value: 'DL', weight: 70 },
  { value: 'DR', weight: 70 },
  { value: 'DM', weight: 90 },
  { value: 'MC', weight: 130 },
  { value: 'ML', weight: 60 },
  { value: 'MR', weight: 60 },
  { value: 'AMC', weight: 80 },
  { value: 'AML', weight: 65 },
  { value: 'AMR', weight: 65 },
  { value: 'ST', weight: 70 },
];

/**
 * YAŞ PİRAMİDİ — 16'dan 38'e, `SEED_REFERENCE_DATE` gününde **tam** yaş.
 *
 * ⚠️ `20–24` dilimi kabul kriteri 3'ün ikinci yüklemi. Dilim toplamı testte
 * ayrıca iddia ediliyor ki bir ağırlık değişirse kriterin zemini **sessizce**
 * kaymasın.
 *
 * ℹ️ Alt uç 16: `spec/02` §4.4 belirsizlik bandı örneğini *"16 yaşında hiç
 * oynamamış oyuncu"* ile veriyor. Üst uç 38 bir kalibrasyon.
 */
export const AGE_WEIGHTS: readonly Weighted<number>[] = [
  { value: 16, weight: 10 },
  { value: 17, weight: 15 },
  { value: 18, weight: 25 },
  { value: 19, weight: 40 },
  { value: 20, weight: 55 },
  { value: 21, weight: 65 },
  { value: 22, weight: 75 },
  { value: 23, weight: 80 },
  { value: 24, weight: 80 },
  { value: 25, weight: 80 },
  { value: 26, weight: 75 },
  { value: 27, weight: 70 },
  { value: 28, weight: 65 },
  { value: 29, weight: 60 },
  { value: 30, weight: 50 },
  { value: 31, weight: 40 },
  { value: 32, weight: 33 },
  { value: 33, weight: 27 },
  { value: 34, weight: 20 },
  { value: 35, weight: 15 },
  { value: 36, weight: 10 },
  { value: 37, weight: 5 },
  { value: 38, weight: 5 },
];

/** Bir CA bandı — iki uç da **dahil**. */
export interface AbilityBand {
  readonly min: number;
  readonly max: number;
}

/**
 * MEVCUT YETENEK (CA) BANTLARI — 1–200 ölçeği (`spec/02` §4.2).
 *
 * ⚠️ `CA > 120` kabul kriteri 3'ün üçüncü yüklemi ve bantlar **kasten** o eşiğin
 * iki yanına düşüyor: `110–129` bandı eşiği ortadan kesiyor, yani yüklem bir
 * bant sınırıyla **çakışmıyor**. Çakışsaydı eşiği bir birim oynatmak sonucu
 * uçurumdan atlatırdı ve ölçüm kırılgan olurdu.
 *
 * ℹ️ Üst uç 190, 200 değil: `spec/02` *"maksimum nitelikli oyuncu CA 200 olur"*
 * diyor, yani 200 bir **teorik tavan**. Faz 10'un kabul kriteri de
 * *"< 5 oyuncu CA > 185"* istiyor — bu bant onu ihlal edecek kadar geniş değil
 * ama o kriter Faz 10'un kendi üretiminin kriteri, bu seed'in değil.
 */
export const ABILITY_BAND_WEIGHTS: readonly Weighted<AbilityBand>[] = [
  { value: { min: 40, max: 69 }, weight: 180 },
  { value: { min: 70, max: 89 }, weight: 250 },
  { value: { min: 90, max: 109 }, weight: 250 },
  { value: { min: 110, max: 129 }, weight: 180 },
  { value: { min: 130, max: 149 }, weight: 100 },
  { value: { min: 150, max: 169 }, weight: 33 },
  { value: { min: 170, max: 190 }, weight: 7 },
];

/**
 * AYAK PROFİLİ — `preferred_foot_right` / `preferred_foot_left`, ikisi de 1–20.
 *
 * Ölçek `spec/02`'de **YOK** (ölçüldü: `ayak`/`preferred_foot` için 0 eşleşme).
 * Kaynak bu yüzden spec değil **şema dosyasının kendi yorumu**:
 * `players.ts` → *"1-20 — sağ ayak yetkinliği. Aralık denetimi Faz 11'de."*
 * Ve *"İkisi ayrı ayrı, çünkü çift ayaklılık bir derece."* — üçüncü profil
 * (`iki_ayakli`) tam olarak o cümlenin karşılığı.
 */
export interface FootProfile {
  readonly label: 'sag_baskin' | 'sol_baskin' | 'iki_ayakli';
  readonly strong: AbilityBand;
  readonly weak: AbilityBand;
  /** `true` ise güçlü olan **sol** ayaktır. */
  readonly leftIsStrong: boolean;
}

export const FOOT_PROFILE_WEIGHTS: readonly Weighted<FootProfile>[] = [
  {
    value: {
      label: 'sag_baskin',
      strong: { min: 15, max: 20 },
      weak: { min: 3, max: 10 },
      leftIsStrong: false,
    },
    weight: 720,
  },
  {
    value: {
      label: 'sol_baskin',
      strong: { min: 15, max: 20 },
      weak: { min: 3, max: 10 },
      leftIsStrong: true,
    },
    weight: 210,
  },
  {
    value: {
      label: 'iki_ayakli',
      strong: { min: 13, max: 18 },
      weak: { min: 13, max: 18 },
      leftIsStrong: false,
    },
    weight: 70,
  },
];

/**
 * UYRUK DAĞILIMI — `countries.key` ile taşınır, kimlikle değil.
 *
 * Anahtarlar `SEED_COUNTRIES`ten geliyor ve testi altısının da orada var
 * olduğunu iddia ediyor: yazım hatası taşıyan bir anahtar `scalarIdByKey`
 * üzerinden `NULL` dönerdi ve `nationality_country_id` **`NOT NULL`** olduğu
 * için `INSERT` gürültülü patlardı — ama `second_nationality_country_id`
 * nullable, yani orada **sessizce** geçerdi.
 */
export const NATIONALITY_WEIGHTS: readonly Weighted<string>[] = [
  { value: 'turkiye', weight: 200 },
  { value: 'england', weight: 180 },
  { value: 'spain', weight: 160 },
  { value: 'germany', weight: 160 },
  { value: 'italy', weight: 150 },
  { value: 'france', weight: 150 },
];

/**
 * İkinci uyruklu oyuncu payı (1.000 üzerinden).
 *
 * `spec/07` GBE ve yabancı kotası hesabının girdisi (Faz 35). Sıfır olsaydı o
 * fazın kod yolu bu veriyle **hiç** koşamazdı; 1.000 olsaydı gerçekdışı olurdu.
 */
export const SECOND_NATIONALITY_WEIGHT = 150;

/**
 * BOY TABANI VE YAYILIMI (santimetre).
 *
 * Kaleciler ayrı bir tabana oturuyor — bu bir kalibrasyon, `spec`te yazılı
 * değil ve Faz 10 gerçek veriyle geldiğinde değişmesi beklenir.
 */
export const HEIGHT_BASE_CM = 168;
export const HEIGHT_SPREAD_CM = 24;
export const GOALKEEPER_HEIGHT_BONUS_CM = 6;

/**
 * KİLO — boydan türetilir (`boy - 100 + sapma`), bağımsız çekilmez.
 *
 * Bağımsız çekilseydi 165 cm / 95 kg gibi satırlar doğardı ve Faz 11'in
 * doğrulayıcısı (*"aykırı değerler"*) onları haklı olarak işaretlerdi.
 */
export const WEIGHT_FROM_HEIGHT_OFFSET = -100;
export const WEIGHT_SPREAD_MIN_KG = -5;
export const WEIGHT_SPREAD_MAX_KG = 8;

/** PA türetiminin `spec/02` §4.4'ten alınan üç sabiti. */
export const PA_YOUTH_BONUS_AGE_LIMIT = 21;
export const PA_YOUTH_BONUS_BASE_AGE = 22;
export const PA_YOUTH_BONUS_PER_YEAR = 4;
/** `yearsToPeak(age) = clamp(0, 10, 27 − age)` — `spec/02` §4.4. */
export const PA_PEAK_AGE = 27;
export const PA_MAX_YEARS_TO_PEAK = 10;
/** `growthSlope` bandı. `spec/02` onu son iki sezondan hesaplıyor; burada yok. */
export const PA_GROWTH_SLOPE: AbilityBand = { min: 0, max: 3 };
/** `spec/02` §4.4: `uncertainty = clamp(3, 40, 40 − age × 1,2 − …)`. */
export const PA_UNCERTAINTY_BASE = 40;
export const PA_UNCERTAINTY_AGE_FACTOR = 1.2;
export const PA_UNCERTAINTY_MIN = 3;
export const PA_UNCERTAINTY_MAX = 40;
/** `spec/02` §4.4'ün `clamp(CA, 200, …)` tavanı. */
export const ABILITY_CEILING = 200;

/**
 * PostgreSQL `integer` (int4) tavanı — `people.portrait_seed`in sınırı.
 *
 * ⚠️ **ÖDENMİŞ BEDEL (Faz 4.9, günlük #34).** Üreteç ilk hâlinde **işaretsiz
 * 32 bit** (`>>> 0`, tavan 4.294.967.295) döndürüyordu ve `portrait_seed`
 * `integer`, yani **işaretli** 32 bit. Seed gerçek PostgreSQL'e yazarken
 * `integer out of range` ile **gürültülü** patladı — sessiz olamazdı, ve
 * bedeli bu yüzden düşük kaldı.
 *
 * **Ders şu değil ki "tavanı kontrol et":** ders, bir üretecin çıktı
 * aralığının **hedef sütunun tipinden** okunması gerektiği. `people.ts`
 * `integer('portrait_seed')` yazıyor ve o satır tek doğruluk kaynağı;
 * jeneratörün "32 bit" demesi aynı şeyi söylemiyordu.
 */
export const PG_INTEGER_MAX = 2_147_483_647;

/**
 * AD HAVUZLARI — uyruk başına 8 ad + 8 soyad.
 *
 * ⚠️ **Bunlar YER TUTUCU adlardır ve satırın kendisi bunu söylüyor:**
 * `source = 'procedural'` (`SEED_SOURCE`, `world-seed-data.ts`), yani
 * *"bu satır için hâlâ gerçek veri gerekiyor"* (G-14'ün ayracı). Gerçek kimlik
 * **Faz 9**'un ingesti.
 *
 * ℹ️ 8 × 8 = uyruk başına 64 birleşim, uyruk başına ~830 oyuncu → adlar
 * **tekrar eder**. Bu bir kusur değil: benzersizlik `key`de, adda değil
 * (`people`ın ad sütunlarında UNIQUE yok — ölçüldü, `people.ts`).
 *
 * ℹ️ Türkçe karakterler bilerek duruyor — Faz 9'un *"Türkçe karakterli isimler
 * doğru saklanıyor ve aranabiliyor"* kriteri ve 3.7'nin `unaccent`/`pg_trgm`
 * indeksleri bu veriyle bugünden beslenebilsin diye.
 */
export interface NamePool {
  readonly countryKey: string;
  readonly firstNames: readonly string[];
  readonly lastNames: readonly string[];
}

export const NAME_POOLS: readonly NamePool[] = [
  {
    countryKey: 'turkiye',
    firstNames: ['Ahmet', 'Mehmet', 'Emre', 'Burak', 'Serkan', 'Uğur', 'Çağlar', 'İlhan'],
    lastNames: ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Öztürk', 'Aydın', 'Güneş'],
  },
  {
    countryKey: 'england',
    firstNames: ['Harry', 'Jack', 'Oliver', 'Marcus', 'Callum', 'Reece', 'Declan', 'Phil'],
    lastNames: ['Smith', 'Walker', 'Wright', 'Shaw', 'Foden', 'Bellingham', 'Rice', 'Maddison'],
  },
  {
    countryKey: 'spain',
    firstNames: ['Pablo', 'Álvaro', 'Sergio', 'Iker', 'Rodrigo', 'Marco', 'Unai', 'Nico'],
    lastNames: ['García', 'Fernández', 'Ruiz', 'Torres', 'Navas', 'Olmo', 'Castillo', 'Peña'],
  },
  {
    countryKey: 'germany',
    firstNames: ['Leon', 'Jonas', 'Finn', 'Maximilian', 'Niklas', 'Kai', 'Florian', 'Jamal'],
    lastNames: ['Müller', 'Schneider', 'Wagner', 'Becker', 'Hoffmann', 'Weber', 'Krüger', 'Vogel'],
  },
  {
    countryKey: 'italy',
    firstNames: [
      'Lorenzo',
      'Matteo',
      'Alessandro',
      'Federico',
      'Davide',
      'Nicolò',
      'Gianluca',
      'Andrea',
    ],
    lastNames: ['Rossi', 'Bianchi', 'Ferrari', 'Esposito', 'Romano', 'Greco', 'Conti', 'Barella'],
  },
  {
    countryKey: 'france',
    firstNames: ['Lucas', 'Hugo', 'Théo', 'Enzo', 'Mattéo', 'Kylian', 'Ousmane', 'Jules'],
    lastNames: [
      'Martin',
      'Bernard',
      'Dubois',
      'Moreau',
      'Laurent',
      'Girard',
      'Fofana',
      'Camavinga',
    ],
  },
];

/**
 * Bir `people` seed satırı.
 *
 * `source` ve `external_ids` **türetilir**, burada durmaz — `CountrySeed`in
 * biçimiyle aynı. `gender`, `person_type`, `birth_city`, `portrait_asset_id` ve
 * `common_name` de burada yok: hepsi **satır başına değişmeyen** değerler ve
 * `seed-sql.ts`in bağlarında sabit olarak yaşıyorlar (`flag_asset_id`in
 * emsali).
 */
export interface PersonSeed {
  /** `seed-player-00001` … — namespace gerekçesi dosya başlığında. */
  readonly key: string;
  readonly firstName: string;
  readonly lastName: string;
  /** `YYYY-MM-DD`. `SEED_REFERENCE_DATE` gününde `age` yaşında olacak şekilde. */
  readonly birthDate: string;
  /** `countries.key` — FK anahtarla taşınır, kimlikle değil. */
  readonly nationalityCountryKey: string;
  /** `null` = tek uyruklu. Birinciden **farklı** olduğu testte iddia ediliyor. */
  readonly secondNationalityCountryKey: string | null;
  /** `people.portrait_seed` — `NOT NULL integer`, K2'nin tohum sütunu. */
  readonly portraitSeed: number;
  /** Türetilen değerlerin denetlenebilmesi için taşınıyor; sütunu **yok**. */
  readonly age: number;
}

/**
 * Bir `players` seed satırı.
 *
 * `club_id` · `squad_number` · `is_newgen` · `retired_at` burada **yok**:
 * dördü de satır başına değişmiyor ve gerekçeleri `seed-sql.ts`in bağlarında.
 */
export interface PlayerSeed {
  /** `people.key` — `person_id` bu anahtardan skaler alt sorguyla çözülür. */
  readonly personKey: string;
  readonly primaryPosition: PlayerPosition;
  readonly heightCm: number;
  readonly weightKg: number;
  readonly preferredFootRight: number;
  readonly preferredFootLeft: number;
  readonly currentAbility: number;
  readonly potentialAbility: number;
  readonly paRangeMin: number;
  readonly paRangeMax: number;
}

/** Jeneratörün tek çıktısı — iki tablo, tek geçiş, aynı sırada. */
export interface PlayerSeedSet {
  readonly people: readonly PersonSeed[];
  readonly players: readonly PlayerSeed[];
}
