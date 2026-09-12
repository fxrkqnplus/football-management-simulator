/**
 * FormIndicator — son maçların SONUÇ DİZİSİ (G / B / M). Radix ilkeli **yok**,
 * düz bir `<ol>`; her maç bir `<li>`.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ "FORM" İKİ ANLAMLI — BU BİLEŞEN OYUNCU FORMUNU GÖSTERMEZ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `docs/spec/01-database.md`:990 `player_state.form numeric(3,1) // son 5 maç
 * ortalama reyting` diyor — o bir OYUNCU reytingi, tek bir **sayı**. Bu
 * bileşen ise bir TAKIMIN (ya da oyuncunun oynadığı maçların) **sonuç
 * dizisini** çizer: ROADMAP Faz 6'nın sesi (*"FormIndicator (G/B/M)"*), spec'in
 * değil. İkisi aynı kelimeyi paylaşıyor, aynı veriyi paylaşmıyor. **Faz 18**
 * oyuncu profilinde `form`u gösterirken bu bileşene UZANMAZ — o bir sayı
 * gösterimidir (reyting), bir harf dizisi değil.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * `max` VARSAYILANI 5 — KAYNAĞI ve SINIRI
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Spec'in *"son N maç"* dediği tek yer yukarıdaki satır: **"son 5 maç"**.
 * Pencere genişliği oradan ödünç alındı; bu bir **varsayılan**, bir kilit
 * değil — çağıran `max` ile başka bir pencere verebilir (`StarRating`in `max`
 * prop'unun aksine: orada ölçek spec'ten geliyor ve prop bilerek YOK, burada
 * pencere bir gösterim tercihi ve prop VAR).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * SIRA — eski → yeni, ve ters çevrilmiyor
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `results` **eskiden yeniye** gelir ve aynı sırayla soldan sağa çizilir; en
 * yeni maç **sağ uçta**. `lastResults` dizinin **son** `max` elemanını alır
 * (en yeniler) — hiçbir yerde `reverse()` yok. Çağıran ters sırada veri
 * verirse bileşen bunu bilemez; sözleşme prop'un JSDoc'unda.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * RENKLER — üç sonuç, iki anlamsal ton, bir nötr yüzey
 * ────────────────────────────────────────────────────────────────────────────
 *
 * · galibiyet → `SEMANTIC_TONE_CLASSES.success` · mağlubiyet → `.danger`
 *   (Toast ve Badge ile **aynı kaynak**, kopya değil — test değer eşitliğini
 *   iddia ediyor).
 * · beraberlik → `BADGE_VARIANT_CLASSES.neutral` (`--bg-elevated` /
 *   `--text-secondary`). Beraberlik bir **uyarı değil**: `--warning` cazip
 *   ama yanlış anlam taşırdı. Badge'in gerekçesi burada da geçerli: beşinci
 *   bir anlamsal renk icat edilmiyor, var olan nötr yüzey **paylaşılıyor**.
 * · Renk tek kanal değil: her `<li>` harfi (G/B/M) ve `title`ı (uzun ad)
 *   taşıyor, `data-result` ile de sonuç okunabiliyor. Renk körlüğü modu
 *   (6.8) bu bileşene dokunmak zorunda değil — harf zaten orada.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * METİN — hepsi `t()`, harfler bile
 * ────────────────────────────────────────────────────────────────────────────
 *
 * G / B / M Türkçe adların baş harfi (`docs/glossary.md` §8: Galibiyet ·
 * Beraberlik · Mağlubiyet). Harf de bir arayüz metnidir ve **sabit
 * kodlanmıyor** (K5) — bir gün İngilizce gelirse W / D / L olacak ve bu
 * dosya değişmeyecek. `aria-label` *"Son {{count}} maç formu"*; `count`
 * **gösterilen** maç sayısı, `max` değil (3 sonuç, `max` 5 → "Son 3 maç").
 *
 * ⚠️ Boş dizi → `<span>` ile t(empty), `--text-muted`. O token her iki temada
 * AA'nın **altında** (6.2 ölçtü: koyu 3,27–3,83 · açık 2,86–3,07; karar
 * **6.8**'in). Boş hâl ikincil bir ipucu; 6.8 `--text-muted`ı daraltırsa bu
 * sınıf onunla birlikte değişir, sessizce kalmaz.
 *
 * ⚠️ Geçersiz girdi SESSİZCE KIRPILMAZ (`bandForAttribute` emsali): küme dışı
 * bir sonuç dizesi (API'den gelen veri tip taşımaz) ya da pozitif tam sayı
 * olmayan `max` → `RangeError`, Türkçe mesaj.
 *
 * TAKLİT ETMEDİĞİ: sonuç dizisinin **hesabı** (sunucu, K1) · oyuncu form
 * reytingi (Faz 18) · iç saha / deplasman ayrımı · turnuva filtresi ·
 * `title`ın tarayıcı tooltip'i (yerel `title`; `Tooltip` bileşeni sağlayıcı
 * ister, burada bilerek kullanılmadı) · görsel doğrulama (Faz 49, G-05).
 */
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '../lib/cn.js';
import { SEMANTIC_TONE_CLASSES } from '../tokens/semantic-tone.js';
import { BADGE_VARIANT_CLASSES } from './badge.js';

/**
 * `common:ui.formIndicator.*` — bu modülün TEK `*_KEYS` dışa aktarımı
 * (`i18n-keys.test.ts` ②: ikincisi kayıt defterini ezerdi).
 */
export const FORM_INDICATOR_KEYS = {
  winShort: 'common:ui.formIndicator.win.short',
  winLong: 'common:ui.formIndicator.win.long',
  drawShort: 'common:ui.formIndicator.draw.short',
  drawLong: 'common:ui.formIndicator.draw.long',
  lossShort: 'common:ui.formIndicator.loss.short',
  lossLong: 'common:ui.formIndicator.loss.long',
  aria: 'common:ui.formIndicator.aria',
  empty: 'common:ui.formIndicator.empty',
} as const;

export type FormIndicatorKeyName = keyof typeof FORM_INDICATOR_KEYS;

/** Üç sonuç — **liste**, sayı ondan türüyor. Sıra ROADMAP'in yazımı (G/B/M). */
export const FORM_RESULTS = ['win', 'draw', 'loss'] as const;

export type FormResult = (typeof FORM_RESULTS)[number];

/** Varsayılan pencere — `spec/01`:990 *"son 5 maç"* (dosya başına bak). */
export const FORM_INDICATOR_DEFAULT_MAX = 5;

export const FORM_INDICATOR_SIZES = ['sm', 'md'] as const;

export type FormIndicatorSize = (typeof FORM_INDICATOR_SIZES)[number];

/**
 * Sonuç → anahtar ADLARI (kısa harf · uzun ad).
 *
 * `t()`nin kökü daima `FORM_INDICATOR_KEYS`in kendisi
 * (`t(FORM_INDICATOR_KEYS[FORM_RESULT_KEY_NAMES[r].short])`) — `i18n:check`
 * yalnızca o kökü çözüyor. Adı bilerek `_KEYS` ile BİTMİYOR.
 */
export const FORM_RESULT_KEY_NAMES = {
  win: { short: 'winShort', long: 'winLong' },
  draw: { short: 'drawShort', long: 'drawLong' },
  loss: { short: 'lossShort', long: 'lossLong' },
} as const satisfies Record<
  FormResult,
  { readonly short: FormIndicatorKeyName; readonly long: FormIndicatorKeyName }
>;

/**
 * Sonuç → sınıflar. İki anlamsal ton **yayılıyor**, nötr yüzey Badge'den
 * **paylaşılıyor** — üçü de kopya değil (dosya başına bak).
 */
export const FORM_RESULT_CLASSES: Record<FormResult, string> = {
  win: SEMANTIC_TONE_CLASSES.success,
  draw: BADGE_VARIANT_CLASSES.neutral,
  loss: SEMANTIC_TONE_CLASSES.danger,
};

export const FORM_INDICATOR_SIZE_CLASSES: Record<FormIndicatorSize, string> = {
  sm: 'h-4 w-4 text-[var(--text-2xs)]',
  md: 'h-5 w-5 text-[var(--text-xs)]',
};

const LIST_BASE = 'm-0 inline-flex list-none items-center gap-[var(--space-1)] p-0';

const ITEM_BASE =
  'inline-flex items-center justify-center rounded-[var(--radius-sm)] border ' +
  'font-[var(--font-ui)] leading-none font-semibold select-none';

const EMPTY_BASE = 'font-[var(--font-ui)] text-[var(--text-xs)] text-[var(--text-muted)]';

/** Çalışma zamanı kümesi denetimi — API'den gelen dize tip taşımaz. */
export const isFormResult = (value: string): value is FormResult =>
  FORM_RESULTS.some((result) => result === value);

/**
 * Gösterilecek sonuçlar: dizinin **son** `max` elemanı (en yeniler), sıra
 * korunarak. Saf — JSX dışında, ve bu yüzden ayrı test ediliyor (6.5
 * `indicatorOffsetPercent` dersi).
 *
 * ⚠️ Kırpma yok: küme dışı sonuç ya da geçersiz `max` → `RangeError`.
 */
export function lastResults(
  results: readonly string[],
  max: number = FORM_INDICATOR_DEFAULT_MAX,
): readonly FormResult[] {
  if (!Number.isInteger(max) || max < 1) {
    throw new RangeError(
      `Gösterilecek maç sayısı 1 veya daha büyük bir tam sayı olmalı: ${String(max)}`,
    );
  }
  const checked: FormResult[] = [];
  for (const result of results) {
    if (!isFormResult(result)) {
      throw new RangeError(
        `Bilinmeyen maç sonucu: ${result} (geçerli değerler: ${FORM_RESULTS.join(', ')})`,
      );
    }
    checked.push(result);
  }
  return checked.slice(-max);
}

export interface FormIndicatorProps {
  /** Maç sonuçları, **eskiden yeniye** — en yeni maç dizinin sonunda. */
  results: readonly FormResult[];
  /** Gösterilecek en fazla maç sayısı (en yeniler). Varsayılan `FORM_INDICATOR_DEFAULT_MAX`. */
  max?: number;
  size?: FormIndicatorSize;
  className?: string;
}

export function FormIndicator({
  results,
  max = FORM_INDICATOR_DEFAULT_MAX,
  size = 'md',
  className,
}: FormIndicatorProps): ReactElement {
  const { t } = useTranslation();
  const shown = lastResults(results, max);

  if (shown.length === 0) {
    return <span className={cn(EMPTY_BASE, className)}>{t(FORM_INDICATOR_KEYS.empty)}</span>;
  }

  return (
    <ol
      className={cn(LIST_BASE, className)}
      aria-label={t(FORM_INDICATOR_KEYS.aria, { count: shown.length })}
    >
      {shown.map((result, index) => (
        // Anahtar konum: dizi yalnızca sonuç harfleri taşıyor, yeniden
        // sıralanmıyor — aynı konum yeni bir sonuç alınca içerik değişir, kimlik değil.
        <li
          key={index}
          data-result={result}
          title={t(FORM_INDICATOR_KEYS[FORM_RESULT_KEY_NAMES[result].long])}
          className={cn(ITEM_BASE, FORM_INDICATOR_SIZE_CLASSES[size], FORM_RESULT_CLASSES[result])}
        >
          {t(FORM_INDICATOR_KEYS[FORM_RESULT_KEY_NAMES[result].short])}
        </li>
      ))}
    </ol>
  );
}
