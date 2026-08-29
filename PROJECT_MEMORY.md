# PROJECT MEMORY — Football Management Simulator

> **Bu dosya oturumlar arası devir teslim belgesidir.**
> Kuralları: `docs/spec/11-project-memory.md`
>
> **Her oturumun İLK işi:** aşağıdaki ANLIK DURUM bloğunu ve son iki faz kaydını okumak.
>
> **Yazma iki ritimde (SAPMA-004):**
> - **ANLIK DURUM bloğu → her ALT GÖREV sonunda** yeniden yazılır (~10 satır).
> - **Tam faz kaydı (11 başlık) → her FAZ sonunda** eklenir. Yazılmadan faz kapanmaz (K15).
> - **Kütükler (SORUN/BORÇ/SAPMA) → kayıt açıldığı anda.**
>
> Bu dosya **append-only**'dir. Eski faz kayıtları geriye dönük değiştirilmez;
> düzeltme gerekirse ANLIK DURUM altındaki "Bilinen kayıt düzeltmeleri" bölümüne yazılır.

---

## ⚡ ANLIK DURUM

> **Alt görev başına güncellenir** (SAPMA-004). Tam faz kaydı faz sonunda yazılır.

| | |
|---|---|
| **Aktif faz / alt görev** | **FAZ 3 TAMAMLANDI** — 12 alt görevin **12'si** bitti, kabul kriterleri **5/5**. ⏸️ **SIRADAKİ: Faz 4 — ama YENİ BİR OTURUMDA** (protokol kuralı). Önce kullanıcı PR'ı **`develop`'a merge commit** ile birleştirir (squash **değil**) |
| **Son tamamlanan** | ✅ **3.10 — ER diyagramı + faz kapanışı + PR.** `docs/schema/world.md` dolduruldu (371 satır); mermaid bloğu (176 satır) **elle çizilmedi**, canlı katalogdan **üretildi** (`src/schema-state/er-diagram.ts`, saf) ve `integration/er-diagram.itest.ts` ile nöbete bağlandı. ✅ **Kabul kriteri 5 KAPANDI → FAZ 3 KAPANDI** |
| **Tarih** | 2026-08-29 |
| **Genel ilerleme** | **3 / 50 faz (%6)** — Faz 3 kapandı, sırada Faz 4 (Oyuncu, Sözleşme, Personel) |
| **Bloke eden var mı?** | Hayır — ama **bir bekleme var: PR merge'ünü kullanıcı yapar.** ⚠️ Bir **açık risk** duruyor ve bloke etmiyor: `main.test.tsx` jsdom yıkım yarışı — düzeltildi (`1c93890`) ama **KAPANMIŞ SAYILMIYOR**, aşağıdaki kalıcı bloğa bak. Gerçek sınavı **Faz 6** |
| **Son commit** | `docs(memory): CI tablosu tamamlandı — iptal edilen koşu ne yeşil ne kırmızıdır` (fazın **son** commit'i — ANLIK DURUM'u yazan commit en sonda olsun diye, Faz 1'de unutulmuştu). Öncekiler: `e3be777` (künye sözleşmesi daraltıldı) · `9579c3f` (rapor arşivlendi, PR #4 + CI işlendi) · **`4a0eb43` (3.10'un İÇERİĞİ — kod ve belgeler bu commit'te)** |
| **Devreden açık karar** | **YOK.** 3.10 hiçbir karar bırakmadı. Faz 4'ün kaynağı faz kaydının **§11'i** — sekiz madde, hepsi ölçümle gerekçeli |
| **Dallar** | `main` → `develop` → **`feature/faz-03-database`** (25 commit ileride, 0 geride). Faz 2 → PR #3 ✅ merge `c97ebd0`. **Faz 3 → [PR #4](https://github.com/fxrkqnplus/football-management-simulator/pull/4) AÇIK, hedef `develop`.** ⏸️ **Birleştirme biçimi MERGE COMMIT (squash DEĞİL) ve merge'ü KULLANICI yapar** — squash, her alt görevin kendi commit'iyle kapandığı geçmişi siler ve oturum kurtarma `git log` üzerinden yürüyor |
| **CI** | ✅ **3.10'un ana koşusu İŞLENDİ: `33223489489` (`4a0eb43`, push) — ALTI İŞ DE YEŞİL** (`Kalite kapıları` amd64+arm64 · `Entegrasyon` amd64+arm64 · `İmaj` amd64+arm64). Sayaç **ON DÖRT ardışık yeşil**, **liste sorgusuyla** üretildi (elle artırılmadı): `gh run list --limit 40 --branch …` → o an dalda **23 push koşusu, 2 kırmızı**, ikisi de (`074e373`, `bd59fac`) `1c93890`'dan **önce**. ⚠️ **Bu koşunun özel değeri (K14):** ER nöbetçisi `arm64` entegrasyon işinde de koştu — *"belge katalogla uyuşuyor"* iddiası **iki mimaride birden** doğrulandı. ℹ️ 3.9'un kaydı 12 diyordu ve doğruydu; aradaki iki koşu `24d3ec6` ve `4a0eb43` |
| **CI — PR açıldıktan sonra öğrenilen iki şey** | ⚠️ **① `pull_request` tetikleyicisi İKİNCİ bir koşu açıyor.** PR #4 açılınca aynı commit için ikinci bir koşu başladı (`33223633747`, **yeşil**). Yani PR'dan sonra *"koşu sayısı"* iki katına çıkıyor ve **sayaç yalnızca `event` alanına göre filtrelenerek** anlamlı kalır. ⚠️ **② İPTAL EDİLEN bir koşu ne yeşil ne kırmızıdır.** `9579c3f`'in iki koşusu da `cancelled` — eşzamanlılık grubu, `e3be777` push'lanınca onları düşürdü. **Sayaca katılmadılar ve katılmamalılar**; *"kırmızı yok"* iddiası hâlâ doğru, ama *"her commit yeşil koştu"* **değil**. `e3be777`'in iki koşusu (`33224032656` push · `33224035516` pull_request) **ikisi de yeşil** |
| **CI — kaydedilemeyen son halka** | ℹ️ **Dürüst sınır:** CI durumunu kaydeden her commit **kendi koşusunu tetikliyor** ve o koşuyu kaydedemiyor — sonsuz bir gerileme. Bu satırı taşıyan commit'in koşusu da **kaydedilmedi**. Faz 4'ün ilk işi `gh run list` ile dalın son durumunu **yeniden çıkarmak** olmalı; bu blok bir başlangıç noktasıdır, son söz değil |
| **typecheck / lint / format / build / arch** | ✅ typecheck **10/10** · lint 0 · format 0 · **build 8/8 SOĞUK** (`.turbo/cache` silindi, `Cached: 0` doğrulandı; **iki koşu: 10,90 s ve 7,01 s** — ⚠️ fazda ölçülen aralık **5,80–21,29 s**, tek sayı trend değil) · **arch 9 kural, DEĞİŞMEDİ** |
| **Kapı kapsamı — ÖLÇÜLDÜ, varsayılmadı** | Bu commit **15 dosya** değiştiriyor: **11 Markdown + 4 `.ts`**. ⚠️ `.prettierignore` `*.md` taşıyor (SAPMA-024), yani `format:check` **on bir dosyanın hiçbirine bakmadı**. **Ama dört `.ts`e baktı ve İŞİNİ YAPTI:** ilk koşuda `format:check` `er-diagram.ts`'i **reddetti** ve `lint` **üç gerçek hata** buldu (`unbound-method` · `restrict-template-expressions` · `simple-import-sort/exports`). Yani bu commit'te *"format ✅"* **anlamlı** — ama yalnızca `.ts` yüzeyi için. Belgelerin doğruluğunu denetleyen tek kapı **ER nöbetçisi** |
| **install** | ✅ **3.10 YENİ BAĞIMLILIK EKLEMEDİ** — `pnpm-lock.yaml` ve `pnpm-workspace.yaml` **dokunulmadı**. ℹ️ pnpm 11.24.0 çıkmış; kilit 11.23.0'da, karar verilmedi |
| **Diyagram RENDER'ı** | ✅ **ÖLÇÜLDÜ, akıl yürütülmedi.** *"Sözdizimi dar bir alt kümede"* bir **iddiaydı** ve iddia sınandı: `mermaid-cli 11.16.0` (tek seferlik `npx`, **repoya bağımlılık eklenmedi**) → **403 KB SVG, 2416×3226**, hata kutusu **yok**, on bir varlık adının her biri **birebir bir kez**, işaretler **9 `PK` + 2 `PK,FK` + 10 `FK` + 8 `UK`**, yorumlar **16 `null` + 2 `uq:club_id+kit_type`** — hepsi diyagramla **tam örtüşüyor**. ⚠️ Bu **kalıcı bir kapı değil**: sürekli koşan bir render kontrolü bir `mermaid` bağımlılığı + tarayıcı indirmesi ister (K12). Yani *"blok render ediliyor"* bugün **ölçülmüş bir olgu**, yarın **nöbetçisiz bir iddia** — diyagramın **içeriğini** koruyan nöbetçi var, **sözdizimini** koruyan yok |
| **test** | ✅ **744 test / 52 dosya** (724/51'den; +1 dosya `er-diagram.test.ts`, **+20 test**) · ✅ **`pnpm test:db` 163 test / 8 dosya** (160/7'den; +1 dosya `er-diagram.itest.ts`, **+3 test**), gerçek PG18 konteyneriyle, **33,33 s / 36,42 s** (iki koşu). Dağılım **ölçüldü**: `db-integration` **135 / 6 dosya**, `data-cli-integration` **28 / 2 dosya** |
| **kapsam** | ✅ **DÖRT METRİK DE YİNE YÜKSELDİ** — satır %85,53 → **%86,99** (923/1061) · ifade %85,68 → **%87,04** (1008/1158) · dal %88,25 → **%88,68** (486/548) · fonksiyon %78,61 → **%80,00** (284/355). Eşik %70, DÜŞÜRÜLMEDİ, dosya dışlanmadı. `er-diagram.ts` **%100 satır · %100 fonksiyon**. ℹ️ İlk koşuda **satır 113** kapsanmamıştı (`PRIMARY KEY`/`UNIQUE` ayrıştırma hatası yolu) — yani *"sessizce atlamıyor, fırlatıyor"* iddiasının **iki yolundan biri hiç koşulmamıştı**; iki test eklendi |
| **ER diyagramı** | ✅ **ÜRETİLDİ, ÇİZİLMEDİ.** Kaynak `introspectSchema()` → gerçek `information_schema` + `pg_catalog`. Nöbetçi üç iddia taşıyor: ① belgedeki blok canlı katalogdan üretilenin **birebir aynısı** ② belge **metninden sayılan** tablo/ilişki sayısı katalogla **ve** mutlak değerlerle (**11 / 12**) aynı ③ negatif kontrol. ⚠️ **Blok elle düzenlenmez** — yeni migration burayı bayatlatır, doğru düzeltme testin fark çıktısındaki metni kopyalamaktır |
| **Mutasyon ölçümleri (3.10)** | ✅ **Üç ayrı mutasyon.** ① Belgeden `stadiums` varlığı silindi → **3/3** kırıldı, fark `entities: 10 ≠ 11` diye **adıyla** raporlandı ② **migration SQL'inden** `NOT NULL` kaldırıldı → **163'ün 7'si** kırıldı (2'si ER nöbetçisi, 5'i round-trip/snapshot), `pnpm test` **sessiz**, `typecheck` **sessiz** — günlük #43'ün dersinin **karşı ölçümü** ③ karşılaştırıcı köreltildi → **163'ün 19'u**. Seri: %6,3 → %10,0 → %14,3 → %15,5 → %15,1 → %13,0 → %11,9 → **%11,7**; **pay 19'da SABİT ve bu beklenen** (3.10 migration yazmadı) |
| **Rapor arşivi** | 🆕 **KURULDU (3.10).** Her alt görev raporu terminale basılmadan **önce** `docs/reports/<faz-slug>/<no>-<slug>.md`'ye yazılır. Kural **dört yerde birden** kayıtlı: `docs/OUTPUT-FORMAT.md` (ana yer) · `CLAUDE.md` belge haritası · `README.md` belge ağacı · `docs/SESSION-TEMPLATE.md` kapanış adımı. ⚠️ **Arşiv otorite DEĞİLDİR** (`docs/reports/README.md`), **append-only**, ve **3.0–3.9 geriye dönük doldurulmadı** — boşluk kasıtlı, gerekçesi orada yazılı. ⚠️ **Sözleşme İLK KULLANIMDA daraldı:** künyeye *"raporu taşıyan commit"* alanı konmuştu ve **bir dosya kendi commit hash'ini taşıyamaz** — alan `İçerik commit'i` olarak yeniden tanımlandı, düzeltme `OUTPUT-FORMAT` ve `reports/README` **ikisine birden** yazıldı |
| **Veritabanı** | **PostgreSQL 18.6** · compose: `builtin`/`C.UTF-8` (SAPMA-020) · `pg_trgm` 1.6 + `unaccent` 1.1 migration'la kuruluyor · ⚠️ test konteyneri farklı locale kullanıyor (`datlocprovider = c`) ama **davranış birebir aynı ölçüldü** (3.7) |
| **Web paketi** | **321.495 bayt** — 2026-08-29'da **yeniden ölçüldü**, Faz 2'nin değeriyle **birebir aynı**. Faz 3 `apps/web`e hiç dokunmadı |
| **API imajı** | **424 MB** — 2026-08-29'da **yeniden ölçüldü** (Faz 2 kapanışında 423 MB). **+1 MB**: `apps/api` → `packages/db` → `drizzle-orm` + `postgres` |
| **Araç zinciri** | Node 24.19.0 · pnpm 11.23.0 · drizzle-orm 0.45.2 + drizzle-kit 0.31.10 · testcontainers 12.1.0 · jsdom 30.0.1 · pino 10.3.1 · @sentry/* 10.70.0 |
| **Açık sorun sayısı** | **0** |
| **Teknik borç sayısı** | **7** — BORÇ-001, 002, 004 (Faz 16) · BORÇ-003, 005 (Faz 5) · **BORÇ-007 (Faz 12)** · BORÇ-006 (Faz 50) |
| **SAPMA sayısı** | **27** (SAPMA-001…027) — **3.10 YENİ SAPMA AÇMADI.** Faz 3'ün payı SAPMA-019…027, yani **dokuz** |
| **Boşluk sayısı** | **14** (G-01…G-14, `docs/SPEC-COVERAGE-GAPS.md`) — Faz 3'ün payı G-09…G-14, yani **altı**. G-03 (`testcontainers`) bu fazda **kapandı** |
| **Faz 3 kabul kriterleri** | ✅ **5 / 5** — 1 (3.2b) · 2 (3.8) · 3 (3.9) · 4 (3.9) · **5 (3.10)**. Doğrulamaların tamamı faz kaydı **§8**'de, *"nasıl doğrulandı"* sütunu dolu |
| **Şema durumu** | **11 / 11 master tablo** + **4 indeks** + **12 FK** — **3.8, 3.9 ve 3.10'un ÜÇÜ DE ŞEMAYA DOKUNMADI**, yeni migration yazılmadı (entegrasyon testi zincirin 5 adımda kaldığını iddia ediyor). Migration zinciri: `0000_countries_initial` · `0001_geography_institutions` · `0002_club_core` · `0003_visual_assets_referees` · `0004_search_indexes` (**beşinin de elle yazılmış `down`u var**). Veritabanı nesneleri: 2 uzantı + 1 fonksiyon (`immutable_unaccent`) |
| **Veri durumu** | **2 / 11 tablo doludur** (`countries` 6, `competitions` 11) — 3.9'da `pg_class`tan ölçüldü. Dokuzu **bilerek boş**: `clubs`/`stadiums`/`referees` → Faz 8–9, `federations` → kabul kriterinde yok (K12) |
| **Sentry kotası** | **3 / 5.000 olay** (%0,06). ⚠️ Kütükten geliyor, panodan yeniden ölçülmedi. Faz 3 tarayıcı kodu yazmadı |


---

### ⚠️ AÇIK RİSK — `main.test.tsx` jsdom yıkım yarışı (3.3'te düzeltildi, KAPANMADI)

> **Bu blok silinmez. Bir sonraki oturum aynı hatayı "yeni bir sorun" sanmasın.**

**Belirti:** `pnpm test` **598 testin hepsini geçirir** ama Vitest
`Errors 2 errors` bildirir ve koşu **exit 1** olur:

```
ReferenceError: window is not defined
  react-dom-client.development.js
  Immediate.performWorkUntilDeadline (scheduler)
  processImmediate
This error originated in "apps/web/src/main.test.tsx"
```

**Kök neden:** `main.tsx` modül düzeyinde `createRoot().render()` çağırıyor.
Test dosyası bittikten sonra Vitest jsdom ortamını yıkıyor; React'in
zamanlayıcısında bekleyen iş `window` yokken çalışıyor.

**Düzeltme:** commit **`1c93890`** — `main.tsx` kökü **dışa aktarıyor**
(`export const root`), `main.test.tsx` `afterEach`te söküyor. Üretim paketi
**bayt bayt aynı** kaldı (321.495).

**⚠️ NEDEN KAPANMADI SAYILIYOR:**

- Yarış **makine hızına bağlı**. CI'da **amd64 kırıldı, arm64 geçti** (`33027936236`).
- **Yerelde beş koşuda hiç tekrar üretilemedi** — yani yerel yeşil bir kanıt değil.
- Düzeltme **yerelde kanıtlanamadı**; ölçüm aracı CI oldu (`33028319414` yeşil).
- **Tek yeşil koşu bir yarışın kesin yokluğunu kanıtlamaz.**
- Sayaç: **SEKİZ ardışık yeşil amd64 koşusu** (`33028319414` · `33028466409` ·
  `33064847673` · `33065051088` · `33071099131` · `33071299875` ·
  `33100256651` · **`33127803143`**). Her yeni gözlem iddiayı **güçlendirir,
  kanıtlamaz** — sekiz gözlem de bir yokluk kanıtı değildir.
  **Kırmızı görülürse blok yeniden açılır.**
- ✅ **Sayım yöntemi 3.6'da uygulandı:** sayı elle artırılmadı, dal üzerindeki
  **tam koşul listesi** çekilip başarısız koşular sayıldı — `gh run list --limit 40` → toplam **2 kırmızı**, ikisi de düzeltmeden ÖNCE (`33001368015` 3.2a CI
  hazırlık adımı · `33027936236` 3.3 yarışı). `1c93890`'dan sonra kırmızı yok.
- ⚠️ **SAYAÇ DÜZELTMESİ (3.5'te bulundu).** Blok "dört" diyordu ve dört koşu
  numarası sayıyordu; `gh run list` ile tam liste çıkarıldığında **iki eksik**
  olduğu görüldü: `33028466409` (3.3 kapanışı) hiç sayılmamıştı ve `33071299875`
  (3.4'ün ANLIK DURUM commit'i) henüz işlenmemişti. İkisi de `Kalite kapıları
  (amd64)` işini **yeşil** koşturmuş (tek tek doğrulandı). Sayaç 4 → **6**.
  **Ders:** ardışıklık iddiası, koşu numaralarını tek tek ekleyerek değil, dal
  üzerindeki **tam koşu listesi** çıkarılarak sayılır — bir commit'in kendi
  koşusunu saymayı unutmak sessizdir. Kırmızı `33027936236`'dan sonra hiç
  kırmızı yok, bu da tam listeden doğrulandı.
- ⚠️ **3.7 riski BÜYÜTMEDİ ama azaltmadı da:** 3.4/3.5/3.6 gibi bu alt görev de
  `apps/web`e hiç dokunmadı, yani `main.test.tsx` ve `main.tsx` bayt bayt aynı.
  Yeni koşulardaki yeşil, kod değişmediği için yalnızca aynı deneyin tekrarıdır.
  ⚠️ **Faz 6 bu riski gerçekten sınayacak** — yüzlerce bileşen testi geliyor ve
  her biri bir React ağacı monte edecek.

**Yeniden ortaya çıkarsa ne yapılacak:**

1. **Panik yok, bu yeni bir sorun değil** — önce bu bloğu ve `1c93890`'ı oku.
2. Belirtiyi doğrula: testler geçiyor ama `Errors` satırı var mı? Öyleyse
   aynı sınıf.
3. `main.test.tsx`teki `mountedRoots` sökme kancasının hâlâ **her** import
   yolunu kapsadığını denetle — yeni bir `it()` `importMain()` yerine düz
   `import('./main.js')` çağırdıysa o kök sökülmez ve yarış geri gelir.
4. Yeni bir React kökü kuran **başka** bir test eklendiyse (Faz 6 tasarım
   sistemi bunu yapacak) aynı kancayı ona da bağla.
5. Kanca yeterliyse ve yarış sürüyorsa, sıradaki adım Vitest'in
   `environmentOptions`/teardown sırasını incelemek — **"yeniden koş" bir
   çözüm değildir.**

**Neden yeniden ortaya çıkabilir:** Faz 6 (tasarım sistemi) yüzlerce bileşen
testi getiriyor ve her biri bir React ağacı monte edecek. RTL kendi
`cleanup()`ünü çalıştırıyor ama **RTL'in kurmadığı** kökler (bizimki gibi)
onun kapsamında değil.

---

### 🔍 BU OTURUMDA ÖĞRENİLEN AMA HİÇBİR DOSYADA YAZILI OLMAYAN — 3.6 kapanışı

> 3.5'in üç maddesi kalıcı yerlerine işlendi ve aşağıda **kısaltılarak** duruyor
> (① envanter tamlığı → `spec/09` §11.4'ün 11. satırı ve uyarı bloğu ·
> ② tahminin yeri → 3.6'da **yöntem olarak uygulandı** ·
> ③ ardışıklık liste sorgusudur → 3.6'da **uygulandı**, sayaç yöntemle doğrulandı).
> 3.6'dan **üç** yeni madde çıktı.

**① BİR KURALIN AYRACI, ÖRNEKLERİNDEN GERİYE OKUNURSA YANLIŞ ÖĞRENİLİR.**
§3.1.2 ②'nin üç satırı vardı ve hepsinde dize kümeleri CHECK alıyor, sayısal
alanlar almıyordu. Buradan *"sayısal olan CHECK almaz"* diye bir ayraç çıkarmak
çok kolaydı — ve **yanlıştı**. `kit_templates.color_slots` sayısal ama kapalı
bir küme (`// 2 veya 3`), yani CHECK alması gerekiyor.
**Genel biçim:** bir kural örneklerle öğretiliyorsa, örneklerin **tesadüfen
paylaştığı** bir özellik ayraç sanılabilir. Kuralın kendi **gerekçesine** dönmek
gerekiyor: burada gerekçe *"sözleşme mi, kalibrasyon mu"* idi ve o soru doğru
cevabı hemen veriyor. → §3.1.2 ②'ye dördüncü satır ve ayraç açıkça yazıldı.

**② İKİLİ BİR SINIFLANDIRMA, ÜÇÜNCÜ SINIFI SESSİZCE YANLIŞ TARAFA KOYAR.**
§3.1.2 ③ `ON DELETE`i ikiye ayırıyordu: uydu → CASCADE, bağımsız varlık →
RESTRICT; ayraç `key` taşıyıp taşımamak. `kit_templates` `key` taşımıyor, yani
kural onu **uydu** sayıp CASCADE verirdi — oysa hiçbir şeyin uydusu değil,
**sahipsiz bir sözlük tablosu**. CASCADE, bir şablon silindiğinde kulübün forma
satırını alakasız bir sebeple yok ederdi.
**Genel biçim:** ikili bir sınıflandırma *"A değilse B'dir"* diye çalışır ve
üçüncü bir sınıf geldiğinde **hata vermez, sessizce B der.** D4'ün
(*"sınıflandırma bağlamdan bağımsız değildir"*) yapısal akrabası: orada aynı tip
farklı bağlamlarda farklı işlem görüyordu, burada **yeni bir tip** var olan iki
kutudan birine zorlanıyor. → §3.1.2 ⑧ olarak yazıldı; Faz 4'ün `injury_types` ve
`staff_roles` tabloları aynı sınıf.

**③ BİR ORAN TEK ÖLÇÜMDE GÖZLEM, DÖRT ÖLÇÜMDE EĞİLİMDİR — AMA OTOMATİK DEĞİL.**
Mutasyon oranı %6,3 → %10,0 → %14,3 → %15,5 diye ilerledi ve bu, testlerin
yalnızca çoğalmadığını *derinleştiğini* gösteriyor. Ama seriyi yazarken görülen
şey daha önemli: **artış kendiliğinden gelmiyor.** 3.5'in 11 kırılmasının altısı
o alt görevde **açıkça yazılan** yeni bozulma testleriydi; yazılmasalardı oran
**düşerdi**.
**Genel biçim:** bir kalite metriği "iyiye gidiyor" derken, o gidişi üreten
**eylemin** ne olduğu ayrıca yazılmalı — yoksa metrik bir sonuç değil bir
**temenni** olarak okunur ve bir gün düştüğünde sebebi aranmaz.
→ Seri `spec/09` §11.5'e tabloyla ve "ne söylemiyor" notuyla yazıldı.

---

<details>
<summary>3.5'ten devreden üç madde (kısaltılmış arşiv)</summary>

**① BİR ENVANTER, İÇİNDE OLMAYAN BİR YERİ KORUYAMAZ.**
`spec/09` §11.4'ün desen envanteri üç kez işe yaradı (`.cts`, `{ts,tsx}`,
`.test-d.ts`) ve her seferinde ders *"envanteri hatırla"* oldu. 3.5'te dördüncü
vaka çıktı ve **envanter onu yakalayamazdı**: `drizzle.config.ts`in `schema`
deseni listede **hiç yoktu**. Yakalayan şey bir kapı değil, komutun kendisinin
kırılmasıydı. Yani üç vakanın ürettiği *"listeye bak"* disiplini, listenin
**tam** olduğunu varsayıyordu.
**Genel biçim:** bir envanterin değeri, hatırlanmasında değil **tamlığında**.
Ve tamlık, envanterin kendisiyle denetlenemez — yeni bir yer ancak orada bir şey
kırıldığında bulunur. Bunun somut sonucu: bulunan her yeni yer **aynı gün**
envantere yazılır ve **kendi kapısını** getirir; öyle olmazsa bir sonraki oturum
onu sadeleştirip geri alır.

**② BİR TAHMİN, BELGEYE DEĞİL BİR TESTE YAZILIRSA ANINDA REDDEDİLİR.**
`comparedFacts` alt sınırı ölçülmeden **1.246** yazıldı; gerçek değer **1.223**
çıktı ve test aynı dakikada kırıldı. Aynı sayı bir rapora yazılsaydı hiçbir şey
ötmezdi — D1'in Faz 2'de üç kez ödenen bedeli tam olarak buydu.
**Genel biçim:** ölçülecek bir sayının **yeri** vardır. Bir iddiaya (test,
kısıt, `expect`) yazıldığında ölçüm onu doğrular ya da reddeder; bir cümleye
yazıldığında hiçbir şey yapmaz. **`ÖLÇÜLECEK` bırakmanın testteki karşılığı,
kasıtlı olarak yanlış bir sınır yazıp ölçümü çıktıdan okumaktır.**

**③ "ARDIŞIK YEŞİL" BİR SAYAÇ DEĞİL, BİR LİSTE SORGUSUDUR.**
AÇIK RİSK bloğunun sayacı **dört** diyordu; `gh run list` ile dalın tam koşu
listesi çıkarıldığında **altı** olduğu görüldü — biri hiç sayılmamış, biri
işlenmemişti. Sayaç her oturumda elle bir numara eklenerek büyütülüyordu ve
**eksik ekleme sessizdi**: sayı yine artıyor, yine makul görünüyor.
**Genel biçim:** ardışıklık bir **küme** iddiasıdır (*"şu tarihten beri kırmızı
yok"*), tek tek biriktirilen bir sayı değil. Doğru yöntem listeyi baştan
çıkarmak ve kırmızıyı **aramak** — bu, iddiayı hem doğrular hem de sayıyı
yeniden üretir.

> ✅ **Üçü de 3.6'da uygulandı:** ① envanterin 11. satırı yeni bir tablo
> eklenirken gözden geçirildi ve desen doğru davrandı (günlük #35) ·
> ② `comparedFacts` sınırı baştan erişilemez bir değere kondu, gerçek sayı
> testin reddettiği çıktıdan okundu — **tahmin hiç yazılmadı** ·
> ③ sayaç elle artırılmadı, `gh run list --limit 40` ile kırmızı **arandı**.

</details>

---

### 🔑 OTURUM NOTLARI — Faz 2 kapanışında DEVREDİLDİ

> Faz 2 boyunca dört ayrı "bu oturumda öğrenilen" bloğu birikmişti. Faz
> kapanışında hepsi **kalıcı bloklara** taşındı ve buradan kaldırıldı:
> ölçüm dersleri → **🔬 ÖLÇÜM DİSİPLİNİ** · ortam tuzakları → **🧰 ORTAM
> TUZAKLARI** · kod/yapılandırma tuzakları → **🧩 KOD VE YAPILANDIRMA
> TUZAKLARI** · faza özgü olanlar → **faz kaydı §5**.
>
> Bloklar oturum başına birikirse dosya her fazda büyür ve yeni oturum
> hangisinin hâlâ geçerli olduğunu bilemez. **Kural: oturum notu geçicidir;
> faz kapanışında ya kalıcı bir bloğa taşınır ya silinir.**

---

### 🎯 SIRADAKİ — FAZ 4 (Veritabanı Şeması II: Oyuncu, Sözleşme, Personel)

**Faz 3 KAPANDI.** Sıradaki iş bir alt görev değil, **yeni bir faz** ve
**yeni bir oturumda** başlar (protokol kuralı). Önce:

1. **Kullanıcı PR'ı merge eder** — hedef `develop`, **merge commit** (squash
   **değil**). Merge'ü model yapmaz.
2. Yeni oturum `CLAUDE.md` → `PROJECT_MEMORY.md` (bu blok + son iki faz kaydı)
   → `docs/ROADMAP.md` Faz 4 → `docs/spec/01-database.md` sırasıyla okunur.

**Faz 4'ün kaynağı, bu bloğun tekrarı değil, faz kaydının §11'idir** — sekiz
madde, her biri ölçümle gerekçeli. Aşağısı yalnızca oturumu açacak kişinin
30 saniyede konuma oturması için.

#### Faz 4'e girerken bilinmesi gereken beş şey

**① ÜÇ İLERİ FK BİRLİKTE EKLENİR — sütun VE kısıt aynı migration'da.**
`federations.president_person_id` · `clubs.chairman_person_id` ·
`referees.person_id` → hepsi `people`'a. Faz 3'te bilerek yazılmadılar:
kısıtsız bir sütun *"tüm FK'lar tanımlı"* kriterini **görünürde** sağlayıp
gerçekte delerdi. Faz 4'ün kabul kriterinde yazılı — **doğrula, varsayma**.

**② `fk-policy.ts` YENİ FK'LARI OTOMATİK DENETLER — güncellenecek liste yok.**
`injury_types` ve `staff_roles` **dictionary** sınıfına düşecek (`key` yok +
giden FK yok) ve onlara giden FK'lar **RESTRICT** alacak. ⚠️ Elle envanter
testi de duruyor ve **kırılması istenen davranıştır** — kırıldığında **listeye
yeni FK eklenir, kural değiştirilmez**.

**③ ŞEMA YAZIM SÖZLEŞMESİ `spec/01` §3.1.2 — ON KURAL.**
Burada **tekrarlanmıyor**, adresi veriliyor: iki kopya kaçınılmaz olarak
ayrışır. Başlıklar: `check()` desteği · CHECK nereye konur · `ON DELETE`
kuralı · sütun sırası · `attnum` deliği · `bigint` modu · elle `down`un
düşürme sırası · sözlük tabloları → RESTRICT · `IMMUTABLE` iddiası · uzantı
`down`u. K4 sözleşmesi ayrıca **§3.4.1**'de.

**④ HER YENİ MIGRATION ÜÇ ŞEY DAHA GETİRİR.**
① `drizzle/down/<tag>.sql` — yoksa koşucu **veritabanına dokunmadan** durur
② round-trip testine bir `it()` bloğu — yoksa yeni tablonun `down`u **hiç
sınanmamış** olur ③ **`docs/schema/world.md`'nin diyagramı bayatlar** ve
`er-diagram.itest.ts` kırılır. ⚠️ Blok **elle düzenlenmez**: Vitest'in fark
çıktısındaki üretilmiş metin belgeye kopyalanır, `EXPECTED_TABLE_COUNT` ve
`EXPECTED_FOREIGN_KEY_COUNT` sabitleri de güncellenir (bilerek sabit — *"belge
katalogla uyuşuyor mu"* ile *"katalog beklenen yerde mi"* ayrı iki soru).

**⑤ ŞEMA MUTASYONU DOĞRU TEMSİLE YAPILIR.**
TS dosyasındaki bir `onDelete` değişikliği **katalogdan okuyan hiçbir testi
etkilemez** — çalışan veritabanını migration SQL'i kuruyor. 3.9 bunu ölçtü
(#43), 3.10 karşı ölçümünü aldı (migration SQL'inde `NOT NULL` kaldırınca
163'ün 7'si kırıldı, birim testleri sessiz). Kural `spec/09` §11.5'te kendi
başlığıyla.

#### Beklenen ve normal olan iki şey

- **Kapsam DÜŞECEK.** Faz 4 yeni Drizzle şema dosyaları getirecek ve onlar
  raporda %0 ile paydaya girecek. **Eşik düşürülmez, dosya dışlanmaz, import
  testi yazılmaz** — kanıt entegrasyon tarafında üretilir (ROADMAP Faz 3'ün
  dürüstlük notu, Faz 4'te de geçerli).
- **Mutasyon serisinin PAYI artmalı.** 3.8/3.9/3.10'da 19'da sabit kaldı çünkü
  üçü de migration yazmadı. Faz 4 migration yazacak; **pay artmazsa yeni yüzey
  negatif testsiz gelmiş demektir** (`spec/09` §11.5, okuma kuralı).

#### 🆕 3.10'DA KURULAN YENİ ZORUNLULUK — rapor arşivi

Her alt görev raporu terminale basılmadan **önce**
`docs/reports/faz-04/<no>-<slug>.md`'ye yazılır; terminale basılan metin o
dosyanın **aynısıdır**. Biçim ve künye: `docs/OUTPUT-FORMAT.md` → *"Rapor
arşivi (zorunlu)"*. Sözleşme: `docs/reports/README.md` (**append-only**,
**otorite değil**).

**KAPSAM SINIRI (Faz 3'ten devreden, Faz 4'te de geçerli).** `asset_index` →
Faz 7 (G-09) · `rivalries` `(A,A)` deliği ve `color3` ↔ `colorSlots` → Faz 11
(G-11, G-12) · `competitions` araması → Faz 17 (G-13) · `pnpm perf:budget` →
Faz 6 (G-01) · `WorldView` → Faz 12 · Master rolü ikinci hattı → Faz 12
(BORÇ-007). Aklına başka bir şey gelirse `docs/V2-BACKLOG.md` (K12).


### 🧭 ÖLÇÜM KARARLARI (3.9) — FAZ 4 VE FAZ 6 BUNLARA UYAR

| Karar | Gerekçe nerede | Not |
|---|---|---|
| FK davranışı **kuraldan türetilir**, listeden değil | `src/schema/fk-policy.ts` · `spec/01` §3.1.2 ③+⑧ notu | Faz 4'ün FK'ları liste güncellenmeden denetlenir |
| Üçüncü sınıf (**sözlük**) = `key` yok **+ giden FK yok** | aynı dosya | *"Sahipsiz"* ölçülebilir; `kit_templates` adı yazılmadan bulunuyor |
| Elle tam envanter testi **korunur** | `schema-constraints.itest.ts` | Liste ve kural farklı şey söylüyor |
| Süre iddiası **hacimle birlikte** yazılır (A / B etiketi) | `seed-query-performance.itest.ts` · `search-index.itest.ts` | Hacimsiz bir *"< 20 ms"* SAPMA-024 sınıfı |
| **`ANALYZE` şart** — yokluğu gurur verici bir yalan üretir | `seed-query-performance.itest.ts` başlığı · G-01 notu | `reltuples = -1` → *"hiç ANALYZE edilmedi"* |
| Plan seçimi **seçiciliğe** bağlı, hacme değil | `search-index.itest.ts` | Aynı tabloda iki terim, iki farklı plan |
| Ölçümün **mimarisi** raporun parçası | ROADMAP 3.9 SONUÇ | amd64'te ölçüldü, üretim ARM64 (K14) |
| Eşik ölçümü **artırarak** yapılır, azaltarak değil | günlük #46 | `DELETE` `relpages`i bayat bırakıyor |

---

### 🧾 ŞEMA VE İNDEKS KARARLARI (3.4 → 3.7) — 3.8+ ve FAZ 4 bunlara UYAR

| Karar | Geldiği | Nerede yazılı |
|---|---|---|
| §3.1.0 sütunları tek bir modülden gelir, kopyalanmaz | 3.4 | `src/schema/data-pack-columns.ts` |
| `source` **DEFAULT ALMAZ** — varsayılan, kimsenin belirlemediği satıra köken uydurur | 3.4 | aynı dosya + `round-trip.itest.ts` |
| `externalIds` Zod'u **`strictObject`** — `wikidatta` yazım hatası sessiz geçmez | 3.4 | aynı dosya |
| `CompetitionRules` Zod'u da **`strictObject`** ve iç içe nesnelerde de öyle | 3.4 | `src/schema/competition-rules.ts` |
| Zod şeması `packages/db`de, `packages/shared`da değil (`zod`u barrel'a çekmemek) | 3.4 | `src/schema/competition-rules.ts` başlığı |
| Varlık kimlikleri (`flag_asset_id`, `logo_asset_id`, `asset_id`, `crest_asset_id`) **nullable** | 3.4·3.5 | SAPMA-026 |
| `competitions.tier` **nullable** — kupanın kademesi yoktur | 3.4 | SAPMA-026 |
| `founded_year` / `built_year` **nullable** — bilinmeyen yıl uydurulmaz | 3.4·3.5 | SAPMA-026 |
| **`clubs.competition_id` ve `clubs.stadium_id` nullable** — milli takımın (Faz 41) ne ligi ne sabit sahası var | **3.5** | SAPMA-026 EK · `src/schema/clubs.ts` · G-10 |
| **`clubs.is_national` DEFAULT ALMAZ** — `source` ile aynı ilke; unutulursa `INSERT` gürültülü patlar | **3.5** | `src/schema/clubs.ts` |
| **1:1 uydularda `club_id` hem PK hem FK** — ayrı `serial id` ikinci bir kimlik yolu açardı | **3.5** | `club-facilities.ts` · `club-finances-base.ts` |
| **Para sütunları `bigint` + `{ mode: 'bigint' }`**, birim kuruş/cent | **3.5** | `spec/01` §3.1.2 ⑥ |
| **FK kısıt adları ELLE VERİLMEZ** — `rivalries`ın iki FK'sı ölçüldü, çakışma yok; elle ad şemayı iki adlandırma kuralına bölerdi | **3.5** | `src/schema/rivalries.ts` |
| **`drizzle.config.ts` `schema` deseni test dosyalarını dışlar** (extglob; negatif desen çalışmaz) | **3.5** | `spec/09` §11.4 satır 11 · `drizzle-config.test.ts` |
| **`rivalries` tekrar/kendine-referans kısıtı Faz 11'e** — kısmi koruma D3 yanılsaması üretir | **3.5** | `src/schema/rivalries.ts` · G-11 (3.7'de bedelsiz eklenebilir) |
| **`club_kits` `(club_id, kit_type)` UNIQUE KONDU** — `rivalries` gerekçesi burada **geçersiz**: kapalı küme, sıralama belirsizliği yok, kısıt **tam** | **3.6** | `src/schema/club-kits.ts` (karar kopyalanmadı, yeniden verildi) |
| **`club_kits.asset_id` eklendi** — `spec/01`'de yoktu; görsel taşıyan beş tablonun deseni korundu | **3.6** | SAPMA-026 EK · `src/schema/club-kits.ts` |
| **Sözlük tabloları → RESTRICT** (`kit_templates`; Faz 4'ün `injury_types`/`staff_roles`'ü aynı sınıf) | **3.6** | `spec/01` §3.1.2 **⑧** |
| **Sayısal ama KAPALI küme → CHECK** (`color_slots`); ayraç *"sözleşme mi kalibrasyon mu"*, *"dize mi sayı mı"* değil | **3.6** | `spec/01` §3.1.2 ② 4. satır |
| **`kit_templates.code` UNIQUE** — `key`in rolünü görüyor (§3.1.0'ın kendi notu) | **3.6** | `src/schema/kit-templates.ts` |
| **`rivalries` çift tekliği KONDU** — `(least,greatest)` ifade indeksi; 3.5'in **iki gerekçesi de düştü**, kalan tek delik `(A,A)` → Faz 11 | **3.7** | `src/schema/rivalries.ts` · G-11 (daraldı) |
| **`IMMUTABLE` sarmalayıcı** — `unaccent` `STABLE`, iki aşırı yükleme de; iddia **kabul edildi ve izleniyor** (sözlük nöbetçisi testi) | **3.7** | `spec/01` §3.1.2 ⑨ · `src/schema/search.ts` |
| **İndeks ifadesi TEK YERDE üretilir** — indeks ve sorgu ayrışırsa cevap doğru kalır, plan çöker, hiçbir kapı ötmez | **3.7** | `src/schema/search.ts` + `search.test.ts` |
| **Uzantı `down`u CASCADE'siz** — PG bağımlı indeks varken `DROP EXTENSION`'ı reddediyor, fazla gitme yapısal olarak imkânsız | **3.7** | `spec/01` §3.1.2 ⑩ |
| **`COLLATE`'li indeks YAPILMADI** — ROADMAP 3.7 saymıyor, tüketicisi Faz 32 ve doğru indeks o sorgunun şekline bağlı | **3.7** | ROADMAP 3.7 · 3.0'ın ölçümü kayıtlı |

---

### 📌 FAZ 3'ÜN KESİNLEŞMİŞ ZEMİNİ (3.0 → 3.7)

**✅ TABLO ENVANTERİ KAPANDI: 11 / 11 yazıldı.** Sayı 3.1'de mutabakata
bağlanmıştı (SAPMA-021: ROADMAP 15, `spec/01` 11, Faz 2 kaydı 16 diyordu) ve
3.6'da **ölçülerek** kapandı — `information_schema`'dan okunuyor, gözle
sayılmıyor. Karar tablosu `docs/ROADMAP.md` → *Faz 3 — Tablo envanteri*. Özet
`docs/schema/world.md`. Sütun sözleşmesi `docs/spec/01-database.md` **§3.1.0** ve
**§3.1.1**. Migration disiplini **§3.0**.
**Şema yazım kuralları §3.1.2 — artık ON kural** (①–⑤ 3.4, ⑥–⑦ 3.5, ⑧ 3.6, ⑨–⑩ 3.7):
`check()` desteği · CHECK'in nereye konacağı (**②'nin dördüncü satırı 3.6'da
eklendi**) · `ON DELETE` kuralı · sütun sırası · `attnum` deliği ·
**`bigint` modu** · **elle `down`un düşürme sırası** · **sözlük tabloları →
RESTRICT** · **`IMMUTABLE` iddiası ve nöbetçisi** · **uzantı `down`u**.
⚠️ **Bu bölüm bundan sonra FAZ 4'ün kaynağıdır** — Faz 3'ün şema işi bitti.

**✅ Kabul kriteri 1 KAPANDI (3.2b), 3.4–3.7'de GENİŞLETİLDİ.** 3.2b:
`countries` tek başına **89 olgu**. 3.4: üç tabloda **466**. 3.5: sekiz tabloda
**1.223**. 3.6: on bir tabloda **1.619**. 3.7: dört indeksle **1.627 olgu, fark
yok**; çok adımlı fixture zincirinde **48 olgu, fark yok**. Üç yerde birden
koştu: `pnpm test:db` · CI `Entegrasyon` işi (amd64+arm64) · derlenmiş çıktı düz
`node` ile (D5).
⚠️ **İKİ ÇEVRİM SINIFI VE İKİSİ DE AYRI TESTTE:** yalnızca `CREATE TABLE` içeren
bir migration'ın (`0002`, `0003`, `0004`) tek başına çevriminde `identical: true`
**beklenir**; `ALTER` içeren bir migration'ın (`0001`) çevriminde
**beklenmez** (`attnum` deliği, §3.1.2 ⑤) ve farkların **tam listesi** iddia
edilir. Birleştirilselerdi yeni bir migration'ın fazla giden `down`u eskinin
bilinen farklarının arkasında görünmez olurdu.
⚠️ **3.4'te bir sınır ölçüldü:** *tek adımlık* bir `ALTER` migration'ının çevrimi
`identical: true` **vermez** (`attnum` deliği, `spec/01` §3.1.2 ⑤). Kriter tam
zincir geri almasıyla sağlanıyor; tek adımlık çevrim farkların **tam listesiyle**
iddia ediliyor. İkisi farklı yollar ve **ikisi de gerekli** — tam zincir,
`countries` düşüp yeniden yaratıldığı için 0001'in `down`undaki bir fazla gidişi
**maskeler**.

**Faz 3'te bilerek YAPILMAYAN dört şey — hepsinin gerekçesi yazılı:**

| Ne | Nereye |
|---|---|
| `competition_seasons` | Hiçbir yere — tüketicisi yok (SAPMA-021) · ürün fikri `V2-BACKLOG` |
| `asset_index` | **Faz 7** (G-09) |
| Üç ileri FK (`presidentPersonId`, `chairmanPersonId`, `personId`) | **Faz 4** — sütun ve FK **birlikte**, Faz 4 maddesine ve kabul kriterine yazıldı |
| `spec/12` slug algoritmasının düzeltilmesi | **Faz 7** — durak sözcük listesi gerçek paket verisiyle kalibre edilecek (SAPMA-022) |

**Sonraki alt görevleri bağlayan ölçülmüş kısıtlar:**

- **ŞEMA YAZIM KURALLARI → `docs/spec/01-database.md` §3.1.2** (3.4'te beş,
  3.5'te yedi, 3.6'da sekiz, 3.7'de **on**). Burada **tekrarlanmıyor**: iki kopya kaçınılmaz
  olarak ayrışır ve hangisinin güncel olduğu bilinmez. **Faz 4 oradan okur.**
  Özet başlıkları: `check()` desteği · CHECK nereye konur · `ON DELETE` kuralı ·
  sütun sırası · `attnum` deliği · **`bigint` modu** ·
  **elle `down`un düşürme sırası** · **sözlük tabloları → RESTRICT** ·
  **`IMMUTABLE` iddiası** · **uzantı `down`u**.
- **K4 (3.3'te kuruldu, 3.4'ten itibaren ZORUNLU biçim):** master tablo
  `masterTable(...)` ile sarılır; save katmanı tablosu `arch:save-scoped` ile
  **açıkça** muaf tutulur. `arch:check` ⑨ denetliyor. Sözleşme
  `docs/spec/01-database.md` **§3.4.1**. İki istemci: `db.master` (yazma metotları
  tipte yok) ve `db.writable` (master tablo verilirse parametre `never`).
  İddia kontrol deneyiyle kanıtlı — koruma kaybolursa `pnpm typecheck` kırılır.
- **Master salt-okunurluğunun İKİNCİ hattı kurulmadı (BORÇ-007, Faz 12).**
  Mekanizma ölçüldü ve koşulabilir: uygulama rolüne yalnızca `GRANT SELECT`
  verilince ham SQL yazma denemeleri `permission denied` alıyor. Tip seviyesinin
  atlanabildiği üç yol (`as unknown as`, ham SQL, tip sistemini görmeyen istemci)
  ancak orada kapanır.
- **3.7 (indeksler):** düz `pg_trgm` Türkçe aramayı **sağlamıyor**
  (`'Beşiktaş' % 'besiktas'` → **`f`**, benzerlik 0,286 · eşik 0,3). `unaccent`
  gerekiyor (1,0) ama **`STABLE`**, indekste doğrudan kullanılamıyor →
  `IMMUTABLE` sarmalayıcı şart. Aynı ölçüm **Faz 8'in kabul kriterinin** dayanağı.
- **Sıralama:** veritabanı varsayılanı kod-noktası; Türkçe sıralama sorgu başına
  `COLLATE "tr-TR-x-icu"` ile ve `COLLATE`'li indeks `Index Only Scan` veriyor.
- **Yeni migration yazan her alt görev `drizzle/down/<tag>.sql` de yazar.**
  Dosya yoksa koşucu `migration.downScriptMissing` ile **veritabanına dokunmadan
  durur** — unutmak sessiz değil, gürültülü.
- **Yeni migration ekleyen her alt görev round-trip testini de genişletir.**
  Hat hazır (`src/schema-state/`), maliyeti bir `it()` bloğu. Genişletilmezse yeni
  tablonun `down`u **hiç sınanmamış** olur ve 3.2b'nin kanıtı yalnızca `countries`
  için geçerli kalır.
- **`packages/db` kapsamı KANIT SAYILMAZ.** `file-source.ts`, `postgres-executor.ts`
  ve `introspect.ts` raporda **%0** ama üçü de entegrasyon testiyle gerçek
  Postgres'e karşı koşuyor.
- **`allowBuilds` politikası:** yeni bir bağımlılık kurulum betiği getirirse
  `pnpm-workspace.yaml`'a **açık** satır yazılır; varsayılan `false`
  (ORTAM TUZAKLARI ⑫).
- **`packages/db/tsconfig.json` `rootDir` TAŞIMAZ** — emit eden
  `tsconfig.build.json`'da. Geri konursa `integration/` ve `drizzle.config.ts`
  tip denetiminden **sessizce** çıkar (günlük #11).
- **`pnpm format:check` Markdown'a bakmıyor** (SAPMA-024). Belge ağırlıklı bir
  alt görevde `format ✅` yazılmaz.
- **CI'a yeni iş eklenirse mevcut işlerin ÖRTÜK hazırlık adımları çıkarılır**
  (`spec/09` §11.5). `Entegrasyon` işi `pnpm build` olmadan kırılmıştı.

---

### 🔬 ÖLÇÜM DİSİPLİNİ — KALICI BLOK

> Faz 2'nin 59 satırlık günlüğü o fazın kaydında §5'te **altı** desene indirgendi
> (D1…D6). İkisi her fazda geçerli olduğu için burada duruyor; gerisi için faz
> kaydına bakınız. **D7 Faz 3.1'de bulundu** ve buraya eklendi — Faz 3 kaydının
> §5'ine faz kapanışında girecek.

**D1 — ÖLÇÜM SONUCU UYDURMA (Faz 2'de 3 kez, kural her seferinde yazılıydı).**
Somut eylem kuralı: bir belgeye/rapora sayı yazılacaksa o satır **ölçüm
çıktısından kopyalanır**; belge ölçümden önce yazılıyorsa alan **`ÖLÇÜLECEK`**
bırakılır. Ölçüm yoksa **"ölçülemedi"** yazılır. Makul görünen bir tahmin,
yanlış olduğunu belli etmez.

**D2 — ÖLÇÜM ARACININ KENDİSİ YANLIŞ CEVAP ÜRETİR (Faz 2'de 4 kez).**
Bir davranış ölçümü beklenmedik sonuç verdiğinde **önce aracın sağlıklı olduğu
doğrulanır**. Ölçülmüş dört vaka: turbo önbelleği silinmiş kirli paketi diriltti ·
aynı paket için iki farklı gzip rakamı · küçültücü dizeleri ters tırnakla
yazdığı için çift tırnaklı desen iki pakette de 0 döndü · Browser pane
görüntülenmediği için OS tuş girdisi hiç iletilmedi ve **yanlış negatif**
üretti (uydurma bir SAPMA açmaya bir adım kalmıştı).

**D7 — KENDİ YAZDIĞIN PLAN, KAYNAK DEĞİLDİR (Faz 3.1'de bulundu).**
Bir iddiayı doğrularken `grep` eşleşmesinin **hangi dosyada** olduğuna bakılır.
`docs/spec/**` ve `CLAUDE.md` **kaynaktır**; `docs/ROADMAP.md` ve
`PROJECT_MEMORY.md` **kendi sesindir** — oraya bir önceki oturumda sen yazdın.
Ölçülmüş vaka: *"Faz 8 kulüp detay ekranında sezon sezon performans geçmişi
istiyor"* varsayımı plana yazıldı; ertesi alt görevde arandığında **tek eşleşme o
metnin kendisiydi** ve bir an doğrulanmış göründü. Gerçekte Faz 8'de böyle bir
madde yok, hatta ROADMAP'te bir "kulüp detay ekranı" bile yok.
**D2'den ayrı bir sınıf:** orada araç bozuktur, burada **araç doğru çalışır** ve
bozuk olan **kaynaktır** — bu yüzden "aracı doğrula" önlemi işe yaramaz.
Şüphe varsa `git log -S '<iddia>' -- <dosya>`: satır kendi son commit'inden
geliyorsa kaynak değildir. Kural `spec/11` §12.4'te.

**PAKET ÖLÇÜMÜNÜN DÖRT KURALI** (`docs/spec/09` §11.5b'de kalıcı):
① soğuk derleme — `rm -rf .turbo/cache` ② ham bayt, tek kaynak ③ nöbetçi
**iki yönlü** doğrulanır ④ açıklanamayan fark **ayrıştırılır**.

**DIŞLAMA KANITININ ÜÇ ARACI** (2.8'de bulundu, `spec/09` §11.5b'de yazılı):
tanımlayıcı araması **hiçbir şey** söylemez (küçültme adları değiştirir) ·
dize nöbetçisi o **dizgenin** yokluğunu söyler · **kaynak haritası `sources`
listesi** o **MODÜLÜN** yokluğunu söyler ve dize literali taşımayan modüller
için **tek geçerli yöntemdir**.
```
node -e "const m=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));
console.log(m.sources.filter(s => s.includes('ARANAN')))" apps/web/dist/assets/*.js.map
```

**BUILD ET VE ÇALIŞTIR (SAPMA-014).** "Testler yeşil" bu adımın yerine geçmez:
dairesel DI hatasında `typecheck`, `lint`, 19 test ve `build` dördü de sessiz
kaldı; yakalayan tek şey derlenmiş çıktıyı çalıştırmak oldu.

---

### 🧰 ORTAM TUZAKLARI — ölçülmüş, kalıcı blok

**① `MSYS_NO_PATHCONV=1`** — Git Bash, Docker'a `-e PUBLIC_BASE_PATH=/fms` gibi
eğik çizgiyle başlayan argümanı `C:/Program Files/Git/fms`'e çeviriyor ve hata
**rota/Sentry hatası gibi** görünüyor.

**② Browser pane görüntülenmiyorsa** sentetik OS tuş girdisi sayfaya **hiç
ulaşmaz**; `document.hasFocus()` yine `true` döner. Tek dürüst belirti
`screenshot`ın *"the Browser pane is not displayed"* ile zaman aşımına
uğraması. Çözüm: `preview_start` ile pane'i yeniden aç.
`computer{action:"key"}` modifiye sözdizimi **tek dizge**: `{text:'ctrl+shift+d'}`.
Sentetik olayda `event.code` **boş** gelir — dinleyiciler `key`e bakmalı.

**③ Windows'ta 3000/3001 portunu boşaltma:**
```
Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

**④ Docker Desktop kapalı başlayabilir** — konteyner işi olan alt görevlerde
`Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"` ile açılıp
hazır olması beklenir (~30 sn).

**⑤ Çok katmanlı kaçış (kabuk → node → dosya) YERİNE doğrudan düzenleme.**
Faz 2'de iki kez ısırdı: heredoc içindeki ters tırnaklar bash tarafından komut
ikamesi sanıldı ve metin sessizce bozuldu.

> ⚠️ **Faz 3.3: AYNI TUZAK DÖRT KEZ, ve TIRNAKLI heredoc bile korumadı.**
> `<<'PY'` yazılmasına rağmen `\n` Python'a **gerçek satır sonu** olarak ulaştı.
> Somut belirtiler:
> - `tools/arch-check/index.mjs` → `text.split('` + gerçek satır sonu → `SyntaxError`
> - `arch-check.test.mjs` → aynı hata, Vite `import-analysis` ile patladı
> - `PROJECT_MEMORY.md` → backtick'ler **komut ikamesi** sanıldı,
>   `` `packages/db` `` metni "Is a directory" hatasıyla **sessizce boşaldı**
>
> **Kural (somut):** kaçış dizisi (`\n`, `\r`, `\t`) veya **backtick** içeren
> metin heredoc'tan **geçirilmez**. İki yol var: ① `Edit` aracıyla doğrudan yaz
> ② kaçışsız üret — `String.fromCharCode(10)`, `/\r?\n/` regex literal'i.
> "Bu sefer tırnakladım, sorun olmaz" **çalışmıyor**.

> ⚠️ **Faz 3.10: YEDİNCİ VAKA — heredoc bile yoktu.** Metin `python -c "…"`
> çağrısının **çift tırnaklı** argümanı içindeydi; bash çift tırnak içinde de
> komut ikamesi yapıyor ve `` `docs/spec/11-project-memory.md` `` bir komut
> olarak **çalıştırıldı**. Sonuç: `PROJECT_MEMORY.md`'ye yazılan cümleden dosya
> adı **sessizce düştü** (`> Başlık kalıyor ( §12.2)`), hiçbir kapı ötmedi,
> düzeltme yalnızca gözle fark edilerek yapıldı.
>
> **Kural genişledi:** ters tırnak içeren metin **hiçbir kabuk argümanından**
> geçirilmez — heredoc'tan da, tırnaklı dizeden de. Markdown'ın içi zaten ters
> tırnak dolu, yani **Markdown metni kabuktan hiç geçmez**: `Write`/`Edit`
> araçlarıyla yazılır. Kabuk yalnızca **dosyaları birleştirmek** için kullanılır
> (`cat a b > c`) — 3.10'da `docs/schema/world.md` böyle kuruldu ve orada hiçbir
> sorun çıkmadı.

**⑥ `vite preview` repo kökünden çalıştırılamaz** — `envDir` göreli.
İki derlemeyi karşılaştırırken aralarında `rm -rf apps/web/dist` (SAPMA-011).

**⑦ Vite `build.minify` `mode`'dan bağımsız** — `--mode development` de
küçültüyor. Bu yüzden iki derleme yalnızca gömülü sabitte ayrışır ve bayt farkı
yorumlanabilir olur.

**⑧ `.env`'de GERÇEK SENTRY DSN VAR** — kota 3/5.000. Denemede DSN geçici
boşaltılır ve **geri yüklenir**; Faz 2'de bu yol iki kez kullanıldı.

**⑨ API `--import` olmadan açılırsa Sentry SESSİZCE kurulmaz** (Risk R1).
Tek belirti açılış logundaki `"sentry": false`. Dockerfile `CMD`'si bayrağı
taşıyor ve bu 2.9'da `Config.Cmd` okunarak doğrulandı.

**⑩ `javascript_tool` top-level `await` kabul etmiyor** — asenkron sonda
gerekiyorsa IIFE'ye sarılır: `(async () => { … })()`.

**⑪ `.env`'de `ACTIVE_PACK` BOŞ ve bu BEKLENEN** — API her açılışta
`env.activePackMissing` uyarısı basıyor. Hata değil (veri paketleri Faz 7-9).
Yeni oturum bunu regresyon sanmasın.

**⑫ `pnpm install` KURULUM BETİĞİ OLAN BİR PAKETTE KURULUMU KIRAR** (Faz 3.0).
pnpm 11 bağımlılıkların `install`/`postinstall` betiklerini varsayılan olarak
çalıştırmaz ve **karara bağlanmamış** bir betik kalırsa `pnpm install` **exit 1**
döner (`ERR_PNPM_IGNORED_BUILDS`). Yeni bir bağımlılık böyle bir paket getirirse
`pnpm-workspace.yaml` → `allowBuilds` haritasına **açık** satır yazılır.

- ⚠️ **Anahtar `ignoredBuiltDependencies` DEĞİL.** pnpm 11'de o ayar (ve
  `onlyBuiltDependencies`, `neverBuiltDependencies`, `onlyBuiltDependenciesFile`)
  **LEGACY** ve **sessizce yok sayılıyor**. Faz 3.0'da ikisi de yazıldı, kurulum
  yine exit 1 verdi; cevap pnpm'in kendi dağıtımından okundu (`LEGACY_BUILD_SETTINGS`).
- ⚠️ **`pnpm install` `pnpm-workspace.yaml`'ı KENDİSİ DEĞİŞTİRİR** — iskelet satır
  yazar (`paket: set this to true or false`). Kurulum sonrası
  `git diff pnpm-workspace.yaml` bakılır.
- ⚠️ **Karar `node_modules/.modules.yaml`'da ÖNBELLEKLENİR** ve o dosya
  `.gitignore`'da. Yani ayar olmadan da yerelde `exit 0` alınabilir — **CI temiz
  kurulumda kırılır**. Negatif test `pnpm install --force` ile yapılır, aksi
  hâlde yanlış negatif verir (günlük #4).

**⑭ PYTHON, GIT BASH'İN `/c/...` YOLUNU ÇÖZEMEZ** (Faz 3.4). `python3` bu makinede
**Windows yorumlayıcısıdır**; MSYS tarzı `/c/Users/...` yolu ona anlamsız gelir ve
`io.open` **`FileNotFoundError`** verir — oysa aynı çağrıdaki `ls` dosyayı
**görür**. Belirti yanıltıcı, çünkü aynı betikteki **göreli** yollar sorunsuz
çalışır. Çözüm: Python'a verilen her mutlak yol **`C:/...` biçiminde** yazılır.
Tuzak ① (MSYS argüman dönüşümü) ve ⑬ (kalıcı çalışma dizini) ile aynı aile:
üçü de *"yol yazdığın/okuduğun yere gitmedi"* ve üçü de sessiz ya da yanıltıcı.

**⑬ Bash aracının ÇALIŞMA DİZİNİ ÇAĞRILAR ARASINDA KALICI** (Faz 3.0). Bir
çağrıda `cd packages/db` yapılırsa sonraki çağrıdaki göreli yol **oradan** çözülür.
Faz 3.0'da sonda dosyaları `packages/db/packages/db/` altına yazıldı ve `find`
maxdepth yüzünden onları bulamadı. **Dosya yazarken her zaman mutlak yol; `pwd`
çıktısı varsayılmaz.** Tuzak ①'in (MSYS yol dönüşümü) akrabası: ikisi de "yol
yazdığın yere gitmedi" sınıfı ve ikisi de sessiz.

---

### 🧩 KOD VE YAPILANDIRMA TUZAKLARI — ölçülmüş, kalıcı blok

**① `vitest.config.ts` `define` ≠ `vite.config.ts` `define`.** Vitest, Vite
yapılandırmasını kullanmıyor. `vite.config.ts`'e eklenen **her yeni derleme
zamanı sabiti** `vitest.config.ts` web projesine de verilmeli; yoksa o sabiti
okuyan bir bileşen render eden **her** test `ReferenceError` ile kırılır — ve
bileşen ağacına giren yeni bir düğüm bunu **uzaktaki** testlere de bulaştırır.

**② Sentry entegrasyon adları PLATFORMA GÖRE DEĞİŞİYOR.** Node SDK'sında
`ProcessSession`, tarayıcı SDK'sında `BrowserSession`. Aynı işi yapan iki
farklı ad: sunucudaki sabiti tarayıcıya kopyalamak filtreyi **sessizce hiçbir
şey yapmaz** hale getirir. Kaldırılacak entegrasyon **ölçülerek** bulunur.

**③ React `ErrorBoundary` PROMISE ZİNCİRİNDEKİ hatayı YAKALAMAZ** — ölçüldü
(2.7). Sınırlar yalnızca render/lifecycle hatalarını yakalar. `.then()` içinde
fırlatılan hata çağıranın kendi `.catch()`ine düşer; ne yedek arayüz çıkar ne
de `crash` etiketi devreye girer.

**④ `arch:check` `undeclared-dependency` kuralının kapsamı DAR ve öyle
kalmalı.** Yalnızca `@fms/*` belirteçlerini denetliyor. Tüm paketlere
genişletilirse **her test dosyası ihlal verir**: `vitest` hiçbir workspace
paketinin `package.json`'ında bildirilmemiş, yine de çalışıyor — Vitest kendi
çözümleyicisini kullanıyor, `tsc` ise kök `node_modules`'a kadar yukarı
yürüyor. Genişletmeden önce bu düşünülmeli.

**⑤ Tarayıcı konsol okuyucusu nesne alanlarını `…` ile KISALTIYOR** — alan
düzeyinde iddia için yetmez. Kanıt ya paketten doğrudan okunur ya birim testiyle
alınır.

---

### 🔒 Faz 1'de kilitlenen kararlar (değiştirmeden önce oku)

- TypeScript `~6.0.3`, `^` **yasak** → `docs/ADR/0003`
- Monorepo ve turbo kapsamı → `docs/ADR/0001` (lint/test/arch kökte, build/typecheck paket başına)
- Alt yol tek kaynağı ve ölçülen tuzaklar → `docs/ADR/0002`
- Windows ↔ Linux/ARM64 ayrışması → `docs/ADR/0004`
- **`.env` içinde `NODE_ENV` TUTULMAZ** → `scripts/check-env-file.mjs`
- **`coverage.include` silinmez — ve uzantı listesi daraltılmaz** (SAPMA-007)
- **`packages/shared` `sideEffects: false`** kalmalı
- **Postgres healthcheck'i `pg_isready` DEĞİL** (`psql -c 'SELECT 1'`)
- **Express 5 joker rota** sessizce dönüştürülür → `*splat` elle yazılır (SAPMA-006)
- CI'da `PUBLIC_BASE_PATH` workflow `env:` bloğundan gelir
- Commit alt görev başına, PR faz başına · Rapor formatı `docs/OUTPUT-FORMAT.md`
- Alt görev listesi onaylanır onaylanmaz ROADMAP'e yazılır (K11)

---

### 🛡️ `arch:check` KAPSAMI — kalıcı blok (SAPMA-012: tek yapısal savunma hattı)

> **Neden burada:** SAPMA-012'den beri paket sınırının tek **önleyici** hattı bu
> araç (`types: []` ve `sideEffects: false` ölçümle çürütüldü; paket taraması
> yalnızca **doğrulayıcı** ikinci hat). Kapsamı hiçbir yerde yazılı değildi.
> Yazılı olmayan bir kapı sessizce daralabilir ve `✓ arch:check temiz` çıktısı
> bunu **söylemez** — 2.1'de `.cts` ile tam olarak bu oldu ve elle bulundu.
> Bu blok her alt görevde silinmez; **kapsam değişince güncellenir.**
>
> Rakamlar 2026-08-25'te `tools/arch-check/index.mjs` üzerinden **ölçüldü**,
> elle sayılmadı.
>
> ✅ **2.3b sonunda yeniden ölçüldü, kapsam DEĞİŞMEDİ:** 7 kural · 7 taranan
> uzantı · 3 varlık uzantısı · 9 katman / 13 bağ. 2.3b yeni bir kural veya
> uzantı eklemedi; blok ile gate ayrışmadı.
>
> ⚠️ **2.7'DE KAPSAM DEĞİŞTİ — ama KURAL SAYISI DEĞİŞMEDİ.** `engine-forbidden-import`
> kuralının **tablosu** 1 girdiden **3 girdiye** çıktı (`createCorrelationId` +
> **`measure`** + **`configureAssertions`**). Kural sayısı hâlâ **7**; yeni bir kural
> eklenmedi çünkü 2.3a'nın kuralı zaten tam bu işi yapıyor.
>
> **Bu, kanaryayı bir kademe aşağı indirdi ve ölçümle gerekliliği gösterildi:**
> kural düzeyinde tek fixture yeterli GÖRÜNÜYORDU. Mutasyon (a) — `measure`
> fixture'ı devre dışı bırakıldı: **yalnızca yeni "üç adın her biri" testi kırıldı**
> (1/44); "YEDİ kural" testi ve tablo bütünlüğü testi **yeşil kaldı**. Mutasyon (b) —
> tablo anahtarı `measure` → `measured` yanlış yazıldı: 2 test kırıldı ama
> **`pnpm arch:check` "✓ temiz" dedi.**
> **Kural: bir arch:check kuralı bir TABLO okuyorsa, kanarya kuralı değil tablonun
> HER GİRDİSİNİ kapsamalı.** Kural düzeyinde eşitlik sağlanmış görünürken girdi
> düzeyinde delik kalabilir (günlük #54).

> ⚠️ **2.8'DE SEKİZİNCİ KURAL EKLENDİ: `forbidden-export-exists`.**
> 2.7'nin mutasyon (b) ölçümü bir **gate sessizliği** bırakmıştı: tablo anahtarı
> `measure` → `measured` yanlış yazılınca iki meta-test kırılıyor ama
> `pnpm arch:check` **"✓ temiz"** diyordu. Yeni kural `@fms/shared` barrel'ını
> TS ayrıştırıcısıyla okuyup `ENGINE_FORBIDDEN_SHARED_EXPORTS`'un her
> anahtarının **gerçekten dışa aktarıldığını** denetliyor.
> **Aynı mutasyon artık gate'i kırıyor (exit 1).**
> Barrel okunamıyorsa kural **atlanıyor** — "doğrulanamıyor" ile "ihlal var"
> ayrı şeyler; kanaryanın temiz depo testi bu sayede yanlış pozitif almıyor.
> Kanaryada hem **öttüğü** hem **sustuğu** ayrı testlerle sabitlendi.

**Kural sayısı: 9** (kaynak: `runArchCheck` içinde basılan `rule:` belirteçleri)

| # | `rule` | Ne denetler | Geldiği faz |
|---|---|---|---|
| ① | `layer-direction` | Katman bağımlılık yönü (CLAUDE.md §2.4) | 1.6 |
| ② | `engine-purity` | K3 — yasaklı modül · yasaklı çağrı · `new Date()` · modül düzeyi değiştirilebilir bağlama (**4 ayrı bildirim yeri, tek kural adı**) | 1.6 |
| ③ | `import-casing` | Göreli import yolu ↔ diskteki dosya adı harf eşleşmesi | 1.6 |
| ④ | `asset-absolute-path` | `.html`/`.json`/`.css` kaynak varlıklarında mutlak uygulama yolu (K6) | 1.6 |
| ⑤ | `restricted-subpath` | `@fms/shared/server` yasak katmanda mı | **2.2a** |
| ⑥ | `undeclared-dependency` | `@fms/X` import ediliyorsa `package.json`'da bildirilmiş mi | **2.2a** |
| ⑦ | `engine-forbidden-import` | Motorun `@fms/shared`'dan alamayacağı **adlandırılmış** dışa aktarımlar | **2.3a** |
| ⑧ | `forbidden-export-exists` | ⑦'nin tablosundaki her adın barrel'da **gerçekten** dışa aktarıldığı (yanlış yazım kuralı köreltiyordu) | **2.8** |
| ⑨ | `master-table-marking` | `packages/db/src/schema/` altındaki her `pgTable(...)` `masterTable(...)` ile sarılı ya da `arch:save-scoped` ile **açıkça** muaf (K4 — tip sistemi "işaretlemeyi unutmayı" göremez) | **3.3** |

> ⚠️ **3.3'TE DOKUZUNCU KURAL EKLENDİ: `master-table-marking`.**
> Ölçüm şunu gösterdi: tip sistemi *"master tabloya yazma girişimini"* yakalıyor
> ama *"işaretlemeyi UNUTMAYI"* **yakalayamıyor** — göreceği bir marka yoktur.
> `countries`ten `masterTable(...)` sarması kaldırılınca kontrol deneyi öttü,
> **ama yalnızca o dosya `countries`i adıyla andığı için.** 3.4'te eklenecek yeni
> bir tablo sarmayı unutursa hiçbir şey ötmez.
>
> Kural `packages/db/src/schema/` altındaki her `pgTable(...)` çağrısının ya
> `masterTable(...)` ile sarılı ya da **`arch:save-scoped`** yorumuyla açıkça
> muaf olmasını istiyor. Muafiyet **varsayılan değil**: sessiz bir varsayılan
> "unuttum" ile "bilerek" arasındaki farkı yok ederdi.
>
> **Kanarya mutasyonla doğrulandı:** kablolama susturulunca **54 testin 1'i**
> kırılıyor (`DOKUZ kuralın hepsi ihlal bildiriyor`) ama `pnpm arch:check`
> **"✓ temiz"** diyor — 2.7'nin dersinin birebir tekrarı, bu kez yeni kuralda.
> Saf fonksiyonun (`findUnmarkedTables`) sekiz birim testi de var; birim testi
> kablolamayı kanıtlamadığı için ikisi birlikte duruyor.

**Taranan uzantılar (7):** `.ts .tsx .mts .cts .mjs .cjs .js`
— `.cts` 2.1'de eksikti ve bir `.cts` dosyası denetimden **tamamen** kaçıyordu.
**Varlık uzantıları (3):** `.html .json .css` — yalnızca `/src/` altında.
**Atlanan dizinler:** `node_modules`, `dist`, `.git`, `.turbo`, `coverage`.
**Taranan kökler:** `apps`, `packages`, `tools`, `scripts`.

**Katman tablosu: 9 katman, 13 izinli bağ**
`apps/web` 2 · `apps/api` 3 · `apps/worker` 3 · `packages/db` 1 ·
`packages/engine` 1 · `packages/ui` 1 · `packages/shared` **0** ·
`tools/data-cli` 2 · `scripts` **0**
*(Günlük #13'teki "12 bağ" 2.1 ölçümüdür; bugünkü ölçüm **13**.)*

**3.3'te eklenen sabitler (⑨ için):** `SCHEMA_DIR_PREFIX` = `packages/db/src/schema/` ·
`MASTER_TABLE_WRAPPER` = `masterTable(` · `SAVE_SCOPED_MARKER` = `arch:save-scoped` ·
muafiyet penceresi **3 satır** (yorum ile `pgTable(` arası).
Rakamlar `tools/arch-check/index.mjs` üzerinden **ölçüldü** (3.3 kapanışı), elle sayılmadı:
9 kural · 9 katman / 13 bağ · 7 taranan uzantı · 3 varlık uzantısı ·
11 motor yasaklı modül · 3 motor yasaklı çağrı · 3 yasaklı `@fms/shared` dışa aktarımı ·
6 varlık yolu ön eki · 1 kısıtlı alt yol.

**Diğer sabit tablolar:** motor yasaklı modül öneki **11** · motor yasaklı çağrı
**3** (`Math.random`, `Date.now`, `performance.now`) · motorun alamayacağı
dışa aktarım **3** (`createCorrelationId` · `measure` · `configureAssertions`
— 2.7'de 1'den çıktı) · varlık yolu ön eki **6** ·
kısıtlı alt yol **1** (`@fms/shared/server` → `apps/web`, `packages/ui`,
`packages/engine` — **üç** katmana birden kapalı).

**`measure` ve `performance.now` neden İKİ AYRI hatta yasak:** `ENGINE_FORBIDDEN_CALLS`
motorun `performance.now`u **kendisi çağırmasını** engelliyor (Faz 1.6);
`ENGINE_FORBIDDEN_SHARED_EXPORTS` motorun aynı yeteneği `@fms/shared`'dan
**ödünç almasını** engelliyor (2.7). Biri olmadan diğeri yeterli değil.

**Meta-test neden var — İKİ KATMAN, ve birincisi yetmez:**

- **① Tablo bütünlüğü** (`META: arch:check kural tabloları boşalmadı`) —
  sabit listeler boşalmış veya kırpılmış mı diye bakar.
  **Yakalayamadığı şey:** tablo dopdolu olabilir ama kuralın `runArchCheck`
  içindeki **kablolaması** kopmuş olabilir. Tablo kuralın *tanımını* tutar,
  *uygulandığını* kanıtlamaz.
- **② Kanarya deposu** (`META: KANARYA`) — geçici bir dizine her kuralın
  ihlalini içeren sahte bir repo yazılır, taranır ve her kuralın gerçekten
  **ötüğü** görülür. Ayrıca temiz bir depoda hiç ötmediği (yanlış pozitif yok).

> ⚠️ **2.3b'de ölçülen delik — kapatıldı.** Kanarya **6/7** kuralı kapsıyordu;
> `import-casing` kapsam dışındaydı. Mutasyon deneyi: `runArchCheck` içindeki
> `import-casing` bildirimi susturuldu → arch-check testlerinin **43'ü de
> geçti** ve `pnpm arch:check` "✓ temiz" dedi. Saf fonksiyonun beş birim testi
> onu doğrudan çağırdığı için yeşil kalıyordu — yani **birim testi kablolamayı
> kanıtlamıyor.** ADR-0004'e göre harf duyarlılığı bu projenin en pahalı hata
> sınıfı ve yerelde asla tekrar üretilemiyor; kapı tam orada körelebilirmiş.
> Kanaryaya `packages/ui/src/Widget.ts` ↔ `./widget.js` fixture'ı eklendi.
> Aynı mutasyon şimdi **1 başarısız** veriyor. Test sayısı değişmedi (43).

**Kapsam değişirse ÜÇ YER birden güncellenir:**
1. `tools/arch-check/index.mjs` → başlıktaki kural listesi
2. `tools/arch-check/arch-check.test.mjs` → kanarya fixture'ı **ve** beklenen kural listesi
3. **bu blok**

---

**Çalışan sistemi ayağa kaldırma:**
```
docker compose up -d
# ⚠️ `--import` ZORUNLU (2.5a, Risk R1). Unutulursa uygulama yine açılır ama
# Sentry enstrümantasyonu SESSİZCE kurulmaz. Tek belirti: açılış logundaki
# `"sentry": false` alanı. Dockerfile CMD'si de aynı bayrağı taşıyor.
node --import ./apps/api/dist/instrument.js --env-file=.env apps/api/dist/main.js   # :3001
pnpm --filter @fms/web exec vite preview        # :3000/fms/
```

**Bilinen kayıt düzeltmeleri:**

> ⚠️ **DÜZELTME (Faz 3.8) — bu dosyanın KENDİ 3.8 notu ⑥ yanlıştı.**
> *"KAPSAM — `tools/` EŞİĞE GİRMİYOR … `seed.ts` kapsamı düşürmez ve yükseltmez.
> Bugün %85,09; 3.8 sonrası **aynı kalmalı**"* deniyordu ve dayanağı `spec/09`
> §11.4'ün aynı yanlış cümlesiydi. **Ölçümle çürütüldü:** payda dört metrikte de
> büyüdü (+66 satır, +47 fonksiyon) ve yüzdeler **değişti** — ayrıntı SAPMA-027.
> **Ders D7'nin birebir tekrarı:** spec'in bir cümlesi hafızaya kopyalanmış,
> hafıza onu bir sonraki oturuma **kaynak gibi** sunmuştu; iki yer aynı şeyi
> söylediği için iddia doğrulanmış göründü. İkisi tek bir ölçülmemiş cümleydi.

> ⚠️ **DÜZELTME (Faz 1):** Faz 0 kaydının 9. başlığı `docs/PROMPT-KITAPCIGI.md`
> dosyasını `[YENİ]` olarak listeliyor. Dosya repoda **yok**, kasıtlı olarak repo
> dışında tutuluyor. Faz 0 kaydı append-only olduğu için değiştirilmedi; `README.md`
> ve belge haritasındaki atıflar Faz 1.10'da kaldırıldı.

> ⚠️ **DÜZELTME (Faz 1.6):** `docs/ADR/0004` §2'deki harf duyarlılığı iddiası
> ölçümle çürütüldü — ayrıntı SAPMA-005.

> ⚠️ **DÜZELTME (Faz 1.8):** Express 5 joker rota varsayımı kısmen yanlıştı —
> ayrıntı SAPMA-006.

> ⚠️ **DÜZELTME (Faz 2.0) — Faz 1 kaydı, commit sayısı çelişkisi.**
> Faz 1 kaydının başlığı *"`cb5adcd..1015854` (19 commit)"*, §3'ü ise
> *"86 dosya, +4732 / -77 satır, 18 commit"* diyor. İkisi de kendi ölçüm anında
> doğruydu, **birlikte tutarsız**:
> - `git rev-list --count cb5adcd..99499c9` → **18** · `git diff --shortstat cb5adcd 99499c9`
>   → **86 dosya, +4732 / −77**. §3 bu aralığı ölçmüş, yani faz kaydını yazan
>   commit'in bir öncesini — kendi commit'ini ölçemezdi.
> - `git rev-list --count cb5adcd..1015854` → **19** · diffstat **94 dosya, +5329 / −102**.
>
> **Fazın gerçek toplamı:** `cb5adcd..41d8543` → **20 commit, 94 dosya, +5329 / −102**
> (`41d8543` = PR numarasını işleyen commit; `a474c86` = birleştirme).
> Kayıt append-only olduğu için düzeltilmedi. Bu, `spec/11` §12.5'e Faz 2.0'da
> eklenen *"§7 rakamları faz kapanışında yeniden ölçülür"* kuralının doğduğu yer.

> ⚠️ **DÜZELTME (Faz 2.0) — Faz 1 kaydı §6/§7, kapsam rakamları.**
> Kayıt kapsamı *"satır %92,7 · ifade %91,8 · dal %82,7 · fonksiyon %85,7"* diye
> yazıyor ve `✅` işaretliyor. **Aynı ağaçta yeniden ölçüldü** (Faz 2.0, hiçbir kod
> değişmeden): satır **%75,55** · ifade **%76,28** · dal **%86,15** · fonksiyon
> **%73,68**. Kayıttaki rakamlar 1.8'de `apps/api/src/*` eklenmeden önceki ölçümden
> kopyalanmış; o dosyalar %0 kapsamla rapora girince tablo değişti ama kayıt
> güncellenmedi. `.tsx` uzantısı da desende olmadığı için (SAPMA-007) gerçek durum
> bundan da düşüktü → SORUN-001.

> ⚠️ **DÜZELTME (Faz 2.0) — ANLIK DURUM bayatlığı.**
> Bloğun Faz 1 kapanışındaki hâli *"PR #1 açık → develop"* diyordu; PR
> **2026-08-24T00:36:21Z'de merge edilmişti** (`gh pr view 1` → `MERGED`,
> birleştirme commit'i `a474c86`). Ayrıca "Son commit" alanı `1015854`'ü
> gösteriyordu, oysa ondan sonra iki commit daha gelmişti. Sebep SAPMA-004'ün
> kendisindeki delik: kural "her **alt görev** sonunda" diyor ve faz **kapanış**
> commit'leri alt görev sayılmıyor. Kural `spec/11` §12.1'de "ANLIK DURUM'u yazan
> commit fazın SON commit'i olmalı" ek maddesiyle kapatıldı.

> ℹ️ `docs/MASTER-SPEC.md` **donmuş arşivdir, otorite değildir.** Bölme öncesi
> hâlini korur; sonraki faz kararları orada yoktur.

---

## 🔴 AÇIK SORUNLAR KÜTÜĞÜ

| ID | Faz | Açıklama | Öncelik | Durum | Çözüldüğü faz |
|---|---|---|---|---|---|
| SORUN-001 | 2 | **Kapsam K10 eşiğinin altında.** `coverage.include` uzantı listesi düzeltilince (SAPMA-007) gerçek durum ortaya çıktı: satır **%69,72** · fonksiyon **%66,66** (eşik %70). İfade %70,68 ✅ ve dal %73,68 ✅ geçiyor. Yani `pnpm test:coverage` **kırmızı**. Bu yeni bir regresyon değil — 1.8'den beri var olan bir ihlal, rapor onu göremediği için görünmüyordu. Kalan açık **1 satır ve 1 fonksiyon**. | Yüksek | ✅ **Kapalı** — 2.0b'de DOM test ortamı (`jsdom` + RTL) kuruldu, `App.tsx` ve `main.tsx` test edildi. Sonuç: satır **%87,15** · ifade %87,06 · dal %86,84 · fonksiyon **%87,5**. **Eşik değiştirilmedi, hiçbir dosya dışlanmadı.** | **2 (2.0b)** |

---

## 🟡 TEKNİK BORÇ KÜTÜĞÜ

| ID | Faz | Borç | Neden ertelendi | Ödenmesi gereken faz |
|---|---|---|---|---|
| BORÇ-001 | 1 | `ioredis` 5.11.1'de tutuldu; 6.0.0 alınmadı | 6.0.0 kurulum anında 3 haftalıktı. Faz 16 (tur motoru) projenin en riskli fazı — orada "bu kütüphane regresyonu mu, benim idempotency mantığım mı?" sorusuyla uğraşmanın maliyeti günlerle ölçülür; ertelemenin maliyeti bir minor bump. | **16** — faz açılışında changelog okunup karar verilecek |
| BORÇ-006 | 2 | **Sentry kaynak haritası CI YÜKLEME adımı yapılmadı** (Karar 7). Faz 2'de yalnızca `release` adlandırması kuruldu (`SENTRY_RELEASE` env alanı, 2.5a) ve tarayıcı tarafında `sourcemap: true` gelecek (2.5b). Yüklenmiş kaynak haritası olmadan Sentry'deki yığın izleri **küçültülmüş** kalır. | Yükleme adımı CI'a Sentry auth token'ı, organizasyon/proje adı ve `sentry-cli` bağımlılığı getiriyor — üçü de ortada bir Sentry projesi **olmadan** yazılamaz ve bugün proje yok (`SENTRY_DSN` boş). Ayrıca yükleme, her derlemede dışarıya varlık gönderen bir CI adımıdır; dağıtım hattı Faz 50'de bütünsel ele alınıyor. Adlandırma bugün kurulduğu için yükleme sonradan **tek bir CI adımı** olarak eklenebilir; geriye dönük iş yok. | **50** — dağıtım hattı kurulurken |
| BORÇ-003 | 2 | **`ErrorBoundary` yedek arayüzündeki Türkçe metinler koda gömülü** (`apps/web/src/components/ErrorBoundary.tsx`: başlıklar, "Bu bölüm yüklenemedi…", "Tekrar dene", bildirim durumu). K5 arayüzde sabit Türkçe metni yasaklıyor. **⚠️ 2.8'DE KAPSAM GENİŞLEDİ:** `apps/web/src/components/dev/DebugPanel.tsx` de aynı sınıf metin taşıyor (sekme adları, üç boş sekmenin açıklaması, "Temizle", "Kapat"). **Ama önceliği DAHA DÜŞÜK ve bu bilinçli:** panel **dev-only** — üretim paketinde hiç yok (kaynak haritasıyla kanıtlandı), yani hiçbir kullanıcı o metinleri görmüyor. Faz 5'te `ErrorBoundary` çevrilirken panel **atlanabilir**; K5'in koruduğu şey kullanıcıya görünen yüzey. | i18n Faz 5'te geliyor; **BORÇ-005 ile aynı sınıf** (o sunucu hata gövdesi, bu tarayıcı yedek arayüzü). Sınırın çalışması için metin şart: i18n'i beklemek, Faz 5'e kadar çöken her ekranın **boş** kalması demekti. Metinler `TODO(Faz 5)` yorumlarıyla işaretlendi ve tek bileşende toplandı — Faz 5 işi bir dosyada `t()` çağrılarına çevirmeye iner. `title` zaten **prop**, yani çağrı yerleri hazır. | **5** — i18n kurulurken |
| BORÇ-005 | 2 | **Hata gövdesindeki Türkçe metinler koda gömülü** (`MESSAGE_BY_KIND`, `apps/api/src/common/filters/global-exception.filter.ts`). K5 arayüzde sabit Türkçe metni yasaklıyor. | i18n Faz 5'te geliyor; 2.6'nın BORÇ-003'üyle **aynı sınıf** borç. Metin `AppError.message`'tan alınamıyor çünkü o alan bilinçli olarak **geliştirici mesajı** (`errors.ts`: *"loga ve Sentry'ye gider, çevrilmez, kullanıcıya gösterilmesi hedeflenmez"*) — doğrudan gövdeye konsaydı iç ayrıntı sızardı. Tablo bir **yedek**: sözleşmenin aslı `code` + `context` ve ikisi de gövdede dönüyor, yani Faz 5 işi `t('errors:' + code, context)` yazmaya iner, fırlatma yerlerini gezmeye değil. Metinler bilerek **genel** tutuldu ki hataya özgü cümle `code` üzerinden gelsin. | **5** — i18n kurulurken tablo silinir, istemci `code`+`context`ten üretir |
| BORÇ-004 | 2 | **BullMQ'ya özgü `correlationId` kablolaması yapılmadı.** Taşınabilir zarf (`serializeLogContext`/`deserializeLogContext`) 2.3b'de kuruldu ve **gerçek bir süreç sınırında** test edildi (`spawnSync` + argv), ama `job.data.correlationId` alanına yazan/okuyan kuyruk tarafı yok. | `spec/09` §11.1 zincirinde *"Kuyruğa iş atılırsa `job.data.correlationId` taşınır → Worker aynı id ile loglar"* adımı var; ama **kuyruk henüz yok** — BullMQ Faz 16'da (tur motoru) kuruluyor. Bugün yazılacak kablolama, bağlanacağı üretici/tüketici olmadığı için ancak sahte bir kuyrukla test edilebilirdi ve o test **hiçbir şey kanıtlamazdı**: sahte kuyruk aynı süreçte kalır, ALS zaten oradan taşır (2.3b Karar 2). Zarfın kendisi — kırılabilecek asıl parça — bugün gerçek süreç sınırında sınandı; geriye kalan yalnızca BullMQ'nun kendi alanına bağlama işi. | **16** — kuyruk kurulurken üretici ve tüketici tarafına birlikte bağlanacak |
| BORÇ-007 | 3 | **Master World'ün veritabanı-rolü ikinci hattı KURULMADI.** Tip seviyesi zorlaması (K4) 3.3'te kuruldu ve kontrol deneyiyle kanıtlandı, ama `as unknown as`, ham SQL ve tip sistemini hiç görmeyen istemciler onu atlıyor. İkinci hat: uygulama rolüne yalnızca `GRANT SELECT`. | **Kısıtlanacak bir uygulama bağlantısı henüz YOK** — `apps/api` veritabanına Faz 12'de bağlanıyor. Bugün rol oluşturmak tüketicisi olmayan bir yapılandırma yazmak olurdu; SAPMA-017'nin reddettiği şey (*"kanıtlanamaz → işaretlenemez"*). **Ama mekanizma bugün ÖLÇÜLDÜ ve koşulabilir hâlde:** `packages/db/integration/master-readonly.itest.ts` gerçek PG18'de bir rol kurup ham SQL ile `INSERT`/`UPDATE`/`DELETE` deniyor → üçü de `permission denied`; sahip rol aynı tabloya yazabiliyor (karşı örnek, kısıtın role bağlı olduğunun kanıtı). Yani Faz 12 bunu yeniden keşfetmek zorunda değil, yalnızca `GRANT`/`REVOKE`'u bir migration'a yazacak. | **12** — `WorldView`/delta mimarisi kurulurken, `apps/api` bağlantısıyla birlikte |
| BORÇ-002 | 1 | `bullmq` 5.81.3'te tutuldu; 6.2.0 alınmadı | Aynı gerekçe (BORÇ-001). Ek olarak bullmq 6 `ioredis`'i peer'a taşıdı ve `pg`/`redis` peer'ları ekledi — kuyruk yapılandırmasını değiştiren bir mimari değişiklik, Faz 16'da bilinçli ele alınmalı. | **16** — faz açılışında changelog okunup karar verilecek |

---

## 🔵 SPESİFİKASYON SAPMALARI

> Spesifikasyondan veya yol haritasından sapılan her nokta. **Asla silinmez.**
>
> **`Tür` sütunu (Faz 2.0'da eklendi).** Kütükte iki farklı şey birikiyordu ve
> aynı sütunlarla yazılınca ayırt edilemiyorlardı:
>
> - **`karar`** — spesifikasyon bir şey söylüyordu, biz bilinçli olarak başka bir
>   şey yaptık. Tartışılabilir; koşullar değişirse geri alınabilir.
> - **`düzeltme`** — spesifikasyonun bir **iddiası ölçümle çürütüldü**. Tartışma
>   konusu değil; spec yanlıştı ve düzeltildi. Geri alınmaz.
>
> Ayrım pratikte işe yarıyor: bir `karar` satırı yeniden değerlendirilebilir,
> bir `düzeltme` satırı yeniden değerlendirilemez — yalnızca yeni bir ölçümle
> çürütülebilir. SAPMA-005 ve SAPMA-006 aslında hep bu ikinci sınıftaydı.
>
> Bu tablo **kütüktür, faz kaydı değildir** — append-only kısıtı faz kayıtlarına
> aittir. Sütun geriye dönük dolduruldu.
>
> **`Spec/ROADMAP güncellendi mi` sütunu (Faz 3.0'da genişletildi).** Sütunun ilk
> adı yalnızca **`Spec güncellendi mi`** idi ve bu, `docs/ROADMAP.md`'yi kütüğün
> görüş alanının **dışında** bırakıyordu. Bedeli iki kez ödendi:
>
> - **Günlük #60 (2.9):** SAPMA-012 ROADMAP'in **2.2a** maddesini güncelledi,
>   **2.9** maddesine dokunmadı. 2.9 oturumu çürütülmüş bir iddiayla karşılaştı
>   ve gerçeği yeniden ölçmek zorunda kaldı.
> - **Faz 3.0 denetimi:** SAPMA-001 (gizli nitelik 8 → 10) `docs/spec/02`'yi
>   güncellemişti ama ROADMAP **iki yerde** hâlâ "8 gizli" diyordu — Faz 4
>   madde listesi ve Faz 10 türetme listesi (sekiz nitelik **adıyla** sayılmış,
>   `adaptability` ve `temperament` yok). Faz 4 **sıradaki fazdı**: yanlış tablo
>   şemaya girecekti.
>
> Kural `docs/spec/11-project-memory.md` §12.4'e yazıldı. Özü: **kütüğe kayıt
> yeterli değil — sonraki oturum kütüğü değil, ROADMAP'i okuyup iş yapar.**

| ID | Tür | Faz | Sapma | Gerekçe | Spec/ROADMAP güncellendi mi |
|---|---|---|---|---|---|
| SAPMA-027 | `düzeltme` | 3 | `docs/spec/09-quality-protocol.md` §11.4 *"**`tools/` kapsam eşiğine dahil DEĞİLDİR.** `coverage.include` yalnızca `*/src/**` desenini alır; geliştirme araçları test edilir ama ürün kodu sayılmaz ve %70/%85 eşiklerine girmez"* diyordu. **İddia ölçümle çürütüldü:** `coverage.include` **üç** desen taşıyor ve üçüncüsü `tools` altındaki her paketin `src` ağacını topluyor — yani `tools/<paket>/src/**` paydaya **dahil**. `PROJECT_MEMORY.md`'nin 3.8 notu ⑥ de aynı yanlışı taşıyordu (*"seed.ts kapsamı düşürmez ve yükseltmez; 3.8 sonrası aynı kalmalı"*). | **İddia bugüne kadar HİÇ SINANMADI ve sebebi ölçüldü:** `tools/` altında `src/` içeren tek paket `data-cli` idi, tek dosyası `export {}`, kapsam raporundaki girdisi **vardı** ama `0/0`. Yani payda hiç büyümediği için kimse fark etmedi — **bakacak bir şey bulamayan bir kapı "temiz" diyordu, SAPMA-024'ün birebir kardeşi.** 3.8 `tools/data-cli/src/` altına ilk gerçek kodu koydu ve payda dört metrikte de büyüdü: **lines 879 → 945 (+66)** · **statements 955 → 1023 (+68)** · **functions 283 → 330 (+47)** · **branches 460 → 468 (+8)**. İddia doğru olsaydı hiçbiri değişmezdi. **Ayraç da yanlış öğrenilmişti:** `arch-check` ve `eslint-local-rules` `tools/` oldukları için değil, **`src/` altında olmadıkları ve `.mjs` oldukları için** dışarıdalar — kural, örneklerinin **tesadüfen paylaştığı** bir özellikten geriye okunmuş. Bu, 3.6'da adı konan tuzağın birebir tekrarı. **Sonuç bir kısıt değil bir sorumluluk:** `tools/<paket>/src/**` ürün kodu gibi sayılır, testsiz bırakılamaz. 3.8 bunu **kapsamı düşürmeden** karşıladı — dört metrik de YÜKSELDİ (fonksiyon %75,26 → **%78,48**), çünkü testler fonksiyonların **içine giriyor**; kapsanmayan tek dosya `seed.ts` (CLI kabuğu, 0/7 satır) ve o da D5 ile kanıtlanıyor. | ✅ **`docs/spec/09-quality-protocol.md` §11.4** (yanlış paragraf üstü çizili bırakıldı + ölçüm tablosu + ayracın neden yanlış öğrenildiği), `docs/ROADMAP.md` madde 3.8, `tools/data-cli/src/index.ts` başlığı. ⚠️ ROADMAP'in Faz 3 *"`packages/db` kapsamı KANIT sayılmaz"* notu **ayrı bir konu** ve dokunulmadı — o, kapsamın *anlamı* hakkında; bu, kapsamın *kapsamı* hakkında |
| SAPMA-026 | `karar` | 3 | **`spec/01` §3.1 nullability yazımı kendi içinde tutarsız; bir türetme kuralı yazıldı ve BEŞ sütun `nullable` yapıldı.** Belge nullability'yi açık bir işaretle yazıyor (`crestAssetId: text nullable`) ve işaretsiz sütunlar `NOT NULL` okunuyor. Ama aynı belge `stadiums.assetId`i **nullable**, `federations.assetId`i **işaretsiz** yazıyor — aynı sınıf iki alan, iki farklı yazım. 3.4'te `NOT NULL` okunmayan beş sütun: `countries.flag_asset_id` · `competitions.logo_asset_id` · `federations.asset_id` · `competitions.tier` · `federations.founded_year`. | **Üç ayrı gerekçe, tek karar değil.** ① **Varlık kimlikleri** (üç sütun): K9 gereği eksik bir varlık **prosedürel üretiliyor**, yani "varlık yok" gerçek ve beklenen bir durum — `DATA_MODE=clean` altında her ülke için uydurma bir kimlik yazmak gerekirdi. Spec'in kendi tutarsızlığı zaten bu yöne işaret ediyor. ② **`competitions.tier`**: kupanın ve kıta turnuvasının **kademesi yoktur**. `NOT NULL` olsaydı her kupaya uydurma bir `1` yazılırdı ve o değeri okuyan her sorgu yanlış cevap verirdi — `null` "uygulanamaz"ın tek dürüst gösterimi. ③ **`federations.founded_year`**: veri paketinde eksik olabilir; uydurulmuş bir yıl, eksik bir yıldan kötüdür. **Aynı ilke `source`un DEFAULT ALMAMASI kararıyla tutarlı:** kimsenin belirlemediği bir alana değer uydurmak, bilgi eksikliğini bilgi gibi gösterir. **Karşı argüman kaydedilir:** `NOT NULL` sorgu tarafını basitleştirir ve `null` denetimi unutulabilir; bedeli Faz 8 (ingest) ve Faz 11 (doğrulayıcı) tarafından üstlenilecek. | ✅ Gerekçe üç şema dosyasının başlığında/sütun yorumlarında. `docs/spec/01-database.md` **§3.1'in kendi metni DEĞİŞTİRİLMEDİ** — belge sütun taslağı, nullability'yi zaten eksik yazıyor; düzeltmek 11 tablonun tamamını gözden geçirmek olurdu (K12, 3.5/3.6'nın işi). Türetme kuralı **§3.1.2**'ye yazılmadı çünkü orası ölçülmüş kuralları tutuyor, bu bir okuma kararı — kaydı bu satır. **➕ EK (3.5, aynı kuralın İKİNCİ uygulaması — yeni SAPMA açılmadı çünkü ayrı bir karar değil):** beş sütun daha işaretsiz yazımdan ayrıldı. ① `clubs.founded_year` ve `stadiums.built_year` → `federations.founded_year` ile **aynı sınıf**, aynı gerekçe (③); farklı cevap vermek SAPMA-026'nın düzelttiği tutarsızlığı yeniden üretirdi. ② `stadiums.asset_id` → varlık kimliği (①), ayrıca `spec/12` §17.2 manifestinde stadyum fotoğrafı sayısı kulüp sayısından **az**. ③ **`clubs.competition_id` ve `clubs.stadium_id` → gerekçe MİLLİ TAKIM.** Aynı tablo `is_national` taşıyor ve ROADMAP Faz 41 milli takımları gerçek satırlar olarak kapsama alıyor (milli maçlar simüle ediliyor, oyuncu davetleri, büyük turnuvalar); bir milli takımın ne ligi ne sabit ev sahası vardır — `competitions.tier` gerekçesinin (②) birebir aynısı. `NOT NULL` yazılsaydı Faz 41 iki `ALTER … DROP NOT NULL` yazmak zorunda kalır, yani şemanın bugün yanlış olduğu ancak orada anlaşılırdı. **Kabul edilen bedel:** 118 gerçek kulüp için DB seviyesindeki zorunluluk kayboluyor; koşullu kural (*"`is_national = false` ise zorunlu"*) sütunla ifade edilemez → **Faz 11**, kayıt `docs/SPEC-COVERAGE-GAPS.md` **G-10**. `on delete: restrict` ikisinde de korundu — nullable olması §3.1.2 ③'ü değiştirmiyor. **3.5 EK'inin yazıldığı yerler:** ✅ `packages/db/src/schema/clubs.ts` ve `stadiums.ts` başlıkları · ✅ `docs/ROADMAP.md` Faz 3 madde 3.5 · ✅ `docs/SPEC-COVERAGE-GAPS.md` G-10 · ✅ `docs/schema/world.md` tablo satırları 4-8. `spec/01` §3.1'in sütun taslağı yine **DEĞİŞTİRİLMEDİ** (3.4'teki gerekçe aynen geçerli). **➕ EK (3.6, ÜÇÜNCÜ uygulama — yine yeni SAPMA açılmadı):** `club_kits.asset_id` **eklendi**; bu, öncekilerden farklı olarak bir nullability kararı değil, **var olmayan bir sütunun eklenmesi**. Gerekçe zinciri üç kaynaktan: `spec/12` §17.4 `kits.json`ın her formaya bir `image` yolu vermesi · §17.9'un **ilk kabul kriteri** (*"`DATA_MODE=full` … forma görselleri ekranda görünüyor"*, aynısı `CLAUDE.md` §16.3) · yine §17.4'ün iki durumu **ayırması** (*"Görsel yoksa `kit_templates` sisteminden üretilir"*). Sütun olmadan bu ayrım şemada **ifade edilemiyordu**: her satır "şablon + üç renk" der ve gerçek görselin yazılacağı yer kalmazdı. **Asıl gerekçe tutarlılık:** görsel taşıyan diğer BEŞ tablonun hepsi bu sütunu taşıyor (`clubs.crest_asset_id` · `stadiums.asset_id` · `competitions.logo_asset_id` · `countries.flag_asset_id` · `federations.asset_id`) — `club_kits`i dışarıda bırakmak SAPMA-026'nın **düzelttiği tutarsızlığın aynısını** yeni bir tabloda üretirdi. **Nullable, ① ile aynı gerekçe:** eksik görsel prosedürel üretiliyor (K9), yani "görsel yok" gerçek ve beklenen bir durum. **Elenen iki seçenek:** ① `asset_index`e FK — o tablo G-09 ile **Faz 7**'ye atandı, bugün olmayan tabloya FK yazılamaz ve Faz 3'ün kararı tüm varlık kimliklerini düz `text` bırakmak ② Faz 7/8'e erteleme — sonradan eklemek bir migration ve `down` demek, bugün bedava. **`template_id` NOT NULL KALDI:** K9 gereği prosedürel yedek her zaman kurulabilir olmalı; ikisi de nullable olsaydı hiçbir şeyi render edemeyen bir satır temsil edilebilir olurdu (negatif testle sabitlendi). **3.6 EK'inin yazıldığı yerler:** ✅ `packages/db/src/schema/club-kits.ts` başlığı · ✅ `docs/ROADMAP.md` madde 3.6 · ✅ `docs/schema/world.md` satır 10 |
| SAPMA-025 | `karar` | 3 | Postgres sürücüsü olarak **`postgres@3.4.9` (postgres.js)** seçildi, `pg` (node-postgres) **değil**. `CLAUDE.md` §2.1 sürücüyü hiç adlandırmıyordu; `spec/01` yalnızca "Drizzle ORM" diyor. | **İkisi de kuruldu ve gerçek PostgreSQL 18.6'ya karşı ölçüldü**, tahminle seçilmedi. Dört boyutta **birebir aynı** davrandılar: `bigint` → `string` (hassasiyet kaybı yok) · `numeric` → `string` · çok-ifadeli SQL çalışıyor · işlemsel DDL geri alınıyor. Davranış eşit olunca karar ölçülen tek gerçek farka düştü: **kurulan paket sayısı `pg` için 13, `postgres.js` için 1** (`node_modules/.pnpm` öncesi/sonrası karşılaştırılarak sayıldı — `pg` yanında `pg-types`, `pg-int8`, `pgpass`, `pg-protocol`, `pg-pool`, `pg-cloudflare`, `postgres-array/bytea/date/interval`, `xtend` getiriyor; ayrıca `@types/pg` ayrı bir paket, postgres.js kendi tiplerini taşıyor). CLAUDE.md §1.5 (public repo) ve §2.1'in *"lodash'in tamamı yasak, yalnızca gereken fonksiyon"* ilkesi aynı yöne işaret ediyor. **Karşı argüman dürüstçe kaydedilir:** `pg` NestJS ekosisteminde çok daha yaygın ve `apps/api`'nin DI yaşam döngüsüne bağlanması daha konvansiyoneldir. **Geri dönüş maliyeti bilinçli olarak düşük tutuldu:** koşucu `SqlExecutor` arayüzünü görüyor, sürücüyü değil — `pg`'ye dönmek `postgres-executor.ts`'i değiştirmek demek; koşucuya, testlere veya şemaya dokunulmaz. Bu, `jsdom` kararındaki asimetriden farkı: orada geri dönüş Faz 6'dan sonra pahalılaşıyordu, burada sabit kalıyor. | ✅ `packages/db/src/migrate/postgres-executor.ts` (gerekçe dosya başında), `docs/DEPENDENCY-WATCH.md`. `CLAUDE.md` §2.1'e **eklenmedi** — o tablo yığın kararlarını tutuyor ve sürücü `packages/db`nin iç detayı; arayüzün ardında olduğu için yığın kararı sayılmadı |
| SAPMA-024 | `düzeltme` | 3 | `pnpm format:check` **Markdown'a hiç bakmıyor** (`.prettierignore` → `*.md`), yani belge ağırlıklı bir alt görevde kapı **değişen hiçbir dosyayı denetlemeden** "temiz" diyor. Faz 1'den beri yazılan raporların bir kısmında `format ✅` satırı **boştu**. | **Kararın kendisi doğru ve bilinçliydi** — git geçmişinden ölçüldü: `*.md` satırı Faz 1'de, commit **`1bafb7e`** (2026-08-23) ile girdi ve gerekçesi hem commit mesajında hem dosyada yazılı (elle hizalanmış spec tabloları, kasıtlı satır sarmaları). **Çürütülen şey iddia değil, kapının kapsamı hakkındaki sessizlikti:** hiçbir yerde *"öyleyse `format ✅` bir belge değişikliği için hiçbir şey kanıtlamaz"* yazmıyordu. D3'ün yeni bir biçimi — denetleyici sağlam, **kapsamı** dar ve kapsam yazılı değil. **Ölçülen kapsam:** 168 izlenen dosyanın **125'i denetleniyor**, **31'i yok sayılıyor** (29'u `.md`), 12'sinin ayrıştırıcısı yok → %17'si kapı dışında. **Karar 3.2a'da yeniden değerlendirildi ve KORUNDU, gerekçe ölçüldü:** Markdown denetimi açılsaydı **29 dosyanın 29'u** değişirdi, **4.159 satır**. İkisi tek başına belirleyici — `PROJECT_MEMORY.md` **append-only kütük** (diff okunabilirliği bir kalite özelliği) ve `docs/MASTER-SPEC.md` **donmuş arşiv** (yeniden biçimlendirmek statüsünü ihlal eder). Çözüm kapıyı değil **raporlamayı** düzeltmek oldu. | ✅ `docs/spec/09-quality-protocol.md` §11.5 (yeni bölüm + kapsam tablosu + ölçüm), **`docs/OUTPUT-FORMAT.md`** (raporlama kuralı: kapı koştu ama bakacak bir şey bulamadıysa `✅` yazılmaz). ROADMAP'te format kapsamı iddiası **geçmiyor** (grep ile arandı) |
| SAPMA-023 | `karar` | 3 | `docs/spec/01-database.md` §3.1'in master tablolarında `key`, `source`, `externalIds` sütunları **yoktu**; `docs/spec/12-data-packs.md` §17.1/§17.3 üçünü de istiyor. Üçü Faz 3'te ekleniyor ve `key` benzersizliği **tablo başına** (`UNIQUE (key)`) karara bağlandı, global değil. | **Neden şimdi:** sonradan eklemek on bir tabloya `ALTER TABLE` + seed'in yeniden yazımı demekti; şema bu fazda yazılıyor. **Neden tablo başına — ölçüm:** `spec/12` §17.3'ün slug algoritması birebir çalıştırılıp ROADMAP Faz 8 kapsamındaki **76 gerçek ad** üzerinde denendi (6 ülke · 23 turnuva · 33 kulüp · 14 stadyum): tablo içi çakışma **0**, tablolar arası çakışma **0**. **Ama karar bu sayıdan değil anlamdan geliyor:** arama her zaman *"key'i X olan KULÜBÜ bul"* biçiminde; `explicit` stratejisi anahtarı zaten `data/clubs.json` dosyasına, yani varlık türüne kapsamlıyor. Global kısıt zararsız bir durumu (aynı adı taşıyan kulüp ve stadyum) yasaklar, karşılığında bir şey kazandırmaz. ⚠️ **Ölçüm çakışma bulamadı ama benzersizliğin KANITI değil** — örneklem 76, hedef ~240; algoritma kısa ve genel anahtarlar üretiyor (`AC Milan` → **`milan`**, `AS Roma` → **`roma`**, `Athletic Club` → **`athletic`**). `UNIQUE` kısıtı bu yüzden veritabanı seviyesinde: çakışma olursa ingest **patlar**, sessizce yanlış varlığa bağlanmaz. **Uydu tablolar `key` taşımıyor** (`club_facilities`, `club_finances_base`, `club_kits`, `rivalries`, `federations`, `kit_templates`) — kimlikleri sahiplerinin kimliği. `kit_templates` ayrıca pakette değil, oyunun kendi şablonu. `key` **`NOT NULL`**: `DATA_MODE=clean`'de prosedürel varlıklar da adreslenebilir olmak zorunda ve `SeededRng` deterministik anahtarı zaten mümkün kılıyor (K2). | ✅ **`docs/spec/01-database.md` §3.1.0 [YENİ]** (tam sözleşme + ölçüm), `docs/ROADMAP.md` Faz 3 tablo envanteri, `docs/schema/world.md` |
| SAPMA-022 | `düzeltme` | 3 | `docs/spec/12-data-packs.md` §17.3'teki `slugify` fonksiyonu, **kendi belgelediği üç örnekten ikisini tutturmuyor**. Ayrıca Türkçe harf değiştirmelerinin altısı **ölü kod**. | **Ölçüm:** fonksiyon birebir kopyalanıp çalıştırıldı. `Galatasaray S.K.` → **`galatasaraysk`** (spec: `galatasaray`) · `Beşiktaş JK` → **`besiktasjk`** (spec: `besiktas`) · `FC Bayern München` → `bayernmunchen` ✅. **İki ayrı sebep:** ① durak sözcük deseni `\b(…sk…)\b` kelime sınırı istiyor ama dizge `s.k.` biçiminde ve noktalar **bir sonraki adımda** siliniyor — eleme, noktalama temizliğinden **önce** çalışıyor ② `jk` durak sözcük listesinde **hiç yok**. **Ölü kod ölçümü:** `normalize('NFD')` + birleştirici işaret silme önce çalıştığı için `ş ğ ü ö ç İ` zaten `s g u o c I` oluyor; sonraki açık `.replace()`ler hiçbir şeyle eşleşmiyor. **Tek istisna `ı` (U+0131):** kanonik ayrışması yok, NFD'den sağ çıkıyor — listedeki yük taşıyan tek satır o. **Faz 3'te DÜZELTİLMEDİ, yalnızca ölçüm kaydedildi (K12):** algoritmanın tüketicisi Faz 7–9 ve durak sözcük listesi orada gerçek paket verisiyle kalibre edilecek; bugün elle düzeltmek sınanacak veri olmadan tahmin yazmak olurdu. | ✅ `docs/spec/12-data-packs.md` §17.3 (ölçüm tablosu + iki sebep + "Faz 7 açılışında ilk iş bu bloğu oku" notu). ROADMAP'te slug iddiası **geçmiyor** (grep ile arandı) |
| SAPMA-021 | `düzeltme` | 3 | `docs/ROADMAP.md` Faz 3 kapsamı **15** tablo sayıyordu ve `docs/spec/01-database.md` §3.1 ile çelişiyordu (bu kapsam için **11**); `PROJECT_MEMORY.md` Faz 2 kaydı §11 ise **"16 master tablo"** diyordu — **üç farklı sayı**. Envanter **11**'de mutabakata bağlandı. En sert kalem: **`competition_seasons` açılmıyor ve başka bir faza da taşınmıyor.** | `confederations` / `competition_rules` / `club_reputations` / `club_colors` → hepsi 1:1 **sütun**; ayrı tablo her sorguya JOIN ekler, hiçbir sorgu onlardan geçmez (K12). `club_finances_base` ROADMAP listesinde **eksikti**, eklendi. **`competition_seasons` — tüketici araması, tahmin değil ölçüm:** `spec/01` sezonu **skaler `seasonYear`** olarak taşıyor (`matches`, `card_counters`, `player_stats_history`) ve **puan durumunu saklamıyor, `matches`'tan türetiyor** · tek tarihsel master tablo `player_stats_history` ve o **oyuncu** istatistiği (Faz 10 nitelik türetimi girdisi), yarışma geçmişi değil · `spec/12` paket formatında tarihsel sezon dizisi **yok**, yalnızca `pack.json`'da `"season": 2026` · ROADMAP **Faz 8** tamamen güncel durum verisi, "sezon sezon performans geçmişi" **geçmiyor** · ROADMAP'te **"kulüp detay ekranı" hiç yok** · "kupa vitrini" **Faz 47** ve **menajere** ait (`manager_career`, Faz 4) · Faz 46 rollover adım 12 sezon istatistiklerini **oyun içinde** arşivliyor, paketten gelmiyor. **Sonuç:** master tarihsel sezon verisi v1'de hiçbir ekranın, spec'in veya fazın ihtiyacı değil. Ürün fikri olarak makul olduğu için `V2-BACKLOG`'a yazıldı. | ✅ `docs/ROADMAP.md` Faz 3 tablo envanteri (karar tablosu + tüketici arama tablosu), **`docs/spec/01-database.md` §3.1.1 [YENİ]** (*"sezon bir tablo değil, `seasonYear` sütunudur"*), `docs/schema/world.md` [YENİ], `docs/V2-BACKLOG.md` |
| SAPMA-020 | `düzeltme` | 3 | `docker-compose.yml` veritabanını `--locale=C` ile `initdb` ediyordu ve dosyadaki yorum bunu *"karşılaştırma davranışını sabitler"* diye savunuyordu. **İddia ölçümle çürütüldü:** `C` ctype Unicode büyük-küçük harf katlaması yapmıyor ve Türkçe metinde aramayı sessizce bozuyor. `--locale-provider=builtin --builtin-locale=C.UTF-8` ile değiştirildi. | **Ölçüm** (postgres:18): `--locale=C` altında `'BEŞİKTAŞ' ILIKE '%beşiktaş%'` → **`f`**, `lower('BEŞİKTAŞ')` → **`beŞİktaŞ`**. ASCII adlarda hata görünmüyor — yani "çalışıyor gibi duran" bir kapı; Faz 32'nin 50.000 oyuncu üzerindeki araması ve her ad araması bunun üstünde çalışacaktı. `builtin`/`C.UTF-8` ile aynı ölçüm: `t` ve `beşiktaş`. **Veritabanı varsayılanı bilinçli olarak Türkçe DEĞİL:** `tr-TR`'de `lower('I')` → `ı` (ölçüldü) ve bu kural İngilizce kulüp adlarına da uygulanır, "Inter" araması bozulurdu — Türkçe casing bir **sunum** kuralıdır. Sıralama sorgu başına `COLLATE "tr-TR-x-icu"` ile çözülüyor (veritabanı `C` olsa bile **871 ICU collation** kullanılabilir durumda, ölçüldü) ve `COLLATE`'li indeks `ORDER BY … LIMIT` için **Index Only Scan** veriyor (`EXPLAIN` ile doğrulandı) — tek veritabanı iki dilli arayüzü karşılıyor. **Elenen alternatif:** libc `C.UTF-8` (PG16'nın da yapabildiği); işlevsel olarak eşdeğer ama `datcollversion` **boş** geliyor, yani glibc yükseltmesi indeksleri **uyarı vermeden** geçersizleştirebilir. `builtin`de `datcollversion=1`. ⚠️ Dürüstlük notu: ICU collation'ları sürüm taşıyor (`153.128.46`), o yüzden ICU'yla kurulan **indeksler** hâlâ etkilenebilir — kazanç etki alanının veritabanı geneli yerine tek indekse daralması. | ✅ `docker-compose.yml` (ölçüm tablosu yorumda), `docs/DEPENDENCY-WATCH.md` (tam karşılaştırma tablosu). ROADMAP'te collation iddiası **geçmiyor** (grep ile arandı) |
| SAPMA-019 | `karar` | 3 | `postgres` Docker imajı **16 → 18**. `CLAUDE.md` §2.1, `docker-compose.yml`, `docs/ROADMAP.md` §0.1b ve §0.2, `README.md` "PostgreSQL 16" diyordu. | **Şema Faz 3'te yazılıyor, yani majör değişimi bugün bedava** — veri girdikten sonra `pg_upgrade`/dump-restore ister. 16 EOL Kas 2028, 18 EOL Kas 2030. Docker Hub `docker manifest inspect` ile yoklandı: 14–18 var, 19 yok; **18 dahil hepsinde `linux/arm64/v8`** (K14 ✅). Ölçülen sürüm 18.6. **EOL'den bağımsız ikinci gerekçe:** `builtin` locale sağlayıcısı PG17+ ve SAPMA-020'nin çözümü ona dayanıyor — PG16'da `initdb: error: unrecognized locale provider: builtin` (ölçüldü). **İki kırıcı değişiklik ölçüldü:** ① 18+ imajları veriyi majör sürüme özgü alt dizine koyuyor, bağlama noktası `/var/lib/postgresql/data` → **`/var/lib/postgresql`** (eski yolla konteyner exit 1 ve açık hata veriyor; `SHOW data_directory` → `/var/lib/postgresql/18/docker`) ② mevcut `pgdata` volume'ü `PG_VERSION=16` taşıyordu ve kullanılamaz, silindi. Yığın yeniden kurulup **çalıştırıldı** (D5): `fms-postgres Up (healthy)`, `psql -c 'SELECT 1'` healthcheck'i geçiyor, `pg_trgm` 1.6 mevcut. | ✅ `docker-compose.yml`, `CLAUDE.md` §2.1, **`docs/ROADMAP.md` §0.1b + §0.2**, `README.md`, `docs/DEPENDENCY-WATCH.md`. ⚠️ `CHANGELOG.md` ve ROADMAP Faz 1 maddeleri (1.7) **bilerek dokunulmadı** — tarihsel kayıt, o gün gerçekten 16'ydı. `docs/MASTER-SPEC.md` donmuş arşiv |
| SAPMA-018 | `karar` | 2 | **2.3b'nin "iş düşürülmez" kararının KAPSAMI daraltıldı (2.7).** `apps/web/src/lib/api.ts` sunucu farklı bir `correlationId` döndürdüğünde `logger.warn` basıp devam ediyordu; artık `assertInvariant` çağırıyor ve **geliştirme derlemesinde FIRLATIYOR**. | **Karar iptal edilmedi, kapsamı daraltıldı: üretim davranışı BAYT BAYT AYNI** — prod derlemesinde hâlâ `logger.warn` basıp devam ediyor (gerçek tarayıcıda ölçüldü: `API durumu = ok`, `zincir kapandı mı = HAYIR`). Değişen tek şey dev derlemesi. **Neden gerekliydi:** kabul kriteri 4 iki derlemeyi **koşarak** kanıtlamayı istiyor; çağrı yeri olmadan ağaç sarsma modülü paketten siler ve koşulacak davranış kalmaz. Elenen iki alternatif: (a) `App.tsx`'e ikinci bir kontrol koymak — `spec/09` §11.5'in açıkça yasakladığı şey (aynı değişmez iki yerde denetlenirse birinde gevşetilince sessizce ölür); (b) ürüne bir sonda koymak — üretime test kodu sızdırırdı. **Neden bu değişmez doğru aday:** kontrol zaten vardı ve gerçek bir değişmezi denetliyor; 2.3c bir alt görevi bu zincirin kapandığını kanıtlamaya harcadı, sessizce bozulursa çürür. `kind: dataProvider` seçildi (Karar 18): bu bir motor değişmezi değil, yukarı akış anomalisi. | ✅ `docs/ROADMAP.md` Faz 2 madde 2.7 + kabul kriteri 4, `apps/web/src/lib/api.ts` (gerekçe dosyada) |
| SAPMA-017 | `karar` | 2 | ROADMAP kabul kriteri 4 *"prod **build**'de loglayıp devam ediyor"* diyor; ayrım **yalnızca tarayıcıda** kuruldu. `apps/api`/`apps/worker` tarafına bayrak **eklenmedi**; orada varsayılan `throw` geçerli. | **Üç gerekçe.** ① **Tüketici yok (K12):** `apps/api`'de tek bir `assertInvariant` çağrı yeri yok; bayrak eklemek spekülatif yapılandırma olurdu. ② **Kanıtlanamaz → işaretlenemez:** çağrı yeri olmadan iki kip **koşularak ayırt edilemez**; yalnızca "bayrak okundu" loglanabilirdi ve bu kanıt değil. Bu projede sürekli kaçınılan şey tam olarak bu. ③ **Env ≠ build bayrağı:** `apps/api` düz `tsc` ile derleniyor, `define` yok; oradaki tek seçenek bir **çalışma zamanı** env değişkeni olurdu ve çalışma zamanında değiştirilebilen bir bayrak, derlemeye sabitlenmiş bir bayrağın garantisini vermez. **Varsayılanın `throw` olması bir eksiklik değil, doğru davranış:** `spec/09` §11.3 *"İhlal → tur geri alınır"* diyor. **YENİDEN DEĞERLENDİRME KOŞULU:** motor `assertInvariant` kullanmaya başladığında (Faz 16 tur motoru / Faz 22 maç motoru). O gün bayrak `LOG_FORMAT`'ın deseniyle **açık bir Zod enum'u** olarak gelir, `NODE_ENV`'den çıkarsanmaz. | ✅ `docs/ROADMAP.md` Faz 2 madde 2.7, `docs/spec/09-quality-protocol.md` §11.3 (yeni alt bölüm), `packages/shared/src/assert.ts` (gerekçe dosya başında) |
| SAPMA-016 | `karar` | 2 | `docs/spec/09` §11.2 `DebugTrace.input` alanını `Record<string, unknown>` olarak tanımlıyordu; **`ErrorContext`'e daraltıldı** (düz, JSON-güvenli ilkeller + sığ dizi). | **2.1'deki `AppError.context` daraltmasının doğal uzantısı ve birebir aynı gerekçe:** bu veri loglara ve Sentry'ye gidiyor. İç içe nesneye izin vermek "bütün varlığı ize koy" alışkanlığını mümkün kılar; dar tip izi üreten tarafı **alan seçmeye** zorlar. Aynı redaksiyon hattına giden iki tip tutarsız olmamalı — biri gevşek kalırsa gevşek olan kullanılır. **Elenen alternatif:** tipi geniş bırakıp düzleştirmede iç içe değerleri `[NESTED]` ile temizlemek. Sızıntıyı yine engellerdi ama korumayı **derleme zamanından çalışma zamanına** taşırdı: geliştirici bütün nesneyi koyar, düzleştirici sessizce temizler, kimse yanlış yaptığını fark etmez. **`output` bilinçli olarak serbest kaldı** — hesaplamanın asıl sonucu odur, daraltmak `DebugTrace<T>`'yi işe yaramaz kılardı; log hattına tek köprü `traceToLogContext()` ve o `output`'a hiç dokunmuyor, ikinci kilit tipte (`LogValue` nesne kabul etmiyor → derleme kırılır). | ✅ `docs/spec/09-quality-protocol.md` §11.2 (arayüz + gerekçe bloğu), `packages/shared/src/debug-trace.ts` (gerekçe dosya başında) |
| SAPMA-015 | `karar` | 2 | **GERİYE DÖNÜK KAYIT (2.3c'de açıldı, sapma 2.3a'da yapıldı).** ROADMAP Faz 2 madde 2.3a *"gelen `X-Correlation-Id` **dış girdidir**, Zod ile doğrulanır"* diyor; `correlation.middleware.ts` gerçekte `isAcceptableCorrelationId` **regex koruyucusunu** kullanıyor. Karar doğruydu ama **hiçbir kütüğe yazılmamıştı**. | **Kararın gerekçesi:** doğrulanan şey tek bir dizgenin **biçimi** — sabit uzunluk, sabit alfabe, enjeksiyon yok. Zod bunun için `z.string().regex(...)` üretirdi, yani aynı regex artı bir şema nesnesi. Buna karşılık `isAcceptableCorrelationId` **izomorfik kök girişte** duruyor ve tarayıcı da onu kullanabiliyor; Zod'lu bir sürüm kök barrel'a `zod` çekerdi — 2.1'de ölçülüp 2.2a'da düzeltilen sızıntının aynısı (2.3b Karar 9 aynı çatışmayı zarf için çözdü). CLAUDE.md §1.3'ün *"tüm dış girdiler Zod ile doğrulanır"* maddesi **gövde/sorgu/dosya** gibi **yapılandırılmış** girdiler için yazılmış; tek bir başlık dizgesinin biçim kontrolü o sınıfa girmiyor. **Kaydın geriye dönük açılma sebebi:** karar savunulabilir olsa da kayıtsız kalması kütüğün amacını zedeliyordu — bir sonraki oturum ROADMAP ile kodu karşılaştırdığında "burada bir hata mı var?" diye zaman harcardı. `spec/11` §12.4: sapma **tespit edildiği anda** kayda geçer, doğru olması onu muaf tutmaz. | ✅ `docs/ROADMAP.md` Faz 2 madde 2.3a (gerekçe eklendi), `packages/shared/src/correlation.ts` (gerekçe zaten dosyadaydı) |
| SAPMA-014 | `düzeltme` | 2 | Faz 1 hata #7'nin kuralı — *"test öncesi `pnpm build`, bayat dist yeşil yalanı üretir"* — **eksikmiş**: derlemek yetmiyor, çıktının **çalıştırılması** da gerekiyor. | Ölçüm (2.3a): `LOGGER` DI belirteci `app.module.ts`'te tanımlıydı, `correlation.middleware.ts` onu oradan alıyordu, `app.module.ts` de middleware'i import ediyordu — **dairesel bağımlılık**. Belirti yalnızca çalışma zamanında çıktı: `ReferenceError: Cannot access 'LOGGER' before initialization` (`__param(0, Inject(LOGGER))` satırında). **`typecheck` geçti** (döngü tip düzeyinde geçerli), **`lint` geçti**, **19 birim testi de geçti** — Vitest modül grafiğini farklı sırayla çözüyor. Dekoratörler bu sınıfı acımasız yapıyor: `@Inject(LOGGER)` modül gövdesi değerlendirilirken çalışıyor, "sonra çözülür" lüksü yok. Belirteç hiçbir şey import etmeyen `apps/api/src/common/tokens.ts`'e taşındı ve kural dosyanın başına yazıldı. | ✅ `apps/api/src/common/tokens.ts` [YENİ] (gerekçe dosyada), `docs/ROADMAP.md` Faz 2 madde 2.3a |
| SAPMA-013 | `karar` | 2 | Faz 2 planı redaksiyonu `@fms/shared/server` altına koyuyordu; **kökte kaldı**. Ayrıca `env.ts`'teki `process.stderr.write` doğrudan `logger.warn`a çevrilmedi — doğrulayıcı artık uyarıyı **döndürüyor** (`collectEnvWarnings`), basmıyor. | **Redaksiyon:** iki logger uygulaması da (pino ve tarayıcı) onu kullanmak zorunda. `server/`'a konsaydı tarayıcı kendi kopyasını yazardı ve iki kopya kaçınılmaz olarak ayrışırdı — `spec/09` §11.5'in "hiçbir kural iki yerde denetlenmez" disiplini. Ek gerekçe: pino'nun kendi `redact` seçeneği **tam yol** sözdizimi istiyor (`req.headers.authorization`), bizim kuralımız anahtar adında **alt dize** araması; pino'nun sözdizimi bunu ifade edemiyor. **Uyarı sırası:** `logger`'ın kendisi env'den doğuyor (`LOG_LEVEL`, `LOG_FORMAT`), yani `parseEnv` çalışırken logger henüz **yok**. K8'i sağlamanın tek yolu sırayı tersine çevirmekti: doğrulayıcı saf kalır ve teşhis döner, çağıran taraf logger'ı kurduktan sonra basar. Yan fayda: uyarı mantığı artık çıktı yakalamadan, düz assert ile test edilebiliyor. | ✅ `docs/ROADMAP.md` Faz 2 madde 2.2b, `packages/shared/src/redact.ts` ve `server/env.ts` (gerekçe dosyalarda) |
| SAPMA-012 | `düzeltme` | 2 | Faz 2 planındaki *"üç kat savunma: `apps/web` `types: []` → **derlenmez** · `arch:check` · bundle grep"* iddiası **ölçümle çürütüldü**. `types: []` alt yol sınırını korumuyor; `sideEffects: false` de sızıntıyı engellemiyor. | Kontrol deneyi (2.2a): `App.tsx`'e `@fms/shared/server` importu konup **gerçekten çağrıldı**. `typecheck` **GEÇTİ** — çünkü `types: []` Node *globallerini* yasaklar, oysa `loadEnv(): Env` imzasında Node tipi yok ve üretilen `.d.ts` tarayıcı tsconfig'iyle sorunsuz derleniyor. `vite build` **BAŞARILI**; paket **229.320 → 299.370 bayt** (+%30); tarayıcı paketinde `zod` **318**, `DATABASE_URL` **7**, `POSTGRES_PASSWORD` **3**, `JWT_SECRET` **2** eşleşme — `sideEffects: false` AÇIKKEN (ağaç sarsma yalnızca *kullanılmayan* kodu siler). **Yalnızca `arch:check` yakaladı.** Yani gerçekte dört değil **iki** çalışan hat var: `arch:check` önler, paket taraması doğrular. Karar 1'in gerekçesi ("`sideEffects: false` bir paketleyici optimizasyonudur, yapısal sınır değildir") rakamla doğrulanmış oldu. Ek ölçüm: import'u yazıp **kullanmayınca** paket bayt bayt aynı kaldı — kullanılmayan kontrol deneyi yanlış güven üretiyor. | ✅ `docs/spec/09-quality-protocol.md` §11.5b (yeni bölüm + ölçüm tablosu), `docs/ROADMAP.md` Faz 2 madde 2.2a |
| SAPMA-011 | `düzeltme` | 2 | Turborepo `build` görevinin çıktısını (`dist/**`) önbelleğe alıyor ve önbellek isabetinde **silinmiş çıktıyı geri yüklüyor**. Bir kaynak dosya taşındığında `dist/` içinde öksüz modül kalıyor; `tsc` çıktıyı üzerine yazar ama silmez. | İki ölçüm. **(a)** `packages/shared/src/env.ts` → `src/server/env.ts` taşındı; `rm -rf dist && pnpm build` sonrası `dist/env.js` **yine oradaydı**. Aynı ağaçta `tsc` doğrudan çalıştırılınca dist temiz çıktı — üreten derleyici değil, `>>> FULL TURBO` önbellek isabetiydi. **(b)** Daha kötüsü: 2.2a kontrol deneyinin kirli paketi (`index-DV5Sgexl.js`, 299 kB, içinde `JWT_SECRET`) import geri alındıktan sonra temiz paketin (`index-rtVlQQVC.js`, 229 kB) **yanında** kaldı; turbo önbellekten temizi geri yükledi ama kirliyi silmedi. Sızıntı taraması ikisini birden okuyup hâlâ `JWT_SECRET` buldu — **kanıtın kendisi bozuldu.** `apps/web` ilk başta muaf tutulmuştu ("Vite `outDir`'i zaten boşaltıyor"); doğru ama önbellek isabetinde **Vite hiç çalışmıyor**. Faz 1 hata #7'nin ("bayat dist yeşil yalanı üretir") önbellek kaynaklı akrabası. | ✅ `scripts/clean-dist.mjs` [YENİ] sekiz paketin `build` betiğine bağlandı, `docs/spec/09` §11.5b uyarısı |
| SAPMA-010 | `karar` | 2 | Yol haritası 2.1'de hata sınıflarının `httpStatus` alanı taşımasını istiyordu; alan **konulmadı**. Kullanıcıya gösterilecek Türkçe mesaj da sınıfta üretilmiyor — sözleşme `code` + `context`. | **`httpStatus`:** HTTP bir taşıma katmanı kaygısı. `packages/engine` bu sınıfları kullanıyor ve motor HTTP bilmiyor; aynı hata kuyruğa, SSE'ye veya CLI'a da gidebilir, oralarda durum kodunun anlamı yok. Eşleme 2.4'teki exception filter'a taşındı. "Ayrı tablo unutulur, sürüklenir" itirazı tip seviyesinde kapatıldı: filter `Record<ErrorKind, number>` tutacak, yani yeni bir `ErrorKind` eklenip eşlemeye yazılmazsa **derleme kırılır**. **Mesaj:** K1.3 (eyleme dönüştürülebilir Türkçe) ile K5 (arayüzde sabit Türkçe yasak) i18n gelmeden ancak `code` + `context` üzerinden uzlaşıyor. `code` zaten i18n anahtarı biçiminde (`alan.olay`), böylece Faz 5 bir **eşleme tablosu** yazmaya iner; yüzlerce fırlatma yerini gezip dizgi sökmeye değil (`spec/11` §12.6'daki "3 faz kayıp" uyarısı tam olarak bu maliyeti anlatıyor). `message` geliştirici içindir, çevrilmez. | ✅ `docs/ROADMAP.md` Faz 2 madde 2.1 ve 2.4, `packages/shared/src/errors.ts` (gerekçe dosya başında) |
| SAPMA-009 | `düzeltme` | 2 | Faz 2.0'da `docs/spec/09` §11.4'e yazılan *"desen `{ts,tsx,mts,cts}` biçiminde yazılır"* tavsiyesi **araç bağımlıdır ve tsconfig için YANLIŞTIR**. TypeScript'in `include`/`exclude` glob dili süslü parantez genişletmesini desteklemez. | Ölçüm: yedi `tsconfig.build.json`'ın `exclude` deseni `"src/**/*.test.{ts,tsx,mts,cts}"` yapıldı. Hiçbir araç şikâyet etmedi, `typecheck` ve `lint` yeşil kaldı, ama desen **hiçbir dosyayla eşleşmediği** için `pnpm build` sonrası yedi paketin testleri de `dist/`e emit edildi (`apps/api/dist/health.controller.test.js`, `packages/shared/dist/base-path.test.d.ts` …). Uzantılar tek tek yazılınca `dist/` temizlendi. Vitest/ESLint/Prettier süslü parantezi tanır, tsconfig tanımaz — **aynı repoda iki glob lehçesi var.** Faz 1 hata #7'nin kuralı ("test öncesi `pnpm build`") bunu yakaladı; `typecheck`/`lint`/`test` üçü de göremezdi. | ✅ `docs/spec/09-quality-protocol.md` §11.4 (yeni alt bölüm + doğrulama yöntemi), `packages/ui/tsconfig.build.json` (ölçüm yorumda) |
| SAPMA-008 | `düzeltme` | 2 | `docs/spec/` bir şey isteyip `docs/ROADMAP.md`'nin hiçbir faza atamadığı **altı madde** tarama ile bulundu: `perf:budget` kapısı (G-01), Playwright kurulumu (G-02), `testcontainers` (G-03), `k6` (G-04), görsel regresyon (G-05), Sentry kotası izleme (G-06). | Bu sınıftan boşluk daha önce **iki kez** tesadüfen yakalanmıştı: Faz 1'de `arch:check` (spec her faz kapanışında çalıştırılmasını istiyordu ama kimse kurmuyordu, Ç3), Faz 2.0'da Sentry kota uyarısı. İki tesadüf desendir. Tek tek yakalamak yerine `spec/09` §11.4/§11.5 ve `spec/10` §13.5 satır satır ROADMAP'te arandı. En sert bulgu G-02: `pnpm test:e2e` spec'te "Faz 17+" derken Playwright kurulumu ROADMAP'te ilk kez **Faz 50**'de geçiyordu — 33 faz gecikme. | ✅ `docs/SPEC-COVERAGE-GAPS.md` [YENİ], `docs/ROADMAP.md` Faz 3/6/17/47/49/50 |
| SAPMA-007 | `düzeltme` | 2 | `docs/spec/09` §11.4'ün *"`coverage.include` açıkça tanımlanmazsa eşikler anlamsızlaşır"* uyarısı **eksikti**: `include` yazılmış olsa bile **uzantı listesi** dar kalırsa eşik yine sessizce yalan söylüyor. | Ölçüm: desen `*.ts` iken `coverage-summary.json` 13 dosya sayıyordu, diskte 15 vardı — `apps/web/src/App.tsx` ve `main.tsx` rapora hiç girmiyordu. Desen `*.{ts,tsx,mts,cts}` yapılınca ikisi de girdi ve global kapsam **%75,55 → %62,38** düştü (satır). Yani kapı düzeltilmeden önce 13 puanlık bir yalan taşıyordu ve bu Faz 6'da yüzlerce bileşenle çığ olurdu. Tuzağın iki katmanı var: `include`'un varlığı (Faz 1'de çözüldü) ve kapsamı (burada çözüldü). | ✅ `docs/spec/09-quality-protocol.md` §11.4, `vitest.config.ts` (ölçüm yorumda) |
| SAPMA-006 | `düzeltme` | 1 | *"Express 5 joker rota sözdizimi katılaştı; `/*` geçersiz"* varsayımı **kısmen yanlış** çıktı: NestJS 11'de eski sözdizimi uygulamayı çökertmiyor. | Ölçüm: `@Get('echo/*')` ile uygulama **başarıyla açıldı**. `LegacyRouteConverter` devreye girip `WARN Unsupported route path ... Attempting to auto-convert to "{*path}"` basıyor ve rotayı otomatik çeviriyor. Tuzak "patlayan" değil "sessizce dönüştürülen" cinsten — log okunmazsa fark edilmez ve dönüştürülmüş desen niyetten sapabilir. Doğru sözdizimi (`*splat`) elle yazılır, otomatik dönüştürücüye güvenilmez. | ✅ `apps/api/src/health.controller.ts` (ölçüm yorumda), `docs/ROADMAP.md` Faz 1 madde 1.8 |
| SAPMA-005 | `düzeltme` | 1 | `docs/ADR/0004` §2'deki *"`forceConsistentCasingInFileNames` tek ve tutarlı ama yanlış harfli bir yazımı yakalamaz"* iddiası **ölçümle çürütüldü**. Gerçek boşluk yalnızca `.mjs`/`.js` dosyalarında. | `packages/shared/src/CasingProbe.ts` oluşturulup `./casingprobe.js` diye import edildi: `tsc` **TS1149** ile yakaladı (`include: ["src/**/*"]` gerçek dosyayı zaten programa aldığı için yanlış import ikinci bir yazım üretiyor). Aynı deney `.mjs` ile tekrarlandı: `typecheck` göremedi, Node çalıştırdı, yalnızca `arch:check` yakaladı. `arch:check` kuralı birincil değil **tamamlayıcı** savunma olarak konumlandırıldı. | ✅ `docs/ADR/0004` §2 (ölçüm tablosu + üç hatlı model), `docs/ROADMAP.md` Faz 1 madde 1.6 |
| SAPMA-004 | `karar` | 1 | `PROJECT_MEMORY.md` ANLIK DURUM bloğunun güncelleme sıklığı **faz başınadan alt görev başına** çekildi. Tam faz kaydı (11 başlık) ve kütükler değişmedi. | Bloğun tek amacı oturum kurtarma; kurtarmaya ihtiyaç duyulan an tam olarak faz ortası. On alt görevlik bir fazda blok yalnızca sonda yazılırsa, faz ortasında kopan oturum yapılan işi göremez — nitekim 1.4 sonunda dosya kendi içinde çelişiyordu (blok "Faz 0, 0 teknik borç" derken kütükte iki BORÇ kayıtlıydı). | ✅ `docs/spec/11-project-memory.md` §12.1/§12.3, `CLAUDE.md` K15, `docs/SESSION-TEMPLATE.md`, `docs/OUTPUT-FORMAT.md` |
| SAPMA-003 | `karar` | 1 | Teknoloji yığını sürümleri (`CLAUDE.md` §2.1) 2024 bilgisiyle kilitlenmişti; 2026-08-23'te npm registry doğrulamasıyla bugüne çekildi. TypeScript bilinçli olarak en yeni majöre (7.0.2) **çıkarılmadı**, `~6.0.3` ile pinlendi. `ioredis`/`bullmq` taze majörleri alınmadı (BORÇ-001, BORÇ-002). | TS 7.0 programatik derleyici API'si olmadan yayınlandı — kanıt: `typescript-eslint` peer aralığı `>=4.8.4 <6.1.0` ve `nest build`'in `createProgram()` çağrısı. `^6.0.3` yazılırsa pnpm 6.1.0'a çıkıp peer aralığının dışına taşar, bu yüzden `~`. TS 7.1 (programatik API) sonrası yeniden değerlendirilecek. | ✅ `CLAUDE.md` §2.1, `docs/ADR/0003-typescript-surum-kilidi.md`, `docs/spec/09-quality-protocol.md` §11.4 |
| SAPMA-002 | `karar` | Spec yazımı | Veri modeli "prosedürel birincil" → "gerçek birincil" (`DATA_MODE=full` varsayılan). KVKK/GDPR zorunludan koşullu hale geldi (`SERVER_MODE=public` ise). | Proje herkese açık yayınlanmayacak, kişisel kurulum. Sunucu Özel modda açılır, yalnızca izin listesi oynar. Gerçek veri estetik kalite için gerekli. | ✅ `CLAUDE.md` K9, `docs/spec/12-data-packs.md`, ROADMAP Faz 8/9/13 |
| SAPMA-001 | `karar` | Spec yazımı | Gizli nitelik sayısı 8 → 10 (`adaptability`, `temperament` eklendi) | Faz 34'teki yabancı lig uyum süreci ve Faz 44'teki diyalog tepki sistemi bu ikisi olmadan kurulamıyordu | ✅ `docs/spec/02-attributes.md` Bölüm 4.1 · ⚠️ **ROADMAP Faz 3.0'a kadar GÜNCELLENMEMİŞTİ** — Faz 4 (`player_hidden_attributes` (8 gizli)) ve Faz 10 (sekiz nitelik adıyla sayılmış) çürütülmüş iddiayı taşıyordu. **3.0'da düzeltildi:** `docs/ROADMAP.md` Faz 4 + Faz 10. Bu satır sütunun genişletilme sebebidir. |

---

## 🧪 FAZ 3 — ÇALIŞMA GÜNLÜĞÜ

> **Kalıcı yapı, geçici içerik.** Kurallar: `docs/spec/11-project-memory.md` §12.2.
> Faz süresince karşılaşılan hatalar buraya **anında** yazılır; faz kapanışında
> faz kaydının §5 tablosuna işlenir, tablo **boşaltılır ama başlık kalır**.
>
> **En yeni satır en üstte.**

| # | Alt görev | Hata (belirti) | Kök neden | Çözüm | Tekrar önleme |
|---|---|---|---|---|---|

> **Faz 3 kapanışında boşaltıldı (2026-08-29).** Tablo **46 satır** taşıyordu
> (#1…#46, ölçüldü — elle sayılmadı) ve hepsi faz kaydının **§5** tablosuna
> **desen bazlı gruplanarak** işlendi: devralınan beş sınıf (**D1, D2, D3, D5,
> D6** — D4 bu fazda **hiç geçmedi** ve bu da yazıldı), bu fazda doğan **D7**,
> Faz 3’e özgü beş yeni sınıf (**F1…F5**) ve **on tekil hata**. Ham satırlar
> bilerek taşınmadı — 46 satırlık bir liste sonraki faza *desen* değil *yük*
> devrederdi (Faz 2 kapanışının emsali).
>
> **§5’teki D1’in ikinci örneği bu tabloda hiç yer almadı:** 3.10’un kendi
> yazımı sırasında oldu (kapsam yüzdeleri ve soğuk build süresi ROADMAP’e
> ölçülmeden yazıldı, ölçüm sonrası düzeltildi) ve günlük aynı alt görevde
> boşaltıldığı için doğrudan faz kaydına yazıldı — Faz 2’nin #60’ıyla aynı
> durum.
>
> Başlık kalıyor (`docs/spec/11-project-memory.md` §12.2): aksi hâlde her faz
> aynı ihtiyacı yeniden keşfeder ve bölümü yeniden icat eder.
> **Faz 4 açılışında başlık `🧪 FAZ 4 — ÇALIŞMA GÜNLÜĞÜ` olarak güncellenir.**

---

<details>
<summary>Faz 2 günlüğünün kapanış notu (arşiv)</summary>

> Faz süresince karşılaşılan hatalar buraya **anında** yazılır; 2.9'da faz
> kaydının §5 tablosuna işlenir, tablo **boşaltılır ama başlık kalır**.
>
> **Neden var:** protokol "karşılaştığın her hatayı ANINDA not al — faz kaydına
> gireceksin" diyor ama hafıza sisteminde bunun için bir yer yoktu. ANLIK DURUM
> her alt görevde tamamen yeniden yazıldığı için oraya not düşmek işe yaramıyor;
> not bir sonraki alt görevde siliniyor. Faz 1'in on beş satırlık hata tablosu
> muhtemelen sondan geriye hatırlanarak yazıldı.
>
> **En yeni satır en üstte.**

| # | Alt görev | Hata (belirti) | Kök neden | Çözüm | Tekrar önleme |
|---|---|---|---|---|---|

> **Faz 2 kapanışında boşaltıldı (2026-08-26).** Tablo **59 satır** taşıyordu
> (#1…#59, ölçüldü — elle sayılmadı) ve hepsi faz kaydının **§5** tablosuna
> **desen bazlı gruplanarak** işlendi: altı tekrar eden sınıf (D1…D6) ve yedi
> tekil hata. Ham satırlar bilerek taşınmadı — 59 satırlık bir liste sonraki
> faza *desen* değil *yük* devrederdi.
>
> §5'teki **#60** bu tabloda hiç yer almadı: 2.9'un kendi ölçümü sırasında
> bulundu (ROADMAP'in 2.9 maddesi SAPMA-012 ile çelişiyordu) ve günlük aynı
> alt görevde boşaltıldığı için doğrudan faz kaydına yazıldı.
>
> Başlık kalıyor (`docs/spec/11-project-memory.md` §12.2): aksi hâlde her faz
> aynı ihtiyacı yeniden keşfeder ve bölümü yeniden icat eder.
> **Faz 3 açılışında başlık `🧪 FAZ 3 — ÇALIŞMA GÜNLÜĞÜ` olarak güncellenir.**

✅ Başlık 3.0'da güncellendi, tablo Faz 3 satırlarıyla yeniden açıldı.

</details>

---

# 📋 FAZ KAYITLARI

### FAZ 3 — Veritabanı Şeması I: Dünya Çekirdeği

**Tarih:** 2026-08-26 → 2026-08-29 · **Süre:** 4 gün · **Durum:** ✅ Tamamlandı
**Dal:** `feature/faz-03-database` · **PR:** [#4](https://github.com/fxrkqnplus/football-management-simulator/pull/4) · **Commit aralığı:** `ec268d4..4a0eb43` (25 commit)

---

#### 1. Fazın Konusu

Oyun dünyasının değişmez (immutable) çekirdeği: ülke, federasyon, yarışma, kulüp,
stadyum, forma ve hakem tablolarının master şeması. Faz 4'ten Faz 46'ya kadar her
faz bu tabloların üzerine yazacak, o yüzden **şemadan önce şemanın disiplini**
kuruldu: migration koşucusu, `up`/`down` round-trip kanıtı, kayıp ölçümü, K4'ün
tip seviyesinde zorlanması ve gerçek Postgres'e karşı bir entegrasyon test
katmanı (`testcontainers`, G-03).

Bu sırada gelmesinin sebebi bir bağımlılık zinciri: Faz 4 oyuncu/sözleşme
tablolarını buraya bağlıyor, Faz 7–9 veri ingestini buraya yazıyor, Faz 12
Master/Delta mimarisini buradan türetiyor. Şema yanlış kurulsaydı düzeltmenin
maliyeti her fazda katlanarak artardı.

#### 2. Yapılması Planlananlar

ROADMAP'teki kapsam maddeleri:

- [x] Drizzle şema tanımları + migration altyapısı
- [x] **11 tablo** (`countries`, `federations`, `competitions`, `clubs`,
      `club_facilities`, `club_finances_base`, `stadiums`, `rivalries`,
      `kit_templates`, `club_kits`, `referees`) — ⚠️ ROADMAP **15** yazıyordu,
      sayı 3.1'de mutabakata bağlandı (SAPMA-021)
- [x] Master/Delta ayrımı temeli — master tablolara yazma **tip seviyesinde
      derlenmiyor** (K4)
- [x] İndeksler — ⚠️ plan **üç** sayıyordu, **dört** yapıldı (§4)
- [x] Seed betiği — ⚠️ plan **"iskelet"** diyordu, **çalışan** bir seed yazıldı (§4)
- [x] ER diyagramı → `docs/schema/world.md` (mermaid) — ⚠️ plan bir diyagram
      istiyordu, **üretilen ve nöbetçili** bir diyagram yapıldı (§4)
- [x] Entegrasyon test katmanı: Vitest + `testcontainers` (G-03), ARM64 uyumu
      kurulumda doğrulandı (K14)

**Yapılmayan yok.** Kapsamın dışına çıkarılan dört madde §3'te, gerekçeleriyle.

#### 3. Gerçekte Yapılanlar

- **Eklenen:**
  - `packages/db/src/migrate/` — journal (Zod'lu), planlama, **kayıp ölçümü**
    (`loss.ts`), `SqlExecutor` arayüzü, `postgres.js` uygulaması, dosya kaynağı.
    Takip tablosu **kendi şemasında** (`fms_meta.migrations`).
  - `packages/db/src/schema-state/` — derin introspection, saf karşılaştırıcı
    (`comparedFacts` sayacıyla), drizzle snapshot ayrıştırıcısı ve **3.10'da**
    ER diyagramı üreticisi (`er-diagram.ts`).
  - `packages/db/src/client/` — görünmez marka (`unique symbol`), `MasterDb`
    (yazma metotları **tipte yok**), `WritableDb` (master tablo → parametre
    `never`).
  - `packages/db/src/schema/` — 11 tablo + `data-pack-columns.ts` (§3.1.0
    sözleşmesi tek yerde) + `competition-rules.ts` (Zod) + `search.ts`
    (`immutable_unaccent` ve indeks ifadesi) + **`fk-policy.ts`** (3.9: `ON
    DELETE` bir liste değil bir **kural**).
  - `packages/db/drizzle/` — beş migration, **beşinin de elle yazılmış `down`u**:
    `0000_countries_initial` · `0001_geography_institutions` · `0002_club_core` ·
    `0003_visual_assets_referees` · `0004_search_indexes`.
  - `packages/db/integration/` — 8 dosya, **163 test**, gerçek PG 18.6.
  - `tools/data-cli/src/seed.ts` + `tools/data-cli/integration/` — 6 ülke +
    11 yarışma, deterministik ve idempotent.
  - `pnpm test:db` komutu (`vitest.integration.config.ts`, iki proje) ve CI'da
    ayrı `Entegrasyon` işi (**amd64 + arm64**).
  - `docs/schema/world.md` (371 satır, diyagram 176 satır) · `docs/reports/`
    arşivi (3.10).
- **Değiştirilen:**
  - `docs/spec/01-database.md` — **§3.0** (migration disiplini), **§3.1.0**
    (`key`/`source`/`externalIds` sözleşmesi), **§3.1.2** (şema yazım kuralları,
    **on madde**), **§3.4.1** (K4 sözleşmesi). Faz 4 şemayı buradan okuyacak.
  - `docs/spec/09-quality-protocol.md` — §11.4 desen envanterine 3 satır
    (`.test-d.ts`, `drizzle.config.ts` globu, çok projeli `test:db`), §11.5'e
    mutasyon serisi ve **3.10'da iki yeni yöntem kuralı**.
  - `docker-compose.yml` — Postgres 16 → 18, `--locale=C` → `builtin`/`C.UTF-8`.
  - `packages/db/tsconfig.json` — `rootDir` emit eden yapılandırmaya taşındı.
  - `tools/arch-check` — dokuzuncu kural (`master-table-marking`) + kanaryası.
  - `docs/OUTPUT-FORMAT.md`, `CLAUDE.md`, `README.md`, `docs/SESSION-TEMPLATE.md`
    — rapor arşivi kuralı **dört yere birden** (3.10).
- **Silinen:** ESLint'in `allowDefaultProject` istisnası (`drizzle.config.ts`
  için yazılmıştı; asıl sebebi `rootDir` olduğu anlaşılınca **geri alındı** —
  geçici çözüm sebebi gizliyordu, günlük #11).

#### 4. Plandan Sapmalar

> ⚠️ **Planı AŞAN bir iş de sapmadır.** Aşağıdaki ilk üç satır "eksik yapıldı"
> değil "fazla yapıldı" — ikisi de plandan sapmadır ve ikisi de yazılır, yoksa
> bir sonraki faz planı gerçek sanır.

| Ne | Plan | Yapılan | Gerekçe |
|---|---|---|---|
| Seed betiği | *"Seed betiği **iskeleti**"* | **Çalışan** seed: 6 ülke + 11 yarışma, gerçek PG18'e yazıyor, deterministik (K2) ve idempotent (`DO UPDATE`), üç yerde birden kanıtlı | Kabul kriteri 2 *"seed **başarılı**"* diyordu; bir iskelet o kriteri kapatamazdı. İki madde çelişiyordu, kriter kazandı |
| İndeksler | **Üç** (`clubs(competition_id)`, `competitions(country_id)`, `pg_trgm` GIN) | **Dört** — `rivalries_pair_unique_idx` eklendi | `LEAST/GREATEST` ifade indeksi 3.5'te Faz 11'e bırakılan teklik korumasını **bedelsiz** çözdü: koruma tam, ingest'e sözleşme dayatmıyor. G-11 daraldı, kalan tek delik `(A,A)` |
| ER diyagramı | *"ER diyagramı → `docs/schema/world.md` (mermaid)"* | **Üretilen** diyagram + nöbetçi testi + saf üretici modül | 3.1'de verilmiş bir söz (dosyanın kendi başlığında yazılı) ve 3.9'un bulgusunun sonucu: elle çizilmiş bir mermaid şemanın **üçüncü** temsili olurdu ve üçüncüsünü hiçbir şey denetlemez |
| Tablo sayısı | ROADMAP **15**, Faz 2 kaydı **16** | **11** | `spec/01` §3.1 bu kapsam için 11 tanımlıyor; dört tablo 1:1 sütuna indi, `competition_seasons`ın **hiçbir tüketicisi bulunamadı** (SAPMA-021, ölçüm tablosu ROADMAP'te) |
| PostgreSQL | **16** | **18.6** | Şema bu fazda yazılıyor, yani majör değişimi **bugün bedava**; 18 iki yıl daha destekleniyor (SAPMA-019) |
| Collation | `initdb --locale=C` | `builtin` / `C.UTF-8` | `C` ctype Türkçe `ILIKE`'ı **sessizce bozuyordu** — dosyadaki yorumun iddiası ölçümle çürütüldü (SAPMA-020) |
| `is_master` sütunu | ROADMAP bunu istiyordu | **Yapılmadı** — koruma tip seviyesinde | Hiçbir şeyin tüketmediği bir bayrak bir temennidir (D3) ve her satırda tekrarlanan sabit bir değer ölü depolamadır. İddia kontrol deneyiyle kanıtlandı (3.3) |
| 3.2 alt görevi | Tek alt görev | **3.2a + 3.2b** | `drizzle-kit` **`down` üretmiyor** (araç çıktısından ölçüldü) → her migration'ın maliyeti iki katına çıktı, koşucu ve round-trip kanıtı ayrıldı |
| `club_kits.asset_id` | `spec/01`'de **yoktu** | Eklendi | `spec/12` §17.4 iki durumu ayırıyor (gerçek görsel var / şablondan üret) ve sütun olmadan bu ayrım şemada **ifade edilemiyordu** (SAPMA-026 EK) |
| `key`/`source`/`externalIds` | `spec/01` §3.1'de **yoktu** | Beş/on bir tabloya eklendi | `spec/12` §17.1/§17.3 üçünü de istiyor; sonradan eklemek 11 `ALTER TABLE` + seed'in yeniden yazımı demekti (SAPMA-023) |

#### 5. Karşılaşılan ve Giderilen Hatalar

> **DESEN BAZLI GRUPLANDI — 46 satır kopyalanmadı.** Faz 2'nin emsali işe
> yaradı: 59 satırlık günlük kayda **altı desen + yedi tekil** olarak indi ve
> gerekçe kaydın içinde yazılıydı — *"59 satırlık bir liste sonraki faza desen
> değil yük devrederdi."* Faz 3'ün günlüğü **#1…#46**; aynı işlem uygulandı.
>
> **Faz 2'nin D1–D6'sı bu fazda da geçerli** ve devam eden numaralandırma
> bilinçli: proje bunları bir **sözlük** olarak kullanıyor. **D7 bu fazda
> doğdu.** **F1–F5** Faz 3'e özgü yeni sınıflar.

**Devralınan ve bu fazda tekrarlayan desenler:**

| # | Desen (bu fazda kaç kez) | Örnekler | Kalıcı önlem |
|---|---|---|---|
| **D1** | **Ölçüm sonucu ölçülmeden yazıldı (2 kez)** | #34 `comparedFacts` alt sınırı **1.246** diye tahmin edildi, gerçek **1.223** çıktı · **3.10'un kendisi:** kapsam yüzdeleri ve soğuk build süresi ROADMAP'e ölçülmeden yazıldı, ölçüm sonrası düzeltildi | **D1'in ucuz ve pahalı biçimi yan yana ölçüldü:** #34'te tahmin bir **teste** yazılmıştı ve aynı dakikada reddedildi; 3.10'da bir **belgeye** yazıldı ve hiçbir şey ötmedi — düzeltmesi elle fark edilmeye kaldı. **Kural: ölçülecek bir sayının YERİ vardır.** Bir iddiaya yazılırsa ölçüm onu doğrular/reddeder; bir cümleye yazılırsa hiçbir şey yapmaz. Belgede kalacaksa alan `ÖLÇÜLECEK` bırakılır |
| **D2** | **Ölçüm ARACI ya da DÜZENEĞİ yanlış cevap üretti (6 kez)** | #4 `allowBuilds` negatif testi yanlış negatif verdi (karar `.modules.yaml`'da **önbellekli**) · #8 aynı `similarity` iki farklı sayı, ilk açıklama **yanlıştı** · #25 mutasyon **yanlış sebeple** kırıldı (TS1109 sözdizimi) · #37 `sed` `.notNull()`ı sildi, `typecheck` **sessiz** · #43 mutasyon ölçülen yola **hiç dokunmadı** · #46 plan eşiği rampası `DELETE` ile kurulduğu için `relpages` bayat kaldı | Faz 2'nin dört kuralına (`spec/09` §11.5b) **iki biçim daha** eklendi: **düzenleme aracı** da bozar (şema dosyasında toplu metin değişimi yapılmaz; doğrulama `typecheck` değil **üretilen SQL**) ve **düzenek** de bozar (bir eşik **azaltarak** ölçülmez; ölçümün girdisi `count(*)` değil `pg_class.relpages`). #43 kendi başlığıyla `spec/09` §11.5'e yazıldı |
| **D3** | **Kapı yeşil ama iddia ettiği şeye bakmıyor (4 kez)** | #14 `format:check` belge commit'inde **hiçbir değişen dosyaya bakmıyor** (SAPMA-024) · #16 `identical: true` tek başına boş — kör bir karşılaştırıcı da döner · #18 kontrol deneyi öttü ama **yalnızca dosya `countries`i adıyla andığı için** · #38 `lower`/`unaccent` sırası bozuldu, *"doğru sonucu buluyor"* testi **geçmeye devam etti** | `comparedFacts` sayacı (*"kaç olguya baktı?"*) · `arch:check` ⑨ + kanarya · plan testi (indeksin kanıtı **plandır**, sonuç değil) · her kapı için soru: *"benim DEĞİŞTİRDİĞİM dosyalara baktı mı?"* → `docs/OUTPUT-FORMAT.md` |
| **D5** | **Test yeşil, üretim kırık (2 kez)** | #21 `createWorldDb` yazıldı, **hiçbir test onu çağırmıyordu** · #40 derlenmiş `dist/seed.js` ilk koşuda patladı — `typecheck` + `lint` + 703 birim + 146 entegrasyon + `build` **beşi de sessiz** | **BUILD ET VE ÇALIŞTIR** her alt görevin kapanış adımı oldu ve fazın **her** alt görevinde koşuldu. #40, SAPMA-014'ün üçüncü tekrarı — çözüm Node 24'ün yerleşik `--env-file-if-exists` bayrağı, yeni bağımlılık yok |
| **D6** | **Kırmızı olan test, kod değil (3 kez)** | #17 negatif testin fixture'ı kanıtlamak istediğim şeyi **değil başka bir şeyi** kanıtladı · #22 jsdom yıkım yarışı — gerçek bir tarayıcı `window`u yıkmaz · #33 paylaşılan veritabanında global `count(*)` başka testin satırını saydı | Bozuk `down`un **iki sınıfı** ayrıldı (*eksik kalan* gürültülü / *fazla giden* **sessiz**) · `main.tsx` kökü dışa aktarıyor, test söküyor · **kural:** paylaşılan veritabanında bir sayım iddiası **her zaman** o testin kendi satırlarına daraltılır |
| **D4** | **0 kez** | — | Faz 2'nin *"sınıflandırma bağlamdan koparıldı"* deseni bu fazın günlüğünde hiç geçmedi. ⚠️ Ama **akrabası** F3 olarak ortaya çıktı ve `spec/01` §3.1.2 ⑧ (üçüncü sınıf: sahipsiz sözlük tablosu) tam olarak D4'ün şema tarafındaki karşılığı |

**Bu fazda doğan desenler:**

| # | Desen (kaç kez) | Örnekler | Kök neden | Kalıcı önlem |
|---|---|---|---|---|
| **D7** | **Kendi yazdığın plan KAYNAK değildir (1 kez, ama kurallaştı)** | #7 *"ROADMAP Faz 8 kulüp detay ekranında sezon geçmişi istiyor"* iddiası arandı; **tek eşleşme benim bir önceki turda yazdığım metindi** | Bir varsayım plana yazılınca sonraki tarama onu **kaynak** sanıyor. `grep` metni buluyor, kim yazdığını sormuyor | `spec/11` §12.4'e **kendi başlığıyla** yazıldı. Kural: bir iddiayı doğrularken `grep` sonucunun **hangi commit'ten geldiğine** bakılır. `docs/ROADMAP.md` ve `PROJECT_MEMORY.md` **kendi sesimiz**; kaynak `docs/spec/**` |
| **F1** | **Elle yazılmış envanter, şema büyüyünce bayatlıyor (3 kez)** | #30 `0002` beş tablo ekledi, beklenen liste **üçte** kaldı · #36 `0003` üç tablo daha ekledi, aynı liste yine kaldı · #23 `.test-d.ts` dışlaması **sekiz `tsconfig.build.json`'ın altısında** eksikti | Bir listenin doğruluğu, onu güncelleyecek kişinin hatırlamasına bağlı — ve şema her alt görevde büyüyor | ⚠️ **Üçüncü kırılma yolda olduğu için liste KURALA çevrildi (3.9):** `fk-policy.ts` beklenen `ON DELETE`i katalogdan **türetiyor**, Faz 4'ün üç ileri FK'sı hiçbir liste güncellenmeden denetlenecek. ℹ️ Elle liste **silinmedi** — *"bugün şunlar var"* ile *"olması gereken bu"* farklı şeyler. #23'ten: **bir düzeltme sınıfının geçtiği HER yeri kapsar** |
| **F2** | **Ortam katmanları yolu ya da kaçışı bozuyor (6 kez)** | #5 bash aracının **cwd'si çağrılar arasında kalıcı** → dosyalar `packages/db/packages/db/` altına yazıldı · #13 `MSYS_NO_PATHCONV=1` pnpm'in **kendi** yolunu bozdu · #19 tırnaklı heredoc kaçışları **korumadı** (üç kez ısırdı) · #29 Python **Windows yorumlayıcısı**, MSYS yolunu çözemiyor · #39 yorum içindeki `*/` blok yorumunu **erken kapattı** (TS2304) · #41 ESM çözümlemesi **dosyanın konumuna** göre, `cwd`ye göre değil · **(7. kez, 3.10'da)** çift tırnaklı bir bash dizesi içindeki ters tırnak **komut ikamesine** dönüştü ve `PROJECT_MEMORY.md`'ye yazılan metinden bir dosya adı **sessizce silindi** — düzeltme elle fark edilmeye kaldı | Windows + Git Bash + MSYS + pnpm'in sıkı düzeni + Node ESM — beş katman ve her biri yolu farklı yorumluyor | `PROJECT_MEMORY.md` **ORTAM TUZAKLARI** kalıcı bloğu (14 madde). Somut kurallar: dosya yazarken **mutlak yol** · kaçış içeren metin heredoc'tan **geçmez**, `Edit` ile yazılır · `MSYS_NO_PATHCONV=1` yalnızca `docker` içeren çağrıda · Python'a verilen yol **Windows biçiminde** · yoruma glob yazılacaksa `*/` kırılır. ⚠️ **3.10'un yedinci vakası kuralı genişletti:** ters tırnak **çift tırnaklı bash dizesinde de** yorumlanıyor — Markdown metni (ki içi ters tırnak dolu) kabuk üzerinden **hiç geçirilmez**, `Write`/`Edit` ile yazılır |
| **F3** | **Bir kural örneklerinden geriye okununca yanlış öğreniliyor (1 kez + 1 tasarım bulgusu)** | #45 *"3.000 satırda indeks kullanılıyor"* bir kural sanıldı; gerçek ayraç **seçicilik** ve o, hacimden **bağımsız bir boyut** · (tasarım) §3.1.2 ②'nin üç örneğinden *"sayısal olan CHECK almaz"* ayracı çıkarılabilirdi ve **yanlış** olurdu | Örneklerin **tesadüfen paylaştığı** bir özellik ayraç sanılıyor | Kuralın kendi **gerekçesine** dönülür (*"sözleşme mi kalibrasyon mu"*). #45 `spec/09` §11.5'e kendi başlığıyla yazıldı ve **iki vaka birden** teste girdi (seçici + seçici olmayan terim). ⚠️ Geriye dönük: 3.7'nin *"planlayıcı GIN'i seçiyor"* kanıtı **tesadüfen seçici** bir terimle alınmıştı — iddia yanlış değildi ama gerekçesi bilinmiyordu |
| **F4** | **Aracın gerçek davranışı belgesinden farklı — kaynağa bakmak şart (7 kez)** | #1 `pnpm install` **izlenen bir dosyayı kendisi değiştirdi** · #2/#3 pnpm 11'de `ignoredBuiltDependencies` **LEGACY ve sessizce yok sayılıyor** · #6 `drizzle.config.ts` hiçbir tsconfig'in `include`'unda değil · #10 `DomainError` imzası **tek nesne**, `kind` alanı yok · #31 `drizzle-kit` şema dosyalarını **çalıştırarak** okuyor ve negatif glob **çalışmıyor** · #32 PG 18.6 bu hata mesajında tablo adını **tırnaklamıyor** | Belgelenmiş davranış ile kurulu sürümün davranışı ayrışıyor; ve sessiz yok sayma en tehlikelisi — ayar yazılı, hiçbir şey yapmıyor | **Kural: bir ayar yazıldığı hâlde davranış değişmiyorsa aracın KENDİ KAYNAĞINA bakılır** (pnpm dağıtımından `LEGACY_BUILD_SETTINGS`, `drizzle-kit`ten `prepareFilenames` okundu). Bir API imzası **kaynaktan** okunur, hatırlanmaz. Bir hata mesajı deseni **ölçülür**, hatırlanmaz |
| **F5** | **Aynı çağrı, girdinin ŞEKLİNE göre farklı davranıyor (2 kez)** | #24 çok satırlı `INSERT … VALUES` sütunun ortak tipini **önce** çözüyor → `text` → `jsonb` örtük atama yok; tek satırlıkta aynı literal sorunsuz · #44 `postgres.js` `unsafe()`e **çok ifadeli** dize verilince dönüş şekli değişiyor, `rows[0]['QUERY PLAN']` `undefined` | Aynı SQL/API, satır ya da ifade sayısına göre farklı bir yol izliyor ve belirti bambaşka bir yerde çıkıyor (tip hatası gibi görünüyor) | **Kural:** bir `INSERT` tek satırla sınanıp çok satırla kullanılmaz; `jsonb`/`enum` gibi örtük atama kabul etmeyen tiplerde cast **her zaman** yazılır. Sürücüden dönen **şekle** güvenilecekse ifade **tek** tutulur |

**Tekil hatalar (desene girmeyenler):**

| # | Hata | Kök neden | Çözüm |
|---|---|---|---|
| 9 | ROADMAP Faz 8'in kabul kriteri (`besiktas` → `Beşiktaş`) **bugün sağlanmıyordu** | Türkçe harf içeren trigramlar `pg_trgm` tarafından **hash'leniyor**; `similarity` 0,286, eşik 0,3 → `%` operatörü **`f`** | `unaccent` benzerliği 1,0'a çıkarıyor ama **`STABLE`** → `IMMUTABLE` sarmalayıcı şart. Kısıt **hem 3.7 hem Faz 8** maddesine ölçümüyle yazıldı |
| 11 | `pnpm typecheck` `packages/db/integration/`i **hiç görmüyordu** (`--listFiles` → 0 dosya) | `rootDir: "src"` `src/` dışındaki her dosyayı programdan çıkarıyor. 3.0'da yazılan ESLint istisnası **asıl sebebi gizlemişti** | `rootDir`/`outDir` emit eden yapılandırmaya taşındı, ESLint istisnası **geri alındı**. Negatif testle kanıtlandı: kasıtlı tip hatası → 8/9 görev, geri alınca 9/9 |
| 12 | Çok adımlı kuru çalıştırma tasarımı yanlıştı — her adım ayrı işlemde geri alınıyordu | `up`'ın *"her migration kendi işleminde"* deseni `down`'a **düşünülmeden kopyalanmıştı** | `down` **tek işleme** alındı. **Ders:** bir deseni kopyalarken *"aynı gerekçe burada da geçerli mi?"* sorulur — `up` ileri gider ve kısmi ilerleme kabul edilebilir, `down` bir hedefe döner |
| 15 | Yeni CI işi `Entegrasyon` **iki mimaride birden** kırıldı (`Failed to resolve entry for @fms/shared`) | `quality` işinde derleme adımı **görünmüyor ama var** (`turbo.json`'da `typecheck` → `dependsOn: ["^build"]`). Yeni iş o **yan etkiyi** almadı | CI işine açık `pnpm build` eklendi; kök neden yerelde tekrar üretildi. → `spec/09` §11.5, kendi başlığıyla |
| 20 | `.test-d.ts` dosyaları `dist/`e **sızdı** ve kapsamı %89,75 → %87,20 düşürdü | `*.test.ts` deseni `.test-d.ts` ile **eşleşmiyor**; yeni bir dosya soneki repoya girdi | `tsconfig.build.json` `exclude` + `vitest.config.ts` `coverage.exclude` düzeltildi, `spec/09` §11.4 envanterine 10. satır |
| 26 | `snapshot ↔ gerçek şema` karşılaştırması kırılacaktı — sütun sırası ayrışıyordu | `ALTER TABLE ADD COLUMN` sütunu **sona** ekler; `drizzle-kit` snapshot'a **TS tanımındaki** sırayı yazar | `countries.ts` **fiziksel sıraya** hizalandı → `spec/01` §3.1.2 ④. Kazanç bir değişmez: dosyadaki sıra = tablonun gerçek sırası |
| 27 | Tek adımlık `ALTER` çevrimi `identical: true` **vermedi** (`position` 7…14 → 15…22) | `ordinal_position` = `pg_attribute.attnum` ve `DROP COLUMN` numarayı **geri kazanmaz** | Karşılaştırmadan `position` **çıkarılmadı**; test farkların **tam listesini** iddia ediyor. **Bir kapıyı daraltmak, ölçümü kapıya uydurmaktır** → §3.1.2 ⑤ |
| 28 | `pnpm test:db` **14 test birden** kırıldı | `0001` altı `NOT NULL` sütun ekledi ve `INSERT INTO countries (...)` **üç ayrı dosyada** tekrarlanıyordu — tek gerçeğin üç kopyası | `integration/fixtures.ts` açıldı: `countryInsertSql()` tek yerde, `chainTags()` journal'dan okuyor. **#23'ün bir adım ötesi: sınıf tek bir yere indirildi** |
| 35 | (**hata değil, doğrulama**) `drizzle-kit generate` bu kez sorunsuz koştu | 3.5'te yazılan extglob deseni, `src/schema/`e üç yeni dosya girmesine rağmen **doğru davrandı** | Günlüğe yazıldı çünkü *"kırıldı ve düzeltildi"* ile *"düzeltme bir sonraki gerçek kullanımda tuttu"* **ayrı iddialar** |
| 42 | Mutasyon uygulanmışken araç izni reddedildi, koşu yapılamadı | Ortam kısıtı — kodla ilgisi yok | **Kural: mutasyon uygulanmışken engel gelirse ilk iş ölçümü tamamlamak değil, MUTASYONU GERİ ALMAKTIR.** Bilerek kırılmış bir depo bırakmak, sonraki oturumun *"gerçek regresyon"* sanacağı bir durum üretir |

#### 6. Kontroller ve Sonuçları

> **Hepsi 2026-08-29'da, 3.10'un ağacında YENİDEN ölçüldü** (`spec/11` §12.5).
> Ara ölçümlerden kopyalanmadı. Soğuk build için `.turbo/cache` silindi.

| Kontrol | Komut | Sonuç |
|---|---|---|
| Tip kontrolü | `pnpm typecheck` | ✅ **10/10 görev**, 0 hata |
| Lint | `pnpm lint` | ✅ 0 uyarı |
| Biçim | `pnpm format:check` | ✅ 0 — **ama kapsamıyla birlikte okunur.** `.prettierignore` `*.md` taşıyor (SAPMA-024), yani belge ağırlıklı commit'lerde kapı **değişen dosyalara hiç bakmıyor**. 3.10'da 15 dosyanın **4'ü `.ts`** idi ve kapı **işini yaptı**: `er-diagram.ts`'i ilk koşuda reddetti |
| Birim testler | `pnpm test` | ✅ **744 / 744**, 52 dosya (Faz 3 başında 598 / 43 idi) |
| Kapsam | `pnpm test:coverage` | ✅ satır **%86,99** (923/1061) · ifade **%87,04** (1008/1158) · dal **%88,68** (486/548) · fonksiyon **%80,00** (284/355). **Eşik %70 — DÜŞÜRÜLMEDİ, hiçbir dosya dışlanmadı** |
| Entegrasyon | `pnpm test:db` | ✅ **163 / 163**, 8 dosya, gerçek **PostgreSQL 18.6** konteyneri. Dağılım: `db-integration` 135, `data-cli-integration` 28 |
| Mimari kontrol | `pnpm arch:check` | ✅ **9 kural**, ihlal yok (Faz 3'te 8 → 9: `master-table-marking`) |
| Build | `pnpm build` | ✅ **8/8**, `Cached: 0` doğrulandı, **10,90 s ve 7,01 s** (iki soğuk koşu) ⚠️ varyans yüksek: aynı komut bu fazda 5,80 / 11,49 / 21,29 s de ölçtü — **tek bir sayı trend değildir** |
| Derlenmiş çıktı | `node dist/...` (D5) | ✅ Her şema alt görevinde koşuldu. 3.10: 5 migration, **11 tablo, 12 FK**, diyagram üretildi ve `entities=11 relationships=12` ölçüldü |
| CI | GitHub Actions | ✅ Dalda **on iki ardışık yeşil amd64** (3.9 sonrası, **liste sorgusuyla** doğrulandı) · her koşuda altı iş, `Entegrasyon` **amd64 + arm64** (K14) |

> ⚠️ **`packages/db` KAPSAMI BU FAZDA KANIT SAYILMAZ** (ROADMAP Faz 3'ün
> dürüstlük notu). Drizzle şema dosyaları modül düzeyi ifadelerden ibaret: bir
> testin onları **import etmesi** kapsamı %100 yapar, hiçbir iddia
> doğrulanmadan. Raporda `introspect.ts`, `file-source.ts`, `postgres-executor.ts`
> ve on bir şema dosyası **%0** görünüyor; hepsi entegrasyon testiyle gerçek
> Postgres'e karşı koşuyor. **Bu fazın gerçek kanıtı migration round-trip'i,
> `EXPLAIN` ölçümü ve D5 koşularıdır.**

#### 7. Performans Ölçümleri

> ⚠️ **Her rakam ETİKETİYLE taşınıyor** — hangi hacimde, hangi mimaride. Etiketsiz
> bir *"< 20 ms ✅"*, sonraki fazın karşılaştırma tabanı sanacağı bayat bir sayı olur.

| Metrik | Bütçe | Ölçülen | Etiket | Durum |
|---|---|---|---|---|
| **İDDİA A** — temel sorgular (kriteri kapatan) | < 20 ms | **0,006 – 0,012 ms** | **Seed hacmi:** 6 ülke + 11 yarışma, diğer **dokuz tablo boş**. `ANALYZE` yapılmış. Planlayıcı **Seq Scan** seçiyor ve **haklı** — test bunu iddia ediyor. amd64 | ✅ |
| **İDDİA B** — Türkçe arama (kriteri kapatmaz, indeksin **gerekçesi**) | — | indeksli **0,92 ms** · indekssiz **6,13 ms** | **3.001 satır**, seçici terim (`'besiktas'`), GIN + `immutable_unaccent`. amd64 | ✅ ~6,7× |
| Planlayıcı eşiği (`clubs_competition_id_idx`) | — | **240 satırda Seq Scan · 500 satırda Bitmap Index Scan** | Temiz artan rampa, her adımda `VACUUM ANALYZE`; `relpages` 5 → 11 | ℹ️ |
| Soğuk build | — | **10,90 s** ve **7,01 s** (8/8, `Cached: 0`) | 2026-08-29, `.turbo/cache` silinmiş, **iki ayrı koşu**. ⚠️ Fazda ölçülen aralık **5,80 – 21,29 s** — bir bütçe konulacaksa bu varyansla konulmalı | ✅ |
| `pnpm test:db` süresi | — | **33,33 s** ve **36,42 s** | İki proje paralel, iki PG18 konteyneri (163 test), **iki ayrı koşu**. 3.8/3.9'da 27,1–28,8 s idi (146/160 test) | ✅ |
| API imajı | — | **424 MB** | 2026-08-29 yeniden ölçüldü. Faz 2 kapanışında **423 MB** → **+1 MB**: `apps/api` → `packages/db` → `drizzle-orm` + `postgres` | ✅ |
| Web paketi | — | **321.495 bayt** | 2026-08-29 yeniden ölçüldü, **Faz 2'nin değeriyle birebir aynı** — Faz 3 `apps/web`e hiç dokunmadı | ✅ |

⚠️ **ÖLÇÜMÜN MİMARİSİ RAPORUN PARÇASI (K14).** Yukarıdaki süreler **Windows +
Docker Desktop (amd64)** üzerinde alındı; üretim Oracle Ampere A1 (**ARM64**).
En yakın vekil CI'ın `arm64` entegrasyon işi — orada da yeşil, yani iddia iki
mimaride birden koşuyor. **Mutlak süreler taşınabilir değil, bütçe kararı
taşınabilir.**

⚠️ **`ANALYZE` ŞART — bu fazın en pahalı ölçüm dersi.** Migration + seed sonrası
`reltuples = -1` (PG 14+ bunu *"hiç ANALYZE edilmedi"* için kullanır ve
*"edildi ve boş"* olan `0`dan **ayrı tutar**). İstatistiksiz planlayıcı dört
sorgunun **dördünde de** indeksi seçiyor; `ANALYZE` sonrası dördü de Seq Scan'e
düşüyor. Ölçüm `ANALYZE`sız alınsaydı rapora *"indeksler kullanılıyor"*
yazılırdı ve **yanlış** olurdu. **Tuzağın yönü tehlikeli: yanlış cevap doğru
cevaptan iyi görünüyor.**

⚠️ **`pnpm perf:budget` KURULMADI (K12).** `spec/09` §11.6'nın 15 satırlık
bütçesini ölçen kapı **G-01** ve **Faz 6**'ya atanmış; §11.6'da veritabanı
sorgusu satırı **yok** (sayıldı). *"< 20 ms"* ROADMAP Faz 3'ün kendi kriteri.

#### 8. Kabul Kriterleri Doğrulaması

- [x] **Kriter 1 — Migration ileri ve geri çalışıyor (`up`/`down`)** —
      **nasıl doğrulandı:** gerçek PG 18.6'ya karşı, `testcontainers` ile (G-03).
      Çevrim `up` → **veri yaz** → `down` → `up`, sonra gerçek
      `information_schema`/`pg_catalog` durumu çevrim öncesiyle karşılaştırıldı:
      `countries` tek başına **89 olgu**, tam zincirde **1.627 olgu, fark yok**.
      **Negatif testler zorunluydu:** bozuk `down`un iki sınıfı ayrı ayrı
      ölçüldü — *eksik kalan* sonraki `up`ı patlatıyor (gürültülü), *fazla giden*
      **hiçbir hata vermiyor** ve yalnızca karşılaştırma yakalıyor. Karşılaştırıcı
      köreltilince 16 testin **yalnızca 1'i** kırılıyordu (bugün 163'ün 19'u).
      Üç yerde koştu: `pnpm test:db` · CI (amd64 + arm64) · derlenmiş çıktı (D5).
- [x] **Kriter 2 — 6 ülke + 6 lig + 5 kupa seed'i başarılı** —
      **nasıl doğrulandı:** `tools/data-cli/src/seed.ts` gerçek PG 18.6'ya
      **6 ülke + 11 yarışma** yazdı (6 lig · 3 UEFA · 2 yerel kupa, iki farklı
      ülkeden). **İki iddia AYRI kanıtlandı:** *deterministik* (K2 — rastgelelik
      kaynağı yok, aynı girdi birebir aynı SQL) ve *idempotent* (iki koşu satır
      sayısını ve `id`'leri değiştirmiyor). ⚠️ İdempotentlik *"patlamadı"* ile
      **değil ONARIM ile** kanıtlandı: satır kasten bozuldu, seed yeniden koştu,
      **üç değer de onarıldı**. Üç yerde koştu: `pnpm test:db` · CI (amd64 +
      arm64) · derlenmiş `dist/seed.js` düz `node` ile (D5).
- [x] **Kriter 3 — Tüm yabancı anahtarlar ve `ON DELETE` davranışları tanımlı** —
      **nasıl doğrulandı: LİSTEYLE DEĞİL, KURALLA.** On iki FK'nın davranışı
      `spec/01` §3.1.2 ③ + ⑧'den **türetiliyor** (`src/schema/fk-policy.ts`),
      girdiler katalogdan okunuyor (`key` sütunu var mı · giden FK var mı) ve
      türetilen değer `pg_constraint`teki gerçekle karşılaştırılıyor:
      **12/12, 0 uyumsuzluk**. ⑧'in üçüncü sınıfı (*"sahipsiz"* sözlük tablosu)
      **elle adlandırılmıyor** — koşulu sağlayan tek tablo ölçüldüğünde
      `kit_templates` çıkıyor. Elle liste testi **korundu** (iki farklı iddia).
      **Mutasyonla doğrulandı:** sınıflandırma köreltildiğinde `typecheck`/`lint`
      **sessiz**, yalnızca bu test kırılıyor ve farkı adıyla gösteriyor.
- [x] **Kriter 4 — `EXPLAIN ANALYZE` ile temel sorgular < 20 ms** —
      **nasıl doğrulandı: İKİ AYRI ETİKETLİ İDDİA olarak**, birleştirilmeden.
      **A (kriteri kapatan):** seed hacminde dört sorgu **0,006–0,012 ms**.
      **B (indeksin gerekçesi):** 3.001 satırda **0,92 / 6,13 ms**. Tek bir süre
      yazılsaydı, bakacak bir şey bulamayan bir kapı `✅` almış olurdu
      (SAPMA-024 sınıfı) — sayı **hacmiyle birlikte** anlamlı. Ölçüm aracının
      kendisi de doğrulandı (D2, üç tuzak): soğuk/sıcak farkı **yok**,
      `TIMING ON/OFF` farkı **yok**, `ANALYZE` **tek gerçek tuzak**.
- [x] **Kriter 5 — Şema dokümanı ve mermaid diyagramı üretildi** —
      **nasıl doğrulandı: *"üretildi"* harfi harfine alındı.** `docs/schema/world.md`
      (371 satır) dolduruldu; mermaid bloğu (176 satır) **elle çizilmedi**,
      `src/schema-state/er-diagram.ts` tarafından `introspectSchema()`'nın gerçek
      katalog okumasından **üretildi**. Nöbetçi `integration/er-diagram.itest.ts`:
      ① belgedeki blok canlı katalogdan üretilenin **birebir aynısı** ② belge
      **metninden sayılan** tablo/ilişki sayısı katalogla **ve** mutlak
      değerlerle (**11 / 12**) aynı ③ negatif kontrol. **Negatif testle
      kanıtlandı:** belgeden `stadiums` varlığı silindi → **3/3 kırıldı**, fark
      `entities: 10 ≠ 11` olarak adıyla raporlandı. **İkinci mutasyon:**
      migration SQL'inden `NOT NULL` kaldırıldı → **163'ün 7'si** kırıldı
      (ikisi bu nöbetçi), `pnpm test` ve `typecheck` **sessiz**.
      ✅ **Render de ölçüldü, varsayılmadı:** `mermaid-cli 11.16.0` ile blok
      gerçekten çizildi — **403 KB SVG**, hata kutusu **yok**, on bir varlık
      adının her biri birebir bir kez, işaretler **9 `PK` + 2 `PK,FK` + 10 `FK`
      + 8 `UK`**. ⚠️ Bu **kalıcı bir kapı değil** (bağımlılık gerekirdi, K12):
      diyagramın **içeriğini** koruyan bir nöbetçi var, **sözdizimini** koruyan
      yok — bir sonraki şema değişikliğinde render tek seferlik yeniden ölçülür.

**5 / 5 sağlandı.**

#### 9. Oluşturulan / Değişen Önemli Dosyalar

```
packages/db/src/migrate/runner.ts             [YENİ] up/down koşucusu, kayıp ölçümü, dry-run
packages/db/src/migrate/loss.ts               [YENİ] Geri almanın veri kaybını ÖLÇER (etiketlemez)
packages/db/src/migrate/journal.ts            [YENİ] Zod'lu journal + planlama
packages/db/src/migrate/postgres-executor.ts  [YENİ] postgres.js sürücüsü (SAPMA-025)
packages/db/src/schema-state/introspect.ts    [YENİ] Derin şema okuma (information_schema + pg_catalog)
packages/db/src/schema-state/compare.ts       [YENİ] Saf karşılaştırıcı + comparedFacts sayacı
packages/db/src/schema-state/drizzle-snapshot.ts [YENİ] Snapshot ↔ gerçek şema (KAYIPLI, kapsamı yazılı)
packages/db/src/schema-state/er-diagram.ts    [YENİ] 3.10 — ER diyagramı ÜRETİCİSİ, saf
packages/db/src/client/master.ts              [YENİ] K4 — görünmez marka, MasterDb / WritableDb
packages/db/src/schema/*.ts                   [YENİ] 11 master tablo + data-pack-columns + search
packages/db/src/schema/fk-policy.ts           [YENİ] 3.9 — ON DELETE bir LİSTE değil bir KURAL
packages/db/drizzle/000{0..4}_*.sql           [YENİ] Beş migration + drizzle/down/ altında beş elle down
packages/db/integration/*.itest.ts            [YENİ] 8 dosya, 163 test, gerçek PG 18.6
tools/data-cli/src/seed.ts                    [YENİ] 6 ülke + 11 yarışma, deterministik + idempotent
vitest.integration.config.ts                  [YENİ] pnpm test:db — iki proje
docs/schema/world.md                          [DEĞİŞTİ] İskelet → 371 satır, ÜRETİLMİŞ diyagramla
docs/spec/01-database.md                      [DEĞİŞTİ] §3.0 · §3.1.0 · §3.1.2 (on kural) · §3.4.1
docs/spec/09-quality-protocol.md              [DEĞİŞTİ] §11.4 envanteri +3 satır · §11.5 mutasyon serisi + iki yeni kural
tools/arch-check/index.mjs                    [DEĞİŞTİ] 9. kural: master-table-marking + kanarya
docker-compose.yml                            [DEĞİŞTİ] PG 16 → 18, locale C → builtin/C.UTF-8
docs/reports/                                 [YENİ] 3.10 — ham rapor arşivi (append-only)
```

#### 10. Yeni Açılan Sorun / Borç / Sapma

- **SORUN:** Yok. (Faz 3 hiçbir açık sorun açmadı; SORUN-001 Faz 2'de kapanmıştı.)
- **BORÇ-007 (Faz 12)** — Master World'ün **veritabanı-rolü ikinci hattı**
  kurulmadı. Tip seviyesi zorlaması (K4) 3.3'te kuruldu ve kontrol deneyiyle
  kanıtlandı, ama `as unknown as`, ham SQL ve tip sistemini görmeyen bir istemci
  onu atlayabilir. Mekanizma **ölçüldü ve koşulabilir** (yalnızca `GRANT SELECT`
  verilen rolde üç yazma denemesi de `permission denied` alıyor); bugün
  kısıtlanacak bir uygulama bağlantısı yok.
- **SAPMA-019 … SAPMA-027 (dokuz sapma):** PG 16 → 18 · `--locale=C` → builtin ·
  tablo sayısı 15/16 → 11 · `spec/12` slug algoritması kendi örneklerinin 2/3'ünü
  tutturmuyor · `key`/`source`/`externalIds` sözleşmesi · `format:check` Markdown'a
  bakmıyor · sürücü `postgres.js` · `spec/01` nullability yazımı tutarsız (beş sütun
  `nullable`) · `spec/09` §11.4'ün *"`tools/` kapsam eşiğine dahil değildir"* iddiası
  **ölçümle çürütüldü**.
- **G-09 … G-14 (altı yeni boşluk, `docs/SPEC-COVERAGE-GAPS.md`):** `asset_index`
  (Faz 7) · `clubs` koşullu nullability doğrulayıcısı (Faz 11) · `rivalries`
  `(A,A)` deliği (Faz 11) · `color3` ↔ `colorSlots` (Faz 11) · `competitions`
  araması (Faz 17) · `source: 'procedural'` kalıcılığı (Faz 7).

#### 11. Sonraki Faz İçin Devir Teslim

- **Sıradaki faz:** Faz 4 — Veritabanı Şeması II: Oyuncu, Sözleşme, Personel
- **O fazda yapılacaklar (ROADMAP özeti):** `people` ve oyuncu tabloları ·
  sözleşme ve madde tabloları · personel/`staff_roles` · `injury_types` ·
  `player_stats_history` · **üç ileri FK'nın kapatılması**.
- **Sıradaki oturumun okuması gereken spec:** `docs/spec/01-database.md`
  (özellikle **§3.0**, **§3.1.0**, **§3.1.2**, **§3.4.1**) ·
  `docs/spec/02-attributes.md` (Faz 4 nitelik sütunlarını getiriyor).

**Bu fazdan taşınan bağlam — Faz 4'ün kaynağı bu bölüm:**

1. **ÜÇ İLERİ FK BİRLİKTE EKLENİR — sütun VE kısıt aynı migration'da.**
   `federations.president_person_id` · `clubs.chairman_person_id` ·
   `referees.person_id` → hepsi `people`'a. Faz 3'te bilerek yazılmadılar:
   kısıtsız bir sütun *"tüm FK'lar tanımlı"* kriterini **görünürde** sağlayıp
   gerçekte delerdi. Faz 4'ün kabul kriterinde yazılı — doğrula.
2. **`fk-policy.ts` YENİ FK'LARI OTOMATİK DENETLER — güncellenecek liste yok.**
   `injury_types` ve `staff_roles` **dictionary** sınıfına düşecek (`key` yok +
   giden FK yok) ve onlara giden FK'lar **RESTRICT** alacak. Elle envanter testi
   duruyor ve **kırılması istenen davranıştır** — kırıldığında listeye yeni FK
   eklenir, kural değiştirilmez.
3. **`spec/01` §3.1.2 ON KURAL Faz 4'ün şema yazım sözleşmesidir.** Burada
   **tekrarlanmıyor**, adresi veriliyor: iki kopya kaçınılmaz olarak ayrışır ve
   hangisinin güncel olduğu bilinmez. Başlıkları: `check()` desteği · CHECK
   nereye konur · `ON DELETE` kuralı · sütun sırası · `attnum` deliği · `bigint`
   modu · elle `down`un düşürme sırası · sözlük tabloları → RESTRICT ·
   `IMMUTABLE` iddiası · uzantı `down`u.
4. **HER YENİ MIGRATION İKİ ŞEY DAHA GETİRİR:** `drizzle/down/<tag>.sql` (yoksa
   koşucu veritabanına dokunmadan durur) ve round-trip testine bir `it()` bloğu
   (genişletilmezse yeni tablonun `down`u **hiç sınanmamış** olur).
5. **ER DİYAGRAMI HER MIGRATION'DA BAYATLIYOR — ve nöbetçi bunu söyleyecek.**
   `docs/schema/world.md`'deki blok **elle düzenlenmez**; `er-diagram.itest.ts`
   kırıldığında Vitest'in fark çıktısındaki üretilmiş metin belgeye kopyalanır.
   `EXPECTED_TABLE_COUNT` / `EXPECTED_FOREIGN_KEY_COUNT` sabitleri de
   güncellenir — **bilerek sabit**, çünkü katalogla belgenin uyuşması ile
   katalogun beklenen yerde olması ayrı iki sorudur.
6. **ŞEMA MUTASYONU DOĞRU TEMSİLE YAPILIR.** TS dosyasındaki bir `onDelete`
   değişikliği katalogdan okuyan hiçbir testi etkilemez (3.9 günlük #43,
   3.10'da karşı ölçümü alındı). Faz 4 sürekli şema mutasyonu yapacak; kural
   `spec/09` §11.5'e kendi başlığıyla yazıldı.
7. **`main.test.tsx` JSDOM YARIŞI KAPANMADI.** Düzeltildi (`1c93890`) ve o
   günden beri **on iki ardışık yeşil amd64** koşusu var, ama bu iddiayı
   **güçlendiriyor, kanıtlamıyor**: yarış makine hızına bağlı ve yerelde beş
   koşuda hiç tekrar üretilemedi. Gerçek sınav **Faz 6** — yüzlerce React kökü.
   ANLIK DURUM'daki AÇIK RİSK bloğu **silinmez**.
8. **`packages/db` KAPSAMI KANIT DEĞİL.** Faz 4 yeni şema dosyaları getirecek ve
   kapsam **düşecek** — bu beklenen. **Eşik düşürülmez, dosya dışlanmaz,
   import testi yazılmaz.** Kanıt entegrasyon tarafında üretilir.

**Dikkat edilmesi gerekenler:**

- **Ölçüm disiplini:** `ANALYZE` yapılmamış tablo *"gurur verici bir yalan"*
  üretiyor · plan eşiği **azaltarak** ölçülmez · plan kararı hacme değil
  **seçiciliğe** bağlı. Üçü de `spec/09` §11.5 ve §11.6'da yazılı.
- **Ortam:** dosya yazarken **mutlak yol** · kaçış içeren metin heredoc'tan
  geçmez · `MSYS_NO_PATHCONV=1` yalnızca `docker` çağrılarında · yorum içine
  `*/` dizisi yazılmaz. ORTAM TUZAKLARI bloğu 14 madde.
- **`pnpm format:check` belge commit'lerinde hiçbir şey kanıtlamaz** (SAPMA-024).
- **Ardışık yeşil bir SAYAÇ değil, bir LİSTE SORGUSUDUR** (`gh run list --limit
  40 --branch …`); elle numara eklenerek büyütülmez.
- **Rapor arşivi (3.10'da kuruldu):** her alt görev raporu terminale basılmadan
  **önce** `docs/reports/<faz-slug>/<no>-<slug>.md`'ye yazılır. Kural dört yerde
  birden kayıtlı: `docs/OUTPUT-FORMAT.md` (ana yer) · `CLAUDE.md` belge haritası ·
  `README.md` belge ağacı · `docs/SESSION-TEMPLATE.md` kapanış adımı.

---


> En yeni kayıt en üstte. Yeni faz kaydı buraya, bu satırın hemen altına eklenir.

---

### FAZ 2 — Hata Kontrol ve Gözlemlenebilirlik Protokolü
**Tarih:** 2026-08-25 → 2026-08-26 · **Süre:** 2 gün · **Durum:** ✅ Tamamlandı
**Dal:** `feature/faz-02-observability` · **PR:** **#3** → `develop`
**Commit aralığı:** `a474c86..c06e044` — **25 commit**, 105 dosya, **+12.383 / −181 satır**
*(faz kaydını yazan commit hariç; §7 notuna bakınız)*

> ℹ️ **PR numarası neden #3, #2 değil:** `#2` bu projeye ait değil — `main`'e
> açılıp kapatılmış ilgisiz bir PR (`feat: add football-management-simulator
> ECC bundle`). Faz PR'ları: Faz 1 → **#1** (merge edildi), Faz 2 → **#3**.
> Numaralar faz sırasını takip etmiyor; sonraki oturum eşleştirmeye çalışmasın.

---

#### 1. Fazın Konusu

Bir hata olduğunda kaynağını **10 saniyede** bulabilmek. Öncelik #2'nin temeli
ve bu yüzden oyun kodundan **önce** geliyor: gözlemlenebilirlik sonradan
eklenirse, o güne kadar yazılmış her modülün log/iz/hata yüzeyi geriye dönük
elden geçirilmek zorunda kalırdı.

Faz somut olarak altı katman kurdu: tipli hata taksonomisi → yapılandırılmış
loglama → `correlationId` zinciri → HTTP hata sözleşmesi → Sentry → geliştirici
araçları (`debugTrace`, `assertInvariant`, `measure`, hata ayıklama paneli).

---

#### 2. Yapılması Planlananlar

ROADMAP'teki kapsam maddeleri:
- [x] Pino yapılandırılmış loglama, pretty (dev) / JSON (prod)
- [x] Her HTTP isteğine `correlationId` — log zincirinde taşınır
- [x] NestJS global exception filter + tipli hata sınıfları
- [x] Sentry entegrasyonu
- [x] Frontend `ErrorBoundary` hiyerarşisi + "Hata bildir"
- [x] Geliştirici Hata Ayıklama Paneli (`Ctrl+Shift+D`), 4 sekme
- [x] `debugTrace` altyapısı
- [x] `assertInvariant` yardımcısı
- [x] Performans ölçüm sarmalayıcısı (`measure`)
- [ ] **Sentry kaynak haritası YÜKLEME adımı — YAPILMADI**, gerekçe: CI'a Sentry
      auth token'ı, organizasyon/proje adı ve `sentry-cli` bağımlılığı getiriyor;
      üçü de ortada bir Sentry projesi olmadan yazılamaz. `release` adlandırması
      bugün kuruldu, yükleme **tek bir CI adımı** olarak sonradan eklenebilir →
      **BORÇ-006, Faz 50**
- [ ] **`job.data.correlationId` kablolaması — YAPILMADI**, gerekçe: kuyruk
      (BullMQ) Faz 16'da kuruluyor. Taşınabilir zarf **gerçek süreç sınırında**
      test edildi; kalan yalnızca BullMQ'nun kendi alanına bağlama işi →
      **BORÇ-004, Faz 16**

**Alt görev bölünmeleri (planda yoktu, bağlam sınırı gerekçesiyle yapıldı):**
2.0 → 2.0b · 2.2 → 2.2a/2.2b · 2.3 → 2.3a/2.3b/2.3c · 2.5 → 2.5a/2.5b.
Planlanan 10 alt görev **16** olarak kapandı.

---

#### 3. Gerçekte Yapılanlar

**Eklenen — `packages/shared` (izomorfik kök):**
`errors.ts` (6 hata sınıfı + `isUserFaultError`) · `logger.ts` (arayüz, `LogValue`
dar tipi) · `redact.ts` (16 hassas anahtar parçası, alt dize eşleşmesi) ·
`correlation.ts` (bağımlılıksız uuid v7) · `log-context.ts` (taşınabilir zarf
üreticisi) · `event-throttle.ts` · `telemetry-policy.ts` · `debug-trace.ts` ·
`assert.ts` · `perf.ts`

**Eklenen — `packages/shared/server` (sunucuya özgü alt yol):**
`logger.ts` (pino sarmalayıcısı) · `env.ts` (Zod şeması, `collectEnvWarnings`) ·
`context.ts` (`AsyncLocalStorage`) · `log-context.ts` (Zod'lu zarf çözücüsü)

**Eklenen — `apps/api`:** `instrument.ts` (Sentry, `--import` ile yüklenir) ·
`common/tokens.ts` · `common/middleware/correlation.middleware.ts` ·
`common/middleware/request-log.middleware.ts` ·
`common/filters/global-exception.filter.ts`

**Eklenen — `apps/web`:** `lib/logger.ts` (console uygulaması) · `lib/api.ts`
(kimlikli `fetch` kapısı) · `lib/correlation-context.ts` · `lib/sentry.ts` ·
`lib/log-buffer.ts` · `components/ErrorBoundary.tsx` ·
`components/dev/DebugPanel.tsx`

**Eklenen — `packages/engine`:** `errors-from-engine.test.ts` ·
`observability-from-engine.test.ts` — motorun K3 kısıtları altında
(`types: []`, `lib: ["ES2024"]`) bu modülleri **gerçekten** kullanabildiğinin
kanıtı. `arch:check` ters yönü (yasak olanı) ölçüyor; bu testler izinli olanın
çalıştığını.

**Eklenen — araçlar:** `scripts/clean-dist.mjs` · `arch:check`'e beş yeni kural
(`restricted-subpath`, `undeclared-dependency`, `engine-forbidden-import`,
`forbidden-export-exists` ve `import-casing` kanaryası) · ESLint
`process.stdout/stderr.write` yasağı · `docs/SPEC-COVERAGE-GAPS.md`

**Değiştirilen:** `base-path.ts` (`TypeError` → `ValidationError`) ·
`vitest.config.ts` (`coverage.include` uzantı listesi, jsdom projeleri,
`define.__FMS_DEV__`) · yedi `tsconfig.build.json` (`exclude` deseni) ·
sekiz `package.json` (`clean-dist` bağlandı) · `vite.config.ts` (dört derleme
zamanı sabiti + `sourcemap: true`)

**Silinen:** `env.ts`'in kök barrel'dan dışa aktarımı (motora Zod çekiyordu) ·
`env.ts`'teki `process.stderr.write` · `apps/api`'deki geçici hata eşleme tablosu

---

#### 4. Plandan Sapmalar

| Ne | Plan | Yapılan | Gerekçe |
|---|---|---|---|
| `httpStatus` alanı | hata sınıflarında | filter'da `Record<ErrorKind, number>` | HTTP taşıma kaygısı; motor HTTP bilmez (SAPMA-010) |
| Redaksiyon konumu | `@fms/shared/server` | kökte | iki logger uygulaması da kullanıyor; kopya ayrışırdı (SAPMA-013) |
| `env` uyarısı | `logger.warn` | teşhis **döndürülüyor** | logger env'den doğuyor, sıra tersine çevrildi (SAPMA-013) |
| Zarf | tamamı kökte, Zod'lu | üretici kökte, çözücü `server/`de | `zod` kök barrel'a giremez (2.3b Karar 9) |
| Başlık doğrulaması | Zod | regex koruyucusu | tek dizgenin biçimi; Zod izomorfik girişe bağımlılık çekerdi (SAPMA-015) |
| `debugTrace.input` | `Record<string, unknown>` | `ErrorContext` | aynı redaksiyon hattına giden iki tip tutarsız olmamalı (SAPMA-016) |
| dev/prod ayrımı | her yerde | **yalnızca tarayıcı** | sunucuda tüketici yok; kanıtlanamayan bayrak eklenmedi (SAPMA-017) |
| `api.ts` uyumsuzluk | `warn` + devam | dev'de **fırlatır** | 2.3b kararı iptal değil, kapsamı daraldı; üretim aynı (SAPMA-018) |
| Alt görev sayısı | 10 | **16** | bağlam sınırı ve parçaların bağımsız doğrulanabilirliği |
| Karar 6 uygulaması | yeni `arch:check` kuralı | mevcut kuralın **tablosuna girdi** | 2.3a'nın kuralı zaten tam bu işi yapıyordu; ikinci kural tekrar olurdu |

---

#### 5. Karşılaşılan ve Giderilen Hatalar

> **DESEN BAZLI GRUPLANDI.** Çalışma günlüğü 60 satıra ulaştı; tek tek dökmek
> Faz 3'e girecek kişiye bir liste verir, **desen** vermez. Tekrar eden altı
> sınıf aşağıda; kalanlar tekil olarak sonda.

| # | Desen (kaç kez) | Örnekler | Kök neden | Kalıcı önlem |
|---|---|---|---|---|
| **D1** | **Ölçüm sonucu uydurma (3 kez)** | #9 CI koşu numarası koşu başlamadan yazıldı · #49 bağlam yüzdesi iki raporda uyduruldu (%46 denildi, gerçek %81) · #59 ROADMAP'e test/kapsam rakamı ölçmeden yazıldı | Belgeyi/raporu **ölçümden önce** yazma alışkanlığı. Makul görünen bir rakam yanlış olduğunu belli etmiyor | `spec/11` §12.3 (alanlar tahminle doldurulmaz) → `docs/OUTPUT-FORMAT.md` (yüzde yoksa "ölçülemedi") → **somut eylem kuralı**: belgeye sayı **ölçüm çıktısından kopyalanır**, ölçümden önce yazılıyorsa alan `ÖLÇÜLECEK` bırakılır. ⚠️ **Kural her seferinde zaten yazılıydı** — üç tekrar, "yazılı olmak hatırlanmaya yetmiyor"un kanıtı |
| **D2** | **Ölçüm ARACININ yanlış cevap üretmesi (4 kez)** | #17 turbo önbelleği silinmiş kirli paketi diriltti, tarama hâlâ `JWT_SECRET` buldu · #26 aynı paket için iki farklı gzip rakamı (Vite 73,77 kB / zlib 71,24 kB) · #53 küçültücü dizeleri ters tırnakla yazıyor, çift tırnaklı desen iki pakette de 0 döndü · #58 Browser pane görüntülenmiyordu, OS tuş girdisi hiç iletilmedi | Araç "başarılı" ya da "0" diyor ama ölçtüğü şey sorulan şey değil | **Dört kural** (`spec/09` §11.5b): ① soğuk derleme zorunlu ② ham bayt, tek kaynak ③ nöbetçi **iki yönlü** doğrulanır — "0 eşleşme" ya "yok" ya "desen hiç eşleşmiyor" demektir ④ açıklanamayan fark **ayrıştırılır**. ⚠️ #58 **yanlış NEGATİF** üretti ve en tehlikelisiydi: uydurma bir SAPMA açmaya bir adım kalmıştı |
| **D3** | **Kapı iddia ettiği şeyi ölçmüyor (5 kez)** | #1 `coverage.include` `.tsx` görmüyordu (13 dosya sayıyor, diskte 15) · `.cts` `arch:check` taramasından tamamen kaçıyordu · #13 12 katman bağına izin veriliyordu, 2'si bildirilmişti ("izinli" ≠ "çözümlenebilir") · #27 kanarya 7 kuraldan 6'sını kapsıyordu, `import-casing` körelmişti · 2.7 mutasyonu: tablo anahtarı yanlış yazılınca gate "temiz" dedi | Bir denetleyicinin `✓ temiz` çıktısı, dosyaya **bakıldığını** söylemiyor | **Meta-test iki katmanlı** (`spec/09` §11.5): ① sabit tablo bütünlüğü ② **kanarya deposu** — her kuralın ihlalini içeren sahte repo. 2.8'de bir kademe daha derine indi: kural bir TABLO okuyorsa kanarya **tablonun her girdisini** kapsamalı. `arch:check` kapsamı `PROJECT_MEMORY.md`'de **kalıcı blok** olarak yazılı |
| **D4** | **Bir sınıflandırma bağlamdan koparıldı (2 kez)** | #44/2.5b `api.ts` her HTTP hatasını `DomainError` yapıyordu → **her 500 sessizce Sentry'den düşerdi** · #46/2.6 arayüzü yıkan bir `DomainError` de düşecekti | Sınıflandırma **yazıldığı anda doğru** ve onu tüketen bir kural yokken yanlış olduğunu belli etmiyor | `spec/09` §11.5'e kural: *"bu tip, **bu bağlamda**, şu listede mi?"* Tüketen kural yazılırken iki soru: bütün yollar düşünüldü mü, bir yol yanlış tarafa düşerse **hangi test kırılır**? Cevap "hiçbiri"yse kural değil temenni yazılmıştır. Karar 18: `crash` etiketi bağlamı taşıyor, kontrol testi etiketsiz hâlin düştüğünü kanıtlıyor |
| **D5** | **Test yeşil ama üretim kırık (3 kez)** | #22/SAPMA-014 dairesel DI: `typecheck` ✅ `lint` ✅ 19 test ✅ `build` ✅ — yalnızca **çalıştırmak** yakaladı · #30 sahte `fetch` `headers` taşımıyordu · #42/#47 `define` sabitleri testlerde tanımsızdı | Vitest modül grafiğini üretimden **farklı sırayla** çözüyor; sahteler taklit ettikleri sözleşmenin yüzeyini eksik taklit ediyor | `spec/09` §11.5'e yeni bölüm: **BUILD ET VE ÇALIŞTIR**. DI/modül grafiği değişen her alt görevde derlenmiş çıktı gerçekten koşulur. DI belirteçleri **hiçbir şey import etmeyen** modülde toplanır. `define` ile gömülen her yeni sabit, testlerin sahtelemesi gereken **yeni bir sözleşmedir** |
| **D6** | **Kırmızı test = kod yanlış DEĞİL (3 kez)** | #20 `collectEnvWarnings` senaryosu hiç kurulmamıştı (fixture zaten `ACTIVE_PACK` taşıyordu) · #43 kısıtlayıcı ikinci testi **doğru şekilde** düşürüyordu · #55 `getByTestId` bulamayınca fırlatır, `??` hiç devreye girmez | Kırmızı testin iki olası sebebi var ve refleks yanlış olanı seçiyor | Önce **hangisinin yanlış olduğu** sorulur. Kuralı test için gevşetmek **elendi**: o zaman üretim yapılandırmasından sapılır ve testlerin tüm değeri "üretimle aynı" olmasıdır |

**Tekil hatalar (desene girmeyenler):**

| # | Hata | Kök neden | Çözüm |
|---|---|---|---|
| 7 | Yedi paketin testleri `dist/`e sızdı | TypeScript glob dili **süslü parantez desteklemiyor**; `{ts,tsx}` deseni hiçbir şeyle eşleşmiyordu. `typecheck`/`lint`/`test` üçü de sessiz | Uzantılar tek tek yazıldı (SAPMA-009). Aynı repoda **iki glob lehçesi** var |
| 15 | "Üç kat savunma" iddiası çürüdü | `types: []` Node *globallerini* yasaklar, imza Node tipi taşımıyorsa `.d.ts` sorunsuz derlenir; `sideEffects: false` yalnızca **kullanılmayan** kodu siler | Gerçekte iki hat var: `arch:check` **önler**, paket taraması **doğrular** (SAPMA-012) |
| 16 | Sızıntı deneyi hiçbir şey kanıtlamadı | `void loadEnv;` — kullanılmayan import ağaç sarsmayla silindi, paket **bayt bayt aynı** kaldı | Deney `loadEnv()` **gerçekten çağrılarak** tekrarlandı: 229.320 → 299.370 bayt |
| 33 | `res.on('finish')` ALS bağlamını görüyor mu? | Cevap dinleyicinin nerede kaydedildiğine değil, olayın **nereden emit edildiğine** bağlı. Sentetik `EventEmitter` → `undefined`; gerçek `node:http` → korunuyor | Bağlam istek başlarken **senkron** yakalanıyor, `finish` anında açıkça loglanıyor |
| 40 | Konteyner duman testi `PathError` verdi | Git Bash'in MSYS yol dönüşümü `-e PUBLIC_BASE_PATH=/fms`'i `C:/Program Files/Git/fms`'e çevirdi. Yığın izi Sentry'nin Express sarmalayıcısından geçtiği için hata **rota hatası gibi** göründü | `MSYS_NO_PATHCONV=1` |
| 45 | `sendDefaultPii: false` "hiçbir şey toplama" demek değilmiş | Ölçüldü: `false` ile seçeneği **hiç vermemek birebir aynı**; ikisi de `cookies`/`httpHeaders`/`urlQueryParams` topluyor | Açık `dataCollection` politikası (Karar 17); testler **etkin** değeri okuyor |
| 60 | ROADMAP 2.9 maddesi SAPMA-012 ile çelişiyordu | Sapma kaydı ROADMAP'in **2.2a** maddesini güncellemiş, **2.9** maddesine dokunmamıştı — "spec güncellendi mi" sütunu eksik kalmıştı | 2.9'da yeniden ölçüldü ve satırın altına yazıldı. **Ders: bir sapma kaydı, o iddianın geçtiği HER yeri güncellemeli** |

---

#### 6. Kontroller ve Sonuçları

> **Hepsi 2026-08-26'da, `rm -rf .turbo/cache` sonrası YENİDEN ölçüldü**
> (`spec/11` §12.5). Ara ölçümlerden kopyalanmadı.

| Kontrol | Komut | Sonuç | Süre |
|---|---|---|---|
| Tip kontrolü | `pnpm typecheck` | ✅ 9/9 görev, 0 hata | 4,95 sn |
| Lint | `pnpm lint` | ✅ 0 uyarı (ESLint önbelleği silinerek) | 10,45 sn |
| Biçim | `pnpm format:check` | ✅ tüm dosyalar uyumlu | 1,85 sn |
| Birim testler | `pnpm test:coverage` | ✅ **520/520**, 37 dosya | 9,16 sn |
| Mimari | `pnpm arch:check` | ✅ **8 kural** temiz | **152 ms** |
| Build (soğuk) | `pnpm build` | ✅ 8/8, `0 cached` | 5,16 sn |
| API imajı | `docker buildx build` | ✅ **423 MB** (`docker images` ölçüsü) | — |
| API imajı **çalışıyor** | `docker run` | ✅ `/fms/api/health` **200**, ön ek dışı **404** | — |
| CI | GitHub Actions | ✅ `32918475973` | 1 dk 42 sn |

**Kapsam:** satır **%94,92** (486/512) · ifade **%94,96** (528/556) ·
dal **%90,37** (310/343) · fonksiyon **%96,17** (151/157). Eşik %70.

> ⚠️ **MOTOR EŞİĞİ (%85) BOŞ YERE SAĞLANIYOR — dürüstlük notu.**
> `packages/engine` kapsam raporuna giren tek dosya `index.ts` ve o dosyanın
> **0 ifadesi var** (`export {}`), dolayısıyla `pct: 100` anlamsız bir 100'dür.
> Motorda henüz ürün kodu yok; eşik gerçek anlamını **Faz 22**'de (maç motoru)
> kazanacak. Bugünkü yeşil, motorun test edildiğini **göstermiyor**.

**Paket sızıntı taraması (üretim derlemesi, `grep -F`):**
`pino` 0 · `async_hooks` 0 · `thread-stream` 0 · `zod` 0 · `JWT_SECRET` 0 ·
`DATABASE_URL` 0 · `POSTGRES_PASSWORD` 0 · `__FMS_DEV_PANEL__` 0.
Girmesi beklenenler doğrulandı: `REDACTED` 1 · `x-correlation-id` 1 ·
`api.request` 3. Kaynak haritası `sources`: `server/`, `env.ts`, `pino`,
`log-buffer`, `DebugPanel` → **hiçbiri yok** (160 modül).

**Kontrol deneyi (ROADMAP 2.9 talebi) — bugün yeniden koşuldu:**
`App.tsx`'e `@fms/shared/server` importu konup `loadEnv()` **çağrıldı**.
`typecheck` **GEÇTİ** · `vite build` **BAŞARILI** · paket **391.657** (+70.162) ·
`JWT_SECRET` 2, `DATABASE_URL` 6, `zod` 318 · **yalnızca `arch:check` kırıldı**.
SAPMA-012 bugünkü rakamlarla yeniden doğrulandı.

---

#### 7. Performans Ölçümleri

Bu fazda `docs/spec/09` §11.6 bütçe tablosundan **hiçbir metrik kapsam
içinde değil** (LCP, ekran geçişi, maç simülasyonu — hepsi Faz 6+). Faz 2'nin
ölçtüğü şeyler altyapı boyutları:

| Metrik | Taban | Ölçülen | Durum |
|---|---|---|---|
| Web paketi (ham bayt) | 229.320 (2.2a) | **321.495** | ⚠️ **+%40,2** — %94'ü `@sentry/react` |
| Web paketi (Vite gzip) | — | **104,47 kB** | ℹ️ karşılaştırma **ham bayt** üzerinden yapılır (#26) |
| API imajı | 361 MB (Faz 1) | **423 MB** | ⚠️ +62 MB — `@sentry/node` `node_modules`'ı 29 → 81 MB yaptı |
| `arch:check` | — | **152 ms** | ✅ her faz kapanışında koşulacak kadar ucuz |
| Tam kapı zinciri (soğuk) | — | **~31 sn** | ✅ |
| CI (tek mimari) | ~1 dk 45 sn | **1 dk 42 sn** | ✅ değişmedi |

**Paket artışının dökümü (her adım ayrı ölçüldü):**
229.320 (2.2a) → 232.413 (2.3b, `api.ts` + tarayıcı logger'ı **+3.093**) →
**319.091** (2.5b, `@sentry/react` **+86.678 / %37,3**) → 320.641 (2.6,
`ErrorBoundary` +1.550) → 321.483 (2.7, `assert.ts` +842) → **321.495**
(2.8, +12).

⚠️ **Sentry'nin 86.678 baytı bilinçli kabul edildi.** Alternatifi Sentry'siz
üretim ya da kendi hata toplayıcımızı yazmaktı; ikisi de "hatanın kaynağını 10
saniyede bul" hedefine hizmet etmiyor. Faz 49 (mobil cila) bu rakamı yeniden
değerlendirecek.

⚠️ **§3'teki commit/dosya rakamları faz kaydını yazan commit'i ÖLÇEMEZ** —
Faz 1'in çelişkisi tam buradan doğmuştu (bkz. "Bilinen kayıt düzeltmeleri").
`a474c86..c06e044` aralığı **25 commit, 105 dosya, +12.383/−181** olarak
ölçüldü; kapanış commit'i ve PR birleştirmesi bunun dışındadır.

**Sentry kotası: 3 / 5.000 olay** (%0,06). ⚠️ Bu rakam **kütükten** geliyor,
Sentry panosundan yeniden ölçülmedi: 2.5b'de iki, 2.6'da bir gerçek olay
gönderildi ve üçünün de `event_id`/ingest sonucu kayıtlı. 2.7 ve 2.8'de
**hiç olay gönderilmedi** (denemelerde DSN geçici boşaltıldı).

---

#### 8. Kabul Kriterleri Doğrulaması

- [x] **Kasıtlı bir hata fırlat → Sentry'de `correlationId` ile görünüyor** —
      iki yolla: (a) yerel yakalama sunucusuna karşı zarfın `correlationId`,
      `errorKind`, `release`, `environment` taşıdığı **ham gövde üzerinde**
      assert edildi ve CI'da koşuyor; (b) gerçek Sentry projesine **iki olay,
      her biri tek sefer** — sunucu `EngineError` (`event_id`
      `6995813e6c244248bfed1e438697b156`, ingest **200**, etiketler doğrudan
      olaydan okundu) ve tarayıcı `DataProviderError` (tek zarf, **200**).
      ⚠️ Tarayıcı zarfının **içindeki** etiket doğrudan gözlenmedi (gövde ikili,
      ikinci olay yakmamak için zorlanmadı); birim testleri ve sunucudaki aynı
      etiket şekli dolaylı olarak destekliyor.
- [x] **Aynı `correlationId` ile frontend ve backend logları eşleşiyor** —
      dört halka, gerçek tarayıcı + derlenmiş API ile: tarayıcı üretti →
      konsolunda iki satır taşıdı → `X-Correlation-Id` ile gönderdi, sunucu
      **aynı kimliği geri verdi** → **sunucu logunda aynı kimlikle
      `http.request` satırı**. 2.9'da üretim konteynerine karşı yeniden
      koşuldu: gönderilen kimlik başlıkta geri döndü ve log satırında
      **1 eşleşme**.
- [x] **Debug paneli açılıyor ve canlı log akışı gösteriyor** — geliştirme
      derlemesi `vite preview` ile koşuldu, **gerçek OS düzeyi `Ctrl+Shift+D`**
      paneli açtı; satırlar `api.ts`'ten gerçek `correlationId` ile geldi.
      Üretimdeki **yokluğu iki yönlü** kanıtlandı (nöbetçi 0 + kaynak haritası
      `sources`'ta modül yok; koruma kaldırılınca ikisi de görünüyor).
- [x] **`assertInvariant` dev'de fırlatıyor, prod build'de loglayıp devam
      ediyor** — **iki ayrı derleme alındı ve İKİSİ DE çalıştırıldı**. Üretim:
      veri geldi + `[warn]` satırı. Geliştirme: veri düştü, akış assert'te
      durdu, 0 `[error]`. Statik kanıt: bootstrap çağrısı üretimde
      `te({mode:b.report,report:…})`, geliştirmede `te({mode:b.throw})` —
      tek üçlü ifade derleme zamanında iki farklı dala katlanmış.
      ⚠️ **Ayrım yalnızca tarayıcıda kuruldu** (SAPMA-017); sunucuda varsayılan
      `throw` geçerli ve bu **kanıtlanmış gibi yazılmıyor**, belgelenen bir karar.
- [x] **Performans sarmalayıcısı bütçe aşımında uyarı basıyor** — 1 ms bütçe /
      ~50 ms iş → bildirici **1 kez** çağrıldı, uyarı gerçek pino'dan geçti
      (`level: 40`, `code: perf.budgetExceeded`); 500 ms bütçe → **hiç
      çağrılmadı**. Sahte zamanlayıcı kullanılmadı.

**5 / 5 sağlandı.**

---

#### 9. Oluşturulan / Değişen Önemli Dosyalar

```
packages/shared/src/errors.ts                            [YENİ] 6 hata sınıfı, code+context sözleşmesi
packages/shared/src/logger.ts                            [YENİ] izomorfik arayüz, LogValue dar tipi
packages/shared/src/redact.ts                            [YENİ] alt dize eşleşmeli redaksiyon
packages/shared/src/correlation.ts                       [YENİ] bağımlılıksız uuid v7
packages/shared/src/log-context.ts                       [YENİ] taşınabilir zarf üreticisi
packages/shared/src/event-throttle.ts                    [YENİ] olay kısıtlayıcı
packages/shared/src/telemetry-policy.ts                  [YENİ] açık dataCollection (Karar 17)
packages/shared/src/debug-trace.ts                       [YENİ] K7 — iz üretir, LOGLAMAZ
packages/shared/src/assert.ts                            [YENİ] varsayılan kip `throw`
packages/shared/src/perf.ts                              [YENİ] izomorfik ama MOTORA YASAK
packages/shared/src/server/logger.ts                     [YENİ] pino sarmalayıcısı
packages/shared/src/server/env.ts                        [TAŞINDI] köke sızıntıyı kesti
packages/shared/src/server/context.ts                    [YENİ] AsyncLocalStorage
apps/api/src/instrument.ts                               [YENİ] --import ile yüklenir (Risk R1)
apps/api/src/common/tokens.ts                            [YENİ] bağımlılıksız DI belirteçleri (SAPMA-014)
apps/api/src/common/middleware/correlation.middleware.ts [YENİ]
apps/api/src/common/middleware/request-log.middleware.ts [YENİ] zincirin dördüncü halkası
apps/api/src/common/filters/global-exception.filter.ts   [YENİ] Record<ErrorKind, number>
apps/web/src/lib/api.ts                                  [YENİ] kimlikli fetch kapısı
apps/web/src/lib/logger.ts                               [YENİ] K8'in tek meşru console istisnası
apps/web/src/lib/correlation-context.ts                  [YENİ] Karar 19
apps/web/src/lib/sentry.ts                               [YENİ] tek karar noktalı beforeSend
apps/web/src/lib/log-buffer.ts                           [YENİ] halka tampon — üretimde YOK
apps/web/src/components/ErrorBoundary.tsx                [YENİ] üç katmanlı hiyerarşi
apps/web/src/components/dev/DebugPanel.tsx               [YENİ] dev-only, nöbetçili
packages/engine/src/observability-from-engine.test.ts    [YENİ] K3 kanıtı
tools/arch-check/index.mjs                               [DEĞİŞTİ] 3 → 8 kural
tools/arch-check/arch-check.test.mjs                     [DEĞİŞTİ] kanarya deposu + tablo bütünlüğü
scripts/clean-dist.mjs                                   [YENİ] SAPMA-011
docs/SPEC-COVERAGE-GAPS.md                               [YENİ] altı spec boşluğu (SAPMA-008)
```

---

#### 10. Yeni Açılan Sorun / Borç / Sapma

**Sorun:** SORUN-001 (kapsam K10 eşiğinin altında) — **2.0b'de kapatıldı.**
Şu an açık sorun **yok**.

**Borç:** BORÇ-003 (ErrorBoundary + panel Türkçe metinleri → Faz 5) ·
BORÇ-004 (BullMQ `correlationId` kablolaması → Faz 16) ·
BORÇ-005 (hata gövdesi Türkçe metinleri → Faz 5) ·
BORÇ-006 (Sentry kaynak haritası CI yükleme → Faz 50).

**Sapma:** SAPMA-007 … SAPMA-018 (**on iki yeni kayıt**). Beşi `düzeltme`
(spec iddiası ölçümle çürütüldü), yedisi `karar`.

---

#### 11. Sonraki Faz İçin Devir Teslim

- **Sıradaki faz:** Faz 3 — Veritabanı Şeması I: Dünya Çekirdeği
- **O fazda yapılacaklar (ROADMAP özeti):**
  1. Drizzle şema tanımları + migration altyapısı (16 master tablo)
  2. Master/Delta ayrımının **temeli** — her master tablo salt-okunur işaretli
  3. İndeksler + `pg_trgm` GIN arama indeksi
  4. Seed betiği iskeleti (`tools/data-cli/seed.ts`)
  5. **`testcontainers` entegrasyon test katmanı** (G-03) — "migration up/down
     çalışıyor" iddiası ancak gerçek bir Postgres'e karşı doğrulanabilir
  6. ER diyagramı → `docs/schema/world.md`

- **Bu fazdan taşınan bağlam:**
  - **`arch:check` artık 8 kural denetliyor** ve `packages/db` katmanı yalnızca
    `@fms/shared` import edebilir. Yeni bir bağ gerekirse `LAYER_RULES` **ve**
    `package.json` **birlikte** güncellenir ("izinli" ≠ "çözümlenebilir", #13).
  - **Hata sınıfları hazır:** şema doğrulama hataları `ValidationError`,
    yetim delta gibi değişmez ihlalleri `EngineError`. `assertInvariant`
    varsayılan `throw` kipinde ve motor onu gevşetemez.
  - **`debugTrace` hazır** ama henüz hiçbir ürün kodu üretmiyor. Faz 3'te
    gerek yok; ilk gerçek tüketici Faz 14/20 (AI skorlama).
  - **Loglama kablolu:** `apps/api` ve `apps/worker` `createServerLogger`
    kullanıyor, `correlationId` otomatik taşınıyor. `packages/db` içinde log
    yazılacaksa logger **parametre olarak** alınır.
  - **`clean-dist.mjs` sekiz paketin `build` betiğinde.** Yeni paket eklenirse
    ona da bağlanır, yoksa turbo önbelleği bayat çıktı servis eder.

- **Sıradaki oturumun okuması gereken spec:** `docs/spec/01-database.md` ·
  `docs/spec/09-quality-protocol.md` §11.4 (test katmanları) ·
  `docs/spec/12-data-packs.md` (şema veri paketi anahtarlarını taşıyacak)

- **⚠️ Dikkat edilmesi gerekenler:**
  - **`docs/DEPENDENCY-WATCH.md`'de Faz 3'e vadeli ÜÇ satır var:**
    `drizzle-orm`/`drizzle-kit` (1.0 hattı RC'ydi, GA olduysa değerlendirilecek) ·
    `postgres` Docker imajı **16 → 18** (şema yazılmadan önce majör değişimi
    **bedava**, sonrası dump/restore ister — bu kararın maliyeti Faz 3'te en
    düşük) · `testcontainers` (yeni bağımlılık, **ARM64 uyumu kurulumda
    doğrulanmalı**, K14).
  - **Migration `down` yazmak `up` yazmaktan zordur** ve kabul kriteri ikisini
    de istiyor. `testcontainers` bunun için kuruluyor — sahte bir veritabanına
    karşı "çalışıyor" demek D5 desenidir (test yeşil, üretim kırık).
  - **Master World salt-okunurluğu (K4) TİP SEVİYESİNDE zorlanmalı**, yorumla
    değil. Faz 12'de `WorldMutation` gelecek ama şema o günü **bugünden**
    desteklemeli.
  - `packages/engine` `@fms/db`'yi import **edemez** ve bu `arch:check`'in
    kanaryasında sabitlenmiş durumda. Motor veriyi **parametre olarak** alır.

---

### FAZ 1 — Monorepo, Araç Zinciri ve Kalite Kapıları
**Tarih:** 2026-08-23 → 2026-08-24 · **Süre:** 2 gün · **Durum:** ✅ Tamamlandı
**Dal:** `feature/faz-01-monorepo` · **PR:** #1 → `develop` · **Commit aralığı:** `cb5adcd..1015854` (19 commit)

---

#### 1. Fazın Konusu
Tek satır oyun kodu yazılmadan önce, yanlışı erken bildiren bir zemin kurmak.
Faz 1 kod üretmiyor; **sonraki 49 fazın yanlış yapmasını zorlaştıran** kapıları
kuruyor: tip katılığı, lint, kapsam eşikleri, mimari denetim, konteynerli veri
katmanı, çok mimarili CI. Alt yol (`/fms`) kilidi de burada kapandı — bu proje
için sonradan düzeltilmesi en pahalı hata sınıfı oydu.

#### 2. Yapılması Planlananlar
ROADMAP'teki kapsam maddeleri:
- [x] pnpm workspaces + Turborepo kurulumu
- [x] Klasör yapısı: 8 paket (`apps/*`, `packages/*`, `tools/data-cli`)
- [x] TypeScript `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- [x] ESLint (typescript-eslint strict) + Prettier + import sıralama
- [x] Vitest + kapsam eşiği (%70 global, %85 `packages/engine`)
- [x] Docker Compose: Postgres, Redis, adminer — hepsi `linux/arm64` uyumlu
- [x] CI `linux/amd64` **ve** `linux/arm64` için build alıyor (native runner)
- [x] ARM'da dikkat gerektirenler CI'da doğrulandı
- [x] `.env.example` + Zod ile ortam doğrulama
- [x] Alt yol yapılandırması — `PUBLIC_BASE_PATH` tek kaynak, yedi katman
- [x] `basePath()` yardımcısı + `no-hardcoded-path` ESLint kuralı
- [x] Public repo güvenliği: gizli tarama, push koruması, Dependabot, `.gitignore`
- [x] `LICENSE` (AGPL-3.0)
- [x] GitHub Actions: lint → typecheck → test → build zinciri
- [x] Dal stratejisi: `main` / `develop` / `feature/faz-XX-<slug>`
- [x] `CHANGELOG.md` + `docs/ADR/` klasörü
- [x] **Kapsam dışıydı ama eklendi:** `arch:check` (Ç3 kararı) — spec faz kapanışında
      çalıştırılmasını zorunlu kılıyordu ama hiçbir faz onu kurmuyordu

#### 3. Gerçekte Yapılanlar
- **Eklenen:** 8 workspace paketi · `tsconfig.base.json` + paket başına tsconfig ve
  `tsconfig.build.json` · `eslint.config.js` (flat) + `.prettierrc` ·
  `vitest.config.ts` (`projects[]` + kapsam eşikleri) · `packages/shared`
  (`base-path.ts`, `env.ts` ve testleri) · `tools/eslint-local-rules`
  (`no-hardcoded-path` + testi) · `tools/arch-check` (+ testi) ·
  `scripts/` üç kapı betiği · `docker-compose.yml` + `.prod.yml` iskeleti ·
  minimal `apps/api` (NestJS 11) ve `apps/web` (Vite 8 + React 19) ·
  `apps/{api,web}/Dockerfile` + `Caddyfile` · `.github/workflows/ci.yml` ·
  ADR 0001-0004 · `docs/OUTPUT-FORMAT.md` · `docs/DEPENDENCY-WATCH.md` ·
  `docs/HOSTING-FALLBACK.md` (iskelet)
- **Değiştirilen:** `CLAUDE.md` §2.1 (sürümler), §1.2 (K11/K15), §1.4 (commit
  kadansı), §2.4 (tools/scripts katmanı) · `docs/ROADMAP.md` (alt görev listesi,
  Ç2/Ç4 düzeltmeleri, kabul kriterleri) · `docs/spec/09` §11.4/§11.5 ·
  `docs/spec/11` §12.1/§12.3 · `docs/spec/03` §5.2 · `docs/spec/01` ·
  `docs/SESSION-TEMPLATE.md` · `README.md` · `docs/MASTER-SPEC.md` (arşiv uyarısı)
- **Silinen:** `docs/PROMPT-KITAPCIGI.md` atıfları (dosya kasıtlı olarak repo dışında)
- **Özet:** 86 dosya, +4732 / -77 satır, 18 commit

#### 4. Plandan Sapmalar
| Ne | Plan | Yapılan | Gerekçe |
|---|---|---|---|
| Sürüm kilidi | 2024 bilgisiyle sabit | 28 paket registry'den doğrulandı, bugüne çekildi | Kilit eskimişti; TypeScript kasıtlı olarak 7'ye **çıkarılmadı** (SAPMA-003) |
| `arch:check` | Hiçbir fazda yok | Faz 1.6'ya eklendi | Spec her faz kapanışında çalıştırılmasını istiyordu ama kimse kurmuyordu (Ç3) |
| ANLIK DURUM sıklığı | Faz başına | Alt görev başına | Faz ortası oturum kurtarma güvenilirliği (SAPMA-004) |
| `ioredis`/`bullmq` | 6.x mevcut | 5.x'te kalındı | 3 haftalık majörler, ilk kullanım Faz 16 (BORÇ-001/002) |
| `turbo` kapsamı | Tüm görevler | `lint`/`test`/`arch:check` kök süreçte | Tek yapılandırma + tek süreç daha hızlı; kapsam eşikleri global hesaplanmalı |

#### 5. Karşılaşılan ve Giderilen Hatalar
| # | Hata (belirti) | Kök neden | Çözüm | Tekrar önleme |
|---|---|---|---|---|
| 1 | `engine-strict=true` yazdım, yanlış Node ile kurulum yine geçti | pnpm bu ayarı yalnızca BAĞIMLILIKLARIN `engines` alanına uyguluyor; kök projenin kendi alanı için sadece `[WARN]` | `preinstall` kapısı: `scripts/check-node-version.mjs` | Kapı iki yönde de test edildi (Node 23 → exit 1, Node 24 → geçer) |
| 2 | `Cannot find name 'process'` — `@types/node` kurulu olmasına rağmen | TS 6.0'da `types` varsayılan **boş**; TS 5'te otomatik görünüyordu | Her pakette `types` açıkça yazıldı | `scripts/check-tsconfig-types.mjs` — eksik `types` alanını yakalıyor |
| 3 | Kapsam %91,8 ve yeşil, ama `packages/engine` raporda hiç yok | Vitest 4'te `coverage.all` kaldırıldı; `include` yazılmazsa yalnızca çalıştırılan dosyalar sayılıyor | `coverage.include` açıkça tanımlandı | İki deneyle kanıtlandı (include yok → exit 0, var → exit 1); `spec/09` §11.4'e not |
| 4 | **Kendi tuzağım:** `include` yazdım ama `exclude`'a `**/src/index.ts` koydum → rapor yine yalan söylüyordu | "Sadece re-export" gerekçesi eksik kapsamı gösterecek dosyaları eliyordu | Dışlama kaldırıldı, gerekçe dosyaya yorum olarak yazıldı | Dosyada "bu satır geri eklenmez" notu |
| 5 | `arch:check` "temiz" dedi ama motor `node:fs` import edebiliyordu | `'node:'` öneki `\`${prefix}/\`` ile aranıyordu → `'node:/'`, hiç eşleşmeyen dize | Şema öneki ayrı ele alındı | Regresyon testi yazıldı |
| 6 | Postgres healthcheck "healthy" diyordu ama veritabanı yoktu | `pg_isready` yalnızca "sunucu bağlantı kabul ediyor mu" bakıyor; var olmayan veritabanına da kullanıcıya da exit 0 | `psql -c 'SELECT 1'` | Bozuk kontrolle `unhealthy`'ye düştüğü ve `depends_on`'un engellediği kanıtlandı |
| 7 | Env tutarlılık kontrolü gerçek akışta tetiklenmedi | `dist` bayattı — değişiklik derlenmemişti | Yeniden derleyip tekrarlandı | **Kural: test öncesi `pnpm build`** |
| 8 | Vite `base` uygulanmıyordu; varlık yolu `/assets/` | `new URL('../..', import.meta.url).pathname` Windows'ta `/C:/fms/` üretiyor, `loadEnv` boş dönüyor, `base` sessizce `/` oluyor | `envDir` göreli (`'../..'`) | `PUBLIC_BASE_PATH` okunamazsa derleme **durur** |
| 9 | Üretim paketi 429 kB ve React dev uyarıları içeriyor | `.env`'deki `NODE_ENV=development` Vite'ın üretim kararına uygulanıyor | `NODE_ENV` `.env`'den kaldırıldı | `scripts/check-env-file.mjs`; ölçüm 429 → **228 kB** |
| 10 | **Kapı yanlış şeyi ölçüyordu:** NODE_ENV kontrolünü `vite.config.ts`'e koydum, temiz depoda da hata verdi | Vite derleme sırasında `process.env.NODE_ENV`'i kendisi `'production'` yapıyor, `loadEnv` bunu dosyadan gelmiş gibi birleştiriyor | Kapı dosyanın kendisine bakan betiğe taşındı | "Kırmızı da yanlış şeyi ölçüyor olabilir" |
| 11 | `JWT_SECRET`, `DATABASE_URL`, Zod tarayıcı paketinde | `@fms/shared` barrel'ı sunucu modüllerini de çekiyor, ağaç sarsma yapamıyor | `packages/shared` → `sideEffects: false` | Zod pakette 0 eşleşme; **Faz 2 uyarısı: `logger` girince tekrar bak** |
| 12 | Yerelde 70/70 yeşil, CI'da iki mimaride de kırık | `resolveLayer` `split(sep)` kullanıyordu; `sep` çalışılan platformun ayracı, Linux'ta ters bölü çevrilmiyordu | Her iki ayraç koşulsuz normalize edildi | **CI (Linux) yakaladı** — ADR-0004 üçüncü savunma hattı |
| 13 | ANLIK DURUM'a yazdığım commit hash'i var olmayan bir commit'e işaret ediyordu | Blok kendi commit'inin içinde yazılıyor; hash yazma anında yok, `--amend` hash'i yeniden değiştiriyor | Alan commit **başlığına** çevrildi | Gerekçe `spec/11` §12.3'e yazıldı |
| 14 | Push koruması testi iki kez sessizce "geçti" | Sahte `ghp_` PAT sağlama toplamına uymuyor; `AKIAIOSFODNN7EXAMPLE` AWS'nin resmi örneği, GitHub izin listesinde | Örnek olmayan AWS çiftiyle tekrarlandı | Ayar API'den doğrulandı (`push_protection: enabled`) — testin yanlış olduğu böyle anlaşıldı |
| 15 | `git add -A` kullanıcının denetim çıktısını commit'e soktu | Toplu stage | Takipten çıkarıldı, `.gitignore`'a eklendi | **Kural: alt görev commit'lerinde açık dosya yolu** |

#### 6. Kontroller ve Sonuçları
| Kontrol | Komut | Sonuç |
|---|---|---|
| Tip kontrolü | `pnpm typecheck` | ✅ 8/8 paket, 0 hata |
| Lint | `pnpm lint` | ✅ 0 hata |
| Biçim | `pnpm format:check` | ✅ temiz |
| Birim testler | `pnpm test` | ✅ **70 test / 4 dosya** |
| Kapsam | `pnpm test:coverage` | ✅ satır %92,7 · ifade %91,8 · dal %82,7 · fonksiyon %85,7 (eşik %70 / motor %85) |
| Mimari | `pnpm arch:check` | ✅ 0 ihlal |
| Build | `pnpm build` | ✅ 8/8 paket |
| Veri katmanı | `docker compose ps` | ✅ postgres + redis **healthy** |
| CI | koşu `32675147102` | ✅ dört iş de başarılı (amd64 + arm64) |
| İmajlar | `docker buildx build` + duman testi | ✅ api 361 MB, web 89 MB; x86_64 ve **aarch64** |

#### 7. Performans Ölçümleri
| Metrik | Bütçe | Ölçülen | Durum |
|---|---|---|---|
| `pnpm lint` (soğuk / sıcak) | — | 3,0 sn / **1,7 sn** | ℹ️ Faz 20 karşılaştırma tabanı (8 paket, iskelet) |
| `pnpm arch:check` | — | **~54 ms** | ℹ️ |
| `pnpm build` (turbo cache) | — | **37 ms** (8/8 cached) | ✅ |
| CI toplam | — | **~1 dk 27 sn** (kalite 38/31 sn, imaj 46/33 sn) | ✅ |
| Web üretim paketi | LCP < 2,5 sn için | **228 kB / 73 kB gzip** (429 kB'den düşürüldü) | ✅ |
| İmaj boyutları | — | api 361 MB · web 89 MB | ℹ️ |

Faz 1'de LCP/FPS gibi ürün bütçeleri henüz ölçülebilir değil (ekran yok).
Tam liste: `docs/spec/09-quality-protocol.md` §11.6.

#### 8. Kabul Kriterleri Doğrulaması
- [x] `docker compose up` → Postgres ve Redis sağlıklı — **1.7**: ikisi de `healthy`; bozuk kontrolle `unhealthy`'ye düştüğü ve `depends_on`'un adminer'ı engellediği ayrıca kanıtlandı
- [x] `pnpm install && pnpm build` → tüm paketler hatasız — **1.2**: 8/8, ikinci koşu FULL TURBO
- [x] `pnpm typecheck` → 0 hata — **1.2**: `types` kapısı dahil
- [x] Kasıtlı tip hatası CI'ı kırmızıya döndürüyor — **1.9**: koşu `32675264530`, iki mimaride `error TS2322`, imaj işi `skipped`; kanıt dalı silindi
- [x] Eksik `.env` ile uygulama açılmıyor, net hata veriyor — **1.9**: konteynerde exit 1 + "DATABASE_URL — tanımlı değil / Ne işe yarar / Örnek / .env.example"
- [x] `docker buildx` amd64 + arm64 üretiyor, ikisi de çalışıyor — **1.9**: native runner, `uname -m` → `x86_64` / `aarch64`, ikisinde de HTTP duman testi
- [x] Uygulama `/fms` altında çalışıyor; `PUBLIC_BASE_PATH` değişince her yer uyuyor — **1.8**: `/oyun`a çevrilip **tarayıcıda** yedi katmanın uyduğu doğrulandı, `/fms/*` 404 oldu
- [x] Kodda mutlak yol yazılınca ESLint hata veriyor — **1.4**: `local/no-hardcoded-path`, 23 senaryoluk kendi testi
- [x] Sır push edilmeye çalışılınca push koruması engelliyor — **1.10**: `remote rejected ... push declined due to repository rule violations`, AWS Access Key ID + Secret Access Key desenleri yakalandı

**9/9 sağlandı.**

#### 9. Oluşturulan / Değişen Önemli Dosyalar
```
pnpm-workspace.yaml            [YENİ] workspace + sürüm kataloğu
turbo.json                     [YENİ] build/typecheck/dev (lint ve test kökte)
tsconfig.base.json             [YENİ] strict + TS 6 notları
eslint.config.js               [YENİ] tek kök flat config
vitest.config.ts               [YENİ] projects[] + coverage.include + eşikler
docker-compose.yml             [YENİ] postgres/redis/adminer + healthcheck
.github/workflows/ci.yml       [YENİ] amd64 + arm64, kalite + imaj
packages/shared/src/base-path.ts   [YENİ] alt yol TEK KAYNAK
packages/shared/src/env.ts         [YENİ] Zod + Türkçe eyleme dönük hata
tools/eslint-local-rules/          [YENİ] no-hardcoded-path + testi
tools/arch-check/                  [YENİ] katman/motor/harf/varlık denetimi + testi
scripts/check-node-version.mjs     [YENİ] Node kapısı
scripts/check-tsconfig-types.mjs   [YENİ] TS 6 types kapısı
scripts/check-env-file.mjs         [YENİ] .env NODE_ENV kapısı
apps/api/src/{main,app.module,health.controller}.ts  [YENİ] minimal API
apps/web/{vite.config.ts,index.html,src/*}           [YENİ] minimal web
apps/{api,web}/Dockerfile          [YENİ] çok mimarili imajlar
docs/ADR/0001..0004                [YENİ] monorepo · alt yol · TS kilidi · ortam
docs/OUTPUT-FORMAT.md              [YENİ] rapor formatı
docs/DEPENDENCY-WATCH.md           [YENİ] sürüm takibi
docs/HOSTING-FALLBACK.md           [YENİ] iskelet
CLAUDE.md                          [DEĞİŞTİ] §1.2 K11/K15, §1.4, §2.1, §2.4
docs/spec/{01,03,09,11}            [DEĞİŞTİ] Ç4 ayrımı, coverage şartı, hafıza ritmi
docs/MASTER-SPEC.md                [DEĞİŞTİ] "donmuş arşiv, otorite değil" uyarısı
```

#### 10. Yeni Açılan Sorun / Borç / Sapma
- **BORÇ-001** — `ioredis` 5.11.1'de tutuldu (6.x → Faz 16)
- **BORÇ-002** — `bullmq` 5.81.3'te tutuldu (6.x → Faz 16)
- **SAPMA-003** — sürüm kilidi registry doğrulamasıyla güncellendi; TypeScript bilinçli olarak 7'ye çıkarılmadı
- **SAPMA-004** — ANLIK DURUM alt görev başına güncelleniyor
- **SAPMA-005** — ADR-0004 §2'deki harf duyarlılığı iddiası ölçümle çürütüldü
- **SAPMA-006** — Express 5 joker rota varsayımı kısmen yanlıştı (çökmüyor, dönüştürülüyor)
- Açık sorun: **yok**

#### 11. Sonraki Faz İçin Devir Teslim
- **Sıradaki faz:** Faz 2 — Hata Kontrol ve Gözlemlenebilirlik Protokolü
- **O fazda yapılacaklar:** Pino yapılandırılmış loglama · `correlationId`/`turnId`/`saveId`
  zinciri · NestJS global exception filter + tipli hata sınıfları · Sentry ·
  frontend `ErrorBoundary` hiyerarşisi · Geliştirici Hata Ayıklama Paneli ·
  `debugTrace` altyapısı · `assertInvariant` · performans ölçüm sarmalayıcısı
- **Okunacak spec:** `docs/spec/09-quality-protocol.md` §11.1/§11.2, `CLAUDE.md` K7/K8
- **Bu fazdan taşınan hazır altyapı:** 8 paketlik workspace, tip/lint/test/kapsam/mimari
  kapıları, iki mimaride yeşil CI, konteynerli veri katmanı, çalışan minimal API+web
- **⚠️ Faz 2'de mutlaka kontrol edilecekler:**
  1. **Bundle sızması.** 1.8'de `@fms/shared` barrel'ı Zod + env şemasını tarayıcı
     paketine taşıyordu; `sideEffects: false` ile çözüldü. Faz 2'de `logger` (pino,
     Node-only) aynı pakete giriyor — **aynı sorun daha büyük ölçekte tekrar edebilir.**
     Faz 2 sonunda `apps/web/dist/assets/*.js` içinde pino/Node modülü var mı bak.
     Gerekirse `@fms/shared/server` alt yol dışa aktarımına geçilir.
  2. `packages/shared/tsconfig.json` `types: ["node"]` taşıyor ama `apps/web` `types: []`.
     Logger eklenince tarayıcı tarafının Node tipi görmediğinden emin ol.
  3. `env.ts` içindeki iki `process.stderr.write` TODO'su logger'a taşınacak.
  4. `base-path.ts` içindeki `TypeError` `ValidationError`'a taşınacak (`errors.ts`).
  5. **DEPENDENCY-WATCH'ta Faz 2'ye bağlı üç satır var:** `pnpm` 11.23.0, `pino` 10,
     `@sentry/*` 10 — faz açılışında okunacak.
- **Dikkat:** `console.log` ESLint'te yasak; logger geldiğinde `arch:check` bu kuralı
  **tekrarlamayacak** (iş bölümü `docs/spec/09` §11.5'te tablo halinde).

---

### FAZ 0 — Belge Bölme ve Repo Kurulumu
**Tarih:** _(doldurulacak)_ · **Durum:** ✅ Tamamlandı

#### 1. Fazın Konusu
Ana spesifikasyon belgesi (111 bin karakter) tek parça halinde her oturumda okunamayacak
kadar büyüktü. Bağlam israfını önlemek için anayasa `CLAUDE.md`'ye, derin spesifikasyonlar
`docs/spec/` altına bölündü. Ayrıca oturumlar arası süreklilik için `PROJECT_MEMORY.md`
kuruldu.

#### 2. Yapılması Planlananlar
- [x] `ana-prompt.md` Bölüm 0.1'deki haritaya göre bölünsün
- [x] `CLAUDE.md` oluşturulsun (Bölüm 1 + 2 + 14)
- [x] `docs/spec/01..11` oluşturulsun
- [x] `docs/ROADMAP.md` oluşturulsun
- [x] `docs/V2-BACKLOG.md` oluşturulsun
- [x] `docs/SESSION-TEMPLATE.md` oluşturulsun
- [x] `PROJECT_MEMORY.md` başlatılsın

#### 3. Gerçekte Yapılanlar
- **Eklenen:** Tüm belge yapısı (aşağıdaki dosya listesi)
- **Değiştirilen:** —
- **Silinen:** —

#### 4. Plandan Sapmalar
Sapma yok.

#### 5. Karşılaşılan ve Giderilen Hatalar
Yok — bu faz yalnızca belge organizasyonu.

#### 6. Kontroller ve Sonuçları
| Kontrol | Sonuç |
|---|---|
| Tüm 16 bölüm doğru dosyalara ayrıştı mı | ✅ |
| Kod bloğu bütünlüğü (açılış/kapanış çiftleri) | ✅ |
| Bölüm içi çapraz referanslar tutarlı mı | ✅ |
| Dosya haritası ile gerçek dosyalar eşleşiyor mu | ✅ |

#### 7. Performans Ölçümleri
Bu fazda performans bütçesi yok.

#### 8. Kabul Kriterleri Doğrulaması
- [x] `CLAUDE.md` ~20 bin karakter — her oturumda yüklenebilir boyutta
- [x] Her spec dosyası bağımsız okunabilir
- [x] `docs/MASTER-SPEC.md` tam arşiv olarak korundu

#### 9. Oluşturulan / Değişen Önemli Dosyalar
```
CLAUDE.md                          [YENİ] Anayasa + yığın + sözlük
PROJECT_MEMORY.md                  [YENİ] Bu dosya
docs/ROADMAP.md                    [YENİ] 50 faz + v2 kasası
docs/SESSION-TEMPLATE.md           [YENİ] Oturum akışı
docs/V2-BACKLOG.md                 [YENİ] Kapsam dışı kasa
docs/MASTER-SPEC.md                [YENİ] Tam arşiv
docs/spec/01-database.md           [YENİ]
docs/spec/02-attributes.md         [YENİ]
docs/spec/03-match-engine.md       [YENİ]
docs/spec/04-ai-scoring.md         [YENİ]
docs/spec/05-design-system.md      [YENİ]
docs/spec/06-dialogue.md           [YENİ]
docs/spec/07-country-rules.md      [YENİ]
docs/spec/08-admin-panel.md        [YENİ]
docs/spec/09-quality-protocol.md   [YENİ]
docs/spec/10-deployment.md         [YENİ]
docs/spec/11-project-memory.md     [YENİ]
docs/spec/12-data-packs.md         [YENİ] Veri paketi formatı, gerçek varlık hattı
docs/PROMPT-KITAPCIGI.md           [YENİ] Ateşleme / faz / kurtarma promptları
```

#### 10. Yeni Açılan Sorun / Borç / Sapma
- SAPMA-001 kayda geçirildi (spesifikasyon yazımı sırasında oluşmuştu, geriye dönük kayıt).

#### 11. Sonraki Faz İçin Devir Teslim
- **Sıradaki faz:** Faz 1 — Monorepo, Araç Zinciri ve Kalite Kapıları
- **O fazda yapılacaklar:**
  1. pnpm workspaces + Turborepo kurulumu, klasör yapısı
  2. TypeScript strict + ESLint + Prettier + Vitest
  3. Docker Compose (Postgres 16, Redis 7) — ARM64 uyumlu
  4. `PUBLIC_BASE_PATH=/fms` alt yol yapılandırması + `basePath()` yardımcısı + ESLint kuralı
  5. GitHub Actions CI (lint → typecheck → test → build, amd64 + arm64)
  6. Public repo güvenliği: gizli tarama, push koruması, Dependabot, `.gitignore`
  7. `LICENSE` (AGPL-3.0)
- **Bu fazdan taşınan bağlam:** Belge yapısı hazır. Faz 1'de kod yazmadan önce
  `docs/spec/09-quality-protocol.md` okunmalı — kalite kapıları oradan geliyor.
- **Okunacak spec:** `docs/spec/09-quality-protocol.md`, `CLAUDE.md` Bölüm 2
- **Dikkat:** Faz 1 ve Faz 2 (gözlemlenebilirlik) **kod yazılmadan önce** gelir. Bu bilinçli:
  `correlationId` zinciri sonradan eklenirse işe yaramaz.
