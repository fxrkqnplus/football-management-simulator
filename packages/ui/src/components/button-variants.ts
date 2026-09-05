/**
 * BUTTON VARYANTLARI — ve neden bir SAYI değil bir LİSTE.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ADLAR NEREDEN GELDİ — ölçüldü, sonra yazıldı
 * ────────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ **VARYANT ADLARI HİÇBİR KAYNAKTA YOKTU — 6.4'te ölçüldü.**
 *   · `docs/spec/05-design-system.md`: §7.1–§7.6 tarandı, bileşen tanımı
 *     **hiç yok**; `varyant` kelimesinin tek geçtiği yer §7.6'nın **gol
 *     kutlamaları** (8 kutlama varyantı) — bambaşka bir şey.
 *   · `docs/ROADMAP.md` Faz 6 kapsamı ve 6.4 maddesi: *"Button (6 varyant)"*
 *     diyor ve **altısını saymıyor**.
 *
 * Yani **sayı** kaynaktan (ROADMAP), **adlar** buradan geliyor. Bu bir
 * SAPMA-026 ihlali değil çünkü değer uydurulmuyor, bir **kuralla** türetiliyor
 * ve kural yazılı: ROADMAP'in kapsam maddesi *"**shadcn/ui** bileşenlerinin FM
 * temasına uyarlanması"* diyor ve shadcn/ui'nin Button'ı tam **altı** varyant
 * yayınlıyor. ROADMAP'in *"6"*sı ile shadcn'in seti birebir örtüşüyor; adları
 * yeniden icat etmek, uyarlama hedefinden sapmak olurdu.
 *
 * ⚠️ **Bu bir ÖLÇÜM DEĞİL, bir GEREKÇEDİR.** shadcn/ui bu depoya bir paket
 * olarak kurulmuyor (kaynak kopyalanan bir kütüphane), yani set programatik
 * olarak doğrulanamaz. Karar 6.4'te **yazıldı**; itiraz edilirse liste
 * değişir ve `BUTTON_VARIANTS`ı okuyan her şey (tip, stil haritası, test,
 * ileride Storybook hikâyeleri) **otomatik** uyar.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN LİSTE — "6" hiçbir yerde elle yazılmıyor
 * ────────────────────────────────────────────────────────────────────────────
 *
 * ROADMAP *"6 varyant"* diyor. O sayıyı koda ya da teste **elle yazmak**,
 * 6.4-ön'ün §11.5 ve 6.12'de kaldırdığı hatanın aynısı olurdu: sayı taşıyan
 * her talimat bayatlar. Bu yüzden tek kaynak **liste**; sayı ondan türetiliyor
 * (`BUTTON_VARIANTS.length`) ve test *"ROADMAP altı diyor"* iddiasını
 * listeye karşı sınıyor. Emsal: `SUFFIX_CASES` (5.1) ve `glossary-check` (5.7)
 * — envanter dosyada yaşar, sayı prose'da değil.
 *
 * ⚠️ Varyant adları **kod**tur, arayüz metni değil — `CLAUDE.md` §1.1 uyarınca
 * İngilizce. Kullanıcı bu adları hiçbir yerde görmez.
 */

/**
 * Altı varyant, ve her birinin FM yüzeyindeki karşılığı.
 *
 * `as const` — `enum` değil (`CLAUDE.md` §1.3: *"discriminated union tercih
 * edilir; `enum` yerine `as const` nesne"*).
 */
export const BUTTON_VARIANTS = [
  /** Birincil eylem — ekranda en fazla bir tane. "Devam Et", "Teklifi Gönder". */
  'default',
  /** Yıkıcı ve geri alınamaz — "Sözleşmeyi Feshet", "Kaydı Sil". */
  'destructive',
  /** İkincil eylem, kenarlıklı — "İptal", "Geri". */
  'outline',
  /** Eş değerdeki ikinci eylem, dolgulu — "Taslağı Kaydet". */
  'secondary',
  /** Yoğun listelerde satır içi eylem — tablo satırı, kart köşesi. */
  'ghost',
  /** Bağlantı gibi görünen eylem — "Tümünü gör". */
  'link',
] as const;

export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

/** Üç boyut. Dokunma hedefi §7.5'in **44×44px** sınırına `lg`de ulaşıyor. */
export const BUTTON_SIZES = ['sm', 'md', 'lg'] as const;

export type ButtonSize = (typeof BUTTON_SIZES)[number];

/**
 * Varyant → Tailwind sınıfları.
 *
 * ⚠️ Renkler **token'lardan** geliyor (`var(--accent)` gibi), sabit hex
 * değil — `packages/ui/src/theme/tokens.generated.css` tek kaynak ve iki tema
 * onu değiştiriyor. Buraya bir hex yazmak, açık temada sessizce yanlış renk
 * demek olurdu.
 *
 * `Record<ButtonVariant, string>` — bir varyant eklenip stili unutulursa
 * **derleme kırılır**; kapsayıcılık tip seviyesinde zorunlu, ayrıca testte de
 * iddia ediliyor.
 */
export const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  default:
    'bg-[var(--accent)] text-[var(--text-inverse)] hover:bg-[var(--accent-hover)] border border-transparent',
  destructive:
    'bg-[var(--danger)] text-[var(--text-inverse)] hover:brightness-110 border border-transparent',
  outline:
    'bg-transparent text-[var(--text-primary)] border border-[var(--border-strong)] hover:bg-[var(--bg-hover)]',
  secondary:
    'bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)]',
  ghost:
    'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] border border-transparent',
  link: 'bg-transparent text-[var(--accent)] underline underline-offset-2 hover:text-[var(--accent-hover)] border border-transparent',
};

/** Boyut → Tailwind sınıfları. `lg` §7.5'in 44px dokunma hedefini karşılıyor. */
export const BUTTON_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-[var(--space-3)] text-[var(--text-xs)]',
  md: 'h-9 px-[var(--space-4)] text-[var(--text-sm)]',
  lg: 'h-11 px-[var(--space-5)] text-[var(--text-base)]',
};
