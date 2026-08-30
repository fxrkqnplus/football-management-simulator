/**
 * `player_attributes` ENVANTER TESTİ — 47 sayısı ROADMAP'ten değil, `spec/02`
 * §4.1'den sayılarak geldi (SAPMA-001 bu sınıftı).
 *
 * ⚠️ **BİR SAYI İDDİASI ÖZETTİR, BİR LİSTE İDDİASI ENVANTERDİR** — 4.4'ün
 * dersi (*"özetler körlenebilir, envanterler kör kalmaz"*). Buradaki testler
 * `toHaveLength(47)` ile yetinmiyor: `toEqual([...])` ile **adları** iddia
 * ediyor. `finishing` yanlışlıkla `finising` yazılsaydı bir uzunluk kontrolü
 * bunu geçirirdi.
 *
 * Üç ayrı iddia var ve üçü de gerekiyor:
 *
 * | İddia | Neyi yakalar |
 * |---|---|
 * | ① `VISIBLE_ATTRIBUTES` kategori listeleri | sabitin `spec/02`'den sapması |
 * | ② sabit ↔ tablo TS alanları | tabloya fazladan/eksik sütun |
 * | ③ tablo alanı ↔ veritabanı sütun adı | camelCase → snake_case eşlemesinin bozulması |
 *
 * ⚠️ Veritabanının **gerçekten** bu sütunları taşıdığı burada kanıtlanamaz — bir
 * birim testi Postgres'e sormaz (2.3b dersi). O iddia
 * `integration/schema-constraints.itest.ts`te katalogdan okunuyor.
 */
import { getTableColumns } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { playerAttributes, VISIBLE_ATTRIBUTES } from './player-attributes.js';

/** `spec/02` §4.1'in dört kategorisi, o sırayla. */
const CATEGORIES = ['technical', 'mental', 'physical', 'goalkeeping'] as const;

const allVisible = CATEGORIES.flatMap((category) => [...VISIBLE_ATTRIBUTES[category]]);

/** Tablo alanları eksi 1:1 anahtarı ve zaman damgaları. */
const attributeFields = Object.keys(getTableColumns(playerAttributes)).filter(
  (name) => !['playerId', 'createdAt', 'updatedAt'].includes(name),
);

describe('VISIBLE_ATTRIBUTES — `spec/02` §4.1 envanteri', () => {
  it('Teknik (14) — spec sırasıyla, EKSİKSİZ', () => {
    expect([...VISIBLE_ATTRIBUTES.technical]).toEqual([
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
    ]);
  });

  it('Zihinsel (14) — spec sırasıyla, EKSİKSİZ', () => {
    expect([...VISIBLE_ATTRIBUTES.mental]).toEqual([
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
    ]);
  });

  it('Fiziksel (8) — spec sırasıyla, EKSİKSİZ', () => {
    expect([...VISIBLE_ATTRIBUTES.physical]).toEqual([
      'acceleration',
      'agility',
      'balance',
      'jumpingReach',
      'naturalFitness',
      'pace',
      'stamina',
      'strength',
    ]);
  });

  it('Kaleci (11) — spec sırasıyla, EKSİKSİZ', () => {
    expect([...VISIBLE_ATTRIBUTES.goalkeeping]).toEqual([
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
    ]);
  });

  /**
   * ⚠️ KATEGORİ SAYILARI **ve** TOPLAM — ikisi ayrı ayrı.
   *
   * `spec/02` §4.1 kategori başlıklarında sayıyı da yazıyor (`Teknik (14)`).
   * Toplam tek başına iddia edilseydi, iki kategori arasında kayan bir nitelik
   * (`heading` Teknik'ten Zihinsel'e) **görünmezdi** — toplam yine 47 olurdu.
   */
  it('kategori sayıları spec başlıklarıyla aynı: 14 · 14 · 8 · 11', () => {
    expect(CATEGORIES.map((category) => VISIBLE_ATTRIBUTES[category].length)).toEqual([
      14, 14, 8, 11,
    ]);
  });

  it('toplam 47 ve 47`sinin de adı BENZERSİZ — kopya bir sayımı şişirirdi', () => {
    expect(allVisible).toHaveLength(47);
    expect(new Set(allVisible).size).toBe(47);
  });
});

describe('player_attributes tablosu — sabit ile BİREBİR aynı', () => {
  /**
   * ⚠️ Bu testin varlık sebebi: sabit `spec/02`'yi izliyor, tablo Drizzle'da
   * elle yazıldı. İkisi ayrışabilir ve **hiçbir kapı ötmez** — `typecheck` bir
   * eksik sütunu göremez (Drizzle sütun tanımı tip hatası üretmez, 4.4'te
   * ölçüldü), `lint` de göremez.
   */
  it('nitelik sütunları envanterle AYNI ADLARI, AYNI SIRADA taşıyor', () => {
    expect(attributeFields).toEqual(allVisible);
  });

  it('tabloda envanter DIŞINDA yalnızca `playerId` ve iki zaman damgası var', () => {
    const all = Object.keys(getTableColumns(playerAttributes));
    expect(all).toEqual(['playerId', ...allVisible, 'createdAt', 'updatedAt']);
  });

  /**
   * VERİTABANI SÜTUN ADLARI — camelCase → snake_case eşlemesi.
   *
   * Ayrı bir iddia: TS alan adı doğru olup veritabanı adı yanlış yazılabilir
   * (`smallint('firstTouch')`) ve yukarıdaki iki test bunu **geçirirdi**.
   * Beklenen dönüşüm mekanik, o yüzden burada da mekanik olarak türetiliyor —
   * elle yazılmış 47 satırlık ikinci bir liste, ilkinin kopyası olurdu.
   */
  it('her nitelik sütunu snake_case adını taşıyor', () => {
    const toSnake = (name: string): string => name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    const columns = getTableColumns(playerAttributes);
    for (const field of allVisible) {
      expect(columns[field as keyof typeof columns].name).toBe(toSnake(field));
    }
  });

  it('47 niteliğin 47`si de `NOT NULL` — kaleci niteliği saha oyuncusunda da yazılır', () => {
    const columns = getTableColumns(playerAttributes);
    const nullable = allVisible.filter((field) => !columns[field as keyof typeof columns].notNull);
    expect(nullable).toEqual([]);
  });
});

/**
 * ⚠️ **CHECK YOKLUĞU BURADA İDDİA EDİLMİYOR — VE BU BİLİNÇLİ.**
 *
 * SAPMA-028'in *"47 sütunun hiçbiri CHECK almaz"* kararı bir **veritabanı**
 * iddiasıdır ve bir birim testi Postgres'e sormaz (2.3b dersi). Drizzle'ın iç
 * yapısından kısıt listesi okumaya çalışmak, ölçtüğünü sandığın şeyi ölçmeyen
 * bir test üretirdi (D2). İddia `integration/schema-constraints.itest.ts`te
 * `pg_constraint` katalogdan okunarak sınanıyor: *"kısıt eklemeyi unuttuk"* ile
 * *"kısıt bilerek konmadı"* aynı şemayı üretir; ayıran tek şey koşan bir
 * iddiadır.
 */
