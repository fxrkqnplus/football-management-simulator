/**
 * ER DİYAGRAMI — `SchemaFacts`'ten ÜRETİLİR, elle çizilmez.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN ÜRETİLİYOR — ÜÇÜNCÜ BİR TEMSİL AÇMAMAK İÇİN
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Şemanın bugün **iki** temsili var: Drizzle TS tanımları (`src/schema/`) ve
 * migration SQL'i (`drizzle/`). Çalışan veritabanını **yalnızca ikincisi**
 * kuruyor — 3.9'un ölçtüğü ders (`PROJECT_MEMORY.md` günlük #43): TS
 * dosyasındaki bir `onDelete` mutasyonu, katalogdan okuyan hiçbir testi
 * etkilemiyor.
 *
 * Elle çizilmiş bir mermaid **üçüncü** temsil olurdu ve üçüncüsünü hiçbir şey
 * denetlemez. Nöbetçisiz bir belge, bir sonraki şema değişikliğinde sessizce
 * yalan söylemeye başlar — ve yalanın maliyeti burada yüksek: `docs/schema/`
 * altındaki dosya `docs/spec/01-database.md`'den sonra ikinci başvuru yeri.
 *
 * **Bu yüzden diyagramın kaynağı KATALOG.** Girdi `introspectSchema()`'nın
 * gerçek `information_schema` / `pg_catalog` okumasından geliyor; yani
 * diyagramın anlattığı şey, çalışan veritabanının kendisi.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * BU MODÜL SAF — I/O YOK
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Okuma `introspect.ts`'te, karşılaştırma `integration/er-diagram.itest.ts`'te.
 * Buradaki her karar (kardinalite, anahtar işareti, tip adı) bir **türetme**
 * ve birim testiyle sabitleniyor; gerçek bir konteyner açmadan sınanabiliyor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * TÜRETME KURALLARI — hepsi katalogdan, hiçbiri elle liste değil
 * ────────────────────────────────────────────────────────────────────────────
 *
 * **Tip adı:** `information_schema.columns.data_type` küçük harfe indirilip
 * alfanümerik olmayan her dizi `_` yapılıyor, uzunluk varsa sonuna ekleniyor
 * (`character varying` + 3 → `character_varying_3`). ⚠️ Eşleme **tablosu
 * kullanılmadı** bilerek: `timestamp with time zone` → `timestamptz` gibi bir
 * kısaltma listesi, Faz 4 yeni bir tip getirdiğinde güncellenmeyi unutur
 * (günlük #30 ve #36 aynı sınıf) ve unutulduğunda mermaid **sessizce**
 * bozulur. Türetilmiş bir ad uzundur ama her tip için doğrudur.
 *
 * **Anahtar işaretleri:** `PK` birincil anahtardan, `FK` yabancı anahtardan,
 * `UK` **yalnızca tek sütunlu** `UNIQUE` kısıtından. ⚠️ Çok sütunlu bir
 * `UNIQUE` (`club_kits (club_id, kit_type)`) sütun başına `UK` yazılsaydı
 * diyagram *"club_id tek başına benzersiz"* derdi — **yanlış**. O kısıt yorum
 * alanına `uq:club_id+kit_type` olarak yazılıyor.
 *
 * **Kardinalite:**
 *
 *   sol (ebeveyn) : FK sütunlarının hepsi NOT NULL ise `||`, değilse `|o`
 *   sağ (çocuk)   : FK sütunları bir PK/UNIQUE kısıtını TAM kaplıyorsa `o|`
 *                   (1:1), değilse `o{`
 *
 * ⚠️ Sağ taraf her zaman `o` ile başlıyor (*"sıfır veya"*), çünkü katalog bir
 * çocuk satırının **var olma zorunluluğunu** bilmiyor: `clubs`a bağlı bir
 * `club_facilities` satırı olmayabilir ve bunu yasaklayan bir kısıt yok. `|{`
 * yazmak ölçülmemiş bir iddia olurdu (D1).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * MERMAID SÖZDİZİMİ — bilerek DAR bir alt küme
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Yalnızca `erDiagram`ın en eski ve en yaygın desteklenen biçimleri
 * kullanılıyor: sade tanımlayıcı varlık adları, `tip ad ANAHTARLAR "yorum"`
 * biçiminde nitelikler, tırnaklı ilişki etiketleri. Yorum ve etiket metinleri
 * **yalnızca ASCII** — çünkü bu dosyanın çıktısı GitHub'ın mermaid
 * işleyicisinde de render edilecek ve orada bir ayrıştırma hatası **sessiz**
 * değil ama geç görülür.
 */
import { ValidationError } from '@fms/shared';

import { foreignKeyNullability } from './foreign-key-nullability.js';
import type { ColumnFacts, SchemaFacts, TableFacts } from './types.js';

/** Bir diyagramdan sayılan iki olgu — `docs/schema/world.md`'nin sözü. */
export interface ErDiagramCounts {
  /** `ad {` bloğu sayısı = tablo sayısı. */
  readonly entities: number;
  /** `a ||--o{ b : "..."` satırı sayısı = yabancı anahtar sayısı. */
  readonly relationships: number;
}

/** Bir yabancı anahtarın diyagram için gereken kısmı. */
interface ParsedForeignKey {
  readonly name: string;
  readonly sourceTable: string;
  readonly sourceColumns: readonly string[];
  readonly targetTable: string;
}

const PRIMARY_KEY_PATTERN = /^PRIMARY KEY \(([^)]*)\)$/;
const UNIQUE_PATTERN = /^UNIQUE \(([^)]*)\)$/;
const FOREIGN_KEY_PATTERN = /^FOREIGN KEY \(([^)]*)\) REFERENCES ([^ (]+)\(([^)]*)\)/;

/** `a, b` → `['a','b']`. */
function splitColumnList(list: string): readonly string[] {
  return list
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/**
 * `pg_get_constraintdef` çıktısını ayrıştırır — **ayrıştıramazsa fırlatır**.
 *
 * Sessizce atlamak, kısıtı diyagramdan düşürüp hiçbir şey ötmemesi demek
 * olurdu: bakacak bir şey bulamayan bir kapı (SAPMA-024). Beklenmeyen bir
 * biçim, kuralın kendisinin gözden geçirilmesi gereken bir olaydır.
 */
function parseConstraintColumns(definition: string, pattern: RegExp, kind: string): string[] {
  const match = pattern.exec(definition);
  if (match?.[1] === undefined) {
    throw new ValidationError({
      message: `${kind} kısıt tanımı ayrıştırılamadı: ${definition}`,
      code: 'ER_DIAGRAM_CONSTRAINT_UNPARSED',
      context: { kind, definition },
    });
  }
  return [...splitColumnList(match[1])];
}

/** Bir tablonun kısıtlarından diyagramın ihtiyacı olan olguları çıkarır. */
function readTableConstraints(table: TableFacts): {
  primaryKeyColumns: readonly string[];
  singleColumnUniques: ReadonlySet<string>;
  compositeUniques: readonly (readonly string[])[];
  foreignKeys: readonly ParsedForeignKey[];
} {
  let primaryKeyColumns: readonly string[] = [];
  const singleColumnUniques = new Set<string>();
  const compositeUniques: string[][] = [];
  const foreignKeys: ParsedForeignKey[] = [];

  for (const constraint of table.constraints) {
    if (constraint.type === 'p') {
      primaryKeyColumns = parseConstraintColumns(
        constraint.definition,
        PRIMARY_KEY_PATTERN,
        'PRIMARY KEY',
      );
      continue;
    }

    if (constraint.type === 'u') {
      const columns = parseConstraintColumns(constraint.definition, UNIQUE_PATTERN, 'UNIQUE');
      if (columns.length === 1 && columns[0] !== undefined) {
        singleColumnUniques.add(columns[0]);
      } else {
        compositeUniques.push(columns);
      }
      continue;
    }

    if (constraint.type === 'f') {
      const match = FOREIGN_KEY_PATTERN.exec(constraint.definition);
      if (match?.[1] === undefined || match[2] === undefined) {
        throw new ValidationError({
          message: `FOREIGN KEY kısıt tanımı ayrıştırılamadı: ${constraint.definition}`,
          code: 'ER_DIAGRAM_CONSTRAINT_UNPARSED',
          context: { kind: 'FOREIGN KEY', definition: constraint.definition },
        });
      }
      foreignKeys.push({
        name: constraint.name,
        sourceTable: table.name,
        sourceColumns: splitColumnList(match[1]),
        targetTable: match[2],
      });
    }
  }

  return { primaryKeyColumns, singleColumnUniques, compositeUniques, foreignKeys };
}

/**
 * `data_type` + uzunluktan mermaid'in kabul ettiği tek parçalı bir ad türetir.
 * Eşleme tablosu yok — başlıktaki gerekçe.
 */
export function mermaidTypeName(column: ColumnFacts): string {
  const base = column.dataType
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const safeBase = base.length > 0 ? base : 'unknown';
  return column.maxLength === null ? safeBase : `${safeBase}_${column.maxLength}`;
}

/** Bir nitelik satırının anahtar işaretleri — sıra sabit: PK, FK, UK. */
function keyMarkers(
  columnName: string,
  primaryKeyColumns: readonly string[],
  foreignKeyColumns: ReadonlySet<string>,
  singleColumnUniques: ReadonlySet<string>,
): string {
  const markers: string[] = [];
  if (primaryKeyColumns.includes(columnName)) markers.push('PK');
  if (foreignKeyColumns.has(columnName)) markers.push('FK');
  if (singleColumnUniques.has(columnName)) markers.push('UK');
  return markers.join(',');
}

/** Yorum alanı — yalnızca söylenecek bir şey varsa üretilir, ASCII. */
function attributeComment(
  column: ColumnFacts,
  compositeUniques: readonly (readonly string[])[],
): string {
  const notes: string[] = [];
  if (column.nullable) notes.push('null');
  for (const columns of compositeUniques) {
    if (columns.includes(column.name)) notes.push(`uq:${columns.join('+')}`);
  }
  return notes.join(' ');
}

/**
 * Bir yabancı anahtarın mermaid kardinalite işaretini türetir.
 * Kurallar başlıkta; ikisi de katalogdan okunuyor, hiçbiri elle yazılmıyor.
 */
function cardinality(
  foreignKey: ParsedForeignKey,
  sourceColumns: ReadonlyMap<string, ColumnFacts>,
  sourcePrimaryKey: readonly string[],
  sourceSingleUniques: ReadonlySet<string>,
  sourceCompositeUniques: readonly (readonly string[])[],
): string {
  // ⚠️ Nullability TEK BİR YERDE türetiliyor (Faz 4.2): `fk-policy.ts`'in
  // `SET NULL` dalı ikinci bir tüketici getirdi ve iki kopya kaçınılmaz olarak
  // ayrışırdı. Kardinalitenin sorduğu soru *"ilişki opsiyonel mi"* → `anyNullable`;
  // `ON DELETE`in sorduğu *"SET NULL uygulanabilir mi"* → `allNullable`. İkisi
  // AYRI okumalar ve ayrımın kendisi `foreign-key-nullability.test.ts`te sabit.
  // Bilinmeyen bir sütun adı `nullable === false` denetimini geçemiyordu; aynı
  // savunma korunuyor (bilinmeyen sütun → nullable sayılır, ilişki opsiyonel).
  const { anyNullable } = foreignKeyNullability(
    foreignKey.sourceColumns.map((name) => sourceColumns.get(name)?.nullable !== false),
  );
  const allNotNull = !anyNullable;

  const sameColumns = (candidate: readonly string[]): boolean =>
    candidate.length === foreignKey.sourceColumns.length &&
    candidate.every((name) => foreignKey.sourceColumns.includes(name));

  const single = foreignKey.sourceColumns[0];
  const uniqueCovered =
    sameColumns(sourcePrimaryKey) ||
    sourceCompositeUniques.some(sameColumns) ||
    (foreignKey.sourceColumns.length === 1 && single !== undefined
      ? sourceSingleUniques.has(single)
      : false);

  return `${allNotNull ? '||' : '|o'}--${uniqueCovered ? 'o|' : 'o{'}`;
}

/**
 * `SchemaFacts`'ten mermaid `erDiagram` metnini üretir.
 *
 * Çıktı **deterministik**: ilişkiler kısıt adına, varlıklar tablo adına göre
 * sıralanıyor. Sıra girdinin sırasına bırakılsaydı iki koşu arasında ayrışan
 * bir diff üretilir ve nöbetçi testi gürültüye dönerdi.
 */
export function renderErDiagram(facts: SchemaFacts): string {
  const tables = [...facts.tables].sort((left, right) => left.name.localeCompare(right.name, 'en'));
  const parsed = new Map(tables.map((table) => [table.name, readTableConstraints(table)]));

  const lines: string[] = ['erDiagram'];

  const allForeignKeys = tables
    .flatMap((table) => parsed.get(table.name)?.foreignKeys ?? [])
    .sort((left, right) => left.name.localeCompare(right.name, 'en'));

  for (const foreignKey of allForeignKeys) {
    const source = tables.find((table) => table.name === foreignKey.sourceTable);
    const sourceParsed = parsed.get(foreignKey.sourceTable);
    if (source === undefined || sourceParsed === undefined) continue;

    const columnIndex = new Map(source.columns.map((column) => [column.name, column]));
    const symbol = cardinality(
      foreignKey,
      columnIndex,
      sourceParsed.primaryKeyColumns,
      sourceParsed.singleColumnUniques,
      sourceParsed.compositeUniques,
    );
    lines.push(
      `    ${foreignKey.targetTable} ${symbol} ${foreignKey.sourceTable} : "${foreignKey.sourceColumns.join('+')}"`,
    );
  }

  for (const table of tables) {
    const tableParsed = parsed.get(table.name);
    if (tableParsed === undefined) continue;

    const foreignKeyColumns = new Set(
      tableParsed.foreignKeys.flatMap((foreignKey) => [...foreignKey.sourceColumns]),
    );

    lines.push('');
    lines.push(`    ${table.name} {`);
    for (const column of [...table.columns].sort((left, right) => left.position - right.position)) {
      const markers = keyMarkers(
        column.name,
        tableParsed.primaryKeyColumns,
        foreignKeyColumns,
        tableParsed.singleColumnUniques,
      );
      const comment = attributeComment(column, tableParsed.compositeUniques);
      const parts = [mermaidTypeName(column), column.name];
      if (markers.length > 0) parts.push(markers);
      if (comment.length > 0) parts.push(`"${comment}"`);
      lines.push(`        ${parts.join(' ')}`);
    }
    lines.push('    }');
  }

  return lines.join('\n');
}

const MERMAID_FENCE_OPEN = '```mermaid';
const MERMAID_FENCE_CLOSE = '```';

/**
 * Markdown'dan **tek** mermaid bloğunu çıkarır.
 *
 * Sıfır ya da birden fazla blok bulunursa **fırlatır**: ikisi de sessizce
 * yanlış bir şeyi karşılaştırmaya yol açardı (birincisinde boş metin, ikincisinde
 * hangi blok olduğu belirsiz). Belgenin tek diyagram taşıması bir sözleşme.
 */
export function extractMermaidBlock(markdown: string): string {
  const blocks: string[] = [];
  const lines = markdown.split('\n');
  let current: string[] | null = null;

  for (const line of lines) {
    if (current === null) {
      if (line.trim() === MERMAID_FENCE_OPEN) current = [];
      continue;
    }
    if (line.trim() === MERMAID_FENCE_CLOSE) {
      blocks.push(current.join('\n'));
      current = null;
      continue;
    }
    current.push(line);
  }

  if (current !== null) {
    throw new ValidationError({
      message: 'Mermaid bloğu kapatılmamış.',
      code: 'ER_DIAGRAM_BLOCK_UNCLOSED',
      context: { blockCount: blocks.length },
    });
  }

  if (blocks.length !== 1 || blocks[0] === undefined) {
    throw new ValidationError({
      message: `Belgede tam olarak bir mermaid bloğu bekleniyordu, ${String(blocks.length)} bulundu.`,
      code: 'ER_DIAGRAM_BLOCK_COUNT',
      context: { blockCount: blocks.length },
    });
  }

  return blocks[0];
}

const ENTITY_OPEN_PATTERN = /^ {4}[A-Za-z_][A-Za-z0-9_]* \{$/;
const RELATIONSHIP_PATTERN = /^ {4}[A-Za-z_][A-Za-z0-9_]* \|[|o]--o[|{] [A-Za-z_][A-Za-z0-9_]* : "/;

/**
 * Diyagram METNİNDEN tablo ve ilişki sayısını okur.
 *
 * ⚠️ **Bu, `renderErDiagram`ın çıktısını tekrar saymak DEĞİL.** Nöbetçi testi
 * bunu **belgeye yazılmış** metin üzerinde çağırıyor ve sonucu katalogdan
 * okunan gerçek sayılarla karşılaştırıyor. `docs/schema/world.md`'nin 3.1'de
 * verdiği söz aynen buydu: *"tablo/FK sayısı programatik olarak
 * karşılaştırılacak"*.
 *
 * Birebir metin karşılaştırması tek başına yeterli olmazdı: iki taraf da boş
 * olsaydı da geçerdi (kör kontrol sınıfı, `spec/09` §11.5). Sayılar mutlak
 * değerle iddia edildiğinde o kaçış kapanıyor.
 */
export function countErDiagram(diagram: string): ErDiagramCounts {
  let entities = 0;
  let relationships = 0;

  for (const line of diagram.split('\n')) {
    if (ENTITY_OPEN_PATTERN.test(line)) entities += 1;
    else if (RELATIONSHIP_PATTERN.test(line)) relationships += 1;
  }

  return { entities, relationships };
}
