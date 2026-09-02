/**
 * `manager_attributes` — 8 menajer niteliği. `docs/spec/01-database.md` §3.1.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * 8 SAYISI `spec/01`'DEN SAYILDI — `spec/02`'DE HİÇ YOK (ölçüldü)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Ölçüm ve gerekçesi kardeş dosyada (`staff-attributes.ts` başlığı):
 * `docs/spec/02-attributes.md` içinde `staff` / `manager` → **0 eşleşme**.
 * Sayı `spec/01` §3.1 `manager_attributes` satırlarından **sayılarak** alındı.
 *
 * ⚠️ **Ayraç kardeş tablodan KOPYALANMADI, ayrıca koşturuldu** — 4.5'in
 * `player_hidden_attributes` için kurduğu disiplin. `spec/01` tamamında arandı:
 *
 * | Arama | Eşleşme |
 * |---|---|
 * | `manager_attributes` / `managerAttributes` | **1** — yalnızca kendi tanımı (satır 732) |
 * | `managerAttributeId` / `manager_attribute_id` | **0** |
 *
 * → gelen FK **0** → **PK = FK** (3.5 deseni). Ayrı bir `serial id` ikinci bir
 * kimlik yolu açar ve aynı menajer için iki nitelik satırı mümkün olurdu.
 *
 * ⚠️ **`managers`ın kendisi bu ayraçtan GEÇMİYOR ve geçmemesi doğru:**
 * `spec/01`'de ona bakan **dört** FK var (biri bu tablo, üçü §3.2 save
 * katmanında — `saves` · `manager_career` · `board_confidence`). Ayraç
 * **uydunun** sorusudur, sahibinin değil.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `negotiating` VE `judgingAbility` İKİ TABLODA DA VAR — VE BU BİR HATA DEĞİL
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `staff_attributes` da `negotiating` ve `judgingAbility` taşıyor. İki ayrı
 * sütun, iki ayrı varlık: bir gözlemcinin oyuncu değerlendirme yeteneği ile bir
 * menajerinki **aynı ölçek üzerinde farklı değerlerdir**. Ortaklaştırmak iki
 * varlığı tek satıra bağlardı; `spec/01` ikisini de ayrı yazıyor.
 *
 * ℹ️ Bir birim testi bunu **iddia ediyor** (kesişim boş değil ve boş olması da
 * beklenmiyor) — 4.5'in *"gizli nitelikler görünür tabloda DEĞİL"* testinin
 * tersi bir vaka: orada kesişmezlik bir değişmezdi, burada kesişme normaldir ve
 * yazılmazsa bir sonraki okuyucu onu hata sanır.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * SEKİZ SÜTUNUN HİÇBİRİ CHECK ALMIYOR (SAPMA-028)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/01` hepsini `// 1-20` diye yazıyor → §3.1.2 ②'ye göre **kalibrasyon**,
 * sözleşme değil. 4.5'in 57 nitelik sütunu ve 3.6'nın altı hakem niteliği ile
 * aynı sınıf. Aralık denetiminin yeri **Faz 11** (`pnpm validate:world`), ve
 * kısıtın yokluğu `schema-constraints.itest.ts`te **negatif bir iddiayla**
 * katalogdan doğrulanıyor.
 */
import { integer, pgTable, smallint, timestamp } from 'drizzle-orm/pg-core';

import { masterTable } from '../client/master.js';
import { managers } from './managers.js';

/**
 * 8 menajer niteliğinin envanteri — `spec/01` §3.1 `manager_attributes`
 * satırlarından **sayılarak** alındı. Sıra `spec/01`'in yazdığı sıra.
 */
export const MANAGER_ATTRIBUTES = [
  'tacticalKnowledge',
  'motivation',
  'playerManagement',
  'youthDevelopment',
  'negotiating',
  'mediaHandling',
  'trainingManagement',
  'judgingAbility',
] as const;

export type ManagerAttribute = (typeof MANAGER_ATTRIBUTES)[number];

export const managerAttributes = masterTable(
  pgTable('manager_attributes', {
    /** 1:1 — PK **ve** FK. Ayraç ve ölçümü dosya başlığında. */
    managerId: integer('manager_id')
      .primaryKey()
      .references(() => managers.id, { onDelete: 'cascade' }),

    /** Taktik bilgisi — diziliş/talimat etkinliği (Faz 20-23). */
    tacticalKnowledge: smallint('tactical_knowledge').notNull(),
    /** Motivasyon — devre arası konuşması ve moral etkisi (Faz 33, 45). */
    motivation: smallint('motivation').notNull(),
    /** Oyuncu yönetimi — soyunma odası uyumu (Faz 33). */
    playerManagement: smallint('player_management').notNull(),
    /** Altyapı gelişimi — genç oyuncu gelişim çarpanı (Faz 40). */
    youthDevelopment: smallint('youth_development').notNull(),
    /** Pazarlık — transfer ve sözleşme görüşmeleri (Faz 32). */
    negotiating: smallint('negotiating').notNull(),
    /** Basın yönetimi — basın toplantısı sonuçları (Faz 45). */
    mediaHandling: smallint('media_handling').notNull(),
    /** Antrenman yönetimi — haftalık program etkinliği (Faz 36). */
    trainingManagement: smallint('training_management').notNull(),
    /** Yetenek değerlendirme — kendi kadrosunu okuma doğruluğu (Faz 31). */
    judgingAbility: smallint('judging_ability').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  }),
);
