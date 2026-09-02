# Spesifikasyon Kapsam Boşlukları

> **Ne bu:** `docs/spec/` bir şey **istiyor** ama `docs/ROADMAP.md` onu hiçbir fazın
> kapsamına **yazmamış** — yani hiç kimsenin işi değil. Bu dosya o boşlukların envanteri.
>
> **Neden var:** Bu sınıftan boşluk iki kez tek tek yakalandı ve ikisi de şans eseriydi.
> Faz 1'de `arch:check`: `spec/09` §11.5 onu her faz kapanışında çalıştırmayı zorunlu
> kılıyordu ama hiçbir faz onu **kurmuyordu** (Ç3 kararıyla 1.6'ya eklendi). Faz 2.0'da
> Sentry kota uyarısı: `spec/10` §13.5 uyarı eşiği tanımlıyor ama Faz 47'nin telemetri
> listesinde Sentry satırı yok. İki tesadüf bir desendir — tek tek yakalamak yerine
> taramak ucuz.
>
> **Nasıl okunur:** Bir satır ROADMAP'e işlendiğinde **silinmez**, `Durum` sütunu
> güncellenir. Bu dosya "neyi kaçırmışız"ın kaydıdır; temizlenirse değerini kaybeder.
>
> **Kim okur (Faz 4.0'da eklendi — ve bu satırın yokluğu bu dosyanın başına gelen
> hataydı):** `CLAUDE.md` belge haritası ve `docs/SESSION-TEMPLATE.md` faz açılış
> ritüeli, **her faz başı, o faza atanmış satırlar**. Faz 4.0'a kadar bu dosyanın
> **hiçbir okuyucusu yoktu**: kütük Faz 2.0'da açıldı, ama ne anayasada ne de
> oturum şablonunda adı geçiyordu ve altı satır (**G-07, G-09, G-10, G-12, G-13,
> G-14**) atandıkları fazın ROADMAP kapsamında **hiç görünmüyordu**. Yani Faz 7
> oturumu G-09/G-14'ü, Faz 11 G-10/G-11/G-12'yi, Faz 17 G-13'ü, Faz 50 G-07'yi
> hiç görmeyecekti. Bu, SAPMA-008'in bu kütüğü yarattığı sınıfın **üçüncü**
> tekrarıydı (`spec/11` §12.4: *"kütüğe kayıt yeterli değil — sonraki oturum
> kütüğü değil, ROADMAP'i okuyup iş yapar"*).
>
> ⚠️ **Bu yüzden bir satır iki yerde birden yaşar ve ikisi de gerekli:** ROADMAP
> *"ne yapılacak"*ı taşır (iş oradan çıkar), kütük *"neden ve nasıl ölçüldü"*yü
> taşır (karar oradan anlaşılır). Yalnızca kütüğe yazmak, işin yapılmaması demek.
>
> **Kapsam uyarısı:** Bu **tam envanter değildir.** Faz 2.0'da yapılan tarama
> `docs/spec/09` (kalite protokolü) ve `docs/spec/10` (dağıtım) üzerinde yoğunlaştı;
> ölçüt "gözle görülür boşluk" idi. Sonraki fazlar kendi spec'lerini okurken yeni
> satır ekleyebilir.

---

## Tarama 1 — Faz 2.0 (2026-08-25)

Yöntem: `spec/09` §11.4 (test katmanları tablosu) ve §11.5 (faz kapanış komutları)
satır satır ROADMAP'te arandı; `spec/10` §13.5 (ücretsiz kademe sınırları) ilgili faz
kapsamıyla karşılaştırıldı.

| # | Spec referansı | Ne istiyor | Hangi faza ait olmalı | Durum |
|---|---|---|---|---|
| G-01 | `spec/09` §11.5 — `pnpm perf:budget` (*"Faz 6+"*) | §11.6'daki 15 satırlık performans bütçesini **ölçen ve ihlalde kıran** bir komut. ROADMAP §0.4 "Performans bütçesi ihlal edilmemiş (ihlal = faz kapanmaz)" diyor — yani her faz kapanışında koşması gereken bir kapı. Hiçbir faz onu **kurmuyor**; `arch:check` ile birebir aynı durum. | **Faz 6** (ilk ölçülebilir ekran) — ölçüm altyapısı; **Faz 49** (mobil cila + performans) genişletir | ✅ ROADMAP Faz 6 kapsamına eklendi |
| G-02 | `spec/09` §11.5 — `pnpm test:e2e` (*"Faz 17+"*) + §11.4 "Uçtan uca / Playwright" | Playwright **kurulumu** ve ilk kritik akış testi. ROADMAP'te Playwright yalnızca iki yerde geçiyor: yığın listesi (satır 124) ve **Faz 50**'nin tam senaryo paketi. Yani spec Faz 17'den itibaren koşulmasını isterken, ilk kurulum 33 faz sonrasına düşüyor. | **Faz 17** (ana kabuk — ilk gezilebilir akış) | ✅ ROADMAP Faz 17 kapsamına eklendi |
| G-03 | `spec/09` §11.4 — "Entegrasyon / Vitest + **testcontainers** / Gerçek Postgres ile uçtan uca modül" | Gerçek Postgres'e karşı entegrasyon testi katmanı. `testcontainers` kelimesi **ROADMAP'in tamamında geçmiyor**. Şema Faz 3-4'te, `WorldView` Faz 12'de yazılıyor — ikisi de "gerçek DB'ye karşı doğrulandı" iddiasını taşıyamaz. | **Faz 3** (ilk migration — kurulum) veya **Faz 12** (WorldView) | ✅ **KAPANDI (Faz 3).** `pnpm test:db` kuruldu (`vitest.integration.config.ts`, iki proje), CI'da ayrı `Entegrasyon` işi **amd64 + arm64**, faz kapanışında **163 test / 8 dosya** gerçek PostgreSQL 18.6 konteynerine karşı |
| G-04 | `spec/09` §11.4 — "Yük / **k6** / API / 20 eşzamanlı kullanıcı, tur atlama" | Yük testi katmanı. `k6` **ROADMAP'in tamamında geçmiyor**. CLAUDE.md §1.1 "sistem 200 kullanıcıya kadar bozulmadan çalışacak şekilde tasarlanır" diyor — bu iddianın tek ölçüm aracı bu satır. | **Faz 50** (bütünsel denetim ve yayın) | ✅ ROADMAP Faz 50 kapsamına eklendi |
| G-05 | `spec/09` §11.4 — "Görsel / Playwright / Ekranlar / Anlık görüntü karşılaştırma (mobil + masaüstü)" | Görsel regresyon testi. ROADMAP'te "görsel regresyon", "anlık görüntü karşılaştırma" veya eşdeğeri **hiç geçmiyor**. Faz 49 erişilebilirlik ve Lighthouse'u kapsıyor ama görsel snapshot'ı değil. | **Faz 49** (mobil cila) — G-02'nin Playwright kurulumuna bağımlı | ✅ ROADMAP Faz 49 kapsamına eklendi |
| G-06 | `spec/10` §13.5 — sınır tablosunda `Sentry \| 5.000 olay/ay \| 4.000` | Faz 47'nin "Telemetri ve Sağlık" listesi disk, DB, R2, Resend, CPU/RAM/kuyruk sayıyor — **Sentry satırı yok**. Kabul kriteri "%80 eşiğinde uyarı tetikleniyor" var ama uyarılacak metrik listesinde Sentry bulunmuyor, yani kriter Sentry'yi kapsamadan da işaretlenebilir. | **Faz 47** (panel uyarısı) + **Faz 50** (admin e-postası zinciri) | ✅ ROADMAP Faz 47 ve 50 kapsamına eklendi |
| G-07 | `spec/10` §13.4 — *"süresi `docs/RUNBOOK.md`'ye yazılır"* | `docs/RUNBOOK.md` diye bir dosya isteniyor; ne repoda var, ne `CLAUDE.md` belge haritasında, ne de Faz 50 kapsamında adıyla geçiyor (Faz 50 yalnızca "süresi belgelenmiş" diyor). **Düşük öncelikli** — tatbikatın kendisi kapsamda, eksik olan çıktı dosyasının adı. | **Faz 50** | ✅ **ROADMAP Faz 50 kapsamına eklendi (Faz 4.0).** Dosya adıyla ve içeriğiyle yazıldı; kabul kriteri de *"süresi `docs/RUNBOOK.md`'ye yazılmış"* olarak daraltıldı. |

---

## Tarama 2 — Faz 2.3b (2026-08-25)

Yöntem: tarama değil, **ölçüm**. Faz 2'nin 2. kabul kriteri (*"Aynı `correlationId`
ile frontend ve backend logları eşleşiyor"*) gerçek tarayıcı + derlenmiş API ile
uçtan uca denendi ve zincirin bir halkası **yok** çıktı.

| # | Spec referansı | Ne istiyor | Hangi faza ait olmalı | Durum |
|---|---|---|---|---|
| G-08 | `spec/09` §11.1 zinciri — *"API middleware AsyncLocalStorage'a koyar → **Tüm loglar otomatik taşır**"*, ve Faz 2'nin 2. kabul kriterinin doğrulaması: *"tarayıcıda tıkla → `X-Correlation-Id` → **sunucu logu**"* | **İstek başına bir sunucu log satırı** (erişim logu). Mekanizma var ve çalışıyor — ama **mutlu yolda hiçbir şey loglamıyor**, yani eşleşecek bir "sunucu logu" üretilmiyor. Ölçüm (2.3b, gerçek tarayıcı): tarayıcı `01a03965-5248-…` üretti, iki `console` satırında logladı, `X-Correlation-Id` ile gönderdi, sunucu **aynı kimliği yanıt başlığında geri verdi** (ekranda "zincir kapandı: evet"), ama `grep` ile sunucu logunda o kimlik **0 kez** bulundu. Karşıt kanıt: başlık **geçersiz** gönderilince middleware `correlation.invalidHeader` uyarısını basıyor ve satır kimliği taşıyor — yani ALS→logger kablolaması sağlam, eksik olan tek şey mutlu yolda **loglayan bir şeyin olmaması**. ROADMAP'in tamamında "istek logu / erişim logu" geçmiyor; 2.4 (exception filter) yalnızca **hata** yolunu logluyor. | **Faz 2** — en doğal yeri 2.4 (istek boru hattına zaten dokunuyor) veya 2.3'e ek bir madde | ✅ **ÇÖZÜLDÜ — 2.3c** (ayrı alt görev olarak; 2.4'e madde olarak **eklenmedi**: 2.4 hata yolunu, 2.3c mutlu yolu yazıyor, aynı commit'te olsalar bir aksaklıkta hangisinin bozulduğu sorulurdu). `apps/api/src/common/middleware/request-log.middleware.ts`. Faz 2'nin **2. kabul kriteri `[x]`** — dört halka gerçek tarayıcı + derlenmiş API ile kanıtlandı |

---

## Tarama 3 — Faz 3.0 (2026-08-26)

Yöntem: Faz 3 açılışında `docs/spec/12-data-packs.md` (veri paketleri) şemadan ne
istediği açısından satır satır okundu ve `docs/spec/01-database.md` §3.1 ile
karşılaştırıldı.

| #    | Spec referansı                                                                                         | Ne istiyor                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Hangi faza ait olmalı                                                                     | Durum                                                                                                                                                                        |
| ---- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-09 | `spec/12` §17.5 adım 7 — *"İndeksle → **`asset_index`** tablosuna kaydet (id, tip, kaynak, hash)"*     | Varlık hattının ürettiği her görselin kaydedileceği bir indeks tablosu. **`spec/01`'de yok, `docs/ROADMAP.md`'nin hiçbir fazında geçmiyor** — yani hiç kimsenin işi. `spec/12` §17.5'in tamamı bu tabloya yazmakla bitiyor ve §17.9 kabul kriteri *"eksik varlık oranı raporlanıyor"* diyor; o oranın sayılacağı yer burası.                                                                                                                                              | **Faz 7** (DataProvider) — tabloyu **dolduran** hat orada; Faz 8-9 ingest onu kullanacak     | ✅ **ROADMAP Faz 7 kapsamına eklendi (Faz 4.0).** Faz 3'te bilinçli olarak açılmadı — hiçbir şeyin yazmadığı bir tablo, tüketicisi olmayan bir sütunla aynı sınıf (Faz 2 §5 **D3**). Yazan taraf (varlık işleme hattı) **Faz 7'de doğuyor**; tablo orada açılır, tanımı `spec/01`'e yazılır ve varlık kimliği sütunlarına FK verilip verilmeyeceği orada kararlaştırılır. |

**Faz 3'ün buna bağlı kararı:** `crestAssetId`, `portraitAssetId`, `logoAssetId`,
`flagAssetId` alanları `spec/01`'deki gibi düz `text` kalıyor — `asset_index`'e FK
verilip verilmeyeceği tabloyu açan fazda kararlaştırılır.

> ℹ️ Aynı taramanın **boşluk olmayan** bulguları ROADMAP Faz 3'e doğrudan işlendi:
> `spec/12` §17.1'in *"her varlık kaydında `source` alanı"* ve §17.3'ün `key` +
> `externalIds` gereksinimleri `spec/01`'in master tablolarında yoktu. Bunlar
> "hiçbir fazın işi değil" sınıfına girmiyor — Faz 3'ün **kendi** şema işi — o
> yüzden burada değil, ROADMAP Faz 3 tablo envanterinde.

---

## Tarama 4 — Faz 3.5 (2026-08-27)

Yöntem: `clubs` tablosunun nullability kararları verilirken ortaya çıkan
**koşullu** kısıtlar tarandı; sütun seviyesinde ifade edilemeyen her kural için
"bunu kim doğrulayacak?" sorusu soruldu.

| #    | Spec referansı | Ne istiyor | Hangi faza ait olmalı | Durum |
| ---- | -------------- | ---------- | --------------------- | ----- |
| G-10 | `spec/01` §3.1 — `clubs.competitionId` · `clubs.stadiumId` · `clubs.isNational` | Faz 3.5'te ikisi de **nullable** yapıldı, çünkü milli takımların (Faz 41) ne ligi ne sabit ev sahası var. Bu, kulüp takımları için bir **tutarlılık boşluğu** bırakıyor: *"`is_national = false` olan bir kulüp ligsiz veya stadyumsuz kalabilir mi?"* Cevap **hayır** olmalı ama bu koşullu bir kural — sütun seviyesinde `NOT NULL` ile ifade edilemez ve §3.1.2 ② gereği CHECK'e de konmuyor. Bugün **hiçbir şey** onu denetlemiyor. | **Faz 11** (`pnpm validate:world`) — veri doğrulayıcısının doğal işi; Faz 8 ingest'i o kuralın ilk müşterisi | ✅ **ROADMAP Faz 11 kapsamına eklendi (Faz 4.0)** — G-11 ve G-12 ile **aynı blokta**, çünkü üçü aynı sınıf ve birlikte okunmalı. Kararın gerekçesi `packages/db/src/schema/clubs.ts` başlığında. |

> **Neden bir boşluk, bir borç değil:** borç *"yapılması gerekeni erteledik"*
> demektir; burada yapılacak şeyin **yeri** başka bir fazda ve o faz henüz
> gelmedi. Faz 3'ün kapsamı şema, doğrulayıcı değil (K12). Kaydın buraya
> düşmesinin sebebi tam olarak bu dosyanın var olma sebebi: sütun kararı bugün
> verildi, denetimi başka bir fazın işi, ve **arada kaybolabilirdi**.

---

## Tarama 5 — Faz 3.6 (2026-08-28)

Yöntem: Faz 3'ün son üç tablosu yazılırken *"bu kuralı kim denetleyecek?"*
sorusu her koşullu/çapraz kısıt için tekrarlandı.

| #    | Spec referansı | Ne istiyor | Hangi faza ait olmalı | Durum |
| ---- | -------------- | ---------- | --------------------- | ----- |
| G-11 | `spec/01` §3.1 — `rivalries.clubAId` · `clubBId` | 3.5'te teklik/kendine-referans koruması **bilerek konmadı**: kısmi bir `UNIQUE (a,b)` `(B,A)` ters çiftini sessizce geçirir (D3) ve tam koruma (`CHECK a < b` + `UNIQUE`) Faz 8 ingest'ine hiçbir spec'in istemediği bir **sıralama sözleşmesi** dayatır. Bugün üç hata biçimi denetimsiz: `(A,A)`, `(A,B)` tekrarı, `(B,A)` ters tekrarı. | **Faz 11** (`pnpm validate:world`) | ⚠️ **3.7'DE DARALDI — kapanmadı.** İki hata biçimi kapandı: `rivalries_pair_unique_idx` bir **`LEAST/GREATEST` ifade indeksi** ve `(A,B)` ile `(B,A)`'yı **aynı** anahtara indirgiyor. 3.5'in iki gerekçesi de düştü: koruma kısmi değil **tam**, ve ingest'e **hiçbir sıralama sözleşmesi** dayatmıyor — üçüncü bir yol vardı ve 3.5'te düşünülmemişti. **Kalan tek delik `(A,A)`:** bir ifade indeksi onu engelleyemez (tek satır olarak geçerli bir anahtar üretir), bir **değer** kuralıdır → Faz 11. Kalan delik `schema-constraints.itest.ts`te **koşan bir testle** görünür tutuluyor. ✅ **Kalan delik ROADMAP Faz 11 kapsamına eklendi (Faz 4.0)**, G-10 ve G-12 ile aynı blokta. ⚠️ Satır **kapanmış sayılmaz** — kapanacağı yer Faz 11'in doğrulayıcısıdır, ROADMAP'e yazılması yalnızca *"kimsenin işi değil"* durumunu bitirir. |
| G-12 | `spec/01` §3.1 — `club_kits.color3` ↔ `kit_templates.colorSlots` | 3.6'da `color3` **nullable** yazıldı: iki yuvalı bir şablonda üçüncü renk yoktur. Ama *"`colorSlots = 3` ise `color3` dolu olmalı, `= 2` ise boş olmalı"* bir **çapraz tablo** kuralıdır ve sütun kısıtıyla ifade edilemez. Bugün hiçbir şey denetlemiyor. | **Faz 11** — G-10 ile aynı sınıf (koşullu kural → doğrulayıcı) | ✅ **ROADMAP Faz 11 kapsamına eklendi (Faz 4.0)** — G-10, G-11 ile aynı blokta. Karar `packages/db/src/schema/club-kits.ts` sütun yorumunda. |

> **G-10, G-11 ve G-12 aynı sınıf ve bu bir desendir:** üçü de *"şema bu kuralı
> ifade edemez"* dediği için Faz 11'e düşüyor. Faz 11 açılışında bu üçü **birlikte**
> okunmalı — tek tek karşılaşılırsa her biri ayrı bir sürpriz gibi görünür.
>
> ⚠️ **3.7'nin dersi bu desene bir uyarı ekliyor:** G-11 *"şema bunu ifade edemez"*
> diye sınıflandırılmıştı ve **yanlıştı** — ifade edebiliyordu, yalnızca yol
> (ifade indeksi) o gün düşünülmemişti. Faz 11'e devredilen her satır için soru
> yeniden sorulmalı: *"gerçekten ifade edilemiyor mu, yoksa bir yol mu
> kaçırdık?"*

---

## Tarama 6 — Faz 3.7 (2026-08-28)

Yöntem: indeksler kurulurken *"hangi sorgu bunu kullanacak"* sorusu ROADMAP'in
arama isteyen fazlarına karşı tek tek soruldu.

| #    | Spec referansı | Ne istiyor | Hangi faza ait olmalı | Durum |
| ---- | -------------- | ---------- | --------------------- | ----- |
| G-13 | `docs/ROADMAP.md` Faz 17 — *"Global arama (`/`): oyuncu + kulüp + personel + **lig + turnuva** — tek kutu, Türkçe karakter toleranslı (pg_trgm)"* | Beş varlık türünde trigram araması. **İkisi bugünkü şemayla yapılamaz:** `competitions`ın görünen adı `name_key`, yani bir **i18n anahtarı** (`competition.tur.superlig`) — onun üzerinde trigram araması anlamsız. Aynı sorun `rivalries.nameKey`te de var. Yani arama, veritabanında **bulunmayan** bir metin üzerinde yapılmak zorunda. | **Faz 5** (i18n altyapısı) çeviri kaynağını belirler; **Faz 17** arama mekanizmasını seçer | ✅ **ROADMAP Faz 17 kapsamına eklendi (Faz 4.0).** 3.7 `competitions`a trigram indeksi **koymadı** — indekslenecek bir metin yok. Seçenekler Faz 17'ye bırakıldı (çeviriler üzerinde istemci tarafı arama · çevrilmiş adı taşıyan bir arama tablosu · `nameKey`i tamamlayan bir `displayName` sütunu). Karar `packages/db/src/schema/competitions.ts` yorumunda. ✅ **ROADMAP Faz 17 kapsamına eklendi (Faz 4.0)** — üç seçenek kapsam maddesinde sayıldı ve *"arama beş varlık türünün beşini de kapsıyor"* diye bir **kabul kriteri** eklendi, yani faz bu boşluk sessizce açık kalarak kapanamaz. ⚠️ **AMA ATAMANIN YARISI EKSİKTİ ve bunu 4.11'in KOŞAN kontrolü buldu:** bu satır **iki** faza atanmış (*"**Faz 5** çeviri kaynağını belirler; **Faz 17** arama mekanizmasını seçer"*) ve 4.0 yalnızca Faz 17'ye işlemişti — `pnpm gaps:check` **17 açık satırdan 16'sını** ✓, bunu ✗ verdi. ✅ **Faz 5 kapsamına da eklendi (Faz 4.11)**, bir **kabul kriteriyle**. ℹ️ Satır bayat talimatın menzilindeydi (*"bugün G-01…G-16"*), yani onu kaçıran şey menzil değil **kontrolün hiç koşmamış olması**ydı — SAPMA-033'ün bir kez daha aynı biçimi. |

---

### ℹ️ G-01'E YÖNTEM NOTU — Faz 3.9 (2026-08-28)

> **Yeni bir boşluk değil, G-01'in ilerideki kurulumuna bırakılmış ölçülmüş
> yöntem.** 3.9 projenin **ilk gerçek performans ölçümünü** yaptı ve `pnpm
> perf:budget`i kurmak cazipti — **kurulmadı** (K12: kapı G-01 ile Faz 6'ya
> atanmış). Kurulmayan şeyin yerine, o gün yeniden keşfedilmesin diye yöntem
> yazıldı. Kod değil, not.
>
> ℹ️ **Sınır temiz:** `spec/09` §11.6'nın 15 satırında **veritabanı sorgusu
> yok** (sayıldı); *"< 20 ms"* `docs/ROADMAP.md` Faz 3'ün kendi kriteri. Yani
> 3.9 §11.6'ya girmedi, kendi kriterini ölçtü.
>
> **Bir `EXPLAIN` ölçümünün geçerli olması için üç şey (3.9'da ölçüldü):**
>
> | # | Tuzak | 3.9'da ölçülen |
> |---|---|---|
> | ① | Soğuk koşu diski ölçer, sorguyu değil | Bu hacimde fark **yok** (0,059 → 0,055 ms). Isıtma yine de yapılır — zararsızlığı *"muhtemelen"* değil **ölçülerek** biliniyor |
> | ② | `ANALYZE` enstrümantasyonu süreyi domine edebilir | `TIMING OFF` ile fark **yok** (0,050–0,054 ms her ikisinde) |
> | ③ | **`ANALYZE` yapılmamış tabloda planlayıcı KÖR** | **Tek gerçek tuzak.** `reltuples = -1` iken dört sorgunun **dördü de** indeksi seçiyor; `ANALYZE` sonrası dördü de Seq Scan'e düşüyor |
>
> ⚠️ **③'ün yönü tehlikeli ve kuralın var olma sebebi bu:** yanlış cevap, doğru
> cevaptan **daha iyi** görünüyor. `ANALYZE`sız bir ölçüm *"indeksler
> kullanılıyor"* der ve rapora `✅` olarak geçer. PG 14+ `reltuples = -1` ile
> *"hiç ANALYZE edilmedi"*yi *"edildi ve boş"*tan (`0`) ayırıyor — ölçüm
> öncesi bakılacak alan bu.
>
> **Ve iki okuma kuralı:**
> - **Bir süre sayısı, ölçüldüğü HACİM yazılmadan anlamsızdır.** 3.9 kriteri
>   iki etiketli iddiaya böldü (A: seed verisi, kriteri kapatır · B: sentetik
>   hacim, indeksin gerekçesi) çünkü tek satırda birleştirilseler ölçülmemiş
>   bir hacim ölçülmüş gibi görünürdü.
> - **Plan seçimi hacme değil SEÇİCİLİĞE bağlı.** Aynı tabloda, aynı 3.001
>   satırda: seçici terim GIN indeksini kullanıyor, seçici olmayan terim Seq
>   Scan'e düşüyor. *"N satırda indeks kullanılıyor"* bir kural değildir.
> - **Ölçümün MİMARİSİ raporun parçasıdır (K14).** Süreler amd64'te alındı,
>   üretim ARM64. Mutlak süre taşınabilir değil; bütçe kararı taşınabilir.

---

## Tarama 7 — Faz 3.8 (2026-08-28)

Yöntem: seed'in yazması gereken **her sütun** için *"bu değeri hangi spec
söylüyor"* sorusu tek tek soruldu. On bir sütunun onunun cevabı vardı; birinin
yoktu.

| #    | Spec referansı | Ne istiyor | Hangi faza ait olmalı | Durum |
| ---- | -------------- | ---------- | --------------------- | ----- |
| G-14 | `docs/spec/12-data-packs.md` §17.1 + `docs/spec/01-database.md` §3.1.0 — `source` kapalı kümesi: `pack \| api \| wikidata \| openfootball \| procedural` | Her varlığın verisinin **nereden geldiğini** taşımak. Ama küme **elle yazılmış bootstrap seed verisini** kapsamıyor: §17.1'in listesi sağlayıcı zincirinden türetilmiş, hepsi bir **sağlayıcıyı** adlandırıyor. Faz 3.8'in 17 satırı hiçbir sağlayıcıdan gelmiyor — repoda elle yazıldılar. | **Faz 7** (DataProvider soyutlaması) — sağlayıcı zinciri orada kuruluyor, kümenin doğru yeri orası | ✅ **ROADMAP Faz 7 kapsamına eklendi (Faz 4.0).** **3.8 `procedural` seçti ve gerekçesi ölçülebilir bir soruya dayanıyor:** alanın tüketicisi (§17.1 *"Veri Editörü'nde hangi varlığın nereden geldiği görünür — eksikleri kapatmak kolaylaşır"*) şunu soruyor: *"bu satır için hâlâ gerçek veri gerekiyor mu?"* `pack` **hayır** derdi ve Faz 8 ingesti bu satırları otoriter paket verisi sanardı; `procedural` **evet** der. Ayrıca `procedural` bugünkü durumun birebir tarifi: `ACTIVE_PACK` boş, K9'un yedek koşulu geçerli. **Altıncı bir değer (`seed`) eklemek CHECK kısıtını değiştirmek, yani yeni bir migration demekti** — 3.8'in kapsamı dışında (K12). Faz 7 kümeyi yeniden değerlendirirse seed `DO UPDATE` yaptığı için tek koşuda düzelir. Karar `tools/data-cli/src/seed/world-seed-data.ts` başlığında. ✅ **ROADMAP Faz 7 kapsamına eklendi (Faz 4.0)** — sağlayıcı zincirinin kurulduğu faz kümenin sahibidir. ⚠️ **AYRI ama aynı gün bulunan bir hata:** `spec/12` §17.1 ve ROADMAP Faz 7 kabul kriteri `source` kümesini **dört** değer sayıyordu (`openfootball` eksik) — bu G-14 değil, SAPMA-023'ün tamamlanmamış yayılımıydı; ikisi de düzeltildi (**SAPMA-029**). G-14 hâlâ *"altıncı bir değer gerekiyor mu"* sorusudur. |

---

## Tarama 8 — Faz 4.0 (2026-08-29)

Yöntem: tarama değil, **kütüğün kendi durumunun ölçümü**. Faz 4 açılışında iki `grep`
koşuldu ve ikisi de bu dosyanın işlemediğini gösterdi:

| Ölçüm | Komut | Sonuç |
|---|---|---|
| Kütüğün okuyucusu var mı | `grep -n "SPEC-COVERAGE" CLAUDE.md docs/SESSION-TEMPLATE.md` | **boş** (exit 1) — hiçbir ritüel onu okumuyor |
| ⏳ satırlar atandıkları fazda görünüyor mu | `grep -n "G-09\|G-10\|G-11\|G-12\|G-13\|G-14" docs/ROADMAP.md` | 8 eşleşme, **hepsi Faz 3 bölümünün içinde** (satır 1153–1499). **G-07 hiç geçmiyor.** |

Karşılaştırma: **G-01…G-06 doğru işlenmişti** (Faz 6 · 17 · 47 · 49 · 50 kapsamlarında
adlarıyla duruyorlar). Yani desen Tarama 1'de kuruldu ve Tarama 3–7'de **unutuldu** —
tam olarak bir okuyucunun yokluğunda beklenen şey.

**Yapılan (iki iş, biri diğerinin yerine geçmez):**

1. **Yedi satır atandıkları fazın ROADMAP kapsamına yazıldı** — G-07 → Faz 50 ·
   G-09, G-14 → Faz 7 · G-10, G-11, G-12 → Faz 11 (tek blokta, çünkü aynı sınıf) ·
   G-13 → Faz 17. G-13 ve G-07 ayrıca birer **kabul kriteri** aldı; G-11 ROADMAP'e
   yazıldı ama `Durum`u **kapanmadı** olarak kaldı — o Faz 11'in doğrulayıcısında kapanır.
2. **Kütüğe bir okuyucu bağlandı** — `CLAUDE.md` belge haritası + "Her Oturumun İlk İşi"
   listesi ve `docs/SESSION-TEMPLATE.md` faz açılış ritüeli (adım 4) + faz kapanış
   kontrol listesi (adım 20).

**Aynı sınıftan ikinci bir vaka bu ölçüm sırasında bulundu ve düzeltildi:**
`docs/DEPENDENCY-WATCH.md` kendi başlığında *"Her faz açılışında bu tablo kontrol edilir
(`docs/SESSION-TEMPLATE.md` ÖN KONTROL)"* diyordu — ama şablonda öyle bir satır **yoktu**
(ölçüldü: `grep` boş). Bir belgenin *"beni şurası okur"* demesi, orada okunduğunu
göstermiyor. Şablona adım 7 olarak eklendi.

> **Ders (bu dosyanın kendi hikâyesinden):** bir envanteri **tutmak** ile bir envanterin
> **okunmasını sağlamak** ayrı iki iştir, ve ikincisi unutulduğunda birincisi hiçbir şey
> yapmaz — üstelik sessizce, çünkü dosya dolu ve düzenli görünmeye devam eder.

---

## Tarama 9 — Faz 4.1 (2026-08-29)

Yöntem: ROADMAP Faz 4'ün 19 tablosu için **tüketici araması** (`competition_seasons`
yöntemi, Faz 3.1). *"Bu tabloyu kim okuyacak/yazacak?"* sorusu `docs/spec/**` ve
ROADMAP'in ileri fazlarına tek tek soruldu. On dokuzun tamamı cevaplandı; ikisi
**yeni boşluk** üretti.

| # | Spec referansı | Ne istiyor | Hangi faza ait olmalı | Durum |
| --- | --- | --- | --- | --- |
| G-15 | `docs/spec/02-attributes.md` §4.6 *"Kişilik **saklanmaz, türetilir**"* ↔ `docs/ROADMAP.md` Faz 11 *"Düzenlenebilir: … oyuncu (tüm nitelikler, CA/PA, **kişilik**, sözleşme)"* | **Türetilmiş bir değer nasıl "düzenlenir"?** İki belge çelişiyor: `spec/02` kişiliği `derivePersonality(hidden)` ile gizli niteliklerden **hesaplıyor** ve saklamıyor; Faz 11 Veri Editörü onu **düzenlenebilir alan** sayıyor. Üç olası cevap var ve hiçbiri yazılı değil: ① editör aslında **gizli nitelikleri** düzenler, kişilik onu takip eder (en tutarlısı, ama kullanıcı *"Profesyonel yap"* diyemez) ② bir **override sütunu** eklenir (türetmeyi delerdi) ③ Faz 11 metni düzeltilir. **Faz 4 bu yüzden `player_personalities` tablosunu AÇMADI** (SAPMA-030) ve karar Faz 11'e ait. | **Faz 11** (Veri Editörü + doğrulayıcı) | ✅ **ROADMAP Faz 11 kapsamına eklendi (Faz 4.1)** |
| G-16 | `docs/spec/01-database.md` §3.1 `managers.userId FK` → §3.2 `users` | **Master bir tablo, save katmanına yabancı anahtar verebilir mi?** `managers` §3.1'de (master, K4: *"asla kullanıcı işlemiyle değiştirilmez"*) ama `userId` §3.2'deki `users`a bakıyor. Bu, K4'ün *"master paylaşımlı ve değişmez"* ilkesiyle gerilimde: bir kullanıcı silinince master bir satır etkilenir. Alternatif ilişkiyi **ters çevirmek** (`users.manager_id`), böylece bağ save tarafında durur. Faz 4 sütunu **hiç yazmadı** (SAPMA-032) ve uygulaması Faz 13'te; ama **hangi yönde kurulacağı** delta mimarisinin kararı. | **Faz 12** (karar — `WorldView`/delta) · **Faz 13** (uygulama) | ✅ **ROADMAP Faz 12 ve Faz 13 kapsamlarına eklendi (Faz 4.1)** |

> ℹ️ **Bu taramanın "boşluk olmayan" bulguları ROADMAP'e doğrudan işlendi:** sekiz
> tablonun gideceği yer (SAPMA-030), dördüncü ileri FK (SAPMA-032) ve kabul kriteri
> 3'ün daraltılması (SAPMA-031). Bunlar *"hiçbir fazın işi değil"* sınıfına girmiyor —
> sahibi belli, o yüzden burada değil ROADMAP'te ve SAPMA kütüğünde.

---

## Tarama 10 — Faz 4.4 (2026-08-30)

Yöntem: tarama değil, **üç ileri FK'nın yazılmasıyla ortaya çıkan iki boşluğun
kaydı**. Biri 4.3'ten devreden ve kullanıcı kararıyla açıldı (G-17), diğeri
`referees.person_id` `NOT NULL` yazılınca **doğdu** (G-18).

| # | Spec referansı | Ne istiyor | Hangi faza ait olmalı | Durum |
| --- | --- | --- | --- | --- |
| G-17 | `docs/spec/01-database.md` §3.1 `people.id` ↔ `players.id` (ve §3.4 `WorldView` sınırı) | **İki farklı varlığın kimliği aynı TİPTE (`integer`) ve karışmaları yabancı anahtarla yakalanamaz.** Bir `players.id`yi `people.id` bekleyen bir parametreye vermek derlenir, koşar ve **yanlış kişiyi** bulur — o kimlikte bir kişi büyük olasılıkla vardır. FK yalnızca *"böyle bir satır var mı"* diye sorar, *"doğru satır mı"* diye değil. Bugünkü tek savunma bir **isimlendirme disiplini** (`*_person_id` / `*_player_id`), yani bir konvansiyon; hiçbir kapı denetlemiyor. Markalı kimlik tipleri (branded/nominal types) bunu tip seviyesinde kapatır ve doğal yeri `WorldView` sınırıdır — motor ve API'nin kimlikleri aldığı yer. ⚠️ **Maruziyet Faz 4'te katlanıyor:** 4.5–4.7 yedi tablo getiriyor ve hepsi `playerId` ya da `personId` ile anahtarlı; `personId` ile `playerId`yi aynı fonksiyonda taşıyan kod yolları tam da şimdi doğuyor. | **Faz 12** (`WorldView` / delta sınırı) | ✅ **ROADMAP Faz 12 kapsamına eklendi (Faz 4.4).** ⚠️ Risk 4.3'te ölçüldü ve o gün *"kaydetme"* önerildi; **kullanıcı itiraz etti ve haklıydı**: K12 **uygulamayı** yasaklıyor, **kaydetmeyi** değil — ve tek kalıcı kayıt yeri sanılan ANLIK DURUM her alt görevde yeniden yazılıyor (SAPMA-004). G-10/G-11/G-12 ile aynı sınıf: *"sütun seviyesinde ifade edilemeyen doğruluk boşluğu, ertelendi, kaydedildi."* |
| G-18 | `docs/spec/01-database.md` §3.1 — `people.personType: ('player'\|'staff'\|'manager'\|'chairman')[]` ↔ `referees.personId FK` | **Bir hakemin `people` satırı hangi `person_type`ı taşır?** Spec'in kendi başlığı `people`ı *"oyuncu, personel, menajer, **başkan** ortak kimlik tablosu"* diye tanımlıyor — **hakem listede yok**. Ama aynı spec `referees`e bir `personId FK` veriyor ve 4.4 onu **`NOT NULL`** yazdı, yani artık her hakem bir `people` satırıdır. Kapalı kümede hakemi anlatan bir değer yok; `people_person_type_check` ise `cardinality > 0` istediği için **boş dizi de** kabul edilmiyor (4.3'te bilerek böyle yazıldı). Sonuç: hakem satırı yazan ilk taraf bir değer **uydurmak** zorunda — SAPMA-026'nın (*"kimsenin belirlemediği alana değer uydurma"*) tam olarak yasakladığı şey. Üç olası cevap ve hiçbiri yazılı değil: ① kümeye `'referee'` eklenir (CHECK değişir → yeni migration) ② hakemler `people` taşımaz, adlarını kendi tablosunda tutar (`personId` kaldırılır — Faz 3/4'ün üç ileri FK kararını geri alır) ③ `spec/01`'in `people` başlığı hakemi de kapsayacak şekilde düzeltilir. ⚠️ **4.4 kümeyi DEĞİŞTİRMEDİ** (K12): şema bugün çalışıyor, boşluk bir **anlam** boşluğu ve sahibi hakem verisini üreten fazdır. | ~~**Faz 8**~~ → **Faz 4.5** (`people` bu fazın kendi tablosu) · tüketici **Faz 26** | ✅ **KAPANDI — Faz 4.5, migration `0008`** (`PERSON_TYPES` 4 → 5 değer). Seçenek **①** uygulandı; **③** (spec başlığının hakemi kapsaması) onun doğal sonucu olarak aynı alt görevde yapıldı; **②** reddedildi (üç ileri FK kararını geri alır). ⚠️ **4.4'ÜN ATAMASI YANLIŞTI VE DAYANAĞI D7'YDİ:** *"hakem verisi Faz 8'de geliyor"* gerekçesi **3.8'in kendi notuna** dayanıyordu — `PROJECT_MEMORY`/ROADMAP kendi sesimiz, D7'nin *"kaynak değildir"* dediği şey. Faz 8'in **gerçek** ingest listesi ölçüldü (ülke·lig·kupa·UEFA·kulüp·görsel·rekabet·kural seti·transfer penceresi) ve **hakem yok**; Faz 9 yalnızca oyuncu. Yani boşluk, onu kapatamayacak bir faza atanmıştı — ve oraya yazılan kabul kriteri orada **karşılanamazdı**. Faz 8'in G-18 bloğu ve kriteri **kaldırıldı** (satır silinmedi, kütüğün kuralı ②). Üç gerekçeyle Faz 4.5: ① `people` bu fazın kendi tablosu ve kapalı küme **bu fazda** eksik ölçüldü (emsal: 3.6 `club_kits.asset_id`) ② **bir yalan zaten repodaydı** — `fixtures.ts` hakem kişilerine `['player']` yazıyordu ve 4.5–4.11 boyunca her yeni fixture bunu kopyalayacaktı ③ atanan sahip işi yapamıyordu. ⚠️ **Bedeli ölçüldü ve yazıldı:** `0008`in `down`u kısıtı daraltıyor, `ADD CONSTRAINT … CHECK` var olan satırları doğruluyor → dolu bir `people` tablosunda zincirin **hiçbir** geri alması başlayamıyor. 🆕 Ayrı bir boşluk açıldı: **G-19**. |

> ⚠️ **G-18 BU FAZIN KENDİ ÜRETTİĞİ BİR BOŞLUK ve bu yeni bir desen.** G-01…G-16
> hep *"spec istiyor ama kimse yapmıyor"* sınıfındaydı. Burada spec **kendi
> içinde** tutarsız ve tutarsızlık ancak `referees.person_id` gerçekten
> yazıldığında görünür oldu — yani bir kuralın deliği, o kuralın **ilk gerçek
> uygulaması**yla ortaya çıkıyor. F3'ün (*"bir kural örneklerinden geriye
> okunursa yanlış öğrenilir"*) kardeşi: burada eksik olan örnek değil, kümenin
> kendisi.

---

## Tarama 11 — Faz 4.5 (2026-08-30)

Yöntem: tarama değil, **G-18'i kapatırken ortaya çıkan bir sahiplik boşluğunun
kaydı**. G-18'in atamasını doğrulamak için ROADMAP'in **tüm hakem atıfları
fazlarına göre çıkarıldı** ve ölçüm beklenenden geniş çıktı: yalnızca Faz 8'in
ataması değil, **hakem verisinin ingest'i de sahipsizdi**.

| # | Spec referansı | Ne istiyor | Hangi faza ait olmalı | Durum |
| --- | --- | --- | --- | --- |
| G-19 | `docs/spec/01-database.md` §3.1 `referees` (§3.1.0 `key`/`source`/`externalIds` taşıyor) ↔ `docs/spec/12-data-packs.md` §17.2 | **`referees` bir PAKET VARLIĞI ama onu dolduran hat yok.** §3.1.0'ın kuralı net: `key`/`source`/`external_ids` taşıyan bir tablo, pakette **kendi kaydı olarak görünen** bir varlıktır — ve `referees` 3.6'dan beri üçünü de taşıyor. Ama ROADMAP'in **tüm** hakem atıfları fazlarına göre çıkarıldığında (4.5'te ölçüldü) hiçbir faz veriyi **üretmiyor**: **Faz 23** hakem toleransını, **Faz 26** hakem niteliklerini + atamasını + VAR'ı, **Faz 29** maç öncesi brifingi, **Faz 45** basın sorusunu **TÜKETİYOR**; **Faz 46** *"yeni sezon hakem kadrosu, emekli olan hakemler"* diyerek var olan bir kadroyu **BAKIM** yapıyor — yani onun var olduğunu **varsayıyor**. **Faz 8** (kurum ingesti) ve **Faz 9** (oyuncu ingesti) kapsam listeleri tek tek okundu: **ikisinde de hakem yok**. Yani bugün `referees` tablosuna satır yazacak tek şey `fixtures.ts` ve 3.8'in seed'i bile ona dokunmuyor. **SAPMA-008'in birebir sınıfı** (*"tüketicisi olan ama üreticisi olmayan yapı"*). ℹ️ `spec/12` §17.2'de `referees.json` **yok** (ölçüldü) — yani bugünkü dürüst cevap *"prosedürel"*, ama o da hiçbir faza yazılı değil. | **Faz 7** (DataProvider) — **karar noktası**; ingest sahibi orada belirlenir | ✅ **ROADMAP Faz 7 kapsamına eklendi (Faz 4.5) ve bir KABUL KRİTERİ getirdi** — yani faz bu boşluk sessizce açık kalarak kapanamaz. ⚠️ **SAHİP TAHMİNLE ATANMADI** (`competition_seasons` yöntemi, 3.1 + K13): Faz 8 makul bir adaydı ama G-18 tam olarak oraya **bir nottan miras alarak** atanmış ve ölçüm onu yanlış çıkarmıştı (D7) — aynı hatayı tekrarlamamak için sahip değil **karar noktası** atandı. Faz 7 seçildi çünkü sağlayıcı zincirini kuran ve *"hangi kaynaktan ne çekilecek"* sorusunun ilk kez cevaplanabildiği yer orası; G-09 ve G-14 ile aynı desen. |

> ⚠️ **BU SATIR G-18'İN KAPATILMASININ YAN ÜRÜNÜ VE DERSİ AYRI.** G-18 bir **anlam**
> boşluğuydu (*"hakemin `person_type`ı ne?"*) ve kapatıldı. G-19 bir **sahiplik**
> boşluğu (*"hakem satırlarını kim yazacak?"*) ve kapatılmadı. İkisi 4.4'te tek bir
> boşluk gibi görünüyordu çünkü ikisi de *"hakem verisi Faz 8'de gelir"*
> varsayımına yaslanıyordu — **o varsayım ölçülünce ikisi birden ayrıştı**.
>
> **Genel biçim:** yanlış bir atamanın altında genellikle **iki** boşluk yatar —
> biri atamanın konusu, biri atamanın kendisi. Atamayı doğrulamak ikincisini
> görünür kılıyor. Ve ikincisi ancak *"o faz bu işi yapabiliyor mu?"* diye
> sorulduğunda ortaya çıkıyor: **kapsam taşıması kütüğe yazmakla bitmez, hedef
> fazın o işi YAPABİLDİĞİ de doğrulanmalı.**

---

## Tarama 12 — Faz 4.9 (2026-09-01)

Yöntem: tarama değil, **4.9'un kendi çıktısının sonucunun ölçümü**. Seed 5.000
prosedürel oyuncu yazdı; soru şuydu: *"bu satırlar ne zaman ve kimin eliyle
gidecek — ya da gitmeyecek?"* Cevap üç faz kapsamı **okunarak** arandı
(Faz 9 ingest listesi · Faz 10 nitelik türetme girdisi · Faz 11 doğrulayıcı
kural listesi) ve hiçbirinde bulunamadı.

| No | Nerede | Ne eksik | Kim yapmalı | Durum |
|---|---|---|---|---|
| G-20 | `docs/ROADMAP.md` Faz 4 kabul kriteri 1 (*"5.000 sahte oyuncu seed"*) ↔ Faz 9 (*"serbest oyuncu havuzu (~300 kişi)"*, *"3.500+ oyuncu"*) | **4.9'un 5.000 prosedürel oyuncusunun ÖMRÜ tanımsız.** Ülke/yarışma seed'i ile **yapısal olarak farklılar** ve fark ölçüldü: o satırlar gerçek veriyle **aynı `key`i** taşıyor, yani Faz 8 ingesti `DO UPDATE` ile üzerlerine yazıyor ve sayı değişmiyor. Oyuncu satırları ise ayrı bir namespace'te (`seed-player-*`, gerekçesi `player-seed-data.ts` başlığında: paket namespace'iyle çakışırsa biri diğerini **sessizce** ezerdi) — yani Faz 9'un `player-*` anahtarları onları **ezmez, yanlarına ekler**. Sonuç iki sayımı birden bozuyor: *"serbest oyuncu havuzu ~300"* **5.300** olur, *"3.500+ oyuncu"* kriteri **8.500** satırın üstünde ölçülür. ⚠️ **Ve satırların nitelikleri yok:** `spec/02` §4.2 CA'yı `round(Σ(attribute × weight) / Σ(weight) × 10)` ile **niteliklerden** hesaplıyor; 4.9'un yazdığı `current_ability` hiçbir nitelik satırından türemiyor (KARAR: 47+10 sütuna değer yazmak bir **dağılım** kararı, sahibi Faz 10 — SAPMA-026). Bugün zararsız (kriter 3'ün sorgusu yalnızca `players`a bakıyor), Faz 10 sonrasında **tutarsız**. | **Faz 9** (oyuncu ingesti) — çelişkinin ilk kez GERÇEKLEŞTİĞİ faz | ✅ **ROADMAP Faz 9 kapsamına eklendi (Faz 4.9) ve bir KABUL KRİTERİ getirdi** — yani faz bu boşluk sessizce açık kalarak kapanamaz. ⚠️ **SAHİP TAHMİNLE ATANMADI (G-18'in dersi): hedef fazın işi YAPABİLDİĞİ doğrulandı.** Üç aday okundu: **Faz 10** *yapamaz* — girdisi `player_stats_history` ve bu satırların istatistik geçmişi **yok**, yani nitelik türetemez. **Faz 11** doğrulayıcısının 40+ kuralı okundu; *"her kulüpte ≥ 18 oyuncu"*, *"CA ≤ PA"* gibi kurallar var ama *"her oyuncunun niteliği var"* **yok**, ve doğrulayıcı zaten **rapor eder, silmez**. **Faz 9** `players` tablosuna yazan ve serbest oyuncu havuzunun sayısını **kendi kriterinde taşıyan** faz — silme, bayrak arkasına alma ve prosedürel nitelik üretme seçeneklerinin üçü de oradan uygulanabilir. Üç seçenek ROADMAP Faz 9 kapsamına **tek tek** yazıldı; karar bugün verilmedi (K13 — bugün verilseydi Faz 8/9'un ingest hacmi bilinmeden verilmiş olurdu). |

---

## Tarama 13 — Faz 4.11 (2026-09-02)

Yöntem: yeni boşluk taraması **değil** — kütüğün **kendi tutarlılığının** ölçümü,
ve bu kez elle değil **koşan bir betikle**: `pnpm gaps:check`
(`scripts/check-gap-coverage.mjs`). Betik satırları kütükten sayar, açık/kapalı
ayrımını **satırın kendi durum sütunundan** okur, hedef fazı *"Hangi faza ait
olmalı"* sütunundaki **kalın** `**Faz N**` atamalarından çıkarır (düz metinle
anılan fazlar bir atama değil, bir bağlam atfıdır) ve ROADMAP'i `## FAZ N`
başlıklarından dilimleyip satırın **adıyla** geçtiğini doğrular.

**Sonuç: 20 satır · 3 atlandı (kapalı: G-03 · G-08 · G-18) · 17 tarandı · 1 ✗.**

| Bulgu | Ne çıktı |
|---|---|
| **G-13 → Faz 5** | ✗ **Atamanın yarısı eksikti.** Satır iki faza atanmış (Faz 5 çeviri kaynağını belirler, Faz 17 mekanizmayı seçer); 4.0 yalnızca Faz 17'ye işlemişti. **Faz 5 kapsamına bir kabul kriteriyle yazıldı (4.11).** |
| Kalan 16 açık satır | ✓ hepsi hedef fazının ROADMAP kapsamında adıyla geçiyor |
| Yeni boşluk | **YOK** — 4.11 hiçbir boşluk açmadı |

> ⚠️ **TALİMATIN KENDİSİ BAYATTI ve kontrol tam da onu yakaladı.** ROADMAP'in
> 4.11 maddesi *"(bugün G-01…G-16)"* ve *"kapatılmış satırları da (G-03, G-08)"*
> diyordu. Ölçüldü: kütükte **G-20**'ye kadar satır var (dört satır menzil
> dışında kalırdı) ve kapalı satırlardan **G-18** atlama listesinde yoktu.
> Talimat olduğu gibi uygulansaydı kontrol **yeşil verir ve dört satıra hiç
> bakmazdı**. Çare bir sayı güncellemesi değil — o da bayatlardı: talimat sayı
> taşımayan bir cümleye çevrildi ve sayılar artık **betikten** geliyor.
>
> ℹ️ Ve G-13 **bayat menzilin içindeydi** (13 < 16), yani onu kaçıran şey menzil
> değil **kontrolün hiç koşmamış olması**ydı. SAPMA-033'ün aynı biçimi: yazılı
> bir kural, koşan bir adımı yoksa ateşlendiğinde hiçbir şey yapmaz.

> ℹ️ **AYNI SINIFIN BORÇ TARAFI DA ÖLÇÜLDÜ (4.11).** `BORÇ-003` ve `BORÇ-005`
> kütükte *"ödenmesi gereken faz: 5"* yazıyor, ama ROADMAP'te yalnızca **Faz 2**
> bölümünde geçiyorlardı — Faz 5'in kapsamında ikisi de yoktu. İkisi de kapsama
> ve bir kabul kriterine yazıldı. Bu kütüğün kapsamı değil (borç ≠ boşluk), ama
> **ayracı aynı**: *"kapsam taşıması kütüğe kayıtla bitmez."*

---

## Kural

1. Yeni bir boşluk fark edildiğinde önce **buraya** yazılır, sonra ROADMAP'e işlenir.
2. ROADMAP'e işlendiğinde satır silinmez, `Durum` sütunu güncellenir.
3. Bir boşluk bilinçli olarak kapsam dışı bırakılıyorsa `Durum` **"kapsam dışı — gerekçe"**
   olur ve gerekçe `docs/V2-BACKLOG.md`'ye de yazılır (K12).
4. Tarama tekrarlandığında yeni bir "Tarama N" bölümü açılır; eskisi korunur.
5. **Bir satır AYNI alt görevde hem buraya hem ROADMAP'e yazılır** (Faz 4.0'da eklendi).
   *"Sonra işlerim"* diye bırakılan satır işlenmiyor — ölçüldü: yedi satırın yedisi
   böyle kaldı ve dördü **beş faz boyunca** kimsenin işi olmadı. `Durum` sütunu
   `⏳ ROADMAP'e işlenmedi` diyorsa o satır bir kayıt değil, **açık bir borçtur**.
