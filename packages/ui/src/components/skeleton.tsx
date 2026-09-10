/**
 * Skeleton — içerik yüklenirken gösterilen yer tutucu. Radix ilkeli **yok**.
 *
 * ⚠️ **`aria-hidden` VE BU BİR ERİŞİLEBİLİRLİK KARARI, kozmetik değil.**
 * Bir iskelet **anlam taşımıyor**: ekran okuyucuya *"gri bir dikdörtgen"*
 * okutmak gürültüden başka bir şey değil. Yükleniyor bilgisi, iskeletin
 * **kapsayıcısında** `aria-busy` ile verilir — ve o kapsayıcı çağıranın işi,
 * çünkü neyin yüklendiğini yalnızca o biliyor (Progress'in `aria-label`
 * gerekçesiyle aynı).
 *
 * ⚠️ **ANİMASYON YOK — bilerek.** `animate-pulse` cazip ama
 * `prefers-reduced-motion` kararı gerektiriyor: `spec/05` §7.4 *"hareketi
 * azalt açıksa tüm süreler 0ms"* diyor ve o mekanizmayı kuran alt görev
 * **6.8**. Bugün animasyon eklemek, o kararı sessizce önden almak olurdu.
 * ℹ️ **Bir kuralın ateşlenmemesi de bir sonuçtur:** iskelet bugün duruyor,
 * yanıp sönmüyor, ve sebebi burada yazılı.
 *
 * ⚠️ **METİN YOK.**
 */
import type { HTMLAttributes, ReactElement } from 'react';

import { cn } from '../lib/cn.js';

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...rest }: SkeletonProps): ReactElement {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={cn('rounded-[var(--radius-md)] bg-[var(--bg-active)]', className)}
      {...rest}
    />
  );
}
