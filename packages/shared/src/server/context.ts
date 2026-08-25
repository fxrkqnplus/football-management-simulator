import { AsyncLocalStorage } from 'node:async_hooks';

import type { LogContext } from '../logger.js';

/**
 * İstek başına gözlemlenebilirlik bağlamı — `docs/spec/09` §11.1.
 *
 * ⚠️ YALNIZCA SUNUCU: `node:async_hooks` Node'a özgü. Bu yüzden `server/`
 * altında; `apps/web`, `packages/ui` ve `packages/engine` onu göremez
 * (`arch:check` `restricted-subpath`).
 *
 * ── NEDEN AsyncLocalStorage ──────────────────────────────────────────────
 * `correlationId`'yi elden ele geçirmek (her fonksiyona bir parametre daha)
 * teoride mümkün ama pratikte tutmuyor: bir tek çağrı zincirinde unutulduğu
 * anda zincir kopuyor ve **kopukluk sessiz** — log satırı yine yazılıyor,
 * yalnızca kimliksiz. ALS bağlamı asenkron çağrı ağacı boyunca kendiliğinden
 * taşıyor, yani unutmak mümkün değil.
 *
 * ── SINIRI ───────────────────────────────────────────────────────────────
 * ALS **süreç içinde** taşır. Süreç sınırını (kuyruk, alt süreç) geçmez;
 * orası için taşınabilir zarf gerekiyor — 2.3b.
 */

/**
 * Bağlam deposu.
 *
 * Modül düzeyinde tek örnek olması zorunlu: iki ayrı `AsyncLocalStorage`
 * örneği birbirinin bağlamını görmez ve belirti "id bazen var bazen yok"
 * olurdu. `@fms/shared/server` tek giriş noktası olduğu için pnpm'in sıkı
 * düzeninde tek kopya garanti.
 */
const storage = new AsyncLocalStorage<LogContext>();

/**
 * Verilen bağlamla bir çağrı zinciri çalıştırır.
 *
 * Zincir boyunca (await'ler, callback'ler, timer'lar dahil) `getLogContext()`
 * bu bağlamı döner. Zincir bittiğinde bağlam kendiliğinden kalkar.
 */
export function runWithLogContext<T>(context: LogContext, callback: () => T): T {
  return storage.run(context, callback);
}

/** Şu anki bağlam. Zincir dışındaysak boş nesne. */
export function getLogContext(): LogContext {
  return storage.getStore() ?? {};
}

/**
 * Mevcut bağlama alan ekler.
 *
 * Yeni bir `run` açmaz — **mevcut deponun** içeriğini değiştirir, böylece
 * çağıran zincirin geri kalanı da yeni alanı görür. `saveId`/`turnId` gibi
 * istek başladıktan sonra öğrenilen alanlar için.
 *
 * Zincir dışında çağrılırsa sessizce hiçbir şey yapmaz: bir arka plan
 * görevinin bağlamsız çalışması hata değil, normal.
 */
export function addLogContext(fields: LogContext): void {
  const current = storage.getStore();
  if (current === undefined) return;
  Object.assign(current, fields);
}
