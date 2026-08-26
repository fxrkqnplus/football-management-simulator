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
 * `docs/spec/09-quality-protocol.md` §11.5 faz kapanış listesine ve CI'a ayrı iş
 * olarak eklendi. Bu, `docs/SPEC-COVERAGE-GAPS.md` G-01'in birebir aynı hatası:
 * spec bir kapı tanımlıyordu, hiçbir faz onu kurmuyordu ve kapı yıllarca
 * koşulmadan kalabilirdi.
 *
 * **Kapsam raporu bilerek YOK.** Bu testler `packages/db/src` kodunu koşturuyor
 * ama kapsam paydası kök yapılandırmada hesaplanıyor; iki ayrı koşumdan gelen
 * kapsamı birleştirmek, birleştirme doğru yapılmazsa eşiği **şişirir**. Kapsam
 * kapısı tek kaynaktan (kök `vitest.config.ts`) okunur ve bu fazda
 * `packages/db` kapsamı zaten **kanıt sayılmıyor** (ROADMAP Faz 3).
 */
export default defineConfig({
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
});
