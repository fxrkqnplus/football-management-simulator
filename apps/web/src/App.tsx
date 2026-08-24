import { apiPath, basePathConfig } from '@fms/shared';
import { useEffect, useState } from 'react';

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

export function App(): React.ReactElement {
  const config = basePathConfig();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cookie, setCookie] = useState<string>('');

  useEffect(() => {
    const url = apiPath('/health');
    fetch(url, { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`API ${String(response.status)} döndü: ${url}`);
        }
        return (await response.json()) as HealthResponse;
      })
      .then((data) => {
        setHealth(data);
        setCookie(document.cookie);
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
            <td data-testid="api-status">{error ?? health?.status ?? 'bekleniyor'}</td>
          </tr>
          <tr>
            <td>çerez</td>
            <td data-testid="cookie">{cookie === '' ? 'yok' : cookie}</td>
          </tr>
        </tbody>
      </table>
    </main>
  );
}
