/**
 * i18n ÖNYÜKLEME BAŞARISIZLIĞI — kontrol deneyi, kalıcı nöbetçi.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN AYRI BİR DOSYA
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Bu dosya `./app/i18n.js`i **modül düzeyinde** taklit ediyor; `main.test.tsx`
 * ile aynı dosyada olsaydı oradaki bütün testler de bozuk bir i18n görürdü.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NE İDDİA EDİYOR — ve neden bir yorum yeterli değildi
 * ────────────────────────────────────────────────────────────────────────────
 *
 * 5.4'ün en pahalı tasarım sorusu: *"hata arayüzü `t()`ye bağlanırsa, i18n'in
 * kendisi çöktüğünde ne olur?"* Cevap `main.tsx`e yazıldı — i18n render'dan
 * **önce** doğrulanır, başarısızsa React **hiç monte edilmez**. Ama
 * *"herhâlde çalışır"* bir ölçüm değildir: bu test o yolu **koşturuyor**.
 *
 * ⚠️ Taklit, ölçülmüş gerçek başarısızlık biçimini kullanıyor: i18next bozuk
 * bir yapılandırmada **fırlatmıyor**, yalnızca `isInitialized`ı `undefined`
 * bırakıyor. `try/catch` bunu göremezdi — `main.tsx` bu yüzden `=== true`
 * kontrolüne dayanıyor ve test tam olarak o dalı sürüyor.
 *
 * ℹ️ **Karşı yön `main.test.tsx`te:** i18n çalıştığında React monte oluyor ve
 * kök sınır render ediliyor. İki dosya birlikte iki yönlü kontrol deneyi.
 */
import { expect, it, vi } from 'vitest';

vi.mock('./app/i18n.js', () => ({
  createI18n: () => ({ isInitialized: undefined }),
}));

it('i18n çökerse React monte EDİLMİYOR ve statik yedek metin görünüyor', async () => {
  vi.stubGlobal('__FMS_BASE_PATH__', '/fms');
  vi.stubGlobal('__FMS_DEV__', false);
  vi.stubGlobal('__FMS_SENTRY_DSN__', '');
  vi.stubGlobal('__FMS_SENTRY_RELEASE__', '');
  vi.stubGlobal('__FMS_SERVER_MODE__', 'private');

  const container = document.createElement('div');
  container.id = 'root';
  document.body.append(container);

  await import('./main.js');

  // Statik yedek — `t()` ÜZERİNDEN GELMİYOR ve gelemez: onu basmamızın sebebi
  // `t()`nin çalışmamasıdır. K5'in tek bilinçli muafiyeti (`main.tsx`te yazılı).
  expect(container.textContent).toContain('Uygulama başlatılamadı');

  // ⚠️ ASIL İDDİA BU: React hiç monte edilmedi. Yalnızca metnin görünmesi
  // yetmezdi — bozuk bir i18n ile monte edilmiş bir ağaç da metin gösterebilir
  // ve ham anahtarlarla çalışmaya devam ederdi.
  expect(container.children.length).toBe(0);
});
