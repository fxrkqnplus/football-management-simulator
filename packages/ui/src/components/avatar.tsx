/**
 * Avatar — Radix `@radix-ui/react-avatar` uyarlaması.
 *
 * FM'de oyuncu portresi ve kulüp arması bu bileşenin üstüne oturacak
 * (`PlayerPortrait`, `ClubCrest` → **6.6**). Bu tur yalnızca **taşıyıcıyı**
 * kuruyor: görsel yüklenene kadar bir yedek gösterme davranışı.
 *
 * ⚠️ **`AvatarFallback` GÖRSEL YÜKLENEMEZSE ÇIKAR ve bu bir K9 meselesi.**
 * `DATA_MODE=full` gerçek portreleri istiyor ama *"prosedürel üretim yalnızca
 * eksik varlıklar için yedek olarak çalışır"* diyor — yani eksik varlık
 * **beklenen** bir durum, istisna değil. Yedeğin içeriği çağırandan gelir
 * (baş harfler, prosedürel bir görsel…); bileşen bir şey **uydurmuyor**.
 *
 * ⚠️ **METİN YOK** — `alt` ve yedek içeriği çağırandan.
 *
 * ⚠️ **jsdom SINIRI:** `AvatarImage` gerçek bir görsel **yüklemesine** dayanıyor
 * (`onLoad`/`onError`); jsdom görsel indirmiyor, yani bu ortamda avatar
 * **her zaman yedeğe düşüyor**. Testler bunu **iddia ediyor**, gizlemiyor:
 * *"görsel gerçekten çiziliyor"* burada **kanıtlanamaz** — **Faz 17** (G-02)
 * ve görsel doğrulama **Faz 49** (G-05).
 */
import * as RadixAvatar from '@radix-ui/react-avatar';
import type { ComponentPropsWithoutRef, ReactElement } from 'react';

import { cn } from '../lib/cn.js';

const ROOT_BASE =
  'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-[var(--radius-full)] ' +
  'bg-[var(--bg-elevated)]';

export type AvatarProps = ComponentPropsWithoutRef<typeof RadixAvatar.Root>;
export type AvatarImageProps = ComponentPropsWithoutRef<typeof RadixAvatar.Image>;
export type AvatarFallbackProps = ComponentPropsWithoutRef<typeof RadixAvatar.Fallback>;

export function Avatar({ className, ...rest }: AvatarProps): ReactElement {
  return <RadixAvatar.Root className={cn(ROOT_BASE, className)} {...rest} />;
}

export function AvatarImage({ className, ...rest }: AvatarImageProps): ReactElement {
  return <RadixAvatar.Image className={cn('h-full w-full object-cover', className)} {...rest} />;
}

export function AvatarFallback({ className, ...rest }: AvatarFallbackProps): ReactElement {
  return (
    <RadixAvatar.Fallback
      className={cn(
        'flex h-full w-full items-center justify-center font-[var(--font-ui)] ' +
          'text-[var(--text-sm)] font-medium text-[var(--text-secondary)]',
        className,
      )}
      {...rest}
    />
  );
}
