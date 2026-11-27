# TEST-SHOWROOM

Görev tanımındaki ("ORMEN Atelier — Showroom Paketi") her kabul ölçütü, onu sınayan test ve bugünkü durumu. Dalga dalga.

**İşaretler:** ✅ otomatik testle doğrulandı · 🟡 otomatik test geçiyor, gerçek cihazda ya da gerçek koşulda ayrıca denenmeli · 🔑 ORMEN'in kararını ya da anahtarını bekliyor · ⏳ henüz yazılmadı

**Nasıl çalıştırılır:**
- Birim ve veritabanı testleri: `npx vitest run` (veritabanı testleri PGlite ile gerçek SQL şemasını çalıştırır).
- Uçtan uca testler: `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test --project=masaustu --trace off`. Testler kendi sunucusunu kurar (örnek veri modu, demo panel kullanıcısı, demo mağaza sahibi, deneme giydirme sağlayıcısı; `playwright.config.ts`).
- **Son tam koşu (27 Kasım 2026, İş 7'ye kadar):** uçtan uca masaüstü 97 testten 91'i geçti, 2'si yalnız telefon için atlandı, 4'ü kaldı. Dördü de düzeltildi: kumaş sayfasındaki yeni "…listesini kaydet" düğmelerine çarpan gevşek bir test seçicisi, iki testin aynı aylık özeti açması (testler arası durum), satıcı testinde gevşek ürün eşleşmesi, kalite profili testinde vitrin döngüsü ve yeniden yüklemeyle zamanlama yarışı. Sonra İş 6, 9, 12, 14, 16 eklendi; bunların testleri ve etkilenen testler (a11y, showroom, kesim, kullanım, satıcı, takım, oda, duvar, marka) yeni derlemede ayrı ayrı geçti. Birim ve veritabanı: 519/519.

---

## Dalga 1

### İş 0 — Merkez panel, merkez katalog, uzaktan güncelleme

| Kabul ölçütü | Durum | Test |
|---|---|---|
| Bir ürün merkezde bir kez girilip 15 mağazaya atanır; her mağazada farklı adla görünür; merkezde metrajı düzeltilince 15 mağazanın teklif hesabı da değişir. | ✅ | `tests/unit/shop-products.test.ts` (15 mağaza, 8 → 9,5 m); `tests/unit/merkez.test.ts` "shows the same product under a different name in each shop", "goes up for every shop that has the product when the centre corrects its metres"; uçtan uca `merkez.spec.ts` "ortak ürün mağazada kendi adıyla görünür" |
| Mağazaya özel ürün başka mağazaya atanamaz; denemesi reddedilir ve kayda geçer. | ✅ | `merkez.test.ts` "refuses to give a shop's own product to another shop" (veritabanı tetikleyicisi); `tests/unit/products.test.ts` (toplu atamada seçimin tamamı reddedilir). Günlüğe "reddedildi" yazılması sunucu işleminde (`app/panel/merkez-actions.ts`); ayrı testi yok. |
| Yeni mağaza şablondan 10 dakikanın altında açılır ve cihazı eşleşince içeriği kendiliğinden iner. | ✅ | `merkez.spec.ts` "kayıt listeye yansır; şablon yeni mağazayı tek adımda kurar…" (ölçülen: 1 sn'nin altında); `showroom.spec.ts` "eşleşme, yeniden açılış…" |
| Merkezde yapılan bir ad değişikliği, açık ve boşta bekleyen cihazda 5 dakika içinde görünür; müşteri ekranı kullanırken görüntü değişmez. | ✅ 🟡 | `tests/unit/sync.test.ts` "applies new content at once when nobody is at the screen", "never changes the screen under a customer's hands"; denetim aralığı 2 dk. Gerçek cihazda 5 dakika ölçümü ayrıca yapılmalı. |
| Onaylı modda cihaz, satıcı "Şimdi yükle" demeden içeriği uygulamaz. | ✅ | `sync.test.ts` "in approved mode waits for the salesperson, even when idle" |
| Bir hafta çevrimdışı kalmış cihaz bağlanınca tek eşitlemeyle güncel hale gelir. | ✅ | `sync.test.ts` "takes everything it missed in one step after a week offline" |
| Askıya alınan mağazanın ekranı bir sonraki denetimde bilgi mesajına geçer; geri açılınca veri eksiksizdir. | ✅ | `showroom.spec.ts` "eşleşme, yeniden açılış, askıya alma ve kaldırma"; `merkez.spec.ts` "mağaza listesi: arama, süzme, askıya alma ve geri açma" |
| ORMEN elemanı rolü fiyat, abonelik ve silme işlemlerine arayüzü atlayarak da erişemez. | ✅ | `merkez.test.ts` "keeps price and subscription away from ORMEN elemanı, even asked directly", "lets ORMEN elemanı set up and edit content but delete nothing" (veritabanı satır kuralları); `tests/unit/roles.test.ts` (sunucu işlemleri) |
| "Mağaza gibi görüntüle" ve bütün toplu işlemler değişiklik günlüğünde görünür. | ✅ | `magaza.spec.ts` (destek görünümü açılışı günlükte); `merkez.spec.ts` "askıya alma ve toplu atama günlükte görünür ve oradan geri alınır", "özellik önce pilot etiketli mağazada…" (her mağaza ayrı kayıt, "toplu işlem") |
| 100 mağaza ve 2.000 ürünlük örnek veride liste ekranları 2 saniyenin altında açılır. | ✅ | `merkez.test.ts` "lists 100 shops with 2 000 products and 300 devices in well under 2 s"; `tests/unit/products.test.ts` (katalog işlevi aynı veride) |

Ek olarak: mağaza paneli ve veri ayrımı `tests/unit/magaza-db.test.ts`, `magaza.spec.ts`; erişilebilirlik `a11y.spec.ts` "merkez paneli ve mağaza paneli".

### İş 1 — Showroom modu

| Kabul ölçütü | Durum | Test |
|---|---|---|
| Eşleşmiş cihaz yeniden başlatıldığında kod sormadan firmanın showroom ekranına açılır. | ✅ | `showroom.spec.ts` "eşleşme, yeniden açılış, askıya alma ve kaldırma" |
| Hafif profilde, orta sınıf Android cihaz benzetiminde 3D sahne saniyede en az 30 kare döner; önceden yüklenmiş kumaş 500 ms içinde değişir. | 🟡 | `showroom.spec.ts` "kalite profili: hafif profilde detay azalır…"; bu ortamda GPU yok (yazılım çizimi), kare hızı gerçek ekranda `?olcum` ile ölçülmeli (KURULUM 8. adım). |
| 60 sn dokunulmayınca vitrin döngüsü başlar; dokunuşla 300 ms içinde çıkar; önceki oturumun verisi görünmez. | ✅ 🟡 | `kiosk.spec.ts` "kiosk: karşılama, telefona al, uyarı ve ziyaretçi değişince sıfırlanma"; `demo.spec.ts` 6. adım. 300 ms gerçek ekranda ölçülmeli. |
| Ağ kapatılıp sayfa yenilendiğinde showroom açılır, kumaş değişir, teklif oluşturulur; ağ açılınca teklif sunucuya bir kez düşer. | ✅ | `showroom.spec.ts` "çevrimdışı: ekran açılır, kumaş değişir, kayıtlar bağlantı gelince bir kez gider"; `tests/unit/queue.test.ts` |
| Ekranda hiçbir yerden dış siteye ya da panele PIN'siz çıkılamaz. | ✅ | `showroom.spec.ts` "kilit: dışarı çıkan bağlantı yok; logoya 5 dokunuş ve PIN ayar ekranını açar", "PIN ucu eşleşmemiş ekrana kapalı" |

### İş 2 — Sihirli kartela

| Kabul ölçütü | Durum | Test |
|---|---|---|
| Basılı etiket 20–40 cm mesafeden 2 sn içinde okunur. | ✅ 🟡 | `kartela.spec.ts` "ekran kamerası etiketi okur…" (sahte kamera, ~0,5 sn). Gerçek kamerada parlama, eğik tutma ve mağaza ışığıyla denenmeli. |
| Okutma sonrası kumaş değişimi görünür bir geçişle olur; gri ya da boş koltuk hiç görünmez. | ✅ | `kartela.spec.ts` (okuma boyunca kumaşlı parça sayısı 100 ms'de bir ölçülüyor, hiç sıfıra düşmüyor) |
| Çevrimdışıyken, cihazda saklı kumaşlar için okutma çalışır. | ✅ | `kartela.spec.ts` "…internet yokken de" |

### İş 3 — Metraj ve teklif

| Kabul ölçütü | Durum | Test |
|---|---|---|
| Parça metrajı girilmiş bir modelde, üç farklı kumaşla yapılan kombinasyonun toplamları elle hesapla tutar. | ✅ | `tests/unit/teklif-metraj.test.ts` (her sayının yanında elle hesabı); `teklif.spec.ts` |
| Fire katsayıları boşken fire eklenmez ve bu teklifte yazılıdır; girildiğinde hesap değişir. | ✅ | `teklif-metraj.test.ts`; `teklif.spec.ts` |
| PDF Türkçe karakterleri doğru basar, tek sayfaya sığar, logosuz firmada da düzgün çıkar. | ✅ | `tests/unit/teklif-pdf.test.ts` (pdftotext ve pdfinfo ile geri okunuyor; köşe şemalı uzun teklif de tek sayfa); `teklif.spec.ts` |
| Sipariş talebi ORMEN panelinde görünür ve bildirim gider; aynı teklif için iki kez gönderilse bir kez düşer. | ✅ | `teklif.spec.ts` "…sipariş talebi bir kez ORMEN'e düşer"; `tests/unit/teklif-db.test.ts`. Bildirim: panelde uyarı (e-posta servisi yok, 15 Kasım kararı). |
| Bir firmanın kullanıcısı başka firmanın teklifine adresini bilse de erişemez. | ✅ | `teklif-db.test.ts` (satır kuralları, müşteri adı ORMEN'e de kapalı); `magaza-db.test.ts` |

### İş 4 — Köşe kurucu

| Kabul ölçütü | Durum | Test |
|---|---|---|
| Örnek setle 3,15 m × 2,40 m bir L köşe üç dakikadan kısa sürede, yalnızca dokunarak kurulur. | ✅ | `kose.spec.ts` "3,15 × 2,40 m L köşe yalnızca dokunarak kurulur…" (9 dokunuş, ~20 sn) |
| Gösterilen toplam ölçüler modül ölçülerinin toplamıyla birebir tutar. | ✅ | `tests/unit/dizilim.test.ts`; `kose.spec.ts` (sahnede ±2 cm örnek set, GLB set ±1 cm) |
| Sağ–sol aynalama dizilimi ve ölçüleri bozmaz. | ✅ | `dizilim.test.ts`; `kose.spec.ts` (iki set için de) |
| Köşe takımının metrajı modül metrajlarının toplamıdır ve teklife doğru aktarılır. | ✅ | `dizilim.test.ts`, `tests/unit/modul-set.test.ts`; `kose.spec.ts` (teklif satırları) |
| Hafif profilde 8 modüllü dizilim akıcı döner. | 🟡 | Örnek GLB set 8 modülde ~120 bin üçgen; gerçek ekranda `?olcum` ile ölçülmeli. |

Ek olarak: panelden modül seti `modul-seti.spec.ts`, `tests/unit/modul-db.test.ts`; bağlantı noktası hizalaması `tests/unit/modul-glb.test.ts`; PDF'te şema `teklif-pdf.test.ts`.

### İş 5 — Anında giydirme (Fotoğraftan dene)

Arkasında yalnızca deneme sağlayıcısı var (hiçbir yeri çağırmaz, para harcamaz). Gerçek sağlayıcı ORMEN'in onayıyla bağlanacak; o güne kadar ekranlarda düğme görünmez.

| Kabul ölçütü | Durum | Test |
|---|---|---|
| Çekimden sonuca kadar süre 45 sn'yi geçmez (sağlayıcı süresi dahil; ölçümü rapora yaz). | 🔑 | `giydirme.spec.ts`: telefondan gönderimden sonuca 3,2 sn, bunun 0,8 sn'si deneme sağlayıcı. Gerçek sağlayıcı bağlanınca test sayfasında ölçülecek. |
| Etiket görsele işlenmiştir; indirilen dosyada da görünür. | ✅ | `tests/unit/giydirme.test.ts` (piksel ölçümü); `giydirme.spec.ts` (sunucudan inen dosyada piksel ölçümü) |
| Test sayfası 20 fotoğrafı toplu çalıştırır, oranı ve maliyeti gösterir. | ✅ | `giydirme.spec.ts` "giydirme testi: 20 koltuk toplu çalışır…" (16/20 şartı sağlandı / sağlanmadı); `tests/unit/test-tezgahi.test.ts` |
| Kota dolduğunda yeni üretim başlamaz ve maliyet oluşmaz. | ✅ | `tests/unit/giydirme-akis.test.ts` "calls nobody when the quota is used up or not set…"; `giydirme.spec.ts` |
| Oturum bittiğinde saklanması istenmeyen fotoğraf sunucudan da silinmiştir. | ✅ | `giydirme-akis.test.ts` "the end of a session…", süpürme; `giydirme.spec.ts` (ziyaret bitince dosya 404) |

---

## Dalga 2

| İş | Kabul ölçütleri | Durum |
|---|---|---|
| **İş 6 — Takım sahnesi** | Takım metrajı parça metrajlarının toplamıyla tutar ✅ (`tests/unit/takim.test.ts`: kumaş başına parçaların toplamı, elle hesapla) · Dört parçalı takım hafif profilde akıcı döner 🟡 (dört parça çakışmasız kuruluyor: `takim.test.ts`; kare hızı gerçek cihazda ölçülmeli) · Kombin seçimi teklif PDF'inde parça parça doğru ✅ (`takim.spec.ts`: teklif satırlarında berjer uyumlu kumaşla, kanepe ana kumaşla; PDF aynı satırlardan basılıyor) | ✅ büyük kısmı |
| **İş 7 — Satıcı modu ve karşılaştırma** | PIN'siz hiçbir yerden fiyat görünmez ✅ (`satici.spec.ts`: sayfa HTML'inde yok, yanlış PIN boş; `satici-db.test.ts`: herkese açık anahtar ve ORMEN elemanı okuyamaz) · Karşılaştırmada dönüş ve yakınlaşma eş zamanlı ✅ (yapı gereği: üç bölüm tek kamerayla çizilir, `lib/three/layers.ts`; `satici.spec.ts` üç kumaşın sahnede olduğunu sınar) · Fiyat girilmiş modelde teklif toplamı elle hesapla tutar ✅ (`tests/unit/satici.test.ts`: 38.000 + 48.500 + 12.000 = 98.500; `satici.spec.ts`: 52.000 TL) · Kendiliğinden kapanma 🟡 (1 dk; uçtan uca beklenmedi) | ✅ |
| **İş 8 — Kumaş özellikleri, stok ve filtreler** | Özelliği girilmemiş kumaş hiçbir özellik filtresinde çıkmaz ✅ (`tests/unit/kumas.test.ts`, `kumas.spec.ts`) · CSV ile 100 kumaşın stoğu tek seferde, hatalı satırlar raporlanır ✅ (`kumas.test.ts` 100 satır + 4 hatalı; `kumas.spec.ts` panelden yükleme ve satır numaralı rapor) · Stokta olmayan kumaş seçilince termin ve muadil görünür ✅ (`kumas.spec.ts`; stok herkese açık anahtarla okunamaz: `kumas-db.test.ts`) | ✅ |
| **İş 9 — Oda planı ve Salon Yerleşim Projesi** | 4 × 5 m oda, kapı, pencere ve L köşe yalnızca dokunarak 5 dakikada ✅ (`oda.spec.ts`, süre yazdırılır; gerçek ekranda parmakla ayrıca 🟡) · Plandaki ölçüler ürün ölçüleriyle tutar ✅ (plan ve PDF aynı ayak izinden çizilir, `tests/unit/oda.test.ts` sabit yerleri cm cinsinden) · Kapının önünü kapatan yerleşimde uyarı ✅ (`oda.test.ts`, `oda.spec.ts`) · PDF en fazla iki sayfa, Türkçe karakterler doğru ✅ (`oda.spec.ts` sayfa sayısı ve başlık; yazı tipleri teklif PDF'inin aynısı) | ✅ |
| **İş 10 — Koltuk danışmanı** | Her cevap birleşiminde en az bir öneri ya da "uygun ürün yok" ✅ (`tests/unit/asistan.test.ts`, 288 birleşim) · Gerekçede geçen her özellik panelde girili ✅ (`asistan.test.ts`, `asistan.spec.ts`) · Baştan sona 60 sn ✅ (`asistan.spec.ts`: 5 dokunuş, 0,3 sn) · Sesle anlatma: cihaz destekliyorsa düğme, ses saklanmaz ✅ (gerçek cihazda denenmeli 🟡) · Bütçe sorusu ⏳ (fiyatlar vitrine taşınınca) | ✅ büyük kısmı |
| **İş 11 — Aylık kullanım raporu** | Rapordaki sayılar olay kaydıyla birebir ✅ (`tests/unit/kullanim-db.test.ts`: veritabanı ve uygulama toplamları aynı olay kaydında sayı sayı aynı, elle sayımla da; `kullanim.spec.ts`: gönderilen olaylar kadar artar) · Hiç kullanılmamış ayda rapor boş değil, "kullanım yok" ✅ (`kullanim-db.test.ts`, `kullanim.spec.ts`, PDF'te de) · Firma yalnızca kendi raporunu görür ✅ (`kullanim-db.test.ts`: satır kuralı, başka mağaza ve herkese açık anahtar boş; `kullanim.spec.ts`: başka mağazanın olayları sayılmaz) | ✅ |

Ek (görev tanımı dışında, Fatih Bey'in isteği): **Asistan** — serbest sorular, metraj, kumaş karşılaştırma; `asistan.test.ts`, `asistan.spec.ts`.

## Dalga 3

| İş | Kabul ölçütleri | Durum |
|---|---|---|
| **İş 12 — Kumaş duvarı** | 30 karelik ızgara hafif profilde 10 sn içinde dolar, dolarken ekran donmaz 🟡 (`duvar.spec.ts`: dolarken kareler seçilebiliyor, süre yazdırılıyor; 10 sn gerçek cihazda ölçülmeli) · Karedeki görüntü 3D'dekiyle aynı kumaş ve ölçek ✅ (yapı gereği: kare sahnenin kendi model ve malzeme koduyla çiziliyor, `components/configurator/FabricWall.tsx`) | 🟡 |
| **İş 14 — Otomatik yerleşim önerisi** | Üç öneri gözle ayırt edilir ✅ (ana parça üç ayrı duvarda, küçük üstten çizimlerle; `tests/unit/oneri.test.ts`, `oda.spec.ts`) · Hiçbir öneride çakışma yok, kapı kapanmaz, geçiş payı eşiğin altına inmez ✅ (`oneri.test.ts`) · Öneri 3 sn içinde ✅ (`oneri.test.ts`) | ✅ |

| **İş 16 — Marka alanı ve web gömme** | Markası kapatılan kumaşlar o firmada hiçbir ekranda görünmez ✅ (`tests/unit/marka.test.ts`, `marka.spec.ts`; bütün ekranlar aynı katalog yükleyicisinden geçiyor) · Gömme kodu izinli olmayan alan adında çalışmaz ✅ (`marka.spec.ts`) · Gömülü sürüm telefonda düzgün ✅ (`marka.spec.ts`: 390 px'te taşma yok) | ✅ |

| **İş 13 — Telefona video ve müşteri kaydı** | Rıza kutusu işaretlenmeden kayıt oluşmaz ✅ (`tests/unit/musteri.test.ts`, `video.spec.ts`) · Silinen kayıt veritabanından da gider ✅ (`musteri.test.ts`, `video.spec.ts`) · ORMEN kullanıcısı hiçbir sorguyla müşteri telefonuna erişemez ✅ (`musteri.test.ts`: okuma, sayma, yazma reddedilir; `video.spec.ts`: ORMEN sayfasında yalnız sayı) · Video orta sınıf telefonda açılır ve 10 MB'ı geçmez ✅ 10 MB (`video.spec.ts`) / 🟡 gerçek telefon | ✅ büyük kısmı |
| **İş 15 — Müşterinin salonu** | Etiket indirilen görselde de görünür ✅ (`tests/unit/salon.test.ts`, `salon.spec.ts`) · Oturum sonunda fotoğraf sunucudan silinmiştir ✅ (`salon.test.ts`, `salon.spec.ts`; salon fotoğrafı saklanamaz, veritabanı kısıtı `kumas-db.test.ts`) · Başarısız üretim kotadan düşmez ✅ (`salon.test.ts`) | ✅ (deneme sağlayıcıyla; gerçek sağlayıcı 🔑) |

---

## Demo akışı test notu

Görev tanımı, bölüm 1'deki altı adımın "baştan sona, tek cihazda, kesintisiz" çalıştığının gösterilmesini istiyor. Bu, `tests/e2e/demo.spec.ts` ile her koşuda yeniden doğrulanıyor: tek tarayıcı, tek eşleşmiş showroom ekranı, adımlar arasında sayfa yenilemesi yok. Kamera Chromium'un sahte kamerası (kartelanın QR etiketini gösteriyor); giydirme deneme sağlayıcısıyla.

**Son koşu (24 Kasım 2026), geçti:**

| Adım | Süre |
|---|---|
| 1. Fotoğraftan dene (ekranın kamerasıyla çekim, bir kumaş, etiketli sonuç) | 4,1 sn |
| 2. Sihirli kartela (kartela kameraya, koltuk MISSO-05) | 15,2 sn |
| 3. Parça parça inceleme (kollar başka kumaş, sonra tümü) | 26,5 sn |
| 4. Köşe kurucu (örnek setle 315 × 185 cm L köşe) | 16,5 sn |
| 5. Metraj, teklif, PDF, telefon QR'ı, sipariş talebi (ORMEN panelinde göründü) | 9,0 sn |
| 6. Dokunulmayan ekran vitrin döngüsüne döndü (30 sn vitrin süresi dahil) | 45,0 sn |
| **Toplam** | **116 sn** |

Süreler test makinesinde, yazılım çizimiyle (GPU yok) ölçüldü; gerçek ekranda 3D adımları daha kısa sürer. 1. adımdaki süre deneme sağlayıcının süresidir; gerçek sağlayıcıyla yarım dakika civarı beklenir.

**Bu testin bulduğu ve düzeltilen kusur:** Müşteri kartelayı kameraya tutarken ya da fotoğrafı telefonundan gönderirken ekrana dokunmuyor. Vitrin süresi kısa tutulmuşsa ekran bu sırada kendini sıfırlıyor, fotoğraf oturumu da kapanıyordu. Kartela okuyucu ve Fotoğraftan dene penceresi açıkken artık boşta sayacı işlemiyor; demo testi en kısa vitrin süresiyle (30 sn) koşuyor.

**Gerçek cihazda ayrıca yapılmalı (KURULUM 8. adım):** 32" ekranda 1 metreden okunurluk, gerçek kamerayla kartela, kilit (Android uygulama sabitleme), internet kesilip açılınca davranış, hafif profilde kare hızı.
