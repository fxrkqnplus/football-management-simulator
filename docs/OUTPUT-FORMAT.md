# Alt Görev Rapor Formatı

> **Zorunlu.** Her alt görev bitiminde rapor bu formatta verilir. Başlıklar ve
> sıralama sabittir.
>
> Amaç: kullanıcı teknik detayın tamamını okumadan "devam" diyebilmeli. Karar
> gerektiren bir şey varsa bunu **ilk satırda** görmeli.

## Şablon

```markdown
## [DURUM] [alt görev no] — [alt görev adı]

**Ne yapıldı:** [TEK cümle, teknik jargon minimum]

**Kapılar:** typecheck [x] · lint [x] · test [x] · build [x] · arch [x]
**Commit:** `hash` · push [x]

**Kanıtlar:**
- [iddia ettiğim kapı] → [nasıl test ettim] → [sonuç]
- (Her kapı için bir satır. Test etmediysem "test edilmedi" yaz.)

**KARARIN GEREKİYOR:** YOK
   veya
**KARARIN GEREKİYOR:** [n] madde
   1. [Soru tek cümle]
      Önerim: [X]. Gerekçe: [tek cümle].
      Cevap vermezsen: [önerimi uygularım / duracağım]

**Yeni kayıt:** [SAPMA-00X / BORÇ-00X / SORUN-00X — kısa açıklama] veya "yok"

**Sıradaki:** [no] — [ad]. [Ne yapılacak, tek cümle.]

───────────────── DETAY (okumak zorunda değilsin) ─────────────────

[Teknik ayrıntılar, dosya listesi, gerekçeler, ölçümler buraya.
Yukarıdaki özet bu bölüm olmadan da anlaşılır olmalı.]
```

## Durum işaretleri

| İşaret | Anlamı |
|---|---|
| 🟢 **TAMAM** | Her şey yolunda, karar gerekmiyor, "devam" demek yeterli |
| 🟡 **KARAR** | İş bitti ama devam etmeden önce kullanıcının kararı gerekli |
| 🔴 **BLOKE** | Devam edilemiyor; bir şey kırık veya çelişkili |
| ⚪ **KISMİ** | İşin bir kısmı yapıldı, gerisi bilerek ertelendi (gerekçesi yazılı) |

## Kurallar

- 🟢 kullanmak için **üçü birden**: tüm kapılar yeşil **ve** hiçbir karar
  beklemiyor **ve** kabul kriterlerinin tamamı sağlandı. Şüphedeysen 🟡 kullan.
- 🟡'da sorular **numaralı** verilir; her birine kendi önerisi ve gerekçesi
  yazılır. "Ne yapmamı istersin?" diye açık uçlu sorulmaz — seçenek sunulur.
- 🔴'da üçü birden yazılır: ne kırık, ne denendi, ne öneriliyor.
- Özet bölümü **20 satırı geçmez**. Uzun anlatım DETAY'a gider.
- **Kanıtlar bölümünde test edilmemiş bir kapı test edilmiş gibi yazılmaz.**
  "test edilmedi" yazmak, yanlış "✅"den iyidir.
- Bir alt görev 🟢 ise ve kullanıcı "devam" derse sıradakine geçilir — tekrar
  plan sunulmaz, plan zaten `docs/ROADMAP.md`'de onaylıdır.

## Faz sonu eki

Fazın son alt görevinde (X.10 gibi) yukarıdakine **ek olarak**:

```markdown
**Faz özeti:** [3-5 satır: bu faz ne kazandırdı]
**Kabul kriterleri:** [n]/[n] sağlandı  (sağlanmayan varsa tek tek gerekçesiyle)
**Performans:** [ölçülen metrikler, bütçeyle karşılaştırmalı]
**PROJECT_MEMORY:** faz kaydı yazıldı [x] · ANLIK DURUM güncellendi [x]
**PR:** #[n] açıldı [x]
```
