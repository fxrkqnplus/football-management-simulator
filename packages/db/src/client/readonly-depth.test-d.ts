/**
 * ÖLÇÜM — `Readonly<T>` SIĞDIR. Faz 3.3, Faz 12 için kayıt.
 *
 * `docs/spec/01-database.md` §3.4 `WorldView` dönüşlerinin **`DeepReadonly<T>`**
 * olmasını istiyor. `WorldView` Faz 12'de yazılıyor ve burada YAZILMIYOR (K12) —
 * ama o gün karşılaşılacak tuzak bugün ölçülüp sabitleniyor.
 *
 * Aşağıdaki satırlar `@ts-expect-error` taşımıyor: yani **derleniyorlar**, ve
 * derlendikleri için TypeScript'in `Readonly<T>`sinin iç içe yapıyı korumadığını
 * kanıtlıyorlar. Koruma bir gün derinleşirse bu dosya kırılır ve birileri
 * `DeepReadonly`nin geldiğini fark eder.
 *
 * **Faz 3'te neden önemli:** `competitions.rules` bir `jsonb` sütunu olacak (3.4)
 * ve `CompetitionRules` iç içe bir nesne (`squadRegistration`, `continentalSpots`,
 * `transferWindows[]`). `Readonly<Competition>` o iç nesneleri korumaz.
 */
interface NestedRow {
  id: number;
  rules: { maxForeign: number; windows: { start: string }[] };
  tags: string[];
}

declare const row: Readonly<NestedRow>;

// ① Üst seviye KORUNUYOR — bu satır hata veriyor, `@ts-expect-error` gerekli.
// @ts-expect-error `Readonly` üst seviyeyi koruyor.
row.id = 2;

// ② İÇ NESNE KORUNMUYOR — hata YOK, satır derleniyor.
row.rules.maxForeign = 99;

// ③ İÇ DİZİ ELEMANI KORUNMUYOR — hata YOK.
row.rules.windows[0] = { start: '01-01' };

// ④ DİZİNİN KENDİSİ MUTASYONA AÇIK — hata YOK.
row.tags.push('yeni');

export type ReadonlyDepthProbe = typeof row;
