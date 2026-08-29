<!-- Bu dosya ana spesifikasyondan üretilmiştir. Kaynak: docs/MASTER-SPEC.md -->

# 3. VERİTABANI ŞEMASI

Drizzle ORM. Tüm tablolar `snake_case`. Her tablo `created_at` ve `updated_at` taşır (aksi belirtilmedikçe).

## 3.0 Migration Disiplini — neden `down` yazmak `up` yazmaktan zor

> **Bu bölüm Faz 3.0'da eklendi.** `PROJECT_MEMORY.md` Faz 2 kaydı *"migration
> `down` yazmak `up` yazmaktan zordur"* uyarısını taşıyordu ama **gerekçesiz**:
> önerme olarak veriliyor, açıklanmıyordu. Faz 3 açılışında bu bir hafıza boşluğu
> olarak tespit edildi ve gerekçe buraya yazıldı — bir sonraki oturum aynı boşluğu
> yeniden keşfetmesin.

**Asimetri bilgi kaybındadır.** `up` ileri yönde bilgi **ekler**: yeni tablo, yeni
sütun, yeni kısıt. Ekleme işlemi kendi kendini tanımlar — hedef durum şemada yazılıdır.
`down` ise bilgi **siler**, ve silinen bilgi kendiliğinden geri gelmez:

| `up` ne yaptı | `down`un geri alması gereken | Neden zor |
|---|---|---|
| `ADD COLUMN` | `DROP COLUMN` | Kolay görünür, ama sütundaki **veri** yok olur; `down` sonrası `up` aynı şemayı verir, aynı veriyi vermez |
| `ALTER COLUMN TYPE` (daraltma) | Eski tipe genişletme | Daraltma **kayıplı**: `text` → `varchar(8)` sonrası kesilen karakterler yok. Şema geri gelir, içerik gelmez |
| `DROP CONSTRAINT` | Kısıtı **birebir** yeniden kurma | Kısıtın tam tanımı (`CHECK` ifadesi, `ON DELETE` davranışı, ad) `up` betiğinde yazmıyorsa `down` onu **tahmin eder** |
| `DROP TABLE` | Tabloyu yeniden yaratma | Tablonun tanımı artık yalnızca *önceki* migration'da; `down` onu kopyalamak zorunda ve kopya ile asıl **ayrışabilir** |

Sonuç: `down` bir **türev** değil, ayrı bir eserdir; ve doğruluğu ancak
**çalıştırılarak** kanıtlanır. Bu yüzden kabul kriteri `up`/`down`'ı gerçek bir
Postgres örneğine karşı ister (`testcontainers`, G-03). Bir `down` betiği,
"mantıklı görünüyor" testini geçebilir ve yine de şemayı farklı bir yere bırakabilir.

**Doğrulama şekli — round-trip:** `up` → **veri yaz** → `down` → `up` → şema
başlangıçtakiyle **birebir** aynı mı? Veri yazma adımı bilerek ortada: boş bir
veritabanında `down` çalışıyormuş gibi görünen çok sayıda hata, dolu bir tabloda
`NOT NULL` veya `FOREIGN KEY` yüzünden patlar.

### `drizzle-kit` `down` migration ÜRETMEZ — ölçüldü (Faz 3.0)

`drizzle-kit@0.31.10` üzerinde ölçüldü, blogdan okunmadı:

- Komut listesinde `down` **yok**: `generate · migrate · introspect · push · studio ·
  up · check · drop · export`. (`up` = migration **dosya formatını** yükseltir,
  `drop` = journal'dan bir migration **siler** — ikisi de "geri al" değil.)
- `generate --help` bayrakları arasında `--down` **yok**.
- İki ayrı migration gerçekten üretildi; çıktı **yalnızca ileri yönlü**:

```
drizzle/0000_probe_initial.sql        -> CREATE TABLE "probe" (...)
drizzle/0001_probe_add_country.sql    -> ALTER TABLE "probe" ADD COLUMN "country" text NOT NULL;
drizzle/meta/0000_snapshot.json
drizzle/meta/0001_snapshot.json
drizzle/meta/_journal.json
```

**Ama `down` körlemesine yazılmıyor.** Her migration'ın yanında `meta/NNNN_snapshot.json`
duruyor: şemanın o adımdan **sonraki tam ve makine-okunur hâli** (`tables`, `enums`,
`schemas`, `sequences`, `views`, `policies` … ve `prevId` ile zincirlenmiş). Yani
N numaralı migration'ın `down`u = snapshot N'den snapshot N−1'e giden fark, ve
round-trip testinin beklediği durum **snapshot N−1'in kendisidir**. `down` elle
yazılır, ama karşılaştırılacağı bir **doğruluk kaynağı** vardır.

## 3.1 Master World — Salt Okunur

Bu tablolar tüm kayıtlar tarafından paylaşılır. **Asla kullanıcı işlemiyle değiştirilmez** (K4).

### 3.1.0 Veri paketi sütunları — Faz 3.1'de eklendi (SAPMA-023)

`docs/spec/12-data-packs.md` §17.1 *"her varlık kaydında `source` alanı tutulur"*
diyor ve §17.3 eşleme için `key` (slug) ile `externalIds` istiyor. Aşağıdaki tablo
tanımlarının **hiçbirinde üçü de yoktu**. Sonradan eklemek on bir tabloya
`ALTER TABLE` + seed'in yeniden yazımı demekti, o yüzden Faz 3'te ekleniyor.

**Her tabloda tekrarlanmıyor; sözleşme burada.**

| Sütun | Tip | Kural |
|---|---|---|
| `key` | `text NOT NULL` | Paket eşleme anahtarı (slug). **Benzersizlik TABLO BAŞINA** — `UNIQUE (key)`, global değil |
| `source` | `text NOT NULL` | **CHECK kısıtlı**, serbest metin değil: `pack \| api \| wikidata \| openfootball \| procedural` |
| `externalIds` | `jsonb NOT NULL DEFAULT '{}'` | Zod ile doğrulanır. Alanlar `spec/12` §17.3: `wikidata`, `apiFootball`, `transfermarkt` |

**Bu üç sütunu TAŞIYAN tablolar** — pakette **kendi kaydı olarak görünen** varlıklar:
`countries` · `competitions` · `clubs` · `stadiums` · `referees`

**TAŞIMAYAN tablolar** — bir sahibine 1:1 bağlı uydular; kimlikleri sahiplerinin
kimliğidir ve onlara `clubId` üzerinden erişilir:
`club_facilities` · `club_finances_base` · `club_kits` · `rivalries` · `federations` · `kit_templates`

> `kit_templates` bilerek dışarıda: pakette değil, oyunun **kendi** 20 SVG şablonu
> (`spec/12` §17.4 *"Görsel yoksa `kit_templates` sisteminden üretilir"*). `code`
> sütunu zaten o rolü görüyor.

**Neden benzersizlik tablo başına, global değil — ölçüldü (Faz 3.1).** `spec/12`
§17.3'ün slug algoritması birebir çalıştırılıp ROADMAP Faz 8 kapsamındaki **76
gerçek ad** üzerinde denendi (6 ülke, 23 turnuva, 33 kulüp, 14 stadyum): tablo içi
çakışma **0**, tablolar arası çakışma **0**. Ama karar bu sayıdan değil, **anlamdan**
geliyor: arama her zaman *"key'i X olan KULÜBÜ bul"* biçiminde, hiçbir zaman
*"key'i X olan ŞEYİ bul"* değil — `spec/12` §17.3'ün `explicit` stratejisi anahtarı
zaten `data/clubs.json` dosyasına, yani varlık türüne **kapsamlıyor**. Global bir
kısıt, zararsız bir durumu (aynı adı taşıyan bir kulüp ve bir stadyum) yasaklar ve
karşılığında hiçbir şey kazandırmaz.

> ⚠️ **Ölçüm çakışma bulamadı ama bu benzersizliğin KANITI değil.** Örneklem 76 ad,
> hedef ~240 varlık. Algoritma kısa ve genel anahtarlar üretebiliyor — ölçülenler:
> `AC Milan` → **`milan`**, `AS Roma` → **`roma`**, `Athletic Club` → **`athletic`**.
> Bunlar başka bir varlık türüyle çakışmaya açık. `UNIQUE (key)` kısıtı bu yüzden
> **veritabanı seviyesinde** duruyor: çakışma olursa ingest **patlar**, sessizce
> yanlış varlığa bağlanmaz — `spec/12` §17.3'ün *"yanlış eşleşme = Galatasaray
> armasının Fenerbahçe'de görünmesi"* uyarısının karşılığı budur.

**`key` neden `NOT NULL`:** `DATA_MODE=clean`'de her varlık prosedürel üretiliyor ve
yine de adreslenebilir olmak zorunda (varlık dosyaları bu anahtarla isimleniyor).
Prosedürel yol da deterministik bir anahtar üretir — `SeededRng` zaten bunu
mümkün kılıyor (K2). Kısıtı gevşetmek yerine üretim yolunu zorlamak tercih edildi.

### 3.1.1 Sezon bir TABLO değil, bir `seasonYear` SÜTUNUDUR

`docs/ROADMAP.md` Faz 3'ün ilk hâli bir `competition_seasons` tablosu istiyordu.
Faz 3.1'de tarandı ve **hiçbir tüketicisi bulunamadı** (SAPMA-021). Bu spesifikasyonun
tutarlı tercihi sezonu **skaler bir tamsayı** olarak taşımaktır:

`matches.seasonYear` · `card_counters.seasonYear` · `player_stats_history.seasonYear`

Puan durumu da saklanmıyor — `matches` satırlarından **türetiliyor**. Yeni bir
tablo eklemeden önce bu deseni bozup bozmadığı sorulmalıdır.

### 3.1.2 Şema yazım kuralları — 3.4'te ölçüldü, 3.5–3.7'de genişledi

> **①–⑤ 3.4'ün, ⑥–⑦ 3.5'in, ⑧ 3.6'nın, ⑨–⑩ 3.7'nin ölçümü** (ayrıca ②'nin dördüncü satırı ve
> ayraç netleştirmesi 3.6'da eklendi); hepsi gerçek PostgreSQL 18.6'ya karşı
> alındı. Yazılmasalardı sonraki alt görevler aynı soruları yeniden sorup
> muhtemelen farklı cevaplar verirdi — ve iki farklı cevap şemada **sessiz** bir
> tutarsızlık olurdu.
>
> **Faz 3'ün şema envanteri 3.6'da kapandı (11/11).** Bu bölüm bundan sonra
> **Faz 4**'ün (`people`, `players`, sözleşmeler, personel) kaynağıdır.
>
> ⚠️ **Düzeltme (3.5):** bu paragrafın 3.4'teki hâli *"aşağıdaki dördü de"*
> diyordu, oysa kural sayısı o gün de **beşti**. Sayı düzeltildi; kuralların
> kendisine dokunulmadı. Bu bölüm 3.5 ve 3.6'nın **kaynağı** olduğu için burada
> yanlış bir sayı, okuyanı listenin sonunu aramaktan vazgeçirebilirdi.

**① `check()` DESTEKLENİYOR — ham SQL'e gerek yok.**
`drizzle-orm@0.45.2` `check`'i dışa aktarıyor ve `drizzle-kit@0.31.10` uçtan uca
üretiyor. Sonda tabloyla ölçüldü, dokümandan okunmadı:

```
CONSTRAINT "probe_source_check" CHECK ("probe"."source" IN ('pack', 'api', …))
meta/0000_snapshot.json → checkConstraints: { probe_source_check: { … } }
```

`ALTER TABLE … ADD CONSTRAINT … CHECK (…)` biçimi de üretiliyor (var olan bir
tabloya sütun eklenirken). CHECK ifadesi bir **sabit diziden türetilir**
(`packages/db/src/schema/data-pack-columns.ts`), elle yazılmaz — böylece
TypeScript tipi ile veritabanı kısıtı ayrışamaz. Ayrışma denemesi ölçüldü:
diziye altıncı bir değer eklenip migration yeniden üretilmediğinde **birim testi
1, entegrasyon testi 2 test** kırılıyor.

**② CHECK yalnızca KAPALI değer kümelerine konur.**
Ayrım spec'in kendi yazımından okunur:

| Spec'te nasıl yazılmış | Örnek | Karar |
|---|---|---|
| `'a' \| 'b' \| 'c'` — **kapalı** | `type`, `workPermitRuleKey`, `source`, `kitType` | **CHECK** |
| `UEFA, CONMEBOL...` — **açık uçlu** | `confederation` | CHECK yok |
| `// 0-200`, `// 1-100` — **sayısal aralık** | `reputation`, `footballLevel`, hakem nitelikleri | CHECK yok |
| `// 2 veya 3` — **sayısal ama KAPALI** | `kitTemplates.colorSlots` | **CHECK** (Faz 3.6) |

Sayısal aralıklar bilerek dışarıda: bir değer kümesi **sözleşmedir** (`'leauge'`
yarın da hatalıdır), bir aralık **kalibrasyondur** ve Faz 23/Faz 30 denge ayarı
onu değiştirebilir. Migration'a çakılmış bir aralık o gün `DROP CONSTRAINT`
gerektirirdi. Aralık denetiminin yeri **Faz 11 veri doğrulayıcısı**
(`pnpm validate:world`) — bu bir borç değil, konum kararıdır.

> ⚠️ **DÖRDÜNCÜ SATIR — ayraç "dize mi sayı mı" DEĞİL (Faz 3.6'da ayrıştırıldı).**
> Kural ilk yazıldığında yalnızca üç satır vardı ve *"sayısal olan CHECK almaz"*
> diye okunabiliyordu. `kit_templates.color_slots` bu okumayı bozuyor: sayısal
> ama **aralık değil**, spec onu `// 2 veya 3` diye — bir **sıralama** olarak —
> yazıyor.
>
> **Gerçek ayraç: sözleşme mi, kalibrasyon mu?** Slot sayısı SVG şablon
> sisteminin **yapısıdır**; dördüncü bir yuva ancak 20 şablonun yeniden
> çizilmesiyle gelir, bir denge ayarıyla değil. Bu yüzden CHECK aldı.
> Karşılaştır: aynı migration'daki altı hakem niteliği (1-20) **almadı**, çünkü
> onlar Faz 26'nın kalibre edeceği ölçekler.
>
> **Kural (somut):** *"bu değeri yarın bir denge ayarı değiştirebilir mi?"*
> Cevap **evet** ise CHECK yok; **hayır, ancak sistem yeniden tasarlanırsa**
> ise CHECK var.

**⑧ SÖZLÜK TABLOLARI `ON DELETE` İKİLİSİNİN DIŞINDA — RESTRICT (Faz 3.6).**
③'ün ayrımı (uydu CASCADE / bağımsız varlık RESTRICT) `key` taşıyıp taşımamaya
dayanıyor ve **üçüncü bir sınıfı görmüyor**: `kit_templates` `key` taşımıyor ama
hiçbir şeyin uydusu da değil — **sahipsiz bir sözlük tablosu**. ③ körlemesine
uygulansaydı `club_kits.template_id` CASCADE alırdı ve bir şablon silindiğinde
kulübün forma satırı **alakasız bir sebeple** yok olurdu.

**Kural:** bir FK'nın hedefi bir sözlük/tanım tablosuysa (`kit_templates` ve
Faz 4'te gelecek `injury_types`, `staff_roles` aynı sınıf) davranış
**RESTRICT**'tir: sözlük girdisi silinmeden önce ona bağlı kayıtların ele
alınması gerekir. Ölçüldü (PG 18.6): kullanılan bir şablonun silinmesi
`club_kits_template_id_kit_templates_id_fk` ile reddediliyor; kulüp silindiğinde
formalar gidiyor ama **şablon kalıyor**.

> ### ⚠️ ③ + ⑧ ARTIK ÇALIŞTIRILABİLİR — prose değil kod (Faz 3.9)
>
> Bu iki kural `packages/db/src/schema/fk-policy.ts`te **saf bir fonksiyon**
> olarak yaşıyor ve `integration/schema-constraints.itest.ts` onu gerçek
> katalogla besleyip `pg_constraint`teki davranışla karşılaştırıyor:
> **12/12 FK, 0 uyumsuzluk** (PG 18.6'da ölçüldü).
>
> **Faz 4 için önemli olan:** yeni bir FK eklendiğinde **güncellenecek bir liste
> yok**. Kural üç sınıfı katalogdan çıkarıyor:
>
> ```
> `key` var                 → independent  (ondan çıkan FK  → RESTRICT)
> `key` yok + giden FK var  → satellite    (ondan çıkan FK  → CASCADE)
> `key` yok + giden FK yok  → dictionary   (ona GİDEN FK    → RESTRICT)
> ```
>
> ⚠️ **⑧'in *"sahipsiz"* kelimesi ölçülebilir çıktı ve kuralın can alıcı noktası
> bu:** bir uydunun tanımı gereği sahibine bir FK'sı vardır; sözlük tablosunun
> **giden FK'sı yoktur**. Bu koşulu sağlayan tek tablo ölçüldüğünde
> `kit_templates` çıkıyor — yani ⑧'in adıyla saydığı tablo, **adı hiçbir yerde
> yazılmadan** bulunuyor. Faz 4'ün `injury_types` / `staff_roles` tabloları aynı
> koşulu sağlayacak.
>
> ⚠️ **Hedef denetimi kaynak denetiminden ÖNCE gelir.** `club_kits` bir uydu; ③
> körlemesine uygulansaydı `club_kits.template_id` **CASCADE** alırdı ve bir
> şablon silindiğinde kulübün forma satırı alakasız bir sebeple yok olurdu.
> Mutasyonla doğrulandı: hedef denetimi kaldırıldığında 2 birim + 1 entegrasyon
> testi kırılıyor ve uyumsuzluk FK'yı adıyla gösteriyor.
>
> ℹ️ Elle yazılmış tam envanter testi **korundu**. İkisi farklı şey söylüyor:
> liste *"bugün şunlar var"*, kural *"olması gereken bu"*. Yalnızca kural
> kalsaydı, kuralın kendisi yanlış olduğunda hiçbir şey ötmezdi.

**⑨ İNDEKS İFADESİ `IMMUTABLE` İSTER — ve `unaccent` DEĞİL (Faz 3.7).**
PostgreSQL indeks ifadesinde `IMMUTABLE` olmayan fonksiyon kabul etmiyor
(`ERROR: functions in index expression must be marked IMMUTABLE`). Türkçe arama
`unaccent` gerektiriyor ve o **`STABLE`**. Ölçüldü: **iki aşırı yükleme de**
öyle — sözlüğü açıkça veren `unaccent(regdictionary, text)` biçimi de kurtarmıyor
(`pg_proc.provolatile = 's'`, iki indeks denemesi de aynı hatayla kırıldı).

Çözüm bir sarmalayıcıyı `IMMUTABLE` işaretlemek. **Bu bir iddiadır ve tam olarak
doğru değildir:** `unaccent.rules` bir majör yükseltmede değişebilir ve indeks
eski normalleştirmeyle kalır — arama **sessizce** yanlış sonuç verir, düzeltmesi
`REINDEX`.

**Kural:** doğru olmadığını bildiğin bir işaret koyuyorsan, o işaretin bedeli
**gürültülüye çevrilir**. Burada bir entegrasyon testi sarmalayıcının çıktısını
sabit bir Türkçe karakter kümesi için iddia ediyor; sözlük değişirse CI kırılır,
yani hata dağıtımdan **önce** görülür. *Bir yalanı kabul etmek, onu izlemeyi
kabul etmektir.*

⚠️ **İkinci tuzak, aynı yerde:** indeks ifadesi ile sorgu ifadesi **birebir**
aynı olmak zorunda. Ayrışırlarsa sorgu **doğru cevabı vermeye devam eder**,
yalnızca ardışık taramaya düşer ve hiçbir kapı ötmez (D3). Bu yüzden ifade tek
bir yerde üretilir (`packages/db/src/schema/search.ts`) ve hem indeks hem sorgu
oradan okur. Mutasyonla ölçüldü: ifadedeki `lower()`/`unaccent` **sırası**
değiştirildiğinde *"arama doğru sonucu buluyor"* testi **geçmeye devam etti**,
yalnızca plan testi kırıldı.

**⑩ UZANTI `down`U — PostgreSQL FAZLA GİTMEYİ KENDİSİ ENGELLİYOR (Faz 3.7).**
`CREATE EXTENSION IF NOT EXISTS` idempotent (ölçüldü). `down` uzantıyı
**düşürür** (§3.0: önceki duruma dönülür) ve `CASCADE` **kullanılmaz**. Ölçüldü:
bağımlı bir indeks varken `DROP EXTENSION` (CASCADE'siz) **reddediliyor**
(`cannot drop extension pg_trgm because other objects depend on it`).

Bu, `DROP TABLE`tan **farklı ve daha güvenli** bir durum: 3.2b'nin *"fazla giden
`down`"* sınıfı burada **yapısal olarak imkânsız** — sıra yanlışsa gürültülü
patlar, sessizce fazla götürmez. `CASCADE` yazmak tam da bu korumayı kapatırdı.
`down` sırası yine ⑦: indeksler → fonksiyon → uzantılar.

**③ `ON DELETE` — uydu CASCADE, bağımsız varlık RESTRICT.**
`spec/01` ve ROADMAP `ON DELETE` için hiçbir şey söylemiyordu (arandı, yok) ama
Faz 3'ün 3. kabul kriteri *"tanımlı"* olmasını istiyor. Kural §3.1.0'ın zaten
yaptığı ayrımı takip ediyor:

| Tablo sınıfı | `ON DELETE` | Gerekçe |
|---|---|---|
| **Uydu** (`key` taşımayan) | `CASCADE` | Kimliği sahibinin kimliğidir; sahibi gidince tek başına anlamı kalmaz |
| **Bağımsız varlık** (`key` taşıyan) | `RESTRICT` | Pakette kendi kaydı var; sessizce silinmemeli, silen taraf önce onu ele almalı |

3.4'te ölçüldü: `federations.country_id` → CASCADE (ülke silinince federasyon da
gitti), `competitions.country_id` → RESTRICT (yarışması olan ülke silinemedi).

**④ ⚠️ SÜTUN SIRASI: TS tanımı FİZİKSEL sırayı izler.**
`ALTER TABLE ADD COLUMN` sütunu tablonun **sonuna** ekler; `drizzle-kit` ise
`meta/NNNN_snapshot.json`'a **TS tanımındaki** sırayı yazar. İkisi ayrışırsa
§3.0'ın *snapshot ↔ gerçek şema* karşılaştırması kırılır — o karşılaştırmanın
kapsamına **sütun sırası** dahil.

Ölçüldü (PG 18.6): `countries`e sekiz sütun eklendi, fiziksel sıra
`id · key · code · name_key · created_at · updated_at · source · …` oldu. Sütunlar
mantıksal sırada yazılsaydı snapshot yalan söylerdi.

**Kural:** var olan bir tabloya sütun eklerken sütun, TS tanımının da **sonuna**
yazılır — `created_at`/`updated_at` ortada kalsa bile. Bedeli okunabilirlik,
kazancı **bir değişmez**: şema dosyasındaki sıra tablonun gerçek sırasıdır.

**⑤ ⚠️ `DROP COLUMN` sütun NUMARASINI geri kazanmaz.**
`information_schema.columns.ordinal_position` PostgreSQL'de `pg_attribute.attnum`
ile aynıdır ve `DROP COLUMN` delik bırakır. Sekiz sütun düşüp yeniden eklenince
numaralar **7…14 → 15…22** oluyor; **sıra** değişmiyor.

Sonuç: tek bir `ALTER` migration'ının `down`/`up` çevriminde `identical: true`
**beklenmez**. Bu bir kusur değil, PostgreSQL'in davranışıdır. Doğru iddia
biçimi: farkların **tam listesini** sabitlemek (fazlası varsa `down` fazla
gidiyor demektir) — `packages/db/integration/round-trip.itest.ts`. Tam zincir
geri alması (tablo düşüp yeniden yaratıldığı için) `identical: true` verir.

> ⚠️ **Simetrik sonuç (Faz 3.5'te ölçüldü):** yalnızca `CREATE TABLE` içeren bir
> migration'ın çevriminde `identical: true` **beklenir**. `0002_club_core`'un
> beş tablosu düşüp yeniden yaratılıyor, yani `attnum`lar 1'den başlıyor ve
> delik kalmıyor. İki beklenti **ayrı testlerde** tutuluyor: birleştirilselerdi
> 0002'nin fazla giden bir `down`u, 0001'in bilinen sekiz farkının arkasında
> *"zaten fark bekliyorduk"* diye okunurdu.

**⑥ `bigint` SÜTUNLARI `{ mode: 'bigint' }` ALIR — `'number'` DEĞİL.**
Drizzle'ın `bigint()`i bir mod istiyor ve **ikisi de aynı DDL'i üretiyor**
(`getSQLType()` → `bigint`), yani seçim migration'ı değil yalnızca JS
tarafındaki eşlemeyi değiştiriyor. Gerçek PG 18.6'ya karşı ölçüldü:

| Yol | `9007199254740993` (2⁵³+1) | `9223372036854775807` (int8 üst sınırı) |
|---|---|---|
| Ham `postgres.js` | `'9007199254740993'` (dizge) ✅ | `'9223372036854775807'` ✅ |
| Drizzle `mode: 'number'` | `9007199254740992` ❌ | `9223372036854776000` ❌ |
| Drizzle `mode: 'bigint'` | `9007199254740993n` ✅ | `9223372036854775807n` ✅ |

`mode: 'number'` sürücünün dizgesini `Number(value)` ile daraltıyor (kaynaktan
okundu: `drizzle-orm/pg-core/columns/bigint.js`) — hata fırlatmıyor, **sessizce
yanlış sayı** döndürüyor. Para (kuruş/cent) için bu, aşağı akışta hiçbir zaman
tespit edilemeyecek bir hata sınıfıdır.

**Bedeli yazılı olmalı:** `bigint` JS'te `number` ile karışmaz (`1n + 1` →
`TypeError`) ve `JSON.stringify` onu serileştiremez. Para taşıyan her sınır
(Faz 12 `WorldView`, Faz 30 piyasa değeri) dönüşümü **açıkça** yapmak zorunda —
sessiz hassasiyet kaybı yerine gürültülü tip hatası.

**⑦ ELLE YAZILAN `down` BAĞIMLILIK ZİNCİRİNİ TERSTEN SÖKER — ve `CASCADE` kullanmaz.**
`DROP TABLE` (CASCADE'siz) kendisine bakan bir FK varken **reddedilir**
(`cannot drop table X because other objects depend on it` — PG 18.6'da ölçüldü,
tablo adı mesajda **tırnaksız**). 0000 ve 0001'de sıra bir okunabilirlik
tercihiydi; `0002_club_core` iki katmanlı bir zincir getirdi
(`rivalries`/`club_facilities`/`club_finances_base` → `clubs` → `stadiums`) ve
orada sıra **zorunlu**.

`DROP TABLE … CASCADE` sırayı gereksiz kılardı ama bu migration'ın **yaratmadığı**
nesneleri de sessizce götürür — 3.2b'nin *"fazla giden `down`"* sınıfının ta
kendisi: hiçbir hata çıkmaz, şema sessizce eksilir ve yalnızca karşılaştırma
yakalar. Açık sıra, `CASCADE`in gizlediği bağımlılığı görünür kılıyor.

Sıranın gerekliliği **varsayılmaz, sınanır**: `round-trip.itest.ts` yanlış sıralı
bir fixture `down`unun patladığını ölçüyor, gerçek `down` ise dolu tablolarla
sorunsuz koşuyor — nöbetçi iki yönlü.

`DROP TABLE` tabloya ait kısıtları (PK, UNIQUE, CHECK, FK) zaten götürür; kısıt
ayrıca düşürülmez. 0001'de CHECK'ler açıkça düşürülüyordu çünkü orada tablo
değil **sütun** düşüyordu ve kısıt tabloya aitti, sütuna değil.

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
  simulationPolicy: 'balanced'|'full'   // SimulationPolicy — kayıt başına.
                                        // EngineTier (full|medium|statistical)
                                        // ile karıştırma: bkz. spec/03 §5.2
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

**Tip zorlaması:** `WorldView` dönüşleri `DeepReadonly<T>`. Master tablosuna Drizzle `update`/`insert` çağrısı yapan kod, `db.master` salt-okunur istemcisi ve tablo markası ile engellenir (§3.4.1).

### 3.4.1 K4'ün uygulanışı — Faz 3.3'te kuruldu, 3.4'ten itibaren ZORUNLU biçim

> **Bu bölüm 3.4/3.5/3.6'nın uyacağı sözleşmedir.** Yeni bir master tablo eklerken
> aşağıdaki üç adım zorunludur; üçüncüsü unutulursa `arch:check` kırılır.

**① Tablo `masterTable(...)` ile SARILARAK tanımlanır:**

```ts
import { masterTable } from '../client/master.js';

export const countries = masterTable(
  pgTable('countries', { … }),
);
```

`masterTable()` çalışma zamanında **kimlik fonksiyonudur** — aynı nesneyi döner,
şemaya hiçbir şey eklemez. Tek işi görünmez bir marka (`unique symbol`) ile tipi
daraltmaktır.

> ⚠️ **`is_master = true` gibi bir SÜTUN kullanılmıyor** — ROADMAP Faz 3'ün ilk
> hâli bunu istiyordu. Hiçbir şeyin tüketmediği bir bayrak bir **temennidir**
> (Faz 2 §5 **D3**) ve `spec/09` §11.5'in *"bir yol yanlış tarafa düşerse hangi
> test kırılır?"* testini geçemez. Ayrıca her satırda tekrarlanan sabit bir
> değer, hiçbir sorgunun kullanmadığı ölü depolamadır.

**② Save katmanı tablosu ise muafiyet AÇIKÇA yazılır:**

```ts
// arch:save-scoped — Faz 12: kullanıcıya özel, yazılabilir.
export const saveDeltas = pgTable('save_deltas', { … });
```

Varsayılan **muaf değildir**. Sessiz bir varsayılan, *"unuttum"* ile *"bilerek"*
arasındaki farkı yok ederdi.

**③ İki istemci — hangisi neye erişir:**

| İstemci | `select` | `insert`/`update`/`delete` |
|---|---|---|
| `db.master` | ✅ | **tipte YOK** |
| `db.writable` | ✅ | yalnızca **master OLMAYAN** tablolarda; master verilirse parametre tipi `never` |

İkisi iki ayrı kaçış yolunu kapatıyor: yanlış istemciyi seçmek (`master`da metot
yok) ve doğru istemciyle yanlış tabloya yazmak (parametre `never`). Yalnızca
birincisi olsaydı, yazılabilir istemciyle master tabloya yazmak derlenirdi — ve
K4 istemciyi değil **tabloyu** koruyor.

#### İDDİA KONTROL DENEYİYLE KANITLANDI (SAPMA-012 dersi)

K4 *"tip seviyesinde derlenmez"* diyor; bu bir **iddiadır**. Faz 2'de benzer bir
iddia (*"üç kat savunma"*) ölçümle çürütülmüştü. Bu yüzden zorlama kendi kendini
denetliyor: `packages/db/src/client/master-write-control.test-d.ts` bilerek
master'a yazan kod içeriyor ve her satır `@ts-expect-error` ile işaretli —
**koruma kaybolursa derleyici *"Unused '@ts-expect-error' directive"* der ve
`pnpm typecheck` KIRILIR.**

Mutasyonla ölçüldü (Faz 3.3):

| Mutasyon | Sonuç |
|---|---|
| `RejectMaster<T>` köreltildi (her tabloyu kabul et) | **4 × `TS2578`** |
| `countries`ten `masterTable(...)` sarması kaldırıldı | **3 × `TS2578`** + kullanılmayan import |
| (mutasyon yok) | `tsc` **exit 0** |

Dosya ayrıca **karşı örnek** taşıyor: master olmayan bir tabloya yazma satırları
`@ts-expect-error` **taşımıyor** ve derlenmeli. Taşımasalardı *"her şey
reddediliyor"* durumundan ayırt edilemezdi — nöbetçi iki yönlü doğrulanır.

#### TİP SİSTEMİNİN GÖREMEDİĞİ ŞEY: İŞARETLEMEYİ UNUTMAK

İşaretlenmemiş bir tablo yazılabilir kalır ve derleyicinin şikâyet edeceği bir şey
yoktur — **görecek bir marka yoktur.** 3.3'te ölçüldü: `countries`ten sarma
kaldırılınca kontrol deneyi ötüyor, ama **yalnızca o dosya `countries`i adıyla
andığı için.** 3.4'te eklenecek yeni bir tablo sarmayı unutursa hiçbir şey ötmez.

O boşluğu **`arch:check` ⑨ `master-table-marking`** kapatıyor: bu dizindeki her
`pgTable(...)` ya sarılı ya da `arch:save-scoped` ile muaf olmalı.

#### İKİNCİ HAT: VERİTABANI ROLÜ — mekanizma ölçüldü, kurulum Faz 12 (BORÇ-007)

Tip seviyesi **derleme zamanında** korur. Üç yol onu atlar: `as unknown as`
dönüşümü · `SqlExecutor` üzerinden ham SQL · tip sistemini hiç görmeyen bir
istemci (`psql`, bakım betiği).

Veritabanı rolü o üçünü de kapatıyor ve **ölçüldü** (PG 18.6,
`packages/db/integration/master-readonly.itest.ts`):

| Rol | `SELECT` | `INSERT` / `UPDATE` / `DELETE` (**ham SQL**) |
|---|---|---|
| Sahip (migration, seed) | ✅ | ✅ |
| Uygulama rolü (`GRANT SELECT` yalnızca) | ✅ | ❌ `permission denied` |

**Bugün KURULMUYOR:** kısıtlanacak bir uygulama bağlantısı yok — `apps/api`
veritabanına Faz 12'de bağlanıyor. Tüketicisi olmayan bir rol yazmak,
SAPMA-017'nin reddettiği spekülatif yapılandırma olurdu. Ama mekanizma bugün
kanıtlandı ki Faz 12 yeniden keşfetmek zorunda kalmasın → **BORÇ-007**.

#### NE KORUNUYOR, NE KORUNMUYOR

K4 *"asla **kullanıcı işlemiyle** değiştirilmez"* diyor. Korunan şey budur:

| Yol | Durum | Neden |
|---|---|---|
| Oyun kodu (`db.writable`) | **KAPALI** — derlenmiyor | K4'ün asıl konusu |
| Migration koşucusu (`SqlExecutor`) | **AÇIK** | Şemayı değiştirmek migration'ın **tanımı**; kapatmak migration'ı imkânsız kılardı |
| Seed / veri aracı (`tools/data-cli`, Faz 3.8) | **AÇIK** | Master veriyi **dolduran** hat; K9 gereği veri paketlerinden gelir |

Bu ayrım yazılmasaydı *"hiçbir şey master'a yazamaz"* gibi tutulamaz bir söz
verilmiş olurdu. **Tutulamayan bir söz, hiç verilmemiş bir sözden kötüdür.**

#### ⚠️ Faz 12'YE NOT: `Readonly<T>` SIĞDIR — ölçüldü

§3.4 `DeepReadonly<T>` istiyor ve bu **bilinçli**: TypeScript'in yerleşik
`Readonly<T>`si yalnızca üst seviyeyi korur. Ölçüm koşulabilir hâlde
(`packages/db/src/client/readonly-depth.test-d.ts`) ve şunları **derliyor**
(yani mutasyona açık):

```ts
declare const row: Readonly<{ rules: { maxForeign: number }; tags: string[] }>;
row.rules.maxForeign = 99;   // ✅ derleniyor — iç nesne KORUNMUYOR
row.tags.push('yeni');       // ✅ derleniyor — dizi KORUNMUYOR
row.id = 2;                  // ❌ hata — yalnızca üst seviye korunuyor
```

Faz 3'te önemli çünkü `competitions.rules` bir `jsonb` sütunu (3.4) ve
`CompetitionRules` iç içe: `squadRegistration`, `continentalSpots`,
`transferWindows[]`. `WorldView` gerçek bir `DeepReadonly` yazmak zorunda —
`Readonly` yetmez.

---
