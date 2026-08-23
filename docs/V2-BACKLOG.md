# V2 BACKLOG — Kapsam Dışı Kasa

> **Kural (K12):** Bu listedeki hiçbir şey v1'de yapılmaz. Ne kadar küçük görünürse görünsün.
> Geliştirme sırasında aklınıza gelen kapsam dışı her fikir buraya yazılır ve **uygulanmaz**.

## Nasıl kullanılır

Bir fikir çıktığında alttaki "Sonradan Eklenenler" bölümüne şu formatta ekleyin:

```
- **[Kısa ad]** — [1-2 cümle açıklama]
  - Nereden çıktı: Faz XX
  - Neden v1'de değil: [gerekçe]
  - Tahmini büyüklük: küçük / orta / büyük
```

---

## Planlanmış v2 Fazları

> Bu özellikler v1'de **kasıtlı olarak** kapsam dışıdır. Her fazda "bunu da ekleyelim" baskısını önlemek ve projeyi bitirmek için buradalar. v1.0.0 yayınlandıktan sonra sırayla ele alınır.

| Faz | Ad | Hedef | Tahmini Süre |
|---|---|---|---|
| **V1** | **İngilizce Dil Desteği** | i18n altyapısı Faz 5'te kurulduğu için sadece çeviri işi. Tüm namespace'lerin EN karşılığı, İngilizce ek/çoğullama, dil değiştirici. | 3–4 gün |
| **V2** | **2. ve 3. Lig Kademeleri** | 6 ülkede alt ligler (Championship, LaLiga 2, 2. Bundesliga, Serie B, Ligue 2, TFF 1. Lig + 3. kademeler). ~500 kulüp, ~15.000 oyuncu. Küme düşme zincirlerinin genişlemesi. | 6–8 gün |
| **V3** | **Milli Takım Tam Yönetimi** | Kullanıcı milli takım yönetebilir (kulüple birlikte veya yalnız). Kadro seçimi, eleme grupları, büyük turnuvalar, milli takım basını. | 5–7 gün |
| **V4** | **Oyuncu Menajeri (Agent) Derin Sistemi** | Agent kişilikleri, agent ilişki geliştirme, agent'ların oyuncu önerisi getirmesi, agent ağı, komisyon pazarlığı. | 4–5 gün |
| **V5** | **Sportif Direktör Rolü** | Transfer sorumluluğunu devretme, sportif direktörle strateji uyumu, kulüp yapısı (menajer vs. head coach modeli). | 3–4 gün |
| **V6** | **Duran Top Koreografi Editörü** | Korner ve frikikte oyuncu bazlı görev atama (sürükle-bırak saha editörü), özel rutin kaydetme, antrenmanla verimlilik artışı. | 4–5 gün |
| **V7** | **Bilet Fiyatlandırma & Ticari Gelir Yönetimi** | Bilet kategorileri, sezonluk kart, taraftar memnuniyeti dengesi, sponsorluk pazarlığı, ürün stratejisi. | 3–4 gün |
| **V8** | **Stadyum İnşaat & Taşınma** | Yeni stadyum inşası, taşınma kararı, geçici stadyum, isim hakkı satışı, tribün bazlı genişletme. | 4–5 gün |
| **V9** | **Maç Motoru S4 Yükseltmesi** | Sürekli konum simülasyonu (1 sn tik), gelişmiş oyuncu karar ağaçları, gerçek pas ağları, oyuncu bazlı ısı haritası hassasiyeti, gelişmiş taktik etkileşimleri. | 12–15 gün |
| **V10** | **Taraftar Grupları & Derbi Atmosferi** | Taraftar grupları (ultras), koreografi, protesto, taraftar temsilcisiyle iletişim, derbi haftası özel atmosferi ve baskısı. | 4–5 gün |
| **V11** | **LLM Destekli Metin Çeşitliliği (Opsiyonel)** | Basın ve diyalog metinlerinde şablon yerine LLM üretimi — tamamen opsiyonel, kapatılabilir, yerel model desteği (Ollama). Kararlar hâlâ kural tabanlı kalır. | 5–6 gün |
| **V12** | **Mağaza Uygulaması (Capacitor)** | iOS/Android native paketleme, push bildirim, offline mod, mağaza yayını. | 6–8 gün |
| **V13** | **Ölçekleme** | *(Açık kayıt, anti-hile, moderasyon ve KVKK/GDPR zaten v1'de.)* Ücretsiz kademe sınırlarına dayanınca: yatay ölçekleme (çoklu worker düğümü), okuma replikası, R2 üzerinden CDN önbellekleme, veritabanı bölümleme, yük dengeleme, ölçek testi. **Ancak burada maliyet sıfır kalmayabilir** — tetiklendiğinde birlikte karar verilir. | 8–10 gün |
| **V14** | **Veri Güncelleme Hattı** | Her yeni gerçek sezon için otomatik veri güncelleme, sürüm karşılaştırma, mevcut kayıtları etkilemeden yeni kariyer verisi güncelleme. | 4–5 gün |

**v2 toplam tahmin:** ~75–95 gün.

---

## Sonradan Eklenenler

- **tsgo — bloke etmeyen hızlı tip kontrolü** — TypeScript 7'nin Go tabanlı derleyicisini
  (`tsgo`) CI'da `tsc`'nin yanında **ikinci ve bloke etmeyen** bir kontrol olarak koşturmak.
  ~10× hız avantajını erken uyarı olarak kullanır, kaynak-doğru derleyici `tsc` kalır.
  - Nereden çıktı: Faz 1, alt görev 1.0 (sürüm doğrulaması)
  - Neden v1'de değil: TypeScript 6.0.3'te kilitliyiz (ADR-0003). İki derleyiciyi paralel
    tutmak CI karmaşıklığı ekler ve Faz 1'in amacı zemin kurmak, hız optimizasyonu değil (K12).
    TS 7.1 programatik API'yi getirdiğinde zaten tek derleyiciye geçilerek çözülebilir.
  - Tahmini büyüklük: küçük

---

## Not: Veri Paketleri v1'dedir

Gerçek veri (armalar, portreler, isimler, formalar, stadyumlar) **v2'de değil, v1'dedir**.
`DATA_MODE=full` varsayılandır ve veri paketi hattı Faz 7-9 ile Faz 11'de kurulur.
Spesifikasyon: `docs/spec/12-data-packs.md`

v2'ye kalan tek veri konusu **V14 — Veri Güncelleme Hattı**: her yeni gerçek sezon için
otomatik güncelleme ve mevcut kayıtları etkilemeden yeni kariyer verisi yenileme.

