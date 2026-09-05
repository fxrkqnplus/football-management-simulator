import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const fromRoot = (relative: string): string => fileURLToPath(new URL(relative, import.meta.url));

/**
 * ⚠️ BORÇ-011'İN ÇÖZÜMÜ — birim testler KAYNAĞI ölçer, `dist`i değil.
 *
 * **Borç neydi (6.3'te mutasyonla bulundu):** `apps/web/src/app/fonts.test.ts`
 * `@fms/ui`yi paketin `exports` haritasından, yani `packages/ui/dist/index.js`
 * üzerinden çözüyordu. Kaynakta bir kod noktası bozuldu → `pnpm test`
 * **138/138 geçti**; `pnpm build` koşturulunca **aynı mutasyon 4 testi kırdı**.
 * Yani paketler arası her test **bayat** kod ölçebiliyordu. Kök `test` betiği
 * düz `vitest run` ve `turbo.json`da bir `test` görevi **yok** — hiçbir yerde
 * `^build` bağımlılığı yoktu.
 *
 * **İki aday vardı ve seçim gerekçeli:**
 *   ② `pnpm test` önce `pnpm build` koşsun — kök nedeni **çözmez**, her koşuya
 *      bir derleme ekleyerek üstünü örter ve testleri hâlâ bir artefakta bağlar.
 *   ③ `resolve.alias` ← **SEÇİLEN**. Sınıfı **ortadan kaldırır**: birim testler
 *      kaynağı okur, bayatlayacak bir ara ürün kalmaz.
 *
 * **Neden ③ doğru olan:** bir birim testinin ölçmesi gereken şey **kaynak**.
 * `dist`in ve `exports` haritasının doğruluğu **ayrı bir sorudur** ve onu ölçen
 * kapılar zaten var — `pnpm build` ve imaj duman testi. 6.3b bunu kanıtladı:
 * `@fms/ui` `apps/web/Dockerfile`da hiç derlenmiyordu ve hatayı **imaj
 * derlemesi** yakaladı, birim testler değil.
 *
 * ⚠️ **ALIAS PROJE BAŞINA VERİLİYOR, KÖKTE DEĞİL — ÖLÇÜLDÜ.** İlk yazımda
 * `defineConfig({ resolve: { alias } })` kökte duruyordu ve mutasyon **hâlâ
 * hiçbir şeyi kırmadı**: Vitest 4'ün `projects` girdileri ayrı Vite
 * yapılandırmaları ve kök `resolve`u **devralmıyorlar**. Yani yazılmış ama
 * hiçbir şey yapmayan bir ayardı — bu projenin en pahalı hata sınıfı
 * (`pnpm-workspace.yaml`'ın `ignoredBuiltDependencies` tuzağıyla aynı).
 *
 * ⚠️ **`vitest.integration.config.ts` BU ALIASI ALMIYOR ve bu bilinçli:**
 * entegrasyon testleri `dist` üzerinden çözmeyi **bilerek** yapıyor (CI'da
 * *"testler dist üzerinden çözüyor"* adımı). İki sorunun iki ayrı cevabı.
 */
const workspaceSourceAlias = [
  // Alt yol ÖNCE gelmeli: `@fms/shared` deseni `@fms/shared/server`i de yakalar
  // ve sıra ters olsaydı alt yol `src/index.ts`e düşerdi.
  { find: '@fms/shared/server', replacement: fromRoot('./packages/shared/src/server/index.ts') },
  { find: '@fms/shared', replacement: fromRoot('./packages/shared/src/index.ts') },
  { find: '@fms/ui', replacement: fromRoot('./packages/ui/src/index.ts') },
  { find: '@fms/db', replacement: fromRoot('./packages/db/src/index.ts') },
  { find: '@fms/engine', replacement: fromRoot('./packages/engine/src/index.ts') },
];

/** Her TypeScript projesine verilen ortak çözümleme. */
const sourceResolve = { alias: workspaceSourceAlias };

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
 *
 * ⚠️ ORTAM AYRIMI (Faz 2.0b).
 * Yalnızca `web` ve `ui` DOM ortamında koşar. `engine`, `api`, `worker`,
 * `shared`, `db`, `data-cli` **node** ortamında kalır ve bu bilinçlidir:
 * motoru DOM'a sokmak K3 saflığını bulandırır (motor tarayıcı varsaymamalı)
 * ve her test dosyası için gereksiz bir jsdom örneği kurulur.
 * Ayrım `packages/engine/src/no-dom.test.ts` ile kalıcı olarak sınanır —
 * biri motoru DOM ortamına taşırsa o test kırılır.
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
        resolve: sourceResolve,
        test: {
          name: 'shared',
          root: './packages/shared',
          environment: 'node',
          include: ['src/**/*.test.{ts,tsx}'],
        },
      },
      {
        resolve: sourceResolve,
        test: {
          name: 'engine',
          root: './packages/engine',
          environment: 'node',
          include: ['src/**/*.test.{ts,tsx}'],
        },
      },
      {
        resolve: sourceResolve,
        test: {
          name: 'db',
          root: './packages/db',
          environment: 'node',
          include: ['src/**/*.test.{ts,tsx}'],
        },
      },
      {
        resolve: sourceResolve,
        test: {
          name: 'ui',
          root: './packages/ui',
          // DOM — tasarım sistemi paketi. Faz 2.0b'de henüz testi YOK; ortam
          // burada şimdiden bildirildi çünkü Faz 6'da yüzlerce bileşen testi
          // buraya gelecek ve o gün "neden web'de var ui'da yok" sorusu
          // sorulmasın. Testsiz bir proje ortamı bedava.
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          // ⚠️ `css: true` — 6.3'te ÖLÇÜMLE eklendi, tercihle değil.
          //
          // Üretilmiş `tokens.generated.css`in tazeliğini sınayan test dosyayı
          // Vite'ın `?raw` içe aktarımıyla okuyor (`node:fs` kullanmıyor, çünkü
          // bu paketin `types: []` kararı K1'in ilk savunma hattı ve bir test
          // rahatlığı için açılmaz).
          //
          // Vitest'in varsayılanı `css: false` ve o kip CSS kimliklerini `?raw`
          // dahil kesiyor: içe aktarım hata vermiyor, **BOŞ DİZE** dönüyor.
          // Ölçüldü — `typeof` `string`, `length` **0**. Yani nöbetçi sessizce
          // hiçbir şeye bakmayan bir kapıya dönüşüyordu (D2 + "falsy bir değer
          // «özellik yok» anlamına da gelebilir"). `true` ile içerik geliyor.
          css: true,
        },
      },
      {
        resolve: sourceResolve,
        test: {
          name: 'api',
          root: './apps/api',
          environment: 'node',
          include: ['src/**/*.test.{ts,tsx}'],
        },
      },
      {
        resolve: sourceResolve,
        test: {
          name: 'worker',
          root: './apps/worker',
          environment: 'node',
          include: ['src/**/*.test.{ts,tsx}'],
        },
      },
      {
        /**
         * ⚠️ `define` — derleme zamanı sabitleri testlerde de gerekli.
         *
         * `vite.config.ts` bunları üretim paketine gömüyor; Vitest o
         * yapılandırmayı kullanmadığı için burada ayrıca verilmesi gerekiyor.
         * Aksi hâlde `ErrorBoundary` render edilen HER test
         * `ReferenceError: __FMS_DEV__ is not defined` ile kırılır — ve bu
         * `App.test.tsx`/`main.test.tsx` dahil, çünkü 2.6'dan sonra sınır
         * ağacın içinde.
         *
         * `true` seçildi: testler geliştirme davranışını (yığın izi görünür)
         * sınıyor. **Üretimdeki YOKLUĞU burada sahtelenerek kanıtlanamaz** —
         * değer derlemeye gömülü olduğu için sahtelemek yalnızca testi yeşile
         * boyardı. Gerçek kanıt üretim paketinde dize taramasıyla alınıyor
         * (2.6 duman testi).
         *
         * Yalnızca `__FMS_DEV__` burada: diğer sabitleri
         * (`__FMS_BASE_PATH__`, `__FMS_SENTRY_*`) ilgili testler `vi.stubGlobal`
         * ile **senaryo başına** veriyor, çünkü değerleri testten teste değişiyor.
         */
        define: {
          __FMS_DEV__: 'true',
        },
        resolve: sourceResolve,
        test: {
          name: 'web',
          root: './apps/web',
          // DOM — React bileşenleri. jsdom seçildi, happy-dom değil: gerekçe
          // ve geri dönüş maliyeti docs/DEPENDENCY-WATCH.md'de.
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          // `globals` KAPALI olduğu için React Testing Library'nin kendi
          // otomatik temizliği DEVREYE GİRMEZ — RTL onu global bir afterEach
          // kaydederek yapar. Temizlik yapılmazsa bir testin DOM'u diğerine
          // sızar ve `getByTestId` "found multiple elements" der. Bu yüzden
          // cleanup açıkça bu setup dosyasında çağrılır.
          setupFiles: ['./vitest.setup.ts'],
        },
      },
      {
        resolve: sourceResolve,
        test: {
          name: 'data-cli',
          root: './tools/data-cli',
          environment: 'node',
          include: ['src/**/*.test.{ts,tsx}'],
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
      {
        // `PreToolUse` kancasının kendi testleri (Faz 4.6).
        //
        // ⚠️ Testlerin bir kısmı kancayı ALT SÜREÇ olarak çalıştırıyor
        // (`stdin`de JSON, çıkış kodu okunuyor) — birim testi kablolamayı
        // kanıtlamaz (Faz 2.3b). Alt süreç başlatma varsayılan 5 sn'ye
        // sığıyor, ayrı bir `testTimeout` gerekmedi (ölçüldü).
        test: {
          name: 'bash-text-guard',
          root: './tools/bash-text-guard',
          environment: 'node',
          include: ['*.test.mjs'],
        },
      },
      {
        // TERİM SÖZLÜĞÜ NÖBETÇİSİ (5.7). Kabul kriteri 5 burada yaşıyor —
        // sayı prose'da değil, `docs/glossary.md`yi AYRIŞTIRAN bir testte.
        //
        // ⚠️ Ayrı bir `pnpm glossary:check` komutu ve CI adımı BİLEREK YOK:
        // kriter *"sayı bir testle iddia edilir"* diyor ve `pnpm test` zaten
        // CI'da koşuyor. Onuncu bir CI adımı eklemek kapsam genişletmek olurdu
        // (K12) ve hiçbir şey kazandırmazdı.
        test: {
          name: 'glossary-check',
          root: './tools/glossary-check',
          environment: 'node',
          include: ['*.test.mjs'],
        },
      },
      {
        // ÇEVİRİ KAYNAĞI KAPISI (5.6). Üç katman: saf çözümleme · sahte bir
        // depoda NEGATİF testler (CLI alt süreç olarak, çıkış kodu okunuyor) ·
        // `ci.yml`in bu kapıyı gerçekten koşturduğunu iddia eden KANARYA.
        test: {
          name: 'i18n-check',
          root: './tools/i18n-check',
          environment: 'node',
          include: ['*.test.mjs'],
        },
      },
      {
        // KÜTÜK KAPILARI VE ENVANTER NÖBETÇİLERİ (6.4-ön).
        //
        // ⚠️ `scripts/` 6.4-ön'e kadar **hiç test projesi değildi** ve bunun
        // ölçülmüş bedeli vardı: 4.11'in yazdığı `check-gap-coverage.mjs` —
        // deponun bayrak kapısı — **sıfır teste** sahipti. Ortak çekirdek
        // (`lib/ledger-coverage.mjs`) buraya çıkarılınca ikisi birden kapsandı.
        //
        // ⚠️ `coverage.include` `scripts/`i saymıyor (desen `*/src/**`), yani
        // bu proje kapsam paydasını DEĞİŞTİRMİYOR — ölçüldü, 6.4-ön'de pay ve
        // payda sabit kaldı. Bu bir kaçamak değil, var olan desenin sonucu;
        // yazılı olmasının sebebi bir sonraki okuyucunun bunu bir dışlama
        // sanmaması.
        test: {
          name: 'scripts',
          root: './scripts',
          environment: 'node',
          include: ['**/*.test.mjs'],
        },
      },
      // ⚠️ `i18n-inventory` PROJESİ 5.5'TE KALDIRILDI — araç emekli edildi.
      // 5.4'ün ihlal envanteri (`tools/i18n-inventory/`) ROADMAP'in kendi
      // ifadesiyle *"kuralın prototipi"*ydi ve 5.5'te yerini gerçek kapıya
      // (`local/no-bare-jsx-text`, `pnpm lint` içinde) bıraktı. Aynı işi yapan
      // iki kod yolu bir gün ayrışır. Emeklilikten ÖNCE anlaşma ölçüldü:
      // 5.4 öncesi dört dosya üzerinde iki uygulama da **33** ihlal buldu,
      // dosya dosya aynı. Aracın sabitlediği negatif anlamlar kuralın kendi
      // `valid[]` listesine taşındı.
    ],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',

      // ── ZORUNLU ── Test edilmemiş dosyalar da rapora girsin.
      //
      // ⚠️ UZANTI LİSTESİ EKSİK BIRAKILMAZ (Faz 2.0 düzeltmesi).
      // İlk yazımda desen yalnızca `*.ts` idi. `apps/web/src/App.tsx` ve
      // `main.tsx` kapsam raporuna HİÇ girmiyordu: rapor 13 dosya sayarken
      // diskte 15 vardı. Faz 1'de bu iki dosya, Faz 6'da yüzlerce bileşen
      // demek — yani `coverage.include` yazılmış olmasına rağmen eşik gene
      // sessizce yalan söyleyecekti. Kapsam kapısının kör noktası dosyanın
      // olmaması değil, UZANTININ desende olmamasıydı.
      // Negatif test (2.0): `.tsx` eklendiğinde test edilmemiş iki dosya
      // rapora girdi ve yüzde düştü — desen gerçekten ısırıyor.
      include: [
        'packages/*/src/**/*.{ts,tsx,mts,cts}',
        'apps/*/src/**/*.{ts,tsx,mts,cts}',
        'tools/*/src/**/*.{ts,tsx,mts,cts}',
      ],

      exclude: [
        '**/*.test.{ts,tsx,mts,cts}',
        // ⚠️ `.test-d.ts` AYRI BİR DESEN — yukarıdaki `*.test.*` onunla EŞLEŞMEZ.
        // Faz 3.3'te ölçüldü: iki tip-seviyesi kontrol deneyi kapsam paydasına
        // %0 ile girdi ve global kapsamı **%89,75 → %87,20** düşürdü. Bunlar
        // ürün kodu değil, `@ts-expect-error` iddiaları — çalışma zamanında
        // koşacak bir satırları yok, dolayısıyla "kapsanmamış" olmaları anlamsız.
        // Paydaya girmeleri, eşiği YANLIŞ YÖNDE bozar (SAPMA-007'nin tersi:
        // orada ürün kodu paydadan düşüyordu, burada ürün olmayan giriyor).
        '**/*.test-d.ts',
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
