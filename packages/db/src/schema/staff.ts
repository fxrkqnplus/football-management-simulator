/**
 * `staff` — teknik ekip ve kulüp personeli. `docs/spec/01-database.md` §3.1.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `role` CHECK ALIYOR — VE SAYI `spec/01`'DEN SAYILDI, ROADMAP'TEN ALINMADI
 * ────────────────────────────────────────────────────────────────────────────
 *
 * §3.1.2 ②'nin ayracı: *"bu değeri yarın bir denge ayarı değiştirebilir mi?"*
 * Hayır — bir rol **sözleşmedir**, on ikinci rolün adı bir kalibrasyonla
 * değişmez. Küme `spec/01` §3.1'de **tek tek yazılı** ve **12 değer** oradan
 * sayıldı (ROADMAP de 12 diyor ama sayı ondan alınmadı — SAPMA-001 tam bu
 * sınıftı ve `player_hidden_attributes` onun kendi vakası).
 *
 * ⚠️ **KARŞILAŞTIR — 4.6'nın `trait_code`u CHECK ALMADI:** o küme `spec/02`'de
 * hiç tanımlı değildi (0 eşleşme) ve ROADMAP *"~30"* diyordu, yani
 * **sayılamıyordu**. Sayılamayan bir küme kapalı iddia edilemez. Buradaki küme
 * sayılabiliyor, o yüzden kapalı iddia ediliyor. Aynı ayraç, iki farklı cevap.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `staff_roles` TABLOSU AÇILMIYOR — 4.1'in KARARI, GEREKÇESİ 4.7'DE DENETLENDİ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * ROADMAP Faz 4 bir `staff_roles` tablosu sayıyordu ve §3.1.2 ⑧ onu
 * `injury_types` ile aynı sınıfa koyuyordu. 4.1 ikisini **ayırdı**; 4.7 o kararı
 * kopyalamadan önce dört gerekçesini tek tek denetledi ve dördü de geçerli:
 *
 * | 4.1'in gerekçesi | Bugün |
 * |---|---|
 * | `staff.role` satır içi kapalı küme, satırlar yalnızca **etiket** | ✅ `spec/01` hâlâ satır içi yazıyor |
 * | `injury_types` satırları **veri** taşıyor (süre, ciddiyet) | ✅ `staff_roles` için tek bir sütun tanımı bile yok |
 * | Faz 37'nin *"12 rol de atanabiliyor"* kriterini CHECK sağlar | ✅ rol **etkileri** motor katsayısı (K3), tablo satırı değil |
 * | ⑧ ancak tabloyu **hedefleyen** bir FK varken cevap üretir | ✅ `staff.role_id` diye bir sütun spec'te yok |
 *
 * **Ayraç:** *"kapalı küme **etiket** mi, **veri taşıyan satır** mı?"*
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `person_id` UNIQUE **DEĞİL** — ve bu `players` ile ÖLÇÜLMÜŞ bir FARK
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/01` `players`ı `personId: FK UNIQUE` diye yazıyor, `staff`ı yalnızca
 * `personId FK` diye. Fark **kasıtlı ve anlamlı**: bir kişinin tek bir oyuncu
 * kaydı olur, ama aynı kişi bir kulüpte kondisyon antrenörü, başka bir kulüpte
 * gözlemci olabilir — ve `personType` zaten bir **dizi** (`spec/01` §3.1).
 * UNIQUE eklemek spec'in yazmadığı bir kısıtı uydurmak olurdu (SAPMA-026).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * §3.1.0 SÜTUNLARI (`key` / `source` / `external_ids`) TAŞINMIYOR — ÖLÇÜLDÜ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * §3.1.0'ın iki listesi bu tabloyu **hiç saymıyordu**; karar `players`
 * emsalinden ve bir **karşı-ölçümden** türetildi (kural derlenmiş
 * `fk-policy.js` üzerinden koşturuldu, hafızadan uygulanmadı):
 *
 * ```
 * staff/managers `key` TAŞIMAZSA:  CASCADE ×4 + SET NULL ×2   ← karar
 * staff/managers `key` TAŞISAYDI:  RESTRICT ×4 + CASCADE ×2
 * ```
 *
 * Yani `key` taşımak `staff.club_id`i `SET NULL` yerine **RESTRICT** yapardı:
 * bir kulüp silindiğinde personeli serbest bırakmak yerine silme **reddedilirdi**.
 * `spec/01` `clubId`i açıkça *nullable* yazıyor (işsiz personel geçerli bir
 * durum), yani doğru davranış `SET NULL` ve o yalnızca `key` taşınmadığında
 * çıkıyor. Mekanizma §3.1.0'ın `people` ↔ `players` ölçümüyle (20/20 ↔ 17/20)
 * birebir aynı. Anlam da aynı yeri gösteriyor: pakette kendi kaydı olan varlık
 * **kişidir**; personel kaydı kişinin kimliğinden türüyor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `ON DELETE` — KURAL KOŞTURULDU, HAFIZADAN UYGULANMADI
 * ────────────────────────────────────────────────────────────────────────────
 *
 * | FK | Hedef | Kural | Hangi adım |
 * |---|---|---|---|
 * | `person_id` | `people` (**independent**) | **CASCADE** | ④ kaynak uydu + `NOT NULL` |
 * | `club_id` | `clubs` (**independent**) | **SET NULL** | ③ bütün sütunlar nullable |
 *
 * ⚠️ Hedefin `independent` olması cevabı **değiştirmiyor**: `expectedDeleteAction`
 * hedefin sınıfını yalnızca ① adımında (*"sözlük mü"*) soruyor, sonrasında
 * **kaynağın** sınıfına bakıyor. 4.3'ün 4.4 için yaptığı yanlış tahmin tam
 * olarak bu okumayı ters yapmıştı; 4.6'nın `competition_id`i de aynı sınıftı.
 */
import { sql } from 'drizzle-orm';
import { check, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

import { masterTable } from '../client/master.js';
import { clubs } from './clubs.js';
import { people } from './people.js';

/**
 * On iki personel rolü — `spec/01` §3.1 `staff.role` satırından **sayılarak**
 * alındı. Sıra spec'in yazdığı sıra.
 *
 * Kod adları `snake_case` çünkü bunlar veritabanına yazılan **değerler**, TS
 * tanımlayıcıları değil (`PERSON_TYPES` · `KIT_TYPES` ile aynı biçim).
 */
export const STAFF_ROLES = [
  'assistant_manager',
  'attacking_coach',
  'defending_coach',
  'fitness_coach',
  'gk_coach',
  'technical_coach',
  'physio',
  'sports_scientist',
  'scout',
  'data_analyst',
  'youth_manager',
  'youth_coach',
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

const literals = (values: readonly string[]): string =>
  values.map((value) => `'${value}'`).join(', ');

export const staff = masterTable(
  pgTable(
    'staff',
    {
      id: serial('id').primaryKey(),
      /**
       * `ON DELETE CASCADE` — uydu kuralı (§3.1.2 ③/④). **UNIQUE DEĞİL**;
       * gerekçe dosya başlığında (`players` ile ölçülmüş fark).
       */
      personId: integer('person_id')
        .notNull()
        .references(() => people.id, { onDelete: 'cascade' }),
      /**
       * Çalıştığı kulüp. `null` = **işsiz personel** — `players.club_id`in
       * (*"serbest oyuncu"*) kardeşi ve `SET NULL` dalının aynı gerekçesi.
       */
      clubId: integer('club_id').references(() => clubs.id, { onDelete: 'set null' }),
      /** On iki rolden biri. Küme yukarıda, CHECK aşağıda. */
      role: text('role').$type<StaffRole>().notNull(),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
      check('staff_role_check', sql`${table.role} IN (${sql.raw(literals(STAFF_ROLES))})`),
    ],
  ),
);
