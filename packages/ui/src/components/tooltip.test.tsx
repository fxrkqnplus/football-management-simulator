/**
 * Tooltip testleri.
 *
 * ⚠️ **SAHTE ZAMANLAYICI KULLANILMIYOR** — gerekçe `tooltip.tsx`te:
 * `delayDuration={0}` gecikmeyi bir **prop** üzerinden kaldırıyor, yani gerçek
 * kod yolu değişmiyor. `vi.useFakeTimers()` `user-event` ile kilitleniyor ve
 * kaçışı (`advanceTimers`) teste bir **zamanlama varsayımı** eklerdi.
 * **TAKLİT EDİLMEYEN:** *"varsayılan gecikme gerçekten N ms"* — **Faz 17**.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip.js';

function Fixture() {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger>Kondisyon</TooltipTrigger>
        <TooltipContent>Son maçtan bu yana</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

describe('Tooltip', () => {
  it('kapalıyken içerik ÇİZİLMİYOR', () => {
    render(<Fixture />);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('KLAVYE ODAĞIYLA açılıyor — işaretçi tek yol değil', async () => {
    const user = userEvent.setup();
    render(<Fixture />);

    await user.tab();
    expect(screen.getByRole('button', { name: 'Kondisyon' })).toBe(document.activeElement);
    expect(await screen.findByRole('tooltip')).toBeDefined();
  });

  it('odak kaybında KAPANIYOR — iki yönlü', async () => {
    const user = userEvent.setup();
    render(<Fixture />);

    await user.tab();
    await screen.findByRole('tooltip');
    await user.tab();
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('içerik tetikleyiciye ARIA ile BAĞLI', async () => {
    const user = userEvent.setup();
    render(<Fixture />);

    await user.tab();
    await screen.findByRole('tooltip');
    const trigger = screen.getByRole('button', { name: /Kondisyon/ });
    // Radix `aria-describedby` kuruyor; bağın gerçekten olduğunu iddia ediyoruz.
    expect(trigger.getAttribute('aria-describedby')).not.toBeNull();
  });

  it('SAĞLAYICI ZORUNLU — olmadan çalışma zamanında kırılıyor', () => {
    // Karşı kontrol: `TooltipProvider`ın dışa aktarılması bir kolaylık değil,
    // bir gereklilik. Bu iddia yazılı olmasaydı bir sonraki okuyucu onu
    // atlayabilir ve hatayı ancak tarayıcıda görürdü.
    expect(() =>
      render(
        <Tooltip>
          <TooltipTrigger>X</TooltipTrigger>
          <TooltipContent>Y</TooltipContent>
        </Tooltip>,
      ),
    ).toThrow();
  });
});
