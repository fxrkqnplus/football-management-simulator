/**
 * Parmak izi tabanlı olay kısıtlaması — Karar 4'ün son maddesi
 * (*"aynı parmak izi N dakikada tekrarlarsa düşürülür"*).
 *
 * ⚠️ İZOMORFİK VE SAF. Kökte duruyor çünkü **iki taraf da** kullanıyor:
 * `apps/api/src/instrument.ts` ve `apps/web/src/lib/sentry.ts`. Her iki
 * tarafa ayrı birer kopya yazılsaydı kaçınılmaz olarak ayrışırlardı —
 * SAPMA-013'ün ("hiçbir kural iki yerde tanımlanmaz") aynı disiplini.
 *
 * ── NEDEN GEREKLİ ────────────────────────────────────────────────────────
 * Sentry ücretsiz kademesi **5.000 olay/ay** (`spec/10` §13.5). Tarayıcıda
 * bir render döngüsü veya bir `useEffect` kısır döngüsü saniyede yüzlerce
 * özdeş hata üretebilir; kotanın tamamı dakikalar içinde yanar ve **gerçek**
 * arızalar artık görünmez olur. Sunucuda da aynı sınıf risk var (bir kuyruk
 * tüketicisi aynı hatayı tekrar tekrar deneyebilir).
 *
 * Sentry'nin kendi `dedupeIntegration`ı bunu **çözmez**: o yalnızca art arda
 * gelen **birebir aynı** olayı eler, zaman penceresi tutmaz.
 *
 * ── NEDEN `Date.now()` İÇERİDE YOK ───────────────────────────────────────
 * Zaman **parametre olarak** alınıyor. Böylece bu modül saf kalıyor ve
 * `packages/engine` onu import eden bir barrel'dan yüklense bile K3
 * ihlali doğmuyor. Yan fayda: test sahte saat kurmadan, düz sayılarla
 * yazılabiliyor.
 */

/**
 * Varsayılan pencere: **5 dakika**.
 *
 * Kısa tutulsaydı döngü koruması işe yaramazdı; uzun tutulsaydı süregelen
 * bir arıza saatlerce tek bir olay olarak görünür ve "hâlâ devam ediyor mu?"
 * sorusu cevapsız kalırdı. Beş dakika, bir dağıtım penceresinde sorunun
 * birkaç kez görünmesine yetiyor.
 */
export const DEFAULT_THROTTLE_WINDOW_MS = 5 * 60 * 1000;

/**
 * Bellek tavanı.
 *
 * Parmak izi haritası sınırsız büyüyemez: uzun ömürlü bir sunucu sürecinde
 * her yeni hata metni yeni bir anahtar demektir. Tavana ulaşıldığında harita
 * **tamamen boşaltılır** — en eskiyi ayıklamak yerine, çünkü bu bir önbellek
 * değil bir kısıtlayıcı: kaybedilen tek şey birkaç olayın erken geçmesi.
 */
export const MAX_TRACKED_FINGERPRINTS = 500;

export interface EventThrottle {
  /**
   * Bu parmak izi şimdi geçebilir mi?
   *
   * @param fingerprint Olayı tanımlayan kararlı dizge (tip + mesaj gibi).
   * @param now Çağıranın verdiği zaman damgası (ms).
   * @returns `true` = geçsin (ilk kez veya pencere doldu), `false` = düşür.
   */
  shouldAllow(fingerprint: string, now: number): boolean;
}

/**
 * Yeni bir kısıtlayıcı üretir.
 *
 * Durum fabrikanın **kapanışında** tutuluyor, modül düzeyinde değil: iki ayrı
 * kısıtlayıcı (sunucu ve tarayıcı, ya da testler) birbirinin sayacını
 * görmemeli.
 */
export function createEventThrottle(windowMs: number = DEFAULT_THROTTLE_WINDOW_MS): EventThrottle {
  const lastSeen = new Map<string, number>();

  return {
    shouldAllow(fingerprint: string, now: number): boolean {
      const previous = lastSeen.get(fingerprint);

      if (previous !== undefined && now - previous < windowMs) {
        return false;
      }

      if (lastSeen.size >= MAX_TRACKED_FINGERPRINTS && !lastSeen.has(fingerprint)) {
        lastSeen.clear();
      }

      lastSeen.set(fingerprint, now);
      return true;
    },
  };
}
