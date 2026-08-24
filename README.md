# Football Management Simulator

Web tabanlı, Türkçe, 2 boyutlu, tur tabanlı futbol menajerlik simülasyonu.
Football Manager 26 referans alınmıştır.

**Hedef:** `https://fxrkqn.org/fms` · Kişisel kurulum · Ücretsiz · Reklamsız
**Veri:** Gerçek kulüpler, oyuncular, armalar, formalar, stadyumlar (`DATA_MODE=full`)

---

## 🧑‍💻 Geliştirme Ortamı

| Araç | Sürüm | Not |
|---|---|---|
| Node.js | **24.19.0** | Tek kaynak `.nvmrc`; yanlış sürümde `pnpm install` durur |
| pnpm | **11.22.0** | corepack üzerinden, `packageManager` alanından okunur |
| Docker | Desktop + WSL2 | Postgres/Redis ve çok mimarili imajlar için |
| Kabuk | PowerShell 7 (pwsh) | Windows PowerShell 5.1 `&&` desteklemiyor |

Üretim **Linux/ARM64** (Oracle Ampere A1); geliştirme Windows/x64.
Ayrışmalar ve karşı önlemler: `docs/ADR/0004-gelistirme-ortami.md`.

### Sıfırdan kurulum

```bash
# 1. Node 24 (nvm-windows veya fnm)
nvm install 24.19.0
nvm use 24.19.0

# 2. pnpm (corepack ile, global kurulum gerekmez)
corepack enable

# 3. Bağımlılıklar
pnpm install

# 4. Ortam değişkenleri — .env ASLA commit edilmez
cp .env.example .env
# JWT_SECRET'ı doldurun:  openssl rand -base64 48

# 5. Veri katmanı
docker compose up -d          # postgres + redis + adminer

# 6. Kalite kapıları
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm arch:check
```

### Uygulamayı çalıştırma

```bash
node --env-file=.env apps/api/dist/main.js      # API  → http://localhost:3001/fms/api/health
pnpm --filter @fms/web exec vite preview        # Web  → http://localhost:3000/fms/
```

### Bilinmesi gerekenler

- Uygulama **`/fms` alt yolunda** çalışır. Kodda mutlak yol yazılmaz;
  `basePath()` kullanılır (ESLint zorlar). Ayrıntı: `docs/ADR/0002`.
- `.env` içine **`NODE_ENV` yazılmaz** — Vite onu üretim kararına uygular ve
  React'in geliştirme sürümü üretim paketine girer. Kapı: `scripts/check-env-file.mjs`.
- Her oturum `CLAUDE.md` (anayasa) + `PROJECT_MEMORY.md` (ANLIK DURUM) okuyarak başlar.

> **Not:** İlk oturum ve faz başlatma promptları repo dışında tutulur.

---

## 📁 Belge Yapısı

```
CLAUDE.md                     Anayasa (14 değişmez kural), teknoloji yığını, terim sözlüğü
PROJECT_MEMORY.md             Oturumlar arası devir teslim — her faz sonunda yazılır
CHANGELOG.md                  Sürüm geçmişi

docs/
├── ROADMAP.md                50 faz + 14 fazlık v2 kasası
├── SESSION-TEMPLATE.md       Oturum akışı + faz→spec eşlemesi
├── V2-BACKLOG.md             Kapsam dışı fikirler (v1'de YAPILMAZ)
├── OUTPUT-FORMAT.md          Alt görev rapor formatı (zorunlu)
├── DEPENDENCY-WATCH.md       Sürüm takip listesi — her faz başında okunur
├── HOSTING-FALLBACK.md       Yedek barındırma planı (İSKELET)
├── ADR/                      Mimari karar kayıtları (0001-0004)
├── MASTER-SPEC.md            Tüm spesifikasyonun tek dosyalık arşivi
└── spec/
    ├── 01-database.md        ~45 tablo, Drizzle şeması, Master/Delta mimarisi
    ├── 02-attributes.md      47 görünür + 10 gizli nitelik, CA/PA, türetme formülleri
    ├── 03-match-engine.md    Tik döngüsü, xG modeli, duran toplar, denge hedefleri
    ├── 04-ai-scoring.md      Kadro seçimi, transfer, yönetim güveni, gelişim motoru
    ├── 05-design-system.md   Renk/tipografi token'ları, 17 gol animasyonu, ses katmanları
    ├── 06-dialogue.md        80 diyalog durumu, ton matrisi, soyunma odası
    ├── 07-country-rules.md   GBE puan tablosu, yabancı kotaları, UEFA listeleri
    ├── 08-admin-panel.md     Sunucu modları, yönetim paneli, anomali kuralları
    ├── 09-quality-protocol.md Gözlemlenebilirlik, test katmanları, invariantlar
    ├── 10-deployment.md      Oracle Cloud, Cloudflare, yedekleme, ücretsiz kademe takibi
    ├── 11-project-memory.md  Hafıza sisteminin kuralları ve şablonu
    └── 12-data-packs.md      Veri paketi formatı, gerçek varlık hattı, portre tutarlılığı
```

---

## 🧭 Çalışma Prensibi

| | |
|---|---|
| **Faz sayısı** | 50 (v1) + 14 (v2 kasası) |
| **Faz süresi** | 1–3 gün (aşarsa ikiye bölünür) |
| **Ritim** | Tek seferde tek alt görev, her birinden sonra kullanıcı onayı |
| **Faz kapanışı** | Kabul kriterleri + tüm kalite kapıları + `PROJECT_MEMORY.md` kaydı |
| **Öncelik sırası** | 1. Transfer/kadro derinliği 2. Hatasızlık 3. AI/diyalog 4. UI/UX |

---

## 🛠 Teknoloji Yığını

**Frontend** React 19 · TypeScript · Vite · Tailwind 4 · shadcn/ui · Zustand · TanStack Query/Table · PixiJS · Howler · i18next
**Backend** NestJS · Drizzle ORM · PostgreSQL 16 · Redis · BullMQ · Zod · Pino
**Kalite** Vitest · Playwright · ESLint · Sentry · GitHub Actions
**Altyapı** Oracle Cloud Always Free (ARM64) · Cloudflare (Pages, R2, Turnstile) · Resend

Aylık maliyet hedefi: **$0**

---

## 🎨 Veri ve Görseller

Oyun **gerçek veriyle** çalışır: gerçek kulüp isimleri ve armaları, gerçek oyuncu isimleri
ve fotoğrafları, gerçek formalar, stadyumlar, lig ve kupa logoları, ülke bayrakları.

Veri `/data/packs/` altındaki **veri paketlerinden** yüklenir. Tam format ve içe aktarma
akışı: `docs/spec/12-data-packs.md`

| Ayar | Değer | Anlamı |
|---|---|---|
| `DATA_MODE` | **`full`** (varsayılan) | Gerçek veri birincil, prosedürel yalnızca yedek |
| | `clean` | Tümüyle prosedürel/jenerik |
| `PORTRAIT_STYLE` | **`stylized`** (önerilen) | Gerçek ve prosedürel portreler aynı görsel dilde |
| | `real` | Gerçek fotoğraflar olduğu gibi |
| | `procedural` | Herkes vektör avatar |
| `SERVER_MODE` | **`private`** (varsayılan) | Yalnızca izin listesindeki hesaplar oynar |
| | `public` | Herkese açık (KVKK metinleri aktive olur) |

**Prosedürel üretim kaybolmaz** — newgen oyuncular (5. sezondan itibaren gelen üretilmiş
oyuncular) ve pakette eksik kalan varlıklar için her zaman gerekli. `PORTRAIT_STYLE=stylized`
ikisini tek görsel dilde birleştirir, böylece 20. sezonda bile kadro ekranı tutarlı kalır.

---

## ⚖️ Lisans

AGPL-3.0 — bkz. `LICENSE`
Üçüncü taraf veri kaynakları ve lisansları: `NOTICE`
