/**
 * `player_positions` — mevki yetkinlik matrisi. `docs/spec/01-database.md` §3.1.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * 1:1 AYRACI BURADA SORU BİLE DEĞİL — VE BU ÖLÇÜLEREK SÖYLENİYOR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * 4.3 ve 4.5 her yeni uydu tabloda bir ayraç koşturdu (*"tabloya GELEN yabancı
 * anahtar kaç tane"*) ve karar oradan çıktı: 0 ise PK = FK, aksi hâlde ayrı bir
 * `serial`. Burada o ayraca **hiç gelinmiyor**, çünkü tablo 1:1 değil:
 * `spec/01` PK'yi **`(playerId, position)`** yazıyor — bir oyuncunun birden çok
 * mevkisi var, yani **1:N**.
 *
 * ⚠️ **Bu, 4.5'in devir notundan KOPYALANMADI, `spec/01`'den okundu.** Devir
 * notu aynı şeyi söylüyordu ama o **kendi sesimiz** (desen D7) — ve 4.5 tam bu
 * yüzden `players.ts`in bıraktığı tahmini kopyalamadı. Bir ayraç, uygulanmadığı
 * yerde bile **kaynaktan** doğrulanır.
 *
 * ⚠️ Bileşik PK'nin ikinci bir sonucu var ve ayrı yazılmalı: bir oyuncunun aynı
 * mevkide **iki** yetkinlik satırı olamaz. Bu, `player_attributes`ta PK = FK'nin
 * verdiği tekliğin buradaki karşılığı — *"hangisi geçerli?"* sorusu şemada
 * cevapsız kalmıyor. Ayrı bir `serial id` konsaydı o soru açılırdı.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * İKİ CHECK — VE İKİSİ DE §3.1.2 ②'NİN AYRACINDAN GEÇTİ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Ayraç *"bu değeri yarın bir denge ayarı değiştirebilir mi?"* — cevap **hayır,
 * ancak sistem yeniden tasarlanırsa** ise CHECK var.
 *
 * | Sütun | Küme | Karar |
 * |---|---|---|
 * | `position` | `PLAYER_POSITIONS` — on iki mevki kodu | **CHECK** |
 * | `level` | `POSITION_LEVELS` — beş yetkinlik derecesi | **CHECK** |
 *
 * İkisi de bir **sözleşme**: yeni bir mevki ancak taktik sistemi yeniden
 * tasarlanırsa gelir, altıncı bir yetkinlik derecesi ancak arayüz ve AI
 * skorlaması birlikte değişirse. Karşılaştır: aynı fazın nitelik sütunları
 * (1-20) CHECK **almadı**, çünkü onlar Faz 23/30'un kalibre edeceği ölçekler.
 *
 * ⚠️ **`position` KÜMESİ YENİDEN YAZILMADI — `players.ts`ten İTHAL EDİLDİ.**
 * İki kopya kaçınılmaz olarak ayrışır: `players.primary_position` on iki değeri
 * kabul ederken `player_positions.position` on üç değeri kabul etseydi, bir
 * oyuncunun birincil mevkisi yetkinlik matrisinde **bulunmayan** bir kod olurdu
 * ve hiçbir kısıt bunu görmezdi. §3.1.2 ①'in *"CHECK ifadesi bir sabit diziden
 * türetilir, elle yazılmaz"* kuralının tablolar arası biçimi.
 *
 * ℹ️ `spec/01` `position`u düz `text` yazıyor ve kapalı kümeyi **adıyla
 * saymıyor**; küme `players.primaryPosition` satırında yaşıyor. İkisinin aynı
 * küme olduğu `spec/02` §4.2'den doğrulandı — mevki ağırlık vektörleri
 * (`position-weights.ts`) tam olarak bu on iki kodu taşıyor ve *"mevki
 * yetkinlik matrisi"* onların üzerinde tanımlı.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `player_id` → CASCADE (kural KOŞTURULDU, hafızadan uygulanmadı)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `fk-policy.ts` derlenmiş hâliyle çalıştırıldı. Kaynak `player_positions`
 * (`key` yok + giden FK var → `satellite`), hedef `players` sözlük değil, sütun
 * PK parçası olduğu için `NOT NULL` → kural ④ → **CASCADE**. Oyuncu silinince
 * mevki matrisi de gider; kimliği sahibinin kimliğidir.
 *
 * ⚠️ Bu tablo §3.1.0'ın veri paketi sütunlarını (`key`/`source`/`external_ids`)
 * **taşımıyor** — §3.1.0'ın kendi listesi onu *"pakette kendi kaydı olarak
 * görünen"* varlıklar arasında saymıyor. Mevki yetkinliği bir varlık değil, bir
 * oyuncunun türetilmiş özelliği (üreteci Faz 10).
 */
import { sql } from 'drizzle-orm';
import { check, integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

import { masterTable } from '../client/master.js';
import type { PlayerPosition } from './players.js';
import { PLAYER_POSITIONS, players } from './players.js';
import { sqlLiterals } from './sql-literals.js';

/**
 * Yetkinlik dereceleri — `spec/01` §3.1 `player_positions.level` satırındaki
 * beş değer, **birebir o sırayla** (en iyiden en kötüye).
 *
 * Türkçe karşılıkları (Faz 5'in i18n anahtarları): Doğal · Yetkin · Kabul
 * Edilebilir · Zayıf · Yabancı. **Arayüz metni burada YAŞAMAZ** (K5) — bu liste
 * yalnızca kodun kapalı kümesi.
 */
export const POSITION_LEVELS = [
  'natural',
  'accomplished',
  'competent',
  'awkward',
  'ineffectual',
] as const;

export type PositionLevel = (typeof POSITION_LEVELS)[number];

export const playerPositions = masterTable(
  pgTable(
    'player_positions',
    {
      /** Bileşik PK'nin ilk yarısı **ve** FK. `ON DELETE CASCADE` — kural ④. */
      playerId: integer('player_id')
        .notNull()
        .references(() => players.id, { onDelete: 'cascade' }),
      /** On iki mevki kodundan biri — küme `players.ts`ten geliyor. */
      position: text('position').$type<PlayerPosition>().notNull(),
      /** Beş yetkinlik derecesinden biri. */
      level: text('level').$type<PositionLevel>().notNull(),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
      primaryKey({ columns: [table.playerId, table.position] }),
      check(
        'player_positions_position_check',
        sql`${table.position} IN (${sql.raw(sqlLiterals(PLAYER_POSITIONS))})`,
      ),
      check(
        'player_positions_level_check',
        sql`${table.level} IN (${sql.raw(sqlLiterals(POSITION_LEVELS))})`,
      ),
    ],
  ),
);
