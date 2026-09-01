export { clubFacilities } from './club-facilities.js';
export { clubFinancesBase } from './club-finances-base.js';
export type { KitType } from './club-kits.js';
export { clubKits, KIT_TYPES } from './club-kits.js';
export { clubs } from './clubs.js';
export type { CompetitionFormat, CompetitionRules, Tiebreaker } from './competition-rules.js';
export { COMPETITION_FORMATS, competitionRulesSchema, TIEBREAKERS } from './competition-rules.js';
export type { CompetitionType } from './competitions.js';
export { COMPETITION_TYPES, competitions } from './competitions.js';
export type { WorkPermitRuleKey } from './countries.js';
export { countries, WORK_PERMIT_RULES } from './countries.js';
export type { DataSource, ExternalIds } from './data-pack-columns.js';
export { DATA_SOURCES, externalIdsSchema } from './data-pack-columns.js';
export { federations } from './federations.js';
export type { DeleteAction, ForeignKeyFacts, TableClass, TableClassFacts } from './fk-policy.js';
export { classifyTable, DELETE_ACTIONS, expectedDeleteAction, TABLE_CLASSES } from './fk-policy.js';
export type { KitColorSlots } from './kit-templates.js';
export { KIT_COLOR_SLOTS, kitTemplates } from './kit-templates.js';
export type { ManagerAttribute } from './manager-attributes.js';
export { MANAGER_ATTRIBUTES, managerAttributes } from './manager-attributes.js';
export type { CoachingBadge, ManagerExperienceLevel } from './managers.js';
export { COACHING_BADGES, MANAGER_EXPERIENCE_LEVELS, managers } from './managers.js';
export type { Gender, PersonType } from './people.js';
export { GENDERS, people, PERSON_TYPES } from './people.js';
export type { VisibleAttribute, VisibleAttributeCategory } from './player-attributes.js';
export { playerAttributes, VISIBLE_ATTRIBUTES } from './player-attributes.js';
export type { HiddenAttribute } from './player-hidden-attributes.js';
export { HIDDEN_ATTRIBUTES, playerHiddenAttributes } from './player-hidden-attributes.js';
export type { PositionLevel } from './player-positions.js';
export { playerPositions, POSITION_LEVELS } from './player-positions.js';
export { playerStatsHistory } from './player-stats-history.js';
export { playerTraits } from './player-traits.js';
export type { PlayerPosition } from './players.js';
export { PLAYER_POSITIONS, players } from './players.js';
export { referees } from './referees.js';
export { rivalries } from './rivalries.js';
export { stadiums } from './stadiums.js';
export type { StaffRole } from './staff.js';
export { staff, STAFF_ROLES } from './staff.js';
export type { StaffAttribute } from './staff-attributes.js';
export { STAFF_ATTRIBUTES, staffAttributes } from './staff-attributes.js';
/**
 * ⚠️ **4.9'DA AÇILDI — ve açılması bir KOPYALAMAYI ÖNLEDİ.** `transfer-search.ts`
 * 4.8'de yazıldığında yalnızca `packages/db` içinden okunuyordu (şema tanımları
 * ve entegrasyon testleri, göreli yolla). 4.9'un seed'i **başka bir pakette**
 * (`tools/data-cli`) ve doğum tarihlerini bu fonksiyonun **kendi tanımından**
 * üretiyor; barrel'da olmasaydı çevrim ikinci kez yazılmak zorunda kalırdı — ve
 * o dosyanın başlığı tam olarak bunu yasaklıyor: *"çevrimin kendisi bir ifadedir
 * ve iki yerde yazılırsa sessizce ayrışır."*
 *
 * `TRANSFER_SEARCH_INDEXES` **bilerek dışarıda**: tek tüketicisi `packages/db`
 * ve dışa açılan her ad bir sözleşmedir (K12).
 */
export type { BirthDateRange } from './transfer-search.js';
export { ageRangeToBirthDateRange } from './transfer-search.js';
