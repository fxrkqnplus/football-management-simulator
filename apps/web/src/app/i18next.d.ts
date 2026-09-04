/**
 * TİPLİ ANAHTARLAR — 5.0'ın kararının uygulaması.
 *
 * `CustomTypeOptions` modül genişletmesi, `t()` çağrılarındaki **literal**
 * anahtarları derleme zamanında doğrular: yanlış yazılmış bir anahtar
 * `pnpm typecheck`i **kırar**.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * 5.0'IN KARARI KOŞULLUYDU — 5.3 ONU İKİ YÖNLÜ BİR KONTROL DENEYİYLE DOĞRULADI
 * ────────────────────────────────────────────────────────────────────────────
 *
 * 5.0: *"install yapılmadan koşturulamadı. 5.3 bir kontrol deneyiyle doğrular —
 * kasten yanlış anahtar `typecheck`i KIRMALI. «Belgede yazıyor» bir ölçüm
 * değildir."*
 *
 * Deney **iki yönlü** koşturuldu (SAPMA-012 deseni: tek yön, her şeyi reddeden
 * bozuk bir yapılandırmayla da geçer):
 *   ① Yanlış anahtar → `typecheck` **kırıldı**: `error TS2345`, çıkış kodu 2 —
 *      ve hata mesajı **geçerli 17 anahtarı tek tek sayıyor**, yani tipleme
 *      gerçekten kaynak JSON'lardan türemiş.
 *   ② Doğru anahtar → `typecheck` **geçti** (aynı dosyada, aynı koşuda).
 * Ölçümler `docs/reports/faz-05/5.3-*.md` §3'te.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ÖN KOŞULLAR — 5.0'da ölçülmüştü, burada kullanılıyor
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `tsconfig.base.json`:24 `strict: true` · :40 `resolveJsonModule: true` ·
 * TypeScript `~6.0.3` (i18next belgesi ≥ 5.0 istiyor, peer `^5 || ^6 || ^7`).
 *
 * ⚠️ **DİNAMİK ANAHTARLAR BU TİPLEMEYLE DERLENMEZ** ve bu beklenen:
 * `t('errors:' + code)` birleştirilmiş bir dizedir ve tipli anahtar kümesine
 * oturmaz. 5.0'ın kararı gereği her dinamik ailenin **tek bir yardımcısı**
 * olacak ve kaçış orada, gerekçesiyle, tek yerde duracak. İlk tüketici 5.4.
 */
import 'i18next';

import type { DEFAULT_NAMESPACE, trResources } from './i18n.js';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof DEFAULT_NAMESPACE;
    resources: typeof trResources;
    /** Anahtar bulunamazsa `null` değil, anahtarın kendisi döner. */
    returnNull: false;
  }
}
