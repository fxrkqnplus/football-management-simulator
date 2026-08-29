-- 0004_search_indexes — GERİ ALMA (elle yazıldı)
--
-- drizzle-kit `down` migration ÜRETMİYOR (Faz 3.0'da ölçüldü,
-- docs/spec/01-database.md §3.0). Karşılaştırılacağı yer
-- `meta/0003_snapshot.json` — on bir tablo ayakta, hiçbirinde indeks yok.
--
-- ⚠️ SIRA — §3.1.2 ⑦, üçüncü uygulaması. Bağımlılık zinciri:
--
--   clubs_name_trgm_idx ──→ immutable_unaccent ──→ unaccent (uzantı)
--                       └─→ gin_trgm_ops       ──→ pg_trgm  (uzantı)
--
--   ① Önce indeksler düşer.
--   ② Sonra fonksiyon — ona bakan tek şey indeksti.
--   ③ En son uzantılar.
--
-- ⚠️ **`CASCADE` YOK — ve burada PostgreSQL'in kendisi bizi koruyor.**
-- 3.7'de ölçüldü: bağımlı bir indeks varken `DROP EXTENSION pg_trgm`
-- (CASCADE'siz) **reddediliyor**:
--   ERROR: cannot drop extension pg_trgm because other objects depend on it
--   DETAIL: index clubs_name_trgm_idx depends on operator class gin_trgm_ops…
-- Yani `DROP TABLE`ın aksine burada *"fazla giden down"* (3.2b'nin sessiz
-- sınıfı) **yapısal olarak imkânsız**: sıra yanlışsa gürültülü biçimde patlar,
-- sessizce fazla götürmez. `CASCADE` yazmak tam da bu korumayı kapatırdı.
--
-- ⚠️ **UZANTILAR NEDEN DÜŞÜRÜLÜYOR:** `up` onları yarattı, `down` önceki duruma
-- döner (§3.0). Bu, veritabanı genelinde etkili bir işlem — aynı veritabanında
-- başka bir şema `pg_trgm` kullanıyorsa etkilenirdi. Bugün etkilenmez: migration
-- koşucusu veritabanının tek sahibi (`public` + `fms_meta`). Ve etkilenecek biri
-- olsaydı yukarıdaki koruma **reddederdi** — yani karar geri alınabilir kalıyor.

DROP INDEX "rivalries_pair_unique_idx";--> statement-breakpoint
DROP INDEX "competitions_country_id_idx";--> statement-breakpoint
DROP INDEX "clubs_name_trgm_idx";--> statement-breakpoint
DROP INDEX "clubs_competition_id_idx";--> statement-breakpoint

DROP FUNCTION "immutable_unaccent"(text);--> statement-breakpoint

DROP EXTENSION "unaccent";--> statement-breakpoint
DROP EXTENSION "pg_trgm";
