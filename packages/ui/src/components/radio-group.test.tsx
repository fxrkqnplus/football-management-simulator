import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RadioGroup, RadioGroupItem } from './radio-group.js';

function Fixture({ onValueChange = () => undefined }: { onValueChange?: (value: string) => void }) {
  return (
    <RadioGroup aria-label="Mentalite" defaultValue="balanced" onValueChange={onValueChange}>
      <RadioGroupItem value="defensive" aria-label="Savunmacı" />
      <RadioGroupItem value="balanced" aria-label="Dengeli" />
      <RadioGroupItem value="attacking" aria-label="Hücumcu" />
    </RadioGroup>
  );
}

describe('RadioGroup', () => {
  it('`role="radiogroup"` ve üç `radio` çiziyor', () => {
    render(<Fixture />);
    expect(screen.getByRole('radiogroup', { name: 'Mentalite' })).toBeDefined();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('varsayılan seçili olan işaretli, diğerleri değil', () => {
    render(<Fixture />);
    expect(screen.getByRole('radio', { name: 'Dengeli' }).getAttribute('aria-checked')).toBe(
      'true',
    );
    expect(screen.getByRole('radio', { name: 'Savunmacı' }).getAttribute('aria-checked')).toBe(
      'false',
    );
  });

  it('Tab grubu SEÇİLİ öğeye odaklıyor — roving tabindex', async () => {
    const user = userEvent.setup();
    render(<Fixture />);

    await user.tab();
    expect(screen.getByRole('radio', { name: 'Dengeli' })).toBe(document.activeElement);
  });

  it('OK TUŞU ODAĞI taşıyor', async () => {
    const user = userEvent.setup();
    render(<Fixture />);

    await user.tab();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: 'Hücumcu' })).toBe(document.activeElement);
  });

  /**
   * ⚠️ **ANAHTAR BASILI TUTULUYOR (`{ArrowDown>}`) ve bu bir ORTAM SINIRI, bir
   * davranış tercihi değil — 6.4'te ölçülerek bulundu (D6).**
   *
   * İlk yazımda test tam basım (`{ArrowDown}`) kullanıyordu ve **kırıldı**:
   * odak taşınıyor ama seçim **takip etmiyordu**. Kod değil ortam yanlıştı.
   * Radix'in mekanizması ölçüldü (`react-radio-group/dist/index.mjs`:338-373):
   * `document` üzerinde bir **keydown** ok tuşunu bayrağa yazıyor, öğe odağı
   * alınca bayrak hâlâ `true` ise `click()` ediyor, ve **keyup** bayrağı
   * sıfırlıyor. `user-event` keydown ile keyup'ı gecikmesiz art arda
   * gönderiyor; roving odak taşıması ise ertelenmiş çalışıyor, yani `focus`
   * olayı **keyup'tan sonra** geliyor ve bayrak çoktan sıfırlanmış oluyor.
   *
   * Üç ölçüm (sonda testiyle, sonra silindi):
   *   · `{ArrowDown}`  (basım + bırakma) → `false,true,false` — seçim YOK
   *   · `{ArrowDown>}` (basılı tutma)    → `false,false,true` — seçim VAR
   *   · `{ArrowDown}` + Space            → `false,false,true` — seçim VAR
   *
   * Gerçek tarayıcıda insan parmağı keyup'ı onlarca milisaniye sonra
   * gönderiyor, yani tam basımda da seçim takip ediyor. **Ama bu ortamda
   * KANITLANAMAZ** ve sahte bir gecikme eklemek testi bir zamanlama
   * varsayımına bağlardı. Tam basım döngüsünün doğrulaması gerçek tarayıcı
   * istiyor: **Faz 17** (G-02, Playwright).
   */
  it('SEÇİM ODAĞI TAKİP EDİYOR — ok tuşu basılıyken (ortam sınırı yukarıda)', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Fixture onValueChange={onValueChange} />);

    await user.tab();
    await user.keyboard('{ArrowDown>}');
    expect(onValueChange).toHaveBeenCalledWith('attacking');
    expect(screen.getByRole('radio', { name: 'Hücumcu' }).getAttribute('aria-checked')).toBe(
      'true',
    );
  });

  it('Space odaklanmış öğeyi seçiyor — klavyenin İKİNCİ yolu', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Fixture onValueChange={onValueChange} />);

    await user.tab();
    await user.keyboard('{ArrowDown}');
    await user.keyboard(' ');
    expect(onValueChange).toHaveBeenCalledWith('attacking');
  });

  it('tıklamayla da seçiliyor', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Fixture onValueChange={onValueChange} />);

    await user.click(screen.getByRole('radio', { name: 'Savunmacı' }));
    expect(onValueChange).toHaveBeenCalledWith('defensive');
  });
});
