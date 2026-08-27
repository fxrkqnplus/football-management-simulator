-- 0001_geography_institutions — GERİ ALMA (elle yazıldı)
--
-- drizzle-kit `down` migration ÜRETMİYOR (Faz 3.0'da ölçüldü,
-- docs/spec/01-database.md §3.0). Bu dosya elle yazılır; doğruluğunun ölçüldüğü
-- yer `meta/0000_snapshot.json` — yani `countries`in altı sütunlu hâli,
-- `competitions` ve `federations` YOK.
--
-- ⚠️ BU, KOŞUCUNUN KAYIP ÖLÇÜMÜNÜN İLK **KARIŞIK** VAKASI.
-- 0000'in geri alması tek sınıftı (`DROP TABLE`). Burada iki sınıf bir arada:
--   · `DROP TABLE`      → competitions, federations (tablonun her satırı gider)
--   · `DROP COLUMN` × 8 → countries (her satır o hücreleri kaybeder)
-- Koşucu bunu bir yorumdan okumaz, ÖLÇER: geri almayı tek bir işlemde uygular,
-- kaybolan tablo ve sütunları AYRI AYRI sayar (`loss.ts` → `LossItem.kind`),
-- sonra `allowDataLoss` verilmemişse işlemi geri alır ve reddeder.
--
-- SIRA `up`ın TERSİ ve bu zorunlu:
--   ① Önce FK sahibi tablolar düşer — `competitions` ve `federations` ikisi de
--      `countries(id)`e bakıyor. Ters sırada `countries`in sütunlarına
--      dokunmak sorun olmazdı, ama tabloları önce düşürmek bağımlılığı
--      açıkça görünür kılıyor.
--   ② Sonra CHECK kısıtları — sütun düşünce Postgres onları zaten düşürür,
--      ama AÇIKÇA yazılıyorlar: `up` onları adıyla ekledi, `down` da adıyla
--      kaldırıyor. Örtük bir cascade'e güvenmek, kısıt adı değiştiğinde
--      `down`un SESSİZCE yanlış çalışmasına yol açardı.
--   ③ En son sütunlar — 0000'in altı sütunu KALIR.

DROP TABLE "federations";--> statement-breakpoint
DROP TABLE "competitions";--> statement-breakpoint

ALTER TABLE "countries" DROP CONSTRAINT "countries_work_permit_rule_key_check";--> statement-breakpoint
ALTER TABLE "countries" DROP CONSTRAINT "countries_source_check";--> statement-breakpoint

ALTER TABLE "countries" DROP COLUMN "work_permit_rule_key";--> statement-breakpoint
ALTER TABLE "countries" DROP COLUMN "currency_code";--> statement-breakpoint
ALTER TABLE "countries" DROP COLUMN "uefa_coefficient";--> statement-breakpoint
ALTER TABLE "countries" DROP COLUMN "football_level";--> statement-breakpoint
ALTER TABLE "countries" DROP COLUMN "flag_asset_id";--> statement-breakpoint
ALTER TABLE "countries" DROP COLUMN "confederation";--> statement-breakpoint
ALTER TABLE "countries" DROP COLUMN "external_ids";--> statement-breakpoint
ALTER TABLE "countries" DROP COLUMN "source";
