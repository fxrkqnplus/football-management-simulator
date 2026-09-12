/**
 * PlayerPortrait — oyuncu portresi. `avatar.tsx`in (Radix Avatar) üstüne
 * oturur; `club-crest.tsx`in ikizi, ve ikisinin **farkları adıyla** burada:
 *
 *   · Köşe **`--radius-md`** (arma `--radius-sm`, `Avatar` `--radius-full`).
 *   · Görsel **`object-cover`** (`AvatarImage`in varsayılanı, EZİLMİYOR) —
 *     arma kırpılmaz, portre kırpılır (aşağı bak).
 *   · Yedek **silüet** (baş + omuz), baş harf YOK (aşağı bak).
 *   · `shape` prop'u **YOK** (K-6): tek şekil, çağıran seçmez.
 *
 * Görselin nereden geldiğini **bilmiyor** (K9: `DataProvider` çağıranın
 * katmanında); `src` hazır bir URL olarak gelir.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * KÖŞE `--radius-md`, GÖRSEL `object-cover` — ve ikisi de spec/12'den
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/12` §17.5 portreyi *"yüz merkezli kırpım"* ile **kare** üretiyor
 * (256×256 → 256/128/64; göz hizası üstten %38). Yani kaynak zaten kutuyla
 * aynı oranda ve yüz hizalı — `object-cover` burada hiçbir şeyi kesmez,
 * yalnızca kare olmayan (bozuk) bir kaynağı kutuya **doldurur**. Yüz hizalı
 * kırpma bu bileşenin işi DEĞİL (Faz 9, veri hattı). Köşe: `Avatar`ın dairesel
 * maskesi FM'in kart/liste dilinde portre için fazla "profil fotoğrafı",
 * armanın `--radius-sm`i ise çok sert; §7.4'ün orta basamağı (5px) seçildi.
 * `cn`/`tailwind-merge` `rounded-[var(--radius-full)]`ı **eziyor** (aynı
 * `rounded` grubu, sonraki kazanır); test iki yönlü iddia ediyor. ⚠️ İkisi
 * de jsdom'da **ölçülemedi** — `<img>` orada hiç çizilmiyor; ilk ölçülebilecek
 * yer **Faz 17**.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * BOYUTLAR BİR KALİBRASYON — spec bir portre kutusu boyutu VERMİYOR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `PLAYER_PORTRAIT_SIZES = { sm: 32, md: 48, lg: 96 }` px. Kaynağı yok;
 * gerekçe sayılarla uyumlu yazılıyor (6.1 δ ve 6.2 `Math.floor` emsali):
 *   · **sm 32** = `--space-8` — kadro tablosu satırı. Bir yüz bir kalkandan
 *     daha çok piksel ister: armanın `sm`i 24, portrenin `sm`i bir basamak
 *     üstü. 40px (`--space-10`) bir satırda 4'er px payla oturur.
 *   · **md 48** = `--space-12` — oyuncu kartı / liste başlığı. `spec/05` §7.5
 *     *"dokunma hedefi minimum 44×44px"*: `md` bir portre **tek başına**
 *     geçerli bir dokunma hedefi (profil açan kart), `sm` DEĞİL (orada hedef
 *     satırın kendisi). Test 44'ü iddia ediyor.
 *   · **lg 96** = 2 × `--space-12` = 24 × `SPACE_BASE_PX` — profil başlığı.
 *     Boşluk ölçeğinin bir basamağı DEĞİL (ölçek 64'te bitiyor), 4px
 *     ızgarasında; 1× yoğunlukta `spec/12`nin **128** varyantı küçültülerek,
 *     2×'te **256** varyantı birebir kullanılır — hiçbir varyant büyütülmez.
 * Oran `sm : md : lg = 2 : 3 : 6`. Test ızgarayı ve `sm < md < lg` sırasını
 * iddia ediyor. Hangi kaynak varyantının verileceği **çağıranın** kararı.
 *
 * Boyut **inline `style`** ile (`width`/`height` px) — gerekçe `club-crest.tsx`
 * ile aynı: sınıf listesi ikinci bir liste olurdu, template sınıfı Tailwind
 * taramasından kaçardı. Tek kaynak `PLAYER_PORTRAIT_SIZES`.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * YEDEK: SİLÜET — baş harf YOK, ve yedek de bir GÖRSELDİR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Görsel yoksa ya da yüklenemezse (K9: eksik varlık **beklenen** bir durum —
 * newgen'lerin gerçek fotoğrafı yoktur) yüzey token'larıyla bir baş + omuz
 * silüeti çizilir. Baş harf **yok**: bir kulübün baş harfleri kimliktir
 * (*"GS"* okunur), bir oyuncununki değildir (*"MY"* kimse değildir) — silüet
 * *"bu bir insan, görseli yok"* der ve bu doğru bilgidir. Omuzlar viewBox'ın
 * alt kenarına oturur: bir büst çerçeveyle kesilir, havada durmaz.
 *
 * Yedek `role="img"` + `aria-label` taşıyor — ekran okuyucu *"Arda Güler
 * portresi"* duyar; `AvatarImage`in `alt`ı ile **aynı** `t()` sonucu.
 * `delayMs={0}`: Radix yedeği bir makro görev sonra çizer — testler `findBy*`.
 *
 * **Boş `name` REDDEDİLMİYOR — bu bilinçli bir sınır.** Arma adı baş harfe
 * çevirmek zorunda olduğu için harfsiz adı reddediyor; portre addan hiçbir
 * şey **türetmiyor**, yalnızca `alt`a geçiriyor. Adın varlığı veri katmanının
 * sözleşmesi; burada bir doğrulama, kırpılacak bir şey olmadığı yerde
 * "sessiz kırpma" yasağını taklit etmek olurdu.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * SINIF ADLARI — ÖLÇÜLDÜ (`@tailwindcss/node` 4.3.3 `compile`)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `fill-[var(--bg-active)]` → `fill:` · `stroke-[var(--border-strong)]` →
 * `stroke:` · `rounded-[var(--radius-md)]` → `border-radius:` — üçü de tek
 * tipli yardımcı, etiket gerekmiyor. Bu dosyada yazı tipi sınıfı YOK (silüette
 * metin yok); `avatar.tsx`in kendi `font-[var(…)]`/`text-[…var(--text-sm)]`
 * sınıfları bu yazarın dosyası değil — ÇIKTI'da İSTEK.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * TAKLİT ETMEDİĞİ — adıyla
 * ────────────────────────────────────────────────────────────────────────────
 *
 * · **Yüz hizalı kırpma** — Faz 9 veri hattı (`spec/12` §17.5).
 * · **`PORTRAIT_STYLE=stylized`** (duotone/posterize, `spec/12` §17.6) — Faz
 *   9; bileşen gelen pikseli olduğu gibi gösterir.
 * · **Prosedürel avatar üretimi** — Faz 9. Silüet bir yer tutucu, üretim
 *   değil.
 * · **Varlık getirme / önbellek / `DATA_MODE`** — Faz 7.
 * · **jsdom görsel YÜKLEMEZ** (6.5'te ölçüldü): `<img>` bu ortamda hiç
 *   çizilmiyor, yalnızca yedek sınanıyor. *"Görsel gerçekten çiziliyor"*,
 *   `alt` ve `object-cover` → **Faz 17** (G-02); görsel doğrulama **Faz 49**
 *   (G-05).
 */
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '../lib/cn.js';
import { Avatar, AvatarFallback, AvatarImage } from './avatar.js';

/**
 * Bu bileşenin çeviri anahtarları — **bileşenin yanında** (gerekçe
 * `select.tsx`te ölçümüyle yazılı). `i18n-keys.ts` bunu **topluyor**.
 */
export const PLAYER_PORTRAIT_KEYS = {
  /** Görselin `alt`ı ve yedeğin erişilebilir adı: `{{name}} portresi`. */
  alt: 'common:ui.playerPortrait.alt',
} as const;

/**
 * Boyut envanteri — **liste**, sayı ondan türüyor. Değerler px ve bir
 * KALİBRASYON (dosya başı).
 */
export const PLAYER_PORTRAIT_SIZES = { sm: 32, md: 48, lg: 96 } as const;

export type PlayerPortraitSize = keyof typeof PLAYER_PORTRAIT_SIZES;

/** Portre köşesi — `Avatar`ın dairesel maskesini ezer (dosya başı). */
const ROOT_SHAPE = 'rounded-[var(--radius-md)]';

/** Silüet yüzeyleri — token'dan, sabit hex yok; armanın kalkanıyla aynı çift. */
const SILHOUETTE_SURFACE = 'fill-[var(--bg-active)] stroke-[var(--border-strong)]';

/** Baş — `0 0 24 24` viewBox'ında, üst üçte birde. */
const HEAD_CENTER = { cx: 12, cy: 8.5, r: 4 } as const;

/**
 * Omuzlar — alt kenara (y=24) oturan bir büst; çerçeve kesiyor, viewBox
 * kırpıyor (`svg:not(:root) { overflow: hidden }`). Yan kenarlarda pay var ki
 * kökün `overflow-hidden`ı çizgiyi kesmesin.
 */
const SHOULDERS_PATH = 'M3.5 24 C3.5 17.5 7.5 14.5 12 14.5 C16.5 14.5 20.5 17.5 20.5 24 Z';

export interface PlayerPortraitProps {
  /** Oyuncu adı — `alt` metni bundan türer. */
  name: string;
  /** Portre görselinin adresi. Yoksa ya da yüklenemezse silüet çizilir. */
  src?: string;
  /** Varsayılan `md`. */
  size?: PlayerPortraitSize;
  className?: string;
}

/**
 * Bir boyut adının piksel karşılığı — saf, ve geçersiz ad **sessizce
 * varsayılana düşmez** (`clubCrestPixelSize` ile aynı gerekçe: tipsiz bir
 * çağırandan gelen `'xl'` `undefined` genişlik olur ve `Avatar`ın `h-10`u
 * sessizce kazanırdı).
 */
export function playerPortraitPixelSize(size: string): number {
  if (!Object.hasOwn(PLAYER_PORTRAIT_SIZES, size)) {
    throw new RangeError(
      `Portre boyutu ${Object.keys(PLAYER_PORTRAIT_SIZES).join(' | ')} arasından olmalı: ${size}`,
    );
  }
  return PLAYER_PORTRAIT_SIZES[size as PlayerPortraitSize];
}

export function PlayerPortrait({
  name,
  src,
  size = 'md',
  className,
}: PlayerPortraitProps): ReactElement {
  const { t } = useTranslation();
  const px = playerPortraitPixelSize(size);
  const label = t(PLAYER_PORTRAIT_KEYS.alt, { name });

  return (
    <Avatar className={cn(ROOT_SHAPE, className)} style={{ width: px, height: px }}>
      {src !== undefined && <AvatarImage src={src} alt={label} />}
      <AvatarFallback delayMs={0} role="img" aria-label={label}>
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className="h-full w-full">
          <circle
            cx={HEAD_CENTER.cx}
            cy={HEAD_CENTER.cy}
            r={HEAD_CENTER.r}
            className={SILHOUETTE_SURFACE}
            strokeWidth="1"
          />
          <path
            d={SHOULDERS_PATH}
            className={SILHOUETTE_SURFACE}
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      </AvatarFallback>
    </Avatar>
  );
}
