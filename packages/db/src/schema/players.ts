/**
 * `players` — bir kişinin OYUNCU kaydı. `docs/spec/01-database.md` §3.1.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ BU TABLO FAZ 3'ÜN 1:1 KURALINA UYMUYOR — ve gerekçesi ÖLÇÜLDÜ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Faz 3.5 şunu karara bağlamıştı: *"1:1 uydularda `club_id` hem PK hem FK —
 * ayrı bir `serial id` **ikinci bir kimlik yolu** açardı."* (`club_facilities`,
 * `club_finances_base`). `spec/01` `players`e bunun tersini veriyor:
 * **`id serial PK` + `person_id UNIQUE FK`**, yani iki kimlik yolu.
 *
 * **Bir kararı kopyalamadan önce gerekçesinin hâlâ geçerli olduğu sorulur.**
 * Soruldu ve ayraç ölçülebilir çıktı — **tabloya GELEN yabancı anahtar sayısı**:
 *
 * | Tablo | Ona bakan tablo | Sonuç |
 * |---|---|---|
 * | `club_facilities` | **0** (canlı katalogdan ölçüldü) | Kimliği yalnızca `clubs`a bağlanmak için var → ayrı `serial` saf fazlalık |
 * | `players` | **13** — 5 master (`player_attributes`, `player_hidden_attributes`, `player_positions`, `player_traits`, `player_stats_history`) + 8 save (`spec/01` §3.2: `player_state`, `transfers`, `transfer_offers`, `match_player_stats`, `injuries`, `player_season_stats`, `card_counters`, …) | `players.id` **taşıyıcı bir kimlik** |
 *
 * Yani 3.5'in gerekçesi *"kimse ona bakmıyor"* varsayımına dayanıyordu ve o
 * varsayım burada **yanlış**. `spec/01` on üç yerde `playerId` yazıyor,
 * `personId` yazmıyor — PK'yi `person_id` yapmak o on üç sütunun **adını
 * yalancı** hâle getirirdi ve düzeltmesi Faz 12'nin save katmanına kadar
 * yayılırdı.
 *
 * ⚠️ **BEDELİ YAZILI OLMALI — iki kimlik yolu bir risk taşıyor.** `players.id`
 * ve `people.id` ikisi de `integer`: bir `players.id` değeri yanlışlıkla
 * `people.id` bekleyen bir yere verilirse (örneğin 4.4'ün
 * `clubs.chairman_person_id`'sine) **yabancı anahtar bunu yakalayamaz** — o
 * kimlikte bir kişi büyük olasılıkla vardır, yalnızca **yanlış kişidir**.
 * Bugünkü savunma bir isimlendirme disiplini: kişiye bakan her sütun
 * `*_person_id`, oyuncuya bakan her sütun `*_player_id`.
 *
 * ⚠️ Daha güçlü bir ayrım (markalı kimlik tipleri) mümkün ama **bugün hiçbir
 * faza atanmadı** — doğal yeri `WorldView` sınırı olurdu (Faz 12) ve bugün
 * yazılsaydı tüketicisi olmayan bir soyutlama olurdu. Bir yere atanmadığı için
 * burada **iddia edilmiyor**, yalnızca bedel yazılıyor: kaydedilmemiş bir risk,
 * kaydedilmiş bir borçtan tehlikelidir.
 *
 * ℹ️ Aynı fazda **iki desen birden** yaşayacak ve bu bilinçli: `player_attributes`
 * (4.5) `player_id PK FK` ile 3.5'in desenini birebir izliyor — ona bakan
 * kimse yok, yani ayraç orada 3.5'i gösteriyor. **Faz 12 hangisini emsal
 * alacağını ayraçtan okur, tablodan değil.**
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `club_id` — ŞEMANIN İLK `ON DELETE SET NULL`'I
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/01` bu sütun için açıkça *"`null` = serbest oyuncu"* diyor. `fk-policy.ts`
 * ③ (4.2'de eklendi) bunu türetiyor: kaynak `satellite`, hedef sözlük değil,
 * FK'nın **bütün** sütunları nullable → **SET NULL**. Faz 3'ün 12 FK'sının
 * hiçbiri bu dala düşmüyordu; **bu, kuralın ilk canlı vakası.**
 *
 * CASCADE verilseydi bir kulüp silindiğinde oyuncuları da silinirdi. Doğru
 * davranış onları **serbest bırakmak** — ve kuralın katalogla uyuşması
 * veritabanının öyle *davrandığını* göstermediği için davranış gerçek PG18'e
 * karşı ayrıca sınanıyor (`schema-constraints.itest.ts`, iki yönlü: kulüp
 * silinince oyuncu **duruyor**, kişi silinince **gidiyor**).
 *
 * ⚠️ **`club_id`ye İNDEKS KONMADI ve bu bir unutma değil.** `SET NULL` bir
 * varlık denetimi değil bir **satır güncellemesi**: kulüp silinince eşleşen her
 * `players` satırı yazılıyor, yani indekssiz bir `DELETE FROM clubs` tabloyu
 * tarıyor. 3.5 aynı sınıfta `clubs_competition_id_idx`i tablonun yanında
 * yazmıştı. Burada yazılmadı çünkü **Faz 4'ün indeks kapsamı 4.8'e ayrıldı**
 * (ROADMAP) ve doğru indeks o alt görevin kabul kriteri 3 sorgusuyla birlikte
 * kararlaştırılır — 3.7'nin `COLLATE` kararıyla aynı gerekçe. Not burada
 * duruyor ki 4.8 bu tüketiciyi **arayarak** değil **okuyarak** bulsun.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `person_id` — `NOT NULL` + `UNIQUE` → CASCADE
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Kaynak `satellite` (bu tablo `key` taşımıyor, giden FK'sı var), hedef
 * `people` bir sözlük değil, sütun `NOT NULL` → kural ④'te **CASCADE**: bir
 * kişi silinince oyuncu kaydı da gider. Kimliği sahibinin kimliğidir.
 *
 * `UNIQUE` bir kişinin **iki oyuncu kaydı** olmasını engelliyor — 1:0..1
 * ilişkinin tek koruması bu, ve negatif bir testle sınanıyor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * SAYISAL ARALIKLAR CHECK ALMIYOR — İLİŞKİ DEĞİŞMEZLERİ 4.5'TE ALACAK
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `height_cm`, `weight_kg`, ayak tercihleri (1-20), `current_ability` /
 * `potential_ability` (1-200) ve PA bandı **CHECK almıyor** — §3.1.2 ② ve
 * SAPMA-028: bir aralık **kalibrasyondur**, Faz 23/30 denge ayarı onu
 * değiştirebilir. Aralık denetiminin yeri Faz 11 (`pnpm validate:world`).
 *
 * ✅ **`CA <= PA` ve `pa_range_min <= pa_range_max` CHECK ALDI (4.5, `0007`)** —
 * `ALTER TABLE … ADD CONSTRAINT` biçimiyle, çünkü tablo 4.3'te zaten yaratılmıştı
 * (§3.1.2 ① o biçimin üretildiğini ölçmüştü). Bunlar bir aralık değil bir
 * **ilişki değişmezi**: hiçbir denge ayarı CA'yı PA'nın üstüne çıkarmaz —
 * çıkarırsa tanımın kendisi ihlal edilmiş olur. Ayracın (*"bu değeri yarın bir
 * denge ayarı değiştirebilir mi?"*) aynı tablodaki iki grubu **farklı
 * taraflara** koyması, kuralın iyi bir kural olduğunun kanıtı.
 *
 * ⚠️ **İki AYRI kısıt, tek bir birleşik kısıt değil.** `CHECK (ca <= pa AND
 * min <= max)` daha kısa olurdu ve **daha kötü**: iki değişmezden hangisinin
 * ihlal edildiği hata mesajından okunamazdı ve birinin nöbetçisi silinse diğeri
 * onu örterdi. G-11'in *"kısmi koruma D3 yanılsaması üretir"* dersinin tersi
 * yönü — burada koruma tam, ama **teşhis** bölünmeli. `people_person_type_check`
 * bilerek birleşikti (iki yarısı **aynı** iddianın parçası: *"dizi geçerli mi"*);
 * burada iki ayrı iddia var.
 *
 * ⚠️ **`pa_range_min` ile `CA`/`PA` arasındaki ilişki CHECK ALMIYOR.** `spec/02`
 * §4.4 bandı `clamp(CA, 200, PA ± uncertainty)` ile üretiyor, yani üretim yolu
 * `paRangeMin >= CA` sağlıyor — ama bu bir **türetme sonucudur**, bir tanım
 * değil: bir gözlemci raporu (Faz 31) bandı bilerek CA'nın altına indirebilir
 * (*"bu oyuncu düşünüldüğünden zayıf"*). Tanım gereği doğru olan tek şey
 * `min <= max`. Kalibrasyona açık olan Faz 11'e ait.
 *
 * `primary_position` ise CHECK **alıyor**: on iki mevki kodu kapalı bir küme,
 * yani sözleşme — yeni bir mevki ancak taktik sistemi yeniden tasarlanırsa
 * gelir, bir denge ayarıyla değil.
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  integer,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

import { masterTable } from '../client/master.js';
import { clubs } from './clubs.js';
import { people } from './people.js';

/**
 * Mevki kodları — `spec/01` §3.1 `players.primaryPosition` satırındaki on iki
 * değer, **birebir o sırayla** (kaleci → savunma → orta saha → hücum).
 *
 * Kapalı küme → CHECK (§3.1.2 ②). Kümenin `spec/02` §4.3
 * (`positionScarcity`) ve `spec/04` (`idealDepth`) ile tutarlı olduğu ayrıca
 * kontrol edildi — ikisi de aynı kodları kullanıyor, çelişki yok.
 */
export const PLAYER_POSITIONS = [
  'GK',
  'DC',
  'DL',
  'DR',
  'DM',
  'MC',
  'ML',
  'MR',
  'AMC',
  'AML',
  'AMR',
  'ST',
] as const;

export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];

export const players = masterTable(
  pgTable(
    'players',
    {
      id: serial('id').primaryKey(),
      /** `ON DELETE CASCADE` — uydu kuralı (§3.1.2 ③). Gerekçe dosya başlığında. */
      personId: integer('person_id')
        .notNull()
        .unique()
        .references(() => people.id, { onDelete: 'cascade' }),
      /**
       * Mevcut kulüp. `null` = **serbest oyuncu** (`spec/01`'in kendi ifadesi).
       *
       * `ON DELETE SET NULL` — şemanın ilk vakası, gerekçe dosya başlığında.
       *
       * ⚠️ Transfer bu sütunu **değiştirmez**: master salt-okunurdur (K4),
       * kulüp değişimi `save_deltas`'a yazılır (Faz 12).
       */
      clubId: integer('club_id').references(() => clubs.id, { onDelete: 'set null' }),
      /** Forma numarası. `null` = numarasız (kadro dışı, altyapı, yeni transfer). */
      squadNumber: smallint('squad_number'),
      primaryPosition: text('primary_position').$type<PlayerPosition>().notNull(),
      heightCm: smallint('height_cm').notNull(),
      weightKg: smallint('weight_kg').notNull(),
      /** 1-20 — sağ ayak yetkinliği. Aralık denetimi Faz 11'de. */
      preferredFootRight: smallint('preferred_foot_right').notNull(),
      /** 1-20 — sol ayak yetkinliği. İkisi ayrı ayrı, çünkü çift ayaklılık bir derece. */
      preferredFootLeft: smallint('preferred_foot_left').notNull(),
      /** 1-200, **GİZLİ** (arayüzde hiç gösterilmez). Aralık denetimi Faz 11'de. */
      currentAbility: smallint('current_ability').notNull(),
      /** 1-200, **GİZLİ**. `CA <= PA` değişmezi 4.5'te CHECK olacak. */
      potentialAbility: smallint('potential_ability').notNull(),
      /** PA belirsizlik bandının alt ucu — gözlemci raporları bunu kullanır (Faz 31). */
      paRangeMin: smallint('pa_range_min').notNull(),
      /** PA belirsizlik bandının üst ucu. `min <= max` değişmezi 4.5'te CHECK olacak. */
      paRangeMax: smallint('pa_range_max').notNull(),
      /**
       * Üretilmiş oyuncu mu (Faz 40). **DEFAULT YOK** — `clubs.is_national` ve
       * `source` ile aynı ilke: bir varsayılan, kimsenin belirtmediği satıra
       * "gerçek oyuncu" bilgisini **uydururdu**. Unutulursa `INSERT` gürültülü
       * patlar; sessizce yanlış satır oluşmaz.
       */
      isNewgen: boolean('is_newgen').notNull(),
      /**
       * Futbolu bıraktığı tarih. `null` = hâlâ aktif.
       *
       * Satır **silinmiyor**: emekli bir oyuncunun istatistik geçmişi
       * (`player_stats_history`, 4.6) ve kariyer vitrini (Faz 47) duruyor.
       * `mode: 'string'` gerekçesi `people.birth_date` ile aynı.
       */
      retiredAt: date('retired_at', { mode: 'string' }),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
      check(
        'players_primary_position_check',
        sql`${table.primaryPosition} IN (${sql.raw(PLAYER_POSITIONS.map((position) => `'${position}'`).join(', '))})`,
      ),
      /**
       * İLİŞKİ DEĞİŞMEZİ #1 — mevcut yetenek potansiyeli aşamaz (4.5, kriter 5).
       * Bir aralık değil bir tanım: `spec/02` §4.4 PA'yı `clamp(CA, 200, …)` ile
       * üretiyor, yani `PA >= CA` formülün kendi çıktısı. Gerekçe dosya başlığında.
       */
      check('players_ca_le_pa_check', sql`${table.currentAbility} <= ${table.potentialAbility}`),
      /**
       * İLİŞKİ DEĞİŞMEZİ #2 — belirsizlik bandının alt ucu üst ucunu geçemez.
       * Ayrı bir kısıt: birleştirilseydi hangi değişmezin ihlal edildiği hata
       * mesajından okunamazdı.
       */
      check('players_pa_range_check', sql`${table.paRangeMin} <= ${table.paRangeMax}`),
    ],
  ),
);
