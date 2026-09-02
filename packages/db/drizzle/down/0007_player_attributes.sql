-- 0007_player_attributes — GERİ ALMA (elle yazıldı)
--
-- drizzle-kit `down` migration ÜRETMİYOR (Faz 3.0'da ölçüldü,
-- docs/spec/01-database.md §3.0). Bu dosya elle yazılır; doğruluğunun
-- karşılaştırılacağı yer `meta/0006_snapshot.json` — yani on üç tablo, dört
-- indeks ve 4.4'ün üç ileri FK'sı ayakta, ama `player_attributes`,
-- `player_hidden_attributes` ve `players`ın İKİ İLİŞKİ DEĞİŞMEZİ YOK.
--
-- ⚠️ BU `down` KARIŞIK BİR VAKA — İKİ TABLO **VE** İKİ KISIT.
--
-- Zincirdeki vakalar şimdiye kadar üç biçimdeydi: saf `DROP TABLE` (0002, 0003,
-- 0005), saf `DROP COLUMN` (0006) ve karışık tablo+sütun (0001). Burası
-- dördüncü biçim: **tablo + BAŞKA BİR TABLONUN kısıtı.** Ayrım önemli çünkü
-- `DROP TABLE` yalnızca kendi tablosunun kısıtlarını götürür — `players`
-- ayakta kalıyor, yani onun iki CHECK'i AÇIKÇA düşürülmek zorunda. Örtük bir
-- temizliğe güvenilseydi `down` sessizce eksik çalışır ve yalnızca
-- karşılaştırma yakalardı (3.2b'nin "sessiz bozuk down" sınıfı).
--
-- ⚠️ SIRA — §3.1.2 ⑦, altıncı uygulaması.
--
-- ① Önce `players`ın KISITLARI adıyla düşürülüyor — `up` onları adıyla ekledi,
--    `down` da adıyla kaldırıyor (0001 ve 0006'nın gerekçesi: kısıt adı
--    değişirse `down` SESSİZCE yanlış çalışmasın diye açık ad).
-- ② Sonra TABLOLAR, `up`ın tersi sırada. İkisi de yalnızca `players`a bakıyor
--    ve birbirlerine bakmıyor, yani aralarındaki sıra serbest; `up`ın tersi
--    yazıldı ki iki dosya yan yana okunabilsin.
--
-- ⚠️ **`CASCADE` BİLEREK KULLANILMIYOR** (0001, 0002, 0003, 0005 ve 0006'nın
-- `down`larıyla aynı gerekçe): `CASCADE` bu migration'ın YARATMADIĞI nesneleri
-- de sessizce götürür — 3.2b'nin *"fazla giden down"* sınıfı. Burada özellikle
-- somut: Faz 4.8 `player_attributes` üzerine transfer arama indeksleri koyacak
-- ve `DROP TABLE … CASCADE` onları da götürürdü, hiçbir hata çıkmadan.
--
-- ⚠️ **BU `down` VERİ VARKEN YENİDEN UYGULANABİLİR — 0006'DAN FARKLI.**
-- `0006` dolu bir `referees` tablosunda yeniden `up` edilemiyordu, çünkü
-- `ADD COLUMN … NOT NULL` var olan satırlara değer bulamıyordu. Burada
-- `DROP TABLE` satırları da götürüyor, yani yeniden `up` boş bir tabloya
-- `CREATE TABLE` uyguluyor ve sorunsuz koşuyor.
--
-- ⚠️ **AMA İKİ CHECK'İN YENİDEN UYGULANMASI KOŞULLU** ve bu bir sınır:
-- `ALTER TABLE … ADD CONSTRAINT … CHECK` var olan satırları DOĞRULUYOR. Dolu
-- bir `players` tablosunda `current_ability > potential_ability` taşıyan bir
-- satır varsa yeniden `up` **gürültülü patlar**
-- (`check constraint "players_ca_le_pa_check" is violated by some row`).
-- Bu bir kusur değil, kısıtın var olma sebebi: geri alma penceresinde yazılmış
-- geçersiz bir satır, kısıt geri gelince görünür olmalı — sessizce kalmamalı.
-- Davranış `round-trip.itest.ts`te kendi testiyle sabitlenmiş durumda.

ALTER TABLE "players" DROP CONSTRAINT "players_pa_range_check";--> statement-breakpoint
ALTER TABLE "players" DROP CONSTRAINT "players_ca_le_pa_check";--> statement-breakpoint

DROP TABLE "player_hidden_attributes";--> statement-breakpoint
DROP TABLE "player_attributes";
