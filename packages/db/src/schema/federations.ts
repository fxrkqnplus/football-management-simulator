/**
 * `federations` — ülke futbol federasyonu. `docs/spec/01-database.md` §3.1.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * VERİ PAKETİ SÜTUNLARINI TAŞIMIYOR — ve bu bir eksiklik DEĞİL
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/01` §3.1.0 `key` · `source` · `external_ids` üçlüsünü **pakette kendi
 * kaydı olarak görünen** varlıklara veriyor; `federations` orada açıkça
 * **taşımayanlar** listesinde. Sebep: federasyon bir **uydu** — kimliği
 * sahibinin kimliğidir ve ona `country_id` üzerinden erişilir. Kendi anahtarı
 * olsaydı, `tff` ile `turkiye` arasında hiçbir zaman kullanılmayan ikinci bir
 * eşleme yolu doğardı.
 *
 * Entegrasyon testi bunu **iddia ediyor**: `federations`ın sütun listesinde
 * `key`/`source`/`external_ids` yok. Yazılı bir sözleşme, sınanmadığı sürece
 * bir temennidir.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `president_person_id` 4.4'TE GELDİ — ve bu tablo artık İKİ FK'nın iki FARKLI
 * cevabını aynı anda taşıyor
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Sütun Faz 3'te bilerek yazılmadı: `people` Faz 4'te doğuyor ve kısıtsız bir
 * sütun Faz 3'ün 3. kabul kriterini (*"tüm yabancı anahtarlar tanımlı"*)
 * **görünürde** sağlayıp gerçekte delerdi. 4.4 sütunu ve kısıtı **birlikte**
 * ekledi (`0006`).
 *
 * ⚠️ **Bu, `fk-policy.ts`in SAHİPLİK ile REFERANSI aynı tablo içinde ayırdığının
 * ilk canlı kanıtı:**
 *
 * | FK | Kural adımı | Davranış | Ne diyor |
 * |---|---|---|---|
 * | `country_id` (NOT NULL) | ④ kaynak uydu | **CASCADE** | *sahiplik* — federasyonun kimliği ülkenin kimliğidir |
 * | `president_person_id` (nullable) | ③ bütün sütunlar nullable | **SET NULL** | *referans* — başkan gider, federasyon kalır |
 *
 * İkisi de aynı uydu tablodan çıkıyor ve **farklı** cevap alıyorlar; ayracı
 * nullability. Bir federasyon başkanı `people`'dan silindiğinde federasyonun da
 * silinmesi (CASCADE) veya silmenin engellenmesi (RESTRICT) yanlış olurdu —
 * doğru sonuç *"başkanı bilinmiyor"*. `fk-policy.ts` ③'ün kendi ifadesiyle: bir
 * uydudan çıkan nullable FK **sahiplik değil referanstır**.
 *
 * ℹ️ Kural bu üç ileri FK için **koşturuldu, hafızadan tahmin edilmedi**: 4.3'ün
 * raporu *"üçü de RESTRICT alacak"* demişti ve yanlıştı — o tahmin kaynağın
 * değil **hedefin** sınıfına bakıyordu. `people`'ın `independent` olması bu
 * FK'lar hakkında hiçbir şey söylemiyor; belirleyici olan **kaynağın** sınıfı.
 */
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

import { masterTable } from '../client/master.js';
import { countries } from './countries.js';
import { people } from './people.js';

export const federations = masterTable(
  pgTable('federations', {
    id: serial('id').primaryKey(),
    /**
     * `ON DELETE CASCADE` — uydu tablo kuralı.
     *
     * Federasyonun kimliği ülkenin kimliğidir; ülke veri paketinden çıkarsa
     * federasyonun tek başına anlamı kalmaz. Karşılaştır: `competitions.country_id`
     * **RESTRICT** alıyor, çünkü bir yarışma kendi `key`ini taşıyan bağımsız bir
     * varlık ve sessizce silinmemeli.
     */
    countryId: integer('country_id')
      .notNull()
      .references(() => countries.id, { onDelete: 'cascade' }),
    /**
     * Federasyonun kendi adı — `name_key` DEĞİL.
     *
     * `spec/01` bu alanı `name` yazıyor ve bu K5'i ihlal etmiyor: "Türkiye Futbol
     * Federasyonu" bir **özel isimdir**, arayüz metni değil. Çevrilecek bir şey yok.
     */
    name: text('name').notNull(),
    /** `null` = bilinmiyor. Uydurulmuş bir yıl, eksik bir yıldan kötüdür. */
    foundedYear: integer('founded_year'),
    /** `null` → logo prosedürel üretilir (K9). */
    assetId: text('asset_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    /**
     * Federasyon başkanı. `null` = bilinmiyor (`spec/01`: `presidentPersonId FK?`).
     *
     * ⚠️ **SÜTUN SONDA VE BU ZORUNLU — §3.1.2 ④.** `ALTER TABLE ADD COLUMN`
     * sütunu tablonun **fiziksel** sonuna ekliyor; `drizzle-kit` ise snapshot'a
     * **TS tanımındaki** sırayı yazıyor. Mantıksal yerine (`asset_id`'nin yanına)
     * yazılsaydı snapshot ↔ gerçek şema karşılaştırması kırılırdı.
     * `created_at`/`updated_at`'ın ortada kalması bunun bilinen bedeli.
     *
     * `ON DELETE SET NULL` — gerekçesi dosya başlığındaki tabloda.
     */
    presidentPersonId: integer('president_person_id').references(() => people.id, {
      onDelete: 'set null',
    }),
  }),
);
