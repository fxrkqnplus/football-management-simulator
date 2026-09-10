/**
 * Dialog testleri.
 *
 * ⚠️ **ODAK TUZAĞI SINANMIYOR.** Radix katmanı `document.body`ye portal ile
 * takıyor ve arka planı `inert`/`aria-hidden` yapıyor; jsdom sekme sırasını ve
 * `inert` semantiğini **tam uygulamıyor**, yani *"Tab modalın dışına
 * çıkamıyor"* burada **kanıtlanamaz**. Testler **varlığı, rolü, `Esc`
 * davranışını ve kapatma düğmesinin adını** sınıyor. Odak tuzağı: **Faz 17**.
 */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderWithI18n, testText } from '../test/render.js';
import {
  Dialog,
  DIALOG_KEYS,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from './dialog.js';

function Fixture() {
  return (
    <Dialog>
      <DialogTrigger>Sözleşmeyi görüntüle</DialogTrigger>
      <DialogContent>
        <DialogTitle>Sözleşme</DialogTitle>
        <DialogDescription>Haftalık ücret ve süre</DialogDescription>
      </DialogContent>
    </Dialog>
  );
}

describe('Dialog', () => {
  it('kapalıyken içerik ÇİZİLMİYOR, açılınca çiziliyor — iki yönlü', async () => {
    const user = userEvent.setup();
    renderWithI18n(<Fixture />);

    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Sözleşmeyi görüntüle' }));
    expect(await screen.findByRole('dialog')).toBeDefined();
  });

  /**
   * ⚠️ **BU TEST BİR MUTASYONDAN SONRA EKLENDİ.** `RadixDialog.Portal` tamamen
   * sökülüp içerik tetikleyicinin yanına çizildiğinde **273 testin hiçbiri
   * kırılmadı**: `screen` sorguları `document.body`nin tamamına baktığı için
   * modal *"bulunuyordu"* — yani portal davranışı **ölçülmüyordu**, yalnızca
   * varsayılıyordu.
   *
   * Portal bir süs değil: modal, tetikleyicinin `overflow`/`z-index` yığma
   * bağlamının **dışına** çıkmak zorunda, yoksa bir kaydırma kabında kırpılır.
   * *"Bir mutasyonun hiçbir şeyi kırmaması"* burada **ikinci** anlamdaydı:
   * mutasyon ölçtüğüm yola dokunmuyordu.
   */
  it('içerik PORTAL ile `document.body`ye takılıyor — render kabının DIŞINDA', async () => {
    const user = userEvent.setup();
    const { container } = renderWithI18n(<Fixture />);

    await user.click(screen.getByRole('button', { name: 'Sözleşmeyi görüntüle' }));
    const dialog = await screen.findByRole('dialog');

    expect(container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });

  it('başlık ve açıklama ARIA ile BAĞLI — ekran okuyucu katmanın ne olduğunu biliyor', async () => {
    const user = userEvent.setup();
    renderWithI18n(<Fixture />);
    await user.click(screen.getByRole('button', { name: 'Sözleşmeyi görüntüle' }));

    const dialog = await screen.findByRole('dialog');
    // Radix `aria-labelledby`/`aria-describedby`yi kendisi bağlıyor; bağın
    // GERÇEKTEN kurulduğunu iddia ediyoruz, "başlık var" demekle yetinmiyoruz.
    const labelledBy = dialog.getAttribute('aria-labelledby');
    const describedBy = dialog.getAttribute('aria-describedby');
    expect(labelledBy).not.toBeNull();
    expect(describedBy).not.toBeNull();
    expect(document.getElementById(labelledBy ?? '')?.textContent).toBe('Sözleşme');
    expect(document.getElementById(describedBy ?? '')?.textContent).toBe('Haftalık ücret ve süre');
  });

  it('kapatma düğmesinin adı ÇEVİRİ ANAHTARINDAN geliyor — sabit metin yok', async () => {
    const user = userEvent.setup();
    renderWithI18n(<Fixture />);
    await user.click(screen.getByRole('button', { name: 'Sözleşmeyi görüntüle' }));

    expect(await screen.findByRole('button', { name: testText(DIALOG_KEYS.close) })).toBeDefined();
  });

  it('çağıran kendi kapatma etiketini verebiliyor', async () => {
    const user = userEvent.setup();
    renderWithI18n(
      <Dialog>
        <DialogTrigger>Aç</DialogTrigger>
        <DialogContent closeLabel="Vazgeç">
          <DialogTitle>Başlık</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByRole('button', { name: 'Aç' }));
    expect(await screen.findByRole('button', { name: 'Vazgeç' })).toBeDefined();
  });

  it('Esc KAPATIYOR — klavye yolu', async () => {
    const user = userEvent.setup();
    renderWithI18n(<Fixture />);
    await user.click(screen.getByRole('button', { name: 'Sözleşmeyi görüntüle' }));
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('kapatma düğmesi KAPATIYOR', async () => {
    const user = userEvent.setup();
    renderWithI18n(<Fixture />);
    await user.click(screen.getByRole('button', { name: 'Sözleşmeyi görüntüle' }));

    await user.click(await screen.findByRole('button', { name: testText(DIALOG_KEYS.close) }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
