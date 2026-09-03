import { assertionMode } from '@fms/shared';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

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

/**
 * Sekme adlarının i18n ANAHTARLARI — BORÇ-003 ödendi (5.4).
 *
 * ⚠️ **ENVANTER ARACININ KÖR NOKTASI BURADA BULUNDU.** Bunlar modül düzeyi
 * sabitler, JSX metni **değil** — AST taraması yalnızca JSX içindeki dize
 * literallerine bakıyor ve bu satırları **görmüyordu**. Yine de JSX'e render
 * ediliyorlar, yani kullanıcı onları görüyor: bir K5 ihlali envanterin
 * dışında kaldı ve yalnızca **BORÇ-003 onları adıyla saydığı için** yakalandı
 * (*"sekme adları, üç boş sekmenin açıklaması"*).
 * → Aynı kör nokta **5.5'in ESLint kuralında da olacak** ve ROADMAP'in 5.5
 *   maddesine yazıldı. *"Kısmi koruma D3 yanılsaması üretir."*
 */
const TAB_LABEL_KEYS = {
  logs: 'debugPanel.tab.logs',
  save: 'debugPanel.tab.save',
  rng: 'debugPanel.tab.rng',
  perf: 'debugPanel.tab.perf',
} as const satisfies Readonly<Record<TabId, string>>;

/**
 * Henüz verisi olmayan sekmelerin açıklaması.
 *
 * Metin bilerek **ne zaman dolacağını** söylüyor: "yakında" demek, bir sonraki
 * oturumun bunu eksik iş sanıp doldurmaya çalışmasına yol açardı.
 */
const EMPTY_TAB_NOTE_KEYS = {
  save: 'debugPanel.emptyTab.save',
  rng: 'debugPanel.emptyTab.rng',
  perf: 'debugPanel.emptyTab.perf',
} as const satisfies Readonly<Record<Exclude<TabId, 'logs'>, string>>;

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
  const { t } = useTranslation();
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
          aria-label={t('debugPanel.ariaLabel')}
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
            {(Object.keys(TAB_LABEL_KEYS) as TabId[]).map((id) => (
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
                {t(TAB_LABEL_KEYS[id])}
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
              {t('debugPanel.close')}
            </button>
          </header>

          <div style={{ overflow: 'auto', padding: 8 }}>
            {tab === TABS.logs ? (
              <LogsTab entries={entries} />
            ) : (
              <p data-testid={`debug-empty-${tab}`} style={{ margin: 0, color: '#adb5bd' }}>
                {t(EMPTY_TAB_NOTE_KEYS[tab])}
              </p>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function LogsTab({ entries }: { readonly entries: readonly LogEntry[] }): React.ReactElement {
  const { t } = useTranslation();
  return (
    <>
      <p style={{ margin: '0 0 6px', color: '#adb5bd' }}>
        <span data-testid="debug-log-count">{entries.length}</span> / {LOG_BUFFER_CAPACITY}{' '}
        {t('debugPanel.lines')} {t('debugPanel.assertionMode')}{' '}
        <span data-testid="debug-assertion-mode">{assertionMode()}</span>{' '}
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
          {t('debugPanel.clear')}
        </button>
      </p>

      {entries.length === 0 ? (
        <p data-testid="debug-log-empty" style={{ margin: 0, color: '#adb5bd' }}>
          {t('debugPanel.empty')}
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
