/**
 * FAZ 4.9 — 5.000 OYUNCUNUN DETERMİNİSTİK ÜRETECİ. **SAF.**
 *
 * Girdi bir **indeks**, çıktı o indeksin satırı. Veritabanı erişimi yok, ağ
 * yok, dosya sistemi yok, `Date.now()` yok, `Math.random()` yok, modül düzeyinde
 * değiştirilebilir durum yok. Aynı indeks her zaman aynı satırı verir.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN `SeededRng` KULLANMIYOR — ÇÜNKÜ `SeededRng` YOK (ölçüldü)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * K2 tüm rastgeleliği `SeededRng`e bağlıyor. Sınıf **repoda hiçbir yerde yok**
 * ve bu tahmin değil ölçüm: `packages/engine/src/index.ts`in gövdesi
 * `export {};`, ve `SeededRng` yalnızca **yorum satırlarında** geçiyor
 * (`referees.ts` · `debug-trace.ts` · `correlation.ts` · `DebugPanel.tsx` ·
 * bu paketin `world-seed-data.ts`i). `DebugPanel.tsx` doğrudan söylüyor:
 * *"`SeededRng` Faz 22'de (maç motoru) gelecek."*
 *
 * ⚠️ **`referees.ts:23` bugün karşılıksız bir cümle taşıyor** — *"`SeededRng`
 * deterministik bir anahtar veriyor"*, şimdiki zamanda, var olmayan bir sınıf
 * için. 4.9 o dosyaya dokunmuyor (K12: bu alt görevin kapsamı seed) ama not
 * `PROJECT_MEMORY.md`nin FAZ 4 çalışma günlüğünde duruyor.
 *
 * `packages/shared`a bir RNG yazmak bir **mimari değişiklik** olurdu ve
 * tüketicisi yok (K12, SAPMA-017'nin ölçütü). Bu yüzden üreteç **burada**,
 * `tools/data-cli` altında ve **yerel** yaşıyor: 3.8'in kararının
 * (*"veri sabit yazıldığı için K2 yapısal olarak sağlanıyor"*) bir kademe
 * ileri taşınmış hâli — veri artık sabit değil **türetilmiş**, ama türetme
 * saf ve girdisi bir indeks olduğu için belirsizlik yine **yok**.
 *
 * ⚠️ **FAZ 22 GELDİĞİNDE NE OLACAK — bugün ölçülemez, o yüzden SORU olarak
 * yazılıyor, cevap olarak değil.** `SeededRng`in imzası `spec`te
 * `new SeededRng(saveId, turnNumber, entityId, purpose)` biçiminde ve dördü de
 * **kayıt/tur** kavramları; bu üretecin böyle bir bağlamı yok (master veri,
 * kayıt öncesi). Yani iki olasılık duruyor ve hangisinin doğru olduğu Faz 22'nin
 * kendi tasarımına bağlı: ① bu üreteç `SeededRng`in bir **tüketicisi** olur
 * (indeks → `entityId`, `purpose = 'seed.player'`), ② `SeededRng` kayıt-kapsamlı
 * kalır ve bu üreteç master hattın ayrı aracı olarak **yerinde durur**.
 * Bugün seçim yapmak, tüketicisi olmayan bir soyutlamayı şimdiden şekillendirmek
 * olurdu.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * BAĞIMSIZ AKIŞLAR — YENİ BİR ALAN ESKİLERİ KAYDIRMAZ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Her alan kendi **numaralı akışından** çekiyor; değerler tek bir sayaçtan
 * sırayla tüketilmiyor. Fark yapısal: sıralı tüketimde araya bir alan eklemek
 * ondan **sonraki her alanı** kaydırır, yani 4.10'un ölçtüğü satır sayısı bir
 * sonraki turda sessizce başka bir sayıya döner. Numaralı akışlarda yeni bir
 * alan yalnızca **kendi** akışını kullanır.
 *
 * ⚠️ Bu yüzden `STREAMS` numaraları **yeniden kullanılmaz ve kaydırılmaz** —
 * bir numarayı değiştirmek o alanın bütün 5.000 değerini değiştirir.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * DOĞUM TARİHİ, `ageRangeToBirthDateRange`İN **KENDİ TANIMINDAN** ÜRETİLİYOR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Yaştan tarihe çevrim burada **ikinci kez yazılmıyor**;
 * `packages/db/src/schema/transfer-search.ts`in fonksiyonu `age`–`age` aralığıyla
 * çağrılıp o yaşın **tam penceresi** alınıyor, gün o pencerenin içinden
 * seçiliyor. Sonuç bir tanım gereği doğru: kriter 3'ün sorgusu aynı fonksiyonu
 * `20`–`24` ile çağırdığında, bu üretecin `age ∈ [20,24]` yazdığı **her** satırı
 * kapsar ve dışındaki hiçbirini kapsamaz.
 *
 * Ayrı bir formül yazılsaydı bir gün kayması **sessiz** olurdu: sorgu yine
 * çalışır, yalnızca farklı satırlar döner ve hiçbir kapı ötmez — o fonksiyonun
 * başlığının adıyla uyardığı şey.
 */
import { ageRangeToBirthDateRange } from '@fms/db';

import type {
  AbilityBand,
  PersonSeed,
  PlayerSeed,
  PlayerSeedSet,
  Weighted,
} from './player-seed-data.js';
import {
  ABILITY_BAND_WEIGHTS,
  ABILITY_CEILING,
  AGE_WEIGHTS,
  FOOT_PROFILE_WEIGHTS,
  GOALKEEPER_HEIGHT_BONUS_CM,
  HEIGHT_BASE_CM,
  HEIGHT_SPREAD_CM,
  NAME_POOLS,
  NATIONALITY_WEIGHTS,
  PA_GROWTH_SLOPE,
  PA_MAX_YEARS_TO_PEAK,
  PA_PEAK_AGE,
  PA_UNCERTAINTY_AGE_FACTOR,
  PA_UNCERTAINTY_BASE,
  PA_UNCERTAINTY_MAX,
  PA_UNCERTAINTY_MIN,
  PA_YOUTH_BONUS_AGE_LIMIT,
  PA_YOUTH_BONUS_BASE_AGE,
  PA_YOUTH_BONUS_PER_YEAR,
  POSITION_WEIGHTS,
  SECOND_NATIONALITY_WEIGHT,
  SEED_PLAYER_COUNT,
  SEED_REFERENCE_DATE,
  seedPlayerKey,
  WEIGHT_FROM_HEIGHT_OFFSET,
  WEIGHT_SPREAD_MAX_KG,
  WEIGHT_SPREAD_MIN_KG,
  WEIGHT_TOTAL,
} from './player-seed-data.js';

/**
 * Alan → akış numarası. **Sabit**; bir numarayı değiştirmek o alanın bütün
 * değerlerini değiştirir (dosya başlığı).
 */
const STREAMS = {
  position: 1,
  age: 2,
  birthDayOffset: 3,
  nationality: 4,
  hasSecondNationality: 5,
  secondNationality: 6,
  firstName: 7,
  lastName: 8,
  portraitSeed: 9,
  height: 10,
  weightSpread: 11,
  footProfile: 12,
  footStrong: 13,
  footWeak: 14,
  abilityBand: 15,
  abilityWithinBand: 16,
  growthSlope: 17,
} as const;

/** Altın oran sabiti — akış numaralarını birbirinden uzaklaştırmak için. */
const STREAM_SALT = 0x9e3779b1;

/**
 * 32 bitlik karıştırıcı (splitmix32 sonlandırıcısı).
 *
 * `Math.imul` **zorunlu**: düz `*` çift duyarlıklı kayan noktaya taşar ve
 * sonuç 32 bitlik tamsayı aritmetiği olmaktan çıkar — aynı ifade farklı
 * motorlarda farklı sonuç verebilirdi. `>>> 0` işaretsiz 32 bite kelepçeliyor.
 */
function mix32(value: number): number {
  let x = value | 0;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  x ^= x >>> 15;
  return x >>> 0;
}

/**
 * Bir satır indeksi ve bir akış numarası için işaretsiz 32 bitlik değer.
 *
 * ⚠️ **Determinizmin tek kaynağı burası.** `index`i yok sayan bir mutasyon
 * (örneğin sabit dönmek) bütün satırları eşitler ve `player-generator.test.ts`
 * bunu **kırar** — nöbetçi orada, raporda değil.
 */
export function streamValue(index: number, stream: number): number {
  return mix32(mix32(index + 1) ^ mix32(Math.imul(stream, STREAM_SALT)));
}

/** `[min, max]` aralığına (iki uç dahil) düşürür. */
function inRange(value: number, band: AbilityBand): number {
  return band.min + (value % (band.max - band.min + 1));
}

/**
 * Ağırlıklı seçim. Ağırlık toplamının `WEIGHT_TOTAL` olduğu **varsayılmıyor**,
 * tablodan toplanıyor — ve `player-seed-data.test.ts` toplamın 1.000 olduğunu
 * ayrıca iddia ediyor. İki taraf da olmasa bir ağırlık hatası sessizce geçerdi.
 */
function pickWeighted<T>(table: readonly Weighted<T>[], value: number): T {
  const total = table.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = value % total;
  for (const entry of table) {
    if (cursor < entry.weight) {
      return entry.value;
    }
    cursor -= entry.weight;
  }
  // Erişilemez: `cursor < total` ve ağırlıklar toplamı `total`. Sessiz bir
  // `undefined` dönmektense gürültülü ölmek doğru davranış (CLAUDE.md §1.3).
  throw new RangeError(`Ağırlıklı seçim tabloyu tüketti: value=${String(value)}`);
}

/** `YYYY-MM-DD` → UTC milisaniye. Biçim `ageRangeToBirthDateRange`in çıktısı. */
function isoToUtcMillis(iso: string): number {
  return Date.parse(`${iso}T00:00:00.000Z`);
}

const DAY_MS = 86_400_000;

/** UTC milisaniye → `YYYY-MM-DD`. */
function utcMillisToIso(millis: number): string {
  return new Date(millis).toISOString().slice(0, 10);
}

/**
 * `age` yaşındaki bir kişinin doğum tarihi — o yaşın penceresi içinden
 * deterministik bir gün.
 *
 * Pencere `ageRangeToBirthDateRange(age, age, …)`ten geliyor; çevrim burada
 * **yeniden yazılmıyor** (dosya başlığı). Artık yıl kelepçesi de o fonksiyonun
 * içinde ve üç testle sabitlenmiş durumda.
 */
export function birthDateForAge(age: number, dayOffset: number): string {
  const window = ageRangeToBirthDateRange(age, age, SEED_REFERENCE_DATE);
  const from = isoToUtcMillis(window.from);
  const to = isoToUtcMillis(window.to);
  const dayCount = Math.round((to - from) / DAY_MS) + 1;
  return utcMillisToIso(from + (dayOffset % dayCount) * DAY_MS);
}

/** `clamp(low, high, value)` — `spec/02` §4.4'ün üç argümanlı biçimi. */
function clamp(low: number, high: number, value: number): number {
  return Math.min(high, Math.max(low, value));
}

/**
 * PA ve belirsizlik bandı — `docs/spec/02-attributes.md` §4.4'ün formülü.
 *
 * ⚠️ İki terim **bilerek düşürüldü** ve ikisi de aynı sebeple: girdileri yok.
 * `growthSlope` orada *"son iki sezonun CA farkı"*, `minutesConfidence` ise
 * oynanan dakika — ikisinin de kaynağı `player_stats_history` ve o tablo 4.9'da
 * **boş kalıyor** (KARAR 1). Uydurulmuş bir geçmiş yerine `growthSlope` küçük
 * bir bant, `minutesConfidence` **sıfır** kabul ediliyor; ikisi de yazılı.
 * `eliteBonus` (*"23 yaşından önce üst ligde oynadı mı"*) de aynı sebeple yok.
 *
 * **`CA <= PA` ve `pa_range_min <= pa_range_max` İNŞA GEREĞİ sağlanıyor:**
 * `clamp(CA, 200, …)` her üç değeri de `[CA, 200]` aralığına oturtuyor ve
 * kelepçe monoton olduğu için `PA − u <= PA + u` sırası korunuyor. İkisi de
 * `0007`in CHECK kısıtı (4.5) ve *"5.000 satır girdi, patlamadı"* tek başına
 * **kör bir kontrol** olurdu — kısıtın ısırdığı, ihlal eden **tek** bir satırla
 * ayrıca gösteriliyor (`world-seed.itest.ts`).
 */
export function derivePotential(
  currentAbility: number,
  age: number,
  growthSlope: number,
): { potentialAbility: number; paRangeMin: number; paRangeMax: number } {
  const youthBonus =
    age <= PA_YOUTH_BONUS_AGE_LIMIT ? (PA_YOUTH_BONUS_BASE_AGE - age) * PA_YOUTH_BONUS_PER_YEAR : 0;
  const yearsToPeak = clamp(0, PA_MAX_YEARS_TO_PEAK, PA_PEAK_AGE - age);
  const potentialAbility = clamp(
    currentAbility,
    ABILITY_CEILING,
    Math.round(currentAbility + growthSlope * yearsToPeak + youthBonus),
  );

  const uncertainty = clamp(
    PA_UNCERTAINTY_MIN,
    PA_UNCERTAINTY_MAX,
    Math.round(PA_UNCERTAINTY_BASE - age * PA_UNCERTAINTY_AGE_FACTOR),
  );

  return {
    potentialAbility,
    paRangeMin: clamp(currentAbility, ABILITY_CEILING, potentialAbility - uncertainty),
    paRangeMax: clamp(currentAbility, ABILITY_CEILING, potentialAbility + uncertainty),
  };
}

/** Bir uyruk anahtarının ad havuzu. Havuz yoksa gürültülü ölür. */
function namePoolOf(countryKey: string): (typeof NAME_POOLS)[number] {
  const pool = NAME_POOLS.find((entry) => entry.countryKey === countryKey);
  if (pool === undefined) {
    throw new RangeError(`Ad havuzu yok: ${countryKey}`);
  }
  return pool;
}

/** Bir dizinin `index % length` elemanı. Boş dizide gürültülü ölür. */
function itemAt<T>(items: readonly T[], value: number): T {
  const item = items[value % items.length];
  if (item === undefined) {
    throw new RangeError(`Boş havuz: value=${String(value)}`);
  }
  return item;
}

/**
 * Tek bir satırın `people` ve `players` yüzü.
 *
 * Dışa açık, çünkü birim testi tek bir indeksin türetmesini bütün küme
 * üretilmeden okuyabilmeli.
 */
export function generatePlayerAt(index: number): {
  person: PersonSeed;
  player: PlayerSeed;
} {
  const key = seedPlayerKey(index);

  const primaryPosition = pickWeighted(POSITION_WEIGHTS, streamValue(index, STREAMS.position));
  const age = pickWeighted(AGE_WEIGHTS, streamValue(index, STREAMS.age));
  const birthDate = birthDateForAge(age, streamValue(index, STREAMS.birthDayOffset));

  const nationalityCountryKey = pickWeighted(
    NATIONALITY_WEIGHTS,
    streamValue(index, STREAMS.nationality),
  );
  // İkinci uyruk birinciden FARKLI olmak zorunda: aynı ülkeyi iki kez taşımak
  // bir çifte vatandaşlık değil, bir veri hatasıdır — ve FK onu yakalayamaz.
  const others = NATIONALITY_WEIGHTS.filter((entry) => entry.value !== nationalityCountryKey);
  const secondNationalityCountryKey =
    streamValue(index, STREAMS.hasSecondNationality) % WEIGHT_TOTAL < SECOND_NATIONALITY_WEIGHT
      ? pickWeighted(others, streamValue(index, STREAMS.secondNationality))
      : null;

  const pool = namePoolOf(nationalityCountryKey);
  const firstName = itemAt(pool.firstNames, streamValue(index, STREAMS.firstName));
  const lastName = itemAt(pool.lastNames, streamValue(index, STREAMS.lastName));

  const heightCm =
    HEIGHT_BASE_CM +
    (streamValue(index, STREAMS.height) % HEIGHT_SPREAD_CM) +
    (primaryPosition === 'GK' ? GOALKEEPER_HEIGHT_BONUS_CM : 0);
  const weightKg =
    heightCm +
    WEIGHT_FROM_HEIGHT_OFFSET +
    inRange(streamValue(index, STREAMS.weightSpread), {
      min: WEIGHT_SPREAD_MIN_KG,
      max: WEIGHT_SPREAD_MAX_KG,
    });

  const foot = pickWeighted(FOOT_PROFILE_WEIGHTS, streamValue(index, STREAMS.footProfile));
  const strong = inRange(streamValue(index, STREAMS.footStrong), foot.strong);
  const weak = inRange(streamValue(index, STREAMS.footWeak), foot.weak);

  const band = pickWeighted(ABILITY_BAND_WEIGHTS, streamValue(index, STREAMS.abilityBand));
  const currentAbility = inRange(streamValue(index, STREAMS.abilityWithinBand), band);
  const growthSlope = inRange(streamValue(index, STREAMS.growthSlope), PA_GROWTH_SLOPE);
  const potential = derivePotential(currentAbility, age, growthSlope);

  return {
    person: {
      key,
      firstName,
      lastName,
      birthDate,
      nationalityCountryKey,
      secondNationalityCountryKey,
      // `people.portrait_seed` `integer NOT NULL` — **işaretli** 32 bit.
      // `>>> 1` üst biti düşürüyor, yani değer her zaman `[0, 2^31−1]`
      // aralığında. Bu bir süsleme değil ölçülmüş bir düzeltme: işaretsiz
      // çıktı gerçek PostgreSQL'de `integer out of range` ile patladı
      // (günlük #34, gerekçe `PG_INTEGER_MAX` sabitinin başlığında).
      portraitSeed: streamValue(index, STREAMS.portraitSeed) >>> 1,
      age,
    },
    player: {
      personKey: key,
      primaryPosition,
      heightCm,
      weightKg,
      preferredFootRight: foot.leftIsStrong ? weak : strong,
      preferredFootLeft: foot.leftIsStrong ? strong : weak,
      currentAbility,
      ...potential,
    },
  };
}

/**
 * Kabul kriteri 1'in 5.000 satırı — iki tablo, tek geçiş, aynı sırada.
 *
 * **Saf ve deterministik:** aynı `count` her zaman birebir aynı diziyi verir.
 * `count` yalnızca testlerin küçük kümelerle çalışabilmesi için parametre;
 * varsayılanı `SEED_PLAYER_COUNT` ve ilk `n` satır her zaman aynı satırlardır
 * (indeks bağımlı üretim, sıralı tüketim değil).
 */
export function generatePlayerSeeds(count: number = SEED_PLAYER_COUNT): PlayerSeedSet {
  const people: PersonSeed[] = [];
  const players: PlayerSeed[] = [];

  for (let index = 0; index < count; index += 1) {
    const row = generatePlayerAt(index);
    people.push(row.person);
    players.push(row.player);
  }

  return { people, players };
}
