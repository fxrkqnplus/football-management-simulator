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
 * `chairman_person_id` BUGÜN YOK — Faz 4
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/01` bu sütunu `people` tablosuna işaret eden bir FK olarak tanımlıyor ve
 * `people` **Faz 4**'te geliyor. Sütunu bugün kısıtsız yazmak Faz 3'ün 3. kabul
 * kriterini (*"tüm yabancı anahtarlar tanımlı"*) **görünürde** sağlayıp gerçekte
 * delerdi. 3.4'te `federations.president_person_id` için aynısı yapıldı; karar
 * `docs/ROADMAP.md` Faz 3 tablo envanterinde ve Faz 4 maddesinde yazılı.
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
import { boolean, char, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

import { masterTable } from '../client/master.js';
import { competitions } from './competitions.js';
import { countries } from './countries.js';
import { dataPackColumns, sourceCheck } from './data-pack-columns.js';
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
    },
    (table) => [sourceCheck('clubs_source_check', table.source)],
  ),
);
