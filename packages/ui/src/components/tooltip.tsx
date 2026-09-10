/**
 * Tooltip — Radix `@radix-ui/react-tooltip` uyarlaması.
 *
 * ⚠️ **`TooltipProvider` ZORUNLU ve dışa aktarılıyor.** Radix gecikme ve
 * "bir tanesi açıkken diğerleri anında açılsın" davranışını **sağlayıcı
 * düzeyinde** yönetiyor; sağlayıcı olmadan bileşen çalışma zamanında hata
 * veriyor. Uygulama onu kabuk seviyesinde bir kez kurar (Faz 17).
 *
 * ⚠️ **METİN YOK** — içerik çağırandan gelir.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * ⚠️ ZAMANLAYICI KARARI — SAHTE ZAMANLAYICI KULLANILMADI
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Tooltip'in açılması `delayDuration` kadar gecikiyor. Testte bunu görmenin iki
 * yolu vardı:
 *   ① `vi.useFakeTimers()` — ⚠️ **seçilmedi.** `user-event` kendi
 *      zamanlayıcısını kullanıyor ve sahte zamanla **kilitleniyor**; kaçış
 *      `user-event`in `advanceTimers` seçeneği, yani teste bir **zamanlama
 *      varsayımı** eklemek demek.
 *   ② `delayDuration={0}` — ✅ **SEÇİLDİ.** Gecikme bileşenin bir **prop'u**,
 *      yani testin sahtelemesi gereken bir şey değil; sıfırlamak gerçek kod
 *      yolunu değiştirmiyor, yalnızca bekleme süresini kaldırıyor.
 *
 * ⚠️ **Bunun TAKLİT ETMEDİĞİ:** *"varsayılan gecikme gerçekten N ms"* iddiası
 * bu ortamda **sınanmıyor**. Gecikmenin kullanıcı deneyimindeki doğruluğu
 * gerçek tarayıcı istiyor: **Faz 17** (G-02).
 */
import * as RadixTooltip from '@radix-ui/react-tooltip';
import type { ComponentPropsWithoutRef, ReactElement } from 'react';

import { cn } from '../lib/cn.js';

const CONTENT_BASE =
  'z-[var(--z-tooltip)] max-w-xs rounded-[var(--radius-sm)] ' +
  'bg-[var(--bg-active)] px-[var(--space-2)] py-[var(--space-1)] ' +
  'font-[var(--font-ui)] text-[var(--text-xs)] text-[var(--text-primary)] ' +
  'shadow-[var(--shadow-md)]';

export const TooltipProvider = RadixTooltip.Provider;
export const Tooltip = RadixTooltip.Root;
export const TooltipTrigger = RadixTooltip.Trigger;

export type TooltipContentProps = ComponentPropsWithoutRef<typeof RadixTooltip.Content>;

export function TooltipContent({
  className,
  sideOffset = 4,
  ...rest
}: TooltipContentProps): ReactElement {
  return (
    <RadixTooltip.Portal>
      <RadixTooltip.Content
        className={cn(CONTENT_BASE, className)}
        sideOffset={sideOffset}
        {...rest}
      />
    </RadixTooltip.Portal>
  );
}
