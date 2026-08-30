/**
 * `player_attributes` — 47 GÖRÜNÜR nitelik, tek satır. `docs/spec/01-database.md` §3.1.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * 47 SAYISI ROADMAP'TEN ALINMADI — `spec/02` §4.1'DEN SAYILDI (SAPMA-001)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * SAPMA-001 tam bu sınıftı: gizli nitelik sayısı 8 → 10 oldu, ROADMAP iki yerde
 * **adıyla** sekiz sayıyordu ve tutarsızlık Faz 3.0'a kadar düzeltilmedi. Bu
 * yüzden envanter burada bir **sayı** olarak değil bir **liste** olarak yaşıyor
 * (`VISIBLE_ATTRIBUTES`) ve `player-attributes.test.ts` onu tablonun gerçek
 * sütunlarıyla **birebir** karşılaştırıyor.
 *
 * `spec/02` §4.1'den sayıldı: Teknik **14** · Zihinsel **14** · Fiziksel **8** ·
 * Kaleci **11** = **47**, ve 47'sinin de benzersiz olduğu ayrıca ölçüldü.
 *
 * ⚠️ **Bir SAYI iddiası bir ÖZETtir, bir LİSTE iddiası bir ENVANTERdir.** 4.4'ün
 * dersi (*"özetler körlenebilir, envanterler kör kalmaz"*) burada uygulanıyor:
 * `expect(columns.length).toBe(47)` yanlış adlı bir sütunu geçirir,
 * `expect(columns).toEqual([...])` geçirmez.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `player_id` HEM BİRİNCİL ANAHTAR HEM YABANCI ANAHTAR — AYRAÇ KOŞTURULDU
 * ────────────────────────────────────────────────────────────────────────────
 *
 * 4.3 `players`i 3.5'in *"1:1 uydularda `club_id` hem PK hem FK"* kuralından
 * **bilerek ayırdı** ve ayracı ölçülebilir hâle getirdi: **tabloya GELEN
 * yabancı anahtar sayısı.** Bir kararı kopyalamadan önce gerekçesinin hâlâ
 * geçerli olduğu sorulur — soruldu ve ayraç **koşturuldu**, hafızadan
 * uygulanmadı:
 *
 * | Tablo | Ona bakan FK | Ölçüm | Sonuç |
 * |---|---|---|---|
 * | `club_facilities` | **0** | canlı katalog (3.5) | PK = FK |
 * | `players` | **13** | `spec/01`, 5 master + 8 save (4.3) | ayrı `serial` |
 * | **`player_attributes`** | **0** | `spec/01` tamamında `attributesId` / `attribute_id` arandı → **0 eşleşme** | **PK = FK** |
 *
 * Yani ayraç burada 3.5'i gösteriyor ve karar **yeniden verildi**, `players`ın
 * deseni kopyalanmadı. Ayrı bir `serial id` ikinci bir kimlik yolu açardı: aynı
 * oyuncu için iki nitelik satırı yaratmak mümkün olur ve *"hangisi geçerli?"*
 * sorusu şemada cevapsız kalırdı. PK'nin kendisi FK olunca teklik veritabanı
 * seviyesinde garanti.
 *
 * ⚠️ **TÜKETİCİ OLMAK, GELEN FK OLMAKLA AYNI ŞEY DEĞİL.** Bu tablonun bilinen
 * tüketicileri var (Faz 32 transfer filtreleri `finishing`/`passing`/`pace`
 * üzerinde arama yapacak, Faz 4.8 indeks koyabilir) ve *"demek ki taşıyıcı bir
 * kimlik"* diye okumak kolaydı. Yanlış olurdu: bir indeks ya da sorgu tabloyu
 * **okur**, kimliğini **referans almaz**. Ayraç ikincisini soruyor.
 *
 * **Faz 12 hangisini emsal alacağını tablodan değil AYRAÇTAN okur.**
 *
 * ────────────────────────────────────────────────────────────────────────────
 * TEK SATIR / 47 SÜTUN — `jsonb` DEĞİL
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/01`'in kendi notu: *"jsonb DEĞİL: filtre performansı kritik"*. Transfer
 * araması (Faz 32) bu sütunlar üzerinde `WHERE` ve `ORDER BY` çalıştıracak;
 * `jsonb` içinde bir alan üzerinde indeks kurmak mümkün ama her filtre ayrı bir
 * ifade indeksi ister ve plan seçimi 3.7'de ölçüldüğü gibi ifadenin **birebir**
 * eşleşmesine bağlı.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * 47 SÜTUNUN HİÇBİRİ CHECK ALMIYOR (SAPMA-028)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * §3.1.2 ②'nin ayracı: *"bu değeri yarın bir denge ayarı değiştirebilir mi?"*
 * Bir nitelik ölçeği (1-20) bir **kalibrasyondur** — Faz 23 (maç motoru dengesi)
 * ve Faz 30 (piyasa değeri) onu yeniden ölçekleyebilir ve migration'a çakılmış
 * bir aralık o gün bir `DROP CONSTRAINT` isterdi.
 *
 * **Ölçülmüş emsal:** 3.6'da altı hakem niteliği (1-20) CHECK **almadı**;
 * `competitions.reputation` (0-200) ve `stadiums.pitch_quality` (1-20) da
 * almadı. Faz 4 aynı sınıfa farklı davranamaz.
 *
 * Aralık denetiminin yeri **Faz 11** (`pnpm validate:world`) — ROADMAP Faz 11
 * zaten *"CA ≤ PA, nitelikler 1–20"* diyor.
 *
 * ⚠️ Karşılaştır: `players`ın **ilişki değişmezleri** (`CA <= PA`,
 * `pa_range_min <= pa_range_max`) aynı alt görevde CHECK **aldı**. Ayracın iki
 * kriteri farklı taraflara koyması, kuralın iyi bir kural olduğunun kanıtıdır.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * KALECİ NİTELİKLERİ SAHA OYUNCUSUNDA DA `NOT NULL`
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/02` §4.1: *"Kaleci nitelikleri yalnızca kalecilerde anlamlıdır; saha
 * oyuncularında 1–3 arası sabitlenir."* Yani değer **her zaman vardır**,
 * yalnızca küçüktür — `null` bir saha oyuncusunun `handling`i *"bilinmiyor"*
 * demek olurdu ve bu yanlış: biliniyor, düşük. Aynı gerekçe tersten de geçerli,
 * bir kalecinin `finishing`i de yazılır.
 *
 * Bu, SAPMA-026'nın (*"kimsenin belirlemediği alana değer uydurma"*) **tersi**
 * bir vaka ve ayrımı görmek önemli: orada bilgi **yok**tu, burada bilgi **var**
 * ve `spec/02` onu adıyla söylüyor.
 */
import { integer, pgTable, smallint, timestamp } from 'drizzle-orm/pg-core';

import { masterTable } from '../client/master.js';
import { players } from './players.js';

/**
 * 47 görünür niteliğin **kategori bazlı envanteri** — `spec/02` §4.1'in
 * tablosundan **sayılarak** alındı, ROADMAP'ten değil (SAPMA-001).
 *
 * Kod adları `spec/02`'nin yazdığı gibi camelCase; tablo alan adları da öyle,
 * yani `player-attributes.test.ts` ikisini doğrudan karşılaştırabiliyor.
 * Veritabanı sütun adları snake_case ve onlar **ayrı** bir iddiada
 * (`schema-constraints.itest.ts`) katalogdan okunarak sınanıyor — sabit ile
 * TS alanı uyuşup veritabanı sütunu ayrışabilir, o yüzden iki iddia ayrı.
 */
export const VISIBLE_ATTRIBUTES = {
  /** Teknik (14) */
  technical: [
    'corners',
    'crossing',
    'dribbling',
    'finishing',
    'firstTouch',
    'freeKickTaking',
    'heading',
    'longShots',
    'longThrows',
    'marking',
    'passing',
    'penaltyTaking',
    'tackling',
    'technique',
  ],
  /** Zihinsel (14) */
  mental: [
    'aggression',
    'anticipation',
    'bravery',
    'composure',
    'concentration',
    'decisions',
    'determination',
    'flair',
    'leadership',
    'offTheBall',
    'positioning',
    'teamwork',
    'vision',
    'workRate',
  ],
  /** Fiziksel (8) */
  physical: [
    'acceleration',
    'agility',
    'balance',
    'jumpingReach',
    'naturalFitness',
    'pace',
    'stamina',
    'strength',
  ],
  /** Kaleci (11) */
  goalkeeping: [
    'aerialReach',
    'commandOfArea',
    'communication',
    'eccentricity',
    'handling',
    'kicking',
    'oneOnOnes',
    'reflexes',
    'rushingOut',
    'tendencyToPunch',
    'throwing',
  ],
} as const;

export type VisibleAttributeCategory = keyof typeof VISIBLE_ATTRIBUTES;

export type VisibleAttribute = (typeof VISIBLE_ATTRIBUTES)[VisibleAttributeCategory][number];

export const playerAttributes = masterTable(
  pgTable('player_attributes', {
    /** 1:1 — PK **ve** FK. Ayraç ve gerekçe dosya başlığında. */
    playerId: integer('player_id')
      .primaryKey()
      .references(() => players.id, { onDelete: 'cascade' }),

    // ── Teknik (14) ───────────────────────────────────────────────────────
    corners: smallint('corners').notNull(),
    crossing: smallint('crossing').notNull(),
    dribbling: smallint('dribbling').notNull(),
    finishing: smallint('finishing').notNull(),
    firstTouch: smallint('first_touch').notNull(),
    freeKickTaking: smallint('free_kick_taking').notNull(),
    heading: smallint('heading').notNull(),
    longShots: smallint('long_shots').notNull(),
    longThrows: smallint('long_throws').notNull(),
    marking: smallint('marking').notNull(),
    passing: smallint('passing').notNull(),
    penaltyTaking: smallint('penalty_taking').notNull(),
    tackling: smallint('tackling').notNull(),
    technique: smallint('technique').notNull(),

    // ── Zihinsel (14) ─────────────────────────────────────────────────────
    aggression: smallint('aggression').notNull(),
    anticipation: smallint('anticipation').notNull(),
    bravery: smallint('bravery').notNull(),
    composure: smallint('composure').notNull(),
    concentration: smallint('concentration').notNull(),
    decisions: smallint('decisions').notNull(),
    determination: smallint('determination').notNull(),
    flair: smallint('flair').notNull(),
    leadership: smallint('leadership').notNull(),
    offTheBall: smallint('off_the_ball').notNull(),
    positioning: smallint('positioning').notNull(),
    teamwork: smallint('teamwork').notNull(),
    vision: smallint('vision').notNull(),
    workRate: smallint('work_rate').notNull(),

    // ── Fiziksel (8) ──────────────────────────────────────────────────────
    acceleration: smallint('acceleration').notNull(),
    agility: smallint('agility').notNull(),
    balance: smallint('balance').notNull(),
    jumpingReach: smallint('jumping_reach').notNull(),
    naturalFitness: smallint('natural_fitness').notNull(),
    pace: smallint('pace').notNull(),
    stamina: smallint('stamina').notNull(),
    strength: smallint('strength').notNull(),

    // ── Kaleci (11) ───────────────────────────────────────────────────────
    aerialReach: smallint('aerial_reach').notNull(),
    commandOfArea: smallint('command_of_area').notNull(),
    communication: smallint('communication').notNull(),
    eccentricity: smallint('eccentricity').notNull(),
    handling: smallint('handling').notNull(),
    kicking: smallint('kicking').notNull(),
    oneOnOnes: smallint('one_on_ones').notNull(),
    reflexes: smallint('reflexes').notNull(),
    rushingOut: smallint('rushing_out').notNull(),
    tendencyToPunch: smallint('tendency_to_punch').notNull(),
    throwing: smallint('throwing').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  }),
);
