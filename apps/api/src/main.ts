import 'reflect-metadata';

import { basePathConfig, configureBasePath } from '@fms/shared';
// Ortam doğrulaması SUNUCU ALT YOLUNDAN gelir: `process.env` okuyor ve şema
// sistemdeki her sırrın adını sayıyor, bu yüzden izomorfik kök girişte durmamalı
// (Faz 2.2a). Tarayıcı bu modülü import etmeye kalkarsa derleme kırılır.
import { collectEnvWarnings, createServerLogger, loadEnv } from '@fms/shared/server';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';

/**
 * API önyüklemesi — Faz 1.8 alt yol kanıtı.
 *
 * Sıra önemli ve 2.2b'de bir halka daha kazandı:
 *   1. Ortam doğrulanır — eksik değişkenle uygulama AÇILMAZ.
 *   2. Logger **doğrulanmış** env'den kurulur (`LOG_LEVEL`, `LOG_FORMAT`).
 *   3. Ölümcül olmayan yapılandırma uyarıları basılır.
 *   4. Alt yol tek kaynaktan yapılandırılır, Nest ayağa kalkar.
 *
 * 2. adım 3. adımdan ÖNCE gelmek zorunda: logger'ın kendisi env'den doğuyor,
 * bu yüzden `parseEnv` uyarıyı basamaz, yalnızca **döndürebilir**
 * (`collectEnvWarnings`). K8 ile bu sıralamayı uzlaştıran şey bu.
 */
async function bootstrap(): Promise<void> {
  const env = loadEnv();

  const logger = createServerLogger({
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT,
    name: 'api',
  });

  for (const warning of collectEnvWarnings(env)) {
    logger.warn({ code: warning.code, ...warning.context }, warning.message);
  }

  configureBasePath(env.PUBLIC_BASE_PATH);
  const config = basePathConfig();

  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  // Tek kaynak: '/fms/api'. Elle yazılmaz, base-path'ten türetilir (K6).
  app.setGlobalPrefix(config.apiPrefix);

  // NestJS 11 / Express 5: yalnızca CORS güvenli listesindeki metotlar
  // varsayılan olarak açık. PUT/PATCH/DELETE açıkça tanımlanmazsa tarayıcı
  // ön kontrol (preflight) isteğini reddeder.
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.listen(env.API_PORT);
  logger.info(
    { port: env.API_PORT, apiPrefix: config.apiPrefix, serverMode: env.SERVER_MODE },
    'API hazır',
  );
}

await bootstrap();
