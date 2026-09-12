/**
 * MoraleIcon — moral SEVİYESİ için satır içi SVG simge (çift ok yukarı · ok
 * yukarı · yatay çizgi · ok aşağı · çift ok aşağı). Radix ilkeli **yok**.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ SEVİYELER BİR KALİBRASYON — SPEC YALNIZCA SAYIYI VERİYOR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Kaynak `docs/spec/01-database.md`:987 `morale: smallint // 0-100`. Seviye,
 * eşik, etiket **yok**. Beş dilim ve sınırları bu dosyada doğdu — 6.2'nin
 * `Math.floor` emsaliyle aynı sınıf: **kalibrasyon**, SAPMA değil (spec bir
 * şey söylemiyor ki sapılsın). Türkçe adları sözlük §8'de (Çok Kötü · Kötü ·
 * Normal · İyi · Çok İyi).
 *
 * **Eşikler ve gerekçesi — sayılarla:**
 *
 * ```
 *  veryLow    0 – 19    20 değer
 *  low       20 – 39    20 değer
 *  neutral   40 – 60    21 değer   ← 50 merkezli: 50 ± 10
 *  high      61 – 80    20 değer
 *  veryHigh  81 – 100   20 değer
 *                      ─────────
 *                      101 değer  (0…100, hepsi tam bir dilimde — test)
 * ```
 *
 * · 0–100 aralığında **101** tam sayı var; beşe tam bölünmez. Fazlalık
 *   **nötr** dilime verildi, uçlara değil: nötr *"sinyal yok"* demek ve tam
 *   olarak 50'ye ortalanması için tek sayıda değer gerekiyor (40…60 = 21).
 *   Fazlalığı bir uca vermek, ortadaki bir oyuncuyu sistematik olarak hafif
 *   iyi ya da hafif kötü gösterirdi — olmayan bir sinyal uydurmak.
 * · Ölçek **50 etrafında ayna simetrik**: `v ↔ 100 − v` dönüşümü
 *   `veryLow ↔ veryHigh`, `low ↔ high`, `neutral ↔ neutral` verir
 *   (19 ↔ 81, 39 ↔ 61). Test bunu 101 değerin hepsinde iddia ediyor — yani
 *   sınırlar rastgele değil, tek bir kuralın sonucu.
 * · Neden beş: sözlük §8 beş Türkçe ad veriyor ve simge dağarcığı beş
 *   (çift ok / ok / çizgi / ok / çift ok). Yedi seviye (FM'in "Süper / Çok
 *   Mutlu / …") yeni ad ve yeni simge isterdi; K12.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ OKLAR SEVİYEYİ GÖSTERİR, DEĞİŞİMİ DEĞİL
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Yukarı ok *"yüksek moral"*, *"moral yükseldi"* değil. Bileşen tek bir
 * değer alıyor ve bir önceki turu bilmiyor; bir **eğilim** göstergesi
 * (`morale` farkı) başka bir bileşen olur ve bu dosyaya eklenmez.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * RENK TEK KANAL DEĞİL — BİÇİM SEVİYE BAŞINA FARKLI
 * ────────────────────────────────────────────────────────────────────────────
 *
 * · veryHigh / high → `--success` (ikisi aynı renk; farkı **biçim** taşıyor:
 *   çift ok / tek ok) · neutral → `--text-secondary` · low → `--warning` ·
 *   veryLow → `--danger`. Hepsi `var(--…)`, sabit hex yok; açık tema kendi
 *   değerini verir.
 * · Renk `stroke="currentColor"` üzerinden **metin renginden** geliyor: sınıf
 *   `text-[var(--success)]` yazıyor, çizgi onu alıyor. Yani token'dan çizime
 *   giden yol tek — test `stroke`un `currentColor` olduğunu iddia ediyor ki
 *   sınıf bir gün boşa yazılmasın (DZ-10).
 * · Beş glif **beşi de farklı** (test): renk körlüğünde seviye biçimden
 *   okunur; 6.8'in modu bu bileşene dokunmak zorunda değil.
 *
 * `aria-label` = t(aria, { level: t(level.x) }) — *"Moral: İyi"*. Kök daima
 * `MORALE_ICON_KEYS` (`i18n:check` yalnızca onu çözüyor); seviye anahtarı
 * `MORALE_LEVEL_KEY_NAMES` ad listesinden, adı bilerek `_KEYS` ile BİTMİYOR.
 *
 * ⚠️ Geçersiz girdi SESSİZCE KIRPILMAZ (`bandForAttribute` emsali): tam
 * sayı değil ya da 0–100 dışı → `RangeError`, Türkçe mesaj. `50,5` bir
 * hesap hatasıdır, bir gösterim sorusu değil.
 *
 * TAKLİT ETMEDİĞİ: moralin **hesabı** (motor, K3) · moral eğilimi (fark) ·
 * mutluluk gerekçeleri (`happinessReasons`, diyalog — Faz 44/45) · tooltip ·
 * SVG'nin gerçek geometrisi (jsdom 0×0 — Faz 17, G-02) · görsel doğrulama
 * (Faz 49, G-05).
 */
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '../lib/cn.js';

/**
 * `common:ui.moraleIcon.*` — bu modülün TEK `*_KEYS` dışa aktarımı
 * (`i18n-keys.test.ts` ②: ikincisi kayıt defterini ezerdi).
 */
export const MORALE_ICON_KEYS = {
  levelVeryLow: 'common:ui.moraleIcon.level.veryLow',
  levelLow: 'common:ui.moraleIcon.level.low',
  levelNeutral: 'common:ui.moraleIcon.level.neutral',
  levelHigh: 'common:ui.moraleIcon.level.high',
  levelVeryHigh: 'common:ui.moraleIcon.level.veryHigh',
  aria: 'common:ui.moraleIcon.aria',
} as const;

export type MoraleIconKeyName = keyof typeof MORALE_ICON_KEYS;

/** `spec/01`:987 — `morale: smallint // 0-100`. */
export const MORALE_MIN = 0;
export const MORALE_MAX = 100;

/**
 * Beş dilim — **liste**, sayı ondan türüyor. Sınırlar kapsayıcı; gerekçe
 * dosya başında, kapsayıcılık (0…100 her tam sayı TAM BİR dilimde) testte.
 */
export const MORALE_LEVELS = [
  { key: 'veryLow', min: 0, max: 19 },
  { key: 'low', min: 20, max: 39 },
  { key: 'neutral', min: 40, max: 60 },
  { key: 'high', min: 61, max: 80 },
  { key: 'veryHigh', min: 81, max: 100 },
] as const;

export type MoraleLevel = (typeof MORALE_LEVELS)[number];

export type MoraleLevelKey = MoraleLevel['key'];

/**
 * Seviye → anahtar ADI. `t()`nin kökü daima `MORALE_ICON_KEYS`in kendisi:
 * `t(MORALE_ICON_KEYS[MORALE_LEVEL_KEY_NAMES[level.key]])`.
 */
export const MORALE_LEVEL_KEY_NAMES = {
  veryLow: 'levelVeryLow',
  low: 'levelLow',
  neutral: 'levelNeutral',
  high: 'levelHigh',
  veryHigh: 'levelVeryHigh',
} as const satisfies Record<MoraleLevelKey, MoraleIconKeyName>;

/** Seviye → metin rengi sınıfı; çizgi `currentColor` ile bunu alıyor. */
export const MORALE_LEVEL_CLASSES: Record<MoraleLevelKey, string> = {
  veryLow: 'text-[var(--danger)]',
  low: 'text-[var(--warning)]',
  neutral: 'text-[var(--text-secondary)]',
  high: 'text-[var(--success)]',
  veryHigh: 'text-[var(--success)]',
};

/**
 * Seviye → SVG `path` `d` listesi (viewBox `0 0 16 16`, kalınlık 2, yuvarlak
 * uç). Çift oklar iki yol, tek oklar ve çizgi bir yol; hepsi dikeyde 8'e
 * ortalı. veryLow ↔ veryHigh ve low ↔ high birbirinin dikey aynası.
 */
export const MORALE_LEVEL_GLYPHS: Record<MoraleLevelKey, readonly string[]> = {
  veryLow: ['M3 3L8 8L13 3', 'M3 8L8 13L13 8'],
  low: ['M3 5.5L8 10.5L13 5.5'],
  neutral: ['M3 8L13 8'],
  high: ['M3 10.5L8 5.5L13 10.5'],
  veryHigh: ['M3 8L8 3L13 8', 'M3 13L8 8L13 13'],
};

export const MORALE_ICON_SIZES = ['sm', 'md'] as const;

export type MoraleIconSize = (typeof MORALE_ICON_SIZES)[number];

export const MORALE_ICON_SIZE_CLASSES: Record<MoraleIconSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
};

const ICON_BASE = 'inline-block shrink-0 align-middle';

/**
 * Bir moral değerinin dilimi. Saf — JSX dışında, ayrı test ediliyor.
 *
 * ⚠️ Aralık dışı / tam sayı olmayan değer **sessizce kırpılmıyor** (dosya
 * başına bak).
 */
export function moraleLevelFor(value: number): MoraleLevel {
  if (!Number.isInteger(value) || value < MORALE_MIN || value > MORALE_MAX) {
    throw new RangeError(
      `Moral değeri ${String(MORALE_MIN)}…${String(MORALE_MAX)} arasında bir tam sayı olmalı: ${String(value)}`,
    );
  }
  const level = MORALE_LEVELS.find((l) => value >= l.min && value <= l.max);
  if (level === undefined) {
    // Kapsayıcılık testi bu dalın erişilemez olduğunu iddia ediyor; yine de
    // sessiz bir `undefined` dönmek yerine gürültü çıkarıyoruz.
    throw new RangeError(`Moral dilimi bulunamadı: ${String(value)}`);
  }
  return level;
}

export interface MoraleIconProps {
  /** `spec/01` `player_state.morale` — 0–100 tam sayı. */
  morale: number;
  size?: MoraleIconSize;
  className?: string;
}

export function MoraleIcon({ morale, size = 'md', className }: MoraleIconProps): ReactElement {
  const { t } = useTranslation();
  const level = moraleLevelFor(morale);

  return (
    <svg
      role="img"
      aria-label={t(MORALE_ICON_KEYS.aria, {
        level: t(MORALE_ICON_KEYS[MORALE_LEVEL_KEY_NAMES[level.key]]),
      })}
      data-level={level.key}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        ICON_BASE,
        MORALE_ICON_SIZE_CLASSES[size],
        MORALE_LEVEL_CLASSES[level.key],
        className,
      )}
    >
      {MORALE_LEVEL_GLYPHS[level.key].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
