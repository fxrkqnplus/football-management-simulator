/**
 * Button — altı varyant, üç boyut.
 *
 * Varyant listesi ve gerekçesi `button-variants.ts`te; bu dosya yalnızca onu
 * DOM'a bağlıyor. Ayrım bilinçli: liste veri, bileşen render — ve Storybook
 * (6.9) ile testler listeyi bileşen import etmeden okuyabiliyor.
 *
 * ⚠️ **METİN YOK.** Bu bileşen kullanıcıya görünen hiçbir dize taşımıyor;
 * etiket `children` ile çağırandan geliyor. K5 açısından en güvenli biçim —
 * çevrilecek bir şey yoksa çevrilmeyi unutmak da mümkün değil.
 *
 * ⚠️ `asChild` (Radix `Slot`) **BİLEREK YOK.** ROADMAP'in 6.4 listesi onu
 * istemiyor ve bir bağımlılık daha (`@radix-ui/react-slot`) getirirdi (K12).
 * Bir `<a>`nın buton gibi görünmesi gerektiğinde `BUTTON_VARIANT_CLASSES`
 * dışa aktarılıyor ve doğrudan kullanılabiliyor.
 */
import type { ButtonHTMLAttributes, ReactElement } from 'react';

import { cn } from '../lib/cn.js';
import {
  BUTTON_SIZE_CLASSES,
  BUTTON_VARIANT_CLASSES,
  type ButtonSize,
  type ButtonVariant,
} from './button-variants.js';

/**
 * Her varyantta ortak olan taban.
 *
 * `focus-visible` halkası **kaldırılamaz**: klavye navigasyonu kabul
 * kriterlerinden biri ve odak görünürlüğü onun ön şartı. `disabled` durumu
 * hem imleci hem opaklığı değiştiriyor — tek kanal (renk) yeterli değil.
 */
const BUTTON_BASE =
  'inline-flex items-center justify-center gap-[var(--space-2)] rounded-[var(--radius-md)] ' +
  'font-[var(--font-ui)] font-medium whitespace-nowrap select-none ' +
  'transition-colors duration-[var(--duration-fast)] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-[var(--bg-base)] ' +
  'disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = 'default',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: ButtonProps): ReactElement {
  return (
    <button
      // ⚠️ `type` varsayılanı **'button'** ve bu bir hata önleme kararı:
      // HTML'in varsayılanı 'submit' ve bir form içindeki her buton, hiçbir
      // şey yazmadan formu gönderir. Varsayılanı burada tersine çevirmek,
      // "gönder" niyetinin AÇIKÇA yazılmasını zorunlu kılıyor.
      type={type}
      className={cn(
        BUTTON_BASE,
        BUTTON_VARIANT_CLASSES[variant],
        BUTTON_SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    />
  );
}
