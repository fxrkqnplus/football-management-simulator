<!-- Bu dosya ana spesifikasyondan üretilmiştir. Kaynak: docs/MASTER-SPEC.md -->

# 15. CLAUDE CODE OTURUM ŞABLONU

Her faz için yeni bir oturum açılır. Şu şablon kullanılır:

```
FAZ [XX] — [Faz Adı]

BAĞLAM (bu sırayla)
1. PROJECT_MEMORY.md → "ANLIK DURUM" bloğunu ve son İKİ faz kaydını oku.
   Açık sorun / teknik borç / sapma kütüklerini gözden geçir.
2. docs/ROADMAP.md içindeki Faz [XX] bölümünü oku.
3. Şu spesifikasyonları oku: docs/spec/[ilgili dosyalar]
4. docs/SPEC-COVERAGE-GAPS.md → "Hangi faza ait olmalı" sütunu Faz [XX] olan
   satırları oku. Bunlar ROADMAP kapsamına da yazılıdır; kütük "neden" ve
   ölçümü taşır, ROADMAP "ne yapılacak"ı.
   ⚠️ Bu adım Faz 4.0'da eklendi. Kütük Faz 2.0'da açıldı ama HİÇBİR ritüel
      onu okumakla yükümlü değildi — altı boşluk (G-07, G-09, G-10, G-12,
      G-13, G-14) atandıkları fazın kapsamında hiç görünmüyordu. Kütüğün
      önlemek için yaratıldığı hatanın kendisi, kütüğün başına geldi.
5. CLAUDE.md zaten yüklü (anayasa).

ÖN KONTROL (koda dokunmadan önce)
6. `pnpm typecheck && pnpm lint && pnpm test` → hepsi temiz mi?
   Temiz değilse DUR ve bildir.
7. docs/DEPENDENCY-WATCH.md → "Ele alınacak faz" sütunu Faz [XX] olan satırlar.
   ⚠️ Bu adım da Faz 4.0'da eklendi ve aynı sınıf: o dosyanın KENDİ başlığı
      "Her faz açılışında bu tablo kontrol edilir (docs/SESSION-TEMPLATE.md
      ÖN KONTROL)" diyordu, ama bu şablonda öyle bir satır YOKTU.
8. Faz [XX]'in bağımlılıkları tamamlanmış mı? (ROADMAP "Bağımlılık" satırı)
9. Açık sorunlardan bu fazı etkileyen var mı? Ödenmesi bu faza düşen teknik borç var mı?
10. Faz kapsamını kendi cümlelerinle özetle ve bana onaylat.

ÇALIŞMA
11. Kapsamı alt görevlere böl, listeyi bana göster, onay al.
    ⚠️ Onaylanan liste, İLK KODA DOKUNMADAN ÖNCE docs/ROADMAP.md'deki ilgili faz
       bölümüne yazılır. Plan sohbette yaşamaz. Her alt görev bitince orada [x]
       işaretlenir. Gerekçe: commit'ler "ne yapıldı"yı kurtarır, ROADMAP alt görev
       listesi "sırada ne var"ı kurtarır — oturum kurtarma ikisini de gerektirir.
12. Alt görevleri TEK TEK yap. Her birinden sonra DUR ve onay bekle (K11).
13. Her alt görevde: kod + birim testi + i18n anahtarları AYNI commit'te.
    ⚠️ Alt görev kapanış listesi: ROADMAP'te [x] · PROJECT_MEMORY ANLIK DURUM
       güncellendi · yeni SORUN/BORÇ/SAPMA kütüğe yazıldı ·
       **rapor docs/reports/<faz-slug>/<no>-<slug>.md'ye YAZILDI** ·
       commit + push · rapor terminale basıldı (dosyanın AYNISI).
    ⚠️ Rapor ÖNCE dosyaya yazılır, SONRA terminale basılır — biçim ve gerekçe
       docs/OUTPUT-FORMAT.md → "Rapor arşivi (zorunlu)".
14. Karşılaştığın her hatayı, kök nedenini ve çözümünü NOT AL — faz kaydına gireceksin.

FAZ KAPANIŞI
15. **SÜRE ÖLÇÜLDÜ MÜ?** Fazın gerçek gün sayısını hesapla (ilk commit → son commit).
    docs/ROADMAP.md §0.5: "hiçbir faz 3 günü aşmaz; aşacaksa ikiye bölünür ve bu
    belgeye kaydedilir." 3 günü AŞTIYSA: ya faz bölünür, ya istisna ROADMAP'e
    GEREKÇESİYLE yazılır. Sessizce geçilmez.
    ⚠️ Bu adım Faz 4.1'de eklendi (SAPMA-033). §0.5'in ROADMAP:3730'da bir
       "bölünme riski yüksek fazlar" listesi vardı ama o bir TAHMİN: Faz 3 listede
       DEĞİLDİ ve 4 gün sürdü — bölünme olmadı, istisna kaydedilmedi, çünkü süreyi
       ÖLÇEN bir adım yoktu. Tahmin listesi bir kontrol değildir.
16. Kabul kriterlerini tek tek doğrula, sonuçları göster.
17. `pnpm typecheck lint test build arch:check` + faza özel doğrulama komutları.
18. **PROJECT_MEMORY.md'ye faz kaydını yaz** (Bölüm 12.5 şablonu, 11 başlığın hepsi).
19. **ANLIK DURUM bloğunu tamamen yeniden yaz.**
20. Yeni sorun/borç/sapma varsa ilgili kütüğe ekle (SORUN-XXX, BORÇ-XXX, SAPMA-XXX).
21. **docs/SPEC-COVERAGE-GAPS.md** — bu fazda kapanan satırların `Durum`u güncellendi mi?
    Yeni boşluk bulunduysa yeni bir "Tarama N" bölümü açıldı mı? (Satır SİLİNMEZ.)
22. CHANGELOG.md güncelle, ROADMAP.md'de fazı [x] işaretle.
23. PR aç: feature/faz-[XX]-[slug] → develop
24. Kısa demo notu + (arayüz fazıysa) ekran görüntüsü.

KURALLAR
- Her alt görev raporu docs/OUTPUT-FORMAT.md biçiminde verilir (zorunlu).
- PROJECT_MEMORY.md yazılmadan faz KAPANMAZ (K15).
- Yapılmayan şey "yapıldı" yazılmaz. Sağlanmayan kriter [ ] bırakılır, gerekçesi yazılır.
- Eski faz kayıtları geriye dönük DEĞİŞTİRİLMEZ. Düzeltme yeni kayda not olarak eklenir.
- Kapsam dışı fikir → docs/V2-BACKLOG.md, uygulama YOK.
- Belirsizlik → tahmin etme, sor.
- Spesifikasyonda eksik varsa → sor, cevabı docs/spec/'e işle ve SAPMA kütüğüne yaz.
```

## 15.1 Faz → Spesifikasyon Haritası

| Faz | Okunacak spesifikasyon |
|---|---|
| **HEPSİ** | `PROJECT_MEMORY.md` (her oturumun ilk ve son işi) |
| 1–2 | Bölüm 1, 2, 11, 12 |
| 3–4 | Bölüm 3 |
| 5 | Bölüm 13 |
| 6 | Bölüm 7 |
| 7–9 | Bölüm 3, 17 (`docs/spec/12-data-packs.md`) |
| 10 | Bölüm 4 |
| 11 | Bölüm 3, 4, 11, 17 (`docs/spec/12-data-packs.md`) |
| 12 | Bölüm 3 |
| 13 | Bölüm 10, 13 (mod sistemi: `private` varsayılan) |
| 14–15 | Bölüm 4, 6 |
| 16 | Bölüm 5, 11 |
| 17–19 | Bölüm 7, 13 |
| 20–21 | Bölüm 5, 6, 7 |
| 22–26 | Bölüm 5 |
| 27–29 | Bölüm 5, 7 |
| 30–34 | Bölüm 4, 6 |
| 35 | Bölüm 9 |
| 36–38 | Bölüm 4, 6 |
| 39–41 | Bölüm 5, 9 |
| 42–43 | Bölüm 6 |
| 44 | Bölüm 8 |
| 45 | Bölüm 8, 13 |
| 46 | Bölüm 3, 4, 11 |
| 47 | Bölüm 10 |
| 48 | Bölüm 13 |
| 49 | Bölüm 7, 11 |
| 50 | Bölüm 11, 13 |

## 15.2 İlk Oturum (Faz 0 — Kurulum)

Projeye başlarken **ilk iş** bu belgeyi bölmektir:

```
Bu belgeyi (ana-prompt.md) Bölüm 0.1'deki haritaya göre böl:
- CLAUDE.md           ← Bölüm 1 + 2 + 14
- PROJECT_MEMORY.md   ← Bölüm 12.7'deki Faz 0 tohum kaydıyla başlat
- docs/spec/*.md      ← Bölüm 3-13
- docs/SESSION-TEMPLATE.md ← Bölüm 15
- docs/ROADMAP.md     ← faz-yol-haritasi.md içeriği
- docs/V2-BACKLOG.md  ← yol haritasındaki v2 kasası tablosu

Sonra Faz 1'e başla.
```

---
