import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderWithI18n, testText } from '../test/render.js';
import {
  Sheet,
  SHEET_KEYS,
  SHEET_SIDE_CLASSES,
  SHEET_SIDES,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from './sheet.js';

function Fixture({ side }: { side?: 'top' | 'right' | 'bottom' | 'left' }) {
  return (
    <Sheet>
      <SheetTrigger>Filtreler</SheetTrigger>
      <SheetContent {...(side === undefined ? {} : { side })}>
        <SheetTitle>Filtreler</SheetTitle>
      </SheetContent>
    </Sheet>
  );
}

describe('kenar envanteri — sayı LİSTEDEN türetiliyor', () => {
  it('dört kenar var ve hiçbiri tekrarlamıyor', () => {
    expect(new Set(SHEET_SIDES).size).toBe(SHEET_SIDES.length);
    expect(SHEET_SIDES).toHaveLength(4);
  });

  it('HER kenarın bir stil karşılığı var — kapsayıcılık ayrıca iddia ediliyor', () => {
    expect(Object.keys(SHEET_SIDE_CLASSES).sort()).toEqual([...SHEET_SIDES].sort());
    for (const side of SHEET_SIDES) expect(SHEET_SIDE_CLASSES[side].trim()).not.toBe('');
  });
});

describe('Sheet', () => {
  it('DIALOG ile aynı ROLÜ taşıyor — ayrı bileşen, aynı anlam', async () => {
    const user = userEvent.setup();
    renderWithI18n(<Fixture />);

    await user.click(screen.getByRole('button', { name: 'Filtreler' }));
    expect(await screen.findByRole('dialog')).toBeDefined();
  });

  it('varsayılan kenar `right` ve `data-side` ile GÖRÜNÜR', async () => {
    const user = userEvent.setup();
    renderWithI18n(<Fixture />);
    await user.click(screen.getByRole('button', { name: 'Filtreler' }));

    expect((await screen.findByRole('dialog')).getAttribute('data-side')).toBe('right');
  });

  it('HER kenar çiziliyor ve kendi sınıfını taşıyor', async () => {
    for (const side of SHEET_SIDES) {
      const user = userEvent.setup();
      const { unmount } = renderWithI18n(<Fixture side={side} />);
      await user.click(screen.getByRole('button', { name: 'Filtreler' }));

      const panel = await screen.findByRole('dialog');
      expect(panel.getAttribute('data-side')).toBe(side);
      const firstClass = SHEET_SIDE_CLASSES[side].split(' ')[0] ?? '';
      expect(panel.className).toContain(firstClass);
      unmount();
    }
  });

  it('kapatma etiketi KENDİ anahtarından — Dialog’unkini paylaşmıyor', async () => {
    const user = userEvent.setup();
    renderWithI18n(<Fixture />);
    await user.click(screen.getByRole('button', { name: 'Filtreler' }));

    expect(await screen.findByRole('button', { name: testText(SHEET_KEYS.close) })).toBeDefined();
    expect(SHEET_KEYS.close).not.toBe('common:ui.dialog.close');
  });

  it('Esc KAPATIYOR', async () => {
    const user = userEvent.setup();
    renderWithI18n(<Fixture />);
    await user.click(screen.getByRole('button', { name: 'Filtreler' }));
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
