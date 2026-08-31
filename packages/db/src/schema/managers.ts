/**
 * `managers` — teknik direktörler (kullanıcı ve yapay zeka). `spec/01` §3.1.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ `user_id` SÜTUNU **YAZILMIYOR** — SAPMA-032 / G-16, Faz 13
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/01` §3.1 `managers`ı `userId FK nullable` ile yazıyor (*"`null` = AI
 * menajer"*). **Bu sütun bu migration'da eklenmiyor ve eklenmemesi bilinçli bir
 * eylemdir**, unutma değil:
 *
 * - `users` §3.2 **save katmanında** ve ROADMAP'te **Faz 13**'te doğuyor.
 * - Kısıtsız bir `user_id` sütunu, fazın *"tüm yabancı anahtarlar tanımlı"*
 *   kabul kriterini **görünürde** sağlayıp gerçekte delerdi — Faz 3'ün üç ileri
 *   FK'sıyla (`federations.president_person_id` · `clubs.chairman_person_id` ·
 *   `referees.person_id`) **birebir aynı sınıf**. Onlar da bilerek yazılmamış,
 *   sütun ve kısıt **birlikte** 4.4'te (`0006`) eklenmişti.
 * - **Sütun ve kısıt birlikte Faz 13'te eklenir.**
 *
 * ℹ️ **Açık boşluk G-16 — ve sorusu bu tablonun kendisi hakkında:** master bir
 * tablo, save katmanına yabancı anahtar verebilir mi? `managers` §3.1'de
 * (master, K4: *"asla kullanıcı işlemiyle değiştirilmez"*) ama `userId` §3.2'deki
 * `users`a bakıyor — bir kullanıcı silinince master bir satır etkilenirdi.
 * Alternatif ilişkiyi **ters çevirmek** (`users.manager_id`), böylece bağ save
 * tarafında durur. **Yön kararı Faz 12'nin** (delta mimarisi), uygulama Faz 13.
 *
 * ⚠️ `is_user_manager` sütunu **yazılıyor** ve `user_id`nin yerini tutmuyor: biri
 * *"bu menajer bir insan tarafından mı oynanıyor"* der, diğeri *"hangi insan"*.
 * İkincisi olmadan birincisi anlamlı ve seed edilebilir.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * §3.1.2 ②'NİN AYRACI BU DOSYADA ÜÇ KEZ KOŞTU — VE İKİ FARKLI CEVAP VERDİ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * | Sütun | `spec/01` nasıl yazmış | Ayraç | Karar |
 * |---|---|---|---|
 * | `coaching_badge` | `'none'\|'c'\|'b'\|'a'\|'pro'` — **kapalı** | sözleşme | **CHECK** |
 * | `experience_level` | beş değer — **kapalı** | sözleşme | **CHECK** |
 * | `philosophy` | `text` + yorum `'attacking'\|'control'\|'balanced'\|`**`...`** | **açık uçlu** | **CHECK YOK** |
 * | `reputation` | `// 0-200` — sayısal **aralık** | kalibrasyon | **CHECK YOK** |
 *
 * ⚠️ **`philosophy`nin üç noktası kararı tek başına veriyor.** Kümenin **sonu
 * yazılmamış**, yani sayılamıyor — ve sayılamayan bir küme kapalı iddia
 * edilemez. Bu, 4.6'nın `player_traits.trait_code` gerekçesinin birebir aynısı;
 * aradaki tek fark orada kümenin **hiç** tanımlı olmaması, burada **eksik**
 * tanımlı olması. İkisi de aynı cevabı veriyor.
 *
 * `reputation` ise 3.6'nın `competitions.reputation` (0-200) kararıyla aynı
 * sınıf: aralık denetiminin yeri **Faz 11** (`pnpm validate:world`).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * §3.1.0 SÜTUNLARI TAŞINMIYOR · `ON DELETE` KURALI KOŞTURULDU
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Gerekçenin tamamı ve karşı-ölçüm `staff.ts` başlığında (`key` taşımak
 * `club_id`i `SET NULL` yerine RESTRICT yapardı — ölçüldü). Burada da aynı:
 * pakette kendi kaydı olan varlık **kişidir**, menajer kaydı kişinin
 * kimliğinden türüyor.
 *
 * | FK | Hedef | Kural | Hangi adım |
 * |---|---|---|---|
 * | `person_id` | `people` (**independent**) | **CASCADE** | ④ kaynak uydu + `NOT NULL` |
 * | `club_id` | `clubs` (**independent**) | **SET NULL** | ③ bütün sütunlar nullable |
 *
 * `club_id` `null` = **işsiz menajer** — bu bir hata durumu değil, oyunun
 * kendi mekaniği (kullanıcı menajeri kulüpsüz başlayabilir, Faz 13).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * BU TABLOYA GELEN FK — BUGÜN BİR, YARIN DÖRT (ölçüldü)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/01` tamamında `managerId` arandı: **dört** eşleşme.
 *
 * | Yer | Katman | Bu fazda |
 * |---|---|---|
 * | `manager_attributes.managerId` | §3.1 **master** | ✅ 4.7'de yazılıyor |
 * | `saves.managerId` | §3.2 **save** | Faz 13 |
 * | `manager_career.managerId` | §3.2 **save** | Faz 12 |
 * | `board_confidence.managerId` | §3.2 **save** | Faz 12 |
 *
 * Yani `managers` **1:N**'in kaynağı olacak ama bugün tek uydusu var. 1:1 ayracı
 * `manager_attributes` için ayrıca koşturuldu — o dosyanın başlığında.
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  integer,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

import { masterTable } from '../client/master.js';
import { clubs } from './clubs.js';
import { people } from './people.js';

/** `spec/01` §3.1 `managers.coachingBadge`. Kapalı küme → CHECK. */
export const COACHING_BADGES = ['none', 'c', 'b', 'a', 'pro'] as const;

export type CoachingBadge = (typeof COACHING_BADGES)[number];

/** `spec/01` §3.1 `managers.experienceLevel`. Kapalı küme → CHECK. */
export const MANAGER_EXPERIENCE_LEVELS = [
  'amateur',
  'former_player_lower',
  'former_player_mid',
  'former_player_top',
  'professional',
] as const;

export type ManagerExperienceLevel = (typeof MANAGER_EXPERIENCE_LEVELS)[number];

const literals = (values: readonly string[]): string =>
  values.map((value) => `'${value}'`).join(', ');

export const managers = masterTable(
  pgTable(
    'managers',
    {
      id: serial('id').primaryKey(),
      /** `ON DELETE CASCADE` — uydu kuralı (§3.1.2 ③/④). */
      personId: integer('person_id')
        .notNull()
        .references(() => people.id, { onDelete: 'cascade' }),
      // ⚠️ `user_id` BURAYA GELECEK — Faz 13, sütun ve kısıt BİRLİKTE.
      //    Gerekçe dosya başlığında (SAPMA-032 / G-16).
      /** Çalıştırdığı kulüp. `null` = **işsiz menajer**. */
      clubId: integer('club_id').references(() => clubs.id, { onDelete: 'set null' }),
      /**
       * Bir insan tarafından mı oynanıyor. **DEFAULT YOK** — `clubs.is_national`,
       * `players.is_newgen` ve `source` ile aynı ilke: bir varsayılan, kimsenin
       * belirtmediği satıra bir bilgi **uydururdu**. Unutulursa `INSERT`
       * gürültülü patlar; sessizce yanlış satır oluşmaz (SAPMA-026).
       */
      isUserManager: boolean('is_user_manager').notNull(),
      /** Antrenörlük lisansı. Kapalı küme → CHECK. */
      coachingBadge: text('coaching_badge').$type<CoachingBadge>().notNull(),
      /** Geçmiş deneyim sınıfı — itibar ve yönetim güveninin girdisi. */
      experienceLevel: text('experience_level').$type<ManagerExperienceLevel>().notNull(),
      /**
       * Oyun felsefesi. **CHECK YOK** — `spec/01` kümeyi `...` ile bitiriyor,
       * yani küme **sayılamıyor**. Gerekçe dosya başlığında.
       */
      philosophy: text('philosophy').notNull(),
      /** 0-200. Aralık denetimi Faz 11'de (§3.1.2 ②). */
      reputation: smallint('reputation').notNull(),
      /** Kariyer boyunca biriken deneyim. `smallint` değil `integer` — üst sınır yok. */
      experiencePoints: integer('experience_points').notNull(),
      /**
       * Konuştuğu diller. Şemanın ikinci dizi sütunu (`people.person_type`
       * birincisiydi) — round-trip'in `udtName` alanı bunu `_text` olarak
       * görüyor, gerekçesi 4.3'ün günlük #9 kaydında.
       *
       * **CHECK YOK:** `spec/01` dil kodları için bir küme yazmıyor ve
       * uydurmak SAPMA-026'nın yasağı. Faz 5 (i18n) dil kümesinin sahibi.
       */
      spokenLanguages: text('spoken_languages').array().notNull(),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
      check(
        'managers_coaching_badge_check',
        sql`${table.coachingBadge} IN (${sql.raw(literals(COACHING_BADGES))})`,
      ),
      check(
        'managers_experience_level_check',
        sql`${table.experienceLevel} IN (${sql.raw(literals(MANAGER_EXPERIENCE_LEVELS))})`,
      ),
    ],
  ),
);
