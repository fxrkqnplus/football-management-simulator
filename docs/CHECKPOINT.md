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
alt_gorev: 6.6c
durum: tamamlandi
asama: kapandi
dal: feature/faz-06-design-system
taban_commit: ea970b5
son_commit_baslik: feat(lint): no-untyped-arbitrary-value kuralı + SORUN-002 çözüldü; DZ-21 metni, SKILL CI kuralı, §0.5 sayımı, §16.2, SORUN-003 (6.6c)
kapi_tabani: ea970b5 + bu diff (yüksüz) · gaps 20·3·17·0✗ · debt 16·5·11·0✗ · format 0 (eslint.config.js + kural .js + test .mjs + 21 .tsx/.ts bakıldı; *.md bakılmadı) · i18n 117/92/3 · 58 dosya·2 kök · görünmez 425 (rapor dâhil) · arch temiz (BORÇ-012) · typecheck 11/11 · lint 0 (303 dosya; düzeltme öncesi 34/12 + 1) · test 1746/118 + 1 skipped (§③ kirli ağaç; taban 1702/117) · test:db 301/10 · fonksiyon %85,71 (522/609) · build 8/8 SOĞUK ×2 (--force) · web JS 390.629 · CSS 33.778 (33.844'ten) · derlenmiş CSS yanlış çift 0, font-family 2+2, font-size 5 · twMerge etiketli biçim ikisini tutuyor · mutasyon 4/4 (M1 lint 1 hata :39 · M2 20 test · M3 3 kanarya, eslint sessiz · M4 EXIT 2) · D5 dist ✅ web ✅ imaj koşturulmadı (CI)
biten: no-untyped-arbitrary-value (45 test, türetme tokens.generated.css'ten, kapalı-güvenli, kablolu) · 34 geçiş etiketli (12 dosya) · 15 yorum geçişi aday olmaktan çıkarıldı (8 dosya) · DZ-21 metni (CLAUDE.md + denetci.md + kapici.md) · SKILL.md CI-sayıları kuralı · §16.2 madde 6 · 6.8 bant 1 notu (girdiler ölçüldü: CVD alfası) · §0.5 listeleri 6.7=8 · 6.8=13 · düzeltme bloğu CI #121 · SORUN-003 (6.12'ye adıyla) · SORUN-002 ✅ · V2-BACKLOG · ROADMAP SONUÇ · günlük #41–#43 · rapor
yarim_kalan: yok — imaj yüzeyi CI'da okunur, sayıları SKILL kuralı gereği bir sonraki kayda girer
siradaki_komut: gh run list --limit 2 (bu commit: 6/6 mi, §③ temiz ağaçta yeşil mi) · kullanıcı onayıyla /faz-yurut 6.7 (planci §0.5'i yeniden sayar; ilk kod etiketli idiyomla)
acik_karar: ① 6.7'ye geçiş onayı (K11) ② 6.8 açılışında planci 13 birimi yeniden sayar — 15'i aşarsa 6.8a/6.8b çizgisi ROADMAP'te hazır, karar kullanıcının
```
