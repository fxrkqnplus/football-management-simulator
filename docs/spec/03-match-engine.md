<!-- Bu dosya ana spesifikasyondan üretilmiştir. Kaynak: docs/MASTER-SPEC.md -->

# 5. MAÇ MOTORU SPESİFİKASYONU

## 5.1 Mimari

`packages/engine/src/match/` — tamamen saf (K3). Girdi: iki takım durumu + taktik + bağlam + tohum. Çıktı: `MatchResult`.

```ts
function simulateMatch(input: MatchInput): MatchResult

interface MatchInput {
  home: TeamState; away: TeamState
  tactics: { home: Tactics; away: Tactics }
  context: MatchContext          // hakem, hava, zemin, seyirci, önem
  seed: bigint
  tier: 'full' | 'medium' | 'statistical'
}

interface MatchResult {
  homeGoals: number; awayGoals: number
  events: MatchEvent[]           // TEK doğruluk kaynağı
  playerStats: PlayerMatchStats[]
  teamStats: { home: TeamStats; away: TeamStats }
  debugTrace?: MatchDebugTrace
}
```

**Olay akışı (event stream)** her şeyin kaynağıdır: 2D oynatıcı, anlatım, istatistik, ısı haritası, maç sonrası analiz — hepsi aynı `MatchEvent[]` dizisinden türetilir. İkinci bir hesaplama yapılmaz.

## 5.2 Üç Katman

> **`EngineTier` ile `SimulationPolicy` ayrı şeylerdir.**
> Bu bölümdeki `full` / `medium` / `statistical` değerleri **EngineTier**'dır:
> maç başına, motor içi, kullanıcıya görünmez.
> Kullanıcının kariyer oluştururken seçtiği şey **SimulationPolicy**'dir
> (`balanced` · `full`, kayıt başına, ortam varsayılanı `DEFAULT_SIM_POLICY`).
> `balanced` politikası maç maç EngineTier seçer: kullanıcının maçı `full`,
> kendi ligi `medium`, diğer ülkeler `statistical`.
> Kayıt alanının adı `saves.simulationPolicy`'dir (`simulationTier` DEĞİL).

| Katman | Ne zaman | Yöntem | Hedef süre |
|---|---|---|---|
| `full` | Kullanıcının maçı; `simulationPolicy='full'` ise tüm maçlar | Tam tik döngüsü, 22 oyuncu konumu, tüm olaylar | < 250 ms |
| `medium` | Kullanıcının ligindeki diğer maçlar | Basitleştirilmiş pozisyon modeli, konum takibi yok | < 20 ms |
| `statistical` | Diğer ülkelerin ligleri (Dengeli modda) | Dixon-Coles benzeri, gol dağılımı + kart + sakatlık | < 1 ms |

Üç katman da **aynı tohumla aynı skoru üretmek zorunda değildir** (farklı modeller), ancak her biri kendi içinde deterministiktir. Bir maçın katmanı `matches` tablosuna yazılır ve değişmez.

## 5.3 Tik Döngüsü (full)

```
1080 tik = 90 dakika (tik = 5 saniye) + uzatma
Her tik:
  1. Konum güncelle       (roller + top konumu + faz)
  2. Faz belirle          (buildup|progression|final_third|attack|defence|transition)
  3. Aksiyon seç          (top sahibi oyuncunun kararı)
  4. Aksiyonu çöz         (5.5)
  5. Kondisyon tüket
  6. Momentum güncelle
  7. Olay üret
  8. Kesinti kontrolü     (sakatlık, kart, değişiklik, duran top)
```

## 5.4 Temel Yarışma Formülü

Motordaki **her** karşılaştırma bu formülü kullanır — tutarlılık için başka bir yöntem kullanılmaz:

```ts
function contest(a: number, b: number, sharpness = 1.6): number {
  const A = Math.max(0.1, a), B = Math.max(0.1, b);
  return A ** sharpness / (A ** sharpness + B ** sharpness);
}
```

`sharpness` sonucun ne kadar deterministik olduğunu belirler:
- `1.2` — sürpriz olasılığı yüksek (dripling, ikili mücadele)
- `1.6` — varsayılan
- `2.2` — güçlü olan neredeyse hep kazanır (hava topu boy farkı)

## 5.5 Aksiyon Çözümlemeleri

### Pas

```ts
attackerRating =
    passing     × 0.30
  + technique   × 0.18
  + vision      × 0.18
  + decisions   × 0.14
  + composure   × 0.12
  + firstTouch  × 0.08

pressureFactor  = 1 − (pressure / 4) × (1 − composure / 26)   // pressure: 0-3
distanceFactor  = distance <= 15 ? 1.0
                : distance <= 30 ? 0.88
                : 0.70
lanePenalty     = throughBall ? 0.72 : crossField ? 0.84 : 1.0
weatherFactor   = { clear:1.0, cloudy:1.0, rain:0.94, heavy_rain:0.87, snow:0.82, fog:0.93, windy:0.91 }
pitchFactor     = { excellent:1.02, good:1.0, average:0.97, poor:0.92, terrible:0.86 }

effectiveAttack = attackerRating × pressureFactor × distanceFactor
                × lanePenalty × weatherFactor × pitchFactor × conditionFactor

defenderRating  = (positioning × 0.40 + anticipation × 0.35 + concentration × 0.25) × 0.62

P(success) = contest(effectiveAttack, defenderRating, 1.5)
```

Başarısızlıkta: %62 kesilme (rakip topu kazanır), %28 auta, %10 rakibe düşen serbest top.

### Dripling

```ts
attacker = dribbling × 0.32 + agility × 0.18 + balance × 0.14
         + acceleration × 0.16 + flair × 0.10 + technique × 0.10
defender = tackling × 0.30 + positioning × 0.24 + anticipation × 0.20
         + pace × 0.14 + acceleration × 0.12

P(success) = contest(attacker × conditionFactor, defender × 1.05, 1.25)
```
Başarısızlıkta: `contest(defender.dirtiness, 12, 1.4)` olasılıkla faul → duran top.

### İkili Mücadele (yer)

```ts
rating = strength × 0.30 + balance × 0.22 + aggression × 0.16
       + bravery × 0.16 + determination × 0.16
P(A) = contest(ratingA × conditionA, ratingB × conditionB, 1.4)
```

### Hava Topu

```ts
heightBonus = (heightCm − 180) × 0.10           // 190 cm → +1.0
rating = jumpingReach × 0.34 + heading × 0.26 + strength × 0.18
       + bravery × 0.12 + positioning × 0.10 + heightBonus
P(A) = contest(ratingA, ratingB, 2.0)
```

### Müdahale (Tackle)

```ts
P(cleanTackle) = contest(tackling × 0.6 + anticipation × 0.4,
                         dribbling × 0.5 + balance × 0.5, 1.5)

// Temiz değilse faul olasılığı:
P(foul) = clamp(0.15, 0.85, 0.30 + dirtiness × 0.022 + aggression × 0.012
                            − referee.foulTolerance × 0.015)

// Faulse kart olasılığı:
cardScore = referee.strictness × 0.5 + foulSeverity × 3.0
          + matchTension × 0.8 + (isDangerZone ? 2.5 : 0)
P(yellow) = clamp(0.05, 0.75, cardScore / 28)
P(red)    = foulSeverity >= 4 ? 0.55 : (isLastMan ? 0.70 : 0.015)
```

`matchTension` = derbi yoğunluğu + skor farkı yakınlığı + dakika (geç dakika ↑) + kart sayısı.

## 5.6 Şut ve xG

**xG lojistik modeli** (katsayılar kalibre edilmiş, değiştirilmemeli):

```ts
z = 1.85
  − 1.42 × Math.log(distanceMeters)
  + 1.10 × angleRatio                      // 0-1, kale açıklığının görünen oranı
  + bodyPartCoef                           // foot: 0 | head: −0.65 | other: −0.40
  − 0.28 × pressure                        // 0-3
  + assistCoef                             // throughBall +0.35 | cross +0.10
                                           // rebound +0.45 | setPiece −0.15 | openPlay 0
  + 0.22 × (isCounterAttack ? 1 : 0)
  − 0.30 × (defendersInLine)               // kaleci hariç çizgideki savunmacı, 0-2

xG = 1 / (1 + Math.exp(−z))
```

Doğrulama: ortalama şut xG **0.09–0.13** aralığında olmalı.

**Şut sonucu:**

```ts
finishingQuality = (finishing × 0.42 + composure × 0.22 + technique × 0.20
                  + (isLongShot ? longShots × 0.16 : 0)) / 20     // 0-1

adjustedXG = xG × (0.62 + finishingQuality × 0.76)                // ±%38 oyuncu etkisi

keeperQuality = (reflexes × 0.30 + positioning × 0.22 + handling × 0.18
               + oneOnOnes × 0.16 + aerialReach × 0.08 + concentration × 0.06) / 20

saveModifier = 0.78 + keeperQuality × 0.44                        // 0.78 - 1.22
finalGoalProb = adjustedXG / saveModifier

roll = rng.next()
if (roll < finalGoalProb)                          → GOAL
else if (roll < finalGoalProb + 0.24)              → SAVE
else if (roll < finalGoalProb + 0.30)              → POST/CROSSBAR
else if (roll < finalGoalProb + 0.42)              → BLOCKED
else                                               → OFF_TARGET
```

**Sekme (rebound):** SAVE sonrası
```ts
P(rebound) = clamp(0.05, 0.45, 0.35 − keeper.handling × 0.018)
```
Sekerse yeni şut fırsatı (`assistCoef = rebound`).

## 5.7 Kaleci Modeli

| Nitelik | Etki |
|---|---|
| `reflexes` | Yakın mesafe (<12 m) kurtarışa +%40 ağırlık |
| `handling` | Sekme olasılığını düşürür (yukarıdaki formül) |
| `oneOnOnes` | Tekebir pozisyonda `saveModifier`'a ×1.15'e kadar bonus |
| `positioning` | Şut anındaki `angleRatio`'yu düşürür: `angleRatio × (1 − positioning × 0.012)` |
| `aerialReach` + `commandOfArea` | Orta çıkışı: `P(claim) = contest(aerialReach×0.5+commandOfArea×0.5, attackerAerial, 1.8)` |
| `rushingOut` | Yüksek savunma hattında arkaya atılan topu kesme |
| `kicking` + `throwing` | Dağıtım kalitesi → sonraki pasın `distanceFactor`'ı |
| `communication` | Takımın savunma niteliklerine `+communication × 0.03` bonus |
| `eccentricity` | Yüksekse riskli çıkış olasılığı ↑ (hata veya süper kurtarış) |
| `tendencyToPunch` | Yumruklama vs. tutma tercihi |

## 5.8 Duran Toplar

Hedef: toplam gollerin **%26–34'ü** duran toptan (penaltı dahil).

### Penaltı
```ts
takerRating   = penaltyTaking × 0.45 + composure × 0.30 + technique × 0.25
keeperRating  = (hidden.penaltySavingProxy) × 0.40 + reflexes × 0.35 + oneOnOnes × 0.25
// penaltySavingProxy = (reflexes + oneOnOnes + anticipation) / 3

pressureAdj   = isDecisiveMoment ? (1 − (20 − pressure) × 0.010) : 1.0
P(goal) = clamp(0.55, 0.94,
          0.76 + (takerRating − 12) × 0.018 − (keeperRating − 12) × 0.012) × pressureAdj
```
Hedef gol oranı: **%74–80**.

### Direkt Frikik
```ts
distanceFactor = clamp(0.05, 1.0, 1.45 − distanceMeters × 0.042)
angleFactor    = angleRatio ** 0.6
takerRating    = freeKickTaking × 0.50 + technique × 0.30 + composure × 0.20

baseProb = 0.055 × distanceFactor × angleFactor × (0.45 + takerRating / 20 × 1.10)
P(goal)  = baseProb / saveModifier
// Kalan: %30 baraj, %35 kurtarış, %35 aut
```

### Korner
```ts
deliveryQuality = (corners × 0.55 + crossing × 0.30 + technique × 0.15) / 20
                × weatherFactor × (1 − pressure × 0.05)

// Hedef oyuncu seçimi: ceza sahasındaki saldıranlar arasında
// ağırlık = jumpingReach×0.4 + heading×0.35 + offTheBall×0.15 + bravery×0.10

attackAerial  = hedefOyuncu hava topu ratingi
defenceAerial = en yakın savunmacı + (zoneMarking ? organizasyon bonusu : 0)
keeperClaim   = P(claim) — 5.7'deki formül

if (keeper claims)                    → kurtarış
else if contest(attackAerial, defenceAerial, 1.9) → kafa şutu (xG hesabı, assistCoef = setPiece)
else if rng < 0.18                    → karambol (ikinci top, rastgele oyuncuya)
else                                  → uzaklaştırma

P(cornerGoal) yaklaşık = deliveryQuality × 0.055 + 0.012
```
Korner→gol dönüşüm hedefi: **%2.5–4.0**.

### Uzun Taç
`longThrows >= 15` olan oyuncu varsa korner benzeri rutin, `deliveryQuality = longThrows / 20 × 0.8`.

## 5.9 Bağlam Katmanı

### Ev Sahibi Avantajı
```ts
attendanceRatio = attendance / stadiumCapacity
atmosphere = attendanceRatio × (0.6 + supporterExpectation / 100 × 0.4)
           × (1 + rivalryIntensity × 0.05)

homeBonus = 0.030 + atmosphere × 0.035 + referee.homeBias × 0.0018
// Ev sahibinin tüm aksiyon ratinglerine × (1 + homeBonus)
// Deplasman moraline: −atmosphere × 0.04
```
Hedef: ev sahibi galibiyet **%43–48**, beraberlik **%23–28**.

### Kondisyon
```ts
// Dakika başı tüketim
drain = baseDrain(0.55)
      × (1 + workRate / 40)
      × (1 + pressingIntensity × 0.12)          // 0-4
      × (2.0 − stamina / 20)
      × weatherStaminaFactor                     // sıcak 1.18, kar 1.12, normal 1.0
      × pitchStaminaFactor                       // berbat 1.15

condition -= drain

// Kondisyon nitelik cezası
if (condition < 70)  fizikselNitelikler × (0.70 + condition / 233)
if (condition < 50)  zihinselNitelikler × (0.82 + condition / 278)
```

### Sakatlık
```ts
P(injuryPerAction) = base(0.00018)
  × (1 + injuryProneness × 0.11)
  × (1 + (100 − condition) × 0.014)
  × pitchInjuryFactor          // berbat 1.45, kötü 1.22, normal 1.0
  × weatherInjuryFactor         // kar 1.20, şiddetli yağmur 1.12
  × (1 + max(0, age − 29) × 0.06)
  × (isTackled ? 2.4 : 1.0)
  × trainingLoadFactor          // son 4 hafta yoğunluk, 0.85 - 1.35
```
Hedef: maç başına **0.15–0.35** sakatlık.

### VAR
Ligde `varEnabled` ise şu olaylarda inceleme tetiklenir:
```
Gol sonrası ofsayt:      P(review) = 0.12  → P(overturn) = 0.28
Penaltı kararı:          P(review) = 0.22  → P(overturn) = 0.24
Kırmızı kart:            P(review) = 0.35  → P(overturn) = 0.20
Verilmemiş penaltı:      P(review) = 0.08  → P(award) = 0.31

overturnProb × (1.35 − referee.consistency × 0.030)   // tutarsız hakem daha çok bozulur
```
İnceleme süresi 45–180 sn, uzatmaya eklenir. `VAR_REVIEW_START` ve `VAR_REVIEW_END` olayları üretilir.

## 5.10 Momentum

```ts
momentum: 0-100, başlangıç 50
Gol atma:        +14        Gol yeme:        −14
İsabetli şut:    +2.5       Kırmızı kart:    −18 (alan) / +12 (rakip)
Direkten dönen:  +4         Sakatlık:        −4
Kurtarış:        +1.5       Kaçan net fırsat: −3
Her tik:         50'ye doğru 0.6 birim geri çekilir

Etki: hücum aksiyonu seçme olasılığı × (0.86 + momentum / 350)
      taraftar uğultusu yoğunluğu = f(momentum, top konumu)
```

## 5.11 Oyuncu Maç Reytingi

```
6.0 taban. Mevkiye göre ağırlıklı olay puanlaması:

TÜM MEVKİLER
  Gol +1.10 (ST için +0.95, DC için +1.35)
  Asist +0.65 | Anahtar pas +0.12 | Başarılı dripling +0.06
  Top kaybı −0.05 | Sarı kart −0.25 | Kırmızı kart −1.20
  Kaçırılan net fırsat (xG>0.35) −0.30 | Penaltı kaçırma −0.60

KALECİ
  Kurtarış +0.16 | Süper kurtarış (xG>0.4) +0.42 | Penaltı kurtarma +0.85
  Gol yeme −0.28 | Clean sheet +0.55 | Hata → gol −1.05

SAVUNMA
  Başarılı müdahale +0.09 | Top kesme +0.08 | Uzaklaştırma +0.04
  Hava topu kazanma +0.05 | Hata → gol −0.95 | Geçilme −0.07

ORTA SAHA
  Pas isabeti bonusu: (accuracy − 0.80) × 2.2
  İlerletici pas +0.05 | Top kazanma +0.07

Son: clamp(1.0, 10.0, round(rating, 1))
```

## 5.12 Gol Türü Sınıflandırması

2D animasyon seçimi buna bağlıdır (Bölüm 7.6). Her gol tam olarak **bir** tür alır:

```
penalty          → penaltı noktasından
directFreeKick   → direkt frikik golü
cornerHeader     → korner + kafa
cornerScramble   → korner + karambol
header           → açık oyun + kafa
volley           → hava topundan ayak vuruşu
bicycle          → röveşata (flair >= 16 && rng < 0.04)
longRange        → mesafe > 25 m
soloRun          → gol öncesi 2+ başarılı dripling
counterAttack    → top kazanımından 12 saniye içinde
chip             → keeper.rushingOut yüksek + composure >= 15
curler           → technique >= 16 && açı dar
tapIn            → mesafe < 6 m && xG > 0.55
rebound          → sekmeden
deflection       → savunmadan sekerek
ownGoal          → kendi kalesine
openPlayFinish   → yukarıdakilerin hiçbiri değilse (varsayılan)
```

## 5.13 Denge Doğrulama Hedefleri

`pnpm sim:balance` 10.000 maç simüle eder ve **tümü** tutmalıdır:

| Metrik | Hedef aralık |
|---|---|
| Maç başı toplam gol | 2.50 – 2.90 |
| Ev sahibi galibiyet | %43 – %48 |
| Beraberlik | %23 – %28 |
| Maç başı şut | 22 – 30 |
| Maç başı isabetli şut | 7.5 – 10.5 |
| Ortalama şut xG | 0.09 – 0.13 |
| Maç başı pas | 800 – 1000 |
| Pas isabeti | %78 – %86 |
| Maç başı korner | 9 – 12 |
| Korner→gol dönüşümü | %2.5 – %4.0 |
| Duran top golü oranı | %26 – %34 |
| Kafa golü oranı | %13 – %18 |
| Penaltı gol oranı | %74 – %80 |
| Maç başı sarı kart | 3.4 – 4.6 |
| Maç başı kırmızı kart | 0.05 – 0.12 |
| Maç başı sakatlık | 0.15 – 0.35 |
| Top hakimiyeti std sapma | 8 – 14 |

**Simetri testi:** Aynı takım kendine karşı 1000 maç → galibiyet oranı %48–52.
**Güç testi:** CA farkı 30 olan takımlar 1000 maç → güçlü olan %62–72 kazanır.

---
