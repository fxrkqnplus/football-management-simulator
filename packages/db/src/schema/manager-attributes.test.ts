/**
 * `manager_attributes` ENVANTER TESTİ — 8 sayısı `spec/01` §3.1'den SAYILDI.
 *
 * Kaynak ölçümü kardeş dosyada (`staff-attributes.test.ts`): `spec/02` personel
 * ve menajer niteliklerinden **hiç söz etmiyor** (0 eşleşme). Üç katmanlı iddia
 * aynı: sabit → TS alanı → veritabanı sütun adı.
 *
 * ⚠️ **İKİ TABLONUN KESİŞİMİ BOŞ DEĞİL — VE BU BEKLENEN.** `negotiating` ve
 * `judgingAbility` ikisinde de var. 4.5'in *"gizli nitelikler görünür tabloda
 * DEĞİL"* testinin **tersi** bir vaka: orada kesişmezlik bir değişmezdi, burada
 * kesişme normaldir. Yazılmazsa bir sonraki okuyucu onu bir kopyala-yapıştır
 * hatası sanıp *"düzeltebilir"*.
 */
import { getTableColumns } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { MANAGER_ATTRIBUTES, managerAttributes } from './manager-attributes.js';
import { STAFF_ATTRIBUTES } from './staff-attributes.js';

const attributes = [...MANAGER_ATTRIBUTES];
const columns = getTableColumns(managerAttributes);

const attributeFields = Object.keys(columns).filter(
  (name) => !['managerId', 'createdAt', 'updatedAt'].includes(name),
);

describe('MANAGER_ATTRIBUTES — `spec/01` §3.1 envanteri', () => {
  it('SEKİZ nitelik — spec sırasıyla, EKSİKSİZ', () => {
    expect(attributes).toEqual([
      'tacticalKnowledge',
      'motivation',
      'playerManagement',
      'youthDevelopment',
      'negotiating',
      'mediaHandling',
      'trainingManagement',
      'judgingAbility',
    ]);
  });

  it('sayı 8 ve 8`inin de adı BENZERSİZ', () => {
    expect(attributes).toHaveLength(8);
    expect(new Set(attributes).size).toBe(8);
  });
});

describe('manager_attributes tablosu — sabit ile BİREBİR aynı', () => {
  it('nitelik sütunları envanterle AYNI ADLARI, AYNI SIRADA taşıyor', () => {
    expect(attributeFields).toEqual(attributes);
  });

  it('tabloda envanter DIŞINDA yalnızca `managerId` ve iki zaman damgası var', () => {
    expect(Object.keys(columns)).toEqual(['managerId', ...attributes, 'createdAt', 'updatedAt']);
  });

  it('her nitelik sütunu snake_case adını taşıyor', () => {
    const toSnake = (name: string): string => name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    for (const field of attributes) {
      expect(columns[field as keyof typeof columns].name).toBe(toSnake(field));
    }
  });

  it('8 niteliğin 8`i de `smallint` ve `NOT NULL`', () => {
    const wrong = attributes.filter((field) => {
      const column = columns[field as keyof typeof columns];
      return column.getSQLType() !== 'smallint' || !column.notNull;
    });
    expect(wrong).toEqual([]);
  });

  /**
   * 1:1 — `manager_id` PK **ve** FK. Ayraç (*"tabloya gelen FK sayısı"*)
   * `manager-attributes.ts` başlığında koşturuldu ve kardeş tablodan
   * KOPYALANMADI: `spec/01` tamamında `managerAttributeId` → 0 eşleşme.
   */
  it('`manager_id` birincil anahtar VE ayrı bir `id` sütunu YOK', () => {
    expect(columns.managerId.primary).toBe(true);
    expect(Object.keys(columns)).not.toContain('id');
  });
});

describe('İKİ NİTELİK TABLOSU KESİŞİYOR — ve bu BEKLENEN', () => {
  /**
   * ⚠️ Kesişim **adıyla** iddia ediliyor. Yalnızca *"kesişim boş değil"*
   * denseydi bir gün kesişim tek elemana düşse ya da başka bir alan eklense
   * test yine geçerdi; tam liste kaymayı görünür kılıyor.
   */
  it('`negotiating` ve `judgingAbility` HER İKİ tabloda da var', () => {
    const shared = attributes.filter((name) =>
      (STAFF_ATTRIBUTES as readonly string[]).includes(name),
    );
    expect(shared.sort()).toEqual(['judgingAbility', 'negotiating']);
  });

  it('kesişim bir HATA değil — iki ayrı varlığın aynı ölçekteki ayrı değerleri', () => {
    // İki sütun, iki tablo, iki satır: bir gözlemcinin değerlendirme yeteneği
    // ile bir menajerinki aynı şey değil. Ortaklaştırmak iki varlığı tek satıra
    // bağlardı ve `spec/01` ikisini de ayrı yazıyor.
    expect(Object.keys(columns)).toContain('negotiating');
    expect(Object.keys(columns)).toContain('judgingAbility');
  });
});
