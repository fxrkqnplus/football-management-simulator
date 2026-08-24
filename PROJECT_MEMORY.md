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
| **Aktif faz / alt görev** | **Faz 2 — henüz başlanmadı** |
| **Son tamamlanan** | ✅ **FAZ 1 — Monorepo, Araç Zinciri ve Kalite Kapıları** (10/10 alt görev) |
| **Tamamlanma tarihi** | 2026-08-24 |
| **Genel ilerleme** | **1 / 50 faz (%2)** |
| **Bloke eden var mı?** | Hayır |
| **Son commit** | `docs(memory): Faz 1 kaydı ve kapanış` — `feature/faz-01-monorepo` |
| **Dallar** | `main` → `develop` → `feature/faz-01-monorepo` · **PR açık: develop'a** |
| **CI** | ✅ yeşil — amd64 + arm64, ~1 dk 27 sn |
| **typecheck / lint / format** | ✅ |
| **test** | ✅ 70 test / 4 dosya |
| **kapsam** | ✅ satır %92,7 · ifade %91,8 · dal %82,7 · fonksiyon %85,7 |
| **arch:check** | ✅ 0 ihlal (~54 ms) |
| **docker compose** | ✅ postgres + redis healthy |
| **uygulama** | ✅ `/fms/` 200 · `/fms/api/health` 200 |
| **Açık sorun sayısı** | 0 |
| **Teknik borç sayısı** | 2 — BORÇ-001, BORÇ-002 (Faz 16) |

**Sıradaki oturumda ilk yapılacak — FAZ 2:**
1. Bu bloğu ve **Faz 1 kaydını** oku (özellikle §11 devir teslim)
2. `docs/ROADMAP.md` → Faz 2 bölümü
3. `docs/DEPENDENCY-WATCH.md` → **Faz 2'ye bağlı üç satır var:** `pnpm` 11.23.0,
   `pino` 10, `@sentry/*` 10 (üçü de majör atlama, notlar okunmadı)
4. `docs/spec/09-quality-protocol.md` §11.1 (gözlemlenebilirlik zinciri) ve §11.2 (`debugTrace`)
5. `CLAUDE.md` K7 (her hesaplama gerekçe üretir) ve K8 (`console.log` yasak)
6. Kapılar: `pnpm install` → `typecheck` → `lint` → `test` → `build` → `arch:check`
7. Faz 2 kapsamını özetle, alt görevlere böl, **listeyi ROADMAP'e yaz** (K11), onay al

**⚠️ FAZ 2'DE MUTLAKA KONTROL EDİLECEK — 1.8'den taşınan risk:**
`@fms/shared` barrel'ı sunucu modüllerini tarayıcı paketine taşıyordu; Zod ve env
şeması istemciye sızmıştı. `sideEffects: false` ile çözüldü. **Faz 2'de `logger`
(pino, Node-only) aynı pakete giriyor — sorun daha büyük ölçekte tekrar edebilir.**
Faz 2 sonunda `apps/web/dist/assets/*.js` içinde pino veya Node modülü var mı bak;
gerekirse `@fms/shared/server` alt yol dışa aktarımına geç.

Ayrıca Faz 2'de kapatılacak dört TODO:
- `packages/shared/src/env.ts` — iki `process.stderr.write` → `logger.warn`
- `packages/shared/src/base-path.ts` — `TypeError` → `ValidationError` (`errors.ts`)
- `apps/web` `types: []` korunmalı: logger eklenince tarayıcı Node tipi görmemeli
- `arch:check` `console.log`'u **tekrarlamayacak** (iş bölümü `spec/09` §11.5)

**Faz 1'de kilitlenen kararlar (değiştirmeden önce oku):**
- TypeScript `~6.0.3`, `^` **yasak** → `docs/ADR/0003`
- Monorepo ve turbo kapsamı → `docs/ADR/0001` (lint/test/arch kökte, build/typecheck paket başına)
- Alt yol tek kaynağı ve ölçülen tuzaklar → `docs/ADR/0002`
- Windows ↔ Linux/ARM64 ayrışması → `docs/ADR/0004`
- **`.env` içinde `NODE_ENV` TUTULMAZ** → `scripts/check-env-file.mjs`
- **`coverage.include` silinmez** — silinirse kapsam eşikleri sessizce yalan söyler
- **`packages/shared` `sideEffects: false`** kalmalı
- **Postgres healthcheck'i `pg_isready` DEĞİL** (`psql -c 'SELECT 1'`)
- **Express 5 joker rota** sessizce dönüştürülür → `*splat` elle yazılır (SAPMA-006)
- CI'da `PUBLIC_BASE_PATH` workflow `env:` bloğundan gelir
- Commit alt görev başına, PR faz başına · Rapor formatı `docs/OUTPUT-FORMAT.md`
- Alt görev listesi onaylanır onaylanmaz ROADMAP'e yazılır (K11)

**Çalışan sistemi ayağa kaldırma:**
```
docker compose up -d
node --env-file=.env apps/api/dist/main.js      # :3001
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

> ℹ️ `docs/MASTER-SPEC.md` **donmuş arşivdir, otorite değildir.** Bölme öncesi
> hâlini korur; sonraki faz kararları orada yoktur.

---

## 🔴 AÇIK SORUNLAR KÜTÜĞÜ

| ID | Faz | Açıklama | Öncelik | Durum | Çözüldüğü faz |
|---|---|---|---|---|---|
| — | — | _Henüz açık sorun yok_ | — | — | — |

---

## 🟡 TEKNİK BORÇ KÜTÜĞÜ

| ID | Faz | Borç | Neden ertelendi | Ödenmesi gereken faz |
|---|---|---|---|---|
| BORÇ-001 | 1 | `ioredis` 5.11.1'de tutuldu; 6.0.0 alınmadı | 6.0.0 kurulum anında 3 haftalıktı. Faz 16 (tur motoru) projenin en riskli fazı — orada "bu kütüphane regresyonu mu, benim idempotency mantığım mı?" sorusuyla uğraşmanın maliyeti günlerle ölçülür; ertelemenin maliyeti bir minor bump. | **16** — faz açılışında changelog okunup karar verilecek |
| BORÇ-002 | 1 | `bullmq` 5.81.3'te tutuldu; 6.2.0 alınmadı | Aynı gerekçe (BORÇ-001). Ek olarak bullmq 6 `ioredis`'i peer'a taşıdı ve `pg`/`redis` peer'ları ekledi — kuyruk yapılandırmasını değiştiren bir mimari değişiklik, Faz 16'da bilinçli ele alınmalı. | **16** — faz açılışında changelog okunup karar verilecek |

---

## 🔵 SPESİFİKASYON SAPMALARI

> Spesifikasyondan veya yol haritasından sapılan her nokta. **Asla silinmez.**

| ID | Faz | Sapma | Gerekçe | Spec güncellendi mi |
|---|---|---|---|---|
| SAPMA-006 | 1 | *"Express 5 joker rota sözdizimi katılaştı; `/*` geçersiz"* varsayımı **kısmen yanlış** çıktı: NestJS 11'de eski sözdizimi uygulamayı çökertmiyor. | Ölçüm: `@Get('echo/*')` ile uygulama **başarıyla açıldı**. `LegacyRouteConverter` devreye girip `WARN Unsupported route path ... Attempting to auto-convert to "{*path}"` basıyor ve rotayı otomatik çeviriyor. Tuzak "patlayan" değil "sessizce dönüştürülen" cinsten — log okunmazsa fark edilmez ve dönüştürülmüş desen niyetten sapabilir. Doğru sözdizimi (`*splat`) elle yazılır, otomatik dönüştürücüye güvenilmez. | ✅ `apps/api/src/health.controller.ts` (ölçüm yorumda), `docs/ROADMAP.md` Faz 1 madde 1.8 |
| SAPMA-005 | 1 | `docs/ADR/0004` §2'deki *"`forceConsistentCasingInFileNames` tek ve tutarlı ama yanlış harfli bir yazımı yakalamaz"* iddiası **ölçümle çürütüldü**. Gerçek boşluk yalnızca `.mjs`/`.js` dosyalarında. | `packages/shared/src/CasingProbe.ts` oluşturulup `./casingprobe.js` diye import edildi: `tsc` **TS1149** ile yakaladı (`include: ["src/**/*"]` gerçek dosyayı zaten programa aldığı için yanlış import ikinci bir yazım üretiyor). Aynı deney `.mjs` ile tekrarlandı: `typecheck` göremedi, Node çalıştırdı, yalnızca `arch:check` yakaladı. `arch:check` kuralı birincil değil **tamamlayıcı** savunma olarak konumlandırıldı. | ✅ `docs/ADR/0004` §2 (ölçüm tablosu + üç hatlı model), `docs/ROADMAP.md` Faz 1 madde 1.6 |
| SAPMA-004 | 1 | `PROJECT_MEMORY.md` ANLIK DURUM bloğunun güncelleme sıklığı **faz başınadan alt görev başına** çekildi. Tam faz kaydı (11 başlık) ve kütükler değişmedi. | Bloğun tek amacı oturum kurtarma; kurtarmaya ihtiyaç duyulan an tam olarak faz ortası. On alt görevlik bir fazda blok yalnızca sonda yazılırsa, faz ortasında kopan oturum yapılan işi göremez — nitekim 1.4 sonunda dosya kendi içinde çelişiyordu (blok "Faz 0, 0 teknik borç" derken kütükte iki BORÇ kayıtlıydı). | ✅ `docs/spec/11-project-memory.md` §12.1/§12.3, `CLAUDE.md` K15, `docs/SESSION-TEMPLATE.md`, `docs/OUTPUT-FORMAT.md` |
| SAPMA-003 | 1 | Teknoloji yığını sürümleri (`CLAUDE.md` §2.1) 2024 bilgisiyle kilitlenmişti; 2026-08-23'te npm registry doğrulamasıyla bugüne çekildi. TypeScript bilinçli olarak en yeni majöre (7.0.2) **çıkarılmadı**, `~6.0.3` ile pinlendi. `ioredis`/`bullmq` taze majörleri alınmadı (BORÇ-001, BORÇ-002). | TS 7.0 programatik derleyici API'si olmadan yayınlandı — kanıt: `typescript-eslint` peer aralığı `>=4.8.4 <6.1.0` ve `nest build`'in `createProgram()` çağrısı. `^6.0.3` yazılırsa pnpm 6.1.0'a çıkıp peer aralığının dışına taşar, bu yüzden `~`. TS 7.1 (programatik API) sonrası yeniden değerlendirilecek. | ✅ `CLAUDE.md` §2.1, `docs/ADR/0003-typescript-surum-kilidi.md`, `docs/spec/09-quality-protocol.md` §11.4 |
| SAPMA-002 | Spec yazımı | Veri modeli "prosedürel birincil" → "gerçek birincil" (`DATA_MODE=full` varsayılan). KVKK/GDPR zorunludan koşullu hale geldi (`SERVER_MODE=public` ise). | Proje herkese açık yayınlanmayacak, kişisel kurulum. Sunucu Özel modda açılır, yalnızca izin listesi oynar. Gerçek veri estetik kalite için gerekli. | ✅ `CLAUDE.md` K9, `docs/spec/12-data-packs.md`, ROADMAP Faz 8/9/13 |
| SAPMA-001 | Spec yazımı | Gizli nitelik sayısı 8 → 10 (`adaptability`, `temperament` eklendi) | Faz 34'teki yabancı lig uyum süreci ve Faz 44'teki diyalog tepki sistemi bu ikisi olmadan kurulamıyordu | ✅ `docs/spec/02-attributes.md` Bölüm 4.1 |

---

# 📋 FAZ KAYITLARI

> En yeni kayıt en üstte. Yeni faz kaydı buraya, bu satırın hemen altına eklenir.

---

### FAZ 1 — Monorepo, Araç Zinciri ve Kalite Kapıları
**Tarih:** 2026-08-23 → 2026-08-24 · **Süre:** 2 gün · **Durum:** ✅ Tamamlandı
**Dal:** `feature/faz-01-monorepo` · **Commit aralığı:** `cb5adcd..HEAD` (18 commit)

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
