import type { Logger } from '@fms/shared';
import {
  type DynamicModule,
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from '@nestjs/common';

import { CorrelationMiddleware } from './common/middleware/correlation.middleware.js';
import { RequestLogMiddleware } from './common/middleware/request-log.middleware.js';
import { LOGGER } from './common/tokens.js';
import { HealthController } from './health.controller.js';

// Belirteç BURADA TANIMLANMAZ, yalnızca yeniden dışa aktarılır: tanım burada
// olduğunda app.module ↔ middleware dairesel bağımlılığı doğuyor ve dekoratör
// değerlendirmesi çalışma zamanında patlıyordu (bkz. common/tokens.ts).
export { LOGGER } from './common/tokens.js';

/**
 * Kök modül.
 *
 * `forRoot(logger)` neden var: logger `main.ts`'te **doğrulanmış env'den**
 * kuruluyor (`LOG_LEVEL`, `LOG_FORMAT`). Modül kendi logger'ını kursaydı env'i
 * ikinci bir yerden okumak ve iki farklı yapılandırmanın ayrışma riskini
 * üstlenmek gerekirdi.
 */
@Module({})
export class AppModule implements NestModule {
  static forRoot(logger: Logger): DynamicModule {
    return {
      module: AppModule,
      controllers: [HealthController],
      providers: [
        { provide: LOGGER, useValue: logger },
        CorrelationMiddleware,
        RequestLogMiddleware,
      ],
    };
  }

  configure(consumer: MiddlewareConsumer): void {
    // `*splat` — Express 5 adlandırılmış joker. Eski `*` sözdizimi
    // NestJS 11'de çökmüyor ama LegacyRouteConverter tarafından SESSİZCE
    // dönüştürülüyor (SAPMA-006); dönüştürülen desen niyetten sapabildiği
    // için doğrusu elle yazılıyor.
    // Alt yol burada YOK: `setGlobalPrefix` onu zaten uyguluyor, desen ön ek
    // İÇİNDE göreli (K6).
    // SIRA ANLAMLI: `CorrelationMiddleware` ÖNCE gelmeli. O, isteğin geri
    // kalanını `runWithLogContext` içinde çalıştırıyor; `RequestLogMiddleware`
    // ancak bu sayede başlangıçta bağlamı okuyabiliyor (2.3c Karar 12).
    // Ters sırada log satırı **kimliksiz** çıkardı ve kopukluğun belirtisi
    // olmazdı — satır yine yazılırdı.
    consumer.apply(CorrelationMiddleware, RequestLogMiddleware).forRoutes('*splat');
  }
}
