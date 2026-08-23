<!-- Bu dosya ana spesifikasyondan üretilmiştir. Kaynak: docs/MASTER-SPEC.md -->

# 7. TASARIM SİSTEMİ

## 7.1 Renk Token'ları

FM26 estetiği: koyu, yoğun bilgi, düşük parlaklık, yüksek okunabilirlik.

```css
/* Koyu tema (varsayılan) */
--bg-base:        #0B0E14;   /* uygulama zemini */
--bg-surface:     #12161F;   /* kart, panel */
--bg-elevated:    #1A1F2B;   /* açılır menü, modal */
--bg-hover:       #222835;
--bg-active:      #2A3140;
--bg-input:       #0F131B;

--border-subtle:  #1E2430;
--border-default: #2A3140;
--border-strong:  #3A4354;

--text-primary:   #E8ECF3;
--text-secondary: #9BA6B8;
--text-muted:     #64707F;
--text-inverse:   #0B0E14;

--accent:         #00C46A;   /* varsayılan; kulüp rengiyle ezilir */
--accent-hover:   #00D975;
--accent-muted:   #00C46A26;

--danger:         #E5484D;
--warning:        #F5A524;
--success:        #30A46C;
--info:           #4A9EFF;

/* Açık tema */
--bg-base:        #F5F7FA;  --bg-surface:  #FFFFFF;
--bg-elevated:    #FFFFFF;  --bg-hover:    #EDF0F5;
--border-default: #D8DEE8;  --text-primary:#151A22;
--text-secondary: #5A6675;  --text-muted:  #8A94A3;
```

**Kulüp rengi entegrasyonu:** Kullanıcı bir kulübü yönetirken `--accent` o kulübün `colorPrimary`'sine ayarlanır. Kontrast oranı 4.5:1'in altına düşerse otomatik açıklaştırılır (`ensureContrast()` yardımcısı).

## 7.2 Nitelik Isı Skalası

1–20 nitelikler renkle kodlanır. **Renk körlüğü modunda** ek olarak sayı kalınlaşır ve arka plan deseni eklenir.

```
 1-3   #7A2E38  (koyu kırmızı)    çok zayıf
 4-6   #B04A3C  (kırmızı)         zayıf
 7-9   #C77E3A  (turuncu)         vasat altı
10-11  #BFA83C  (sarı)            vasat
12-13  #8FA83C  (açık yeşil)      iyi
14-15  #5FA84C  (yeşil)           çok iyi
16-17  #34A85E  (koyu yeşil)      mükemmel
18-20  #1FB58A  (turkuaz)         dünya klasmanı
```

Belirsizlik gösterimi: `15` (kesin) | `13–17` (bant) | `?` (bilinmiyor) — bant gösteriminde renk aralığın ortasına göre.

## 7.3 Tipografi

```css
--font-ui:   'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, monospace;  /* tüm sayısal tablolar */

--text-2xs: 10px/14px;   --text-xs:  11px/16px;
--text-sm:  13px/18px;   --text-base:14px/20px;    /* gövde varsayılanı */
--text-lg:  16px/24px;   --text-xl:  20px/28px;
--text-2xl: 26px/34px;   --text-3xl: 34px/42px;

--weight-normal: 400; --weight-medium: 500;
--weight-semibold: 600; --weight-bold: 700;
```

Türkçe karakterler (ğ Ğ ü Ü ş Ş ı İ ö Ö ç Ç) her iki fontta tam desteklidir; alt küme (subset) oluştururken `latin-ext` dahil edilmeli.

Font boyutu erişilebilirlik ayarı: kök `font-size` %90 / %100 / %115 / %130 olarak ölçeklenir; tüm `rem` tabanlı değerler uyar.

## 7.4 Boşluk ve Geometri

```css
/* 4px tabanlı */
--space-0:0; --space-1:4px;  --space-2:8px;  --space-3:12px;
--space-4:16px; --space-5:20px; --space-6:24px; --space-8:32px;
--space-10:40px; --space-12:48px; --space-16:64px;

--radius-sm:3px; --radius-md:5px; --radius-lg:8px;
--radius-xl:12px; --radius-full:9999px;

--shadow-sm: 0 1px 2px rgba(0,0,0,.32);
--shadow-md: 0 4px 12px rgba(0,0,0,.38);
--shadow-lg: 0 12px 32px rgba(0,0,0,.44);

--z-base:0; --z-dropdown:100; --z-sticky:200;
--z-overlay:300; --z-modal:400; --z-toast:500; --z-tooltip:600;

--duration-fast:120ms; --duration-normal:200ms; --duration-slow:320ms;
--ease-out: cubic-bezier(.16,1,.3,1);
```

`prefers-reduced-motion` veya "Hareketi azalt" ayarı açıksa tüm süreler `0ms`.

## 7.5 Düzen

**Masaüstü (≥1024px):**
```
┌──────────────────────────────────────────────────────┐
│ Üst bar: arma · kulüp · tarih · [DEVAM ET] · 🔔 · 👤 │  56px
├────────┬─────────────────────────────────┬───────────┤
│ Sidebar│ İçerik                          │ Sağ panel │
│ 220px  │ (esnek, max 1440px)             │ 300px     │
│        │                                 │ (opsiyonel)│
└────────┴─────────────────────────────────┴───────────┘
```

**Mobil (<768px):**
```
┌────────────────────────┐
│ Üst bar (sade)         │  52px
├────────────────────────┤
│ İçerik (tam genişlik)  │
├────────────────────────┤
│ Alt tab bar (5 sekme)  │  60px + güvenli alan
└────────────────────────┘
```

Kırılma noktaları: `360 / 480 / 768 / 1024 / 1280 / 1600`
Alt tab bar: Ana Sayfa · Kadro · Taktik · Transfer · Daha Fazla
Dokunma hedefi minimum **44×44px**.

## 7.6 Maç Sunumu

### 2D Saha
```
Saha: 105×68 m → viewBox 1050×680 birim
Çim: --pitch-grass #1B4D2E, şerit #1F5834 (8 şerit)
Çizgiler: rgba(255,255,255,.72), kalınlık 2 birim
Oyuncu: r=13 birim daire, kulüp rengi dolgu, kontrast kenarlık, forma numarası ortada
Kaptan: altın kenarlık | Top sahibi: dış halka pulse
Top: r=5, beyaz, gölge, hız > 12 birim/tik ise hareket izi
```

**Hareket enterpolasyonu:** Tikler 5 saniye aralıklıdır; ham konum sıçraması kabul edilemez. Her tik arası `catmull-rom` eğrisiyle 12 ara kare üretilir. Oyuncular hedefe doğru `easeInOutQuad` ile ilerler; hız `pace` niteliğiyle ölçeklenir.

### Gol Animasyon Spesifikasyonları

17 gol türünün her biri **görsel olarak ayırt edilebilir** olmalıdır:

| Tür | Animasyon |
|---|---|
| `penalty` | Kamera penaltı noktasına yakınlaşır (1.8×), kaleci dalış yayı, top yavaş çekimde (0.35× hız) |
| `directFreeKick` | Baraj çizgisi görünür, top kavisli Bézier yörüngesi, iz efekti |
| `cornerHeader` | Korner bayrağından çizgi, ceza sahası kalabalığı vurgulu, kafa teması sarsıntı |
| `cornerScramble` | Hızlı çoklu temas, kamera sarsıntısı, karışıklık efekti |
| `header` | Golcünün sıçrama yayı, temas anında beyaz flaş |
| `volley` | Top hava yörüngesi + vuruş anı donma (120 ms) |
| `bicycle` | Golcü 360° döner, kamera 2.2× yakınlaşır, tam yavaş çekim |
| `longRange` | Uzun düz iz, ağ dalgalanması abartılı, mesafe etiketi ("28 m") |
| `soloRun` | Dripling boyunca kalıcı iz, geçilen savunmacılar soluklaşır |
| `counterAttack` | Kamera hızlı yatay kaydırma, pas zinciri çizgileri arkada kalır |
| `chip` | Yüksek kavis, kaleci altından geçiş vurgusu |
| `curler` | Belirgin yatay kavis, iz gradyanlı |
| `tapIn` | Kısa mesafe, hızlı, minimal efekt (sadelik = yakın mesafe hissi) |
| `rebound` | İlk şut → kurtarış → ikinci vuruş, üçü de gösterilir |
| `deflection` | Sekme noktasında sarı işaret, yön değişimi vurgulu |
| `ownGoal` | Kırmızı ton, kutlama YOK, golcü başını eğer |
| `openPlayFinish` | Standart: kamera hafif yakınlaşır, ağ dalgalanır |

**Ortak gol sunumu:** ekran sarsıntısı (4 birim, 180 ms) → kulüp renginde ışık patlaması → skor tabelası sayı çevirme animasyonu → "GOL!" tipografisi (kulüp renginde, 400 ms) → golcü kartı (portre, isim, dakika, sezon gol sayısı, 2.5 sn)

**8 kutlama varyantı:** koşarak taraftara, kayma, takım kucaklaşması, forma öpme, sessiz kutlama (eski kulübüne attıysa — otomatik seçilir), işaret parmağı, teknik direktöre koşma, sakin dönüş. Aynı maçta aynı kutlama arka arkaya seçilmez.

### Ses Katmanları (Howler)

```
crowd_ambient_low/mid/high    → momentum + top konumuna göre çapraz karışım
crowd_goal_home/away          → gol tezahüratı
crowd_disappointment          → kaçan fırsat
crowd_ooh                     → direkten dönen
drum_loop_tr                  → Türk takımları için tempo davulu
whistle_start/foul/offside/halftime/fulltime
ball_pass/shot/header/post/net
```

**Ducking:** Gol anında `crowd_ambient` 250 ms'de −18 dB'ye iner, tezahürat öne çıkar, 1.5 sn sonra geri döner.
**Mobil:** İlk kullanıcı dokunuşuna kadar `AudioContext` başlatılmaz (tarayıcı kısıtı). Sessiz mod ve arka plan geçişinde ses durur.

---
