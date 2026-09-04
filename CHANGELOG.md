# Changelog

Bu projedeki tüm önemli değişiklikler bu dosyada kayıt altına alınır.
Format: [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/),
sürümleme: [Semantic Versioning](https://semver.org/lang/tr/).

## [Yayınlanmamış]

### Eklendi — Faz 5: i18n Altyapısı ve Terim Sözlüğü

- **Çeviri katmanı** — `i18next 26.4.1` + `react-i18next 17.0.13` +
  `i18next-browser-languagedetector 8.2.1`, **on namespace**, kaynaklar
  **statik paketleniyor** (geç yükleme yok, `Suspense` gerekmiyor). i18n bir
  **önyükleme ön koşulu**: kurulum başarısızsa React **hiç monte edilmiyor** —
  gerekçe ölçüldü, i18next bozuk yapılandırmada **fırlatmıyor**, sessizce
  `undefined` bırakıyor (bir `try/catch` göremezdi)
- **Tipli anahtarlar** (`CustomTypeOptions`) — yanlış yazılmış bir **literal**
  anahtar `pnpm typecheck`i kırıyor; **iki yönlü** bir kontrol deneyiyle
  kanıtlandı (yanlış anahtar → `TS2345`, doğru anahtar → geçti)
- **Türkçe ek motoru** (`packages/shared/src/i18n/turkish-suffix.ts`) — ünlü
  uyumu + son harf analizi, **57 vaka** (eşik 50), dağılım **tek tek sabit**.
  🆕 **Yabancı adlarda yazım ≠ okunuş**: `Premier League` ve `FA Cup` gerçek
  seed adlarıyla çapraz doğrulamada **ısırdı** → `PRONUNCIATION_OVERRIDES`
- **`Intl` biçimlendiriciler** — tarih `23 Ağustos 2026`, para `€1,2 mn`.
  Ayırıcı **bölünmez boşluk** (`U+00A0`) ve testte **kod noktalarıyla** iddia
  ediliyor; zaman dilimi **varsayılmıyor** (`UTC`, makineden okunmuyor)
- **`local/no-bare-jsx-text` ESLint kuralı (K5)** — JSX'te çıplak metin
  `error`. ⚠️ Ad ölçümle düzeltildi (`no-hardcoded-turkish` değil): kural
  **dile bakamaz** — `Tekrar dene` hiçbir Türkçe karakter taşımıyor,
  `api prefix` İngilizce ve yine ihlal. **Kanarya gerçek depoda**: gerçek
  `eslint.config.js` çözülüp var olan bir dosyanın **kimliği** altında lint
  ediliyor, yani kural sökülürse/`off` olursa bir test kırılıyor
- **`pnpm i18n:check` + CI adımı** — eksik anahtar · kullanılmayan anahtar ·
  boş çeviri · **gömülü görünmez karakter** (`.md` dahil; `locales/**` içinde
  rapor eder, kırmaz). ⚠️ ZWJ **iki emoji arasında meşru** ve bu bir ölçümün
  sonucu: kural daraltılmasaydı `README.md`nin emoji dizisinde ilk koşuda
  ateşlenirdi
- **`pnpm gaps:check` CI'a bağlandı** — 4.11'den beri hiçbir workflow'da
  yoktu; kapının kendi gerekçesi (*"kontrol koşan bir adımdır, bir temenni
  değil"*) başına gelmişti
- **`docs/glossary.md`** — **133 terim** (çekirdek 77 + görünür nitelik 47 +
  gizli nitelik 9). Sayı **belgede yazmıyor**, dosyayı **ayrıştıran bir
  testte** yaşıyor; `CLAUDE.md` §14 eşleşmesi **anahtar ve değer** iddia
  ediyor
- **G-13 karara bağlandı** — çeviri kaynağı **tek yerde** yaşar
  (`locales/tr/*.json`); veritabanı **anahtar** taşır, görünen **metni
  taşımaz**. Üç arama seçeneği de mümkün, **ikisi şartlı** (metin türetilmiş
  olmalı). Mekanizma **Faz 17'nin**; şema **değişmedi**

### Değiştirildi — Faz 5

- `ErrorBoundary`in `title` propu **`titleKey`e** dönüştü — çağrı yerinin de
  K5'e uyması artık **tip seviyesinde zorunlu**
- Hata gövdesinden **`message` alanı çıkarıldı** (`MESSAGE_BY_KIND` silindi);
  tüketicisi **sıfır**dı ve bu ölçüldü — `api.ts` hata gövdesini hiç parse
  etmiyor

### Kaldırıldı — Faz 5

- `tools/i18n-inventory/` — 5.4'te yazıldı, **5.5'te emekli edildi**: aynı işi
  yapan ikinci bir kod yolu bir gün ayrışır. Emeklilikten **önce** iki
  uygulamanın anlaştığı tarihsel korpusta ölçüldü: **33 = 33**, dosya dosya

### Eklendi — Faz 4: Veritabanı Şeması II — Oyuncu, Sözleşme, Personel

- **11 master tablo daha** (`people` · `players` · `player_attributes` (47
  görünür) · `player_hidden_attributes` (10 gizli) · `player_positions` ·
  `player_traits` · `player_stats_history` · `staff` · `staff_attributes` ·
  `managers` · `manager_attributes`) — envanter **11 → 22**, FK **12 → 32**.
  Sayılar `spec/01` §3.1'den **sayıldı**, ROADMAP'ten alınmadı (SAPMA-001'in
  dersi)
- **Faz 3'ten devredilen üç ileri yabancı anahtar** (`0006`):
  `federations.president_person_id` · `clubs.chairman_person_id` ·
  `referees.person_id` — üçü **üç farklı** `ON DELETE` aldı (SET NULL ·
  RESTRICT · RESTRICT) ve üçü de **kuraldan türetildi**, listeden değil
- **`fk-policy.ts` V3** — üçüncü olgu `is_nullable`, `SET NULL` üretimi, sıra
  `dictionary → independent → nullable → satellite`. Faz 4 boyunca **32 FK'nın
  32'si** hiçbir liste güncellenmeden denetlendi
- **Transfer arama indeksleri** (`0011`): `players (primary_position,
  current_ability)` ve `people (birth_date)` — indeks **4 → 6**
- **5.000 sahte oyuncu seed'i** (`tools/data-cli`), **deterministik** (K2) ve
  saflığı `Math.random`/`Date.now` patlatılarak **koşarak** kanıtlandı
- **`packages/db/src/schema/sql-literals.ts`** — CHECK değer listesini SQL
  literaline çeviren ifadenin **tek** yeri (BORÇ-008 ödendi, 4.11). Ortaklaştırma
  `typecheck`le değil **üretilen migration'la** doğrulandı: `drizzle-kit
  generate` → *"No schema changes"*; ve modül körlendiğinde **17 CHECK
  kısıtının 17'si** birden değişiyor
- **`pnpm gaps:check`** (`scripts/check-gap-coverage.mjs`) — her açık G-satırının
  atandığı fazın ROADMAP kapsamında **adıyla** geçtiğini doğrular. Sayıları
  kütükten **sayar**; ilk koşusunda gerçek bir uyuşmazlık buldu (**G-13 → Faz 5**)

### Değişti — Faz 4

- `docs/schema/world.md` — mermaid bloğu **22 tablo / 32 FK** (programatik,
  nöbetçiyle korunuyor); **prose dört yerde bayattı ve düzeltildi** (başlık ·
  tablo envanteri 15 → 22 · FK 16 → 32 · migration zinciri 9 → 12 · indeks
  listesi 4 → 6). Nöbetçi bloğu koruyor, **prose'u hiçbir şey korumuyor**
- `docs/spec/01-database.md` §3.1.0'ın *"taşımayan"* listesi · §3.0'a iki `down`
  hata sınıfının ayrımı (*"fazla giden"* ve *"eksik kalan"* — **ikisi de sessiz
  olabilir**)
- `docs/spec/09-quality-protocol.md` §11.5 — mutasyon serisine dokuz satır
  (4.2 → 4.11) ve üç yeni yöntem kuralı: *"determinizm testi tek başına bir
  nöbetçi değildir"* · *"geçen bir bütçe testi ölçümün DOĞRU ALINDIĞINI
  göstermez"* · *"bir refactor'ın davranışı değiştirmediğinin kanıtı üretilen
  SQL'dir"*
- `docs/SESSION-TEMPLATE.md` — **§0.5 süre kontrolü** (4.1) ve **`pnpm
  gaps:check`** (4.11) faz kapanış adımlarına eklendi; ikisi de SAPMA-033'ün
  çaresi (*"bir kuralın kontrol eden adımı yoksa, ateşlendiğinde hiçbir şey
  olmaz"*)
- **Faz 4 ikiye bölündü** — 4a (4.0→4.7) · 4b (4.8→4.11). Bölünmeyi bir tahmin
  listesi değil **ölçüm** kararlaştırdı (§0.5 kontrol noktası, 2,633 gün)

### Eklendi — Faz 3: Veritabanı Şeması I — Dünya Çekirdeği

- **11 master tablo** (`countries`, `federations`, `competitions`, `clubs`,
  `club_facilities`, `club_finances_base`, `stadiums`, `rivalries`,
  `kit_templates`, `club_kits`, `referees`) — sayı gözle değil
  `information_schema`'dan **ölçülerek** iddia ediliyor (SAPMA-021: üç belge üç
  farklı sayı söylüyordu)
- **Migration koşucusu** (`packages/db/src/migrate/`): Zod'lu journal, planlama,
  `up`/`down`, `--dry-run`. Takip tablosu kendi şemasında (`fms_meta.migrations`).
  ⚠️ `drizzle-kit` `down` **üretmiyor** — beş migration'ın **beşinin de elle
  yazılmış `down`u** var
- **Geri almanın veri kaybı ETİKETLENMİYOR, ÖLÇÜLÜYOR** (`loss.ts`): geri alma
  bir işlemde uygulanır, şema öncesi/sonrası karşılaştırılır, kaybolan
  tablo/sütunlar ve **kaç satırı** etkilediği sayılır; `allowDataLoss` yoksa
  işlem **geri alınır ve reddedilir**
- **Round-trip kanıtı** (`schema-state/`): derin introspection + saf
  karşılaştırıcı. `up` → **veri yaz** → `down` → `up` çevriminde tam zincirde
  **1.627 olgu, fark yok**. Karşılaştırıcı `comparedFacts` **döndürüyor** — kör
  bir kontrolün *"fark yok"* demesiyle karışmasın diye
- **K4 tip seviyesinde** (`client/`): görünmez marka, `MasterDb` (yazma metotları
  **tipte yok**), `WritableDb` (master tablo → parametre `never`). `is_master`
  bayrak sütunu **kullanılmadı**. `arch:check`e dokuzuncu kural
  (`master-table-marking`) + kanaryası
- **`ON DELETE` bir LİSTE değil bir KURAL** (`schema/fk-policy.ts`): on iki FK'nın
  davranışı `spec/01` §3.1.2 ③+⑧'den **türetiliyor**, girdiler katalogdan okunuyor,
  türetilen değer `pg_constraint`teki gerçekle karşılaştırılıyor — **12/12, 0
  uyumsuzluk**
- **Türkçe arama zemini**: `pg_trgm` 1.6 + `unaccent` 1.1 + `IMMUTABLE`
  sarmalayıcı. Düz `pg_trgm` Türkçe aramayı **sağlamıyor** (ölçüldü: `'Beşiktaş'
  % 'besiktas'` → `f`); `unaccent`li GIN indeksiyle **0,92 ms** (indekssiz 6,13 ms)
- **Dört indeks**, biri `LEAST/GREATEST` ifade `UNIQUE`i — `rivalries` çift
  tekliğini **sıralama sözleşmesi dayatmadan** kapatıyor
- **Seed betiği** (`tools/data-cli/src/seed.ts`): 6 ülke + 11 yarışma,
  **deterministik** (K2) ve **idempotent**. İdempotentlik *"patlamadı"* ile değil
  **ONARIM ile** kanıtlandı
- **Entegrasyon test katmanı** (`pnpm test:db`, G-03 **kapandı**): Vitest +
  `testcontainers`, gerçek **PostgreSQL 18.6**, CI'da ayrı iş — **amd64 + arm64**
  (K14). Faz kapanışında **163 test / 8 dosya**
- **ER diyagramı ÜRETİLİYOR, çizilmiyor** (`schema-state/er-diagram.ts`):
  `docs/schema/world.md`'deki mermaid bloğu canlı katalogdan üretiliyor ve bir
  entegrasyon testi belgeyi katalogla **birebir** karşılaştırıyor. Elle çizilmiş
  bir diyagram şemanın **üçüncü** temsili olurdu ve üçüncüsünü hiçbir şey
  denetlemez
- **Rapor arşivi** (`docs/reports/`): her alt görev raporu terminale basılmadan
  **önce** dosyaya yazılıyor — append-only, otorite değil

### Değişti — Faz 3

- **PostgreSQL 16 → 18.6** (SAPMA-019) ve collation `--locale=C` →
  `builtin`/`C.UTF-8` (SAPMA-020 — `C` ctype Türkçe `ILIKE`'ı **sessizce
  bozuyordu**, dosyadaki yorumun iddiası ölçümle çürütüldü)
- `docs/spec/01-database.md`: **§3.0** migration disiplini · **§3.1.0** veri
  paketi sütunları (`key`/`source`/`externalIds`, `key` benzersizliği **tablo
  başına**) · **§3.1.2** şema yazım kuralları (**on madde**) · **§3.4.1** K4
  sözleşmesi
- `docs/spec/09-quality-protocol.md`: §11.4 desen envanterine üç satır, §11.5'e
  mutasyon serisi ve iki yeni yöntem kuralı (*"bir mutasyonun hiçbir şeyi
  kırmaması iki farklı şey demek olabilir"* · *"N satırda indeks kullanılıyor bir
  kural değildir — ayraç seçiciliktir"*)

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
