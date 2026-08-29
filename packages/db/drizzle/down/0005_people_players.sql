-- 0005_people_players — GERİ ALMA (elle yazıldı)
--
-- drizzle-kit `down` migration ÜRETMİYOR (Faz 3.0'da ölçüldü,
-- docs/spec/01-database.md §3.0). Bu dosya elle yazılır; doğruluğunun
-- karşılaştırılacağı yer `meta/0004_snapshot.json` — yani on bir tablo ve dört
-- indeks ayakta, `people` ile `players` YOK.
--
-- ⚠️ SIRA — §3.1.2 ⑦, dördüncü uygulaması.
--
-- Bu migration'ın kendi içindeki tek bağımlılık `players → people`:
--
--   players ──→ people            (bu migration'da, ikisi de düşecek)
--          └──→ clubs             (0002'den, KALIYOR)
--   people  ──→ countries         (0000/0001'den, KALIYOR — İKİ FK: uyruk + ikinci uyruk)
--
-- `people` önce düşürülürse:
--   ERROR: cannot drop table people because other objects depend on it
--
-- Yani:
--   ① Önce `players` düşer — `people`a bakan tek FK odur.
--   ② Sonra `people` düşer.
--
-- ℹ️ Faz 3'ün üç ileri yabancı anahtarı (`federations.president_person_id`,
--    `clubs.chairman_person_id`, `referees.person_id`) HENÜZ YOK — sütun ve
--    kısıt birlikte **4.4**'te (`0006`) geliyor. Geldiklerinde `people`a bakan
--    üç FK daha olacak, ama onlar 0006'nın `down`unda düşecek; bu dosya
--    değişmez, çünkü `0006` her zaman `0005`ten ÖNCE geri alınır.
--
-- ⚠️ **`CASCADE` BİLEREK KULLANILMIYOR** (0002 ve 0003'ün `down`larıyla aynı
-- gerekçe): `CASCADE` bu migration'ın YARATMADIĞI nesneleri de sessizce
-- götürür ve tam olarak 3.2b'nin *"fazla giden down"* sınıfını üretir — hiçbir
-- hata çıkmaz, şema sessizce eksilir ve yalnızca karşılaştırma yakalar.
--
-- Kısıtlar ayrıca düşürülmüyor: `DROP TABLE` tabloya AİT kısıtları (PK, UNIQUE,
-- CHECK, FK) zaten götürür — `people_person_type_check` ve
-- `players_primary_position_check` dahil.

DROP TABLE "players";--> statement-breakpoint

DROP TABLE "people";
