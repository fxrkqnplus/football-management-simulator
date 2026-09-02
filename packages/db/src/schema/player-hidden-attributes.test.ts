/**
 * `player_hidden_attributes` ENVANTER TESTİ — 10 sayısı ROADMAP'ten değil,
 * `spec/02` §4.1'den sayılarak geldi.
 *
 * ⚠️ **BU TABLO SAPMA-001'İN KENDİ VAKASI.** Yol haritası **8** gizli nitelik
 * diyordu; `spec/02` §4.5 `adaptability` ve `temperament`i ekledi → **10**, ve
 * ROADMAP iki yerde **adıyla** sekiz saymaya Faz 3.0'a kadar devam etti. Yani
 * burada bir sayıyı yanlış yerden almanın bedeli **ölçülmüş** durumda.
 *
 * `player-attributes.test.ts` ile aynı üç katmanlı iddia: sabit → TS alanı →
 * veritabanı sütun adı. Liste iddiası, sayı iddiası değil (4.4: *"özetler
 * körlenebilir, envanterler kör kalmaz"*).
 */
import { getTableColumns } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { playerAttributes } from './player-attributes.js';
import { HIDDEN_ATTRIBUTES, playerHiddenAttributes } from './player-hidden-attributes.js';

const hidden = [...HIDDEN_ATTRIBUTES];

const attributeFields = Object.keys(getTableColumns(playerHiddenAttributes)).filter(
  (name) => !['playerId', 'createdAt', 'updatedAt'].includes(name),
);

describe('HIDDEN_ATTRIBUTES — `spec/02` §4.1 envanteri', () => {
  it('ON gizli nitelik — spec sırasıyla, EKSİKSİZ', () => {
    expect(hidden).toEqual([
      'consistency',
      'importantMatches',
      'injuryProneness',
      'dirtiness',
      'pressure',
      'professionalism',
      'ambition',
      'loyalty',
      'adaptability',
      'temperament',
    ]);
  });

  it('sayı 10 ve 10`unun da adı BENZERSİZ', () => {
    expect(hidden).toHaveLength(10);
    expect(new Set(hidden).size).toBe(10);
  });

  /**
   * ⚠️ SAPMA-001'İN İKİ NİTELİĞİ AYRICA VE ADIYLA İDDİA EDİLİYOR.
   *
   * Uzunluk kontrolü (`toHaveLength(10)`) bu ikisinin kaybını yakalar ama
   * **sebebini göstermez**: bir sonraki oturum 8'e düşmüş bir listeyi görüp
   * *"ROADMAP sekiz diyor, düzeltelim"* diyebilir. Adıyla yazılmış bir iddia,
   * kırıldığında hangi kararın ihlal edildiğini söylüyor.
   */
  it('`adaptability` ve `temperament` SAPMA-001 ile geldi ve LİSTEDE', () => {
    expect(hidden).toContain('adaptability');
    expect(hidden).toContain('temperament');
  });
});

describe('player_hidden_attributes tablosu — sabit ile BİREBİR aynı', () => {
  it('nitelik sütunları envanterle AYNI ADLARI, AYNI SIRADA taşıyor', () => {
    expect(attributeFields).toEqual(hidden);
  });

  it('tabloda envanter DIŞINDA yalnızca `playerId` ve iki zaman damgası var', () => {
    expect(Object.keys(getTableColumns(playerHiddenAttributes))).toEqual([
      'playerId',
      ...hidden,
      'createdAt',
      'updatedAt',
    ]);
  });

  it('her gizli nitelik sütunu snake_case adını taşıyor', () => {
    const toSnake = (name: string): string => name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    const columns = getTableColumns(playerHiddenAttributes);
    for (const field of hidden) {
      expect(columns[field as keyof typeof columns].name).toBe(toSnake(field));
    }
  });

  it('10 niteliğin 10`u da `NOT NULL` — veri yoksa spec üretim yolu veriyor', () => {
    const columns = getTableColumns(playerHiddenAttributes);
    const nullable = hidden.filter((field) => !columns[field as keyof typeof columns].notNull);
    expect(nullable).toEqual([]);
  });
});

describe('İKİ NİTELİK TABLOSU AYRI — birleştirilmedi', () => {
  /**
   * ⚠️ 47 + 10 = 57 sütunluk **tek** bir tablo da mümkündü ve `spec/01` onu
   * ayırıyor. Ayrımın gerekçesi görünürlük: gizli nitelikler kullanıcıya asla
   * sayı olarak gösterilmiyor (`spec/02` §4.1) ve ileride bir okuma yolu
   * (`WorldView`, Faz 12) *"görünür olanları ver"* diyebilmeli. Tek tabloda bu
   * bir sütun listesi disiplini olurdu; iki tabloda bir **tip**.
   *
   * Bu test ayrımın korunduğunu iddia ediyor: birleştirme sessizce yapılamaz.
   */
  it('gizli nitelikler görünür nitelik tablosunda DEĞİL', () => {
    const visibleFields = Object.keys(getTableColumns(playerAttributes));
    for (const field of hidden) {
      expect(visibleFields).not.toContain(field);
    }
  });

  it('görünür nitelikler gizli nitelik tablosunda DEĞİL — ayrım İKİ YÖNLÜ', () => {
    const visibleFields = Object.keys(getTableColumns(playerAttributes)).filter(
      (name) => !['playerId', 'createdAt', 'updatedAt'].includes(name),
    );
    for (const field of visibleFields) {
      expect(attributeFields).not.toContain(field);
    }
  });
});
