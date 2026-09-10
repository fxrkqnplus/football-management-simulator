/**
 * ANLAMSAL RENKLERİN KULLANIM ÇİFTİ — 6.2'nin AÇIK BIRAKTIĞI KARAR.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * ⚠️ SAHİPLİK: KAYIT "6.4" DİYORDU, GERÇEK SAHİP 6.5
 * ════════════════════════════════════════════════════════════════════════════
 *
 * 6.2 dört anlamsal token'ı (`--danger` · `--warning` · `--success` · `--info`)
 * **denetlemeden bıraktı** ve gerekçesini yazdı: *"§7.1 bunların hangi zemin
 * üzerinde, metin mi dolgu mu kullanılacağını **söylemiyor**. Çifti spec
 * vermeden seçmek SAPMA-026 olurdu."* Sahibi olarak **6.4** yazıldı —
 * `contrast-audit.test.ts`teki not daha da açık: *"Sahibi: 6.4 (**Badge,
 * Toast**) — o gün kullanım yeri belli olacak."*
 *
 * ⚠️ **Ama Badge ve Toast 6.4'te DEĞİL, 6.5'te** (ROADMAP'in 6.4 listesi:
 * Button · Input · Select · Combobox · Checkbox · RadioGroup · Slider ·
 * Switch · Tabs). Yani **niyet doğruydu, numara bayattı** — ve 6.4 gerçekten
 * de kararı adıyla kapatmadı (Button'ın `destructive` varyantı `--danger`ı
 * dolgu olarak kullandı ama bunu 6.2'nin açık maddesine bağlamadı).
 * Sahip **bileşendir**, numara değil: kullanım yeri bugün doğdu.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * KARAR — ve hangi yarısı ÖLÇÜM, hangi yarısı GEREKÇE
 * ════════════════════════════════════════════════════════════════════════════
 *
 * **① Zemin: anlamsal renk DOLGU olarak kullanılır. (GEREKÇE, ölçüm değil.)**
 * Kaynak yok; §7.1 söylemiyor. Dayanak **depo içi emsal**: 6.4'ün Button'ı
 * `destructive` varyantında `bg-[var(--danger)]` yazdı, yani dolgu tercihi bu
 * depoda **zaten yapılmıştı**. İkinci bir kural icat etmek yerine var olanı
 * genelleştirmek, iki yüzeyin ayrışmasını önlüyor. İtiraz edilirse liste ve
 * sınıflar birlikte değişir.
 *
 * **② Metin rengi: HESAPLANIR, seçilmez. (ÖLÇÜM.)**
 * `--text-inverse` mi `--text-primary` mi sorusu bir tercih değil bir
 * **kontrast hesabı** — 6.2'nin `pickAccessibleForeground()`u tam bunun için
 * yazıldı (*"Seçim bir tercih değil bir hesap"*). Bu modül **sınıf adını**
 * taşıyor; hesabın kendisi `semantic-tone.test.ts`te her ton için koşuyor ve
 * seçilen ön planın gerçekten daha yüksek kontrast verdiğini iddia ediyor.
 *
 * **③ Ton envanteri bir SAYI değil bir LİSTE.** `SEMANTIC_TONES` tek kaynak;
 * `Record<SemanticTone, string>` kapsayıcılığı **tip seviyesinde** zorluyor ve
 * test onu ayrıca iddia ediyor (`BUTTON_VARIANTS` deseni).
 *
 * ⚠️ **Bu karar `contrast-audit.test.ts`in "HENÜZ denetlenmiyor" vakasını
 * kapatıyor** — o test 6.5'te gerçek bir denetime çevrildi.
 */
import { type ColorTokenKey, DARK_COLOR_TOKENS } from './color.js';
import { pickAccessibleForeground } from './contrast.js';

/** Dört anlamsal ton — `spec/05` §7.1'in verdiği token kümesi, fazlası yok. */
export const SEMANTIC_TONES = ['info', 'success', 'warning', 'danger'] as const;

export type SemanticTone = (typeof SEMANTIC_TONES)[number];

/**
 * Ton → `spec/05` §7.1 token adı. Uydurulmuş bir renk yok.
 *
 * Değer tipi `ColorTokenKey`, yani var olmayan bir token adı yazmak
 * **derlemede** kırılır — dize olarak bırakılsaydı yazım hatası çalışma
 * zamanına kadar sessiz kalırdı.
 */
export const SEMANTIC_TONE_TOKENS: Record<SemanticTone, ColorTokenKey> = {
  info: '--info',
  success: '--success',
  warning: '--warning',
  danger: '--danger',
};

/**
 * Bir tonun okunabilir ön plan rengini **hesaplar**.
 *
 * Aday kümesi bilerek dar: koyu temanın `--text-inverse` ve `--text-primary`
 * token'ları. Üçüncü bir aday eklemek yeni bir renk icat etmek olurdu.
 * Dönüş `pickAccessibleForeground`in kendi biçimi (`{ color, ratio }`) —
 * oranı da taşıyor, çünkü test *"seçilen aday gerçekten daha yüksek"* diye
 * sorabilsin.
 */
export function foregroundForTone(tone: SemanticTone): {
  readonly color: string;
  readonly ratio: number;
} {
  const background = DARK_COLOR_TOKENS[SEMANTIC_TONE_TOKENS[tone]];
  return pickAccessibleForeground(background, [
    DARK_COLOR_TOKENS['--text-inverse'],
    DARK_COLOR_TOKENS['--text-primary'],
  ]);
}

/**
 * Ton → Tailwind sınıfları.
 *
 * ⚠️ Ön plan **token adıyla** yazılıyor (`--text-inverse`), sabit hex ile
 * değil: açık tema token'ları değiştiriyor ve sabit bir hex orada sessizce
 * yanlış renk olurdu. Hangi token'ın seçildiği `foregroundForTone()` ile
 * **hesaplanıyor** ve test ikisinin örtüştüğünü iddia ediyor.
 */
export const SEMANTIC_TONE_CLASSES: Record<SemanticTone, string> = {
  info: 'border-[var(--info)] bg-[var(--info)] text-[var(--text-inverse)]',
  success: 'border-[var(--success)] bg-[var(--success)] text-[var(--text-inverse)]',
  warning: 'border-[var(--warning)] bg-[var(--warning)] text-[var(--text-inverse)]',
  danger: 'border-[var(--danger)] bg-[var(--danger)] text-[var(--text-inverse)]',
};
