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
> | `son_commit_baslik` | nöbetçi | bu dosyayı taşıyan commit'in **başlığı** (ANLIK DURUM sözleşmesi); temiz ağaçta HEAD ile karşılaştırılır |
> | `kapi_tabani` | insan · danışman | `taban_commit` üzerinde ölçülen kapı sayıları — **ölçüm çıktısından kopyalanır** (D1) |
> | `biten` · `yarim_kalan` · `siradaki_komut` · `acik_karar` | oturum kurtarma | tek satır; ayrıntı ROADMAP'te ve raporda |
>
> Değerler **tek satır**. Ayraç ` · `. YAML ayrıştırıcı yok — nöbetçi düz
> `anahtar: değer` okur; girinti, liste, çok satırlı değer **kullanılmaz**.

```yaml
faz: 6
alt_gorev: 6.6-ön
durum: tamamlandi
asama: kapandi
dal: feature/faz-06-design-system
taban_commit: c1a6b26
son_commit_baslik: chore(process): süreç göçü — altı ajan, faz-yurut skill'i, CHECKPOINT nöbetçisi (6.6-ön)
kapi_tabani: typecheck 11/11 · lint 0 · format 0 (json·yaml·mjs baktı, *.md bakmadı) · arch temiz (9 kural, çıktı saymıyor — BORÇ-012) · test 1451/107 (+1 skipped: §③ son_commit_baslik, kirli ağaç) · test:db 301/10 · fonksiyon %84,09 (460/547) · build 8/8 SOĞUK · gaps 20·3·17·0✗ · debt 12·5·7·0✗ · i18n 48 dosya·2 kök · görünmez 398 dosya
biten: altı ajan + faz-yurut skill'i (kurtarma oturumunda YÜKLENDİĞİ ölçüldü) · CLAUDE.md §18 (D1–D7, F1–F5, DZ-01…DZ-22) + §1.1/§16.3 sunucu modu + §2.2 ağacı + belge haritası · CHECKPOINT + nöbetçi §③ (+ §② .claude/) · DANISMAN-PROTOKOLU · ROADMAP §0.5 iş birimi ölçüsü + SAPMA-045 devri (Faz 7·8·9·50) · .gitignore *.yedek · ci.yml quality fetch-depth 0 · Faz 4 kırmızı koşu kapanışı · mutasyon 5/5 · rapor
yarim_kalan: yok — ci.yml fetch-depth 0 ve §③'ün CI'da yeşil olduğu bu commit'in koşusunda ÖLÇÜLECEK (yerelde doğrulanamaz)
siradaki_komut: gh run list --limit 3 --json number,headSha,conclusion (bu commit'in koşusu: altı iş + §③ testleri) · sonra kullanıcı onayıyla /faz-yurut 6.6
acik_karar: yok — 6.6'ya geçiş onayı bekleniyor (K11)
```
