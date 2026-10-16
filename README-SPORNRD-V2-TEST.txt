SPORNRD 2.0 — ENTEGRE TEST SÜRÜMÜ (16.10.2026)
========================================================

ÇOK ÖNEMLİ:
Bu ZIP'in kaynağı kullanıcının GitHub ve Cloudflare'da çalışan
"SporNRD(1).zip" dosyasıdır. KODLARI SIFIRDAN YAZMIYORUZ.

Ayrı test Worker'ı: spornrd-v2-test
Üretimdeki Worker: spornrd-v6 (DOKUNULMAYACAK)
Ana uygulamanın js/config.js API adresi DEĞİŞTİRİLMEDİ.
Üretim wrangler.jsonc DEĞİŞTİRİLMEDİ.

Bu pakette gerçekten yapılan işler:
1. 144 resmî dizin adayı: 63 federasyon + 81 il müdürlüğü.
2. 24 katalog kaynak türüne ilave spor/üniversite/salon alt türleri.
3. Tam kategori sözlüğü: 6 kategori / 27 alt kategori / 81 içerik tipi.
4. Tüm paylaşılan konu etiketleri ve kurs/etkinlik/iş/mağaza filtreleri.
5. Cloudflare D1 şeması (kaynak, kanal, kanıt, haber, öğrenme, log).
6. Yalnız TYF/TBF için var olan doğrulanmış okuyucularla gerçek tarama.
7. Gerçek içerik için seçme/etiketleme, kısa editör özeti ve kayıt.
8. Kaynak alanı kontrolü ve tekrar içerik engelleme.
9. D1'de kayıtlı haberlerden sadece veriye dayalı SVG sosyal kartı.
10. Sosyal medya paylaşımı için TASLAK metin (hesaplara gönderilmez).
11. İzinli resmî dizinlerde yeni aday tespit denemesi.
12. Zamanlı işlem motoru: güvenlik için varsayılan KAPALI.
13. Eski /api/health, /api/feed, /api/tyf, /api/tbf yollarını koruma.
14. GitHub Actions ile ayrı test Worker'ı kurma dosyası.
15. Acode'da açılabilecek "sistem-v2-test.html" kontrol sayfası.

BU PAKETİN HENÜZ YAPAMADIKLARI — GERÇEĞİ SÖYLEYELİM:
- 144 kuruluşun tamamından otomatik canlı akış yok; yalnız TYF/TBF var.
- Sosyal ağların tamamını tarama mümkün değil: API erişimi, izin ve kota gerekir.
- PDF ve görsel OCR / tam metin her kaynakta mevcut değil; mevcut TYF/TBF
  okuyucularının indirebildiği metinle sınırlıdır.
- AI ile yeni fotoğraf/görsel üretimi YOK; özgün marka şablonlu SVG var.
- Instagram/Facebook/X/YouTube hesaplarına otomatik paylaşım YOK;
  resmî API, hesap bağlantısı ve platform izinleri gerekir.
- Öğrenme verileri D1'e kaydedilir; otomatik model yeniden eğitimi YOK.
- Yayımlanan içerik gerçek sunucuya gönderilmeden yalnızca yerel testtir.

KURULUM:
A) Samsung Dosyalarım -> ZIP'e dokun -> Çıkart.
B) Acode -> Klasör Aç -> + -> Yol ekle -> ZIP'ten çıkan "SporNRD" klasörü.
C) Eski klasör ve canlı Cloudflare Worker'ı değiştirmeyin.
D) Önce ayrı Cloudflare D1 "spornrd-v2-test-db" oluşturulmalı.
E) GitHub'da yeni TEST dalına yükleyip ayrı Actions workflow ile dağıtılmalı.
F) D1 migrations uygulandıktan sonra GitHub Actions TEST Kaynak kur ve tara
   iş akışında bootstrap seçilmeli.
G) Aynı GitHub Actions görevinde ingest seçilip gerçek TYF/TBF okunmalı.
H) Acode'da sistem-v2-test.html açılıp test Worker adresi sorgulanmalı.

Ayrıntılı ve güvenli işlem sırası:
  docs/CLOUDFLARE-GITHUB-KURULUM.md

ASLA üretim "wrangler.jsonc" ile npm run deploy komutunu çalıştırmayın.
KURULUM ÖNCESİ YEREL TEST: node tests/v2.test.mjs

Gerçek haber yoksa ekran boş kalır; sahte/demonstrasyon içerik eklenmez.
