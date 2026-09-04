/**
 * @fms/ui — Tasarım sistemi.
 *
 * Faz 6.2'de ilk içerik geldi: `docs/spec/05-design-system.md` §7.1–§7.4'ün
 * token'ları (renk · nitelik ısı skalası · tipografi · geometri) ve kontrast
 * aritmetiği.
 *
 * ⚠️ Bileşenler **henüz yok** — 6.4'ten itibaren gelecekler. Bu paket bugün
 * saf TypeScript: JSX yok, React bağımlılığı yok, Tailwind bağı yok. `tsconfig`
 * bu yüzden `jsx` taşımıyor ve `types: []` duruyor; ikisi de **6.3'ün** işi.
 */
export * from './tokens/index.js';
