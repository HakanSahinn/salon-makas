# Salon Makas

İnternetsiz çalışan Android berber randevu ve gelir/gider uygulaması. API veya sunucu kullanılmaz. Proje klasörü `C:\dev\berber`, Android kimliği `com.berber.randevu` olarak korunur.

## Verilerin saklanması

| Dönem | Tutulan bilgi | Düzenleme |
| --- | --- | --- |
| Bu yıl | Randevular, gelir/gider ayrıntıları ve raporlar | Bu yılın mali kayıtları düzenlenebilir |
| Geçen yıl | Yalnızca aylık ve yıllık gelir, gider, net kâr | Salt okunur |
| Daha eski yıllar | Tutulmaz | Yok |

Örnek: 2027 yılında 2027 ayrıntıları ve 2026 özetleri kalır; 2025 ve öncesi silinir. İleri tarihli randevular korunur. Geçmiş randevular gün değişiminde temizlenir. Uygulama kapalıysa temizlik bir sonraki açılışta yapılır.

Yedekleme ve geri yükleme özelliği kaldırılmıştır. Uygulamayı kaldırmak veya Android ayarlarından verilerini temizlemek kayıtları kaybettirir. Önceki sürümden geçişte eski kayıtlar bu politikaya göre otomatik dönüştürülür; silinen eski yıl ayrıntıları geri getirilemez.

## Çalıştırma ve APK

```powershell
cd C:\dev\berber
npm.cmd run android
```

Komut bağlı cihazın işlemci mimarisini seçer ve Metro gerektirmeyen test imzalı APK'yı yükler. Birden fazla cihaz varsa `npm.cmd run android -- --device=emulator-5554` kullanın.

Kalıcı üretim imzasıyla kurulu uygulamanın güncellemesi:

```powershell
npm.cmd run android:production
```

| Komut | Dosya |
| --- | --- |
| `npm.cmd run build:production` | `dist/salon-makas-production-arm64-v8a.apk` |
| `npm.cmd run build:apk` | `dist/salon-makas-arm64-v8a.apk`, `dist/salon-makas.apk` — test imzalı |
| `npm.cmd run build:emulator` | `dist/salon-makas-x86_64.apk` — test imzalı |
| `node scripts/build-android.cjs --abi=armeabi-v7a --production` | Eski ARM telefonlar için üretim APK'sı |

Test imzası ile üretim imzası farklıdır. Birinden diğerine veriler korunarak doğrudan APK güncellemesi yapılamaz. Bu çalışma mevcut kurulumu kaldırmaz. Üretime geçiş veya uygulamayı kaldırma veri kaybı yaratabileceğinden ayrıca planlanmalıdır.

## Yerel veri koruması

- Mali ayrıntılar bu yıl için aylık, en fazla 256 kayıtlık sıkıştırılmış dosyalarda tutulur.
- Geçen yılın özeti en fazla 12 aylık tutardan oluşur. Kategori ve işlem ayrıntıları saklanmaz; net kâr gelir eksi gider olarak hesaplanır.
- Dosyalar doğrulanmadan etkin dizin değiştirilmez; yazma hatasında eski kayıt korunur.
- Küçük dizin anahtarı kaybolursa mevcut arşiv otomatik boşaltılmaz. Açılıştaki yerel kurtarma, sağlam dosyaları doğrular.
- Telefonda 5 MiB ek boş alan yoksa yeni dosya yazımı durdurulur. Bu işletim sisteminin veya başka uygulamaların alan kullanımı için sınırsız garanti değildir.
- 32 günden büyük ileri tarih sıçraması silmeden önce tarih doğrulaması ister. Saklanan yıldan önceye alınan cihaz tarihiyle işlem yapılmaz.
- Yıl temizliğinde eski ayrıntılara işaret eden önceki dizinler ve kaldırılan yedekleme özelliğinin uygulama içi artık dosyaları da bırakılmaz. Kullanıcının dışarıdaki klasörlerine dokunulmaz.

## Kalıcı imza

Kalıcı anahtar `.signing/salon-makas-release.p12` ve gizli şifre dosyası `.signing/credentials.json` içinde bulunur. Bu teknik dosya isimleri ve sertifika, uygulama adı değişirken korunmuştur. `.signing` Git dışında ve Windows hesabına özel izinlerle tutulur. Klasörün tamamını güvenilir bir harici ortamda koruyun; APK ile paylaşmayın.

`npm.cmd run signing:init` var olan anahtarı doğrular ve yeniden üretmez. Üretim derlemesi yerel imza dosyasını otomatik okur; şifreler komut satırına veya rapora yazılmaz.

## Görsel

Uygulama simgesi `assets/salonum-icon.png`, küçük başlık simgesi `assets/salonum-brand.png` dosyalarıdır. Built-in image_gen aracıyla makas temalı ikon üretildi; istem `assets/salonum-icon.prompt.txt` içinde, üretimin tam metni çalışma kaydındadır. Expo image-utils ile launcher ve başlık boyutları hazırlanmıştır.

## Doğrulama

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run typecheck
npx.cmd expo install --check
```

Uygulama JavaScript dosyalarında `checkJs` etkindir; store, finans ve navigasyon modelleri `src/types.d.ts` içinde tanımlıdır. JavaScript geçişi için `noImplicitAny` kapalıdır; bu, bütün parametrelerin açıkça tiplendiği anlamına gelmez.

Testler yıl geçişi, eski ayrıntıların dosyalardan kaldırılması, önceki yıl özetlerinin korunması, yanlış tarih koruması, depolama hataları, yerel kurtarma, randevu çakışmaları, finansal düzenleme ve rapor sayfalamasını kapsar. Fiziksel telefon ve işletim sistemi davranışları ayrıca denenmelidir.
