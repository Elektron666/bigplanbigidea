# Avukat için bilgi paketi (pilot şartı 3)

Bu sayfa ORMEN TEKSTİL'in hukuk danışmanına verilmek için hazırlandı. Hukuki görüş değildir; sitenin bugün **gerçekte ne yaptığını** anlatır. Avukattan beklenen üç metin en altta.

## 1. Hangi kişisel veri, nerede toplanıyor

Sitede kişisel veri yalnızca **numune talep formunda** alınır:
- ad,
- telefon,
- seçilen kumaş kodları,
- isteğe bağlı üç seçim: ne için (yeni mobilya / yeniden kaplama vb.), kaç parça, ne zaman.

Formda serbest metin alanı **yoktur** (5 Ekim toplantısında kaldırıldı). Adres alınmaz; numune müşteriye değil, firmanın mağazasına gönderilir. Form, aydınlatma metnine bağlantı veren bir onay kutusu olmadan gönderilemez.

**Tutulmayanlar:**
- IP adresi,
- tarayıcı bilgisi,
- çerez.

Kullanım sayımı (ziyaret, kumaş denemesi) kimliksizdir. Sayım için sekme kapanınca silinen rastgele bir numara kullanılır ve bu numara talebe bağlanmaz.

**Geri bildirim formu (11 Ekim):** Konu (beğendim / öneri / hata / diğer) ve en fazla 1000 karakterlik serbest metin. Ad, telefon, e-posta, IP istenmez ve saklanmaz; metinde telefon ya da e-posta görünürse form ziyaretçiyi uyarır ama engellemez. Serbest metin olduğu için ziyaretçi yine de kişisel bilgi yazabilir; panelden tek tıkla silinebilir.

**IP kaydı sorusu (11 Ekim, Fatih Bey: "siteye girenlerin bilgisine legal olarak ulaşmamız lazım, IP kaydedebiliyor musun?").** Bugünkü tercih: kaydetmiyoruz. Gerekçe, avukatın teyidine:
- 5651 sayılı Kanun'da trafik bilgisini (IP, zaman) saklama yükümlülüğü **yer sağlayıcıya** (barındırma: Vercel, Supabase) ve **toplu kullanım sağlayıcıya** (internet kafe, otel ağı vb.) düşüyor; bizim konumumuz **içerik sağlayıcı**. Bildiğimiz kadarıyla içerik sağlayıcıya ayrıca IP saklama yükümlülüğü yok.
- IP adresi KVKK'da kişisel veri sayılıyor. Saklarsak aydınlatma metnine, saklama süresine ve imha politikasına girmesi gerekir; amacı da yok (satış, sepet, üyelik yok).
- Bir hukuki talep olursa (ör. kötüye kullanım), barındırma sağlayıcısının kendi erişim kayıtları var: Vercel istek kayıtlarını planına göre kısa süre tutuyor.
- Avukattan istenen: bu yorumun doğrulanması. "Saklayın" derse eklemek kolay (yalnızca numune talebine bağlı, süreli, aydınlatma metniyle).

## 2. Kim görüyor

| Kim | Ne görüyor |
|---|---|
| ORMEN TEKSTİL (panel kullanıcıları) | Bütün talepler: ad, telefon, kumaşlar, seçimler. **Fatih Bey'in kararı (6 Ekim): telefon ORMEN'de kalır.** |
| Talebin geldiği mobilya firması | ORMEN talebi firmaya WhatsApp'la iletir ("Mağazaya ilet" düğmesi). Firmanın panele erişimi yok. |
| Numuneyi okutan mağaza (`/n/<kod>` sayfası) | Yalnızca numune kodu, kumaş, lot ve adım. Ad ve telefon **görünmez**. |
| Usta (kesim föyü ve "gerçek metre" sayfası) | Kişisel veri yok. |

## 3. Nerede saklanıyor (yurt dışı aktarım)

| Sağlayıcı | Ne için | Konum |
|---|---|---|
| Supabase | Veritabanı ve dosyalar | Frankfurt, Almanya (proje bölgesi "Central EU") |
| Vercel Inc. (ABD şirketi) | İnternet sitesinin sunucusu | Frankfurt (`fra1`). Depodaki `vercel.json` dosyası bunu sabitliyor; panelin Kurulum sayfası sunucunun gerçekten nerede çalıştığını gösteriyor. |

Her iki sağlayıcının da standart veri işleme sözleşmesi (DPA) var. Hangisinin KVKK'nın 9. maddesine göre yeterli olduğu ve hangi bildirimin gerektiği avukattan beklenen sorulardandır.

## 4. Saklama ve silme

- **Süre:** Bugün talepler elle silinene kadar saklanıyor. Avukatın belirleyeceği süre sunucuya bir sayı olarak girilir (`SAMPLE_RETENTION_DAYS`). Bundan sonra o süreden eski talepler kendiliğinden silinir.
- **Elle silme:** Panelde her talebin yanında "Sil" var; iki adımla soruyor ve silinen kayıt geri gelmiyor. Bir kişi verisinin silinmesini isterse bu kullanılır.
- **Yedekler:** Bugün Supabase'in ücretsiz planı kullanılıyor ve otomatik yedek yok. Ücretli plana (Pro) geçilince günlük yedek 7 gün tutulur; silinen bir talep yedeklerde en fazla bu kadar kalır.

## 4a. Fotoğraftan dene (Showroom Paketi, İş 5; henüz hiçbir mağazada açık değil)

- **Ne toplanıyor:** Mağazadaki showroom ekranında müşterinin kendi koltuğunun fotoğrafı (ekranın kamerasıyla ya da müşterinin telefonundan). Ad, telefon sorulmaz. Fotoğrafta kişi olabilir; ekranda ve telefon sayfasında "fotoğrafta kişi bulunmamasına dikkat ediyorum" yazıyor.
- **Onay:** Fotoğraf gönderilmeden önce işaretlenmesi zorunlu kutu. Telefondaki cümle: "Fotoğrafın yalnızca bu deneme için kullanılacağını, kumaş görseli hazırlamak için bir yapay zekâ hizmetine (yurt dışında olabilir) gönderileceğini ve mağazadaki oturum bitince silineceğini biliyorum. Fotoğrafta kişi bulunmamasına dikkat ediyorum." Ekranda satıcı için benzeri var.
- **Yurt dışı aktarım:** Fotoğraf, görseli üretecek sağlayıcıya (henüz seçilmedi; adaylar ABD ve AB merkezli) gönderilir. Sağlayıcı seçilince onun veri işleme koşulları (fotoğrafı eğitimde kullanıyor mu, ne kadar saklıyor) avukata iletilecek.
- **Saklama:** Fotoğraf ve üretilen görseller özel bir depoda (herkese kapalı) tutulur; fotoğrafın konum ve kamera bilgisi yüklenirken silinir. Ziyaret bitince (ekran vitrin döngüsüne dönünce) sunucudan silinir; ekran kapanırsa en geç iki saat sonra, günlük temizlikte silinir. Mağaza "ürün fotoğrafı olarak sakla" derse fotoğraf mağazanın kendi ürün fotoğrafı olarak kalır; bu seçenek yalnızca mağazanın kendi ürünü için, müşteri fotoğrafı için değil (ekranda böyle yazıyor).
- **Avukattan:** onay cümlesinin son hâli; sağlayıcı seçilince yurt dışı aktarımın dayanağı; "ürün fotoğrafı olarak sakla" seçeneğinin yeterince açık olup olmadığı.

## 4b. Müşterinin salonu (İş 15; henüz hiçbir mağazada açık değil)

- **Ne toplanıyor:** Müşterinin salonunun fotoğrafı, telefonundan (QR ile). Ad, telefon sorulmaz. Onay kutusu 4a'dakiyle aynı.
- **Ne yapılıyor:** Fotoğraf ve seçilen ürünün ekrandaki 3D görüntüsü, ürünü fotoğrafa yerleştirecek yapay zekâ sağlayıcısına gönderilir (4a'daki sağlayıcı; henüz seçilmedi).
- **Saklama:** Salon fotoğrafı **hiçbir koşulda saklanmaz**: "sakla" seçeneği yok, veritabanı da buna izin vermiyor. Ekrandaki pencere kapanınca, en geç ziyaret bitince sunucudan silinir. Üretilen görselde "Ön izleme · ölçüler yaklaşıktır, ürün yerleşimi temsilîdir" yazısı görselin içine işlenmiştir.

## 4c. İlgilenen müşteriler ve telefona video (İş 13)

- **Video:** Showroom ekranında, seçilen koltuğun dönen videosu ekranın kendisinde üretilir (kişisel veri yok: koltuk, kumaş, mağaza logosu). Uzun, tahmin edilemez bir bağlantıyla saklanır; müşteri QR ya da WhatsApp ile telefonuna alır.
- **Ne toplanıyor:** Videoyu açan müşteri **isterse** ad ve telefon bırakır ("Size dönelim mi?"). Yanında baktığı ürün ve tarih tutulur. IP, tarayıcı bilgisi tutulmaz.
- **Onay:** İşaretlenmemiş gelen açık rıza kutusu zorunlu; işaretlenmeden sunucu kaydı kabul etmez. Bugünkü cümle: "Adımın ve telefonumun {mağaza} tarafından benimle iletişim için kullanılmasına açık rıza veriyorum." Kutunun bağlandığı **aydınlatma metni sayfası (`/aydinlatma/musteri`) bugün yer tutucu**; metni avukat yazacak.
- **Kim görüyor:** **Yalnızca o mağaza** (mağaza panelinde "Müşteriler"). ORMEN'in hiçbir hesabı (yönetici dahil) ad ya da telefonu göremez; veritabanında ORMEN için okuma kuralı yoktur. ORMEN panelinde mağaza başına yalnızca kayıt **sayısı** görünür. Bu durumda veri sorumlusu büyük olasılıkla mağaza, ORMEN ise veri işleyen konumunda; avukatın teyidi gerekiyor.
- **Saklama ve silme:** Süreyi mağaza belirler (7–730 gün); **süre girilmemiş mağazada form hiç çıkmaz**. Süresi dolan kayıt her gün kendiliğinden silinir. Mağaza tek tek ya da toplu siler; silinen kayıt veritabanından gider (yedekler için 4. bölümdeki not geçerli).
- **Avukattan:** aydınlatma metni (`/aydinlatma/musteri`); onay cümlesinin son hâli; mağaza ile ORMEN arasındaki rol dağılımı (sorumlu / işleyen) ve buna göre mağazayla yapılacak sözleşme maddesi; önerilecek saklama süresi.

## 5. Avukattan beklenenler

1. **Aydınlatma metninin son hâli** (`/kvkk` sayfası). Taslak sitede; köşeli parantezli iki yer boş:
   - saklama süresi,
   - yurt dışına aktarımın dayanağı.
2. **Pilot firmayla tek sayfalık veri protokolü.** Açık soru (acil toplantı, 6 Ekim): firma "müşterimin telefonu ORMEN'de kalıyor, ORMEN onu arar mı?" diye çekiniyor. Toplantının önerisi protokole şu sözün yazılmasıydı: "ORMEN, firma sayfasından gelen müşteriyi kendi satışı ya da kampanyası için aramaz; talebi firmaya iletir." Son kararı Fatih Bey verecek.
3. **Formdaki onay cümlesinin son hâli.** Bugünkü cümle (onay kutusu): "Adım ve telefonumun yalnızca numune talebim için {firma} ve ORMEN TEKSTİL ile paylaşılmasını kabul ediyorum." ORMEN ana sayfasında yalnızca "ORMEN TEKSTİL" yazar. Önerilen cümle: "Talebim {firma}'ya iletilsin; numuneyi ORMEN TEKSTİL hazırlasın."
4. **İlgilenen müşteriler için aydınlatma metni ve rol dağılımı** (4c).
5. **Gerekiyorsa** VERBİS kaydı ve sağlayıcılarla yapılacak sözleşmeler için yönlendirme.
