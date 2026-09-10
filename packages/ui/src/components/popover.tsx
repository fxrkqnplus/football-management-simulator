/**
 * Popover — Radix `@radix-ui/react-popover` uyarlaması.
 *
 * ⚠️ **BU PAKET 6.4'TE KURULDU AMA DIŞA AKTARILMADI** — Combobox'ın açılır
 * katmanı olarak **içeriden** kullanılıyordu ve 6.4'ün listesinde `Popover`
 * yoktu (K12). 6.5'in listesinde **var**; bu dosya onu yayınlıyor.
 *
 * ⚠️ **YAYINLAMAK COMBOBOX'I DEĞİŞTİRMEMELİ.** Combobox Radix'i **doğrudan**
 * import etmeye devam ediyor; bu dosya ona bir katman **eklemiyor**. Kanıt
 * 6.5'te ölçüldü: `dist/components/combobox.js`in md5'i ve Combobox testlerinin
 * sayısı+sonucu **öncesi/sonrası aynı** (6.4-ön'ün refactor idiomu).
 * Combobox'ı bu sarmalayıcıya taşımak **bir davranış değişikliği riski**
 * olurdu ve bu turun işi değil.
 *
 * ⚠️ **METİN YOK** — içerik çağırandan gelir.
 */
import * as RadixPopover from '@radix-ui/react-popover';
import type { ComponentPropsWithoutRef, ReactElement } from 'react';

import { cn } from '../lib/cn.js';

const CONTENT_BASE =
  'z-[var(--z-dropdown)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] ' +
  'bg-[var(--bg-elevated)] p-[var(--space-4)] text-[var(--text-primary)] ' +
  'shadow-[var(--shadow-md)] focus-visible:outline-none';

export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;
export const PopoverAnchor = RadixPopover.Anchor;

export type PopoverContentProps = ComponentPropsWithoutRef<typeof RadixPopover.Content>;

export function PopoverContent({
  className,
  align = 'center',
  sideOffset = 4,
  ...rest
}: PopoverContentProps): ReactElement {
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        className={cn(CONTENT_BASE, className)}
        align={align}
        sideOffset={sideOffset}
        {...rest}
      />
    </RadixPopover.Portal>
  );
}
