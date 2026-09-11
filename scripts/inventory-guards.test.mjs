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
 *
 * ⚠️ 6.6-ön'de kapsam **`.claude/`ye genişletildi** ve sebebi ölçüldü: bu
 * nöbetçi yalnızca `apps/` · `packages/` · `tools/` · `scripts/` · `docs/`
 * tarıyordu — kök altındaki `.claude/agents/` ve `.claude/skills/` **hiçbir
 * yüzeye girmiyordu**. 6.6-ön oraya yedi dosya ekledi ve kapı kırılmadı;
 * *"kırılmazsa sebebini ara"* — sebep, dizinin taranmamasıydı.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ③ CHECKPOINT TAZELİĞİ — `docs/CHECKPOINT.md` git ve ROADMAP ile örtüşüyor
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `docs/CHECKPOINT.md` **makine** için sabit şekilli bir durum dosyası (faz ·
 * alt görev · aşama · commit · kapı tabanı …). Bir envanterdir ve envanterler
 * bayatlar (F1): `.env.example`ın kendi kapısıyla çelişmesi ve `BORÇ-010`un
 * dört hücresi aynı sınıftı. Bu yüzden dosyanın **iddiaya dönüşebilen** dört
 * alanı kaynağa karşı ölçülür:
 *   · `faz`          → ROADMAP'in etkin fazı (son `[x]` ya da ilk `[ ]` alt
 *                      görevin fazı)
 *   · `alt_gorev`    → ROADMAP'te bir alt görev satırı VAR ve kutusu (`[ ]`/`[x]`)
 *                      `durum` ile aynı şeyi söylüyor
 *   · `taban_commit` → git'te var ve HEAD'in atası (ya da kendisi) — kapı
 *                      tabanının ÖLÇÜLDÜĞÜ ağaç; dosya kendi commit'ini
 *                      taşıyamaz (`spec/11` §12.3'ün "neden hash değil başlık"
 *                      gerekçesi), ama üzerine yazıldığı ağacı taşıyabilir
 *   · `dal` / `son_commit_baslik` → yalnızca çalışma dalında ve temiz ağaçta
 *                      iddia edilir; `main`/`develop`da ve ayrık HEAD'de
 *                      **atlanır ve atlandığı BASILIR** (sessiz atlama D3)
 *
 * ⚠️ **NÖBETÇİ DOSYADAN ÖNCE YAZILDI** (6.5'in dersi: bir nöbetçi, yakalayacağı
 * hata OLUŞABİLECEK hâldeyken yazılır). İlk gerçek kanarya: dosya `durum:
 * tamamlandi` derken ROADMAP kutusu `[ ]` — alt görev kapanışında iki dosyayı
 * ayrı ayrı güncellerken en doğal unutma.
 *
 * ⚠️ CI'da `actions/checkout` varsayılan olarak **sığ** klon alır (depth 1);
 * `taban_commit` HEAD'in atasıysa `git cat-file -e` onu bulamaz ve bu test
 * kırılır. `ci.yml`in `quality` işi bu yüzden `fetch-depth: 0` ile alıyor —
 * bir nöbetçinin CI'da koşabilmesi için ihtiyacı olan şey de kablolamadır.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = fileURLToPath(new URL('../', import.meta.url));
const read = (rel) => readFileSync(join(REPO_ROOT, rel), 'utf8');
const git = (...args) => {
  try {
    return {
      ok: true,
      out: execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' }).trim(),
    };
  } catch (error) {
    return { ok: false, out: String(error instanceof Error ? error.message : error) };
  }
};

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

  it('`.claude/` altındaki her alt dizin ağaçta anılıyor — 6.6-ön', () => {
    // Kör kontrol değil: `.claude/` altında bakılacak bir şey OLMALI.
    // 6.6-ön'e kadar orada tek dosya vardı (`settings.json`) ve hiçbir dizin
    // yoktu; bugün `agents/` ve `skills/` var. Boş liste "yeşil" demek olmasın.
    const dirs = dirsOf('.claude');
    process.stdout.write(`  inventory-guards ② .claude/ kapsam: ${dirs.join(' · ')}\n`);
    expect(dirs).toContain('agents');
    expect(dirs).toContain('skills');
    expect(dirs.filter((name) => !tree.includes(`${name}/`))).toEqual([]);
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

/**
 * `docs/CHECKPOINT.md`in tek `yaml` çitli bloğunu düz `anahtar: değer`
 * satırları olarak okur. YAML ayrıştırıcı YOK ve bu bilinçli: dosyanın şekli
 * sabit ve düz — girinti, liste, çok satırlı değer taşımıyor. Bir bağımlılık
 * eklemek, nöbetçinin okuduğu şeyi nöbetçinin kendisinden daha karmaşık yapardı.
 */
const parseCheckpoint = (text) => {
  const open = text.indexOf('```yaml');
  if (open === -1) return null;
  const close = text.indexOf('```', open + 7);
  const block = text.slice(open + 7, close === -1 ? undefined : close);
  const fields = new Map();
  for (const raw of block.split('\n')) {
    const m = /^([a-z_]+):\s*(.*?)\s*$/.exec(raw);
    if (m) fields.set(m[1], m[2]);
  }
  return fields;
};

/**
 * ROADMAP'teki alt görev satırlarını okur: `- [x] **6.4-ön** …` ve içinde
 * bulunduğu `## FAZ N` başlığını iliştirir. Kimlik boşluk taşımaz — bu, Faz 4'ün
 * `**5.000 sahte oyuncu seed → …**` kabul kriterini dışarıda bırakan ayraç
 * (ölçüldü: gevşek desen 80 satır buluyor, gerçek alt görev sayısı 79).
 */
const parseRoadmapSubtasks = (text) => {
  const subtasks = [];
  let phase = null;
  text.split('\n').forEach((line, index) => {
    const header = /^## FAZ (\d+) /.exec(line);
    if (header) phase = Number(header[1]);
    const task = /^- \[( |x)\] \*\*(\d+)\.([^*\s]+)\*\*/.exec(line);
    if (task && phase !== null) {
      subtasks.push({
        phase,
        id: `${task[2]}.${task[3]}`,
        checked: task[1] === 'x',
        line: index + 1,
      });
    }
  });
  return subtasks;
};

const ASAMALAR = ['1-olc', '2-planla', '3-yaz', '4-sina', '5-kaydet', 'kapandi'];
const DURUMLAR = ['devam', 'tamamlandi'];
const REQUIRED_FIELDS = [
  'faz',
  'alt_gorev',
  'durum',
  'asama',
  'dal',
  'taban_commit',
  'son_commit_baslik',
  'kapi_tabani',
  'biten',
  'yarim_kalan',
  'siradaki_komut',
  'acik_karar',
];

describe('③ docs/CHECKPOINT.md git ve ROADMAP ile örtüşüyor', () => {
  const CHECKPOINT = 'docs/CHECKPOINT.md';
  const exists = existsSync(join(REPO_ROOT, CHECKPOINT));
  const cp = exists ? parseCheckpoint(read(CHECKPOINT)) : null;
  const field = (name) => cp?.get(name) ?? '';
  const subtasks = parseRoadmapSubtasks(read('docs/ROADMAP.md'));

  // git durumu TOPLAMA anında bir kez ölçülür; `it.skipIf` statik olduğu için
  // koşullar burada hesaplanır ve atlanan her vaka SEBEBİYLE basılır.
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  const dirty = git('status', '--porcelain');
  const integrationBranch = branch.ok && ['main', 'develop'].includes(branch.out);
  const detached = !branch.ok || branch.out === 'HEAD';
  const branchSkip = detached
    ? 'ayrık HEAD (pull_request koşusu?)'
    : integrationBranch
      ? `bütünleştirme dalı (${branch.out}) — dosya ÇALIŞMA dalını taşır`
      : null;
  const titleSkip =
    branchSkip ?? (dirty.ok && dirty.out !== '' ? 'ağaç kirli — commit henüz atılmadı' : null);

  it('dosya var, çitli blok okunabiliyor ve her alan mevcut', () => {
    expect(exists).toBe(true);
    expect(cp).not.toBeNull();
    const missing = REQUIRED_FIELDS.filter((name) => !cp?.has(name));
    expect(missing).toEqual([]);
    // Kapsam basılır: nöbetçi HANGİ iddiaya baktı?
    process.stdout.write(
      `  inventory-guards ③ kapsam: faz=${field('faz')} alt_gorev=${field('alt_gorev')} ` +
        `durum=${field('durum')} taban=${field('taban_commit')} · ROADMAP alt görev ${String(
          subtasks.length,
        )}\n`,
    );
    expect(subtasks.length).toBeGreaterThan(0);
  });

  it('`asama` ve `durum` kapalı kümelerden — serbest metin bir durum değildir', () => {
    expect(ASAMALAR).toContain(field('asama'));
    expect(DURUMLAR).toContain(field('durum'));
  });

  it('`faz` ROADMAP in ETKİN fazı (son [x] ya da ilk [ ] alt görevin fazı)', () => {
    const lastChecked = [...subtasks].reverse().find((s) => s.checked);
    const firstOpen = subtasks.find((s) => !s.checked);
    const active = new Set([lastChecked?.phase, firstOpen?.phase].filter((p) => p !== undefined));
    expect(active.size).toBeGreaterThan(0);
    expect([...active]).toContain(Number(field('faz')));
  });

  it('`alt_gorev` ROADMAP te VAR ve kutusu `durum` ile aynı şeyi söylüyor', () => {
    const row = subtasks.find(
      (s) => s.id === field('alt_gorev') && s.phase === Number(field('faz')),
    );
    expect(
      row,
      `ROADMAP Faz ${field('faz')} bölümünde **${field('alt_gorev')}** satırı yok`,
    ).toBeDefined();
    // `tamamlandi` ⇔ `[x]`. İki dosya aynı commit'te güncellenir; biri unutulursa
    // burası kırılır — 6.6-ön'ün kanaryası tam bu vakaydı.
    expect(row?.checked).toBe(field('durum') === 'tamamlandi');
  });

  it('`taban_commit` git te VAR ve HEAD in atası ya da kendisi', () => {
    const hash = field('taban_commit');
    expect(hash).toMatch(/^[0-9a-f]{7,40}$/);
    const known = git('cat-file', '-e', `${hash}^{commit}`);
    expect(known.ok, `git ${hash} diye bir commit tanımıyor: ${known.out}`).toBe(true);
    const ancestor = git('merge-base', '--is-ancestor', hash, 'HEAD');
    expect(ancestor.ok, `${hash} HEAD in atası değil`).toBe(true);
  });

  it.skipIf(branchSkip !== null)('`dal` çalışılan dal', () => {
    expect(field('dal')).toBe(branch.out);
  });

  it.skipIf(titleSkip !== null)('`son_commit_baslik` HEAD in başlığı (temiz ağaçta)', () => {
    // Dosya, bulunduğu commit'in BAŞLIĞINI taşır (ANLIK DURUM'un "Son commit"
    // sözleşmesi, `spec/11` §12.3). Ağaç temizse HEAD o commit'tir.
    const head = git('log', '-1', '--format=%s');
    expect(head.ok).toBe(true);
    expect(field('son_commit_baslik')).toBe(head.out);
  });

  it('atlanan vakalar SEBEBİYLE basılıyor — sessiz atlama D3 dür', () => {
    const skipped = [
      branchSkip === null ? null : `dal → ${branchSkip}`,
      titleSkip === null ? null : `son_commit_baslik → ${titleSkip}`,
    ].filter((s) => s !== null);
    process.stdout.write(
      `  inventory-guards ③ atlanan: ${skipped.length === 0 ? 'yok' : skipped.join(' · ')}\n`,
    );
    // Bu vaka bir iddia taşımıyor; yalnızca kapsamı görünür kılıyor.
    expect(Array.isArray(skipped)).toBe(true);
  });
});
