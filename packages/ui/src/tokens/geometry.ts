/**
 * Boşluk, geometri, katman ve hareket token'ları —
 * `docs/spec/05-design-system.md` §7.4'ün TEK KAYNAĞI.
 */

/**
 * §7.4: *"4px tabanlı"*. On bir basamak, ve **hepsi 4'ün katı değil sıfırdan
 * başlıyor** — `--space-7`, `--space-9`, `--space-11`, `--space-14` gibi
 * basamaklar spec'te **yok** ve buraya eklenmiyor (SAPMA-026).
 *
 * ⚠️ Ad ile değer arasındaki ilişki (`--space-N` = `N × 4px`) bir **desen**,
 * bir kural değil — ve test onu **ayrıca** iddia ediyor. Deseni doğrulamak,
 * bir gün `--space-10: 44px` yazılmasını engelliyor.
 */
export const SPACE_SCALE = {
  '--space-0': 0,
  '--space-1': 4,
  '--space-2': 8,
  '--space-3': 12,
  '--space-4': 16,
  '--space-5': 20,
  '--space-6': 24,
  '--space-8': 32,
  '--space-10': 40,
  '--space-12': 48,
  '--space-16': 64,
} as const satisfies Record<`--space-${string}`, number>;

/** §7.4'ün taban birimi — `SPACE_SCALE`in deseni buna karşı doğrulanıyor. */
export const SPACE_BASE_PX = 4;

/** §7.4'ün beş yarıçapı. `--radius-full` bir "sonsuz" yer tutucusu (9999px). */
export const RADIUS_SCALE = {
  '--radius-sm': 3,
  '--radius-md': 5,
  '--radius-lg': 8,
  '--radius-xl': 12,
  '--radius-full': 9999,
} as const satisfies Record<`--radius-${string}`, number>;

/** §7.4'ün üç gölgesi — CSS dizesi olarak, birebir. */
export const SHADOW_SCALE = {
  '--shadow-sm': '0 1px 2px rgba(0,0,0,.32)',
  '--shadow-md': '0 4px 12px rgba(0,0,0,.38)',
  '--shadow-lg': '0 12px 32px rgba(0,0,0,.44)',
} as const satisfies Record<`--shadow-${string}`, string>;

/**
 * §7.4'ün yedi katmanı.
 *
 * ⚠️ Sıra bir **iddia**: `base < dropdown < sticky < overlay < modal < toast <
 * tooltip`. Test bunu değerleri tek tek karşılaştırarak değil **monoton artan**
 * olduklarını ölçerek iddia ediyor — biri 250'ye çekilirse sıra bozulur ve
 * `--z-sticky` bir açılır menünün üstüne çıkar.
 */
export const Z_INDEX = {
  '--z-base': 0,
  '--z-dropdown': 100,
  '--z-sticky': 200,
  '--z-overlay': 300,
  '--z-modal': 400,
  '--z-toast': 500,
  '--z-tooltip': 600,
} as const satisfies Record<`--z-${string}`, number>;

/** §7.4'ün üç süresi, milisaniye. */
export const DURATIONS_MS = {
  '--duration-fast': 120,
  '--duration-normal': 200,
  '--duration-slow': 320,
} as const satisfies Record<`--duration-${string}`, number>;

/** §7.4'ün tek yumuşatma eğrisi. */
export const EASING = {
  '--ease-out': 'cubic-bezier(.16,1,.3,1)',
} as const;

/**
 * §7.4: *"`prefers-reduced-motion` veya «Hareketi azalt» ayarı açıksa tüm
 * süreler `0ms`."*
 *
 * ⚠️ Fonksiyon **`prefers-reduced-motion`u kendisi OKUMUYOR** ve bu bilinçli:
 * 6.0 ölçtü ki jsdom'da `window.matchMedia` **tanımsız**. Medya sorgusunu
 * okuyan katman (6.3) kararı **parametre olarak** veriyor; burada kalan şey saf
 * bir dönüşüm ve **test edilebilir**. Ortamı okuyan bir fonksiyon jsdom'da
 * sınanamazdı ve *"bakacak bir şey bulamayan bir kapı"* doğardı.
 */
export const durationsForMotionPreference = (
  reducedMotion: boolean,
): Record<keyof typeof DURATIONS_MS, number> => {
  if (!reducedMotion) return { ...DURATIONS_MS };
  return {
    '--duration-fast': 0,
    '--duration-normal': 0,
    '--duration-slow': 0,
  };
};
