/**
 * `no-hardcoded-path` kuralının kendi testi.
 *
 * NEDEN VAR: bir lint kuralının en büyük riski yanlış pozitiftir. Geliştirici
 * meşru koduna hata aldığında kuralı devre dışı bırakır ve kural bir daha
 * hiçbir şey yakalamaz. Bu yüzden geçerli senaryolar en az geçersizler kadar
 * ayrıntılı test edilir.
 *
 * RuleTester, `describe`/`it` bulamazsa testleri senkron koşturur ve Vitest'e
 * hiçbir süit kaydetmez ("No test suite found"). Statik alanlara açıkça
 * bağlamak, `globals: true`'ya güvenmekten daha sağlam.
 */
import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import rule from './no-hardcoded-path.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

ruleTester.run('no-hardcoded-path', rule, {
  valid: [
    // İzin verilen sarmalayıcılar
    "basePath('/api/health');",
    "apiPath('/health');",
    "helpers.basePath('/login');",

    // Ön ek tam segment olarak eşleşmiyor — yanlış pozitif olmamalı
    "const s = '/apiary';",
    "const s = '/authentic-cases';",
    "const s = '/logins-report';",

    // Uygulama yolu olmayan mutlak dizgiler
    "const s = '/';",
    "const s = '/health';",
    "const s = '/usr/local/bin';",
    "const css = 'grid-template-columns';",

    // Regex literali dizgi düğümü değildir
    'const re = /^\\/api\\/v1/;',

    // Modül belirteçleri atlanır
    "import x from '/api/thing';",
    "export * from '/api/thing';",

    // Dinamik şablon — sabit değil
    'const s = `/api/${id}`;',

    // Yorumlar hiç görülmez
    "// fetch('/api/health') burada yalnızca açıklama\nconst s = 1;",
  ],

  invalid: [
    {
      code: "fetch('/api/health');",
      errors: [{ messageId: 'hardcodedPath', data: { value: '/api/health' } }],
    },
    {
      code: "const p = '/login';",
      errors: [{ messageId: 'hardcodedPath' }],
    },
    {
      code: "const p = '/api';",
      errors: [{ messageId: 'hardcodedPath' }],
    },
    {
      code: "const p = '/assets/logo.png';",
      errors: [{ messageId: 'hardcodedPath' }],
    },
    {
      // İfade içermeyen şablon literali de sabittir
      code: 'fetch(`/api/health`);',
      errors: [{ messageId: 'hardcodedPath' }],
    },
    {
      // Sorgu dizesiyle
      code: "fetch('/api?x=1');",
      errors: [{ messageId: 'hardcodedPath' }],
    },
    {
      // Alt yol ön eki elle yazılmış — basePath() İÇİNDE bile hata
      code: "basePath('/fms/api');",
      errors: [{ messageId: 'basePrefixed', data: { value: '/fms/api' } }],
    },
    {
      code: "const p = '/fms';",
      errors: [{ messageId: 'basePrefixed' }],
    },
  ],
});
