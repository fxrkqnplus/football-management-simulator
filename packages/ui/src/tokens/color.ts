/**
 * Renk token'ları — `docs/spec/05-design-system.md` §7.1'in TEK KAYNAĞI.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ANAHTARLAR CSS ÖZEL ÖZELLİK ADLARIDIR — ve bu bilinçli
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Anahtar `bgBase` değil `--bg-base`. Gerekçe: 6.3 bu tabloyu Tailwind 4'ün CSS
 * tarafına **yansıtacak** ve iki temsil arasında bir dönüştürme katmanı olursa
 * o katman bir gün ayrışır (bu deponun en çok tekrarlanan hata sınıfı). Anahtar
 * doğrudan hedefin dilinde yazılınca 6.3 **türetir**, elle kopyalamaz.
 *
 * ⚠️ Bu, 6.3'ün kararını ÖNCEDEN vermek değil: yansıtmanın **nasıl** yapılacağı
 * (`@theme` bloğu mu, ayrı bir `.css` mi, üretilmiş bir dosya mı) hâlâ açık.
 * Burada kapatılan tek şey, kapının kapanmaması.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ AÇIK TEMA SPEC'TE EKSİK — 20 TOKEN'IN YALNIZCA 8'İ TANIMLI
 * ────────────────────────────────────────────────────────────────────────────
 *
 * §7.1'in `/* Açık tema *\/` bloğu **sekiz** token veriyor. Kalan **on iki**
 * token için açık temada bir değer **hiçbir yerde yazılı değil** ve buraya
 * uydurulmuyor (SAPMA-026: *"kimsenin belirlemediği alana değer uydurma"*).
 *
 * **Sessiz devralma REDDEDİLDİ ve gerekçesi ölçüldü.** CSS'te eksik bırakılan
 * bir token taban değerini devralır; burada o davranış **yanlış** olurdu:
 * `--bg-input` koyu temada `#0F131B` ve açık temada devralınırsa açık bir
 * arayüzde **siyaha yakın bir giriş alanı** doğar. *"Falsy bir değer «özellik
 * yok» anlamına da gelebilir — sessiz varsayılan yasak, davranış SEÇİLİR ve
 * İDDİA EDİLİR."* Bu yüzden eksiklik bir **liste** olarak yaşıyor ve testte
 * adıyla iddia ediliyor: biri değer eklerse ya da listeden bir ad düşerse test
 * kırılır.
 *
 * **Kim dolduracak:** karar 6.3'ün (tema) ve **bu alt görevde verilmedi** —
 * 6.2'nin işi kaynağı kurmak, eksiği görünür yapmak.
 */

/** Bir renk token'ının değeri: `#RRGGBB` ya da `#RRGGBBAA`. */
export type ColorTokenValue = `#${string}`;

/** CSS özel özellik adı — `--` ile başlar. */
export type ColorTokenName = `--${string}`;

/**
 * KOYU TEMA — varsayılan, ve §7.1'de **tam** tanımlı.
 *
 * ⚠️ Bu bir SAYI değil bir LİSTE (4.5'in `VISIBLE_ATTRIBUTES` emsali).
 * `color.test.ts` her adı ve her değeri spec metnine karşı **birebir**
 * doğruluyor; `Object.keys(...).length === 20` yanlış yazılmış bir hex'i
 * geçirirdi, `toEqual` geçirmez.
 */
export const DARK_COLOR_TOKENS = {
  '--bg-base': '#0B0E14',
  '--bg-surface': '#12161F',
  '--bg-elevated': '#1A1F2B',
  '--bg-hover': '#222835',
  '--bg-active': '#2A3140',
  '--bg-input': '#0F131B',

  '--border-subtle': '#1E2430',
  '--border-default': '#2A3140',
  '--border-strong': '#3A4354',

  '--text-primary': '#E8ECF3',
  '--text-secondary': '#9BA6B8',
  '--text-muted': '#64707F',
  '--text-inverse': '#0B0E14',

  '--accent': '#00C46A',
  '--accent-hover': '#00D975',
  '--accent-muted': '#00C46A26',

  '--danger': '#E5484D',
  '--warning': '#F5A524',
  '--success': '#30A46C',
  '--info': '#4A9EFF',
} as const satisfies Record<ColorTokenName, ColorTokenValue>;

export type ColorTokenKey = keyof typeof DARK_COLOR_TOKENS;

/**
 * AÇIK TEMA — §7.1'in **verdiği** sekiz geçersiz kılma. Fazlası yok, azı yok.
 *
 * ⚠️ `--bg-elevated` koyu temada `#1A1F2B`, açık temada `#FFFFFF` ve bu
 * `--bg-surface` ile **aynı değer**. Spec böyle yazıyor; bir yazım hatası gibi
 * görünse de düzeltilmiyor (otorite #1). Test bu çakışmayı **adıyla** iddia
 * ediyor ki bir gün "yanlışlıkla aynı olmuş" diye sessizce ayrılmasın.
 */
export const LIGHT_COLOR_OVERRIDES = {
  '--bg-base': '#F5F7FA',
  '--bg-surface': '#FFFFFF',
  '--bg-elevated': '#FFFFFF',
  '--bg-hover': '#EDF0F5',

  '--border-default': '#D8DEE8',

  '--text-primary': '#151A22',
  '--text-secondary': '#5A6675',
  '--text-muted': '#8A94A3',
} as const satisfies Partial<Record<ColorTokenKey, ColorTokenValue>>;

/**
 * AÇIK TEMADA **TANIMSIZ** — spec bir değer vermiyor ve buraya uydurulmuyor.
 *
 * Bu liste bir eksikliğin **kaydı**, bir varsayılan değil. Tüketicisi
 * `color.test.ts`: geçersiz kılınanlarla bu listenin birleşimi koyu temanın
 * anahtar kümesine **birebir** eşit olmalı — yani bir token ne sessizce
 * kaybolabilir ne de iki listede birden durabilir (**kapsayıcılık**: boşluk
 * yok, çakışma yok).
 */
export const LIGHT_UNDEFINED_IN_SPEC = [
  '--bg-active',
  '--bg-input',
  '--border-subtle',
  '--border-strong',
  '--text-inverse',
  '--accent',
  '--accent-hover',
  '--accent-muted',
  '--danger',
  '--warning',
  '--success',
  '--info',
] as const satisfies readonly ColorTokenKey[];

/**
 * Sekiz haneli (alfa taşıyan) token'lar. Kontrast hesabı bunları **kabul
 * etmez** — yarı saydam bir dolgunun oranı, altındaki yüzeye bağlıdır ve
 * §7.1 o yüzeyi söylemiyor.
 *
 * ⚠️ Liste **boş bırakılmadı**: `#00C46A26` sessizce 6 haneli sanılıp
 * `parseInt` ile kırpılsaydı hesap **yanlış bir renge** yapılırdı ve hiçbir şey
 * ötmezdi. Sınır yazılı, ve testte iddia ediliyor.
 */
export const ALPHA_COLOR_TOKENS = ['--accent-muted'] as const satisfies readonly ColorTokenKey[];

/** Bir tema için tam token haritası. Açık temada tanımsızlar **yok**. */
export const resolveTheme = (theme: 'dark' | 'light'): Partial<Record<ColorTokenKey, string>> => {
  if (theme === 'dark') return { ...DARK_COLOR_TOKENS };
  return { ...LIGHT_COLOR_OVERRIDES };
};
