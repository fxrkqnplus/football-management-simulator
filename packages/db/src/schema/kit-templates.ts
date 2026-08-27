/**
 * `kit_templates` — oyunun KENDİ forma şablonları. `docs/spec/01-database.md` §3.1.
 *
 * 20 SVG şablonu; her biri 2 veya 3 renk yuvası taşıyor ve kulüp renkleriyle
 * boyanarak forma üretiyor. `spec/12` §17.4: *"Görsel yoksa `kit_templates`
 * sisteminden (20 SVG şablonu × 3 renk) üretilir."*
 *
 * ────────────────────────────────────────────────────────────────────────────
 * VERİ PAKETİ SÜTUNLARINI TAŞIMIYOR — ve bu kez gerekçe ÖLÇÜLDÜ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * §3.1.0 bu tabloyu *taşımayanlar* listesine koyuyor ve gerekçesini
 * *"pakette değil, oyunun kendi şablonları"* diye yazıyor. 3.6'da bu bir okuma
 * değil **ölçüm**: `spec/12` §17.2'nin paket klasör yapısında
 * `data/templates.json` diye bir dosya **YOK** — paket `countries · competitions ·
 * clubs · stadiums · players · staff · kits` taşıyor, şablon taşımıyor. Yani
 * şablonlar hiçbir pakette *kendi kaydı olarak görünmüyor* ve eşlenecek bir
 * dış anahtarları da olamaz.
 *
 * **`code` benzersiz — `key`in yerine geçiyor.** §3.1.0'ın kendi notu bunu
 * söylüyor (*"`code` sütunu zaten o rolü görüyor"*) ve `key` tablo başına
 * `UNIQUE`. Aynı deseni `countries.code` ve `competitions.code` de taşıyor.
 * Benzersizlik olmasaydı iki şablon aynı kodla durabilir ve *"`stripes_v` kodlu
 * şablonu getir"* sorgusu **hangisini** döndüreceği belirsiz olurdu.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ `color_slots` CHECK ALIYOR — sayısal ama ARALIK DEĞİL
 * ────────────────────────────────────────────────────────────────────────────
 *
 * §3.1.2 ② sayısal aralıklara CHECK koymayı yasaklıyor (`reputation` 0-200,
 * `football_level` 1-100). `color_slots` sayısal ama o tarafa düşmüyor ve ayrım
 * kuralın **kendi ayracından** okunuyor: spec aralıkları `// 0-200` diye, bunu
 * ise `// 2 veya 3` diye — bir **sıralama** olarak — yazıyor.
 *
 * Gerekçe tarafı da aynı yeri gösteriyor: bir aralık **kalibrasyondur** ve Faz
 * 23/Faz 30 denge ayarı onu değiştirebilir; slot sayısı ise **SVG sisteminin
 * yapısıdır** — dördüncü bir yuva ancak 20 şablonun yeniden çizilmesiyle
 * gelirdi. Yani sözleşme, kalibrasyon değil.
 */
import { sql } from 'drizzle-orm';
import { check, pgTable, serial, smallint, text, timestamp } from 'drizzle-orm/pg-core';

import { masterTable } from '../client/master.js';

/**
 * Bir şablonun kaç renk yuvası olabileceği — **kapalı** küme.
 *
 * CHECK ifadesi bu diziden **türetiliyor**, elle yazılmıyor: TypeScript tipi ile
 * veritabanı kısıtı aynı satırdan geldiği için ayrışamazlar
 * (`data-pack-columns.ts`in `DATA_SOURCES` ile yaptığının aynısı).
 */
export const KIT_COLOR_SLOTS = [2, 3] as const;

export type KitColorSlots = (typeof KIT_COLOR_SLOTS)[number];

export const kitTemplates = masterTable(
  pgTable(
    'kit_templates',
    {
      id: serial('id').primaryKey(),
      /** `stripes_vertical`, `hoops`, `sash`… — `key`in yerine geçen sabit kimlik. */
      code: text('code').notNull().unique(),
      /** i18n anahtarı — görünen ad koda gömülmez (K5). */
      nameKey: text('name_key').notNull(),
      /** Şablon SVG'sinin uygulama içindeki yolu. */
      svgPath: text('svg_path').notNull(),
      colorSlots: smallint('color_slots').$type<KitColorSlots>().notNull(),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
      check(
        'kit_templates_color_slots_check',
        sql`${table.colorSlots} IN (${sql.raw(KIT_COLOR_SLOTS.join(', '))})`,
      ),
    ],
  ),
);
