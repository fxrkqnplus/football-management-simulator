-- 0003_visual_assets_referees — GERİ ALMA (elle yazıldı)
--
-- drizzle-kit `down` migration ÜRETMİYOR (Faz 3.0'da ölçüldü,
-- docs/spec/01-database.md §3.0). Bu dosya elle yazılır; doğruluğunun
-- karşılaştırılacağı yer `meta/0002_snapshot.json` — yani sekiz tablo ayakta,
-- `kit_templates`, `club_kits` ve `referees` YOK.
--
-- ⚠️ SIRA — §3.1.2 ⑦, ikinci uygulaması.
--
-- Bağımlılık zinciri 0002'dekinden daha sığ ama yine iki katmanlı ve yine
-- ZORUNLU: `club_kits` HEM `clubs`a (0002'den, kalıyor) HEM `kit_templates`e
-- bakıyor. `kit_templates` önce düşürülürse:
--   ERROR: cannot drop table kit_templates because other objects depend on it
--
--   club_kits ──→ kit_templates      (bu migration'da, ikisi de düşecek)
--            └──→ clubs             (0002'den, KALIYOR)
--   referees ──→ countries          (0001'den, KALIYOR)
--
-- Yani:
--   ① Önce `club_kits` düşer — `kit_templates`e bakan tek FK odur.
--   ② Sonra `kit_templates` düşer.
--   ③ `referees` bağımsız; ona bakan kimse yok, sırası serbest — en sona
--      konması yalnızca okuma kolaylığı.
--
-- ⚠️ **`CASCADE` BİLEREK KULLANILMIYOR** (0002'nin `down`uyla aynı gerekçe):
-- `CASCADE` bu migration'ın YARATMADIĞI nesneleri de sessizce götürür ve tam
-- olarak 3.2b'nin *"fazla giden down"* sınıfını üretir — hiçbir hata çıkmaz,
-- şema sessizce eksilir ve yalnızca karşılaştırma yakalar.
--
-- Kısıtlar ayrıca düşürülmüyor: `DROP TABLE` tabloya AİT kısıtları (PK, UNIQUE,
-- CHECK, FK) zaten götürür. 0001'de CHECK'ler açıkça düşürülüyordu çünkü orada
-- tablo değil **sütun** düşüyordu.

DROP TABLE "club_kits";--> statement-breakpoint

DROP TABLE "kit_templates";--> statement-breakpoint

DROP TABLE "referees";
