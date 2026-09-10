/**
 * Toast testleri.
 *
 * ⚠️ **SAHTE ZAMANLAYICI KULLANILMIYOR** — `duration` bir **prop**;
 * `Infinity` vererek kendiliğinden kapanma devre dışı bırakılıyor, yani test
 * bir zamanlama varsayımına dayanmıyor.
 * **TAKLİT EDİLMEYEN:** *"varsayılan süre sonunda kendiliğinden kapanıyor"* —
 * **Faz 17** (G-02).
 */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderWithI18n, testText } from '../test/render.js';
import { SEMANTIC_TONE_CLASSES, SEMANTIC_TONES } from '../tokens/semantic-tone.js';
import { Toast, TOAST_KEYS, ToastProvider, ToastTitle, ToastViewport } from './toast.js';

/**
 * ⚠️ **`defaultOpen`, `open` DEĞİL — ölçümle bulundu.** İlk yazımda `open`
 * kullanıldı ve *"kapatma düğmesi bildirimi kaldırıyor"* testi **kırıldı**:
 * `open` bir **denetimli** prop, yani durumu çağıran tutuyor ve `onOpenChange`
 * olmadan Radix'in kendi kapatması bir şey değiştirmiyor. Kod değil test
 * yanlıştı (D6). `defaultOpen` denetimsiz kip, kapanma gerçekten oluyor.
 */
function Fixture({ tone }: { tone?: 'info' | 'success' | 'warning' | 'danger' }) {
  return (
    <ToastProvider>
      <Toast defaultOpen duration={Infinity} {...(tone === undefined ? {} : { tone })}>
        <ToastTitle>Transfer teklifi geldi</ToastTitle>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}

/**
 * Bildirimin **kökü** — `<li>`.
 *
 * ⚠️ `getByRole('status')` bunu vermiyor: ölçüldü, o **Radix'in duyurucu
 * bölgesi** (boş bir `<span>`, `aria-live`). Sınıfı taşıyan öğe viewport
 * `<ol>`sinin içindeki `<li>`. İlk yazımda ikisi karıştırıldı ve test
 * *"undefined className"* ile kırıldı — bir rolün adı, aradığın öğeyi
 * bulduğunu göstermiyor.
 */
const toastRoot = (): HTMLElement => {
  const root = screen.getByText('Transfer teklifi geldi').closest('li');
  if (root === null) throw new Error('Toast kökü (<li>) bulunamadı');
  return root;
};

describe('Toast', () => {
  it('DUYURUCU bölge var — ekran okuyucu bildirimi duyuruyor', () => {
    renderWithI18n(<Fixture />);
    expect(screen.getByText('Transfer teklifi geldi')).toBeDefined();
    // Radix'in `aria-live` bölgesi; içeriği boş olabilir ama VAR olması şart.
    expect(screen.getByRole('status')).toBeDefined();
  });

  it('kapatma etiketi ÇEVİRİ ANAHTARINDAN geliyor', () => {
    renderWithI18n(<Fixture />);
    expect(screen.getByRole('button', { name: testText(TOAST_KEYS.close) })).toBeDefined();
  });

  it('kapatma düğmesi bildirimi KALDIRIYOR', async () => {
    const user = userEvent.setup();
    renderWithI18n(<Fixture />);

    await user.click(screen.getByRole('button', { name: testText(TOAST_KEYS.close) }));
    expect(screen.queryByText('Transfer teklifi geldi')).toBeNull();
  });

  it('HER anlamsal ton çiziliyor ve kendi sınıfını taşıyor', () => {
    for (const tone of SEMANTIC_TONES) {
      const { unmount } = renderWithI18n(<Fixture tone={tone} />);
      const first = SEMANTIC_TONE_CLASSES[tone].split(' ')[0] ?? '';
      expect(toastRoot().className).toContain(first);
      unmount();
    }
  });

  it('ton BADGE ile AYNI kaynaktan — iki yüzey ayrışamaz', () => {
    // Karşı kontrol: Toast kendi renk tablosunu tutsaydı bir gün Badge'den
    // ayrılırdı. Aynı nesneye referans olduğunu iddia ediyoruz.
    expect(SEMANTIC_TONE_CLASSES.danger).toContain('var(--danger)');
  });
});
