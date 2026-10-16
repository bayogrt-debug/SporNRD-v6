# SporNRD v2 — Güvenli kurulum sırası

**Ön koşul:** Var olan `spornrd-v6` Worker ve ana GitHub dalı üretimde kullanılmaya devam edecek. Bu ZIP **Cloudflare'a yayımlanmadı**; servis hesabına ve gizli anahtarlarına erişimimiz yok.

## 1. Ayrı kaynak dalı oluştur

GitHub'da var olan repodan `spornrd-v2-test` isimli dal oluştur. ZIP içindeki `SporNRD/` kökündeki bütün dosyaları, klasör yolları korunarak **sadece bu yeni dala** ekle. Eski `wrangler.jsonc` dosyasını ya da `js/config.js` API adresini canlı Worker'a doğru değiştirme.

## 2. Test Cloudflare D1 oluştur

Cloudflare Workers & Pages → D1 → **Create database** → `spornrd-v2-test-db`. D1 kimliğini kopyala. Ana uygulamanın KV/D1 verileri bu testle paylaşılmamalıdır.

## 3. GitHub dalında sırları tanımla

GitHub → Repository → Settings → Secrets and variables → Actions → **Repository secrets**:

- `SPORNRD_CF_API_TOKEN`: **yalnız gerekli Workers/D1 dağıtım yetkilerine sahip** Cloudflare API token.
- `SPORNRD_CF_ACCOUNT_ID`: Cloudflare hesap kimliği.
- `SPORNRD_V2_D1_ID`: Yeni test D1 veritabanının UUID'si.
- `SPORNRD_V2_ADMIN_TOKEN`: Rastgele, en az 24 karakter uzunluğunda, özel test yönetim anahtarı; projedeki hiçbir dosyaya yazma.

GitHub → Settings → Secrets and variables → Actions → **Repository variables** bölümüne:

- `SPORNRD_V2_WORKER_URL`: Test Worker'ın gerçek tam adresi; ör. `https://spornrd-v2-test.bayogrt.workers.dev`. Bu adres dağıtımdan sonra teyit edilmelidir.

**ÖNEMLİ:** GitHub Actions `workflow_dispatch` varsayılan dalda erişim kısıtına sahip olabilir. Gerekirse test dalındaki workflow dosyasını görünür kılmak için repository ayarları gerekir; bu durumda üretim dalına workflow yüklemek bile mevcut kodu dağıtmadan önce incelenmelidir. İşlem hiçbir zaman otomatik `spornrd-v6` dağıtımı yapmamalıdır.

## 4. GitHub Actions — v2 AYRI TEST deploy

Actions sekmesinde `SporNRD v2 AYRI TEST deploy` görevini seç, `Run workflow` üzerinden **test dalını seç**. İş akışı:

1. `node tests/v2.test.mjs` regresyon testlerini çalıştırır.
2. Yalnızca **spornrd-v2-test-db** D1 şemasını uygular.
3. Yalnızca **spornrd-v2-test** Worker'ını yayımlar.
4. Yönetim anahtarını bu test Worker'ına secret olarak ekler.

İşlem `spornrd-v6` Worker'ına komut göndermez. Ayrıca `wrangler.v2-test.jsonc` içinde otomatik kron görevleri varsayılan `false` değerindedir.

## 5. İlk veritabanı kaydı ve tarama

Aşağıdaki POST istekleri yalnız yetkili operatör tarafından `Authorization: Bearer <SPORNRD_V2_ADMIN_TOKEN>` başlığıyla yapılır. Bu anahtarı herkese açık Acode ön yüzüne eklemeyin.

- `POST https://spornrd-v2-test.<SİZE_ÖZEL_ALT_ALAN>.workers.dev/api/v2/admin/bootstrap` — 144 kaynak adayı, iki etkin okuyucu.
- `POST https://spornrd-v2-test.<SİZE_ÖZEL_ALT_ALAN>.workers.dev/api/v2/admin/ingest` — TYF/TBF'den canlı seçilmiş yayınları okur, kontrol eder ve D1'e yazar.
- `POST .../api/v2/admin/discover` — iki resmî kurum dizininden yeni adayları keşfetmeyi dener; site yapısı değişirse hata raporlar.

**Telefonda terminal olmadan en kolay yol:** GitHub Actions → `SporNRD v2 TEST — Kaynak kur ve tara` → Run workflow → `bootstrap` seç → tamamlanmasını bekle → aynı yerden `ingest` seç. Bu görev `SPORNRD_V2_WORKER_URL` repository variable ve yönetim secret'ı ile yalnız test Worker'a istek gönderir. Dilersen ayrıca `discover` seç. Yönetim anahtarı Acode/ön yüz dosyalarına koyulmaz.

**GitHub Actions workflow_dispatch** iş akışlarının listede belirmesi için dosyanın varsayılan dalda da bulunması gerekebilir. Varsayılan dala yalnız manuel iş akışı dosyasını eklemek üretim Worker'ı değiştirmez. GitHub izinlerini yine de kontrol edin.

## 6. Kullanıcı tarafındaki canlı doğrulama

Acode içinde `sistem-v2-test.html` dosyasını aç. Gerçek test Worker adresini yazıp **Canlı sistemi kontrol et** düğmesine dokun. Sayfa şu üç endpoint'i canlı sorgular:

- `GET /api/v2/status` — D1, 144 katalog kaydı, kaç kaynağın etkin olduğu, son tarama ve yayın sayısı.
- `GET /api/v2/taxonomy` — tam 6/27/81 taksonomi.
- `GET /api/v2/feed?limit=10` — D1'de gerçekten yayımlanmış içerik; bağlantı, başlık ve görsel kartı.

İlk test için ayrıca `GET /api/health`, `GET /api/tyf`, `GET /api/tbf` çalışmalıdır. **HTML ön izlemesi canlı sistemi doğrulamaz**; Worker'ın gerçek D1 bağlantısı ve gerçek kaynak okuması gerekir.

## 7. Öğrenme ve cron

`POST /api/v2/admin/feedback` yetkili yönetim içindir; gerçek son kullanıcı hareketlerine bağlamak için uygulama kimlik doğrulaması, suistimal sınırları ve veri koruma mekanizması gereklidir. Öğrenme hafızası verileri kaydedebilir, ancak gerçek güvenlik onayı, yeni kaynak aktivasyonu, prompt/model değiştirme **otomatik değil**.

Canlı dış testler başarıyla geçtikten ve erişim/kota kontrolleri tamamlandıktan sonra `wrangler.v2-test.jsonc` içindeki `SPORNRD_V2_CRON_ENABLED` true yapılarak ayrı test Worker'ında 2 saatte bir tarama denenebilir. Varsayılan kapalıdır. Üretim Worker'a taşıma ayrıca onaylanır.

## 8. Servislerin gerçek kapsamı

**Çalıştırılabilir yazılım:** kategori sözlüğü, kaynak katalogları, D1 şeması, mevcut TYF/TBF okuyucuları, mevcut seçim/editörlük zinciri, yetkili tarama, güvenli yayım kaydı, görsel SVG kartı, sosyal medya gönderisi taslağı, geri bildirim hafızası, resmî dizin keşif denemesi.

**Daha sonra entegrasyon gerektirenler:** çok kaynaklı adapter'lar (GSB 81 ilin haberleri dahil), tam metin/PDF ve görsel OCR, sosyal medya ölçüm API'leri, yapay zekâ görsel üretme hizmeti, Instagram/X/YouTube yayın API'leri, otomatik öğrenilen güvenilir sınıflandırma, moderasyon ve kişisel veri kontrolleri. Bu özelliklerin çalıştığı iddia edilmez.
