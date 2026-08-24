import { defineConfig } from 'vitest/config';

/**
 * Vitest 4 kök yapılandırması.
 *
 * NOT: Vitest 4'te `vitest.workspace.ts` KALDIRILDI; çoklu paket kurulumu artık
 * bu dosyadaki `projects` dizisiyle tanımlanır.
 *
 * ⚠️ `coverage.include` BU DOSYANIN EN KRİTİK SATIRI.
 * Vitest 4'te `coverage.all` kaldırıldı ve varsayılan davranış yalnızca
 * *çalıştırılan* dosyaları rapora almak. `include` yazılmazsa hiç test edilmemiş
 * bir dosya hesaba hiç girmez ve %85 eşiği sessizce yalan söyler — kapsam
 * raporu "her şey yolunda" derken kodun yarısı test edilmemiş olabilir.
 * K10'un geçerliliği doğrudan bu ayara bağlıdır (docs/spec/09 §11.4).
 */
export default defineConfig({
  test: {
    // `globals` KAPALI: her test dosyası describe/it/expect'i açıkça import
    // eder. İki sebebi var — tsconfig'e `vitest/globals` eklemek gerekmiyor, ve
    // ESLint RuleTester zaten globals'a güvenilerek çalışmıyor: `globals: true`
    // ile denendi, RuleTester süiti kaydetmeden senkron koştu ("No test suite
    // found"). Çözüm statik alanlara açıkça bağlamak
    // (tools/eslint-local-rules/no-hardcoded-path.test.mjs).

    projects: [
      {
        test: {
          name: 'shared',
          root: './packages/shared',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'engine',
          root: './packages/engine',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'db',
          root: './packages/db',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'ui',
          root: './packages/ui',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'api',
          root: './apps/api',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'worker',
          root: './apps/worker',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'web',
          root: './apps/web',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'data-cli',
          root: './tools/data-cli',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        // Yerel ESLint kurallarının kendi testleri.
        test: {
          name: 'eslint-rules',
          root: './tools/eslint-local-rules',
          environment: 'node',
          include: ['*.test.mjs'],
        },
      },
      {
        // Mimari denetim aracının kendi testleri.
        test: {
          name: 'arch-check',
          root: './tools/arch-check',
          environment: 'node',
          include: ['*.test.mjs'],
        },
      },
    ],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',

      // ── ZORUNLU ── Test edilmemiş dosyalar da rapora girsin.
      include: ['packages/*/src/**/*.ts', 'apps/*/src/**/*.ts', 'tools/*/src/**/*.ts'],

      exclude: [
        '**/*.test.ts',
        '**/*.d.ts',
        '**/dist/**',
        '**/node_modules/**',
        // DİKKAT: `**/src/index.ts` buradan HARİÇ TUTULMAZ.
        // İlk denemede "sadece yeniden dışa aktarım yapıyor" gerekçesiyle
        // dışlanmıştı; sonuç, kapsam raporunda yalnızca test edilmiş iki
        // dosyanın görünmesi ve `include` ayarının hiçbir şey kanıtlamaması
        // oldu — kaldırmak istediğimiz yalanın aynısı. Bir giriş dosyası
        // ileride mantık kazanırsa kapsam onu da görmelidir.
      ],

      thresholds: {
        // K10 — global taban
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,

        // K10 + K3 — motor ve kural motorları daha yüksek eşikte
        'packages/engine/**': {
          lines: 85,
          functions: 85,
          branches: 85,
          statements: 85,
        },
      },
    },
  },
});
