/**
 * `competitions` — lig, kupa ve kıta turnuvalarının ORTAK tablosu.
 * `docs/spec/01-database.md` §3.1.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `rules` NEDEN AYRI BİR TABLO DEĞİL
 * ────────────────────────────────────────────────────────────────────────────
 *
 * ROADMAP'in ilk hâli bir `competition_rules` tablosu istiyordu; Faz 3.1'de
 * elendi (SAPMA-021): ilişki 1:1 ve iki taraf **her zaman birlikte** okunuyor,
 * yani ayrı tablo her sorguya bir JOIN ekler ve karşılığında hiçbir şey
 * kazandırmaz. Alan bir `jsonb` ve `competitionRulesSchema` ile doğrulanıyor.
 *
 * ⚠️ **`jsonb` doğrulamayı KENDİ BAŞINA yapmaz.** Postgres yalnızca "geçerli
 * JSON mu" diye bakar; `maxForeing: 14` yazan bir paket veritabanı seviyesinde
 * sorunsuz girer. Sözleşmeyi tutan şey Zod şeması ve onu **çağıran** taraftır
 * (Faz 3.8 seed, Faz 11 veri editörü). `$type<CompetitionRules>()` yalnızca
 * okuma tarafını tipliyor — çalışma zamanı güvencesi değil, o yüzden yazan her
 * yol `competitionRulesSchema.parse()`ten geçmek zorunda.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `season_year` YOK — ve olmayacak
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/01` §3.1.1: sezon bir tablo değil, tüketen tablolardaki skaler bir
 * `seasonYear` sütunudur (`matches`, `card_counters`, `player_stats_history`).
 * `competition_seasons` Faz 3.1'de tarandı, **hiçbir tüketicisi bulunamadı** ve
 * açılmadı (SAPMA-021).
 */
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

import { masterTable } from '../client/master.js';
import type { CompetitionRules } from './competition-rules.js';
import { countries } from './countries.js';
import { dataPackColumns, sourceCheck } from './data-pack-columns.js';
import { sqlLiterals } from './sql-literals.js';

/**
 * Yarışma türü — `spec/01` §3.1'de **kapalı** bir küme olarak yazılı, o yüzden
 * CHECK'li. Serbest metin olsaydı `'leauge'` yazım hatası sessizce girer ve
 * o yarışma hiçbir lig sorgusunda görünmezdi.
 */
export const COMPETITION_TYPES = [
  'league',
  'domestic_cup',
  'league_cup',
  'super_cup',
  'continental',
] as const;

export type CompetitionType = (typeof COMPETITION_TYPES)[number];

export const competitions = masterTable(
  pgTable(
    'competitions',
    {
      id: serial('id').primaryKey(),
      ...dataPackColumns(),
      /**
       * `null` = uluslararası (UCL, UEL) — `spec/01` §3.1'de açıkça nullable.
       *
       * `ON DELETE RESTRICT` — bağımsız varlık kuralı. Yarışma kendi `key`ini
       * taşıyor ve pakette kendi kaydı var; ülkesi silinince sessizce yok olmamalı,
       * silen tarafın önce yarışmayı ele alması gerekir. Karşılaştır:
       * `federations.country_id` **CASCADE** alıyor (uydu).
       */
      countryId: integer('country_id').references(() => countries.id, { onDelete: 'restrict' }),
      /** `TUR_SUPERLIG`, `UEFA_UCL` — insan tarafından okunabilir sabit kimlik. */
      code: text('code').notNull().unique(),
      /** i18n anahtarı — görünen ad koda gömülmez (K5). */
      nameKey: text('name_key').notNull(),
      type: text('type').$type<CompetitionType>().notNull(),
      /**
       * Lig kademesi (1 = en üst). `null` = kademesiz.
       *
       * Kupa ve kıta turnuvalarının kademesi **yoktur**; `NOT NULL` olsaydı her
       * kupaya uydurma bir `1` yazmak gerekirdi ve o değeri okuyan her sorgu
       * yanlış cevap verirdi. Kayıt: SAPMA-026.
       */
      tier: integer('tier'),
      /** 0-200. Aralık denetimi Faz 11 doğrulayıcısında — CHECK değil (bkz. dosya sonu). */
      reputation: integer('reputation').notNull(),
      /** `null` → logo prosedürel üretilir (K9). */
      logoAssetId: text('logo_asset_id'),
      /** `CompetitionRules` — Zod ile doğrulanır, tip `z.infer`den. */
      rules: jsonb('rules').$type<CompetitionRules>().notNull(),
      /** 1-12. Kuzey yarımküre ligleri 8 (Ağustos), MLS 2 (Şubat). */
      seasonStartMonth: smallint('season_start_month').notNull(),
      seasonEndMonth: smallint('season_end_month').notNull(),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
      sourceCheck('competitions_source_check', table.source),
      check(
        'competitions_type_check',
        sql`${table.type} IN (${sql.raw(sqlLiterals(COMPETITION_TYPES))})`,
      ),
      /**
       * FK sütunu — PostgreSQL onu otomatik indekslemiyor. Tüketicisi bugün var:
       * `countries` üzerindeki `ON DELETE RESTRICT` denetimi her ülke silme
       * girişiminde `competitions`ı tarıyor.
       *
       * ⚠️ **Bu tabloya trigram indeksi KONMADI ve sebebi bir boşluk:** görünen
       * ad `name_key`, yani bir **i18n anahtarı** (`competition.tur.superlig`).
       * Onun üzerinde Türkçe arama anlamsız. ROADMAP Faz 17 global aramayı
       * *"lig + turnuva"* için de istiyor → `docs/SPEC-COVERAGE-GAPS.md` **G-13**.
       *
       * ─────────────────────────────────────────────────────────────────────
       * G-13 — FAZ 5'İN PAYI KARARA BAĞLANDI (5.8). ŞEMA DEĞİŞMEDİ.
       * ─────────────────────────────────────────────────────────────────────
       *
       * **KARAR: çeviri kaynağı TEK yerde yaşar — `apps/web/src/locales/tr/*.json`.
       * Veritabanı ANAHTARI taşır, görünen METNİ taşımaz.**
       *
       * Bu bir tercih değil bugünkü mimarinin adının konması: ölçüldü (5.8),
       * `Süper Lig` / `Premier League` gibi adlar **yalnızca** `common.json`da
       * (11 anahtar) — başka hiçbir üretim kaynağında yok, `docs/glossary.md`
       * bile taşımıyor (özel ad bir terim değildir). 5.6 aynı mimariyi
       * `i18n-dynamic-keys.ts`te `common:competition.` ön ekiyle **beyan
       * etmişti**; bu satır o beyanın veritabanı tarafındaki karşılığı.
       *
       * **FAZ 17'NİN ÜÇ SEÇENEĞİ — hepsi MÜMKÜN, ikisi ŞARTLI:**
       *
       *   ① **İstemci tarafı arama** (çeviriler üzerinde) — **şartsız**.
       *      Tek kaynak kararıyla tutarlı, kopya yok, indeks yok, migration
       *      yok. Ölçüldü (5.3): çeviriler **statik paketleniyor**, yani
       *      istemcide zaten hepsi var. Bedeli: arama yükü istemcide.
       *   ② **Çevrilmiş adı taşıyan arama tablosu** — mümkün, **AMA** o metin
       *      **türetilmiş** olmak zorunda (locale'den üretilen bir projeksiyon)
       *      ve ayrışmayı önleyen **koşan bir kontrol** ister. Elle yazılan bir
       *      kopya bu karara aykırıdır: `Süper Lig` iki yerde durur ve iki
       *      kopya bir gün ayrışır.
       *   ③ **`display_name` sütunu** — ②'nin şartı, **artı** master tabloda
       *      bir migration (Faz 12'nin zeminini etkiler) ve `docs/spec/01`
       *      güncellemesi.
       *
       * ⚠️ **5.8 HANGİSİNİN KULLANILACAĞINI SEÇMEZ — o Faz 17'nin işi** (K12).
       * Burada karara bağlanan şey **verinin nerede yaşadığı**; Faz 17 hayatta
       * kalan seçenekler arasından **aramanın nasıl uygulanacağını** seçer ve
       * gerekçesini kendi kabul kriterine yazar.
       *
       * ℹ️ **G-13 satırı KAPATILMADI** ve bu bilinçli: satır **iki** faza
       * atanmış, `gaps:check` kapalı bir satırı **tamamen atlıyor** — kapatmak
       * Faz 17'nin yarısını kalıcı olarak denetimsiz bırakırdı.
       */
      index('competitions_country_id_idx').on(table.countryId),
    ],
  ),
);

/**
 * ⚠️ SAYISAL ARALIKLAR NEDEN CHECK ALMIYOR — bilinçli sınır.
 *
 * `spec/01` `reputation`ı `0-200`, `countries.footballLevel`i `1-100` diye
 * **yorumda** yazıyor. Kapalı değer kümeleri (`type`, `source`,
 * `work_permit_rule_key`) CHECK aldı ama bu aralıklar almadı, ve ayrım kasıtlı:
 *
 * - Bir değer kümesi **sözleşmedir** — `'leauge'` her zaman ve her bağlamda
 *   hatalıdır, yarın da hatalı olacaktır.
 * - Bir aralık **kalibrasyondur** — `docs/ROADMAP.md` Faz 30 (piyasa değeri) ve
 *   Faz 23 (denge ayarı) bu ölçekleri yeniden ayarlayabilir. Migration'a
 *   çakılmış bir aralık, o gün `ALTER TABLE ... DROP CONSTRAINT` gerektirirdi.
 *
 * Aralık denetiminin yeri **Faz 11 veri doğrulayıcısı** (`pnpm validate:world`).
 * Bu bir borç değil, konum kararıdır — kısıtın kaybolduğu bir yer yok.
 */
