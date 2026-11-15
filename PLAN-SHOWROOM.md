# PLAN-SHOWROOM

ORMEN Atelier'e eklenecek Showroom Paketi'nin (İş 0–16) uygulama planı. Görev tanımı: `ORMEN Atelier — Showroom Paketi, tam kapsam`. Tarih: 15 Kasım 2026.

**Durum: sorular cevaplandı (aşağıda), Dalga 1 başladı. İlerleme: `KARARLAR.md`.**

**Cevaplar (Fatih Bey, 15 Kasım):** kod bu depoda kurulur, `ormen3xd`'den alınır · para harcanmaz (ücretli sağlayıcı çağrısı yok, e-posta servisi yok) · kumaş eni 140 cm · numune akışı aynen kalır.

---

## 1. Kodu okudum: bugün ne var

Kaynak: `Elektron666/ormen3xd`, dal `claude/ecstatic-curie-vymdi7` (yayındaki dal), son kayıt `d5cb8aa`. Canlı Supabase projesi `ormen-atelier` (Frankfurt): 10 göç dosyası işli; 29 kumaş, 12 model, 1 firma, 370 olay, 1 numune talebi.

| Konu | Bugünkü hâli | Plana etkisi |
|---|---|---|
| Çatı | Next.js 16.3, React 19, three.js / R3F, Tailwind 4, Supabase, Vercel `fra1` | Aynı kalıyor. Next 16 kuralları için `node_modules/next/dist/docs/` okunacak (`AGENTS.md` şartı) |
| Veri katmanı | Tek kapı: `lib/data/repository.ts` (`Repository`), iki uygulama: bellek ve Supabase | Her yeni tablo bu arayüze eklenir; bellek uygulaması da yazılır ki Supabase'siz geliştirme ve testler çalışsın |
| Yetki | Yalnızca ORMEN kullanıcısı var (`profiles`, `is_staff()`); sunucu service role ile yazar | **En büyük değişiklik.** Mağaza kullanıcısı ve cihaz kimliği yok; satır düzeyi yetki bugün "personel mi" sorusundan ibaret |
| Roller | `profiles.role`: `admin`, `staff` (ayrım kullanılmıyor) | Karşılığı var: `admin` = ORMEN yöneticisi, `staff` = ORMEN elemanı. Yeni rol sütunu uydurulmayacak |
| Ürün | `models.firm_id` boş = ORMEN vitrin modeli; dolu = firmaya ait. `firm_models` = firmanın seçtiği vitrin modelleri | "Ortak" ve "mağazaya özel" ayrımı zaten bu. Veri taşımaya gerek yok; yalnızca sütun eklenir |
| Kumaş | Merkezî `fabrics`; firma bazında `firms.fabric_series` (seri listesi) | "Koleksiyon" = mevcut `series`. Tek kumaş kapatma için küçük bir ek tablo |
| Metraj | `models.meterage_m`, `meterage_ref_width_cm`, `meterage_zones` (kasa, kol, oturak, sırt); `lib/metraj.ts` sayıyı yalnızca aynı en + düz + çift yönlü kumaşta gösterir | İş 3 bunun üstüne kurulur; kural değişiyor (bkz. §3, karar 2) |
| Kiosk | `?kiosk`: karşılama, 90 sn bekleme, sıfırlama, vitrin döngüsü (yalnızca kumaş döner), kartela kodu kutusu | İş 1 bunu genişletir; `?kiosk` adresi çalışmaya devam eder |
| Kalite | `lib/three/quality.ts`: üç kademe, kare hızına göre piksel oranı düşer | "Hafif / tam" profil bunun üstüne oturur |
| Olay kaydı | `events` (8 tür, anonim), `atelier_report` SQL fonksiyonu | Genişletilir (§9) |
| Oda | Dikdörtgen, L, köşe oda; yerleşim, plan, çakışma denetimi (`lib/room/*`) | İş 9 ve 14 bunu kullanır; kapı ve pencere yeni |
| Köşe | Parametrik köşe / U / şezlonglu takım (`lib/parametric`) koddan üretiliyor | İş 4'ün örnek modül seti bu üreticiden GLB olarak çıkarılır |
| Yapay zekâ | `lib/ai/reupholster.ts`: yalnızca arayüz ve sahte uygulama | İş 5 bu arayüzü doldurur |
| PDF | Kütüphane yok; "Föyü yazdır" tarayıcının yazdırmasını kullanıyor | Kioskta yazdırma penceresi açılamaz; gerçek PDF üretimi gerekiyor (§3, karar 6) |
| Çevrimdışı | Servis çalışanı ve uygulama bildirimi (manifest) yok. Yol haritasında açık madde | İş 1'de yazılacak |
| Bildirim | Otomatik bildirim yok. Numune talebi panel listesine düşer; WhatsApp düğmesi elle basılır | Soru 3 |
| Test | Vitest (şema PGlite ile denenir), Playwright uçtan uca, axe erişilebilirlik | Aynı düzen; satır düzeyi yetki PGlite'ta denenecek |

---

## 2. Yaklaşım

- **Yeniden yazma yok.** Yeni ekranlar mevcut `Configurator`, `KioskShell`, `Stage`, `PrintSheet`, `lib/room`, `lib/metraj` üstüne eklenir. Tasarım dili (renkler, yazı tipleri, `components/ui`) aynen kullanılır.
- **Her iş bir özellik bayrağının arkasında.** `firms.features` (jsonb) içinde iş başına bir anahtar. Bayrak kapalıyken firma bugünkü davranışı görür; mevcut firmalar için hepsi kapalı başlar.
- **Göç dosyaları yalnızca ekler.** Sütun ve tablo ekler; silmez, dönüştürmez. Her dosyanın `supabase/geri-al/` altında eşi olur; PGlite testinde "uygula → geri al → uygula" denenir.
- **Canlı veritabanına dokunmuyorum.** Geliştirme PGlite ve bellek deposuyla yapılır. Göç dosyaları canlıya ancak her dalganın sonunda, sizin onayınızla uygulanır.
- **Her dilimden sonra** mevcut özellikler elden geçirilir: `npm test`, `npm run test:e2e`, `typecheck`, `lint`, artı Bölüm 1'deki dört maddenin elle denemesi.
- **Dürüst sınır:** Bu ortamda gerçek Android cihaz, kamera ve basılı etiket yok. Bunlara bağlı ölçütler (QR'ın 20–40 cm'den 2 sn'de okunması gibi) benzetimle denenir ve `TEST-SHOWROOM.md` içinde "cihazda doğrulanacak" diye ayrı işaretlenir; geçti diye yazılmaz.

---

## 3. Sormadan verdiğim kararlar (KARARLAR.md'ye yazılacak)

Görev tanımı bazı eski kararlarla çelişiyor. Yeni tanım geçerli sayıldı; her biri gerekçesiyle kayda geçecek.

1. **Fiyat.** Eski karar "fiyat yok". Yeni: teklifte elle fiyat alanı ve satıcı modunda firma fiyatı. Sepet, ödeme ve ORMEN fiyatı yine yok.
2. **Metraj kuralı.** Eski kural sayıyı yalnızca düz ve çift yönlü kumaşta gösterip gerisinde "usta hesaplar" diyordu. Yeni: parça metrajı × (1 + fire katsayısı), yuvarlama adımına yukarı. Üç katsayı (düz, desen yönü çevrilmiş, raporlu) panelden girilir ve **boş başlar**; boşken fire eklenmez, teklifte "fire dahil değildir" yazar. Varsayılan sayı önermiyorum. Kumaş eni farklıysa ne olacağı: Soru 4.
3. **Oda.** "Kapı ve pencere yok, oda kurucu donduruldu" kararı İş 9 için kalkıyor. Serbest duvar çizimi, kat planı ve çok oda yine yok.
4. **"Kendi koltuğunda gör".** Vitrinden kaldırılmıştı; İş 5 ile geri geliyor. Fotoğraf yurt dışındaki bir sağlayıcıya gittiği için `AVUKAT-PAKETI.md`'ye bir madde eklenecek.
5. **Satıcı hesabı yok.** "Satıcı" rolü ayrı kullanıcı olarak açılmaz; eşleşmiş cihaz + firma PIN'i ile çalışır. Mağaza başına hesap sayısı bir kalır, şifre unutma desteği çıkmaz.
6. **PDF kütüphanesi.** Ücretsiz ve açık kaynak `pdf-lib` (+ `@pdf-lib/fontkit`) eklenir; Türkçe karakter için sitenin kendi yazı tipi belgeye gömülür. Aynı kod tarayıcıda (çevrimdışı teklif) ve sunucuda (telefona giden bağlantı, aylık özet) çalışır. Ücretli bağımlılık değil.
7. **QR okuma.** Android Chrome'un yerleşik `BarcodeDetector`'ı; olmayan cihazda ücretsiz `jsQR`. Çevrimdışı çalışır.
8. **Kademeli yayın.** Tek Vercel yayını olduğu için kod mağaza mağaza dağıtılamaz. Kademeli yayın özellik bayrağı ve içerik düzeyinde yapılır: kod herkese gider, yeni özellik yalnızca seçilen mağazalarda açılır.
9. **Mağaza müşterisinin verisi.** Teklifteki müşteri adı ve İş 13'teki ad / telefon yalnızca firmanın satır kuralıyla okunur. ORMEN kullanıcısına bu tablolarda okuma kuralı hiç tanımlanmaz; "Mağaza gibi görüntüle" bu alanları maskeler. Mevcut numune talepleri: Soru 5.
10. **Oturum fotoğrafları** herkese açık `atelier` klasörüne değil, yeni ve kapalı bir klasöre (`oturum`) konur; süreli imzalı adresle gösterilir.
11. **Örnek modül seti** elle modellenmez; mevcut parametrik üreticiden GLB olarak çıkarılır. Demo kalitesinde sayılmaz, ekranda "Örnek set" ibaresi taşır.

---

## 4. Ortak altyapı (İş 0 ile gelir, her iş kullanır)

**Kimlik ve yetki, üç kapı:**

| Kim | Nasıl tanınır | Veriye nasıl ulaşır |
|---|---|---|
| ORMEN yöneticisi / elemanı | Supabase Auth + `profiles.role` (bugünkü giriş, iki adımlı doğrulama) | `is_admin()` / `is_staff()` satır kuralları. Fiyat, abonelik ve silme kurallarında yalnızca `is_admin()` |
| Mağaza sahibi | Supabase Auth + yeni `firm_members(user_id, firm_id)` | Kendi oturum anahtarıyla; kural: `firm_id in (select my_firm_ids())`. Service role kullanılmaz |
| Cihaz (showroom ekranı) | Eşleştirmede verilen rastgele 256 bit anahtar; `httpOnly` çerezde, veritabanında özeti | Yalnızca `showroom_*` adlı veritabanı fonksiyonları. Fonksiyon anahtardan firmayı kendisi bulur; istemci firma numarası gönderemez |

Böylece "başka mağazanın verisi" arayüzde değil veritabanında kapalıdır. PGlite testi: A firmasının kullanıcısı ve cihazı, B firmasının teklif, müşteri, model ve rapor satırlarını adresini bilse de okuyamaz, yazamaz.

**Ortak tablolar (öneri adlar; hepsi yeni, hepsi eklemeli):**

- `firms` yeni sütunlar: `features jsonb`, `settings jsonb` (vitrin süresi, kota, güncelleme modu, geçiş payı eşiği…), `content_version bigint`, `status` (pilot, aktif, askıda, ayrıldı), `city`, `region`, `package`, `tags text[]`, `owner_contact`, `installed_at`, `pin_hash`.
- `firm_members`, `firm_templates`, `subscriptions` (tutar, dönem, son ödeme, ödendi).
- `devices` (firma, şube, ad, anahtar özeti, son görülme, uygulama ve içerik sürümü, eşitleme durumu, kalite profili), `device_pairings` (6 haneli kod, 10 dk ömür).
- `audit_log` (kim, ne zaman, hangi mağaza / ürün, önce, sonra, toplu işlem numarası).
- `firm_models` yeni sütunlar: `display_name`, `product_code`, `price`, `description`, `featured`, `hidden`. `models` yeni sütunlar: `manufacturer`, `category`, `style_tags`, `parts jsonb` (ek parçalar: kırlent vb.).
- `firm_fabric_off(firm_id, fabric_id)`: tek kumaşı mağazada kapatmak için.

**İçerik sürümü:** `content_version`, o mağazayı etkileyen her değişiklikte tetikleyiciyle artar (atama, ad, fiyat, ayar, bayrak; merkezdeki ürün ya da kumaş değişince atandığı bütün mağazalarda).

---

## 5. Dalga 1

### İş 0 — Merkez panel, merkez katalog, uzaktan güncelleme

- **Dosyalar:** yeni `app/panel/(korumali)/magazalar/*`, `cihazlar/*`, `katalog/*`, `gunluk/*`, `genel-bakis`; yeni `app/magaza/*` (mağaza paneli); `lib/auth/panel.ts` + yeni `lib/auth/roles.ts`, `lib/auth/device.ts`; `lib/data/*` (arayüz ve iki uygulama); yeni `lib/sync/*`, `app/api/showroom/esitle`; `components/panel/PanelNav.tsx`; `scripts/ornek-buyuk-veri.ts`.
- **Şema:** §4'teki tabloların tamamı; `showroom_manifest(token)` fonksiyonu; liste ekranları için özet görünümler.
- **Eşitleme:** Cihaz açıkken 2 dakikada bir ve vitrin döngüsüne girerken sürüm sorar. Yeni içerik arka planda iner; müşteri ekrandayken uygulanmaz, ekran boşa düşünce uygulanır. Onaylı modda "Güncelleme hazır · Şimdi yükle" bekler. Cihaz ara sürümleri istemez, hep son hâli alır. Uygulama kodu servis çalışanıyla aynı kurala uyar; yeni sürüm açılmazsa önceki önbellek kalır.
- **Riskler:** (1) Yetki katmanı değişirken mevcut panelin bozulması: eski yollar aynen kalır, yeni kurallar eklenir, eski testler koşar. (2) Mevcut "firma hiç model seçmediyse vitrini göster" kuralı korunur. (3) 2.000 ürün × 100 mağazada tetikleyici maliyeti: toplu atamada tek sürüm artışı.
- **Test:** PGlite'ta yetki matrisi (4 rol × tablo × işlem); eleman rolünün fiyat, abonelik ve silmeye doğrudan API çağrısıyla da ulaşamadığı; 15 mağazaya atama ve merkezde metraj düzeltince 15 teklif hesabının değişmesi; özel ürünün başka mağazaya atanmasının reddi ve kaydı; 100 mağaza / 2.000 ürün / 300 cihazlık örnek veride liste sürelerinin ölçümü; Playwright'ın saatiyle "5 dakika içinde görünür, müşteri varken değişmez", "bir hafta çevrimdışı → tek eşitleme".

### İş 1 — Showroom modu

- **Dosyalar:** yeni `app/showroom/page.tsx`, `app/showroom/manifest.webmanifest/route.ts`, `public/sw.js` (ya da Next'in önerdiği yol), `lib/offline/*` (önbellek, kuyruk); `components/kiosk/KioskShell.tsx`, `lib/kiosk.ts` (vitrin döngüsüne model değişimi, firma süresi); `lib/three/quality.ts` (hafif / tam profil, açılış ölçümü); `next.config.ts` (servis çalışanı ve kamera için başlıklar); panelde cihaz bölümü.
- **Şema:** İş 0'daki `devices`, `device_pairings`; `firms.settings` içinde vitrin süresi ve öne çıkanlar.
- **Çevrimdışı kuyruk:** Teklif, sipariş talebi ve olaylar IndexedDB'de bekler. Her kayıt cihazda üretilen bir numara taşır; sunucuda bu numara tekildir, aynı kayıt iki kez yazılamaz. Saklama alanı dolarsa en eski kullanılmayan doku atılır.
- **Kilit:** Tam ekran, bağımsız pencere (firma simgesi ve açılış ekranı), dış bağlantı yok, uzun basma / yakınlaştırma / aşağı çekme kapalı. Çıkış: logoya 5 dokunuş + firma PIN'i.
- **Riskler:** Servis çalışanı yanlış önbellekle eski sürümde takılabilir (sürümlü önbellek ve "son çalışan sürüm" geri dönüşü). Android'in kendi kilidi kod işi değil; `KURULUM.md`'de anlatılır.
- **Test:** Çerezli tarayıcıyı kapatıp açınca kod sormaması; `context.setOffline(true)` ile yenileme → 3D, kumaş değişimi, teklif; ağ açılınca tek kayıt; saatle 60 sn → vitrin, dokunuşla 300 ms içinde çıkış, önceki oturum verisinin yokluğu; işlemci kısıtlamalı (4×) Chromium'da kare hızı ve 500 ms kumaş değişimi (`?olcum` ekranıyla; gerçek cihaz ölçümü ayrıca işaretlenir); bütün bağlantıların taranması (dış adres ve panel yok).

### İş 2 — Sihirli kartela

- **Dosyalar:** yeni `components/kiosk/KartelaScanner.tsx`, `lib/kartela/qr.ts`; mevcut `app/panel/aski/[id]` (A4 etiket sayfası zaten var; kumaş listesinden seçim eklenir); `lib/fabric/code-match.ts` (kod yaz alanı için aynen kullanılır).
- **Şema:** yok. QR mevcut kısa adresi taşır; cihaz adresi çözer, telefon aynı adresle firma sayfasını açar.
- **Riskler:** Parlak ekran ve basılı etiket mesafesi yalnızca gerçek cihazda ölçülür. Kamera izninin kalıcılığı kiosk tarayıcısına bağlı (`KURULUM.md`).
- **Test:** Sahte kamera akışına basılı etiket görüntüsü verilerek okuma → kumaş geçişi (boş ya da gri koltuk karesi olmadığı ekran görüntüsü dizisiyle); tanınmayan ve kapalı kod uyarısı; kamerasız cihazda "kod yaz"; çevrimdışı okuma.

### İş 3 — Metraj ve teklif

- **Dosyalar:** `lib/metraj.ts` (yeni hesap; eski işlevler usta föyü için kalır), yeni `lib/teklif/*` (hesap, numara, PDF), `components/configurator/QuoteDialog.tsx`, `app/t/[kod]/page.tsx` (telefona giden teklif), `app/api/teklif`, `app/api/siparis-talebi`, panelde `teklifler` ve `siparis-talepleri`; `components/panel/MeterageFields.tsx`.
- **Şema:** `quotes` (firma, cihaz, numara, içerik, müşteri adı, not, fiyat, toplamlar, istemci numarası tekil), `order_requests` (`quote_id` tekil → aynı teklife iki basış tek talep), `meterage_settings` (üç fire katsayısı ve yuvarlama adımı; katsayılar boş).
- **Riskler:** Sayı para demek; yanlış toplam güveni bitirir. Hesap tek bir saf işlevde, her adımı açıklama satırı üretir; aynı işlev ekranda, PDF'te ve sipariş talebinde kullanılır.
- **Test:** Üç kumaşlı kombinasyonun elle hesabı test dosyasında adım adım yazılı ve birebir karşılaştırılır; katsayı boş / dolu iki durum; PDF'in tek sayfa olması, Türkçe karakterlerin metin olarak çıkarılabilmesi (ş, ğ, ı, İ), logosuz firma; çift basışta tek talep; A firmasının B'nin teklif adresine erişememesi.

### İş 4 — Köşe kurucu

- **Dosyalar:** yeni `lib/modul/*` (dizilim, bağlantı noktaları, ölçü, aynalama, geçerlilik), `components/configurator/CornerBuilder.tsx`, `components/three/ModuleRun.tsx`; panelde `modul-setleri`; `scripts/ornek-modul-seti.ts`; `lib/share.ts` (dizilimin bağlantıya yazılması).
- **Şema:** `module_sets` (ad, sahip firma ya da ortak), `modules` (tip, GLB, en × derinlik × yükseklik, sol / sağ bağlantı noktası, parça metrajları), `firm_module_sets`.
- **Riskler:** Gerçek GLB'lerde bağlantı noktası hatası çakışan modül üretir: panelde yükleme sırasında ölçü ve nokta denetimi. Sürükle-sırala dokunmatik ekranda 3D döndürmeyle karışabilir: sıralama alttaki şeritte yapılır.
- **Test:** Dizilim mantığı saf işlev olarak birim testli (toplam ölçü = modül ölçüleri toplamı, aynalama iki kez = aynı dizilim); 3,15 × 2,40 m L köşenin yalnızca dokunuşla kurulduğu uçtan uca test (adım sayısı ve süre raporlanır); metrajın teklife aktarımı; 8 modülde kare hızı ölçümü.

### İş 5 — Anında giydirme

- **Dosyalar:** `lib/ai/reupholster.ts` (arayüz genişler), yeni `lib/ai/providers/*`, `lib/ai/etiket.ts` (etiketi görsele işler; `sharp` çalışma bağımlılığına alınır), `app/api/giydirme/*`, `app/yukle/[kod]/page.tsx` (telefondan yükleme), `components/kiosk/PhotoTryOn.tsx`, panelde `giydirme-testi`.
- **Şema:** `ai_calls` (firma, cihaz, sağlayıcı, süre, tahmini maliyet, sonuç), `photo_sessions` (tek kullanımlık kod, süre sonu), `firm_photos` ("ürün fotoğrafı olarak sakla"), `ai_test_runs` / `ai_test_items`; `firms.settings.aylik_kota` (boş başlar).
- **Riskler:** (1) Hiçbir model desen ölçeğini garanti etmez; bu yüzden etiket görsele işlenir ve saha kararı test sayfasına bırakılır. (2) 45 sn ölçütü sağlayıcı süresine bağlı. (3) Fotoğraf silme: oturum bitince çağrı + her istekte süresi geçenlerin süpürülmesi + günlük zamanlanmış temizlik.
- **Test:** Sahte sağlayıcıyla bütün akış (kota dolunca çağrı yok ve maliyet satırı yok; başarısız çağrı kotadan düşmez; zaman aşımı 60 sn); etiketin indirilen dosyada piksel olarak bulunması; oturum sonunda dosyanın depoda olmaması. **Gerçek sağlayıcıyla çağrı yalnızca onayınız ve anahtarınız geldikten sonra.**

#### Sağlayıcı karşılaştırması

> **Önemli sınır:** Sağlayıcıların resmî belge siteleri (`ai.google.dev`, `docs.bfl.ai`, `developers.openai.com`) bu oturumun ağ izninde yok; açılamadı. Aşağıdaki sayılar 15 Kasım 2026 tarihli arama sonuçlarından, çoğu ikincil kaynaktan alındı ve kaynaklar birbiriyle yer yer çelişiyor. **Doğrulanmamış** kabul edin. Anahtar almadan önce fiyat sayfasına siz bakın ya da bu üç alan adına izin verin, tabloyu resmî belgeden yeniden yazayım.

| | Google Gemini görsel modelleri ("Nano Banana" ailesi) | Black Forest Labs FLUX.2 (pro / flex) | OpenAI GPT Image |
|---|---|---|---|
| Girdi fotoğrafı + kumaş referansı | Evet; birden çok girdi görseli. Pro sürümde 14'e kadar bildiriliyor | Evet; API'de 8 referansa kadar bildiriliyor | Evet; düzenlemede çok girdi (16'ya kadar bildiriliyor) |
| Görsel başı maliyet (yaklaşık 1 MP) | Hızlı sürüm yaklaşık 0,03–0,07 $; Pro yaklaşık 0,13 $ | Megapiksel başı: pro düzenleme yaklaşık 0,045 $/MP, flex yaklaşık 0,10 $/MP; girdi görselleri ayrıca ücretli. Kaynaklar çelişkili | Orta kalite yaklaşık 0,05 $, yüksek yaklaşık 0,21 $; girdi görseli ayrıca |
| Süre | Belgeden doğrulanamadı; test sayfası ölçecek | Belgeden doğrulanamadı | Belgeden doğrulanamadı; yüksek kalitede 45 sn ölçütü için en riskli aday |
| Kullanım koşulları | Ücretli katman; çıktıda görünmez SynthID işareti | Almanya merkezli (KVKK açısından artı); çıktıda C2PA bilgisi bildiriliyor | Kuruluş doğrulaması isteyebilir |
| Doku ve desen ölçeğini koruma | Hiçbiri garanti etmiyor; belgelerde ölçülmüş bir değer bulamadım. Tek güvenilir ölçü kendi 20 fotoğraflık testimiz | aynı | aynı |
| Dikkat | Model adları ve kapanış tarihleri hızlı değişiyor (ilk sürümün kapanışı için 15 Mart 2027 bildiriliyor) | Fiyat yapısı karmaşık (girdi + çıktı megapikseli) | Eski modeller kapanıyor (`gpt-image-1` 23 Ekim 2026'da kapanmış görünüyor) |

Kaynaklar: [developersdigest.tech — Gemini görsel fiyatları](https://www.developersdigest.tech/models/image-generation/google-gemini-api), [Vertex AI — Gemini 2.5 Flash Image](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash-image), [BFL — fiyatlar](https://bfl.ai/pricing), [BFL yardım — model maliyetleri](https://help.bfl.ai/articles/7986977817-what-are-the-costs-associated-with-using-your-models), [Together AI — FLUX.2 pro](https://www.together.ai/models/flux-2-pro), [OpenAI — GPT Image 1 model sayfası](https://platform.openai.com/docs/models/gpt-image-1), [costgoat — OpenAI görsel fiyatları](https://costgoat.com/pricing/openai-images).

**Önerim:** Seçimi belgeyle değil test sayfasıyla yapalım. Gemini'nin hızlı sürümü ile FLUX.2 pro aynı 20 fotoğrafta yan yana koşsun; OpenAI yedek kalsın. Tahmini test gideri: 20 fotoğraf × 2 kumaş × 2 sağlayıcı = 80 görsel, yaklaşık 3–10 $. Mağazada 4 kumaşlı bir deneme 4 çağrıdır: yaklaşık 0,15–0,50 $.

**Dalga 1 kapısı:** §3A, 4, 5, 6, 7, 8'deki bütün kabul ölçütleri `TEST-SHOWROOM.md`'de tek tek sonuçlanmadan Dalga 2'ye geçilmez. Anında giydirmede 20 koltuğun 16'sı şartı sizin işaretlemenizle kapanır.

---

## 6. Dalga 2

| İş | Dokunulacak yerler | Şema | Başlıca risk | Nasıl test edilir |
|---|---|---|---|---|
| 6 Takım sahnesi | `lib/room/layout.ts`, `Stage.tsx`, yeni `lib/takim/*`, panelde takım tanımı, `FabricPicker` (kombin modu) | `sets`, `set_items` (model, yer, açı); `fabric_matches` (uyumlu kumaş listesi) | Dört parçada kare hızı | Takım metrajı = parça toplamı (birim); 4 parçada hafif profil ölçümü; kombinin PDF'te parça parça görünmesi |
| 7 Satıcı modu, karşılaştırma | yeni `components/kiosk/SellerMode.tsx`, mevcut karşılaştırma (`CompareState`) üçe çıkar ve kameralar bağlanır | `firm_models.price` (İş 0), `firm_price_groups` (kumaş fiyat grubu); `firms.settings` (fiyat müşteriye açık mı) | Fiyatın PIN'siz bir yerden sızması | Fiyatın müşteri modunda sunucu cevabında bile bulunmaması; süre dolunca kapanma; eş zamanlı dönüş; toplamın elle hesabı |
| 8 Özellik, stok, filtre | `FabricEditor`, `FabricPicker`, `FabricInfo`, `lib/csv.ts`, `BulkImport` | `fabrics` yeni sütunlar (leke tutmaz, evcil hayvan, kolay temizlik, hepsi boş olabilir), `fabric_stock` (var / az / yok, termin günü), `fabric_alternatives` | Tahminle doldurma yasağı: boş alan hiçbir yerde gösterilmez | Özelliği boş kumaşın hiçbir filtrede çıkmaması; 100 satırlık CSV ve hatalı satır raporu; stoksuz kumaşta termin ve muadil |
| 9 Oda planı, Salon Yerleşim Projesi | `lib/room/spec.ts`, `plan.ts`, `Room.tsx`, `PlanView.tsx`, `RoomPanel.tsx`, yeni `lib/room/sabitler.ts`, `lib/teklif/pdf` | Yok (oda bağlantıda ve teklif içeriğinde taşınır); `firms.settings.gecis_payi_cm` | Kapsamın çizim programına kayması; "mimari" kelimesi hiçbir yerde geçmeyecek (testte metin taraması) | 4 × 5 m oda + kapı + pencere + L köşe yalnızca dokunuşla; plandaki ölçü = ürün ölçüsü; kapı önü uyarısı; PDF en çok iki sayfa |
| 10 Koltuk danışmanı | yeni `lib/danisman/*` (kural tabanlı sıralama), `components/kiosk/Advisor.tsx` | `models.style_tags` (İş 0), `models.use_tags` | Girilmemiş özelliği söyleme: gerekçe yalnızca dolu alanlardan şablonla kurulur. **Dil modeli kullanmıyorum**; isterseniz ayrıca maliyetiyle öneririm | Bütün cevap kombinasyonlarının taranması (boş ekran yok); gerekçedeki her özelliğin veride dolu olması; 60 sn |
| 11 Aylık kullanım raporu | `lib/monthly.ts`, `app/panel/ozet`, yeni mağaza paneli raporu, günlük zamanlanmış görev | `event_daily` (günlük özet tablo) | Rapordaki sayının olay kaydından sapması | Rapor = olay sayımı (PGlite'ta rastgele veriyle birebir); boş ayda "kullanım yok"; firma yalnızca kendi raporu |

---

## 7. Dalga 3

| İş | Dokunulacak yerler | Şema | Başlıca risk | Nasıl test edilir |
|---|---|---|---|---|
| 12 Kumaş duvarı | yeni `components/kiosk/FabricWall.tsx`, `lib/share-image.ts` (kare üretimi), önbellek | Yok | 30 karede ekranın donması: kareler sırayla, boş zamanlarda üretilir | 30 kare, hafif profilde süre ve donma (uzun görev) ölçümü; karenin 3D ile aynı kumaş ve ölçek olması |
| 13 Video ve müşteri kaydı | yeni `lib/video/*` (tuvalden kayıt), `QuoteDialog`, mağaza panelinde "ilgilenen müşteriler" | `firm_leads` (ad, telefon, ürün, rıza zamanı, süre sonu); ORMEN'e okuma kuralı yok; ORMEN için yalnızca sayı veren fonksiyon | Video biçimi: eski iPhone'lar `webm` oynatmaz; `mp4` kaydı cihaza bağlı. Çözüm: destek varsa `mp4`, yoksa hareketli görsel | Rıza kutusu işaretsizken kayıt yok; silinen satırın veritabanında olmaması; ORMEN rolüyle her sorgunun boş dönmesi; dosya ≤ 10 MB |
| 14 Otomatik yerleşim | yeni `lib/room/oneri.ts` (kural tabanlı), `RoomPanel` | Yok | Üç önerinin birbirine benzemesi: her öneri farklı bir bakış duvarı kuralından üretilir | Çakışma, kapı ve geçiş payı denetimi her öneride; 3 sn; sığmayan üründe düz mesaj |
| 15 Müşterinin salonu | İş 5'in sağlayıcı arayüzü, kota ve maliyet kaydı; yeni akış | `ai_calls.kind` | Ölçünün yaklaşık oluşu: görsele yazılır. Saklama seçeneği yok | Etiket indirilen görselde; oturum sonunda dosya yok; başarısız üretim kotadan düşmez |
| 16 Marka alanı, web gömme | `fabrics.brand`, `FirmEditor`, `next.config.ts` (`frame-ancestors` firma bazında), yeni `app/g/[slug]` (gömülü sürüm) | `fabrics.brand` (mevcutların hepsi "ORMEN"), `firm_brands`, `firms.embed_domains` | İzin verilmeyen alan adında çalışması: başlık sunucuda firma listesinden üretilir | Kapalı markanın hiçbir ekranda ve API cevabında olmaması; izinsiz alan adında çerçevenin reddi; telefonda görünüm |

---

## 8. Olay kaydı

`events` tablosu genişler, yeni tablo açılmaz.

- Yeni türler: `oturum_basladi`, `oturum_bitti`, `model_goruntulendi`, `kartela_okutuldu`, `foto_istendi`, `foto_basarili`, `foto_basarisiz`, `kose_kuruldu`, `teklif_olusturuldu`, `siparis_talebi`, `vitrin_basladi`, `vitrin_bitti`. Mevcut `kumas_denendi` kalır.
- Yeni sütunlar: `device_id`, `zone` (hangi parça), `n` ve `n2` (süre, modül sayısı, ölçü), `client_id` (çevrimdışı kuyruktan çift yazımı önler).
- Müşterinin adı ve fotoğrafı olaya girmez; `parseEvent` bilinmeyen alanı zaten atıyor.
- İlk dilimden itibaren yazılır; İş 11 bu veriye dayanır.

---

## 9. Genel riskler

1. **Kapsam.** On yedi iş, üç dalga. Dalga 1 tek başına büyük; kapıdan geçmeden sonrakine başlanmaz.
2. **Yetki katmanı** yanlış kurulursa bir mağaza diğerinin verisini görür. Önce yazılır, PGlite matrisiyle her dilimde yeniden koşar.
3. **Gerçek cihaz.** Performans, kamera, QR ve kilit yalnızca mağazadaki ekranda kesinleşir. Hedef cihazın modeli ve Android sürümü bilinirse ölçümler ona göre ayarlanır.
4. **Anında giydirme kalitesi** sağlayıcıya bağlı ve garanti edilemez; 16 / 20 şartı tutmazsa demo bu adımsız açılır.
5. **Vercel ve Supabase planı.** Günde birden sık zamanlanmış görev ve 60 sn'lik çağrı için ücretsiz planın sınırları kontrol edilecek; gerekirse size sorarım, kendiliğimden ücretli plana geçmem.
6. **KVKK.** Fotoğrafın yurt dışına gitmesi, müşteri kaydı ve aydınlatma metni avukat onayı ister; metin yerleri yer tutucuyla bırakılır.

---

## 10. Teslim edilecekler

`TEST-SHOWROOM.md` (ölçüt ölçüt sonuç; cihazda doğrulanacaklar ayrı işaretli), `KURULUM.md`, güncel `KARARLAR.md` ve `YOL-HARITASI.md`, `.env.example`, demo akışının (6 adım) tek cihazda kesintisiz çalıştığını gösteren test notu.

---

## 11. Sorular (beşi birden)

1. **Kod nereye yazılsın?** Bu oturuma bağlı `bigplanbigidea` deposu boş; Atelier'in kodu `ormen3xd` deposunda ve bu oturumun oraya yazma izni yok (yalnızca okuyabiliyorum). Önerim: `ormen3xd` için yazma izni verin, orada yeni bir `showroom` dalında çalışayım; yayındaki dal (`claude/ecstatic-curie-vymdi7`) her dalganın sonunda siz onaylayana kadar değişmesin. Öteki yol: kodu `bigplanbigidea`'ya kopyalayıp burada geliştirmek; o zaman Vercel'i sonradan bu depoya çevirmeniz gerekir.
2. **Anında giydirme sağlayıcısı.** Gemini (hızlı sürüm) ve FLUX.2 pro'yu 20 fotoğraflık test sayfasında yan yana denememi onaylıyor musunuz (tahmini 3–10 $)? Onaylıyorsanız anahtarları sohbete yazmayın; güvenli formu ben açarım ya da Vercel'e siz girersiniz.
3. **Bildirim yolu.** Bugün otomatik bildirim yok: talep panele düşüyor, WhatsApp düğmesine elle basılıyor. Sipariş talebi ve aylık özet için hangisi? (a) Yalnızca panel listesi + hazır WhatsApp bağlantısı (ücretsiz, bugünkü yol; önerim). (b) E-posta da gitsin (ücretsiz katmanı olan bir e-posta servisi ve anahtarı gerekir).
4. **Kumaş eni farklıysa metraj.** Modelin metrajı 140 cm en için girilmiş, seçilen kumaş 280 cm ise teklifte ne yazsın? (a) Sayı yok, "usta hesaplar" (bugünkü kural; önerim). (b) Sayı aynen, yanında "140 cm en için" uyarısı. (c) Model başına her en için ayrı metraj gireceksiniz.
5. **Numune taleplerindeki ad ve telefon.** Bugün ORMEN panelinde görünüyor (6 Ekim kararı). Yeni kural "mağazanın müşterisinin kişisel bilgisi merkez panelde görünmez" yeni verilere (teklif, ilgilenen müşteriler) uygulanacak. Mevcut numune akışı aynen kalsın mı (önerim), yoksa o da kapansın mı?
