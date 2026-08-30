-- 0006_forward_person_fks — GERİ ALMA (elle yazıldı)
--
-- drizzle-kit `down` migration ÜRETMİYOR (Faz 3.0'da ölçüldü,
-- docs/spec/01-database.md §3.0). Bu dosya elle yazılır; doğruluğunun
-- karşılaştırılacağı yer `meta/0005_snapshot.json` — yani on üç tablo ve dört
-- indeks ayakta, ama `clubs.chairman_person_id`, `federations.president_person_id`
-- ve `referees.person_id` YOK.
--
-- ⚠️ BU `down` TABLO DÜŞÜRMÜYOR — ÜÇ SÜTUN DÜŞÜRÜYOR.
--
-- Zincirin ilk `DROP COLUMN`-ağırlıklı geri alması 0001'di ve o **karışık** bir
-- vakaydı (`DROP TABLE` + `DROP COLUMN` bir arada). Burası **saf sütun vakası**:
-- üç tablo da ayakta kalıyor, kaybolan yalnızca üç sütun. Koşucunun kayıp
-- ölçümü bunu bir yorumdan okumaz, ÖLÇER — `loss.ts` → `LossItem.kind = 'column'`
-- üç kalem raporlar ve `allowDataLoss` verilmemişse işlemi reddeder.
--
-- ⚠️ SIRA — §3.1.2 ⑦, beşinci uygulaması.
--
-- ① Önce KISITLAR adıyla düşürülüyor. PostgreSQL sütun düşünce ona bağlı FK'yı
--    zaten götürür; kısıtlar yine de AÇIKÇA yazılıyor — `up` onları adıyla
--    ekledi, `down` da adıyla kaldırıyor. 0001'in `down`u aynı gerekçeyle
--    CHECK'leri açıkça düşürüyor: örtük bir cascade'e güvenmek, kısıt adı
--    değiştiğinde `down`un SESSİZCE yanlış çalışmasına yol açardı.
-- ② Sonra SÜTUNLAR.
--
-- ℹ️ Bu migration'ın kendi içinde bağımlılık zinciri YOK: üç sütun da aynı
--    hedefe (`people`) bakıyor ve birbirlerine bakmıyorlar. Yani sıra burada
--    ①→② dışında serbest; tablo adları yine de `up`ın tersi sırada yazıldı ki
--    iki dosya yan yana okunabilsin.
--
-- ⚠️ **`CASCADE` BİLEREK KULLANILMIYOR** (0001, 0002, 0003 ve 0005'in
-- `down`larıyla aynı gerekçe): `CASCADE` bu migration'ın YARATMADIĞI nesneleri
-- de sessizce götürür ve tam olarak 3.2b'nin *"fazla giden down"* sınıfını
-- üretir — hiçbir hata çıkmaz, şema sessizce eksilir ve yalnızca karşılaştırma
-- yakalar. `DROP COLUMN … CASCADE` burada özellikle tehlikeli olurdu: sütuna
-- bağlı bir görünüm ya da indeks ileride eklenirse onu da sessizce götürürdü.
--
-- ⚠️ **BU `down` GERİ ALINABİLİR AMA VERİ VARKEN YENİDEN UYGULANAMAZ.**
-- `referees.person_id` `NOT NULL` ve varsayılanı yok; `DROP COLUMN` satırları
-- silmediği için, dolu bir `referees` tablosunda `up` yeniden koştuğunda
-- `column "person_id" of relation "referees" contains null values` ile
-- **gürültülü** patlar. Bu 0001'in `countries.source` durumunun birebir aynısı
-- ve bir kusur değil: varsayılan konsaydı, kimsenin belirlemediği hakem
-- satırlarına bir kimlik UYDURULURDU (SAPMA-026). Davranış
-- `round-trip.itest.ts`te kendi testiyle sabitlenmiş durumda.

ALTER TABLE "referees" DROP CONSTRAINT "referees_person_id_people_id_fk";--> statement-breakpoint
ALTER TABLE "federations" DROP CONSTRAINT "federations_president_person_id_people_id_fk";--> statement-breakpoint
ALTER TABLE "clubs" DROP CONSTRAINT "clubs_chairman_person_id_people_id_fk";--> statement-breakpoint

ALTER TABLE "referees" DROP COLUMN "person_id";--> statement-breakpoint
ALTER TABLE "federations" DROP COLUMN "president_person_id";--> statement-breakpoint
ALTER TABLE "clubs" DROP COLUMN "chairman_person_id";
