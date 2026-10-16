SporNRD Yerel Kaynak Havuzu v1.5 – Acode Kurulumu

Bu paket bağımsız mobil kaynak havuzu testine aittir. SporNRD 6.1.7 ve Worker degismez.

GÜNCELLENECEK DOSYALAR (mevcut klasörde isimleri aynı tutulmalı):
- sourcePoolDB.js  (TAM yeni dosya)
- sourcePoolTest.js (TAM yeni dosya)
- kaynak-havuzu-test.html (TAM yeni dosya)

DEĞİŞMEYEN DOSYALAR (pakette tam kopyaları bulunur):
- sourceReviewEngine.js
- sourceDiscoveryEngine.js

Yer: SporNRD/kaynak-havuzu-test/
Acode'un AYNI önizleme adresini kullan. IndexedDB alanı adrese/origine bağlıdır.
DB_NAME='spornrd_source_pool', DB_VERSION=1; eski 7 store korunur.
Acode uygulama verilerini veya site depolamasını temizleme.
JSON indirme / geri yükleme güvenlik nedeniyle kapalıdır. Kod dosyalarını ayrı klasöre kopyalamak veritabanının yedeği değildir.

v1.5 yenilikler:
- Aday kuyruğu ve durum filtresi
- Keşfedildi → İncelemede → Değerlendirme kaydına hazır gibi gerekçeli durum geçişleri
- Beklet / Reddet / Tekrar incele, her karar denetim geçmişinde
- Gerekçesi yazılmadan veya hazır duruma alınmadan kaynağa dönüştürme YOK
- Kaynağa dönüşse bile durum 'evaluating', kimlik 'unverified', kanal sahipliği/erişim/hakları 'unknown' kalır.
- Dönüştürmeden önce mükerrer kanal, yakın alan adı ve aynı isim bir kez daha kontrol edilir.
- Çevrimiçi istek veya otomatik onay yok.

İLK TEST: Eski aday SporNRD Deneme Akademisi yerinde olmalı (3 kaynak, 1 aday, 3 kanal).
Keşif adayları listesini aç; durumu 'Keşfedildi' gör.
'İnceleme kararı ve geçmişi' → 'İncelemeye al' → 15+ karakter neden → 'Gerekçeli Kararı Kaydet'.
Bundan sonra aday durumu 'İncelemede' olmalı. Kaynak/kanal sayısı değişmemeli.

NOT: Bu örnek akademi gerçek bir kuruluş değildir. Güvenli bir kaynak keşif ve değerlendirme denemesidir.
