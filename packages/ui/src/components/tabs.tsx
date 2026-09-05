/**
 * Tabs — Radix `@radix-ui/react-tabs` uyarlaması.
 *
 * Dört dışa aktarım (`Tabs` · `TabsList` · `TabsTrigger` · `TabsContent`).
 * Radix ok tuşu navigasyonunu, `role="tab"`/`role="tabpanel"` bağlarını ve
 * roving tabindex'i kendisi yönetiyor.
 *
 * ⚠️ **AKTİF SEKME İKİ KANALLA GÖSTERİLİYOR:** renk **ve** alt çizgi. Yalnızca
 * renk kullanmak §7.2'nin *"tek kanal yetmez"* ilkesini ihlal ederdi — ve o
 * ilke bu depoda ölçümle doğrulandı (komşu bantların kontrastı 1,04–1,71).
 *
 * ⚠️ **METİN YOK** — sekme etiketleri `children` ile çağırandan gelir.
 */
import * as RadixTabs from '@radix-ui/react-tabs';
import type { ComponentPropsWithoutRef, ReactElement } from 'react';

import { cn } from '../lib/cn.js';

const TRIGGER_BASE =
  'inline-flex items-center justify-center whitespace-nowrap rounded-none ' +
  'border-b-2 border-transparent px-[var(--space-3)] py-[var(--space-2)] ' +
  'font-[var(--font-ui)] text-[var(--text-sm)] font-medium text-[var(--text-secondary)] ' +
  'transition-colors duration-[var(--duration-fast)] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ' +
  'focus-visible:ring-inset ' +
  'disabled:pointer-events-none disabled:opacity-50 ' +
  'data-[state=active]:border-[var(--accent)] data-[state=active]:text-[var(--text-primary)]';

export type TabsProps = ComponentPropsWithoutRef<typeof RadixTabs.Root>;
export type TabsListProps = ComponentPropsWithoutRef<typeof RadixTabs.List>;
export type TabsTriggerProps = ComponentPropsWithoutRef<typeof RadixTabs.Trigger>;
export type TabsContentProps = ComponentPropsWithoutRef<typeof RadixTabs.Content>;

export function Tabs({ className, ...rest }: TabsProps): ReactElement {
  return <RadixTabs.Root className={cn('flex flex-col', className)} {...rest} />;
}

export function TabsList({ className, ...rest }: TabsListProps): ReactElement {
  return (
    <RadixTabs.List
      className={cn(
        'inline-flex items-center border-b border-[var(--border-subtle)]',
        'overflow-x-auto',
        className,
      )}
      {...rest}
    />
  );
}

export function TabsTrigger({ className, ...rest }: TabsTriggerProps): ReactElement {
  return <RadixTabs.Trigger className={cn(TRIGGER_BASE, className)} {...rest} />;
}

export function TabsContent({ className, ...rest }: TabsContentProps): ReactElement {
  return (
    <RadixTabs.Content
      className={cn(
        'pt-[var(--space-4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
        className,
      )}
      {...rest}
    />
  );
}
