/**
 * Checkbox — Radix `@radix-ui/react-checkbox` uyarlaması.
 *
 * ⚠️ **İŞARET BİR SVG, BİR METİN DEĞİL.** Ünlem/tik karakteri yazmak
 * (`✓`) bir yazı tipi bağımlılığı ve bir K5 tartışması doğururdu; `<svg>`
 * hiçbir dile ait değil ve `aria-hidden` ile erişilebilirlik ağacından
 * çıkarılıyor — durum zaten `role="checkbox"` + `aria-checked` ile taşınıyor.
 *
 * ⚠️ Belirsiz (`indeterminate`) durum Radix'in `'indeterminate'` değeriyle
 * destekleniyor ve **ayrı bir çizim** alıyor: tik ile tire aynı görünürse
 * "hepsi seçili" ile "bazısı seçili" ayırt edilemez.
 */
import * as RadixCheckbox from '@radix-ui/react-checkbox';
import type { ComponentPropsWithoutRef, ReactElement } from 'react';

import { cn } from '../lib/cn.js';

const CHECKBOX_BASE =
  'peer inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[var(--radius-sm)] ' +
  'border border-[var(--border-strong)] bg-[var(--bg-input)] ' +
  'transition-colors duration-[var(--duration-fast)] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' +
  'data-[state=checked]:bg-[var(--accent)] data-[state=checked]:border-[var(--accent)] ' +
  'data-[state=indeterminate]:bg-[var(--accent-muted)] data-[state=indeterminate]:border-[var(--accent)]';

export type CheckboxProps = ComponentPropsWithoutRef<typeof RadixCheckbox.Root>;

export function Checkbox({ className, ...rest }: CheckboxProps): ReactElement {
  return (
    <RadixCheckbox.Root className={cn(CHECKBOX_BASE, className)} {...rest}>
      <RadixCheckbox.Indicator className="text-[var(--text-inverse)]">
        {/* Tik ve tire AYRI çizimler — "hepsi" ile "bazısı" tek bakışta ayrılmalı. */}
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 16 16"
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path className="hidden [[data-state=checked]_&]:block" d="M3 8.5 6.5 12 13 4.5" />
          <path className="hidden [[data-state=indeterminate]_&]:block" d="M3.5 8h9" />
        </svg>
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );
}
