import 'reflect-metadata';

import { basePathConfig, configureBasePath } from '@fms/shared';
// Ortam doğrulaması SUNUCU ALT YOLUNDAN gelir: `process.env` okuyor ve şema
// sistemdeki her sırrın adını sayıyor, bu yüzden izomorfik kök girişte durmamalı
// (Faz 2.2a). Tarayıcı bu modülü import etmeye kalkarsa derleme kırılır.
import { loadEnv } from '@fms/shared/server';
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
