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
| `drizzle-orm` / `drizzle-kit` | 0.45.2 / 0.31.10 | **Faz 3** | 1.0 hattı hâlâ RC (`1.0.0-rc.5`). Faz 3'te GA olduysa değerlendirilir. |
| `resend` | 6.22.0 | **Faz 13** | Majör atlama, notlar okunmadı. İlk kullanım e-posta doğrulama. |
| `ioredis` | 5.11.1 | **Faz 16** | **BORÇ-001** — 6.0.0 mevcut ama kurulum anında 3 haftalıktı. |
| `bullmq` | 5.81.3 | **Faz 16** | **BORÇ-002** — 6.2.0 mevcut; v6 `ioredis`'i peer'a taşıdı, `pg`/`redis` peer'ları ekledi (kuyruk yapılandırmasını değiştiren mimari değişiklik). |
| `@tanstack/react-table` | 9.1.2 | **Faz 18** | Taze majör (9.0 → 4 Ağu 2026). v8 Nis 2025'ten beri güncellenmiyor, bu yüzden v9'da başlandı; notlar tablo motoru yazılırken okunacak. |
| `i18next` / `react-i18next` | 26.4.0 / 17.0.12 | **Faz 5** | İki majör atlama (24→26, 15→17), notlar okunmadı. |
| `recharts` | 3.10.1 | **Faz 29** | 2 → 3 majör atlaması, notlar okunmadı. İlk kullanım maç sonrası analiz. |
| `postgres` (Docker) | 16 | **Faz 3** | 18 mevcut (18.6, Ağu 2026). 16 bakımda ve **EOL Kas 2028**; 18'in EOL'ü Kas 2030. Şema Faz 3'te yazılıyor — majör değişimi ondan sonra dump/restore ister, öncesinde bedava. |
| `redis` (Docker) | 7 | **Faz 16** | 8 mevcut (8.8.2). `ioredis`/`bullmq` majör kararlarıyla (BORÇ-001, BORÇ-002) aynı fazda birlikte değerlendirilir. |
| `typescript` | ~6.0.3 | **TS 7.1 çıkınca** | ADR-0003. 7.0'da programatik derleyici API'si yok → `typescript-eslint` ve `nest build` çalışmıyor. 7.1 çıkınca üç maddelik kontrol listesi işletilir. |
| `@sentry/*` 10.71.0 | — | **Faz 2.5** | 2.0'da **alınmadı**: 2026-08-24 yayınlandı, karar anında **1 günlük**. 2.5'te yaşı yeniden bakılır. |
| `jsdom` | 30.0.1 | **Faz 6** | 2.0b'de kuruldu. `happy-dom` yerine bilinçli seçildi; **Faz 6'da (Radix/shadcn, odak yönetimi) yeniden değerlendirilir**. Karar ve geri dönüş maliyeti aşağıda. |
| `@testing-library/react` | 16.3.2 | **Faz 6** | 2.0b'de kuruldu. Faz 6 yüzlerce bileşen testi getiriyor; o fazda `@testing-library/user-event` ihtiyacı da doğacak. |

---

## Ele alınmış satırların sonucu

> Kural 3: bump edilen satır silinmez, sonucu buraya yazılır.

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
