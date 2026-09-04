/**
 * Tipografi token'ları — `docs/spec/05-design-system.md` §7.3'ün TEK KAYNAĞI.
 *
 * ⚠️ **Font DOSYALARI burada değil.** §7.3 Inter + JetBrains Mono istiyor ve
 * alt kümenin `latin-ext` içermesi gerektiğini söylüyor (Türkçe `ğĞüÜşŞıİöÖçÇ`).
 * Fontların kurulması, alt kümelenmesi ve `@font-face` bildirimi **6.3**'ün
 * işi; burada yalnızca **yığın adları** yaşıyor.
 *
 * ⚠️ **`ı` ve `İ` ayrıca bir hatırlatma taşıyor:** Türkçe küçük/büyük harf
 * dönüşümü güvenli değildir (`I`→`i` uyum sınıfını değiştirir, `İ`→`i̇` dizeyi
 * uzatır). Token adları bu yüzden **İngilizce ve ASCII**; dönüşüm gerektiren
 * hiçbir yerde token adı kullanılmaz.
 */

/** §7.3'ün iki font yığını — birebir. */
export const FONT_STACKS = {
  '--font-ui': "'Inter', system-ui, -apple-system, sans-serif",
  '--font-mono': "'JetBrains Mono', ui-monospace, monospace",
} as const;

export interface TextStep {
  /** Yazı boyutu, piksel. */
  readonly size: number;
  /** Satır yüksekliği, piksel. */
  readonly lineHeight: number;
}

/**
 * §7.3'ün sekiz basamaklı ölçeği (`10px/14px` gibi yazılmış).
 *
 * ⚠️ Bir SAYI değil bir LİSTE; `typography.test.ts` sekiz basamağın adını ve
 * **iki değerini birden** spec'e karşı iddia ediyor. Yalnızca `size`ı
 * karşılaştıran bir test, yanlış bir `lineHeight`ı geçirirdi.
 *
 * ℹ️ `--text-base` (14/20) §7.3'te *"gövde varsayılanı"* diye işaretli;
 * `BASE_TEXT_STEP` onu adıyla dışa aktarıyor ki tüketiciler `14`ü elle
 * yazmasın.
 */
export const TEXT_SCALE = {
  '--text-2xs': { size: 10, lineHeight: 14 },
  '--text-xs': { size: 11, lineHeight: 16 },
  '--text-sm': { size: 13, lineHeight: 18 },
  '--text-base': { size: 14, lineHeight: 20 },
  '--text-lg': { size: 16, lineHeight: 24 },
  '--text-xl': { size: 20, lineHeight: 28 },
  '--text-2xl': { size: 26, lineHeight: 34 },
  '--text-3xl': { size: 34, lineHeight: 42 },
} as const satisfies Record<`--text-${string}`, TextStep>;

/** §7.3: *"gövde varsayılanı"*. */
export const BASE_TEXT_STEP = '--text-base';

/** §7.3'ün dört ağırlığı — birebir. */
export const FONT_WEIGHTS = {
  '--weight-normal': 400,
  '--weight-medium': 500,
  '--weight-semibold': 600,
  '--weight-bold': 700,
} as const;

/**
 * §7.3'ün erişilebilirlik ölçeği: *"kök `font-size` **%90 / %100 / %115 /
 * %130** olarak ölçeklenir; tüm `rem` tabanlı değerler uyar."*
 *
 * ⚠️ Ölçekler **yüzde tam sayısı** olarak duruyor, ondalık çarpan olarak değil:
 * `0.9` yazmak `%90`ı kaybettirir ve bir sonraki okuyucu `%90`ın nereden
 * geldiğini spec'te aramak zorunda kalır. Çarpan `rootFontScaleFactor()` ile
 * türetilir.
 */
export const ROOT_FONT_SCALES = [90, 100, 115, 130] as const;

/** §7.3'ün varsayılanı — ölçeklerin `%100` üyesi. */
export const DEFAULT_ROOT_FONT_SCALE = 100;

export type RootFontScale = (typeof ROOT_FONT_SCALES)[number];

/** Yüzdeyi `rem` çarpanına çevirir. `%115` → `1.15`. */
export const rootFontScaleFactor = (scale: RootFontScale): number => scale / 100;
