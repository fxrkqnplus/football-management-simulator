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
| **Aktif faz / alt görev** | **FAZ 3 — Veritabanı Şeması I: Dünya Çekirdeği · 3.0 BİTTİ** (11 alt görevden 1'i) |
| **Son tamamlanan** | ✅ **3.0 — Bağımlılık kararları ve `packages/db` migration kablolaması.** Altı karar da ölçümle verildi |
| **Tarih** | 2026-08-26 |
| **Genel ilerleme** | **2 / 50 faz (%4)** — Faz 3 sürüyor |
| **Bloke eden var mı?** | Hayır. ⚠️ Ama **plan revizyonu onay bekliyor**: `drizzle-kit` `down` migration ÜRETMİYOR (ölçüldü), 3.2 bir `down` katmanı + kendi koşucumuzu gerektiriyor → 3.2a/3.2b bölünmesi öneriliyor |
| **Son commit** | `feat(db): drizzle + testcontainers kurulumu, Postgres 18 ve collation kararları` |
| **Dallar** | `main` → `develop` → **`feature/faz-03-database`** (3.0'da açıldı). Faz 2 → PR #3 ✅ **merge edildi** 2026-08-26T01:58Z, merge commit `c97ebd0`. Faz 3 PR'ı faz sonunda açılacak. |
| **CI** | ✅ Faz 2 kapanış koşuları **işlendi**: `32920287739` · `32920409271` · PR #3 `32920412520` · `develop` merge `32920960769` — dördü de başarılı. ✅ **3.0 koşusu `32970730618` BAŞARILI** — dört iş de yeşil: *Kalite kapıları (amd64)* · **(arm64)** · *İmaj (amd64)* · *(arm64)*. ⚠️ **arm64 işi burada özellikle önemli:** yerelde Docker Desktop `windows/amd64` olduğu için `testcontainers`in ARM64 uyumu native kanıtlanamıyordu; temiz bir arm64 kurulumu yeni `allowBuilds` politikasıyla **gerçekten** koştu (K14). |
| **typecheck / lint / format / build / arch** | ✅ hepsi yeşil — **3.0 sonunda soğuk ölçüldü** (`rm -rf .turbo/cache` + ESLint önbelleği). typecheck 9/9 `0 cached` · build 8/8 `0 cached` · arch **8 kural**, 163 ms |
| **install** | ✅ `pnpm install` **exit 0** — ⚠️ 3.0'da **exit 1'e düşmüştü**, `allowBuilds` ile düzeltildi. İki yönlü negatif testle kanıtlandı (`--force` ile: ayar yok → exit 1, var → exit 0) |
| **test** | ✅ **520 test / 37 dosya** (3.0 test eklemedi — bağımlılık/yapılandırma alt görevi) |
| **kapsam** | ✅ satır **%94,92** · ifade %94,96 · dal %90,37 · fonksiyon **%96,17** — eşik %70. ⚠️ Motor eşiği (%85) **boş yere** sağlanıyor (`packages/engine` 0 ifade, Faz 22'de anlam kazanır). ⚠️ **`packages/db` kapsamı da bu fazda KANIT SAYILMAYACAK:** Drizzle şema dosyalarını import etmek kapsamı %100 yapar, hiçbir iddia doğrulanmadan — aynı sınıf yalan |
| **Veritabanı** | **PostgreSQL 18.6** (16.15'ten yükseltildi, SAPMA-019) · `builtin`/`C.UTF-8` locale (SAPMA-020) · bağlama noktası `pgdata:/var/lib/postgresql` (18'de **değişti**) · `pg_trgm` 1.6 mevcut · `docker compose up -d` → **healthy**, işlevsel olarak doğrulandı |
| **Web paketi** | **321.495 bayt** (ham) — 3.0'da değişmedi (tarayıcı kodu eklenmedi) |
| **API imajı** | **423 MB** — Faz 2 kapanış ölçümü, 3.0'da yeniden ölçülmedi (`apps/api` değişmedi) |
| **Araç zinciri** | Node 24.19.0 · pnpm 11.23.0 · **drizzle-orm 0.45.2 + drizzle-kit 0.31.10** (tam sürüm, `^` yok) · **testcontainers + @testcontainers/postgresql 12.1.0** · jsdom 30.0.1 · pino 10.3.1 · @sentry/* 10.70.0 |
| **Açık sorun sayısı** | **0** |
| **Teknik borç sayısı** | **6** — BORÇ-001, BORÇ-002, BORÇ-004 (Faz 16) · BORÇ-003, BORÇ-005 (Faz 5) · BORÇ-006 (Faz 50) |
| **SAPMA sayısı** | **20** (SAPMA-001…020) — 3.0'da iki yeni kayıt (019 Postgres 18, 020 collation) |
| **Faz 3 kabul kriterleri** | 1 ⏳ (3.2) · 2 ⏳ (3.8) · 3 ⏳ (3.9) · 4 ⏳ (3.9) · 5 ⏳ (3.10) — **0/5**, hiçbiri henüz sağlanmadı |
| **Sentry kotası** | **3 / 5.000 olay** (%0,06). ⚠️ Kütükten geliyor, panodan yeniden ölçülmedi. 3.0'da hiç olay gönderilmedi. |

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

### 🎯 SIRADAKİ ALT GÖREV — 3.1 (Şema kapsam mutabakatı)

⚠️ **ÖNCE: plan revizyonu onay bekliyor.** 3.0'da ölçüldü — `drizzle-kit` `down`
migration **üretmiyor**. 3.2'nin kapsamı buna göre büyüyor (aşağıda). Kullanıcı
kararı gelmeden 3.2'ye geçilmez; **3.1 bundan bağımsız ve başlanabilir.**

**3.1'in üç ölçümü (tahmin edilmeyecek):**

1. **`competition_seasons` (b) — tarihsel sezon verisi.** `spec/01` ve `spec/12`
   bunu gerçekten istiyor mu? ROADMAP **Faz 8** kulüp detay ekranı maddesi ne
   diyor? İstiyorsa hangi tablo taşıyacak, Faz 3'te mi Faz 8'de mi?
   ((a) aktif sezon örneği save'e özel → Faz 3 dışı; yeri Faz 12 mi Faz 16 mı,
   gerekçesiyle karara bağlanacak.)
2. **`key` benzersizliği global mi, tablo başına mı?** `spec/12` §17.3'teki slug
   algoritması `galatasaray`'ı bir kulüp, bir stadyum ve bir yarışma için **aynı
   anda** üretebilir mi? Algoritma okunup örnekle sınanacak.
3. **İleri FK etkisi.** `people` Faz 4'te; `federations.presidentPersonId`,
   `clubs.chairmanPersonId`, `referees.personId` sütunları Faz 3'te
   **yazılmayacak** (ROADMAP'te karara bağlandı) — bunun `docs/schema/world.md`
   iskeletine nasıl not düşüleceği.

**Ayrıca 3.1'de:** `SPEC-COVERAGE-GAPS.md`'ye **G-09** (`asset_index`, Faz 7)
yazılır · `docs/schema/world.md` iskeleti açılır · Faz 3 CI koşularının sonucu
ANLIK DURUM'a işlenir.

---

### ⚠️ 3.0'DAN ÇIKAN VE 3.2'Yİ DEĞİŞTİREN BULGU

`drizzle-kit@0.31.10` **yalnızca ileri yönlü** migration üretiyor. Kanıt ve tam
ölçüm: `docs/spec/01-database.md` **§3.0**. Özet:

- Komut listesinde `down` yok (`up` = dosya formatını yükseltir, `drop` =
  journal'dan siler — ikisi de "geri al" değil), `generate --help`'te `--down` yok
- İki migration gerçekten üretildi, çıktı: `NNNN_ad.sql` (ileri) +
  `meta/NNNN_snapshot.json` + `meta/_journal.json`

**Ama `down` körlemesine yazılmayacak:** her adımın `meta/NNNN_snapshot.json`
dosyası şemanın o adımdan sonraki **tam, makine-okunur** hâlini tutuyor ve
`prevId` ile zincirleniyor. N'inci migration'ın `down`u = snapshot N → N−1 farkı;
round-trip testinin beklediği durum da **snapshot N−1'in kendisi**.

**Sonuç — 3.2 büyüyor:** drizzle'ın `migrate()`i yalnızca ileri gidiyor, yani
`down` için kendi koşucumuz gerekiyor. Önerilen bölünme **3.2a** (migration
koşucusu: journal okuma, takip tablosu, up+down, `testcontainers` hattı) /
**3.2b** (round-trip kanıtı + negatif testler). Karar kullanıcıda.

---

### 📌 3.0'DAN TAŞINAN, SONRAKİ ALT GÖREVLERİ BAĞLAYAN KISITLAR

- **Entegrasyon testi ayrı komut olmalı — ölçülmüş sebep:** `testcontainers` ile
  tek Postgres konteyneri **5.592 ms**'de kalkıyor. Birkaç test dosyası kapı
  koşusunu saniyelerden dakikalara çıkarır. ⚠️ Ve o komut **faz kapanış listesine
  yazılmalı** (`docs/spec/09` §11.5) — yazılmazsa hiç koşulmaz, G-01'in birebir
  aynı hatası.
- **Sürücü seçimi 3.2'ye BIRAKILDI** (`pg` mi `postgres.js` mi). 3.0'ın kapsamı
  bağımlılık *kararlarıydı* ve `drizzle-kit generate` sürücüsüz çalışıyor;
  sürücüyü bugün seçmek 3.2'nin işine girmek olurdu (K12).
- **`drizzle.config.ts` `packages/db` kökünde** ve `dbCredentials` **yok** —
  3.2'de koşucu yazılırken tamamlanacak.
- **`packages/db/drizzle.config.ts` ESLint'te `allowDefaultProject`'e eklendi.**
  `apps/web` emsali (tsconfig `include`) burada çalışmıyor: `rootDir: "src"`
  kısıtı TS6059 veriyor. Yeni bir paket kökü yapılandırma dosyası gelirse aynı
  yere eklenir.
- **`allowBuilds` politikası kuruldu.** Yeni bir bağımlılık kurulum betiği
  getirirse `pnpm-workspace.yaml`'a **açık** satır yazılır; varsayılan `false`.
  Ayrıntı: ORTAM TUZAKLARI ⑫.

---

### 🔬 ÖLÇÜM DİSİPLİNİ — FAZ 2'NİN EN PAHALI DERSLERİ (kalıcı blok)

> Faz 2'nin 59 satırlık günlüğü faz kaydı §5'te altı desene indirgendi. İkisi
> her fazda geçerli ve burada kalıyor; gerisi için faz kaydına bakınız.

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

**Kural sayısı: 8** (kaynak: `runArchCheck` içinde basılan `rule:` belirteçleri)

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

| #   | Alt görev | Hata (belirti)                                                                                                                                                                                                | Kök neden                                                                                                                                                                            | Çözüm                                                                                                                                                    | Tekrar önleme                                                                                                                                                        |
| --- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6   | 3.0       | `pnpm lint` kırıldı: `drizzle.config.ts was not found by the project service`                                                                                                                                  | Dosya paket kökünde, hiçbir tsconfig'in `include`'unda değil; `allowDefaultProject` yalnızca **kök** `*.config.ts` eşliyordu                                                            | `apps/web` emsali (`include`'a ekle) denendi → **TS6059, `rootDir: "src"` dışında**. `apps/web`i Vite derliyor, `packages/db`yi `tsc`. ESLint tarafından çözüldü | Negatif test: dosyaya `any` + `console.log` konup lint'in **2 hata** verdiği, geri alınca temizlendiği ölçüldü. Emsal kopyalamadan önce "aynı koşullar mı?" sorulur      |
| 5   | 3.0       | Sonda dosyaları `packages/db/packages/db/` altına yazıldı                                                                                                                                                       | Bash aracının **çalışma dizini çağrılar arasında kalıcı**; önceki `cd packages/db`'den sonra göreli yol oradan çözüldü                                                                  | Dizin silindi, dosyalar mutlak yolla yeniden yazıldı                                                                                                        | **Dosya yazarken her zaman mutlak yol.** `pwd` çıktısı varsayılmaz                                                                                                     |
| 4   | 3.0       | `allowBuilds` negatif testi **yanlış NEGATİF** verdi: ayar kaldırıldı, `pnpm install` yine exit 0                                                                                                              | Karar `node_modules/.modules.yaml` (`ignoredBuilds`) içinde **önbelleğe alınmıştı**; kapıyı tutan yapılandırma değil önbellekti                                                         | Test `pnpm install --force` ile tekrarlandı: ayar yok → **exit 1**, ayar var → **exit 0**                                                                    | D2. Bir negatif test "kırılmadı" diyorsa **önce aracın durumu** sorgulanır. `.modules.yaml` `.gitignore`'da — yerel geçmek CI'ın geçeceğini göstermez                    |
| 3   | 3.0       | `ignoredBuiltDependencies: [esbuild]` yazıldı, kurulum **hâlâ** exit 1; `onlyBuiltDependencies: []` eklendi, yine exit 1                                                                                        | pnpm 11'de bu anahtarlar **LEGACY** ve sessizce yok sayılıyor (`LEGACY_BUILD_SETTINGS`, pnpm dağıtımından okundu). Yerine `allowBuilds: {paket: bool}` geldi                            | `allowBuilds` haritası yazıldı, `pnpm-workspace.yaml`'da gerekçesiyle sabitlendi                                                                            | Bir ayar yazıldığı hâlde davranış değişmiyorsa **aracın kendi kaynağına** bakılır. Yazılmış ama hiçbir şey yapmayan ayar = sessiz kapı                                  |
| 2   | 3.0       | `pnpm install` **exit 1** — `ERR_PNPM_IGNORED_BUILDS` (`esbuild` ×3)                                                                                                                                            | `drizzle-kit` üç esbuild sürümü getirdi; pnpm 11 karara bağlanmamış kurulum betiği kalırsa kurulumu **kırıyor**. Karar `.gitignore`'daki `.modules.yaml`'da saklanıyor, yani CI da kırılırdı | Üç sürümün de betiksiz çalıştığı **ölçüldü**, `allowBuilds: {esbuild: false}` yazıldı                                                                       | Yeni bağımlılık kurulum betiği getirirse `pnpm-workspace.yaml`'a **açık** satır eklenir; varsayılan `false`                                                            |
| 1   | 3.0       | `pnpm install` izlenen bir dosyayı **kendisi değiştirdi**: `pnpm-workspace.yaml`'a `allowBuilds: {esbuild: set this to true or false}` iskeleti yazdı. Fark edilmeden ikinci bir blok eklenince YAML çift anahtar hatası verdi | pnpm'in `approve-builds` akışı iskeleti otomatik yazıyor                                                                                                                              | Dosya tek bloğa indirildi                                                                                                                                   | **`pnpm install` sonrası `git diff pnpm-workspace.yaml`.** Bir kurulum komutu izlenen dosyayı değiştirebilir                                                           |

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
