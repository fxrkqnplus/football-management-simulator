import { createServer, type Server } from 'node:http';
import { gunzipSync } from 'node:zlib';

import { DomainError, EngineError, ValidationError } from '@fms/shared';
import type { ErrorEvent, EventHint } from '@sentry/node';
import { captureException, close, init, isInitialized } from '@sentry/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { SESSION_INTEGRATION, shouldReport } from './instrument.js';

/**
 * Sentry zarfının GERÇEK bir ağ isteğiyle doğrulanması — Faz 2 madde 2.5a.
 *
 * Faz 2'nin **1. kabul kriteri**: *"Kasıtlı bir hata fırlat → Sentry'de
 * `correlationId` ile görünüyor."* Doğrulaması iki yollu:
 *
 *   (a) **Bu dosya** — yerel yakalama sunucusuna DSN verilir ve zarfın etiketi
 *       gerçekten taşıdığı assert edilir. Tekrarlanabilir, CI'da koşar,
 *       ağa çıkmaz.
 *   (b) Gerçek Sentry projesine tek sefer gönderim + ekran görüntüsü —
 *       **yapılmadı**: `SENTRY_DSN` boş, ortada proje yok. Kabul kriterinin o
 *       yarısı gerekçesiyle `[ ]` bırakıldı.
 *
 * ── NEDEN SAHTE İSTEMCİ DEĞİL, GERÇEK SUNUCU ─────────────────────────────
 * `Sentry.captureException`ı sahteleyip "çağrıldı mı" diye bakmak yeşil bir
 * test üretir ve **hiçbir şey kanıtlamaz**: etiketin zarfa girip girmediği,
 * `beforeSend`in kablolanıp kablolanmadığı, taşıma katmanının çalışıp
 * çalışmadığı görülmez. 2.3b'de sahte kuyruğun reddedilme gerekçesinin
 * aynısı — kırılabilecek şey tam olarak sahtelenen yerde.
 */

interface Envelope {
  readonly raw: string;
  readonly items: readonly Record<string, unknown>[];
}

let server: Server;
let dsn = '';
const received: Envelope[] = [];
/**
 * Dosya boyunca gelen HER zarfın türü — `afterEach` bunu TEMİZLEMEZ.
 *
 * Gerekçe: "oturum zarfı gitmedi" iddiası, temizlenen bir listeye bakılarak
 * kanıtlanamaz — liste zaten boş olurdu ve test doğru sebeple geçmezdi.
 */
const seenTypes: string[] = [];

/** Sentry'nin zarfı: satır satır JSON (başlık · öğe başlığı · yük). */
function parseEnvelope(raw: string): Envelope {
  const items = raw
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => {
      try {
        return JSON.parse(line) as Record<string, unknown>;
      } catch {
        // Zarf satırlarının hepsi JSON olmayabilir; teşhis için ham metin yeter.
        return { unparsed: line };
      }
    });
  return { raw, items };
}

beforeAll(async () => {
  server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      const body = Buffer.concat(chunks);
      // SDK gövdeyi gzip'leyebiliyor; ikisini de kabul et.
      const text =
        request.headers['content-encoding'] === 'gzip'
          ? gunzipSync(body).toString('utf8')
          : body.toString('utf8');
      const envelope = parseEnvelope(text);
      received.push(envelope);
      seenTypes.push(envelopeType(envelope));
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end('{}');
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  const port = typeof address === 'object' && address !== null ? address.port : 0;
  // DSN biçimi: <şema>://<açık anahtar>@<sunucu>/<proje kimliği>
  dsn = `http://testanahtari@127.0.0.1:${String(port)}/1`;
}, 30_000);

afterAll(async () => {
  if (isInitialized()) await close(0);
  await new Promise<void>((resolve) =>
    server.close(() => {
      resolve();
    }),
  );
});

afterEach(async () => {
  received.length = 0;
  if (isInitialized()) await close(0);
});

/** Üretimdeki `instrument.ts` ile AYNI yapılandırma — `beforeSend` dahil. */
function initLikeProduction(): void {
  init({
    dsn,
    environment: 'private',
    release: 'fms@test',
    tracesSampleRate: 0,
    sampleRate: 1.0,
    sendDefaultPii: false,
    integrations: (defaults) =>
      defaults.filter((integration) => integration.name !== SESSION_INTEGRATION),
    beforeSend: (event: ErrorEvent, hint: EventHint): ErrorEvent | null =>
      shouldReport(hint) ? event : null,
  });
}

/**
 * Zarf türü — öğe başlığındaki `type` alanı (`event` · `session` · …).
 *
 * ⚠️ NEDEN GEREKLİ: ilk yazımda ham zarf SAYISI assert ediliyordu ve test
 * `2` görüp kırıldı. Sebep ölçüldü: `release` ayarlıyken SDK hata zarfının
 * yanında bir `session` zarfı da yolluyor. Sayı artık türe göre süzülüyor —
 * ve o yan kanal `instrument.ts`'te kapatıldı (`ProcessSession` çıkarıldı).
 */
function envelopeType(envelope: Envelope): string {
  const header = envelope.items[1];
  return typeof header?.['type'] === 'string' ? header['type'] : 'bilinmiyor';
}

/** Yalnızca hata olayı taşıyan zarflar. */
function errorEnvelopes(): Envelope[] {
  return received.filter((envelope) => envelopeType(envelope) === 'event');
}

/**
 * İlk hata zarfı — yoksa TEŞHİS EDİLEBİLİR bir hata fırlatır.
 *
 * Doğrudan indeksleyip `!` ile daraltmak lint'te yasak (`no-non-null-assertion`) ve
 * haklı olarak: zarf gelmediğinde `!` sessizce `undefined`ı geçirir ve test
 * anlaşılmaz bir alt hatayla kırılır. Burada neyin eksik olduğu söyleniyor.
 */
function firstErrorEnvelope(): Envelope {
  const [envelope] = errorEnvelopes();
  if (envelope === undefined) {
    throw new Error(`Hata zarfı gelmedi. Gelen türler: ${JSON.stringify(seenTypes)}`);
  }
  return envelope;
}

/** Zarf içindeki olay yükünü bulur (etiketleri taşıyan satır). */
function eventPayload(envelope: Envelope): Record<string, unknown> | undefined {
  return envelope.items.find((item) => 'tags' in item || 'exception' in item);
}

// ── ⑤ NEGATİF: DSN BOŞKEN AĞ İSTEĞİ YOK ─────────────────────────────────
// ⚠️ BU BLOK DOSYADAKİ İLK TEST OLMAK ZORUNDA. `close()` istemciyi kapatıyor
// ama BAĞLI BIRAKIYOR — `isInitialized()` sonrasında hâlâ `true` dönüyor
// (2.5a'da ölçüldü). Sonraya konsaydı "hiç kurulmamış" durumu değil,
// "kurulmuş ama kapatılmış" durumu sınanırdı ve test doğru sebeple geçmezdi.
describe('DSN boşken ağa çıkılmıyor', () => {
  it('SDK hiç kurulmamışken captureException sessiz — sunucuya hiçbir şey ulaşmıyor', async () => {
    // `instrument.js` import edilirken `setupSentry(process.env)` çalıştı ve
    // test ortamının env'i geçerli olmadığı için kurulum YAPMADI.
    expect(isInitialized()).toBe(false);

    captureException(new EngineError({ code: 'engine.invariant', message: 'm' }));
    // Gönderim asenkron olsaydı bile yakalamaya zaman tanıyoruz.
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(received).toHaveLength(0);
  }, 30_000);
});

describe('kabul kriteri 1 — zarf correlationId taşıyor', () => {
  it('kasıtlı hata → zarf GERÇEKTEN gönderiliyor ve correlationId etiketi taşıyor', async () => {
    const correlationId = '01a03966-2222-7000-8000-abcdef222222';
    initLikeProduction();

    captureException(new EngineError({ code: 'engine.invariant', message: 'değişmez kırıldı' }), {
      tags: { correlationId, errorKind: 'engine', errorCode: 'engine.invariant' },
    });
    await close(2000);

    expect(errorEnvelopes()).toHaveLength(1);
    const payload = eventPayload(firstErrorEnvelope());
    const tags = payload?.['tags'] as Record<string, unknown> | undefined;

    expect(tags?.['correlationId']).toBe(correlationId);
    expect(tags?.['errorKind']).toBe('engine');
    // Ham zarfta da aranıyor: etiketin taşıma katmanından sağ çıktığının
    // en dolaysız kanıtı.
    expect(firstErrorEnvelope().raw).toContain(correlationId);
  }, 30_000);

  it('sürüm ve ortam etiketi de zarfta', async () => {
    initLikeProduction();
    captureException(new EngineError({ code: 'a.b', message: 'm' }));
    await close(2000);

    const payload = eventPayload(firstErrorEnvelope());
    expect(payload?.['release']).toBe('fms@test');
    expect(payload?.['environment']).toBe('private');
  }, 30_000);
});

// ── ③ NEGATİF: FİLTRELENEN HATA AĞA HİÇ ÇIKMIYOR ────────────────────────
describe('beforeSend GERÇEKTEN kablolu — filtrelenen hata gönderilmiyor', () => {
  it('ValidationError → HİÇBİR zarf gitmiyor', async () => {
    initLikeProduction();
    captureException(new ValidationError({ code: 'auth.badLogin', message: 'm' }));
    await close(2000);

    expect(errorEnvelopes()).toHaveLength(0);
  }, 30_000);

  it('DomainError → HİÇBİR zarf gitmiyor', async () => {
    initLikeProduction();
    captureException(new DomainError({ code: 'transfer.budgetExceeded', message: 'm' }));
    await close(2000);

    expect(errorEnvelopes()).toHaveLength(0);
  }, 30_000);

  it('KONTROL: aynı kurulumda EngineError gidiyor', async () => {
    // Yukarıdaki iki testin doğru sebeple geçtiğinin kanıtı. Bu olmadan
    // "zarf gitmedi" sonucu, taşımanın hiç çalışmamasından da kaynaklanabilirdi
    // (günlük #16'nın dersi).
    initLikeProduction();
    captureException(new EngineError({ code: 'engine.invariant', message: 'm' }));
    await close(2000);

    expect(errorEnvelopes()).toHaveLength(1);
  }, 30_000);
});

describe('istenmemiş yan kanal kapalı', () => {
  it('dosya boyunca HİÇBİR oturum zarfı gönderilmedi', () => {
    // ⚠️ Kümülatif listeye bakılıyor: `received` her testten sonra
    // temizleniyor, dolayısıyla ona bakan bir assert boş diziyi görüp
    // **doğru sebeple geçmezdi**. Yukarıdaki koşuların hepsinde `release`
    // ayarlıydı; `ProcessSession` kaldırılmasaydı her biri bir `session`
    // zarfı daha üretirdi.
    expect(seenTypes.length).toBeGreaterThan(0); // gerçekten zarf aktı mı
    expect(seenTypes).not.toContain('session');
  });
});
