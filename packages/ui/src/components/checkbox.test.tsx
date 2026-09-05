import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Checkbox } from './checkbox.js';

describe('Checkbox', () => {
  it('`role="checkbox"` ve `aria-checked` taşıyor', () => {
    render(<Checkbox aria-label="Yerli yetiştirme" />);
    const box = screen.getByRole('checkbox', { name: 'Yerli yetiştirme' });
    expect(box.getAttribute('aria-checked')).toBe('false');
  });

  it('tıklamayla değişiyor ve geri dönüyor — iki yönlü', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Kiralık" onCheckedChange={onCheckedChange} />);

    const box = screen.getByRole('checkbox');
    await user.click(box);
    expect(box.getAttribute('aria-checked')).toBe('true');
    await user.click(box);
    expect(box.getAttribute('aria-checked')).toBe('false');
    expect(onCheckedChange).toHaveBeenCalledTimes(2);
  });

  it('KLAVYEYLE (Space) değişiyor', async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="Sözleşmesi bitiyor" />);

    await user.tab();
    expect(screen.getByRole('checkbox')).toBe(document.activeElement);
    await user.keyboard(' ');
    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('true');
  });

  it('BELİRSİZ durum AYRI — "hepsi" ile "bazısı" karışmıyor', () => {
    render(<Checkbox aria-label="Tümü" checked="indeterminate" />);
    const box = screen.getByRole('checkbox');
    // ARIA'nın üçüncü değeri: `true`/`false` değil `mixed`.
    expect(box.getAttribute('aria-checked')).toBe('mixed');
    expect(box.getAttribute('data-state')).toBe('indeterminate');
  });

  it('`disabled` iken tıklama etkisiz', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Kilitli" disabled onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByRole('checkbox'));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
