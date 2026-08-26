/**
 * Alt yol (subpath) tek doğruluk kaynağı — K6.
 *
 * Uygulama `https://fxrkqn.org/fms` altında çalışır. Bu değer altı ayrı katmanda
 * kullanılır (Vite base, Router basename, API ön eki, çerez path, servis çalışanı
 * kapsamı, PWA manifest) ve her biri ayrı ayrı sessizce kırılabilir. Bu yüzden
 * hiçbir yerde elle yazılmaz; hepsi buradan türetilir.
 */
import { ValidationError } from './errors.js';

/**
 * Uygulama içi yol. Baştaki eğik çizgi TİP SEVİYESİNDE zorunludur:
 * `basePath('api/health')` derlenmez.
 */
export type AppPath = `/${string}`;

export const DEFAULT_BASE_PATH = '/fms';

/** Bir alt yol değerinden türetilen tüm katman ayarları. */
export interface BasePathConfig {
  /** Ham, normalize edilmiş taban: `/fms` veya kök için `''` */
  readonly base: string;
  /** Vite `base` — sondaki eğik çizgi ZORUNLU */
  readonly viteBase: string;
  /** React Router `basename` */
  readonly routerBasename: string;
  /** API ön eki (NestJS `setGlobalPrefix`) */
  readonly apiPrefix: string;
  /** SSE uç noktası */
  readonly ssePath: string;
  /** Çerez `path` */
  readonly cookiePath: string;
  /** Servis çalışanı kapsamı — sondaki eğik çizgi ZORUNLU */
  readonly serviceWorkerScope: string;
  /** PWA manifest alanları */
  readonly pwa: {
    readonly id: string;
    readonly scope: string;
    readonly startUrl: string;
  };
}

/**
 * Ham girdiyi tek biçime indirger: `fms`, `/fms`, `/fms/`, `//fms//` → `/fms`.
 * Kök dağıtım (`/` veya boş) → `''`.
 */
export function normalizeBasePath(raw: string | undefined | null): string {
  if (raw === undefined || raw === null) return '';
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === '/') return '';

  const segments = trimmed.split('/').filter((segment) => segment.length > 0);
  if (segments.length === 0) return '';
  return `/${segments.join('/')}`;
}

/**
 * Tabanı bir uygulama yoluyla birleştirir.
 *
 * Sessizce yanlış URL üretmektense HATA FIRLATIR. Gerekçe: yanlış bir yol
 * çalışma zamanında 404 olarak görünür ve sebebi aylar sonra aranır; burada
 * fırlatılan hata sebebi doğrudan gösterir. Üçü de programcı hatasıdır,
 * kullanıcı girdisi değildir.
 *
 * Faz 2.1: `TypeError` yerine `ValidationError`. Üç fırlatmanın da `code`'u
 * var, yani log/Sentry tarafında "hangi alt yol hatası" sorusu dizgi eşleştirme
 * yapmadan cevaplanabiliyor; sayısal/adsal ayrıntılar `context`'te yapısal
 * duruyor. Mesajlar geliştiriciye yöneliktir ve öyle kalır — bunlar kullanıcı
 * girdisi hataları değil, programcı hatalarıdır.
 */
export function joinBasePath(base: string, path: string): string {
  if (!path.startsWith('/')) {
    throw new ValidationError({
      code: 'basePath.mustStartWithSlash',
      message:
        `Uygulama yolu '/' ile başlamalı. Alınan: '${path}'. ` + `Doğrusu: basePath('/${path}')`,
      context: { path, base },
    });
  }
  if (path.includes('//')) {
    throw new ValidationError({
      code: 'basePath.doubleSlash',
      message: `Uygulama yolunda çift eğik çizgi var: '${path}'`,
      context: { path, base },
    });
  }
  if (base !== '' && (path === base || path.startsWith(`${base}/`))) {
    throw new ValidationError({
      code: 'basePath.duplicatePrefix',
      message:
        `Alt yol ön eki iki kez uygulanıyor. Alınan: '${path}', taban zaten '${base}'. ` +
        `Doğrusu: basePath('${path.slice(base.length) || '/'}')`,
      context: { path, base, suggestion: path.slice(base.length) || '/' },
    });
  }
  return base === '' ? path : `${base}${path}`;
}

/** Bir taban değerinden altı katmanın tamamını türetir. */
export function deriveBasePathConfig(raw: string | undefined | null): BasePathConfig {
  const base = normalizeBasePath(raw);
  const withSlash = base === '' ? '/' : `${base}/`;
  return {
    base,
    viteBase: withSlash,
    routerBasename: base === '' ? '/' : base,
    apiPrefix: joinBasePath(base, '/api'),
    ssePath: joinBasePath(base, '/api/events'),
    cookiePath: base === '' ? '/' : base,
    serviceWorkerScope: withSlash,
    pwa: { id: withSlash, scope: withSlash, startUrl: withSlash },
  };
}

// ─── Modül düzeyi tekil (singleton) ────────────────────────────────────────

let configured: BasePathConfig | null = null;

/**
 * Taban yolu çözümleme zinciri:
 *   1. `configureBasePath()` ile açıkça ayarlanmış değer
 *   2. `globalThis.__FMS_BASE_PATH__` (tarayıcı derlemesine gömülür)
 *   3. `process.env.PUBLIC_BASE_PATH` (Node)
 *   4. `DEFAULT_BASE_PATH`
 */
function resolve(): BasePathConfig {
  if (configured !== null) return configured;

  const fromGlobal = (globalThis as { __FMS_BASE_PATH__?: string }).__FMS_BASE_PATH__;
  const fromEnv = typeof process !== 'undefined' ? process.env['PUBLIC_BASE_PATH'] : undefined;

  configured = deriveBasePathConfig(fromGlobal ?? fromEnv ?? DEFAULT_BASE_PATH);
  return configured;
}

/** Uygulama açılışında bir kez çağrılır (API/Worker `main.ts`, Web bootstrap). */
export function configureBasePath(raw: string | undefined | null): BasePathConfig {
  configured = deriveBasePathConfig(raw);
  return configured;
}

/** Yalnızca testler için — tekil durumu sıfırlar. */
export function resetBasePathForTests(): void {
  configured = null;
}

/** Türetilmiş yapılandırmanın tamamı. */
export function basePathConfig(): BasePathConfig {
  return resolve();
}

/** `/api/health` → `/fms/api/health` */
export function basePath(path: AppPath): string {
  return joinBasePath(resolve().base, path);
}

/** `/health` → `/fms/api/health` */
export function apiPath(path: AppPath): string {
  return joinBasePath(resolve().base, `/api${path}`);
}
