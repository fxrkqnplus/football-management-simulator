/**
 * Slider — Radix `@radix-ui/react-slider` uyarlaması.
 *
 * FM'de bu bileşen taktik ayarlarını taşıyacak (baskı yoğunluğu, savunma
 * çizgisi — `CLAUDE.md` §14). Değer aralığı çağırandan gelir; bileşen bir
 * ölçek **uydurmaz** (SAPMA-026).
 *
 * ⚠️ **jsdom SINIRI, ADIYLA:** Radix Slider işaretçiyle sürüklemeyi
 * `getBoundingClientRect()` üzerinden hesaplıyor ve jsdom **her zaman 0×0**
 * döndürüyor (6.0'da ölçüldü). Bu yüzden bu bileşenin testleri **yalnızca
 * klavye** yolunu sınıyor (ok tuşları, Home/End) — sürükleme testi
 * **yazılmadı**, çünkü geometriyi sahtelemek testi bir yalan üzerine
 * geçirirdi. Sürükleme doğrulaması gerçek tarayıcı gerektiriyor: **Faz 17**
 * (G-02, Playwright).
 *
 * ⚠️ **METİN YOK** — `aria-label` çağırandan gelir.
 */
import * as RadixSlider from '@radix-ui/react-slider';
import type { ComponentPropsWithoutRef, ReactElement } from 'react';

import { cn } from '../lib/cn.js';

const THUMB_BASE =
  'block h-4 w-4 rounded-full border-2 border-[var(--accent)] bg-[var(--bg-base)] ' +
  'shadow-[var(--shadow-sm)] transition-colors duration-[var(--duration-fast)] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] ' +
  'disabled:pointer-events-none disabled:opacity-50';

export type SliderProps = ComponentPropsWithoutRef<typeof RadixSlider.Root>;

export function Slider({ className, ...rest }: SliderProps): ReactElement {
  // Kaç topuz çizileceği DEĞERDEN türetiliyor, ayrı bir prop'tan değil:
  // iki kaynak bir gün ayrışır (aralık seçici iki topuz ister).
  //
  // ⚠️ `value`/`defaultValue` DESTRUCTURE EDİLMİYOR, `rest` içinde kalıyor.
  // `exactOptionalPropertyTypes: true` altında bir opsiyonel prop'a AÇIKÇA
  // `undefined` vermek hata; ayırıp geri vermek tam olarak bunu yapardı.
  const thumbCount = (rest.value ?? rest.defaultValue ?? [0]).length;

  return (
    <RadixSlider.Root
      className={cn('relative flex w-full touch-none items-center select-none', className)}
      {...rest}
    >
      <RadixSlider.Track className="relative h-1 w-full grow rounded-[var(--radius-full)] bg-[var(--bg-active)]">
        <RadixSlider.Range className="absolute h-full rounded-[var(--radius-full)] bg-[var(--accent)]" />
      </RadixSlider.Track>
      {Array.from({ length: thumbCount }, (_unused, index) => (
        <RadixSlider.Thumb key={index} className={THUMB_BASE} />
      ))}
    </RadixSlider.Root>
  );
}
