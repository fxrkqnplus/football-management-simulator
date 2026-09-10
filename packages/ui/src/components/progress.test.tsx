import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { indicatorOffsetPercent, Progress } from './progress.js';

describe('indicatorOffsetPercent — saf', () => {
  it('%100 ilerleme → 0 kaydırma, %0 → 100 kaydırma', () => {
    // ⚠️ İlk yazımda formül TERSTİ (dolu çubuk tamamen gizleniyordu); saf
    // fonksiyona ayırmak onu bu iki satırla sabitledi.
    expect(indicatorOffsetPercent(100, 100)).toBe(0);
    expect(indicatorOffsetPercent(0, 100)).toBe(100);
    expect(indicatorOffsetPercent(25, 100)).toBe(75);
  });

  it('`max` farklıysa oran ona göre — 20 üzerinden ölçek', () => {
    // FM'in nitelik ölçeği 1–20; 100 varsayımı yanlış olurdu.
    expect(indicatorOffsetPercent(10, 20)).toBe(50);
  });

  it('aralık DIŞI değerler kırpılıyor — negatif ve taşan', () => {
    expect(indicatorOffsetPercent(-5, 100)).toBe(100);
    expect(indicatorOffsetPercent(150, 100)).toBe(0);
  });

  it('BELİRSİZ (`null`) → 100, yani gösterge GİZLİ', () => {
    // Uydurma bir dolgu göstermek yanlış bilgi olurdu.
    expect(indicatorOffsetPercent(null, 100)).toBe(100);
  });

  it('`max <= 0` çökmüyor, belirsiz sayılıyor', () => {
    expect(indicatorOffsetPercent(5, 0)).toBe(100);
  });
});

describe('Progress — render', () => {
  it('`role="progressbar"` ve ARIA değerleri', () => {
    render(<Progress aria-label="Kondisyon" value={60} />);
    const bar = screen.getByRole('progressbar', { name: 'Kondisyon' });
    expect(bar.getAttribute('aria-valuenow')).toBe('60');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
  });

  it('BELİRSİZ durumda `aria-valuenow` YOK — "bilmiyorum" ekran okuyucuya geçiyor', () => {
    render(<Progress aria-label="Tur işleniyor" />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('data-state')).toBe('indeterminate');
    expect(bar.getAttribute('aria-valuenow')).toBeNull();
  });

  it('gösterge KAYDIRMASI değerden türüyor', () => {
    render(<Progress aria-label="X" value={25} data-testid="kok" />);
    const indicator = screen.getByTestId('kok').firstElementChild as HTMLElement;
    expect(indicator.style.transform).toBe('translateX(-75%)');
  });
});
