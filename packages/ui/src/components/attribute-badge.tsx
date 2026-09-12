/**
 * AttributeBadge — bir nitelik değerinin (1–20) ya da belirsizlik aralığının
 * (`13–17`) bant renkli rozeti. Radix ilkeli **yok**, düz bir `<span>`
 * (sözleşme 6.6 §1.1; kaynak `docs/spec/05-design-system.md` §7.2).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ÜÇ KANAL: RENK + AĞIRLIK + DESEN — ve neden üçü de gerekli
 * ────────────────────────────────────────────────────────────────────────────
 *
 * §7.2: *"Renk körlüğü modunda ek olarak **sayı kalınlaşır** ve **arka plan
 * deseni** eklenir."* 6.2 komşu bant kontrastlarını ölçtü (1,04–1,71) — yani
 * parlaklık **tam renkli görüşte bile** komşu bantları ayırmıyor; renk körlüğü
 * modunda ton bilgisi de düşünce geriye ağırlık ve desen kalıyor. Bu yüzden
 * desen **bant başına farklı**: tek bir desen *"CVD modu açık"* der ama
 * hangi bant olduğunu söylemez; sekiz farklı desen (açı × aralık) üçüncü
 * kanalın bilgi taşımasını sağlar. Spec *"desen"* (tekil) diyor — bu bir
 * GEREKÇE, SAPMA değil: spec deseni tarif etmiyor, sayısını da vermiyor.
 *
 * **Aktivasyon tek yoldan:** ata `[data-cvd]` özniteliği (`CVD_ATTRIBUTE`,
 * `theme/apply-theme.ts`). Sınıf literalleri **verbatim** yazılı
 * (`[[data-cvd]_&]:font-bold` · `[[data-cvd]_&]:[background-image:var(--band-pattern)]`)
 * çünkü Tailwind kaynak taraması bir şablonu **görmez**; test literalin
 * `[${CVD_ATTRIBUTE}]` içerdiğini iddia ediyor ki seçici (6.6) ile setter
 * (6.8) iki ayrı liste olarak ayrışmasın. Ölçüldü (Tailwind 4.3.3
 * `@tailwindcss/node` `compile`): iki literal de derleniyor —
 * `[data-cvd] .…:font-bold { font-weight: var(--font-weight-bold) }` ve
 * `[data-cvd] .… { background-image: var(--band-pattern) }`. Modun kendisi
 * (üç tip, `html[data-cvd]`, ayar) **6.8'in işi**; bileşen yalnızca
 * `--band-pattern` değişkenini **her zaman** inline taşır (bilinmiyor
 * durumunda `none`) ve `[data-cvd]` altında onu zemine bağlar.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ DESEN MÜREKKEBİ SİYAH, BEYAZ DEĞİL — SÖZLEŞMEDEN ÖLÇÜMLE AYRILAN TEK NOKTA
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Sözleşme §1.1 çizgileri *"beyaz `rgba(255,255,255,alfa)`"* diye yazıyor ve
 * alfayı **ölçtürüyor**: 0,05 adımlarla en büyük alfa öyle ki sekiz bandın
 * hepsinde seçilen ön plan, çizgi bileşkesi üzerinde de ≥ 4,5:1. Ölçüm
 * (`packages/ui/src/tokens/contrast.ts`in gerçek `blendTowardWhite` /
 * `contrastRatio`u, `tsx` ile) şunu verdi:
 *
 *   beyaz: **en büyük geçen alfa 0,00** — bant 1 (`#B04A3C`, zayıf) düz
 *   zeminde `--text-primary` ile **4,555**; pay 0,055. Her beyaz karışım onu
 *   AA'nın altına düşürüyor (0,05 → 4,154; `--text-inverse` düzde zaten 3,58).
 *   Yani beyaz mürekkeple desen kanalı **ölü**: alfa 0 → desen görünmez →
 *   spec'in istediği üçüncü kanal yok. DZ-10: *"yazılmış bir ayar, etkisi
 *   ölçülene kadar hiçbir şey yapmayan ayardır."*
 *
 *   siyah (`blendTowardBlack`): **en büyük geçen alfa 0,10** — sınır bant 2
 *   (`#C77E3A`, vasat altı) `--text-inverse` ile bileşkede 4,901; 0,15'te
 *   4,447 (kırılıyor). Bant 0–1 açık metin taşıyor ve koyu çizgi onların
 *   kontrastını **yükseltiyor** (7,79 → 8,75 · 4,56 → 5,36); bant 2–7 koyu
 *   metin taşıyor ve payları (5,96–8,17) %10 koyulaşmayı kaldırıyor.
 *
 * Karar: **kriter korundu, mekanizma düzeltildi** (DZ-05'in yönü — kural
 * test için gevşetilmez). Mürekkep siyah, `ATTRIBUTE_PATTERN_ALPHA = 0.10`.
 * Test sayıyı **kopyalamıyor**, kuralı yeniden koşturup sabitin ona eşit
 * olduğunu iddia ediyor; karşı kontrol olarak beyaz mürekkebin aynı kuralda
 * 0,00 verdiğini de iddia ediyor (tek satır değişirse — mürekkep beyaza
 * dönerse — ilk kırılan o). Sözleşmenin literalinden bu sapma ÇIKTI'da
 * İSTEK olarak ana oturuma sunuldu; onay ya da geri alma tek sabittir.
 *
 * Çizginin görünürlüğü (CIE L\*, %10 siyah): bant 0 **3,2** · bant 1 **4,4**
 * · bant 2–7 **5,7–6,4**. Deponun kendi eşiği (`--accent-hover`, 6.3b) 5 L\*;
 * iki koyu bantta çizgi bu eşiğin altında — **yazılıyor, gizlenmiyor**.
 * Ekranda ayırt edilebilirlik Faz 49'un ölçümü (G-05).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ÖN PLAN TEMA-BAĞIMSIZ HEX — sözleşme §0 istisna ②
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Zemin spec'in hex'i (istisna ①) ve temayla değişmiyor; ön plan da
 * değişmemeli: açık temada `var(--text-primary)` `#151A22` olur ve 1. bantta
 * ≈1,9:1'e düşerdi (sözleşmede ölçüldü). Adaylar koyu temanın
 * `--text-primary` / `--text-inverse` değerleri (`ATTRIBUTE_BADGE_FOREGROUNDS`);
 * seçim bir tercih değil bir hesap: **düz bant** ve **çizgi bileşkesi**
 * üzerindeki oranların **düşüğü** en yüksek olan aday kazanır
 * (`attributeBadgeForeground`). Eşitlikte ilk aday (deterministik).
 * `contrast-audit.test.ts` DENETİM ⑦ sekiz bant × iki zemini AA'ya karşı
 * denetliyor ve aynı listeyi import ediyor (iki liste → bir).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * SINIF ADLARI ETİKETLİ — `family-name:` ve `length:` — ÖLÇÜLDÜ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `currency-value.tsx`in ölçümü: `font-[var(--font-mono)]` Tailwind 4.3.3'te
 * `font-weight` üretiyor. Bu dosyada aynı motorla bir adım daha ölçüldü:
 * `text-[var(--text-sm)]` → **`color: var(--text-sm)`** (yanlış özellik);
 * `text-[length:var(--text-sm)]` → `font-size`. Yani deponun yazı boyutu
 * idiyomu da etiketsiz hâliyle ölü; burada boyut `length:`, yazı tipi
 * `family-name:` etiketiyle yazılı ve test etiketleri iddia ediyor. Mevcut
 * bileşenlere dokunmak bu yazarın işi değil — ÇIKTI'da İSTEK.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * GİRDİ: `value` YA DA `range`, İKİSİ DEĞİL; İKİSİ DE YOKSA BİLİNMİYOR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * · İkisi birden → `RangeError` (hangisinin geçerli olduğu bileşenin kararı
 *   olamaz). · İkisi de yok → **bilinmiyor**: `?` glifi, yüzey token'ları
 *   (`--bg-elevated` / `--text-secondary`), `aria-label` = t(unknown),
 *   `data-band-index` yok. · `range` için `min < max` **zorunlu** — eşit uçlar
 *   bir aralık değil bir değerdir ve çağıran `value` verir (StarRating §1.2
 *   ile aynı kural; `bandForAttributeRange` eşitliği kabul ediyor, burada
 *   daraltıldı — bir karar, ve testte). Uçlar 1–20 tam sayı; doğrulama
 *   `formatAttributeValue`te, JSX dışında.
 * · Aralık metni `13–17` (U+2013, spec'in yazımı); rengi aralığın ortası
 *   belirliyor (`bandForAttributeRange`, aşağı yuvarlama — 6.2 kalibrasyonu).
 *
 * **KALİBRASYONLAR (spec vermiyor, burada doğdu):** sekiz desenin açı/aralık
 * çifti (`ATTRIBUTE_PATTERN_GEOMETRY`: dört açı × iki periyot, komşular
 * açıyla ayrılıyor) · boyut sınıfları (`sm` 16px / `md` 20px yükseklik).
 *
 * **TAKLİT ETMEDİĞİ:** CVD modu ve üç tip (6.8) · ekranda ayırt edilebilirlik
 * ve çizginin gerçekten çizildiği — jsdom `getComputedStyle` `var()` çözmüyor,
 * `background-image` uygulanmıyor (6.0 ölçümü); sınıf adı ve inline değişken
 * iddia ediliyor, görsel doğrulama **Faz 17** (G-02) ve **Faz 49** (G-05) ·
 * belirsizlik gösteriminin veri kaynağı (Faz 31) · tooltip/açıklama (ekranın
 * kararı).
 */
import type { CSSProperties, HTMLAttributes, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '../lib/cn.js';
import { CVD_ATTRIBUTE } from '../theme/apply-theme.js';
import {
  ATTRIBUTE_BANDS,
  ATTRIBUTE_MAX,
  ATTRIBUTE_MIN,
  type AttributeBand,
  bandForAttribute,
  bandForAttributeRange,
} from '../tokens/attribute-scale.js';
import { DARK_COLOR_TOKENS } from '../tokens/color.js';
import { blendTowardBlack, contrastRatio } from '../tokens/contrast.js';

/** `common:ui.attributeBadge.*` — düz nesne, modül başına TEK `*_KEYS`. */
export const ATTRIBUTE_BADGE_KEYS = {
  bandVeryPoor: 'common:ui.attributeBadge.band.veryPoor',
  bandPoor: 'common:ui.attributeBadge.band.poor',
  bandBelowAverage: 'common:ui.attributeBadge.band.belowAverage',
  bandAverage: 'common:ui.attributeBadge.band.average',
  bandGood: 'common:ui.attributeBadge.band.good',
  bandVeryGood: 'common:ui.attributeBadge.band.veryGood',
  bandExcellent: 'common:ui.attributeBadge.band.excellent',
  bandWorldClass: 'common:ui.attributeBadge.band.worldClass',
  unknown: 'common:ui.attributeBadge.unknown',
  label: 'common:ui.attributeBadge.label',
} as const;

export type AttributeBadgeKeyName = keyof typeof ATTRIBUTE_BADGE_KEYS;

/**
 * Bant sırası → anahtar ADI (`ATTRIBUTE_BANDS` sırasıyla). `t()`nin kökü
 * daima `ATTRIBUTE_BADGE_KEYS`in kendisi:
 * `t(ATTRIBUTE_BADGE_KEYS[ATTRIBUTE_BAND_KEY_ORDER[i]])` — `i18n:check`
 * import zincirini değil, aynı dosyadaki sabitin kökünü çözüyor.
 */
export const ATTRIBUTE_BAND_KEY_ORDER = [
  'bandVeryPoor',
  'bandPoor',
  'bandBelowAverage',
  'bandAverage',
  'bandGood',
  'bandVeryGood',
  'bandExcellent',
  'bandWorldClass',
] as const satisfies readonly AttributeBadgeKeyName[];

/**
 * Ön plan adayları — koyu temanın iki metin token'ının **değerleri**
 * (tema-bağımsız hex, sözleşme §0 istisna ②). Sıra deterministik: eşitlikte
 * ilk kazanır.
 */
export const ATTRIBUTE_BADGE_FOREGROUNDS = [
  DARK_COLOR_TOKENS['--text-primary'],
  DARK_COLOR_TOKENS['--text-inverse'],
] as const;

/**
 * Çizgi mürekkebinin alfası — **ÖLÇÜLDÜ** (dosya başı): siyah mürekkeple
 * 0,05 adımlarla en büyük değer öyle ki sekiz bandın hepsinde seçilen ön
 * plan, `attributePatternComposite()` üzerinde de ≥ 4,5:1. Test sayıyı
 * kopyalamıyor, kuralı yeniden koşturuyor.
 */
export const ATTRIBUTE_PATTERN_ALPHA = 0.1;

/** Mürekkep siyah — gerekçe ve ölçüm dosya başında. `rgba(0,0,0,alfa)`. */
const PATTERN_INK_RGB = '0,0,0';

/** Çizgi bileşkesi: bant rengi + `alpha` oranında siyah. Tek kural, tek yer. */
export function attributePatternComposite(
  color: string,
  alpha: number = ATTRIBUTE_PATTERN_ALPHA,
): string {
  return blendTowardBlack(color, Math.round(alpha * 100));
}

/**
 * Bant başına desen geometrisi — KALİBRASYON. Dört açı × iki periyot; komşu
 * bantlar (0↔1, 1↔2, …, 6↔7) hep **açıyla** ayrılıyor, 3↔4 ayrıca periyotla.
 * Uzunluğu `ATTRIBUTE_BANDS.length` ile aynı olmak zorunda (test).
 */
export const ATTRIBUTE_PATTERN_GEOMETRY = [
  { angle: 45, period: 4 },
  { angle: 135, period: 4 },
  { angle: 90, period: 4 },
  { angle: 0, period: 4 },
  { angle: 45, period: 8 },
  { angle: 135, period: 8 },
  { angle: 90, period: 8 },
  { angle: 0, period: 8 },
] as const satisfies readonly { readonly angle: number; readonly period: number }[];

/**
 * Bir bandın CSS `background-image` deseni — saf.
 *
 * `repeating-linear-gradient`; çizgi genişliği periyodun yarısı. `index`
 * bant sırası (0…7), `alpha` mürekkep alfası (0…1). Aralık dışı → `RangeError`.
 */
export function attributeBandPattern(index: number, alpha: number): string {
  if (!Number.isInteger(index) || index < 0 || index >= ATTRIBUTE_BANDS.length) {
    throw new RangeError(
      `Bant sırası 0…${String(ATTRIBUTE_BANDS.length - 1)} arasında bir tam sayı olmalı: ${String(index)}`,
    );
  }
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
    throw new RangeError(`Desen alfası 0…1 arasında olmalı: ${String(alpha)}`);
  }
  const geometry = ATTRIBUTE_PATTERN_GEOMETRY[index];
  if (geometry === undefined) {
    throw new RangeError(`Desen geometrisi bulunamadı: ${String(index)}`);
  }
  const ink = `rgba(${PATTERN_INK_RGB},${String(alpha)})`;
  const stripe = geometry.period / 2;
  return (
    `repeating-linear-gradient(${String(geometry.angle)}deg, ` +
    `${ink} 0, ${ink} ${String(stripe)}px, ` +
    `transparent ${String(stripe)}px, transparent ${String(geometry.period)}px)`
  );
}

/** Sekiz desen, `ATTRIBUTE_BANDS` sırasıyla — hepsi farklı (test). */
export const ATTRIBUTE_BAND_PATTERNS: readonly string[] = ATTRIBUTE_BANDS.map((_, index) =>
  attributeBandPattern(index, ATTRIBUTE_PATTERN_ALPHA),
);

/**
 * Bir bandın ön plan rengi — **hesap**, tercih değil.
 *
 * Her aday için düz bant ve çizgi bileşkesi üzerindeki oranların **düşüğü**
 * alınır; düşüğü en yüksek olan aday kazanır. Eşitlikte ilk aday.
 */
export function attributeBadgeForeground(band: AttributeBand): string {
  const composite = attributePatternComposite(band.color);
  const [first, ...rest] = ATTRIBUTE_BADGE_FOREGROUNDS;
  const floorOf = (candidate: string): number =>
    Math.min(contrastRatio(candidate, band.color), contrastRatio(candidate, composite));
  let best: { color: string; floor: number } = { color: first, floor: floorOf(first) };
  for (const candidate of rest) {
    const floor = floorOf(candidate);
    if (floor > best.floor) best = { color: candidate, floor };
  }
  return best.color;
}

/** Aralık ayracı — spec'in yazımı `13–17` (U+2013). */
const EN_DASH = String.fromCodePoint(0x2013);

/**
 * Basılacak metin — saf, JSX dışında. `15` ya da `13–17`.
 *
 * Doğrulama burada: değer 1–20 tam sayı (`bandForAttribute` fırlatır); aralık
 * uçları 1–20 tam sayı ve `min < max` (dosya başı). Sessiz kırpma yok.
 */
export function formatAttributeValue(value: number | readonly [number, number]): string {
  if (typeof value === 'number') {
    bandForAttribute(value);
    return String(value);
  }
  const [min, max] = value;
  for (const end of [min, max]) {
    if (!Number.isInteger(end) || end < ATTRIBUTE_MIN || end > ATTRIBUTE_MAX) {
      throw new RangeError(
        `Nitelik aralığının uçları ${String(ATTRIBUTE_MIN)}…${String(ATTRIBUTE_MAX)} arasında tam sayı olmalı: ${String(min)}${EN_DASH}${String(max)}`,
      );
    }
  }
  if (min >= max) {
    throw new RangeError(
      `Nitelik aralığında alt sınır üst sınırdan küçük olmalı (eşit uçlar için \`value\` verin): ${String(min)}${EN_DASH}${String(max)}`,
    );
  }
  return `${String(min)}${EN_DASH}${String(max)}`;
}

export const ATTRIBUTE_BADGE_SIZES = ['sm', 'md'] as const;

export type AttributeBadgeSize = (typeof ATTRIBUTE_BADGE_SIZES)[number];

/** Boyut → sınıflar — KALİBRASYON. Yazı boyutu `length:` etiketli (ölçüldü). */
export const ATTRIBUTE_BADGE_SIZE_CLASSES: Record<AttributeBadgeSize, string> = {
  sm: 'h-4 min-w-[var(--space-5)] px-[var(--space-1)] text-[length:var(--text-2xs)]',
  md: 'h-5 min-w-[var(--space-6)] px-[var(--space-1)] text-[length:var(--text-xs)]',
};

/**
 * Aktivasyon seçicisi — `CVD_ATTRIBUTE`ten **türetilir** (6.8'in setter'ı
 * aynı sabiti `html`e yazacak). Aşağıdaki sınıf literali ise türetilemez:
 * Tailwind kaynak taraması bir şablonu görmez. İki kaynak bir gün ayrışırsa
 * (öznitelik adı değişir, literal kalır) ilk kırılan, testteki
 * *"literal seçiciyi içeriyor"* iddiası olur — bu sabit o iddianın kökü.
 */
export const ATTRIBUTE_BADGE_CVD_SELECTOR = `[${CVD_ATTRIBUTE}]`;

/**
 * Yedekli kodlamanın sınıf literalleri — **verbatim**, şablon değil; Tailwind
 * kaynak taraması bunları olduğu gibi görmeli. Test her iki literalin
 * `ATTRIBUTE_BADGE_CVD_SELECTOR` ile başladığını iddia ediyor.
 */
export const ATTRIBUTE_BADGE_CVD_CLASSES =
  '[[data-cvd]_&]:font-bold [[data-cvd]_&]:[background-image:var(--band-pattern)]';

const BADGE_BASE =
  'inline-flex shrink-0 items-center justify-center rounded-[var(--radius-sm)] ' +
  'font-[family-name:var(--font-mono)] leading-none font-medium tabular-nums select-none ' +
  ATTRIBUTE_BADGE_CVD_CLASSES;

/** Bilinmiyor hâli yüzey token'larıyla — bant zemini yok, ön plan hex'i yok. */
const UNKNOWN_CLASSES = 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]';

/** Bilinmiyor glifi — harf değil, `t()` gerektirmez; metni `aria-label` taşır. */
const UNKNOWN_GLYPH = '?';

/** Kök `<span>`in inline stili: bant zemini + hesaplanmış ön plan + desen değişkeni. */
type AttributeBadgeStyle = CSSProperties & Record<'--band-pattern', string>;

export interface AttributeBadgeProps extends Omit<
  HTMLAttributes<HTMLSpanElement>,
  'children' | 'style'
> {
  /** Nitelik değeri, 1–20 tam sayı. `range` ile birlikte VERİLMEZ. */
  value?: number;
  /** Belirsizlik aralığı `[min, max]`, 1–20 tam sayı ve `min < max`. */
  range?: readonly [number, number];
  size?: AttributeBadgeSize;
}

interface KnownBadge {
  readonly known: true;
  readonly band: AttributeBand;
  readonly index: number;
  readonly keyName: AttributeBadgeKeyName;
  readonly text: string;
  readonly pattern: string;
}

interface UnknownBadge {
  readonly known: false;
}

/** Girdi → durum; fırlatmalar burada, JSX'te değil. */
function resolveBadge(
  value: number | undefined,
  range: readonly [number, number] | undefined,
): KnownBadge | UnknownBadge {
  if (value !== undefined && range !== undefined) {
    throw new RangeError(
      `Nitelik rozeti \`value\` ve \`range\`i birlikte alamaz: ${String(value)} / ${String(range[0])}${EN_DASH}${String(range[1])}`,
    );
  }

  let band: AttributeBand;
  let text: string;
  if (value !== undefined) {
    text = formatAttributeValue(value);
    band = bandForAttribute(value);
  } else if (range !== undefined) {
    text = formatAttributeValue(range);
    band = bandForAttributeRange(range[0], range[1]);
  } else {
    return { known: false };
  }

  const index = ATTRIBUTE_BANDS.findIndex((b) => b === band);
  const keyName = ATTRIBUTE_BAND_KEY_ORDER[index];
  const pattern = ATTRIBUTE_BAND_PATTERNS[index];
  if (index < 0 || keyName === undefined || pattern === undefined) {
    // Kapsayıcılık testleri bu dalı erişilemez kılıyor; sessiz bir yedek
    // ('none') yerine gürültü.
    throw new RangeError(`Bant sırası bulunamadı: ${band.color}`);
  }
  return { known: true, band, index, keyName, text, pattern };
}

export function AttributeBadge({
  value,
  range,
  size = 'md',
  className,
  ...rest
}: AttributeBadgeProps): ReactElement {
  const { t } = useTranslation();
  const badge = resolveBadge(value, range);

  if (!badge.known) {
    const style: AttributeBadgeStyle = { '--band-pattern': 'none' };
    return (
      <span
        aria-label={t(ATTRIBUTE_BADGE_KEYS.unknown)}
        className={cn(BADGE_BASE, ATTRIBUTE_BADGE_SIZE_CLASSES[size], UNKNOWN_CLASSES, className)}
        style={style}
        {...rest}
      >
        {UNKNOWN_GLYPH}
      </span>
    );
  }

  const style: AttributeBadgeStyle = {
    backgroundColor: badge.band.color,
    color: attributeBadgeForeground(badge.band),
    '--band-pattern': badge.pattern,
  };

  return (
    <span
      aria-label={t(ATTRIBUTE_BADGE_KEYS.label, {
        value: badge.text,
        band: t(ATTRIBUTE_BADGE_KEYS[badge.keyName]),
      })}
      data-band-index={String(badge.index)}
      className={cn(BADGE_BASE, ATTRIBUTE_BADGE_SIZE_CLASSES[size], className)}
      style={style}
      {...rest}
    >
      {badge.text}
    </span>
  );
}
