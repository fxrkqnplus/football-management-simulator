# Alt Görev Rapor Formatı

> **Zorunlu.** Her alt görev bitiminde rapor bu formatta verilir. Başlıklar ve
> sıralama sabittir.
>
> Amaç: kullanıcı teknik detayın tamamını okumadan "devam" diyebilmeli. Karar
> gerektiren bir şey varsa bunu **ilk satırda** görmeli.

## Şablon

```markdown
## [DURUM] [alt görev no] — [alt görev adı]

**Ne yapıldı:** [TEK cümle, teknik jargon minimum]

**Kapılar:** typecheck [x] · lint [x] · test [x] · build [x] · arch [x]
**Commit:** `hash` · push [x] · ANLIK DURUM güncellendi [x]

**Kanıtlar:**
- [iddia ettiğim kapı] → [nasıl test ettim] → [sonuç]
- (Her kapı için bir satır. Test etmediysem "test edilmedi" yaz.)

**KARARIN GEREKİYOR:** YOK
   veya
**KARARIN GEREKİYOR:** [n] madde
   1. [Soru tek cümle]
      Önerim: [X]. Gerekçe: [tek cümle].
      Cevap vermezsen: [önerimi uygularım / duracağım]

**Yeni kayıt:** [SAPMA-00X / BORÇ-00X / SORUN-00X — kısa açıklama] veya "yok"

**Sıradaki:** [no] — [ad]. [Ne yapılacak, tek cümle.]

───────────────── DETAY (okumak zorunda değilsin) ─────────────────

[Teknik ayrıntılar, dosya listesi, gerekçeler, ölçümler buraya.
Yukarıdaki özet bu bölüm olmadan da anlaşılır olmalı.]
```

## Durum işaretleri

| İşaret | Anlamı |
|---|---|
| 🟢 **TAMAM** | Her şey yolunda, karar gerekmiyor, "devam" demek yeterli |
| 🟡 **KARAR** | İş bitti ama devam etmeden önce kullanıcının kararı gerekli |
| 🔴 **BLOKE** | Devam edilemiyor; bir şey kırık veya çelişkili |
| ⚪ **KISMİ** | İşin bir kısmı yapıldı, gerisi bilerek ertelendi (gerekçesi yazılı) |

## Kurallar

- 🟢 kullanmak için **üçü birden**: tüm kapılar yeşil **ve** hiçbir karar
  beklemiyor **ve** kabul kriterlerinin tamamı sağlandı. Şüphedeysen 🟡 kullan.
- 🟡'da sorular **numaralı** verilir; her birine kendi önerisi ve gerekçesi
  yazılır. "Ne yapmamı istersin?" diye açık uçlu sorulmaz — seçenek sunulur.
- 🔴'da üçü birden yazılır: ne kırık, ne denendi, ne öneriliyor.
- Özet bölümü **20 satırı geçmez**. Uzun anlatım DETAY'a gider.
- **ANLIK DURUM güncellenmeden alt görev kapanmaz** (K15) — `PROJECT_MEMORY.md`
  içindeki blok her alt görev sonunda yeniden yazılır.
- **Kanıtlar bölümünde test edilmemiş bir kapı test edilmiş gibi yazılmaz.**
  "test edilmedi" yazmak, yanlış "✅"den iyidir.
- **Bir kapı koştu ama BAKACAK BİR ŞEY BULAMADIYSA bu onay değildir** (Faz 3.2a,
  SAPMA-024). Somut vaka: `.prettierignore` `*.md` taşıyor, yani belge ağırlıklı
  bir alt görevde `pnpm format:check` **değişen hiçbir dosyaya bakmadan**
  `All matched files use Prettier code style!` diyor. Ölçüldü: 168 izlenen
  dosyanın **31'i** yok sayılıyor, 29'u Markdown. Böyle bir commit'te rapor
  `format ✅` değil, **`format — Markdown kapsam dışı, bu commit'te denetlenen
  dosya yok`** yazar. Aynı soru her kapı için sorulur: *"bu kapı benim
  DEĞİŞTİRDİĞİM dosyalara baktı mı?"*
- Bir alt görev 🟢 ise ve kullanıcı "devam" derse sıradakine geçilir — tekrar
  plan sunulmaz, plan zaten `docs/ROADMAP.md`'de onaylıdır.

### ⚠️ ONAY BEKLEYEN İÇERİK RAPORUN İÇİNDE YAŞAR (Faz 4.0b'de eklendi)

**Kural:** *"KARARIN GEREKİYOR"* maddesi **raporun dışında gösterilen** bir
içeriğe atıf yapıyorsa — bir plan, bir seçenek listesi, bir karar tablosu — o
içerik raporun `DETAY` bölümüne **aynen** girer. Özet ya da bağlantı yetmez.
**Yalnızca terminalde yaşayan bir onay maddesi arşivlenmemiş sayılır.**

**Neden — ödenmiş bedel (Faz 4.0).** Rapor arşivi 3.10'da tam olarak bu kaybı
önlemek için kuruldu ve **işini yaptı**: 4.0'ın raporu, iki pahalı ölçümü
(tablo envanteri ve FK kuralı kuru çalıştırması) bozulmadan taşıdı. Ama aynı
raporun *"KARARIN GEREKİYOR: 4 madde — **ADIM 4 planında sunuldu**"* satırı
repoda **hiçbir yerde bulunmayan** bir içeriğe atıf yapıyordu: plan yalnızca
terminaldeydi ve oturum limitine takılınca kayboldu. Alt görev listesi, yedi
tablonun tüketici araması ve dört kararın metni yeniden üretilmek zorunda kaldı.

⚠️ **Plan `docs/ROADMAP.md`'de DE değildi ve bu doğruydu** — K11 onaylanmamış
bir listenin oraya yazılmasını yasaklıyor. Yani onay bekleyen içeriğin
**hiçbir kalıcı yeri yoktu**: ROADMAP'e erken, arşive hiç. Bu kural o boşluğu
kapatıyor — arşiv onay **öncesini** de taşır, ROADMAP onay **sonrasını**.

**D3'ün akrabası:** orada bir kapı bakmadığı hâlde yeşil diyor; burada bir
**güvence** ("rapor arşivlendi") doğru, ama o an önemli olan şeyi kapsamıyor.
Soru genişliyor: *"arşivlendi mi?"* yanına *"arşivlenen şey, kaybolduğunda
canımı yakacak şey mi?"*

**Faz açılış raporları için somut karşılığı:** ADIM 4 planı — alt görev
listesi, karar tabloları, onay bekleyen sorular — **raporun parçasıdır**.

### Bağlam yüzdesi (Faz 2.6 sonunda eklendi)

Raporun sonundaki bağlam yüzdesi **`/context` çıktısındaki TOPLAM kullanım
oranıdır** (`Tokens: X / Y (Z%)` satırı). Tahminle yazılmaz ve bir **alt
kalemden** (`Messages`, `System tools`, …) alınmaz.

**`/context` çıktısı elde YOKSA yüzde YAZILMAZ.** Bunun yerine tek satır:
*"bağlam yüzdesi ölçülemedi — `/context` çıktısı bu turda mevcut değil"*.

> ⚠️ **Bu kural ödenmiş bir bedelden doğdu (2.6).** `/context` bir **yerel
> slash komutudur**: çıktısı kullanıcının terminaline gider ve modele ancak
> kullanıcı onu çalıştırdığında ulaşır. 2.5b ve 2.6 raporlarında okunacak bir
> satır **yokken** yüzde yine yazıldı — yani ölçülmedi, **uyduruldu**: iki
> raporda "%42" ve "%46" denirken gerçek değer **%81**'di. Fark kritikti;
> devam edilseydi oturum ortasında bağlam duvarına toslanacaktı.
>
> Bu, Faz 2 günlük #9'un (uydurulmuş CI koşu numarası) birebir tekrarı ve o
> vakadan doğan kural (`spec/11` §12.3, *"ölçüm sonucu alanları tahminle
> doldurulmaz"*) zaten yazılıydı. **Ders: bir kuralın yazılı olması, onun
> yeni bir alanda hatırlanacağı anlamına gelmiyor** — bu yüzden kural, ihlal
> edildiği yerin yanına ikinci kez yazıldı.

## Rapor arşivi (zorunlu)

> **Faz 3.10'da eklendi.** Rapor **önce dosyaya yazılır, sonra terminale
> basılır**; terminale basılan metin o dosyanın **aynısıdır**.

**Neden:** rapor bugüne kadar yalnızca terminale basılıyordu ve iki kayıp
vardı. ① Terminal → pano → sohbet yolunda metin **bozuluyor** — ölçüldü: son
üç raporun üçünde de kelimeler kaynadı, satırlar kırpıldı. ② Oturum penceresi
kapanınca rapor tamamen kayboluyor; `PROJECT_MEMORY.md` özeti taşıyor ama
**ham raporu taşımıyor**.

**Yer ve ad:**

```
docs/reports/<faz-slug>/<alt-görev-no>-<kısa-slug>.md
docs/reports/faz-03/3.10-er-diyagrami-ve-faz-kapanisi.md
```

**Dosyanın başında künye bloğu:**

```markdown
> **Alt görev:** 3.10 — ER diyagramı + faz kapanışı + PR
> **Tarih:** YYYY-MM-DD · **Dal:** feature/faz-03-database
> **İçerik commit'i:** <hash> · **CI koşusu:** <id> · **PR:** #<n>
> **Bağlam yüzdesi:** <ölçüm> veya "ölçülemedi"
```

⚠️ **`İçerik commit'i` alt görevin İŞİNİ taşıyan commit'tir, raporu taşıyan
commit değil.** Bir dosya kendi commit hash'ini taşıyamaz; ilk kullanımda
(3.10) buraya doldurulması imkânsız bir yer tutucu yazıldı ve sözleşme aynı
gün daraltıldı. Raporu ekleyen commit `git log` ile zaten bulunur.

Künyenin altında **raporun tamamı**: özet **ve** `DETAY` bölümü, birebir.
Kısaltma yok.

**Sözleşme** (tamamı `docs/reports/README.md`'de):

- **Commit edilir**, `.gitignore`'a eklenmez — oturum kurtarma `git log`
  üzerinden yürüyor; izlenmeyen bir klasör aynı yolla kurtarılamaz.
- **Append-only:** yazıldıktan sonra geriye dönük düzenlenmez. Düzeltme
  sonraki rapora ve `PROJECT_MEMORY.md`'nin *"Bilinen kayıt düzeltmeleri"*
  bölümüne gider.
- **Arşiv otorite DEĞİLDİR** — çelişkide `PROJECT_MEMORY.md` kazanır.
- 3.0–3.9 **geriye dönük doldurulmadı**; kural 3.10'da başladı ve boşluk
  `docs/reports/README.md`'de açıklanıyor.

## Faz sonu eki

Fazın son alt görevinde (X.10 gibi) yukarıdakine **ek olarak**:

```markdown
**Faz özeti:** [3-5 satır: bu faz ne kazandırdı]
**Kabul kriterleri:** [n]/[n] sağlandı  (sağlanmayan varsa tek tek gerekçesiyle)
**Performans:** [ölçülen metrikler, bütçeyle karşılaştırmalı]
**PROJECT_MEMORY:** faz kaydı yazıldı [x] · ANLIK DURUM güncellendi [x]
**PR:** #[n] açıldı [x]
**Rapor arşivi:** docs/reports/<faz-slug>/<no>-<slug>.md yazıldı [x]
```
