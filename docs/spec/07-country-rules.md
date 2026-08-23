<!-- Bu dosya ana spesifikasyondan üretilmiştir. Kaynak: docs/MASTER-SPEC.md -->

# 9. ÜLKE KURAL SETLERİ

## 9.1 İngiltere — GBE (Brexit Çalışma İzni)

AB dışı ve AB'li tüm yabancı oyuncular için puan gerekir. **15 puan = otomatik onay**, 10–14 = istisna komitesi (%40 onay), <10 = ret.

**Puan tablosu:**

| Kriter | Koşul | Puan |
|---|---|---|
| **Milli takım maçları** (son 2 yıl, ülke FIFA sıralamasına göre) | FIFA 1–10, %30+ maç | 12 |
| | FIFA 1–10, %20–29 | 10 |
| | FIFA 11–20, %30+ | 10 |
| | FIFA 21–30, %30+ | 8 |
| | FIFA 31–50, %30+ | 6 |
| **Kulüp maçları** (son sezon lig dakikası) | %90+ | 12 |
| | %70–89 | 10 |
| | %50–69 | 7 |
| | %30–49 | 4 |
| **Kıta turnuvası dakikası** | %90+ | 10 |
| | %60–89 | 7 |
| | %30–59 | 4 |
| **Satıcı kulübün lig bandı** | Band 1 (ESP, GER, ITA, FRA) | 12 |
| | Band 2 (POR, NED, TUR, BEL) | 8 |
| | Band 3 | 5 |
| | Band 4–6 | 2 |
| **Kulübün lig sıralaması** | İlk %25 | 3 |
| | %25–50 | 2 |
| | %50–75 | 1 |

Puanlar toplanır (her kategoriden en yüksek olan). U21 oyuncular için eşik 10'a düşer.

**Homegrown:** 25 kişilik kadroda en az 8 homegrown (21 yaşından önce 3 yıl İngiliz/Galli kulübünde). U21 oyuncular kadro dışı sayılır, sınırsız kaydedilebilir.

## 9.2 Türkiye — Yabancı Kotası

```
maxForeignInSquad: 14          // kadro listesinde
maxForeignInMatchday: 14       // maç kadrosunda (aynı liste)
homegrownRequirement: null
```
Türk vatandaşı veya çifte vatandaş yabancı sayılmaz. Kota aşılırsa oyuncu kadroya **kaydedilemez** — arayüzde net uyarı: *"Kadronuzda 14 yabancı oyuncu bulunuyor. Bu oyuncuyu kaydetmek için önce bir yabancıyı listeden çıkarmalısınız."*

Transfer öncesi de uyarı verilir (Faz 32).

## 9.3 İspanya — LaLiga Maaş Tavanı

```
salaryCapLimit = f(clubRevenue, existingDebt, playerSaleIncome)
// Kulüp tavanı aşarsa:
//   - Yeni oyuncu kaydı için giden maaşın %50'si (kırmızı bölge) veya %100'ü (yeşil) kullanılabilir
//   - Kadroya kayıt engellenir
maxNonEU: 3          // AB dışı oyuncu kotası
```

## 9.4 İtalya, Almanya, Fransa

```
ITA: maxSquadSize 25, minHomegrown 8 (4 kulüp + 4 federasyon), maxNonEU 2 (transfer başına)
GER: maxSquadSize null, minLocallyTrained 12 (Lizenzspieler kuralı)
FRA: maxSquadSize 30, minHomegrown 8, JIFF kuralı (yerel yetiştirilen)
```

## 9.5 UEFA Kulüp Turnuvaları

**A Listesi:** 25 oyuncu, bunların **8'i homegrown** olmalı:
- 4 kulüp yetiştirmesi (15–21 yaş arası 3 sezon aynı kulüpte)
- 4 federasyon yetiştirmesi (aynı ülkenin herhangi bir kulübünde)

Homegrown eksikse A listesi **daralır** (8 yerine 6 homegrown varsa liste 23'e iner).

**B Listesi:** Sınırsız. 21 yaşından küçük, 15 yaşından beri kulüpte olan oyuncular.

**Liste kilitlenme:** Lig aşaması başlangıcı, kış transfer dönemi sonrası güncellenebilir.

**Katsayı:** Kulüp katsayısı 5 yıllık UEFA performansı; ülke katsayısı o ülkenin kulüplerinin ortalaması. Kota dağıtımı katsayı sıralamasına göre her sezon yeniden hesaplanır.

## 9.6 Format Detayları

```
Premier League   20 takım, 38 maç, 3 düşer, 4 UCL + 2 UEL + 1 UECL
LaLiga           20 takım, 38 maç, 3 düşer
Bundesliga       18 takım, 34 maç, 2 düşer + 1 play-off
Serie A          20 takım, 38 maç, 3 düşer
Ligue 1          18 takım, 34 maç, 2 düşer + 1 play-off
Süper Lig        18 takım, 34 maç, 3 düşer
                 Şampiyonluk play-off'u: rules.playoffSpots ile yapılandırılabilir (varsayılan 0)

UCL   36 takım İsviçre sistemi, 8 maç → ilk 8 doğrudan son 16,
      9–24 play-off turu, sonrası klasik eleme
UEL   36 takım aynı format
UECL  36 takım, 6 maç
```

Türkiye Kupası: grup aşamalı, sonrası eleme. FA Cup: tek maç eleme + tekrar maçı (5. tura kadar).

---
