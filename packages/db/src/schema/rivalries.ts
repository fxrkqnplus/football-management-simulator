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
 * ⚠️ ÇİFT TEKLİĞİ 3.7'DE EKLENDİ — 3.5'in KARARI GERİ ALINDI, ve sebebi yazılı
 * ────────────────────────────────────────────────────────────────────────────
 *
 * **3.5'te teklik kısıtı Faz 11'e bırakılmıştı** (G-11). Gerekçe iki bacaklıydı:
 *
 * ① Kısmi bir koruma yanıltıcıdır — yalnızca `UNIQUE (club_a_id, club_b_id)`
 *    konsaydı `(1,2)` ikinci kez reddedilir ama `(2,1)` **sessizce** kabul
 *    edilirdi (D3).
 * ② Tam koruma (`CHECK a < b` + `UNIQUE`) Faz 8 ingest'ine hiçbir spec'in
 *    istemediği bir **sıralama sözleşmesi** dayatırdı (K12).
 *
 * **3.7'de iki bacak da düştü.** Bir **ifade indeksi** üçüncü bir yol açıyor:
 *
 * ```sql
 * CREATE UNIQUE INDEX … ON rivalries (LEAST(club_a_id,club_b_id),
 *                                     GREATEST(club_a_id,club_b_id));
 * ```
 *
 * `(1,2)` ve `(2,1)` **aynı** anahtara indirgeniyor — koruma kısmi değil **tam**
 * (①  düştü) — ve ingest çiftleri istediği sırada yazabiliyor, hiçbir sözleşme
 * yok (② düştü). Yani karar kopyalanmadı: *"bir kararı kopyalamadan önce
 * gerekçesinin hâlâ geçerli olduğunu sor"*.
 *
 * ⚠️ **KAPSAM — ne KAPANMADI:** `(A,A)` kendine-referansı bir ifade indeksiyle
 * engellenemez (tek satır olarak geçerli bir anahtar üretir). O bir **değer**
 * kuralı ve yeri Faz 11 doğrulayıcısı; **G-11 kapanmadı, daraldı**. Bunu yazmak
 * zorunlu: yazılmasaydı indeksin varlığı *"rekabetler korunuyor"* izlenimi verir
 * ve kalan delik görünmez olurdu (D3).
 */
import { sql } from 'drizzle-orm';
import {
  integer,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { masterTable } from '../client/master.js';
import { clubs } from './clubs.js';

export const rivalries = masterTable(
  pgTable(
    'rivalries',
    {
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
       *
       * ─────────────────────────────────────────────────────────────────────
       * G-13'ÜN KARARI BU SÜTUNU DA KAPSIYOR — ama ARAMA sorunu KAPSAMIYOR
       * ─────────────────────────────────────────────────────────────────────
       *
       * **Mimari karar aynı (5.8):** çeviri kaynağı `locales/tr/*.json`da
       * yaşar, veritabanı **anahtarı** taşır. Gerekçenin tamamı
       * `competitions.ts`teki `name_key` yorumunda; burada tekrarlanmıyor.
       *
       * ⚠️ **AMA BU SÜTUN G-13'ÜN ARAMA YARISINA GİRMİYOR ve bu ölçüldü (5.8).**
       * ROADMAP Faz 17 **beş** varlık türü sayıyor — oyuncu · kulüp · personel ·
       * **lig · turnuva** — ve son ikisi de `competitions` satırlarıdır.
       * `rivalries` o listede **yok**. G-13'ün metni bu sütunu *"aynı sorun"*
       * diye anıyor ve bu **sınıf** olarak doğru (görünen ad bir i18n anahtarı),
       * ama bir **arama gereksinimi** olarak değil.
       *
       * ⚠️ **VE BU SÜTUNUN ÜÇÜNCÜ BİR ÖZELLİĞİ VAR — yalnızca burada yazılabilir:**
       * `null` meşru bir değer, yani rekabetlerin çoğunun **hiç adı yok**.
       * Bir gün rekabet araması istenirse sorun *"metin başka yerde"* değil
       * *"metin hiç yok"* olacak — `display_name` gibi bir sütun onu çözmez,
       * yalnızca boşluğu taşır. Bugün tablo ayrıca **seed edilmiyor**
       * (ölçüldü: `seed-sql.ts` `countries` · `competitions` · `people` ·
       * `players` dolduruyor, `rivalries` **0 satır**).
       */
      nameKey: text('name_key'),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
      /**
       * ÇİFT TEKLİĞİ — sıradan bağımsız (dosya başlığındaki gerekçe).
       *
       * `LEAST`/`GREATEST` ikisi de `IMMUTABLE`, o yüzden ifade indeksinde
       * kullanılabiliyor — `unaccent`in aksine (bkz. `search.ts`).
       */
      uniqueIndex('rivalries_pair_unique_idx').on(
        sql`least(${table.clubAId}, ${table.clubBId})`,
        sql`greatest(${table.clubAId}, ${table.clubBId})`,
      ),
    ],
  ),
);
