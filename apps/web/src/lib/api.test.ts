import { CORRELATION_HEADER, DomainError, isCorrelationId } from '@fms/shared';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

import { apiRequest } from './api.js';

/**
 * `apiRequest` testleri — tarayıcı yarısının zinciri gerçekten kurduğunun kanıtı.
 *
 * `fetch` sahteleniyor ama SAHTELENEN ŞEY TARAYICI API'Sİ, bizim kodumuz değil.
 * Test edilen iddia şu: giden `Request` başlığında kimlik VAR ve o kimlik
 * çağıranın eline geri dönüyor. Sunucu tarafı 2.3a'da gerçek HTTP ile
 * kanıtlandı; ikisi birlikte zinciri kapatıyor.
 */

interface Health {
  readonly status: string;
}

/** Son çağrının başlıklarını yakalayan sahte `fetch`. */
function stubFetch(options: {
  readonly status?: number;
  readonly echo?: 'same' | 'different' | 'none';
  readonly reject?: boolean;
}): { calls: { url: string; init: RequestInit }[] } {
  const calls: { url: string; init: RequestInit }[] = [];

  vi.stubGlobal('fetch', (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });

    if (options.reject === true) return Promise.reject(new TypeError('Failed to fetch'));

    const sent = new Headers(init.headers).get(CORRELATION_HEADER) ?? '';
    const headers = new Headers();
    if (options.echo === 'same' || options.echo === undefined) {
      headers.set(CORRELATION_HEADER, sent);
    } else if (options.echo === 'different') {
      headers.set(CORRELATION_HEADER, 'baska-bir-kimlik');
    }

    return Promise.resolve(
      new Response(JSON.stringify({ status: 'ok' }), {
        status: options.status ?? 200,
        headers,
      }),
    );
  });

  return { calls };
}

// Casuslar değişkende tutuluyor: `expect(console.warn)` yazmak K8'in ESLint
// kuralını (`no-console`) tetikliyor ve o kural test dosyaları için de açık —
// bilinçli, çünkü kaçış deliği açmak kuralın güvenilirliğini bozar.
let warnSpy: MockInstance;
let errorSpy: MockInstance;

beforeEach(() => {
  // Tarayıcı logger'ı `console`a yazıyor; test çıktısını kirletmesin.
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── ZORUNLU NEGATİF TEST 4 ──────────────────────────────────────────────
describe('apiRequest — başlık GERÇEKTEN gönderiliyor', () => {
  it('X-Correlation-Id başlığını koyar ve değeri geçerli bir uuid v7', () => {
    const { calls } = stubFetch({});

    return apiRequest<Health>('/health').then((result) => {
      expect(calls).toHaveLength(1);

      const sent = new Headers(calls[0]?.init.headers).get(CORRELATION_HEADER);
      expect(sent).toBe(result.correlationId);
      expect(isCorrelationId(result.correlationId)).toBe(true);
    });
  });

  it('her istek YENİ bir kimlik üretir — iki istek karışmaz', async () => {
    stubFetch({});
    const first = await apiRequest<Health>('/health');
    const second = await apiRequest<Health>('/health');
    expect(first.correlationId).not.toBe(second.correlationId);
  });

  it('yolu `apiPath` ile üretir — mutlak yol sabit kodlanmaz (K6)', () => {
    const { calls } = stubFetch({});

    return apiRequest<Health>('/health').then(() => {
      // Taban `/fms` iken sonuç `/fms/api/health`; test tabanı sabitlemiyor,
      // yalnızca `/api/health` ile BİTTİĞİNİ ve çıplak olmadığını doğruluyor.
      expect(calls[0]?.url).toMatch(/\/api\/health$/);
    });
  });

  it('çağıranın verdiği başlıkları korur', () => {
    const { calls } = stubFetch({});

    return apiRequest<Health>('/health', { headers: { 'X-Test': 'evet' } }).then(() => {
      const headers = new Headers(calls[0]?.init.headers);
      expect(headers.get('X-Test')).toBe('evet');
      expect(headers.get(CORRELATION_HEADER)).not.toBeNull();
    });
  });

  it('sunucunun geri verdiği kimliği çağırana bildirir — zincirin kanıtı', async () => {
    stubFetch({ echo: 'same' });
    const result = await apiRequest<Health>('/health');
    expect(result.serverCorrelationId).toBe(result.correlationId);
    expect(result.data.status).toBe('ok');
  });
});

describe('apiRequest — zincir koptuğunda', () => {
  it('sunucu FARKLI kimlik döndürürse uyarır ama işi düşürmez', async () => {
    stubFetch({ echo: 'different' });
    const result = await apiRequest<Health>('/health');

    expect(result.serverCorrelationId).toBe('baska-bir-kimlik');
    expect(result.data.status).toBe('ok'); // iş düşmedi
    expect(warnSpy).toHaveBeenCalled();
  });

  it('sunucu başlık hiç yazmazsa `null` döner', async () => {
    stubFetch({ echo: 'none' });
    const result = await apiRequest<Health>('/health');
    expect(result.serverCorrelationId).toBeNull();
  });
});

describe('apiRequest — hatalar', () => {
  it('2xx olmayan yanıt tipli hata fırlatır ve kimliği bağlama koyar', async () => {
    stubFetch({ status: 503 });

    await expect(apiRequest<Health>('/health')).rejects.toThrow(DomainError);
    await expect(apiRequest<Health>('/health')).rejects.toMatchObject({
      code: 'api.requestFailed',
      context: { status: 503 },
    });
  });

  it('ağ hatası sessizce yutulmaz — loglanır ve tipli hataya sarılır', async () => {
    stubFetch({ reject: true });

    await expect(apiRequest<Health>('/health')).rejects.toMatchObject({
      code: 'api.networkError',
    });
    expect(errorSpy).toHaveBeenCalled();
  });

  it('sarmalama ham reddetme değerini KAYBETMEZ — `cause` korunur', async () => {
    // `App.test.tsx`'teki "Error olmayan reddetme" testinin diğer yarısı:
    // mesaj eyleme dönüştürülebilir hâle gelirken orijinal sebep silinmemeli,
    // yoksa teşhis için gereken tek ipucu kaybolur.
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
    vi.stubGlobal('fetch', () => Promise.reject('bağlantı yok'));

    const caught = await apiRequest<Health>('/health').catch((error: unknown) => error);
    expect((caught as DomainError).cause).toBe('bağlantı yok');
  });

  it('hata bağlamındaki correlationId gerçek bir kimlik', async () => {
    stubFetch({ status: 500 });

    const caught = await apiRequest<Health>('/health').catch((error: unknown) => error);
    expect(caught).toBeInstanceOf(DomainError);
    const context = (caught as DomainError).context;
    expect(isCorrelationId(String(context['correlationId']))).toBe(true);
  });
});
