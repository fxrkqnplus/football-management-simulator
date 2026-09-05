/**
 * ENVANTER NÖBETÇİLERİ — Faz 6.4-ön.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ① KAPI KABLOLAMASI — "bir kapının VAR olması KOŞTUĞUNU göstermez"
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Ölçülmüş bedel: `gaps:check` 4.11'de tam şu cümleyle yazıldı — *"kontrol
 * koşan bir adımdır, bir temenni değil"* — ve **hiçbir workflow'a
 * bağlanmadı**. 5.0'da ölçüldü: `.github/workflows/` altında `gaps` için **0
 * eşleşme**. Kapı beş alt görev boyunca yalnızca biri hatırlarsa koştu.
 * Kablolama 5.6'da elle yapıldı, ama onu **denetleyen** bir şey yine yoktu.
 *
 * Bu nöbetçi o boşluğu kapatıyor ve **KAPSAMI AÇIKÇA DAR**: kök
 * `package.json`daki adı `:check` ile biten her betik. `format:check` ·
 * `arch:check` · `gaps:check` · `i18n:check` · `debt:check` bugün bu desene
 * giriyor. ⚠️ **`perf:budget` (Faz 6.10, G-01) GİRMİYOR** — desen ada bakıyor,
 * işe değil. 6.10 kapıyı kurarken ya adı `:check` ile bitirir ya bu deseni
 * genişletir; ROADMAP 6.10 maddesi bunu adıyla söylüyor. Sessiz bir muafiyet
 * kapsamı yutar (D3), bu yüzden desen **çıktıya basılıyor**.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ② ENVANTER TAZELİĞİ — `tools/` ağacı İKİ KEZ bayatladı
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `CLAUDE.md` §2.2'nin ağacı 4.11 ve 5.9'da iki ayrı kez gerçekten bayat
 * bulundu (5.9'da dört araç dizini eksikti). 6.4-ön'de üçüncü kez ölçüldü ve
 * yine bayattı — bu kez **`scripts/` dizininin tamamı** (altı betik, biri CI
 * kapısı) ve `docs/reports/` + `docs/schema/` eksikti.
 *
 * *"Bir envanter iki kez bayatladıysa üçüncüsünü de yapar"* — disiplin değil
 * koşan bir tarama gerekiyor. Yön **diskten belgeye**: diskte var olan her
 * dizin/belge ağaçta ya da haritada anılmalı. Ters yön (ağaçta olup diskte
 * olmayan "hayalet" girdi) BU NÖBETÇİNİN KAPSAMINDA DEĞİL ve sebebi var:
 * ağaç bilerek **planlanan** dizinleri de gösteriyor (`docs/LEGAL/`, `data/`).
 * Kapsam çıktıya basılıyor ki bir sonraki okuyucu onu tam sanmasın.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = fileURLToPath(new URL('../', import.meta.url));
const read = (rel) => readFileSync(join(REPO_ROOT, rel), 'utf8');

const dirsOf = (rel) =>
  readdirSync(join(REPO_ROOT, rel), { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== 'node_modules' && !d.name.startsWith('.'))
    .map((d) => d.name)
    .sort();

describe('① her `*:check` kapısı ci.yml de KOŞUYOR', () => {
  const pkg = JSON.parse(read('package.json'));
  const ci = read('.github/workflows/ci.yml');
  const gates = Object.keys(pkg.scripts).filter((name) => name.endsWith(':check'));

  it('desen bakacak bir şey buluyor — kör bir nöbetçi onay değildir', () => {
    // Kapsam çıktıya basılır (SAPMA-024): hangi betikler denetlendi?
    process.stdout.write(`  inventory-guards ① kapsam: ${gates.join(' · ')}\n`);
    expect(gates.length).toBeGreaterThan(0);
    expect(gates).toContain('gaps:check');
    expect(gates).toContain('debt:check');
  });

  it.each(gates)('`pnpm %s` ci.yml de bir adım olarak var', (gate) => {
    // Satır sonuna sabitli: `pnpm gaps:check` ararken `pnpm gaps:check-x`
    // eşleşmesin. Yorumdaki geçişler de sayılmasın diye `run:` zorunlu.
    const step = new RegExp(`^\\s+run: pnpm ${gate.replace(':', ':')}\\s*$`, 'm');
    expect(ci).toMatch(step);
  });

  /**
   * ⚠️ **"MASKELENMEMİŞ BİR ADIM İŞİ GERÇEKTEN KIRIYOR MU" ARTIK BİR ÇIKARIM
   * DEĞİL, BİR GÖZLEM** — 6.4-ön'de ölçüldü.
   *
   * 5.6 bu iddiayı *"ölçülemedi, çıkarım — dayanağı adımın maskelenmemiş
   * olması"* diye işaretledi; 5.9 *"ancak gerçekten kırılan bir koşuda
   * görülür"* deyip açık bıraktı ve gözlem iki raporun içinde kaldı.
   * 6.4-ön kırmızı koşuyu (`33937132528`, 6.3'ün commit'i) **adım listesiyle**
   * okudu: `Web imajını derle` **failure** → işin kendisi **failure** →
   * ardından gelen dört adım **skipped** → koşunun sonucu **failure**.
   * ⚠️ **Kapsam dürüstçe yazılıyor:** gözlem `İmaj` işinden geldi, bir
   * `Kalite kapıları` adımından değil. Mekanizma (adım hatası → iş hatası)
   * işten bağımsız, ama doğrudan gözlem başka bir işte yapıldı.
   */
  it('hiçbir adım MASKELENMEMİŞ — maskelenmiş bir adım kapı değil temennidir', () => {
    // `continue-on-error` yalnızca YORUM içinde geçebilir (i18n:check'in
    // gerekçe bloğu onu adıyla anıyor). Anahtar olarak geçmesi yasak.
    const asKey = /^\s*continue-on-error\s*:/m;
    expect(ci).not.toMatch(asKey);
    expect(ci).not.toMatch(/\|\|\s*true/);
  });
});

describe('② CLAUDE.md envanteri diskle örtüşüyor', () => {
  const claude = read('CLAUDE.md');
  const treeStart = claude.indexOf('football-management-simulator/');
  const tree = claude.slice(treeStart, claude.indexOf('```', treeStart));

  it('ağaç bloğu bulunabiliyor', () => {
    expect(treeStart).toBeGreaterThan(0);
    expect(tree.length).toBeGreaterThan(200);
  });

  it.each(['apps', 'packages', 'tools'])('`%s/` altındaki her dizin ağaçta anılıyor', (rel) => {
    const missing = dirsOf(rel).filter((name) => !tree.includes(name));
    expect(missing).toEqual([]);
  });

  it('`scripts/` altındaki her betik ağaçta anılıyor', () => {
    // 6.4-ön'de ölçüldü: `scripts/` ağaçta HİÇ YOKTU, oysa §2.4 katman
    // kuralları onu adıyla sayıyor ve içindeki bir betik CI kapısı.
    const scripts = readdirSync(join(REPO_ROOT, 'scripts'), { withFileTypes: true })
      .filter((d) => d.isFile() && d.name.endsWith('.mjs') && !d.name.endsWith('.test.mjs'))
      .map((d) => d.name);
    expect(scripts.length).toBeGreaterThan(0);
    expect(scripts.filter((name) => !tree.includes(name))).toEqual([]);
  });

  it('`docs/` altındaki her alt dizin ağaçta anılıyor', () => {
    const missing = dirsOf('docs').filter((name) => !tree.includes(`${name}/`));
    expect(missing).toEqual([]);
  });

  it('`docs/*.md` belgelerinin hepsi BELGE HARİTASINDA geçiyor', () => {
    const mapped = [...claude.matchAll(/^\|\s*`([^`]+)`\s*\|/gm)].map((m) => m[1]);
    const docs = readdirSync(join(REPO_ROOT, 'docs')).filter((f) => f.endsWith('.md'));
    process.stdout.write(
      `  inventory-guards ② kapsam: ${String(docs.length)} belge · ${String(mapped.length)} harita satırı\n`,
    );
    const missing = docs.filter((f) => !mapped.some((p) => p.endsWith(f)));
    expect(missing).toEqual([]);
  });
});
