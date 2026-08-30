/**
 * `referees` — maç hakemleri ve altı davranış niteliği.
 * `docs/spec/01-database.md` §3.1.
 *
 * **Tüketicisi somut, tablo bir temenni değil (D3):** `docs/ROADMAP.md` **Faz 26**
 * (bağlam katmanı) altı niteliği **adıyla** kullanıyor — kart olasılığı hakem
 * `Strictness`ine, VAR kararının değişme olasılığı `Consistency`ye, ev sahibi
 * avantajı `Home Bias`e bağlanıyor. **Faz 46** rollover adım 11 hakem listesini
 * her sezon yeniliyor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * VERİ PAKETİ SÜTUNLARINI TAŞIYOR — ama pakette bir `referees.json` YOK
 * ────────────────────────────────────────────────────────────────────────────
 *
 * §3.1.0 `referees`i `key` · `source` · `external_ids` **taşıyanlar** listesine
 * koyuyor ve bu, `spec/12` §17.2'nin dosya listesinde `referees.json`
 * **bulunmamasıyla çelişmiyor** — çelişkiyi arayıp bulamamak da bir ölçümdür:
 *
 * §3.1.0'ın kendi gerekçesi şunu söylüyor: *"`key` neden `NOT NULL`:
 * `DATA_MODE=clean`'de her varlık prosedürel üretiliyor ve **yine de
 * adreslenebilir olmak zorunda**."* Yani anahtar pakette bulunmanın değil,
 * **adreslenebilirliğin** koşulu. Hakemler v1'de prosedürel üretiliyor
 * (`source = 'procedural'`) ve `SeededRng` deterministik bir anahtar veriyor
 * (K2); bir paket ileride `referees.json` getirirse eşleme yolu **zaten hazır**.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `person_id` 4.4'TE GELDİ — ÜÇÜNÜN TEK `NOT NULL`U VE TEK GERÇEK RİSKİ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Sütun Faz 3'te bilerek yazılmadı; 4.4 onu ve FK'sını **birlikte** ekledi
 * (`0006`). Hakemler artık isimli — bedeli ROADMAP'te yazılıydı (*"ilk
 * görüntülendikleri yer Faz 26"*).
 *
 * ⚠️ **`NOT NULL` — ve üç ileri FK içinde tek olan bu.** `spec/01` sütunu
 * işaretsiz yazıyor (`personId FK`, `?` veya `nullable` yok) ve SAPMA-026'nın
 * türetme kuralı işaretsiz sütunu `NOT NULL` okur. Anlamı da aynı yeri
 * gösteriyor: bir hakem **bir kişidir**, kişisi bilinmeyen bir hakem satırı
 * yoktur. Karşılaştır: `federations.president_person_id` ve
 * `clubs.chairman_person_id` `spec/01`'de açıkça nullable — *"başkanı
 * bilinmiyor"* gerçek bir durum, *"hakemin kimliği bilinmiyor"* değil.
 *
 * ⚠️ **BUNUN ÖLÇÜLMÜŞ BİR BEDELİ VAR — `ADD COLUMN … NOT NULL` DOLU BİR TABLOYA
 * UYGULANAMAZ.** `0006`nın `down`u sütunu düşürüyor ama **satırları düşürmüyor**;
 * `up` yeniden koştuğunda var olan hakem satırlarına değer bulamıyor ve
 * `column "person_id" of relation "referees" contains null values` ile patlıyor.
 * Bu, `countries.source`un 0001'de yarattığı durumun **birebir aynısı** ve orada
 * verilen karar burada da geçerli: davranış **gürültülü** (sessizce yanlış veri
 * değil, açık bir hata) ve `round-trip.itest.ts` onu kendi testiyle sabitliyor —
 * sonraki bir oturum bunu yeni bir regresyon sanmasın.
 *
 * ℹ️ **`UNIQUE` YOK — ve bu bir unutma değil.** `spec/01` `players`ı
 * `personId FK UNIQUE` yazıyor, `referees`i yalnızca `personId FK`. Kimsenin
 * belirlemediği bir kısıt uydurulmuyor (SAPMA-026).
 *
 * ⚠️ **AÇIK BOŞLUK (G-18): bir hakemin `people` satırı hangi `person_type`ı
 * taşır?** Kapalı küme `player | staff | manager | chairman` ve hiçbiri hakemi
 * anlatmıyor; `person_type` CHECK'i ise boş diziyi de reddediyor. Yani bu FK,
 * hakem satırı yazan ilk tarafı bir değer **uydurmaya** zorluyor. Boşluk 4.4'te
 * kaydedildi ve hakem verisinin geldiği faza atandı; 4.4 kümeyi değiştirmiyor
 * (K12 — kayıt yeter, uygulama değil).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ALTI NİTELİK 1-20 — CHECK YOK
 * ────────────────────────────────────────────────────────────────────────────
 *
 * §3.1.2 ②: sayısal aralık **kalibrasyondur**, sözleşme değil — Faz 26 denge
 * ayarı bu ölçekleri yeniden düzenleyebilir. Aralık denetiminin yeri Faz 11
 * doğrulayıcısı (`pnpm validate:world`). Karşılaştır: aynı dosyadaki
 * `kit_templates.color_slots` **CHECK alıyor**, çünkü orası bir aralık değil
 * kapalı bir küme.
 */
import { integer, pgTable, serial, smallint, timestamp } from 'drizzle-orm/pg-core';

import { masterTable } from '../client/master.js';
import { countries } from './countries.js';
import { dataPackColumns, sourceCheck } from './data-pack-columns.js';
import { people } from './people.js';

export const referees = masterTable(
  pgTable(
    'referees',
    {
      id: serial('id').primaryKey(),
      ...dataPackColumns(),
      /**
       * `ON DELETE RESTRICT` — bağımsız varlık kuralı (§3.1.2 ③). Hakem kendi
       * `key`ini taşıyor; ülkesi silinince sessizce yok olmamalı.
       */
      countryId: integer('country_id')
        .notNull()
        .references(() => countries.id, { onDelete: 'restrict' }),
      /** 1-20 — kart eğilimi. Aralık denetimi Faz 11'de (bkz. dosya başlığı). */
      strictness: smallint('strictness').notNull(),
      /** 1-20 — faul toleransı. */
      foulTolerance: smallint('foul_tolerance').notNull(),
      /** 1-20 — ev sahibi kayırma eğilimi. */
      homeBias: smallint('home_bias').notNull(),
      /** 1-20 — karar tutarlılığı; VAR kararının değişme olasılığını etkiliyor (Faz 26). */
      consistency: smallint('consistency').notNull(),
      /** 1-20 — avantaj oynatma eğilimi. */
      advantagePlay: smallint('advantage_play').notNull(),
      /** 1-20 — büyük maç tecrübesi. */
      bigGameExperience: smallint('big_game_experience').notNull(),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
      /**
       * Hakemin kimliği. `NOT NULL` — gerekçesi ve ölçülmüş bedeli dosya
       * başlığında.
       *
       * ⚠️ **SÜTUN SONDA — §3.1.2 ④.** Nöbetçisi `round-trip.itest.ts`teki
       * *"referees fiziksel sütun sırası"* testi (3.6'da tam bu gün için yazıldı).
       *
       * `ON DELETE RESTRICT` — kural ② (kaynak `independent`). `referees` kendi
       * `key`ini taşıyor; kişisi silinirken hakem satırı sessizce yok
       * edilmemeli, silen taraf onu **ele almalı**. Ve `SET NULL` burada zaten
       * uygulanamazdı: sütun `NOT NULL`.
       */
      personId: integer('person_id')
        .notNull()
        .references(() => people.id, { onDelete: 'restrict' }),
    },
    (table) => [sourceCheck('referees_source_check', table.source)],
  ),
);
