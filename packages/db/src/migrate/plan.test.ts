import { describe, expect, it } from 'vitest';

import type { MigrationJournalEntry } from './journal.js';
import type { AppliedMigration } from './plan.js';
import { assertAppliedConsistent, planDown, planUp } from './plan.js';

const journalEntry = (idx: number, tag: string): MigrationJournalEntry => ({
  idx,
  version: '7',
  when: 1787754340213 + idx,
  tag,
  breakpoints: true,
});

const appliedRecord = (idx: number, tag: string, hash = `h${String(idx)}`): AppliedMigration => ({
  idx,
  tag,
  hash,
});

const ORDERED = [journalEntry(0, '0000_a'), journalEntry(1, '0001_b'), journalEntry(2, '0002_c')];

describe('assertAppliedConsistent', () => {
  const hashes = new Map([
    ['0000_a', 'h0'],
    ['0001_b', 'h1'],
    ['0002_c', 'h2'],
  ]);
  const hashOf = (tag: string): string | undefined => hashes.get(tag);

  it('tutarlı durumda sessiz kalır', () => {
    expect(() => {
      assertAppliedConsistent(
        [appliedRecord(0, '0000_a'), appliedRecord(1, '0001_b')],
        ORDERED,
        hashOf,
      );
    }).not.toThrow();
  });

  it('journal’da olmayan uygulanmış migration’ı yakalar', () => {
    expect(() => {
      assertAppliedConsistent([appliedRecord(0, '0000_x')], ORDERED, hashOf);
    }).toThrow(expect.objectContaining({ code: 'migration.appliedMissingFromJournal' }));
  });

  it('sıra uyuşmazlığını yakalar', () => {
    expect(() => {
      assertAppliedConsistent([appliedRecord(1, '0000_a')], ORDERED, hashOf);
    }).toThrow(expect.objectContaining({ code: 'migration.appliedIdxMismatch' }));
  });

  it('SQL dosyası kaybolmuş migration’ı yakalar', () => {
    expect(() => {
      assertAppliedConsistent([appliedRecord(0, '0000_a')], ORDERED, () => undefined);
    }).toThrow(expect.objectContaining({ code: 'migration.appliedFileMissing' }));
  });

  // Bu, `dist` bayatlığının veritabanı sürümü (plan.ts başlığı): dosya sonradan
  // düzenlenirse `up` "yapacak bir şey yok" der ama şema tanımı karşılamaz.
  it('uygulandıktan SONRA düzenlenmiş dosyayı yakalar', () => {
    expect(() => {
      assertAppliedConsistent([appliedRecord(0, '0000_a', 'ESKI_HASH')], ORDERED, hashOf);
    }).toThrow(expect.objectContaining({ code: 'migration.appliedHashMismatch' }));
  });
});

describe('planUp', () => {
  it('hiç uygulanmamışken hepsini sırayla döner', () => {
    expect(planUp(ORDERED, []).map((item) => item.tag)).toEqual(['0000_a', '0001_b', '0002_c']);
  });

  it('kısmen uygulanmışken yalnızca kalanları döner', () => {
    const pending = planUp(ORDERED, [appliedRecord(0, '0000_a'), appliedRecord(1, '0001_b')]);
    expect(pending.map((item) => item.tag)).toEqual(['0002_c']);
  });

  // İdempotenslik: ikinci `up` çağrısının hiçbir şey yapmamasının sebebi bu.
  it('hepsi uygulanmışken boş döner', () => {
    const applied = [
      appliedRecord(0, '0000_a'),
      appliedRecord(1, '0001_b'),
      appliedRecord(2, '0002_c'),
    ];
    expect(planUp(ORDERED, applied)).toEqual([]);
  });

  it('uygulananlar dizisindeki boşluğu yakalar', () => {
    expect(() => planUp(ORDERED, [appliedRecord(0, '0000_a'), appliedRecord(2, '0002_c')])).toThrow(
      expect.objectContaining({ code: 'migration.appliedGap' }),
    );
  });
});

describe('planDown', () => {
  const applied = [
    appliedRecord(0, '0000_a'),
    appliedRecord(1, '0001_b'),
    appliedRecord(2, '0002_c'),
  ];

  it('en yeniden en eskiye sıralar', () => {
    expect(planDown(applied, 2).map((item) => item.tag)).toEqual(['0002_c', '0001_b']);
  });

  it.each([
    ['sıfır', 0],
    ['negatif', -1],
    ['ondalık', 1.5],
    ['NaN', Number.NaN],
  ])('%s adım sayısını reddeder', (_name, steps) => {
    expect(() => planDown(applied, steps)).toThrow(
      expect.objectContaining({ code: 'migration.downStepsInvalid' }),
    );
  });

  it('uygulanandan fazla adım isteğini reddeder', () => {
    expect(() => planDown(applied, 4)).toThrow(
      expect.objectContaining({ code: 'migration.downStepsTooMany' }),
    );
  });

  it('girdi dizisini değiştirmez', () => {
    planDown(applied, 3);
    expect(applied.map((item) => item.tag)).toEqual(['0000_a', '0001_b', '0002_c']);
  });
});
