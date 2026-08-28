/**
 * SEED VERİSİNİN SÖZLEŞMESİ — bir "import testi" DEĞİL.
 *
 * 3.7'nin dersi (`PROJECT_MEMORY.md` günlük #38): bir modülü import edip
 * "çöktü mü" diye bakan test kapsamı yükseltir, **hiçbir şey kanıtlamaz**.
 * Buradaki testlerin her biri veri hakkında bir **iddia** taşıyor ve iddiaların
 * ilki kabul kriterinin kendisi: *"6 ülke + 6 lig + 5 UEFA/yerel kupa"*.
 *
 * ⚠️ Bu dosya aynı zamanda `competitions.rules`ın **tek çalışma zamanı
 * güvencesi**. `competitions.ts` başlığı şart koşuyor: *"jsonb doğrulamayı kendi
 * başına yapmaz … yazan her yol `competitionRulesSchema.parse()`ten geçmek
 * zorunda"*. Seed yazan bir yol; testi de o parse'ı **her satır için** çağırıyor.
 */
import {
  COMPETITION_TYPES,
  competitionRulesSchema,
  DATA_SOURCES,
  externalIdsSchema,
  WORK_PERMIT_RULES,
} from '@fms/db';
import { describe, expect, it } from 'vitest';

import type { CompetitionSeed } from './world-seed-data.js';
import {
  competitionNameKey,
  countryNameKey,
  SEED_COMPETITIONS,
  SEED_COUNTRIES,
  SEED_SOURCE,
} from './world-seed-data.js';

const leagues = SEED_COMPETITIONS.filter((row) => row.type === 'league');
const cups = SEED_COMPETITIONS.filter((row) => row.type !== 'league');
const countryByKey = new Map(SEED_COUNTRIES.map((row) => [row.key, row]));

/** Bir yarışmanın sahibi: ülke kodu (küçük harf) ya da kıta turnuvasında `uefa`. */
function ownerSegment(row: CompetitionSeed): string {
  if (row.countryKey === null) return 'uefa';
  const country = countryByKey.get(row.countryKey);
  // `undefined` dönmesi ayrı bir testin konusu; burada iddiayı bozmamak için
  // görünür bir işaret bırakılıyor, sessiz bir `?? ''` değil.
  return country === undefined ? `BULUNAMADI:${row.countryKey}` : country.code.toLowerCase();
}

describe('kabul kriteri 2 — sayılar', () => {
  it('6 ülke seed ediliyor', () => {
    expect(SEED_COUNTRIES).toHaveLength(6);
  });

  it('6 lig seed ediliyor', () => {
    expect(leagues).toHaveLength(6);
  });

  it('5 kupa seed ediliyor — üçü UEFA, ikisi yerel', () => {
    expect(cups).toHaveLength(5);
    expect(cups.filter((row) => row.type === 'continental')).toHaveLength(3);
    expect(cups.filter((row) => row.type === 'domestic_cup')).toHaveLength(2);
  });

  it('iki yerel kupa İKİ FARKLI ülkeden — FK çözümlemesi tek ülkeye hapsolmuyor', () => {
    const owners = cups.filter((row) => row.type === 'domestic_cup').map((row) => row.countryKey);
    expect(new Set(owners).size).toBe(2);
  });

  it('nullable ikilinin dört vakasından ÜÇÜ temsil ediliyor', () => {
    // (dolu, dolu) lig · (dolu, NULL) yerel kupa · (NULL, NULL) kıta turnuvası.
    // (NULL, dolu) bilerek yok: kademe ülkeye ait, ülkesiz kademe anlamsız.
    const shapes = new Set(
      SEED_COMPETITIONS.map(
        (row) => `${String(row.countryKey !== null)}/${String(row.tier !== null)}`,
      ),
    );
    expect([...shapes].sort()).toEqual(['false/false', 'true/false', 'true/true']);
  });
});

describe('veri paketi sütunları (§3.1.0)', () => {
  it('`source` kapalı kümeden geliyor', () => {
    expect(DATA_SOURCES).toContain(SEED_SOURCE);
  });

  it('her `externalIds` Zod`dan geçiyor', () => {
    for (const row of [...SEED_COUNTRIES, ...SEED_COMPETITIONS]) {
      expect(() => externalIdsSchema.parse(row.externalIds)).not.toThrow();
    }
  });

  it('`externalIds` şeması DOLU nesneyi de kabul ediyor', () => {
    // Seed satırlarının hepsi boş (gerekçe: D1 — doğrulanmamış bir Q-kimliği
    // yazılmaz). Şemanın dolu yolu yine de kapsanıyor, sentetik değerle.
    expect(externalIdsSchema.parse({ wikidata: 'Q170084', apiFootball: 645 })).toEqual({
      wikidata: 'Q170084',
      apiFootball: 645,
    });
  });

  it('`externalIds` YAZIM HATASINI reddediyor — strictObject ısırıyor', () => {
    expect(() => externalIdsSchema.parse({ wikidatta: 'Q170084' })).toThrow();
  });

  it('anahtarlar tablo başına benzersiz', () => {
    expect(new Set(SEED_COUNTRIES.map((row) => row.key)).size).toBe(SEED_COUNTRIES.length);
    expect(new Set(SEED_COMPETITIONS.map((row) => row.key)).size).toBe(SEED_COMPETITIONS.length);
  });

  it('kodlar tablo başına benzersiz — `ON CONFLICT (key)` bu kısıtı GÖRMÜYOR', () => {
    // Bu test, `seed-sql.ts`in kapatmadığı deliğin **veri tarafındaki** yarısı:
    // seed verisi kendi içinde `code` çakıştırmazsa çalışan koşu 23505 almaz.
    // Deliğin veritabanı tarafı entegrasyon testinde görünür tutuluyor.
    expect(new Set(SEED_COUNTRIES.map((row) => row.code)).size).toBe(SEED_COUNTRIES.length);
    expect(new Set(SEED_COMPETITIONS.map((row) => row.code)).size).toBe(SEED_COMPETITIONS.length);
  });

  it('anahtarlar `spec/12` §17.3 slug biçiminde — yalnızca küçük harf ve rakam', () => {
    // §17.3'ün son adımı `[^a-z0-9]` siliyor. Bir anahtara tire veya büyük harf
    // sızarsa slug'la eşleşmez ve Faz 8 ingesti varlığı İKİLER.
    for (const row of [...SEED_COUNTRIES, ...SEED_COMPETITIONS]) {
      expect(row.key).toMatch(/^[a-z0-9]+$/);
    }
  });
});

describe('K5 — görünen ad koda gömülmez, i18n anahtarı türetilir', () => {
  it('ülke anahtarı `country.<kod>` biçiminde', () => {
    expect(countryNameKey('TUR')).toBe('country.tur');
    expect(SEED_COUNTRIES.map((row) => countryNameKey(row.code))).toContain('country.eng');
  });

  it('yarışma anahtarında YALNIZCA ilk alt çizgi noktaya döner', () => {
    expect(competitionNameKey('TUR_SUPERLIG')).toBe('competition.tur.superlig');
    expect(competitionNameKey('UEFA_UCL')).toBe('competition.uefa.ucl');
    // İki alt çizgili vaka: ikincisi KORUNUR, aksi hâlde `competition.eng.fa.cup`
    // olur ve anahtar üç seviyeye çıkardı.
    expect(competitionNameKey('ENG_FA_CUP')).toBe('competition.eng.fa_cup');
  });

  it('her yarışmanın anahtarı SAHİBİNİ gösteriyor — kod ile ülke ayrışamaz', () => {
    for (const row of SEED_COMPETITIONS) {
      const [, segment] = competitionNameKey(row.code).split('.');
      expect(segment).toBe(ownerSegment(row));
    }
  });

  it('üretilen anahtarların hepsi benzersiz — Faz 5 çeviri dosyasının girdisi', () => {
    const keys = [
      ...SEED_COUNTRIES.map((row) => countryNameKey(row.code)),
      ...SEED_COMPETITIONS.map((row) => competitionNameKey(row.code)),
    ];
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('ülkeler', () => {
  it('`work_permit_rule_key` kapalı kümeden geliyor (CHECK kısıtıyla aynı liste)', () => {
    for (const row of SEED_COUNTRIES) {
      expect(WORK_PERMIT_RULES).toContain(row.workPermitRuleKey);
    }
  });

  it('`uefa_coefficient` DİZGE olarak taşınıyor — numeric hassasiyeti korunuyor', () => {
    for (const row of SEED_COUNTRIES) {
      expect(typeof row.uefaCoefficient).toBe('string');
      expect(row.uefaCoefficient).toMatch(/^\d+\.\d{3}$/);
    }
  });

  it('`currency_code` üç harf — sütun `char(3)`', () => {
    for (const row of SEED_COUNTRIES) {
      expect(row.currencyCode).toHaveLength(3);
      expect(row.code).toHaveLength(3);
    }
  });
});

describe('yarışmalar', () => {
  it('her `rules` nesnesi `competitionRulesSchema.parse()`ten geçiyor', () => {
    for (const row of SEED_COMPETITIONS) {
      expect(() => competitionRulesSchema.parse(row.rules)).not.toThrow();
    }
  });

  it('`competitionRulesSchema` TANINMAYAN ANAHTARI reddediyor — nöbetçi çalışıyor', () => {
    // Karşı örnek: yukarıdaki "hepsi geçiyor" testi, şema her şeyi kabul etse de
    // geçerdi. Bu satır şemanın gerçekten ısırdığını gösteriyor.
    const [first] = SEED_COMPETITIONS;
    expect(first).toBeDefined();
    expect(() => competitionRulesSchema.parse({ ...first?.rules, maxForeing: 14 })).toThrow();
  });

  it('`type` kapalı kümeden geliyor (CHECK kısıtıyla aynı liste)', () => {
    for (const row of SEED_COMPETITIONS) {
      expect(COMPETITION_TYPES).toContain(row.type);
    }
  });

  it('her `countryKey` `SEED_COUNTRIES`te GERÇEKTEN var', () => {
    // Yazım hatası taşıyan bir anahtar veritabanında SESSİZ kalırdı: skaler alt
    // sorgu `NULL` döner, `country_id` nullable, hiçbir kısıt ötmez.
    for (const row of SEED_COMPETITIONS) {
      if (row.countryKey === null) continue;
      expect(countryByKey.has(row.countryKey)).toBe(true);
    }
  });

  it('altı ligin hepsi `tier: 1` ve bir ülkeye bağlı', () => {
    for (const row of leagues) {
      expect(row.tier).toBe(1);
      expect(row.countryKey).not.toBeNull();
    }
  });

  it('üç kıta turnuvası ülkesiz ve kademesiz', () => {
    for (const row of SEED_COMPETITIONS.filter((entry) => entry.type === 'continental')) {
      expect(row.countryKey).toBeNull();
      expect(row.tier).toBeNull();
    }
  });

  it('altı ligin hepsi farklı bir ülkeye ait — 6 ülke, 6 lig', () => {
    expect(new Set(leagues.map((row) => row.countryKey)).size).toBe(6);
  });

  it('Süper Lig `playoffSpots: 0` — CLAUDE.md §16.2 ③', () => {
    // Anayasa play-off formatını bilinen bir belirsizlik olarak sayıyor ve
    // varsayılanı **0** diye bağlıyor. `competition-rules.ts` yorumundaki
    // *"Türkiye: 4"* alanın anlamını gösteren bir örnek, bir veri kararı değil.
    const superLig = SEED_COMPETITIONS.find((row) => row.code === 'TUR_SUPERLIG');
    expect(superLig?.rules.playoffSpots).toBe(0);
  });

  it('hiçbir lig v1`de olmayan bir üst kademeye yükselmiyor', () => {
    // 2. ve 3. lig kademeleri v2 kasasında (CLAUDE.md §16.1).
    for (const row of leagues) {
      expect(row.rules.promotionCount).toBe(0);
    }
  });
});

describe('seed KENDİ İÇİNDE tutarlı', () => {
  it('Avrupa kontenjanı takım sayısını aşmıyor', () => {
    for (const row of SEED_COMPETITIONS) {
      const { ucl, uel, uecl } = row.rules.continentalSpots;
      expect(ucl + uel + uecl).toBeLessThanOrEqual(row.rules.teamCount);
    }
  });

  it('düşen takım sayısı takım sayısını aşmıyor', () => {
    for (const row of SEED_COMPETITIONS) {
      expect(row.rules.relegationCount).toBeLessThan(row.rules.teamCount);
    }
  });

  it('kontenjan veren her yarışmanın İŞARET ETTİĞİ turnuva seed ediliyor', () => {
    // Asıl iddia bu: bir lig `ucl: 4` diyorsa gidilecek yer TABLODA olmalı.
    // Olmasaydı Faz 16'nın takvimi var olmayan bir yarışmaya bilet keserdi.
    const codeByCompetition = { ucl: 'UEFA_UCL', uel: 'UEFA_UEL', uecl: 'UEFA_UECL' } as const;
    const seededCodes = new Set(SEED_COMPETITIONS.map((row) => row.code));

    for (const row of SEED_COMPETITIONS) {
      for (const [slot, code] of Object.entries(codeByCompetition)) {
        if (row.rules.continentalSpots[slot as keyof typeof codeByCompetition] > 0) {
          expect(seededCodes.has(code)).toBe(true);
        }
      }
    }
  });

  it('üç UEFA kontenjanının hepsi EN AZ BİR yarışma tarafından kullanılıyor', () => {
    // Ters yön: üç turnuvayı seed edip hiçbirine bilet kesmemek de tutarsızlık
    // olurdu — tüketicisi olmayan satır, bu projenin reddettiği "temenni" (D3).
    const used = { ucl: 0, uel: 0, uecl: 0 };
    for (const row of SEED_COMPETITIONS) {
      used.ucl += row.rules.continentalSpots.ucl;
      used.uel += row.rules.continentalSpots.uel;
      used.uecl += row.rules.continentalSpots.uecl;
    }
    expect(used.ucl).toBeGreaterThan(0);
    expect(used.uel).toBeGreaterThan(0);
    expect(used.uecl).toBeGreaterThan(0);
  });

  it('sezon ayları 1-12 aralığında', () => {
    for (const row of SEED_COMPETITIONS) {
      expect(row.seasonStartMonth).toBeGreaterThanOrEqual(1);
      expect(row.seasonStartMonth).toBeLessThanOrEqual(12);
      expect(row.seasonEndMonth).toBeGreaterThanOrEqual(1);
      expect(row.seasonEndMonth).toBeLessThanOrEqual(12);
    }
  });
});
