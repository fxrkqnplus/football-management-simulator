import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  checkImportCasing,
  isForbiddenEngineModule,
  isImportAllowed,
  resolveLayer,
  scanSource,
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
