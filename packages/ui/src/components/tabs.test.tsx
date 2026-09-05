import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs.js';

function Fixture() {
  return (
    <Tabs defaultValue="genel">
      <TabsList aria-label="Oyuncu detayı">
        <TabsTrigger value="genel">Genel</TabsTrigger>
        <TabsTrigger value="nitelikler">Nitelikler</TabsTrigger>
        <TabsTrigger value="istatistik">İstatistik</TabsTrigger>
      </TabsList>
      <TabsContent value="genel">Genel panel</TabsContent>
      <TabsContent value="nitelikler">Nitelik paneli</TabsContent>
      <TabsContent value="istatistik">İstatistik paneli</TabsContent>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('yalnızca AKTİF panel çiziliyor', () => {
    render(<Fixture />);
    expect(screen.getByText('Genel panel')).toBeDefined();
    expect(screen.queryByText('Nitelik paneli')).toBeNull();
  });

  it('tıklamayla sekme değişiyor', async () => {
    const user = userEvent.setup();
    render(<Fixture />);

    await user.click(screen.getByRole('tab', { name: 'Nitelikler' }));
    expect(screen.getByText('Nitelik paneli')).toBeDefined();
    expect(screen.queryByText('Genel panel')).toBeNull();
  });

  it('OK TUŞLARIYLA gezinilebiliyor', async () => {
    const user = userEvent.setup();
    render(<Fixture />);

    await user.tab();
    expect(screen.getByRole('tab', { name: 'Genel' })).toBe(document.activeElement);

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Nitelikler' })).toBe(document.activeElement);
    expect(screen.getByText('Nitelik paneli')).toBeDefined();
  });

  it('AKTİF sekme İKİ kanalla gösteriliyor — `data-state` + kenarlık sınıfı', () => {
    render(<Fixture />);
    const active = screen.getByRole('tab', { name: 'Genel' });
    expect(active.getAttribute('data-state')).toBe('active');
    // Renk TEK BAŞINA yeterli değil (§7.2'nin ölçülmüş ilkesi): alt çizgi de var.
    expect(active.className).toContain('data-[state=active]:border-[var(--accent)]');
  });
});
