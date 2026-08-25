import { deriveBasePathConfig, resetBasePathForTests } from '@fms/shared';
import { waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `main.tsx` önyükleme testi — Faz 2.0b.
 *
 * Burada sınanan tek şey **montaj sözleşmesi**: `#root` yoksa uygulama sessizce
 * boş ekran göstermek yerine yüksek sesle durmalı. Sessiz boş ekran, sebebi en
 * geç anlaşılan hata sınıflarından biridir — `index.html` bozulur, paket
 * yüklenir, konsol temizdir, ekran beyazdır.
 *
 * Modül düzeyinde yan etkisi olan bir dosya test ediliyor: import edildiği anda
 * `createRoot().render()` çalışıyor. Bu yüzden her senaryodan önce
 * `vi.resetModules()` gerekiyor — ESM modül önbelleği temizlenmezse ikinci
 * import gövdeyi HİÇ çalıştırmaz ve test yanlışlıkla "geçer".
 *
 * `__FMS_BASE_PATH__` normalde Vite'ın `define` ile derleme zamanında gömdüğü
 * bir sabit; testte serbest değişken olarak kalır, bu yüzden globalde taklit
 * ediliyor.
 *
 * ⚠️ jsdom'un varsayılan adresi `/` — ÖLÇÜLDÜ (2.0b): bu haliyle
 * `<BrowserRouter basename="/fms">` hiçbir şey render etmiyor ve konsola
 * *"is not able to match the URL … because it does not start with the
 * basename"* yazıyor. Yani jsdom'un varsayılanı uygulamanın gerçek dağıtım
 * adresini taklit etmiyor. Test önce tarayıcıyı alt yola taşıyor; hedef adres
 * `deriveBasePathConfig()`ten türetiliyor, elle yazılmıyor (K6).
 */
const BASE_PATH = '/fms';
const basePathConfig = deriveBasePathConfig(BASE_PATH);

describe('main.tsx — önyükleme', () => {
  beforeEach(() => {
    vi.resetModules();
    resetBasePathForTests();
    window.history.pushState({}, '', basePathConfig.viteBase);
    vi.stubGlobal('__FMS_BASE_PATH__', BASE_PATH);
    // 2.5b'de eklendi: `main.tsx` artık Sentry'yi de kuruyor ve o da derleme
    // zamanı sabitleri okuyor. DSN **bilerek boş** — testte SDK kurulmamalı,
    // yoksa test koşusu ağa çıkmaya çalışırdı.
    vi.stubGlobal('__FMS_SENTRY_DSN__', '');
    vi.stubGlobal('__FMS_SENTRY_RELEASE__', '');
    vi.stubGlobal('__FMS_SERVER_MODE__', 'private');
    // GERÇEK `Response` — düz nesne değil. `apiRequest` yanıt BAŞLIĞINI okuyor
    // ve eksik bir sahte, taklit ettiği sözleşmenin yüzeyini eksik taklit eder
    // (günlük #30'un aynı dersi).
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }))),
    );
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetBasePathForTests();
    document.body.innerHTML = '';
  });

  it('#root varsa uygulamayı oraya monte eder', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);

    await import('./main.js');

    // `await import(...)` yalnızca MODÜLÜN yüklenmesini bekler. React 19'da
    // `createRoot().render()` senkron değil — iş planlar, DOM hemen dolmaz
    // (ölçüldü: import'tan hemen sonra `root.innerHTML` boş). Bu yüzden
    // render'ın akmasını ayrıca beklemek gerekiyor.
    await waitFor(() => {
      expect(root.innerHTML.length).toBeGreaterThan(0);
    });
  });

  it('#root yoksa sessiz boş ekran yerine Türkçe hata fırlatır', async () => {
    // #root bilerek eklenmedi.
    await expect(import('./main.js')).rejects.toThrow('#root bulunamadı');
  });
});
