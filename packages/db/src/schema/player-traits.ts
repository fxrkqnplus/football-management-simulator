/**
 * `player_traits` — özel yetenekler (PPM). `docs/spec/01-database.md` §3.1.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `trait_code` CHECK ALMIYOR — VE BU BİR UNUTMA DEĞİL, ÖLÇÜLMÜŞ BİR KARAR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * §3.1.2 ②'nin ayracı *"kapalı küme mi, açık uçlu mu"*. Kümenin kapalı olduğunu
 * iddia edebilmek için **sayılabilir olması** gerekiyor; arandı ve sayılamadı:
 *
 * | Kaynak | Ölçüm |
 * |---|---|
 * | `docs/spec/02-attributes.md` (nitelik sisteminin kaynağı) | `trait` / `PPM` / *"özel yetenek"* → **0 eşleşme** |
 * | `docs/ROADMAP.md` Faz 10 | *"Özel yetenekler (traits/PPM): **~30 özellik**, istatistik desenlerinden"* |
 * | `docs/spec/12-data-packs.md` §17.4 | iki **örnek** kod: `runs_with_ball_through_centre`, `attempts_overhead_kicks` |
 * | `docs/spec/01-database.md` §3.1 | `traitCode: text` — `'a'\|'b'\|'c'` biçiminde **yazılmamış** |
 *
 * *"~30"* bir **tahmindir**, bir sözleşme değil; ve spec'in kendi yazımı düz
 * `text`. §3.1.2 ②'nin tablosu bu satırı *"açık uçlu"* sütununa koyuyor —
 * `confederation` ile aynı sınıf (`UEFA, CONMEBOL...`).
 *
 * ⚠️ **KARŞILAŞTIR — AYNI FAZDA İKİ FARKLI CEVAP, VE AYRAÇ ÇALIŞTI.**
 * `player_positions.position` on iki değerlik bir kümeydi ve spec onu
 * `players.primaryPosition` satırında **tek tek sayıyordu** → CHECK aldı.
 * Burada sayacak bir liste yok → almıyor. Aynı alt görevde aynı ayracın iki
 * farklı cevap üretmesi, kuralın iyi bir kural olduğunun kanıtı
 * (`players.ts`in `CA <= PA` / aralık ayrımıyla aynı biçim).
 *
 * ⚠️ **VE BURADA 4.1'İN İKİNCİ AYRACI DA SORULDU:** *"kapalı küme **etiket** mi,
 * **veri taşıyan satır** mı?"* (`staff_roles` ↔ `injury_types` vakası). Cevap
 * bugün **bilinmiyor** — bir özel yeteneğin maç motoruna ne kadar etki ettiği
 * (`spec/03`) ya da AI skorlamasındaki ağırlığı (`spec/04`) satırda veri
 * taşıyan bir `traits` sözlük tablosu gerektirebilir. **Bugün açılmıyor**
 * (K12): kümeyi üreten faz **Faz 10**, tüketen fazlar 20-29; tabloyu bugün
 * açmak, hiçbir şeyin yazmadığı bir tablo olurdu — Faz 2 §5'in **D3** sınıfı
 * ve `injury_types`in Faz 12'ye taşınma gerekçesinin aynısı.
 *
 * ℹ️ Yanlış CHECK'in bedeli asimetrik ve karar bu asimetriye dayanıyor: küme
 * bugün kapatılsaydı Faz 10 otuz koda sığmadığında bir **migration** gerekirdi
 * (§3.1.2 ②'nin *"migration'a çakılmış bir aralık"* uyarısıyla aynı). Açık
 * bırakmanın bedeli ise bir yazım hatasının veritabanına girebilmesi — ve onun
 * yeri zaten **Faz 11 veri doğrulayıcısı** (`pnpm validate:world`), tıpkı
 * nitelik aralıkları gibi.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * BİLEŞİK PK — 1:N, AYRAÇ UYGULANMIYOR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/01` PK'yi **`(playerId, traitCode)`** yazıyor: bir oyuncunun birden çok
 * özel yeteneği var. 4.3/4.5'in 1:1 ayracı (*"tabloya gelen FK sayısı"*) burada
 * **soru bile değil** — ve bu `spec/01`'den okundu, devir notundan alınmadı (D7).
 *
 * Bileşik PK aynı yeteneğin bir oyuncuya **iki kez** yazılmasını da engelliyor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `player_id` → CASCADE (kural KOŞTURULDU)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Kaynak `satellite` (`key` yok + giden FK var), hedef `players` sözlük değil,
 * sütun `NOT NULL` → kural ④ → **CASCADE**. §3.1.0 sütunlarını taşımıyor:
 * özel yetenek bir varlık değil, oyuncunun türetilmiş bir özelliği (Faz 10).
 */
import { integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

import { masterTable } from '../client/master.js';
import { players } from './players.js';

export const playerTraits = masterTable(
  pgTable(
    'player_traits',
    {
      /** Bileşik PK'nin ilk yarısı **ve** FK. `ON DELETE CASCADE` — kural ④. */
      playerId: integer('player_id')
        .notNull()
        .references(() => players.id, { onDelete: 'cascade' }),
      /**
       * Özel yetenek kodu — snake_case, `spec/12` §17.4'ün biçimi
       * (`runs_with_ball_through_centre`). **CHECK YOK**, gerekçe dosya
       * başlığında; küme Faz 10'da doğuyor, denetimi Faz 11'de.
       */
      traitCode: text('trait_code').notNull(),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [primaryKey({ columns: [table.playerId, table.traitCode] })],
  ),
);
