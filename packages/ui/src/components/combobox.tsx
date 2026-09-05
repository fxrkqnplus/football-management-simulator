/**
 * Combobox — aranabilir tek seçimli liste.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN `cmdk` KURULMADI — ve neden liste ELDE YAZILDI
 * ────────────────────────────────────────────────────────────────────────────
 *
 * shadcn/ui'nin Combobox'ı `Popover` + **`cmdk`** ile kuruluyor. `cmdk` bu
 * depoya **girmedi** ve gerekçe ölçülmüş: 6.0 `DEPENDENCY-WATCH`e shadcn/ui
 * çalışma zamanı için satır eklerken **`cmdk`i saymadı** — yani sürümü,
 * peer'ları ve `strict-peer-dependencies=true` altındaki durumu hiç
 * doğrulanmadı. Doğrulanmamış bir bağımlılığı kurmak, 6.0'ın tam olarak
 * önlemek için yaptığı işi çöpe atardı. Bu bileşenin ihtiyacı olan şey
 * (filtreleme + ok tuşları + `role="listbox"`) ARIA'nın tarif ettiği bir
 * desen; bir kütüphane gerektirmiyor.
 *
 * Kullanılan tek Radix ilkeli **`@radix-ui/react-popover`** — açılır katmanın
 * odak tuzağı, dış tıklama ve `Esc` davranışı onun işi.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * KULLANICIYA GÖRÜNEN İKİ METİN — ikisi de `common:ui.combobox.*`
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `searchLabel` (arama kutusunun `aria-label`i) ve `empty` (sonuç yokken
 * görünen satır). İkisi de çağıran tarafından ezilebilir; ezilmezse çeviri
 * kaynağından gelir. Sabit Türkçe metin **hiçbir yolda** yok (K5).
 *
 * ⚠️ **jsdom SINIRI:** Popover konumlandırma için `ResizeObserver` ve
 * `getBoundingClientRect` istiyor. Doldurmalar `vitest.setup.ts`te; testler
 * listenin **içeriğini ve klavye davranışını** sınıyor, **konumunu** değil.
 */
import * as RadixPopover from '@radix-ui/react-popover';
import { type KeyboardEvent, type ReactElement, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '../lib/cn.js';
import { Input } from './input.js';

/**
 * Bu bileşenin çeviri anahtarları — **bileşenin yanında** duruyor.
 *
 * Gerekçe `select.tsx`teki blokta ölçümüyle yazılı: `i18n:check` `t(X.y)`
 * çağrısında `X`i yalnızca **aynı dosyada** çözebiliyor; merkezî bir modülden
 * import edilseydi kapı üç anahtarı birden *"kullanılmayan"* diye bildirirdi
 * (bu tam olarak yaşandı). `i18n-keys.ts` bunları **topluyor**, tanımlamıyor.
 *
 * ⚠️ `placeholder` Select'inkinden **ayrı bir anahtar** ve bu bilinçli: iki
 * bileşen aynı dizeyi paylaşmak zorunda değil, ve paylaşsalardı bu dosya
 * `select.tsx`i import etmek zorunda kalırdı — yani yukarıdaki çözülemezlik
 * sorununa geri dönerdik.
 */
export const COMBOBOX_KEYS = {
  /** Hiçbir şey seçilmemişken tetikleyicide görünen metin. */
  placeholder: 'common:ui.combobox.placeholder',
  /** Arama kutusunun `aria-label`i. */
  searchLabel: 'common:ui.combobox.searchLabel',
  /** Filtre hiçbir şey döndürmediğinde görünen satır. */
  empty: 'common:ui.combobox.empty',
} as const;

export interface ComboboxOption {
  value: string;
  /** Kullanıcıya görünen etiket — **çağıran** çevirir (bileşen değil). */
  label: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  options: readonly ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  /** Tetikleyicinin `aria-label`i — çağırandan, çünkü bağlamı o biliyor. */
  triggerLabel: string;
  /** Hiçbir şey seçilmemişken tetikleyicide görünen metin. */
  placeholder?: string;
  searchLabel?: string;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Bir dizeyi **eşleştirme** biçimine indirger.
 *
 * ⚠️ **`toLowerCase()` TEK BAŞINA YETMİYOR — 6.4'te ölçülerek bulundu, ve bu
 * dosyanın İLK yazımındaki gerekçe YANLIŞTI.**
 *
 * İlk yorum *"dilden bağımsız `toLowerCase()` her iki yazımı da yakalıyor"*
 * diyordu. Test onu çürüttü: `filterOptions(…, 'iSPA')` **boş** döndü.
 * Ölçüm (kod noktası kod noktası):
 *
 *     'İspanya'.toLowerCase()  →  U+0069 U+0307 U+0073 U+0070 …
 *                                  ( i  +  BİRLEŞEN NOKTA )
 *
 * Yani Unicode'un `İ` (U+0130) için varsayılan küçültmesi tek bir `i` değil,
 * `i` **artı ayrı bir birleşen nokta**. Sonuç sekiz kod noktası uzunluğunda ve
 * `.includes('ispa')` ona **false** diyor — çünkü `i` ile `s` arasında
 * görünmeyen bir kod noktası duruyor.
 * Ekranda hiçbir genişlik kaplamıyor — tam olarak
 * *"Türkçe küçük/büyük harf dönüşümü GÜVENLİ DEĞİLDİR"* uyarısının bu
 * bileşendeki karşılığı.
 *
 * Çare **dar tutuldu**: yalnızca U+0307 eleniyor.
 * · `Türkiye` → `türkiye` — `ü` (U+00FC) **önceden birleşik** bir kod noktası,
 *   dokunulmuyor. Yani arama **aksana duyarlı** kalıyor.
 * · `İnter` ve `Inter` ikisi de `inter`e iniyor — karışık dilli kulüp adları
 *   tek bir sorguyla bulunuyor.
 *
 * ⚠️ **AKSANA DUYARSIZ ARAMA (`turkiye` → `Türkiye`) BİLEREK YAPILMADI.** O bir
 * arama semantiği kararı ve sahibi **Faz 32** (transfer arama + filtre); burada
 * uydurmak, kimsenin belirlemediği bir alana değer yazmak olurdu (SAPMA-026).
 * Bugün düzeltilen şey bir **kusur**, genişletilen bir davranış değil.
 *
 * ⚠️ `toLocaleLowerCase('tr')` de kullanılmıyor: Türkçe kuralı `I` → `ı`
 * yapıyor ve `Inter` araması `Inter`i kaçırırdı — arama bir **eşleştirme**,
 * bir görüntüleme değil.
 */
/**
 * U+0307 COMBINING DOT ABOVE.
 *
 * ⚠️ **KAÇIŞ DİZİSİYLE yazılıyor, gömülü karakterle DEĞİL.** Bu kod noktası
 * ekranda hiçbir genişlik kaplamıyor; kaynağa gömülü hâli `i18n:check`in
 * görünmez karakter taramasının tam olarak aradığı şey ve bir okuyucu onu
 * gözle ayırt edemez (Faz 5'in sekiz NBSP'sinin dersi).
 */
const COMBINING_DOT_ABOVE = '\u0307';

/** Yukarıdaki gerekçenin uygulaması: küçült, sonra birleşen noktayı ele. */
export function foldForSearch(text: string): string {
  return text.toLowerCase().replaceAll(COMBINING_DOT_ABOVE, '');
}

/** Filtreleme — `foldForSearch` üzerinden alt dize araması. */
export function filterOptions(
  options: readonly ComboboxOption[],
  query: string,
): readonly ComboboxOption[] {
  const needle = foldForSearch(query.trim());
  if (needle === '') return options;
  return options.filter((option) => foldForSearch(option.label).includes(needle));
}

/** Bir sonraki seçilebilir (devre dışı olmayan) öğenin indeksi; yoksa -1. */
export function nextEnabledIndex(
  options: readonly ComboboxOption[],
  from: number,
  step: 1 | -1,
): number {
  const length = options.length;
  if (length === 0) return -1;
  for (let offset = 1; offset <= length; offset += 1) {
    // Negatif modülo düzeltmesi: JS'te `-1 % 3` **-1** verir, 2 değil.
    const index = (((from + step * offset) % length) + length) % length;
    if (options[index]?.disabled !== true) return index;
  }
  return -1;
}

export function Combobox({
  options,
  value,
  onValueChange,
  triggerLabel,
  placeholder,
  searchLabel,
  emptyLabel,
  disabled = false,
  className,
}: ComboboxProps): ReactElement {
  const { t } = useTranslation();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const visible = useMemo(() => filterOptions(options, query), [options, query]);
  const selected = options.find((option) => option.value === value);

  const commit = (index: number): void => {
    const option = visible[index];
    if (option === undefined || option.disabled === true) return;
    onValueChange?.(option.value);
    setOpen(false);
    setQuery('');
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) =>
        nextEnabledIndex(visible, current, event.key === 'ArrowDown' ? 1 : -1),
      );
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      commit(activeIndex);
    }
  };

  return (
    <RadixPopover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setActiveIndex(0);
      }}
    >
      <RadixPopover.Trigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={triggerLabel}
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between gap-[var(--space-2)] ' +
              'rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] ' +
              'px-[var(--space-3)] font-[var(--font-ui)] text-[var(--text-sm)] ' +
              'transition-colors duration-[var(--duration-fast)] ' +
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ' +
              'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] ' +
              'disabled:cursor-not-allowed disabled:opacity-50',
            selected === undefined ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]',
            className,
          )}
        >
          <span>{selected?.label ?? placeholder ?? t(COMBOBOX_KEYS.placeholder)}</span>
        </button>
      </RadixPopover.Trigger>

      <RadixPopover.Portal>
        <RadixPopover.Content
          className={cn(
            'z-[var(--z-dropdown)] w-[var(--radix-popover-trigger-width)] min-w-[12rem] ' +
              'rounded-[var(--radius-md)] border border-[var(--border-subtle)] ' +
              'bg-[var(--bg-elevated)] p-[var(--space-1)] shadow-[var(--shadow-md)]',
          )}
          align="start"
          sideOffset={4}
        >
          <Input
            aria-label={searchLabel ?? t(COMBOBOX_KEYS.searchLabel)}
            aria-controls={listId}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onSearchKeyDown}
            className="mb-[var(--space-1)]"
          />
          <ul ref={listRef} id={listId} role="listbox" className="max-h-60 overflow-y-auto">
            {visible.length === 0 ? (
              <li
                role="option"
                aria-selected={false}
                aria-disabled
                className="px-[var(--space-3)] py-[var(--space-2)] text-[var(--text-sm)] text-[var(--text-muted)]"
              >
                {emptyLabel ?? t(COMBOBOX_KEYS.empty)}
              </li>
            ) : (
              visible.map((option, index) => (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  aria-disabled={option.disabled === true ? true : undefined}
                  data-active={index === activeIndex ? '' : undefined}
                  onClick={() => {
                    commit(index);
                  }}
                  className={cn(
                    'cursor-default rounded-[var(--radius-sm)] px-[var(--space-3)] py-[var(--space-1)] ' +
                      'font-[var(--font-ui)] text-[var(--text-sm)] text-[var(--text-primary)]',
                    index === activeIndex && 'bg-[var(--bg-hover)]',
                    option.disabled === true && 'pointer-events-none opacity-50',
                  )}
                >
                  {option.label}
                </li>
              ))
            )}
          </ul>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
