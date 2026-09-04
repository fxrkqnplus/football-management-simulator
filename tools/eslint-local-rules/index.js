/**
 * Projeye özel ESLint kuralları.
 *
 * Flat config'de yayınlanmış bir npm paketi gerekmez — `plugins` alanına
 * `{ rules: { ... } }` biçiminde düz bir nesne verilebilir. Bu dosya o nesnedir.
 *
 * Kurallar geldikleri fazda eklenir:
 *   - `no-hardcoded-path`  → Faz 1.4 ✓ (K6)
 *   - `no-bare-jsx-text`   → Faz 5.5 ✓ (K5: arayüz metni t() üzerinden gelir)
 *
 * ⚠️ İKİNCİ KURAL BU SATIRDA `no-hardcoded-turkish` DİYE AYRILMIŞTI ve adı
 * 5.5'te **ölçüm gerekçesiyle** değişti: 5.4 ölçtü ki yakalanacak ihlallerin
 * bir kısmı hiçbir Türkçe karakter taşımıyor (`Tekrar dene`) ve bir kısmı
 * doğrudan İngilizce (`api prefix`) — yani kural **dile bakamaz**, baktığı şey
 * *"JSX'te çıplak metin"*. Bir ad bir sözleşmedir; yanlış ad kuralı
 * örneklerinden geriye okuyan birine yanlış öğretir. → **SAPMA-039**
 */
import noBareJsxText from './no-bare-jsx-text.js';
import noHardcodedPath from './no-hardcoded-path.js';

export default {
  meta: {
    name: 'local',
    version: '0.0.0',
  },
  rules: {
    'no-bare-jsx-text': noBareJsxText,
    'no-hardcoded-path': noHardcodedPath,
  },
};
