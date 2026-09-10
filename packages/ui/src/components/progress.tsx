/**
 * Progress — Radix `@radix-ui/react-progress` uyarlaması.
 *
 * FM'de kondisyon çubuğu, moral çubuğu ve tur işleme ilerlemesi buraya
 * oturacak. Ölçek çağırandan gelir; bileşen bir aralık **uydurmuyor**
 * (SAPMA-026).
 *
 * ⚠️ **`aria-label` ÇAĞIRANDAN ZORUNLU.** Bir ilerleme çubuğu neyin ilerlemesi
 * olduğunu **kendisi bilemez**; ad burada uydurulursa her kullanım yerinde
 * yanlış olur. Radix `role="progressbar"` ve `aria-valuenow`u veriyor, adı
 * vermiyor.
 *
 * ⚠️ **BELİRSİZ (indeterminate) DURUM:** `value={null}` verilirse Radix
 * `data-state="indeterminate"` yazıyor ve `aria-valuenow` **kaldırılıyor** —
 * yani *"ne kadar sürecek bilmiyorum"* ekran okuyucuya da geçiyor. Bu tur onu
 * **çiziyor ama animasyonlamıyor**: bir animasyon `prefers-reduced-motion`
 * kararı gerektirir ve o **6.8**'in işi.
 */
import * as RadixProgress from '@radix-ui/react-progress';
import type { ComponentPropsWithoutRef, ReactElement } from 'react';

import { cn } from '../lib/cn.js';

const ROOT_BASE =
  'relative h-2 w-full overflow-hidden rounded-[var(--radius-full)] bg-[var(--bg-active)]';

const INDICATOR_BASE =
  'h-full w-full flex-1 rounded-[var(--radius-full)] bg-[var(--accent)] ' +
  'transition-transform duration-[var(--duration-normal)]';

export type ProgressProps = ComponentPropsWithoutRef<typeof RadixProgress.Root>;

export function Progress({ className, ...rest }: ProgressProps): ReactElement {
  // ⚠️ `value`/`max` DESTRUCTURE EDİLMİYOR, `rest`te kalıyor:
  // `exactOptionalPropertyTypes: true` altında bir opsiyonel prop'a açıkça
  // `undefined` vermek hata (6.4'te Slider'da ölçüldü).
  const value = rest.value ?? null;
  const max = rest.max ?? 100;

  return (
    <RadixProgress.Root className={cn(ROOT_BASE, className)} {...rest}>
      <RadixProgress.Indicator
        className={INDICATOR_BASE}
        style={{ transform: `translateX(-${String(indicatorOffsetPercent(value, max))}%)` }}
      />
    </RadixProgress.Root>
  );
}

/**
 * Göstergenin **sola kaydırma** yüzdesi — saf, ve bu yüzden ayrı test ediliyor.
 *
 * Gösterge tam genişlikte çiziliyor ve eksik kalan kadar **sola** kaydırılıyor:
 * `%100` ilerleme → `0` kaydırma · `%0` → `100` kaydırma. ⚠️ İlk yazımda formül
 * **ters**ti (`translateX(-percent)`), yani dolu bir çubuk tamamen gizleniyordu;
 * saf fonksiyona ayırmak onu bir birim testine açıyor.
 *
 * ⚠️ **BELİRSİZ DURUM `100` DÖNÜYOR — yani gösterge GİZLİ.** *"Ne kadar
 * sürecek bilmiyorum"* durumunda uydurma bir dolgu göstermek yanlış bilgi
 * olurdu; boş bırakmak dürüst. Hareketli bir belirsizlik animasyonu
 * `prefers-reduced-motion` kararı gerektiriyor ve o **6.8**'in işi.
 */
export function indicatorOffsetPercent(value: number | null, max: number): number {
  if (value === null || max <= 0) return 100;
  const percent = Math.min(Math.max((value / max) * 100, 0), 100);
  return 100 - percent;
}
