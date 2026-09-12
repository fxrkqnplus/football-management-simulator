/**
 * SORUN-002 — Tailwind 4'te BELİRSİZ yardımcı + ETİKETSİZ `var()` değeri.
 *
 * `text-[var(--text-sm)]` bir yazı BOYUTU niyetiyle yazılır ama Tailwind 4
 * onu `color:` olarak derler; `font-[var(--font-ui)]` bir yazı TİPİ niyetiyle
 * yazılır ama `font-weight:` olur. Kaynağı (F4 — belge değil kaynak,
 * `tailwindcss@4.3.3/dist/lib.js`): tür çıkarımı `Q()` değer `var(` ile
 * başlıyorsa **null** döner, ve `switch(dataType ?? Q(...))`in `default` dalı
 * `text-` için renk, `font-` için ağırlıktır. Yani `var()` taşıyan her keyfi
 * değer, ipucu yoksa yardımcının VARSAYILANINA düşer. Üç belirti ölçüldü
 * (6.6 · 6.6b · 6.6c): yanlış CSS özelliği · tailwind-merge aynı gruba düşürüp
 * siliyor (`cn('font-[var(--font-ui)]', 'font-medium')` → aile gider) ·
 * testler yeşil, üretim sessizce yanlış (D5'in bu biçimi).
 *
 * KURAL: iki belirsiz önekte (`text-` · `font-`) `var()` taşıyan keyfi değer
 * ya bir tür ipucu taşır ya da token'ın DECLARE EDİLMİŞ türü yardımcının
 * varsayılanıyla aynıdır:
 *
 *   text-[var(--text-primary)]          → renk token'ı, varsayılan renk  → serbest
 *   text-[var(--text-sm)]               → uzunluk token'ı, varsayılan renk → HATA, `length:` iste
 *   text-[length:var(--text-sm)]        → ipucu var ve token'la uyumlu      → serbest
 *   text-[color:var(--text-sm)]         → ipucu var ama token uzunluk       → HATA (yanlış ipucu)
 *   font-[var(--font-ui)]               → aile token'ı, varsayılan ağırlık  → HATA, `family-name:` iste
 *   font-[family-name:var(--font-ui)]   → uyumlu                            → serbest
 *   text-[var(--olmayan)]               → token bilinmiyor                  → HATA (kapalı-güvenli)
 *
 * Tailwind'in kısa sözdizimi de (`text-(--text-sm)` · `text-(length:--text-sm)`)
 * aynı belirsizliği taşır ve aynı kuralla okunur.
 *
 * ⚠️ İKİNCİ LİSTE YOK — TOKEN TÜRÜ KAYNAKTAN TÜRETİLİR (DZ-07). Renk/uzunluk/
 * aile ayrımı bu dosyaya elle yazılmaz: `packages/ui/src/theme/tokens.generated.css`
 * yüklenir ve her `--ad: değer;` satırı değerin ŞEKLİYLE sınıflanır. O dosya
 * token TS kaynağından üretilir ve tazeliğini `css-projection.test.ts` iddia
 * eder (bayat dosya `pnpm test`i kırar). Zincir: TS kaynağı → üretilmiş CSS →
 * bu kural. Ayrışma nöbetçisi kuralın testinde: üretilmiş CSS'teki her
 * `--text-*` / `--font-*` token'ı bilinen bir sınıfa düşmek zorunda.
 *
 * ⚠️ KAPALI-GÜVENLİ: token dosyası okunamazsa yükleyici FIRLATIR — sessizce
 * "her şey serbest" demek, kuralın var olup hiçbir şey yakalamaması olurdu
 * (DZ-10). Bilinmeyen token da hatadır; serbest bırakmak için ipucu gerekir.
 *
 * KAPSAM DIŞI VE BİLİNÇLİ: `bg-` `border-` `ring-` `shadow-` gibi diğer
 * belirsiz önekler — 6.6b derlenmiş CSS'te ölçtü, bugünkü token'larla
 * varsayılanları niyetle örtüşüyor. Genişletme fikri `docs/V2-BACKLOG.md`de.
 * Yorumlar ve regex literalleri dizgi düğümü değildir, hiç görülmezler —
 * `currency-value.tsx` hatayı JSDoc'ta ANLATIYOR ve bu kural orada ötmez
 * (ham metin taraması öterdi; kuralın ESLint olmasının ölçülmüş sebebi).
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Token türlerinin tek kaynağı — üretilmiş CSS (TS kaynağının yansıması). */
export const TOKEN_CSS_PATH = resolve(HERE, '../../packages/ui/src/theme/tokens.generated.css');

/**
 * Bir CSS özel özellik DEĞERİNİ şekliyle sınıflar. Tailwind'in ipucu adları
 * kullanılıyor ki kuralın mesajı doğrudan yazılacak ipucunu söyleyebilsin.
 *
 * @param {string} value
 * @returns {'color' | 'length' | 'family-name' | 'number' | 'unknown'}
 */
export const classifyTokenValue = (value) => {
  const v = value.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(v) || /^(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color)\(/i.test(v)) {
    return 'color';
  }
  if (/^-?\d*\.?\d+(px|rem|em|%|vw|vh|ch|ex)$/.test(v)) return 'length';
  if (/^-?\d*\.?\d+$/.test(v)) return 'number';
  if (/['"]/.test(v) || /\b(sans-serif|serif|monospace|system-ui|ui-monospace)\b/.test(v)) {
    return 'family-name';
  }
  return 'unknown';
};

/**
 * Üretilmiş token CSS'ini yükler: `--ad: değer;` → { ad → sınıf }.
 * Aynı ad iki temada da tanımlıdır (koyu `:root`, açık `[data-theme]`); iki
 * bildirimin sınıfı ayrışırsa bu bir kaynak hatasıdır ve fırlatılır.
 *
 * @param {string} [path]
 * @returns {Map<string, 'color' | 'length' | 'family-name' | 'number' | 'unknown'>}
 */
export const loadTokenClasses = (path = TOKEN_CSS_PATH) => {
  let css;
  try {
    css = readFileSync(path, 'utf8');
  } catch (error) {
    throw new Error(
      `no-untyped-arbitrary-value: token dosyası okunamadı — ${path}. ` +
        'Kural token türlerini bu dosyadan türetir; dosya yoksa kural KAPALI-GÜVENLİ fırlatır ' +
        '(sessizce hepsini geçirmez).',
      { cause: error },
    );
  }
  const classes = new Map();
  for (const match of css.matchAll(/^\s*--([a-z0-9-]+)\s*:\s*([^;]+);/gim)) {
    const name = match[1];
    const cls = classifyTokenValue(match[2]);
    const previous = classes.get(name);
    if (previous !== undefined && previous !== cls) {
      throw new Error(
        `no-untyped-arbitrary-value: --${name} iki temada iki ayrı sınıfta (${previous} / ${cls}) — ${path}`,
      );
    }
    classes.set(name, cls);
  }
  if (classes.size === 0) {
    throw new Error(`no-untyped-arbitrary-value: ${path} hiç token tanımı içermiyor`);
  }
  return classes;
};

/**
 * Belirsiz önekler ve varsayılan türleri — Tailwind 4.3.3 kaynağından
 * (`Q()` null dönünce `switch`in `default` dalı). Anahtar: yardımcı öneki;
 * `defaultClass`: ipucu yokken düşülen tür; `hints`: Tailwind'in bu yardımcı
 * için kabul ettiği ipuçları → hangi token sınıfıyla uyumlu.
 */
export const AMBIGUOUS_UTILITIES = Object.freeze({
  text: Object.freeze({
    defaultClass: 'color',
    hints: Object.freeze({
      color: 'color',
      length: 'length',
      percentage: 'length',
      'absolute-size': 'length',
      'relative-size': 'length',
    }),
    hintFor: Object.freeze({ length: 'length', color: 'color' }),
  }),
  font: Object.freeze({
    defaultClass: 'number',
    hints: Object.freeze({
      number: 'number',
      'family-name': 'family-name',
      'generic-name': 'family-name',
    }),
    hintFor: Object.freeze({ 'family-name': 'family-name', number: 'number' }),
  }),
});

/**
 * Bir sınıf jetonunu ayrıştırır. Varyant önekleri (`hover:`, `[[data-cvd]_&]:`)
 * ve `!` atılır; iki sözdizimi okunur: `text-[HINT:var(--v)]` ve `text-(HINT:--v)`.
 *
 * @param {string} token
 * @returns {{ utility: 'text' | 'font', hint: string | null, variable: string } | null}
 */
export const parseClassToken = (token) => {
  const match =
    /(?:^|[:!])(text|font)-(?:\[(?:([a-z-]+):)?var\(--([a-z0-9-]+)(?:,[^)]*)?\)\]|\((?:([a-z-]+):)?--([a-z0-9-]+)\))(?:\/[a-z0-9.]+)?$/.exec(
      token,
    );
  if (match === null) return null;
  const utility = /** @type {'text' | 'font'} */ (match[1]);
  return {
    utility,
    hint: match[2] ?? match[4] ?? null,
    variable: match[3] ?? match[5] ?? '',
  };
};

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        "Tailwind 4'te belirsiz yardımcı (`text-`, `font-`) + etiketsiz `var()` keyfi değeri yanlış CSS özelliğine derlenir; tür ipucu zorunlu (SORUN-002).",
    },
    messages: {
      untypedValue:
        "'{{token}}' etiketsiz: `--{{variable}}` bir {{tokenClass}} token'ı ama `{{utility}}-[var(…)]` ipucu olmadan `{{defaultClass}}` olarak derlenir (Tailwind 4 `var()` türünü çıkaramaz). `{{utility}}-[{{hint}}:var(--{{variable}})]` yazın.",
      unknownToken:
        "'{{token}}': `--{{variable}}` tokens.generated.css'te tanımlı değil; türü türetilemiyor. Tanımlı bir token kullanın ya da ipucu yazın (`{{utility}}-[<tür>:var(--{{variable}})]`).",
      hintMismatch:
        "'{{token}}': `{{hint}}:` ipucu `--{{variable}}` token'ının türüyle ({{tokenClass}}) uyuşmuyor. Ya token'ı ya ipucunu düzeltin.",
    },
    schema: [],
  },

  create(context) {
    const tokenClasses = loadTokenClasses();

    const checkToken = (node, token) => {
      const parsed = parseClassToken(token);
      if (parsed === null) return;
      const { utility, hint, variable } = parsed;
      const spec = AMBIGUOUS_UTILITIES[utility];
      const tokenClass = tokenClasses.get(variable);

      if (tokenClass === undefined || tokenClass === 'unknown') {
        context.report({ node, messageId: 'unknownToken', data: { token, variable, utility } });
        return;
      }

      if (hint === null) {
        if (tokenClass === spec.defaultClass) return;
        context.report({
          node,
          messageId: 'untypedValue',
          data: {
            token,
            variable,
            utility,
            tokenClass,
            defaultClass: spec.defaultClass,
            hint: spec.hintFor[tokenClass] ?? '<tür>',
          },
        });
        return;
      }

      const hintClass = spec.hints[hint];
      if (hintClass !== undefined && hintClass !== tokenClass) {
        context.report({
          node,
          messageId: 'hintMismatch',
          data: { token, hint, variable, tokenClass },
        });
      }
    };

    const checkText = (node, text) => {
      if (typeof text !== 'string') return;
      if (!text.includes('var(') && !text.includes('(--')) return;
      for (const token of text.split(/\s+/)) {
        if (token !== '') checkToken(node, token);
      }
    };

    return {
      Literal(node) {
        checkText(node, node.value);
      },
      TemplateLiteral(node) {
        // İfade içeren şablonlarda her sabit parça ayrı okunur; bir sınıf
        // jetonu `${}` ile bölünmez, o yüzden parça başına tarama yeterli.
        for (const quasi of node.quasis) checkText(node, quasi.value.cooked);
      },
    };
  },
};

export default rule;
