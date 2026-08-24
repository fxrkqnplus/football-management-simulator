import { beforeEach, describe, expect, it } from 'vitest';

import {
  apiPath,
  basePath,
  configureBasePath,
  deriveBasePathConfig,
  joinBasePath,
  normalizeBasePath,
  resetBasePathForTests,
} from './base-path.js';
import { ValidationError } from './errors.js';

describe('normalizeBasePath', () => {
  it('farklı yazımları tek biçime indirger', () => {
    expect(normalizeBasePath('/fms')).toBe('/fms');
    expect(normalizeBasePath('fms')).toBe('/fms');
    expect(normalizeBasePath('/fms/')).toBe('/fms');
    expect(normalizeBasePath('//fms//')).toBe('/fms');
    expect(normalizeBasePath('  /fms  ')).toBe('/fms');
    expect(normalizeBasePath('/a/b')).toBe('/a/b');
  });

  it('kök dağıtımı boş dizgeye indirger', () => {
    expect(normalizeBasePath('/')).toBe('');
    expect(normalizeBasePath('')).toBe('');
    expect(normalizeBasePath(undefined)).toBe('');
    expect(normalizeBasePath(null)).toBe('');
  });
});

describe('deriveBasePathConfig — tek kaynak, altı katman', () => {
  it('/fms için tüm katmanları türetir', () => {
    const c = deriveBasePathConfig('/fms');
    expect(c).toEqual({
      base: '/fms',
      viteBase: '/fms/',
      routerBasename: '/fms',
      apiPrefix: '/fms/api',
      ssePath: '/fms/api/events',
      cookiePath: '/fms',
      serviceWorkerScope: '/fms/',
      pwa: { id: '/fms/', scope: '/fms/', startUrl: '/fms/' },
    });
  });

  it('taban değişince HER katman birlikte değişir', () => {
    const c = deriveBasePathConfig('/oyun');
    // Kabul kriteri: PUBLIC_BASE_PATH değiştirilince her yer uyuyor.
    expect(c.viteBase).toBe('/oyun/');
    expect(c.routerBasename).toBe('/oyun');
    expect(c.apiPrefix).toBe('/oyun/api');
    expect(c.ssePath).toBe('/oyun/api/events');
    expect(c.cookiePath).toBe('/oyun');
    expect(c.serviceWorkerScope).toBe('/oyun/');
    expect(c.pwa.startUrl).toBe('/oyun/');

    // Hiçbir alanda eski taban kalmamalı.
    const leftovers = Object.values({ ...c, pwa: undefined })
      .filter((v): v is string => typeof v === 'string')
      .filter((v) => v.includes('/fms'));
    expect(leftovers).toEqual([]);
  });

  it('kök dağıtımda eğik çizgi ikilenmez', () => {
    const c = deriveBasePathConfig('/');
    expect(c.base).toBe('');
    expect(c.viteBase).toBe('/');
    expect(c.routerBasename).toBe('/');
    expect(c.apiPrefix).toBe('/api');
    expect(c.cookiePath).toBe('/');
  });
});

describe('joinBasePath — yanlış kullanım sessizce geçmez', () => {
  it('baştaki eğik çizgi yoksa fırlatır', () => {
    expect(() => joinBasePath('/fms', 'api/health')).toThrow(/'\/' ile başlamalı/);
  });

  it('ön ek iki kez uygulanıyorsa fırlatır', () => {
    expect(() => joinBasePath('/fms', '/fms/api')).toThrow(/iki kez/);
    expect(() => joinBasePath('/fms', '/fms')).toThrow(/iki kez/);
  });

  it('çift eğik çizgide fırlatır', () => {
    expect(() => joinBasePath('/fms', '//api')).toThrow(/çift eğik çizgi/);
  });

  it('hata mesajı doğru kullanımı gösterir', () => {
    expect(() => joinBasePath('/fms', 'api/health')).toThrow(/basePath\('\/api\/health'\)/);
    expect(() => joinBasePath('/fms', '/fms/api')).toThrow(/basePath\('\/api'\)/);
  });

  // ── Aşağıdaki üç test Faz 2.1'de eklendi ──────────────────────────────
  // Sebebi bir BULGU: `TypeError` → `ValidationError` değişimi yapıldığında
  // yukarıdaki testlerin hiçbiri kırılmadı. Çünkü hepsi yalnızca MESAJI
  // kontrol ediyordu; hata TİPİ sözleşmenin parçası olmasına rağmen hiç
  // sınanmamıştı. Bir sınıfın `TypeError`a geri dönmesi ya da düz `Error`
  // fırlatması bu suitten sessizce geçerdi.
  //
  // Tip, çağıran taraf için mesajdan daha önemli: exception filter (2.4)
  // `instanceof ValidationError` ile karar verecek, mesaja bakmayacak.

  it('fırlatılan hata ValidationError — mesaj değil, TİP sınanıyor', () => {
    expect(() => joinBasePath('/fms', 'api/health')).toThrow(ValidationError);
    expect(() => joinBasePath('/fms', '//api')).toThrow(ValidationError);
    expect(() => joinBasePath('/fms', '/fms/api')).toThrow(ValidationError);
  });

  it('her fırlatmanın kendi kararlı `code` değeri var', () => {
    const codeOf = (base: string, path: string): string => {
      try {
        joinBasePath(base, path);
      } catch (error: unknown) {
        if (error instanceof ValidationError) return error.code;
        throw error;
      }
      throw new Error('fırlatması bekleniyordu');
    };

    expect(codeOf('/fms', 'api/health')).toBe('basePath.mustStartWithSlash');
    expect(codeOf('/fms', '//api')).toBe('basePath.doubleSlash');
    expect(codeOf('/fms', '/fms/api')).toBe('basePath.duplicatePrefix');
  });

  it('context ayrıntıyı YAPISAL taşır — mesajdan ayıklamak gerekmiyor', () => {
    try {
      joinBasePath('/fms', '/fms/api');
      throw new Error('fırlatması bekleniyordu');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ValidationError);
      const { context } = error as ValidationError;
      expect(context).toEqual({ path: '/fms/api', base: '/fms', suggestion: '/api' });
    }
  });

  it('geçerli girdide birleştirir', () => {
    expect(joinBasePath('/fms', '/api/health')).toBe('/fms/api/health');
    expect(joinBasePath('', '/api/health')).toBe('/api/health');
    expect(joinBasePath('/fms', '/')).toBe('/fms/');
  });

  it("taban '/fms' iken '/fmsx' yanlış pozitif üretmez", () => {
    expect(joinBasePath('/fms', '/fmsx')).toBe('/fms/fmsx');
  });
});

describe('basePath / apiPath', () => {
  beforeEach(() => {
    resetBasePathForTests();
  });

  it('yapılandırılan tabanı kullanır', () => {
    configureBasePath('/fms');
    expect(basePath('/api/health')).toBe('/fms/api/health');
    expect(apiPath('/health')).toBe('/fms/api/health');
  });

  it('yeniden yapılandırılınca sonuç değişir', () => {
    configureBasePath('/oyun');
    expect(basePath('/login')).toBe('/oyun/login');
    configureBasePath('/');
    expect(basePath('/login')).toBe('/login');
  });
});
