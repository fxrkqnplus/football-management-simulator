/**
 * Temayı bir DOM köküne uygular — `docs/spec/05-design-system.md` §7.1 / §7.3.
 *
 * ⚠️ **Bu dosya DOM'a yazıyor ama ORTAMI OKUMUYOR.** Bütün girdiler parametre;
 * `matchMedia` burada çağrılmıyor. Sonuç: jsdom'da **tam test edilebilir**
 * (`setAttribute` ve `style.setProperty` jsdom'da çalışıyor — `matchMedia`
 * çalışmıyor, 6.0'da ölçüldü).
 */
import {
  type ColorTokenKey,
  CONTRAST_TARGET_AA,
  DARK_COLOR_TOKENS,
  ensureContrast,
  type EnsureContrastResult,
  LIGHT_COLOR_OVERRIDES,
} from '../tokens/index.js';
import { type RootFontScale } from '../tokens/typography.js';
import { type ThemeMode } from './theme-mode.js';

/** `data-` nitelikleri — CSS tarafı bunlara göre seçici yazıyor. */
export const THEME_ATTRIBUTE = 'data-theme';
export const MOTION_ATTRIBUTE = 'data-reduced-motion';
export const FONT_SCALE_ATTRIBUTE = 'data-font-scale';

/** Kulüp vurgusunun yazıldığı token. §7.1: *"`--accent` … ayarlanır"*. */
export const CLUB_ACCENT_TOKEN: ColorTokenKey = '--accent';

export interface ApplyThemeOptions {
  /** Çözülmüş tema — `system` **kabul edilmez**, çözülmüş olmak zorunda. */
  readonly mode: ThemeMode;
  /** §7.4: açıksa tüm süreler `0ms`. */
  readonly reducedMotion: boolean;
  /** §7.3: kök `font-size` yüzdesi. */
  readonly fontScale: RootFontScale;
  /**
   * Yönetilen kulübün `colorPrimary`'si, `#RRGGBB`. Yoksa `--accent` **hiç
   * yazılmaz** ve token'ın kendi değeri geçerli kalır.
   */
  readonly clubColor?: string;
}

export interface ApplyThemeResult {
  readonly mode: ThemeMode;
  /**
   * Kulüp rengi verildiyse `ensureContrast()` sonucu, verilmediyse `undefined`.
   *
   * ⚠️ `reachedTarget: false` **dönebilir** ve bu sessizce yutulmuyor: çağıran
   * onu görüp karar veriyor. 6.2 bu sınırı ölçtü — spec'in fiili
   * *"açıklaştırmak"* ve açık zeminde hedef sağlanamıyor; sahibi **6.8**.
   */
  readonly accent: EnsureContrastResult | undefined;
}

/** Vurgunun üzerine oturduğu yüzey — kontrast ona karşı ölçülür. */
const surfaceFor = (mode: ThemeMode): string =>
  mode === 'dark' ? DARK_COLOR_TOKENS['--bg-surface'] : LIGHT_COLOR_OVERRIDES['--bg-surface'];

/**
 * Kökü verilen temaya göre işaretler.
 *
 * ⚠️ **Kulüp rengi `ensureContrast()`ten GEÇİRİLİYOR, yenisi yazılmıyor.**
 * Fonksiyon 6.2'de yazıldı ve sınırı orada beyan edildi; burada **kullanılıyor**.
 * 6.2'nin kaydettiği kusura (koyu `--accent` beyaz zeminde **2,31**) bu alt
 * görevde **dokunulmuyor** — sahibi 6.8, ve başka bir alt görevin kaydettiği
 * bir kusuru sessizce "düzeltmek" bir kararı sessizce ters çevirmektir.
 */
export const applyTheme = (root: HTMLElement, options: ApplyThemeOptions): ApplyThemeResult => {
  root.setAttribute(THEME_ATTRIBUTE, options.mode);
  root.setAttribute(MOTION_ATTRIBUTE, options.reducedMotion ? 'reduce' : 'no-preference');
  root.setAttribute(FONT_SCALE_ATTRIBUTE, String(options.fontScale));

  if (options.clubColor === undefined) {
    root.style.removeProperty(CLUB_ACCENT_TOKEN);
    return { mode: options.mode, accent: undefined };
  }

  const accent = ensureContrast(options.clubColor, surfaceFor(options.mode), CONTRAST_TARGET_AA);
  root.style.setProperty(CLUB_ACCENT_TOKEN, accent.color);
  return { mode: options.mode, accent };
};
