import { basePathConfig, configureBasePath } from '@fms/shared';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import { App } from './App.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { setupBrowserSentryFromBuild } from './lib/sentry.js';

/**
 * Derleme zamanında Vite tarafından yerine konur (vite.config.ts `define`).
 * Sunucu tarafında `process.env.PUBLIC_BASE_PATH`, istemcide bu sabit —
 * ikisi de aynı tek kaynaktan (`PUBLIC_BASE_PATH`) türer.
 */
declare const __FMS_BASE_PATH__: string;

// İlk iş: alt yolu yapılandır. Bundan sonra basePath()/apiPath() doğru üretir.
configureBasePath(__FMS_BASE_PATH__);

// İkinci iş: hata izleme. React ağacı kurulmadan ÖNCE çağrılır ki render
// sırasında çıkan bir hata da yakalansın. DSN boşsa hiç kurulmaz — geliştirme
// ortamı ağa çıkmaz ve kota yanmaz (2.5b).
setupBrowserSentryFromBuild();

const container = document.getElementById('root');
if (container === null) {
  throw new Error('#root bulunamadı — index.html bozulmuş olabilir.');
}

createRoot(container).render(
  <StrictMode>
    {/* basename tek kaynaktan; elle '/fms' yazılmaz (K6). */}
    {/* KÖK sınır — buraya kadar tırmanan hiçbir şey beyaz ekrana dönüşmesin.
        Üç katmanın en dışı; alttakiler yakalayamazsa son durak burası. */}
    <ErrorBoundary name="kok" title="Uygulama beklenmedik bir hatayla karşılaştı">
      <BrowserRouter basename={basePathConfig().routerBasename}>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
