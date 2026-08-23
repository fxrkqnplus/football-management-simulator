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
| **Aktif faz / alt görev** | **Faz 1 — 1.7 sırada** |
| **Son tamamlanan** | Faz 1, alt görev **1.6** — `arch:check` mimari denetimi |
| **Tamamlanma tarihi** | 2026-08-24 |
| **Genel ilerleme** | Faz 0/50 kapandı · Faz 1'in **6/10** alt görevi bitti |
| **Bloke eden var mı?** | Hayır |
| **Son commit** | `chore(arch): mimari denetim — katman yönü, motor saflığı, import harf duyarlılığı` — `feature/faz-01-monorepo`, push edildi |
| **Dallar** | `main` → `develop` → `feature/faz-01-monorepo` (üçü de origin'de) |
| **typecheck** | ✅ 8/8 paket, 0 hata |
| **lint** | ✅ 0 hata (soğuk 3,0 sn / sıcak 1,7 sn) |
| **build** | ✅ 8/8 paket |
| **test** | ✅ **64 test / 4 dosya** (21 birim + 23 ESLint kuralı + 20 arch:check) |
| **kapsam** | ✅ Satır %92,7 · İfade %91,8 · Dal %82,7 · Fonksiyon %85,7 |
| **arch:check** | ✅ **0 ihlal, ~54 ms** — beş kural da negatif testle doğrulandı |
| **Açık sorun sayısı** | 0 |
| **Teknik borç sayısı** | 2 — BORÇ-001, BORÇ-002 (ikisi de Faz 16 vadeli) |

**Sıradaki oturumda ilk yapılacak:**
1. `docs/ROADMAP.md` → Faz 1 alt görev listesi, madde **1.7**
2. `pnpm install` → `typecheck` → `lint` → `test` → `build` → `arch:check`
3. `docs/spec/10-deployment.md` §13.1 oku (üretim ortamı, ARM64)
4. **PostgreSQL majörünü Docker Hub'dan DOĞRULA** — tahminle yazma (ROADMAP 1.7 notu)
5. `docker compose up` → Postgres ve Redis sağlıklı olmalı (kabul kriteri)

**1.7 kapsamı:**
- `docker-compose.yml` (Postgres, Redis 7, adminer) + healthcheck'ler
- Tüm imajlar `linux/arm64` uyumlu olmalı — üretim Oracle Ampere A1
- `docker-compose.prod.yml` iskeleti
- Docker Desktop + WSL2 hazır, `buildx ls` çıktısında `linux/arm64` destekleniyor

**Faz 1'de kilitlenen kararlar (değiştirmeden önce oku):**
- TypeScript `~6.0.3`, `^` **yasak** → `docs/ADR/0003`
- Node 24.19.0 tek hat; kapı `scripts/check-node-version.mjs`
- Windows geliştirme ↔ Linux/ARM64 üretim → `docs/ADR/0004` *(§2 Faz 1.6'da ölçümle düzeltildi)*
- Alt yol tek kaynağı: `packages/shared/src/base-path.ts`
- **`coverage.include` silinmez** — silinirse kapsam eşikleri sessizce yalan söyler
- **ESLint ↔ arch:check iş bölümü** (`docs/spec/09` §11.5): hiçbir kural iki yerde denetlenmez
- `lint`, `test` ve `arch:check` turbo'dan geçmez; `build` ve `typecheck` paket başına
- Sürüm takibi: `docs/DEPENDENCY-WATCH.md` — her faz başında okunur
- Rapor formatı: `docs/OUTPUT-FORMAT.md` — her alt görev sonunda

**Bilinen kayıt düzeltmeleri:**

> ⚠️ **DÜZELTME (Faz 1):** Faz 0 kaydının 9. başlığı `docs/PROMPT-KITAPCIGI.md`
> dosyasını `[YENİ]` olarak listeliyor. Bu dosya repoda **yok** ve kasıtlı olarak
> repo dışında tutuluyor. Faz 0 kaydı append-only olduğu için değiştirilmedi.

> ⚠️ **DÜZELTME (Faz 1.6):** `docs/ADR/0004` §2'nin ilk sürümü
> "`forceConsistentCasingInFileNames` tek ve tutarlı ama yanlış harfli bir yazımı
> yakalamaz" diyordu. Ölçüldü ve **yanlış** çıktı: `include: ["src/**/*"]` gerçek
> dosyayı zaten programa aldığı için TS1149 tetikleniyor. Gerçek boşluk yalnızca
> `.mjs`/`.js` dosyalarında. ADR düzeltildi, `arch:check` kuralı birincil değil
> **tamamlayıcı** savunma olarak konumlandırıldı.

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
| SAPMA-004 | 1 | `PROJECT_MEMORY.md` ANLIK DURUM bloğunun güncelleme sıklığı **faz başınadan alt görev başına** çekildi. Tam faz kaydı (11 başlık) ve kütükler değişmedi. | Bloğun tek amacı oturum kurtarma; kurtarmaya ihtiyaç duyulan an tam olarak faz ortası. On alt görevlik bir fazda blok yalnızca sonda yazılırsa, faz ortasında kopan oturum yapılan işi göremez — nitekim 1.4 sonunda dosya kendi içinde çelişiyordu (blok "Faz 0, 0 teknik borç" derken kütükte iki BORÇ kayıtlıydı). | ✅ `docs/spec/11-project-memory.md` §12.1/§12.3, `CLAUDE.md` K15, `docs/SESSION-TEMPLATE.md`, `docs/OUTPUT-FORMAT.md` |
| SAPMA-003 | 1 | Teknoloji yığını sürümleri (`CLAUDE.md` §2.1) 2024 bilgisiyle kilitlenmişti; 2026-08-23'te npm registry doğrulamasıyla bugüne çekildi. TypeScript bilinçli olarak en yeni majöre (7.0.2) **çıkarılmadı**, `~6.0.3` ile pinlendi. `ioredis`/`bullmq` taze majörleri alınmadı (BORÇ-001, BORÇ-002). | TS 7.0 programatik derleyici API'si olmadan yayınlandı — kanıt: `typescript-eslint` peer aralığı `>=4.8.4 <6.1.0` ve `nest build`'in `createProgram()` çağrısı. `^6.0.3` yazılırsa pnpm 6.1.0'a çıkıp peer aralığının dışına taşar, bu yüzden `~`. TS 7.1 (programatik API) sonrası yeniden değerlendirilecek. | ✅ `CLAUDE.md` §2.1, `docs/ADR/0003-typescript-surum-kilidi.md`, `docs/spec/09-quality-protocol.md` §11.4 |
| SAPMA-002 | Spec yazımı | Veri modeli "prosedürel birincil" → "gerçek birincil" (`DATA_MODE=full` varsayılan). KVKK/GDPR zorunludan koşullu hale geldi (`SERVER_MODE=public` ise). | Proje herkese açık yayınlanmayacak, kişisel kurulum. Sunucu Özel modda açılır, yalnızca izin listesi oynar. Gerçek veri estetik kalite için gerekli. | ✅ `CLAUDE.md` K9, `docs/spec/12-data-packs.md`, ROADMAP Faz 8/9/13 |
| SAPMA-001 | Spec yazımı | Gizli nitelik sayısı 8 → 10 (`adaptability`, `temperament` eklendi) | Faz 34'teki yabancı lig uyum süreci ve Faz 44'teki diyalog tepki sistemi bu ikisi olmadan kurulamıyordu | ✅ `docs/spec/02-attributes.md` Bölüm 4.1 |

---

# 📋 FAZ KAYITLARI

> En yeni kayıt en üstte. Yeni faz kaydı buraya, bu satırın hemen altına eklenir.

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
