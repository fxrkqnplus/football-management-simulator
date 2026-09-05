/**
 * ÖN EK SÖZLEŞMESİNİN NÖBETÇİSİ — 6.0 ⑤'in *"nöbetçi ilk anahtarı yazan alt
 * görevde gelir"* sözü burada ödeniyor.
 *
 * ⚠️ **BU TEST ANAHTARIN VAR OLDUĞUNU SINAMAZ — BİÇİMİNİ SINAR.** Karşılığın
 * `apps/web/src/locales/tr/common.json`da bulunduğunu **`pnpm i18n:check`**
 * denetliyor (6.4'te eklenen ikinci kaynak kökü sayesinde). İki ayrı soru, iki
 * ayrı kapı; birini diğerinin yerine saymak D3 yanılsaması olurdu.
 */
import { describe, expect, it } from 'vitest';

import { ALL_UI_KEYS, UI_KEY_PREFIX, UI_KEYS } from './i18n-keys.js';

describe('`common:ui.` ön ek sözleşmesi', () => {
  it('nöbetçi BAKACAK BİR ŞEY buluyor — boş bir envanter onay değildir', () => {
    // SAPMA-024: bakacak bir şey bulamayan kapıya ✅ yazılmaz. 6.0 nöbetçiyi
    // tam bu yüzden ertelemişti (`common.ui` o gün YOKTU).
    expect(ALL_UI_KEYS.length).toBeGreaterThan(0);
  });

  it('ön ek NOKTA ile bitiyor — `ui` `uiHelper`ı yanlışlıkla yakalamasın', () => {
    // Gerekçe `i18n-dynamic-keys.ts`ten birebir; orada ölçülmüş bir vaka.
    expect(UI_KEY_PREFIX.endsWith('.')).toBe(true);
    expect(UI_KEY_PREFIX).toBe('common:ui.');
  });

  it('HER anahtar ön ekle başlıyor', () => {
    for (const key of ALL_UI_KEYS) expect(key.startsWith(UI_KEY_PREFIX)).toBe(true);
  });

  it('HER anahtar `<bileşenAdı>.<alan>` biçiminde — en az iki parça', () => {
    for (const key of ALL_UI_KEYS) {
      const segments = key.slice(UI_KEY_PREFIX.length).split('.');
      expect(segments.length).toBeGreaterThanOrEqual(2);
      for (const segment of segments) expect(segment).toMatch(/^[a-z][a-zA-Z0-9]*$/);
    }
  });

  it('GRUP ADI ile anahtarın BİLEŞEN PARÇASI aynı — envanter kendi içinde tutarlı', () => {
    // `UI_KEYS.combobox` altındaki bir anahtar `ui.select.` ile başlayamaz;
    // yazım hatası bu satırda görünür olur.
    for (const [group, keys] of Object.entries(UI_KEYS)) {
      for (const key of Object.values(keys)) {
        expect(key.slice(UI_KEY_PREFIX.length).split('.')[0]).toBe(group);
      }
    }
  });

  it('ON BİRİNCİ NAMESPACE AÇILMADI — hepsi `common`da', () => {
    // 6.0 ⑤'in kararı (K12, 5.4 emsali).
    for (const key of ALL_UI_KEYS) expect(key.split(':')[0]).toBe('common');
  });

  it('hiçbir anahtar tekrarlamıyor', () => {
    expect(new Set(ALL_UI_KEYS).size).toBe(ALL_UI_KEYS.length);
  });
});
