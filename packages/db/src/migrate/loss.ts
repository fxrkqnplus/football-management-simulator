/**
 * Geri almanın VERİ KAYBINI ölçen saf katman.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * KARAR (Faz 3.2a): `down` migration BAŞINA "kayıplı mı" ETİKETİ TAŞIMAZ.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * İlk akla gelen tasarım, her `down` dosyasına `-- safety: safe | lossy` gibi bir
 * başlık koyup koşucunun onu okumasıydı. **Elendi**, çünkü sayınca neredeyse her
 * geri alma "lossy" çıkıyor:
 *
 *   CREATE TABLE      ↔ DROP TABLE       → tablodaki her satır gider
 *   ADD COLUMN        ↔ DROP COLUMN      → o sütunun verisi gider
 *   ALTER TYPE (daraltma) ↔ genişletme   → kesilen değer geri gelmez
 *   CREATE INDEX      ↔ DROP INDEX       → gerçekten güvenli
 *   ADD CONSTRAINT    ↔ DROP CONSTRAINT  → gerçekten güvenli
 *
 * Yani etiket pratikte hep `lossy` olur, `--allow-data-loss` her koşuda yazılır ve
 * kapı gürültüye dönüşür. Bu, `docs/spec/09-quality-protocol.md` §11.5'teki
 * *"tüketen kural yazılırken sor: bir yol yanlış tarafa düşerse HANGİ TEST
 * KIRILIR? Cevap 'hiçbiri'yse kural değil temenni yazılmıştır"* uyarısının
 * tam olarak açıkladığı çürüme.
 *
 * **Bunun yerine kayıp ÖLÇÜLÜYOR.** Postgres'te DDL işlemseldir (Faz 3.2a'da
 * ölçüldü): koşucu geri almayı bir işlem içinde uygular, şemanın öncesi ve
 * sonrasını karşılaştırır, kaybolacak tablo/sütunları ve **kaç satırı**
 * etkilediğini sayar; sonra ya `allowDataLoss` verilmiştir ve COMMIT eder, ya da
 * ROLLBACK edip raporla birlikte reddeder.
 *
 * Fark şu: etiket bir **iddiadır** ve yazan kişinin dikkatine bağlıdır; bu
 * **ölçümdür** ve o anki gerçek veriye bakar. Boş bir tabloyu düşüren `down` hiçbir
 * şey kaybetmez ve engellenmemelidir — etiket bunu ayırt edemezdi.
 */

/** Bir tablonun tek bir andaki hâli. */
export interface TableState {
  readonly table: string;
  readonly columns: readonly string[];
  readonly rowCount: number;
}

export type SchemaState = readonly TableState[];

export interface LossItem {
  readonly kind: 'table' | 'column';
  readonly table: string;
  /** Yalnızca `kind === 'column'` iken dolu. */
  readonly column?: string;
  /**
   * Etkilenen satır sayısı — geri alma ÖNCESİNDEKİ sayım.
   *
   * Sütun düşürmede tablonun tamamı sayılır: her satır o hücreyi kaybeder.
   * `NULL` hücreler de sayıya girer, yani bu bir **üst sınırdır** ve bilerek
   * öyledir — kaybı olduğundan az göstermek, çok göstermekten tehlikelidir.
   */
  readonly rowsAtRisk: number;
}

export interface LossReport {
  readonly items: readonly LossItem[];
  readonly totalRowsAtRisk: number;
  /** Şema küçüldü mü — satır sayısından bağımsız. */
  readonly hasStructuralLoss: boolean;
}

/**
 * İki şema durumunu karşılaştırıp kaybı çıkarır.
 *
 * Yalnızca **kaybolanlara** bakar. Geri alma sırasında bir tablo veya sütun
 * *eklenmesi* (örneğin daraltılmış bir tipin geri genişletilmesi) kayıp değildir
 * ve raporlanmaz.
 */
export function computeLoss(before: SchemaState, after: SchemaState): LossReport {
  const afterByTable = new Map(after.map((state) => [state.table, state]));
  const items: LossItem[] = [];

  for (const beforeTable of before) {
    const afterTable = afterByTable.get(beforeTable.table);

    if (afterTable === undefined) {
      items.push({
        kind: 'table',
        table: beforeTable.table,
        rowsAtRisk: beforeTable.rowCount,
      });
      continue;
    }

    const afterColumns = new Set(afterTable.columns);
    for (const column of beforeTable.columns) {
      if (!afterColumns.has(column)) {
        items.push({
          kind: 'column',
          table: beforeTable.table,
          column,
          rowsAtRisk: beforeTable.rowCount,
        });
      }
    }
  }

  return {
    items,
    totalRowsAtRisk: items.reduce((sum, item) => sum + item.rowsAtRisk, 0),
    hasStructuralLoss: items.length > 0,
  };
}

/**
 * Raporu tek satırlık, loga ve hata bağlamına konabilir bir özete indirger.
 *
 * Modül **basmaz** (K8) — dizgeyi döner, çağıran `logger`a verir.
 */
export function summarizeLoss(report: LossReport): string {
  if (report.items.length === 0) return 'yapısal kayıp yok';

  const parts = report.items.map((item) =>
    item.kind === 'table'
      ? `tablo ${item.table} (${String(item.rowsAtRisk)} satır)`
      : `sütun ${item.table}.${item.column ?? '?'} (${String(item.rowsAtRisk)} satır)`,
  );

  return `${parts.join(' · ')} — toplam ${String(report.totalRowsAtRisk)} satır etkileniyor`;
}
