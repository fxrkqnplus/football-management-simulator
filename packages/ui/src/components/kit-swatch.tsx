/**
 * KitSwatch — bir kulüp formasının **renk örneği**: gövde · kollar · yaka
 * boyanmış küçük bir forma silüeti (sözleşme 6.6 §1.7). Radix ilkeli **yok**,
 * `<span role="img">` + satır içi SVG.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ İKİ KAPALI KÜME BURADA **KOPYA** — ve kopyanın kendi nöbetçisi var
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `KIT_TYPES` (`club-kits.ts`) ve `KIT_COLOR_SLOTS` (`kit-templates.ts`)
 * `packages/db`de yaşıyor; `packages/ui` db'yi import **edemez** (§2.4). Aynı
 * küme iki pakette iki kopya olarak duruyor ve DZ-07 gereği kopyanın kapısı
 * var: `scripts/inventory-guards.test.mjs` ④ iki dosyanın METNİNİ düzenli
 * ifadeyle okuyup **sıra dahil** birebir eşitliği iddia ediyor. Bu yüzden iki
 * sabit tam olarak `export const AD = [ … ] as const;` biçiminde ve köşeli
 * parantezin içinde yorum/başka literal **yok** — çıkarıcı köşeli parantez
 * içindeki her tırnaklı dizeyi ve sayıyı üye sayar.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * RENKLER ÇAĞIRANDAN GELİR — sözleşme §0'ın üçüncü hex istisnası
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `colors` `club_kits.color1..3`ün kendisi: `#RRGGBB`, veri. Tema token'ı
 * değil, temaya göre de değişmez — Galatasaray'ın sarısı açık temada da
 * sarıdır. Bu dosyada **bir tek** sabit hex yok; forma renkleri SVG'ye
 * `fill` niteliğiyle **olduğu gibi** gidiyor. Silüetin kontur çizgisi ise
 * token (`var(--border-strong)`): beyaz bir forma beyaz bir yüzeyde konturu
 * olmadan **yok olurdu** — kontur formanın değil arayüzün rengidir.
 *
 * **Yaka = `colors[2] ?? colors[1]`** (sözleşme): iki yuvalı şablonda yaka
 * kolların rengini alır. Bu, `kit_templates.color_slots`un iki değerinin
 * (2 · 3) görsel karşılığı; üçüncü renk **uydurulmuyor**.
 *
 * ⚠️ **`#RRGGBB` DIŞI DEĞER SESSİZCE GEÇMEZ.** Kısa biçim (`#FFF`), adlı renk
 * (`white`), tırnaksız `FFFFFF` → `RangeError`, Türkçe mesaj. Gerekçe ölçülü:
 * db sütunu `char(7)`; burada `#FFF`i kabul etmek arayüzün db'nin
 * reddettiğini kabul etmesi, yani iki doğrulayıcının ayrışması olurdu. Yuva
 * sayısı da öyle: 0, 1 ya da 4 renk bir şablona denk gelmez → `RangeError`.
 * `kind` de çalışma zamanında sınanıyor — API'den gelen dize tip taşımaz
 * (`FormIndicator` `isFormResult` emsali).
 *
 * `aria-label` = t(kind.<tür>) — *"İç Saha Forması"*. Kök daima
 * `KIT_SWATCH_KEYS` (`i18n:check` yalnızca onu çözüyor); tür anahtarı
 * `KIT_TYPE_KEY_NAMES` ad listesinden, adı bilerek `_KEYS` ile BİTMİYOR
 * (`i18n-keys.test.ts` ②: modül başına tek `_KEYS`).
 *
 * **Boyutlar KALİBRASYON:** `sm` 16 px (`h-4`) tablo satırı için, `md` 24 px
 * (`h-6`) kulüp kartı için. Sözleşme değer vermiyor; `MoraleIcon`/
 * `FormIndicator` ile aynı iki kademe. Yazı tipi yok (metin basılmıyor).
 *
 * TAKLİT ETMEDİĞİ: şablon/desen (`kit_templates` — çizgili, kolonlu, kuşaklı;
 * Faz 8) · sponsor, numara, isim · gerçek forma görseli ve getirilmesi
 * (`asset_id`, Faz 7) · hangi formanın hangi maçta giyildiği (Faz 20+) · renk
 * çakışması kararı (rakiple aynı renk — motor/kural, K3) · SVG'nin gerçek
 * geometrisi (jsdom 0×0 — Faz 17, G-02) · görsel doğrulama (Faz 49, G-05).
 */
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '../lib/cn.js';

/**
 * `common:ui.kitSwatch.*` — bu modülün TEK `*_KEYS` dışa aktarımı
 * (`i18n-keys.test.ts` ②: ikincisi kayıt defterini ezerdi).
 */
export const KIT_SWATCH_KEYS = {
  kindHome: 'common:ui.kitSwatch.kind.home',
  kindAway: 'common:ui.kitSwatch.kind.away',
  kindThird: 'common:ui.kitSwatch.kind.third',
} as const;

export type KitSwatchKeyName = keyof typeof KIT_SWATCH_KEYS;

/**
 * Forma türleri — `packages/db/src/schema/club-kits.ts` `KIT_TYPES` ile
 * **birebir, sıra dahil** (`inventory-guards` ④). Köşeli parantez içi temiz
 * kalır (dosya başına bak).
 */
export const KIT_TYPES = ['home', 'away', 'third'] as const;

export type KitType = (typeof KIT_TYPES)[number];

/**
 * Bir şablonun renk yuvası sayısı — `packages/db/src/schema/kit-templates.ts`
 * `KIT_COLOR_SLOTS` ile **birebir** (`inventory-guards` ④).
 */
export const KIT_COLOR_SLOTS = [2, 3] as const;

export type KitColorSlots = (typeof KIT_COLOR_SLOTS)[number];

/**
 * Tür → anahtar ADI. `t()`nin kökü daima `KIT_SWATCH_KEYS`in kendisi:
 * `t(KIT_SWATCH_KEYS[KIT_TYPE_KEY_NAMES[kind]])`.
 */
export const KIT_TYPE_KEY_NAMES = {
  home: 'kindHome',
  away: 'kindAway',
  third: 'kindThird',
} as const satisfies Record<KitType, KitSwatchKeyName>;

/** `club_kits.color1..3` biçimi — `#RRGGBB`, `char(7)`; büyük/küçük harf serbest. */
export const KIT_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export const KIT_SWATCH_SIZES = ['sm', 'md'] as const;

export type KitSwatchSize = (typeof KIT_SWATCH_SIZES)[number];

export const KIT_SWATCH_SIZE_CLASSES: Record<KitSwatchSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
};

/** Silüetin koordinat alanı. */
export const KIT_SWATCH_VIEWBOX = '0 0 24 24';

/**
 * Forma silüeti — üç parça, çizim sırasıyla: kollar (arkada), gövde, yaka
 * (önde). viewBox `0 0 24 24`; gövde x 8…16, kollar iki yana 2/22'ye açılıyor,
 * yaka gövdenin üst kenarında V biçimli bir üçgen.
 */
export const KIT_SWATCH_PATHS = {
  sleeves: ['M8 3L2 6L4 11L8 10Z', 'M16 3L22 6L20 11L16 10Z'],
  body: 'M8 3L16 3L16 22L8 22Z',
  collar: 'M9.5 3L12 6.5L14.5 3Z',
} as const;

/**
 * Kontur — arayüzün rengi, formanın değil (dosya başına bak). Tailwind 4
 * `stroke-[var(--…)]` → `stroke: var(--…)` (renk; genişlik değil) — bu alt
 * görevde `@tailwindcss/node compile` ile ölçüldü.
 */
export const KIT_SWATCH_OUTLINE_CLASS = 'stroke-[var(--border-strong)]';

const ROOT_BASE = 'inline-block shrink-0 align-middle';

const SVG_BASE = 'block h-full w-full';

/** Çalışma zamanı kümesi denetimi — API'den gelen dize tip taşımaz. */
export const isKitType = (value: string): value is KitType =>
  KIT_TYPES.some((kind) => kind === value);

/** `#RRGGBB` mi? Kısa biçim ve adlı renk **değil** (dosya başına bak). */
export const isKitColor = (value: string): boolean => KIT_COLOR_PATTERN.test(value);

/** Tür → anahtar adı; küme dışı tür → `RangeError`. Saf. */
export function kitTypeKeyName(kind: string): KitSwatchKeyName {
  if (!isKitType(kind)) {
    throw new RangeError(
      `Bilinmeyen forma türü: ${kind} (geçerli değerler: ${KIT_TYPES.join(', ')})`,
    );
  }
  return KIT_TYPE_KEY_NAMES[kind];
}

export interface KitSwatchColors {
  readonly body: string;
  readonly sleeves: string;
  readonly collar: string;
}

/**
 * Renk yuvaları → parça renkleri. Saf — JSX dışında, ayrı test ediliyor.
 *
 * ⚠️ Kırpma yok: yuva sayısı `KIT_COLOR_SLOTS` dışında ya da bir renk
 * `#RRGGBB` değil → `RangeError`. Yaka üçüncü renk yoksa kolların rengi.
 */
export function kitSwatchColors(colors: readonly string[]): KitSwatchColors {
  if (!KIT_COLOR_SLOTS.some((slots) => slots === colors.length)) {
    throw new RangeError(
      `Forma renk sayısı ${KIT_COLOR_SLOTS.join(' veya ')} olmalı: ${String(colors.length)}`,
    );
  }
  for (const color of colors) {
    if (!isKitColor(color)) {
      throw new RangeError(`Forma rengi #RRGGBB biçiminde olmalı: ${color}`);
    }
  }
  const [body, sleeves, third] = colors;
  if (body === undefined || sleeves === undefined) {
    // Yuva denetimi bu dalı erişilmez kılıyor; sessiz `undefined` yerine gürültü.
    throw new RangeError(`Forma renkleri eksik: ${colors.join(', ')}`);
  }
  return { body, sleeves, collar: third ?? sleeves };
}

export interface KitSwatchProps {
  /** `club_kits.kit_type` — `home` · `away` · `third`. */
  kind: KitType;
  /** `club_kits.color1..3` — 2 ya da 3 adet `#RRGGBB`. */
  colors: readonly string[];
  size?: KitSwatchSize;
  className?: string;
}

export function KitSwatch({ kind, colors, size = 'md', className }: KitSwatchProps): ReactElement {
  const { t } = useTranslation();
  const keyName = kitTypeKeyName(kind);
  const parts = kitSwatchColors(colors);

  return (
    <span
      role="img"
      aria-label={t(KIT_SWATCH_KEYS[keyName])}
      data-kind={kind}
      data-slots={colors.length}
      className={cn(ROOT_BASE, KIT_SWATCH_SIZE_CLASSES[size], className)}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox={KIT_SWATCH_VIEWBOX}
        strokeWidth="0.75"
        strokeLinejoin="round"
        className={cn(SVG_BASE, KIT_SWATCH_OUTLINE_CLASS)}
      >
        {KIT_SWATCH_PATHS.sleeves.map((d) => (
          <path key={d} d={d} fill={parts.sleeves} data-part="sleeves" />
        ))}
        <path d={KIT_SWATCH_PATHS.body} fill={parts.body} data-part="body" />
        <path d={KIT_SWATCH_PATHS.collar} fill={parts.collar} data-part="collar" />
      </svg>
    </span>
  );
}
