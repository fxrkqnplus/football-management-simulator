import type { LogContext, LogValue } from './logger.js';

/**
 * Sır redaksiyonu — loglara ve Sentry'ye giden bağlamın ikinci savunma hattı.
 *
 * ⚠️ İZOMORFİK VE SAF. Kökte duruyor, `server/` altında değil — çünkü **her iki**
 * logger uygulaması (pino ve tarayıcı) bunu kullanmak zorunda. `server/`'a
 * konsaydı tarayıcı tarafı kendi kopyasını yazardı ve iki kopya kaçınılmaz
 * olarak ayrışırdı; `docs/spec/09` §11.5'in "hiçbir kural iki yerde denetlenmez"
 * disiplini burada da geçerli.
 *
 * ── İKİ KATMANLI SAVUNMA ─────────────────────────────────────────────────
 * ① **Tip** (2.1): `ErrorContext`/`LogContext` yalnızca JSON-güvenli ilkel
 *    değerlere ve sığ dizilere izin verir. İç içe nesne yok, yani "bütün istek
 *    gövdesini bağlama koy" mümkün değil — fırlatan/loglayan taraf **alan
 *    seçmek** zorunda.
 * ② **Redaksiyon** (burası): seçilen alanın ADI hassassa değeri değiştirilir.
 *
 * ── EŞLEŞTİRME KARARI ────────────────────────────────────────────────────
 * **Büyük/küçük harf duyarsız, ALT DİZE eşleşmesi** — tam eşleşme değil.
 *
 * Tam eşleşme `userPassword`, `passwordHash`, `refreshToken`, `X-Api-Key`
 * gibi gerçek alanların **hiçbirini** yakalamaz; gerçek kodda sırlar bu adlarla
 * dolaşır. Asimetri kararı belirledi: yanlış pozitifin bedeli **bir log alanı**,
 * yanlış negatifin bedeli **sızmış bir sır**.
 *
 * Bu, bilinçli olarak FAZLA redaksiyon yapar. `passwordPolicyVersion` ve
 * `tokenCount` gibi zararsız alanlar da redakte edilir — kabul edilen maliyet.
 * `[REDACTED]` işareti görünür olduğu için geliştirici durumu fark eder ve
 * gerekirse alanı yeniden adlandırır.
 *
 * ── LİSTEDE BİLEREK OLMAYANLAR ───────────────────────────────────────────
 * • `auth` — `author`, `authorId`, `authored` ile çakışırdı. Faz 45 haber
 *   üretimi bu alanları kullanacak. Yerine tam terim: `authorization`.
 * • `key` — `keyPlayer`, `foreignKey`, `keyPass` her yerde. Yerine `apikey`.
 * • `private` — `privateProfile` (Faz 47 gizlilik ayarı) yakalanırdı.
 *   Yerine `privatekey`.
 *
 * ── BİLİNEN SINIR ────────────────────────────────────────────────────────
 * Redaksiyon **anahtar adına** bakar, değere değil. Zararsız adlı bir alanın
 * DEĞERİ sır taşıyorsa (örn. `note: 'şifre 1234'`) yakalanmaz. Değer taraması
 * bilinçli olarak yapılmıyor: yanlış pozitif üretme riski çok yüksek ve
 * asıl çözüm ① katmanı — alan seçme disiplini.
 */

/** Redakte edilmiş değerin yerine yazılan işaret. Görünür olması kasıtlı. */
export const REDACTED = '[REDACTED]';

/**
 * Hassas anahtar parçaları. Karşılaştırma normalize edilmiş ada göre yapılır
 * (küçük harf, `_`/`-`/boşluk çıkarılmış), yani `API_KEY`, `api-key` ve
 * `apiKey` aynı parçayla eşleşir.
 */
export const SENSITIVE_KEY_PATTERNS = [
  'password',
  'passwd',
  'secret',
  'token',
  'apikey',
  'authorization',
  'cookie',
  'session',
  'credential',
  'signature',
  'privatekey',
  'jwt',
  'databaseurl',
  'connectionstring',
  'dsn',
] as const;

/** `API_KEY` → `apikey`, `X-Api-Key` → `xapikey`. */
function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[-_\s]/g, '');
}

/** Bu anahtar adı hassas mı? */
export function isSensitiveKey(key: string): boolean {
  const normalized = normalizeKey(key);
  return SENSITIVE_KEY_PATTERNS.some((pattern) => normalized.includes(pattern));
}

/**
 * Bağlamdaki hassas alanları `[REDACTED]` ile değiştirir.
 *
 * Değer tipi korunmaz — bir dizi de tek bir `[REDACTED]` dizgisine iner.
 * Bilinçli: "kaç eleman vardı" bilgisi bile bazen sızıntıdır ve log okuyanın
 * ihtiyacı alanın **redakte edildiğini** görmek.
 */
export function redactContext(context: LogContext): Record<string, LogValue> {
  const output: Record<string, LogValue> = {};
  for (const [key, value] of Object.entries(context)) {
    output[key] = isSensitiveKey(key) ? REDACTED : value;
  }
  return output;
}
