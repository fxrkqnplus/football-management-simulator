/**
 * `rivalries` — derbi/rekabet tablosu. `docs/spec/01-database.md` §3.1.
 *
 * Tüketicisi somut: `docs/ROADMAP.md` Faz 8 kabul kriteri *"Derbi tablosu en az
 * 30 rekabet içeriyor"* diyor ve `spec/12` §17.4 veriyi `clubs.json` içinde
 * gömülü veriyor (`"rivals": [{ "key": "fenerbahce", "intensity": 10 }, …]`).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * UYDU TABLO — ama SAHİBİ İKİ TANE
 * ────────────────────────────────────────────────────────────────────────────
 *
 * §3.1.0 `rivalries`ı veri paketi sütunlarını **taşımayanlar** listesine koyuyor
 * ve gerekçe pakette görünür: rekabetin kendi kaydı yok, kulübün içinde
 * yaşıyor. Dolayısıyla §3.1.2 ③ gereği **`ON DELETE CASCADE`** — ve burada
 * kural iki FK'ya birden uygulanıyor: taraflardan **herhangi biri** giderse
 * rekabetin anlamı kalmaz.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * İKİ FK, AYNI TABLOYA — kısıt adları ÖLÇÜLDÜ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `club_a_id` ve `club_b_id` ikisi de `clubs(id)`e bakıyor. Drizzle kısıt adını
 * `<tablo>_<sütun>_<hedef>_<hedefsütun>_fk` kalıbından üretiyor, yani ayrım
 * **sütun adından** geliyor ve çakışma beklenmiyor — ama varsayılmadı,
 * `drizzle-kit generate` çıktısından okundu:
 *
 *   rivalries_club_a_id_clubs_id_fk
 *   rivalries_club_b_id_clubs_id_fk
 *
 * Adlar elle verilmedi. Elle vermek şemayı **iki farklı adlandırma kuralına**
 * bölerdi (diğer yedi FK üretilmiş adı taşıyor) ve entegrasyon testi kısıt
 * adlarını `pg_constraint`ten okuyup iddia ettiği için sapma sessiz kalmazdı.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ TEKRAR VE KENDİNE-REFERANS KORUMASI BUGÜN YOK — bilinçli
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Şema `(A,A)`yı, `(A,B)`nin tekrarını ve `(B,A)` ters çiftini **engellemiyor**.
 * Üçü de gerçek hata biçimleri ve üçü de Faz 11 doğrulayıcısının işi. İki
 * gerekçe:
 *
 * ① **Kısmi bir koruma yanıltıcıdır.** Yalnızca `UNIQUE (club_a_id, club_b_id)`
 *    konsaydı `(1,2)` ikinci kez reddedilir ama `(2,1)` **sessizce** kabul
 *    edilirdi — *"bir kapının 'temiz' demesi baktığını göstermez"* (D3) sınıfının
 *    ta kendisi. Tam koruma `CHECK (club_a_id < club_b_id)` + `UNIQUE` çiftiyle
 *    mümkün, ama o da Faz 8 ingest'ine hiçbir spec'in istemediği bir sıralama
 *    sözleşmesi dayatırdı (K12).
 * ② **Sonradan eklemenin maliyeti sıfıra yakın:** `UNIQUE` zaten bir indeks
 *    yaratıyor ve 3.7 (indeksler + `pg_trgm`) bu fazın içinde. İstenirse orada
 *    tek migration'a biner.
 */
import { integer, pgTable, serial, smallint, text, timestamp } from 'drizzle-orm/pg-core';

import { masterTable } from '../client/master.js';
import { clubs } from './clubs.js';

export const rivalries = masterTable(
  pgTable('rivalries', {
    id: serial('id').primaryKey(),
    clubAId: integer('club_a_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    clubBId: integer('club_b_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    /** 1-10 yoğunluk. Aralık denetimi Faz 11'de — CHECK değil (§3.1.2 ②). */
    intensity: smallint('intensity').notNull(),
    /**
     * `null` = rekabetin özel bir adı yok.
     *
     * `spec/01`'de açıkça `nullable` ve `spec/12` §17.4 bunu doğruluyor:
     * paketteki `rivals` girdisi yalnızca `key` + `intensity` taşıyor, ad
     * taşımıyor. "Kıtalar Arası Derbi" gibi bir ad **arayüzde görünen metindir**,
     * o yüzden i18n anahtarı (K5) — özel isim olan `clubs.name`in tersi.
     */
    nameKey: text('name_key'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  }),
);
