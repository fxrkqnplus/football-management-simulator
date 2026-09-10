import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SEMANTIC_TONE_CLASSES, SEMANTIC_TONES } from '../tokens/semantic-tone.js';
import { Badge, BADGE_VARIANT_CLASSES, BADGE_VARIANTS } from './badge.js';

describe('varyant envanteri — sayı LİSTEDEN türetiliyor', () => {
  it('`neutral` + dört anlamsal ton = beş, ve sayı hiçbir yerde elle yazılmıyor', () => {
    expect(BADGE_VARIANTS).toHaveLength(SEMANTIC_TONES.length + 1);
    expect(BADGE_VARIANTS[0]).toBe('neutral');
  });

  it('HER varyantın bir stil karşılığı var — kapsayıcılık ayrıca iddia ediliyor', () => {
    expect(Object.keys(BADGE_VARIANT_CLASSES).sort()).toEqual([...BADGE_VARIANTS].sort());
    for (const variant of BADGE_VARIANTS) {
      expect(BADGE_VARIANT_CLASSES[variant].trim()).not.toBe('');
    }
  });

  it('anlamsal varyantlar TOAST ile AYNI kaynaktan — kopyalanmıyor', () => {
    // ⚠️ Kopyalansaydı iki yüzey bir gün ayrışırdı. Değer eşitliği bunu kapatıyor.
    for (const tone of SEMANTIC_TONES) {
      expect(BADGE_VARIANT_CLASSES[tone]).toBe(SEMANTIC_TONE_CLASSES[tone]);
    }
  });

  it('`neutral` ANLAMSAL BİR RENK DEĞİL — yüzey token’ları kullanıyor', () => {
    // Beşinci bir anlamsal renk icat edilmediğinin karşı kontrolü.
    expect(BADGE_VARIANT_CLASSES.neutral).not.toMatch(/--(info|success|warning|danger)\)/);
    expect(BADGE_VARIANT_CLASSES.neutral).toContain('--bg-elevated');
  });

  it('hiçbir varyantta sabit hex yok', () => {
    for (const variant of BADGE_VARIANTS) {
      expect(BADGE_VARIANT_CLASSES[variant]).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
});

describe('Badge — render', () => {
  it('içerik çağırandan geliyor', () => {
    render(<Badge>Kiralık</Badge>);
    expect(screen.getByText('Kiralık')).toBeDefined();
  });

  it('HER varyant çiziliyor ve kendi sınıfını taşıyor', () => {
    for (const variant of BADGE_VARIANTS) {
      const { unmount } = render(<Badge variant={variant}>Etiket</Badge>);
      const first = BADGE_VARIANT_CLASSES[variant].split(' ')[0] ?? '';
      expect(screen.getByText('Etiket').className).toContain(first);
      unmount();
    }
  });

  it('varsayılan `neutral`', () => {
    render(<Badge>X</Badge>);
    expect(screen.getByText('X').className).toContain('--bg-elevated');
  });
});
