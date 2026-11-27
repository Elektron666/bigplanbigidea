# KARARLAR

Bu dosyada projede verilen kararlar, yapılan varsayımlar ve bilinen sınırlar tutulur. En yeni kayıt en üstte.

---

## Showroom Paketi başladı; kod bu depoda (15 Kasım 2026)

- **Depo:** Fatih Bey'in kararı: Showroom Paketi `bigplanbigidea` deposunda kurulur. Atelier'in kodu `ormen3xd` deposundan (`d5cb8aa`) temel olarak alındı; tanıtım videosu alınmadı. Yayındaki site hâlâ `ormen3xd`'den çıkıyor; Vercel bu depoya çevrilene kadar burada yapılan hiçbir şey yayına gitmez.
- **Para harcanmayacak (Fatih Bey).** Ücretli hiçbir servis çağrılmaz, ücretli bağımlılık eklenmez. Sonuçları:
  - Anında giydirme (İş 5) ve müşterinin salonu (İş 15) sağlayıcı arayüzü, kota, maliyet kaydı, etiket ve test sayfasıyla birlikte yazılır; arkasında yalnızca sahte sağlayıcı durur. Gerçek sağlayıcı, anahtar verildiği gün tek dosyayla eklenir. O güne kadar ekrandaki düğme kapalıdır; yarım özellik gösterilmez.
  - Bildirim: yalnızca panel listesi ve hazır WhatsApp bağlantısı. E-posta servisi yok.
- **Kumaş eni 140 cm (Fatih Bey).** Metraj hesabı 140 cm ene göre yapılır; model metrajının geçerli olduğu en varsayılan olarak 140'tır. Eni farklı girilmiş bir kumaşta sayı gösterilmez, nedeni yazar (eski kural).
- **Numune taleplerindeki ad ve telefon** ORMEN panelinde görünmeye devam eder (6 Ekim kararı değişmedi). Yeni kural yalnızca yeni verilere uygulanır: teklifteki müşteri adı ve "ilgilenen müşteriler".
- Görev tanımının eski kararlarla çeliştiği yerler ve seçilen yol: `PLAN-SHOWROOM.md`, 3. bölüm.

## İş 13: telefona video ve müşteri kaydı; İş 15: müşterinin salonu (27 Kasım 2026)

- **Telefona video:** Showroom ekranında "Telefona video". Ekran koltuğu 9 saniyede bir tur döndürüp kaydediyor (tarayıcının kendi kaydedicisi; hiçbir servis çağrılmıyor, ücretsiz); sol üstte mağazanın logosu (yoksa adı), altta ürün ve kumaş. Önce MP4 (her telefonda açılır), ekran yapamıyorsa WebM. 1280 × 720, 2,5 Mbit/sn: 9 sn ≈ 3 MB; sunucu 10 MB'ı aşanı almıyor. Video uzun, rastgele bir bağlantıyla (`/v/…`) saklanıyor; QR ve WhatsApp QR'ı ekranda. Aynı ziyarette teklif verildiyse bağlantıda "Teklifinizi açın" var. Mağaza bazında "Telefona video" (varsayılan açık).
- **Müşteri kaydı:** Videonun açıldığı telefon sayfasında "Size dönelim mi?": ad, telefon ve **işaretlenmemiş gelen açık rıza kutusu**; kutu işaretlenmeden düğme çalışmaz, sunucu da kabul etmez. Kutunun bağlandığı aydınlatma metni `/aydinlatma/musteri` şimdilik **yer tutucu**; metni ORMEN verecek.
- **Saklama süresi mağaza bazında** (mağaza panelinde **Müşteriler**, 7–730 gün). Süre girilmemiş mağazada form hiç çıkmaz, bilgi toplanmaz (varsayılan bir süre uydurulmadı). Günlük iş süresi dolan kayıtları siliyor; süre kısaltılınca hemen uygulanıyor.
- **İlgilenen müşteriler** listesi (mağaza panelinde): ad, telefon, baktığı ürün, tarih; tek tek ve toplu silme, silinen kayıt tablodan da gider. Destek görünümünde (ORMEN yöneticisi) liste boş görünür.
- **ORMEN hiçbir sorguyla ad ve telefona erişemez:** tabloda ORMEN elemanı ya da yöneticisi için hiçbir satır kuralı yok (okuyamaz, sayamaz, yazamaz); yazma yalnızca sunucudan, rızadan sonra. ORMEN panelinde ("Mağazaların aylık kullanımı") mağaza başına yalnızca **sayı**; sunucu bu sayıyı yalnızca mağaza sütununu okuyarak çıkarıyor.
- **Müşterinin salonunda (İş 15):** "Salonunuzda görün". Müşteri salonun fotoğrafını QR ile telefonundan gönderir (telefon sayfası "Salonunuzun fotoğrafını gönderin" der, rıza kutusu aynı). Ekran seçili ürünü 3D'de göründüğü gibi gönderir; sağlayıcı ürünü fotoğrafa yerleştirir. İş 5'in sağlayıcı arayüzü, kotası (aynı aylık kota) ve maliyet kaydı kullanılıyor. Görsele "Ön izleme · ölçüler yaklaşıktır, ürün yerleşimi temsilîdir" işleniyor; indirilen dosyada da duruyor. Başarısız ya da geç kalan üretim kotadan düşmez.
- **Salon fotoğrafı saklanmaz:** oturum "salon" amaçlı açılıyor; "sakla" isteği reddediliyor, veritabanında da salon oturumu saklanamaz (kısıt); pencere kapanınca, en geç ziyaret bitince fotoğraf ve görsel sunucudan siliniyor.
- **Sağlayıcı:** Arkada yine yalnızca deneme sağlayıcısı var (ürün görüntüsünü fotoğrafın ortasına yapıştırır, kimseyi çağırmaz). Gerçek sağlayıcı ORMEN'in onayıyla; o güne kadar düğme yalnızca deneme sağlayıcısı ayarlı test sunucusunda görünür. Mağaza bazında "Müşterinin salonunda" (varsayılan kapalı, ücretli olacağı için).
- **Şema:** `20261127000300_salon.sql` (oturuma amaç; salon oturumu saklanamaz), `20261127000400_video_musteri.sql` (özel `video` kovası 10 MB; `customer_leads`; mağazaya saklama süresi). Yalnızca ekler.
- **Vitrin sayacı düzeltmesi (tam koşuda bulundu):** "Hâlâ burada mısınız?" uyarısı ekrandayken bir bekleme (kamera, telefon, kumaş yüklemesi) başlarsa uyarı ekranda kalıyordu; artık kalkıyor. Kumaş yükleme beklemesi her yeni kumaş için yeniden sayılıyor.
- **Test:** Birim ve veritabanı: rıza kutusu olmadan kayıt yok; sahip yalnız kendi kayıtlarını okur ve siler; ORMEN elemanı ve yöneticisi hiçbir sorguyla okuyamaz, sayamaz, yazamaz; silinen kayıt tablodan gider; saklama süresini yalnız sahip koyar. Salon: talimatta ürünün gerçek ölçüsü, etiket görselde, kota, başarısız üretim düşmez, kota dolunca çağrı yok, oturum sonunda dosyalar silinir, salon fotoğrafı saklanmaz. Uçtan uca: ekranda video, telefonda açılır ve 10 MB altı; rızasız kayıt reddedilir, rızayla kayıt; ORMEN'de yalnız sayı; mağaza siler. Salon: telefondan fotoğraf, etiketli ön izleme, saklama reddi, pencere kapanınca dosya yok.
- **Denenmedi:** Videonun gerçek bir orta sınıf telefonda açılması 🟡 (test, telefon görünümlü tarayıcıda açılıp okunabildiğini sınıyor).

## İş 16: marka alanı ve web gömme (27 Kasım 2026)

- **Marka:** Kumaşa "Marka" alanı (kumaş sayfasında, CSV'de `marka`). Var olan bütün kumaşlar **ORMEN**. Mağaza sayfasında **Markalar ve web sitesine gömme**: "Bütün markalar (yeni eklenenler dahil)" ya da tek tek markalar. Kapatılan markanın kumaşı o mağazanın hiçbir ekranında yok (showroom, mağaza sayfası, gömme, asistan, kartela, QR ile açılan bağlantı); kuralı katı: seri sınırı gibi "hiçbiri kalmazsa hepsi" diye geri dönmez.
- **Marka kırılımı:** Sipariş talebine giden her kumaşın markası teklifle birlikte kaydediliyor; Siparişler sayfasında birden fazla marka varsa metre marka marka yazıyor. "Mağazaların aylık kullanımı" sayfasında teklif edilen kumaşların marka kırılımı.
- **Marka sahibine ayrı giriş ya da faturalama yok** (görev tanımı).
- **Web gömme:** `/gomme/<mağaza>`; mağaza sayfasında kopyalanacak hazır kod (iframe). Yalnızca mağazanın yazdığı alan adlarında açılır: `proxy.ts` her istekte mağazanın listesini okuyup `Content-Security-Policy: frame-ancestors` başlığını koyuyor; liste boşsa yalnızca kendi sitemizde açılır. Alan adı yazılırken adres verilse de yalnızca alan adı alınıyor; yıldızlı (her alt alan) kabul edilmiyor.
- **Gömülü sürümde** kilit, vitrin döngüsü, satıcı modu, fiyat, stok, kartela kamerası yok; numune talebi, teklif (mağazada açıksa), asistan, filtreler açık. Telefonda yatay taşma yok.
- **Mağaza sayfası (`/f/…`)** eskisi gibi her yere gömülebilir (eski karar); gömme için önerilen yol artık `/gomme/…`.
- **Şema:** `20261127000200_marka_gomme.sql` (`fabrics.brand` varsayılan ORMEN; `firms.brands`, `firms.embed_domains`; yalnızca ekler).
- **Test:** Birim: markasız kumaş ORMEN, marka süzgeci katı, alan adı temizleme, frame-ancestors. Uçtan uca: Delta markalı kumaş, yalnız ORMEN'li mağazanın sayfasında kodla istense de yok; gömme izinli sitede açılır (numune var, satıcı yok, Delta kumaşı yok), başka sitede açılmaz; telefon genişliğinde taşma yok.

## İş 12: kumaş duvarı (27 Kasım 2026)

- **Kumaş sekmesinde "Kumaş duvarı":** açık modelle en çok 30 kumaş ızgarada. Kaynak: kumaş listesinde filtre varsa filtredeki kumaşlar, yoksa seçili kumaşın serisi önce, sonra diğerleri.
- **Kareler 3D'den:** her kare, sahnenin kendi kodu (aynı model, aynı malzeme ve doku ölçeği, aynı ışık) ile ekranın dışında küçük bir 3D alanda tek tek çiziliyor; bu yüzden karedeki kumaş ve ölçek 3D'dekiyle aynı. Çizildikçe ızgaraya giriyor, beklerken kumaşın ortalama rengi görünüyor; ekran donmuyor (kare başına bir iki çerçeve, araya dokunuşlar giriyor).
- **Önbellek:** yapılan kareler ziyaret boyunca saklanıyor (model + kumaş); duvar yeniden açılınca hemen dolu. Ziyaret bitince (sayfa sıfırlanınca) gider.
- **Dokunma:** bir kare seçilir, "3D'de aç" ile koltuğa giyer; ikinci kare seçilince ikisi karşılaştırmada açılır. Aynı kareye tekrar dokunmak seçimi kaldırır.
- **Test:** Uçtan uca: duvar dolar (süre testte yazılıyor), dolarken kare seçilebiliyor, kareden 3D'ye, ikinci açılışta önbellekten hemen, iki kareyle karşılaştırma.
- **Denenmedi:** "30 kare hafif profilde 10 sn" gerçek showroom cihazında ölçülmeli 🟡 (test makinesi yazılımla çiziyor, gerçek ekrandan çok yavaş).

## İş 14: otomatik yerleşim önerisi (27 Kasım 2026)

- **Oda sekmesinde "Yerleşim öner":** odadaki ürünlerle en çok üç yerleşim, küçük üstten çizimleriyle; birine dokununca oda o yerleşimi alır, sonra elle düzenlenir.
- **Kurallar** (`lib/oda/oneri.ts`, ücretsiz, cihazda): en geniş parça her öneride **başka bir duvara** yaslanır (önerileri gözle ayıran bu). Duvar sırası: TV ünitesi varsa ona dönük, pencere varsa ona dönük, sonra kalan duvarlar. Diğer parçalar ana parçanın 1,6 m önündeki noktaya en yakın, ona dönük yere konur (10 cm ızgara, dört yön).
- **Her öneride:** hiçbir şey üst üste değil; kapı önü (açılma payı) ve pencere önü (geçiş payı derinliğinde) boş; mobilyalar arası, mobilya ile kolon, radyatör, sehpa ve TV ünitesi arası en az geçiş payı (mağaza kaydındaki, yoksa 60 cm). Halı ve perde engel sayılmaz.
- **Sığmayan ürün:** "Köşe Takımı bu odada kapıları ve geçişi kapatmadan hiçbir duvara sığmıyor. Daha küçük: Lara Üçlü (220 cm)." Daha küçük öneri yalnızca mağazanın kendi, aynı kategorideki daha dar modeli; kategorisi girilmemişse yalnızca sığmadığı söylenir. Sığmayan parça önerinin dışında kalır ve odada olduğu yerde durur.
- **Test:** Birim: 4 × 5 m odada kapı ve pencereyle üç öneri, ana parça üç ayrı duvarda, 3 sn içinde; hiçbirinde çakışma, kapı ya da pencere önü kapanması, geçiş payı altı boşluk yok; sığmayanın düz dille söylenmesi. Uçtan uca: oda testinde üç öneri çıkar, birine dokununca uygulanır, kapı önü uyarısı çıkmaz.

## İş 9: oda planı ve Salon Yerleşim Projesi (27 Kasım 2026)

- **Oda:** Dikdörtgen ya da L (eskiden vardı). Ölçüler dokunarak; **Oda** sekmesinde yeni bölümler:
  - **Kapı, pencere, kolon, radyatör:** "+ Kapı" vb. ile eklenir; duvar dört düğmeden seçilir, "Duvar başından" konum, genişlik ve (kolon, radyatörde) derinlik **− / +** ile 10 cm adımla ayarlanır; klavye gerekmez. Sabit duvarın dışına taşamaz. Başlangıç ölçüleri (kapı 90, pencere 150 cm…) yalnızca ayarın başladığı yer; ürün bilgisi değil.
  - **Dekor:** halı, sehpa, TV ünitesi, perde. Genel şekiller, sade renklerde; ekranda "Genel şekillerdir; satılan ürün değildir", PDF'te "(şekil)" yazar.
- **Ürünler** eskisi gibi gerçek ölçüleriyle; köşe kurucuda kurulan dizilim ve takım sahnesi dahil odaya girer, sürüklenir, döner, duvara yaslanır.
- **Plan ⇄ 3D tek tuşla:** "Görünüm: 3B / Plan" düğmeleri artık showroom ekranında da var (eskiden kiosk'ta gizliydi). Planda sabitler ve dekor adı ve ölçüsüyle yazılı.
- **Geçiş payı uyarısı** (`lib/oda/plan.ts`): en az biri mobilya olan iki şey (mobilya, sehpa, TV ünitesi, kolon, radyatör) arasındaki boşluk 0'dan büyük ve eşikten küçükse "X ile Y arası 45 cm; geçiş için en az 60 cm önerilir." Halı ve perde engel sayılmaz. Kapının önü: kapı genişliğinde ve kapının açılma payı kadar (kapı genişliği, en az eşik) derin alan; içine giren her şey için "Kapının önü kapalı: …". Eşik **mağaza kaydında "Geçiş payı (cm)"**, boşsa görev tanımındaki 60 cm. Üst üste binme eski uyarısıyla kalıyor, burada tekrar edilmiyor.
- **Salon Yerleşim Projesi (PDF):** Oda sekmesinin altında. En çok iki sayfa, ekranda üretilir (internetsiz de). 1. sayfa: mağazanın logosu (yoksa adı), ölçülü üstten plan (oda ölçüleri, sabitler, dekor kesik çizgiyle, her ürün adı ve ölçüsüyle, 1 m ölçek çubuğu), iki 3D görüntü (ekrandaki açı ve 40° yandan). 2. sayfa: ürün ve kumaş listesi, kumaş bazında metraj (fire girilmemişse yazar), ekran mağazanın fiyatlarını biliyorsa (satıcı modu ya da müşteriye açık fiyat) parça parça fiyat ve toplam, geçiş uyarıları, renk notu. Bu iş için yazılan hiçbir metinde görev tanımının yasakladığı kelime yok.
- **Bağlantı:** Sabitler ve dekor adreste (`sb=`); paylaşılan ya da QR'la alınan bağlantı odayı aynen açar. Odaya sığmayan sabit açılışta düşer.
- **Tam çizim programı değil:** serbest duvar, kat planı, çok oda yok (görev tanımı).
- **Test:** Birim: sabitin duvardaki yeri, kapı önü alanı, boşluk ölçümü, geçiş ve kapı uyarıları, eşik, bağlantıya yazıp okuma. Uçtan uca: 4 × 5 m oda, pencere, kapı ve köşe takımı yalnızca dokunarak (süre testte yazılıyor, 5 dk sınırı), kapı koltuğun arkasındayken uyarı, kapı yana alınınca uyarı kalkar, sehpa yakınken geçiş uyarısı, plan ⇄ 3D, PDF en çok iki sayfa ve başlığı doğru.
- **Denenmedi:** Gerçek showroom ekranında parmakla 5 dakika ölçümü; PDF'in yazıcıdan çıktısı.

## İş 6: takım sahnesi ve kombin (27 Kasım 2026)

- **Takım tanımı panelde, mağaza bazında** (Mağazalar → mağaza → **Takımlar**): takımın adı, parçaları (2–6 model; ilk seçilen ana parça) ve her parçanın ana parçaya göre yeri (cm) ve yönü (0/90/180/270°). **Yerleşimi öner** bir başlangıç verir: en geniş parça arkada, diğer kanepeler uçlarında ona dönük, berjer ve puflar önde ona dönük; aralar 20 cm. Her yer elle değiştirilebilir.
- **Ekranda:** Kumaş sekmesinde "Takımı kur: …" düğmesi. Takım odaya bir seferde girer: ana parça tek parçanın gideceği yere, diğerleri ona göre; duvar dışına taşan duvara çekilir, başka parçanın üstüne düşen en yakın boş yere gider. Her parça ayrı bir parçadır: ayrı kumaş, ayrı bölge kumaşı, ayrı taşıma.
- **Kombin:** Tek düğme, "Kombin: berjer ve puf farklı kumaş". Açıkken seçilen kumaş yalnızca **berjer ve puf** kategorisindeki parçalara gider. Önce ana parçanın kumaşına ORMEN'in girdiği **uyumlu kumaşlar** önerilir; liste boşsa öneri yapılmaz, "uyumlu kumaş girilmemiş" yazar ve kumaş listeden seçilir.
- **Kırlent:** Modellerde kırlent ayrı bir bölge değil (bölgeler: gövde, kol, oturak, sırt, biye). Kırlent, model metrajında "ek parça" olarak duruyor ve parçanın ana kumaşıyla hesaplanıyor. Kırlente ayrı kumaş için modellerin kırlenti ayrı parça olarak çizilmesi gerekir; bu yapılmadı.
- **Kategori:** Kombin, modelin kategorisine bakıyor. Model sayfasına "Kategori" seçimi eklendi (Danışman etiketlerinin üstünde). Örnek veride "Berjer" modeli berjer, "Modüler Kanepe" kanepe, "Köşe Takımı" köşe olarak işaretlendi. Kategorisi girilmemiş model kombine girmez.
- **Metraj:** Takımın metrajı, teklifteki gibi bütün parçaların toplamı ve kumaş bazında ayrı. Fire ve yukarı yuvarlama kumaşın toplamına **bir kez** uygulanıyor (her parçaya ayrı yuvarlama metrajı şişirirdi). Teklif ve PDF'te satırlar parça parça, her satırda o parçanın kumaşı.
- **Mağaza bazında:** "Takım sahnesi" (varsayılan açık).
- **Şema:** `20261127000100_takim.sql` (`firm_sets`; yalnızca ekler, geri alma `supabase/geri-al/` altında). Takım değişince mağazanın ekranları güncelleme alır.
- **Test:** Birim: takım doğrulama, yerleşim önerisi, dört parçalı takımın odada çakışmasız ve duvar içinde kurulması, ekranda olmayan parçanın düşmesi, takım metrajının parça metrajlarının toplamı olması (21 m ve 6 m; fireyle 23,5 m ve 7 m, elle hesabı testte). Uçtan uca: panelde takım ve uyumlu kumaş, ekranda tek dokunuşla kurulum, kombinde uyumlu kumaş yalnız berjere, teklifte parça parça doğru kumaş.
- **Denenmedi:** "Dört parçalı takım hafif profilde akıcı döner" gerçek cihazda ölçülmeli 🟡.

## İş 7: satıcı modu, fiyat grupları, teklif geçmişi, üç kumaş karşılaştırma (27 Kasım 2026)

- **Fiyat grubu:** ORMEN her kumaşa bir fiyat grubu verir (A, B, C…; kumaş sayfasında ve CSV'de `fiyat_grubu`). Mağaza, panelindeki **Ürünler** sayfasında her model için bir satış fiyatı (bütün gruplar için) ve farklıysa grup grup fiyat girer. Girilmeyen grupta modelin tek fiyatı geçer; o da yoksa fiyat yoktur.
- **Hesap kuralı** (`lib/satici/fiyat.ts`): parça fiyatı, kumaşının grubundaki fiyattır. Kolu ya da minderi başka kumaştan olan parça, kumaşlarından **en pahalı grubun** fiyatını alır. Kumaşlarından birinin fiyatı yoksa parçanın fiyatı yok sayılır (ucuz olanın fiyatı yazılmaz). Teklif toplamı yalnızca her parçanın fiyatı varsa çıkar; yoksa hangi parçanın fiyatı girilmemiş, o yazar. Satıcı toplamı teklifte yine elle değiştirebilir.
- **Satıcı modu:** Showroom ekranında "Satıcı" düğmesi, mağaza PIN'i (ekran kilidindeki PIN'in aynısı; mağaza başına tek PIN). PIN doğruysa ekran sunucudan fiyatları, stok ve termini, son 30 günün tekliflerini alır. 1 dakika dokunulmazsa kendiliğinden kapanır; ziyaret bitince de kapanır. Hatalı PIN denemeleri ekran kilidiyle ortak sayılır.
- **PIN'siz fiyat yok:** Fiyatlar sayfanın içinde hiç yok; yalnızca PIN'den sonra sunucudan gelir. Mağaza "Fiyat müşteriye de görünsün" özelliğini açarsa (varsayılan kapalı) fiyatlar showroom ekranında PIN'siz görünür. Mağazanın web sayfasında fiyat hiç gösterilmez. Grup fiyatları veritabanında yalnızca mağaza sahibine ve ORMEN yöneticisine açık; ORMEN elemanı göremez. Günlüğe yalnızca "fiyat değişti" yazar, fiyat yazmaz.
- **Teklif geçmişi** (satıcı modunda): bugün ve son 30 gün. **Yeniden aç**: teklifin parçaları kumaşlarıyla ekrana gelir. **Kopyala**: aynısı ekrana gelir ve yeni teklif penceresi açılır. Müşteri adı geçmişte gösterilmez.
- **Karşılaştırma üç kumaşa çıktı:** "Üçüncü kumaş ekle" ile ekran üçe bölünür. Tek kamera ile üç geçişte çizildiği için döndürme ve yakınlaştırma üç bölümde de aynı anda olur; ayrı kamera yok, senkron hatası olamaz. İki kumaşta eski sürüklenebilir çizgi duruyor. Müşteri modunda da çalışır.
- **Mağaza bazında:** "Satıcı modu" (varsayılan açık), "Fiyat müşteriye de görünsün" (varsayılan kapalı).
- **Şema:** `20261127000000_satici_modu.sql` (yalnızca ekler: `fabrics.price_group`, `firm_group_prices`, `shop_set_group_price()`); geri alma `supabase/geri-al/` altında.
- **Test:** Birim: fiyat okuma, grup/model fiyatı, iki kumaşlı parça, elle toplam, fiyatı eksik parça. Veritabanı: sahip yalnız kendi mağazasına, fonksiyon üzerinden; başka mağazaya yazamaz; herkese açık anahtar ve ORMEN elemanı göremez; günlükte fiyat yok. Uçtan uca: sayfa HTML'inde fiyat yok, yanlış PIN boş döner, PIN ile B grubu fiyatı ve grupsuz kumaşta model fiyatı, teklif toplamı 52.000 TL (elle: 1 köşe takımı × B grubu), geçmişten teklif ekrana açılır, satıcı modu kapanınca fiyat gider, üç kumaş karşılaştırmada sahnede üç kumaş.
- **Denenmedi:** 1 dakikalık kendiliğinden kapanma uçtan uca testte beklenmedi (test bir dakika boşta bekletilmedi); mantık basit bir sayaç.

## İş 11: aylık kullanım raporu (24 Kasım 2026)

- **Mağaza panelinde "Rapor":** ay ay (son 12 ay, 2026'dan önce değil). Showroom oturumu sayısı, ortalama ve toplam süre, web sayfası ziyareti, kumaş denemesi, teklif, sipariş talebi, kartela okutma, fotoğraftan dene (istek, görsel, başarısız; içinde bulunulan ayda kalan kota), asistan sorusu; en çok denenen 5 kumaş ve en çok bakılan 5 model. **PDF indir:** aynı sayılar tek A4 sayfa.
- **Sayılar yalnızca olay kaydından:** Toplamlar veritabanında `usage_report()` ile yapılıyor; aynı toplamlar uygulamada `lib/rapor/kullanim.ts`'de de var ve aynı olay kaydında ikisinin sayı sayı aynı çıktığı test ediliyor. Teklif ve sipariş sayısı da olay kaydından (teklif tablosundan değil), "rapordaki sayılar olay kaydıyla birebir" ölçütü için.
- **Oturum** = "Başlamak için dokunun"dan ekranın kendini sıfırlamasına kadar. Süre yalnızca biten oturumlardan (elektrik kesilen oturumun sonu yok, süresi tahmin edilmez).
- **Az veride sıralama:** 1. toplantıdaki "30 ziyaretin altında sıralama gösterme" kuralı ORMEN satışçısının elden verdiği eski aylık özet (`/panel/ozet`) içindi ve orada duruyor. Görev tanımı İş 11'de "en çok bakılan 5" istiyor; mağazanın kendi raporunda sıralama her zaman gösteriliyor, sayısıyla birlikte (3 deneme ile 1. olan, sayısından belli).
- **Hiç kullanılmamış ay:** boş sayfa değil, "Bu ay kullanım yok." ve ne yapılacağı (sayfada da PDF'te de).
- **Mağaza yalnız kendi raporunu görür, veri katmanında:** Olay tablosuna yeni satır kuralı: mağaza sahibi yalnızca kendi mağazasının olaylarını okuyabiliyor (gizli/askıdaki mağazasınınki dahil). Rapor sahibin kendi oturumuyla çağrılıyor. Olaylarda kişisel bilgi yok (IP, ad, fotoğraf yok).
- **Her ayın başında otomatik özet:** E-posta servisi yok (para harcanmıyor). Günlük iş (`/api/canli-tut`) her ay, bir önceki ay için her açık mağazaya bir "rapor hazır" kaydı bırakıyor (mağaza ve ay başına bir kez). Mağaza panelinin açılışında "Ekim 2026 kullanım raporunuz hazır · Raporu aç · PDF indir" çıkıyor; rapor açılınca kalkıyor. ORMEN panelinde kimin açtığı görünüyor; açmayan mağazaya WhatsApp'la hatırlatma bağlantısı (mağazanın WhatsApp numarası girilmişse).
- **ORMEN panelinde "Mağazaların aylık kullanımı"** (Rapor sayfasından): bütün mağazalar yan yana, kullanmayan "Kullanım yok"; **30 gündür kullanılmayan ekranlar** (son müşteri oturumu 30 günden eski, ya da 30 günden önce eşleştirilmiş ve hiç oturum yok; geçen hafta eşleştirilen ekran uyarı vermez); **mağaza bazında en çok teklif edilen kumaşlar** (teklif tablosundan, her kumaş teklif başına bir kez).
- **Şema:** `20261124000100_kullanim_raporu.sql` (yalnızca ekler: iki fonksiyon, sahibin okuma kuralı, `usage_notices`). Geri alma `supabase/geri-al/` altında; olaylara dokunmaz.
- **Test:** Veritabanı: aynı olay kaydında veritabanı ve uygulama toplamları birebir; elle sayılan değerler; sahip yalnız kendi mağazası (gizli mağazası dahil), herkese açık anahtar hiçbir şey; boş ay; ekranların son oturumu. Birim: kullanılmayan ekran kuralı, ay listesi, teklif edilen kumaş sayımı. Uçtan uca: bilinen olaylar gönderilir, mağaza raporu tam o kadar artar, başka mağazanınki sayılmaz; tek sayfa PDF; eski ay "kullanım yok"; ORMEN sayfasında aynı sayı; "rapor hazır" şeridi açılınca kalkar, ORMEN'de "Açıldı" görünür. Yeni sayfalar erişilebilirlik testinde.

## İş 8: kumaş özellikleri, müşteri filtreleri, stok ve muadil (24 Kasım 2026)

- **Özellikler:** Kumaşa üç işaret eklendi: leke tutmaz, evcil hayvana dayanıklı, kolay temizlenir. Her biri "Girilmedi / Evet / Hayır"; panelde kumaş sayfasında ve toplu CSV'de (`leke_tutmaz`, `evcil_hayvan`, `kolay_temizlik`: evet, hayır ya da boş). Sürtünme dayanımı (Martindale) ve içerik zaten vardı. Girilmeyen hiçbir yerde görünmez; kumaş tipinden ya da Martindale'den hiçbir özellik çıkarılmaz. Ekranda "Özellikler" satırında yalnızca "Evet" girilenler yazar.
- **Müşteri filtreleri** (kumaş listesinde, renk ve tipin yanında) ve okudukları işaretler, ekranda da yazılı:
  - **Çocuklu ev:** leke tutmaz **ya da** kolay temizlenir girilmiş kumaşlar. (Martindale eşiği konmadı: bir sayı uydurmak olurdu.)
  - **Evcil hayvan:** evcil hayvana dayanıklı girilmiş kumaşlar.
  - **Kolay temizlik:** kolay temizlenir girilmiş kumaşlar.
  - Bir filtre, o listede onu karşılayan en az bir kumaş varsa görünür; hiçbir kumaşa işaret girilmemişse filtre düğmeleri hiç çıkmaz. Mağaza bazında kapatılabilir ("Müşteri filtreleri", varsayılan açık).
- **Stok:** Kumaş başına var / az / yok ve termin günü (1–365). Panelde **Kumaşlar → Stok**: tablodan elle ya da CSV ile (`kod;stok;termin_gun`, virgül de olur). CSV önce panelde okunur; hatalı satırlar satır numarası ve nedeniyle listelenir, doğrular tek seferde uygulanır. Termin girilmemiş "yok" ekranda "Termini mağazaya sorun" der; sayı uydurulmaz.
- **Stok kime görünür:** Görev tanımı İş 7'de "fiyat, stok ve termin yalnızca satıcı modunda" diyor; satıcı modu henüz yok. Bu yüzden stok ayrı bir tabloda (`fabric_stock`) ve herkese açık anahtarla okunamıyor; sunucu onu yalnızca **"Stok ve termin" özelliği açık mağazaların showroom ekranına** veriyor (varsayılan kapalı). Mağazanın web sayfası ve ORMEN'in sitesi stoğu hiç almıyor. Satıcı modu gelince stok orada her zaman görünecek; bu anahtar o zaman "müşteri modunda da göster" anlamına gelecek.
- **Muadil:** Kumaş sayfasında "Muadil kumaşlar" (kod listesi, sırayla). Stokta olmayan kumaş seçilince ekranda termin ve muadiller "Muadil" etiketiyle çıkar; biri de stokta yoksa önerilmez. Liste boşsa aynı tip **ve aynı renk ailesinden**, rengi en yakın üç kumaş "Benzer" etiketiyle önerilir (renk yakınlığı kumaş fotoğrafının ortalama renginden, Lab uzayında). Yer tutucu (örnek) kumaşlar "Benzer" diye önerilmez.
- **Uyumlu kumaşlar** listesi de aynı yerde girilebiliyor; İş 6'daki kombin modu bunu kullanacak (boşsa öneri yok).
- **Asistan da öğrendi:** "leke tutar mı", "yıkanır mı", "kedimiz var" soruları artık bu işaretlerden cevaplanıyor: evet girilmişse evet, hayır girilmişse hayır, girilmemişse "girilmemiş". Danışman, çocuk/evcil hayvan cevabında işaretli kumaşı öne alıyor ve gerekçeye yazıyor.
- **Geri alma:** Stok ve muadil/uyumlu liste değişiklikleri günlüğe önceki hâliyle yazılıyor; günlükten geri alınabiliyor.
- **Şema:** `20261124000000_kumas_ozellik_stok.sql` (yalnızca ekler; geri alma `supabase/geri-al/` altında). Stok ve liste değişince mağaza ekranları güncelleme alıyor.
- **Test:** Birim: işaretlerin gösterimi, filtrelerin yalnızca girilmiş işarete dayanması, CSV'de evet/hayır, 100 satırlık stok CSV'si ve hatalı satırların satır numarasıyla raporu, termin metni, muadil ve benzer, geri alma. Veritabanı: stok herkese açık ve mağaza anahtarıyla okunamıyor, yalnızca ORMEN elemanı yazıyor, liste herkese açık okunuyor, kumaş kendine muadil olamıyor, göç geri alınıp yeniden uygulanıyor. Uçtan uca: CSV'den stok ve hata raporu, elle stok, muadil ve özellik girişi, stok açık mağaza ekranında termin ve muadil (muadile dokununca koltukta o kumaş), "Çocuklu ev" filtresi, mağazanın web sayfasında stoğun hiç olmaması.

## Teslim: TEST-SHOWROOM.md ve demo akışı testi; vitrin sayacı kamerayla iş sürerken durur (24 Kasım 2026)

- **TEST-SHOWROOM.md:** görev tanımındaki her kabul ölçütü (bölüm 3A, 4–8, 10), onu sınayan test ve durumu. İşaretler: otomatik test geçti, gerçek cihazda ayrıca denenmeli, ORMEN'in kararını bekliyor, henüz yazılmadı. Gerçek cihaz gerektirenler dürüstçe ayrı işaretlendi (kare hızı, 300 ms, gerçek kamera, 5 dakikada eşitleme ölçümü).
- **Demo akışı testi (`tests/e2e/demo.spec.ts`):** görev tanımının altı adımı (fotoğraftan dene, kartela, parça parça, köşe kurucu, teklif ve sipariş talebi, vitrin döngüsü) tek tarayıcıda, tek eşleşmiş ekranda, sayfa yenilenmeden; her adımın süresi yazdırılıyor. Teslim listesindeki "kısa test notu" TEST-SHOWROOM.md'nin sonunda, bu testin son koşusuyla.
- **Bu testin bulduğu kusur (düzeltildi):** müşteri kartelayı kameraya tutarken ya da fotoğrafı telefonundan gönderirken ekrana dokunmuyor; vitrin süresi kısa tutulmuşsa ekran bu sırada kendini sıfırlıyor, fotoğraf oturumu da kapanıyordu. Kartela okuyucu ve Fotoğraftan dene penceresi açıkken (`data-mesgul` işareti) boşta sayacı artık işlemiyor. Test en kısa vitrin süresiyle (30 sn) koşuyor. Asistan penceresinde yazı yazmak zaten dokunuş sayıldığı için işaret konmadı.
- **Tam koşuda bulunan ikinci kusur (düzeltildi):** müşteri dokunup kumaşın 3D'de yüklenmesini beklerken de sayaç işliyordu; yavaş bir cihazda yükleme vitrin süresini aşarsa ekran müşterinin önünde sıfırlanıyordu. Kumaş yüklenirken (`data-yukleniyor`) sayaç artık durur, ama en çok 60 sn: hiç bitmeyen bir yükleme ekranı vitrin döngüsünden alıkoymaz (`lib/kiosk.ts`, `LOAD_HOLD_MS`).

## Asistan ve koltuk danışmanı (İş 10 + Fatih Bey'in "kendi yapay zekamız"ı), ücretsiz sürüm (23 Kasım 2026)

**İstenen (Fatih Bey):** müşterinin ya da satıcının "soru sorabileceği, fikir alacağı, metraj hesaplatacağı" kendi asistanımız. Görev tanımındaki İş 10 (Koltuk danışmanı) bunun içine alındı. Özel giydirme (Fotoğraftan dene) ayrı bölümde kalıyor; asıl sistem Atelier'deki gibi 3D.

**Nasıl çalışıyor:** Mağaza sayfasında ve showroom ekranında **Asistan** düğmesi (mağaza bazında açılıp kapanır; ücretsiz olduğu için varsayılan açık). Tam ekran pencere: yazarak, hazır sorulara dokunarak ya da cihaz destekliyorsa **sesle** soru. Ses tarayıcının kendisinde yazıya çevrilir, saklanmaz; desteklemeyen cihazda düğme görünmez.
- **Serbest sorular** (`lib/asistan/soru.ts`, saf ve testli): metraj ("bu koltuğa kaç metre", "Köşe Takımı için MISSO-05 kaç metre"), kumaş özellikleri (dayanıklı mı, kedi/çocuk, bileşim, en, yanmazlık, ağırlık, desen tekrarı, temizlik), iki kumaşın farkı, renge göre kumaşlar, öneri isteği. Kumaş kodu nasıl yazılırsa yazılsın bulunur ("misso 5", "MISSO05"); "bu kumaş / bu koltuk" ekrandaki parçadır.
- **Hiçbir şey uydurulmaz:** cevaplar yalnızca panelde girilmiş bilgiden kurulur. Girilmemiş bilgi sorulursa "…panelde girilmemiş. Kesin bilgi için mağaza görevlisine sorun ya da numune isteyin." Temizlik ve bakım için panelde alan yok; bu soruya her zaman bu cevap verilir. Kedi/çocuk sorusunda girilmiş Martindale değeri söylenir ve "kesin karar numuneyle verilir" eklenir; "uygun" denmez.
- **Metraj** teklifteki işlevin aynısıyla hesaplanır; mağaza sayfasında fire ORMEN'in fire ayarlarıyla, ayar yoksa "Fire dahil değildir." Metraj girilmemiş modelde "Kesin metrajı usta hesaplar."
- **Anlamadığı soru:** "Bunu anlayamadım. Şunları sorabilirsiniz: …" ve örnek sorular.

**Koltuk danışmanı** (`lib/asistan/danisman.ts`, saf ve testli): büyük düğmelerle 5 soru: duvarın uzunluğu (2 m'den kısa / 2–3 / 3–4 / 4 m'den uzun), evde çocuk ya da evcil hayvan, kullanım sıklığı, tarz (yalnızca mağazanın modellerinde bulunan tarzlar sorulur; hiç yoksa soru atlanır), renk yönü. Sonuç: mağazanın kendi modellerinden en çok 3 öneri, her birine uygun kumaş ve tek cümlelik gerekçe; **3D'de aç** seçili parçayı o modele ve kumaşa çevirir.
- **Kurallar açık ve yazılı:** duvar sınırı kesin (modelin eni duvardan uzunsa önerilmez); tarz etiketi uyarsa +4, çocuk/yoğun kullanımda "günlük yoğun" etiketi +3, küçük duvarda "küçük alan" +2, öne çıkarılmış +0,5, duvarı iyi dolduran uzunluk en çok +1. Kumaş: renk yönü uyarsa +3; çocuk/yoğun kullanımda yalnızca **girilmiş** Martindale değeri puan verir (yüksek olan önde). **Eşik sayısı uydurulmadı:** "şu kadar Martindale yeterli" denmez; değer söylenir, sıralamada kullanılır.
- **Gerekçe yalnızca girilmiş bilgiden:** "220 cm ile duvara sığıyor, modern çizgide, günlük yoğun kullanım için işaretli; MISSO-05 gri bir jakar, aşınma dayanımı 40.000 Martindale." Etiketi olmayan modele "modern" denmez; Martindale'i girilmemiş kumaşa "dayanıklı" denmez.
- **Öz-eleştiriyle düzeltilen:** ilk sürümde üç önerinin üçü de aynı kumaşla geliyordu; şimdi her öneri, uygun kumaşları içinde henüz kullanılmamış en iyisini alır.
- **Hiç boş ekran yok:** sığan model yoksa "Bu duvara sığan model yok. En dar model …: … cm."; birim testi her cevap birleşimini dener (288 birleşim).
- **Bütçe sorusu henüz yok:** görev tanımına göre yalnızca mağaza fiyat girdiyse sorulur; fiyatlar mağaza panelinde girilmeye başlandı ama vitrine taşınmadı. Taşındığında eklenecek.
- Danışman 5 dokunuşta biter; uçtan uca testte sonuç 0,3 sn (sınır 60 sn).

**Danışman etiketleri (panel):** Modeller → model → **Danışman etiketleri**: Tarz (Modern, Klasik, İskandinav, Endüstriyel, Rustik, Sade) ve Kullanım (Günlük yoğun kullanım, Küçük alana uygun, Kalabalık aile, Misafir odası). Koddan gelen örnek modellerde de yalnızca bu bölüm açık. Değişiklik günlüğe yazılır. Şema: `models.use_tags` (tarz için 15 Kasım'da eklenen `style_tags` kullanılıyor); `20261123000000_asistan.sql`, geri alma dosyasıyla; canlı Supabase'e uygulanmadı.

**Olay kaydı:** "asistana soru soruldu" (ilgili kumaş kodu varsa) ve "danışman tamamlandı" (süresiyle). **Sorunun metni hiç kaydedilmez.**

**Dil modeli (sonra, onayla):** Bu sürüm bir dil modeli kullanmıyor, para harcamıyor ve internetsiz çalışıyor. Her serbest cümleyi anlamaz. Bir dil modeli bağlanırsa aynı hesap ve bilgi işlevlerini araç olarak çağıracak şekilde önüne konur; bilgiler yine panelin olur. Maliyeti soru başına küçük ama sıfır değil; fiyatı onaydan önce resmî sayfadan yazılacak.

**Bulunup düzeltilen hatalar:** (1) "Bu kumaşın eni ne" sorusu aşınma sorusu sanılıyordu: "kumaşın" sadeleşince "kumasin" oluyor, içinde "asin" geçiyor. Aşınma kalıbı kelime başına bağlandı; birim testi yakaladı. (2) Sohbeti alta kaydıran efekt `scrollIntoView` sonucunu döndürüyordu; yeni Chromium bundan bir Promise döndürüyor, React bunu temizleme işlevi sanıp sayfayı çökertiyordu ("destroy is not a function"). Uçtan uca test yakaladı; geliştirme sunucusunda yığın okunarak bulundu.

**Test:** Birim: kod ve model adı bulma, metraj (elle hesabıyla), girilmiş/girilmemiş özellikler, temizlik sorusu, karşılaştırma, renk, öneri isteği, anlaşılmayan soru; danışman: duvar sınırı, etiketli gerekçe, girilmemişi söylememe, sığan yoksa mesaj, 288 birleşimde boş ekran yok, yalnızca var olan tarzlar, öneriler farklı kumaşlarla. Uçtan uca: panelden Martindale ve etiketler girilir; asistan girilen değeri söyler, girilmeyeni "girilmemiş" der, metraj ve fark sorularını cevaplar, anlamadığını söyler; danışman 5 dokunuşla etiketli modeli gerekçesiyle önerir, 3D'de açınca sahnede o kumaş. Asistan penceresi erişilebilirlik testinde.

## İş 5: Fotoğraftan dene (anında giydirme), sağlayıcısız (19 Kasım 2026)

**Para harcanmıyor (15 Kasım kararı):** Akışın tamamı yazıldı; arkasında yalnızca **deneme sağlayıcısı** (`GIYDIRME_SAGLAYICI=sahte`) var. Hiçbir hizmeti çağırmaz, para harcamaz; fotoğrafı kumaşla boyar ve sonucun gerçek olmadığı panelde açıkça yazar. Gerçek sağlayıcı tek bir dosyayla eklenir (`lib/giydirme/saglayici.ts` arayüzü). Seçim ve onay Fatih Bey'de (PLAN-SHOWROOM.md'deki karşılaştırma). **Sağlayıcı bağlı değilken ekranlarda düğme hiç görünmez** (yarım özellik gösterilmez); uçlar da 503 döner.

**Ekrandaki akış (yalnızca eşleşmiş showroom ekranında):** "Fotoğraftan dene" → fotoğraf (ekranın kamerası, telefondan QR ya da mağazanın kayıtlı ürün fotoğrafı) → en çok 4 kumaş (ekrandaki kumaş seçili gelir) → **Üret**: "Yaklaşık 30 sn" ve ilerleme çubuğu (başta hızlı, 30 sn'ye doğru yavaşlar, iş bitmeden dolmaz) → sonuçlar yan yana, her biri önce–sonra kaydırıcılı → **3D'de aç** (aynı kumaş ekrandaki parçaya) ve **Teklif** (kumaşı uygular, teklifi açar). Pencere kapanıp yeniden açılınca aynı ziyaretin fotoğrafı kalır.
- **Etiket görsele işlenir:** "Ön izleme · renk ve desen gerçeğinden farklı olabilir", sol altta, koyu bir şeridin üstünde. Sunucuda yazı tipi gerekmesin diye etiket bir kez Inter ile PNG olarak üretilip koda gömüldü (`scripts/generate-label.ts`); sunucu yalnızca bindirir. İndirilen ya da paylaşılan dosyada da durur (birim ve uçtan uca test, pikselden). Sonuç ekranında "Kesin görünüm için 3D'de açın, renk onayı için numune isteyin."
- **Öz-eleştiriyle düzeltilen:** Kaydırıcı ortadan başlıyordu; etiketin yarısı gizleniyor, kaydırıcı çizgisi etiketin üstünden geçiyordu. Şimdi "sonra" görseli tam görünerek başlar, kaydırıcı üst kenarda.
- **Telefondan yükleme** (`/y/<kod>`): giriş yok; yalnızca o oturumun 8 karakterlik tek kullanımlık koduyla, **tek fotoğraf** (ikincisi sunucuda da reddedilir). Gönderilmeden önce işaretlenmesi zorunlu onay kutusu (cümle `AVUKAT-PAKETI.md` 4a'da). Telefon fotoğrafı göndermeden önce 2048 px'e küçültür; ekran her 2 sn'de sorar. Ölçülen: telefondan gönderimden sonuca **3,2 sn** (deneme sağlayıcının kendi süresi 0,8 sn). Gerçek sağlayıcıda süre büyük ölçüde onun süresi olacak; 45 sn sınırı sağlayıcı seçiminde ölçülmeli.
- **Talimat** (`lib/giydirme/talimat.ts`, saf ve testli): yalnızca döşemelik yüzeyler değişir; form, dikiş, biye, ayak, ahşap, zemin, duvar, arka plan, diğer eşyalar, ışık, gölge ve açı aynı kalır. Kumaş referansı olarak paneldeki gerçek kumaş fotoğrafı (dokusu) ve kumaşın tipi, rengi, girilmişse desen tekrarı gider; **girilmemiş desen tekrarı söylenmez**, yerine fotoğrafın gerçek boyu söylenir. Talimat İngilizce (modeller daha iyi uyuyor); ekran Türkçe.

**Kota ve maliyet:**
- Kota mağaza kaydındaki "Aylık fotoğraf denemesi kotası" (Kasım'da eklendi). **Boşsa deneme yapılmaz**, varsayılan sayı uydurulmadı. Ay İstanbul saatine göre.
- Kota **çağrıdan önce**, seçilen bütün kumaşlar için birlikte denetlenir: "Bu ay 1 deneme hakkı kaldı; daha az kumaş seçin." Kota dolunca hiçbir çağrı yapılmaz, maliyet oluşmaz; ret, panelde "kotası dolan mağaza" görünsün diye 0 maliyetle kaydedilir.
- Yalnızca başarılı görsel kotadan düşer. Başarısız ya da 60 sn'de cevap gelmeyen çağrı düz bir cümleyle söylenir ("…Yeniden deneyin; deneme hakkınızdan düşmedi."), **Yeniden dene** düğmesi yalnızca o kumaşı yeniden ister.
- Her çağrı kaydedilir: tür (mağaza / test), mağaza, ekran, sağlayıcı, kumaş, süre, maliyet (sağlayıcının söylediği; söylemiyorsa beklenen fiyatı), sonuç. Panel → **Fotoğraftan dene**: mağaza başına bu ay üretilen, başarısız, kota reddi, ortalama süre, maliyet. Genel bakıştaki "Yapay zekâ gideri" bu kayıttan okunur; tutar sağlayıcının faturaladığı gibi **dolar** gösterilir, kur çevrilmez.
- **Bilinen sınır:** aynı mağazanın iki ekranı aynı anda üretirse kota en fazla bir tur aşılabilir (denetim ile kayıt arasında kilit yok). 100 mağaza ölçeğinde kabul edildi; gerekirse veritabanında sayaçla kapatılır.

**Gizlilik:**
- Fotoğraf ve görseller **özel bir depoda** (`giydirme`, herkese kapalı; satır kuralı yok, yalnızca sunucu anahtarı). Her görsel yalnızca oturumu açan ekrana verilir; başka ekran ya da panel alamaz (test: 401). Fotoğrafın konum ve kamera bilgisi yüklenirken silinir (test: EXIF yok).
- **Ziyaret bitince silinir:** ekran vitrin döngüsüne dönerken oturumu kapatır, sunucu klasörü siler (uçtan uca test: sıfırlamadan sonra dosya 404). Ekran kapanırsa oturum en geç 2 saatte biter; her istekte ve günlük zamanlanmış çağrıda süresi geçenler süpürülür.
- **"Ürün fotoğrafı olarak sakla"** işaretlenmişse oturum biterken fotoğraf mağazanın kayıtlı ürün fotoğraflarına kopyalanır ve sonraki ziyaretlerde hazır gelir. Ekranda "(mağazanın kendi ürünü; müşteri fotoğrafı saklanmaz)" yazıyor.
- Olay kaydına yalnızca istendi / başarılı / başarısız, kumaş kodu ve saniye girer; fotoğraf, ad hiç girmez.

**Giydirme testi** (Panel → Fotoğraftan dene → Giydirme testi; yalnızca yönetici, yeni "maliyet" yetkisi): koşu (ad, en çok 4 kumaş) → fotoğraf seti (bir kerede çok dosya, koşu başına en çok 60) → **Çalıştır**: 4'er 4'er yapılır, sayfa ilerlemeyi gösterir (gerçek sağlayıcıda bir görsel 60 sn'ye kadar sürebilir; tek istekte 40 görsel beklenmez) → ızgarada her sonuç için **Gösterilebilir / Gösterilemez** ve not. Üstte gösterilebilir oranı, koltuk şartı, ortalama süre, toplam maliyet.
- **Koltuk şartı katı sayılır:** bir koltuk, işaretlenen bütün kumaş sonuçları "gösterilebilir" ise geçer; 20 koltuk işaretlenmeden karar çıkmaz; 16/20 (ya da aynı oran) "şart sağlandı". Sayfada da böyle yazıyor.
- Ölçülen (deneme sağlayıcıyla): 20 görsel 6 sn.

**Teknik:** `sharp` geliştirme bağımlılığından çalışma zamanı bağımlılığına taşındı (yeni paket değil; Apache-2.0). Yeni şema `20261119000200_giydirme.sql` (oturumlar, çağrı kaydı, kayıtlı fotoğraflar, test koşuları, özel depo) geri alma dosyasıyla; canlı Supabase'e uygulanmadı. Yükleme ucu `moduller` klasörünü de kabul eder hâle gelmişti; bu iş için ayrıca bir şey açılmadı.

**Bulunup düzeltilen hatalar:** (1) Deneme sağlayıcı uzun bir kumaş fotoğrafında (MISSO-05) çöküyordu: karo fotoğraftan büyük kalıyordu. Uçtan uca test yakaladı; karo kare kesiliyor, birim testine uzun doku eklendi. (2) Pencereyi kapatıp yeniden açmak yeni oturum açıyor, eski fotoğraf ancak iki saatlik süpürmede siliniyordu; şimdi aynı ziyaretin oturumu yeniden kullanılıyor. (3) Panel menüsü 15 öğeye çıkınca 1280 px'de son öğeler kesiliyordu; menü masaüstünde iki satıra iniyor.

**Test:** Birim: talimat (korunacaklar, girilmemiş desen tekrarı yok), kota (yok / doldu / az kaldı, İstanbul ayı), etiket pikselde ve fotoğrafın geri kalanı değişmeden, EXIF silme, deneme sağlayıcı (hata, zaman aşımı, uzun doku); akış: kumaş başına etiketli görsel ve kayıt, kota dolunca hiç çağrı yok ve maliyet yok, başarısız ve zaman aşımı kotadan düşmüyor, en çok 4 kumaş, oturum sonunda silme ve saklama, süpürme, telefonun tek hakkı; test düzeneği oranı ve 16/20 şartı; genel bakışta kotası dolan mağaza. Uçtan uca: telefondan yükleme (onay şart, ikinci fotoğraf reddi), iki kumaş, etiket indirilen dosyada, EXIF yok, başka oturumun görseli alınamaz, kota ve hata yolları, 3D'de aç, pencere yeniden açılınca aynı fotoğraf, ziyaret bitince sunucuda dosya yok; 20 koltukluk test koşusu, işaretleme, not, şart sağlandı / sağlanmadı. Yeni panel sayfaları erişilebilirlik testinde.

**Gerçek sağlayıcı gelince yapılacaklar:** sağlayıcı dosyası, anahtarın Vercel'e girilmesi, test sayfasında 20 koltukla koşu, 45 sn ölçümü, avukata sağlayıcının veri koşulları.

## İş 4, 2. dilim: panelden modül seti, GLB modüllerle köşe takımı, PDF'te şema (19 Kasım 2026)

**Panel → Modül setleri:** Bir set bir koltuk serisidir: adı, bağlantı adı, metrajların kumaş eni (varsayılan 140 cm), yayında / değil, verildiği mağazalar ve modülleri. Her modülün tipi (sol/sağ kol, tekli oturum, köşe, sol/sağ şezlong, puf), ekranda görünen adı, genişlik × derinlik × yükseklik (cm), bölge metrajları (Kasa, Kollar, Oturak, Sırt), GLB dosyası ve isteğe bağlı bağlantı noktaları var.
- **Doğrulama:** ölçüler 0'dan büyük olmalı, köşe kare olmalı, bağlantı noktasının dört sayısı ya hep birlikte girilir ya hiç girilmez, yalnızca kendi yüklediğimiz dosyalar kabul edilir. **Bilinmeyen metraj boş kalır, uydurulmaz:** metrajı eksik modülü olan setle teklifte metre çıkmaz ve panel bunu "Eksikler" kutusunda söyler. Eksikler kaydı durdurmaz.
- **Dosya ölçümü:** Yüklenen GLB tarayıcıda ölçülür: "Dosyadaki ölçü: 22 × 100 × 68 cm · girilen ölçüden farklı" ve **Ölçüleri dosyadan al** düğmesi. Sahne dosyanın kendi ölçüsünü gösterir; şema, duvar uyumu ve metraj girilen ölçüyle hesaplanır. Fark 1 cm'yi geçerse panel uyarır.
- Set silinmez, yayından alınır (veritabanında silme yalnızca yöneticide). Modüller kısa adlarıyla (anahtar) saklanır; modül düzenlenince eski paylaşım bağlantıları çalışmaya devam eder.
- **Bulunup düzeltilen hata:** Dosya yükleme ucu yalnızca `kumaslar`, `modeller`, `logolar` klasörlerine izin veriyordu; modül dosyaları "Geçersiz dosya yolu" ile reddediliyordu. Uçtan uca test yakaladı; `moduller` eklendi.

**Bağlantı noktaları ve çizim:**
- Her modülün sol ve sağ bağlantı noktası GLB'nin kendi koordinatlarında (üstten bakış, cm). Düz modülde arka-sol ve arka-sağ köşe; köşe modülünde ön-sol (duvar tarafı) ve arka-sağ. **Girilmezse dosyanın kutusundan** alınır (model önü +z'ye bakar).
- Takım kurulurken her modülün iki noktası, dizilimdeki hedef noktalarına oturacak biçimde döndürülüp taşınır (`lib/modul/glb.ts`, saf ve testli). Böylece GLB'nin kendi başlangıç noktası nerede olursa olsun modüller yan yana oturur. Sol kol tarafı +90°, sağ kol tarafı ve U'nun ikinci köşesi −90° döner. Model hiç esnetilmez; dosya beyan edilen genişlikten farklıysa aradaki fark hesaplanır.
- Aynalama bütün takımı bir bütün olarak aynalar (sıra ve ölçüler aynı kalır, eski kural).
- Bütün modüllerinin GLB'si olan set dosyalardan çizilir; bir modülün bile dosyası yoksa takım, dosyalar tamamlanana kadar aynı ölçülerde koddan çizilen koltukla gösterilir.
- Takım tek parça olarak giydirilir. **Minder ve kırlent ayrı kumaş:** GLB'deki parça adları `govde`, `kol`, `oturum`, `sirt-minder` ile başlarsa bölge seçimi (Kasa, Kollar, Oturak, Sırt, Biye) GLB takımda da çalışır; adlar uymazsa takım tek kumaş alır (eski GLB kuralı).
- Aynı birleştirme kodu hem sahnede hem "Odamda gör" (AR) dosyasında kullanılır (`lib/modul/assemble.ts`).
- **2D plan:** takımın gerçek zemin şekli (L ya da U; içi boş kalır) plana gider; tam dikdörtgen sayılmaz.
- **Çevrimdışı:** showroom ekranı, mağazaya verilen setlerin modül dosyalarını da cihazda tutar.

**Köşe kurucu ekranı:** Mağazaya verilen setler önce, örnek set en sonda. Birden çok set varsa üstte büyük set düğmeleri çıkar; set değişince dizilim sıfırlanır. Şeritte her modül ayrı düğmedir (gerçek sette farklı genişlikte oturumlar olabilir): "+ Oturum 90 / 90 × 98 cm".

**PDF'te şema:** Teklif PDF'inde, teklif bir köşe takımı içeriyorsa tablonun üstünde ölçekli üstten şema çıkar: modül adları, arka uzunluk, sol ve sağ kol uzunlukları. Şema teklifle birlikte saklanır; müşterinin telefonundaki teklif sayfasının PDF'inde de aynı şema çıkar. Sayfa yine tek: uzun teklifte önce resim, sonra yazı küçülür.

**Örnek GLB seti (`lib/modul/ornek-glb-set.ts`, `scripts/generate-module-glbs.ts`):** Geliştirme ve test için, koddaki koltukların minder parçalarından üretilmiş altı GLB (kol 22, oturum 70, köşe 100 × 100, şezlong 95 × 165; derinlik 100, yükseklik 80, kol 68 cm). Dosyalar bilerek kendi merkezlerine göre modellendi, bağlantı noktası hizalaması gerçekten sınansın diye. Yalnızca bellek modunda Örnek Mobilya'ya verili; Supabase'e konmaz. **Metrajları test için uydurulmuş sayılar, ORMEN'in değil.**
- **Öz-eleştiriyle düzeltilen:** İlk üretimde sırt minderi beyan edilen yüksekliğin 4 cm üstüne çıkıyor, kollar yana 0,8 cm kabarıyordu. Sahnedeki ölçü etiketi 194 × 192 × 84 cm, köşe kurucu 192 × 192 diyordu. Dosyalar beyan edilen ölçüye göre yeniden üretildi; şimdi sahne ve toplamlar santimine kadar aynı. Gereksiz ince örgü de seyreltildi (toplam 4,8 MB → 2,5 MB; 8 modüllü L takım yaklaşık 120 bin üçgen).

**Şema (`supabase/migrations/20261119000100_modul_setleri.sql`, geri alma dosyasıyla):** `module_sets`, `module_set_modules`, `module_set_firms`. Etkin set ve modülleri herkes okuyabilir (sayfalar oturumsuz okur, modeller gibi); yazma ORMEN ekibinde; set silme yalnızca yöneticide. Sete mağaza eklenince, çıkarılınca ya da set/modül değişince yalnızca o setin mağazalarının içerik sürümü artar (işlem başına bir kez). Canlı Supabase'e uygulanmadı.

**Test:**
- Birim: bağlantı noktası hizalaması (L, U, şezlonglu düz takımda her modül, başlangıç noktası kaydırılmış dosyayla bile şemadaki dikdörtgenini tam kaplar; dönüş açıları; esnetmeme); GLB'li set → dosyalardan, eksik dosya → koddan; aynalama; bağlantıdaki set yalnızca sayfanın setleri arasında aranır; plan şekli; panel doğrulaması ve eksikler; PDF'te şema (tek sayfa, ölçüler, modül adları).
- Veritabanı (PGlite): yalnızca ORMEN ekibi yazar; bilinmeyen tip ve 0 ölçü reddedilir; içerik sürümü yalnızca setin mağazalarında artar; yayından alınan set dışarıdan görünmez; set silme yalnızca yöneticide; geri alma ve yeniden uygulama.
- Uçtan uca: GLB setle L köşe: 262 × 192 cm; sahnedeki takım kumaşı giymiş ve **262 × 192 cm (±1)**; aynalama boyu değiştirmez; teklif bölge metrajları modül toplamları; bağlantıyla aynı takım aynı boyda açılır. Panelden set: dört GLB yüklenir, dosya ölçüsü uyarısı ve "dosyadan al", kare olmayan köşe reddi, mağazaya verme, günlük kaydı; mağazanın köşe kurucusunda set ilk sırada ve doğru ölçülerle; seti almayan mağazada görünmez. Örnek setle eski test (8 dokunuş, 3,15 × 2,40 m) set seçimi eklenerek geçiyor. Yeni panel sayfaları erişilebilirlik testinde.

**Hâlâ açık:**
- Hafif profilde 8 modüllü takımın gerçek cihazda kare hızı ölçülmedi (`?olcum` ekranı hazır; KURULUM 8. adım).
- Puf modülü dizilime girmiyor (ayrı parça, "Mobilya ekle" ile).
- Gerçek bir üretici GLB'siyle denenmedi; ilk gerçek set yüklenince parça adları ve bağlantı noktaları bir kez gözle kontrol edilmeli.

## İş 0: mağaza paneli, mağaza hesapları ve "mağaza gibi görüntüle" (18 Kasım 2026)

- **Mağaza paneli** `/magaza`: Teklifler (numara, tarih, parçalar, metraj, fiyat, müşteri adı ve notu, ORMEN siparişinin durumu, teklif bağlantısı), Ürünler (mağazadaki adı, ürün kodu, açıklama, satış fiyatı, öne çıkar, gizle; model, ölçü ve metraj ORMEN'den gelir, değişmez), Ekranlar (yalnızca görür; ekran eklemek ve kaldırmak ORMEN'in), Hesap (şifre değiştirme). Satıcı hesabı yok (eski karar): satıcı eşleşmiş ekran + mağaza PIN'iyle çalışır.
- **Veri ayrımı veri katmanında:** Supabase'de mağaza paneli her şeyi **mağaza sahibinin kendi oturumuyla** okur; satır kuralları (15 ve 18 Kasım şemaları) sahibe yalnızca kendi mağazasının satırlarını verir. Sunucunun servis anahtarı mağaza panelinin okumalarında kullanılmaz (yalnızca ürünlerin merkez adı ve ölçüsü için katalog okunur; o zaten herkese açık). Bellek modunda aynı süzgeç sunucuda.
- **Ürün gösterimi ve fiyat** iki veritabanı fonksiyonuyla yazılır (`20261119000000_magaza_paneli.sql`): `shop_save_product`, `shop_set_price`. İkisi de mağazanın çağıranın olduğunu kendisi denetler ve günlüğü kendisi yazar; `firm_models` için sahibe satır kuralı açılmadı, çünkü satır kuralı sütun seçemez (sahip hangi ürünün atandığını ya da ORMEN'in sırasını değiştirebilirdi). Testte sahip tabloya doğrudan yazmayı denediğinde hiçbir satır değişmiyor.
- **Fiyat günlüğe yazılmaz:** günlükte "bir ürünün satış fiyatı değişti (mağaza)" yazar; tutar yok, çünkü günlüğü ORMEN elemanı da okur ve fiyat onun yetkisi dışında. Satış fiyatını yalnızca mağaza ve ORMEN yöneticisi görür (satır kuralı). Fiyat şimdilik yalnızca kayıtta; ekranda ve teklifte otomatik kullanılmıyor (teklifteki fiyatı satıcı yazar, eski karar). Ekranda göstermek ayrı bir karar.
- **Mağaza hesapları** (mağaza sayfası → "Mağaza paneli hesapları", yalnızca yönetici, "üye" yetkisi): e-posta yazılır; hesap yoksa açılır ve **ilk şifre bir kez ekranda gösterilir** (e-posta servisi yok, para harcanmıyor); ORMEN yöneticisi bunu telefonla ya da WhatsApp ile iletir, sahip ilk girişte "Hesap"tan değiştirir. ORMEN hesabı mağaza hesabı yapılamaz. Erişimi kaldırmak hesabı silmez, yalnızca mağaza bağını kaldırır. Ekleme ve kaldırma günlükte; şifre günlükte yok.
- **Mağaza gibi görüntüle** (yalnızca yönetici): mağaza sayfasındaki düğme, o mağazanın panelini açar. Üstte koyu kırmızı, kaydırınca da görünen şerit: "Destek görünümü … Değişiklik yapılamaz; müşteri adları gizli." 30 dakika sonra kendiliğinden kapanır; ayrıca yöneticinin kendi panel oturumu da sürmeli (ikisi birlikte). **Her açılış günlüğe yazılır.**
  - Destek görünümü **salt okunur**: ürün alanları kilitli, kaydet düğmesi yok, sunucu işlemleri de reddeder.
  - **Müşteri adı ve notu destek görünümünde gösterilmez.** Görev tanımı "mağazanın kendi müşterisine ait kişisel bilgiler merkez panelde görünmez" diyor; destek görünümü de ORMEN'in gözü sayıldı. Supabase'de bu ayrıca satır kuralıyla da öyle: `quote_private` tablosunda ORMEN için hiçbir kural yok.
- **Giriş güvenliği:** mağaza girişine panelinkiyle aynı deneme sınırı kondu (15 dakikada 10 hatalı deneme). Mağaza oturumu ORMEN paneline girmez; ORMEN hesabı mağaza paneline sahip olarak girmez. Proxy `/magaza` sayfalarını da oturumsuz açmıyor.
- **Bulunup düzeltilen hata (eski koddan da):** hatalı şifreden sonra giriş formu e-posta kutusunu da boşaltıyordu (React form sıfırlaması). Hem mağaza hem ORMEN paneli girişinde e-posta artık kutuda kalıyor.
- **Bellek modunda** mağaza paneline tek demo sahibiyle girilir (`SHOP_DEMO_EMAIL` …, `.env.example`); paneldeki hesap listesi orada denemeliktir.
- **Supabase'e uygulanmadı:** yeni şema (iki fonksiyon) yalnızca PGlite'ta denendi; geri alma dosyası `supabase/geri-al/20261119000000_magaza_paneli.sql`. Supabase'li akış (sahibin gerçek oturumu, `auth.admin` ile hesap açma) canlı ortamda denenmedi; ilk kurulumda bir deneme mağazasıyla denenmeli.
- **Test:** Veritabanı (PGlite): sahip kendi ürününü değiştirir ve günlüğe "sahip" olarak düşer; başka mağazanın sahibi, ORMEN hesapları ve oturumsuz istek reddedilir; sahip `firm_models`'e doğrudan yazamaz; fiyatı başka mağaza ve eleman göremez, yönetici görür; günlükte fiyat yok. Birim: mağaza hesapları (ilk şifre, ikinci mağaza, tekrar, ORMEN hesabı, kaldırma). Uçtan uca: oturumsuz yönlendirme, hatalı şifre, mağaza oturumunun panele girememesi; sahip teklifi müşterisiyle görür, ürünü adı ve fiyatıyla kaydeder; günlükte görünür ama fiyat yok; destek görünümü şeritli, müşteri adı yok, alanlar kilitli, çıkınca kapanır, açılış günlükte; hesap ekleme, ilk şifrenin bir kez görünmesi, ORMEN hesabının reddi, erişimi kaldırma.

## İş 0: genel bakış, toplu işlem ve kademeli yayın (18 Kasım 2026)

- **Genel bakış** (panelin ana sayfası, en üstte "Mağazalar ve ekranlar"): açık / kapalı / henüz açılmamış ekran sayısı, bu ayın oturum, teklif ve sipariş talebi sayıları, bu ay en çok denenen kumaşlar, yapay zekâ gideri, bu ay vadesi gelen bakım tutarı (yalnızca yönetici) ve **dikkat isteyenler**: eşitleme hatası olan ekran, 30 gündür kullanılmayan ekran, vadesi geçmiş bakım. Eski kartlar (kumaş, model, talep) altta "Katalog ve talepler" başlığında.
- Ekran "açık" sayılır: son 15 dakikada merkeze uğradıysa (cihaz listesindeki kuralın aynısı). "Ayrıldı" durumundaki mağazanın ekranları dikkat listesine girmez.
- Teklif ve sipariş sayıları veritabanında yalnızca sayılır (satır taşınmaz); **müşterinin adı ya da notu merkeze hiç gelmez**, kartta da böyle yazıyor.
- **Yapay zekâ gideri 0 TL** ve "sağlayıcı bağlı değil" yazıyor: doğru olan bu. İş 5'in gider kaydı yazılınca o kayıttan okunacak. **"Kotası dolan mağaza"** dikkat maddesi de kota kullanımı İş 5 ile sayılmaya başlayınca eklenecek; şimdi sayılacak bir kullanım yok.
- **Toplu işlem** (Mağazalar listesi): mağazalar işaretlenir ya da "süzgeçteki N mağazanın hepsi" seçilir; işlemler: özellik aç / kapat, kumaş serisi aç / kapat, deneme kotası, etiket ekle / çıkar, güncelleme gönder (şimdi eşitle). Uygulamadan önce "N mağazaya uygulansın mı?" diye sorar. Zaten o durumda olan mağazaya dokunulmaz ve sonuçta söylenir ("1 mağazada yapıldı, 1 mağaza zaten öyleydi").
- Her mağaza günlüğe **ayrı kayıtla, tek toplu işlem numarasıyla** yazılır; böylece bir mağazadaki sorun yalnızca o mağazada geri alınır. Kumaş serisi değişikliği de geri alınabilir oldu. Güncelleme gönderme geri alınamaz (geri alınacak bir şey yok).
- Serinin "boş liste = bütün seriler" kuralı korunur: bütün serileri gören mağazada bir seri açmak bir şey değiştirmez; bir seri kapatmak "o seri hariç hepsi" olur. Etiket sınırı 8: dokuzuncu etiket o mağazaya eklenmez, sıkıştırılmaz.
- Bir seferde en çok 500 mağaza (hedef ölçek 100).
- **Kademeli yayın** ayrı bir ekran değil, aynı toplu işlemin iki adımı: önce pilot grupta (Durum: Pilot ya da bir etiket, örn. "pilot"), sorun yoksa süzgeç temizlenip hepsinde. Uçtan uca testte tam bu akış sınanıyor. **Sınır:** merkezde bir ürünün adını ya da metrajını düzeltmek hâlâ atandığı bütün mağazalara aynı anda gider; içerik değişikliğini kademeli yaymak için yeni ürün önce pilot mağazalara atanır (Katalog → toplu atama), sonra ötekilere. Merkezdeki tek bir kaydın iki ayrı sürümünü aynı anda yaşatmak (eski hâli bir grupta, yeni hâli ötekinde) yazılmadı; gerekirse ayrı iş.
- Toplu işlem çubuğundaki seçim kutularının erişilebilir adı yalnızca etiketleri (eskiden etiket kutuyu sarınca seçeneklerin metni de ada karışıyordu; ekran okuyucu için de kötüydü). Paneldeki ortak `Field` bileşeninde aynı durum var; dokunulmadı, ayrı iş.
- **Test:** Birim: işlem ve hedef doğrulaması, seri kuralı, kota/etiket değişimi, günlük metni, seri geri alma, genel bakış sayıları (açık/kapalı, dikkat sırası, ayrılan mağaza, ay sonu, vadesiz tutar). Uçtan uca: etiketle pilot grup kurulur, özellik önce yalnızca pilot mağazada açılır, sonra ikisinde ("1 zaten öyleydi"), günlükte "toplu işlem" olarak görünür ve tek mağazada geri alınır; geciken vade genel bakışın dikkat listesine düşer.

## İş 0: mağaza kaydı, bakım bedeli ve mağaza şablonu (18 Kasım 2026)

- **Mağaza kaydı** (mağazanın sayfası): şehir, bölge, paket, etiketler, yetkili, kurulum tarihi, güncelleme biçimi (otomatik / onaylı), vitrin süresi, aylık fotoğraf denemesi kotası. Mağaza listesinin süzgeçleri ve sıralaması bunlarla çalışır. Yeni tablo yok: 15 Kasım şemasındaki `firms` (şehir, bölge, güncelleme, `settings.vitrinSn`) ve `firm_admin` sütunlarına yazılır; `settings` içindeki başka anahtarlara dokunulmaz.
- Vitrin süresi boşsa 60 sn (eski davranış); yalnızca 30–600 sn kabul edilir. **Kota boşsa "ORMEN belirlemedi" demektir ve deneme yapılmaz**: varsayılan sayı uydurulmadı (görev tanımı, yapma listesi).
- **Bakım bedeli**: vade (son ödeme tarihi zorunlu, tutar boş kalabilir), dönem, not; **Ödendi** / **Ödenmedi yap**. Geçmiş ve ödenmemiş vade "gecikti" diye işaretlenir; mağaza listesindeki "bakım vadesi" en erken ödenmemiş vadedir. Yalnızca yönetici: ORMEN elemanı için bölüm sayfaya hiç gelmez (veri okunmaz), işlemler de reddeder; veritabanında zaten yalnızca yönetici kuralı var.
- **Tutar günlüğe yazılmaz**, ödeme kayıtları da ORMEN elemanının günlüğünde görünmez (süzgeç sorguda, sayfada değil; sayfa sayısı da doğru).
- **Şablon**: iyi kurulmuş bir mağaza "şablon olarak kaydet" ile ad verilerek saklanır (bütün özellikler varsayılanlar dahil açık/kapalı olarak, kumaş serileri, vitrin süresi, güncelleme biçimi, paket, kota). Yeni mağaza açılınca sayfasında tek seçim + **Şablonu uygula**. Mağazanın adı, adresi, yetkilisi ve ürünleri değişmez. Aynı adla kaydedilen şablon eskisinin yerine geçer. Uçtan uca testte yeni mağazayı açıp şablonu uygulamak 1 saniyenin altında; görev tanımındaki sınır 10 dakika.
- Ayrı bir şablon düzenleme ekranı yazılmadı: şablonu değiştirmek için bir mağazayı istenen hâle getirip aynı adla yeniden kaydetmek yetiyor. Şablon silme sonraya kaldı (silme yetkisi yöneticide; şimdilik gerek görülmedi).
- **Geri alma:** mağaza kaydı değişikliği, şablon uygulama (özellikler, seriler ve kayıt birlikte eski hâline döner) ve ödendi işareti günlükten geri alınır. Ödeme geri alması yalnızca yöneticide.
- **Test:** Birim: doğrulamalar (olmayan tarih, aralık dışı vitrin süresi, bozuk kota, etiket temizliği), en erken ödenmemiş vade, bellek deposu (liste süzgeci, ekranın vitrin süresi, elemandan saklanan ödeme kayıtları, aynı adlı şablon), geri alma adımları. Uçtan uca: kayıt girilir ve listede şehir/etiketle bulunur, şablon kaydedilir, ikinci mağazaya uygulanır, vade gecikti → ödendi, şablon günlükten geri alınır ve özellik ile vitrin süresi eski hâline döner. Ekran görüntüsüyle bakıldı; ilk şablon kaydedildiğinde "Şablonu uygula" düğmesinin seçimsiz kaldığı hata bu sırada bulunup düzeltildi.

## İş 0: değişiklik günlüğü ekranı ve geri alma (18 Kasım 2026)

- Panel → **Günlük** (`/panel/gunluk`): kim, ne zaman, hangi mağazada ya da üründe neyi değiştirdi; mağazaya göre süzülür, sayfada 50 kayıt. Toplu işlemler "toplu işlem" diye işaretli.
- **Geri alınabilenler:** mağaza durumu (askıya alma dahil), ürünün mağazadaki gösterimi, toplu atama (tersine çevrilir: eklenenler çıkarılır, çıkarılanlar eklenir), özellik anahtarları, fire katsayıları (yalnızca yönetici), ekran kalite profili. Geri alma da günlüğe "Geri alındı: …" diye yazılır.
- **Geri alınamayanlar:** PIN değişikliği, kaldırılan ekran, eşleştirme kodu, reddedilmiş denemeler. Bunlarda düğme yok.
- Bir kayıt bir kez geri alınır: veritabanında "henüz geri alınmamışsa" koşuluyla işaretlenir, iki tıklama iki kez geri almaz.
- Geri alma, yalnızca o kaydın öncesine döner. Arada aynı şey yeniden değiştiyse, geri alma son hâli değil o kaydın öncesini yazar. Bu, panelde onay adımıyla ("Evet, geri al") soruluyor.
- **Test:** Birim: her türün tersi, geri alınamayanlar, tek seferlik işaret. Uçtan uca: mağaza askıya alınır, ona toplu ürün atanır; ikisi günlükte görünür, oradan geri alınır; mağaza yeniden aktif ve ürünsüz; geri alınmış kayıtta ikinci düğme yok.

## Mağaza bazında özellikler (18 Kasım 2026)

- Görev tanımı her yeni özelliğin mağaza bazında açılıp kapanmasını istiyor. Panel → mağaza sayfası → **Özellikler**: Metraj ve teklif, ORMEN'e sipariş talebi, Köşe kurucu, Kartela okut, Fotoğraftan dene.
- Varsayılanlar: ilk dördü açık (paketin parçası), **Fotoğraftan dene kapalı** (ücretli bir sağlayıcı ister). Kayıtta olmayan anahtar varsayılanı alır, bu yüzden var olan mağazalarda hiçbir şey değişmedi.
- Kapatılan özellik mağazanın sayfasından ve ekranından kalkar; yalnızca gizlenmez, teklif ucu da reddeder (403): teklif kapalıysa teklif, sipariş kapalıysa sipariş talebi.
- Firma formuyla mağaza kaydedilince özellikler korunur (bellek deposunda siliniyordu; düzeltildi ve uçtan uca testte denendi).
- Her değişiklik günlüğe yazılır; işlem "kurulum" yetkisi ister (yönetici ve eleman).
- Showroom ekranı değişikliği bir sonraki eşitlemede alır (özellikler içerik sürümünü artırır).

## İş 4, 1. dilim: köşe kurucu (örnek setle) (18 Kasım 2026)

**Nasıl çalışıyor:**
- Mağaza sayfasında ve showroom ekranında üçüncü sekme: **Köşe kur**.
- Alttaki şeritte büyük düğmeler: sol kol, tekli oturum, köşe, sağ kol, sol / sağ şezlong; her birinde ölçüsü yazılı.
- Dokunulan modül yerine oturur: sol kol ve sol şezlong başa, sağ kol ve sağ şezlong sona, oturum ve köşe sağ ucun hemen önüne. Sıradaki modül parmakla sürüklenerek taşınır (dokunmatik ekranda tarayıcının sürükle-bırak özelliği çalışmadığı için kendi sürükleme kodu), × ile çıkarılır.
- Köşe dizilimi 90 derece döndürür; iki köşe U takımdır. **Sağ ↔ sol çevir** tek düğme.
- Canlı ölçü: arka, sol kol, sağ kol ve kapladığı alan, hem ölçeğe göre çizilmiş üstten şemada hem 3D sahnede (sekme açıkken sahnenin ölçüleri hep görünür).
- **Arka duvar** ve **Yan duvar** girilince: "Duvarlara sığıyor." ya da "Arka duvardan 65 cm taşıyor."
- Kurulan takım seçili parçaya hemen uygulanır ve kumaşı giyer. Adrese yazılır (`?mk=ornek-set:kol-sol.tekli.kose…`): paylaşım bağlantısı, yeniden açılış ve teklif aynı takımı kurar.

**Kurallar (`lib/modul/dizilim.ts`, saf ve testli):**
- Reddedilen (hiç uygulanmayan, nedeni yazılan): sol kol ya da sol şezlong sol uçtan başka yerde; sağ uçtakiler sağdan başka yerde (iki kol yan yana dahil); iki köşe yan yana; üçten fazla köşe; köşeli kolun ucunda şezlong; ikinci bir sol / sağ uç.
- Uyarı (kurulumda bir ara adım olabilir): açıkta kalan uç ("Sol uç açıkta…"), uçta duran köşe ("Köşenin sağına modül ekleyin"). Uçta köşesi olan takım çizilmez; sahnede son geçerli hâl kalır.
- **Bulunan ve düzeltilen tasarım hatası:** İlk sürüm uçtaki köşeyi hata sayıyordu. Takımı adım adım kuran biri köşeyi eklediği anda köşe sonda durduğu için, ekleme hiç yapılmıyordu. Uçtan uca test yakaladı.
- **Aynalama:** Sıra ve ölçüler aynı kalır, sol kol sağa geçer. İlk taslakta aynalamayı "diziyi ters çevir" diye düşünmüştüm; tek köşeli L'de bu ayna görüntüsü değil, başka bir takım üretiyordu. Yazmadan önce fark edip düzelttim.
- Ölçüler yalnızca modül ölçülerinin toplamı: köşe kare (eni arka duvar boyunca, derinliği yan duvar boyunca); sol kol = köşe derinliği + soldaki modüllerin enleri.

**3D:** Takım, mevcut "seçerek oluştur" köşe koltuğuyla çiziliyor; ölçüleri tam takımınkiler. Böylece kumaş giydirme, bölgeler, plan, yerleşim ve teklif hazır geldi. Sahnede ölçülen boy 316 × 186 cm (minder kabarıklığı 1 cm ekliyor; test payı 2 cm).
- **Bulunan ve düzeltilen hata:** Kurulan takıma "kumaş alacak malzeme" adı verilmemişti; koltuk gri ve kumaşsız görünüyordu. Görev tanımı "gri ya da boş koltuk hiç görünmez" diyor. Uçtan uca test bunu artık sahnenin kendisinden denetliyor.

**Metraj:** Takımın metrajı modüllerin metrajlarının bölge bölge toplamı (`setMetres`). Teklif ekranına bu bölge toplamlarıyla gelir (Kasa 5,5 · Kollar 1,8 · Oturak 3,8 · Sırt 3,5 m). Sunucu teklifte takımı dizilim kodundan yeniden kurar; ekranın verdiği metreye güvenmez.

**Örnek set (`lib/modul/ornek-set.ts`):** kol 25 cm, tekli oturum 65 cm, köşe 95 × 95 cm, şezlong 90 × 160 cm, puf 70 cm; derinlik 95 cm. Ekranda "Örnek set" diye işaretli. **Metrajları test için uydurulmuş sayılar, ORMEN'in sayıları değil.** Görev tanımına göre demo kalitesinde sayılmıyor.

**Test:**
- Birim (`tests/unit/dizilim.test.ts`, her sayının yanında elle hesabı): L, ayna, U, şezlonglu düz takım, kurallar, metraj toplamı, şema (modüller ölçülen kutunun içinde ve üst üste binmiyor), bağlantı kodu, modelin kumaş malzemesi.
- Uçtan uca (`tests/e2e/kose.spec.ts`): 3,15 × 2,40 m duvara L köşe **8 dokunuş ve 21 saniyede** kurulur (sınır 3 dakika). Ölçüler 315 / 185 cm, "Duvarlara sığıyor.", şema; 3D sahnedeki koltuk kumaşı giymiş ve 315 × 185 cm (±2). İkinci sol kol reddedilir. Aynalama ölçüyü sağa taşır, 3D boyut değişmez. Fazla oturum "65 cm taşıyor" der. Teklif bölge metrajları modül toplamlarıdır. Bağlantıyla açılan sayfa aynı takımı aynı boyda kurar.

**Bu dilimde olmayanlar (İş 4, 2. dilim):**
- Panelden modül seti yükleme (GLB, ölçü, bağlantı noktaları, parça metrajları) ve GLB modüllerin yan yana dizilerek çizilmesi. Şimdilik yalnızca örnek set var; o da koddan çiziliyor.
- Takımda minder ve kırlenti ayrı kumaşla giydirme: bölge seçimi (Oturak, Sırt…) bunu zaten yapıyor; ayrıca bir düğme eklenmedi.
- Takım şeması PDF'te yok.
- Hafif profilde 8 modüllü dizilimin kare hızı: ölçüm ekranı (`?olcum`) hazır, gerçek cihazda doğrulanacak.
- Puf modülü dizilime girmiyor (ayrı parça); eklemek için "Mobilya ekle" kullanılıyor.

## İş 3: metraj ve teklif (18 Kasım 2026)

**Hesap (`lib/teklif/metraj.ts`, tek saf işlev; ekran, PDF, telefon sayfası ve sipariş talebi aynı işlevi kullanır):**
- Parçalar: modelin bölge metrajları (Kasa, Kollar, Oturak, Sırt) ve yeni **ek parçalar** (Kırlent, Biye…; panelde model → Metraj → Ek parçalar, en çok 8). Bölge metrajı yoksa "Bir adet" tek parça sayılır.
- Her parça kendi bölgesine seçilen kumaşı alır; ek parçalar koltuğun ana kumaşını.
- Fire sınıfı: desenli kumaş → raporlu; yan çevrilmiş kesim → dönük; ötekiler → düz. Panelde **Siparişler** sayfasında girilir, yüzde olarak.
- **Fire katsayıları boş başlıyor**, "ORMEN girecek" notuyla. Boşken fire eklenmiyor ve teklifte "Fire dahil değildir." yazıyor. Varsayılan sayı önermedim. Katsayıları yalnızca yönetici değiştirebiliyor.
- Yuvarlama adımı varsayılan 0,5 m (görev tanımından); toplam kumaş başına, bütün parçalar toplandıktan sonra yukarı yuvarlanır (her parçayı ayrı yuvarlamak fazla yazardı; testte örneği var).
- **Kumaş eni 140 cm kararı:** Metrajın girildiği enden farklı enli kumaşta sayı verilmiyor, "Kumaşın eni X cm; metraj 140 cm en için girilmiş, usta hesaplar." yazıyor. Desen bilgisi girilmemiş kumaşta ve bölgelere bölünmüş ama bölge metrajı olmayan modelde de sayı yok, nedeni var. Bir kumaşın parçalarından biri sayısızsa o kumaşa kısmi toplam gösterilmiyor.
- Hesabın her adımı yazılıyor: "Kasa 6 m + Sırt 1,5 m + Kırlent 0,6 m = 8,1 m · Fire (düz kumaş): %10 · Fireyle 8,91 m, 0,5 m adımla yukarı yuvarlandı: 9 m".
- **Elle hesap testi (görev tanımının kabul ölçütü):** `tests/unit/teklif-metraj.test.ts`. Üç kumaşlı bir üçlü (ana kumaş SIENA-04, kollar desenli JAKAR-02, oturak MISSO-05); her beklenen sayının yanında elle hesabı yazılı: SIENA-04 8,1 × 1,10 = 8,91 → 9 m; JAKAR-02 2,5 × 1,25 = 3,125 → 3,5 m; MISSO-05 2 × 1,10 = 2,2 → 2,5 m.
- Bulunan ve düzeltilen hata: kayan nokta kalıntısı (9,0000001 m) yarım metre fazladan yuvarlanıyordu; yuvarlamadan önce değer milimetreye indiriliyor.

**Teklif ekranı ("Metraj ve teklif"):**
- Mağaza sayfalarında ve showroom ekranında; ORMEN'in kendi ana sayfasında yok (mağaza yok).
- Parça–kumaş–metraj tablosu, kumaş başına toplam ve açıklaması; müşteri adı, satıcı notu, fiyat isteğe bağlı.
- "Teklifi oluştur" sonrası: telefona alma QR'ı, WhatsApp QR'ı (kioskta WhatsApp bağlantısı ekrandan dışarı çıkamayacağı için; müşteri telefonuyla okutup kendi WhatsApp'ında açar; web sayfasında düz bağlantı), "PDF indir".
- **"ORMEN'e sipariş talebi gönder" yalnızca eşleşmiş showroom ekranında.** Web sayfasından gelen sipariş isteği reddediliyor (403): sipariş mağazanın ORMEN'e verdiği siparişidir, evdeki müşterinin değil.
- Kioskta bütün pencereler geniş ekranda 1,2 kat büyüyor (bir metreden okunmaları için; kartela ve numune pencereleri de).

**Güvenlik ve bütünlük:**
- Sunucu ekranın gönderdiği metrelere güvenmiyor: ekran yalnızca model, kumaş, bölge ve kesim yönünü gönderiyor; sunucu merkezdeki modeller, kumaşlar ve fire ayarlarıyla toplamı yeniden hesaplıyor. Sipariş talebindeki metre değiştirilemez.
- Teklif numarası ve telefon bağlantısı ekranda üretiliyor; internet yokken de teklif oluşuyor ve kuyruktan bağlantı gelince aynı numarayla gidiyor. Aynı teklif iki kez gelirse tek kayıt (cihazda verilen kayıt numarası tekil); bir teklif tek sipariş talebi açar, kaç kez gönderilirse gönderilsin (veritabanında tekil kısıt; uçtan uca testte iki gönderim, tek talep).
- **Müşterinin adı ve satıcı notu ayrı bir tabloda** (`quote_private`); ORMEN kullanıcılarına bu tabloda hiçbir okuma kuralı yok. Panelin Siparişler sayfası yalnızca mağazayı, teklif numarasını, kumaş kodlarını ve metreleri gösteriyor. PGlite testi: yönetici ve eleman müşteri adını hiçbir sorguyla okuyamıyor; başka mağazanın sahibi teklifi göremiyor.
- Telefon bağlantısı 128 bit rastgele; bağlantıyı bilen teklifi görür (paylaşım bağlantıları gibi). Mağaza paneli yazılınca "firma kendi tekliflerini görür" oradan gelecek; şimdilik teklif listesi yalnızca sipariş talepleri üzerinden ORMEN panelinde.

**PDF (`lib/teklif/pdf.ts`):**
- Tarayıcıda üretiliyor (kioskta yazdırma penceresi açılamaz; çevrimdışı da çalışmalı): `pdf-lib` ve `@pdf-lib/fontkit` (MIT, ücretsiz).
- Yazı tipi sitenin kendi yazı tipi Inter. Paket alfabeyi iki dosyaya bölüyor (düz harfler ayrı, ğ ş İ ayrı); iki dosya birlikte gömülüyor, her harf onu içeren dosyadan yazılıyor. ₺ işareti hiçbir dosyada yok; fiyat "TL" ile yazılıyor. WOFF2 biçimi kütüphanede çöktüğü için WOFF kullanıldı.
- Tek sayfa: mağazanın logosu (PNG/JPEG; SVG ya da bozuk logoda mağaza adı), teklif numarası ve tarih, müşteri, 3D sahneden alınmış kare (beyaz zeminde JPEG), tablo, kumaş başına toplam ve açıklaması, fiyat, not; altta sabit "Ekran renkleri bağlayıcı değildir; renk onayı numuneyle verilir." Uzun teklifte önce görsel, sonra yazı küçülüyor.
- ORMEN adı yalnızca kumaş kodlarının yanında "(ORMEN)" olarak geçiyor; belge mağazanın belgesi.
- Test `pdftotext` ile metni geri okuyor: Türkçe harfler gerçek metin, 28 satırlık teklif bile tek sayfa, logosuz mağazada çalışıyor, bozuk logo PDF'i durdurmuyor, "ORMEN" yalnızca kod yanında.
- Telefon sayfasındaki PDF'te 3D görsel yok: sahne görüntüsü sunucuda saklanmıyor (gereksiz depolama ve boyut).

**Bildirim:** Sipariş talepleri panelde **Siparişler** sayfasına ve panelin açılış sayfasına (numune talepleri gibi uyarı ve kart olarak) düşüyor. E-posta yok (para harcamama kararı).

**Veritabanı (`20261118000100_teklif.sql`, geri alma dosyasıyla):** `meterage_settings` (tek satır), `models.meterage_extra`, `quotes`, `quote_private`, `order_requests`. Canlıya uygulanmadı.

**Uçtan uca test (`tests/e2e/teklif.spec.ts`):** Yönetici fireleri girer; kumaşa en ve desen, köşe takımına bölge metrajı ve kırlent girilir; yeni mağazanın ekranında teklif: 9 + 2,5 + 2 + 0,5 = 14 m × 1,10 = 15,4 → 15,5 m ekranda ve açıklamada birebir; PDF iner, tek sayfa, mağaza adı, numara, müşteri, "MISSO-05 (ORMEN)", 15,5 m ve 42.500 TL içinde; sipariş talebi gider, düğme kilitlenir; aynı teklif sipariş talebiyle iki kez gönderilince ikincisi "zaten var" der; panelde talep bir kez, müşteri adı yok; panel açılışında uyarı; telefon sayfası girişsiz açılır; bilinmeyen bağlantı sakin bir mesaj verir; web'den sipariş 403.

**Eksik / sonraya:**
- Satıcı modundaki firma fiyatı (İş 7) ve mağaza panelinde teklif listesi.
- Köşe kurucunun (İş 4) şeması PDF'e henüz girmiyor.
- Teklifin çevrimdışı oluşturulması birim ve kuyruk testleriyle kapsanıyor; uçtan uca çevrimdışı teklif testi yazılmadı.

## İş 2: sihirli kartela; Next.js güvenlik yaması (18 Kasım 2026)

**Etiket:**
- Panel → **Kumaşlar** → kumaşları işaretle → "Telefonla okutulunca açılacak sayfa" (ORMEN ya da bir mağaza) → **Seçilenlerin etiketini aç**. A4, 3 × 8 etiket (L7159, askı etiketleriyle aynı kâğıt).
- Her etikette QR, kumaş kodu, seri ve renk adı, "Ekrana tutun, koltukta görün".
- QR yüksek hata düzeltmeli (H) ve 26 mm; etiket elde tutulur, eğilir, çizilir.
- QR kısa bir adres taşır: `/k/KOD` ya da `/k/magaza/KOD` (`lib/kartela/qr.ts`). Telefon bu adresi açınca mağazanın (ya da ORMEN'in) sayfası kumaş giyilmiş olarak açılır. Raporda "basılı QR" kaynağında, "kartela" etiketiyle sayılır.
- Bilinmeyen ya da gizli kumaş kodu sayfayı yine açar, yalnızca kumaşı zorlamaz.
- Eski askı etiketlerinin adresleri (`/f/firma?k=KOD`) ve QR'a yazılmış düz bir kod da ekranda okunur.

**Showroom ekranında "Kartela okut":**
- Kod kutusunun hemen altında. Kamera açılır; etiket ekrandaki kılavuz kutuya girince kendiliğinden okunur, kamera kapanır ve kumaş açık modelin seçili parçasına (seçim yoksa tamamına) yumuşak geçişle giyer.
- Okuma cihazda yapılır: tarayıcının kendi okuyucusu (Android'de var) ya da yoksa `jsQR` (ücretsiz, Apache-2.0 lisanslı, yalnızca düğmeye basılınca yüklenir). İkisi de internetsiz çalışır; çevrimdışı katman jsQR'ı da cihazda saklar.
- Ekran yalnızca koddan kumaşı bulur; QR'daki mağaza adı ekran için önemsizdir. Ekran her zaman kendi mağazasında giydirir.
- Mağazada olmayan ya da kapatılmış kumaş: "XYZ bu mağazada yok. Başka bir kartela deneyin." 6 saniye görünür, ekran takılmaz. Kartela olmayan bir QR "Bu QR bir kartela etiketi değil" der ve okumaya devam eder.
- Kamerası olmayan ekranda düğme hiç görünmez. Kamera izni reddedilirse düğme kaybolur ve "kodu yukarıya yazın" denir. Kod kutusu her durumda yerinde.
- Kamera yalnızca okuma penceresi açıkken çalışır; 30 saniyede okunamazsa kendiliğinden kapanır.
- Her başarılı okuma "kartela okutuldu" olayı olarak kaydedilir. Okuma süresi (düğmeden kumaşın seçilmesine) `?olcum` kutusunda da görünür.

**Okuma hızı, ölçülerek bulunan iki düzeltme:**
- İlk sürüm kareyi 720 piksele küçültüyordu; QR'ın kareleri yaklaşık 3,5 piksele düşüyor, okuma bazen sürüyordu. Artık yalnızca kılavuz kutunun içi tam çözünürlükte okunuyor; kareler iki kat büyük, işlenecek piksel daha az.
- Okuma penceresinin arkasındaki bulanıklık efekti kaldırıldı: kamera görüntüsü her yenilendiğinde bütün ekranın yeniden bulanıklaştırılmasına yol açıyordu ve okumayı yavaşlatıyordu (zayıf bir Android'de de yavaşlatırdı). Yerine koyu, düz bir arka plan geldi.
- Sonuç: sahte kamerayla, internet kapalı, yazılımsal grafikte 4 ardışık koşuda 508–560 ms. Görev tanımı 2 saniye istiyor.

**Test:**
- Uçtan uca, ekranın kamerası Chromium'un sahte kamerası. Ona, etiket sayfasının bastığı QR'ın aynısı, gri bir zemin üstünde elde tutulan bir kart gibi veriliyor.
- Panelde iki kumaş seçilir, etiketler açılır; QR adresi `/k/ornek-mobilya/MISSO-05`.
- Kısa adres mağaza sayfasına yönlenir ve koltuk MISSO-05 olur; bilinmeyen kod sayfayı kumaşsız açar.
- Ekran eşleşir, internet kesilir, ekran yeniden açılır; kartela okunur, kamera kapanır, koltuk MISSO-05 olur, süre 2 saniyenin altındadır. Okuma boyunca 100 ms'de bir sayılan kumaşlı parça sayısı hiç sıfıra düşmez (gri ya da boş koltuk yok).
- Mağazada olmayan kod uyarı verir, ardından kod kutusu çalışır.
- Kamerası olmayan tarayıcıda düğme görünmez.

**Cihazda doğrulanacak (bu ortamda yapılamaz):**
- Basılı etiketin gerçek kamerayla 20–40 cm'den okunması. Sahte kamera, kameranın 30 cm'den göreceği boyutta düz, iyi aydınlatılmış bir görüntü veriyor; parlama, bulanıklık, eğik tutma ve mağaza ışığı denenmedi.
- Tarayıcının kendi okuyucusunun yolu: Linux'taki test tarayıcısında bu okuyucu yok, testler jsQR yolundan geçti. Android'de kendi okuyucusu kullanılacak.

**Next.js güvenlik yaması:**
- `npm install` sırasında görülen denetim uyarısı kendi eklediğim pakette değildi; Next.js 16.3.8'deydi. Aralarında kimlik doğrulamasız uzaktan kod çalıştırma olan beş açık var (GHSA-2464-fhr4-w9xw, GHSA-673q-mjm6-r5xr ve üçü daha).
- Next.js ve eslint-config-next 16.4.6'ya (9 Kasım'da çıkan yama sürümü, aynı ana sürüm) yükseltildi; üretim bağımlılıklarında açık kalmadı, bütün testler geçiyor.
- Kalan uyarılar yalnızca geliştirme araçlarında (kod denetleyici ve test aracının dosya eşleme kütüphaneleri); sitede çalışmıyor, dokunulmadı.
- **Yayındaki site (`ormen3xd`) hâlâ 16.3.8 ile çalışıyor.** O depoya bu oturumun yazma izni yok. Aynı yükseltme orada da yapılmalı; bu depo yayına alınana kadar bekletmemek gerekir.

## İş 1, 9. dilim: kalite profili ve vitrin döngüsünde model değişimi (18 Kasım 2026)

**Kalite profili (`lib/three/profile.ts`), yalnızca eşleşmiş showroom ekranında:**
- **Tam:** cihazın kendi kademesi (önceki gibi), gölgeler açık, doku boyutunu ekran seçer.
- **Hafif:** 1K doku, düşen gölge kapalı, ışık yansıması daha küçük çözünürlükte, piksel oranı 1. Zemindeki temas gölgesi iki profilde de duruyor (ucuz ve koltuğu yere oturtuyor).
- **Kendisi seçsin (varsayılan):** açılışta, koltuğun ilk dönüşündeki art arda gelen 45 kare ölçülür; ortanca kare 30 fps'in altındaysa hafif, değilse tam seçilir. Karar cihazda saklanır; sonraki açılışlar ölçmeden doğru profille başlar.
- **Panelden:** mağaza sayfası → Cihazlar → her ekranın yanında "Kalite" seçimi. Değişince ekrana "şimdi eşitle" gider; ekran bir sonraki denetiminde yeniden açılır ve yeni profille başlar.
- **Değişmeyen:** kumaşın rengi, desen ölçeği (bir doku karesinin gerçek boyutu) ve ışığın rengi. Profil yalnızca detayı azaltır. Uçtan uca test bunu sahnenin kendisinden ölçüyor: aynı ekran önce tam, sonra hafif profille açılıyor; her kumaş parçasının rengi ve doku tekrarı birebir aynı, hafifte gölge yok ve dokular en çok 1024 piksel.
- `?olcum` kutusunda profil de yazıyor.

**Vitrin döngüsü:**
- Koltuk her üç kumaşta bir, mağazanın panelde "Öne çıkar" ile işaretlediği sonraki modele geçer; öne çıkan yoksa bütün modeller sırayla döner. Tek modelli mağazada model değişmez. Yeni modelde o modele açık gerçek kumaşlardan biri giyer (mümkünse aynı kumaş).
- Sahnede birden çok parça varsa (hazır sahne ya da paylaşılan kombinasyon) model değişmez; yalnızca kumaş döner.
- Eşleşmiş ekranın karşılamasında görev tanımındaki yazı var: mağazanın logosu ve "Dokunun, kumaşı siz seçin". ORMEN adı geçmiyor. Eski `?kiosk` adresinin karşılaması değişmedi.
- Model sırası ve "üç kumaşta bir" kuralı birim testli. Döngüde modelin gerçekten değiştiği uçtan uca denenmedi (6 saniyelik adımlarla en az 18 saniye ve yazılımsal grafikte yavaş); bunu cihaz testinde gözle doğrulamak gerekiyor.

## İş 1, 8. dilim: çevrimdışı çalışma ve olay kaydı (18 Kasım 2026)

**Servis çalışanı (`public/showroom-sw.js`), yalnızca eşleşmiş `/showroom` sayfasında:**
- **Showroom sayfası:** her açılışta önce ağdan istenir (6 saniye bekler); ağ cevap vermezse cihazdaki son çalışan kopya açılır. Böylece yeni sürüm ulaşılabildiği an alınır, yarım kalan bir güncelleme ekranı kilitlemez. Cihazda hiç kopya yoksa sakin bir "İnternet bağlantısı yok" sayfası çıkar ve bağlantı gelince kendini yeniler.
- **Uygulama dosyaları (`/_next/static`, Draco):** aynı adla hiç değişmedikleri için doğrudan cihazdaki kopya kullanılır.
- **Dokular, modeller, logolar:** önce cihazdaki kopya. En çok 600 dosya tutulur; sınır ya da depolama dolunca en uzun süredir kullanılmayanlar atılır. Depolama hatası ekranı düşürmez, yalnızca o dosya saklanmaz.
- **Önceden indirme:** Servis çalışanı devreye girince sayfa ona mağazanın bütün kumaşlarının dokularını (ekranın kullandığı boyutta), model dosyalarını, zeminleri, logoyu ve 3D çözücüyü verir; boşta tek tek indirilir. Böylece hiç denenmemiş bir kumaş da çevrimdışı giyer.
- **Kod parçaları:** 3D sahne ve pencereler ayrı parçalar hâlinde sonradan yükleniyor. Servis çalışanı indirdiği her parçanın içinde adı geçen diğer parçaları da izleyip indirir; ekranın ulaşabileceği bütün kod cihaza alınır, yalnızca o an açılmış olanlar değil.

**Kayıt kuyruğu (`lib/offline/outbox.ts`):**
- Showroom ekranındaki her olay önce cihazdaki kuyruğa (IndexedDB) yazılır, sonra gönderilir. Bağlantı yoksa bekler; bağlantı gelince, dakikada bir ve sayfa her açıldığında yeniden denenir. Yeniden başlatma ve elektrik kesintisinde kaybolmaz.
- Her kaydın cihazda verilmiş tekil bir numarası var; sunucu bir numarayı bir kez saklar (veritabanında tekil dizin). Bu yüzden yeniden denemek her zaman güvenli: aynı kayıt iki kez sayılmaz.
- Sunucu kaydı kabul ettiyse ya da kalıcı olarak reddettiyse (bozuk kayıt) silinir; sunucu hatası, "çok sık" ya da cevap yoksa bekletilir. Kuyruk sınırsız büyümez: 30 günden eski ve en yeni 2.000'in dışındaki kayıtlar atılır.
- Kuyruk şimdilik yalnızca olay kayıtlarını taşıyor; teklif ve sipariş talebi İş 3'te aynı kuyruğa eklenecek. Numune talebi (ad ve telefon içeriyor) bilerek kuyruğa alınmıyor: ortak bir ekranda müşterinin telefonunu cihazda bekletmek istemedim.

**Ekranda:**
- Bağlantı yokken altta tek satır çıkar: "İnternet bağlantısı yok · kumaş deneme ve ölçüler çalışıyor; N kayıt bağlantı gelince gönderilecek."
- "Numune iste" bağlantı yokken pasif; neden yazdığı açıklama ekran okuyucuya da gidiyor. "Telefona al" çalışmaya devam ediyor: QR cihazda üretiliyor, müşterinin telefonu kendi internetini kullanıyor (kısa bağlantı alınamazsa uzun bağlantı veriliyor).

**Olay kaydı (`20261118000000_olay_kaydi.sql`, yalnızca ekler, geri alma dosyası var):**
- Görev tanımının 9. bölümündeki türler eklendi: oturum başladı/bitti, model görüntülendi, kartela okutuldu, fotoğraftan deneme istendi/başarılı/başarısız, köşe kuruldu, teklif oluşturuldu, sipariş talebi, vitrin başladı/bitti.
- Yeni alanlar: parça (kasa, kol…), iki sayı (oturum süresi; köşede modül sayısı ve uzunluk gibi), ekran ve cihazda verilen kayıt numarası.
- Ekran ve mağaza istekten alınmaz; sunucu, ekranın gizli anahtarından kendisi yazar.
- Şimdilik kaydedilenler: vitrin başladı/bitti (döngü süresiyle), oturum başladı/bitti (oturum süresiyle). Öteki türler kendi işleriyle birlikte yazılmaya başlayacak.
- Müşterinin adı ve fotoğrafı olaya giremez: kayıt yalnızca bilinen alanları alır, gerisini atar (testli).
- Raporun SQL fonksiyonu yeni türlerle de çalışıyor (testli).

**Bulunan ve düzeltilen hatalar:**
1. Servis çalışanı eşleşmiş sayfada kaydolduğu için o sayfa hiç saklanmıyordu; ilk çevrimdışı açılış boş sayfa veriyordu. Artık devreye girer girmez sayfayı kendisi indirip saklıyor.
2. 3D sahne kodu servis çalışanından önce yüklendiği için saklanmamıştı; çevrimdışı "Sahne yüklenemedi" çıkıyordu. Artık sayfanın o ana kadar yüklediği kod da saklanıyor.
3. Ciddi: kullanılan her doku, "yeni kullanıldı" diye sırası tazelenirken önbellekten siliniyordu (kopya, dosya sayfaya verildikten sonra alınmaya çalışılıyor ve sessizce başarısız oluyordu). Kopya artık önce alınıyor.
4. Kiosk sıfırlaması yarım saniyede bir tetiklenebiliyordu; oturum sonu kaydı birden çok kez yazılabilirdi. Tek sefere bağlandı.

**Test:**
- Uçtan uca: ekran eşleşir, mağazanın bütün dosyaları indirilir. İnternet kesilir ve ekran yeniden başlatılır; sayfa cihazdaki kopyadan açılır (sunucuya giden istek gerçekten başarısız). Bilgi şeridi görünür, "Numune iste" pasif. Hiç denenmemiş bir kumaş kartela kodundan koltuğa giyer. "Telefona al" QR'ı açılır. Kayıtlar cihazda bekler, hiçbiri gitmez. Bağlantı gelince kuyruk boşalır, kumaş denemesi ve oturum başlangıcı kayıtları gider, her numara bir kez.
- Birim: kuyruk kuralları; olay alanları; aynı numaranın bir kez saklanması (bellek ve PGlite); geri al ve yeniden uygula.

**Sınırlar:**
- Gerçek Android cihazda denenmedi; çevrimdışı test Chromium'un çevrimdışı benzetimiyle yapıldı.
- Ekran internete hiç bağlanmadan ilk kez açılamaz; ilk açılış ve eşleşme bağlantı ister.
- Kod parçası izleme, Next.js'in parça adlarını kodun içine düz metin olarak yazmasına dayanıyor; Next.js bunu değiştirirse yalnızca çevrimiçi açılmış pencereler çevrimdışı açılır. Çevrimdışı testi bunu yakalar.
- Hafif / tam kalite profili ve açılışta kare hızı ölçümü henüz yok (İş 1'in son parçası).

## İş 1, 7. dilim: kilit, mağaza PIN'i, ana ekrana kurulum (18 Kasım 2026)

- **Kilit (`components/kiosk/ShowroomLock.tsx`, yalnızca `/showroom`):**
  - Ekrandaki hiçbir bağlantı dışarı çıkmaz: başka siteler, panel ve ana sayfa bağlantıları çalışmaz, yeni pencere açılmaz (`window.open` kapalı).
  - Müşterinin okuyabilmesi gereken tek sayfa olan aydınlatma metni (`/kvkk`) ekranın içinde, kapat düğmeli bir pencerede açılır. Pencere `sandbox` ile açıldığı için metnin içindeki bağlantılar da bir yere götürmez.
  - Parmakla yakınlaştırma, Ctrl + tekerlek, aşağı çekip yenileme, uzun basma menüsü ve takılı bir klavyeden F5 / F11 / Ctrl+R / Ctrl+L gibi kısayollar kapalı.
  - Çıkış: logoya 3 saniye içinde 5 dokunuş, ardından mağaza PIN'i. Açılan "Ekran ayarları" penceresinde "Güncellemeleri denetle", "Tam ekrandan çık" ve "Showroom'a dön" var. Dokunulmayan PIN ya da ayar penceresi 60 saniyede kendiliğinden kapanır.
  - Android'in kendi kilidi (uygulama sabitleme, kiosk başlatıcı) kod işi değil; `KURULUM.md`'ye yazılacak.
- **Mağaza PIN'i:** 4–6 rakam, panelde mağaza sayfasının Cihazlar bölümünden girilir. 1234, 0000 gibi kolay PIN'ler reddedilir. Yalnızca tuzlu scrypt özeti saklanır (`firm_admin.pin_hash`); PIN değişikliği günlüğe yazılır ama PIN'in kendisi yazılmaz. Ekran başına 5 hatalı denemeden sonra 5 dakika bekleme. Ekran yalnızca kendi mağazasının PIN'ini deneyebilir.
- **PIN yoksa:** Ekrandan çıkılamaz ve ekranda "Bu mağaza için PIN girilmemiş" yazar; panel bölümü de bunu hatırlatır. Bilerek böyle: PIN'siz bir çıkış yolu kilidi anlamsız kılardı.
- **Ana ekrana kurulum:** `/showroom/manifest.webmanifest` ekranın eşleştiği mağazaya göre üretilir: mağazanın adı, tam ekran, yatay, açılış adresi `/showroom`. Simge `/showroom/simge/192` ve `/512`: mağazanın PNG ya da JPEG logosu; logo yoksa, SVG ise ya da alınamazsa mağaza renginde baş harfi. Sekme başlığı yalnızca mağazanın adı; ORMEN adı geçmez.
- **Bulunan ve düzeltilen hata:** Simge ilk yazıldığında logoyu sitenin ayarlı adresinden çekiyordu; o adres çalışmıyorsa ya da logo SVG ise simge hiç üretilmiyordu. Artık logo isteğin geldiği sunucudan, 3 saniye sınırla alınıyor; yalnızca PNG ve JPEG kullanılıyor, gerisi baş harfe düşüyor.
- **Test:** Uçtan uca: kolay PIN reddedilir; kurulum dosyası mağaza adını taşır; ekrandaki bütün bağlantılara ve sonradan eklenen panel / dış site bağlantılarına tıklanır, adres `/showroom`'da kalır ve yeni pencere açılmaz; 4 dokunuş bir şey açmaz, 5. dokunuş PIN ister; yanlış PIN kilitte bırakır; doğru PIN ayarları açar ve "Ekran güncel" der. PIN ucu eşleşmemiş ekrana 401 döner.
- **Sınır:** Tarayıcının kendi adres çubuğu ve sistem çubukları sayfadan gizlenemez; tam ekran ve uygulama sabitleme cihazdan açılır. Gerçek Android cihazda denenmedi.

## İş 0, 6. dilim: merkez katalog ve toplu atama (15 Kasım 2026)

- **Katalog ekranı (`/panel/katalog`):** Her ürün bir kez listelenir; yanında kaç mağazada olduğu yazar. Arama (ad, üretici), sahiplik (ortak / mağazaya özel), kategori, mağaza ("bu mağazada ne var") ve "atanmamış" süzgeci; sayfada 50 ürün. Sayım veritabanında yapılır (`atelier_products`, `20261115000100_katalog.sql`).
- **Toplu atama:** Soldan ürünler, sağdan mağazalar işaretlenir; "Mağazalara ekle" ya da "Çıkar" tek işlemdir. Mağazanın zaten sahip olduğu ürüne dokunulmaz, verdiği ad yerinde kalır; aynı işlemi tekrarlamak hiçbir şey değiştirmez.
- **Mağazaya özel ürün:** Seçimde bir tane bile varsa işlemin tamamı reddedilir (yarım iş kalmaz) ve deneme değişiklik günlüğüne "reddedildi" diye yazılır. Aynı kural veritabanında da duruyor (1. dilimdeki tetikleyici).
- **Sınırlar:** Tek işlemde en çok 500 ürün ve 200 mağaza.
- **Günlük:** Her toplu işlem tek satır ve tek işlem numarasıyla kaydedilir; hangi ürünler, hangi mağazalar ve hangi yön yazılı olduğu için geri alınabilir (geri alma düğmesi henüz yok).
- **Test:** Liste ve atama kuralı birim testli. Veritabanı fonksiyonu 100 mağaza, 2.000 ürünlük veride denendi (2 saniyenin altında; sayım gerçek atama sayısıyla aynı). Uçtan uca: iki ürün bir mağazaya eklenir, tekrarı "0 atama" der, mağaza süzgeci tam o ikisini gösterir, biri çıkarılır.
- **Eksikler:**
  - Özel ürünün reddi arayüzden uçtan uca denenmedi; kural birim testinde ve veritabanı testinde doğrulanıyor.
  - Üretici ve kategori alanları veritabanında ve süzgeçte var ama ürün düzenleme ekranında henüz girilemiyor; tarz etiketleri de öyle.
  - "Özelden ortağa çevir" (yalnızca yönetici) ve kumaş kütüphanesinde tek kumaşı mağaza bazında kapatma henüz yok.
  - Toplu atama panelindeki mağaza listesi şimdilik bütün mağazaları tek seferde getiriyor (100 mağazada sorun değil).

## İş 0 ve İş 1, 5. dilim: cihaz eşleştirme, showroom adresi, uzaktan eşitleme (15 Kasım 2026)

- **Showroom adresi:** Bütün mağazaların ekranı aynı adresi açar: `/showroom`. Hangi mağazayı göstereceğini adres değil, ekranın kendi gizli anahtarı belirler. Eski `?kiosk` adresi aynen çalışıyor.
- **Eşleştirme:** Panel → mağaza sayfası → Cihazlar → "Cihaz ekle" 6 haneli bir kod verir. Kod 10 dakika geçerli ve bir kez kullanılır. Ekranda kod, dokunmatik tuş takımıyla yazılır (klavye gerekmez; 1920 × 1080'de tuşlar 173 × 104 piksel).
- **Ekranın kimliği:** Kod, uzun ve rastgele bir anahtarla değiştirilir. Anahtar ekranda betiğin okuyamadığı bir çerezde iki yıl durur; veritabanında yalnızca özeti saklanır. Ekran hiçbir istekte "ben şu mağazayım" demez; sunucu mağazayı anahtardan bulur. Bu yüzden bir ekran başka mağazanın içeriğini isteyemez.
- **Kod tahmini:** Aynı kaynaktan 15 dakikada 10 hatalı denemeden sonra kilitlenir. Yanlış denenen kod da silinir.
- **Eşitleme:** Açık ekran 2 dakikada bir ve vitrin döngüsüne girerken sunucuya sorar; çalıştırdığı uygulama ve içerik sürümünü bildirir. Karar tek bir saf işlevde (`lib/devices/sync.ts`):
  - yeni içerik varsa ve ekran boştaysa hemen uygulanır;
  - müşteri ekrandaysa görüntü değişmez, ekran boşa düşünce uygulanır;
  - onaylı modda "Güncelleme hazır · Şimdi yükle" bildirimi çıkar, satıcı basmadan uygulanmaz;
  - panelden "şimdi eşitle" gelirse onaylı modda da uygulanır;
  - ekran kaç sürüm geride olursa olsun tek adımda son hâli alır (yalnızca "bendekinden farklı mı" sorulur).
- **Askıya alma:** Askıdaki mağazanın ekranı bir sonraki denetimde "Ekran kısa bir süre için kapalı" mesajına geçer; geri açılınca kendiliğinden döner. Hiçbir şey silinmez.
- **Kaldırma:** Yalnızca yönetici. Kaldırılan ekranın anahtarı o an geçersiz olur; ekran yeniden kod sorar.
- **Vitrin süresi:** Eşleşmiş ekranda varsayılan 60 saniye; mağaza ayarından (`vitrinSn`, 30–600) değişir. `?kiosk` adresinin 90 saniyesi değişmedi.
- **Panelde cihaz satırı:** ad, şube, son görülme, son eşitleme, uygulama ve içerik sürümü, tek kelimelik durum (Güncel, Güncelleme bekliyor, İndiriyor, Eşitleme hatası, Kapalı, Henüz açılmadı). 15 dakikadır denetime gelmeyen ekran "Kapalı" sayılır.
- **Test:** Uçtan uca: yanlış kod reddedilir; doğru kod mağazanın showroom'unu açar; aynı kod ikinci ekranda çalışmaz; ekran yeniden açılınca kod sormaz; askıya alınınca mesaja geçer, geri açılınca döner; kaldırılınca kod ekranına düşer; eşleşmemiş ya da uydurma anahtarlı istek 401 alır ve hiçbir şey öğrenemez.
- **Bu dilimde OLMAYANLAR (İş 1'in kalanı):**
  - Çevrimdışı çalışma yok: servis çalışanı, doku önbelleği ve kayıt kuyruğu henüz yazılmadı. İnternet kesilirse ekran yenilenemez.
  - Güncelleme şimdilik sayfayı yeniden yükleyerek uygulanıyor; "arka planda indir, hata olursa son çalışan sürümle aç" çevrimdışı katmanla birlikte gelecek.
  - Kilit (logoya 5 dokunuş + PIN ile çıkış), ana ekrana kurulum, kalite profili ölçümü ve vitrin döngüsünde model değişimi henüz yok.
  - Kademeli yayın, toplu "şimdi eşitle" (birden çok mağazaya) ve cihaz adını / kalite profilini panelden değiştirme henüz yok.
  - Veritabanı tarafında cihaz için ayrı bir fonksiyon katmanı yazılmadı; sunucu cihazın mağazasını anahtar özetinden buluyor ve bütün sorguları o mağazayla sınırlıyor. Plandaki `showroom_*` fonksiyonları, cihaz mağazaya ait kayıt yazmaya başladığında (teklif, olay) eklenecek.

## İş 0, 4. dilim: aynı ürün, her mağazada kendi adıyla (15 Kasım 2026)

- **Ne:** Ortak bir ürün mağazaya verilince mağaza onu kendi adı, ürün kodu ve açıklamasıyla gösterir; öne çıkarabilir ya da gizleyebilir. Panel → mağaza sayfası → "Bu mağazada nasıl görünsün".
- **Merkezden gelen değişmez:** 3D model, ölçü ve metraj tek yerde durur. Mağaza yalnızca gösterimi değiştirir; bu yüzden merkezde metraj düzeltilince ürünü alan bütün mağazaların hesabı aynı anda değişir.
- **Bağlantılar bozulmaz:** Mağaza ürüne başka ad verse de adresindeki ad (`/f/magaza/urun`) merkezdeki hâliyle kalır; basılmış QR'lar çalışmaya devam eder.
- **Bulunan ve düzeltilen hata:** Mağaza kaydedilirken ürün listesi "hepsini sil, yeniden ekle" ile yazılıyordu. Bu, yeni alanları (mağazadaki ad, kod) her kayıtta silerdi. Artık yalnızca çıkarılan ürün silinir; kalanların sırası güncellenir. Uçtan uca testte mağaza yeniden kaydedilip adın yerinde durduğu denetleniyor.
- **Boş mağaza kuralı korundu:** Hiç ürün verilmemiş mağaza ORMEN vitrinini gösterir. Verilen ürünlerin hepsini gizleyen mağaza ise vitrini göstermez (gizlemek bilerek yapılmış bir seçimdir).
- **Yetki ve kayıt:** İşlem "içerik" yetkisi ister (yönetici ve eleman). Her değişiklik değişiklik günlüğüne öncesi ve sonrasıyla yazılır.
- **Test:** Bir ürün 15 mağazaya atanır, her birinde farklı adla görünür, merkezde metraj 8 → 9,5 m yapılınca 15'inde de 9,5 m olur ve adlar yerinde kalır (`tests/unit/shop-products.test.ts`).
- **Eksik:** Toplu atama (seçili ürünleri seçili mağazalara tek işlemde) ve mağaza bazında fiyat ekranı henüz yok; sıradaki dilim.

## İş 0, 2–3. dilim: roller sunucuda, mağaza listesi (15 Kasım 2026)

- **Yetki tablosu (`lib/auth/roles.ts`):** yönetici her şeyi; eleman içerik, kurulum ve günlükten geri alma; mağaza sahibi yalnızca kendi fiyatı. Oturum artık rolü taşıyor. Profilde bilinmeyen bir rol yazıyorsa dar olan (eleman) sayılır.
- **Kalıcı silme yalnızca yöneticide:** numune talebi ve geri bildirim silme işlemleri sunucuda rolü denetliyor. KVKK silme talebini bu yüzden yönetici yapar. Elemanın ekranında "Sil" düğmesi hâlâ görünüyor; basınca "yetkiniz yok" der. Düğmenin gizlenmesi sıradaki işlerden.
- **Deneme için:** yerelde `PANEL_DEMO_ROLE=staff` ile demo kullanıcı eleman olarak açılır.
- **Mağazalar ekranı (`/panel/magazalar`):** arama (ad, bağlantı adı, yetkili), durum, şehir ve etiket süzgeci, dört sıralama, sayfada 50 mağaza. Sayılar tek veritabanı çağrısından gelir (`atelier_shops`). Dikkat isteyenler satırda etiket olarak çıkar: askıda, eşitleme hatası, 30 gündür açılmayan ekran, vadesi geçen bakım.
- **Askıya alma tek dokunuş;** hiçbir veri silinmez, geri açınca kaldığı yerden sürer. Her durum değişikliği değişiklik günlüğüne yazılır (öncesi ve sonrasıyla).
- **Bakım vadesi elemana hiç gönderilmiyor:** yalnızca gizlenmiyor, sunucu o alanı boş yolluyor ve "vadeye göre sırala" seçeneği çıkmıyor.
- **"Firmalar" ekranı duruyor.** Mağaza satırı şimdilik eski firma düzenleme sayfasına gidiyor; iki ekran, mağaza ayrıntı sayfası yazılınca birleşecek.
- **Test:** yetki tablosu ve liste mantığı birim testli; uçtan uca testte girişsiz erişimin kapalı olduğu, arama, süzme, askıya alma ve geri açma doğrulanıyor. Mevcut panel ve kiosk testleri (13 test) aynen geçiyor.

## İş 0, 1. dilim: merkez şeması ve yetki kuralları (15 Kasım 2026)

- **Dosya:** `supabase/migrations/20261115000000_merkez.sql`; geri alma: `supabase/geri-al/20261115000000_merkez.sql`. Yalnızca ekler. Canlı veritabanına **uygulanmadı**.
- **Roller:** Yeni rol sütunu açılmadı; `profiles.role` zaten vardı. `admin` = ORMEN yöneticisi, `staff` = ORMEN elemanı. Mağaza sahibi `profiles`'ta değil, `firm_members`'ta durur. Satıcının hesabı yok; eşleşmiş cihaz ve firma PIN'i ile çalışır.
- **Herkese açık tablolara gizli alan konmadı.** `firms` ve `firm_models` ziyaretçiye açık okunuyor. Bu yüzden PIN, yetkili kişi, paket ve kota `firm_admin` tablosunda; mağazanın satış fiyatı `firm_prices` tablosunda. İkisi de ziyaretçiye kapalı.
- **Ortak ve mağazaya özel ürün:** Ayrım zaten vardı (`models.firm_id` boş ya da dolu); veri taşınmadı. Özel ürünün başka mağazaya atanmasını veritabanı reddeder (tetikleyici), kim denerse denesin.
- **ORMEN elemanı:** Fiyatı ve aboneliği okuyamaz, yazamaz; kumaş, mağaza, model, cihaz ve geri bildirim silemez. Eski kurallara dokunulmadı; üstlerine kısıtlayıcı kural eklendi.
- **İçerik sürümü:** `firms.content_version`. Mağazanın kendi adı, ayarı, özelliği, ataması ya da fiyatı değişince yalnızca o mağazada; ortak ürün değişince atandığı mağazalarda; kumaş değişince bütün mağazalarda artar. Tetikleyiciler satır başına değil işlem başına çalışır: ilk denemede 2.000 ürünlük örnek veri 175 saniye sürdü, işlem başına çevrilince test 6 saniyeye indi.
- **Test (`tests/unit/merkez.test.ts`, PGlite):** göç dosyası uygulanır, geri alınır, yeniden uygulanır; ziyaretçi yeni tabloların hiçbirini göremez; A mağazasının sahibi B'nin cihazını ve fiyatını numarasını bilse de okuyamaz, yazamaz; eleman fiyat ve aboneliğe doğrudan sorguyla da ulaşamaz ve silemez; değişiklik günlüğüne yalnızca sunucu yazar; 100 mağaza, 2.000 ürün ve 300 cihazda mağaza listesi 2 saniyenin altında.
- **Bilinen sınır:** Uygulamanın sunucu tarafı bugün gizli anahtarla çalışıyor ve satır kurallarını aşıyor. Bu yüzden aynı kurallar bir sonraki dilimde sunucu işlemlerine de konacak; mağaza paneli ise gizli anahtarı hiç kullanmayacak.

---

## Kurulum durumu sayfası (5 Ekim 2026)

- Panelde **Kurulum** sekmesi (`/panel/durum`): Supabase bağlantısı, beş tablo dosyasından hangilerinin çalıştırıldığı (her biri yarattığı tablo/sütun/fonksiyon/klasör sınırıyla tespit ediliyor), kumaş ve model durumu, alan adı (panelin açıldığı adresle karşılaştırılarak), WhatsApp numarası, üretimde demo giriş. Elle yapılacak üç iş (KVKK, telefonda AR, güvenlik duvarı) ayrı "Sizde" olarak listeleniyor.
- Her açılışta yeniden kontrol ediyor; genel bakış sayfasında kırmızı/sarı varsa uyarı şeridi çıkıyor.
- Kuralların hepsi birim testli (`lib/setup-check.ts`). Supabase'e karşı tespit kısmı gerçek bir Supabase projesiyle denenemedi; kurulumda ilk kez çalışacak.

---

## Güvenlik incelemesi ve düzeltmeler (5 Ekim 2026)

Yayından önce dışarıya açık bütün kapılar ayrı bir incelemeyle tarandı (panel girişi, panel işlemleri, dosya yükleme, herkese açık formlar, veritabanı izinleri, yönlendirmeler). Bulgular ve yapılanlar:

- **Ciddi (düzeltildi): panel sayfalarının verisi giriş yapmadan okunabiliyordu.** Giriş kontrolü yalnızca panelin ortak çerçevesindeydi (layout). Next.js'te bu, alttaki sayfanın çalışmasını durdurmuyor: tarayıcı giriş sayfasına yönlenirken yönlendirme cevabının içinde talepler sayfasının verisi (ad, telefon) de geliyordu. Elle denendi ve doğrulandı. Düzeltme iki katlı: (1) her panel sayfası veriye dokunmadan önce oturumu kendisi kontrol ediyor; (2) `proxy.ts` oturum çerezi olmayan isteği panel sayfaları hiç çalışmadan giriş sayfasına yolluyor. Uçtan uca testte çerezsiz ve sahte çerezli istekte ad ve telefonun cevapta olmadığı kontrol ediliyor; kontrol kaldırılınca testin yakaladığı da denendi. Panel işlemleri (kaydetme vb.) ve panel API'leri zaten her seferinde kontrol ediyordu; onlarda sorun yoktu.
- **Orta (düzeltildi): Excel formül enjeksiyonu.** Numune formundan gelen ad ya da not `=`, `+`, `-`, `@` ile başlıyorsa, talepler CSV'si Excel'de açıldığında formül olarak çalışabilirdi. Bu değerler artık metin olarak yazılıyor; telefonlar CSV'de `0532 …` biçiminde.
- **Orta (düzeltildi): demo oturum çerezi tahmin edilebilir anahtarla imzalanabiliyordu.** Supabase'siz ve `PANEL_SESSION_SECRET` girilmemiş bir yayında çerez sabit bir anahtarla doğrulanıyordu. Artık üretimde en az 32 karakterlik `PANEL_SESSION_SECRET` yoksa demo girişi kapalı ve hiçbir demo çerezi kabul edilmiyor. Supabase'li kurulumu etkilemiyor.
- **Düşük (sıkılaştırıldı):** Yükleme yolunda `..` gibi parçalar reddediliyor. Dosya klasörüne veritabanı tarafında 60 MB ve dosya türü sınırı kondu (beşinci migration). Rapor fonksiyonu anonim kullanıcılara açıkça kapatıldı.
- **Açık kalan (öneri): herkese açık formlara istek seli.** Numune formu, kullanım kaydı ve kısa link uç noktaları doğrulama ve boyut sınırıyla korunuyor ama saniyede yüzlerce istek atan bir betiği durdurmuyor. IP saklamama kuralı nedeniyle bunu uygulamada değil, Vercel'in güvenlik duvarında (IP'yi saklamadan sayan hız sınırı) çözmeyi öneriyorum; README'de adımı var.
- Temiz bulunanlar: service role anahtarı tarayıcıya hiç gitmiyor; satır güvenliği anonim kullanıcıya talep, olay ve profil okutmuyor; yönlendirmelerde dış adrese gitme yok; sunucu kullanıcı adresine istek atmıyor; sayfaya HTML olarak basılan tek içerik kendi ürettiğimiz QR kodları.

---

## Faz 2, iş 7: Rapor veritabanında hesaplanıyor (5 Ekim 2026)

- **Neden şimdi:** Yol haritasında "olay sayısı yüz binleri geçince" diye bekletilmişti. Gerçek veri gerektirmediği ve kurulumdan önce eklemek sonradan eklemekten kolay olduğu için öne aldım.
- **Ne:** `atelier_report` adlı tek bir SQL fonksiyonu (dördüncü migration). Rapor sayfası Supabase'de bunu çağırıyor; bütün olayları uygulamaya taşımıyor ve önceki 50.000 olay sınırı kalktı. Supabase'siz demo modunda hesap eskisi gibi uygulamada.
- **Doğrulama:** PGlite'ta 60 ziyaretlik rastgele veriyle SQL fonksiyonu ve uygulamadaki hesap üç kapsamda (hepsi, ORMEN sayfası, tek firma) karşılaştırılıyor; sonuçlar birebir aynı. Günler iki tarafta da İstanbul saatine göre.
- Fonksiyonu yalnızca sunucu (service role) çalıştırabiliyor.

---

## Faz 2, iş 5: Kısa paylaşım linki (5 Ekim 2026)

- **Ne:** Paylaşımda artık `…/s/Ab3dE9xK` gibi 8 karakterlik link veriliyor; açılınca kalıcı yönlendirmeyle (`308`) her zamanki `/p/…` sayfasına gidiyor. WhatsApp önizlemesi aynı (yönlendirmeyi izliyor; uçtan uca testte doğrulandı).
- **Kod içerikten türetiliyor** (uzun kimliğin SHA-256 özeti, base62). Aynı kombinasyon her seferinde aynı kodu alıyor, tekrar paylaşmak tabloya satır eklemiyor. Başka bir kombinasyonla çakışırsa (pratikte olmaz) 10 karakterlik kod veriliyor.
- **Uzun link hiç kaybolmuyor:** Paylaşım penceresi önce uzun linkle açılıyor, kısa link 2,5 sn içinde gelirse yerine geçiyor. Gelmezse uzun link kalıyor; her iki link de çalışıyor. Kioskta QR da kısalıyor (daha seyrek, daha kolay okunan bir QR).
- Yalnızca geçerli bir kombinasyon kaydediliyor (`shares` tablosu zaten vardı; migration gerekmedi). Kişisel veri yok.
- **Supabase'siz Vercel'de kısa link verilmiyor:** Bellekteki kayıt tek sunucu kopyasında kalır, link başka kopyada açılmayabilirdi. O durumda uzun link kullanılıyor.
- Numune talebiyle panele düşen "Seçimi aç" bağlantısı uzun `/p/…` olarak kalıyor (kendi kendine yeterli, veritabanına bağlı değil).

---

## Faz 2, iş 4: Showroom kiosk modu (4 Ekim 2026)

- **Açılış:** Herhangi bir konfigüratör adresinin sonuna `?kiosk` (ör. `/f/firma?kiosk`). Bekleme süresi varsayılan 90 sn; `?kiosk=120` gibi 30–600 sn verilebilir. Panelde firma sayfasında kiosk bağlantısı yazıyor. Ayrı bir kiosk uygulaması ya da hesap yok; bir tarayıcıyı tam ekran açmak yetiyor.
- **Karşılama ekranı:** Firma logosu, "Kumaşı koltuğun üstünde görün", firma renginde "Başlamak için dokunun". İlk dokunuşta tam ekrana geçiyor (tarayıcı izin verirse).
- **Sıfırlama:** Son dokunuştan sonra süre dolmadan 10 sn önce "Hâlâ burada mısınız?" sayacı; dokunulmazsa sayfa başlangıç adresine dönüyor. Sekme belleği (beğendiklerim, ziyaret numarası) siliniyor; açık pencereler ve yarım kalmış numune formu da gidiyor. Böylece bir sonraki kişi öncekinin seçimlerini ya da yazdığı telefonu görmüyor ve raporda yeni ziyaret sayılıyor. Sıfırlama sayfayı yeniden yükleyerek yapılıyor: en güvenilir temizlik bu.
- **"Telefona al":** Kioskta "Paylaş" yerine kombinasyonun QR'ı çıkıyor; ziyaretçi telefonuyla okutup evine götürüyor. WhatsApp, indirme ve yazdırma kioskta yok (ortak cihazda anlamsız).
- Uzun basınca açılan menü ve metin seçimi kapalı; çift dokunmayla yakınlaşma engelli.
- **Test:** Uçtan uca testte Playwright'ın saatiyle 30 sn'lik bekleme hızlandırılıp karşılama, QR, uyarı, "Devam et" ve sıfırlama (kumaş ve beğendiklerim başa dönüyor) doğrulanıyor.
- **Bilinen sınır:** Tarayıcının kendi tam ekran/kiosk ayarı (adres çubuğunu tamamen gizleme, ekran kararmasını kapatma) cihazdan yapılmalı; README'de kısa not var.

---

## Faz 2, iş 3: Firma ve model başına kumaş serisi (4 Ekim 2026)

- **Firma:** Panelde firma ayarlarında "Firma sayfasında gösterilecek ORMEN serileri". Seçilirse firma sayfasında (ve o sayfadan paylaşılan linkte) yalnızca o seriler var. Boşsa yayındaki bütün kumaşlar.
- **Model:** Her modelde (dosyadan ya da seçerek) "Bu modelde sunulan kumaş serileri" (ör. bir koltuk yalnızca bukle serileriyle). Konfigüratörde seçili parçanın modeline göre kumaş listesi değişiyor ve üstte "… bu serilerle sunuluyor" yazıyor. Yeni eklenen parça, seçili kumaş o modelde yoksa modelin varsayılan kumaşıyla, o da yoksa izinli ilk kumaşla geliyor. "Bu kumaşı tümüne uygula" yalnızca o kumaşı sunan parçalara uygulanıyor.
- **Seri düzeyinde, kumaş düzeyinde değil:** Plan `model_fabrics` (kumaş kumaş seçim) tablosu öngörüyordu. Firmaların "şu koleksiyonlar" diye düşündüğünü varsayıp seri seçtirdim: on kumaşı tek tek işaretlemekten hızlı, yeni renk eklenince kendiliğinden dahil oluyor. `model_fabrics` tablosu kullanılmıyor; kumaş kumaş seçim gerekirse oradan devam edilir.
- **Kırılmaz kural:** Kısıt hiçbir kumaşa uymuyorsa (seri gizlendi ya da kaldırıldı) liste boş kalmıyor, sayfanın bütün kumaşları gösteriliyor.
- Eski paylaşım linkleri kısıt yüzünden bozulmuyor: linkteki kumaş firma sayfasında yoksa o parça linkten düşüyor, sayfa açılıyor.
- **Veritabanı:** Üçüncü migration (`20261006000000_kumas_serisi.sql`): `firms.fabric_series`, `models.fabric_series` (boş liste = hepsi). Panelden gelen seri adları kayıtta katalogla karşılaştırılıp temizleniyor.

---

## Faz 2, iş 2: Modüler takımlar (U, şezlonglu, şezlonglu köşe) (4 Ekim 2026)

- **Plandan sapma:** Yol haritasında "sol kol, orta, köşe, şezlong modüllerini düğmelerle ekleme" vardı. Bunun yerine köşe takımını genelleştirdim: **sol uç** ve **sağ uç** ayrı ayrı Kol, Köşe ya da Şezlong olabiliyor; arka duvar boyu ve her ucun boyu giriliyor. Bununla düz kanepe hariç Türkiye'de yaygın bütün takımlar çıkıyor: L köşe (sağda/solda), U koltuk, şezlonglu kanepe, şezlonglu köşe takımı. Gerekçe: atölye modelini "kaç modül" diye değil "hangi şekil, kaç cm" diye tarif ediyor; altı düğme ve iki ölçü, modül modül dizmekten daha hızlı ve hatasız. Modül genişliklerini tek tek vermek gerekirse sonra eklenir.
- Panelde tip adı "Köşe / modüler takım"; seçime göre şeklin adı hemen yazıyor ("Şu an: U koltuk").
- Şezlong eni 90 cm, boyu 130–200 cm; köşe dönüşü 130–320 cm. Arkada en az bir oturum (60 cm) kalmazsa kayıt engelleniyor. Uç türü değişince boy o türe uygun bir değere çekiliyor (şezlong ~160, köşe 220).
- İlk sürümde kaydedilen tek köşeli tarif (`koseYonu`, `koseBoyCm`) okunurken yeni biçime çevriliyor; veritabanında değişiklik gerekmedi.
- Birim testi her şekil için dış ölçüyü ve kumaşın gerçek ölçüsünü kontrol ediyor.

---

## Faz 2, iş 1: Seçerek model oluşturma (parametrik koltuk ve köşe takımı) (4 Ekim 2026)

- **Varsayım:** REKABET-PLANI'nda "Faz 2'nin ilk işi parametrik koltuk ve köşe takımı olsun mu? Önerim: evet" diye sormuştum; Fatih Bey "Devam" dedi. Bunu bu öneriye onay sayıp başladım. Pilot firma seçimi hâlâ Fatih Bey'de.
- **Ne yapılıyor:** Panelde "Yeni model" artık iki yol sunuyor: "Seçerek oluştur" ve "3D dosya yükle". Seçerek: tip (ikili, üçlü, dörtlü kanepe, köşe takımı, berjer, puf), kol (ince, kalın, yuvarlak, kolsuz), sırt (alçak, orta, yüksek), ayak (ahşap konik, ince metal, gizli kaide), ölçüler; köşe takımında köşenin yönü ve yan duvar boyu. Sağda seçili ORMEN kumaşıyla canlı önizleme.
- **Nasıl çiziliyor:** Mevcut örnek kanepenin minder parçasıyla (UV'leri metre cinsinden). Köşe takımı üç modül: arka duvar boyunca düz bölüm, iki duvarı da sırtlı köşe karesi, yan duvar boyunca 90° döndürülmüş düz bölüm. Kumaş her parçada gerçek ölçüsünde; birim testi her tip için ölçüleri ve kumaş yoğunluğunu kontrol ediyor (minder kabarıklığı yüzeyi yaklaşık %1,6 uzatıyor, örnek kanepede de böyle).
- **Ölçü aralıkları** tipe göre sınırlı (ör. üçlü 180–270 cm, köşe takımı arka duvar 200–380 cm, yan duvar 150–320 cm). Oturma yüksekliği her tipte 44 cm, sırt yüksekliği 72/82/95 cm. Bu değerler gerçek ürün verisi değil, yaygın ölçülere göre benim seçimim; pilot firmalarla düzeltilmeli.
- **Panelde açık not:** "Bu model sizin seçimlerinizle kodla çizilir; gerçek ürünün birebir kopyası değil, kumaşı doğru ölçüde gösteren bir benzeridir." Müşteriye birebir ürün gibi sunulmasın diye.
- **Veritabanı:** İkinci migration (`20261005000000_secerek_modeller.sql`): `models.params` (jsonb) ve `procedural_key = 'parametric'`. Tarifi olmayan parametrik modeli kurallar reddediyor (PGlite'ta test edildi). Kayıtta tarif sunucuda yeniden doğrulanıyor.
- **Vitrine örnek köşe takımı** eklendi (`/?y=kose-takimi…`, 1-ornek-katalog.sql'de de var).
- **AR** parametrik modellerde de çalışıyor (aynı kod yolu).
- **Gerçek L/U şekli:** Köşe takımı yerleşimde birkaç dikdörtgen olarak hesaplanıyor: arka duvar boyunca uzanan bölüm, köşe ya da şezlong uçları (`paramFloorRects`, `lib/parametric/spec.ts`). L'nin içine konan sehpa ya da berjer "çakışma" uyarısı vermiyor, "Mobilya ekle" boş yer ararken L'nin içini de kullanabiliyor, plandaki boşluk ölçüleri parçaların kendisine kadar alınıyor ve teklif föyündeki plan L/U çizgisini çiziyor.
  - Duvara yaslama ve oda sınırı hâlâ dış kutuyla yapılıyor. Duvarlar düz olduğu için sonuç aynı.
  - L biçimli odanın kesik köşesinden kaçınma da dış kutuyla yapılıyor; bu temkinli tarafta kalıyor, çakışmaya yol açmıyor.
  - Bir birim testi, parçaların modelin gerçek 3D geometrisini (3 cm payla) kapsadığını denetliyor; çizim kodu ile yerleşim hesabı birbirinden kayarsa test kırılıyor.
  - Dosyayla yüklenen (GLB) modeller kutu olarak kalıyor; şekillerini bilmiyoruz.

---

## Son kalite turu (4 Ekim 2026)

- **Erişilebilirlik:** Bütün sayfa türleri axe-core ile WCAG 2 A/AA'ya göre tarandı. Tek ciddi sorun soluk gri yazı rengiydi (#7D7B75, kontrast 4,0:1). Renk #6B6963'e koyulaştırıldı; açık zeminlerin hepsinde 4,5:1'in üstünde. 3B sahne "görsel" olarak işaretliydi; içindeki mobilya araç çubuğunu ekran okuyuculardan gizliyordu, "grup" yapıldı. Tarama artık uçtan uca testin parçası (`tests/e2e/a11y.spec.ts`; yeni geliştirme paketi `axe-core`, gerekçe bu).
- **Küçük telefon:** 375 px genişlikte "Numune iste" düğmesi ekrandan taşıyordu. Küçük ekranda "Odamda gör" ve "Paylaş" yalnızca simgeyle gösteriliyor (ekran okuyucu için yazıları duruyor).
- **Güvenlik başlıkları:** Her sayfada `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (AR için yalnızca `xr-spatial-tracking` açık). Panel başka bir sitenin çerçevesinde açılamıyor. Herkese açık sayfalar (ana sayfa, firma sayfaları, paylaşım) çerçevede açılabiliyor: firmalar konfigüratörü kendi sitelerine gömebilsin diye, bilerek.
- **Numune formuna spam koruması:** Görünmeyen bir tuzak alanı. Botlar doldurursa başarılı cevabı alıyor ama hiçbir şey kaydedilmiyor. IP'ye dayalı sınırlama yapılmadı (IP tutmama kuralı).
- **Hız (üretim derlemesi, bu ortamda):** Konfigüratör sayfası yaklaşık 1,7 MB JavaScript (sıkıştırılmış yaklaşık 450 KB), çoğu three.js ve 3B kütüphaneleri. AR, QR ve model dışa aktarma kodu ilk yüklemeye girmiyor, gerektiğinde iniyor. Sahne bu ortamda (yazılımla çizim, ekran kartı yok) 4,5 sn'de hazır oluyor; gerçek bir bilgisayarda daha kısa olması beklenir ama ölçülmedi. REKABET-PLANI'ndaki "< 3 sn" hedefi gerçek cihazda ölçülmeli.

---

## Dilim 7: Kullanım kaydı, rapor, Faz 3 yeri (4 Ekim 2026)

- **Olaylar:** sayfa açıldı, kumaş denendi, oda değişti, AR açıldı (telefonda AR oturumu gerçekten başlayınca, düğmeye basınca değil), paylaşıldı, numune istendi. Tarayıcı `sendBeacon` ile gönderiyor; sayfa yavaşlamıyor, gönderilemezse sessizce vazgeçiliyor.
- **Kişisel veri yok:** IP, tarayıcı bilgisi, konum tutulmuyor; sunucu bunları istekten okumuyor bile. "Ziyaret" sayımı için sekme kapanınca silinen rastgele bir numara (`sessionStorage`) kullanılıyor; kimseyi tanımlamıyor. Cihaz yalnızca telefon/tablet/masaüstü. API bilinmeyen alanı ve türü kaydetmiyor.
- **Sayılmayanlar:** Panelde oturumu açık olan ORMEN çalışanları ve otomatik testler. Aynı şeyin 2 saniye içinde tekrarı tek sayılıyor.
- **Rapor (`/panel/rapor`):** Dönem (7/30/90 gün) ve sayfa (hepsi, ORMEN ana sayfası, tek firma) süzgeci. Özet kutuları, en çok denenen 10 kumaş, günlük ziyaret, firma tablosu. "Ziyaret başına deneme" ve "100 ziyarette numune" REKABET-PLANI'ndaki hedeflerle (5 ve 3) birlikte gösteriliyor. Günler İstanbul saatine göre.
- Rapor hesabı ilk sürümde uygulamada yapılıyordu (en fazla 50.000 olay); Faz 2'de veritabanına taşındı.
- **Faz 3 yeri:** `lib/ai/reupholster.ts` yalnızca arayüz ve "yakında" diyen sahte (mock) bir uygulama. Hiçbir servise istek atmıyor. Kumaş panelinin altında "Kendi koltuğunuzda görün · Yakında" kutusu var; tıklanmıyor.
- **Belgeler:** `YOL-HARITASI.md` (yayın öncesi yapılacaklar ve sonraki fazlar) ve `KUMAS-CEKIM-REHBERI.md` (ORMEN ekibi için kumaş çekimi) eklendi.

---

## Dilim 6: AR, "Odamda gör" (4 Ekim 2026)

- **Akış:** Üst çubukta "Odamda gör". Telefonda seçili parça, seçili kumaşıyla bir pencerede açılıyor; "Odamda gör"e dokununca telefonun AR'ı açılıyor (iPhone: Quick Look, Android: Chrome'un WebXR'ı, olmazsa Scene Viewer). Bilgisayarda QR çıkıyor; QR telefonda `/ar/…` sayfasını, aynı parça ve kumaşla açıyor. Firma sayfasından gelindiyse logo ve renk de taşınıyor.
- **Plandan sapma: AR dosyası sunucuda değil tarayıcıda üretiliyor.** Planda sunucuda `@gltf-transform` ile kumaşlı GLB derlemek vardı. Bunun yerine telefonda, ekrandaki modelin aynısı three.js ile GLB'ye çevriliyor. Gerekçe: sunucu tarafı ek paket, dosya önbelleği ve WebP→JPEG dönüştürme gerektiriyordu; tarayıcıda üretilen dosya ekranda görülenle birebir aynı ve sunucuya yük yok. Bedeli aşağıdaki Scene Viewer sınırı.
- **Kumaşın gerçek ölçüsü dosyanın içine "pişiriliyor":** Doku tekrarı, AR uygulamalarının farklı yorumlayabileceği doku dönüşümüyle değil, doğrudan UV koordinatlarına yazılıyor. iPhone'un USDZ'ye çevirmesi dahil her yolda aynı kalıyor. Birim testi ve uçtan uca testte dosyada doku dönüşümü olmadığı kontrol ediliyor.
- **Dosya boyutu:** Berjer yaklaşık 1,2 MB, kanepe 2,2 MB (1024 px JPEG dokular, indeksli geometri). İlk denemede 6,8 MB çıkmıştı; geometri gereksiz yere açılıyordu, düzeltildi. Aynı model+kumaş ziyaret boyunca bir kez üretiliyor.
- **Yeni paket: `@google/model-viewer` 4.3.1** (Apache-2.0). Quick Look, WebXR ve Scene Viewer'ı tek bileşende topluyor, iPhone için USDZ'yi kendisi üretiyor. Yalnızca "Odamda gör" açılınca yükleniyor. Paket three 0.183 istiyor, projede 0.186 var; `package.json`'daki `overrides` ile projenin three'sini kullanması sağlandı (tek three kopyası). Uçtan uca testte model-viewer bu sürümle modeli sorunsuz yüklüyor.
- **Bilinen sınır (Scene Viewer):** Google'ın Scene Viewer uygulaması dosyanın internette bir adresi olmasını istiyor; tarayıcıda üretilen dosyayı açamıyor. Android'de Chrome + ARCore varsa WebXR kullanılıyor ve sorun yok. WebXR olmayan tarayıcılarda (ör. Samsung Internet) AR açılmayabilir; o durumda ekranda açıklama çıkıyor ve model 3B olarak inceleniyor. Gerçek cihaz testinde sık görülürse sunucuda GLB üretimi eklenir.
- **Test edilemeyenler:** Bu ortamda gerçek iPhone ya da Android yok. Doğrulanan: doğru cihazda doğru yol, geçerli GLB, kumaş malzemesi, JPEG dokular, dosya boyutu, model-viewer'ın dosyayı yüklemesi. Doğrulanmayan: AR'ın gerçekten açılması, yere oturma, ölçünün gerçek boyuta uyması, iPhone'daki USDZ dönüşümü. README'de 5 dakikalık deneme listesi var.

---

## Dilim 5: Firma sayfaları, QR ve A6 kart (4 Ekim 2026)

- **Adresler:** `/f/<firma>` firmanın bütün modelleri, `/f/<firma>/<model>` tek model (ör. showroomdaki koltuğun üstüne konan QR için). Bilinmeyen ya da yayında olmayan firma 404.
- **Firma sayfasında ne görünüyor:** Önce firmaya özel yüklenen modeller, sonra firmanın panelde seçtiği ORMEN vitrin modelleri. İkisi de yoksa bütün vitrin. Firmaya özel modeller ORMEN ana sayfasında görünmüyor. Kumaşlar her zaman ORMEN kataloğunun tamamı (model başına kumaş kısıtı Faz 2'ye bırakıldı; `model_fabrics` tablosu hazır).
- **Marka:** Firma logosu sol üstte, firma rengi "Numune iste" düğmesinde ve vurgularda. Düğmedeki yazı rengi (beyaz ya da koyu) firma rengine göre kontrast hesabıyla seçiliyor. Panel, açık zeminde zor görünecek renklerde uyarıyor. "Kumaşlar: ORMEN TEKSTİL" imzası her firma sayfasında duruyor.
- **Paylaşım firmayı taşıyor:** Firma sayfasında üretilen `/p/…` linki firmanın adını içeriyor (`f`), açılınca aynı logo ve modellerle geliyor. Firma sonradan kapatılırsa link ORMEN görünümüyle açılmaya devam ediyor.
- **Numune talebi:** Firma sayfasından gelen talep panelde firma adıyla görünüyor; "WhatsApp'tan da gönder" firmanın numarasına gidiyor. Var olmayan firma adıyla gönderilen talep firmaya yazılmıyor.
- **QR:** Panelde SVG (matbaa için, vektör) ve 1200 px PNG. Sunucuda `qrcode` paketiyle üretiliyor; yalnızca `/f/...` adreslerine izin var. Adres `NEXT_PUBLIC_SITE_URL`'den alınıyor; bu değişken boşken panel "geçici adres, bastırmayın" uyarısı gösteriyor. **Gerçek alan adı bağlanmadan QR bastırılmamalı.**
- **A6 kart:** Logo, kısa çağrı, büyük QR, adres ve ORMEN imzası. Teklif föyü gibi tarayıcıdan "PDF olarak kaydet" ile tek sayfa A6 PDF çıkıyor (Chromium'da doğrulandı: 105 × 148 mm, 1 sayfa).
- **Logo:** PNG, JPEG ya da WebP, en fazla 2 MB. SVG kabul edilmiyor (betik taşıyabilir). Örnek firmanın logosu bizim çizdiğimiz bir yer tutucu.
- **Bağlantı adı değişirse** eski QR ve linkler çalışmaz; panel düzenlerken bunu uyarıyor. Yönlendirme (eski adı yeni adrese taşımak) yapılmadı.
- **Hata düzeltmesi:** Teklif föyünün yazdırma kuralı sayfadaki her şeyi gizliyordu; A6 kart boş çıkıyordu. Kural yalnızca föy yazdırılırken geçerli olacak şekilde daraltıldı.
- **Hata düzeltmesi:** Firma rengi düğmeye ulaşmıyordu (Tailwind renk değişkenleri sayfa kökünde çözülüyor). Değişkenler firma kapsayıcısında da tanımlanıyor; uçtan uca testte düğme rengi ölçülüyor.
- Supabase'de firmanın vitrin model listesi "sil ve yeniden yaz" ile kaydediliyor (iki adım, tek işlem değil). Aynı anda iki kişinin aynı firmayı düzenlemesi beklenmediği için kabul edildi.

---

## Dilim 4: Yönetim paneli (4 Ekim 2026)

- **Veri katmanı:** Supabase anahtarları tanımlıysa her şey Supabase'de (Postgres + Storage), değilse bellekteki örnek veriyle çalışıyor. Sayfalar hangisinin çalıştığını bilmiyor (`lib/data/`). Bellek modunda panelin üstünde sarı uyarı var: eklenenler sunucu yeniden başlayınca kaybolur. **Vercel'de panelin gerçekten kullanılması için Supabase şart.**
- **Şema:** `supabase/migrations/…_init.sql`. Her tabloda satır güvenliği (RLS) açık. Herkes yalnızca yayındaki kumaş/model/firmayı okuyabiliyor; numune talebi ve olaylara yalnızca ekleme yapabiliyor; okuma ve düzenleme yalnızca panel kullanıcısında. Şema ve kurallar testte gerçek bir Postgres'te (PGlite) çalıştırılıp deneniyor.
- **Örnek veri SQL olarak:** `supabase/veri/1-ornek-katalog.sql`, Supabase'in SQL ekranına yapıştırılıyor. Önce Node ile çalışan bir betik yazdım, sonra vazgeçtim: yazılımcı olmayan biri için kopyala-yapıştır daha kolay ve SQL dosyası testte iki kez çalıştırılıp denenebiliyor. Dosya `npm run seed:sql` ile örnek veriden üretiliyor.
- **Panel girişi:** Supabase Auth (e-posta + şifre). Kayıt ekranı yok; kullanıcıyı ORMEN Supabase'den ekliyor ve `profiles` tablosuna satır ekleyerek yetki veriyor. Profil satırı olmayan kullanıcı panele giremiyor. Supabase yokken tek bir deneme kullanıcısı (`PANEL_DEMO_EMAIL/PASSWORD`, imzalı çerez) var; geliştirme ortamında varsayılanı `demo@ormen.local / ormen-demo`, üretimde varsayılan yok.
- **Sunucu yetkisi:** Panel işlemleri önce oturumu kontrol ediyor, sonra sunucuda service role anahtarıyla yazıyor. Bu anahtar tarayıcıya hiç gitmiyor.
- **Dosya yükleme:** Fotoğraf ve modeller tarayıcıdan doğrudan Supabase Storage'a gidiyor (sunucunun verdiği tek kullanımlık imzalı adresle). Vercel'in 4,5 MB istek sınırına takılmamak için böyle. İzinli klasörler `kumaslar/`, `modeller/`, `logolar/`; SVG kabul edilmiyor (içinde betik taşıyabilir).
- **Kumaş fotoğrafı tarayıcıda işleniyor:** Ek yeri kontrolü (kenarlar birbirini tutuyor mu), istenirse kenar yumuşatma, renk fotoğrafından kabartı (normal) ve pürüzlülük haritası üretimi, 1k/2k boyutlar, küçük görsel, ortalama renk ve renk ailesi önerisi. Sunucuya ağır iş düşmüyor, ek paket gerekmedi. Üretilen haritalar `derived_maps = true` olarak işaretleniyor; ileride ayrı çekilmiş haritalar gelirse ayırt edilebilir.
- **Gerçek fotoğraf yüklenince "yer tutucu" işareti kalkıyor.** Yalnızca bilgileri düzenlemek dokuya ve bu işarete dokunmuyor.
- **Kumaş silinmiyor, gizleniyor.** Silme, geçmiş taleplerdeki ve paylaşım linklerindeki kodları anlamsız bırakırdı. Vitrinde en az bir model açık kalmak zorunda.
- **Teknik değerler uydurulmuyor:** Formda kompozisyon, gramaj, Martindale gibi alanlar boş bırakılabiliyor ve konfigüratörde boşsa hiç gösterilmiyor. Toplu ekleme şablonu da "bilmediğinizi boş bırakın" diyor.
- **Toplu ekleme:** CSV (Excel'in `;` ayraçlı Türkçe biçimi ve `,` ikisi de okunuyor) ve fotoğraflar. Fotoğraf, `fotograf` sütunundaki adla (boşsa kumaş koduyla, uzantıdan bağımsız) eşleşiyor. Zaten var olan kodlar atlanıyor: toplu ekleme yanlışlıkla mevcut kumaşın üstüne yazmasın diye. İşlem tarayıcıda satır satır yürüyor, sunucu zaman sınırına takılmıyor.
- **Model yükleme:** `.glb` dosyası tarayıcıda okunuyor (Draco sıkıştırmalı dosyalar da). Malzeme listesi, ölçüler ve üçgen sayısı çıkarılıyor. Adında "kumas/fabric/minder…" geçen malzemeler önceden işaretleniyor. Birim yanlışsa (mm/cm ile dışa aktarılmış) kayıt engelleniyor. 15 MB üstü ve 400 bin üçgen üstü için uyarı, 60 MB üstü ret. İşaretlenen malzemelerde UV ölçüsü parçadan parçaya %35'ten fazla değişiyorsa uyarı veriliyor; kumaşın gerçek ölçüde görünmesi buna bağlı.
- **Draco çözücüsü kendi sunucumuzdan:** `public/draco/` (three.js ile gelen Google Draco, Apache-2.0). drei varsayılan olarak Google'ın CDN'ini kullanıyordu; dış bağımlılığı kaldırdım.
- **Örnek puf modeli** (`tests/fixtures/ornek-puf.glb`) `scripts/generate-sample-glb.ts` ile kodla üretildi. Model yükleme testinde ve deneme için kullanılıyor; dışarıdan indirilmiş model yok.
- **Numune talepleri:** Panelde liste, telefon ve WhatsApp'tan yaz bağlantısı, CSV indirme (Excel uyumlu, Türkiye saati). Talepteki "seçimi aç" bağlantısı yalnızca kendi `/p/…` sayfalarımıza izin veriyor; başka adres ya da `javascript:` gelirse kaydedilmiyor.
- **Hata düzeltmesi:** Next.js geliştirme sunucusunda her rota kendi kod kopyasını yüklediği için `instanceof` kontrolleri yanlış sonuç veriyordu (yüklenen dosyalar 404 dönüyordu). Tür kontrolü addan yapılıyor.
- **Yeni paketler:** `@supabase/supabase-js` ve `@supabase/ssr` (veritabanı, dosya, oturum çerezleri), geliştirme için `@electric-sql/pglite` (şemayı testte gerçek Postgres'te denemek için).

### Planlanıp bu dilimde yapılmayanlar

- Triplanar yedek malzeme (UV'si bozuk modeller için): şimdilik yalnızca uyarı var.
- Panelde kumaş başına ΔE renk doğruluğu değeri: renk testi uçtan uca testte duruyor, panelde gösterilmiyor.
- Supabase'e karşı canlı deneme yapılamadı (bu ortamda Supabase projesi yok). Şema ve örnek veri PGlite'ta, panel akışları bellek modunda uçtan uca test edildi. İlk kurulumda bir tur elle deneme gerekiyor.

---

## Dilim 3: Paylaşım, numune talebi, teklif föyü (4 Ekim 2026)

- **Paylaşım bağlantısı veritabanı gerektirmiyor.** `/p/<kimlik>` içindeki kimlik; yerleşimin, odanın ve görünümün base64url ile kısaltılmış hali (`lib/share.ts`). Bu yüzden:
  - Link sonsuza kadar çalışıyor.
  - Vercel demosunda, yani Supabase yokken de çalışıyor.
  - Sunucuda hiçbir şey saklanmıyor.
  - Bedeli: link uzun (yaklaşık 120 karakter). WhatsApp'ta sorun değil. İleride `shares` tablosuyla kısa kimlik eklenebilir.
- **WhatsApp önizlemesi (Open Graph görseli)** sunucuda üretiliyor (`app/p/[id]/opengraph-image.tsx`). İçinde kumaş renkleri, büyük ORMEN kodları, mobilya adları ve "Kumaşlar: ORMEN TEKSTİL" imzası var. 3D sahnenin anlık görüntüsü sunucuda üretilemediği için önizlemede yer almıyor; o görüntü, paylaşılan görsel dosyasının kendisinde.
- **Paylaşım görseli** tarayıcıda oluşturuluyor (`lib/share-image.ts`). Sahnenin seçim işaretleri olmadan alınmış anlık görüntüsü, altında firma logosu (yoksa ORMEN), her kumaşın dokusu, büyük kodu ve hangi mobilyada olduğu bulunuyor, ayrıca renk uyarısı ve ORMEN imzası. Biçim JPEG, 1600 px genişlik.
- **Paylaşım penceresi:**
  - Cihaz paylaşım menüsü (Web Share API destekleniyorsa).
  - WhatsApp.
  - Bağlantıyı kopyala.
  - Görseli indir.
  - Föyü yazdır.
  
  Masaüstü öncelikli olduğu için pencere her zaman açılıyor; sistem menüsü varsa içinde ayrı bir düğme olarak çıkıyor.
- **Önizleme adresi:** `metadataBase` sırasıyla `NEXT_PUBLIC_SITE_URL`, Vercel'in üretim adresi, Vercel'in dağıtım adresi ve yerel adres arasından seçiliyor. Önceden henüz yayında olmayan alan adı sabit yazılıydı; Vercel demosunda WhatsApp önizlemesi boş çıkardı.
- **Teklif föyü (A4):**
  - Sayfa ekranda gizli, yalnızca yazdırırken görünüyor; tarayıcının "PDF olarak kaydet" seçeneği PDF'i üretiyor. Bu yolu seçtik çünkü sunucu tarafı PDF kütüphaneleri Türkçe karakter için ayrıca yazı tipi dosyası gömmeyi gerektiriyor; tarayıcı ise sitenin yazı tiplerini doğrudan kullanıyor.
  - İçerik: firma ya da ORMEN logosu, tarih, sahne görüntüsü, mobilya ve kumaş tablosu (yalnızca bilinen künye alanları), vektör kat planı (`PlanSvg`) ve kombinasyonu açan QR kod.
  - Doğrulama: Chromium'da PDF olarak üretilip kontrol edildi.
- **Numune talebi:**
  - Form alanları: ad, telefon, isteğe bağlı not, KVKK onayı. Formda kombinasyondaki kumaşlar listeleniyor ve seçili olan önceden işaretli geliyor.
  - Telefon, Türkiye biçimlerinde kabul edilip `+90…` biçimine çevriliyor.
  - Doğrulama, tarayıcı ve sunucuda aynı kuralları kullanıyor (`lib/samples.ts`). Sunucu bilinmeyen kumaş kodunu reddediyor.
  - Kayıtta IP ya da cihaz bilgisi tutulmuyor.
  - Gönderimden sonra "WhatsApp'tan da gönder" düğmesi çıkıyor: firma sayfasında firmanın numarasına, ana sayfada `NEXT_PUBLIC_ORMEN_WHATSAPP` numarasına hazır mesaj gidiyor. Numara tanımlı değilse düğme gizli.
  - Supabase bağlıyken talepler `sample_requests` tablosunda kalıcı; bağlı değilken bellekte (Dilim 4).
- **KVKK:** `/kvkk` sayfasındaki aydınlatma metni **taslak**. Yayından önce hukuk danışmanına onaylatılmalı; sayfada da böyle yazıyor.
- **Yeni paket:** `qrcode` (föydeki QR; panelde firma QR'ları için de kullanılacak). `pdf-lib` eklenmedi, tarayıcının yazdırma özelliği yetti.

---

## Dilim 2d: Yerleşim (mobilya ekle, taşı, döndür, çoğalt, kaldır) (4 Ekim 2026)

Fatih Bey'in isteği: koltuğu hareket ettirmek, mobilya eklemek. Bu karar, istem dosyasındaki "mobilya sürükleme yok" maddesini değiştiriyor.

- **Yerleşim modeli** (`lib/room/layout.ts`, saf ve test edilebilir): Her parçanın modeli, kumaşı, oda içindeki konumu (m) ve dönüşü (derece) var. Oda koordinatlarında arka duvarın iç yüzü z = 0'da. Önceden oda koltuğa göre konumlanıyordu; artık mobilyalar odaya göre konumlanıyor.
- **Mobilya ekle:** Araç çubuğundaki menüden ekleniyor. Yeni parça otomatik olarak boş bir yere konuyor; önce arka duvar boyunca ortaya yakın, sonra yan duvarlar, sonra odanın içi deneniyor. Yeni parça o an seçili kumaşı alıyor.
- **Seçim:** Mobilyaya tıklanınca seçiliyor. Zeminde altın renkli ince bir çerçeve çıkıyor. Mobilyanın üstünde küçük bir araç çubuğu beliriyor: ↺ 45°, ↻ 45°, Çoğalt, Kaldır. Planda bu çubuk mobilyayı örtmemesi için mobilyanın ötesine konuyor.
- **Taşıma:** Mobilya fareyle zemin üzerinde sürükleniyor; 3D'de ve planda aynı şekilde.
  - Sürükleme sırasında kamera dönmüyor.
  - Mobilya duvarların dışına çıkamıyor ve L odanın girintisinden dışarı itiliyor.
  - Duvara 10 cm'den yaklaşınca 3 cm boşlukla duvara yapışıyor (mıknatıs).
- **Çakışma:** Üst üste binen mobilyalar kırmızı kesikli çerçeveyle gösteriliyor ve panelde uyarı çıkıyor. Engellenmiyor, kullanıcı ayırıyor.
- **Kumaş:** Seçici, seçili parçaya uygulanıyor. Birden fazla parça varken "Bu kumaşı tümüne uygula" bağlantısı var. Karşılaştırma modu yalnızca seçili parçayı ikiye bölüyor; diğer parçalar iki tarafta da aynı görünüyor.
- **Plan ölçüleri:** Seçili parçanın kapladığı alan ve dört yandaki boşluğu gösteriliyor. Boşluk en yakın engele, yani duvara ya da başka mobilyaya kadar ölçülüyor. 45° dönmüş parçada genişlik ve derinlik, parçanın zeminde kapladığı dikdörtgenin ölçüsü.
- **Bağlantı:** `?y=moduler-kanepe.LUMA-02.0.51.0_berjer.SIENA-03.40.240.45` biçiminde. Sırasıyla model, kumaş, x (cm), z (cm) ve dönüş (°); parçalar "_" ile ayrılıyor. Eski `?m=` ve `?k=` bağlantıları da açılıyor. Tarayıcılar adres güncellemesini sınırladığı için bağlantı her sürükleme adımında değil, 350 ms sonra yazılıyor. En fazla 12 parça.
- **Gölgeler:** Her parçanın kendi zemin gölgesi var ve parçayla birlikte taşınıyor. Anahtar ışığın gölge haritası yerleşim değiştikçe yeniden çiziliyor.
- **Bilerek yapılmayanlar:** Serbest açıyla döndürme tutamacı (45° adım yeterli görüldü), mobilyaların birbirine yapışması, geri al/ileri al, sehpa ve halı gibi kumaşsız aksesuarlar. Faz 2'de parametrik koltuk ve köşe takımı modülleriyle birlikte ele alınabilir.

---

## Dilim 2c: 2D plan görünümü ve rekabet planı (4 Ekim 2026)

Fatih Bey'in isteği: "3D ve 2D ayrımı olsun", ve ORMEN Atelier, EasternGraphics'in (pCon) Türkiye'deki rakibi olarak konumlansın. Strateji `REKABET-PLANI.md` dosyasında.

- **3B / Plan düğmesi** sahne araç çubuğunda. Plan, tepeden ve perspektifsiz bir görünüm. Bir mimari çizim gibi okunuyor:
  - Duvar kesitleri koyu antrasit (mimari "poşe").
  - Oda iç ölçüleri duvarların dışında, koltuğun genişliği ve derinliği koltuğun yanında yazılı.
  - Koltuktan sol ve sağ duvarlara mesafe ile koltuğun önündeki boşluk kesikli çizgilerle gösteriliyor.
  - 1 metrelik ölçek çubuğu var.
  - Plan modunda fareyle kaydırılabiliyor ve tekerlekle yakınlaştırılabiliyor; döndürme kapalı.
- **Teknik:** Plan, ayrı bir dik izdüşüm (orthographic) kamerayı geçici olarak varsayılan kamera yapıyor. 3D kamera ve onun yörünge kontrolü hiç değişmiyor; plandan çıkınca aynı 3D görünüme dönülüyor. Etiketler ve karşılaştırma sürgüsü plan modunda da çalışıyor.
- **Geçiş:** 160 ms'lik bir solma kamera değişimini gizliyor. Plan durumu adrese yazılıyor (`?g=plan`), paylaşılan link planla açılabiliyor.
- **Duvar köşeleri:** Duvarlar dış köşelerde uzatılarak birleşiyor, L odanın iç köşesinde uzatılmıyor. Önceki sürümde iç köşede duvar oda içine 12 cm taşıyordu; bunu bir test denetliyor.
- **Duvar üst kapakları** 3D'de de koyu görünüyor (maket kesiti). Bu bilerek yapıldı.
- Plan yalnızca bakmak ve ölçmek için. Mobilya sürükleme, kapı ve pencere yok (bkz. `REKABET-PLANI.md`, "Bilerek yapmadıklarımız").

---

## Dilim 2b: Ölçüler, yakından bak, karşılaştır, beğendiklerim, renk testi (4 Ekim 2026)

- **Ölçü göstergesi:** Ölçüler modelin gerçek sınır kutusundan okunuyor; veritabanındaki elle girilmiş değerden değil. Böylece yüklenen her GLB'de ekranda görünen ölçü modelin kendisiyle tutarlı. Örnek kanepe ve berjerin kayıtlı ölçüleri de ölçülen geometriye göre düzeltildi (238×96×85 ve 81×84×94 cm). Bir test, ikisinin 1 cm'den fazla ayrışmamasını denetliyor.
- **Yakından bak:** Kamera, koltuğun üstünden oturma yüzeyine bir ışın gönderip çarptığı noktaya 42 cm mesafeye yaklaşıyor. Hiçbir modele özel ayar gerektirmiyor. Bu modda yakınlaşma sınırı 18 cm ile 1,2 m arasında. "Uzaklaş" kullanıcının seçtiği açıyı koruyarak genel görünüme dönüyor.
- **Karşılaştır:** İkinci bir koltuk kopyası ayrı bir çizim katmanında duruyor. Ekran sürgünün solunda birinci, sağında ikinci kumaşla iki kez çiziliyor. Oda, ışık ve gölge iki tarafta ortak, böylece karşılaştırma adil. Sürgü fareyle sürüklenebiliyor ve klavyede ok tuşlarıyla kaydırılabiliyor. Paneldeki "Sol" ve "Sağ" kutularından hangisi seçiliyse dokunulan kumaş o tarafa atanıyor. Karşılaştırma açıkken çizim iki katı iş yapıyor; telefonda bu modun akıcılığı ölçülmedi.
- **Beğendiklerim:** Kalp düğmesiyle tutuluyor. Liste `sessionStorage`'da, yani sekme kapanınca siliniyor ("oturum boyunca"). En fazla 24 kumaş. Sunucuya hiçbir şey gönderilmiyor.
- **Renk doğruluğu testi** (`tests/e2e/colour.spec.ts`): Kumaş nötr stüdyoda yakın planda çizdiriliyor. Ekranın ortasındaki ortalama renk, dokunun ortalama rengiyle CIEDE2000 (ΔE00) ölçüsüyle karşılaştırılıyor. Son ölçümler:

  | Kumaş | Doku | Ekran | ΔE00 | Açıklık farkı | Ton ve doygunluk |
  |---|---|---|---|---|---|
  | LUMA-01 Kırık Beyaz | #E6DFD1 | #E9E2D4 | 0,67 | +1,06 | 0,01 |
  | SIENA-03 Zeytin | #6B6A45 | #6D6C3D | 2,72 | +0,64 | 2,66 |
  | SIENA-05 Kiremit | #A3583A | #AC562D | 3,39 | +0,73 | 3,32 |
  | PIETRA-05 Bordo | #6B2B2F | #77282D | 3,07 | +1,56 | 2,83 |
  | VERSO-05 Antrasit | #3A3937 | #2F2D2A | 3,91 | −5,43 | 0,87 |

  Okuma: ΔE00 2'nin altı neredeyse fark edilmez, 2-5 arası yan yana konunca fark edilir. Doygun renklerde (zeytin, kiremit, bordo) hafif bir doygunluk artışı var. Bu artış ton eşleme ve sheen katmanından geliyor. Koyu antrasit ise biraz daha koyu çıkıyor. Test, ton ve doygunluk kaymasının 4'ü, toplam farkın 6'yı geçmemesini şart koşuyor. Ölçüm yazılımsal grafik çiziciyle (SwiftShader) yapıldı; gerçek ekranlar ayrıca kendi renk sapmalarını ekler. Ekrandaki "numune isteyin" uyarısı bu yüzden önemli.

---

## Kapsam değişikliği: oda şekli ve ölçü (4 Ekim 2026)

Fatih Bey, Saloni'nin oda planlayıcısının ekran görüntülerini paylaştıktan sonra iki karar verdi:

1. **"Telefon önemli değil, internet sitemizde rahatça çalışsın yeter."** Tasarım önceliği masaüstü. Telefon düzeni çalışır halde kalıyor ama ince ayar masaüstü için yapılıyor. AR doğası gereği telefon özelliği olduğu için plandaki yerinde, daha düşük öncelikle duruyor.
2. **"Oda şekli ve ölçü girme olsun."** Bu karar, istem dosyasındaki "serbest oda çizim aracı yapma" maddesini kısmen değiştiriyor. Bu kararla:
   - Uygulananlar:
     - Dört oda şekli: duvarsız, dikdörtgen, L biçimli, köşe (iki duvar).
     - Genişlik, derinlik ve tavan ölçüsü (cm).
     - Yedi duvar rengi, dört zemin.
     - Üç hazır sahne başlangıç noktası olarak duruyor: nötr stüdyo, açık modern salon, koyu ve sıcak salon. İstemdeki hazır sahne şartı bunlarla karşılanıyor.
   - Bilerek yapılmayanlar:
     - Serbest duvar çizimi.
     - Kat planı yükleme.
     - Mobilya sürükleme, kopyalama ve silme.
     - T ve U biçimli odalar.
     
     Bunlar Faz 2'de ele alınabilir.

Ayrıntılar:
- Koltuk her zaman arka duvara (iç yüzeye 4 cm mesafeyle) ve yatayda ortaya yerleşiyor. L biçimli odada girinti ön sağ köşede ve girinti oranı sabit (%42).
- Koltuk odaya sığmıyorsa (iki yanda 10 cm, önde 40 cm boşluk yoksa) panelde uyarı çıkıyor, oda yine çiziliyor.
- **Maket görünümü:** Kameranın dış tarafında kaldığı duvar otomatik gizleniyor; oda her zaman içeriden görülüyor.
- **Duvar rengi** dekor olduğu için hafif öz ışıkla (emissive %32) çiziliyor. Böylece kırık beyaz duvar gri görünmüyor. Kumaşı aydınlatan ışık hiçbir sahnede değişmiyor; yalnızca ortam ışığının şiddeti hazır sahneye göre %90-100 arasında oynuyor. Koyu salonun "sıcaklığı" ışık renginden değil, duvar ve zemin renginden geliyor.
- Oda bilgisi adrese okunabilir biçimde yazılıyor: `?oda=dikdortgen.520x440x280.kirik-beyaz.acik-mese` ya da hazır sahne için `?oda=koyu-salon`. Paylaşım dilimi bunu kullanacak.
- Ölçü kutuları yazarken değil, Enter'a basınca ya da kutudan çıkınca uygulanıyor. Böylece "450" yazarken oda önce "4" ölçüsüyle kurulmuyor.
- Zemin dokuları (`scripts/generate-floors.ts`) kodla üretildi: 18 cm tahtalı meşe ve ceviz parke, mikro beton, 60×60 traverten.

---

## Fatih Bey'in cevapları (3 Ekim 2026)

| Soru | Cevap | Sonucu |
|---|---|---|
| Alan adı | `atelier.ormentekstil.com.tr` | `NEXT_PUBLIC_SITE_URL` varsayılanı bu adres. QR kodları bu adrese göre üretilecek. |
| Supabase | Ayrı proje | İç yazılımlardan bağımsız yeni bir Supabase projesi kurulacak. |
| ORMEN logosu ve WhatsApp | "Örnek yap şimdilik" | Yazıdan oluşan sade bir logo kullanılıyor: Fraunces yazı tipiyle "ORMEN" ve altında "ATELİER". ORMEN WhatsApp numarası yer tutucu olarak boş; panelden girilebilecek. |
| Numuneyi kim ulaştırıyor | Soru anlaşılmadı, sadeleştirilip tekrar soruldu | **Varsayım:** Talep her durumda panele düşer. Firma sayfasında WhatsApp mesajı firmaya, ana sayfada ORMEN'e gider. |
| Mevcut kumaş listesi | Görsel ve içerik yok | Toplu yükleme şablonu kendi sütun düzenimizle hazırlanacak. Örnek kumaşların teknik alanları boş bırakıldı. |

---

## Dilim 1: Dönen koltuk ve kumaş değiştirme

### Teknik kararlar

- **Next.js 16 (App Router) ve React 19.2.** `create-next-app` ile kuruldu. Next 16'da `params` ve `searchParams` asenkron; `PageProps`/`LayoutProps` tipleri `next typegen` ile üretiliyor.
- **Ton eşleme: `NeutralToneMapping`.** Khronos'un "PBR Neutral" eğrisi, ürün renklerini korumak için tasarlandı. ACES ise doygunluğu düşürüp tonu kaydırıyor. Pozlama 1,0'da sabit.
- **Renk uzayları:** Renk haritası `SRGBColorSpace`, normal ve pürüzlülük haritaları `NoColorSpace` (lineer). Yer alan: `lib/three/fabric-material.ts`.
- **Malzeme:** `MeshPhysicalMaterial`. Rengin tamamı dokudan gelir (`color = beyaz`), böylece önizleme, fotoğraf ve render aynı kaynaktan beslenir. Kumaş tipine göre ayar setleri `lib/fabric/presets.ts` dosyasında.
- **Işık yalnızca nötr beyaz.** Ortam ışığı kodla üretilen "Lightformer" panelleriyle kuruldu (HDRI dosyası yok). Anahtar ışık beyaz bir yön ışığı. Sahneler ileride yalnızca ışığın şiddetini ve yönünü değiştirecek, rengini değil.
- **Gerçek ölçek:** Her kumaş parçası için "UV yoğunluğu" (1 UV biriminin kaç cm yüzeye denk geldiği) geometriden ölçülüyor, tekrar = UV yoğunluğu / doku tekrar ölçüsü (cm). Bu sayede rastgele bir GLB'de de doğru ölçek elde ediliyor. Yer alan: `lib/fabric/scale.ts`, test: `tests/unit/scale.test.ts`.
- **Kodla üretilen koltuklar** (`lib/three/procedural/`): Yuvarlatılmış ve bombeli "minder" parçalarından oluşuyor. UV'ler köşe yaylarında yay uzunluğuyla açılıyor (1 UV = 1 m); kumaş kenarlardan dönerken ölçek bozulmuyor. Kodla üretilen koltuk ile yüklenen GLB aynı kumaş sistemini kullanıyor: malzeme adı `kumas` olan her parça kumaşı alıyor.
- **Kumaş geçişi:** Yeni doku tamamen yüklenene kadar eski kumaş ekranda kalıyor. Sonra aynı geometrinin üstünde saydam bir kopya 0,32 saniyede belirip asıl malzemenin yerine geçiyor. Hızlı art arda seçimlerde yalnızca son seçim uygulanıyor. İlk açılışta model, kumaşı giydirilmeden önce gizli; gri koltuk hiç görünmüyor. Yer alan: `lib/three/fabric-dresser.ts`.
- **Doku boyutu:** Büyük ekran ve fare kullanılan cihazda 2K, diğerlerinde (telefon, tablet) 1K.
- **Çizim yalnızca gerektiğinde** (`frameloop="demand"`): Sahne yalnızca hareket, geçiş ya da değişiklik olduğunda çiziliyor. Bu, telefonda pil ve ısı için önemli.
- **Gölgeler:**
  - Zemin gölgesi model başına bir kez hesaplanıyor (`lib/three/ground-shadow.ts`). drei'nin `ContactShadows` bileşeni three 0.186 ile boş çizdiği için kendi küçük uygulamamızı yazdık.
  - Anahtar ışığın gölge haritası yalnızca model ya da kumaş değişince yeniden çiziliyor (`autoUpdate: false`). Işık sahneye sabit olduğu için koltuğu döndürmek ek maliyet getirmiyor.
- **Açılış dönüşü:** İstemde "yarım tur" isteniyordu. Tam 180° dönüş koltuğun arkasında biteceği için dönüşü yan görünümden (−100°) ön-sağ 3/4 görünüme (+29°), yani yaklaşık 130°'lik bir yay olarak kurduk. Kullanıcı sahneye dokunduğu an dönüş kesiliyor. Sistemde "hareketi azalt" açıksa dönüş hiç oynatılmıyor.
- **Kamera sınırları:** Kamera yerin altına inmiyor (kutup açısı ufkun 3,4° üstünde sınırlı), modelin sınır küresine girmiyor ve kaydırma (pan) kapalı.
- **Arama Türkçe karakterlere duyarsız:** "lacıvert", "LACİVERT" ve "lacivert" aynı sonucu veriyor. Yer alan: `foldTr()` (`lib/i18n/tr.ts`).
- **Kumaş bağlantısı:** Seçilen kumaş adres çubuğuna `?k=SIENA-04` olarak yazılıyor; model ise `?m=berjer`. `replaceState` kullanılıyor, böylece geri tuşu kumaş kumaş geri gitmiyor.
- **Klavye:** Kumaş seçici bir `radiogroup`; ok tuşları, Home ve End ile geziliyor. Sekme tuşuyla tek bir durak var (roving tabindex).
- **Veri katmanı:** Tek bir `Repository` arayüzü var. Supabase anahtarları yokken bellek içi örnek veriyle çalışıyor. Supabase uygulaması panel diliminde eklenecek.

### Paketler ve gerekçeleri

| Paket | Neden |
|---|---|
| `three`, `@react-three/fiber`, `@react-three/drei` | İstemde belirtilen 3D yığını. drei'den yalnızca `OrbitControls`, `Environment`, `Lightformer` ve `useGLTF` kullanılıyor. |
| `server-only` | Veri katmanının yanlışlıkla tarayıcı koduna girmesini derleme anında engeller. |
| `sharp` (geliştirme) | Örnek kumaş dokularının WebP olarak üretilmesi. Panel diliminde yüklenen fotoğrafları boyutlandırmak için çalışma zamanı bağımlılığına taşınacak. |
| `tsx` (geliştirme) | TypeScript betiklerini (doku üretimi, seed) doğrudan çalıştırmak. |
| `vitest`, `@playwright/test` (geliştirme) | İstemde istenen birim ve uçtan uca testler. |
| `@types/node@22` | Vitest 5, Node 22+ tiplerini istiyor. Proje Node 22 ile çalışıyor. |

Kaldırılanlar: `zod` (henüz kullanılmadığı için; form dilimine kadar eklenmeyecek).

### Bilinen sınırlar ve test edilemeyenler

- **Kadife ve şönil:** Gerçek hav yönü (tüyün yatışına göre renk değişimi) simüle edilmiyor. `sheen` ve düşük normal şiddetiyle "yumuşak parlaklık" veriliyor; yakından bakınca gerçeği kadar inandırıcı olmayacak. Örnek veride kadife ve şönil yok; gerçek çekimlerle ayar yapılması gerekecek.
- **Örnek dokular gerçek kumaş değil.** Bukle, dokuma, nubuk ve balıksırtı kodla, milimetre ölçüsünde üretildi. Panelde "yer tutucu" olarak etiketlenecek.
- **Performans testi yalnızca yazılımsal grafikle yapıldı** (sunucuda GPU yok). Orta sınıf Android'de akıcılık gerçek cihazda ölçülmedi. Mimari kararlar (1K doku, talep üzerine çizim, gölgenin bir kez hesaplanması) bunu hedefliyor.
- Konsolda `THREE.Clock` kullanım dışı uyarısı görünüyor. Bu uyarı bizim kodumuzdan değil, `@react-three/fiber` 9.8'in içinden geliyor; hata değil.

## Pilot hazırlığı: ziyaret kaynağı ve etiket (5 Ekim toplantısı, 2. madde)

- **Ne:** Her olay, ziyaretin geldiği yeri sabit bir listeden taşıyor: `kiosk`, `qr`, `paylasim`, `site`, `dogrudan`. Varsa ORMEN'in bağlantıya koyduğu bir şube/kampanya etiketi de ekleniyor (`?e=ankara-1`). Rapor bu ikisine göre ziyaret ve numune sayısı veriyor. 30 ziyaretin altında oran gösterilmiyor.
- **Nasıl belirleniyor (`lib/source.ts`):** Ziyaretçinin girdiği adrese bakılıyor, ziyaretçinin kendisine değil.
  - `?kiosk` kiosk, `?q` basılı QR demek. Panel QR'ları ve A6 kartı bu işareti kendileri ekliyor.
  - `/p/…` paylaşım sayılıyor.
  - Önceki sayfa başka bir siteyse "site" yazılıyor; o sitenin hangisi olduğu saklanmıyor.
  - Bunların hiçbiri yoksa "doğrudan" sayılıyor.
  - Kaynak, ziyaretin ilk sayfasında okunuyor ve sekme kapanana kadar `sessionStorage`'da tutuluyor. Konfigüratör adres çubuğunu sonradan değiştirse de ziyaretin kaynağı kaybolmuyor.
- **Neden şube, kişi değil:** Satış elemanı numarası istendi (Selin). Ancak "eleman 3" firma için belli bir kişi demek; bu, çalışan performans takibi olur ve ayrı aydınlatma gerektirir (Hakan). Bu yüzden etiket serbest bir sabit değer olarak bırakıldı ve panelde "kişi adı yazmayın" uyarısı konuldu. Eleman bazında takip istenirse avukata sorulacak.
- **Etiket biçimi:** Küçük harf, rakam ve tire; en fazla 32 karakter. Panelde yazılan "Ankara Şube 1" kendiliğinden `ankara-sube-1` olur. Veritabanı da aynı kuralı denetliyor.
- **`ar_acilamadi` olayı:** Telefonda AR başlamadığında yazılıyor. Bu iki durumda oluyor: cihaz ya da tarayıcı AR'ı desteklemiyor, ya da oturum hata veriyor. Raporda AR kutusunda görünüyor. Faz 2 madde 6 (sunucuda GLB) bu sayıya göre yapılacak.
- **Veritabanı:** `20261009000000_ziyaret_kaynaklari.sql` dosyası `events` tablosuna `source` ve `tag` sütunlarını ekliyor, olay türü listesini genişletiyor ve `atelier_report` fonksiyonuna iki yeni döküm ekliyor. Daha önceki olaylar raporda "Kayıt yok" olarak görünüyor. SQL raporun uygulamadaki hesapla aynı sonucu verdiği PGlite testinde kaynak ve etiketle birlikte denetleniyor.
- **Renk ibaresi (1. madde):** Ekranda, paylaşım görselinde, teklif föyünde ve AR sayfasında artık "renkler bağlayıcı değildir; renk onayı numuneyle verilir" yazıyor.

## Pilot hazırlığı: cihaza göre görüntü kalitesi (3. madde)

- **Başlangıç seviyesi (`lib/three/quality.ts`):** Tarayıcının bildirdiği bilgilere göre seçiliyor: ekran ve fare, işlemci çekirdeği, bellek.
  - Telefonlarda en yüksek piksel oranı 1,5.
  - Zayıf telefonlarda (≤ 4 çekirdek ya da ≤ 3 GB bellek) piksel oranı 1,25 ve gölge haritası 1024.
  - Masaüstünde değişiklik yok.
- **Yavaşlayınca düşürme:** Sahne yalnızca gerektiğinde çiziliyor. Bu yüzden ölçüm yalnızca art arda gelen karelerde yapılıyor (açılış dönüşü, sürükleme); 0,2 sn'den uzun aralar bekleme sayılıyor. 30 karenin ortancası ~30 kare/sn'nin altına düşerse piksel oranı 0,25 azaltılıyor, en az 1'e kadar. Oran hiç geri artırılmıyor, böylece görüntü "nefes almıyor".
- **Neden drei'nin `PerformanceMonitor`'ı değil:** O bileşen sürekli çizim varsayıyor. İsteğe bağlı çizimde iki kare arasındaki bekleme süresini yavaşlık sanıp kaliteyi gereksiz yere düşürürdü.
- **Ölçülmedi:** Gerçek orta sınıf Android'de denenmedi (sunucuda GPU yok). Eşikler gerçek cihaz testinde (toplantı M5) ayarlanacak.
- **Test notu:** Playwright, `sendBeacon` ile giden isteğin gövdesini okuyamıyor. Rapor testinde `sendBeacon` kapatılıyor; sayfa `fetch` yedeğini kullanıyor ve gönderilen olayın içeriği (kaynak, etiket, IP olmaması) böylece gerçekten denetleniyor.

## Kesim masası, 1–2. adım: numune formu ve "yakında" vitrini (2. toplantı)

- **"Not" alanı kalktı.** Toplantıda 9 oyun 9'u bu yöndeydi; Fatih Bey kararı toplantıya bırakmıştı.
  - **Neden:** Serbest metne adres ya da TC kimlik no yazılabilir. Brief'te ise tek kişisel veri ad ve telefon.
  - **Yerine üç seçmeli soru geldi.** Hepsi isteğe bağlı:
    - Ne için: yeni koltuk / yeniden döşeme
    - Kaç parça: tek parça / takım
    - Ne zaman: 1 ay içinde / araştırıyorum

    Bu sorular kişisel veri taşımıyor ve geri arayan satış elemanına notun verdiğinden daha düzenli bilgi veriyor (Selin, Zeynep, Ece).
  - **Sunucu tarafı:** `validateSample` bilinmeyen alanları atıyor. Eski bir tarayıcı sekmesi hâlâ `note` gönderse bile kaydedilmiyor.
  - **Veritabanı:** `20261010000000_kesim_masasi.sql` dosyası `note` sütununu siliyor, seçenekleri sabit listeyle denetliyor. Aynı dosya bir sonraki adım için şunları da hazırlıyor:
    - talep adımları (yeni → hazırlanıyor → mağazaya gönderildi → siparişe döndü / dönmedi),
    - numune kodu,
    - lot,
    - adım tarihi.
  - **KVKK metni** buna göre güncellendi: "Formda serbest metin alanı yoktur." Avukat onayı hâlâ bekliyor.
- **"Kendi koltuğunuzda görün: yakında" kartı ekrandan kalktı.**
  - **Neden:** Brief gerçek yapay zekâyı yasaklıyor. Bu kart tutamayacağımız bir söz vermiş oluyordu. Defne: "Her 'yakında', markadan küçük bir yalan."
  - `lib/ai/reupholster.ts` arayüzü Faz 3 için duruyor, ama ekranda gösterilmiyor.

## Kesim masası, 3. adım: talep adımları, numune etiketi, `/n/<kod>` (2. toplantı)

- **Adımlar:** yeni → hazırlanıyor → mağazaya gönderildi → siparişe döndü / dönmedi. Numuneyi ORMEN keser ve firmanın mağazasına gönderir; bu karar 9 oyun 9'uyla alındı. Müşterinin adresi hiç alınmıyor, böylece brief değişmiyor.
- **Numune kodu:** `N-` ve ardından 6 karakter. Karakterler, birbirine karışmasın diye I ve O'suz 34 harf ve rakamdan rastgele seçiliyor. Kod talep kaydedilirken veriliyor. Supabase'de benzersiz; nadir bir çakışmada yeniden çekiliyor.
- **Etiket (`/panel/etiket/<id>`):**
  - 100 × 70 mm, siyah beyaz, kumaş başına bir tane.
  - Üzerinde: kumaş kodu, seri ve renk, lot (girildiyse) ya da elle yazılacak kutu, numune kodu ve tarih, `/n/<kod>`'u açan QR.
  - Müşteri bilgisi yok. Kerem'in "kâğıtta yanlış renk basmayalım" uyarısı yüzünden renkli kumaş görseli de konmadı.
- **Lot elle giriliyor.** Hakan'ın önerisi: iki hafta sonra kaç talebe lot yazıldığı sayılacak. Depo yazmıyorsa lot kilidi fikri kod yazılmadan bırakılacak.
- **`/n/<kod>` sayfası herkese açık; bu bilerek seçildi.**
  - **Gösterdikleri:** yalnızca numune, lot, mağaza adı, tarih ve adım. Arama motorlarına kapalı.
  - **"Bu numuneyle sipariş verildi" düğmesi:** Talebi "siparişe döndü"ye taşıyor, ama yalnızca talep henüz kapanmamışsa. Siparişe dönüş böylece müşterinin telefonu olmadan, numune koduyla ölçülüyor.
  - **Neden giriş yok:** Kodu yalnızca etiketi elinde tutan biliyor; tahmin edilmesi pratikte imkânsız (34⁶ ≈ 1,5 milyar). Yanlış basılırsa ORMEN panelden geri alıyor. Firewall hız sınırına `/n/` de eklendi.
  - **Aynı sayfadaki "ORMEN'e metraj ve lot için yaz" bağlantısı:** ORMEN'in WhatsApp'ına hazır mesaj açıyor (numune, kumaş, lot, mağaza). Bu, 8. maddenin ("ORMEN'e ön bildirim") ilk hâli. "24 saatte teyit" sözü sayfaya yazılmadı; bu bir operasyon kararı ve Fatih Bey onaylamadı.
- **Teknik not:** Panelde talep kartını her kayıttan sonra `key` ile baştan kurmak, React'te bekleyen işlemin bitmemiş görünmesine yol açtı ve "Kaydet" düğmesi kilitli kaldı. Kart artık yalnızca talep kimliğiyle anahtarlanıyor.

## Kesim masası, 4. adım: kumaşta desen ve kesim yönü

- **Yeni alanlar:**
  - desen: düz / desenli,
  - desenliyse rapor ölçüsü (en × boy, cm),
  - kesim yönü: tek yön (hav ya da desen bir yöne yatıyor, parçalar ters çevrilemez) / çift yön.
- **Neden üç ayrı değer:** Hepsinin "bilinmiyor" hâli var. "Düz" ile "girilmemiş" aynı şey değil: düz kumaşta metraj verilebilir, girilmemişte verilmez (Rıza Usta: "teknik föyde desen tekrarı yoksa hesap yapılmayacak").
- **Örnek veri:** Örnek kumaşlarda bu alanlar bilerek boş. Gerçek değer teknik föyden girilecek.
- **Doğrulama:**
  - Panel, desenli işaretlenmiş bir kumaşta rapor ölçüsünü zorunlu tutuyor.
  - Veritabanı, desensiz bir kumaşa rapor ölçüsü girilmesini reddediyor.
  - Toplu aktarımda "düz/desensiz/desenli" ve "tek/çift (yön)" yazımlarının hepsi kabul ediliyor; anlaşılmayan yazım "bilinmiyor" sayılıyor.
- **Künye:** Değerler girildiyse künyede görünüyor ("Desenli, rapor 32 × 28 cm", "Tek yön").
- **Tek tablo dosyası:** Kesim masasının bütün veritabanı değişiklikleri tek dosyada toplandı: `20261010000000_kesim_masasi.sql`. Önceki adı `…_sample_flow.sql` idi. Bu dosya henüz hiçbir veritabanında çalıştırılmadığı için yeniden adlandırmak güvenli; Fatih Bey'in kurulumda çalıştıracağı dosya sayısı da artmamış oldu.

## Kesim masası, 5. adım: firmanın kendi metrajı (`lib/metraj.ts`)

- **Ne:** Panelde her modele isteğe bağlı iki değer giriliyor:
  - "bir adet için kumaş (m)",
  - "hangi kumaş eninde (cm)".

  Bu sayı firmanın ustasının sayısı, biz hesaplamıyoruz. Toplantıda Selin önerdi, Mert ve Rıza Usta destekledi.
- **Sayı yalnızca birebir aynı durumda tekrarlanıyor:** kumaşın eni aynı olmalı, kumaş düz ve çift yönlü olmalı.
- **Öteki her durumda sayı yok, yalnızca neden yazıyor:**
  - en farklı,
  - desenli,
  - tek yönlü,
  - bir bilgi eksik.

  Örnek: "Kumaşın eni 280 cm; metraj 140 cm en için girilmiş." Enden ölçekleme ya da fire katsayısı uydurmuyoruz.
- **Takımın toplamı:** Bir kumaş, ancak o kumaştaki her parçanın sayısı varsa toplanıyor. Kısmi toplam gösterilmiyor; "en az 8 m" gibi bir sayı cevap gibi okunur.
- **Sonrası:** Usta föyündeki "gerçek metre" geri bildirimiyle veri toplanacak. Ustanın kesim reçetesinden hesaplayan motor (Mert'in önerisi) ancak bu gerçek işlerin en az %80'inde tutarsa açılacak.
- **Veritabanı:** `models` tablosuna `meterage_m` ve `meterage_ref_width_cm` sütunları eklendi; ikisi birlikte dolu ya da birlikte boş olmak zorunda. Kesim masası tablo dosyasının içinde.

## Kesim masası, 6–7. adım: usta föyü ve gerçek metre

- **Usta föyü** teklif föyünün ikinci sayfası; aynı "Föyü yazdır" düğmesinden çıkıyor.
  - Önerenler: Rıza Usta ve Kerem. Kerem'in pahalı "silüet pencereli onay kartı" bu sayfadaki zımba kutusuna dönüştü: bıçak yok, matbaa yok.
  - Başlıkta büyük harfle "METRAJ TAHMİNİDİR, USTA TEYİT EDER" yazıyor.
  - Her parça için firmanın metrajı ya da yokluğunun nedeni gösteriliyor.
  - Her kumaş için bir kutu var: numune zımba kutusu, en / desen / yön bilgisi, toplam (yalnızca her parçanın sayısı varsa), lot satırı, "kesilen gerçek metre" satırı ve müşterinin onay imzası.
- **Siyah beyaz:** Renk kâğıtta değil, zımbalı numunede onaylanıyor (Kerem). İlk denemede CSS `filter: grayscale` kullanıldı; bu, Chromium'un PDF çıktısında sayfanın sağını kırptı. Sayfa zaten renksiz tasarlandığı için filtre kaldırıldı.
- **Gerçek metre (`/gercek-metre/<iş>`):**
  - Föydeki QR'ın taşıdığı iş bilgisi: kumaş kodu, modeller, föyde basılan sayı. Firma adı ve ayrıntılar QR'ın içinde duruyor, sunucuda föy kaydı tutulmuyor.
  - Usta, kumaş başına kesilen metreyi yazıyor. Ad ya da telefon istenmiyor.
  - Kayıtlar `cut_reports` tablosuna gidiyor. Bu tablo yalnızca sunucudan okunup yazılıyor (RLS açık, politika yok).
  - Panel raporundaki "Kesim geri bildirimi" bölümü şunları gösteriyor:
    - kayıt sayısı,
    - föyde sayı olanlar,
    - kumaşın yetmediği işler,
    - ortalama fark.

    Kumaşın yetmediği satırlar kırmızıyla işaretli.
  - Hesaplama motoru (Mert) ancak bu veriyle, işlerin en az %80'inde tutarsa açılacak.
- **Kötüye kullanım:** QR'ın içeriği tahmin edilebilir. Biri sahte "gerçek metre" yazabilir; zararı kalibrasyon verisinin kirlenmesiyle sınırlı. Bu yol da firewall hız sınırı kuralına eklendi. Veri azken panelde gözle ayıklanabilir.

## Müşteri telefonu ORMEN'de kalıyor (Fatih Bey, 6 Ekim)

- Hakan'ın "son müşterinin telefonu ORMEN'e hiç gelmesin" önerisi kabul edilmedi. Numune talepleri ad ve telefonla birlikte ORMEN'in kendi veritabanına (Supabase) yazılmaya devam ediyor; bugünkü düzen değişmedi.
- **Dikkat edilecek nokta:** Formdaki onay metni bu bilgileri "yalnızca numune talebi için" kullanma iznini kapsıyor. Aynı numaralara ileride kampanya ya da yenilik mesajı gönderilecekse iki şey gerekir:
  - formda ayrı ve isteğe bağlı bir onay kutusu,
  - ticari ileti kuralları gereği İYS kaydı.

  İstenirse onay kutusu eklenir; metin avukat paketine girmeli.

## Telefonda ilk ekran (1. toplantı, Deniz)

- **Sorun:** 360 px genişliğindeki bir telefonda ilk ekranda tek bir kumaş görünmüyordu; asıl iş olan kumaş değiştirmek aşağıda kalıyordu. Ayrıca:
  - araç şeridi ekrana sığmıyordu ("Plan" kesikti, "Yakından bak" iki satıra kırılıyordu),
  - açılışta koltuğun üstünde döndür/çoğalt araç çubuğu duruyordu.
- **Kumaş şeridi (`QuickStrip`):** Telefonda alt panelin başına, kumaş adının hemen altına yatay kaydırılan bir şerit geldi. Panel yukarı çekilince şerit gizleniyor, çünkü tam liste zaten açık.
  - Şerit panelin sürükleme alanının içinde durduğu için ilk sürümde her dokunuş paneli de açıyordu. Şerit artık dokunuşları ve kaydırmaları kendine alıyor.
  - Düğmeler radyo değil, basılı düğme (`aria-pressed`). Böylece tam listedeki radyo grubu ikilenmiyor.
- **Araç şeridi:** Telefonda yalnızca "Daha fazla" ve "Ekle" kalıyor. "Daha fazla" menüsünde Plan görünümü, Yakından bak, Ölçüler ve Karşılaştır var. Masaüstünde değişiklik yok.
- **Koltuk araç çubuğu:** Telefonda ancak koltuğa dokununca ya da birden fazla parça olunca çıkıyor.
- **Oda kurucu** donmuş durumda (2. toplantı). Telefonda Plan artık menünün içinde; "Oda" sekmesi yerinde duruyor.

## Kiosk paketi (1. toplantı, Deniz ve Selin)

- **"Elinizdeki kartelanın kodu" (`lib/fabric/code-match.ts`):** Kiosk modunda kumaş panelinin en üstünde duran büyük bir kod kutusu.
  - Eşleştirme büyük-küçük harfe, Türkçe harflere, boşluğa ve tireye bakmıyor: "siena04", "SİENA 04" ve "SIENA-04" aynı kumaş.
  - Tam kod yazılınca, ve o koddan uzun başka bir kod yoksa, kumaş hemen giyiyor. Bu kural "SIENA-1" yazılırken "SIENA-10"un yerine geçmesini önlüyor. Enter tuşu da uygular.
  - Kodun bir parçası yazılınca uyan kumaşlar büyük düğmeler olarak çıkıyor: önce o parçayla başlayanlar, sonra içinde geçenler. Bu sayede kartelada büyük yazan "04" de yeterli.
  - Kutuya CSS ile büyük harf uygulanmıyor. Türkçe kuralla "sie" yazısı "SİE" görünürdü, kodlar ise "SIENA" diye yazılıyor.
- **Büyük yazı:**
  - Kioskta sahne dışındaki her şey CSS `zoom` ile 1,25 kat büyütülüyor: üst düğmeler, renk ibaresi, kumaş paneli. Böylece 13 px'lik yazı 16 px oluyor.
  - Kumaş sütunu genişletildi: 1600 px'ten dar ekranda 460 px, daha genişte 540 px.
  - Sahne araç şeridi yalnızca 1600 px'ten geniş ekranda büyüyor; 1280 px'lik tablette büyütülmüş hâli sahneye sığmıyordu.
  - 3B tuvalin kendisi büyütülmüyor; dokunma ve sürükleme koordinatları kaymasın diye.

## Talepleri silme ve saklama süresi (1. toplantı, Hakan)

- **Elle silme:** Paneldeki her talepte iki adımlı bir "Sil" var: "Sil" → "Evet, sil". KVKK'da bir kişi verisinin silinmesini isteyebilir; Fatih Bey telefonların ORMEN'de kalmasını istese de bu yol açık olmalı.
- **Süreli silme:** `SAMPLE_RETENTION_DAYS` ayarı (30–3650 gün) girilirse, o süreden eski talepler panelde talep listesi her açıldığında siliniyor.
  - Ayar bilerek varsayılan olarak kapalı. Süreyi avukat belirleyecek; o zamana kadar talepler elle silinene kadar saklanıyor.
  - /panel/durum bunu "yapılacak" olarak gösteriyor.
  - /kvkk metninde süre için görünür bir yer tutucu var: "[Avukat onayıyla belirlenecek süre]". Metin zaten avukat onayı bekliyor; yayından önce doldurulacak.
- **Neden pg_cron değil:** Supabase'de ayrıca açılması ve izlenmesi gereken bir zamanlayıcı yerine silme, talepleri gören tek yerde, listenin açılışında yapılıyor. Panel kullanılmadığı sürece süresi geçmiş talepler bir süre daha durabilir; bu, pilot ölçeği için kabul edildi.

## Numune sonrası adımlar, mağazaya iletme, askı etiketleri

- **"Bundan sonra" adımları (Deniz):** Numune talebi gönderilince müşteriye üç adım gösteriliyor.
  - Firma sayfasından gelen talepte:
    1. ORMEN numuneyi keser.
    2. Numune firmanın mağazasına gönderilir; müşterinin adresi istenmez.
    3. Numune mağazaya ulaşınca firma ya da ORMEN arar.
  - ORMEN ana sayfasından gelen talepte ORMEN arar.
  - Hiçbir tarih ya da süre sözü yok (Deniz: "uydurma süre yazılmasın").
- **Mağazaya ilet:** Telefon numarası ORMEN'e geliyor; etikette ve mağaza sayfasında kişisel veri yok. Ama müşteriyi mağaza arayacak. Bu yüzden panelde, firmanın WhatsApp numarası girilmişse, talebi tek dokunuşla firmaya ileten bir düğme var: ad, telefon, kumaş, seçimler ve numune kodu. Onay metni zaten "firma ve ORMEN ile paylaşılmasını kabul ediyorum" diyor.
- **Askı etiketleri (`/panel/aski/<firma>`, Selin):**
  - A4 kâğıtta 3 × 8 etiket (63,5 × 33,9 mm, yaygın L7159 yapışkan etiket kâğıdı), firmanın sunduğu her kumaşa bir tane: kod, seri ve renk, QR.
  - QR'ın açtığı adres: `/f/<firma>?q&k=<kod>&e=aski`. Sayfa o kumaş koltuğa giydirilmiş olarak açılıyor ve ziyaret raporda "QR" kaynağıyla, "aski" etiketiyle sayılıyor. Etiket kutusuna şube yazıldıysa o kullanılıyor.
  - Kumaş kodu değişirse eski etiket hiçbir kumaşı açmaz; firma sayfası varsayılan kumaşla açılır. Selin'in "eski QR yanlış kumaşı açar" riski böylece yanlış kumaş yerine "kumaşsız" açılışa dönüşüyor.

## Firmaya aylık özet (1. toplantı, Selin ve Ece)

- **Ne:** `/panel/ozet/<firma>?ay=YYYY-AA` adresinde tek sayfalık bir A4. Üstte firmanın logosu ve rengi var. Sayfada şunlar yer alıyor:
  - ziyaret, kumaş denemesi, AR, numune talebi ve siparişe dönen numune sayıları,
  - en çok denenen 10 kumaş,
  - ziyaretlerin nereden geldiği.
- **Varsayılan ay geçen ay:** Satış temsilcisinin ziyareti genelde ay başında oluyor. Ay sınırları İstanbul saatine göre.
- **Eşik:** 30 ziyaretin altında sıralama gösterilmiyor; az veriyle "en çok denenen" yanıltıcı olur (Ece).
- **"Siparişe dönen":** Numune sayfasında mağazanın "Bu numuneyle sipariş verildi" işaretinden geliyor.
- **Neden ayrı sayfa, neden e-posta değil:** Mert'in itirazı geçerli. E-posta dış servis ve anahtar gerektirir. Bu sayfa ise elden verilen kâğıt; satışçı ziyarete somut bir gerekçeyle gidiyor (Selin).

## Kalite düşürme sürüklemeyi beklemeli

Bir tam test koşusunda, makine yük altındayken mobilya sürükleme testi bir kez kırmızı verdi: berjer hedefin gerisinde bırakılmıştı. Tek başına çalıştırıldığında 3/3 geçti. Muhtemel sebep kademeli kalite ayarı: kareler yavaşlayınca piksel oranı sürükleme sırasında düşürülüyor, tuval yeniden çiziliyor ve araya giren işaretçi hareketleri kayboluyordu. Yavaş bir telefonda gerçekten yaşanabilecek bir durum. Artık sürükleme sürerken düşürme bekletiliyor ve sürükleme bitince uygulanıyor.

## Hazır sahneler (1. toplantı, Deniz)

- **Ne:** Firma başına en fazla 6 hazır sahne. Kumaş panelinin başında kart olarak çıkıyor. Kartta sahnenin kumaşları, adı ve parça sayısı var; tıklanınca sahne aynı sayfada açılıyor.
  - Kiosk işareti, QR işareti ve etiket korunuyor: ziyaretin kaynağı değişmiyor, kiosk kiosk olarak kalıyor.
- **Nasıl eklenir:** Sahne için ayrı bir düzenleyici yazılmadı. Sahne konfigüratörde kuruluyor ve "Paylaş" bağlantısı panelde bir adla yapıştırılıyor. Sahne aslında paylaşım kimliğinin kendisi, bu yüzden veritabanında yalnızca ad ve kimlik tutuluyor (`firms.presets`). Kısa bağlantılar kayıt sırasında uzun kimliğe çevriliyor.
- **Kart görseli:** İlk denemede paylaşım önizleme görseli (`/p/<id>/opengraph-image`) kullanıldı. Ama sunucu 3B çizmediği için kartta yalnızca bir kumaş yuvarlağı ve yazı çıkıyordu. Kart artık sahnedeki kumaşları büyük, üst üste binen yuvarlaklar olarak gösteriyor; ayrıca görsel indirmesi de gerekmiyor.
- **ORMEN'in varsayılan sahneleri yok:** Deniz "firma girmezse ORMEN'in varsayılanları olsun" dedi. Ama hangi kumaşın hangi firmada iyi duracağına ORMEN satışçısı karar vermeli; rastgele seçilmiş varsayılanlar firmanın vitrinini temsil etmez. Sahnesi olmayan firmada bölüm hiç görünmüyor.

## Oda kurucunun kaderi için ölçüm (2. toplantı)

- Oda kurucu donduruldu ve karar veriyle verilecek. Deniz'in ölçütü: pilotta ziyaretlerin %10'undan azı odaya ya da plana dokunuyorsa sadeleştirme önerisiyle Fatih Bey'e rakamla gidilecek.
- **Yeni olay:** `plan_acildi` (2D plan açıldı). Mevcut `oda_degisti` olayıyla birlikte raporda yeni bir "Oda / plan" kutusu oluşturuyor: odayı değiştiren ya da planı açan ziyaret sayısı ve tüm ziyaretlere oranı.
- **Tablo dosyaları:** Olay listesi ve SQL rapor fonksiyonu, henüz çalıştırılmamış `20261009000000_ziyaret_kaynaklari.sql` içinde güncellendi. SQL raporun uygulamadaki hesapla aynı sonucu verdiğini denetleyen test bu alanı da kapsıyor.

## Müşterinin telefonu ORMEN'de kalıyor (6 Ekim, Fatih Bey)

- Acil toplantıda Murat Bey "telefon yalnızca firmaya gitsin" dedi. Fatih Bey'in kararı: telefon ORMEN'in veritabanında kalıyor. Akış değişmedi.
- Firmanın kaygısına cevap kâğıtta verilecek: pilot protokolüne "ORMEN, firma sayfasından gelen müşteriyi kendi satışı için aramaz; talebi firmaya iletir" sözü ve formdaki onay cümlesinin yeni hâli. Metin avukatta.

## Kiosk yalnızca kumaş denetir; ana sayfada "Yönetim" bağlantısı (acil toplantı)

- **Kiosk:** Showroom ekranında "Mobilya ekle", 3B / Plan düğmesi, menüdeki "Plan görünümü" ve parça araç çubuğu ("Çoğalt", döndürme) gizli. Ekran gün boyu açık duruyor; bir ziyaretçinin eklediği parça ya da açtığı plan bir sonrakine kalmasın (Mert). Hazır sahneler kioskta duruyor; sahne değiştirmek için yol bu.
- **Yönetim bağlantısı:** Fatih Bey siteyi ilk açtığında "giriş yok" diye şaşırdı. ORMEN ana sayfasının altına küçük bir "Yönetim" bağlantısı kondu. Firma sayfalarında ve kioskta yok; firmanın müşterisi panel bağlantısı görmüyor.
- **Sürükleme testi:** Berjer sürüklenince hedefin birkaç santim gerisine düşebiliyor; parça 0,5 m yükseklikten tutuluyor ve kamera açılış hareketi sürerken perspektif kayması oluşuyor. Test artık tam nokta yerine hedefe 0,35 m yakınlık, aynı model, kumaş ve açı arıyor.

## Gerçek cihaz testi için ölçüm ekranı (`?olcum`)

- **Neden:** Acil toplantının 5. şartı, testin gerçek cihazda ölçülmesi. Mert: "Testler yeşil ama hiçbiri gerçek cihazda koşmadı." "Akıcı mı?" sorusunun cevabı tahmin olmasın diye site kendi ölçtüklerini gösteriyor:
  - cihaza verilen kalite,
  - piksel oranının düşüp düşmediği,
  - sahne dönerken kare hızı,
  - ilk kumaşın gelme süresi,
  - AR sonucu.
- **Yeni özellik değil:** Müşteri bu ekranı görmez. Yalnızca adrese `?olcum` yazılınca çıkar, hiçbir yere veri göndermez, yeni paket gerektirmez. Sonuç "Kopyala" ile WhatsApp'a yapıştırılır.
- **Ölçüt:** Geçme sınırları `CIHAZ-TESTI.md`'de (ilk kumaş mobil veride 6 saniyeyi, kare hızı 25'in altını geçerse pilot bekler).

## Yer tutucuları toplu yayından kaldırma (pilot şartı 1)

- **Ne:** Panelde Kumaşlar sayfasındaki yer tutucu uyarısının altında "Yer tutucuları yayından kaldır" düğmesi var. İki adımla soruyor ve yayındaki bütün örnek kumaşları gizliyor. Kumaşlar silinmiyor; panelde duruyorlar ve tek tek geri açılabiliyorlar.
- **Ne zaman reddeder:**
  - Sitede hiç gerçek kumaş yoksa. Örnek katalog tek başınayken düğme hiçbir şeyi gizlemez.
  - Yayındaki bir firmanın sayfasında gerçek kumaş kalmayacaksa. Kumaşsız firma sayfası "bulunamadı" der ve o firmanın basılı QR'ları boşa düşer. Mesaj bu firmaların adını sayar.

## Numune akışı ölçümü ve 24 saat uyarısı (pilot şartı 6)

- **Neden:** Acil toplantıda talepleri 24 saat içinde işleyen tek bir sahip (Selin) ve 10 siparişin ölçütlerinin tek tabloda toplanması şart koşuldu.
- **Uyarı:** "Yeni" adımında 24 saatten uzun bekleyen talep varsa paneldeki Genel bakış ve Talepler sayfalarının üstünde kırmızı bir uyarı çıkıyor. E-posta ya da SMS yok; dış servis ve anahtar gerektirirdi.
- **Rapor → Numune akışı:** Dört kutu var:
  - 24 saati geçen talep (hedef 0),
  - gönderilen numunelerde lotu yazılı olanlar,
  - talepten mağazaya çıkışa kadar geçen sürenin medyanı,
  - siparişe dönenler.

  Metraj sapması zaten "Kesim geri bildirimi"nde.
- **Bilinen sınır:** Talebin yalnızca son adımı ve zamanı saklanıyor. Bu yüzden gönderme süresi, şu an "gönderildi"de duran numunelerden ölçülüyor. Mağaza "siparişe döndü" deyince gönderme zamanının üzerine yazılıyor. Pilotta 10 sipariş için bu yeterli; her adımın zamanı gerekirse yeni bir veritabanı dosyası (migration) ister.

## Sunucu Frankfurt'ta (`vercel.json`)

- **Sorun:** Vercel'de bölge seçilmezse sunucu kodu ABD'de (Washington, `iad1`) çalışabiliyor. Veritabanı ise Frankfurt'ta. Bu durumda:
  - her sayfa açılışında veritabanı sorguları Atlantik'i gidip geliyor ve sayfalar yavaşlıyor;
  - müşterinin telefonu ABD'deki sunucudan geçiyor. Bu, aydınlatma metninde anlatılması gereken ikinci bir yurt dışı aktarım olurdu.
- **Çözüm:**
  - Depoya `vercel.json` eklendi ve bölge `fra1` (Frankfurt) olarak sabitlendi.
  - Next.js'in sayfa bazlı `preferredRegion` ayarı bu sürümde kullanımdan kalktığı için platform ayarı tercih edildi.
  - Panelin Kurulum sayfası, sunucunun gerçekte çalıştığı bölgeyi (`VERCEL_REGION`) okuyor. Frankfurt değilse uyarıyor.
- **KVKK metni:**
  - Taslağa "Yurt dışına aktarım" paragrafı eklendi: Supabase ve Vercel, Frankfurt. Dayanağı avukat yazacak.
  - "Amaç" cümlesi düzeltildi. Numune müşteriye değil, firmanın mağazasına gidiyor (2. toplantı); eski metin "size ulaştırılması" diyordu.
  - Avukata verilecek bilgi `AVUKAT-PAKETI.md` dosyasında.

## Seçerek oluştur: gerçek yükseklik, sabit sırt, tek parça oturum

- **Neden:** Fatih Bey müşteri firmaların koltuk fotoğraflarını gönderecek. Fotoğraftan 3B model çıkaran yapay zekâ servisleri ücretli ve dış servis; kumaşı da gerçek ölçüde oturtamıyorlar. Bu yüzden "Seçerek oluştur" fotoğraftaki koltuğa daha çok benzeyecek şekilde genişletildi. Pilot şartı 4: firma kendi koltuğunu görmeli.
- **Yükseklik:** Firmanın verdiği ölçü santimetre olarak giriliyor (koltuklarda 65–110 cm, pufta 30–55 cm). Önceden yalnızca alçak, orta ya da yüksek seçilebiliyordu; gerçek ölçü tutmayınca kumaş deseni de yanlış büyüklükte görünürdü. Sırt düğmeleri artık hazır değer kısayolu: birine basınca yazılan yükseklik silinir.
- **Sırt tipi:** Ayrı minderli (önceki hâli) ya da sabit (tek parça, döşemesi gövdeye sabit sırt).
- **Oturum:** Her kişiye ayrı minder ya da tek parça minder. Tek parça oturumda sırt minderleri yine kişi başına; çoğu modelde böyle.
- **Eski modeller:** Yeni seçimler yalnızca seçildiklerinde kaydediliyor. Eski modellerin verisi birebir aynı kalıyor ve veritabanında değişiklik gerekmiyor (`params` alanı zaten jsonb).
- **Kapitone ve kulaklı berjer (ek):**
  - **Kapitone:** Sırt tipine "Kapitone (düğmeli)" eklendi. Sabit sırt panelinde, yaklaşık bir el aralığıyla elmas dizilimli düğme çukurları var. Ayrı bir görsel kullanılmıyor; çukurlar geometrinin kendisinde, bu yüzden kumaş deseni çukura doğru ölçüyle iniyor.
  - **Kulaklı berjer:** Berjere "Kulaklı" seçeneği eklendi. Kanatlar kolun içinden yükseliyor.
- **Kıvrık kol (Chester):** Kol tiplerine eklendi. İnce bir gövdenin üstünde dışa taşan yuvarlak bir rulo var; dış ölçü düz kolla aynı kalıyor. Kapitone sırtla birlikte Chester takımı kurulabiliyor.
- **Hazır stiller:** Formun başında Chester, Modern, İskandinav ve Blok / minimal düğmeleri var. Her biri kol, sırt, oturum ve ayağı birlikte seçiyor; tip ve ölçüler olduğu gibi kalıyor. Fotoğraftan model kuran kişi en yakın stille başlayıp gerisini tek tek değiştiriyor. Bir seçim değişince stil düğmesi sönüyor; ekran yalnızca gerçekten o stilde olanı stil diye gösteriyor.
- **Firmanın fotoğrafı yanında:** Önizlemenin altında "Firmanın fotoğrafını koy" düğmesi var. Fotoğraf önizlemenin altında gösteriliyor ya da saydamlığı ayarlanarak üstüne bindiriliyor; koltuk fotoğraftaki açıya çevrilince oranlar karşılaştırılabiliyor. Önizlemenin köşesinde "Soldan çapraz / Önden / Sağdan çapraz / Yandan" düğmeleri kamerayı ürün fotoğraflarının çoğunun çekildiği açılara (oturma yüksekliğinin biraz üstünden) çeviriyor; uzaklık korunuyor. Fotoğraf tarayıcıdan çıkmıyor: yüklenmiyor, kaydedilmiyor. Böylece müşteri firmanın görseli için ayrı bir izin ve saklama sorusu doğmuyor.
- **Hâlâ çıkmayanlar:** Dikiş ve biye detayı, kolun önündeki sarmal yüzü (Chester kolunun ön kıvrımı düz görünüyor).

## Kumaş yapay duruyordu: ezik gölgesi ve biye (Fatih Bey, 10 Ekim)

- **Şikâyet:** "Koltuğun üstünde kumaş çok yapay duruyor."
- **Teşhis (malzeme değil, şekil ve ışık):** Kumaş malzemesi zaten doğru kuruluydu: gerçek ölçüde doku, kabarıklık haritası, mat yüzey, kadife parlaması. Yapaylığın üç sebebi vardı:
  1. **Ezik gölgesi yoktu.** Minder araları, oturumun kolla ve sırtla birleştiği yer, oturumun altı açık yüzeylerle aynı aydınlıktaydı; koltuk şişirilmiş plastik gibi duruyordu.
  2. **Dikiş ve biye yoktu.** Minderler kusursuz yuvarlatılmış kutulardı.
  3. **Örnek kumaş görselleri bilgisayar üretimiydi**; desen fazla düzenliydi. Bunu gerçek kumaş fotoğrafları çözecek.
- **Çözüm 1, ezik gölgesi:**
  - Kodla çizilen her modelde, model bir kez kurulurken her noktanın ne kadar içe kapandığı hesaplanıyor; kapalı yerlerin kumaşı en fazla %58 koyulaşıyor.
  - Parçalar yuvarlatılmış kutu olduğu için hesap kesin ve hızlı: üçlü kanepede yaklaşık 0,2 saniye.
  - Yeni kütüphane yok, ekran kartına her karede ek yük yok.
  - Sonuç modele gömülü bir gri tonu olarak saklanıyor. Kumaş malzemesi bunu yalnızca bu işareti taşıyan modellerde okuyor, yüklenen GLB modeller etkilenmiyor.
  - AR dosyasına da giriyor: glTF'de bu renk kumaşla çarpılır.
- **Çözüm 2, biye:** Oturum minderlerinin altı ve üstünde, sırt minderlerinin önü ve arkasında, sabit ve kapitone sırtın önünde, düz kolların ön yüzünde 4,5 mm'lik kumaş biye var.
  - Biye, minderin kabarıklığının sıfırlandığı dikiş çizgisine oturuyor.
  - Dokusu metre cinsinden; kumaş deseni biyede de gerçek ölçüsünde.
- **AR boyutu:** Biyeler ilk denemede AR dosyasını 4,7 MB'a çıkardı, sınır 4 MB. Biye örgüsü seyreltildi (1,5 cm'de bir halka, 6 yüz); görüntüde fark yok, dosya sınırın altına indi.
- **Renk doğruluğu:** Renk testleri geçiyor. Ekranda ölçülen renk açık yüzeyden alındığı için ezik gölgesi rengi bozmuyor.

## İlk gerçek kumaşlar: MISSO serisi, fotoğraftan (10 Ekim)

- **Ne:** Fatih Bey'in gönderdiği zikzak jakar fotoğrafları MISSO-01…06 olarak eklendi. Görseller sitede (`public/seed/fabrics/misso/`).
  - Yerel demoda hemen görünüyor.
  - Canlı sitede görünmesi için `supabase/veri/2-kumaslar-misso.sql` Supabase SQL Editor'de bir kez çalıştırılmalı.
- **Fotoğraflar kumaş üzerinde açılı ve hafif dökümlü çekilmişti; panelin tek tuşluk işlemesi bu fotoğraflarda yetmedi.** Bunun için `scripts/prepare-photo-fabric.ts` yazıldı. Betik her fotoğrafta şunları yapıyor:
  - deseni yataya çeviriyor;
  - fotoğrafın düz orta bölümünü alıyor;
  - zikzak dişinin aralığını ölçüyor;
  - fotoğraftaki ışık farkını düzleştiriyor;
  - genişlik ve yükseklikte kumaşın kendini tekrar ettiği yeri arıyor ve yalnızca ince bir kenar şeridini karıştırıyor;
  - kabarıklık ve parlaklık haritalarını panelin kendi koduyla (`deriveMaps`) çıkarıyor.
- **Neden panelin kenar birleştirmesi kullanılmadı:** Panelin `makeSeamless` işlemi deseni yarım kaydırıp üst üste karıştırıyor. Düz kumaşta bu fark edilmiyor, zikzakta bulanık hayalet lekeler bırakıyordu.
- **Otomatik ölçüm yetmedi:**
  - Simetrik zikzak her satırı bir dişte iki kez kestiği için yarım diş de tekrar gibi görünüyor.
  - Düşük kontrastlı renkte eğim yanlış çıkıyordu.
  - Bu yüzden eğim, kesilecek alan ve diş boyu göz kararıyla verildi (`--config`). Betik dişi bu tahminin ±%20'si içinde kesinleştiriyor.
- **Uydurulmayanlar, açık kalanlar:**
  - **Ölçek (güncellendi, ölçüldü):** İlk sürümde bir diş 6 cm varsayılmıştı; önce 3 cm denenmiş, koltukta çizgili kumaş gibi durmuştu. Fatih Bey ardından kumaşı masaya serip tepeden çekti, bir fotoğrafa da metre koydu: 80 cm, 1140 piksel tutuyor, yani santimetre başına 14,25 piksel. Bu fotoğraftan bir zikzak dişi önce 4,4 cm, düzeltmeden sonra 4,6 cm çıktı. Diğer renkler aynı dokuma olduğu için aynı diş boyunu aldı.
  - **Düzeltme (Fatih Bey: "sadece bu doğru gibi"):** Yalnızca metreli MISSO-05 doğru görünüyordu. Diğer fotoğraflarda diş sayısı fotoğraftan yaklaşık çeyrek hatalı ölçülmüştü; 01, 02 ve 06'nın dişleri koltukta 3,9 cm, 04'ünkiler 5,3 cm çiziliyordu. Diş sayısı artık bitmiş tile'ın içinde sayılıyor; tile kendini tekrar ettiği için oradaki tekrar kesin. MISSO-05'in tile'ı 52,5 cm genişlikte ve 11,4 diş içeriyor, buradan diş 4,6 cm. Diğer bütün renkler de 4,6 cm'ye getirildi. MISSO-05'in ölçeği doğrudan metreden hesaplanıyor (`pxPerCm`).
  - **Düz fotoğraflar:** MISSO-01, 02, 04, 05 ve yeni gelen gri-siyah renk (MISSO-06) düz fotoğraftan yeniden hazırlandı. MISSO-03'ün düz fotoğrafı dosya olarak ulaşmadığı için o renk hâlâ ilk, açılı fotoğraftan; ölçeği 4,4 cm'ye göre düzeltildi.
  - **SQL yeniden çalıştırılabilir:** `2-kumaslar-misso.sql` tekrar çalıştırılınca kumaş satırlarına (panelde değiştirilmiş adlar dahil) dokunmuyor, yalnızca görsel ve ölçek satırlarını bu sürüme güncelliyor.
  - **Kodlar:** Fotoğrafların geliş sırasına göre verildi.
  - **Renk adları:** Tarif amaçlı, geçici.
  - **Renk ailesi:** Baskın renge göre seçildi; çok renkli kumaşın ortalaması gri çıkıyordu.
  - **Boş bırakılanlar:** En, desen raporu ve kesim yönü.
- **Boyut:** Normal haritaları ilk denemede kayıpsız kaydedildi, kumaş başına 4–5 MB'tı. Panel gibi kayıplı kaydedilince tüm seri 11 MB oldu; telefon kumaş başına yaklaşık 0,8 MB indiriyor.

## Desen kaymaları: kumaş parçanın etrafına tek parça sarılıyor (10 Ekim)

- **Şikâyet (Fatih Bey):** "Desenlerde kaymalar var." MISSO gibi çizgili ve zikzak desenlerde belirgin.
- **Sebep:** Kodla çizilen her minderin altı yüzü ayrı bir kumaş parçası gibi kaplanıyordu ve her yüzde desen kendi ortasından başlıyordu. Bu yüzden:
  - ön yüzden üst yüze geçerken çizgiler kırılıyordu;
  - kolun yan yüzünde çizgiler boyuna, üst yüzünde enine gidiyordu, kenarda 90° kırılıyordu.

  Düz kumaşta fark edilmiyordu, desenlide hemen göze batıyordu.
- **Çözüm, ustanın yaptığı gibi:**
  - Kumaş parçanın etrafına tek şerit olarak sarılıyor; ön, üst, arka ve alt yüz kesintisiz.
  - İki yan kapak, ön yüzün kenarından köşeyi dönerek devam ediyor; yan kapaktaki çizgiler ön yüzdekilerle aynı hizada.
  - Oturum, sırt ve gövdede kumaş enine eksenin etrafında dönüyor.
  - Kollarda boyuna eksenin etrafında dönüyor: dış yüzden üstten aşıp iç yüze iniyor.
  - Halkanın kapandığı tek ek yeri arka-alt kenarda, görünmeyen yerde.
- **Doğrulama:** Yeni test, ön-üst, ön-alt, ön-yan ve kol üst kenarlarında doku koordinatının kesintisiz olduğunu denetliyor. Kumaşın gerçek ölçüsü (1 doku birimi = 1 m) değişmedi.
- **Hâlâ olan:** Üst yüz ile yan kapak arasında desen buluşmuyor; gerçek döşemede de bu dikiş çizgisidir. Her minderde desen, minderin ortasına ortalanıyor; usta da genelde böyle yapar.

## MISSO: tile artık fotoğrafın ortasından dört tam diş (10 Ekim, ikinci düzeltme)

- **Şikâyet (Fatih Bey):** Önceki düzeltmeden sonra "daha da bozulmuş".
- **Asıl sebep ölçek değil, kesimdi.** Telefon fotoğrafı kumaşa tam dik değildi; dişler fotoğrafın bir kenarına doğru büyüyordu. Fotoğrafın geniş bir bölümünden kesilen tile kenarından kendine uymuyordu. Kenarlar karıştırılınca koltukta 20–25 cm'de bir bulanık, kaymış şeritler oluşuyordu.
- **Çözüm:**
  - Tile, fotoğrafın tam ortasından alınan **dört tam diş** genişliğinde bir şerit. Orada açı bozulması en az; zikzak dişten dişe birebir tekrar ettiği için şerit yan yana birebir oturuyor.
  - Kalan küçük eğim, şeridin iki kenar sütunu karşılaştırılarak alınıyor; yan kenarda yalnızca ince bir geçiş var.
  - Yükseklikte tile fotoğrafın neredeyse tamamı (yaklaşık 1 m). Renk bantlarının döndüğü yerde ince bir geçişle kapanıyor; dikey ek çok seyrek.
- **Ölçek:** Bir diş 4,6 cm (MISSO-05'in metreli fotoğrafından), tile genişliği 18,4 cm.

## Bölgeye göre kumaş: gövde, kollar, minderler, biye (Fatih Bey, 10 Ekim)

- **İstek:** "Kollar ve alt kasa kumaşını farklı seçmemiz gerekiyor, sadece minderleri de seçebilelim… istenilen bölgeye istenilen kumaşı uygulayalım."
- **Ne:** Kumaş panelinin başında "Kumaşın gideceği yer" seçimi var: Tümü, Gövde, Kollar, Minderler, Biye. Her düğmede o bölgenin şu an giydiği kumaşın küçük örneği görünüyor.
  - Bir bölge seçiliyken tıklanan kumaş yalnızca o bölgeye gidiyor.
  - "Tümü" seçiliyken tıklanan kumaş parçanın her yerine gidiyor ve bölge kumaşları kalkıyor.
- **Bölgeler (kodla çizilen modellerde parça adından):**
  - Gövde: alt kasa ve sırt kasası.
  - Kollar: kulaklar ve Chester kolunun rulosu dahil.
  - Minderler: oturum, sırt minderi, sabit ve kapitone sırt dolgusu, puf.
  - Biye: ayrıca kumaş verilmezse dikildiği parçanın kumaşını alıyor; minder değişince biyesi de değişiyor.

  Panelden yüklenen 3B model dosyalarında parça adları bilinmediği için bölge seçimi çıkmıyor; tek kumaş giyiyorlar.
- **Bağlantı:** Parça kodunun sonuna eklendi, örneğin `moduler-kanepe.LUMA-06.0.51.0.kPIETRA-05~mSIENA-05`. Ana kumaşla aynı olan bölge yazılmıyor. Eski bağlantılar aynen açılıyor. Katalogdan kalkmış bir kumaş bölgede ana kumaşa dönüyor.
- **Bağlantının dışında da geçerli olduğu yerler:**
  - Numune talebi bölgelerin bütün kumaşlarını içeriyor.
  - Paylaşım metni ve görseli "Modüler Kanepe: minderler" gibi yazıyor.
  - Paylaşım sayfası bütün kumaşları sayıyor.
  - "Odamda gör" (AR) dosyası her bölgeyi kendi kumaşıyla içeriyor ve 4 MB sınırının altında kalıyor.
- **Metraj:** Firmanın metrajı tek kumaşlı parça için. Bölgelere bölünmüş parçada föy her kumaşı ayrı satırda, bölgesiyle gösteriyor. Metre yerine "usta hesaplar" yazıyor. Uydurma bölme yok. (10 Ekim'den sonra: firma bölge başına metraj girdiyse föy onu topluyor; aşağıda.)
- **Karşılaştırma modunda** bölge seçimi gizli; karşılaştırma bütün parçayı tek kumaşta gösteriyor.

## Ayak rengi, "tümüne uygula" ve yeni vitrin modelleri (10 Ekim)

- **Ayak rengi:** Kumaş panelinde, bölge seçiminin altında. Seçenekler ceviz (varsayılan), meşe, doğal ahşap ve siyah.
  - Yalnızca konik ahşap ayaklı, kodla çizilen modellerde çıkıyor; metal ayak ve gizli kaide olduğu gibi kalıyor.
  - Bağlantıya `a` ile yazılıyor (ör. `.mSIENA-05~asiyah`); ceviz yazılmıyor.
  - AR dosyasına da geçiyor.
- **"Tümüne uygula":** Önceden yalnızca ana kumaşı kopyalıyordu. Artık seçili parçanın bütün döşemesini (ana kumaş, bölge kumaşları, ayak rengi) diğer parçalara kopyalıyor. Bölge ya da ayak varsa düğmenin adı "Bu döşemeyi tümüne uygula" oluyor.
- **Vitrin modelleri (Fatih Bey: "birkaç tane koltuk modeli ekle"):** Seçerek oluştur ile kuruldu:
  - Modern Üçlü
  - İskandinav İkili
  - Şezlonglu L Köşe
  - U Koltuk
  - Blok Dörtlü Kanepe
  - Puf

  Chester ikilisiyle birlikte toplam sekiz model var. Canlı için `supabase/veri/3-modeller-vitrin.sql` dosyası çalıştırılmalı; `modeller-chester.sql` bu dosyanın içine katıldı. Ölçüler Türkiye'de yaygın ölçüler; firma modeli değil, vitrin örneği.

## 10 Ekim acil toplantısının hemen uygulanan kararları

- **Bölgeler:** "Gövde" yerine **Kasa**; "Minderler" ikiye ayrıldı: **Oturak** (oturum minderleri, puf) ve **Sırt** (sırt minderleri, sabit ve kapitone sırt dolgusu). En yaygın iki tonlu koltuk, oturağı ve sırtı farklı kumaştan olan koltuk; tek "Minderler" düğmesiyle bu yapılamıyordu.
  - Bağlantıda oturak `o`, sırt `s` harfiyle yazılıyor.
  - Eski bağlantılardaki `m` (bütün minderler) hâlâ okunuyor ve ikisine birden uygulanıyor.
- **Telefonda bölge seçimi:** Tek satır, yana kayan düğmeler. Açıklama yalnızca bir bölge seçiliyken ya da koltuk karışık kumaşlıyken çıkıyor.
- **Açılış dönüşü:** Önceden koltuğun yanından (−100°) başlayıp 5,5 saniye dönüyordu; yavaş bilgisayarda ilk saniyeler koltuk yandan görünüyordu. Artık sağdan üç çeyrek açıyla (60°) başlıyor, 3,2 saniyede 29°'ye oturuyor.
- **Desen yönü (Düz / Dönük):**
  - Parça başına seçiliyor. Dönükte kumaş 90° çevriliyor; desen raporunun eni ve boyu da yer değiştiriyor, ölçek doğru kalıyor.
  - Kabarıklık haritası desenle birlikte dönüyor: three.js yüzey yönünü dönmüş doku koordinatlarından hesaplıyor.
  - AR'da dönüş doku koordinatlarına gömülüyor; dosya formatına doku dönüşü yazılmıyor.
  - Föyde parça satırında "desen dönük" yazıyor. Firmanın metrajı düz kesim için girildiğinden dönükte sayı verilmiyor, "usta hesaplar" yazıyor.

## Bölge başına metraj (10 Ekim toplantısı, 5. karar)

Fatih Bey katalog görseli fikrini düşürdü; toplantının kalanı yapıldı. Pilot öncesine çekildi, çünkü pilot firmanın modelleri girilirken alan hazır olmalı.

- **Ne:** Panelde modelin metrajının altında "Bölge başına metraj": Kasa, Kollar, Oturak, Sırt için ayrı metre. Aynı kumaş eni için. Biye yok; biyeyi usta artan kumaştan çıkarır, onu usta hesaplar.
- **Föy:** Müşteri bölgelere farklı kumaş seçtiyse her kumaş satırı, kapladığı bölgelerin firma sayılarının toplamını gösteriyor (ör. kasa 9 + sırt 2 = 11 m). Sayı yine yalnızca aynı enli, düz, çift yönlü kumaşta; dönükte yine usta.
- **Boş bölge:** Modelde olmayan bölge demek (kolsuz koltukta Kollar). Panelde böyle yazıyor. Firma bölge sayısı girmediyse bölgeli parçada eskisi gibi "usta hesaplar".
- **Denetim:** Her bölge 0,1–40 m. Bölgelerin toplamı bir adetin metrajını %10'dan fazla geçemez (parçalar biraz daha fire verebilir, çok daha fazla değil). Toplamın altında kalması serbest: bütün koltuk kesiminde artandan da biçilir.
- **Veritabanı:** `20261011000000_bolge_metraji.sql` modele `meterage_zones` (jsonb, yalnızca dört bölge adı) ekliyor. Dosya çalıştırılmadan da model kaydı çalışıyor; yalnızca bölge sayısı girilirse "dosyayı çalıştırın" hatası çıkıyor. Kurulum sayfası dosyayı yokluyor.


## Supabase bağlantısı (10 Ekim)

- Fatih Bey Claude'a Supabase bağlantısını (connector) kurdu. Tablo dosyalarını ve kumaş/model dosyalarını artık Claude çalıştırıyor; gizli anahtar hiçbir yerde mesajla paylaşılmıyor. Kural aynı: service_role anahtarı yalnızca Vercel'de.
- 10 Ekim'de çalıştırılanlar (`ormen-atelier` projesi): `20261011000000_bolge_metraji.sql`, `2-kumaslar-misso.sql` (yeni dokular ve ölçek), `3-modeller-vitrin.sql` (8 hazır model). Sonuç: 29 kumaş, 11 model, `meterage_zones` sütunu var.
- **Güvenlik danışmanı (Supabase advisor):**
  - `touch_updated_at` fonksiyonuna sabit `search_path` verildi (aynı tablo dosyasına eklendi).
  - `cut_reports` tablosunda kural yok: bilerek. Tabloya yalnızca sunucu gizli anahtarla yazıyor; tarayıcıdan okuma ve yazma kapalı.
  - `is_staff()` herkesçe çağrılabiliyor: bilerek. Satır kuralları bu fonksiyonu kullanıyor; yalnızca çağıranın kendisi personel mi, onu söylüyor.
  - `rls_auto_enable()` bizim dosyalarımızdan değil, Supabase'in kendi yardımcı fonksiyonu; dokunulmadı.
  - "Sızdırılmış şifre koruması" kapalı: Supabase panelinden Fatih Bey açabilir (Authentication → Sign In / Providers → Email → Leaked password protection; ücretli planlarda var).
- **Dosyalar düzenlendi (Fatih Bey'in isteği):** Tablo dosyaları Türkçe adlandı (`…_kurulum.sql`, `…_kesim_masasi.sql`, `…_bolge_metraji.sql` …), katalog dosyaları `supabase/veri/` altında çalışma sırasıyla numaralandı (`1-ornek-katalog`, `2-kumaslar-misso`, `3-modeller-vitrin`). Açıklama: `supabase/BENIOKU.md`.
  - Canlı veritabanının "Migrations" listesi de aynı adlara çekildi: sekiz dosyanın hepsi işli. Önce her dosyanın değişikliğinin veritabanında gerçekten olduğu tek tek denetlendi, sonra listeye yazıldı.
- **İzinler:** `.claude/settings.json`'a Supabase'te okuma, SQL çalıştırma ve tablo dosyası uygulama izni eklendi; bu depoda açılan oturumlarda bunlar için onay sorulmaz. Proje silme, durdurma, yeni proje açma gibi geri dönüşü zor işler listede yok; onlar yine sorulur.

## Vitrin modelleri, 2. tur (11 Ekim, Fatih Bey)

- **Şezlonglu L Köşe ve U Koltuk vitrinden kalktı.** Canlıda silinmedi, kapatıldı (`is_active = false`): paylaşılmış eski bağlantılar hata yerine kibarca düşer, istenirse panelden geri açılır.
- **Chester yeniden modellendi** ("Chester olmamış"). Gerçek bir Chesterfield'ın üç işareti eklendi:
  - kollar sırtla aynı yükseklikte, rulo kolların ve sırtın üstünde tek çizgi hâlinde dönüyor;
  - kapitone sırt kalın ve dik, kolların içi de düğmeli;
  - kısa (9 cm) ahşap ayak.
  - Kulaklı Chester berjer bu kurala girmiyor (kolları kulakların altında alçak kalır).
  - Vitrinde PIETRA-05 Bordo ile gösteriliyor: mat nubuk, Chester'ın alışılmış deri görünümüne en yakın ORMEN kumaşı. Berjer PIETRA-03 Toprak. Zikzak MISSO düğmeleri yutuyordu.
- **Sabit sırt düzeltildi** ("Blok dörtlüde sırt kısmında sıkıntı var"). Sabit sırt 9 cm'lik ince bir pano olarak çerçevenin önünde duruyordu; yandan bakınca ince bir korkuluk gibiydi, oturum da 87 cm derinlikle oturulamayacak kadar derindi. Şimdi dolgu tabana oturuyor, çerçeveyle aynı üst çizgide ve derinliği modelin derinliğinden hesaplanıyor: oturumun önünde 55–70 cm oturma derinliği kalıyor (blok dörtlüde 26 cm kalın sırt).
- **Yuvarlak puf eklendi.** Pufa "Form: Kare / Yuvarlak" seçeneği geldi (panelde "Seçerek oluştur"). Yuvarlakta genişlik çap oluyor. Üst ve alt düz kesim, yan tek şerit sarılıyor, kumaş yine gerçek ölçüsünde; üst ve altta biye, ortada kaplı düğme. Vitrinde Ø 60 × 44 cm, LUMA-05 Karamel.
- **Paylaşım görselinde ORMEN TEKSTİL imzası.** Arka planda büyük, çok soluk (%4,5), eğik ve tekrarlı "ORMEN TEKSTİL" yazısı; sahnenin sağ alt köşesinde küçük, daha belirgin bir imza. Model saydam olarak üstüne çizildiği için yazı mobilyanın arkasında kalıyor, kumaşın üstüne düşmüyor. Görsel kırpılsa da imza bir yerinden görünüyor.

## Ziyaretçi bilgisi, ziyaret sayısı, geri bildirim (11 Ekim)

- **IP kaydı yok.** Fatih Bey "legal olarak siteye girenlerin bilgisine ulaşmamız lazım" dedi. Bildiğimiz kadarıyla 5651'de IP/trafik kaydı yükümlülüğü yer sağlayıcıda (Vercel, Supabase), bizde (içerik sağlayıcı) değil; IP de KVKK'da kişisel veri. Saklamanın amacı yok, yükü var. Ayrıntı ve avukattan istenen teyit: `AVUKAT-PAKETI.md`. Avukat "saklayın" derse eklenir.
- **Günlük ziyaret:** Rapor sayfasında zaten gün gün vardı; panelin ana sayfasına "Ziyaret (bugün)" kartı eklendi (altında son 7 gün). Ziyaret, sekmeye özel rastgele numarayla sayılıyor; kişi değil.
- **Geri bildirim:** Sitenin altındaki renk uyarısının yanında "Geri bildirim" bağlantısı (kioskta yok). Konu (Beğendim / Önerim var / Bir şey çalışmadı / Diğer) + mesaj. Ad, telefon, e-posta, IP alınmıyor; mesajda telefon/e-posta görünürse form uyarıyor. Bot için gizli alan ve aynı kaynaktan 10 dakikada en fazla 5 gönderim (adres yalnızca o an, bellekte, özetlenmiş hâliyle kullanılıyor; yazılmıyor). Panelde "Geri bildirim" sayfasında listeleniyor, tek tek silinebiliyor. Veritabanı: `20261012000000_geri_bildirim.sql` (canlıda çalıştırıldı).

## Panel güvenliği ve güvenlik taraması (11 Ekim)

**İki adımlı doğrulama (Fatih Bey: "çift doğrulama sistemi yapalım").**
- Supabase Auth'un kendi TOTP desteğiyle; ek paket yok, SMS yok (ücretli olurdu). Google Authenticator, Microsoft Authenticator gibi her doğrulama uygulaması çalışıyor.
- Panel → **Güvenlik**: "Aç" → QR kod (okutamayana kurulum anahtarı) → uygulamadaki ilk kodla onay. Kapatmak için de güncel kod isteniyor; açık kalmış bir oturum tek başına kapatamaz.
- Açıldıktan sonra o hesap için zorunlu: şifreden sonra `/panel/giris/dogrulama` sayfası 6 haneli kodu istiyor; kod girilmeden hiçbir panel sayfası, panel API'si ya da işlemi çalışmıyor (oturumun AAL2 olması aranıyor).
- Kapalıyken panelin ana sayfasında kırmızı hatırlatma duruyor. Zorunlu tutmadık: telefonu olmayan bir ekip üyesi de panele girebilsin; Fatih Bey isterse zorunlu yapılır.
- Telefon kaybolursa: Supabase → Authentication → Users → kullanıcı → doğrulama faktörünü silmek (ya da Claude'a söylemek) yeterli.
- **Şifre değiştir** aynı sayfada: şu anki şifre ayrı, geçici bir bağlantıyla doğrulanıyor (panel oturumu bozulmuyor), yeni şifre en az 10 karakter.

**Güvenlik taraması.**
- `npm audit` (çalışan paketler): 0 açık.
- Panel API'leri ve panel işlemleri: hepsi oturumu kendisi denetliyor (yalnızca giriş, kod ve çıkış işlemleri oturumsuz; doğası gereği).
- Depoda gizli anahtar yok.
- **Bulunan ve kapatılanlar:**
  - *Şifre/kod deneme sınırı yoktu.* Supabase kendi sınırını IP başına uyguluyor, ama bütün istekler ona Vercel sunucusundan gidiyor; ziyaretçileri ayıramıyor. Şimdi giriş, doğrulama kodu ve şifre değiştirmede aynı kaynaktan 15 dakikada 10 **hatalı** deneme; doğru girişler sayılmıyor (kendi ekibini kilitlemesin).
  - *Numune formu, kısa bağlantı ve olay sayacı sınırsızdı* (bir betik veritabanını doldurabilir, raporu bozabilirdi). Numune: 10 dakikada 5; kısa bağlantı: 60; olay: 600. Adres yalnızca bellekte, özetlenmiş hâliyle ve pencere süresince tutuluyor; hiçbir yere yazılmıyor. Sınırlar yalnızca Vercel'de çalışıyor; yerel sunucuda ve testlerde (tek makine, ayırt edecek bir şey yok) kapalı.
  - *HSTS başlığı yoktu*: tarayıcı siteyi iki yıl boyunca yalnızca https ile açar.
  - *Demo modunda yüklenen dosyalar* sayfa gibi çalışamaz (CSP sandbox).
  - Supabase: `touch_updated_at` sabit search_path (dün); Supabase'in kendi "RLS'yi otomatik aç" fonksiyonunun herkese açık çağrı izni kaldırıldı.
- **Bilerek bırakılanlar:** `cut_reports` ve `feedback` tablolarına tarayıcıdan erişim yok (yalnızca sunucu yazar); `is_staff()` satır kurallarında kullanıldığı için çağrılabilir, yalnızca "ben personel miyim" der. QR SVG'leri kendi kütüphanemizin çıktısı, kullanıcı metni değil.
- **Sizde:** Supabase → Authentication → "Leaked password protection" (sızdırılmış şifre listesindeki şifreleri reddeder); planınızda varsa açın. 10 Ekim'de geçici olarak verdiğim panel şifresini Güvenlik sayfasından değiştirin; sohbette yazılı kaldı.

## Geniş toplantının (eleştirmenlerle) hemen uygulananları (11 Ekim)

Ayrıntı: `TOPLANTI-2026-10-11-genis.md`.
- **Türkçe "sayfa bulunamadı":** Yanlış yazılan ya da artık geçerli olmayan adres (eski bir QR) Next.js'in İngilizce sayfası yerine ORMEN'in sayfasına düşüyor; oradan ana sayfaya bağlantı var. Durum kodu 404 kalıyor.
- **Model değiştir:** Seçili mobilyanın etiketindeki ad artık bir düğme ("Modüler Kanepe ▾"). Aynı model listesini açıyor; seçilen model yerine geçiyor. Kumaş, bölgeler, desen yönü korunuyor; ayak rengi yalnızca ahşap ayaklı modelde. Yeni model büyükse ve başka bir mobilyaya taşıyorsa en yakın boş yere kayıyor. Kioskta yok (orada yalnızca kumaş denenir).
- **Gerçek kumaşlar önce:** Kumaş listesinde ORMEN'in gerçek kumaşları (bugün MISSO) yer tutuculardan önce. Gruplar kendi içinde sırasını koruyor.
- **Yer tutucu dürüstlüğü:** Yer tutucu bir kumaş seçiliyken künyede "Örnek kumaş · satışta değil". Numune formu yer tutucuyu listelemiyor; sahnede yalnızca yer tutucu varsa gerçek bir kumaş seçilmesini söylüyor ve gönder düğmesi kapalı. Sunucu da yer tutucu kodlu talebi reddediyor (Av. Yalın: olmayan ürünün numunesi istenmemeli).
- **Telefonda alt bölüm:** Renk uyarısı ve "Geri bildirim" tek blok hâlinde akıyor; araç çubuğu bir satır yukarı alındı, çakışma yok.
- **Numune formu:** "Talebi gönder" düğmesi pencerenin altında sabit; dizüstünde kaydırmadan görünüyor.
- **Bekleyen:** biye telefonda kesik görünüyor; gerçek cihazda ölçülmeden değiştirilmeyecek.

## "Bize fikir verin" (11 Ekim, Fatih Bey: "firma adı, isim, telefon ve kısa bir alan")

- "Geri bildirim" bağlantısı **"Bize fikir verin"** oldu. Konu + en fazla 1000 karakterlik "Fikriniz" alanı (önce 500 idi; Fatih Bey "ayarla" dedi).
- Altında **"Size dönelim mi? (isteğe bağlı)"**: Firma adı, Ad soyad, Telefon. Zorunlu yapılmadı: kişisel veri isteyen form, mağazadaki müşteriyi yazmaktan vazgeçirir; isimsiz fikir de değerli. Ad veya telefon yazılırsa ikisi de ve onay kutusu şart ("yalnızca bu mesaja dönüş için"); firma adı isteğe bağlı.
- Panelde sekmenin adı **Fikirler**. Dönüş isteyen mesajın altında ad, firma, tıklanınca arayan telefon ve WhatsApp bağlantısı; ana sayfa kartında "dönüş bekliyor" sayısı.
- **Saklama:** Numune talepleriyle aynı süre (`SAMPLE_RETENTION_DAYS`). Süre dolunca ad, firma ve telefon siliniyor, mesaj kalıyor. KVKK metni buna göre güncellendi.
- Veritabanı: `20261013000000_fikir_iletisim.sql` (canlıda çalıştırıldı). Ad ve telefon ya birlikte ya hiç; telefon `+90…` biçiminde.

## Ar-Ge (11 Ekim, Fatih Bey: "bir tane de argeci bul bize")

- Gerçek bir kişi işe alınamaz. Ekibe temsilî bir Ar-Ge sorumlusu (Dr. Ece Tunalı) eklendi; yol haritası, iş ilanı metni, nereden aranacağı ve başvurulabilecek destekler: `ARGE.md`. Destek programlarının güncel şartları için resmî siteler kontrol edilmeli; tutar uydurulmadı.
- **İlk adım yapıldı:** Panelde kumaşın **düz ölçek ve dikiş kontrolü** (Ölçek kontrol kutusu açılınca). Gerçek boyutta, dikiş köşesi ortada, cetvelle ayarlanabilir 10 cm.
- **İlk bulgu:** MISSO-05'te yatay tekrar çizgisinde görünen fark. Ölçüm (`scripts/olc-dikis.ts`) aydınlatmanın değil, büyük olasılıkla tekrar boyunun (91,5 cm) desenin gerçek dikey tekrarına oturmamasının sebep olduğunu gösteriyor. Gerçek kumaşta ölçülecek. Ayrıntı `ARGE.md`'de.
- **Hav görünümü (A4) Ar-Ge planından çıkarıldı** (Fatih Bey: "abartmasın, yok öyle bir şey"). Sıra: biye (telefon) → kalibrasyon kartı + renk → metraj.
- **Ar-Ge ikinci adım: dikişte minimum hata kesimi.** Ölçüm, MISSO fotoğraflarında gerçek bir dikey tekrar olmadığını gösterdi. Bu yüzden dikişte iki ucu karıştırmak yerine en çok benzedikleri yoldan kesiliyor (image quilting). Dikişteki renk farkı 3–5 kat azaldı (ör. MISSO-05: 32,2 → 11,3). Altı doku yeniden üretildi, tekrar ölçüleri aynı. Kalan ince iz için kumaş en az bir tam tekrar boyunda çekilmeli; çekim rehberine eklendi. Ayrıntı `ARGE.md`.
- **Ar-Ge üçüncü adım: kalibrasyon kartı (A1, ilk sürüm).** Panelden basılan A4 kart, 15 cm'lik kesik pencere ve dört işaret. Panel işaretleri bulup perspektifi düzeltiyor, ölçeği karttan alıyor; kumaş 14,2 × 14,2 cm düz kare olarak hazırlanıyor. Sentetik fotoğraflarda ölçek hatası %0,1'in altında; gerçek çekimle doğrulanacak. Ek paket yok. Ayrıntı `ARGE.md`.
- **Ar-Ge dördüncü adım: kartla renk dengesi (A2, ilk sürüm).** Kalibrasyon kartının beyaz kâğıdı referans; ışığın rengi ve pozlama farkı alınıyor (kâğıt 235'e getiriliyor). Basılı gri yama eklenmedi: yazıcı mürekkebi her kartta başka renk verir. Kâğıt patlamışsa düzeltme yapılmıyor, panel uyarıyor. Sentetik ölçümde ΔE 9–15'ten 0,3–0,5'e iniyor; gerçek telefonun kendi renk işlemi bunu bozar, gerçek çekimle (ColorChecker, ΔE2000) doğrulanacak. Ekran tarafı ayrıca ölçülecek. Ayrıntı `ARGE.md`.
- **Kart denemesi sayfası (`/panel/kart-deneme`).** Kartın gerçek fotoğraftaki hatası, sentetik testle değil, ORMEN'in kendi çekimiyle ölçülsün diye. Milimetrik kâğıt ya da bilinen çizgili kumaş penceredeki aralığı karttan ölçülür, bilinen değerle karşılaştırılır; sonuç kopyalanıp gönderilir. Hiçbir şey kaydedilmez, ek paket yok. Ölçüm kodu (`lib/fabric/measure.ts`) testlerle ortak.
- **Ar-Ge beşinci adım: biye telefonda kesik (A5).** Neden derinlik hassasiyeti: kordonun yarısı minderin içinde, 16 bitlik derinlik tamponu olan telefonda 4 m'den yalnızca ~5 mm ayırt ediliyor. Yakın kesme düzlemi artık sabit 5 cm değil, en yakın mobilyaya uzaklığın yarısı (2–50 cm). Ölçüm (`scripts/olc-biye.ts`, 16 bit taklidi): önden biye 28–38 parçaya bölünüyordu, şimdi 7–8 (bilgisayarda 6–7). Biye kalınlaştırılmadı, kenar yumuşatma değiştirilmedi. Cihazda ekran görüntüsüyle doğrulanacak.
- **Acil toplantı (11 Ekim, `TOPLANTI-2026-10-11-acil.md`):**
  - **"Gerçek boyutta gör":** Kumaş ekranda 1:1 gösteriliyor. Ekran bir kez banka kartıyla ayarlanır (ISO/IEC 7810 ID-1, 85,60 × 53,98 mm). Ayar yalnızca o tarayıcıda kalır ve paneldeki düz ölçek kontrolüyle ortaktır. Kişisel veri yok, paket yok.
  - **Panelde "Kamerayla çek":** Telefonda kamera doğrudan açılıyor. "Kalibrasyon kartı var" seçimi cihazda hatırlanıyor.
  - **Numune sonucu:** "Siparişe döndü / dönmedi" zaten vardı (talep adımları, etiket QR'ı, rapor). Toplantıdan sonra fark edildi; yeni iş yok.
  - **Showroom ekranında döngü:** Karşılama ekranında koltuk yavaşça döner ve yalnızca gerçek kumaşları sırayla giyer. Kumaş göründükten 6 sn sonra sıradakine geçer. İstatistiğe ve adrese yazılmaz. "Hareketi azalt" açıksa dönme yok.
  - **Kumaş geçişi hatası:** Geçiş bitmeden ikinci seçim yapılınca eski geçiş katmanı modelde kalıyordu. Yeni geçiş öncekini bitirerek başlıyor.
- **Gece toplantısı (12 Ekim, `TOPLANTI-2026-10-12-gece.md`):** sabaha kadar 10 iş, veritabanı değişikliği olmadan.
  - **Pilot günü iki adımlı doğrulama:** Vercel'de `PANEL_2FA_ZORUNLU=1`.
    - Doğrulaması kurulmamış hesap yalnızca Güvenlik sayfasına girer. Diğer sayfalar ve panel uç noktaları onu içeri almaz.
    - Doğrulama açıkken kapatılamaz.
    - Ayar silinince eski hâl.
  - **İçerik güvenlik politikası:** Betikler yalnızca siteden; bağlantılar yalnızca site ve Supabase'e.
    - Nonce kullanılmadı: her sayfayı dinamik yapardı. Next'in kendi satır içi betikleri için `'unsafe-inline'` kaldı.
    - Her uçtan uca test politika ihlalini yakalıyor; 69 testte ihlal yok.
  - **3B bağlamı kaybolursa:** Telefon arka plana atılıp dönünce ya da ekran kartı sıfırlanınca sahne yeni tuvalde kendiliğinden kuruluyor. Tarayıcı bağlamı geri verirse hemen, vermezse 2,5 sn sonra. Arada "3B görüntü yeniden hazırlanıyor…" yazıyor.
  - **İstemci hataları:** Ziyaretçinin tarayıcısındaki yakalanmamış hatalar ve bağlam kaybı `/api/hata`'ya gidiyor, yalnızca sunucu kaydına (Vercel) yazılıyor. Veritabanına yazılmıyor.
    - E-posta, telefon benzeri sayılar ve adres sorguları siliniyor.
    - Sayfa başına en çok 5 bildirim gidiyor; hız sınırlı.
    - KVKK metnine bir cümle eklendi.
  - **Kart bulunamazsa:** Kaç işaretin görüldüğüne göre somut öneri veriliyor (hiç / 1–3 / kare oluşmuyor).
  - **Erişilebilirlik:** axe denetimi WCAG 2.1 AA'ya çıkarıldı.
    - Yeni ekranlar da denetleniyor: Gerçek boyutta, Bize fikir verin, Paylaş, Model değiştir, kiosk karşılaması, bulunamayan sayfa, yeni panel sayfaları. Telefon görünümü de dahil.
    - Bulunan 2 sorun düzeltildi:
      1. Varsayılan altın vurgunun üstündeki beyaz yazı 3,1:1'di; koyu yazı yapıldı (4,6:1). `inkFor()` zaten bunu seçiyordu.
      2. Kiosk düğmesi saydamlıkla yanıp sönüyordu; yazısı soluklaşıyordu. Artık boyutça "nefes alıyor" ve "hareketi azalt"a uyuyor. Hazır olmayan "Görseli indir" bağlantısı ekran okuyucuya da pasif bildiriliyor.
  - **Föyde gerçek boyut:** Müşteri föyünde her kumaşın 5 × 5 cm gerçek boyut karesi var (en çok 3). Kareler santimetre biriminde basılıyor.
    - Yanında 5 cm'lik kontrol çizgisi var; tutmazsa baskı ölçeklenmiştir.
    - Yer açmak için görsel 105 mm'den 80 mm'ye indi. Föy hâlâ tek A4.
  - **Bulanık fotoğraf uyarısı (panel):** İnce ayrıntının kaba ayrıntıya oranı ölçülüyor. 30 katalog görselinde net olanların hiçbiri uyarı almıyor; belirgin bulanıklığın yarısı yakalanıyor. Hafif bulanıklık ve düz kumaş yakalanmıyor. Yalnızca uyarı, kaydı engellemez. Ayrıntı `ARGE.md`.
  - **Daha az JavaScript:** Diyaloglar, föy ve oda paneli ilk açılışta değil, kullanılınca yükleniyor. three.js artık sayfa açılışında değil, 3B sahneyle geliyor.
    - Telefonda açılışta inen JavaScript 303 kB'tan 179 kB'a indi (%41, sıkıştırılmış). Toplam değişmedi (506 kB); sahne zaten three.js istiyor.
    - Ölçüm: `scripts/olc-js.ts`.
- **Acil toplantı (16 Ekim, `TOPLANTI-2026-10-16-acil.md`):** Kod dondurma; pilot firma gelene kadar yeni özellik yok.
  - **Canlı veri:** 65 ziyaret, son 4 günde 10; QR/paylaşım/kiosk kaynağı 0; pilot firma yok; 6 gerçek kumaş.
  - **Açık talep:** 9 gündür bekleyen 1 numune talebi.
  - **Güvenlik:** Panel şifresi hâlâ sohbetteki geçici şifre, iki adımlı doğrulama kapalı. Bugün Fatih Bey'de.
