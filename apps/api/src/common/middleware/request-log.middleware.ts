import type { LogContext, Logger } from '@fms/shared';
import { getLogContext } from '@fms/shared/server';
import { Inject, Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { LOGGER } from '../tokens.js';

/**
 * İstek başına tek log satırı — `docs/spec/09` §11.1 zincirinin DÖRDÜNCÜ halkası.
 *
 * ── NEDEN VAR (G-08) ─────────────────────────────────────────────────────
 * 2.3b'de ölçüldü: tarayıcı kimliği üretiyor, `console`a logluyor, başlıkla
 * gönderiyor; sunucu kabul edip **aynı kimliği yanıt başlığında geri veriyor**.
 * Ama sunucu logunda o kimlik `grep` ile **0 kez** bulunuyordu — çünkü mutlu
 * yolda **hiçbir şey loglamıyordu**. Zincirin mekanizması sağlamdı, eşleşecek
 * satır yoktu. Bu dosya o satırı üretiyor.
 *
 * ── NEDEN MIDDLEWARE, INTERCEPTOR DEĞİL (Karar 12) ───────────────────────
 * Interceptor NestJS boru hattının **içinde** çalışır ve eşleşen rota yoksa
 * hiç tetiklenmez — yani **404'leri kaçırır**. Oysa "istediğim uç nokta yok"
 * teşhisin en çok istendiği durumdur. `res.on('finish')` middleware'de 404
 * dahil her yanıtı görür.
 *
 * `CorrelationMiddleware`'e eklenmedi: o **kimlik** üretiyor, bu **işlem
 * kaydı** tutuyor. Ayrı tutulmalarının sebebi 2.3c'nin 2.4'ten ayrılmasıyla
 * aynı — bir aksaklıkta hangisinin bozulduğu tek başına anlaşılabilsin.
 *
 * ── ÖLÇÜLMÜŞ SINIR: GLOBAL ÖN EK DIŞI İSTEKLER LOGLANMIYOR ───────────────
 * Duman testi (2.3c, derlenmiş çıktı):
 *   • `GET /fms/api/yok`   → 404, **loglandı** (`warn`, kimlikli) ✅
 *   • `GET /api/health`    → 404, **loglanmadı** ❌
 * `forRoutes('*splat')` deseni `setGlobalPrefix` kapsamına giriyor, yani ön
 * ek dışına düşen istekler bu middleware'e hiç uğramıyor.
 *
 * Bilerek böyle bırakıldı: üretimde `/fms/api/*` dışındaki hiçbir yol API'ye
 * ulaşmıyor (Cloudflare/ters vekil yönlendirmesi) ve CI zaten `/api/health`in
 * 404 döndüğünü **iddia ederek** bu sınırı sabitliyor. Yani kör nokta yalnızca
 * doğrudan API portuna yanlış ön ekle vurulduğunda görünür — geliştirme
 * ortamında bir yapılandırma hatası. Yine de **yazılı**, çünkü bu projede
 * tekrar tekrar öğrenilen ders şu: bir kapının sessiz kaldığı yer,
 * yazılmadıysa yok sayılır.
 *
 * ── NEDEN BAĞLAM BAŞLANGIÇTA YAKALANIYOR ─────────────────────────────────
 * ⚠️ Buradaki tek gerçek tuzak bu ve **ölçümle** bulundu (2.3c).
 *
 * `AsyncLocalStorage` bağlamının `finish` dinleyicisine geçip geçmediği,
 * dinleyicinin nerede KAYDEDİLDİĞİNE değil, olayın nereden EMIT edildiğine
 * bağlı. İki ölçüm:
 *
 *   • Sentetik `EventEmitter`, dinleyici bağlam içinde kayıtlı, `emit()`
 *     bağlam dışındaki bir `setTimeout`tan  →  `getStore()` **undefined**
 *   • Gerçek `node:http` sunucusu, `res.end()` bağlam içinde  →  bağlam
 *     **korunuyor**
 *
 * Yani bugünkü akışta çalışıyor, ama çalışmasının sebebi bizim kontrol
 * ettiğimiz bir şey değil: yanıt bağlam dışından sonlanırsa (istemci
 * kopması, ileride bir akış katmanı, bir kütüphane) `getLogContext()` boş
 * döner ve satır **kimliksiz** yazılır. Kopukluğun belirtisi olmaz — log
 * satırı yine çıkar, yalnızca zincire bağlanamaz. Tam olarak bu fazın
 * kapatmaya çalıştığı hata sınıfı.
 *
 * Çözüm: bağlam istek **başlarken** (bağlamın garantili mevcut olduğu an,
 * `CorrelationMiddleware` hemen öncesinde çalıştı) okunup kapatılıyor ve
 * `finish` anında **açıkça** loglanıyor. Logger'ın ortam sağlayıcısı
 * (`contextProvider`) zaten varsa da ekler; açık bağlam onu ezer.
 */
@Injectable()
export class RequestLogMiddleware implements NestMiddleware {
  constructor(@Inject(LOGGER) private readonly logger: Logger) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const startedAt = performance.now();

    // ⚠️ SENKRON — `finish` anına ertelenemez. Gerekçe dosya başlığında.
    const context: LogContext = getLogContext();

    const method = request.method;
    const path = pathWithoutQuery(request.originalUrl);

    response.on('finish', () => {
      const status = response.statusCode;
      // Süre 0,1 ms çözünürlüğe yuvarlanıyor: ondan ötesi ölçüm gürültüsü ve
      // log satırını gereksiz uzatıyor.
      const durationMs = Math.round((performance.now() - startedAt) * 10) / 10;

      this.logger[levelForStatus(status)](
        { ...context, code: 'http.request', method, path, status, durationMs },
        'İstek tamamlandı',
      );
    });

    next();
  }
}

/**
 * Durum koduna göre log seviyesi (Karar 11).
 *
 * Seviyenin duruma bağlanması logu **kendi kendini önceliklendirir** hale
 * getiriyor: `LOG_LEVEL=warn` ile açılan bir sunucuda gürültü susar ama
 * bozuk istekler görünmeye devam eder.
 */
export function levelForStatus(status: number): 'info' | 'warn' | 'error' {
  if (status >= 500) return 'error';
  if (status >= 400) return 'warn';
  return 'info';
}

/**
 * Sorgu dizesini atar.
 *
 * ⚠️ SORGU DİZESİ BİLEREK LOGLANMIYOR. Redaksiyon **anahtar adına** bakıyor
 * (`redact.ts`) ve bir sorgu dizesi log satırına **tek bir dizge** olarak
 * girer — yani `?token=abc` içindeki sır hiçbir anahtar eşleşmesine
 * takılmadan satıra düşerdi. Sorgu teşhisi gerekirse ayrı ve bilinçli bir
 * karar olur; varsayılan olarak sızdırmamak tercih edildi.
 */
export function pathWithoutQuery(originalUrl: string): string {
  const index = originalUrl.indexOf('?');
  return index === -1 ? originalUrl : originalUrl.slice(0, index);
}
