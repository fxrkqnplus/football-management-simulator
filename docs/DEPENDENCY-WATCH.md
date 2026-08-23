# Bağımlılık Takip Listesi

> **Her faz açılışında bu tablo kontrol edilir** (`docs/SESSION-TEMPLATE.md` ÖN KONTROL).
>
> Neden var: Faz 1.0'da 28 paketin sürümü npm registry'den doğrulandı, ama
> 28 changelog'un tamamı okunmadı — bu bir günlük iş olurdu ve paketlerin çoğu
> Faz 16-45 arasında ilk kez kullanılacak. Okunmayan changelog takip edilmezse
> unutulur. Bu dosya o borcu görünür tutar.
>
> Bir satır, ilgili faza gelindiğinde ele alınır ve **kaldırılmaz** — sonucu
> yazılır (okundu / bump edildi / karar korundu).

## Aktif takip

| Paket | Kilitli sürüm | Ele alınacak faz | Sebep |
|---|---|---|---|
| `pnpm` | 11.22.0 | **Faz 2** | 11.23.0 mevcut. Faz ortasında araç değiştirmek "bu benim kodum mu, aracın değişimi mi" sorusunu bulandırır — faz sınırında bump edilir. |
| `pino` | 10.3.1 | **Faz 2** | 9 → 10 majör atlaması, notlar okunmadı. İlk kullanım gözlemlenebilirlik fazı. |
| `@sentry/node`, `@sentry/react` | 10.70.0 | **Faz 2** | Majör atlama, notlar okunmadı. |
| `drizzle-orm` / `drizzle-kit` | 0.45.2 / 0.31.10 | **Faz 3** | 1.0 hattı hâlâ RC (`1.0.0-rc.5`). Faz 3'te GA olduysa değerlendirilir. |
| `resend` | 6.22.0 | **Faz 13** | Majör atlama, notlar okunmadı. İlk kullanım e-posta doğrulama. |
| `ioredis` | 5.11.1 | **Faz 16** | **BORÇ-001** — 6.0.0 mevcut ama kurulum anında 3 haftalıktı. |
| `bullmq` | 5.81.3 | **Faz 16** | **BORÇ-002** — 6.2.0 mevcut; v6 `ioredis`'i peer'a taşıdı, `pg`/`redis` peer'ları ekledi (kuyruk yapılandırmasını değiştiren mimari değişiklik). |
| `@tanstack/react-table` | 9.1.2 | **Faz 18** | Taze majör (9.0 → 4 Ağu 2026). v8 Nis 2025'ten beri güncellenmiyor, bu yüzden v9'da başlandı; notlar tablo motoru yazılırken okunacak. |
| `i18next` / `react-i18next` | 26.4.0 / 17.0.12 | **Faz 5** | İki majör atlama (24→26, 15→17), notlar okunmadı. |
| `recharts` | 3.10.1 | **Faz 29** | 2 → 3 majör atlaması, notlar okunmadı. İlk kullanım maç sonrası analiz. |
| `typescript` | ~6.0.3 | **TS 7.1 çıkınca** | ADR-0003. 7.0'da programatik derleyici API'si yok → `typescript-eslint` ve `nest build` çalışmıyor. 7.1 çıkınca üç maddelik kontrol listesi işletilir. |

## Kural

Bir sürümü değiştirmeden önce:

1. Bu tabloya bak — o paket bir faza bağlanmış mı?
2. Bağlanmışsa, o faza gelmeden bump etme. Erteleme maliyeti bir minor bump;
   yanlış zamanda bump etmenin maliyeti "regresyon mu, benim kodum mu" belirsizliği.
3. Bump edildiğinde satır silinmez, **sonucu yazılır**.
4. `CLAUDE.md` §2.1 güncellenir ve gerekirse `PROJECT_MEMORY.md` SAPMA kütüğüne kayıt açılır.
