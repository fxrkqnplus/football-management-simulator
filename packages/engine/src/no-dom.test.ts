import { describe, expect, it } from 'vitest';

/**
 * Motorun çalışma ortamı sözleşmesi — K3.
 *
 * NEDEN VAR: Faz 2.0b'de Vitest'e DOM ortamı (`jsdom`) girdi. Ortam **proje
 * başına** ayarlanıyor: `web` ve `ui` DOM'da, geri kalan her şey `node`'da.
 * Bu ayrım tek bir satırla ve kazara bozulabilir — biri `vitest.config.ts`'te
 * kök seviyesine `environment: 'jsdom'` yazarsa motor da DOM'a taşınır,
 * hiçbir şey kırılmaz, ve motor "tarayıcıda varım" varsayan bir kod
 * yazıldığında bunu **testler yakalamaz**. Bu dosya o sessizliği bozar.
 *
 * Tip seviyesinde birinci savunma zaten var: `packages/engine/tsconfig.json`
 * `types: []` ve `lib: ["ES2024"]` taşıyor, yani motor kaynağında `document`
 * yazmak derlenmez bile. Aşağıdaki kontrol o savunmanın **çalışma zamanı**
 * tamamlayıcısı — testin kendi ortamının gerçekten DOM'suz olduğunu ölçer.
 *
 * `globalThis` üzerinden köşeli parantezle okunuyor çünkü motorun tsconfig'i
 * DOM lib'ini tanımıyor: `document` bir tanımlayıcı olarak yazılamaz.
 */
const globals = globalThis as unknown as Record<string, unknown>;

describe('motor çalışma ortamı (K3)', () => {
  it('DOM globalleri yok — motor tarayıcı varsaymaz', () => {
    expect(globals['document']).toBeUndefined();
    expect(globals['window']).toBeUndefined();
  });

  // NOT: `navigator` BİLEREK kontrol edilmiyor. İlk yazımda listeye eklenmişti;
  // ölçüm çürüttü: Node 21'den beri `navigator` **Node'da da global** (Node
  // 24.19.0'da `typeof navigator === 'object'`). Yani `navigator`ın varlığı
  // DOM göstergesi DEĞİL. `document` ve `window` ise Node'da tanımsız kalır ve
  // ayrımı gerçekten taşıyan ikili budur.

  it('node ortamında koşuyor', () => {
    expect(typeof globals['process']).toBe('object');
  });
});
