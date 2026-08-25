import {
  CORRELATION_HEADER,
  createCorrelationId,
  isAcceptableCorrelationId,
  type Logger,
  truncateForLog,
} from '@fms/shared';
import { runWithLogContext } from '@fms/shared/server';
import { Inject, Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { LOGGER } from '../tokens.js';

/**
 * `correlationId` zincirinin başladığı yer — `docs/spec/09` §11.1.
 *
 * Her istek için:
 *   1. Gelen `X-Correlation-Id` başlığı **doğrulanır** (dış girdi).
 *   2. Geçerliyse kullanılır, değilse yenisi üretilir.
 *   3. Yanıt başlığına yazılır — istemci kendi logunda aynı kimliği görür.
 *   4. İstek `AsyncLocalStorage` bağlamı içinde çalıştırılır; bundan sonra
 *      **her log satırı** kimliği otomatik taşır, elle geçirmeye gerek yok.
 *
 * ── GEÇERSİZ BAŞLIK KARARI ───────────────────────────────────────────────
 * İstek **reddedilmez**. Bozuk bir izleme başlığı yüzünden kullanıcının
 * transferini düşürmek, çözdüğünden çok sorun yaratır — başlık teşhis
 * amaçlıdır, yetkilendirme değil. Sunucu kendi kimliğini üretir ve durumu
 * `warn` seviyesinde loglar; yani sessizce yutulmuş da olmaz.
 *
 * Gelen değer loga **kısaltılarak** girer (`truncateForLog`): dış girdi keyfi
 * uzunlukta olabilir, satır sonu içerip log enjeksiyonu yapabilir, ya da
 * yanlışlıkla başlığa konmuş bir sır olabilir.
 */
@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  constructor(@Inject(LOGGER) private readonly logger: Logger) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const incoming = request.header(CORRELATION_HEADER);
    const hasIncoming = incoming !== undefined && incoming !== '';
    const accepted = hasIncoming && isAcceptableCorrelationId(incoming);

    const correlationId = accepted ? incoming : createCorrelationId();

    if (hasIncoming && !accepted) {
      this.logger.warn(
        {
          code: 'correlation.invalidHeader',
          received: truncateForLog(incoming),
          correlationId,
        },
        'Geçersiz X-Correlation-Id başlığı — yenisi üretildi',
      );
    }

    response.setHeader(CORRELATION_HEADER, correlationId);

    // İsteğin geri kalanı bu bağlamın içinde koşar. `next()` çağrısı zincirin
    // tamamını (denetleyici, servis, veritabanı çağrıları, await'ler) kapsar.
    runWithLogContext({ correlationId }, () => {
      next();
    });
  }
}
