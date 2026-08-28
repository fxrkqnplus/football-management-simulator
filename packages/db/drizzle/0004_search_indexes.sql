-- 0004_search_indexes
--
-- ⚠️ BU DOSYA KISMEN ELLE YAZILDI. `drizzle-kit generate` yalnızca aşağıdaki
-- DÖRT `CREATE INDEX` satırını üretti; uzantılar ve `immutable_unaccent`
-- fonksiyonu **elle eklendi ve BAŞA konuldu**.
--
-- Sebep sıradır: `clubs_name_trgm_idx` ifadesi `immutable_unaccent`i çağırıyor
-- ve `gin_trgm_ops` operatör sınıfı `pg_trgm`den geliyor. İkisi de yoksa
-- `CREATE INDEX` patlar. `drizzle-kit` uzantı ve fonksiyonu **hiç modellemiyor**
-- (`meta/0004_snapshot.json`da ikisi de yok) — yani snapshot ile gerçek şema
-- arasında bir *ayrışma* değil, modelin **kapsamı dışında** bir alan var.
-- Snapshot karşılaştırmasının kapsamı zaten dar ve `drizzle-snapshot.ts`
-- başlığında tablo hâlinde yazılı (3.2b).
--
-- ────────────────────────────────────────────────────────────────────────────
-- ⚠️ `immutable_unaccent` BİR İDDİADIR — bedeli açıkça yazılıyor
-- ────────────────────────────────────────────────────────────────────────────
--
-- PostgreSQL indeks ifadesinde `IMMUTABLE` olmayan fonksiyon kabul etmiyor:
--   ERROR: functions in index expression must be marked IMMUTABLE
--
-- `unaccent` **`STABLE`** ve 3.7'de ölçüldü ki İKİ aşırı yüklemesi de öyle —
-- sözlüğü açıkça veren `unaccent(regdictionary, text)` biçimi de kurtarmıyor
-- (`pg_proc.provolatile = 's'`, iki indeks denemesi de aynı hatayla kırıldı).
--
-- Bu sarmalayıcı `IMMUTABLE` diyor ve bu **tam olarak doğru değil**: `unaccent`
-- sözlüğü (`unaccent.rules`) PostgreSQL dağıtımıyla geliyor ve bir majör
-- yükseltmede değişebilir. Değişirse indeks eski normalleştirmeyle kalır ve
-- arama **sessizce** yanlış sonuç verir. **Gerekli düzeltme: `REINDEX`.**
--
-- **Bedel sessiz bırakılmadı:** `packages/db/integration/search-index.itest.ts`
-- sarmalayıcının çıktısını sabit bir Türkçe karakter kümesi için iddia ediyor.
-- Sözlük değişirse CI kırılır — yani hata dağıtımdan ÖNCE görülür.
--
-- `SECURITY INVOKER` (varsayılan) ve `search_path` şemaları açıkça yazılı:
-- fonksiyon indeks tanımının parçası olduğu için çağrı anındaki `search_path`e
-- güvenilemez.

CREATE EXTENSION IF NOT EXISTS "pg_trgm";--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "unaccent";--> statement-breakpoint

CREATE FUNCTION "immutable_unaccent"(text) RETURNS text
  LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
  AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;--> statement-breakpoint

-- ── drizzle-kit generate çıktısı ────────────────────────────────────────────
CREATE INDEX "clubs_competition_id_idx" ON "clubs" USING btree ("competition_id");--> statement-breakpoint
CREATE INDEX "clubs_name_trgm_idx" ON "clubs" USING gin (immutable_unaccent(lower("name")) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "competitions_country_id_idx" ON "competitions" USING btree ("country_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rivalries_pair_unique_idx" ON "rivalries" USING btree (least("club_a_id", "club_b_id"),greatest("club_a_id", "club_b_id"));
