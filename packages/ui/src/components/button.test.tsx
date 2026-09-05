/**
 * Button testleri — ve **"6" sayısının nereden geldiği**.
 *
 * ⚠️ Bu dosyada `6` **elle yazılmıyor**. ROADMAP *"Button (6 varyant)"* diyor;
 * o sayıyı teste kopyalamak, 6.4-ön'ün §11.5 ve 6.12'de kaldırdığı hatanın
 * aynısı olurdu. Kaynak **`BUTTON_VARIANTS` listesi**; test onun
 * kapsayıcılığını ve ROADMAP'in beklentisini ayrı ayrı iddia ediyor.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './button.js';
import {
  BUTTON_SIZE_CLASSES,
  BUTTON_SIZES,
  BUTTON_VARIANT_CLASSES,
  BUTTON_VARIANTS,
} from './button-variants.js';

describe('varyant envanteri — sayı LİSTEDEN türetiliyor', () => {
  it('ROADMAP altı varyant istiyor ve liste altı taşıyor', () => {
    // İddia listeye karşı: bir varyant eklenir/çıkarılırsa BU test kırılır ve
    // ROADMAP ile kod arasındaki fark görünür olur — sessizce ayrışamazlar.
    expect(BUTTON_VARIANTS).toHaveLength(6);
  });

  it('hiçbir varyant adı tekrarlamıyor', () => {
    expect(new Set(BUTTON_VARIANTS).size).toBe(BUTTON_VARIANTS.length);
  });

  it('HER varyantın bir stil karşılığı var — kapsayıcılık ayrıca iddia ediliyor', () => {
    // `Record<ButtonVariant, string>` bunu tip seviyesinde zaten zorluyor; test
    // ikinci hat çünkü tip, ÇALIŞMA ZAMANINDA boş bir dizeyi engellemiyor.
    for (const variant of BUTTON_VARIANTS) {
      expect(BUTTON_VARIANT_CLASSES[variant].trim()).not.toBe('');
    }
    expect(Object.keys(BUTTON_VARIANT_CLASSES).sort()).toEqual([...BUTTON_VARIANTS].sort());
  });

  it('HER boyutun bir stil karşılığı var', () => {
    expect(Object.keys(BUTTON_SIZE_CLASSES).sort()).toEqual([...BUTTON_SIZES].sort());
  });

  it('renkler TOKEN üzerinden geliyor — hiçbir varyantta sabit hex yok', () => {
    // Sabit bir hex açık temada sessizce yanlış renk demek olurdu.
    for (const variant of BUTTON_VARIANTS) {
      expect(BUTTON_VARIANT_CLASSES[variant]).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
});

describe('render ve davranış', () => {
  it('varsayılan `type` **button** — form içinde kazara gönderim yok', () => {
    render(<Button>Kaydet</Button>);
    expect(screen.getByRole('button')).toHaveProperty('type', 'button');
  });

  it('`type` açıkça verilirse ezilebiliyor', () => {
    render(<Button type="submit">Gönder</Button>);
    expect(screen.getByRole('button')).toHaveProperty('type', 'submit');
  });

  it('her varyant çiziliyor ve kendi sınıfını taşıyor', () => {
    for (const variant of BUTTON_VARIANTS) {
      const { unmount } = render(<Button variant={variant}>Etiket</Button>);
      const button = screen.getByRole('button');
      // Sınıf dizesinin ilk parçası varyanta özgü; tamamını karşılaştırmak
      // `tailwind-merge`in birleştirmesine bağımlı olurdu.
      const firstClass = BUTTON_VARIANT_CLASSES[variant].split(' ')[0] ?? '';
      expect(button.className).toContain(firstClass);
      unmount();
    }
  });

  it('tıklama çağrılıyor, `disabled` iken ÇAĞRILMIYOR — iki yönlü', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    const { unmount } = render(<Button onClick={onClick}>Tıkla</Button>);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
    unmount();

    render(
      <Button onClick={onClick} disabled>
        Tıkla
      </Button>,
    );
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('KLAVYEYLE kullanılabiliyor — Tab ile odak, Enter ile tetikleme', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Tıkla</Button>);

    await user.tab();
    expect(screen.getByRole('button')).toBe(document.activeElement);

    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('çağıranın `className`i varsayılanı EZİYOR — `tailwind-merge` çalışıyor', () => {
    render(<Button className="h-20">Uzun</Button>);
    const className = screen.getByRole('button').className;
    expect(className).toContain('h-20');
    // `md` boyutunun `h-9`u elenmiş olmalı; elenmezse hangisinin kazandığı
    // CSS kaynak sırasına kalırdı.
    expect(className).not.toContain('h-9');
  });
});
