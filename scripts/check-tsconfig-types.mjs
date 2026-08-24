/**
 * tsconfig `types` kapısı — `pnpm typecheck` içinde, turbo'dan ÖNCE çalışır.
 *
 * NEDEN VAR: TypeScript 6.0'da `types` varsayılan olarak BOŞ hale geldi.
 * TS 5'te `@types/node` kurulu olması onu görünür kılmaya yeterdi; TS 6'da
 * yetmiyor. Bu sessiz bir tuzak: bir paketin tsconfig'inde `types` yazmayı
 * unutursanız derleme "Cannot find name 'process'" der ve gerçek sebep
 * (eksik bir satır) hata mesajında hiç geçmez.
 *
 * Kapı üç şeyi zorlar:
 *   1. Her workspace paketinin kendi tsconfig.json'ı vardır
 *   2. `compilerOptions.types` o dosyada AÇIKÇA yazılıdır (miras alınmış
 *      varsayılana güvenilmez — niyet görünür olmalı)
 *   3. packages/engine `types: []` taşır ve @types/node'a bağımlı DEĞİLDİR (K3)
 *
 * Bootstrap betiği: logger yok, console yok (K8), doğrudan stderr.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** pnpm-workspace.yaml'ı ayrıştırmadan, bilinen paket köklerini gez. */
const PACKAGE_DIRS = [
  'packages/shared',
  'packages/engine',
  'packages/db',
  'packages/ui',
  'apps/web',
  'apps/api',
  'apps/worker',
  'tools/data-cli',
];

const PURE_PACKAGE = 'packages/engine';
const errors = [];

for (const dir of PACKAGE_DIRS) {
  const tsconfigPath = join(root, dir, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) {
    errors.push(`${dir}: tsconfig.json yok`);
    continue;
  }

  const parsed = ts.parseConfigFileTextToJson(tsconfigPath, readFileSync(tsconfigPath, 'utf8'));
  if (parsed.error) {
    errors.push(`${dir}/tsconfig.json: ayrıştırılamadı`);
    continue;
  }

  const types = parsed.config?.compilerOptions?.types;
  if (!Array.isArray(types)) {
    errors.push(
      `${dir}/tsconfig.json: compilerOptions.types AÇIKÇA yazılmamış.\n` +
        `      TS 6'da types varsayılan boştur; miras alınan değere güvenme.\n` +
        `      Node tarafı paket ise ["node"], tarayıcı/saf paket ise [] yaz.`,
    );
    continue;
  }

  if (dir === PURE_PACKAGE) {
    if (types.length !== 0) {
      errors.push(
        `${dir}/tsconfig.json: types ${JSON.stringify(types)} — boş olmalı.\n` +
          `      K3: motor saftır, Node API'lerini tip seviyesinde bile görmemeli.`,
      );
    }
    const pkg = JSON.parse(readFileSync(join(root, dir, 'package.json'), 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps['@types/node']) {
      errors.push(`${dir}/package.json: @types/node bağımlılığı var — K3 ihlali.`);
    }
  }
}

if (errors.length > 0) {
  process.stderr.write(`\n  ✖ tsconfig types kapısı ${errors.length} ihlal buldu:\n\n`);
  for (const e of errors) process.stderr.write(`    • ${e}\n`);
  process.stderr.write('\n');
  process.exit(1);
}

process.stdout.write(`✓ tsconfig types kapısı: ${PACKAGE_DIRS.length} paket temiz\n`);
