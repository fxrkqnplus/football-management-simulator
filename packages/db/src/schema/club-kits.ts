/**
 * `club_kits` — bir kulübün formaları. `docs/spec/01-database.md` §3.1.
 *
 * Uydu tablo: §3.1.0 veri paketi sütunlarını *taşımayanlar* listesine koyuyor ve
 * `spec/12` §17.4 bunu doğruluyor — `kits.json` kayıtları **`clubKey` ile**
 * anahtarlanıyor, kendi kimlikleri yok:
 *
 * ```jsonc
 * [{ "clubKey": "galatasaray",
 *    "home": { "image": "kits/galatasaray-home.png" }, … }]
 * ```
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ `asset_id` — `spec/01` §3.1'DE YOK, BİLEREK EKLENDİ (SAPMA-026 EK, 3.6)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/01`in `club_kits` tanımı `{ id, clubId, kitType, templateId, color1..3 }`
 * — görsel kimliği taşımıyor. Ama:
 *
 * - `spec/12` §17.4 her formaya bir **`image`** yolu veriyor,
 * - §17.9'un **ilk kabul kriteri** *"`DATA_MODE=full` … forma görselleri ekranda
 *   görünüyor"* diyor (aynısı `CLAUDE.md` §16.3 başarı tanımında),
 * - §17.4 iki durumu **ayırıyor**: görsel var / *"görsel yoksa `kit_templates`
 *   sisteminden üretilir"*.
 *
 * Sütun olmadan bu ayrım şemada **ifade edilemiyordu**: her satır "şablon + üç
 * renk" der ve gerçek bir forma görselinin yazılacağı yer kalmazdı. Görsel
 * taşıyan diğer **beş** tablonun hepsi bu sütunu taşıyor
 * (`clubs.crest_asset_id` · `stadiums.asset_id` · `competitions.logo_asset_id` ·
 * `countries.flag_asset_id` · `federations.asset_id`); `club_kits`i dışarıda
 * bırakmak SAPMA-026'nın düzelttiği tutarsızlığın **aynısını** yeni bir tabloda
 * üretirdi.
 *
 * **Düz `text`, `asset_index`e FK DEĞİL:** `asset_index` G-09 olarak **Faz 7**'ye
 * atandı ve bugün olmayan bir tabloya FK yazılamaz. Faz 3'ün kararı tüm varlık
 * kimliklerini düz `text` bırakmak; tek tablo için bozulmuyor.
 *
 * **`template_id` NOT NULL kalıyor.** K9 gereği prosedürel yedek **her zaman**
 * kurulabilir olmalı: `asset_id` null olduğunda çizilecek bir şablon bulunmak
 * zorunda. İkisi birden nullable olsaydı hiçbir şeyi render edemeyen bir satır
 * temsil edilebilir olurdu.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `(club_id, kit_type)` BENZERSİZ — ve bu karar `rivalries`ten AYRI VERİLDİ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * 3.5'te `rivalries` için teklik kısıtı **Faz 11'e bırakılmıştı**; gerekçe,
 * kısmi bir `UNIQUE`in `(B,A)` ters çiftini sessizce geçirmesiydi (D3) ve tam
 * korumanın Faz 8 ingest'ine hiçbir spec'in istemediği bir sıralama sözleşmesi
 * dayatmasıydı.
 *
 * **O gerekçe burada geçersiz** ve karar kopyalanmadı: `kit_type` kapalı bir
 * küme, sıralama belirsizliği yok, bir kulübün iki *"home"* forması olamaz —
 * `spec/12` §17.4 her kulübe tipi başına birer tane veriyor. Yani kısıt
 * **tam**, kısmi değil; ve ingest'e hiçbir sözleşme dayatmıyor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * İKİ FK, İKİ FARKLI DAVRANIŞ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * - **`club_id` → `clubs`: CASCADE.** §3.1.2 ③, uydu kuralı: kimliği sahibinin
 *   kimliğidir.
 * - **`template_id` → `kit_templates`: RESTRICT.** ⚠️ §3.1.2 ③'ün ikili ayrımı
 *   bu vakayı **kapsamıyor**: `kit_templates` ne bir uydu (kimse sahibi değil)
 *   ne de bir paket varlığı — **sahipsiz bir sözlük tablosu**. CASCADE, bir
 *   şablon silinince kulübün forma satırını **alakasız bir sebeple** yok
 *   ederdi; silen tarafın önce o formaları ele alması gerekir.
 */
import { sql } from 'drizzle-orm';
import {
  char,
  check,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

import { masterTable } from '../client/master.js';
import { clubs } from './clubs.js';
import { kitTemplates } from './kit-templates.js';

/**
 * Forma türü — `spec/01` §3.1'de **kapalı** bir küme (`'home'|'away'|'third'`),
 * o yüzden CHECK'li. Serbest metin olsaydı `'Home'` veya `'3rd'` sessizce girer
 * ve o forma hiçbir tip sorgusunda görünmezdi.
 */
export const KIT_TYPES = ['home', 'away', 'third'] as const;

export type KitType = (typeof KIT_TYPES)[number];

export const clubKits = masterTable(
  pgTable(
    'club_kits',
    {
      id: serial('id').primaryKey(),
      clubId: integer('club_id')
        .notNull()
        .references(() => clubs.id, { onDelete: 'cascade' }),
      kitType: text('kit_type').$type<KitType>().notNull(),
      templateId: integer('template_id')
        .notNull()
        .references(() => kitTemplates.id, { onDelete: 'restrict' }),
      /** `#RRGGBB` — şablonun 1. renk yuvası. */
      color1: char('color1', { length: 7 }).notNull(),
      color2: char('color2', { length: 7 }).notNull(),
      /**
       * `null` = şablonun **iki** renk yuvası var (`kit_templates.color_slots`).
       * Yuva sayısıyla tutarlılık bir **koşullu** kuraldır ve sütunla ifade
       * edilemez → Faz 11 doğrulayıcısı.
       */
      color3: char('color3', { length: 7 }),
      /**
       * Gerçek forma görselinin kimliği.
       *
       * **Prosedürel yedek her zaman var** (`kit_templates` × kulüp renkleri);
       * `null` = paket görsel taşımıyor, **hata değil** (K9). Faz 8/9'da ingest
       * yazan taraf bunu bir eksiklik sanmasın.
       */
      assetId: text('asset_id'),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
      check(
        'club_kits_kit_type_check',
        sql`${table.kitType} IN (${sql.raw(KIT_TYPES.map((type) => `'${type}'`).join(', '))})`,
      ),
      unique('club_kits_club_id_kit_type_unique').on(table.clubId, table.kitType),
    ],
  ),
);
