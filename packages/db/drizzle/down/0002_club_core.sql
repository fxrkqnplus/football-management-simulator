-- 0002_club_core — GERİ ALMA (elle yazıldı)
--
-- drizzle-kit `down` migration ÜRETMİYOR (Faz 3.0'da ölçüldü,
-- docs/spec/01-database.md §3.0). Bu dosya elle yazılır; doğruluğunun
-- karşılaştırılacağı yer `meta/0001_snapshot.json` — yani `countries`,
-- `federations`, `competitions` ayakta, beş kulüp tablosu YOK.
--
-- ⚠️ SIRA BURADA `up`IN TERSİ OLMAK ZORUNDA — ve 0001'den FARKLI bir sebeple.
--
-- 0001'de sıra bir **okunabilirlik** tercihiydi: `competitions` ve `federations`
-- ikisi de `countries`e bakıyordu, ama `countries`in sütunlarına dokunmak FK'ları
-- ihlal etmezdi. Burada öyle değil — bağımlılık zinciri İKİ KATMANLI ve yanlış
-- sıra `down`u GERÇEKTEN patlatır:
--
--   rivalries ─┐
--   club_facilities ─┼─→ clubs ──→ stadiums
--   club_finances_base ─┘        └→ competitions, countries   (0001'den, kalıyor)
--
-- `DROP TABLE` (CASCADE'siz) kendisine bakan bir FK varken **reddedilir**:
--   ERROR: cannot drop table "clubs" because other objects depend on it
-- Yani:
--   ① Önce `clubs`a bakan üç uydu düşer.
--   ② Sonra `clubs` düşer — artık ona bakan kimse yok.
--   ③ En son `stadiums` düşer — ona bakan tek FK `clubs`taydı ve o gitti.
--
-- ⚠️ **`CASCADE` BİLEREK KULLANILMIYOR.** `DROP TABLE … CASCADE` sırayı
-- gereksiz kılardı ama bedeli ağır: `CASCADE` bu migration'ın YARATMADIĞI
-- nesneleri de sessizce götürür ve tam olarak 3.2b'nin *"fazla giden down"*
-- sınıfını üretir — hiçbir hata çıkmaz, şema sessizce eksilir ve yalnızca
-- karşılaştırma yakalar. Açık sıra, `CASCADE`in gizlediği bağımlılığı
-- **görünür** kılıyor: bu dosya neyin neye bağlı olduğunu da anlatıyor.
--
-- Sıranın gerekliliği varsayılmadı, sınandı: `round-trip.itest.ts` içinde
-- **yanlış sıralı** bir fixture `down`u `cannot drop table` ile patlıyor;
-- buradaki sıra ise dolu tablolarla sorunsuz koşuyor.
--
-- Kısıtlar ayrıca düşürülmüyor: `DROP TABLE` tabloya AİT kısıtları (PK, UNIQUE,
-- CHECK, FK) zaten götürür. 0001'de CHECK'ler açıkça düşürülüyordu çünkü orada
-- tablo değil **sütun** düşüyordu ve kısıt tabloya aitti, sütuna değil.

DROP TABLE "rivalries";--> statement-breakpoint
DROP TABLE "club_finances_base";--> statement-breakpoint
DROP TABLE "club_facilities";--> statement-breakpoint

DROP TABLE "clubs";--> statement-breakpoint

DROP TABLE "stadiums";
