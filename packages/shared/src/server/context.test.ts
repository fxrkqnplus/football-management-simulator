import { setTimeout as delay } from 'node:timers/promises';

import { describe, expect, it } from 'vitest';

import { createCorrelationId } from '../correlation.js';
import { addLogContext, getLogContext, runWithLogContext } from './context.js';

/**
 * `AsyncLocalStorage` bağlam testleri.
 *
 * ⚠️ EŞZAMANLILIK TESTİ BU DOSYANIN ASIL İŞİ.
 * ALS'in en kolay yanlış kurulan yanı budur ve **seri bir test onu yakalamaz**:
 * tek tek çalıştırılan iki istek, paylaşılan bir değişkenle bile doğru sonuç
 * verir. Karışma ancak iki zincir gerçekten iç içe geçtiğinde görünür.
 */

describe('runWithLogContext — temel', () => {
  it('zincir içinde bağlamı döner', () => {
    runWithLogContext({ correlationId: 'abc' }, () => {
      expect(getLogContext()).toEqual({ correlationId: 'abc' });
    });
  });

  it('zincir DIŞINDA boş nesne döner — undefined değil', () => {
    // Çağıran taraf koşulsuz gezinebilmeli; undefined olsaydı her kullanım
    // yerinde bir kontrol gerekirdi.
    expect(getLogContext()).toEqual({});
  });

  it('zincir bitince bağlam kalkar', () => {
    runWithLogContext({ correlationId: 'abc' }, () => {
      expect(getLogContext()['correlationId']).toBe('abc');
    });
    expect(getLogContext()).toEqual({});
  });

  it('await sınırlarını geçer', async () => {
    await runWithLogContext({ correlationId: 'async-1' }, async () => {
      await delay(5);
      expect(getLogContext()['correlationId']).toBe('async-1');
      await delay(5);
      expect(getLogContext()['correlationId']).toBe('async-1');
    });
  });

  it('iç içe zincirler dıştakini gölgeler, çıkışta geri döner', () => {
    runWithLogContext({ correlationId: 'dis' }, () => {
      runWithLogContext({ correlationId: 'ic' }, () => {
        expect(getLogContext()['correlationId']).toBe('ic');
      });
      expect(getLogContext()['correlationId']).toBe('dis');
    });
  });
});

describe('addLogContext', () => {
  it('mevcut bağlama alan ekler ve zincirin GERİSİ de görür', () => {
    runWithLogContext({ correlationId: 'abc' }, () => {
      addLogContext({ saveId: 'kayit-1' });
      expect(getLogContext()).toEqual({ correlationId: 'abc', saveId: 'kayit-1' });
    });
  });

  it('await sonrasında eklenen alan da görünür', async () => {
    await runWithLogContext({ correlationId: 'abc' }, async () => {
      await delay(5);
      addLogContext({ turnId: 42 });
      await delay(5);
      expect(getLogContext()['turnId']).toBe(42);
    });
  });

  it('zincir DIŞINDA sessizce hiçbir şey yapmaz', () => {
    // Arka plan görevinin bağlamsız çalışması hata değil; fırlatmak
    // çağıranı gereksiz bir try/catch'e zorlardı.
    expect(() => {
      addLogContext({ saveId: 'x' });
    }).not.toThrow();
    expect(getLogContext()).toEqual({});
  });
});

describe('EŞZAMANLILIK — bağlamlar karışmıyor', () => {
  it('gerçekten paralel iki zincir birbirinin kimliğini görmüyor', async () => {
    // Kabul kriteri: "iki paralel istek → ALS bağlamları karışmıyor".
    // Zincirler bilerek İÇ İÇE geçiriliyor: her biri birkaç kez await ediyor
    // ve aralarında sıra değiş tokuşu oluyor. Paylaşılan bir değişkenle
    // kurulmuş bir uygulama burada kırılır.
    const chain = async (id: string, hops: number): Promise<string[]> =>
      runWithLogContext({ correlationId: id }, async () => {
        const seen: string[] = [];
        for (let i = 0; i < hops; i += 1) {
          await delay(1);
          seen.push(String(getLogContext()['correlationId']));
        }
        return seen;
      });

    const [first, second] = await Promise.all([chain('istek-A', 5), chain('istek-B', 5)]);

    expect(first).toEqual(Array.from({ length: 5 }, () => 'istek-A'));
    expect(second).toEqual(Array.from({ length: 5 }, () => 'istek-B'));
  });

  it("yirmi paralel zincir, her biri kendi id'sini koruyor", async () => {
    const ids = Array.from({ length: 20 }, () => createCorrelationId());

    const results = await Promise.all(
      ids.map(async (id) =>
        runWithLogContext({ correlationId: id }, async () => {
          await delay(Math.floor(id.charCodeAt(35) % 5));
          addLogContext({ step: 'orta' });
          await delay(1);
          return getLogContext()['correlationId'];
        }),
      ),
    );

    expect(results).toEqual(ids);
  });

  it('bir zincirdeki addLogContext DİĞERİNE sızmıyor', async () => {
    const readOther = async (): Promise<string[]> =>
      runWithLogContext({ correlationId: 'B' }, async () => {
        await delay(3);
        return Object.keys(getLogContext());
      });

    const withExtra = async (): Promise<string[]> =>
      runWithLogContext({ correlationId: 'A' }, async () => {
        addLogContext({ saveId: 'yalnizca-A' });
        await delay(3);
        return Object.keys(getLogContext());
      });

    const [aKeys, bKeys] = await Promise.all([withExtra(), readOther()]);

    expect(aKeys.sort()).toEqual(['correlationId', 'saveId']);
    expect(bKeys).toEqual(['correlationId']);
  });
});
