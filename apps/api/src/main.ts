import 'reflect-metadata';

import { basePathConfig, configureBasePath, loadEnv } from '@fms/shared';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';

/**
 * API önyüklemesi — Faz 1.8 alt yol kanıtı.
 *
 * Sıra önemli: önce ortam doğrulanır (eksik değişkenle uygulama AÇILMAZ),
 * sonra alt yol tek kaynaktan yapılandırılır, sonra Nest ayağa kalkar.
 */
async function bootstrap(): Promise<void> {
  const env = loadEnv();
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
  process.stdout.write(
    `API hazır: http://localhost:${String(env.API_PORT)}${config.apiPrefix}/health\n`,
  );
}

await bootstrap();
