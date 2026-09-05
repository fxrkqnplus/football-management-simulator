/**
 * KÜTÜK ↔ ROADMAP TUTARLILIK ÇEKİRDEĞİ — Faz 6.4-ön.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN ORTAK BİR ÇEKİRDEK, İKİ AYRI BETİK DEĞİL
 * ────────────────────────────────────────────────────────────────────────────
 *
 * 4.11 `docs/SPEC-COVERAGE-GAPS.md` için bir tutarlılık kapısı yazdı
 * (`check-gap-coverage.mjs`). 6.4-ön aynı kapıyı **teknik borç kütüğü** için
 * de istedi ve ölçüm gerekçeyi doğruladı: altı açık BORÇ satırının **beşi**
 * (001 · 002 · 004 · 006 · 007) vade fazının ROADMAP bölümünde **hiç
 * geçmiyordu** — yani kütüğe kayıt yine iş üretmiyordu.
 *
 * Kopyalamak yerine çekirdek ayrıldı çünkü iki kontrolün AYRIŞACAK yarısı
 * ortak olan yarısıdır: ROADMAP'i `## FAZ N` başlıklarından dilimleme, kaçışlı
 * boru işaretine dayanan hücre bölme, üstü çizili atamaları eleme ve raporun
 * biçimi. Bunlar tek yerde durur; **kütüğe özgü** olan (hangi dosya, hangi
 * sütun, kapanış kelimesi, faz ataması nasıl yazılıyor) her giriş betiğinin
 * kendi sözleşmesidir.
 *
 * ⚠️ `check-gap-coverage.mjs`in çıktısı bu ayrıştırmadan sonra **bayt bayt
 * aynı** kalacak biçimde taşındı; 6.4-ön bunu md5 ile doğruladı.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * KONTROLÜN KAPSAMI — sessizce daralmasın diye yazılı
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Denetlenen: bir kütükteki **açık** her satırın kimliği, vade/hedef fazının
 * `## FAZ N` bölüm gövdesinde **düz metin olarak** geçiyor mu.
 * Denetlenmeyen: satırın o fazda gerçekten YAPILABİLİR olduğu (bu bir insan
 * kararıdır), kapalı satırların doğruluğu, fazın alt görev listesi.
 *
 * Bir satırdan hiçbir faz çıkarılamazsa ya da satır beklenen sütun sayısını
 * taşımıyorsa çekirdek **kırılır** — sessizce atlamaz. Bakacak bir şey
 * bulamayan bir kontrol bir onay değildir (SAPMA-024).
 */
import { readFileSync } from 'node:fs';

/**
 * Markdown satırını hücrelere böler.
 *
 * ⚠️ **KAÇIŞLI BORU İŞARETİ VAR ve ilk yazımda satırı kaydırdı** (4.11).
 * `SPEC-COVERAGE-GAPS` G-06'nın hücresi bir spec alıntısı taşıyor:
 * `` `Sentry \| 5.000 olay/ay \| 4.000` ``. Düz bir `split('|')` o satırı fazladan
 * hücreye böler ve hedef sütunu **bir başkasının içeriğini** gösterir.
 */
export function splitRow(rest) {
  return rest.split(/(?<!\\)\|/).map((cell) => cell.trim());
}

/** Üstü çizili (`~~…~~`) metni eler — geri alınmış atamalar sayılmasın diye. */
export function stripStruckThrough(text) {
  return text.replaceAll(/~~.*?~~/g, '');
}

/** ROADMAP'i `## FAZ N — …` başlıklarından dilimler. */
export function roadmapSections(roadmapFile) {
  const lines = readFileSync(roadmapFile, 'utf8').replaceAll('\r\n', '\n').split('\n');
  const sections = new Map();
  let current = null;

  for (const line of lines) {
    const heading = /^##\s+FAZ\s+(\d+)\b/.exec(line);
    if (heading !== null) {
      current = Number(heading[1]);
      sections.set(current, []);
      continue;
    }
    if (current !== null) sections.get(current).push(line);
  }

  return new Map([...sections].map(([phase, body]) => [phase, body.join('\n')]));
}

/**
 * Bir kütüğün satırlarını ayrıştırır.
 *
 * @param {object} spec
 * @param {string} spec.file          Kütük dosyasının yolu.
 * @param {RegExp} spec.rowPattern    `^| <ID> | …` — ilk yakalama grubu kimlik,
 *                                    ikincisi satırın geri kalanı.
 * @param {number} spec.expectedCells Kimlikten SONRA beklenen hücre sayısı.
 * @returns {{id: string, cells: string[]}[]}
 */
export function parseLedgerRows({ file, rowPattern, expectedCells }) {
  const lines = readFileSync(file, 'utf8').replaceAll('\r\n', '\n').split('\n');
  const rows = [];

  for (const line of lines) {
    const match = new RegExp(rowPattern.source, rowPattern.flags).exec(line);
    if (match === null) continue;

    const cells = splitRow(match[2]);
    if (cells.length !== expectedCells) {
      throw new Error(
        `${match[1]}: satır ${String(expectedCells)} hücre taşımalı, ` +
          `${String(cells.length)} taşıyor — kütük satırı bozuk. ` +
          `Eksik bir sütun, ayrıştırıcıyı sessizce kaydırır.`,
      );
    }

    rows.push({ id: match[1], cells });
  }

  return rows;
}

/**
 * Kütük ↔ ROADMAP tutarlılığını denetler ve raporu yazar.
 *
 * @param {object} spec
 * @param {string}   spec.label        Rapor başlığı.
 * @param {string}   spec.rowNoun      "G satırı" / "BORÇ satırı".
 * @param {string}   spec.roadmapFile
 * @param {{id: string, cells: string[]}[]} spec.rows
 * @param {(row: {id: string, cells: string[]}) => boolean} spec.isClosed
 * @param {(row: {id: string, cells: string[]}) => number[]} spec.targetPhases
 * @param {NodeJS.WritableStream} [spec.out]
 * @returns {number} çıkış kodu (0 temiz, 1 uyumsuzluk)
 */
export function runCoverageCheck({
  label,
  rowNoun,
  roadmapFile,
  rows,
  isClosed,
  targetPhases,
  out = process.stdout,
}) {
  if (rows.length === 0) {
    throw new Error(`${label}: kütükte hiç satır bulunamadı — tarayıcı kör.`);
  }

  const sections = roadmapSections(roadmapFile);
  const skipped = [];
  const checked = [];
  const mismatches = [];

  for (const row of rows) {
    if (isClosed(row)) {
      skipped.push(row.id);
      continue;
    }

    const phases = targetPhases(row);
    const missing = phases.filter((phase) => {
      const body = sections.get(phase);
      if (body === undefined) {
        throw new Error(`${row.id}: ROADMAP'te "## FAZ ${String(phase)}" bölümü yok.`);
      }
      return !body.includes(row.id);
    });

    checked.push({ id: row.id, phases });
    if (missing.length > 0) mismatches.push({ id: row.id, missing });
  }

  out.write(`${label}\n`);
  out.write(`  kütükteki ${rowNoun} : ${String(rows.length)}\n`);
  out.write(`  atlanan (kapalı)   : ${String(skipped.length)} — ${skipped.join(', ') || '—'}\n`);
  out.write(`  taranan (açık)     : ${String(checked.length)}\n`);

  for (const { id, phases } of checked) {
    const where = phases.map((p) => `Faz ${String(p)}`).join(' + ');
    const verdict = mismatches.some((m) => m.id === id) ? '✗' : '✓';
    out.write(`    ${verdict} ${id} → ${where}\n`);
  }

  if (mismatches.length > 0) {
    out.write(`\n✗ ${String(mismatches.length)} satır hedef fazının kapsamında GEÇMİYOR:\n`);
    for (const { id, missing } of mismatches) {
      out.write(`    ${id} → Faz ${missing.map(String).join(', ')}\n`);
    }
    out.write(`\nSatır o fazın ROADMAP kapsamına ADIYLA yazılmalı (kütüğe kayıt yetmez).\n`);
    return 1;
  }

  out.write(`\n✓ Açık satırların hepsi hedef fazının ROADMAP kapsamında adıyla geçiyor.\n`);
  return 0;
}
