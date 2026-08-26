import { createCorrelationId } from '@fms/shared';

/**
 * Tarayıcıdaki "son bilinen `correlationId`" — Karar 19 (2.6).
 *
 * ── NEDEN VAR ────────────────────────────────────────────────────────────
 * Sunucuda `AsyncLocalStorage` istek başına bağlamı taşıyor
 * (`@fms/shared/server`). Tarayıcıda öyle bir şey yok ve bir **render
 * hatasının HTTP isteği de yok** — yani "Hata bildir" düğmesine basıldığında
 * gönderilecek kimlik hiçbir yerden gelmiyor.
 *
 * ── NEDEN ÇIPLAK YENİ KİMLİK ÜRETİLMİYOR ─────────────────────────────────
 * Çökme çoğu zaman **başarısız bir istekten sonra** gelir: API 500 döner,
 * ekran beklediği veriyi bulamaz, render patlar. O anda taze bir kimlik
 * üretmek, zincirin en değerli halkasını — çökmeyi onu doğuran isteğe
 * bağlamayı — koparırdı. Kullanıcı "şu kodu aldım" dediğinde sunucu
 * loglarında **isteği** bulabilmek gerekiyor.
 *
 * Hiç istek yapılmamışsa (saf render hatası) taze kimlik üretilir; böylece
 * **hiçbir durumda kimliksiz kalınmıyor**.
 *
 * ── MODÜL DÜZEYİ DEĞİŞTİRİLEBİLİR DURUM ──────────────────────────────────
 * Evet, ve burada meşru: bu bir tarayıcı sekmesine ait tekil oturum durumu.
 * K3'ün global durum yasağı `packages/engine` içindir ve `arch:check` onu
 * orada denetliyor; `apps/web` kapsam dışı.
 */

/** Henüz hiç istek yapılmadıysa `null`. */
let lastCorrelationId: string | null = null;

/**
 * Bir isteğin kimliğini kaydeder. `api.ts` her çağrıda çağırır.
 *
 * Sessizce **en sonuncuyu** tutar, geçmiş biriktirmez: amaç bir izleme
 * geçmişi değil, "en son ne oldu" sorusuna tek cevap.
 */
export function rememberCorrelationId(correlationId: string): void {
  lastCorrelationId = correlationId;
}

/**
 * Rapor edilecek kimlik.
 *
 * Son istek varsa onu döner; yoksa **taze bir tane üretir ve onu da
 * hatırlar** — aynı çökme iki kez raporlanırsa iki farklı kimlik
 * görünmesin diye.
 */
export function currentCorrelationId(): string {
  lastCorrelationId ??= createCorrelationId();
  return lastCorrelationId;
}

/** Yalnızca testler için — modül düzeyi durumu sıfırlar. */
export function resetCorrelationContextForTests(): void {
  lastCorrelationId = null;
}
