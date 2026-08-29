/**
 * @fms/data-cli — Veri ingest ve doğrulama aracı.
 *
 * Faz 1'de bilerek boştu (`export {}`); ilk gerçek içerik **Faz 3.8**'in seed
 * hattı. Geri kalanı Faz 7 (DataProvider) ile gelecek.
 *
 * ⚠️ **Bu dosyanın boş olması bir kapsam iddiasını SINANMAMIŞ bırakmıştı.**
 * `docs/spec/09` §11.4 *"`tools/` kapsam eşiğine dahil değildir"* diyordu; ölçüm
 * bunu çürüttü — `vitest.config.ts` `coverage.include` üçüncü deseni
 * `tools` altındaki her paketin `src` ağacını topluyor ve bu dosya kapsam
 * raporunda **zaten vardı**, yalnızca girdisi
 * `0/0` olduğu için kimse fark etmemişti. Bakacak bir şey bulamayan bir kapı
 * "temiz" diyordu (SAPMA-024'ün kardeşi). Kayıt: **SAPMA-027**.
 */
export * from './seed/index.js';
