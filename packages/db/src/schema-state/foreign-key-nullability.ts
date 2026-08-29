/**
 * BİR FK'NIN KAYNAK SÜTUN NULLABILITY'SİNDEN TÜREYEN İKİ AYRI OLGU.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN AYRI BİR MODÜL — iki tüketici, iki SORU, tek tanım
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Faz 4.2'ye kadar bu hesap tek yerde vardı: `er-diagram.ts` mermaid
 * kardinalitesi için `allNotNull` türetiyordu. 4.2 ikinci bir tüketici getirdi —
 * `fk-policy.ts`'in `SET NULL` dalı — ve iki kopya yazmak **kaçınılmaz olarak
 * ayrışırdı**: çok sütunlu bir FK'da *"hepsi mi, herhangi biri mi"* sorusu
 * sessizce iki farklı cevap verir.
 *
 * ⚠️ **AMA ÖLÇÜM ŞUNU GÖSTERDİ: TEK BİR YÜKLEM PAYLAŞMAK YANLIŞ OLURDU.**
 * İki tüketici aynı veriye bakıyor ama **farklı soru** soruyor:
 *
 * | Tüketici | Soru | Doğru yüklem |
 * |---|---|---|
 * | `er-diagram.ts` (kardinalite) | *"Bu ilişki OPSİYONEL mi?"* | **herhangi biri** nullable |
 * | `fk-policy.ts` (`ON DELETE`)  | *"`SET NULL` UYGULANABİLİR mi?"* | **hepsi** nullable |
 *
 * İkincisi PostgreSQL'in kendi kısıtı: `ON DELETE SET NULL` FK'nın **bütün**
 * sütunlarını `NULL` yapar; içlerinden biri `NOT NULL` ise silme çalışma
 * zamanında patlar. Yani karışık bir çok sütunlu FK'da (biri nullable, biri
 * değil) ilişki **opsiyoneldir** ama `SET NULL` **uygulanamaz**.
 *
 * Bu yüzden çözüm *"tek yüklem"* değil, **tek MODÜL + iki ADLANDIRILMIŞ okuma**:
 * ayrım görünür hâle geliyor ve iki kopya doğmuyor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * BUGÜN İKİSİ AYNI CEVABI VERİYOR — ve sabitlemenin en ucuz anı bu
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Ölçüldü (Faz 4.2, `packages/db/drizzle/*.sql`): şemadaki **12 FK'nın 12'si de
 * tek sütunlu**. Tek sütunda `anyNullable === allNullable`, yani ayrım bugün
 * hiçbir fark üretmiyor. Fark üretmediği gün sabitlemek, ilk çok sütunlu FK
 * geldiğinde sessizce yanlış cevap almaktan ucuzdur — birim testi ikisinin
 * **ayrıştığı** vakayı da iddia ediyor.
 */

/** Bir FK'nın kaynak sütunlarının nullability'sinden türeyen iki olgu. */
export interface ForeignKeyNullability {
  /**
   * Kaynak sütunlardan **en az biri** nullable — ilişki opsiyonel.
   * ER kardinalitesinde `zero-or-one` tarafını belirler.
   */
  readonly anyNullable: boolean;
  /**
   * Kaynak sütunların **hepsi** nullable — `ON DELETE SET NULL` uygulanabilir.
   * PostgreSQL bütün sütunları `NULL` yapmak zorunda; biri `NOT NULL` ise
   * silme çalışma zamanında reddedilir.
   */
  readonly allNullable: boolean;
}

/**
 * Kaynak sütunların nullability listesinden iki olguyu türetir.
 *
 * ⚠️ **Boş liste bir olgu değil, bir hatadır.** Sütunsuz bir yabancı anahtar
 * yoktur; boş girdide `[].every()` **`true`**, `[].some()` **`false`** döner ve
 * ikisi birden *"hepsi nullable ama hiçbiri nullable değil"* gibi tutarsız bir
 * cevap üretirdi. Sessizce bir varsayılana düşmek yerine ikisi de `false`
 * dönüyor: `SET NULL` uygulanamaz (güvenli taraf) ve ilişki opsiyonel değil.
 * Çağıran taraf zaten katalogdan okuyor, yani boş liste bir ayrıştırma hatasıdır.
 */
export function foreignKeyNullability(
  sourceColumnNullability: readonly boolean[],
): ForeignKeyNullability {
  if (sourceColumnNullability.length === 0) {
    return { anyNullable: false, allNullable: false };
  }

  return {
    anyNullable: sourceColumnNullability.some((nullable) => nullable),
    allNullable: sourceColumnNullability.every((nullable) => nullable),
  };
}
