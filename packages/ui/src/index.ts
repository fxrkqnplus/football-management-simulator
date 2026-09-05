/**
 * @fms/ui — Tasarım sistemi.
 *
 * - **6.2:** `docs/spec/05-design-system.md` §7.1–§7.4'ün token'ları (renk ·
 *   nitelik ısı skalası · tipografi · geometri) ve kontrast aritmetiği.
 * - **6.3:** tema katmanı — mod çözümlemesi, DOM'a uygulama, kulüp vurgusu, ve
 *   token'ların CSS'e **türetilmiş** yansıması.
 *
 * - **6.4:** ilk React bileşenleri — dokuz temel bileşen, Radix uyarlaması,
 *   `common:ui.` çeviri sözleşmesi.
 *
 * ⚠️ **6.3'ÜN ÖNGÖRÜSÜ GERÇEKLEŞTİ:** o alt görev *"React sağlayıcısı 6.4'ün
 * ilk bileşeniyle gelir; o gün `tsconfig`e `jsx` eklenir"* diye yazmıştı.
 * 6.4'te `jsx: "react-jsx"` eklendi — kapsam kayması değil, planlanan adım.
 *
 * ⚠️ `types: []` **KORUNDU** — Faz 1'de K1 için kilitlenmiş savunma hattı,
 * ve 6.4'te ölçüldü: `jsx: "react-jsx"` onu genişletmeyi **gerektirmiyor**
 * (`react/jsx-runtime` tipleri modül çözümlemesiyle geliyor, global
 * `@types/*` yüklemesiyle değil). Node tipleri hâlâ görünmez.
 */
export * from './components/index.js';
export { cn } from './lib/cn.js';
export * from './theme/index.js';
export * from './tokens/index.js';
