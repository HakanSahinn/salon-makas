<p align="center">
  <img src="assets/salonum-brand.png" alt="Salon Makas logosu" width="96" height="96" />
</p>

# Salon Makas

Berberler için geliştirilen, **internetsiz çalışan Android randevu ve gelir-gider takip uygulaması**. Randevular, kazançlar ve giderler cihazda saklanır; hesap açma, API veya sunucu bağlantısı gerektirmez.

## Özellikler

- **Bugünkü randevular:** Günün randevularını saat sırasıyla görüntüleme ve bekleyen/tamamlanan durumlarını takip etme.
- **Takvim:** Randevulu günleri işaretleyen aylık görünüm ve seçilen günün randevuları.
- **Randevu yönetimi:** Müşteri adı, takvimden tarih seçimi ve 30 dakikalık saat aralıklarıyla randevu oluşturma; tarih ve saati sonradan değiştirme.
- **Kaydırarak silme:** Randevuyu sola kaydırıp onaylayarak silme.
- **İş tamamlama:** Randevuyu tamamladıktan sonra isteğe bağlı kazanç girişi veya tutar girmeden atlama.
- **Kazanç takibi:** Günlük ve haftalık kazanç, aylık gelir-gider-net kâr ve günlere göre aylık kazanç grafiği.
- **Gider takibi:** Kira, elektrik-su-doğalgaz, vergi, malzemeler ve diğer giderler.
- **Raporlar:** Bu yıl için haftalık, aylık, yıllık ve özel tarih aralığı raporları; geçen yıl için aylık ve yıllık özetler. Rapor ekranı salt okunurdur.
- **Mali kayıt düzenleme:** Bu yılın gelir ve gider kayıtlarını ayrı kayıt ekranından düzeltme veya silme.

Giderler **kaydedildikleri ayın ve yılın** toplamına eklenir. Günlük, haftalık ve özel tarih aralığı raporlarında gider gösterilmez. İçinde bulunulan yılın yıllık raporu 1 Ocak'tan cihazın bugünkü tarihine kadar olan dönemi kapsar.

## Veri saklama politikası

Uygulama, eski ayrıntıları süresiz biriktirmemek için aşağıdaki düzeni kullanır:

| Veri | Saklama süresi |
| --- | --- |
| Bugünkü ve ileri tarihli randevular | Randevu tarihi geçene kadar korunur |
| Geçmiş günlerin randevuları | Gün değişiminde temizlenir |
| Bu yılın gelir ve giderleri | Ayrıntılı tutulur ve düzenlenebilir |
| Geçen yılın gelir ve giderleri | Yalnızca aylık/yıllık gelir, gider ve net kâr toplamları tutulur |
| Daha eski yıllar | Silinir |

Örneğin **2027 yılında**, 2027 mali kayıtları ayrıntılı, 2026 kayıtları yalnızca özet olarak tutulur; 2025 ve öncesi silinir. İleri tarihli randevular korunur. Uygulama gün veya yıl değişiminde kapalıysa temizlik bir sonraki açılışta yapılır.

**Yedekleme, geri yükleme ve bulut eşitleme özelliği yoktur.** Uygulamayı kaldırmak, Android ayarlarından verilerini temizlemek veya cihazı kaybetmek kayıtların kaybına neden olabilir. Silinen geçmiş yıl ayrıntıları geri getirilemez.

## Kullanılan teknolojiler

| Amaç | Teknoloji |
| --- | --- |
| Mobil uygulama | React Native, Expo SDK 58 |
| Navigasyon | React Navigation — Bottom Tabs ve Native Stack |
| Durum yönetimi | Zustand ve persist middleware |
| Yerel depolama | AsyncStorage, Expo FileSystem |
| Takvim | react-native-calendars |
| Sıkıştırma | fflate |
| Kod denetimi | ESLint, TypeScript ile JavaScript tip kontrolü |

Mali ayrıntılar aylık, en fazla 256 kayıtlık sıkıştırılmış dosyalarda tutulur. AsyncStorage küçük arşiv işaretçisini saklar. Para hesaplamaları tam sayı kuruş üzerinden yapılır.

## Geliştirme ortamını kurma

Aşağıdaki komutlar **Windows PowerShell / VS Code terminali** içindir.

Gereksinimler:

- Node.js ve npm — yerel geliştirmede Node.js 24 kullanılmıştır.
- Git.
- JDK 17; `JAVA_HOME` kurulu JDK klasörünü göstermelidir.
- Android Studio, Android SDK Platform 37, Build-Tools 37.0.0 ve Platform-Tools.
- SDK Manager üzerinden projenin istediği NDK/CMake bileşenleri; ilk derlemede indirilebilir.
- `ANDROID_HOME` Android SDK klasörünü göstermelidir.
- Açık bir Android emülatörü veya USB hata ayıklaması açık bir Android telefon.

```powershell
git clone https://github.com/HakanSahinn/salon-makas.git
cd salon-makas
npm.cmd ci
```

Depo özel durumdaysa klonlamak için erişim yetkisi gerekir. İlk bağımlılık kurulumu ve Android derleme araçlarının indirilmesi internet gerektirir; kurulan uygulamanın günlük kullanımı internet gerektirmez.

## Emülatörde veya telefonda çalıştırma

Android Studio'dan emülatörü açın veya telefonu USB ile bağlayın:

```powershell
npm.cmd run android
```

Bu komut bağlı cihazın işlemci mimarisini belirler, test imzalı APK üretir, yükler ve uygulamayı açar. **Metro'nun açık olması gerekmez.** Birden fazla cihaz bağlıysa cihaz kimliğini belirtin:

```powershell
npm.cmd run android -- --device=emulator-5554
```

`emulator-5554` yerine kendi cihaz kimliğinizi kullanın.

Geliştirme sunucusu ile çalışmak için ayrı bir terminalde `npm.cmd start`, diğer terminalde `npm.cmd run android:dev` kullanılabilir. Bu geliştirme akışında Metro açık kalmalıdır.

## APK üretme

| Komut | Çıktı |
| --- | --- |
| `npm.cmd run build:apk` | `dist/salon-makas-arm64-v8a.apk` ve `dist/salon-makas.apk` — test imzalı |
| `npm.cmd run build:emulator` | `dist/salon-makas-x86_64.apk` — test imzalı |
| `npm.cmd run build:production` | `dist/salon-makas-production-arm64-v8a.apk` — üretim imzalı |
| `node scripts/build-android.cjs --abi=armeabi-v7a --production` | `dist/salon-makas-production-armeabi-v7a.apk` — eski ARM telefonlar için |

Derleme betiği APK imzasını, hedef mimariyi ve çevrimdışı JavaScript paketinin APK içinde bulunduğunu doğrular. Android klasörü gerektiğinde Expo tarafından üretilir; yerel Android ayarları `app.json` ve `plugins/` üzerinden yönetilir.

### Üretim imzası

Üretim APK'sı için yerel imza anahtarı gereklidir. İlk kez **kendi dağıtımınızı** hazırlıyorsanız:

```powershell
npm.cmd run signing:init
npm.cmd run build:production
```

`signing:init`, anahtar yoksa oluşturur; mevcut anahtarı yeniden üretmez. Daha önce dağıtılmış uygulamayı güncellemek için **aynı imza anahtarını koruyun**. Başka bilgisayarda mevcut dağıtımı sürdürürken yeni anahtar oluşturmak yerine mevcut `.signing/` klasörünü güvenli biçimde aktarın.

Üretim imzasıyla bağlı cihaza yüklemek için:

```powershell
npm.cmd run android:production
```

Test ve üretim imzaları farklıdır. Farklı imzalı APK mevcut kurulumun üzerine güncelleme olarak yüklenemez. Çözüm olarak uygulamayı kaldırmak yerel verileri siler; bu uygulamada veri geri yükleme özelliği bulunmaz.

## Kontroller

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run typecheck
npx.cmd expo install --check
```

Testler; randevu çakışmaları, mali kayıt düzenlemeleri, rapor hesaplamaları, yıl geçişi, önceki yıl özetleri, depolama hataları ve yerel kurtarma davranışlarını kapsar. Fiziksel cihaz davranışı ayrıca kontrol edilmelidir.

## Proje yapısı

```text
App.js                 Navigasyon ve uygulama başlangıcı
assets/                Logo ve uygulama simgeleri
src/components/        Takvim, seçim alanları ve randevu bileşenleri
src/screens/           Randevu, kazanç ve rapor ekranları
src/store/             Zustand, yerel dosyalar ve rapor okuyucu
src/retention.js       Gün/yıl değişimi ve veri saklama kuralları
src/reports.js         Rapor tarih aralıkları ve hesaplamalar
src/types.d.ts         Uygulama veri ve navigasyon tipleri
scripts/               APK üretimi, cihaza kurulum ve imza araçları
plugins/               Android derleme yapılandırması
tests/                 Otomatik testler
```

## Gizlilik ve yerel dosyalar

- Uygulama randevu ve mali kayıtları sunucuya göndermez; kayıtlar cihazın uygulamaya özel alanında tutulur.
- Yerel dosyalar sıkıştırılır; uygulama ayrıca veri şifrelemesi sağlamaz.
- `.signing/`, `node_modules/`, `dist/`, `.expo/` ve üretilen yerel platform klasörleri `.gitignore` ile depo dışında tutulur.
- İmza anahtarı ve şifrelerini GitHub'a veya APK ile birlikte yüklemeyin. `.signing/` klasörünü güvenilir bir harici ortamda ayrıca koruyun.
- Disk alanı yetersiz olduğunda yazma durdurulur. Yerel kurtarma mevcut sağlam dosyaları kullanır; cihaz dışı yedek yerine geçmez.

Android uygulama kimliği: `com.berber.randevu`.
