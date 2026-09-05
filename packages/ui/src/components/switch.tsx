/**
 * Switch — Radix `@radix-ui/react-switch` uyarlaması.
 *
 * ⚠️ **CHECKBOX'TAN FARKI ANLAMSAL, KOZMETİK DEĞİL.** Switch **anında etkili**
 * bir açık/kapalı ayarı içindir (bir "Kaydet" beklemez); Checkbox bir formun
 * parçasıdır. İkisi aynı görünseydi kullanıcı "kaydetmem gerekiyor mu"
 * sorusunu her seferinde sorardı. Radix `role="switch"` veriyor, yani ayrım
 * ekran okuyucuya da geçiyor.
 *
 * ⚠️ **METİN YOK** — durum yalnızca renkle değil **konumla** da taşınıyor
 * (topuz sola/sağa kayıyor), yani renk körlüğünde de okunabilir.
 */
import * as RadixSwitch from '@radix-ui/react-switch';
import type { ComponentPropsWithoutRef, ReactElement } from 'react';

import { cn } from '../lib/cn.js';

const ROOT_BASE =
  'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-[var(--radius-full)] ' +
  'border-2 border-transparent transition-colors duration-[var(--duration-fast)] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' +
  'data-[state=checked]:bg-[var(--accent)] data-[state=unchecked]:bg-[var(--bg-active)]';

const THUMB_BASE =
  'pointer-events-none block h-4 w-4 rounded-full bg-[var(--text-inverse)] shadow-[var(--shadow-sm)] ' +
  'transition-transform duration-[var(--duration-fast)] ' +
  'data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0';

export type SwitchProps = ComponentPropsWithoutRef<typeof RadixSwitch.Root>;

export function Switch({ className, ...rest }: SwitchProps): ReactElement {
  return (
    <RadixSwitch.Root className={cn(ROOT_BASE, className)} {...rest}>
      <RadixSwitch.Thumb className={THUMB_BASE} />
    </RadixSwitch.Root>
  );
}
