import 'reflect-metadata';

import { createNoopLogger } from '@fms/shared';
import { describe, expect, it } from 'vitest';

import { AppModule, LOGGER } from './app.module.js';
import { CorrelationMiddleware } from './common/middleware/correlation.middleware.js';
import { HealthController } from './health.controller.js';

/**
 * Modül kaydı testi.
 *
 * Nest konteynerini ayağa kaldırmaz — `forRoot()`un ürettiği dinamik modül
 * tanımını doğrudan okur. Amaç bir denetleyicinin veya sağlayıcının modüle
 * eklenmeyi unutmasını yakalamak: rota o zaman sessizce 404 döner ya da
 * middleware hiç koşmaz, ve sebebi "listeye eklememişim" olur.
 *
 * NOT (Faz 2.3a): önceki sürüm `Reflect.getMetadata('controllers', AppModule)`
 * okuyordu. `forRoot(logger)` deseni gelince denetleyiciler statik metadata'dan
 * dinamik modüle taşındı ve o okuma `undefined` döndü. Test kırıldı ve
 * **doğru kırıldı** — iddia gerçekten değişmişti.
 */
describe('AppModule.forRoot', () => {
  const module = AppModule.forRoot(createNoopLogger());

  it('HealthController kayıtlı', () => {
    expect(module.controllers).toEqual([HealthController]);
  });

  it('logger DI belirteciyle sağlanıyor', () => {
    // `Logger` bir arayüz; çalışma zamanında tipi yok, bu yüzden Nest onu
    // tip üzerinden çözemiyor ve dizgi belirteç gerekiyor.
    const provider = module.providers?.find(
      (p): p is { provide: string; useValue: unknown } =>
        typeof p === 'object' && 'provide' in p && p.provide === LOGGER,
    );
    expect(provider).toBeDefined();
    expect(provider?.useValue).toBeDefined();
  });

  it('CorrelationMiddleware sağlayıcı listesinde', () => {
    // Middleware `@Inject(LOGGER)` ile logger alıyor; sağlayıcı listesinde
    // olmazsa Nest onu kuramaz ve zincir hiç başlamaz.
    expect(module.providers).toContain(CorrelationMiddleware);
  });

  it('modül referansı AppModule sınıfının kendisi', () => {
    expect(module.module).toBe(AppModule);
  });
});
