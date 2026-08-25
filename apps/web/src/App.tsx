import { basePathConfig } from '@fms/shared';
import { useEffect, useState } from 'react';

import { ErrorBoundary } from './components/ErrorBoundary.js';
import { apiRequest } from './lib/api.js';

/**
 * Alt yol kanıt ekranı — Faz 1.8.
 *
 * Gerçek arayüz değil: `/fms` alt yolunun her katmanda tuttuğunu gösteren en
 * küçük yüzey. Faz 6'da tasarım sistemi, Faz 17'de gerçek kabuk gelecek.
 *
 * TODO(Faz 5): buradaki etiketler i18n altyapısı gelince `t()` üzerinden
 * alınacak (K5). Şu an i18n paketi henüz kurulmadı.
 */
interface HealthResponse {
  readonly status: string;
  readonly basePath: string;
  readonly apiPrefix: string;
  readonly cookiePath: string;
}

/**
 * Üç katmanlı sınır hiyerarşisinin ORTA ve İÇ katmanları — 2.6.
 *
 * `main.tsx` **kök** sınırı kuruyor. Burada:
 *   • **ekran** sınırı — bir ekran çökerse kabuk ayakta kalsın
 *   • **bileşen** sınırı — tek bir hücre çökerse ekranın geri kalanı dursun
 *
 * ⚠️ ARADAKİ HER ŞEY KAYITSIZ ALANDIR ve bu bilinçli: sınır koymadığımız bir
 * yerde patlayan hata **bir üst sınıra tırmanır**. Testler bunu ayrıca
 * doğruluyor — hiyerarşinin değeri tam olarak bu tırmanmada.
 */
export function App(): React.ReactElement {
  return (
    <ErrorBoundary name="ekran" title="Bu ekran yüklenemedi">
      <BasePathProbeScreen />
    </ErrorBoundary>
  );
}

function BasePathProbeScreen(): React.ReactElement {
  const config = basePathConfig();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cookie, setCookie] = useState<string>('');
  const [correlationId, setCorrelationId] = useState<string>('');
  const [chainClosed, setChainClosed] = useState<boolean | null>(null);

  useEffect(() => {
    // Çıplak `fetch` DEĞİL: zincir `apiRequest` üzerinden kuruluyor (2.3b).
    // Gönderilen ve sunucunun geri verdiği kimlik ekranda gösteriliyor ki
    // 2. kabul kriteri (tarayıcı ↔ sunucu log eşleşmesi) gözle kanıtlanabilsin.
    apiRequest<HealthResponse>('/health')
      .then((result) => {
        setHealth(result.data);
        setCookie(document.cookie);
        setCorrelationId(result.correlationId);
        setChainClosed(result.serverCorrelationId === result.correlationId);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause));
      });
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24, lineHeight: 1.6 }}>
      <h1>Alt yol kanıtı</h1>
      <table>
        <tbody>
          <tr>
            <td>base</td>
            <td data-testid="base">{config.base}</td>
          </tr>
          <tr>
            <td>router basename</td>
            <td data-testid="basename">{config.routerBasename}</td>
          </tr>
          <tr>
            <td>api prefix</td>
            <td data-testid="api-prefix">{config.apiPrefix}</td>
          </tr>
          <tr>
            <td>servis çalışanı kapsamı</td>
            <td data-testid="sw-scope">{config.serviceWorkerScope}</td>
          </tr>
          <tr>
            <td>PWA start_url</td>
            <td data-testid="pwa-start">{config.pwa.startUrl}</td>
          </tr>
          <tr>
            <td>konum</td>
            <td data-testid="location">{window.location.pathname}</td>
          </tr>
          <tr>
            <td>API durumu</td>
            <td>
              {/* BİLEŞEN sınırı — hiyerarşinin en içi. Bu hücre çökerse
                  tablonun geri kalanı ayakta kalır; ekran sınırına tırmanmaz. */}
              <ErrorBoundary name="bilesen" title="Bu alan gösterilemedi">
                <span data-testid="api-status">{error ?? health?.status ?? 'bekleniyor'}</span>
              </ErrorBoundary>
            </td>
          </tr>
          <tr>
            <td>çerez</td>
            <td data-testid="cookie">{cookie === '' ? 'yok' : cookie}</td>
          </tr>
          <tr>
            <td>correlationId</td>
            <td data-testid="correlation-id">
              {correlationId === '' ? 'bekleniyor' : correlationId}
            </td>
          </tr>
          <tr>
            <td>zincir kapandı mı</td>
            <td data-testid="chain-closed">
              {chainClosed === null ? 'bekleniyor' : chainClosed ? 'evet' : 'HAYIR'}
            </td>
          </tr>
        </tbody>
      </table>
    </main>
  );
}
