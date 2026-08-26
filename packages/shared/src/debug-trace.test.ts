import { Writable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import {
  createDebugTrace,
  DEBUG_TRACE_LOG_CODE,
  isDebugTrace,
  traceToLogContext,
} from './debug-trace.js';
import { ValidationError } from './errors.js';
import { LOG_FORMATS, LOG_LEVELS } from './logger.js';
import { REDACTED } from './redact.js';
import { createServerLogger } from './server/logger.js';

describe('createDebugTrace — spec/09 §11.2 şekli', () => {
  it('spec örneğindeki altı alanı da üretiyor', () => {
    const trace = createDebugTrace<{ decision: string; amount: number }>({
      module: 'ai.transferTarget',
      input: { clubId: 42, position: 'DC', budget: 12_000_000 },
      seed: 'a3f9:412:2871',
    })
      .step('positionNeed', 0.71, 'Derinlik 2/4, yaş riski yüksek')
      .step('qualityUplift', 0.42, 'Hedef CA 148, mevcut en iyi 136')
      .step('targetScore', 0.58)
      .done(
        { decision: 'bid', amount: 7_800_000 },
        'Stoper ihtiyacı yüksek; hedef bütçeye uyuyor ve 12 CA kalite artışı sağlıyor.',
      );

    expect(trace.module).toBe('ai.transferTarget');
    expect(trace.input).toEqual({ clubId: 42, position: 'DC', budget: 12_000_000 });
    expect(trace.steps).toHaveLength(3);
    expect(trace.steps[0]).toEqual({
      name: 'positionNeed',
      value: 0.71,
      reason: 'Derinlik 2/4, yaş riski yüksek',
    });
    expect(trace.output).toEqual({ decision: 'bid', amount: 7_800_000 });
    expect(trace.summary).toContain('Stoper ihtiyacı');
    expect(trace.seed).toBe('a3f9:412:2871');
  });

  it('gerekçesiz adımda `reason` alanı HİÇ kurulmuyor — `undefined` olarak değil', () => {
    // `exactOptionalPropertyTypes` açık; `{ reason: undefined }` sözleşmeyi bozar
    // ve JSON çıktısına boş bir alan sızdırır.
    const trace = createDebugTrace<number>({ module: 'm' }).step('a', 1).done(1, 'özet');
    expect(Object.prototype.hasOwnProperty.call(trace.steps[0], 'reason')).toBe(false);
  });

  it('tohum verilmezse `seed` alanı hiç kurulmuyor', () => {
    const trace = createDebugTrace<number>({ module: 'm' }).done(1, 'özet');
    expect(Object.prototype.hasOwnProperty.call(trace, 'seed')).toBe(false);
  });

  it('girdi verilmezse boş nesne oluyor — `undefined` değil', () => {
    const trace = createDebugTrace<number>({ module: 'm' }).done(1, 'özet');
    expect(trace.input).toEqual({});
  });

  it('boş `summary` reddediliyor — gerekçesiz iz K7 değildir', () => {
    const builder = createDebugTrace<number>({ module: 'm' });
    expect(() => builder.done(1, '   ')).toThrow(ValidationError);
    try {
      builder.done(1, '');
    } catch (error: unknown) {
      expect((error as ValidationError).code).toBe('debugTrace.summaryRequired');
    }
  });

  it('boş `module` ve boş adım adı da reddediliyor', () => {
    expect(() => createDebugTrace<number>({ module: '' })).toThrow(ValidationError);
    expect(() => createDebugTrace<number>({ module: 'm' }).step('', 1)).toThrow(ValidationError);
  });

  it('kapandıktan sonra eklenen adım İZİ DEĞİŞTİRMİYOR', () => {
    // İz bir denetim kaydı: sonradan değiştirilmiş bir gerekçe, hiç gerekçe
    // olmamasından kötüdür.
    const builder = createDebugTrace<number>({ module: 'm' }).step('a', 1);
    const trace = builder.done(1, 'özet');
    builder.step('b', 2);
    expect(trace.steps).toHaveLength(1);
    expect(Object.isFrozen(trace)).toBe(true);
    expect(Object.isFrozen(trace.steps)).toBe(true);
  });
});

describe('isDebugTrace', () => {
  it('gerçek izi tanıyor', () => {
    const trace = createDebugTrace<number>({ module: 'm' }).done(1, 'özet');
    expect(isDebugTrace(trace)).toBe(true);
  });

  it.each([
    ['null', null],
    ['dizgi', 'trace'],
    ['sayı', 7],
    ['boş nesne', {}],
    ['steps dizi değil', { module: 'm', summary: 's', steps: 'x', input: {} }],
    ['input null', { module: 'm', summary: 's', steps: [], input: null }],
  ])('%s → false', (_label, value) => {
    expect(isDebugTrace(value)).toBe(false);
  });
});

describe('traceToLogContext — log hattına tek köprü', () => {
  const trace = createDebugTrace<{ decision: string }>({
    module: 'ai.transferTarget',
    input: { clubId: 42, budget: 12_000_000 },
    seed: 'a3f9:412',
  })
    .step('positionNeed', 0.71, 'Derinlik 2/4')
    .step('targetScore', 0.58)
    .done({ decision: 'bid' }, 'Stoper ihtiyacı yüksek.');

  it('girdiyi ve adımları ÖN EKLİ ve DÜZ olarak çıkarıyor', () => {
    expect(traceToLogContext(trace)).toEqual({
      code: DEBUG_TRACE_LOG_CODE,
      module: 'ai.transferTarget',
      seed: 'a3f9:412',
      'input.clubId': 42,
      'input.budget': 12_000_000,
      'step.positionNeed': 0.71,
      'step.positionNeed.reason': 'Derinlik 2/4',
      'step.targetScore': 0.58,
    });
  });

  it('`output` log bağlamına SIZMIYOR', () => {
    // Bilinçli: `output` karmaşık bir nesne olabilir ve redaksiyon sığdır.
    // Bu satır kilidi sabitliyor; ikinci kilit tipte (`LogValue` nesne almaz).
    const context = traceToLogContext(trace);
    expect(Object.keys(context)).not.toContain('output');
    expect(JSON.stringify(context)).not.toContain('bid');
  });

  it('tohumsuz izde `seed` anahtarı hiç yok', () => {
    const bare = createDebugTrace<number>({ module: 'm' }).done(1, 'özet');
    expect(Object.prototype.hasOwnProperty.call(traceToLogContext(bare), 'seed')).toBe(false);
  });
});

describe('REDAKSİYON — iz loglanınca sır sızmıyor (2.2b hattı)', () => {
  /** Yazılan JSON satırlarını toplayan hedef (`server/logger.test.ts` deseni). */
  function captureStream(): { stream: Writable; lines: () => Record<string, unknown>[] } {
    const chunks: string[] = [];
    const stream = new Writable({
      write(chunk: Buffer | string, _encoding, callback): void {
        chunks.push(String(chunk));
        callback();
      },
    });
    return {
      stream,
      lines: () =>
        chunks
          .join('')
          .split('\n')
          .filter((line) => line.trim() !== '')
          .map((line) => JSON.parse(line) as Record<string, unknown>),
    };
  }

  it('`input.password` GERÇEK logger hattından geçince `[REDACTED]` oluyor', () => {
    // ⚠️ BU TESTİN ASIL KONUSU DÜZLEŞTİRME. `redactContext` SIĞDIR: iz olduğu
    // gibi loglansaydı `input.password` redaksiyondan kaçardı (ve zaten
    // `LogValue` iç içe nesne kabul etmediği için derlenmezdi).
    //
    // İddia sahte bir redaksiyonla değil, ÜRETİMDEKİ pino logger'ıyla
    // sınanıyor: `redactContext`i doğrudan çağırmak yalnızca saf fonksiyonu
    // doğrular, KABLOLAMAYI değil (`docs/spec/09` §11.5, 2.3b'nin dersi).
    const { stream, lines } = captureStream();
    const logger = createServerLogger(
      { level: LOG_LEVELS.info, format: LOG_FORMATS.json, name: 'test' },
      stream,
    );

    const trace = createDebugTrace<number>({
      module: 'auth.probe',
      input: { userId: 7, password: 'süper-gizli', refreshToken: 'abc.def' },
    })
      .step('ok', 1)
      .done(1, 'Deneme.');

    logger.info(traceToLogContext(trace), trace.summary);

    const [line] = lines();
    expect(line?.['input.password']).toBe(REDACTED);
    expect(line?.['input.refreshToken']).toBe(REDACTED);
    expect(line?.['input.userId']).toBe(7);
    expect(line?.['msg']).toBe('Deneme.');
    expect(JSON.stringify(lines())).not.toContain('süper-gizli');
  });
});
