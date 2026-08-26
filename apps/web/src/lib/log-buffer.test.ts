import { LOG_LEVELS } from '@fms/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearLogBuffer,
  LOG_BUFFER_CAPACITY,
  logBufferSnapshot,
  publishLogEntry,
  resetLogBufferForTests,
  subscribeToLogBuffer,
} from './log-buffer.js';

afterEach(() => {
  resetLogBufferForTests();
});

function publish(message: string, context: Record<string, string | number> = {}): void {
  publishLogEntry({ at: 1_700_000_000_000, level: LOG_LEVELS.info, message, context });
}

describe('halka tampon', () => {
  it('yayınlanan satırı sırasıyla tutuyor', () => {
    publish('bir');
    publish('iki');

    const entries = logBufferSnapshot();
    expect(entries).toHaveLength(2);
    expect(entries[0]?.message).toBe('bir');
    expect(entries[1]?.message).toBe('iki');
  });

  it('sıra numarası monotonik artıyor — React key olarak güvenli', () => {
    publish('a');
    publish('b');
    publish('c');
    expect(logBufferSnapshot().map((e) => e.seq)).toEqual([1, 2, 3]);
  });

  it('kapasite aşılınca EN ESKİ satır düşüyor', () => {
    for (let i = 0; i < LOG_BUFFER_CAPACITY + 5; i += 1) publish(`satır-${String(i)}`);

    const entries = logBufferSnapshot();
    expect(entries).toHaveLength(LOG_BUFFER_CAPACITY);
    // İlk beş satır düştü; en eski kalan 5 numaralı.
    expect(entries[0]?.message).toBe('satır-5');
    expect(entries.at(-1)?.message).toBe(`satır-${String(LOG_BUFFER_CAPACITY + 4)}`);
  });

  it('spec "Son 50 Log" diyor — kapasite 50', () => {
    expect(LOG_BUFFER_CAPACITY).toBe(50);
  });
});

describe('anlık görüntü referansı — useSyncExternalStore sözleşmesi', () => {
  it('yayın YOKKEN aynı referans dönüyor', () => {
    // ⚠️ Bu testin konusu React. Her okumada yeni bir dizi üretilseydi
    // `useSyncExternalStore` referansı sürekli değişmiş sayar ve panel
    // SONSUZ DÖNGÜYE girerdi.
    publish('a');
    expect(logBufferSnapshot()).toBe(logBufferSnapshot());
  });

  it('yayın OLUNCA referans değişiyor', () => {
    const before = logBufferSnapshot();
    publish('a');
    expect(logBufferSnapshot()).not.toBe(before);
  });

  it('mevcut dizi yerinde DEĞİŞTİRİLMİYOR', () => {
    publish('a');
    const before = logBufferSnapshot();
    publish('b');
    expect(before).toHaveLength(1);
  });
});

describe('abonelik', () => {
  it('her yayında dinleyiciyi çağırıyor', () => {
    const listener = vi.fn();
    subscribeToLogBuffer(listener);

    publish('a');
    publish('b');

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('abonelik bırakılınca artık çağrılmıyor', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToLogBuffer(listener);
    unsubscribe();

    publish('a');

    expect(listener).not.toHaveBeenCalled();
  });

  it('temizleme de dinleyiciyi uyandırıyor', () => {
    const listener = vi.fn();
    publish('a');
    subscribeToLogBuffer(listener);

    clearLogBuffer();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(logBufferSnapshot()).toHaveLength(0);
  });
});
