/**
 * §3.1.0 sütun sözleşmesinin birim testleri.
 *
 * İki ayrı şey sınanıyor:
 *
 * **① Sabit tablo bütünlüğü.** `DATA_SOURCES` beş değeri **tam olarak** taşıyor
 * mu. Bu, `arch:check`in meta-testiyle aynı sınıf koruma: bir tablo kırpılırsa
 * onu okuyan her şey sessizce daralır (`PROJECT_MEMORY.md` günlük #54). Buradaki
 * tablo hem TypeScript tipini hem veritabanı CHECK kısıtını üretiyor, yani
 * kırpılması iki katmanı birden gevşetirdi.
 *
 * **② `externalIdsSchema` reddi.** Pozitif testler kör bir doğrulayıcıyla da
 * geçer (3.2b'de ölçülen oran: 16'da 1), o yüzden her kısıtın reddi ayrıca
 * sınanıyor.
 *
 * ⚠️ CHECK kısıtının veritabanında **gerçekten** bu listeyi taşıdığı burada
 * kanıtlanamaz — bir birim testi Postgres'e sormaz. O iddia
 * `integration/schema-constraints.itest.ts`te `pg_get_constraintdef` okunarak
 * ölçülüyor. İkisi ayrı ayrı gerekiyor (2.3b dersi: birim testi kablolamayı
 * kanıtlamaz).
 */
import { describe, expect, it } from 'vitest';

import { DATA_SOURCES, externalIdsSchema } from './data-pack-columns.js';

describe('DATA_SOURCES — sabit tablo bütünlüğü', () => {
  it('spec/01 §3.1.0 beş kaynağını EKSİKSİZ ve SIRAYLA taşıyor', () => {
    expect([...DATA_SOURCES]).toEqual(['pack', 'api', 'wikidata', 'openfootball', 'procedural']);
  });
});

describe('externalIdsSchema — kabul', () => {
  it('boş nesne geçerli — eşleme yok demek', () => {
    expect(externalIdsSchema.parse({})).toEqual({});
  });

  it('spec/12 §17.3 örneği geçiyor', () => {
    const parsed = externalIdsSchema.parse({
      wikidata: 'Q170084',
      apiFootball: 645,
      transfermarkt: 141,
    });
    expect(parsed.wikidata).toBe('Q170084');
  });

  it('alanların herhangi biri tek başına verilebilir', () => {
    expect(externalIdsSchema.parse({ wikidata: 'Q1' })).toEqual({ wikidata: 'Q1' });
  });
});

describe('externalIdsSchema — RED (asıl kanıt)', () => {
  it('tanınmayan sağlayıcı reddediliyor — YAZIM HATASI sessiz geçmiyor', () => {
    // `wikidatta`: gevşek bir şemada geçer, varlık Wikidata'ya HİÇ bağlanmaz ve
    // kimse fark etmez. `spec/12` §17.3: "yanlış eşleşme = Galatasaray armasının
    // Fenerbahçe'de görünmesi".
    expect(externalIdsSchema.safeParse({ wikidatta: 'Q170084' }).success).toBe(false);
  });

  it('sayısal kimlik dizge olarak verilemiyor', () => {
    expect(externalIdsSchema.safeParse({ apiFootball: '645' }).success).toBe(false);
  });

  it('ondalıklı sayısal kimlik reddediliyor', () => {
    expect(externalIdsSchema.safeParse({ transfermarkt: 141.5 }).success).toBe(false);
  });

  it('sıfır veya negatif kimlik reddediliyor', () => {
    expect(externalIdsSchema.safeParse({ apiFootball: 0 }).success).toBe(false);
    expect(externalIdsSchema.safeParse({ apiFootball: -1 }).success).toBe(false);
  });

  it('tek karakterlik wikidata kimliği reddediliyor', () => {
    // Gerçek kimlikler `Q` + rakam; tek karakter bir kırpılma belirtisidir.
    expect(externalIdsSchema.safeParse({ wikidata: 'Q' }).success).toBe(false);
  });

  it('nesne olmayan girdi reddediliyor', () => {
    expect(externalIdsSchema.safeParse('Q170084').success).toBe(false);
    expect(externalIdsSchema.safeParse(null).success).toBe(false);
  });
});
