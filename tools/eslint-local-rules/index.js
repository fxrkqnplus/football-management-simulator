/**
 * Projeye özel ESLint kuralları.
 *
 * Flat config'de yayınlanmış bir npm paketi gerekmez — `plugins` alanına
 * `{ rules: { ... } }` biçiminde düz bir nesne verilebilir. Bu dosya o nesnedir.
 *
 * Kurallar geldikleri fazda eklenir:
 *   - `no-hardcoded-path`     → Faz 1.4 ✓ (K6)
 *   - `no-hardcoded-turkish`  → Faz 5    (K5: arayüz metni t() üzerinden gelir)
 */
import noHardcodedPath from './no-hardcoded-path.js';

export default {
  meta: {
    name: 'local',
    version: '0.0.0',
  },
  rules: {
    'no-hardcoded-path': noHardcodedPath,
  },
};
