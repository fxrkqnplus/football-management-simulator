/**
 * `docs/glossary.md`in NÖBETÇİSİ — kabul kriteri 5 burada yaşıyor.
 *
 * ÜÇ KATMAN, üçü ayrı iddia:
 *   ① **AYRIŞTIRICININ KARŞI KONTROLÜ** — araç da bir ölçüm aracıdır (D2).
 *      Bilinen bir terim tablosu okunmalı, terim OLMAYAN bir tablo
 *      okunmamalı. Tek yön yazılsaydı **her satırı terim sayan** bozuk bir
 *      ayrıştırıcı da geçerdi.
 *   ② **SAYI ve KAPSAM** — eşik (>= 120) tek başına KÖR bir kontrol
 *      (5.1'in dersi: 133 tane aynı satır da geçerdi). Dağılım kaynak
 *      bazında ayrı ayrı sabitleniyor.
 *   ③ **AYRIŞMA NÖBETÇİLERİ** — `CLAUDE.md` §14 ile **hem terim hem karşılık**
 *      eşleşmesi, ve kod envanterleriyle (`VISIBLE_ATTRIBUTES`,
 *      `HIDDEN_ATTRIBUTES`) eşleşme.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { parseSection14, parseStringConstant, parseTerms, TERM_TABLE_HEADER } from './index.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(join(REPO_ROOT, rel), 'utf8');

const glossary = read('docs/glossary.md');
const terms = parseTerms(glossary);
const section14 = parseSection14(read('CLAUDE.md'));

const inSection = (needle) => terms.filter((t) => t.section.includes(needle));

// ─────────────────────────────────────────────────────────────────────────────
// ① AYRIŞTIRICININ KARŞI KONTROLÜ
// ─────────────────────────────────────────────────────────────────────────────

describe('parseTerms — ayrıştırıcının kendi karşı kontrolü (D2)', () => {
  it('POZİTİF: terim tablosunu okuyor', () => {
    const doc = ['## Basiliklar', TERM_TABLE_HEADER, '|---|---|', '| Squad | Kadro |'].join('\n');
    expect(parseTerms(doc)).toEqual([{ en: 'Squad', tr: 'Kadro', section: 'Basiliklar', line: 4 }]);
  });

  it('NEGATİF: BAŞKA başlıklı bir tablo terim SAYILMIYOR', () => {
    // Belgede terim taşımayan dört tablo daha var (isimlendirme standardı,
    // sözlük/locale karşılaştırması, kullanılmayacak terimler, yazılmamış
    // kaynaklar). Ayrıştırıcı onları sayarsa eşik yalan söyler.
    const doc = ['## Baska', '| Kullanma | Kullan |', '|---|---|', '| skill | nitelik |'].join(
      '\n',
    );
    expect(parseTerms(doc)).toEqual([]);
  });

  it('NEGATİF: ayraç satırı ve başlık satırı terim değil', () => {
    const doc = [TERM_TABLE_HEADER, '|---|---|'].join('\n');
    expect(parseTerms(doc)).toEqual([]);
  });

  it('NEGATİF: tablo bittikten sonraki satırlar okunmuyor', () => {
    const doc = [
      TERM_TABLE_HEADER,
      '|---|---|',
      '| Squad | Kadro |',
      '',
      '| Kullanma | Kullan |',
      '| skill | nitelik |',
    ].join('\n');
    expect(parseTerms(doc).map((t) => t.en)).toEqual(['Squad']);
  });

  it('NEGATİF: üç sütunlu bir satır terim değil', () => {
    const doc = [TERM_TABLE_HEADER, '|---|---|', '| a | b | c |'].join('\n');
    expect(parseTerms(doc)).toEqual([]);
  });

  it('bölüm başlığı terime iliştiriliyor (dağılım bu alana dayanıyor)', () => {
    const doc = [
      '## Bir',
      TERM_TABLE_HEADER,
      '|---|---|',
      '| A | a |',
      '### Iki',
      TERM_TABLE_HEADER,
      '|---|---|',
      '| B | b |',
    ].join('\n');
    expect(parseTerms(doc).map((t) => t.section)).toEqual(['Bir', 'Iki']);
  });
});

describe('parseStringConstant — kod envanterini okuyor', () => {
  it('dizi sabitini okuyor', () => {
    expect(parseStringConstant(ts, "export const X = ['a', 'b'] as const;", 'X')).toEqual([
      'a',
      'b',
    ]);
  });

  it('kategorili NESNE sabitini de okuyor', () => {
    const source = "export const X = { a: ['p'], b: ['q', 'r'] } as const;";
    expect(parseStringConstant(ts, source, 'X')).toEqual(['p', 'q', 'r']);
  });

  it('TİP konumundaki literaller üye SAYILMIYOR', () => {
    const source = "export const X = ['a'] as const satisfies ReadonlyArray<'a' | 'zzz'>;";
    expect(parseStringConstant(ts, source, 'X')).toEqual(['a']);
  });

  it('sabit YOKSA null dönüyor — çağıran taraf bunu hata sayabilsin', () => {
    // `undefined`/`[]` dönseydi "sabit yok" ile "sabit boş" ayırt edilemezdi
    // ve eşleşme testi sessizce hiçbir şey iddia etmezdi.
    expect(parseStringConstant(ts, 'export const Y = 1;', 'X')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ② SAYI VE KAPSAM — kriter 5
// ─────────────────────────────────────────────────────────────────────────────

describe('KRİTER 5 — sözlükte en az 120 terim', () => {
  it('eşik: en az 120 terim tanımlı', () => {
    expect(terms.length).toBeGreaterThanOrEqual(120);
  });

  it('DAĞILIM kaynak bazında sabit — uzunluk tek başına kör bir kontroldür', () => {
    // 5.1'in dersi: 133 tane aynı satır da eşiği geçerdi. Bir bölümden satır
    // silinip başkasına eklenirse toplam korunur ama BU test kırılır.
    // 6.6: üç bölüm daha — §7.1 mevki kodları (db `PLAYER_POSITIONS`, 12),
    // §7.2 mevki yetkinliği (db `POSITION_LEVELS`, 5), §8 alan bileşeni
    // terimleri (20). Sayılar bilinçli GÜNCELLENDİ, gevşetilmedi: ilk on
    // alan-özel bileşen bu terimleri ekrana getirdi ve sözlük o gün büyüdü.
    expect({
      cekirdek: inSection('Çekirdek terimler').length,
      teknik: inSection('Teknik').length,
      zihinsel: inSection('Zihinsel').length,
      fiziksel: inSection('Fiziksel').length,
      kaleci: inSection('Kaleci').length,
      gizli: inSection('Gizli nitelikler').length,
      mevki: inSection('Mevki kodları').length,
      yetkinlik: inSection('Mevki yetkinliği').length,
      bilesen: inSection('Alan bileşeni').length,
    }).toEqual({
      cekirdek: 77,
      teknik: 14,
      zihinsel: 14,
      fiziksel: 8,
      kaleci: 11,
      gizli: 9,
      mevki: 12,
      yetkinlik: 5,
      bilesen: 20,
    });
  });

  it('toplam, bölümlerin toplamına EŞİT — sayılmayan bir tablo yok', () => {
    const sum = 77 + 14 + 14 + 8 + 11 + 9 + 12 + 5 + 20;
    expect(terms).toHaveLength(sum);
    expect(sum).toBe(170);
  });

  it('hiçbir terim TEKRARLANMIYOR', () => {
    // `injuryProneness` iki envanterde birden var; çekirdekte tutuluyor ve
    // gizli nitelik tablosundan çıkarıldı. Bu test o kararı SABİTLİYOR.
    const seen = new Map();
    for (const term of terms) seen.set(term.en, (seen.get(term.en) ?? 0) + 1);
    expect([...seen.entries()].filter(([, n]) => n > 1)).toEqual([]);
  });

  it('hiçbir karşılık BOŞ değil', () => {
    expect(terms.filter((t) => t.tr === '')).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ③ AYRIŞMA NÖBETÇİLERİ
// ─────────────────────────────────────────────────────────────────────────────

describe('CLAUDE.md §14 ile eşleşme — ANAHTAR ve DEĞER', () => {
  it('§14 okunabiliyor ve BOŞ DEĞİL', () => {
    // Bölüm yeniden adlandırılırsa aşağıdaki döngü sıfır kez koşar ve test
    // hiçbir şey iddia etmeden geçerdi (SAPMA-024 sınıfı).
    expect(section14).toHaveLength(77);
  });

  it('§14in HER satırı sözlükte AYNI karşılıkla var', () => {
    // ⚠️ Yalnızca terimleri karşılaştıran bir test, sözlüğün aynı İngilizce
    // terimi FARKLI bir Türkçeyle taşımasına izin verirdi ve iki liste o gün
    // ayrışmış olurdu. İddia bu yüzden ÇİFT.
    const map = new Map(terms.map((t) => [t.en, t.tr]));
    const mismatched = section14
      .filter((core) => map.get(core.en) !== core.tr)
      .map((core) => ({ terim: core.en, anayasa: core.tr, sozluk: map.get(core.en) }));
    expect(mismatched).toEqual([]);
  });
});

describe('Kod envanterleriyle eşleşme', () => {
  const visible = parseStringConstant(
    ts,
    read('packages/db/src/schema/player-attributes.ts'),
    'VISIBLE_ATTRIBUTES',
  );
  const hidden = parseStringConstant(
    ts,
    read('packages/db/src/schema/player-hidden-attributes.ts'),
    'HIDDEN_ATTRIBUTES',
  );

  it('sabitler okunabiliyor — 47 ve 10', () => {
    // Sabitler `spec/02`ye karşı kendi testleriyle ayrıca sabitlenmiş
    // (`player-attributes.test.ts`, `player-hidden-attributes.test.ts`), yani
    // buradaki İngilizce sütun spec'in makine-okunur izdüşümü.
    expect(visible).toHaveLength(47);
    expect(hidden).toHaveLength(10);
  });

  it('GÖRÜNÜR niteliklerin HEPSİ sözlükte', () => {
    const names = new Set(terms.map((t) => t.en));
    expect(visible.filter((name) => !names.has(name))).toEqual([]);
  });

  it('GİZLİ niteliklerin HEPSİ sözlükte — biri ÇEKİRDEKTE', () => {
    const core = new Set(inSection('Çekirdek terimler').map((t) => t.en));
    const inHiddenTable = new Set(inSection('Gizli nitelikler').map((t) => t.en));

    // ⚠️ **DEDUPE ADIYLA İDDİA EDİLİYOR, SESSİZ DEĞİL.** `injuryProneness`
    // iki envanterde birden var: kod adı olarak `HIDDEN_ATTRIBUTES`te, insan
    // okunur biçimiyle (`Injury Proneness`) `CLAUDE.md` §14'te. Sözlükte
    // ÇEKİRDEK biçimi tutuluyor ve gizli nitelik tablosundan çıkarıldı.
    // İki envanterin ayrık olduğu 5.0'da VARSAYILMIŞTI; 5.7'de ölçüldü ve
    // tek örtüşme bu çıktı (`77 + 57 = 134` değil, **133**).
    const DEDUPED = 'injuryProneness';
    const CORE_FORM = 'Injury Proneness';

    expect(hidden).toContain(DEDUPED);
    expect(core.has(CORE_FORM)).toBe(true);
    expect(inHiddenTable.has(DEDUPED)).toBe(false);

    // Geri kalan dokuzun HEPSİ gizli nitelik tablosunda, kod adıyla.
    const rest = hidden.filter((name) => name !== DEDUPED);
    expect(rest).toHaveLength(9);
    expect(rest.filter((name) => !inHiddenTable.has(name))).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ④ SÖZLÜK ↔ ÇEVİRİ DOSYASI — 6.6'da doğdu (K-5)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `docs/glossary.md` §7/§8 ↔ `apps/web/src/locales/tr/common.json` `ui.*`.
 *
 * Sözlüğün *"Sözlük mü, çeviri dosyası mı"* bölümü *"bir terim ikisinde birden
 * yaşadığında çeviri dosyası bu belgeye uyar"* diyor ve 6.6'ya kadar böyle bir
 * çakışma **yoktu** — nöbetçi de yoktu (*"bakacak bir şey bulamayan kontrol
 * onay değildir"*). 6.6 ilk çakışmayı doğurdu: on alan-özel bileşenin
 * etiketleri sözlükten **türetildi** ve `ui.*`a yazıldı. Türetmenin nöbetçisi
 * bu: §7/§8'in HER Türkçe karşılığı `ui.*` değerleri arasında **birebir** var.
 *
 * Kapsam bilerek §7/§8: 6.4/6.5'in cümle anahtarları (*"Seçiniz"*, *"Pencereyi
 * kapat"*) terim değildir. Ters yön (her `ui.*` değeri sözlükte) iddia
 * EDİLMİYOR ve sebebi var — `ui.*` cümle ve enterpolasyon şablonu da taşıyor
 * (*"Nitelik {{value}} — {{band}}"*); bir cümlenin "terim" olup olmadığı
 * makineyle ayrılamaz. Kapsamın sınırı burada yazılı, sessiz değil.
 */
describe('④ sözlük §7/§8 ↔ common.json ui.* — çeviri dosyası sözlüğe uyuyor', () => {
  const common = JSON.parse(read('apps/web/src/locales/tr/common.json'));
  const leafValues = (node, out = []) => {
    for (const value of Object.values(node)) {
      if (typeof value === 'string') out.push(value);
      else if (value !== null && typeof value === 'object') leafValues(value, out);
    }
    return out;
  };
  const uiValues = new Set(leafValues(common.ui));
  const componentTerms = [
    ...inSection('Mevki kodları'),
    ...inSection('Mevki yetkinliği'),
    ...inSection('Alan bileşeni'),
  ];

  it('nöbetçi BAKACAK BİR ŞEY buluyor — iki taraf da boş değil', () => {
    expect(componentTerms.length).toBeGreaterThan(0);
    expect(uiValues.size).toBeGreaterThan(0);
    // Anahtar taşıyan bir 6.6 grubu adıyla: tarama `ui.*`ın 6.6 kısmını görüyor.
    expect(common.ui).toHaveProperty('positionMap');
  });

  it('§7/§8 in HER Türkçe karşılığı `ui.*` değerleri arasında BİREBİR var', () => {
    const missing = componentTerms.filter((t) => !uiValues.has(t.tr)).map((t) => t.en);
    expect(missing).toEqual([]);
  });
});
