/**
 * `stadiums` — kulüplerin ev sahası. `docs/spec/01-database.md` §3.1.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * BAĞIMSIZ VARLIK — veri paketi sütunlarını TAŞIR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/01` §3.1.0 `key` · `source` · `external_ids` üçlüsünü pakette **kendi
 * kaydı olarak görünen** varlıklara veriyor ve `stadiums` o listede. Karşılığı
 * `spec/12` §17.2'de somut: paket klasöründe `data/stadiums.json` var ve
 * `clubs.json` stadyuma **`stadiumKey` ile** bağlanıyor — yani stadyumun kendi
 * anahtarı bir tasarım tercihi değil, paket formatının gereği.
 *
 * Sonucu `ON DELETE` tarafında görünür: `clubs.stadium_id` **RESTRICT** alıyor
 * (§3.1.2 ③). Bir stadyum silinirken orada oynayan kulüp sessizce ortada
 * bırakılmaz; silen tarafın önce kulübü ele alması gerekir.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NULLABLE SÜTUNLAR — SAPMA-026'nın türetme kuralı
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/01` nullability'yi açık bir işaretle yazıyor ve işaretsiz sütunlar
 * `NOT NULL` okunuyor. İki sütun bu okumadan **bilerek** ayrılıyor:
 *
 * - **`asset_id`** — belgede zaten `nullable` işaretli. K9 gereği eksik bir
 *   varlık prosedürel üretiliyor, yani "görsel yok" gerçek bir durum. `spec/12`
 *   §17.2 bunu sayıyla da doğruluyor: paket manifestinde stadyum fotoğrafı
 *   sayısı kulüp sayısından **az** (`"stadiums": 94` / `"clubCount": 118`).
 * - **`built_year`** — belgede işaretsiz, ama `federations.founded_year` ile
 *   **aynı sınıf** ve o 3.4'te nullable yapıldı (SAPMA-026 ③): *"veri paketinde
 *   eksik olabilir; uydurulmuş bir yıl, eksik bir yıldan kötüdür."* Aynı sınıfa
 *   iki farklı cevap vermek, SAPMA-026'nın düzelttiği tutarsızlığı yeniden
 *   üretirdi.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `seated_capacity <= capacity` NEDEN CHECK DEĞİL
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Yapısal bir değişmez ve CHECK'e uygun görünüyor. Konulmamasının sebebi
 * §3.1.2 ②: bu şemada CHECK **kapalı değer kümelerinin** aracı; sayısal ve
 * ilişkisel içerik denetimi Faz 11 doğrulayıcısının (`pnpm validate:world`)
 * işi. Bir kural, tek tek vakalara bakılarak esnetilirse "hangi denetim nerede"
 * sorusunun cevabı kaybolur — ve tam olarak o kayıp, §3.1.2'nin yazılma
 * sebebiydi.
 */
import { integer, pgTable, serial, smallint, text, timestamp } from 'drizzle-orm/pg-core';

import { masterTable } from '../client/master.js';
import { dataPackColumns, sourceCheck } from './data-pack-columns.js';

export const stadiums = masterTable(
  pgTable(
    'stadiums',
    {
      id: serial('id').primaryKey(),
      ...dataPackColumns(),
      /**
       * Stadyumun kendi adı — `name_key` DEĞİL.
       *
       * `federations.name` ile aynı gerekçe: "Rams Park" bir **özel isimdir**,
       * arayüz metni değil. K5 çevrilecek metni koruyor, özel ismi değil.
       */
      name: text('name').notNull(),
      city: text('city').notNull(),
      capacity: integer('capacity').notNull(),
      seatedCapacity: integer('seated_capacity').notNull(),
      /** 1-20. Aralık denetimi Faz 11 doğrulayıcısında — CHECK değil (§3.1.2 ②). */
      pitchQuality: smallint('pitch_quality').notNull(),
      /** `null` = bilinmiyor. Uydurulmuş bir yıl, eksik bir yıldan kötüdür (SAPMA-026 ③). */
      builtYear: integer('built_year'),
      /** `null` → stadyum görseli prosedürel üretilir (K9). */
      assetId: text('asset_id'),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [sourceCheck('stadiums_source_check', table.source)],
  ),
);
