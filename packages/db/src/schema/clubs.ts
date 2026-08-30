/**
 * `clubs` — Faz 3'ün merkezî tablosu. `docs/spec/01-database.md` §3.1.
 *
 * Üç bağımsız varlığa birden bakıyor (`competitions` · `countries` · `stadiums`)
 * ve üç uydu tablonun sahibi (`club_facilities` · `club_finances_base` ·
 * `rivalries`). Bu yüzden `ON DELETE` kuralının (§3.1.2 ③) **her iki yönü** de
 * burada görülüyor: kulübün BAKTIĞI her şey `RESTRICT`, kulübe BAKAN her şey
 * `CASCADE`.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ `competition_id` VE `stadium_id` NULLABLE — bilinçli, gerekçesi milli takım
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/01` §3.1 ikisini de **işaretsiz** yazıyor ve SAPMA-026'nın türetme
 * kuralı işaretsiz sütunu `NOT NULL` okur. İkisi de bilerek o okumadan
 * ayrılıyor, çünkü aynı tablo `is_national` sütununu taşıyor:
 *
 * **Milli takımlar (Faz 41) bu tabloda GERÇEK SATIRLARDIR** — `docs/ROADMAP.md`
 * Faz 41 milli maçların simüle edildiğini, oyuncu davetlerini ve büyük
 * turnuvaları kapsama alıyor. Bir milli takımın ne bir **ligi** vardır ne de
 * sabit bir **ev sahası**. `NOT NULL` olsaydı her milli takıma uydurma bir lig
 * ve uydurma bir stadyum kimliği yazılırdı — SAPMA-026 ②'nin `competitions.tier`
 * için verdiği gerekçenin birebir aynısı: **`null`, "uygulanamaz"ın tek dürüst
 * gösterimidir.**
 *
 * `stadium_id` için ayrıca kulüp tarafında da gerçek vakalar var: kiralık
 * stadyum, paylaşılan stadyum, veri paketinde eksik kayıt.
 *
 * **Bugünkü bedava, yarınki pahalı:** `NOT NULL` yazılsaydı Faz 41 iki ayrı
 * `ALTER TABLE … DROP NOT NULL` yazmak zorunda kalırdı — yani şemanın bugün
 * yanlış olduğu ancak orada anlaşılırdı ve migration zinciri bir halka uzardı.
 *
 * ⚠️ **Bu bir gevşetme değil, konum kararı.** *"`is_national = false` olan bir
 * kulüp ligsiz/stadyumsuz kalabilir mi?"* sorusu bir **tutarlılık kısıtıdır** ve
 * sütun seviyesinde ifade edilemez (koşullu `NOT NULL` diye bir şey yok). Yeri
 * Faz 11 doğrulayıcısı; soru `docs/SPEC-COVERAGE-GAPS.md` G-10'a yazıldı ki
 * kaybolmasın.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `chairman_person_id` 4.4'TE GELDİ — NULLABLE AMA `SET NULL` DEĞİL
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Sütun Faz 3'te bilerek yazılmadı (kısıtsız bir sütun *"tüm yabancı anahtarlar
 * tanımlı"* kriterini görünürde sağlayıp gerçekte delerdi); 4.4 sütunu ve kısıtı
 * **birlikte** ekledi (`0006`).
 *
 * ⚠️ **Sütun nullable ve yine de `SET NULL` ALMIYOR — RESTRICT alıyor.** Sebep
 * `fk-policy.ts`in sırası: ② (*kaynak `independent` → RESTRICT*) ③'ten
 * (*bütün sütunlar nullable → SET NULL*) **önce** geliyor ve `clubs` kendi
 * `key`ini taşıdığı için `independent`. Karşılaştır — aynı migration'daki
 * `federations.president_person_id` **aynı hedefe**, **aynı nullability** ile
 * bakıyor ve **SET NULL** alıyor; tek fark kaynağın sınıfı (`federations` bir
 * uydu). İki FK, aynı gün, aynı tablo, iki farklı cevap.
 *
 * Aynı sınıfın önceki örnekleri: `competitions.country_id`,
 * `clubs.competition_id`, `clubs.stadium_id`,
 * `people.second_nationality_country_id`.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * SAYISAL ARALIKLAR CHECK ALMIYOR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `reputation` (0-200) ve `supporter_expectation` (0-100) yorumda aralıklı
 * yazılı ama CHECK almıyorlar — §3.1.2 ②: bir değer kümesi sözleşmedir, bir
 * aralık kalibrasyondur ve Faz 23/Faz 30 denge ayarı onu değiştirebilir.
 * Aralık denetiminin yeri Faz 11.
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

import { masterTable } from '../client/master.js';
import { competitions } from './competitions.js';
import { countries } from './countries.js';
import { dataPackColumns, sourceCheck } from './data-pack-columns.js';
import { people } from './people.js';
import { searchNormalizedSql } from './search.js';
import { stadiums } from './stadiums.js';

export const clubs = masterTable(
  pgTable(
    'clubs',
    {
      id: serial('id').primaryKey(),
      ...dataPackColumns(),
      /**
       * Kulübün mevcut ligi. `null` = hiçbir ligde değil (milli takım, Faz 41).
       *
       * `ON DELETE RESTRICT` — bağımsız varlık kuralı (§3.1.2 ③). Yarışma kendi
       * `key`ini taşıyor; silinmesi kulüpleri sessizce ligsiz bırakmamalı.
       *
       * ⚠️ Küme düşme/çıkma bu sütunu **değiştirmez**: master salt-okunurdur
       * (K4), sezon geçişindeki lig değişimi `save_deltas`'a yazılır.
       */
      competitionId: integer('competition_id').references(() => competitions.id, {
        onDelete: 'restrict',
      }),
      /**
       * `ON DELETE RESTRICT` — bağımsız varlık kuralı. Karşılaştır:
       * `federations.country_id` **CASCADE** alıyor, çünkü federasyon bir uydu.
       */
      countryId: integer('country_id')
        .notNull()
        .references(() => countries.id, { onDelete: 'restrict' }),
      /** Kulübün tam adı — özel isim, `name_key` değil (bkz. `stadiums.name`). */
      name: text('name').notNull(),
      /** Dar alanlarda gösterilen kısa ad. `spec/01`: ~8 karakter — sınır Faz 11'de. */
      shortName: text('short_name').notNull(),
      /** GAL, FEN, BJK — `spec/01` `char(3)` yazıyor. */
      abbreviation: char('abbreviation', { length: 3 }).notNull(),
      /** `null` = bilinmiyor. Uydurulmuş bir yıl, eksik bir yıldan kötüdür (SAPMA-026 ③). */
      foundedYear: integer('founded_year'),
      city: text('city').notNull(),
      /**
       * Ev sahası. `null` = sabit ev sahası yok (milli takım, Faz 41).
       *
       * `ON DELETE RESTRICT` — stadyum bağımsız bir varlık (§3.1.0'da `key`
       * taşıyanlar listesinde), sessizce silinmemeli.
       */
      stadiumId: integer('stadium_id').references(() => stadiums.id, { onDelete: 'restrict' }),
      /** 0-200. Aralık denetimi Faz 11'de — CHECK değil (§3.1.2 ②). */
      reputation: integer('reputation').notNull(),
      /** `#RRGGBB` — `spec/01` `char(7)` yazıyor. */
      colorPrimary: char('color_primary', { length: 7 }).notNull(),
      colorSecondary: char('color_secondary', { length: 7 }).notNull(),
      /** Üçüncü renk her kulüpte yok — `spec/01`'de açıkça `nullable`. */
      colorTertiary: char('color_tertiary', { length: 7 }),
      /** `null` → arma prosedürel üretilir (K9), tohumu aşağıdaki sütun. */
      crestAssetId: text('crest_asset_id'),
      /**
       * Prosedürel arma tohumu. `NOT NULL` ve bu bir istisna değil: K2 gereği
       * her rastgelelik deterministik bir tohumdan gelir, yani tohum her kulüp
       * için **her zaman** üretilebilir — eksik kalabilecek bir bilgi değil.
       */
      crestSeed: integer('crest_seed').notNull(),
      supporterCount: integer('supporter_count').notNull(),
      /** 0-100. Aralık denetimi Faz 11'de. */
      supporterExpectation: integer('supporter_expectation').notNull(),
      /**
       * Milli takım mı. **DEFAULT YOK** — `source`un varsayılan almama kararıyla
       * aynı ilke: bir varsayılan, kimsenin belirtmediği satıra "kulüp takımı"
       * bilgisini **uydururdu**. Faz 41 bayrağı yazmayı unutursa `INSERT`
       * gürültülü biçimde patlar; sessizce yanlış satır oluşmaz.
       */
      isNational: boolean('is_national').notNull(),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
      /**
       * Kulüp başkanı. `null` = bilinmiyor (`spec/01`: `chairmanPersonId FK nullable`).
       *
       * ⚠️ **SÜTUN SONDA — §3.1.2 ④.** `ALTER TABLE ADD COLUMN` fiziksel sona
       * ekliyor; TS tanımı da sonda olmak zorunda, yoksa snapshot ↔ gerçek şema
       * karşılaştırması kırılır. Nöbetçisi `round-trip.itest.ts`teki
       * *"clubs fiziksel sütun sırası"* testi — 3.5'te tam bu gün için yazılmıştı.
       *
       * `ON DELETE RESTRICT` — nullable olmasına rağmen; gerekçe dosya başlığında.
       */
      chairmanPersonId: integer('chairman_person_id').references(() => people.id, {
        onDelete: 'restrict',
      }),
    },
    (table) => [
      sourceCheck('clubs_source_check', table.source),
      /**
       * ⚠️ PostgreSQL FK sütunlarını **otomatik indekslemiyor** — ve bu indeksin
       * tüketicisi bugün de var: `competitions` üzerindeki `ON DELETE RESTRICT`
       * denetimi her yarışma silme girişiminde `clubs`u tarıyor. İkinci tüketici
       * *"bir ligin kulüplerini getir"* (Faz 16 fikstür, Faz 18 kadro).
       */
      index('clubs_competition_id_idx').on(table.competitionId),
      /**
       * TÜRKÇE ARAMA — `docs/ROADMAP.md` Faz 8 kabul kriteri
       * (*"`besiktas` → `Beşiktaş`"*). İfade **`search.ts`ten** geliyor;
       * sorgu tarafı birebir aynı ifadeyi kullanmak zorunda, yoksa planlayıcı
       * indeksi seçmez ve kimse fark etmez (D3).
       */
      index('clubs_name_trgm_idx').using(
        'gin',
        sql.raw(`${searchNormalizedSql('"name"')} gin_trgm_ops`),
      ),
    ],
  ),
);
