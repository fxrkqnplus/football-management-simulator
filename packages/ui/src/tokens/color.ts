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

import {
  blendTowardBlack,
  CONTRAST_TARGET_AA,
  contrastRatio,
  darkenUntilContrast,
  perceptualLightness,
} from './contrast.js';

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
export const LIGHT_SPEC_OVERRIDES = {
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
 * AÇIK TEMANIN SPEC'TE **TANIMSIZ** OLAN ON İKİ TOKEN'I — 6.3b'de YAZILDI.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ BUNLAR TÜRETİLMEDİ, **YAZILDI** — ve ayrım yapısal olarak korunuyor
 * ────────────────────────────────────────────────────────────────────────────
 *
 * 6.3b **iki türetme kuralı** önerdi ve **ikisini de kontrol deneyiyle
 * çürüttü** (kural, spec'in kendi verdiği sekiz açık değeri yeniden
 * üretebiliyor mu?):
 *
 * | Kural | En büyük hata |
 * |---|---|
 * | *"`--bg-base`e karşı oranı koru"* | `--text-secondary` **−2,409** |
 * | *"ΔL\* işaretini aileden, büyüklüğünü koyudan al"* | `--bg-hover` **−9,68** |
 *
 * Sebep ölçüldü: açık tema koyu temanın bir **dönüşümü değil**, farklı yapıda
 * bir palet — koyuda yükselti ve etkileşim **aynı yönde** (hep açılır), açıkta
 * **ters yönlerde** (yükselti beyaza, etkileşim koyuya). Yani bu on iki değer
 * bir **tasarım kararı**dır ve öyle raporlandı: **0 türetildi, 12 yazıldı.**
 *
 * ⚠️ **`LIGHT_SPEC_OVERRIDES` ile bu liste AYRI DURUYOR ve birleştirilmiyor.**
 * Gerekçe 5.7'nin *"toplanan / yazılan"* ayrımı: hangi değerin **otoriteden**
 * geldiği, hangisinin **bizim seçimimiz** olduğu bir gün mutlaka sorulacak.
 * Tek bir tabloya karıştırılsalardı o soru cevapsız kalırdı.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * HER DEĞERİN DAYANAĞI
 * ────────────────────────────────────────────────────────────────────────────
 *
 * **İki tanesi spec'in KOYU temada kurduğu bir EŞİTLİĞİ koruyor** (ve o
 * eşitlikler `color.test.ts`te 6.2'den beri adıyla iddia ediliyor):
 *   • `--bg-active` = `--border-default` — koyuda ikisi de `#2A3140`
 *   • `--text-inverse` = `--bg-base` — koyuda ikisi de `#0B0E14`
 *
 * **Üçü yazıldı**, spec'in kendi açık gri rampasını (`#FFFFFF` · `#F5F7FA` ·
 * `#EDF0F5` · `#D8DEE8`) sürdürerek:
 *   • `--bg-input` — koyuda `--bg-base` ile `--bg-surface` **arasında**;
 *     açıkta da öyle konumlandırıldı (L\* 98,59; base 97,16 · surface 100)
 *   • `--border-subtle` — `--border-default`ten **daha soluk**
 *   • `--border-strong` — `--border-default`ten **daha güçlü**
 *
 * **Yedi kromatik `deriveLightChromatic()` ile ÜRETİLİYOR** — kural kodda
 * yaşıyor, elle yazılmış bir tabloda değil; aşağıya bak.
 */
export const LIGHT_WRITTEN_TOKENS = {
  // Koyu temanın eşitlikleri korunuyor.
  '--bg-active': '#D8DEE8',
  '--text-inverse': '#F5F7FA',

  // Açık gri rampanın sürdürülmesi.
  '--bg-input': '#FAFBFD',
  '--border-subtle': '#E9EDF3',
  '--border-strong': '#BFC8D6',

  // `deriveLightChromatic()`in çıktısı — `color.test.ts` bunu yeniden üretip
  // birebir karşılaştırıyor, yani ikinci bir temsil DEĞİL, bir artefakt.
  '--accent': '#008347',
  '--accent-hover': '#00733E',
  '--accent-muted': '#00834726',
  '--danger': '#CA3F44',
  '--warning': '#986616',
  '--success': '#258054',
  '--info': '#3673BA',
} as const satisfies Partial<Record<ColorTokenKey, ColorTokenValue>>;

/**
 * ⚠️ **SPEC'İN AÇIK TEMADA HİÇ DEĞER VERMEDİĞİ TOKEN'LARIN KAYDI.**
 *
 * Değerler artık `LIGHT_WRITTEN_TOKENS`ta ama **eksikliğin kendisi bir
 * kayıttır ve silinmiyor**: bir sonraki okuyucu *"bu on iki değer spec'ten mi
 * geliyor?"* diye sorduğunda cevap burada. `color.test.ts` kapsayıcılığı bu
 * liste üzerinden iddia ediyor.
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

/**
 * AÇIK TEMANIN TAM HARİTASI — spec'in sekizi **artı** 6.3b'de yazılan on iki.
 *
 * ⚠️ Bu birleşim bir **türetilmiş görünüm**; iki kaynak listesi ayrı duruyor ki
 * *"hangisi otoriteden geldi"* sorusu her zaman cevaplanabilsin.
 */
export const LIGHT_COLOR_OVERRIDES = {
  ...LIGHT_SPEC_OVERRIDES,
  ...LIGHT_WRITTEN_TOKENS,
} as const satisfies Partial<Record<ColorTokenKey, ColorTokenValue>>;

/**
 * Bir tema için **tam** token haritası.
 *
 * ⚠️ 6.3'te bu fonksiyon açık tema için yalnızca sekiz token döndürüyordu ve o
 * bir **eksiklik kaydıydı**. 6.3b on ikisini de yazdı; artık iki tema da **20
 * token** taşıyor ve `color.test.ts` bunu iddia ediyor.
 */
export const resolveTheme = (theme: 'dark' | 'light'): Record<ColorTokenKey, string> => {
  if (theme === 'dark') return { ...DARK_COLOR_TOKENS };
  return { ...DARK_COLOR_TOKENS, ...LIGHT_COLOR_OVERRIDES };
};

/**
 * Açık temanın kromatik token'ını koyu temadakinden üretir — **kural burada
 * yaşıyor**, elle yazılmış bir tabloda değil.
 *
 * `spec/05` §7.1 kulüp rengi için şunu yazıyor: *"Kontrast oranı 4.5:1'in
 * altına düşerse otomatik açıklaştırılır."* Tarif ettiği mekanizma geneldir —
 * bir renk kapıyı geçmiyorsa **tonu korunarak** geçene kadar taşınır. Açık
 * temada yön **koyuya** doğru.
 *
 * **En katı yüzey seçildi: `--bg-base`.** `--bg-surface` (`#FFFFFF`) daha açık,
 * yani ona karşı oran her zaman daha yüksek — `--bg-base`i geçen bir renk
 * ikisini de geçer. Tersi doğru değildi: ilk hesapta anlamsal renkler beyazda
 * 4,53 verirken sayfa zemininde **4,22**de kalıyordu.
 */
export const LIGHT_CHROMATIC_SURFACE = LIGHT_SPEC_OVERRIDES['--bg-base'];

/**
 * `--accent`in `hover` hâli için **en az** algısal fark.
 *
 * ⚠️ Bir **kalibrasyon** ve öyle etiketleniyor (6.1'in δ = %10 emsali):
 * spec bir *"hover ne kadar farklı olmalı"* sayısı vermiyor. **5 L\*** seçildi
 * çünkü altındaki farklar yan yana konmadan ayırt edilemez; ölçüldü — seçilen
 * değerlerin farkı **5,70 L\***.
 */
export const ACCENT_HOVER_MIN_LIGHTNESS_DELTA = 5;

/**
 * Açık temanın **yedi kromatik** token'ını koyu temadakilerden üretir.
 *
 * **Kural spec'in, çıktı bizim.** §7.1 mekanizmayı tarif ediyor (*"kapıyı
 * geçmiyorsa tonu korunarak taşınır"*); spec açık tema için **hiçbir kromatik
 * değer vermediği** için çıktı bir kontrol deneyinden geçemez — yani bu
 * değerler **yazılmıştır**, türetilmiş değil. Kural burada yaşıyor ki
 * `LIGHT_WRITTEN_TOKENS`taki hexler ikinci bir temsil değil bir **artefakt**
 * olsun; `color.test.ts` bu fonksiyonu koşturup sonucu onlarla **birebir**
 * karşılaştırıyor.
 */
export const deriveLightChromatic = (): Record<string, string> => {
  const surface = LIGHT_CHROMATIC_SURFACE;

  /**
   * ⚠️ **İKİNCİ BİR KISIT YAZILDI, SONRA MUTASYONLA GEREKSİZ OLDUĞU ÖLÇÜLDÜ.**
   *
   * İlk yazımda burada *"ve üstüne `--text-inverse` okunur"* diye ikinci bir
   * koşul vardı. Mutasyon onu kaldırdı ve **hiçbir test kırılmadı** — üç
   * ihtimalden **üçüncüsü** çıktı: *"kod gereksiz."*
   *
   * Sebep ölçüldü ve şaşırtıcı biçimde **bu dosyanın kendi kararından**
   * geliyor: `--text-inverse` açık temada `--bg-base` ile **aynı değere**
   * ayarlandı (koyu temanın eşitliğini korumak için), ve `--bg-base` zaten
   * `LIGHT_CHROMATIC_SURFACE`. Yani `contrastRatio(inverse, c)` ile
   * `contrastRatio(c, surface)` **birebir aynı hesap** — ikinci koşul
   * birincisinin tekrarıydı (ölçüldü: ikisi de `#008347`, `p=33`, oran
   * **4,511**).
   *
   * **Kaldırıldı, ama GARANTİ KAYBOLMADI:** *"ters metin vurgunun üstünde
   * okunur"* iddiası `contrast-audit.test.ts`te **ayrı bir vaka** olarak
   * duruyor. Eşitlik bir gün bozulursa o test kırılır — sessiz kalmaz.
   */
  const fitAccent = (from: string): string => {
    for (let percent = 0; percent <= 100; percent += 1) {
      const candidate = blendTowardBlack(from, percent);
      if (contrastRatio(candidate, surface) >= CONTRAST_TARGET_AA) return candidate;
    }
    throw new RangeError(`Vurgu rengi hiçbir koyulukta kapıyı geçmedi: ${from}`);
  };

  const accent = fitAccent(DARK_COLOR_TOKENS['--accent']);

  let accentHover = accent;
  for (let percent = 1; percent <= 100; percent += 1) {
    const candidate = blendTowardBlack(accent, percent);
    if (
      perceptualLightness(accent) - perceptualLightness(candidate) >=
        ACCENT_HOVER_MIN_LIGHTNESS_DELTA &&
      contrastRatio(candidate, surface) >= CONTRAST_TARGET_AA
    ) {
      accentHover = candidate;
      break;
    }
  }

  const semantic: Record<string, string> = {};
  for (const name of ['--danger', '--warning', '--success', '--info'] as const) {
    const fitted = darkenUntilContrast(DARK_COLOR_TOKENS[name], surface, CONTRAST_TARGET_AA);
    if (!fitted.reachedTarget) {
      throw new RangeError(`Anlamsal renk hiçbir koyulukta kapıyı geçmedi: ${name}`);
    }
    semantic[name] = fitted.color;
  }

  return {
    '--accent': accent,
    '--accent-hover': accentHover,
    // Alfa koyu temadakiyle aynı (`26`); RGB yeni vurgudan geliyor.
    '--accent-muted': `${accent}${DARK_COLOR_TOKENS['--accent-muted'].slice(7)}`,
    ...semantic,
  };
};
