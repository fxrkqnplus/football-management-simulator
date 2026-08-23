<!-- Bu dosya ana spesifikasyondan üretilmiştir. Kaynak: docs/MASTER-SPEC.md -->

# 8. DİYALOG SİSTEMİ

## 8.1 Mimari

```ts
interface DialogueSituation {
  code: string                      // 'playtime_complaint'
  category: DialogueCategory
  trigger: TriggerCondition
  availableTones: Tone[]
  contextVars: string[]             // metinde doldurulacak değişkenler
}

type Tone = 'calm' | 'passionate' | 'harsh' | 'understanding' | 'sarcastic' | 'dismissive'

type Outcome = 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative'
```

## 8.2 Sonuç Hesabı

```ts
baseScore = toneAffinity[situation][tone]              // −40 ... +40

personalityModifier = personalityToneMatrix[personality][tone]   // −30 ... +30

managerModifier = (playerManagement − 10) × 1.8
                + (motivation − 10) × 1.2
                + relationshipScore × 0.25             // −100 ... +100

stateModifier = (morale − 50) × 0.30
              + (form − 6.5) × 4.0
              + (recentResult === 'win' ? 8 : recentResult === 'loss' ? −8 : 0)

hiddenModifier = (temperament − 10) × 1.5              // düşük mizaç = ters tepki riski
               + (professionalism − 10) × 1.0

randomness = rng.normal(0, 12)                          // deterministik ama belirsiz

total = baseScore + personalityModifier + managerModifier
      + stateModifier + hiddenModifier + randomness

total >= 45  → very_positive     total >= 15  → positive
total >= −15 → neutral           total >= −45 → negative
else         → very_negative
```

**Etkiler:**
```
very_positive: morale +12, relationship +15, determination geçici +2 (5 maç)
positive:      morale +6,  relationship +7
neutral:       morale ±0,  relationship +1
negative:      morale −8,  relationship −10
very_negative: morale −16, relationship −20, transferInterest +12,
               soyunma odası morali −3 (lider oyuncuysa −7)
```

**Risk göstergesi:** Kullanıcı ton seçmeden önce ipucu görür — sonuç değil, **eğilim**:
```
if (personalityToneMatrix[personality][tone] <= −20)
  → "⚠ Bu oyuncu {kişilik} kişilikte. Bu yaklaşım ters tepebilir."
if (temperament <= 8)
  → "⚠ Dengesiz bir karakter. Tepkisi öngörülemez."
if (relationshipScore >= 60)
  → "✓ Seninle arası çok iyi, sert konuşmayı kaldırabilir."
```

## 8.3 80 Diyalog Durumu

**A. Maç ve Performans (12)**
`match_praise_excellent`, `match_praise_good`, `match_criticism_poor`, `match_criticism_terrible`, `match_demand_more`, `motm_congratulation`, `hat_trick_praise`, `costly_error_talk`, `red_card_discipline`, `penalty_miss_support`, `big_game_preparation`, `derby_motivation`

**B. Form ve Durum (8)**
`form_excellent_praise`, `form_poor_concern`, `form_poor_criticism`, `confidence_boost`, `slump_intervention`, `fitness_concern`, `sharpness_talk`, `consistency_demand`

**C. Oyun Süresi ve Rol (10)**
`playtime_complaint`, `playtime_promise`, `playtime_refuse`, `role_dissatisfaction`, `position_change_request`, `position_change_explain`, `benched_explanation`, `rotation_explanation`, `squad_role_upgrade_request`, `guarantee_breach_complaint`

**D. Sözleşme ve Maaş (9)**
`contract_renewal_request`, `contract_renewal_offer`, `wage_dissatisfaction`, `wage_comparison_complaint`, `bonus_negotiation`, `release_clause_talk`, `contract_expiry_warning`, `loyalty_appeal`, `contract_rejection_reaction`

**E. Transfer (11)**
`transfer_request`, `transfer_request_refuse`, `transfer_request_accept`, `bid_received_inform`, `bid_rejected_inform`, `interest_from_bigger_club`, `convince_to_stay`, `agree_to_sell`, `loan_proposal`, `loan_refusal`, `farewell_talk`

**F. Uyum ve Kişisel (10)**
`new_signing_welcome`, `adaptation_check`, `homesickness_talk`, `language_barrier_support`, `family_issue_support`, `personal_problem_offer_help`, `culture_shock_talk`, `first_goal_congratulation`, `birthday_message`, `long_service_recognition`

**G. Takım İçi (8)**
`teammate_conflict_mediate`, `dressing_room_unrest`, `clique_intervention`, `captaincy_offer`, `captaincy_removal`, `leadership_request`, `senior_player_advice_request`, `mentor_assignment_talk`

**H. Sakatlık ve Sağlık (6)**
`injury_sympathy`, `recovery_encouragement`, `return_plan_discussion`, `risk_playing_consult`, `chronic_injury_concern`, `career_threatening_talk`

**I. Disiplin (6)**
`training_attitude_warning`, `late_arrival_discipline`, `media_comment_reprimand`, `fine_notification`, `suspension_from_squad`, `final_warning`

**J. Kariyer ve Gelecek (10)**
`career_goal_discussion`, `international_call_congratulation`, `international_snub_support`, `ageing_concern_talk`, `retirement_discussion`, `coaching_future_talk`, `youth_promotion_talk`, `award_congratulation`, `record_broken_praise`, `season_review_talk`

## 8.4 Ton Uyum Matrisi (örnek)

`toneAffinity['playtime_complaint']`:
```
calm:          +18    (sakin açıklama genelde işe yarar)
passionate:    +10
harsh:         −22    (şikâyet eden oyuncuya sertlik kötü)
understanding: +28    (en iyi)
sarcastic:     −32
dismissive:    −38
```

`personalityToneMatrix['professional']`:
```
calm +18 | passionate +8 | harsh −4 | understanding +14 | sarcastic −18 | dismissive −26
```

`personalityToneMatrix['temperamental']`:
```
calm +12 | passionate −8 | harsh −34 | understanding +26 | sarcastic −40 | dismissive −38
```

`personalityToneMatrix['big_game_player']`:
```
calm +6 | passionate +26 | harsh +12 | understanding +2 | sarcastic −10 | dismissive −20
```

Tam matris: 25 kişilik × 6 ton = 150 hücre → `packages/engine/src/ai/dialogue/personality-tone-matrix.ts`

## 8.5 Metin Üretimi

Her `(situation, tone, outcome)` üçlüsü için **en az 4 varyant** metin. Toplam: 80 × 6 × 5 × 4 ≈ 9.600 metin — bu kadar yazılmaz; bunun yerine **katmanlı şablon**:

```
Menajer repliği:  situation × tone → 6 varyant  (80 × 6 × 6 = 2.880)
Oyuncu cevabı:    outcome × personalityGroup → 5 varyant
                  (5 sonuç × 8 kişilik grubu × 5 = 200 taban, değişkenlerle çeşitlenir)
```

Kişilik grupları (25 kişilik → 8 gruba indirgenir): `professional`, `ambitious`, `volatile`, `loyal`, `mercenary`, `leader`, `fragile`, `casual`

**Tekrar önleme:** Son 10 kullanılan varyant `saveId` bazlı hatırlanır, tekrar seçilmez.

**Türkçe ek motoru zorunlu:**
```ts
suffix(name: string, type: 'gen'|'acc'|'dat'|'loc'|'abl'|'ins'): string
// Galatasaray + gen → "Galatasaray'ın"    Beşiktaş + gen → "Beşiktaş'ın"
// Roma + dat → "Roma'ya"                  Liverpool + loc → "Liverpool'da"
// Kural: son sesli harf (ünlü uyumu) + son harf sessiz/sesli + kesme işareti (özel isim)
```

## 8.6 Soyunma Odası

```ts
teamMorale = Σ(playerMorale × influenceWeight) / Σ(influenceWeight)
influenceWeight = 1 + (leadership / 20) × 2 + (isCaptain ? 1.5 : 0)
                    + (squadRole === 'star' ? 1.0 : 0)

// Klik oluşumu
affinity(a, b) = nationalityMatch × 0.30 + languageMatch × 0.25
               + ageProximity × 0.20 + personalityMatch × 0.15
               + tenureOverlap × 0.10
// affinity > 0.62 → aynı klik. Klik morali ortak hareket eder.

// Huzursuzluk tetikleyicileri
unrest += wageDisparity           // en yüksek maaş / medyan > 3.0 ise
        + benchedStarCount × 4
        + losingStreak × 6
        + captainConflict × 12
        + transferRequestCount × 3
```

---
