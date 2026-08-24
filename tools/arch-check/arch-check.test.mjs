import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  basePackageOf,
  checkImportCasing,
  isDependencyDeclared,
  isForbiddenEngineModule,
  isImportAllowed,
  resolveLayer,
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
