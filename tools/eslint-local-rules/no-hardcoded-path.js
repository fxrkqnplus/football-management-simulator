/**
 * K6 — kodda mutlak uygulama yolu yazılmaz.
 *
 * Uygulama `/fms` alt yolunda çalışır. `fetch('/api/health')` yerelde kökten
 * servis edilirken çalışır, üretimde 404 verir. Bu kural o sınıfı editörde
 * yakalar; `basePath()` / `apiPath()` kullanımını zorunlu kılar.
 *
 * YANLIŞ POZİTİFTEN KAÇINMA: kural her `/` ile başlayan dizgiyi işaretlemez —
 * yalnızca yapılandırılmış uygulama ön eklerini (`/api`, `/login` ...) ve ön ek
 * tam bir yol segmenti olarak eşleştiğinde işaretler. `'/apiary'` eşleşmez.
 * Yorumlar ve regex literalleri zaten dizgi düğümü değildir, hiç görülmezler.
 * Modül belirteçleri (`import x from '...'`) ve TS tip konumları atlanır.
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Mutlak uygulama yollarının koda gömülmesini engeller; basePath() kullanımını zorunlu kılar (K6).',
    },
    messages: {
      hardcodedPath:
        "Mutlak yol koda gömülmüş: '{{value}}'. Uygulama bir alt yolda çalışıyor — basePath('{{value}}') kullanın (K6).",
      basePrefixed:
        "Alt yol ön eki koda gömülmüş: '{{value}}'. Ön eki basePath() ekler, elle yazılmaz (K6).",
    },
    schema: [
      {
        type: 'object',
        properties: {
          /** Uygulama yolu sayılan ön ekler. */
          prefixes: { type: 'array', items: { type: 'string' }, uniqueItems: true },
          /** Bu fonksiyonlara doğrudan argüman olan yollar serbesttir. */
          allowedCallees: { type: 'array', items: { type: 'string' }, uniqueItems: true },
          /** Alt yol ön eki — koda hiçbir şekilde yazılmamalı. */
          basePathValue: { type: 'string' },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const options = context.options[0] ?? {};
    const prefixes = options.prefixes ?? [
      '/api',
      '/auth',
      '/login',
      '/logout',
      '/register',
      '/assets',
    ];
    const allowedCallees = options.allowedCallees ?? ['basePath', 'apiPath'];
    const basePathValue = options.basePathValue ?? '/fms';

    /** Ön ek tam bir yol segmenti olarak mı eşleşiyor? `/apiary` HAYIR. */
    const matchesPrefix = (value, prefix) =>
      value === prefix || value.startsWith(`${prefix}/`) || value.startsWith(`${prefix}?`);

    const isAllowedCall = (node) => {
      const parent = node.parent;
      if (parent === undefined || parent === null) return false;
      if (parent.type !== 'CallExpression') return false;
      if (!parent.arguments.includes(node)) return false;
      const callee = parent.callee;
      if (callee.type === 'Identifier') return allowedCallees.includes(callee.name);
      if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
        return allowedCallees.includes(callee.property.name);
      }
      return false;
    };

    const isSkippedPosition = (node) => {
      const parent = node.parent;
      if (parent === undefined || parent === null) return false;
      return (
        parent.type === 'ImportDeclaration' ||
        parent.type === 'ExportNamedDeclaration' ||
        parent.type === 'ExportAllDeclaration' ||
        parent.type === 'ImportExpression' ||
        parent.type === 'TSLiteralType' ||
        parent.type === 'TSImportType'
      );
    };

    const check = (node, value) => {
      if (typeof value !== 'string' || !value.startsWith('/')) return;
      if (isSkippedPosition(node)) return;

      // Ön ekin kendisi koda yazılmışsa, basePath() içinde bile hata.
      if (matchesPrefix(value, basePathValue)) {
        context.report({ node, messageId: 'basePrefixed', data: { value } });
        return;
      }

      if (isAllowedCall(node)) return;

      if (prefixes.some((prefix) => matchesPrefix(value, prefix))) {
        context.report({ node, messageId: 'hardcodedPath', data: { value } });
      }
    };

    return {
      Literal(node) {
        check(node, node.value);
      },
      TemplateLiteral(node) {
        // Yalnızca ifade içermeyen şablonlar sabittir; `${x}` içerenler dinamiktir.
        if (node.expressions.length > 0) return;
        const raw = node.quasis[0]?.value.cooked;
        check(node, raw);
      },
    };
  },
};

export default rule;
