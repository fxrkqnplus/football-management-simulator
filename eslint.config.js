// @ts-check
import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import localRules from './tools/eslint-local-rules/index.js';

/**
 * TEK KÖK CONFIG.
 *
 * ESLint 10 config dosyasını lint edilen dosyanın dizininden başlayarak arar,
 * yani paket başına config teknik olarak mümkün. Yine de tek kök config
 * seçildi: kural yönetimi tek yerde durur ve anayasa (K3/K5/K6/K8) paket paket
 * gevşetilemez. Yeni bir paket eklendiğinde "config'ini yazmayı unuttum"
 * durumu da oluşmaz.
 *
 * Pakete özel istisnalar AYRI DOSYAYLA değil, `files` bazlı override ile
 * çözülür (aşağıda apps/api örneği). Böylece istisnanın kendisi ve gerekçesi
 * aynı dosyada, göz önünde kalır.
 */
export default tseslint.config(
  // ─── 1. Kapsam dışı ────────────────────────────────────────────────────
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.turbo/**',
      'pnpm-lock.yaml',
    ],
  },

  // ─── 2. Taban ──────────────────────────────────────────────────────────
  js.configs.recommended,

  // ─── 3. TypeScript — tip farkında ──────────────────────────────────────
  // `projectService: true`, typescript-eslint 8'in önerdiği yol. Eski
  // `project: [...]` dizisi monorepo'da her yeni pakette elle güncellenmek
  // zorundaydı ve unutulduğunda dosya sessizce tip denetimsiz lint ediliyordu.
  // projectService tsconfig'i dosyadan yukarı doğru kendisi bulur.
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // '_' öneki 'bilerek kullanılmıyor' demektir — destructuring ile alan
      // atlarken (const { a: _a, ...rest }) gerekli.
      // NOT: bu kural, eklentinin tanımlı olduğu blokta ayarlanmalı; flat
      // config'de kural ile eklenti aynı yapılandırma nesnesinde olmak zorunda.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },

  // ─── 4. Düz JS/MJS — tip bilgisi yok ───────────────────────────────────
  // Yapılandırma ve bootstrap betikleri hiçbir tsconfig'e dahil değil;
  // tip farkında kuralları burada kapatmazsak parser hata verir.
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: globals.node,
    },
  },

  // ─── 5. Import sıralaması ──────────────────────────────────────────────
  // simple-import-sort seçildi: modül çözümlemesi yapmaz, bu yüzden hızlıdır
  // ve deterministiktir. Çözümleme gerektiren katman kuralları (2.4) buraya
  // değil, Faz 1.6'daki arch:check'e ait.
  {
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },

  // ─── 6. Yerel kurallar ─────────────────────────────────────────────────
  // Türkçe metin kuralı (K5) Faz 5'te eklenecek.
  {
    plugins: { local: localRules },
    rules: {
      'local/no-hardcoded-path': 'error',
    },
  },

  // Alt yolun TANIM YERİ. Bu üç konum '/fms' ve '/api' dizgilerini bilmek
  // zorundadır — kuralın kendisi, kuralın testi ve tabanı türeten modüller.
  // Başka hiçbir yerde istisna yoktur; hepsi basePath() üzerinden geçer.
  {
    files: [
      'packages/shared/src/base-path.ts',
      'packages/shared/src/env.ts',
      'tools/eslint-local-rules/**',
      // Birim testler yolları VERİ olarak kullanır: '/api/health' bir test
      // girdisidir, bir istek değildir. Kural burada açık kalsaydı her test
      // dosyası eslint-disable ile dolardı ve kural güvenilirliğini yitirirdi.
      // DİKKAT: yalnızca *.test.* muaf. Uçtan uca testler (*.spec.ts, Faz 17+)
      // gerçek istek atar ve basePath() kullanmak ZORUNDADIR — muaf değildir.
      '**/*.test.ts',
      '**/*.test.mjs',
    ],
    rules: {
      'local/no-hardcoded-path': 'off',
    },
  },

  // ─── 7. Anayasa kuralları ──────────────────────────────────────────────
  {
    rules: {
      // K8 — console yasak, yalnızca logger.
      // Bootstrap betikleri (scripts/) console kullanmaz, doğrudan
      // process.stderr'e yazar; bu yüzden onlara istisna GEREKMİYOR.
      'no-console': 'error',
    },
  },

  // ─── 8. apps/api — NestJS istisnaları ──────────────────────────────────
  {
    files: ['apps/api/**/*.ts'],
    rules: {
      // Nest modülleri gövdesiz sınıflardır (@Module ile dekore edilir).
      '@typescript-eslint/no-extraneous-class': 'off',
      // Bu pakette verbatimModuleSyntax kapalı (bkz. apps/api/tsconfig.json):
      // tip-yalnızca import'a zorlamak emitDecoratorMetadata'nın ürettiği
      // design:paramtypes bilgisini siler ve DI çalışma zamanında kırılır.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },

  // ─── 9. Prettier — HER ZAMAN EN SON ────────────────────────────────────
  // Yalnızca çakışan biçimlendirme kurallarını KAPATIR.
  // eslint-plugin-prettier bilinçli olarak kullanılmıyor: Prettier'ı lint
  // kuralı olarak koşturmak monorepo'da belirgin yavaşlık yaratır.
  // Biçimlendirme ayrı komut: `pnpm format` / `pnpm format:check`.
  prettierConfig,
);
