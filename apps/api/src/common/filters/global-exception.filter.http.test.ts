import 'reflect-metadata';

import { CORRELATION_HEADER, createNoopLogger, DomainError, NotFoundError } from '@fms/shared';
import { Controller, Get, Module } from '@nestjs/common';
import type { NestApplication } from '@nestjs/core';
import { APP_FILTER, NestFactory } from '@nestjs/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CorrelationMiddleware } from '../middleware/correlation.middleware.js';
import { LOGGER } from '../tokens.js';
import { GlobalExceptionFilter, UNEXPECTED_CODE } from './global-exception.filter.js';

/**
 * Filtrenin GERÇEK HTTP üzerinden testi — Faz 2 madde 2.4.
 *
 * ── NEDEN AYRI DOSYA VE NEDEN GERÇEK NEST ────────────────────────────────
 * Birim testleri filtrenin `catch()` metodunu doğrudan çağırıyor ve sahte bir
 * `Response` kullanıyor. O testler doğru ama **bir şeyi kanıtlamıyor**:
 * filtrenin gerçekten **kablolanmış** olduğunu. `APP_FILTER` sağlayıcısı
 * kaldırılsa bütün birim testleri yeşil kalırdı ve hatalar ham Nest yanıtı
 * olarak dönerdi — `spec/09` §11.5'in kuralı: *bir kuralın birim testi,
 * kablolamasının test edildiği anlamına gelmez.*
 *
 * Burada gerçek bir Nest uygulaması ayağa kalkıyor, gerçek bir porta bağlanıyor
 * ve gövde **tel üzerinden** okunuyor.
 *
 * ── ÜRETİM YÜZEYİNE FIRLATAN ROTA EKLENMEDİ ──────────────────────────────
 * Fırlatan uç noktalar bu dosyadaki **test modülünde** yaşıyor, `AppModule`da
 * değil: her istekte 500 üreten kalıcı bir üretim rotası, teşhis için değil
 * saldırı yüzeyi için hediye olurdu.
 *
 * ⚠️ BUNUN BEDELİ VE NASIL ÖDENDİĞİ: test modülü `AppModule`ın **kopyası
 * değil**; filtre ve middleware aynı sınıflardan geliyor ama kablolamayı bu
 * dosya kuruyor. Yani "üretimde de kablolu mu?" sorusunu bu test tek başına
 * cevaplamıyor. O soru derlenmiş çıktının **çalıştırılmasıyla** cevaplanıyor
 * (SAPMA-014): gerçek `AppModule` ile açılan API'ye `/fms/api/yok` isteği
 * atılıp gövdenin bu filtreden çıktığı doğrulanıyor.
 */

@Controller()
class ThrowingController {
  @Get('bilinen')
  bilinen(): never {
    throw new DomainError({
      code: 'transfer.budgetExceeded',
      message: 'iç geliştirici notu — gövdeye sızmamalı',
      context: { budget: 12_400_000, offer: 18_000_000, password: 'hunter2' },
    });
  }

  @Get('bulunamadi')
  bulunamadi(): never {
    throw new NotFoundError({ code: 'player.notFound', message: 'oyuncu yok' });
  }

  @Get('bilinmeyen')
  bilinmeyen(): never {
    throw new TypeError('İç ayrıntı: /srv/fms/dist/gizli-modul.js patladı');
  }

  @Get('dizge')
  dizge(): never {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- testin konusu
    throw 'düz dizge fırlatıldı';
  }
}

@Module({
  controllers: [ThrowingController],
  providers: [
    { provide: LOGGER, useValue: createNoopLogger() },
    CorrelationMiddleware,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
class TestModule {
  configure(consumer: { apply: (m: unknown) => { forRoutes: (r: string) => void } }): void {
    consumer.apply(CorrelationMiddleware).forRoutes('*splat');
  }
}

let app: NestApplication;
let base = '';

beforeAll(async () => {
  app = await NestFactory.create(TestModule, { logger: false });
  await app.listen(0);
  base = (await app.getUrl()).replace('[::1]', '127.0.0.1');
}, 60_000);

afterAll(async () => {
  await app.close();
});

async function get(path: string): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(`${base}/${path}`);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

describe('filtre GERÇEKTEN kablolu — gövde tel üzerinden', () => {
  it('bilinen AppError → eşlenen durum + code + redakte context', async () => {
    const { status, body } = await get('bilinen');

    expect(status).toBe(409);
    expect(body['code']).toBe('transfer.budgetExceeded');
    expect(body['status']).toBe(409);
    // ⚠️ `message` alanı 5.4'te gövdeden ÇIKARILDI (BORÇ-005) ve bu iddia
    // gevşetilmedi, **tersine çevrildi**: alan artık TELDE DE bulunmamalı.
    // Metni istemci `code` + `status`tan üretiyor.
    expect(body['message']).toBeUndefined();

    const context = body['context'] as Record<string, unknown>;
    expect(context['budget']).toBe(12_400_000);
    // ⑦ redaksiyon TEL ÜZERİNDE de geçerli.
    expect(context['password']).toBe('[REDACTED]');
    expect(JSON.stringify(body)).not.toContain('hunter2');
  });

  it('GELİŞTİRİCİ mesajı tel üzerinde YOK', async () => {
    const { body } = await get('bilinen');
    expect(JSON.stringify(body)).not.toContain('iç geliştirici notu');
  });

  it('NotFoundError → 404', async () => {
    const { status, body } = await get('bulunamadi');
    expect(status).toBe(404);
    expect(body['code']).toBe('player.notFound');
  });

  it('bilinmeyen hata → 500, gövdede iç ayrıntı YOK', async () => {
    const { status, body } = await get('bilinmeyen');
    const text = JSON.stringify(body);

    expect(status).toBe(500);
    expect(body['code']).toBe(UNEXPECTED_CODE);
    expect(text).not.toContain('gizli-modul');
    expect(text).not.toContain('TypeError');
    expect(body).not.toHaveProperty('stack');
    expect(body).not.toHaveProperty('context');
  });

  it('düz dizge fırlatma → 500, sunucu ayakta kalıyor', async () => {
    const { status, body } = await get('dizge');

    expect(status).toBe(500);
    expect(body['code']).toBe(UNEXPECTED_CODE);
    expect(JSON.stringify(body)).not.toContain('düz dizge fırlatıldı');

    // Filtrenin kendisi patlamadıysa sonraki istek de çalışmalı.
    expect((await get('bulunamadi')).status).toBe(404);
  });

  it('eşleşmeyen rota → 404, ham Nest gövdesi DEĞİL bizim gövdemiz', async () => {
    const { status, body } = await get('hicboyleyol');

    expect(status).toBe(404);
    // Ham Nest gövdesi `{statusCode, message, error}` olurdu; bizimki `code` taşıyor.
    expect(body['code']).toBe('http.404');
    expect(body).not.toHaveProperty('statusCode');
  });

  it('hata gövdesi correlationId taşıyor ve yanıt BAŞLIĞIYLA aynı', async () => {
    const response = await fetch(`${base}/bulunamadi`);
    const body = (await response.json()) as Record<string, unknown>;

    expect(body['correlationId']).toBe(response.headers.get(CORRELATION_HEADER));
    expect(typeof body['correlationId']).toBe('string');
  });

  it('istemcinin gönderdiği kimlik hata gövdesinde geri dönüyor', async () => {
    const sent = '01a03966-0000-7000-8000-abcdef123456';
    const response = await fetch(`${base}/bulunamadi`, {
      headers: { [CORRELATION_HEADER]: sent },
    });
    const body = (await response.json()) as Record<string, unknown>;

    expect(body['correlationId']).toBe(sent);
  });
});
