/**
 * Tasarım token'ları — `docs/spec/05-design-system.md` §7.1–§7.4.
 *
 * ⚠️ Bu dosya yalnızca yeniden dışa aktarıyor ve **kapsam raporundan
 * DIŞLANMIYOR**: `vitest.config.ts`in kendi notu bunu adıyla söylüyor
 * (*"bir giriş dosyası ileride mantık kazanırsa kapsam onu da görmelidir"*).
 */
export {
  ATTRIBUTE_BANDS,
  ATTRIBUTE_MAX,
  ATTRIBUTE_MIN,
  type AttributeBand,
  bandForAttribute,
  bandForAttributeRange,
} from './attribute-scale.js';
export {
  ALPHA_COLOR_TOKENS,
  type ColorTokenKey,
  type ColorTokenName,
  type ColorTokenValue,
  DARK_COLOR_TOKENS,
  LIGHT_COLOR_OVERRIDES,
  LIGHT_UNDEFINED_IN_SPEC,
  resolveTheme,
} from './color.js';
export {
  blendTowardWhite,
  CONTRAST_TARGET_AA,
  contrastRatio,
  ensureContrast,
  type EnsureContrastResult,
  LINEARIZATION_THRESHOLD,
  linearizeChannel,
  pickAccessibleForeground,
  relativeLuminance,
} from './contrast.js';
export {
  DURATIONS_MS,
  durationsForMotionPreference,
  EASING,
  RADIUS_SCALE,
  SHADOW_SCALE,
  SPACE_BASE_PX,
  SPACE_SCALE,
  Z_INDEX,
} from './geometry.js';
export {
  BASE_TEXT_STEP,
  DEFAULT_ROOT_FONT_SCALE,
  FONT_STACKS,
  FONT_WEIGHTS,
  ROOT_FONT_SCALES,
  type RootFontScale,
  rootFontScaleFactor,
  TEXT_SCALE,
  type TextStep,
} from './typography.js';
