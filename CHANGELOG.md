# Changelog

Bu projedeki tüm önemli değişiklikler bu dosyada kayıt altına alınır.
Format: [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/),
sürümleme: [Semantic Versioning](https://semver.org/lang/tr/).

## [Yayınlanmamış]

### Eklendi — Faz 2: Hata Kontrol ve Gözlemlenebilirlik Protokolü

- **Tipli hata sınıfları** (`packages/shared/src/errors.ts`): `DomainError`,
  `ValidationError`, `EngineError`, `DataProviderError`, `NotFoundError`,
  `ForbiddenError`. Sözleşme `code` + `context`; `httpStatus` bilinçli olarak
  **yok** (SAPMA-010 — HTTP bir taşıma kaygısı, motor HTTP bilmez)
- **Yapılandırılmış loglama**: izomorfik `Logger` arayüzü kökte, pino uygulaması
  `@fms/shared/server` alt yolunda, tarayıcı uygulaması `console` üzerinde.
  Anahtar adına göre **redaksiyon** (alt dize eşleşmesi) iki tarafta da ortak
- **`@fms/shared/server` alt yol sınırı** ve `arch:check`'e üç yeni kural —
  paket sınırının tek **önleyici** hattı (SAPMA-012)
- **`correlationId` zinciri uçtan uca**: tarayıcı uuid v7 üretir →
  `X-Correlation-Id` → NestJS middleware → `AsyncLocalStorage` → her log satırı
  otomatik taşır. Taşınabilir zarf (`serializeLogContext`) gerçek süreç
  sınırında test edildi
- **NestJS global exception filter**: tipli hata → HTTP durumu (`Record<ErrorKind,
  number>`, eksik eşleme **derlemeyi kırar**) + Türkçe gövde
- **Sentry** (`@sentry/node` + `@sentry/react` 10.70.0): tek karar noktalı
  `beforeSend`, kullanıcı-hatası elemesi, olay kısıtlayıcı, açık
  `dataCollection` politikası (`sendDefaultPii` **değil** — Karar 17)
- **Üç katmanlı `ErrorBoundary`** (kök / ekran / bileşen), `correlationId`
  gösteren yedek arayüz, yığın izi **yalnızca** geliştirmede
- **`debugTrace`** (K7): `{ module, input, steps[], output, summary, seed? }`,
  Türkçe özet zorunlu. Motor **loglamaz, iz döndürür**
- **`assertInvariant`**: varsayılan `throw`; yalnızca tarayıcı üretim derlemesi
  `report` kipine geçer. `NODE_ENV` **koklanmaz**, değer `__FMS_DEV__` derleme
  zamanı sabitinden gelir
- **`measure`**: bütçe aşımında enjekte edilen bildiriciyi çağırır; eşzamansız
  iş **reddedilir** (sessizce yanlış ölçüm üretmemek için)
- **Geliştirici Hata Ayıklama Paneli** (`Ctrl+Shift+D`, 4 sekme) ve 50 satırlık
  halka tampon. Üretim paketinde **hiç yok** — kaynak haritası `sources`
  listesiyle kanıtlandı
- `arch:check` **8 kurala** çıktı: motorun alamayacağı adlandırılmış dışa
  aktarımlar (`createCorrelationId`, `measure`, `configureAssertions`) ve
  o tablodaki adların barrel'da **gerçekten var olduğunu** denetleyen kural
- **Meta-test iki katmanlı**: sabit tablo bütünlüğü + her kuralın ihlalini
  içeren **kanarya deposu**. Saf fonksiyonun birim testi kablolamayı kanıtlamaz

### Değiştirildi — Faz 2

- `base-path.ts` fırlatmaları `TypeError` → `ValidationError` (2.1)
- `env.ts` `process.stderr.write` kaldırıldı; doğrulayıcı artık uyarıyı
  **döndürüyor** (`collectEnvWarnings`) — logger env'den doğduğu için sıra
  tersine çevrildi (SAPMA-013)
- `api.ts` başarısız HTTP yanıtları: 5xx/ağ → `DataProviderError`, 4xx →
  `DomainError`. Önceki modelleme **her 500'ü Sentry'den sessizce düşürüyordu**
- `api.ts` `correlationId` uyumsuzluğu `logger.warn` → `assertInvariant`
  (SAPMA-018). **Üretim davranışı değişmedi**; dev'de artık fırlatıyor
- `DebugTrace.input` spec'teki `Record<string, unknown>` yerine `ErrorContext`
  (SAPMA-016) — aynı redaksiyon hattına giden iki tip tutarsız olmamalı
- ESLint: `apps/**` + `packages/**` içinde `process.stdout/stderr.write` yasak
- Her paketin `build` betiği `scripts/clean-dist.mjs` ile başlıyor (SAPMA-011 —
  turbo önbelleği silinmiş çıktıyı diriltiyordu)

### Düzeltildi — Faz 2

- **Kapsam kapısı yalan söylüyordu** (SAPMA-007): `coverage.include` deseni
  yalnızca `*.ts` idi, `.tsx` dosyaları rapora hiç girmiyordu. Düzeltilince
  gerçek durum K10 eşiğinin **altında** çıktı (SORUN-001) ve DOM test ortamı
  kurularak gerçek testlerle kapatıldı — **eşik düşürülmedi, dosya dışlanmadı**
- **`tsconfig` `exclude` deseni hiçbir şeyle eşleşmiyordu** (SAPMA-009):
  TypeScript'in glob dili süslü parantez genişletmesini desteklemiyor; yedi
  paketin testleri `dist/`e emit ediliyordu
- **Dairesel DI bağımlılığı** (SAPMA-014): `typecheck`, `lint` ve 19 birim testi
  üçü de sessiz kaldı; yalnızca **derlenmiş çıktıyı çalıştırmak** yakaladı
- `arch:check` kanaryası yedi kuraldan **altısını** kapsıyordu; `import-casing`
  körelmişti ve hiçbir kapı ötmüyordu

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
