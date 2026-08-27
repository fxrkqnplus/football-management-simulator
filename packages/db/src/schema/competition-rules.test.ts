/**
 * `competitionRulesSchema` birim testleri.
 *
 * ⚠️ **Negatif testler burada asıl kanıttır.** Faz 3.2b'de ölçüldü: bir
 * doğrulayıcı köreltildiğinde 16 testin **yalnızca 1'i** kırıldı ve o da tek
 * negatif testti — on beş pozitif test kör bir kontrolle de geçiyordu
 * (`docs/spec/09-quality-protocol.md` §11.5). Bu dosyada her kısıtın kendi
 * reddi ayrıca sınanıyor; `parse` başarılı diye şema doğru sayılmıyor.
 */
import { describe, expect, it } from 'vitest';

import type { CompetitionRules } from './competition-rules.js';
import { COMPETITION_FORMATS, competitionRulesSchema, TIEBREAKERS } from './competition-rules.js';

/** Süper Lig'e benzeyen, geçerli bir taban. Testler bunun üzerinde oynuyor. */
const base: CompetitionRules = {
  teamCount: 18,
  format: 'round_robin_double',
  pointsWin: 3,
  pointsDraw: 1,
  relegationCount: 3,
  promotionCount: 0,
  playoffSpots: 0,
  continentalSpots: { ucl: 2, uel: 1, uecl: 1 },
  tiebreakers: ['points', 'head_to_head', 'goal_diff', 'goals_for'],
  squadRegistration: { maxSquadSize: 25, maxForeign: 14, homegrownMin: null, u21Exempt: true },
  varEnabled: true,
  substitutionsAllowed: 5,
  substitutionWindows: 3,
  extraTimeSubstitution: true,
  yellowCardSuspensionThresholds: [5, 10, 15],
  transferWindows: [
    { start: '06-11', end: '09-08' },
    { start: '01-06', end: '02-04' },
  ],
};

/** Taban üzerinde tek bir alanı değiştirip ham nesne olarak döner. */
function withField(field: string, value: unknown): unknown {
  return { ...base, [field]: value };
}

describe('competitionRulesSchema — sabit tablolar', () => {
  it('spec/01 §3.1 formatlarını EKSİKSİZ taşıyor', () => {
    expect([...COMPETITION_FORMATS]).toEqual([
      'round_robin_double',
      'round_robin_single',
      'knockout',
      'group_knockout',
      'swiss',
    ]);
  });

  it('spec/01 §3.1 eşitlik bozma ölçütlerini EKSİKSİZ taşıyor', () => {
    expect([...TIEBREAKERS]).toEqual(['points', 'goal_diff', 'goals_for', 'head_to_head', 'wins']);
  });
});

describe('competitionRulesSchema — kabul', () => {
  it('geçerli lig kuralları geçiyor ve tip korunuyor', () => {
    const parsed = competitionRulesSchema.parse(base);
    expect(parsed.squadRegistration.maxForeign).toBe(14);
    expect(parsed.transferWindows).toHaveLength(2);
  });

  it('kadro sınırlarının üçü de `null` olabiliyor — sınır YOK demek', () => {
    const parsed = competitionRulesSchema.parse(
      withField('squadRegistration', {
        maxSquadSize: null,
        maxForeign: null,
        homegrownMin: null,
        u21Exempt: false,
      }),
    );
    expect(parsed.squadRegistration.maxSquadSize).toBeNull();
  });

  it('kupa formatı: transfer dönemi ve sarı kart eşiği boş olabilir', () => {
    const parsed = competitionRulesSchema.parse({
      ...base,
      format: 'knockout',
      transferWindows: [],
      yellowCardSuspensionThresholds: [],
    });
    expect(parsed.format).toBe('knockout');
  });
});

describe('competitionRulesSchema — RED (asıl kanıt)', () => {
  it('tanınmayan anahtar reddediliyor — yazım hatası SESSİZ geçmiyor', () => {
    // `maxForeing` gerçek bir yazım hatası sınıfı: gevşek bir şemada geçer,
    // kural hiç uygulanmaz ve Faz 35 kadro kaydı yanlış çalışır.
    const result = competitionRulesSchema.safeParse({ ...base, maxForeing: 14 });
    expect(result.success).toBe(false);
  });

  it('iç içe nesnede de tanınmayan anahtar reddediliyor', () => {
    const result = competitionRulesSchema.safeParse(
      withField('squadRegistration', { ...base.squadRegistration, maxForeing: 14 }),
    );
    expect(result.success).toBe(false);
  });

  it('bilinmeyen format reddediliyor', () => {
    expect(competitionRulesSchema.safeParse(withField('format', 'group_stage')).success).toBe(
      false,
    );
  });

  it('bilinmeyen eşitlik bozma ölçütü reddediliyor', () => {
    expect(
      competitionRulesSchema.safeParse(withField('tiebreakers', ['points', 'coin_toss'])).success,
    ).toBe(false);
  });

  it('BOŞ eşitlik bozma listesi reddediliyor — eşitliği hiç bozamaz', () => {
    expect(competitionRulesSchema.safeParse(withField('tiebreakers', [])).success).toBe(false);
  });

  it('ondalıklı takım sayısı reddediliyor', () => {
    expect(competitionRulesSchema.safeParse(withField('teamCount', 18.5)).success).toBe(false);
  });

  it('iki takımdan az lig reddediliyor', () => {
    expect(competitionRulesSchema.safeParse(withField('teamCount', 1)).success).toBe(false);
  });

  it('negatif küme düşme sayısı reddediliyor', () => {
    expect(competitionRulesSchema.safeParse(withField('relegationCount', -1)).success).toBe(false);
  });

  it('negatif kıta kotası reddediliyor', () => {
    expect(
      competitionRulesSchema.safeParse(withField('continentalSpots', { ucl: -1, uel: 1, uecl: 1 }))
        .success,
    ).toBe(false);
  });

  it('eksik alan reddediliyor', () => {
    const { varEnabled: _omitted, ...withoutVar } = base;
    expect(competitionRulesSchema.safeParse(withoutVar).success).toBe(false);
  });

  it.each([
    ['2026-06-11', 'yıl taşıyor'],
    ['13-01', 'ay 13'],
    ['06-32', 'gün 32'],
    ['6-1', 'sıfır dolgusu yok'],
    ['06/11', 'ayraç yanlış'],
    ['00-11', 'ay 00'],
    ['06-00', 'gün 00'],
  ])('geçersiz transfer dönemi tarihi reddediliyor: %s (%s)', (start) => {
    expect(
      competitionRulesSchema.safeParse(withField('transferWindows', [{ start, end: '09-08' }]))
        .success,
    ).toBe(false);
  });

  it('29 Şubat KABUL ediliyor — artık yıl bilgisi bu tipte yok', () => {
    expect(
      competitionRulesSchema.safeParse(
        withField('transferWindows', [{ start: '02-29', end: '03-01' }]),
      ).success,
    ).toBe(true);
  });
});
