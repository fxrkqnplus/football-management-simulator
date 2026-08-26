import { describe, expect, it } from 'vitest';

import type { SchemaState } from './loss.js';
import { computeLoss, summarizeLoss } from './loss.js';

const state = (...tables: { table: string; columns: string[]; rowCount: number }[]): SchemaState =>
  tables;

describe('computeLoss', () => {
  it('değişiklik yoksa kayıp bildirmez', () => {
    const before = state({ table: 'countries', columns: ['id', 'key'], rowCount: 6 });
    const report = computeLoss(before, before);
    expect(report.hasStructuralLoss).toBe(false);
    expect(report.totalRowsAtRisk).toBe(0);
  });

  it('düşen tabloyu satır sayısıyla bildirir', () => {
    const report = computeLoss(
      state({ table: 'countries', columns: ['id'], rowCount: 6 }),
      state(),
    );
    expect(report.items).toEqual([{ kind: 'table', table: 'countries', rowsAtRisk: 6 }]);
    expect(report.totalRowsAtRisk).toBe(6);
    expect(report.hasStructuralLoss).toBe(true);
  });

  it('düşen sütunu tablonun satır sayısıyla bildirir', () => {
    const report = computeLoss(
      state({ table: 'clubs', columns: ['id', 'name', 'crest'], rowCount: 118 }),
      state({ table: 'clubs', columns: ['id', 'name'], rowCount: 118 }),
    );
    expect(report.items).toEqual([
      { kind: 'column', table: 'clubs', column: 'crest', rowsAtRisk: 118 },
    ]);
  });

  // BOŞ bir tabloyu düşürmek yapısal kayıptır ama sıfır satır etkiler. Ayrım
  // önemli: koşucu `hasStructuralLoss`a bakıp reddeder, ama rapor operatöre
  // "aslında hiçbir veri yoktu" diyebilir.
  it('boş tabloyu düşürmeyi yapısal kayıp sayar, satır sayısı sıfır kalır', () => {
    const report = computeLoss(state({ table: 'referees', columns: ['id'], rowCount: 0 }), state());
    expect(report.hasStructuralLoss).toBe(true);
    expect(report.totalRowsAtRisk).toBe(0);
  });

  it('EKLENEN tablo ve sütunu kayıp saymaz', () => {
    const report = computeLoss(
      state({ table: 'countries', columns: ['id'], rowCount: 6 }),
      state(
        { table: 'countries', columns: ['id', 'code'], rowCount: 6 },
        { table: 'clubs', columns: ['id'], rowCount: 0 },
      ),
    );
    expect(report.hasStructuralLoss).toBe(false);
  });

  it('birden çok kaybı toplar', () => {
    const report = computeLoss(
      state(
        { table: 'countries', columns: ['id', 'key'], rowCount: 6 },
        { table: 'clubs', columns: ['id'], rowCount: 118 },
      ),
      state({ table: 'countries', columns: ['id'], rowCount: 6 }),
    );
    expect(report.items).toHaveLength(2);
    expect(report.totalRowsAtRisk).toBe(124);
  });
});

describe('summarizeLoss', () => {
  it('kayıp yokken bunu söyler', () => {
    expect(summarizeLoss(computeLoss(state(), state()))).toBe('yapısal kayıp yok');
  });

  it('tablo ve sütun kaybını tek satırda özetler', () => {
    const report = computeLoss(
      state(
        { table: 'countries', columns: ['id'], rowCount: 6 },
        { table: 'clubs', columns: ['id', 'crest'], rowCount: 118 },
      ),
      state({ table: 'clubs', columns: ['id'], rowCount: 118 }),
    );
    const summary = summarizeLoss(report);
    expect(summary).toContain('tablo countries (6 satır)');
    expect(summary).toContain('sütun clubs.crest (118 satır)');
    expect(summary).toContain('toplam 124 satır');
  });
});
