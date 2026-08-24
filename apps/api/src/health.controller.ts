import { basePathConfig } from '@fms/shared';
import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';

/**
 * Alt yol kanıtı — Faz 1.8.
 *
 * Bu denetleyici gerçek bir özellik değil; `/fms` alt yolunun uçtan uca
 * çalıştığını gösteren en küçük yüzey. Gerçek modüller Faz 3'ten itibaren.
 */
@Controller()
export class HealthController {
  @Get('health')
  health(@Res({ passthrough: true }) res: Response): Record<string, unknown> {
    const config = basePathConfig();

    // Çerez `path` alt yolla sınırlanmalı: `/` olursa kök alan adındaki
    // diğer uygulamalara sızar, `/fms/api` olursa web tarafı göremez.
    res.cookie('fms_probe', 'ok', {
      path: config.cookiePath,
      httpOnly: false,
      sameSite: 'lax',
    });

    return {
      status: 'ok',
      basePath: config.base,
      apiPrefix: config.apiPrefix,
      cookiePath: config.cookiePath,
      ssePath: config.ssePath,
    };
  }

  /**
   * Express 5 joker rota sözdizimi.
   *
   * Express 4'te `*` yeterliydi; Express 5'in `path-to-regexp` sürümü
   * adlandırılmış joker istiyor: `*splat`.
   *
   * ÖLÇÜLDÜ (Faz 1.8): eski sözdizimi (`echo/*`) yazıldığında NestJS 11
   * **çökmüyor**. `LegacyRouteConverter` devreye giriyor, WARN basıp rotayı
   * `{*path}` biçimine otomatik çeviriyor ve uygulama açılıyor. Yani tuzak
   * "patlayan" değil "sessizce dönüştürülen" cinsten — log okunmazsa fark
   * edilmez ve dönüştürülmüş desen niyetten sapabilir. Bu yüzden doğru
   * sözdizimi elle yazılır, otomatik dönüştürücüye güvenilmez.
   */
  @Get('echo/*splat')
  echo(): Record<string, string> {
    return { matched: 'splat' };
  }
}
