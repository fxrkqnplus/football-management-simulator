# CHECKPOINT — makine için durum dosyası

> **Sabit şekilli.** Aşağıdaki `yaml` bloğu her **alt görev** sonunda tamamen
> yeniden yazılır; nöbetçisi `scripts/inventory-guards.test.mjs` §③ — `faz`,
> `alt_gorev`/`durum`, `taban_commit`, `dal` ve `son_commit_baslik` git ve
> `docs/ROADMAP.md` ile karşılaştırılır. Bayatlayan bir envanterdir (F1) ve tam
> bu yüzden nöbetçisi **dosyadan önce** yazıldı (6.6-ön).
>
> **`PROJECT_MEMORY.md` → ANLIK DURUM ile çakışmaz.** ANLIK DURUM insan için bir
> **anlatı** (neden, ne öğrenildi, ne riskli); bu dosya makine için bir
> **durum** (hangi faz, hangi aşama, hangi ağaç, sıradaki komut). Biri diğerinin
> özeti değildir — ikisi de alt görev başına yazılır.
>
> **Alanların sözleşmesi:**
>
> | Alan | Kim okur | Kural |
> |---|---|---|
> | `faz` | nöbetçi | ROADMAP'in etkin fazı: son `[x]` ya da ilk `[ ]` alt görevin fazı |
> | `alt_gorev` · `durum` | nöbetçi | ROADMAP'te satır **var**; `tamamlandi` ⇔ `[x]`, `devam` ⇔ `[ ]` |
> | `asama` | nöbetçi | kapalı küme: `1-olc` · `2-planla` · `3-yaz` · `4-sina` · `5-kaydet` · `kapandi` |
> | `dal` | nöbetçi | çalışma dalı; `main`/`develop`/ayrık HEAD'de **atlanır ve basılır** |
> | `taban_commit` | nöbetçi | kapı tabanının ölçüldüğü ağaç — git'te var, HEAD'in atası ya da kendisi. Dosya **kendi** commit'ini taşıyamaz (`spec/11` §12.3) |
> | `son_commit_baslik` | nöbetçi | bu dosyayı taşıyan commit'in **başlığı** (ANLIK DURUM sözleşmesi); temiz ağaçta HEAD ile karşılaştırılır. ⚠️ **Ara push = kırmızı, ve bu kabul edilen davranış** (6.6, günlük #36): §1.4 bir alt görevin birden fazla commit taşımasına izin verir; içerik commit'i tek başına push edilirse CI'da bu vaka kırmızı olur ve **kayıt commit'i kapatır**. Gevşetilmez |
> | `kapi_tabani` | insan · danışman | `taban_commit` üzerinde ölçülen kapı sayıları — **ölçüm çıktısından kopyalanır** (D1) |
> | `biten` · `yarim_kalan` · `siradaki_komut` · `acik_karar` | oturum kurtarma | tek satır; ayrıntı ROADMAP'te ve raporda |
>
> Değerler **tek satır**. Ayraç ` · `. YAML ayrıştırıcı yok — nöbetçi düz
> `anahtar: değer` okur; girinti, liste, çok satırlı değer **kullanılmaz**.

```yaml
faz: 6
alt_gorev: 6.6
durum: tamamlandi
asama: kapandi
dal: feature/faz-06-design-system
taban_commit: bbf3e5e
son_commit_baslik: docs(memory): 6.6 kaydı — SONUÇ, ANLIK DURUM, CHECKPOINT, rapor; BORÇ-014/015/016, SORUN-002 sahibi 6.7
kapi_tabani: kapıcı (bbf3e5e ağacı) · typecheck 11/11 · lint 0 (301 dosya) · format 0 (346 dosya baktı, *.md bakmadı) · arch temiz (çıktı saymıyor — BORÇ-012) · test 1701/117 (+1 skipped: §③ son_commit_baslik, kirli ağaç) · test:db 301/10 · fonksiyon %85,71 (522/609) · build 8/8 SOĞUK · gaps 20·3·17·0✗ · debt 16·5·11·0✗ (kayıt turunda ölçüldü; kapıcı 13·5·8) · i18n 117/92 · 58 dosya·2 kök · görünmez 420 · web JS 390.629 · CSS 33.844 · [data-cvd] 4 hit · mutasyon 13/13 (M15 kör → BORÇ-014)
biten: on alan-özel bileşen + 238 test (kod bbf3e5e) · ui.* +51 anahtar · sözlük §7/§8 (170) · inventory-guards ④ · i18n-keys ② kebab→camel + tek *_KEYS · glossary-check ④ · CVD_ATTRIBUTE · contrast-audit ⑦ · kriter 4 [x] (mürekkep sapması onay bekliyor) · kayıt: ROADMAP SONUÇ, günlük #29–#36, BORÇ-013/014/015/016, SORUN-002 (sahibi 6.7), rapor
yarim_kalan: DENETİM (denetci) YAPILMADI — oturum limiti; 6.7 açılışında 6.6 ÇIKTI'sı denetlenir · D5 imaj yüzeyi CI'da ölçülmedi (#119 quality kırmızı → İmaj koşmadı) — bu commit'in koşusunda okunur · workflow ölçümü raporda
siradaki_komut: gh run list --limit 2 (bu commit: §③ yeşil mi, İmaj koştu mu) · kullanıcı kararıyla /faz-yurut 6.7 (ilk iş SORUN-002) ya da 6.6b
acik_karar: ① mürekkep siyah + alfa 0,10 (sözleşme beyaz diyordu) ② K-4 Türkçe terim tablosu + kalibrasyonlar (moral eşikleri, arma/portre boyutları, yıldız yarım-potansiyel yok) ③ SORUN-002 sahibi 6.7 mi 6.6b mi ④ 6.7'ye geçiş onayı (K11)
```
