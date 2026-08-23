import { describe, expect, it } from 'vitest';

import { parseEnv } from './env.js';

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
