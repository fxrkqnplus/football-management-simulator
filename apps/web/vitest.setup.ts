import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * `apps/web` test kurulumu.
 *
 * NEDEN VAR: kök `vitest.config.ts`'te `globals` KAPALI. React Testing Library
 * otomatik temizliğini global bir `afterEach` kaydederek yapar; globals kapalıyken
 * o kayıt hiç oluşmaz ve RTL bunu **sessizce** geçer. Sonuç, bir testin bıraktığı
 * DOM'un bir sonrakine sızması ve `getByTestId`'nin "found multiple elements"
 * demesidir — belirti testin kendisiyle ilgisiz göründüğü için pahalı bir hata
 * sınıfı. Temizliği burada açıkça bağlıyoruz.
 *
 * Bu dosya bilerek `src/` DIŞINDA: test altyapısıdır, ürün kodu değildir ve
 * kapsam raporunun paydasına girmemelidir — `coverage.include` deseni yalnızca
 * paket köklerinin altındaki `src` ağacını alır. Tip denetimine dahil edilmesi
 * için `apps/web/tsconfig.json` `include` dizisinde adıyla listelenir —
 * `vite.config.ts` ile aynı desen.
 */
afterEach(() => {
  cleanup();
});
