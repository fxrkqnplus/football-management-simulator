/**
 * `CompetitionRules` — `competitions.rules` (`jsonb`) sütununun Zod şeması.
 *
 * Tanım `docs/spec/01-database.md` §3.1'den birebir türetildi. Tip `z.infer` ile
 * alınıyor (CLAUDE.md §1.3: *"Tipler Zod şemasından türetilir"*), yani şema ile
 * tip **ayrışamaz**.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN `packages/db`DE, `packages/shared`DA DEĞİL
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Şema yalnızca **bu sütunu** doğruluyor ve tek tüketicisi yanındaki tablo
 * tanımı. `@fms/shared`ın kök barrel'ına konsaydı `zod` o barrel üzerinden
 * tarayıcı paketine kadar akardı — Faz 2.1'de ölçülüp 2.2a'da düzeltilen alt yol
 * sızıntısının (SAPMA-012) aynı sınıfı. `packages/shared` bugün `sideEffects:
 * false` ve dar tutuluyor; oraya bir doğrulama şeması itmek o kararı geri alırdı.
 *
 * Şema başka bir katmana gerektiği gün (Faz 20 taktik, Faz 35 kadro kaydı)
 * taşınabilir — ama **tüketicisi ortaya çıktığında**, spekülatif olarak değil
 * (SAPMA-017'nin ölçütü).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ FAZ 12'YE NOT — `Readonly<T>` BU ŞEMAYI KORUMAZ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `docs/spec/01-database.md` §3.4.1 sonunda ölçüldü: TypeScript'in yerleşik
 * `Readonly<T>`si **sığdır**. Bu tip iç içe (`continentalSpots`,
 * `squadRegistration`, `transferWindows[]`), yani `WorldView`ın dönüşü
 * `Readonly<Competition>` olsa bile `rules.squadRegistration.maxForeign = 99`
 * **derlenir**. `WorldView` gerçek bir `DeepReadonly` yazmak zorunda —
 * bugün yazılmıyor (K12: tüketicisi Faz 12'de), ama şema o gün sarmalanacak
 * şekilde **düz veri** tutuyor: sınıf yok, metot yok, `Date` yok.
 */
import { z } from 'zod';

/** Yarışma formatı — `docs/spec/01-database.md` §3.1. */
export const COMPETITION_FORMATS = [
  'round_robin_double',
  'round_robin_single',
  'knockout',
  'group_knockout',
  'swiss',
] as const;

export type CompetitionFormat = (typeof COMPETITION_FORMATS)[number];

/** Eşitlik bozma ölçütleri — sıra ÖNEMLİ, dizideki sırayla uygulanır. */
export const TIEBREAKERS = ['points', 'goal_diff', 'goals_for', 'head_to_head', 'wins'] as const;

export type Tiebreaker = (typeof TIEBREAKERS)[number];

/**
 * `MM-DD` — yıl taşımaz.
 *
 * Transfer dönemleri her sezon aynı takvim gününde açılıyor; yıl yazılsaydı
 * `CompetitionRules` sezona bağlı olurdu ve `spec/01` §3.1.1'in *"sezon bir tablo
 * değil skaler bir sütun"* kararıyla çelişirdi. Şubat 30 gibi imkânsız günleri
 * regex eliyor; ay uzunluğu denetimi bilerek yok (29 Şubat geçerli bir tarih ve
 * artık yıl bilgisi burada yok).
 */
const monthDay = z
  .string()
  .regex(/^(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/, 'MM-DD biçiminde olmalı');

const nonNegativeInt = z.int().min(0);

/**
 * ⚠️ `strictObject`: tanınmayan anahtar **reddedilir**.
 *
 * `rules` bir veri paketinden geliyor (K9) ve `jsonb` her şeyi kabul eder.
 * Gevşek bir şemada `maxForeing: 14` yazan bir paket sessizce geçer, kural
 * uygulanmaz ve kadro kaydı (Faz 35) yanlış çalışır — hata mesajı olmadan.
 */
export const competitionRulesSchema = z.strictObject({
  teamCount: z.int().min(2),
  format: z.enum(COMPETITION_FORMATS),
  pointsWin: nonNegativeInt,
  pointsDraw: nonNegativeInt,
  relegationCount: nonNegativeInt,
  promotionCount: nonNegativeInt,
  /** Türkiye: 4 (2-5. sıra). Varsayılan 0 — format sezona göre değişiyor. */
  playoffSpots: nonNegativeInt,
  continentalSpots: z.strictObject({
    ucl: nonNegativeInt,
    uel: nonNegativeInt,
    uecl: nonNegativeInt,
  }),
  /** En az bir ölçüt olmalı: boş bir liste eşitliği hiç bozamaz. */
  tiebreakers: z.array(z.enum(TIEBREAKERS)).min(1),
  squadRegistration: z.strictObject({
    /** `null` = sınır yok (kupalarda sık). */
    maxSquadSize: z.int().min(1).nullable(),
    /** TR: 14. `null` = kota yok. */
    maxForeign: nonNegativeInt.nullable(),
    /** ENG: 8. `null` = zorunluluk yok. */
    homegrownMin: nonNegativeInt.nullable(),
    u21Exempt: z.boolean(),
  }),
  varEnabled: z.boolean(),
  substitutionsAllowed: nonNegativeInt,
  substitutionWindows: nonNegativeInt,
  extraTimeSubstitution: z.boolean(),
  /** `[5, 10, 15]` — birikimli sarı kart cezası eşikleri. */
  yellowCardSuspensionThresholds: z.array(z.int().min(1)),
  transferWindows: z.array(z.strictObject({ start: monthDay, end: monthDay })),
});

export type CompetitionRules = z.infer<typeof competitionRulesSchema>;
