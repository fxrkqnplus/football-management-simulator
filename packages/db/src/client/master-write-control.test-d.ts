/**
 * K4 KONTROL DENEYİ — *"master tabloya yazma tip seviyesinde derlenmez"*
 * iddiasının kendi kendini denetlemesi.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * BU DOSYA NASIL ÇALIŞIR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Aşağıdaki yazma girişimleri `@ts-expect-error` ile işaretli. TypeScript bu
 * yönergeyi **tersine** yorumlar: işaretli satır hata **üretmezse** derleyici
 * *"Unused '@ts-expect-error' directive"* der ve **`pnpm typecheck` KIRILIR.**
 *
 * Yani koruma kaybolduğu gün bu dosya sessiz kalmaz — kapıyı kırar. Bir birim
 * testi bunu yapamazdı: tip hatası çalışma zamanına hiç ulaşmaz, `expect` yazacak
 * bir yer yoktur (`.test.ts` değil, **`.test-d.ts`** olmasının sebebi bu — Vitest
 * onu koşmaz, `tsc` denetler).
 *
 * **Neden gerekli:** Faz 2'de *"üç kat savunma"* iddiası ölçümle çürütüldü
 * (SAPMA-012) — inanılan koruma çalışmıyordu ve bunu yalnızca bir kontrol deneyi
 * gösterdi. Tip seviyesi bir iddia, kontrol deneyi olmadan **temenni**dir.
 *
 * ⚠️ `no-unsafe-call` bu dosyada KAPALI ve bu bilinçli: buradaki çağrıların
 * **geçersiz olması** amaç. ESLint "çözümlenemeyen bir tipte çağrı" derken haklı —
 * ama tam olarak o geçersizlik kanıtın kendisi. Kural açık bırakılsaydı dosya
 * lint'ten geçmezdi ve kanıt silinirdi.
 *
 * ⚠️ Dosyanın kendisi `dist`e girmiyor (`tsconfig.build.json` `.test-d.ts`
 * dışlıyor) ama tip denetiminin İÇİNDE — `tsconfig.json` onu kapsıyor.
 */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { eq } from 'drizzle-orm';
import { integer, pgTable, text } from 'drizzle-orm/pg-core';

import { countries } from '../schema/countries.js';
import { masterTable } from './master.js';
import type { MasterDb, WritableDb } from './world-db.js';

declare const master: MasterDb;
declare const writable: WritableDb;

/** Master OLMAYAN bir tablo — karşı örnek. Reddin seçici olduğunu gösterir. */
const saveScoped = pgTable('probe_save_scoped', {
  id: integer('id').primaryKey(),
  note: text('note'),
});

// ─────────────────────────────────────────────────────────────────────────────
// ① MASTER İSTEMCİSİNDE YAZMA METODU YOK
// ─────────────────────────────────────────────────────────────────────────────

// @ts-expect-error K4: master istemcisinde `insert` yok.
master.insert(countries);

// @ts-expect-error K4: master istemcisinde `update` yok.
master.update(countries);

// @ts-expect-error K4: master istemcisinde `delete` yok.
master.delete(countries);

// ─────────────────────────────────────────────────────────────────────────────
// ② YAZILABİLİR İSTEMCİYLE BİLE MASTER TABLOYA YAZILAMAZ
//
// Asıl koruma bu. Yalnızca ① olsaydı, doğru istemciyi alıp yanlış tabloya
// yazmak derlenirdi — ve K4 istemciyi değil TABLOYU koruyor.
// ─────────────────────────────────────────────────────────────────────────────

// @ts-expect-error K4: `countries` master; parametre tipi `never`.
writable.insert(countries);

// @ts-expect-error K4: `countries` master; parametre tipi `never`.
writable.update(countries);

// @ts-expect-error K4: `countries` master; parametre tipi `never`.
writable.delete(countries);

// ─────────────────────────────────────────────────────────────────────────────
// ③ KARŞI ÖRNEK — reddin SEÇİCİ olduğunun kanıtı
//
// Bunlar `@ts-expect-error` TAŞIMIYOR ve derlenmeli. Taşısalardı ve yine de
// derlenselerdi, "her şey reddediliyor" durumunu ②'den ayırt edemezdik —
// yani ② hiçbir şey kanıtlamazdı (Faz 2 §5 D3: nöbetçi İKİ YÖNLÜ doğrulanır).
// ─────────────────────────────────────────────────────────────────────────────

writable.insert(saveScoped);
writable.update(saveScoped);
writable.delete(saveScoped);

// Okuma her iki istemcide de serbest.
master.select().from(countries);
writable.select().from(countries).where(eq(countries.code, 'TUR'));

// ─────────────────────────────────────────────────────────────────────────────
// ④ İŞARETLEME KİMLİK FONKSİYONUDUR
//
// `masterTable()` çalışma zamanında hiçbir şey yapmaz; yalnızca tipi daraltır.
// Bu satır o sözleşmeyi tipte sabitliyor.
// ─────────────────────────────────────────────────────────────────────────────

const marked = masterTable(saveScoped);
// @ts-expect-error İşaretlendikten sonra artık yazılamaz.
writable.insert(marked);
