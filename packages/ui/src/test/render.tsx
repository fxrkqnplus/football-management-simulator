/**
 * Test yardımcısı — i18next sağlayıcısıyla render.
 *
 * ⚠️ **KAYNAKLAR `UI_KEYS`TEN TÜRETİLİYOR, ELLE YAZILMIYOR.** Bir anahtar
 * yeniden adlandırılırsa fixture **kendiliğinden** uyar; iki liste bir gün
 * ayrışamaz. Değerler test metnidir, çeviri değil — testler Türkçe karşılığı
 * değil, **anahtarın çözüldüğünü** sınıyor.
 *
 * ⚠️ **BU YARDIMCI ANAHTARIN VAR OLDUĞUNU KANITLAMAZ** ve bu bilinçli bir
 * iş bölümü: karşılığın `apps/web/src/locales/tr/common.json`da gerçekten
 * bulunduğunu **`pnpm i18n:check`** denetliyor (6.4'te eklenen ikinci kaynak
 * kökü sayesinde). Burada gerçek çeviri dosyasını okumak, `packages/ui`yi
 * `apps/web`e bağlardı — `CLAUDE.md` §2.4'ün yasakladığı yön.
 *
 * ⚠️ `vi.mock('react-i18next')` **kullanılmadı**: sahte bir `t` her dizeyi
 * geri döndürür ve `useTranslation`ın sağlayıcı olmadan çalışmadığını hiç
 * sınamaz. Gerçek bir i18next örneği, bileşenin gerçek entegrasyonunu sınıyor.
 */
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import i18next, { type i18n as I18nInstance } from 'i18next';
import type { ReactElement } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';

import { ALL_UI_KEYS, UI_KEY_PREFIX } from '../components/i18n-keys.js';

/** `common:ui.select.placeholder` → `['select', 'placeholder']` */
function pathOf(key: string): string[] {
  return key.slice(UI_KEY_PREFIX.length).split('.');
}

/**
 * Test metni — anahtarın kendisinden **türetiliyor**.
 *
 * `common:ui.select.placeholder` → `[select.placeholder]`. Bir anahtar yeniden
 * adlandırılırsa beklenen metin de değişir, yani test bayat bir dizeye karşı
 * yeşil kalamaz.
 */
export function testText(key: string): string {
  return `[${pathOf(key).join('.')}]`;
}

/** `ALL_UI_KEYS`ten iç içe bir `common` ağacı üretir — fixture elle yazılmıyor. */
export function buildTestResources(): Record<string, unknown> {
  const ui: Record<string, unknown> = {};

  for (const key of ALL_UI_KEYS) {
    const segments = pathOf(key);
    let node = ui;
    for (const segment of segments.slice(0, -1)) {
      node[segment] ??= {};
      node = node[segment] as Record<string, unknown>;
    }
    const leaf = segments.at(-1);
    if (leaf !== undefined) node[leaf] = testText(key);
  }

  return { ui };
}

let instance: I18nInstance | undefined;

/** Testler arasında paylaşılan tek i18next örneği. */
export function testI18n(): I18nInstance {
  if (instance !== undefined) return instance;

  const created = i18next.createInstance();
  void created.use(initReactI18next).init({
    lng: 'tr',
    fallbackLng: 'tr',
    defaultNS: 'common',
    ns: ['common'],
    resources: { tr: { common: buildTestResources() } },
    interpolation: { escapeValue: false },
  });

  instance = created;
  return created;
}

/** `render` — i18next sağlayıcısıyla sarmalanmış. */
export function renderWithI18n(ui: ReactElement, options?: RenderOptions): RenderResult {
  return render(<I18nextProvider i18n={testI18n()}>{ui}</I18nextProvider>, options);
}
