/**
 * Slider testleri.
 *
 * ⚠️ **SÜRÜKLEME TESTİ YOK ve bu bir eksiklik değil, yazılı bir sınır.**
 * Radix Slider işaretçi konumundan değeri `getBoundingClientRect()` ile
 * hesaplıyor; jsdom **her zaman 0×0** döndürüyor (6.0'da ölçüldü) ve
 * `vitest.setup.ts` geometriyi **bilerek sahtelemiyor** — uydurma bir
 * dikdörtgen, testi bizim uydurduğumuz sayılar üzerinden geçirirdi.
 * Sürükleme doğrulaması gerçek tarayıcı istiyor: **Faz 17** (G-02).
 * Buradaki testler **klavye** yolunu sınıyor — o yol geometriden bağımsız.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Slider } from './slider.js';

describe('Slider — klavye yolu', () => {
  it('`role="slider"` ve ARIA değer öznitelikleri', () => {
    render(<Slider aria-label="Baskı yoğunluğu" defaultValue={[10]} min={0} max={20} />);
    const slider = screen.getByRole('slider');
    expect(slider.getAttribute('aria-valuenow')).toBe('10');
    expect(slider.getAttribute('aria-valuemin')).toBe('0');
    expect(slider.getAttribute('aria-valuemax')).toBe('20');
  });

  it('OK TUŞLARIYLA değer artıyor ve azalıyor — iki yönlü', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Slider
        aria-label="Savunma çizgisi"
        defaultValue={[10]}
        min={0}
        max={20}
        onValueChange={onValueChange}
      />,
    );

    await user.tab();
    expect(screen.getByRole('slider')).toBe(document.activeElement);

    await user.keyboard('{ArrowRight}');
    expect(onValueChange).toHaveBeenLastCalledWith([11]);

    await user.keyboard('{ArrowLeft}');
    expect(onValueChange).toHaveBeenLastCalledWith([10]);
  });

  it('Home / End uçlara götürüyor', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Slider aria-label="X" defaultValue={[10]} min={0} max={20} onValueChange={onValueChange} />,
    );

    await user.tab();
    await user.keyboard('{Home}');
    expect(onValueChange).toHaveBeenLastCalledWith([0]);
    await user.keyboard('{End}');
    expect(onValueChange).toHaveBeenLastCalledWith([20]);
  });

  it('TOPUZ SAYISI DEĞERDEN türetiliyor — aralık seçicide iki topuz', () => {
    const { unmount } = render(<Slider aria-label="Tek" defaultValue={[5]} />);
    expect(screen.getAllByRole('slider')).toHaveLength(1);
    unmount();

    render(<Slider aria-label="Aralık" defaultValue={[5, 15]} min={0} max={20} />);
    expect(screen.getAllByRole('slider')).toHaveLength(2);
  });
});
