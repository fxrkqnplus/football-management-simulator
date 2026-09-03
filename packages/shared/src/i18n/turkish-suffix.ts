/**
 * Türkçe ek motoru — dinamik cümlelerde doğru ek seçimi.
 *
 * `{{club}}'{{suffix}}` → `Galatasaray'ın`, `Roma'nın`, `Trabzonspor'un`.
 *
 * SAF: bağımlılık yok (paket içi `./errors.js` hariç), `Math.random()` yok,
 * `Date.now()` yok, modül düzeyinde değiştirilebilir durum yok.
 * `CLAUDE.md` §2.4 — `packages/shared` hiçbir paketi import etmez; bu motor
 * hem tarayıcıda hem motorda (K3) çalışmak zorunda.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * KAPSAM: YALNIZCA TAMLAYAN (İLGİ) HÂLİ — ve bu bilinçli
 * ────────────────────────────────────────────────────────────────────────────
 *
 * ROADMAP Faz 5 kabul kriteri 3'ün beş örneğinin **beşi de** tamlayan hâli
 * (`Galatasaray'ın`, `Beşiktaş'ın`, `Trabzonspor'un`, `Roma'nın`,
 * `Liverpool'un`). Yönelme/bulunma/ayrılma **bugün uygulanmıyor** (K12).
 *
 * ⚠️ AMA API ONA KAPATILMADI. Ekler bir `switch` değil bir **VERİ TABLOSU**
 * (`CASE_SUFFIXES`): yeni bir hâl eklemek bir satırdır, bir yeniden yazım
 * değil. Ünlü uyumu çözücüsü (`resolveEnding`) paylaşılır.
 * Tüketicisi **Faz 44** (diyalog sistemi) ve orada `Galatasaray'a`,
 * `Beşiktaş'ta`, `Trabzon'dan` gerekecek.
 *
 * ⚠️ Bulunma/ayrılma hâli AYRICA **ünsüz sertleşmesi** ister (`Beşiktaş'ta`,
 * `-da` değil) — yani `afterConsonant` o gün ikiye ayrılacak
 * (`afterVoicedConsonant` / `afterVoicelessConsonant`). Tablo şekli buna
 * hazır: yeni bir anahtar eklenir, var olan satırlar değişmez.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN HİÇBİR YERDE `toLowerCase()` YOK — ölçülmüş iki tuzak
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Ünlü sınıfı tablosu büyük ve küçük harfleri **birlikte** taşıyor. Sebep,
 * 5.1'de koşturularak ölçüldü (tahmin değil):
 *
 * | Girdi | `toLowerCase()` | Sonuç |
 * |---|---|---|
 * | `'IĞDIR'` | `'iğdir'` | Noktasız `I` **noktalı `i`** oluyor: son ünlü kalın (`ı`) iken ince (`i`) sanılıyor → `IĞDIR'in` (YANLIŞ, doğrusu `IĞDIR'ın`) |
 * | `'İ'` | `'i̇'` | **İKİ kod noktası** (`i` + U+0307 birleşen nokta). Dize UZUYOR; indeks tabanlı tarama kayıyor |
 *
 * `toLocaleLowerCase('tr')` ikisini de doğru yapıyor ama davranışı ICU
 * verisine bağlı ve çalışma ortamına göre değişebilir. Tablo yaklaşımı
 * **deterministik** ve tuzağın ikisini birden ortadan kaldırıyor: hiç
 * dönüştürme yapılmıyor.
 */
import { ValidationError } from '../errors.js';

/**
 * Türkçe ünlü uyumunun dört sınıfı.
 *
 * Ek ünlüsü son ünlünün sınıfına göre seçilir:
 * kalın düz → `ı` · ince düz → `i` · kalın yuvarlak → `u` · ince yuvarlak → `ü`.
 */
export const VOWEL_HARMONY_CLASSES = {
  /** Kalın düz: a, ı */
  backUnrounded: 'backUnrounded',
  /** İnce düz: e, i */
  frontUnrounded: 'frontUnrounded',
  /** Kalın yuvarlak: o, u */
  backRounded: 'backRounded',
  /** İnce yuvarlak: ö, ü */
  frontRounded: 'frontRounded',
} as const;

export type VowelHarmonyClass = (typeof VOWEL_HARMONY_CLASSES)[keyof typeof VOWEL_HARMONY_CLASSES];

/**
 * Harf → ünlü sınıfı. Büyük ve küçük harfler AYRI girdiler (yukarıdaki tuzak).
 *
 * Şapkalı ünlüler (`â`, `î`, `û`) dahil ve bu bir tercih değil bir
 * **doğruluk** gereği: tabloda olmasalardı tarayıcı onları atlayıp **daha
 * önceki** bir ünlüyü son ünlü sanardı — sessizce yanlış bir ek üretirdi.
 */
const VOWEL_CLASS_BY_LETTER: Readonly<Record<string, VowelHarmonyClass>> = {
  a: 'backUnrounded',
  A: 'backUnrounded',
  â: 'backUnrounded',
  Â: 'backUnrounded',
  ı: 'backUnrounded',
  I: 'backUnrounded',
  e: 'frontUnrounded',
  E: 'frontUnrounded',
  i: 'frontUnrounded',
  İ: 'frontUnrounded',
  î: 'frontUnrounded',
  Î: 'frontUnrounded',
  o: 'backRounded',
  O: 'backRounded',
  u: 'backRounded',
  U: 'backRounded',
  û: 'backRounded',
  Û: 'backRounded',
  ö: 'frontRounded',
  Ö: 'frontRounded',
  ü: 'frontRounded',
  Ü: 'frontRounded',
};

/** Desteklenen dilbilgisi hâlleri. Bugün bir tane — gerekçe dosya başında. */
export const GRAMMATICAL_CASES = {
  /** İlgi (tamlayan) hâli: `-ın / -in / -un / -ün`, ünlüden sonra `n` kaynaştırması. */
  genitive: 'genitive',
} as const;

export type GrammaticalCase = (typeof GRAMMATICAL_CASES)[keyof typeof GRAMMATICAL_CASES];

/** Sözcüğün nasıl bittiği — ek seçiminin ikinci ekseni. */
export type EndingKind = 'afterConsonant' | 'afterVowel';

/**
 * EK TABLOSU — VERİ, kod değil.
 *
 * `hâl → bitiş türü → uyum sınıfı → ek`. Yeni bir hâl eklemek bir satırdır
 * (dosya başındaki kapsam notuna bak).
 */
const CASE_SUFFIXES: Readonly<
  Record<GrammaticalCase, Readonly<Record<EndingKind, Readonly<Record<VowelHarmonyClass, string>>>>>
> = {
  genitive: {
    afterConsonant: {
      backUnrounded: 'ın',
      frontUnrounded: 'in',
      backRounded: 'un',
      frontRounded: 'ün',
    },
    afterVowel: {
      backUnrounded: 'nın',
      frontUnrounded: 'nin',
      backRounded: 'nun',
      frontRounded: 'nün',
    },
  },
};

/** Bir adın ek seçimini belirleyen iki olgu. */
export interface NameEnding {
  readonly harmony: VowelHarmonyClass;
  readonly endsWithVowel: boolean;
}

/** `PRONUNCIATION_OVERRIDES` satırı — gerekçe VERİNİN parçası, yorum değil. */
export interface PronunciationOverride extends NameEnding {
  /** Bu satır neden var. Her satır kendi gerekçesini taşır. */
  readonly reason: string;
}

/**
 * YAZIM ≠ OKUNUŞ — istisna tablosu.
 *
 * Motor yazıma bakar; başka bir şeye bakamaz (telaffuz sözlüğü yok ve bir
 * tane yazmak Faz 5'in kapsamı değil). Ama yazımın **kesin yanlış** cevap
 * verdiği iki sınıf var ve ikisi de bu projenin veri kümesinde:
 *
 * ① **Yabancı adlarda yazım/okunuş ayrışması.** `Liverpool` şanslı bir örnek:
 *    yazılı son ünlüsü `o` (kalın yuvarlak) ve okunuşu da `u` — aynı sınıf,
 *    yazım tabanlı çözücü **tesadüfen** doğru cevabı veriyor. `Chelsea` ısırır:
 *    yazılı son ünlü `a` → kural `'ın` der, doğrusu `'nin`.
 *
 * ② **Harf harf okunan kısaltmalar.** `UEFA` sözcük gibi okunur ("uefa") ve
 *    yazımında ünlü vardır — tablo gerekmez. `TFF` harf harf okunur
 *    ("te-fe-fe") ve yazımında **hiç ünlü yoktur** — çözücü hiçbir şey bulamaz.
 *
 * ⚠️ **TABLO BİLEREK KÜÇÜK.** Her satır doğrulanabilir bir okunuş iddiasıdır;
 * emin olunmayan bir ad buraya YAZILMAZ (SAPMA-026). Tabloda olmayan ve
 * yazımında ünlü bulunmayan bir ad **sessizce varsayılan almaz** — `resolveEnding`
 * fırlatır. Tablonun büyümesi bir **veri** işidir, kod değil.
 *
 * ⚠️ Arama TAM EŞLEŞMEDİR (kırpma sonrası). Farklı yazılmış bir biçim
 * (`CHELSEA`) kendi satırını ister; bulanık eşleme bilerek yok — yanlış
 * eşleşme, hiç eşleşmemekten kötüdür (`spec/12` §17.3 ile aynı disiplin).
 */
export const PRONUNCIATION_OVERRIDES: Readonly<Record<string, PronunciationOverride>> = {
  Chelsea: {
    harmony: 'frontUnrounded',
    endsWithVowel: true,
    reason:
      'Türkçede "çelsi" okunur: son ses ince düz ünlü. Yazım "a" ile bitiyor ve kural yanlış cevap verir.',
  },
  TFF: {
    harmony: 'frontUnrounded',
    endsWithVowel: true,
    reason: 'Harf harf okunur ("te-fe-fe"): son ses "e". Yazımda hiç ünlü yok.',
  },
  PSG: {
    harmony: 'frontUnrounded',
    endsWithVowel: true,
    reason: 'Harf harf okunur ("pe-se-ge"): son ses "e". Yazımda hiç ünlü yok.',
  },
  // ── 5.3'ün ÇAPRAZ DOĞRULAMASINDA bulundu — gerçek adlar doğunca ─────────
  // İkisi de yazımla ÇÖZÜLÜYOR ama YANLIŞ çözülüyor: uyum sınıfı ile BİTİŞ
  // TÜRÜ ayrı eksenler ve yazım ikisinden birinde yanılıyor.
  'Premier League': {
    harmony: 'frontUnrounded',
    endsWithVowel: false,
    reason:
      'Türkçede "lig" okunur: ÜNSÜZLE biter. Yazım "e" ile bittiği için kural kaynaştırma "n" ekler ve League\'nin üretir; doğrusu League\'in.',
  },
  'FA Cup': {
    harmony: 'backUnrounded',
    endsWithVowel: false,
    reason:
      'Türkçede "kap" okunur: son ünlü kalın DÜZ. Yazımın "u" harfi kalın yuvarlak sayılıyor ve kural Cup\'un üretiyor; doğrusu Cup\'ın.',
  },
};

/**
 * Adın son ünlüsünü ve ünlüyle bitip bitmediğini çözer.
 *
 * SESSİZ VARSAYILAN YOK: ünlü bulunamazsa ve istisna tablosunda satırı yoksa
 * `ValidationError` fırlatır. Gerekçe `base-path.ts` ile aynı — sessizce
 * yanlış bir çıktı üretmek (`TFF'ın`), gürültülü bir hatadan **kötüdür**:
 * yanlış Türkçe kimsenin dikkatini çekmez, fırlatılan hata çeker.
 *
 * @throws {ValidationError} ad boşsa ya da çözülebilir bir ünlü yoksa.
 */
export function resolveEnding(name: string): NameEnding {
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    throw new ValidationError({
      code: 'i18n.suffix.emptyName',
      message: 'Türkçe ek motoru boş bir ad aldı.',
      context: { name },
    });
  }

  /**
   * NFC ZORUNLU — ve bunu bir lint kuralı buldu (`no-misused-spread`, 5.1).
   *
   * `İ` iki biçimde gelebilir: bileşik `U+0130`, ya da ayrışmış `I` + `U+0307`
   * (birleşen nokta). Ayrışmış biçimde tablo aramasi taban `I` harfine düşer ve
   * onu **kalın** ünlü sayar — `İzmir` ince olmasına rağmen `'ın` alırdı.
   * `normalize('NFC')` ikisini tek biçime indirger. Yerleşik, deterministik,
   * `Intl` yerel verisine bağlı değil.
   *
   * Türkçe harflerin tamamı BMP içinde olduğu için indeksle gezmek güvenli;
   * çok kod birimli bir karakter gelirse hiçbir ünlüye eşleşmez, yani zararsız.
   */
  const normalized = trimmed.normalize('NFC');

  const override = PRONUNCIATION_OVERRIDES[normalized];
  if (override !== undefined) {
    return { harmony: override.harmony, endsWithVowel: override.endsWithVowel };
  }

  // Sondan başa: ilk bulunan ünlü SON ünlüdür.
  let harmony: VowelHarmonyClass | undefined;
  for (let index = normalized.length - 1; index >= 0; index -= 1) {
    const found = VOWEL_CLASS_BY_LETTER[normalized.charAt(index)];
    if (found !== undefined) {
      harmony = found;
      break;
    }
  }

  if (harmony === undefined) {
    throw new ValidationError({
      code: 'i18n.suffix.noVowel',
      message:
        'Türkçe ek motoru adda ünlü bulamadı. Harf harf okunan kısaltmalar PRONUNCIATION_OVERRIDES tablosuna yazılır.',
      context: { name: trimmed },
    });
  }

  const lastLetter = normalized.charAt(normalized.length - 1);
  return { harmony, endsWithVowel: VOWEL_CLASS_BY_LETTER[lastLetter] !== undefined };
}

/**
 * Ada uygun eki döner — **kesme işareti OLMADAN**.
 *
 * Kesme işareti şablonda durur: ROADMAP Faz 5 kapsamı ekleme biçimini
 * `{{club}}'{{suffix}}` diye tanımlıyor, yani çeviri metni kesmeyi taşır ve bu
 * fonksiyon yalnızca eki üretir. Tam biçim isteyen `withSuffix()` kullanır.
 */
export function suffixFor(name: string, grammaticalCase: GrammaticalCase = 'genitive'): string {
  const { harmony, endsWithVowel } = resolveEnding(name);
  const endingKind: EndingKind = endsWithVowel ? 'afterVowel' : 'afterConsonant';
  return CASE_SUFFIXES[grammaticalCase][endingKind][harmony];
}

/** Adı ekiyle birlikte döner: `Galatasaray` → `Galatasaray'ın`. */
export function withSuffix(name: string, grammaticalCase: GrammaticalCase = 'genitive'): string {
  const trimmed = name.trim();
  return `${trimmed}'${suffixFor(trimmed, grammaticalCase)}`;
}
