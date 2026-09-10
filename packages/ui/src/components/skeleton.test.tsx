import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Skeleton } from './skeleton.js';

describe('Skeleton', () => {
  it('ERİŞİLEBİLİRLİK AĞACINDAN ÇIKARILMIŞ — anlam taşımıyor', () => {
    render(<Skeleton data-testid="iskelet" className="h-4 w-32" />);
    expect(screen.getByTestId('iskelet').getAttribute('aria-hidden')).toBe('true');
  });

  it('ANİMASYON YOK — `prefers-reduced-motion` kararı 6.8’in işi', () => {
    // ⚠️ "Bir kuralın ateşlenmemesi de bir sonuçtur": iskelet bugün DURUYOR.
    // Bu test o kararı sabitliyor; 6.8 animasyonu eklerken bilinçli olarak
    // buraya dokunmak zorunda kalacak.
    render(<Skeleton data-testid="iskelet" />);
    expect(screen.getByTestId('iskelet').className).not.toContain('animate');
  });

  it('çağıranın ölçüsü uygulanıyor', () => {
    render(<Skeleton data-testid="iskelet" className="h-8 w-8 rounded-full" />);
    const el = screen.getByTestId('iskelet');
    expect(el.className).toContain('h-8');
    expect(el.className).toContain('rounded-full');
    // `tailwind-merge` varsayılan yarıçapı elemiş olmalı.
    expect(el.className).not.toContain('rounded-[var(--radius-md)]');
  });
});
