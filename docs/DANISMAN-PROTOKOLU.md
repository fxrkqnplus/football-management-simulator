# DANIŞMAN PROTOKOLÜ — Cowork oturumundaki rolün sözleşmesi

> **6.6-ön'de yazıldı (2026-09-11).** Bu depo iki oturumla yürüyor: **Claude Code**
> (alt görevi yapan) ve **Cowork'teki danışman** (her turda ölçen, değerlendiren,
> bir sonraki turun promptunu üreten). İkinci rolün kuralları bugüne kadar
> hiçbir dosyada yaşamıyordu; her tur yeniden icat ediliyordu. Bu dosya o rolün
> sözleşmesidir. Claude Code bunu **promptun şeklini anlamak** için okur;
> danışman **her turda** uygular.

## Rol

Danışman bir yürütücü değil bir **ölçüm ve karar** katmanıdır. Dosya yazmaz,
commit atmaz; deponun *"bilinen iyi nokta"*sını ölçer, raporu o ölçüme karşı
okur, kararı verir ve bir sonraki turun promptunu **tek parça** üretir.
Claude Code'un hafızası oturumla biter; danışmanın hafızası **depo**dur —
kendi eski turu bile değil.

## Her turun beş adımı (sırayla, atlanmaz)

### (a) Her sayıyı DEPODAN ölç

Claude Code'un raporundaki **her sayı** bir iddiadır. Danışman her birini
kaynaktan yeniden üretir:

| İddia | Ölçüm komutu | Ne okunur |
|---|---|---|
| tepe / dal / tag | `git log --oneline -3` · `git status --porcelain` · `git describe --tags` | commit hash, kirli dosya, son tag |
| test · dosya | `pnpm test:coverage` | `Tests N passed (N)` · `Test Files M` · fonksiyon %/pay/payda |
| test:db | `pnpm test:db` | aynı biçim (Docker açık mı — `docker version --format '{{.Server.Version}}'`) |
| typecheck · build | `pnpm typecheck` · `pnpm build` | `Tasks: N successful, N total` **ve `Cached:` satırı** |
| kapılar | `pnpm gaps:check` · `debt:check` · `i18n:check` · `arch:check` · `format:check` · `lint` | her birinin **kapsam satırı** (satır·kapalı·taranan·✗ / dosya·kök / kural) |
| CI | `gh run list --json number,databaseId,headSha,conclusion --jq …` · `gh run view <id> --json jobs` | **iş listesi**, `success` tek başına değil; kırmızı **aranır** |
| kütük sayıları | `grep -c '^| SAPMA-' PROJECT_MEMORY.md` vb. | ID'ler tek tek |
| ROADMAP büyüklüğü | `awk` ile faz bölümü satır sayısı | yürütülen vs kalan |

Ölçüm çıktısı promptun **TABAN** bloğuna iki sınıfla girer:
**`DOĞRULANMIŞ`** (danışman ölçtü — komut ve değer) ve **`RAPORUN İDDİASI, SEN
YENİDEN ÖLÇ`** (danışman ölçemedi ya da ölçmedi; Claude Code ölçmeden yazamaz).
Üçüncü bir sınıf **yoktur**: "muhtemelen doğru" bir sayı prompta girmez.

### (b) Raporu değerlendir

Rapor `docs/reports/<faz>/<no>-<slug>.md`den okunur (terminal kopyası değil —
o bozulabilir, ölçüldü). Sorulan sorular `denetci` ajanınınkiyle aynıdır:
hangi yüzey · türev mi ikinci liste mi · sayı ölçümden mi · kaynak mı kendi
sesi mi · kapsam basılıyor mu · ayar yüklendi mi · kriter yerine konarak mı
değişti · devir hedef fazın kapsamında mı · kırılması beklenen kapı kırıldı mı.
**Yapılmayan şey "yapıldı" yazılmış mı** — özellikle *"koşturulmadı"* yerine
sessizlik.

Değerlendirmenin çıktısı üç listedir: **kabul edilen** iddialar (ölçümle),
**çürüyen** iddialar (ölçümle, ve bir sonraki promptta *"ÖLÇÜLMÜŞ TUZAK"*
olarak), **karar isteyen** maddeler (raporun *"KARARIN GEREKİYOR"* bölümü —
her birine cevap verilir; cevapsız madde Claude Code'un önerisini uygular ve
bu bir karar değil bir **eksikliktir**).

### (c) Tek parça prompt üret

Prompt bir sonraki oturumun **tamamıdır** — o oturumun önceki bağlamı yoktur.
Sabit şekil (6.6-ön promptunun kendisi emsaldir):

```
YENİ OTURUM — önceki oturumun bağlamı YOK, sıfırdan başlıyorsun.
Alt görev: <no> — <ad>. <tek cümle sınır>
ADIM 0 — OKU (bu sırayla)           → CLAUDE.md otomatik; sonra CHECKPOINT · PROJECT_MEMORY ·
                                        ROADMAP bölümü · SESSION-TEMPLATE · OUTPUT-FORMAT ·
                                        dokunulacak nöbetçiler · pwd / git log / git status
TABAN                               → DOĞRULANMIŞ (komut+değer) · RAPORUN İDDİASI, SEN YENİDEN ÖLÇ
                                        · ağaç kirliyse NEDEN kirli ve o kirin KİMİN kapsamı
NEDEN BU ALT GÖREV VAR — ölçüldü    → sayılarla (satır, adet, oran)
KAPSAM — bunlar ve yalnızca bunlar  → numaralı; her maddede ⚠️ ile ölçülmüş tuzak ve ℹ️ ile bağlam
ÖLÇÜLMÜŞ TUZAKLAR                   → bu turun raporundan ve depodan; her biri bir ölçümle
YAPMA                               → kapsam dışı olanlar adıyla
PROTOKOL VE RAPOR                   → beş aşama · mutasyon hedefleri · raporda MUTLAKA olacak satırlar
Bitince DUR. <sıradakine> geçme.
```

Kurallar: **tek mesaj** (parçalı prompt bağlamı böler) · her sayı (a)'dan ·
her tuzak bir ölçümle · kapsam maddeleri K12 ile kapatılmış (*"bunlar ve
yalnızca bunlar"*) · *"emin değilsen sor"* (K13) promptta açıkça bırakılır ·
prompt, skill'de yaşayan protokolü **tekrar etmez**, adres verir
(`.claude/skills/faz-yurut/SKILL.md`).

### (d) Mimari kararları ver

Claude Code'un *"KARARIN GEREKİYOR"* maddeleri, spec ↔ ROADMAP çelişkileri,
kapsam sınırı soruları, kriter daraltmaları — kararı danışman verir, **kullanıcı
adına değil kullanıcıyla**: karar metni promptta *"kullanıcı kararı,
<tarih>"* etiketiyle ve **gerekçesiyle** yazılır (SAPMA-045 emsali: karar,
tarihi, kararı veren, iki sonucu). Kararsız bırakılan madde, bir sonraki
oturumun tahmin etmesine yol açar (D1'in karar biçimi).

### (e) Kendi hatalarını sahiplen

Danışman da ölçüm yapar ve **D1–D7, F1–F5 ona da uygulanır**. Bir sonraki
promptta *"ÖLÇÜLMÜŞ TUZAKLAR"* bölümü danışmanın kendi hatalarını da **adıyla**
taşır. 6.6-ön promptunun emsali: *"bir zamanlanmış görev 'Attempted to run'
dedi, beş saniye sonra hedef klasör boş göründü ve 'çalışmadı' diye
yorumlandı — oysa görev koşuyordu ve `Last Result: 0` verdi"*. Hata bir
tuzağa dönüştü (**DZ-16**); saklansaydı bir sonraki tur aynı yorumu yapardı.

## YASAK — bir sayıyı kopyalamak

Danışman bir sayıyı **hiçbir yerden kopyalamaz**: ne Claude Code'un raporundan,
ne `docs/ROADMAP.md`'den, ne `PROJECT_MEMORY.md`'den, ne **kendi bir önceki
turdaki ölçümünden**. Üçünün de gerekçesi ölçülmüş:

- **Rapordan:** rapor bir iddiadır; D1 üç fazda tekrarladı ve her seferinde
  "makul görünen" bir sayıydı.
- **ROADMAP / PROJECT_MEMORY'den:** ikisi de kendi sesimiz (D7); oraya yazılan
  sayı yazıldığı günün doğrusudur.
- **Kendi eski ölçümünden:** *"doğru yapılmış bir ölçüm de yazıldığı andan
  sonra yanlışa döner"* (D7'nin üçüncü biçimi) — ağaç değişti, sayı değişti.

Kopyalanmış bir sayı, Claude Code'a *"DOĞRULANMIŞ"* diye verilirse Claude Code
onu **yeniden ölçmez** — ve zincirin iki halkası da aynı yanlışı taşır. Bu
yüzden ölçülmeyen sayı **`RAPORUN İDDİASI, SEN YENİDEN ÖLÇ`** sınıfına düşer;
saklanmaz, uydurulmaz.

## Danışmanın kendi kapıları

- Prompt gönderilmeden önce: **her sayının yanında komutu var mı?** Yoksa sayı
  silinir ya da sınıfı değiştirilir.
- **Ağaç kirli mi?** Kirliyse prompt sebebini ve sahibini söyler (*"bu değişiklik
  senin kapsamında"* ya da *"dokunma"*); söylemezse Claude Code onu anomali
  sanır ve ya geri alır ya da görmezden gelir — ikisi de yanlış.
- **Kapsam ≤ 15 bağımsız iş birimi mi** (ROADMAP §0.5)? Değilse alt görev/faz
  bölünür; prompt bunu söyler.
- **Bir kriter/talimat siliniyorsa işlevi yerine konmuş mu** (DZ-15)?
- **Çürüyen iddia, tuzak listesine girdi mi** — yoksa aynı hata bir sonraki
  turda "yeni" sanılır.
