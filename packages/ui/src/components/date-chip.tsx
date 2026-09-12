/**
 * DateChip — tarih çipi, `23 Ağustos 2026`. Radix ilkeli **yok**, düz bir
 * `<time>` (sözleşme 6.6 §1.10).
 *
 * ⚠️ **ANAHTAR YOK** — gerekçe CurrencyValue ile aynı: basılan tek metin
 * `formatDate`in `Intl` çıktısı, ay adı dahil (`tr-TR` CLDR verisi); çevrilecek
 * bir etiket yok, `common:ui.dateChip.*` grubu açılmadı, `_KEYS` yok (testte
 * modül ad alanı üzerinden iddia ediliyor).
 *
 * ⚠️ **`<time dateTime>` — makine için ISO, insan için Türkçe.** Görünen metin
 * zaman dilimine göre değişir (`23 Ağustos` UTC'de, `24 Ağustos` İstanbul'da —
 * `format.ts` ③'te ölçülen sınır vakası: `2026-08-23T22:30:00Z`); `dateTime`
 * ise **her zaman UTC ISO** (`toISOString()`), yani aynı an iki gösterimde
 * de tek bir gerçeğe bağlı kalır. İkisi tek bir saf fonksiyondan
 * (`dateChipContent`) çıkar ki girdi **bir kez** doğrulanıp iki kez basılsın;
 * JSX'in içinde hesap yok (6.5 `indicatorOffsetPercent` dersi).
 *
 * ⚠️ **GEÇERSİZ `Date` SESSİZCE GEÇMEZ — ve mesaj BİZİM.** `new Date('x')`
 * fırlatmaz, `getTime()` `NaN` döner; `toISOString()` bunu İngilizce bir
 * `RangeError` ile (`Invalid time value`) yakalardı ama hangi bileşenin, hangi
 * girdiyle kırıldığı görünmezdi. Kapı burada, Türkçe ve girdiyi taşıyor
 * (emsal `bandForAttribute`).
 *
 * ⚠️ **VARSAYILAN ZAMAN DİLİMİ UTC — makineden OKUNMAZ.** Karar `@fms/shared`in
 * (`DEFAULT_TIME_ZONE`; gerekçesi ölçülmüş: aynı girdi makineye göre farklı
 * gün basıyordu). Bu bileşen o kararı **devralır**, yeniden vermez; `timeZone`
 * verilirse olduğu gibi `formatDate`e geçer. Geçersiz bir IANA adı `Intl`in
 * kendi `RangeError`uyla düşer — ikinci bir doğrulama **yazılmadı**: iki kapı
 * bir gün ayrışırdı ve `Intl` zaten sessiz kalmıyor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * YÜZEY: Badge'in NÖTR yüzeyi REFERANSLA; YERLEŞİM çipin kendi kararı
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Zemin/kenar/metin token'ları `BADGE_VARIANT_CLASSES.neutral`den geliyor —
 * **kopyalanmıyor**, testte sınıf sınıf `badge.ts`in kendi değerine karşı iddia
 * ediliyor (iki yüzey ayrışamaz). Yerleşim (`DATE_CHIP_BASE`) ise Badge'in
 * `BADGE_BASE`inin kopyası **değil**, çipin kendi kararı: `tabular-nums`
 * eklendi — bir fikstür listesinde `3 Ağustos` ile `23 Ağustos` alt alta
 * geldiğinde rakamlar eş genişlikte hizalansın. `BADGE_BASE` dışa
 * aktarılmıyor ve `badge.tsx` bu yazarın dosyası değil; yerleşimin de
 * paylaşılması istenirse o dışa aktarım ÇIKTI'da İSTEK olarak duruyor.
 *
 * ⚠️ **BOYUT VE AİLE SINIFLARI ETİKETLİ** (`text-[length:…]`,
 * `font-[family-name:…]`) — ölçüm CurrencyValue'nun başlığında: etiketsiz
 * `text-[var(--text-2xs)]` Tailwind 4.3.3'te `color:` olarak derleniyor ve
 * tailwind-merge'de nötr yüzeyin `text-[var(--text-secondary)]`i tarafından
 * **siliniyor** (`text-[var(--text-2xs)] text-[var(--text-secondary)]` →
 * yalnızca ikincisi). Yani Badge idiyomu bu dosyaya olduğu gibi taşınsaydı çip
 * boyutunu daha yazılırken kaybederdi. Etiketli biçimde iki sınıf ayrı grupta
 * kalıyor ve test bunu **birleşik `className` üzerinde** iddia ediyor.
 *
 * **TAKLİT ETMEDİĞİ:** göreli zaman (*"3 gün sonra"*) · zaman dilimi tespiti
 * (varsayılan UTC, `@fms/shared` kararı) · saat gösterimi (`formatDate`
 * yalnızca gün-ay-yıl basar) · oyun içi takvim anlamı (*"transfer dönemi
 * kapanışı"* gibi etiketler çağıranın) · çipin ekrandaki görünümü — jsdom
 * `getComputedStyle` `var()` çözmüyor (6.0 ölçümü), sınıf adları iddia
 * ediliyor; görsel doğrulama **Faz 17** (Playwright, G-02) ve **Faz 49** (G-05).
 */
import { formatDate } from '@fms/shared';
import type { ReactElement, TimeHTMLAttributes } from 'react';

import { cn } from '../lib/cn.js';
import { BADGE_VARIANT_CLASSES } from './badge.js';

/**
 * Çipin yerleşimi — Badge ile aynı token'lar, artı `tabular-nums` (gerekçe
 * dosya başında). Renk YOK: yüzey `BADGE_VARIANT_CLASSES.neutral`den.
 */
const DATE_CHIP_BASE =
  'inline-flex items-center rounded-[var(--radius-full)] border ' +
  'px-[var(--space-2)] py-[2px] font-[family-name:var(--font-ui)] ' +
  'text-[length:var(--text-2xs)] font-medium tabular-nums whitespace-nowrap';

/** `dateChipContent`in çıktısı: makine için ISO, insan için Türkçe. */
export interface DateChipContent {
  /** `<time dateTime>` değeri — her zaman UTC ISO 8601. */
  readonly dateTime: string;
  /** Görünen metin — `formatDate`, verilen zaman diliminde. */
  readonly text: string;
}

/**
 * Çipin iki metni — saf yarı, JSX dışında.
 *
 * Doğrular (sözleşme: `Number.isNaN(date.getTime())` → `RangeError`) ve
 * `formatDate`e **geçirir**; biçimi yeniden yazmaz. `timeZone` yalnızca
 * verildiğinde seçeneklere giriyor (`exactOptionalPropertyTypes`).
 */
export function dateChipContent(date: Date, timeZone?: string): DateChipContent {
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(
      `Tarih çipi geçerli bir tarih bekliyor, getTime() NaN döndü: ${String(date)}`,
    );
  }
  return {
    dateTime: date.toISOString(),
    text: timeZone === undefined ? formatDate(date) : formatDate(date, { timeZone }),
  };
}

export interface DateChipProps extends Omit<
  TimeHTMLAttributes<HTMLTimeElement>,
  'children' | 'dateTime'
> {
  /** Gösterilecek an. Geçersizse (`getTime()` NaN) `RangeError`. */
  date: Date;
  /** IANA zaman dilimi. Verilmezse `@fms/shared`in `DEFAULT_TIME_ZONE`si (UTC). */
  timeZone?: string;
}

export function DateChip({ date, timeZone, className, ...rest }: DateChipProps): ReactElement {
  const { dateTime, text } = dateChipContent(date, timeZone);
  return (
    <time
      dateTime={dateTime}
      className={cn(DATE_CHIP_BASE, BADGE_VARIANT_CLASSES.neutral, className)}
      {...rest}
    >
      {text}
    </time>
  );
}
