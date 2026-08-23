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
| Veritabanı | **Kendi sunucumuzda Postgres 16** | 200 GB disk içinde | ✅ Yönetilen ücretsiz Postgres'ler (Supabase 500 MB, Neon 0.5 GB) **yetersiz** |
| Redis | Kendi sunucumuzda | — | ✅ |
| Frontend | Cloudflare Pages | Sınırsız istek, 500 build/ay | ✅ |
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
Veritabanı:    PostgreSQL 16 + Drizzle ORM
Kuyruk:        BullMQ + Redis
Realtime:      Server-Sent Events (SSE)
Auth:          Supabase Auth (self-hosted) veya local JWT+argon2
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

**Performans Bütçesi (ihlal = faz kapanmaz):**

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
- [ ] **1.6** `arch:check` — katman yönü, engine yasakları, `console.log`, mutlak yol.
      **`scripts/` için DAR muafiyet:** yalnızca `process.stderr.write`/`process.stdout.write` serbest;
      `console.log` her yerde yasak, katman kuralları `scripts/**`e aynen uygulanır. Muafiyetin
      gerekçesi config içinde yorum olarak yazılır. (Türkçe metin kuralı Faz 5'e kadar no-op.)
      **Ayrıca import yolu harf duyarlılığı denetimi:** her göreli import yolu diskteki gerçek
      dosya adıyla birebir eşleşmeli. Windows duyarsız, üretim Linux/ARM64 duyarlı —
      `forceConsistentCasingInFileNames` bunu yakalamaz (bkz. `docs/ADR/0004`).
- [ ] **1.7** Docker Compose (Postgres 16, Redis 7, adminer) + ARM64 — **PostgreSQL majörü Docker Hub'dan doğrulanacak, tahminle yazılmayacak**
- [ ] **1.8** `/fms` uçtan uca kanıtı — minimal web + api. **NestJS 11 / Express 5 joker rota (`/*splat`) ve `setGlobalPrefix` bilinen sorunu açıkça test edilir; CORS'ta PUT/PATCH/DELETE tanımlanır. Rolldown çıktısı "derlendi" ile geçilmez, gerçekten servis edilip `/fms` altında çalıştığı doğrulanır.**
- [ ] **1.9** GitHub Actions CI — lint→typecheck→test→build, buildx amd64+arm64 (native ARM runner). **Node sürümü `pnpm install`'dan ÖNCE kontrol edilir (`actions/setup-node` + `.nvmrc`); yerel `preinstall` kapısı ikinci savunma hattıdır.**
- [ ] **1.10** Belgeler + faz kapanışı — ADR 0001/0002, `docs/DEPENDENCY-WATCH.md`, `docs/HOSTING-FALLBACK.md` iskeleti, README "Geliştirme Ortamı" bölümü + PROMPT-KITAPCIGI atfının kaldırılması, spec düzeltmeleri (Ç1/Ç2/Ç4/Ç5/Ç6), push koruması testi, `PROJECT_MEMORY.md` faz kaydı

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
- [ ] `docker compose up` → Postgres ve Redis sağlıklı
- [x] `pnpm install && pnpm build` → tüm paketler hatasız derleniyor *(1.2 — 8 paket, turbo FULL TURBO cache)*
- [x] `pnpm typecheck` → 0 hata *(1.2 — tsconfig types kapısı dahil)*
- [ ] Kasıtlı bir tip hatası eklenince CI kırmızıya dönüyor (kanıtla)
- [ ] Eksik `.env` değişkeniyle uygulama **açılmıyor** ve net hata mesajı veriyor
- [ ] `docker buildx` hem amd64 hem arm64 imajı üretiyor, ikisi de çalışıyor
- [ ] Uygulama `/fms` alt yolunda çalışıyor; `PUBLIC_BASE_PATH` değiştirilince her yer uyuyor
- [ ] Kodda mutlak yol yazılınca ESLint hata veriyor
- [ ] Repo'ya sır push edilmeye çalışılınca GitHub push koruması engelliyor

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

**Ana dosyalar:**
```
packages/shared/src/logger.ts
packages/shared/src/errors.ts
packages/shared/src/debug-trace.ts
packages/shared/src/assert.ts
packages/shared/src/perf.ts
apps/api/src/common/filters/global-exception.filter.ts
apps/api/src/common/middleware/correlation.middleware.ts
apps/web/src/components/dev/DebugPanel.tsx
apps/web/src/components/ErrorBoundary.tsx
```

**Kabul kriterleri:**
- [ ] Kasıtlı bir hata fırlat → Sentry'de `correlationId` ile görünüyor
- [ ] Aynı `correlationId` ile frontend ve backend logları eşleşiyor
- [ ] Debug paneli açılıyor ve canlı log akışı gösteriyor
- [ ] `assertInvariant` dev'de fırlatıyor, prod build'de loglayıp devam ediyor
- [ ] Performans sarmalayıcısı bütçe aşımında uyarı basıyor

**Bağımlılık:** Faz 1
**Risk:** Aşırı loglama performansı düşürür → log seviyesi ortam değişkeniyle kontrol edilsin.

---

## FAZ 3 — Veritabanı Şeması I: Dünya Çekirdeği

**Hedef:** Ülke, lig, kulüp, stadyum, turnuva yapılarının değişmez (immutable) master şeması.

**Kapsam:**
- Drizzle şema tanımları + migration altyapısı
- **Tablolar:** `countries`, `confederations`, `competitions` (lig/kupa/turnuva ortak), `competition_seasons`, `competition_rules` (JSONB: küme düşme sayısı, play-off, yabancı kotası, kadro limiti), `clubs`, `club_reputations`, `stadiums`, `club_facilities`, `club_colors`, `kit_templates`, `club_kits`, `rivalries`, `referees`, `federations`
- **Master/Delta ayrımı temeli:** her master tablo `is_master = true`, salt-okunur işaretli
- İndeksler: `clubs(competition_id)`, `competitions(country_id)`, arama için `pg_trgm` GIN indeksi
- Seed betiği iskeleti (`tools/data-cli/seed.ts`)
- ER diyagramı → `docs/schema/world.md` (mermaid)

**Kabul kriterleri:**
- [ ] Migration ileri ve geri çalışıyor (`up` / `down`)
- [ ] 6 ülke + 6 lig + 5 UEFA/yerel kupa örnek verisiyle seed başarılı
- [ ] Tüm yabancı anahtarlar ve `ON DELETE` davranışları tanımlı
- [ ] `EXPLAIN ANALYZE` ile temel sorgular < 20 ms
- [ ] Şema dokümanı ve mermaid diyagramı üretildi

**Bağımlılık:** Faz 1, 2

---

## FAZ 4 — Veritabanı Şeması II: Oyuncu, Sözleşme, Personel

**Hedef:** Oyunun canlı varlıklarının şeması + delta kayıt için hazırlık.

**Kapsam:**
- **Tablolar:** `people` (oyuncu/personel/menajer ortak kimlik), `players`, `player_attributes` (47 görünür), `player_hidden_attributes` (8 gizli), `player_positions` (mevki yetkinlik matrisi), `player_traits`, `player_personalities`, `player_relationships`, `player_career_history`, `player_injuries`, `injury_types`, `contracts`, `contract_clauses`, `staff`, `staff_attributes`, `staff_roles`, `managers`, `manager_attributes`, `manager_career`
- CA/PA alanları: `current_ability` (1–200), `potential_ability` (1–200), `pa_range_min/max` (belirsizlik için)
- `player_attributes` tasarımı: **tek satır, 47 sütun** (JSONB değil — sorgu ve filtre performansı için kritik, transfer arama bunun üzerinde çalışacak)
- İndeksler: transfer aramasında kullanılacak kompozit indeksler (`position`, `age`, `current_ability`, `value`)
- Bölümleme (partitioning) değerlendirmesi: `player_career_history` yıla göre

**Kabul kriterleri:**
- [ ] 5.000 sahte oyuncu seed → şema tutarlı
- [ ] "20–24 yaş, sağ bek, CA>120, değer<15M" sorgusu < 50 ms
- [ ] Tüm nitelikler 1–20 aralığında CHECK kısıtıyla korunuyor
- [ ] CA/PA ilişkisi CHECK ile korunuyor (`CA <= PA`)
- [ ] Şema dokümanı güncellendi

**Bağımlılık:** Faz 3
**Risk:** 47 sütunlu tablo genişliği → `player_attributes` ayrı tabloda, `players` ile 1:1.

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

**Kabul kriterleri:**
- [ ] Storybook'ta 30+ bileşen, her biri koyu/açık temada çalışıyor
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

**Kabul kriterleri:**
- [ ] Sağlayıcı sırası config'den değişiyor, kod değişmiyor
- [ ] Bir sağlayıcı hata verince zincir bir sonrakine geçiyor, oyun çalışmaya devam ediyor
- [ ] `DATA_MODE=full` + paket varken zincir LocalPack'i birinci sırada kullanıyor
- [ ] Tüm sağlayıcılar kapalıyken `ProceduralProvider` devreye giriyor ve tam bir dünya üretiyor
- [ ] Her varlığın `source` alanı doğru dolduruluyor (`pack` | `api` | `wikidata` | `procedural`)
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

**Kabul kriterleri:**
- [ ] 6 lig, 118+ kulüp, 20+ turnuva veritabanında
- [ ] Her kulübün arması ve 3 rengi mevcut (eksikse prosedürel üretilmiş)
- [ ] `data-cli stats` → eksik varlık oranı < %5
- [ ] Her ligin kural seti JSON şemasına uygun ve doğrulanmış
- [ ] Derbi tablosu en az 30 rekabet içeriyor
- [ ] Kulüp arama (pg_trgm) Türkçe karakterle çalışıyor ("besiktas" → "Beşiktaş")

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
- **8 gizli nitelik:** Tutarlılık, Önemli Maç, Sakatlığa Yatkınlık, Kirli Oyun, Baskı Altında, Profesyonellik, Hırs, Sadakat — kariyer geçmişi + disiplin + kulüp değiştirme sıklığı + sakatlık geçmişinden türetilir
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
- **Snapshot sıkıştırma:** delta sayısı 50.000'i aşınca mevcut durum tek JSONB blob'a yazılır, delta temizlenir
- **Otomatik kayıt:** her ayın 1'i + her 5 turda bir + manuel (S48)
- **Snapshot noktaları:** sezon başı otomatik + kullanıcının 1 manuel noktası
- Kayıt slotları: 3 slot, her slot bağımsız
- **Kayıt bütünlüğü doğrulayıcısı (`validateSave`):** her otomatik kayıtta çalışır — kadro sayısı, negatif bütçe, yetim referans, çift kayıt, tarih tutarlılığı
- Kayıt sıkıştırma (gzip) + boyut telemetrisi

**Kabul kriterleri:**
- [ ] 1 sezon oynanmış kayıt < 500 KB
- [ ] 10 sezon oynanmış kayıt < 8 MB
- [ ] `WorldView` okuması < 5 ms (önbellekli)
- [ ] Master'a doğrudan yazma denemesi **derlenmiyor** (tip hatası)
- [ ] Snapshot sıkıştırma sonrası dünya durumu birebir aynı (100 alan karşılaştırma testi)
- [ ] `validateSave` bozuk kaydı yakalıyor ve hangi varlıkta olduğunu söylüyor
- [ ] 3 kayıt slotu birbirini etkilemiyor

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
- **Klavye kısayolları:** `Space` devam et, `1-9` bölüm, `/` arama, `Esc` kapat, `Ctrl+S` manuel kayıt
- Bildirim sistemi (toast + rozet)
- Ekran geçiş animasyonları (ölçülü, "hareketi azalt" ayarına saygılı)
- Yükleme durumları (skeleton)

**Kabul kriterleri:**
- [ ] 12 bölüm arasında gezinme masaüstü ve mobilde sorunsuz
- [ ] Inbox 500 mesajda akıcı, filtre < 100 ms
- [ ] Arama "besiktas" yazınca "Beşiktaş" buluyor, sonuç < 150 ms
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
- CPU / RAM / kuyruk metrikleri, son 24 saat grafiği
- **Ücretsiz kademe uyarı eşikleri:** herhangi bir sınırın %80'ine gelince panelde ve e-postayla uyarı

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
- [ ] Telemetri gerçek değerleri gösteriyor; %80 eşiğinde uyarı tetikleniyor
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

**Kabul kriterleri:**
- [ ] Her ekran 360px'de yatay taşma olmadan kullanılabilir
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
- **Yük testi:** eşzamanlı 5 kayıt, 100 tur atlama
- **Hata denetimi:** Sentry'de biriken tüm hataların temizlenmesi
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
- [ ] **Geri yükleme tatbikatı yapılmış** — sıfır sunucudan tam geri yükleme başarılı, süresi belgelenmiş
- [ ] Dengeli modda 20 kullanıcı eşzamanlı oynarken sistem stabil (CPU < %80, kuyruk < 20 sn)
- [ ] Aylık maliyet **$0** — tüm servisler ücretsiz kademede, hiçbir sınır aşılmıyor
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
