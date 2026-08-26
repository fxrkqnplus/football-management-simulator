import { z } from 'zod';

import { LOG_CONTEXT_ENVELOPE_VERSION, type LogContextEnvelope } from '../log-context.js';
import type { LogContext } from '../logger.js';

/**
 * Taşınabilir log bağlamı zarfı — ÇÖZÜCÜ YARISI (`docs/spec/09` §11.1).
 *
 * Üretici yarısı kökte: `packages/shared/src/log-context.ts`. Bölünmenin
 * gerekçesi orada yazılı; özet: **zarf çözmek bir dış girdi ayrıştırmaktır**
 * ve Zod ister, Zod ise kök barrel'a giremez (Faz 2.1'de ölçüldü — barrel
 * üzerinden motora sızıyordu, 2.2a'da düzeltildi).
 *
 * ── ZARF NEDEN DIŞ GİRDİDİR ──────────────────────────────────────────────
 * Kendi ürettiğimiz bir zarfı çözüyor gibiyiz, ama çözen süreç onu üreten
 * süreç DEĞİL. Aradan argv, ortam değişkeni veya Redis geçiyor; içerik
 * kesilmiş, kodlaması bozulmuş, elle kurcalanmış veya **başka bir sürümden**
 * gelmiş olabilir. "Biz yazdık, doğrudur" varsayımı tam olarak bu sınırda
 * çöker — CLAUDE.md §1.3 bu yüzden Zod istiyor.
 */

/**
 * Zarf şeması.
 *
 * ⚠️ SÜRÜM SABİTİ BURADA YENİDEN YAZILMAZ — kökten geliyor. İki yarının
 * ayrışabileceği tek gerçek yer sürüm numarasıydı; `z.literal()` içine
 * kanonik sabiti koyarak o kapı kapatıldı.
 */
export const logContextEnvelopeSchema = z
  .object({
    v: z.literal(LOG_CONTEXT_ENVELOPE_VERSION),
    // Zarf anahtarları serbest (bağlam alanları sabit değil), değerler dar.
    // `catchall` yerine `record`: anahtar kümesi bilinmiyor, değer tipi biliniyor.
    ctx: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  })
  .strict();

/**
 * ŞEMA ↔ KANONİK TİP BAĞI — bölünmenin ayrışma riskini derleme zamanında kapatır.
 *
 * Şemanın çıkardığı tip kökteki `LogContextEnvelope`'a atanabilir olmalı.
 * Şema şekli kayarsa (alan eklenir, değer tipi genişler, `v` gevşetilir)
 * `Assert<false>` oluşur ve **`pnpm typecheck` kırılır**. Yorum değil, kapı.
 *
 * ⚠️ SAF TİP DÜZEYİNDE, bilerek: ilk yazımda bu bağ bir fonksiyon değeriydi
 * (`const f: (p: Infer) => Canonical = (p) => p`). Aynı garantiyi veriyordu
 * ama **çalışma zamanına asla çağrılmayan bir fonksiyon** bırakıyordu ve
 * kapsam raporunda `log-context.ts` fonksiyon kapsamı %50 görünüyordu.
 * Kapsam rakamı bu projede bir kapı (K10); onu ölü kodla kirletmek, sonra
 * gelen birinin "kapsamı düzelteyim" diye bu satırı **silmesine** davetiye
 * çıkarır. Tip düzeyinde biçim hiçbir JS üretmez: ne kapsam gürültüsü, ne
 * paket ağırlığı, aynı derleme hatası.
 *
 * ⚠️ VE NEDEN `export`: `noUnusedLocals` açık, yerel bir tip takma adı
 * kullanılmadığı için **TS6196** veriyordu. Dışa aktarılan tip "kullanılmamış"
 * sayılmaz. Barrel'dan (`server/index.ts`) yeniden aktarılmıyor, yani paketin
 * dış yüzeyine çıkmıyor — yalnızca modül içi bir kapı olarak duruyor.
 *
 * Kapının öttüğü ÖLÇÜLDÜ (2.3b), iki ayrı kayma denendi:
 *   • `v: z.literal(...)` → `z.number()`  ⇒ TS2344
 *   • değer birliği → `z.unknown()`       ⇒ TS2344
 */
type Assert<T extends true> = T;
export type SchemaMatchesCanonicalShape = Assert<
  z.infer<typeof logContextEnvelopeSchema> extends LogContextEnvelope ? true : false
>;

/**
 * Zarf dizgesini log bağlamına çevirir.
 *
 * ── NEDEN FIRLATMIYOR, `null` DÖNÜYOR ────────────────────────────────────
 * Bozuk bir izleme zarfı yüzünden çocuğun işini düşürmek, çözdüğünden çok
 * sorun yaratır — zarf teşhis amaçlıdır, yetkilendirme değil. 2.3a'da gelen
 * `X-Correlation-Id` başlığı için verilen kararın aynısı: **reddetme, kendi
 * kimliğini üret ve durumu `warn` ile logla.**
 *
 * `null` sessiz bir yutma DEĞİL (CLAUDE.md §1.3): çağıran taraf `null`'ı
 * görmek ve loglamak zorunda, çünkü dönüş tipi onu buna zorluyor. Sessiz
 * `catch` olsaydı çağıran hiçbir şey göremezdi.
 *
 * @returns geçerli zarfın bağlamı, veya çözülemezse `null`
 */
export function deserializeLogContext(raw: string): LogContext | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Bozuk JSON — tek olası neden budur ve `null` zaten "çözemedim" demek.
    // Hata nesnesinin kendisi bir bilgi taşımıyor (konum bilgisi kurcalanmış
    // bir zarfta yanıltıcı); çağıran taraf durumu loglar.
    return null;
  }

  const result = logContextEnvelopeSchema.safeParse(parsed);
  if (!result.success) return null;

  return result.data.ctx;
}
