# Spesifikasyon Kapsam Boşlukları

> **Ne bu:** `docs/spec/` bir şey **istiyor** ama `docs/ROADMAP.md` onu hiçbir fazın
> kapsamına **yazmamış** — yani hiç kimsenin işi değil. Bu dosya o boşlukların envanteri.
>
> **Neden var:** Bu sınıftan boşluk iki kez tek tek yakalandı ve ikisi de şans eseriydi.
> Faz 1'de `arch:check`: `spec/09` §11.5 onu her faz kapanışında çalıştırmayı zorunlu
> kılıyordu ama hiçbir faz onu **kurmuyordu** (Ç3 kararıyla 1.6'ya eklendi). Faz 2.0'da
> Sentry kota uyarısı: `spec/10` §13.5 uyarı eşiği tanımlıyor ama Faz 47'nin telemetri
> listesinde Sentry satırı yok. İki tesadüf bir desendir — tek tek yakalamak yerine
> taramak ucuz.
>
> **Nasıl okunur:** Bir satır ROADMAP'e işlendiğinde **silinmez**, `Durum` sütunu
> güncellenir. Bu dosya "neyi kaçırmışız"ın kaydıdır; temizlenirse değerini kaybeder.
>
> **Kapsam uyarısı:** Bu **tam envanter değildir.** Faz 2.0'da yapılan tarama
> `docs/spec/09` (kalite protokolü) ve `docs/spec/10` (dağıtım) üzerinde yoğunlaştı;
> ölçüt "gözle görülür boşluk" idi. Sonraki fazlar kendi spec'lerini okurken yeni
> satır ekleyebilir.

---

## Tarama 1 — Faz 2.0 (2026-08-25)

Yöntem: `spec/09` §11.4 (test katmanları tablosu) ve §11.5 (faz kapanış komutları)
satır satır ROADMAP'te arandı; `spec/10` §13.5 (ücretsiz kademe sınırları) ilgili faz
kapsamıyla karşılaştırıldı.

| # | Spec referansı | Ne istiyor | Hangi faza ait olmalı | Durum |
|---|---|---|---|---|
| G-01 | `spec/09` §11.5 — `pnpm perf:budget` (*"Faz 6+"*) | §11.6'daki 15 satırlık performans bütçesini **ölçen ve ihlalde kıran** bir komut. ROADMAP §0.4 "Performans bütçesi ihlal edilmemiş (ihlal = faz kapanmaz)" diyor — yani her faz kapanışında koşması gereken bir kapı. Hiçbir faz onu **kurmuyor**; `arch:check` ile birebir aynı durum. | **Faz 6** (ilk ölçülebilir ekran) — ölçüm altyapısı; **Faz 49** (mobil cila + performans) genişletir | ✅ ROADMAP Faz 6 kapsamına eklendi |
| G-02 | `spec/09` §11.5 — `pnpm test:e2e` (*"Faz 17+"*) + §11.4 "Uçtan uca / Playwright" | Playwright **kurulumu** ve ilk kritik akış testi. ROADMAP'te Playwright yalnızca iki yerde geçiyor: yığın listesi (satır 124) ve **Faz 50**'nin tam senaryo paketi. Yani spec Faz 17'den itibaren koşulmasını isterken, ilk kurulum 33 faz sonrasına düşüyor. | **Faz 17** (ana kabuk — ilk gezilebilir akış) | ✅ ROADMAP Faz 17 kapsamına eklendi |
| G-03 | `spec/09` §11.4 — "Entegrasyon / Vitest + **testcontainers** / Gerçek Postgres ile uçtan uca modül" | Gerçek Postgres'e karşı entegrasyon testi katmanı. `testcontainers` kelimesi **ROADMAP'in tamamında geçmiyor**. Şema Faz 3-4'te, `WorldView` Faz 12'de yazılıyor — ikisi de "gerçek DB'ye karşı doğrulandı" iddiasını taşıyamaz. | **Faz 3** (ilk migration — kurulum) veya **Faz 12** (WorldView) | ✅ ROADMAP Faz 3 kapsamına eklendi |
| G-04 | `spec/09` §11.4 — "Yük / **k6** / API / 20 eşzamanlı kullanıcı, tur atlama" | Yük testi katmanı. `k6` **ROADMAP'in tamamında geçmiyor**. CLAUDE.md §1.1 "sistem 200 kullanıcıya kadar bozulmadan çalışacak şekilde tasarlanır" diyor — bu iddianın tek ölçüm aracı bu satır. | **Faz 50** (bütünsel denetim ve yayın) | ✅ ROADMAP Faz 50 kapsamına eklendi |
| G-05 | `spec/09` §11.4 — "Görsel / Playwright / Ekranlar / Anlık görüntü karşılaştırma (mobil + masaüstü)" | Görsel regresyon testi. ROADMAP'te "görsel regresyon", "anlık görüntü karşılaştırma" veya eşdeğeri **hiç geçmiyor**. Faz 49 erişilebilirlik ve Lighthouse'u kapsıyor ama görsel snapshot'ı değil. | **Faz 49** (mobil cila) — G-02'nin Playwright kurulumuna bağımlı | ✅ ROADMAP Faz 49 kapsamına eklendi |
| G-06 | `spec/10` §13.5 — sınır tablosunda `Sentry \| 5.000 olay/ay \| 4.000` | Faz 47'nin "Telemetri ve Sağlık" listesi disk, DB, R2, Resend, CPU/RAM/kuyruk sayıyor — **Sentry satırı yok**. Kabul kriteri "%80 eşiğinde uyarı tetikleniyor" var ama uyarılacak metrik listesinde Sentry bulunmuyor, yani kriter Sentry'yi kapsamadan da işaretlenebilir. | **Faz 47** (panel uyarısı) + **Faz 50** (admin e-postası zinciri) | ✅ ROADMAP Faz 47 ve 50 kapsamına eklendi |
| G-07 | `spec/10` §13.4 — *"süresi `docs/RUNBOOK.md`'ye yazılır"* | `docs/RUNBOOK.md` diye bir dosya isteniyor; ne repoda var, ne `CLAUDE.md` belge haritasında, ne de Faz 50 kapsamında adıyla geçiyor (Faz 50 yalnızca "süresi belgelenmiş" diyor). **Düşük öncelikli** — tatbikatın kendisi kapsamda, eksik olan çıktı dosyasının adı. | **Faz 50** | ⏳ ROADMAP'e işlenmedi — Faz 50 açılışında karara bağlanır |

---

## Tarama 2 — Faz 2.3b (2026-08-25)

Yöntem: tarama değil, **ölçüm**. Faz 2'nin 2. kabul kriteri (*"Aynı `correlationId`
ile frontend ve backend logları eşleşiyor"*) gerçek tarayıcı + derlenmiş API ile
uçtan uca denendi ve zincirin bir halkası **yok** çıktı.

| # | Spec referansı | Ne istiyor | Hangi faza ait olmalı | Durum |
|---|---|---|---|---|
| G-08 | `spec/09` §11.1 zinciri — *"API middleware AsyncLocalStorage'a koyar → **Tüm loglar otomatik taşır**"*, ve Faz 2'nin 2. kabul kriterinin doğrulaması: *"tarayıcıda tıkla → `X-Correlation-Id` → **sunucu logu**"* | **İstek başına bir sunucu log satırı** (erişim logu). Mekanizma var ve çalışıyor — ama **mutlu yolda hiçbir şey loglamıyor**, yani eşleşecek bir "sunucu logu" üretilmiyor. Ölçüm (2.3b, gerçek tarayıcı): tarayıcı `01a03965-5248-…` üretti, iki `console` satırında logladı, `X-Correlation-Id` ile gönderdi, sunucu **aynı kimliği yanıt başlığında geri verdi** (ekranda "zincir kapandı: evet"), ama `grep` ile sunucu logunda o kimlik **0 kez** bulundu. Karşıt kanıt: başlık **geçersiz** gönderilince middleware `correlation.invalidHeader` uyarısını basıyor ve satır kimliği taşıyor — yani ALS→logger kablolaması sağlam, eksik olan tek şey mutlu yolda **loglayan bir şeyin olmaması**. ROADMAP'in tamamında "istek logu / erişim logu" geçmiyor; 2.4 (exception filter) yalnızca **hata** yolunu logluyor. | **Faz 2** — en doğal yeri 2.4 (istek boru hattına zaten dokunuyor) veya 2.3'e ek bir madde | ✅ **ÇÖZÜLDÜ — 2.3c** (ayrı alt görev olarak; 2.4'e madde olarak **eklenmedi**: 2.4 hata yolunu, 2.3c mutlu yolu yazıyor, aynı commit'te olsalar bir aksaklıkta hangisinin bozulduğu sorulurdu). `apps/api/src/common/middleware/request-log.middleware.ts`. Faz 2'nin **2. kabul kriteri `[x]`** — dört halka gerçek tarayıcı + derlenmiş API ile kanıtlandı |

---

## Kural

1. Yeni bir boşluk fark edildiğinde önce **buraya** yazılır, sonra ROADMAP'e işlenir.
2. ROADMAP'e işlendiğinde satır silinmez, `Durum` sütunu güncellenir.
3. Bir boşluk bilinçli olarak kapsam dışı bırakılıyorsa `Durum` **"kapsam dışı — gerekçe"**
   olur ve gerekçe `docs/V2-BACKLOG.md`'ye de yazılır (K12).
4. Tarama tekrarlandığında yeni bir "Tarama N" bölümü açılır; eskisi korunur.
