/**
 * `staff_attributes` ENVANTER TESTİ — 16 sayısı `spec/01` §3.1'den SAYILDI.
 *
 * ⚠️ **VE KAYNAK `spec/02` DEĞİL — ÖLÇÜLDÜ.** Oyuncu niteliklerinin envanteri
 * `spec/02` §4.1'den geliyor (47 + 10) ve refleks burada da oraya bakmak
 * olurdu. `docs/spec/02-attributes.md` içinde `staff` / `manager` → **0
 * eşleşme**. Bu test o ölçümü **koşan** bir iddiaya çeviriyor: biri bir gün
 * personel niteliklerini `spec/02`'ye yazarsa iki kaynak doğar ve ayrışabilir.
 *
 * `player-attributes.test.ts` ile aynı üç katmanlı iddia: sabit → TS alanı →
 * veritabanı sütun adı.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getTableColumns } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { STAFF_ATTRIBUTES, staffAttributes } from './staff-attributes.js';

const attributes = [...STAFF_ATTRIBUTES];
const columns = getTableColumns(staffAttributes);

const attributeFields = Object.keys(columns).filter(
  (name) => !['staffId', 'createdAt', 'updatedAt'].includes(name),
);

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const readDoc = (relative: string): string => readFileSync(path.join(REPO_ROOT, relative), 'utf8');

describe('STAFF_ATTRIBUTES — `spec/01` §3.1 envanteri', () => {
  it('ON ALTI nitelik — spec sırasıyla, EKSİKSİZ', () => {
    expect(attributes).toEqual([
      'attacking',
      'defending',
      'fitness',
      'goalkeeping',
      'technical',
      'tactical',
      'motivating',
      'discipline',
      'judgingAbility',
      'judgingPotential',
      'physiotherapy',
      'sportsScience',
      'scoutingNetwork',
      'adaptability',
      'workingWithYoungsters',
      'negotiating',
    ]);
  });

  it('sayı 16 ve 16`sının da adı BENZERSİZ', () => {
    expect(attributes).toHaveLength(16);
    expect(new Set(attributes).size).toBe(16);
  });
});

describe('KAYNAK `spec/01` — `spec/02` DEĞİL, ölçüldü', () => {
  /**
   * ⚠️ Bu iddia bir **yokluk** hakkında ve tam da bu yüzden yazıldı: bir
   * sonraki oturum *"nitelikler `spec/02`'de olur"* diye düşünüp oraya bakabilir,
   * bulamaz ve sayıyı ROADMAP'ten alabilir — SAPMA-001'in birebir tekrarı.
   */
  it('`spec/02` personel niteliklerinden HİÇ söz etmiyor', () => {
    const attributesSpec = readDoc('docs/spec/02-attributes.md');
    expect(attributesSpec.toLowerCase()).not.toContain('staff');
  });

  it('`spec/01` §3.1 `staff_attributes` bloğunu taşıyor', () => {
    const spec = readDoc('docs/spec/01-database.md');
    expect(spec).toContain('staff_attributes: {');
  });
});

describe('staff_attributes tablosu — sabit ile BİREBİR aynı', () => {
  it('nitelik sütunları envanterle AYNI ADLARI, AYNI SIRADA taşıyor', () => {
    expect(attributeFields).toEqual(attributes);
  });

  it('tabloda envanter DIŞINDA yalnızca `staffId` ve iki zaman damgası var', () => {
    expect(Object.keys(columns)).toEqual(['staffId', ...attributes, 'createdAt', 'updatedAt']);
  });

  it('her nitelik sütunu snake_case adını taşıyor', () => {
    const toSnake = (name: string): string => name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    for (const field of attributes) {
      expect(columns[field as keyof typeof columns].name).toBe(toSnake(field));
    }
  });

  it('16 niteliğin 16`sı da `smallint` ve `NOT NULL`', () => {
    const wrong = attributes.filter((field) => {
      const column = columns[field as keyof typeof columns];
      return column.getSQLType() !== 'smallint' || !column.notNull;
    });
    expect(wrong).toEqual([]);
  });

  /**
   * 1:1 — `staff_id` PK **ve** FK. Ayraç (*"tabloya gelen FK sayısı"*)
   * `staff-attributes.ts` başlığında koşturuldu: `spec/01` tamamında
   * `staffAttributeId` → 0 eşleşme.
   */
  it('`staff_id` birincil anahtar VE ayrı bir `id` sütunu YOK', () => {
    expect(columns.staffId.primary).toBe(true);
    expect(Object.keys(columns)).not.toContain('id');
  });
});
