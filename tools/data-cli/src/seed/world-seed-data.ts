/**
 * FAZ 3.8 — DÜNYA ÇEKİRDEĞİ SEED VERİSİ: 6 ülke · 6 lig · 5 kupa.
 *
 * Faz 3'ün **2. kabul kriteri** budur (`docs/ROADMAP.md`): *"6 ülke + 6 lig +
 * 5 UEFA/yerel kupa örnek verisiyle seed başarılı"*. Sayılar burada **veri
 * olarak** duruyor ve `world-seed-data.test.ts` onları kriterin kendisi olarak
 * iddia ediyor — yani listeye bir satır eklemek testi kırar, sessiz kalmaz.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ BU DOSYA `Math.random()` VE `SeededRng` KULLANMIYOR — ve bu bir KARAR (K2)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * K2 tüm rastgeleliği `SeededRng`e bağlıyor. 3.8'in kapsamındaki iki tablonun
 * **hiçbir sütunu rastgelelik istemiyor**: tohum isteyen tek sütun
 * `clubs.crest_seed` ve `clubs` bu alt görevde seed **edilmiyor** (kabul
 * kriteri kulüp saymıyor, K12). Ölçüldü — `crest_seed` yalnızca
 * `packages/db/src/schema/clubs.ts`te geçiyor.
 *
 * `SeededRng`i bugün `packages/engine`den `packages/shared`a taşımak bir
 * **mimari değişiklik** olurdu ve tüketicisi yok (K12, SAPMA-017'nin ölçütü).
 * Veri sabit yazıldığı için K2 **yapısal olarak** sağlanıyor: rastgelelik
 * kaynağı yok, dolayısıyla belirsizlik de yok. İddia ölçülüyor —
 * `seed-sql.test.ts` aynı girdiyle iki kez çağrılan üreticinin **birebir aynı**
 * SQL'i döndürdüğünü sabitliyor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `key` DEĞERLERİ TAHMİN EDİLMEDİ, `spec/12` §17.3 ALGORİTMASIYLA ÖLÇÜLDÜ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/01` §3.1.0 `key`i *"paket eşleme anahtarı (slug)"* diye tanımlıyor, yani
 * bu sütun Faz 8'in ingest hattının **eşleşme kancası**. Uydurulmuş bir anahtar,
 * gerçek paket geldiğinde eşleşmez ve varlık ikilenir. Bu yüzden §17.3'ün
 * `slugify` fonksiyonu birebir kopyalanıp bu 17 ad üzerinde **çalıştırıldı**;
 * aşağıdaki anahtarlar o çıktıdır:
 *
 *   Türkiye → turkiye · Süper Lig → superlig · Türkiye Kupası → turkiyekupasi
 *   Premier League → premierleague · Serie A → seriea · FA Cup → facup
 *
 * ⚠️ Algoritmanın kendisi **kusurlu** ve bu ölçülmüş bir kayıt (SAPMA-022:
 * kendi belgelediği üç örnekten ikisini tutturmuyor, durak sözcük listesi
 * eksik). Faz 7 onu gerçek paket verisiyle kalibre edecek. Bugün yapılan şey
 * onu **düzeltmek değil** (K12), bozuk hâliyle bile **tutarlı kalmak**: seed
 * ile ingest aynı fonksiyonun çıktısını kullanırsa, fonksiyon düzeldiğinde ikisi
 * birlikte düzelir. Bu 17 ad Faz 7'nin kalibrasyonuna ikinci bir örneklem.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `source` NEDEN `procedural` — kapalı kümede dürüst tek seçenek
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `DATA_SOURCES` kapalı: `pack | api | wikidata | openfootball | procedural`
 * (§3.1.0, CHECK kısıtlı). Bu satırlar **elle yazıldı** — beşinin hiçbiri
 * birebir doğru değil. Ayraç, alanın **tüketicisinin** sorduğu soru
 * (`spec/12` §17.1: *"hangi varlığın nereden geldiği görünür — eksikleri
 * kapatmak kolaylaşır"*): *"bu satır için hâlâ gerçek veri gerekiyor mu?"*
 *
 * - `pack` **HAYIR** derdi → Faz 8 ingesti ve Veri Editörü bu satırları
 *   otoriter paket verisi sanardı; kimse gerçek katsayıyı aramaya gitmezdi.
 * - `procedural` **EVET** der → K9'un yedek yolu, değiştirilmesi beklenen satır.
 *
 * Ayrıca `procedural` bugünkü durumun **birebir tarifi**: `.env`de
 * `ACTIVE_PACK` boş, yani yüklenecek paket yok ve K9'un yedek koşulu geçerli.
 * Altıncı bir değer (`seed`) eklemek CHECK kısıtını değiştirmek, yani yeni bir
 * migration demekti — 3.8'in kapsamı dışında.
 * ⚠️ Kalıcı bir karar değil, **kaydı açık**: `docs/SPEC-COVERAGE-GAPS.md` G-14.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `externalIds` HEPSİNDE BOŞ — ve bu D1 disiplini
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `externalIdsSchema` `wikidata`/`apiFootball`/`transfermarkt` taşıyabiliyor ve
 * dolu bir örnek yazmak testi "daha kapsamlı" gösterirdi. Yazılmadı: elimde
 * **doğrulanmış** bir Wikidata Q-kimliği yok ve hatırlanan bir kimlik, yanlış
 * olduğunu belli etmeyen bir sayıdır (**D1**). Yanlış bir `externalIds`in bedeli
 * `spec/12` §17.3'te yazılı: *"yanlış eşleşme = Galatasaray armasının
 * Fenerbahçe'de görünmesi"*. Boş nesne = *"eşleme yok"*, ve bu **doğru**.
 * Şemanın dolu yolu birim testinde sentetik değerle kapsanıyor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * SAYISAL DEĞERLER KALİBRASYONDUR, ÖLÇÜM DEĞİL
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `footballLevel`, `uefaCoefficient`, `reputation`, `relegationCount`,
 * `continentalSpots` — hepsi **yaklaşık** ve Faz 8 ingesti bunları gerçek veriyle
 * değiştirecek (seed `DO UPDATE` yaptığı için değiştirebilir). `spec/01`
 * §3.1.2 ②'nin ayrımı burada da geçerli: bunlar **sözleşme değil kalibrasyon**,
 * o yüzden CHECK kısıtı da almıyorlar ve aralık denetimi Faz 11'in doğrulayıcısı.
 * Rapora "ölçüldü" diye yazılmazlar.
 */
import type {
  CompetitionRules,
  CompetitionType,
  DataSource,
  ExternalIds,
  WorkPermitRuleKey,
} from '@fms/db';

/**
 * Seed satırlarının kökeni. Gerekçe dosya başlığında; `DATA_SOURCES`in kapalı
 * kümesinden geliyor, serbest metin değil.
 */
export const SEED_SOURCE: DataSource = 'procedural';

/** `countries` seed satırı. `nameKey` ve `source` TÜRETİLİR, burada durmaz. */
export interface CountrySeed {
  /** `spec/12` §17.3 slug'ı — ölçülerek yazıldı (dosya başlığı). */
  readonly key: string;
  /** `spec/01` §3.1'in kendi listesi: `TUR, ENG, ESP, GER, ITA, FRA`. */
  readonly code: string;
  readonly confederation: string;
  readonly footballLevel: number;
  /** `numeric(8,3)` → dizge. Kayan noktaya çevrilmez (`countries.ts` gerekçesi). */
  readonly uefaCoefficient: string;
  readonly currencyCode: string;
  readonly workPermitRuleKey: WorkPermitRuleKey;
  readonly externalIds: ExternalIds;
}

/** `competitions` seed satırı. FK ülke **anahtarıyla** taşınır, kimlikle değil. */
export interface CompetitionSeed {
  readonly key: string;
  /** `spec/01` §3.1'in kendi örneği: `'TUR_SUPERLIG'`, `'UEFA_UCL'`. */
  readonly code: string;
  /** `null` = kıta turnuvası; `competitions.country_id` nullable (SAPMA-026 ②). */
  readonly countryKey: string | null;
  readonly type: CompetitionType;
  /** `null` = kademesiz — kupanın ve kıta turnuvasının kademesi yoktur. */
  readonly tier: number | null;
  readonly reputation: number;
  readonly seasonStartMonth: number;
  readonly seasonEndMonth: number;
  readonly rules: CompetitionRules;
  readonly externalIds: ExternalIds;
}

/**
 * i18n anahtarı üretir — K5: görünen ad koda **gömülmez**.
 *
 * Seed `'Türkiye'` yazmaz, `'country.tur'` yazar. Çevirinin kendisi **Faz 5'in
 * işi** ve bugün yazılmıyor (K12); ama bu fonksiyon o fazın anahtar
 * listesinin **üreticisi**, yani `locales/tr/` dosyalarının kaynağı.
 *
 * Kod (`TUR`) seçildi, anahtar (`turkiye`) değil: ISO/FIFA kodu sabittir,
 * slug ise SAPMA-022 gereği Faz 7'de **değişebilir** — i18n anahtarlarının o
 * kalibrasyonla birlikte kayması istenmez.
 */
export function countryNameKey(code: string): string {
  return `country.${code.toLowerCase()}`;
}

/**
 * Yarışmanın i18n anahtarı — `code`tan türetilir.
 *
 * İlk alt çizgi noktaya döner, gerisi olduğu gibi kalır:
 * `TUR_SUPERLIG` → `competition.tur.superlig` · `UEFA_UCL` → `competition.uefa.ucl`
 *
 * Böylece anahtarın ilk parçası **sahibi** oluyor (ülke kodu veya `uefa`) ve
 * `world-seed-data.test.ts` bunu `countryKey` ile çapraz doğruluyor: kod ile
 * ülke ayrışırsa test kırılır. `String.replace` dizge desende **yalnızca ilk**
 * eşleşmeyi değiştirir — `ENG_FA_CUP` → `competition.eng.fa_cup`.
 */
export function competitionNameKey(code: string): string {
  return `competition.${code.toLowerCase().replace('_', '.')}`;
}

/** Beş büyük Avrupa ligi + Türkiye. ROADMAP Faz 8'in ülke listesiyle aynı. */
export const SEED_COUNTRIES: readonly CountrySeed[] = [
  {
    key: 'england',
    code: 'ENG',
    confederation: 'UEFA',
    footballLevel: 95,
    uefaCoefficient: '94.303',
    currencyCode: 'GBP',
    // Brexit sonrası puan tabanlı rejim — `spec/07` GBE'nin konusu (Faz 35).
    workPermitRuleKey: 'gbe',
    externalIds: {},
  },
  {
    key: 'spain',
    code: 'ESP',
    confederation: 'UEFA',
    footballLevel: 93,
    uefaCoefficient: '88.437',
    currencyCode: 'EUR',
    workPermitRuleKey: 'eu_quota',
    externalIds: {},
  },
  {
    key: 'germany',
    code: 'GER',
    confederation: 'UEFA',
    footballLevel: 92,
    uefaCoefficient: '84.545',
    currencyCode: 'EUR',
    workPermitRuleKey: 'eu_quota',
    externalIds: {},
  },
  {
    key: 'italy',
    code: 'ITA',
    confederation: 'UEFA',
    footballLevel: 91,
    uefaCoefficient: '86.116',
    currencyCode: 'EUR',
    workPermitRuleKey: 'eu_quota',
    externalIds: {},
  },
  {
    key: 'france',
    code: 'FRA',
    confederation: 'UEFA',
    footballLevel: 88,
    uefaCoefficient: '68.081',
    currencyCode: 'EUR',
    workPermitRuleKey: 'eu_quota',
    externalIds: {},
  },
  {
    key: 'turkiye',
    code: 'TUR',
    confederation: 'UEFA',
    footballLevel: 72,
    uefaCoefficient: '41.700',
    currencyCode: 'TRY',
    workPermitRuleKey: 'tr_quota',
    externalIds: {},
  },
];

/**
 * Lig kuralları için ortak taban — **kopyalanmasın diye** fonksiyon.
 *
 * `dataPackColumns()` ile aynı gerekçe: altı ligin ortak alanları altı kez
 * yazılsaydı, IFAB bir kuralı değiştirdiği gün beşi güncellenip biri
 * unutulabilirdi. Farklı olan her alan çağrı yerinde **açıkça** eziliyor,
 * yani bir ligin neyi farklı yaptığı okunarak görülüyor.
 *
 * ⚠️ `extraTimeSubstitution: false` — lig maçında uzatma **yok**. Kupalarda
 * `true`. İkisi de gerçek ve `jsonb` yuvarlak yolculuğunun her iki boole
 * değerini de kapsıyor.
 */
function leagueRules(overrides: Partial<CompetitionRules>): CompetitionRules {
  return {
    teamCount: 20,
    format: 'round_robin_double',
    pointsWin: 3,
    pointsDraw: 1,
    relegationCount: 3,
    // v1'de 2. lig kademesi YOK (CLAUDE.md §16.1 — v2 kasası), yani hiçbir
    // ligin üstüne çıkılmıyor. `0` uydurma değil, kapsamın birebir karşılığı.
    promotionCount: 0,
    // ⚠️ CLAUDE.md §16.2 ③: Süper Lig play-off formatı sezona göre değişiyor,
    // `playoffSpots` yapılandırılabilir bırakıldı ve **varsayılan 0**. Anayasa
    // bu belirsizliği adıyla sayıyor; `competition-rules.ts`in yorumundaki
    // *"Türkiye: 4"* alanın ne anlama geldiğini gösteren bir ÖRNEK, bir veri
    // kararı değil. Çelişkide anayasa kazanır.
    playoffSpots: 0,
    continentalSpots: { ucl: 4, uel: 2, uecl: 1 },
    tiebreakers: ['points', 'goal_diff', 'goals_for', 'head_to_head'],
    squadRegistration: {
      maxSquadSize: 25,
      maxForeign: null,
      homegrownMin: 8,
      u21Exempt: true,
    },
    varEnabled: true,
    substitutionsAllowed: 5,
    substitutionWindows: 3,
    extraTimeSubstitution: false,
    yellowCardSuspensionThresholds: [5, 10, 15],
    transferWindows: [
      { start: '06-16', end: '09-01' },
      { start: '01-01', end: '02-03' },
    ],
    ...overrides,
  };
}

/**
 * Kupa kuralları için ortak taban.
 *
 * ⚠️ `transferWindows: []` — transfer dönemi **ülkenin/ligin** özelliği, kupanın
 * değil. Boş dizi burada "bilinmiyor" değil, *"bu yarışma dönem tanımlamaz"*
 * demek ve `z.array(...)` boş diziyi kabul ediyor. Aynı satır `jsonb`in boş
 * dizi yolunu da kapsıyor.
 *
 * ⚠️ `tiebreakers: ['points']` — eleme usulünde eşitlik bozma **anlamsız**, ama
 * şema en az bir ölçüt istiyor (*"boş bir liste eşitliği hiç bozamaz"*). Tek
 * elemanlı liste bu zorunluluğun dürüst asgarisi.
 */
function cupRules(overrides: Partial<CompetitionRules>): CompetitionRules {
  return {
    teamCount: 64,
    format: 'knockout',
    pointsWin: 3,
    pointsDraw: 1,
    relegationCount: 0,
    promotionCount: 0,
    playoffSpots: 0,
    continentalSpots: { ucl: 0, uel: 0, uecl: 0 },
    tiebreakers: ['points'],
    squadRegistration: {
      // `null` = sınır yok — `competitions.ts`in kendi notu: *"kupalarda sık"*.
      maxSquadSize: null,
      maxForeign: null,
      homegrownMin: null,
      u21Exempt: false,
    },
    varEnabled: true,
    substitutionsAllowed: 5,
    substitutionWindows: 3,
    // Uzatmaya giden eleme maçında altıncı değişiklik hakkı (IFAB).
    extraTimeSubstitution: true,
    yellowCardSuspensionThresholds: [3],
    transferWindows: [],
    ...overrides,
  };
}

/**
 * 6 lig + 5 kupa = **11 yarışma**.
 *
 * ⚠️ **Beşli kupa kümesi kozmetik değil — dört vakayı birden kapsıyor.**
 * `country_id` ve `tier` sütunlarının ikisi de nullable (SAPMA-026 ②) ve bu
 * liste dört kombinasyonun hepsini temsil ediyor:
 *
 *   | | `country_id` dolu | `country_id` NULL |
 *   |---|---|---|
 *   | **`tier` dolu** | altı lig | — (anlamsız: kademe ülkeye aittir) |
 *   | **`tier` NULL** | Türkiye Kupası · FA Cup | UCL · UEL · UECL |
 *
 * İki **farklı ülkeden** yerel kupa alınması da bilinçli: tek ülkeden iki kupa,
 * FK çözümlemesini tek bir ülkeye hapseder ve *"skaler alt sorgu doğru satırı
 * buluyor mu"* sorusunu sınamazdı.
 *
 * ⚠️ **Üç UEFA yarışması, liglerin `continentalSpots`unun İŞARET ETTİĞİ
 * şeylerdir.** Bir lig `ucl: 4` diyorsa gideceği yer bu tabloda olmak zorunda;
 * `world-seed-data.test.ts` bunu çapraz doğruluyor. Seed kendi içinde tutarlı
 * olmasaydı Faz 16'nın takvimi var olmayan bir yarışmaya bilet keserdi.
 */
export const SEED_COMPETITIONS: readonly CompetitionSeed[] = [
  // ── Altı lig ──────────────────────────────────────────────────────────────
  {
    key: 'premierleague',
    code: 'ENG_PREMIER_LEAGUE',
    countryKey: 'england',
    type: 'league',
    tier: 1,
    reputation: 195,
    seasonStartMonth: 8,
    seasonEndMonth: 5,
    rules: leagueRules({
      continentalSpots: { ucl: 5, uel: 2, uecl: 1 },
      // İngiltere'de yabancı kotası yok; sınır **yerli yetiştirme** tarafında
      // ve çalışma izni GBE ile ayrıca denetleniyor (`countries.work_permit_rule_key`).
      squadRegistration: { maxSquadSize: 25, maxForeign: null, homegrownMin: 8, u21Exempt: true },
    }),
    externalIds: {},
  },
  {
    key: 'laliga',
    code: 'ESP_LALIGA',
    countryKey: 'spain',
    type: 'league',
    tier: 1,
    reputation: 190,
    seasonStartMonth: 8,
    seasonEndMonth: 5,
    rules: leagueRules({
      continentalSpots: { ucl: 5, uel: 2, uecl: 1 },
      // AB dışı kontenjanı — `work_permit_rule_key: 'eu_quota'` ile aynı rejim.
      squadRegistration: { maxSquadSize: 25, maxForeign: 3, homegrownMin: null, u21Exempt: true },
      // LaLiga eşitlikte önce ikili averaja bakar; Premier League gol averajına.
      tiebreakers: ['points', 'head_to_head', 'goal_diff', 'goals_for'],
    }),
    externalIds: {},
  },
  {
    key: 'bundesliga',
    code: 'GER_BUNDESLIGA',
    countryKey: 'germany',
    type: 'league',
    tier: 1,
    reputation: 185,
    seasonStartMonth: 8,
    seasonEndMonth: 5,
    rules: leagueRules({
      teamCount: 18,
      relegationCount: 2,
      continentalSpots: { ucl: 4, uel: 2, uecl: 1 },
      squadRegistration: {
        maxSquadSize: null,
        maxForeign: null,
        homegrownMin: 12,
        u21Exempt: true,
      },
    }),
    externalIds: {},
  },
  {
    key: 'seriea',
    code: 'ITA_SERIE_A',
    countryKey: 'italy',
    type: 'league',
    tier: 1,
    reputation: 186,
    seasonStartMonth: 8,
    seasonEndMonth: 5,
    rules: leagueRules({
      continentalSpots: { ucl: 4, uel: 2, uecl: 1 },
      tiebreakers: ['points', 'head_to_head', 'goal_diff', 'goals_for'],
    }),
    externalIds: {},
  },
  {
    key: 'ligue1',
    code: 'FRA_LIGUE_1',
    countryKey: 'france',
    type: 'league',
    tier: 1,
    reputation: 175,
    seasonStartMonth: 8,
    seasonEndMonth: 5,
    rules: leagueRules({
      teamCount: 18,
      relegationCount: 2,
      continentalSpots: { ucl: 3, uel: 1, uecl: 1 },
      squadRegistration: { maxSquadSize: 25, maxForeign: 4, homegrownMin: 8, u21Exempt: true },
    }),
    externalIds: {},
  },
  {
    key: 'superlig',
    code: 'TUR_SUPERLIG',
    countryKey: 'turkiye',
    type: 'league',
    tier: 1,
    reputation: 150,
    seasonStartMonth: 8,
    seasonEndMonth: 5,
    rules: leagueRules({
      teamCount: 18,
      relegationCount: 4,
      continentalSpots: { ucl: 1, uel: 1, uecl: 2 },
      // `spec/01`'in `maxForeign` örneği: *"TR: 14"*.
      squadRegistration: {
        maxSquadSize: null,
        maxForeign: 14,
        homegrownMin: null,
        u21Exempt: false,
      },
      tiebreakers: ['points', 'head_to_head', 'goal_diff', 'goals_for'],
      transferWindows: [
        { start: '06-13', end: '09-12' },
        { start: '01-09', end: '02-10' },
      ],
    }),
    externalIds: {},
  },

  // ── Üç kıta turnuvası — `country_id` NULL, `tier` NULL ────────────────────
  {
    key: 'uefachampionsleague',
    code: 'UEFA_UCL',
    countryKey: null,
    type: 'continental',
    tier: null,
    reputation: 200,
    seasonStartMonth: 9,
    seasonEndMonth: 5,
    rules: cupRules({
      teamCount: 36,
      // 2024/25'ten beri tek lig aşaması — şemanın `swiss` formatı bunun için var.
      format: 'swiss',
      // UEFA "A Listesi": 25 kişi, sekizi kulüpte yetişmiş.
      squadRegistration: { maxSquadSize: 25, maxForeign: null, homegrownMin: 8, u21Exempt: true },
      tiebreakers: ['points', 'goal_diff', 'goals_for', 'wins'],
    }),
    externalIds: {},
  },
  {
    key: 'uefaeuropaleague',
    code: 'UEFA_UEL',
    countryKey: null,
    type: 'continental',
    tier: null,
    reputation: 175,
    seasonStartMonth: 9,
    seasonEndMonth: 5,
    rules: cupRules({
      teamCount: 36,
      format: 'swiss',
      squadRegistration: { maxSquadSize: 25, maxForeign: null, homegrownMin: 8, u21Exempt: true },
      tiebreakers: ['points', 'goal_diff', 'goals_for', 'wins'],
    }),
    externalIds: {},
  },
  {
    key: 'uefaconferenceleague',
    code: 'UEFA_UECL',
    countryKey: null,
    type: 'continental',
    tier: null,
    reputation: 150,
    seasonStartMonth: 9,
    seasonEndMonth: 5,
    rules: cupRules({
      teamCount: 36,
      format: 'swiss',
      squadRegistration: { maxSquadSize: 25, maxForeign: null, homegrownMin: 8, u21Exempt: true },
      tiebreakers: ['points', 'goal_diff', 'goals_for', 'wins'],
    }),
    externalIds: {},
  },

  // ── İki yerel kupa, İKİ FARKLI ÜLKEDEN ────────────────────────────────────
  {
    key: 'facup',
    code: 'ENG_FA_CUP',
    countryKey: 'england',
    type: 'domestic_cup',
    tier: null,
    reputation: 160,
    seasonStartMonth: 8,
    seasonEndMonth: 5,
    // Kupayı kazanan Avrupa'ya gidiyor — `continentalSpots` bir kupada
    // *"şampiyonu nereye gönderir"* demek. Bu satır UEFA_UEL'e işaret ediyor
    // ve testte çapraz doğrulanıyor.
    rules: cupRules({ continentalSpots: { ucl: 0, uel: 1, uecl: 0 } }),
    externalIds: {},
  },
  {
    key: 'turkiyekupasi',
    code: 'TUR_CUP',
    countryKey: 'turkiye',
    type: 'domestic_cup',
    tier: null,
    reputation: 120,
    seasonStartMonth: 10,
    seasonEndMonth: 5,
    rules: cupRules({ continentalSpots: { ucl: 0, uel: 1, uecl: 0 } }),
    externalIds: {},
  },
];
