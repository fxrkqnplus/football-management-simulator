/**
 * Alt süreç zarfı tüketicisi — `log-context.subprocess.test.ts` bunu spawn eder.
 *
 * ⚠️ BU DOSYA NEDEN VAR: sahte kuyruk kullanılmadı (ROADMAP Faz 2 madde 2.3b,
 * Karar 2). Sahte kuyruk **aynı süreçte** kalır ve `AsyncLocalStorage` zaten
 * süreç içinde taşıdığı için zincir "çalışıyor" görünür — oysa taşınan şey
 * zarf değil, ALS'in kendisidir. Test yeşil olur ve zarf HİÇ SINANMAMIŞ olur.
 * Zarfın işe yaradığı ancak **gerçek bir işletim sistemi süreç sınırında**
 * görülebilir; bu dosya o sınırın öteki tarafıdır.
 *
 * ⚠️ NEDEN `.mjs` VE NEDEN `dist`TEN IMPORT EDİYOR: alt süreç düz `node` ile
 * başlatılıyor, Vitest'in çözümleyicisi orada yok. Node 24 tip soyma yapıyor
 * ama `.js` belirtecini `.ts`ye çevirmiyor (2.3b'de ölçüldü), yani kaynak
 * ağacı doğrudan çalıştırılamıyor. Test `dist`in tazeliğini kendisi denetler
 * ve gerekirse derler — bkz. `ensureSharedBuilt`.
 *
 * Sözleşme: zarf `process.argv[2]`de gelir; çıktı pino'nun JSON satırlarıdır.
 */
import { createCorrelationId } from '@fms/shared';
import {
  createServerLogger,
  deserializeLogContext,
  getLogContext,
  runWithLogContext,
} from '@fms/shared/server';

const raw = process.argv[2] ?? '';
const restored = deserializeLogContext(raw);

// `contextProvider` bağlantısı üretimdekiyle aynı: logger ALS'i BİLMİYOR,
// yalnızca her satırda bir fonksiyon çağırıyor.
const logger = createServerLogger({
  level: 'info',
  format: 'json',
  contextProvider: getLogContext,
});

// Zarf çözülemediyse zincir kopmuştur — çocuk kendi kimliğini üretir ve
// durumu yüksek sesle söyler. 2.3a'daki geçersiz başlık kararının aynısı:
// bozuk bir izleme verisi işi düşürmez, ama sessizce de yutulmaz.
const context = restored ?? { correlationId: createCorrelationId() };

runWithLogContext(context, () => {
  if (restored === null) {
    logger.warn(
      { code: 'logContext.unreadableEnvelope' },
      'Zarf çözülemedi — alt süreç kendi kimliğini üretti',
    );
  }
  logger.info({ code: 'child.ready' }, 'Alt süreç bağlamı zarftan kurdu');
});
