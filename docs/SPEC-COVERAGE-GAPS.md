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
| G-03 | `spec/09` §11.4 — "Entegrasyon / Vitest + **testcontainers** / Gerçek Postgres ile uçtan uca modül" | Gerçek Postgres'e karşı entegrasyon testi katmanı. `testcontainers` kelimesi **ROADMAP'in tamamında geçmiyor**. Şema Faz 3-4'te, `WorldView` Faz 12'de yazılıyor — ikisi de "gerçek DB'ye karşı doğrulandı" iddiasını taşıyamaz. | **Faz 3** (ilk migration — kurulum) veya **Faz 12** (WorldView) | ✅ ROADMAP Faz 3 kapsamına eklendi |
| G-04 | `spec/09` §11.4 — "Yük / **k6** / API / 20 eşzamanlı kullanıcı, tur atlama" | Yük testi katmanı. `k6` **ROADMAP'in tamamında geçmiyor**. CLAUDE.md §1.1 "sistem 200 kullanıcıya kadar bozulmadan çalışacak şekilde tasarlanır" diyor — bu iddianın tek ölçüm aracı bu satır. | **Faz 50** (bütünsel denetim ve yayın) | ✅ ROADMAP Faz 50 kapsamına eklendi |
| G-05 | `spec/09` §11.4 — "Görsel / Playwright / Ekranlar / Anlık görüntü karşılaştırma (mobil + masaüstü)" | Görsel regresyon testi. ROADMAP'te "görsel regresyon", "anlık görüntü karşılaştırma" veya eşdeğeri **hiç geçmiyor**. Faz 49 erişilebilirlik ve Lighthouse'u kapsıyor ama görsel snapshot'ı değil. | **Faz 49** (mobil cila) — G-02'nin Playwright kurulumuna bağımlı | ✅ ROADMAP Faz 49 kapsamına eklendi |
| G-06 | `spec/10` §13.5 — sınır tablosunda `Sentry \| 5.000 olay/ay \| 4.000` | Faz 47'nin "Telemetri ve Sağlık" listesi disk, DB, R2, Resend, CPU/RAM/kuyruk sayıyor — **Sentry satırı yok**. Kabul kriteri "%80 eşiğinde uyarı tetikleniyor" var ama uyarılacak metrik listesinde Sentry bulunmuyor, yani kriter Sentry'yi kapsamadan da işaretlenebilir. | **Faz 47** (panel uyarısı) + **Faz 50** (admin e-postası zinciri) | ✅ ROADMAP Faz 47 ve 50 kapsamına eklendi |
| G-07 | `spec/10` §13.4 — *"süresi `docs/RUNBOOK.md`'ye yazılır"* | `docs/RUNBOOK.md` diye bir dosya isteniyor; ne repoda var, ne `CLAUDE.md` belge haritasında, ne de Faz 50 kapsamında adıyla geçiyor (Faz 50 yalnızca "süresi belgelenmiş" diyor). **Düşük öncelikli** — tatbikatın kendisi kapsamda, eksik olan çıktı dosyasının adı. | **Faz 50** | ⏳ ROADMAP'e işlenmedi — Faz 50 açılışında karara bağlanır |

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
| G-09 | `spec/12` §17.5 adım 7 — *"İndeksle → **`asset_index`** tablosuna kaydet (id, tip, kaynak, hash)"*     | Varlık hattının ürettiği her görselin kaydedileceği bir indeks tablosu. **`spec/01`'de yok, `docs/ROADMAP.md`'nin hiçbir fazında geçmiyor** — yani hiç kimsenin işi. `spec/12` §17.5'in tamamı bu tabloya yazmakla bitiyor ve §17.9 kabul kriteri *"eksik varlık oranı raporlanıyor"* diyor; o oranın sayılacağı yer burası.                                                                                                                                              | **Faz 7** (DataProvider) — tabloyu **dolduran** hat orada; Faz 8-9 ingest onu kullanacak     | ⏳ ROADMAP'e işlenmedi — **Faz 3'te bilinçli olarak AÇILMIYOR.** Hiçbir şeyin yazmadığı bir tablo açmak, tüketicisi olmayan bir sütun açmakla aynı sınıf (Faz 2 §5 **D3**).      |

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
| G-10 | `spec/01` §3.1 — `clubs.competitionId` · `clubs.stadiumId` · `clubs.isNational` | Faz 3.5'te ikisi de **nullable** yapıldı, çünkü milli takımların (Faz 41) ne ligi ne sabit ev sahası var. Bu, kulüp takımları için bir **tutarlılık boşluğu** bırakıyor: *"`is_national = false` olan bir kulüp ligsiz veya stadyumsuz kalabilir mi?"* Cevap **hayır** olmalı ama bu koşullu bir kural — sütun seviyesinde `NOT NULL` ile ifade edilemez ve §3.1.2 ② gereği CHECK'e de konmuyor. Bugün **hiçbir şey** onu denetlemiyor. | **Faz 11** (`pnpm validate:world`) — veri doğrulayıcısının doğal işi; Faz 8 ingest'i o kuralın ilk müşterisi | ⏳ ROADMAP'e işlenmedi — Faz 11 açılışında karara bağlanır. Kararın gerekçesi `packages/db/src/schema/clubs.ts` başlığında. |

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
| G-11 | `spec/01` §3.1 — `rivalries.clubAId` · `clubBId` | 3.5'te teklik/kendine-referans koruması **bilerek konmadı**: kısmi bir `UNIQUE (a,b)` `(B,A)` ters çiftini sessizce geçirir (D3) ve tam koruma (`CHECK a < b` + `UNIQUE`) Faz 8 ingest'ine hiçbir spec'in istemediği bir **sıralama sözleşmesi** dayatır. Bugün üç hata biçimi denetimsiz: `(A,A)`, `(A,B)` tekrarı, `(B,A)` ters tekrarı. | **Faz 11** (`pnpm validate:world`) | ⏳ ROADMAP'e işlenmedi. ℹ️ **Fikir değişirse doğal yeri 3.7'dir ve BEDELSİZDİR:** `UNIQUE` zaten bir indeks yaratıyor, 3.7 (indeksler + `pg_trgm`) zaten bir migration açıyor — ayrı bir migration maliyeti yok. Karar `packages/db/src/schema/rivalries.ts` başlığında. |
| G-12 | `spec/01` §3.1 — `club_kits.color3` ↔ `kit_templates.colorSlots` | 3.6'da `color3` **nullable** yazıldı: iki yuvalı bir şablonda üçüncü renk yoktur. Ama *"`colorSlots = 3` ise `color3` dolu olmalı, `= 2` ise boş olmalı"* bir **çapraz tablo** kuralıdır ve sütun kısıtıyla ifade edilemez. Bugün hiçbir şey denetlemiyor. | **Faz 11** — G-10 ile aynı sınıf (koşullu kural → doğrulayıcı) | ⏳ ROADMAP'e işlenmedi. Karar `packages/db/src/schema/club-kits.ts` sütun yorumunda. |

> **G-10, G-11 ve G-12 aynı sınıf ve bu bir desendir:** üçü de *"şema bu kuralı
> ifade edemez"* dediği için Faz 11'e düşüyor. Faz 11 açılışında bu üçü **birlikte**
> okunmalı — tek tek karşılaşılırsa her biri ayrı bir sürpriz gibi görünür.

---

## Kural

1. Yeni bir boşluk fark edildiğinde önce **buraya** yazılır, sonra ROADMAP'e işlenir.
2. ROADMAP'e işlendiğinde satır silinmez, `Durum` sütunu güncellenir.
3. Bir boşluk bilinçli olarak kapsam dışı bırakılıyorsa `Durum` **"kapsam dışı — gerekçe"**
   olur ve gerekçe `docs/V2-BACKLOG.md`'ye de yazılır (K12).
4. Tarama tekrarlandığında yeni bir "Tarama N" bölümü açılır; eskisi korunur.
