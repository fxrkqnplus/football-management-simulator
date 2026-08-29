<!-- Bu dosya ana spesifikasyonun bir parçasıdır. -->

# 17. VERİ PAKETLERİ VE GERÇEK VARLIK HATTI

> **Amaç:** Oyunun tam gerçek veriyle çalışması — gerçek kulüp armaları, oyuncu fotoğrafları,
> isimler, formalar, stadyumlar, lig ve kupa logoları, ülke bayrakları.
> Bu, `DATA_MODE=full` modunun (varsayılan) spesifikasyonudur.

---

## 17.1 Veri Modları

```
DATA_MODE=full   →  LocalPack birincil, prosedürel yalnızca yedek     (VARSAYILAN)
DATA_MODE=clean  →  Prosedürel birincil, paket yok
```

`full` modda sağlayıcı zinciri:

```
1. LocalPackProvider      /data/packs/<ACTIVE_PACK>/  — en yüksek öncelik
2. ApiFootballProvider    resmi API (anahtar varsa)
3. WikidataProvider       CC0 olgusal veri + Commons görselleri
4. OpenFootballProvider   lig/kulüp/fikstür yapısı
5. ProceduralProvider     YEDEK — yalnızca yukarıdakiler bulamazsa
```

Her varlık kaydında `source` alanı tutulur
(`pack` | `api` | `wikidata` | `openfootball` | `procedural`).
Veri Editörü'nde hangi varlığın nereden geldiği görünür — eksikleri kapatmak kolaylaşır.

> ⚠️ **DÜZELTME (Faz 4.0, SAPMA-029) — bu liste `openfootball`'ı ATLAMIŞTI.**
> Satır **dört** değer sayıyordu ve **kendi sağlayıcı zinciriyle** çelişiyordu: on beş
> satır yukarıdaki zincir **beş** sağlayıcı listeliyor ve dördüncüsü
> `OpenFootballProvider`. Yani bir varlık ondan gelseydi yazılacak `source` değeri
> **yoktu**. Doğru küme `docs/spec/01` §3.1.0'da (Faz 3.1, SAPMA-023) beş değerle
> tanımlandı ve `packages/db/src/schema/data-pack-columns.ts` → `DATA_SOURCES` bir
> **CHECK kısıtıyla** onu zorluyor. Aynı yanlış değer `docs/ROADMAP.md` Faz 7 kabul
> kriterinde de duruyordu — bir **kabul kriteri**, yani en yetkili yer — ve aynı alt
> görevde düzeltildi (`spec/11` §12.4: bir düzeltme, sınıfının geçtiği **her** yeri
> kapsar).
>
> ℹ️ **Altıncı bir değer sorusu AYRI bir konudur ve birleştirilmedi:** elle yazılan
> bootstrap seed verisi hiçbir sağlayıcıdan gelmiyor (Faz 3.8 `procedural` seçti).
> Kaydı `docs/SPEC-COVERAGE-GAPS.md` **G-14**, karar yeri **Faz 7**.

**Prosedürel üretim asla kaybolmaz.** Newgen oyuncular (Faz 40) ve pakette olmayan varlıklar
için her zaman gerekir. Gerçek veriyle birlikte çalışır.

---

## 17.2 Paket Klasör Yapısı

```
/data/packs/<pack-id>/
├── pack.json                    # manifest — zorunlu
├── data/
│   ├── countries.json
│   ├── competitions.json
│   ├── clubs.json
│   ├── stadiums.json
│   ├── players.json
│   ├── staff.json
│   └── kits.json
└── assets/
    ├── crests/                  # <clubKey>.png | .svg      512×512
    ├── portraits/               # <playerKey>.png           256×256
    ├── kits/                    # <clubKey>-home.png        400×400
    │                            # <clubKey>-away.png
    │                            # <clubKey>-third.png
    ├── competitions/            # <competitionKey>.png      256×256
    ├── trophies/                # <competitionKey>.png      512×512
    ├── flags/                   # <countryCode>.svg          4:3
    ├── stadiums/                # <stadiumKey>.jpg          1200×675
    └── managers/                # <managerKey>.png          256×256
```

### `pack.json`

```jsonc
{
  "id": "tr-full-2026",
  "name": "Türkiye + Avrupa Tam Paket 2026-27",
  "version": "1.0.0",
  "author": "...",
  "createdAt": "2026-08-23",
  "gameDataVersion": "1.0",        // uyumluluk kontrolü
  "season": 2026,
  "scope": {
    "countries": ["TUR","ENG","ESP","GER","ITA","FRA"],
    "competitionCount": 21,
    "clubCount": 118,
    "playerCount": 3547
  },
  "assets": {
    "crests": 118, "portraits": 3102, "kits": 354,
    "competitions": 21, "trophies": 21, "flags": 6, "stadiums": 94
  },
  "keyStrategy": "slug",           // slug | explicit | hybrid
  "priority": 100                  // birden fazla paket varsa yüksek olan kazanır
}
```

---

## 17.3 Anahtar Eşleme (En Kritik Kısım)

Paketteki varlıklar oyundaki varlıklarla **eşleştirilmelidir**. Yanlış eşleşme = Galatasaray
armasının Fenerbahçe'de görünmesi. Üç strateji:

### `slug` (varsayılan)
İsim normalize edilerek anahtar üretilir:

```ts
function slugify(name: string): string {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // aksan kaldır
    .replace(/ı/g,'i').replace(/İ/g,'i')               // Türkçe İ/ı özel durumu
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ö/g,'o').replace(/ç/g,'c')
    .toLowerCase()
    .replace(/\b(fc|sk|ac|as|cf|sc|afc|cd|ud|ssc|club|kulubu|kulübü|spor)\b/g,'')
    .replace(/[^a-z0-9]/g,'')
    .trim();
}
// "Galatasaray S.K." → "galatasaraysk"   ⚠️ aşağıya bakınız
// "Beşiktaş JK"      → "besiktasjk"      ⚠️ aşağıya bakınız
// "FC Bayern München"→ "bayernmunchen"
```

> ⚠️ **DÜZELTME (Faz 3.1, SAPMA-022) — bu örneklerin ikisi YANLIŞTI.**
> Yukarıdaki fonksiyon **birebir kopyalanıp çalıştırıldı**; kendi belgelediği üç
> örnekten **ikisini tutturmuyor**:
>
> | Girdi | Spec'in iddiası | **Ölçülen** |
> |---|---|---|
> | `Galatasaray S.K.` | `galatasaray` | **`galatasaraysk`** |
> | `Beşiktaş JK` | `besiktas` | **`besiktasjk`** |
> | `FC Bayern München` | `bayernmunchen` | `bayernmunchen` ✅ |
>
> **Sebepleri farklı ve ikisi de gerçek:**
> - `S.K.` — durak sözcük deseni `\b(…|sk|…)\b` kelime sınırı istiyor, ama dizge
>   `s.k.` biçiminde; noktalar ancak **bir sonraki adımda** siliniyor. Yani durak
>   sözcük eleme, noktalama temizliğinden **önce** çalışıyor ve kaçırıyor.
> - `JK` — durak sözcük listesinde **hiç yok**. Liste `fc sk ac as cf sc afc cd ud
>   ssc club kulubu kulübü spor` ile sınırlı; `jk`, `sk` gibi Kuzey Avrupa ve Türk
>   kısaltmaları eksik.
>
> **Ayrıca ölçüldü — Türkçe değiştirmelerin altısı ÖLÜ KOD.** `normalize('NFD')` +
> birleştirici işaret silme **önce** çalıştığı için `ş ğ ü ö ç` ve `İ` zaten
> `s g u o c` ve `I` olmuş oluyor; sonraki açık `.replace()` çağrıları hiçbir şeyle
> eşleşmiyor. **Tek istisna `ı` (U+0131, noktasız i):** kanonik ayrışması yok,
> NFD'den sağ çıkıyor — yani listedeki yük taşıyan tek satır o. Yorumdaki *"Türkçe
> İ/ı özel durumu"* ifadesi bu yüzden yarı doğru: `İ` için gereksiz, `ı` için şart.
>
> **Bu bölüm Faz 3'te DÜZELTİLMEDİ, yalnızca ölçüm kaydedildi (K12).** Algoritmanın
> tüketicisi Faz 7–9 (ingest) ve orada durak sözcük listesi gerçek paket verisiyle
> kalibre edilecek; bugün elle düzeltmek, sınanacak veri olmadan tahmin yazmak
> olurdu. **Faz 7 açılışında ilk iş bu bloğu okumaktır.**

### `explicit`
Pakette açık eşleme tablosu bulunur — en güvenilir yol:

```jsonc
// data/clubs.json
{
  "gameId": 42,                    // oyundaki kulüp id'si (varsa)
  "externalIds": {
    "wikidata": "Q170084",
    "apiFootball": 645,
    "transfermarkt": 141           // yalnızca eşleme referansı
  },
  "key": "galatasaray",
  "name": "Galatasaray",
  ...
}
```

### `hybrid`
Önce `explicit`, bulunamazsa `slug`, o da bulunamazsa **bulanık eşleme**:

```ts
// Levenshtein + token benzerliği
confidence = 0.6 × tokenOverlap + 0.4 × (1 - levenshtein/maxLen)

confidence >= 0.92  → otomatik eşle
confidence >= 0.70  → "onay bekleyen" kuyruğuna al
confidence <  0.70  → eşleşmedi
```

**Eşleşmeyen varlıklar sessizce yok sayılmaz.** İçe aktarma sonunda rapor verilir ve
Veri Editörü'nde elle eşleme ekranı açılır.

---

## 17.4 Veri Dosyası Şemaları

### `clubs.json`
```jsonc
[{
  "key": "galatasaray",
  "externalIds": { "wikidata": "Q170084" },
  "name": "Galatasaray",
  "shortName": "Galatasaray",
  "abbreviation": "GAL",
  "foundedYear": 1905,
  "city": "İstanbul",
  "stadiumKey": "ramspark",
  "colorPrimary": "#A90432",
  "colorSecondary": "#FBB800",
  "colorTertiary": "#FFFFFF",
  "reputation": 148,
  "supporterCount": 18500000,
  "chairman": "…",
  "facilities": { "trainingGround": 16, "youthAcademy": 15,
                  "youthRecruitment": 14, "medicalCentre": 15 },
  "finances": { "balance": 45000000, "transferBudget": 22000000,
                "wageBudget": 4200000, "currency": "TRY" },
  "crest": "crests/galatasaray.png",
  "rivals": [{ "key": "fenerbahce", "intensity": 10 },
             { "key": "besiktas",   "intensity": 9  }]
}]
```

### `players.json`
```jsonc
[{
  "key": "player-12847",
  "externalIds": { "wikidata": "Q…" },
  "firstName": "Victor",
  "lastName": "Osimhen",
  "commonName": "Osimhen",
  "birthDate": "1998-12-29",
  "nationality": "NGA",
  "secondNationality": null,
  "birthCity": "Lagos",
  "clubKey": "galatasaray",
  "squadNumber": 45,
  "primaryPosition": "ST",
  "positions": { "ST": "natural", "AML": "competent" },
  "heightCm": 186,
  "weightKg": 78,
  "preferredFootRight": 18,
  "preferredFootLeft": 12,
  "portrait": "portraits/player-12847.png",

  // İSTEĞE BAĞLI — verilmezse Bölüm 4'teki türetme motoru hesaplar
  "currentAbility": 162,
  "potentialAbility": 168,
  "attributes": { "finishing": 17, "pace": 17, "strength": 16, … },
  "hiddenAttributes": { "determination": 16, "professionalism": 14, … },
  "traits": ["runs_with_ball_through_centre", "attempts_overhead_kicks"],

  "contract": { "endDate": "2029-06-30", "weeklyWage": 380000,
                "currency": "EUR", "squadRole": "star",
                "releaseClause": 75000000 }
}]
```

**Nitelikler verilmezse:** Bölüm 4.3'teki istatistikten türetme motoru devreye girer.
**Verilirse:** Doğrudan kullanılır, türetme atlanır. Topluluk paketleri genelde elle
ayarlanmış nitelik içerir ve bunlar türetilmiş değerlerden daha isabetlidir.

### `kits.json`
```jsonc
[{
  "clubKey": "galatasaray",
  "home":  { "image": "kits/galatasaray-home.png" },
  "away":  { "image": "kits/galatasaray-away.png" },
  "third": { "image": "kits/galatasaray-third.png" }
}]
```
Görsel yoksa `kit_templates` sisteminden (20 SVG şablonu × 3 renk) üretilir.

---

## 17.5 Varlık İşleme Hattı

İçe aktarma sırasında her görsel şu hattan geçer:

```
1. Doğrula      → format (png/jpg/webp/svg), boyut, dosya bütünlüğü
2. Normalize    → hedef boyuta yeniden ölçekle, en-boy oranını koru
3. Kırp/Doldur  → armalar şeffaf kare, portreler yüz merkezli kırpım
4. Optimize     → WebP (kalite 88) + AVIF (kalite 72) üret
5. Boyutlar     → 3 çözünürlük: @1x, @2x, @3x
6. Yaz          → /data/assets/<tip>/<id>-<boyut>.<format>
7. İndeksle     → asset_index tablosuna kaydet (id, tip, kaynak, hash)
```

**Boyut hedefleri**

| Tip | Kaynak | Üretilen |
|---|---|---|
| Arma | 512×512 | 256 / 128 / 64 |
| Portre | 256×256 | 256 / 128 / 64 |
| Forma | 400×400 | 256 / 128 |
| Turnuva logosu | 256×256 | 128 / 64 |
| Kupa | 512×512 | 256 / 128 |
| Bayrak | SVG | SVG + 64 / 32 PNG |
| Stadyum | 1200×675 | 1200 / 600 |

**Portre yüz hizalama:** Basit yüz tespiti (opencv-wasm veya `@vladmandic/face-api`)
ile göz hizası bulunur, kırpım göz hizası üstten %38'e gelecek şekilde yapılır. Böylece
farklı kaynaklardan gelen fotoğraflar **tutarlı çerçevelenir** — estetik tutarlılığın
en önemli parçası budur.

**Tespit başarısızsa:** merkez kırpım + uyarı raporu.

---

## 17.6 Portre Tutarlılık Sorunu ve Çözümü

Bu, uzun vadeli estetiğin en kritik meselesi ve baştan çözülmelidir.

**Problem:** 1. sezonda kadronuzun tamamı gerçek fotoğraflı. 5. sezonda yarısı emekli oldu,
yerlerine newgen'ler geldi. Newgen'lerin fotoğrafı yok. Kadro ekranı yarı fotoğraf,
yarı vektör avatar — göze batar.

**Çözüm: `PORTRAIT_STYLE` ayarı (Ayarlar ekranından değiştirilebilir)**

| Mod | Davranış |
|---|---|
| `real` | Gerçek fotoğraf varsa kullanılır, newgen'ler prosedürel. **Tutarsızlık zamanla artar.** |
| `stylized` (**önerilen**) | Gerçek fotoğraflara ortak görsel işlem uygulanır: aynı çerçeveleme, hafif posterize, kulüp renginde duotone vinyet. Prosedürel portreler aynı işlemden geçer. **Yan yana konduğunda ayırt edilmez.** |
| `procedural` | Herkes vektör avatar. Tam tutarlı ama gerçek yüz yok. |

`stylized` işlemi (varlık hattının 4. adımında, opsiyonel):
```
1. Gri tona indir (luminance ağırlıklı)
2. 6 kademeye posterize
3. Kulüp renk paletinde duotone eşle (gölge → koyu renk, ışık → açık renk)
4. Radyal vinyet uygula (%18 karartma)
5. Ortak arka plan: kulüp renginde gradyan
```

Prosedürel portreler zaten bu palet ve stil hedeflenerek üretilir. Sonuç: 20. sezonda bile
kadro ekranı tek bir görsel dile sahip olur.

---

## 17.7 İçe Aktarma Akışı (Veri Editörü — Faz 11)

```
1. Paket seç      → /data/packs/ tarar veya .fmspack yüklenir
2. Manifest oku   → sürüm uyumluluğu, kapsam özeti gösterilir
3. Kuru çalıştırma→ hiçbir şey yazmadan: kaç varlık eşleşti, kaçı eşleşmedi,
                    hangi alanlar mevcut veriyi ezecek → ÖNİZLEME
4. Çakışma çözümü → alan bazlı: paketi kullan / mevcudu koru / birleştir
5. Elle eşleme    → eşleşmeyen varlıklar için arama kutulu eşleme ekranı
6. İçe aktar      → işlem (transaction) içinde, hata olursa tam geri alma
7. Varlık hattı   → görseller işlenir (ilerleme çubuğu)
8. Doğrula        → validateWorld() çalışır
9. Rapor          → içe aktarılan / atlanan / hata veren döküm
```

**Kuru çalıştırma zorunludur.** Kullanıcı ne olacağını görmeden içe aktarma yapılamaz.

---

## 17.8 Veri Kaynakları (Kişisel Kurulum İçin)

`DATA_MODE=full` çalıştırmak için gereken veriyi $0 maliyetle toplama yolları:

| Kaynak | Ne verir | Maliyet |
|---|---|---|
| **Topluluk veri paketleri** | En yüksek kalite: elle ayarlanmış nitelikler, armalar, portreler, formalar | Ücretsiz — indirip `/data/packs/` altına koyarsınız |
| **API-Football ücretsiz kademe** | Kadro, oyuncu verisi, takım logosu, oyuncu fotoğrafı | 100 istek/gün — dünya kurulumu birkaç güne yayılır, `.cache/` sayesinde tekrar maliyeti yok |
| **Wikidata (CC0)** | Doğum tarihi, boy, uyruk, mevki, kariyer geçmişi | Ücretsiz, sınırsız |
| **Wikimedia Commons** | Bayraklar, birçok kulüp arması, stadyum fotoğrafları | Ücretsiz |
| **openfootball (CC0)** | Lig yapısı, kulüp listeleri, fikstür | Ücretsiz |
| **FBref / Understat** | Maç istatistikleri → nitelik türetimi (Bölüm 4.3) | Ücretsiz |
| **Veri Editörü** | Eksik kalan her şey elle | — |

**Pratik sıralama:** Topluluk paketi varsa onunla başlayın (en zengin). Eksikleri
API-Football ücretsiz kademesi ve Wikidata kapatır. Kalan boşlukları Veri Editörü'nden
elle doldurursunuz. Hiçbir zaman kapanmayan boşluklar prosedürel üretimle dolar — oyun
asla boş ekran göstermez.

---

## 17.9 Kabul Kriterleri (Faz 8–9 ve 11'e eklenir)

- [ ] `DATA_MODE=full` ile paket yüklendiğinde kulüp armaları, oyuncu fotoğrafları,
      forma görselleri, lig logoları, kupa görselleri ve bayraklar ekranda görünüyor
- [ ] Paketteki her varlık doğru oyun varlığıyla eşleşiyor (yanlış eşleşme = 0)
- [ ] Eşleşmeyen varlıklar raporlanıyor ve elle eşlenebiliyor
- [ ] Kuru çalıştırma gerçekten hiçbir şey yazmıyor
- [ ] İçe aktarma yarıda kesilirse veritabanı tutarlı kalıyor (transaction)
- [ ] Portreler tutarlı çerçevelenmiş (göz hizası üstten %38 ±%4)
- [ ] `PORTRAIT_STYLE=stylized` modunda gerçek ve prosedürel portreler yan yana
      **ayırt edilemiyor** (gözle doğrulama, 20 örnek)
- [ ] `DATA_MODE=clean` ile aynı oyun prosedürel varlıklarla çalışıyor, hata yok
- [ ] Varlık hattı 4.000 görseli işleyip WebP + AVIF × 3 boyut üretiyor
- [ ] Eksik varlık oranı raporlanıyor
