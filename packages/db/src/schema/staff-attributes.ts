/**
 * `staff_attributes` — 16 personel niteliği. `docs/spec/01-database.md` §3.1.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * 16 SAYISI `spec/01`'DEN SAYILDI — VE `spec/02`'DE HİÇ YOK (ölçüldü)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Oyuncu niteliklerinin envanteri `spec/02` §4.1'den sayılmıştı (47 + 10) ve
 * refleks burada da oraya bakmak olurdu. **Ölçüm bunu çürüttü:**
 * `docs/spec/02-attributes.md` içinde `staff` / `manager` → **0 eşleşme**
 * (208 satırın tamamı tarandı). Personel ve menajer niteliklerinin tek kaynağı
 * `spec/01` §3.1 *"Personel ve Menajerler"*.
 *
 * ⚠️ **Ders 4.5'inkinin kardeşi:** *"kaynaktan say"* yetmiyor, **hangi kaynak**
 * sorusu da ölçülüyor. Bir devir notunun ya da planın *"`spec/02`'den say"*
 * demesi, sayının orada olduğunu göstermez (**D7**).
 *
 * Envanter burada bir **sayı** olarak değil bir **liste** olarak yaşıyor
 * (`STAFF_ATTRIBUTES`); `staff-attributes.test.ts` onu tablonun gerçek
 * sütunlarıyla **birebir** karşılaştırıyor — üç katmanlı iddia: sabit → TS
 * alanı → katalog sütunu.
 *
 * ℹ️ **KATEGORİ YOK — ve bu da ölçüldü.** `player_attributes` niteliklerini dört
 * kategoriye ayırıyor (`VISIBLE_ATTRIBUTES` bir nesne) ve toplamın yanında alt
 * sayılar da iddia ediliyor, çünkü *"bir kategori toplamı, kategoriler arası
 * kaymayı göstermez"*. `spec/01` personel niteliklerini **düz bir liste** olarak
 * yazıyor, yani ayrılacak kategori yok; `HIDDEN_ATTRIBUTES`in düz biçimi
 * kullanıldı.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `staff_id` PK **VE** FK — AYRAÇ KOŞTURULDU, KARDEŞ TABLODAN KOPYALANMADI
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Ayraç (4.3'te ölçülebilir hâle geldi): **tabloya GELEN yabancı anahtar
 * sayısı.** `spec/01` tamamında arandı:
 *
 * | Arama | Eşleşme |
 * |---|---|
 * | `staff_attributes` / `staffAttributes` | **1** — yalnızca kendi tanımı (satır 705) |
 * | `staffAttributeId` / `staff_attribute_id` | **0** |
 *
 * → gelen FK **0** → **PK = FK**. Ayrı bir `serial id` ikinci bir kimlik yolu
 * açar ve aynı personel için iki nitelik satırı mümkün olurdu.
 *
 * ⚠️ **`spec/01`'in `staffId PK FK` yazımı bir İDDİADIR, ölçüm değil** — ayraç
 * yine de koşturuldu (D7). 4.5'in tuzağı da hatırlandı: **tüketici olmak, gelen
 * FK olmakla aynı şey değil**; bir sorgu bu tabloyu okuyabilir, kimliğini
 * referans almadan.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ON ALTI SÜTUNUN HİÇBİRİ CHECK ALMIYOR (SAPMA-028)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * §3.1.2 ②: sayısal aralık **kalibrasyondur**, sözleşme değil. `spec/01` bu
 * sütunları `// 1-20` diye yazıyor — yani tam olarak 4.5'te 57 nitelik sütunu
 * için verilen kararın aynısı, ve 3.6'da altı hakem niteliğinin aldığı karar.
 * Faz 37 personel etkinliğini kalibre edecek; migration'a çakılmış bir aralık
 * o gün bir `DROP CONSTRAINT` isterdi.
 *
 * Aralık denetiminin yeri **Faz 11** (`pnpm validate:world`).
 *
 * ⚠️ Kısıtın **yokluğu** bir iddiadır ve katalog tarafında koşuyor: bir birim
 * testi Postgres'e soru soramaz (2.3b), o yüzden `pg_constraint`ten okuyan
 * negatif iddia `schema-constraints.itest.ts`te. *"Kısıt eklemeyi unuttuk"* ile
 * *"kısıt bilerek konmadı"* aynı şemayı üretir; ayıran tek şey koşan bir iddia.
 */
import { integer, pgTable, smallint, timestamp } from 'drizzle-orm/pg-core';

import { masterTable } from '../client/master.js';
import { staff } from './staff.js';

/**
 * 16 personel niteliğinin envanteri — `spec/01` §3.1 `staff_attributes`
 * satırlarından **sayılarak** alındı (`spec/02`'de yok, ölçüldü).
 *
 * Sıra `spec/01`'in yazdığı sıra. Kod adları camelCase; veritabanı sütun adları
 * snake_case ve onlar **ayrı** bir iddiada katalogdan okunarak sınanıyor.
 */
export const STAFF_ATTRIBUTES = [
  'attacking',
  'defending',
  'fitness',
  'goalkeeping',
  'technical',
  'tactical',
  'motivating',
  'discipline',
  'judgingAbility',
  'judgingPotential',
  'physiotherapy',
  'sportsScience',
  'scoutingNetwork',
  'adaptability',
  'workingWithYoungsters',
  'negotiating',
] as const;

export type StaffAttribute = (typeof STAFF_ATTRIBUTES)[number];

export const staffAttributes = masterTable(
  pgTable('staff_attributes', {
    /** 1:1 — PK **ve** FK. Ayraç ve ölçümü dosya başlığında. */
    staffId: integer('staff_id')
      .primaryKey()
      .references(() => staff.id, { onDelete: 'cascade' }),

    /** Hücum antrenmanı etkinliği. */
    attacking: smallint('attacking').notNull(),
    /** Savunma antrenmanı etkinliği. */
    defending: smallint('defending').notNull(),
    /** Kondisyon antrenmanı etkinliği. */
    fitness: smallint('fitness').notNull(),
    /** Kaleci antrenmanı etkinliği. */
    goalkeeping: smallint('goalkeeping').notNull(),
    /** Teknik antrenman etkinliği. */
    technical: smallint('technical').notNull(),
    /** Taktik antrenman etkinliği. */
    tactical: smallint('tactical').notNull(),
    /** Motivasyon — moral etkisi (Faz 33). */
    motivating: smallint('motivating').notNull(),
    /** Disiplin — kadro yönetimi etkisi. */
    discipline: smallint('discipline').notNull(),
    /** Mevcut yeteneği değerlendirme — gözlemci raporunun doğruluğu (Faz 31). */
    judgingAbility: smallint('judging_ability').notNull(),
    /** Potansiyeli değerlendirme — PA bandının darlığı (Faz 31). */
    judgingPotential: smallint('judging_potential').notNull(),
    /** Fizyoterapi — sakatlık iyileşme süresi (Faz 39). */
    physiotherapy: smallint('physiotherapy').notNull(),
    /** Spor bilimi — sakatlık önleme ve yüklenme yönetimi (Faz 39). */
    sportsScience: smallint('sports_science').notNull(),
    /** Gözlemci ağı — kapsanan bölge genişliği (Faz 31). */
    scoutingNetwork: smallint('scouting_network').notNull(),
    /** Uyum — yeni kulüp/ülkeye alışma (Faz 34'ün personel tarafı). */
    adaptability: smallint('adaptability').notNull(),
    /** Gençlerle çalışma — altyapı gelişim çarpanı (Faz 40). */
    workingWithYoungsters: smallint('working_with_youngsters').notNull(),
    /** Pazarlık — sözleşme görüşmelerindeki etkinlik (Faz 32). */
    negotiating: smallint('negotiating').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  }),
);
