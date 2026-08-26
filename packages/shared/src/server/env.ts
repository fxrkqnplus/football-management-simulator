/**
 * Ortam değişkeni doğrulaması — eksik/geçersiz yapılandırmayla uygulama AÇILMAZ.
 *
 * K1.3: kullanıcıya gösterilen hata Türkçe ve **eyleme dönüştürülebilir** olmalı.
 * Zod'un ham çıktısı bu şartı sağlamaz; hangi değişkenin eksik olduğunu, ne işe
 * yaradığını ve nereye bakılacağını söylemez. Bu yüzden `formatEnvError` ile
 * kendi mesajımızı üretiyoruz.
 */
import { z } from 'zod';

/** Her değişken için: ne işe yarar + örnek değer. Hata mesajının hammaddesi. */
const ENV_DOCS: Record<string, { what: string; example?: string }> = {
  NODE_ENV: { what: 'Çalışma kipi.', example: 'development' },
  PUBLIC_BASE_PATH: {
    what: 'Uygulamanın çalıştığı alt yol. Vite base, Router basename, API ön eki, çerez path, servis çalışanı kapsamı ve PWA manifest bu değerden türetilir.',
    example: '/fms',
  },
  PUBLIC_URL: { what: 'Uygulamanın tam genel adresi.', example: 'https://fxrkqn.org/fms' },
  API_PORT: { what: 'API sunucusunun dinlediği port.', example: '3001' },
  WEB_PORT: { what: 'Web sunucusunun dinlediği port.', example: '3000' },
  DATABASE_URL: {
    what: 'PostgreSQL bağlantı adresi. Tüm oyun dünyası ve kayıtlar buraya yazılır.',
    example: 'postgresql://fms:password@localhost:5432/fms',
  },
  REDIS_URL: {
    what: 'Redis bağlantı adresi. Tur kuyruğu ve oturum kilitleri burada tutulur.',
    example: 'redis://localhost:6379',
  },
  JWT_SECRET: {
    what: 'Oturum jetonlarını imzalar. Kısa veya tahmin edilebilir olursa jetonlar taklit edilebilir.',
    example: 'en az 32 karakter rastgele dizi',
  },
  JWT_ACCESS_TTL: { what: 'Erişim jetonu ömrü.', example: '15m' },
  JWT_REFRESH_TTL: { what: 'Yenileme jetonu ömrü.', example: '30d' },
  SERVER_MODE: {
    what: 'Sunucu kipi. private = kayıt açık ama yalnızca izin listesindekiler oynar.',
    example: 'private',
  },
  WORKER_CONCURRENCY: { what: 'Aynı anda işlenecek tur sayısı.', example: '1' },
  DEFAULT_SIM_POLICY: {
    what: 'Varsayılan simülasyon politikası (kayıt başına). balanced = kullanıcının maçı tam, kendi ligi orta, diğer ülkeler istatistiksel.',
    example: 'balanced',
  },
  TURN_LOCK_TTL_SECONDS: { what: 'Tur kilidinin azami ömrü (saniye).', example: '300' },
  SENTRY_RELEASE: {
    what: 'Sentry sürüm etiketi. Boşsa olaylar sürümsüz gruplanır.',
    example: 'fms@0.0.0',
  },
  LOG_LEVEL: { what: 'Log eşiği.', example: 'info' },
  LOG_FORMAT: {
    what: 'Log çıktı biçimi. json = üretim (makine okur), pretty = geliştirme (renkli, pino-pretty gerekir).',
    example: 'json',
  },
  DATA_MODE: {
    what: 'Veri kaynağı kipi. full = gerçek armalar/portreler/isimler, clean = tümüyle prosedürel.',
    example: 'full',
  },
  PORTRAIT_STYLE: {
    what: 'Portre işleme kipi (sunucu varsayılanı; kullanıcı ayarı kayıt bazında ezer). stylized = gerçek ve üretilmiş portreler ayırt edilemez.',
    example: 'stylized',
  },
  ACTIVE_PACK: { what: '/data/packs/ altındaki etkin veri paketi klasörü.', example: 'tr-2026' },
  EMAIL_FROM: { what: 'Giden e-posta adresi.', example: 'noreply@fxrkqn.org' },
};

const port = z.coerce.number().int().min(1).max(65535);

export const envSchema = z.object({
  // Uygulama
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PUBLIC_BASE_PATH: z.string().default('/fms'),
  PUBLIC_URL: z
    .url({ error: 'Tam bir adres olmalı (http:// veya https:// ile başlamalı).' })
    .default('http://localhost:3000/fms'),
  API_PORT: port.default(3001),
  WEB_PORT: port.default(3000),

  // Veritabanı — zorunlu
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  // Docker Compose (yerel veri katmanı) — uygulama bunları kullanmaz ama
  // doğrular: DATABASE_URL ile tutarsız kalırlarsa açılışta hata verilir.
  POSTGRES_USER: z.string().optional(),
  POSTGRES_PASSWORD: z.string().optional(),
  POSTGRES_DB: z.string().optional(),
  POSTGRES_PORT: port.default(5432),
  REDIS_PORT: port.default(6379),
  ADMINER_PORT: port.default(8080),

  // Kimlik
  JWT_SECRET: z.string().min(32, {
    error: 'En az 32 karakter olmalı; kısa bir sır jetonların taklit edilmesine izin verir.',
  }),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  SETUP_TOKEN: z.string().optional(),
  EMERGENCY_ADMIN_TOKEN: z.string().optional(),

  // E-posta
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.email({ error: 'Geçerli bir e-posta adresi olmalı.' }).optional(),

  // Cloudflare
  TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().default('fms-assets'),
  R2_PUBLIC_URL: z.string().optional(),

  // Sunucu kipi
  SERVER_MODE: z.enum(['private', 'public', 'maintenance']).default('private'),

  // Simülasyon
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(1),
  DEFAULT_SIM_POLICY: z.enum(['balanced', 'full']).default('balanced'),
  TURN_LOCK_TTL_SECONDS: z.coerce.number().int().min(30).default(300),

  // Gözlem
  SENTRY_DSN: z.string().optional(),
  // Sürüm etiketi (Karar 7). Boş bırakılabilir: Sentry o zaman olayları
  // sürümsüz gruplar. Kaynak haritası YÜKLEME adımı Faz 50'ye ertelendi
  // (BORÇ-006) — bu alan o adımın bugünden hazır duran yarısı.
  SENTRY_RELEASE: z.string().optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  // NODE_ENV KOKLANMAZ (Faz 1 hata #10): biçim açık bayrakla gelir.
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),

  // Veri
  DATA_MODE: z.enum(['full', 'clean']).default('full'),
  PORTRAIT_STYLE: z.enum(['real', 'stylized', 'procedural']).default('stylized'),
  ACTIVE_PACK: z.string().optional(),
  FOOTBALL_DATA_API_KEY: z.string().optional(),
  API_FOOTBALL_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/** `formatEnvError` için gereken en küçük sorun şekli. */
export interface EnvIssue {
  readonly path: readonly PropertyKey[];
  readonly message: string;
}

/** Zod çıktısını eyleme dönüştürülebilir Türkçe metne çevirir (K1.3). */
export function formatEnvError(
  issues: readonly EnvIssue[],
  source: Readonly<Record<string, string | undefined>>,
): string {
  const lines: string[] = [
    '',
    `  ✖ Ortam değişkeni doğrulaması başarısız — ${String(issues.length)} sorun:`,
    '',
  ];

  for (const issue of issues) {
    const name = issue.path.map((part) => String(part)).join('.');
    const raw = source[name];
    const missing = raw === undefined || raw === '';
    const doc = ENV_DOCS[name];

    lines.push(`    • ${name} — ${missing ? 'tanımlı değil' : issue.message}`);
    if (doc !== undefined) {
      lines.push(`        Ne işe yarar : ${doc.what}`);
      if (doc.example !== undefined) {
        lines.push(`        Örnek        : ${doc.example}`);
      }
    }
    lines.push('');
  }

  lines.push('    .env.example dosyasını kopyalayıp doldurun:');
  lines.push('        cp .env.example .env');
  lines.push('');
  return lines.join('\n');
}

/**
 * `docker-compose.yml` `POSTGRES_*` değerlerini okur, uygulama ise
 * `DATABASE_URL`'i. İkisi ayrı yerde yazıldığı için sessizce ayrışabilirler:
 * parolayı bir yerde değiştirip diğerini unutmak, "bağlanamıyorum" ile biten
 * ve sebebi geç anlaşılan bir hata sınıfıdır.
 *
 * Yalnızca konak/port DEĞİL, kimlik bilgileri karşılaştırılır: konak yerelde
 * `localhost`, konteyner içinde `postgres` olur ve bu normaldir.
 *
 * @returns uyumsuzluk açıklaması, yoksa null
 */
export function checkDatabaseUrlConsistency(env: Env): string | null {
  const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB } = env;
  if (POSTGRES_USER === undefined && POSTGRES_PASSWORD === undefined && POSTGRES_DB === undefined) {
    return null; // Compose kullanılmıyor
  }

  let url: URL;
  try {
    url = new URL(env.DATABASE_URL);
  } catch {
    return null; // Biçim sorunu bu kontrolün işi değil
  }

  const mismatches: string[] = [];
  const compare = (name: string, fromUrl: string, fromCompose: string | undefined): void => {
    if (fromCompose !== undefined && fromCompose !== fromUrl) {
      mismatches.push(`      ${name}: DATABASE_URL='${fromUrl}' ↔ ${name}='${fromCompose}'`);
    }
  };

  compare('POSTGRES_USER', decodeURIComponent(url.username), POSTGRES_USER);
  compare('POSTGRES_PASSWORD', decodeURIComponent(url.password), POSTGRES_PASSWORD);
  compare('POSTGRES_DB', decodeURIComponent(url.pathname.replace(/^\//, '')), POSTGRES_DB);

  if (mismatches.length === 0) return null;

  return [
    '',
    '  ✖ DATABASE_URL ile Docker Compose değerleri uyuşmuyor:',
    '',
    ...mismatches,
    '',
    '    Docker Compose veritabanını POSTGRES_* ile kurar, uygulama ise',
    '    DATABASE_URL ile bağlanır. İkisi ayrışırsa konteyner ayağa kalkar ama',
    '    uygulama bağlanamaz.',
    '',
    '    .env dosyasında her iki tarafı da aynı değere getirin.',
    '',
  ].join('\n');
}

/**
 * Ortam değişkenlerini doğrular. Başarısızsa eyleme dönüştürülebilir Türkçe
 * mesajla `Error` fırlatır — uygulama açılmaz.
 */
export function parseEnv(source: Readonly<Record<string, string | undefined>>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(formatEnvError(result.error.issues, source));
  }

  const mismatch = checkDatabaseUrlConsistency(result.data);
  if (mismatch !== null) {
    throw new Error(mismatch);
  }

  return result.data;
}

/** Doğrulamayı geçen ama dikkat çekmesi gereken bir yapılandırma durumu. */
export interface EnvWarning {
  readonly code: string;
  readonly message: string;
  readonly context: Readonly<Record<string, string>>;
}

/**
 * Ölümcül olmayan yapılandırma uyarılarını **döner** — yazmaz.
 *
 * ⚠️ NEDEN AYRI BİR FONKSİYON (Faz 2.2b).
 * Önceden bu uyarı `parseEnv` içinden doğrudan `process.stderr.write` ile
 * basılıyordu. K8 (`logger` dışında yazma yok) bunu yasakladı, ama uyarıyı
 * doğrudan `logger.warn`a çevirmek mümkün değildi: **logger'ın kendisi env'den
 * doğuyor** (`LOG_LEVEL`, `LOG_FORMAT`). `parseEnv` çalışırken logger henüz yok.
 *
 * Çözüm sıralamayı tersine çevirmek: doğrulayıcı **saf kalır ve teşhis döner**,
 * çağıran taraf logger'ı kurduktan sonra onları basar. Yan fayda: uyarı mantığı
 * artık çıktı yakalamadan, düz assert ile test edilebiliyor.
 */
export function collectEnvWarnings(env: Env): readonly EnvWarning[] {
  const warnings: EnvWarning[] = [];

  // Ç6: DATA_MODE=full iken ACTIVE_PACK boş olabilir — sağlayıcı zinciri bir alt
  // basamağa düşer. Geçerli ama sessiz kalmamalı.
  if (env.DATA_MODE === 'full' && (env.ACTIVE_PACK ?? '') === '') {
    warnings.push({
      code: 'env.activePackMissing',
      message:
        'DATA_MODE=full ama ACTIVE_PACK boş. Yerel veri paketi yüklenmeyecek; ' +
        'sağlayıcı zinciri API/Wikidata/prosedürel basamaklarına düşecek.',
      context: { dataMode: env.DATA_MODE },
    });
  }

  return warnings;
}

/** `process.env` üzerinden doğrular. */
export function loadEnv(): Env {
  return parseEnv(process.env);
}
