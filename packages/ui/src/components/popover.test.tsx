import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Popover, PopoverContent, PopoverTrigger } from './popover.js';

function Fixture() {
  return (
    <Popover>
      <PopoverTrigger>Detay</PopoverTrigger>
      <PopoverContent>
        <p>Haftalık ücret</p>
      </PopoverContent>
    </Popover>
  );
}

describe('Popover', () => {
  it('kapalıyken içerik ÇİZİLMİYOR, açılınca çiziliyor — iki yönlü', async () => {
    const user = userEvent.setup();
    render(<Fixture />);

    expect(screen.queryByText('Haftalık ücret')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Detay' }));
    expect(await screen.findByText('Haftalık ücret')).toBeDefined();
  });

  it('Esc KAPATIYOR — klavye yolu', async () => {
    const user = userEvent.setup();
    render(<Fixture />);

    await user.click(screen.getByRole('button', { name: 'Detay' }));
    await screen.findByText('Haftalık ücret');
    await user.keyboard('{Escape}');
    expect(screen.queryByText('Haftalık ücret')).toBeNull();
  });

  it('tetikleyici `aria-expanded` taşıyor ve DEĞİŞİYOR', async () => {
    const user = userEvent.setup();
    render(<Fixture />);

    const trigger = screen.getByRole('button', { name: 'Detay' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await user.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('METİN TAŞIMIYOR — çeviri anahtarı yok, içerik çağırandan', () => {
    // Karşı kontrol: bu bileşen `UI_KEYS`e girmemeli. Bir gün metin kazanırsa
    // `i18n-keys.test.ts` ②'nin YÖN ① testi onu adıyla yakalar.
    render(<Fixture />);
    expect(screen.getByRole('button', { name: 'Detay' })).toBeDefined();
  });
});
