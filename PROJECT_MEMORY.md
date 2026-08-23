# PROJECT MEMORY — Football Management Simulator

> **Bu dosya oturumlar arası devir teslim belgesidir.**
> Kuralları: `docs/spec/11-project-memory.md`
>
> **Her oturumun İLK işi:** aşağıdaki ANLIK DURUM bloğunu ve son iki faz kaydını okumak.
> **Her fazın SON işi:** faz kaydını yazmak ve ANLIK DURUM'u yeniden yazmak (K15).
>
> Bu dosya **append-only**'dir. Eski faz kayıtları geriye dönük değiştirilmez.
> Sadece ANLIK DURUM bloğu her fazda tamamen yeniden yazılır.

---

## ⚡ ANLIK DURUM

| | |
|---|---|
| **Son tamamlanan faz** | Faz 0 — Belge Bölme ve Repo Kurulumu |
| **Tamamlanma tarihi** | _(doldurulacak)_ |
| **Sıradaki faz** | **Faz 1 — Monorepo, Araç Zinciri ve Kalite Kapıları** |
| **Genel ilerleme** | 0 / 50 (%0) |
| **Bloke eden var mı?** | Hayır |
| **Son commit** | — |
| **Testler** | Henüz test yok |
| **Açık sorun sayısı** | 0 |
| **Teknik borç sayısı** | 0 |

**Sıradaki oturumda ilk yapılacak:**
1. `docs/ROADMAP.md` → Faz 1 bölümünü oku
2. `docs/spec/09-quality-protocol.md` ve `CLAUDE.md` Bölüm 2'yi oku
3. Faz 1 kapsamını özetle, kullanıcıya onaylat
4. Alt görevlere böl, onay al, tek tek ilerle

**Faz 1'e girerken bilinmesi gerekenler:**
- **Veri modu:** `DATA_MODE=full` varsayılan — gerçek armalar, portreler, isimler, formalar.
  `docs/spec/12-data-packs.md` bu hattın tam spesifikasyonu. Prosedürel üretim yedek olarak
  kalır (newgen'ler ve eksik varlıklar için her zaman gerekli).
- **Sunucu modu:** `SERVER_MODE=private` varsayılan. Kayıt açık ama yalnızca izin listesindeki
  hesaplar oynar. Public'e geçiş bilinçli bir karar — o zaman KVKK metinleri aktive edilir.
- `PUBLIC_BASE_PATH=/fms` alt yol yapılandırması **Faz 1'de kilitlenmeli.**
  Uygulama kök alan adında değil, `fxrkqn.org/fms` alt yolunda çalışacak.
  Bu sonradan düzeltilmesi çok pahalı bir hata sınıfıdır (Vite base, Router basename,
  çerez path, servis çalışanı kapsamı, PWA manifest — hepsi ayrı ayrı kırılır).
- Üretim ortamı **ARM64** (Oracle Ampere A1). CI hem `amd64` hem `arm64` build almalı,
  yoksa ARM uyumsuzluğu üretimde patlar.
- Repo **public**. Gizli tarama ve push koruması Faz 1'de açılmalı.

---

## 🔴 AÇIK SORUNLAR KÜTÜĞÜ

| ID | Faz | Açıklama | Öncelik | Durum | Çözüldüğü faz |
|---|---|---|---|---|---|
| — | — | _Henüz açık sorun yok_ | — | — | — |

---

## 🟡 TEKNİK BORÇ KÜTÜĞÜ

| ID | Faz | Borç | Neden ertelendi | Ödenmesi gereken faz |
|---|---|---|---|---|
| — | — | _Henüz teknik borç yok_ | — | — |

---

## 🔵 SPESİFİKASYON SAPMALARI

> Spesifikasyondan veya yol haritasından sapılan her nokta. **Asla silinmez.**

| ID | Faz | Sapma | Gerekçe | Spec güncellendi mi |
|---|---|---|---|---|
| SAPMA-002 | Spec yazımı | Veri modeli "prosedürel birincil" → "gerçek birincil" (`DATA_MODE=full` varsayılan). KVKK/GDPR zorunludan koşullu hale geldi (`SERVER_MODE=public` ise). | Proje herkese açık yayınlanmayacak, kişisel kurulum. Sunucu Özel modda açılır, yalnızca izin listesi oynar. Gerçek veri estetik kalite için gerekli. | ✅ `CLAUDE.md` K9, `docs/spec/12-data-packs.md`, ROADMAP Faz 8/9/13 |
| SAPMA-001 | Spec yazımı | Gizli nitelik sayısı 8 → 10 (`adaptability`, `temperament` eklendi) | Faz 34'teki yabancı lig uyum süreci ve Faz 44'teki diyalog tepki sistemi bu ikisi olmadan kurulamıyordu | ✅ `docs/spec/02-attributes.md` Bölüm 4.1 |

---

# 📋 FAZ KAYITLARI

> En yeni kayıt en üstte. Yeni faz kaydı buraya, bu satırın hemen altına eklenir.

---

### FAZ 0 — Belge Bölme ve Repo Kurulumu
**Tarih:** _(doldurulacak)_ · **Durum:** ✅ Tamamlandı

#### 1. Fazın Konusu
Ana spesifikasyon belgesi (111 bin karakter) tek parça halinde her oturumda okunamayacak
kadar büyüktü. Bağlam israfını önlemek için anayasa `CLAUDE.md`'ye, derin spesifikasyonlar
`docs/spec/` altına bölündü. Ayrıca oturumlar arası süreklilik için `PROJECT_MEMORY.md`
kuruldu.

#### 2. Yapılması Planlananlar
- [x] `ana-prompt.md` Bölüm 0.1'deki haritaya göre bölünsün
- [x] `CLAUDE.md` oluşturulsun (Bölüm 1 + 2 + 14)
- [x] `docs/spec/01..11` oluşturulsun
- [x] `docs/ROADMAP.md` oluşturulsun
- [x] `docs/V2-BACKLOG.md` oluşturulsun
- [x] `docs/SESSION-TEMPLATE.md` oluşturulsun
- [x] `PROJECT_MEMORY.md` başlatılsın

#### 3. Gerçekte Yapılanlar
- **Eklenen:** Tüm belge yapısı (aşağıdaki dosya listesi)
- **Değiştirilen:** —
- **Silinen:** —

#### 4. Plandan Sapmalar
Sapma yok.

#### 5. Karşılaşılan ve Giderilen Hatalar
Yok — bu faz yalnızca belge organizasyonu.

#### 6. Kontroller ve Sonuçları
| Kontrol | Sonuç |
|---|---|
| Tüm 16 bölüm doğru dosyalara ayrıştı mı | ✅ |
| Kod bloğu bütünlüğü (açılış/kapanış çiftleri) | ✅ |
| Bölüm içi çapraz referanslar tutarlı mı | ✅ |
| Dosya haritası ile gerçek dosyalar eşleşiyor mu | ✅ |

#### 7. Performans Ölçümleri
Bu fazda performans bütçesi yok.

#### 8. Kabul Kriterleri Doğrulaması
- [x] `CLAUDE.md` ~20 bin karakter — her oturumda yüklenebilir boyutta
- [x] Her spec dosyası bağımsız okunabilir
- [x] `docs/MASTER-SPEC.md` tam arşiv olarak korundu

#### 9. Oluşturulan / Değişen Önemli Dosyalar
```
CLAUDE.md                          [YENİ] Anayasa + yığın + sözlük
PROJECT_MEMORY.md                  [YENİ] Bu dosya
docs/ROADMAP.md                    [YENİ] 50 faz + v2 kasası
docs/SESSION-TEMPLATE.md           [YENİ] Oturum akışı
docs/V2-BACKLOG.md                 [YENİ] Kapsam dışı kasa
docs/MASTER-SPEC.md                [YENİ] Tam arşiv
docs/spec/01-database.md           [YENİ]
docs/spec/02-attributes.md         [YENİ]
docs/spec/03-match-engine.md       [YENİ]
docs/spec/04-ai-scoring.md         [YENİ]
docs/spec/05-design-system.md      [YENİ]
docs/spec/06-dialogue.md           [YENİ]
docs/spec/07-country-rules.md      [YENİ]
docs/spec/08-admin-panel.md        [YENİ]
docs/spec/09-quality-protocol.md   [YENİ]
docs/spec/10-deployment.md         [YENİ]
docs/spec/11-project-memory.md     [YENİ]
docs/spec/12-data-packs.md         [YENİ] Veri paketi formatı, gerçek varlık hattı
docs/PROMPT-KITAPCIGI.md           [YENİ] Ateşleme / faz / kurtarma promptları
```

#### 10. Yeni Açılan Sorun / Borç / Sapma
- SAPMA-001 kayda geçirildi (spesifikasyon yazımı sırasında oluşmuştu, geriye dönük kayıt).

#### 11. Sonraki Faz İçin Devir Teslim
- **Sıradaki faz:** Faz 1 — Monorepo, Araç Zinciri ve Kalite Kapıları
- **O fazda yapılacaklar:**
  1. pnpm workspaces + Turborepo kurulumu, klasör yapısı
  2. TypeScript strict + ESLint + Prettier + Vitest
  3. Docker Compose (Postgres 16, Redis 7) — ARM64 uyumlu
  4. `PUBLIC_BASE_PATH=/fms` alt yol yapılandırması + `basePath()` yardımcısı + ESLint kuralı
  5. GitHub Actions CI (lint → typecheck → test → build, amd64 + arm64)
  6. Public repo güvenliği: gizli tarama, push koruması, Dependabot, `.gitignore`
  7. `LICENSE` (AGPL-3.0)
- **Bu fazdan taşınan bağlam:** Belge yapısı hazır. Faz 1'de kod yazmadan önce
  `docs/spec/09-quality-protocol.md` okunmalı — kalite kapıları oradan geliyor.
- **Okunacak spec:** `docs/spec/09-quality-protocol.md`, `CLAUDE.md` Bölüm 2
- **Dikkat:** Faz 1 ve Faz 2 (gözlemlenebilirlik) **kod yazılmadan önce** gelir. Bu bilinçli:
  `correlationId` zinciri sonradan eklenirse işe yaramaz.
