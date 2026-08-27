/**
 * `club_facilities` — kulüp tesis düzeyleri (1-20). `docs/spec/01-database.md` §3.1.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * UYDU TABLO — iki sonucu var, ikisi de §3.1.0'dan geliyor
 * ────────────────────────────────────────────────────────────────────────────
 *
 * ① **Veri paketi sütunlarını (`key` · `source` · `external_ids`) TAŞIMAZ.**
 *    §3.1.0 bu üçlüyü pakette **kendi kaydı olarak görünen** varlıklara veriyor;
 *    `club_facilities` orada açıkça *taşımayanlar* listesinde. `spec/12` §17.4
 *    bunu doğruluyor: tesisler `clubs.json` içinde **gömülü bir nesne**
 *    (`"facilities": { "trainingGround": 16, … }`), ayrı bir paket dosyası değil.
 *    Kendi anahtarı olsaydı hiçbir zaman kullanılmayan ikinci bir eşleme yolu
 *    doğardı.
 *
 * ② **`ON DELETE CASCADE`** (§3.1.2 ③) — kimliği sahibinin kimliğidir; kulüp
 *    gidince tesis satırının tek başına anlamı kalmaz.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `club_id` HEM BİRİNCİL ANAHTAR HEM YABANCI ANAHTAR — ayrı bir `id` YOK
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/01` bunu `clubId PK FK` diye yazıyor ve 1:1 ilişkinin tek doğru
 * gösterimi bu. Ayrı bir `serial id` eklemek **ikinci bir kimlik yolu** açardı:
 * aynı kulüp için iki tesis satırı yaratmak mümkün olur ve "hangisi geçerli?"
 * sorusu şemada cevapsız kalırdı. Birincil anahtarın kendisi FK olunca teklik
 * veritabanı seviyesinde garanti.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ALTI SÜTUN, HEPSİ 1-20 — CHECK YOK
 * ────────────────────────────────────────────────────────────────────────────
 *
 * §3.1.2 ②: sayısal aralık **kalibrasyondur**, sözleşme değil. Aralık denetimi
 * Faz 11 doğrulayıcısında.
 *
 * ⚠️ `spec/12` §17.4'ün `clubs.json` örneği `facilities` altında **dört** alan
 * gösteriyor (`trainingGround`, `youthAcademy`, `youthRecruitment`,
 * `medicalCentre`); `spec/01` **altı** istiyor (+ `dataAnalysis`,
 * `stadiumQuality`). Şema `spec/01`'i izliyor — paket örneği bir örnektir,
 * şema sözleşmedir. Pakette eksik kalan iki alanı Faz 8 ingest'i dolduracak.
 */
import { integer, pgTable, smallint, timestamp } from 'drizzle-orm/pg-core';

import { masterTable } from '../client/master.js';
import { clubs } from './clubs.js';

export const clubFacilities = masterTable(
  pgTable('club_facilities', {
    clubId: integer('club_id')
      .primaryKey()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    trainingGround: smallint('training_ground').notNull(),
    youthAcademy: smallint('youth_academy').notNull(),
    youthRecruitment: smallint('youth_recruitment').notNull(),
    medicalCentre: smallint('medical_centre').notNull(),
    dataAnalysis: smallint('data_analysis').notNull(),
    stadiumQuality: smallint('stadium_quality').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  }),
);
