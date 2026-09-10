/**
 * Sheet — kenardan gelen modal katman.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * ⚠️ KARAR: SHEET AYRI BİR BİLEŞEN, DIALOG'UN BİR PROP'U DEĞİL
 * ════════════════════════════════════════════════════════════════════════════
 *
 * **Bu bir GEREKÇE, bir ölçüm değil** — ve kaynak yok: `docs/spec/05` bileşen
 * tanımı taşımıyor (6.4'te §7.1–§7.6 tarandı), ROADMAP ikisini de **ayrı ayrı
 * sayıyor** ve davranışlarını tarif etmiyor. Karar 6.5'te yazıldı; itiraz
 * edilirse değişir.
 *
 * **Kural:** ROADMAP kapsam listesi bir **envanterdir** ve `Dialog` ile `Sheet`
 * orada **iki ayrı madde**. Sheet'i Dialog'un bir prop'u yapmak, envanterin
 * dokuz maddesini sekize indirir ve *"listede olmayan bileşen yazılmaz"*
 * kuralının tersini yapardı: **listede olan bir bileşen yazılmamış** olurdu.
 * Kabul kriteri 1 (Storybook envanteri ↔ hikâye **çift yönlü** eşleşme) de
 * bileşen başına bir kimlik istiyor.
 *
 * **Paylaşılan yarı gizlenmiyor:** ikisi de aynı Radix ilkelini
 * (`@radix-ui/react-dialog`) kullanıyor — yani *"iki uygulama"* yok, iki
 * **sunum** var. Fark tek bir eksende: Sheet bir **kenara** yaslanıyor
 * (`side`), Dialog **ortalanıyor**.
 *
 * ⚠️ Anahtarı **kendi** (`common:ui.sheet.close`), Dialog'unkini paylaşmıyor:
 * paylaşsaydı bu dosya `dialog.js`i import etmek zorunda kalırdı ve `i18n:check`
 * onu çözemezdi (aynı dosya kuralı) — 6.4'te ölçülmüş sınır.
 */
import * as RadixDialog from '@radix-ui/react-dialog';
import type { ComponentPropsWithoutRef, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '../lib/cn.js';

export const SHEET_KEYS = {
  /** Kapatma düğmesinin erişilebilir adı. */
  close: 'common:ui.sheet.close',
} as const;

/** Yaslanacak kenarlar — sayı değil **liste**; kapsayıcılık testte iddia ediliyor. */
export const SHEET_SIDES = ['top', 'right', 'bottom', 'left'] as const;

export type SheetSide = (typeof SHEET_SIDES)[number];

/**
 * Kenar → yerleşim sınıfları.
 *
 * `Record<SheetSide, string>` — bir kenar eklenip stili unutulursa **derleme
 * kırılır** (`BUTTON_VARIANT_CLASSES`in aynı deseni).
 */
export const SHEET_SIDE_CLASSES: Record<SheetSide, string> = {
  top: 'inset-x-0 top-0 border-b',
  right: 'inset-y-0 right-0 h-full w-3/4 max-w-sm border-l',
  bottom: 'inset-x-0 bottom-0 border-t',
  left: 'inset-y-0 left-0 h-full w-3/4 max-w-sm border-r',
};

const OVERLAY_BASE = 'fixed inset-0 z-[var(--z-overlay)] bg-black/60';

const CONTENT_BASE =
  'fixed z-[var(--z-modal)] border-[var(--border-subtle)] bg-[var(--bg-elevated)] ' +
  'p-[var(--space-6)] shadow-[var(--shadow-lg)] focus-visible:outline-none';

const CLOSE_BASE =
  'absolute right-[var(--space-4)] top-[var(--space-4)] inline-flex h-8 w-8 items-center ' +
  'justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] ' +
  'transition-colors duration-[var(--duration-fast)] hover:bg-[var(--bg-hover)] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]';

export const Sheet = RadixDialog.Root;
export const SheetTrigger = RadixDialog.Trigger;
export const SheetClose = RadixDialog.Close;
export const SheetTitle = RadixDialog.Title;
export const SheetDescription = RadixDialog.Description;

export type SheetContentProps = ComponentPropsWithoutRef<typeof RadixDialog.Content> & {
  side?: SheetSide;
  closeLabel?: string;
};

export function SheetContent({
  className,
  children,
  side = 'right',
  closeLabel,
  ...rest
}: SheetContentProps): ReactElement {
  const { t } = useTranslation();

  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className={OVERLAY_BASE} />
      <RadixDialog.Content
        className={cn(CONTENT_BASE, SHEET_SIDE_CLASSES[side], className)}
        data-side={side}
        {...rest}
      >
        {children}
        <RadixDialog.Close className={CLOSE_BASE} aria-label={closeLabel ?? t(SHEET_KEYS.close)}>
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
