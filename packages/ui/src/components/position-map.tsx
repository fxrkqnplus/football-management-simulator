/**
 * PositionMap — bir oyuncunun **mevki yetkinlik haritası**: dikey bir saha
 * üzerinde on iki mevki işareti, verilenler yetkinlik derecesine göre
 * biçimlenmiş (sözleşme 6.6 §1.8). Radix ilkeli **yok**, tek bir
 * `<svg role="img">`.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ İKİ KAPALI KÜME BURADA **KOPYA** — ve kopyanın kendi nöbetçisi var
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `POSITION_CODES` ↔ `players.ts` `PLAYER_POSITIONS` ve `POSITION_LEVELS` ↔
 * `player-positions.ts` `POSITION_LEVELS` (`packages/db`). `packages/ui` db'yi
 * import **edemez** (§2.4); aynı küme iki pakette iki kopya olarak duruyor ve
 * DZ-07 gereği kopyanın kapısı var: `scripts/inventory-guards.test.mjs` ④ iki
 * dosyanın METNİNİ düzenli ifadeyle okuyup **sıra dahil** birebir eşitliği
 * iddia ediyor. Bu yüzden iki sabit tam olarak `export const AD = [ … ] as
 * const;` biçiminde ve köşeli parantezin içinde yorum/başka literal **yok** —
 * çıkarıcı köşeli parantez içindeki her tırnaklı dizeyi üye sayar.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * SAHA: ORAN SPEC'TEN, YÖNELİM KARAR, ÖLÇEK "1 BİRİM = 1 METRE"
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/05` §7.6 sahayı **105×68 m** (yatay, viewBox 1050×680) veriyor — o
 * 2D maç sunumunun sahası (Faz 27). Spec bir PositionMap **tanımlamıyor**;
 * buradaki oran §7.6'dan, **yönelim bir karar**: viewBox `0 0 68 105`,
 * **dikey**, oyuncunun kendi kalesi **altta**. Gerekçe: bir oyuncu kartında
 * harita dar bir sütuna girer ve dikey oran (≈ 2:3) ona oturur; FM'in mevki
 * grafiği de dikeydir ve kullanıcının zihnindeki şablon bu. Kale altta, çünkü
 * *"savunma aşağıda, hücum yukarıda"* sıralaması `PLAYER_POSITIONS`ın kendi
 * sırasıyla (kaleci → savunma → orta saha → hücum) aynı yöne akıyor.
 *
 * Ölçek 1 birim = 1 m: orta yuvarlak `r = 9.15`, ceza sahası `40.32 × 16.5` —
 * sayılar uydurma değil, FIFA ölçüleri; viewBox'ın 68×105 olmasının yan
 * ürünü. Dış çizgi kenardan **0,5 birim içeride** (`PITCH_STROKE / 2`): çizgi
 * kalınlığı 1 ve yolun tam kenarda olması çizginin yarısını viewBox dışına
 * kırpardı. Ceza sahaları kale çizgisinden (0,5 / 104,5) ölçülüyor.
 *
 * **Koordinatlar KALİBRASYON** (`POSITION_COORDINATES`): dört hat — kaleci 97,
 * savunma 80, defansif orta 64, orta 50, ofansif orta 34, forvet 16 (y, kale
 * altta) — ve üç kolon: sol 10, merkez 34, sağ 58 (x). Sol/sağ merkeze göre
 * **ayna** (`x_L + x_R = 68`), hepsi işaret yarıçapıyla birlikte viewBox
 * içinde, hepsi farklı — test bunları iddia ediyor. *Sol* oyuncunun kendi
 * solu, yani bakan kişinin **solu** (kale altta olduğu için ikisi çakışıyor;
 * yatay sahada çakışmazdı, yönelim kararının bir yan faydası).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * İŞARET İÇİNDE İNGİLİZCE KOD — K-8, ve bu bir K5 ihlali DEĞİL
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `GK` · `AMC` · `ST` bir **kimlik**, metin değil: `spec/02` §4.2 örneği
 * *"GK (Kaleci)"* — kod önde, Türkçe karşılık parantezde. Kodu çevirmek FM
 * kullanıcısının bildiği sözlüğü bozar ve Türkçe kısaltma (`KL`, `SO`, `FV`)
 * hiçbir spec'te yok — uydurmak K12. `{code}` bir ifade, JSX'e literal
 * girmiyor; Türkçe ad `<title>` (tarayıcı ipucu) ve `aria-label` üzerinden
 * `t()` ile geliyor: *"Kaleci: Doğal"*.
 *
 * `aria-label` = t(aria, { entries }) — *"Mevki haritası: Kaleci: Doğal,
 * Stoper: Yetkin"*. Girdiler `t(entry, …)` ile tek tek üretilip
 * `positionEntriesText` ile birleştiriliyor ve **enterpolasyonla** giriyor;
 * `', '` ayracı JSX'e literal girmiyor. Boş liste → t(empty). Kök daima
 * `POSITION_MAP_KEYS` (`i18n:check` yalnızca onu çözüyor); mevki ve seviye
 * anahtarları `POSITION_KEY_NAMES` / `POSITION_LEVEL_KEY_NAMES` ad
 * listelerinden, adları bilerek `_KEYS` ile BİTMİYOR.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * BEŞ SEVİYE + "VERİLMEDİ" — ALTI BİÇİM, HEPSİ FARKLI, HEPSİ TOKEN
 * ────────────────────────────────────────────────────────────────────────────
 *
 * natural dolu `--accent` · accomplished dolu %70 (`fill-opacity`) ·
 * competent kontur (`--accent`) · awkward **kesikli** kontur · ineffectual
 * soluk (`--text-muted`, opaklık 0,6) · verilmeyen soluk boş (`--border-strong`,
 * opaklık 0,45). Renk tek kanal değil: dolgu · kontur · kesiklik · opaklık
 * birlikte ayırıyor (test altı demetin altısının farklı olduğunu iddia
 * ediyor). Sabit hex yok; `fill-[var(--…)]` / `stroke-[var(--…)]` Tailwind 4
 * 4.3.3'te `fill: var(--…)` / `stroke: var(--…)` (renk; genişlik değil)
 * üretiyor — bu alt görevde `@tailwindcss/node compile` ile **ölçüldü**.
 * SVG metni `color` değil `fill` ile boyanır; bu yüzden kod metni de
 * `fill-[var(--…)]` taşıyor, `text-[var(--…)]` değil (tailwind-merge'de
 * `text-[var(--…)]` renk ve boyutu aynı gruba düşürüyor, ölçüldü).
 *
 * ⚠️ Yazı tipi sınıfı **etiketli**: `font-[family-name:var(--font-ui)]` —
 * etiketsiz biçim Tailwind 4'te `font-weight`e derleniyor ve tailwind-merge'de
 * `font-semibold` tarafından siliniyor (`CurrencyValue` ölçümü).
 *
 * ⚠️ Geçersiz girdi SESSİZCE KIRPILMAZ: küme dışı kod ya da seviye, aynı
 * mevkinin tekrarı → `RangeError`, Türkçe mesaj. `positions` API'den gelir ve
 * dize tip taşımaz; denetim çalışma zamanında (`positionMapEntries`).
 *
 * **Boyutlar KALİBRASYON:** `sm` 68 px genişlik (`w-17`, 1 px = 1 m), `md`
 * 136 px (`w-34`, 2 px = 1 m); yükseklik viewBox oranından (`h-auto`).
 *
 * TAKLİT ETMEDİĞİ: geometri/ölçek (jsdom 0×0 — Faz 17, G-02) · görsel
 * doğrulama ve %70 dolgu üstündeki kod metninin kontrastı (Faz 49, G-05) ·
 * etkileşim — tıklayıp mevki değiştirme, taktik ekranı (Faz 20) · oyuncu
 * hareketi ve maç sahası (Faz 27; ortak koordinat kaynağı V2 adayı) ·
 * yetkinlik **hesabı** ve mevki eğitimi (Faz 10/30+, motor) · `PositionLevel`
 * Türkçe karşılıkları (sözlük §7.2 ve `common.json`, K-4).
 */
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '../lib/cn.js';

/**
 * `common:ui.positionMap.*` — bu modülün TEK `*_KEYS` dışa aktarımı
 * (`i18n-keys.test.ts` ②: ikincisi kayıt defterini ezerdi). Mevki kodları
 * küçük harf (segment kuralı `/^[a-z][a-zA-Z0-9]*$/`).
 */
export const POSITION_MAP_KEYS = {
  positionGk: 'common:ui.positionMap.position.gk',
  positionDc: 'common:ui.positionMap.position.dc',
  positionDl: 'common:ui.positionMap.position.dl',
  positionDr: 'common:ui.positionMap.position.dr',
  positionDm: 'common:ui.positionMap.position.dm',
  positionMc: 'common:ui.positionMap.position.mc',
  positionMl: 'common:ui.positionMap.position.ml',
  positionMr: 'common:ui.positionMap.position.mr',
  positionAmc: 'common:ui.positionMap.position.amc',
  positionAml: 'common:ui.positionMap.position.aml',
  positionAmr: 'common:ui.positionMap.position.amr',
  positionSt: 'common:ui.positionMap.position.st',
  levelNatural: 'common:ui.positionMap.level.natural',
  levelAccomplished: 'common:ui.positionMap.level.accomplished',
  levelCompetent: 'common:ui.positionMap.level.competent',
  levelAwkward: 'common:ui.positionMap.level.awkward',
  levelIneffectual: 'common:ui.positionMap.level.ineffectual',
  aria: 'common:ui.positionMap.aria',
  entry: 'common:ui.positionMap.entry',
  empty: 'common:ui.positionMap.empty',
} as const;

export type PositionMapKeyName = keyof typeof POSITION_MAP_KEYS;

/**
 * Mevki kodları — `packages/db/src/schema/players.ts` `PLAYER_POSITIONS` ile
 * **birebir, sıra dahil** (`inventory-guards` ④; kaynağı `spec/01` §3.1).
 * Köşeli parantez içi temiz kalır (dosya başına bak).
 */
export const POSITION_CODES = [
  'GK',
  'DC',
  'DL',
  'DR',
  'DM',
  'MC',
  'ML',
  'MR',
  'AMC',
  'AML',
  'AMR',
  'ST',
] as const;

export type PositionCode = (typeof POSITION_CODES)[number];

/**
 * Yetkinlik dereceleri — `packages/db/src/schema/player-positions.ts`
 * `POSITION_LEVELS` ile **birebir, sıra dahil** (`inventory-guards` ④).
 */
export const POSITION_LEVELS = [
  'natural',
  'accomplished',
  'competent',
  'awkward',
  'ineffectual',
] as const;

export type PositionLevel = (typeof POSITION_LEVELS)[number];

/**
 * Mevki → anahtar ADI. `t()`nin kökü daima `POSITION_MAP_KEYS`in kendisi:
 * `t(POSITION_MAP_KEYS[POSITION_KEY_NAMES[code]])`.
 */
export const POSITION_KEY_NAMES = {
  GK: 'positionGk',
  DC: 'positionDc',
  DL: 'positionDl',
  DR: 'positionDr',
  DM: 'positionDm',
  MC: 'positionMc',
  ML: 'positionMl',
  MR: 'positionMr',
  AMC: 'positionAmc',
  AML: 'positionAml',
  AMR: 'positionAmr',
  ST: 'positionSt',
} as const satisfies Record<PositionCode, PositionMapKeyName>;

/** Seviye → anahtar ADI; kök yine `POSITION_MAP_KEYS`. */
export const POSITION_LEVEL_KEY_NAMES = {
  natural: 'levelNatural',
  accomplished: 'levelAccomplished',
  competent: 'levelCompetent',
  awkward: 'levelAwkward',
  ineffectual: 'levelIneffectual',
} as const satisfies Record<PositionLevel, PositionMapKeyName>;

/** viewBox `0 0 68 105` — oran `spec/05` §7.6 (105×68), dikey, kale altta. */
export const POSITION_MAP_VIEWBOX = { width: 68, height: 105 } as const;

/** Saha çizgisi kalınlığı (birim); dış çizgi bunun yarısı kadar içeride. */
export const PITCH_STROKE = 1;

const PITCH_INSET = PITCH_STROKE / 2;

/** FIFA ölçüleri, 1 birim = 1 m. */
const PENALTY_AREA = { width: 40.32, depth: 16.5 } as const;
const CENTRE_CIRCLE_RADIUS = 9.15;

export interface PitchRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Saha çizimi — dış çizgi, orta çizgi, orta yuvarlak, iki ceza sahası. */
export const PITCH_GEOMETRY = {
  outline: {
    x: PITCH_INSET,
    y: PITCH_INSET,
    width: POSITION_MAP_VIEWBOX.width - PITCH_STROKE,
    height: POSITION_MAP_VIEWBOX.height - PITCH_STROKE,
  },
  halfway: {
    x1: PITCH_INSET,
    x2: POSITION_MAP_VIEWBOX.width - PITCH_INSET,
    y: POSITION_MAP_VIEWBOX.height / 2,
  },
  centreCircle: {
    cx: POSITION_MAP_VIEWBOX.width / 2,
    cy: POSITION_MAP_VIEWBOX.height / 2,
    r: CENTRE_CIRCLE_RADIUS,
  },
  penaltyAreas: [
    {
      x: (POSITION_MAP_VIEWBOX.width - PENALTY_AREA.width) / 2,
      y: PITCH_INSET,
      width: PENALTY_AREA.width,
      height: PENALTY_AREA.depth,
    },
    {
      x: (POSITION_MAP_VIEWBOX.width - PENALTY_AREA.width) / 2,
      y: POSITION_MAP_VIEWBOX.height - PITCH_INSET - PENALTY_AREA.depth,
      width: PENALTY_AREA.width,
      height: PENALTY_AREA.depth,
    },
  ],
} as const satisfies {
  outline: PitchRect;
  halfway: { x1: number; x2: number; y: number };
  centreCircle: { cx: number; cy: number; r: number };
  penaltyAreas: readonly [PitchRect, PitchRect];
};

/** İşaret dairesinin yarıçapı (birim) ve içindeki kodun yazı boyu (birim). */
export const POSITION_MARKER_RADIUS = 5.5;
export const POSITION_MARKER_FONT_SIZE = 4;

export interface PitchPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Mevki → işaret merkezi — KALİBRASYON (dosya başına bak). Kale altta:
 * `y` büyüdükçe kendi kalesine yaklaşır.
 */
export const POSITION_COORDINATES: Record<PositionCode, PitchPoint> = {
  GK: { x: 34, y: 97 },
  DL: { x: 10, y: 80 },
  DC: { x: 34, y: 80 },
  DR: { x: 58, y: 80 },
  DM: { x: 34, y: 64 },
  ML: { x: 10, y: 50 },
  MC: { x: 34, y: 50 },
  MR: { x: 58, y: 50 },
  AML: { x: 10, y: 34 },
  AMC: { x: 34, y: 34 },
  AMR: { x: 58, y: 34 },
  ST: { x: 34, y: 16 },
};

export interface PositionMarkerStyle {
  /** Daire: dolgu + kontur sınıfları (`fill-[var(--…)]` · `stroke-[var(--…)]`). */
  readonly circleClass: string;
  /** Kod metni: SVG metni `fill` ile boyanır. */
  readonly textClass: string;
  readonly fillOpacity: number;
  readonly opacity: number;
  /** Kesikli kontur — yalnızca `awkward`. */
  readonly strokeDasharray?: string;
}

const ACCENT_FILLED = 'fill-[var(--accent)] stroke-[var(--accent)]';
const ACCENT_OUTLINED = 'fill-[var(--bg-elevated)] stroke-[var(--accent)]';

/** Seviye → işaret biçimi (dosya başındaki tablo). */
export const POSITION_LEVEL_MARKERS: Record<PositionLevel, PositionMarkerStyle> = {
  natural: {
    circleClass: ACCENT_FILLED,
    textClass: 'fill-[var(--text-inverse)]',
    fillOpacity: 1,
    opacity: 1,
  },
  accomplished: {
    circleClass: ACCENT_FILLED,
    textClass: 'fill-[var(--text-inverse)]',
    fillOpacity: 0.7,
    opacity: 1,
  },
  competent: {
    circleClass: ACCENT_OUTLINED,
    textClass: 'fill-[var(--text-primary)]',
    fillOpacity: 1,
    opacity: 1,
  },
  awkward: {
    circleClass: ACCENT_OUTLINED,
    textClass: 'fill-[var(--text-primary)]',
    fillOpacity: 1,
    opacity: 1,
    strokeDasharray: '2 1.5',
  },
  ineffectual: {
    circleClass: 'fill-[var(--bg-elevated)] stroke-[var(--text-muted)]',
    textClass: 'fill-[var(--text-muted)]',
    fillOpacity: 1,
    opacity: 0.6,
  },
};

/** Verilmeyen mevki — soluk, boş. */
export const POSITION_UNSET_MARKER: PositionMarkerStyle = {
  circleClass: 'fill-[var(--bg-elevated)] stroke-[var(--border-strong)]',
  textClass: 'fill-[var(--text-muted)]',
  fillOpacity: 1,
  opacity: 0.45,
};

/** Saha zemini ve çizgileri — token'dan. */
export const PITCH_SURFACE_CLASS = 'fill-[var(--bg-elevated)]';
export const PITCH_LINE_CLASS = 'fill-none stroke-[var(--border-strong)]';

export const POSITION_MAP_SIZES = ['sm', 'md'] as const;

export type PositionMapSize = (typeof POSITION_MAP_SIZES)[number];

/** Genişlik; yükseklik viewBox oranından. `w-17` = 68 px (1 px = 1 m). */
export const POSITION_MAP_SIZE_CLASSES: Record<PositionMapSize, string> = {
  sm: 'w-17 h-auto',
  md: 'w-34 h-auto',
};

const ROOT_BASE = 'block shrink-0 font-[family-name:var(--font-ui)] font-semibold';

/** `aria-label`daki girdilerin ayracı — JSX'e literal girmez, enterpolasyonla gider. */
export const POSITION_ENTRY_SEPARATOR = ', ';

/** Çalışma zamanı kümesi denetimleri — API'den gelen dize tip taşımaz. */
export const isPositionCode = (value: string): value is PositionCode =>
  POSITION_CODES.some((code) => code === value);

export const isPositionLevel = (value: string): value is PositionLevel =>
  POSITION_LEVELS.some((level) => level === value);

export interface PositionEntry {
  readonly position: PositionCode;
  readonly level: PositionLevel;
}

/**
 * Girdi listesini doğrular. Saf — JSX dışında, ayrı test ediliyor.
 *
 * ⚠️ Kırpma yok: küme dışı kod, küme dışı seviye ya da aynı mevkinin
 * tekrarı → `RangeError`. Sıra korunur.
 */
export function positionMapEntries(
  positions: readonly { readonly position: string; readonly level: string }[],
): readonly PositionEntry[] {
  const seen = new Set<PositionCode>();
  const entries: PositionEntry[] = [];
  for (const { position, level } of positions) {
    if (!isPositionCode(position)) {
      throw new RangeError(
        `Bilinmeyen mevki kodu: ${position} (geçerli değerler: ${POSITION_CODES.join(', ')})`,
      );
    }
    if (!isPositionLevel(level)) {
      throw new RangeError(
        `Bilinmeyen mevki yetkinliği: ${level} (geçerli değerler: ${POSITION_LEVELS.join(', ')})`,
      );
    }
    if (seen.has(position)) {
      throw new RangeError(`Aynı mevki birden çok kez verildi: ${position}`);
    }
    seen.add(position);
    entries.push({ position, level });
  }
  return entries;
}

/** Girdi metinlerini `aria-label` için birleştirir. Saf. */
export function positionEntriesText(labels: readonly string[]): string {
  return labels.join(POSITION_ENTRY_SEPARATOR);
}

export interface PositionMapProps {
  /** Oyuncunun mevki yetkinlikleri (`player_positions`); her mevki en fazla bir kez. */
  positions: readonly PositionEntry[];
  size?: PositionMapSize;
  className?: string;
}

export function PositionMap({ positions, size = 'md', className }: PositionMapProps): ReactElement {
  const { t } = useTranslation();
  const entries = positionMapEntries(positions);
  const levelOf = new Map<PositionCode, PositionLevel>(
    entries.map((entry) => [entry.position, entry.level]),
  );
  const entryLabel = (entry: PositionEntry): string =>
    t(POSITION_MAP_KEYS.entry, {
      position: t(POSITION_MAP_KEYS[POSITION_KEY_NAMES[entry.position]]),
      level: t(POSITION_MAP_KEYS[POSITION_LEVEL_KEY_NAMES[entry.level]]),
    });
  const label =
    entries.length === 0
      ? t(POSITION_MAP_KEYS.empty)
      : t(POSITION_MAP_KEYS.aria, { entries: positionEntriesText(entries.map(entryLabel)) });
  const { outline, halfway, centreCircle, penaltyAreas } = PITCH_GEOMETRY;

  return (
    <svg
      role="img"
      aria-label={label}
      data-count={entries.length}
      viewBox={`0 0 ${String(POSITION_MAP_VIEWBOX.width)} ${String(POSITION_MAP_VIEWBOX.height)}`}
      className={cn(ROOT_BASE, POSITION_MAP_SIZE_CLASSES[size], className)}
    >
      <rect
        data-pitch="surface"
        x={0}
        y={0}
        width={POSITION_MAP_VIEWBOX.width}
        height={POSITION_MAP_VIEWBOX.height}
        className={PITCH_SURFACE_CLASS}
      />
      <g data-pitch="lines" strokeWidth={PITCH_STROKE} className={PITCH_LINE_CLASS}>
        <rect
          data-pitch="outline"
          x={outline.x}
          y={outline.y}
          width={outline.width}
          height={outline.height}
        />
        <line data-pitch="halfway" x1={halfway.x1} y1={halfway.y} x2={halfway.x2} y2={halfway.y} />
        <circle
          data-pitch="centre-circle"
          cx={centreCircle.cx}
          cy={centreCircle.cy}
          r={centreCircle.r}
        />
        {penaltyAreas.map((area) => (
          <rect
            key={area.y}
            data-pitch="penalty-area"
            x={area.x}
            y={area.y}
            width={area.width}
            height={area.height}
          />
        ))}
      </g>
      {POSITION_CODES.map((code) => {
        const level = levelOf.get(code);
        const style = level === undefined ? POSITION_UNSET_MARKER : POSITION_LEVEL_MARKERS[level];
        const point = POSITION_COORDINATES[code];
        return (
          <g
            key={code}
            data-position={code}
            data-level={level}
            opacity={style.opacity}
            strokeWidth={PITCH_STROKE}
            strokeDasharray={style.strokeDasharray}
          >
            {level !== undefined && <title>{entryLabel({ position: code, level })}</title>}
            <circle
              cx={point.x}
              cy={point.y}
              r={POSITION_MARKER_RADIUS}
              fillOpacity={style.fillOpacity}
              className={style.circleClass}
            />
            <text
              x={point.x}
              y={point.y}
              fontSize={POSITION_MARKER_FONT_SIZE}
              textAnchor="middle"
              dominantBaseline="central"
              className={style.textClass}
            >
              {code}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
