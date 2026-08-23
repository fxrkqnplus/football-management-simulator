/**
 * Projeye özel ESLint kuralları.
 *
 * Flat config'de yayınlanmış bir npm paketi gerekmez — `plugins` alanına
 * `{ rules: { ... } }` biçiminde düz bir nesne verilebilir. Bu dosya o nesnedir.
 *
 * ŞU AN BOŞ. Kurallar geldikleri fazda eklenir:
 *   - `no-hardcoded-path`     → Faz 1.4 (K6: kodda /api/... yazılmaz)
 *   - `no-hardcoded-turkish`  → Faz 5   (K5: arayüz metni t() üzerinden gelir)
 *
 * Kuralların kendi birim testleri Vitest kurulduğunda (Faz 1.5) yazılır.
 */
export default {
  meta: {
    name: 'local',
    version: '0.0.0',
  },
  rules: {},
};
