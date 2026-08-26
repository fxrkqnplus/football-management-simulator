import {
  ASSERTION_MODES,
  configureAssertions,
  configureBasePath,
  CORRELATION_HEADER,
  resetAssertionsForTests,
  resetBasePathForTests,
} from '@fms/shared';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App.js';

/**
 * `App` alt yol kanıt ekranının testleri — Faz 2.0b.
 *
 * Bu ekran gerçek arayüz değil (Faz 6'da tasarım sistemi, Faz 17'de kabuk
 * gelecek), ama taşıdığı iddia gerçek: **hiçbir yol elle yazılmaz, hepsi
 * `PUBLIC_BASE_PATH`'ten türer** (K6). Test o iddiayı sınıyor — tabanı
 * değiştirip her hücrenin uyduğunu görüyor.
 *
 * `fetch` sahteleniyor: gerçek ağ çağrısı testi hem yavaşlatır hem de API'nin
 * ayakta olmasına bağlar. Sahtelemenin asıl kazancı başka: **hangi URL ile**
 * çağrıldığını assert edebiliyoruz, yani `apiPath()` türetmesi de sınanıyor.
 */

interface HealthBody {
  readonly status: string;
  readonly basePath: string;
  readonly apiPrefix: string;
  readonly cookiePath: string;
}

/**
 * `fetch` yerine geçen, verilen gövdeyi başarıyla dönen sahte.
 *
 * 2.3b'de düz nesne yerine GERÇEK `Response` döndürmeye çevrildi: ekran artık
 * `apiRequest` üzerinden geçiyor ve o, yanıt **başlığını** okuyor
 * (`X-Correlation-Id`). Düz nesnede `headers` yok — sahte, taklit ettiği
 * şeyin yüzeyini eksik taklit ediyordu.
 *
 * Sahte ayrıca sunucunun 2.3a'daki davranışını taklit ediyor: gelen kimliği
 * yanıt başlığında **geri veriyor**. Zincirin kapandığı böyle görülüyor.
 */
function mockFetchOk(body: HealthBody): ReturnType<typeof vi.fn> {
  const fake = vi.fn((_url: string, init: RequestInit = {}) => {
    const sent = new Headers(init.headers).get(CORRELATION_HEADER) ?? '';
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { [CORRELATION_HEADER]: sent },
      }),
    );
  });
  vi.stubGlobal('fetch', fake);
  return fake;
}

const HEALTH_OK: HealthBody = {
  status: 'ok',
  basePath: '/fms',
  apiPrefix: '/fms/api',
  cookiePath: '/fms',
};

describe('App — alt yol kanıt ekranı', () => {
  beforeEach(() => {
    resetBasePathForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetBasePathForTests();
    resetAssertionsForTests();
  });

  it('türetilmiş yapılandırmanın altı katmanını da ekrana basar', async () => {
    configureBasePath('/fms');
    mockFetchOk(HEALTH_OK);

    render(<App />);

    expect(screen.getByTestId('base').textContent).toBe('/fms');
    expect(screen.getByTestId('basename').textContent).toBe('/fms');
    expect(screen.getByTestId('api-prefix').textContent).toBe('/fms/api');
    expect(screen.getByTestId('sw-scope').textContent).toBe('/fms/');
    expect(screen.getByTestId('pwa-start').textContent).toBe('/fms/');
    // API cevabı gelene kadar ara durum görünür olmalı.
    expect(await screen.findByText('ok')).toBeDefined();
  });

  it('taban değişince HER hücre uyar — hiçbir yol sabit kodlanmamış (K6)', async () => {
    configureBasePath('/oyun');
    mockFetchOk({ ...HEALTH_OK, basePath: '/oyun', apiPrefix: '/oyun/api' });

    render(<App />);

    expect(screen.getByTestId('base').textContent).toBe('/oyun');
    expect(screen.getByTestId('api-prefix').textContent).toBe('/oyun/api');
    expect(screen.getByTestId('sw-scope').textContent).toBe('/oyun/');
    expect(await screen.findByText('ok')).toBeDefined();
  });

  it('sağlık isteğini türetilmiş API yoluna atar, çerezi taşır', async () => {
    configureBasePath('/fms');
    const fetchMock = mockFetchOk(HEALTH_OK);

    render(<App />);
    await screen.findByText('ok');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/fms/api/health');
    expect(init.credentials).toBe('include');

    // 2.3b — zincir tarayıcı tarafından BAŞLIYOR: istek kimlik taşıyor ve
    // sunucunun geri verdiği kimlikle eşleştiği ekranda görünüyor.
    const sent = new Headers(init.headers).get(CORRELATION_HEADER);
    expect(sent).toMatch(/^[0-9a-f-]{36}$/);
    expect(screen.getByTestId('correlation-id').textContent).toBe(sent);
    expect(screen.getByTestId('chain-closed').textContent).toBe('evet');
  });

  /** Sunucunun BAŞKA bir kimlik döndürdüğü senaryo — zincir değişmezi ihlali. */
  function mockFetchMismatch(): void {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify(HEALTH_OK), {
            status: 200,
            headers: { [CORRELATION_HEADER]: 'baska-bir-kimlik' },
          }),
        ),
      ),
    );
  }

  it('ÜRETİM KİPİ: sunucu FARKLI kimlik döndürürse ekran zincirin koptuğunu söyler', async () => {
    // ⚠️ KİP AÇIKÇA KURULUYOR (2.7). Üretim derlemesinde bunu `main.tsx`
    // `__FMS_DEV__`ten türetiyor; burada elle kuruluyor çünkü `App.test.tsx`
    // `main.tsx`i hiç yüklemiyor ve varsayılan kip `throw`.
    configureAssertions({ mode: ASSERTION_MODES.report, report: () => undefined });
    configureBasePath('/fms');
    mockFetchMismatch();

    render(<App />);
    await screen.findByText('ok');

    // Kopukluk SESSİZ kalmıyor ama İŞ DE DÜŞMÜYOR — 2.3b'nin kararı aynen
    // geçerli: veri geldi (`ok` bulundu), durum ekranda görünüyor.
    expect(screen.getByTestId('chain-closed').textContent).toBe('HAYIR');
  });

  it('GELİŞTİRME KİPİ: aynı senaryoda veri DÜŞÜYOR, hata ekrana yazılıyor', async () => {
    // ⚠️ BU TEST KRİTER 4'Ü KAPATMAZ. Kip burada elle kuruluyor; üretimde onu
    // `__FMS_DEV__` **derleme zamanı sabiti** sürüyor ve derlemeye gömülü bir
    // değeri testte değiştirmek yalnızca testi yeşile boyar (2.6 günlük #48).
    // Kriterin kanıtı iki ayrı derlemeyi gerçek tarayıcıda koşmak.
    //
    // Ölçülen ikinci şey: fırlatma bir PROMISE zincirinin içinde olduğu için
    // ErrorBoundary onu YAKALAMIYOR (React sınırları yalnızca render/lifecycle
    // hatalarını yakalar). Yakalayan, `App.tsx`teki kendi `.catch()`i.
    configureAssertions({ mode: ASSERTION_MODES.throw });
    configureBasePath('/fms');
    mockFetchMismatch();

    render(<App />);

    const status = await screen.findByTestId('api-status');
    await vi.waitFor(() => {
      expect(status.textContent).toContain('correlationId');
    });
    // Veri hiç ekrana gelmedi ve zincir durumu "bekleniyor"da kaldı.
    expect(screen.queryByText('ok')).toBeNull();
    expect(screen.getByTestId('chain-closed').textContent).toBe('bekleniyor');
    // ErrorBoundary yedek arayüzü DEVREDE DEĞİL — tablo ayakta.
    expect(screen.getByTestId('base').textContent).toBe('/fms');
  });

  it('API hata koduyla dönerse durum yerine hata metni gösterir', async () => {
    configureBasePath('/fms');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{}', { status: 503 }))),
    );

    render(<App />);

    // Mesaj hem durum kodunu hem istenen URL'yi taşımalı: "bir hata oluştu"
    // değil, eyleme dönüştürülebilir (K1.3).
    const status = await screen.findByTestId('api-status');
    expect(status.textContent).toContain('503');
    expect(status.textContent).toContain('/fms/api/health');
  });

  it('ağ çağrısı Error olmayan bir şeyle reddedilse de ekran çökmez', async () => {
    configureBasePath('/fms');
    // Bilerek Error DEĞİL: `fetch` her zaman `TypeError` fırlatmaz — bir
    // eklenti, bir servis çalışanı veya bir sahte katman düz dizge de
    // reddedebilir. Kural burada BİLEREK susturuluyor; testin konusu tam
    // olarak kuralın yasakladığı durum.
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
    const rejectWithString = vi.fn(() => Promise.reject('bağlantı yok'));
    vi.stubGlobal('fetch', rejectWithString);

    render(<App />);

    // 2.3b'DE DEĞİŞEN DAVRANIŞ: eskiden ham reddetme değeri ('bağlantı yok')
    // doğrudan ekrana basılıyordu. Artık `apiRequest` onu tipli bir
    // `DomainError`a sarıyor ve mesaj EYLEME DÖNÜŞTÜRÜLEBİLİR oluyor
    // (CLAUDE.md §1.3): hangi istek, hangi URL. Ham değer kaybolmuyor —
    // hatanın `cause` alanında duruyor (`lib/api.test.ts` orayı sınıyor).
    const status = await screen.findByTestId('api-status');
    expect(status.textContent).toContain('/fms/api/health');
    expect(status.textContent).not.toBe('[object Object]');
  });

  it('çerez yoksa "yok" yazar', async () => {
    configureBasePath('/fms');
    mockFetchOk(HEALTH_OK);

    render(<App />);
    await screen.findByText('ok');

    expect(screen.getByTestId('cookie').textContent).toBe('yok');
  });
});
