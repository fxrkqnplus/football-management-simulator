# FOOTBALL MANAGEMENT SIMULATOR — ANA GELİŞTİRME PROMPTU
## Claude Code için Tam Teknik Spesifikasyon | Sürüm 1.0

---

# 0. BU BELGE NASIL KULLANILIR

Bu belge, projenin **tek doğruluk kaynağıdır**. `faz-yol-haritasi.md` ile birlikte çalışır:

- **`faz-yol-haritasi.md`** → *Ne zaman ne yapılacak* (50 faz, kapsam, kabul kriterleri)
- **Bu belge** → *Nasıl yapılacak* (formüller, şemalar, tablolar, kurallar)

## 0.1 Repo'ya Yerleştirme

Bu belge tek parça halinde 60 bin karakterdir. Claude Code her oturumda bunun tamamını okumamalı — bağlam israfı olur. **İlk iş olarak şu şekilde bölün:**

```
CLAUDE.md                          ← Bölüm 1 (Anayasa) + Bölüm 2 (Yığın) + Bölüm 14 (Sözlük)
PROJECT_MEMORY.md                  ← CANLI DOSYA (Bölüm 12'ye göre, Faz 0 tohumuyla)
docs/spec/01-database.md           ← Bölüm 3
docs/spec/02-attributes.md         ← Bölüm 4
docs/spec/03-match-engine.md       ← Bölüm 5
docs/spec/04-ai-scoring.md         ← Bölüm 6
docs/spec/05-design-system.md      ← Bölüm 7
docs/spec/06-dialogue.md           ← Bölüm 8
docs/spec/07-country-rules.md      ← Bölüm 9
docs/spec/08-admin-panel.md        ← Bölüm 10
docs/spec/09-quality-protocol.md   ← Bölüm 11
docs/spec/10-deployment.md         ← Bölüm 13
docs/spec/11-project-memory.md     ← Bölüm 12 (hafıza sisteminin kuralları)
docs/spec/12-data-packs.md         ← Bölüm 17 (veri paketleri, gerçek varlık hattı)
docs/SESSION-TEMPLATE.md           ← Bölüm 15
docs/PROMPT-KITAPCIGI.md           ← ateşleme / faz / kurtarma promptları
docs/ROADMAP.md                    ← faz-yol-haritasi.md
docs/V2-BACKLOG.md                 ← yol haritasındaki v2 kasası
```

`CLAUDE.md` her oturumda otomatik yüklenir ve ~12 bin karakter kalır. Diğer spesifikasyonlar **yalnızca ilgili fazda** okunur. Her fazın hangi spesifikasyonu okuyacağı Bölüm 14'teki oturum şablonunda yazılıdır.

## 0.2 Bu Belgenin Otoritesi

Çelişki durumunda öncelik sırası:

1. Kullanıcının o oturumdaki açık talimatı
2. Bu belge (`docs/spec/`)
3. `docs/ROADMAP.md`
4. Mevcut kod
5. Genel en iyi pratikler

Bu belgede bir şey **eksikse veya çelişkiliyse**, tahmin etme — kullanıcıya sor ve cevabı belgeye işle.

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

**K12 — Kapsam kayması yasak.**
Yol haritasında olmayan bir özellik aklına gelirse **yapma**. `docs/V2-BACKLOG.md`'ye ekle ve devam et.

**K13 — Emin değilsen sor.**
Tahmin etmek, yanlış varsayımla 500 satır yazmaktan iyidir. Belirsizlik varsa kullanıcıya net bir soru sor.

**K15 — Proje hafızası tutulur.**
Her faz `PROJECT_MEMORY.md`'ye bir kayıt yazmadan kapanmaz. Oturum başında bu dosya **okunur**, oturum sonunda **yazılır**. Detaylar: Bölüm 12.

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

# 2. TEKNOLOJİ YIĞINI VE REPO YAPISI

## 2.1 Sürümler (Kilitli)

```jsonc
{
  "runtime":    "Node.js 22 LTS",
  "packageManager": "pnpm@9",
  "monorepo":   "Turborepo 2",
  "language":   "TypeScript 5.6 (strict)",

  "frontend": {
    "framework": "React 19",
    "bundler":   "Vite 6",
    "router":    "react-router 7",
    "styling":   "Tailwind CSS 4",
    "components":"shadcn/ui (Radix tabanlı)",
    "state":     "Zustand 5",
    "serverState":"@tanstack/react-query 5",
    "table":     "@tanstack/react-table 8 + @tanstack/react-virtual 3",
    "charts":    "recharts 2",
    "render2d":  "pixi.js 8",
    "audio":     "howler 2",
    "i18n":      "i18next 24 + react-i18next 15",
    "icons":     "lucide-react",
    "forms":     "react-hook-form 7 + @hookform/resolvers (zod)"
  },

  "backend": {
    "framework": "NestJS 10",
    "orm":       "drizzle-orm + drizzle-kit",
    "db":        "PostgreSQL 16",
    "cache":     "ioredis 5",
    "queue":     "bullmq 5",
    "validation":"zod 3",
    "logging":   "pino 9 + nestjs-pino",
    "auth":      "@node-rs/argon2 + jose (JWT)",
    "email":     "resend"
  },

  "quality": {
    "test":      "vitest 2",
    "e2e":       "@playwright/test 1.48",
    "lint":      "eslint 9 (flat config) + typescript-eslint 8",
    "format":    "prettier 3",
    "errors":    "@sentry/node + @sentry/react"
  }
}
```

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
│   └── LEGAL/                   # KVKK metinleri, veri envanteri
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
DEFAULT_SIM_TIER=balanced        # balanced | full
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
```

`packages/engine` asla `packages/db`'yi import etmez. Motor veriyi **parametre olarak alır**.

---

# 3. VERİTABANI ŞEMASI

Drizzle ORM. Tüm tablolar `snake_case`. Her tablo `created_at` ve `updated_at` taşır (aksi belirtilmedikçe).

## 3.1 Master World — Salt Okunur

Bu tablolar tüm kayıtlar tarafından paylaşılır. **Asla kullanıcı işlemiyle değiştirilmez** (K4).

### Coğrafya ve Kurumlar

```ts
// countries — 6 ülke (v1)
countries: {
  id: serial PK
  code: char(3) UNIQUE          // TUR, ENG, ESP, GER, ITA, FRA
  nameKey: text                  // i18n anahtarı
  confederation: text            // UEFA, CONMEBOL...
  flagAssetId: text
  footballLevel: integer         // 1-100, newgen kalitesini etkiler
  uefaCoefficient: numeric(8,3)
  currencyCode: char(3)          // TRY, GBP, EUR
  workPermitRuleKey: text        // 'gbe' | 'eu_quota' | 'tr_quota' | 'none'
}

// federations
federations: {
  id, countryId FK, name, presidentPersonId FK?, foundedYear, assetId
}

// competitions — lig, kupa, turnuva ORTAK tablosu
competitions: {
  id: serial PK
  countryId: FK nullable         // null = uluslararası (UCL, UEL)
  code: text UNIQUE              // 'TUR_SUPERLIG', 'UEFA_UCL'
  nameKey: text
  type: text                     // 'league'|'domestic_cup'|'league_cup'|'super_cup'|'continental'
  tier: integer                  // lig kademesi (1 = en üst)
  reputation: integer            // 0-200
  logoAssetId: text
  rules: jsonb                   // CompetitionRules — aşağıda
  seasonStartMonth: smallint
  seasonEndMonth: smallint
}
```

`CompetitionRules` (jsonb, Zod ile doğrulanır):
```ts
{
  teamCount: number
  format: 'round_robin_double' | 'round_robin_single' | 'knockout' | 'group_knockout' | 'swiss'
  pointsWin: number              // 3
  pointsDraw: number             // 1
  relegationCount: number
  promotionCount: number
  playoffSpots: number           // Türkiye: 4 (2-5. sıra)
  continentalSpots: { ucl: number, uel: number, uecl: number }
  tiebreakers: ('points'|'goal_diff'|'goals_for'|'head_to_head'|'wins')[]
  squadRegistration: {
    maxSquadSize: number | null
    maxForeign: number | null        // TR: 14
    homegrownMin: number | null      // ENG: 8
    u21Exempt: boolean
  }
  varEnabled: boolean
  substitutionsAllowed: number       // 5
  substitutionWindows: number        // 3
  extraTimeSubstitution: boolean
  yellowCardSuspensionThresholds: number[]   // [5, 10, 15]
  transferWindows: { start: string, end: string }[]  // 'MM-DD'
}
```

```ts
// clubs
clubs: {
  id: serial PK
  competitionId: FK              // mevcut lig
  countryId: FK
  name: text
  shortName: text                // 8 karakter
  abbreviation: char(3)          // GAL, FEN, BJK
  foundedYear: integer
  city: text
  stadiumId: FK
  reputation: integer            // 0-200
  colorPrimary: char(7)          // #RRGGBB
  colorSecondary: char(7)
  colorTertiary: char(7) nullable
  crestAssetId: text nullable    // null → prosedürel üretilir
  crestSeed: integer             // prosedürel arma tohumu
  supporterCount: integer
  supporterExpectation: integer  // 0-100
  chairmanPersonId: FK nullable
  isNational: boolean            // milli takım mı
}

// club_facilities — 1-20 skala
club_facilities: {
  clubId PK FK
  trainingGround, youthAcademy, youthRecruitment, medicalCentre,
  dataAnalysis, stadiumQuality: smallint    // hepsi 1-20
}

// club_finances_base — başlangıç değerleri
club_finances_base: {
  clubId PK FK
  balance, transferBudget, wageBudget: bigint    // kuruş/cent cinsinden
  matchdayIncomeAnnual, tvIncomeAnnual,
  sponsorIncomeAnnual, merchandiseIncomeAnnual: bigint
  currencyCode: char(3)
}

// stadiums
stadiums: {
  id, name, city, capacity, seatedCapacity,
  pitchQuality: smallint,        // 1-20
  builtYear, assetId nullable
}

// rivalries
rivalries: { id, clubAId FK, clubBId FK, intensity: smallint /* 1-10 */, nameKey nullable }

// kit_templates — 20 SVG şablonu
kit_templates: { id, code, nameKey, svgPath, colorSlots: smallint /* 2 veya 3 */ }

// club_kits
club_kits: {
  id, clubId FK, kitType: 'home'|'away'|'third',
  templateId FK, color1, color2, color3
}

// referees
referees: {
  id, countryId FK, personId FK,
  strictness, foulTolerance, homeBias, consistency,
  advantagePlay, bigGameExperience: smallint   // 1-20
}
```

### İnsanlar

```ts
// people — oyuncu, personel, menajer, başkan ORTAK kimlik tablosu
people: {
  id: serial PK
  firstName: text
  lastName: text
  commonName: text nullable      // "Vinicius Jr"
  birthDate: date
  nationalityCountryId: FK
  secondNationalityCountryId: FK nullable
  birthCity: text nullable
  portraitAssetId: text nullable
  portraitSeed: integer          // prosedürel portre tohumu
  gender: 'male'|'female'
  personType: ('player'|'staff'|'manager'|'chairman')[]
}

// players
players: {
  id: serial PK
  personId: FK UNIQUE
  clubId: FK nullable            // null = serbest oyuncu
  squadNumber: smallint nullable
  primaryPosition: text          // 'GK','DC','DL','DR','DM','MC','ML','MR','AMC','AML','AMR','ST'
  heightCm, weightKg: smallint
  preferredFootRight, preferredFootLeft: smallint  // 1-20 ayrı ayrı
  currentAbility: smallint       // 1-200 GİZLİ
  potentialAbility: smallint     // 1-200 GİZLİ
  paRangeMin, paRangeMax: smallint   // belirsizlik bandı
  isNewgen: boolean
  retiredAt: date nullable
}

// player_attributes — 47 sütun, TEK SATIR (jsonb DEĞİL: filtre performansı kritik)
player_attributes: {
  playerId PK FK
  // Teknik (14)
  corners, crossing, dribbling, finishing, firstTouch, freeKickTaking,
  heading, longShots, longThrows, marking, passing, penaltyTaking,
  tackling, technique: smallint
  // Zihinsel (14)
  aggression, anticipation, bravery, composure, concentration, decisions,
  determination, flair, leadership, offTheBall, positioning, teamwork,
  vision, workRate: smallint
  // Fiziksel (8)
  acceleration, agility, balance, jumpingReach, naturalFitness,
  pace, stamina, strength: smallint
  // Kaleci (11)
  aerialReach, commandOfArea, communication, eccentricity, handling,
  kicking, oneOnOnes, reflexes, rushingOut, tendencyToPunch, throwing: smallint
}
// CHECK: her sütun 1-20 arasında
// INDEX: (primaryPosition, currentAbility), (finishing), (passing), (pace) — transfer araması için

// player_hidden_attributes — 10 gizli nitelik
player_hidden_attributes: {
  playerId PK FK
  consistency, importantMatches, injuryProneness, dirtiness, pressure,
  professionalism, ambition, loyalty, adaptability, temperament: smallint  // 1-20
}

// player_positions — mevki yetkinlik matrisi
player_positions: {
  playerId FK, position: text,
  level: 'natural'|'accomplished'|'competent'|'awkward'|'ineffectual'
  PK (playerId, position)
}

// player_traits — özel yetenekler (PPM)
player_traits: { playerId FK, traitCode: text, PK (playerId, traitCode) }

// player_stats_history — gerçek dünya istatistikleri (nitelik türetimi girdisi)
player_stats_history: {
  id, playerId FK, seasonYear, competitionId FK,
  appearances, minutes, goals, assists, xG, xA,
  passesAttempted, passesCompleted, progressivePasses,
  dribblesAttempted, dribblesCompleted, duelsWon, duelsTotal,
  aerialsWon, aerialsTotal, tackles, interceptions, blocks,
  foulsCommitted, yellowCards, redCards,
  saves, goalsConceded, xGA, cleanSheets, penaltiesSaved
}
```

### Personel ve Menajerler

```ts
staff: {
  id, personId FK, clubId FK nullable,
  role: 'assistant_manager'|'attacking_coach'|'defending_coach'|'fitness_coach'|
        'gk_coach'|'technical_coach'|'physio'|'sports_scientist'|'scout'|
        'data_analyst'|'youth_manager'|'youth_coach'
}

staff_attributes: {
  staffId PK FK
  attacking, defending, fitness, goalkeeping, technical, tactical,
  motivating, discipline, judgingAbility, judgingPotential,
  physiotherapy, sportsScience, scoutingNetwork, adaptability,
  workingWithYoungsters, negotiating: smallint   // 1-20
}

managers: {
  id, personId FK, userId FK nullable,     // userId null = AI menajer
  clubId FK nullable, isUserManager: boolean,
  coachingBadge: 'none'|'c'|'b'|'a'|'pro',
  experienceLevel: 'amateur'|'former_player_lower'|'former_player_mid'|
                   'former_player_top'|'professional',
  philosophy: text,                         // 'attacking'|'control'|'balanced'|...
  reputation: smallint,                     // 0-200
  experiencePoints: integer,
  spokenLanguages: text[]
}

manager_attributes: {
  managerId PK FK
  tacticalKnowledge, motivation, playerManagement, youthDevelopment,
  negotiating, mediaHandling, trainingManagement, judgingAbility: smallint  // 1-20
}
```

## 3.2 Save Katmanı — Kullanıcıya Özel

```ts
users: {
  id: uuid PK
  email: citext UNIQUE
  emailVerifiedAt: timestamptz nullable
  passwordHash: text                       // argon2id
  username: citext UNIQUE
  role: 'user'|'moderator'|'admin'
  status: 'active'|'suspended'|'pending_deletion'
  deletionRequestedAt: timestamptz nullable
  lastLoginAt: timestamptz nullable
  registrationIp: inet
}

user_login_history: { id, userId FK, ip: inet, userAgent, countryCode, loginAt }

saves: {
  id: uuid PK
  userId FK
  name: text
  managerId FK                             // people/managers kaydı
  currentDate: date
  turnNumber: integer
  simulationTier: 'balanced'|'full'
  difficulty: 'easy'|'normal'|'hard'|'legendary'
  allowReplay: boolean                     // true → leaderboardEligible false
  leaderboardEligible: boolean
  anomalyFlagged: boolean
  status: 'active'|'archived'|'soft_deleted'
  sizeBytes: bigint
  lastPlayedAt: timestamptz
  archivedAt, deletedAt: timestamptz nullable
}
// CHECK: kullanıcı başına status='active' olan en fazla 3 kayıt (trigger ile)

// save_deltas — TÜM oyun içi değişiklikler burada (K4)
save_deltas: {
  id: bigserial PK
  saveId FK
  entityType: text                         // 'player'|'club'|'contract'|'competition'...
  entityId: integer
  field: text
  value: jsonb
  turnNumber: integer
  createdAt: timestamptz
}
// INDEX: (saveId, entityType, entityId), (saveId, turnNumber)

// save_snapshots — delta 50.000'i aşınca sıkıştırma
save_snapshots: {
  id, saveId FK, turnNumber, kind: 'auto'|'manual'|'season_start',
  payload: bytea,                          // gzip'lenmiş JSON
  sizeBytes: bigint, createdAt
}
```

### Oyun İçi Dinamik Tablolar

Bunlar save bazlıdır (`saveId` taşır) ve delta yerine doğrudan tabloda tutulur — çünkü sorgulanabilir olmaları gerekir:

```ts
contracts: {
  id, saveId FK, playerId FK, clubId FK,
  startDate, endDate: date,
  weeklyWage: bigint, signingBonus: bigint, loyaltyBonus: bigint,
  releaseClause: bigint nullable,
  squadRole: 'star'|'first_team'|'important_rotation'|'rotation'|'backup'|'youth',
  minimumFeeClause: bigint nullable,
  status: 'active'|'expired'|'terminated'|'loan'
}

contract_clauses: {
  id, contractId FK,
  type: 'appearance_fee'|'goal_bonus'|'assist_bonus'|'clean_sheet_bonus'|
        'team_success_bonus'|'international_bonus'|'promotion_bonus',
  amount: bigint, threshold: integer nullable, currency: char(3)
}

transfers: {
  id, saveId FK, playerId FK, fromClubId FK, toClubId FK,
  type: 'permanent'|'free'|'loan'|'loan_option'|'loan_obligation'|'swap'|'pre_contract',
  fee: bigint, agentFee: bigint,
  sellOnPercent: numeric(5,2) nullable,
  paymentSchedule: jsonb,                  // taksitler
  loanTerms: jsonb nullable,               // süre, maaş payı, oynama garantisi
  transferDate: date, turnNumber
}

transfer_negotiations: {
  id, saveId FK, playerId FK, bidderClubId FK, ownerClubId FK,
  round: smallint, status: 'open'|'accepted'|'rejected'|'countered'|'expired',
  currentOffer: jsonb, counterOffer: jsonb nullable,
  rejectionReasonKey: text nullable, expiresOnTurn: integer
}

matches: {
  id, saveId FK, competitionId FK, seasonYear,
  homeClubId FK, awayClubId FK, refereeId FK,
  scheduledDate: date, matchday: integer,
  homeGoals, awayGoals: smallint nullable,
  status: 'scheduled'|'played'|'postponed',
  weather: text, pitchCondition: text, attendance: integer,
  rngSeed: bigint,                         // yeniden oynatma için
  eventStream: jsonb nullable,             // MatchEvent[]
  statsHome: jsonb, statsAway: jsonb
}

player_match_stats: {
  id, matchId FK, playerId FK, clubId FK,
  minutesPlayed, goals, assists, shots, shotsOnTarget, xG, xA,
  passes, passesCompleted, tackles, interceptions, duelsWon,
  yellowCard: boolean, redCard: boolean, rating: numeric(3,1),
  positionPlayed: text, heatmap: jsonb
}

injuries: {
  id, saveId FK, playerId FK, injuryTypeCode: text,
  startDate, estimatedReturnDate, actualReturnDate: date nullable,
  severity: 'minor'|'moderate'|'serious'|'career_threatening',
  occurredInMatchId FK nullable, occurredInTraining: boolean,
  recurrenceOf: FK nullable
}

suspensions: {
  id, saveId FK, playerId FK, competitionId FK,
  reason: 'yellow_accumulation'|'red_card'|'serious_foul'|'violent_conduct',
  matchesRemaining: smallint, startDate
}

card_counters: {
  saveId FK, playerId FK, competitionId FK, seasonYear,
  yellowCards, redCards: smallint,
  PK (saveId, playerId, competitionId, seasonYear)
}

player_state: {                            // sık değişen, sorgulanan alanlar
  saveId FK, playerId FK,
  morale: smallint,                        // 0-100
  condition: smallint,                     // 0-100
  matchSharpness: smallint,                // 0-100
  form: numeric(3,1),                      // son 5 maç ortalama reyting
  transferInterest: smallint,              // 0-100 ayrılma isteği
  marketValue: bigint,
  happinessReasons: jsonb,                 // {code, sentiment, weight}[]
  PK (saveId, playerId)
}

tactics: {
  id, saveId FK, clubId FK, slot: smallint,   // 1,2,3 (A/B/C)
  name: text, formationCode: text,
  mentality: smallint,                     // 1-5
  instructions: jsonb,                     // TeamInstructions
  playerRoles: jsonb,                      // {slotIndex, playerId, role, duty}[]
  setPieceTakers: jsonb,
  fluidity: smallint                       // 0-100 taktik akıcılığı
}

board_confidence: {
  saveId FK, clubId FK, managerId FK,
  overall: smallint,                       // 0-100
  leaguePosition, cupPerformance, financial,
  squadHarmony, youthDevelopment: smallint,
  stage: 'delighted'|'satisfied'|'uncertain'|'concerned'|'warned',
  expectations: jsonb
}
```

## 3.3 Sistem Tabloları

```ts
server_config: {                           // TEK SATIR
  id: smallint PK DEFAULT 1 CHECK (id = 1)
  mode: 'public'|'private'|'maintenance'
  maintenanceMessage: text
  privateMessage: text
  estimatedReturn: timestamptz nullable
  updatedByUserId FK, updatedAt
}

admin_ips: { id, cidr: cidr, label: text, addedByUserId FK, createdAt }
user_access_grants: { id, userId FK, grantedByUserId FK, expiresAt nullable, createdAt }

audit_log: {
  id: bigserial PK
  userId FK nullable, saveId FK nullable
  action: text                             // 'transfer.bid', 'turn.advance', 'admin.mode_change'
  entityType, entityId: text nullable
  payload: jsonb
  ip: inet, correlationId: text, turnId: text nullable
  createdAt: timestamptz
}
// INDEX: (userId, createdAt DESC), (action, createdAt DESC), (correlationId)

turn_locks: {
  saveId PK FK, turnToken: uuid, acquiredAt, expiresAt,
  progress: jsonb                          // tamamlanan adımlar (idempotency)
}

anomaly_flags: {
  id, saveId FK, ruleCode: text, details: jsonb,
  status: 'open'|'reviewed'|'cleared', reviewedByUserId FK nullable, createdAt
}

reports: {
  id, reporterUserId FK, targetType: text, targetId: text,
  reasonCode: text, note: text, status: 'open'|'actioned'|'dismissed'
}

rate_limit_violations: { id, key: text, endpoint: text, count: integer, windowStart }
```

## 3.4 WorldView / WorldMutation

```ts
// packages/db/src/world/world-view.ts
class WorldView {
  constructor(saveId: string, deltas: DeltaMap, master: MasterCache) {}
  getPlayer(id: number): Readonly<Player>          // master + delta birleşik
  getClub(id: number): Readonly<Club>
  getCompetition(id: number): Readonly<Competition>
  // Tüm dönüşler DeepReadonly — mutasyon derlenmiyor
}

// packages/db/src/world/world-mutation.ts
class WorldMutation {
  set<T extends EntityType>(type: T, id: number, field: FieldOf<T>, value: ValueOf<T>): void
  commit(turnNumber: number): Promise<void>        // toplu delta yazma
}
```

**Tip zorlaması:** `WorldView` dönüşleri `DeepReadonly<T>`. Master tablosuna Drizzle `update`/`insert` çağrısı yapan kod, özel bir ESLint kuralı + `db.master` salt-okunur istemcisi ile engellenir.

---

# 4. NİTELİK SİSTEMİ VE TÜRETME

## 4.1 Nitelik Envanteri

**47 görünür nitelik** (1–20). Kaleci nitelikleri yalnızca kalecilerde anlamlıdır; saha oyuncularında 1–3 arası sabitlenir.

| Kategori | Nitelikler (kod adı) |
|---|---|
| **Teknik (14)** | corners, crossing, dribbling, finishing, firstTouch, freeKickTaking, heading, longShots, longThrows, marking, passing, penaltyTaking, tackling, technique |
| **Zihinsel (14)** | aggression, anticipation, bravery, composure, concentration, decisions, determination, flair, leadership, offTheBall, positioning, teamwork, vision, workRate |
| **Fiziksel (8)** | acceleration, agility, balance, jumpingReach, naturalFitness, pace, stamina, strength |
| **Kaleci (11)** | aerialReach, commandOfArea, communication, eccentricity, handling, kicking, oneOnOnes, reflexes, rushingOut, tendencyToPunch, throwing |

**10 gizli nitelik** (1–20, kullanıcıya asla sayı olarak gösterilmez):
`consistency`, `importantMatches`, `injuryProneness`, `dirtiness`, `pressure`, `professionalism`, `ambition`, `loyalty`, `adaptability`, `temperament`

> **Yol haritasından sapma notu:** Yol haritası 8 gizli nitelik diyordu. Spesifikasyon sırasında **`adaptability`** (Faz 34'teki yabancı lig uyum süreci için) ve **`temperament`** (Faz 44'teki diyalog tepkileri için) eklendi. Bu iki sistem onlar olmadan kurulamıyordu. Toplam 10.

## 4.2 Mevki Ağırlıkları ve CA Hesabı

Her mevkinin bir **ağırlık vektörü** vardır (`packages/engine/src/rules/position-weights.ts`). Ağırlıklar toplamı her mevki için 100'e normalize edilir.

Örnek — **ST (Santrfor)**:
```ts
{ finishing: 12, offTheBall: 10, composure: 8, firstTouch: 7, dribbling: 6,
  heading: 6, technique: 6, anticipation: 6, decisions: 5, pace: 6,
  acceleration: 6, strength: 5, balance: 3, jumpingReach: 4, workRate: 3,
  passing: 3, determination: 2, concentration: 2 }
```

Örnek — **DC (Stoper)**:
```ts
{ marking: 11, tackling: 11, positioning: 10, heading: 9, jumpingReach: 8,
  strength: 7, anticipation: 7, concentration: 7, decisions: 6, composure: 5,
  bravery: 5, pace: 4, acceleration: 3, passing: 3, aggression: 2,
  firstTouch: 1, teamwork: 1 }
```

Örnek — **GK (Kaleci)**:
```ts
{ reflexes: 14, handling: 12, oneOnOnes: 10, positioning: 10, aerialReach: 9,
  commandOfArea: 8, concentration: 8, decisions: 7, kicking: 6, communication: 6,
  rushingOut: 5, composure: 3, throwing: 2 }
```

**Mevcut Yetenek (CA) formülü:**

```
CA = round( Σ(attribute_i × weight_i) / Σ(weight_i) × 10 )
```

1–20 nitelikler × 10 → 1–200 CA. Maksimum nitelikli oyuncu CA 200 olur.

**Ters yön (newgen üretimi):** Hedef CA verildiğinde nitelikler dağıtılır:
```
targetAvg = CA / 10
Her nitelik: base = targetAvg × (weight_i / avgWeight)
Sonra ±%15 rastgele varyasyon (SeededRng), 1-20'ye kırpma
CA yeniden hesaplanıp hedeften ±3'ten fazla saparsa iteratif düzeltme (max 20 iterasyon)
```

## 4.3 Gerçek İstatistikten Nitelik Türetme

Bu, hiçbir yerde açık kaynak olmayan verinin üretilmesidir. Girdi: `player_stats_history` (FBref/Understat/API-Football). Her nitelik için bir **türetme fonksiyonu** tanımlıdır.

**Ortak yardımcılar:**
```ts
// Yüzdelik dilimi 1-20'ye eşle (mevki ve lig içinde normalize)
p2a(percentile: number): number => clamp(1, 20, Math.round(1 + percentile * 19))

// Lig kalitesi katsayısı
leagueFactor(competitionReputation): number => 0.75 + (reputation / 200) * 0.45
// ENG PL (185) → 1.166 | TUR SL (135) → 1.053
```

**Türetme tablosu (temsili — tam liste `position-weights.ts` yanında):**

| Nitelik | Kaynak | Formül özeti |
|---|---|---|
| `passing` | pas isabeti + hacim | `p2a(0.6×pct(passCompletionRate) + 0.4×pct(passesPer90)) × leagueFactor` |
| `vision` | ilerletici pas + asist | `p2a(0.5×pct(progressivePassesPer90) + 0.5×pct(xA_per90))` |
| `finishing` | gol/xG + isabet | `p2a(0.55×pct(goals/xG) + 0.45×pct(shotAccuracy))` |
| `longShots` | ceza sahası dışı şut oranı ve dönüşümü | `p2a(0.5×pct(outsideBoxShots) + 0.5×pct(outsideBoxConversion))` |
| `dribbling` | başarılı dripling | `p2a(0.7×pct(dribbleSuccessRate) + 0.3×pct(dribblesPer90))` |
| `crossing` | orta sayısı × isabet | `p2a(pct(crossCompletionRate))` |
| `heading` | hava topu kazanma | `p2a(0.7×pct(aerialWinRate) + 0.3×pct(headedGoals))` |
| `tackling` | müdahale başarısı − faul | `p2a(pct(tackleSuccessRate) − 0.25×pct(foulsPer90))` |
| `marking` | rakip xG bastırma + engelleme | `p2a(0.5×pct(interceptionsPer90) + 0.5×pct(blocksPer90))` |
| `anticipation` | top kesme + önleme | `p2a(pct(interceptionsPer90))` |
| `workRate` | koşu mesafesi yoksa: presleme + müdahale hacmi | `p2a(0.5×pct(pressuresPer90) + 0.5×pct(duelsPer90))` |
| `stamina` | maç başı dakika + geç dakika katkısı | `p2a(0.6×pct(minutesPerApp) + 0.4×pct(late_game_actions))` |
| `pace`/`acceleration` | hız verisi varsa doğrudan; yoksa yaş + mevki + dripling | `p2a(pct(topSpeed))` veya `ageCurve(age) × positionBase × pct(dribbleSuccess)` |
| `strength` | ikili mücadele + boy/kilo | `p2a(0.6×pct(duelWinRate) + 0.4×pct(bmi_adjusted))` |
| `composure` | baskı altında pas isabeti + penaltı | `p2a(0.6×pct(passAccuracyUnderPressure) + 0.4×pct(penaltyConversion))` |
| `reflexes` (GK) | kurtarış oranı + xGA farkı | `p2a(0.5×pct(saveRate) + 0.5×pct(xGA − goalsConceded))` |
| `handling` (GK) | tutma vs. sektirme | `p2a(pct(catchRate))` |
| `commandOfArea` (GK) | orta çıkışı | `p2a(pct(crossesClaimedRate))` |

**Doğrudan ölçülemeyenler** (`decisions`, `positioning`, `teamwork`, `concentration`, `leadership`, `bravery`, `flair`, `aggression`):
```
base = CA_estimate / 10                       // lig + dakika + değerden ön tahmin
value = clamp(1, 20, round(base + positionModifier + rng.normal(0, 1.5)))
```
`leadership` ayrıca kaptanlık geçmişi ve yaşla ayarlanır (+2 kaptansa, +1 her 4 yaş 26 üstü).

**CA ön tahmini (istatistik yetersizse):**
```
CA_estimate = 0.45×norm(marketValue) + 0.25×norm(leagueReputation)
            + 0.20×norm(minutesPlayed) + 0.10×norm(clubReputation)
```

## 4.4 Potansiyel Yetenek (PA)

```
growthSlope = (CA_thisSeason − CA_twoSeasonsAgo) / 2      // yoksa 0
youthBonus  = age <= 21 ? (22 − age) × 4 : 0
eliteBonus  = playedTopLeagueBefore23 ? 8 : 0
PA_raw = CA + growthSlope × yearsToPeak(age) + youthBonus + eliteBonus
PA = clamp(CA, 200, round(PA_raw))

yearsToPeak(age) = clamp(0, 10, 27 − age)
```

**Belirsizlik bandı:**
```
uncertainty = clamp(3, 40, 40 − age × 1.2 − minutesConfidence × 10)
paRangeMin = clamp(CA, 200, PA − uncertainty)
paRangeMax = clamp(CA, 200, PA + uncertainty)
```
16 yaşında hiç oynamamış oyuncu: bant ±20. 29 yaşında oturmuş oyuncu: bant ±3.

## 4.5 Gizli Nitelik Türetme

| Nitelik | Türetme |
|---|---|
| `consistency` | maç reytinglerinin standart sapmasının tersi → `p2a(1 − pct(ratingStdDev))` |
| `importantMatches` | derbi/kupa/Avrupa maçlarındaki reyting − genel reyting ortalaması |
| `injuryProneness` | son 3 sezondaki sakatlık günü sayısı → `p2a(pct(injuryDays))` |
| `dirtiness` | `p2a(0.6×pct(foulsPer90) + 0.4×pct(cardsPer90))` |
| `pressure` | penaltı dönüşümü + son 15 dakika performansı |
| `professionalism` | kart disiplini + kariyer istikrarı + gelişim eğimi |
| `ambition` | kulüp değiştirme yönü (yukarı transfer sayısı) + genç yaşta üst lig |
| `loyalty` | aynı kulüpteki ortalama yıl sayısı → `p2a(pct(avgTenure))` |
| `adaptability` | yabancı lig sayısı + oralarda ilk sezon performansı |
| `temperament` | kırmızı kart + disiplin olayları (ters) |

Veri yoksa: `clamp(1, 20, round(10 + rng.normal(0, 3.5)))`

## 4.6 Kişilik Türetme

Kişilik **saklanmaz, türetilir**. `derivePersonality(hidden): PersonalityCode`

Öncelik sıralı kural zinciri (ilk eşleşen kazanır):

```
professionalism>=18 && determination>=18 && ambition>=15 → 'model_citizen'
professionalism>=16 && determination>=16               → 'professional'
professionalism>=15 && loyalty>=15 && temperament>=13   → 'model_professional'
ambition>=18 && professionalism<=9                      → 'unambitious'... (ters)
ambition>=17 && determination>=15                       → 'driven'
ambition<=7  && professionalism<=8                      → 'casual'
temperament<=6 && dirtiness>=14                         → 'volatile'
temperament<=8                                          → 'temperamental'
pressure<=7  && consistency<=9                          → 'spineless'
pressure>=16 && importantMatches>=15                    → 'big_game_player'
loyalty>=17                                             → 'loyal'
loyalty<=6  && ambition>=14                             → 'mercenary'
leadership>=16 && teamwork>=15                          → 'born_leader'
leadership>=15 && ambition>=15 && teamwork<=9           → 'ivory_tower'
adaptability>=16                                        → 'adaptable'
adaptability<=6                                         → 'homesick'
consistency<=8                                          → 'inconsistent'
... (25 kişilik toplam)
varsayılan                                              → 'balanced'
```

Kişilik; diyalog tepkilerini (Bölüm 8), gelişim hızını, moral dayanıklılığını ve transfer kararlarını etkiler.

## 4.7 Piyasa Değeri

```
ageMultiplier:
  16-18 → 1.15   19-21 → 1.30   22-24 → 1.25   25-27 → 1.10
  28-29 → 0.85   30-31 → 0.60   32-33 → 0.38   34-35 → 0.20   36+ → 0.08

contractMultiplier (kalan ay):
  >36 → 1.10  |  24-36 → 1.00  |  12-23 → 0.80  |  6-11 → 0.50  |  <6 → 0.22

baseValue = (CA^3.2 / 5200) × 1_000_000          // EUR cent

value = baseValue
      × ageMultiplier(age)
      × contractMultiplier(monthsLeft)
      × (0.85 + potentialFactor × 0.45)           // potentialFactor = (PA−CA)/60, 0-1'e kırpılır
      × leagueFactor(competitionReputation)       // 0.75 - 1.20
      × (0.90 + form/20)                          // form 0-10
      × positionScarcity(position)                // GK 0.82, ST 1.12, DC 0.95, AMC 1.08...
      × (1 − injuryPenalty)                       // son 2 sezon sakatlık günü / 400, max 0.30
      × inflationIndex(seasonYear)                // yıllık %4-8

inflationIndex(year) = 1.06 ^ (year − startYear)
```

Doğrulama hedefi: 20 sezon sonunda en pahalı oyuncu **500 mn EUR altında** kalmalı.

---

# 5. MAÇ MOTORU SPESİFİKASYONU

## 5.1 Mimari

`packages/engine/src/match/` — tamamen saf (K3). Girdi: iki takım durumu + taktik + bağlam + tohum. Çıktı: `MatchResult`.

```ts
function simulateMatch(input: MatchInput): MatchResult

interface MatchInput {
  home: TeamState; away: TeamState
  tactics: { home: Tactics; away: Tactics }
  context: MatchContext          // hakem, hava, zemin, seyirci, önem
  seed: bigint
  tier: 'full' | 'medium' | 'statistical'
}

interface MatchResult {
  homeGoals: number; awayGoals: number
  events: MatchEvent[]           // TEK doğruluk kaynağı
  playerStats: PlayerMatchStats[]
  teamStats: { home: TeamStats; away: TeamStats }
  debugTrace?: MatchDebugTrace
}
```

**Olay akışı (event stream)** her şeyin kaynağıdır: 2D oynatıcı, anlatım, istatistik, ısı haritası, maç sonrası analiz — hepsi aynı `MatchEvent[]` dizisinden türetilir. İkinci bir hesaplama yapılmaz.

## 5.2 Üç Katman

| Katman | Ne zaman | Yöntem | Hedef süre |
|---|---|---|---|
| `full` | Kullanıcının maçı; `simulationTier='full'` ise tüm maçlar | Tam tik döngüsü, 22 oyuncu konumu, tüm olaylar | < 250 ms |
| `medium` | Kullanıcının ligindeki diğer maçlar | Basitleştirilmiş pozisyon modeli, konum takibi yok | < 20 ms |
| `statistical` | Diğer ülkelerin ligleri (Dengeli modda) | Dixon-Coles benzeri, gol dağılımı + kart + sakatlık | < 1 ms |

Üç katman da **aynı tohumla aynı skoru üretmek zorunda değildir** (farklı modeller), ancak her biri kendi içinde deterministiktir. Bir maçın katmanı `matches` tablosuna yazılır ve değişmez.

## 5.3 Tik Döngüsü (full)

```
1080 tik = 90 dakika (tik = 5 saniye) + uzatma
Her tik:
  1. Konum güncelle       (roller + top konumu + faz)
  2. Faz belirle          (buildup|progression|final_third|attack|defence|transition)
  3. Aksiyon seç          (top sahibi oyuncunun kararı)
  4. Aksiyonu çöz         (5.5)
  5. Kondisyon tüket
  6. Momentum güncelle
  7. Olay üret
  8. Kesinti kontrolü     (sakatlık, kart, değişiklik, duran top)
```

## 5.4 Temel Yarışma Formülü

Motordaki **her** karşılaştırma bu formülü kullanır — tutarlılık için başka bir yöntem kullanılmaz:

```ts
function contest(a: number, b: number, sharpness = 1.6): number {
  const A = Math.max(0.1, a), B = Math.max(0.1, b);
  return A ** sharpness / (A ** sharpness + B ** sharpness);
}
```

`sharpness` sonucun ne kadar deterministik olduğunu belirler:
- `1.2` — sürpriz olasılığı yüksek (dripling, ikili mücadele)
- `1.6` — varsayılan
- `2.2` — güçlü olan neredeyse hep kazanır (hava topu boy farkı)

## 5.5 Aksiyon Çözümlemeleri

### Pas

```ts
attackerRating =
    passing     × 0.30
  + technique   × 0.18
  + vision      × 0.18
  + decisions   × 0.14
  + composure   × 0.12
  + firstTouch  × 0.08

pressureFactor  = 1 − (pressure / 4) × (1 − composure / 26)   // pressure: 0-3
distanceFactor  = distance <= 15 ? 1.0
                : distance <= 30 ? 0.88
                : 0.70
lanePenalty     = throughBall ? 0.72 : crossField ? 0.84 : 1.0
weatherFactor   = { clear:1.0, cloudy:1.0, rain:0.94, heavy_rain:0.87, snow:0.82, fog:0.93, windy:0.91 }
pitchFactor     = { excellent:1.02, good:1.0, average:0.97, poor:0.92, terrible:0.86 }

effectiveAttack = attackerRating × pressureFactor × distanceFactor
                × lanePenalty × weatherFactor × pitchFactor × conditionFactor

defenderRating  = (positioning × 0.40 + anticipation × 0.35 + concentration × 0.25) × 0.62

P(success) = contest(effectiveAttack, defenderRating, 1.5)
```

Başarısızlıkta: %62 kesilme (rakip topu kazanır), %28 auta, %10 rakibe düşen serbest top.

### Dripling

```ts
attacker = dribbling × 0.32 + agility × 0.18 + balance × 0.14
         + acceleration × 0.16 + flair × 0.10 + technique × 0.10
defender = tackling × 0.30 + positioning × 0.24 + anticipation × 0.20
         + pace × 0.14 + acceleration × 0.12

P(success) = contest(attacker × conditionFactor, defender × 1.05, 1.25)
```
Başarısızlıkta: `contest(defender.dirtiness, 12, 1.4)` olasılıkla faul → duran top.

### İkili Mücadele (yer)

```ts
rating = strength × 0.30 + balance × 0.22 + aggression × 0.16
       + bravery × 0.16 + determination × 0.16
P(A) = contest(ratingA × conditionA, ratingB × conditionB, 1.4)
```

### Hava Topu

```ts
heightBonus = (heightCm − 180) × 0.10           // 190 cm → +1.0
rating = jumpingReach × 0.34 + heading × 0.26 + strength × 0.18
       + bravery × 0.12 + positioning × 0.10 + heightBonus
P(A) = contest(ratingA, ratingB, 2.0)
```

### Müdahale (Tackle)

```ts
P(cleanTackle) = contest(tackling × 0.6 + anticipation × 0.4,
                         dribbling × 0.5 + balance × 0.5, 1.5)

// Temiz değilse faul olasılığı:
P(foul) = clamp(0.15, 0.85, 0.30 + dirtiness × 0.022 + aggression × 0.012
                            − referee.foulTolerance × 0.015)

// Faulse kart olasılığı:
cardScore = referee.strictness × 0.5 + foulSeverity × 3.0
          + matchTension × 0.8 + (isDangerZone ? 2.5 : 0)
P(yellow) = clamp(0.05, 0.75, cardScore / 28)
P(red)    = foulSeverity >= 4 ? 0.55 : (isLastMan ? 0.70 : 0.015)
```

`matchTension` = derbi yoğunluğu + skor farkı yakınlığı + dakika (geç dakika ↑) + kart sayısı.

## 5.6 Şut ve xG

**xG lojistik modeli** (katsayılar kalibre edilmiş, değiştirilmemeli):

```ts
z = 1.85
  − 1.42 × Math.log(distanceMeters)
  + 1.10 × angleRatio                      // 0-1, kale açıklığının görünen oranı
  + bodyPartCoef                           // foot: 0 | head: −0.65 | other: −0.40
  − 0.28 × pressure                        // 0-3
  + assistCoef                             // throughBall +0.35 | cross +0.10
                                           // rebound +0.45 | setPiece −0.15 | openPlay 0
  + 0.22 × (isCounterAttack ? 1 : 0)
  − 0.30 × (defendersInLine)               // kaleci hariç çizgideki savunmacı, 0-2

xG = 1 / (1 + Math.exp(−z))
```

Doğrulama: ortalama şut xG **0.09–0.13** aralığında olmalı.

**Şut sonucu:**

```ts
finishingQuality = (finishing × 0.42 + composure × 0.22 + technique × 0.20
                  + (isLongShot ? longShots × 0.16 : 0)) / 20     // 0-1

adjustedXG = xG × (0.62 + finishingQuality × 0.76)                // ±%38 oyuncu etkisi

keeperQuality = (reflexes × 0.30 + positioning × 0.22 + handling × 0.18
               + oneOnOnes × 0.16 + aerialReach × 0.08 + concentration × 0.06) / 20

saveModifier = 0.78 + keeperQuality × 0.44                        // 0.78 - 1.22
finalGoalProb = adjustedXG / saveModifier

roll = rng.next()
if (roll < finalGoalProb)                          → GOAL
else if (roll < finalGoalProb + 0.24)              → SAVE
else if (roll < finalGoalProb + 0.30)              → POST/CROSSBAR
else if (roll < finalGoalProb + 0.42)              → BLOCKED
else                                               → OFF_TARGET
```

**Sekme (rebound):** SAVE sonrası
```ts
P(rebound) = clamp(0.05, 0.45, 0.35 − keeper.handling × 0.018)
```
Sekerse yeni şut fırsatı (`assistCoef = rebound`).

## 5.7 Kaleci Modeli

| Nitelik | Etki |
|---|---|
| `reflexes` | Yakın mesafe (<12 m) kurtarışa +%40 ağırlık |
| `handling` | Sekme olasılığını düşürür (yukarıdaki formül) |
| `oneOnOnes` | Tekebir pozisyonda `saveModifier`'a ×1.15'e kadar bonus |
| `positioning` | Şut anındaki `angleRatio`'yu düşürür: `angleRatio × (1 − positioning × 0.012)` |
| `aerialReach` + `commandOfArea` | Orta çıkışı: `P(claim) = contest(aerialReach×0.5+commandOfArea×0.5, attackerAerial, 1.8)` |
| `rushingOut` | Yüksek savunma hattında arkaya atılan topu kesme |
| `kicking` + `throwing` | Dağıtım kalitesi → sonraki pasın `distanceFactor`'ı |
| `communication` | Takımın savunma niteliklerine `+communication × 0.03` bonus |
| `eccentricity` | Yüksekse riskli çıkış olasılığı ↑ (hata veya süper kurtarış) |
| `tendencyToPunch` | Yumruklama vs. tutma tercihi |

## 5.8 Duran Toplar

Hedef: toplam gollerin **%26–34'ü** duran toptan (penaltı dahil).

### Penaltı
```ts
takerRating   = penaltyTaking × 0.45 + composure × 0.30 + technique × 0.25
keeperRating  = (hidden.penaltySavingProxy) × 0.40 + reflexes × 0.35 + oneOnOnes × 0.25
// penaltySavingProxy = (reflexes + oneOnOnes + anticipation) / 3

pressureAdj   = isDecisiveMoment ? (1 − (20 − pressure) × 0.010) : 1.0
P(goal) = clamp(0.55, 0.94,
          0.76 + (takerRating − 12) × 0.018 − (keeperRating − 12) × 0.012) × pressureAdj
```
Hedef gol oranı: **%74–80**.

### Direkt Frikik
```ts
distanceFactor = clamp(0.05, 1.0, 1.45 − distanceMeters × 0.042)
angleFactor    = angleRatio ** 0.6
takerRating    = freeKickTaking × 0.50 + technique × 0.30 + composure × 0.20

baseProb = 0.055 × distanceFactor × angleFactor × (0.45 + takerRating / 20 × 1.10)
P(goal)  = baseProb / saveModifier
// Kalan: %30 baraj, %35 kurtarış, %35 aut
```

### Korner
```ts
deliveryQuality = (corners × 0.55 + crossing × 0.30 + technique × 0.15) / 20
                × weatherFactor × (1 − pressure × 0.05)

// Hedef oyuncu seçimi: ceza sahasındaki saldıranlar arasında
// ağırlık = jumpingReach×0.4 + heading×0.35 + offTheBall×0.15 + bravery×0.10

attackAerial  = hedefOyuncu hava topu ratingi
defenceAerial = en yakın savunmacı + (zoneMarking ? organizasyon bonusu : 0)
keeperClaim   = P(claim) — 5.7'deki formül

if (keeper claims)                    → kurtarış
else if contest(attackAerial, defenceAerial, 1.9) → kafa şutu (xG hesabı, assistCoef = setPiece)
else if rng < 0.18                    → karambol (ikinci top, rastgele oyuncuya)
else                                  → uzaklaştırma

P(cornerGoal) yaklaşık = deliveryQuality × 0.055 + 0.012
```
Korner→gol dönüşüm hedefi: **%2.5–4.0**.

### Uzun Taç
`longThrows >= 15` olan oyuncu varsa korner benzeri rutin, `deliveryQuality = longThrows / 20 × 0.8`.

## 5.9 Bağlam Katmanı

### Ev Sahibi Avantajı
```ts
attendanceRatio = attendance / stadiumCapacity
atmosphere = attendanceRatio × (0.6 + supporterExpectation / 100 × 0.4)
           × (1 + rivalryIntensity × 0.05)

homeBonus = 0.030 + atmosphere × 0.035 + referee.homeBias × 0.0018
// Ev sahibinin tüm aksiyon ratinglerine × (1 + homeBonus)
// Deplasman moraline: −atmosphere × 0.04
```
Hedef: ev sahibi galibiyet **%43–48**, beraberlik **%23–28**.

### Kondisyon
```ts
// Dakika başı tüketim
drain = baseDrain(0.55)
      × (1 + workRate / 40)
      × (1 + pressingIntensity × 0.12)          // 0-4
      × (2.0 − stamina / 20)
      × weatherStaminaFactor                     // sıcak 1.18, kar 1.12, normal 1.0
      × pitchStaminaFactor                       // berbat 1.15

condition -= drain

// Kondisyon nitelik cezası
if (condition < 70)  fizikselNitelikler × (0.70 + condition / 233)
if (condition < 50)  zihinselNitelikler × (0.82 + condition / 278)
```

### Sakatlık
```ts
P(injuryPerAction) = base(0.00018)
  × (1 + injuryProneness × 0.11)
  × (1 + (100 − condition) × 0.014)
  × pitchInjuryFactor          // berbat 1.45, kötü 1.22, normal 1.0
  × weatherInjuryFactor         // kar 1.20, şiddetli yağmur 1.12
  × (1 + max(0, age − 29) × 0.06)
  × (isTackled ? 2.4 : 1.0)
  × trainingLoadFactor          // son 4 hafta yoğunluk, 0.85 - 1.35
```
Hedef: maç başına **0.15–0.35** sakatlık.

### VAR
Ligde `varEnabled` ise şu olaylarda inceleme tetiklenir:
```
Gol sonrası ofsayt:      P(review) = 0.12  → P(overturn) = 0.28
Penaltı kararı:          P(review) = 0.22  → P(overturn) = 0.24
Kırmızı kart:            P(review) = 0.35  → P(overturn) = 0.20
Verilmemiş penaltı:      P(review) = 0.08  → P(award) = 0.31

overturnProb × (1.35 − referee.consistency × 0.030)   // tutarsız hakem daha çok bozulur
```
İnceleme süresi 45–180 sn, uzatmaya eklenir. `VAR_REVIEW_START` ve `VAR_REVIEW_END` olayları üretilir.

## 5.10 Momentum

```ts
momentum: 0-100, başlangıç 50
Gol atma:        +14        Gol yeme:        −14
İsabetli şut:    +2.5       Kırmızı kart:    −18 (alan) / +12 (rakip)
Direkten dönen:  +4         Sakatlık:        −4
Kurtarış:        +1.5       Kaçan net fırsat: −3
Her tik:         50'ye doğru 0.6 birim geri çekilir

Etki: hücum aksiyonu seçme olasılığı × (0.86 + momentum / 350)
      taraftar uğultusu yoğunluğu = f(momentum, top konumu)
```

## 5.11 Oyuncu Maç Reytingi

```
6.0 taban. Mevkiye göre ağırlıklı olay puanlaması:

TÜM MEVKİLER
  Gol +1.10 (ST için +0.95, DC için +1.35)
  Asist +0.65 | Anahtar pas +0.12 | Başarılı dripling +0.06
  Top kaybı −0.05 | Sarı kart −0.25 | Kırmızı kart −1.20
  Kaçırılan net fırsat (xG>0.35) −0.30 | Penaltı kaçırma −0.60

KALECİ
  Kurtarış +0.16 | Süper kurtarış (xG>0.4) +0.42 | Penaltı kurtarma +0.85
  Gol yeme −0.28 | Clean sheet +0.55 | Hata → gol −1.05

SAVUNMA
  Başarılı müdahale +0.09 | Top kesme +0.08 | Uzaklaştırma +0.04
  Hava topu kazanma +0.05 | Hata → gol −0.95 | Geçilme −0.07

ORTA SAHA
  Pas isabeti bonusu: (accuracy − 0.80) × 2.2
  İlerletici pas +0.05 | Top kazanma +0.07

Son: clamp(1.0, 10.0, round(rating, 1))
```

## 5.12 Gol Türü Sınıflandırması

2D animasyon seçimi buna bağlıdır (Bölüm 7.6). Her gol tam olarak **bir** tür alır:

```
penalty          → penaltı noktasından
directFreeKick   → direkt frikik golü
cornerHeader     → korner + kafa
cornerScramble   → korner + karambol
header           → açık oyun + kafa
volley           → hava topundan ayak vuruşu
bicycle          → röveşata (flair >= 16 && rng < 0.04)
longRange        → mesafe > 25 m
soloRun          → gol öncesi 2+ başarılı dripling
counterAttack    → top kazanımından 12 saniye içinde
chip             → keeper.rushingOut yüksek + composure >= 15
curler           → technique >= 16 && açı dar
tapIn            → mesafe < 6 m && xG > 0.55
rebound          → sekmeden
deflection       → savunmadan sekerek
ownGoal          → kendi kalesine
openPlayFinish   → yukarıdakilerin hiçbiri değilse (varsayılan)
```

## 5.13 Denge Doğrulama Hedefleri

`pnpm sim:balance` 10.000 maç simüle eder ve **tümü** tutmalıdır:

| Metrik | Hedef aralık |
|---|---|
| Maç başı toplam gol | 2.50 – 2.90 |
| Ev sahibi galibiyet | %43 – %48 |
| Beraberlik | %23 – %28 |
| Maç başı şut | 22 – 30 |
| Maç başı isabetli şut | 7.5 – 10.5 |
| Ortalama şut xG | 0.09 – 0.13 |
| Maç başı pas | 800 – 1000 |
| Pas isabeti | %78 – %86 |
| Maç başı korner | 9 – 12 |
| Korner→gol dönüşümü | %2.5 – %4.0 |
| Duran top golü oranı | %26 – %34 |
| Kafa golü oranı | %13 – %18 |
| Penaltı gol oranı | %74 – %80 |
| Maç başı sarı kart | 3.4 – 4.6 |
| Maç başı kırmızı kart | 0.05 – 0.12 |
| Maç başı sakatlık | 0.15 – 0.35 |
| Top hakimiyeti std sapma | 8 – 14 |

**Simetri testi:** Aynı takım kendine karşı 1000 maç → galibiyet oranı %48–52.
**Güç testi:** CA farkı 30 olan takımlar 1000 maç → güçlü olan %62–72 kazanır.

---

# 6. YAPAY ZEKA SKORLAMA TABLOLARI

Tüm AI kararları **kural tabanlı ağırlıklı skorlama**dır. LLM çağrısı yapılmaz. Her karar `debugTrace` üretir (K7).

## 6.1 Kadro Seçimi

```ts
playerScore =
    roleSuitability   × 0.32      // 0-1, rol uygunluk (6.2)
  + formNormalized    × 0.19      // form / 10
  + conditionFactor   × 0.16      // condition / 100, <75 ise kare alınır
  + moraleNormalized  × 0.09      // morale / 100
  + abilityNormalized × 0.16      // CA / 200
  + experienceFactor  × 0.05      // clamp(0,1, appearances / 150)
  + sharpnessFactor   × 0.03      // matchSharpness / 100

// Elemeler (skor hesaplanmadan önce):
if (suspended || injured || !registrationEligible) → ELENDİ
if (condition < 55 && !isEmergency)                → ELENDİ

// Rotasyon (yoğun fikstür):
if (daysSinceLastMatch < 4)  score × 0.72
if (matchesInLast14Days >= 4) score × 0.80
if (nextMatchImportance > currentMatchImportance) score × 0.85   // önemli maça saklama

// Sözleşme rolü garantisi:
squadRole 'star'            → score × 1.14
squadRole 'first_team'      → score × 1.08
squadRole 'youth'           → score × 0.88
```

Her diziliş slotu için en yüksek skorlu uygun oyuncu seçilir, Macar algoritması ile global optimum atama yapılır (açgözlü seçim yerel optimuma takılır).

## 6.2 Rol Uygunluk

```ts
roleSuitability = Σ(attribute_i × roleWeight_i) / Σ(roleWeight_i) / 20
                × positionLevelMultiplier

positionLevelMultiplier:
  natural       → 1.00
  accomplished  → 0.94
  competent     → 0.85
  awkward       → 0.68
  ineffectual   → 0.45
```

Yıldız gösterimi: `stars = clamp(0.5, 5, round(roleSuitability × 5 × 2) / 2)`

## 6.3 Taktik Seçimi

```ts
// Kadro profil analizi
squadProfile = {
  paceOnFlanks:   avg(kanat oyuncularının pace + acceleration)
  aerialThreat:   avg(forvet + stoper jumpingReach + heading)
  technicalDepth: avg(orta saha technique + passing + vision)
  defensiveSolidity: avg(savunma marking + tackling + positioning)
  pressingCapacity:  avg(tüm kadro workRate + stamina + aggression)
}

// Her diziliş için uygunluk
formationFit = Σ(squadProfile[k] × formationRequirement[k]) / Σ(formationRequirement)

// Menajer kişiliği
finalScore = formationFit × 0.62
           + philosophyMatch × 0.22          // menajerin felsefesine uyum
           + opponentCounter × 0.16          // rakip analizi (varsa)

// Mentalite seçimi
mentality = base(3)                          // dengeli
  + (ownReputation − oppReputation) / 50     // güçlüysek hücumcu
  + (isHome ? 0.4 : −0.4)
  + managerPhilosophyOffset                  // −1.0 ... +1.0
  + (needsGoals ? 1.0 : 0)                   // skor gerideyse
clamp(1, 5, round(mentality))
```

## 6.4 Transfer İhtiyaç Analizi

```ts
// Her mevki için
positionNeed =
    depthGap        × 0.30      // (idealDepth − currentDepth) / idealDepth
  + qualityGap      × 0.28      // (ligOrtalamaCA − mevkiOrtalamaCA) / 40
  + ageRisk         × 0.16      // 30+ yaş oyuncu oranı
  + contractRisk    × 0.14      // 12 aydan az sözleşmesi olanların oranı
  + injuryRisk      × 0.07      // sakatlık geçmişi yoğunluğu
  + starDependency  × 0.05      // tek yıldıza bağımlılık

idealDepth: GK 3 | DC 4 | DL/DR 2 | DM 2 | MC 3 | AML/AMR 2 | AMC 2 | ST 3

// Hedef oyuncu skorlaması
targetScore =
    qualityUplift   × 0.34      // (hedefCA − mevcutEnİyiCA) / 30
  + potentialValue  × 0.20      // (PA − CA) / 60 × (30 − age) / 14
  + affordability   × 0.20      // 1 − (fee / transferBudget)
  + wageAffordability × 0.12    // 1 − (wage / availableWageSpace)
  + positionNeed    × 0.10
  + adaptationEase  × 0.04      // aynı lig/ülke/dil bonusu

// Filtreler
if (fee > transferBudget × 1.05)          → ELENDİ
if (wage > maxWageStructure × 1.20)       → ELENDİ  // maaş yapısını bozar
if (!workPermitEligible)                  → ELENDİ
if (targetCA < currentBestCA − 8)         → ELENDİ  // gerileme transferi yapma
if (targetScore < 0.35)                   → ELENDİ
```

## 6.5 Teklif Değerlendirme (Satıcı Tarafı)

```ts
askingPrice = marketValue × reluctanceMultiplier

reluctanceMultiplier =
    1.0
  + squadRoleFactor           // star +0.55 | first_team +0.30 | rotation +0.08 | backup −0.12
  + contractLengthFactor      // >36ay +0.25 | 24-36 +0.12 | 12-23 0 | <12 −0.30
  + ageFactor                 // <=23 +0.20 | 24-28 0 | 29-31 −0.15 | 32+ −0.35
  − financialPressure         // 0 ... 0.45 (nakit sıkışıksa indirim)
  + rivalPremium              // aynı ligden rakip kulüpse +0.30, derbi rakibiyse +0.55
  − playerWantsAway           // transferInterest / 100 × 0.35
  + competitionPremium        // 2+ kulüp teklif verdiyse +0.15 her biri için

P(accept) = contest(offerValue, askingPrice, 3.0)
// Karşı teklif: askingPrice × (0.92 + rng × 0.10)
// 5 tur sonunda anlaşma yoksa müzakere kapanır
```

## 6.6 Oyuncu Kişisel Şart Talebi

```ts
demandedWage = leagueAverageWageForCA(CA)
  × ambitionFactor              // 0.90 + ambition / 20 × 0.35
  × reputationFactor            // 0.85 + clubReputation / 200 × 0.30
  × agentGreedFactor            // reasonable 1.0 | tough 1.12 | greedy 1.28
  × (1 − negotiatingSkill × 0.012)   // menajerin Pazarlık niteliği
  × loyaltyDiscount             // mevcut kulüpteyse: 1 − loyalty × 0.008

demandedRole = f(CA vs kadro ortalaması):
  CA > kadroOrt + 15  → 'star'
  CA > kadroOrt + 5   → 'first_team'
  CA > kadroOrt − 5   → 'important_rotation'
  CA > kadroOrt − 15  → 'rotation'
  else                → 'backup'

P(accept) = contest(offeredPackageValue, demandedPackageValue, 2.6)
  × (1 + ambition × 0.008 × clubReputationDelta)   // büyük kulübe gitmek için taviz
  × (1 + loyalty × 0.010 if mevcut kulüp)
```

## 6.7 Kulüp Mali Disiplin

```ts
// FFP kontrolü — AI kulüp ASLA aşmaz
maxWageBill      = annualRevenue × 0.70
maxTransferSpend = cashBalance × 0.55 + expectedTransferIncome × 0.80
threeYearLossCap = annualRevenue × 0.35

// Bütçe tahsisi (sezon başı)
transferBudget = (cashBalance × 0.40 + projectedProfit × 0.55)
               × ambitionMultiplier      // yönetim hırsı 0.75 - 1.25
               × (1 − ffpPressure)       // 0 ... 0.60

wageBudget = min(currentWageBill × 1.12, maxWageBill)
```

## 6.8 Antrenman Ataması

```ts
// Bireysel odak seçimi: en yüksek "gelişim getirisi" olan nitelik grubu
groupReturn = Σ over nitelikler in grup:
    roleWeight_i                        // bu oyuncunun rolü için önemi
  × (20 − currentValue_i) / 20          // gelişim alanı
  × ageGrowthFactor
  × coachQualityForGroup / 20

// En yüksek getirili grup seçilir
// Genç oyuncularda (< 21) rol antrenmanı %35 olasılıkla tercih edilir
```

## 6.9 Yönetim Güveni

```ts
boardConfidence =
    leaguePositionScore   × 0.38      // beklenti vs gerçek sıra
  + cupPerformanceScore   × 0.16
  + financialScore        × 0.18
  + squadHarmonyScore     × 0.13
  + youthDevelopmentScore × 0.08
  + playingStyleScore     × 0.07

leaguePositionScore = clamp(0, 100, 50 + (expectedPosition − actualPosition) × 7)

// Aşamalar
>= 80 → delighted    | 60-79 → satisfied  | 40-59 → uncertain
20-39 → concerned    | < 20  → warned

// Kovulma
if (stage === 'warned' && consecutiveTurnsInWarned >= 21) → SACK
if (boardConfidence < 8)                                   → SACK (anında)
// Zorluk etkisi: easy ×1.35 sabır | normal ×1.0 | hard ×0.78 | legendary ×0.60
```

## 6.10 Menajer İşe Alma (AI Kulüp)

```ts
candidateScore =
    reputationMatch     × 0.34      // 1 − |menajerİtibar − kulüpİtibar| / 100
  + badgeScore          × 0.16      // none 0 | c 0.25 | b 0.50 | a 0.75 | pro 1.0
  + experienceScore     × 0.16
  + philosophyMatch     × 0.14      // kulüp tercihiyle uyum
  + availability        × 0.10      // işsizse 1.0, sözleşmeliyse 0.4
  + affordability       × 0.10

// Kullanıcının başvurusu da bu havuzda değerlendirilir
P(accept) = contest(candidateScore, bestRivalCandidateScore, 2.0)
           × urgencyBonus            // kulüp acilse 1.0 - 1.4
// Cevap 1-14 tur içinde gelir: responseTurns = 2 + round(rng × 12 × (1 − urgency))
```

## 6.11 Gelişim Motoru

```ts
// Aylık çalışır
ageFactor:
  15-17 → 1.55   18-19 → 1.42   20-21 → 1.24   22-23 → 1.05
  24-25 → 0.78   26-27 → 0.50   28-29 → 0.24   30-31 → 0.02
  32-33 → −0.28  34-35 → −0.52  36+   → −0.78

headroom = (PA − CA) / max(1, PA) 

monthlyDelta =
    BASE_RATE(1.15)
  × ageFactor
  × headroom
  × (trainingFacilityLevel / 12)         // 1-20 → 0.08-1.67
  × (relevantCoachQuality / 12)
  × playingTimeFactor                    // 0.55 + (minutesLast90Days / 1350) × 0.75
  × (0.80 + morale / 250)
  × (0.72 + professionalism / 45)
  × (0.78 + determination / 50)
  × (0.85 + ambition / 60)
  × injuryFactor                         // sakatken 0.25, dönüşten sonra 3 ay 0.80
  × matchQualityFactor                   // ligin prestiji / 150, 0.7-1.3
  × mentorFactor                         // 1.0 - 1.18
  × trainingIntensityFactor              // düşük 0.80 | orta 1.0 | yüksek 1.15

// CA'ya uygula, sonra nitelik dağılımı:
// Delta pozitifse → bireysel antrenman odağındaki niteliklere %55, rol ağırlığına göre %45
// Delta negatifse → önce fiziksel (pace, acceleration, stamina, agility, jumpingReach),
//                   sonra teknik, zihinsel EN SON (deneyimle korunur, hatta artabilir)
```

**Gerileme kuralı:** 30 yaş üstünde `positioning`, `decisions`, `composure`, `leadership`, `anticipation` **artmaya devam edebilir** (yılda +0.3'e kadar), fiziksel nitelikler düşerken.

---

# 7. TASARIM SİSTEMİ

## 7.1 Renk Token'ları

FM26 estetiği: koyu, yoğun bilgi, düşük parlaklık, yüksek okunabilirlik.

```css
/* Koyu tema (varsayılan) */
--bg-base:        #0B0E14;   /* uygulama zemini */
--bg-surface:     #12161F;   /* kart, panel */
--bg-elevated:    #1A1F2B;   /* açılır menü, modal */
--bg-hover:       #222835;
--bg-active:      #2A3140;
--bg-input:       #0F131B;

--border-subtle:  #1E2430;
--border-default: #2A3140;
--border-strong:  #3A4354;

--text-primary:   #E8ECF3;
--text-secondary: #9BA6B8;
--text-muted:     #64707F;
--text-inverse:   #0B0E14;

--accent:         #00C46A;   /* varsayılan; kulüp rengiyle ezilir */
--accent-hover:   #00D975;
--accent-muted:   #00C46A26;

--danger:         #E5484D;
--warning:        #F5A524;
--success:        #30A46C;
--info:           #4A9EFF;

/* Açık tema */
--bg-base:        #F5F7FA;  --bg-surface:  #FFFFFF;
--bg-elevated:    #FFFFFF;  --bg-hover:    #EDF0F5;
--border-default: #D8DEE8;  --text-primary:#151A22;
--text-secondary: #5A6675;  --text-muted:  #8A94A3;
```

**Kulüp rengi entegrasyonu:** Kullanıcı bir kulübü yönetirken `--accent` o kulübün `colorPrimary`'sine ayarlanır. Kontrast oranı 4.5:1'in altına düşerse otomatik açıklaştırılır (`ensureContrast()` yardımcısı).

## 7.2 Nitelik Isı Skalası

1–20 nitelikler renkle kodlanır. **Renk körlüğü modunda** ek olarak sayı kalınlaşır ve arka plan deseni eklenir.

```
 1-3   #7A2E38  (koyu kırmızı)    çok zayıf
 4-6   #B04A3C  (kırmızı)         zayıf
 7-9   #C77E3A  (turuncu)         vasat altı
10-11  #BFA83C  (sarı)            vasat
12-13  #8FA83C  (açık yeşil)      iyi
14-15  #5FA84C  (yeşil)           çok iyi
16-17  #34A85E  (koyu yeşil)      mükemmel
18-20  #1FB58A  (turkuaz)         dünya klasmanı
```

Belirsizlik gösterimi: `15` (kesin) | `13–17` (bant) | `?` (bilinmiyor) — bant gösteriminde renk aralığın ortasına göre.

## 7.3 Tipografi

```css
--font-ui:   'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, monospace;  /* tüm sayısal tablolar */

--text-2xs: 10px/14px;   --text-xs:  11px/16px;
--text-sm:  13px/18px;   --text-base:14px/20px;    /* gövde varsayılanı */
--text-lg:  16px/24px;   --text-xl:  20px/28px;
--text-2xl: 26px/34px;   --text-3xl: 34px/42px;

--weight-normal: 400; --weight-medium: 500;
--weight-semibold: 600; --weight-bold: 700;
```

Türkçe karakterler (ğ Ğ ü Ü ş Ş ı İ ö Ö ç Ç) her iki fontta tam desteklidir; alt küme (subset) oluştururken `latin-ext` dahil edilmeli.

Font boyutu erişilebilirlik ayarı: kök `font-size` %90 / %100 / %115 / %130 olarak ölçeklenir; tüm `rem` tabanlı değerler uyar.

## 7.4 Boşluk ve Geometri

```css
/* 4px tabanlı */
--space-0:0; --space-1:4px;  --space-2:8px;  --space-3:12px;
--space-4:16px; --space-5:20px; --space-6:24px; --space-8:32px;
--space-10:40px; --space-12:48px; --space-16:64px;

--radius-sm:3px; --radius-md:5px; --radius-lg:8px;
--radius-xl:12px; --radius-full:9999px;

--shadow-sm: 0 1px 2px rgba(0,0,0,.32);
--shadow-md: 0 4px 12px rgba(0,0,0,.38);
--shadow-lg: 0 12px 32px rgba(0,0,0,.44);

--z-base:0; --z-dropdown:100; --z-sticky:200;
--z-overlay:300; --z-modal:400; --z-toast:500; --z-tooltip:600;

--duration-fast:120ms; --duration-normal:200ms; --duration-slow:320ms;
--ease-out: cubic-bezier(.16,1,.3,1);
```

`prefers-reduced-motion` veya "Hareketi azalt" ayarı açıksa tüm süreler `0ms`.

## 7.5 Düzen

**Masaüstü (≥1024px):**
```
┌──────────────────────────────────────────────────────┐
│ Üst bar: arma · kulüp · tarih · [DEVAM ET] · 🔔 · 👤 │  56px
├────────┬─────────────────────────────────┬───────────┤
│ Sidebar│ İçerik                          │ Sağ panel │
│ 220px  │ (esnek, max 1440px)             │ 300px     │
│        │                                 │ (opsiyonel)│
└────────┴─────────────────────────────────┴───────────┘
```

**Mobil (<768px):**
```
┌────────────────────────┐
│ Üst bar (sade)         │  52px
├────────────────────────┤
│ İçerik (tam genişlik)  │
├────────────────────────┤
│ Alt tab bar (5 sekme)  │  60px + güvenli alan
└────────────────────────┘
```

Kırılma noktaları: `360 / 480 / 768 / 1024 / 1280 / 1600`
Alt tab bar: Ana Sayfa · Kadro · Taktik · Transfer · Daha Fazla
Dokunma hedefi minimum **44×44px**.

## 7.6 Maç Sunumu

### 2D Saha
```
Saha: 105×68 m → viewBox 1050×680 birim
Çim: --pitch-grass #1B4D2E, şerit #1F5834 (8 şerit)
Çizgiler: rgba(255,255,255,.72), kalınlık 2 birim
Oyuncu: r=13 birim daire, kulüp rengi dolgu, kontrast kenarlık, forma numarası ortada
Kaptan: altın kenarlık | Top sahibi: dış halka pulse
Top: r=5, beyaz, gölge, hız > 12 birim/tik ise hareket izi
```

**Hareket enterpolasyonu:** Tikler 5 saniye aralıklıdır; ham konum sıçraması kabul edilemez. Her tik arası `catmull-rom` eğrisiyle 12 ara kare üretilir. Oyuncular hedefe doğru `easeInOutQuad` ile ilerler; hız `pace` niteliğiyle ölçeklenir.

### Gol Animasyon Spesifikasyonları

17 gol türünün her biri **görsel olarak ayırt edilebilir** olmalıdır:

| Tür | Animasyon |
|---|---|
| `penalty` | Kamera penaltı noktasına yakınlaşır (1.8×), kaleci dalış yayı, top yavaş çekimde (0.35× hız) |
| `directFreeKick` | Baraj çizgisi görünür, top kavisli Bézier yörüngesi, iz efekti |
| `cornerHeader` | Korner bayrağından çizgi, ceza sahası kalabalığı vurgulu, kafa teması sarsıntı |
| `cornerScramble` | Hızlı çoklu temas, kamera sarsıntısı, karışıklık efekti |
| `header` | Golcünün sıçrama yayı, temas anında beyaz flaş |
| `volley` | Top hava yörüngesi + vuruş anı donma (120 ms) |
| `bicycle` | Golcü 360° döner, kamera 2.2× yakınlaşır, tam yavaş çekim |
| `longRange` | Uzun düz iz, ağ dalgalanması abartılı, mesafe etiketi ("28 m") |
| `soloRun` | Dripling boyunca kalıcı iz, geçilen savunmacılar soluklaşır |
| `counterAttack` | Kamera hızlı yatay kaydırma, pas zinciri çizgileri arkada kalır |
| `chip` | Yüksek kavis, kaleci altından geçiş vurgusu |
| `curler` | Belirgin yatay kavis, iz gradyanlı |
| `tapIn` | Kısa mesafe, hızlı, minimal efekt (sadelik = yakın mesafe hissi) |
| `rebound` | İlk şut → kurtarış → ikinci vuruş, üçü de gösterilir |
| `deflection` | Sekme noktasında sarı işaret, yön değişimi vurgulu |
| `ownGoal` | Kırmızı ton, kutlama YOK, golcü başını eğer |
| `openPlayFinish` | Standart: kamera hafif yakınlaşır, ağ dalgalanır |

**Ortak gol sunumu:** ekran sarsıntısı (4 birim, 180 ms) → kulüp renginde ışık patlaması → skor tabelası sayı çevirme animasyonu → "GOL!" tipografisi (kulüp renginde, 400 ms) → golcü kartı (portre, isim, dakika, sezon gol sayısı, 2.5 sn)

**8 kutlama varyantı:** koşarak taraftara, kayma, takım kucaklaşması, forma öpme, sessiz kutlama (eski kulübüne attıysa — otomatik seçilir), işaret parmağı, teknik direktöre koşma, sakin dönüş. Aynı maçta aynı kutlama arka arkaya seçilmez.

### Ses Katmanları (Howler)

```
crowd_ambient_low/mid/high    → momentum + top konumuna göre çapraz karışım
crowd_goal_home/away          → gol tezahüratı
crowd_disappointment          → kaçan fırsat
crowd_ooh                     → direkten dönen
drum_loop_tr                  → Türk takımları için tempo davulu
whistle_start/foul/offside/halftime/fulltime
ball_pass/shot/header/post/net
```

**Ducking:** Gol anında `crowd_ambient` 250 ms'de −18 dB'ye iner, tezahürat öne çıkar, 1.5 sn sonra geri döner.
**Mobil:** İlk kullanıcı dokunuşuna kadar `AudioContext` başlatılmaz (tarayıcı kısıtı). Sessiz mod ve arka plan geçişinde ses durur.

---

# 8. DİYALOG SİSTEMİ

## 8.1 Mimari

```ts
interface DialogueSituation {
  code: string                      // 'playtime_complaint'
  category: DialogueCategory
  trigger: TriggerCondition
  availableTones: Tone[]
  contextVars: string[]             // metinde doldurulacak değişkenler
}

type Tone = 'calm' | 'passionate' | 'harsh' | 'understanding' | 'sarcastic' | 'dismissive'

type Outcome = 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative'
```

## 8.2 Sonuç Hesabı

```ts
baseScore = toneAffinity[situation][tone]              // −40 ... +40

personalityModifier = personalityToneMatrix[personality][tone]   // −30 ... +30

managerModifier = (playerManagement − 10) × 1.8
                + (motivation − 10) × 1.2
                + relationshipScore × 0.25             // −100 ... +100

stateModifier = (morale − 50) × 0.30
              + (form − 6.5) × 4.0
              + (recentResult === 'win' ? 8 : recentResult === 'loss' ? −8 : 0)

hiddenModifier = (temperament − 10) × 1.5              // düşük mizaç = ters tepki riski
               + (professionalism − 10) × 1.0

randomness = rng.normal(0, 12)                          // deterministik ama belirsiz

total = baseScore + personalityModifier + managerModifier
      + stateModifier + hiddenModifier + randomness

total >= 45  → very_positive     total >= 15  → positive
total >= −15 → neutral           total >= −45 → negative
else         → very_negative
```

**Etkiler:**
```
very_positive: morale +12, relationship +15, determination geçici +2 (5 maç)
positive:      morale +6,  relationship +7
neutral:       morale ±0,  relationship +1
negative:      morale −8,  relationship −10
very_negative: morale −16, relationship −20, transferInterest +12,
               soyunma odası morali −3 (lider oyuncuysa −7)
```

**Risk göstergesi:** Kullanıcı ton seçmeden önce ipucu görür — sonuç değil, **eğilim**:
```
if (personalityToneMatrix[personality][tone] <= −20)
  → "⚠ Bu oyuncu {kişilik} kişilikte. Bu yaklaşım ters tepebilir."
if (temperament <= 8)
  → "⚠ Dengesiz bir karakter. Tepkisi öngörülemez."
if (relationshipScore >= 60)
  → "✓ Seninle arası çok iyi, sert konuşmayı kaldırabilir."
```

## 8.3 80 Diyalog Durumu

**A. Maç ve Performans (12)**
`match_praise_excellent`, `match_praise_good`, `match_criticism_poor`, `match_criticism_terrible`, `match_demand_more`, `motm_congratulation`, `hat_trick_praise`, `costly_error_talk`, `red_card_discipline`, `penalty_miss_support`, `big_game_preparation`, `derby_motivation`

**B. Form ve Durum (8)**
`form_excellent_praise`, `form_poor_concern`, `form_poor_criticism`, `confidence_boost`, `slump_intervention`, `fitness_concern`, `sharpness_talk`, `consistency_demand`

**C. Oyun Süresi ve Rol (10)**
`playtime_complaint`, `playtime_promise`, `playtime_refuse`, `role_dissatisfaction`, `position_change_request`, `position_change_explain`, `benched_explanation`, `rotation_explanation`, `squad_role_upgrade_request`, `guarantee_breach_complaint`

**D. Sözleşme ve Maaş (9)**
`contract_renewal_request`, `contract_renewal_offer`, `wage_dissatisfaction`, `wage_comparison_complaint`, `bonus_negotiation`, `release_clause_talk`, `contract_expiry_warning`, `loyalty_appeal`, `contract_rejection_reaction`

**E. Transfer (11)**
`transfer_request`, `transfer_request_refuse`, `transfer_request_accept`, `bid_received_inform`, `bid_rejected_inform`, `interest_from_bigger_club`, `convince_to_stay`, `agree_to_sell`, `loan_proposal`, `loan_refusal`, `farewell_talk`

**F. Uyum ve Kişisel (10)**
`new_signing_welcome`, `adaptation_check`, `homesickness_talk`, `language_barrier_support`, `family_issue_support`, `personal_problem_offer_help`, `culture_shock_talk`, `first_goal_congratulation`, `birthday_message`, `long_service_recognition`

**G. Takım İçi (8)**
`teammate_conflict_mediate`, `dressing_room_unrest`, `clique_intervention`, `captaincy_offer`, `captaincy_removal`, `leadership_request`, `senior_player_advice_request`, `mentor_assignment_talk`

**H. Sakatlık ve Sağlık (6)**
`injury_sympathy`, `recovery_encouragement`, `return_plan_discussion`, `risk_playing_consult`, `chronic_injury_concern`, `career_threatening_talk`

**I. Disiplin (6)**
`training_attitude_warning`, `late_arrival_discipline`, `media_comment_reprimand`, `fine_notification`, `suspension_from_squad`, `final_warning`

**J. Kariyer ve Gelecek (10)**
`career_goal_discussion`, `international_call_congratulation`, `international_snub_support`, `ageing_concern_talk`, `retirement_discussion`, `coaching_future_talk`, `youth_promotion_talk`, `award_congratulation`, `record_broken_praise`, `season_review_talk`

## 8.4 Ton Uyum Matrisi (örnek)

`toneAffinity['playtime_complaint']`:
```
calm:          +18    (sakin açıklama genelde işe yarar)
passionate:    +10
harsh:         −22    (şikâyet eden oyuncuya sertlik kötü)
understanding: +28    (en iyi)
sarcastic:     −32
dismissive:    −38
```

`personalityToneMatrix['professional']`:
```
calm +18 | passionate +8 | harsh −4 | understanding +14 | sarcastic −18 | dismissive −26
```

`personalityToneMatrix['temperamental']`:
```
calm +12 | passionate −8 | harsh −34 | understanding +26 | sarcastic −40 | dismissive −38
```

`personalityToneMatrix['big_game_player']`:
```
calm +6 | passionate +26 | harsh +12 | understanding +2 | sarcastic −10 | dismissive −20
```

Tam matris: 25 kişilik × 6 ton = 150 hücre → `packages/engine/src/ai/dialogue/personality-tone-matrix.ts`

## 8.5 Metin Üretimi

Her `(situation, tone, outcome)` üçlüsü için **en az 4 varyant** metin. Toplam: 80 × 6 × 5 × 4 ≈ 9.600 metin — bu kadar yazılmaz; bunun yerine **katmanlı şablon**:

```
Menajer repliği:  situation × tone → 6 varyant  (80 × 6 × 6 = 2.880)
Oyuncu cevabı:    outcome × personalityGroup → 5 varyant
                  (5 sonuç × 8 kişilik grubu × 5 = 200 taban, değişkenlerle çeşitlenir)
```

Kişilik grupları (25 kişilik → 8 gruba indirgenir): `professional`, `ambitious`, `volatile`, `loyal`, `mercenary`, `leader`, `fragile`, `casual`

**Tekrar önleme:** Son 10 kullanılan varyant `saveId` bazlı hatırlanır, tekrar seçilmez.

**Türkçe ek motoru zorunlu:**
```ts
suffix(name: string, type: 'gen'|'acc'|'dat'|'loc'|'abl'|'ins'): string
// Galatasaray + gen → "Galatasaray'ın"    Beşiktaş + gen → "Beşiktaş'ın"
// Roma + dat → "Roma'ya"                  Liverpool + loc → "Liverpool'da"
// Kural: son sesli harf (ünlü uyumu) + son harf sessiz/sesli + kesme işareti (özel isim)
```

## 8.6 Soyunma Odası

```ts
teamMorale = Σ(playerMorale × influenceWeight) / Σ(influenceWeight)
influenceWeight = 1 + (leadership / 20) × 2 + (isCaptain ? 1.5 : 0)
                    + (squadRole === 'star' ? 1.0 : 0)

// Klik oluşumu
affinity(a, b) = nationalityMatch × 0.30 + languageMatch × 0.25
               + ageProximity × 0.20 + personalityMatch × 0.15
               + tenureOverlap × 0.10
// affinity > 0.62 → aynı klik. Klik morali ortak hareket eder.

// Huzursuzluk tetikleyicileri
unrest += wageDisparity           // en yüksek maaş / medyan > 3.0 ise
        + benchedStarCount × 4
        + losingStreak × 6
        + captainConflict × 12
        + transferRequestCount × 3
```

---

# 9. ÜLKE KURAL SETLERİ

## 9.1 İngiltere — GBE (Brexit Çalışma İzni)

AB dışı ve AB'li tüm yabancı oyuncular için puan gerekir. **15 puan = otomatik onay**, 10–14 = istisna komitesi (%40 onay), <10 = ret.

**Puan tablosu:**

| Kriter | Koşul | Puan |
|---|---|---|
| **Milli takım maçları** (son 2 yıl, ülke FIFA sıralamasına göre) | FIFA 1–10, %30+ maç | 12 |
| | FIFA 1–10, %20–29 | 10 |
| | FIFA 11–20, %30+ | 10 |
| | FIFA 21–30, %30+ | 8 |
| | FIFA 31–50, %30+ | 6 |
| **Kulüp maçları** (son sezon lig dakikası) | %90+ | 12 |
| | %70–89 | 10 |
| | %50–69 | 7 |
| | %30–49 | 4 |
| **Kıta turnuvası dakikası** | %90+ | 10 |
| | %60–89 | 7 |
| | %30–59 | 4 |
| **Satıcı kulübün lig bandı** | Band 1 (ESP, GER, ITA, FRA) | 12 |
| | Band 2 (POR, NED, TUR, BEL) | 8 |
| | Band 3 | 5 |
| | Band 4–6 | 2 |
| **Kulübün lig sıralaması** | İlk %25 | 3 |
| | %25–50 | 2 |
| | %50–75 | 1 |

Puanlar toplanır (her kategoriden en yüksek olan). U21 oyuncular için eşik 10'a düşer.

**Homegrown:** 25 kişilik kadroda en az 8 homegrown (21 yaşından önce 3 yıl İngiliz/Galli kulübünde). U21 oyuncular kadro dışı sayılır, sınırsız kaydedilebilir.

## 9.2 Türkiye — Yabancı Kotası

```
maxForeignInSquad: 14          // kadro listesinde
maxForeignInMatchday: 14       // maç kadrosunda (aynı liste)
homegrownRequirement: null
```
Türk vatandaşı veya çifte vatandaş yabancı sayılmaz. Kota aşılırsa oyuncu kadroya **kaydedilemez** — arayüzde net uyarı: *"Kadronuzda 14 yabancı oyuncu bulunuyor. Bu oyuncuyu kaydetmek için önce bir yabancıyı listeden çıkarmalısınız."*

Transfer öncesi de uyarı verilir (Faz 32).

## 9.3 İspanya — LaLiga Maaş Tavanı

```
salaryCapLimit = f(clubRevenue, existingDebt, playerSaleIncome)
// Kulüp tavanı aşarsa:
//   - Yeni oyuncu kaydı için giden maaşın %50'si (kırmızı bölge) veya %100'ü (yeşil) kullanılabilir
//   - Kadroya kayıt engellenir
maxNonEU: 3          // AB dışı oyuncu kotası
```

## 9.4 İtalya, Almanya, Fransa

```
ITA: maxSquadSize 25, minHomegrown 8 (4 kulüp + 4 federasyon), maxNonEU 2 (transfer başına)
GER: maxSquadSize null, minLocallyTrained 12 (Lizenzspieler kuralı)
FRA: maxSquadSize 30, minHomegrown 8, JIFF kuralı (yerel yetiştirilen)
```

## 9.5 UEFA Kulüp Turnuvaları

**A Listesi:** 25 oyuncu, bunların **8'i homegrown** olmalı:
- 4 kulüp yetiştirmesi (15–21 yaş arası 3 sezon aynı kulüpte)
- 4 federasyon yetiştirmesi (aynı ülkenin herhangi bir kulübünde)

Homegrown eksikse A listesi **daralır** (8 yerine 6 homegrown varsa liste 23'e iner).

**B Listesi:** Sınırsız. 21 yaşından küçük, 15 yaşından beri kulüpte olan oyuncular.

**Liste kilitlenme:** Lig aşaması başlangıcı, kış transfer dönemi sonrası güncellenebilir.

**Katsayı:** Kulüp katsayısı 5 yıllık UEFA performansı; ülke katsayısı o ülkenin kulüplerinin ortalaması. Kota dağıtımı katsayı sıralamasına göre her sezon yeniden hesaplanır.

## 9.6 Format Detayları

```
Premier League   20 takım, 38 maç, 3 düşer, 4 UCL + 2 UEL + 1 UECL
LaLiga           20 takım, 38 maç, 3 düşer
Bundesliga       18 takım, 34 maç, 2 düşer + 1 play-off
Serie A          20 takım, 38 maç, 3 düşer
Ligue 1          18 takım, 34 maç, 2 düşer + 1 play-off
Süper Lig        18 takım, 34 maç, 3 düşer
                 Şampiyonluk play-off'u: rules.playoffSpots ile yapılandırılabilir (varsayılan 0)

UCL   36 takım İsviçre sistemi, 8 maç → ilk 8 doğrudan son 16,
      9–24 play-off turu, sonrası klasik eleme
UEL   36 takım aynı format
UECL  36 takım, 6 maç
```

Türkiye Kupası: grup aşamalı, sonrası eleme. FA Cup: tek maç eleme + tekrar maçı (5. tura kadar).

---

# 10. YÖNETİM PANELİ VE SUNUCU MODLARI

## 10.1 Mod Sistemi

```ts
type ServerMode = 'public' | 'private' | 'maintenance';
```

| Mod | Kayıt | Giriş | Oyun | Erişim |
|---|---|---|---|---|
| `public` | Açık | Herkes | Herkes | Herkes |
| `private` | Açık | Herkes | **Yalnızca izin listesi** | Herkes (izinsizler mesaj ekranı görür) |
| `maintenance` | Kapalı | Kapalı | Kapalı | **Yalnızca IP izin listesi** |

**Guard uygulaması:**
```ts
@Injectable()
export class ServerModeGuard implements CanActivate {
  // 1. Redis'ten modu oku (TTL 30 sn, mod değişince invalidate)
  // 2. Kullanıcı rolü 'admin' ise → HER ZAMAN geç
  // 3. EMERGENCY_ADMIN_TOKEN query parametresi eşleşiyorsa → geç
  // 4. mode === 'maintenance' → CF-Connecting-IP admin_ips ile eşleşmeli
  // 5. mode === 'private' && rota oyun rotası → user_access_grants kontrolü
  // 6. mode === 'public' → geç
}
```

**Gerçek IP tespiti (kritik):**
```ts
function getClientIp(req): string {
  // Cloudflare arkasındayız. X-Forwarded-For TAKLİT EDİLEBİLİR, kullanılmaz.
  const cfIp = req.headers['cf-connecting-ip'];
  if (!cfIp) throw new Error('CF-Connecting-IP eksik — Cloudflare arkasında değil misiniz?');
  // Ek güvenlik: isteğin geldiği soket IP'si Cloudflare aralığında mı?
  if (!isCloudflareIp(req.socket.remoteAddress)) throw new ForbiddenError();
  return cfIp;
}
```

**Kilitlenme koruması (üç katman):**
1. `EMERGENCY_ADMIN_TOKEN` — `?admin_token=xxx` ile her modda giriş
2. CLI: `docker compose exec api pnpm admin:set-mode public`
3. Bakım moduna geçerken mevcut IP **otomatik** izin listesine eklenir; onay ekranında gösterilir:
   > *"Mevcut IP adresiniz (85.x.x.x) izin listesine eklenecek. Dinamik IP kullanıyorsanız IP'niz değişince erişiminizi kaybedebilirsiniz. Acil durum token'ınızı not aldınız mı?"*

## 10.2 Panel Bölümleri

**Kullanıcılar** — liste (e-posta, kullanıcı adı, kayıt tarihi, son giriş, doğrulama, rol, durum, kayıt sayısı, disk), arama/filtre, detay sayfası (IP geçmişi, oturum geçmişi, audit log, gönderilen e-postalar), eylemler (rol değiştir, şifre sıfırlama gönder, e-postayı doğrula, askıya al, sil, izin listesine ekle)

**Kayıtlar** — liste (sahip, ad, kulüp, sezon, tur, boyut, son oynama, sim modu, liderlik bayrağı), salt-okunur durum görüntüleyici, **taşıma**, **silme**, JSON dışa/içe aktarma, toplu arşivleme

**Kayıt taşıma akışı:**
```
1. Kaynak kayıt + hedef kullanıcı seçilir
2. Doğrulama: hedef var mı, aktif slot < 3 mü, kayıt kilitli değil mi
3. Özet ekranı: kaynak sahip → hedef sahip, kayıt detayları
4. Yazılı onay ("TAŞI" yazın)
5. saves.userId güncellenir, save_transfers tablosuna kayıt (7 gün geri alınabilir)
6. İki tarafa da e-posta bildirimi
7. audit_log'a admin eylemi yazılır
```

**Sunucu** — mod anahtarı (önizlemeli), IP izin listesi (CIDR, "mevcut IP'mi ekle"), kullanıcı izin listesi, aktif oturum sayacı, kuyruk uzunluğu

**Telemetri** — disk (200 GB), DB boyutu + tablo dökümü, R2 (10 GB + işlem sayacı), Resend kotası (3.000/ay), CPU/RAM, kuyruk metrikleri, 24 saatlik grafikler. **%80 eşiğinde panel uyarısı + e-posta.**

**Moderasyon** — şikâyet kuyruğu, anomali bayrakları, liderlik tablosundan çıkarma/geri alma

**Denetim** — audit log görüntüleyici (kullanıcı/eylem/tarih/`correlationId` filtresi), CSV dışa aktarma. Admin eylemleri de loglanır.

## 10.3 Anomali Kuralları

```ts
const ANOMALY_RULES = [
  { code: 'impossible_budget',   check: (s) => s.transferBudget > s.clubRevenue * 4 },
  { code: 'absurd_goals',        check: (s) => s.seasonGoals > 180 },
  { code: 'unbeaten_streak',     check: (s) => s.unbeatenMatches > 80 },
  { code: 'turn_rate',           check: (s) => s.turnsInLastHour > 400 },
  { code: 'value_spike',         check: (s) => s.squadValueGrowthRate > 5.0 },
  { code: 'negative_balance',    check: (s) => s.balance < -s.clubRevenue * 2 },
  { code: 'squad_size',          check: (s) => s.squadSize > 60 || s.squadSize < 11 },
];
```
Bayrak → `saves.anomalyFlagged = true` → liderlik tablosundan otomatik çıkarılır → moderasyon kuyruğuna düşer.

---

# 11. KALİTE VE HATA KONTROL PROTOKOLÜ

> Öncelik #2. Bu bölüm "hatanın kaynağını kolayca tespit etme" talebinin tam karşılığıdır.

## 11.1 Gözlemlenebilirlik Zinciri

Her istek ve her tur uçtan uca izlenebilir olmalıdır:

```
Kullanıcı tıklar
  → Frontend correlationId üretir (uuid v7, zaman sıralı)
  → HTTP başlığı: X-Correlation-Id
  → API middleware AsyncLocalStorage'a koyar
  → Tüm loglar otomatik taşır
  → Kuyruğa iş atılırsa job.data.correlationId taşınır
  → Worker aynı id ile loglar
  → Motor debugTrace üretir, id ile ilişkilendirilir
  → Hata olursa Sentry'ye id ile gider
```

**Sonuç:** Kullanıcı "5. sezonda transferim kayboldu" derse, `saveId` + yaklaşık tarihle `audit_log`'dan `correlationId` bulunur, o zincirdeki tüm loglar 10 saniyede listelenir.

```ts
logger.info({ correlationId, saveId, turnId, module: 'transfer' },
            'Teklif değerlendirildi');
```

## 11.2 debugTrace Standardı

Her önemsiz olmayan hesaplama şunu döner:

```ts
interface DebugTrace<T> {
  module: string
  input: Record<string, unknown>
  steps: Array<{ name: string; value: number | string; reason?: string }>
  output: T
  summary: string          // Türkçe, insan okunabilir tek cümle
  seed?: string
}
```

Örnek:
```json
{
  "module": "ai.transferTarget",
  "input": { "clubId": 42, "position": "DC", "budget": 12000000 },
  "steps": [
    { "name": "positionNeed", "value": 0.71, "reason": "Derinlik 2/4, yaş riski yüksek" },
    { "name": "qualityUplift", "value": 0.42, "reason": "Hedef CA 148, mevcut en iyi 136" },
    { "name": "affordability", "value": 0.35, "reason": "Bonservis €7.8mn / bütçe €12mn" },
    { "name": "targetScore", "value": 0.58 }
  ],
  "output": { "decision": "bid", "amount": 7800000 },
  "summary": "Stoper ihtiyacı yüksek; hedef bütçeye uyuyor ve 12 CA kalite artışı sağlıyor.",
  "seed": "a3f9...:412:2871"
}
```

Geliştirme modunda arayüzde herhangi bir AI kararına tıklanınca bu döküm açılır.

## 11.3 Değişmez Kontroller (Invariants)

Her tur sonunda `validateSave()` çalışır. İhlal → tur **geri alınır** ve hata raporlanır.

```ts
const SAVE_INVARIANTS = [
  'Her kulüpte en az 16, en fazla 60 oyuncu',
  'Her kulüpte en az 2 kaleci',
  'Hiçbir oyuncu iki kulüpte kayıtlı değil',
  'Forma numaraları kulüp içinde benzersiz',
  'Aktif sözleşmesi olan her oyuncunun kulübü var',
  'Sözleşme bitiş tarihi başlangıçtan sonra',
  'CA <= PA, her ikisi de 1-200',
  'Tüm nitelikler 1-20',
  'Kulüp bakiyesi > -yıllıkGelir × 3',
  'Maaş toplamı > 0',
  'Fikstürde aynı takım aynı gün iki maçta değil',
  'Puan tablosu toplamı = oynanan maç × 3 - beraberlik sayısı',
  'Sakatlık bitiş tarihi başlangıçtan sonra',
  'Ceza maç sayısı >= 0',
  'Her ligde doğru takım sayısı',
  'Hiçbir yetim delta (silinmiş varlığa referans)',
  'Turnuva takvimleri çakışmıyor',
  'Kadro kaydı ülke kurallarına uygun',
];
```

## 11.4 Test Katmanları

| Katman | Araç | Kapsam | Ne test edilir |
|---|---|---|---|
| Birim | Vitest | ≥%70 (motor ≥%85) | Saf fonksiyonlar, formüller, kural motorları |
| Determinizm | Vitest | Motor tamamı | Aynı tohum → aynı çıktı (1.000 tekrar) |
| Snapshot | Vitest | Motor | Bilinen girdi → sabitlenmiş olay akışı |
| Denge | Özel runner | Maç motoru | 10.000 maç → 5.13'teki 17 metrik |
| Regresyon | Özel runner | Tüm sistem | 20 sezon → invariant + denge + çökme yok |
| Entegrasyon | Vitest + testcontainers | API + DB | Gerçek Postgres ile uçtan uca modül |
| Uçtan uca | Playwright | Kritik akışlar | Kayıt → kariyer → transfer → maç → sezon |
| Görsel | Playwright | Ekranlar | Anlık görüntü karşılaştırma (mobil + masaüstü) |
| Erişilebilirlik | axe-core | Tüm ekranlar | 0 kritik ihlal |
| Yük | k6 | API | 20 eşzamanlı kullanıcı, tur atlama |

**Fuzz testi:** Motora rastgele nitelik kombinasyonları (1-20 arası tüm uçlar dahil) verilir; `NaN`, `Infinity`, negatif skor, sonsuz döngü **asla** oluşmamalı.

## 11.5 Faz Kapanış Komutları

```bash
pnpm typecheck              # 0 hata
pnpm lint                   # 0 uyarı
pnpm test --coverage        # eşikleri geçmeli
pnpm build                  # hatasız
pnpm test:e2e               # Faz 17+
pnpm validate:world         # Faz 11+
pnpm validate:save          # Faz 12+
pnpm sim:balance            # Faz 23+  (10.000 maç)
pnpm sim:seasons 20         # Faz 46+  (20 sezon regresyon)
pnpm i18n:check             # Faz 5+   (0 eksik anahtar)
pnpm perf:budget            # Faz 6+
pnpm arch:check             # katman bağımlılık ihlali
```

`pnpm arch:check` şunları denetler:
- `packages/engine` içinde `db`, `fs`, `http`, `Date.now`, `Math.random` kullanımı → HATA
- Katman bağımlılık yönü ihlali → HATA
- `console.log` → HATA
- Sabit kodlanmış Türkçe metin → HATA
- Sabit kodlanmış mutlak yol → HATA

## 11.6 Performans Bütçesi

| Metrik | Bütçe |
|---|---|
| İlk yükleme (LCP) | < 2.5 sn |
| Ekran geçişi | < 200 ms |
| Kadro tablosu (500 satır) | < 100 ms |
| Transfer araması (50.000 oyuncu) | < 300 ms |
| Tek maç (full) | < 250 ms |
| Maç günü (Dengeli) | < 1.5 sn |
| Maç günü (Tam Detay) | < 15 sn |
| Tur atlama (maçsız) | < 800 ms |
| Sezon geçişi | < 30 sn |
| 2D oynatıcı (masaüstü) | ≥ 55 fps |
| 2D oynatıcı (mobil) | ≥ 30 fps |
| Kayıt yazma (delta) | < 300 ms |
| Bellek (1 sa oyun) | < 500 MB |
| Lighthouse Performance | ≥ 90 |
| Lighthouse Accessibility | ≥ 95 |

---

# 12. PROJE HAFIZASI (`PROJECT_MEMORY.md`)

> **Neden var:** Claude Code her fazda **yeni bir oturum** açar. Önceki oturumun ne yaptığını, hangi kararı neden verdiğini, neyi ertelediğini, hangi hatayla boğuştuğunu bilmez. `CHANGELOG.md` ne değiştiğini söyler ama *neden* ve *sırada ne var* sorusunu cevaplamaz. `PROJECT_MEMORY.md` bu boşluğu kapatır: **oturumlar arası devir teslim belgesi**.

## 12.1 Kullanım Kuralları

**Okuma — her oturumun İLK işi:**
Faz başlarken `PROJECT_MEMORY.md`'nin **"ANLIK DURUM"** bloğu ve **son iki faz kaydı** okunur. Bu yapılmadan koda dokunulmaz.

**Yazma — her fazın SON işi:**
PR açılmadan önce kayıt yazılır. Kayıt yazılmadan faz kapanmış sayılmaz (K15).

**Değişmezlik:**
- Dosya **append-only**'dir. Eski faz kayıtları geriye dönük **silinmez ve değiştirilmez**.
- Bir hata sonradan fark edilirse, eski kayıt düzenlenmez; yeni kayda `> ⚠️ DÜZELTME (Faz XX): Faz YY'deki "..." ifadesi yanlıştı, doğrusu "..."` satırı eklenir.
- Tek istisna: en üstteki **ANLIK DURUM** bloğu her fazda tamamen yeniden yazılır.

**Sıralama:** En yeni faz kaydı **en üstte** (ANLIK DURUM'un hemen altında). Yeni oturum aşağı kaydırmadan güncel durumu görür.

**Dürüstlük kuralı:** Yapılmayan şey "yapıldı" diye yazılmaz. Atlanan kabul kriteri açıkça `[ ]` bırakılır ve gerekçesi yazılır. Bu dosyanın değeri doğruluğundan gelir.

## 12.2 Dosya Yapısı

```
PROJECT_MEMORY.md
├── ⚡ ANLIK DURUM              ← her faz tamamen yeniden yazılır
├── 🔴 AÇIK SORUNLAR KÜTÜĞÜ     ← kümülatif, çözülünce kapatılır
├── 🟡 TEKNİK BORÇ KÜTÜĞÜ       ← kümülatif
├── 🔵 SPESİFİKASYON SAPMALARI  ← kümülatif, asla silinmez
└── 📋 FAZ KAYITLARI            ← append-only, en yeni üstte
```

## 12.3 ANLIK DURUM Bloğu

Her faz sonunda **tamamen** yeniden yazılır. Yeni oturum bunu okuyunca 30 saniyede konuma oturur.

```markdown
## ⚡ ANLIK DURUM

| | |
|---|---|
| **Son tamamlanan faz** | Faz 12 — Master World + Delta Save Mimarisi |
| **Tamamlanma tarihi** | 2026-09-14 |
| **Sıradaki faz** | Faz 13 — Açık Kayıt, Sunucu Modları ve Yasal Uyum |
| **Genel ilerleme** | 12 / 50 (%24) |
| **Bloke eden var mı?** | Hayır |
| **Son commit** | `a3f9c21` on `develop` |
| **Testler** | ✅ 284 geçti, 0 başarısız, kapsam %78 (motor %89) |
| **Açık sorun sayısı** | 2 (biri düşük öncelikli) |
| **Teknik borç sayısı** | 3 |

**Sıradaki oturumda ilk yapılacak:**
1. `docs/spec/08-admin-panel.md` ve `docs/spec/10-deployment.md` oku
2. `pnpm typecheck && pnpm lint && pnpm test` çalıştır, temiz mi doğrula
3. Faz 13 kapsamını özetle, kullanıcıya onaylat
4. SORUN-004'ün Faz 13'ü etkileyip etkilemediğini kontrol et

**Faz 13'e girerken bilinmesi gerekenler:**
- Faz 12'de `WorldView` önbelleği `Map` tabanlı; Faz 13'te oturum kilidi eklenirken önbellek
  invalidasyonu bunu dikkate almalı.
- `users` tablosu Faz 4'te tanımlandı ama henüz kullanılmıyor; Faz 13'te ilk kez doldurulacak.
```

## 12.4 Kümülatif Kütükler

```markdown
## 🔴 AÇIK SORUNLAR KÜTÜĞÜ

| ID | Faz | Açıklama | Öncelik | Durum | Çözüldüğü faz |
|---|---|---|---|---|---|
| SORUN-001 | 6 | Mobilde DataTable yatay kaydırmada başlık kayıyor | Orta | ✅ Kapalı | 6 |
| SORUN-004 | 12 | Delta 50.000'i aşınca snapshot 4.2 sn sürüyor (bütçe 300 ms) | Yüksek | 🔴 Açık | — |
| SORUN-005 | 12 | `validateSave` yetim delta kontrolü büyük kayıtlarda yavaş | Düşük | 🔴 Açık | — |

## 🟡 TEKNİK BORÇ KÜTÜĞÜ

| ID | Faz | Borç | Neden ertelendi | Ödenmesi gereken faz |
|---|---|---|---|---|
| BORÇ-001 | 3 | `competition_rules` jsonb için Zod şeması yazılmadı | Faz 8'de kural setleri netleşince yazılacak | 8 |
| BORÇ-002 | 12 | Snapshot sıkıştırma senkron çalışıyor, worker'a taşınmalı | Kuyruk Faz 16'da geliyor | 16 |

## 🔵 SPESİFİKASYON SAPMALARI

Spesifikasyondan (`docs/spec/`) veya yol haritasından (`docs/ROADMAP.md`) sapılan her nokta.
**Asla silinmez.** Sapma tespit edilirse önce burada kayda geçer, sonra spesifikasyon güncellenir.

| ID | Faz | Sapma | Gerekçe | Spec güncellendi mi |
|---|---|---|---|---|
| SAPMA-001 | — | Gizli nitelik sayısı 8 → 10 (`adaptability`, `temperament` eklendi) | Faz 34 uyum süreci ve Faz 44 diyalog motoru bunlar olmadan kurulamıyor | ✅ Bölüm 4.1 |
```

## 12.5 Faz Kaydı Şablonu

Her faz için bu şablon **eksiksiz** doldurulur:

```markdown
### FAZ [XX] — [Faz Adı]
**Tarih:** [başlangıç] → [bitiş] · **Süre:** [X] gün · **Durum:** ✅ Tamamlandı / ⚠️ Kısmi
**Dal:** `feature/faz-XX-slug` · **PR:** #NN · **Commit aralığı:** `abc123..def456`

---

#### 1. Fazın Konusu
[2-3 cümle: bu faz neydi, projede hangi boşluğu doldurdu, neden bu sırada geldi]

#### 2. Yapılması Planlananlar
ROADMAP'teki kapsam maddeleri:
- [x] Madde 1
- [x] Madde 2
- [ ] Madde 3 — **YAPILMADI**, gerekçe: [...]

#### 3. Gerçekte Yapılanlar
- **Eklenen:** [yeni modüller, dosyalar, özellikler — somut]
- **Değiştirilen:** [dokunulan mevcut kod ve neden]
- **Silinen:** [kaldırılan şeyler ve neden]

#### 4. Plandan Sapmalar
| Ne | Plan | Yapılan | Gerekçe |
|---|---|---|---|
| ... | ... | ... | ... |

Sapma yoksa: "Sapma yok."

#### 5. Karşılaşılan ve Giderilen Hatalar
| # | Hata | Kök neden | Çözüm | Tekrar önleme |
|---|---|---|---|---|
| 1 | [belirti] | [gerçek sebep, "sanırım" değil] | [ne yapıldı] | [test/lint kuralı eklendi mi] |

#### 6. Kontroller ve Sonuçları
| Kontrol | Komut | Sonuç |
|---|---|---|
| Tip kontrolü | `pnpm typecheck` | ✅ 0 hata |
| Lint | `pnpm lint` | ✅ 0 uyarı |
| Birim testler | `pnpm test` | ✅ 284/284, kapsam %78 |
| Motor kapsamı | `pnpm test --coverage` | ✅ %89 (eşik %85) |
| Mimari kontrol | `pnpm arch:check` | ✅ ihlal yok |
| Build | `pnpm build` | ✅ amd64 + arm64 |
| [faza özel] | `pnpm validate:save` | ✅ 0 ihlal |

#### 7. Performans Ölçümleri
| Metrik | Bütçe | Ölçülen | Durum |
|---|---|---|---|
| Kayıt yazma (delta) | < 300 ms | 180 ms | ✅ |
| Snapshot sıkıştırma | < 300 ms | 4.200 ms | ❌ → SORUN-004 |

Bu fazda ölçülecek performans metriği yoksa: "Bu fazda performans bütçesi yok."

#### 8. Kabul Kriterleri Doğrulaması
ROADMAP'teki kabul kriterleri tek tek:
- [x] Kriter 1 — nasıl doğrulandı: [...]
- [x] Kriter 2 — nasıl doğrulandı: [...]
- [ ] Kriter 3 — **SAĞLANMADI**: [gerekçe + hangi faza taşındı]

#### 9. Oluşturulan / Değişen Önemli Dosyalar
```
packages/db/src/world/world-view.ts        [YENİ] Master+delta birleştirme
packages/db/src/world/world-mutation.ts    [YENİ] Delta yazma katmanı
packages/db/src/schema/saves.ts            [DEĞİŞTİ] snapshot alanları eklendi
```

#### 10. Yeni Açılan Sorun / Borç / Sapma
- SORUN-004 (Yüksek) — [açıklama]
- BORÇ-002 — [açıklama]

Yoksa: "Yok."

#### 11. Sonraki Faz İçin Devir Teslim
- **Sıradaki faz:** Faz [XX+1] — [ad]
- **O fazda yapılacaklar (ROADMAP özeti):** [3-5 madde]
- **Bu fazdan taşınan bağlam:** [sonraki fazın bilmesi gereken kararlar, tuzaklar, hazır altyapı]
- **Sıradaki oturumun okuması gereken spec:** `docs/spec/XX-...md`
- **Dikkat edilmesi gerekenler:** [uyarılar]
```

## 12.6 Örnek Doldurulmuş Kayıt (Kısaltılmış)

```markdown
### FAZ 5 — i18n Altyapısı ve Terim Sözlüğü
**Tarih:** 2026-09-02 → 2026-09-03 · **Süre:** 2 gün · **Durum:** ✅ Tamamlandı
**Dal:** `feature/faz-05-i18n` · **PR:** #5 · **Commit:** `7c1a44..9e2b03`

#### 1. Fazın Konusu
Arayüzdeki hiçbir metnin koda gömülmemesini sağlayan çeviri katmanı. İngilizce v2'de gelecek
ama altyapı şimdi kuruldu — sonradan binlerce metni geri dönüp çıkarmak yaklaşık 3 faz kayıp
demekti.

#### 5. Karşılaşılan ve Giderilen Hatalar
| # | Hata | Kök neden | Çözüm | Tekrar önleme |
|---|---|---|---|---|
| 1 | "Beşiktaş'ın" yerine "Beşiktaş'nın" üretiliyordu | Ünlü uyumu son **hecedeki** sesliye bakmalıyken son **harfe** bakıyordu | `lastVowel()` yardımcısı yazıldı, sondan başa tarıyor | 50 kulüp adı test vakası eklendi |
| 2 | ESLint kuralı JSX attribute'larındaki Türkçe metni kaçırıyordu | Kural sadece `JSXText` düğümünü tarıyordu | `JSXAttribute` + `Literal` de tarama kapsamına alındı | Kuralın kendisi için test yazıldı |

#### 11. Sonraki Faz İçin Devir Teslim
- **Sıradaki faz:** Faz 6 — Tasarım Sistemi ve Bileşen Kütüphanesi
- **Bu fazdan taşınan bağlam:** `t()` fonksiyonu `packages/shared/src/i18n`'den export ediliyor.
  Faz 6'daki her bileşen metni buradan almalı — Storybook hikayelerinde de `I18nextProvider`
  sarmalayıcısı gerekli, yoksa hikayeler ham anahtar gösterir.
- **Dikkat:** `turkish-suffix.ts` şu an sadece 6 ek tipini destekliyor (gen/acc/dat/loc/abl/ins).
  Faz 45'teki haber üretimi çoğul ekine ihtiyaç duyarsa genişletilmeli.
```

## 12.7 Faz 0 Tohum Kaydı

Proje başlarken `PROJECT_MEMORY.md` şu içerikle oluşturulur:

```markdown
### FAZ 0 — Belge Bölme ve Repo Kurulumu
**Durum:** ✅ Tamamlandı

#### 3. Gerçekte Yapılanlar
- `ana-prompt.md` Bölüm 0.1'deki haritaya göre bölündü
- `CLAUDE.md`, `docs/spec/*`, `docs/ROADMAP.md`, `docs/V2-BACKLOG.md` oluşturuldu
- `PROJECT_MEMORY.md` bu kayıtla başlatıldı

#### 11. Sonraki Faz İçin Devir Teslim
- **Sıradaki faz:** Faz 1 — Monorepo, Araç Zinciri ve Kalite Kapıları
- **Okunacak spec:** `docs/spec/09-quality-protocol.md`, `CLAUDE.md` Bölüm 2
- **Dikkat:** Faz 1'de `PUBLIC_BASE_PATH=/fms` alt yol yapılandırması kilitlenmeli;
  bu sonradan düzeltilmesi çok pahalı bir hata sınıfıdır.
```


---

# 13. DAĞITIM

## 13.1 Üretim Ortamı

```
Oracle Cloud Always Free — Ampere A1 (ARM64)
  Bölge:  eu-frankfurt-1
  Kaynak: 2 OCPU / 12 GB RAM / 200 GB blok depolama / 10 TB egress
  OS:     Ubuntu 24.04 LTS (aarch64)

Cloudflare (fxrkqn.org)
  DNS → proxy AÇIK (turuncu bulut)
  SSL → Full (Strict), origin sertifikası
  WAF → temel kural seti
  Turnstile → kayıt/giriş
  R2 → fms-assets bucket, özel alan adı

Alt yol: https://fxrkqn.org/fms
```

## 13.2 Caddy Yapılandırması

```
fxrkqn.org {
  handle /fms/api/* {
    reverse_proxy api:3001
  }
  handle /fms/* {
    reverse_proxy web:3000
  }
  # Kök alan adı etkilenmez
}
```

## 13.3 Sunucu Sağlamlaştırma

```bash
# SSH: yalnızca anahtar, root kapalı, port değişimi opsiyonel
# ufw: 22, 80, 443 — başka hiçbir port açık değil
# fail2ban: sshd + caddy jail
# unattended-upgrades: güvenlik yamaları otomatik
# DİKKAT: Oracle Ubuntu imajlarında iptables kuralları /etc/iptables/rules.v4
#         içinde sabittir. ufw ile çakışır. Kurulum betiği bunu temizler.
```

## 13.4 Yedekleme

```bash
# Günlük 03:00 (cron)
pg_dump --format=custom fms | gzip > backup-$(date +%F).dump.gz
rclone copy backup-*.dump.gz r2:fms-backups/db/
# 30 gün saklama, eskiler silinir

# Haftalık: /data/assets tam arşiv → R2
```

**Geri yükleme tatbikatı (Faz 50'de bir kez zorunlu):** Sıfır sunucudan tam geri yükleme yapılır, süresi `docs/RUNBOOK.md`'ye yazılır.

## 13.5 Ücretsiz Kademe Sınır Takibi

| Servis | Sınır | Uyarı eşiği |
|---|---|---|
| Oracle disk | 200 GB | 160 GB |
| Oracle egress | 10 TB/ay | 8 TB |
| Cloudflare R2 | 10 GB | 8 GB |
| R2 Class A ops | 1M/ay | 800K |
| Resend | 3.000/ay, 100/gün | 2.400 / 80 |
| Sentry | 5.000 olay/ay | 4.000 |

Eşik aşılınca panel uyarısı + admin e-postası.

## 13.6 Yedek Barındırma Planı

`docs/HOSTING-FALLBACK.md` içinde tutulur. Oracle limitleri tekrar düşürürse:
1. Google Cloud e2-micro (Always Free, zayıf — Dengeli mod zorunlu)
2. Ev bilgisayarı + Cloudflare Tunnel (ücretsiz, PC açık kalmalı)
3. Ucuz VPS (~€4/ay) — son çare, kullanıcı onayı ile

Taşıma prosedürü: yeni sunucuya `docker compose`, R2'den son yedek geri yükleme, Cloudflare DNS güncelleme. Hedef süre: **< 1 saat**.

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

# 15. CLAUDE CODE OTURUM ŞABLONU

Her faz için yeni bir oturum açılır. Şu şablon kullanılır:

```
FAZ [XX] — [Faz Adı]

BAĞLAM (bu sırayla)
1. PROJECT_MEMORY.md → "ANLIK DURUM" bloğunu ve son İKİ faz kaydını oku.
   Açık sorun / teknik borç / sapma kütüklerini gözden geçir.
2. docs/ROADMAP.md içindeki Faz [XX] bölümünü oku.
3. Şu spesifikasyonları oku: docs/spec/[ilgili dosyalar]
4. CLAUDE.md zaten yüklü (anayasa).

ÖN KONTROL (koda dokunmadan önce)
5. `pnpm typecheck && pnpm lint && pnpm test` → hepsi temiz mi?
   Temiz değilse DUR ve bildir.
6. Faz [XX]'in bağımlılıkları tamamlanmış mı? (ROADMAP "Bağımlılık" satırı)
7. Açık sorunlardan bu fazı etkileyen var mı? Ödenmesi bu faza düşen teknik borç var mı?
8. Faz kapsamını kendi cümlelerinle özetle ve bana onaylat.

ÇALIŞMA
9.  Kapsamı alt görevlere böl, listeyi bana göster, onay al.
10. Alt görevleri TEK TEK yap. Her birinden sonra DUR ve onay bekle (K11).
11. Her alt görevde: kod + birim testi + i18n anahtarları AYNI commit'te.
12. Karşılaştığın her hatayı, kök nedenini ve çözümünü NOT AL — faz kaydına gireceksin.

FAZ KAPANIŞI
13. Kabul kriterlerini tek tek doğrula, sonuçları göster.
14. `pnpm typecheck lint test build arch:check` + faza özel doğrulama komutları.
15. **PROJECT_MEMORY.md'ye faz kaydını yaz** (Bölüm 12.5 şablonu, 11 başlığın hepsi).
16. **ANLIK DURUM bloğunu tamamen yeniden yaz.**
17. Yeni sorun/borç/sapma varsa ilgili kütüğe ekle (SORUN-XXX, BORÇ-XXX, SAPMA-XXX).
18. CHANGELOG.md güncelle, ROADMAP.md'de fazı [x] işaretle.
19. PR aç: feature/faz-[XX]-[slug] → develop
20. Kısa demo notu + (arayüz fazıysa) ekran görüntüsü.

KURALLAR
- PROJECT_MEMORY.md yazılmadan faz KAPANMAZ (K15).
- Yapılmayan şey "yapıldı" yazılmaz. Sağlanmayan kriter [ ] bırakılır, gerekçesi yazılır.
- Eski faz kayıtları geriye dönük DEĞİŞTİRİLMEZ. Düzeltme yeni kayda not olarak eklenir.
- Kapsam dışı fikir → docs/V2-BACKLOG.md, uygulama YOK.
- Belirsizlik → tahmin etme, sor.
- Spesifikasyonda eksik varsa → sor, cevabı docs/spec/'e işle ve SAPMA kütüğüne yaz.
```

## 15.1 Faz → Spesifikasyon Haritası

| Faz | Okunacak spesifikasyon |
|---|---|
| **HEPSİ** | `PROJECT_MEMORY.md` (her oturumun ilk ve son işi) |
| 1–2 | Bölüm 1, 2, 11, 12 |
| 3–4 | Bölüm 3 |
| 5 | Bölüm 13 |
| 6 | Bölüm 7 |
| 7–9 | Bölüm 3 |
| 10 | Bölüm 4 |
| 11 | Bölüm 3, 4, 11 |
| 12 | Bölüm 3 |
| 13 | Bölüm 10, 13 |
| 14–15 | Bölüm 4, 6 |
| 16 | Bölüm 5, 11 |
| 17–19 | Bölüm 7, 13 |
| 20–21 | Bölüm 5, 6, 7 |
| 22–26 | Bölüm 5 |
| 27–29 | Bölüm 5, 7 |
| 30–34 | Bölüm 4, 6 |
| 35 | Bölüm 9 |
| 36–38 | Bölüm 4, 6 |
| 39–41 | Bölüm 5, 9 |
| 42–43 | Bölüm 6 |
| 44 | Bölüm 8 |
| 45 | Bölüm 8, 13 |
| 46 | Bölüm 3, 4, 11 |
| 47 | Bölüm 10 |
| 48 | Bölüm 13 |
| 49 | Bölüm 7, 11 |
| 50 | Bölüm 11, 13 |

## 15.2 İlk Oturum (Faz 0 — Kurulum)

Projeye başlarken **ilk iş** bu belgeyi bölmektir:

```
Bu belgeyi (ana-prompt.md) Bölüm 0.1'deki haritaya göre böl:
- CLAUDE.md           ← Bölüm 1 + 2 + 14
- PROJECT_MEMORY.md   ← Bölüm 12.7'deki Faz 0 tohum kaydıyla başlat
- docs/spec/*.md      ← Bölüm 3-13
- docs/SESSION-TEMPLATE.md ← Bölüm 15
- docs/ROADMAP.md     ← faz-yol-haritasi.md içeriği
- docs/V2-BACKLOG.md  ← yol haritasındaki v2 kasası tablosu

Sonra Faz 1'e başla.
```

---

# 16. KAPANIŞ NOTLARI

## 16.1 Bu Belgede Kasıtlı Olarak Olmayanlar

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
- KVKK metinleri yayında, "hesabımı sil" ve "verilerimi indir" çalışıyor
- 10+ gerçek kullanıcı 1 hafta test etmiş

---

**Belge sonu.** Sorularınız veya değiştirmek istediğiniz bir karar varsa, kod yazmadan önce sorun.

---

# 17. VERİ PAKETLERİ VE GERÇEK VARLIK HATTI

> **Amaç:** Oyunun tam gerçek veriyle çalışması — gerçek kulüp armaları, oyuncu fotoğrafları,
> isimler, formalar, stadyumlar, lig ve kupa logoları, ülke bayrakları.
> Bu, `DATA_MODE=full` modunun (varsayılan) spesifikasyonudur.

---

## 17.1 Veri Modları

```
DATA_MODE=full   →  LocalPack birincil, prosedürel yalnızca yedek     (VARSAYILAN)
DATA_MODE=clean  →  Prosedürel birincil, paket yok
```

`full` modda sağlayıcı zinciri:

```
1. LocalPackProvider      /data/packs/<ACTIVE_PACK>/  — en yüksek öncelik
2. ApiFootballProvider    resmi API (anahtar varsa)
3. WikidataProvider       CC0 olgusal veri + Commons görselleri
4. OpenFootballProvider   lig/kulüp/fikstür yapısı
5. ProceduralProvider     YEDEK — yalnızca yukarıdakiler bulamazsa
```

Her varlık kaydında `source` alanı tutulur (`pack` | `api` | `wikidata` | `procedural`).
Veri Editörü'nde hangi varlığın nereden geldiği görünür — eksikleri kapatmak kolaylaşır.

**Prosedürel üretim asla kaybolmaz.** Newgen oyuncular (Faz 40) ve pakette olmayan varlıklar
için her zaman gerekir. Gerçek veriyle birlikte çalışır.

---

## 17.2 Paket Klasör Yapısı

```
/data/packs/<pack-id>/
├── pack.json                    # manifest — zorunlu
├── data/
│   ├── countries.json
│   ├── competitions.json
│   ├── clubs.json
│   ├── stadiums.json
│   ├── players.json
│   ├── staff.json
│   └── kits.json
└── assets/
    ├── crests/                  # <clubKey>.png | .svg      512×512
    ├── portraits/               # <playerKey>.png           256×256
    ├── kits/                    # <clubKey>-home.png        400×400
    │                            # <clubKey>-away.png
    │                            # <clubKey>-third.png
    ├── competitions/            # <competitionKey>.png      256×256
    ├── trophies/                # <competitionKey>.png      512×512
    ├── flags/                   # <countryCode>.svg          4:3
    ├── stadiums/                # <stadiumKey>.jpg          1200×675
    └── managers/                # <managerKey>.png          256×256
```

### `pack.json`

```jsonc
{
  "id": "tr-full-2026",
  "name": "Türkiye + Avrupa Tam Paket 2026-27",
  "version": "1.0.0",
  "author": "...",
  "createdAt": "2026-08-23",
  "gameDataVersion": "1.0",        // uyumluluk kontrolü
  "season": 2026,
  "scope": {
    "countries": ["TUR","ENG","ESP","GER","ITA","FRA"],
    "competitionCount": 21,
    "clubCount": 118,
    "playerCount": 3547
  },
  "assets": {
    "crests": 118, "portraits": 3102, "kits": 354,
    "competitions": 21, "trophies": 21, "flags": 6, "stadiums": 94
  },
  "keyStrategy": "slug",           // slug | explicit | hybrid
  "priority": 100                  // birden fazla paket varsa yüksek olan kazanır
}
```

---

## 17.3 Anahtar Eşleme (En Kritik Kısım)

Paketteki varlıklar oyundaki varlıklarla **eşleştirilmelidir**. Yanlış eşleşme = Galatasaray
armasının Fenerbahçe'de görünmesi. Üç strateji:

### `slug` (varsayılan)
İsim normalize edilerek anahtar üretilir:

```ts
function slugify(name: string): string {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // aksan kaldır
    .replace(/ı/g,'i').replace(/İ/g,'i')               // Türkçe İ/ı özel durumu
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ö/g,'o').replace(/ç/g,'c')
    .toLowerCase()
    .replace(/\b(fc|sk|ac|as|cf|sc|afc|cd|ud|ssc|club|kulubu|kulübü|spor)\b/g,'')
    .replace(/[^a-z0-9]/g,'')
    .trim();
}
// "Galatasaray S.K." → "galatasaray"
// "Beşiktaş JK"      → "besiktas"
// "FC Bayern München"→ "bayernmunchen"
```

### `explicit`
Pakette açık eşleme tablosu bulunur — en güvenilir yol:

```jsonc
// data/clubs.json
{
  "gameId": 42,                    // oyundaki kulüp id'si (varsa)
  "externalIds": {
    "wikidata": "Q170084",
    "apiFootball": 645,
    "transfermarkt": 141           // yalnızca eşleme referansı
  },
  "key": "galatasaray",
  "name": "Galatasaray",
  ...
}
```

### `hybrid`
Önce `explicit`, bulunamazsa `slug`, o da bulunamazsa **bulanık eşleme**:

```ts
// Levenshtein + token benzerliği
confidence = 0.6 × tokenOverlap + 0.4 × (1 - levenshtein/maxLen)

confidence >= 0.92  → otomatik eşle
confidence >= 0.70  → "onay bekleyen" kuyruğuna al
confidence <  0.70  → eşleşmedi
```

**Eşleşmeyen varlıklar sessizce yok sayılmaz.** İçe aktarma sonunda rapor verilir ve
Veri Editörü'nde elle eşleme ekranı açılır.

---

## 17.4 Veri Dosyası Şemaları

### `clubs.json`
```jsonc
[{
  "key": "galatasaray",
  "externalIds": { "wikidata": "Q170084" },
  "name": "Galatasaray",
  "shortName": "Galatasaray",
  "abbreviation": "GAL",
  "foundedYear": 1905,
  "city": "İstanbul",
  "stadiumKey": "ramspark",
  "colorPrimary": "#A90432",
  "colorSecondary": "#FBB800",
  "colorTertiary": "#FFFFFF",
  "reputation": 148,
  "supporterCount": 18500000,
  "chairman": "…",
  "facilities": { "trainingGround": 16, "youthAcademy": 15,
                  "youthRecruitment": 14, "medicalCentre": 15 },
  "finances": { "balance": 45000000, "transferBudget": 22000000,
                "wageBudget": 4200000, "currency": "TRY" },
  "crest": "crests/galatasaray.png",
  "rivals": [{ "key": "fenerbahce", "intensity": 10 },
             { "key": "besiktas",   "intensity": 9  }]
}]
```

### `players.json`
```jsonc
[{
  "key": "player-12847",
  "externalIds": { "wikidata": "Q…" },
  "firstName": "Victor",
  "lastName": "Osimhen",
  "commonName": "Osimhen",
  "birthDate": "1998-12-29",
  "nationality": "NGA",
  "secondNationality": null,
  "birthCity": "Lagos",
  "clubKey": "galatasaray",
  "squadNumber": 45,
  "primaryPosition": "ST",
  "positions": { "ST": "natural", "AML": "competent" },
  "heightCm": 186,
  "weightKg": 78,
  "preferredFootRight": 18,
  "preferredFootLeft": 12,
  "portrait": "portraits/player-12847.png",

  // İSTEĞE BAĞLI — verilmezse Bölüm 4'teki türetme motoru hesaplar
  "currentAbility": 162,
  "potentialAbility": 168,
  "attributes": { "finishing": 17, "pace": 17, "strength": 16, … },
  "hiddenAttributes": { "determination": 16, "professionalism": 14, … },
  "traits": ["runs_with_ball_through_centre", "attempts_overhead_kicks"],

  "contract": { "endDate": "2029-06-30", "weeklyWage": 380000,
                "currency": "EUR", "squadRole": "star",
                "releaseClause": 75000000 }
}]
```

**Nitelikler verilmezse:** Bölüm 4.3'teki istatistikten türetme motoru devreye girer.
**Verilirse:** Doğrudan kullanılır, türetme atlanır. Topluluk paketleri genelde elle
ayarlanmış nitelik içerir ve bunlar türetilmiş değerlerden daha isabetlidir.

### `kits.json`
```jsonc
[{
  "clubKey": "galatasaray",
  "home":  { "image": "kits/galatasaray-home.png" },
  "away":  { "image": "kits/galatasaray-away.png" },
  "third": { "image": "kits/galatasaray-third.png" }
}]
```
Görsel yoksa `kit_templates` sisteminden (20 SVG şablonu × 3 renk) üretilir.

---

## 17.5 Varlık İşleme Hattı

İçe aktarma sırasında her görsel şu hattan geçer:

```
1. Doğrula      → format (png/jpg/webp/svg), boyut, dosya bütünlüğü
2. Normalize    → hedef boyuta yeniden ölçekle, en-boy oranını koru
3. Kırp/Doldur  → armalar şeffaf kare, portreler yüz merkezli kırpım
4. Optimize     → WebP (kalite 88) + AVIF (kalite 72) üret
5. Boyutlar     → 3 çözünürlük: @1x, @2x, @3x
6. Yaz          → /data/assets/<tip>/<id>-<boyut>.<format>
7. İndeksle     → asset_index tablosuna kaydet (id, tip, kaynak, hash)
```

**Boyut hedefleri**

| Tip | Kaynak | Üretilen |
|---|---|---|
| Arma | 512×512 | 256 / 128 / 64 |
| Portre | 256×256 | 256 / 128 / 64 |
| Forma | 400×400 | 256 / 128 |
| Turnuva logosu | 256×256 | 128 / 64 |
| Kupa | 512×512 | 256 / 128 |
| Bayrak | SVG | SVG + 64 / 32 PNG |
| Stadyum | 1200×675 | 1200 / 600 |

**Portre yüz hizalama:** Basit yüz tespiti (opencv-wasm veya `@vladmandic/face-api`)
ile göz hizası bulunur, kırpım göz hizası üstten %38'e gelecek şekilde yapılır. Böylece
farklı kaynaklardan gelen fotoğraflar **tutarlı çerçevelenir** — estetik tutarlılığın
en önemli parçası budur.

**Tespit başarısızsa:** merkez kırpım + uyarı raporu.

---

## 17.6 Portre Tutarlılık Sorunu ve Çözümü

Bu, uzun vadeli estetiğin en kritik meselesi ve baştan çözülmelidir.

**Problem:** 1. sezonda kadronuzun tamamı gerçek fotoğraflı. 5. sezonda yarısı emekli oldu,
yerlerine newgen'ler geldi. Newgen'lerin fotoğrafı yok. Kadro ekranı yarı fotoğraf,
yarı vektör avatar — göze batar.

**Çözüm: `PORTRAIT_STYLE` ayarı (Ayarlar ekranından değiştirilebilir)**

| Mod | Davranış |
|---|---|
| `real` | Gerçek fotoğraf varsa kullanılır, newgen'ler prosedürel. **Tutarsızlık zamanla artar.** |
| `stylized` (**önerilen**) | Gerçek fotoğraflara ortak görsel işlem uygulanır: aynı çerçeveleme, hafif posterize, kulüp renginde duotone vinyet. Prosedürel portreler aynı işlemden geçer. **Yan yana konduğunda ayırt edilmez.** |
| `procedural` | Herkes vektör avatar. Tam tutarlı ama gerçek yüz yok. |

`stylized` işlemi (varlık hattının 4. adımında, opsiyonel):
```
1. Gri tona indir (luminance ağırlıklı)
2. 6 kademeye posterize
3. Kulüp renk paletinde duotone eşle (gölge → koyu renk, ışık → açık renk)
4. Radyal vinyet uygula (%18 karartma)
5. Ortak arka plan: kulüp renginde gradyan
```

Prosedürel portreler zaten bu palet ve stil hedeflenerek üretilir. Sonuç: 20. sezonda bile
kadro ekranı tek bir görsel dile sahip olur.

---

## 17.7 İçe Aktarma Akışı (Veri Editörü — Faz 11)

```
1. Paket seç      → /data/packs/ tarar veya .fmspack yüklenir
2. Manifest oku   → sürüm uyumluluğu, kapsam özeti gösterilir
3. Kuru çalıştırma→ hiçbir şey yazmadan: kaç varlık eşleşti, kaçı eşleşmedi,
                    hangi alanlar mevcut veriyi ezecek → ÖNİZLEME
4. Çakışma çözümü → alan bazlı: paketi kullan / mevcudu koru / birleştir
5. Elle eşleme    → eşleşmeyen varlıklar için arama kutulu eşleme ekranı
6. İçe aktar      → işlem (transaction) içinde, hata olursa tam geri alma
7. Varlık hattı   → görseller işlenir (ilerleme çubuğu)
8. Doğrula        → validateWorld() çalışır
9. Rapor          → içe aktarılan / atlanan / hata veren döküm
```

**Kuru çalıştırma zorunludur.** Kullanıcı ne olacağını görmeden içe aktarma yapılamaz.

---

## 17.8 Veri Kaynakları (Kişisel Kurulum İçin)

`DATA_MODE=full` çalıştırmak için gereken veriyi $0 maliyetle toplama yolları:

| Kaynak | Ne verir | Maliyet |
|---|---|---|
| **Topluluk veri paketleri** | En yüksek kalite: elle ayarlanmış nitelikler, armalar, portreler, formalar | Ücretsiz — indirip `/data/packs/` altına koyarsınız |
| **API-Football ücretsiz kademe** | Kadro, oyuncu verisi, takım logosu, oyuncu fotoğrafı | 100 istek/gün — dünya kurulumu birkaç güne yayılır, `.cache/` sayesinde tekrar maliyeti yok |
| **Wikidata (CC0)** | Doğum tarihi, boy, uyruk, mevki, kariyer geçmişi | Ücretsiz, sınırsız |
| **Wikimedia Commons** | Bayraklar, birçok kulüp arması, stadyum fotoğrafları | Ücretsiz |
| **openfootball (CC0)** | Lig yapısı, kulüp listeleri, fikstür | Ücretsiz |
| **FBref / Understat** | Maç istatistikleri → nitelik türetimi (Bölüm 4.3) | Ücretsiz |
| **Veri Editörü** | Eksik kalan her şey elle | — |

**Pratik sıralama:** Topluluk paketi varsa onunla başlayın (en zengin). Eksikleri
API-Football ücretsiz kademesi ve Wikidata kapatır. Kalan boşlukları Veri Editörü'nden
elle doldurursunuz. Hiçbir zaman kapanmayan boşluklar prosedürel üretimle dolar — oyun
asla boş ekran göstermez.

---

## 17.9 Kabul Kriterleri (Faz 8–9 ve 11'e eklenir)

- [ ] `DATA_MODE=full` ile paket yüklendiğinde kulüp armaları, oyuncu fotoğrafları,
      forma görselleri, lig logoları, kupa görselleri ve bayraklar ekranda görünüyor
- [ ] Paketteki her varlık doğru oyun varlığıyla eşleşiyor (yanlış eşleşme = 0)
- [ ] Eşleşmeyen varlıklar raporlanıyor ve elle eşlenebiliyor
- [ ] Kuru çalıştırma gerçekten hiçbir şey yazmıyor
- [ ] İçe aktarma yarıda kesilirse veritabanı tutarlı kalıyor (transaction)
- [ ] Portreler tutarlı çerçevelenmiş (göz hizası üstten %38 ±%4)
- [ ] `PORTRAIT_STYLE=stylized` modunda gerçek ve prosedürel portreler yan yana
      **ayırt edilemiyor** (gözle doğrulama, 20 örnek)
- [ ] `DATA_MODE=clean` ile aynı oyun prosedürel varlıklarla çalışıyor, hata yok
- [ ] Varlık hattı 4.000 görseli işleyip WebP + AVIF × 3 boyut üretiyor
- [ ] Eksik varlık oranı raporlanıyor

