import {
  ASSERTION_MODES,
  basePathConfig,
  configureAssertions,
  configureBasePath,
} from '@fms/shared';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import { App } from './App.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { currentCorrelationId } from './lib/correlation-context.js';
import { createBrowserLogger } from './lib/logger.js';
import { setupBrowserSentryFromBuild } from './lib/sentry.js';

/**
 * Derleme zamanında Vite tarafından yerine konur (vite.config.ts `define`).
 * Sunucu tarafında `process.env.PUBLIC_BASE_PATH`, istemcide bu sabit —
 * ikisi de aynı tek kaynaktan (`PUBLIC_BASE_PATH`) türer.
 */
declare const __FMS_BASE_PATH__: string;

/** Geliştirme derlemesi mi? Vite `mode`'undan türeyip pakete gömülür (2.6). */
declare const __FMS_DEV__: boolean;

// İlk iş: alt yolu yapılandır. Bundan sonra basePath()/apiPath() doğru üretir.
configureBasePath(__FMS_BASE_PATH__);

/**
 * Değişmez kontrollerinin kipi — Faz 2 kabul kriteri 4 (2.7).
 *
 * ⚠️ `NODE_ENV` KOKLANMIYOR. Değer `__FMS_DEV__`ten geliyor ve o da Vite'ın
 * açık `mode` girdisinden **derleme zamanında** türetilip pakete gömülüyor.
 * Faz 1 hata #9'un tuzağı bunun TERSİYDİ: çalışma zamanında
 * `process.env.NODE_ENV` okumak. Bir çalışma zamanı bayrağı (env değişkeni)
 * de yeterli olmazdı — sonradan değiştirilebilen bir bayrak, derlemeye
 * sabitlenmiş bir bayrağın garantisini vermez.
 *
 * **Dev → `throw`:** savunma kontrolü erken ve gürültülü başarısız olsun.
 * **Prod → `report`:** kullanıcının ekranını bir savunma kontrolü karartmasın;
 * ihlal `logger.warn` ile kayda geçer ve iş devam eder.
 *
 * ⚠️ BU ÇAĞRI YALNIZCA TARAYICIDA VAR. Motor, `apps/api` ve `apps/worker`
 * `configureAssertions` çağırmıyor, yani orada varsayılan `throw` geçerli —
 * `docs/spec/09` §11.3'ün "ihlal → tur geri alınır" şartıyla tutarlı.
 * Motor bu fonksiyonu import bile EDEMEZ (`arch:check`).
 */
const assertionLogger = createBrowserLogger({ level: 'info' });

configureAssertions(
  __FMS_DEV__
    ? { mode: ASSERTION_MODES.throw }
    : {
        mode: ASSERTION_MODES.report,
        // Bildirici burada kuruluyor çünkü `assert.ts` logger'ı BİLMİYOR —
        // yalnızca bir fonksiyon çağırıyor (2.3c `contextProvider` deseni).
        // `correlationId` `correlation-context`ten geliyor: `ErrorBoundary`
        // hangi kimliği gösteriyorsa log satırı da onu taşısın (Karar 19).
        report: (violation) => {
          assertionLogger.warn(
            { ...violation.context, code: violation.code, correlationId: currentCorrelationId() },
            violation.message,
          );
        },
      },
);

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
