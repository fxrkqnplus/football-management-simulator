/**
 * KÜTÜK KAPILARININ TESTİ — Faz 6.4-ön.
 *
 * Üç katman, ve üçü ayrı şeyler kanıtlıyor:
 *
 *   ① SAF ÇÖZÜMLEME — `splitRow` · `stripStruckThrough` · `parseLedgerRows`
 *      şekil kontrolü. Birim testi.
 *   ② İKİ YÖNLÜ KONTROL DENEYİ — aynı çekirdek, **gerçek ROADMAP**'e karşı:
 *      sahipsiz bir satır uydurulunca **ötüyor** (exit 1), bugünkü kütüklerle
 *      **susuyor** (exit 0). Bir kontrol deneyi iki yönlü olmalı.
 *   ③ KABLOLAMA KANARYASI — `check-gap-coverage.mjs` ve `check-debt-coverage.mjs`
 *      ALT SÜREÇ olarak koşturulur ve çıkış kodu okunur. Birim testi
 *      kablolamayı kanıtlamaz (2.3b'nin dersi); `package.json` betiği bozulursa
 *      ya da bir giriş betiği çekirdeği çağırmayı bırakırsa burada kırılır.
 *
 * ⚠️ ②'nin **taranan satır sayısını da** iddia ediyor olması bilinçli:
 * *"0 bulundu"* ile *"hiçbir şeye bakmadı"* ayırt edilebilir olmalı.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  parseLedgerRows,
  roadmapSections,
  runCoverageCheck,
  splitRow,
  stripStruckThrough,
} from './ledger-coverage.mjs';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ROADMAP_FILE = join(REPO_ROOT, 'docs/ROADMAP.md');

/** Yazılan her şeyi biriktiren sahte akış — rapor metni iddia edilebilsin diye. */
function collector() {
  const chunks = [];
  return { write: (s) => chunks.push(s), text: () => chunks.join('') };
}

let workDir;
beforeAll(() => {
  workDir = mkdtempSync(join(tmpdir(), 'fms-ledger-'));
});
afterAll(() => {
  rmSync(workDir, { recursive: true, force: true });
});

function fixture(name, body) {
  const path = join(workDir, name);
  writeFileSync(path, body, 'utf8');
  return path;
}

const ROW = /^\|\s*(?:\*\*)?(X-\d+)(?:\*\*)?\s*\|(.*)\|\s*$/;

describe('① saf çözümleme', () => {
  it('kaçışlı boru işareti hücreyi BÖLMEZ — G-06 sınıfı', () => {
    // 4.11'de ölçüldü: `Sentry \| 5.000 olay/ay` düz bir split ile satırı kaydırıyordu.
    expect(splitRow(String.raw` a | Sentry \| 5.000 olay \| 4.000 | b `)).toEqual([
      'a',
      String.raw`Sentry \| 5.000 olay \| 4.000`,
      'b',
    ]);
  });

  it('üstü çizili atamalar elenir', () => {
    expect(stripStruckThrough('~~**Faz 8**~~ → **Faz 7**')).toBe(' → **Faz 7**');
  });

  it('beklenen sütun sayısını taşımayan satır KIRAR — sessizce atlamaz', () => {
    // Gerçek vaka: BORÇ-010 satırı 5.6'dan 6.4-ön'e kadar DÖRT hücreyle
    // yazılıydı (başlık BEŞ diyor) ve Markdown eksik hücreyi sessizce boş
    // gösteriyordu. Kapı ilk koşusunda tam bu satırda kırıldı.
    const file = fixture('eksik.md', '| X-01 | a | b |\n');
    expect(() => parseLedgerRows({ file, rowPattern: ROW, expectedCells: 3 })).toThrow(
      /X-01: satır 3 hücre taşımalı, 2 taşıyor/,
    );
  });

  it('FAZLA sütun da KIRAR — kaydırma her iki yönde tehlikeli', () => {
    const file = fixture('fazla.md', '| X-01 | a | b | c | d |\n');
    expect(() => parseLedgerRows({ file, rowPattern: ROW, expectedCells: 3 })).toThrow(/4 taşıyor/);
  });

  it('ROADMAP `## FAZ N` başlıklarından dilimlenir', () => {
    const sections = roadmapSections(ROADMAP_FILE);
    // Sayı elle yazılmıyor: 50 fazın hepsi bölüm taşımalı (ROADMAP'in kendi iddiası).
    expect(sections.size).toBe(50);
    expect(sections.get(6)).toContain('BORÇ-009');
  });
});

describe('② iki yönlü kontrol deneyi — GERÇEK ROADMAP e karşı', () => {
  const roadmapFile = ROADMAP_FILE;

  it('SAHİPSİZ bir satır uydurulunca ÖTÜYOR ve satırı adıyla gösteriyor', () => {
    const out = collector();
    const code = runCoverageCheck({
      label: 'kontrol deneyi',
      rowNoun: 'sahte satır',
      roadmapFile,
      // `X-99` ROADMAP'in hiçbir bölümünde geçmiyor.
      rows: [{ id: 'X-99', cells: ['', '', '', '**16**'] }],
      isClosed: () => false,
      targetPhases: () => [16],
      out,
    });

    expect(code).toBe(1);
    expect(out.text()).toContain('✗ X-99 → Faz 16');
    expect(out.text()).toContain('1 satır hedef fazının kapsamında GEÇMİYOR');
  });

  it('SAHİPLİ bir satır SUSUYOR — aynı çekirdek, tek fark hedefin taşıması', () => {
    const out = collector();
    const code = runCoverageCheck({
      label: 'kontrol deneyi',
      rowNoun: 'sahte satır',
      roadmapFile,
      rows: [{ id: 'BORÇ-009', cells: ['', '', '', '**6**'] }],
      isClosed: () => false,
      targetPhases: () => [6],
      out,
    });

    expect(code).toBe(0);
    expect(out.text()).toContain('✓ BORÇ-009 → Faz 6');
  });

  it('hiç satır bulamayan kontrol ONAY DEĞİL — kırılır', () => {
    expect(() =>
      runCoverageCheck({
        label: 'kör tarayıcı',
        rowNoun: 'satır',
        roadmapFile,
        rows: [],
        isClosed: () => false,
        targetPhases: () => [1],
        out: collector(),
      }),
    ).toThrow(/kütükte hiç satır bulunamadı/);
  });

  it('var olmayan bir faza atanmış satır KIRAR', () => {
    expect(() =>
      runCoverageCheck({
        label: 'kontrol deneyi',
        rowNoun: 'satır',
        roadmapFile,
        rows: [{ id: 'X-98', cells: ['', '', '', '**99**'] }],
        isClosed: () => false,
        targetPhases: () => [99],
        out: collector(),
      }),
    ).toThrow(/"## FAZ 99" bölümü yok/);
  });
});

describe('③ kablolama kanaryası — giriş betikleri ALT SÜREÇ olarak', () => {
  function run(script) {
    return execFileSync(process.execPath, [join(REPO_ROOT, 'scripts', script)], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
  }

  it('`check-debt-coverage.mjs` bugünkü depoda temiz — ve KAÇ SATIR taradığını söylüyor', () => {
    const stdout = run('check-debt-coverage.mjs');
    expect(stdout).toContain('TEKNİK BORÇ ↔ ROADMAP tutarlılık kontrolü');
    // Sayı burada iddia EDİLMİYOR (bayatlar); iddia edilen şey satırların
    // SAYILDIĞI ve sonucun sıfırdan büyük olduğu — "hiçbir şeye bakmadı"
    // ile "0 bulundu" ayırt edilebilsin diye.
    const scanned = /taranan \(açık\)\s+: (\d+)/.exec(stdout);
    expect(scanned).not.toBeNull();
    expect(Number(scanned[1])).toBeGreaterThan(0);
    expect(stdout).toContain('✓ Açık satırların hepsi');
  });

  it('`check-gap-coverage.mjs` bugünkü depoda temiz — aynı çekirdek, aynı rapor biçimi', () => {
    const stdout = run('check-gap-coverage.mjs');
    expect(stdout).toContain('SPEC-COVERAGE-GAPS ↔ ROADMAP tutarlılık kontrolü');
    const scanned = /taranan \(açık\)\s+: (\d+)/.exec(stdout);
    expect(scanned).not.toBeNull();
    expect(Number(scanned[1])).toBeGreaterThan(0);
  });
});
