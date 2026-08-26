import { assertionMode } from '@fms/shared';
import { useEffect, useState, useSyncExternalStore } from 'react';

import {
  clearLogBuffer,
  LOG_BUFFER_CAPACITY,
  logBufferSnapshot,
  type LogEntry,
  subscribeToLogBuffer,
} from '../../lib/log-buffer.js';

/**
 * Geliştirici Hata Ayıklama Paneli — `docs/ROADMAP.md` Faz 2 madde 2.8.
 * Faz 2'nin 3. kabul kriteri: *"Debug paneli açılıyor ve canlı log akışı gösteriyor."*
 *
 * ── ⚠️ ÜRETİMDEN DIŞLAMANIN KANITI GREP DEĞİL, DİZE NÖBETÇİSİ (Karar 3) ──
 * `grep "DebugPanel"` yanlış kapı: küçültme **tanımlayıcıları** yeniden
 * adlandırıyor, yani kod pakette dururken bile 0 döner. 2.3b'de ölçüldü,
 * 2.7'de ikinci kez ısırdı (günlük #53). Bu yüzden panelin içine küçültmeden
 * sağ çıkan bir **dize literali** konuyor ve paket taraması onu arıyor.
 * Kontrol derlemesi İKİ YÖNLÜ: koruma kaldırılınca nöbetçi görünmeli, geri
 * konunca kaybolmalı — tek yönlü "0 çıktı, demek ki yok" kanıt değil.
 *
 * ── PANEL KÖK SINIRIN DIŞINDA DURUR ──────────────────────────────────────
 * `main.tsx` paneli kök `ErrorBoundary`'nin **kardeşi** olarak, kendi sınırının
 * içinde monte ediyor. İçeride olsaydı panelin çökmesi kök sınırı tetikler ve
 * bir **hata ayıklama aracı uygulamayı öldürürdü** — aracın var olma amacının
 * tam tersi.
 *
 * ── DÖRT SEKMENİN İKİSİ BUGÜN BOŞ, ÜÇÜNCÜSÜ DE ───────────────────────────
 * Spec dört sekme istiyor. Kayıtlar Faz 12'de, `SeededRng` Faz 22'de,
 * `measure()` çağrı yerleri Faz 6'da (`perf:budget`) geliyor. Kabuklar
 * kuruldu ve **ne zaman dolacakları yazıldı**; SAHTE VERİ GÖSTERİLMİYOR
 * (2.0'da verilen karar).
 */

/**
 * Küçültmeden sağ çıkan nöbetçi — üretim paketinde ARANACAK dize.
 *
 * ⚠️ Değeri değiştirilirse `docs/ROADMAP.md` Faz 2 madde 2.8'deki tarama
 * komutu ve `DebugPanel.test.tsx` birlikte güncellenir.
 */
export const DEV_PANEL_SENTINEL = '__FMS_DEV_PANEL__';

/** Paneli açıp kapatan kısayol — spec ve ROADMAP `Ctrl+Shift+D` diyor. */
export const TOGGLE_KEY = 'd';

const TABS = {
  logs: 'logs',
  save: 'save',
  rng: 'rng',
  perf: 'perf',
} as const;

type TabId = (typeof TABS)[keyof typeof TABS];

/** TODO(Faz 5): metinler `t()` üzerinden gelecek — BORÇ-003. */
const TAB_LABELS: Readonly<Record<TabId, string>> = {
  logs: 'Son 50 Log',
  save: 'Kayıt Durumu',
  rng: 'RNG Tohum Görüntüleyici',
  perf: 'Performans Sayaçları',
};

/**
 * Henüz verisi olmayan sekmelerin açıklaması.
 *
 * Metin bilerek **ne zaman dolacağını** söylüyor: "yakında" demek, bir sonraki
 * oturumun bunu eksik iş sanıp doldurmaya çalışmasına yol açardı.
 */
const EMPTY_TAB_NOTES: Readonly<Record<Exclude<TabId, 'logs'>, string>> = {
  save: 'Kayıt verisi Faz 12’de (Master World + Delta) gelecek. Şu an gösterilecek kayıt yok.',
  rng: 'SeededRng Faz 22’de (maç motoru) gelecek. Tohum görüntüleyici o zaman dolacak.',
  perf: 'measure() henüz hiçbir ürün kodundan çağrılmıyor. Çağrı yerleri Faz 6’da (perf:budget) gelecek.',
};

const LEVEL_COLORS: Readonly<Record<LogEntry['level'], string>> = {
  fatal: '#ff6b6b',
  error: '#ff6b6b',
  warn: '#ffd166',
  info: '#8ecae6',
  debug: '#adb5bd',
  trace: '#868e96',
};

function formatTime(at: number): string {
  const date = new Date(at);
  const pad = (value: number, size = 2): string => String(value).padStart(size, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

export function DebugPanel(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>(TABS.logs);

  /**
   * `useSyncExternalStore` — halka tamponu React dışı bir kaynak olarak okur.
   *
   * `useState` + `useEffect` ile de yapılabilirdi ama o kurulum, abonelik
   * kurulmadan ÖNCE gelen satırları kaçırır (tearing). Bu kanca tam olarak
   * bunun için var.
   */
  const entries = useSyncExternalStore(subscribeToLogBuffer, logBufferSnapshot, logBufferSnapshot);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!event.ctrlKey || !event.shiftKey || event.altKey) return;
      // ⚠️ `event.code` DEĞİL `event.key`. Ölçüldü (2.8): otomasyonla üretilen
      // sentetik olayda `code` BOŞ geliyor. Ayrıca Shift basılıyken `key`
      // tarayıcıya/düzene göre 'd' ya da 'D' olabiliyor — ikisi de kabul edilir.
      if (event.key.toLowerCase() !== TOGGLE_KEY) return;
      event.preventDefault();
      setOpen((previous) => !previous);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    /* Nöbetçi kapalıyken de DOM'da: paneli açmadan da varlığı doğrulanabilsin.
       Boyutu sıfır, olay yakalamıyor — uygulamayla hiç etkileşmiyor. */
    <div
      data-fms-dev-panel={DEV_PANEL_SENTINEL}
      data-testid="debug-panel-root"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2147483000,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 12,
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      {open ? (
        <section
          data-testid="debug-panel"
          aria-label="Geliştirici hata ayıklama paneli"
          style={{
            background: '#12161f',
            color: '#e9ecef',
            borderTop: '1px solid #343a40',
            maxHeight: '45vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <header
            style={{ display: 'flex', gap: 4, padding: 6, borderBottom: '1px solid #343a40' }}
          >
            {(Object.keys(TAB_LABELS) as TabId[]).map((id) => (
              <button
                key={id}
                type="button"
                data-testid={`debug-tab-${id}`}
                aria-pressed={tab === id}
                onClick={() => {
                  setTab(id);
                }}
                style={{
                  background: tab === id ? '#2b3245' : 'transparent',
                  color: 'inherit',
                  border: '1px solid #343a40',
                  borderRadius: 4,
                  padding: '2px 8px',
                  cursor: 'pointer',
                  font: 'inherit',
                }}
              >
                {TAB_LABELS[id]}
              </button>
            ))}
            <span style={{ flex: 1 }} />
            <button
              type="button"
              data-testid="debug-panel-close"
              onClick={() => {
                setOpen(false);
              }}
              style={{
                background: 'transparent',
                color: 'inherit',
                border: '1px solid #343a40',
                borderRadius: 4,
                padding: '2px 8px',
                cursor: 'pointer',
                font: 'inherit',
              }}
            >
              Kapat (Ctrl+Shift+D)
            </button>
          </header>

          <div style={{ overflow: 'auto', padding: 8 }}>
            {tab === TABS.logs ? (
              <LogsTab entries={entries} />
            ) : (
              <p data-testid={`debug-empty-${tab}`} style={{ margin: 0, color: '#adb5bd' }}>
                {EMPTY_TAB_NOTES[tab]}
              </p>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function LogsTab({ entries }: { readonly entries: readonly LogEntry[] }): React.ReactElement {
  return (
    <>
      <p style={{ margin: '0 0 6px', color: '#adb5bd' }}>
        <span data-testid="debug-log-count">{entries.length}</span> / {LOG_BUFFER_CAPACITY} satır ·{' '}
        değişmez kipi: <span data-testid="debug-assertion-mode">{assertionMode()}</span>{' '}
        <button
          type="button"
          data-testid="debug-log-clear"
          onClick={clearLogBuffer}
          style={{
            background: 'transparent',
            color: 'inherit',
            border: '1px solid #343a40',
            borderRadius: 4,
            padding: '0 6px',
            cursor: 'pointer',
            font: 'inherit',
          }}
        >
          Temizle
        </button>
      </p>

      {entries.length === 0 ? (
        <p data-testid="debug-log-empty" style={{ margin: 0, color: '#adb5bd' }}>
          Henüz log satırı yok. Bir istek at veya sayfayı yenile.
        </p>
      ) : (
        <ol data-testid="debug-log-list" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {/* En yeni en üstte — akışta aranan satır son gelendir. */}
          {[...entries].reverse().map((entry) => (
            <li key={entry.seq} data-testid="debug-log-entry" style={{ padding: '2px 0' }}>
              <span style={{ color: '#868e96' }}>{formatTime(entry.at)}</span>{' '}
              <span style={{ color: LEVEL_COLORS[entry.level] }}>{entry.level}</span>{' '}
              <span>{entry.message}</span>{' '}
              <span style={{ color: '#adb5bd' }}>{JSON.stringify(entry.context)}</span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
