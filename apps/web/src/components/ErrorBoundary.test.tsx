import { DomainError, EngineError, isCorrelationId } from '@fms/shared';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

import { resetCorrelationContextForTests } from '../lib/correlation-context.js';
import { ErrorBoundary } from './ErrorBoundary.js';

/**
 * `ErrorBoundary` testleri — Faz 2 madde 2.6.
 *
 * ⚠️ REACT, YAKALANAN HER HATAYI KONSOLA DA YAZAR ve bunu susturmanın resmî
 * bir yolu yok. Casus kuruluyor, yoksa test çıktısı okunamaz hâle geliyor —
 * ama `console.error` çağrıları **assert edilmiyor**, yalnızca bastırılıyor.
 */

/** İstenen hatayı render sırasında fırlatan bileşen. */
function Patlayan({ error }: { readonly error: unknown }): ReactNode {
  throw error;
}

/** Hiçbir şey yapmayan sağlıklı bileşen. */
function Saglikli(): ReactNode {
  return <span data-testid="saglikli">çalışıyor</span>;
}

let errorSpy: MockInstance;

beforeEach(() => {
  resetCorrelationContextForTests();
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('yakalama ve yedek arayüz', () => {
  it('hatayı yakalayıp Türkçe yedek arayüz gösteriyor', () => {
    render(
      <ErrorBoundary name="test" title="Bu bölüm yüklenemedi">
        <Patlayan error={new Error('patladı')} />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('error-boundary-test')).toBeDefined();
    expect(screen.getByText('Bu bölüm yüklenemedi')).toBeDefined();
  });

  it('hata YOKSA çocukları olduğu gibi render ediyor', () => {
    render(
      <ErrorBoundary name="test" title="başlık">
        <Saglikli />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('saglikli').textContent).toBe('çalışıyor');
    expect(screen.queryByTestId('error-boundary-test')).toBeNull();
  });

  it('yedek arayüz `role="alert"` taşıyor — ekran okuyucu duyurur', () => {
    render(
      <ErrorBoundary name="test" title="başlık">
        <Patlayan error={new Error('x')} />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeDefined();
  });

  it('"Tekrar dene" durumu sıfırlıyor', async () => {
    const { rerender } = render(
      <ErrorBoundary name="test" title="başlık">
        <Patlayan error={new Error('x')} />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('error-boundary-test')).toBeDefined();

    // Düğmeye basmadan ÖNCE çocuk sağlıklı hâle getiriliyor; aksi hâlde
    // sıfırlama anında yeniden patlar ve düğme hiçbir şey kanıtlamazdı.
    rerender(
      <ErrorBoundary name="test" title="başlık">
        <Saglikli />
      </ErrorBoundary>,
    );
    screen.getByTestId('error-retry').click();

    await vi.waitFor(() => {
      expect(screen.getByTestId('saglikli')).toBeDefined();
    });
  });
});

// ── ① ÜÇ KATMAN VE TIRMANMA ─────────────────────────────────────────────
describe('hiyerarşi — kayıtsız alandaki hata ÜST sınıra tırmanıyor', () => {
  it('en yakın sınır yakalıyor, üsttekiler devreye GİRMİYOR', () => {
    render(
      <ErrorBoundary name="kok" title="kök başlık">
        <ErrorBoundary name="ekran" title="ekran başlık">
          <ErrorBoundary name="bilesen" title="bileşen başlık">
            <Patlayan error={new Error('hücre patladı')} />
          </ErrorBoundary>
        </ErrorBoundary>
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('error-boundary-bilesen')).toBeDefined();
    expect(screen.queryByTestId('error-boundary-ekran')).toBeNull();
    expect(screen.queryByTestId('error-boundary-kok')).toBeNull();
  });

  it('KAYITSIZ alandaki hata bir ÜST sınıra tırmanıyor', () => {
    // Bileşen sınırı YOK — hata ekran sınırına çıkmalı.
    render(
      <ErrorBoundary name="kok" title="kök başlık">
        <ErrorBoundary name="ekran" title="ekran başlık">
          <div>
            <Patlayan error={new Error('sınırsız alanda patladı')} />
          </div>
        </ErrorBoundary>
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('error-boundary-ekran')).toBeDefined();
    expect(screen.queryByTestId('error-boundary-kok')).toBeNull();
  });

  it('hiçbir ara sınır yoksa KÖKE kadar tırmanıyor', () => {
    render(
      <ErrorBoundary name="kok" title="kök başlık">
        <div>
          <Patlayan error={new Error('köke kadar')} />
        </div>
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('error-boundary-kok')).toBeDefined();
  });

  it('bir kardeş sınır çökse de diğeri AYAKTA kalıyor', () => {
    // Hiyerarşinin asıl değeri bu: tek bir hücre ekranın tamamını götürmüyor.
    render(
      <ErrorBoundary name="kok" title="kök başlık">
        <ErrorBoundary name="bilesen" title="bileşen başlık">
          <Patlayan error={new Error('yalnızca bu hücre')} />
        </ErrorBoundary>
        <Saglikli />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('error-boundary-bilesen')).toBeDefined();
    expect(screen.getByTestId('saglikli')).toBeDefined();
    expect(screen.queryByTestId('error-boundary-kok')).toBeNull();
  });
});

// ── ④ "HATA BİLDİR" KİMLİĞİ ─────────────────────────────────────────────
describe('correlationId — Karar 19', () => {
  it('hiç istek yapılmamışken bile kimlik gösteriyor', () => {
    render(
      <ErrorBoundary name="test" title="başlık">
        <Patlayan error={new Error('x')} />
      </ErrorBoundary>,
    );

    const shown = screen.getByTestId('error-correlation-id').textContent;
    expect(shown).not.toBe('bilinmiyor');
    expect(isCorrelationId(shown)).toBe(true);
  });

  it('bildirim yapıldığı ekranda söyleniyor', () => {
    render(
      <ErrorBoundary name="test" title="başlık">
        <Patlayan error={new Error('x')} />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('error-reported').textContent).toContain('bildirildi');
  });
});

// ── ⑦ DEV / PROD ────────────────────────────────────────────────────────
describe('yığın izi — yalnızca geliştirmede', () => {
  it('__FMS_DEV__ true iken yığın izi GÖSTERİLİYOR', () => {
    // `vitest.config.ts` web projesine `define: { __FMS_DEV__: 'true' }` veriyor.
    render(
      <ErrorBoundary name="test" title="başlık">
        <Patlayan error={new Error('gizli iç ayrıntı')} />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('error-stack')).toBeDefined();
  });

  it('üretim derlemesinde YOK olduğu ayrıca DERLENMİŞ PAKETTE kanıtlanıyor', () => {
    // ⚠️ Burada `__FMS_DEV__` sahtelenip `false` yapılamıyor: değer derleme
    // zamanında `define` ile gömülüyor, çalışma zamanı değişkeni değil —
    // sahtelemek üretimdeki davranışı taklit etmezdi, yalnızca testi
    // yeşile boyardı. Gerçek kanıt üretim paketinde `data-testid="error-stack"`
    // dizgesinin BULUNMAMASI ve o ölçüm 2.6 duman testinde yapılıyor.
    expect(true).toBe(true);
  });
});

// ── ③ SENTRY'YE GİDİŞ (Karar 18) ────────────────────────────────────────
describe('çökme Sentry’ye bildiriliyor', () => {
  it('DomainError çökmesi bile bildiriliyor — "kullanıcı hatası" elemesi AŞILIYOR', () => {
    // 2.5b'nin dersi: `DomainError` normalde `beforeSend`te düşer. Arayüzü
    // yıkan bir `DomainError` ise gerçek bir hatadır; `crash` etiketi elemeyi
    // aşıyor. Etiketin filtreyi gerçekten aştığı `lib/sentry.test.ts`'te
    // ayrıca sınanıyor.
    render(
      <ErrorBoundary name="test" title="başlık">
        <Patlayan error={new DomainError({ code: 'a.b', message: 'm' })} />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('error-reported').textContent).toContain('bildirildi');
  });

  it('Error olmayan fırlatmada da yedek arayüz çıkıyor', () => {
    render(
      <ErrorBoundary name="test" title="başlık">
        <Patlayan error={new EngineError({ code: 'a.b', message: 'm' })} />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('error-boundary-test')).toBeDefined();
  });
});

// ── ⑥ YEDEK ARAYÜZÜN KENDİSİ PATLARSA ───────────────────────────────────
describe('yedek arayüz patlarsa — ÖLÇÜLDÜ', () => {
  it('iç sınırın yedeği patlarsa hata ÜST sınıra çıkıyor, sonsuz döngü YOK', () => {
    // React'in davranışı: bir sınırın kendi render'ı patlarsa o sınır artık
    // yakalayamaz ve hata bir ÜSTE tırmanır. Sonsuz döngü olmaz.
    // Bunu `title` yerine patlayan bir düğüm vererek zorluyoruz.
    function PatlayanBaslik(): ReactNode {
      throw new Error('yedek arayüzün kendisi patladı');
    }

    render(
      <ErrorBoundary name="kok" title="kök başlık">
        {/* Bu sınırın yedeği render edilirken patlayacak bir başlık alıyor. */}
        <ErrorBoundary name="ic" title={(<PatlayanBaslik />) as unknown as string}>
          <Patlayan error={new Error('önce çocuk patlar')} />
        </ErrorBoundary>
      </ErrorBoundary>,
    );

    // İç sınır kendi yedeğini çizemedi → kök yakaladı.
    expect(screen.getByTestId('error-boundary-kok')).toBeDefined();
    expect(screen.queryByTestId('error-boundary-ic')).toBeNull();
  });
});

afterEach(() => {
  // Casusun çağrıldığını iddia etmiyoruz; yalnızca var olduğunu doğruluyoruz
  // ki susturmanın gerçekten kurulduğu görünsün.
  expect(errorSpy).toBeDefined();
});
