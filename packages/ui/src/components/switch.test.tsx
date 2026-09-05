import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Switch } from './switch.js';

describe('Switch', () => {
  it('`role="switch"` — Checkbox ile ANLAMSAL olarak ayrı', () => {
    render(<Switch aria-label="Otomatik kayıt" />);
    // Ayrımın kanıtı: aynı öğe `checkbox` rolüyle BULUNAMIYOR.
    expect(screen.getByRole('switch', { name: 'Otomatik kayıt' })).toBeDefined();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('tıklamayla açılıp kapanıyor — iki yönlü', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Hareketi azalt" onCheckedChange={onCheckedChange} />);

    const toggle = screen.getByRole('switch');
    await user.click(toggle);
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    await user.click(toggle);
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(onCheckedChange).toHaveBeenNthCalledWith(1, true);
    expect(onCheckedChange).toHaveBeenNthCalledWith(2, false);
  });

  it('KLAVYEYLE (Space) değişiyor', async () => {
    const user = userEvent.setup();
    render(<Switch aria-label="Bildirimler" />);
    await user.tab();
    await user.keyboard(' ');
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
  });

  /**
   * ⚠️ **BU TEST 6.4'TE GÜÇLENDİRİLDİ — mutasyon onu ZAYIF buldu.**
   *
   * İlk yazımı yalnızca topuzun `data-state`ini iddia ediyordu. Mutasyon
   * ölçümü şunu gösterdi: topuzun **konum sınıfları**
   * (`data-[state=checked]:translate-x-4` / `…:translate-x-0`) tamamen
   * silindiğinde **211 testin hiçbiri kırılmadı** — yani "durum konumla da
   * taşınıyor" iddiası test edilmiyordu, yalnızca yazılıydı.
   *
   * *"Bir mutasyonun hiçbir şeyi kırmaması üç şey demek olabilir"* — burada
   * üçüncüsü değil **birincisiydi**: nöbetçi yoktu. Şimdi var: iki kanal
   * ayrı ayrı iddia ediliyor — `data-state` (ekran okuyucu ve CSS kancası) ve
   * `translate-x` (renk körlüğünde de okunabilen **konum** kanalı).
   */
  it('durum RENGE EK OLARAK topuz KONUMUYLA da taşınıyor — iki kanal', () => {
    const { rerender } = render(<Switch aria-label="X" checked={false} />);
    const thumbOff = screen.getByRole('switch').firstElementChild;
    expect(thumbOff?.getAttribute('data-state')).toBe('unchecked');
    // İkinci kanal: konum. Sınıf silinirse durum yalnızca renkle kalırdı.
    expect(thumbOff?.className).toContain('data-[state=unchecked]:translate-x-0');
    expect(thumbOff?.className).toContain('data-[state=checked]:translate-x-4');

    rerender(<Switch aria-label="X" checked />);
    const thumbOn = screen.getByRole('switch').firstElementChild;
    expect(thumbOn?.getAttribute('data-state')).toBe('checked');
    expect(thumbOn?.className).toContain('data-[state=checked]:translate-x-4');
  });
});
