/**
 * Sınıf adı birleştirici — `clsx` + `tailwind-merge`.
 *
 * ⚠️ **NEDEN İKİ KÜTÜPHANE, BİRİ DEĞİL.** `clsx` koşullu sınıfları düzleştirir
 * (`cn('a', cond && 'b')`), `tailwind-merge` **çakışan** Tailwind sınıflarını
 * çözer (`cn('px-2', 'px-4')` → `px-4`). İkincisi olmadan bir bileşenin
 * varsayılan sınıfı, çağıranın `className`i ile aynı anda uygulanır ve
 * hangisinin kazandığı **CSS kaynak sırasına** kalır — yani bileşenin
 * davranışı, kullanıcının hiç görmediği bir dosya sırasına bağlı olur.
 *
 * Sürümler `docs/DEPENDENCY-WATCH.md`de; ikisi de 6.0'da registry'den
 * doğrulandı ve `strict-peer-dependencies=true` altında uyumlu.
 */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
