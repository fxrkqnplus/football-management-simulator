<!-- Bu dosya ana spesifikasyondan üretilmiştir. Kaynak: docs/MASTER-SPEC.md -->

# 3. VERİTABANI ŞEMASI

Drizzle ORM. Tüm tablolar `snake_case`. Her tablo `created_at` ve `updated_at` taşır (aksi belirtilmedikçe).

## 3.0 Migration Disiplini — neden `down` yazmak `up` yazmaktan zor

> **Bu bölüm Faz 3.0'da eklendi.** `PROJECT_MEMORY.md` Faz 2 kaydı *"migration
> `down` yazmak `up` yazmaktan zordur"* uyarısını taşıyordu ama **gerekçesiz**:
> önerme olarak veriliyor, açıklanmıyordu. Faz 3 açılışında bu bir hafıza boşluğu
> olarak tespit edildi ve gerekçe buraya yazıldı — bir sonraki oturum aynı boşluğu
> yeniden keşfetmesin.

**Asimetri bilgi kaybındadır.** `up` ileri yönde bilgi **ekler**: yeni tablo, yeni
sütun, yeni kısıt. Ekleme işlemi kendi kendini tanımlar — hedef durum şemada yazılıdır.
`down` ise bilgi **siler**, ve silinen bilgi kendiliğinden geri gelmez:

| `up` ne yaptı | `down`un geri alması gereken | Neden zor |
|---|---|---|
| `ADD COLUMN` | `DROP COLUMN` | Kolay görünür, ama sütundaki **veri** yok olur; `down` sonrası `up` aynı şemayı verir, aynı veriyi vermez |
| `ALTER COLUMN TYPE` (daraltma) | Eski tipe genişletme | Daraltma **kayıplı**: `text` → `varchar(8)` sonrası kesilen karakterler yok. Şema geri gelir, içerik gelmez |
| `DROP CONSTRAINT` | Kısıtı **birebir** yeniden kurma | Kısıtın tam tanımı (`CHECK` ifadesi, `ON DELETE` davranışı, ad) `up` betiğinde yazmıyorsa `down` onu **tahmin eder** |
| `DROP TABLE` | Tabloyu yeniden yaratma | Tablonun tanımı artık yalnızca *önceki* migration'da; `down` onu kopyalamak zorunda ve kopya ile asıl **ayrışabilir** |

Sonuç: `down` bir **türev** değil, ayrı bir eserdir; ve doğruluğu ancak
**çalıştırılarak** kanıtlanır. Bu yüzden kabul kriteri `up`/`down`'ı gerçek bir
Postgres örneğine karşı ister (`testcontainers`, G-03). Bir `down` betiği,
"mantıklı görünüyor" testini geçebilir ve yine de şemayı farklı bir yere bırakabilir.

**Doğrulama şekli — round-trip:** `up` → **veri yaz** → `down` → `up` → şema
başlangıçtakiyle **birebir** aynı mı? Veri yazma adımı bilerek ortada: boş bir
veritabanında `down` çalışıyormuş gibi görünen çok sayıda hata, dolu bir tabloda
`NOT NULL` veya `FOREIGN KEY` yüzünden patlar.

### `drizzle-kit` `down` migration ÜRETMEZ — ölçüldü (Faz 3.0)

`drizzle-kit@0.31.10` üzerinde ölçüldü, blogdan okunmadı:

- Komut listesinde `down` **yok**: `generate · migrate · introspect · push · studio ·
  up · check · drop · export`. (`up` = migration **dosya formatını** yükseltir,
  `drop` = journal'dan bir migration **siler** — ikisi de "geri al" değil.)
- `generate --help` bayrakları arasında `--down` **yok**.
- İki ayrı migration gerçekten üretildi; çıktı **yalnızca ileri yönlü**:

```
drizzle/0000_probe_initial.sql        -> CREATE TABLE "probe" (...)
drizzle/0001_probe_add_country.sql    -> ALTER TABLE "probe" ADD COLUMN "country" text NOT NULL;
drizzle/meta/0000_snapshot.json
drizzle/meta/0001_snapshot.json
drizzle/meta/_journal.json
```

**Ama `down` körlemesine yazılmıyor.** Her migration'ın yanında `meta/NNNN_snapshot.json`
duruyor: şemanın o adımdan **sonraki tam ve makine-okunur hâli** (`tables`, `enums`,
`schemas`, `sequences`, `views`, `policies` … ve `prevId` ile zincirlenmiş). Yani
N numaralı migration'ın `down`u = snapshot N'den snapshot N−1'e giden fark, ve
round-trip testinin beklediği durum **snapshot N−1'in kendisidir**. `down` elle
yazılır, ama karşılaştırılacağı bir **doğruluk kaynağı** vardır.

## 3.1 Master World — Salt Okunur

Bu tablolar tüm kayıtlar tarafından paylaşılır. **Asla kullanıcı işlemiyle değiştirilmez** (K4).

### Coğrafya ve Kurumlar

```ts
// countries — 6 ülke (v1)
countries: {
  id: serial PK
  code: char(3) UNIQUE          // TUR, ENG, ESP, GER, ITA, FRA
  nameKey: text                  // i18n anahtarı
  confederation: text            // UEFA, CONMEBOL...
  flagAssetId: text
  footballLevel: integer         // 1-100, newgen kalitesini etkiler
  uefaCoefficient: numeric(8,3)
  currencyCode: char(3)          // TRY, GBP, EUR
  workPermitRuleKey: text        // 'gbe' | 'eu_quota' | 'tr_quota' | 'none'
}

// federations
federations: {
  id, countryId FK, name, presidentPersonId FK?, foundedYear, assetId
}

// competitions — lig, kupa, turnuva ORTAK tablosu
competitions: {
  id: serial PK
  countryId: FK nullable         // null = uluslararası (UCL, UEL)
  code: text UNIQUE              // 'TUR_SUPERLIG', 'UEFA_UCL'
  nameKey: text
  type: text                     // 'league'|'domestic_cup'|'league_cup'|'super_cup'|'continental'
  tier: integer                  // lig kademesi (1 = en üst)
  reputation: integer            // 0-200
  logoAssetId: text
  rules: jsonb                   // CompetitionRules — aşağıda
  seasonStartMonth: smallint
  seasonEndMonth: smallint
}
```

`CompetitionRules` (jsonb, Zod ile doğrulanır):
```ts
{
  teamCount: number
  format: 'round_robin_double' | 'round_robin_single' | 'knockout' | 'group_knockout' | 'swiss'
  pointsWin: number              // 3
  pointsDraw: number             // 1
  relegationCount: number
  promotionCount: number
  playoffSpots: number           // Türkiye: 4 (2-5. sıra)
  continentalSpots: { ucl: number, uel: number, uecl: number }
  tiebreakers: ('points'|'goal_diff'|'goals_for'|'head_to_head'|'wins')[]
  squadRegistration: {
    maxSquadSize: number | null
    maxForeign: number | null        // TR: 14
    homegrownMin: number | null      // ENG: 8
    u21Exempt: boolean
  }
  varEnabled: boolean
  substitutionsAllowed: number       // 5
  substitutionWindows: number        // 3
  extraTimeSubstitution: boolean
  yellowCardSuspensionThresholds: number[]   // [5, 10, 15]
  transferWindows: { start: string, end: string }[]  // 'MM-DD'
}
```

```ts
// clubs
clubs: {
  id: serial PK
  competitionId: FK              // mevcut lig
  countryId: FK
  name: text
  shortName: text                // 8 karakter
  abbreviation: char(3)          // GAL, FEN, BJK
  foundedYear: integer
  city: text
  stadiumId: FK
  reputation: integer            // 0-200
  colorPrimary: char(7)          // #RRGGBB
  colorSecondary: char(7)
  colorTertiary: char(7) nullable
  crestAssetId: text nullable    // null → prosedürel üretilir
  crestSeed: integer             // prosedürel arma tohumu
  supporterCount: integer
  supporterExpectation: integer  // 0-100
  chairmanPersonId: FK nullable
  isNational: boolean            // milli takım mı
}

// club_facilities — 1-20 skala
club_facilities: {
  clubId PK FK
  trainingGround, youthAcademy, youthRecruitment, medicalCentre,
  dataAnalysis, stadiumQuality: smallint    // hepsi 1-20
}

// club_finances_base — başlangıç değerleri
club_finances_base: {
  clubId PK FK
  balance, transferBudget, wageBudget: bigint    // kuruş/cent cinsinden
  matchdayIncomeAnnual, tvIncomeAnnual,
  sponsorIncomeAnnual, merchandiseIncomeAnnual: bigint
  currencyCode: char(3)
}

// stadiums
stadiums: {
  id, name, city, capacity, seatedCapacity,
  pitchQuality: smallint,        // 1-20
  builtYear, assetId nullable
}

// rivalries
rivalries: { id, clubAId FK, clubBId FK, intensity: smallint /* 1-10 */, nameKey nullable }

// kit_templates — 20 SVG şablonu
kit_templates: { id, code, nameKey, svgPath, colorSlots: smallint /* 2 veya 3 */ }

// club_kits
club_kits: {
  id, clubId FK, kitType: 'home'|'away'|'third',
  templateId FK, color1, color2, color3
}

// referees
referees: {
  id, countryId FK, personId FK,
  strictness, foulTolerance, homeBias, consistency,
  advantagePlay, bigGameExperience: smallint   // 1-20
}
```

### İnsanlar

```ts
// people — oyuncu, personel, menajer, başkan ORTAK kimlik tablosu
people: {
  id: serial PK
  firstName: text
  lastName: text
  commonName: text nullable      // "Vinicius Jr"
  birthDate: date
  nationalityCountryId: FK
  secondNationalityCountryId: FK nullable
  birthCity: text nullable
  portraitAssetId: text nullable
  portraitSeed: integer          // prosedürel portre tohumu
  gender: 'male'|'female'
  personType: ('player'|'staff'|'manager'|'chairman')[]
}

// players
players: {
  id: serial PK
  personId: FK UNIQUE
  clubId: FK nullable            // null = serbest oyuncu
  squadNumber: smallint nullable
  primaryPosition: text          // 'GK','DC','DL','DR','DM','MC','ML','MR','AMC','AML','AMR','ST'
  heightCm, weightKg: smallint
  preferredFootRight, preferredFootLeft: smallint  // 1-20 ayrı ayrı
  currentAbility: smallint       // 1-200 GİZLİ
  potentialAbility: smallint     // 1-200 GİZLİ
  paRangeMin, paRangeMax: smallint   // belirsizlik bandı
  isNewgen: boolean
  retiredAt: date nullable
}

// player_attributes — 47 sütun, TEK SATIR (jsonb DEĞİL: filtre performansı kritik)
player_attributes: {
  playerId PK FK
  // Teknik (14)
  corners, crossing, dribbling, finishing, firstTouch, freeKickTaking,
  heading, longShots, longThrows, marking, passing, penaltyTaking,
  tackling, technique: smallint
  // Zihinsel (14)
  aggression, anticipation, bravery, composure, concentration, decisions,
  determination, flair, leadership, offTheBall, positioning, teamwork,
  vision, workRate: smallint
  // Fiziksel (8)
  acceleration, agility, balance, jumpingReach, naturalFitness,
  pace, stamina, strength: smallint
  // Kaleci (11)
  aerialReach, commandOfArea, communication, eccentricity, handling,
  kicking, oneOnOnes, reflexes, rushingOut, tendencyToPunch, throwing: smallint
}
// CHECK: her sütun 1-20 arasında
// INDEX: (primaryPosition, currentAbility), (finishing), (passing), (pace) — transfer araması için

// player_hidden_attributes — 10 gizli nitelik
player_hidden_attributes: {
  playerId PK FK
  consistency, importantMatches, injuryProneness, dirtiness, pressure,
  professionalism, ambition, loyalty, adaptability, temperament: smallint  // 1-20
}

// player_positions — mevki yetkinlik matrisi
player_positions: {
  playerId FK, position: text,
  level: 'natural'|'accomplished'|'competent'|'awkward'|'ineffectual'
  PK (playerId, position)
}

// player_traits — özel yetenekler (PPM)
player_traits: { playerId FK, traitCode: text, PK (playerId, traitCode) }

// player_stats_history — gerçek dünya istatistikleri (nitelik türetimi girdisi)
player_stats_history: {
  id, playerId FK, seasonYear, competitionId FK,
  appearances, minutes, goals, assists, xG, xA,
  passesAttempted, passesCompleted, progressivePasses,
  dribblesAttempted, dribblesCompleted, duelsWon, duelsTotal,
  aerialsWon, aerialsTotal, tackles, interceptions, blocks,
  foulsCommitted, yellowCards, redCards,
  saves, goalsConceded, xGA, cleanSheets, penaltiesSaved
}
```

### Personel ve Menajerler

```ts
staff: {
  id, personId FK, clubId FK nullable,
  role: 'assistant_manager'|'attacking_coach'|'defending_coach'|'fitness_coach'|
        'gk_coach'|'technical_coach'|'physio'|'sports_scientist'|'scout'|
        'data_analyst'|'youth_manager'|'youth_coach'
}

staff_attributes: {
  staffId PK FK
  attacking, defending, fitness, goalkeeping, technical, tactical,
  motivating, discipline, judgingAbility, judgingPotential,
  physiotherapy, sportsScience, scoutingNetwork, adaptability,
  workingWithYoungsters, negotiating: smallint   // 1-20
}

managers: {
  id, personId FK, userId FK nullable,     // userId null = AI menajer
  clubId FK nullable, isUserManager: boolean,
  coachingBadge: 'none'|'c'|'b'|'a'|'pro',
  experienceLevel: 'amateur'|'former_player_lower'|'former_player_mid'|
                   'former_player_top'|'professional',
  philosophy: text,                         // 'attacking'|'control'|'balanced'|...
  reputation: smallint,                     // 0-200
  experiencePoints: integer,
  spokenLanguages: text[]
}

manager_attributes: {
  managerId PK FK
  tacticalKnowledge, motivation, playerManagement, youthDevelopment,
  negotiating, mediaHandling, trainingManagement, judgingAbility: smallint  // 1-20
}
```

## 3.2 Save Katmanı — Kullanıcıya Özel

```ts
users: {
  id: uuid PK
  email: citext UNIQUE
  emailVerifiedAt: timestamptz nullable
  passwordHash: text                       // argon2id
  username: citext UNIQUE
  role: 'user'|'moderator'|'admin'
  status: 'active'|'suspended'|'pending_deletion'
  deletionRequestedAt: timestamptz nullable
  lastLoginAt: timestamptz nullable
  registrationIp: inet
}

user_login_history: { id, userId FK, ip: inet, userAgent, countryCode, loginAt }

saves: {
  id: uuid PK
  userId FK
  name: text
  managerId FK                             // people/managers kaydı
  currentDate: date
  turnNumber: integer
  simulationPolicy: 'balanced'|'full'   // SimulationPolicy — kayıt başına.
                                        // EngineTier (full|medium|statistical)
                                        // ile karıştırma: bkz. spec/03 §5.2
  difficulty: 'easy'|'normal'|'hard'|'legendary'
  allowReplay: boolean                     // true → leaderboardEligible false
  leaderboardEligible: boolean
  anomalyFlagged: boolean
  status: 'active'|'archived'|'soft_deleted'
  sizeBytes: bigint
  lastPlayedAt: timestamptz
  archivedAt, deletedAt: timestamptz nullable
}
// CHECK: kullanıcı başına status='active' olan en fazla 3 kayıt (trigger ile)

// save_deltas — TÜM oyun içi değişiklikler burada (K4)
save_deltas: {
  id: bigserial PK
  saveId FK
  entityType: text                         // 'player'|'club'|'contract'|'competition'...
  entityId: integer
  field: text
  value: jsonb
  turnNumber: integer
  createdAt: timestamptz
}
// INDEX: (saveId, entityType, entityId), (saveId, turnNumber)

// save_snapshots — delta 50.000'i aşınca sıkıştırma
save_snapshots: {
  id, saveId FK, turnNumber, kind: 'auto'|'manual'|'season_start',
  payload: bytea,                          // gzip'lenmiş JSON
  sizeBytes: bigint, createdAt
}
```

### Oyun İçi Dinamik Tablolar

Bunlar save bazlıdır (`saveId` taşır) ve delta yerine doğrudan tabloda tutulur — çünkü sorgulanabilir olmaları gerekir:

```ts
contracts: {
  id, saveId FK, playerId FK, clubId FK,
  startDate, endDate: date,
  weeklyWage: bigint, signingBonus: bigint, loyaltyBonus: bigint,
  releaseClause: bigint nullable,
  squadRole: 'star'|'first_team'|'important_rotation'|'rotation'|'backup'|'youth',
  minimumFeeClause: bigint nullable,
  status: 'active'|'expired'|'terminated'|'loan'
}

contract_clauses: {
  id, contractId FK,
  type: 'appearance_fee'|'goal_bonus'|'assist_bonus'|'clean_sheet_bonus'|
        'team_success_bonus'|'international_bonus'|'promotion_bonus',
  amount: bigint, threshold: integer nullable, currency: char(3)
}

transfers: {
  id, saveId FK, playerId FK, fromClubId FK, toClubId FK,
  type: 'permanent'|'free'|'loan'|'loan_option'|'loan_obligation'|'swap'|'pre_contract',
  fee: bigint, agentFee: bigint,
  sellOnPercent: numeric(5,2) nullable,
  paymentSchedule: jsonb,                  // taksitler
  loanTerms: jsonb nullable,               // süre, maaş payı, oynama garantisi
  transferDate: date, turnNumber
}

transfer_negotiations: {
  id, saveId FK, playerId FK, bidderClubId FK, ownerClubId FK,
  round: smallint, status: 'open'|'accepted'|'rejected'|'countered'|'expired',
  currentOffer: jsonb, counterOffer: jsonb nullable,
  rejectionReasonKey: text nullable, expiresOnTurn: integer
}

matches: {
  id, saveId FK, competitionId FK, seasonYear,
  homeClubId FK, awayClubId FK, refereeId FK,
  scheduledDate: date, matchday: integer,
  homeGoals, awayGoals: smallint nullable,
  status: 'scheduled'|'played'|'postponed',
  weather: text, pitchCondition: text, attendance: integer,
  rngSeed: bigint,                         // yeniden oynatma için
  eventStream: jsonb nullable,             // MatchEvent[]
  statsHome: jsonb, statsAway: jsonb
}

player_match_stats: {
  id, matchId FK, playerId FK, clubId FK,
  minutesPlayed, goals, assists, shots, shotsOnTarget, xG, xA,
  passes, passesCompleted, tackles, interceptions, duelsWon,
  yellowCard: boolean, redCard: boolean, rating: numeric(3,1),
  positionPlayed: text, heatmap: jsonb
}

injuries: {
  id, saveId FK, playerId FK, injuryTypeCode: text,
  startDate, estimatedReturnDate, actualReturnDate: date nullable,
  severity: 'minor'|'moderate'|'serious'|'career_threatening',
  occurredInMatchId FK nullable, occurredInTraining: boolean,
  recurrenceOf: FK nullable
}

suspensions: {
  id, saveId FK, playerId FK, competitionId FK,
  reason: 'yellow_accumulation'|'red_card'|'serious_foul'|'violent_conduct',
  matchesRemaining: smallint, startDate
}

card_counters: {
  saveId FK, playerId FK, competitionId FK, seasonYear,
  yellowCards, redCards: smallint,
  PK (saveId, playerId, competitionId, seasonYear)
}

player_state: {                            // sık değişen, sorgulanan alanlar
  saveId FK, playerId FK,
  morale: smallint,                        // 0-100
  condition: smallint,                     // 0-100
  matchSharpness: smallint,                // 0-100
  form: numeric(3,1),                      // son 5 maç ortalama reyting
  transferInterest: smallint,              // 0-100 ayrılma isteği
  marketValue: bigint,
  happinessReasons: jsonb,                 // {code, sentiment, weight}[]
  PK (saveId, playerId)
}

tactics: {
  id, saveId FK, clubId FK, slot: smallint,   // 1,2,3 (A/B/C)
  name: text, formationCode: text,
  mentality: smallint,                     // 1-5
  instructions: jsonb,                     // TeamInstructions
  playerRoles: jsonb,                      // {slotIndex, playerId, role, duty}[]
  setPieceTakers: jsonb,
  fluidity: smallint                       // 0-100 taktik akıcılığı
}

board_confidence: {
  saveId FK, clubId FK, managerId FK,
  overall: smallint,                       // 0-100
  leaguePosition, cupPerformance, financial,
  squadHarmony, youthDevelopment: smallint,
  stage: 'delighted'|'satisfied'|'uncertain'|'concerned'|'warned',
  expectations: jsonb
}
```

## 3.3 Sistem Tabloları

```ts
server_config: {                           // TEK SATIR
  id: smallint PK DEFAULT 1 CHECK (id = 1)
  mode: 'public'|'private'|'maintenance'
  maintenanceMessage: text
  privateMessage: text
  estimatedReturn: timestamptz nullable
  updatedByUserId FK, updatedAt
}

admin_ips: { id, cidr: cidr, label: text, addedByUserId FK, createdAt }
user_access_grants: { id, userId FK, grantedByUserId FK, expiresAt nullable, createdAt }

audit_log: {
  id: bigserial PK
  userId FK nullable, saveId FK nullable
  action: text                             // 'transfer.bid', 'turn.advance', 'admin.mode_change'
  entityType, entityId: text nullable
  payload: jsonb
  ip: inet, correlationId: text, turnId: text nullable
  createdAt: timestamptz
}
// INDEX: (userId, createdAt DESC), (action, createdAt DESC), (correlationId)

turn_locks: {
  saveId PK FK, turnToken: uuid, acquiredAt, expiresAt,
  progress: jsonb                          // tamamlanan adımlar (idempotency)
}

anomaly_flags: {
  id, saveId FK, ruleCode: text, details: jsonb,
  status: 'open'|'reviewed'|'cleared', reviewedByUserId FK nullable, createdAt
}

reports: {
  id, reporterUserId FK, targetType: text, targetId: text,
  reasonCode: text, note: text, status: 'open'|'actioned'|'dismissed'
}

rate_limit_violations: { id, key: text, endpoint: text, count: integer, windowStart }
```

## 3.4 WorldView / WorldMutation

```ts
// packages/db/src/world/world-view.ts
class WorldView {
  constructor(saveId: string, deltas: DeltaMap, master: MasterCache) {}
  getPlayer(id: number): Readonly<Player>          // master + delta birleşik
  getClub(id: number): Readonly<Club>
  getCompetition(id: number): Readonly<Competition>
  // Tüm dönüşler DeepReadonly — mutasyon derlenmiyor
}

// packages/db/src/world/world-mutation.ts
class WorldMutation {
  set<T extends EntityType>(type: T, id: number, field: FieldOf<T>, value: ValueOf<T>): void
  commit(turnNumber: number): Promise<void>        // toplu delta yazma
}
```

**Tip zorlaması:** `WorldView` dönüşleri `DeepReadonly<T>`. Master tablosuna Drizzle `update`/`insert` çağrısı yapan kod, özel bir ESLint kuralı + `db.master` salt-okunur istemcisi ile engellenir.

---
