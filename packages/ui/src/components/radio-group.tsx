/**
 * RadioGroup — Radix `@radix-ui/react-radio-group` uyarlaması.
 *
 * İki dışa aktarım: `RadioGroup` (kapsayıcı, `role="radiogroup"`) ve
 * `RadioGroupItem`. Radix ok tuşu navigasyonunu ve roving tabindex'i kendisi
 * yönetiyor — klavye kabul kriterinin bu bileşendeki payı **onun** işi, bizim
 * payımız odak halkasının görünür kalması.
 *
 * ⚠️ **METİN YOK.** Etiketleri çağıran `<label>` ile bağlar; bileşen kendi
 * içinde hiçbir dize taşımıyor.
 */
import * as RadixRadioGroup from '@radix-ui/react-radio-group';
import type { ComponentPropsWithoutRef, ReactElement } from 'react';

import { cn } from '../lib/cn.js';

const ITEM_BASE =
  'aspect-square h-4 w-4 rounded-full border border-[var(--border-strong)] ' +
  'bg-[var(--bg-input)] text-[var(--accent)] ' +
  'transition-colors duration-[var(--duration-fast)] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' +
  'data-[state=checked]:border-[var(--accent)]';

export type RadioGroupProps = ComponentPropsWithoutRef<typeof RadixRadioGroup.Root>;
export type RadioGroupItemProps = ComponentPropsWithoutRef<typeof RadixRadioGroup.Item>;

export function RadioGroup({ className, ...rest }: RadioGroupProps): ReactElement {
  return <RadixRadioGroup.Root className={cn('grid gap-[var(--space-2)]', className)} {...rest} />;
}

export function RadioGroupItem({ className, ...rest }: RadioGroupItemProps): ReactElement {
  return (
    <RadixRadioGroup.Item className={cn(ITEM_BASE, className)} {...rest}>
      <RadixRadioGroup.Indicator className="flex h-full w-full items-center justify-center">
        <span aria-hidden="true" className="block h-2 w-2 rounded-full bg-[var(--accent)]" />
      </RadixRadioGroup.Indicator>
    </RadixRadioGroup.Item>
  );
}
