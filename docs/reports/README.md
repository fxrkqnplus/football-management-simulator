# Alt Görev Rapor Arşivi

> **Bu klasör HAM ARŞİVDİR. Otorite `PROJECT_MEMORY.md`'dir.**
>
> Bir çelişki çıkarsa `PROJECT_MEMORY.md` kazanır: o dosya damıtılmış ve
> sürdürülen kayıt, bu klasör ise **yazıldığı andaki** ham metin.

## Neden var

Alt görev raporu bugüne kadar yalnızca terminale basılıyordu. İki kayıp vardı:

1. **Terminal → pano → sohbet** yolunda metin bozuluyor — ölçüldü: son üç
   raporun üçünde de kelimeler kaynadı ve satırlar kırpıldı.
2. **Oturum penceresi kapanınca rapor tamamen kayboluyor.**
   `PROJECT_MEMORY.md` özeti taşıyor ama **ham raporu taşımıyor**.

## Kural

Her alt görev raporu, **terminale basılmadan ÖNCE** buraya yazılır. Terminale
basılan metin bu dosyanın **aynısıdır** — tek kaynak, iki kopya arasında
ayrışma imkânsız. Biçim ve künye alanları: `docs/OUTPUT-FORMAT.md` →
*"Rapor arşivi (zorunlu)"*.

```
docs/reports/<faz-slug>/<alt-görev-no>-<kısa-slug>.md
docs/reports/faz-03/3.10-er-diyagrami-ve-faz-kapanisi.md
```

## Sözleşme

- **Commit edilir**, `.gitignore`'a **eklenmez**. Üç gerekçe:
  ① bu projede oturum kurtarma `git log` üzerinden yürüyor — izlenmeyen bir
  klasör aynı yolla kurtarılamaz ② dosya repoda olduğu için doğrudan
  okunabiliyor, kopyala-yapıştır turu ve onun bozulması ortadan kalkıyor
  ③ oturum penceresi kaybolsa bile hiçbir şey gitmiyor.
- **Append-only:** bir rapor yazıldıktan sonra **geriye dönük düzenlenmez**
  (`docs/MASTER-SPEC.md` ile aynı sözleşme). Sonradan yanlış olduğu anlaşılan
  bir rakam, sonraki raporda düzeltilir ve `PROJECT_MEMORY.md`'nin *"Bilinen
  kayıt düzeltmeleri"* bölümüne yazılır.
- **Künye alanı `İçerik commit'i`, alt görevin İŞİNİ taşıyan commit'tir** —
  raporu taşıyan commit değil. ⚠️ Bir dosya **kendi commit hash'ini taşıyamaz**;
  bu, kuralın ilk kullanımında (3.10) doldurulması imkânsız bir yer tutucu
  üretti ve sözleşme aynı gün daraltıldı.
- **Kısaltılmaz:** özet **ve** `DETAY` bölümü birebir yazılır. Bu dosyaların
  var olma sebebi tam olarak kısaltılmamış olmaları.
- `*.md` `.prettierignore`'da, yani `pnpm format:check` bu dosyalara
  **bakmıyor** (SAPMA-024). Yeni bir kapı yükü yok.

## ⚠️ 3.0–3.9 GERİYE DÖNÜK DOLDURULMADI

Kural **3.10'da başladı**. Faz 3'ün ilk on alt görevinin ham raporu yok ve bu
**kasıtlı**: geriye dönük yazılan bir "ham rapor" ham değildir, hatırlanarak
üretilmiş bir özettir — arşivin var olma sebebini ortadan kaldırır.

Bu satır o boşluğu açıklamak için burada. Aksi hâlde sonraki oturum eksik
numaraları bir hata sanar ve doldurmaya çalışır.

## Dizin

| Faz | Klasör | Kapsanan alt görevler |
|---|---|---|
| 3 — Veritabanı Şeması I | `faz-03/` | **3.10'dan itibaren** (3.0–3.9 yok, yukarıdaki not) — [3.10 — ER diyagramı + faz kapanışı](faz-03/3.10-er-diyagrami-ve-faz-kapanisi.md) |
