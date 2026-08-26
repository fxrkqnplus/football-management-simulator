import type { LogLevel, LogValue } from '@fms/shared';

/**
 * Halka tampon — hata ayıklama panelinin "Son 50 Log" sekmesinin kaynağı (2.8).
 *
 * ── NEDEN `console` YAMALANMIYOR ─────────────────────────────────────────
 * En kolay yol `console.info`u sarmalamaktı. Üç sebeple elendi:
 *   ① Yama **bizim olmayan** her satırı da yakalar — Sentry SDK'sı, React'in
 *      geliştirme uyarıları, tarayıcı eklentileri. Panel gürültüye boğulur ve
 *      "canlı log akışı" iddiası anlamını yitirir.
 *   ② K8 `console`u tek bir dosyaya hapsetmiş durumda (`lib/logger.ts`).
 *      İkinci bir dokunuş o sınırı deler ve kural iki yerde denetlenir hale
 *      gelirdi (`docs/spec/09` §11.5).
 *   ③ `createBrowserLogger` **zaten tek huni**: `api.ts`'in kök logger'ı da
 *      `main.tsx`'in değişmez bildiricisi de oradan geçiyor. Huniye bir yayın
 *      kancası koymak, dışarıdan yamamaktan hem dar hem sağlam.
 *
 * ── ⚠️ TAMPONA REDAKTE EDİLMİŞ BAĞLAM YAZILIR ────────────────────────────
 * Panel bu satırları **ekrana** basıyor. Ham bağlam yazılsaydı redaksiyonun
 * (2.2b) tüm amacı delinirdi: sır konsolda `[REDACTED]` görünürken panelde
 * açıkça okunurdu. `logger.ts` `redactContext()` sonucunu yayınlıyor.
 *
 * ── ÜRETİMDE HİÇ YOK ─────────────────────────────────────────────────────
 * `logger.ts` yayını `if (__FMS_DEV__)` içinde yapıyor. Vite sabiti derleme
 * zamanında katlıyor, dal ölüyor, `publishLogEntry` kullanılmaz hale geliyor
 * ve ağaç sarsma bu modülü paketten **tamamen** siliyor. Kanıtı 2.8'in paket
 * ölçümünde: üretim paketi bayt bayt aynı kalmalı.
 *
 * ── MODÜL DÜZEYİ DEĞİŞTİRİLEBİLİR DURUM ──────────────────────────────────
 * Evet, ve `correlation-context.ts` ile aynı gerekçeyle meşru: bu bir tarayıcı
 * sekmesine ait tekil oturum durumu. K3'ün global durum yasağı
 * `packages/engine` içindir ve `arch:check` onu orada denetler.
 */

/** Spec "Son 50 Log" diyor; sayı tek yerde tutuluyor. */
export const LOG_BUFFER_CAPACITY = 50;

export interface LogEntry {
  /** Monotonik sıra numarası — React `key`'i ve "kaç satır düştü" hesabı. */
  readonly seq: number;
  /** `Date.now()`. Motor değil, tarayıcı katmanı — K3 kapsamı dışı. */
  readonly at: number;
  readonly level: LogLevel;
  readonly message: string;
  /** ⚠️ REDAKTE EDİLMİŞ hâli. Ham bağlam buraya asla girmez. */
  readonly context: Readonly<Record<string, LogValue>>;
}

export type LogBufferListener = () => void;

let entries: readonly LogEntry[] = [];
let nextSeq = 1;
const listeners = new Set<LogBufferListener>();

/**
 * Yeni bir satır ekler; kapasite aşılırsa en eskisini düşürür.
 *
 * ⚠️ HER YAYINDA YENİ BİR DİZİ ÜRETİLİYOR, mevcut dizi DEĞİŞTİRİLMİYOR.
 * `useSyncExternalStore` anlık görüntüyü referans eşitliğiyle karşılaştırıyor:
 * diziyi yerinde `push`lasaydık referans değişmez ve panel **hiç güncellenmezdi**;
 * her okumada yeni dizi üretseydik referans her seferinde değişir ve React
 * sonsuz döngüye girerdi. Doğru davranış tam ortada: değişiklik ANINDA yeni
 * referans, değişiklik yokken AYNI referans.
 */
export function publishLogEntry(entry: Omit<LogEntry, 'seq'>): void {
  const next = [...entries, { ...entry, seq: nextSeq }];
  nextSeq += 1;
  entries =
    next.length > LOG_BUFFER_CAPACITY ? next.slice(next.length - LOG_BUFFER_CAPACITY) : next;

  for (const listener of listeners) listener();
}

/** Kararlı anlık görüntü — yayın olmadıkça aynı referans döner. */
export function logBufferSnapshot(): readonly LogEntry[] {
  return entries;
}

/** Değişiklikleri dinler. Dönen fonksiyon aboneliği bırakır. */
export function subscribeToLogBuffer(listener: LogBufferListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Yalnızca testler ve panelin "temizle" düğmesi için. */
export function clearLogBuffer(): void {
  entries = [];
  for (const listener of listeners) listener();
}

/** Yalnızca testler için — sıra numarasını da sıfırlar. */
export function resetLogBufferForTests(): void {
  entries = [];
  nextSeq = 1;
  listeners.clear();
}
