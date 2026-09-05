/**
 * `SPEC-COVERAGE-GAPS` ↔ ROADMAP TUTARLILIK KONTROLÜ — Faz 4.11.
 *
 * ⚠️ **ÇEKİRDEK 6.4-ön'DE `scripts/lib/ledger-coverage.mjs`e TAŞINDI.**
 * Sebep: aynı kontrol **teknik borç kütüğü** için de gerekti ve iki uygulama
 * bir gün ayrışır. Ayrışacak yarı ortak olan yarıdır (ROADMAP dilimleme,
 * kaçışlı boru işaretine dayanan hücre bölme, rapor biçimi); kütüğe özgü olan
 * (dosya, sütun sırası, kapanış kelimesi, faz yazımı) burada kalır.
 * Taşıma sırasında çıktı **bayt bayt aynı** tutuldu (md5 ile doğrulandı) ve
 * satır şekli kontrolü `< 4`ten `!== 4`e **sıkılaştırıldı**: fazladan bir
 * hücre de sütunları kaydırır, eksik olan kadar tehlikelidir.
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
import { fileURLToPath } from 'node:url';

import { parseLedgerRows, runCoverageCheck, stripStruckThrough } from './lib/ledger-coverage.mjs';

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

// Sütunlar: 1 Spec referansı · 2 Ne istiyor · 3 Hangi faza ait olmalı · 4 Durum
const TARGET_COLUMN = 2;
const STATUS_COLUMN = 3;

const rows = parseLedgerRows({ file: GAPS_FILE, rowPattern: GAP_ROW, expectedCells: 4 });

function isClosed(row) {
  const plain = row.cells[STATUS_COLUMN].replaceAll('*', '').replaceAll('✅', '').trim();
  return CLOSED_MARKERS.some((marker) => plain.startsWith(marker));
}

function targetPhases(row) {
  const target = row.cells[TARGET_COLUMN];
  const phases = [
    ...new Set([...stripStruckThrough(target).matchAll(BOLD_PHASE)].map((m) => Number(m[1]))),
  ];

  if (phases.length === 0) {
    throw new Error(
      `${row.id}: "Hangi faza ait olmalı" sütunundan hiçbir **Faz N** ataması çıkarılamadı. ` +
        `Sütun: ${target.slice(0, 120)}`,
    );
  }

  return phases.sort((a, b) => a - b);
}

process.exitCode = runCoverageCheck({
  label: 'SPEC-COVERAGE-GAPS ↔ ROADMAP tutarlılık kontrolü',
  rowNoun: 'G satırı',
  roadmapFile: ROADMAP_FILE,
  rows,
  isClosed,
  targetPhases,
});
