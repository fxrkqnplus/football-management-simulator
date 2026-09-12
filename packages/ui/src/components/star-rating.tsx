/**
 * StarRating — yetenek/potansiyel yıldız derecesi, beş yıldız üzerinden yarım
 * adımlarla. Radix ilkeli **yok**; kök `<span role="img">` + beş inline SVG
 * (sözleşme 6.6 §1.2; kaynak `docs/spec/04-ai-scoring.md` §6.2).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ÖLÇEK SPEC'TEN: `stars = clamp(0.5, 5, round(x×10)/2)` → `max` PROP'U YOK
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Formülün görüntü kümesi `{0,5; 1; …; 5}` — `STAR_MAX = 5`, `STAR_STEP = 0,5`
 * buradan **dışa aktarılıyor**, prop olarak alınmıyor (K-1: bir `max` prop'u
 * spec'in kapattığı bir şeyi yeniden açardı). `0` görüntü kümesinde **yok**:
 * `0` verilirse bu bir gösterim değil bir hesap hatasıdır → `RangeError`
 * (`bandForAttribute` emsali, sessiz kırpma yok). Çeyrek (`2,25`) ve aralık
 * dışı (`5,5`) aynı şekilde reddedilir. **Yuvarlama burada yapılmaz** — o
 * motorun işi (spec formülü); bileşen yuvarlanmış değeri gösterir.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * GİRDİ: `value` YA DA `range`, İKİSİ DEĞİL; İKİSİ DE YOKSA BİLİNMİYOR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * AttributeBadge §1.1 ile aynı üçlü: · ikisi birden → `RangeError` · ikisi de
 * yok → `?` glifi, `aria-label` = t(unknown), yıldız yok, `data-value` yok ·
 * `range: [min, max]` → ikisi de geçerli adım ve `min < max` (eşit uçlar bir
 * değerdir, çağıran `value` verir).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * DÖRT DURUM — ve yarım potansiyelin OLMAMASI bir KALİBRASYON
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `starStates()` beş yıldızın her birine tek durum verir: `full` · `half` ·
 * `empty` · `potential`. Öncelik **full > half > potential > empty** — bilinen
 * (min) her zaman potansiyelin (max) önünde. Sözleşme dört durum sayıyor;
 * *"yarım potansiyel"* yok. Sonuç: `max`ın yarım dokunduğu yıldız **tam**
 * kontur alır (`[2; 3,5]` → 4. yıldız `potential`), `min`in yarım doldurduğu
 * yıldızın boş yarısı kontur **almaz** (`[2,5; 4]` → 3. yıldız `half`).
 * Kesin uçlar `aria-label`da (`2,5–4 / 5 yıldız`); kontur yalnızca *"buraya
 * kadar uzanabilir"* der. Bu bir kalibrasyon, spec'ten gelmiyor; test iki
 * örneği de birebir iddia ediyor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * GEOMETRİ SAF FONKSİYONDAN — `clipPath`/`id` YOK
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Yıldız `starVertices()`ten türeyen on köşeli bir `<polygon>`; yarım yıldız
 * aynı listenin simetri ekseninin **solunda** kalan altı köşesi (tepe ve alt
 * iç köşe eksen üstünde) — ikinci bir çokgen, kırpma yok. Böylece bir
 * sayfada yüz yıldız çizilirken `id` çakışması ve `useId` gereksinimi
 * doğmuyor. Koordinatlar elle yazılmadı; test on köşeyi, viewBox içinde
 * kalışı ve `x` aynasını iddia ediyor.
 *
 * Renkler SVG sunum nitelikleriyle `var(--…)`: dolu `--warning`, boş
 * `--border-strong`, potansiyel kontur `--accent`. Tailwind `fill-[var(…)]`
 * sınıfı yerine nitelik seçildi — `currency-value.tsx`in ölçümü etiketsiz
 * `var()` taşıyan keyfi sınıfların derlenmediğini gösterdi; nitelik motora
 * uğramıyor ve testte `getAttribute('fill')` ile doğrudan okunuyor.
 *
 * **`data-value`** makine yüzü: `2.5` ya da `2.5–4` (JS sayı yazımı, U+2013).
 * `aria-label` insan yüzü: `formatNumber` (`@fms/shared`, `2,5`).
 *
 * **TAKLİT ETMEDİĞİ:** yuvarlama (motor, spec §6.2) · etkileşimli
 * derecelendirme (bu bir gösterim) · potansiyelin veri kaynağı ve belirsizlik
 * aralığının genişliği (Faz 31) · yıldızın ekranda göründüğü — jsdom SVG'yi
 * ölçmez, `getComputedStyle` `var()` çözmez (6.0); görsel doğrulama **Faz 17**
 * (G-02) / **Faz 49** (G-05).
 */
import { formatNumber } from '@fms/shared';
import type { HTMLAttributes, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '../lib/cn.js';

/** `common:ui.starRating.*` — düz nesne, modül başına TEK `*_KEYS`. */
export const STAR_RATING_KEYS = {
  aria: 'common:ui.starRating.aria',
  unknown: 'common:ui.starRating.unknown',
} as const;

/** spec/04 §6.2: `clamp(0.5, 5, …)` — üst sınır. */
export const STAR_MAX = 5;
/** spec/04 §6.2: `round(x×10)/2` — adım. Alt sınır da bu (0 görüntü kümesinde yok). */
export const STAR_STEP = 0.5;

export const STAR_STATES = ['full', 'half', 'empty', 'potential'] as const;

export type StarState = (typeof STAR_STATES)[number];

/** Aralık ayracı — AttributeBadge ile aynı yazım (U+2013). */
const EN_DASH = String.fromCodePoint(0x2013);

/** Değer formülün görüntü kümesinde mi: `{0,5; 1; …; 5}`. Saf. */
export function isStarValue(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= STAR_STEP &&
    value <= STAR_MAX &&
    Number.isInteger(value / STAR_STEP)
  );
}

function assertStarValue(value: number, what: string): void {
  if (!isStarValue(value)) {
    throw new RangeError(
      `${what} ${String(STAR_STEP)}…${String(STAR_MAX)} arasında ${String(STAR_STEP)} adımlı bir değer olmalı: ${String(value)}`,
    );
  }
}

/** Aralık uçlarını doğrular: ikisi de geçerli adım ve `min < max`. Saf. */
function assertStarRange(range: readonly [number, number]): void {
  const [min, max] = range;
  assertStarValue(min, 'Yıldız aralığının alt sınırı');
  assertStarValue(max, 'Yıldız aralığının üst sınırı');
  if (min >= max) {
    throw new RangeError(
      `Yıldız aralığında alt sınır üst sınırdan küçük olmalı (eşit uçlar için \`value\` verin): ${String(min)}${EN_DASH}${String(max)}`,
    );
  }
}

/** Tek bir yıldızın (1 tabanlı sıra) bir değere göre doluluğu. */
function fillState(value: number, star: number): 'full' | 'half' | 'empty' {
  if (value >= star) return 'full';
  if (value >= star - STAR_STEP) return 'half';
  return 'empty';
}

/**
 * Beş yıldızın durumu — saf, JSX dışında.
 *
 * `value` için `full`/`half`/`empty`; `[min, max]` için `min`in doldurmadığı
 * ama `max`ın dokunduğu yıldızlar `potential` (öncelik dosya başında).
 * Uzunluk daima `STAR_MAX`. Geçersiz girdi → `RangeError`.
 */
export function starStates(input: number | readonly [number, number]): readonly StarState[] {
  const states: StarState[] = [];
  if (typeof input === 'number') {
    assertStarValue(input, 'Yıldız değeri');
    for (let star = 1; star <= STAR_MAX; star += 1) states.push(fillState(input, star));
    return states;
  }
  assertStarRange(input);
  const [min, max] = input;
  for (let star = 1; star <= STAR_MAX; star += 1) {
    const known = fillState(min, star);
    if (known !== 'empty') states.push(known);
    else states.push(fillState(max, star) === 'empty' ? 'empty' : 'potential');
  }
  return states;
}

/** `aria-label` metni — Türkçe sayı yazımı (`2,5`), aralıkta U+2013. Saf. */
export function formatStarValue(input: number | readonly [number, number]): string {
  if (typeof input === 'number') {
    assertStarValue(input, 'Yıldız değeri');
    return formatNumber(input);
  }
  assertStarRange(input);
  return `${formatNumber(input[0])}${EN_DASH}${formatNumber(input[1])}`;
}

/** `data-value` metni — JS sayı yazımı (`2.5`), aralıkta U+2013. Saf. */
export function starDataValue(input: number | readonly [number, number]): string {
  if (typeof input === 'number') {
    assertStarValue(input, 'Yıldız değeri');
    return String(input);
  }
  assertStarRange(input);
  return `${String(input[0])}${EN_DASH}${String(input[1])}`;
}

// ─── Geometri ────────────────────────────────────────────────────────────────

export const STAR_VIEWBOX = 24;
export const STAR_CENTER = STAR_VIEWBOX / 2;
/** KALİBRASYON: dış/iç yarıçap oranı ≈ 0,41 — klasik beş köşeli yıldız. */
export const STAR_OUTER_RADIUS = 11;
export const STAR_INNER_RADIUS = 4.5;
const STAR_POINT_COUNT = 5;

export interface StarVertex {
  readonly x: number;
  readonly y: number;
}

const round3 = (value: number): number => Math.round(value * 1000) / 1000;

/**
 * On köşe, tepe noktasından saat yönünde, dış/iç yarıçap dönüşümlü. Saf.
 * Tepe (`k = 0`) ve alt iç köşe (`k = 5`) simetri ekseni `x = STAR_CENTER`
 * üstünde — yarım yıldız bu ikisi arasında kesiliyor.
 */
export function starVertices(): readonly StarVertex[] {
  const vertices: StarVertex[] = [];
  for (let k = 0; k < STAR_POINT_COUNT * 2; k += 1) {
    const radius = k % 2 === 0 ? STAR_OUTER_RADIUS : STAR_INNER_RADIUS;
    const angle = -Math.PI / 2 + (k * Math.PI) / STAR_POINT_COUNT;
    vertices.push({
      x: round3(STAR_CENTER + radius * Math.cos(angle)),
      y: round3(STAR_CENTER + radius * Math.sin(angle)),
    });
  }
  return vertices;
}

const toPoints = (vertices: readonly StarVertex[]): string =>
  vertices.map((v) => `${String(v.x)},${String(v.y)}`).join(' ');

export const STAR_VERTICES = starVertices();
/** Eksenin solunda kalan köşeler — sıra korunuyor, sınır çokgeni tam. */
export const STAR_HALF_VERTICES = STAR_VERTICES.filter((v) => v.x <= STAR_CENTER);
export const STAR_POINTS = toPoints(STAR_VERTICES);
export const STAR_HALF_POINTS = toPoints(STAR_HALF_VERTICES);

/** Renkler — token, istisna yok. */
export const STAR_FILL_FULL = 'var(--warning)';
export const STAR_FILL_EMPTY = 'var(--border-strong)';
export const STAR_STROKE_POTENTIAL = 'var(--accent)';
const POTENTIAL_STROKE_WIDTH = 1.5;

const ROOT_BASE = 'inline-flex shrink-0 items-center gap-[var(--space-1)] align-middle';
const STAR_CLASS = 'h-4 w-4 shrink-0';
/** Bilinmiyor glifi — harf değil, `t()` gerektirmez; metni `aria-label` taşır. */
const UNKNOWN_GLYPH = '?';
const UNKNOWN_CLASSES =
  'font-[family-name:var(--font-ui)] text-[length:var(--text-sm)] leading-none text-[var(--text-secondary)] select-none';

function Star({ state }: { readonly state: StarState }): ReactElement {
  return (
    <svg
      aria-hidden="true"
      data-star-state={state}
      viewBox={`0 0 ${String(STAR_VIEWBOX)} ${String(STAR_VIEWBOX)}`}
      className={STAR_CLASS}
    >
      {state === 'potential' ? (
        <polygon
          points={STAR_POINTS}
          fill="none"
          stroke={STAR_STROKE_POTENTIAL}
          strokeWidth={POTENTIAL_STROKE_WIDTH}
          strokeLinejoin="round"
        />
      ) : (
        <polygon points={STAR_POINTS} fill={state === 'full' ? STAR_FILL_FULL : STAR_FILL_EMPTY} />
      )}
      {state === 'half' ? <polygon points={STAR_HALF_POINTS} fill={STAR_FILL_FULL} /> : null}
    </svg>
  );
}

export interface StarRatingProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** `{0,5; 1; …; 5}` — spec/04 §6.2'nin görüntü kümesi. `range` ile birlikte VERİLMEZ. */
  value?: number;
  /** Belirsizlik aralığı `[min, max]`; ikisi de geçerli adım ve `min < max`. */
  range?: readonly [number, number];
}

/** Girdi → durum listesi ya da bilinmiyor; fırlatmalar burada, JSX'te değil. */
function resolveInput(
  value: number | undefined,
  range: readonly [number, number] | undefined,
): number | readonly [number, number] | undefined {
  if (value !== undefined && range !== undefined) {
    throw new RangeError(
      `Yıldız derecesi \`value\` ve \`range\`i birlikte alamaz: ${String(value)} / ${String(range[0])}${EN_DASH}${String(range[1])}`,
    );
  }
  return value ?? range;
}

export function StarRating({ value, range, className, ...rest }: StarRatingProps): ReactElement {
  const { t } = useTranslation();
  const input = resolveInput(value, range);

  if (input === undefined) {
    return (
      <span
        role="img"
        aria-label={t(STAR_RATING_KEYS.unknown)}
        className={cn(ROOT_BASE, UNKNOWN_CLASSES, className)}
        {...rest}
      >
        {UNKNOWN_GLYPH}
      </span>
    );
  }

  const states = starStates(input);
  return (
    <span
      role="img"
      aria-label={t(STAR_RATING_KEYS.aria, { value: formatStarValue(input), max: STAR_MAX })}
      data-value={starDataValue(input)}
      className={cn(ROOT_BASE, className)}
      {...rest}
    >
      {states.map((state, index) => (
        // Konum sabit (beş yıldız, sıra anlamlı, yeniden sıralanmıyor) — sıra anahtar olarak yeterli.
        <Star key={index} state={state} />
      ))}
    </span>
  );
}
