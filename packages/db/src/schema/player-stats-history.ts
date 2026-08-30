/**
 * `player_stats_history` — gerçek dünya istatistikleri. `docs/spec/01-database.md` §3.1.
 *
 * Nitelik türetiminin **girdisi**: `spec/02` §4.3 her niteliği bu tablonun
 * sütunlarından hesaplıyor (`passing` ← pas isabeti + hacim, `finishing` ←
 * gol/xG + isabet, `reflexes` ← kurtarış oranı + xGA farkı …). Yani bu tablo
 * boş kalırsa Faz 10 çalışamaz.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `serial id` — VE BU KEZ AYRAÇ DEĞİL, SPEC KARAR VERİYOR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/01` bu tabloya açıkça bir `id` veriyor (kardeş iki tabloya vermiyor).
 * Gerekçe şemadan okunabiliyor: doğal anahtar adayı
 * `(playerId, seasonYear, competitionId, clubId)` ve `clubId` **nullable** —
 * yani bir bileşik PK'nin taşıyamayacağı bir bileşen var.
 *
 * ⚠️ **DOĞAL ANAHTAR ÜZERİNE `UNIQUE` KONMADI — bilinçli, ve G-11'in dersi.**
 * `UNIQUE (player_id, season_year, competition_id, club_id)` yazılabilirdi ama
 * PostgreSQL `NULL`ları **birbirinden farklı** sayar: kulübü bilinmeyen iki
 * satır çakışmaz ve kısıt tam olarak korumak istediği yerde sessizce geçirir.
 * *"Kısmi koruma D3 yanılsaması üretir"* — 3.5'in `rivalries` kararının aynısı.
 * Bir oyuncunun aynı sezon aynı yarışmada iki kulüpte oynaması ayrıca **geçerli**
 * bir durum (devre arası transfer), yani tekliğin doğru biçimi bugün belirsiz.
 * Yeri **Faz 11** (`pnpm validate:world`), G-10/G-11/G-12 ile aynı sınıf.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `club_id` — SPEC'TE YOKTU, 4.1'DE EKLENDİ (SAPMA-030)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Eksikliği ölçülmüştü (0 eşleşme): onsuz *"Osimhen 2023-24'te HANGİ kulüpte 26
 * gol attı?"* cevaplanamıyor ve iki tüketici bunu istiyor — ROADMAP Faz 19
 * (kariyer bazlı istatistik) ve Faz 47 (kariyer geçmişi: her kulüp, süre).
 * `nullable`, çünkü Faz 9 öncesi seed verisinde kulüp yok ve SAPMA-026 gereği
 * kimsenin belirlemediği alana değer uydurulmaz.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ÜÇ FK, ÜÇ FARKLI SORU — KURAL KOŞTURULDU, HAFIZADAN UYGULANMADI
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `fk-policy.ts` derlenmiş hâliyle çalıştırıldı (4.4'ün dersi: *"bir kuralı
 * hafızadan uygulama — KOŞTUR"*), sonra üretilen migration SQL'inin `ON DELETE`
 * satırlarıyla karşılaştırıldı:
 *
 * | FK | Kaynak sınıfı | Hedef | Nullable | Adım | Sonuç |
 * |---|---|---|---|---|---|
 * | `player_id` | `satellite` | `players` | hayır | ④ | **CASCADE** |
 * | `competition_id` | `satellite` | `competitions` (`independent`) | hayır | ④ | **CASCADE** |
 * | `club_id` | `satellite` | `clubs` (`independent`) | **evet** | ③ | **SET NULL** |
 *
 * ⚠️ **`competition_id`in CASCADE alması sezgiye aykırı ve ayrıca yazılıyor.**
 * Refleks *"bağımsız bir varlığa bakan FK RESTRICT alır"* demek olurdu — ve bu,
 * 4.3'ün raporunun 4.4 için yaptığı **yanlış tahminin birebir aynısı**: kural ②
 * hedefin değil **kaynağın** sınıfına bakıyor. Hedefin sınıfı yalnızca ①'de
 * (sözlük mü) soruluyor. `competitions` bir sözlük değil, yani ① geçmiyor ve
 * karar kaynaktan geliyor.
 *
 * Anlam da aynı yeri gösteriyor: bir yarışma silinirse ona ait istatistik satırı
 * neyin istatistiği olduğunu kaybeder — `club_id`den farklı olarak burada
 * `NULL` **anlamlı bir durum değil**, bu yüzden sütun da nullable değil.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * TİP KARARLARI
 * ────────────────────────────────────────────────────────────────────────────
 *
 * **`seasonYear` `integer`** — §3.1.1: *"Sezon bir TABLO değil, bir `seasonYear`
 * SÜTUNUDUR"* ve bu tablo o kuralın adıyla saydığı üç yerden biri. Tip, şemanın
 * var olan yıl sütunlarıyla (`clubs.founded_year`, `stadiums.built_year`) aynı.
 *
 * **`xG` / `xA` / `xGA` `numeric(6,2)`** — şemadaki tek ondalık emsali
 * `countries.uefa_coefficient` (`numeric(8,3)`) ve aynı sınıf. `real`/`double`
 * seçilmedi: §3.1.2 ⑥'nın dersi *"sessizce yanlış sayı"*nın para tarafındaki
 * biçimiydi ve kayan nokta burada da toplama sırasına göre farklı sonuç verir —
 * Faz 19 kariyer toplamlarını **topluyor**. `numeric` Drizzle'da dize olarak
 * dönüyor, yani dönüşüm sınırda **açıkça** yapılmak zorunda; `bigint` kararının
 * (⑥) aynı gerekçesi. Ölçek 2: FBref/Understat iki ondalık veriyor.
 *
 * **Sayaçlar `integer`** — `smallint` bir sezon için yeterdi ama sınır dar
 * (32.767) ve bu sütunlar Faz 19'da **kariyer boyunca toplanacak**; toplamı
 * taşıyan sorgu aynı tipte kalsın diye baştan `integer`.
 *
 * ⚠️ **HEPSİ `NOT NULL` — kaleci sütunları dahil, ve gerekçe `player_attributes`
 * ile aynı.** Bir saha oyuncusunun `saves` değeri **0**'dır, *"bilinmiyor"*
 * değil; nasıl ki bir kalecinin `finishing`i de yazılıyor. Bu SAPMA-026'nın
 * **tersi** bir vaka: orada bilgi yoktu, burada bilgi var ve değeri sıfır.
 *
 * ℹ️ *"xG öncesi sezonlarda veri yok"* durumu bir şema boşluğu **değil**: ROADMAP
 * Faz 9 kapsamı istatistik ingestini adıyla sayıyor **ve** bir *"veri kalite
 * raporu: eksik alan yüzdeleri"* istiyor — yani eksik alan orada ele alınıyor.
 * Ölçüldü, varsayılmadı (G-18'in dersi: hedef fazın o işi yapabildiği
 * doğrulanır).
 *
 * ⚠️ §3.1.0'ın veri paketi sütunlarını **taşımıyor**: bir istatistik satırı
 * pakette kendi kaydı olan bir varlık değil, bir oyuncunun sezonu.
 */
import { integer, numeric, pgTable, serial, timestamp } from 'drizzle-orm/pg-core';

import { masterTable } from '../client/master.js';
import { clubs } from './clubs.js';
import { competitions } from './competitions.js';
import { players } from './players.js';

/** xG ailesinin ortak kesinliği — üç sütunda da aynı, tek yerde. */
const XG_PRECISION = { precision: 6, scale: 2 } as const;

export const playerStatsHistory = masterTable(
  pgTable('player_stats_history', {
    id: serial('id').primaryKey(),
    /** `ON DELETE CASCADE` — kural ④. */
    playerId: integer('player_id')
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    /** Sezonun başlangıç yılı (2024-25 → 2024). §3.1.1: sezon bir tablo değil. */
    seasonYear: integer('season_year').notNull(),
    /** `ON DELETE CASCADE` — kural ④; `NULL` burada anlamlı bir durum değil. */
    competitionId: integer('competition_id')
      .notNull()
      .references(() => competitions.id, { onDelete: 'cascade' }),
    /**
     * O sezon forma giyilen kulüp. `null` = bilinmiyor (Faz 9 öncesi seed).
     * `ON DELETE SET NULL` — kural ③, şemanın ikinci vakası (ilki
     * `players.club_id`).
     */
    clubId: integer('club_id').references(() => clubs.id, { onDelete: 'set null' }),

    // ── Katılım ───────────────────────────────────────────────────────────
    appearances: integer('appearances').notNull(),
    minutes: integer('minutes').notNull(),

    // ── Hücum ─────────────────────────────────────────────────────────────
    goals: integer('goals').notNull(),
    assists: integer('assists').notNull(),
    xg: numeric('xg', XG_PRECISION).notNull(),
    xa: numeric('xa', XG_PRECISION).notNull(),

    // ── Pas ───────────────────────────────────────────────────────────────
    passesAttempted: integer('passes_attempted').notNull(),
    passesCompleted: integer('passes_completed').notNull(),
    progressivePasses: integer('progressive_passes').notNull(),

    // ── Top taşıma ve ikili mücadele ──────────────────────────────────────
    dribblesAttempted: integer('dribbles_attempted').notNull(),
    dribblesCompleted: integer('dribbles_completed').notNull(),
    duelsWon: integer('duels_won').notNull(),
    duelsTotal: integer('duels_total').notNull(),
    aerialsWon: integer('aerials_won').notNull(),
    aerialsTotal: integer('aerials_total').notNull(),

    // ── Savunma ───────────────────────────────────────────────────────────
    tackles: integer('tackles').notNull(),
    interceptions: integer('interceptions').notNull(),
    blocks: integer('blocks').notNull(),

    // ── Disiplin ──────────────────────────────────────────────────────────
    foulsCommitted: integer('fouls_committed').notNull(),
    yellowCards: integer('yellow_cards').notNull(),
    redCards: integer('red_cards').notNull(),

    // ── Kalecilik (saha oyuncusunda 0 — "bilinmiyor" değil) ───────────────
    saves: integer('saves').notNull(),
    goalsConceded: integer('goals_conceded').notNull(),
    xga: numeric('xga', XG_PRECISION).notNull(),
    cleanSheets: integer('clean_sheets').notNull(),
    penaltiesSaved: integer('penalties_saved').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  }),
);
