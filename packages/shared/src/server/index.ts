/**
 * `@fms/shared/server` — YALNIZCA SUNUCU TARAFI.
 *
 * ⚠️ BU ALT YOL BİR SINIRDIR, BİR KLASÖR DEĞİL.
 *
 * Buraya giren her şey şu iki taraftan da **görünmez** olmalıdır:
 *   • tarayıcı (`apps/web`, `packages/ui`) — K1, sunucu otoritesi
 *   • simülasyon motoru (`packages/engine`) — K3, motor saftır
 *
 * **Neden alt yol, neden `sideEffects: false` yetmiyor.**
 * Faz 1.8'de `@fms/shared` barrel'ı `JWT_SECRET`, `DATABASE_URL` ve Zod'u
 * tarayıcı paketine taşıdı. Çözüm `sideEffects: false` oldu ve işe yaradı —
 * ama o bir **paketleyici optimizasyonudur**: pakete bir gün yan etkili bir
 * modül girerse ağaç sarsma sessizce durur ve sızıntı geri gelir, hiçbir kapı
 * ötmez. Alt yol ise **modül çözümlemesi seviyesinde** çalışır: `apps/web`
 * bu girişi import etmeye kalkarsa derleme kırılır, çünkü paketin `exports`
 * haritası dışında bir yol yok ve `arch:check` ayrıca men ediyor.
 *
 * **Dört savunma hattı** (`docs/ROADMAP.md` Faz 2 madde 2.2a):
 *   ① `apps/web` tsconfig `types: []` → Node tipleri görünmez
 *   ② `packages/engine` tsconfig `types: []` + `lib: ["ES2024"]`
 *   ③ `arch:check` kısıtlı alt yol kuralı — web, ui ve engine bu girişi göremez
 *   ④ üretim paketinde dize taraması (2.2b: `pino`, `async_hooks` → 0)
 *
 * **Ne buraya girer:** `process.env` okuyan, dosya sistemine/ağa dokunan,
 * Node yerleşiklerine bağlı olan her şey. Bugün: ortam doğrulaması.
 * 2.2b'de: pino logger ve redaksiyon. 2.3'te: `AsyncLocalStorage` bağlamı.
 *
 * **Ne buraya GİRMEZ:** izomorfik olan hiçbir şey. Hata sınıfları, alt yol
 * türetmesi, `Logger` **arayüzü** (uygulaması değil), `DebugTrace` — bunlar
 * kök girişte (`@fms/shared`) kalır ve motorla tarayıcı ikisi de kullanır.
 */
export type { Env, EnvIssue, EnvWarning } from './env.js';
export {
  checkDatabaseUrlConsistency,
  collectEnvWarnings,
  envSchema,
  formatEnvError,
  loadEnv,
  parseEnv,
} from './env.js';
export type { ServerLoggerOptions } from './logger.js';
export { createServerLogger } from './logger.js';
