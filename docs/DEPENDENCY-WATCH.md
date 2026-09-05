# Bağımlılık Takip Listesi

> **Her faz açılışında bu tablo kontrol edilir** (`docs/SESSION-TEMPLATE.md` ÖN KONTROL).
>
> Neden var: Faz 1.0'da 28 paketin sürümü npm registry'den doğrulandı, ama
> 28 changelog'un tamamı okunmadı — bu bir günlük iş olurdu ve paketlerin çoğu
> Faz 16-45 arasında ilk kez kullanılacak. Okunmayan changelog takip edilmezse
> unutulur. Bu dosya o borcu görünür tutar.
>
> Bir satır, ilgili faza gelindiğinde ele alınır ve **kaldırılmaz** — sonucu
> yazılır (okundu / bump edildi / karar korundu).

## Aktif takip

| Paket | Kilitli sürüm | Ele alınacak faz | Sebep |
|---|---|---|---|
| `pnpm` | **11.23.0** | ~~Faz 2~~ ✅ **2.0'da bump edildi** | 11.22.0 → 11.23.0. Sonuç aşağıda. |
| `pino` | 10.3.1 | ~~Faz 2~~ ✅ **2.0'da karar, 2.2b'de KURULDU** | Sonuç aşağıda. |
| `pino-pretty` | 13.1.3 | **Faz 49** | 2.2b'de `packages/shared` devDependency olarak kuruldu. Yalnızca `LOG_FORMAT=pretty` ile devreye girer. Faz 49'da (mobil cila/performans) üretim imajında gereksiz ağırlık olup olmadığı gözden geçirilir. |
| `@sentry/node`, `@sentry/react` | 10.70.0 | ~~Faz 2~~ ✅ **2.0'da ele alındı, sürüm sabitlendi** | Kurulum 2.5'te. Sonuç aşağıda. |
| `drizzle-orm` / `drizzle-kit` | 0.45.2 / 0.31.10 | ~~Faz 3~~ ✅ **3.0'da ele alındı — KARAR KORUNDU, KURULDU** | 1.0 hâlâ RC. Sonuç aşağıda. |
| `testcontainers` / `@testcontainers/postgresql` | **12.1.0** | ~~Faz 3~~ ✅ **3.0'da KURULDU, ARM64 denetlendi** | G-03. Sonuç aşağıda. |
| `postgres` (postgres.js) | **3.4.9** | ~~Faz 3~~ ✅ **3.2a'da SEÇİLDİ ve kuruldu** | `pg` ile karşılaştırılarak seçildi. Sonuç aşağıda. |
| `drizzle-kit` 1.0 — **`down` desteği** | — | **1.0 GA çıkınca** | 0.31.10 `down` migration **üretmiyor** (3.0'da ölçüldü) ve bu yüzden elle yazılan bir `down` katmanı kuruluyor. 1.0 GA'da `down` üretimi gelirse o katman **silinebilir**; RC'de kontrol edilmedi (proje RC almıyor). GA günü ilk bakılacak şey budur. |
| `resend` | 6.22.0 | **Faz 13** | Majör atlama, notlar okunmadı. İlk kullanım e-posta doğrulama. |
| `ioredis` | 5.11.1 | **Faz 16** | **BORÇ-001** — 6.0.0 mevcut ama kurulum anında 3 haftalıktı. |
| `bullmq` | 5.81.3 | **Faz 16** | **BORÇ-002** — 6.2.0 mevcut; v6 `ioredis`'i peer'a taşıdı, `pg`/`redis` peer'ları ekledi (kuyruk yapılandırmasını değiştiren mimari değişiklik). |
| `@tanstack/react-table` | ~~9.1.2~~ → **9.2.4** | ~~Faz 18~~ → **Faz 6** | Taze majör (9.0 → 4 Ağu 2026). v8 Nis 2025'ten beri güncellenmiyor, bu yüzden v9'da başlandı; notlar tablo motoru yazılırken okunacak. ⚠️ **İKİ DÜZELTME, 6.0'da ölçüldü.** ① **Faz ataması bayattı:** satır *"Faz 18"* diyordu ama **DataTable MOTORUNU Faz 6 kuruyor** (ROADMAP Faz 6 kapsamı: *"DataTable motoru: TanStack Table + sanallaştırma"*); Faz 18 motoru **yapılandırıyor** (60 sütun). Notların okunacağı yer, paketin kurulduğu yerdir. Bu, *"kapsam taşıması kütüğe kayıtla bitmez"*in **üçüncü** vakası (4.11 BORÇ-003/005 · 5.9 BORÇ-009/010 · bugün bu satır). ② **Sürüm bayattı:** registry **9.2.4** (6.0'da okundu), satır 9.1.2 diyordu. |
| `@tanstack/react-virtual` | **3.14.10** | **Faz 6** | ⚠️ **BU SATIR HİÇ YOKTU** (6.0'da ölçüldü) — `CLAUDE.md` §2.1 `@tanstack/react-virtual 3`ü sayıyor ve ROADMAP Faz 6 kapsamı sanallaştırmayı **adıyla** istiyor, ama takip tablosunda karşılığı yoktu. Majör atlama **yok** (ilk kurulum, v3 hattı). `react-table` ile aynı fazda kurulur. |
| `storybook` + `@storybook/react-vite` | **10.6.0** | **Faz 6** | ⚠️ **BU SATIR HİÇ YOKTU.** `CLAUDE.md` §2.1 Storybook'u **hiç anmıyor**; yalnızca ROADMAP Faz 6 kapsamı ve `packages/ui/package.json` açıklaması sayıyor. İlk kurulum, majör atlama yok. **Peer'lar 6.0'da registry'den doğrulandı** (`strict-peer-dependencies=true` ⇒ peer bir **kapı**): `vite ^5\|\|^6\|\|^7\|\|^8` → bizde `^8.2.2` ✅ · `react`/`react-dom` `^16.8\|\|^17\|\|^18\|\|^19` → `^19.2.8` ✅ · `storybook ^10.6.0` ✅ · `typescript >= 4.9.x` → `~6.0.3` ✅. ℹ️ Çekirdek **Playwright/Puppeteer/Chromium taşımıyor** (0 eşleşme) ama `@testing-library/jest-dom@6.9.1` ve `@testing-library/user-event@^14.6.3` **geçişli olarak** getiriyor — geçişli bir paket doğrudan import EDİLMEZ (`arch:check` → `undeclared-dependency`), gerekirse açıkça beyan edilir. |
| `@fontsource-variable/inter` · `@fontsource-variable/jetbrains-mono` | **5.3.0** | ~~Faz 6~~ ✅ **6.3'te KURULDU** | ⚠️ **BU SATIR 6.3'TE DOĞDU** — §7.3 iki fontu adıyla istiyor ama teslimat yolu hiçbir yerde kararlaştırılmamıştı. **Karar: kendi kendine barındırma (npm), CDN DEĞİL.** Gerekçe ölçüldü: bir CDN bir **Content-Security-Policy** kararı gerektirir ve bu depoda öyle bir politika **hiç yok** (`CSP` → `docs/ROADMAP.md` ve `docs/spec/10-deployment.md`de **0 eşleşme**); npm üzerinden gelen fontlar o kararı gerektirmiyor ve `$0` kısıtıyla uyumlu. Gözlem **Faz 50'nin kapsamına** adıyla taşındı. ⚠️ **Türkçe glif kapsamı ölçüldü, varsayılmadı** (`apps/web/src/app/fonts.test.ts`): iki paket de `latin` **ve** `latin-ext` bildiriyor ve on iki Türkçe kod noktasının hepsi ikisinin birleşiminde. 🆕 **Ve §7.3'ün cümlesi yarı yanlış çıktı:** *"`latin-ext` dahil edilmeli"* doğru ama yeterli değil — `ı` (**U+0131**) `latin-ext`te **değil**, Google Fonts onu `latin` alt kümesine **açıkça** eklemiş; kardeşi `İ` (U+0130) ise yalnızca `latin-ext`te. İki alt küme de gerekli, ve karşı kontrol testte (`latin` tek başına **Ğ ğ İ Ş ş**i kaçırıyor). |
| `tailwindcss` + `@tailwindcss/vite` | **4.3.3** | ~~Faz 6~~ ✅ **6.3'te KURULDU** | ⚠️ **BU SATIR HİÇ YOKTU** — `CLAUDE.md` §2.1 *"Tailwind CSS 4.3"* diyor ve registry **4.3.3** (6.0'da okundu), yani §2.1 güncel. İlk kurulum. `tailwindcss` paketinin **peer'ı ve bağımlılığı yok** (ölçüldü); Vite tümleşmesi ayrı paket: `@tailwindcss/vite@4.3.3`, peer `vite ^5.2\|\|^6\|\|^7\|\|^8` → bizde `^8.2.2` ✅. |
| shadcn/ui çalışma zamanı: `@radix-ui/react-*` · `class-variance-authority` · `tailwind-merge` · `clsx` | ~~1.1.23 (react-dialog örnek)~~ → **6.4'te KURULANLAR:** `react-select` **2.3.7** · `react-checkbox` **1.3.11** · `react-radio-group` **1.4.7** · `react-slider` **1.4.7** · `react-switch` **1.3.7** · `react-tabs` **1.1.21** · `react-popover` **1.1.23** · `clsx` **2.1.1** · `tailwind-merge` **3.6.0** · ⚠️ `class-variance-authority` **KURULDU, KULLANILMADI, KALDIRILDI** (6.4: dokuz bileşenin hiçbiri `cva()` çağırmıyor — varyant haritası `Record<ButtonVariant, string>` ile **tip seviyesinde kapsayıcı**, cva bunu zayıflatırdı; kullanılmayan bir bağımlılık bir sonraki okuyucuya *"bu gerekli"* dedirtir, SAPMA-026) | ~~Faz 6~~ ✅ **6.4'te KISMEN KURULDU** (6.5 kalan ilkelleri getirir) | ⚠️ **BU SATIR HİÇ YOKTU.** shadcn/ui bir **paket değil**, bileşenleri kopyalayan bir CLI — bu yüzden takip edilecek şey onun **çalışma zamanı bağımlılıkları**. Radix **ilkel başına ayrı paket** yayınlıyor (`@radix-ui/react-dialog`, `-popover`, `-tooltip`…), yani kurulacak paket sayısı 6.4/6.5'te hangi ilkellerin kullanıldığına bağlı ve **o gün sayılır**. ⚠️ Radix `jsdom`da doldurma isteyecek — aşağıdaki `jsdom` satırına bak. |
| `axe-core` | **4.13.0** | **Faz 6** | ⚠️ **BU SATIR HİÇ YOKTU** — `CLAUDE.md` §2.1 axe'ı **hiç anmıyor**, ama ROADMAP Faz 6'nın kabul kriteri 7 *"Kontrast denetimi (axe) → 0 ihlal"* diyor ve Faz 49 *"axe-core otomatik tarama"*yı kapsamında taşıyor. İlk kurulum. ⚠️ **Sarmalayıcı seçimi 6.8'in işi ve bugün yapılmıyor:** `jest-axe@11.0.0` ve `vitest-axe@0.1.0` var; ikisi de `axe-core`u sarıyor. ⚠️ **KAPSAM UYARISI (6.0'da ölçüldü):** jsdom'da `getComputedStyle().color` `var()`i **çözmüyor** ve `getBoundingClientRect()` **0×0** — yani düzen/hesaplanmış renk isteyen kurallar çalışamaz. Hangi kuralın hangi kimlikle atlandığı **BU ORTAMDA ÖLÇÜLMEDİ** (axe-core kurulu değil); 6.8'in **ilk işi** `inapplicable`/`incomplete` listesini adıyla yazmaktır — *"0 ihlal"* neyin denetlenmediğini söylemeden yazılmaz (SAPMA-024). |
| `i18next` / `react-i18next` | **26.4.1 / 17.0.13** | ~~Faz 5~~ ✅ **5.0'da karar · 5.3'te KURULDU** | Sonuç aşağıda. ⚠️ Satır `26.4.0 / 17.0.12` diyordu ve **bayattı**; sürümler 5.0'da **ve** 5.3'te registry'den yeniden okundu (ikisinde de aynı). |
| `i18next-browser-languagedetector` | **8.2.1** | ~~Faz 5~~ ✅ **5.0'da EKLENDİ · 5.3'te KURULDU** | ⚠️ **Bu satır HİÇ YOKTU** ve 5.0'ın açılış ölçümünde bulundu: ROADMAP Faz 5 kapsamı *"tarayıcı dil algılama"* istiyor, yani paket **gerekli**, ama takip tablosunda adı geçmiyordu. Majör atlama **yok** (ilk kurulum). `peerDependencies` **boş**. |
| `recharts` | 3.10.1 | **Faz 29** | 2 → 3 majör atlaması, notlar okunmadı. İlk kullanım maç sonrası analiz. |
| `postgres` (Docker) | **18** | ~~Faz 3~~ ✅ **3.0'da BUMP EDİLDİ (16 → 18)** | Sonuç aşağıda. Sonraki majör değerlendirmesi Faz 50 (dağıtım). |
| `redis` (Docker) | 7 | **Faz 16** | 8 mevcut (8.8.2). `ioredis`/`bullmq` majör kararlarıyla (BORÇ-001, BORÇ-002) aynı fazda birlikte değerlendirilir. |
| `typescript` | ~6.0.3 | **TS 7.1 çıkınca** | ADR-0003. 7.0'da programatik derleyici API'si yok → `typescript-eslint` ve `nest build` çalışmıyor. 7.1 çıkınca üç maddelik kontrol listesi işletilir. |
| `@sentry/*` 10.71.0 | — | **sonraki faz** | 2.0'da alınmadı (1 günlük). **2.5a'da yeniden bakıldı: hâlâ 1 günlük** — 10.71.0 2026-08-24, karar günü 2026-08-25, yani takvim aynı gün. Yaş değişmediği için karar da değişmedi. Sonuç aşağıda. |
| `jsdom` | 30.0.1 | ~~Faz 6~~ ✅ **6.0'da yeniden değerlendirildi — KARAR KORUNDU** | 2.0b'de kuruldu, `happy-dom` yerine bilinçli seçildi. Sonuç aşağıda. |
| `@testing-library/react` | 16.3.2 | ~~Faz 6~~ ✅ **6.0'da ele alındı — `user-event` KURULACAK (6.4)** | Sonuç aşağıda. |

---

## Ele alınmış satırların sonucu

### `i18next` 26.4.1 · `react-i18next` 17.0.13 · `i18next-browser-languagedetector` 8.2.1 — Faz 5.0, 2026-09-02 · **KARAR VERİLDİ, KURULUM 5.3'TE**

**Emsal uygulandı:** BORÇ-001/002'nin notu *"gerekçe zamana bağlı — o fazda
yeniden türetilir, kopyalanmaz"* diyor. Faz 5 i18next için o fazın kendisi;
bu yüzden *"notlar okunmadı"* satırı bir karara çevrildi. **Neye bakıldığı
aşağıda adıyla yazılı** — *"sorun yok"* tek başına bir ölçüm değildir.

**Okunan kaynaklar:** `raw.githubusercontent.com/i18next/i18next/master/CHANGELOG.md`
(sürüm başlıkları **25.0.0** ve **26.0.0**) ·
`github.com/i18next/react-i18next/blob/master/CHANGELOG.md` (**16.0.0**, **17.0.0**) ·
`i18next.com/overview/typescript`.

**i18next 24 → 26, iki majörün kırıcı maddeleri:**

| Sürüm | Madde | Bizi etkiliyor mu |
|---|---|---|
| 25.0.0 | `changeLanguage` çağrı sırası düzeltildi; `getBestMatchFromCodes` artık aynı script'e düşüyor | **Hayır** — tek dil (`tr`), dil değiştirme yok (İngilizce v2'de) |
| 26.0.0 | `initImmediate` seçeneği **kaldırıldı** (`initAsync`'e eşleme silindi) | **Hayır** — yeni kurulum, eski seçenek hiç yazılmayacak |
| 26.0.0 | Eski monolitik `interpolation.format` fonksiyonu **kaldırıldı** | **Hayır** — biçimlendirme `Intl` üzerinden, `packages/shared/src/i18n/format.ts` (5.2) |
| 26.0.0 | `simplifyPluralSuffix` **kaldırıldı** | **Hayır** — kullanılmıyor |
| 26.0.0 | Konsol destek bildirimi ve `globalThis.__i18next_supportNoticeShown` **kaldırıldı** | **Hayır** |
| 26.0.0 | **TypeScript v4 desteği kaldırıldı; TS v5 artık opsiyonel peer** | **Hayır, LEHİMİZE** — peer aralığı ölçüldü: `^5 \|\| ^6 \|\| ^7`, bizim `~6.0.3` **içinde** |
| 26.0.0 | Node < v14 desteği düştü | **Hayır** — Node 24.19.0 |

**react-i18next 15 → 17:**

| Sürüm | Madde | Bizi etkiliyor mu |
|---|---|---|
| 16.0.0 | i18next bağımlılığı majör yükseltildi (issue 1865) | **Hayır** — zaten 26 kuruyoruz |
| 17.0.0 | `transKeepBasicHtmlNodesFor` artık HTML etiket adlarını **doğru koruyor**: eskiden `<strong>{{name}}</strong>` yanlışlıkla `<1>{{name}}</1>` diye serileşiyordu | **Hayır, ama SEBEBİ ÖNEMLİ** — geçiş notu *"otomatik üretilmiş `Trans` anahtarlarına dayanıyorsan çeviri dosyalarını güncellemen gerekir"* diyor; bizim **hiç çeviri dosyamız yok** (sıfırdan yazılıyor). Bu madde bir **var olan kurulumu** kırıyor, yeni kurulumu değil |
| 17.0.0 | **i18next ≥ 26.0.1 gerektiriyor** | **Hayır** — 26.4.1 kuruluyor; ayrıca peer olarak ölçüldü (`i18next: >=26.2.0`) |

**KARAR: üç paket de en güncel sürümde kurulur (26.4.1 / 17.0.13 / 8.2.1).**
İki majör atlamanın **tek bir kırıcı maddesi bile** bu projeye dokunmuyor ve
sebep yapısal: kırıcı maddelerin tamamı ya **kaldırılan eski seçenekler**
(hiç yazmadığımız) ya da **var olan çeviri dosyalarını** etkileyen davranış
düzeltmeleri (henüz hiç dosyamız yok). **Sıfırdan kurulum, majör atlamanın
maliyetini sıfırlıyor** — bu, kurulumu Faz 5'e ertelemenin ödülü.

⚠️ **Ölçülen peer'lar (`.npmrc` `strict-peer-dependencies=true`, yani bir KAPI):**

| Paket | `peerDependencies` | Bizdeki değer | |
|---|---|---|---|
| `i18next@26.4.1` | `typescript: ^5 \|\| ^6 \|\| ^7` | `~6.0.3` | ✅ |
| `react-i18next@17.0.13` | `react: >=16.8.0` · `i18next: >=26.2.0` · `typescript: ^5 \|\| ^6 \|\| ^7` | React 19.2 · 26.4.1 · `~6.0.3` | ✅ |
| `i18next-browser-languagedetector@8.2.1` | **boş** | — | ✅ |

⚠️ **DOĞRULAMA 5.3'E BIRAKILDI ve bu bir eksiklik değil bir sıra:** peer
uyumu **registry meta verisinden** okundu, `pnpm install` koşturulmadı (5.0'da
paket kurulmuyor). Gerçek kapı `pnpm install --frozen-lockfile`tır ve 5.3'te
ateşlenir. Buradaki tablo *"kurulmalı"* demiyor, *"engelleyen bir peer
görünmüyor"* diyor.

### ✅ 5.3'TE KURULDU — kapı ateşlendi ve geçti (2026-09-03)

`pnpm --filter @fms/web add i18next@26.4.1 react-i18next@17.0.13 i18next-browser-languagedetector@8.2.1`

| Ölçüm | Sonuç |
|---|---|
| `strict-peer-dependencies` kapısı | **Ötmedi** — peer uyarısı/hatası yok |
| Lockfile paket girdisi | **642 → 647** |
| Eklenen | **5**: `i18next@26.4.1` · `react-i18next@17.0.13` · `i18next-browser-languagedetector@8.2.1` · **`html-parse-stringify@4.0.1`** (geçişli — `Trans` bileşeninin HTML ayrıştırıcısı) · **`use-sync-external-store@1.6.0`** (geçişli — React abonelik shim'i) |
| Silinen | **0** |
| Üretim paketi etkisi | `321,49 → 373,22 kB` ham · gzip `104,48 → 120,67 kB` (**+16,19 kB**) — kontrol deneyiyle ölçüldü, çünkü modülün bugün tüketicisi yok |

⚠️ **Paket boyutu artışı Faz 6'nın `perf:budget` kapısının girdisidir** (G-01).
Bugün bir bütçe yok, o yüzden bu bir **ölçüm**, bir ihlal değil.

⚠️ **`nonExplicitSupportedLngs` DENENDİ VE SİLİNDİ.** Kurulum sırasında
eklenmişti; mutasyon onu yakalayamadı ve izole bir deney (dört kombinasyon)
i18next 26'nın `tr-TR → tr` indirgemesini **zaten** yaptığını gösterdi.
Hiçbir şey yapmayan bir ayar bırakılmadı — gerekçe `apps/web/src/app/i18n.ts`
dosya başında, ölçüm tablosuyla.

> Kural 3: bump edilen satır silinmez, sonucu buraya yazılır.

### Postgres sürücüsü: **`postgres@3.4.9` (postgres.js)** — Faz 3.2a, 2026-08-26 · `pg` ELENDİ

Karar 3.0'da bilinçli olarak ertelenmişti (`drizzle-kit generate` sürücüsüz
çalışıyor, seçmek 3.2'nin işine girmek olurdu — K12). 3.2a'da **ikisi de kuruldu
ve gerçek PostgreSQL 18.6'ya karşı ölçüldü.**

**Davranış — dört boyutta BİREBİR AYNI:**

| Ölçüm | `pg@8.23.0` | `postgres@3.4.9` |
|---|---|---|
| `9007199254740993::bigint` | `"9007199254740993"` (string) ✅ | `"9007199254740993"` (string) ✅ |
| `12345.67::numeric` | `"12345.67"` (string) ✅ | `"12345.67"` (string) ✅ |
| Çok ifadeli SQL | çalıştı | çalıştı (`unsafe()` ile) |
| İşlemsel DDL geri alınıyor mu | **EVET** | **EVET** |

`bigint`in dizge dönmesi bu proje için önemliydi: `spec/01` para alanlarını
(`balance`, `transferBudget`, `weeklyWage`) `bigint` tutuyor ve `Number`'a
düşürmek sessiz hassasiyet kaybı demekti. **İkisi de bu tuzağı taşımıyor.**

**Davranış eşit olunca karar ölçülen tek gerçek farka düştü — paket sayısı:**

| Sürücü | Kurulan paket |
|---|---|
| `pg` | **13** — `pg`, `pg-types`, `pg-int8`, `pg-protocol`, `pg-pool`, `pgpass`, `pg-connection-string`, `pg-cloudflare`, `postgres-array`, `postgres-bytea`, `postgres-date`, `postgres-interval`, `xtend` (+ ayrı `@types/pg`) |
| **`postgres`** | **1** — kendi tiplerini de taşıyor |

Sayım `node_modules/.pnpm` öncesi/sonrası karşılaştırılarak yapıldı, elle
sayılmadı. **ARM64 (K14):** ikisinde de derlenmiş `.node`, `binding.gyp` veya
kurulum betiği **yok** — `pg-native` `pg`nin bağımlılığı değil, ayrı ve opsiyonel
bir paket.

CLAUDE.md **§1.5** (public repo, sır ve tedarik zinciri yüzeyi) ile **§2.1**'in
*"lodash'in tamamı yasak, yalnızca gereken fonksiyon `lodash-es`'ten"* ilkesi aynı
yöne işaret etti.

> ⚠️ **Karşı argüman kaydedilir:** `pg` NestJS ekosisteminde çok daha yaygın ve
> `apps/api`'nin DI yaşam döngüsüne bağlanması daha konvansiyoneldir. Bu gerçek bir
> maliyet ama **ölçülebilir değil**; ölçülebilen fark 13:1'di.
>
> **Geri dönüş maliyeti bilinçli olarak düşük tutuldu:** koşucu `SqlExecutor`
> arayüzünü görüyor, sürücüyü değil. `pg`'ye dönmek tek bir dosyayı
> (`packages/db/src/migrate/postgres-executor.ts`) değiştirmek demek — koşucuya,
> testlere veya şemaya dokunulmaz. `jsdom` kararındaki asimetriden farkı bu:
> orada geri dönüş Faz 6'dan sonra pahalılaşıyordu, burada sabit kalıyor.
>
> **Yeniden değerlendirme koşulu:** `apps/api` veritabanına bağlandığında
> (Faz 12+). O gün bağlantı yaşam döngüsünün NestJS'e bağlanması sorun çıkarırsa
> bu satır yeniden açılır.

### `postgres` (Docker) 16 → **18** — Faz 3.0, 2026-08-26 · **BUMP EDİLDİ**

Ölçülen sürümler: **18.6** (`postgres --version` konteyner içinden) · 16.15.
Docker Hub'da bulunan majörler `docker manifest inspect` ile tek tek yoklandı:

| Etiket | Var mı | `linux/arm64/v8` |
|---|---|---|
| `postgres:14` … `postgres:18` | ✅ hepsi | ✅ hepsi |
| `postgres:19` | ❌ `no such manifest` | — |

**ARM64 (K14) doğrulandı:** `postgres:18` manifesti `amd64 · arm/v5 · arm/v7 ·
arm64/v8 · 386 · ppc64le · riscv64 · s390x` taşıyor.

**İKİ KIRICI DEĞİŞİKLİK ölçüldü — ikisi de sessiz değil, açık hata veriyor:**

**① Bağlama noktası değişti.** 18+ imajları veriyi majör sürüme özgü bir alt dizine
koyuyor. Eski volume'e karşı çalıştırıldığında konteyner **exit 1** ile durdu:

```
Error: in 18+, these Docker images are configured to store database data in a
       format which is compatible with "pg_ctlcluster" ...
       The suggested container configuration for 18+ is to place a single mount
       at /var/lib/postgresql
```

`docker-compose.yml` bağlaması `pgdata:/var/lib/postgresql/data` →
**`pgdata:/var/lib/postgresql`** yapıldı. Çalışan kurulumda doğrulandı:
`SHOW data_directory` → `/var/lib/postgresql/18/docker`.

**② Mevcut `pgdata` volume'ü kullanılamaz.** Volume `PG_VERSION=16` taşıyordu
(ölçüldü). Faz 3'te veri olmadığı için volume **silindi** — bu, "majör değişimi
şemadan önce bedava" ifadesinin somut mekaniği. Şema yazıldıktan sonra aynı adım
`pg_upgrade` veya dump/restore isterdi.

**Yığın yeniden kuruldu ve ÇALIŞTIRILDI (D5):** `docker compose up -d` →
`fms-postgres Up (healthy)`, `psql -c 'SELECT 1'` healthcheck'i geçiyor,
`version()` → PostgreSQL 18.6, `pg_trgm` 1.6 mevcut.

**18'in bu projeye özel kazandırdığı:** `builtin` locale sağlayıcısı (PG17+).
Ayrıntı aşağıdaki collation kaydında; özeti: PG16'da `initdb: error: unrecognized
locale provider: builtin`.

---

### Veritabanı collation'ı: `--locale=C` → **`builtin` / `C.UTF-8`** — Faz 3.0 · **DEĞİŞTİRİLDİ**

`docker-compose.yml` `--locale=C` ile `initdb` yapıyordu. Ölçüm, bunun Türkçe
metinde aramayı **sessizce bozduğunu** gösterdi. Tüm satırlar `postgres:18`
konteynerlerinde ölçüldü:

| initdb ayarı | `'BEŞİKTAŞ' ILIKE '%beşiktaş%'` | `lower('BEŞİKTAŞ')` | `lower('I')` | `datcollversion` |
|---|---|---|---|---|
| **`--locale=C`** (eski) | **`f`** ❌ | `beŞİktaŞ` ❌ | `i` | — |
| `--locale-provider=icu --icu-locale=und` (PG16) | `f` ❌ | `beşi̇ktaş` ❌ | `i` | — |
| `--locale=C.UTF-8` libc (PG16) | `t` ✅ | `beşiktaş` ✅ | `i` ✅ | **BOŞ** ⚠️ |
| **`--locale-provider=builtin --builtin-locale=C.UTF-8`** (PG18, **seçilen**) | `t` ✅ | `beşiktaş` ✅ | `i` ✅ | **`1`** ✅ |

**Neden `C` elendi:** hata yalnızca Türkçe harflerde çıkıyor, ASCII adlarda hiç
görünmüyor — yani "çalışıyor gibi duran" bir kapı. Faz 32 (50.000 oyuncu üzerinde
transfer araması) ve her kulüp/oyuncu adı araması bunun üstünde çalışacaktı.

**Neden veritabanı varsayılanı Türkçe DEĞİL:** `tr-TR`'de `lower('I')` → **`ı`**,
`upper('i')` → **`İ`** (ölçüldü). Bu kural veritabanı geneline konsaydı İngilizce
kulüp/oyuncu adlarına da uygulanırdı — "Inter" araması bozulurdu. Türkçe casing
bir **sunum** kuralıdır, veri katmanı kuralı değil.

**Neden libc `C.UTF-8` değil (PG16'nın da yapabildiği seçenek):** o satırda
`datcollversion` **boş** geliyor. Postgres o collation için sürüm izlemiyor, yani
bir glibc yükseltmesi indeksleri **uyarı vermeden** geçersizleştirebilir.
`builtin` sağlayıcıda `datcollversion=1` ve uygulama Postgres'in **kendi içinde**,
işletim sistemi yükseltmelerinden bağımsız. Bu, 16 → 18 kararının EOL tarihlerinden
**bağımsız** ikinci gerekçesi.

**Sıralama nasıl çözülüyor — iki dilli arayüz tek veritabanıyla:**
Varsayılan sıralama kod-noktası (Ç/Ü/İ/Ş, Z'den sonra) — sunum için yanlış, ama
**deterministik ve sürüm-bağımsız**. Doğru sıralama sorgu başına isteniyor:

```sql
ORDER BY name COLLATE "tr-TR-x-icu"   -- v1 Türkçe arayüz
ORDER BY name COLLATE "en-US-x-icu"   -- v2 İngilizce arayüz
```

Ölçüldü: veritabanı `C`/builtin olsa bile **871 ICU collation** kullanılabilir
durumda (`tr-TR-x-icu`, `en-US-x-icu` dahil). İkisi çoğu Türkçe ad için aynı
sonucu veriyor; ayrıştıkları yer i/ı ailesi:

```
tr-TR:  Ilgaz | Inter | Isparta | Işıklar | Ivan | İstanbul | İzmir
en-US:  Ilgaz | Inter | Işıklar | Isparta | İstanbul | Ivan | İzmir
```

**Büyük listelerde de çalışıyor (Faz 32 kısıtı):** `CREATE INDEX ... (name COLLATE
"tr-TR-x-icu")` kurulup `EXPLAIN` alındı → `Index Only Scan`. Yani `ORDER BY ...
LIMIT` veritabanı tarafında, indeks destekli.

> ⚠️ **Dürüstlük notu.** ICU collation'ları sürüm taşıyor (`tr-TR-x-icu` →
> `153.128.46`). Bir ICU kütüphane yükseltmesi **o collation'la kurulmuş indeksleri**
> geçersizleştirebilir ve Postgres uyarır. Kazanç, etki alanının daralması:
> veritabanı geneli yerine yalnızca bilinçli olarak ICU ile kurulmuş indeksler.

---

### `drizzle-orm` / `drizzle-kit` — Faz 3.0, 2026-08-26 · **KARAR KORUNDU, 0.45.2 / 0.31.10 KURULDU**

| Kontrol | Sonuç |
|---|---|
| `npm view drizzle-orm dist-tags` | `latest` = **0.45.2** · `rc` = `1.0.0-rc.4` · en yüksek yayın `1.0.0-rc.5-169397b` |
| `npm view drizzle-kit dist-tags` | `latest` = **0.31.10** · en yüksek yayın `1.0.0-rc.5-ab785fc` |
| 1.0 GA oldu mu | **HAYIR** — hâlâ RC, DEPENDENCY-WATCH'ın önceki kaydıyla aynı durum |
| Yayın tarihleri | `drizzle-orm@0.45.2` → 2026-03-27 · `drizzle-kit@0.31.10` → 2026-03-17. Karar günü **5 aylık**, olgun |
| Peer çakışması | **yok** — `drizzle-orm`un 28 peer'ının **tamamı** `peerDependenciesMeta`'da `optional: true` (mekanik olarak sayıldı), `strict-peer-dependencies=true` altında sorun çıkarmadı |

Sürümler **tam** yazıldı (`^` yok), `@sentry/*` desenindeki gerekçeyle: ikisi bir
**çift** olarak çalışıyor ve sessiz bir kayma "regresyon mu, benim kodum mu"
belirsizliğini doğurur. Proje 3 haftalık bir majörü bu yüzden almamıştı
(BORÇ-001/002); bir RC almak aynı ilkenin çok daha sert ihlali olurdu.

**⚠️ Ölçülen asıl bulgu — `drizzle-kit` `down` migration ÜRETMİYOR.** Ayrıntı ve
kanıt: `docs/spec/01-database.md` §3.0. Sonucu: elle yazılan bir `down` katmanı ve
kendi migration koşucumuz gerekiyor. 1.0 GA'da bu değişirse katman silinebilir —
yukarıdaki aktif takip satırı bunun için açıldı.

**⚠️ Taşıdığı borç:** `drizzle-kit@0.31.10`, kullanımdan kaldırılmış
`@esbuild-kit/esm-loader@2.6.5` + `@esbuild-kit/core-utils@3.3.2` çekiyor ve bunlar
**esbuild 0.18.20**'yi (Ağu 2023) ağaca sokuyor. Depoda artık üç esbuild sürümü var
(0.18.20 · 0.25.12 · 0.28.2). Güvenlik açığı bilinmiyor, ama eskiyen bir yüzey —
1.0 GA değerlendirmesinde bu da bakılır.

---

### `testcontainers` + `@testcontainers/postgresql` **12.1.0** — Faz 3.0, 2026-08-26 · **KURULDU** (G-03)

`packages/db` devDependency. `engines: node >= 22.22` ✅ (Node 24.19.0).

> ⚠️ **İKİNCİ PAKETE DE GİRDİ (Faz 3.8): `tools/data-cli`.** Seed'in gerçek
> veritabanı kanıtı o pakette durmak zorunda — testi `packages/db/integration/`
> altına koymak `arch:check`i kırıyor (`layer-direction` + `undeclared-dependency`,
> sonda dosyasıyla ölçüldü). **Sürüm birebir aynı pin** (`12.1.0`), ama artık
> **iki yerde**: yükseltme ikisini birden güncellemek zorunda, yoksa iki farklı
> testcontainers sürümü aynı repoda koşar ve fark **sessiz** olur.
> Aynı uyarı `drizzle-orm@0.45.2` için de geçerli — `tools/data-cli`ye
> devDependency olarak girdi (`seed-sql.test.ts` `getTableColumns()` metadatasını
> okuyor). ⚠️ Bu iki paket `arch:check` ⑥ `undeclared-dependency`nin **kapsamı
> dışında**: kural yalnızca `@fms/*` belirteçlerini denetliyor (KOD TUZAKLARI ④),
> yani bildirilmemiş bir üçüncü taraf paketi bu kapıdan **görünmez**.

**ARM64 (K14) — iddia değil, ölçüm.** Kurulum 135 yeni paket getirdi
(`node_modules/.pnpm` öncesi/sonrası karşılaştırılarak sayıldı, elle sayılmadı):

| Kontrol | Sonuç |
|---|---|
| Yeni paketlerde derlenmiş `.node` ikilisi | **YOK** ✅ |
| `binding.gyp` taşıyan paket | **2** — `cpu-features@0.0.10`, `ssh2@1.17.0` |
| Kurulum betiği olan paket | **3** — `cpu-features` (`node-gyp rebuild`), `ssh2` (`node install.js`), `protobufjs` (saf JS `postinstall`) |
| Karar | Üçü de **`allowBuilds: false`** → hiçbiri derlenmiyor |
| `cpu-features` zorunlu mu | **HAYIR** — `ssh2.optionalDependencies` içinde (ölçüldü); ssh2 onsuz saf JS kriptoya düşüyor |
| **Çalışıyor mu (D5)** | ✅ **EVET** — `PostgreSqlContainer('postgres:18')` gerçekten başlatıldı: **5.592 ms**, rastgele port (32769), temiz `stop()` |

`cpu-features`in betiği `node-gyp rebuild` çalıştırıyor, yani gerçek bir C++
derlemesi. Üretim Oracle Ampere A1 (aarch64) ve CI arm64 imajı üretiyor; orada
derleyici zinciri isteyen bir bağımlılık kurulumu kırılgan yapardı. **Derlenecek bir
şey olmayınca ARM'da kırılacak bir şey de yok.**

> ⚠️ **5,6 sn/konteyner rakamı bir plan kısıtıdır.** Entegrasyon testleri varsayılan
> `pnpm test`'e konulamaz: birkaç dosya bile kapı koşusunu saniyelerden dakikalara
> çıkarır. Ayrı komut olarak kurulacak (3.2) **ve faz kapanış listesine yazılacak** —
> yazılmazsa hiç koşulmaz (G-01'in birebir aynı hatası).

### `pnpm` 11.22.0 → **11.23.0** — Faz 2.0, 2026-08-25 · **BUMP EDİLDİ**

Rutin minor. `packageManager` alanı güncellendi, `corepack enable` ile 11.23.0
etkinleştirildi.

| Kontrol | Sonuç |
|---|---|
| `npm view pnpm version` | `11.23.0` — en yeni |
| `pnpm install` sonrası `git diff pnpm-lock.yaml` | **boş** — kilit baytı bayt aynı, `lockfileVersion: '9.0'` değişmedi |
| Sürüm kataloğu (`catalogs.default`) | değişmedi |
| Kapılar (11.23.0 altında) | `typecheck` ✅ · `lint` ✅ · `format:check` ✅ · `arch:check` ✅ · `build` ✅ 8/8 · `test` ✅ 76/76 |
| CI | **değişiklik gerekmedi** — `.github/workflows/ci.yml` bare `corepack enable` kullanıyor, sürümü `packageManager` alanından okuyor |

Bump gerekçesi ADR-0004 ile doğrudan ilgili: 11.23.0 "Windows stale PowerShell
shims" düzeltmesini içeriyor ve geliştirme makinesi Windows + pwsh 7.

### `pino` 10.3.1 — Faz 2.0, 2026-08-25 · **KARAR KORUNDU** (kurulum 2.2'de)

| Kontrol | Sonuç |
|---|---|
| `npm view pino version` | `10.3.1` — 1.0'da kaydedilen sürüm hâlâ en yeni |
| Yayın tarihleri | `10.0.0` → 2025-10-03 · `10.3.1` → 2026-02-09. Karar anında **6,5 aylık**, majör hattı **~11 aylık** — olgun. |
| `browser` alanı | `"./browser.js"` — mevcut. Karar 1 gereği pino yalnızca `@fms/shared/server` altında kullanılacak, yani bu alan **plan değil emniyet ağı**. |
| Node uyumu | pino 10.3.1'de `engines` alanı **yok** → mekanik doğrulama yapılamadı. |

> ⚠️ **Dürüstlük notu.** "v10'un tek kırıcı değişikliği Node 18 desteğinin
> düşmesi" iddiası bu satırda **mekanik olarak doğrulanmadı** — paketin
> `engines` alanı olmadığı için registry'den teyit edilemiyor. Node 24'te
> olduğumuz için pratik risk yok, ama iddia "okundu ve doğrulandı" değil
> "okundu, çürütecek kanıt bulunamadı" seviyesindedir. `pino` 2.2'de gerçekten
> kurulup çalıştırıldığında bu satır kapanır.
>
> ✅ **KAPANDI (Faz 2.2b, 2026-08-25).** `pino@10.3.1` ve `pino-pretty@13.1.3`
> kuruldu ve **gerçekten çalıştırıldı** — `apps/api` iki biçimde de doğrulandı:
>
> ```
> JSON:   {"level":30,...,"name":"api","port":3001,"apiPrefix":"/fms/api","msg":"API hazır"}
> pretty: [16:07:34.064] INFO (api/28364): API hazır
>             port: 3001
> ```
>
> Node 24.19.0'da hiçbir uyumsuzluk çıkmadı. Peer çakışması yok
> (`strict-peer-dependencies=true` altında kurulum temiz).
> **Tarayıcı paketine sızmadı:** soğuk derleme sonrası `pino`, `async_hooks`,
> `thread-stream` → **0 eşleşme**, paket boyutu 2.2a tabanıyla **bayt bayt aynı**
> (229.320). pino'nun `browser` alanı bu yüzden hiç devreye girmedi — tarayıcı
> tarafı kendi `console` uygulamasını kullanıyor.

### `@sentry/react` — Faz 2.5b, 2026-08-25 · **10.70.0 KURULDU**

Kurulan: `@sentry/react@10.70.0` (`apps/web`, **tam sürüm — `^` yok**).
`@sentry/node` ile **aynı** sürüm: ayrışsalardı `@sentry/core`'un iki kopyası
gelirdi.

**Paket maliyeti ÖLÇÜLDÜ** (soğuk derleme, ham bayt):

| Ölçüm | Bayt |
|---|---|
| Taban (2.3b sonu) | 232.413 |
| `@sentry/react` **kullanılıyorken** | **319.091** |
| Artış | **+86.678 (%37,3)** |
| Kontrol: import var, **kullanılmıyor** | 232.754 (+341) |

Kontrol deneyi ağaç sarsmanın çalıştığını gösteriyor: artışın **86.337 baytı**
gerçek kullanıma ait. Eşiğin (%40) altında kaldığı için lazy loading veya dar
entegrasyon seti **değerlendirilmedi** — spekülatif optimizasyon yapılmadı.

> ⚠️ **`sendDefaultPii` KULLANIMDAN KALDIRILDI (v10), v11'DE SİLİNECEK.**
> Ölçüldü: `sendDefaultPii: false` ile seçeneği **hiç vermemek birebir aynı**
> ve ikisi de "hiçbir şey toplama" DEMİYOR — `cookies`, `httpHeaders`,
> `urlQueryParams` toplanıyor (yalnızca IP'yle ilgili birkaç anahtar eleniyor).
> Yerine açık `dataCollection` politikası kondu (Karar 17,
> `packages/shared/src/telemetry-policy.ts`). **v11 yükseltmesinde bu satır
> tekrar okunmalı:** politika açıkça yazıldığı için geçiş güvenli, ama
> `DataCollection` tipinin şekli değişirse derleme kırılır (istenen davranış).

### `@sentry/node` — Faz 2.5a, 2026-08-25 · **10.70.0 KURULDU**

Kurulan: `@sentry/node@10.70.0` (`apps/api`, **tam sürüm — `^` yok**).

**Sürüm kararı yeniden bakıldı ve DEĞİŞMEDİ.** En yeni kararlı sürüm hâlâ
10.71.0 (2026-08-24); karar günü 2026-08-25, yani **takvim aynı gün** ve sürüm
hâlâ **1 günlük**. 2.0'daki gerekçe olduğu gibi geçerli. 10.71.0 takip satırı
yukarıda duruyor; bir sonraki fazda yaşı gerçekten değişmiş olacak.

**OTel ağırlığı ÖLÇÜLDÜ** (2.0'da "yeniden ölç" notu bırakılmıştı):

| Ölçüm | Sentry öncesi | Sentry ile | Fark |
|---|---|---|---|
| İmaj (`docker images`) | 361 MB | **423 MB** | +62 MB (%17) |
| İmaj içi `node_modules` | 29 MB | **81 MB** | +52 MB |

En büyük kalemler: `@sentry/core` 12 MB · `@sentry/node` 7 MB ·
`@opentelemetry/semantic-conventions` 7 MB. Doğrudan bağımlılık **9**, bunların
**4'ü** OpenTelemetry.

**Kabul edilebilir bulundu:** Oracle disk sınırı 200 GB (`spec/10` §13.5) ve bu
bir defalık imaj maliyeti; CI çekme/gönderme süresine etkisi ölçülebilir ama
engelleyici değil.

> ⚠️ `docker image inspect .Size` **başka bir şey ölçüyor** (79 → 86 MB) ve iki
> ölçü karıştırılmamalı. Günlük #26'nın (gzip: Vite 73,77 kB vs Node 71,24 kB)
> aynı dersi, farklı araçla: **ölçüm kaynağı değişmişse rakam
> karşılaştırılamaz.** Yukarıdaki tabloda her satır tek bir kaynaktan.

### `@sentry/node`, `@sentry/react` — Faz 2.0, 2026-08-25 · **10.70.0'a SABİTLENDİ** (kurulum 2.5'te)

Sıfırdan kurulum olduğu için v9 → v10 göç kılavuzu bizi ilgilendirmiyor.

| Kontrol | Sonuç |
|---|---|
| En yeni sürüm | **10.71.0** (2026-08-24) — karar anında **1 günlük** |
| Seçilen sürüm | **10.70.0** (2026-08-10) — 15 günlük |
| `@sentry/node` engines | `node >=18` ✅ (Node 24.19.0) |
| `@sentry/react` peer | `react ^16.14.0 \|\| 17.x \|\| 18.x \|\| 19.x` ✅ (`react ^19.2.8`) |
| Peer çakışması | yok — `strict-peer-dependencies=true` altında sorun beklenmiyor |

**Neden 10.71.0 değil:** bu proje BORÇ-001/002'de 3 haftalık bir majörü
"regresyon mu, benim kodum mu" belirsizliğini önlemek için almadı. 1 günlük bir
minor'ü almak aynı ilkenin daha sert ihlali olurdu. 10.71.0 ayrı bir takip
satırı olarak yukarıya eklendi; 2.5'te yaşına yeniden bakılır.

**Kararlar (Faz 2 planından, uygulanacak):** üretimde `tracesSampleRate: 0`
(1–5 kullanıcı için performans izleme kotaya değmez), `sampleRate: 1.0`,
`sendDefaultPii` kapalı (KVKK açısından istenen varsayılan), `beforeSend` ile
beklenen `ValidationError`/`DomainError` gönderilmez. Kaynak haritası yükleme
adımı Faz 50'ye ertelendi (Karar 7).

### DOM test ortamı — Faz 2.0b, 2026-08-25 · **`jsdom` SEÇİLDİ** (`happy-dom` değil)

Kurulan: `jsdom@30.0.1` (kök devDependency, `vitest`'in yanında) ·
`@testing-library/react@16.3.2` + `@testing-library/dom@10.4.1` (`apps/web`).

> ⚠️ Bu karar, aynı oturumda benim verdiğim **önceki öneriyi tersine çeviriyor**.
> 2.0 raporunda "önerim `happy-dom`" yazmıştım; gerekçe hız ve hafiflikti.
> Analiz aşamasında bakınca asıl kısıt hız değil **uyumluluk** çıktı.

**Neden `jsdom`:**

1. **Asıl tüketici Faz 6.** Bu ortamın en ağır kullanıcısı tasarım sistemi olacak:
   shadcn/ui → Radix, yani odak yönetimi, `hasPointerCapture`, `scrollIntoView`,
   `ResizeObserver`, `DOMRect`. İki ortam da bunların bir kısmı için doldurma
   (polyfill) ister; farkı, `jsdom`'un boşlukları **belgeli ve bilinen çözümü olan**
   boşluklar olması. `happy-dom`'un farkları daha az haritalanmış ve "bu benim
   bileşenim mi, ortam mı?" sorusuna çıkıyor — bu proje BORÇ-001/002'yi tam olarak
   o soruyu doğurmamak için açtı.
2. **RTL `jsdom`'a karşı geliştiriliyor.** Test kütüphanesi ile ortamın aynı
   varsayımları paylaşması, hata ayıklarken tek değişkeni azaltıyor.
3. **Hız burada bağlayıcı kısıt değil.** Bugün 86 test var, Faz 50'de birkaç bin
   olacak. `jsdom`'un yavaşlığı saniyelerle ölçülür; uyumsuzluk saatlerle.
4. Node uyumu doğrulandı: `engines: node ^22.22.2 || ^24.15.0 || >=26.0.0` —
   **Node 24.19.0 aralıkta** ✅. (`happy-dom`: `>=20.0.0`.)

**Geri dönüş maliyeti — bugün ucuz, sonra pahalı:**

Bugün `happy-dom`'a geçmek `vitest.config.ts`'te **proje başına bir satır** ve bir
bağımlılık takası. Testlerin kendisi ortamdan bağımsız (hepsi RTL üzerinden), yani
dokunulmaz. Maliyet Faz 6'dan sonra artar: o gün testler ortama özgü doldurmalara
dayanmaya başlar ve takas o doldurmaların yeniden yazılmasını ister.

Asimetri kararı belirledi: **hız için sonradan `happy-dom`'a geçmek kolay** (canı
sıkılan bir gün yapılır), **uyumluluk için sonradan `jsdom`'a geçmek** ise tam da
Faz 6'nın ortasında, bir bileşen çalışmazken yapılmak zorunda kalınır. Zor yönü
şimdi seçmek ucuz.

**ARM64 (K14) — iddia değil, ölçüm:**

| Kontrol | Sonuç |
|---|---|
| `canvas` (jsdom'un **opsiyonel** native peer'ı) kuruldu mu | **Hayır** ✅ — `peerDependenciesMeta.canvas.optional: true`, `strict-peer-dependencies=true` altında da sorun çıkarmadı |
| Yeni gelen 56 paketin içinde `.node` ikilisi | **Yok** ✅ (depodaki tek `.node` dosyaları Faz 1'den kalma `@rolldown/binding-*` ve `lightningcss-*`, platforma göre çözülen optionalDependencies) |
| `binding.gyp` / node-gyp izi | **Yok** ✅ |
| `install`/`postinstall` betiği | **Yok** ✅ — yalnızca dört `prepare` betiği var (`jsdom`, `undici`, `whatwg-url`×2) ve `prepare` registry'den kurulan bağımlılıklar için **çalışmaz** |
| CI arm64 | ✅ yeşil — aşağıdaki koşu |

`jsdom@30` HTTP için `undici@8` kullanıyor (`ws` değil), yani `bufferutil` /
`utf-8-validate` opsiyonel native ikilileri hiç gündeme gelmiyor.

**Peer doğrulaması** (`strict-peer-dependencies=true` kurulum anında ısırır):

| Peer | İstenen | Bizde | Sonuç |
|---|---|---|---|
| `react` | `^18 \|\| ^19` | `^19.2.8` | ✅ |
| `react-dom` | `^18 \|\| ^19` | `^19.2.8` | ✅ |
| `@types/react` | `^18 \|\| ^19` (opsiyonel) | `^19.2.18` | ✅ |
| `@types/react-dom` | `^18 \|\| ^19` (opsiyonel) | `^19.2.4` | ✅ |
| `@testing-library/dom` | `^10.0.0` (**zorunlu**) | `10.4.1` — açıkça kuruldu | ✅ |

`@testing-library/jest-dom` ve `user-event` **bilerek kurulmadı**: bugün ihtiyaç
yok (RTL sorguları bulamayınca zaten fırlatıyor) ve her ek paket `types` dizisine
bağlanma yükü getiriyor. Faz 6'da etkileşim testleri gelince `user-event` yeniden
değerlendirilir.

### `jsdom` 30.0.1 ↔ `happy-dom` · `@testing-library/user-event` — Faz 6.0, 2026-09-04 · **KARAR KORUNDU + `user-event` KURULACAK**

**2.0b'nin gerekçesi ölçümle sınandı, hatırlanmadı.** O gün yazılan cümle şuydu:
*"`jsdom`'un boşlukları **belgeli ve bilinen çözümü olan** boşluklar; `happy-dom`'un
farkları daha az haritalanmış."* 6.0 bu iddiayı bu ortamda test etti — bir sonda
(jsdom **30.0.1**, Node **24.19.0**, win32/amd64) yedi yeteneği tek tek ölçtü:

| Yetenek | Sonuç | Radix için anlamı |
|---|---|---|
| `window.matchMedia` | **undefined** | medya sorgusu değerlendirilemiyor |
| `getComputedStyle().color`, değer `var(--x)` | **`"var(--attr-good)"`** — çözülmüyor | hesaplanmış renk yok |
| `getPropertyValue('--attr-good')` | `#5FA84C` | ham bildirim okunabiliyor |
| `getBoundingClientRect()` | **0×0** · `offsetWidth` **0** | düzen motoru yok |
| `ResizeObserver` / `IntersectionObserver` | **undefined** | doldurma gerekli |
| `scrollIntoView` / `hasPointerCapture` | **undefined** | **2.0b'nin adıyla saydığı iki boşluk — aynen çıktı** |
| `requestAnimationFrame` | `function` | ✅ |

**Karar: `jsdom` korunur.** Gerekçe 2.0b'nin asimetrisinin **ölçülmüş** hâli:
boşluklar artık *"bilinen"* değil **sayılmış** — beşi adıyla listede ve her biri
kendi doldurmasını istiyor. `happy-dom@20.14.0`'ın aynı beş boşlukta ne yaptığı
**ÖLÇÜLMEDİ** (kurulu değil, ve 6.0 paket kurmuyor). Ölçülmüş beş boşluğu,
ölçülmemiş bir kümeyle takas etmek — üstelik **fazın ortasında**, bir bileşen
çalışmazken — 2.0b'nin tam olarak kaçındığı şey. ⚠️ **Ve doldurmalar bir borç
üretir:** her doldurma bir davranışı **sahteliyor**; 6.8'de hangi doldurmanın
**neyi** sahtelediği adıyla yazılır, yoksa geçen bir test tarayıcıda geçeceğini
göstermez (D5).

**`@testing-library/user-event@14.6.7` — KURULACAK (6.4, ilk etkileşimli bileşenle).**
2.0b onu *"bugün ihtiyaç yok"* diye bilerek kurmamıştı; ihtiyaç **bu fazda doğdu**:
kabul kriteri 6 *"tüm etkileşimli bileşenler sadece klavyeyle kullanılabiliyor"*
diyor ve `fireEvent` tab sırasını, tuş dizisini, odak zincirini modelleyemiyor.
⚠️ **Geçişli olarak gelse bile açıkça beyan edilir:** `storybook@10.6.0` onu
`^14.6.3` ile getiriyor, ama `arch:check`in `undeclared-dependency` kuralı doğrudan
import edilen her paketin `package.json`da durmasını istiyor.

ℹ️ `@testing-library/react` **16.3.3** çıkmış (bizde **16.3.2**, yama farkı).
6.3'ün kurulum turunda birlikte bump edilir; ayrı bir iş değil.

### `nestjs-pino` 4.6.1 — Faz 2.0, 2026-08-25 · **PEER'LARI DOĞRULANDI** (kurulum 2.2'de)

`strict-peer-dependencies=true` olduğu için uyumsuzluk kurulum anında ısırır;
dördü de önceden doğrulandı.

| Peer | İstenen | Bizde | Sonuç |
|---|---|---|---|
| `@nestjs/common` | `^8 \|\| ^9 \|\| ^10 \|\| ^11` | `^11.2.1` | ✅ |
| `pino` | `^7.5 \|\| ^8 \|\| ^9 \|\| ^10` | `10.3.1` | ✅ |
| `pino-http` | `^6.4 \|\| ^7 \|\| ^8 \|\| ^9 \|\| ^10 \|\| ^11` | `11.0.0` (en yeni) | ✅ |
| `rxjs` | `^7.1.0` | `^7.8.2` | ✅ |

---

## Kural

Bir sürümü değiştirmeden önce:

1. Bu tabloya bak — o paket bir faza bağlanmış mı?
2. Bağlanmışsa, o faza gelmeden bump etme. Erteleme maliyeti bir minor bump;
   yanlış zamanda bump etmenin maliyeti "regresyon mu, benim kodum mu" belirsizliği.
3. Bump edildiğinde satır silinmez, **sonucu yazılır**.
4. `CLAUDE.md` §2.1 güncellenir ve gerekirse `PROJECT_MEMORY.md` SAPMA kütüğüne kayıt açılır.
