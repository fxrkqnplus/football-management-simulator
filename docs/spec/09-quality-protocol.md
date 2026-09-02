<!-- Bu dosya ana spesifikasyondan üretilmiştir. Kaynak: docs/MASTER-SPEC.md -->

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
  input: ErrorContext        // ⚠️ Faz 2.7'de daraltıldı — aşağıya bakınız (SAPMA-016)
  steps: Array<{ name: string; value: number | string; reason?: string }>
  output: T
  summary: string          // Türkçe, insan okunabilir tek cümle
  seed?: string
}
```

> ⚠️ **`input` DARALTILDI: `Record<string, unknown>` → `ErrorContext` (Faz 2.7, SAPMA-016).**
>
> `ErrorContext` = `Readonly<Record<string, string | number | boolean | null |
> readonly string[] | readonly number[]>>` — düz, JSON-güvenli, iç içe nesne yok.
>
> **Gerekçe 2.1'deki `AppError.context` daraltmasının birebir aynısı:** bu veri
> loglara ve Sentry'ye gidiyor. İç içe nesneye izin vermek "bütün varlığı ize koy"
> alışkanlığını mümkün kılar; dar tip, izi üreten tarafı **alan seçmeye** zorlar.
> Aynı redaksiyon hattına giden iki tipin biri gevşek kalırsa, gevşek olan
> kullanılır.
>
> **Elenen alternatif:** tipi geniş bırakıp düzleştirme sırasında iç içe değerleri
> `[NESTED]` ile temizlemek. Sızıntıyı yine engellerdi ama korumayı **derleme
> zamanından çalışma zamanına** taşırdı: geliştirici bütün nesneyi koyar,
> düzleştirici sessizce temizler, kimse yanlış yaptığını fark etmez.
>
> **`output` bilinçli olarak SERBEST kaldı.** O, hesaplamanın asıl sonucudur
> (bir transfer kararı, bir olay listesi) ve daraltmak `DebugTrace<T>`'yi kendi
> işinde işe yaramaz kılardı. Redaksiyon kaygısı yalnızca **loglanana** ait ve
> `output` loglanmıyor: log hattına tek köprü `traceToLogContext()` ve o
> `module` · `summary` · `input.*` · `step.*` · `seed` taşıyor. İkinci kilit
> tipte: `logger.info({ output }, …)` yazan biri olursa `LogValue` nesne kabul
> etmediği için **derleme kırılır**.

**⚠️ İZ NASIL LOGLANIR — düzleştirmeden loglanmaz.**
`redactContext()` **sığdır**, özyinelemez. İz olduğu gibi loglansaydı
`trace.input.password` redaksiyondan kaçardı. `traceToLogContext()` girdiyi ve
adımları `input.<anahtar>` / `step.<ad>` biçiminde **düzleştirir**; redaksiyonun
alt dize eşleşmesi böylece `input.password`'ü yakalar. Redaksiyonu köprü
yapmaz — logger yapar (§11.5: hiçbir kural iki yerde denetlenmez).

**⚠️ MOTOR LOGLAMAZ, İZ DÖNDÜRÜR.** `debugTrace` üreten hiçbir fonksiyon
`Logger` çağırmaz (K3 — log yazmak yan etkidir). Nesne döner; loglamayı çağıran
taraf yapar ve `correlationId` ilişkilendirmesini o kurar (§11.1).

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

### `assertInvariant` — kip, varsayılan ve kapsam (Faz 2.7)

`assertInvariant(condition, { code, message, context?, kind? })` bir değişmezi
denetler ve **`boolean` döner** (değişmez tuttu mu).

**Neden `asserts condition` imzası KULLANILMIYOR:** o imza "bu satırdan sonra
koşul kesin doğrudur" der. `report` kipinde fonksiyon fırlatmıyor, yani söz
yalan olurdu — üretimde koşul yanlışken derleyici tipi daraltır ve sonraki
satırlar var olmayan bir garantiye dayanır.

| Kip | Davranış | Nerede |
|---|---|---|
| `throw` (**varsayılan**) | Tipli `AppError` fırlatır | Motor, `apps/api`, `apps/worker`, testler, tarayıcı **geliştirme** derlemesi |
| `report` | Bildiriciyi çağırır, `false` döner, iş devam eder | Yalnızca tarayıcı **üretim** derlemesi |

**Varsayılan `throw` güvenli taraftır** ve yukarıdaki *"İhlal → tur geri
alınır"* şartıyla tutarlı. Kip yalnızca `configureAssertions()` ile,
uygulama önyüklemesinde değişir; modül ortamı **hiç okumaz** (`NODE_ENV`
koklanmaz — Faz 1 hata #10).

`configureAssertions` ve `report` bildiricisi **ayrılmaz bir çift** olarak,
ayrık birleşim (discriminated union) ile modellenir: bildiricisiz bir `report`
kipi **temsil edilemez**. Aksi hâlde her ihlalin sessizce kaybolduğu bir
yapılandırma mümkün olurdu.

**Fırlatılan sınıf `kind` ile seçilir, varsayılanı `EngineError`.** Sabit tek
bir sınıf kullanmak §11.5'teki *"bir sınıflandırma bağlamdan bağımsız
değildir"* kuralını ihlal ederdi: bir motor değişmezi `engine`'dir, ama
tarayıcıda sunucunun tutarsız bir başlık döndürmesi `dataProvider`'dır ve
ikisi exception filter'da farklı durum kodu, Sentry'de farklı eleme alır.
Eşleme `Record<ErrorKind, …>` olduğu için yeni bir `ErrorKind` eklenip
yazılmazsa **derleme kırılır**.

⚠️ **Motor `configureAssertions`'ı IMPORT EDEMEZ** (`arch:check` →
`ENGINE_FORBIDDEN_SHARED_EXPORTS`). Motorun gördüğü kip her zaman varsayılandır;
motor kendi değişmez kontrolünü gevşetemez.

### `measure` — performans sarmalayıcısı (Faz 2.7)

`measure({ name, budgetMs, onExceeded? }, fn)` eşzamanlı bir işi ölçer ve
`{ name, durationMs, budgetMs, exceeded, value }` döner. Bütçe aşılırsa
`onExceeded` çağrılır; **uyarıyı modül basmaz**, bildiriciyi çağıran taraf
`logger.warn`a bağlar (K8). `onExceeded` verilmese bile `exceeded` bayrağı her
zaman döner — ihlal sessizce kaybolamaz.

⚠️ **Eşzamansız iş REDDEDİLİR:** `fn` bir thenable döndürürse `ValidationError`
fırlatılır. Sessizce kabul edilseydi ölçülen şey promise'in **kurulma** süresi
olurdu ve kapı hiç ötmezdi. Eşzamansız ölçüm `pnpm perf:budget` ile gelecek
(Faz 6, G-01).

⚠️ **Motor `measure`'ı IMPORT EDEMEZ** (Karar 6). Ölçmek zaman okumaktır (K3);
motor kendini ölçmez, ölçüm motoru **dışarıdan** sarmalar.

## 11.4 Test Katmanları

| Katman | Araç | Kapsam | Ne test edilir |
|---|---|---|---|
| Birim | Vitest | ≥%70 (motor ≥%85) | Saf fonksiyonlar, formüller, kural motorları |
| Determinizm | Vitest | Motor tamamı | Aynı tohum → aynı çıktı (1.000 tekrar) |
| Snapshot | Vitest | Motor | Bilinen girdi → sabitlenmiş olay akışı |
| Denge | Özel runner | Maç motoru | 10.000 maç → 5.13'teki 17 metrik |
| Regresyon | Özel runner | Tüm sistem | 20 sezon → invariant + denge + çökme yok |
| Entegrasyon | Vitest + testcontainers | API + DB | Gerçek Postgres ile uçtan uca modül — `pnpm test:db` (Faz 3.2a'da kuruldu) |
| Uçtan uca | Playwright | Kritik akışlar | Kayıt → kariyer → transfer → maç → sezon |
| Görsel | Playwright | Ekranlar | Anlık görüntü karşılaştırma (mobil + masaüstü) |
| Erişilebilirlik | axe-core | Tüm ekranlar | 0 kritik ihlal |
| Yük | k6 | API | 20 eşzamanlı kullanıcı, tur atlama |

> **⚠️ Kapsam eşiklerinin geçerlilik şartı (Vitest 4).**
> Vitest 4'te `coverage.all` kaldırıldı. `coverage.include` açıkça tanımlanmazsa yalnızca
> çalıştırılan dosyalar rapora girer ve kapsam eşikleri anlamsızlaşır — hiç test edilmemiş bir
> dosya hesaba katılmadığı için %85 kapısı sessizce yalan söyler. **K10'un geçerliliği bu ayara
> bağlıdır.** Ayrıca `coverage.ignoreEmptyLines` kaldırıldı ve V8 sağlayıcısı AST tabanlı
> yeniden eşlemeye geçti; v3'ten gelen rakamlarla birebir karşılaştırma yapılmaz.
>
> **`include` yazmak yetmez — UZANTI LİSTESİ de tam olmalı (SAPMA-007, Faz 2.0).**
> Faz 1'de `include` doğru şekilde tanımlandı ama deseni yalnızca `*.ts` idi. Sonuç:
> `apps/web/src/App.tsx` ve `main.tsx` rapora **hiç girmedi** — rapor 13 dosya sayarken
> diskte 15 vardı ve eşik yine sessizce yalan söylüyordu. Yani bu tuzağın iki katmanı var:
> `include`'un **varlığı** ve `include`'un **kapsamı**. İkincisi daha sinsi, çünkü
> yapılandırma dosyasına bakan biri "include yazılmış, tamam" der.
> Desen `*/src/**/*.{ts,tsx,mts,cts}` biçiminde yazılır; `exclude` tarafındaki test deseni
> de aynı uzantı kümesini almalıdır (`**/*.test.{ts,tsx,mts,cts}`), yoksa `.test.tsx`
> dosyaları kendi kapsamlarını şişirir.
>
> **Doğrulama yöntemi:** kapsam raporundaki dosya sayısı, `include` deseninin diskte
> eşleştiği dosya sayısıyla karşılaştırılır. Eşit değilse desen eksiktir. Bu kontrol
> `coverage/coverage-summary.json` anahtarları sayılarak yapılır.
>
> ### ⚠️ Aynı repoda İKİ glob lehçesi var (SAPMA-009, Faz 2.0b)
>
> Yukarıdaki `{ts,tsx,mts,cts}` yazımı **Vitest, ESLint ve Prettier için doğrudur**;
> **TypeScript için DEĞİLDİR.** `tsconfig.json` `include`/`exclude` glob dili yalnızca
> `*`, `?` ve `**/` tanır — **süslü parantez genişletmesi yoktur.**
>
> Bu tuzağın maliyeti sessizliğidir: `tsconfig.build.json`'a
> `"src/**/*.test.{ts,tsx}"` yazıldığında hiçbir araç şikâyet etmez, desen
> **hiçbir dosyayla eşleşmez**, ve testler `dist/`e emit edilir. Ölçüldü (2.0b):
> yedi paketin `tsconfig.build.json`'ı bu şekilde değiştirildiğinde yedisinin de
> testleri `dist/`e sızdı; `pnpm build` sonrası `find */dist -name '*.test.*'` ile
> yakalandı.
>
> **Kural:** `tsconfig` dosyalarında uzantılar **tek tek** yazılır:
> ```json
> "exclude": ["dist", "node_modules",
>             "src/**/*.test.ts", "src/**/*.test.tsx",
>             "src/**/*.test.mts", "src/**/*.test.cts"]
> ```
>
> **Doğrulama yöntemi:** `pnpm build` sonrası `dist/` içinde `*.test.*` aranır;
> bulunursa desen eşleşmiyor demektir. Bu, Faz 1 hata #7'nin ("test öncesi `pnpm build`,
> bayat dist yeşil yalanı üretir") ikinci kez işe yaradığı yerdir.
>
> ### Uzantı listesi taşıyan yerlerin envanteri (Faz 2.1 taraması)
>
> Aynı körlük Faz 2.0/2.0b/2.1'de **altı ayrı yerde** çıktı. Yeni bir uzantı
> repoya girdiğinde (`.jsx`? `.vue`?) aşağıdaki listenin **tamamı** gözden
> geçirilir. Liste tarandı ve 2.1 itibarıyla tutarlı.
>
> | # | Yer | Ne için | Glob lehçesi |
> |---|---|---|---|
> | 1 | `vitest.config.ts` → `coverage.include` | Kapsam paydası | süslü parantez ✅ |
> | 2 | `vitest.config.ts` → `coverage.exclude` | Test dosyalarını paydadan çıkarma | süslü parantez ✅ |
> | 3 | `vitest.config.ts` → `projects[].test.include` | Test keşfi | süslü parantez ✅ |
> | 4 | `eslint.config.js` → tip-farkında blok `files` | Hangi dosyalar lint'lenir | ayrı girdiler |
> | 5 | `eslint.config.js` → `no-hardcoded-path` muafiyeti | Test dosyaları muaf | ayrı girdiler |
> | 6 | **7** × `tsconfig.build.json` → `exclude` | Testler `dist`'e girmesin | **parantez YOK** |
> | 7 | `tools/arch-check/index.mjs` → taranan uzantılar | Hangi dosyalar denetlenir | düz dizi |
> | 8 | `tools/arch-check/index.mjs` → `checkImportCasing` adayları | `.js→.ts`, `.mjs→.mts`, `.cjs→.cts` | düz dizi |
> | 10 | **7** × `tsconfig.build.json` → `exclude` (`.test-d.ts` satırı) | Tip-seviyesi kontrol deneyleri `dist`e girmesin — Faz 3.3 | **parantez YOK** |
> | 9 | `vitest.integration.config.ts` → **`projects[].test.include`** | Entegrasyon testi keşfi (`integration/**/*.itest.ts`) — **Faz 3.8'de tek kökten İKİ PROJEYE çıktı** (`db-integration`, `data-cli-integration`) | süslü parantez ✅ |
> | 12 | `tools/data-cli/tsconfig.json` → `include` + `tsconfig.build.json` → `exclude` | `integration/` tip denetimine **girer**, `dist/`e **girmez** — Faz 3.8'de `packages/db`nin biçimi kopyalandı | **parantez YOK** |
> | 11 | `packages/db/drizzle.config.ts` → `schema` | `drizzle-kit`in **çalıştırarak okuyacağı** şema dosyaları — Faz 3.5 | **extglob** (`!(...)`), negatif desen ÇALIŞMAZ |
>
> ### ⚠️ 11. SATIR — ENVANTERİN İLK "SESSİZ DEĞİL, GÜRÜLTÜLÜ" ÜYESİ (Faz 3.5)
>
> Desen `'./src/schema/*.ts'` idi ve test dosyalarını da topluyordu.
> `drizzle-kit generate` şema dosyalarını **CommonJS `require` ile çalıştırıyor**
> (`prepareFilenames` → `glob.sync`), yani `competition-rules.test.ts`in
> `vitest` import'u komutu kırıyordu:
> `Error: Vitest cannot be imported in a CommonJS module using require()`.
>
> **3.4'te görünmemesinin sebebi sıraydı:** migration, testler yazılmadan
> **önce** üretilmişti. Tuzak baştan beri vardı; yalnızca kimse aynı gün her
> ikisini de yapmamıştı.
>
> **Bu satır listenin geri kalanından iki yönden ayrılıyor:**
>
> | | Diğer on satır | 11. satır |
> |---|---|---|
> | Yanlışsa ne olur | **Sessiz** — kapı temiz der, dosya denetlenmez | **Gürültülü** — komut hiç çalışmaz |
> | Ne zaman anlaşılır | Belki hiç | İlk `generate` çağrısında |
>
> Gürültülü olması onu **daha az** tehlikeli yapmıyor, **farklı** yapıyor: hata
> yalnızca yeni bir migration üretilirken, yani seyrek olarak ortaya çıkıyor ve
> aradaki tüm koşularda desen "çalışıyor" görünüyor. Bir sonraki oturum deseni
> `*.ts`ye sadeleştirmeye kolayca kalkışabilir.
>
> **Ölçülmüş iki not:**
>
> - **Negatif desen İŞE YARAMIYOR.** `prepareFilenames` desenleri `reduce` ile
>   **birleştiriyor**; `'!./src/schema/*.test.ts'` hiçbir şeyle eşleşmediği için
>   sessizce **boş bir katkı** oluyor, dışlama olmuyor. Kaynaktan okundu, denenip
>   bırakılmadı. Çalışan yol **extglob**: `!(*.test|*.test-d)`.
> - **`*.test-d` de dışlanıyor**, bugün `src/schema/` altında öyle bir dosya
>   yokken. Sebebi bu sınıfın bilinen bedeli: tip-seviyesi kontrol deneyleri
>   gerçek `pgTable(...)` çağrıları içeriyor
>   (`packages/db/src/client/master-write-control.test-d.ts`), yani böyle bir
>   dosya o dizine düşseydi migration'a **hayalet bir tablo** girerdi.
>
> **Desen artık bir kapı, yalnızca bir yorum değil:**
> `packages/db/src/schema/drizzle-config.test.ts` deseni Node'un `fs.globSync`i
> ile açıp iki şeyi birden iddia ediyor — hiçbir test dosyası seçilmiyor **ve**
> test olmayan her `.ts` seçiliyor (eşitlik, alt küme değil: fazla dışlama bir
> tabloyu migration'dan sessizce düşürürdü). Ayrıca dizinde gerçekten dışlanacak
> bir dosya olduğu ayrı bir testle sabitleniyor, yoksa iddia bedavaya sağlanırdı.
> **Mutasyonla doğrulandı:** desen `*.ts`ye geri alındığında **4 testin 2'si**
> kırılıyor.
>
> **9. satır Faz 3.2a'da eklendi** ve bu, listenin kendi kuralının işlemesidir:
> yeni bir dosya deseni repoya girdiğinde envanter gözden geçirilir. `.itest.ts`
> yeni bir **uzantı** değil, ayrı bir **desen** — ama aynı körlüğü taşıyor.
> Ölçüldü: kök `vitest.config.ts`'in `db` projesi `src/**/*.test.{ts,tsx}`
> deseniyle `integration/**/*.itest.ts` dosyalarını **almıyor** (`pnpm test`
> 41 dosya sayıyor, entegrasyon dosyası içlerinde değil) — istenen davranış bu,
> ama iki desenin ayrıştığı yer artık **yazılı**.
>
> ### ⚠️ ENVANTER İŞE YARADI — `.test-d.ts` (Faz 3.3)
>
> Faz 3.3 repoya yeni bir dosya soneki soktu: **`.test-d.ts`** (tip seviyesi
> kontrol deneyleri — `@ts-expect-error` iddiaları taşıyan, çalışma zamanı
> davranışı olmayan dosyalar). Yukarıdaki listenin **tamamı** gözden geçirildi ve
> **iki yerde** desen eşleşmiyordu — `*.test.*` deseni `.test-d.ts` ile
> **eşleşmez**:
>
> | Yer | Sonuç | Ölçülen etki |
> |---|---|---|
> | 6 · `tsconfig.build.json` → `exclude` | ❌ eşleşmiyordu | **4 dosya `dist/`e sızdı** |
> | 2 · `vitest.config.ts` → `coverage.exclude` | ❌ eşleşmiyordu | Kapsam **%89,75 → %87,20** |
> | 3 · `vitest.config.ts` → `projects[].include` | ✅ doğru davranış | Vitest onları koşmuyor — istenen |
> | 1 · `coverage.include` | ✅ (dışlama ile dengeleniyor) | — |
>
> İkincisi **SAPMA-007'nin tersi yönü**: orada ürün kodu paydadan düşüyordu, burada
> ürün OLMAYAN kod paydaya giriyordu. İki yön de eşiği yalancı yapar.
>
> **Ders:** envanterin değeri, yeni bir sonek geldiğinde **hatırlanmasında**.
> Hatırlanmasaydı iki sessiz bozulma birden olurdu ve ikisi de "kapı temiz"
> derken sürerdi.
>
> #### Faz 3.3 kapanışında TAM denetim — iki bulgu daha
>
> İlk düzeltme yalnızca `packages/db`ye bakmıştı. Kapanışta envanterin **on
> satırı da** `.test-d.ts` karşısında tek tek ölçüldü ve iki şey daha çıktı:
>
> **① `tsconfig.build.json` satırı SEKİZ dosyayı temsil ediyor, biri değil.**
> `.test-d.ts` dışlaması yalnızca `packages/db`ye eklenmişti; **canlı olarak
> kullanılan diğer altı dosyada yoktu.** Bugün zararsızdı (öyle bir dosya başka
> pakette yok) ama yarın sessizdi. Altısına da eklendi.
> *(Faz 3.4'te sekizincisi — `apps/web`inki — silindi; sayı artık **yedi**.)*
>
> **② `apps/web/tsconfig.build.json` HİÇBİR YERDE KULLANILMIYORDU → Faz 3.4'te
> SİLİNDİ.** Ölçüldü: `apps/web`in `build` betiği `vite build` çağırıyor,
> `tsc -p tsconfig.build.json` değil; `typecheck` ise `tsconfig.json` kullanıyor.
> Repo genelinde tek atıf `eslint.config.js`'teki bir **yorumdu** ve o
> `packages/db`nin dosyasından bahsediyordu. Yani o dosyanın eksik dışlama
> listesi bir hata değil — **ölü yapılandırmaydı**. Üstelik `noEmit: true` taşıyan
> bir tsconfig'i genişletiyordu: kullanılsaydı bile hiçbir şey emit etmezdi.
>
> **Karar: silmek, "ölü" notu düşmek değil (Faz 3.4).** Not düşmek dosyayı
> envanterde **canlıymış gibi** tutar ve bu bölümün kendi uyardığı tuzağı sürdürür
> — envanteri denetleyen biri onu "düzeltir", hiçbir şey kazanmaz ve o dosyaya
> güvenmeye başlar. Var olmayan bir dosya bu hatayı **mümkün kılmaz**; bir yorum
> satırı yalnızca *daha az olası* kılar. Ölçüldü: silindikten sonra `pnpm build`,
> `pnpm typecheck` ve `pnpm lint` üçü de yeşil kaldı, `apps/web/dist` **bayt bayt
> aynı**. Aşağıdaki envanterin 6. ve 10. satırları **8 → 7**'ye indi.
>
> #### ÖNERİ — envanterin kendisi makineyle denetlenebilir (yazılmadı)
>
> Bu tur envanter **hatırlandı** ve yine de dört yerin ikisi bozuktu; kapanış
> denetiminde iki bulgu daha çıktı. Yani "listeye bak" disiplini yetmiyor.
>
> Önerilen mekanizma: **tek bir sonek kayıt defteri** (`.test.ts`, `.test-d.ts`,
> `.itest.ts` ve her birinin beklenen davranışı: *lint edilir mi · tip denetlenir
> mi · `dist`e girer mi · kapsam paydasına girer mi · Vitest koşar mı*), ve o
> defteri okuyup **her yeri gerçekten sınayan** bir meta-test. Sınama sentetik
> olmalı: geçici bir dizine her sonekten birer dosya yazılır, ilgili araç
> çalıştırılır, sonuç beklenen davranışla karşılaştırılır — `arch:check`
> kanaryasının yaptığı şeyin aynısı, farklı bir alanda.
>
> Böylece envanter bir **belge** olmaktan çıkıp bir **kapı** olur ve
> *"kapsamı yazılı olmayan bir kapı sessizce daralabilir"* uyarısı envanterin
> kendisi için de geçerli olmaktan çıkar.
>
> **Bu fazda YAZILMADI (K12):** Faz 3'ün kapsamı veritabanı şeması, araç
> altyapısı değil. Önerinin doğal yeri, üçüncü bir sonek eklendiği veya bu
> sınıftan üçüncü bir hata görüldüğü gündür — *"iki tesadüf desendir"*
> ölçütü (`docs/SPEC-COVERAGE-GAPS.md` başlığı) bu sınıf için henüz
> dolmadı: `.cts` (2.1), `{ts,tsx}` (2.0b) ve `.test-d.ts` (3.3) üç ayrı
> tetikleyici ama üçü de **aynı** tabloyla yakalandı.
>
> > ⚠️ **DÖRDÜNCÜ VERİ NOKTASI (Faz 3.5) — ve bu öncekilerden FARKLI.**
> > `drizzle.config.ts`in `schema` deseni (11. satır) bu tabloyla
> > **yakalanmadı**: tablo o satırı hiç içermiyordu, çünkü satır ancak
> > `drizzle-kit generate` kırıldığında keşfedildi. Yani ilk üç vaka
> > *"envanter hatırlandı ve işe yaradı"* örneğiydi; bu vaka
> > *"envanterde olmayan bir yer vardı"* örneği — önerilen meta-testin
> > çözemeyeceği bir sınıf, çünkü o da yalnızca **kayıtlı** sonekleri sınar.
> >
> > **Kayıt buraya düşüyor ama öneri yine YAZILMIYOR (K12).** Değişen şey
> > ölçüt: eksik olan bir *sonek* değil, bir *yer*. Envanterin
> > tamlığını sınayacak bir mekanizma, repoda desen taşıyan her yapılandırmayı
> > **bulmak** zorunda kalırdı ve o ayrı bir problem. Bugün yapılan şey, o yeri
> > envantere yazmak ve **kendi kapısını** kurmak
> > (`packages/db/src/schema/drizzle-config.test.ts`).
>
> **Ölçülmüş ders (2.1):** 7. satırdaki listede `.cts` eksikti ve sonuç sessizdi —
> ihlal içeren bir `.cts` dosyası konulduğunda `arch:check` **"temiz"** dedi
> (negatif testle kanıtlandı: eski listeyle `✓ temiz`, yeni listeyle
> `✖ 1 ihlal`). Bir denetleyicinin "temiz" çıktısı, dosyaya **bakıldığını**
> söylemez. Uzantı listesi olan her denetleyici için soru şudur:
> *"bu kural hangi dosyalar için geçerli?"* — *"bugün hangi uzantılar var?"* değil.
>
> ### ⚠️ DÜZELTME (Faz 3.8, SAPMA-027) — bu paragraf YANLIŞTI
>
> Burada şu yazıyordu ve **ölçümle çürütüldü**:
>
> > ~~**`tools/` kapsam eşiğine dahil DEĞİLDİR.** `coverage.include` yalnızca
> > `*/src/**` desenini alır; geliştirme araçları (`arch-check`,
> > `eslint-local-rules`) test edilir ama ürün kodu sayılmaz ve %70/%85
> > eşiklerine girmez.~~
>
> **Gerçek:** `vitest.config.ts` → `coverage.include` **üç** desen taşıyor ve
> üçüncüsü `tools` altındaki her paketin `src` ağacını topluyor. Yani
> `tools/<paket>/src/**` kapsam paydasına **dahildir** ve global %70 eşiğine
> girer.
>
> **İddia neden bugüne kadar sınanmadı:** `tools/` altında `src/` içeren tek
> paket `data-cli` idi ve tek dosyası `export {}` — kapsam raporunda **girdisi
> vardı** ama `0/0` olduğu için paydaya hiçbir şey katmıyordu. Bakacak bir şey
> bulamayan bir kapı "temiz" diyordu; **SAPMA-024'ün birebir kardeşi.**
>
> **Ayracın kendisi de yanlış öğrenilmişti.** `arch-check` ve
> `eslint-local-rules` kapsam dışında oldukları için değil — `src/` altında
> **olmadıkları** ve `.mjs` oldukları için dışarıdalar. Kural örneklerinden
> geriye okunmuştu; 3.6'da adı konan tuzağın tekrarı (*bir kuralın ayracı,
> örneklerinin tesadüfen paylaştığı bir özellikten okunursa yanlış öğrenilir*).
>
> **Ölçüm (Faz 3.8, seed `tools/data-cli/src/` altına ilk gerçek kodu koydu):**
>
> | Metrik | 3.7 sonu | 3.8 sonu | Paydaya eklenen |
> |---|---|---|---|
> | lines | 748 / 879 · %85,09 | 807 / 945 · **%85,39** | **+66** |
> | statements | 814 / 955 · %85,23 | 875 / 1023 · **%85,53** | **+68** |
> | functions | 213 / 283 · %75,26 | 259 / 330 · **%78,48** | **+47** |
> | branches | 404 / 460 · %87,82 | 412 / 468 · **%88,03** | **+8** |
>
> Payda dört metrikte de büyüdü — iddia doğru olsaydı **değişmemesi** gerekirdi.
>
> **Sonuç:** `tools/<paket>/src/**` altına yazılan kod ürün kodu gibi sayılır ve
> testsiz bırakılamaz. Kapsam dışında kalan tek şey `src/` dışındaki `.mjs`
> araçlarıdır.

> ### ⚠️ ENTEGRASYON TESTLERİ VARSAYILAN `pnpm test`'E GİRMEZ (Faz 3.2a)
>
> `testcontainers` ile tek bir Postgres konteyneri **5.592 ms**'de kalkıyor (Faz 3.0'da
> ölçüldü). Bu dosyalar kök `vitest.config.ts`'in `projects` listesine konsaydı, günde
> onlarca kez koşulan kapı zinciri saniyelerden dakikalara çıkardı ve pratikte
> atlanmaya başlanırdı.
>
> Ayrı yapılandırma: `vitest.integration.config.ts` · ayrı komut: **`pnpm test:db`** ·
> ayrı dosya deseni: `<paket>/integration/**/*.itest.ts`.
>
> ### ⚠️ ÇOK PROJELİ OLDU (Faz 3.8) — ve sebebi konfor değil, `arch:check`
>
> Yapılandırma 3.7'ye kadar tek bir `root: './packages/db'` taşıyordu. 3.8 seed'i
> `tools/data-cli`ye yazdı ve onun gerçek veritabanı kanıtı **o pakette durmak
> zorunda**: testi `packages/db/integration/` altına koymak katman kuralını
> kırıyor. **Ölçüldü, varsayılmadı** — bir sonda dosyası konup `pnpm arch:check`
> koşuldu ve **iki kural birden öttü**:
> `[layer-direction]` (*"`packages/db` → `@fms/data-cli`. İzin verilenler:
> @fms/shared"*) ve `[undeclared-dependency]`.
>
> **Kural: yeni bir paket entegrasyon testi yazdığında `projects` listesine satır
> eklenir.** Eklenmezse dosya hiçbir yerde koşmaz ve `pnpm test:db` yine "yeşil"
> der — bakacak bir şey bulamayan bir kapı (SAPMA-024 sınıfı). Yer yukarıdaki
> desen envanterinde **9. satır**.
>
> **Ölçülen bedel (Faz 3.8):** iki proje iki konteyner kaldırıyor ama duvar
> saati **artmadı** — tek projeli koşu 31,2 s, iki projeli koşu 27,1 s ve
> 28,8 s (projeler paralel koşuyor, ikinci konteynerin açılışı birincinin
> testleriyle örtüşüyor). Süre farkı ölçüm gürültüsü mertebesinde; "iki kat
> yavaşladı" beklentisi **çürütüldü**.
>
> **⚠️ AYRI KOMUT YAZMAK YETMEZ — komutun KOŞULDUĞU YER de yazılmalı.** Yukarıdaki
> §11.5 faz kapanış listesine ve CI'a ayrı iş olarak eklendi. Yazılmasaydı bu tam
> olarak `docs/SPEC-COVERAGE-GAPS.md` **G-01** olurdu: spec bir kapı tanımlıyor,
> hiçbir faz onu kurmuyor, kapı yıllarca sessizce koşulmuyor.
>
> **Kapsam raporu bilerek AYRI tutuldu.** Entegrasyon koşumu kapsam üretmiyor: iki
> ayrı koşumun kapsamını birleştirmek, birleştirme doğru yapılmazsa eşiği **şişirir**
> ve K10'un anlamı kaybolur. Sonucu şu: `packages/db`nin I/O sınırındaki dosyaları
> (`file-source.ts`, `postgres-executor.ts`) kapsam raporunda **%0** görünüyor —
> gerçekte entegrasyon testiyle kapsanıyorlar. Bu rakam bilinçli olarak
> düzeltilmiyor; kapsamın bu fazda bir kanıt olmadığı ROADMAP Faz 3'te yazılı.

**Fuzz testi:** Motora rastgele nitelik kombinasyonları (1-20 arası tüm uçlar dahil) verilir; `NaN`, `Infinity`, negatif skor, sonsuz döngü **asla** oluşmamalı.

## 11.5 Faz Kapanış Komutları

```bash
pnpm typecheck              # 0 hata
pnpm lint                   # 0 uyarı
pnpm test --coverage        # eşikleri geçmeli
pnpm build                  # hatasız
pnpm test:db                # Faz 3+   entegrasyon: gerçek Postgres (testcontainers)
pnpm test:e2e               # Faz 17+
pnpm validate:world         # Faz 11+
pnpm validate:save          # Faz 12+
pnpm sim:balance            # Faz 23+  (10.000 maç)
pnpm sim:seasons 20         # Faz 46+  (20 sezon regresyon)
pnpm i18n:check             # Faz 5+   (0 eksik anahtar)
pnpm perf:budget            # Faz 6+
pnpm arch:check             # katman bağımlılık ihlali
```

### ⚠️ POZİTİF TESTLER KÖR BİR KONTROLLE DE GEÇER — ölçülmüş oran (Faz 3.2b)

*"Pozitif test yetmez, negatif test şart"* bu belgede bir **ilke** olarak
yazılıydı. Faz 3.2b'de bir **oranı** oldu.

**Ölçüm.** Round-trip kanıtının karşılaştırıcısı (`compareSchemas`) mutasyona
uğratıldı — her zaman `identical: true` dönecek şekilde köreltildi. Sonuç:

| | |
|---|---|
| Kırılan entegrasyon testi | **1** |
| Etkilenmeyen | **15** |
| Toplam | 16 |

Kırılan tek test, bozuk bir `down`u yakalayan **negatif** testti. **On beş pozitif
test kör bir karşılaştırıcıyla da geçiyordu** — çünkü hepsi `identical: true`
bekliyor ve kör bir karşılaştırıcı bunu bedavaya sağlıyor.

### 📈 MUTASYON SERİSİ — on ölçüm, bir eğilim (Faz 3.2b → 4.3)

Aynı mutasyon her şema alt görevinde **yeniden** koşuldu. Tek rakam bir
gözlemdir; on rakam bir eğilim. ⚠️ Mutasyonun **tam metni** aşağıdaki kutuda —
tarifi değil (4.2'de ölçülerek bulundu):

| Alt görev | Şema | Kırılan / toplam `test:db` | Oran |
|---|---|---|---|
| **3.2b** | 1 tablo | **1 / 16** | %6,3 |
| **3.4** | 3 tablo | **5 / 50** | %10,0 |
| **3.5** | 8 tablo | **11 / 77** | %14,3 |
| **3.6** | 11 tablo | **16 / 103** | %15,5 |
| **3.7** | 11 tablo + 4 indeks | **19 / 126** | **%15,1** ⬇ |
| **3.8** | değişmedi (seed) | **19 / 146** | %13,0 ⬇ |
| **3.9** | değişmedi (ölçüm) | **19 / 160** | %11,9 ⬇ |
| **3.10** | değişmedi (belge) | **19 / 163** | %11,7 ⬇ |
| **4.2** | değişmedi (kural) | **19 / 163** | %11,7 → |
| **4.3** | **13 tablo** (`people` + `players`) | **20 / 178** | %11,2 ⬇ |
| **4.4** | 13 tablo + **3 ileri FK** (`0006`) | **25 / 190** | **%13,2** ⬆ |
| **4.5** | **15 tablo** + 57 nitelik sütunu + 2 CHECK (`0007`+`0008`) | **26 / 216** | %12,0 ⬇ |
| **4.6** | **18 tablo** + ilk **bileşik PK**'ler (`0009`) | **27 / 230** | %11,7 ⬇ |
| **4.7** | **22 tablo** + 3 CHECK (`0010`) | **27 / 241** | %11,2 ⬇ |
| **4.8** | 22 tablo + **2 indeks** (`0011`) | **29 / 251** | **%11,55** ⬆ |
| **4.9** | değişmedi (seed — 5.000 satır) | **29 / 277** | %10,47 ⬇ |
| **4.10** | değişmedi (ölçüm — plan + süre) | **29 / 301** | %9,63 ⬇ |
| **4.11** | değişmedi (refactor — BORÇ-008, üretilen SQL **birebir aynı**) | **29 / 301** | %9,63 → |

> ✅ **4.11'DE PAY VE PAYDA İKİSİ DE SABİT: 29 / 301 — serinin ilk TAM DURAĞAN
> satırı, ve bu bir alarm değil bir KANIT.**
>
> 4.11 bir **refactor** alt görevi (BORÇ-008: CHECK literal ifadesinin dokuz
> kopyası tek modüle indi). Serinin diğer *"değişmedi"* satırlarından farkı,
> burada `packages/db/src/schema/` altındaki **on dosyaya dokunulmuş** olması —
> yani ilk kez şema **dosyaları** değişti ve şema **değişmedi**. İkisinin
> ayrıldığı yer tam olarak bu tablo:
>
> | Soru | Ölçüm |
> |---|---|
> | Üretilen SQL değişti mi? | **Hayır** — `drizzle-kit generate` → *"No schema changes, nothing to migrate"* |
> | Yeni olgu türü var mı? | **Hayır** — zincir 12 · tablo 22 · FK 32 · indeks 6 · sequence 14, beşi de sabit |
> | 10 yeni test `compareSchemas` çağırıyor mu? | **Hayır** — hepsi **birim** testi (`pnpm test`), `test:db` paydası hiç kımıldamadı |
> | Körelen karşılaştırıcı hangi dosyayı kırıyor? | **yalnızca `round-trip.itest.ts`** — 4.8'den beri aynı dosya, aynı 29 test |
>
> ⚠️ **VE REFACTOR'IN KENDİ KANITI BU SERİ DEĞİL, AYRI BİR MUTASYONDU.** Ortak
> modül körlendi (`sqlLiterals` sabit bir dize döndürecek şekilde) ve
> `drizzle-kit generate` koşuldu: üretilen migration **17 CHECK kısıtının
> 17'sini birden** değiştirdi — yani dokuz çağrı yerinin hiçbiri bağlanmadan
> kalmamış. **Bir refactor'ın "her yeri bağladım" iddiası ancak MUTASYONLA
> kanıtlanır; geçen bir test çağrının yapıldığını göstermez.** Ve kanıtın
> `typecheck` olamayacağı yapısal: ifade bir **SQL metni** üretiyor ve o metin
> hiçbir tipe girmiyor.

> ✅ **4.10'DA DA PAY SABİT: 29 — sebebi 4.9'unkiyle AYNI SINIF, ve yine ölçüldü.**
> 4.10 bir **ölçüm** alt görevi: migration yok, yeni olgu türü yok. 24 yeni
> entegrasyon testinin **hiçbiri** `compareSchemas` çağırmıyor ve körelen
> karşılaştırıcı yine yalnızca `round-trip.itest.ts`i kırıyor (aynı dosya, aynı
> 29 test). Oran düştü (%10,47 → **%9,63**) çünkü payda 277 → 301 büyüdü.
>
> ⚠️ **AMA 4.10'UN KENDİ NÖBETÇİLERİ İKİ AYRI MUTASYONLA ÖLÇÜLDÜ** ve ikisi de
> seriye girmiyor, çünkü hedefleri `compareSchemas` değil **ölçümün kendisi**:
>
> ```ts
> // MUTASYON ② — A'nın istatistik kurulumu kaldırıldı:
> //   await executor.run('ANALYZE "people"');   ← silindi
> //   await executor.run('ANALYZE "players"');  ← silindi
> // MUTASYON ③ — B'nin indeks kapatması etkisizleştirildi:
> //   await tx.run('SELECT 1');   // yerine: SET LOCAL enable_indexscan/bitmapscan = off
> ```
>
> **② → 2 / 78** (istatistik denetimi + *"`people` tarafı indeksi kullanmıyor"*
> plan iddiası). **③ → 2 / 78** (KONTROL testi + süre karşılaştırması).
>
> ⚠️ **VE ②'NİN ASIL BULGUSU KIRILANLARDA DEĞİL, KIRILMAYANLARDA:** `< 50 ms`
> **süre testleri kırılmadı**. Yani istatistiksiz — dolayısıyla **yanlış** —
> alınmış bir ölçüm, bütçe testini kusursuz geçiyor. **Genel biçim: geçen bir
> bütçe testi, ölçümün DOĞRU ALINDIĞINI göstermez; onu ancak ölçümün ön
> koşulunu iddia eden ayrı bir nöbetçi gösterir.** 4.9'un *"determinizm testi
> tek başına bir nöbetçi değildir"* kuralının ölçüm tarafındaki kardeşi.

> ✅ **4.9'DA PAY SABİT KALDI: 29 — VE BU DA ALARM DEĞİL, ÇÜNKÜ SEBEBİ ÖLÇÜLDÜ.**
>
> Kuralın tam hâli: **alarm *"sabit pay"* değil, *"AÇIKLANAMAYAN sabit pay"***.
> 4.9 bir **veri** alt görevi: migration yok, yeni olgu türü yok, yeni yapı yok
> — 3.8'in (*"değişmedi (seed)"*, 19/146) birebir sınıfı. Ölçüm:
>
> | Soru | Ölçüm |
> |---|---|
> | 4.9 `compareSchemas`ın yüzeyine dokundu mu? | **Hayır** — zincir 12, tablo 22, FK 32, indeks 6, sequence 14; beşi de sabit |
> | 26 yeni entegrasyon testinin kaçı `compareSchemas` çağırıyor? | **0** (hiçbiri import etmiyor) |
> | Körelen karşılaştırıcı hangi dosyayı kırıyor? | **yalnızca `round-trip.itest.ts`** — 4.8'dekiyle aynı dosya, aynı 29 test |
>
> Oran düştü (%11,55 → **%10,47**) çünkü payda 251 → 277 büyürken pay sabit
> kaldı. **Payı artıran şey bir FARK BEKLEMESİDİR** ve 4.9 şemaya hiçbir fark
> getirmedi — satır getirdi.
>
> ⚠️ **AMA 4.9'UN KENDİ NÖBETÇİSİ AYRI BİR MUTASYONLA ÖLÇÜLDÜ** ve seriye
> girmiyor, çünkü hedefi `compareSchemas` değil **üretecin kendisi**:
>
> ```ts
> // 4.9'UN MUTASYONU — birebir bu (`player-generator.ts`):
> return mix32(mix32(1) ^ mix32(Math.imul(stream, STREAM_SALT)));   // `index` yok sayıldı
> ```
>
> Sonuç: **7 / 967** birim + **3 / 277** entegrasyon. Ve asıl bulgu şu:
> ***"aynı çağrı BİREBİR aynı kümeyi veriyor"* testi KIRILMADI.** Sabit dönen
> bir üreteç determinizm iddiasını **kusursuz** geçiyor — §11.5'in başındaki
> ölçümün (*"on beş pozitif test kör bir karşılaştırıcıyla da geçiyordu"*)
> canlı tekrarı. Mutasyonu yakalayan testler, *"satırlar birbirinden FARKLI"*
> ve *"kesişim 27 satır"* gibi bir **fark ya da dağılım** bekleyenler oldu.
> **Genel biçim: determinizm testi tek başına bir nöbetçi değildir; yanına
> bağımlılık iddiası konmadıkça kör bir üreteci de onaylar.**

> ⚠️ **4.6 SATIRI 4.7'YE KADAR EKSİKTİ — VE BU SERİNİN KENDİ DERSİ.**
> Ölçüm 4.6'da yapıldı (**27 / 230**), ANLIK DURUM'a ve alt görev raporuna
> yazıldı, ama **serinin yaşadığı yer olan bu tabloya işlenmedi**; 4.7'de
> ölçüldü (dosyanın tamamında `4.6` → 0 eşleşme) ve iki satır birlikte eklendi.
>
> Sınıf tanıdık: *"envanterler kör kalmaz, ama GÜNCELLENMEZSE bayatlar"* (F1).
> Çare bir kez daha yazmak değil, **kontrol eden bir adım** — `OUTPUT-FORMAT`ın
> kurallarına *"şemaya dokunan bir alt görevde mutasyon serisi §11.5'e işlendi
> mi?"* maddesi 4.7'de eklendi (SAPMA-033'ün deseni).

> ✅ **4.8'DE PAY ARTTI: 27 → 29 — VE ARTIŞIN KAYNAĞI ADIYLA BELLİ.**
>
> 4.7'nin ölçüm tablosu *"indeks | 0 | **4.8'in işi**"* diye bir satır
> bırakmıştı ve bu turda o satır kapandı. Ama artışın sebebi *"yeni bir olgu
> türü"* **değil** — bu **ölçüldü, varsayılmadı**:
>
> | Soru | Ölçüm |
> |---|---|
> | `compareSchemas` indeks tanımını okuyor mu? | **Evet** — `introspect.ts` `pg_indexes.indexdef` çekiyor, `compare.ts` `indexFields` ile `definition`ı karşılaştırıyor |
> | Zincirde indeks zaten var mıydı? | **Evet** — `0004` dört indeks getirmişti |
> | Sessiz `down` sınıfının nöbetçisi var mıydı? | **Evet** — 3.7 üç `DROP INDEX` vakasını bozulma tablosuna yazmıştı |
>
> Yani `IndexFacts` yeni bir **olgu türü değil** ve 4.3/4.5/4.6'nın deseni
> (*"yeni tip ailesi ya da yapı → negatif test"*) burada **uygulanmıyor**.
> Payı artıran şey, `0011`in iki indeksinin **var olan** bozulma tablosuna
> eklenmesi: o satırların her biri `identical: false` **bekliyor**, yani körelen
> karşılaştırıcı ikisini de kırıyor. **+2, ve ikisi de kırılan test listesinde
> adıyla göründü.**
>
> ⚠️ **Aynı alt görevin diğer iki testi paya HİÇ katkı yapmadı** — 4.5'in
> dersinin beşinci tekrarı: `0011`in çevrim testi `differences: []` iddia ediyor
> (**boş** envanter, mutasyonun ürettiği değerin ta kendisi) ve sıfır kayıp
> testi `compareSchemas`ı hiç çağırmıyor. **Payı artıran şey bir FARK
> BEKLEMESİDİR.**
>
> ℹ️ Oran da yükseldi (%11,2 → **%11,55**) çünkü payda yalnızca 241 → 251
> büyürken pay 27 → 29 çıktı. 4.4'ten beri oranın payla birlikte ilk yükselişi.

> ✅ **4.7'DE PAY SABİT KALDI: 27 — VE BU ALARM DEĞİL, ÇÜNKÜ SEBEBİ ÖLÇÜLDÜ.**
>
> Kuralın tam hâli: **alarm *"sabit pay"* değil, *"AÇIKLANAMAYAN sabit pay"***.
> Payı artıran şey bir **fark bekleyen** testtir ve önceki üç artışın üçü de
> şemaya yeni bir **olgu türü ya da yapı** girdiği için mümkün oldu
> (4.3 `udtName` · 4.5 `constraint.definition` · 4.6 bileşik PK). `0010` böyle
> bir şey getirmiyor ve bu **sayılarak** gösterildi:
>
> | Ölçüm | `0010` | Zincirde 0000–0009 arasında |
> |---|---|---|
> | `serial` | var | 12 eşleşme |
> | `integer` | var | 63 |
> | `text` | var | 46 |
> | `smallint` | var | 83 |
> | `boolean` | var | **2** |
> | `text[]` | var | **1** (`people.person_type`) |
> | `timestamp with time zone` | var | 36 |
> | **bileşik PK** | **0** | 0009'un sınıfı |
> | **indeks** | **0** | 4.8'in işi |
>
> Yani `0010`un getirdiği **yedi tipin yedisi de** zincirde zaten vardı ve
> karşılaştırıcının okuduğu alan listesinin genişlemesi gerekmedi. Üç CHECK
> `constraint.definition` olgusunu kullanıyor ve onun negatif testi 4.5'te
> yazılmıştı (`④ SESSİZ bozuk down (KISIT TANIMI)`).
>
> ⚠️ **Ve yeni çevrim testi paya KATKI YAPMADI — §11.5'in başındaki ölçümün
> dördüncü tekrarı.** `0010`un çevrim testi `differences: []` iddia ediyor,
> yani **boş** bir envanter; körelen karşılaştırıcı tam olarak onu üretiyor.
> *"Migration yazdım, round-trip testi ekledim"* tek başına payı artırmaz.
>
> Oran %11,7 → %11,2 **düştü** çünkü payda 230 → 241 büyüdü (11 yeni test, çoğu
> `compareSchemas`ı hiç çağırmayan davranış/CHECK testleri). Okuma kuralı gereği
> bakılan sütun **pay**: 27 → 27, ve **sabit kalması açıklanabilir**.

> ⚠️ **MUTASYONUN TARİFİ DE BİR İDDİADIR — 4.2'de ölçülerek bulundu (D2).**
> Yukarıdaki başlık mutasyonu *"`compareSchemas` → her zaman `identical: true`"*
> diye tarif ediyordu ve bu tarif **yetersiz**. 4.2'de birebir uygulandı ve
> **18/163** çıktı, seri **19** diyor. Bir an *"pay düştü, alarm"* diye okundu.
>
> **Ölçüm iki varyantı ayırdı** (ikisi de `HEAD`'de, kod hiç değişmeden koşuldu —
> 4.0/4.0b/4.1 yalnızca belge yazmıştı, yani taban çizgisi 3.10'unkiyle aynı):
>
> | Körleştirme | Kırılan | Neden |
> |---|---|---|
> | yalnızca `identical: true` | **18** | `differences` dolu kalıyor; onun **içeriğini** iddia eden test hâlâ geçiyor |
> | `identical: true` **ve** `differences: []` | **19** | fark listesini iddia eden test de kırılıyor |
>
> Serinin kayıtlı değerleri **ikinci** varyanttan geliyor. Fark bir regresyon
> değil, **ölçüm düzeneğinin farkı** — ve düzeneğin kendisi yazılı olmadığı için
> bir sonraki ölçüm onu yeniden keşfetmek zorunda kaldı.
>
> **Kural (somut):** bir mutasyon serisi kaydedilirken mutasyonun **tam metni**
> yazılır, niyeti değil. *"Karşılaştırıcıyı körelt"* iki farklı kod üretir ve
> iki farklı sayı verir. **Bu, *"bir kapının kurtarma yolu da bir iddiadır"*
> kuralının (Faz 3.10) ölçüm tarafındaki kardeşi:** sınanmamış bir tarif,
> sınanmamış bir kurtarma yolu kadar sessizce yanlış sonuca götürür.
>
> ```ts
> // SERİNİN MUTASYONU — birebir bu:
> return { differences: [], identical: true, comparedFacts: counter.value };
> ```

> ✅ **4.3'TE PAY ARTTI: 19 → 20 — ve BEKLENEN buydu.** 3.8/3.9/3.10/4.2'de pay
> 19'da sabitti çünkü hiçbiri migration yazmadı. 4.3 `0005`i yazdı, round-trip
> yüzeyi büyüdü ve körelen karşılaştırıcı **bir yerde daha** ötüyor. Payın
> kaynağı adıyla belli: 4.3'ün eklediği **dizi eleman tipi negatif testi**
> (*"③ SESSİZ bozuk down (DİZİ ELEMAN TİPİ)"*).
>
> ⚠️ **Aynı alt görevin POZİTİF testleri paya HİÇ katkı yapmadı** ve bu, §11.5'in
> başındaki ölçümün canlı bir tekrarı: yeni `0005` çevrim testi
> (`identical: true` + `comparedFacts >= sınır`) kör bir karşılaştırıcıyla da
> **geçiyor**. Yani *"migration yazdım, round-trip testi ekledim"* tek başına
> payı artırmaz — artıran şey **negatif testtir**.
>
> ℹ️ Oran %11,7 → %11,2 **düştü** çünkü payda 163 → 178 büyüdü (15 yeni test,
> çoğu `compareSchemas`ı hiç çağırmayan davranış/CHECK testleri). Okuma kuralı
> gereği bakılan sütun **pay**: 19 → 20.

> ✅ **4.4'TE HEM PAY HEM ORAN ARTTI: 20 → 25 ve %11,2 → %13,2.** Seride oranın
> ilk kez **payla birlikte** yükselişi bu, ve sebebi tek bir kelimeyle *"daha çok
> test"* değil — **iddianın BİÇİMİ değişti**.
>
> `0006` zincirin 0001'den beri ilk `ALTER`-only migration'ı ve `attnum` deliği
> (§3.1.2 ⑤) artık **her kısmi geri almada** görünüyor. Bu, dört var olan çevrim
> testini `identical: true` iddiasından **farkların tam listesi** iddiasına
> geçirdi. Fark kritik:
>
> | İddia | Körelen karşılaştırıcı ne yapar |
> |---|---|
> | `identical: true` | mutasyon bunu **sağlıyor** → test **geçer** |
> | `differences` tam listesi | mutasyon listeyi boşaltıyor → test **kırılır** |
>
> Yani payın +5'inin dördü yeni test değil, **var olan dört testin körlükten
> çıkması**. Beşincisi 0006'nın kendi çevrim testi.
>
> **Genel biçim:** bir testin mutasyona duyarlılığı, ne kadar şeye baktığından
> çok **neyi iddia ettiğine** bağlı. `identical: true` bir **özet**tir ve
> özetler körlenebilir; farkların tam listesi bir **envanter**dir ve envanterin
> boşalması görünür. 3.4'te 0001 için bu biçim *"daha güçlü"* diye seçilmişti —
> 4.4 o gerekçeyi **sayıyla** doğruladı.

> ⚠️ **4.5'TE PAY BİR KEZ ALARM VERDİ: İKİ YENİ ÇEVRİM TESTİ PAYA HİÇ KATKI
> YAPMADI — ve sebebi 4.4'ün dersinin SINIRIYDI.**
>
> `0007` ve `0008` zincire eklendi, ikisinin de çevrim testi yazıldı, ilk ölçüm
> **25 / 215** verdi: pay 4.4'ün değerinde **sabit**. 4.4'ün okuması
> (*"envanter iddiaları körlükten çıkarır"*) buradan bir artış vaat ediyordu.
>
> **Ölçüm sınırı gösterdi.** İki yeni test `differences: []` iddia ediyor —
> **boş** bir envanter. Mutasyonun ürettiği değer tam olarak bu:
> `{ differences: [], identical: true, … }`. Yani:
>
> | İddia | Körelen karşılaştırıcı ne yapar |
> |---|---|
> | `differences` **dolu** tam listesi (4.4) | listeyi boşaltıyor → test **kırılır** |
> | `differences: []` (4.5'in yeni testleri) | **zaten** boş üretiyor → test **geçer** |
>
> **Genel biçim:** *"boş bir liste tek başına 'yok' diye okunur"* kuralının
> mutasyon tarafındaki biçimi. Bir envanter iddiası körlükten ancak **fark
> beklediğinde** çıkarır; fark beklemeyen bir envanter iddiası pozitif bir
> testtir ve §11.5'in başındaki ölçüm onun için geçerlidir (3.2b: 16'da 15).
> **Payı artıran şey envanterin biçimi değil, testin bir fark BEKLEMESİDİR.**
>
> ✅ **Alarm bir NEGATİF testle kapatıldı: 25 → 26.** `0007` zincire ilk kez
> *başka bir tablonun kısıtını* ekleyen migration'ı, `0008` ilk kez bir kısıtın
> **tanımını değiştiren** migration'ı getirdi — yani `constraint.definition`
> şemaya yeni bir **olgu türü** olarak girdi. Onu ölçen bir negatif test yoktu:
> karşılaştırıcının o alanı gerçekten okuduğu **varsayılıyordu** (D3). Test
> (`④ SESSİZ bozuk down (KISIT TANIMI)`) bir `down`un CHECK'i **dar** geri
> koyduğu sessiz vakayı üretiyor ve farkı yalnızca `definition`ın gösterdiğini
> ayrıca iddia ediyor (kısıt adı ve tipi iki durumda da aynı) — 4.3'ün `udtName`
> deseninin birebir tekrarı.
>
> ℹ️ Oran %13,2 → %12,0 **düştü** çünkü payda 190 → 216 büyüdü (26 yeni test;
> çoğu CHECK reddi, 1:1 teklik ve envanter testleri — hiçbiri `compareSchemas`ı
> çağırmıyor). Okuma kuralı gereği bakılan sütun **pay**: 25 → 26.
>
> ⚠️ **Aynı alt görevin diğer iki mutasyonu bunu tamamlıyor** (doğru temsile,
> yani **migration SQL'ine** uygulandı — TS şema dosyası çalışan veritabanını
> kurmuyor, #43):
>
> | Mutasyon | Kırılan | Ne söylüyor |
> |---|---|---|
> | `federations` FK'sı `set null` → `cascade` | **3** | ikisi katalog testi, biri **DAVRANIŞ** testi — kural ve gerçeklik ayrı ayrı ötüyor |
> | `referees.person_id`den `NOT NULL` kaldırıldı | **13** | nullability üç ayrı yerde nöbetçili: kural türetimi · snapshot ↔ gerçek şema · negatif `INSERT` |

> ⚠️ **3.8, 3.9, 3.10 VE 4.2'DE PAY 19'DA SABİTTİ VE O DA BEKLENENDİ.** Bu dördün
> hiçbiri migration yazmadı — round-trip yüzeyi büyümedi, yani körelen
> karşılaştırıcının ötebileceği yer sayısı da büyümedi. Payda büyüdüğü için
> oran düştü. **Alarm veren durum bu değil:** şema **büyürken** payın sabit
> kalması alarmdır, çünkü o zaman yeni yüzey negatif testsiz gelmiş olur.
>
> 3.10'un eklediği üç test (`er-diagram.itest.ts`) `compareSchemas`'ı **hiç
> çağırmıyor** ve çağırmamalı — kendi nöbetçileri var (aşağıda ölçüldü).

**Ne söylüyor:** test tabanı 16'dan 126'ya çıkarken kör bir kontrolün yakalandığı
yer oranı **%6'dan ~%15'e** çıktı. Yani testler yalnızca **çoğalmadı**,
*derinleşti* — her yeni tablo kendi bozulma testini de getirdiği için körelen
bir karşılaştırıcı daha çok yerde ötüyor.

**Ne söylemiyor:** oranın büyümesi otomatik değil. 3.5'te ölçülen 11 kırılmanın
**altısı** o alt görevde **açıkça yazılan** yeni bozulma testleriydi; yazılmasalardı
sayı 5'te kalır, oran **%6,5'e düşerdi**. Yani eğilim bir kazanım değil, her alt
görevde **yeniden kazanılan** bir şey.

> ⚠️ **3.7'DE ORAN DÜŞTÜ (%15,5 → %15,1) VE BU BİR GERİLEME DEĞİL.**
> Mutlak sayı **arttı** (16 → 19: üç yeni `DROP INDEX` bozulma testi), ama payda
> daha hızlı büyüdü (103 → 126). Eklenen 23 testin çoğu **arama ve sorgu planı**
> testleri ve onlar `compareSchemas`ı hiç çağırmıyor — köreltilmesi onları
> etkilemiyor, etkilememeli de.
>
> **Okuma kuralı:** bu oran *"testlerin ne kadarı şema karşılaştırmasına bağlı"*
> sorusunu ölçüyor, *"testler ne kadar iyi"* sorusunu değil. Farklı bir
> mekanizmayı sınayan testler eklendiğinde oranın seyrelmesi **beklenen**
> davranıştır. Alarm veren durum **mutlak sayının** sabit kalması olurdu: bu,
> yeni yüzeyin negatif testsiz geldiği anlamına gelirdi.
>
> **Sonuç: seriye iki sütun birden bakılır** — oran *ve* pay. 3.7'de pay 16'dan
> 19'a çıktı, yani yeni yüzey kendi bozulma testlerini getirdi.

**Nasıl okunur:** bu seri bir **taban çizgisidir**. Yeni bir şema/karşılaştırma
alt görevinde oran düşerse, sebebi aranır: ya negatif testler genişletilmemiştir
ya da yeni pozitif testler kör bir kontrolle de geçiyordur. **Faz 22** (motor
çekirdeği) determinizm ve snapshot testleriyle bu seriye ilk kez motor tarafından
bakacak — orada da aynı soru sorulur: *"bu kontrolü sustursam kaç test kırılır?"*

**İki kalıcı kural:**

1. **Bir karşılaştırma/doğrulama yazan her yerde negatif test ZORUNLU.** Pozitif
   testlerin sayısı bunu telafi etmez; ölçülen oran 16'da 1.
2. **Kontrol "kaç şeye baktığını" da bildirmeli.** `compareSchemas` bu yüzden
   `comparedFacts` döner ve testler onu da iddia eder. Boş bir şemayı boş bir
   şemayla karşılaştıran bir test de "fark yok" der — o cevap **değersizdir** ve
   sayaç olmadan değerli olandan ayırt edilemez.

Aynı disiplin `arch:check` kanaryasının doğuş sebebiydi (Faz 2.3b): saf
fonksiyonun beş birim testi yeşilken kuralın **kablolaması** kopabiliyordu.
Fark şu ki orada eksik olan bir *kanarya*, burada bir *negatif iddia* — ikisi de
aynı sorunun biçimleri: **yeşil bir test, kontrolün baktığını göstermez.**

### ⚠️ BİR MUTASYONUN "HİÇBİR ŞEYİ KIRMAMASI" İKİ FARKLI ŞEY DEMEK OLABİLİR (Faz 3.9)

**Kural:** bir mutasyon hiçbir testi kırmadığında iki olasılık vardır ve
**refleks yanlış olanı seçer**:

1. **Nöbetçi yok** — gerçekten bir delik var, test yazılmalı.
2. **Mutasyon ölçtüğün yola hiç dokunmuyor** — delik yok, mutasyon yanlış
   yerde yapıldı.

İkincisini birincisi sanmak **var olmayan bir delik icat eder** ve onu kapatmak
için yazılan test hiçbir şey korumaz. Bu, "yanlış sebeple kırılan kapı"nın
(`PROJECT_MEMORY.md` Faz 3 günlük #25) ayna görüntüsü: orada kapı doğru
görünüp yanlış sebeple ötüyordu, burada susuyor.

**Bu repodaki somut biçimi — ölçülmüş (3.9, günlük #43).** Şemanın **iki**
temsili var:

| Temsil | Nerede | Çalışan veritabanını kuruyor mu |
|---|---|---|
| Drizzle TS tanımları | `packages/db/src/schema/` | **Hayır** |
| Migration SQL'i | `packages/db/drizzle/` | **Evet** |

`clubs.ts`teki `onDelete: 'cascade'` → `'restrict'` mutasyonu **hiçbir testi
kırmadı** — çünkü kısıtı `0002_club_core.sql` kuruyor ve entegrasyon testi
`pg_constraint`ten okuyor. Delik yoktu; mutasyon yanlış temsile yapılmıştı.

**Karşı ölçüm (3.10):** aynı soru doğru temsile sorulunca cevap değişiyor.
`0003_visual_assets_referees.sql`teki `kit_templates.name_key` sütunundan
`NOT NULL` kaldırıldı → **163 entegrasyon testinin 7'si** kırıldı (2'si ER
diyagramı nöbetçisi, 5'i round-trip/snapshot), `pnpm test` **742/742 sessiz**,
`pnpm typecheck` sessiz.

**Uygulama kuralı:** bir şema iddiasını mutasyonla sınarken mutasyon
**katalogu kuran** temsile yapılır. TS tarafındaki bir değişikliğin sessiz
kalması bir bulgu değil, ölçümün yanlış yere yapılmış olmasıdır.

⚠️ **Faz 4 sürekli şema mutasyonu yapacak** (`people`, sözleşme, personel
tabloları + üç ileri FK). Bu ayrım orada her alt görevde gerekecek.

### ⚠️ "N SATIRDA İNDEKS KULLANILIYOR" BİR KURAL DEĞİLDİR — AYRAÇ SEÇİCİLİKTİR (Faz 3.9)

**Kural:** bir planlayıcı kararı **hacimden** okunmaz. Bir indeksin kullanılıp
kullanılmaması sorgunun **seçiciliğine** bağlı ve seçicilik, satır sayısından
**bağımsız bir boyuttur**.

**Ölçüm (3.9, günlük #45).** Aynı tabloda, aynı **3.001** satırda:

| Sorgu terimi | Eşleşen satır | Plan |
|---|---|---|
| `'besiktas'` | 1 | **Bitmap Index Scan** (GIN) |
| `'kulup1234'` | binlerce (üretilmiş `Kulup N` adları) | **Seq Scan** |

İkisi de **doğru karar**. Planlayıcı seçici olmayan bir sorguda indeksi
kullansaydı daha yavaş olurdu.

⚠️ **GERİYE DÖNÜK DÜZELTME — 3.7'nin kanıtı tesadüfen seçici bir terimle
alınmıştı.** 3.7 *"3.000 satırda planlayıcı GIN'i seçiyor"* diye yazdı ve iddia
**yanlış değildi**; ama gerekçesi bilinmiyordu — `'besiktas'` seçici olduğu
için seçiliyordu, hacim yüzünden değil. Aynı hacimde seçici olmayan bir terim
seçilseydi 3.7'nin kanıtı **alınamazdı**. Bir kanıtın sonradan güçlenmesi,
önce şanslı olduğunu gizlemez.

**Uygulama kuralı:** bir plan iddiası yazılırken **iki** vaka birden ölçülür ve
ikisi de teste girer (seçici + seçici olmayan). Tek örnekten kural çıkarmak, o
örneğin tesadüfen paylaştığı bir özellikten kural okumaktır.

ℹ️ İlgili ama **ayrı** bir tuzak (aynı alt görevde ölçüldü): bir plan eşiği
**azaltarak** ölçülmez. `DELETE` `pg_class.relpages`i bayat bırakıyor;
planlayıcının maliyet modeli satır sayısını değil **sayfa sayısını** okuduğu
için rampa tersine dönmüş görünüyor. Eşik `TRUNCATE` + artan `INSERT` + her
adımda `VACUUM ANALYZE` ile ölçülür.

### ⚠️ BİR NÖBETÇİNİN "KIRILDIĞINDA NE YAPILACAĞI" DA BİR İDDİADIR — SINANMADAN YAZILMAZ (Faz 3.10)

**Kural:** bir kapı yazarken iki şey üretilir — kapının kendisi **ve** kırıldığında
izlenecek kurtarma yolu. İkincisi genellikle bir cümleyle geçiştirilir ve
**hiç sınanmaz**. Sınanmamış bir kurtarma yolu, kapı gerçekten öttüğünde
sessizce yanlış bir düzeltmeye yol açar.

**Ölçülmüş vaka.** 3.10'un ER diyagramı nöbetçisi için kurtarma yolu şöyle
yazılmıştı: *"Vitest'in fark çıktısı üretilmiş metnin tamamını gösteriyor, blok
o çıktıdan yenilenir."* Gerçek bir mutasyonla sınandığında **iki yönden yanlış**
çıktı:

| İddia | Ölçüm |
|---|---|
| *"Fark çıktısı metnin tamamını gösteriyor"* | **Hayır** — bağlamı sınırlı bir **birleşik fark** basıyor (`@@ -131,25 +131,10 @@`) |
| *"Blok o çıktıdan yenilenir"* | Yön **ters okunmaya açık**: `- Expected` = **üretilmiş** (doğru) taraf, `+ Received` = **bayat belge** |

⚠️ **Ters okumanın bedeli sessiz:** bayat metin geri yazılırsa test **yeşile
döner** ve belge yanlış kalır. Yani yanlış düzeltme, doğru düzeltmeden **ayırt
edilemez**.

**Düzeltme:** doğru metin artık farkın içinde aranmıyor — karşılaştırma onu
**kendi hata mesajında** taşıyor:

```ts
expect(documented, staleDocumentMessage(generated)).toBe(generated);
```

Mesaj üretilmiş bloğun tamamını `----- ÜRETİLMİŞ METİN -----` işaretleri
arasında basıyor; kurtarma bir **fark okuma alıştırması** olmaktan çıkıp
kopyala-yapıştıra iniyor. Gerçek bir mutasyonla doğrulandı.

**Bu D3'ün yeni bir biçimi:** orada kapı **bakmadığı** hâlde yeşil diyordu;
burada kapı doğru ötüyor ama **ötüşün söylediği şey** yanlış. Soru genişliyor:
*"bu kapı benim değiştirdiğim dosyalara baktı mı?"* yanına *"öttüğünde
söylediği şey doğru mu?"*

### ⚠️ BİR ARTEFAKT ÜRETEN YÖNERGE, ARTEFAKTIN KENDİSİ OLMALI — TARİFİ DEĞİL (Faz 4.2'de kural oldu)

**Kural:** bir yönerge okuyanın bir **artefakt** üretmesini istiyorsa (bir metin,
bir kod parçası, bir komut), yönerge o artefaktın **tarifini** değil
**kendisini** taşımalıdır. Tarif ile artefakt arasındaki her boşluk, okuyanın
kendi makul yorumuyla doldurulur — ve o yorum **sessizce farklı bir sonuç**
üretir.

**Bu kural iki vakadan TÜRETİLDİ, bir vakadan genellenmedi.** Faz 3'ün
kapanışında bilerek yazılmamıştı: *"geleceğe verilen yönergeler de birer
iddiadır; **Faz 4'te ikinci bir örnek çıkarsa kural yazılabilir**."* Faz 4.2 o
ikinci örneği getirdi.

| # | Vaka | Yönergenin tarif ettiği şey | Birebir uygulanınca çıkan sonuç | Düzeltme |
|---|---|---|---|---|
| ① | **Faz 3.10 — kurtarma yolu** | *"Vitest'in fark çıktısı üretilmiş metnin tamamını gösteriyor, blok o çıktıdan yenilenir"* | Fark **bağlamı sınırlı** ve yönü ters okunmaya açık; bayat metin geri yazılırsa test **yeşile döner** | Doğru metin **hata mesajının içinde** üretiliyor (`----- ÜRETİLMİŞ METİN -----`) |
| ② | **Faz 4.2 — ölçüm tarifi** | *"`compareSchemas` → her zaman `identical: true`"* | **18/163**, kayıtlı seri **19** diyor → *"pay düştü, alarm"* diye okundu | Mutasyonun **tam kodu** spec'te duruyor (`return { differences: [], identical: true, … }`) |

**İkisinin ortak yapısı:** yönerge yazıldı, okundu, **ilk kez uygulandığında
yanlış çıktı**, ve her ikisinde de **yanlış sonuç makul görünüyordu** — 18 bir
"alarm" olarak raporlanabilirdi, bayat bir diyagram "düzeltildi" sayılabilirdi.
Yani bu sınıfın belirtisi bir hata değil, **inandırıcı bir yanlış cevaptır**.

**İkisinin çaresi de aynı yere yakınsıyor:** artefaktı yönergenin **içine** koy.
③'ün kurtarma metni bir dosyada değil, kapının kendi çıktısında. ②'nin
mutasyonu bir cümlede değil, bir kod bloğunda.

> ⚠️ **SERİNİN BÜTÜNLÜĞÜ HAKKINDA KESKİN SONUÇ (4.2'de ölçüldü).** Mutasyon
> serisinin 3.2b–3.10 arası rakamları, **yazılı tarifin ürettiğinden farklı bir
> tarifle** alınmıştı. Seri sağlamdı ama **yazılı olan hiç işlemiyordu**: onu
> harfiyen izleyen ilk oturum 18 bulup seriyi kırık sanacaktı. Taban çizgisinin
> `HEAD`'de, kod hiç değişmeden ölçülmesi (orada da 18) bunu kanıtladı —
> refleks *"pay düştü, alarm"* demek olurdu.

ℹ️ **Bu sınıf artık greplenebilir ve üçüncü aday zaten görünür:**
`docs/spec/11-project-memory.md` §12.5'in *"§7 rakamları faz kapanışında YENİDEN
ölçülür — ara ölçümlerden kopyalanmaz"* uyarısı. O **hâlâ sağlam** — Faz 3'te
tuttu (3.10 rakamları yeniden ölçtü ve ROADMAP'e yazılmış tahminleri düzeltti),
yani bu bir vaka değil bir **karşı örnek**: aynı sınıftaki bir yönerge, ölçümü
zorunlu kıldığı için işledi.
**Envanter bugün AÇILMIYOR (K12).** Bu sınıfın sistematik taraması **Faz 50**'nin
(bütünsel denetim) işi; buraya yalnızca notu düşülüyor ki orada yeniden
keşfedilmesin.

### ⚠️ CI'A YENİ BİR İŞ EKLENDİĞİNDE, MEVCUT İŞLERİN ÖRTÜK HAZIRLIK ADIMLARI ÇIKARILIR (Faz 3.2a)

**Kural:** CI'a yeni bir iş eklendiğinde, mevcut işlerin hangi **hazırlık
adımlarına örtük olarak bağlı** olduğu çıkarılır ve yeni işe açıkça yazılır.
**Bir işin geçmesi, bağımlılıklarının o işte de kurulu olduğunu göstermez.**

**Ölçülmüş vaka.** 3.2a'da eklenen `Entegrasyon` işi iki mimaride birden kırıldı:

```
Error: Failed to resolve entry for package "@fms/shared".
```

Testler `@fms/*` paketlerini `package.json` `exports` üzerinden, yani **derlenmiş
`dist/`** üzerinden çözüyor. `quality` işinde derleme adımı **görünmüyor** ama var:
`turbo.json`'da `typecheck` görevi `dependsOn: ["^build"]` taşıyor ve bağımlılıkları
bir **yan etki** olarak derliyor. Yeni iş `typecheck` koşmadığı için o yan etkiyi
almadı.

**Yerelde geçmesinin sebebi** önceki kapı koşularından kalan `dist/` idi — yani
yerel ortam CI'ın görmediği bir durumu gizliyordu.

Bu, Faz 1 hata #7'nin (*"test öncesi `pnpm build`, bayat `dist` yeşil yalanı
üretir"*) CI sürümü: **kural yazılıydı ama yeni bir iş onu miras almadı.** D3'ün
ayrı bir biçimi — burada körelen bir denetleyici değil, **devralınmayan bir
hazırlık**.

**Yeni iş eklerken sorulacak üç soru:**

1. Bu iş hangi **üretilmiş** artefaktlara dokunuyor? (`dist/`, `node_modules/`,
   Docker imajı, çekilmiş konteyner imajı)
2. O artefaktları mevcut işlerde **hangi adım** üretiyor — ve o adım burada var mı?
3. Adım bir **yan etki** olarak mı geliyor (turbo `dependsOn`, bir betiğin
   yaptığı ek iş)? Öyleyse yeni işte **açıkça** yazılır; yan etkiye güvenmek onu
   görünmez kılar.

### ⚠️ `pnpm format:check` MARKDOWN'A BAKMIYOR — "format ✅" belge değişikliği için hiçbir şey kanıtlamaz (SAPMA-024)

`.prettierignore` `*.md` satırını taşıyor. **Karar bilinçli ve Faz 1'de verildi**
(commit `1bafb7e`, 2026-08-23 — git geçmişinden ölçüldü, tahmin edilmedi):
`docs/` altındaki belgeler elle yazılmış spesifikasyonlar, hizalanmış tablolar ve
kasıtlı satır sarmaları taşıyor; Prettier'ın markdown biçimlendiricisi bunları
yeniden yazar.

**Eksik olan karar değil, SONUCUYDU.** Kapı, belge ağırlıklı bir commit'te
**hiçbir değişen dosyaya bakmıyor** ve yine `All matched files use Prettier code
style!` diyor. Faz 1'den bu yana yazılan raporların bir kısmında o `✅` satırı
boştu — Faz 2 §5 **D3**'ün (*"bir kapının 'temiz' demesi, baktığını göstermez"*)
yeni bir örneği, bu kez **denetleyicinin kendisinde değil kapsamında**.

**Ölçülen kapsam (Faz 3.2a, 168 izlenen dosya üzerinde `prettier --file-info`):**

| Durum | Dosya |
|---|---|
| **Denetleniyor** | **125** |
| Yok sayılıyor (`.prettierignore`) | **31** — 29'u `.md`, kalanı `pnpm-lock.yaml` ve `LICENSE` |
| Desteklenmiyor (ayrıştırıcı yok) | 12 |

Yani izlenen dosyaların **%17'si** bu kapının dışında ve hepsi belge.

**Karar 3.2a'da yeniden değerlendirildi ve KORUNDU — gerekçe ölçüldü:** Markdown
denetimi açılsaydı **29 dosyanın 29'u** değişirdi, **4.159 satır**. İkisi tek
başına belirleyici: `PROJECT_MEMORY.md` **append-only bir kütüktür** ve diff
okunabilirliği onun için doğrudan bir kalite özelliği; `docs/MASTER-SPEC.md`
**donmuş arşivdir** ve yeniden biçimlendirmek o statüyü ihlal eder.

**Bunun yerine raporlama kuralı:** bir alt görev yalnızca belge değiştirmişse
rapor `format ✅` yazmaz, **`format — Markdown kapsam dışı, bu commit'te
denetlenen dosya yok`** yazar. `docs/OUTPUT-FORMAT.md`'nin *"test edilmemiş bir
kapı test edilmiş gibi yazılmaz"* kuralı buraya da uygulanır: kapı koştu ama
**bakacak bir şey bulamadıysa** bu bir onay değildir.

**ESLint ile arch:check arasındaki iş bölümü** — hiçbir kural iki yerde denetlenmez.
Tekrar eden kural, iki yerden birinde gevşetilince sessizce ölür.

| Kural | Nerede | Neden orada |
|---|---|---|
| `console.log` (K8) | **ESLint** | Çekirdek kural, editörde anında geri bildirim |
| Kaynak kodda mutlak yol (K6) | **ESLint** (`local/no-hardcoded-path`) | AST erişimi ve otomatik düzeltme ESLint'te |
| Sabit kodlanmış Türkçe metin (K5) | **ESLint** (Faz 5) | Aynı gerekçe |
| Katman bağımlılık yönü (§2.4) | **arch:check** | Paket sınırı bilgisi ESLint kapsamının dışında |
| Motor saflığı (K3) | **arch:check** | Yasaklı modül + sözdizimi + modül düzeyi durum birlikte denetlenir |
| Import yolu harf duyarlılığı | **arch:check** | Dosya sistemi erişimi ister; `.mjs`/`.js` dosyalarını TS görmez |
| TS olmayan varlıklarda mutlak yol | **arch:check** | ESLint `.html`/`.json`/`.css` denetlemez |

`pnpm arch:check` şunları denetler:
- `packages/engine` içinde `@fms/db`, `node:*`/`fs`/`http` vb., `Date.now()`, `Math.random()`, `new Date()` ve modül düzeyi değiştirilebilir bağlama → HATA
- Katman bağımlılık yönü ihlali (CLAUDE.md §2.4) → HATA
- Göreli import yolunun diskteki dosya adıyla harf uyuşmazlığı → HATA
- `.html`/`.json`/`.css` kaynak varlıklarında mutlak uygulama yolu → HATA
- `packages/engine`'in `@fms/shared`'dan alamayacağı **adlandırılmış dışa aktarımlar** → HATA
  (`ENGINE_FORBIDDEN_SHARED_EXPORTS`; modül düzeyinde ifade edilemeyen sembol yasakları)
- Bir dosya `@fms/X` import ediyorsa o paketin `package.json`'ında **bildirilmiş** olmalı → HATA
- Kısıtlı alt yol (`@fms/shared/server`) yasak katmanda kullanılıyorsa → HATA

### ⚠️ BİR HATA SINIFLANDIRMASI BAĞLAMDAN BAĞIMSIZ DEĞİLDİR

**KURAL.** Aynı hata tipi, **kaynağına göre** farklı işlem görebilir.
Sınıflandırmayı tüketen her kural, tipi sormakla yetinmemeli, **bağlamı da**
sormalıdır. "Bu tip şu listede mi?" yeterli bir soru değildir; doğrusu
"bu tip, **bu bağlamda**, şu listede mi?"

**İki ölçüm, iki faz, aynı sınıf:**

| Faz | Belirti | Kök neden |
|---|---|---|
| **2.5b** | `beforeSend` **her 500'ü sessizce düşürüyordu** | `api.ts` başarısız HTTP yanıtlarının hepsini `DomainError` yapıyordu; `DomainError` "kullanıcı hatası" listesinde. Sunucu çökse Sentry'de hiçbir şey görünmezdi. |
| **2.6** | Arayüzü yıkan bir `DomainError` de düşecekti | Sınıflandırma **API sözleşmesinden akan işlenmiş** hatalar için yazılmıştı. Kaçıp render'ı çökerten bir hata bambaşka bir şeydir ama **aynı tipi taşır**. |

İki düzeltme de aynı biçimde: 2.5b'de **tip düzeltildi** (5xx →
`DataProviderError`), 2.6'da **bağlam eklendi** (`crash` etiketi elemeyi aşar).

**Neden bu sınıf hata sessizdir:** sınıflandırma yazıldığı anda doğrudur ve
onu tüketen bir kural yokken **yanlış olduğunu belli etmez**. Hata ancak
ikinci bir tüketici ortaya çıkınca görünür — ve o ana kadar geçen sürede
sınıflandırmaya güvenen her şey sessizce yanlış davranır.

**Pratik sonuç — bir sınıflandırmayı tüketen kural yazarken sorulacak iki soru:**
1. *Bu kural, tipin geldiği **bütün** yolları düşünerek mi yazıldı?*
2. *Bir yol yanlış tarafa düşerse **hangi test kırılır?*** Cevap "hiçbiri"yse
   kural değil, temenni yazılmıştır.

İkinci soru için kontrol testi zorunludur: 2.6'da `crash` etiketinin gerçekten
fark yarattığı, **etiketsiz aynı hatanın düştüğü** ayrıca sınanarak kanıtlandı.

### ⚠️ BİR KURALIN BİRİM TESTİ, KABLOLAMASININ TEST EDİLDİĞİ ANLAMINA GELMEZ

**KURAL.** Bir kuralın saf fonksiyonunu doğrulayan birim testi, o kuralın
denetleyici içinde **gerçekten uygulandığını** kanıtlamaz. Her kural için bir
**kanarya fixture'ı zorunludur**: kuralın ihlalini içeren sahte bir depo
taranır ve kuralın gerçekten ötüğü görülür. **Kural sayısı ile kanarya kapsamı
eşit olmalıdır ve bu eşitlik meta-testle sabitlenir.**

**Ölçüm (Faz 2.3b).** `arch:check`'in yedi kuralı vardı; kanarya **altısını**
kapsıyordu — `import-casing` kapsam dışıydı. `runArchCheck` içindeki
`import-casing` bildirimi susturuldu:

| Kapı | Sonuç |
|---|---|
| `checkImportCasing` beş birim testi | ✅ **geçti** — saf fonksiyonu doğrudan çağırıyorlar |
| Kanarya (`META: KANARYA`) | ✅ **geçti** — bu kurala hiç bakmıyordu |
| Tablo bütünlüğü (`META: … tabloları boşalmadı`) | ✅ **geçti** — tablo doluydu |
| Tüm arch-check testleri | ✅ **43/43 geçti** |
| `pnpm arch:check` | ✅ **"temiz" dedi** |

Yani kural **tamamen körelmişti** ve hiçbir kapı ötmedi. ADR-0004'e göre harf
duyarlılığı bu projenin en pahalı hata sınıfı (Windows'ta çalışır, Linux/ARM64
üretimde kırılır) ve yerelde asla tekrar üretilemiyor — kapı tam orada
sessizce kapanabilirmiş.

Fixture eklendikten sonra aynı mutasyon **1 başarısız** veriyor. Test sayısı
değişmedi (43): yani boşluk *"bu kuralın testi yok"* diye değil, ancak
**kural sayısı ile kanarya kapsamı sayılarak** bulunabilirdi.

**Meta-test iki katmanlıdır ve birincisi yetmez:**

| Katman | Ne yakalar | Ne YAKALAMAZ |
|---|---|---|
| ① Tablo bütünlüğü | Sabit liste boşalmış/kırpılmış mı | Tablo doluyken **kablolaması kopmuş** kuralı |
| ② Kanarya deposu | Kuralın gerçekten ötüp ötmediğini | Kanarya listesinde **olmayan** kuralı |

②'nin kör noktası ①'inkiyle kapanmıyor: ikisi de kural listesinin tamamını
gördüğü sürece savunma tam. Bu yüzden liste **üç yerde birden** güncellenir —
denetleyicinin başlığındaki kapsam beyanı, kanarya fixture'ı + beklenen kural
listesi, ve `PROJECT_MEMORY.md`'deki kapsam bloğu.

**Genellemesi:** bu kural `arch:check`e özgü değildir. Bir ESLint kuralı, bir
Zod şeması, bir invariant — kendi başına doğru olması, çağrıldığını
kanıtlamaz. Denetleyen her mekanizma için sorulacak soru şudur:
*"Bu kuralı sustursam hangi test kırılır?"* Cevap **yoksa**, kural yoktur.

### ⚠️ "Test öncesi `pnpm build`" YETMEZ — BUILD ET **VE ÇALIŞTIR** (SAPMA-014)

Faz 1 hata #7 şu kuralı doğurmuştu: *test öncesi `pnpm build`, çünkü bayat
`dist` yeşil yalanı üretir.* Faz 2.3a'da bu kuralın **eksik** olduğu ölçüldü.

**Ölçüm.** `apps/api`'de bir DI belirteci (`LOGGER`) `app.module.ts`'te
tanımlıydı; `correlation.middleware.ts` onu oradan alıyordu ve `app.module.ts`
de middleware'i import ediyordu — **dairesel bağımlılık**. Sonuç:

```
ReferenceError: Cannot access 'LOGGER' before initialization
    at __param(0, Inject(LOGGER))
```

| Kapı | Sonuç |
|---|---|
| `pnpm typecheck` | ✅ **geçti** — döngü tip düzeyinde tamamen geçerli |
| `pnpm lint` | ✅ **geçti** |
| `pnpm test` (19 birim testi) | ✅ **geçti** |
| `pnpm build` | ✅ **geçti** — derleme dairesel importtan şikâyet etmez |
| **Derlenmiş çıktıyı çalıştırmak** | ❌ **açılışta patladı** |

**Neden birim testleri göremedi:** Vitest modül grafiğini kendi çözümleyicisiyle
ve üretimden **farklı sırayla** yükler. Aynı döngü test ortamında çözülebilir
kalırken Node'un ESM yükleyicisinde çözülemez hale gelir. Yani birim testinin
yeşil olması, modülün üretimde yüklenebileceğini **kanıtlamaz**.

**Dekoratörler bu sınıfı ağırlaştırıyor:** `@Inject(TOKEN)` modül gövdesi
değerlendirilirken çalışır. Sıradan bir fonksiyon içindeki döngüsel referans
"sonra çözülür" lüksüne sahiptir; dekoratör argümanı sahip değildir.

**KURAL — DI veya modül grafiği değişen her alt görevde:**

1. `pnpm build`
2. Derlenmiş çıktı **gerçekten çalıştırılır** (`node dist/main.js` veya konteyner)
3. Açılış logunun beklenen satırları bastığı görülür

Bu üç adım `apps/api`, `apps/worker` ve DI/dekoratör kullanan her yeni modül
için geçerlidir. "Testler yeşil" bu adımın yerine geçmez.

**Tekrar önleme:** DI belirteçleri **hiçbir şey import etmeyen** ayrı bir
modülde toplanır (`apps/api/src/common/tokens.ts`). Belirteç dosyası
bağımlılıksız olduğu sürece bu döngü sınıfı doğamaz.

## 11.5b Paket Sınırı Denetimi — hangi savunma gerçekten çalışıyor

> Faz 2.2a'da ölçüldü. Buradaki rakamlar tahmin değil, kontrol deneyinin çıktısı.

`@fms/shared/server` alt yolu kurulduktan sonra `apps/web/src/App.tsx`'e kasıtlı
bir `import { loadEnv } from '@fms/shared/server'` konuldu **ve gerçekten
çağrıldı**. Dört savunma hattının hangisinin ötüğü tek tek ölçüldü:

| Savunma | Beklenti | **Ölçüm** |
|---|---|---|
| ① `apps/web` tsconfig `types: []` | kırılır | ❌ **GEÇTİ** |
| ② `sideEffects: false` (ağaç sarsma) | sızıntıyı siler | ❌ **SİLMEDİ** |
| ③ `arch:check` kısıtlı alt yol kuralı | kırılır | ✅ **YAKALADI** |
| ④ Paket dize taraması | sızıntıyı gösterir | ✅ **GÖSTERDİ** |

**① neden çalışmadı:** `types: []` Node **globallerini** (`process`, `Buffer`)
tarayıcı kodunda yasaklar. Ama sunucu modülünün *dışa aktardığı tip yüzeyi*
Node tipi içermiyorsa (`loadEnv(): Env`), üretilen `.d.ts` tarayıcı
tsconfig'iyle sorunsuz derlenir. `types: []` değerli bir kural ama **alt yol
sınırının savunması değil** — başka bir şeyi koruyor.

**② neden çalışmadı:** ağaç sarsma yalnızca **kullanılmayan** kodu siler.
Modül gerçekten çağrıldığında `sideEffects: false` hiçbir şey yapamaz.
Ölçüm: paket **229.320 → 299.370 bayt** (+%30); tarayıcı paketinde
`zod` **318**, `DATABASE_URL` **7**, `POSTGRES_PASSWORD` **3**,
`JWT_SECRET` **2** eşleşme. Faz 1.8'in çözümü bir **paketleyici
optimizasyonuydu**, yapısal bir sınır değil.

**Sonuç:** çalışan iki hat var — `arch:check` **önler**, paket taraması
**doğrular**. Faz kapanışlarında ikisi de koşulur.

> ⚠️ **Kontrol deneyi yaparken import'u KULLAN.** Yalnızca `import` yazıp
> kullanmamak (`void loadEnv;`) ağaç sarsmaya siler ve paket **bayt bayt aynı**
> kalır — deney "sızıntı yok" der ve yanlış güven üretir. 2.2a'da tam olarak bu
> oldu, ikinci deneme gerçek çağrıyla yapıldı.

> ⚠️ **Sızıntı taraması ancak `dist/` GARANTİLİ TEMİZSE bir şey kanıtlar**
> (SAPMA-011). Turbo `dist/**` çıktısını önbelleğe alır ve önbellek isabetinde
> eski varlıkları geri yükler; iki farklı derlemenin çıktısı `dist/assets/`
> içinde yan yana kalabilir. 2.2a'da kontrol deneyinin kirli paketi temiz
> paketin yanında kaldı ve tarama hâlâ `JWT_SECRET` buldu — **kanıtın kendisi
> bozuldu.** Her `build` betiği `scripts/clean-dist.mjs` ile başlar.

### ⚠️ DIŞLAMA KANITININ ÜÇ ARACI — ve hangisi ne zaman geçerli (Faz 2.8)

Bir kodun üretim paketinde **olmadığını** kanıtlamanın üç yolu var ve üçü
farklı şeyler söylüyor. Karıştırılırsa "kanıt" yanlış olur.

| Araç | Ne söyler | Ne zaman GEÇERSİZ |
|---|---|---|
| **Tanımlayıcı araması** (`grep DebugPanel`) | **hiçbir şey** | **Her zaman.** Küçültme tanımlayıcıları yeniden adlandırır; kod pakette dururken bile 0 döner |
| **Dize nöbetçisi** (`grep -F '__FMS_DEV_PANEL__'`) | o **dizge** pakette yok | Modül hiç dize literali taşımıyorsa. Desen yanlışsa da sessizce 0 döner |
| **Kaynak haritası `sources` listesi** | o **MODÜL** pakette yok | Yalnızca `sourcemap: true` ise |

**KURAL — dev-only kod dışlamasının kanıtı için nöbetçi ve kaynak haritası
`sources` listesi BİRLİKTE kullanılır. Nöbetçisi olamayan modüller için
kaynak haritası tek geçerli yöntemdir.**

**Ölçüm (Faz 2.8).** Hata ayıklama paneli iki modülden oluşuyordu:
`DebugPanel.tsx` (metin dolu) ve `log-buffer.ts` (**tek bir dize literali
yok** — saf mantık). İkincisi için nöbetçi deseni **kurulamıyordu**; "0
eşleşme" sonucu hiçbir şey söylemezdi. Kaynak haritası ikisini birden
doğrudan gösterdi:

```
node -e "const m=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));
console.log(m.sources.filter(s => s.includes('ARANAN')))" apps/web/dist/assets/*.js.map
```

| Koruma | Paket | Nöbetçi | `DebugPanel` | `log-buffer` |
|---|---|---|---|---|
| `__FMS_DEV__` (üretim) | 321.495 | 0 | **YOK** | **YOK** |
| kaldırıldı | 325.509 | 1 | **VAR** | **VAR** |

**Kontrol derlemesi İKİ YÖNLÜ olmalı:** koruma kaldırılınca kanıt
**görünmeli**, geri konunca **kaybolmalı**. Tek yönlü *"0 çıktı, demek ki
yok"* kanıt değildir — desen zaten hiç eşleşmiyor olabilir (Faz 2.7'de
küçültücünün dizeleri **ters tırnakla** yazması yüzünden tam bu oldu).

### ⚠️ "DEV-ONLY KOD ÜRETİMDE 0 BAYT" KABA BİR YAKLAŞIMDIR (Faz 2.8)

Doğru iddia *"modül pakette yok"*tur, *"paket bayt bayt aynı"* değil.
Koşullu dalın kendisi bedava değil: `{__FMS_DEV__ ? <Panel/> : null}` üretimde
`null`a katlanır ama JSX çocukları **tek eleman yerine diziye** dönüşür.

Ölçüm (2.8, üç kontrol derlemesi): panelin **kendisi 0 bayt** (kaynak
haritasıyla kanıtlı), ama paket yine de **+12 bayt** büyüdü — `+8` koşullu
dalın `null` kalıntısı, `+4` ilgisiz bir yerel değişken. Toplam **birebir
toplanıyor**.

**KURAL: açıklanamayan bayt farkı kabul edilmez, AYRIŞTIRILIR.** Rakam
açıklanabiliyorsa dışlama çalışıyordur; açıklanamıyorsa şüphelidir.

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
