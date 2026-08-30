/**
 * `bash-text-guard` testleri.
 *
 * ⚠️ **İKİ KATMAN, VE İKİNCİSİ OLMADAN BİRİNCİSİ HİÇBİR ŞEY KANITLAMAZ.**
 * Faz 2.3b'nin dersi: *"birim testi kablolamayı kanıtlamaz."* Saf fonksiyon
 * doğru cevap verebilir ve kanca yine de hiç çağrılmıyor olabilir — o zaman
 * `✓ temiz` çıktısı bir yanılsamadır (D3).
 *
 *   ① saf `inspectBashCommand` — kararın kendisi
 *   ② **CLI'nin gerçek sözleşmesi** — alt süreç, `stdin`de JSON, çıkış kodu
 *
 * ⚠️ **VE HER İKİ YÖN DE ZORUNLU.** Engellenmesi gereken **engellenmeli**,
 * engellenmemesi gereken **geçmeli**. Tek yönlü bir kanarya sessizce daralan
 * bir kapıyı görmez: her şeyi reddeden bir kanca da "engelledi" testini
 * geçerdi. Bu, *"pozitif testler kör bir kontrolle de geçer"* kuralının
 * kapı tarafındaki biçimi.
 */
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { blockMessage, inspectBashCommand } from './index.mjs';

const GUARD = path.join(path.dirname(fileURLToPath(import.meta.url)), 'index.mjs');

/**
 * Kancayı GERÇEK sözleşmesiyle çalıştırır: alt süreç + `stdin`de JSON.
 *
 * @param {unknown} payload
 * @returns {Promise<{ code: number, stderr: string }>}
 */
function runGuard(payload) {
  return new Promise((resolve) => {
    const child = execFile(process.execPath, [GUARD], (error, _stdout, stderr) => {
      resolve({ code: error?.code ?? 0, stderr: String(stderr) });
    });
    child.stdin.end(JSON.stringify(payload));
  });
}

/** `PreToolUse` girdisinin şekli — tek yerde. */
const bashCall = (command) => ({
  hook_event_name: 'PreToolUse',
  tool_name: 'Bash',
  tool_input: { command },
});

describe('inspectBashCommand — karar', () => {
  /**
   * ⚠️ ÜÇ İHLALİN ÜÇÜ DE BURADA, GERÇEK BİÇİMLERİYLE.
   *
   * Uydurulmuş örnekler yerine günlükteki vakalar yazıldı: kural onlar için
   * doğduysa, kanca onları yakalamak zorunda. Bir kural kendi doğuş vakasını
   * geçirirse yanlış yazılmış demektir.
   */
  it('günlük #3 — `node -e` + ters tırnak + Türkçe ENGELLENİYOR', () => {
    const verdict = inspectBashCommand(
      'node -e "const s = `docs/ROADMAP.md`; fs.writeFileSync(f, `Faz 4 — şema`)"',
    );
    expect(verdict.blocked).toBe(true);
    expect(verdict.carriers).toContain('node -e / --eval');
    expect(verdict.markers).toEqual(['ters tırnak (`)', 'ASCII olmayan bayt']);
  });

  it('günlük #14 — python heredoc + Türkçe ENGELLENİYOR', () => {
    const verdict = inspectBashCommand("python - << 'PYEOF'\nbaslik = 'nitelik tabloları'\nPYEOF");
    expect(verdict.blocked).toBe(true);
    expect(verdict.carriers).toContain('heredoc (<<)');
    expect(verdict.markers).toEqual(['ASCII olmayan bayt']);
  });

  it('günlük #19 ① — `cat >> … <<` + Türkçe ENGELLENİYOR', () => {
    const verdict = inspectBashCommand("cat >> test.ts << 'XEOF'\n// çevrim testi\nXEOF");
    expect(verdict.blocked).toBe(true);
    expect(verdict.carriers).toContain('heredoc (<<)');
  });

  it('günlük #19 ② — commit mesajı heredoc ENGELLENİYOR (geçmişe yazılır, en ağırı)', () => {
    const verdict = inspectBashCommand(
      "git commit -F - << 'GITEOF'\nfeat(db): nitelik tabloları — `0007`\nGITEOF",
    );
    expect(verdict.blocked).toBe(true);
    expect(verdict.markers).toEqual(['ters tırnak (`)', 'ASCII olmayan bayt']);
  });

  /**
   * ⚠️ NEGATİF TARAF — KAPSAMIN DAR OLDUĞUNU BU TESTLER SABİTLİYOR.
   *
   * Kanca iki koşulu birden arıyor (taşıyıcı **ve** yük). Aşağıdakilerden biri
   * engellenmeye başlarsa kapı sessizce genişlemiş demektir ve bu, kancanın
   * kendisini bir engele çevirir.
   */
  it('saf ASCII heredoc GEÇİYOR — taşıyıcı var, yük yok', () => {
    const verdict = inspectBashCommand("psql << 'SQL'\nSELECT count(*) FROM players;\nSQL");
    expect(verdict.blocked).toBe(false);
    expect(verdict.carriers).toContain('heredoc (<<)');
    expect(verdict.markers).toEqual([]);
  });

  it('Türkçe metin taşıyan ama TAŞIYICISI OLMAYAN komut GEÇİYOR', () => {
    // Tek argümanlı tırnaklı dize — üç ihlalin hiçbiri bu biçimde değildi.
    const verdict = inspectBashCommand('git commit -F docs/mesaj.txt  # nitelik tabloları');
    expect(verdict.blocked).toBe(false);
    expect(verdict.carriers).toEqual([]);
  });

  it('ters tırnak taşıyan ama taşıyıcısı olmayan komut GEÇİYOR', () => {
    const verdict = inspectBashCommand('echo `date`');
    expect(verdict.blocked).toBe(false);
  });

  it('boş ve tipsiz girdi ENGELLEMİYOR', () => {
    expect(inspectBashCommand('').blocked).toBe(false);
    expect(inspectBashCommand(undefined).blocked).toBe(false);
  });
});

describe('blockMessage — kurtarma yolu MESAJIN İÇİNDE', () => {
  /**
   * Faz 3.10: *"bir kapının kurtarma yolu da bir iddiadır."* Mesaj yalnızca
   * *"yasak"* deseydi, kancayı gören taraf kuralı sadeleştirmeye çalışırdı.
   */
  it('mesaj üç kurtarma yolunu da adıyla taşıyor', () => {
    const message = blockMessage({ carriers: ['heredoc (<<)'], markers: ['ASCII olmayan bayt'] });
    expect(message).toContain('Edit / Write');
    expect(message).toContain('git commit -F <dosya>');
    expect(message).toContain('heredoc (<<)');
    expect(message).toContain('ASCII olmayan bayt');
  });
});

describe('CLI sözleşmesi — İKİ YÖNLÜ KANARYA (alt süreç, gerçek stdin)', () => {
  it('ENGELLENMESİ gereken komut çıkış kodu 2 ve stderr üretiyor', async () => {
    const result = await runGuard(bashCall("cat >> f.md << 'EOF'\nçevrim\nEOF"));
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('bash-text-guard');
    expect(result.stderr).toContain('heredoc (<<)');
  });

  it('ENGELLENMEMESİ gereken komut çıkış kodu 0 ve BOŞ stderr üretiyor', async () => {
    const result = await runGuard(bashCall("psql << 'SQL'\nSELECT 1;\nSQL"));
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('Bash OLMAYAN bir araç hiç denetlenmiyor', async () => {
    const result = await runGuard({
      hook_event_name: 'PreToolUse',
      tool_name: 'Write',
      tool_input: { content: 'çevrim testi ve `ters tırnak`' },
    });
    expect(result.code).toBe(0);
  });

  it('AÇILAMAYAN girdi engellemiyor — kararın kendi testi', async () => {
    const result = await new Promise((resolve) => {
      const child = execFile(process.execPath, [GUARD], (error) => {
        resolve({ code: error?.code ?? 0 });
      });
      child.stdin.end('{ bozuk json');
    });
    expect(result.code).toBe(0);
  });
});
