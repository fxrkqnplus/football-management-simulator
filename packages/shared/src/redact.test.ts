import { describe, expect, it } from 'vitest';

import { isSensitiveKey, redactContext, REDACTED, SENSITIVE_KEY_PATTERNS } from './redact.js';

/**
 * Redaksiyon testleri.
 *
 * İki liste birden sınanıyor ve bu kasıtlı: bir blocklist'in **neyi
 * yakalamadığı**, neyi yakaladığı kadar önemli. Yalnızca pozitif tarafı test
 * etmek, listeye `auth` eklenip `authorId`'nin sessizce redakte edilmeye
 * başlandığını göstermez.
 */

/** Redakte EDİLMESİ gerekenler. */
const MUST_REDACT = [
  // Düz adlar
  'password',
  'secret',
  'token',
  'cookie',
  'signature',
  'jwt',
  'dsn',
  // Ön/son ekli gerçek kullanımlar — TAM EŞLEŞME BUNLARIN HİÇBİRİNİ YAKALAMAZ
  'userPassword',
  'passwordHash',
  'oldPassword',
  'refreshToken',
  'accessToken',
  'csrfToken',
  'clientSecret',
  'sessionId',
  'credentialId',
  'privateKeyPem',
  // Yazım varyantları — normalize edilip eşleşmeli
  'API_KEY',
  'apiKey',
  'x-api-key',
  'DATABASE_URL',
  'JWT_SECRET',
  'Authorization',
  'AUTHORIZATION',
  'connectionString',
  'SENTRY_DSN',
];

/**
 * Redakte EDİLMEMESİ gerekenler.
 *
 * Bu listenin çoğu, blocklist'ten BİLEREK çıkarılan terimlerin kanıtı:
 * `auth` yerine `authorization` (→ `authorId` kurtuldu), `key` yerine
 * `apikey` (→ `keyPass` kurtuldu), `private` yerine `privatekey`
 * (→ `privateProfile` kurtuldu).
 */
const MUST_NOT_REDACT = [
  'authorId',
  'authorName',
  'authoredAt',
  'keyPass',
  'keyPlayer',
  'foreignKey',
  'privateProfile',
  'clubId',
  'playerName',
  'budget',
  'correlationId',
  'saveId',
  'turnId',
  'module',
  'publicUrl',
];

describe('isSensitiveKey — yakalanması gerekenler', () => {
  it.each(MUST_REDACT)('%s hassas sayılır', (key) => {
    expect(isSensitiveKey(key)).toBe(true);
  });
});

describe('isSensitiveKey — yakalanmaması gerekenler', () => {
  it.each(MUST_NOT_REDACT)('%s hassas SAYILMAZ', (key) => {
    expect(isSensitiveKey(key)).toBe(false);
  });
});

describe('isSensitiveKey — kabul edilen yanlış pozitifler', () => {
  // Bunlar zararsız alanlar ama alt dize eşleşmesi onları da yakalıyor.
  // Test BİLEREK var: davranış bir sürpriz değil, kayıtlı bir tercih.
  // Asimetri: yanlış pozitifin bedeli bir log alanı, yanlış negatifinki
  // sızmış bir sır. `[REDACTED]` görünür olduğu için geliştirici fark eder.
  it.each(['passwordPolicyVersion', 'tokenCount', 'sessionCount'])(
    '%s FAZLADAN redakte edilir — kabul edilen maliyet',
    (key) => {
      expect(isSensitiveKey(key)).toBe(true);
    },
  );
});

describe('redactContext', () => {
  it('yalnızca hassas alanları değiştirir, diğerlerine dokunmaz', () => {
    const result = redactContext({
      correlationId: 'abc-123',
      userPassword: 'hunter2',
      clubId: 42,
      DATABASE_URL: 'postgresql://fms:parola@db:5432/fms',
      authorId: 7,
    });

    expect(result).toEqual({
      correlationId: 'abc-123',
      userPassword: REDACTED,
      clubId: 42,
      DATABASE_URL: REDACTED,
      authorId: 7,
    });
  });

  it('dizi değerini de tamamen değiştirir', () => {
    // Eleman sayısı bile bilgi sızdırabilir; alanın redakte edildiğini görmek
    // log okuyanın ihtiyacı olan tek şey.
    const result = redactContext({ tokens: ['a', 'b', 'c'], positions: ['GK', 'DC'] });
    expect(result['tokens']).toBe(REDACTED);
    expect(result['positions']).toEqual(['GK', 'DC']);
  });

  it('boş bağlamı boş döner', () => {
    expect(redactContext({})).toEqual({});
  });

  it('girdi nesnesini DEĞİŞTİRMEZ', () => {
    const input = { password: 'x', clubId: 1 };
    redactContext(input);
    expect(input.password).toBe('x');
  });

  it('BİLİNEN SINIR: zararsız adlı alanın hassas DEĞERİ yakalanmaz', () => {
    // Redaksiyon anahtar adına bakar, değere değil. Değer taraması bilinçli
    // olarak yapılmıyor (yanlış pozitif riski çok yüksek); asıl savunma
    // `LogContext`in dar tipi, yani alan seçme disiplini.
    const result = redactContext({ note: 'parola 1234' });
    expect(result['note']).toBe('parola 1234');
  });
});

describe('SENSITIVE_KEY_PATTERNS — listenin kendisi', () => {
  it('tehlikeli kısa/genel terimler listeye GİRMEMİŞ', () => {
    // Bunlar eklenirse authorId, keyPass, privateProfile sessizce redakte
    // edilmeye başlar. Liste büyütülürken bu test uyarı görevi görür.
    const patterns: readonly string[] = SENSITIVE_KEY_PATTERNS;
    expect(patterns).not.toContain('auth');
    expect(patterns).not.toContain('key');
    expect(patterns).not.toContain('private');
    expect(patterns).not.toContain('id');
  });

  it('hepsi küçük harf ve ayraçsız — normalize edilmiş adla karşılaştırılıyor', () => {
    for (const pattern of SENSITIVE_KEY_PATTERNS) {
      expect(pattern).toBe(pattern.toLowerCase());
      expect(pattern).not.toMatch(/[-_\s]/);
    }
  });
});
