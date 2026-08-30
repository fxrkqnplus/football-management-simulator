/**
 * `people` — oyuncu, personel, menajer ve başkanın ORTAK kimlik tablosu.
 * `docs/spec/01-database.md` §3.1.
 *
 * Faz 4'ün ilk tablosu ve Faz 3'ün üç ileri yabancı anahtarının hedefi
 * (`federations.president_person_id` · `clubs.chairman_person_id` ·
 * `referees.person_id` — sütun ve kısıt **birlikte** 4.4'te eklenecek).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * §3.1.0 SÜTUNLARINI `people` TAŞIR, `players` TAŞIMAZ — ÖLÇÜLMÜŞ KARAR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Karar 4.0b'de verildi ve dayanağı bir sayı: `key`i **`people`** taşırsa FK
 * kuralı (`fk-policy.ts`) Faz 4'ün 20 planlanan yabancı anahtarında **20/20**
 * doğru cevap üretiyor; **`players`** taşırsa **17/20**. Sebep mekanik —
 * `key` taşıyan tablo `independent` sınıfına düşer ve ondan çıkan her FK
 * **RESTRICT** alır (§3.1.2 ③): `players` `key` taşısaydı `players.club_id`
 * `SET NULL` yerine RESTRICT, `players.person_id` CASCADE yerine RESTRICT
 * alırdı. İkisi de veri kaybettiren değil **veri donduran** cevaplar.
 *
 * Anlamı da aynı yeri gösteriyor: `spec/12` §17.4'ün `players.json` dosyası
 * `key` ve `externalIds` taşıyor, ama pakette kendi kaydı olan varlık
 * **kişidir** — aynı kişi önce oyuncu, sonra menajer olabilir. Kimliği taşıyan
 * satır o yüzden burada.
 *
 * ℹ️ `spec/12` §17.4 pakette anahtarı `player-12847` biçiminde yazıyor ve o
 * anahtar bu sütuna düşecek. **Adlandırma tutarsızlığı Faz 9'un işi** (ingest
 * eşlemesi orada yazılıyor); bugün çözülmüyor, notu 4.0b'de duruyor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `person_type` BİR DİZİ — ve dizi olması ROUND-TRIP'te BİR BOŞLUK AÇTI
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/01` bu alanı `('player'|'staff'|'manager'|'chairman')[]` yazıyor: bir
 * kişi aynı anda hem oyuncu hem menajer olabilir (oyuncu-menajer), hem personel
 * hem başkan olabilir. Tek değerli bir sütun bu gerçeği taşıyamaz.
 *
 * ⚠️ **Bu, şemanın İLK dizi sütunu** (ölçüldü: 4.3 öncesi `grep '\.array()'`
 * repoda **0 eşleşme**) ve round-trip karşılaştırması onu **göremiyordu**.
 * PostgreSQL 18.6'ya karşı ölçüldü:
 *
 * | Sütun | `data_type` | `udt_name` |
 * |---|---|---|
 * | `text[]` | `ARRAY` | `_text` |
 * | `integer[]` | `ARRAY` | `_int4` |
 *
 * `introspect.ts` yalnızca `data_type` okuyordu, yani bir sütunu `text[]`'ten
 * `integer[]`'a çeviren bir `down` **sessizce geçerdi** — 3.2b'nin *"fazla giden
 * `down`"* sınıfının dizi kardeşi. 4.3 `udt_name`i karşılaştırmaya ekledi ve
 * boşluğu **negatif bir testle** kapattı (`round-trip.itest.ts` → *"③ SESSİZ
 * bozuk down (DİZİ ELEMAN TİPİ)"*): o test `data_type`ın **değişmediğini** ve
 * farkı yalnızca `udt_name`in gösterdiğini ayrı ayrı iddia ediyor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * İKİ CHECK, İKİSİ DE §3.1.2 ②'NİN "KAPALI KÜME" AYRACINDAN
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `gender` ve `person_type` kapalı değer kümeleri, yani **sözleşme**: ayracın
 * sorusu (*"bu değeri yarın bir denge ayarı değiştirebilir mi?"*) ikisinde de
 * **hayır**. Karşılaştır: `portrait_seed` bir sayı ve CHECK almıyor.
 *
 * ⚠️ **`person_type` CHECK'i İKİ ŞEY birden iddia ediyor ve ikincisi bilinçli:**
 *
 * 1. `<@` — her eleman kapalı kümede.
 * 2. `cardinality(...) > 0` — dizi **boş olamaz**.
 *
 * İkincisi olmasaydı koruma **kısmi** kalırdı: `<@` boş diziyi kabul ediyor
 * (ölçüldü, PG 18.6) ve *"hiçbir şey olmayan bir kişi"* sessizce girerdi. G-11'in
 * dersi tam olarak buydu — kısmi bir koruma D3 yanılsaması üretir. Burada tam
 * koruma **ucuz**, o yüzden 3.5'in `rivalries` gerekçesi geçerli değil.
 *
 * ℹ️ Tekrarlar (`{'player','player'}`) bilerek **serbest**: aynı olguyu iki kez
 * yazmak yanlış bir olgu üretmez, `{}` ise üretir. Ayraç *"yanlış mı, yalnızca
 * fazlalık mı"*.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NULLABILITY — SAPMA-026'nın TÜRETME KURALI
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/01` işaretsiz yazdığı her sütun `NOT NULL` okunur; `nullable` yazdığı
 * üçü (`common_name`, `birth_city`, `portrait_asset_id`) ve `spec`in ayrıca
 * `nullable` dediği `second_nationality_country_id` gevşek.
 *
 * `portrait_seed` **`NOT NULL` ve bu bir istisna değil** — `clubs.crest_seed`
 * ile birebir aynı gerekçe: K2 gereği her rastgelelik deterministik bir tohumdan
 * gelir, yani tohum her kişi için **her zaman** üretilebilir. Eksik kalabilecek
 * bir bilgi değil.
 *
 * `birth_date` de `NOT NULL`: yaş, oyunun her hesabının girdisi (gelişim,
 * piyasa değeri, kadro kuralları). Bilinmeyen bir doğum tarihi uydurulmaz —
 * ama bilinmeyen bir doğum tarihiyle bir oyuncu **oluşturulamaz** da.
 */
import { sql } from 'drizzle-orm';
import { check, date, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

import { masterTable } from '../client/master.js';
import { countries } from './countries.js';
import { dataPackColumns, sourceCheck } from './data-pack-columns.js';

/**
 * Bir kişinin oyundaki rolleri. `spec/01` §3.1 `people.personType`.
 *
 * Kapalı küme, o yüzden CHECK'li (§3.1.2 ②). Serbest metin olsaydı `'Player'`
 * veya `'coach'` sessizce girer ve o kişi hiçbir rol sorgusunda görünmezdi.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `'referee'` FAZ 4.5'TE EKLENDİ — G-18 KAPANDI (`0008`)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * 4.4 `referees.person_id`i **`NOT NULL`** yazdı, yani artık **her hakem bir
 * `people` satırıdır** — ama kapalı küme dört değer taşıyordu ve hiçbiri hakemi
 * anlatmıyordu. `people_person_type_check` boş diziyi de reddediyor (4.3'te
 * bilerek), yani hakem satırı yazan ilk taraf bir değer **uydurmak** zorundaydı:
 * SAPMA-026'nın (*"kimsenin belirlemediği alana değer uydurma"*) tam olarak
 * yasakladığı şey. G-18 bunu 4.4'te kaydetti ve **Faz 8'e** atadı.
 *
 * ⚠️ **O ATAMA YANLIŞTI VE DAYANAĞI D7.** Faz 8'in G-18 bloğu gerekçesini
 * *"hakem verisi bu fazda geliyor (3.8'in kendi notu)"* diye yazıyordu — ve o
 * not `PROJECT_MEMORY`/ROADMAP'in kendi sesi, D7'nin *"kaynak değildir"* dediği
 * şey. Faz 8'in **gerçek** ingest listesi ölçüldü: ülke · lig · kupa · UEFA ·
 * kulüp verisi · görseller · rekabetler · ülke kural setleri · transfer
 * pencereleri. **Hakem yok.** Faz 9 yalnızca oyuncu. Yani boşluk, onu
 * kapatamayacak bir faza atanmıştı.
 *
 * **Üç gerekçeyle burada kapatıldı (kapsam kayması değil):**
 * ① `people` **bu fazın kendi tablosu** (4.3'te yazıldı) ve kapalı küme **bu
 *   fazda** eksik ölçüldü — kendi tablonun kümesini tamamlamak faza aittir.
 *   Emsal: 3.6 `club_kits.asset_id`'yi `spec/01`'de olmadığı hâlde ekledi,
 *   gerekçesini yazdı ve yeni bir SAPMA açmadı.
 * ② **Bir yalan zaten repodaydı:** `integration/fixtures.ts` hakem kişilerine
 *   `['player']` yazıyordu ve 4.5–4.11 boyunca her yeni hakem fixture'ı bunu
 *   **kopyalayacaktı**.
 * ③ Atanan sahip işi yapamıyordu (yukarıdaki ölçüm).
 *
 * G-18'in üç seçeneğinden **①** uygulandı (kümeye `'referee'`); **③** (spec
 * başlığının hakemi kapsaması) onun doğal sonucu olarak aynı alt görevde
 * yapıldı — küme hakemi tanıyorsa tanım da tanımalı. **②** (hakemler `people`
 * taşımaz) reddedildi: 4.4'ün üç ileri FK kararını geri alır ve hakemleri
 * yeniden isimsiz bırakırdı.
 *
 * ⚠️ **AYRI BİR BOŞLUK AÇILDI — G-19:** küme artık hakemi ifade edebiliyor, ama
 * **hiçbir faz hakem verisini ingest etmiyor** (ROADMAP'in tüm hakem atıfları
 * fazlarına göre çıkarıldı: 23/26/29/45 **tüketici**, 46 var olan kadroyu
 * **bakım** yapıyor, 8 ve 9'un ingest listelerinde hakem yok). `referees`
 * 3.6'dan beri `key`/`source`/`external_ids` taşıyor — yani bir **paket
 * varlığı**, ama onu dolduran hat yok. SAPMA-008'in birebir sınıfı.
 */
export const PERSON_TYPES = ['player', 'staff', 'manager', 'chairman', 'referee'] as const;

export type PersonType = (typeof PERSON_TYPES)[number];

/** `spec/01` §3.1 `people.gender`. Kapalı küme → CHECK. */
export const GENDERS = ['male', 'female'] as const;

export type Gender = (typeof GENDERS)[number];

const literals = (values: readonly string[]): string =>
  values.map((value) => `'${value}'`).join(', ');

export const people = masterTable(
  pgTable(
    'people',
    {
      id: serial('id').primaryKey(),
      ...dataPackColumns(),
      firstName: text('first_name').notNull(),
      lastName: text('last_name').notNull(),
      /** "Vinicius Jr" — resmî adın kullanılmadığı durumlar. `null` = kullanılmıyor. */
      commonName: text('common_name'),
      /**
       * ⚠️ `mode: 'string'` AÇIKÇA yazıldı — §3.1.2 ⑥'nın (`bigint` modu)
       * kardeş vakası: iki mod da **aynı DDL'i** üretiyor, seçim yalnızca JS
       * tarafındaki eşlemeyi değiştiriyor. `mode: 'date'` bir JS `Date`, yani
       * bir **an** döner ve doğum tarihi bir an değil bir **takvim günüdür**;
       * saat dilimi kaydırması onu bir gün öteye taşıyabilir. `'string'`
       * (`YYYY-MM-DD`) tam olarak saklanan şeyi döndürüyor.
       */
      birthDate: date('birth_date', { mode: 'string' }).notNull(),
      /**
       * `ON DELETE RESTRICT` — bağımsız varlık kuralı (§3.1.2 ③): `people`
       * kendi `key`ini taşıyor, yani `independent`. Bir ülke silinirken
       * vatandaşları sessizce yok edilmemeli.
       */
      nationalityCountryId: integer('nationality_country_id')
        .notNull()
        .references(() => countries.id, { onDelete: 'restrict' }),
      /**
       * İkinci uyruk — çifte vatandaşlık (GBE ve yabancı kotası hesabının
       * girdisi, `spec/07`). `null` = tek uyruklu.
       *
       * ⚠️ **NULLABLE AMA `SET NULL` ALMIYOR — ve bu kuralın sırasının kanıtı.**
       * `fk-policy.ts` ③ (*"bütün sütunlar nullable → SET NULL"*) ②'nin
       * (*"kaynak `independent` → RESTRICT"*) **altında** duruyor; `people`
       * `independent` olduğu için bu FK ②'de duruyor ve RESTRICT alıyor.
       * Sezgi tersini söylerdi. Aynı sınıfın Faz 3'teki üç örneği:
       * `competitions.country_id`, `clubs.competition_id`, `clubs.stadium_id`.
       */
      secondNationalityCountryId: integer('second_nationality_country_id').references(
        () => countries.id,
        { onDelete: 'restrict' },
      ),
      /** `null` = bilinmiyor. Uydurulmuş bir şehir, eksik bir şehirden kötüdür (SAPMA-026 ③). */
      birthCity: text('birth_city'),
      /** `null` → portre prosedürel üretilir (K9), tohumu aşağıdaki sütun. */
      portraitAssetId: text('portrait_asset_id'),
      /** Prosedürel portre tohumu. `NOT NULL` — gerekçe dosya başlığında (K2). */
      portraitSeed: integer('portrait_seed').notNull(),
      gender: text('gender').$type<Gender>().notNull(),
      /**
       * Kişinin rolleri — **en az bir** eleman, hepsi `PERSON_TYPES`ten.
       * Şemanın ilk dizi sütunu; round-trip sonucu dosya başlığında.
       */
      personType: text('person_type').$type<PersonType[]>().array().notNull(),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
      sourceCheck('people_source_check', table.source),
      check('people_gender_check', sql`${table.gender} IN (${sql.raw(literals(GENDERS))})`),
      /**
       * İki iddia tek kısıtta: dizi **boş değil** ve her elemanı kapalı kümede.
       * İfade `PERSON_TYPES`ten türetiliyor — elle yazılsaydı tip ile kısıt
       * ayrışabilirdi (`data-pack-columns.ts`in `sourceCheck`iyle aynı ilke).
       */
      check(
        'people_person_type_check',
        sql`cardinality(${table.personType}) > 0 AND ${table.personType} <@ ARRAY[${sql.raw(literals(PERSON_TYPES))}]::text[]`,
      ),
    ],
  ),
);
