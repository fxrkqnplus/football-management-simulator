/**
 * Avatar testleri.
 *
 * ⚠️ **jsdom GÖRSEL YÜKLEMİYOR** — `AvatarImage` `onLoad`/`onError` bekliyor
 * ve jsdom hiçbirini tetiklemiyor, yani bu ortamda avatar **her zaman yedeğe
 * düşüyor**. Bu gizlenmiyor, **iddia ediliyor**: *"görsel gerçekten çiziliyor"*
 * burada **kanıtlanamaz** — **Faz 17** (G-02), görsel doğrulama **Faz 49**.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Avatar, AvatarFallback, AvatarImage } from './avatar.js';

describe('Avatar', () => {
  it('YEDEK çiziliyor — görsel yüklenemediğinde boş kalmıyor', async () => {
    render(
      <Avatar>
        <AvatarImage src="/yok.png" alt="Oyuncu portresi" />
        <AvatarFallback>ŞK</AvatarFallback>
      </Avatar>,
    );
    expect(await screen.findByText('ŞK')).toBeDefined();
  });

  it('ORTAM SINIRI ADIYLA: jsdom’da görsel HİÇ çizilmiyor', () => {
    // Bu bir kusur değil, ölçülmüş bir sınır. İddia edilmezse bir sonraki
    // okuyucu "yedek testi geçiyor, demek ki görsel de çalışıyor" sanar.
    render(
      <Avatar>
        <AvatarImage src="/yok.png" alt="Oyuncu portresi" />
        <AvatarFallback>ŞK</AvatarFallback>
      </Avatar>,
    );
    expect(screen.queryByRole('img', { name: 'Oyuncu portresi' })).toBeNull();
  });

  it('yedek içeriği ÇAĞIRANDAN — bileşen bir şey uydurmuyor', async () => {
    render(
      <Avatar>
        <AvatarFallback>ABC</AvatarFallback>
      </Avatar>,
    );
    expect(await screen.findByText('ABC')).toBeDefined();
  });

  it('çağıranın `className`i uygulanıyor', () => {
    render(
      <Avatar className="h-16" data-testid="kok">
        <AvatarFallback>X</AvatarFallback>
      </Avatar>,
    );
    const root = screen.getByTestId('kok');
    expect(root.className).toContain('h-16');
    // `tailwind-merge` varsayılan yüksekliği elemiş olmalı.
    expect(root.className).not.toContain('h-10');
  });
});
