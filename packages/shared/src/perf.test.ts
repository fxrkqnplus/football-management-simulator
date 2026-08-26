import { Writable } from 'node:stream';

import { describe, expect, it, vi } from 'vitest';

import { ValidationError } from './errors.js';
import { LOG_FORMATS, LOG_LEVELS } from './logger.js';
import { type BudgetReporter, measure } from './perf.js';
import { createServerLogger } from './server/logger.js';

/**
 * Bilerek `performance.now()` üzerinden meşgul bekleme.
 *
 * `setTimeout` KULLANILMIYOR: `measure` eşzamanlı bir fonksiyon ölçüyor,
 * zamanlayıcı ise kontrolü geri verir ve ölçüm 0 ms çıkar. Ölçülen şeyin
 * gerçekten geçen süre olduğunu göstermenin tek yolu CPU'yu meşgul etmek.
 * Sahte zamanlayıcı (`vi.useFakeTimers`) da elendi: `performance.now`u
 * sahtelemek, ölçümün kendisini sahtelemek olurdu — testi yeşile boyar,
 * hiçbir şey kanıtlamaz (2.6 günlük #48'in aynı dersi).
 */
function spin(ms: number): number {
  const startedAt = performance.now();
  let ticks = 0;
  while (performance.now() - startedAt < ms) ticks += 1;
  return ticks;
}

describe('measure — bütçe içindeyken', () => {
  it('SESSİZ: 500 ms bütçe / ~50 ms iş → uyarı YOK', () => {
    // ROADMAP kabul kriteri 5'in ikinci yarısı.
    const onExceeded = vi.fn<BudgetReporter>();

    const result = measure({ name: 'kadro.tablo', budgetMs: 500, onExceeded }, () => spin(50));

    expect(onExceeded).not.toHaveBeenCalled();
    expect(result.exceeded).toBe(false);
    expect(result.budgetMs).toBe(500);
    expect(result.durationMs).toBeGreaterThanOrEqual(50);
    expect(result.durationMs).toBeLessThan(500);
  });

  it('ölçülen fonksiyonun dönüş değerini yutmuyor', () => {
    const result = measure({ name: 'x', budgetMs: 1000 }, () => 'sonuç');
    expect(result.value).toBe('sonuç');
  });
});

describe('measure — bütçe aşımında', () => {
  it('UYARI: 1 ms bütçe / ~50 ms iş → bildirici çağrılıyor', () => {
    // ROADMAP kabul kriteri 5'in birinci yarısı.
    const onExceeded = vi.fn<BudgetReporter>();

    const result = measure({ name: 'kadro.tablo', budgetMs: 1, onExceeded }, () => spin(50));

    expect(onExceeded).toHaveBeenCalledTimes(1);
    expect(result.exceeded).toBe(true);

    const reported = onExceeded.mock.calls[0]?.[0];
    expect(reported?.name).toBe('kadro.tablo');
    expect(reported?.budgetMs).toBe(1);
    expect(reported?.durationMs).toBeGreaterThan(1);
    expect(reported?.exceeded).toBe(true);
  });

  it('bildirici verilmese bile ihlal KAYBOLMUYOR — dönüş değerinde taşınıyor', () => {
    // Bildiriciyi zorunlu kılmadık; bunun karşılığında bayrak her zaman
    // dönüyor. Sessizce yutulan bir bütçe aşımı bu kapının en kötü hâli olurdu.
    const result = measure({ name: 'x', budgetMs: 1 }, () => spin(20));
    expect(result.exceeded).toBe(true);
  });

  it('uyarı GERÇEK `logger.warn` üzerinden gidiyor (K8)', () => {
    const chunks: string[] = [];
    const stream = new Writable({
      write(chunk: Buffer | string, _encoding, callback): void {
        chunks.push(String(chunk));
        callback();
      },
    });
    const logger = createServerLogger(
      { level: LOG_LEVELS.info, format: LOG_FORMATS.json, name: 'test' },
      stream,
    );

    measure(
      {
        name: 'tur.atlama',
        budgetMs: 1,
        onExceeded: (m) => {
          logger.warn(
            {
              code: 'perf.budgetExceeded',
              metric: m.name,
              durationMs: m.durationMs,
              budgetMs: m.budgetMs,
            },
            'Performans bütçesi aşıldı',
          );
        },
      },
      () => spin(50),
    );

    const line = JSON.parse(chunks.join('').trim()) as Record<string, unknown>;
    expect(line['level']).toBe(40);
    expect(line['code']).toBe('perf.budgetExceeded');
    expect(line['metric']).toBe('tur.atlama');
    expect(Number(line['durationMs'])).toBeGreaterThan(1);
  });
});

describe('measure — eşzamansız iş reddediliyor', () => {
  it('promise dönen fonksiyon `ValidationError` ile kırılıyor', () => {
    // Sessizce "0,1 ms — bütçe içinde" demek, kapının hiç olmamasından kötü.
    expect(() => measure({ name: 'x', budgetMs: 100 }, () => Promise.resolve(1))).toThrow(
      ValidationError,
    );
  });

  it('thenable taklidi de yakalanıyor', () => {
    try {
      measure({ name: 'transfer.arama', budgetMs: 300 }, () => ({ then: () => undefined }));
      expect.unreachable('fırlatmalıydı');
    } catch (error: unknown) {
      expect((error as ValidationError).code).toBe('perf.asyncNotSupported');
      expect((error as ValidationError).context).toEqual({
        name: 'transfer.arama',
        budgetMs: 300,
      });
    }
  });
});
