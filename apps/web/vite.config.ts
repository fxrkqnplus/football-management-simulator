import { deriveBasePathConfig } from '@fms/shared';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

/**
 * Vite yapılandırması — alt yol tek kaynaktan gelir.
 *
 * `base`, proxy yolu ve önizleme davranışı `PUBLIC_BASE_PATH`'ten türetilir.
 * Buraya `/fms` YAZILMAZ (K6): tek bir ortam değişkeni değişince altı katmanın
 * hepsi birlikte değişmeli.
 *
 * ⚠️ `envDir` göreli verilir ve `process.cwd()`'ye göre çözülür; Vite bu paketin
 * dizininden çalıştırıldığı için `../..` depo köküne denk gelir.
 * İlk yazımda `new URL('../..', import.meta.url).pathname` kullanmıştım —
 * Windows'ta bu `/C:/fms/` üretiyor, `loadEnv` hiçbir şey bulamıyor ve `base`
 * sessizce `/` oluyordu. Derleme başarılı görünüyor, varlıklar üretimde 404
 * veriyordu (docs/ADR/0004 — Windows/Linux yol ayrışması).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../..', '');
  const rawBasePath = env['PUBLIC_BASE_PATH'];

  // Sessizce köke düşmek yerine yüksek sesle dur: alt yol yanlış yapılandığında
  // hata çalışma zamanında 404 olarak çıkar ve sebebi geç anlaşılır (K6).
  if (rawBasePath === undefined || rawBasePath === '') {
    throw new Error(
      [
        '',
        '  ✖ PUBLIC_BASE_PATH okunamadı; Vite `base` değeri belirlenemiyor.',
        '',
        '    Uygulama bir alt yolda çalışır. `base` yanlış olursa üretim',
        '    derlemesi sorunsuz görünür ama tüm varlıklar 404 verir.',
        '',
        '    Kontrol: depo kökünde .env var mı, PUBLIC_BASE_PATH tanımlı mı?',
        '        cp .env.example .env',
        '',
      ].join('\n'),
    );
  }

  // NOT: NODE_ENV kapısı burada DEĞİL, scripts/check-env-file.mjs'te.
  // Vite derleme sırasında process.env.NODE_ENV'i kendisi 'production' yapıyor
  // ve loadEnv bunu dosyadan gelmiş gibi birleştiriyor; buradaki bir kontrol
  // temiz depoda da hata verirdi.

  const config = deriveBasePathConfig(rawBasePath);
  const apiTarget = `http://localhost:${env['API_PORT'] ?? '3001'}`;

  const proxy = {
    [config.apiPrefix]: {
      target: apiTarget,
      changeOrigin: false,
    },
  };

  return {
    base: config.viteBase,
    plugins: [react()],
    // Alt yol değeri istemciye derleme zamanında gömülür; main.tsx bunu
    // configureBasePath()'e verir.
    define: {
      __FMS_BASE_PATH__: JSON.stringify(config.base),
    },
    server: {
      port: Number(env['WEB_PORT'] ?? '3000'),
      proxy,
    },
    preview: {
      port: Number(env['WEB_PORT'] ?? '3000'),
      proxy,
    },
  };
});
