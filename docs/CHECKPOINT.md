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
alt_gorev: 6.6b
durum: tamamlandi
asama: kapandi
dal: feature/faz-06-design-system
taban_commit: 74c5179
son_commit_baslik: docs(memory): 6.6b denetim kaydı — yazar iddiaları 10/10, K5 temiz, form-indicator etiketsiz (SORUN-002 6.6'ya uzandı), 6.6c açıldı
kapi_tabani: 74c5179 ağacı + md-only diff · gaps 20·3·17·0✗ · debt 16·5·11·0✗ · format 0 (değişen *.md ignored:true — denetlenen dosya yok) · i18n 117/92/3 · 58 dosya·2 kök · görünmez 422 (rapor dâhil) · arch temiz (BORÇ-012) · typecheck 11/11 (3 cached) · lint 0 (301 dosya) · test:coverage YERELDE KIRMIZI ortam/D6 (iki koşu, 2→5 zaman aşımı; FC26 20,1 CPU-s/3 s; beşi izole yeşil 4/4·66/66·36/36; §③ iki koşuda yeşil, son_commit_baslik kirli ağaçta atlandı) · fonksiyon ölçülemedi · test:db/build koşturulmadı (kod değişmedi) · D5 aynı kod CI #120 İmaj dâhil yeşil · asıl test ölçümü bu commit'in CI koşusu
biten: 6.6 DENETİMİ (kod yok) · yazar iddiaları exports 10/10 + testCount 10/10 (238; ui 39 dosya 517/517) · K5 temiz (29 Türkçe kod satırı, 29/29 RangeError bağlamı; JSX'e akan sabit 0) · t() 19 çağrı hepsi *_KEYS · ad listesi↔*_KEYS nöbetçileri var (attribute-badge:127/135 · form-indicator:69/84 · morale-icon:134/147) · D5 imaj CI #120 6/6 yeşil · SAPMA form-indicator.tsx 6 etiketsiz/5 bozuk → SORUN-002 kusur 6.4/6.5 VE 6.6, sahibi 6.6c · ölçek 34 geçiş/12 dosya (15 font-weight · 19 color) derlenmiş CSS'te doğrulandı · kayıt: ROADMAP 6.6b SONUÇ + 6.6c bloğu + 6.7 notu, günlük #37–#40, düzeltme bloğu, rapor
yarim_kalan: yok — 6.6b'nin altı maddesinden beşi 6.6c'ye adıyla taşındı (SORUN-002 · DZ-21 · §0.5 · §16.2 · 6.8 notu), 6.6b yalnızca denetimdi
siradaki_komut: gh run list --limit 2 (bu commit: §③ yeşil mi) · kullanıcı onayıyla /faz-yurut 6.6c (ilk iş SORUN-002 — sayı yeniden sayılır, NÖBETÇİ ÖNCE, biçimi ölçümle seçilir)
acik_karar: ① 6.6c'ye geçiş onayı (K11) ② 6.6c'nin nöbetçi biçimi (lint kuralı mı derlenmiş CSS iddiası mı) — 6.6c'nin ölçümünden sonra sorulur, şimdi değil
```
