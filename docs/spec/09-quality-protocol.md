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
| Entegrasyon | Vitest + testcontainers | API + DB | Gerçek Postgres ile uçtan uca modül |
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
> | 6 | 7 × `tsconfig.build.json` → `exclude` | Testler `dist`'e girmesin | **parantez YOK** |
> | 7 | `tools/arch-check/index.mjs` → taranan uzantılar | Hangi dosyalar denetlenir | düz dizi |
> | 8 | `tools/arch-check/index.mjs` → `checkImportCasing` adayları | `.js→.ts`, `.mjs→.mts`, `.cjs→.cts` | düz dizi |
>
> **Ölçülmüş ders (2.1):** 7. satırdaki listede `.cts` eksikti ve sonuç sessizdi —
> ihlal içeren bir `.cts` dosyası konulduğunda `arch:check` **"temiz"** dedi
> (negatif testle kanıtlandı: eski listeyle `✓ temiz`, yeni listeyle
> `✖ 1 ihlal`). Bir denetleyicinin "temiz" çıktısı, dosyaya **bakıldığını**
> söylemez. Uzantı listesi olan her denetleyici için soru şudur:
> *"bu kural hangi dosyalar için geçerli?"* — *"bugün hangi uzantılar var?"* değil.
>
> **`tools/` kapsam eşiğine dahil DEĞİLDİR.** `coverage.include` yalnızca
> `*/src/**` desenini alır; geliştirme araçları (`arch-check`, `eslint-local-rules`)
> test edilir ama ürün kodu sayılmaz ve %70/%85 eşiklerine girmez.

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
