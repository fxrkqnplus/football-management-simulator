import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  APP_PATH_PREFIXES,
  basePackageOf,
  checkImportCasing,
  ENGINE_FORBIDDEN_CALLS,
  ENGINE_FORBIDDEN_MODULE_PREFIXES,
  ENGINE_FORBIDDEN_SHARED_EXPORTS,
  isDependencyDeclared,
  isForbiddenEngineModule,
  isImportAllowed,
  LAYER_RULES,
  resolveLayer,
  RESTRICTED_SUBPATHS,
  runArchCheck,
  SCANNED_EXTENSIONS,
  scanSource,
  subpathRestrictionFor,
} from './index.mjs';

describe('resolveLayer', () => {
  it('dosya yolundan katmanı bulur', () => {
    expect(resolveLayer('packages/engine/src/match/tick.ts')).toBe('packages/engine');
    expect(resolveLayer('apps/api/src/main.ts')).toBe('apps/api');
    expect(resolveLayer('tools/data-cli/src/x.ts')).toBe('tools/data-cli');
    expect(resolveLayer('scripts/check-node-version.mjs')).toBe('scripts');
  });

  it('Windows ayracıyla da çalışır', () => {
    expect(resolveLayer('packages\\engine\\src\\x.ts')).toBe('packages/engine');
  });

  it('tanımsız konumda null döner', () => {
    expect(resolveLayer('docs/ROADMAP.md')).toBeNull();
  });
});

describe('isImportAllowed — CLAUDE.md §2.4', () => {
  it('izin verilen yönü kabul eder', () => {
    expect(isImportAllowed('apps/api', '@fms/engine')).toBe(true);
    expect(isImportAllowed('packages/engine', '@fms/shared')).toBe(true);
  });

  it('motor veritabanını göremez', () => {
    expect(isImportAllowed('packages/engine', '@fms/db')).toBe(false);
  });

  it('shared hiçbir şeyi import edemez', () => {
    expect(isImportAllowed('packages/shared', '@fms/ui')).toBe(false);
    expect(isImportAllowed('packages/shared', '@fms/db')).toBe(false);
  });

  it('web sunucu paketlerini göremez (K1)', () => {
    expect(isImportAllowed('apps/web', '@fms/db')).toBe(false);
    expect(isImportAllowed('apps/web', '@fms/engine')).toBe(false);
    expect(isImportAllowed('apps/web', '@fms/ui')).toBe(true);
  });

  // ── Faz 2.2a: alt yol farkındalığı ──────────────────────────────────────
  // 2.0'da ÖLÇÜLDÜ: kural tam eşleşme yapıyordu, bu yüzden
  // isImportAllowed('apps/api', '@fms/shared/server') === false idi —
  // paket izinli olmasına rağmen SAHTE bir katman ihlali üretiliyordu.
  it('alt yol taşıyan belirteç TEMEL PAKETE göre değerlendirilir', () => {
    expect(isImportAllowed('apps/api', '@fms/shared/server')).toBe(true);
    expect(isImportAllowed('apps/worker', '@fms/shared/server')).toBe(true);
    expect(isImportAllowed('tools/data-cli', '@fms/shared/server')).toBe(true);
  });

  it('alt yol, YASAK bir paketi izinli hâle GETİRMEZ', () => {
    // Katman kuralı gevşetilmemeli: '@fms/db/anything' hâlâ yasak.
    expect(isImportAllowed('packages/engine', '@fms/db/schema')).toBe(false);
    expect(isImportAllowed('apps/web', '@fms/engine/match')).toBe(false);
  });
});

describe('basePackageOf', () => {
  it('kapsamlı pakette ilk iki segmenti alır', () => {
    expect(basePackageOf('@fms/shared')).toBe('@fms/shared');
    expect(basePackageOf('@fms/shared/server')).toBe('@fms/shared');
    expect(basePackageOf('@fms/shared/server/deep')).toBe('@fms/shared');
  });

  it('kapsamsız pakette ilk segmenti alır', () => {
    expect(basePackageOf('zod')).toBe('zod');
    expect(basePackageOf('node:fs')).toBe('node:fs');
    expect(basePackageOf('pino/browser')).toBe('pino');
  });
});

describe('subpathRestrictionFor — sunucu alt yolu iki yönlü kapalı (2.2a)', () => {
  it('tarayıcı tarafı sunucu alt yolunu göremez (K1)', () => {
    expect(subpathRestrictionFor('apps/web', '@fms/shared/server')).not.toBeNull();
    expect(subpathRestrictionFor('packages/ui', '@fms/shared/server')).not.toBeNull();
  });

  it('MOTOR da göremez (K3) — sınır iki yönlü', () => {
    // 2.1'de ölçüldü: barrel env.js üzerinden Zod'u motora çekiyordu.
    expect(subpathRestrictionFor('packages/engine', '@fms/shared/server')).not.toBeNull();
  });

  it('sunucu katmanları görebilir', () => {
    expect(subpathRestrictionFor('apps/api', '@fms/shared/server')).toBeNull();
    expect(subpathRestrictionFor('apps/worker', '@fms/shared/server')).toBeNull();
    expect(subpathRestrictionFor('packages/db', '@fms/shared/server')).toBeNull();
    expect(subpathRestrictionFor('tools/data-cli', '@fms/shared/server')).toBeNull();
  });

  it('kısıtsız belirteç için null döner', () => {
    expect(subpathRestrictionFor('apps/web', '@fms/shared')).toBeNull();
    expect(subpathRestrictionFor('packages/engine', '@fms/shared')).toBeNull();
  });
});

describe('isDependencyDeclared — "izinli" ile "çözümlenebilir" ayrı şeyler (2.2a)', () => {
  // 2.1'de ÖLÇÜLDÜ: arch:check 12 katman bağına izin veriyordu ama
  // package.json'larda yalnızca 2'si bildirilmişti. packages/engine
  // '@fms/shared'ı import edince test "Cannot find package" ile kırıldı;
  // arch:check ise "temiz" demişti — yanlış NEGATİF.
  const fakeReader = (map) => (layer) => (layer in map ? map[layer] : null);

  it('bildirilmiş bağımlılığı kabul eder', () => {
    const read = fakeReader({
      'packages/engine': { dependencies: { '@fms/shared': 'workspace:*' } },
    });
    expect(isDependencyDeclared(read, 'packages/engine', '@fms/shared')).toBe(true);
  });

  it('BİLDİRİLMEMİŞ bağımlılığı yakalar', () => {
    const read = fakeReader({ 'packages/engine': { dependencies: {} } });
    expect(isDependencyDeclared(read, 'packages/engine', '@fms/shared')).toBe(false);
  });

  it('alt yol importunda TEMEL PAKETE bakar', () => {
    const read = fakeReader({ 'apps/api': { dependencies: { '@fms/shared': 'workspace:*' } } });
    // '@fms/shared/server' bildirilmez; bildirilen '@fms/shared'tır.
    expect(isDependencyDeclared(read, 'apps/api', '@fms/shared/server')).toBe(true);
  });

  it('devDependencies ve peerDependencies de sayılır', () => {
    const readDev = fakeReader({
      'packages/ui': { devDependencies: { '@fms/shared': 'workspace:*' } },
    });
    expect(isDependencyDeclared(readDev, 'packages/ui', '@fms/shared')).toBe(true);
    const readPeer = fakeReader({
      'packages/ui': { peerDependencies: { '@fms/shared': 'workspace:*' } },
    });
    expect(isDependencyDeclared(readPeer, 'packages/ui', '@fms/shared')).toBe(true);
  });

  it('package.json olmayan katman (scripts/) denetlenmez', () => {
    const read = fakeReader({});
    expect(isDependencyDeclared(read, 'scripts', '@fms/shared')).toBe(true);
  });
});

describe('isForbiddenEngineModule — K3', () => {
  it("'node:' şema önekini yakalar", () => {
    // REGRESYON: ilk yazımda `node:/` aranıyordu ve hiçbir zaman eşleşmiyordu.
    expect(isForbiddenEngineModule('node:fs')).toBe(true);
    expect(isForbiddenEngineModule('node:crypto')).toBe(true);
  });

  it('şemasız çekirdek modülleri yakalar', () => {
    expect(isForbiddenEngineModule('fs')).toBe(true);
    expect(isForbiddenEngineModule('fs/promises')).toBe(true);
    expect(isForbiddenEngineModule('http')).toBe(true);
  });

  it('veritabanı paketini yakalar', () => {
    expect(isForbiddenEngineModule('@fms/db')).toBe(true);
  });

  it('yanlış pozitif üretmez', () => {
    expect(isForbiddenEngineModule('@fms/shared')).toBe(false);
    expect(isForbiddenEngineModule('pathfinding')).toBe(false);
    expect(isForbiddenEngineModule('osmosis')).toBe(false);
    expect(isForbiddenEngineModule('./local-helper.js')).toBe(false);
  });
});

describe('scanSource', () => {
  it('import, export-from ve dinamik import toplar', () => {
    const { imports } = scanSource(
      [
        "import { a } from '@fms/shared';",
        "export { b } from './b.js';",
        "const c = await import('node:fs');",
      ].join('\n'),
      'x.ts',
    );
    expect(imports.map((i) => i.spec)).toEqual(['@fms/shared', './b.js', 'node:fs']);
  });

  it('yasaklı çağrıları ve new Date() bulur', () => {
    const src = ['const a = Math.random();', 'const b = Date.now();', 'const c = new Date();'].join(
      '\n',
    );
    const { calls, newDates } = scanSource(src, 'x.ts');
    expect(calls.map((c) => c.text)).toContain('Math.random');
    expect(calls.map((c) => c.text)).toContain('Date.now');
    expect(newDates).toHaveLength(1);
  });

  it('yorum ve dizgi içindeki yasaklı ifadeyi SAYMAZ (regex değil AST)', () => {
    const src = ['// Math.random() burada yalnızca açıklama', "const s = 'Date.now()';"].join('\n');
    const { calls, newDates } = scanSource(src, 'x.ts');
    expect(calls).toHaveLength(0);
    expect(newDates).toHaveLength(0);
  });

  it('modül düzeyi let/var bulur, const bulmaz', () => {
    const src = [
      'let a = 1;',
      'var b = 2;',
      'const c = 3;',
      'function f() { let d = 4; return d; }',
    ].join('\n');
    const { moduleMutables } = scanSource(src, 'x.ts');
    expect(moduleMutables.map((m) => m.name)).toEqual(['a', 'b']);
  });
});

describe('checkImportCasing', () => {
  let dir;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'arch-casing-'));
    writeFileSync(join(dir, 'PlayerCard.ts'), 'export const x = 1;\n');
    writeFileSync(join(dir, 'Helper.mjs'), 'export const y = 1;\n');
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('doğru harf kullanımını kabul eder', () => {
    expect(checkImportCasing(dir, './PlayerCard.js')).toEqual({ ok: true });
    expect(checkImportCasing(dir, './Helper.mjs')).toEqual({ ok: true });
  });

  it('yanlış harf kullanımını yakalar ve doğrusunu söyler', () => {
    const r = checkImportCasing(dir, './playercard.js');
    expect(r.ok).toBe(false);
    expect(r.expected).toBe('PlayerCard.ts');
  });

  it('.js → .ts eşlemesini yapar (NodeNext)', () => {
    expect(checkImportCasing(dir, './PLAYERCARD.js').ok).toBe(false);
  });

  it('paket belirteçlerini denetlemez', () => {
    expect(checkImportCasing(dir, '@fms/shared')).toEqual({ ok: true });
    expect(checkImportCasing(dir, 'node:fs')).toEqual({ ok: true });
  });

  it('var olmayan dosyayı harf hatası saymaz', () => {
    expect(checkImportCasing(dir, './hicyok.js')).toEqual({ ok: true });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// META-TEST — gate'in KENDİSİ bozulursa (Faz 2.2b)
// ─────────────────────────────────────────────────────────────────────────────
//
// NEDEN VAR: 2.2a'da ölçüldü ki alt yol sınırının TEK yapısal bekçisi
// `arch:check`. `types: []` ve `sideEffects: false` sızıntıyı engellemiyor
// (SAPMA-012). Tek savunma hattı olmanın bedeli, o hattın kendisinin
// denetlenmesi gerektiğidir.
//
// Bu sınıftan sessiz bozulma zaten yaşandı: 2.1'de taranan uzantı listesinden
// `.cts` eksikti ve ihlal içeren bir `.cts` dosyası konulduğunda gate
// "✓ temiz" dedi. Kural silinse, liste boşalsa, bir tablo kazara kırpılsa
// gate yine "temiz" derdi — çıktı, denetimin YAPILDIĞINI söylemiyor.
//
// İki kat kontrol:
//   ① Sabit tablolar boşalmadı mı / kritik üyeler yerinde mi
//   ② KANARYA: her kuralın ihlalini içeren sahte bir depo taranıyor ve her
//      kuralın gerçekten ötüğü görülüyor. ①'in yakalayamadığı şeyi yakalar —
//      tablo doluyken kuralın kablolaması kopmuş olabilir.

describe('META: arch:check kural tabloları boşalmadı', () => {
  it('katman tablosu sekiz paketi ve scripts katmanını tanımlar', () => {
    const layers = Object.keys(LAYER_RULES);
    expect(layers.length).toBeGreaterThanOrEqual(9);
    for (const required of [
      'apps/web',
      'apps/api',
      'apps/worker',
      'packages/db',
      'packages/engine',
      'packages/ui',
      'packages/shared',
      'tools/data-cli',
    ]) {
      expect(layers).toContain(required);
    }
  });

  it('motor izin listesi yalnızca @fms/shared içerir — genişlerse K3 gevşer', () => {
    expect(LAYER_RULES['packages/engine']).toEqual(['@fms/shared']);
  });

  it('varlık yolu ön ekleri listesi boşalmadı', () => {
    expect(APP_PATH_PREFIXES.length).toBeGreaterThanOrEqual(6);
    expect(APP_PATH_PREFIXES).toContain('/api');
    expect(APP_PATH_PREFIXES).toContain('/fms');
  });

  it('taranan uzantı listesi yedi uzantıyı kapsar — .cts dahil', () => {
    // 2.1'de tam olarak .cts eksikti ve gate kör kaldı.
    for (const ext of ['.ts', '.tsx', '.mts', '.cts', '.mjs', '.cjs', '.js']) {
      expect(SCANNED_EXTENSIONS).toContain(ext);
    }
  });

  it('motor yasaklı modül listesi çekirdek Node yüzeyini kapsar', () => {
    expect(ENGINE_FORBIDDEN_MODULE_PREFIXES.length).toBeGreaterThanOrEqual(11);
    for (const prefix of ['node:', 'fs', 'http', 'crypto', 'child_process']) {
      expect(ENGINE_FORBIDDEN_MODULE_PREFIXES).toContain(prefix);
    }
  });

  it('motor yasaklı çağrı listesi K2/K3 üçlüsünü kapsar', () => {
    const patterns = ENGINE_FORBIDDEN_CALLS.map((c) => c.pattern);
    expect(patterns).toEqual(
      expect.arrayContaining(['Math.random', 'Date.now', 'performance.now']),
    );
  });

  it('motorun alamayacağı adlandırılmış dışa aktarım listesi boşalmadı (2.3a, 2.7)', () => {
    // Bu liste MODÜL düzeyinde ifade edilemeyen yasakları taşıyor; boşalırsa
    // motor kimlik üretmeye, kendini ölçmeye ya da kendi değişmez kontrolünü
    // gevşetmeye başlar ve hiçbir kapı ötmez.
    const names = Object.keys(ENGINE_FORBIDDEN_SHARED_EXPORTS);
    expect(names).toContain('createCorrelationId');
    expect(names).toContain('measure');
    expect(names).toContain('configureAssertions');
  });

  it('sunucu alt yolu ÜÇ katmana birden kapalı — biri düşerse sınır delinir', () => {
    const rule = RESTRICTED_SUBPATHS['@fms/shared/server'];
    expect(rule).toBeDefined();
    expect(rule.forbiddenLayers).toEqual(
      expect.arrayContaining(['apps/web', 'packages/ui', 'packages/engine']),
    );
  });
});

describe('META: KANARYA — her kural sahte bir depoda gerçekten ötüyor mu', () => {
  let root;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'fms-arch-canary-'));

    const write = (relPath, content) => {
      const abs = join(root, relPath);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, content, 'utf8');
    };

    // Kural 1 — katman yönü: motor veritabanını import ediyor.
    write('packages/engine/package.json', JSON.stringify({ dependencies: { '@fms/db': '*' } }));
    write('packages/engine/src/layer.ts', "import { x } from '@fms/db';\nexport const a = x;\n");

    // Kural 2 — motor saflığı: yasaklı modül.
    write(
      'packages/engine/src/purity.ts',
      "import { readFileSync } from 'node:fs';\nexport const b = readFileSync;\n",
    );

    // Kural 3 — kısıtlı alt yol: tarayıcı sunucu girişini import ediyor.
    write('apps/web/package.json', JSON.stringify({ dependencies: { '@fms/shared': '*' } }));
    write(
      'apps/web/src/leak.ts',
      "import { loadEnv } from '@fms/shared/server';\nexport const c = loadEnv;\n",
    );

    // Kural 4 — bildirilmemiş bağımlılık: paket bildirilmemiş.
    write('apps/worker/package.json', JSON.stringify({ dependencies: {} }));
    write(
      'apps/worker/src/undeclared.ts',
      "import { y } from '@fms/shared';\nexport const d = y;\n",
    );

    // Kural 6 — motorun alamayacağı adlandırılmış dışa aktarım (2.3a).
    //
    // ⚠️ ÜÇ GİRDİNİN ÜÇÜ DE AYRI FIXTURE'LA KAPSANIYOR (2.7'de eklendi).
    // Kural düzeyinde tek fixture yeterli GÖRÜNÜR ama değildir: tabloya
    // `measure` eklenirken anahtar yanlış yazılsaydı (`Measure`, `measures`)
    // kural `createCorrelationId` üzerinden ötmeye devam eder, kanarya yeşil
    // kalır ve yeni yasak sessizce hiç uygulanmazdı. 2.3b'de `import-casing`
    // ile ölçülen körelmenin aynı sınıfı, bir kademe aşağıda.
    write(
      'packages/engine/src/forbidden-name.ts',
      "import { createCorrelationId } from '@fms/shared';\nexport const e = createCorrelationId;\n",
    );
    write(
      'packages/engine/src/forbidden-measure.ts',
      "import { measure } from '@fms/shared';\nexport const g = measure;\n",
    );
    write(
      'packages/engine/src/forbidden-configure.ts',
      "import { configureAssertions } from '@fms/shared';\nexport const h = configureAssertions;\n",
    );

    // Kural 5 — varlıkta mutlak yol.
    write('apps/api/package.json', JSON.stringify({ dependencies: {} }));
    write('apps/api/src/manifest.json', '{ "start_url": "/fms/" }\n');

    // Kural 7 — import yolu harf duyarlılığı (Faz 2.3b'de EKLENDİ).
    //
    // NEDEN SONRADAN: kanarya altı kuralı kapsıyordu, `import-casing` kapsam
    // DIŞINDAYDI. Ölçüldü (2.3b): `runArchCheck` içindeki bildirim satırı
    // susturulduğunda arch-check testlerinin **43'ü de geçti** —
    // `checkImportCasing`in beş birim testi saf fonksiyonu doğrudan çağırıyor,
    // kanarya da bu kurala hiç bakmıyordu. Yani kuralın KABLOLAMASI kopsa
    // `pnpm arch:check` "✓ temiz" derdi. Bu bölümün var olma sebebi (yukarıdaki
    // ② maddesi: "tablo doluyken kuralın kablolaması kopmuş olabilir") tam
    // olarak bu kuralda işlemiyordu.
    //
    // Platformdan bağımsız: karşılaştırma `readdirSync` çıktısı üzerinde dizge
    // eşleşmesiyle yapılıyor, dosya sistemi çözümlemesiyle değil — Windows'un
    // harf duyarsız dosya sisteminde de diskteki ad 'Widget.ts' okunur.
    write('packages/ui/package.json', JSON.stringify({ dependencies: {} }));
    write('packages/ui/src/Widget.ts', 'export const w = 1;\n');
    write('packages/ui/src/consumer.ts', "import { w } from './widget.js';\nexport const f = w;\n");
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('YEDİ kuralın hepsi ihlal bildiriyor', () => {
    const rules = runArchCheck(root).map((v) => v.rule);
    // Bu liste `index.mjs` başlığındaki kural listesiyle BİREBİR aynı olmalı.
    // Oraya yeni bir kural eklenip buraya eklenmezse kanarya onu görmez ve
    // kablolaması koptuğunda kapı sessizce körelir.
    for (const rule of [
      'layer-direction',
      'engine-purity',
      'import-casing',
      'asset-absolute-path',
      'restricted-subpath',
      'undeclared-dependency',
      'engine-forbidden-import',
    ]) {
      expect(rules).toContain(rule);
    }
  });

  it('yasaklı ÜÇ adın HER BİRİ ayrı ayrı ötüyor (2.7)', () => {
    // Kural sayısını değil, TABLO GİRDİLERİNİ sabitliyor. Yukarıdaki test
    // "kural ötüyor mu" diye sorar; bu test "hangi girdiler ötüyor" diye.
    const messages = runArchCheck(root)
      .filter((v) => v.rule === 'engine-forbidden-import')
      .map((v) => v.message);

    for (const name of Object.keys(ENGINE_FORBIDDEN_SHARED_EXPORTS)) {
      expect(messages.some((m) => m.includes(`'${name}'`))).toBe(true);
    }
  });

  it('temiz bir depoda ihlal ÜRETMİYOR — kanarya yanlış pozitif vermiyor', () => {
    const clean = mkdtempSync(join(tmpdir(), 'fms-arch-clean-'));
    try {
      mkdirSync(join(clean, 'packages/shared/src'), { recursive: true });
      writeFileSync(join(clean, 'packages/shared/package.json'), JSON.stringify({}), 'utf8');
      writeFileSync(join(clean, 'packages/shared/src/ok.ts'), 'export const a = 1;\n', 'utf8');
      expect(runArchCheck(clean)).toEqual([]);
    } finally {
      rmSync(clean, { recursive: true, force: true });
    }
  });
});
