/**
 * Nitelik ısı skalası — `docs/spec/05-design-system.md` §7.2'nin TEK KAYNAĞI.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ RENK KÖRLÜĞÜ MEKANİZMASI BURADA DEĞİL — VE BU SPEC'İN KARARI
 * ────────────────────────────────────────────────────────────────────────────
 *
 * §7.2 aynen şöyle diyor: *"Renk körlüğü modunda ek olarak **sayı kalınlaşır**
 * ve **arka plan deseni** eklenir."*
 *
 * Yani spec'in çözümü bir **renk dönüşümü** (Brettel/Viénot/Machado simülasyon
 * matrisi) değil, renge bağımlı olmayan **ikinci ve üçüncü kanal**: ağırlık +
 * desen. Renkler modda **değişmiyor**.
 *
 * **Ve ölçüm bu kararı DOĞRULUYOR, bir tercih olmaktan çıkarıyor.** Komşu
 * bantların birbirine karşı kontrast oranları (6.2'de ölçüldü):
 *
 *   1-3↔4-6 **1,71** · 4-6↔7-9 **1,66** · 7-9↔10-11 **1,37** ·
 *   10-11↔12-13 **1,13** · 12-13↔14-15 **1,09** · 14-15↔16-17 **1,04** ·
 *   16-17↔18-20 **1,16**
 *
 * En yüksek komşu farkı **1,71:1** — yani **tam renkli görüşte bile** parlaklık
 * tek başına komşu bantları ayırmıyor. Yedekli kodlama bir süs değil,
 * **mekanizmanın kendisi**.
 *
 * → Ağırlık ve desenin uygulanması **6.6**'nın işi (`AttributeBadge`).
 *   Burada yalnızca **ölçek** ve onun aritmetiği yaşıyor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * SEKİZ BANT BİR SAYI DEĞİL BİR LİSTE — VE KAPSAYICILIĞI AYRICA İDDİA EDİLİR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * 4.5'in `VISIBLE_ATTRIBUTES` emsali: *"bir SAYI iddiası bir ÖZETtir, bir LİSTE
 * iddiası bir ENVANTERdir."* Ama uzunluk tek başına kör bir kontrol —
 * `attribute-scale.test.ts` ayrıca **1…20 aralığında boşluk ve çakışma
 * olmadığını** iddia ediyor (4.9'un `ABILITY_BAND_WEIGHTS` nöbetçisinin
 * emsali): 20 değerin her biri **tam olarak bir** banda düşmeli.
 */

/** Nitelik ölçeğinin sınırları — §7.2 `1–20` diyor. */
export const ATTRIBUTE_MIN = 1;
export const ATTRIBUTE_MAX = 20;

export interface AttributeBand {
  /** Kapsayıcı alt sınır. */
  readonly min: number;
  /** Kapsayıcı üst sınır. */
  readonly max: number;
  /** §7.2'nin hex'i — birebir. */
  readonly color: `#${string}`;
  /**
   * §7.2'nin Türkçe etiketi — birebir.
   *
   * ⚠️ Bunlar **arayüz metni değil**, spec'in bant adları. Ekrana basılacakları
   * gün `t()` üzerinden gelecekler (K5) ve anahtar ön eki `common:ui.` olacak
   * (6.0 ⑤). Burada **veri** olarak duruyorlar; `local/no-bare-jsx-text` JSX'e
   * bakıyor, bu dosyada JSX yok.
   */
  readonly label: string;
}

/**
 * §7.2'nin sekiz bandı — sıra, sınırlar, hex ve etiketler **spec'ten**.
 *
 * ```
 *  1-3   #7A2E38  (koyu kırmızı)    çok zayıf
 *  4-6   #B04A3C  (kırmızı)         zayıf
 *  7-9   #C77E3A  (turuncu)         vasat altı
 * 10-11  #BFA83C  (sarı)            vasat
 * 12-13  #8FA83C  (açık yeşil)      iyi
 * 14-15  #5FA84C  (yeşil)           çok iyi
 * 16-17  #34A85E  (koyu yeşil)      mükemmel
 * 18-20  #1FB58A  (turkuaz)         dünya klasmanı
 * ```
 *
 * ⚠️ Bantlar **eşit genişlikte değil** ve bu bilinçli: uçlar 3'er değer, orta
 * 2'şer. Bir sonraki okuyucu *"düzensiz, düzeltelim"* demesin diye yazılıyor —
 * spec böyle, ve test sınırları birebir iddia ediyor.
 */
export const ATTRIBUTE_BANDS = [
  { min: 1, max: 3, color: '#7A2E38', label: 'çok zayıf' },
  { min: 4, max: 6, color: '#B04A3C', label: 'zayıf' },
  { min: 7, max: 9, color: '#C77E3A', label: 'vasat altı' },
  { min: 10, max: 11, color: '#BFA83C', label: 'vasat' },
  { min: 12, max: 13, color: '#8FA83C', label: 'iyi' },
  { min: 14, max: 15, color: '#5FA84C', label: 'çok iyi' },
  { min: 16, max: 17, color: '#34A85E', label: 'mükemmel' },
  { min: 18, max: 20, color: '#1FB58A', label: 'dünya klasmanı' },
] as const satisfies readonly AttributeBand[];

/**
 * Bir nitelik değerinin bandı.
 *
 * ⚠️ Aralık dışı bir değer **sessizce kırpılmıyor**. Kırpma, bozuk bir veriyi
 * geçerli bir renge çevirir ve hata kaynağını gizler; `20`den büyük bir CA
 * değeri bir hesap hatasıdır, bir gösterim sorunu değil.
 */
export const bandForAttribute = (value: number): AttributeBand => {
  if (!Number.isInteger(value) || value < ATTRIBUTE_MIN || value > ATTRIBUTE_MAX) {
    throw new RangeError(
      `Nitelik değeri ${String(ATTRIBUTE_MIN)}…${String(ATTRIBUTE_MAX)} arasında bir tam sayı olmalı: ${String(value)}`,
    );
  }
  const band = ATTRIBUTE_BANDS.find((b) => value >= b.min && value <= b.max);
  if (band === undefined) {
    // Kapsayıcılık testi bu dalın erişilemez olduğunu iddia ediyor; yine de
    // sessiz bir `undefined` dönmek yerine gürültü çıkarıyoruz.
    throw new RangeError(`Bant bulunamadı: ${String(value)}`);
  }
  return band;
};

/**
 * §7.2'nin belirsizlik gösterimi: *"bant gösteriminde renk **aralığın ortasına**
 * göre"*.
 *
 * Ortanın tam sayıya nasıl indirileceğini spec **söylemiyor**; `13–17`in ortası
 * `15`, ama `13–16`nınki `14,5`. Karar: **aşağı yuvarlama** (`Math.floor`), ve
 * gerekçesi ölçülebilir bir simetri — yukarı yuvarlama bir oyuncuyu sistematik
 * olarak **daha iyi** gösterirdi ve belirsizlik gösteriminin amacı tam tersi:
 * bilinmeyeni abartmamak. Bu bir **kalibrasyon**, spec'ten gelmiyor (6.1'in
 * δ emsali: kaynağı ve gerekçesi yazılı).
 */
export const bandForAttributeRange = (min: number, max: number): AttributeBand => {
  if (min > max) {
    throw new RangeError(
      `Bant alt sınırı üst sınırdan büyük olamaz: ${String(min)}–${String(max)}`,
    );
  }
  return bandForAttribute(Math.floor((min + max) / 2));
};
