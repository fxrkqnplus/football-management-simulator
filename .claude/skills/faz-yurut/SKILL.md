---
name: faz-yurut
description: Bir alt görevi bu deponun beş aşamalı protokolüyle yürütür — ölç, planla, yaz, sına, kaydet. ADIM 0 okuma listesi, kapı zinciri, mutasyon kuralı, rapor ve kapanış (faz sonunda git tag) burada. Bir alt görev ya da faz açılışında, "/faz-yurut <no>" ile ya da kullanıcı "alt görev X'i yap" dediğinde kullan.
argument-hint: <alt-görev-no> (örn. 6.6)
---

# FAZ YÜRÜTME PROTOKOLÜ — beş aşama, altı ajan

Bu skill, 6.6-ön'e kadar her turda **prompt olarak yeniden gönderilen** çalışma
kurallarının deposudur. Kural burada yaşar; prompt yalnızca **taban** (kapı
sayıları), **kapsam** ve **tuzak** taşır. Otorite sırası: `CLAUDE.md` (anayasa,
DEĞİŞMEZLER, hata kataloğu) → `docs/SESSION-TEMPLATE.md` (oturum akışı) →
`docs/OUTPUT-FORMAT.md` (rapor) → bu dosya (aşamaların ajanlara dağılımı).
Çelişkide **üsttekiler kazanır**; bu dosya onları **tekrar etmez**, adres verir.

## ADIM 0 — OKU, sonra DOĞRULA (hiçbir şey yazmadan)

`CLAUDE.md` otomatik yüklüdür. Sırayla:

1. `docs/CHECKPOINT.md` → makine durumu (faz · aşama · taban commit · sıradaki
   komut · açık karar).
2. `PROJECT_MEMORY.md` → ANLIK DURUM + Faz çalışma günlüğü + üç kütük + son iki
   faz kaydı.
3. `docs/ROADMAP.md` → §0.5 + ilgili faz bölümü (alt görev satırı **ve** SONUÇ
   blokları, kabul kriterleri, devir notları).
4. `docs/SESSION-TEMPLATE.md` (§15.1 satırını **doğrula**, sonra `docs/spec/`
   oku) · `docs/OUTPUT-FORMAT.md`.
5. `docs/SPEC-COVERAGE-GAPS.md` + BORÇ kütüğü + `docs/DEPENDENCY-WATCH.md` →
   **bu faza** atanmış satırlar.
6. Dokunacağın nöbetçiler: `scripts/inventory-guards.test.mjs` (üç yüzey),
   `tools/glossary-check/index.test.mjs` (§14 ayrışması), ilgili paketin kendi
   nöbetçileri.
7. `pwd` · `git log --oneline -3` · `git status --porcelain` · `git describe
   --tags` — **promptun söylediği tepe ile aynı mı?**

Promptun **TABAN** bloğu iki sınıf taşır: *"DOĞRULANMIŞ"* (danışman ölçtü) ve
*"RAPORUN İDDİASI, SEN YENİDEN ÖLÇ"*. İkincisi ölçülmeden hiçbir şey yazılmaz.

## BEŞ AŞAMA — kim, ne, neyi görür

| # | Aşama | Ajan | Girdi | Çıktı |
|---|---|---|---|---|
| ① | **ÖLÇ** | `olcumcu` | ADIM 0 listesi + promptun tabanı | kapı tabanı tablosu (komut + ham satır + değer) · aracın doğrulanması |
| ② | **PLANLA** | `planci` | spec + ROADMAP + kütükler | kapsam (K12) · yazmadan önce analiz · kırılması beklenen kapılar · açık kararlar (K13) · ROADMAP bloğu |
| — | **ONAY** | kullanıcı | ②'nin bloğu | *"evet"/"y"* → blok `docs/ROADMAP.md`'ye **yazılır** (K11: plan sohbette yaşamaz) |
| ③ | **YAZ** | `gelistirici` | onaylı ROADMAP bloğu | `## ÇIKTI` + `## GEREKÇE` (ayrı) |
| ④ | **SINA** | `kapici` + `denetci` | **yalnızca `## ÇIKTI`** | kapılar (pozitif+negatif+kapsam) · mutasyon serisi · kablolama · D5 üç yüzey · iddia-iddia hüküm |
| ⑤ | **KAYDET** | `kayitci` | ①③④'ün ham çıktıları | ROADMAP `[x]`+SONUÇ · PROJECT_MEMORY · CHECKPOINT · rapor · commit mesajı dosyası |

**El değiştirme kuralı:** ④'e giren metin `gelistirici`nin **`## ÇIKTI`**
bölümüdür; `## GEREKÇE` **iletilmez**. Gerekçeyi okuyan denetçi gerekçeye ikna
olur. ④ bir zaaf bulursa ③'e döner (yeni ÇIKTI), ④ yeniden koşar; ④ temizken
⑤ başlar. Ana oturum ajanları sırayla çağırır, sonuçları **birleştirmez, aktarır**.

**Tek oturumda tek alt görev.** ⑤ bitince rapor terminale basılır ve **DURULUR**
— kullanıcının onayı gelmeden sıradakine geçilmez (K11).

## KAPI ZİNCİRİ — kaynağı `package.json`, sayısı yok

Kök `package.json` `scripts`: her `*:check` betiği + `typecheck` + `lint` +
`format:check` + `test:coverage` + `test:db` + `build`. Kurallar:

- Her komut **borusuz** koşar; çıkış kodu **ayrı** okunur. Boru zorunluysa
  `${PIPESTATUS[0]}`.
- Her kapının **kapsam satırı** okunur ve rapora girer (kaç dosya, kaç kural,
  kaç anahtar). *"✓ temiz"* tek başına bir kanıt değildir.
- `format:check` `*.md`ye **bakmaz** (`.prettierignore`); `.claude/*.json`
  **bakılır**. Belge ağırlıklı bir alt görevde rapor *"format — Markdown kapsam
  dışı, bu commit'te denetlenen dosya: …"* yazar.
- `build` **soğuk** mu (`Cached: 0 cached`)? Değilse yazılır.
- **BUILD ET VE ÇALIŞTIR (D5):** hangi yüzey koştu — paket `dist`i · web paketi
  · imaj — **adıyla**; koşturulmayan *"koşturulmadı"* diye yazılır.
- Yeni bir `*:check` betiği `ci.yml`de `run: pnpm <ad>` olmadan **kablosuzdur**
  (`inventory-guards` ① bunu iddia eder).

## MUTASYON KURALI

En az **üç** mutasyon; yeni bir nöbetçi yazıldıysa biri **onu**, bir envanter
kapısı genişletildiyse biri **onu** hedefler. Her biri: yedek → md5 → boz →
md5 değişti → koş → **kırılanlar adıyla** → yedekten geri al → md5 eski değere
döndü. `git checkout` ile geri alma **yok**. Hiçbir şeyi kırmayan mutasyon
ayrıştırılır (nöbetçi yok · yola dokunmuyor · kod gereksiz).

## RAPOR — biçim `docs/OUTPUT-FORMAT.md` (otorite), şu satırlar ZORUNLU

Şablon orada; burada tekrar yok. Prompt döneminin **her turda istediği** kanıt
satırları raporun `Kanıtlar` bölümünde adıyla bulunur:

- Kapı tabanı **yeniden ölçülmüş** (promptun iddiası ≠ ölçüm ise fark yazılır).
- Kırılması beklenen kapı **kırıldı mı**, nasıl kapatıldı; kırılmadıysa sebebi.
- Yeni nöbetçinin kanaryası **gerçek depoda** öttü mü (hangi hata, hangi satır).
- Yeni ayar/ajan/skill **yüklendi mi** — nasıl ölçüldü (dosyanın varlığı değil).
- Mutasyon tablosu (yukarıdaki alanlarla).
- `D5:` üç yüzey adıyla.
- Devir varsa hedef fazın **kapsamındaki satır**.
- `format:check`in bu commit'te **neye baktığı**.
- Bağlam yüzdesi: `/context` çıktısı yoksa *"ölçülemedi"*.

Rapor **önce** `docs/reports/<faz-slug>/<no>-<slug>.md`'ye yazılır, **sonra**
terminale **aynısı** basılır. Onay bekleyen içerik raporun `DETAY`ında yaşar.

## ALT GÖREV KAPANIŞ LİSTESİ (⑤, sırayla)

ROADMAP `[x]` + SONUÇ → kütükler (SAPMA/BORÇ/SORUN; devir **hedef fazın
kapsamına adıyla**, `gaps:check`/`debt:check` yeşil) → günlük → ANLIK DURUM →
`docs/CHECKPOINT.md` (`durum: tamamlandi` ⇔ `[x]`, **aynı commit**) → rapor
dosyası → commit mesajı dosyası → `git commit -F` → push → rapor terminale.
Commit **alt görev başına**, PR **faz başına** (§1.4).

## FAZ KAPANIŞ ADIMI — tag

Faz kaydı (11 başlık) + ANLIK DURUM son commit'te + `CHANGELOG.md` + PR
`develop`a (`SESSION-TEMPLATE` adım 15–24). **Ve:**

```
git tag -a faz-XX-son -m "Faz XX kapanisi — <tek satir>"
git push origin faz-XX-son
```

**Gerekçe:** `main` ilk sürüme kadar **Faz 0'da kalır** (§1.4 gereği, bilinçli);
`develop` ilerler ama bir *"bilinen iyi nokta"* işaretlemez. Tag'ler tek
mekanizmadır — bir sonraki oturum `git describe --tags` ile kendini konumlar,
bir regresyon `git diff faz-XX-son..HEAD` ile daraltılır. Tag adı `faz-06-5-son`
biçiminde ara kapanışları da taşıyabilir (emsal var); faz sonu **`faz-XX-son`**.

## YAPMA (her alt görevde geçerli)

- Kapsam dışı hiçbir şey (K12) — fikir `docs/V2-BACKLOG.md`'ye.
- `CLAUDE.md` §14'e dokunma; `glossary-check` onu ayrıştırır.
- ROADMAP SONUÇ bloklarını taşıma; faz kayıtlarını ve raporları değiştirme
  (append-only).
- `.env` okuma. `Math.random()` · `console.log` · `any` · sabit metin · sabit
  yol (K2 · K8 · §1.3 · K5 · K6).
- Metni kabuktan geçirme (`bash-text-guard` reddeder; commit mesajı dosyadan).
- Bir sayıyı devir notundan kopyalama — **yeniden say**.
- Bir kriteri işlevini yerine koymadan silme.
- Onay gelmeden sıradaki alt göreve geçme.
