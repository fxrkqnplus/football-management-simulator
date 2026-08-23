<!-- Bu dosya ana spesifikasyondan üretilmiştir. Kaynak: docs/MASTER-SPEC.md -->

# 4. NİTELİK SİSTEMİ VE TÜRETME

## 4.1 Nitelik Envanteri

**47 görünür nitelik** (1–20). Kaleci nitelikleri yalnızca kalecilerde anlamlıdır; saha oyuncularında 1–3 arası sabitlenir.

| Kategori | Nitelikler (kod adı) |
|---|---|
| **Teknik (14)** | corners, crossing, dribbling, finishing, firstTouch, freeKickTaking, heading, longShots, longThrows, marking, passing, penaltyTaking, tackling, technique |
| **Zihinsel (14)** | aggression, anticipation, bravery, composure, concentration, decisions, determination, flair, leadership, offTheBall, positioning, teamwork, vision, workRate |
| **Fiziksel (8)** | acceleration, agility, balance, jumpingReach, naturalFitness, pace, stamina, strength |
| **Kaleci (11)** | aerialReach, commandOfArea, communication, eccentricity, handling, kicking, oneOnOnes, reflexes, rushingOut, tendencyToPunch, throwing |

**10 gizli nitelik** (1–20, kullanıcıya asla sayı olarak gösterilmez):
`consistency`, `importantMatches`, `injuryProneness`, `dirtiness`, `pressure`, `professionalism`, `ambition`, `loyalty`, `adaptability`, `temperament`

> **Yol haritasından sapma notu:** Yol haritası 8 gizli nitelik diyordu. Spesifikasyon sırasında **`adaptability`** (Faz 34'teki yabancı lig uyum süreci için) ve **`temperament`** (Faz 44'teki diyalog tepkileri için) eklendi. Bu iki sistem onlar olmadan kurulamıyordu. Toplam 10.

## 4.2 Mevki Ağırlıkları ve CA Hesabı

Her mevkinin bir **ağırlık vektörü** vardır (`packages/engine/src/rules/position-weights.ts`). Ağırlıklar toplamı her mevki için 100'e normalize edilir.

Örnek — **ST (Santrfor)**:
```ts
{ finishing: 12, offTheBall: 10, composure: 8, firstTouch: 7, dribbling: 6,
  heading: 6, technique: 6, anticipation: 6, decisions: 5, pace: 6,
  acceleration: 6, strength: 5, balance: 3, jumpingReach: 4, workRate: 3,
  passing: 3, determination: 2, concentration: 2 }
```

Örnek — **DC (Stoper)**:
```ts
{ marking: 11, tackling: 11, positioning: 10, heading: 9, jumpingReach: 8,
  strength: 7, anticipation: 7, concentration: 7, decisions: 6, composure: 5,
  bravery: 5, pace: 4, acceleration: 3, passing: 3, aggression: 2,
  firstTouch: 1, teamwork: 1 }
```

Örnek — **GK (Kaleci)**:
```ts
{ reflexes: 14, handling: 12, oneOnOnes: 10, positioning: 10, aerialReach: 9,
  commandOfArea: 8, concentration: 8, decisions: 7, kicking: 6, communication: 6,
  rushingOut: 5, composure: 3, throwing: 2 }
```

**Mevcut Yetenek (CA) formülü:**

```
CA = round( Σ(attribute_i × weight_i) / Σ(weight_i) × 10 )
```

1–20 nitelikler × 10 → 1–200 CA. Maksimum nitelikli oyuncu CA 200 olur.

**Ters yön (newgen üretimi):** Hedef CA verildiğinde nitelikler dağıtılır:
```
targetAvg = CA / 10
Her nitelik: base = targetAvg × (weight_i / avgWeight)
Sonra ±%15 rastgele varyasyon (SeededRng), 1-20'ye kırpma
CA yeniden hesaplanıp hedeften ±3'ten fazla saparsa iteratif düzeltme (max 20 iterasyon)
```

## 4.3 Gerçek İstatistikten Nitelik Türetme

Bu, hiçbir yerde açık kaynak olmayan verinin üretilmesidir. Girdi: `player_stats_history` (FBref/Understat/API-Football). Her nitelik için bir **türetme fonksiyonu** tanımlıdır.

**Ortak yardımcılar:**
```ts
// Yüzdelik dilimi 1-20'ye eşle (mevki ve lig içinde normalize)
p2a(percentile: number): number => clamp(1, 20, Math.round(1 + percentile * 19))

// Lig kalitesi katsayısı
leagueFactor(competitionReputation): number => 0.75 + (reputation / 200) * 0.45
// ENG PL (185) → 1.166 | TUR SL (135) → 1.053
```

**Türetme tablosu (temsili — tam liste `position-weights.ts` yanında):**

| Nitelik | Kaynak | Formül özeti |
|---|---|---|
| `passing` | pas isabeti + hacim | `p2a(0.6×pct(passCompletionRate) + 0.4×pct(passesPer90)) × leagueFactor` |
| `vision` | ilerletici pas + asist | `p2a(0.5×pct(progressivePassesPer90) + 0.5×pct(xA_per90))` |
| `finishing` | gol/xG + isabet | `p2a(0.55×pct(goals/xG) + 0.45×pct(shotAccuracy))` |
| `longShots` | ceza sahası dışı şut oranı ve dönüşümü | `p2a(0.5×pct(outsideBoxShots) + 0.5×pct(outsideBoxConversion))` |
| `dribbling` | başarılı dripling | `p2a(0.7×pct(dribbleSuccessRate) + 0.3×pct(dribblesPer90))` |
| `crossing` | orta sayısı × isabet | `p2a(pct(crossCompletionRate))` |
| `heading` | hava topu kazanma | `p2a(0.7×pct(aerialWinRate) + 0.3×pct(headedGoals))` |
| `tackling` | müdahale başarısı − faul | `p2a(pct(tackleSuccessRate) − 0.25×pct(foulsPer90))` |
| `marking` | rakip xG bastırma + engelleme | `p2a(0.5×pct(interceptionsPer90) + 0.5×pct(blocksPer90))` |
| `anticipation` | top kesme + önleme | `p2a(pct(interceptionsPer90))` |
| `workRate` | koşu mesafesi yoksa: presleme + müdahale hacmi | `p2a(0.5×pct(pressuresPer90) + 0.5×pct(duelsPer90))` |
| `stamina` | maç başı dakika + geç dakika katkısı | `p2a(0.6×pct(minutesPerApp) + 0.4×pct(late_game_actions))` |
| `pace`/`acceleration` | hız verisi varsa doğrudan; yoksa yaş + mevki + dripling | `p2a(pct(topSpeed))` veya `ageCurve(age) × positionBase × pct(dribbleSuccess)` |
| `strength` | ikili mücadele + boy/kilo | `p2a(0.6×pct(duelWinRate) + 0.4×pct(bmi_adjusted))` |
| `composure` | baskı altında pas isabeti + penaltı | `p2a(0.6×pct(passAccuracyUnderPressure) + 0.4×pct(penaltyConversion))` |
| `reflexes` (GK) | kurtarış oranı + xGA farkı | `p2a(0.5×pct(saveRate) + 0.5×pct(xGA − goalsConceded))` |
| `handling` (GK) | tutma vs. sektirme | `p2a(pct(catchRate))` |
| `commandOfArea` (GK) | orta çıkışı | `p2a(pct(crossesClaimedRate))` |

**Doğrudan ölçülemeyenler** (`decisions`, `positioning`, `teamwork`, `concentration`, `leadership`, `bravery`, `flair`, `aggression`):
```
base = CA_estimate / 10                       // lig + dakika + değerden ön tahmin
value = clamp(1, 20, round(base + positionModifier + rng.normal(0, 1.5)))
```
`leadership` ayrıca kaptanlık geçmişi ve yaşla ayarlanır (+2 kaptansa, +1 her 4 yaş 26 üstü).

**CA ön tahmini (istatistik yetersizse):**
```
CA_estimate = 0.45×norm(marketValue) + 0.25×norm(leagueReputation)
            + 0.20×norm(minutesPlayed) + 0.10×norm(clubReputation)
```

## 4.4 Potansiyel Yetenek (PA)

```
growthSlope = (CA_thisSeason − CA_twoSeasonsAgo) / 2      // yoksa 0
youthBonus  = age <= 21 ? (22 − age) × 4 : 0
eliteBonus  = playedTopLeagueBefore23 ? 8 : 0
PA_raw = CA + growthSlope × yearsToPeak(age) + youthBonus + eliteBonus
PA = clamp(CA, 200, round(PA_raw))

yearsToPeak(age) = clamp(0, 10, 27 − age)
```

**Belirsizlik bandı:**
```
uncertainty = clamp(3, 40, 40 − age × 1.2 − minutesConfidence × 10)
paRangeMin = clamp(CA, 200, PA − uncertainty)
paRangeMax = clamp(CA, 200, PA + uncertainty)
```
16 yaşında hiç oynamamış oyuncu: bant ±20. 29 yaşında oturmuş oyuncu: bant ±3.

## 4.5 Gizli Nitelik Türetme

| Nitelik | Türetme |
|---|---|
| `consistency` | maç reytinglerinin standart sapmasının tersi → `p2a(1 − pct(ratingStdDev))` |
| `importantMatches` | derbi/kupa/Avrupa maçlarındaki reyting − genel reyting ortalaması |
| `injuryProneness` | son 3 sezondaki sakatlık günü sayısı → `p2a(pct(injuryDays))` |
| `dirtiness` | `p2a(0.6×pct(foulsPer90) + 0.4×pct(cardsPer90))` |
| `pressure` | penaltı dönüşümü + son 15 dakika performansı |
| `professionalism` | kart disiplini + kariyer istikrarı + gelişim eğimi |
| `ambition` | kulüp değiştirme yönü (yukarı transfer sayısı) + genç yaşta üst lig |
| `loyalty` | aynı kulüpteki ortalama yıl sayısı → `p2a(pct(avgTenure))` |
| `adaptability` | yabancı lig sayısı + oralarda ilk sezon performansı |
| `temperament` | kırmızı kart + disiplin olayları (ters) |

Veri yoksa: `clamp(1, 20, round(10 + rng.normal(0, 3.5)))`

## 4.6 Kişilik Türetme

Kişilik **saklanmaz, türetilir**. `derivePersonality(hidden): PersonalityCode`

Öncelik sıralı kural zinciri (ilk eşleşen kazanır):

```
professionalism>=18 && determination>=18 && ambition>=15 → 'model_citizen'
professionalism>=16 && determination>=16               → 'professional'
professionalism>=15 && loyalty>=15 && temperament>=13   → 'model_professional'
ambition>=18 && professionalism<=9                      → 'unambitious'... (ters)
ambition>=17 && determination>=15                       → 'driven'
ambition<=7  && professionalism<=8                      → 'casual'
temperament<=6 && dirtiness>=14                         → 'volatile'
temperament<=8                                          → 'temperamental'
pressure<=7  && consistency<=9                          → 'spineless'
pressure>=16 && importantMatches>=15                    → 'big_game_player'
loyalty>=17                                             → 'loyal'
loyalty<=6  && ambition>=14                             → 'mercenary'
leadership>=16 && teamwork>=15                          → 'born_leader'
leadership>=15 && ambition>=15 && teamwork<=9           → 'ivory_tower'
adaptability>=16                                        → 'adaptable'
adaptability<=6                                         → 'homesick'
consistency<=8                                          → 'inconsistent'
... (25 kişilik toplam)
varsayılan                                              → 'balanced'
```

Kişilik; diyalog tepkilerini (Bölüm 8), gelişim hızını, moral dayanıklılığını ve transfer kararlarını etkiler.

## 4.7 Piyasa Değeri

```
ageMultiplier:
  16-18 → 1.15   19-21 → 1.30   22-24 → 1.25   25-27 → 1.10
  28-29 → 0.85   30-31 → 0.60   32-33 → 0.38   34-35 → 0.20   36+ → 0.08

contractMultiplier (kalan ay):
  >36 → 1.10  |  24-36 → 1.00  |  12-23 → 0.80  |  6-11 → 0.50  |  <6 → 0.22

baseValue = (CA^3.2 / 5200) × 1_000_000          // EUR cent

value = baseValue
      × ageMultiplier(age)
      × contractMultiplier(monthsLeft)
      × (0.85 + potentialFactor × 0.45)           // potentialFactor = (PA−CA)/60, 0-1'e kırpılır
      × leagueFactor(competitionReputation)       // 0.75 - 1.20
      × (0.90 + form/20)                          // form 0-10
      × positionScarcity(position)                // GK 0.82, ST 1.12, DC 0.95, AMC 1.08...
      × (1 − injuryPenalty)                       // son 2 sezon sakatlık günü / 400, max 0.30
      × inflationIndex(seasonYear)                // yıllık %4-8

inflationIndex(year) = 1.06 ^ (year − startYear)
```

Doğrulama hedefi: 20 sezon sonunda en pahalı oyuncu **500 mn EUR altında** kalmalı.

---
