/**
 * Toast — Radix `@radix-ui/react-toast` uyarlaması.
 *
 * ⚠️ **`ToastProvider` + `ToastViewport` ZORUNLU.** Radix kuyruğu ve
 * `role="status"` bölgesini sağlayıcı düzeyinde yönetiyor; viewport bildirimin
 * **nereye** çizileceğini söylüyor. Uygulama ikisini kabuk seviyesinde bir kez
 * kurar (Faz 17).
 *
 * ⚠️ **ZAMANLAYICI:** Toast'un `duration`ı da bir **prop** — Tooltip'le aynı
 * karar geçerli: sahte zamanlayıcı **kullanılmıyor**, testler `duration`ı
 * açıkça veriyor (`Infinity` ile kapanmayı devre dışı bırakmak dâhil).
 * **TAKLİT EDİLMEYEN:** *"varsayılan süre sonunda kendiliğinden kapanıyor"*
 * iddiası bu ortamda **sınanmıyor** — **Faz 17**.
 *
 * ⚠️ **ANLAMSAL RENKLER BU BİLEŞENDE KARARA BAĞLANDI** — gerekçe
 * `badge.tsx`teki blokta; Toast aynı `SEMANTIC_TONES` listesini kullanıyor,
 * yani iki bileşen aynı kaynaktan besleniyor ve ayrışamıyorlar.
 */
import * as RadixToast from '@radix-ui/react-toast';
import type { ComponentPropsWithoutRef, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '../lib/cn.js';
import { SEMANTIC_TONE_CLASSES, type SemanticTone } from '../tokens/semantic-tone.js';

export const TOAST_KEYS = {
  /** Kapatma düğmesinin erişilebilir adı. */
  close: 'common:ui.toast.close',
} as const;

const ROOT_BASE =
  'relative flex w-full items-start gap-[var(--space-3)] overflow-hidden ' +
  'rounded-[var(--radius-md)] border p-[var(--space-4)] shadow-[var(--shadow-lg)] ' +
  'font-[family-name:var(--font-ui)] text-[length:var(--text-sm)]';

const CLOSE_BASE =
  'ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center ' +
  'rounded-[var(--radius-sm)] opacity-70 transition-opacity hover:opacity-100 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]';

export const ToastProvider = RadixToast.Provider;
export const ToastTitle = RadixToast.Title;
export const ToastDescription = RadixToast.Description;
export const ToastAction = RadixToast.Action;

export type ToastProps = ComponentPropsWithoutRef<typeof RadixToast.Root> & {
  tone?: SemanticTone;
  closeLabel?: string;
};

export function Toast({
  className,
  children,
  tone = 'info',
  closeLabel,
  ...rest
}: ToastProps): ReactElement {
  const { t } = useTranslation();

  return (
    <RadixToast.Root className={cn(ROOT_BASE, SEMANTIC_TONE_CLASSES[tone], className)} {...rest}>
      {children}
      <RadixToast.Close className={CLOSE_BASE} aria-label={closeLabel ?? t(TOAST_KEYS.close)}>
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </RadixToast.Close>
    </RadixToast.Root>
  );
}

export function ToastViewport({
  className,
  ...rest
}: ComponentPropsWithoutRef<typeof RadixToast.Viewport>): ReactElement {
  return (
    <RadixToast.Viewport
      className={cn(
        'fixed bottom-0 right-0 z-[var(--z-toast)] flex max-h-screen w-full flex-col-reverse ' +
          'gap-[var(--space-2)] p-[var(--space-4)] sm:max-w-sm',
        className,
      )}
      {...rest}
    />
  );
}
