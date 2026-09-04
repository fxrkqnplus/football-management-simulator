# Terim Sözlüğü — TR/EN

> **Kod İngilizce, arayüz Türkçe.** Bu belge ikisi arasındaki bağlayıcı
> sözleşmedir: bir ekranda bir terimi Türkçeye çevirirken **buradaki karşılık**
> kullanılır, yenisi uydurulmaz.

## Otorite yönü — çelişkide kim kazanır

`CLAUDE.md` §14 **çekirdek tabloyu** taşır; bu belge onun **süperkümesidir**.

⚠️ **Çelişkide `CLAUDE.md` KAZANIR ve bu belge düzeltilir.** Gerekçe otorite
sırası: `CLAUDE.md` #1 kaynaktır ve her oturumda otomatik yüklenir, bu belge
yüklenmez. Bu cümle olmadan ilk çelişkide *"hangisi doğru?"* sorusu cevapsız
kalırdı.

⚠️ **§14 BÜYÜTÜLMEZ — bu bilinçli bir karar.** Anayasa her oturumun sabit
bağlam maliyetidir; 130+ satırlık bir tabloyu oraya taşımak, terimlerin çoğu o
oturumda hiç okunmayacakken (Faz 30-45'in alanı) her oturuma bedel yazardı.
Çekirdek orada, tamamı burada.

**Ayrışma bir teste bağlı:** `tools/glossary-check/index.test.mjs` §14'ün her
satırının burada **hem terim hem karşılık olarak birebir** bulunduğunu iddia
ediyor. Yalnızca terimleri karşılaştıran bir test, aynı İngilizce terimin
burada **farklı bir Türkçe karşılıkla** durmasına izin verirdi ve iki liste o
gün ayrışmış olurdu.

## Bu belgedeki terim SAYISI burada YAZMIYOR — ve bu kasıtlı

Sayı **dosyayı ayrıştıran bir testte** yaşıyor, bir cümlede değil. Gerekçe
ödenmiş bir bedel: `docs/schema/world.md`nin programatik bloğu güncel kalırken
**prose dört ayrı yerde bayatladı** ve hiçbir kapı bunu göremedi. Buraya
*"133 terim"* yazılsaydı, tablodan bir satır silindiğinde cümle sessizce
yalan söylemeye başlardı.

## Sözlük mü, çeviri dosyası mı — ikisi AYNI ŞEY DEĞİL

| | Bu belge | `apps/web/src/locales/tr/*.json` |
|---|---|---|
| Ne | **Sözleşme** — hangi Türkçe kullanılacak | **Çalışma zamanı artefaktı** — ekrana basılan dize |
| Kim okur | Geliştirici, tasarımcı | `i18next`, çalışma anında |
| Yön | **Yukarı akış** | Aşağı akış |

⚠️ **Bir terim ikisinde birden yaşadığında çeviri dosyası BU BELGEYE UYAR.**
Bugün böyle bir çakışma **yok** ve bu ölçüldü: `locales/tr/squad.json` şu an
boş (`{}`), yani nitelik etiketleri henüz hiçbir çeviri dosyasında değil.

Bu yüzden burada **koşan bir nöbetçi yok** — bakacak bir şey bulamayan bir
kontrol, bir onay değildir. Zorlamanın sahibi **Faz 18**: nitelik etiketlerini
`locales`e ilk yazan faz o, ve anahtar adlandırma sözleşmesi o gün doğacak.
Bugün o sözleşmeyi uydurmak, Faz 18'in tasarımını **onun yerine sessizce**
vermek olurdu.

---

## 1. İsimlendirme standardı

**Dil kuralı — bu belgenin taşıdığı standart:**

| Katman | Dil | Örnek |
|---|---|---|
| Kod (değişken, fonksiyon, tip, dosya) | **İngilizce** | `calculateMarketValue`, `PlayerAttributes` |
| Veritabanı (tablo, sütun) | **İngilizce**, snake_case | `player_attributes.first_touch` |
| i18n anahtarı | **İngilizce**, namespace'li | `squad:table.column.age` |
| Arayüzde görünen metin | **Türkçe** | "Piyasa Değeri" |
| Log ve hata mesajı (geliştirici) | Türkçe serbest, **çevrilmez** | `AppError.message` |

⚠️ **Büyük/küçük harf biçimleri BURADA TEKRARLANMIYOR** (`kebab-case.ts`,
`PascalCase.tsx`, `SCREAMING_SNAKE_CASE`, `snake_case`, `namespace:dot.notation`).
Onların tek yeri **`CLAUDE.md` §1.3**. Aynı tabloyu ikinci bir yere kopyalamak,
iki listenin bir gün ayrışması demektir — bu deponun en çok tekrarlanan hata
sınıfı. Bu bölüm **dil** sorusunu cevaplıyor, **biçim** sorusunu değil.

ℹ️ Arayüz metninin koda gömülmesi ayrıca **makine tarafından** yasak:
`local/no-bare-jsx-text` (K5) ve `pnpm i18n:check`.

---

## 2. Çekirdek terimler

> `CLAUDE.md` §14 ile **birebir aynı**. Bir satır burada değişirse
> `tools/glossary-check` kırılır.

| Kod (İngilizce) | Arayüz (Türkçe) |
|---|---|
| Current Ability (CA) | Mevcut Yetenek |
| Potential Ability (PA) | Potansiyel Yetenek |
| Attribute | Nitelik |
| Hidden Attribute | Gizli Nitelik |
| Trait / PPM | Özel Yetenek |
| Personality | Kişilik |
| Morale | Moral |
| Form | Form |
| Condition | Kondisyon |
| Match Sharpness | Maç Keskinliği |
| Position | Mevki |
| Role | Rol |
| Duty | Görev |
| Formation | Diziliş |
| Mentality | Mentalite |
| Team Instruction | Takım Talimatı |
| Player Instruction | Bireysel Talimat |
| Tactical Fluidity | Taktik Akıcılığı |
| Pressing Intensity | Baskı Yoğunluğu |
| Defensive Line | Savunma Çizgisi |
| Set Piece | Duran Top |
| Squad | Kadro |
| Squad Registration | Kadro Kaydı |
| Squad Role | Takım Rolü |
| Homegrown | Yerli Yetiştirme |
| Work Permit / GBE | Çalışma İzni |
| Foreign Quota | Yabancı Kotası |
| Transfer Window | Transfer Dönemi |
| Transfer Fee | Bonservis |
| Release Clause | Serbest Kalma Bedeli |
| Sell-on Clause | Sonraki Satıştan Pay |
| Minimum Fee Clause | Minimum Ücret Maddesi |
| Loan | Kiralık |
| Loan with Option | Satın Alma Opsiyonlu Kiralık |
| Loan with Obligation | Zorunlu Opsiyonlu Kiralık |
| Pre-contract / Bosman | Ön Anlaşma |
| Agent | Oyuncu Menajeri |
| Agent Fee | Menajer Komisyonu |
| Scout | Gözlemci |
| Scouting Report | Gözlemci Raporu |
| Shortlist | Aday Listesi |
| Market Value | Piyasa Değeri |
| Wage Budget | Maaş Bütçesi |
| Transfer Budget | Transfer Bütçesi |
| Board Confidence | Yönetim Güveni |
| Board Expectation | Yönetim Beklentisi |
| Reputation | İtibar |
| Prestige | Prestij |
| Youth Intake | Altyapı Kadrosu |
| Newgen | Üretilmiş Oyuncu |
| Regen | (kullanma — "Newgen" kullan) |
| Mentoring | Mentorluk |
| Injury Proneness | Sakatlığa Yatkınlık |
| Recurrence | Tekrarlama |
| Suspension | Ceza |
| Yellow Accumulation | Sarı Kart Birikimi |
| xG (Expected Goals) | xG (Beklenen Gol) |
| Heatmap | Isı Haritası |
| Pass Network | Pas Ağı |
| Match Rating | Maç Reytingi |
| Man of the Match | Maçın Adamı |
| Fixture | Fikstür |
| Standings / Table | Puan Durumu |
| Matchday | Maç Günü / Hafta |
| Relegation | Küme Düşme |
| Promotion | Küme Yükselme |
| Playoff | Play-off |
| Coefficient | Katsayı |
| Save (game save) | Kayıt |
| Save Slot | Kayıt Slotu |
| Turn | Tur |
| Rollover | Sezon Geçişi |
| Snapshot | Anlık Kayıt |
| Leaderboard | Liderlik Tablosu |
| Server Mode | Sunucu Modu |
| Maintenance Mode | Bakım Modu |
| Private Mode | Özel Mod |

---

## 3. Görünür nitelikler

> **Kod adları `packages/db/src/schema/player-attributes.ts` →
> `VISIBLE_ATTRIBUTES` sabitinden alındı, elle yazılmadı.** O sabit
> `spec/02` §4.1'e karşı ayrıca bir testle sabitlenmiş
> (`player-attributes.test.ts`: dört kategori, adlar tek tek, toplam 47) —
> yani buradaki İngilizce sütun spec'in makine-okunur izdüşümü.
>
> ⚠️ **Türkçe sütun ise bu belgede DOĞDU.** `spec/02` nitelikleri yalnızca
> İngilizce listeliyor (5.0'da ölçüldü); karşılıkların hiçbir yerde önceden
> tanımlı hâli yoktu. Bu, boş bir alanı doldurmak değil — sözlüğün tanımı
> gereği kendi alanı.

### 3.1 Teknik

| Kod (İngilizce) | Arayüz (Türkçe) |
|---|---|
| corners | Korner |
| crossing | Orta |
| dribbling | Çalım |
| finishing | Bitiricilik |
| firstTouch | İlk Dokunuş |
| freeKickTaking | Serbest Vuruş |
| heading | Kafa Vuruşu |
| longShots | Uzaktan Şut |
| longThrows | Uzun Taç |
| marking | Adam Markajı |
| passing | Pas |
| penaltyTaking | Penaltı Kullanma |
| tackling | Top Çalma |
| technique | Teknik |

### 3.2 Zihinsel

| Kod (İngilizce) | Arayüz (Türkçe) |
|---|---|
| aggression | Agresiflik |
| anticipation | Önsezi |
| bravery | Cesaret |
| composure | Soğukkanlılık |
| concentration | Konsantrasyon |
| decisions | Karar Verme |
| determination | Kararlılık |
| flair | Yaratıcılık |
| leadership | Liderlik |
| offTheBall | Topsuz Alan |
| positioning | Pozisyon Alma |
| teamwork | Takım Oyunu |
| vision | Oyun Görüşü |
| workRate | Çalışkanlık |

### 3.3 Fiziksel

| Kod (İngilizce) | Arayüz (Türkçe) |
|---|---|
| acceleration | Hızlanma |
| agility | Çeviklik |
| balance | Denge |
| jumpingReach | Yükseğe Sıçrama |
| naturalFitness | Doğal Kondisyon |
| pace | Hız |
| stamina | Dayanıklılık |
| strength | Güç |

### 3.4 Kaleci

| Kod (İngilizce) | Arayüz (Türkçe) |
|---|---|
| aerialReach | Havada Uzanma |
| commandOfArea | Ceza Sahası Hâkimiyeti |
| communication | İletişim |
| eccentricity | Risk Alma |
| handling | Top Tutma |
| kicking | Vuruş Mesafesi |
| oneOnOnes | Bire Bir |
| reflexes | Refleks |
| rushingOut | Kaleden Çıkma |
| tendencyToPunch | Yumruklama Eğilimi |
| throwing | Elle Atış |

---

## 4. Gizli nitelikler

> Kod adları `packages/db/src/schema/player-hidden-attributes.ts` →
> `HIDDEN_ATTRIBUTES` sabitinden (10 üye, `spec/02` §4.5'e karşı testle
> sabitlenmiş).
>
> ⚠️ **Onuncu üye `injuryProneness` bu tabloda YOK — çünkü çekirdekte VAR.**
> `Injury Proneness | Sakatlığa Yatkınlık` §2'de duruyor ve bir terim bu
> belgede **bir kez** yaşar. İki envanterin ayrık olduğu varsayılmıştı;
> ölçüldüğünde tek örtüşme bu çıktı.

| Kod (İngilizce) | Arayüz (Türkçe) |
|---|---|
| consistency | İstikrar |
| importantMatches | Önemli Maçlar |
| dirtiness | Sertlik |
| pressure | Baskı Altında Oynama |
| professionalism | Profesyonellik |
| ambition | Hırs |
| loyalty | Sadakat |
| adaptability | Uyum Sağlama |
| temperament | Mizaç |

---

## 5. Kullanılmayacak terimler

Aşağıdakiler **yanlış** ya da **çift anlamlı**; sağdaki karşılık kullanılır.

| Kullanma | Kullan |
|---|---|
| yetenek puanı | Mevcut Yetenek |
| skill | nitelik |
| regen | Newgen (Üretilmiş Oyuncu) |
| menajer *(oyuncu temsilcisi için)* | Oyuncu Menajeri |

ℹ️ **"Menajer" teknik direktör için DOĞRU** — oyuncunun temsilcisi için
yanlış. Ayrımı `Agent | Oyuncu Menajeri` satırı taşıyor.

---

## 6. Bu belgede henüz OLMAYAN terim kaynakları

Aşağıdaki envanterler depoda **var ve sayıldı**, ama bu belgeye **yazılmadı**
— kabul kriteri sağlandığı için (K12: yol haritasında olmayan iş yapılmaz).
Türkçe karşılıkları, o niteliklerin ekrana geldiği fazda yazılır.

| Envanter | Kaynak | Üye | Sahibi |
|---|---|---|---|
| `STAFF_ATTRIBUTES` | `packages/db/src/schema/staff-attributes.ts` | 16 | personel ekranı |
| `MANAGER_ATTRIBUTES` | `packages/db/src/schema/manager-attributes.ts` | 8 | Faz 14 (menajer oluşturma) |
| `POSITION_LEVELS` | `packages/db/src/schema/player-positions.ts` | 5 | Faz 18-20 |

Üçünün de **çekirdekle kesişimi 0** (ölçüldü), yani eklendiklerinde sözlük
tam bu sayılar kadar büyür.
