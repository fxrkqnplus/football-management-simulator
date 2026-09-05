/**
 * Select — Radix `@radix-ui/react-select` uyarlaması.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * BU BİLEŞEN, `packages/ui`NİN İLK KULLANICIYA GÖRÜNEN METNİNİ TAŞIYOR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Sözleşme 6.0 ⑤'te karara bağlandı: **`common:ui.<bileşenAdı>.<alan>`**.
 * Buradaki tek dize `common:ui.select.placeholder` — hiçbir şey seçilmemişken
 * tetikleyicide görünen metin. Çağıran isterse `placeholder` propuyla kendi
 * (yine çevrilmiş) metnini verir; **vermezse** bileşen kendi anahtarını
 * çözer. Sabit Türkçe metin **hiçbir yolda** yok (K5).
 *
 * ⚠️ **`react-i18next` BURADA BİR PEER BAĞIMLILIK.** Tasarım sistemi kendi
 * i18next örneğini KURMUYOR; uygulamanınkini kullanıyor. İki örnek olsaydı iki
 * ayrı dil durumu olurdu ve tema değişimi gibi görünen bir hata sınıfı doğardı.
 * Testler bunu `renderWithI18n` yardımcısıyla sağlıyor (`test/render.tsx`).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * jsdom SINIRI — ADIYLA
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Radix Select açılırken `scrollIntoView`, işaretçi yakalama ve
 * `ResizeObserver` çağırıyor; jsdom'da **hiçbiri yok** (6.0'da ölçüldü).
 * Doldurmalar `packages/ui/vitest.setup.ts`te ve her birinin **neyi taklit
 * ETMEDİĞİ** orada yazılı. Bu yüzden buradaki testler açılan listenin
 * **varlığını ve klavye davranışını** sınıyor, **konumlandırmasını** değil.
 */
import * as RadixSelect from '@radix-ui/react-select';
import type { ComponentPropsWithoutRef, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '../lib/cn.js';

/**
 * Bu bileşenin çeviri anahtarları.
 *
 * ⚠️ **ANAHTARLAR BİLEŞENİN YANINDA, MERKEZİ BİR DOSYADA DEĞİL — ve bu bir
 * tercih değil, `i18n:check`in ÖLÇÜLMÜŞ sınırı.** İlk yazımda hepsi
 * `i18n-keys.ts`te toplanmıştı; kapı üçünü birden *"kullanılmayan anahtar"*
 * diye bildirdi. Sebebi aracın kendi başlığında yazılıydı: `t(X.y)` çağrısında
 * `X` **aynı dosyadaki** bir sabitse bütün değerleri çözülüyor, **import
 * edilmişse** çözülmüyor (import zinciri takip edilmiyor).
 *
 * İki çıkış vardı ve biri **yasaktı**: `i18n-dynamic-keys.ts`in kural ①'i
 * *"kod içinde bir tabloda duran anahtarlar beyan edilmez, çünkü `i18n-check`
 * onları veri akışıyla çözebiliyor"* diyor — yani aileyi beyan etmek, kapıyı
 * körleştirmek olurdu. Kalan doğru çıkış anahtarı **çözülebilir yere**
 * koymak. `i18n-keys.ts` artık bunları **toplayan** bir modül; iki liste yok,
 * biri diğerinden türüyor.
 */
export const SELECT_KEYS = {
  /** Hiçbir şey seçilmemişken tetikleyicide görünen metin. */
  placeholder: 'common:ui.select.placeholder',
} as const;

const TRIGGER_BASE =
  'flex h-9 w-full items-center justify-between gap-[var(--space-2)] ' +
  'rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] ' +
  'px-[var(--space-3)] font-[var(--font-ui)] text-[var(--text-sm)] text-[var(--text-primary)] ' +
  'transition-colors duration-[var(--duration-fast)] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' +
  'data-[placeholder]:text-[var(--text-muted)]';

const CONTENT_BASE =
  'z-[var(--z-dropdown)] min-w-[8rem] overflow-hidden rounded-[var(--radius-md)] ' +
  'border border-[var(--border-subtle)] bg-[var(--bg-elevated)] ' +
  'text-[var(--text-primary)] shadow-[var(--shadow-md)]';

const ITEM_BASE =
  'relative flex w-full cursor-default items-center rounded-[var(--radius-sm)] ' +
  'py-[var(--space-1)] pr-[var(--space-2)] pl-[var(--space-6)] ' +
  'font-[var(--font-ui)] text-[var(--text-sm)] outline-none select-none ' +
  'data-[highlighted]:bg-[var(--bg-hover)] data-[highlighted]:text-[var(--text-primary)] ' +
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

export interface SelectTriggerProps extends ComponentPropsWithoutRef<typeof RadixSelect.Trigger> {
  /**
   * Hiçbir şey seçilmemişken görünen metin. **Verilmezse**
   * `common:ui.select.placeholder` çözülür — yani her iki yolda da metin
   * çeviri kaynağından gelir.
   */
  placeholder?: string;
}

export const Select = RadixSelect.Root;
export const SelectGroup = RadixSelect.Group;
export const SelectValue = RadixSelect.Value;

export function SelectTrigger({
  className,
  placeholder,
  children,
  ...rest
}: SelectTriggerProps): ReactElement {
  const { t } = useTranslation();

  return (
    <RadixSelect.Trigger className={cn(TRIGGER_BASE, className)} {...rest}>
      {children ?? <RadixSelect.Value placeholder={placeholder ?? t(SELECT_KEYS.placeholder)} />}
      <RadixSelect.Icon asChild>
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 16 16"
          className="h-4 w-4 opacity-60"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </RadixSelect.Icon>
    </RadixSelect.Trigger>
  );
}

export function SelectContent({
  className,
  position = 'popper',
  children,
  ...rest
}: ComponentPropsWithoutRef<typeof RadixSelect.Content>): ReactElement {
  return (
    <RadixSelect.Portal>
      <RadixSelect.Content className={cn(CONTENT_BASE, className)} position={position} {...rest}>
        {/* Öğeler `Viewport`in İÇİNDE olmak zorunda: Radix kaydırma ve
            klavye gezinmesini oraya bağlıyor. `children`ı doğrudan
            `Content`e vermek listeyi çizer ama gezinmeyi sessizce bozar. */}
        <RadixSelect.Viewport className="p-[var(--space-1)]">{children}</RadixSelect.Viewport>
      </RadixSelect.Content>
    </RadixSelect.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...rest
}: ComponentPropsWithoutRef<typeof RadixSelect.Item>): ReactElement {
  return (
    <RadixSelect.Item className={cn(ITEM_BASE, className)} {...rest}>
      <span className="absolute left-[var(--space-2)] flex h-3 w-3 items-center justify-center">
        <RadixSelect.ItemIndicator>
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 16 16"
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 8.5 6.5 12 13 4.5" />
          </svg>
        </RadixSelect.ItemIndicator>
      </span>
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
    </RadixSelect.Item>
  );
}
