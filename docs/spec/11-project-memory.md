<!-- Bu dosya ana spesifikasyondan üretilmiştir. Kaynak: docs/MASTER-SPEC.md -->

# 12. PROJE HAFIZASI (`PROJECT_MEMORY.md`)

> **Neden var:** Claude Code her fazda **yeni bir oturum** açar. Önceki oturumun ne yaptığını, hangi kararı neden verdiğini, neyi ertelediğini, hangi hatayla boğuştuğunu bilmez. `CHANGELOG.md` ne değiştiğini söyler ama *neden* ve *sırada ne var* sorusunu cevaplamaz. `PROJECT_MEMORY.md` bu boşluğu kapatır: **oturumlar arası devir teslim belgesi**.

## 12.1 Kullanım Kuralları

**Okuma — her oturumun İLK işi:**
Faz başlarken `PROJECT_MEMORY.md`'nin **"ANLIK DURUM"** bloğu ve **son iki faz kaydı** okunur. Bu yapılmadan koda dokunulmaz.

**Yazma — iki ayrı ritim:**

| Ne | Ne zaman | Maliyet |
|---|---|---|
| **ANLIK DURUM bloğu** | **HER ALT GÖREV sonunda** | ~10 satır, ucuz |
| **Tam faz kaydı** (11 başlık) | Faz sonunda, PR'dan önce | Uzun |
| **Kütükler** (SORUN/BORÇ/SAPMA) | Kayıt açıldığı anda | Bir satır |

Kayıt yazılmadan faz kapanmış sayılmaz (K15).

> **Neden ANLIK DURUM alt görev başına?** (SAPMA-004)
> Bu bloğun tek amacı oturum kurtarmadır ve kurtarmaya ihtiyaç duyulan an tam
> olarak **faz ortasıdır**. Faz sonunda güncellenirse, on alt görevlik bir fazın
> ortasında oturum koptuğunda yeni oturum yapılan işi göremez. Commit'ler
> "ne yapıldı"yı taşır, ANLIK DURUM "şu anda neredeyiz"i taşır.

**Değişmezlik:**
- Dosya **append-only**'dir. Eski faz kayıtları geriye dönük **silinmez ve değiştirilmez**.
- Bir hata sonradan fark edilirse, eski kayıt düzenlenmez; yeni kayda `> ⚠️ DÜZELTME (Faz XX): Faz YY'deki "..." ifadesi yanlıştı, doğrusu "..."` satırı eklenir.
- Tek istisna: en üstteki **ANLIK DURUM** bloğu **her alt görev sonunda** tamamen yeniden yazılır.

**Sıralama:** En yeni faz kaydı **en üstte** (ANLIK DURUM'un hemen altında). Yeni oturum aşağı kaydırmadan güncel durumu görür.

**Dürüstlük kuralı:** Yapılmayan şey "yapıldı" diye yazılmaz. Atlanan kabul kriteri açıkça `[ ]` bırakılır ve gerekçesi yazılır. Bu dosyanın değeri doğruluğundan gelir.

## 12.2 Dosya Yapısı

```
PROJECT_MEMORY.md
├── ⚡ ANLIK DURUM              ← her faz tamamen yeniden yazılır
├── 🔴 AÇIK SORUNLAR KÜTÜĞÜ     ← kümülatif, çözülünce kapatılır
├── 🟡 TEKNİK BORÇ KÜTÜĞÜ       ← kümülatif
├── 🔵 SPESİFİKASYON SAPMALARI  ← kümülatif, asla silinmez
└── 📋 FAZ KAYITLARI            ← append-only, en yeni üstte
```

## 12.3 ANLIK DURUM Bloğu

Her **alt görev** sonunda **tamamen** yeniden yazılır. Yeni oturum bunu okuyunca 30 saniyede konuma oturur — fazın ortasında bile.

```markdown
## ⚡ ANLIK DURUM

| | |
|---|---|
| **Son tamamlanan faz** | Faz 12 — Master World + Delta Save Mimarisi |
| **Tamamlanma tarihi** | 2026-09-14 |
| **Sıradaki faz** | Faz 13 — Açık Kayıt, Sunucu Modları ve Yasal Uyum |
| **Genel ilerleme** | 12 / 50 (%24) |
| **Bloke eden var mı?** | Hayır |
| **Son commit** | `docs(spec): ...` (commit BAŞLIĞI, hash değil) on `develop` |
| **Testler** | ✅ 284 geçti, 0 başarısız, kapsam %78 (motor %89) |
| **Açık sorun sayısı** | 2 (biri düşük öncelikli) |
| **Teknik borç sayısı** | 3 |

> **Neden hash değil başlık?** ANLIK DURUM alt görevin KENDİ commit'inin içinde
> yazılır; o commit'in hash'i yazma anında henüz yoktur ve `--amend` ile
> doldurulmaya çalışılırsa hash yeniden değişir. Commit başlığı kararlıdır ve
> `git log --oneline --grep` ile hash'e bir adımda ulaşılır.

**Sıradaki oturumda ilk yapılacak:**
1. `docs/spec/08-admin-panel.md` ve `docs/spec/10-deployment.md` oku
2. `pnpm typecheck && pnpm lint && pnpm test` çalıştır, temiz mi doğrula
3. Faz 13 kapsamını özetle, kullanıcıya onaylat
4. SORUN-004'ün Faz 13'ü etkileyip etkilemediğini kontrol et

**Faz 13'e girerken bilinmesi gerekenler:**
- Faz 12'de `WorldView` önbelleği `Map` tabanlı; Faz 13'te oturum kilidi eklenirken önbellek
  invalidasyonu bunu dikkate almalı.
- `users` tablosu Faz 4'te tanımlandı ama henüz kullanılmıyor; Faz 13'te ilk kez doldurulacak.
```

## 12.4 Kümülatif Kütükler

```markdown
## 🔴 AÇIK SORUNLAR KÜTÜĞÜ

| ID | Faz | Açıklama | Öncelik | Durum | Çözüldüğü faz |
|---|---|---|---|---|---|
| SORUN-001 | 6 | Mobilde DataTable yatay kaydırmada başlık kayıyor | Orta | ✅ Kapalı | 6 |
| SORUN-004 | 12 | Delta 50.000'i aşınca snapshot 4.2 sn sürüyor (bütçe 300 ms) | Yüksek | 🔴 Açık | — |
| SORUN-005 | 12 | `validateSave` yetim delta kontrolü büyük kayıtlarda yavaş | Düşük | 🔴 Açık | — |

## 🟡 TEKNİK BORÇ KÜTÜĞÜ

| ID | Faz | Borç | Neden ertelendi | Ödenmesi gereken faz |
|---|---|---|---|---|
| BORÇ-001 | 3 | `competition_rules` jsonb için Zod şeması yazılmadı | Faz 8'de kural setleri netleşince yazılacak | 8 |
| BORÇ-002 | 12 | Snapshot sıkıştırma senkron çalışıyor, worker'a taşınmalı | Kuyruk Faz 16'da geliyor | 16 |

## 🔵 SPESİFİKASYON SAPMALARI

Spesifikasyondan (`docs/spec/`) veya yol haritasından (`docs/ROADMAP.md`) sapılan her nokta.
**Asla silinmez.** Sapma tespit edilirse önce burada kayda geçer, sonra spesifikasyon güncellenir.

| ID | Faz | Sapma | Gerekçe | Spec güncellendi mi |
|---|---|---|---|---|
| SAPMA-001 | — | Gizli nitelik sayısı 8 → 10 (`adaptability`, `temperament` eklendi) | Faz 34 uyum süreci ve Faz 44 diyalog motoru bunlar olmadan kurulamıyor | ✅ Bölüm 4.1 |
```

## 12.5 Faz Kaydı Şablonu

Her faz için bu şablon **eksiksiz** doldurulur:

```markdown
### FAZ [XX] — [Faz Adı]
**Tarih:** [başlangıç] → [bitiş] · **Süre:** [X] gün · **Durum:** ✅ Tamamlandı / ⚠️ Kısmi
**Dal:** `feature/faz-XX-slug` · **PR:** #NN · **Commit aralığı:** `abc123..def456`

---

#### 1. Fazın Konusu
[2-3 cümle: bu faz neydi, projede hangi boşluğu doldurdu, neden bu sırada geldi]

#### 2. Yapılması Planlananlar
ROADMAP'teki kapsam maddeleri:
- [x] Madde 1
- [x] Madde 2
- [ ] Madde 3 — **YAPILMADI**, gerekçe: [...]

#### 3. Gerçekte Yapılanlar
- **Eklenen:** [yeni modüller, dosyalar, özellikler — somut]
- **Değiştirilen:** [dokunulan mevcut kod ve neden]
- **Silinen:** [kaldırılan şeyler ve neden]

#### 4. Plandan Sapmalar
| Ne | Plan | Yapılan | Gerekçe |
|---|---|---|---|
| ... | ... | ... | ... |

Sapma yoksa: "Sapma yok."

#### 5. Karşılaşılan ve Giderilen Hatalar
| # | Hata | Kök neden | Çözüm | Tekrar önleme |
|---|---|---|---|---|
| 1 | [belirti] | [gerçek sebep, "sanırım" değil] | [ne yapıldı] | [test/lint kuralı eklendi mi] |

#### 6. Kontroller ve Sonuçları
| Kontrol | Komut | Sonuç |
|---|---|---|
| Tip kontrolü | `pnpm typecheck` | ✅ 0 hata |
| Lint | `pnpm lint` | ✅ 0 uyarı |
| Birim testler | `pnpm test` | ✅ 284/284, kapsam %78 |
| Motor kapsamı | `pnpm test --coverage` | ✅ %89 (eşik %85) |
| Mimari kontrol | `pnpm arch:check` | ✅ ihlal yok |
| Build | `pnpm build` | ✅ amd64 + arm64 |
| [faza özel] | `pnpm validate:save` | ✅ 0 ihlal |

#### 7. Performans Ölçümleri
| Metrik | Bütçe | Ölçülen | Durum |
|---|---|---|---|
| Kayıt yazma (delta) | < 300 ms | 180 ms | ✅ |
| Snapshot sıkıştırma | < 300 ms | 4.200 ms | ❌ → SORUN-004 |

Bu fazda ölçülecek performans metriği yoksa: "Bu fazda performans bütçesi yok."

#### 8. Kabul Kriterleri Doğrulaması
ROADMAP'teki kabul kriterleri tek tek:
- [x] Kriter 1 — nasıl doğrulandı: [...]
- [x] Kriter 2 — nasıl doğrulandı: [...]
- [ ] Kriter 3 — **SAĞLANMADI**: [gerekçe + hangi faza taşındı]

#### 9. Oluşturulan / Değişen Önemli Dosyalar
```
packages/db/src/world/world-view.ts        [YENİ] Master+delta birleştirme
packages/db/src/world/world-mutation.ts    [YENİ] Delta yazma katmanı
packages/db/src/schema/saves.ts            [DEĞİŞTİ] snapshot alanları eklendi
```

#### 10. Yeni Açılan Sorun / Borç / Sapma
- SORUN-004 (Yüksek) — [açıklama]
- BORÇ-002 — [açıklama]

Yoksa: "Yok."

#### 11. Sonraki Faz İçin Devir Teslim
- **Sıradaki faz:** Faz [XX+1] — [ad]
- **O fazda yapılacaklar (ROADMAP özeti):** [3-5 madde]
- **Bu fazdan taşınan bağlam:** [sonraki fazın bilmesi gereken kararlar, tuzaklar, hazır altyapı]
- **Sıradaki oturumun okuması gereken spec:** `docs/spec/XX-...md`
- **Dikkat edilmesi gerekenler:** [uyarılar]
```

## 12.6 Örnek Doldurulmuş Kayıt (Kısaltılmış)

```markdown
### FAZ 5 — i18n Altyapısı ve Terim Sözlüğü
**Tarih:** 2026-09-02 → 2026-09-03 · **Süre:** 2 gün · **Durum:** ✅ Tamamlandı
**Dal:** `feature/faz-05-i18n` · **PR:** #5 · **Commit:** `7c1a44..9e2b03`

#### 1. Fazın Konusu
Arayüzdeki hiçbir metnin koda gömülmemesini sağlayan çeviri katmanı. İngilizce v2'de gelecek
ama altyapı şimdi kuruldu — sonradan binlerce metni geri dönüp çıkarmak yaklaşık 3 faz kayıp
demekti.

#### 5. Karşılaşılan ve Giderilen Hatalar
| # | Hata | Kök neden | Çözüm | Tekrar önleme |
|---|---|---|---|---|
| 1 | "Beşiktaş'ın" yerine "Beşiktaş'nın" üretiliyordu | Ünlü uyumu son **hecedeki** sesliye bakmalıyken son **harfe** bakıyordu | `lastVowel()` yardımcısı yazıldı, sondan başa tarıyor | 50 kulüp adı test vakası eklendi |
| 2 | ESLint kuralı JSX attribute'larındaki Türkçe metni kaçırıyordu | Kural sadece `JSXText` düğümünü tarıyordu | `JSXAttribute` + `Literal` de tarama kapsamına alındı | Kuralın kendisi için test yazıldı |

#### 11. Sonraki Faz İçin Devir Teslim
- **Sıradaki faz:** Faz 6 — Tasarım Sistemi ve Bileşen Kütüphanesi
- **Bu fazdan taşınan bağlam:** `t()` fonksiyonu `packages/shared/src/i18n`'den export ediliyor.
  Faz 6'daki her bileşen metni buradan almalı — Storybook hikayelerinde de `I18nextProvider`
  sarmalayıcısı gerekli, yoksa hikayeler ham anahtar gösterir.
- **Dikkat:** `turkish-suffix.ts` şu an sadece 6 ek tipini destekliyor (gen/acc/dat/loc/abl/ins).
  Faz 45'teki haber üretimi çoğul ekine ihtiyaç duyarsa genişletilmeli.
```

## 12.7 Faz 0 Tohum Kaydı

Proje başlarken `PROJECT_MEMORY.md` şu içerikle oluşturulur:

```markdown
### FAZ 0 — Belge Bölme ve Repo Kurulumu
**Durum:** ✅ Tamamlandı

#### 3. Gerçekte Yapılanlar
- `ana-prompt.md` Bölüm 0.1'deki haritaya göre bölündü
- `CLAUDE.md`, `docs/spec/*`, `docs/ROADMAP.md`, `docs/V2-BACKLOG.md` oluşturuldu
- `PROJECT_MEMORY.md` bu kayıtla başlatıldı

#### 11. Sonraki Faz İçin Devir Teslim
- **Sıradaki faz:** Faz 1 — Monorepo, Araç Zinciri ve Kalite Kapıları
- **Okunacak spec:** `docs/spec/09-quality-protocol.md`, `CLAUDE.md` Bölüm 2
- **Dikkat:** Faz 1'de `PUBLIC_BASE_PATH=/fms` alt yol yapılandırması kilitlenmeli;
  bu sonradan düzeltilmesi çok pahalı bir hata sınıfıdır.
```


---
