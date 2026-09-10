/**
 * Dialog — Radix `@radix-ui/react-dialog` uyarlaması.
 *
 * Modal bir katman: odak tuzağı, `Esc`, dış tıklama, arka plandaki içeriğin
 * `aria-hidden` yapılması — hepsi Radix'in işi. Bizim payımız tema, ölçek ve
 * **kapatma düğmesinin erişilebilir adı**.
 *
 * ⚠️ **`DialogTitle` ZORUNLU ve bu bir tercih değil.** Radix, başlıksız bir
 * modal için konsola uyarı basıyor çünkü ekran okuyucu katmanın **ne olduğunu**
 * söyleyemez. Başlığı görsel olarak gizlemek gerekirse `DialogTitle` yine
 * yazılır (6.8'in işi); atlanmaz.
 *
 * ⚠️ **jsdom SINIRI:** Radix bu katmanı `document.body`ye **portal** ile
 * takıyor. RTL'in `cleanup()`ü portalı da söküyor (kök `vitest.setup.ts`te
 * bağlı), ama **odak tuzağının gerçekten çalıştığı** ancak gerçek bir tarayıcıda
 * görülür — jsdom sekme sırasını ve `inert` semantiğini tam uygulamıyor.
 * Buradaki testler **varlığı, `Esc` davranışını ve rolü** sınıyor; odak
 * tuzağının kendisi **Faz 17** (G-02).
 */
import * as RadixDialog from '@radix-ui/react-dialog';
import type { ComponentPropsWithoutRef, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '../lib/cn.js';

/**
 * Bu bileşenin çeviri anahtarları — **bileşenin yanında**.
 *
 * Gerekçe `select.tsx`te ölçümüyle yazılı: `i18n:check` `t(X.y)` çağrısında
 * `X`i yalnızca **aynı dosyada** çözebiliyor. `i18n-keys.ts` bunları
 * **topluyor**, tanımlamıyor — ve 6.5'ten itibaren o toplamanın eksiksizliği
 * `i18n-keys.test.ts` ②'nin nöbetçisiyle denetleniyor.
 */
export const DIALOG_KEYS = {
  /** Sağ üstteki kapatma düğmesinin erişilebilir adı. */
  close: 'common:ui.dialog.close',
} as const;

const OVERLAY_BASE =
  'fixed inset-0 z-[var(--z-overlay)] bg-black/60 ' +
  'data-[state=open]:animate-in data-[state=closed]:animate-out';

const CONTENT_BASE =
  'fixed left-1/2 top-1/2 z-[var(--z-modal)] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 ' +
  'rounded-[var(--radius-lg)] border border-[var(--border-subtle)] ' +
  'bg-[var(--bg-elevated)] p-[var(--space-6)] shadow-[var(--shadow-lg)] ' +
  'focus-visible:outline-none';

const CLOSE_BASE =
  'absolute right-[var(--space-4)] top-[var(--space-4)] inline-flex h-8 w-8 items-center ' +
  'justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] ' +
  'transition-colors duration-[var(--duration-fast)] hover:bg-[var(--bg-hover)] ' +
  'hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-[var(--accent)]';

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

export type DialogContentProps = ComponentPropsWithoutRef<typeof RadixDialog.Content> & {
  /** Kapatma düğmesinin erişilebilir adı; verilmezse çeviriden gelir. */
  closeLabel?: string;
};

export function DialogContent({
  className,
  children,
  closeLabel,
  ...rest
}: DialogContentProps): ReactElement {
  const { t } = useTranslation();

  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className={OVERLAY_BASE} />
      <RadixDialog.Content className={cn(CONTENT_BASE, className)} {...rest}>
        {children}
        <RadixDialog.Close className={CLOSE_BASE} aria-label={closeLabel ?? t(DIALOG_KEYS.close)}>
          {/* Çarpı bir SVG, bir metin değil: `×` karakteri bir yazı tipi
              bağımlılığı ve bir K5 tartışması doğururdu. Ad `aria-label`de. */}
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 16 16"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </RadixDialog.Close>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export function DialogTitle({
  className,
  ...rest
}: ComponentPropsWithoutRef<typeof RadixDialog.Title>): ReactElement {
  return (
    <RadixDialog.Title
      className={cn(
        'font-[var(--font-ui)] text-[var(--text-lg)] font-semibold text-[var(--text-primary)]',
        className,
      )}
      {...rest}
    />
  );
}

export function DialogDescription({
  className,
  ...rest
}: ComponentPropsWithoutRef<typeof RadixDialog.Description>): ReactElement {
  return (
    <RadixDialog.Description
      className={cn(
        'mt-[var(--space-2)] font-[var(--font-ui)] text-[var(--text-sm)] text-[var(--text-secondary)]',
        className,
      )}
      {...rest}
    />
  );
}
