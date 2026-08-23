# Football Management Simulator

Web tabanlı, Türkçe, 2 boyutlu, tur tabanlı futbol menajerlik simülasyonu.
Football Manager 26 referans alınmıştır.

**Hedef:** `https://fxrkqn.org/fms` · Herkese açık kayıt · Ücretsiz · Reklamsız

---

## 🚀 Claude Code ile Başlarken

Bu repo şu an **yalnızca belgelerden** oluşuyor. Kod Faz 1'de başlıyor.

```
Faz 1'e başla.

1. PROJECT_MEMORY.md → ANLIK DURUM bloğunu oku
2. docs/ROADMAP.md → Faz 1 bölümünü oku
3. docs/spec/09-quality-protocol.md oku
4. docs/SESSION-TEMPLATE.md şablonunu takip et
```

`CLAUDE.md` her oturumda otomatik yüklenir — anayasa, teknoloji yığını ve terim sözlüğü orada.

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
    └── 11-project-memory.md  Hafıza sisteminin kuralları ve şablonu
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

## ⚖️ Lisans

AGPL-3.0 — bkz. `LICENSE`
Üçüncü taraf veri kaynakları ve lisansları: `NOTICE`

Public dağıtım prosedürel armalar, prosedürel portreler ve açık lisanslı veriyle
(Wikidata CC0, openfootball, Wikimedia Commons) çalışır. Telifli varlık sunucuda
barındırılmaz.
