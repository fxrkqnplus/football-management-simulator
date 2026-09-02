/**
 * `SPEC-COVERAGE-GAPS` ↔ ROADMAP TUTARLILIK KONTROLÜ — Faz 4.11.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN BİR BETİK, YALNIZCA BİR TALİMAT DEĞİL
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Kural 4.0'da ölçülerek doğdu: `docs/SPEC-COVERAGE-GAPS.md`'nin **hiçbir
 * okuyucusu yoktu** ve yedi satır atandıkları fazın ROADMAP kapsamında hiç
 * görünmüyordu. Çare *"faz kapanışında kontrol edilir"* diye ROADMAP'e yazıldı.
 *
 * ⚠️ **VE O TALİMATIN KENDİSİ BAYATLADI — 4.11'de ölçüldü.** Metin
 * *"(bugün G-01…G-16)"* ve *"kapatılmış satırları da (G-03, G-08) listeler ama
 * atlar"* diyordu; gerçekte **G-20**'ye kadar satır vardı ve kapalı satırlardan
 * biri (**G-18**) atlama listesinde yoktu. Talimat olduğu gibi uygulansaydı
 * kontrol **yeşil verir ve dört satıra hiç bakmazdı** — D3'ün en saf biçimi,
 * üstelik D3'ü yakalamak için yazılmış bir adımda.
 *
 * Çare bir sayı güncellemesi **değil**: sayı taşıyan her talimat bayatlar.
 * Kontrol artık satırları **kütükten sayıyor**, açık/kapalı ayrımını **satırın
 * kendi durum sütunundan** okuyor ve ROADMAP talimatı hiçbir sayı taşımıyor.
 * *"Bir artefakt üreten yönerge, artefaktın kendisi olmalı — tarifi değil."*
 *
 * ────────────────────────────────────────────────────────────────────────────
 * HEDEF FAZ NASIL ÇIKARILIYOR — ve neden bu ayraç
 * ────────────────────────────────────────────────────────────────────────────
 *
 * *"Hangi faza ait olmalı"* sütunu iki farklı şey içeriyor: **atama** ve
 * **bağlam**. Örnek (G-10): *"**Faz 11** (`pnpm validate:world`) — veri
 * doğrulayıcısının doğal işi; Faz 8 ingest'i o kuralın ilk müşterisi."* Burada
 * atanan faz **11**; Faz 8 yalnızca anılıyor.
 *
 * Ayraç **kalın yazım**: kütükte her atama `**Faz N**` biçiminde, her bağlam
 * atıfı düz metin. Bu bir varsayım değil, dosyanın ölçülmüş yazım deseni —
 * ve yanlış çıkarım **sessiz kalmasın** diye betik her satır için çıkardığı
 * fazları **basıyor**. Üstü çizili atamalar (`~~**Faz 8**~~`, G-18'de geri
 * alınan atama) bilerek dışlanıyor.
 *
 * Bir satırdan hiçbir faz çıkarılamazsa betik **kırılıyor** — sessizce
 * atlamıyor. Bakacak bir şey bulamayan bir kontrol bir onay değildir.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = new URL('../', import.meta.url);
const GAPS_FILE = fileURLToPath(new URL('docs/SPEC-COVERAGE-GAPS.md', REPO_ROOT));
const ROADMAP_FILE = fileURLToPath(new URL('docs/ROADMAP.md', REPO_ROOT));

/**
 * Durum sütunu bu belirteçlerden biriyle başlıyorsa satır **kapalıdır**.
 *
 * ⚠️ Liste elle yazılı ama bir **envanter değil, bir sözlük**: kütüğün kapanış
 * dili. Yeni bir kapanış kelimesi kullanılırsa satır açık sayılır, yani hata
 * **güvenli** yöne düşer (fazladan kontrol, atlanan satır değil). Tersi
 * tehlikeli olurdu.
 *
 * ℹ️ G-11'in durumu *"DARALDI — kapanmadı"* diyor ve satır **açık** kalmalı;
 * bu yüzden eşleşme baştan yapılıyor, metnin içinde aranmıyor.
 */
const CLOSED_MARKERS = ['KAPANDI', 'ÇÖZÜLDÜ'];

/** `| G-07 | … | … | … | … |` — yalnızca ilk hücresi bir G kimliği olan satırlar. */
const GAP_ROW = /^\|\s*(?:\*\*)?(G-\d+)(?:\*\*)?\s*\|(.*)\|\s*$/;

/** Kalın ve üstü çizili OLMAYAN faz ataması: `**Faz 12**`, `**Faz 4.5**`. */
const BOLD_PHASE = /\*\*Faz\s+(\d+)(?:\.\d+)?\*\*/g;

/**
 * Satırı hücrelere böler.
 *
 * ⚠️ **KAÇIŞLI BORU İŞARETİ VAR ve ilk yazımda satırı kaydırdı.** G-06'nın
 * *"Ne istiyor"* hücresi bir spec alıntısı taşıyor: `` `Sentry \| 5.000
 * olay/ay \| 4.000` ``. Düz bir `split('|')` o satırı altı hücreye bölüyor ve
 * *"Hangi faza ait olmalı"* sütunu **bir başkasının içeriğini** gösteriyordu.
 * Betik bunu sessizce geçmedi — atama çıkaramayınca kırıldı (tasarım gereği).
 */
function splitRow(rest) {
  return rest.split(/(?<!\\)\|/).map((cell) => cell.trim());
}

function stripStruckThrough(text) {
  return text.replaceAll(/~~.*?~~/g, '');
}

function parseGapRows() {
  const lines = readFileSync(GAPS_FILE, 'utf8').replaceAll('\r\n', '\n').split('\n');
  const rows = [];

  for (const line of lines) {
    const match = GAP_ROW.exec(line);
    if (match === null) continue;

    const cells = splitRow(match[2]);
    if (cells.length < 4) {
      throw new Error(`${match[1]}: satır beklenen sütun sayısını taşımıyor (${cells.length})`);
    }

    // Sütunlar: 1 Spec referansı · 2 Ne istiyor · 3 Hangi faza ait olmalı · 4 Durum
    rows.push({ id: match[1], target: cells[2], status: cells[3] });
  }

  return rows;
}

function isClosed(status) {
  const plain = status.replaceAll('*', '').replaceAll('✅', '').trim();
  return CLOSED_MARKERS.some((marker) => plain.startsWith(marker));
}

function targetPhases(row) {
  const phases = [
    ...new Set([...stripStruckThrough(row.target).matchAll(BOLD_PHASE)].map((m) => Number(m[1]))),
  ];

  if (phases.length === 0) {
    throw new Error(
      `${row.id}: "Hangi faza ait olmalı" sütunundan hiçbir **Faz N** ataması çıkarılamadı. ` +
        `Sütun: ${row.target.slice(0, 120)}`,
    );
  }

  return phases.sort((a, b) => a - b);
}

/** ROADMAP'i `## FAZ N — …` başlıklarından dilimler. */
function roadmapSections() {
  const lines = readFileSync(ROADMAP_FILE, 'utf8').replaceAll('\r\n', '\n').split('\n');
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

const rows = parseGapRows();
if (rows.length === 0) {
  throw new Error('`docs/SPEC-COVERAGE-GAPS.md` içinde hiç G satırı bulunamadı — tarayıcı kör.');
}

const sections = roadmapSections();
const skipped = [];
const checked = [];
const mismatches = [];

for (const row of rows) {
  if (isClosed(row.status)) {
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

const out = process.stdout;
out.write(`SPEC-COVERAGE-GAPS ↔ ROADMAP tutarlılık kontrolü\n`);
out.write(`  kütükteki G satırı : ${String(rows.length)}\n`);
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
  process.exitCode = 1;
} else {
  out.write(`\n✓ Açık satırların hepsi hedef fazının ROADMAP kapsamında adıyla geçiyor.\n`);
}
