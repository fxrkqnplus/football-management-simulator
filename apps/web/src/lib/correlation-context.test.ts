import { isCorrelationId } from '@fms/shared';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  currentCorrelationId,
  rememberCorrelationId,
  resetCorrelationContextForTests,
} from './correlation-context.js';

/**
 * Tarayıcı `correlationId` bağlamı testleri — Karar 19 (2.6).
 *
 * Modül düzeyi durum tutuyor, bu yüzden her test öncesi sıfırlanıyor: aksi
 * hâlde bir testin kimliği diğerine sızar ve "taze üretiliyor mu" iddiası
 * yanlış sebeple geçerdi.
 */

beforeEach(() => {
  resetCorrelationContextForTests();
});

describe('currentCorrelationId', () => {
  it('hiç istek yapılmamışken TAZE ve geçerli bir kimlik üretiyor', () => {
    const id = currentCorrelationId();
    expect(isCorrelationId(id)).toBe(true);
  });

  it('üretilen kimliği HATIRLIYOR — aynı çökme iki kimlik göstermiyor', () => {
    // Kimlik ekranda gösteriliyor ve kullanıcı onu bize okuyacak. İki çağrı
    // iki farklı değer verseydi hangisini söylediği belirsiz olurdu.
    expect(currentCorrelationId()).toBe(currentCorrelationId());
  });

  it('son isteğin kimliğini döndürüyor', () => {
    rememberCorrelationId('istek-1');
    expect(currentCorrelationId()).toBe('istek-1');
  });

  it('EN SON isteği tutuyor, geçmiş biriktirmiyor', () => {
    rememberCorrelationId('istek-1');
    rememberCorrelationId('istek-2');
    expect(currentCorrelationId()).toBe('istek-2');
  });

  it('taze üretimden SONRA gelen istek kimliği onu eziyor', () => {
    const uretilen = currentCorrelationId();
    rememberCorrelationId('istek-1');

    expect(currentCorrelationId()).toBe('istek-1');
    expect(currentCorrelationId()).not.toBe(uretilen);
  });
});

describe('resetCorrelationContextForTests', () => {
  it('sıfırlamadan sonra yeni bir kimlik üretiliyor', () => {
    const ilk = currentCorrelationId();
    resetCorrelationContextForTests();

    expect(currentCorrelationId()).not.toBe(ilk);
  });
});
