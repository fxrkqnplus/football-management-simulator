/**
 * `countries` — MİNİMAL. Tam hâli Faz 3.4'te.
 *
 * Bu tablo 3.2a'da bilerek eksik yazıldı: migration koşucusunun test edebileceği
 * *gerçek* bir migration gerekiyordu ve koşucuyu sahte bir şemaya karşı kanıtlamak
 * D5 deseninin ta kendisi olurdu. 3.4 bunu `docs/spec/01-database.md` §3.1 ve
 * §3.1.0'a göre tamamlayacak: `confederation`, `flag_asset_id`, `football_level`,
 * `uefa_coefficient`, `currency_code`, `work_permit_rule_key`, `source` (CHECK'li)
 * ve `external_ids`.
 *
 * O tamamlama bir `ALTER TABLE` migration'ı olacak — yani koşucunun ikinci bir
 * gerçek müşterisi.
 */
import { pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const countries = pgTable('countries', {
  id: serial('id').primaryKey(),
  /** Veri paketi eşleme anahtarı. Benzersizlik TABLO BAŞINA (spec/01 §3.1.0). */
  key: text('key').notNull().unique(),
  /** ISO 3166-1 alpha-3: TUR, ENG, ESP… */
  code: varchar('code', { length: 3 }).notNull().unique(),
  /** i18n anahtarı — görünen ad koda gömülmez (K5). */
  nameKey: text('name_key').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
