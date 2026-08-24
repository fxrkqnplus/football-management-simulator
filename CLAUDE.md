# CLAUDE.md — Football Management Simulator

> **Bu dosya her oturumda otomatik yüklenir.** Projenin anayasası, teknoloji yığını ve
> terim sözlüğü burada. Derin spesifikasyonlar `docs/spec/` altında — yalnızca ilgili
> fazda okunur.

## 🚦 Her Oturumun İlk İşi

1. **`PROJECT_MEMORY.md`** → "ANLIK DURUM" bloğunu ve son iki faz kaydını oku.
2. **`docs/ROADMAP.md`** → sıradaki fazın bölümünü oku.
3. **`docs/spec/`** → o faza ait spesifikasyonları oku (eşleme: `docs/SESSION-TEMPLATE.md`).
4. Oturum akışı için **`docs/SESSION-TEMPLATE.md`** şablonunu kullan.

## 📚 Belge Haritası

| Dosya | İçerik | Ne zaman okunur |
|---|---|---|
| `CLAUDE.md` | Anayasa, yığın, sözlük | Her oturum (otomatik) |
| `PROJECT_MEMORY.md` | Oturumlar arası devir teslim | Her oturum başı + sonu |
| `docs/ROADMAP.md` | 50 faz, kapsam, kabul kriterleri | Her oturum başı |
| `docs/SESSION-TEMPLATE.md` | Oturum akışı + faz→spec eşlemesi | Her oturum başı |
| `docs/OUTPUT-FORMAT.md` | Alt görev rapor formatı | Her alt görev sonu |
| `docs/DEPENDENCY-WATCH.md` | Sürüm takip listesi | Her faz başı |
| `docs/V2-BACKLOG.md` | Kapsam dışı fikirler | Fikir çıkınca |
| `docs/spec/01-database.md` | Veritabanı şeması | Faz 3,4,7-9,11,12,46 |
| `docs/spec/02-attributes.md` | Nitelik sistemi, CA/PA, türetme | Faz 10,11,14,30-38,46 |
| `docs/spec/03-match-engine.md` | Maç motoru formülleri | Faz 16,20-29,39-41 |
| `docs/spec/04-ai-scoring.md` | AI skorlama tabloları | Faz 14,20,30-38,42,43 |
| `docs/spec/05-design-system.md` | Tasarım token'ları, animasyonlar | Faz 6,17-21,27-29,49 |
| `docs/spec/06-dialogue.md` | Diyalog sistemi, 80 durum | Faz 44,45 |
| `docs/spec/07-country-rules.md` | GBE, kotalar, UEFA | Faz 35,39-41 |
| `docs/spec/08-admin-panel.md` | Sunucu modları, yönetim paneli | Faz 13,47 |
| `docs/spec/09-quality-protocol.md` | Test, gözlem, invariant | Faz 1,2,11,46,49,50 |
| `docs/spec/10-deployment.md` | Oracle, Cloudflare, yedekleme | Faz 13,50 |
| `docs/spec/11-project-memory.md` | Hafıza sisteminin kuralları | Faz 1 + gerektiğinde |
| `docs/spec/12-data-packs.md` | Veri paketi formatı, gerçek varlık hattı, portre tutarlılığı | Faz 7-9, 11 |
| `docs/MASTER-SPEC.md` | Hepsinin tek dosyalık arşivi | Referans |

---

# 1. PROJE ANAYASASI

> Bu bölüm `CLAUDE.md`'ye gider ve her oturumda geçerlidir. Asla ihlal edilmez.

## 1.1 Projenin Kimliği

**Football Management Simulator** — web tabanlı, Türkçe, 2 boyutlu, tur tabanlı futbol menajerlik simülasyonu. Football Manager 26 referans alınır.

- **Dil:** Arayüz **Türkçe**. Kod, değişken, fonksiyon, tablo, dosya adları **İngilizce**. İstisna yok.
- **Boyut:** Yalnızca 2D. Hiçbir yerde 3D kütüphane, 3D varlık, 3D render kullanılmaz.
- **Hedef:** `https://fxrkqn.org/fms` — herkese açık kayıt, ücretsiz, reklamsız.
- **Ölçek:** 1–5 aktif kullanıcı beklenir, ancak kayıt açık olduğu için sistem 200 kullanıcıya kadar bozulmadan çalışacak şekilde tasarlanır.

## 1.2 Değişmez Kurallar

**K1 — Sunucu otoritesi mutlaktır.**
İstemci hiçbir oyun kararı hesaplamaz. Maç sonucu, transfer kabulü, oyuncu gelişimi, para hareketi — hepsi sunucuda hesaplanır. İstemci yalnızca **görüntüler** ve **niyet gönderir**. İstemciden gelen hiçbir sayısal değere güvenilmez.

**K2 — Her rastgelelik deterministiktir.**
`Math.random()` kullanımı **yasaktır**. Tüm rastgelelik `SeededRng` üzerinden geçer:
```ts
const rng = new SeededRng(saveId, turnNumber, entityId, purpose);
```
Aynı girdi her zaman aynı çıktıyı verir. Bu, hata ayıklamanın ve liderlik tablosu bütünlüğünün temelidir.

**K3 — Motor saftır.**
`packages/engine` içinde: veritabanı erişimi yok, ağ çağrısı yok, dosya sistemi yok, `Date.now()` yok, `Math.random()` yok, global durum yok. Girdi alır, çıktı döner. Bu kural CI'da otomatik denetlenir.

**K4 — Master World salt-okunurdur.**
Oyun dünyası paylaşımlı ve değişmezdir. Kullanıcıya özel her değişiklik `save_deltas` tablosuna yazılır. Master tabloya yazma girişimi **tip seviyesinde derlenmez**.

**K5 — Metin sabit kodlanmaz.**
Arayüzde görünen hiçbir Türkçe metin koda gömülmez. Her şey `t('namespace:key')` üzerinden gelir. ESLint bunu yakalar.

**K6 — Yol sabit kodlanmaz.**
Uygulama `/fms` alt yolunda çalışır. Kodda `/api/...` veya `/login` yazılmaz; `basePath('/api/...')` kullanılır. ESLint bunu yakalar.

**K7 — Her hesaplama gerekçesini üretir.**
Yapay zeka kararları, gelişim hesapları, transfer değerlendirmeleri bir `debugTrace` nesnesi döner:
```ts
{ input: {...}, steps: [{name, value, reason}], output: X, summary: "..." }
```
"Neden bu oldu?" sorusu her zaman cevaplanabilir olmalıdır.

**K8 — `console.log` yasaktır.**
Yalnızca `logger.info/warn/error/debug`. Her log `correlationId` taşır; oyun içi işlemler ayrıca `saveId` ve `turnId` taşır.

**K9 — Veri modu yapılandırılabilir, varsayılan gerçek.**
Oyun `DATA_MODE` ortam değişkeniyle çalışır:

- **`DATA_MODE=full` (varsayılan, kişisel kurulum):** Gerçek armalar, gerçek oyuncu fotoğrafları, gerçek isimler, gerçek formalar, gerçek stadyumlar. Veri paketleri `/data/packs/` altından yüklenir. Prosedürel üretim **yalnızca eksik varlıklar ve newgen'ler için** yedek olarak çalışır.
- **`DATA_MODE=clean`:** Tümüyle prosedürel/jenerik. Yalnızca kurulum herkese açık dağıtılacaksa kullanılır.

Sunucu `SERVER_MODE=private` ile açılır — kayıt açık olsa bile yalnızca izin listesindeki hesaplar oynar. Public moda geçmek bilinçli bir karardır.

**Kod tarafında kural:** Veri kaynağı her zaman `DataProvider` soyutlaması üzerinden gelir; hiçbir modül varlığın nereden geldiğini bilmez. Belirli sitelerin kullanım şartlarını ihlal eden kazıyıcı (scraper) yazılmaz — veri paketleri, resmi API'ler ve açık kaynaklar üzerinden çalışılır. Bu bir kısıt değil, mimari tercihtir: tek kaynağa bağımlı kalınmaz.

**K10 — Test yazılmadan faz kapanmaz.**
Her yeni modül aynı commit'te birim testiyle gelir. Kapsam: global ≥%70, `packages/engine` ≥%85, kural motorları ≥%85.

**K11 — Tek seferde tek alt görev.**
Bir alt görev bitince dur, `docs/ROADMAP.md`'de işaretle, kullanıcının onayını bekle. "Evet" veya "y" gelmeden sıradakine geçme.
Alt görev listesi onaylandığı anda — ilk koda dokunmadan önce — `docs/ROADMAP.md`'deki faz bölümüne yazılır. **Plan sohbette yaşamaz:** oturum koparsa commit'ler "ne yapıldı"yı taşır, ROADMAP listesi "sırada ne var"ı taşır.

**K12 — Kapsam kayması yasak.**
Yol haritasında olmayan bir özellik aklına gelirse **yapma**. `docs/V2-BACKLOG.md`'ye ekle ve devam et.

**K13 — Emin değilsen sor.**
Tahmin etmek, yanlış varsayımla 500 satır yazmaktan iyidir. Belirsizlik varsa kullanıcıya net bir soru sor.

**K15 — Proje hafızası tutulur.**
Oturum başında `PROJECT_MEMORY.md` **okunur**. Yazma iki ritimde olur:
**her alt görev sonunda ANLIK DURUM bloğu**, **her faz sonunda tam faz kaydı** (11 başlık).
Faz kaydı yazılmadan faz kapanmaz. ANLIK DURUM'un alt görev başına olmasının sebebi,
oturum kurtarmaya en çok faz ortasında ihtiyaç duyulmasıdır. Detaylar: Bölüm 12.

**K14 — ARM64 uyumluluğu.**
Üretim Oracle Ampere A1 (ARM) üzerinde çalışır. Her bağımlılık `linux/arm64` üzerinde derlenmeli. CI hem `amd64` hem `arm64` build alır.

## 1.3 Kod Standartları

```
Dosya adları:      kebab-case.ts          (player-service.ts)
React bileşenleri: PascalCase.tsx         (PlayerCard.tsx)
Fonksiyonlar:      camelCase              (calculateMarketValue)
Tipler/Arayüzler:  PascalCase             (PlayerAttributes)
Sabitler:          SCREAMING_SNAKE_CASE   (MAX_SQUAD_SIZE)
Veritabanı:        snake_case             (player_attributes)
i18n anahtarları:  namespace:dot.notation (squad:table.column.age)
Test dosyaları:    <isim>.test.ts         (yanına konur)
```

**Tip kuralları:**
- `any` yasak. Bilinmiyorsa `unknown` + daraltma.
- Tüm dış girdiler (HTTP body, query, veri sağlayıcı çıktısı, dosya) **Zod** ile doğrulanır.
- Tipler Zod şemasından türetilir: `type X = z.infer<typeof xSchema>`
- Fonksiyon dönüş tipleri açıkça yazılır (public API'de).
- Discriminated union tercih edilir; `enum` yerine `as const` nesne.

**Hata kuralları:**
- Sessiz `catch` yasak. Ya işle, ya logla ve yeniden fırlat.
- Tipli hatalar: `DomainError`, `ValidationError`, `EngineError`, `DataProviderError`, `NotFoundError`, `ForbiddenError`
- Kullanıcıya gösterilen hata mesajı Türkçe ve **eyleme dönüştürülebilir** olmalı: "Bir hata oluştu" değil, "Bu transfer bütçenizi aşıyor. Bütçe: €12,4 mn, Teklif: €18,0 mn."

## 1.4 Git Akışı

```
main      → kararlı, yalnızca test edilmiş sürümler
develop   → aktif geliştirme
feature/faz-XX-<slug>  → her faz bir dal, bir PR
```

**Commit alt görev başına, PR faz başına.**
Her alt görev kendi commit'iyle kapanır; PR faz sonunda açılır. Gerekçe: oturum
kurtarma `git log` ile kaldığı yeri bulur. Faz boyunca tek commit atılırsa bağlam
dolduğunda veya oturum koptuğunda yeni oturum git'te hiçbir şey göremez ve
`PROJECT_MEMORY.md` tek başına on alt görevlik işi taşıyamaz.

Commit formatı (Conventional Commits):
```
feat(engine): pas çözümleme formülünü ekle
fix(squad): forma numarası çakışma kontrolü
test(transfer): pazarlık turu senaryoları
docs(spec): xG katsayılarını güncelle
chore(ci): arm64 build adımı
```

Her PR açıklaması: faz numarası, kapsam özeti, kabul kriteri kontrol listesi, ekran görüntüsü (arayüz fazlarında).

## 1.5 Public Repo Güvenliği

- Repo **public**. Hiçbir sır asla commit edilmez.
- `.gitignore`: `.env*` (`.env.example` hariç), `/data/packs/`, `/data/assets/`, `.cache/`, `*.dump`, `*.sql.gz`
- GitHub gizli tarama (secret scanning) ve push koruması **açık**.
- Dependabot açık, güvenlik güncellemeleri otomatik PR.
- Lisans: **AGPL-3.0** (`LICENSE`) + üçüncü taraf veri atıfları (`NOTICE`).

---

---

# 2. TEKNOLOJİ YIĞINI VE REPO YAPISI

## 2.1 Sürümler (Kilitli)

```jsonc
// Sürümler 2026-08-23'te npm registry'den tek tek doğrulandı (SAPMA-003).
// Bir sürümü değiştirmeden önce docs/DEPENDENCY-WATCH.md'yi oku.
{
  "runtime":    "Node.js 24 LTS (Krypton, 24.19.0)",
  "packageManager": "pnpm@11",
  "monorepo":   "Turborepo 2.10",
  "language":   "TypeScript 6.0.3 — '~' ile PİNLİ, '^' YASAK (aşağıdaki nota bak)",

  "frontend": {
    "framework": "React 19.2",
    "bundler":   "Vite 8 (Rolldown) + @vitejs/plugin-react 6",
    "router":    "react-router 8",
    "styling":   "Tailwind CSS 4.3",
    "components":"shadcn/ui (Radix tabanlı)",
    "state":     "Zustand 5",
    "serverState":"@tanstack/react-query 5",
    "table":     "@tanstack/react-table 9 + @tanstack/react-virtual 3",
    "charts":    "recharts 3",
    "render2d":  "pixi.js 8",
    "audio":     "howler 2",
    "i18n":      "i18next 26 + react-i18next 17",
    "icons":     "lucide-react 1",
    "forms":     "react-hook-form 7 + @hookform/resolvers 5 (zod)"
  },

  "backend": {
    "framework": "NestJS 11 (Express 5 — joker rota sözdizimi değişti: /*splat)",
    "orm":       "drizzle-orm 0.45 + drizzle-kit 0.31",   // 1.0 hâlâ RC, girilmedi
    "db":        "PostgreSQL 16",
    "cache":     "ioredis 5.11",                          // 6.x → BORÇ-001, Faz 16
    "queue":     "bullmq 5.81",                           // 6.x → BORÇ-002, Faz 16
    "validation":"zod 4",
    "logging":   "pino 10 + nestjs-pino 4",
    "auth":      "@node-rs/argon2 2 + jose 6 (JWT)",
    "email":     "resend 6"
  },

  "quality": {
    "test":      "vitest 4",   // vitest.config.ts + projects[]; coverage.include ZORUNLU
    "e2e":       "@playwright/test 1.62",
    "lint":      "eslint 10 (yalnızca flat config) + typescript-eslint 8",
    "format":    "prettier 3",
    "errors":    "@sentry/node 10 + @sentry/react 10"
  }
}
```

**TypeScript neden 7 değil, 6.0.3 — ve neden `~` ile pinli:**
TypeScript 7.0 programatik derleyici API'si olmadan yayınlandı. Kanıt zinciri: `typescript-eslint`
peer aralığı `>=4.8.4 <6.1.0`, ve `nest build` `createProgram()` çağırıyor. TS 7'ye çıkmak
tip-farkında lint kurallarını ve NestJS derlemesini kırar. `^6.0.3` yazılırsa pnpm 6.1.0'a
çıkabilir ve peer aralığının dışına taşar — bu yüzden `~6.0.3` kullanılır. TS 6.0'da
`types: []` varsayılan boştur; her paketin `tsconfig.json`'ında `types` açıkça listelenir.
Gerekçenin tamamı: `docs/ADR/0003-typescript-surum-kilidi.md`.

**Yasaklı bağımlılıklar:** herhangi bir 3D kütüphane (three.js, babylon), moment.js (yerine `date-fns`), lodash tamamı (yalnızca gerekli fonksiyon `lodash-es`'ten), jQuery, herhangi bir ücretli SDK.

## 2.2 Repo Yapısı

```
football-management-simulator/
├── CLAUDE.md                    # Anayasa (her oturumda okunur)
├── PROJECT_MEMORY.md            # Oturumlar arası devir teslim (K15)
├── README.md
├── LICENSE                      # AGPL-3.0
├── NOTICE                       # Üçüncü taraf veri atıfları
├── CHANGELOG.md
├── docker-compose.yml           # geliştirme
├── docker-compose.prod.yml      # üretim (ARM64)
├── turbo.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .env.example
│
├── apps/
│   ├── web/                     # React SPA (Vite, base: '/fms/')
│   │   ├── src/
│   │   │   ├── app/             # yönlendirme, sağlayıcılar, kabuk
│   │   │   ├── screens/         # ekran bileşenleri (bölüm bazlı)
│   │   │   ├── features/        # alan mantığı + hook'lar
│   │   │   ├── components/      # paylaşılan bileşenler
│   │   │   ├── match/           # PixiJS 2D oynatıcı
│   │   │   ├── locales/tr/      # çeviri dosyaları
│   │   │   └── lib/             # yardımcılar (basePath, format, api)
│   │   └── vite.config.ts
│   │
│   ├── api/                     # NestJS HTTP + SSE
│   │   └── src/
│   │       ├── modules/         # auth, save, squad, transfer, match, admin...
│   │       ├── common/          # guard, filter, interceptor, middleware
│   │       └── main.ts
│   │
│   └── worker/                  # BullMQ tüketicileri (tur simülasyonu)
│       └── src/
│           ├── processors/      # turn.processor.ts, rollover.processor.ts
│           └── main.ts
│
├── packages/
│   ├── engine/                  # SAF simülasyon (K3)
│   │   └── src/
│   │       ├── match/           # tik döngüsü, aksiyonlar, xG, duran top
│   │       ├── development/     # gelişim, yaşlanma
│   │       ├── economy/         # piyasa değeri, finans
│   │       ├── ai/              # karar motorları
│   │       ├── rules/           # ülke kuralları, kadro kaydı
│   │       └── rng/             # SeededRng
│   │
│   ├── shared/                  # tipler, Zod şemaları, sabitler, yardımcılar
│   │   └── src/
│   │       ├── schemas/
│   │       ├── constants/
│   │       ├── i18n/            # turkish-suffix.ts dahil
│   │       ├── logger.ts
│   │       ├── errors.ts
│   │       └── base-path.ts
│   │
│   ├── db/                      # Drizzle şema + migration + WorldView
│   │   └── src/
│   │       ├── schema/
│   │       ├── migrations/
│   │       └── world/           # WorldView, WorldMutation
│   │
│   └── ui/                      # tasarım sistemi bileşenleri + Storybook
│
├── tools/
│   ├── data-cli/                # veri ingest, doğrulama, üretim
│   └── i18n-check/
│
├── docs/
│   ├── ROADMAP.md               # 50 faz
│   ├── V2-BACKLOG.md            # kapsam dışı fikirler buraya
│   ├── ADR/                     # mimari karar kayıtları
│   ├── spec/                    # bu belgenin bölümleri
│   └── LEGAL/                   # KVKK metinleri (yalnızca public modda gösterilir)
│
└── data/                        # .gitignore'da
    ├── packs/                   # kullanıcı veri paketleri
    ├── assets/                  # üretilmiş görseller
    └── .cache/                  # veri sağlayıcı önbelleği
```

## 2.3 Ortam Değişkenleri

`.env.example` (Zod ile doğrulanır, eksikse uygulama açılmaz):

```bash
# Uygulama
NODE_ENV=development
PUBLIC_BASE_PATH=/fms
PUBLIC_URL=https://fxrkqn.org/fms
API_PORT=3001
WEB_PORT=3000

# Veritabanı
DATABASE_URL=postgresql://fms:password@localhost:5432/fms
REDIS_URL=redis://localhost:6379

# Kimlik
JWT_SECRET=<32+ karakter rastgele>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
SETUP_TOKEN=<ilk admin için tek kullanımlık>
EMERGENCY_ADMIN_TOKEN=<bakım modu kaçış anahtarı>

# E-posta
RESEND_API_KEY=re_xxx
EMAIL_FROM=noreply@fxrkqn.org

# Cloudflare
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=fms-assets
R2_PUBLIC_URL=

# Sunucu modu
SERVER_MODE=private              # private | public | maintenance (varsayılan private)

# Simülasyon
WORKER_CONCURRENCY=1
DEFAULT_SIM_POLICY=balanced      # balanced | full  (SimulationPolicy — kayıt başına)
TURN_LOCK_TTL_SECONDS=300

# Gözlem
SENTRY_DSN=
LOG_LEVEL=info

# Veri modu ve sağlayıcılar
DATA_MODE=full                   # full | clean
ACTIVE_PACK=                     # /data/packs/ altındaki paket klasörü adı
FOOTBALL_DATA_API_KEY=
API_FOOTBALL_KEY=
```

## 2.4 Katman Kuralları

Bağımlılık yönü **tek yönlüdür**, ihlali CI'da denetlenir:

```
apps/web    → packages/shared, packages/ui
apps/api    → packages/shared, packages/db, packages/engine
apps/worker → packages/shared, packages/db, packages/engine
packages/db → packages/shared
packages/engine → packages/shared        (SADECE tipler ve saf yardımcılar)
packages/ui → packages/shared
packages/shared → (hiçbir şey)
tools/data-cli  → packages/shared, packages/db   (motoru import ETMEZ)
scripts/        → (hiçbir şey — önyükleme betikleri)
```

`packages/engine` asla `packages/db`'yi import etmez. Motor veriyi **parametre olarak alır**.

---

---

# 14. TERİM SÖZLÜĞÜ VE İSİMLENDİRME

> Kod **İngilizce**, arayüz **Türkçe**. Bu tablo ikisi arasındaki bağlayıcı sözleşmedir.

| Kod (İngilizce) | Arayüz (Türkçe) |
|---|---|
| Current Ability (CA) | Mevcut Yetenek |
| Potential Ability (PA) | Potansiyel Yetenek |
| Attribute | Nitelik |
| Hidden Attribute | Gizli Nitelik |
| Trait / PPM | Özel Yetenek |
| Personality | Kişilik |
| Morale | Moral |
| Form | Form |
| Condition | Kondisyon |
| Match Sharpness | Maç Keskinliği |
| Position | Mevki |
| Role | Rol |
| Duty | Görev |
| Formation | Diziliş |
| Mentality | Mentalite |
| Team Instruction | Takım Talimatı |
| Player Instruction | Bireysel Talimat |
| Tactical Fluidity | Taktik Akıcılığı |
| Pressing Intensity | Baskı Yoğunluğu |
| Defensive Line | Savunma Çizgisi |
| Set Piece | Duran Top |
| Squad | Kadro |
| Squad Registration | Kadro Kaydı |
| Squad Role | Takım Rolü |
| Homegrown | Yerli Yetiştirme |
| Work Permit / GBE | Çalışma İzni |
| Foreign Quota | Yabancı Kotası |
| Transfer Window | Transfer Dönemi |
| Transfer Fee | Bonservis |
| Release Clause | Serbest Kalma Bedeli |
| Sell-on Clause | Sonraki Satıştan Pay |
| Minimum Fee Clause | Minimum Ücret Maddesi |
| Loan | Kiralık |
| Loan with Option | Satın Alma Opsiyonlu Kiralık |
| Loan with Obligation | Zorunlu Opsiyonlu Kiralık |
| Pre-contract / Bosman | Ön Anlaşma |
| Agent | Oyuncu Menajeri |
| Agent Fee | Menajer Komisyonu |
| Scout | Gözlemci |
| Scouting Report | Gözlemci Raporu |
| Shortlist | Aday Listesi |
| Market Value | Piyasa Değeri |
| Wage Budget | Maaş Bütçesi |
| Transfer Budget | Transfer Bütçesi |
| Board Confidence | Yönetim Güveni |
| Board Expectation | Yönetim Beklentisi |
| Reputation | İtibar |
| Prestige | Prestij |
| Youth Intake | Altyapı Kadrosu |
| Newgen | Üretilmiş Oyuncu |
| Regen | (kullanma — "Newgen" kullan) |
| Mentoring | Mentorluk |
| Injury Proneness | Sakatlığa Yatkınlık |
| Recurrence | Tekrarlama |
| Suspension | Ceza |
| Yellow Accumulation | Sarı Kart Birikimi |
| xG (Expected Goals) | xG (Beklenen Gol) |
| Heatmap | Isı Haritası |
| Pass Network | Pas Ağı |
| Match Rating | Maç Reytingi |
| Man of the Match | Maçın Adamı |
| Fixture | Fikstür |
| Standings / Table | Puan Durumu |
| Matchday | Maç Günü / Hafta |
| Relegation | Küme Düşme |
| Promotion | Küme Yükselme |
| Playoff | Play-off |
| Coefficient | Katsayı |
| Save (game save) | Kayıt |
| Save Slot | Kayıt Slotu |
| Turn | Tur |
| Rollover | Sezon Geçişi |
| Snapshot | Anlık Kayıt |
| Leaderboard | Liderlik Tablosu |
| Server Mode | Sunucu Modu |
| Maintenance Mode | Bakım Modu |
| Private Mode | Özel Mod |

**Kullanılmayacak Türkçe terimler:** "yetenek puanı" (→ Mevcut Yetenek), "skill" (→ nitelik), "menajer" bir oyuncu temsilcisi için (→ oyuncu menajeri; teknik direktör için "menajer" doğru), "regen" (→ newgen).

---

---

# 16. KAPSAM SINIRLARI VE BAŞARI TANIMI

## 16.1 Kasıtlı Olarak Kapsam Dışı (v2 Kasası)

Aşağıdakiler **v2 kasasındadır** ve v1'de uygulanmaz (K12):

İngilizce dil desteği · 2. ve 3. lig kademeleri · Milli takım tam yönetimi · Oyuncu menajeri derin sistemi · Sportif direktör rolü · Duran top koreografi editörü · Bilet fiyatlandırma · Stadyum inşaat/taşınma · Maç motoru S4 yükseltmesi · Taraftar grupları · LLM metin üretimi · Mağaza uygulaması · Yatay ölçekleme · Otomatik veri güncelleme hattı

Bir özellik burada listelenmişse, ne kadar küçük görünürse görünsün **v1'de yapılmaz**.

## 16.2 Bilinen Belirsizlikler

Bunlar ilgili faza gelindiğinde kullanıcıyla netleştirilecek:

1. **Nitelik türetme kalibrasyonu (Faz 10)** — üretilen en iyi 50 oyuncu listesi elle gözden geçirilip onaylanmalı. Formüller iyi bir başlangıç noktasıdır, mutlak doğru değildir.
2. **Maç motoru denge ayarı (Faz 23)** — 5.13'teki hedef aralıklar ilk denemede tutmayabilir. Katsayılar ayarlanır, ama xG modeli katsayıları (5.6) sabittir.
3. **Süper Lig play-off formatı** — gerçek format sezona göre değişiyor. `CompetitionRules.playoffSpots` ile yapılandırılabilir bırakıldı, varsayılan 0.
4. **Veri sağlayıcı kapsamı (Faz 8–9)** — hangi API'ye abone olunacağı veya yalnızca açık kaynakla mı devam edileceği Faz 7'de netleşecek. Prosedürel yedek her durumda çalışır.
5. **Diyalog metin hacmi (Faz 44)** — 2.880 menajer repliği + 200 taban oyuncu cevabı yazımı tek fazı aşabilir; 44a/44b bölünmesi muhtemel.

## 16.3 Başarı Tanımı

v1.0.0 şu koşullar sağlandığında yayınlanır:

- 50 fazın tamamı kabul kriterleriyle kapanmış
- 20 sezonluk regresyon simülasyonu hatasız, tüm denge metrikleri aralıkta
- Uçtan uca test paketi yeşil, Sentry'de açık hata yok
- `https://fxrkqn.org/fms` üzerinden erişilebilir, PWA yüklenebilir
- Mobilde 360px genişlikte her ekran kullanılabilir
- Aylık maliyet **$0**
- Geri yükleme tatbikatı yapılmış ve belgelenmiş
- `DATA_MODE=full` ile gerçek armalar, portreler, formalar, logolar ekranda görünüyor
- `PORTRAIT_STYLE=stylized` modunda gerçek ve prosedürel portreler ayırt edilemiyor
- (Yalnızca `SERVER_MODE=public` ise) KVKK metinleri yayında, "hesabımı sil" ve
  "verilerimi indir" çalışıyor
- 10+ gerçek kullanıcı 1 hafta test etmiş

---
