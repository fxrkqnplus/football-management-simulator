<!-- Bu dosya ana spesifikasyondan üretilmiştir. Kaynak: docs/MASTER-SPEC.md -->

# 6. YAPAY ZEKA SKORLAMA TABLOLARI

Tüm AI kararları **kural tabanlı ağırlıklı skorlama**dır. LLM çağrısı yapılmaz. Her karar `debugTrace` üretir (K7).

## 6.1 Kadro Seçimi

```ts
playerScore =
    roleSuitability   × 0.32      // 0-1, rol uygunluk (6.2)
  + formNormalized    × 0.19      // form / 10
  + conditionFactor   × 0.16      // condition / 100, <75 ise kare alınır
  + moraleNormalized  × 0.09      // morale / 100
  + abilityNormalized × 0.16      // CA / 200
  + experienceFactor  × 0.05      // clamp(0,1, appearances / 150)
  + sharpnessFactor   × 0.03      // matchSharpness / 100

// Elemeler (skor hesaplanmadan önce):
if (suspended || injured || !registrationEligible) → ELENDİ
if (condition < 55 && !isEmergency)                → ELENDİ

// Rotasyon (yoğun fikstür):
if (daysSinceLastMatch < 4)  score × 0.72
if (matchesInLast14Days >= 4) score × 0.80
if (nextMatchImportance > currentMatchImportance) score × 0.85   // önemli maça saklama

// Sözleşme rolü garantisi:
squadRole 'star'            → score × 1.14
squadRole 'first_team'      → score × 1.08
squadRole 'youth'           → score × 0.88
```

Her diziliş slotu için en yüksek skorlu uygun oyuncu seçilir, Macar algoritması ile global optimum atama yapılır (açgözlü seçim yerel optimuma takılır).

## 6.2 Rol Uygunluk

```ts
roleSuitability = Σ(attribute_i × roleWeight_i) / Σ(roleWeight_i) / 20
                × positionLevelMultiplier

positionLevelMultiplier:
  natural       → 1.00
  accomplished  → 0.94
  competent     → 0.85
  awkward       → 0.68
  ineffectual   → 0.45
```

Yıldız gösterimi: `stars = clamp(0.5, 5, round(roleSuitability × 5 × 2) / 2)`

## 6.3 Taktik Seçimi

```ts
// Kadro profil analizi
squadProfile = {
  paceOnFlanks:   avg(kanat oyuncularının pace + acceleration)
  aerialThreat:   avg(forvet + stoper jumpingReach + heading)
  technicalDepth: avg(orta saha technique + passing + vision)
  defensiveSolidity: avg(savunma marking + tackling + positioning)
  pressingCapacity:  avg(tüm kadro workRate + stamina + aggression)
}

// Her diziliş için uygunluk
formationFit = Σ(squadProfile[k] × formationRequirement[k]) / Σ(formationRequirement)

// Menajer kişiliği
finalScore = formationFit × 0.62
           + philosophyMatch × 0.22          // menajerin felsefesine uyum
           + opponentCounter × 0.16          // rakip analizi (varsa)

// Mentalite seçimi
mentality = base(3)                          // dengeli
  + (ownReputation − oppReputation) / 50     // güçlüysek hücumcu
  + (isHome ? 0.4 : −0.4)
  + managerPhilosophyOffset                  // −1.0 ... +1.0
  + (needsGoals ? 1.0 : 0)                   // skor gerideyse
clamp(1, 5, round(mentality))
```

## 6.4 Transfer İhtiyaç Analizi

```ts
// Her mevki için
positionNeed =
    depthGap        × 0.30      // (idealDepth − currentDepth) / idealDepth
  + qualityGap      × 0.28      // (ligOrtalamaCA − mevkiOrtalamaCA) / 40
  + ageRisk         × 0.16      // 30+ yaş oyuncu oranı
  + contractRisk    × 0.14      // 12 aydan az sözleşmesi olanların oranı
  + injuryRisk      × 0.07      // sakatlık geçmişi yoğunluğu
  + starDependency  × 0.05      // tek yıldıza bağımlılık

idealDepth: GK 3 | DC 4 | DL/DR 2 | DM 2 | MC 3 | AML/AMR 2 | AMC 2 | ST 3

// Hedef oyuncu skorlaması
targetScore =
    qualityUplift   × 0.34      // (hedefCA − mevcutEnİyiCA) / 30
  + potentialValue  × 0.20      // (PA − CA) / 60 × (30 − age) / 14
  + affordability   × 0.20      // 1 − (fee / transferBudget)
  + wageAffordability × 0.12    // 1 − (wage / availableWageSpace)
  + positionNeed    × 0.10
  + adaptationEase  × 0.04      // aynı lig/ülke/dil bonusu

// Filtreler
if (fee > transferBudget × 1.05)          → ELENDİ
if (wage > maxWageStructure × 1.20)       → ELENDİ  // maaş yapısını bozar
if (!workPermitEligible)                  → ELENDİ
if (targetCA < currentBestCA − 8)         → ELENDİ  // gerileme transferi yapma
if (targetScore < 0.35)                   → ELENDİ
```

## 6.5 Teklif Değerlendirme (Satıcı Tarafı)

```ts
askingPrice = marketValue × reluctanceMultiplier

reluctanceMultiplier =
    1.0
  + squadRoleFactor           // star +0.55 | first_team +0.30 | rotation +0.08 | backup −0.12
  + contractLengthFactor      // >36ay +0.25 | 24-36 +0.12 | 12-23 0 | <12 −0.30
  + ageFactor                 // <=23 +0.20 | 24-28 0 | 29-31 −0.15 | 32+ −0.35
  − financialPressure         // 0 ... 0.45 (nakit sıkışıksa indirim)
  + rivalPremium              // aynı ligden rakip kulüpse +0.30, derbi rakibiyse +0.55
  − playerWantsAway           // transferInterest / 100 × 0.35
  + competitionPremium        // 2+ kulüp teklif verdiyse +0.15 her biri için

P(accept) = contest(offerValue, askingPrice, 3.0)
// Karşı teklif: askingPrice × (0.92 + rng × 0.10)
// 5 tur sonunda anlaşma yoksa müzakere kapanır
```

## 6.6 Oyuncu Kişisel Şart Talebi

```ts
demandedWage = leagueAverageWageForCA(CA)
  × ambitionFactor              // 0.90 + ambition / 20 × 0.35
  × reputationFactor            // 0.85 + clubReputation / 200 × 0.30
  × agentGreedFactor            // reasonable 1.0 | tough 1.12 | greedy 1.28
  × (1 − negotiatingSkill × 0.012)   // menajerin Pazarlık niteliği
  × loyaltyDiscount             // mevcut kulüpteyse: 1 − loyalty × 0.008

demandedRole = f(CA vs kadro ortalaması):
  CA > kadroOrt + 15  → 'star'
  CA > kadroOrt + 5   → 'first_team'
  CA > kadroOrt − 5   → 'important_rotation'
  CA > kadroOrt − 15  → 'rotation'
  else                → 'backup'

P(accept) = contest(offeredPackageValue, demandedPackageValue, 2.6)
  × (1 + ambition × 0.008 × clubReputationDelta)   // büyük kulübe gitmek için taviz
  × (1 + loyalty × 0.010 if mevcut kulüp)
```

## 6.7 Kulüp Mali Disiplin

```ts
// FFP kontrolü — AI kulüp ASLA aşmaz
maxWageBill      = annualRevenue × 0.70
maxTransferSpend = cashBalance × 0.55 + expectedTransferIncome × 0.80
threeYearLossCap = annualRevenue × 0.35

// Bütçe tahsisi (sezon başı)
transferBudget = (cashBalance × 0.40 + projectedProfit × 0.55)
               × ambitionMultiplier      // yönetim hırsı 0.75 - 1.25
               × (1 − ffpPressure)       // 0 ... 0.60

wageBudget = min(currentWageBill × 1.12, maxWageBill)
```

## 6.8 Antrenman Ataması

```ts
// Bireysel odak seçimi: en yüksek "gelişim getirisi" olan nitelik grubu
groupReturn = Σ over nitelikler in grup:
    roleWeight_i                        // bu oyuncunun rolü için önemi
  × (20 − currentValue_i) / 20          // gelişim alanı
  × ageGrowthFactor
  × coachQualityForGroup / 20

// En yüksek getirili grup seçilir
// Genç oyuncularda (< 21) rol antrenmanı %35 olasılıkla tercih edilir
```

## 6.9 Yönetim Güveni

```ts
boardConfidence =
    leaguePositionScore   × 0.38      // beklenti vs gerçek sıra
  + cupPerformanceScore   × 0.16
  + financialScore        × 0.18
  + squadHarmonyScore     × 0.13
  + youthDevelopmentScore × 0.08
  + playingStyleScore     × 0.07

leaguePositionScore = clamp(0, 100, 50 + (expectedPosition − actualPosition) × 7)

// Aşamalar
>= 80 → delighted    | 60-79 → satisfied  | 40-59 → uncertain
20-39 → concerned    | < 20  → warned

// Kovulma
if (stage === 'warned' && consecutiveTurnsInWarned >= 21) → SACK
if (boardConfidence < 8)                                   → SACK (anında)
// Zorluk etkisi: easy ×1.35 sabır | normal ×1.0 | hard ×0.78 | legendary ×0.60
```

## 6.10 Menajer İşe Alma (AI Kulüp)

```ts
candidateScore =
    reputationMatch     × 0.34      // 1 − |menajerİtibar − kulüpİtibar| / 100
  + badgeScore          × 0.16      // none 0 | c 0.25 | b 0.50 | a 0.75 | pro 1.0
  + experienceScore     × 0.16
  + philosophyMatch     × 0.14      // kulüp tercihiyle uyum
  + availability        × 0.10      // işsizse 1.0, sözleşmeliyse 0.4
  + affordability       × 0.10

// Kullanıcının başvurusu da bu havuzda değerlendirilir
P(accept) = contest(candidateScore, bestRivalCandidateScore, 2.0)
           × urgencyBonus            // kulüp acilse 1.0 - 1.4
// Cevap 1-14 tur içinde gelir: responseTurns = 2 + round(rng × 12 × (1 − urgency))
```

## 6.11 Gelişim Motoru

```ts
// Aylık çalışır
ageFactor:
  15-17 → 1.55   18-19 → 1.42   20-21 → 1.24   22-23 → 1.05
  24-25 → 0.78   26-27 → 0.50   28-29 → 0.24   30-31 → 0.02
  32-33 → −0.28  34-35 → −0.52  36+   → −0.78

headroom = (PA − CA) / max(1, PA) 

monthlyDelta =
    BASE_RATE(1.15)
  × ageFactor
  × headroom
  × (trainingFacilityLevel / 12)         // 1-20 → 0.08-1.67
  × (relevantCoachQuality / 12)
  × playingTimeFactor                    // 0.55 + (minutesLast90Days / 1350) × 0.75
  × (0.80 + morale / 250)
  × (0.72 + professionalism / 45)
  × (0.78 + determination / 50)
  × (0.85 + ambition / 60)
  × injuryFactor                         // sakatken 0.25, dönüşten sonra 3 ay 0.80
  × matchQualityFactor                   // ligin prestiji / 150, 0.7-1.3
  × mentorFactor                         // 1.0 - 1.18
  × trainingIntensityFactor              // düşük 0.80 | orta 1.0 | yüksek 1.15

// CA'ya uygula, sonra nitelik dağılımı:
// Delta pozitifse → bireysel antrenman odağındaki niteliklere %55, rol ağırlığına göre %45
// Delta negatifse → önce fiziksel (pace, acceleration, stamina, agility, jumpingReach),
//                   sonra teknik, zihinsel EN SON (deneyimle korunur, hatta artabilir)
```

**Gerileme kuralı:** 30 yaş üstünde `positioning`, `decisions`, `composure`, `leadership`, `anticipation` **artmaya devam edebilir** (yılda +0.3'e kadar), fiziksel nitelikler düşerken.

---
