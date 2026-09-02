/**
 * bash-text-guard — `PreToolUse` kancası: metnin kabuktan geçmesini ATEŞLENDİĞİ
 * ANDA engeller.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN VAR — kural doğruydu, ÜÇ KEZ ÜST ÜSTE ihlal edildi
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `PROJECT_MEMORY.md` ORTAM TUZAKLARI ⑤ şunu yazıyor: *"Markdown/Türkçe metin
 * hiçbir kabuk argümanından geçmez — `node -e`, `python -c`, heredoc, tırnaklı
 * dize aynı sınıf."* Kural gerçek bir hasardan doğdu ve bedeli ölçüldü:
 *
 * | Günlük | Alt görev | Ne yapıldı | Bedel |
 * |---|---|---|---|
 * | **#3** | 4.0b | `node -e "…"` ile üç ANLIK DURUM satırı düzenlendi | Ters tırnaklı her parça **sessizce boşaldı**; iki adet 0 baytlık artık dosya. Betik `degistirilen satir: 3` diyerek **başarı raporladı** |
 * | **#14** | 4.4 | `python` heredoc'u ile iki test başlığı değiştirildi | Bozulma **yok** — ölçüldü |
 * | **#19** | 4.5 | ① `cat >> … << 'XEOF'` ② **commit mesajı** `git commit -F - << 'GITEOF'` | Bozulma **yok** — ölçüldü. İkincisi ağırdı: bir dosya `Edit` ile onarılır, **commit mesajı geçmişe yazılır** |
 *
 * İkisinde bedel sıfırdı ve tam olarak bu yüzden tehlikeliydi: #14 kuralı
 * *"aynen duruyor"* diye kapattı, bir sonraki alt görev onu **iki kez**
 * tekrarladı. **Bir kuralı ihlal edip yakalanmamak, kuralın gereksiz olduğunu
 * değil o turda şanslı olunduğunu gösterir.**
 *
 * ⚠️ **TEŞHİS: SORUN KURALDA DEĞİL, KURALIN YAŞADIĞI YERDE.** Kural bugüne
 * kadar yalnızca `PROJECT_MEMORY.md`'de ve günlükte yaşıyordu — yani
 * `cat >> … <<` yazıldığı anda **hiçbir yerde görünmüyordu**. Bu SAPMA-033'ün
 * sınıfı: *"bir kuralın kontrol eden adımı yoksa, ateşlendiğinde hiçbir şey
 * olmaz."* Çare kuralı zayıflatmak değil, **ateşlendiği anda görünür kılmak**.
 *
 * Emsal güçlü ve aynı aileden: `scripts/check-tsconfig-types.mjs` tam olarak
 * *"TS 6'da `types` boş varsayılıyor ve biri unutacak"* diye yazıldı;
 * `tools/arch-check`, `tools/eslint-local-rules`, `scripts/check-env-file.mjs`
 * aynı desen — **bir kuralı koşan bir adıma çevirmek**.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * KAPSAM BİLEREK DAR — ve darlık ÖLÇÜLDÜ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Reddedilen komut: bir **taşıyıcı** (heredoc · `node -e` · `python -c`)
 * taşıdığı yük **ters tırnak** veya **ASCII olmayan bayt** içeriyorsa.
 *
 * ⚠️ **İki koşul birden aranıyor, biri değil.** Yalnızca taşıyıcıya bakan bir
 * kural saf ASCII SQL heredoc'larını da reddederdi ve bu projede onlar meşru
 * (`psql << 'SQL'`). Yalnızca yüke bakan bir kural her Türkçe `git commit -m`
 * argümanını reddederdi — oysa tek argümanlı tırnaklı bir dizede kabuk ikamesi
 * yapılmıyor ve üç vakanın hiçbiri o biçimde değildi.
 *
 * **Üç ihlalin üçü de bu imzayı taşıyor** (ölçüldü):
 *   #3  → `node -e` + ters tırnak + Türkçe
 *   #14 → heredoc + Türkçe
 *   #19 → heredoc + Türkçe + ters tırnak + `→` + `§`
 *
 * ⚠️ **KANCANIN KENDİ KAÇIŞ YOLU YOK — bilerek.** Bir `SKIP=1` çevre değişkeni
 * ya da `# guard:allow` yorumu, kuralın ihlal edildiği her anda ulaşılabilir
 * bir kapı bırakırdı ve üç vakanın üçünde de o kapı kullanılırdı. Doğru yol
 * zaten yazılı: metin `Edit`/`Write` ile yazılır, commit mesajı bir dosyaya
 * yazılıp `git commit -F <dosya>` ile verilir.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * SÖZLEŞME
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `stdin` → JSON (`{ tool_name, tool_input: { command } }`).
 * Çıkış kodu **2** = engelle (`stderr` gerekçeyi taşır), **0** = geçir.
 *
 * ⚠️ **AÇILAMAYAN BİR GİRDİ ENGELLEMEZ.** Bozuk JSON, eksik alan ya da
 * `Bash` olmayan bir araç → çıkış **0**. Gerekçe: bu kanca bir güvenlik sınırı
 * değil, bir **hatırlatıcı**; kendi hatası yüzünden her komutu kilitlemesi
 * kuralın kendisinden daha pahalı olurdu. Bu bir karar ve kendi testi var.
 */

import { pathToFileURL } from 'node:url';

/** Metni taşıyabilen kabuk biçimleri. Ad, hata mesajında görünür. */
const CARRIERS = [
  { name: 'heredoc (<<)', pattern: /<</ },
  { name: 'node -e / --eval', pattern: /\bnode\b[^\n]*?\s(?:-e|--eval)\b/ },
  { name: 'python -c', pattern: /\bpython3?\b[^\n]*?\s-c\b/ },
];

/**
 * Kabuğun sessizce bozduğu ya da bozabildiği yük işaretleri.
 *
 * ⚠️ ASCII denetimi **regex ile değil** kod noktasıyla yapılıyor: `[^\x00-\x7F]`
 * `no-control-regex` ile lint'i kırıyor (ölçüldü) ve kuralı `eslint-disable` ile
 * susturmak, kaçış deliği açmadan yazılabilecek bir kontrolü susturmak olurdu.
 * `codePointAt` çok baytlı karakterleri de doğru sayıyor (vekil çift değil,
 * gerçek kod noktası) — `→` ve `§` gibi işaretler üç ihlalin ikisinde vardı.
 */
const PAYLOAD_MARKERS = [
  { name: 'ters tırnak (`)', test: (command) => command.includes('`') },
  {
    name: 'ASCII olmayan bayt',
    test: (command) => [...command].some((character) => (character.codePointAt(0) ?? 0) > 0x7f),
  },
];

/**
 * Bir kabuk komutunu denetler.
 *
 * @param {string} command
 * @returns {{ blocked: boolean, carriers: string[], markers: string[] }}
 */
export function inspectBashCommand(command) {
  if (typeof command !== 'string' || command.length === 0) {
    return { blocked: false, carriers: [], markers: [] };
  }

  const carriers = CARRIERS.filter((carrier) => carrier.pattern.test(command)).map(
    (carrier) => carrier.name,
  );
  const markers = PAYLOAD_MARKERS.filter((marker) => marker.test(command)).map(
    (marker) => marker.name,
  );

  return { blocked: carriers.length > 0 && markers.length > 0, carriers, markers };
}

/**
 * Engelleme gerekçesi — kurtarma yolunu **adıyla** taşır.
 *
 * ⚠️ Faz 3.10'un kuralı: *"bir kapının kurtarma yolu da bir iddiadır"* — mesaj
 * yalnızca *"yasak"* deseydi, kancayı gören taraf kuralı sadeleştirmeye
 * çalışırdı. Doğru yol burada yazılı.
 *
 * @param {{ carriers: string[], markers: string[] }} verdict
 * @returns {string}
 */
export function blockMessage(verdict) {
  return [
    'bash-text-guard: metin kabuktan geçirilemez.',
    `  taşıyıcı : ${verdict.carriers.join(', ')}`,
    `  yük      : ${verdict.markers.join(', ')}`,
    '',
    '  Kural: PROJECT_MEMORY.md ORTAM TUZAKLARI ⑤ + günlük #3 / #14 / #19.',
    '  #3 bu sınıfta gerçek hasar üretti: ters tırnaklı parçalar SESSİZCE boşaldı',
    '  ve betik yine "başarı" raporladı.',
    '',
    '  Doğru yol:',
    '    · dosya içeriği      → Edit / Write araçları',
    '    · commit mesajı      → mesajı Write ile bir dosyaya yaz, git commit -F <dosya>',
    '    · saf ASCII SQL/veri → bu kanca ona dokunmuyor, ters tırnağı kaldırman yeter',
  ].join('\n');
}

/**
 * `stdin`i sonuna kadar okur.
 *
 * @returns {Promise<string>}
 */
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  let payload;
  try {
    payload = JSON.parse(await readStdin());
  } catch {
    // Açılamayan girdi engellemez — dosya başlığındaki karar.
    process.exit(0);
  }

  if (payload?.tool_name !== 'Bash') process.exit(0);

  const verdict = inspectBashCommand(payload?.tool_input?.command);
  if (!verdict.blocked) process.exit(0);

  process.stderr.write(`${blockMessage(verdict)}\n`);
  process.exit(2);
}

// Doğrudan çalıştırıldığında CLI, import edildiğinde saf modül.
//
// ⚠️ `pathToFileURL` — elle `file://` + yol birleştirmesi Windows'ta YANLIŞ
// üretir (`C:\fms\…` ters bölü ve sürücü harfi taşıyor). Ortam Windows +
// pwsh 7; bu satır orada da doğru olmak zorunda.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
