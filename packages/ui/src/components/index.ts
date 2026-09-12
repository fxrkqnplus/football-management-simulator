/**
 * Temel bileşenler I + II — Faz 6.4 ve 6.5.
 *
 * **6.4 (dokuz):** Button · Input · Select · Combobox · Checkbox ·
 * RadioGroup · Slider · Switch · Tabs.
 * **6.5 (dokuz):** Dialog · Sheet · Popover · Tooltip · Toast · Badge ·
 * Avatar · Progress · Skeleton.
 *
 * ⚠️ **LİSTEDE OLMAYAN BİLEŞEN YAZILMADI** (K12). Kalan kapsam:
 * **alan-özel bileşenler → 6.6**, **DataTable → 6.7**.
 *
 * ⚠️ **`Popover` 6.4'te KURULMUŞ ama DIŞA AKTARILMAMIŞTI** — Combobox'ın
 * katmanı olarak içeriden kullanılıyordu ve 6.4'ün listesinde yoktu. 6.5
 * onu yayınlıyor; Combobox **değiştirilmedi** (kanıt raporda, md5).
 */
export {
  foregroundForTone,
  SEMANTIC_TONE_CLASSES,
  SEMANTIC_TONE_TOKENS,
  SEMANTIC_TONES,
  type SemanticTone,
} from '../tokens/semantic-tone.js';
// 6.6 — alan-özel bileşenler. Dışa aktarım listeleri yazarların ÇIKTI'sından
// birleştirme adımında TAMAMLANIR; iskele yalnızca stub'ta var olan adları
// dışa aktarır ki her yazarın paket tip denetimi kendi dosyasıyla sınırlı kalsın.
export {
  ATTRIBUTE_BADGE_CVD_CLASSES,
  ATTRIBUTE_BADGE_CVD_SELECTOR,
  ATTRIBUTE_BADGE_FOREGROUNDS,
  ATTRIBUTE_BADGE_KEYS,
  ATTRIBUTE_BADGE_SIZE_CLASSES,
  ATTRIBUTE_BADGE_SIZES,
  ATTRIBUTE_BAND_KEY_ORDER,
  ATTRIBUTE_BAND_PATTERNS,
  ATTRIBUTE_PATTERN_ALPHA,
  ATTRIBUTE_PATTERN_GEOMETRY,
  AttributeBadge,
  attributeBadgeForeground,
  type AttributeBadgeKeyName,
  type AttributeBadgeProps,
  type AttributeBadgeSize,
  attributeBandPattern,
  attributePatternComposite,
  formatAttributeValue,
} from './attribute-badge.js';
export {
  Avatar,
  AvatarFallback,
  type AvatarFallbackProps,
  AvatarImage,
  type AvatarImageProps,
  type AvatarProps,
} from './avatar.js';
export {
  Badge,
  BADGE_VARIANT_CLASSES,
  BADGE_VARIANTS,
  type BadgeProps,
  type BadgeVariant,
} from './badge.js';
export { Button, type ButtonProps } from './button.js';
export {
  BUTTON_SIZE_CLASSES,
  BUTTON_SIZES,
  BUTTON_VARIANT_CLASSES,
  BUTTON_VARIANTS,
  type ButtonSize,
  type ButtonVariant,
} from './button-variants.js';
export { Checkbox, type CheckboxProps } from './checkbox.js';
export {
  CLUB_CREST_KEYS,
  CLUB_CREST_SIZES,
  ClubCrest,
  clubCrestPixelSize,
  type ClubCrestProps,
  type ClubCrestSize,
  initialsOf,
} from './club-crest.js';
export {
  Combobox,
  COMBOBOX_KEYS,
  type ComboboxOption,
  type ComboboxProps,
  filterOptions,
  foldForSearch,
  nextEnabledIndex,
} from './combobox.js';
export { CurrencyValue, type CurrencyValueProps, currencyValueText } from './currency-value.js';
export {
  DateChip,
  type DateChipContent,
  dateChipContent,
  type DateChipProps,
} from './date-chip.js';
export {
  Dialog,
  DIALOG_KEYS,
  DialogClose,
  DialogContent,
  type DialogContentProps,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from './dialog.js';
export {
  FORM_INDICATOR_DEFAULT_MAX,
  FORM_INDICATOR_KEYS,
  FORM_INDICATOR_SIZE_CLASSES,
  FORM_INDICATOR_SIZES,
  FORM_RESULT_CLASSES,
  FORM_RESULT_KEY_NAMES,
  FORM_RESULTS,
  FormIndicator,
  type FormIndicatorKeyName,
  type FormIndicatorProps,
  type FormIndicatorSize,
  type FormResult,
  isFormResult,
  lastResults,
} from './form-indicator.js';
export { ALL_UI_KEYS, UI_KEY_PREFIX, UI_KEYS, type UiKeyGroupName } from './i18n-keys.js';
export { Input, type InputProps } from './input.js';
export {
  isKitColor,
  isKitType,
  KIT_COLOR_PATTERN,
  KIT_COLOR_SLOTS,
  KIT_SWATCH_KEYS,
  KIT_SWATCH_OUTLINE_CLASS,
  KIT_SWATCH_PATHS,
  KIT_SWATCH_SIZE_CLASSES,
  KIT_SWATCH_SIZES,
  KIT_SWATCH_VIEWBOX,
  KIT_TYPE_KEY_NAMES,
  KIT_TYPES,
  type KitColorSlots,
  KitSwatch,
  type KitSwatchColors,
  kitSwatchColors,
  type KitSwatchKeyName,
  type KitSwatchProps,
  type KitSwatchSize,
  type KitType,
  kitTypeKeyName,
} from './kit-swatch.js';
export {
  MORALE_ICON_KEYS,
  MORALE_ICON_SIZE_CLASSES,
  MORALE_ICON_SIZES,
  MORALE_LEVEL_CLASSES,
  MORALE_LEVEL_GLYPHS,
  MORALE_LEVEL_KEY_NAMES,
  MORALE_LEVELS,
  MORALE_MAX,
  MORALE_MIN,
  MoraleIcon,
  type MoraleIconKeyName,
  type MoraleIconProps,
  type MoraleIconSize,
  type MoraleLevel,
  moraleLevelFor,
  type MoraleLevelKey,
} from './morale-icon.js';
export {
  PLAYER_PORTRAIT_KEYS,
  PLAYER_PORTRAIT_SIZES,
  PlayerPortrait,
  playerPortraitPixelSize,
  type PlayerPortraitProps,
  type PlayerPortraitSize,
} from './player-portrait.js';
export {
  Popover,
  PopoverAnchor,
  PopoverContent,
  type PopoverContentProps,
  PopoverTrigger,
} from './popover.js';
export {
  isPositionCode,
  isPositionLevel,
  PITCH_GEOMETRY,
  PITCH_LINE_CLASS,
  PITCH_STROKE,
  PITCH_SURFACE_CLASS,
  type PitchPoint,
  type PitchRect,
  POSITION_CODES,
  POSITION_COORDINATES,
  POSITION_ENTRY_SEPARATOR,
  POSITION_KEY_NAMES,
  POSITION_LEVEL_KEY_NAMES,
  POSITION_LEVEL_MARKERS,
  POSITION_LEVELS,
  POSITION_MAP_KEYS,
  POSITION_MAP_SIZE_CLASSES,
  POSITION_MAP_SIZES,
  POSITION_MAP_VIEWBOX,
  POSITION_MARKER_FONT_SIZE,
  POSITION_MARKER_RADIUS,
  POSITION_UNSET_MARKER,
  type PositionCode,
  positionEntriesText,
  type PositionEntry,
  type PositionLevel,
  PositionMap,
  positionMapEntries,
  type PositionMapKeyName,
  type PositionMapProps,
  type PositionMapSize,
  type PositionMarkerStyle,
} from './position-map.js';
export { indicatorOffsetPercent, Progress, type ProgressProps } from './progress.js';
export {
  RadioGroup,
  RadioGroupItem,
  type RadioGroupItemProps,
  type RadioGroupProps,
} from './radio-group.js';
export {
  Select,
  SELECT_KEYS,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  type SelectTriggerProps,
  SelectValue,
} from './select.js';
export {
  Sheet,
  SHEET_KEYS,
  SHEET_SIDE_CLASSES,
  SHEET_SIDES,
  SheetClose,
  SheetContent,
  type SheetContentProps,
  SheetDescription,
  type SheetSide,
  SheetTitle,
  SheetTrigger,
} from './sheet.js';
export { Skeleton, type SkeletonProps } from './skeleton.js';
export { Slider, type SliderProps } from './slider.js';
export {
  formatStarValue,
  isStarValue,
  STAR_CENTER,
  STAR_FILL_EMPTY,
  STAR_FILL_FULL,
  STAR_HALF_POINTS,
  STAR_HALF_VERTICES,
  STAR_INNER_RADIUS,
  STAR_MAX,
  STAR_OUTER_RADIUS,
  STAR_POINTS,
  STAR_RATING_KEYS,
  STAR_STATES,
  STAR_STEP,
  STAR_STROKE_POTENTIAL,
  STAR_VERTICES,
  STAR_VIEWBOX,
  starDataValue,
  StarRating,
  type StarRatingProps,
  type StarState,
  starStates,
  type StarVertex,
  starVertices,
} from './star-rating.js';
export { Switch, type SwitchProps } from './switch.js';
export {
  Tabs,
  TabsContent,
  type TabsContentProps,
  TabsList,
  type TabsListProps,
  type TabsProps,
  TabsTrigger,
  type TabsTriggerProps,
} from './tabs.js';
export {
  Toast,
  TOAST_KEYS,
  ToastAction,
  ToastDescription,
  type ToastProps,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from './toast.js';
export {
  Tooltip,
  TooltipContent,
  type TooltipContentProps,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip.js';
