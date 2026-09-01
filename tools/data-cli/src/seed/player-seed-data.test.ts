/**
 * DAĞILIM VERİSİNİN NÖBETÇİSİ — sayılar KRİTERİN KENDİSİ olarak iddia ediliyor.
 *
 * `world-seed-data.test.ts`in biçimi birebir: veri dosyasındaki her sayı burada
 * bir iddiadır, yani bir ağırlığı değiştirmek testi **kırar**. Gerekçe 4.9'a
 * özel ve keskin: kabul kriteri 3'ün (*"20–24 yaş, sağ bek, CA>120"*) zemini
 * bu üç tablodur ve zemin **sessizce** kayarsa 4.10 yanlış bir hacim iddiasının
 * üstüne kurulur.
 *
 * ⚠️ Bu dosya bir **kalibrasyon** kümesini sabitliyor, bir **ölçüm** değil
 * (`player-seed-data.ts` başlığı). Sayıların "doğru" olduğu iddia edilmiyor;
 * **değişmedikleri** iddia ediliyor.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PLAYER_POSITIONS } from '@fms/db';
import { describe, expect, it } from 'vitest';

import {
  ABILITY_BAND_WEIGHTS,
  AGE_WEIGHTS,
  FOOT_PROFILE_WEIGHTS,
  NAME_POOLS,
  NATIONALITY_WEIGHTS,
  POSITION_WEIGHTS,
  SECOND_NATIONALITY_WEIGHT,
  SEED_PLAYER_COUNT,
  SEED_PLAYER_KEY_PREFIX,
  SEED_REFERENCE_DATE,
  seedPlayerKey,
  WEIGHT_TOTAL,
  type Weighted,
} from './player-seed-data.js';
import { SEED_COUNTRIES } from './world-seed-data.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const readDoc = (relative: string): string => readFileSync(path.join(REPO_ROOT, relative), 'utf8');

const sumOf = <T>(table: readonly Weighted<T>[]): number =>
  table.reduce((total, entry) => total + entry.weight, 0);

describe('kabul kriteri 1 — 5.000 sayısı VERİ OLARAK duruyor', () => {
  it('`SEED_PLAYER_COUNT` ROADMAP`in yazdığı sayı', () => {
    expect(SEED_PLAYER_COUNT).toBe(5000);
    // Ve kriterin metni gerçekten bu sayıyı istiyor — sayı devir notundan
    // değil KAYNAKTAN okunuyor (D7).
    expect(readDoc('docs/ROADMAP.md')).toContain('5.000 sahte oyuncu seed → şema tutarlı');
  });
});

describe('`SEED_REFERENCE_DATE` — UYDURULMADI, ROADMAP FAZ 16`dan okundu', () => {
  it('değer 2026-07-01', () => {
    expect(SEED_REFERENCE_DATE).toBe('2026-07-01');
  });

  it('⚠️ GEREKÇE KOŞAN BİR İDDİA: ROADMAP Faz 16 takvimi 1 Temmuz 2026`da başlatıyor', () => {
    // Bu satır kaybolursa veya tarih değişirse test kırılır ve sabit
    // gerekçesiz kalmaz. Bir yorumda dursaydı sessizce bayatlardı.
    expect(readDoc('docs/ROADMAP.md')).toContain('1 Temmuz 2026 başlangıç');
  });

  it('`YYYY-MM-DD` biçiminde ve takvimde GERÇEKTEN var', () => {
    expect(SEED_REFERENCE_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(`${SEED_REFERENCE_DATE}T00:00:00.000Z`).toISOString().slice(0, 10)).toBe(
      SEED_REFERENCE_DATE,
    );
  });
});

describe('ağırlık tablolarının TOPLAMI — dördü de 1.000', () => {
  it.each([
    ['POSITION_WEIGHTS', POSITION_WEIGHTS as readonly Weighted<unknown>[]],
    ['AGE_WEIGHTS', AGE_WEIGHTS as readonly Weighted<unknown>[]],
    ['ABILITY_BAND_WEIGHTS', ABILITY_BAND_WEIGHTS as readonly Weighted<unknown>[]],
    ['FOOT_PROFILE_WEIGHTS', FOOT_PROFILE_WEIGHTS as readonly Weighted<unknown>[]],
    ['NATIONALITY_WEIGHTS', NATIONALITY_WEIGHTS as readonly Weighted<unknown>[]],
  ])('%s toplamı WEIGHT_TOTAL', (_label, table) => {
    expect(sumOf(table)).toBe(WEIGHT_TOTAL);
  });

  it('WEIGHT_TOTAL 1.000', () => {
    expect(WEIGHT_TOTAL).toBe(1000);
  });

  it('hiçbir ağırlık negatif veya sıfır DEĞİL — sıfır bir değeri ERİŞİLEMEZ yapar', () => {
    const tables: readonly (readonly Weighted<unknown>[])[] = [
      POSITION_WEIGHTS,
      AGE_WEIGHTS,
      ABILITY_BAND_WEIGHTS,
      FOOT_PROFILE_WEIGHTS,
      NATIONALITY_WEIGHTS,
    ];
    for (const table of tables) {
      for (const entry of table) expect(entry.weight).toBeGreaterThan(0);
    }
  });
});

describe('MEVKİ dağılımı — küme `players.ts`ten, ağırlıklar kalibrasyon', () => {
  it('kümenin kendisi UYDURULMADI: `PLAYER_POSITIONS` ile BİREBİR aynı sırada', () => {
    expect(POSITION_WEIGHTS.map((entry) => entry.value)).toEqual([...PLAYER_POSITIONS]);
  });

  it('⚠️ `DR` payı SIFIR DEĞİL — kabul kriteri 3`ün birinci yüklemi', () => {
    const dr = POSITION_WEIGHTS.find((entry) => entry.value === 'DR');
    expect(dr?.weight).toBe(70);
  });
});

describe('YAŞ piramidi — 20–24 dilimi kriter 3`ün zemini', () => {
  it('yaşlar 16`dan 38`e KESİNTİSİZ', () => {
    const ages = AGE_WEIGHTS.map((entry) => entry.value);
    expect(ages[0]).toBe(16);
    expect(ages.at(-1)).toBe(38);
    for (let i = 1; i < ages.length; i += 1) {
      expect(ages[i]).toBe((ages[i - 1] ?? Number.NaN) + 1);
    }
  });

  it('⚠️ 20–24 diliminin toplam ağırlığı 355 — zemin sessizce kaymasın', () => {
    const slice = AGE_WEIGHTS.filter((entry) => entry.value >= 20 && entry.value <= 24);
    expect(slice).toHaveLength(5);
    expect(sumOf(slice)).toBe(355);
  });
});

describe('CA bantları — 120 eşiği bir bant SINIRINA denk GELMİYOR', () => {
  it('bantlar artan ve ÇAKIŞMIYOR', () => {
    const bands = ABILITY_BAND_WEIGHTS.map((entry) => entry.value);
    for (const band of bands) expect(band.min).toBeLessThanOrEqual(band.max);
    for (let i = 1; i < bands.length; i += 1) {
      expect(bands[i]?.min).toBeGreaterThan(bands[i - 1]?.max ?? Number.NaN);
    }
  });

  it('⚠️ eşik (120) bir bandın İÇİNDE — sınırda olsaydı ölçüm KIRILGAN olurdu', () => {
    // Eşik bir bant sınırına denk gelseydi, eşiği bir birim oynatmak sonucu
    // uçurumdan atlatırdı: 4.10'un ölçtüğü satır sayısı yüzlerce satır zıplardı.
    const containing = ABILITY_BAND_WEIGHTS.find(
      (entry) => entry.value.min <= 120 && entry.value.max >= 120,
    );
    expect(containing).toBeDefined();
    expect(containing?.value.min).toBeLessThan(120);
    expect(containing?.value.max).toBeGreaterThan(120);
  });

  it('hiçbir bant 1–200 ölçeğinin dışına taşmıyor (`spec/02` §4.2)', () => {
    for (const entry of ABILITY_BAND_WEIGHTS) {
      expect(entry.value.min).toBeGreaterThanOrEqual(1);
      expect(entry.value.max).toBeLessThanOrEqual(200);
    }
  });
});

describe('AYAK profili — ölçek `spec/02`de YOK, kaynak ŞEMA DOSYASI', () => {
  it('⚠️ `spec/02` ayak ölçeğini tanımlamıyor — 0 eşleşme (ölçüldü, varsayılmadı)', () => {
    const spec = readDoc('docs/spec/02-attributes.md');
    expect(spec).not.toContain('preferredFoot');
    expect(spec).not.toContain('preferred_foot');
  });

  it('üç profil var ve `iki_ayakli` bir DERECE — `players.ts`in kendi cümlesi', () => {
    expect(FOOT_PROFILE_WEIGHTS.map((entry) => entry.value.label)).toEqual([
      'sag_baskin',
      'sol_baskin',
      'iki_ayakli',
    ]);
    const twoFooted = FOOT_PROFILE_WEIGHTS[2]?.value;
    expect(twoFooted?.strong).toEqual(twoFooted?.weak);
  });

  it('bütün ayak bantları 1–20 ölçeğinin İÇİNDE', () => {
    for (const entry of FOOT_PROFILE_WEIGHTS) {
      for (const band of [entry.value.strong, entry.value.weak]) {
        expect(band.min).toBeGreaterThanOrEqual(1);
        expect(band.max).toBeLessThanOrEqual(20);
      }
    }
  });
});

describe('UYRUK ve AD havuzları — anahtarlar `SEED_COUNTRIES`te GERÇEKTEN var', () => {
  const countryKeys = new Set(SEED_COUNTRIES.map((row) => row.key));

  it('altı uyruk anahtarının altısı da seed edilmiş bir ülke', () => {
    expect(NATIONALITY_WEIGHTS).toHaveLength(6);
    for (const entry of NATIONALITY_WEIGHTS) {
      expect(countryKeys.has(entry.value)).toBe(true);
    }
  });

  it('⚠️ KARŞI KONTROL: var olmayan bir anahtar bu kümede DEĞİL', () => {
    // Yoksa yukarıdaki iddia "boş kümeye bakıyorum" diye okunabilirdi.
    expect(countryKeys.has('atlantis')).toBe(false);
  });

  it('her uyruğun ad havuzu var — eksik havuz jeneratörü PATLATIR', () => {
    const poolKeys = NAME_POOLS.map((pool) => pool.countryKey).sort();
    expect(poolKeys).toEqual(NATIONALITY_WEIGHTS.map((entry) => entry.value).sort());
  });

  it('havuzlar 8 ad + 8 soyad, hiçbiri boş dizge değil', () => {
    for (const pool of NAME_POOLS) {
      expect(pool.firstNames).toHaveLength(8);
      expect(pool.lastNames).toHaveLength(8);
      for (const name of [...pool.firstNames, ...pool.lastNames]) {
        expect(name.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('ikinci uyruk payı ne 0 ne 1.000 — iki uç da bir kod yolunu ÖLDÜRÜRDÜ', () => {
    expect(SECOND_NATIONALITY_WEIGHT).toBe(150);
    expect(SECOND_NATIONALITY_WEIGHT).toBeGreaterThan(0);
    expect(SECOND_NATIONALITY_WEIGHT).toBeLessThan(WEIGHT_TOTAL);
  });
});

describe('`key` namespace`i — paket anahtarlarından AYRI', () => {
  it('önek `seed-player-` ve `spec/12`nin `player-` biçiminden farklı', () => {
    expect(SEED_PLAYER_KEY_PREFIX).toBe('seed-player-');
    // Paket namespace'i `player-12847` (`spec/12` §17.4). Önek onunla
    // BAŞLAMIYOR, yani bir paket satırı asla bir seed satırıyla çakışamaz.
    expect(SEED_PLAYER_KEY_PREFIX.startsWith('player-')).toBe(false);
  });

  it('sıfır dolgulu ve beş haneli', () => {
    expect(seedPlayerKey(0)).toBe('seed-player-00001');
    expect(seedPlayerKey(9)).toBe('seed-player-00010');
    expect(seedPlayerKey(4999)).toBe('seed-player-05000');
  });

  it('⚠️ SÖZLÜK SIRASI SAYISAL SIRAYLA AYNI — dolgu bir süs değil', () => {
    const keys = [0, 1, 8, 9, 10, 99, 100, 4999].map((index) => seedPlayerKey(index));
    expect([...keys].sort()).toEqual(keys);
    // Karşı örnek: dolgusuz biçim bu sırayı BOZARDI.
    const unpadded = [2, 10].map((index) => `seed-player-${String(index)}`);
    expect([...unpadded].sort()).not.toEqual(unpadded);
  });

  it('5.000 anahtarın 5.000`i benzersiz', () => {
    const keys = new Set(Array.from({ length: SEED_PLAYER_COUNT }, (_, i) => seedPlayerKey(i)));
    expect(keys.size).toBe(SEED_PLAYER_COUNT);
  });
});
