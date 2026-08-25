import { describe, expect, it } from 'vitest';

import { collectEnvWarnings, parseEnv } from './env.js';

/** Doğrulamayı geçen en küçük ortam. */
const MINIMAL = {
  DATABASE_URL: 'postgresql://fms:password@localhost:5432/fms',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'x'.repeat(32),
  ACTIVE_PACK: 'tr-2026',
} as const;

describe('parseEnv — varsayılanlar', () => {
  it('kilitlenen varsayılanları uygular', () => {
    const env = parseEnv(MINIMAL);
    expect(env.PUBLIC_BASE_PATH).toBe('/fms');
    expect(env.SERVER_MODE).toBe('private');
    expect(env.DATA_MODE).toBe('full');
    expect(env.PORTRAIT_STYLE).toBe('stylized');
    expect(env.DEFAULT_SIM_POLICY).toBe('balanced');
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.NODE_ENV).toBe('development');
  });

  it('port değerlerini sayıya çevirir', () => {
    const env = parseEnv({ ...MINIMAL, API_PORT: '3001' });
    expect(env.API_PORT).toBe(3001);
    expect(typeof env.API_PORT).toBe('number');
  });

  it('ACTIVE_PACK boş bırakılabilir (Ç6)', () => {
    expect(() => parseEnv({ ...MINIMAL, ACTIVE_PACK: '' })).not.toThrow();
  });
});

describe('parseEnv — hata mesajı eyleme dönüştürülebilir (K1.3)', () => {
  it('eksik DATABASE_URL için değişken adını, işlevini ve örneğini verir', () => {
    const { DATABASE_URL: _omitted, ...withoutDb } = MINIMAL;
    let message = '';
    try {
      parseEnv(withoutDb);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain('DATABASE_URL');
    expect(message).toContain('tanımlı değil');
    expect(message).toContain('Ne işe yarar');
    expect(message).toContain('PostgreSQL bağlantı adresi');
    expect(message).toContain('Örnek');
    expect(message).toContain('postgresql://');
    expect(message).toContain('.env.example');

    // Ham Zod çıktısı sızmamalı.
    expect(message).not.toContain('Required');
    expect(message).not.toContain('invalid_type');
  });

  it('kısa JWT_SECRET için nedenini söyler', () => {
    let message = '';
    try {
      parseEnv({ ...MINIMAL, JWT_SECRET: 'kisa' });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain('JWT_SECRET');
    expect(message).toContain('En az 32 karakter');
    expect(message).toContain('taklit');
  });

  it('birden çok sorunu tek seferde bildirir', () => {
    let message = '';
    try {
      parseEnv({ JWT_SECRET: 'kisa' });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain('3 sorun');
    expect(message).toContain('DATABASE_URL');
    expect(message).toContain('REDIS_URL');
    expect(message).toContain('JWT_SECRET');
  });

  it('geçersiz enum değerini reddeder', () => {
    expect(() => parseEnv({ ...MINIMAL, SERVER_MODE: 'acik' })).toThrow(/SERVER_MODE/);
    expect(() => parseEnv({ ...MINIMAL, DEFAULT_SIM_POLICY: 'medium' })).toThrow(
      /DEFAULT_SIM_POLICY/,
    );
  });

  it('geçersiz PUBLIC_URL için tam adres ister', () => {
    expect(() => parseEnv({ ...MINIMAL, PUBLIC_URL: 'fxrkqn.org' })).toThrow(/Tam bir adres/);
  });
});

describe('checkDatabaseUrlConsistency — compose ↔ uygulama (1.7)', () => {
  const COMPOSE = {
    ...MINIMAL,
    DATABASE_URL: 'postgresql://fms:gizli@localhost:5432/fms',
    POSTGRES_USER: 'fms',
    POSTGRES_PASSWORD: 'gizli',
    POSTGRES_DB: 'fms',
  } as const;

  it('uyumlu değerlerde geçer', () => {
    expect(() => parseEnv(COMPOSE)).not.toThrow();
  });

  it('konak farkını sorun saymaz (konteyner içi vs yerel)', () => {
    expect(() =>
      parseEnv({ ...COMPOSE, DATABASE_URL: 'postgresql://fms:gizli@postgres:5432/fms' }),
    ).not.toThrow();
  });

  it('parola ayrışmasını yakalar — en olası hata', () => {
    let message = '';
    try {
      parseEnv({ ...COMPOSE, POSTGRES_PASSWORD: 'baska' });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain('POSTGRES_PASSWORD');
    expect(message).toContain('uyuşmuyor');
    expect(message).toContain('.env');
  });

  it('kullanıcı ve veritabanı adı ayrışmasını yakalar', () => {
    expect(() => parseEnv({ ...COMPOSE, POSTGRES_USER: 'baska' })).toThrow(/POSTGRES_USER/);
    expect(() => parseEnv({ ...COMPOSE, POSTGRES_DB: 'baska' })).toThrow(/POSTGRES_DB/);
  });

  it('POSTGRES_* hiç tanımlı değilse kontrol yapılmaz', () => {
    expect(() => parseEnv(MINIMAL)).not.toThrow();
  });

  it('compose portları varsayılanlarla gelir', () => {
    const env = parseEnv(MINIMAL);
    expect(env.POSTGRES_PORT).toBe(5432);
    expect(env.REDIS_PORT).toBe(6379);
    expect(env.ADMINER_PORT).toBe(8080);
  });
});

describe('collectEnvWarnings — uyarı BASILMAZ, DÖNDÜRÜLÜR', () => {
  // Faz 2.2b: bu uyarı eskiden `parseEnv` içinden doğrudan
  // `process.stderr.write` ile basılıyordu. K8 onu yasakladı ama doğrudan
  // `logger.warn`a çevirmek imkânsızdı — logger'ın kendisi env'den doğuyor
  // (LOG_LEVEL, LOG_FORMAT), yani `parseEnv` çalışırken henüz yok.
  // Sıralama tersine çevrildi: doğrulayıcı teşhis döner, çağıran basar.
  // Yan fayda: artık çıktı yakalamadan, düz assert ile test edilebiliyor.

  // MINIMAL bilerek ACTIVE_PACK taşıyor (asıl senaryo o); uyarı testleri onu
  // çıkarmak zorunda. İlk yazımda unutuldu ve test 'uyarı yok' diye kırıldı —
  // kod değil testin kendisi yanlıştı.
  const NO_PACK = {
    DATABASE_URL: MINIMAL.DATABASE_URL,
    REDIS_URL: MINIMAL.REDIS_URL,
    JWT_SECRET: MINIMAL.JWT_SECRET,
  } as const;

  it('DATA_MODE=full ve ACTIVE_PACK boşken uyarır', () => {
    const warnings = collectEnvWarnings(parseEnv({ ...NO_PACK, DATA_MODE: 'full' }));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.code).toBe('env.activePackMissing');
    expect(warnings[0]?.message).toContain('ACTIVE_PACK');
    expect(warnings[0]?.context).toEqual({ dataMode: 'full' });
  });

  it('ACTIVE_PACK doluysa uyarmaz', () => {
    const warnings = collectEnvWarnings(
      parseEnv({ ...MINIMAL, DATA_MODE: 'full', ACTIVE_PACK: 'tr-2026' }),
    );
    expect(warnings).toEqual([]);
  });

  it('DATA_MODE=clean iken paket beklenmiyor, uyarmaz', () => {
    const warnings = collectEnvWarnings(parseEnv({ ...NO_PACK, DATA_MODE: 'clean' }));
    expect(warnings).toEqual([]);
  });

  it('uyarı kodu i18n anahtarı biçiminde — hata sınıflarıyla aynı sözleşme', () => {
    const warnings = collectEnvWarnings(parseEnv({ ...NO_PACK, DATA_MODE: 'full' }));
    expect(warnings[0]?.code).toMatch(/^[a-z]+\.[a-zA-Z]+$/);
  });
});

describe('LOG_FORMAT — NODE_ENV koklanmaz, açık bayrak', () => {
  it('varsayılan json', () => {
    expect(parseEnv(MINIMAL).LOG_FORMAT).toBe('json');
  });

  it('pretty açıkça seçilebilir', () => {
    expect(parseEnv({ ...MINIMAL, LOG_FORMAT: 'pretty' }).LOG_FORMAT).toBe('pretty');
  });

  it('tanımsız değer reddedilir', () => {
    expect(() => parseEnv({ ...MINIMAL, LOG_FORMAT: 'renkli' })).toThrow(/LOG_FORMAT/);
  });
});
