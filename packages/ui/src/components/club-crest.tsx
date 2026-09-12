/**
 * ClubCrest — kulüp arması. `avatar.tsx`in (Radix Avatar) üstüne oturur.
 *
 * 6.5'in Avatar başlığı bunu adıyla öngörmüştü: *"FM'de oyuncu portresi ve
 * kulüp arması bu bileşenin üstüne oturacak (`PlayerPortrait`, `ClubCrest` →
 * 6.6)"*. Bu dosya o taşıyıcıya **arma semantiğini** ekliyor: kare kırpım,
 * kalkan + baş harf yedeği, çevrilmiş `alt`. Görselin nereden geldiğini
 * **bilmiyor** (K9: `DataProvider` çağıranın katmanında).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ ARMA DAİRESEL KIRPILMAZ — `Avatar` kökü `radius-full`, burada `radius-sm`
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `spec/12` §17.5 armayı *"şeffaf kare"* olarak normalize ediyor (512×512 →
 * 256/128/64). Dairesel bir maske kalkanın köşelerini keser; portre için doğru
 * olan şey arma için yanlış. `Avatar`ın `rounded-[var(--radius-full)]`ı
 * `cn`/`tailwind-merge` ile **eziliyor** (aynı `rounded` grubunda sonraki
 * kazanır) ve test bunu iki yönlü iddia ediyor: `--radius-sm` var,
 * `--radius-full` yok. Görsel `object-contain` alıyor (`AvatarImage`in
 * `object-cover`ı ezilir): bir arma **hiçbir zaman kırpılmaz**, kare olmayan
 * bir SVG kaynağı kutuya sığdırılır. ⚠️ Bu ikisi jsdom'da **ölçülemedi** —
 * `<img>` orada hiç çizilmiyor (aşağı bak); ilk ölçülebilecek yer **Faz 17**.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * BOYUTLAR BİR KALİBRASYON — spec bir arma boyutu VERMİYOR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `CLUB_CREST_SIZES = { sm: 24, md: 40, lg: 64 }` px. Kaynağı yok; gerekçe
 * sayılarla uyumlu yazılıyor (6.1 δ ve 6.2 `Math.floor` emsali):
 *   · **sm 24** = `--space-6` — bir liste/tablo satırında `--text-sm-line`
 *     (18px) yanına 3'er px payla oturur.
 *   · **md 40** = `--space-10` — `Avatar`ın kendi varsayılanı (`h-10`) ve
 *     `spec/05` §7.5 üst barı (masaüstü **56px**, mobil **52px**) içinde en az
 *     6px üst/alt payla durur.
 *   · **lg 64** = `--space-16` — `spec/12` §17.5'in ürettiği **en küçük arma
 *     varyantı** (64); profil başlığında 1× yoğunlukta birebir.
 * Üçü de 4px ızgarada (`SPACE_BASE_PX`); test bunu ve `sm < md < lg` sırasını
 * iddia ediyor. Hangi kaynak varyantının (64/128/256) verileceği **çağıranın**
 * kararı; bileşen yalnızca kutunun boyutunu bilir.
 *
 * Boyut **inline `style`** ile veriliyor (`width`/`height` px), sınıf
 * listesiyle değil: sınıf listesi olsaydı `h-6 w-6` ↔ `24` iki ayrı listede
 * yaşar ve bir gün ayrışırdı (bu deponun en çok tekrarlanan hata sınıfı);
 * Tailwind kaynak taraması template'i görmediği için `h-[${px}px]` de
 * yazılamaz. Tek kaynak `CLUB_CREST_SIZES`.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * YEDEK: KALKAN + BAŞ HARF — ve yedek de bir GÖRSELDİR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Görsel yoksa ya da yüklenemezse (K9: eksik varlık **beklenen** bir durum)
 * yüzey token'larıyla bir kalkan silüeti ve `initialsOf(name)` çizilir. Yedek
 * `role="img"` + `aria-label` taşıyor — ekran okuyucu *"GS"* değil
 * *"Galatasaray arması"* duyar; `AvatarImage`in `alt`ı ile **aynı** `t()`
 * sonucu. `delayMs={0}`: Radix yedeği ilk commit'te değil bir makro görev
 * sonra çizer (Radix'in gerekçesi: hızlı yüklenen görselde yedek hiç
 * görünmesin) — testler bu yüzden `findBy*` kullanıyor.
 *
 * Baş harfler SVG `<text>` olarak çiziliyor, HTML metin olarak değil: viewBox
 * ölçeklemesi sayesinde 24px'te de 64px'te de kalkanın içinde aynı oranda
 * durur, boyut başına ayrı bir yazı boyutu listesi gerekmez.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * SINIF ADI `font-[family-name:var(--font-ui)]` — ETİKETLİ, ve bu ÖLÇÜLDÜ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `currency-value.tsx`in ölçümü bu dosyanın sınıfları için **yeniden**
 * koşturuldu (`@tailwindcss/node` 4.3.3 `compile`, `apps/web` tabanı):
 *   · `font-[…var(--font-ui)]` → `font-weight: var(--font-ui)` (yanlış özellik)
 *   · `font-[family-name:var(--font-ui)]` → `font-family: var(--font-ui)`
 *   · `fill-[var(--bg-active)]` → `fill:` · `stroke-[var(--border-strong)]` →
 *     `stroke:` · `rounded-[var(--radius-sm)]` → `border-radius:` — bu üçü
 *     tek tipli yardımcılar, etiket gerekmiyor.
 * İlk taslak etiketsiz biçimi taşıyordu (6.4/6.5 idiyomu); düzeltildi ve test
 * `family-name:` etiketini iddia ediyor. `avatar.tsx`in kendi `font-[var(…)]`
 * ve `text-[…var(--text-sm)]` (→ `color:`) sınıfları bu yazarın dosyası değil —
 * ÇIKTI'da İSTEK.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * TAKLİT ETMEDİĞİ — adıyla
 * ────────────────────────────────────────────────────────────────────────────
 *
 * · **Prosedürel arma üretimi** — Faz 8. Buradaki yedek bir yer tutucu, bir
 *   üretim değil.
 * · **Varlık getirme / önbellek / `DATA_MODE`** — Faz 7. `src` hazır bir URL
 *   olarak gelir; bileşen ne okur ne karar verir.
 * · **Boyut varyantı seçimi** (64/128/256, `spec/12` §17.5) — çağıranın.
 * · **jsdom görsel YÜKLEMEZ** (6.5'te ölçüldü): `<img>` bu ortamda hiç
 *   çizilmiyor, yalnızca yedek sınanıyor. *"Görsel gerçekten çiziliyor"*,
 *   `alt` ve `object-contain` → **Faz 17** (G-02); görsel doğrulama **Faz 49**
 *   (G-05).
 */
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '../lib/cn.js';
import { Avatar, AvatarFallback, AvatarImage } from './avatar.js';

/**
 * Bu bileşenin çeviri anahtarları — **bileşenin yanında** (gerekçe
 * `select.tsx`te ölçümüyle yazılı: `i18n:check` `t(X.y)`yi yalnızca aynı
 * dosyadaki sabitten çözüyor). `i18n-keys.ts` bunu **topluyor**.
 */
export const CLUB_CREST_KEYS = {
  /** Görselin `alt`ı ve yedeğin erişilebilir adı: `{{name}} arması`. */
  alt: 'common:ui.clubCrest.alt',
} as const;

/**
 * Boyut envanteri — **liste**, sayı ondan türüyor. Değerler px ve bir
 * KALİBRASYON (dosya başı).
 */
export const CLUB_CREST_SIZES = { sm: 24, md: 40, lg: 64 } as const;

export type ClubCrestSize = keyof typeof CLUB_CREST_SIZES;

/** Arma köşesi — `Avatar`ın dairesel maskesini ezer (dosya başı). */
const ROOT_SHAPE = 'rounded-[var(--radius-sm)]';

/** Kalkan ve baş harf yüzeyleri — token'dan, sabit hex yok. */
const SHIELD_SURFACE = 'fill-[var(--bg-active)] stroke-[var(--border-strong)]';
/**
 * ⚠️ `font-[family-name:var(--font-ui)]` — ETİKETLİ (dosya başı, "SINIF ADI").
 * Etiketsiz biçim `font-weight` üretir ve `font-semibold` ile aynı grupta
 * silinir; test etiketi iddia ediyor.
 */
const INITIALS_SURFACE =
  'font-[family-name:var(--font-ui)] font-semibold fill-[var(--text-primary)]';

/**
 * Kalkan silüeti — `0 0 24 24` viewBox'ında 4,5…19,5 arası; kenarlarda pay
 * var ki kökün `overflow-hidden`ı çizgiyi kesmesin.
 */
const SHIELD_PATH =
  'M12 2.5 L19.5 5.25 V12 C19.5 16.75 16.25 20.2 12 21.75 C7.75 20.2 4.5 16.75 4.5 12 V5.25 Z';

export interface ClubCrestProps {
  /** Kulüp adı — `alt` metni ve yedeğin baş harfleri bundan türer. */
  name: string;
  /** Arma görselinin adresi. Yoksa ya da yüklenemezse yedek çizilir. */
  src?: string;
  /** Varsayılan `md`. */
  size?: ClubCrestSize;
  className?: string;
}

/**
 * Bir boyut adının piksel karşılığı — saf, ve geçersiz ad **sessizce
 * varsayılana düşmez**. Tipsiz bir çağırandan (veri, JS) gelen `'xl'`
 * `undefined` genişlik olur ve `Avatar`ın `h-10`u sessizce kazanırdı; sessiz
 * varsayılan yasak, `RangeError`.
 */
export function clubCrestPixelSize(size: string): number {
  if (!Object.hasOwn(CLUB_CREST_SIZES, size)) {
    throw new RangeError(
      `Arma boyutu ${Object.keys(CLUB_CREST_SIZES).join(' | ')} arasından olmalı: ${size}`,
    );
  }
  return CLUB_CREST_SIZES[size as ClubCrestSize];
}

/**
 * Bir kulüp adının baş harfleri — **en fazla iki**, Türkçe büyük harf.
 *
 * Kural: boşlukla ayrılmış ilk iki **harf taşıyan** kelimenin ilk harfi
 * (`1. FC Köln` → `FK`; `Trabzonspor` → `T`). Harf taşımayan kelimeler
 * atlanır; hiç harf yoksa `RangeError` — boş bir yedek, adı olmayan bir kulüp
 * demektir ve o bir veri hatasıdır, gösterim sorunu değil.
 *
 * ⚠️ **`toLocaleUpperCase('tr')`, `toUpperCase()` DEĞİL.** Yerel-bağımsız
 * dönüşüm `i`yi `I` yapar; Türkçede `i` → `İ`, `ı` → `I`. *"istanbul"* →
 * `İ`. Test iki dönüşümün gerçekten farklı sonuç verdiğini iddia ediyor ki
 * bir gün *"aynı şey"* diye sadeleştirilmesin (5.1'in küçük harf dersinin
 * aynası). Büyük harfe çevrilen bir harf genişleyebilir (`ß` → `SS`); ilk kod
 * noktası alınır ki *"en fazla iki"* sözü her girdide tutsun.
 */
export function initialsOf(name: string): string {
  const letters: string[] = [];
  for (const word of name.split(/\s+/u)) {
    const first = /\p{L}/u.exec(word);
    if (first === null) continue;
    // `Array.from` — yayma operatörü DEĞİL (`no-misused-spread`); niyet ilk
    // KOD NOKTASI (`ß` → `SS` → `S`), ilk UTF-16 birimi değil.
    const upper = Array.from(first[0].toLocaleUpperCase('tr'))[0];
    if (upper !== undefined) letters.push(upper);
    if (letters.length === 2) break;
  }
  if (letters.length === 0) {
    throw new RangeError(`Baş harf türetilemedi — kulüp adı en az bir harf içermeli: "${name}"`);
  }
  return letters.join('');
}

export function ClubCrest({ name, src, size = 'md', className }: ClubCrestProps): ReactElement {
  const { t } = useTranslation();
  const initials = initialsOf(name);
  const px = clubCrestPixelSize(size);
  const label = t(CLUB_CREST_KEYS.alt, { name });

  return (
    <Avatar className={cn(ROOT_SHAPE, className)} style={{ width: px, height: px }}>
      {src !== undefined && <AvatarImage src={src} alt={label} className="object-contain" />}
      <AvatarFallback delayMs={0} role="img" aria-label={label}>
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className="h-full w-full">
          <path d={SHIELD_PATH} className={SHIELD_SURFACE} strokeWidth="1" strokeLinejoin="round" />
          <text
            x="12"
            y="12.5"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="8"
            className={INITIALS_SURFACE}
          >
            {initials}
          </text>
        </svg>
      </AvatarFallback>
    </Avatar>
  );
}
