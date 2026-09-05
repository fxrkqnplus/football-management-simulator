/**
 * TEKNİK BORÇ KÜTÜĞÜ ↔ ROADMAP TUTARLILIK KONTROLÜ — Faz 6.4-ön.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN VAR — beş vaka, ve sonuncusunda tuzağa düşen kuralın kendisiydi
 * ────────────────────────────────────────────────────────────────────────────
 *
 * *"Kapsam taşıması kütüğe kayıtla bitmez — hedef fazın kapsamında ADIYLA
 * görünmeli"* kuralı bu depoda beş kez ölçülerek doğdu:
 *
 *   ① 4.11  — BORÇ-003/005 Faz 5'in ROADMAP kapsamında hiç geçmiyordu
 *   ② 5.9   — BORÇ-009/010 Faz 6'nın kapsamında hiç geçmiyordu
 *   ③ 6.0   — `@tanstack/react-table` watch satırı *"Faz 18"* diyordu,
 *             motoru **Faz 6** kuruyordu
 *   ④ 6.1   — Faz 49'un metrik listesi DataTable fps'ini adıyla taşımıyordu
 *   ⑤ 6.3   — 6.2'nin iki kontrast kusuru 6.2'nin **kendi raporunda** kaldı
 *
 * Beşincisinde tuzağa düşen, kuralı yazan alt görevin kendisiydi. Yani
 * disiplin bu sınıfı durduramıyor — koşan bir kontrol gerekiyor. 4.11 aynı
 * kontrolü `docs/SPEC-COVERAGE-GAPS.md` için yazmıştı; **BORÇ ve SAPMA
 * kütükleri kapısızdı.**
 *
 * 6.4-ön'de ölçüldü: altı **açık** BORÇ satırının **beşi** (001 · 002 · 004 ·
 * 006 · 007) vade fazının ROADMAP bölümünde hiç geçmiyordu. Yani kural
 * yazıldıktan sonra bile beş satır sahipsiz duruyordu.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * KÜTÜĞÜN YAZIM DESENİ — ÖLÇÜLDÜ, VARSAYILMADI
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Sütunlar: `ID | Faz | Borç | Neden ertelendi | Ödenmesi gereken faz`
 *
 * ⚠️ **KAPANIŞ İŞARETİ SABİT BİR SÜTUNDA DEĞİL.** 11 satır ölçüldü:
 * `✅ ÖDENDİ` işareti BORÇ-003/005'te **2. sütunda** (Borç), BORÇ-010'da
 * **3.'de** (Neden ertelendi), BORÇ-008/011'de **4.'te** (vade sütunu).
 * `gaps:check`in *"durum sütunu şu kelimeyle BAŞLIYOR mu"* yöntemi burada
 * çalışmaz; bu yüzden kapanış **satırın tamamında** aranıyor. `ÖDENDİ` yüksek
 * sesli ve tek anlamlı bir belirteç — kütüğün kapanış kelimesi.
 *
 * ⚠️ **VADE FAZI HÜCRENİN BAŞINA SABİTLENDİ.** Ölçüm: vade sütunu her açık
 * satırda kalın bir sayıyla **başlıyor** (`**16**`, `**50**`, `**12**`,
 * `**6**`). Hücrenin geri kalanında başka kalın sayılar da geçiyor (BORÇ-011'in
 * hücresinde `**0**` var), yani "hücredeki tüm kalın sayılar" yöntemi
 * **gürültülü**. Ayraç bu yüzden hücrenin BAŞI. `**6.4**` gibi alt görev
 * yazımları destekleniyor; faz numarası tam sayı kısmıdır.
 *
 * ⚠️ **SAPMA KÜTÜĞÜ BU KAPININ DIŞINDA — ve sebebi ölçüldü, tembellik değil.**
 * SAPMA satırlarının sütunları `ID | Tür | Faz | Sapma | Gerekçe |
 * Spec/ROADMAP güncellendi mi`. Bir **vade fazı sütunu YOK** — bir SAPMA bir
 * borç değil, olmuş bitmiş bir kayıttır; "hangi fazda ele alınacak" sorusu
 * onun için tanımsızdır. Denetlenebilir bir hedefi olmadığı için buraya
 * girmiyor; uydurma bir hedef sütunu eklemek SAPMA-026 olurdu.
 */
import { fileURLToPath } from 'node:url';

import { parseLedgerRows, runCoverageCheck, stripStruckThrough } from './lib/ledger-coverage.mjs';

const REPO_ROOT = new URL('../', import.meta.url);
const MEMORY_FILE = fileURLToPath(new URL('PROJECT_MEMORY.md', REPO_ROOT));
const ROADMAP_FILE = fileURLToPath(new URL('docs/ROADMAP.md', REPO_ROOT));

/** `| **BORÇ-011** | … | … | … | … |` — kalın yazılmış kimlikler de yakalanır. */
const DEBT_ROW = /^\|\s*(?:\*\*)?(BORÇ-\d+)(?:\*\*)?\s*\|(.*)\|\s*$/;

/**
 * Kütüğün kapanış kelimesi. Tek eleman ama liste olarak duruyor: yeni bir
 * kapanış kelimesi çıkarsa satır **açık** sayılır, yani hata güvenli yöne
 * düşer (fazladan kontrol, atlanan satır değil).
 */
const PAID_MARKERS = ['ÖDENDİ'];

/** Vade hücresinin BAŞINDAKİ kalın faz/alt görev numarası: `**16**`, `**6.4**`. */
const LEADING_PHASE = /^\*\*(\d+)(?:\.\d+[a-z]?)?\*\*/;

const DUE_COLUMN = 3;

const rows = parseLedgerRows({ file: MEMORY_FILE, rowPattern: DEBT_ROW, expectedCells: 4 });

function isClosed(row) {
  return row.cells.some((cell) => PAID_MARKERS.some((marker) => cell.includes(marker)));
}

function targetPhases(row) {
  const due = stripStruckThrough(row.cells[DUE_COLUMN]).trim();
  const match = LEADING_PHASE.exec(due);

  if (match === null) {
    throw new Error(
      `${row.id}: "Ödenmesi gereken faz" sütunu kalın bir faz numarasıyla BAŞLAMIYOR. ` +
        `Sütun: ${due.slice(0, 120)}`,
    );
  }

  return [Number(match[1])];
}

process.exitCode = runCoverageCheck({
  label: 'TEKNİK BORÇ ↔ ROADMAP tutarlılık kontrolü',
  rowNoun: 'BORÇ satırı',
  roadmapFile: ROADMAP_FILE,
  rows,
  isClosed,
  targetPhases,
});
