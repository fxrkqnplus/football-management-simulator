# Changelog

Bu projedeki tüm önemli değişiklikler bu dosyada kayıt altına alınır.
Format: [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/),
sürümleme: [Semantic Versioning](https://semver.org/lang/tr/).

## [Yayınlanmamış]

### Eklendi — Faz 1: Monorepo, Araç Zinciri ve Kalite Kapıları

- pnpm workspaces + Turborepo 2 monorepo: 8 paket ve `pnpm-workspace.yaml` sürüm kataloğu
- TypeScript 6.0.3 (`~` ile pinli), `strict` + `noUncheckedIndexedAccess` +
  `exactOptionalPropertyTypes`, paket başına açık `types` alanı
- ESLint 10 flat config (tek kök yapılandırma), Prettier, import sıralaması
- Vitest 4 (`projects[]`) ve **gerçekten ısıran** kapsam eşikleri (global %70, motor %85)
- `packages/shared`: alt yol tek kaynağı (`base-path.ts`) ve Zod 4 ile ortam
  doğrulaması (`env.ts`) — eksik değişkende Türkçe, eyleme dönüştürülebilir hata
- Yerel ESLint kuralı `local/no-hardcoded-path` (K6) ve kuralın kendi testi
- `pnpm arch:check`: katman yönü (§2.4), motor saflığı (K3), import yolu harf
  duyarlılığı, TS olmayan varlıklarda mutlak yol
- Üç önyükleme kapısı: Node sürümü, tsconfig `types`, `.env` içeriği
- Docker Compose veri katmanı: Postgres 16, Redis 7, adminer — healthcheck'li,
  named volume, ARM64 uyumlu
- Minimal API (NestJS 11) ve web (Vite 8 + React 19), `/fms` alt yolunda çalışır
- Çok mimarili konteyner imajları (amd64 + arm64) ve HTTP duman testleri
- GitHub Actions CI: kalite kapıları + imaj derleme, iki mimaride native runner
- `docs/ADR/0001`–`0004`, `docs/OUTPUT-FORMAT.md`, `docs/DEPENDENCY-WATCH.md`,
  `docs/HOSTING-FALLBACK.md` (iskelet)
- AGPL-3.0 lisansı, `.gitignore`, `.gitattributes` (LF zorunlu), `.env.example`
- `README.md`: "Geliştirme Ortamı" bölümü ve sıfırdan kurulum adımları

### Değiştirildi — Faz 1

- Teknoloji yığını sürümleri npm registry doğrulamasıyla güncellendi (SAPMA-003).
  TypeScript bilinçli olarak en yeni majöre (7.x) **çıkarılmadı**: programatik
  derleyici API'si olmadığı için `typescript-eslint` ve `nest build` çalışmıyor.
- `DEFAULT_SIM_TIER` → `DEFAULT_SIM_POLICY`. `EngineTier` (maç başına, motor içi)
  ile `SimulationPolicy` (kayıt başına, kullanıcıya açık) ayrımı belgelendi.
- Frontend barındırma: Cloudflare Pages yerine origin konteyneri (Caddy arkası)
- `PROJECT_MEMORY.md` ANLIK DURUM bloğu artık **alt görev başına** güncelleniyor
  (SAPMA-004) — faz ortasında kopan oturumun yönünü bulabilmesi için
- Commit kadansı: alt görev başına commit, faz başına PR
- `docs/MASTER-SPEC.md` "donmuş arşiv, otorite değil" uyarısıyla işaretlendi

### Kaldırıldı — Faz 1

- `docs/PROMPT-KITAPCIGI.md` atıfları: dosya kasıtlı olarak repo dışında tutuluyor
- `.env` içinden `NODE_ENV`: Vite'ın üretim/geliştirme kararına karışıp React'in
  geliştirme sürümünü üretim paketine sokuyordu (429 kB → **228 kB**)

### Eklendi — Faz 0

- Belge yapısı kuruldu (CLAUDE.md, docs/spec/, PROJECT_MEMORY.md, ROADMAP.md)
- `docs/spec/12-data-packs.md`: veri paketi formatı, anahtar eşleme, varlık işleme
  hattı, portre tutarlılık sistemi

### Değiştirildi — Faz 0

- Veri modeli gerçek-birincil hale getirildi (`DATA_MODE=full` varsayılan).
  Prosedürel üretim yedek role çekildi (newgen'ler ve eksik varlıklar için)
- Sunucu varsayılanı `SERVER_MODE=private` — kişisel kurulum
- KVKK/GDPR zorunludan koşullu hale geldi (yalnızca `SERVER_MODE=public` ise)
