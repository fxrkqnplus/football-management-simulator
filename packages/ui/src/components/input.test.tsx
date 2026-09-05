import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Input } from './input.js';

describe('Input', () => {
  it('yazılabiliyor ve değeri taşıyor', async () => {
    const user = userEvent.setup();
    render(<Input aria-label="Oyuncu adı" />);

    const input = screen.getByRole('textbox', { name: 'Oyuncu adı' });
    await user.type(input, 'Şükrü');
    expect(input).toHaveProperty('value', 'Şükrü');
  });

  it('`invalid` HEM kenarlığı HEM `aria-invalid`i değiştiriyor — iki kanal', () => {
    const { rerender } = render(<Input aria-label="E-posta" />);
    // Ölçüm: geçerli hâlde `aria-invalid` HİÇ YOK (false değil, yok) —
    // `undefined` verilmesinin sebebi bu; `aria-invalid="false"` da bir iddiadır.
    expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBeNull();
    expect(screen.getByRole('textbox').className).toContain('border-[var(--border-default)]');

    rerender(<Input aria-label="E-posta" invalid />);
    expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('textbox').className).toContain('border-[var(--danger)]');
  });

  it('`disabled` iken yazılamıyor', async () => {
    const user = userEvent.setup();
    render(<Input aria-label="Kilitli" disabled />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'abc');
    expect(input).toHaveProperty('value', '');
  });

  it('KLAVYEYLE odaklanabiliyor', async () => {
    const user = userEvent.setup();
    render(<Input aria-label="Arama" />);
    await user.tab();
    expect(screen.getByRole('textbox')).toBe(document.activeElement);
  });
});
