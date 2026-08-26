# ADR-0004 — Geliştirme ortamı: Windows, üretim Linux/ARM64

**Durum:** Kabul edildi
**Tarih:** 2026-08-23
**Faz:** 1 (alt görev 1.3 başı)

---

## Bağlam

Spesifikasyon üretim ortamını ayrıntısıyla tanımlıyor (Oracle Ampere A1, Ubuntu
24.04 aarch64) ama **geliştirme makinesinin Windows olduğunu hiçbir yerde
yazmıyordu.** Bu bir eksiklik: iki ortam üç boyutta ayrışıyor (işletim sistemi,
CPU mimarisi, dosya sistemi semantiği) ve her ayrışma kendi hata sınıfını
üretiyor.

| | Geliştirme | Üretim |
|---|---|---|
| İşletim sistemi | Windows 11 | Ubuntu 24.04 LTS |
| Mimari | x64 | **aarch64 (ARM64)** |
| Dosya sistemi | Büyük/küçük harf **duyarsız** | **duyarlı** |
| Satır sonu | CRLF varsayılan | LF |
| Kabuk | PowerShell 7 | bash |

## Karar

Windows geliştirme birinci sınıf desteklenen bir yapılandırmadır, ama
**hiçbir kalite kapısı yalnızca geliştirme makinesinde çalışmaya güvenmez.**
Her kapı Linux'ta da (CI) doğrulanır.

### Araç zinciri (kilitli)

```
Node.js    24.19.0   — nvm-windows ile kurulu, sistem PATH'inde
pnpm       11.23.0   — corepack üzerinden (packageManager alanından okunur; Faz 2.0'da 11.22.0'dan yükseltildi)
PowerShell 7.6.5     — Windows Terminal varsayılanı
Docker     Desktop 4.87.0 + WSL2 motoru, Compose v5.4.0
git        core.longpaths = true
```

## Ayrışmalar ve savunmalar

### 1. Kabuk — kalite kapıları kabuk sözdizimine bağımlı olmaz

Windows PowerShell 5.1 `&&` operatörünü desteklemez (PowerShell 7 destekler).
Ama bir kalite kapısının hangi kabukta koştuğuna bağlı olması kırılganlıktır.

**Kural:** Çok adımlı komut zinciri `package.json` script'ine yazılır, kabuğa
bırakılmaz. Örnek — `pnpm typecheck` şu an şudur:

```
"typecheck": "node ./scripts/check-tsconfig-types.mjs && turbo run typecheck"
```

Zincir uzarsa `&&` yerine bir `.mjs` orkestratöre taşınır. Belgelerde komut
verirken tek satırlık, kabuktan bağımsız `pnpm <script>` biçimi tercih edilir.

### 2. ⚠️ Dosya adı büyük/küçük harf duyarlılığı — en pahalı sınıf

Windows'ta `import './playerCard'` yazıp dosyanın adı `PlayerCard.tsx` olsa
**çalışır**. Aynı kod Docker imajında ve CI'da **kırılır**. Hata üretim
derlemesinde ortaya çıkar, yerelde asla tekrar üretilemez.

Risk Faz 6'dan (tasarım sistemi) itibaren gerçek: yüzlerce bileşen dosyası,
her biri PascalCase, her import elle yazılıyor.

> **⚠️ DÜZELTME (Faz 1.6, 2026-08-24).** Bu bölümün ilk sürümü riskin
> boyutunu **fazla tahmin ediyordu**. Şöyle yazılmıştı: *"`forceConsistentCasingInFileNames`
> yalnızca aynı dosyaya iki farklı yazımla referans verilmesini yakalar; tek ve
> tutarlı ama yanlış harfli bir yazımı yakalamaz."* Bu iddia **bu projenin
> yapılandırmasında yanlış**. Aşağısı ölçüme dayalı düzeltilmiş hâlidir.

**Ölçüm (Faz 1.6).** `packages/shared/src/CasingProbe.ts` oluşturulup
`./casingprobe.js` diye import edildi:

| Kontrol | Sonuç |
|---|---|
| `tsc --noEmit` (`.ts` dosyası) | **YAKALADI** — `TS1149: File name ... differs from already included file name ... only in casing` |
| `tsc` (`.mjs`/`.js` dosyası) | **GÖREMEDİ** — bu dosyalar hiçbir tsconfig'e dahil değil |
| Node çalışma zamanı (Windows) | Sorunsuz çalıştı |
| `arch:check` | Her ikisini de yakaladı |

**Neden TypeScript yakalıyor:** her paketin tsconfig'i `include: ["src/**/*"]`
kullanıyor, yani gerçek adıyla (`CasingProbe.ts`) zaten programa dahil. Yanlış
harfli import ikinci bir yazım ürettiği anda TS1149 tetikleniyor. Yani "iki
farklı yazım" koşulu, `include` deseni sayesinde **her zaman** sağlanıyor.

**Kalan gerçek boşluk** — `.mjs` / `.js` dosyaları (`scripts/`, `tools/`).
Bunlar hiçbir TypeScript programına girmez; `pnpm typecheck` onları hiç görmez.
Ölçümde `typecheck` geçti, Node çalıştırdı, yalnızca `arch:check` yakaladı.

**Üç savunma hattı (öncelik sırasıyla):**

1. **TypeScript (TS1149)** — `.ts`/`.tsx` için birincil hat, editörde anında.
2. **`arch:check` import denetimi** (Faz 1.6) — `.mjs`/`.js` boşluğunu kapatır,
   ayrıca dizin adı harf hatalarını ve TS programına girmeyen dosyaları görür.
3. **CI Linux'ta koşar** (Faz 1.9) — kesin hat. Yukarıdaki ikisi bir şekilde
   atlanırsa gerçek duyarlı dosya sistemi kararı verir.

Risk hâlâ gerçek ama ilk yazıldığı kadar geniş değil; `arch:check` kuralı
birincil değil **tamamlayıcı** savunmadır.

### 3. Satır sonları — çözülmüş

`.gitattributes` (Faz 1.1) `* text=auto eol=lf` uygular; kabuk betikleri ve
`Dockerfile` ayrıca açıkça LF'e sabitlenmiştir. CRLF'li bir shebang veya
`Dockerfile` satırı konteynerde sessizce bozulur.

Doğrulandı: `git ls-files --eol` → tüm dosyalar `i/lf w/lf`, **0 CRLF**.

### 4. Uzun yol sınırı

Windows'un 260 karakterlik `MAX_PATH` sınırı, pnpm'in `node_modules/.pnpm`
derinliğiyle çakışabilir. `git config core.longpaths true` ayarlandı.
Sorun tekrarlarsa depo daha kısa bir köke taşınır (`C:\fms` zaten kısa seçildi).

### 5. Mimari farkı — CI kapatır

Geliştirme x64, üretim ARM64. Native modüller (`sharp`, `@node-rs/argon2`)
yerelde çalışıp ARM'da kırılabilir. CI hem `linux/amd64` hem `linux/arm64`
imajı üretir (Faz 1.9, native ARM runner). `@node-rs/argon2` 2.1.0 için
`linux-arm64-gnu` ve `linux-arm64-musl` prebuild'leri Faz 1.0'da doğrulandı.

Docker Desktop `buildx ls` çıktısında `linux/arm64` destekleniyor — çok
mimarili build yerelde de denenebilir.

## Sonuçlar

- Ortam farkları artık belgeli; "bende çalışıyordu" tartışması bu dosyaya
  referansla kapanır.
- Faz 1.6'ya bir kural (import harf duyarlılığı), Faz 1.9'a bir zorunluluk
  (Linux CI) eklendi.
- Geliştirme makinesi değişirse bu ADR güncellenir, yeni bir ADR açılmaz.
