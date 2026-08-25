import type { LogContext } from './logger.js';
import { redactContext } from './redact.js';

/**
 * Taşınabilir log bağlamı zarfı — ÜRETİCİ YARISI (`docs/spec/09` §11.1).
 *
 * ⚠️ İZOMORFİK VE SAF. Kökte duruyor, `server/` altında değil.
 *
 * ── NEDEN BÖLÜNMÜŞ: ÜRETİCİ BURADA, ÇÖZÜCÜ `server/`DE ───────────────────
 * Zarfın iki yarısı iki farklı kısıta çarpıyor ve tek dosyada uzlaşmıyorlar:
 *
 *   • **Üretmek** hiçbir dış girdi doğrulamaz — kendi bağlamımızı dizgeye
 *     çeviriyoruz. Bağımlılık gerekmiyor, dolayısıyla izomorfik kalabilir.
 *   • **Çözmek** bir DIŞ GİRDİYİ ayrıştırır (argv, kuyruk yükü) ve
 *     CLAUDE.md §1.3 gereği Zod ister.
 *
 * `zod` bu köke giremez: `packages/shared/src/index.ts` başlığındaki değişmez
 * ("bu girişten üçüncü taraf paket sızdırılmaz") Faz 2.1'de **ölçülmüş** bir
 * gerekçeye dayanıyor — barrel üzerinden gelen her import `env.js` yüzünden
 * Zod'u **motora** da çekiyordu (günlük #11), 2.2a'da `server/` alt yoluna
 * taşınarak düzeltildi. Zarfın tamamı köke konsaydı o düzeltme geri alınırdı.
 *
 * Bölünmenin bedeli **ayrışma riski**: iki yarı zamanla farklı şeyi
 * anlatabilir. Üç bağla kapatıldı — hepsi derleme zamanında ötüyor:
 *   ① Sürüm sabiti YALNIZCA burada tanımlı; şema onu `z.literal()` içine
 *      buradan alır. İki yarı sürüm konusunda ayrışamaz.
 *   ② Kanonik tip (`LogContextEnvelope`) burada tanımlı; şema çıktısının ona
 *      atanabilir olduğu `server/log-context.ts` içinde tip düzeyinde
 *      **iddia edilir** — şema şekli kayarsa `typecheck` kırılır.
 *   ③ Gidiş-dönüş testi iki yarıyı birlikte koşturur.
 *
 * ── ZARF NEDEN VAR ───────────────────────────────────────────────────────
 * `AsyncLocalStorage` bağlamı **süreç içinde** taşır (`server/context.ts`).
 * Süreç sınırını geçmez: kuyruğa iş atıldığında veya bir alt süreç
 * başlatıldığında bağlam kaybolur ve zincir **sessizce** kopar — log satırı
 * yine yazılır, yalnızca kimliksiz. Zarf o sınırı geçen taşıyıcıdır.
 */

/**
 * Zarf biçim sürümü.
 *
 * Neden var: zarf bir süreçte üretilip **başka** bir süreçte çözülüyor ve
 * ikisi farklı sürümde olabilir (dağıtım sırasında worker eski, API yeni).
 * Sürümsüz bir zarfta biçim değişikliği "alan eksik" gibi görünür ve yanlış
 * teşhise götürür; sürümle birlikte "bu zarf benden yeni/eski" denebilir.
 */
export const LOG_CONTEXT_ENVELOPE_VERSION = 1;

/**
 * Zarfta taşınabilen değerler.
 *
 * `LogContext` daha geniştir (`null`, sığ diziler, `Error`); zarf onların
 * hiçbirini taşımaz — gerekçeler sırayla:
 *   • `Error` — JSON'a çevrilince `{}` olur; sessiz veri kaybı. Hata zaten
 *     zarfla değil, kendi log satırıyla seyahat eder.
 *   • dizi — zarf argv'ye giriyor; uzunluğu sınırlı tutmak istiyoruz.
 *   • `null` — "alan yok" ile "alan boş" ayrımı zincir kimliği için anlamsız.
 * Taşınmayan alan **sessizce düşürülmez**, hiç konmaz: çözücü tarafta
 * "eksik alan" ile "atılmış alan" ayırt edilemeyeceği için ikisi de aynı
 * sonuca varır — kimlik yoksa yenisi üretilir.
 */
export type LogContextEnvelopeValue = string | number | boolean;

/** Süreç sınırını geçen zarf. Kanonik tip — şema buna uymak zorunda. */
export interface LogContextEnvelope {
  readonly v: typeof LOG_CONTEXT_ENVELOPE_VERSION;
  readonly ctx: Readonly<Record<string, LogContextEnvelopeValue>>;
}

/**
 * Bağlamı zarfa çevirir (dizgeye değil — nesneye).
 *
 * ⚠️ REDAKSİYON BURADA, ÇAĞIRANIN İNSAFINDA DEĞİL. Zarf yalnızca loga
 * gitmiyor: argv'ye yazıldığında `ps`/görev yöneticisi çıktısında **başka
 * kullanıcılara da** görünür, kuyruğa yazıldığında Redis'te durur. Bu yüzden
 * hassas alan zarfa hiç girmez — redaksiyon `redactContext` ile yapılır,
 * yani tarayıcı ve sunucu loglarıyla **aynı** kural (SAPMA-013: hiçbir kural
 * iki yerde tanımlanmaz).
 *
 * Redaksiyon sonrası `[REDACTED]` bir dizgedir ve taşınabilir; yani hassas
 * alan **kaybolmaz, işaretlenir**. Log okuyan "burada bir alan vardı ve
 * redakte edildi" bilgisini görür.
 */
export function toLogContextEnvelope(context: LogContext): LogContextEnvelope {
  const redacted = redactContext(context);
  const ctx: Record<string, LogContextEnvelopeValue> = {};

  for (const [key, value] of Object.entries(redacted)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      ctx[key] = value;
    }
  }

  return { v: LOG_CONTEXT_ENVELOPE_VERSION, ctx };
}

/**
 * Bağlamı süreç sınırını geçebilecek tek satırlık bir dizgeye çevirir.
 *
 * Çıktı JSON'dur ve satır sonu içermez (`JSON.stringify` kaçırır), yani tek
 * bir argv belirteci veya tek bir kuyruk alanı olarak taşınabilir.
 */
export function serializeLogContext(context: LogContext): string {
  return JSON.stringify(toLogContextEnvelope(context));
}
