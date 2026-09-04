/**
 * Kontrast aritmetiği — `docs/spec/05-design-system.md` §7.1'in
 * `ensureContrast()` yardımcısı ve onun dayandığı hesap.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * MATEMATİK SAHİPLENİLDİ — bir kütüphane KULLANILMIYOR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * 5.2'nin dersi: *"bir dış kütüphanenin çıktısını tam sayıyla iddia eden test,
 * kodu değil onu ölçer."* Bağıl parlaklık ve kontrast oranı kapalı biçimli
 * formüller; burada tamamen sahiplenilebilirler ve testler **bizim** kodumuzu
 * ölçer.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ DOĞRUSALLAŞTIRMA EŞİĞİ: 0.03928 mi 0.04045 mi — ÖLÇÜLDÜ, SEÇİM SONUCU
 *    DEĞİŞTİRMİYOR VE BU BİR TERCİH DEĞİL BİR KANIT
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Kaynaklar iki değer yazıyor (WCAG 2.0'ın özgün metni **0.03928**, sonraki
 * düzeltme **0.04045**). 6.2 hangisinin seçileceğini tartışmak yerine **farkın
 * var olup olmadığını** ölçtü:
 *
 *   iki eşik 8 bitlik kanal değerlerine çevrilince
 *     0.03928 × 255 = 10,016…      0.04045 × 255 = 10,315…
 *
 * Aralarında **hiçbir tam sayı yok**. Kanal değeri her zaman `0…255` bir tam
 * sayı olduğuna göre, `10` her iki eşiğin de **altında** ve `11` her ikisinin
 * de **üstünde** kalır — yani iki eşik 8 bitlik hiçbir renk için farklı bir
 * dal seçemez. Ölçüm: 190 token çifti, **0** karar değişikliği, en büyük
 * sayısal fark **0.0e+0**.
 *
 * `contrast.test.ts` bunu bir örnek üzerinde değil **256 kanal değerinin
 * hepsinde** iddia ediyor — yani sonuç bu palete değil, 8 bitlik sRGB'nin
 * kendisine bağlı.
 *
 * Seçilen: **0.04045** (düzeltilmiş değer). Seçim kanıtlandığı için
 * gerekçesi de yazılabilir hâle geldi: eşdeğer iki seçenekten güncel olanı.
 */

/** sRGB doğrusallaştırma eşiği. Yukarıdaki nota bak — 8 bit girdide eşdeğer. */
export const LINEARIZATION_THRESHOLD = 0.04045;

/**
 * WCAG AA normal metin eşiği.
 *
 * ⚠️ **Bu sayı UYDURULMADI, spec'ten geliyor:** `spec/05` §7.1 kulüp rengi
 * entegrasyonunda *"Kontrast oranı **4.5:1**'in altına düşerse otomatik
 * açıklaştırılır"* diyor.
 */
export const CONTRAST_TARGET_AA = 4.5;

/** `#RGB` kısaltması **desteklenmiyor** — spec her yerde 6 ya da 8 hane yazıyor. */
const HEX_SIX = /^#[0-9a-fA-F]{6}$/;

/**
 * Bir sRGB kanalını (0…255) doğrusal ışık değerine çevirir.
 *
 * Dışa aktarılıyor çünkü eşik eşdeğerliği testi onu **256 değerin hepsinde**
 * doğrudan koşturuyor; bir sarmalayıcı üzerinden ölçmek iddiayı zayıflatırdı.
 */
export const linearizeChannel = (value: number, threshold = LINEARIZATION_THRESHOLD): number => {
  const c = value / 255;
  return c <= threshold ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

/**
 * Bağıl parlaklık (WCAG): `0.2126 R + 0.7152 G + 0.0722 B`, doğrusal kanallar.
 *
 * ⚠️ **Alfa taşıyan bir token'ı kabul etmez ve bu SESSİZ DEĞİL.** `#00C46A26`
 * sekiz haneli; `parseInt` ile kırpılsaydı hesap yanlış bir renge yapılır ve
 * hiçbir şey ötmezdi. Yarı saydam bir dolgunun gerçek oranı altındaki yüzeye
 * bağlıdır ve §7.1 o yüzeyi söylemiyor — yani bu bir eksiklik değil,
 * **tanımsız bir soru**. Fırlatılıyor.
 */
export const relativeLuminance = (hex: string, threshold = LINEARIZATION_THRESHOLD): number => {
  if (!HEX_SIX.test(hex)) {
    throw new TypeError(
      `Kontrast hesabı yalnızca #RRGGBB kabul eder (alfa taşıyan token dahil değil): ${hex}`,
    );
  }
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return (
    0.2126 * linearizeChannel(r, threshold) +
    0.7152 * linearizeChannel(g, threshold) +
    0.0722 * linearizeChannel(b, threshold)
  );
};

/** İki rengin kontrast oranı: `(Laçık + 0.05) / (Lkoyu + 0.05)`, her zaman ≥ 1. */
export const contrastRatio = (a: string, b: string): number => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
};

/** `ensureContrast()` sonucu — davranış SEÇİLDİ ve İDDİA EDİLİYOR. */
export interface EnsureContrastResult {
  /** Kullanılacak renk. Hedefe ulaşılamadıysa **ulaşılabilen en iyisi**. */
  readonly color: string;
  /** `color`in `background`a karşı oranı. */
  readonly ratio: number;
  /** Girdi renk değiştirildi mi? */
  readonly adjusted: boolean;
  /** Hedef oran sağlandı mı? ⚠️ `false` dönebilir — aşağıya bak. */
  readonly reachedTarget: boolean;
  /** Beyaza karışım oranı, 0…100 (tam sayı adım). */
  readonly lightenPercent: number;
}

/**
 * Beyaza doğru tam sayı yüzdeyle karıştırır. `percent = 0` → aynı renk.
 *
 * Dışa aktarılıyor çünkü `ensureContrast`in **minimallik** iddiası (bir adım
 * azının hedefi tutmadığı) ancak bir adım öncesi hesaplanarak sınanabilir.
 * İlk yazımda o test `ensureContrast`i iki kez çağırıp hiçbir şey iddia
 * etmiyordu — **pozitif bir test kör bir kontrolle de geçer.**
 */
export const blendTowardWhite = (hex: string, percent: number): string => {
  const mix = (channel: number): number => Math.round(channel + (255 - channel) * (percent / 100));
  const r = mix(Number.parseInt(hex.slice(1, 3), 16));
  const g = mix(Number.parseInt(hex.slice(3, 5), 16));
  const b = mix(Number.parseInt(hex.slice(5, 7), 16));
  const hh = (v: number): string => v.toString(16).padStart(2, '0').toUpperCase();
  return `#${hh(r)}${hh(g)}${hh(b)}`;
};

/**
 * `spec/05` §7.1: kulüp rengi `--accent`i ezerken oran 4.5:1'in altına düşerse
 * **otomatik açıklaştırılır**.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ HEDEFE ULAŞILAMAYABİLİR — VE BU SESSİZ BIRAKILMIYOR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Spec'in fiili *"açıklaştırmak"*, yani hareket **beyaza doğru**. Bu, arka plan
 * koyuyken işe yarar; arka plan **açıkken** rengi beyaza yaklaştırmak oranı
 * **düşürür** ve hedef hiçbir karışımda sağlanamaz.
 *
 * Bu fonksiyon spec'in mekanizmasını **genişletmiyor** (koyulaştırma
 * eklenmiyor — o, yazılmamış bir karar olurdu, SAPMA-026). Bunun yerine sınırı
 * **beyan ediyor**: `reachedTarget: false` döner ve çağıran karar verir.
 * *"Falsy bir değer «özellik yok» anlamına da gelebilir — sessiz varsayılan
 * yasak."*
 *
 * ℹ️ Açık temada `--accent` zaten **spec'te tanımsız**
 * (`LIGHT_UNDEFINED_IN_SPEC`), yani bu sınır ile o eksiklik **aynı boşluğun
 * iki yüzü**. İkisi de 6.3'ün girdisi.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN İKİLİ ARAMA DEĞİL, TAM SAYI TARAMASI
 * ────────────────────────────────────────────────────────────────────────────
 *
 * İkili arama oranın karışım yüzdesinde **tekdüze** arttığını varsayar. Bu
 * varsayım her zaman doğru değil: rengin parlaklığı arka planınkinin **altında**
 * başlıyorsa oran önce **düşer**, sonra artar. 101 adımlık bir tarama bu
 * varsayımı hiç yapmıyor, deterministik, ve maliyeti önemsiz.
 */
export const ensureContrast = (
  color: string,
  background: string,
  target: number = CONTRAST_TARGET_AA,
): EnsureContrastResult => {
  const initial = contrastRatio(color, background);
  if (initial >= target) {
    return { color, ratio: initial, adjusted: false, reachedTarget: true, lightenPercent: 0 };
  }

  let best = { color, ratio: initial, lightenPercent: 0 };
  for (let percent = 1; percent <= 100; percent += 1) {
    const candidate = blendTowardWhite(color, percent);
    const ratio = contrastRatio(candidate, background);
    if (ratio >= target) {
      return {
        color: candidate,
        ratio,
        adjusted: true,
        reachedTarget: true,
        lightenPercent: percent,
      };
    }
    if (ratio > best.ratio) best = { color: candidate, ratio, lightenPercent: percent };
  }

  return {
    color: best.color,
    ratio: best.ratio,
    adjusted: best.lightenPercent > 0,
    reachedTarget: false,
    lightenPercent: best.lightenPercent,
  };
};

/**
 * Verilen zemin için adaylar arasından **en yüksek oranı** vereni seçer.
 *
 * Nitelik rozetinin sayısı için gerekiyor: ölçüldü ki sekiz bandın **hiçbir
 * tek metin rengiyle** hepsinde AA sağlanamıyor — koyu bantlar açık metin,
 * açık bantlar koyu metin istiyor. Seçim bir tercih değil bir **hesap**.
 *
 * Eşitlikte **ilk aday** kazanır: sıralama çağıranın kararı ve deterministik
 * olmalı.
 */
export const pickAccessibleForeground = (
  background: string,
  candidates: readonly string[],
): { readonly color: string; readonly ratio: number } => {
  const [first, ...rest] = candidates;
  if (first === undefined) {
    throw new TypeError('En az bir aday metin rengi gerekli.');
  }
  let best = { color: first, ratio: contrastRatio(first, background) };
  for (const candidate of rest) {
    const ratio = contrastRatio(candidate, background);
    if (ratio > best.ratio) best = { color: candidate, ratio };
  }
  return best;
};
