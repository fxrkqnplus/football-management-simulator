/**
 * ÜRETECİN NÖBETÇİSİ — determinizm, saflık ve İNŞA GEREĞİ DEĞİŞMEZLER.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ *"İKİ KOŞU AYNI"* TEK BAŞINA KÖR BİR KONTROLDÜR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Sabit dönen bir üreteç de *"iki koşu aynı"* testini geçer — üstelik
 * **mükemmel** geçer. §11.5'in başındaki ölçümün (*"on beş pozitif test kör bir
 * karşılaştırıcıyla da geçiyordu"*) birebir aynı sınıfı. Bu yüzden aşağıda
 * determinizm iddiasının **yanında** bir de bağımlılık iddiası duruyor:
 * *"satır i, satır j'den FARKLI"* ve *"her akış gerçekten dağılıyor"*.
 * `streamValue`i indeksten bağımsız hâle getiren bir mutasyon **o** testleri
 * kırar; yalnızca determinizme bakan bir test onu göremezdi.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * DÖRT SAYI KİLİTLİ — VE BUNLAR 4.10'UN ÜZERİNDE DURACAĞI ZEMİN
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `DR` sayısı · `20–24` sayısı · `CA > 120` sayısı · ve üçünün **kesişimi**.
 * Dördü de **ölçülerek** yazıldı (tahmin edilmedi) ve burada iddia ediliyor.
 * Sıfır çıksaydı dağılım yanlış olurdu, test değil (3.9'un `< 20 ms` vakası).
 */
import { ageRangeToBirthDateRange, PLAYER_POSITIONS } from '@fms/db';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  birthDateForAge,
  derivePotential,
  generatePlayerAt,
  generatePlayerSeeds,
  streamValue,
} from './player-generator.js';
import {
  ABILITY_CEILING,
  NAME_POOLS,
  PG_INTEGER_MAX,
  SEED_PLAYER_COUNT,
  SEED_PLAYER_KEY_PREFIX,
  SEED_REFERENCE_DATE,
  seedPlayerKey,
} from './player-seed-data.js';

/** Tek sefer üretilip paylaşılıyor — 5.000 satır her testte yeniden üretilmesin. */
const SET = generatePlayerSeeds();

afterEach(() => {
  vi.restoreAllMocks();
});

describe('K2 — determinizm, VE determinizmin kör kontrol OLMADIĞI', () => {
  it('aynı çağrı BİREBİR aynı kümeyi veriyor', () => {
    expect(generatePlayerSeeds(200)).toEqual(generatePlayerSeeds(200));
  });

  it('⚠️ NÖBETÇİ: satırlar birbirinden FARKLI — sabit dönen bir üreteç bunu KIRAR', () => {
    // `streamValue` indeksi yok sayarsa (mutasyon) 5.000 satır eşitlenir ve
    // aşağıdaki üç iddia birden düşer.
    const first = generatePlayerAt(0);
    const second = generatePlayerAt(1);
    expect(first.person.key).not.toBe(second.person.key);
    expect(JSON.stringify(first.player)).not.toBe(JSON.stringify(second.player));

    // Ve tek bir çift değil, küme çapında: her akış gerçekten dağılıyor.
    expect(new Set(SET.players.map((row) => row.primaryPosition)).size).toBe(
      PLAYER_POSITIONS.length,
    );
    expect(new Set(SET.people.map((row) => row.age)).size).toBeGreaterThan(20);
    expect(new Set(SET.players.map((row) => row.currentAbility)).size).toBeGreaterThan(100);
    expect(new Set(SET.people.map((row) => row.portraitSeed)).size).toBe(SEED_PLAYER_COUNT);
  });

  it('ilk `n` satır, 5.000`lik kümenin ilk `n` satırıyla AYNI — sıralı tüketim yok', () => {
    // Sıralı bir sayaçtan tüketilseydi bu iddia da geçerdi, ama araya bir alan
    // eklendiği gün sessizce düşerdi. Numaralı akışlarda yapısal olarak doğru.
    const small = generatePlayerSeeds(50);
    expect(small.people).toEqual(SET.people.slice(0, 50));
    expect(small.players).toEqual(SET.players.slice(0, 50));
  });

  it('⚠️ `portrait_seed` PostgreSQL `integer` TAVANINI AŞMIYOR — ödenmiş bedel (günlük #34)', () => {
    // Üreteç işaretsiz 32 bit çalışıyor; `people.portrait_seed` **işaretli**
    // 32 bit. İlk hâli gerçek PostgreSQL'de `integer out of range` ile patladı.
    // Nöbetçi artık burada — bir sonraki sefer birim testinde ötecek.
    for (const person of SET.people) {
      expect(person.portraitSeed).toBeGreaterThanOrEqual(0);
      expect(person.portraitSeed).toBeLessThanOrEqual(PG_INTEGER_MAX);
      expect(Number.isInteger(person.portraitSeed)).toBe(true);
    }
    // Karşı kontrol: tavana YAKIN değerler gerçekten üretiliyor, yani iddia
    // "hepsi küçük sayı" diye bedavaya geçmiyor.
    expect(Math.max(...SET.people.map((row) => row.portraitSeed))).toBeGreaterThan(
      PG_INTEGER_MAX * 0.9,
    );
  });

  it('`streamValue` işaretsiz 32 bit döndürüyor ve akışlar birbirinden BAĞIMSIZ', () => {
    for (const index of [0, 1, 4999]) {
      for (const stream of [1, 9, 17]) {
        const value = streamValue(index, stream);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(0xffffffff);
      }
      // Aynı indeks, farklı akış → farklı değer.
      expect(streamValue(index, 1)).not.toBe(streamValue(index, 2));
    }
  });
});

describe('K3`ün ruhu — üreteç SAF (motor değil, ama aynı disiplin)', () => {
  it('⚠️ `Math.random` ve `Date.now` ÇAĞRILMIYOR — koşan bir iddia, yorum değil', () => {
    // İkisi de patlayacak şekilde değiştiriliyor. Üretim yine de tamamlanıyorsa
    // hiçbiri çağrılmamıştır. `grep` bunu kanıtlayamazdı: dolaylı bir çağrı
    // (`new Date()` gibi) aramaya takılmazdı.
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Math.random çağrıldı — K2 ihlali');
    });
    const now = vi.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('Date.now çağrıldı — determinizm ihlali');
    });

    expect(() => generatePlayerSeeds(500)).not.toThrow();
    expect(random).not.toHaveBeenCalled();
    expect(now).not.toHaveBeenCalled();
  });
});

describe('KABUL KRİTERİ 1 — 5.000 satır, iki tablo, tek geçiş', () => {
  it('5.000 kişi ve 5.000 oyuncu', () => {
    expect(SET.people).toHaveLength(SEED_PLAYER_COUNT);
    expect(SET.players).toHaveLength(SEED_PLAYER_COUNT);
  });

  it('`people.key` 5.000`i de benzersiz ve hepsi seed namespace`inde', () => {
    const keys = SET.people.map((row) => row.key);
    expect(new Set(keys).size).toBe(SEED_PLAYER_COUNT);
    for (const key of keys) expect(key.startsWith(SEED_PLAYER_KEY_PREFIX)).toBe(true);
  });

  it('`players.personKey` `people.key` ile satır satır HİZALI', () => {
    // Hizasızlık FK tarafından yakalanmazdı: yanlış kişinin oyuncusu da
    // geçerli bir satırdır (G-17'nin tam olarak uyardığı şey).
    for (let index = 0; index < SEED_PLAYER_COUNT; index += 1) {
      expect(SET.players[index]?.personKey).toBe(seedPlayerKey(index));
      expect(SET.people[index]?.key).toBe(seedPlayerKey(index));
    }
  });
});

describe('İNŞA GEREĞİ DEĞİŞMEZLER — `0007`nin CHECK kısıtları (4.5)', () => {
  it('5.000 satırın 5.000`inde `CA <= PA`', () => {
    expect(SET.players.filter((row) => row.currentAbility > row.potentialAbility)).toEqual([]);
  });

  it('5.000 satırın 5.000`inde `pa_range_min <= pa_range_max`', () => {
    expect(SET.players.filter((row) => row.paRangeMin > row.paRangeMax)).toEqual([]);
  });

  it('bant `[CA, 200]` aralığında — `spec/02` §4.4`ün `clamp(CA, 200, …)`i', () => {
    for (const row of SET.players) {
      expect(row.paRangeMin).toBeGreaterThanOrEqual(row.currentAbility);
      expect(row.paRangeMax).toBeLessThanOrEqual(ABILITY_CEILING);
      expect(row.potentialAbility).toBeLessThanOrEqual(ABILITY_CEILING);
    }
  });

  it('`derivePotential` — genç oyuncu BAŞ HEADROOM alıyor, zirvedeki almıyor', () => {
    const young = derivePotential(100, 18, 0);
    // youthBonus = (22 − 18) × 4 = 16 → PA = 116.
    expect(young.potentialAbility).toBe(116);
    const peak = derivePotential(100, 27, 0);
    // yearsToPeak = 0, youthBonus = 0 → PA = CA.
    expect(peak.potentialAbility).toBe(100);
  });

  it('`derivePotential` tavanı 200`ü AŞMIYOR — kelepçe iki yönlü', () => {
    const capped = derivePotential(195, 16, 3);
    expect(capped.potentialAbility).toBe(ABILITY_CEILING);
    expect(capped.paRangeMax).toBe(ABILITY_CEILING);
    expect(capped.paRangeMin).toBeGreaterThanOrEqual(195);
  });

  it('belirsizlik bandı yaşla DARALIYOR (`spec/02` §4.4)', () => {
    const teenager = derivePotential(120, 16, 0);
    const veteran = derivePotential(120, 34, 0);
    expect(teenager.paRangeMax - teenager.paRangeMin).toBeGreaterThan(
      veteran.paRangeMax - veteran.paRangeMin,
    );
  });
});

describe('DOĞUM TARİHİ — sorgunun KENDİ çevriminden üretiliyor', () => {
  it('her satırın doğum tarihi, kendi yaşının PENCERESİNİN içinde', () => {
    for (const person of SET.people) {
      const window = ageRangeToBirthDateRange(person.age, person.age, SEED_REFERENCE_DATE);
      expect(person.birthDate >= window.from).toBe(true);
      expect(person.birthDate <= window.to).toBe(true);
    }
  });

  it('pencerenin İKİ UCU da üretilebiliyor — kelepçe bir ucu kesmiyor', () => {
    const window = ageRangeToBirthDateRange(25, 25, SEED_REFERENCE_DATE);
    const days: string[] = [];
    for (let offset = 0; offset < 400; offset += 1) days.push(birthDateForAge(25, offset));
    expect(days).toContain(window.from);
    expect(days).toContain(window.to);
    // Ve pencerenin DIŞINA hiç taşmıyor.
    for (const day of days) {
      expect(day >= window.from && day <= window.to).toBe(true);
    }
  });
});

describe('⚠️ 4.10`UN ZEMİNİ — kriter 3`ün yüklemine uyan satır sayısı ÖLÇÜLDÜ', () => {
  const range = ageRangeToBirthDateRange(20, 24, SEED_REFERENCE_DATE);

  const matchesByDate = SET.players.filter((player, index) => {
    const person = SET.people[index];
    return (
      person !== undefined &&
      person.birthDate >= range.from &&
      person.birthDate <= range.to &&
      player.primaryPosition === 'DR' &&
      player.currentAbility > 120
    );
  });

  it('üç yüklemin her biri tek başına ANLAMLI bir küme veriyor', () => {
    expect(SET.players.filter((row) => row.primaryPosition === 'DR')).toHaveLength(389);
    expect(SET.people.filter((row) => row.age >= 20 && row.age <= 24)).toHaveLength(1776);
    expect(SET.players.filter((row) => row.currentAbility > 120)).toHaveLength(1106);
  });

  it('KESİŞİM 27 satır — SIFIR DEĞİL, ve 5.000`in tamamı da değil', () => {
    // Sıfır olsaydı 4.10 boş bir sonuç kümesini ölçerdi ve *"< 50 ms"* hiçbir
    // şey kanıtlamazdı (3.9'un `< 20 ms` vakası). Tamamı olsaydı da ölçmezdi:
    // ayraç hacim değil SEÇİCİLİK. 27 / 5.000 = %0,54.
    expect(matchesByDate).toHaveLength(27);
    expect(matchesByDate.length).toBeGreaterThan(0);
    expect(matchesByDate.length).toBeLessThan(SEED_PLAYER_COUNT / 100);
  });

  it('⚠️ KARŞI KONTROL: tarih yüklemi ile `age` alanı AYNI satırları seçiyor', () => {
    // Bu, çevrimin doğru kullanıldığının kanıtı. Gün seçiminde bir kayma olsaydı
    // (pencere sayısı yanlış hesaplansaydı) iki sayı AYRIŞIRDI — ve ayrışma
    // sessiz olurdu: iki sayı da makul görünürdü.
    const byAgeField = SET.players.filter((player, index) => {
      const person = SET.people[index];
      return (
        person !== undefined &&
        person.age >= 20 &&
        person.age <= 24 &&
        player.primaryPosition === 'DR' &&
        player.currentAbility > 120
      );
    });
    expect(byAgeField).toHaveLength(matchesByDate.length);
    expect(byAgeField.map((row) => row.personKey)).toEqual(
      matchesByDate.map((row) => row.personKey),
    );
  });
});

describe('UYRUK ve AD — türetme tutarlı', () => {
  it('ikinci uyruk BİRİNCİDEN FARKLI — aynısı bir veri hatası olurdu', () => {
    const same = SET.people.filter(
      (row) =>
        row.secondNationalityCountryKey !== null &&
        row.secondNationalityCountryKey === row.nationalityCountryKey,
    );
    expect(same).toEqual([]);
  });

  it('ikinci uyruklu satırlar VAR ve tamamı değil — iki uç da kod yolu öldürürdü', () => {
    const withSecond = SET.people.filter((row) => row.secondNationalityCountryKey !== null);
    expect(withSecond.length).toBeGreaterThan(0);
    expect(withSecond.length).toBeLessThan(SEED_PLAYER_COUNT);
  });

  it('ad, kişinin UYRUĞUNUN havuzundan geliyor', () => {
    for (const person of SET.people) {
      const pool = NAME_POOLS.find((entry) => entry.countryKey === person.nationalityCountryKey);
      expect(pool).toBeDefined();
      expect(pool?.firstNames).toContain(person.firstName);
      expect(pool?.lastNames).toContain(person.lastName);
    }
  });

  it('Türkçe karakterli adlar KÜMEDE var — Faz 9`un arama kriterinin ilk yemi', () => {
    expect(SET.people.some((row) => /[çğıöşüÇĞİÖŞÜ]/.test(`${row.firstName}${row.lastName}`))).toBe(
      true,
    );
  });
});

describe('FİZİKSEL değerler ölçeklerin içinde', () => {
  it('ayak yetkinlikleri 1–20 (`players.ts`in kendi yorumu)', () => {
    for (const row of SET.players) {
      expect(row.preferredFootRight).toBeGreaterThanOrEqual(1);
      expect(row.preferredFootRight).toBeLessThanOrEqual(20);
      expect(row.preferredFootLeft).toBeGreaterThanOrEqual(1);
      expect(row.preferredFootLeft).toBeLessThanOrEqual(20);
    }
  });

  it('boy ve kilo `smallint` aralığında ve birbirine BAĞLI', () => {
    for (const row of SET.players) {
      expect(row.heightCm).toBeGreaterThanOrEqual(160);
      expect(row.heightCm).toBeLessThanOrEqual(210);
      // Kilo boydan türetiliyor: bağımsız çekilseydi 165 cm / 95 kg doğardı.
      expect(Math.abs(row.weightKg - (row.heightCm - 100))).toBeLessThanOrEqual(8);
    }
  });

  it('kaleciler ORTALAMA daha uzun — mevkiye bağlı taban gerçekten işliyor', () => {
    const mean = (rows: readonly { heightCm: number }[]): number =>
      rows.reduce((sum, row) => sum + row.heightCm, 0) / rows.length;
    const keepers = SET.players.filter((row) => row.primaryPosition === 'GK');
    const outfield = SET.players.filter((row) => row.primaryPosition !== 'GK');
    expect(mean(keepers)).toBeGreaterThan(mean(outfield));
  });
});
