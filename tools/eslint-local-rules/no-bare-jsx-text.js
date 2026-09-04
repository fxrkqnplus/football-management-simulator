/**
 * K5 — arayüzde görünen metin koda gömülmez, `t()` üzerinden gelir.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ADI NEDEN `no-bare-jsx-text`, `no-hardcoded-turkish` DEĞİL — ÖLÇÜM SÖYLEDİ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `index.js` bu adı Faz 1.4'ten beri `no-hardcoded-turkish` diye ayırmıştı ve
 * ROADMAP'in kapsam cümlesi *"JSX içinde çıplak **Türkçe** metin yasak"*
 * diyordu. **5.4 o cümleyi çürüttü:** `ErrorBoundary.tsx`teki `Tekrar dene`
 * gerçek bir K5 ihlali ve **hiçbir Türkçe'ye özgü karakter taşımıyor** —
 * `çğışöü` taraması ona **0** döndürüyor. Aynı ölçüm ters yönde de ısırdı:
 * `App.tsx`in `base` ve `api prefix` etiketleri **İngilizce** ve yine de K5
 * ihlali, çünkü kullanıcı onları ekranda görüyor.
 *
 * Yani *"Türkçe metni yakala"* diye bir kural **yazılamaz**; yazılabilen şey
 * *"JSX'te çıplak metin yakala"* ve o dilden bağımsız. **Bir ad bir
 * sözleşmedir:** yanlış ad, kuralı örneklerinden geriye okuyan birine yanlış
 * öğretir — bir gün biri *"bu İngilizce, kural beni ilgilendirmiyor"* der.
 * Yeniden adlandırma **SAPMA-039**'da kayıtlı (`düzeltme` tipi, emsal
 * SAPMA-034).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * KURALIN GÖRDÜĞÜ
 * ────────────────────────────────────────────────────────────────────────────
 *
 *   ① `JSXText` düğümleri — `<p>Bu bölüm yüklenemedi.</p>`
 *   ② Kullanıcıya görünen JSX **niteliklerindeki** dizeler
 *      (`USER_FACING_ATTRIBUTES`) — `title`, `aria-label`, `placeholder`,
 *      `alt`, `label`
 *   ③ JSX **çocuk** konumundaki ifade kaplarındaki düz dizeler —
 *      `{ok ? 'Bitti' : 'Hata'}`, `{cond && 'Metin'}`, `` {`Metin`} ``
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ KURALIN GÖRMEDİĞİ — SESSİZ BIRAKILMIYOR, YAZILIYOR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * **KÖR NOKTA: MODÜL DÜZEYİ METİN SABİTLERİ.** Bir dosyanın tepesinde duran
 * `const TAB_LABELS = { logs: 'Kayıtlar' }` JSX'e render edilebilir ve
 * kullanıcı onu görür — ama sabit JSX'in **içinde** değildir, bu kural onu
 * **görmez**. 5.4'te tam bu sınıftan bir ihlal envanterin dışında kaldı
 * (`DebugPanel`in sekme adları) ve onu yakalayan şey bir araç değil,
 * BORÇ-003'ün onları **adıyla sayması** oldu.
 *
 * ⚠️ **DAR BİR HEURİSTİK DENENMEDİ ÇÜNKÜ ÖLÇÜM ONU ÇÜRÜTTÜ (5.5).**
 * *"Modül düzeyi dize haritası JSX'te kullanılıyorsa bildir"* kuralı bugün
 * `DebugPanel.tsx`teki **dört** haritanın **dördüne birden** öterdi:
 * `TABS` (iç kimlikler) · `LEVEL_COLORS` (CSS renkleri) · `TAB_LABEL_KEYS` ve
 * `EMPTY_TAB_NOTE_KEYS` (**i18n anahtarları — yani sorunun ÇÖZÜMÜ**).
 * `looksLikeProse` de ayırmıyor: `'#ff6b6b'` dört harf taşıyor ve eşiği
 * geçiyor. Yani heuristik 4/4 yanlış pozitif üretir ve bunlardan biri tam da
 * doğru yapılmış işi işaretler — bir kural meşru kodu işaretlediğinde
 * kapatılır ve bir daha hiçbir şey yakalamaz.
 * → Boşluğun sahibi **5.6** (`i18n:check`): o araç `locales/**` ile birlikte
 *   kaynağı da tarıyor ve bir dizeyi *"çeviri anahtarı mı, düz metin mi"*
 *   diye sorabilir — bu kuralın elinde olmayan bilgi.
 *
 * **Kapsam dışı ve bu bilinçli:** yorumlar · `logger.*()` argümanları ·
 * `AppError`/`new *Error({ message })` (SAPMA-010: *"message geliştirici
 * içindir, çevrilmez"*) · `data-testid`/`role`/`className` gibi teknik
 * nitelikler · JSX dışındaki dizeler · `import` belirteçleri · tip konumları.
 * Hiçbiri kullanıcıya görünmüyor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * BU KURAL BİR ARACIN YERİNİ ALDI — iki uygulama bırakılmadı
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `tools/i18n-inventory/` (5.4) aynı tespiti yapıyordu ve ROADMAP onu
 * *"kuralın prototipi"* diye adlandırmıştı. 5.5'te **emekli edildi**: aynı işi
 * yapan iki kod yolu bir gün ayrışır (bu projenin en çok tekrarlanan hata
 * sınıfı — BORÇ-008'in dokuz kopyası, `spec/09` §11.5'in *"hiçbir kural iki
 * yerde denetlenmez"* disiplini). Aracın **tüketicisi yoktu** (ölçüldü: hiçbir
 * betikte, CI'da veya kodda geçmiyordu; yalnızca kendi vitest projesi) ve bu
 * kural onun kapsamının üstünde: `pnpm lint` deponun tamamına bakıyor ve bir
 * **kapı**, elle çağrılan bir CLI değil.
 * ⚠️ Aracın 11 testinin sabitlediği **negatif** anlamların hepsi bu kuralın
 * `valid[]` listesine taşındı — emekliliğin kanıtlanmış bir güvenceyi sessizce
 * düşürmemesi için.
 *
 * ⚠️ **ARAÇTAN BİLİNÇLİ İKİ SAPMA VAR ve ikisi de testle sabitlendi:**
 *   • Araç, **nitelik** konumundaki ifade kaplarını da ③ sınıfına sokuyordu,
 *     yani `data-testid={'x'}` bildirilirdi ama `data-testid="x"` bildirilmezdi
 *     — aynı şeyin iki yazımı için iki farklı cevap. Bu kural nitelik
 *     konumunda **nitelik politikasını** uyguluyor (yalnızca kullanıcıya
 *     görünen ad listesi).
 *   • Araç yalnızca düz dize literallerine bakıyordu; bu kural ifadesiz
 *     **şablon literallerini** de görüyor (`` {`Metin`} ``) — emsal
 *     `no-hardcoded-path`, ve aksi hâlde açık bir kaçış deliği kalırdı.
 */

/** Kullanıcıya görünen JSX nitelikleri. Teknik nitelikler (`data-*`) hariç. */
export const USER_FACING_ATTRIBUTES = ['title', 'aria-label', 'placeholder', 'alt', 'label'];

/**
 * Bir dizede kullanıcıya gösterilmesi muhtemel metin var mı?
 *
 * Tek bir noktalama, bir sayı ya da bir CSS değeri metin değildir. Ayraç:
 * **en az iki harf içeren** bir dize. `'—'`, `'16'`, `'1.6'` elenir.
 */
export function looksLikeProse(value) {
  return value.replace(/[^\p{L}]/gu, '').length >= 2;
}

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        "JSX'te çıplak (çevrilmemiş) metin yazılmasını engeller; t() kullanımını zorunlu kılar (K5).",
    },
    messages: {
      bareJsxText:
        "JSX'te çıplak metin: '{{value}}'. Arayüz metni koda gömülmez — t('namespace:key') kullanın (K5).",
      bareJsxAttribute:
        "Kullanıcıya görünen '{{attribute}}' niteliğinde çıplak metin: '{{value}}'. t('namespace:key') kullanın (K5).",
      bareJsxExpression:
        "JSX ifadesinde çıplak metin: '{{value}}'. Koşullu metin de arayüz metnidir — t('namespace:key') kullanın (K5).",
    },
    schema: [
      {
        type: 'object',
        properties: {
          /** Kullanıcıya görünen nitelik adları. */
          userFacingAttributes: { type: 'array', items: { type: 'string' }, uniqueItems: true },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const userFacingAttributes = context.options[0]?.userFacingAttributes ?? USER_FACING_ATTRIBUTES;

    /** Nitelik adı — `aria-label` tek bir JSXIdentifier, `a:b` ise ad uzayı. */
    const attributeName = (name) => {
      if (name.type === 'JSXNamespacedName') return `${name.namespace.name}:${name.name.name}`;
      return name.name;
    };

    const report = (node, messageId, value, data = {}) => {
      const trimmed = value.trim();
      if (trimmed === '' || !looksLikeProse(trimmed)) return;
      context.report({
        node,
        messageId,
        data: { ...data, value: trimmed.replace(/\s+/g, ' ') },
      });
    };

    /** İfadesiz bir dize literali mi? Şablon literalleri de sabittir. */
    const constantString = (node) => {
      if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
      if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
        return node.quasis[0]?.value.cooked ?? null;
      }
      return null;
    };

    /**
     * Bir ifadedeki sabit dizeleri toplar.
     *
     * `&&`/`||` ESTree'de `LogicalExpression`, `+` ise `BinaryExpression` —
     * TypeScript'in ayrıştırıcısında ikisi de `BinaryExpression`di. İkisi de
     * ele alınmazsa `{cond && 'Metin'}` sessizce kaçardı.
     */
    const collectStrings = (expr, out) => {
      const constant = constantString(expr);
      if (constant !== null) {
        out.push([expr, constant]);
        return;
      }
      if (expr.type === 'ConditionalExpression') {
        collectStrings(expr.consequent, out);
        collectStrings(expr.alternate, out);
        return;
      }
      if (expr.type === 'LogicalExpression' || expr.type === 'BinaryExpression') {
        collectStrings(expr.left, out);
        collectStrings(expr.right, out);
      }
    };

    return {
      // ① JSX metin düğümü
      JSXText(node) {
        report(node, 'bareJsxText', node.value);
      },

      // ② Kullanıcıya görünen nitelikteki düz dize — title="..."
      JSXAttribute(node) {
        if (node.value === null || node.value === undefined) return;
        if (node.value.type !== 'Literal' || typeof node.value.value !== 'string') return;
        const name = attributeName(node.name);
        if (!userFacingAttributes.includes(name)) return;
        report(node.value, 'bareJsxAttribute', node.value.value, { attribute: name });
      },

      // ③ İfade kabı — konumuna göre İKİ FARKLI politika
      JSXExpressionContainer(node) {
        if (node.expression.type === 'JSXEmptyExpression') return;

        const parent = node.parent;
        const inAttribute =
          parent !== undefined && parent !== null && parent.type === 'JSXAttribute';

        // Nitelik konumunda NİTELİK politikası geçerli: `data-testid={'x'}`
        // bir arayüz metni değildir, tıpkı `data-testid="x"` gibi.
        if (inAttribute && !userFacingAttributes.includes(attributeName(parent.name))) return;

        /** @type {[import('estree').Node, string][]} */
        const found = [];
        collectStrings(node.expression, found);
        for (const [expr, value] of found) {
          if (inAttribute) {
            report(expr, 'bareJsxAttribute', value, { attribute: attributeName(parent.name) });
          } else {
            report(expr, 'bareJsxExpression', value);
          }
        }
      },
    };
  },
};

export default rule;
