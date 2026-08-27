/**
 * `referees` — maç hakemleri ve altı davranış niteliği.
 * `docs/spec/01-database.md` §3.1.
 *
 * **Tüketicisi somut, tablo bir temenni değil (D3):** `docs/ROADMAP.md` **Faz 26**
 * (bağlam katmanı) altı niteliği **adıyla** kullanıyor — kart olasılığı hakem
 * `Strictness`ine, VAR kararının değişme olasılığı `Consistency`ye, ev sahibi
 * avantajı `Home Bias`e bağlanıyor. **Faz 46** rollover adım 11 hakem listesini
 * her sezon yeniliyor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * VERİ PAKETİ SÜTUNLARINI TAŞIYOR — ama pakette bir `referees.json` YOK
 * ────────────────────────────────────────────────────────────────────────────
 *
 * §3.1.0 `referees`i `key` · `source` · `external_ids` **taşıyanlar** listesine
 * koyuyor ve bu, `spec/12` §17.2'nin dosya listesinde `referees.json`
 * **bulunmamasıyla çelişmiyor** — çelişkiyi arayıp bulamamak da bir ölçümdür:
 *
 * §3.1.0'ın kendi gerekçesi şunu söylüyor: *"`key` neden `NOT NULL`:
 * `DATA_MODE=clean`'de her varlık prosedürel üretiliyor ve **yine de
 * adreslenebilir olmak zorunda**."* Yani anahtar pakette bulunmanın değil,
 * **adreslenebilirliğin** koşulu. Hakemler v1'de prosedürel üretiliyor
 * (`source = 'procedural'`) ve `SeededRng` deterministik bir anahtar veriyor
 * (K2); bir paket ileride `referees.json` getirirse eşleme yolu **zaten hazır**.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `person_id` BUGÜN YOK — Faz 4 (üçüncü ve SON ileri FK)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/01` bu sütunu `people` tablosuna işaret eden bir FK olarak tanımlıyor ve
 * `people` **Faz 4**'te geliyor. `federations.president_person_id` (3.4) ve
 * `clubs.chairman_person_id` (3.5) için aynısı yapıldı; ROADMAP Faz 4 üçünü de
 * **adıyla** sayıyor ve *"sütunu VE yabancı anahtarı BİRLİKTE eklemek zorunda"*
 * diyor — ayrıca bir kabul kriteri olarak yazılı.
 *
 * **Bedeli ROADMAP'te açık:** hakemler Faz 4'e kadar **isimsiz** (ilk
 * görüntülendikleri yer Faz 26).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ALTI NİTELİK 1-20 — CHECK YOK
 * ────────────────────────────────────────────────────────────────────────────
 *
 * §3.1.2 ②: sayısal aralık **kalibrasyondur**, sözleşme değil — Faz 26 denge
 * ayarı bu ölçekleri yeniden düzenleyebilir. Aralık denetiminin yeri Faz 11
 * doğrulayıcısı (`pnpm validate:world`). Karşılaştır: aynı dosyadaki
 * `kit_templates.color_slots` **CHECK alıyor**, çünkü orası bir aralık değil
 * kapalı bir küme.
 */
import { integer, pgTable, serial, smallint, timestamp } from 'drizzle-orm/pg-core';

import { masterTable } from '../client/master.js';
import { countries } from './countries.js';
import { dataPackColumns, sourceCheck } from './data-pack-columns.js';

export const referees = masterTable(
  pgTable(
    'referees',
    {
      id: serial('id').primaryKey(),
      ...dataPackColumns(),
      /**
       * `ON DELETE RESTRICT` — bağımsız varlık kuralı (§3.1.2 ③). Hakem kendi
       * `key`ini taşıyor; ülkesi silinince sessizce yok olmamalı.
       */
      countryId: integer('country_id')
        .notNull()
        .references(() => countries.id, { onDelete: 'restrict' }),
      /** 1-20 — kart eğilimi. Aralık denetimi Faz 11'de (bkz. dosya başlığı). */
      strictness: smallint('strictness').notNull(),
      /** 1-20 — faul toleransı. */
      foulTolerance: smallint('foul_tolerance').notNull(),
      /** 1-20 — ev sahibi kayırma eğilimi. */
      homeBias: smallint('home_bias').notNull(),
      /** 1-20 — karar tutarlılığı; VAR kararının değişme olasılığını etkiliyor (Faz 26). */
      consistency: smallint('consistency').notNull(),
      /** 1-20 — avantaj oynatma eğilimi. */
      advantagePlay: smallint('advantage_play').notNull(),
      /** 1-20 — büyük maç tecrübesi. */
      bigGameExperience: smallint('big_game_experience').notNull(),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [sourceCheck('referees_source_check', table.source)],
  ),
);
