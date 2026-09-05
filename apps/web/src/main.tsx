// Stil giriş noktası: fontlar -> üretilmiş token'lar -> Tailwind (6.3).
import './app/theme.css';

import {
  ASSERTION_MODES,
  basePathConfig,
  configureAssertions,
  configureBasePath,
} from '@fms/shared';
import {
  applyTheme,
  DEFAULT_ROOT_FONT_SCALE,
  DEFAULT_THEME_PREFERENCE,
  readSystemPrefersDark,
  readSystemPrefersReducedMotion,
  resolveThemeMode,
} from '@fms/ui';
import type { i18n as I18nInstance } from 'i18next';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter } from 'react-router';

import { App } from './App.js';
import { createI18n } from './app/i18n.js';
import { DebugPanel } from './components/dev/DebugPanel.js';
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

/**
 * Üçüncü iş: tema (6.3). React ağacından ÖNCE, çünkü `data-theme` niteliği
 * ilk boyamadan önce yerinde olmalı — sonra yazılırsa kullanıcı bir kare
 * boyunca yanlış temayı görür ("flash of wrong theme").
 *
 * ⚠️ **Tercih henüz KALICI DEĞİL.** Kullanıcının seçimini saklayan bir ayar
 * yüzeyi yok; `DEFAULT_THEME_PREFERENCE` (`dark`, §7.1'in varsayılanı)
 * kullanılıyor. Kalıcılık bir ayarlar ekranı ister ve o **Faz 17**'nin işi —
 * `isThemePreference()` okunan değeri doğrulamak için şimdiden hazır.
 *
 * ⚠️ Ortam sinyalleri burada okunuyor, `applyTheme` içinde değil: o fonksiyon
 * saf kalsın ve jsdom'da tam test edilebilsin diye (6.0 ölçtü: `matchMedia`
 * jsdom'da tanımsız).
 */
applyTheme(document.documentElement, {
  mode: resolveThemeMode(DEFAULT_THEME_PREFERENCE, readSystemPrefersDark()),
  reducedMotion: readSystemPrefersReducedMotion(),
  fontScale: DEFAULT_ROOT_FONT_SCALE,
});

const container = document.getElementById('root');
if (container === null) {
  throw new Error('#root bulunamadı — index.html bozulmuş olabilir.');
}

/**
 * Kök React kökü — DIŞA AKTARILIYOR.
 *
 * ⚠️ Gerekçe Faz 3.3'te ÖLÇÜLDÜ. Kök tutulmayınca `main.test.tsx` monte ettiği
 * ağacı hiçbir zaman söküyordu değildi; test dosyası bitip Vitest jsdom ortamını
 * yıkınca React'in zamanlayıcısında bekleyen iş (`performWorkUntilDeadline`,
 * `setImmediate` üzerinden) `window` yokken çalışıyor ve
 * **`ReferenceError: window is not defined`** fırlatıyordu.
 *
 * Vitest bunu "unhandled error" sayıp koşuyu **exit 1** yapıyor — 598 testin
 * hepsi geçerken. Yarış makine hızına bağlı: CI'da **amd64 kırıldı, arm64 geçti**
 * ve yerelde beş koşuda hiç tekrar üretilemedi. Yani "yeniden koş" bir çözüm
 * değil; sökme kancası olmalı.
 *
 * Üretimde bu değer kullanılmıyor — gerçek bir tarayıcı `window`u yıkmaz.
 * Dışa aktarmanın maliyeti sıfır: modül zaten yan etkili, kök yalnızca artık
 * çöpe atılmıyor.
 */
export const root = createRoot(container);

/**
 * ⚠️ i18n BİR ÖNYÜKLEME ÖN KOŞULU — `configureBasePath` ile aynı sınıfta.
 *
 * **Sorulan soru (5.4):** hata arayüzü `t()`ye bağlanırsa, i18n'in kendisi
 * çöktüğünde ne olur? Kök `ErrorBoundary` onu yakalar ve sonra **az önce çöken
 * sisteme** metin sormaya çalışır — kullanıcı boş ekran ya da ham anahtar görür.
 * *"Bir hata arayüzü, bozulmuş olabilecek sisteme bağlanamaz."*
 *
 * **Çözüm:** i18n `root.render()`tan **ÖNCE** kurulur ve başarısı **açıkça
 * denetlenir**. Başarılıysa React monte edilir ve her `t()` güvenlidir;
 * başarısızsa React **hiç monte edilmez** — aşağıdaki statik metin basılır.
 *
 * ⚠️ **`try/catch` YETMEZ VE BU ÖLÇÜLDÜ:** i18next bozuk bir yapılandırmada
 * **fırlatmıyor**, sessizce `isInitialized`ı `undefined` bırakıyor. Yani
 * başarısızlık **falsy bir değer** olarak geliyor — *"falsy bir değer,
 * «özellik yok» anlamına da gelebilir; karşı kontrol zorunlu."*
 * Bu yüzden hem `try/catch` **hem de** `=== true` kontrolü var.
 */
const I18N_BOOT_FAILURE_MESSAGE =
  'Uygulama başlatılamadı: dil dosyaları yüklenemedi. Lütfen sayfayı yenileyin.';

/**
 * ⚠️ K5'İN TEK BİLİNÇLİ MUAFİYETİ — ve gerekçesi yapısal, kolaylık değil.
 *
 * Yukarıdaki dize `t()` üzerinden **gelemez**, çünkü onu basmamızın sebebi
 * `t()`nin çalışmamasıdır. Bir çeviri katmanının çöküş mesajı o katmandan
 * alınamaz. Muafiyet **tek bir dize**, adlandırılmış bir sabit, ve React'in
 * dışında — 5.5'in JSX kuralı buraya zaten bakmayacak, ama muafiyet
 * **sessiz değil yazılı**.
 */
function bootI18n(): I18nInstance | undefined {
  try {
    const instance = createI18n();
    return instance.isInitialized ? instance : undefined;
  } catch {
    return undefined;
  }
}

const i18n = bootI18n();

if (i18n === undefined) {
  assertionLogger.error({ code: 'i18n.bootFailed' }, 'i18n başlatılamadı — React monte edilmiyor');
  container.textContent = I18N_BOOT_FAILURE_MESSAGE;
}

if (i18n !== undefined) {
  root.render(
    <StrictMode>
      {/* basename tek kaynaktan; elle '/fms' yazılmaz (K6). */}
      {/* KÖK sınır — buraya kadar tırmanan hiçbir şey beyaz ekrana dönüşmesin.
        Üç katmanın en dışı; alttakiler yakalayamazsa son durak burası.
        ⚠️ `t()` burada GÜVENLİ: i18n yukarıda doğrulandı. */}
      <I18nextProvider i18n={i18n}>
        <ErrorBoundary name="kok" titleKey="boundary.root">
          <BrowserRouter basename={basePathConfig().routerBasename}>
            <App />
          </BrowserRouter>
        </ErrorBoundary>

        {/* ⚠️ HATA AYIKLAMA PANELİ — KÖK SINIRIN İÇİNDE DEĞİL, KARDEŞİ (2.8).
        İçeride olsaydı panelin çökmesi kök sınırı tetikler ve bir hata ayıklama
        aracı bütün uygulamayı yedek arayüze düşürürdü — aracın amacının tam
        tersi. Kendi sınırı var; panel çökse bile uygulama ayakta kalıyor.

        `__FMS_DEV__` derleme zamanı sabiti: üretimde dal ölüyor, `DebugPanel`
        importu kullanılmaz hale geliyor ve ağaç sarsma paneli paketten
        tamamen siliyor. Kanıtı grep DEĞİL, panelin içindeki dize nöbetçisi
        (`__FMS_DEV_PANEL__`) — Karar 3, günlük #53. */}
        {__FMS_DEV__ ? (
          <ErrorBoundary name="hata-ayiklama-paneli" titleKey="boundary.debugPanel">
            <DebugPanel />
          </ErrorBoundary>
        ) : null}
      </I18nextProvider>
    </StrictMode>,
  );
}
