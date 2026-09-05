/**
 * Input — tek satırlık metin girişi.
 *
 * ⚠️ **METİN YOK.** `placeholder` ve `aria-label` çağırandan geliyor; ikisi de
 * `local/no-bare-jsx-text`in `USER_FACING_ATTRIBUTES` listesinde, yani çağıran
 * tarafta sabit metin yazılırsa **lint kırılıyor**. Bileşenin kendi içinde
 * çevrilecek bir dize yok.
 *
 * ⚠️ `invalid` ayrı bir prop ve `aria-invalid`i de sürüyor: hatayı yalnızca
 * kenarlık rengiyle göstermek tek kanallı olurdu ve ekran okuyucuya hiçbir şey
 * söylemezdi (§7.2'nin yedekli kodlama ilkesinin aynısı, başka bir yüzeyde).
 */
import type { InputHTMLAttributes, ReactElement } from 'react';

import { cn } from '../lib/cn.js';

const INPUT_BASE =
  'flex h-9 w-full rounded-[var(--radius-md)] border bg-[var(--bg-input)] ' +
  'px-[var(--space-3)] py-[var(--space-1)] font-[var(--font-ui)] text-[var(--text-sm)] ' +
  'text-[var(--text-primary)] placeholder:text-[var(--text-muted)] ' +
  'transition-colors duration-[var(--duration-fast)] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'aria-invalid'> {
  /** Doğrulama hatası — kenarlık **ve** `aria-invalid` birlikte değişir. */
  invalid?: boolean;
}

export function Input({ invalid = false, className, ...rest }: InputProps): ReactElement {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        INPUT_BASE,
        invalid ? 'border-[var(--danger)]' : 'border-[var(--border-default)]',
        className,
      )}
      {...rest}
    />
  );
}
