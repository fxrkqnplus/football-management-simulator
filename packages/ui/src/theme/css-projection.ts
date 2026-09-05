/**
 * Token'ların CSS'e YANSITILMASI — ve iki temsilin ayrışmasını önleyen karar.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ KARAR: CSS **TÜRETİLİYOR**, elle yazılmıyor — ve tazeliği bir test tutuyor
 * ────────────────────────────────────────────────────────────────────────────
 *
 * 6.2 tek kaynağı TypeScript'te kurdu ve anahtarları **CSS özel özellik adı**
 * olarak yazdı (`--bg-base`), tam da bu an için. Tailwind 4 CSS-öncelikli
 * (`@theme`), yani aynı değerler ikinci bir yerde görünmek zorunda.
 *
 * **Üç seçenek vardı:**
 *   ① CSS **TS'ten üretilir** ← **SEÇİLEN**
 *   ② CSS kaynak olur, TS onu okur
 *   ③ ikisi elle yazılır + çift yönlü koşan bir eşleşme testi
 *
 * **Neden ①:** ③ iki temsili **korur** ve yalnızca ayrışmayı *bildirir*; ①
 * ikinci temsili bir **artefakta** indirger — ayrışma yapısal olarak mümkün
 * değil. ② ise TS'i bir CSS ayrıştırıcısına bağımlı kılardı ve 6.2'nin tip
 * güvenliğini (`satisfies Record<…>`) kaybettirirdi.
 *
 * **Emsal bu depoda hazır:** `docs/schema/world.md`nin ER bloğu da üretilmiş
 * bir artefakt ve tazeliğini `er-diagram.itest.ts` tutuyor — *"blok elle
 * düzenlenmez"*. Aynı yapı: `scripts/generate-theme-css.mjs` yazıyor,
 * `css-projection.test.ts` **yeniden üretip diskle karşılaştırıyor**. Bayat bir
 * dosya `pnpm test`i kırar.
 *
 * ⚠️ Bu, ③'ün çift yönlü eşleşmesinden **daha güçlü**: orada CSS'e elle
 * eklenmiş bir fazlalık ancak ikinci yön yazılmışsa görünürdü; burada üretilmiş
 * çıktı **birebir** karşılaştırılıyor, fazlalık da eksik de aynı testte ötüyor.
 */
import {
  DARK_COLOR_TOKENS,
  DURATIONS_MS,
  EASING,
  FONT_STACKS,
  LIGHT_COLOR_OVERRIDES,
  LIGHT_UNDEFINED_IN_SPEC,
  RADIUS_SCALE,
  SHADOW_SCALE,
  SPACE_SCALE,
  TEXT_SCALE,
  Z_INDEX,
} from '../tokens/index.js';
import { FONT_WEIGHTS } from '../tokens/typography.js';

/** Üretilmiş dosyanın deponun kökünden yolu. Test ve betik **aynı** sabiti okur. */
export const GENERATED_CSS_PATH = 'packages/ui/src/theme/tokens.generated.css';

const px = (value: number): string => `${String(value)}px`;
const ms = (value: number): string => `${String(value)}ms`;

const block = (selector: string, lines: readonly string[]): string =>
  [`${selector} {`, ...lines.map((line) => `  ${line}`), '}'].join('\n');

const decls = (entries: readonly (readonly [string, string])[]): string[] =>
  entries.map(([name, value]) => `${name}: ${value};`);

/**
 * Tema-bağımsız token'lar: tipografi, boşluk, geometri, katman, hareket.
 * §7.3 ve §7.4'ün tamamı — bunların tema başına bir değeri **yok**.
 */
const themeAgnosticDeclarations = (): string[] => [
  ...decls(Object.entries(FONT_STACKS)),
  ...decls(Object.entries(TEXT_SCALE).map(([k, v]) => [k, px(v.size)] as const)),
  ...decls(Object.entries(TEXT_SCALE).map(([k, v]) => [`${k}-line`, px(v.lineHeight)] as const)),
  ...decls(Object.entries(FONT_WEIGHTS).map(([k, v]) => [k, String(v)] as const)),
  ...decls(Object.entries(SPACE_SCALE).map(([k, v]) => [k, px(v)] as const)),
  ...decls(Object.entries(RADIUS_SCALE).map(([k, v]) => [k, px(v)] as const)),
  ...decls(Object.entries(SHADOW_SCALE)),
  ...decls(Object.entries(Z_INDEX).map(([k, v]) => [k, String(v)] as const)),
  ...decls(Object.entries(DURATIONS_MS).map(([k, v]) => [k, ms(v)] as const)),
  ...decls(Object.entries(EASING)),
];

/**
 * Üretilmiş CSS'in tam metni.
 *
 * ⚠️ **AÇIK TEMA BLOĞU EKSİK OLDUĞUNU KENDİ İÇİNDE SÖYLÜYOR.** CSS'te
 * "tanımsız" diye bir değer yok: `[data-theme='light']` bloğunda geçersiz
 * kılınmayan 12 token `:root`tan **devralınır** — yani koyu değerlerini alır.
 * 6.2 tam olarak bu davranışı **reddetmişti** (`--bg-input` devralınırsa açık
 * arayüzde siyaha yakın bir giriş alanı doğar).
 *
 * Bu yansıtma o gerçeği **saklamıyor**: blok bir uyarı başlığı taşıyor ve
 * eksik 12 token **adıyla** listeleniyor. Çıktı, açık temanın bugün
 * **tamamlanmamış** olduğunu okuyana söylüyor; sessiz bir devralma D3
 * yanılsaması üretirdi.
 */
export const renderTokenCss = (): string => {
  const undefinedList = LIGHT_UNDEFINED_IN_SPEC.map((name) => `   *   ${name}`).join('\n');

  return [
    '/*',
    ' * ÜRETİLMİŞ DOSYA — ELLE DÜZENLEME.',
    ' *',
    ' * Kaynak: packages/ui/src/tokens/ (TypeScript, tek kaynak)',
    ' * Üreten: scripts/generate-theme-css.mjs',
    ' * Tazelik: packages/ui/src/theme/css-projection.test.ts yeniden üretip',
    ' *          bu dosyayla BİREBİR karşılaştırıyor — bayat bir dosya',
    ' *          `pnpm test`i kırar.',
    ' */',
    '',
    block(':root', [
      ...decls(Object.entries(DARK_COLOR_TOKENS)),
      '',
      ...themeAgnosticDeclarations(),
    ]),
    '',
    '/*',
    ' * AÇIK TEMA — yirmi token, ve ikisi AYRI KAYNAKTAN.',
    ' *',
    ' * spec/05 §7.1 yalnızca SEKİZ token veriyor. Kalan ON İKİSİ Faz 6.3b`de',
    ' * YAZILDI (türetilmedi — iki türetme kuralı da kontrol deneyiyle çürütüldü).',
    ' * Hangisinin otoriteden geldiği kodda ayrı duruyor:',
    ' *   LIGHT_SPEC_OVERRIDES   (8) -> spec/05 §7.1',
    ' *   LIGHT_WRITTEN_TOKENS  (12) -> Faz 6.3b, gerekçeleri color.ts`te',
    ' *',
    ' * Spec`in açık temada değer VERMEDİĞİ on iki token:',
    undefinedList,
    ' */',
    block("[data-theme='light']", decls(Object.entries(LIGHT_COLOR_OVERRIDES))),
    '',
    '/* §7.4: "Hareketi azalt" açıksa tüm süreler 0ms. */',
    block(
      "[data-reduced-motion='reduce']",
      decls(Object.keys(DURATIONS_MS).map((name) => [name, ms(0)] as const)),
    ),
    '',
  ].join('\n');
};
