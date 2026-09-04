import { ASSERTION_MODES, configureAssertions, resetAssertionsForTests } from '@fms/shared';
import { act, fireEvent, render as rtlRender, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createI18n } from '../../app/i18n.js';
import { LOG_BUFFER_CAPACITY, resetLogBufferForTests } from '../../lib/log-buffer.js';
import { createBrowserLogger } from '../../lib/logger.js';
import { DebugPanel, DEV_PANEL_SENTINEL } from './DebugPanel.js';

/**
 * Hata ayıklama paneli testleri — Faz 2 madde 2.8.
 *
 * ⚠️ BU TESTLER KRİTER 3'Ü TEK BAŞINA KAPATMAZ. Kriter iki şey istiyor:
 * panelin açılması + **üretim paketinde yokluğunun kanıtı**. İkincisi bir
 * derleme ölçümü ve testte sahtelenemez (2.6 günlük #48). Buradaki iddia
 * yalnızca davranış.
 */

/** Log akışını gerçek logger üzerinden besler — tampon kablolaması da sınanır. */
function logThroughRealLogger(message: string, context: Record<string, string> = {}): void {
  const logger = createBrowserLogger({ level: 'info' });
  act(() => {
    logger.info(context, message);
  });
}

function toggle(): void {
  act(() => {
    fireEvent.keyDown(window, { key: 'd', ctrlKey: true, shiftKey: true });
  });
}

beforeEach(() => {
  resetLogBufferForTests();
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  resetLogBufferForTests();
  resetAssertionsForTests();
});

/**
 * WARN: SAGLAYICI GERCEK — sahte bir `t` KULLANILMIYOR (5.4).
 *
 * Sahte bir ceviri fonksiyonu testi gecirirdi ama gercek anahtarlarin
 * `locales/tr/**` icinde VAR OLDUGUNU kanitlamazdi: eksik bir anahtar sahte
 * `t` ile fark edilmez. Gercek ornekle eksik anahtar ekranda ANAHTARIN
 * KENDISI olarak gorunur ve test kirilir.
 */
const i18n = createI18n();

const render = (ui: ReactElement): ReturnType<typeof rtlRender> =>
  rtlRender(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);

describe('görünürlük ve kısayol', () => {
  it('başlangıçta KAPALI — panel gövdesi yok', () => {
    render(<DebugPanel />);
    expect(screen.queryByTestId('debug-panel')).toBeNull();
  });

  it('Ctrl+Shift+D açıyor, tekrar basınca kapatıyor', () => {
    render(<DebugPanel />);

    toggle();
    expect(screen.getByTestId('debug-panel')).toBeTruthy();

    toggle();
    expect(screen.queryByTestId('debug-panel')).toBeNull();
  });

  it('büyük harfli `D` de kabul ediliyor — Shift basılıyken tarayıcı öyle üretebilir', () => {
    // ⚠️ ÖLÇÜLDÜ (2.8): otomasyonla üretilen sentetik olayda `event.code` BOŞ
    // geliyor, yani `code`a bakmak kırılgan. `key` ise Shift'e ve klavye
    // düzenine göre 'd' ya da 'D' olabiliyor; ikisi de çalışmalı.
    render(<DebugPanel />);
    act(() => {
      fireEvent.keyDown(window, { key: 'D', ctrlKey: true, shiftKey: true });
    });
    expect(screen.getByTestId('debug-panel')).toBeTruthy();
  });

  it.each([
    ['Ctrl yok', { key: 'd', ctrlKey: false, shiftKey: true }],
    ['Shift yok', { key: 'd', ctrlKey: true, shiftKey: false }],
    ['Alt da basılı', { key: 'd', ctrlKey: true, shiftKey: true, altKey: true }],
    ['başka tuş', { key: 'k', ctrlKey: true, shiftKey: true }],
  ])('%s → açılmıyor', (_label, init) => {
    render(<DebugPanel />);
    act(() => {
      fireEvent.keyDown(window, init);
    });
    expect(screen.queryByTestId('debug-panel')).toBeNull();
  });

  it('bileşen kalkınca dinleyici bırakılıyor — sızıntı yok', () => {
    const { unmount } = render(<DebugPanel />);
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('kapat düğmesi de kapatıyor', () => {
    render(<DebugPanel />);
    toggle();
    act(() => {
      fireEvent.click(screen.getByTestId('debug-panel-close'));
    });
    expect(screen.queryByTestId('debug-panel')).toBeNull();
  });
});

describe('dize nöbetçisi — Karar 3', () => {
  it('panel KAPALIYKEN bile nöbetçi DOM’da', () => {
    // Nöbetçinin asıl işi paket taramasında; DOM’da da bulunması, paneli
    // açmadan varlığını doğrulayabilmek için.
    render(<DebugPanel />);
    const root = screen.getByTestId('debug-panel-root');
    expect(root.getAttribute('data-fms-dev-panel')).toBe(DEV_PANEL_SENTINEL);
  });

  it('nöbetçi değeri sabit — değişirse paket taraması sessizce körelir', () => {
    expect(DEV_PANEL_SENTINEL).toBe('__FMS_DEV_PANEL__');
  });
});

describe('canlı log akışı — kabul kriteri 3', () => {
  it('GERÇEK logger’dan geçen satır panelde görünüyor', () => {
    // ⚠️ `publishLogEntry`i doğrudan çağırmıyoruz. Saf fonksiyonun testi
    // KABLOLAMAYI kanıtlamaz (`docs/spec/09` §11.5, 2.3b’nin dersi): burada
    // sınanan şey `createBrowserLogger`in tamponu gerçekten beslediği.
    render(<DebugPanel />);
    toggle();

    expect(screen.getByTestId('debug-log-empty')).toBeTruthy();

    logThroughRealLogger('API isteği gönderiliyor', { code: 'api.request' });

    const entries = screen.getAllByTestId('debug-log-entry');
    expect(entries).toHaveLength(1);
    expect(entries[0]?.textContent).toContain('API isteği gönderiliyor');
    expect(entries[0]?.textContent).toContain('api.request');
    expect(screen.getByTestId('debug-log-count').textContent).toBe('1');
  });

  it('panel AÇIKKEN gelen satır anında akıyor — canlı olan bu', () => {
    render(<DebugPanel />);
    toggle();
    logThroughRealLogger('bir');
    logThroughRealLogger('iki');
    expect(screen.getAllByTestId('debug-log-entry')).toHaveLength(2);
  });

  it('EN YENİ satır en üstte', () => {
    render(<DebugPanel />);
    toggle();
    logThroughRealLogger('eski');
    logThroughRealLogger('yeni');
    expect(screen.getAllByTestId('debug-log-entry')[0]?.textContent).toContain('yeni');
  });

  it('⚠️ SIR EKRANA BASILMIYOR — tampona redakte edilmiş bağlam giriyor', () => {
    // Panelin ekrana bastığı şey, konsola yazılanla AYNI redaksiyondan geçmiş
    // olmalı. Ham bağlam yayınlansaydı sır konsolda `[REDACTED]` görünürken
    // panelde açıkça okunurdu — redaksiyonun (2.2b) amacının tam tersi.
    render(<DebugPanel />);
    toggle();

    logThroughRealLogger('giriş denendi', { userId: '7', password: 'çok-gizli' });

    const entry = screen.getAllByTestId('debug-log-entry')[0];
    expect(entry?.textContent).toContain('[REDACTED]');
    expect(entry?.textContent).not.toContain('çok-gizli');
    expect(entry?.textContent).toContain('7');
  });

  it('temizle düğmesi akışı boşaltıyor', () => {
    render(<DebugPanel />);
    toggle();
    logThroughRealLogger('bir');

    act(() => {
      fireEvent.click(screen.getByTestId('debug-log-clear'));
    });

    expect(screen.getByTestId('debug-log-empty')).toBeTruthy();
  });

  it('etkin değişmez kipini gösteriyor', () => {
    configureAssertions({ mode: ASSERTION_MODES.report, report: () => undefined });
    render(<DebugPanel />);
    toggle();
    expect(screen.getByTestId('debug-assertion-mode').textContent).toBe('report');
  });

  it('kapasite ekranda yazılı — panel neyi GÖSTERMEDİĞİNİ de söylüyor', () => {
    // 50'den eskisi düşüyor ve kullanıcı bunu bilmeli; aksi hâlde "log yok"
    // ile "log düştü" ayırt edilemez.
    render(<DebugPanel />);
    toggle();
    logThroughRealLogger('bir');
    expect(screen.getByTestId('debug-log-list')).toBeTruthy();
    expect(screen.getByText(new RegExp(`/ ${String(LOG_BUFFER_CAPACITY)} satır`))).toBeTruthy();
  });
});

describe('verisi olmayan üç sekme — SAHTE VERİ YOK', () => {
  it.each([
    ['save', 'Faz 12'],
    ['rng', 'Faz 22'],
    ['perf', 'Faz 6'],
  ])('%s sekmesi ne zaman dolacağını söylüyor (%s)', (tab, faz) => {
    // 2.0'da verilen karar: kabuk kurulur, sahte veri gösterilmez. Metin
    // bilerek "yakında" değil, HANGİ FAZ diyor — yoksa bir sonraki oturum
    // bunu eksik iş sanıp doldurmaya çalışır.
    render(<DebugPanel />);
    toggle();
    act(() => {
      fireEvent.click(screen.getByTestId(`debug-tab-${tab}`));
    });
    const note = screen.getByTestId(`debug-empty-${tab}`);
    expect(note.textContent).toContain(faz);
  });

  it('dört sekmenin dördü de var', () => {
    render(<DebugPanel />);
    toggle();
    for (const tab of ['logs', 'save', 'rng', 'perf']) {
      expect(screen.getByTestId(`debug-tab-${tab}`)).toBeTruthy();
    }
  });
});
