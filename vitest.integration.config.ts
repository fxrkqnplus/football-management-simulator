import { defineConfig } from 'vitest/config';

/**
 * Entegrasyon testleri — AYRI yapılandırma, ayrı komut (`pnpm test:db`).
 *
 * **Neden kök `vitest.config.ts`'e girmiyor:** `testcontainers` ile tek bir
 * Postgres konteyneri **5.592 ms**'de kalkıyor (Faz 3.0'da ölçüldü). Bu dosyalar
 * varsayılan `pnpm test`'e girseydi her kapı koşusu — ki günde onlarca kez
 * koşuluyor — saniyelerden dakikalara çıkardı.
 *
 * ⚠️ **Ayrı komut yazmak YETMEZ, o komutun KOŞULDUĞU yer de yazılmalı.**
 * `docs/spec/09-quality-protocol.md` §11.4 desen envanterine ve §11.5 faz
 * kapanış listesine, ayrıca CI'a ayrı iş olarak eklendi. Bu,
 * `docs/SPEC-COVERAGE-GAPS.md` G-01'in birebir aynı hatası: spec bir kapı
 * tanımlıyordu, hiçbir faz onu kurmuyordu ve kapı yıllarca koşulmadan kalabilirdi.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ ÇOK PROJELİ — Faz 3.8'de tek projeden ikiye çıktı
 * ────────────────────────────────────────────────────────────────────────────
 *
 * 3.7'ye kadar tek bir `root: './packages/db'` vardı. 3.8 seed'i
 * `tools/data-cli`ye yazdı ve onun gerçek veritabanı kanıtı o pakette durmak
 * **zorunda**: testi `packages/db/integration/` altına koymak `arch:check`'i
 * kırıyor — ölçüldü, bir sonda dosyasıyla iki kural birden öttü
 * (`layer-direction`: `packages/db`nin tek izinli bağı `@fms/shared` ·
 * `undeclared-dependency`). Yani bu, konfor değil **yapısal** bir bölünme.
 *
 * **Bedeli:** iki proje iki konteyner kaldırıyor. Süre `pnpm test:db` raporunda
 * ölçülüyor; 3.8'de tek konteynerli koşu ~31 s idi.
 *
 * ⚠️ **Yeni bir paket entegrasyon testi yazdığında buraya SATIR EKLENİR.**
 * Eklenmezse dosya hiçbir yerde koşmaz ve `pnpm test:db` yine "yeşil" der —
 * bakacak bir şey bulamayan bir kapı (SAPMA-024 sınıfı). Bu yer `spec/09`
 * §11.4 desen envanterinde **9. satır** olarak kayıtlı.
 *
 * **Kapsam raporu bilerek YOK.** Bu testler ürün kodunu koşturuyor ama kapsam
 * paydası kök yapılandırmada hesaplanıyor; iki ayrı koşumdan gelen kapsamı
 * birleştirmek, birleştirme doğru yapılmazsa eşiği **şişirir**. Kapsam kapısı
 * tek kaynaktan (kök `vitest.config.ts`) okunur ve bu fazda `packages/db`
 * kapsamı zaten **kanıt sayılmıyor** (ROADMAP Faz 3).
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'db-integration',
          root: './packages/db',
          environment: 'node',
          include: ['integration/**/*.itest.ts'],
          // Konteyner çekme + açılış: ilk koşuda imaj indirilebilir.
          testTimeout: 120_000,
          hookTimeout: 180_000,
          // Konteyner tek ve paylaşılıyor; paralel dosyalar aynı veritabanına girerdi.
          fileParallelism: false,
        },
      },
      {
        test: {
          name: 'data-cli-integration',
          root: './tools/data-cli',
          environment: 'node',
          include: ['integration/**/*.itest.ts'],
          testTimeout: 120_000,
          hookTimeout: 180_000,
          fileParallelism: false,
        },
      },
    ],
  },
});
