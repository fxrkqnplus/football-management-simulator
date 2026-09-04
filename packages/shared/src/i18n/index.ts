/**
 * `@fms/shared` i18n alt barrel'ı — **SAF**.
 *
 * ⚠️ **i18next BURAYA GİRMEZ ve bu bir tercih değil, ölçülmüş bir karar**
 * (Faz 5.0, ROADMAP Faz 5 → 5.0 SONUÇ bloğu).
 *
 * `apps/api`, `apps/worker` ve `packages/engine` `@fms/shared`ı import ediyor.
 * i18next'i buraya koymak onu **üç katmana birden** sokardı. SAPMA-012'de
 * ölçüldü ki `sideEffects: false` ile `types: []` bir alt yol sızıntısını
 * **engellemiyor** (paket 229.320 → 299.370 bayt, `JWT_SECRET` tarayıcı
 * paketinde çıktı); sızıntıyı yalnızca `arch:check` yakalamıştı ve onun
 * i18next için bir kuralı **yok**.
 *
 * Buradan çıkan her şey saf: ek motoru **dilbilgisi**, biçimlendiriciler
 * **`Intl`** (yerleşik, ECMA-402). i18next örneğinin yeri `apps/web` — 5.3.
 */
export type { FormatDateOptions, FormatMoneyOptions } from './format.js';
export {
  COMPACT_SUFFIXES,
  DEFAULT_CURRENCY,
  DEFAULT_TIME_ZONE,
  formatDate,
  formatMoneyCompact,
  formatNumber,
  lowerCompactSuffix,
  UI_LOCALE,
} from './format.js';
export type {
  EndingKind,
  GrammaticalCase,
  NameEnding,
  PronunciationOverride,
  VowelHarmonyClass,
} from './turkish-suffix.js';
export {
  GRAMMATICAL_CASES,
  PRONUNCIATION_OVERRIDES,
  resolveEnding,
  suffixFor,
  VOWEL_HARMONY_CLASSES,
  withSuffix,
} from './turkish-suffix.js';
