/**
 * Select testleri.
 *
 * ⚠️ **KONUMLANDIRMA SINANMIYOR.** Radix `ResizeObserver` ve
 * `getBoundingClientRect` istiyor; ilki `vitest.setup.ts`te **ateşlemeyen** bir
 * stub, ikincisi jsdom'da **0×0**. Yani açılan listenin nereye çizildiği bu
 * ortamda **bilinemez** — testler listenin **içeriğini ve klavye davranışını**
 * sınıyor. Konum doğrulaması Faz 17 (G-02) ve Faz 49 (G-05).
 */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithI18n, testText } from '../test/render.js';
import { Select, SELECT_KEYS, SelectContent, SelectItem, SelectTrigger } from './select.js';

function Fixture({ onValueChange = () => undefined }: { onValueChange?: (value: string) => void }) {
  return (
    <Select onValueChange={onValueChange}>
      <SelectTrigger aria-label="Mevki" />
      <SelectContent>
        <SelectItem value="gk">Kaleci</SelectItem>
        <SelectItem value="cb">Stoper</SelectItem>
        <SelectItem value="st">Santrfor</SelectItem>
      </SelectContent>
    </Select>
  );
}

describe('Select', () => {
  it('yer tutucu ÇEVİRİ ANAHTARINDAN geliyor — sabit metin yok', () => {
    renderWithI18n(<Fixture />);
    // `testText` fixture'ın o anahtara verdiği metni döndürüyor; anahtar
    // yeniden adlandırılırsa İKİSİ BİRDEN değişir, yani test yalan söyleyemez.
    expect(screen.getByRole('combobox').textContent).toContain(testText(SELECT_KEYS.placeholder));
  });

  it('çağıran kendi yer tutucusunu verebiliyor', () => {
    renderWithI18n(
      <Select>
        <SelectTrigger aria-label="Mevki" placeholder="Bir mevki seç" />
        <SelectContent>
          <SelectItem value="gk">Kaleci</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByRole('combobox').textContent).toContain('Bir mevki seç');
  });

  it('kapalıyken liste ÇİZİLMİYOR, açılınca çiziliyor — iki yönlü', async () => {
    const user = userEvent.setup();
    renderWithI18n(<Fixture />);

    expect(screen.queryByRole('option', { name: 'Kaleci' })).toBeNull();
    await user.click(screen.getByRole('combobox'));
    expect(await screen.findByRole('option', { name: 'Kaleci' })).toBeDefined();
  });

  it('KLAVYEYLE açılıyor ve seçiliyor', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderWithI18n(<Fixture onValueChange={onValueChange} />);

    await user.tab();
    expect(screen.getByRole('combobox')).toBe(document.activeElement);

    await user.keyboard('{Enter}');
    await screen.findByRole('option', { name: 'Kaleci' });

    await user.keyboard('{ArrowDown}{Enter}');
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it('Esc listeyi kapatıyor', async () => {
    const user = userEvent.setup();
    renderWithI18n(<Fixture />);

    await user.click(screen.getByRole('combobox'));
    await screen.findByRole('option', { name: 'Kaleci' });
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('option', { name: 'Kaleci' })).toBeNull();
  });
});
