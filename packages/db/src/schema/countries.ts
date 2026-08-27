/**
 * `countries` — 6 ülke (v1). Faz 3.4'te TAMAMLANDI.
 *
 * Tablo 3.2a'da bilerek eksik yazılmıştı: migration koşucusunun test edebileceği
 * *gerçek* bir migration gerekiyordu ve koşucuyu sahte bir şemaya karşı kanıtlamak
 * D5 deseninin ta kendisi olurdu. Eksik sütunlar burada, `0001` migration'ıyla
 * eklendi — yani koşucunun **ikinci gerçek müşterisi** ve `down`unun ilk
 * **karışık** vakası (`ALTER TABLE … DROP COLUMN` + `DROP TABLE` aynı dosyada).
 *
 * Sütun tanımları `docs/spec/01-database.md` §3.1'den, veri paketi sütunları
 * (`key` · `source` · `external_ids`) §3.1.0'dan geliyor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ SÜTUN SIRASI MANTIKSAL DEĞİL, FİZİKSEL — ve bu ÖLÇÜLEREK seçildi
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `created_at`/`updated_at` ortada duruyor ve bu **kasıtlı**. `ALTER TABLE ADD
 * COLUMN` yeni sütunu tablonun **sonuna** ekler; `0001` bu tabloya sekiz sütun
 * ekledi, yani gerçek sıra şu (PG 18.6'da ölçüldü, tahmin edilmedi):
 *
 *   id · key · code · name_key · created_at · updated_at ·        ← 0000
 *   source · external_ids · confederation · flag_asset_id ·       ← 0001
 *   football_level · uefa_coefficient · currency_code · work_permit_rule_key
 *
 * Sütunlar burada mantıksal sırada (`key`in yanında `source`) yazılsaydı,
 * `drizzle-kit`in ürettiği `meta/0001_snapshot.json` **TS sırasını** kaydederdi ve
 * gerçek tabloyla ayrışırdı. Bu önemli çünkü Faz 3.2b'nin **ikinci iddiası**
 * (*"snapshot gerçek şemayı doğru anlatıyor"*) kapsamına **sütun sırasını** da
 * almış durumda (`src/schema-state/drizzle-snapshot.ts` başlığı).
 *
 * İki yol vardı: ① karşılaştırmadan sütun sırasını **çıkarmak** ② tanımı fiziksel
 * sıraya **hizalamak**. ② seçildi. ① bir kapıyı daraltmak olurdu ve bu projenin
 * en pahalı ders sınıfı tam olarak budur (*"bir kapının 'temiz' demesi, baktığını
 * göstermez"* — D3). ② ise bedava değil ama **bir değişmez** kazandırıyor:
 * **bu dosyadaki sıra, tablonun gerçek sırasıdır.** `SELECT *`in ne döndüreceği
 * dosyaya bakarak bilinir ve snapshot sonraki fazlarda doğruluk kaynağı olmayı
 * sürdürür.
 *
 * **Sonraki fazlar için kural:** var olan bir tabloya sütun eklerken sütun
 * TS tanımının da **sonuna** yazılır. Unutulursa entegrasyon testi
 * (`snapshot ↔ gerçek şema`) kırılır — sessiz değil.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NULLABLE OLAN SÜTUNLAR VE GEREKÇESİ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/01` §3.1 nullability'yi **açık bir işaretle** yazıyor (`crestAssetId: text
 * nullable`) ve işaretsiz sütunlar `NOT NULL` okunuyor. `flagAssetId` işaretsiz —
 * ama aynı belge `stadiums.assetId`i **nullable** yazıyor. Bu bir tutarsızlık ve
 * varlık kimlikleri lehine çözüldü: K9 gereği eksik bir varlık **prosedürel
 * olarak üretiliyor**, yani "varlık yok" gerçek ve beklenen bir durum. `NOT NULL`
 * olsaydı `DATA_MODE=clean` her ülke için uydurma bir kimlik yazmak zorunda
 * kalırdı. Kayıt: SAPMA-026.
 */
import { sql } from 'drizzle-orm';
import {
  char,
  check,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

import { masterTable } from '../client/master.js';
import { dataPackColumns, sourceCheck } from './data-pack-columns.js';

/**
 * Çalışma izni rejimi — `docs/spec/01-database.md` §3.1'de **kapalı** bir küme
 * olarak yazılı (`'gbe' | 'eu_quota' | 'tr_quota' | 'none'`), o yüzden CHECK'li.
 *
 * Karşılaştır: aynı tablodaki `confederation` **açık uçlu** yazılmış
 * (`UEFA, CONMEBOL...`) ve CHECK almıyor. Ayrım kasıtlı — kapalı bir küme
 * sözleşmedir, açık uçlu bir liste örnektir.
 */
export const WORK_PERMIT_RULES = ['gbe', 'eu_quota', 'tr_quota', 'none'] as const;

export type WorkPermitRuleKey = (typeof WORK_PERMIT_RULES)[number];

// §3.1.0'ın üç sütunu. `countries`te blok hâlinde YAYILAMAZ: `key` 0000'den,
// `source`/`external_ids` 0001'den geliyor ve aralarında `created_at` var
// (yukarıdaki fiziksel sıra notu).
const { key, source, externalIds } = dataPackColumns();

export const countries = masterTable(
  pgTable(
    'countries',
    {
      // ── 0000_countries_initial ────────────────────────────────────────────
      id: serial('id').primaryKey(),
      key,
      /** ISO 3166-1 alpha-3: TUR, ENG, ESP… */
      code: varchar('code', { length: 3 }).notNull().unique(),
      /** i18n anahtarı — görünen ad koda gömülmez (K5). */
      nameKey: text('name_key').notNull(),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),

      // ── 0001_geography_institutions (ALTER TABLE → sona eklenir) ──────────
      source,
      externalIds,
      /** UEFA, CONMEBOL… — açık uçlu, CHECK yok. */
      confederation: text('confederation').notNull(),
      /** `null` → bayrak prosedürel üretilir (K9). Faz 7'de `asset_index`e bağlanacak. */
      flagAssetId: text('flag_asset_id'),
      /** 1-100 — newgen kalitesini etkiler (Faz 10). */
      footballLevel: integer('football_level').notNull(),
      /**
       * UEFA ülke katsayısı.
       *
       * `numeric` — `double precision` DEĞİL. Katsayı sıralaması küme düşme ve
       * Avrupa kotası hesaplarına giriyor; kayan nokta yuvarlaması iki ülkeyi
       * yanlış sıraya koyabilir. `postgres.js` `numeric`i **dizge** olarak
       * döndürüyor (Faz 3.2a'da ölçüldü), yani hassasiyet JS tarafında da
       * kaybolmuyor.
       */
      uefaCoefficient: numeric('uefa_coefficient', { precision: 8, scale: 3 }).notNull(),
      /** ISO 4217: TRY, GBP, EUR. */
      currencyCode: char('currency_code', { length: 3 }).notNull(),
      workPermitRuleKey: text('work_permit_rule_key').$type<WorkPermitRuleKey>().notNull(),
    },
    (table) => [
      sourceCheck('countries_source_check', table.source),
      check(
        'countries_work_permit_rule_key_check',
        sql`${table.workPermitRuleKey} IN (${sql.raw(WORK_PERMIT_RULES.map((rule) => `'${rule}'`).join(', '))})`,
      ),
    ],
  ),
);
