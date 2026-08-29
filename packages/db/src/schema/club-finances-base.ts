/**
 * `club_finances_base` — kulübün BAŞLANGIÇ finansalları. `docs/spec/01-database.md` §3.1.
 *
 * "Base" adı kasıtlı: bu satırlar master'dır ve veri paketinden gelir (K9);
 * oyun içinde para hareket ettikçe değişim `save_deltas`'a yazılır (K4). Yani
 * burası bakiyenin **şu anki** değeri değil, kariyerin başladığı andaki değeri.
 *
 * Uydu tablo — `club_facilities` ile aynı iki sonuç: veri paketi sütunlarını
 * (`key` · `source` · `external_ids`) **taşımaz** ve `ON DELETE CASCADE` alır
 * (§3.1.0 · §3.1.2 ③). `club_id` hem birincil hem yabancı anahtar; ayrı bir
 * `serial id` ikinci bir kimlik yolu açardı.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ `bigint` MOD KARARI: `{ mode: 'bigint' }` — ÖLÇÜLDÜ, seçilmedi
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Drizzle'ın `bigint()`i bir mod istiyor ve **ikisi de aynı DDL'i üretiyor**
 * (`getSQLType()` → `bigint`), yani seçim migration'ı değil yalnızca JS
 * tarafındaki eşlemeyi değiştiriyor. Fark, gerçek PG 18.6'ya karşı ölçüldü
 * (dokümandan okunmadı):
 *
 * | Yol | `9007199254740993` (2⁵³+1) | `9223372036854775807` (int8 üst sınırı) |
 * |---|---|---|
 * | Ham `postgres.js` | `'9007199254740993'` (dizge) ✅ | `'9223372036854775807'` ✅ |
 * | Drizzle `mode: 'number'` | `9007199254740992` ❌ | `9223372036854776000` ❌ |
 * | Drizzle `mode: 'bigint'` | `9007199254740993n` ✅ | `9223372036854775807n` ✅ |
 *
 * `mode: 'number'` sürücünün dizgesini `Number(value)` ile daraltıyor
 * (`drizzle-orm/pg-core/columns/bigint.js`, kaynaktan okundu) — yani hata
 * fırlatmıyor, **sessizce yanlış sayı** döndürüyor. Para için bu, aşağı
 * akışta hiçbir zaman tespit edilemeyecek bir hata sınıfı: kayıp ne loga ne
 * Sentry'ye düşer, yalnızca bakiye tutmaz.
 *
 * `mode: 'bigint'` sürücünün dizgesini `BigInt(value)` ile alıyor: hassasiyet
 * korunuyor **ve** tip sayısal kalıyor. 3.2a'nın *"`postgres.js` `bigint`i
 * dizge döndürüyor ve bu istenen davranış"* ölçümüyle çelişmiyor — dizge, kaybın
 * olmadığı ara biçim; `BigInt` onun tipli hâli.
 *
 * ⚠️ **Bedeli yazılı olmalı:** `bigint` JS'te `number` ile **karışmaz**
 * (`1n + 1` → `TypeError`) ve `JSON.stringify` onu **serileştiremez**. Faz 12
 * (`WorldView`) ve Faz 30 (piyasa değeri) para taşıyan her sınırda dönüşümü
 * açıkça yapmak zorunda. Bu bir kusur değil, kararın görünür yüzü: sessiz
 * hassasiyet kaybı yerine **gürültülü tip hatası**.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * BİRİM: KURUŞ / CENT — ve neden `numeric` değil
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/01` alanları *"kuruş/cent cinsinden"* tanımlıyor, yani tamsayı.
 * `countries.uefa_coefficient` `numeric` çünkü orada **ondalık** bir büyüklük
 * var; burada ondalık yok, ölçek birime taşınmış. Tamsayı aritmetiği hem daha
 * hızlı hem yuvarlama hatası üretmiyor.
 *
 * Gelir alanları `NOT NULL` ve **DEFAULT'suz**: sıfır gelir anlamlı bir değer
 * (uydurma değil), ama *belirtilmemiş* gelir anlamlı değil — varsayılan
 * konsaydı ingest'in bir alanı doldurmayı unutması sessizce `0` olurdu.
 */
import { bigint, char, integer, pgTable, timestamp } from 'drizzle-orm/pg-core';

import { masterTable } from '../client/master.js';
import { clubs } from './clubs.js';

export const clubFinancesBase = masterTable(
  pgTable('club_finances_base', {
    clubId: integer('club_id')
      .primaryKey()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    /** Kasa. Negatif olabilir — borçlu kulüp gerçek bir durum. */
    balance: bigint('balance', { mode: 'bigint' }).notNull(),
    transferBudget: bigint('transfer_budget', { mode: 'bigint' }).notNull(),
    /**
     * Maaş bütçesi. ⚠️ **Dönemi (haftalık mı yıllık mı) `spec/01` SÖYLEMİYOR** —
     * gelir alanları `…Annual` sonekini açıkça taşıyor, bu taşımıyor. Şema
     * sütuna bir dönem **uydurmuyor**: sütun bir tutar saklıyor, dönemi
     * kullanan taraf (Faz 8 ingest, Faz 30 ekonomi) kararlaştıracak ve o karar
     * şemaya değil sözleşmeye yazılacak. Uydurulmuş bir sonek (`_weekly`),
     * yanlış olduğunda tek bir yerde değil **her sorguda** yanlış olurdu.
     */
    wageBudget: bigint('wage_budget', { mode: 'bigint' }).notNull(),
    matchdayIncomeAnnual: bigint('matchday_income_annual', { mode: 'bigint' }).notNull(),
    tvIncomeAnnual: bigint('tv_income_annual', { mode: 'bigint' }).notNull(),
    sponsorIncomeAnnual: bigint('sponsor_income_annual', { mode: 'bigint' }).notNull(),
    merchandiseIncomeAnnual: bigint('merchandise_income_annual', { mode: 'bigint' }).notNull(),
    /**
     * ISO 4217. `countries.currency_code`ta tekrar ediyor gibi görünüyor ama
     * etmiyor: bir kulüp ülkesinden başka bir para biriminde muhasebe tutabilir
     * (`spec/12` §17.4 `finances.currency` alanını kulüp başına veriyor).
     */
    currencyCode: char('currency_code', { length: 3 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  }),
);
