# CLAUDE.md — Football Management Simulator

> **Bu dosya her oturumda otomatik yüklenir.** Projenin anayasası, teknoloji yığını ve
> terim sözlüğü burada. Derin spesifikasyonlar `docs/spec/` altında — yalnızca ilgili
> fazda okunur.

## 🚦 Her Oturumun İlk İşi

1. **`docs/CHECKPOINT.md`** → makine durumu: faz · aşama · taban commit · sıradaki komut · açık karar (6.6-ön'de eklendi; nöbetçisi `scripts/inventory-guards.test.mjs` §③).
2. **`PROJECT_MEMORY.md`** → "ANLIK DURUM" bloğunu ve son iki faz kaydını oku.
3. **`docs/ROADMAP.md`** → sıradaki fazın bölümünü oku.
4. **`docs/spec/`** → o faza ait spesifikasyonları oku (eşleme: `docs/SESSION-TEMPLATE.md`).
5. **`docs/SPEC-COVERAGE-GAPS.md`** → **bu faza atanmış satırları** oku (Faz 4.0'da eklendi).
6. Oturum akışı için **`docs/SESSION-TEMPLATE.md`** şablonunu; alt görev yürütme protokolü için **`/faz-yurut`** skill'ini (`.claude/skills/faz-yurut/SKILL.md`) kullan.

## 📚 Belge Haritası

| Dosya | İçerik | Ne zaman okunur |
|---|---|---|
| `CLAUDE.md` | Anayasa, yığın, hata kataloğu + değişmezler (§18), sözlük | Her oturum (otomatik) |
| `docs/CHECKPOINT.md` | **Makine** için sabit şekilli durum (faz · aşama · taban commit · kapı tabanı · biten · yarım kalan · sıradaki komut · açık karar) — ANLIK DURUM ile **çakışmaz**, o insan için bir anlatı | Her oturum başı (ilk) + her alt görev sonu |
| `PROJECT_MEMORY.md` | Oturumlar arası devir teslim | Her oturum başı + sonu |
| `.claude/skills/faz-yurut/SKILL.md` | Beş aşamalı alt görev protokolü + kapı zinciri + mutasyon kuralı + faz kapanışında `git tag` | Her alt görev (`/faz-yurut`) |
| `.claude/agents/*.md` | Altı ajan: `olcumcu` · `planci` · `gelistirici` (tek yazıcı) · `kapici` (düşman) · `denetci` · `kayitci` | Skill'in aşamalarında |
| `docs/DANISMAN-PROTOKOLU.md` | Cowork oturumundaki **danışman** rolünün sözleşmesi (her turda ölç → değerlendir → tek parça prompt → karar → hatayı sahiplen) | Danışman her turda; Claude Code promptun şeklini anlamak için |
| `docs/ROADMAP.md` | 50 faz, kapsam, kabul kriterleri | Her oturum başı |
| `docs/SESSION-TEMPLATE.md` | Oturum akışı + faz→spec eşlemesi | Her oturum başı |
| `docs/OUTPUT-FORMAT.md` | Alt görev rapor formatı + rapor arşivi kuralı | Her alt görev sonu |
| `docs/reports/` | Alt görev raporlarının **ham arşivi** (append-only, otorite değil) | Her alt görev sonu — rapor terminale basılmadan ÖNCE buraya yazılır |
| `docs/DEPENDENCY-WATCH.md` | Sürüm takip listesi | Her faz başı |
| `docs/SPEC-COVERAGE-GAPS.md` | Spec istiyor ama hiçbir faza atanmamış maddeler (G-01…) | **Her faz başı — o faza atanmış satırlar** |
| `docs/V2-BACKLOG.md` | Kapsam dışı fikirler | Fikir çıkınca |
| `docs/glossary.md` | **TR/EN terim sözlüğü** — §14'ün süperkümesi (çekirdek + nitelikler) + dil standardı | **Arayüzde Türkçe metin yazan her faz** — özellikle 6, 14, 17-21, 30-38, 44-45. ⚠️ Çelişkide **§14 kazanır** (otorite #1); sözlük düzeltilir |
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
| `docs/HOSTING-FALLBACK.md` | Oracle limitleri düşerse taşınacak sağlayıcılar (iskelet) | Faz 50 · barındırma kararı değişirse |
| `docs/schema/world.md` | ER diyagramı — **gerçek şemadan üretilir**, nöbetçisi `packages/db/integration/er-diagram.itest.ts` | Faz 3,4,12,46 |
| `docs/MASTER-SPEC.md` | Hepsinin tek dosyalık arşivi | Referans |

---

# 1. PROJE ANAYASASI

> Bu bölüm `CLAUDE.md`'ye gider ve her oturumda geçerlidir. Asla ihlal edilmez.

## 1.1 Projenin Kimliği

**Football Management Simulator** — web tabanlı, Türkçe, 2 boyutlu, tur tabanlı futbol menajerlik simülasyonu. Football Manager 26 referans alınır.

- **Dil:** Arayüz **Türkçe**. Kod, değişken, fonksiyon, tablo, dosya adları **İngilizce**. İstisna yok.
- **Boyut:** Yalnızca 2D. Hiçbir yerde 3D kütüphane, 3D varlık, 3D render kullanılmaz.
- **Hedef:** `https://fxrkqn.org/fms` — **davetli kurulum** (`SERVER_MODE=private`), ücretsiz, reklamsız. Kayıt teknik olarak açıktır ama yalnızca **izin listesindeki hesaplar oynar**; public moda geçiş bilinçli, ayrı bir karardır (SAPMA-045, kullanıcı kararı 2026-09-11 — bu satır 6.6-ön'e kadar *"herkese açık kayıt"* diyordu ve `.env.example` ile `docs/spec/08` §10.1'in yazdığı varsayılanla çelişiyordu).
- **Ölçek:** 1–5 aktif kullanıcı beklenir, ancak kayıt teknik olarak açık olduğu için sistem 200 kullanıcıya kadar bozulmadan çalışacak şekilde tasarlanır.

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
- `.gitignore`: `.env*` (`.env.example` hariç), `/data/packs/`, `/data/assets/`, `.cache/`, `*.dump`, `*.sql.gz`, `*.bak`, `*.yedek` (sonuncusu 6.6-ön — bir ayar dosyasının Türkçe adlı yedeği takipsiz kalmıştı)
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
  "packageManager": "pnpm@11.23.0",
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
    "i18n":      "i18next 26 + react-i18next 17 + i18next-browser-languagedetector 8",
    "icons":     "lucide-react 1",
    "forms":     "react-hook-form 7 + @hookform/resolvers 5 (zod)"
  },

  "backend": {
    "framework": "NestJS 11 (Express 5 — joker rota sözdizimi değişti: /*splat)",
    "orm":       "drizzle-orm 0.45 + drizzle-kit 0.31",   // 1.0 hâlâ RC, girilmedi
    "db":        "PostgreSQL 18",                          // 16 → 18, Faz 3.0 (SAPMA-019)
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
├── .claude/                     # ⚠️ 6.6-ön'e kadar TEK dosya vardı; süreç burada yaşar
│   ├── settings.json            # PreToolUse kancası (bash-text-guard) · izinler · workflowSizeGuideline
│   ├── agents/                  # altı ajan tanımı — inventory-guards §② bu dizini tarar
│   │   ├── olcumcu.md           # ölçer, yazmaz (D1 + D2)
│   │   ├── planci.md            # kapsam + "yazmadan önce analiz", yazmaz
│   │   ├── gelistirici.md       # TEK yazma yetkisi; ÇIKTI ve GEREKÇE ayrı
│   │   ├── kapici.md            # düşman rolü: negatif kanıt + mutasyon
│   │   ├── denetci.md           # iddiaları ÇIKTI'dan denetler, gerekçeyi görmez
│   │   └── kayitci.md           # ROADMAP / PROJECT_MEMORY / CHECKPOINT / rapor · DEVİR KURALI
│   └── skills/
│       └── faz-yurut/SKILL.md   # beş aşamalı protokol (/faz-yurut)
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
├── tools/                       # ⚠️ AĞAÇ TAM TUTULUR — Faz 5.9'da dördü eksikti
│   ├── arch-check/              # katman/saflık denetimi (9 kural) + kanaryası
│   ├── bash-text-guard/         # PreToolUse kancası — ASCII olmayan kabuk argümanı
│   ├── data-cli/                # veri ingest, doğrulama, üretim
│   ├── eslint-local-rules/      # no-hardcoded-path (K6) · no-bare-jsx-text (K5)
│   ├── glossary-check/          # docs/glossary.md ayrıştırıcısı — kriter sayısı burada
│   └── i18n-check/              # eksik/kullanılmayan anahtar · boş çeviri · görünmez karakter
│
├── scripts/                     # ⚠️ ÖNYÜKLEME BETİKLERİ — 6.4-ön'e kadar AĞAÇTA HİÇ YOKTU
│   ├── check-debt-coverage.mjs  # `debt:check` — BORÇ kütüğü ↔ ROADMAP (CI kapısı)
│   ├── check-env-file.mjs       # `.env`/`.env.example` içinde NODE_ENV yasağı
│   ├── check-gap-coverage.mjs   # `gaps:check` — SPEC-COVERAGE-GAPS ↔ ROADMAP (CI kapısı)
│   ├── check-node-version.mjs   # `preinstall` + CI'ın install ÖNCESİ adımı
│   ├── check-tsconfig-types.mjs # her paket `types` dizisini açıkça yazmalı (TS 6)
│   ├── clean-dist.mjs           # her paketin `build` betiğine bağlı (SAPMA-011)
│   ├── generate-theme-css.mjs   # token'ların üretilmiş CSS yansıması (6.3)
│   └── lib/                     # kapıların ortak çekirdeği (ledger-coverage.mjs)
│
├── docs/
│   ├── CHECKPOINT.md            # makine için durum (faz · aşama · taban commit …) — nöbetçisi inventory-guards §③
│   ├── DANISMAN-PROTOKOLU.md    # Cowork danışman rolünün sözleşmesi (6.6-ön)
│   ├── ROADMAP.md               # 50 faz
│   ├── SESSION-TEMPLATE.md      # oturum akışı + faz→spec eşlemesi (§15.1)
│   ├── OUTPUT-FORMAT.md         # alt görev rapor formatı + rapor arşivi kuralı
│   ├── DEPENDENCY-WATCH.md      # sürüm takip listesi
│   ├── SPEC-COVERAGE-GAPS.md    # G-01… boşluk kütüğü (`gaps:check` bunu okur)
│   ├── V2-BACKLOG.md            # kapsam dışı fikirler buraya
│   ├── glossary.md              # TR/EN terim sözlüğü — §14'ün süperkümesi
│   ├── HOSTING-FALLBACK.md      # yedek barındırma planı (iskelet, Faz 50)
│   ├── MASTER-SPEC.md           # hepsinin tek dosyalık arşivi
│   ├── ADR/                     # mimari karar kayıtları
│   ├── reports/                 # alt görev raporlarının HAM arşivi (append-only)
│   ├── schema/                  # ER diyagramı — gerçek şemadan ÜRETİLİR, nöbetçisi var
│   ├── spec/                    # bu belgenin bölümleri
│   └── LEGAL/                   # KVKK metinleri — ⚠️ HENÜZ YOK, Faz 13'te açılacak
│
└── data/                        # .gitignore'da
    ├── packs/                   # kullanıcı veri paketleri
    ├── assets/                  # üretilmiş görseller
    └── .cache/                  # veri sağlayıcı önbelleği
```

## 2.3 Ortam Değişkenleri

`.env.example` (Zod ile doğrulanır, eksikse uygulama açılmaz):

> ⚠️ **`NODE_ENV` BU DOSYADA TUTULMAZ — ve bu satır 6.4-ön'e kadar tam tersini
> söylüyordu.** Blok `NODE_ENV=development` ile başlıyordu; oysa Faz 2 hata #9'da
> ölçüldü: Vite `.env`'deki `NODE_ENV`'i kendi üretim kararına uyguluyor ve React'in
> **geliştirme sürümü** üretim paketine giriyor (228 kB → **429 kB**). O günden beri
> `scripts/check-env-file.mjs` hem `.env`i hem `.env.example`ı tarıyor ve bu değişkeni
> görürse **exit 1** veriyor; kapı `apps/web`in `build` betiğine bağlı. Yani anayasa,
> koşan bir kapının **yasakladığı** şeyi tarif ediyordu — bu blok olduğu gibi
> uygulansaydı `pnpm build` kırılırdı. Ortamı çalışma zamanı belirler (konteyner,
> süreç yöneticisi, CI); `packages/shared/src/env.ts` zaten `development` varsayılanı
> veriyor.

```bash
# Uygulama  (NODE_ENV YOK — yukarıdaki kutuya bak)
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
- **En az bir tam sezon uçtan uca oynanmış ve oynanabilir bulunmuş** — kayıt
  → menajer → kulüp → transfer → maçlar → sezon geçişi, gerçek bir oyuncu
  tarafından, bir simülasyon koşusu olarak değil. *(SAPMA-045, 6.6-ön: bu satır
  "10+ gerçek kullanıcı 1 hafta test etmiş" idi; davetli kurulumda 10+ dış
  kullanıcı hedefi anlamsızlaştı. Kriter silinmedi, **işlevi yerine kondu** —
  bir kriteri işlevini yerine koymadan silmek, kriteri sessizce düşürmektir.)*

---

---

# 18. HATA KATALOĞU VE DEĞİŞMEZLER

> **6.6-ön'de eklendi (2026-09-11).** `docs/MASTER-SPEC.md`'de karşılığı **yok** —
> numara, spec'in 1–17 bölümleriyle çakışmasın diye 18. Bu bölüm altı fazın
> ölçülmüş hata sınıflarını ve onlardan çıkan değişmezleri taşır. Vakaların
> kendisi `PROJECT_MEMORY.md` faz kayıtlarının §5 tablolarında; burada yalnızca
> **sınıf + reçete**. Bir sınıfın tanımı ile faz kaydındaki tanım ayrışırsa
> **faz kaydı kazanır** (orası ölçümün yeri); burası düzeltilir.

## 18.1 Hata kataloğu — D (Faz 2'de doğdu), F (Faz 3'te doğdu)

| # | Sınıf | Belirti | Reçete |
|---|---|---|---|
| **D1** | **Ölçüm sonucu ölçülmeden yazıldı** | Belge/rapor ölçümden **önce** yazıldı; makul görünen sayı yanlış olduğunu belli etmiyor (bağlam yüzdesi "%46" denildi, gerçek %81) | Sayı **ölçüm çıktısından kopyalanır**; ölçüm yoksa alan `ÖLÇÜLECEK`/*"ölçülemedi"* kalır. Bir tahmin **teste** yazılırsa aynı dakikada reddedilir, **belgeye** yazılırsa hiçbir şey ötmez — ölçülecek sayının **yeri** vardır |
| **D2** | **Ölçüm aracı ya da düzeneği yanlış cevap üretti** | Araç "başarılı"/"0" diyor ama ölçtüğü şey sorulan şey değil (turbo önbelleği · `grep -c` satır sayar · `$?` borunun son komutu · cwd kalıcı · glob test dosyalarını da içe aldı · iki koşu aynı log dosyasına yazdı) | Beklenmedik sonuçta **önce araç doğrulanır**; nöbetçi **iki yönlü** (bilinen pozitifte öter, bilinen negatifte susar); soğuk derleme; ham bayt tek kaynak; açıklanamayan fark **ayrıştırılır** |
| **D3** | **Kapı yeşil ama iddia ettiği şeye bakmıyor** | `coverage.include` `.tsx` görmüyordu · `.cts` taramadan kaçıyordu · `format:check` `*.md`ye bakmıyor · talimattaki *"G-01…G-16"* kütükte G-20'ye kadar varken | Her kapı **kapsamını basar** (kaç dosya/kural/anahtar); *"0 bulundu"* ile *"bakılmadı"* ayrılır; meta-test iki katman (tablo bütünlüğü + **kanarya deposu**); sayı taşıyan talimat → sayıyı **kaynaktan sayan artefakt** |
| **D4** | **Bir sınıflandırma bağlamdan koparıldı** | Her HTTP hatası `DomainError` → her 500 Sentry'den sessizce düşerdi; ikili sınıflandırma üçüncü sınıfı sessizce yanlış tarafa koyar (`kit_templates` → sözlük tablosu) | Tüketen kural yazılırken: *"bütün yollar düşünüldü mü, bir yol yanlış tarafa düşerse **hangi test** kırılır?"* Cevap "hiçbiri"yse kural değil temenni yazılmıştır |
| **D5** | **Test yeşil, üretim kırık / eksik** | Dairesel DI: typecheck ✅ lint ✅ test ✅ build ✅ — yalnızca **çalıştırmak** yakaladı · `clubs.tla` diye sütun yok · imaj `@fms/ui`yi derlemiyordu, yerel `build` geçiyordu | **BUILD ET VE ÇALIŞTIR**, yüzey **adıyla**: paket `dist`i · web paketi · imaj. Koşturulmayan *"koşturulmadı"* yazılır. Sütun listesi hatırlanmaz, `information_schema`'dan okunur |
| **D6** | **Kırmızı olan test, kod değil** | Fixture zaten `ACTIVE_PACK` taşıyordu · jsdom yıkım yarışı · `user-event` keyup'ı gecikmesiz gönderiyor (Radix bayrağı) · negatif test **alakasız** kısıtla patladı | Önce **hangisi yanlış** sorulur; kuralı test için gevşetmek **elenir**. Bir ret, *"**bu** kısıt tarafından reddedildi"* diye yazılır. Sahte gecikme yerine sınır **yazılır** ve gerçek tarayıcıya devredilir |
| **D7** | **Kendi yazdığın plan kaynak değildir** | *"ROADMAP Faz 8 … istiyor"* iddiasının tek eşleşmesi bir önceki turda yazılan metindi · devir notunun iki sayısı bayattı · doğru ölçüm de yazıldığı andan sonra yanlışa döner | `docs/spec/**` ve `CLAUDE.md` **kaynak**; ROADMAP ve PROJECT_MEMORY **kendi sesin** — `git log -S` ile kim yazmış bak. Devir notundaki sayı **kullanılacağı gün yeniden sayılır** |
| **F1** | **Elle yazılmış envanter büyüyünce bayatlıyor** | *"hiçbir tablo düşmüyor"* testi satır değişmeden yanlışa döndü · `CLAUDE.md` §2.2 ağacı **üç kez** bayat · mutasyon serisi kaydı 4.5'te dondu · `BORÇ-010` dört hücre · `.env.example` kendi kapısıyla çelişiyor | Envanter **sayı değil liste** olarak yaşar ve **kaynaktan türetilir**; türetilemeyen liste **kendi kapısını** getirir (`inventory-guards` ①②③, `fk-policy`, `UI_KEYS` nöbetçisi). Bulunan yeni yer **aynı gün** envantere + kapısına |
| **F2** | **Ortam katmanları yolu ya da kaçışı bozuyor** | `node -e` üç ANLIK DURUM satırını sessizce boşalttı · MSYS `/fms`i Windows yoluna çevirdi · `Edit` yorumdaki `ı`yi kaçışa çevirdi · cwd `packages/db/packages/db/` | Metin **hiçbir kabuk argümanından geçmez** (`tools/bash-text-guard/` kancası; commit mesajı `git commit -F <dosya>`); konteynere `/` ile başlayan değer → `MSYS_NO_PATHCONV=1`; kaçış dizisi giren dosyanın diğer düzenlemeleri gözden geçirilir |
| **F3** | **Bir kural örneklerinden geriye okununca yanlış öğreniliyor** | *"üçü de `people`a bakıyor → üçü de RESTRICT"* · *"sayısal olan CHECK almaz"* · `reltuples = -1` bir **durum** sanıldı, bir **yarıştı** | Kuralın kendi **gerekçesine** dönülür (*"sözleşme mi kalibrasyon mu"*, *"kaynağın sınıfı"*); zamana bağlı değer iddia eden test, yarış olup olmadığı ölçülmeden yazılmaz |
| **F4** | **Aracın gerçek davranışı belgesinden farklı** | pnpm 11 `ignoredBuiltDependencies` legacy ve **sessizce yok sayılıyor** · Vitest `projects` kök `resolve`u devralmıyor · `drizzle-kit` negatif glob çalışmıyor · `?raw` `css:false`ta `''` dönüyor · PG 18.6 tablo adını tırnaklamıyor | **Kaynağa bakılır** (`node_modules/…/dist`), belgeye değil; yazılmış bir ayarın **etkisi ölçülür** — "dosyada var" onun okunduğunu göstermez |
| **F5** | **Aynı çağrı, girdinin şekline göre farklı davranıyor** | Çok satırlı `INSERT` ortak tipi önce çözüyor (`text` → `jsonb` yok) · `unsafe()` çok ifadeli dizede dönüş şekli değişiyor · round-trip ilk `text[]` sütununu göremiyordu | Bir çağrı tek şekille sınanıp başka şekille **kullanılmaz**; şekil değişince belirti bambaşka yerde çıkar (tip hatası gibi görünür) |

**Okuma kuralı:** bir alt görevde kırılan her şey günlüğe bu harflerle
sınıflandırılır; **yeni harf açmak** bir bulgudur (Faz 4, 5 ve 6 yeni harf
açmadı — sözlük yetiyor). Bir sınıfın *"kaç kez"* sayısı kendiliğinden
düşmez; düşüren **eylem** (bir kanca, bir nöbetçi, bir kapı) adıyla yazılır.

## 18.2 DEĞİŞMEZLER — fazdan bağımsız, her turda geçerli

> K1–K15 anayasanın **ürün** değişmezleridir (§1.2). Aşağıdakiler **sürecin**
> değişmezleri: altı fazda ölçülmüş bedelden doğdular ve hiçbir fazın kapsamı
> onları askıya alamaz. Numaraları sabittir; yeni bir değişmez **sona** eklenir.

| # | Değişmez | Doğduğu bedel |
|---|---|---|
| **DZ-01** | **Sayı, ölçüm çıktısından kopyalanır.** Ölçülmemiş alan `ÖLÇÜLECEK`/*"ölçülemedi"* kalır; rapordan, ROADMAP'ten, ANLIK DURUM'dan, kendi eski ölçümünden **kopyalanmaz** — kullanılacağı gün **yeniden sayılır** | D1 · D7 |
| **DZ-02** | **Araç önce doğrulanır.** Beklenmedik sonuçta nöbetçi iki yönlü sınanır; çıkış kodu **borusuz** okunur; `grep -c` satır sayar; cwd kalıcıdır | D2 |
| **DZ-03** | **Her kapı kapsamını söyler.** *"✓ temiz"* tek başına kanıt değildir; *"0 bulundu"* ile *"bakılmadı"* ayrılır; `format:check` `*.md`ye bakmaz ve rapor bunu yazar | D3 · SAPMA-024 · BORÇ-012 |
| **DZ-04** | **Test yeşil ≠ üretim çalışıyor.** BUILD ET VE ÇALIŞTIR; yüzey **adıyla** (paket `dist`i · web paketi · imaj); koşturulmayan *"koşturulmadı"* | D5 · SAPMA-014 |
| **DZ-05** | **Kırmızı test ≠ kod yanlış.** Önce hangisi yanlış sorulur; kural test için gevşetilmez; ret *"bu kısıt tarafından"* diye yazılır | D6 |
| **DZ-06** | **ROADMAP ve PROJECT_MEMORY kendi sesindir.** Kaynak `docs/spec/**` + `CLAUDE.md`; `grep` eşleşmesinin dosyasına ve `git log -S` ile yazarına bakılır | D7 |
| **DZ-07** | **Envanter sayı değil listedir ve kaynaktan türetilir.** Türetilemeyen elle liste **kendi kapısını** getirir; sayı taşıyan talimat bayatlar → sayı kaldırılır, kaynaktan sayılır | F1 · `gaps:check` · `debt:check` |
| **DZ-08** | **Metin kabuktan geçmez.** Türkçe/Markdown/ters tırnak `Edit`/`Write` ile; commit mesajı `git commit -F <dosya>`; kanca (`bash-text-guard`) reddeder ve **kaçış yolu yoktur** | F2 |
| **DZ-09** | **Kural gerekçesinden öğrenilir, örneklerinden değil.** Örneklerin tesadüfen paylaştığı özellik ayraç sanılır | F3 |
| **DZ-10** | **Yazılmış bir ayar, yüklendiği ölçülene kadar "hiçbir şey yapmayan ayar"dır.** Alias, glob, hook, `.prettierignore`, ajan/skill dosyası — varlığı değil **etkisi** ölçülür; ölçülemiyorsa *"ölçülemedi"* yazılır ve ilk ölçülebilecek yer adıyla verilir | F4 · 6.3b #9 · `ignoredBuiltDependencies` |
| **DZ-11** | **Bir kapının VAR olması KOŞTUĞUNU göstermez.** Her `*:check` `ci.yml`de `run:` olarak ve **maskesiz** (`continue-on-error`/`\|\| true`/`if:` yok); kablolama bir testle iddia edilir | `gaps:check` beş alt görev kablosuz · `inventory-guards` ① |
| **DZ-12** | **Nöbetçi, yakalayacağı hata OLUŞABİLECEK hâldeyken yazılır** — bileşenden/dosyadan/migration'dan **önce**; kanarya **gerçek depoda** öter | 6.5 `UI_KEYS` · 6.6-ön CHECKPOINT |
| **DZ-13** | **Mutasyon ayrıştırılır.** Yedek → md5 → boz → md5 değişti → **kırılanlar adıyla** → yedekten geri al → md5 döndü. `git checkout` ile geri alma yok. Hiçbir şeyi kırmayan mutasyon üç şeyden biridir (nöbetçi yok · yola dokunmuyor · kod gereksiz) — hangisi, yazılır | 6.3 #7 · 6.5 #21 · 5.x |
| **DZ-14** | **Kapsam taşıması kütüğe kayıtla bitmez.** Devredilen borç/boşluk/karar/yarım kriter hedef fazın **ROADMAP kapsamında adıyla** görünür ve hedef fazın **yapabildiği** doğrulanır; `gaps:check`/`debt:check` koşar | 4.11 · 5.9 · 6.0 · 6.1 · 6.3 (beş kez) |
| **DZ-15** | **Bir kriter işlevi yerine konmadan silinmez.** Daraltılan kriterin çıkarılan yarısı **adıyla** bir faza gider; silinen kriterin yerine işlevini karşılayan bir kriter gelir | 6.1 kriter tablosu · SAPMA-045 |
| **DZ-16** | **Asenkron işin sonucu ölçülmeden önce bittiği ölçülür.** Uydurma bekleme süresi ölçüm değildir; bitişin göstergesi (`EXIT=`, `Last Result`, `status`) okunur | 6.6-ön (zamanlanmış görev "çalışmadı" sanıldı, `Last Result: 0` verdi) |
| **DZ-17** | **Envanter tipi spec bölümü ile normatif bölümün barı aynı değildir.** Envanteri gerçeğe hizalamak sorulmadan yapılır; niyeti değiştirmek SAPMA ister ve **sorulur** | SAPMA-044 · SAPMA-042 |
| **DZ-18** | **Rapor önce dosyaya, sonra terminale — aynısı.** Onay bekleyen içerik raporun `DETAY`ında yaşar; arşiv append-only, düzeltme *"Bilinen kayıt düzeltmeleri"*ne | 3.10 · 4.0b |
| **DZ-19** | **Tek seferde tek alt görev; plan ROADMAP'te yaşar; commit alt görev başına; onay gelmeden geçilmez.** Faz kapanışında `git tag -a faz-XX-son` atılır ve push edilir — `main` ilk sürüme kadar Faz 0'da, tag tek *"bilinen iyi nokta"* | K11 · §1.4 · 6.6-ön |
| **DZ-20** | **Bir faz tek bir workflow koşusuna sığar.** Ölçü `workflowSizeGuideline: medium` = 15 ajandan az; 15'ten fazla **bağımsız iş birimi** → faz bölünür. Gün sayılmaz | ROADMAP §0.5 (6.6-ön) |
| **DZ-21** | **Denetleyen, gerekçeyi değil çıktıyı görür.** `kapici` ve `denetci`ye `gelistirici`nin `## ÇIKTI`sı verilir, `## GEREKÇE`si verilmez | 6.6-ön ajan sözleşmesi |
| **DZ-22** | **`CLAUDE.md` §14 taşınmaz, kısaltılmaz, birleştirilmez.** `tools/glossary-check/index.test.mjs` onu ayrıştırır (77 kayıt) ve sözlükle **aynı karşılıkla** eşleşmesini iddia eder; birleştirmek koşan bir nöbetçiyi siler | 5.7 · 6.6-ön |
