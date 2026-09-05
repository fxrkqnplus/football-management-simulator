import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithI18n, testText } from '../test/render.js';
import {
  Combobox,
  COMBOBOX_KEYS,
  type ComboboxOption,
  filterOptions,
  nextEnabledIndex,
} from './combobox.js';

const OPTIONS: readonly ComboboxOption[] = [
  { value: 'tur', label: 'Türkiye' },
  { value: 'eng', label: 'İngiltere' },
  { value: 'esp', label: 'İspanya' },
  { value: 'ita', label: 'İtalya', disabled: true },
];

describe('filterOptions — saf', () => {
  it('boş sorgu her şeyi döndürüyor', () => {
    expect(filterOptions(OPTIONS, '   ')).toHaveLength(OPTIONS.length);
  });

  it('alt dizeyle filtreliyor, büyük/küçük harf fark etmiyor', () => {
    expect(filterOptions(OPTIONS, 'iSPA').map((o) => o.value)).toEqual(['esp']);
  });

  it('DİLDEN BAĞIMSIZ küçültme — Türkçe kuralı `Inter` aramasını kaçırırdı', () => {
    // Karşı kontrol: Türkçe `toLocaleLowerCase('tr')` `I` → `ı` yapar ve
    // `Inter`i `inter` yerine `ınter` sanardı. Karışık dilli veri (kulüp adları)
    // bu yüzden dilden bağımsız küçültme istiyor.
    const mixed: ComboboxOption[] = [{ value: 'int', label: 'Inter' }];
    expect(filterOptions(mixed, 'inter')).toHaveLength(1);
    expect('Inter'.toLocaleLowerCase('tr')).not.toBe('inter');
  });
});

describe('nextEnabledIndex — saf', () => {
  it('devre dışı öğeyi ATLIYOR', () => {
    // 2 (esp) → ileri: 3 (ita, devre dışı) atlanır → 0 (tur)
    expect(nextEnabledIndex(OPTIONS, 2, 1)).toBe(0);
  });

  it('geriye doğru sarıyor — negatif modülo tuzağı', () => {
    // JS'te `-1 % 4` **-1** verir; düzeltme olmasaydı `options[-1]` undefined olurdu.
    expect(nextEnabledIndex(OPTIONS, 0, -1)).toBe(2);
  });

  it('boş listede -1', () => {
    expect(nextEnabledIndex([], 0, 1)).toBe(-1);
  });

  it('hepsi devre dışıysa -1', () => {
    expect(nextEnabledIndex([{ value: 'a', label: 'A', disabled: true }], 0, 1)).toBe(-1);
  });
});

describe('Combobox — render', () => {
  it('arama etiketi ve boş metni ÇEVİRİ ANAHTARINDAN geliyor', async () => {
    const user = userEvent.setup();
    renderWithI18n(<Combobox options={OPTIONS} triggerLabel="Ülke" />);

    await user.click(screen.getByRole('combobox', { name: 'Ülke' }));
    expect(
      await screen.findByRole('textbox', { name: testText(COMBOBOX_KEYS.searchLabel) }),
    ).toBeDefined();

    await user.keyboard('zzzz');
    expect(screen.getByRole('option', { name: testText(COMBOBOX_KEYS.empty) })).toBeDefined();
  });

  it('yazınca liste daralıyor', async () => {
    const user = userEvent.setup();
    renderWithI18n(<Combobox options={OPTIONS} triggerLabel="Ülke" />);

    await user.click(screen.getByRole('combobox', { name: 'Ülke' }));
    expect(await screen.findAllByRole('option')).toHaveLength(4);

    await user.keyboard('spa');
    expect(screen.getAllByRole('option')).toHaveLength(1);
  });

  it('OK TUŞU + Enter ile seçiliyor — devre dışı öğe seçilemiyor', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderWithI18n(
      <Combobox options={OPTIONS} triggerLabel="Ülke" onValueChange={onValueChange} />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Ülke' }));
    await screen.findAllByRole('option');

    // 0 (tur) → ArrowDown → 1 (eng)
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onValueChange).toHaveBeenCalledWith('eng');
  });

  it('seçilen etiket tetikleyicide görünüyor', () => {
    renderWithI18n(<Combobox options={OPTIONS} triggerLabel="Ülke" value="tur" />);
    expect(screen.getByRole('combobox', { name: 'Ülke' }).textContent).toContain('Türkiye');
  });

  it('hiçbir şey seçilmemişken yer tutucu ÇEVİRİDEN geliyor', () => {
    renderWithI18n(<Combobox options={OPTIONS} triggerLabel="Ülke" />);
    expect(screen.getByRole('combobox', { name: 'Ülke' }).textContent).toContain(
      testText(COMBOBOX_KEYS.placeholder),
    );
  });
});
