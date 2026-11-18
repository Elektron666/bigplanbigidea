# Showroom ekranı kurulumu

Yeni bir mağazaya ORMEN Atelier ekranını kurma adımları. Her adımın yanında yaklaşık süresi var. Hepsi tarayıcıdan ve ekranın kendisinden yapılır; kod bilgisi gerekmez.

> **Durum (18 Kasım 2026):** Bu belge Showroom Paketi yazıldıkça büyüyor. Bugün çalışan adımlar aşağıda. Henüz yazılmamış olanlar en altta, "Sonra gelecek" başlığında listeli. Bir adımın ayrıntısı ve gerekçesi `KARARLAR.md`'de.

## Gerekenler

- 27–32 inç dokunmatik ekran, Android 11 veya üstü, güncel Google Chrome.
- Mağazada Wi-Fi. Ekran ilk açılışta ve eşleşirken internete bağlanmalı; sonrasında internet kesilse de çalışır (aşağıda "İnternet kesilirse").
- Panelde "kurulum" yetkisi olan bir hesap (ORMEN yöneticisi ya da ORMEN elemanı).

## 1. Mağazayı açın (5 dakika)

1. Panel → **Firmalar** → **Yeni firma**: ad, logo (PNG), renk, WhatsApp numarası → **Kaydet**.
2. Panel → **Katalog**: mağazaya verilecek ürünleri soldan, mağazayı sağdan işaretleyin → **Mağazalara ekle**.
3. Mağazanın sayfasında **Bu mağazada nasıl görünsün** bölümünde, isterseniz ürünlere mağazanın kendi adını ve kodunu verin; vitrinde dönmesini istediklerinizi **Öne çıkar** ile işaretleyin.

## 2. Mağaza PIN'ini girin (1 dakika)

Mağazanın sayfası → **Cihazlar** → **Mağaza PIN'i**: 4–6 rakam → **PIN'i kaydet**.

- 1234, 0000 gibi kolay PIN'ler kabul edilmez.
- PIN'i mağaza sahibine sözlü verin; hiçbir yere yazılmaz, panelde de görünmez. Unutulursa yenisini girersiniz.
- **PIN girilmeden ekrandan çıkılamaz.** Kurulumdan önce girin.

## 3. Ekranı eşleştirin (3 dakika)

1. Panelde mağazanın sayfası → **Cihazlar** → **Ekranın adı** (ör. "Giriş ekranı"), birden çok şube varsa **Şube** → **Cihaz ekle**. Ekranda 6 haneli bir kod çıkar; 10 dakika geçerlidir ve bir kez kullanılır.
2. Mağazadaki ekranda Chrome'u açın ve şu adrese gidin: `atelier.ormentekstil.com.tr/showroom`
3. Ekrandaki tuş takımıyla kodu yazın. Ekran mağazanın showroom'unu açar; bir daha kod sormaz.
4. Panelde sayfayı yenileyin: ekran listede **Güncel** görünmelidir.

Kod süresi geçtiyse ya da yanlış yazıldıysa ekran "Kod hatalı ya da süresi geçti" der; panelden yeni kod alın.

## 4. Ana ekrana ekleyin (2 dakika)

Chrome'da sağ üstteki menü (⋮) → **Ana ekrana ekle** (ya da **Uygulamayı yükle**) → **Ekle**.

Ekranda mağazanın adı ve simgesiyle bir uygulama belirir. Bundan sonra ekran o simgeden açılır: tam ekran, adres çubuğu yok, ORMEN ya da tarayıcı adı görünmez.

## 5. Android kilidi (10 dakika)

Uygulamanın kendi kilidi, ekrandaki bağlantıların dışarı çıkmasını engeller. Android'in sistem düğmelerini ve bildirim çubuğunu ise yalnızca cihazın kendi kilidi kapatabilir. İki yoldan birini seçin:

**A. Uygulama sabitleme (ek uygulama gerekmez)**

1. **Ayarlar → Güvenlik (ya da Güvenlik ve gizlilik) → Diğer güvenlik ayarları → Uygulama sabitleme** → açın. "Sabitlemeyi kaldırmadan önce PIN iste" seçeneğini de açın.
2. Showroom uygulamasını açın → son uygulamalar düğmesi → uygulamanın simgesine basılı tutun → **Sabitle**.

Menü adları üreticiye göre değişir (Samsung'da "Uygulamaları sabitle"). Ekran yeniden başlarsa sabitleme kalkar; yeniden sabitleyin ya da B yolunu kullanın.

**B. Kiosk başlatıcı**

Ekran sağlayıcınızın kiosk modu ya da Google Play'deki bir kiosk başlatıcı ile ekranın yalnızca showroom uygulamasını açmasını sağlayın; açılışta otomatik başlatmayı da açın. Hangi uygulamanın kullanılacağı ekranın markasına bağlıdır.

**Her iki yolda:**

- **Ayarlar → Ekran → Ekran zaman aşımı**: en uzun süre ya da "hiçbir zaman". Ekran kararmamalı.
- **Ayarlar → Pil**: Chrome için pil iyileştirmesini kapatın; arka planda kapatılmasın.
- Ses: dokunma seslerini kapatın.

## 6. Kamera ve kartela etiketleri (10 dakika)

**Kamera izni (bir kez):** Ekranda showroom'u açın → **Kartela okut** → Chrome kamera izni sorar → **İzin ver** (ya da "Bu siteyi ziyaret ederken"). İzni kalıcı yapmak için Chrome → ⋮ → **Ayarlar → Site ayarları → Kamera** → `atelier.ormentekstil.com.tr` → **İzin ver**. Ana ekrana eklenmiş uygulama aynı izni kullanır. İzin bir kez verilince bir daha sorulmaz.

Kamera izni verilmezse ya da ekranın kamerası yoksa **Kartela okut** düğmesi görünmez; satıcı kodu "Elinizdeki kartelanın kodu" kutusuna yazar.

**Etiketler:** Panel → **Kumaşlar** → mağazadaki kartelaların kumaşlarını işaretleyin → "Telefonla okutulunca açılacak sayfa" kısmında mağazayı seçin → **Seçilenlerin etiketini aç** → **Yazdır**. Kâğıt: L7159 tipi A4 yapışkan etiket (3 × 8). Yazdırırken ölçek %100. Etiketi kartelanın ön yüzüne, kıvrılmayan düz bir yere yapıştırın.

**Deneyin:** Etiketi ekranın kamerasına 20–40 cm'den tutun; koltuk 1–2 saniyede o kumaşa geçmelidir. Okumazsa etiketi biraz yaklaştırın, ışığın etikete yansıyıp parlamadığına bakın.

## 7. Son kontrol (3 dakika)

- [ ] Ekran bir dakika dokunulmadan bekleyince koltuk yavaşça döner ve kumaşlar sırayla değişir.
- [ ] Ekrana dokununca showroom hemen açılır.
- [ ] Logoya hızlıca 5 kez dokunun → **Mağaza PIN'i** sorulur → PIN'i yazın → **Ekran ayarları** açılır → **Güncellemeleri denetle** "Ekran güncel" der → **Showroom'a dön**.
- [ ] Wi-Fi'yi kapatın, ekranı yeniden açın: showroom açılır, altta "İnternet bağlantısı yok" yazar, kumaş denemesi çalışır. Wi-Fi'yi geri açın: yazı kaybolur.
- [ ] Bir kartela etiketini kameraya tutun: koltuk o kumaşa geçer.
- [ ] Panelde ekran **Güncel** görünüyor.

## Gündelik işler

**Ekrandan çıkmak:** Logoya 3 saniye içinde 5 dokunuş → PIN → **Tam ekrandan çık**. Kilidi açmak için Android'in kendi yolunu kullanın.

**Güncellemeler:** Panelde yapılan her değişiklik (yeni ürün, ad, kumaş) ekrana kendiliğinden gelir. Ekran 2 dakikada bir sorar; müşteri ekrandayken görüntü değişmez, ekran boşa düşünce uygulanır. Beklemek istemezseniz panelde ekranın yanındaki **Şimdi eşitle** düğmesine basın.

**İnternet kesilirse:** Ekran açılmaya devam eder. Mağazanın modelleri ve bütün kumaşları cihazda saklıdır; kumaş deneme, kartela kodu ve "Telefona al" çalışır. "Numune iste" bağlantı gelene kadar kapalıdır. Kullanım kayıtları cihazda bekler, bağlantı gelince bir kez gönderilir.

**Mağazayı askıya almak:** Panel → **Mağazalar** → **Askıya al**. Ekran bir sonraki denetimde (en geç 2 dakika) "Ekran kısa bir süre için kapalı" yazısına geçer. **Geri aç** deyince kaldığı yerden devam eder; hiçbir şey silinmez.

**Ekranı kaldırmak (yalnızca ORMEN yöneticisi):** Mağazanın sayfası → **Cihazlar** → ekran → **Kaldır** → **Evet, kaldır**. Ekran o an kilitlenir ve yeniden kod ister. Çalınan ya da el değiştiren ekran için kullanın.

## Sonra gelecek

Bu adımlar ilgili iş yazıldığında buraya eklenecek:

- Metraj, fire katsayıları ve teklif ayarları (İş 3).
- Köşe modül setinin yüklenmesi (İş 4).
- Mağaza bazında özellik açma, kota ve vitrin süresi ayarları (İş 0'ın kalanı).
- Kalite profili (hafif / tam) panelden seçme (İş 1'in son parçası).
