/**
 * Badge — küçük durum rozeti. Radix ilkeli **yok**, düz bir `<span>`.
 *
 * ⚠️ **ANLAMSAL RENKLERİN KULLANIM ÇİFTİ BU TURDA KARARA BAĞLANDI** ve gerekçe
 * `../tokens/semantic-tone.ts`te: zemin **dolgu** (gerekçe, depo içi emsalden), ön plan
 * **hesaplanmış** (ölçüm, `pickAccessibleForeground`). 6.2 kararı açık bırakmış
 * ve sahibini *"6.4 (Badge, Toast)"* diye yazmıştı — bileşenler aslında
 * **6.5'te**, yani niyet doğru numara bayattı.
 *
 * ⚠️ **`neutral` BEŞİNCİ BİR ANLAMSAL RENK DEĞİL.** Dört anlamsal token
 * (`--info` · `--success` · `--warning` · `--danger`) `SEMANTIC_TONES`ta
 * yaşıyor; rozetlerin çoğu ise **hiçbir anlam taşımıyor** (bir sayı, bir etiket)
 * ve onlar için yeni bir renk icat etmek yerine yüzey token'ları kullanılıyor.
 * Bu yüzden varyant kümesi `neutral` + dört ton = **beş** ve sayı hiçbir yerde
 * elle yazılmıyor.
 *
 * ⚠️ **METİN YOK** — içerik `children` ile çağırandan gelir.
 */
import type { HTMLAttributes, ReactElement } from 'react';

import { cn } from '../lib/cn.js';
import {
  SEMANTIC_TONE_CLASSES,
  SEMANTIC_TONES,
  type SemanticTone,
} from '../tokens/semantic-tone.js';

/**
 * Rozet varyantları — **liste**, sayı ondan türüyor.
 *
 * `neutral` başta: varsayılan olan, anlam taşımayan hâl.
 */
export const BADGE_VARIANTS = ['neutral', ...SEMANTIC_TONES] as const;

export type BadgeVariant = (typeof BADGE_VARIANTS)[number];

const BADGE_BASE =
  'inline-flex items-center gap-[var(--space-1)] rounded-[var(--radius-full)] border ' +
  'px-[var(--space-2)] py-[2px] font-[var(--font-ui)] text-[var(--text-2xs)] ' +
  'font-medium whitespace-nowrap';

/**
 * Varyant → sınıflar.
 *
 * Dört anlamsal ton `SEMANTIC_TONE_CLASSES`ten **yayılıyor**, kopyalanmıyor —
 * Toast ile Badge aynı kaynaktan besleniyor ve ayrışamıyorlar.
 */
export const BADGE_VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]',
  ...SEMANTIC_TONE_CLASSES,
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = 'neutral', className, ...rest }: BadgeProps): ReactElement {
  return <span className={cn(BADGE_BASE, BADGE_VARIANT_CLASSES[variant], className)} {...rest} />;
}

/** Yalnızca tip düzeyinde kullanım için yeniden dışa aktarım. */
export type { SemanticTone };
