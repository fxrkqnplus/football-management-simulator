/**
 * `packages/ui` test kurulumu — jsdom DOLDURMALARI ve RTL temizliği.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * ⚠️ HER DOLDURMA BİR İDDİADIR
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Bir stub, tarayıcının yaptığı bir şeyi **taklit ediyormuş gibi** yapar. Yanlış
 * taklit eden bir stub testi bir **yalan** üzerine geçirir — ve o yalan üretimde
 * ortaya çıkar (D5). Bu yüzden aşağıdaki her doldurma için üç şey yazılı:
 * **neyi karşılıyor · neyi TAKLİT ETMİYOR · gerçek doğrulamanın hangi fazda**
 * yapılacağı.
 *
 * Liste **ölçümle** oluştu, tahminle değil: bileşenler yazıldı, testler
 * koşturuldu, kırılan her çağrı adıyla eklendi. *"Belki lazım olur"* diye
 * hiçbir şey doldurulmadı — kullanılmayan bir stub, olmayan bir yeteneği var
 * gösterir.
 *
 * 6.0'ın ölçümü (jsdom 30.0.1): `matchMedia` **undefined** ·
 * `getComputedStyle()` `var()`i **çözmüyor** · `getBoundingClientRect()`
 * **0×0** · `ResizeObserver` / `IntersectionObserver` / `scrollIntoView` /
 * `hasPointerCapture` **yok**.
 */
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

/**
 * ① `Element.prototype.scrollIntoView`
 *
 * **Karşıladığı:** Radix Select açılırken seçili öğeyi görünür alana kaydırmak
 * için çağırıyor; jsdom'da fonksiyon **hiç yok** ve çağrı `TypeError` ile
 * bileşeni komple düşürüyor.
 * **TAKLİT ETMEDİĞİ:** hiçbir şey kaydırmıyor. `scrollTop` değişmiyor, hiçbir
 * öğe "görünür" hâle gelmiyor. Yani *"seçili öğe ekranda görünüyor"* iddiası
 * bu ortamda **kanıtlanamaz**.
 * **Gerçek doğrulama:** Faz 17 (G-02, Playwright).
 */
Element.prototype.scrollIntoView = vi.fn();

/**
 * ② İşaretçi yakalama — `hasPointerCapture` · `setPointerCapture` ·
 *    `releasePointerCapture`
 *
 * **Karşıladığı:** Radix Select ve Slider, işaretçi basılıyken olayların aynı
 * öğeye gitmesi için bu üçlüyü kullanıyor. jsdom'da **hiçbiri yok**.
 * **TAKLİT ETMEDİĞİ:** gerçek yakalama semantiği yok — `hasPointerCapture`
 * **her zaman `false`** dönüyor, yani "işaretçi bu öğede kilitli" durumu hiç
 * oluşmuyor. Sürükleme davranışı bu ortamda **sınanamaz**.
 * **Gerçek doğrulama:** Faz 17.
 */
Element.prototype.hasPointerCapture = vi.fn(() => false);
Element.prototype.setPointerCapture = vi.fn();
Element.prototype.releasePointerCapture = vi.fn();

/**
 * ③ `ResizeObserver`
 *
 * **Karşıladığı:** Radix Popover/Select konumlandırma katmanı (Floating UI)
 * tetikleyici ve içerik boyutlarını izliyor. jsdom'da sınıf **hiç yok** ve
 * `new ResizeObserver(...)` `ReferenceError` veriyor.
 * **TAKLİT ETMEDİĞİ:** hiçbir zaman **ateşlemiyor** — `observe()` çağrılıyor,
 * geri çağırma asla çalışmıyor. Boyut değişikliğine tepki veren hiçbir davranış
 * (yeniden konumlandırma, taşma tespiti) bu ortamda oluşmuyor.
 * **Gerçek doğrulama:** Faz 17; görsel doğrulama Faz 49 (G-05).
 */
class ResizeObserverStub implements ResizeObserver {
  observe(): void {
    /* Bilerek boş — ateşlemeyen bir gözlemci. Yukarıdaki uyarıya bak. */
  }
  unobserve(): void {
    /* Bilerek boş. */
  }
  disconnect(): void {
    /* Bilerek boş. */
  }
}
globalThis.ResizeObserver = ResizeObserverStub;

/**
 * ⚠️ **DOLDURULMAYANLAR — ve her birinin GEREKÇESİ.**
 *
 * · **`window.matchMedia` — YAZILDI, ÖLÇÜLDÜ, KALDIRILDI.** İlk taslakta
 *   vardı (jsdom'da `undefined` ve 6.0 onu eksik diye saymıştı). Mutasyon
 *   ölçümü onu **ölü kod** çıkardı: doldurma etkisiz kılınınca `ui` projesinin
 *   **210 testinin hiçbiri kırılmadı**. Sebebi ölçülebilir — 6.4'ün dokuz
 *   bileşeninden hiçbiri medya sorgusu yapmıyor ve `theme-mode.ts`in kendi
 *   testleri `matchMedia`yı **senaryo başına kendileri** sahteliyor.
 *   *"Kullanılmayan bir stub, olmayan bir yeteneği var gösterir"* — bu yüzden
 *   silindi. İhtiyaç doğduğunda (6.8'in hareket azaltma ayarı) **ölçülerek**
 *   geri gelir.
 * · **`getBoundingClientRect` 0×0 BIRAKILDI.** Sahte bir geometri, Slider'ın
 *   işaretçiyle değer hesabını ve Popover'ın taşma mantığını *"çalışıyor"*
 *   gösterirdi; oysa çalışan tek şey uydurduğumuz sayılar olurdu. O yollar
 *   **test edilmiyor** ve sınır ilgili test dosyalarında adıyla yazılı.
 * · **`IntersectionObserver` EKLENMEDİ.** 6.0 onu eksik diye ölçtü ama bu alt
 *   görevin hiçbir bileşeni çağırmıyor.
 *
 * ⚠️ Yukarıdaki üç doldurmanın **gerekliliği de ölçüldü**, varsayılmadı —
 * her biri tek tek sökülüp `ui` projesi koşturuldu:
 * ① `scrollIntoView` → **3 test** kırıldı · ② işaretçi yakalama → **2 test**
 * kırıldı · ③ `ResizeObserver` → **4 test** kırıldı.
 */

/**
 * RTL temizliği — `apps/web/vitest.setup.ts` ile **aynı gerekçe**: kök
 * `vitest.config.ts`te `globals` KAPALI, bu yüzden RTL'in otomatik `afterEach`
 * kaydı hiç oluşmuyor ve RTL bunu **sessizce** geçiyor.
 *
 * ⚠️ Bu, `PROJECT_MEMORY`nin açık `main.test.tsx` yarışı bloğunun da 4. maddesi:
 * *"Yeni bir React kökü kuran başka bir test eklendiyse (Faz 6 tasarım sistemi
 * bunu yapacak) aynı kancayı ona da bağla."* Bağlandı.
 */
afterEach(() => {
  cleanup();
});
