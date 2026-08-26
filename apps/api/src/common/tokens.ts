/**
 * DI belirteçleri — BAŞKA HİÇBİR ŞEY İMPORT ETMEYEN modül.
 *
 * ⚠️ BU DOSYANIN AYRI OLMASI BİR TASARIM ZORUNLULUĞU, DÜZEN TERCİHİ DEĞİL.
 *
 * ÖLÇÜLDÜ (Faz 2.3a): `LOGGER` önce `app.module.ts`'te tanımlıydı ve
 * `correlation.middleware.ts` onu oradan alıyordu. `app.module.ts` de
 * middleware'i import ettiği için **dairesel bağımlılık** oluştu. Belirti
 * yalnızca ÇALIŞMA ZAMANINDA çıktı:
 *
 *     ReferenceError: Cannot access 'LOGGER' before initialization
 *         at __param(0, Inject(LOGGER))
 *
 * Üç kapı da sessiz kaldı: `typecheck` geçti (döngü tip düzeyinde geçerli),
 * `lint` geçti, **birim testleri geçti** (Vitest modül grafiğini farklı
 * sırayla çözüyor). Yakalayan tek şey derlenmiş çıktının gerçekten
 * çalıştırılması oldu — Faz 1 hata #7'nin kuralının ("önce `pnpm build`")
 * neden "ve sonra ÇALIŞTIR" diye uzaması gerektiğinin kanıtı.
 *
 * Dekoratörler bu sınıfı özellikle acımasız yapıyor: `@Inject(LOGGER)` modül
 * gövdesi değerlendirilirken çalışıyor, yani döngü "sonra çözülür" lüksüne
 * sahip değil.
 *
 * KURAL: DI belirteçleri buraya konur ve bu dosya **hiçbir şey import etmez**.
 */

/**
 * `Logger` uygulamasını konteynere bağlar.
 *
 * `Logger` bir **arayüzdür**; çalışma zamanında değeri yok ve
 * `emitDecoratorMetadata` sınıf yazabilir ama arayüz yazamaz. Nest'in tip
 * tabanlı enjeksiyonu bu yüzden onu çözemiyor, dizgi belirteç gerekiyor.
 */
export const LOGGER = 'FMS_LOGGER';
