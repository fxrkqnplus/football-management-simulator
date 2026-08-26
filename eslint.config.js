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
        projectService: {
          // Kök seviyesindeki yapılandırma dosyaları (vitest.config.ts ve
          // ileride eklenecekler) hiçbir paket tsconfig'ine dahil değil.
          // Bunlar olmadan projectService "was not found by the project
          // service" hatası verir. Glob `**` içermemeli.
          //
          // ⚠️ BU LİSTE 3.2a'DA GERİ DARALTILDI — ve bu bir düzeltme.
          //
          // 3.0'da `packages/db/drizzle.config.ts` buraya eklenmişti, çünkü
          // `apps/web` emsali (tsconfig `include`) `rootDir: "src"` yüzünden
          // TS6059 veriyordu. O geçici çözümün gizli bedeli 3.2a'da ölçüldü:
          // `packages/db/integration/` de aynı sebeple tip denetiminden
          // KAÇIYORDU (`tsc --listFiles` → 0 dosya) ve lint aynı hatayı
          // veriyordu.
          //
          // Gerçek çözüm `rootDir`i EMİT EDEN yapılandırmaya taşımaktı
          // (`packages/db/tsconfig.build.json`); `apps/web`in kendi yorumu
          // zaten bunu söylüyordu: *"rootDir tanımlıysa yapılandırma dosyası
          // tip denetiminden kaçar."* Taşındıktan sonra iki dosya da paketin
          // kendi tsconfig'ine girdi ve bu istisnaya gerek kalmadı.
          //
          // **Ders:** `allowDefaultProject`e bir satır eklemek, o dosyayı tip
          // denetiminin dışında bırakan asıl sebebi GİZLER — ve aynı sebep
          // bir sonraki dosyada sessizce tekrarlar.
          allowDefaultProject: ['*.config.ts'],
        },
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
      // Faz 2.2a'da `env.ts` → `src/server/env.ts` taşındı ve bu satır sessizce
      // eşleşmeyi bıraktı: lint iki yanlış pozitif verdi. Yol içeren her
      // yapılandırma girdisi, dosya taşındığında güncellenmek zorunda —
      // burada `**/env.ts` gibi gevşek bir desen KULLANILMIYOR, çünkü muafiyetin
      // dar kalması kuralın güvenilirliğinin şartı.
      'packages/shared/src/server/env.ts',
      'tools/eslint-local-rules/**',
      // arch:check de yol ön eklerini VERİ olarak tutar (APP_PATH_PREFIXES).
      'tools/arch-check/**',
      // Birim testler yolları VERİ olarak kullanır: '/api/health' bir test
      // girdisidir, bir istek değildir. Kural burada açık kalsaydı her test
      // dosyası eslint-disable ile dolardı ve kural güvenilirliğini yitirirdi.
      // DİKKAT: yalnızca *.test.* muaf. Uçtan uca testler (*.spec.ts, Faz 17+)
      // gerçek istek atar ve basePath() kullanmak ZORUNDADIR — muaf değildir.
      //
      // ⚠️ UZANTI LİSTESİ TAM TUTULUR (SAPMA-007 sınıfı, Faz 2.0b'de eklendi).
      // İlk yazımda yalnızca `.ts` ve `.mjs` vardı. Faz 2.0b'de ilk `.test.tsx`
      // dosyası yazıldığında kural 17 yanlış pozitif verdi — muafiyet niyeti
      // doğruydu, deseni eksikti. Aynı körlük 2.0'da `coverage.include`'da,
      // burada, `vitest.config.ts` proje `include`'larında ve yedi
      // `tsconfig.build.json`'da birden çıktı: bir uzantı listesi yazarken
      // "bugün hangi uzantılar var" değil "bu kural hangi dosyalar için
      // geçerli" sorusu sorulur.
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.test.mts',
      '**/*.test.cts',
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

  // ─── 7b. K8'in ikinci yarısı — doğrudan akış yazımı (Faz 2.2b) ─────────
  // `no-console` K8'i yalnızca YARIM uyguluyordu: `console.log` yasaktı ama
  // `process.stdout.write` serbestti ve ürün kodu logger'ı bu kapıdan
  // atlayabiliyordu. 2.0'da ölçüldü — `apps/api/src/main.ts` ve
  // `packages/shared/src/env.ts` tam olarak bunu yapıyordu.
  //
  // KAPSAM BİLİNÇLİ OLARAK DAR: yalnızca `apps/**` ve `packages/**` (ürün kodu).
  // `scripts/**` ve `tools/**` serbest kalıyor — onlar logger'dan ÖNCE çalışan
  // önyükleme kapıları ve `arch:check` gibi CLI araçları; bir logger'a bağlanmaları
  // hem dairesel hem anlamsız olurdu. Bu, dizin bazlı bir kaçış deliği değil:
  // o dizinlerden hiçbiri üretimde çalışmıyor.
  //
  // Logger UYGULAMALARI da bu yasağın dışında değil — pino kendi yazımını
  // kütüphane içinde yapıyor, tarayıcı logger'ı ise `console`'u tek satırlık
  // gerekçeli bir `eslint-disable` ile açıyor. İstisna dosya bazında ve görünür.
  //
  // `arch:check` bu kuralı TEKRARLAMAZ (`docs/spec/09` §11.5 iş bölümü).
  {
    files: ['apps/**/*.{ts,tsx,mts,cts}', 'packages/**/*.{ts,tsx,mts,cts}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.object.name='process'][callee.object.property.name=/^(stdout|stderr)$/][callee.property.name='write']",
          message:
            "K8: ürün kodunda process.stdout/stderr.write yasak — logger'ı atlıyor. " +
            "Sunucuda createServerLogger('@fms/shared/server'), tarayıcıda " +
            'createBrowserLogger kullan. Önyükleme betikleri (scripts/, tools/) muaftır.',
        },
      ],
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
