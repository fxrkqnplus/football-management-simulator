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

/** Faz 3 şemasının ÖLÇÜLMÜŞ sınıfları (PG 18.6, 11 tablo, canlı katalogdan). */
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

/**
 * Faz 4'ün PLANLANAN tabloları — **ölçülmüş değil, kararlaştırılmış**.
 *
 * ⚠️ Ayrım bilerek yapıldı (D1): yukarıdaki harita canlı `information_schema`'dan
 * okundu, bu harita 4.1'in kapsam kararından geliyor ve tablolar **henüz yok**.
 * Üçüncü olgunun (`SET NULL`) testleri gerçek bir vakaya ihtiyaç duyuyor ve
 * Faz 3'te öyle bir FK **yok** — hepsi ya NOT NULL ya bağımsız kaynaklı.
 *
 * `people` **`key` taşıyacak** (4.1 Karar 3, ölçümle: `people` taşırsa kural
 * 20/20, `players` taşırsa 17/20) → `independent`.
 * `players` `key` taşımayacak + giden FK'sı var → `satellite`.
 *
 * 4.3 bu tabloları yazdığında entegrasyon testi sınıfları **katalogdan** okuyup
 * doğrulayacak; o gün bu harita gerçekle karşılaşır.
 */
const PLANNED_CLASSES: Readonly<Record<string, TableClass>> = {
  people: 'independent',
  players: 'satellite',
};

const classOf = (table: string): TableClass =>
  CLASSES[table] ?? PLANNED_CLASSES[table] ?? 'independent';

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

/** Kısaltma: üç olguyu tek yerde toplar, testler okunur kalsın. */
const fk = (sourceTable: string, targetTable: string, allSourceColumnsNullable = false) => ({
  name: `${sourceTable}_${targetTable}_fk`,
  sourceTable,
  targetTable,
  allSourceColumnsNullable,
});

describe('expectedDeleteAction — türetilen davranış', () => {
  it('uydudan bağımsız varlığa (NOT NULL) → CASCADE', () => {
    expect(expectedDeleteAction(fk('club_facilities', 'clubs'), classOf)).toBe('CASCADE');
  });

  it('bağımsız varlıktan bağımsız varlığa → RESTRICT', () => {
    expect(expectedDeleteAction(fk('clubs', 'countries'), classOf)).toBe('RESTRICT');
  });

  it('⚠️ UYDUDAN SÖZLÜĞE → RESTRICT, CASCADE DEĞİL (⑧`in var olma sebebi)', () => {
    // ③ körlemesine uygulansaydı burası CASCADE olurdu ve bir şablon
    // silindiğinde kulübün forma satırı ALAKASIZ bir sebeple yok olurdu.
    expect(expectedDeleteAction(fk('club_kits', 'kit_templates'), classOf)).toBe('RESTRICT');
  });

  it('KARŞI ÖRNEK: aynı KAYNAK tablodan bağımsız varlığa → CASCADE', () => {
    // Aynı `club_kits` tablosundan çıkan diğer FK CASCADE alıyor. İki satır
    // birlikte gösteriyor ki ayraç kaynak değil **hedef**.
    expect(expectedDeleteAction(fk('club_kits', 'clubs'), classOf)).toBe('CASCADE');
  });

  it('sözlükten çıkan FK (ulaşılamaz vaka) sessiz bir varsayılana düşmüyor', () => {
    expect(expectedDeleteAction(fk('kit_templates', 'clubs'), classOf)).toBe('RESTRICT');
  });
});

/**
 * FAZ 4.2'DE EKLENEN ÜÇÜNCÜ OLGU — ve SIRANIN kendisi bir iddia.
 *
 * Faz 3'ün 12 FK'sında bir uydunun FK'sı **her zaman sahibini** gösteriyordu;
 * Faz 4 bu tesadüfü bozuyor (`players.club_id` = *"null = serbest oyuncu"*).
 */
describe('expectedDeleteAction — ③ SET NULL, uydudan çıkan REFERANS bağı', () => {
  it('uydudan bağımsız varlığa, NULLABLE → SET NULL (CASCADE DEĞİL)', () => {
    // Faz 4'ün asıl vakası: kulüp silinince oyuncular SİLİNMEZ, serbest kalır.
    expect(expectedDeleteAction(fk('players', 'clubs', true), classOf)).toBe('SET NULL');
  });

  it('KARŞI ÖRNEK: aynı kaynak, NOT NULL bir FK → CASCADE', () => {
    // Ayraç kaynak tablo değil, FK'nın kendisi: `players.person_id` sahiplik bağı.
    expect(expectedDeleteAction(fk('players', 'people', false), classOf)).toBe('CASCADE');
  });

  it('⚠️ SIRA: bağımsız varlıktan çıkan NULLABLE FK → RESTRICT, SET NULL DEĞİL', () => {
    // Bu, ② ile ③ arasındaki sıranın tek satırlık kanıtı. Sıra tersine
    // çevrilirse (planda "V1") burası SET NULL döner ve aşağıdaki üç gerçek
    // FK'nın davranışı bozulur.
    expect(expectedDeleteAction(fk('clubs', 'stadiums', true), classOf)).toBe('RESTRICT');
  });

  it('⚠️ SIRA: hedef SÖZLÜK ise nullable olsa DA RESTRICT (① hepsinden önce)', () => {
    expect(expectedDeleteAction(fk('club_kits', 'kit_templates', true), classOf)).toBe('RESTRICT');
  });
});

/**
 * V1'İN ELENMESİ — ölçülmüş bir yanlış kuralın negatif testi.
 *
 * *"Nullable ise SET NULL"* ayracı örneklerden geriye okununca doğru görünüyor
 * (**F3**). Ölçüldü: Faz 3'ün ÜÇ gerçek FK'sını bozuyor. Bu üç satır o üç vakayı
 * **adıyla** sabitliyor — sıra bir gün "okunabilirlik için" değiştirilirse
 * üçü birden kırılır ve gerekçe testin başlığında yazılı olur.
 */
describe('V1 REDDEDİLDİ — nullable denetimi `independent`ten ÖNCE gelseydi bozulacak üç FK', () => {
  it.each([
    ['competitions_country_id_countries_id_fk', 'competitions', 'countries'],
    ['clubs_competition_id_competitions_id_fk', 'clubs', 'competitions'],
    ['clubs_stadium_id_stadiums_id_fk', 'clubs', 'stadiums'],
  ])('%s — nullable AMA RESTRICT', (name, sourceTable, targetTable) => {
    expect(
      expectedDeleteAction(
        { name, sourceTable, targetTable, allSourceColumnsNullable: true },
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
  /**
   * ⚠️ **Dördüncü sütun (`nullable`) 4.2'de eklendi ve MİGRATION SQL'İNDEN
   * okundu**, tahmin edilmedi: `packages/db/drizzle/*.sql`'in `CREATE TABLE`
   * blokları. Üçü nullable (`clubs.competition_id`, `clubs.stadium_id`,
   * `competitions.country_id`) ve **üçü de RESTRICT** — kuralın sırası tam
   * olarak bunu korumak için ②'yi ③'ten önce koyuyor.
   */
  it.each([
    ['club_facilities_club_id_clubs_id_fk', 'club_facilities', 'clubs', false, 'CASCADE'],
    ['club_finances_base_club_id_clubs_id_fk', 'club_finances_base', 'clubs', false, 'CASCADE'],
    ['club_kits_club_id_clubs_id_fk', 'club_kits', 'clubs', false, 'CASCADE'],
    ['club_kits_template_id_kit_templates_id_fk', 'club_kits', 'kit_templates', false, 'RESTRICT'],
    ['clubs_competition_id_competitions_id_fk', 'clubs', 'competitions', true, 'RESTRICT'],
    ['clubs_country_id_countries_id_fk', 'clubs', 'countries', false, 'RESTRICT'],
    ['clubs_stadium_id_stadiums_id_fk', 'clubs', 'stadiums', true, 'RESTRICT'],
    ['competitions_country_id_countries_id_fk', 'competitions', 'countries', true, 'RESTRICT'],
    ['federations_country_id_countries_id_fk', 'federations', 'countries', false, 'CASCADE'],
    ['referees_country_id_countries_id_fk', 'referees', 'countries', false, 'RESTRICT'],
    ['rivalries_club_a_id_clubs_id_fk', 'rivalries', 'clubs', false, 'CASCADE'],
    ['rivalries_club_b_id_clubs_id_fk', 'rivalries', 'clubs', false, 'CASCADE'],
  ])('%s → %s', (name, sourceTable, targetTable, allSourceColumnsNullable, expected) => {
    expect(
      expectedDeleteAction({ name, sourceTable, targetTable, allSourceColumnsNullable }, classOf),
    ).toBe(expected);
  });

  it('⚠️ HİÇBİRİ `SET NULL` ALMIYOR — ve bu bir bulgu, bir eksiklik değil', () => {
    // Bugünkü şemada üçüncü olgunun tetiklendiği TEK BİR FK yok: nullable olan
    // üçü de bağımsız bir varlıktan çıkıyor ve ②'de RESTRICT alıyor. Yani
    // `SET NULL` dalı ENTEGRASYON katmanında bugün ERİŞİLMİYOR — ilk gerçek
    // vaka 4.3'ün `players.club_id`'si. Bu satır o boşluğu görünür tutuyor:
    // 4.3'ten sonra kırılacak ve kırıldığında güncellenecek.
    const actions = new Set(
      [
        ['clubs', 'competitions', true],
        ['clubs', 'stadiums', true],
        ['competitions', 'countries', true],
        ['club_facilities', 'clubs', false],
        ['club_kits', 'kit_templates', false],
      ].map(([source, target, nullable]) =>
        expectedDeleteAction(
          {
            name: 'fk',
            sourceTable: source as string,
            targetTable: target as string,
            allSourceColumnsNullable: nullable as boolean,
          },
          classOf,
        ),
      ),
    );
    expect([...actions].sort()).toEqual(['CASCADE', 'RESTRICT']);
  });
});
