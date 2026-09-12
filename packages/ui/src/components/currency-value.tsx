/**
 * CurrencyValue — para tutarı, `€1,2 mn` biçiminde. Radix ilkeli **yok**, düz
 * bir `<span>` (sözleşme 6.6 §1.9).
 *
 * ⚠️ **ANAHTAR YOK, `useTranslation` YOK — bu bir eksik değil, sözleşmenin
 * kendisi.** Bileşenin bastığı tek şey `formatMoneyCompact`in çıktısı; o dize
 * `Intl`den (`tr-TR`, ICU) geliyor, bir çeviri kaynağından değil. Çevrilecek
 * bir etiket olmadığı için `common:ui.currencyValue.*` grubu **açılmadı**
 * (`i18n-keys.ts` YÖN ② hayalet kaydı reddeder) ve bu modül `_KEYS` ile biten
 * hiçbir şey dışa aktarmaz — aktarsaydı `i18n-keys.test.ts` ② YÖN ① onu
 * *"kayıtsız"* diye kırardı. Test bunu modül ad alanı üzerinden **iddia
 * ediyor**, prose'da bırakmıyor.
 *
 * ⚠️ **`amount` ANA BİRİMDİR (euro), kuruş/cent DEĞİL.** Kuruştan ana birime
 * dönüşüm **veri katmanının** işi; burada `/100` yazmak, bir gün iki kez
 * bölünen ya da hiç bölünmeyen bir tutar demek olurdu. Bileşen aldığı sayıyı
 * **olduğu gibi** biçimlendirir.
 *
 * ⚠️ **SONLU OLMAYAN TUTAR SESSİZCE GEÇMEZ.** `Intl` `NaN` için `€NaN`,
 * `Infinity` için `€∞` basar — ikisi de bir hesap hatasının ekrana sızmasıdır
 * ve bir gösterim sorunu gibi görünür. `RangeError`, Türkçe mesaj, girdi
 * mesajda (emsal `bandForAttribute`).
 *
 * ⚠️ **BİÇİM YENİDEN YAZILMADI.** Küçük harf `mn`, U+00A0 ayırıcı, eksi
 * işaretinin simgeden önce gelmesi (`-€1,2 mn`) — hepsi `@fms/shared`in
 * `format.ts`inde ölçülmüş ve orada test edilmiş kararlar. Burada yalnızca
 * **geçiş** (çağrı gerçekten oraya gidiyor mu, `currency` oraya ulaşıyor mu)
 * ve **biçim** (kriter dizesi kod noktalarıyla geliyor mu) sınanıyor; ICU'nun
 * parça yapısı ikinci kez iddia edilmiyor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ SINIF ADI `font-[family-name:var(--font-mono)]` — ETİKETLİ, ve bu ÖLÇÜLDÜ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Deponun 6.4/6.5 idiyomu etiketsiz `font-[…var(--font-ui)]`. Bu alt görevde
 * iki araç ölçüldü ve ikisi de aynı şeyi söyledi:
 *   · **Tailwind 4.3.3** (`@tailwindcss/node` `compile`, `apps/web`in Vite
 *     eklentisinin altındaki motor): `font-[…var(--font-mono)]` →
 *     `font-weight: var(--font-mono)` (yanlış özellik, geçersiz değer);
 *     `font-[family-name:var(--font-mono)]` → `font-family: var(--font-mono)`.
 *   · **tailwind-merge 3.6.0**: etiketsiz biçim `font-medium` ile aynı gruba
 *     düşüyor ve **sonuncusu kazanıyor** (`font-[…var(--font-mono)] font-medium`
 *     → `font-medium`); etiketli biçim ayrı grupta kalıyor.
 * Yani etiketsiz sınıf **çift yönlü ölü**: derlenmiş CSS'te yanlış özellik,
 * `cn()`de çağıranın ağırlığı tarafından silinme. Tailwind'in kendi belgesi
 * de `var()` taşıyan değeri *"belirsiz"* sayıp veri tipi ipucu istiyor
 * (`length:` · `color:` · `family-name:`). Aynı bulgu deponun mevcut
 * bileşenlerini de ilgilendiriyor; oraya dokunmak bu yazarın işi değil,
 * ÇIKTI'da İSTEK olarak duruyor. **Bu dosyada etiketsiz `text-[var(--…)]` /
 * `font-[var(--…)]` yok** ve testte `family-name:` etiketi iddia ediliyor.
 *
 * **TAKLİT ETMEDİĞİ:** kuruş dönüşümü (veri katmanı) · tam tutar
 * (`€1.234.567`) tooltip'i — kompakt biçim hassasiyet gizler, tam tutarı
 * göstermek ekranın kararıdır (V2 adayı, İSTEK'te) · negatif tutarın
 * renklendirilmesi — renk anlam taşır ve anlam çağıranın (bütçe açığı ile
 * ödenmiş bonservis ikisi de eksi) · TRY/çoklu para birimi (`DEFAULT_CURRENCY`
 * EUR; `currency` yalnızca geçirilir) · **`--font-mono`/`tabular-nums`in
 * ekranda gerçekten uygulandığı** — jsdom `getComputedStyle` `var()` çözmüyor
 * (6.0 ölçümü), sınıf adı iddia ediliyor; derlenmiş CSS bu alt görevde
 * `compile` ile ölçüldü, görsel doğrulama **Faz 17** (Playwright, G-02) ve
 * **Faz 49** (G-05).
 */
import { formatMoneyCompact } from '@fms/shared';
import type { HTMLAttributes, ReactElement } from 'react';

import { cn } from '../lib/cn.js';

/**
 * Sayı için eş genişlikli rakamlar ve mono yazı tipi: tutarlar bir tabloda
 * alt alta geldiğinde basamaklar hizalanır. Renk YOK — bileşen bulunduğu
 * bağlamın rengini devralır (tablo hücresi, rozet, başlık).
 */
const CURRENCY_VALUE_BASE = 'font-[family-name:var(--font-mono)] tabular-nums';

export interface CurrencyValueProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Tutar, **ana birimde** (euro). Sonlu bir sayı olmalı. */
  amount: number;
  /** ISO 4217 kodu. Verilmezse `@fms/shared`in `DEFAULT_CURRENCY`si (EUR). */
  currency?: string;
}

/**
 * Basılacak metin — saf yarı, JSX dışında.
 *
 * Doğrular ve `formatMoneyCompact`e **geçirir**; biçimi yeniden yazmaz.
 * `currency` yalnızca verildiğinde seçeneklere giriyor: `exactOptionalPropertyTypes`
 * altında `{ currency: undefined }` `FormatMoneyOptions`a uymaz ve bu doğru —
 * *"verilmedi"* ile *"undefined verildi"* aynı şey değil.
 */
export function currencyValueText(amount: number, currency?: string): string {
  if (!Number.isFinite(amount)) {
    throw new RangeError(`Para tutarı sonlu bir sayı olmalı: ${String(amount)}`);
  }
  return currency === undefined
    ? formatMoneyCompact(amount)
    : formatMoneyCompact(amount, { currency });
}

export function CurrencyValue({
  amount,
  currency,
  className,
  ...rest
}: CurrencyValueProps): ReactElement {
  return (
    <span className={cn(CURRENCY_VALUE_BASE, className)} {...rest}>
      {currencyValueText(amount, currency)}
    </span>
  );
}
