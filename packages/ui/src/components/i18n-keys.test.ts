/**
 * ① ÖN EK SÖZLEŞMESİNİN NÖBETÇİSİ — 6.0 ⑤'in *"nöbetçi ilk anahtarı yazan alt
 *    görevde gelir"* sözü 6.4'te ödendi.
 * ② `UI_KEYS` BÜTÜNLÜK NÖBETÇİSİ — 6.5'te eklendi, ve **bir iddianın
 *    çürütülmesiyle** doğdu.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * ⚠️ ②'NİN NEDEN VAR OLDUĞU — `i18n-keys.ts`in KENDİ BAŞLIĞI YANLIŞTI
 * ════════════════════════════════════════════════════════════════════════════
 *
 * 6.4 şunu yazdı: *"İki liste yok — biri diğerinin türevi, **ayrışmaları
 * mümkün değil**."* **Ölçüldü ve iddia yanlış çıktı.**
 *
 * `ALL_UI_KEYS` gerçekten bir türev. Ama `UI_KEYS`in kendisi
 * (`{ select: SELECT_KEYS, combobox: COMBOBOX_KEYS }`) **elle tutulan bir
 * kayıt defteri** — hiçbir şeyin türevi değil. Ve 6.4'ün yedi vakasının
 * **yedisi de** yalnızca *zaten kayıtlı olanı* dolaşıyordu (`ALL_UI_KEYS` /
 * `Object.entries(UI_KEYS)`); **hiçbiri diske bakmıyordu.**
 *
 * Sessiz senaryo: 6.5 `dialog.tsx`e `DIALOG_KEYS` yazar ve `UI_KEYS`e eklemeyi
 * unutur →
 *   · yedi vaka **yeşil** (kayıtlı olanlar hâlâ kurallı)
 *   · *"nöbetçi bakacak bir şey buluyor"* **yeşil** (öbür anahtarlar duruyor)
 *   · `pnpm i18n:check` **yeşil** (`t(X.y)`yi aynı dosyada çözüyor, anahtar
 *     tanımlı ve kullanılıyor)
 *   · ve **ön ek sözleşmesi o bileşen için hiç zorlanmaz**
 *
 * *"İki liste bir gün ayrışır"*ın tanınması en zor biçimi: ikinci liste bir
 * **türev gibi görünüyordu**. Kalıcı ders: **türetmenin nerede başladığı
 * ölçülür** — ve **bir dosyanın kendi başlığındaki iddia da bir iddiadır.**
 *
 * ⚠️ ②'nin diski okuma biçimi `import.meta.glob` (Vite) — `node:fs` DEĞİL.
 * Gerekçe `module-glob.d.ts`te: `types: []` kararı delinmiyor.
 */
import { describe, expect, it } from 'vitest';

import { ALL_UI_KEYS, UI_KEY_PREFIX, UI_KEYS } from './i18n-keys.js';

const keys = ALL_UI_KEYS;

describe('① `common:ui.` ön ek sözleşmesi', () => {
  it('nöbetçi BAKACAK BİR ŞEY buluyor — boş bir envanter onay değildir', () => {
    // SAPMA-024: bakacak bir şey bulamayan kapıya ✅ yazılmaz. 6.0 nöbetçiyi
    // tam bu yüzden ertelemişti (`common.ui` o gün YOKTU).
    expect(keys.length).toBeGreaterThan(0);
  });

  it('ön ek NOKTA ile bitiyor — `ui` `uiHelper`ı yanlışlıkla yakalamasın', () => {
    // Gerekçe `i18n-dynamic-keys.ts`ten birebir; orada ölçülmüş bir vaka.
    expect(UI_KEY_PREFIX.endsWith('.')).toBe(true);
    expect(UI_KEY_PREFIX).toBe('common:ui.');
  });

  it('HER anahtar ön ekle başlıyor', () => {
    for (const key of keys) expect(key.startsWith(UI_KEY_PREFIX)).toBe(true);
  });

  it('HER anahtar `<bileşenAdı>.<alan>` biçiminde — en az iki parça', () => {
    for (const key of keys) {
      const segments = key.slice(UI_KEY_PREFIX.length).split('.');
      expect(segments.length).toBeGreaterThanOrEqual(2);
      for (const segment of segments) expect(segment).toMatch(/^[a-z][a-zA-Z0-9]*$/);
    }
  });

  it('GRUP ADI ile anahtarın BİLEŞEN PARÇASI aynı — envanter kendi içinde tutarlı', () => {
    for (const [group, groupKeys] of Object.entries(UI_KEYS)) {
      for (const key of Object.values(groupKeys)) {
        expect(key.slice(UI_KEY_PREFIX.length).split('.')[0]).toBe(group);
      }
    }
  });

  it('ON BİRİNCİ NAMESPACE AÇILMADI — hepsi `common`da', () => {
    for (const key of keys) expect(key.split(':')[0]).toBe('common');
  });

  it('hiçbir anahtar tekrarlamıyor', () => {
    expect(new Set(keys).size).toBe(keys.length);
  });
});

/**
 * Diskteki bütün bileşen modülleri — **paketleyici** topluyor.
 *
 * `eager: true`, yani modüller gerçekten değerlendirilmiş hâlde geliyor;
 * dışa aktarım adlarına **çalışma zamanında** bakabiliyoruz. Bir regex ile
 * kaynak taramak yerine gerçek değerleri okumak önemli: yorum içindeki bir
 * `export const X_KEYS` yanlış pozitif üretirdi.
 *
 * ⚠️ **`!./*.test.tsx` BİR ZORUNLULUK — ölçümle bulundu.** Desen ilk yazımda
 * yalnızca `'./*.tsx'` idi ve `eager: true` **test dosyalarını da** gerçekten
 * değerlendirdi: her test dosyasının `describe`/`it` blokları **bu dosyaya**
 * kaydoldu ve paketin bütün testleri **iki kez** koştu. Belirti sessizdi —
 * kırmızı yoktu, yalnızca sayı büyüdü (11 yerine 67). **Bir nöbetçinin kendi
 * ölçüm aracını bozması (D2).**
 *
 * ⚠️ **YANLIŞI GÖSTEREN ŞEY TARANAN MODÜL SAYISI OLDU** (*"18 modül"* =
 * 9 bileşen + 9 test). O sayı o gün geçici olarak **basılıyordu**; basma
 * sonradan **K8 yüzünden kaldırıldı** (aşağıdaki bloğa bak) ve yerine sınırın
 * kendisi bir **iddiaya** çevrildi — yani aynı hata bugün kırmızıyla, bir
 * çıktı satırıyla değil, yakalanır.
 */
const componentModules = import.meta.glob(['./*.tsx', '!./*.test.tsx'], { eager: true });

/**
 * `./dialog.tsx` → `dialog` · `./attribute-badge.tsx` → `attributeBadge`.
 *
 * ⚠️ **6.6'DA DEĞİŞTİ — ve önce KIRILDI.** 6.5'in `moduleName`i dosya adını
 * olduğu gibi grup adı sayıyordu; beş modülün beşi tek kelimelikti ve fark
 * görünmüyordu. 6.6'nın ilk çok kelimeli bileşeni (`attribute-badge.tsx`)
 * gelince nöbetçi **üç vakada birden** kırıldı (YÖN ① sekiz "kayıtsız", YÖN ②
 * sekiz "hayalet", referans eşitliği `undefined`): anahtar segmenti tire
 * taşıyamaz (`/^[a-z][a-zA-Z0-9]*$/`), dosya adı ise kebab-case (§1.3). Köprü
 * bu fonksiyon — tek yer, iki liste değil.
 */
const groupNameOf = (path: string): string =>
  path
    .replace(/^\.\//, '')
    .replace(/\.tsx$/, '')
    .replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());

/** Diskte `*_KEYS` dışa aktaran her modül: grup adı → anahtar nesnesi. */
const keysOnDisk = new Map<string, Record<string, unknown>>();
/** Modül başına `*_KEYS` dışa aktarım SAYISI — birden fazlası yasak (aşağıda). */
const keysExportCount = new Map<string, number>();
for (const [path, module] of Object.entries(componentModules)) {
  for (const [exportName, value] of Object.entries(module)) {
    if (!exportName.endsWith('_KEYS')) continue;
    if (typeof value !== 'object' || value === null) continue;
    const group = groupNameOf(path);
    keysExportCount.set(group, (keysExportCount.get(group) ?? 0) + 1);
    keysOnDisk.set(group, value as Record<string, unknown>);
  }
}

describe('② `UI_KEYS` BÜTÜNLÜK NÖBETÇİSİ — kayıt defteri diskle örtüşüyor mu', () => {
  /**
   * ⚠️ **KAPSAM BASILMIYOR, İDDİA EDİLİYOR — ve bunun sebebi ölçüldü.**
   *
   * `scripts/inventory-guards.test.mjs` kapsamını `process.stdout.write` ile
   * **basıyor**. O idiom buraya **taşınamıyor** ve iki ayrı anayasa kuralı
   * yüzünden: **K8** (`process.stdout/stderr.write` ürün kodunda yasak;
   * muafiyet yalnızca `scripts/` ve `tools/`) ve `packages/ui`nin
   * **`types: []`** kararı (`process` tipi yok). İkisi de bir nöbetçinin
   * rahatlığı için açılmaz.
   *
   * Testteki karşılığı bir **iddia**: taramanın *"hiçbir şeye bakmadığı"*
   * ihtimali, beklenen modüllerin **adıyla** aranmasıyla eleniyor. Glob bir gün
   * sessizce boşalırsa (yanlış desen, taşınmış klasör) bu test kırılır ve
   * kırılma mesajı hangi modülün eksik olduğunu **söyler** — basılmış bir
   * satırdan daha güçlü, çünkü yeşil koşuda kimsenin okumadığı bir çıktı
   * değil.
   */
  it('nöbetçi BAKACAK BİR ŞEY buluyor — beklenen modüller ADIYLA taranmış', () => {
    const scanned = Object.keys(componentModules).map(groupNameOf).sort();
    expect(scanned.length).toBeGreaterThan(0);
    // Anahtar TAŞIYAN ve TAŞIMAYAN birer örnek: tarama her ikisini de görüyor.
    expect(scanned).toContain('dialog');
    expect(scanned).toContain('skeleton');
    // 6.6: çok kelimeli bir modül (anahtarlı) ve anahtarsız bir 6.6 modülü —
    // kebab→camelCase köprüsünün gerçekten çalıştığı da burada iddia ediliyor.
    expect(scanned).toContain('attributeBadge');
    expect(scanned).toContain('dateChip');
    expect(keysOnDisk.size).toBeGreaterThan(0);
  });

  it('modül başına EN FAZLA BİR `*_KEYS` dışa aktarımı — ikincisi kayıt defterini EZER', () => {
    // planci ②'nin bulgusu (6.6): `ATTRIBUTE_BAND_KEYS` gibi ikinci bir `_KEYS`
    // dışa aktarımı yukarıdaki haritada aynı gruba yazılır ve ES modül ad alanı
    // alfabetik olduğu için (D < N) asıl kayıt defterini sessizce ezerdi —
    // referans eşitliği o gün kırmızıya dönerdi ama "neden" görünmezdi. Kural
    // hata oluşabilecek hâldeyken yazıldı (DZ-12): ad listeleri `_KEYS` ile
    // BİTMEZ (`ATTRIBUTE_BAND_KEY_ORDER`).
    const offenders = [...keysExportCount.entries()].filter(([, count]) => count > 1);
    expect(offenders).toEqual([]);
  });

  it('TARAMA TEST DOSYALARINI İÇERMİYOR — kapsamın sınırı da iddia ediliyor', () => {
    // 6.5'te ölçüldü: desen `'./*.tsx'` iken `*.test.tsx` de içe aktarılıyordu
    // ve `eager: true` onların `describe`/`it` bloklarını BU dosyaya kaydediyordu
    // (paketin bütün testleri iki kez koştu). Sınır artık iddia ediliyor.
    for (const path of Object.keys(componentModules)) {
      expect(path).not.toMatch(/\.test\.tsx$/);
    }
  });

  it('YÖN ①: diskteki her `*_KEYS` `UI_KEYS`te KAYITLI', () => {
    // 6.5'in gerçek tuzağı: yeni bir bileşen anahtarını tanımlar ama kayıt
    // defterine eklemeyi unutur. O gün ne `i18n:check` ne ① ötüyordu.
    const unregistered = [...keysOnDisk.keys()].filter((name) => !(name in UI_KEYS)).sort();
    expect(unregistered).toEqual([]);
  });

  it('YÖN ②: `UI_KEYS`in her girdisi GERÇEK bir modülden geliyor', () => {
    // Ters yön: silinmiş bir bileşenin girdisi kayıt defterinde kalırsa
    // `ALL_UI_KEYS` var olmayan bir anahtar taşır ve `i18n:check` onu
    // "kullanılmayan" diye bildirir — sebebi burada görünür olsun.
    const phantom = Object.keys(UI_KEYS)
      .filter((name) => !keysOnDisk.has(name))
      .sort();
    expect(phantom).toEqual([]);
  });

  it('KAYITLI nesne diskteki nesnenin TA KENDİSİ — kopya değil', () => {
    // Kayıt defteri anahtarları KOPYALARSA (yayarak değil) iki liste yine
    // ayrışır: disk değişir, kopya kalır. Referans eşitliği bunu kapatıyor.
    for (const [name, onDisk] of keysOnDisk) {
      expect(UI_KEYS[name as keyof typeof UI_KEYS]).toBe(onDisk);
    }
  });
});
