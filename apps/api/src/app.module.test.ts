import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { AppModule } from './app.module.js';
import { HealthController } from './health.controller.js';

/**
 * Modül kaydı testi.
 *
 * Nest konteynerini ayağa kaldırmaz — `@Module()` dekoratörünün yazdığı
 * metadata'yı doğrudan okur. Amaç bir denetleyicinin modüle eklenmeyi
 * unutmasını yakalamak: rota o zaman sessizce 404 döner ve sebebi
 * "controller'ı listeye eklememişim" olur.
 */
describe('AppModule', () => {
  it('HealthController modüle kayıtlı', () => {
    const controllers = Reflect.getMetadata('controllers', AppModule) as unknown;
    expect(controllers).toEqual([HealthController]);
  });
});
