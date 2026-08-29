/**
 * `ON DELETE` KURALININ BİRİM TESTİ — saf sınıflandırma, veritabanı yok.
 *
 * İş bölümü `migrate/executor.ts` başlığındaki ile aynı:
 *   birim testi  → **kararı** kapsar (kural doğru sınıfa mı koyuyor)
 *   entegrasyon  → **gerçeği** kapsar (veritabanı gerçekten öyle mi)
 *
 * Buradaki en kritik iddia `kit_templates` vakası: ⑧'in üçüncü sınıfı. Kural
 * yalnızca ③'ü uygulasaydı `club_kits.template_id` CASCADE alırdı ve test bunu
 * yakalar — `spec/01` §3.1.2 ⑧'in var olma sebebi bir testte sabitlenmiş oluyor.
 */
import { describe, expect, it } from 'vitest';

import type { TableClass } from './fk-policy.js';
import { classifyTable, expectedDeleteAction } from './fk-policy.js';

/** Faz 3 şemasının ölçülmüş sınıfları (PG 18.6, 11 tablo). */
const CLASSES: Readonly<Record<string, TableClass>> = {
  club_facilities: 'satellite',
  club_finances_base: 'satellite',
  club_kits: 'satellite',
  clubs: 'independent',
  competitions: 'independent',
  countries: 'independent',
  federations: 'satellite',
  kit_templates: 'dictionary',
  referees: 'independent',
  rivalries: 'satellite',
  stadiums: 'independent',
};

const classOf = (table: string): TableClass => CLASSES[table] ?? 'independent';

describe('classifyTable — §3.1.2 ③ + ⑧', () => {
  it('`key` taşıyan tablo BAĞIMSIZ VARLIK', () => {
    expect(classifyTable({ hasKeyColumn: true, hasOutgoingForeignKey: false })).toBe('independent');
  });

  it('`key` taşıyan tablo giden FK`sı OLSA DA bağımsız kalır', () => {
    // `clubs` üç FK taşıyor ama pakette kendi kaydı var — uydu değil.
    expect(classifyTable({ hasKeyColumn: true, hasOutgoingForeignKey: true })).toBe('independent');
  });

  it('`key` yok + giden FK var → UYDU', () => {
    expect(classifyTable({ hasKeyColumn: false, hasOutgoingForeignKey: true })).toBe('satellite');
  });

  it('`key` yok + giden FK YOK → SÖZLÜK (⑧`in üçüncü sınıfı)', () => {
    // "Sahipsiz": bir uydunun tanımı gereği sahibine FK'sı vardır.
    expect(classifyTable({ hasKeyColumn: false, hasOutgoingForeignKey: false })).toBe('dictionary');
  });
});

describe('expectedDeleteAction — türetilen davranış', () => {
  it('uydudan bağımsız varlığa → CASCADE', () => {
    expect(
      expectedDeleteAction(
        { name: 'fk', sourceTable: 'club_facilities', targetTable: 'clubs' },
        classOf,
      ),
    ).toBe('CASCADE');
  });

  it('bağımsız varlıktan bağımsız varlığa → RESTRICT', () => {
    expect(
      expectedDeleteAction({ name: 'fk', sourceTable: 'clubs', targetTable: 'countries' }, classOf),
    ).toBe('RESTRICT');
  });

  it('⚠️ UYDUDAN SÖZLÜĞE → RESTRICT, CASCADE DEĞİL (⑧`in var olma sebebi)', () => {
    // ③ körlemesine uygulansaydı burası CASCADE olurdu ve bir şablon
    // silindiğinde kulübün forma satırı ALAKASIZ bir sebeple yok olurdu.
    expect(
      expectedDeleteAction(
        { name: 'fk', sourceTable: 'club_kits', targetTable: 'kit_templates' },
        classOf,
      ),
    ).toBe('RESTRICT');
  });

  it('KARŞI ÖRNEK: aynı KAYNAK tablodan bağımsız varlığa → CASCADE', () => {
    // Aynı `club_kits` tablosundan çıkan diğer FK CASCADE alıyor. İki satır
    // birlikte gösteriyor ki ayraç kaynak değil **hedef**.
    expect(
      expectedDeleteAction({ name: 'fk', sourceTable: 'club_kits', targetTable: 'clubs' }, classOf),
    ).toBe('CASCADE');
  });

  it('sözlükten çıkan FK (ulaşılamaz vaka) sessiz bir varsayılana düşmüyor', () => {
    expect(
      expectedDeleteAction(
        { name: 'fk', sourceTable: 'kit_templates', targetTable: 'clubs' },
        classOf,
      ),
    ).toBe('RESTRICT');
  });
});

describe('Faz 3`ün on iki FK`sı — kural, ölçülen davranışın TAMAMINI üretiyor', () => {
  /**
   * Bu tablo `pg_constraint`ten okunan gerçek davranışın kopyası (PG 18.6).
   * Entegrasyon testi aynı karşılaştırmayı **canlı** veritabanına karşı yapıyor;
   * burada kural, veritabanı olmadan da sabitlenmiş oluyor.
   */
  it.each([
    ['club_facilities_club_id_clubs_id_fk', 'club_facilities', 'clubs', 'CASCADE'],
    ['club_finances_base_club_id_clubs_id_fk', 'club_finances_base', 'clubs', 'CASCADE'],
    ['club_kits_club_id_clubs_id_fk', 'club_kits', 'clubs', 'CASCADE'],
    ['club_kits_template_id_kit_templates_id_fk', 'club_kits', 'kit_templates', 'RESTRICT'],
    ['clubs_competition_id_competitions_id_fk', 'clubs', 'competitions', 'RESTRICT'],
    ['clubs_country_id_countries_id_fk', 'clubs', 'countries', 'RESTRICT'],
    ['clubs_stadium_id_stadiums_id_fk', 'clubs', 'stadiums', 'RESTRICT'],
    ['competitions_country_id_countries_id_fk', 'competitions', 'countries', 'RESTRICT'],
    ['federations_country_id_countries_id_fk', 'federations', 'countries', 'CASCADE'],
    ['referees_country_id_countries_id_fk', 'referees', 'countries', 'RESTRICT'],
    ['rivalries_club_a_id_clubs_id_fk', 'rivalries', 'clubs', 'CASCADE'],
    ['rivalries_club_b_id_clubs_id_fk', 'rivalries', 'clubs', 'CASCADE'],
  ])('%s → %s', (name, sourceTable, targetTable, expected) => {
    expect(expectedDeleteAction({ name, sourceTable, targetTable }, classOf)).toBe(expected);
  });
});
