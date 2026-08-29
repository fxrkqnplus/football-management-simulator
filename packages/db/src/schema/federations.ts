/**
 * `federations` — ülke futbol federasyonu. `docs/spec/01-database.md` §3.1.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * VERİ PAKETİ SÜTUNLARINI TAŞIMIYOR — ve bu bir eksiklik DEĞİL
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/01` §3.1.0 `key` · `source` · `external_ids` üçlüsünü **pakette kendi
 * kaydı olarak görünen** varlıklara veriyor; `federations` orada açıkça
 * **taşımayanlar** listesinde. Sebep: federasyon bir **uydu** — kimliği
 * sahibinin kimliğidir ve ona `country_id` üzerinden erişilir. Kendi anahtarı
 * olsaydı, `tff` ile `turkiye` arasında hiçbir zaman kullanılmayan ikinci bir
 * eşleme yolu doğardı.
 *
 * Entegrasyon testi bunu **iddia ediyor**: `federations`ın sütun listesinde
 * `key`/`source`/`external_ids` yok. Yazılı bir sözleşme, sınanmadığı sürece
 * bir temennidir.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `president_person_id` BUGÜN YOK — Faz 4
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/01` bu sütunu `people` tablosuna işaret eden bir FK olarak tanımlıyor ve
 * `people` **Faz 4**'te geliyor. Sütunu bugün kısıtsız yazmak Faz 3'ün 3. kabul
 * kriterini (*"tüm yabancı anahtarlar tanımlı"*) **görünürde** sağlayıp gerçekte
 * delerdi. Faz 4'ün migration'ı sütunu ve FK'yı **birlikte** ekleyecek; karar
 * `docs/ROADMAP.md` Faz 3 tablo envanterinde ve Faz 4 maddesinde yazılı.
 */
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

import { masterTable } from '../client/master.js';
import { countries } from './countries.js';

export const federations = masterTable(
  pgTable('federations', {
    id: serial('id').primaryKey(),
    /**
     * `ON DELETE CASCADE` — uydu tablo kuralı.
     *
     * Federasyonun kimliği ülkenin kimliğidir; ülke veri paketinden çıkarsa
     * federasyonun tek başına anlamı kalmaz. Karşılaştır: `competitions.country_id`
     * **RESTRICT** alıyor, çünkü bir yarışma kendi `key`ini taşıyan bağımsız bir
     * varlık ve sessizce silinmemeli.
     */
    countryId: integer('country_id')
      .notNull()
      .references(() => countries.id, { onDelete: 'cascade' }),
    /**
     * Federasyonun kendi adı — `name_key` DEĞİL.
     *
     * `spec/01` bu alanı `name` yazıyor ve bu K5'i ihlal etmiyor: "Türkiye Futbol
     * Federasyonu" bir **özel isimdir**, arayüz metni değil. Çevrilecek bir şey yok.
     */
    name: text('name').notNull(),
    /** `null` = bilinmiyor. Uydurulmuş bir yıl, eksik bir yıldan kötüdür. */
    foundedYear: integer('founded_year'),
    /** `null` → logo prosedürel üretilir (K9). */
    assetId: text('asset_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  }),
);
