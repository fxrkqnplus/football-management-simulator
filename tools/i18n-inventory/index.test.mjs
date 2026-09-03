/**
 * ENVANTER ARACININ KARŞI KONTROLÜ — araç da bir ölçüm aracıdır (D2).
 *
 * *"Kendi yazdığın envanter aracı dahil; karşı kontrolü olmadan sayısı bir
 * umuttur."* Bu dosya iki yönü birden iddia ediyor:
 *   ① **Bilinen bir ihlal listede ÇIKMALI** — özellikle kaba taramanın
 *      kaçırdığı `Tekrar dene` (hiçbir Türkçe'ye özgü karakter taşımıyor).
 *   ② **Bilinen bir ihlal-OLMAYAN listede ÇIKMAMALI** — yorum · `logger`
 *      mesajı · `AppError.message` · teknik nitelik.
 *
 * Yalnızca ① yazılsaydı, **her şeyi ihlal sayan** bozuk bir araç da geçerdi.
 */
import { describe, expect, it } from 'vitest';

import { findBareText, isExempt, looksLikeProse } from './index.mjs';

describe('POZİTİF — gerçek ihlaller bulunuyor', () => {
  it('kaba taramanın KAÇIRDIĞI vaka bulunuyor: Türkçe karaktersiz metin', () => {
    // ⚠️ Bu, 5.4'ün var oluş sebebi: `Tekrar dene` hiçbir çğışöü taşımıyor,
    // yani Türkçe-karakter araması onu 0 eşleşmeyle geçiyor.
    const source = `export const C = () => <button type="button">Tekrar dene</button>;`;
    const found = findBareText('C.tsx', source);
    expect(found.map((v) => v.text)).toEqual(['Tekrar dene']);
    expect(found[0]?.kind).toBe('jsxText');
  });

  it('kullanıcıya görünen JSX niteliği bulunuyor', () => {
    const source = `export const C = () => <section title="Bu ekran yüklenemedi" />;`;
    expect(findBareText('C.tsx', source).map((v) => v.text)).toEqual(['Bu ekran yüklenemedi']);
  });

  it('koşullu ifadedeki İKİ dal da bulunuyor', () => {
    const source = `export const C = ({ ok }: { ok: boolean }) => <p>{ok ? 'Bitti' : 'Hata oldu'}</p>;`;
    expect(findBareText('C.tsx', source).map((v) => v.text)).toEqual(['Bitti', 'Hata oldu']);
  });
});

describe('NEGATİF — ihlal OLMAYANLAR listede çıkmıyor', () => {
  it('YORUM ihlal değil — K5 arayüz metnini korur, yorumu değil', () => {
    const source = [
      '// Bu bir Türkçe yorum satırı ve ihlal değildir.',
      '/* Blok yorum: kullanıcı bunu görmez. */',
      'export const C = () => <div />;',
    ].join('\n');
    expect(findBareText('C.tsx', source)).toEqual([]);
  });

  it('LOGGER mesajı ihlal değil — geliştirici içindir (K8)', () => {
    const source = `
      import { logger } from './log.js';
      export const C = () => {
        logger.info({ x: 1 }, 'İstek hatayla sonuçlandı');
        return <div />;
      };
    `;
    expect(findBareText('C.tsx', source)).toEqual([]);
  });

  it('AppError.message ihlal değil — SAPMA-010: çevrilmez', () => {
    // `errors.ts`: "message geliştirici içindir: loga ve Sentry'ye gider,
    // çevrilmez, kullanıcıya gösterilmesi hedeflenmez."
    const source = `
      export const C = () => {
        throw new ValidationError({ code: 'a.b', message: 'Gönderilen bilgi geçersiz' });
      };
    `;
    expect(findBareText('C.tsx', source)).toEqual([]);
  });

  it('TEKNİK nitelikler ihlal değil — data-testid, role, className', () => {
    const source = `
      export const C = () => (
        <div data-testid="error-boundary-kok" role="alert" className="hata-kutusu" />
      );
    `;
    expect(findBareText('C.tsx', source)).toEqual([]);
  });

  it('JSX DIŞINDAKİ dize ihlal değil', () => {
    const source = `
      const SABIT = 'Bu bir sabit, arayüzde görünmüyor';
      export const C = () => <div>{SABIT.length}</div>;
    `;
    expect(findBareText('C.tsx', source)).toEqual([]);
  });

  it('SAYI, noktalama ve CSS değeri metin değildir', () => {
    const source = `export const C = () => <p>{'16'}{'—'}{'1.6'}<span>·</span></p>;`;
    expect(findBareText('C.tsx', source)).toEqual([]);
  });
});

describe('yardımcılar', () => {
  it('looksLikeProse en az İKİ harf istiyor', () => {
    expect(looksLikeProse('Tekrar dene')).toBe(true);
    expect(looksLikeProse('ok')).toBe(true);
    expect(looksLikeProse('16')).toBe(false);
    expect(looksLikeProse('—')).toBe(false);
    expect(looksLikeProse('a')).toBe(false);
  });

  it('yalnızca *.test.* muaf — *.spec.* DEĞİL (Faz 17 uçtan uca)', () => {
    expect(isExempt('App.test.tsx')).toBe(true);
    expect(isExempt('App.tsx')).toBe(false);
    expect(isExempt('giris.spec.tsx')).toBe(false);
  });
});
