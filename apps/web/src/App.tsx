import { basePathConfig } from '@fms/shared';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorBoundary } from './components/ErrorBoundary.js';
import { apiRequest } from './lib/api.js';

/**
 * Alt yol kanıt ekranı — Faz 1.8.
 *
 * Gerçek arayüz değil: `/fms` alt yolunun her katmanda tuttuğunu gösteren en
 * küçük yüzey. Faz 6'da tasarım sistemi, Faz 17'de gerçek kabuk gelecek.
 *
 * ✅ **5.4'te K5'e uyduruldu.** Etiketler `t('diagnostics.*')` üzerinden
 * geliyor. ⚠️ **Envanter ROADMAP'in saydığından FAZLA çıktı:** ROADMAP altı
 * satır listelemişti (kaba Türkçe-karakter taramasından), AST tabanlı envanter
 * bu dosyada **19** ihlal buldu — `base`, `api prefix` gibi **İngilizce**
 * teknik etiketler de JSX'te çıplak metindi ve 5.5'in kuralı dile bakmıyor
 * (bakamaz: `Tekrar dene` hiçbir Türkçe karakter taşımıyor). Bu yüzden
 * `diagnostics.base` gibi anahtarların değeri de İngilizce — **çeviri değil,
 * teknik alan adı**; K5'in istediği şey metnin `t()`den gelmesi, Türkçe
 * olması değil.
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
    <ErrorBoundary name="ekran" titleKey="boundary.screen">
      <BasePathProbeScreen />
    </ErrorBoundary>
  );
}

function BasePathProbeScreen(): React.ReactElement {
  // ⚠️ `common` namespace'i — bu ekranın etiketleri ve `value.*` ortak
  // değerleri orada. Sınır başlıkları `errors`ta ve onları `ErrorBoundary`
  // kendi HOC'uyla çözüyor, bu bileşen değil.
  const { t } = useTranslation('common');
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
      <h1>{t('diagnostics.title')}</h1>
      <table>
        <tbody>
          <tr>
            <td>{t('diagnostics.base')}</td>
            <td data-testid="base">{config.base}</td>
          </tr>
          <tr>
            <td>{t('diagnostics.routerBasename')}</td>
            <td data-testid="basename">{config.routerBasename}</td>
          </tr>
          <tr>
            <td>{t('diagnostics.apiPrefix')}</td>
            <td data-testid="api-prefix">{config.apiPrefix}</td>
          </tr>
          <tr>
            <td>{t('diagnostics.serviceWorkerScope')}</td>
            <td data-testid="sw-scope">{config.serviceWorkerScope}</td>
          </tr>
          <tr>
            <td>{t('diagnostics.pwaStartUrl')}</td>
            <td data-testid="pwa-start">{config.pwa.startUrl}</td>
          </tr>
          <tr>
            <td>{t('diagnostics.location')}</td>
            <td data-testid="location">{window.location.pathname}</td>
          </tr>
          <tr>
            <td>{t('diagnostics.apiStatus')}</td>
            <td>
              {/* BİLEŞEN sınırı — hiyerarşinin en içi. Bu hücre çökerse
                  tablonun geri kalanı ayakta kalır; ekran sınırına tırmanmaz. */}
              <ErrorBoundary name="bilesen" titleKey="boundary.component">
                <span data-testid="api-status">
                  {error ?? health?.status ?? t('value.pending')}
                </span>
              </ErrorBoundary>
            </td>
          </tr>
          <tr>
            <td>{t('diagnostics.cookie')}</td>
            <td data-testid="cookie">{cookie === '' ? t('value.none') : cookie}</td>
          </tr>
          <tr>
            <td>{t('diagnostics.correlationId')}</td>
            <td data-testid="correlation-id">
              {correlationId === '' ? t('value.pending') : correlationId}
            </td>
          </tr>
          <tr>
            <td>{t('diagnostics.chainClosed')}</td>
            <td data-testid="chain-closed">
              {chainClosed === null
                ? t('value.pending')
                : chainClosed
                  ? t('value.yes')
                  : t('value.no')}
            </td>
          </tr>
        </tbody>
      </table>
    </main>
  );
}
