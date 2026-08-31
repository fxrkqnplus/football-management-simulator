# FOOTBALL MANAGEMENT SIMULATOR
## 50 Fazlık Detaylı Yol Haritası + v2 Kasası (14 Faz)
### Sürüm 1.0 — Kilitlenmiş Kararlara Göre

---

# BÖLÜM 0 — KİLİTLENEN KARARLAR ÖZETİ

## 0.1 Mimari Konumlandırma

| Konu | Karar |
|---|---|
| Dağıtım modeli | **Kişisel kurulum.** Sunucu `SERVER_MODE=private` ile açılır — yalnızca izin listesindeki hesaplar oynar. Public'e geçiş bilinçli bir karardır. |
| Veri modu | **`DATA_MODE=full`** — gerçek armalar, portreler, isimler, formalar, stadyumlar |
| Çalışma şekli | Docker Compose (Postgres + Redis + API + Web + Worker + Caddy) |
| Barındırma | **Oracle Cloud Always Free** — Ampere A1 ARM, 2 OCPU / 12 GB RAM / 200 GB disk / 10 TB egress |
| Bölge | `eu-frankfurt-1` (TR'ye en düşük gecikme + ARM kapasitesi en rahat bulunan bölge) |
| Alan adı | **`fxrkqn.org/fms`** — alt yol (subpath) dağıtımı, alt alan adı değil |
| Ön katman | Cloudflare (`fxrkqn.org`) — proxy, TLS, CDN, DDoS, WAF, Turnstile |
| Sunucu modları | **Public / Özel / Bakım** — admin panelinden anlık değiştirilebilir |
| Repo | **Public** (GitHub Actions sınırsız dakika; sır yönetimi ve gizli tarama zorunlu) |
| Beklenen ölçek | 1–5 aktif kullanıcı. Kotalar yine de uygulanır (açık kayıt = öngörülemez trafik). |
| Aylık maliyet | **$0** |
| Erişim | Her yerden HTTPS, PWA olarak ana ekrana eklenir |
| Kayıt | Açık (e-posta doğrulama + Turnstile), ancak Özel modda kayıt olan oynayamaz |
| Sunucu otoritesi | **Korunuyor** — tüm oyun mantığı sunucuda |
| Anti-hile | **v1'e çekildi** — deterministik tohum, audit log, rate limiting, anomali tespiti, moderasyon paneli |
| Liderlik tablosu | **Herkese açık**, prestij kategorili + zorluk normalizasyonlu |
| Yasal | KVKK/GDPR metinleri v1'de **yazılır ama Özel modda gösterilmez**. Public moda geçilirse aktive edilir. |
| Para modeli | Ücretsiz, asla ücretli olmayacak |

## 0.1b Ücretsiz Yığın — Servis Haritası

| Katman | Servis | Ücretsiz limit | Yeterli mi? |
|---|---|---|---|
| Sunucu | Oracle Cloud Always Free A1 (ARM) | 2 OCPU / 12 GB / 200 GB / 10 TB egress | ✅ Süresiz |
| Veritabanı | **Kendi sunucumuzda Postgres 18** | 200 GB disk içinde | ✅ Yönetilen ücretsiz Postgres'ler (Supabase 500 MB, Neon 0.5 GB) **yetersiz** |
| Redis | Kendi sunucumuzda | — | ✅ |
| Frontend | **Origin konteyneri (Caddy arkası)** | Oracle A1 içinde | ✅ `/fms` bir ALT YOL; aynı hostname'in alt yolunu Pages'e kırmak Workers akrobasisi gerektirir ve hiçbir şey kazandırmaz. Statik varlıklar Cloudflare önbellek kuralıyla hızlandırılır. |
| CDN / TLS / DDoS / WAF | Cloudflare proxy | Ücretsiz plan | ✅ |
| Bot koruması | Cloudflare Turnstile | Sınırsız | ✅ |
| Görsel varlıklar | Cloudflare R2 | 10 GB, 1M yazma, 10M okuma/ay, **sıfır egress** | ✅ ~15.000 portre + arma ≈ 2–4 GB |
| Alan adı | Sizde mevcut | — | ✅ |
| E-posta (doğrulama) | **Resend** | 3.000 e-posta/ay, 100/gün | ✅ |
| Hata izleme | Sentry | 5.000 olay/ay | ✅ |
| CI/CD | GitHub Actions | **Sınırsız** (public repo) | ✅ |
| Yedekleme | Cloudflare R2 | 10 GB içinde | ✅ |

**Toplam: $0/ay.**

### Bilinen riskler ve azaltmalar

| Risk | Gerçek | Azaltma |
|---|---|---|
| Oracle limit düşürdü | **15 Haziran 2026'da duyurusuz olarak 4 OCPU/24 GB → 2 OCPU/12 GB'a indirildi.** Tekrar edebilir. | Tüm sistem Docker Compose. Otomatik yedek R2'de. Başka bir VPS'e taşınma < 1 saat. Alternatif ücretsiz seçenekler `docs/HOSTING-FALLBACK.md`'de listeli. |
| ARM kapasitesi | Yoğun bölgelerde "Out of host capacity" hatası yaygın. | Frankfurt genellikle dakikalar içinde açılıyor. Açılmazsa fault domain değiştir, farklı saatlerde dene. |
| Kredi kartı doğrulaması | Oracle kimlik doğrulaması için kart ister ($1 geçici blokaj, çekim yok). | Kaçınılmaz. Sanal kart kullanılabilir. |
| Boşta kalan instance geri alınması | Oracle boştaki Always Free instance'ları geri alabiliyor. | Bizim sunucu boşta kalmayacak (7/24 çalışan servisler). |
| 2 çekirdek CPU sınırı | Simülasyon en pahalı işlem. | **Aşağıdaki 0.1c'ye bakın — bu, S53 kararını değiştiriyor.** |

### 0.1c CPU Bütçesi ve Simülasyon Katmanı Kararı

2 ARM çekirdeğinde 1 çekirdek API+DB'ye, 1 çekirdek worker'a ayrılır. Bir maç gününün maliyeti:

| Mod | Hesaplama | Maç günü süresi | Eşzamanlı destek |
|---|---|---|---|
| **Tam Detay** (S53→B) | 60 maç × 200 ms | **~12.000 ms** | ~2–5 kullanıcı |
| **Dengeli** (katmanlı) | Kullanıcının maçı 200 ms + kendi ligi 9×15 ms + diğer 5 ülke 50×1 ms | **~400 ms** | **~150–300 kullanıcı** |

Fark **30 kat**. Açık kayıtla ücretsiz sunucuda Tam Detay'ı varsayılan yapmak, hafta sonu 20 kişi girdiğinde kuyruğu dakikalara çıkarır.

> **İKİ AYRI KAVRAM — karıştırılmamalı (SAPMA-003 ile netleştirildi):**
>
> | Kavram | Kapsam | Değerler | Nerede görünür |
> |---|---|---|---|
> | `EngineTier` | **Maç başına**, motor içi | `full` · `medium` · `statistical` | Kod; kullanıcı görmez |
> | `SimulationPolicy` | **Kayıt başına**, kullanıcıya açık | `balanced` · `full` | Kariyer oluşturma ekranı, `DEFAULT_SIM_POLICY` |
>
> Eşleme:
> - `balanced` → kullanıcının maçı `full`, kendi ligi `medium`, diğer ülkeler `statistical`
> - `full` → tüm maçlar `full`
>
> Ortam değişkeni `DEFAULT_SIM_POLICY`, kayıt alanı `saves.simulationPolicy`.

**Karar:** Üç motor katmanı da kodda bulunur. **Varsayılan "Dengeli".** Kullanıcı kariyer oluştururken "Tam Detay"ı seçebilir — ama uyarı gösterilir: *"Diğer ülke ligleri de tam simüle edilir. Daha gerçekçi ama tur atlama süresi belirgin uzar."* Seçim kayda yazılır ve determinizm korunur.

> **Not:** Beklenen ölçek 1–5 kullanıcı olduğu için pratikte **Tam Detay da rahat çalışır** (5 kişi aynı anda maç günü atlarsa en kötü ihtimalle ~60 sn kuyruk). Dengeli varsayılan olarak kalıyor çünkü açık kayıtta kullanıcı sayısı öngörülemez ve sunucu kendini korumalı. Kişisel kariyerinizde Tam Detay'ı seçmenizde sakınca yok.

## 0.1d Alt Yol (Subpath) Dağıtımı — `fxrkqn.org/fms`

Oyun kök alan adında değil, **`/fms` alt yolunda** çalışacak. Bu, sonradan düzeltilmesi çok maliyetli bir sınıf hata üretir; **Faz 1'de kilitlenir** ve hiçbir yerde yol sabit kodlanmaz.

| Katman | Ayar |
|---|---|
| Vite | `base: '/fms/'` |
| React Router | `basename="/fms"` |
| API taban yolu | `/fms/api` |
| SSE uç noktası | `/fms/api/events` |
| Servis çalışanı kapsamı | `/fms/` |
| PWA manifest | `start_url: '/fms/'`, `scope: '/fms/'`, `id: '/fms/'` |
| Çerez `path` | `/fms` |
| Statik varlıklar | `/fms/assets/...` veya R2 özel alan adı |
| Caddy | `handle_path /fms/*` → uygulama; `/fms/api/*` → API |
| Cloudflare | Sayfa kuralı / önbellek kuralı `/fms/*` için |
| Ortam değişkeni | `PUBLIC_BASE_PATH=/fms` — tek kaynak, her katman buradan okur |

**Kural:** Kod içinde `/api/...` veya `/login` gibi mutlak yol **yazılmaz**. Her zaman `basePath` yardımcısı üzerinden üretilir. ESLint kuralı bunu yakalar.

## 0.2 Teknoloji Yığını (Kilitli)

```
Monorepo:      pnpm workspaces + Turborepo
Frontend:      React 19 + TypeScript (strict) + Vite + Tailwind v4 + shadcn/ui
Durum:         Zustand + TanStack Query
Render:        PixiJS (maç sahası) + Canvas 2D (grafikler)
Backend:       Node.js + TypeScript + NestJS
Motor:         packages/engine (paylaşımlı TS, sunucuda çalışır)
Veritabanı:    PostgreSQL 18 + Drizzle ORM        (16 → 18, Faz 3.0 — SAPMA-019)
Kuyruk:        BullMQ + Redis
Realtime:      Server-Sent Events (SSE)
Auth:          @node-rs/argon2 + jose (JWT) — CLAUDE.md §2.1 kilitli
Ses:           Howler.js
i18n:          i18next + react-i18next
Test:          Vitest + Playwright + engine determinizm testleri
Gözlem:        Sentry (self-hosted/ücretsiz) + Pino + correlationId
CI:            GitHub Actions
```

## 0.3 Öncelik Ağırlıkları (S236)

| Sıra | Alan | Ağırlık | Etkisi |
|---|---|---|---|
| **1** | Transfer / kadro yönetimi derinliği | %30 | Blok F'e 6 faz + en detaylı spesifikasyon |
| **2** | Hatasızlık ve teknik sağlamlık | %28 | Faz 2 baştan denetim altyapısı, her fazda DoD |
| **3** | Yapay zeka ve diyalog zenginliği | %24 | Blok H'ye 4 faz + şeffaflık paneli |
| **4** | Arayüz kalitesi ve UX | %18 | Faz 6 tasarım sistemi + Faz 49 mobil cila |

> Maç motoru gerçekçiliği ilk 4'te değil — ama **maç sunumu** (2D, gol animasyonları, SFX) Alarm 4'te özellikle istendi. Bu yüzden motor "yeterince gerçekçi", sunum "yüksek kaliteli" hedeflenir.

## 0.4 Faz Çalışma Protokolü (Her Fazda Zorunlu)

**Faza BAŞLARKEN:**
1. Önceki fazın tüm testleri yeşil mi? Değilse başlama.
2. `pnpm typecheck` → 0 hata. `pnpm lint` → 0 uyarı.
3. Fazın "Bağımlılık" listesindeki her şey tamam mı?
4. Fazın dosya listesini oluştur, boş iskeletleri yaz.

**Faz SÜRESİNCE:**
5. Her yeni modül için birim testi **aynı commit'te** yazılır.
6. Her yeni veri yapısı için Zod şeması + tip türetimi yapılır.
7. Her yapay zeka/hesaplama kararı `debugTrace` nesnesine gerekçe yazar.
8. `console.log` yasak — sadece `logger.info/warn/error` + `correlationId`.

**Fazı BİTİRİRKEN (Definition of Done):**
9. Kabul kriterlerinin **tamamı** işaretli.
10. `pnpm test` → tümü yeşil. Kapsam ≥ %70 (motor ve kural modüllerinde ≥ %85).
11. `pnpm build` → hatasız.
12. Kayıt bütünlüğü doğrulayıcısı (`validateSave`) → 0 ihlal.
13. Performans bütçesi ihlal edilmemiş (aşağıdaki tablo).
14. `CHANGELOG.md` güncellendi, PR açıldı: `feature/faz-XX-<slug>` → `develop`.
15. Kısa demo notu + ekran görüntüsü.

**Performans Bütçesi (ihlal = faz kapanmaz)** — *aşağıdaki liste kısaltılmıştır.
Tam ve **otorite** liste: `docs/spec/09-quality-protocol.md` §11.6.*

| Metrik | Bütçe |
|---|---|
| İlk yükleme (LCP) | < 2.5 sn |
| Ekran geçişi | < 200 ms |
| Kadro tablosu render (500 satır) | < 100 ms |
| Tek maç simülasyonu (tam detay) | < 250 ms |
| Bir maç günü (60 maç, tam detay) | < 15 sn |
| Tur atlama (maçsız gün) | < 800 ms |
| 2D oynatıcı kare hızı (masaüstü) | ≥ 55 fps |
| 2D oynatıcı kare hızı (mobil) | ≥ 30 fps |
| Kayıt yazma (delta) | < 300 ms |
| Bellek (tarayıcı, 1 sa oyun) | < 500 MB |

## 0.5 Süre Planı

Faz başına **1–3 gün** (S234 → A). Kural: hiçbir faz 3 günü aşmaz; aşacaksa ikiye bölünür ve bu belgeye kaydedilir.

Toplam tahmin: **50 faz × ~2 gün ≈ 100 gün.**

> ⚠️ **BU KURAL BİR KEZ ATEŞLENDİ VE İŞLEMEDİ — Faz 3, 4 gün** (SAPMA-033, Faz 4.1'de
> kaydedildi). `PROJECT_MEMORY.md` Faz 3 kaydı *"2026-08-26 → 2026-08-29 · **Süre:
> 4 gün**"* diyor; bölünme yapılmadı, istisna **hiçbir yere yazılmadı**. Faz 1 ve 2
> ikişer gündü, yani bu **ilk ihlal**.
>
> **Sebep ölçüldü ve *"kimse bakmadı"*dan daha keskin:** aşağıda (EK C öncesi) bir
> **"bölünme riski yüksek fazlar"** listesi var ve Faz 6 ile Faz 47 kendi bölümlerinde
> açık bölünme planları taşıyor — yani mekanizma **var**. Ama **Faz 3 o listede
> yoktu ve yine de aştı.** Liste bir **TAHMİN**; hiçbir adım gerçek süreyi **ölçmüyordu**
> (`docs/SESSION-TEMPLATE.md`'de *"süre"* kelimesi hiç geçmiyordu).
>
> **Bir tahmin listesi bir kontrol değildir.** Düzeltme: `SESSION-TEMPLATE` faz
> kapanışına **adım 15 — süre ölçümü** eklendi. Aşan faz ya bölünür ya istisnası
> gerekçesiyle buraya yazılır; **sessizce geçilmez.**
>
> ℹ️ Aynı ailenin diğer iki üyesi: `docs/SPEC-COVERAGE-GAPS.md`'nin **okuyucusu
> yoktu** ve `docs/DEPENDENCY-WATCH.md` *"beni SESSION-TEMPLATE okur"* diyordu ama
> orada öyle bir satır **yoktu** (ikisi de Faz 4.0'da kapatıldı). Üçünde de kural
> yazılıydı; eksik olan **kuralı kontrol eden adım**dı.

---
---

# BLOK A — TEMEL VE DENETİM ALTYAPISI
### Faz 1 – 6 | Hedef: Hiçbir oyun kodu yazılmadan önce, hata yakalayan bir zemin kurmak

---

## FAZ 1 — Monorepo, Araç Zinciri ve Kalite Kapıları

**Hedef:** Tek komutla ayağa kalkan, tip-güvenli, test edilebilir, otomatik denetlenen bir geliştirme ortamı.

**Kapsam:**
- pnpm workspaces + Turborepo kurulumu
- Klasör yapısı: `apps/web`, `apps/api`, `apps/worker`, `packages/engine`, `packages/shared`, `packages/db`, `packages/ui`, `tools/data-cli`
- TypeScript `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` — tüm paketlerde
- ESLint (typescript-eslint strict) + Prettier + import sıralama kuralı
- Vitest kurulumu + kapsam eşiği (%70 global, %85 `packages/engine`)
- Docker Compose: Postgres 16, Redis 7, adminer — **tüm imajlar `linux/arm64` uyumlu olmalı** (üretim Oracle A1 ARM üzerinde çalışacak)
- Yerel geliştirme x86 olabilir; CI `linux/amd64` **ve** `linux/arm64` için build alır (buildx), böylece ARM uyumsuzluğu üretimde değil CI'da yakalanır
- ARM'da dikkat gerektirenler: `sharp` (görsel işleme), native node modülleri, `argon2` — CI'da doğrulanır
- `.env.example` + Zod ile ortam değişkeni doğrulama (uygulama eksik değişkenle açılmaz)
- **Alt yol (subpath) yapılandırması** — `PUBLIC_BASE_PATH=/fms` tek kaynak; Vite `base`, Router `basename`, API prefix, çerez `path`, SW kapsamı hepsi buradan türetilir (bkz. Bölüm 0.1d)
- `basePath()` yardımcısı + **ESLint kuralı:** kodda mutlak yol (`/api/...`, `/login`) yazımı yasak
- **Public repo güvenliği:** GitHub gizli tarama (secret scanning) + push koruması açık, Dependabot açık, `.gitignore` → `.env*`, `/data/packs/`, `/data/assets/`, `.cache/`, `*.dump`
- **LİSANS:** Public repo lisanssız bırakılırsa varsayılan "tüm hakları saklıdır" olur (görülebilir ama yasal olarak yeniden kullanılamaz). Önerim: **AGPL-3.0** — kimse kodu alıp barındırılan bir kopyasını kapalı şekilde yayınlayamaz.
- GitHub Actions: `lint → typecheck → test → build` zinciri
- Dal stratejisi: `main` / `develop` / `feature/faz-XX-<slug>`
- `CHANGELOG.md` + `docs/ADR/` (mimari karar kayıtları) klasörü

**Alt görevler** (onaylanan bölüm — her biri kendi commit'iyle kapanır):

- [x] **1.0** Sürüm doğrulaması — 28 paket npm registry'den teyit, `CLAUDE.md` §2.1 güncellemesi, ADR-0003, SAPMA-003, BORÇ-001/002
- [x] **1.1** Güvenlik zemini + workspace iskeleti — `.gitignore`, `LICENSE`, `.gitattributes`, `.nvmrc`, `.npmrc`, 8 paket, Node sürüm kapısı
- [x] **1.2** TypeScript strict + turbo derleme hattı — `tsconfig.base.json`, paket tsconfig'leri, sürüm kataloğu, tsconfig `types` kapısı
- [x] **1.3** ESLint 10 flat config + Prettier + import sıralama *(tek kök config, projectService, eslint-config-prettier)*
- [x] **1.4** Alt yol kilidi + env doğrulama — `base-path.ts`, `env.ts` (Zod 4), `no-hardcoded-path` ESLint kuralı *(kuralın kendi testi RuleTester ile aynı alt görevde)*
- [x] **1.5** Vitest 4 + kapsam eşikleri — `vitest.config.ts` + `projects[]`, **`coverage.include` ZORUNLU** (bkz. `docs/spec/09` §11.4).
      1.4'ten devreden üç iş:
      (a) Vitest paket olarak kuruldu ama **yapılandırması yok** — config, `projects[]`, coverage eşikleri ve turbo `test` task'ı burada;
      (b) `globals: true` ayarlanınca ESLint `RuleTester` testi Vitest altında da koşar; şimdilik ayrı komutla (`pnpm test:rules`) çalışıyor;
      (c) `tsconfig.build.json` deseni (testleri emit dışında tutar) yalnızca `packages/shared`'da — test kazanan her pakete yayılmalı
- [x] **1.6** `arch:check` — katman yönü, engine yasakları, `console.log`, mutlak yol.
      **`scripts/` için DAR muafiyet:** yalnızca `process.stderr.write`/`process.stdout.write` serbest;
      `console.log` her yerde yasak, katman kuralları `scripts/**`e aynen uygulanır. Muafiyetin
      gerekçesi config içinde yorum olarak yazılır. (Türkçe metin kuralı Faz 5'e kadar no-op.)
      **Ayrıca import yolu harf duyarlılığı denetimi:** her göreli import yolu diskteki gerçek
      dosya adıyla birebir eşleşmeli. Windows duyarsız, üretim Linux/ARM64 duyarlı. TypeScript
      `.ts` dosyalarında bunu TS1149 ile zaten yakalıyor; boşluk `.mjs`/`.js` dosyalarında
      (ölçüm ve düzeltme: `docs/ADR/0004` §2).
- [x] **1.7** Docker Compose (Postgres 16, Redis 7, adminer) + ARM64 — **PostgreSQL majörü Docker Hub'dan doğrulanacak, tahminle yazılmayacak**
- [x] **1.8** `/fms` uçtan uca kanıtı — minimal web + api. **NestJS 11 / Express 5 joker rota (`/*splat`) ve `setGlobalPrefix` bilinen sorunu açıkça test edilir; CORS'ta PUT/PATCH/DELETE tanımlanır. Rolldown çıktısı "derlendi" ile geçilmez, gerçekten servis edilip `/fms` altında çalıştığı doğrulanır.**
- [x] **1.9** GitHub Actions CI — lint→typecheck→test→build, buildx amd64+arm64 (native ARM runner). **Node sürümü `pnpm install`'dan ÖNCE kontrol edilir (`actions/setup-node` + `.nvmrc`); yerel `preinstall` kapısı ikinci savunma hattıdır.**
      **1.8'den devreden:** CI'da `.env` yok; `apps/web` derlemesi `PUBLIC_BASE_PATH` olmadan bilerek durur.
      CI ya `.env.example`'ı `.env`e kopyalamalı ya da `PUBLIC_BASE_PATH`'i ortam değişkeni olarak vermeli.
- [x] **1.10** Belgeler + faz kapanışı — ADR 0001/0002, `docs/DEPENDENCY-WATCH.md`, `docs/HOSTING-FALLBACK.md` iskeleti, README "Geliştirme Ortamı" bölümü + PROMPT-KITAPCIGI atfının kaldırılması, spec düzeltmeleri (Ç1/Ç2/Ç4/Ç5/Ç6), push koruması testi, `PROJECT_MEMORY.md` faz kaydı

**Ana dosyalar:**
```
pnpm-workspace.yaml, turbo.json, tsconfig.base.json
eslint.config.js, .prettierrc, vitest.config.ts
docker-compose.yml, .env.example
packages/shared/src/env.ts
.github/workflows/ci.yml
docs/ADR/0001-monorepo-secimi.md
```

**Kabul kriterleri:**
- [x] `docker compose up` → Postgres ve Redis sağlıklı *(1.7 — ikisi de `healthy`; healthcheck'lerin gerçekten düştüğü negatif testle kanıtlandı)*
- [x] `pnpm install && pnpm build` → tüm paketler hatasız derleniyor *(1.2 — 8 paket, turbo FULL TURBO cache)*
- [x] `pnpm typecheck` → 0 hata *(1.2 — tsconfig types kapısı dahil)*
- [x] Kasıtlı bir tip hatası eklenince CI kırmızıya dönüyor (kanıtla) *(1.9 — koşu 32675264530: her iki mimaride `error TS2322`, imaj işi `skipped`; kanıt dalı silindi)*
- [x] Eksik `.env` değişkeniyle uygulama **açılmıyor** ve net hata mesajı veriyor *(1.9 — konteynerde doğrulandı: çıkış kodu 1 + Türkçe "DATABASE_URL — tanımlı değil")*
- [x] `docker buildx` hem amd64 hem arm64 imajı üretiyor, ikisi de çalışıyor *(1.9 — native runner, `uname -m` → x86_64 / aarch64, ikisinde de HTTP duman testi geçti)*
- [x] Uygulama `/fms` alt yolunda çalışıyor; `PUBLIC_BASE_PATH` değiştirilince her yer uyuyor *(1.8 — `/oyun`a çevrilip yedi katmanın da uyduğu tarayıcıda doğrulandı, `/fms/*` 404 oldu)*
- [x] Kodda mutlak yol yazılınca ESLint hata veriyor *(1.4 — `local/no-hardcoded-path`, 23 senaryoluk kendi testi)*
- [x] Repo'ya sır push edilmeye çalışılınca GitHub push koruması engelliyor *(1.10 — sahte AWS anahtar çiftiyle: `remote rejected ... push declined due to repository rule violations`, iki desen de yakalandı; kanıt dalı silindi)*

**Bağımlılık:** Yok
**Risk:** Turborepo cache yapılandırması yanlışsa CI yavaşlar → `turbo.json` output tanımlarını doğrula.

---

## FAZ 2 — Hata Kontrol ve Gözlemlenebilirlik Protokolü

**Hedef:** Bir hata olduğunda kaynağını **10 saniyede** bulabilmek. (Öncelik #2'nin temeli — bu yüzden oyun kodundan önce geliyor.)

**Kapsam:**
- **Pino** yapılandırılmış loglama, pretty-print (dev) / JSON (prod)
- Her HTTP isteğine `correlationId`, her tura `turnId`, her kayda `saveId` — log zincirinde taşınır
- NestJS global exception filter + tipli hata sınıfları: `DomainError`, `ValidationError`, `EngineError`, `DataProviderError`
- **Sentry** entegrasyonu (self-hosted veya ücretsiz kademe), kaynak haritası yükleme
- Frontend `ErrorBoundary` hiyerarşisi: kök / ekran / bileşen seviyesi + "Hata bildir" butonu
- **Geliştirici Hata Ayıklama Paneli** (`Ctrl+Shift+D`, sadece dev): sekmeler → Kayıt Durumu, Son 50 Log, RNG Tohum Görüntüleyici, Performans Sayaçları
- `debugTrace` altyapısı: her hesaplama modülü `{ input, steps[], output, reason }` üretir
- `assertInvariant(condition, message, context)` yardımcısı — geliştirmede fırlatır, üretimde loglar
- Performans ölçüm sarmalayıcısı: `measure('matchSim', fn)` → bütçe aşımında uyarı

**Alt görevler** (onaylanan bölüm — her biri kendi commit'iyle kapanır):

- [x] **2.0** Faz açılışı — kapsam kapısı onarımı · bayat kayıt düzeltmeleri · bağımlılık kararları · spec boşluk taraması.
      **Sonuç:** yedi işin yedisi yapıldı. Kapsam kapısı artık doğru ölçüyor **ama kırmızı** —
      `.tsx` eklenince gerçek durum ortaya çıktı ve K10 eşiğinin altında kaldık (**SORUN-001**,
      satır %69,72 · fonksiyon %66,66). Eşik düşürülmedi, dosya dışlanmadı; kalan boşluk
      1 satır + 1 fonksiyon ve kapanması **DOM test ortamı kararı** gerektiriyor.
      Yeni kayıtlar: SORUN-001 · SAPMA-007 (kapsam uzantısı) · SAPMA-008 (spec boşlukları).
      Yedi iş: (a) ANLIK DURUM tazeleme + iki kayıt düzeltmesi (blok "PR #1 açık" derken PR merge edilmiş;
      Faz 1 kaydı başlıkta 19, §3'te 18 commit diyor); (b) `vitest.config.ts` `coverage.include` yalnızca
      `*.ts` görüyor — `.tsx`/`.mts`/`.cts` eklenir, **negatif testle** kanıtlanır; (c) kapsam yeniden ölçümü
      (Faz 1 kaydındaki rakam gerçeği yansıtmıyor); (d) üç bağımlılık kararı — `pino` **KAL**, `@sentry/*`
      **KUR**, `pnpm` 11.22.0 → **11.23.0**; (e) SAPMA kütüğüne `tür` sütunu (`karar` | `düzeltme`), geriye
      dönük doldurulur; (f) `docs/SPEC-COVERAGE-GAPS.md` — spec istiyor ama hiçbir faza atanmamış maddeler;
      (g) `docs/spec/11`'e iki kural: ANLIK DURUM'u yazan commit fazın SON commit'i olmalı, ve §7 performans
      rakamları faz kapanışında yeniden ölçülür.
      **Karar 8:** Sentry kota uyarısı Faz 2'de YAPILMAZ; Faz 47 (panel uyarısı) ve Faz 50 (admin e-postası)
      kapsamlarına madde eklenir.
- [x] **2.0b** DOM test ortamı — *(2.0'ın SORUN-001 bulgusu üzerine eklendi; plan dışıydı)*
      `jsdom@30` (kök) + `@testing-library/react@16` (`apps/web`). **`happy-dom` DEĞİL** —
      asıl tüketici Faz 6 (Radix/shadcn, odak yönetimi) ve orada uyumluluk hızdan önce gelir;
      gerekçe ve geri dönüş maliyeti `docs/DEPENDENCY-WATCH.md`'de.
      **Ortam proje başına ayrılır:** `web` + `ui` → `jsdom`, geri kalan her şey → `node`.
      Motoru DOM'a sokmak K3 saflığını bulandırır; ayrım `packages/engine/src/no-dom.test.ts`
      ile kalıcı sınanır. **Negatif test:** `web` geçici olarak `node`'a alındığında 8/8 test
      `ReferenceError: document is not defined` ile kırıldı.
      **Sonuç:** SORUN-001 kapandı — kapsam satır **%87,15** · fonksiyon **%87,5**.
      Eşik değiştirilmedi, hiçbir dosya dışlanmadı.
      **Yan bulgu:** aynı uzantı körlüğü beş yerde birden çıktı (kapsam `include`/`exclude`,
      vitest proje `include`'ları, ESLint muafiyeti, yedi `tsconfig.build.json`) ve
      TypeScript'in glob dilinin süslü parantez desteklemediği ölçümle bulundu (**SAPMA-009**).
      **Kapsam sınırı:** yalnızca ortam kuruldu. `ErrorBoundary` yazılmadı — o 2.6.
- [x] **2.1** Tipli hata sınıfları — `DomainError`, `ValidationError`, `EngineError`, `DataProviderError`,
      `NotFoundError`, `ForbiddenError` + soyut taban `AppError`. **Saf, Node'suz** — motor da kullanıyor (K3),
      bu yüzden `errors.ts` kökte kalır. `base-path.ts`'teki `TypeError` borcu kapandı.
      **Alan şeması:** `kind` + `code` + `context` + `message` + `cause`.
      **SAPMA-010 — `httpStatus` sınıfa KONULMADI.** Planda vardı; HTTP bir taşıma kaygısı ve motor HTTP
      bilmiyor, aynı hata kuyruğa/SSE/CLI'a da gidebiliyor. Eşleme 2.4'teki filter'a taşındı ve sürüklenme
      riski tip seviyesinde kapatılıyor: `Record<ErrorKind, number>` eksik bırakılırsa **derleme kırılır**.
      **Kullanıcı metni sınıfta üretilmiyor:** sözleşme `code` + `context`. `code` zaten i18n anahtarı
      biçiminde (`alan.olay`), böylece Faz 5 bir eşleme tablosu yazmaya iner, fırlatma yerlerini gezmeye değil.
      `message` geliştirici içindir (log/Sentry), çevrilmez.
      **`context` dar tipli** (JSON-güvenli ilkeller + sığ dizi, iç içe nesne YOK) — sır sızdırma yüzeyini
      daraltır; anahtar adına göre redaksiyon ikinci hat olarak 2.2'de logger ile birlikte gelir.
      **Motor kanıtı:** `packages/engine/src/errors-from-engine.test.ts` — sınıfların motorun kısıtları
      altında (`types: []`, `lib: ES2024`) gerçekten çalıştığını gösterir.
      **Yan bulgu:** `arch:check` 12 katman bağına izin veriyor ama `package.json`'da yalnızca 2'si tanımlıydı;
      `packages/engine → @fms/shared` hiç çözümlenemiyordu. Motorunki bağlandı, kalan boşluk için kural 2.2'ye.
      **Glob taraması** (uzantı körlüğü sınıfı): altıncı örnek `arch:check`'te bulundu ve düzeltildi.
- [x] **2.2a** Alt yol sınırı — *(2.2 ikiye bölündü; gerekçe aşağıda)*
      **SONUÇ — kontrol deneyi ÜÇ VARSAYIMI ÇÜRÜTTÜ.** `App.tsx`'e kasıtlı
      `import { loadEnv } from '@fms/shared/server'` konup **gerçekten çağrıldı**:
      `typecheck` **GEÇTİ** (defans ① çalışmıyor: `loadEnv(): Env` imzasında Node tipi yok, `.d.ts`
      tarayıcı tsconfig'iyle sorunsuz derleniyor) · `vite build` **BAŞARILI** · paket
      **229.320 → 299.370 bayt** (+%30) · tarayıcı paketinde `zod` **318**, `DATABASE_URL` **7**,
      `POSTGRES_PASSWORD` **3**, `JWT_SECRET` **2** eşleşme — `sideEffects: false` AÇIKKEN.
      **Yalnızca `arch:check` yakaladı.** Yani Faz 1.8'in çözümü gerçekten bir paketleyici
      optimizasyonuymuş ve tek başına sınır değilmiş — Karar 1 rakamla doğrulandı.
      **Dört değil İKİ çalışan hat var:** `arch:check` (önleme) + paket dize taraması (doğrulama).
      `types: []` başka bir şeyi (Node globallerinin tarayıcı koduna girmesini) koruyor, alt yol
      sınırını değil. `spec/09` ve `ROADMAP` metinleri buna göre düzeltildi.
      **Yan bulgu 1 — SAPMA-011:** turbo `build` çıktısını (`dist/**`) önbelleğe alıyor; bir kaynak
      dosya taşındığında önbellek isabetinde **silinmiş çıktı geri geliyor**. `env.ts` taşındıktan
      sonra `dist/env.js` `>>> FULL TURBO` ile diriltildi. Dahası kontrol deneyinin kirli paketi
      (`index-DV5Sgexl.js`, içinde `JWT_SECRET`) temiz paketin **yanında** kaldı ve sızıntı taraması
      yanlış cevap verdi — kanıtın kendisi bozuldu. `scripts/clean-dist.mjs` sekiz pakete de bağlandı.
      **Yan bulgu 2:** `env.ts` taşınınca ESLint `no-hardcoded-path` muafiyet yolu sessizce eşleşmeyi
      bıraktı (2 yanlış pozitif).
      **2.1'in (b) bulgusu kapandı:** kök barrel artık yalnızca `base-path` + `errors` yeniden dışa
      aktarıyor, hiçbiri üçüncü taraf import etmiyor → **motor Zod çekmiyor**.
      **2.2b için taban:** 229.320 bayt, tek varlık, `pino`/`async_hooks`/`zod` → 0.
      **Kapsam:** `packages/shared` `exports` haritası (`.` + `./server`) · `env.ts` → `src/server/env.ts` ·
      `arch:check`'e **üç kural** · kontrol deneyi. **pino YOK, logger YOK** — onlar 2.2b.
      **Neden bölündü:** 2.2 dört devreden iş + altı yeni nokta taşıyordu ve R3 (alt yol + `NodeNext` +
      Vite çözümlemesi) fazın en somut riski. Aynı commit'te hem modül çözümlemesi hem pino olsaydı, bir
      hata çıktığında "bu çözümleme mi, kütüphane mi?" sorusu doğardı — BORÇ-001/002'nin kaçındığı
      belirsizliğin ta kendisi. 2.2a sınırı **zaten var olan ve zaten test edilmiş** kodla (`env`) kanıtlar.
      **`env.ts` sunucuya taşınıyor — gerekçe:** `loadEnv()` `process.env` okuyor (tarayıcıda `process` yok)
      ve `envSchema` sistemdeki **her sırrın adını sayıyor** (`JWT_SECRET`, `DATABASE_URL`, `R2_SECRET_*`…).
      Faz 1 hata #11 tam olarak bunu yakalamıştı ve çözüm `sideEffects: false` — bir **paketleyici
      optimizasyonu** olmuştu. Alt yol bunu **yapısal** sınıra çevirir. Ölçüldü: tek üretim tüketicisi
      `apps/api/src/main.ts`.
      **Yan kazanç — 2.1'in (b) bulgusu kapanıyor:** `env` kök barrel'dan çıkınca barrel'da üçüncü taraf
      import kalmıyor, yani `@fms/shared` **Zod'u motora çekmeyi bırakıyor**.
      **Üç `arch:check` kuralı:**
      (i) **Alt yol farkındalığı** — `isImportAllowed` tam eşleşme yapıyor, `@fms/shared/server` importu
          `@fms/shared` listesiyle eşleşmiyor ve **sahte katman ihlali** üretiyor (2.0'da ölçüldü).
          Belirteçten temel paket çıkarılıp öyle eşleştirilir.
      (ii) **Bildirilmemiş katman bağı KIRAR** — 2.1'de ölçüldü: gate 12 bağa izin veriyor, `package.json`'da
          2'si bildirilmişti; `engine → @fms/shared` "izinli" görünüp **hiç çözümlenemiyordu** (yanlış
          NEGATİF). Kural: bir dosya `@fms/X` import ediyorsa o paketin `package.json`'ında bildirilmiş olmalı.
          Spekülatif bildirim gerekmez; boşluk ilk gerçek import'ta yakalanır.
      (iii) **Kısıtlı alt yol** — `@fms/shared/server`'ı `apps/web`, `packages/ui` ve `packages/engine`
          göremez. Sınır **iki yönlü**: sunucu kodu tarayıcıya girmesin **ve** Node/IO kodu motora girmesin.
      **Kontrol deneyi:** `App.tsx`'e kasıtlı `@fms/shared/server` importu konur ve **gerçekten
      çağrılır**. Yalnızca import etmek YETMEZ — ağaç sarsma kullanılmayan importu siler, paket
      bayt bayt aynı kalır ve deney hiçbir şey kanıtlamaz (2.2a'da ölçüldü: `void loadEnv;` ile
      paket değişmedi). Beklenti: `arch:check` kırılır, paket şişer, sızıntı taramasında sırlar görünür.
- [x] **2.2b** Logger — **Karar 1 uygulandı:** kökte `Logger` **arayüzü** (izomorfik), pino uygulaması
      `@fms/shared/server` alt yolunda. **Savunma modeli 2.2a'da düzeltildi** (SAPMA-012): `types: []`
      ve `sideEffects: false` bu sınırı korumuyor; çalışan iki hat `arch:check` (önler) ve paket dize
      taraması (doğrular).
      Kökte kalan (izomorfik): `Logger` arayüzü, `LogContext`, `normalizeLogArgs`, hata sınıfları,
      **redaksiyon**. `server/`'da: pino sarmalayıcısı ve `env`. `apps/web` aynı arayüzü `console`
      üzerinde uygulayan kendi logger'ını aldı.
      **Redaksiyon KÖKTE, `server/`'da değil** — plandan sapma, gerekçesi: iki logger da onu kullanmak
      zorunda; `server/`'a konsaydı tarayıcı kendi kopyasını yazardı ve iki kopya ayrışırdı
      (`spec/09` §11.5 disiplini). pino'nun kendi `redact` seçeneği **tam yol** sözdizimi istediği için
      alt dize kuralımızı ifade edemiyor — redaksiyon pino'ya verilmeden önce uygulanıyor.
      **Uyarı sırası sorunu (SAPMA-013):** `env.ts`'teki `process.stderr.write` doğrudan `logger.warn`a
      çevrilemedi çünkü **logger'ın kendisi env'den doğuyor**. Doğrulayıcı saf kaldı ve teşhis **döndürür**
      (`collectEnvWarnings`); çağıran taraf logger'ı kurduktan sonra basar.
      **Ölçümler:** paket **229.320 bayt — 2.2a tabanıyla bayt bayt aynı**; `pino`/`async_hooks`/
      `thread-stream`/`zod` → **0**. Gerçek çalıştırmada iki biçim de doğrulandı (JSON + `pretty`).
      **`arch:check` meta-testi** eklendi (kanarya deposu + tablo bütünlüğü) — tek savunma hattı
      olmanın bedeli.
      **Ön koşul:** 2.2a'nın üç `arch:check` kuralı ve `exports` haritası.
      **Karar 5:** ESLint'te `apps/**` + `packages/**` için `process.stdout/stderr.write` YASAK;
      `scripts/**` + `tools/**` serbest. `arch:check` bu kuralı **tekrarlamaz** (`spec/09` §11.5).
      Ürün kodundaki iki yazım (`server/env.ts`, `apps/api/src/main.ts`) logger'a taşınır.
      **Negatif test:** yasak yola bir yazım konur, lint'in kırıldığı gösterilir.
      **Redaksiyon:** `context` 2.1'de dar tiplendi ama anahtar ADLARI serbest. Blocklist
      **büyük/küçük harf duyarsız, ALT DİZE eşleşmesi** — `userPassword`, `passwordHash`, `refreshToken`
      hepsi yakalanmalı; tam eşleşme hiçbirini yakalamaz. Yanlış pozitif maliyeti bir log alanı,
      yanlış negatif maliyeti sızmış bir sır — asimetri fazla redaksiyondan yana.
      **pino yapılandırması:** dev'de `pino-pretty`, üretimde JSON — karar **`NODE_ENV` KOKLAMAYARAK**,
      açık bir bayrakla verilir (Faz 1 hata #10 dersi). Seviye `LOG_LEVEL`'dan.
      **Motor loglamaz:** `Logger` arayüzü kökte kalır (yalnızca tip), ama motor bir **uygulama** alamaz
      çünkü uygulama `server/` altında ve 2.2a'nın (iii) kuralı motoru oradan men ediyor. Motor iz
      (`debugTrace`) döndürür, log yazmaz — yapısal sınır bu tasarım kuralını arkadan destekler.
      **Bundle yeniden ölçümü:** 2.2a sonu tabanı ile karşılaştırılır; `pino`/`async_hooks` → 0 beklenir.
- [x] **2.3a** `correlationId` — sunucu içi zincir *(2.3 ikiye bölündü; gerekçe: bağlam sınırı ve
      iki parçanın bağımsız doğrulanabilir olması)*
      **Sonuç:** zincir gerçek HTTP üzerinden üç senaryoda da doğrulandı (başlıksız → üretilir,
      geçerli → korunur, geçersiz → yenisi üretilir + `warn`). Sekiz **paralel** istek kimliklerini
      karıştırmadı. uuid v7 bağımlılıksız yazıldı (RFC 9562, `crypto.getRandomValues`).
      **SAPMA-014 — dairesel import:** `LOGGER` belirteci `app.module.ts`'te tanımlıydı ve middleware
      onu oradan alıyordu; `@Inject(LOGGER)` dekoratörü modül gövdesi değerlendirilirken çalıştığı için
      `ReferenceError: Cannot access 'LOGGER' before initialization` doğdu. **`typecheck`, `lint` ve
      birim testleri üçü de sessiz kaldı** — yakalayan tek şey derlenmiş çıktının çalıştırılması oldu.
      Belirteç hiçbir şey import etmeyen `common/tokens.ts`'e taşındı.
      **`arch:check`'e yedinci kural:** `engine-forbidden-import` — motorun `@fms/shared`'dan belirli
      **adları** almasını yasaklar (modül düzeyinde ifade edilemeyen yasak). Meta-teste ve kanaryaya eklendi.
      **Kapsam:** uuid v7 üreteci (izomorfik, bağımlılıksız) · `AsyncLocalStorage` bağlamı
      (`@fms/shared/server`) · NestJS middleware · `X-Correlation-Id` gidiş-dönüş · logger'ın
      **otomatik** bağlanması (elle geçirme yok) · `arch:check`'e motor için **adlandırılmış import yasağı**.
      **K2 sınırı:** uuid v7 **oyun rastgeleliği DEĞİL** — `SeededRng` kapsamına girmez, `Math.random()`
      yasağı da onu ilgilendirmez; `crypto.getRandomValues` kullanır. Ama motor onu import
      **edememeli**: yeni `arch:check` kuralı `packages/engine`'in `@fms/shared`'dan belirli adları
      almasını yasaklar. Bu kural 2.7'de `measure` için de kullanılacak (Karar 6).
      **Geçersiz başlık kararı:** gelen `X-Correlation-Id` **dış girdidir**, doğrulanır.
      ⚠️ **Zod ile DEĞİL, regex koruyucusuyla** (`isAcceptableCorrelationId`) — bu satır
      önce "Zod ile doğrulanır" diyordu, uygulama farklı çıktı ve sapma 2.3c'ye kadar
      kayıtsız kaldı → **SAPMA-015** (gerekçesi orada; özeti: doğrulanan şey tek bir
      dizgenin biçimi, ve Zod'lu sürüm izomorfik kök girişe `zod` çekerdi).
      Geçersizse istek **reddedilmez** — sunucu kendi id'sini üretir ve durumu `warn` seviyesinde,
      gelen değeri **kısaltarak** loglar. Gerekçe: bozuk bir izleme başlığı kullanıcının işlemini
      düşürmemeli; ama sınırsız/biçimsiz bir değer de log satırına ham girmemeli.
      **Negatif testler:** (a) başlıksız istek → sunucu üretir · (b) geçersiz başlık → yeni üretilir,
      uyarı basılır · (c) **eşzamanlılık** — iki paralel istek, ALS bağlamları karışmıyor (seri test
      bunu yakalamaz) · (d) motora uuid importu → `arch:check` kırar.
- [x] **2.3b** `correlationId` — süreç ve tarayıcı sınırı
      **Sonuç:** dört işin dördü yapıldı. Zarf **bölündü** (Karar 9, aşağıda), alt süreç testi
      gerçek `spawnSync` sınırında koşuyor, tarayıcı zinciri gerçek tarayıcıda kanıtlandı,
      paket **229.320 → 232.413 ham bayt (+3.093, %1,35)**. `zod`/`pino`/`async_hooks` → **0**.
      **Kapanmayan tek şey:** 2. kabul kriteri — sunucu mutlu yolda hiç log satırı basmıyor,
      eşleşecek "backend logu" yok → **G-08**, kullanıcı kararı bekliyor. Kriter `[ ]` kaldı.
      **Kapsam:** taşınabilir zarf (`serializeLogContext` / `deserializeLogContext` + Zod) ·
      **gerçek alt süreç** testi · tarayıcı tarafı üretimi (`apps/web/src/lib/api.ts`) · paket ölçümü.
      **Karar 9 — ZARF BÖLÜNDÜ: üretici kökte, çözücü `server/`de.** Plan zarfın tamamını
      kök girişe koyuyordu; ölçüm çelişki gösterdi. Üretmek bağımlılık istemiyor (izomorfik
      kalabilir), **çözmek bir dış girdi ayrıştırıyor** ve CLAUDE.md §1.3 gereği Zod istiyor —
      ama `zod` kök barrel'a giremez: 2.1'de ölçüldü ki barrel üzerinden gelen her import Zod'u
      **motora** da çekiyordu (2.2a'da `server/` alt yoluna taşınarak düzeltilmişti). Zarfın
      tamamı köke konsaydı o düzeltme geri alınırdı. Bölünmenin bedeli **ayrışma riski**; üç
      bağla kapatıldı: ① sürüm sabiti yalnızca kökte tanımlı, şema onu `z.literal()` içine
      oradan alıyor · ② şema çıktısının kanonik tipe atanabilirliği **tip düzeyinde iddia
      ediliyor** (`Assert<... extends ... ? true : false>`) — iki ayrı kayma denendi, ikisi de
      `TS2344` verdi · ③ gidiş-dönüş testi iki yarıyı birlikte koşturuyor.
      **Karar 10 — alt süreç testi `dist`i kendisi tazeliyor.** Çocuk düz `node` ile başlıyor,
      Vitest'in çözümleyicisi orada yok; Node 24 tip soyması `.js` belirtecini `.ts`ye
      **çevirmiyor** (ölçüldü), yani kaynak ağacı çalıştırılamıyor. CI `test`i `build`den önce
      koştuğu için "önce derle" hatası CI'da hep kırmızı olurdu. Test `src` ↔ `dist` mtime
      karşılaştırıp gerekirse `tsc`yi doğrudan çağırıyor — bayat `dist` yeşil yalanı da böylece
      kapanıyor (kanıt: sürüm sabiti 1→2 yapıldı, test kendiliğinden yeniden derleyip geçti).
      **Karar 2:** sahte kuyruk KULLANILMAZ — aynı süreçte ALS zaten sızar, test "geçer" ve hiçbir şey
      kanıtlanmaz. Zincir **gerçek süreç sınırı** üzerinden test edilir: alt süreç başlatılır, zarf argümanla
      geçilir, çocuk kendi ALS'ini zarftan kurar, `correlationId` eşleşmesi doğrulanır. BullMQ'ya özgü
      kablolama `[ ]` kalır → **BORÇ-004**, Faz 16.
      **Paket:** tarayıcı logger'ı 2.2b'de yazıldı ama hiçbir yerden import edilmiyordu, bu yüzden ağaç
      sarsmayla paketten çıkıyordu. `api.ts` onu kullanınca paket **büyüyecek** — taban **229.320 bayt**,
      artış soğuk derlemeyle ölçülüp gerekçesi yazılır.
- [x] **2.3c** İstek loglaması — zincirin dördüncü halkası (**G-08**)
      **Sonuç:** yapıldı, **2. kabul kriteri kapandı** (aşağıda `[x]`). Tarayıcı paketi
      **değişmedi** — 232.413 ham bayt, içerik hash'i bile aynı (`index-Bbvu0kTr.js`).
      **Ölçülen tuzak — ALS `finish` anında kaybolabiliyor:** iki ölçüm yapıldı.
      Sentetik `EventEmitter`'da dinleyici bağlam **içinde** kayıtlı olmasına rağmen
      `emit()` bağlam dışından geldiği için `getStore()` → **undefined**; gerçek
      `node:http` sunucusunda (`res.end()` bağlam içinde) bağlam **korunuyor**. Yani
      bugün çalışıyor ama çalışmasının sebebi middleware'in kontrol ettiği bir şey değil.
      Çözüm: bağlam istek **başlarken senkron** okunup kapatılıyor, `finish` anında
      **açıkça** loglanıyor. Testte kontrol deneyi var — aynı anda ortam bağlamının
      gerçekten boş olduğu ayrıca doğrulanıyor (günlük #16'nın dersi).
      **Ölçülen sınır:** `GET /fms/api/yok` → 404 **loglanıyor** (`warn`, kimlikli);
      `GET /api/health` (global ön ek **dışı**) → 404 ama **loglanmıyor**, çünkü
      `forRoutes('*splat')` ön ek kapsamına giriyor. Üretimde `/fms/api/*` dışı API'ye
      ulaşmıyor ve CI bu sınırı zaten iddia ediyor; yine de yazıldı.
      **Neden ayrı alt görev:** 2.4 exception filter yazıyor — **hata yolu**. Bu madde **mutlu yol**.
      İkisi aynı commit'te olsaydı bir aksaklıkta "filter mı, istek loglayıcı mı?" sorusu doğardı;
      BORÇ-001/002'nin kaçındığı belirsizlik sınıfı. Ayrıca Faz 2'nin **2. kabul kriteri** burada
      kapanıyor ve kriterin hangi alt görevde kapandığı izlenebilir olmalı.
      **Kapsam:** istek başına tek log satırı — metot · yol · durum kodu · süre (ms) ·
      `correlationId` (ALS'ten **otomatik**, elle geçirilmez). Gövde, başlık, sorgu dizesi
      **loglanmaz**.
      **Karar 11 — seviye durum sınıfına göre:** `2xx/3xx → info` · `4xx → warn` · `5xx → error`.
      Başarılı istek neden `debug` DEĞİL: kapatılmaya çalışılan delik tam olarak bu.
      `LOG_LEVEL=info` üretim varsayılanı; başarılı istek `debug` olsaydı mutlu yolda **yine hiç
      satır olmazdı**. `spec/09` §11.1'in senaryosu geriye dönük (*"5. sezonda transferim
      kayboldu"*) ve `debug` sonradan açılamaz. Hacim endişesi ölçümle karşılanmıyor: tur tabanlı
      oyun, 1–5 kullanıcı (tavan 200), zamanlanmış yoklama yok.
      **`/health` hariç TUTULMUYOR** — ölçüldü: API için Docker `HEALTHCHECK` yok, `spec/10`
      yoklama tanımlamıyor, CI yalnızca tek seferlik duman testi yapıyor. Var olmayan bir gürültü
      için filtre yazmak kör nokta üretir (K12). Koşul adlandırıldı: dağıtımda zamanlanmış yoklama
      eklenirse (Faz 13/47/50) yeniden değerlendirilir.
      **Karar 12 — ayrı middleware, interceptor DEĞİL:** interceptor Nest boru hattının içinde
      çalışır ve **404'leri kaçırır** (eşleşen rota yoksa hiç tetiklenmez) — oysa "istediğim uç
      nokta yok" teşhisin en çok istendiği durum. `res.on('finish')` middleware'de 404 dahil her
      yanıtı görür. `CorrelationMiddleware`'e eklenmiyor: kimlik ile işlem kaydı ayrı
      sorumluluklar. **Ölçülecek risk:** `finish` dinleyicisi ALS bağlamını görüyor mu —
      varsayılmaz, test edilir.
      **Sorgu dizesi loglanmaz:** `?token=…` gibi bir değer redaksiyondan geçmeden satıra girerdi.
      **Negatif testler:** (a) log satırında `correlationId` var mı · (b) yanıt başlığındaki id ile
      log satırındaki id **aynı** mı · (c) hata durumunda (404, 500) da satır çıkıyor mu.
      **Paket:** sunucu tarafı — tarayıcı paketi **değişmemeli**, taban **232.413 ham bayt**.
- [x] **2.4** NestJS global exception filter — hata sınıfı → HTTP durumu + Türkçe gövde + `correlationId`.
      Bilinmeyen hata → 500, ayrıntı **yalnızca** logda. **Negatif test:** `Error` olmayan fırlatma
      (`throw 'metin'`) da yakalanmalı.
      **Sonuç:** yapıldı. Tarayıcı paketi **değişmedi** (232.413 bayt, hash aynı — sunucu tarafı).
      **SAPMA-010 ÖLÇÜMLE DOĞRULANDI.** `httpStatus`ın hata sınıflarından çıkarılmasının tek
      gerekçesi "ayrı tablo unutulmaz, çünkü derleme kırılır" idi. Sınandı: `ERROR_KINDS`'a sahte
      bir `suspended` eklendi → **`TS2741`**, hem `STATUS_BY_KIND` hem `MESSAGE_BY_KIND` için.
      Kapı gerçekten ötüyor. Çalışma zamanı ikinci hattı da yazıldı (tablo `Partial` yapılırsa test kırılır).
      **Eşleme:** `validation` 400 (şekil) · `domain` **409** (durum çakışması — 422 elendi, `validation`
      ile bulanıklaşırdı) · `notFound` 404 · `forbidden` 403 · `engine` 500 · `dataProvider` **502**
      (yukarı akış; istemcinin yeniden denemesi anlamlı, 500'den ayrılması bu yüzden değerli).
      **Karar 13 — çift loglama YOK, İŞ BÖLÜMÜ VAR.** İki satır farklı sorulara cevap veriyor ve
      **farklı `code`** taşıyor: `http.request` (middleware, 2.3c) = **ne oldu** (metot·yol·durum·süre,
      her istekte tam bir tane) · `http.exception` (filter) = **neden** (kind·code·redakte context·
      yığın izi). Kodların ayrı olması sayımı kurtarıyor: *"kaç istek düştü?"* → `http.request` +
      `status>=500`, tek satır sayılır. Gerçek HTTP'de doğrulandı: tek 404 için iki satır, aynı
      `correlationId`, farklı `code`. **Yığın izi yalnızca 5xx'te** — 4xx beklenen durum, orada
      yığın izi hem gürültü hem dosya yolu sızıntısı.
      **Gövde sözleşmesi:** bilinen `AppError` → `{status, code, message, context, correlationId}`;
      bilinmeyen → `{status:500, code:'error.unexpected', message, correlationId}` — **context yok,
      yığın izi yok, iç mesaj yok.** `context`in bilinen hatalarda gövdede olması bilinçli: 2.1'in
      sözleşmesi `code`+`context` ve Faz 5 istemcide `t('errors:'+code, context)` yapacak; gövdede
      dönmezse o cümle kurulamaz. Gövdeye giden context de **redaksiyondan geçiyor**.
      **K5 borcu — BORÇ-005:** `AppError.message` geliştirici mesajıdır (`errors.ts`: *"çevrilmez,
      kullanıcıya gösterilmesi hedeflenmez"*), dolayısıyla gövdedeki Türkçe metin ondan gelemez.
      `ErrorKind` başına genel Türkçe yedek tablosu koda gömüldü → Faz 5'te `t()` ile değişecek.
      **Kablolama ayrıca kanıtlandı** (`spec/09` §11.5 kuralı): birim testleri filtrenin `catch()`ini
      doğrudan çağırıyor ve `APP_FILTER` kaydı silinse bile **hepsi yeşil kalırdı**. Bu yüzden ayrı
      bir **gerçek HTTP** testi var (gerçek Nest, gerçek port, gövde tel üzerinden). Mutasyon:
      `APP_FILTER` kaldırıldı → **6 entegrasyon testi kırıldı**, birim testlerin hepsi geçti.
      **Bilinen sınır:** 5xx yolu üretim kablolamasıyla duman testi yapılamadı — üretim yüzeyine
      kasıtlı fırlatan rota **eklenmedi** (her istekte 500 üreten kalıcı uç nokta saldırı yüzeyi
      olurdu). 5xx gerçek HTTP üzerinden **test modülüyle** kanıtlandı; üretim kablolaması 404 ile
      duman testi edildi (`{"status":404,"code":"http.404","correlationId":"…"}`).
- [x] **2.5** Sentry — **2.5a / 2.5b olarak BÖLÜNDÜ** (ikisi de bitti). Bölme gerekçesi: iki ayrı risk
      profili. 2.5a ESM `--import` sırası + Dockerfile + konteyner doğrulaması (R1, fazın en somut
      riski); 2.5b tarayıcı SDK'sı + paket ağırlığı. Aynı commit'te olsalardı bir aksaklıkta
      "ESM sırası mı, paketleyici mi?" sorusu doğardı — 2.3c'nin 2.4'ten ayrılmasıyla aynı ilke.
      Aşağıdaki Karar 4 / Karar 7 / Risk R1 **her iki alt göreve de** uygulanır.
      **Karar 4:** üretimde `tracesSampleRate: 0` (1–5 kullanıcı için performans izleme kotaya değmez;
      `measure()` zaten var), `sampleRate: 1.0` (hataların hepsi). `beforeSend`: beklenen
      `ValidationError`/`DomainError` **gönderilmez** (kullanıcı hatası, sistem hatası değil) ·
      `denyUrls` ile eklenti hataları · `ignoreErrors` ile `ResizeObserver loop…` gürültüsü ·
      aynı parmak izi N dakikada tekrarlarsa düşürülür. DSN boşsa SDK kapalı.
      **Karar 7:** kaynak haritası Faz 2'de yalnızca `sourcemap: true` + `release` adlandırması;
      CI yükleme adımı **Faz 50'ye** ertelenir (BORÇ). İlgili kabul kriteri gerekçesiyle `[ ]` kalır.
      **Risk R1:** `apps/api` saf ESM — SDK enstrümante edilecek modüllerden ÖNCE yüklenmeli;
      `node --import ./dist/instrument.js dist/main.js` gerekir. Dockerfile + çalıştırma komutu birlikte,
      konteynerde duman testi.
- [x] **2.5a** Sentry — **API tarafı** · ESM `--import` · konteyner doğrulaması
      **Sonuç:** yapıldı. Tarayıcı paketi **değişmedi** (232.413 bayt, hash aynı — sunucu tarafı).
      **R1 ÖLÇÜLDÜ, ÜÇ DURUM:** `--import` YOK → `"sentry":false` · `--import` VAR + DSN dolu →
      `"sentry":true` · `--import` VAR + DSN boş → `"sentry":false`. Açılış logundaki `sentry`
      alanı bu yüzden var: `--import` unutulduğunda **tek belirti** odur, uygulama yine açılır.
      **KARAR 14 — OTURUM İZLEME KAPATILDI (ölçümle bulunan yan kanal).** `release` ayarlanınca
      SDK, hata zarfının yanında bir `session` zarfı daha gönderiyor (release health). Ölçüm:
      release yok → 1 zarf `["event"]` · release var → **2 zarf** `["session","event"]` ·
      `ProcessSession` entegrasyonu çıkarıldı → 1 zarf `["event"]`. `release`ı Karar 7 için
      koyduk; release health hiçbir yerde istenmedi ve Karar 4'ün gerekçesi kota disiplini —
      ölçülmemiş, istenmemiş bir giden kanal o kararla çelişirdi. **`autoSessionTracking: false`
      v10'da ETKİSİZ** (ölçüldü; seçenek kaldırılmış, sessizce yok sayılıyor).
      **İmaj boyutu (⑦):** `node_modules` imaj içinde **29 MB → 81 MB (+52 MB)**; `docker images`
      ölçüsüyle **361 MB → 423 MB (+62 MB, %17)**. Kabul edilebilir: Oracle disk sınırı 200 GB
      (`spec/10` §13.5) ve bu bir defalık imaj maliyeti. En büyük kalemler `@sentry/core` (12 MB),
      `@sentry/node` (7 MB), `@opentelemetry/semantic-conventions` (7 MB).
      ⚠️ `docker image inspect .Size` **farklı bir şey ölçüyor** (79→86 MB) ve iki ölçü
      karıştırılmamalı — SAPMA-004'ün gzip dersinin aynısı: **ölçüm kaynağı değişmişse rakam
      karşılaştırılamaz.**
      **CI sözleşmesi korundu:** eksik env → konteyner açılmıyor, `main.ts`'in teşhisi
      (`DATABASE_URL`, `tanımlı değil`) hâlâ görünüyor ve Sentry hiç konuşmuyor.
      **Kabul kriteri 1 — YARIM.** (a) yerel yakalama sunucusuyla zarfın `correlationId`,
      `errorKind`, `release`, `environment` taşıdığı **kanıtlandı**; `beforeSend`in gerçekten
      kablolu olduğu da (ValidationError/DomainError → 0 zarf, kontrol deneyiyle birlikte).
      (b) gerçek projeye tek sefer gönderim **YAPILMADI** — `SENTRY_DSN` boş, ortada proje yok
      ve hesap açmak kullanıcının işi. Kriter `[ ]` kalıyor.
      **Kapsam:** `@sentry/node@10.70.0` · `apps/api/src/instrument.ts` (init + `beforeSend`) ·
      `--import` ile Dockerfile ve çalıştırma komutu · exception filter'dan `captureException` +
      `correlationId` etiketi · **yerel yakalama sunucusuyla** zarf doğrulaması · konteyner duman
      testi · imaj boyutu ölçümü.
      **Sürüm:** 10.70.0 kalıyor. 2.5 açılışında yeniden bakıldı: en yeni kararlı sürüm hâlâ
      **10.71.0 (2026-08-24)** ve bugün 2026-08-25 — takvim aynı gün olduğu için yaş değişmedi
      (**1 günlük**). BORÇ-001/002'nin ilkesi geçerli.
      **`instrument.ts` env doğrulamasını ÜSTLENMEZ:** `envSchema.safeParse` ile bakar, geçersizse
      Sentry'yi hiç kurmaz ve sessizce çekilir. Gerekçe CI'da yazılı bir sözleşme — *"Eksik ortam
      değişkeniyle API AÇILMAMALI"* testi `main.ts`'in biçimlendirilmiş hatasını (`DATABASE_URL`,
      `tanımlı değil`) arıyor. **Enstrümantasyon, uygulamanın açılıp açılmayacağına karar vermemeli.**
      **Tek karar noktası:** filter yakaladığı HER hatayı `captureException`a verir; neyin
      gönderilmeyeceğine **yalnızca** `beforeSend` karar verir. İki yerde filtreleme, kaçınılmaz
      olarak ayrışır (SAPMA-013'ün dersi).
      **Negatif testler:** (a) `--import` olmadan çalıştır → enstrümantasyonun kurulmadığını göster ·
      (b) `ValidationError`/`DomainError` fırlat → zarfın Sentry'ye **gitmediğini** kanıtla ·
      (c) DSN boşken hata fırlat → ağ isteği **gitmediğini** gör.
      **Kabul kriteri 1'in yarısı burada:** yerel yakalama sunucusuyla zarfın `correlationId`
      taşıdığı assert edilir. Gerçek projeye tek sefer gönderim **kullanıcı işi** (DSN yok).
- [x] **2.5b** Sentry — **web tarafı** · paket ölçümü
      **Sonuç:** yapıldı. **1. kabul kriteri kapandı** (aşağıda `[x]`).
      **PAKET: 232.413 → 319.091 ham bayt (+86.678, %37,3)** — soğuk derlemeyle.
      **Kontrol deneyi (2.3b deseni):** import var ama KULLANILMIYORken paket **232.754**
      (tabandan yalnızca +341, o da deneyin kendi `void` satırları). Yani artışın
      **86.337 baytı gerçek kullanıma ait**, ağaç sarsma çalışıyor. Eşiğin (%40) altında
      kaldığı için lazy loading/dar entegrasyon seti **değerlendirilmedi** — spekülatif
      optimizasyon yapılmadı. Sızıntı taraması: `JWT_SECRET`/`DATABASE_URL`/`pino`/
      `async_hooks`/`loadEnv` → **0**.
      **KARAR 15 — ortak kural `@fms/shared`'a taşındı.** `USER_FAULT_ERROR_KINDS` +
      `isUserFaultError` 2.5a'da `apps/api/src/instrument.ts`'teydi; `apps/web` `apps/api`'yi
      import EDEMEZ (§2.4), yani tek seçenek kopyalamak ya da taşımaktı. Taşındı — bu bir
      **alan gerçeği** ("hangi hata kullanıcı hatasıdır"), Sentry ayarı değil.
      **KARAR 16 — parmak izi kısıtlaması (Karar 4'ün son maddesi) EKLENDİ.** 2.5a'da
      yapılmamıştı. `createEventThrottle` saf ve izomorfik (`@fms/shared`), **iki tarafta da**
      kullanılıyor. Tarayıcıda daha akut: bir render döngüsü saniyede yüzlerce özdeş hata
      üretip aylık kotayı dakikalar içinde yakabilir. Sentry'nin `dedupeIntegration`ı bunu
      çözmez — o yalnızca art arda gelen birebir aynı olayı eler, zaman penceresi tutmaz.
      **KARAR 17 — `sendDefaultPii` BIRAKILDI, açık toplama politikası kondu.** Ölçüldü:
      `sendDefaultPii: false` ile seçeneği **hiç vermemek birebir aynı** sonucu üretiyor ve
      o sonuç "hiçbir şey toplama" DEĞİL — `cookies`, `httpHeaders`, `urlQueryParams`
      toplanıyor (yalnızca IP'yle ilgili birkaç anahtar eleniyor). Çerez Faz 13'ten itibaren
      **oturum jetonu** taşıyacak; sorgu dizesi 2.3c'de zaten loglardan çıkarılmıştı.
      Ayrıca seçenek v10'da kullanımdan kaldırıldı, v11'de silinecek ve o an varsayılanlar
      yürürlüğe girerdi. Politika `@fms/shared/telemetry-policy.ts`'te, **iki tarafta da**
      açıkça `false`. Testler `getDataCollectionOptions()` ile **etkin** değeri doğruluyor —
      "seçeneği verdik" demek yetmiyor.
      **`api.ts` HATA MODELLEMESİ DÜZELTİLDİ.** 2.3b'de her başarısız yanıt `DomainError`dı;
      `DomainError` kullanıcı hatası sayıldığı için `beforeSend` **her 500'ü sessizce
      düşürürdü** — belirtisi olmayan bir kayıp. Artık 5xx ve ağ hatası `DataProviderError`
      (yukarı akış arızası), 4xx `DomainError`. Hata 2.5b'de filtreleme kuralı yazılırken
      ortaya çıktı.
      **`BrowserSession` ≠ `ProcessSession`** — tarayıcıda oturum entegrasyonunun adı farklı,
      **ölçülerek** bulundu. Sunucudaki sabit kopyalansaydı filtre sessizce hiçbir şeyi
      kaldırmaz ve Karar 14 yalnızca sunucuda geçerli olurdu.
      **`sourcemap: true`** (Karar 7). Normalde sızıntı endişesidir; **bu projede değil** —
      repo AGPL-3.0 ile zaten açık (CLAUDE.md §1.5). Yükleme adımı → BORÇ-006, Faz 50.
      **Kapsam:** `@sentry/react` · `apps/web/src/lib/sentry.ts` · `denyUrls` (eklenti hataları) ·
      `ignoreErrors` (`ResizeObserver loop…`) · `sourcemap: true` + `release` adlandırması (Karar 7).
      **Paket:** taban **232.413 ham bayt**; `@sentry/react` ilk kez import edilince büyüyecek.
      Soğuk derlemeyle ölçülüp artış gerekçelendirilir. Kontrol deneyi (2.3b deseni): import
      yazılıp **kullanılmazsa** paket değişmemeli.
- [x] **2.6** `ErrorBoundary` hiyerarşisi — kök / ekran / bileşen + "Hata bildir" (`correlationId` ile).
      **Sonuç:** yapıldı. Paket **319.091 → 320.641 ham bayt (+1.550, %0,49)** — sınır küçük,
      beklendiği gibi.
      **GERÇEK TARAYICIDA UÇTAN UCA KANITLANDI.** API'ye `status` alanını **nesne** döndüren
      sahte bir sunucu kondu; React render sırasında patladı ve:
      ① **bileşen** sınırı yakaladı ("Bu alan gösterilemedi") · ② tablonun **geri kalanı
      ayakta kaldı** (base, çerez, correlationId satırları render edilmeye devam etti) —
      hiyerarşinin bütün değeri bu · ③ ekrandaki **hata kodu**
      `01a03aa5-6f0b-78bc-ad9d-4b827b88acab`, son isteğin `correlationId`'siyle **birebir
      aynı** (Karar 19 çalışıyor) · ④ **tek** zarf gerçek Sentry'ye gitti, **HTTP 200** ·
      ⑤ ekranda yığın izi **yok**.
      **Karar 20 ÜRETİM PAKETİNDE ÖLÇÜLDÜ:** `error-stack` **0** · `whiteSpace:"pre-wrap"`
      **0** · `error.stack` **0** eşleşme. Dev dalı derlemede tamamen elendi. Sınırın diğer
      parçaları yerinde (`error-boundary-` 1, `Tekrar dene` 1, `react-render` 1, `crash` 3).
      ⚠️ Bu, **sahtelenerek kanıtlanamayacak** bir iddiaydı: `__FMS_DEV__` derlemeye gömülü,
      testte `false` yapmak yalnızca testi yeşile boyardı. Gerçek kanıt dize taraması.
      **Kendi sınıfımız yazıldı, `@sentry/react`'inki kullanılmadı** — üç şart onun
      sözleşmesinin dışında: `crash` etiketi (Karar 18), `correlationId` gösterimi (Karar 19),
      yığın izinin dev/prod ayrımı (Karar 20). Sarmalasaydık iki katman `componentDidCatch`
      çalıştırır ve hangisinin ne raporladığı belirsizleşirdi.
      **`vitest.config.ts` web projesine `define` eklendi:** 2.6'dan sonra sınır ağacın
      içinde, yani `App.test.tsx`/`main.test.tsx` dahil `ErrorBoundary` render eden HER test
      `__FMS_DEV__` olmadan `ReferenceError` ile kırılıyordu.
      **⚠️ KALAN DOLAYLI KANIT (2.5b'den devam):** tarayıcı zarfının **içindeki** etiket hâlâ
      doğrudan gözlenmedi — gövde ikili ve kısıtlayıcı (Karar 16) aynı parmak izli ikinci
      denemeyi bilinçli olarak engelliyor. Etiketin varlığı birim testleriyle ve sunucuda
      **aynı etiket şeklinin** gerçek Sentry olayından okunmasıyla destekleniyor.
      **Negatif test:** kayıtsız bir `ErrorBoundary`'nin hatası köke tırmanıyor mu.
      Metinler Türkçe sabit; i18n Faz 5'te → **BORÇ-003**.
      **Karar 18 — ÇÖKME, "kullanıcı hatası" elemesini AŞAR.** 2.5b'nin dersi burada tekrar
      ediyor: bir bileşen `DomainError` fırlatırsa `isUserFaultError` onu kullanıcı hatası
      sayıp Sentry'den **düşürürdü**. Oysa arayüzü yıkan bir `DomainError` tam olarak bir
      hatadır — bileşen onu işlemeliydi. Sınıflandırma **API sözleşmesinden akan işlenmiş**
      hatalar için geçerli, kaçıp render'ı çökertenler için değil. Boundary yakaladığını
      `crash` etiketiyle veriyor; `shouldReport` kullanıcı-hatası elemesinden **önce** ona
      bakıyor. Tarayıcıya özgü asimetri (`denyUrls` gibi), sunucuda karşılığı yok.
      **Karar 19 — "Hata bildir" SON İSTEK kimliğini taşır.** Render hatasının HTTP isteği
      yok. Çıplak yeni kimlik üretmek zinciri koparırdı: çökme çoğu zaman başarısız bir
      istekten SONRA gelir ve asıl değer ikisini bağlamakta. `api.ts` her istekte son kimliği
      kaydeder; çökme anında varsa o kullanılır, hiç istek olmadıysa taze üretilir —
      **hiçbir durumda kimliksiz kalınmaz**.
      **Karar 20 — dev/prod ayrımı `__FMS_DEV__`, Vite `mode`'undan.** `NODE_ENV`
      **koklanmıyor**: değer derleme zamanında Vite'ın açık `mode` girdisinden türetilip
      `define` ile gömülüyor. Faz 1 hata #9'un tuzağı çalışma zamanında
      `process.env.NODE_ENV` okumaktı; bu onun tersi. Yığın izi **yalnızca** dev'de ekranda.
      **Ölçülecek:** (a) üç katman ayrı ayrı yakalıyor mu · (b) kayıtsız hata köke tırmanıyor
      mu · (c) fallback'in kendisi patlarsa ne oluyor · (d) üretim derlemesinde yığın izi
      ekranda YOK · (e) çökme Sentry'ye gerçekten gidiyor mu.
- [x] **2.7** `debugTrace` + `assertInvariant` + `measure` (K7). İlk ikisi **saf** — motor kullanacak.
      **Sonuç:** üçü de kuruldu, **4. ve 5. kabul kriteri kapandı**. Test 438 → **486**
      (31 → 35 dosya), kapsam satır %93,59 → **%94,40**, fonksiyon %95 → **%95,68**.
      Paket 320.641 → **321.483 ham bayt (+842, %0,26)**.
      **Karar 6 — UYGULANDI, ama kural düzeyinde değil GİRDİ düzeyinde.** `perf.ts` kökte
      kaldı (izomorfik, `performance.now()`); yeni bir `arch:check` kuralı **eklenmedi** çünkü
      2.3a'nın `engine-forbidden-import` kuralı zaten tam bu işi yapıyor. `measure` ve
      `configureAssertions` `ENGINE_FORBIDDEN_SHARED_EXPORTS` tablosuna girdi.
      Kural sayısı **7'de kaldı**, tablo girdisi 1 → **3** oldu.
      **Kanarya bir kademe aşağı indi:** her girdi için ayrı fixture + "yasaklı ÜÇ adın
      HER BİRİ ayrı ayrı ötüyor" testi. İki mutasyonla ölçüldü —
      **(a)** `measure` fixture'ı devre dışı bırakıldı: yalnızca yeni test kırıldı (1/44),
      "YEDİ kural" ve tablo bütünlüğü testleri **yeşil kaldı** → yeni testin kapsadığı
      boşluk gerçek. **(b)** tablo anahtarı `measure` → `measured` diye yanlış yazıldı:
      iki test kırıldı ama **`pnpm arch:check` "✓ temiz" dedi** — kapının sessizce
      körelmesinin tam örneği.
      **Negatif test:** `packages/engine`'e `measure` + `configureAssertions` importu kondu,
      `arch:check` **2 ihlalle kırıldı**, geri alındı.
      **`assertInvariant` dev/prod ayrımı `NODE_ENV` KOKLAMIYOR** — değer `__FMS_DEV__`
      derleme zamanı sabitinden (Vite `define`) geliyor. Varsayılan **`throw`**; yalnızca
      tarayıcı üretim derlemesi `report`a çeviriyor. **Sunucuya bayrak EKLENMEDİ** →
      SAPMA-017 (tüketici yok, K12; env değişkeni çalışma zamanı ayarıdır, "prod build"
      değil).
      **Çağrı yeri:** `apps/web/src/lib/api.ts`'teki mevcut `correlationId` uyumsuzluğu
      kontrolü `logger.warn`dan `assertInvariant`a çevrildi → SAPMA-018. 2.3b'nin
      "iş düşürülmez" kararı **üretimde aynen geçerli**, yalnızca dev'de fırlatıyor.
      **`debugTrace.input` `ErrorContext`'e daraltıldı** (spec §11.2 `Record<string, unknown>`
      diyordu) → SAPMA-016. `output` serbest kaldı ve loglanmıyor; tip sistemi ikinci kilit.
      **Redaksiyon uçtan uca kanıtlandı:** iz GERÇEK pino logger'ından geçirildi,
      `input.password` ve `input.refreshToken` → `[REDACTED]`, `input.userId` → 7.
      Köprü (`traceToLogContext`) düzleştiriyor, redaksiyonu **logger** yapıyor (§11.5).
      **Motor kanıtı:** `packages/engine/src/observability-from-engine.test.ts` —
      `types: []` + `lib: ["ES2024"]` altında iz üretiliyor ve `assertInvariant` fırlatıyor.
      **⚠️ `measure`in henüz ürün çağrı yeri YOK** ve bu ölçüldü: paket taramasında
      `perf.asyncNotSupported` · `debugTrace.summaryRequired` · `debug.trace` → **0**.
      Ağaç sarsma ikisini de tamamen siliyor (günlük #19'un aynı dersi); +842 baytın
      tamamı `assert.ts` + `main.tsx` kablolamasından geliyor.
      Sızıntı taraması temiz: `pino` · `async_hooks` · `zod` · `JWT_SECRET` ·
      `DATABASE_URL` · `thread-stream` → **0**.
- [x] **2.8** Geliştirici Hata Ayıklama Paneli (`Ctrl+Shift+D`), 4 sekme.
      **Sonuç:** panel kuruldu, **3. kabul kriteri kapandı** — Faz 2'nin beş kriterinin beşi de tamam.
      Test 486 → **520** (35 → 37 dosya), kapsam satır %94,40 → **%94,92**, ifade %94,96,
      dal %90,37, fonksiyon %95,68 → **%96,17**. Paket 321.483 → **321.495** (+12; dökümü aşağıda).
      **Karar 3 — UYGULANDI VE İKİ YÖNLÜ ÖLÇÜLDÜ.** Nöbetçi `__FMS_DEV_PANEL__`
      (`DebugPanel.tsx` → `DEV_PANEL_SENTINEL`), `grep -F` ile aranıyor.
      | Koruma | Paket | Nöbetçi | `DebugPanel` (kaynak haritası) | `log-buffer` |
      |---|---|---|---|---|
      | `__FMS_DEV__` (üretim) | **321.495** | **0** | **YOK** | **YOK** |
      | kaldırıldı (`true`) | **325.509** | **1** | **VAR** | **VAR** |
      Panelin gerçek ağırlığı **4.014 bayt** ve üretimde tamamı düşüyor.
      **⚠️ DAHA GÜÇLÜ BİR ÖLÇÜM ARACI BULUNDU: kaynak haritasının `sources` listesi.**
      Dize nöbetçisi "bu dizge yok" der; `sources` **"bu modül pakette yok"** der. `log-buffer.ts`
      hiç dize literali taşımadığı için nöbetçiyle kanıtlanamazdı — harita ikisini birden
      doğrudan gösterdi. (`sourcemap: true` 2.5b Karar 7'den beri açık; yan faydası bugün çıktı.)
      **⚠️ ÜRETİM PAKETİ 0 DEĞİL +12 BAYT ARTTI — ve sebebi ölçüldü, varsayılmadı:**
      | Yapılandırma | Paket | Fark |
      |---|---|---|
      | 2.7 tabanı | 321.483 | — |
      | `logger.ts` değişikliği var, panel dalı yok | 321.487 | **+4** |
      | `logger.ts` değişikliği yok, panel dalı var | 321.491 | **+8** |
      | ikisi de var (2.8) | 321.495 | **+12** |
      +4 = `logger.ts`'de yerel `redacted` değişkeni · +8 = `main.tsx`'teki koşullu dalın
      **`null` kalıntısı** (JSX çocukları tek eleman yerine diziye dönüyor). **Hiçbiri panelin
      kendisi değil** — koşullu bir dalın kaçınılmaz bedeli, dışlamanın başarısızlığı değil.
      **③ Canlı log akışı — `console` YAMALANMADI.** Halka tampon (`lib/log-buffer.ts`, 50 satır)
      `createBrowserLogger`'ın içinden besleniyor. Gerekçe: yama bizim olmayan her satırı da
      yakalar (Sentry SDK'sı, React uyarıları, eklentiler); K8 `console`u tek dosyaya hapsetmiş
      ve ikinci dokunuş o sınırı delerdi; logger zaten tek huni.
      ⚠️ Tampona **redakte edilmiş** bağlam yazılıyor — panel logu ekrana basıyor ve ham bağlam
      yazılsaydı sır konsolda `[REDACTED]` görünürken panelde okunurdu.
      **④ Performans Sayaçları sekmesi BOŞ** — `measure`in ürün çağrı yeri yok (2.7'de ölçüldü).
      Üreticisi olmayan bir tampon yazmak BORÇ-004'ün aynı hatası olurdu; sekme "Faz 6'da
      (`perf:budget`) dolacak" diyor.
      **⑤ `Ctrl+Shift+D` ÇAKIŞMADI** — gerçek tarayıcıda, gerçek OS düzeyi tuş basımıyla panel
      açıldı. Ölçüm sırasında bulunan tuzak: dinleyici `event.code`'a **bakmamalı** (sentetik
      olayda boş geliyor) ve `key` Shift'le `'d'`/`'D'` olabiliyor; ikisi de kabul ediliyor.
      **⑥ Panel KÖK SINIRIN DIŞINDA, kendi sınırında** — mutasyonla ölçüldü: panel bilerek
      patlatıldığında panel sınırı yakaladı (`error-boundary-hata-ayiklama-paneli`), **kök sınır
      tetiklenmedi**, uygulama tablosunun 10 satırı ayakta kaldı.
      **Gerçek tarayıcı kanıtı:** panel `Ctrl+Shift+D` ile açıldı · sayaç `2` · kip `throw` ·
      satırlar `api.ts`'ten gerçek `correlationId` (`01a03b9e-9195-…`) ile geldi
      (`api.request` info, `api.requestFailed` error) · en yeni en üstte · dört sekme de yerinde.
      **Dürüstlük notu:** "Kayıt Durumu" ve "RNG Tohum Görüntüleyici" sekmelerinin verisi henüz yok
      (kayıtlar Faz 12, `SeededRng` Faz 22). Kabukları kurulur, "Faz 12'de dolacak" yazılır —
      **sahte veri gösterilmez.** ✅ Üçü de kabuk olarak kuruldu ve metinleri **hangi fazda**
      dolacağını söylüyor ("yakında" demek, sonraki oturumun bunu eksik iş sanmasına yol açardı).
      **`arch:check`'e SEKİZİNCİ KURAL — `forbidden-export-exists` (2.7'nin açık bıraktığı sessizlik).**
      2.7 mutasyon (b)'sinde tablo anahtarı `measure` → `measured` yanlış yazılınca iki meta-test
      kırılmış ama **`pnpm arch:check` "✓ temiz" demişti** — yasak gate tarafında sessizce
      kalkıyordu. Yeni kural `@fms/shared` barrel'ını TS ayrıştırıcısıyla okuyup
      `ENGINE_FORBIDDEN_SHARED_EXPORTS`'un her anahtarının gerçekten dışa aktarıldığını
      denetliyor. **Aynı mutasyon şimdi `pnpm arch:check`'i kırıyor (exit 1).**
      Barrel okunamıyorsa kural **atlanıyor** — "doğrulanamıyor" ile "ihlal var" ayrı şeyler;
      kanaryanın temiz depo testi bu sayede yanlış pozitif almıyor. Kural sayısı **7 → 8**.
- [x] **2.9** Faz kapanışı — 5 kabul kriteri kanıtla · bundle yeniden ölçümü
      (`grep pino|async_hooks apps/web/dist/assets/*.js` → 0, ARTI kontrol deneyi: `App.tsx`'e kasıtlı
      `@fms/shared/server` importu konur ve typecheck **ile** arch:check'in İKİSİNİN BİRDEN kırıldığı
      gösterilir) · `CHANGELOG.md` · ROADMAP · faz kaydı (11 başlık) · PR.

      ⚠️ **BU MADDENİN KENDİSİ YANLIŞTI VE ÖLÇÜMLE ÇÜRÜTÜLDÜ — satır bilerek
      düzeltilmedi, altına yazıldı.** *"typecheck İLE arch:check'in İKİSİNİN BİRDEN
      kırıldığı"* iddiası SAPMA-012 ile **çelişiyordu**: 2.2a'da ölçülmüştü ki
      `typecheck` bu sızıntıyı **görmüyor**. SAPMA-012 kaydı ROADMAP'in 2.2a
      maddesini güncellemiş ama 2.9 maddesine **dokunmamıştı** — sapma kaydının
      "spec güncellendi mi" sütunu eksik kalmıştı (günlük #60).

      **Kontrol deneyi bugün (2026-08-26) yeniden koşuldu.** `App.tsx`'e
      `import { loadEnv } from '@fms/shared/server'` kondu ve `loadEnv()`
      **gerçekten çağrıldı** (günlük #16: kullanılmayan import sıfır bayt eder):

      | Kapı | Beklenen (ROADMAP) | **Ölçülen** |
      |---|---|---|
      | `pnpm typecheck` | kırılır | ❌ **GEÇTİ** (exit 0, 9/9) |
      | `vite build` | — | ✅ **BAŞARILI** |
      | `pnpm arch:check` | kırılır | ✅ **KIRILDI** — `restricted-subpath`, exit 1 |

      Paket **321.495 → 391.657 bayt (+70.162, %21,8)**. Sızıntı taraması:
      `JWT_SECRET` **2** · `DATABASE_URL` **6** · `POSTGRES_PASSWORD` **3** ·
      `zod` **318**. Kaynak haritası `sources`: `server/env` **VAR**, `zod`
      **18 modül**, toplam modül **160 → 179**.
      İmport geri alındı; paket bayt bayt **321.495**'e döndü ve `dist/` tek
      paket taşıyor (SAPMA-011 kanıt bozulması tekrarlanmadı).

      **Sonuç: `arch:check` bu sınırın TEK önleyici hattıdır** — SAPMA-012
      bugünkü rakamlarla yeniden doğrulandı.

      **Temiz paket sızıntı taraması (üretim derlemesi):** `pino` · `async_hooks` ·
      `thread-stream` · `zod` · `JWT_SECRET` · `DATABASE_URL` · `POSTGRES_PASSWORD` ·
      `__FMS_DEV_PANEL__` → **hepsi 0**. Girmesi beklenenler: `REDACTED` 1 ·
      `x-correlation-id` 1 · `api.request` 3.

      **Üretim konteyneri gerçekten koşuldu (SAPMA-014):** `docker run` →
      `/fms/api/health` **200** `{"status":"ok",…}` · ön ek dışı `/api/health`
      **404** · açılış logu `{"port":3001,"apiPrefix":"/fms/api","sentry":false,…}` ·
      `Config.Cmd` **`node --import ./dist/instrument.js dist/main.js`** (bayrak
      yerinde; `sentry:false` yalnızca DSN boş olduğu için) · gönderilen
      `X-Correlation-Id` **aynen geri döndü** ve sunucu logunda **1 eşleşme**.

**Ana dosyalar:**
```
packages/shared/src/errors.ts                            [2.1]
packages/shared/src/logger.ts                            [2.2] Logger ARAYÜZÜ — izomorfik
packages/shared/src/server/logger.ts                     [2.2] pino uygulaması — alt yol
packages/shared/src/server/context.ts                    [2.3] AsyncLocalStorage
packages/shared/src/log-context.ts                       [2.3] taşınabilir zarf (Zod)
packages/shared/src/debug-trace.ts                       [2.7] SAF — iz üretir, LOGLAMAZ
packages/shared/src/assert.ts                            [2.7] SAF — varsayılan kip `throw`
packages/shared/src/perf.ts                              [2.7] izomorfik ama MOTORA YASAK
packages/engine/src/observability-from-engine.test.ts    [2.7] motorun K3 altında kullanabildiğinin kanıtı
apps/api/src/instrument.ts                               [2.5] Sentry — main'den ÖNCE yüklenir
apps/api/src/common/filters/global-exception.filter.ts   [2.4]
apps/api/src/common/middleware/correlation.middleware.ts [2.3]
apps/web/src/lib/sentry.ts                               [2.5]
apps/web/src/lib/api.ts                                  [2.3] X-Correlation-Id gönderimi
apps/web/src/components/ErrorBoundary.tsx                [2.6]
apps/web/src/components/dev/DebugPanel.tsx               [2.8] dev-only, nöbetçili
apps/web/src/lib/log-buffer.ts                           [2.8] halka tampon (50) — üretimde YOK
tools/arch-check/index.mjs                               [2.2, 2.7] alt yol kuralı + motor yasaklı ad tablosu (1 → 3 girdi)
eslint.config.js                                         [2.2] process.stdout/stderr yasağı
vitest.config.ts                                         [2.0] coverage.include .tsx
docs/SPEC-COVERAGE-GAPS.md                               [2.0] spec boşluk envanteri
```

**Kabul kriterleri:**
- [x] Kasıtlı bir hata fırlat → Sentry'de `correlationId` ile görünüyor — *doğrulama: önce yerel yakalama sunucusuna DSN + zarfın etiketi taşıdığını assert eden test, sonra gerçek projeye TEK SEFER gönderim*
      **✅ İKİ YOL DA KOŞULDU.**
      **(a) Yerel yakalama sunucusu (2.5a, tekrarlanabilir, CI'da koşuyor):** gerçek bir HTTP
      sunucusuna DSN verildi; zarfın `correlationId`, `errorKind`, `release`, `environment`
      taşıdığı **ham gövde üzerinde** assert edildi. `beforeSend`in kablolu olduğu ayrıca
      kanıtlandı: `ValidationError`/`DomainError` → **0 zarf**, kontrol deneyiyle
      (`EngineError` → 1 zarf).
      **(b) Gerçek Sentry projesine gönderim — İKİ OLAY, TEK SEFER HER BİRİ:**
      ① **Sunucu (2.5b):** üretimdeki `dist/instrument.js` `--import` ile yüklendi,
         `EngineError` yakalandı. `event_id` `6995813e6c244248bfed1e438697b156`,
         **ingest HTTP 200**, etiketler doğrudan olaydan okundu:
         `correlationId=01a03966-5b00-7000-8000-2b5babcdef01`, `errorKind=engine`.
         Üretim yapılandırması da doğrulandı: `ProcessSession` entegrasyonu **YOK** (Karar 14).
      ② **Tarayıcı (2.5b, gerçek tarayıcı):** kimlik `01a03a8f-24c1-7422-a88a-d27fb5e5523f`
         üretildi, konsola loglandı, API kapalıyken istek 502 döndü → `DataProviderError` →
         `captureException`. `performance` kaydı **tam bir** zarfın gerçek EU ingest'e
         gittiğini ve **HTTP 200** aldığını gösterdi (`sentry.javascript.react/10.70.0`).
         Tek zarf olması Karar 14'ün tarayıcıda da tuttuğunun kanıtı.
      **⚠️ DOĞRUDAN GÖZLENMEYEN TEK ŞEY:** tarayıcı zarfının İÇİNDEKİ etiket. İstek gövdesi
      ikili/sıkıştırılmış ve dışarıdan okunamadı; ikinci bir olay yakmamak için zorlanmadı.
      Etiketin varlığı (i) `reportToSentry` birim testleriyle ve (ii) sunucu tarafında **aynı
      etiket şeklinin** gerçek Sentry olayından doğrudan okunmasıyla dolaylı olarak sağlanıyor.
      Sentry arayüzünde gözle doğrulama kullanıcının bir tıklık işi: yukarıdaki `event_id`
      veya `correlationId` aranır.
- [x] Aynı `correlationId` ile frontend ve backend logları eşleşiyor — *doğrulama: tarayıcıda tıkla → `X-Correlation-Id` → sunucu logu. **Negatif:** başlıksız istek → sunucu kendi üretir. **Eşzamanlılık:** iki paralel istek → ALS bağlamları karışmıyor*
      **✅ 2.3c'de KAPANDI — dört halkanın dördü, gerçek tarayıcı + derlenmiş API ile:**
      ① Tarayıcı `01a0397a-6170-7b67-b523-34ba8a7a8d6f` üretti (uuid v7).
      ② Tarayıcı konsolunda **iki satır** o kimliği taşıdı (`api.request`, `api.response`).
      ③ `X-Correlation-Id` ile gönderildi; sunucu **aynı kimliği yanıt başlığında geri verdi**
         — ekranda `zincir kapandı = evet` (kod içinde assert edilen karşılaştırma).
      ④ **Sunucu logunda aynı kimlikle satır:**
         `{"correlationId":"01a0397a-6170-…","code":"http.request","method":"GET",`
         `"path":"/fms/api/health","status":304,"durationMs":0.8,"msg":"İstek tamamlandı"}`
      **Negatif:** başlıksız istek → sunucu kendi üretir (2.3a, hâlâ yeşil) · geçersiz başlık →
      `warn` + yeni kimlik · 404 → satır çıkıyor (`warn`) · 500 → satır çıkıyor (`error`).
      **Eşzamanlılık:** 2.3a'daki paralel istek testi yeşil.
      2.3b'de üç halka vardı, dördüncüsü (sunucu log satırı) **yoktu** → G-08, 2.3c'de kapandı.
- [x] Debug paneli açılıyor ve canlı log akışı gösteriyor — *doğrulama: `Ctrl+Shift+D` + üretim paketinde YOKLUĞUNUN kanıtı (dize nöbetçisi, Karar 3)*
      **✅ 2.8'DE KAPANDI — İKİ YARISI DA GERÇEK ÖLÇÜMLE.**
      **(a) Açılıyor ve akıyor:** geliştirme derlemesi `vite preview` ile koşuldu, gerçek
      tarayıcıda **gerçek OS düzeyi `Ctrl+Shift+D`** basıldı → `panelAcik: true`, sayaç `2`,
      değişmez kipi `throw`. Satırlar sahte değil, `apps/web/src/lib/api.ts`'ten gerçek
      zincirle geldi:
      `info API isteği gönderiliyor {correlationId: 01a03b9e-9195-7170-…, code: api.request}`
      `error API isteği başarısız döndü {… code: api.requestFailed, status: 502}`
      En yeni en üstte; dört sekme de yerinde; üç boş sekme hangi fazda dolacağını yazıyor.
      **(b) Üretimde YOK — iki yönlü:**
      | Koruma | Paket | Nöbetçi `__FMS_DEV_PANEL__` | `DebugPanel` (harita) | `log-buffer` (harita) |
      |---|---|---|---|---|
      | `__FMS_DEV__` | 321.495 | **0** | **YOK** | **YOK** |
      | kaldırıldı | 325.509 | **1** | **VAR** | **VAR** |
      Tek yönlü "0 çıktı, demek ki yok" kanıt sayılmadı (günlük #53).
      **⚠️ ÖLÇÜM SIRASINDA BULUNAN TUZAK:** ilk denemelerde `Ctrl+Shift+D` sayfaya **hiç
      ulaşmadı** ve panel açılmadı. Sebep uygulamada değildi — **Browser pane görüntülenmiyordu**,
      dolayısıyla sentetik OS tuş girdisi hiç iletilmiyordu (ekran görüntüsü de aynı sebeple
      zaman aşımına uğruyordu). Pane yeniden açılınca ilk denemede çalıştı. Bu, günlük #53'ün
      (ölçüm aracının kendisi yanlış cevap üretir) dördüncü örneği ve en tehlikelisi: burada
      araç "başarısız" diyordu, yani **yanlış negatif**.
- [x] `assertInvariant` dev'de fırlatıyor, prod build'de loglayıp devam ediyor — *doğrulama: İKİ AYRI DERLEME alınır ve ikisi de çalıştırılır; `NODE_ENV` koklanmaz*
      **✅ 2.7'DE KAPANDI — İKİ DERLEME ALINDI, İKİSİ DE GERÇEK TARAYICIDA KOŞULDU.**
      Sahte API (`:3001`) gelen `X-Correlation-Id`'yi bilerek farklı bir değerle geri
      verdi (2.6 tekniği); `vite preview` ile aynı ekran iki derlemede açıldı.

      | Gözlem | **Üretim derlemesi** | **Geliştirme derlemesi** |
      |---|---|---|
      | `API durumu` | `ok` — veri geldi | `Sunucu farklı bir correlationId döndürdü — zincir kopuk` |
      | `correlationId` | `01a03b7b-0f27-…` | `bekleniyor` — hiç set edilmedi |
      | `zincir kapandı mı` | `HAYIR` | `bekleniyor` |
      | Konsol | `api.request` → **`[warn]` zincir kopuk** → `api.response` | `api.request` → **hiçbir şey**, akış durdu |
      | Konsol `[error]` | — | **0** (Sentry'ye gitmedi) |
      | ErrorBoundary yedeği | yok | **yok** — 10 tablo satırının 10'u ayakta |

      **Ölçülen ve önceden bilinmeyen bulgu:** fırlatma bir **promise zincirinin**
      içinde olduğu için ErrorBoundary onu YAKALAMIYOR (React sınırları yalnızca
      render/lifecycle hatalarını yakalar). Yakalayan, `App.tsx`teki kendi `.catch()`i.
      Bu yüzden dev'de de yığın izi ekrana çıkmıyor, Sentry'ye de bir şey gitmiyor —
      `crash` etiketi (Karar 18) bu yolda hiç devreye girmiyor.

      **Statik kanıt (aynı yöntem, aynı `grep -F` deseni, iki paket):**
      | Nöbetçi | Üretim | Geliştirme |
      |---|---|---|
      | `mode:b.report` | **1** | **0** |
      | `code:e.code,correlationId` | **1** | **0** |

      Bootstrap çağrısının kendisi: üretimde
      `te({mode:b.report,report:e=>{Af.warn({...e.context,code:e.code,correlationId:cf()},e.message)})`,
      geliştirmede `te({mode:b.throw})`. **Tek üçlü ifade, derleme zamanında iki farklı
      dala katlanmış** — çalışma zamanında `process.env` okunmuyor.
      ⚠️ İlk denemede nöbetçi olarak çift tırnaklı `"report"` arandı ve iki pakette de 0
      çıktı: küçültücü dizeleri **ters tırnakla** yazıyor, yani o desen ayırt edici
      değildi. Ölçüm `grep -F` ile yeniden alındı (günlük #50).
- [x] Performans sarmalayıcısı bütçe aşımında uyarı basıyor — *doğrulama: 1 ms bütçe / 50 ms fonksiyon → uyarı; 500 ms bütçe → sessiz*
      **✅ 2.7'DE KAPANDI — sayısal senaryonun ikisi de test edildi.**
      1 ms bütçe / ~50 ms meşgul bekleme → `onExceeded` **1 kez** çağrıldı,
      `exceeded: true`, `durationMs > 1`. 500 ms bütçe / aynı iş → `onExceeded`
      **hiç çağrılmadı**, `exceeded: false`.
      Uyarı GERÇEK pino logger'ından geçirildi (K8): satır `level: 40` (warn),
      `code: perf.budgetExceeded`, `metric: tur.atlama`.
      **Sahte zamanlayıcı KULLANILMADI** — `performance.now`u sahtelemek ölçümün
      kendisini sahtelemek olurdu; meşgul bekleme ile gerçek süre harcandı.
      **Bildiricisiz çağrıda da ihlal kaybolmuyor:** `exceeded` bayrağı her zaman dönüyor.

**Bağımlılık:** Faz 1

**Riskler:**
- **R1** — `apps/api` saf ESM; `import` yükseltmesi Sentry `init()`'ini geç bırakır. `node --import` gerekiyor (2.5).
- **R2** — Kapsam kapısı ısıracak. Bilinçli tercih, erken ısırsın. **Eşik DÜŞÜRÜLMEZ.** Fonksiyon kapsamı 2.0'da eşiğin yalnızca ~3,7 puan üstünde ölçüldü; Faz 2 on yeni dosya ekliyor.
- **R3** — `@fms/shared/server` + `NodeNext` + Vite çözümlemesi: 8 pakette typecheck + gerçek `vite build` + kasıtlı import denemesi (kırılmalı).
- **R4** — Sentry kotası: dev'de DSN boş → `enabled: false`. Testler yerel yakalama sunucusuna. Gerçek gönderim TEK SEFER.
- **R5** — `ErrorBoundary` metinleri Türkçe sabit, i18n Faz 5'te → **BORÇ-003**.
- **R6** — uuid v7 Web Crypto kullanır (`crypto.getRandomValues`). Bu **oyun rastgeleliği değildir**, `SeededRng` kapsamına girmez (K2). Motor bunu import edemesin diye `arch:check` kuralı.
- Aşırı loglama performansı düşürür → log seviyesi ortam değişkeniyle kontrol edilir (`LOG_LEVEL`).

---

## FAZ 3 — Veritabanı Şeması I: Dünya Çekirdeği

**Hedef:** Ülke, lig, kulüp, stadyum, turnuva yapılarının değişmez (immutable) master şeması.

**Kapsam:**
- Drizzle şema tanımları + migration altyapısı
- **Tablolar (11 — aşağıdaki "Tablo envanteri" bölümüne bakınız):** `countries`,
  `federations`, `competitions`, `clubs`, `club_facilities`, `club_finances_base`,
  `stadiums`, `rivalries`, `kit_templates`, `club_kits`, `referees`
- **Master/Delta ayrımı temeli:** master tablolara yazma **tip seviyesinde derlenmez** (K4)
- İndeksler: `clubs(competition_id)`, `competitions(country_id)`, arama için `pg_trgm` GIN indeksi
- Seed betiği iskeleti (`tools/data-cli/seed.ts`)
- ER diyagramı → `docs/schema/world.md` (mermaid)
- **Entegrasyon test katmanı: Vitest + `testcontainers`** *(G-03, `docs/SPEC-COVERAGE-GAPS.md`)*
  `docs/spec/09` §11.4 "Gerçek Postgres ile uçtan uca modül" satırını tanımlıyor ama
  `testcontainers` ROADMAP'in hiçbir yerinde geçmiyordu. İlk migration burada yazıldığı
  için kurulum buraya düşüyor: "`up`/`down` çalışıyor" iddiası ancak gerçek bir Postgres
  örneğine karşı doğrulanabilir. **ARM64 uyumu kurulumda doğrulanır (K14).**

**Kabul kriterleri:**
- [x] Migration ileri ve geri çalışıyor (`up` / `down`) — *gerçek Postgres'e karşı, `testcontainers` ile (G-03)*
      **Faz 3.2b'de kanıtlandı.** Çevrim: `up` → **veri yaz** → `down` → `up` →
      gerçek `information_schema`/`pg_catalog` durumu çevrim öncesiyle karşılaştırıldı:
      **89 olgu, fark yok** (`countries`); çok adımlı fixture zincirinde **48 olgu, fark yok**.
      Kanıt üç yerde birden koştu: `pnpm test:db` (16 test, PG18 konteyneri) · CI'ın
      `Entegrasyon` işi (**amd64 + arm64**) · **derlenmiş çıktı düz `node` ile** gerçek
      Postgres'e karşı (D5).
      ⚠️ **Negatif testler zorunluydu ve bozuk `down`un İKİ SINIFI ölçüldü:**
      *eksik kalan* (`down` kendi eklediğini düşürmez) → sonraki `up` **patlıyor**,
      gürültülü sınıf · *fazla giden* (`down` kendi yaratmadığını da düşürür) → hiçbir
      hata çıkmıyor, şema **sessizce eksiliyor** ve **yalnızca karşılaştırma yakalıyor**.
      Mutasyonla doğrulandı: karşılaştırıcı köreltildiğinde 16 testin **yalnızca 1'i**
      kırılıyor — o da bu negatif test. Pozitif testler kör bir karşılaştırıcıyla da geçer.
- [x] 6 ülke + 6 lig + 5 UEFA/yerel kupa örnek verisiyle seed başarılı
      **Faz 3.8'de kanıtlandı.** `tools/data-cli/src/seed.ts` → gerçek PostgreSQL 18.6'ya
      **6 ülke + 11 yarışma** (6 lig · 3 UEFA turnuvası · 2 yerel kupa, iki farklı ülkeden).
      Kanıt üç yerde birden koştu: `pnpm test:db` (yeni `data-cli-integration` projesi,
      20 test) · CI'ın `Entegrasyon` işi (amd64 + arm64) · **derlenmiş `dist/seed.js`
      düz `node` ile** (D5).
      ⚠️ **İki iddia AYRI AYRI kanıtlandı, çünkü ikisi farklı şeyler:**
      *deterministik* (K2) — aynı girdi birebir aynı SQL, rastgelelik kaynağı yok;
      *idempotent* — iki koşu satır sayısını ve `id`'leri değiştirmiyor.
      ⚠️ **İdempotentlik "patlamadı" ile kanıtlanmadı:** `DO UPDATE` seçildiği için
      iddia *"seed bozuk satırı ONARIR"*; negatif test satırı kasten bozup üç alanın
      da onarıldığını okuyor. Üçüncü adım olmadan test yalnızca ikinci koşunun
      hata vermediğini söylerdi — 3.2b'nin kör karşılaştırıcı boşluğuyla aynı sınıf.
      ⚠️ **Zaman damgaları karşılaştırmadan çıkarıldı ama dışlama SESSİZ DEĞİL:**
      `created_at`in sabitliği ve `updated_at`in ilerlemesi ayrıca **okunup iddia**
      ediliyor, dışlama listesinin iki elemanlı olduğu da kendi testini taşıyor
      (3.2b'nin sequence kararının biçimi).
      ⚠️ **Kapatılmayan bir delik koşan bir testle görünür:** `ON CONFLICT (key)`
      `code` benzersizliğini görmüyor; negatif test hatanın `countries_code_unique`ten
      geldiğini adıyla iddia ediyor.
- [x] Tüm yabancı anahtarlar ve `ON DELETE` davranışları tanımlı
      **Faz 3.9'da kanıtlandı — LİSTEYLE DEĞİL, KURALLA.** On iki FK'nın davranışı
      `spec/01` §3.1.2 ③ + ⑧'den **türetiliyor** (`src/schema/fk-policy.ts`), girdiler
      katalogdan okunuyor (`key` sütunu var mı · giden FK var mı) ve türetilen değer
      `pg_constraint`teki gerçekle karşılaştırılıyor: **12/12, 0 uyumsuzluk.**
      ⚠️ ⑧'in üçüncü sınıfı (sahipsiz sözlük tablosu) **elle adlandırılmıyor**:
      *"sahipsiz"* = giden FK'sı yok, ve bu koşulu sağlayan tek tablo ölçüldüğünde
      `kit_templates` çıkıyor. Faz 4'ün ekleyeceği FK'lar hiçbir liste güncellenmeden
      denetlenecek — elle envanterin iki kez kırılmasının (günlük #30, #36) sebebi buydu.
      ℹ️ Elle liste testi **korundu**: ikisi farklı şey söylüyor (*"bugün şunlar var"*
      ve *"olması gereken bu"*). **Mutasyonla doğrulandı:** sözlük sınıfı köreltildiğinde
      `typecheck`/`lint` sessiz kalıyor, **yalnızca** bu test kırılıyor ve farkı adıyla
      gösteriyor.
- [x] `EXPLAIN ANALYZE` ile temel sorgular < 20 ms
      **Faz 3.9'da kanıtlandı — İKİ AYRI ETİKETLİ İDDİA olarak.**
      **İDDİA A (kriteri kapatan):** seed verisiyle (**6 ülke + 11 yarışma**, diğer
      dokuz tablo boş) dört indeks sorgusu — **0,006–0,012 ms**, bütçenin çok altında.
      Bu hacimde planlayıcı **Seq Scan** seçiyor ve **haklı**; test bunu iddia ediyor.
      **İDDİA B (kriteri kapatmaz, indeksin gerekçesi):** 3.001 satırda Türkçe arama
      **indeksli 0,92 ms · indekssiz 6,13 ms**.
      ⚠️ **`ANALYZE` şart:** istatistiksiz planlayıcı dört sorgunun dördünde de indeksi
      seçiyor (`reltuples = -1`), `ANALYZE` sonrası dördü de Seq Scan'e düşüyor — ölçüm
      `ANALYZE`sız alınsaydı **yanlış ama gurur verici** bir sonuç yazılırdı.
      ⚠️ **Plan seçimi hacme değil SEÇİCİLİĞE bağlı:** aynı tabloda `'besiktas'` indeksi
      kullanıyor, `'kulup1234'` kullanmıyor. İkisi de doğru karar.
      ⚠️ Süreler **amd64**'te ölçüldü; üretim ARM64 (K14). Aynı testler CI'ın `arm64`
      işinde de yeşil — mutlak süre taşınabilir değil, bütçe kararı taşınabilir.
- [x] Şema dokümanı ve mermaid diyagramı üretildi
      **Faz 3.10'da kapandı — ve *"üretildi"* kelimesi harfi harfine alındı.**
      `docs/schema/world.md` dolduruldu; içindeki mermaid bloğu **elle
      çizilmedi**, `packages/db/src/schema-state/er-diagram.ts` (saf) tarafından
      `introspectSchema()`'nın gerçek `information_schema` + `pg_catalog`
      okumasından **üretildi**.
      ⚠️ **Gerekçe 3.9'un kendi bulgusu:** şemanın zaten **iki** temsili var —
      Drizzle TS tanımları ve migration SQL'i — ve çalışan veritabanını yalnızca
      ikincisi kuruyor. Elle çizilmiş bir mermaid **üçüncü** temsil olurdu;
      üçüncüsünü hiçbir şey denetlemez ve bir sonraki şema değişikliğinde
      **sessizce** yalan söylemeye başlardı.
      **Nöbetçi:** `packages/db/integration/er-diagram.itest.ts` — ① belgedeki
      blok canlı katalogdan üretilenin **birebir aynısı** ② belge **metninden
      sayılan** tablo/ilişki sayısı katalogla **ve** mutlak değerlerle (**11 /
      12**) aynı ③ negatif: belgeden bir varlık silinince karşılaştırma kırılıyor.
      ⚠️ **İkinci ayak gereksiz değil:** yalnızca ① olsaydı iki taraf da boşken
      de geçerdi (kör kontrol sınıfı, `spec/09` §11.5, ölçülmüş oran 16'da 1).
      **Negatif testle kanıtlandı (3.10, gerçek belge üzerinde):** `stadiums`
      varlığı silindi → **3 testin 3'ü** kırıldı ve fark
      `entities: 10 ≠ 11` olarak **adıyla** raporlandı; geri alınınca 3/3 yeşil.
      **İkinci mutasyon — nöbetçinin DOĞRU temsile baktığı ölçüldü:** migration
      SQL'inden (`0003`) `kit_templates.name_key`in `NOT NULL`ı kaldırıldı →
      **163 entegrasyon testinin 7'si** kırıldı, ikisi bu nöbetçi;
      `pnpm test` **sessiz** (o anda 742/742), `pnpm typecheck` **sessiz**.
      Günlük #43'ün dersinin karşı ölçümü.

**Bağımlılık:** Faz 1, 2

---

### Faz 3 — Tablo envanteri (3.0 açılışında onaylandı)

Bu bölümün ilk hâli **15** tablo sayıyordu ve `docs/spec/01-database.md` §3.1 ile
**çelişiyordu** (spec bu kapsam için **11** tablo tanımlıyor; `PROJECT_MEMORY.md`
Faz 2 kaydı §11 ise "16 master tablo" diyordu — **üç farklı sayı**). Çelişki faz
açılışında, tek satır SQL yazılmadan çözüldü. Karar tablosu:

| ROADMAP (eski) | `spec/01` | Karar | Gerekçe |
|---|---|---|---|
| `confederations` ayrı tablo | `countries.confederation` sütunu | **spec/01** | v1'de 6 ülke, hepsi UEFA. Tek satırlık tablo, hiçbir sorgu ondan geçmez (K12) |
| `competition_rules` ayrı tablo | `competitions.rules: jsonb` | **spec/01** | 1:1 ve hep birlikte okunuyor; ayrı tablo her sorguya bir JOIN ekler |
| `club_reputations` ayrı tablo | `clubs.reputation` | **spec/01** | Tek `smallint`. Ayrı tablo yalnızca zaman serisi için anlamlı; itibar değişimi `save_deltas`'a gidiyor (K4) |
| `club_colors` ayrı tablo | `clubs.color{Primary,Secondary,Tertiary}` | **spec/01** | Üç sabit sütun, 1:1 |
| `competition_seasons` | — | **spec/01 — TABLO AÇILMIYOR** | 3.1'de ölçüldü, aşağıya bakınız |
| — | `club_finances_base` | **spec/01** | ROADMAP listesinde eksikti; başlangıç finansalları master (paketten gelir), değişimi delta |

**`competition_seasons` — 3.1'de ÖLÇÜLDÜ, hiçbir tüketicisi yok (SAPMA-021).**

Tablo ikiye ayrılarak incelendi; **ikisi de Faz 3'e tablo getirmiyor:**

- **(a) Aktif sezon örneği** (fikstür, puan durumu, katılımcılar) — save'e özel, master
  değil. **Ama başka bir faza da taşınmıyor:** `spec/01` §3.2 sezonu **skaler** taşıyor
  (`matches.seasonYear`, `card_counters.seasonYear`) ve **puan durumu saklanmıyor,
  `matches`'tan türetiliyor**. Aktif sezon için bir varlık tablosuna ihtiyaç yok.
- **(b) Tarihsel sezon verisi** — **istendiği varsayımı ölçümle çürütüldü.** Tarama
  sonuçları:

| Nerede arandı | Bulunan |
|---|---|
| `spec/01` sezon atıfları | Yalnızca **skaler `seasonYear`** sütunları. Tek tarihsel master tablo `player_stats_history` (Faz 4) ve o **oyuncu** istatistiği, yarışma geçmişi değil — tüketicisi Faz 10 nitelik türetimi |
| `spec/12` veri paketi formatı | `pack.json` içinde yalnızca `"season": 2026` (paketin hangi sezonu tarif ettiği). `clubs.json`/`players.json`'da tarihsel sezon dizisi **yok** |
| ROADMAP **Faz 8** kapsamı | Tamamen **güncel durum** verisi. "sezon sezon performans geçmişi" **geçmiyor** |
| ROADMAP "kulüp detay ekranı" | **Böyle bir ekran ROADMAP'te hiç yok** |
| ROADMAP "kupa vitrini" | **Faz 47**, ve **menajer** profilinde — kaynağı `manager_career` (Faz 4) |
| ROADMAP **Faz 46** rollover | Adım 12: *"sezon istatistikleri arşivleme, kupa müzesi güncelleme"* — **oyun içinde üretiliyor**, paketten gelmiyor. Depolamasına Faz 46 kendi karar verir |

**Sonuç:** master tarihsel sezon verisi v1'de **hiçbir ekranın, spec'in veya fazın
ihtiyacı değil**. Faz 3'te açılmıyor, başka bir faza da atanmıyor. Ürün fikri olarak
makul olduğu için `docs/V2-BACKLOG.md`'ye yazıldı (K12).

**İleri yabancı anahtarlar — sütun Faz 3'te YAZILMAZ.** `federations.presidentPersonId`,
`clubs.chairmanPersonId`, `referees.personId` üçü de `people` tablosuna işaret ediyor ve
`people` **Faz 4**'te geliyor. Sütun bugün kısıtsız yazılsaydı 3. kabul kriterini
(*"tüm yabancı anahtarlar tanımlı"*) **görünürde** sağlarken gerçekte delerdi — hiçbir
şeyin tüketmediği bir sütun bir temennidir (Faz 2 §5 D3). Faz 4'ün migration'ı sütunu ve
FK'yı **birlikte** ekler. Bedeli: hakemler Faz 4'e kadar isimsiz (ilk görüntülendikleri
yer Faz 26).

**Veri paketi alanları — `spec/12`'nin şemadan istedikleri Faz 3'te eklenir.**
`docs/spec/12-data-packs.md` §17.1 *"her varlık kaydında `source` alanı tutulur"* diyor,
§17.3 eşleme için `key` (slug) ve `externalIds` istiyor; `spec/01`'in master tablolarında
**üçü de yoktu**. Sonradan eklemek 11 tabloya `ALTER TABLE` + seed'in yeniden yazımı demek.

| Alan | Tip | Hangi tablolarda | Not |
|---|---|---|---|
| `key` | `text NOT NULL` | Pakette **görünen** varlıklar: `countries`, `competitions`, `clubs`, `stadiums`, `referees` | Uydu tablolara (`club_facilities`, `club_finances_base`, `club_kits`, `rivalries`, `federations`, `kit_templates`) **konmaz**. ✅ **3.1'de karara bağlandı: benzersizlik TABLO BAŞINA** (`UNIQUE (key)`), global değil — gerekçe ve ölçüm `spec/01` §3.1.0 |
| `source` | `text` + **CHECK** | `key` taşıyan her tablo | Serbest metin **değil**: `pack \| api \| wikidata \| openfootball \| procedural` |
| `externalIds` | `jsonb` + Zod | `key` taşıyan her tablo | Alanlar `spec/12` §17.3'te (`wikidata`, `apiFootball`, `transfermarkt`) |

Sözleşmenin tamamı ve gerekçesi **`docs/spec/01-database.md` §3.1.0**'a yazıldı —
3.4/3.5/3.6 şemayı oradan okur.

**`asset_index` Faz 3'te AÇILMAZ.** `spec/12` §17.5 adım 7 bu tabloyu istiyor ama
`spec/01`'de ve ROADMAP'in hiçbir fazında yok → **G-09** olarak `docs/SPEC-COVERAGE-GAPS.md`'ye
yazıldı ve **Faz 7**'ye (DataProvider) atandı; tabloyu dolduran hat orada. `crestAssetId`,
`portraitAssetId`, `logoAssetId`, `flagAssetId` bugün `spec/01`'deki gibi düz `text` kalır.

---

### Faz 3 — Alt görev listesi

- [x] **3.0** Bağımlılık kararları ve `packages/db` migration kablolaması.
      **SONUÇ:** `drizzle-orm@0.45.2` + `drizzle-kit@0.31.10` kuruldu (1.0 hâlâ RC,
      karar korundu) · `testcontainers`+`@testcontainers/postgresql@12.1.0` kuruldu,
      ARM64 denetlendi ve **gerçekten çalıştırıldı** (5.592 ms'de PG18 konteyneri) ·
      Postgres **16 → 18.6** (SAPMA-019, bağlama noktası değişti) · collation
      `--locale=C` → **`builtin`/`C.UTF-8`** (SAPMA-020, `C` Türkçe `ILIKE`'ı
      sessizce bozuyordu) · `pnpm` `allowBuilds` politikası kuruldu.
      ⚠️ **`drizzle-kit` `down` migration ÜRETMİYOR** (ölçüldü, `spec/01` §3.0) —
      3.2 büyüyor, 3.2a/3.2b bölünmesi öneriliyor.
      **Sıra bağlayıcı:** ① `drizzle-kit` gerçekten `down` migration **üretiyor mu**
      (registry ve aracın **kendi çıktısından** ölçülür, blogdan değil — üretmiyorsa
      `down`'lar elle yazılır, her migration'ın maliyeti iki katına çıkar ve **bu liste
      büyür**) ② `postgres` Docker imajı **16 → 18** + ARM64 manifest + `pgdata` volume
      davranışı ③ `drizzle-orm`/`drizzle-kit` 1.0 GA oldu mu ④ `testcontainers` ARM64
      uyumu (paket denetimi: `.node` ikilisi · `binding.gyp` · `install`/`postinstall`)
      ⑤ **collation kararı** ⑥ `docs/DEPENDENCY-WATCH.md` üç satırının sonucu yazılır
- [x] **3.1** Şema kapsam mutabakatı. **SONUÇ:** `competition_seasons` **açılmıyor,
      başka faza da taşınmıyor** — hiçbir tüketicisi bulunamadı (SAPMA-021, ölçüm
      tablosu yukarıda) · `key` benzersizliği **tablo başına** karara bağlandı,
      sözleşme `spec/01` §3.1.0'a yazıldı (SAPMA-023) · ileri FK zorunluluğu **Faz 4
      maddesine** işlendi · `spec/12` §17.3 slug algoritması kendi örneklerinin
      **2/3'ünü tutturmuyor** (SAPMA-022, ölçüldü) · `docs/schema/world.md` iskeleti
      açıldı · G-09 yazıldı · **Faz 8 kabul kriterine `unaccent` uyarısı eklendi**
      (düz `pg_trgm` o kriteri sağlamıyor — ölçüldü). **Tablo sayısı 11'de kaldı.**
- [x] **3.2a** **Migration koşucusu.** `packages/db/src/migrate/` — journal (Zod'lu),
      planlama, kayıp ölçümü, `SqlExecutor` arayüzü, `postgres.js` uygulaması,
      dosya kaynağı. Takip tablosu **kendi şemasında** (`fms_meta.migrations`) —
      tavuk-yumurta çözümü ve 3.2b'nin şema karşılaştırmasını kirletmemesi için.
      **`pnpm test:db`** kuruldu (`vitest.integration.config.ts`), `docs/spec/09`
      §11.5 faz kapanış listesine **ve CI'a ayrı iş olarak** yazıldı (amd64+arm64).
      Sürücü **`postgres@3.4.9`** seçildi (SAPMA-025 — davranış `pg` ile birebir
      aynı, fark 13:1 paket).
      ⚠️ **`down`un veri kaybı politikası — KARAR:** migration başına `lossy`
      etiketi **elendi**; sayınca neredeyse her geri alma kayıplı çıkıyor, etiket
      hep `lossy` olur, izin bayrağı her koşuda yazılır ve kapı gürültüye döner
      (`spec/09` §11.5'in *"bir yol yanlış tarafa düşerse hangi test kırılır?"*
      testini geçemez). **Yerine kayıp ÖLÇÜLÜYOR:** geri alma bir işlemde
      uygulanır, şemanın öncesi/sonrası karşılaştırılır, kaybolan tablo/sütunlar
      ve **kaç satırı** etkilediği sayılır; `allowDataLoss` verilmemişse işlem
      **geri alınır ve reddedilir**. Etiket bir *iddiadır*, bu bir *ölçümdür* —
      ve boş bir tabloyu düşüren `down` haklı olarak engellenmez.
      **`--dry-run`** aynı mekanizmayı kullanıyor: gerçekten uygular, ölçer,
      `RollbackSignal` ile geri alır. Gerekçe `packages/db/src/migrate/loss.ts`
      başlığında.
- [x] **3.2b** **Round-trip kanıtı.** `packages/db/src/schema-state/` — derin
      introspection (sütun tipi, `NOT NULL`, `DEFAULT`, kısıtlar `pg_get_constraintdef`
      ile, indeksler, sequence tanımı), saf karşılaştırıcı, drizzle snapshot
      ayrıştırıcısı. **Kabul kriteri 1 kapandı** (yukarıda, ölçümleriyle).
      **İKİ AYRI İDDİA ayrı ayrı kanıtlandı:** ① round-trip — gerçek şema durumu
      çevrim öncesi vs sonrası ② snapshot güvenilirliği — drizzle'ın
      `meta/NNNN_snapshot.json`'ı gerçek şemayı doğru anlatıyor mu. İkincisi
      olmadan snapshot'ı sonraki fazlarda doğruluk kaynağı saymak temenniye dayanırdı.
      ⚠️ **Snapshot KAYIPLI bir temsil — ölçüldü ve kapsam YAZILDI:** snapshot
      `"type": "serial"` diyor, gerçek `integer` + `nextval(...)`; snapshot
      `sequences: {}` diyor, gerçekte `countries_id_seq` **var**. Bu yüzden ②'nin
      kapsamı dar tutuldu (tablo/sütun adları, sıra, `NOT NULL`, birincil anahtar,
      benzersizlik) ve darlığı `drizzle-snapshot.ts` başlığında **tablo hâlinde**
      yazılı — yazılmasaydı "snapshot doğrulandı" izlenimi veren bir D3 olurdu.
      ⚠️ **SEQUENCE KARARI:** tanım **şemadır** (karşılaştırılır), konum
      (`last_value`/`is_called`) **veridir** (karşılaştırılmaz). Ölçüldü: üç satır
      sonrası çevrimde `last_value` **3 → 1**, ama tanım (ad, tip, start, min, max,
      increment, cycle) **birebir aynı**. Karşılaştırmaya sokulsaydı test yalnızca
      hiç veri yazılmamışken geçerdi — yani kriterin *"veri yaz"* adımını sabote
      ederdi. **Dışlama sessiz değil:** entegrasyon testi konumu okuyup raporluyor.
      **Çok adımlı çevrim GEÇİCİ FIXTURE ZİNCİRİYLE kanıtlandı**, gerçek zincire
      ikinci bir migration eklenmeden: `drizzle/` pratikte append-only ve bir test
      migration'ı 3.4'ün numaralandırmasını sonsuza kadar kirletirdi
- [x] **3.3** K4 — Master World salt-okunurluğu **tip seviyesinde**.
      `packages/db/src/client/` — görünmez marka (`unique symbol`), `MasterDb`
      (yazma metotları **tipte yok**) ve `WritableDb` (master tablo verilirse
      parametre `never`). **Sözleşme `docs/spec/01-database.md` §3.4.1'e yazıldı;
      3.4/3.5/3.6 onu okuyacak.**
      ⚠️ **`is_master = true` SÜTUNU KULLANILMADI** — ROADMAP'in ilk hâli bunu
      istiyordu. Hiçbir şeyin tüketmediği bir bayrak bir temennidir (D3) ve her
      satırda tekrarlanan sabit bir değer ölü depolamadır.
      **İDDİA KONTROL DENEYİYLE KANITLANDI** (SAPMA-012 dersi): `@ts-expect-error`
      ile işaretli yazma girişimleri, koruma kaybolursa *"Unused directive"* verip
      **`pnpm typecheck`i kırıyor**. Mutasyonla ölçüldü — `RejectMaster` köreltildi:
      **4 × TS2578**; `countries`ten sarma kaldırıldı: **3 × TS2578**; mutasyonsuz:
      **exit 0**. Karşı örnek de var (master olmayan tabloya yazma `@ts-expect-error`
      **taşımıyor** ve derleniyor) — nöbetçi iki yönlü.
      **`arch:check` ⑨ `master-table-marking` eklendi** (kural sayısı 8 → 9, kanarya
      fixture'ı ve meta-test listesiyle birlikte): tip sistemi *"yazma girişimini"*
      yakalar ama *"işaretlemeyi UNUTMAYI"* yakalayamaz — görecek bir marka yoktur.
      Muafiyet (`arch:save-scoped`) **açık**, varsayılan değil.
      **İkinci hat ölçüldü, kurulmadı → BORÇ-007, Faz 12:** uygulama rolüne yalnızca
      `GRANT SELECT` verilince ham SQL `INSERT`/`UPDATE`/`DELETE` üçü de
      `permission denied` alıyor (gerçek PG18'de koşan test). Bugün kısıtlanacak bir
      uygulama bağlantısı yok; tüketicisi olmayan rol yazmak SAPMA-017'nin
      reddettiği spekülatif yapılandırma olurdu.
      **Faz 12'ye ölçüm bırakıldı:** `Readonly<T>` **sığdır** — iç nesne ve dizi
      mutasyonu derleniyor (`readonly-depth.test-d.ts`). `competitions.rules` bir
      `jsonb` (3.4) ve iç içe; `WorldView` gerçek bir `DeepReadonly` yazmak zorunda.
- [x] **3.4** Coğrafya ve kurumlar — `countries` (tamamlandı), `federations`,
      `competitions` + `CompetitionRules` Zod şeması.
      **SONUÇ:** üç tablo `masterTable(...)` ile sarılı (§3.4.1 biçimi) ·
      `0001_geography_institutions` + **elle yazılmış `down`** · §3.1.0 sütun
      sözleşmesi tek bir modülde (`data-pack-columns.ts`) ki beş tabloya
      kopyalanmasın · `CompetitionRules` Zod şeması tablo tanımının **yanında**
      (`@fms/shared`ın barrel'ına `zod` çekmemek için).
      **`check()` DESTEKLENİYOR — ölçüldü**, ham SQL'e gerek kalmadı; CHECK
      ifadesi sabit diziden **türetiliyor** (TS tipi ile veritabanı kısıtı
      ayrışamıyor, sürüklenme mutasyonuyla doğrulandı: 1 birim + 2 entegrasyon
      testi kırılıyor). Dört CHECK: `source` × 2, `competitions.type`,
      `countries.work_permit_rule_key`. **Sayısal aralıklar bilerek CHECK
      ALMADI** — gerekçe `spec/01` §3.1.2 ②.
      ⚠️ **KAYIP ÖLÇÜMÜNÜN İLK KARIŞIK VAKASI ölçüldü:** `DROP TABLE` × 2 +
      `DROP COLUMN` × 8 aynı geri almada. `allowDataLoss` olmadan
      **reddediliyor** (`migration.downWouldLoseData`, işlem geri alınıyor) ve
      rapor iki sınıfı **`LossItem.kind` ile ayrı ayrı** gösteriyor.
      ⚠️ **İKİ YENİ TUZAK ÖLÇÜLDÜ, `spec/01` §3.1.2'ye yazıldı:** ④ `ALTER TABLE`
      sütunu **sona** ekler ama snapshot **TS sırasını** yazar → tanım fiziksel
      sıraya hizalandı (kontrolü daraltmak yerine) · ⑤ `ordinal_position` =
      `attnum` ve `DROP COLUMN` deliği kalıcı → tek adımlık `ALTER` çevriminde
      `identical: true` **beklenemez**; test farkların **tam listesini** iddia
      ediyor (fazlası = `down` fazla gidiyor).
      ⚠️ **`ON DELETE` kuralı karara bağlandı** (spec sessizdi): uydu →
      `CASCADE`, bağımsız varlık → `RESTRICT`. İkisi de gerçek PG18.6'da
      ölçüldü. 3.5/3.6 bunu `spec/01` §3.1.2 ③'ten okuyacak.
      **Ölçümler:** `pnpm test` 598 → **631** (43 → 45 dosya) · `pnpm test:db`
      23 → **50** (3 → 4 dosya) · round-trip `comparedFacts` 89 → **466**,
      alt sınır yükseltildi · kapsam **%87,73 satır** (eşik %70, DÜŞÜRÜLMEDİ;
      düşüşün sebebi üç Drizzle şema dosyasının %0'ı — ROADMAP'in aşağıdaki
      dürüstlük notu tam olarak bu vaka) · `arch:check` **9 kural, değişmedi**.
      **Mutasyonla doğrulandı:** ① `competitions`ten `masterTable(...)` sarması
      kaldırıldı → `typecheck` **exit 0**, `pnpm test` **631/631 geçti**,
      **yalnızca `arch:check` yakaladı** (kuralın var olma sebebi kanıtlandı)
      ② karşılaştırıcı köreltildi → **50 testin 5'i** kırıldı (3.2b'de 16'da 1) ve
      **üçü yeni tabloların** negatif testleri.
      **D5:** derlenmiş `dist/` düz `node` ile gerçek PG18.6'ya karşı koşturuldu.
- [x] **3.5** Kulüp çekirdeği — `clubs`, `club_facilities`, `club_finances_base`,
      `stadiums`, `rivalries`.
      **SONUÇ:** beş tablo `masterTable(...)` ile sarılı · `0002_club_core` +
      **elle yazılmış `down`** · şema **8 / 11 master tablo** · dokuz FK ve
      hepsinin `ON DELETE` davranışı §3.1.2 ③'e uygun (uydu CASCADE ×5,
      bağımsız varlık RESTRICT ×4) — tam envanter entegrasyon testinde iddia
      ediliyor.
      ⚠️ **`clubs.competition_id` ve `clubs.stadium_id` NULLABLE — karar.**
      `spec/01` ikisini de işaretsiz yazıyor (türetme kuralı `NOT NULL` okur)
      ama aynı tablo `is_national` taşıyor ve milli takımlar **Faz 41'de gerçek
      satırlar**: ne ligi ne sabit sahası var. SAPMA-026 ②'nin (`competitions.tier`)
      birebir aynısı; `NOT NULL` yazılsaydı Faz 41 iki `ALTER … DROP NOT NULL`
      yazmak zorunda kalırdı. Koşullu kural (*"`is_national = false` ise zorunlu"*)
      sütun seviyesinde ifade edilemez → **Faz 11 doğrulayıcısı**, kayıt
      `docs/SPEC-COVERAGE-GAPS.md` **G-10**.
      ⚠️ **`bigint` MOD KARARI ÖLÇÜLDÜ → `{ mode: 'bigint' }`** (`spec/01`
      §3.1.2 ⑥). İki mod **aynı DDL'i** üretiyor; fark JS eşlemesinde:
      `mode: 'number'` 2⁵³+1'i **sessizce** `…992`ye düşürüyor. Entegrasyon
      testi 9007199254740993'ü yazıp Drizzle üzerinden birebir geri okuyor,
      **karşı örnek** de aynı testte (`Number`a düşünce kayıp gösteriliyor).
      ⚠️ **`down` SIRASI ARTIK BİR TERCİH DEĞİL** (`spec/01` §3.1.2 ⑦): iki
      katmanlı FK zinciri (uydular → `clubs` → `stadiums`). `CASCADE`
      **kullanılmadı** — fazla giden bir `down` üretirdi (3.2b'nin sessiz
      sınıfı). Yanlış sıralı bir fixture `down`unun patladığı **ölçüldü**.
      ⚠️ **GİZLİ TUZAK BULUNDU:** `drizzle.config.ts`in `schema` globu
      (`./src/schema/*.ts`) **test dosyalarını da** topluyordu ve
      `drizzle-kit generate` `Vitest cannot be imported in a CommonJS module`
      ile kırıldı. 3.4'te görünmemesinin sebebi sıraydı (migration testlerden
      **önce** üretilmişti). Negatif desen **çalışmıyor** (kaynaktan okundu:
      desenler birleştiriliyor); çözüm extglob `!(*.test|*.test-d)`. Yer
      `spec/09` §11.4 envanterine **11. satır** olarak eklendi ve kendi kapısı
      yazıldı (`drizzle-config.test.ts`) — mutasyonla doğrulandı: desen geri
      alınınca **4 testin 2'si** kırılıyor.
      **Ölçümler:** `pnpm test` 631 → **635** (45 → 46 dosya) · `pnpm test:db`
      50 → **77** (4 dosya) · round-trip `comparedFacts` 466 → **1.223**, alt
      sınır yükseltildi · kapsam **%86,31 satır / %77,37 fonksiyon** (eşik %70,
      DÜŞÜRÜLMEDİ; düşüşün sebebi beş yeni Drizzle şema dosyasının %0'ı —
      aşağıdaki dürüstlük notu) · `arch:check` **9 kural, değişmedi**.
      **Mutasyonla doğrulandı:** ① `clubs`tan `masterTable(...)` sarması
      kaldırıldı → `typecheck` **exit 0**, `pnpm test` **635/635 geçti**,
      **yalnızca `arch:check` yakaladı** (3.4'ün ölçümü yeni bir tabloyla
      tekrarlandı) ② karşılaştırıcı köreltildi → **77 testin 11'i** kırıldı
      (3.2b'de 16'da 1, 3.4'te 50'de 5) ve **altısı yeni tabloların** bozulma
      testleri.
      **D5:** derlenmiş `dist/` düz `node` ile gerçek PG18.6'ya karşı koşturuldu
      — 3 migration uygulandı, 8 tablo, `bigint` kayıpsız, ters sırada geri
      alma, 0 tablo kaldı.
      **Bilerek YAPILMAYANLAR:** `clubs.chairman_person_id` (Faz 4, sütun+FK
      birlikte) · `rivalries` tekrar/kendine-referans kısıtı (Faz 11; kısmi bir
      `UNIQUE` (B,A)'yı sessizce geçirir — D3 sınıfı) · `seated_capacity <=
      capacity` CHECK'i (§3.1.2 ②, içerik denetimi Faz 11)
- [x] **3.6** Görsel varlıklar ve hakemler — `kit_templates`, `club_kits`, `referees`.
      **SONUÇ:** üçü de `masterTable(...)` ile sarılı · `0003_visual_assets_referees`
      + **elle yazılmış `down`** · **ŞEMA ENVANTERİ KAPANDI: 11 / 11 master tablo**
      ve sayı gözle değil `information_schema`'dan **ölçülerek** iddia ediliyor ·
      **on iki FK** ve hepsinin `ON DELETE` davranışı tam envanter olarak test
      edilmiş.
      ⚠️ **`club_kits.asset_id` `spec/01`'DE YOKTU, EKLENDİ.** `spec/12` §17.4
      her formaya bir `image` yolu veriyor, §17.9'un ilk kabul kriteri *"forma
      görselleri ekranda görünüyor"* diyor, ve §17.4 iki durumu **ayırıyor**
      (görsel var / *"yoksa `kit_templates` sisteminden üretilir"*). Sütun
      olmadan bu ayrım şemada **ifade edilemiyordu**; görsel taşıyan diğer beş
      tablonun hepsinde bu sütun var. SAPMA-026'nın türetme kuralının **üçüncü**
      uygulaması (yeni SAPMA açılmadı). `template_id` NOT NULL kaldı — K9 gereği
      prosedürel yedek **her zaman** kurulabilir olmalı.
      ⚠️ **`rivalries` KARARI KOPYALANMADI.** 3.5'te teklik Faz 11'e bırakılmıştı
      (kısmi `UNIQUE` `(B,A)`'yı sessizce geçirir — D3). `club_kits` için gerekçe
      **geçersiz**: `kit_type` kapalı, sıralama belirsizliği yok, kısıt **tam** →
      `(club_id, kit_type)` **UNIQUE kondu** ve negatif testle kanıtlandı.
      ⚠️ **§3.1.2 İKİ KEZ NETLEŞTİRİLDİ:** ②'ye **dördüncü satır** (`// 2 veya 3`
      → sayısal ama **kapalı küme** → CHECK); gerçek ayraç *"dize mi sayı mı"*
      değil, *"sözleşme mi kalibrasyon mu"*. Ve **⑧ eklendi**: `kit_templates`
      gibi **sahipsiz sözlük tabloları** ③'ün ikili ayrımının dışında →
      **RESTRICT** (Faz 4'ün `injury_types`/`staff_roles`'ü aynı sınıf).
      **Ölçümler:** `pnpm test` **635 / 46 dosya** (değişmedi — 3.6 birim testi
      getirmedi, kanıt entegrasyon tarafında) · `pnpm test:db` 77 → **103**
      (4 dosya) · round-trip `comparedFacts` 1.223 → **1.619** (sınır önce
      erişilemez bir değere konup gerçek değer testin çıktısından okundu —
      3.5'in tahmin hatası tekrarlanmadı) · kapsam **%85,12 satır / %75,44
      fonksiyon** (eşik %70, DÜŞÜRÜLMEDİ, dosya dışlanmadı) · `arch:check`
      **9 kural, değişmedi** · soğuk build 8/8, **11,79 s**.
      **Mutasyonla doğrulandı:** ① `referees`ten `masterTable(...)` kaldırıldı →
      `typecheck` **exit 0**, `pnpm test` **635/635 geçti**, **yalnızca
      `arch:check` yakaladı** (üçüncü tekrar) ② karşılaştırıcı köreltildi →
      **103 testin 16'sı** kırıldı. **Seri `spec/09` §11.5'e yazıldı:**
      %6,3 → %10,0 → %14,3 → **%15,5**.
      **D5:** derlenmiş `dist/` düz `node` ile gerçek PG18.6'ya karşı — dört
      migration, **11 tablo**, forma `asset_id`'sinin iki durumu da temsil
      edildi, ikinci `home` forması **reddedildi**, ters sırada geri alma,
      0 tablo kaldı.
      **Bilerek YAPILMAYANLAR:** `referees.person_id` (Faz 4 — üçüncü ve son
      ileri FK, kabul kriteri zaten yazılı) · `color3` ↔ `colorSlots` tutarlılığı
      (Faz 11, **G-12**) · `rivalries` teklik kısıtı (Faz 11, **G-11**; fikir
      değişirse 3.7'de bedelsiz)
- [x] **3.7** İndeksler + `pg_trgm` GIN + `CREATE EXTENSION` migration'ı.
      **SONUÇ:** `0004_search_indexes` + elle `down` · iki uzantı (`pg_trgm` 1.6,
      `unaccent` 1.1) · `immutable_unaccent` sarmalayıcısı · **dört indeks**:
      `clubs_competition_id_idx` · `competitions_country_id_idx` ·
      `clubs_name_trgm_idx` (GIN) · `rivalries_pair_unique_idx` (UNIQUE ifade).
      ✅ **Faz 8'in kabul kriteri artık SAĞLANABİLİR:** gerçek tabloda
      `'besiktas'` sorgusu **`Beşiktaş`**'ı buluyor ve planlayıcı GIN indeksini
      **seçiyor** (`Bitmap Index Scan`).
      ⚠️ **`unaccent`in İKİ AŞIRI YÜKLEMESİ DE `STABLE`** — sözlüğü açıkça veren
      `unaccent(regdictionary, text)` biçiminin `IMMUTABLE` olabileceği hipotezi
      **ölçümle çürütüldü**. `IMMUTABLE` sarmalayıcı **şart** ve bir **iddia**:
      `unaccent.rules` bir majör yükseltmede değişirse indeks sessizce eskir,
      düzeltmesi `REINDEX`. **Bedel gürültülüye çevrildi:** entegrasyon testi
      sarmalayıcının çıktısını altı Türkçe ad için sabitliyor → sözlük değişirse
      **CI kırılır**. `spec/01` §3.1.2 **⑨**.
      ⚠️ **G-11 DARALDI — 3.5'in kararı geri alındı ve sebebi yazılı.** 3.5'te
      teklik Faz 11'e bırakılmıştı; gerekçe (a) kısmi `UNIQUE` `(B,A)`'yı
      sessizce geçirir (b) tam koruma ingest'e sıralama sözleşmesi dayatır idi.
      **`LEAST/GREATEST` ifade indeksi üçüncü bir yol** ve iki gerekçeyi de
      düşürüyor: koruma **tam**, sözleşme **yok**. Kalan tek delik `(A,A)` →
      Faz 11, ve **koşan bir testle görünür** tutuluyor.
      ⚠️ **`competitions`a trigram indeksi KONMADI — yeni boşluk G-13.** Görünen
      adı `name_key`, yani bir **i18n anahtarı**; trigram araması anlamsız. Ama
      ROADMAP Faz 17 global aramayı *"lig + turnuva"* için de istiyor → o
      mekanizma Faz 17'de seçilecek.
      ⚠️ **`COLLATE`'li indeks YAPILMADI:** ROADMAP 3.7 onu saymıyor (K12),
      tüketicisi **Faz 32** ve doğru indeks o fazın `ORDER BY`'ının tam şekline
      bağlı — bugün kurmak sütunu ve yönü **tahmin etmek** olurdu. 3.0'ın
      `Index Only Scan` ölçümü kayıtlı, Faz 32 onu okur.
      ⚠️ **UZANTI `down`U — PG fazla gitmeyi KENDİSİ engelliyor** (`spec/01`
      §3.1.2 ⑩): `DROP EXTENSION` CASCADE'siz, bağımlı indeks varken
      **reddediliyor**. `DROP TABLE`ın aksine *"fazla giden down"* burada
      yapısal olarak imkânsız.
      ⚠️ **TEST KONTEYNERİ ÜRETİMDEN FARKLI LOCALE KULLANIYOR — ölçüldü ve
      DAVRANIŞ AYNI ÇIKTI.** `testcontainers` varsayılan `initdb` ile
      `datlocprovider = c` (libc `en_US.utf8`), compose ise SAPMA-020 gereği
      `b` (builtin `C.UTF-8`). D2 ②'nin sorusu buydu; iki veritabanında da
      `similarity` **0,2857**, `%` **f**, `unaccent`li benzerlik **1,0**,
      `lower`/`ILIKE` doğru — yani `test:db` ölçümleri **aktarılabilir**.
      ⚠️ Çakışan bir sonuç çıksaydı bütün trigram testleri üretim hakkında
      hiçbir şey söylemiyor olurdu.
      **Ölçümler:** `pnpm test` 635 → **639** (46 → 47 dosya) · `pnpm test:db`
      103 → **126** (5 dosya) · round-trip `comparedFacts` 1.619 → **1.627**
      (sınır yine erişilemez bir değerden ölçülerek okundu; artış +8 çünkü
      indeksler tablo/sütun eklemiyor) · kapsam **%85,09 satır / %75,26
      fonksiyon** (eşik %70) · `arch:check` **9 kural, değişmedi** ·
      soğuk build 8/8.
      ℹ️ **Kapsam düştü, sebebi bulundu, kapatıldı:** yeni `src/schema/search.ts`
      %0'la paydaya girip kapsamı **%84,64**'e düşürmüştü. Yazılan birim testi
      bir *import testi değil*: `searchNormalizedSql`in ifadesini **sabitliyor**
      ve o ifade hem indeksin hem sorgunun tanımı.
      **Mutasyonla doğrulandı:** ① karşılaştırıcı köreltildi → **126 testin
      19'u** kırıldı; seri %6,3 → %10,0 → %14,3 → %15,5 → **%15,1** (oran
      düştü, **pay 16 → 19 arttı** — okuma kuralı `spec/09` §11.5'te)
      ② `searchNormalizedSql`in `lower`/`unaccent` **sırası** değiştirildi →
      *"arama doğru sonucu buluyor"* testi **GEÇMEYE DEVAM ETTİ**, yalnızca plan
      testi kırıldı. Yani sessiz bozulma sınıfı gerçek ve tek nöbetçisi plan
      testi.
      **D5:** derlenmiş `dist/` düz `node` ile gerçek PG18.6'ya karşı — beş
      migration, iki uzantı, dört indeks, `'besiktas'` → `Beşiktaş`, ters çift
      reddedildi, tam geri almada **0 tablo ve 0 uzantı** kaldı.
      ⚠️ **3.1'de ölçülen kısıt:** düz `pg_trgm` Türkçe aramayı sağlamıyor
      (`'Beşiktaş' % 'besiktas'` → **`f`**, benzerlik 0,286 · eşik 0,3) çünkü Türkçe
      harf içeren trigramlar hash'leniyor. **`unaccent` gerekiyor** (mevcut, 1.1;
      benzerlik 1,0'a çıkıyor) ama `STABLE` olduğu için indeks ifadesinde doğrudan
      **kullanılamıyor** — `IMMUTABLE` sarmalayıcı şart. Bu, Faz 8'in kabul
      kriterinin dayanağı
- [x] **3.8** Seed betiği (`tools/data-cli/src/seed.ts`) — 6 ülke + 6 lig + 5 kupa,
      **deterministik** (K2), **idempotent** (iki kez koşulur).
      **SONUÇ: kabul kriteri 2 KAPANDI** — gerçek PG18'de 6 ülke + 11 yarışma
      (6 lig + 5 kupa), FK'lar anahtarla çözüldü, `clubs` ve `federations` boş
      kaldı. ℹ️ Dosya `src/` altında: paketin `rootDir`ı `src` ve
      `coverage.include` deseni oradan okuyor; `tools/data-cli/seed.ts` tip
      denetimine bile girmezdi.
      ⚠️ **YAZMA YOLU `SqlExecutor` (ham SQL) — K4'ün §3.4.1'de ADIYLA SAYILAN
      istisnası.** `db.writable` yapısal olarak kullanılamaz (master tablo
      verilirse parametre `never`); zorlamak `as unknown as` yazmak, yani
      §3.4.1'in saydığı üç atlama yolundan birini **bilerek** açmak olurdu.
      **Bedeli dürüstçe kabul edildi ve ölçülebilir hâle getirildi:** ham SQL'de
      sütun adları tip denetimi görmez → `seed-sql.test.ts` sütun listesini
      Drizzle'ın `getTableColumns()` metadatasıyla iki yönlü karşılaştırıyor
      (yazılan her sütun tabloda var mı · `NOT NULL` + varsayılansız her sütunu
      seed yazıyor mu). **Mutasyonla kanıtlandı:** `confederation` bağı
      kaldırıldı → `pnpm typecheck` **exit 0**, `pnpm lint` **temiz**, yalnızca
      bu kapı öttü (64 testin 1'i). 3.7 günlük #37'nin dersinin uygulaması.
      ⚠️ **`ON CONFLICT (key) DO UPDATE` — `DO NOTHING` DEĞİL.** Master veride
      korunacak elle bir düzeltme yok (K4'ün var olma sebebi); seed doğruluk
      kaynağı. `DO NOTHING` Faz 7–9'un güncellenmiş paketini **sessizce** yok
      sayardı. `updated_at` **açıkça** `now()` alıyor (`defaultNow()` yalnızca
      `INSERT`te işler), `created_at` hiç güncellenmiyor.
      **İdempotentlik "patlamadı" ile değil ONARIM ile kanıtlandı:** satır kasten
      bozuldu (`confederation='BOZUK'`, `uefa_coefficient=0`, `football_level=1`),
      seed yeniden koştu, üç değer de **onarıldı**, satır sayısı ve `id`'ler sabit.
      ⚠️ **`ON CONFLICT (key)` `code` ÇAKIŞMASINI GÖRMÜYOR — delik bilerek AÇIK.**
      `countries.code` ve `competitions.code` ayrı `UNIQUE`; `key`i yeni ama
      `code`u mevcut bir satır `23505` ile koşuyu öldürür. Kapatılmadı çünkü böyle
      bir satır **seed verisinin kendisinin yanlış** olduğu anlamına gelir ve
      gürültülü ölmek, sessizce yanlış satırı güncellemekten iyidir.
      **Koşan bir testle görünür tutuldu** (G-11'in 3.5'teki biçimi): entegrasyon
      testi hatanın `countries_code_unique`ten geldiğini **adıyla** iddia ediyor.
      ⚠️ **`SeededRng` TAŞINMADI, tohum UYDURULMADI (K2).** Kapsamdaki iki tablonun
      hiçbir sütunu rastgelelik istemiyor — tohum isteyen tek sütun
      `clubs.crest_seed` ve `clubs` seed edilmiyor (ölçüldü). K2 **yapısal olarak**
      sağlanıyor ve iddia ediliyor: aynı girdi birebir aynı SQL'i üretiyor.
      ⚠️ **`key` DEĞERLERİ ÖLÇÜLDÜ, TAHMİN EDİLMEDİ:** `spec/12` §17.3'ün
      `slugify`'ı 17 ad üzerinde çalıştırıldı (`Türkiye Kupası` → `turkiyekupasi`,
      `Süper Lig` → `superlig`, `Serie A` → `seriea`). Algoritma kusurlu
      (SAPMA-022) ama seed onunla **tutarlı** kalıyor; Faz 7 düzelttiğinde ikisi
      birlikte düzelir. Bu 17 ad kalibrasyona ikinci örneklem.
      ⚠️ **`name_key` bir i18n ANAHTARI (K5)** — `'Süper Lig'` değil
      `'competition.tur.superlig'`. Gerçek tabloda doğrulandı; **Faz 5 bu 17
      anahtarın tüketicisi.**
      ⚠️ **`externalIds` HEPSİNDE BOŞ ve bu D1 disiplini** — doğrulanmamış bir
      Wikidata Q-kimliği yazılmadı; şemanın dolu yolu birim testinde sentetik
      değerle kapsandı. **`source: 'procedural'`** → yeni boşluk **G-14**.
      ⚠️ **`playoffSpots: 0`** — `CLAUDE.md` §16.2 ③ (anayasa) `competition-rules.ts`
      yorumundaki *"Türkiye: 4"* örneğine karşı; çelişkide anayasa kazandı.
      ⚠️ **`pnpm test:db` ÇOK PROJELİ OLDU** (`db-integration` +
      `data-cli-integration`) ve sebebi konfor değil: testi
      `packages/db/integration/` altına koymak `arch:check`i kırıyor — **sonda
      dosyasıyla ölçüldü**, `layer-direction` ve `undeclared-dependency` birden
      öttü. **Süre artmadı:** 31,2 s (tek proje) → 27,1 s / 28,8 s (iki proje),
      projeler paralel koşuyor. `spec/09` §11.4 desen envanterine **aynı gün**
      9. satır güncellendi + 12. satır eklendi.
      ⚠️ **`.env`i KİMSE OKUMUYORDU — D5 adımında bulundu.** İlk derlenmiş koşu
      `REDIS_URL`/`JWT_SECRET` eksik diye patladı; eksik olan değişkenler değil,
      onları yükleyecek adımdı (`apps/api` bunları Docker `-e` ile alıyor).
      Çözüm Node 24'ün yerleşik `--env-file-if-exists` bayrağı — bağımlılık yok.
      **Ölçümler:** `pnpm test` 639 → **703** (47 → 50 dosya) · `pnpm test:db`
      126 → **146** (5 → 6 dosya) · kapsam **dört metrikte de YÜKSELDİ**:
      satır %85,09 → **%85,39**, ifade %85,23 → **%85,53**, fonksiyon %75,26 →
      **%78,48**, dal %87,82 → **%88,03** (eşik %70, DÜŞÜRÜLMEDİ, dosya
      dışlanmadı) · `arch:check` **9 kural, değişmedi** · soğuk build 8/8
      (11,49 s ve 21,29 s — varyans yüksek, ikisi de yazıldı).
      🔵 **SAPMA-027 AÇILDI:** `spec/09` §11.4'ün *"`tools/` kapsam eşiğine dahil
      değildir"* iddiası **ölçümle çürütüldü** — payda dört metrikte de büyüdü
      (+66 satır, +47 fonksiyon). İddia bugüne kadar sınanmamıştı çünkü
      `tools/data-cli/src/index.ts` `export {}` idi: bakacak bir şey bulamayan
      bir kapı "temiz" diyordu (SAPMA-024'ün kardeşi).
      **Mutasyonla doğrulandı (dört ayrı mutasyon):** ① `confederation` bağı
      silindi → yalnızca metadata kapısı, `typecheck`/`lint` sessiz ②
      `DO UPDATE` → `DO NOTHING` → 2 test ③ `"updated_at" = now()` silindi →
      2 test ④ `RETURNING` sıralaması kaldırıldı → 1 test. Ayrıca
      karşılaştırıcı köreltildi → **146 testin 19'u**; seri %6,3 → %10,0 →
      %14,3 → %15,5 → %15,1 → **%13,0**. **Pay 19'da SABİT ve bu beklenen:**
      3.8 yeni migration yazmadı, yani round-trip yüzeyi büyümedi.
      **D5:** derlenmiş `dist/seed.js` **düz `node`** ile gerçek PG18.6'ya karşı
      iki kez koşturuldu — 6+11 yazıldı, `id` toplamı 21 (satır yeniden
      yaratılmadı), bozulan satır onarıldı, `created_at` birebir aynı,
      `updated_at` ilerledi, FK'ların 8'i doğru ülkeye 3'ü NULL'a bağlandı,
      `clubs`/`federations` 0 kaldı.
      **Bilerek YAPILMAYANLAR:** `federations` seed'i (kabul kriterinde yok, K12) ·
      kulüp/stadyum/hakem verisi (Faz 8–9) · `EXPLAIN ANALYZE` süre ölçümü (3.9) ·
      `spec/12` slug algoritmasının düzeltilmesi (Faz 7, SAPMA-022)
- [x] **3.9** `EXPLAIN ANALYZE` ölçümü (< 20 ms) seed verisiyle + FK/`ON DELETE`
      envanteri `information_schema`'dan **programatik** doğrulanır (gözle sayılmaz).
      **SONUÇ: kabul kriteri 3 ve 4 KAPANDI.**
      ⚠️ **KRİTER 3 BİR LİSTEYLE DEĞİL, BİR KURALLA KAPANDI.** Elle yazılmış on iki
      FK'lık envanter iki kez güncellenmeyi unuttu (günlük #30, #36) ve Faz 4 üç
      ileri FK daha getiriyor — üçüncü kırılma yoldaydı. Kaynağı `pg_constraint`ten
      `information_schema`'ya çevirmek bunu **çözmezdi** (mevcut test zaten
      katalogdan okuyor; değişen tek şey adres olurdu). Yapılan şey beklentiyi
      `spec/01` §3.1.2 ③ + ⑧'den **türetmek**: yeni bir saf modül
      (`src/schema/fk-policy.ts`) tabloyu sınıflandırıyor, entegrasyon testi
      katalogdan okuduğu olguları ona veriyor.
      ⚠️ **ÜÇÜNCÜ SINIF (⑧) ARTIK ELLE ADLANDIRILMIYOR — ÖLÇÜLEREK BULUNUYOR.**
      §3.1.2 ⑧ `kit_templates`i *"`key` taşımıyor ama hiçbir şeyin uydusu da değil
      — **sahipsiz** bir sözlük tablosu"* diye tarif ediyor ve *"sahipsiz"*
      ölçülebilir bir şey: bir uydunun tanımı gereği sahibine FK'sı vardır, sözlük
      tablosunun **giden FK'sı yoktur**. Ölçüldü (PG 18.6, 11 tablo): bu koşulu
      sağlayan **tek** tablo `kit_templates`. Yani kural, ⑧'in elle saydığı tabloyu
      **adı hiçbir yerde geçmeden** buluyor; Faz 4'ün `injury_types`/`staff_roles`
      tabloları aynı koşulu sağlayacak. Türetme **12/12** FK'da gerçek davranışla
      örtüştü.
      ℹ️ **Liste testi SİLİNMEDİ ve bu bir tekrar değil:** liste *"bugün şunlar
      var"*, kural *"olması gereken bu"* diyor. Yalnızca kural kalsaydı kuralın
      kendisi yanlış olduğunda hiçbir şey ötmezdi (3.3'ün birim testi + kanarya
      kararının aynısı).
      ⚠️ **KRİTER 4 İKİ AYRI ETİKETLİ İDDİA OLARAK YAZILDI — birleştirilmedi.**
      **İDDİA A** (kriteri kapatan): seed verisiyle, dört sorgu, hepsi bütçenin
      altında — **0,006–0,012 ms** (D5, derlenmiş çıktı). Ölçülen hacim **6 ülke
      + 11 yarışma**, diğer dokuz tablo **boş**. **İDDİA B** (kriteri kapatmaz,
      indeksin *gerekçesini* verir): 3.001 satırda Türkçe arama **indeksli
      0,92 ms · indekssiz 6,13 ms**. Tek bir süre sayısı *"< 20 ms"* diye
      yazılsaydı, bakacak bir şey bulamayan bir kapı `✅` almış olurdu
      (SAPMA-024 sınıfı) — sayı hacmiyle birlikte anlamlı.
      ⚠️ **BU HACİMDE Seq Scan DOĞRU KARARDIR** ve test onu **iddia ediyor**, ki
      gelecekte biri planı görüp *"indeksler çalışmıyor"* diye regresyon sanmasın.
      ⚠️ **`ANALYZE` YAPILMAMIŞ TABLODA ÖLÇÜM, GURUR VERİCİ BİR YALAN ÜRETİYOR —
      3.9'un en önemli bulgusu (D2).** Migration + seed sonrası `reltuples` = **-1**
      (PG 14+ bunu *"hiç ANALYZE edilmedi"* için kullanır, *"edildi ve boş"* olan
      `0` ile aynı şey değil). İstatistiksiz planlayıcı dört sorgunun **dördünde de
      indeksi seçiyor**; `ANALYZE` sonrası dördü de Seq Scan'e düşüyor. Yani ölçüm
      `ANALYZE`sız alınsaydı rapora *"indeksler kullanılıyor"* yazılırdı ve
      **yanlış** olurdu. Tuzağın yönü tehlikeli: yanlış cevap doğru cevaptan iyi
      görünüyor. İki durum **yan yana** bir testte sabitlendi.
      ⚠️ **PLAN SEÇİMİ HACME DEĞİL SEÇİCİLİĞE BAĞLI — ölçüldü.** Aynı tabloda, aynı
      3.001 satırda: `'besiktas'` (tek satır eşleşiyor) GIN indeksini **kullanıyor**,
      `'kulup1234'` (binlerce benzer ad) **Seq Scan**'e düşüyor. İkisi de doğru
      karar. Bu satır olmadan 3.7'nin *"3.000 satırda indeks kullanılıyor"*
      sonucu **hacme bağlı bir kural** gibi okunurdu; değil.
      ℹ️ **Planlayıcının davranış değiştirdiği hacim ÖLÇÜLDÜ** (temiz artan
      rampa, her adımda `VACUUM ANALYZE`): `clubs_competition_id_idx` için
      **240 satırda Seq Scan, 500 satırda Bitmap Index Scan** (relpages 5 → 11).
      **v1'in gerçekçi hacmi ~118 kulüp** (ROADMAP Faz 8) — yani o indeksin
      tüketicisi bir kullanıcı sorgusu **değil**, `ON DELETE RESTRICT` denetimi
      (`competitions.ts` bunu zaten yazıyordu). Dürüst sonuç, başarısızlık değil.
      ⚠️ **ÖLÇÜM ARACININ KENDİSİ DOĞRULANDI (D2, üç tuzak):** ① soğuk/sıcak farkı
      **yok** (0,059 → 0,055 ms) ② `TIMING ON` vs `TIMING OFF` farkı **yok**
      (0,050–0,054 ms her ikisinde) ③ `ANALYZE` — **tek gerçek tuzak** (yukarıda).
      Isıtma koşusu yine de yapılıyor: yokluğunun zararsızlığı *"muhtemelen"* değil
      **ölçülerek** biliniyor.
      ⚠️ **`pnpm perf:budget` KURULMADI (K12).** `spec/09` §11.6'nın 15 satırlık
      bütçesini ölçen kapı **G-01** ve **Faz 6**'ya atanmış; §11.6'da veritabanı
      sorgusu satırı **yok** (sayıldı) — *"< 20 ms"* ROADMAP Faz 3'ün kendi
      kriteri, sınır temiz. 3.9'un kurduğu **yöntem** G-01'e not olarak bırakıldı.
      **Ölçümler:** `pnpm test` 703 → **724** (50 → 51 dosya) · `pnpm test:db`
      146 → **160** (6 → 7 dosya) · round-trip `comparedFacts` **1.627**
      (değişmedi — 3.9 şema nesnesi eklemedi; erişilemez sınır konup çıktıdan
      okundu) · kapsam **dört metrik de yine YÜKSELDİ**: satır **%85,53** ·
      ifade **%85,68** · fonksiyon **%78,61** · dal **%88,25** (eşik %70;
      `fk-policy.ts` 9/9 satır, 2/2 fonksiyon, 9/9 dal) · `arch:check` **9 kural,
      değişmedi** · soğuk build 8/8 **5,80 s** (⚠️ varyans yüksek: 3.8'de aynı
      komut 11,49 s ve 21,29 s ölçmüştü).
      **Mutasyonla doğrulandı (üç ayrı mutasyon):** ① `classifyTable` sözlük
      sınıfını üretmez hâle getirildi → entegrasyon testi kırıldı ve fark
      **`kit_templates: dictionary → satellite`** olarak adıyla raporlandı;
      `typecheck` ve `lint` **sessiz** ② `expectedDeleteAction`ın hedef denetimi
      (⑧'in var olma sebebi) kaldırıldı → 2 birim + 1 entegrasyon testi kırıldı,
      uyumsuzluk listesi FK'yı adıyla gösterdi ③ karşılaştırıcı köreltildi →
      **160 testin 19'u**; seri %6,3 → %10,0 → %14,3 → %15,5 → %15,1 → %13,0 →
      **%11,9**. **Pay 19'da sabit ve bu BEKLENEN:** 3.9 de migration yazmadı,
      round-trip yüzeyi büyümedi.
      **D5:** derlenmiş `dist/` düz `node` ile gerçek PG18.6'ya karşı — 11 tablo
      sınıflandırıldı (`kit_templates` = `dictionary`, türetilerek), **12 FK, 0
      uyumsuzluk**, `ANALYZE` öncesi dört plan da Index, sonrası dördü de Seq Scan,
      süreler 0,006–0,012 ms, bütçe **sağlandı**.
      ⚠️ **ÖLÇÜMÜN MİMARİSİ RAPORUN PARÇASI (K14):** yukarıdaki süreler
      **Windows + Docker Desktop (amd64)** üzerinde alındı; üretim Oracle Ampere
      A1 (**ARM64**). En yakın vekil CI'ın `arm64` entegrasyon işi — orada da
      yeşil, yani iddia iki mimaride birden koşuyor. Mutlak süreler taşınabilir
      **değil**, bütçe kararı taşınabilir.
      **Bilerek YAPILMAYANLAR:** yeni indeks · yeni migration · `COLLATE`li indeks
      (Faz 32) · `pnpm perf:budget` (Faz 6, G-01) · seed'in büyütülmesi (Faz 8–9)
- [x] **3.10** ER diyagramı + `docs/schema/world.md` + faz kaydı + PR.
      **SONUÇ: kabul kriteri 5 KAPANDI — FAZ 3 TAMAMLANDI (5/5).**
      **Eklenen:** `packages/db/src/schema-state/er-diagram.ts` (saf üretici,
      **18 birim testi**) · `packages/db/integration/er-diagram.itest.ts`
      (nöbetçi, 3 test) · `docs/schema/world.md` **371 satır**, diyagram
      **176 satır** · `docs/reports/` arşivi (karar ⑦) · `spec/09` §11.5'e
      **iki yeni yöntem kuralı**.
      ⚠️ **DİYAGRAM ÜRETİLDİ, ÇİZİLMEDİ.** Kaynak canlı katalog
      (`introspectSchema` → `information_schema` + `pg_catalog`), yani
      diyagramın anlattığı şey **çalışan veritabanının kendisi**. Gerekçe:
      elle çizilmiş bir mermaid şemanın **üçüncü** temsili olurdu ve
      üçüncüsünü hiçbir şey denetlemez (3.9 günlük #43).
      ⚠️ **HER İŞARET BİR TÜRETME, HİÇBİRİ ELLE LİSTE DEĞİL.** Kardinalitenin
      sol ucu `pg_attribute.attnotnull`dan, sağ ucu kısıt sütun listelerinden;
      `UK` **yalnızca tek sütunlu** `UNIQUE`ten (çok sütunlu `(club_id,
      kit_type)` için sütun başına `UK` yazmak *"club_id tek başına
      benzersiz"* demek olurdu — **yanlış**); tip adı `data_type`tan
      **sanitize edilerek** (`timestamp_with_time_zone`). Kısaltma **tablosu
      bilerek kullanılmadı**: Faz 4 yeni bir tip getirdiğinde güncellenmeyi
      unutur (günlük #30/#36 sınıfı) ve unutulduğunda mermaid sessizce bozulur.
      ⚠️ **Sağ uç her zaman `o` ile başlıyor** (*"sıfır veya"*): katalog bir
      çocuk satırının **var olma zorunluluğunu** bilmiyor. `|{` yazmak
      ölçülmemiş bir iddia olurdu (D1).
      ⚠️ **Ayrıştırılamayan bir kısıt SESSİZCE ATLANMIYOR, fırlatıyor.**
      Atlansaydı diyagram bir FK eksik çizilir ve sayı karşılaştırması o
      eksikle **tutarlı** olurdu — hiçbir şey ötmezdi (SAPMA-024 sınıfı).
      **Ölçümler (hepsi bugün yeniden alındı, ara ölçümlerden kopyalanmadı):**
      `pnpm test` 724 → **744** (51 → 52 dosya) · `pnpm test:db` 160 → **163**
      (7 → 8 dosya) · kapsam **dört metrik de YÜKSELDİ**: satır %85,53 →
      **%86,99** · ifade %85,68 → **%87,04** · dal %88,25 → **%88,68** ·
      fonksiyon %78,61 → **%80,00** (eşik %70, DÜŞÜRÜLMEDİ, dosya dışlanmadı;
      `er-diagram.ts` **%100 satır, %100 fonksiyon**) · `arch:check`
      **9 kural, değişmedi** · soğuk build 8/8, `Cached: 0` doğrulandı,
      **iki koşu: 10,90 s ve 7,01 s** (⚠️ fazda ölçülen aralık 5,80–21,29 s).
      ℹ️ **Kapsamdaki ilk boşluk ölçümle bulundu ve kapatıldı:** ilk koşuda
      `er-diagram.ts` **satır 113**'te (`PRIMARY KEY`/`UNIQUE` ayrıştırma
      hatası) kapsanmamıştı — yani "sessizce atlamıyor, fırlatıyor" iddiasının
      iki yolundan **biri hiç koşulmamıştı**. İki test eklendi.
      **Mutasyonla doğrulandı (üç ayrı mutasyon):** ① belgeden `stadiums`
      varlığı silindi → **3/3** kırıldı, fark `entities: 10 ≠ 11` ② migration
      SQL'inden `NOT NULL` kaldırıldı → **163'ün 7'si** kırıldı, `pnpm test`
      **sessiz** (o anda 742/742) ③ karşılaştırıcı köreltildi → **163'ün 19'u**; seri
      %6,3 → %10,0 → %14,3 → %15,5 → %15,1 → %13,0 → %11,9 → **%11,7**.
      **Pay 19'da sabit ve bu BEKLENEN:** 3.10 migration yazmadı, round-trip
      yüzeyi büyümedi. Yeni üç test `compareSchemas`ı hiç çağırmıyor ve
      çağırmamalı — kendi nöbetçileri var.
      **D5:** derlenmiş `dist/` düz `node` ile gerçek PG18.6'ya karşı —
      5 migration, 11 tablo, 12 FK, diyagram üretildi ve
      `entities=11 relationships=12` ölçüldü.
      ⚠️ **KAPI KAPSAMI ÖLÇÜLDÜ:** commit **15 dosya** değiştiriyor — **11
      Markdown + 4 `.ts`**. `.prettierignore` `*.md` taşıyor (SAPMA-024), yani
      `format:check` on bir dosyanın **hiçbirine bakmadı**. **Ama dört `.ts`e
      baktı ve işini yaptı:** ilk koşuda `er-diagram.ts`'i **reddetti**, `lint`
      **üç gerçek hata** buldu. Belgelerin doğruluğunu denetleyen tek kapı
      **ER nöbetçisi**.
      ✅ **RENDER DOĞRULANDI — akıl yürütmeyle değil, ÖLÇÜMLE.** Sözdiziminin
      *"dar bir alt kümede tutulduğu"* bir **iddiaydı**; `mermaid-cli 11.16.0`
      (tek seferlik `npx`, **repoya bağımlılık eklenmedi**) blok üzerinde
      koşturuldu: **403 KB SVG, 2416×3226**, hata kutusu **yok**, on bir varlık
      adının **her biri birebir bir kez**, işaretler **9 `PK` + 2 `PK,FK` + 10
      `FK` + 8 `UK`** (= 11 birincil anahtar, 12 FK sütunu, 8 tek sütunlu
      benzersizlik — diyagramla **tam örtüşüyor**), yorumlar **16 `null` +
      2 `uq:club_id+kit_type`**.
      **Bilerek YAPILMAYANLAR:** yeni tablo/migration/indeks · diyagrama CHECK
      kısıtı ve indeks çizimi (metinsel tablolarda, mermaid ER'de yeri yok) ·
      render doğrulamasının **kalıcı bir kapıya** çevrilmesi (bir `mermaid`
      bağımlılığı + tarayıcı indirmesi ister, K12 — bugün tek seferlik ölçümle
      yetinildi ve sonucu yazıldı) · merge (kullanıcı yapar)

> **⚠️ `packages/db` kapsamı bu fazda bir KANIT sayılmaz.** Drizzle şema dosyaları modül
> düzeyi ifadelerden ibarettir: bir testin onları **import etmesi** kapsamı %100 yapar,
> hiçbir iddia doğrulanmadan. Bu, `packages/engine`'in %85 eşiğiyle **aynı sınıf yalan**
> (`PROJECT_MEMORY.md` Faz 2 kaydı §6). Bu fazın gerçek kanıtı migration round-trip'i ve
> `EXPLAIN` ölçümüdür. Faz kaydına dürüstlük notu olarak yazılır.

---

## FAZ 4 — Veritabanı Şeması II: Oyuncu, Sözleşme, Personel

**Hedef:** Oyunun canlı varlıklarının şeması + delta kayıt için hazırlık.

**Kapsam:**
- **Tablolar — 11 MASTER** *(4.0'da ölçüldü, 4.1'de işlendi; eski liste 19 sayıyordu — SAPMA-030)*:
  `people` (oyuncu/personel/menajer ortak kimlik) · `players` · `player_attributes`
  (47 görünür) · `player_hidden_attributes` (**10 gizli** — SAPMA-001) ·
  `player_positions` (mevki yetkinlik matrisi) · `player_traits` ·
  **`player_stats_history`** · `staff` · `staff_attributes` · `managers` ·
  `manager_attributes`
- ⚠️ **KAPSAMDAN ÇIKAN SEKİZ TABLO — hepsinin gideceği yer yazılı** (SAPMA-030):

  | Tablo | Nereye | Neden |
  |---|---|---|
  | `contracts` · `contract_clauses` | **Faz 12** | `spec/01` **§3.2 save katmanı**. Save-scoped bir tabloyu save-delta mimarisi yokken seed etmek tutarsız; *"5.000 sahte oyuncu"* kriteri onları istemiyor; transfer bloğu (Faz 30–33) Faz 12'den **sonra** geliyor, gecikme yok |
  | `player_injuries` → **`injuries`** | **Faz 12** | Ad çakışması: tablo `spec/01` §3.2'de `injuries` adıyla ve `saveId FK` taşıyor |
  | `injury_types` | **Faz 12** | Tüketicisi **var** (Faz 39, ~40 tür; satırlar veri taşıyor → gerçek sözlük tablosu). Ama tek FK kaynağı `injuries` ve `fk-policy.ts`'in sözlük kuralı yalnızca tabloyu **hedefleyen** FK'lar için cevap üretir — `injuries` yokken ona giden hiçbir FK yok, yani Faz 4'te açmak **kendisi için yazılmış kuralı bile çalıştırmaz** |
  | `manager_career` | **Faz 12** | Tüketicisi **var ve kaynaktan doğrulandı** (Faz 47 S207 *"kariyer geçmişi (her kulüp, süre, istatistik), kupa vitrini"*), ama kariyer **oyun oynanırken** birikir → save-scoped. Master'da önceden yüklenmiş menajer geçmişi Faz 8/9 ingest kapsamında **yok** (arandı) |
  | `player_career_history` → **`player_stats_history`** | **Faz 4'te KALIR, adı düzeldi** | Aynı tablonun eski adı. `spec/01` §3.1'deki tablo sezon × turnuva gerçek dünya istatistiğini tutuyor ve Faz 10 nitelik türetiminin girdisi. ⚠️ **`club_id` sütunu ekleniyor** — spec'te yoktu (0 eşleşme) ve onsuz Faz 19 *"kariyer bazlı istatistik"*, Faz 47 *"her kulüp, süre"* cevaplanamıyor |
  | `player_personalities` | **AÇILMAZ** | `spec/02` §4.6 **aktif olarak karşı**: *"Kişilik **saklanmaz, türetilir**"* — `derivePersonality(hidden)`. Faz 10 kişiliği **türetiyor**. Bu bir *"tüketici bulunamadı"* değil, bir **tasarım yasağı** |
  | `player_relationships` | **AÇILMAZ** | `spec/06` §8.6 `affinity(a,b)` bir **formül** (uyruk/dil/yaş/kişilik/kıdem), klikler `> 0,62` ile **hesaplanıyor** — saklanan kenar listesi yok. Faz 38 Mentorluk bir **atama**, oyun oynanırken doğar → gerekirse orada save-scoped |
  | `staff_roles` | **AÇILMAZ** | Tüketici var (Faz 37 *"12 rol de atanabiliyor"*) ama **tablo gerekmiyor**: `spec/01` `staff.role`u **satır içi kapalı küme** yazıyor (12 değer) ve §3.1.2 ② gereği kapalı küme **CHECK** alır. Rol *etkileri* (S164) motor katsayısı, tablo satırı değil (K3) |

  ⚠️ **`spec/01` §3.1.2 ⑧'in öngörüsü yarı yanlış çıktı.** 3.6 *"Faz 4'ün `injury_types` / `staff_roles` tabloları aynı sınıf"* demişti; ölçüm ayırdı: `injury_types` **gerçek bir sözlük tablosu** (satırları veri taşıyor), `staff_roles` **bir CHECK** (satırları yalnızca etiket). Ayraç: *"kapalı küme **etiket** mi, veri taşıyan **satır** mı?"*
- CA/PA alanları: `current_ability` (1–200), `potential_ability` (1–200), `pa_range_min/max` (belirsizlik için)
- `player_attributes` tasarımı: **tek satır, 47 sütun** (JSONB değil — sorgu ve filtre performansı için kritik, transfer arama bunun üzerinde çalışacak)
- İndeksler: transfer aramasında kullanılacak kompozit indeksler.
  ⚠️ **Kapsam `spec/01`'in indeks satırından TÜRETİLMEZ** — o satır
  (`INDEX: (primaryPosition, currentAbility), (finishing), (passing), (pace)`)
  **iki tabloyu karıştırıyor**: ilk iki sütun `players`'ta, son üçü
  `player_attributes`'ta ve bir indeks tek bir tabloya konur (4.0'da ölçüldü).
  Kapsam **kabul kriteri 3'ün sorgusundan** türetilir.
- Bölümleme (partitioning) değerlendirmesi: `player_stats_history` yıla göre
- ⚠️ **FAZ 3'TEN DEVREDİLEN ZORUNLULUK — üç ileri yabancı anahtar.** Faz 3, `people`
  tablosu burada geldiği için şu **üç sütunu hiç yazmadı**:
  `federations.presidentPersonId` · `clubs.chairmanPersonId` · `referees.personId`
  **Bu fazın migration'ı sütunu VE yabancı anahtarı BİRLİKTE eklemek zorunda.**
  Yalnızca sütunu eklemek, Faz 3'ün *"tüm yabancı anahtarlar tanımlı"* kriterini
  görünürde sağlayıp gerçekte delerdi — kararın gerekçesi Faz 3 tablo envanterinde.
  Bu tamamlanana kadar hakemlerin **adı yok** (ilk görüntülendikleri yer Faz 26).
- ⚠️ **DÖRDÜNCÜ İLERİ FK VAR ve BU FAZDA YAZILMAZ — `managers.user_id`** (SAPMA-032)
  `spec/01` §3.1 `managers`i master'a koyuyor ama `userId FK nullable` taşıyor; `users`
  **§3.2 save katmanında** ve **Faz 13**'te (açık kayıt akışı) doğuyor. Bu, yukarıdaki
  üç FK'yla **birebir aynı sınıf**: kısıtsız bir sütun *"tüm FK'lar tanımlı"* kriterini
  görünürde sağlayıp gerçekte deler. **Sütun Faz 4'te HİÇ yazılmaz**; sütun ve kısıt
  **birlikte Faz 13'te** eklenir. Gerekçe `managers.ts` başlığına konur.
- ⚠️ **KABUL KRİTERİ 3 DARALDI — `değer<15M` yüklemi çıkarıldı** (SAPMA-031)
  `marketValue` **`player_state`** tablosunda ve o `spec/01` **§3.2 save katmanı**
  (Faz 12). Üstelik türev bir değer: `spec/02` §4.7 onu kalan sözleşme ayı, form,
  sakatlık cezası ve enflasyon endeksiyle hesaplıyor — **hiçbiri master'da yok**, yani
  master'a bir `market_value` sütunu **konamaz** (konsaydı her tur bayatlardı).
  Yüklem **Faz 30** (piyasa değeri motoru) ve **Faz 32** (transfer arama) kapsamına
  taşındı. Kriterin **amacı** (bileşik indeks transfer aramasını taşıyor mu) korunuyor.
- ⚠️ **NİTELİK ARALIKLARI CHECK ALMAZ — ama İLİŞKİ değişmezleri ALIR** *(SAPMA-028)*
  Bu kriter Faz 4.0'da değiştirildi; eski hâli *"Tüm nitelikler 1–20 aralığında CHECK
  kısıtıyla korunuyor"* idi ve **iki kaynakla birden** çelişiyordu.
  - **Ayraç `spec/01` §3.1.2 ②:** *"bu değeri yarın bir denge ayarı değiştirebilir mi?"*
    Evet → CHECK yok. Bir aralık **kalibrasyondur**; migration'a çakılırsa Faz 23/30
    denge ayarı o gün bir `DROP CONSTRAINT` ister.
  - **Ölçülmüş emsal:** 3.6'da altı hakem niteliği (1-20) CHECK **almadı**, gerekçesi
    *"Faz 26'nın kalibre edeceği ölçekler"*. `competitions.reputation` (0-200) ve
    `stadiums.pitch_quality` (1-20) da almadı. Faz 4 aynı sınıfa **farklı** davranamaz.
  - **Aralık denetiminin yeri Faz 11** (`pnpm validate:world`) — ROADMAP Faz 11 zaten
    *"CA ≤ PA, nitelikler 1–20"* diyor; aynı iş iki faza iki mekanizmayla atanmıştı.
  - ⚠️ **`CA <= PA` ve `pa_range_min <= pa_range_max` CHECK ALIR ve bu kriter
    değişmedi.** Bunlar bir aralık değil bir **ilişki değişmezi**: hiçbir denge ayarı
    CA'yı PA'nın üstüne çıkarmaz — çıkarırsa tanım ihlal edilmiş olur. Ayracın iki
    kriteri **farklı taraflara** koyması, kuralın iyi bir kural olduğunun kanıtıdır.

**Kabul kriterleri:**
- [ ] 5.000 sahte oyuncu seed → şema tutarlı
- [x] **Üç ileri FK eklendi ve `ON DELETE` davranışı tanımlı** (Faz 3 devri) — **4.4**, `0006`; üçü **üç farklı** davranış aldı (SET NULL · RESTRICT · RESTRICT) ve üçünün de **davranışı** gerçek PG 18.6'ya karşı ölçüldü, yalnızca katalogdan okunmadı
- [ ] **"20–24 yaş, sağ bek, CA>120" sorgusu 5.000 oyuncu hacminde < 50 ms** *(SAPMA-031 — `değer<15M` yüklemi çıkarıldı)*
- [x] **Nitelik aralıkları (1–20) CHECK kısıtı ALMAZ — denetim Faz 11 `validate:world`'ün işi** *(SAPMA-028)* — **4.5**, `0007`; 57 nitelik sütununun (47 görünür + 10 gizli) hiçbiri CHECK almadı ve bu **negatif bir iddiayla** sabitlendi (`pg_constraint` katalogdan okunuyor, boş liste bekleniyor): *"kısıt eklemeyi unuttuk"* ile *"kısıt bilerek konmadı"* aynı şemayı üretir, ayıran tek şey koşan bir iddiadır. Kalibrasyon tarafının kısıtsızlığı `players`ta da ayrıca ölçüldü (CA=250 kabul ediliyor)
- [x] **İLİŞKİ değişmezleri CHECK ile korunuyor: `CA <= PA` ve `pa_range_min <= pa_range_max`** — **4.5**, `0007`; `ALTER TABLE … ADD CONSTRAINT` ile (tablo 4.3'te yaratılmıştı). **İKİ AYRI kısıt**, birleşik değil — hangi değişmezin ihlal edildiği hata mesajından okunsun. Reddi **negatif testle** kanıtlandı (CA>PA ve min>max ayrı ayrı reddediliyor) ve **sınır dahil** olduğu karşı örnekle gösterildi (CA=PA, min=max kabul ediliyor: `<` yazılsaydı ikisi de reddedilir ve hata ancak Faz 9 ingest'inde görülürdü). D5'te derlenmiş `dist` + düz `node` ile ayrı bir gerçek PG 18.6'ya karşı da koşuldu
- [ ] Şema dokümanı güncellendi

**Alt görevler** *(4.0/4.0b'de ölçüldü, kullanıcı onayıyla 2026-08-29'da işlendi — K11)*

- [x] **4.0** Faz açılışı — doğrulama · üç süreç boşluğu · iki pahalı ölçüm.
      `SPEC-COVERAGE-GAPS`'in **okuyucusu yoktu** (7 satır atandığı fazda görünmüyordu) ·
      **SAPMA-028** (nitelik CHECK'i) · **SAPMA-029** (`source` kümesi 4→5).
      Ölçümler: tablo envanteri (19 = 11 master + 3 save + 7 yok) ve FK kuralı kuru
      çalıştırması (bugünkü kural Faz 4'te **7 veri kaybettiren cevap** üretiyor).
      → `docs/reports/faz-04/4.0-*.md`
- [x] **4.0b** CI işlendi (`33228266356`, 6/6 yeşil) · `OUTPUT-FORMAT`'a kural:
      **onay bekleyen içerik raporun `DETAY` bölümünde yaşar** · kayıp plan yeniden
      üretildi (tüketici araması + altı karar). → `docs/reports/faz-04/4.0b-*.md`
- [x] **4.1** **Kararlar ve envanter mutabakatı — KOD YOK.** Kapsam 19 → **11 master**;
      beş tablo **Faz 12**'ye, biri **Faz 13**'e, `değer<15M` yüklemi **Faz 30/32**'ye
      *yazılır* (kütüğe kayıt yetmez) · `spec/01`'e eksik tanımlar ·
      üç SAPMA · G-15/G-16 · `SESSION-TEMPLATE`'e **§0.5 süre kontrolü**
- [x] **4.2** **`fk-policy.ts` V3'e genişletilir** — üçüncü olgu `is_nullable`,
      `SET NULL` üretimi, sıra `dictionary → independent → nullable → satellite`.
      Migration yok. Faz 3'ün **12 gerçek FK'sı regresyon kümesi**; V1'in bozduğu üç
      vaka **negatif test**. → kriter 2
- [x] **4.3** **`people` + `players`** (`0005`) — §3.1.0 sütunları `people`'a,
      `person_id` UNIQUE. ⚠️ **`ON DELETE SET NULL` DAVRANIŞ testi** gerçek PG18'e
      karşı: kulüp sil → oyuncu **duruyor**, `club_id` **NULL**; karşı örnek kişi sil →
      oyuncu **gidiyor**. → kriter 1, 6
      **SONUÇ:** envanter **11 → 13 tablo**, FK **12 → 16**; dört FK'nın dördü de
      kuraldan **tahmin edildiği gibi** çıktı (RESTRICT · RESTRICT · CASCADE ·
      **SET NULL**) — hiçbir liste güncellenmeden. `SET NULL` dalının **ilk canlı
      vakası** (`players.club_id`) ve davranışı gerçek PG18.6'ya karşı iki yönlü
      ölçüldü. 🆕 **`person_type` şemanın ilk DİZİ sütunu** ve bir körlük açığa
      çıkardı: `introspect.ts` yalnızca `data_type` okuyordu, `text[]` ile
      `integer[]` ikisi de `ARRAY` — `udt_name` eklendi ve negatif testle
      kanıtlandı. `comparedFacts` **1.627 → 2.204** (ölçüldü, tahmin edilmedi).
      → `docs/reports/faz-04/4.3-people-players.md`
- [x] **4.4** **Üç ileri FK** (`0006`) — sütun **ve** kısıt aynı migration'da.
      `managers.user_id` **YAZILMAZ** (Faz 13). → **kriter 2 ✅ KAPANDI**
      **SONUÇ:** FK **16 → 19**, tablo **13'te sabit**. ⚠️ **Üçü RESTRICT DEĞİL —
      4.3'ün tahmini yanlıştı ve sebebi yöntemseldi:** tahmin *hedefin* sınıfına
      (`people` = `independent`) bakıyordu, oysa kural ① dışında **kaynağın**
      sınıfına bakıyor. Kural koşturuldu, sonra ölçüldü, üçü de tuttu:
      `federations.president_person_id` **SET NULL** (uydu + nullable → ③) ·
      `clubs.chairman_person_id` **RESTRICT** (independent → ②, nullable olmasına
      rağmen) · `referees.person_id` **RESTRICT** (independent, üçün tek `NOT NULL`u).
      `federations` artık **bir CASCADE + bir SET NULL** taşıyor — kuralın
      sahipliği referanstan **aynı tablo içinde** ayırdığının ilk canlı kanıtı.
      🆕 **Fazın ilk `ALTER TABLE`'ı** ve §3.1.2 ④/⑤ ilk kez birlikte devrede:
      `attnum` deliği artık **her kısmi geri almada** görünüyor, o yüzden dört
      var olan çevrim testi `identical: true`dan **farkların tam listesine**
      geçti — mutasyon payı **20 → 25** (%11,2 → **%13,2**), ilk kez pay ve oran
      birlikte arttı. ⚠️ `referees.person_id` `NOT NULL` olduğu için `0006` **dolu
      bir `referees` tablosunda yeniden uygulanamıyor** (0001'in `countries.source`
      vakasının aynısı); gürültülü, kendi testi var. `comparedFacts`
      **2.204 → 2.243** (ölçüldü). 🆕 **G-17** (markalı kimlik tipleri → Faz 12,
      kullanıcı kararı) ve **G-18** (hakemin `person_type`ı → Faz 8) açıldı ve
      **ikisi de hedef fazın kapsamına yazıldı**.
      → `docs/reports/faz-04/4.4-uc-ileri-fk.md`
- [x] **4.5** **`player_attributes` (47) + `player_hidden_attributes` (10)** (`0007`) —
      nitelik CHECK'i **YOK** (SAPMA-028); `players`'a `CA <= PA` ve
      `pa_range_min <= pa_range_max` CHECK'leri. 47+10 envanteri `spec/02` §4.1'den
      **sayılarak** doğrulanır (SAPMA-001 bu sınıftı). → **kriter 4 ve 5 ✅ KAPANDI**
      **SONUÇ:** envanter **13 → 15 tablo**, FK **19 → 21**. 47 ve 10 `spec/02`
      §4.1'den **sayıldı** (14+14+8+11, benzersizlik ayrıca ölçüldü) ve envanter
      bir **sayı** değil bir **liste** olarak yaşıyor (`VISIBLE_ATTRIBUTES` /
      `HIDDEN_ATTRIBUTES`) — üç katmanlı iddia: sabit → TS alanı → katalog sütunu.
      **1:1 ayracı KOŞTURULDU, kopyalanmadı:** *"tabloya gelen FK sayısı"* iki
      tablo için de **0** (`spec/01`'de `attributesId`/`attribute_id` → 0 eşleşme)
      → 3.5 deseni (`player_id` **PK = FK**), `players`ınki izlenmedi. FK kuralı
      da koşturuldu → **CASCADE · CASCADE**, üretilen SQL'le 2/2.
      ⚠️ **ALT GÖREV İKİ MIGRATION YAZDI ve bu bir İDDİA AYRIMI kararı:**
      `0007` iki tablo + `players`ın iki ilişki değişmezi · **`0008` G-18'i
      kapatıyor** — `PERSON_TYPES` 4 → 5 (`'referee'`). Birleştirilselerdi birinin
      fazla giden bir `down`u diğerinin arkasında saklanabilirdi (§3.1.2 ⑤).
      🆕 **G-18'in ATAMASI YANLIŞTI ve dayanağı D7'ydi:** Faz 8'in bloğu
      gerekçesini *"3.8'in kendi notu"*na dayandırıyordu; Faz 8'in **gerçek**
      ingest listesi ölçüldü ve hakem **yok** (Faz 9 da yalnızca oyuncu). Blok ve
      kabul kriteri Faz 8'den **kaldırıldı**, boşluk burada kapatıldı — `people`
      bu fazın kendi tablosu ve kapalı küme bu fazda eksik ölçüldü. Bir yalan
      zaten repodaydı: `fixtures.ts` hakem kişilerine `['player']` yazıyordu.
      🆕 **G-19 açıldı** — *"hiçbir faz hakem verisini ingest etmiyor"*; ROADMAP'in
      tüm hakem atıfları fazlarına göre çıkarıldı (23/26/29/45 **tüketici**, 46
      var olan kadroyu **bakım**, 8 ve 9'un listelerinde **yok**). Sahibi
      **tahminle atanmadı**: karar noktası **Faz 7**'ye yazıldı.
      🆕 **ZİNCİR ÇAPINDA BİR SINIR ÖLÇÜLDÜ:** `0008`in `down`u kısıtı daraltıyor
      ve `ADD CONSTRAINT … CHECK` var olan satırları **doğruluyor** — dolu bir
      `people` tablosunda geri alma **gürültülü patlıyor**, ve `down` LIFO
      çalıştığı için zincirin **hiçbir** geri alması başlayamıyor. 0006'nın
      sınırından yapısal olarak farklı (orada patlayan `up`tı). Alternatifler
      (`NOT VALID`, `down`un satır silmesi) tek tek elendi; gerekçe
      `drizzle/down/0008_person_type_referee.sql` başlığında.
      🆕 **§3.1.2 ① ÜÇÜNCÜ BİÇİMİ ÖLÇTÜ** (CHECK **değişikliği** = `DROP`+`ADD`)
      ve **⑤'in ayracı ayrıştı: `ALTER` değil SÜTUN.** `0008` bir `ALTER` ama
      kayma üretmiyor → çevriminde `identical: true` **beklenir** ve ölçüldü.
      **Mutasyon 25 → 26** (%13,2 → %12,0; payda 190 → 216). ⚠️ İlk ölçüm **25**
      verdi (alarm): iki yeni çevrim testi `differences: []` iddia ediyor ve
      mutasyon **tam olarak onu üretiyor** — *boş bir envanter körlükten
      çıkarmaz*. Alarm bir **negatif** testle kapatıldı (`④ SESSİZ bozuk down
      (KISIT TANIMI)`), 4.3'ün `udtName` deseni. `comparedFacts` **2.243 →
      3.023** (ölçüldü). **Kapsam eğilimi ilk kez TERSİNE DÖNDÜ:** fonksiyon
      %77,56 → **%77,68**, marj **7,68 puan**.
      → `docs/reports/faz-04/4.5-nitelik-tablolari.md`
- [x] **4.6** **`player_positions` + `player_traits` + `player_stats_history`**
      (~~`0008`~~ → **`0009`**, SAPMA-034) — `player_stats_history` **`club_id` aldı**.
      → kriter 1, 6
      **SONUÇ:** envanter **15 → 18 tablo**, FK **21 → 26**. FK kuralı KOŞTURULDU →
      **5/5** (CASCADE ×4 + SET NULL), üretilen SQL'le karşılaştırıldı.
      🆕 **§3.1.2 ②'nin ayracı AYNI ALT GÖREVDE İKİ FARKLI CEVAP üretti:**
      `player_positions.position` (12 kod, `players.ts`ten ithal) ve `level`
      (5 derece) **CHECK aldı**; `player_traits.trait_code` **almadı** — küme
      `spec/02`'de tanımlı değil (0 eşleşme) ve ROADMAP *"~30"* diyor, yani
      sayılamıyor. `competition_id`in **CASCADE** alması sezgiye aykırı ve
      kuralın ②'sinin *"kaynağın sınıfı"* okumasının canlı kanıtı.
      `comparedFacts` **3.023 → 3.570** (ölçüldü). 🆕 **Kod işinden ÖNCE
      `bash-text-guard` kancası yazıldı** (kendi commit'i) — ORTAM TUZAKLARI ⑤'in
      ateşlendiği anda görünür hâli, SAPMA-033'ün sınıfı.
      → `docs/reports/faz-04/4.6-mevki-yetenek-istatistik.md`
- [x] **4.7** **`staff` + `staff_attributes` + `managers` + `manager_attributes`**
      (**`0010`**) — `staff.role` **CHECK** (12 değer). → kriter 1, 6
      **SONUÇ:** envanter **18 → 22 tablo**, FK **26 → 32**. **Faz 4'ün on bir master
      tablosu KAPANDI** (11 Faz 3 + 11 Faz 4). FK kuralı KOŞTURULDU → **6/6**
      (CASCADE ×4 + SET NULL ×2), üretilen SQL'in `ON DELETE` satırlarıyla
      karşılaştırıldı. 🆕 **Karar bir KARŞI-ÖLÇÜMLE desteklendi:** `staff`/`managers`
      §3.1.0 sütunlarını taşısaydı altı FK'nın **dördü** RESTRICT'e dönerdi.
      🆕 **§3.1.2 ②'nin ayracı bu alt görevde BEŞ kez koştu, iki cevap verdi:**
      `role` (12) · `coaching_badge` (5) · `experience_level` (5) **CHECK aldı**;
      `philosophy` **almadı** (küme `...` ile açık uçlu) ve `reputation` (0-200)
      almadı (kalibrasyon). Envanterler **`spec/01`'den SAYILDI** — `spec/02`'de
      `staff`/`manager` **0 eşleşme** (ölçüldü). `comparedFacts` **3.570 → 4.205**
      (testin reddettiği çıktıdan okundu). 🆕 **Kod işinden ÖNCE `0008`in sınırı
      bir sarmalayıcıya taşındı** (`migrateDownPastRefereeCheck`, kendi commit'i):
      22 gerçek zincir çağrısı sarmalayıcıya geçti, 17 elle daraltma satırı silindi,
      sınırın kendi testi **ham** `migrateDown` ile duruyor.
      → `docs/reports/faz-04/4.7-personel-menajerler.md`
      ⚠️ **§0.5 KONTROL NOKTASI ATEŞLENDİ — ölçüm ve sonucu aşağıdaki blokta.**

> ### ⚠️ §0.5 KONTROL NOKTASI SONUCU — FAZ 4a / 4b AYRIMI (4.7'de ölçüldü)
>
> Kontrol noktası **iki kez** ölçtü ve ikinci ölçüm eşiği aştı:
>
> | Ölçüm anı | Geçen süre | Eşik (2 gün) |
> |---|---|---|
> | 4.7'nin **başı** (2026-08-31 03:34 +03) | **1,941 gün** | aşılmadı |
> | 4.7'nin **kapanışı** (2026-08-31 20:11 +03) | **2,633 gün** | ✅ **AŞILDI** |
>
> Kaynak `git show -s` ile ölçüldü: Faz 4'ün ilk commit'i **`0682c5f`**
> (2026-08-29 05:00:19 +0300). §0.5'in asıl sınırı **3 gün** ve ona hâlâ mesafe
> var, ama kontrol noktasının eşiği **2** ve o aşıldı.
>
> **KARAR — kural uygulandı, çizgi zaten hazırdı:**
>
> - **Faz 4a** = 4.0 → **4.7** (şema) — ✅ **TAMAMLANDI.** On bir master tablo,
>   altı migration (`0005`…`0010`), envanter kapandı.
> - **Faz 4b** = **4.8 → 4.11** (indeks, seed, kriter 3 ölçümü, kapanış).
>
> ⚠️ **Bu bir kapsam değişikliği DEĞİL:** alt görevlerin içeriği, sırası ve
> kabul kriterleri **aynı**. Değişen tek şey fazın iki kayda bölünmesi.
> Faz 4'ün **tek PR'ı** ve **tek faz kaydı** 4.11'de yazılır — bölünme
> `PROJECT_MEMORY` faz kaydının §1'inde *"4a/4b"* olarak görünür.
>
> ⚠️ **VE BU SAPMA-033'ÜN ÇARESİNİN İLK CANLI SONUCU.** Faz 3'te §0.5 ateşledi
> (4 gün, sınır 3) ve **hiçbir şey olmadı** — çünkü süreyi ölçen bir adım yoktu.
> Adım 4.1'de eklendi, 4.7'de koştu, ve bu kez **bir kaydı değiştirdi**.
> *"Bir kuralın kontrol eden adımı yoksa, ateşlendiğinde hiçbir şey olmaz."*
- [ ] **4.8** **Transfer arama indeksleri** (**`0011`**) — kapsam `spec/01`'in indeks
      satırından **değil** kriter 3'ün sorgusundan türetilir (o satır iki tabloyu
      karıştırıyor, 4.0'da ölçüldü). → kriter 3 hazırlığı
- [ ] **4.9** **5.000 sahte oyuncu seed'i** + determinizm ölçümü (iki koşu birebir
      aynı; `created_at`/`updated_at` **gürültülü** dışlanır).
      ⚠️ `clubs` boş olduğu için **5.000'in 5.000'i serbest oyuncu** — bilinçli, ve
      4.10'a not bırakılır. → kriter 1
- [ ] **4.10** **Kriter 3'ün ölçümü** — `ANALYZE` şart (`reltuples != -1` denetlenir) ·
      **A** = 5.000 (kriteri kapatır) / **B** = sentetik hacim (indeksin gerekçesi) ·
      **seçici + seçici olmayan** iki terim · mimari etiketi (amd64, üretim ARM64).
      → kriter 3
- [ ] **4.11** ER diyagramı + `docs/schema/world.md` + faz kaydı + PR. → kriter 6
      ⚠️ **`SPEC-COVERAGE-GAPS` ↔ ROADMAP TUTARLILIK KONTROLÜ BURADA KOŞULUR**
      *(karar 4.3'te verildi ve buraya yazıldı — kütüğe kayıt yetmez, hedef fazın
      kapsamında görünmeli; 4.0'ın ① bulgusu tam olarak buydu).*
      **Ne yapılacak:** `docs/SPEC-COVERAGE-GAPS.md`'deki **her** G-satırı için,
      atandığı fazın ROADMAP kapsamında **adıyla** geçtiği `grep` ile doğrulanır
      (bugün G-01…G-16). Eşleşmeyen satır **o alt görevde** hedef fazın kapsamına
      yazılır. **Kontrol koşan bir adımdır, bir temenni değil** (SAPMA-033: bir
      kuralın kontrol eden adımı yoksa, ateşlendiğinde hiçbir şey olmaz).
      ⚠️ Tarama, kapatılmış satırları da (G-03, G-08) **listeler ama atlar** —
      kapanmış bir satırın hedef fazda görünmesi gerekmez.

**Her migration üç şey daha getirir:** `drizzle/down/<tag>.sql` (yoksa koşucu
veritabanına **dokunmadan durur**) · round-trip testine bir `it()` · ER diyagramı
bayatlar (`er-diagram.itest.ts` kırılır — blok **elle düzenlenmez**, hata mesajındaki
üretilmiş metin kopyalanır, `EXPECTED_TABLE_COUNT`/`EXPECTED_FOREIGN_KEY_COUNT`
güncellenir). **`comparedFacts` alt sınırı (bugün 1.627) TAHMİN EDİLMEZ** — erişilemez
bir değer yazılır, gerçek çıktıdan okunur.

**Bağımlılık:** Faz 3
**Risk:** 47 sütunlu tablo genişliği → `player_attributes` ayrı tabloda, `players` ile 1:1.
⚠️ **Bölünme riski VAR ve bu faz §0.5'in "bölünme riski yüksek" listesinde DEĞİL** —
Faz 3 de değildi ve **4 gün sürdü** (§0.5 sınırı 3). 4.7'nin kontrol noktası bu yüzden
var: bölünme tahminle değil **ölçümle** kararlaştırılır. Çizgi hazır:
**4a** = 4.1–4.7 (şema) · **4b** = 4.8–4.11 (indeks, seed, ölçüm, kapanış).

> ✅ **VE ÖLÇÜM KOŞTU: BÖLÜNME UYGULANDI (4.7).** Kontrol noktası 4.7'nin
> kapanışında **2,633 gün** ölçtü (başında 1,941 idi) → eşik aşıldı → **4a
> kapandı, 4b açıldı**. Ayrıntı ve iki ölçüm 4.7'nin altındaki blokta.
> **Tahmin listesi bu fazı işaretlememişti; onu yakalayan şey ölçüm oldu.**

---

## FAZ 5 — i18n Altyapısı ve Terim Sözlüğü

**Hedef:** Tek bir metin bile sabit kodlanmadan, TR tam destekli çeviri katmanı. (İngilizce v2'de gelecek ama altyapı **şimdi** kuruluyor — sonradan kurmak 3 faz kayıp demek.)

**Kapsam:**
- i18next + react-i18next + tarayıcı dil algılama
- Namespace yapısı: `common`, `squad`, `tactics`, `transfer`, `match`, `finance`, `dialogue`, `news`, `tutorial`, `errors`
- Türkçe çoğullama, sayı/tarih/para formatı (`Intl` API)
- **Türkçe ek motoru:** dinamik cümlelerde doğru ek seçimi (`{{club}}'{{suffix}}` → "Galatasaray'ın", "Fenerbahçe'nin") — ünlü uyumu + son harf analizi
- ESLint kuralı: JSX içinde çıplak Türkçe metin **yasak** (otomatik yakalar)
- `tools/i18n-check.ts`: eksik anahtar, kullanılmayan anahtar, boş çeviri raporu → CI'da çalışır
- **Terim Sözlüğü** (`docs/glossary.md`): TR/EN karşılıklar + kod içi isimlendirme standardı (kod İngilizce, arayüz Türkçe)

**Ana dosyalar:**
```
packages/shared/src/i18n/index.ts
packages/shared/src/i18n/turkish-suffix.ts
apps/web/src/locales/tr/*.json
tools/i18n-check.ts
docs/glossary.md
```

**Kabul kriterleri:**
- [ ] Sabit kodlanmış metin eklenince ESLint hata veriyor
- [ ] `i18n-check` eksik anahtarları buluyor, CI'da kırıyor
- [ ] Türkçe ek motoru 50 test vakasının tamamını geçiyor (Galatasaray'ın, Beşiktaş'ın, Trabzonspor'un, Roma'nın, Liverpool'un…)
- [ ] Tarih "23 Ağustos 2026", para "€1,2 mn" formatında
- [ ] Sözlükte en az 120 terim tanımlı

**Bağımlılık:** Faz 1

---

## FAZ 6 — Tasarım Sistemi ve Bileşen Kütüphanesi

**Hedef:** FM26 estetiğinde, koyu tema öncelikli, yoğun-bilgi taşıyan, mobilde çalışan görsel dil.

**Kapsam:**
- **Tasarım token'ları:** renk paleti (koyu/açık), tipografi ölçeği, boşluk skalası (4px tabanlı), köşe yarıçapı, gölge, z-index katmanları, animasyon süreleri
- Fontlar: Inter (arayüz) + JetBrains Mono (sayısal tablo) — Türkçe karakter alt kümesi optimize
- **Tema:** Koyu (varsayılan) + Açık + Sistem + **kulüp rengine göre dinamik vurgu**
- shadcn/ui bileşenlerinin FM temasına uyarlanması
- **Temel bileşenler:** Button (6 varyant), Input, Select, Combobox, Checkbox, RadioGroup, Slider, Switch, Tabs, Dialog, Sheet, Popover, Tooltip, Toast, Badge, Avatar, Progress, Skeleton
- **Alan-özel bileşenler:** `AttributeBadge` (1–20 renk skalası), `StarRating`, `FormIndicator` (G/B/M), `MoraleIcon`, `ClubCrest`, `PlayerPortrait`, `KitSwatch`, `PositionMap`, `CurrencyValue`, `DateChip`
- **DataTable motoru:** TanStack Table + sanallaştırma (TanStack Virtual), sütun seçimi, sıralama, filtre, kaydedilebilir görünüm, mobilde kart moduna dönüşüm
- Erişilebilirlik: renk körlüğü modu (3 tip), font boyutu ayarı (%90–130), tam klavye navigasyonu, WCAG AA kontrast
- **Storybook** kurulumu — her bileşen için hikaye
- **`pnpm perf:budget` — performans bütçesi ölçüm kapısı** *(G-01, `docs/SPEC-COVERAGE-GAPS.md`)*
  `docs/spec/09` §11.5 bu komutu "Faz 6'dan sonra" her faz kapanışında koşulacak diye
  listeliyor ve §0.4 "ihlal = faz kapanmaz" diyor, ama hiçbir faz onu **kurmuyordu** —
  `arch:check` ile birebir aynı boşluk (Faz 1 Ç3). Burada ilk ölçülebilir ekran doğduğu
  için kurulumu buraya düşüyor. Faz 6'da ölçülebilen alt küme: DataTable render, ekran
  geçişi, üretim paketi boyutu. Kalan metrikler ilgili fazlarda eklenir; Faz 49 genişletir.

**Kabul kriterleri:**
- [ ] Storybook'ta 30+ bileşen, her biri koyu/açık temada çalışıyor
- [ ] `pnpm perf:budget` çalışıyor ve **bütçe aşımında kırıyor** (negatif testle kanıtlanır) *(G-01)*
- [ ] DataTable 10.000 satırda 55+ fps kaydırma
- [ ] DataTable 375px genişlikte kart moduna geçiyor
- [ ] Renk körlüğü modunda nitelik renkleri ayırt edilebiliyor
- [ ] Tüm etkileşimli bileşenler sadece klavyeyle kullanılabiliyor
- [ ] Kontrast denetimi (axe) → 0 ihlal

**Bağımlılık:** Faz 1, 5
**Risk:** Bu faz 3 günü aşabilir → gerekirse 6a (token + temel bileşen) / 6b (alan bileşenleri + DataTable) olarak bölünür.

---
---

# BLOK B — VERİ KATMANI
### Faz 7 – 11 | Hedef: Gerçek dünya verisini oyuna dönüştürmek

---

## FAZ 7 — DataProvider Soyutlaması

**Hedef:** Oyunun hiçbir yerinin veri kaynağını bilmemesi. Kaynak değişse oyun etkilenmesin.

**Kapsam:**
- `IDataProvider` arayüzü: `fetchCountries()`, `fetchCompetitions()`, `fetchClubs()`, `fetchSquad()`, `fetchPlayerStats()`, `fetchAsset(type, id)`
- **Sağlayıcı uygulamaları:**
  - `WikidataProvider` — CC0 olgusal veri (doğum tarihi, boy, uyruk, mevki) + Commons görselleri
  - `OpenFootballProvider` — CC0 lig/kulüp/fikstür yapısı
  - `FootballDataOrgProvider` — resmi API, fikstür/sonuç/kadro
  - `ApiFootballProvider` — resmi API (abonelik), kadro + logo + fotoğraf
  - `StatsProvider` — FBref/Understat/StatsBomb açık veri, nitelik türetimi için
  - **`LocalPackProvider` — `/data/packs/<ACTIVE_PACK>/` klasöründen okur. `DATA_MODE=full` modunda ZİNCİRİN BAŞINDA yer alır** (gerçek armalar, portreler, isimler, formalar, stadyumlar). Tam format: `docs/spec/12-data-packs.md`
  - `ProceduralProvider` — hiçbir kaynak bulunamazsa üretir (asla boş ekran olmaz)
- **Zincir mantığı:** `ProviderChain` — sırayla dener, ilk başarılıyı alır, `source` alanına kaynağı yazar
- **Zincir sırası `DATA_MODE`'a göre değişir:**
  - `full` (varsayılan): LocalPack → ApiFootball → Wikidata → OpenFootball → Procedural
  - `clean`: Procedural → OpenFootball
- **Anahtar eşleme:** paketteki varlığın oyundaki hangi varlık olduğunu bulma (slug / explicit / hybrid + bulanık eşleme). Yanlış eşleşme kabul edilemez — bkz. spec 12, Bölüm 17.3
- Yerel dosya önbelleği (`.cache/`) + TTL + hash doğrulama
- Hız sınırlama + üstel geri çekilme (exponential backoff) + devre kesici (circuit breaker)
- **Görsel işleme hattı:** indir → doğrula → yeniden boyutlandır (arma 256/128/64, portre 256/128/64, bayrak 64/32) → WebP + AVIF → `/data/assets/`
- `tools/data-cli` komutları: `fetch`, `verify`, `stats`, `clear-cache`
- **`asset_index` tablosu — varlık hattının çıktı kaydı** *(G-09, `docs/SPEC-COVERAGE-GAPS.md`)*
  `docs/spec/12` §17.5 adım 7 *"İndeksle → `asset_index` tablosuna kaydet (id, tip, kaynak,
  hash)"* diyor; tablo `docs/spec/01`'de **yok** ve ROADMAP'in hiçbir fazında geçmiyordu.
  §17.9'un *"eksik varlık oranı raporlanıyor"* kriterinin sayılacağı yer burası. Faz 3
  bunu bilerek açmadı — hiçbir şeyin yazmadığı bir tablo, tüketicisi olmayan bir sütunla
  aynı sınıf (D3). Yazan taraf **bu fazda** doğuyor, tablo burada açılır ve tanımı
  `docs/spec/01`'e yazılır. Faz 3'ün bağlı kararı: `crestAssetId` · `portraitAssetId` ·
  `logoAssetId` · `flagAssetId` · `club_kits.assetId` bugün düz `text`; bu tabloya **FK
  verilip verilmeyeceği burada** kararlaştırılır.
- **`source` kapalı kümesinin yeniden değerlendirilmesi — bootstrap seed verisi**
  *(G-14, `docs/SPEC-COVERAGE-GAPS.md`)*
  `DATA_SOURCES` beş değerin hepsi bir **sağlayıcıyı** adlandırıyor, ama Faz 3.8'in 17
  seed satırı hiçbir sağlayıcıdan gelmiyor — repoda elle yazıldılar. 3.8 `procedural`
  seçti (dürüst tek seçenek: *"bu satır için hâlâ gerçek veri gerekiyor mu?"* → **evet**);
  altıncı bir değer (`seed`) CHECK kısıtını değiştirmek, yani yeni bir migration
  demekti ve 3.8'in kapsamı dışındaydı (K12). Bu faz sağlayıcı zincirini kurduğu için
  kümenin sahibi burasıdır: ya `seed` eklenir ya `procedural` kalıcılaşır. Seed
  `DO UPDATE` yaptığı için değişiklik tek koşuda uygulanır.
- **⚠️ HAKEM VERİSİNİ HİÇBİR FAZ INGEST ETMİYOR — SAHİBİ BURADA BELİRLENİR**
  *(G-19, Faz 4.5'te açıldı)*
  `referees` 3.6'dan beri `key` / `source` / `external_ids` taşıyor, yani §3.1.0'a
  göre bir **paket varlığı** — ama onu dolduran hat yok. ROADMAP'in tüm hakem
  atıfları fazlarına göre çıkarıldı (4.5'te ölçüldü): **Faz 23** hakem toleransını,
  **Faz 26** hakem niteliklerini ve atamasını, **Faz 29** maç öncesi brifingi,
  **Faz 45** basın sorusunu **tüketiyor**; **Faz 46** *"yeni sezon hakem kadrosu,
  emekli olan hakemler"* diyerek var olan bir kadroyu **bakım** yapıyor —
  yani onun **var olduğunu varsayıyor**. **Faz 8 ve Faz 9'un ingest listelerinde
  hakem yok** (ikisi de tek tek okundu). SAPMA-008'in birebir sınıfı.
  ⚠️ **SAHİP TAHMİNLE ATANMADI** (`competition_seasons` yöntemi, 3.1; ve K13):
  Faz 8 makul bir adaydı ama 4.4 tam olarak oraya **bir nottan miras alarak**
  atamıştı ve ölçüm onu yanlış çıkardı (D7). Bu faz sağlayıcı zincirini kurduğu
  ve *"hangi kaynaktan ne çekilecek"* sorusunun **ilk kez cevaplanabildiği** yer
  olduğu için **karar noktası burasıdır** — G-09 ve G-14 ile aynı desen.
  **Burada karara bağlanacak:** ① hakem verisi için bir kaynak var mı
  (`spec/12` §17.2'de `referees.json` **yok**, ölçüldü — yani bugünkü cevap
  *"prosedürel"*) ② varsa ingest'i hangi faz üstlenir (8 veya 9) ③ yoksa
  `ProceduralProvider`ın hakem üretimi hangi faza yazılır. **Karar bir fazın
  kapsamına yazılmadan G-19 kapanmaz** — kütüğe kayıt yetmez.

**Kabul kriterleri:**
- [ ] **G-19 karara bağlanmış: hakem verisinin kaynağı ve ingest sahibi bir fazın kapsamında adıyla yazılı** *(G-19)*
- [ ] Sağlayıcı sırası config'den değişiyor, kod değişmiyor
- [ ] Bir sağlayıcı hata verince zincir bir sonrakine geçiyor, oyun çalışmaya devam ediyor
- [ ] `DATA_MODE=full` + paket varken zincir LocalPack'i birinci sırada kullanıyor
- [ ] Tüm sağlayıcılar kapalıyken `ProceduralProvider` devreye giriyor ve tam bir dünya üretiyor
- [ ] Her varlığın `source` alanı doğru dolduruluyor (`pack` | `api` | `wikidata` | `openfootball` | `procedural`)
- [ ] `data-cli verify` eksik varlıkları raporluyor
- [ ] Görsel hattı 1.000 varlığı işleyip WebP+AVIF üretiyor

**Bağımlılık:** Faz 2, 3
**Not:** Bu tasarım ayrıca API'lerin değişmesine, düşmesine ve kotalara karşı dayanıklıdır.

---

## FAZ 8 — Kurum Verisi İngesti (Ülke, Lig, Kulüp, Stadyum, Kupa)

**Hedef:** 6 ülke, 6 lig, ~118 kulüp, tüm kupalar ve UEFA turnuvaları — görselleriyle birlikte veritabanında.

**Kapsam:**
- 6 ülke: İngiltere, İspanya, Almanya, İtalya, Fransa, Türkiye — bayrak, futbol seviyesi katsayısı, federasyon
- Ligler: Premier League, LaLiga, Bundesliga, Serie A, Ligue 1, Süper Lig — format, takım sayısı, küme düşme kuralı, play-off (TR)
- Kupalar: FA Cup, EFL Cup, Copa del Rey, DFB-Pokal, Coppa Italia, Coupe de France, Türkiye Kupası + 6 Süper Kupa
- UEFA: Şampiyonlar Ligi, Avrupa Ligi, Konferans Ligi, UEFA Süper Kupa — format, eleme turları, katsayı sistemi
- Kulüp verisi: isim, kısa isim, kuruluş yılı, şehir, stadyum, kapasite, 3 renk, prestij (0–200), tesis düzeyleri (1–20), taraftar kitlesi, başkan, bütçe
- **Görseller:** kulüp arması, lig logosu, ülke bayrağı, kupa görseli, stadyum (varsa)
- Rekabet ilişkileri (derbi tablosu): Galatasaray–Fenerbahçe, El Clásico, Der Klassiker, Derby della Madonnina, North West Derby vb. — yoğunluk katsayısıyla
- **Ülke kural setleri (JSONB):**
  - İngiltere: GBE puan sistemi, homegrown kuralı (25 kişilik kadroda 8 HG), U21 muafiyeti
  - Türkiye: yabancı kotası, kadro listesi kuralı
  - İtalya: kadro listesi, yerli oyuncu kuralı
  - İspanya: maaş tavanı (LaLiga limiti), AB dışı kotası
  - Almanya/Fransa: kadro ve altyapı kuralları
- Transfer pencereleri: ülkeye göre gerçek tarihler
- **Gerçek varlıklar birincil (`DATA_MODE=full`):** kulüp armaları, lig logoları, kupa görselleri, ülke bayrakları veri paketinden yüklenir — bkz. `docs/spec/12-data-packs.md`
- **Prosedürel yedek:** arma bulunamazsa 3 renkten SVG arma üret (12 kalkan şekli × 8 desen × 6 sembol)
- ℹ️ **G-18 BLOĞU 4.5'TE BURADAN KALDIRILDI — atama yanlıştı ve dayanağı D7'ydi.**
  4.4 hakemin `person_type`ı boşluğunu bu faza atamış ve gerekçesini *"hakem verisi
  bu fazda geliyor (**3.8'in kendi notu**)"* diye yazmıştı. O not `PROJECT_MEMORY` /
  ROADMAP'in **kendi sesi** — D7'nin *"kaynak değildir"* dediği şey. Bu fazın
  **gerçek** kapsam listesi ölçüldü (yukarıdaki maddeler): ülke · lig · kupa ·
  UEFA · kulüp verisi · görseller · rekabet ilişkileri · ülke kural setleri ·
  transfer pencereleri. **Hakem yok** — ve buraya yazılan kabul kriteri
  (*"hakemlerin `people` satırları yazılıyor"*) burada **karşılanamazdı**.
  Boşluk **Faz 4.5'te kapatıldı** (`0008`, `PERSON_TYPES` 4 → 5): `people` Faz 4'ün
  kendi tablosu ve kapalı küme orada eksik ölçülmüştü. ⚠️ **Ayrı bir boşluk açık
  kaldı — G-19:** hiçbir faz hakem verisini **ingest etmiyor**; karar noktası
  **Faz 7**'ye yazıldı (aşağıdaki bağımlılık fazı).

**Kabul kriterleri:**
- [ ] 6 lig, 118+ kulüp, 20+ turnuva veritabanında
- [ ] Her kulübün arması ve 3 rengi mevcut (eksikse prosedürel üretilmiş)
- [ ] `data-cli stats` → eksik varlık oranı < %5
- [ ] Her ligin kural seti JSON şemasına uygun ve doğrulanmış
- [ ] Derbi tablosu en az 30 rekabet içeriyor
- [ ] Kulüp arama (pg_trgm) Türkçe karakterle çalışıyor ("besiktas" → "Beşiktaş")
      ⚠️ **DÜZ `pg_trgm` BUNU SAĞLAMIYOR — Faz 3.1'de ölçüldü.** Gerçek veritabanında
      (PG 18.6, `builtin`/`C.UTF-8`): `similarity('Beşiktaş','besiktas')` = **0,286**,
      varsayılan eşik **0,3**, yani `'Beşiktaş' % 'besiktas'` → **`f`**. `show_trgm`
      sebebi gösteriyor: Türkçe harf içeren trigramlar **hash'leniyor**
      (`0xc41c44`…) ve ASCII sorguyla kesişmiyor. Çözüm **`unaccent`** (mevcut, 1.1):
      `similarity(unaccent(…), unaccent(…))` = **1,0**, eşik geçiliyor.
      ⚠️ **TUZAK:** `unaccent` `STABLE`, `IMMUTABLE` değil — indeks ifadesinde
      doğrudan kullanılamaz (`ERROR: functions in index expression must be marked
      IMMUTABLE`, ölçüldü). `IMMUTABLE` sarmalayıcı gerekiyor. Faz 3.7 indeksi
      buna göre kuracak.

**Bağımlılık:** Faz 7

---

## FAZ 9 — Oyuncu Verisi İngesti

**Hedef:** ~3.500 oyuncunun kimlik, fiziksel, sözleşme ve istatistik verisi + portreleri.

**Kapsam:**
- Kimlik: ad, soyad, bilinen ad, doğum tarihi, uyruk (çoklu), ikinci uyruk, doğum yeri
- Fiziksel: boy, kilo, tercih edilen ayak (sağ/sol 1–20 ayrı)
- Kulüp: mevcut kulüp, forma numarası, sözleşme bitişi, maaş (varsa), piyasa değeri
- Mevki: birincil mevki + ikincil mevkiler
- **İstatistik ingesti** (nitelik türetimi için — Faz 10'un girdisi): maç, dakika, gol, asist, xG, xA, pas sayısı/isabeti, ilerletici pas, dripling, ikili mücadele, hava topu, top çalma, engelleme, faul, kart; kaleci için kurtarış, xGA, penaltı kurtarışı
- **Portre işleme:** indir → yüz tespiti → merkeze hizala → kırp → 3 boyut → WebP/AVIF
- **Gerçek portreler birincil:** veri paketinden yüklenir, yüz hizalı kırpılır (göz hizası üstten %38)
- **`PORTRAIT_STYLE=stylized`:** gerçek ve prosedürel portrelere ortak görsel işlem — 20. sezonda bile tutarlı görünüm (bkz. spec 12, Bölüm 17.6)
- **Prosedürel portre yedeği:** fotoğraf yoksa uyruk/yaş bazlı vektör avatar üret (6 katman: yüz şekli, ten tonu, saç stili, saç rengi, sakal, göz/kaş)
- Serbest oyuncu havuzu (~300 kişi)
- Veri kalite raporu: eksik alan yüzdeleri, aykırı değerler (17 yaşında 40 maçlık kariyer gibi), çift kayıt tespiti

**Kabul kriterleri:**
- [ ] 3.500+ oyuncu, her kulüpte en az 18 kişilik kadro
- [ ] `DATA_MODE=full` ile gerçek armalar, portreler, formalar, logolar ekranda görünüyor
- [ ] Portre kapsama oranı > %80 (kalanı prosedürel)
- [ ] `PORTRAIT_STYLE=stylized` modunda gerçek/prosedürel portreler ayırt edilemiyor
- [ ] Prosedürel portreler gerçek portrelerle **aynı görsel dilde** (yan yana konduğunda uyumlu)
- [ ] Veri kalite raporu üretiliyor, kritik eksik yok
- [ ] Aynı oyuncu iki kez kaydedilmemiş (uniqueness testi)
- [ ] Türkçe karakterli isimler doğru saklanıyor ve aranabiliyor

**Bağımlılık:** Faz 8
**Risk:** API kotası → toplu ingest gece çalıştırılır, `.cache/` sayesinde tekrar çalıştırma ücretsiz.

---

## FAZ 10 — Nitelik Türetme Motoru

**Hedef:** Hiçbir yerde açık kaynak olmayan 1–20 niteliklerini, gerçek istatistiklerden **mantıklı ve tutarlı** şekilde üretmek. (S26 → A)

**Kapsam:**
- **CA hesabı:** lig katsayısı × dakika ağırlıklı performans + yaş eğrisi + piyasa değeri sinyali → 1–200
- **PA hesabı:** yaş + CA + gelişim eğimi (son 2 sezon) + kulüp/lig prestiji + genç yaşta üst lig deneyimi → 1–200, belirsizlik aralığıyla
- **47 görünür nitelik türetimi** — istatistik → nitelik eşleme tabloları:
  - `Passing` ← pas isabeti + ilerletici pas + pas hacmi (mevkiye göre normalize)
  - `Finishing` ← gol/xG oranı + şut isabeti + ceza sahası içi dönüşüm
  - `Tackling` ← başarılı müdahale oranı + faul oranı (ters)
  - `Pace/Acceleration` ← hız verisi varsa doğrudan, yoksa yaş + mevki + dripling başarısı
  - `Positioning`, `Anticipation`, `Decisions` ← mevki + CA + lig seviyesi tabanlı, istatistikle düzeltme
  - Kaleci 11 niteliği ← kurtarış oranı, xGA farkı, penaltı, hava topu çıkışı, ayak kullanımı
  - (Tam 47 nitelik eşleme tablosu `docs/attribute-derivation.md`'de)
- **CA bütçe dağıtımı:** türetilen nitelikler mevki ağırlıklarıyla CA'ya normalize edilir — toplam CA tutarlılığı korunur
- **10 gizli nitelik:** Tutarlılık, Önemli Maç, Sakatlığa Yatkınlık, Kirli Oyun, Baskı Altında, Profesyonellik, Hırs, Sadakat, **Uyum Yeteneği (`adaptability`)**, **Mizaç (`temperament`)** — kariyer geçmişi + disiplin + kulüp değiştirme sıklığı + sakatlık geçmişinden türetilir.
  ⚠️ **SAPMA-001:** bu liste Faz 3.0'a kadar **sekiz** nitelik sayıyordu. `adaptability` ve `temperament` spec yazımı sırasında eklenmişti (`docs/spec/02-attributes.md` Bölüm 4.1: *"10 gizli nitelik"*) ama ROADMAP güncellenmemişti. Türetme kaynakları `spec/02` §4.3'te: `adaptability` ← yabancı lig sayısı + oralarda ilk sezon performansı · `temperament` ← kırmızı kart + disiplin olayları (ters).
- **Kişilik türetimi:** gizli niteliklerden 25+ kişilik etiketi (kural tabanlı eşleme matrisi)
- **Mevki yetkinlik matrisi:** oynanan dakikalardan Doğal/Yetkin/Kabul Edilebilir/Zayıf/Yabancı
- **Özel yetenekler (traits/PPM):** ~30 özellik, istatistik desenlerinden ("uzaktan şut dener" ← ceza sahası dışı şut oranı)
- **Kalibrasyon paneli:** üretilen dünyada nitelik dağılımı histogramı, en yüksek CA'lı 50 oyuncu listesi, mevki bazlı ortalamalar → gözle doğrulama

**Kabul kriterleri:**
- [ ] Üretilen en iyi 50 oyuncu listesi **makul** (elle gözden geçirilir ve onaylanır)
- [ ] CA dağılımı normal-benzeri, uç değer yok (< 5 oyuncu CA > 185)
- [ ] Aynı girdi → aynı çıktı (deterministik, tohum bazlı)
- [ ] Hiçbir nitelik 1–20 dışında değil, hiçbir CA > PA değil
- [ ] Mevki bazlı ortalamalar mantıklı (santrforun Finishing'i stoperinkinden yüksek)
- [ ] Kalibrasyon paneli çalışıyor ve rapor üretiyor

**Bağımlılık:** Faz 9
**Risk:** Bu fazın çıktısı tüm oyunun dengesini belirler → kalibrasyon için ekstra gün ayrılabilir, bölünebilir (10a türetim / 10b kalibrasyon).

---

## FAZ 11 — Veri Editörü, Doğrulayıcı ve Paket Sistemi

**Hedef:** Verinin elle düzeltilebilmesi ve paketlenebilmesi. (Nitelik türetimi hiçbir zaman %100 olmaz — elle müdahale şart.)

**Kapsam:**
- Oyun içi **Veri Editörü** ekranı (ana menüden erişilir)
- Düzenlenebilir: kulüp (isim, renk, prestij, tesis, bütçe), oyuncu (tüm nitelikler, CA/PA, kişilik, sözleşme), personel, lig kuralları, turnuva formatı
- Toplu düzenleme: filtrele → seç → toplu değişiklik (örn. "tüm Süper Lig kalecilerinin Reflexes +2")
- **Paket sistemi:** tam format `docs/spec/12-data-packs.md` (Bölüm 17.2–17.4)
- **İçe aktarma akışı (9 adım):** paket seç → manifest oku → **kuru çalıştırma (önizleme)** → çakışma çözümü → elle eşleme → transaction içinde içe aktar → varlık hattı (görsel işleme) → doğrula → rapor
- **Kuru çalıştırma zorunlu:** kullanıcı ne olacağını görmeden içe aktarma yapılamaz
- Paket dışa aktarma (`.fmspack` — zip) ve içe aktarma
- **Doğrulayıcı (`validateWorld`):** 40+ kural
  - Her kulüpte ≥ 18 oyuncu, ≥ 2 kaleci
  - Hiçbir oyuncu iki kulüpte değil
  - Sözleşme bitişleri geçmişte değil
  - Maaş toplamı kulüp bütçesiyle tutarlı
  - Forma numaraları kulüp içinde benzersiz
  - Her lig doğru takım sayısına sahip
  - CA ≤ PA, nitelikler 1–20
  - Turnuva takvimleri çakışmıyor
- **⚠️ ŞEMA BU ÜÇ KURALI İFADE EDEMEDİ — Faz 3'ten devredilen boşluklar**
  *(`docs/SPEC-COVERAGE-GAPS.md`)*
  Üçü de aynı sınıf (*"koşullu / çapraz tablo kuralı, sütun kısıtıyla yazılamaz"*) ve
  **birlikte okunmalı** — tek tek karşılaşılırsa her biri ayrı bir sürpriz gibi görünür.
  ⚠️ 3.7'nin dersi: her satır için soru **yeniden sorulur** — *"gerçekten ifade
  edilemiyor mu, yoksa bir yol mu kaçırdık?"* G-11 tam olarak böyle daraldı.
  - **G-10 — `clubs` koşullu nullability.** `competition_id` ve `stadium_id` 3.5'te
    **nullable** yapıldı (milli takımların ne ligi ne sabit ev sahası var, Faz 41). Bu
    kulüp takımları için bir boşluk bıraktı: *"`is_national = false` olan bir kulüp
    ligsiz veya stadyumsuz kalabilir mi?"* Cevap **hayır** olmalı. Gerekçe
    `packages/db/src/schema/clubs.ts` başlığında.
  - **G-11 — `rivalries` çift tekliği (DARALDI, kapanmadı).** 3.7 bir `LEAST/GREATEST`
    ifade indeksi koydu; `(A,B)` tekrarı ve `(B,A)` ters tekrarı **kapandı**. Kalan tek
    delik **`(A,A)`** — bir kulübün kendi rakibi olması. Doğrulayıcının işi.
  - **G-12 — `club_kits.color3` ↔ `kit_templates.color_slots`.** `color3` nullable
    (iki yuvalı şablonda üçüncü renk yoktur), ama *"`color_slots = 3` ise `color3`
    dolu, `= 2` ise boş"* bir **çapraz tablo** kuralı. Bugün hiçbir şey denetlemiyor.
    Karar `packages/db/src/schema/club-kits.ts` sütun yorumunda.
- **⚠️ TÜRETİLMİŞ BİR DEĞER NASIL "DÜZENLENİR" — kişilik** *(G-15, Faz 4.1'de açıldı)*
  Yukarıdaki *"Düzenlenebilir: … oyuncu (… **kişilik** …)"* satırı `docs/spec/02` §4.6
  ile çelişiyor: orada kişilik **saklanmıyor**, `derivePersonality(hidden)` ile gizli
  niteliklerden **türetiliyor**. Faz 4 bu yüzden `player_personalities` tablosunu
  **açmadı** (SAPMA-030) — bir tabloyu açmak çelişkiyi çözmek değil, gizlemek olurdu.
  Üç olası cevap ve hiçbiri bugün yazılı: ① editör aslında **gizli nitelikleri**
  düzenler ve kişilik onu takip eder (en tutarlısı; bedeli: kullanıcı doğrudan
  *"Profesyonel yap"* diyemez) ② bir **override sütunu** eklenir (türetmeyi deler,
  iki gerçek kaynağı doğar) ③ bu satır düzeltilir. **Karar bu fazda verilir ve
  `docs/spec/02` §4.6 ile ROADMAP aynı alt görevde hizalanır.**
- ℹ️ **`CA ≤ PA` ve `1–20` burada İKİNCİ KEZ denetleniyor — bu çakışma değil, bilinçli.**
  Faz 4'te `CA <= PA` ve `pa_range_min <= pa_range_max` veritabanı **CHECK**'i alır
  (ilişki değişmezi); nitelik **aralıkları** CHECK almaz (§3.1.2 ② — aralık bir
  kalibrasyondur, denge ayarı onu değiştirebilir) ve **tek denetim yeri burasıdır**.
  İkisinin farkı: CHECK yanlış satırın **yazılmasını** engeller, doğrulayıcı var olan
  veriyi **okunur bir rapora** çevirir ve düzeltme bağlantısı verir. Ayrıntı: SAPMA-028.
- Doğrulayıcı raporu: hata / uyarı / bilgi seviyeleri, tıklanabilir düzeltme bağlantısı
- Değişiklik geçmişi (undo/redo) + fark görüntüleyici

**Kabul kriterleri:**
- [ ] Bir oyuncunun niteliği editörden değişip kaydediliyor
- [ ] Toplu düzenleme 500 oyuncuda < 2 sn
- [ ] Paket dışa/içe aktarma tam döngü çalışıyor
- [ ] Kuru çalıştırma gerçekten hiçbir şey yazmıyor, doğru önizleme veriyor
- [ ] Eşleşmeyen varlıklar raporlanıyor ve elle eşlenebiliyor
- [ ] İçe aktarma yarıda kesilirse veritabanı tutarlı kalıyor (transaction geri alma)
- [ ] Kasıtlı olarak bozulmuş veri (kalecisiz kulüp) doğrulayıcı tarafından yakalanıyor
- [ ] 40 doğrulama kuralının tamamı test edilmiş
- [ ] Undo/redo 50 adım derinliğinde çalışıyor

**Bağımlılık:** Faz 10, 6

---
---

# BLOK C — ÇEKİRDEK OYUN KABUĞU
### Faz 12 – 17 | Hedef: Kariyer başlatılabilir, zaman ilerletilebilir hale gelmek

---

## FAZ 12 — Master World + Delta Save Mimarisi

**Hedef:** Alarm 3'ün çözümü. Kayıt boyutunu 50 kat küçültmek.

**Kapsam:**
- **Master World:** salt-okunur, tüm kayıtlar tarafından paylaşılan temel dünya (Faz 8–10 çıktısı)
- **Delta katmanı:** `save_deltas` tablosu — `(saveId, entityType, entityId, field, value, turnNumber)`
- **Okuma katmanı (`WorldView`):** master + delta birleştirme, bellekte önbellekli, tip güvenli erişim
- **Yazma katmanı (`WorldMutation`):** her değişiklik delta olarak yazılır, doğrudan master'a yazma **imkânsız** (tip seviyesinde engellenir)
- **⚠️ MASTER BİR TABLO SAVE KATMANINA FK VEREBİLİR Mİ — yön kararı** *(G-16, Faz 4.1'de açıldı)*
  `spec/01` §3.1 `managers`i **master**'a koyuyor ama `userId` §3.2'deki `users`a
  bakıyor. K4 *"master paylaşımlı ve asla kullanıcı işlemiyle değiştirilmez"* diyor;
  bir kullanıcı silinince master bir satırın etkilenmesi bu ilkeyle gerilimde.
  Alternatif ilişkiyi **ters çevirmek** (`users.manager_id`), böylece bağ tamamen save
  tarafında kalır. **Bu fazın kararı** (delta mimarisi burada kuruluyor), uygulaması
  **Faz 13**. Faz 4 sütunu bu belirsizlik çözülmeden yazmadı (SAPMA-032).
- **⚠️ MARKALI KİMLİK TİPLERİ — `people.id` ile `players.id` karışması** *(G-17, Faz 4.4'te açıldı)*
  İkisi de `integer` ve birini diğerinin yerine vermek **yabancı anahtarla
  yakalanamaz**: o kimlikte bir kişi büyük olasılıkla vardır, yalnızca **yanlış
  kişidir**. FK *"böyle bir satır var mı"* diye sorar, *"doğru satır mı"* diye
  değil. Bugünkü tek savunma bir **isimlendirme disiplini** (`*_person_id` /
  `*_player_id`) ve hiçbir kapı onu denetlemiyor.
  **Neden burası:** markalı (branded/nominal) tipler ancak kimliklerin bir
  **sınırdan** geçtiği yerde işe yarar ve o sınır `WorldView`/`WorldMutation` —
  motorun ve API'nin kimlikleri aldığı yer. Şema katmanına konsaydı her ham SQL
  sorgusu onu delerdi.
  ⚠️ **Maruziyet Faz 4'te katlandı:** 4.5–4.7 yedi tablo getiriyor ve hepsi
  `playerId` ya da `personId` ile anahtarlı. Karar burada verilir; uygulama da
  burada (`WorldView` yazılırken bedava, sonradan pahalı).
- **Snapshot sıkıştırma:** delta sayısı 50.000'i aşınca mevcut durum tek JSONB blob'a yazılır, delta temizlenir
- **Otomatik kayıt:** her ayın 1'i + her 5 turda bir + manuel (S48)
- **Snapshot noktaları:** sezon başı otomatik + kullanıcının 1 manuel noktası
- Kayıt slotları: 3 slot, her slot bağımsız
- **Kayıt bütünlüğü doğrulayıcısı (`validateSave`):** her otomatik kayıtta çalışır — kadro sayısı, negatif bütçe, yetim referans, çift kayıt, tarih tutarlılığı
- Kayıt sıkıştırma (gzip) + boyut telemetrisi
- **🆕 FAZ 4'TEN DEVREDİLEN BEŞ TABLO** *(SAPMA-030, 4.1'de taşındı)*
  ROADMAP Faz 4 bunları kendi kapsamında sayıyordu; ölçüm dördünün `spec/01`
  **§3.2 save katmanında** olduğunu (ya da oraya ait olduğunu) gösterdi. Save-scoped
  bir tabloyu save-delta mimarisi **yokken** açmak tutarsız olurdu.
  - **`contracts`** — `spec/01` §3.2. `saveId`·`playerId`·`clubId` FK, `weeklyWage`/
    `signingBonus`/`releaseClause`/`minimumFeeClause` **`bigint` + `{ mode: 'bigint' }`**
    (§3.1.2 ⑥ — `mode: 'number'` sessizce yanlış sayı döndürüyor, para için ölümcül),
    `squadRole` ve `status` **kapalı küme → CHECK** (§3.1.2 ②)
  - **`contract_clauses`** — `spec/01` §3.2. `type` kapalı küme → CHECK; `amount` `bigint`
  - **`injuries`** — `spec/01` §3.2. ⚠️ ROADMAP Faz 4 buna **`player_injuries`** diyordu;
    spec adı kazandı. `severity` kapalı küme → CHECK; `recurrenceOf` kendine referans
  - **`injury_types`** — **sözlük tablosu** (`key` yok + giden FK yok → `fk-policy.ts`
    onu `dictionary` sınıflar ve ona giden FK'lar **RESTRICT** alır). ~40 satır, her biri
    **veri taşıyor** (süre aralığı, ciddiyet) — bu yüzden bir CHECK değil bir tablo.
    Veriyi **Faz 39** kalibre eder; burada yalnızca şema ve sözlüğün kendisi.
    `injuries.injury_type_code` → buraya FK.
  - **`manager_career`** — `(saveId, managerId, clubId, başlangıç, bitiş, sezon
    istatistikleri, kupalar)`. Tüketicisi **Faz 47** (S207 menajer profili: *"kariyer
    geçmişi (her kulüp, süre, istatistik), kupa vitrini"* + S204 metrikleri).
    Master'da **değil**: kariyer oyun oynanırken birikiyor ve Faz 47 liderlik tablosu
    onu kayıtlar arası topluyor.

  ⚠️ **Faz 4'ün FK kuralı (V3) burada da geçerli ve `spec/01` §3.1.2 ③+⑧'den
  türetiliyor** — güncellenecek bir liste yok. Ama `injury_types` bu fazda **ilk kez
  bir hedef** oluyor: sözlük kuralı ancak ona giden bir FK varken cevap üretir, ve o FK
  burada doğuyor.

**Kabul kriterleri:**
- [ ] 1 sezon oynanmış kayıt < 500 KB
- [ ] 10 sezon oynanmış kayıt < 8 MB
- [ ] `WorldView` okuması < 5 ms (önbellekli)
- [ ] Master'a doğrudan yazma denemesi **derlenmiyor** (tip hatası)
- [ ] Snapshot sıkıştırma sonrası dünya durumu birebir aynı (100 alan karşılaştırma testi)
- [ ] `validateSave` bozuk kaydı yakalıyor ve hangi varlıkta olduğunu söylüyor
- [ ] 3 kayıt slotu birbirini etkilemiyor
- [ ] **Faz 4'ten devredilen beş tablo açıldı** (`contracts` · `contract_clauses` · `injuries` · `injury_types` · `manager_career`), `injury_types`'a giden FK **RESTRICT** ve bu **kuraldan türetilerek** doğrulandı *(SAPMA-030)*

**Bağımlılık:** Faz 11
**Risk:** En kritik mimari faz. Yanlış yapılırsa 30. fazda geri dönüş imkânsız → ekstra test yatırımı yapılacak.

---

## FAZ 13 — Kayıt, Sunucu Modları ve Kötüye Kullanım Önleme

**Hedef:** Herkese açık kayıt — ama sunucu üzerinde tam kontrol sizde. Açık kayıt = yabancıların kişisel verisi = **KVKK/GDPR zorunlu**.

**Kapsam — Sunucu Modu Sistemi (yeni):**
- **3 mod, admin panelinden anlık değiştirilir:**

| Mod | Davranış |
|---|---|
| **PUBLIC** | Herkes kayıt olur, herkes oynar. Normal işletim. |
| **ÖZEL (PRIVATE)** | Kayıt açık kalır, ancak **yalnızca izin listesindeki kullanıcılar** oyunu başlatabilir/oynayabilir. Diğerleri giriş yapabilir ama *"Oyun şu anda özel moddadır"* ekranıyla karşılaşır (özelleştirilebilir mesaj). |
| **BAKIM (MAINTENANCE)** | **Yalnızca IP izin listesindeki adresler** siteye erişebilir. Herkes bakım ekranı görür (özelleştirilebilir mesaj + tahmini süre). |

- `server_config` tablosu (tek satır): `mode`, `maintenance_message`, `private_message`, `estimated_return`, `updated_by`, `updated_at`
- Redis önbelleği — her istekte DB sorgusu atılmaz, mod değişince önbellek anında geçersizleşir
- **`ServerModeGuard`** — NestJS global guard, her isteği kontrol eder; frontend'de de mod durumu SSE ile canlı yayılır (kullanıcı mod değişince anında ilgili ekranı görür)
- **Gerçek IP tespiti:** Cloudflare arkasındayız — IP `CF-Connecting-IP` başlığından alınır. `X-Forwarded-For` taklit edilebilir, **kullanılmaz**. Sadece Cloudflare IP aralıklarından gelen istekler güvenilir kabul edilir.
- `admin_ips` tablosu: tekil IP veya CIDR bloğu, açıklama etiketi, ekleyen, tarih
- `user_access_grants` tablosu: özel mod izin listesi, veren admin, tarih, opsiyonel son kullanma
- **Admin her zaman erişir** — mod ne olursa olsun admin rolü kilitlenmez
- **Kilitlenme koruması (kritik):** Türkiye'de ev internetleri çoğunlukla dinamik IP'lidir. IP'niz değişirse bakım modunda kendinizi dışarıda bırakabilirsiniz. Üç katmanlı koruma:
  1. `.env` içinde `EMERGENCY_ADMIN_TOKEN` — bu token'la URL parametresi olarak her modda giriş yapılabilir
  2. CLI kaçış: `docker compose exec api pnpm admin:set-mode public`
  3. Bakım moduna geçerken **mevcut IP'niz otomatik izin listesine eklenir** ve onay ekranında gösterilir
- Tüm mod değişiklikleri audit log'a yazılır

**Kapsam — Kayıt ve Güvenlik:**
- **Açık kayıt akışı:** e-posta + şifre (argon2id), kullanıcı adı, e-posta doğrulama zorunlu (doğrulanmadan oyun başlatılamaz) — **Resend** ile gönderim
- **🆕 FAZ 4'TEN DEVREDİLEN İLERİ YABANCI ANAHTAR — `managers.user_id`** *(SAPMA-032, 4.1'de taşındı)*
  `spec/01` §3.1 `managers`i **master** tabloya koyuyor ama `userId FK nullable` taşıyor
  (*"`userId` null = AI menajer"*); `users` **§3.2 save katmanında** ve **bu fazda**
  doğuyor. Faz 4 bu yüzden sütunu **hiç yazmadı** — kısıtsız bir sütun *"tüm yabancı
  anahtarlar tanımlı"* kriterini görünürde sağlayıp gerçekte delerdi (Faz 3'ün üç ileri
  FK'sıyla birebir aynı sınıf). **Bu fazın migration'ı sütunu VE yabancı anahtarı
  BİRLİKTE eklemek zorunda.** `ON DELETE` davranışı `fk-policy.ts`'ten **türetilir**,
  elle seçilmez.
  ⚠️ İkinci bir soru bu satırla birlikte cevaplanır ve **kaydı G-16'da**: master bir
  tablonun save katmanına FK vermesi K4 açısından doğru mu? Alternatif, ilişkiyi ters
  çevirip `users.manager_id` yapmak. Karar Faz 12'de (delta mimarisi) verilir,
  uygulaması burada.
- **Cloudflare Turnstile:** kayıt ve giriş formunda — görünmez, kullanıcıyı yormaz, bot kaydını engeller, ücretsiz ve sınırsız
- **Kötüye kullanım önleme (ücretsiz sunucuda kaynak koruması):**
  - Hesap başına **3 kayıt slotu** (S43) — sunucu tarafında zorunlu
  - IP başına saatte 3 hesap kaydı limiti
  - Tek kullanımlık e-posta alan adları (disposable email) engel listesi
  - **Pasif kayıt arşivleme:** 90 gündür açılmayan kayıtlar sıkıştırılıp soğuk depoya (R2) taşınır, girilince geri yüklenir
  - Kullanıcı başına disk kotası; aşılırsa yeni kayıt açılamaz, uyarı gösterilir
  - Tur atlama için kullanıcı başına saatlik limit (normal oynayışı etkilemeyecek seviyede)
- **Rate limiting (v2'den v1'e çekildi):** uç nokta bazlı, Redis tabanlı sliding window; Cloudflare WAF ikinci katman
- **Audit log:** her kullanıcı eylemi (kayıt oluşturma, transfer, tur atlama, taktik değişimi) `saveId + turnId + correlationId` ile kaydedilir
- **Anomali tespiti (v2'den v1'e çekildi):** imkânsız bütçe artışı, sezonda 200 gol, 100 maçta 0 yenilgi, anormal tur hızı → otomatik bayrak, liderlik tablosundan geçici çıkarma
- **Küfür filtresi (S36 + Boşluk-4):**
  - TR + EN kelime listesi (genişletilebilir JSON)
  - **Bypass engelleyici:** Unicode normalizasyon (NFKD) → leetspeak çözümleme (`4→a`, `3→e`, `1→i`, `0→o`, `$→s`, `@→a`) → görsel-benzer karakter eşleme (Kiril `а` → Latin `a`) → boşluk/nokta/tire/alt çizgi/sıfır-genişlik karakter temizleme → tekrarlı harf sıkıştırma (`aaammk` → `amk`) → sonra kontrol
  - Hem tam eşleşme hem alt dize kontrolü + beyaz liste (yanlış pozitifler için: "sikke", "Sivas")
  - Kullanıcı adı, menajer adı, kayıt adı, özel diziliş adı — hepsinde uygulanır
- **Admin rolü:** ilk kullanıcı `SETUP_TOKEN` ile admin olur (`.env`'den, tek kullanımlık). Rol sistemi: `user` / `moderator` / `admin`
- **Temel admin uçları:** kullanıcı listeleme, hesap askıya alma, mod değiştirme, izin listesi yönetimi. *(Tam yönetim paneli arayüzü Faz 47'de.)*
- **KVKK/GDPR uyumu — KOŞULLU (yalnızca `SERVER_MODE=public` ise):**
  > Sunucu varsayılan olarak **Özel modda** açılır ve yalnızca izin listesindeki hesaplar oynar.
  > Kişisel kurulumda (tek kullanıcı) bu bölüm **atlanır**. Public moda geçilirse yasal
  > zorunluluk haline gelir; o zaman uygulanmak üzere spesifikasyonu hazır tutulur.
  > `docs/LEGAL/` klasörü ve metinler v1'de yazılır ama Özel modda gösterilmez.
  - Aydınlatma metni (KVKK m.10) + Gizlilik Politikası + Kullanım Koşulları
  - Açık rıza kutusu (önceden işaretli değil)
  - **"Hesabımı ve tüm verilerimi sil"** — 30 gün içinde tam silme, onay e-postası
  - **"Verilerimi indir"** — JSON dışa aktarma (veri taşınabilirliği hakkı)
  - Çerez banner'ı (Cloudflare analytics çerezsiz çalışır, bu işi kolaylaştırır)
  - Veri saklama politikası: pasif hesaplar 2 yıl sonra bildirimle silinir
  - Veri işleme envanteri (`docs/LEGAL/data-inventory.md`)
- Oturum yönetimi: JWT (kısa ömürlü) + refresh token (httpOnly cookie)
- **Cihaz kilidi (Boşluk-1):** bir kayıt açıkken başka cihazdan girilirse uyarı:
  > *"Bu kayıt başka bir cihazda aktif. Diğer cihazdaki oturumu kapatırsanız, en son kayıt noktasından devam edersiniz. Devam edilsin mi?"*
  - Onaylanırsa: eski oturum `SESSION_TAKEN` mesajıyla salt-okunur olur, yeni oturum son snapshot'tan başlar
- Ayarlar: dil, para birimi (varsayılan **EUR**, S150+Boşluk-5), tema, ses seviyeleri, animasyon, erişilebilirlik, zorluk, "maçı tekrar oynayabil" anahtarı (S50→C)

**Kabul kriterleri:**
- [ ] Herkes kayıt olup oyun başlatabiliyor (PUBLIC modda) — hiçbir kapı yok
- [ ] **ÖZEL modda** izin listesi dışındaki kullanıcı giriş yapabiliyor ama oyunu başlatamıyor, doğru mesajı görüyor
- [ ] **BAKIM modunda** izin listesi dışındaki IP siteye hiç erişemiyor
- [ ] Mod değişikliği açık oturumlara SSE ile anında yansıyor
- [ ] Gerçek IP `CF-Connecting-IP`'den okunuyor; sahte `X-Forwarded-For` başlığı işe yaramıyor (testle kanıtlanır)
- [ ] `EMERGENCY_ADMIN_TOKEN` ile bakım modunda giriş yapılabiliyor
- [ ] CLI ile mod sıfırlanabiliyor
- [ ] Bakım moduna geçerken mevcut IP otomatik izin listesine ekleniyor ve onay ekranında gösteriliyor
- [ ] Admin hiçbir modda kilitlenmiyor
- [ ] Turnstile bot kaydını engelliyor, gerçek kullanıcıyı yormuyor
- [ ] E-posta doğrulanmadan oyun başlatılamıyor
- [ ] 4. kayıt slotu açılamıyor (API seviyesinde engelli, sadece arayüzde değil)
- [ ] IP başına saatlik kayıt limiti çalışıyor
- [ ] **`managers.user_id` sütunu VE yabancı anahtarı birlikte eklendi**, `ON DELETE` davranışı `fk-policy.ts`'ten türetildi *(Faz 4 devri, SAPMA-032)*
- [ ] Rate limiting normal oynayışı engellemiyor, saldırıyı engelliyor (yük testiyle kanıtlanır)
- [ ] Anomali tespiti test senaryolarını yakalıyor
- [ ] Küfür filtresi 200 test vakasını geçiyor (100 engellenmeli, 100 geçmeli)
- [ ] `a.m.k`, `4mk`, `аmk` (Kiril a), `a m k`, `aaamk` → hepsi engelleniyor
- [ ] "Sivasspor", "Sikke Koleksiyoncusu" → engellenmiyor
- [ ] "Hesabımı sil" tüm verileri gerçekten siliyor (DB'de kalıntı yok, testle doğrulanır)
- [ ] "Verilerimi indir" geçerli JSON üretiyor
- [ ] (Public modda) Aydınlatma metni, gizlilik politikası, kullanım koşulları yayında — Özel modda atlanır
- [ ] Moderasyon paneli çalışıyor
- [ ] Pasif kayıt arşivleme ve geri yükleme çalışıyor
- [ ] İki tarayıcıdan aynı kayda girince uyarı çıkıyor, onay sonrası eski oturum kilitleniyor
- [ ] Para birimi değişince tüm ekranlarda anında yansıyor
- **Küfür filtresi (S36 + Boşluk-4):**
  - TR + EN kelime listesi (genişletilebilir JSON)
  - **Bypass engelleyici:** Unicode normalizasyon (NFKD) → leetspeak çözümleme (`4→a`, `3→e`, `1→i`, `0→o`, `$→s`, `@→a`) → görsel-benzer karakter eşleme (Kiril `а` → Latin `a`) → boşluk/nokta/tire/alt çizgi/sıfır-genişlik karakter temizleme → tekrarlı harf sıkıştırma (`aaammk` → `amk`) → sonra kontrol
  - Hem tam eşleşme hem alt dize kontrolü + beyaz liste (yanlış pozitifler için: "sikke", "Sivas")
- Oturum yönetimi: JWT (kısa ömürlü) + refresh token (httpOnly cookie)
- **Cihaz kilidi (Boşluk-1):** bir kayıt açıkken başka cihazdan girilirse uyarı:
  > *"Bu kayıt başka bir cihazda aktif. Diğer cihazdaki oturumu kapatırsanız, en son kayıt noktasından devam edersiniz. Devam edilsin mi?"*
  - Onaylanırsa: eski oturum `SESSION_TAKEN` mesajıyla salt-okunur olur, yeni oturum son snapshot'tan başlar
- Ayarlar: dil, para birimi (varsayılan **EUR**, S150+Boşluk-5), tema, ses seviyeleri, animasyon, erişilebilirlik, zorluk, "maçı tekrar oynayabil" anahtarı (S50→C)

**Kabul kriterleri:**
- [ ] Küfür filtresi 200 test vakasını geçiyor (100 engellenmeli, 100 geçmeli)
- [ ] `a.m.k`, `4mk`, `аmk` (Kiril a), `a m k`, `aaamk` → hepsi engelleniyor
- [ ] "Sivasspor", "Sikke Koleksiyoncusu" → engellenmiyor
- [ ] İki tarayıcıdan aynı kayda girince uyarı çıkıyor, onay sonrası eski oturum kilitleniyor
- [ ] Para birimi değişince tüm ekranlarda anında yansıyor

**Bağımlılık:** Faz 12

---

## FAZ 14 — Menajer Oluşturma, Yetenek Ağacı ve İtibar

**Hedef:** Kullanıcının kimliğini ve oyundaki gücünü tanımlaması.

**Kapsam:**
- **Oluşturma ekranı:** ad, soyad, cinsiyet, doğum tarihi, uyruk, memleket (şehir listesi ülkeye bağlı)
- **Prosedürel menajer avatarı** — oyuncu portre sistemiyle aynı motor
- Konuşulan diller (uyruğa göre varsayılan + eklenebilir) — yabancı oyuncu uyumunu etkiler
- **Antrenörlük sertifikası:** Yok / C / B / A / Pro — iş başvurusu kabul olasılığını doğrudan etkiler
- **Deneyim geçmişi:** Amatör / Eski Oyuncu (alt seviye/orta/üst) / Profesyonel — başlangıç itibarını belirler
- **Futbol felsefesi:** Hücum / Kontrol / Denge / Karşı Atak / Savunma / Gençlik Odaklı — AI algısını ve basın soru tonunu etkiler
- **Menajer nitelikleri (yetenek ağacı):** Taktik Bilgisi, Motivasyon, Oyuncu Yönetimi, Genç Geliştirme, Pazarlık, Basın İlişkileri, Antrenman Yönetimi, Gözlem Değerlendirme — 1–20, başlangıçta puan bütçesi dağıtılır (sertifika ve deneyim bütçeyi belirler)
- **Gözlem Değerlendirme niteliği (Boşluk-19):** Bu nitelik + gözlemci kalitesi + antrenör kalitesi birleşerek oyuncu nitelik/potansiyel görüntüleme netliğini belirler:
  - Düşük → "Bitiricilik: 10–18", potansiyel "Belirsiz"
  - Orta → "Bitiricilik: 13–16", potansiyel "İyi bir yetenek olabilir"
  - Yüksek → "Bitiricilik: 15", potansiyel "★★★★☆"
- **İtibar sistemi:** 0–200 gizli skala. Başlangıç: sertifika + deneyim. Artış: kupa, lig seviyesi, beklenti aşımı, genç geliştirme. Düşüş: kovulma, küçülme.
- **Deneyim puanı:** maç, sezon, başarı ile birikir → nitelik puanı ve sertifika yükseltme hakkı

**Kabul kriterleri:**
- [ ] Menajer oluşturma tüm alanlarla tamamlanıyor ve kaydediliyor
- [ ] Puan bütçesi aşılamıyor, sınır arayüzde net gösteriliyor
- [ ] Gözlem Değerlendirme niteliği değişince oyuncu ekranındaki belirsizlik aralığı **anında** değişiyor
- [ ] Avatar üretimi 200 farklı kombinasyonda tutarlı görünüyor
- [ ] İtibar hesabı `debugTrace` ile gerekçeli açıklanıyor

**Bağımlılık:** Faz 13, 10

---

## FAZ 15 — Kariyer Başlatma, İş Başvurusu ve Menajer Sözleşmesi

**Hedef:** Kullanıcının bir kulübün başına geçmesi.

**Kapsam:**
- **Yol A — Doğrudan takım seç:** ülke → lig → kulüp; her kulüp için **zorluk rozeti** (⭐ Kolay / ⚡ Zor / 🔥 Çok Zor) — prestij, bütçe, kadro kalitesi, yönetim beklentisinden hesaplanır
- Yeni oyunculara **önerilen kulüp** listesi (S212)
- **Yol B — İşsiz başla:** Açık pozisyonlar listesi, filtreleme (ülke, lig, prestij), başvuru
- **Başvuru değerlendirme:** kabul olasılığı = f(itibar, sertifika, deneyim, kulüp prestiji, kulübün aciliyeti, ülke/dil uyumu). Cevap **1–14 gün** içinde gelir (tur ilerledikçe). Ret gerekçesi bildirilir.
- **Menajer sözleşmesi:** maaş, süre (1–5 yıl), transfer bütçesi garantisi, maaş bütçesi, transfer yetkisi (tam/sınırlı/yok), performans bonusları, fesih tazminatı
- **Sözleşme revizyon pazarlığı (S170):** kullanıcı madde bazlı talep eder → kulüp kabul / ret / karşı teklif. Kulübün esnekliği = f(kullanıcı itibarı, kulüp aciliyeti, kulüp mali durumu)
- **Yönetim beklentileri:** sezon başında belirlenir — lig sırası hedefi, kupa hedefi, oyun tarzı beklentisi, genç geliştirme beklentisi, mali disiplin
- **Yönetim güveni sistemi (Boşluk-10):** 0–100. Kötüleşme aşamaları: Memnun → Kararsız → Endişeli → **Uyarı** → **Kovulma**. Her aşamada inbox mesajı.
- Kovulma sonrası: kariyer devam eder, tazminat alınır, işsiz duruma geçilir (Yol B'ye döner)

**Kabul kriterleri:**
- [ ] Her iki başlangıç yolu da sonuna kadar çalışıyor
- [ ] Düşük itibarlı menajerin Real Madrid başvurusu reddediliyor, gerekçe veriliyor
- [ ] Yüksek itibarlı menajer küçük kulübe başvurunca hızlı kabul alıyor
- [ ] Sözleşme revizyonu pazarlığı 3 tur sürebiliyor
- [ ] Yönetim güveni 5 aşamada da doğru mesaj üretiyor
- [ ] Kovulma sonrası kariyer bozulmadan devam ediyor

**Bağımlılık:** Faz 14

---

## FAZ 16 — Takvim ve Tur Motoru

**Hedef:** Oyunun kalbi. Zamanın güvenli, deterministik, kesintiye dayanıklı ilerlemesi.

**Kapsam:**
- **Takvim üreteci:** sezon takvimi (1 Temmuz 2026 başlangıç), lig fikstürü (çift devreli round-robin, çakışma önleyici), kupa kuraları, UEFA takvimi, milli aralar, transfer pencereleri, tatil dönemleri
- **Tur = 1 gün.** "Devam et" → **bir sonraki önemli olaya kadar** ilerler (S58 → A). Önemli olay tanımı: maç, transfer teklifi, oyuncu talebi, yönetim mesajı, sakatlık, sözleşme uyarısı, basın toplantısı, kupa kurası
- **Deterministik RNG:** `seed = xxhash(saveId, turnNumber, entityId, purpose)` — her rastgele karar izlenebilir ve yeniden üretilebilir
- **İdempotent tur işleme (Boşluk-2):**
  - İstemci `turnToken` (UUID) üretir → sunucuya gönderir
  - Sunucu `turn_locks` tablosunda kilit alır
  - İşlem adımları sırayla yürütülür, her adım `turn_progress` tablosuna yazılır
  - Bağlantı koparsa: yeniden bağlanınca aynı `turnToken` ile devam eder, tamamlanmış adımlar tekrarlanmaz
  - Kilit 5 dakika sonra otomatik düşer
- **Tur işleme hattı (sıralı adımlar):**
  1. Tarih ilerlet
  2. Sözleşme/sakatlık/ceza sayaçları güncelle
  3. Antrenman uygula, gelişim hesapla
  4. Maçları simüle et (varsa)
  5. Yapay zeka kararları (transfer, taktik, personel)
  6. Transfer pazarlıklarını ilerlet
  7. Oyuncu moral/istek güncellemesi
  8. Olay ve diyalog tetikleyicileri
  9. Haber üretimi
  10. Kayıt bütünlüğü doğrulaması
  11. Otomatik kayıt (koşul sağlanıyorsa)
- BullMQ kuyruğu + SSE ile ilerleme yayını
- **Eşzamanlı kullanıcı yönetimi (özel çok-kullanıcılı dağıtım gereği):**
  - Worker eşzamanlılığı `WORKER_CONCURRENCY` ile ayarlanır (2 OCPU'da **1** önerilir — diğer çekirdek API+DB'ye kalır)
  - **Simülasyon katmanı** kayıt bazlı: "Dengeli" (varsayılan, ~400 ms/maç günü) veya "Tam Detay" (~12 sn/maç günü). Bkz. Bölüm 0.1c.
  - Kullanıcı başına aynı anda **tek** tur işi (ikinci istek reddedilir)
  - **Kuyruk pozisyonu arayüzü:** "Sıradasınız — önünüzde 2 kişi var, tahmini 25 sn" (SSE ile canlı güncellenir)
  - Adil sıralama: aynı kullanıcı arka arkaya tur atlarsa öncelik düşer (starvation önleme)
  - Kuyruk metrikleri admin panelinde görünür
- **Yükleme ekranı:** o gün dünyada olanların canlı akışı + kuyruk durumu
- Tatil / yardımcıya devret modu (S65)

**Kabul kriterleri:**
- [ ] Tam sezon takvimi çakışmasız üretiliyor (otomatik doğrulama)
- [ ] Aynı tohumla 100 kez tur atlama → **birebir aynı** sonuç
- [ ] Tur ortasında bağlantı kesilip yeniden bağlanınca veri bozulmuyor, tur tamamlanıyor
- [ ] Maçsız gün turu < 800 ms
- [ ] "Devam et" bir sonraki önemli olayda **kesin olarak** duruyor
- [ ] Kilit mekanizması eşzamanlı iki istekte ikincisini reddediyor
- [ ] 5 kullanıcı aynı anda maç günü turu atlayınca hepsi doğru sonuç alıyor, kuyruk pozisyonu doğru gösteriliyor
- [ ] Dengeli modda 20 eşzamanlı kullanıcıda en uzun bekleme < 20 sn (Oracle A1 2 OCPU üzerinde ölçülür)
- [ ] Tam Detay modu seçilebiliyor ve uyarı gösteriyor

**Bağımlılık:** Faz 12, 15
**Risk:** Bölünebilir → 16a (takvim + fikstür) / 16b (tur motoru + idempotency).

---

## FAZ 17 — Ana Kabuk: Navigasyon, Inbox, Haber Akışı, Arama

**Hedef:** Oyunun içinde gezinilebilir hale gelmesi.

**Kapsam:**
- **Masaüstü düzeni:** sol sidebar (12 ana bölüm) + üst bar (kulüp arması, tarih, "Devam Et" butonu, bildirim rozeti) + içerik + opsiyonel sağ panel
- **Mobil düzeni:** alt tab bar (5 ana) + hamburger detay + kaydırma jestleri + üst bar sadeleştirilmiş
- **12 ana bölüm:** Ana Sayfa, Kadro, Taktik, Antrenman, Transfer, Fikstür & Lig, Kulüp, Personel, Sağlık, Dünya, Menajer, Gelen Kutusu
- **Gelen Kutusu:** e-posta benzeri, kategoriler (Yönetim / Oyuncu / Transfer / Basın / Sakatlık / Sistem), okundu-okunmadı, aksiyon butonları (kabul/ret/cevapla), toplu işlem, filtre
- **Haber akışı:** önem sırasına göre, kategorili, filtrelenebilir, sonsuz kaydırma
- **Global arama (`/` kısayolu):** oyuncu + kulüp + personel + lig + turnuva — tek kutu, Türkçe karakter toleranslı (pg_trgm), son aramalar
- **⚠️ ARAMANIN İKİ VARLIK TÜRÜ BUGÜNKÜ ŞEMAYLA YAPILAMIYOR** *(G-13, `docs/SPEC-COVERAGE-GAPS.md`)*
  Yukarıdaki beş türden **lig + turnuva** aranamıyor: `competitions`ın görünen adı
  `name_key`, yani bir **i18n anahtarı** (`competition.tur.superlig`) — üzerinde trigram
  araması anlamsız. Aynı sorun `rivalries.name_key`te de var. Faz 3.7 bu yüzden
  `competitions`a trigram indeksi **koymadı**: indekslenecek bir metin yok. Üç seçenek
  Faz 17'ye bırakıldı ve **burada karara bağlanır**: ① çeviriler üzerinde istemci tarafı
  arama · ② çevrilmiş adı taşıyan bir arama tablosu · ③ `name_key`i tamamlayan bir
  `display_name` sütunu (③ seçilirse bir migration ve `docs/spec/01` güncellemesi gerekir).
  Karar gerekçesi `packages/db/src/schema/competitions.ts` yorumunda.
- **Klavye kısayolları:** `Space` devam et, `1-9` bölüm, `/` arama, `Esc` kapat, `Ctrl+S` manuel kayıt
- Bildirim sistemi (toast + rozet)
- Ekran geçiş animasyonları (ölçülü, "hareketi azalt" ayarına saygılı)
- Yükleme durumları (skeleton)
- **Playwright kurulumu + `pnpm test:e2e` ilk akışı** *(G-02, `docs/SPEC-COVERAGE-GAPS.md`)*
  `docs/spec/09` §11.5 `pnpm test:e2e`'yi "Faz 17'den sonra" her faz kapanışında koşulacak
  diye listeliyor, ama ROADMAP'te Playwright yalnızca yığın listesinde ve **Faz 50**'nin tam
  senaryo paketinde geçiyordu — yani kurulum 33 faz geç kalıyordu. Oyunun ilk gezilebilir
  hale geldiği faz burası, kurulum buraya düşüyor. Kapsam: Playwright yapılandırması
  (masaüstü + 375px mobil projeleri), CI adımı, ve **tek** kritik akış (giriş → ana kabuk →
  bölüm gezinme). Tam senaryo paketi Faz 50'de kalır.

**Kabul kriterleri:**
- [ ] 12 bölüm arasında gezinme masaüstü ve mobilde sorunsuz
- [ ] `pnpm test:e2e` çalışıyor; ilk kritik akış hem masaüstü hem 375px projesinde yeşil, CI'da koşuyor *(G-02)*
- [ ] Inbox 500 mesajda akıcı, filtre < 100 ms
- [ ] Arama "besiktas" yazınca "Beşiktaş" buluyor, sonuç < 150 ms
- [ ] **Arama beş varlık türünün BEŞİNİ de kapsıyor** — lig ve turnuva dahil; seçilen çözüm ve gerekçesi yazılı *(G-13)*
- [ ] Tüm klavye kısayolları çalışıyor
- [ ] 375px genişlikte hiçbir yatay taşma yok
- [ ] Ekran geçişi < 200 ms

**Bağımlılık:** Faz 16, 6

---
---

# BLOK D — KADRO VE TAKTİK
### Faz 18 – 21 | Hedef: Takımı görebilmek ve kurabilmek

---

## FAZ 18 — Kadro Ekranı ve Veri Tablosu Motoru

**Hedef:** FM'in en çok kullanılan ekranı. Yoğun bilgiyi okunabilir ve filtrelenebilir sunmak.

**Kapsam:**
- **Sekmeler:** İlk 11 / Yedekler / Rotasyon / Tüm Oyuncular / Genç Takım / Kiralıktakiler / Kadro Dışı
- **DataTable yapılandırması:** 60+ seçilebilir sütun gruplandırılmış (Kimlik, Sözleşme, Nitelikler, İstatistik, Durum, Değer)
- **Hazır görünümler:** Genel, Nitelikler, Sözleşme, İstatistik, Antrenman, Sağlık + kullanıcı tanımlı kayıtlı görünümler
- Renk kodlama: nitelik ısı haritası, form göstergesi (G/B/M), moral ikonu, kondisyon çubuğu, sakatlık işareti, ceza işareti, uygunluk (kadro kaydı)
- Sıralama, çoklu filtre, hızlı arama, sütun sürükleme, sütun genişliği kaydı
- **Karşılaştırma modu:** 2–4 oyuncu yan yana, nitelik farkları vurgulu, radar grafiği
- Toplu işlem: kadro dışı bırak, transfer listesine ekle, kiralık listesine ekle, antrenman ata
- Sürükle-bırak: sekmeler arası oyuncu taşıma
- **Mobil kart görünümü:** kritik 4 bilgi (portre, isim, mevki, reyting) + tıklamayla detay
- Forma numarası atama ekranı (çakışma kontrolü)
- Takım kaptanı ve yardımcı kaptan atama

**Kabul kriterleri:**
- [ ] 60 sütun seçilebiliyor, görünüm kaydediliyor ve geri yükleniyor
- [ ] 500 oyuncuda sıralama/filtre < 100 ms
- [ ] Karşılaştırma modu 4 oyuncuyu doğru gösteriyor
- [ ] Mobilde kart görünümü kullanılabilir (tek elle)
- [ ] Sürükle-bırak dokunmatik ekranda çalışıyor
- [ ] Forma numarası çakışması engelleniyor

**Bağımlılık:** Faz 17

---

## FAZ 19 — Oyuncu Detay Ekranı

**Hedef:** Bir oyuncu hakkında bilinmesi gereken her şey, 11 sekmede.

**Kapsam:**
1. **Genel Bakış** — portre, kimlik, uyruk bayrağı, mevki haritası, sözleşme özeti, moral, form, kondisyon, değer, öne çıkan nitelikler
2. **Nitelikler** — 4 kategori (Teknik/Zihinsel/Fiziksel/Kaleci), ısı renkli, **belirsizlik aralığı** (Gözlem Değerlendirme'ye göre), gizli nitelik ipuçları
3. **İstatistikler** — sezon / kariyer / turnuva bazlı, maç maç döküm, mevkiye göre filtreli
4. **Gelişim** — CA zaman serisi grafiği, nitelik değişim geçmişi (son 12 ay), PA tahmin bandı
5. **Sözleşme** — maaş, bitiş, tüm maddeler, bonuslar, serbest kalma bedeli, rol garantisi, yenileme butonu
6. **Antrenman** — mevcut odak, bireysel program, mentor, antrenman performansı, yardımcı raporu
7. **Sağlık** — mevcut sakatlık, geçmiş, tekrarlama riski, sakatlığa yatkınlık göstergesi, fizyo notu
8. **Transfer** — durum (satılık/kiralık/korumalı), ilgilenen kulüpler, teklif geçmişi, tahmini bonservis
9. **Kişilik & Moral** — kişilik etiketi, moral sebepleri listesi, mevcut sorunlar, memnuniyet göstergeleri
10. **İlişkiler** — sevdiği/sevmediği oyuncular, favori kulüpler, favori menajerler, milli takım durumu
11. **Rapor** — yardımcı antrenör görüşü + gözlemci raporu (kaliteye göre detay seviyesi) + "en iyi mevki/rol" önerisi

- Üst bar: hızlı aksiyonlar (Konuş, Sözleşme Yenile, Antrenman Ata, Transfer Listesi, Karşılaştır)
- Önceki/sonraki oyuncu gezinme (kadro sırasına göre)
- Mobilde sekmeler yatay kaydırmalı

**Kabul kriterleri:**
- [ ] 11 sekme de veri gösteriyor, boş durum yok
- [ ] Gözlem Değerlendirme düşürülünce nitelikler aralık olarak gösteriliyor
- [ ] Gelişim grafiği 3 sezonluk veriyi doğru çiziyor
- [ ] Mobilde tüm sekmeler kullanılabilir
- [ ] Ekran açılışı < 250 ms

**Bağımlılık:** Faz 18

---

## FAZ 20 — Diziliş, Rol ve Görev Sistemi

**Hedef:** Taktiğin iskeleti.

**Kapsam:**
- **Diziliş editörü:** 2D saha, sürükle-bırak mevki, 20+ hazır diziliş (4-4-2, 4-3-3, 4-2-3-1, 4-1-4-1, 4-3-2-1, 3-5-2, 3-4-3, 5-3-2, 5-2-1-2, 4-4-1-1, 4-2-2-2, 3-4-2-1 vb.)
- **Özel diziliş editörü:** sıfırdan mevki yerleştirme, kaydetme, isimlendirme
- **Rol sistemi:** her mevki için 4–8 rol
  - Kaleci: Kaleci / Süpürücü Kaleci
  - Stoper: Stoper / Ball-Playing Defender / Kapatıcı / Libero
  - Bek: Bek / Kanat Beki / Ters Kanat Beki / Tamamlayıcı Bek / Sahte Bek
  - Ön Libero: Ön Libero / Yıkıcı / Derin Oyun Kurucu / Regista / Yarı Ön Libero / Bek-Ortasaha
  - Orta Saha: Orta Saha / Box-to-Box / Mezzala / Carrilero / Oyun Kurucu / Roaming Playmaker
  - Ofansif Orta: 10 Numara / Gölge Forvet / Enganche / Trequartista
  - Kanat: Kanat / Ters Ayak Kanat / Winger / Raumdeuter / Kanat Forveti
  - Forvet: Santrfor / Hedef Adam / Kaçan Forvet / Sahte 9 / Tamamlayıcı Forvet / Pressing Forvet / Deep-Lying Forward
- **Görev:** Savunma / Destek / Atak — her rol için uygun görevler
- **Rol uygunluk göstergesi:** oyuncunun niteliklerine göre 1–5 yıldız + hangi niteliklerin eksik olduğu
- **Mevki yetkinlik uyarısı:** "Bu oyuncu bu mevkide Zayıf" (performans cezası bilgisiyle)
- **Otomatik kadro seçimi:** en iyi 11 önerisi (rol uygunluk + form + kondisyon + moral ağırlıklı)
- **Taktik ön izleme:** dizilişin savunma/orta saha/hücum güç dağılımı görselleştirmesi
- Kadro derinliği görünümü: her mevkide 1./2./3. tercih

**Kabul kriterleri:**
- [ ] 20 hazır diziliş yükleniyor ve doğru mevki dağılımı gösteriyor
- [ ] Özel diziliş kaydedilip geri yükleniyor
- [ ] Rol uygunluk yıldızları nitelik değişince güncelleniyor
- [ ] Otomatik kadro seçimi mantıklı bir 11 kuruyor (elle doğrulanır)
- [ ] Sürükle-bırak mobilde çalışıyor
- [ ] Yanlış mevkideki oyuncu net şekilde uyarılıyor

**Bağımlılık:** Faz 19

---

## FAZ 21 — Takım Talimatları ve Duran Top Atamaları

**Hedef:** Taktiğin ince ayarı.

**Kapsam:**
- **Mentalite:** Çok Savunmacı / Savunmacı / Dengeli / Hücumcu / Çok Hücumcu
- **Top bizdeyken:** pas stili (çok kısa/kısa/karışık/direkt/uzun), hücum genişliği (dar/normal/geniş), tempo, oyunu odaklama (sol/orta/sağ), kanat ortası sıklığı, ceza sahasına adam sayısı, riskli pas, top sürme, karşı atak, zaman geçirme
- **Top rakipteyken:** savunma çizgisi yüksekliği (çok derin→çok yüksek), baskı yoğunluğu (5 kademe), baskı tetikleyicisi (asla/nadiren/normal/sık/daima), ofsayt tuzağı, sert müdahale (az/normal/sert), adam adama/bölge, kanat kapatma
- **Geçiş anları:** top kazanınca (hemen hücum/topa sahip ol/dağıl), top kaybedince (geri baskı/pozisyon al/savunmaya çekil)
- **Bireysel oyuncu talimatları:** ~20 talimat (daha çok şut çek, ceza sahasına gir, geriye kalma, ters ayakla içeri kat, adam adama markaj yap, sıkı markaj, uzaktan şut çek…)
- **Duran top atamaları (S73 + Boşluk-13):**
  - Penaltı, sağ/sol korner, sağ/sol/merkez frikik, uzun taç
  - Otomatik öneri: oyuncunun `Penalty Taking`, `Free Kick Taking`, `Corners`, `Long Throws`, `Technique`, `Composure` nitelikleri
  - Korner/frikikte ceza sahası düzeni: kim ön direkte, kim arka direkte, kim geride, kim rakibi engelliyor
- **Taktik kaydetme:** 3 taktik slotu (A/B/C) + maç içi geçiş
- **Yardımcı antrenör tavsiyesi:** mevcut kadroya en uygun taktik önerisi (yardımcının Taktik Bilgisi'ne göre kalite)
- **Taktik akıcılığı:** takım taktiği ne kadar çalıştıysa o kadar iyi uygular (0–100, antrenmanla artar)

**Kabul kriterleri:**
- [ ] Tüm talimatlar kaydediliyor ve maç motoruna doğru aktarılıyor (Faz 22'de doğrulanacak)
- [ ] Duran top otomatik önerisi en yüksek nitelikli oyuncuyu seçiyor
- [ ] 3 taktik slotu bağımsız çalışıyor
- [ ] Yardımcı tavsiyesi kadro değişince güncelleniyor
- [ ] Taktik akıcılığı antrenmanla artıyor
- [ ] Mobilde tüm talimatlar erişilebilir

**Bağımlılık:** Faz 20

---
---

# BLOK E — MAÇ MOTORU VE SUNUM
### Faz 22 – 29 | Hedef: Maçın simüle edilmesi ve **estetik** şekilde sunulması

> **Alarm 4 notu:** Motor gerçekçiliği öncelik listesinde ilk 4'te değil, ama **sunum kalitesi özellikle istendi**. Bu yüzden Faz 22–26 "yeterince gerçekçi ve tamamen deterministik", Faz 27–29 "yüksek görsel/işitsel kalite" hedefler.

---

## FAZ 22 — Motor Çekirdeği: Tik Döngüsü ve Durum Makinesi

**Hedef:** Maçın iskeleti — deterministik, test edilebilir, hata ayıklanabilir.

**Kapsam:**
- `packages/engine` — saf fonksiyonel, yan etkisiz, hiçbir I/O yok
- **Tik döngüsü:** 5 saniyelik adımlar, 90 dk = 1080 tik + uzatma
- **Maç durumu:** skor, dakika, top sahibi, top konumu (x,y), 22 oyuncu konumu, kondisyon, kart, sakatlık, momentum
- **Durum makinesi:** `KickOff → OpenPlay → SetPiece → Goal → Injury → Substitution → HalfTime → FullTime`
- **Faz modeli:** her tikte oyun bir "faz"dadır (Kuruluş / İlerleme / Son Üçte Bir / Hücum / Savunma / Geçiş)
- **Deterministik RNG:** `MatchRng` sınıfı — tohum bazlı, her çağrı `purpose` etiketiyle loglanır
- **Olay akışı (event stream):** her önemli an bir `MatchEvent` üretir — bu akış hem 2D oynatıcının hem anlatımın hem istatistiğin **tek kaynağı**
- **Takım gücü hesabı:** rol uygunluk × nitelik × form × moral × kondisyon × taktik akıcılığı × ev sahibi avantajı
- **Momentum sistemi:** son 10 dakikanın olaylarına göre 0–100, hücum olasılığını etkiler
- **Motor hata ayıklama modu:** her tikin girdi/çıktı/karar gerekçesi JSON olarak dışa aktarılır

**Kabul kriterleri:**
- [ ] Aynı tohum → 1.000 çalıştırmada birebir aynı olay akışı
- [ ] Tek maç < 250 ms
- [ ] Olay akışı şeması Zod ile doğrulanıyor
- [ ] Hata ayıklama modu tam tik dökümü üretiyor
- [ ] Motor hiçbir dış bağımlılık kullanmıyor (I/O testi ile kanıtlanır)
- [ ] 10.000 maç simülasyonunda çökme yok

**Bağımlılık:** Faz 21

---

## FAZ 23 — Aksiyon Çözümleme: Pas, Dripling, Mücadele, Müdahale

**Hedef:** Topun sahada nasıl dolaştığı.

**Kapsam:**
- **Pas çözümlemesi:** başarı = f(Passing, Technique, Vision, Decisions, baskı, mesafe, açı, alıcının First Touch, rakip Positioning) → başarılı / kesilen / auta giden
- Pas türleri: kısa, orta, uzun, ilerletici, ara pas, kanat değiştirme, geri pas, ortalanan top
- **Dripling:** başarı = f(Dribbling, Agility, Balance, Pace, Flair, rakip Tackling/Positioning/Pace)
- **İkili mücadele:** kazanan = f(Strength, Balance, Aggression, Bravery, Determination)
- **Hava topu:** f(Heading, Jumping Reach, Strength, Positioning, top yüksekliği)
- **Müdahale:** temiz kapma / faul / kart = f(Tackling, Aggression, Dirtiness, hakem toleransı, konum)
- **Top kapma & baskı:** takım baskı ayarına göre top kaybettirme olasılığı
- **Mevki geometrisi:** oyuncular rollerine göre saha bölgelerinde konumlanır, top hareketiyle kayar
- **Kondisyon tüketimi:** her aksiyon Stamina/Work Rate'e göre kondisyon yakar
- **Denge kalibrasyonu:** 10.000 maç toplu testi → hedef değerler
  - Maç başı toplam gol: **2.5 – 2.9**
  - Ev sahibi galibiyet: **%43 – %48**
  - Beraberlik: **%23 – %28**
  - Maç başı pas: **800 – 1.000**
  - Pas isabeti: **%78 – %86**
  - Maç başı şut: **22 – 30**

**Kabul kriterleri:**
- [ ] 10.000 maç toplu testinde tüm denge hedefleri tutuyor
- [ ] Güçlü takım zayıf takımı istatistiksel olarak yeniyor (100 maç testi: en az %65 galibiyet)
- [ ] Aynı takım kendine karşı ~%50 kazanıyor (simetri testi)
- [ ] Hiçbir formül NaN/Infinity üretmiyor (fuzz testi)
- [ ] Her aksiyon kararı `debugTrace` ile gerekçeli

**Bağımlılık:** Faz 22
**Risk:** Denge kalibrasyonu uzun sürebilir → bölünebilir (23a formüller / 23b kalibrasyon).

---

## FAZ 24 — Şut, xG, Kaleci Modeli ve Gol Çözümlemesi

**Hedef:** Golün nasıl olduğunu belirleyen kısım.

**Kapsam:**
- **Şut kararı:** oyuncunun konumu, açısı, baskı, Decisions, Flair, takım/bireysel talimat
- **xG modeli:** mesafe, açı, vücut bölgesi (ayak/kafa), baskı seviyesi, top hızı, asist türü (ara pas/orta/geri pas/duran top), kaleci konumu
- **Şut sonucu:** gol / kurtarış / direk / auta / blok — xG + Finishing + Composure + Technique + Long Shots
- **Kaleci modeli (S73 + Boşluk-13):** 11 nitelik
  - `Reflexes` → yakın mesafe kurtarış
  - `Handling` → topu tutma vs. sektirme (ikinci şans golü)
  - `One on Ones` → tekebir pozisyon
  - `Aerial Reach` + `Command of Area` → orta çıkışı
  - `Positioning` → açı kapatma, xG düşürme
  - `Rushing Out` → süpürücü davranış
  - `Kicking` + `Throwing` → dağıtım kalitesi
  - `Communication` → savunma organizasyonu (savunma niteliklerine küçük bonus)
  - `Penalty Saving` (gizli) → penaltı kurtarma
- **Rebound (ikinci şans):** Handling düşükse top sekiyor → yeni pozisyon
- **Gol türü sınıflandırma** (2D animasyon için kritik — Faz 28'in girdisi):
  `openPlayFinish`, `longRange`, `header`, `volley`, `tapIn`, `soloRun`, `counterAttack`, `penalty`, `directFreeKick`, `cornerHeader`, `cornerScramble`, `ownGoal`, `deflection`, `rebound`, `chip`, `curler`, `bicycle`
- **Asist takibi:** kim, hangi tür pasla

**Kabul kriterleri:**
- [ ] xG dağılımı gerçekçi (ortalama şut xG: 0.09–0.13)
- [ ] Toplam xG ile atılan gol sayısı korele (10.000 maç, r > 0.85)
- [ ] Kaleci nitelikleri kurtarış oranını ölçülebilir şekilde etkiliyor (A/B testi)
- [ ] 17 gol türünün tamamı simülasyonda üretiliyor
- [ ] Kafa golü oranı %13–18 aralığında
- [ ] Penaltı gol oranı %74–80

**Bağımlılık:** Faz 23

---

## FAZ 25 — Duran Top Motoru

**Hedef:** Golün ~%30'unu üreten kısım. (Boşluk-13'ün tam karşılığı.)

**Kapsam:**
- **Penaltı:** atıcı `Penalty Taking` + `Composure` + `Technique` vs. kaleci `Penalty Saving` + `Reflexes` + `One on Ones`. Köşe seçimi, kalecinin tahmini, baskı faktörü (skor durumu, dakika)
- **Direkt frikik:** mesafe, açı, `Free Kick Taking`, `Technique`, `Curve`, baraj konumu, kaleci pozisyonu → gol/kurtarış/baraj/aut
- **Dolaylı frikik & orta:** `Crossing`, `Free Kick Taking` → hedef oyuncu seçimi → hava topu çözümlemesi
- **Korner:** kullanan `Corners` + `Crossing`, ceza sahası düzeni (kullanıcının Faz 21 ayarları), savunma dizilişi (adam adama/bölge), `Jumping Reach` + `Heading` + `Bravery` mücadelesi → kafa golü / karambol / kurtarış / uzaklaştırma
- **Uzun taç:** `Long Throws` niteliği yüksekse ayrı rutin
- **Savunma tarafı:** duran topta savunma organizasyonu, kaleci `Command of Area`
- **Duran top verimliliği takibi:** takımın korner→gol dönüşüm oranı, istatistik ekranında gösterilir
- **Denge hedefi:** toplam gollerin **%26–34'ü** duran toptan (penaltı dahil)

**Kabul kriterleri:**
- [ ] Duran top gol oranı %26–34 aralığında (10.000 maç)
- [ ] Penaltıcı `Penalty Taking` 18 olan takım, 8 olan takımdan ölçülebilir şekilde daha başarılı
- [ ] Korner düzeni ayarı sonucu değiştiriyor (A/B testi)
- [ ] Yüksek `Jumping Reach` takım korner golü oranı yüksek
- [ ] Tüm duran top olayları olay akışına doğru yazılıyor

**Bağımlılık:** Faz 24

---

## FAZ 26 — Bağlam Katmanı: Hakem, VAR, Hava, Zemin, Kart, Sakatlık

**Hedef:** Maçı çevreleyen gerçekçilik katmanı. (Boşluk-12 ve Boşluk-14'ün karşılığı.)

**Kapsam:**
- **Hakem sistemi:** her hakemin nitelikleri — `Strictness` (kart eğilimi), `Foul Tolerance`, `Home Bias`, `Consistency`, `Advantage Play`, `Big Game Experience`. Maç öncesi hakem atanır ve kullanıcıya gösterilir (geçmiş kart ortalamasıyla)
- **VAR:** ligin VAR kullanımına göre. İnceleme türleri: gol öncesi ofsayt, penaltı kararı, kırmızı kart, kimlik hatası. İnceleme süresi maça eklenir. Kararın değişme olasılığı hakem `Consistency`'sine bağlı. **Görsel VAR anı** 2D oynatıcıda gösterilir.
- **Kart sistemi (Boşluk-12):** sarı → ikinci sarı → kırmızı. Doğrudan kırmızı (ciddi faul, son adam, şiddet). Kart olasılığı = f(faul şiddeti, `Aggression`, `Dirtiness`, hakem `Strictness`, maç gerginliği, derbi katsayısı)
- **Birikimli ceza takibi:** lig (5/10/15 sarı → 1/2/3 maç), kupa ayrı sayaç, UEFA ayrı sayaç. Kırmızı kart cezaları türe göre 1–3 maç. Ceza takvimi otomatik işlenir, kadro seçiminde uyarı verilir.
- **Hava durumu:** güneşli / bulutlu / yağmurlu / şiddetli yağmur / karlı / sisli / rüzgârlı + sıcaklık. Etkileri: pas isabeti, top hızı, uzun top isabeti, kondisyon tüketimi, sakatlık riski, kaleci `Handling`
- **Saha zemini:** kulübün tesis kalitesi + hava durumu + o hafta oynanan maç sayısı → mükemmel/iyi/orta/kötü/berbat. Etkisi: pas, dripling, sakatlık riski
- **Ev sahibi avantajı:** taraftar sayısı × stadyum doluluk × derbi katsayısı × takım formu → hakem `Home Bias` etkisi + ev sahibi moral bonusu + deplasman moral cezası
- **Maç içi sakatlık:** olasılık = f(`Injury Proneness`, kondisyon, zemin, hava, faul şiddeti, yaş, antrenman yoğunluğu geçmişi). Türü ve süresi Faz 39'daki sakatlık tipolojisinden çekilir.
- **Kondisyon & yorgunluk:** maç içi düşüş eğrisi, `Stamina` + `Natural Fitness` etkisi, düşük kondisyonda nitelik cezası

**Kabul kriterleri:**
- [ ] Maç başı kart ortalaması 3.4–4.6 (lig ortalaması gerçekçi)
- [ ] Kırmızı kart oranı maç başına 0.05–0.12
- [ ] Ceza takibi doğru işliyor (5. sarıda otomatik ceza, kadro seçiminde uyarı)
- [ ] Yağmurlu maçta pas isabeti ölçülebilir şekilde düşük (A/B testi)
- [ ] Ev sahibi galibiyet oranı %43–48
- [ ] VAR incelemesi olay akışında görünüyor ve kararı değiştirebiliyor
- [ ] Sakatlık oranı maç başına 0.15–0.35

**Bağımlılık:** Faz 25

---

## FAZ 27 — 2D Oynatıcı I: Saha, Render, Kamera

**Hedef:** Alarm 4'te istenen **estetik** 2D sunumun temeli.

**Kapsam:**
- **PixiJS sahne kurulumu:** WebGL renderer, cihaz piksel oranı, yeniden boyutlandırma
- **Saha çizimi:** çim doku (şerit desenli, kulüp stadyum stiline göre), çizgiler, ceza sahaları, orta yuvarlak, köşe yayları, kale ağı
- **Oyuncu render:** kulüp forma renklerinde daire/kapsül + forma numarası + kaptan bandı; seçili oyuncu vurgusu; top sahibi göstergesi
- **Top render:** dönüş animasyonu, gölge, hız çizgisi (uzun pas/şut)
- **Hareket enterpolasyonu:** 5 saniyelik tikler arası **yumuşak geçiş** (eğri tabanlı, ani sıçrama yok) — bu, "estetik hareket" talebinin teknik karşılığı
- **Kamera sistemi:** tam saha / topu takip / geniş açı; yumuşak takip, ölü bölge (dead zone), gol anında yakınlaşma
- **Hız kontrolü:** 1× / 2× / 4× / Atla; duraklat; geri sarma (son 30 sn)
- **Üst bilgi çubuğu (HUD):** skor, dakika, takım armaları, kart göstergeleri, oyuncu değişikliği rozeti
- **Alt panel:** canlı istatistik (top hakimiyeti, şut, isabetli şut, korner, faul, xG) — açılır/kapanır
- **Mobil düzen:** dikey modda basitleştirilmiş saha + genişletilmiş olay akışı; yatay modda tam görünüm; yatay mod önerisi bildirimi
- Performans: nesne havuzu (object pooling), gereksiz render engelleme

**Kabul kriterleri:**
- [ ] Masaüstünde 55+ fps, mobilde 30+ fps (90 dk boyunca stabil)
- [ ] Oyuncu hareketleri **akıcı**, ani sıçrama yok
- [ ] Kamera modları arası geçiş yumuşak
- [ ] 4× hızda görsel bozulma yok
- [ ] Mobilde dikey ve yatay modlar kullanılabilir
- [ ] 90 dk maç sonunda bellek sızıntısı yok (bellek profili ile kanıtlanır)

**Bağımlılık:** Faz 26, 6
**Risk:** Bölünebilir → 27a (saha + render) / 27b (kamera + HUD + mobil).

---

## FAZ 28 — 2D Oynatıcı II: Gol Animasyonları, Kutlamalar, SFX, Anlatım

**Hedef:** Alarm 4'ün özellikle vurguladığı kısım — **farklı gol animasyonları, estetik tasarım, ses efektleri**.

**Kapsam:**
- **17 gol türü için ayrı animasyon** (Faz 24'ün sınıflandırmasına birebir bağlı):
  - `longRange` → şut çizgisi + kavis + ağ dalgalanması + yavaş çekim
  - `header` → sıçrama animasyonu + kafa teması vurgusu
  - `volley` → havadan vuruş, top yörüngesi belirgin
  - `soloRun` → dripling izi (trail efekti) + geçilen savunmacılar vurgulu
  - `counterAttack` → hızlı kamera kaydırma + pas zinciri izi
  - `penalty` → penaltı noktası yakın plan + kaleci dalışı
  - `cornerScramble` → ceza sahası karmaşası, çoklu temas
  - `bicycle`, `chip`, `curler`, `deflection`, `ownGoal`, `rebound`, `tapIn`, `directFreeKick`, `cornerHeader`, `openPlayFinish` → her biri özgün
- **Gol anı sunumu:** ekran sarsıntısı (hafif), ışık patlaması, skor tabelası animasyonu, "GOL!" tipografisi (kulüp renklerinde), golcü kartı (portre + isim + dakika + sezon gol sayısı)
- **Kutlama animasyonları:** 8 varyant (koşma, kayma, takım kucaklaşması, taraftara koşma, sessiz kutlama — eski kulübüne attıysa, forma öpme, işaret parmağı, teknik direktöre koşma)
- **Diğer olay animasyonları:** direkten dönen top, kaleci süper kurtarış, kırmızı kart, sakatlık, oyuncu değişikliği, VAR incelemesi (ekran kenarı çerçevesi + "VAR İNCELEMESİ" bandı)
- **SFX katmanları (Howler.js):**
  - Taraftar uğultusu — yoğunluğu momentum + skor + pozisyon tehlikesine göre **dinamik** karışır
  - Gol tezahüratı (ev/deplasman farklı) + hayal kırıklığı sesi
  - Düdük (başlangıç, faul, ofsayt, devre, bitiş — farklı)
  - Top vuruş sesleri (pas/şut/kafa/direk — farklı)
  - Ağ sesi, direk sesi
  - Tempo davulu (Türk takımları için ayrı, atmosfere göre)
  - Ses ducking: gol anında uğultu kısılır, tezahürat öne çıkar
- **Türkçe anlatım motoru:** ~600 şablon, olay türü × bağlam (skor, dakika, önem) × varyasyon; değişken doldurma (Türkçe ek motoruyla); tekrar önleme (son 10 kullanılan şablon hatırlanır)
- **Olay akışı paneli:** kaydırılabilir, tıklanınca o ana geri sar

**Kabul kriterleri:**
- [ ] 17 gol türünün her biri **görsel olarak ayırt edilebilir**
- [ ] Aynı maçta aynı kutlama arka arkaya çıkmıyor
- [ ] Taraftar uğultusu momentum değişince duyulur şekilde değişiyor
- [ ] Anlatım 90 dakikada aynı cümleyi tekrar etmiyor
- [ ] Türkçe ekler doğru ("Galatasaray'ın golü", "Beşiktaş'ın atağı")
- [ ] Ses kapalıyken performans etkilenmiyor
- [ ] Mobilde ses otomatik oynatma kısıtı doğru yönetiliyor (ilk dokunuşta başlar)
- [ ] Animasyonlar 4× hızda atlanabiliyor

**Bağımlılık:** Faz 27
**Risk:** Kapsam büyük → 28a (gol animasyonları + kutlama) / 28b (SFX + anlatım) olarak bölünmesi muhtemel.

---

## FAZ 29 — Maç Günü Akışı ve Maç Sonrası Analiz

**Hedef:** Maçı çevreleyen tam deneyim.

**Kapsam:**
- **Maç günü akışı:**
  1. Maç öncesi brifing (rakip analizi, yardımcı raporu, hakem bilgisi, hava durumu, sakat/cezalı listesi)
  2. Kadro & taktik son kontrol (uyarılar: cezalı oyuncu, düşük kondisyon, yanlış mevki)
  3. Maç öncesi basın toplantısı (Faz 45'te tam gelir, burada iskelet)
  4. Soyunma odası konuşması (6 ton: sakin / tutkulu / öfkeli / cesaretlendirici / eleştirel / umursamaz)
  5. Maç (Faz 27–28)
  6. Devre arası: istatistik + soyunma odası konuşması + taktik değişikliği
  7. Maç içi yönetim: oyuncu değişikliği (3+1), taktik/diziliş değişimi, bireysel talimat, kenar çizgisi tepkisi (sakinleş / baskı yap / tezahürat / zaman geçir), **kısa oyuncu iletişimi** (S70 — sınırlı: "Daha çok koş", "Sakin ol", "Öne çık", "Geri çekil" — 4 seçenek, maç başına 3 kullanım)
  8. Maç sonu: soyunma odası tepkisi
  9. Maç sonrası basın
- **İzleme modları:** Anında Sonuç / Hızlı İzle (sadece önemli anlar) / Tam İzle
- **Maç sonrası analiz ekranı:**
  - Skor özeti + gol/kart zaman çizelgesi
  - Oyuncu reytingleri (1.0–10.0) + maçın adamı
  - İstatistik karşılaştırma tablosu (20+ metrik)
  - **Isı haritası** (takım ve oyuncu bazlı)
  - **Pas ağı** (oyuncular arası pas yoğunluğu grafiği)
  - **Şut haritası** (xG boyutlu daireler, gol/kaçan ayrımı)
  - **xG akış grafiği** (dakika bazlı birikimli xG)
  - Yardımcı antrenör analizi (metinsel: "Sağ kanadınız baskı altında kaldı")
- **Maç tekrar oynama:** S50 → C — ayarlardan açılabilir, açıkken kayıt "Liderlik Dışı" işaretlenir
- **Oyuncu reyting formülü:** mevkiye göre ağırlıklı olay puanlaması (kaleci: kurtarış/gol yeme; stoper: müdahale/hava topu/hata; forvet: gol/xG/şut)

**Kabul kriterleri:**
- [ ] 9 adımlı maç günü akışı baştan sona çalışıyor
- [ ] 3 izleme modu da doğru sonuç veriyor (aynı tohum → aynı skor)
- [ ] Isı haritası, pas ağı, şut haritası doğru veri gösteriyor
- [ ] Oyuncu reytingleri mantıklı (3 gol atan forvet 9+ alıyor, 2 hata yapan stoper 5- alıyor)
- [ ] Maç içi 3 değişiklik + 1 uzatma değişikliği doğru uygulanıyor
- [ ] Tekrar oynama açıkken kayıt işaretleniyor
- [ ] Devre arası taktik değişikliği ikinci yarıya yansıyor

**Bağımlılık:** Faz 28

---
---

# BLOK F — TRANSFER VE SÖZLEŞME
### Faz 30 – 35 | **ÖNCELİK #1** — En detaylı blok

---

## FAZ 30 — Piyasa Değeri Motoru ve Oyuncu İlgi Sistemi

**Hedef:** Transfer ekonomisinin temeli.

**Kapsam:**
- **Piyasa değeri formülü:** CA, PA, yaş eğrisi (16–23 prim, 24–28 zirve, 29+ düşüş), sözleşme kalan süresi (son yılda sert düşüş), form, moral, lig prestiji, mevki kıtlığı (kaleci vs. kanat), uyruk (çalışma izni etkisi), son 12 ay performansı, sakatlık geçmişi
- **Değer güncelleme:** her ay + her transfer sonrası + her sezon sonu
- ⚠️ **DEĞER MASTER'DA DEĞİL, `player_state`'TE** *(Faz 4'ten devreden not, SAPMA-031)*
  `spec/01` `marketValue`i **§3.2 save katmanına** (`player_state`) koyuyor ve bu doğru:
  formül kalan sözleşme ayı, form, sakatlık cezası ve enflasyon endeksiyle hesaplanıyor
  (`spec/02` §4.7) — dördü de kayıt başına değişiyor. Master'a bir `market_value` sütunu
  **konamaz**, konsaydı her tur bayatlardı. Faz 4'ün kabul kriteri bu yüzden daraltıldı
  (`değer<15M` yüklemi çıkarıldı); **değer üzerinden filtrelemenin ilk gerçek ölçümü
  Faz 32'de.**
- **Piyasa enflasyonu:** yıllık %4–8, lig gelirlerine bağlı — 20 sezon sonra ekonomi çökmesin
- **Talep edilen bonservis:** piyasa değeri × kulüp isteksizliği katsayısı (sözleşme süresi, oyuncunun takımdaki rolü, kulübün mali durumu, alıcının prestiji, rakip kulüp primi)
- **Oyuncu ilgi sistemi:** her AI kulüp, kadro ihtiyacına göre "ilgilenilen oyuncu" listesi tutar
- **İlgi seviyeleri:** İzliyor → İlgileniyor → Ciddi İlgi → Teklif Hazırlıyor → Teklif Verdi
- **Oyuncunun transfer isteği:** oyun süresi, moral, kulüp hırsı uyumu, maaş adaleti, rakip kulüp cazibesi, sözleşme kalan süresi → 0–100 "ayrılma isteği"
- **Serbest kalma bedeli (release clause) tetikleme:** bedeli ödeyen kulüp doğrudan oyuncuyla görüşme hakkı kazanır
- **Bosman:** sözleşmesinin son 6 ayındaki oyuncularla ön anlaşma

**Kabul kriterleri:**
- [ ] 20 tanınmış oyuncunun değeri gerçeğe **makul yakınlıkta** (elle doğrulanır)
- [ ] 20 sezon simülasyonunda enflasyon kontrollü (en pahalı oyuncu < 500M)
- [ ] Sözleşmesinin son yılındaki oyuncunun değeri belirgin düşüyor
- [ ] İlgi seviyeleri kademeli ilerliyor, atlama olmuyor
- [ ] Ayrılma isteği hesabı `debugTrace` ile gerekçeli
- [ ] Serbest kalma bedeli doğru tetikleniyor

**Bağımlılık:** Faz 29, 16

---

## FAZ 31 — Gözlemcilik ve Rapor Belirsizliği

**Hedef:** Bilgi asimetrisi — FM'in en önemli oyun mekaniği. (Boşluk-19'un tam karşılığı.)

**Kapsam:**
- **Gözlemci atama:** bölge (ülke/kıta), belirli oyuncu, belirli kulüp, rakip analizi, turnuva
- **Rapor derinleşmesi:** gözlemci oyuncuyu ne kadar izlerse rapor o kadar netleşir
  - 0 maç: sadece temel bilgi + geniş aralık
  - 1–2 maç: aralık daralır
  - 3–5 maç: nitelikler ±2 hassasiyet
  - 6+ maç: kesin değerler + potansiyel tahmini
- **Belirsizlik hesabı (Boşluk-19):** `netlik = f(gözlemci Judging Ability + gözlemci Judging Potential + gözlemci Adaptability, menajerin Gözlem Değerlendirme niteliği, izlenen maç sayısı, oyuncunun görünürlüğü)`
- **Gösterim:** yüksek netlik → "Bitiricilik: 15"; düşük netlik → "Bitiricilik: 12–18"; çok düşük → "Bitiricilik: ?"
- **Potansiyel gösterimi:** yıldız (kesin) / yıldız aralığı (belirsiz) / metinsel ("İyi bir yetenek olabilir") / "Belirsiz"
- **Gözlemci hata payı:** düşük kaliteli gözlemci **yanlış** rapor verebilir (PA'yı yüksek gösterme) — gerçek risk unsuru
- **Antrenör raporu:** kendi oyuncularınız için antrenör kalitesine göre netlik (kendi oyuncularınızı daha net görürsünüz)
- **Gözlemci raporu ekranı:** özet, güçlü/zayıf yönler, en iyi mevki/rol önerisi, tahmini bonservis, tavsiye ("Kesinlikle alın" → "Önermiyorum")
- **Rakip analizi raporu:** rakibin muhtemel dizilişi, tehlikeli oyuncuları, zayıf noktaları, son 5 maç formu — maç öncesi brifingde kullanılır
- **Gözlem ağı:** kulübün gözlem ağı seviyesi hangi bölgelerin görülebileceğini belirler

**Kabul kriterleri:**
- [ ] Düşük kaliteli gözlemci geniş aralık, yüksek kaliteli dar aralık veriyor
- [ ] İzlenen maç sayısı arttıkça aralık daralıyor
- [ ] Düşük kaliteli gözlemci bazen yanlış PA tahmini yapıyor (test edilebilir oranda)
- [ ] Menajerin Gözlem Değerlendirme niteliği değişince tüm raporlar güncelleniyor
- [ ] Rakip analizi raporu maç öncesi brifingde görünüyor
- [ ] Gözlem ağı seviyesi bölge erişimini kısıtlıyor

**Bağımlılık:** Faz 30, 14

---

## FAZ 32 — Transfer Arama, Filtre ve Shortlist

**Hedef:** Doğru oyuncuyu bulabilmek.

**Kapsam:**
- **Arama ekranı:** DataTable tabanlı, 60+ sütun
- **Filtreler:** mevki (çoklu), yaş aralığı, değer aralığı, maaş aralığı, sözleşme bitişi, uyruk, ikinci uyruk, ayak, boy, lig, kulüp, transfer durumu, çalışma izni uygunluğu, nitelik minimumları (her nitelik için), CA/PA aralığı, kişilik, sakatlık geçmişi, rol uygunluk yıldızı
- **Kayıtlı arama şablonları:** isimlendirilebilir, yeniden çalıştırılabilir, "yeni sonuç var" bildirimi
- **Shortlist (aday listesi):** oyuncu ekleme, not yazma, öncelik sıralama, durum takibi (gözlemleniyor/teklif verildi/reddedildi)
- **Öneri motoru:** kadro zayıflık analizi → mevki bazlı öneri ("Sol bekinizde derinlik yok, şu 5 oyuncuya bakın")
- **Bütçe filtresi:** "bütçeme uyanları göster" tek tıkla
- **Benzer oyuncu bulma:** seçili oyuncuya nitelik profili benzeyen alternatifler (kosinüs benzerliği)
- **Karşılaştırma:** shortlist'ten 4 oyuncuya kadar yan yana + radar grafiği
- **Çalışma izni uyarısı (Boşluk-6):** İngiltere için GBE puanı hesaplanır ve gösterilir ("Bu oyuncu 12 GBE puanı alıyor, 15 gerekli — çalışma izni alamaz")
- **Kota uyarısı (Boşluk-7):** Türkiye için "Kadronuzda 14 yabancı var, bu transfer kotayı aşar"

**Kabul kriterleri:**
- [ ] 50.000 oyuncuda tüm filtreler < 300 ms
- [ ] **Faz 4'ün kriterinin tam hâli ölçüldü: "20–24 yaş, sağ bek, CA>120, **değer<15M**"** — `değer` yüklemi Faz 4'te ölçülemiyordu (`marketValue` save katmanında ve türev, SAPMA-031); bileşik indeksin gerçek transfer aramasını taşıdığı **burada** kanıtlanır
- [ ] Kayıtlı arama şablonu doğru çalışıyor ve bildirim veriyor
- [ ] Öneri motoru gerçekten zayıf mevkiyi tespit ediyor
- [ ] Benzer oyuncu bulma mantıklı sonuç veriyor
- [ ] GBE puanı doğru hesaplanıyor (10 test vakası)
- [ ] Türk kotası uyarısı doğru tetikleniyor
- [ ] Mobilde filtre paneli kullanılabilir

**Bağımlılık:** Faz 31, 18

---

## FAZ 33 — Transfer Pazarlığı ve Ödeme Yapıları

**Hedef:** Kulüpler arası pazarlık. Öncelik #1'in kalbi.

**Kapsam:**
- **Teklif türleri (S116):**
  - Bonservis bedelli kalıcı
  - Bedelsiz (serbest oyuncu)
  - Kiralık (düz)
  - Satın alma opsiyonlu kiralık
  - Zorunlu satın alma opsiyonlu kiralık
  - Takas (oyuncu + para, çok yönlü)
  - Ön anlaşma (Bosman)
  - Serbest kalma bedeli ödeme
- **Ödeme yapıları (S117):** peşin, taksitli (12/24/36 ay), maç başına bonus, gol başına bonus, asist başına bonus, milli takım seçilme bonusu, turnuva katılım bonusu, kupa kazanma bonusu, **sonraki satıştan pay (%)** (Boşluk-17), karşılıklı sell-on
- **Kiralık şartları (Boşluk-16):** süre (yarı/tam sezon), maaş paylaşımı (%0–100), oynama garantisi (yok/rotasyon/ilk 11), geri çağırma opsiyonu, ana kulübe karşı oynayamama maddesi, opsiyon bedeli
- **Çok turlu pazarlık:**
  - Teklif → karşı taraf değerlendirir → Kabul / Ret (gerekçeli) / Karşı Teklif
  - Karşı teklifte hangi maddede sorun olduğu belirtilir
  - Pazarlık 5 tura kadar sürebilir
  - Kulübün esnekliği = f(mali durum, oyuncunun kadrodaki rolü, sözleşme süresi, oyuncunun ayrılma isteği, alıcının prestiji, rakip teklifler, transfer penceresi kalan gün)
- **Rekabet:** aynı oyuncu için birden fazla kulüp teklif verebilir → açık artırma dinamiği, oyuncu tercihi devreye girer
- **Transfer yasağı / bütçe kontrolü:** yetki (tam/sınırlı/yok), bütçe aşımında yönetim onayı talebi
- **Agent komisyonu:** bonservisin %3–12'si, oyuncunun agent'ının zorluğuna bağlı
- **Transfer pencereleri:** kapalıyken teklif verilemez, ön anlaşma yapılabilir
- **Teklif takip ekranı:** giden teklifler, gelen teklifler, durum, geçmiş

**Kabul kriterleri:**
- [ ] 8 teklif türünün tamamı uçtan uca çalışıyor
- [ ] Tüm ödeme yapıları sözleşmeye doğru yazılıyor ve finansa yansıyor
- [ ] Sonraki satıştan pay, oyuncu tekrar satılınca doğru ödeniyor
- [ ] Çok turlu pazarlık 5 tur sürebiliyor, her turda gerekçe veriliyor
- [ ] İki kulüp aynı oyuncuya teklif verince rekabet mantığı çalışıyor
- [ ] Bütçe aşımı engellenıyor, yönetim onayı akışı çalışıyor
- [ ] Kapalı pencerede transfer engellenıyor
- [ ] Agent komisyonu bütçeden düşülüyor

**Bağımlılık:** Faz 32
**Risk:** Kapsam çok geniş → 33a (teklif türleri + ödeme) / 33b (pazarlık + rekabet) olarak bölünmesi muhtemel.

---

## FAZ 34 — Kişisel Şart Pazarlığı ve Sözleşme Maddeleri

**Hedef:** Oyuncuyla anlaşma. Kulüpler anlaşsa bile oyuncu istemeyebilir.

**Kapsam:**
- **Sözleşme maddeleri (S118):** haftalık maaş, süre (1–5 yıl), imza parası, sadakat bonusu, maç başı bonus, gol başı, asist başı, kalede gol yememe bonusu, takım başarı bonusu, milli takım bonusu, serbest kalma bedeli, **takım rolü garantisi** (Yıldız / İlk 11 / Önemli Rotasyon / Rotasyon / Yedek / Genç Oyuncu), minimum ücret maddesi, konut/araç yardımı
- **Oyuncu talep hesabı:** CA, PA, yaş, mevcut maaş, lig maaş ortalaması, kulüp prestiji, agent hırsı, oyuncunun `Ambition`/`Loyalty`/`Professionalism` nitelikleri
- **Pazarlık akışı:** teklif → oyuncu değerlendirir → kabul / ret / karşı talep (hangi maddede sorun var belirtilir)
- **Menajerin Pazarlık niteliği** doğrudan etkiler: yüksekse oyuncu daha az talep eder
- **Agent sistemi (basit, S121):** agent kişiliği (makul / sert / açgözlü), komisyon oranı, pazarlık zorluk katsayısı
- **Rol garantisi ihlali (Boşluk / S139):** sözleşmede "İlk 11" yazan oyuncu son 10 maçın 6'sında oynamadıysa şikâyet eder → moral düşer → transfer talebi
- **Sözleşme yenileme (S127):** oyuncu tetikler (son 18 ay / yüksek form / rakip ilgisi) veya kullanıcı başlatır
- **Maaş yapısı denetimi:** yeni sözleşme takım maaş dengesini bozarsa uyarı ("Bu maaş, kadronun en yüksek maaşının 2 katı — soyunma odasında huzursuzluk yaratabilir")
- **Uyum süreci (S128):** yabancı ligden gelen oyuncu — dil, kültür, iklim uyumu; süresince performans cezası, `Adaptability` niteliği etkiler

**Kabul kriterleri:**
- [ ] Tüm sözleşme maddeleri kaydediliyor ve etkileri işliyor
- [ ] Rol garantisi ihlali doğru tetikleniyor ve şikâyet üretiyor
- [ ] Menajerin Pazarlık niteliği ölçülebilir fark yaratıyor (A/B testi)
- [ ] Aşırı maaş soyunma odası huzursuzluğu yaratıyor
- [ ] Uyum süreci performansı geçici olarak düşürüyor
- [ ] Sözleşme yenileme her iki yönden de başlatılabiliyor
- [ ] Bonuslar maç sonrası doğru ödeniyor

**Bağımlılık:** Faz 33

---

## FAZ 35 — Kadro Kayıt Kuralları ve Uygunluk Denetimi

**Hedef:** Boşluk-6 ve Boşluk-7'nin tam uygulaması. Gerçekçiliğin en görünür kısımlarından biri.

**Kapsam:**
- **İngiltere — Brexit / GBE (Governing Body Endorsement):**
  - Puan tablosu: milli takım maçları (uyruk sıralamasına göre), kulüp maçları oynama yüzdesi, kulübün kıta turnuvası katılımı, kulübün lig sıralaması, ligin bandı (1–6)
  - 15 puan → otomatik onay; 10–14 puan → istisna komitesi; <10 → ret
  - Transfer arama ekranında **canlı GBE puanı** gösterimi
  - U21 oyuncular için ayrı kural
- **İngiltere — Homegrown:** 25 kişilik kadroda en az 8 homegrown; U21 oyuncular kadro dışı sayılır
- **Türkiye — Yabancı kotası:** kadroda yabancı oyuncu sınırı, maç kadrosunda yabancı sınırı; ihlal → oyuncu kadroya yazılamaz
- **İtalya:** kadro listesi kuralı, yerli/altyapı oyuncu zorunluluğu
- **İspanya:** LaLiga maaş tavanı (kulüp gelirine bağlı), AB dışı oyuncu kotası
- **Almanya / Fransa:** altyapı oyuncu zorunluluğu, kadro listesi
- **UEFA:** A listesi (25 kişi) + B listesi (altyapı), homegrown kuralı (8 kişi: 4 kulüp yetiştirmesi + 4 federasyon yetiştirmesi), liste kilitlenme tarihleri
- **Kadro kayıt ekranı:** sürükle-bırak A/B listesi, canlı uygunluk göstergesi, ihlal uyarıları, "otomatik doldur" önerisi
- **Uygunluk denetimi:** kadro seçiminde uygun olmayan oyuncu **seçilemez**, sebebi gösterilir
- **Transfer öncesi uyarı:** "Bu transfer kotanızı aşar, önce bir yabancı göndermelisiniz"

**Kabul kriterleri:**
- [ ] GBE puanı 10 gerçek senaryo için doğru hesaplanıyor
- [ ] Homegrown kuralı ihlal edilince kadro kaydı engelleniyor
- [ ] Türk kotası maç kadrosunda doğru uygulanıyor
- [ ] UEFA A/B listesi doğru yönetiliyor, kilitlenme tarihi işliyor
- [ ] Uygun olmayan oyuncu kadroya seçilemiyor ve sebep net
- [ ] AI kulüpler de bu kurallara uyuyor (kural ihlali yapan AI kulüp yok)

**Bağımlılık:** Faz 34

---
---

# BLOK G — KULÜP VE DÜNYA SİSTEMLERİ
### Faz 36 – 41

---

## FAZ 36 — Finans, Bütçe, FFP ve Tesis Yatırımı

**Hedef:** Ekonominin sürdürülebilirliği. (Boşluk-18'in temeli.)

**Kapsam:**
- **Gelirler:** maç günü (bilet × doluluk × bilet fiyatı × maç sayısı), TV/yayın (lig sıralaması + lig havuzu), sponsorluk (prestij bazlı, sözleşme yenilenir), ürün satışı (taraftar sayısı + başarı), turnuva ödülleri (UEFA + yerel kupa), transfer geliri, ödünç gelirler
- **Giderler:** oyuncu maaşları, personel maaşları, stadyum işletme, tesis bakımı, transfer harcaması, agent komisyonu, altyapı gideri, kredi ödemesi
- **Bütçe sistemi:** transfer bütçesi + maaş bütçesi; aralarında yönetim onaylı aktarım (S153)
- **Aylık mali rapor:** gelir/gider dökümü, nakit akışı grafiği, projeksiyon
- **FFP / mali kontrol:** 3 yıllık zarar limiti, maaş/gelir oranı limiti (%70), ihlal → transfer kısıtı, kadro daraltma, ceza
- **İflas riski (S156):** nakit tükenirse → yönetim müdahalesi → oyuncu satma zorunluluğu → puan silme → küme düşme
- **Tesis yatırımı (S154):** antrenman tesisi, altyapı tesisi, gençlik gözlem ağı, tıbbi merkez — yönetime talep, maliyet, inşaat süresi (3–18 ay), tamamlanınca etki devreye girer
- **Stadyum genişletme:** kapasite artışı, maliyet, süre (12–36 ay), gelir etkisi
- **Yönetime talep ekranı:** bütçe artışı, tesis yatırımı, oyuncu satma izni — kabul olasılığı = f(kulüp mali durumu, menajer itibarı, yönetim güveni, mevcut performans)

**Kabul kriterleri:**
- [ ] 5 sezon simülasyonunda hiçbir kulüp mantıksız zenginleşmiyor/fakirleşmiyor
- [ ] FFP ihlali doğru tespit ediliyor ve ceza uygulanıyor
- [ ] Tesis yatırımı tamamlanınca gelişim/sakatlık/gözlem etkisi ölçülebilir şekilde değişiyor
- [ ] İflas senaryosu doğru işliyor (test kaydıyla)
- [ ] Aylık mali rapor doğru toplamlar veriyor
- [ ] Yönetim talep değerlendirmesi `debugTrace` ile gerekçeli

**Bağımlılık:** Faz 35

---

## FAZ 37 — Personel Sistemi

**Hedef:** Teknik ekibin oyuna gerçek etkisi.

**Kapsam:**
- **Roller (S162):** Yardımcı Antrenör, Hücum Antrenörü, Savunma Antrenörü, Kondisyon Antrenörü, Kaleci Antrenörü, Teknik Antrenör, Fizyoterapist, Sağlık Ekibi, Gözlemci, Veri Analisti, Altyapı Sorumlusu, Altyapı Antrenörü
- **Personel nitelikleri (1–20):** Antrenman Kalitesi (kategori bazlı), Motivasyon, Taktik Bilgisi, Oyuncu Değerlendirme (Judging Ability), Potansiyel Değerlendirme (Judging Potential), Disiplin, Fizyoterapi, Sportif Bilim, Gözlem Ağı, Uyum
- **Etkiler (S164):** oyuncu gelişim hızı, sakatlık önleme ve iyileşme süresi, gözlemci rapor doğruluğu, yardımcı tavsiye kalitesi, altyapı oyuncu kalitesi, antrenman verimliliği
- **Personel piyasası (S165):** açık pozisyon ilanı, başvuru değerlendirme, sözleşme pazarlığı, rakip kulüpler personelinizi transfer edebilir
- **Personel kadro limiti:** kulüp bütçesi ve tesis seviyesine göre maksimum personel sayısı
- **Yardımcı antrenör tavsiyeleri:** kadro seçimi, taktik, antrenman, oyuncu gelişimi — kalitesi yardımcının niteliklerine bağlı, düşük kaliteli yardımcı **yanlış** tavsiye verebilir
- **Personel raporları:** her personel kendi uzmanlık alanında rapor üretir
- **Personel ekranı:** roller şeması, nitelik karşılaştırma, boş pozisyon vurgusu, etki özeti ("Antrenman kaliteniz: 14/20 — lig ortalamasının üstünde")

**Kabul kriterleri:**
- [ ] 12 rol de atanabiliyor ve etkisi ölçülebiliyor
- [ ] Kaliteli antrenör ile gelişim hızı belirgin artıyor (A/B testi, 3 sezon)
- [ ] Kaliteli fizyoterapist ile sakatlık süresi kısalıyor
- [ ] Düşük kaliteli yardımcı yanlış tavsiye verebiliyor
- [ ] Personel transferi (giden/gelen) çalışıyor
- [ ] Personel maaşları bütçeye doğru yansıyor

**Bağımlılık:** Faz 36

---

## FAZ 38 — Antrenman ve Gelişim Motoru

**Hedef:** Oyuncuların uzun vadeli gelişimi.

**Kapsam:**
- **Haftalık program:** 7 gün × 3 blok (sabah/öğle/akşam), her blok bir antrenman kategorisi
- **Kategoriler:** Genel, Dayanıklılık, Kuvvet, Hız, Savunma (bölge/adam adama), Hücum (kanat/merkez), Pas Çalışması, Şut, Duran Top (hücum/savunma), Taktik, Maç Hazırlığı (rakip odaklı), Takım Uyumu, Toparlanma, İzin
- **Yoğunluk ayarı:** düşük / orta / yüksek — gelişim ↑ ama sakatlık riski ↑ ve kondisyon ↓
- **Maç takvimi uyumu:** yoğun fikstürde otomatik toparlanma önerisi
- **Bireysel antrenman:** nitelik grubu odağı (örn. "Bitiricilik") + rol odağı ("Sahte 9 olarak antrenman") + yoğunluk
- **Mentorluk (S111):** tecrübeli oyuncu → genç oyuncu grubu; kişilik ve gizli nitelik aktarımı (`Professionalism`, `Determination`, `Ambition`)
- **Gelişim motoru (S112):** aylık hesaplama
  ```
  gelişim = f(
    yaş eğrisi × (PA - CA) × antrenman kalitesi × antrenör kalitesi ×
    tesis seviyesi × oyun süresi × moral × Ambition × Professionalism ×
    Determination × sakatlık durumu × maç kalitesi × mentor etkisi
  )
  ```
- **Yaş eğrisi:** 16–19 çok hızlı, 20–23 hızlı, 24–27 yavaş, 28–30 minimal, 31+ **gerileme** (fiziksel önce, zihinsel en son)
- **Antrenman performansı:** her oyuncunun haftalık antrenman notu (yardımcı raporu)
- **Antrenman sakatlığı (S113):** yoğunluk ve `Injury Proneness` bazlı
- **Gelişim bildirimi:** nitelik artışı/düşüşü inbox'ta ("Arda Güler'in Bitiricilik'i 14→15 yükseldi")

**Kabul kriterleri:**
- [ ] 5 sezonluk simülasyonda 18 yaşındaki yüksek PA'lı oyuncu belirgin gelişiyor
- [ ] 33 yaşındaki oyuncunun fiziksel nitelikleri geriliyor, zihinsel korunuyor
- [ ] Kötü tesis + kötü antrenör kombinasyonunda gelişim ölçülebilir şekilde yavaş
- [ ] Mentorluk kişilik değişimi üretiyor (3 sezon testi)
- [ ] Yüksek yoğunluk antrenman sakatlık oranını artırıyor
- [ ] Antrenman programı kaydediliyor ve haftalık uygulanıyor

**Bağımlılık:** Faz 37

---

## FAZ 39 — Sağlık Merkezi ve Sakatlık Sistemi

**Hedef:** Sakatlığın oyun boyunca gerçek bir tehdit olması.

**Kapsam:**
- **Sakatlık tipolojisi (~40 tür):** kas zorlanması (1–2 hf), hamstring (2–6 hf), adale yırtığı (4–8 hf), bilek burkulması (2–5 hf), diz bağı (8–16 hf), ön çapraz bağ (24–40 hf), menisküs (12–20 hf), kırık (6–20 hf, kemiğe göre), sarsıntı (1–3 hf), sırt (1–8 hf), aşil (16–36 hf), kasık (2–8 hf), omuz çıkığı (4–10 hf), hastalık (3 gün–2 hf), tükenme (1–3 hf) vb. — her biri: ad, süre aralığı, tekrarlama riski, kariyer etkisi
- **Sakatlık ekranı (S159):**
  - Aktif sakatlıklar: tür, oluştuğu maç/antrenman, tarih, tahmini dönüş, gerçek dönüş
  - Sakatlık riski göstergesi: her oyuncu için (kondisyon + `Injury Proneness` + antrenman yoğunluğu + yaş + zemin + son sakatlık)
  - Maça çıkabilirlik: Hazır / Riskli / Uygun Değil
  - Fizyoterapist raporu ve tavsiyesi
  - Sakatlık geçmişi ve tekrarlama riski
  - Takım geneli sakatlık istatistiği ve sezon trendi (lig ortalamasıyla karşılaştırma)
- **İyileşme süreci:** fizyoterapist kalitesi + tıbbi tesis + oyuncu `Natural Fitness` → süre kısalır/uzar
- **Riskli oynatma (S160):** sakat/riskli oyuncu oynatılabilir ama tekrar sakatlanma olasılığı çok yüksek, net uyarı verilir
- **Kariyer etkisi (S161):** uzun süreli/tekrarlayan sakatlık → PA düşüşü, `Pace`/`Acceleration`/`Stamina` kalıcı kaybı, "Kırılgan" etiketi
- **Sakatlık dönemi diyaloğu:** moral desteği, dönüş planı konuşması
- **Sakatlık haberi:** inbox + haber akışı, ciddiyete göre önem

**Kabul kriterleri:**
- [ ] 40 sakatlık türünün tamamı tetiklenebiliyor
- [ ] Sezonluk sakatlık sayısı gerçekçi (takım başına 18–35 sakatlık/sezon)
- [ ] İyi fizyoterapist iyileşme süresini ölçülebilir şekilde kısaltıyor
- [ ] Riskli oynatma tekrar sakatlanma oranını belirgin artırıyor
- [ ] ÖÇB gibi ciddi sakatlık sonrası PA düşüşü uygulanıyor
- [ ] Sakatlık riski göstergesi antrenman yoğunluğuyla değişiyor

**Bağımlılık:** Faz 38

---

## FAZ 40 — Altyapı, Genç Takım, Newgen ve Emeklilik

**Hedef:** Oyunun sonsuz oynanabilirliği. (Boşluk-15'in tam karşılığı.)

**Kapsam:**
- **Altyapı akademisi (S114):** yılda bir kez (Mart), 6–14 oyuncu üretilir
- **Intake kalitesi:** altyapı tesisi seviyesi + gençlik gözlem ağı + altyapı sorumlusu niteliği + ülke futbol seviyesi + kulüp prestiji + rastgelelik
- **Intake raporu:** altyapı sorumlusunun değerlendirmesi, en umut vaat eden oyuncular, potansiyel tahmini (belirsizlik aralığıyla)
- **Genç takım / rezerv takım (S115):** kadro görüntüleme, oyuncu hareketi (A takım ↔ genç takım), yardımcıya devretme, genç takım ligi/turnuvası sonuçları
- **Newgen üreteci (S174–S176):**
  - **İsim üretimi:** 20+ uyruk için ad/soyad havuzu (her biri 500+), kültürel doğru kombinasyon (İspanyol çift soyadı, Brezilyalı takma ad, Türk adları, Arap isim yapısı)
  - **PA dağılımı:** ağırlıklı (log-normal benzeri) — çoğu 90–130, nadiren 150+, çok nadiren 170+; ülke futbol seviyesi ve kulüp tesisi eğriyi kaydırır
  - **Nitelik üretimi:** PA bütçesi mevkiye göre dağıtılır + rastgele varyasyon
  - **Kişilik, gizli nitelik, özel yetenek üretimi**
  - **Prosedürel portre:** uyruğa göre görsel özellikler
  - **Fiziksel özellikler:** mevkiye ve uyruğa göre boy/kilo dağılımı
- **Emeklilik (S177):** 32+ yaş, CA düşüşü, sakatlık geçmişi, kulüpsüzlük, `Ambition` → emeklilik kararı
  - Sonrası: antrenör olur (Coaching potansiyeli varsa) / teknik direktör olur / futboldan kopar
  - **Efsane oyuncu vedası (S178):** itibara göre haber önemi, veda maçı olayı, kulüp müzesine ekleme
- **Dünya nüfus dengesi:** her sezon emekli olan ≈ üretilen (nüfus sabit kalır, ±%5)

**Kabul kriterleri:**
- [ ] 20 sezon simülasyonunda oyuncu nüfusu ±%10 içinde sabit
- [ ] Newgen isimleri uyruklarına kültürel olarak uygun (elle doğrulama, 100 örnek)
- [ ] PA dağılımı hedeflenen eğriye uyuyor (histogram)
- [ ] 20 sezonda en az 5 "harika yetenek" (PA 175+) üretiliyor
- [ ] Emeklilik yaş dağılımı gerçekçi (ortalama 34–36)
- [ ] Newgen portreleri gerçek oyuncu portreleriyle **görsel olarak uyumlu**
- [ ] Altyapı tesisi yükseltilince intake kalitesi ölçülebilir şekilde artıyor

**Bağımlılık:** Faz 39
**Risk:** Bölünebilir → 40a (akademi + genç takım) / 40b (newgen + emeklilik).

---

## FAZ 41 — Rekabet Yapısı: UEFA, Kupalar, Milli Takımlar

**Hedef:** Boşluk-8 ve Boşluk-9'un tam uygulaması.

**Kapsam:**
- **UEFA Şampiyonlar Ligi:** eleme turları (ön eleme, 1./2./3. tur, play-off), lig aşaması (36 takım, İsviçre sistemi), play-off turu, son 16, çeyrek, yarı, final; torba sistemi, kura çekimi, ödül dağılımı
- **UEFA Avrupa Ligi & Konferans Ligi:** aynı yapı, kendi formatları, ŞL'den düşme mekanizması
- **UEFA Süper Kupa**
- **Yerel kupalar:** FA Cup (tekrar maçları dahil), EFL Cup, Copa del Rey, DFB-Pokal, Coppa Italia, Coupe de France, Türkiye Kupası (grup aşamalı) — her birinin gerçek formatı
- **Süper Kupalar:** 6 ülke
- **UEFA ülke katsayısı:** her sezon güncellenir, kota dağılımını belirler
- **Kupa kurası:** torba mantığı, aynı ülke kısıtı, kura çekim ekranı (animasyonlu)
- **Milli takımlar (S88 / Boşluk-9):**
  - Milli aralar takvimde yer alır (Eylül, Ekim, Kasım, Mart, Haziran)
  - Oyuncu davetleri: milli takım teknik direktörü (AI) kadro seçer
  - Etkileri: yorgunluk artışı, sakatlık riski, moral (davet edilmek moral ↑, edilmemek ↓)
  - Milli maçlar simüle edilir, sonuçlar dünya haberlerine yansır
  - Büyük turnuvalar (Dünya Kupası, EURO, Kupa Amerika, Afrika Kupası) — sezon arası, oyuncular yorgun döner
  - Kullanıcı milli takım **yönetemez** (v2)
- **Dünya ekranı:** tüm ligler puan durumu, global sıralamalar, en değerli oyuncular, en formda oyuncular, en iyi teknik direktörler, transfer rekorları
- **Turnuva ekranları:** grup/eleme ağacı görselleştirmesi, fikstür, istatistik

**Kabul kriterleri:**
- [ ] Tam bir UEFA sezonu (eleme → final) hatasız simüle ediliyor
- [ ] Tüm yerel kupalar doğru formatta işliyor
- [ ] UEFA katsayısı doğru hesaplanıyor ve kota dağıtıyor
- [ ] Kura çekimi kurallara uyuyor (aynı ülke eşleşmesi engelleniyor)
- [ ] Milli ara sonrası oyuncular yorgun dönüyor
- [ ] Büyük turnuva sonrası sezon başında yorgunluk etkisi var
- [ ] Dünya ekranı tüm liglerin güncel verisini gösteriyor
- [ ] Ödül gelirleri kulüp finansına doğru yansıyor

**Bağımlılık:** Faz 40
**Risk:** Kapsam çok geniş → 41a (UEFA + yerel kupalar) / 41b (milli takımlar + dünya ekranı).

---
---

# BLOK H — YAPAY ZEKA VE ETKİLEŞİM
### Faz 42 – 45 | **ÖNCELİK #3**

---

## FAZ 42 — Yapay Zeka Menajer Karar Motoru

**Hedef:** Boşluk-18'in tam karşılığı. "Saçma olaylar ve hatalar olmayacak" talebinin teknik uygulaması.

**Kapsam:**
- **Mimari (S129 → A):** kural tabanlı + ağırlıklı skorlama. Deterministik, hata ayıklanabilir, hızlı, ücretsiz, öngörülebilir.
- **AI menajer kişiliği (S130):** taktik tercihi (hücumcu/dengeli/savunmacı), transfer iştahı, genç oyuncu güveni, sadakat, rotasyon eğilimi, deneyim seviyesi
- **Kadro seçim algoritması:**
  ```
  oyuncu_skoru = rol_uygunluk × 0.35 + form × 0.20 + kondisyon × 0.15 +
                 moral × 0.10 + CA × 0.15 + deneyim × 0.05
  - cezalı/sakat → elenir
  - kadro kaydı uygun değilse → elenir
  - fikstür yoğunsa rotasyon katsayısı uygulanır
  ```
- **Taktik seçimi:** kadro profil analizi (hızlı kanatlar var mı? uzun forvet var mı?) → en uygun diziliş + rol ataması; rakip analizine göre ayar
- **Transfer ihtiyaç analizi:**
  ```
  mevki_ihtiyaç = (ideal_derinlik - mevcut_derinlik) × mevki_önemi +
                  yaş_riski + sözleşme_riski + kalite_açığı
  ```
  → öncelikli mevkiler → bütçeye uygun hedef listesi → teklif
- **Bütçe disiplini:** FFP limiti, maaş/gelir oranı, nakit akışı → asla aşılmaz
- **Satış kararı:** fazla oyuncu, yaşlanan oyuncu, sözleşme bitmek üzere, yüksek teklif, oyuncu ayrılmak istiyor
- **Antrenman ataması:** oyuncunun en yüksek gelişim potansiyeli olan nitelik grubuna odak
- **Personel istihdamı:** boş pozisyon + bütçe → en iyi uygun aday
- **Şeffaflık paneli (S136):** herhangi bir AI kararına tıklayınca skor dökümü açılır — "Neden bu oyuncuyu aldı?" sorusunun cevabı görülebilir (geliştirme modunda)
- **Mantık denetimi:** 100 sezon toplu simülasyonu → mantıksız durum tespiti (kalecisiz kadro, negatif bütçe, aynı mevkide 8 oyuncu, hiç transfer yapmayan kulüp)

**Kabul kriterleri:**
- [ ] 100 sezon simülasyonunda **hiçbir** mantıksız kadro/transfer tespit edilmiyor
- [ ] Her AI kulüp her sezon en az 1, en fazla 12 transfer yapıyor
- [ ] Hiçbir kulüp FFP/bütçe limitini aşmıyor
- [ ] Şeffaflık paneli her kararın gerekçesini gösteriyor
- [ ] AI kadro seçimi mantıklı (10 kulüp elle incelenip onaylanır)
- [ ] Güçlü kulüpler istatistiksel olarak üstte bitiriyor (10 sezon, ilk 4'te bulunma oranı)
- [ ] AI karar süresi < 50 ms/kulüp

**Bağımlılık:** Faz 41

---

## FAZ 43 — Yapay Zeka Kulüp Yönetimi ve Menajer Piyasası

**Hedef:** Dünyanın kendi başına yaşaması.

**Kapsam:**
- **AI kulüp yönetimi:** sezon hedefi belirleme, bütçe planlama, menajer performans değerlendirme
- **Menajer kovma kararı:** yönetim güveni (kullanıcıyla aynı sistem) — hedeflerin gerisinde kalma, kötü seri, taraftar baskısı, mali başarısızlık
- **Menajer işe alma:** boş pozisyon → aday listesi (itibar + felsefe uyumu + müsaitlik + maaş beklentisi) → teklif → pazarlık
- **Menajer piyasası:** işsiz menajerler havuzu, kullanıcı da bu havuzda; menajerler kulüpler arası geçiş yapar
- **Menajer kariyer simülasyonu:** AI menajerlerin de itibarı artar/azalır, kariyer geçmişi tutulur
- **Tesis yatırım kararı:** mali durum + hedef + rakip karşılaştırması
- **Sponsorluk yenileme:** prestij ve başarıya göre yeni sponsor anlaşmaları
- **Kulüp prestiji dinamiği:** başarı, mali güç, taraftar sayısı, Avrupa performansı → prestij değişir; küçük kulüp büyüyebilir, büyük kulüp küçülebilir
- **Taraftar sayısı dinamiği:** başarı, bilet fiyatı, oyun tarzı → uzun vadede değişir
- **Dünya dinamizmi testi:** 20 sezon simülasyonu — lig şampiyonları çeşitlendi mi? Küçük kulüp yükseldi mi? Ekonomi dengeli mi?

**Kabul kriterleri:**
- [ ] 20 sezonda en az 5 farklı takım her ligi kazanmış
- [ ] Menajer kovulma/işe alma döngüsü çalışıyor (sezon başına 3–8 kovulma/lig)
- [ ] Kullanıcı kovulunca menajer piyasasına düşüyor ve teklif alabiliyor
- [ ] Kulüp prestijleri 20 sezonda anlamlı şekilde değişmiş (ama kaotik değil)
- [ ] Hiçbir kulüp iflas etmemiş veya absürt zenginleşmemiş
- [ ] AI menajer kariyer geçmişleri tutarlı

**Bağımlılık:** Faz 42

---

## FAZ 44 — Diyalog Motoru, Soyunma Odası ve Yönetim İletişimi

**Hedef:** Öncelik #3'ün kalbi. Oyuncularla insan gibi konuşabilmek.

**Kapsam:**
- **Mimari (S137 → A):** `DialogueSituation` + `Tone` + `Outcome`
  ```
  sonuç = f(
    durum tipi, seçilen ton, oyuncu kişiliği, oyuncu morali,
    menajer-oyuncu ilişki puanı, menajerin Oyuncu Yönetimi niteliği,
    menajerin Motivasyon niteliği, bağlam (son maç sonucu, form),
    rastgelelik (deterministik tohum)
  )
  ```
- **~80 diyalog durumu (S139):** maç performansı övgü/eleştiri, form konuşması, oyun süresi şikâyeti, mevki memnuniyetsizliği, sözleşme yenileme talebi, transfer talebi, yeni oyuncu uyumu, takım arkadaşı çatışması, kaptanlık talebi, sakatlık motivasyonu, disiplin cezası, kişisel sorun (aile/ülke özlemi), rol garantisi ihlali, kariyer hedefi, milli takım hayal kırıklığı, antrenman şikâyeti, taktik itirazı, maaş adaletsizliği, kulüp hırsı uyumsuzluğu, yaşlanma endişesi, emeklilik düşüncesi… (tam liste `docs/dialogue-situations.md`)
- **6 ton:** Sakin / Tutkulu / Sert / Anlayışlı / Alaycı / Umursamaz — her durumda uygun tonlar farklı
- **Sonuç seviyeleri:** Çok Olumlu / Olumlu / Nötr / Olumsuz / Çok Olumsuz → moral, ilişki puanı, `Determination`, soyunma odası etkisi
- **Risk göstergesi (S140):** ton seçmeden önce ipucu ("Bu oyuncu Kararsız kişilikte — sert eleştiri ters tepebilir"). Sonuç yine de garanti değil.
- **Toplam varyasyon hedefi:** 80 durum × 6 ton × 25 kişilik × bağlam ≈ **2.000+ benzersiz sonuç metni**
- **Soyunma odası sistemi (S141):**
  - Takım morali (bireysel morallerin ağırlıklı ortalaması + lider oyuncuların etkisi)
  - Klik oluşumu: uyruk, dil, yaş, kişilik benzerliğine göre gruplar
  - Sosyal hiyerarşi: takım liderleri, etkili oyuncular, dışlananlar
  - Huzursuzluk: aşırı maaş farkı, oynamayanların çokluğu, kötü sonuçlar, kaptanla anlaşmazlık
  - Takım toplantısı: tüm takıma hitap (maç öncesi, kriz anında)
- **Yönetim iletişimi (S142):** bütçe talebi, tesis yatırımı talebi, beklenti pazarlığı, açıklama isteme, oyuncu satma izni; yönetimden gelen uyarılar ve talepler
- **Diyalog geçmişi:** her oyuncuyla konuşma geçmişi, ilişki puanı seyri

**Kabul kriterleri:**
- [ ] 80 durumun tamamı tetiklenebiliyor ve test edilmiş
- [ ] Aynı durum + aynı ton + farklı kişilik → **farklı sonuç** üretiyor
- [ ] Aynı metin bir sezonda 2 kereden fazla tekrar etmiyor
- [ ] Türkçe ek motoru diyaloglarda doğru çalışıyor
- [ ] Soyunma odası klikleri mantıklı oluşuyor (aynı uyruk/yaş grubu)
- [ ] Yüksek Oyuncu Yönetimi niteliği ölçülebilir fark yaratıyor (A/B testi)
- [ ] Yönetim iletişimi tüm talep türlerinde çalışıyor
- [ ] Risk göstergesi doğru ipucu veriyor

**Bağımlılık:** Faz 43
**Risk:** İçerik yazımı ağır → 44a (motor + soyunma odası) / 44b (80 durumun içerik yazımı).

---

## FAZ 45 — Basın, Sosyal Medya ve Haber Üretimi

**Hedef:** Dünyanın konuşması.

**Kapsam:**
- **Basın toplantısı (S145–S146):**
  - Maç öncesi (4–6 soru), maç sonrası (4–6 soru), özel durumlarda (transfer, kriz, kovulma söylentisi, rekor)
  - Her soruya 4–6 ton seçeneği
  - Etkiler: kendi oyuncularının morali, rakip takım morali, taraftar memnuniyeti, yönetim algısı, menajer itibarı
  - **Yardımcıya devretme** seçeneği (S146 → C)
  - Soru tipleri: taktik, oyuncu performansı, transfer söylentisi, rakip menajer, hakem, taraftar tepkisi, yönetim ilişkisi, gelecek planları, kriz sorusu
- **Basın kışkırtması (S148):** rakip menajere laf atma — rakip oyuncuların moralini etkiler, ama geri tepebilir (rakip motive olur)
- **Sosyal medya akışı (S147):**
  - Taraftar hesapları (kendi + rakip taraftarlar), gazeteci hesapları, oyuncu hesapları, kulüp resmi hesabı
  - Tepkiler: maç sonuçları, transferler, kadro seçimleri, basın açıklamaları, sakatlıklar
  - Taraftar memnuniyeti göstergesi
- **Haber üretim motoru (S149):**
  - ~40 haber şablonu kategorisi: transfer tamamlandı, transfer söylentisi, sakatlık, maç sonucu, rekor, kovulma, işe alma, mali haber, kupa kurası, ödül, emeklilik, altyapı intake, derbi öncesi, kriz, kutlama…
  - Değişken doldurma + Türkçe ek motoru + tekrar önleme
  - Önem skorlaması → akışta sıralama
- **Transfer dedikodusu (S125):** bazıları gerçekleşir (%40), bazıları gerçekleşmez (%60) — gerçekçi belirsizlik
- **Ödüller:** Ayın Menajeri, Ayın Oyuncusu, Sezonun En İyi 11'i, Gol Kralı, Sezonun Oyuncusu, Sezonun Genç Oyuncusu, Ballon d'Or benzeri global ödül
- **Taraftar memnuniyeti sistemi:** sonuçlar, oyun tarzı, transferler, bilet fiyatı, efsane oyuncu satma → taraftar memnuniyeti → yönetim güvenine etki

**Kabul kriterleri:**
- [ ] Basın toplantısı her bağlamda uygun soru üretiyor
- [ ] Cevap tonu ölçülebilir moral etkisi yaratıyor
- [ ] Sosyal medya akışı olaylara doğru tepki veriyor
- [ ] Haber akışında bir sezonda aynı cümle tekrar etmiyor
- [ ] Türkçe ekler tüm haberlerde doğru
- [ ] Ödüller sezon sonunda doğru dağıtılıyor
- [ ] Taraftar memnuniyeti mantıklı değişiyor
- [ ] Yardımcıya devretme çalışıyor

**Bağımlılık:** Faz 44

---
---

# BLOK I — SEZON, EĞİTİM, YAYIN
### Faz 46 – 50

---

## FAZ 46 — Sezon Geçişi (Rollover) Motoru

**Hedef:** Boşluk-11'in tam karşılığı. Tek başına bir faz — çünkü en çok hata üreten yer burasıdır.

**Kapsam (S55 — hepsi seçildi):**
1. **Sözleşme bitişleri:** sona eren sözleşmeler, bedelsiz ayrılışlar, yenilenmemiş oyuncular serbest havuza
2. **Emeklilikler:** Faz 40 mantığı çalışır, veda haberleri üretilir
3. **Newgen üretimi:** akademi intake'i + serbest havuz newgenleri
4. **Küme düşme / çıkma:** her ligin gerçek kuralı, play-off sonuçları (Türkiye), kulüpler yeni ligine taşınır
5. **Bütçe yenileme:** yeni sezon geliri hesaplanır, transfer ve maaş bütçesi belirlenir
6. **Yönetim beklentisi:** yeni sezon hedefleri belirlenir ve kullanıcıya sunulur
7. **Kupa kuraları:** tüm turnuvaların yeni sezon kuraları çekilir
8. **UEFA katsayısı:** güncellenir, kota dağıtımı yapılır, UEFA elemelerine katılacak takımlar belirlenir
9. **Oyuncu değeri yeniden hesaplama:** tüm oyuncular için, enflasyon uygulanır
10. **Stadyum/tesis inşaat tamamlanması:** süresi dolan projeler devreye girer
11. **Hakem listesi yenilenmesi:** yeni sezon hakem kadrosu, emekli olan hakemler
12. **Ek işlemler:** yaş artışı, kart sayaçları sıfırlama, forma numarası yeniden atama, sezon istatistikleri arşivleme, kupa müzesi güncelleme, menajer/personel sözleşme bitişleri
- **Sezon Özeti ekranı (S56):** başarımlar, en iyi 11, ödüller, yönetim değerlendirmesi, mali özet, gelişen oyuncular, sezon anları
- **Rollover doğrulaması:** her adımdan sonra `validateWorld` çalışır, ihlal varsa rollover **durur** ve rapor verir

**Kabul kriterleri:**
- [ ] 20 ardışık sezon geçişi **hatasız** tamamlanıyor
- [ ] Her geçişte `validateWorld` 0 ihlal veriyor
- [ ] Küme düşen/çıkan takımlar doğru ligde
- [ ] Serbest kalan oyuncular havuzda ve transfer edilebilir
- [ ] UEFA kotaları katsayıya göre doğru dağıtılıyor
- [ ] Sezon özeti ekranı tüm veriyi doğru gösteriyor
- [ ] Rollover < 30 saniye
- [ ] Rollover kesintiye uğrarsa idempotent şekilde devam ediyor

**Bağımlılık:** Faz 45
**Risk:** En hata-üretken faz → ekstra test yatırımı, 20 sezonluk otomatik regresyon testi zorunlu.

---

## FAZ 47 — Liderlik Tablosu, Menajer Profili ve Yönetim Paneli

**Hedef:** Boşluk-3'ün karşılığı — **herkese açık** ve adil karşılaştırma. Oyunun sosyal çekirdeği: tüm kullanıcılar aynı dünyada ayrı kariyerler oynayıp birbiriyle yarışır. Açık olduğu için bütünlük ve moderasyon kritik.

**Kapsam:**
- **Kategorili tablolar (S203):** kulüp prestij seviyesine göre — Elit (prestij 160+) / Büyük (130–159) / Orta (100–129) / Küçük (<100) + Genel tablo
- **Zorluk normalizasyonu (Boşluk-3):**
  ```
  başarı_puanı = (gerçekleşen sıra vs. beklenen sıra farkı) × kulüp zorluk katsayısı +
                 kupa puanları × turnuva prestiji +
                 mali verimlilik (harcama başına başarı) +
                 genç geliştirme puanı
  ```
  → Küçük takımla ligi 8. bitirmek, Real Madrid'le şampiyon olmaktan daha değerli olabilir
- **Metrikler (S204):** menajer adı, yönetilen takım(lar), toplam maç, G/B/M, kazanma %, harcanan bonservis, kazanılan bonservis, net transfer bakiyesi, kupa sayısı, itibar puanı, sezon sayısı, geliştirilen genç sayısı, başarı puanı
- **Zaman filtresi:** tüm zamanlar / bu sezon / son 5 sezon
- **Giriş koşulu (S206):** min. 20 maç + Normal+ zorluk + "maç tekrar oynama" kapalı
- **Zorluk rozeti (S134):** her satırda görünür
- **Menajer profil sayfası (S207):** kariyer geçmişi (her kulüp, süre, istatistik), kupa vitrini, en iyi sezonlar, geliştirdiği oyuncular, tarz analizi (favori diziliş, ortalama gol, oyun tarzı), gizlilik ayarı
- **Sosyal karşılaştırma (özel sunucu değeri):**
  - **Kafa kafaya:** iki menajer profilini yan yana karşılaştırma (tüm metrikler, fark vurgulu)
  - **Aynı Kulüp Meydan Okuması:** aynı kulüple oynayan herkesin sonuçları karşılaştırılır — "Bu kulüple oynayan 47 menajer içinde 6. sıradasın"
  - **Sezon bazlı sıralama:** kim hangi sezonda ne yaptı, zaman çizelgesi
  - **Rozetler:** İlk Şampiyonluk, Avrupa Kupası, Küçük Takımla Büyük İş, Genç Fabrikası, Transfer Dehası, Yenilmez Sezon vb. (~20 rozet)
  - **Aktivite akışı:** dikkat çekici başarılar ana sayfada görünür (gizlilik ayarına saygılı)
  - **Takip sistemi:** belirli menajerleri takip edip sadece onların akışını görme
- **Bütünlük ve moderasyon (açık kayıt gereği):**
  - Anomali bayrağı almış kariyerler tablodan otomatik çıkarılır, inceleme kuyruğuna düşer
  - Kullanıcı şikâyet butonu (uygunsuz menajer/kayıt adı)
  - Moderasyon paneliyle entegre (Faz 13)
  - Yeni hesaplar için 24 saat bekleme (spam hesapların tabloyu doldurmasını engeller)
- **Şema global-uyumlu:** ileride herkese açılmak istenirse tek config değişikliğiyle genel tabloya dönüşür (v2/V13)
- **Materialized view + 5 dk önbellek**

### Yönetim Paneli (Admin Panel)

Ayrı bir bölüm (`/fms/admin`), yalnızca `admin` rolüne açık. Faz 13'teki mod sistemi ve rol altyapısı üzerine kurulur.

**Kullanıcı Yönetimi**
- Kullanıcı listesi: e-posta, kullanıcı adı, menajer adı, kayıt tarihi, son giriş, doğrulama durumu, rol, durum (aktif/askıda/silinme bekliyor), kayıt (save) sayısı, toplam disk kullanımı
- Arama ve filtreleme (e-posta, kullanıcı adı, IP, tarih aralığı, durum)
- **Kullanıcı detay sayfası:** tüm profil bilgileri, **IP geçmişi** (her giriş için IP + tarih + kullanıcı aracısı + ülke), oturum geçmişi, aktif oturumlar (uzaktan sonlandırılabilir), audit log dökümü, gönderilen e-postalar
- Eylemler: rol değiştir, şifre sıfırlama e-postası gönder, e-postayı manuel doğrula, hesabı askıya al/aç, hesabı sil (30 gün yumuşak silme), özel mod izin listesine ekle/çıkar

**Kayıt (Save) Yönetimi**
- Tüm kayıtların listesi: sahibi, kayıt adı, kulüp, lig, sezon, tur numarası, boyut, oluşturma tarihi, son oynama, simülasyon modu, "liderlik dışı" bayrağı
- **Kayıt detay görüntüleyici:** kaydın anlık durumu (kadro, bütçe, puan durumu, transfer geçmişi) — salt-okunur, hata ayıklama için
- **Kayıt taşıma:** bir kaydı başka bir hesaba aktarma
  - Hedef hesap doğrulaması (var mı, slot boş mu)
  - Çift onay ekranı (kaynak ve hedef gösterilir)
  - Sahiplik değişimi audit log'a yazılır, **geri alınabilir** (7 gün içinde)
  - İki taraf da bilgilendirme e-postası alır
- **Kayıt silme:** yumuşak silme (30 gün geri alınabilir) → kalıcı silme
- **Kayıt indirme:** JSON dışa aktarma (hata ayıklama ve yedekleme)
- **Kayıt yükleme:** dışa aktarılmış bir kaydı bir hesaba geri yükleme
- Toplu işlem: pasif kayıtları arşivle, yetim kayıtları temizle

**Sunucu Kontrolü**
- **Mod anahtarı:** Public / Özel / Bakım — mesaj metni ve tahmini dönüş süresi düzenlenebilir, önizlemeli
- IP izin listesi yönetimi (ekle/çıkar, CIDR desteği, "mevcut IP'mi ekle" tek tık)
- Özel mod kullanıcı izin listesi yönetimi
- Aktif oturum sayacı ve kuyruk uzunluğu (canlı)

**Telemetri ve Sağlık**
- Disk kullanımı (200 GB sınırına göre yüzde), veritabanı boyutu, tablo bazlı döküm
- R2 kullanımı (10 GB sınırına göre), aylık işlem sayacı
- Resend e-posta kotası (3.000/ay sınırına göre)
- **Sentry olay kotası (5.000 olay/ay sınırına göre)** *(G-06, `docs/SPEC-COVERAGE-GAPS.md`)*
  `docs/spec/10` §13.5 sınır tablosunda Sentry satırı var (uyarı eşiği 4.000) ama bu telemetri
  listesinde yoktu — yani "%80 eşiğinde uyarı" kabul kriteri Sentry'yi hiç kapsamadan da
  işaretlenebilirdi. Faz 2 Karar 4 kotayı **korumaya** yönelik (`tracesSampleRate: 0`,
  `beforeSend` filtresi); bu satır kotayı **izler**. İkisi ayrı iş.
- CPU / RAM / kuyruk metrikleri, son 24 saat grafiği
- **Ücretsiz kademe uyarı eşikleri:** `spec/10` §13.5'teki **altı** sınırın herhangi biri %80'ine gelince panelde ve e-postayla uyarı

**Moderasyon ve Denetim**
- Şikâyet kuyruğu (uygunsuz isim bildirimleri)
- Anomali bayrağı kuyruğu (Faz 13 tespit sistemi)
- Liderlik tablosundan çıkarma / geri alma
- **Audit log görüntüleyici:** filtrelenebilir (kullanıcı, eylem türü, tarih, `correlationId`), dışa aktarılabilir
- **Admin eylemleri de loglanır** — kim, ne zaman, ne yaptı, hangi IP'den

**Kabul kriterleri:**
- [ ] 4 kategori + genel tablo doğru sıralıyor
- [ ] Başarı puanı normalizasyonu mantıklı sonuç veriyor (test senaryolarıyla)
- [ ] "Tekrar oynama" açık kariyerler tabloya girmiyor
- [ ] Menajer profil sayfası tüm veriyi gösteriyor
- [ ] Kafa kafaya karşılaştırma iki profili doğru gösteriyor
- [ ] Aynı Kulüp Meydan Okuması aynı kulüple oynayanları eşleştiriyor
- [ ] 20 rozet doğru koşullarda veriliyor
- [ ] Aktivite akışı gizlilik ayarına saygı duyuyor
- [ ] Anomali bayraklı kariyer tabloda görünmüyor
- [ ] Şikâyet butonu moderasyon kuyruğuna düşürüyor
- [ ] 10.000 kariyerde tablo sorgusu < 500 ms
- [ ] Yönetim paneli yalnızca `admin` rolüne açık (normal kullanıcı URL'yi bilse de 403 alıyor)
- [ ] Kullanıcı detayında IP geçmişi ve oturum geçmişi görünüyor
- [ ] **Kayıt taşıma** uçtan uca çalışıyor: A hesabından B hesabına aktarılan kayıt B'de açılıyor ve bozulmuyor
- [ ] Kayıt taşıma 7 gün içinde geri alınabiliyor
- [ ] Hedef hesabın slotu doluysa taşıma engelleniyor
- [ ] Kayıt silme → 30 gün yumuşak silme → kalıcı silme zinciri çalışıyor
- [ ] Kayıt dışa aktar / geri yükle tam döngü çalışıyor
- [ ] Mod anahtarı panelden değiştirilince anında etkili oluyor
- [ ] "Mevcut IP'mi ekle" doğru IP'yi (`CF-Connecting-IP`) ekliyor
- [ ] Telemetri gerçek değerleri gösteriyor; `spec/10` §13.5'teki **altı** sınırın (Sentry dahil) her biri için %80 eşiğinde uyarı tetikleniyor *(G-06)*
- [ ] Admin eylemleri audit log'da görünüyor
- [ ] Panel mobilde kullanılabilir

**Not:** Bu faz iki iş yükü barındırıyor. 3 günü aşarsa **47a (liderlik tablosu + menajer profili)** / **47b (yönetim paneli)** olarak bölünür.
- [ ] Tablo güncelleme < 500 ms
- [ ] Şema genel moda geçmeye hazır (config testi)

**Bağımlılık:** Faz 46

---

## FAZ 48 — Tutorial ve Eğitim Merkezi

**Hedef:** Oyunun öğrenilebilir olması. (S209–S213)

**Kapsam:**
- **18 tutorial modülü:**
  1. Menajer Oluşturma
  2. Kariyer Başlatma & İş Başvurusu
  3. Ana Sayfa & Gelen Kutusu
  4. Kadro Ekranı & Tablolar
  5. Oyuncu Detay & Nitelikler
  6. Diziliş & Roller
  7. Takım Talimatları
  8. Duran Toplar
  9. Antrenman
  10. Gözlemcilik
  11. Transfer Arama
  12. Transfer Pazarlığı
  13. Sözleşme & Kişisel Şartlar
  14. Maç Günü & Maç İçi Yönetim
  15. Oyuncu Diyaloğu & Soyunma Odası
  16. Basın Toplantısı
  17. Finans & Yönetim İlişkisi
  18. Sezon Geçişi & Uzun Vade
- **Format:** bağlamsal, adım adım — ekran üstü işaretçi (spotlight) + açıklama balonu + "sıradaki" butonu; gerçek arayüz üzerinde, sahte ekran yok
- **Atlanabilir + tekrar izlenebilir (S211):** ana menüden "Eğitim Merkezi" — her modül bağımsız
- **İlerleme takibi:** tamamlanan modüller işaretli
- **Akıllı tetikleme:** kullanıcı bir ekrana ilk kez girdiğinde ilgili modül önerilir (kapatılabilir)
- **Oyun içi sözlük (S213):** 120+ terim (xG, CA/PA, GBE, Bosman, homegrown, mentalite, rol, taktik akıcılığı…), üzerine gelince tooltip, aranabilir sözlük sayfası
- **Önerilen kulüp sistemi (S212):** yeni oyunculara zorluk rozetli kulüp önerisi
- **İlk kariyer rehberi:** ilk 10 turda bağlamsal ipuçları ("Antrenman programınızı henüz ayarlamadınız")

**Kabul kriterleri:**
- [ ] 18 modülün tamamı baştan sona çalışıyor
- [ ] Tutorial atlanabiliyor ve Eğitim Merkezi'nden tekrar açılabiliyor
- [ ] İşaretçi doğru elemanı vurguluyor (tüm ekran boyutlarında)
- [ ] Mobilde tutorial kullanılabilir
- [ ] Sözlük 120+ terim içeriyor ve aranabiliyor
- [ ] Tooltip'ler tüm ekranlarda çalışıyor
- [ ] Tutorial ilerlemesi kaydediliyor

**Bağımlılık:** Faz 47

---

## FAZ 49 — Mobil Cila, Performans ve Erişilebilirlik

**Hedef:** Her ekranın telefonda gerçekten kullanılabilir olması.

**Kapsam:**
- **Tüm ekranların mobil denetimi:** 360px, 390px, 414px genişliklerde her ekran tek tek test edilir ve düzeltilir
- **PWA:** manifest, servis çalışanı, ana ekrana ekleme, offline kabuk, uygulama ikonu, splash ekranı
- **Dokunma optimizasyonu:** 44×44px minimum hedef, jest desteği (kaydırarak geri, çekerek yenile), uzun basma menüleri
- **Performans denetimi:**
  - Bundle analizi + kod bölme (route bazlı lazy loading)
  - Görsel optimizasyonu (WebP/AVIF, lazy loading, boyut önceden bildirimi)
  - Liste sanallaştırma denetimi
  - React render profili → gereksiz render temizliği
  - Lighthouse skoru ≥ 90 (Performance, Accessibility, Best Practices)
- **Erişilebilirlik denetimi (S190):**
  - axe-core otomatik tarama → 0 kritik ihlal
  - Renk körlüğü modu (protanopi/döteranopi/tritanopi) — nitelik renkleri desen ile de ayırt edilir
  - Font boyutu ayarı %90–130
  - Tam klavye navigasyonu, odak halkaları, atlama bağlantıları
  - Ekran okuyucu etiketleri (aria-label, aria-live bölgeleri)
  - "Hareketi azalt" ayarı tüm animasyonları etkiler
- **Bellek denetimi:** 2 saatlik oyun oturumunda sızıntı testi
- **Ses denetimi:** mobil autoplay kısıtı, sessiz mod, arka plan davranışı
- **Görsel regresyon testi (Playwright snapshot)** *(G-05, `docs/SPEC-COVERAGE-GAPS.md`)*
  `docs/spec/09` §11.4 "Görsel / Playwright / Ekranlar / Anlık görüntü karşılaştırma
  (mobil + masaüstü)" katmanını tanımlıyor ama ROADMAP'te karşılığı **hiç yoktu**. Bu faz
  her ekranı tek tek elden geçirdiği için taban görüntülerin alınacağı doğru yer burası.
  Faz 17'de kurulan Playwright altyapısına (G-02) bağımlı.
- **`pnpm perf:budget` genişletmesi** — Faz 6'da kurulan kapıya (G-01) bu fazda ölçülebilir
  hale gelen metrikler eklenir: LCP, 2D oynatıcı fps, bellek, Lighthouse.

**Kabul kriterleri:**
- [ ] Her ekran 360px'de yatay taşma olmadan kullanılabilir
- [ ] Görsel regresyon paketi masaüstü + mobilde taban görüntülerle çalışıyor; kasıtlı bir düzen bozulması yakalanıyor *(G-05)*
- [ ] PWA yüklenebiliyor ve offline kabuk açılıyor
- [ ] Lighthouse: Performance ≥ 90, Accessibility ≥ 95
- [ ] axe-core: 0 kritik ihlal
- [ ] Tüm performans bütçeleri sağlanıyor
- [ ] 2 saatlik oturumda bellek < 500 MB, sızıntı yok
- [ ] Renk körlüğü modunda tüm bilgi ayırt edilebilir
- [ ] Ekran okuyucu ile ana akış tamamlanabiliyor

**Bağımlılık:** Faz 48

---

## FAZ 50 — Bütünsel Denetim, Denge Ayarı ve Yayın

**Hedef:** Oyunun bir bütün olarak doğrulanması.

**Kapsam:**
- **20 sezonluk tam regresyon simülasyonu:**
  - Hiç çökme yok
  - `validateWorld` her sezon 0 ihlal
  - Ekonomi dengeli (enflasyon kontrollü, iflas dalgası yok)
  - Oyuncu nüfusu dengeli
  - Lig şampiyonları çeşitli
  - Nitelik enflasyonu yok (20 sezon sonra herkes 18 nitelikli olmamış)
  - Sakatlık/kart/gol oranları hâlâ hedef aralıkta
- **Denge ayar turu:** yukarıdaki testlerden çıkan sapmaların düzeltilmesi
- **Uçtan uca test paketi (Playwright):** kayıt → menajer oluştur → kulüp seç → transfer yap → maç oyna → sezon bitir → yeni sezon — tam senaryo otomatik
- **Yük testi (`k6`):** eşzamanlı 5 kayıt, 100 tur atlama *(G-04, `docs/SPEC-COVERAGE-GAPS.md`)*
  `docs/spec/09` §11.4 yük katmanını "`k6` / API / 20 eşzamanlı kullanıcı, tur atlama" diye
  tanımlıyor ama `k6` ROADMAP'in hiçbir yerinde geçmiyordu — aşağıdaki "20 kullanıcı
  eşzamanlı" kabul kriterinin ölçüm aracı yoktu. Araç burada kurulur; senaryo spec'teki
  **20 eşzamanlı kullanıcı** hedefini de kapsar.
- **Hata denetimi:** Sentry'de biriken tüm hataların temizlenmesi
- **Sentry kaynak haritası yükleme** — Faz 2'den devreden borç (Karar 7): Faz 2 yalnızca
  `sourcemap: true` + `release` adlandırması yaptı; CI yükleme adımı buraya bırakıldı.
- **Ücretsiz kademe uyarı zinciri — admin e-postası** *(G-06)*: `docs/spec/10` §13.5'teki
  altı sınırın **tamamı** (Sentry dahil) eşiğe gelince admin e-postası gider. Panel uyarısı
  Faz 47'de kurulur; e-posta kanalı burada bağlanır.
- **Güvenlik denetimi:** bağımlılık taraması (`pnpm audit`), OWASP kontrol listesi, SQL enjeksiyon testi, XSS testi, auth bypass testi
- **Veri denetimi:** tüm görsel varlıkların bütünlüğü, eksik varlık raporu
- **i18n denetimi:** 0 eksik anahtar, 0 sabit kodlanmış metin
- **Dokümantasyon:**
  - `README.md` (kurulum, çalıştırma, mimari özeti)
  - `docs/ARCHITECTURE.md`
  - `docs/DATA-PIPELINE.md`
  - `docs/GAME-MECHANICS.md`
  - `docs/TROUBLESHOOTING.md`
  - `CHANGELOG.md` (v1.0.0)
- **Yayın hazırlığı (özel sunucu dağıtımı):**
  - **ARM64 (aarch64)** çok mimarili Docker imajları — Oracle A1 ARM tabanlı, tüm imajlar `linux/arm64` olmalı
  - `docker-compose.prod.yml` (web, api, worker, postgres, redis, caddy)
  - **Oracle Cloud kurulumu:** A1 Flex instance (`eu-frankfurt-1`, Ubuntu 24.04 ARM, 2 OCPU / 12 GB / 200 GB), VCN güvenlik listesi, `iptables` kalıcılığı (Oracle imajlarındaki bilinen tuzak)
  - **Cloudflare:** `fxrkqn.org` DNS kaydı (proxy açık, turuncu bulut), Full (Strict) SSL, WAF temel kuralları, Turnstile site anahtarı, `/fms/*` önbellek kuralı
  - **Alt yol yönlendirmesi:** `fxrkqn.org/fms` → uygulama, `fxrkqn.org/fms/api/*` → API (Caddy `handle_path`). Kök alan adı (`fxrkqn.org/`) etkilenmez.
  - **Resend:** alan adı doğrulaması (SPF + DKIM + DMARC kayıtları), gönderici adresi, e-posta şablonları (doğrulama, şifre sıfırlama, kayıt taşıma bildirimi, hesap silme onayı)
  - **Caddy** ters vekil + origin sertifikası
  - Sunucu sağlamlaştırma: SSH anahtar-only, `ufw`, `fail2ban`, otomatik güvenlik güncellemeleri, root girişi kapalı
  - **Cloudflare R2:** görsel varlıklar için bucket, özel alan adı bağlama, sıfır egress
  - Sağlık kontrolü uç noktaları (`/health`, `/ready`) + ücretsiz uptime izleme
  - **Yedekleme:** günlük otomatik `pg_dump` (sıkıştırılmış) → **R2** (ücretsiz 10 GB), 30 günlük saklama, haftalık tam varlık arşivi
  - **Geri yükleme tatbikatı:** yedekten sıfır sunucuya tam geri yükleme **bir kez test edilir ve süresi ölçülür**
  - **`docs/RUNBOOK.md` — tatbikatın yazılı çıktısı** *(G-07, `docs/SPEC-COVERAGE-GAPS.md`)*
    `docs/spec/10` §13.4 *"süresi `docs/RUNBOOK.md`'ye yazılır"* diyor; dosya ne repoda
    var, ne `CLAUDE.md` belge haritasında, ne de bu fazın kapsamında **adıyla** geçiyordu
    (yalnızca *"süresi belgelenmiş"* deniyordu). Tatbikatın kendisi zaten kapsamda —
    eksik olan **çıktı dosyasının adı ve içeriği**: adım adım geri yükleme prosedürü,
    ölçülen süre, ve tatbikatta çıkan sürprizler. Dosya oluşturulunca `CLAUDE.md` belge
    haritasına da bir satır eklenir.
  - Kaynak izleme: CPU/RAM/disk alarmı (disk %80 dolunca uyarı, 200 GB sınırı takibi)
  - **`docs/HOSTING-FALLBACK.md`:** Oracle limitleri tekrar düşürürse taşınacak alternatif ücretsiz/ucuz sağlayıcılar ve taşıma prosedürü
- **Yasal sayfalar:** Aydınlatma metni, Gizlilik Politikası, Kullanım Koşulları, Çerez Politikası
  `docs/LEGAL/` altında **yazılır** ama yalnızca `SERVER_MODE=public` iken gösterilir.
  Kişisel kurulumda (Özel mod) bu sayfalar devre dışıdır.
- **Lisans dosyası:** `LICENSE` (AGPL-3.0 önerilir) + `NOTICE` (üçüncü taraf veri kaynakları ve lisansları: Wikidata CC0, openfootball, Commons atıfları)
- **Varsayılan mod:** Sunucu **Özel modda** açılır ve kişisel kullanımda öyle kalır.
  Public'e geçmek bilinçli bir karardır ve KVKK metinlerini otomatik aktive eder.
- **Veri paketi kurulumu:** `/data/packs/` altına paket yerleştirilir, `ACTIVE_PACK` ayarlanır,
  Veri Editörü'nden içe aktarılır ve doğrulanır
- **Kabul testi:** 10+ gerçek kullanıcı 1 hafta oynar, geri bildirim toplanır
- **v1.0.0 etiketi**

**Kabul kriterleri:**
- [ ] 20 sezon regresyon simülasyonu hatasız
- [ ] Tüm denge metrikleri hedef aralıkta
- [ ] Uçtan uca test paketi yeşil
- [ ] Sentry'de açık hata yok
- [ ] Güvenlik denetimi temiz
- [ ] Tüm dokümantasyon tamamlanmış
- [ ] `docker compose -f docker-compose.prod.yml up` → sıfırdan çalışan sistem
- [ ] Tüm Docker imajları `linux/arm64` üzerinde çalışıyor
- [ ] Oyun `https://fxrkqn.org/fms` adresinde çalışıyor, hiçbir kırık bağlantı/varlık yok
- [ ] PWA `/fms` kapsamında yükleniyor, ana ekrandan açılınca doğru sayfaya gidiyor
- [ ] Resend alan adı doğrulanmış; doğrulama e-postası spam'e düşmüyor (SPF/DKIM/DMARC geçerli)
- [ ] Üç sunucu modu da üretimde test edilmiş
- [ ] HTTPS alan adı üzerinden erişilebiliyor, Cloudflare proxy aktif, origin IP gizli
- [ ] Sunucu sağlamlaştırma tamamlanmış (SSH anahtar-only, ufw, fail2ban, iptables kalıcı)
- [ ] Günlük yedek R2'ye gidiyor
- [ ] **Geri yükleme tatbikatı yapılmış** — sıfır sunucudan tam geri yükleme başarılı, süresi `docs/RUNBOOK.md`'ye yazılmış *(G-07)*
- [ ] Dengeli modda 20 kullanıcı eşzamanlı oynarken sistem stabil (CPU < %80, kuyruk < 20 sn) — *`k6` senaryosuyla ölçülür (G-04)*
- [ ] Aylık maliyet **$0** — tüm servisler ücretsiz kademede, hiçbir sınır aşılmıyor
- [ ] `spec/10` §13.5'teki **altı** sınırın hepsi (Sentry dahil) izleniyor; eşiğe gelince admin e-postası gidiyor *(G-06)*
- [ ] Sentry kaynak haritaları yükleniyor; üretimde bir hatanın yığın izi **okunabilir satır numarası** gösteriyor *(Faz 2 Karar 7 borcu)*
- [ ] `DATA_MODE=full` ile gerçek armalar, portreler, formalar, logolar görünüyor
- [ ] (Public modda) Yasal sayfalar yayında, "hesabımı sil" ve "verilerimi indir" çalışıyor
- [ ] Özel modda izin listesi dışındaki hesap oyunu başlatamıyor
- [ ] `HOSTING-FALLBACK.md` yazılmış ve taşıma adımları test edilmiş
- [ ] v1.0.0 etiketlenmiş

**Bağımlılık:** Faz 49

---
---

# v2 KASASI — 14 FAZ

> Bu özellikler v1'de **kasıtlı olarak** kapsam dışıdır. Her fazda "bunu da ekleyelim" baskısını önlemek ve projeyi bitirmek için buradalar. v1.0.0 yayınlandıktan sonra sırayla ele alınır.

| Faz | Ad | Hedef | Tahmini Süre |
|---|---|---|---|
| **V1** | **İngilizce Dil Desteği** | i18n altyapısı Faz 5'te kurulduğu için sadece çeviri işi. Tüm namespace'lerin EN karşılığı, İngilizce ek/çoğullama, dil değiştirici. | 3–4 gün |
| **V2** | **2. ve 3. Lig Kademeleri** | 6 ülkede alt ligler (Championship, LaLiga 2, 2. Bundesliga, Serie B, Ligue 2, TFF 1. Lig + 3. kademeler). ~500 kulüp, ~15.000 oyuncu. Küme düşme zincirlerinin genişlemesi. | 6–8 gün |
| **V3** | **Milli Takım Tam Yönetimi** | Kullanıcı milli takım yönetebilir (kulüple birlikte veya yalnız). Kadro seçimi, eleme grupları, büyük turnuvalar, milli takım basını. | 5–7 gün |
| **V4** | **Oyuncu Menajeri (Agent) Derin Sistemi** | Agent kişilikleri, agent ilişki geliştirme, agent'ların oyuncu önerisi getirmesi, agent ağı, komisyon pazarlığı. | 4–5 gün |
| **V5** | **Sportif Direktör Rolü** | Transfer sorumluluğunu devretme, sportif direktörle strateji uyumu, kulüp yapısı (menajer vs. head coach modeli). | 3–4 gün |
| **V6** | **Duran Top Koreografi Editörü** | Korner ve frikikte oyuncu bazlı görev atama (sürükle-bırak saha editörü), özel rutin kaydetme, antrenmanla verimlilik artışı. | 4–5 gün |
| **V7** | **Bilet Fiyatlandırma & Ticari Gelir Yönetimi** | Bilet kategorileri, sezonluk kart, taraftar memnuniyeti dengesi, sponsorluk pazarlığı, ürün stratejisi. | 3–4 gün |
| **V8** | **Stadyum İnşaat & Taşınma** | Yeni stadyum inşası, taşınma kararı, geçici stadyum, isim hakkı satışı, tribün bazlı genişletme. | 4–5 gün |
| **V9** | **Maç Motoru S4 Yükseltmesi** | Sürekli konum simülasyonu (1 sn tik), gelişmiş oyuncu karar ağaçları, gerçek pas ağları, oyuncu bazlı ısı haritası hassasiyeti, gelişmiş taktik etkileşimleri. | 12–15 gün |
| **V10** | **Taraftar Grupları & Derbi Atmosferi** | Taraftar grupları (ultras), koreografi, protesto, taraftar temsilcisiyle iletişim, derbi haftası özel atmosferi ve baskısı. | 4–5 gün |
| **V11** | **LLM Destekli Metin Çeşitliliği (Opsiyonel)** | Basın ve diyalog metinlerinde şablon yerine LLM üretimi — tamamen opsiyonel, kapatılabilir, yerel model desteği (Ollama). Kararlar hâlâ kural tabanlı kalır. | 5–6 gün |
| **V12** | **Mağaza Uygulaması (Capacitor)** | iOS/Android native paketleme, push bildirim, offline mod, mağaza yayını. | 6–8 gün |
| **V13** | **Ölçekleme** | *(Açık kayıt, anti-hile, moderasyon ve KVKK/GDPR zaten v1'de.)* Ücretsiz kademe sınırlarına dayanınca: yatay ölçekleme (çoklu worker düğümü), okuma replikası, R2 üzerinden CDN önbellekleme, veritabanı bölümleme, yük dengeleme, ölçek testi. **Ancak burada maliyet sıfır kalmayabilir** — tetiklendiğinde birlikte karar verilir. | 8–10 gün |
| **V14** | **Veri Güncelleme Hattı** | Her yeni gerçek sezon için otomatik veri güncelleme, sürüm karşılaştırma, mevcut kayıtları etkilemeden yeni kariyer verisi güncelleme. | 4–5 gün |

**v2 toplam tahmin:** ~75–95 gün.

---
---

# EK A — FAZ BAĞIMLILIK HARİTASI

```
BLOK A (1-6): Temel
  1 → 2 → 3 → 4
  1 → 5
  1,5 → 6

BLOK B (7-11): Veri
  2,3 → 7 → 8 → 9 → 10 → 11
  6 → 11

BLOK C (12-17): Çekirdek
  11 → 12 → 13 → 14 → 15 → 16 → 17
  10 → 14
  6 → 17

BLOK D (18-21): Kadro & Taktik
  17 → 18 → 19 → 20 → 21

BLOK E (22-29): Maç Motoru
  21 → 22 → 23 → 24 → 25 → 26 → 27 → 28 → 29
  6 → 27

BLOK F (30-35): Transfer  [ÖNCELİK #1]
  29,16 → 30 → 31 → 32 → 33 → 34 → 35
  14 → 31
  18 → 32

BLOK G (36-41): Kulüp & Dünya
  35 → 36 → 37 → 38 → 39 → 40 → 41

BLOK H (42-45): Yapay Zeka  [ÖNCELİK #3]
  41 → 42 → 43 → 44 → 45

BLOK I (46-50): Sezon & Yayın
  45 → 46 → 47 → 48 → 49 → 50
```

**Kritik yol:** 1 → 7 → 12 → 16 → 22 → 30 → 36 → 42 → 46 → 50

**Bölünme riski yüksek fazlar** (3 günü aşabilir, ikiye ayrılabilir): **6, 10, 13, 16, 23, 27, 28, 33, 40, 41, 44, 47**

> ⚠️ **BU LİSTE BİR TAHMİNDİR, BİR KONTROL DEĞİL** (SAPMA-033, Faz 4.1). Ölçüldü:
> **Faz 3 bu listede yoktu ve 4 gün sürdü** — §0.5'in sınırı 3. Liste bir fazı
> *"riskli"* diye işaretlemeyi başarabilir ama **aşmayı yakalayamaz**; onu yakalayan
> tek şey faz kapanışında **gerçek süreyi ölçmek** (`docs/SESSION-TEMPLATE.md`
> adım 15, Faz 4.1'de eklendi).
> ℹ️ **Faz 4 de bu listede değil** ve aynı risk taşıyor (6 migration, 47 sütunlu
> tablo, 5.000 satırlık seed, bir performans ölçümü); bu yüzden Faz 4'ün **4.7'sine
> bir ara kontrol noktası** kondu — bölünme tahminle değil ölçümle kararlaştırılıyor.

---

# EK B — HER FAZDA ÇALIŞTIRILACAK DOĞRULAMA KOMUTLARI

```bash
# Faza başlarken
pnpm install
pnpm typecheck          # 0 hata bekleniyor
pnpm lint               # 0 uyarı bekleniyor
pnpm test               # tümü yeşil bekleniyor

# Faz sırasında (sık)
pnpm test:watch
pnpm dev

# Fazı bitirirken (zorunlu sıra)
pnpm typecheck
pnpm lint
pnpm test --coverage    # global ≥%70, engine ≥%85
pnpm build
pnpm test:e2e           # Faz 17'den sonra
pnpm validate:save      # Faz 12'den sonra
pnpm validate:world     # Faz 11'den sonra
pnpm sim:balance        # Faz 23'ten sonra — 10.000 maç denge testi
pnpm sim:seasons 20     # Faz 46'dan sonra — 20 sezon regresyon
pnpm i18n:check         # Faz 5'ten sonra
pnpm perf:budget        # Faz 6'dan sonra
```

---

# EK C — SONRAKİ ADIM

Bu belge, üretilecek **50–60 bin karakterlik ana promptun** iskeletidir. Prompt şunları ekleyecek:

1. **Proje anayasası** — Claude Code'un her oturumda uyacağı değişmez kurallar
2. **Tam veritabanı şeması** — Drizzle kod olarak
3. **Maç motoru formülleri** — her hesaplamanın açık matematiği
4. **47 nitelik türetme tablosu** — istatistik → nitelik eşlemesi
5. **Yapay zeka skorlama ağırlıkları** — tam sayısal tablolar
6. **Tasarım token'ları** — renk/tipografi/boşluk değerleri
7. **80 diyalog durumu** — tam liste ve ton matrisi
8. **17 gol türü** — animasyon spesifikasyonları
9. **Ülke kural setleri** — GBE, kota, homegrown formülleri
10. **Terim sözlüğü** — TR/EN + kod isimlendirme standardı
11. **Hata kontrol protokolü** — her fazda çalıştırılacak tam kontrol listesi
12. **Claude Code oturum şablonu** — her faz için hazır başlangıç promptu
13. **Yönetim paneli spesifikasyonu** — mod sistemi, kayıt taşıma akışı, telemetri eşikleri
14. **Dağıtım rehberi** — Oracle A1 kurulumu, Cloudflare yapılandırması, `/fms` alt yol ayarları

**Onayınızla prompt üretimine geçiyorum.**
