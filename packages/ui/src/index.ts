/**
 * @fms/ui — Tasarım sistemi.
 *
 * - **6.2:** `docs/spec/05-design-system.md` §7.1–§7.4'ün token'ları (renk ·
 *   nitelik ısı skalası · tipografi · geometri) ve kontrast aritmetiği.
 * - **6.3:** tema katmanı — mod çözümlemesi, DOM'a uygulama, kulüp vurgusu, ve
 *   token'ların CSS'e **türetilmiş** yansıması.
 *
 * ⚠️ **Paket hâlâ JSX TAŞIMIYOR ve bu ölçülmüş bir karar.** 6.3'ün ihtiyacı
 * olan her şey (mod çözümlemesi saf bir fonksiyon, tema uygulaması bir DOM
 * mutasyonu, CSS bir dize) React **olmadan** yazılabiliyordu — ve React'siz
 * yazılan bir tema katmanı jsdom'da **tam** test edilebiliyor. Bir React
 * sağlayıcısı 6.4'ün ilk bileşeniyle birlikte gelir; o gün `tsconfig`e `jsx`
 * eklenir. *"Yol haritasında olmayan bir özellik aklına gelirse yapma"* (K12)
 * kadar, **bugün gerekmeyen bir soyutlamayı da** yazmamak geçerli.
 *
 * ⚠️ `types: []` **korundu** — Faz 1'de K1 için kilitlenmiş savunma hattı.
 * Üretilmiş CSS'i okuyan test `node:fs` yerine Vite'ın `?raw` yolunu kullanıyor
 * (`src/theme/raw-css.d.ts`).
 */
export * from './theme/index.js';
export * from './tokens/index.js';
