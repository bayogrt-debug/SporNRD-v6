/* Kategori ağacı: kullanıcı tarafından verilen 6 kategori, 27 alt başlık, 81 içerik tipi. */
const rows = [
  ['Kurs','Bebek & Çocuk Spor Kursları',[
    ['Bebek Spor Kursları','Bebek gelişimi|Ebeveyn katılımlı eğitim|Duyu-motor gelişim|Erken yaş eğitimi|Oyunla hareket'],
    ['Okul Öncesi Spor Kursları','Temel hareket eğitimi|Motor beceriler|Denge|Koordinasyon|Oyun temelli eğitim'],
    ['Çocuk Gelişim Kursları','Temel spor eğitimi|Fiziksel gelişim|Beceri kazanımı|Takım çalışması|Sporcu gelişimi']]],
  ['Kurs','Genç & Yetişkin Spor Kursları',[
    ['Başlangıç Spor Kursları','Sıfırdan eğitim|Temel teknikler|Yeni başlayanlar|Temel kondisyon|Bireysel ders'],
    ['Hobi & Sosyal Spor Kursları','Hobi amaçlı spor|Grup dersleri|Hafta sonu kursları|Sosyal spor|Sağlıklı yaşam'],
    ['İleri Seviye Spor Kursları','Teknik gelişim|Performans artırma|İleri seviye eğitim|Özel ders|Yarışma hazırlığı']]],
  ['Kurs','Para Spor & Uyarlanmış Spor Kursları',[
    ['Uyarlanmış Spor Eğitimleri','Bireyselleştirilmiş eğitim|Erişilebilir spor|Temel hareket|Uyarlanmış ekipman|Destekli eğitim'],
    ['Para Sporcu Gelişim Kursları','Sporcu yetiştirme|Teknik gelişim|Performans eğitimi|Yarışma hazırlığı|Profesyonel gelişim'],
    ['Kapsayıcı Spor Kursları','Karma grup eğitimi|Sosyal katılım|Birlikte spor|Eşit erişim|Grup etkinlikleri']]],
  ['Kurs','Doğa & Ekstrem Spor Kursları',[
    ['Temel Doğa Sporları Eğitimleri','Doğa eğitimi|Kampçılık|Yön bulma|Rota planlama|Ekipman kullanımı'],
    ['Ekstrem Spor Teknik Eğitimleri','Macera sporları|Teknik beceri|İleri seviye eğitim|Ekipman kontrolü|Risk yönetimi'],
    ['Doğada Güvenlik Eğitimleri','Hayatta kalma|Doğada ilk yardım|Acil durum yönetimi|Güvenli faaliyet|Hava koşulları']]],
  ['Kurs','BESYO & POMEM Hazırlık Kursları',[
    ['BESYO & ÖZYES Hazırlık Kursları','ÖZYES parkuru|Özel yetenek sınavı|Koordinasyon|Çeviklik|Deneme sınavı'],
    ['POMEM & PMYO Hazırlık Kursları','Fiziki yeterlilik|Polislik parkuru|Parkur antrenmanı|Kondisyon|Süre geliştirme'],
    ['Bekçilik & Diğer Sınavlara Hazırlık','Bekçilik hazırlığı|Fiziki yeterlilik sınavları|Dayanıklılık|Kuruma özel parkur|Sınav provası']]],
  ['Kurs','Belge & Sertifika Eğitimleri',[
    ['Antrenörlük & Eğitmenlik Eğitimleri','Antrenör temel eğitimi|Uygulama eğitimi|Kademe eğitimi|Eğitmenlik belgesi|Belge yenileme'],
    ['Hakemlik & Müsabaka Görevlisi Eğitimleri','Aday hakemlik|Hakem gelişimi|Oyun kuralları|Müsabaka görevlisi|Hakem vize ve yenileme'],
    ['Spor Güvenliği & Destek Eğitimleri','Cankurtaranlık|İlk yardım|Spor masörlüğü|Kondisyonerlik|Mesleki gelişim']]],
  ['Etkinlik','TURNUVA & SPOR YARIŞMALARI',[
    ['Okul Spor Turnuvaları','Okullar Arası|Okul İçi|İlçe Şampiyonası|İl Şampiyonası|Türkiye Finalleri'],
    ['Kulüp Spor Turnuvaları','Kulüpler Arası|Altyapı Turnuvası|Amatör Turnuva|Dostluk Turnuvası|Kulüp Şampiyonası'],
    ['Kurum Spor Turnuvaları','Kurumlar Arası|Şirketler Arası|Kamu Kurumları|Belediyeler Arası|Kurumsal Lig']]],
  ['Etkinlik','EĞİTİM-KURS-SEMİNER',[
    ['Eğitim Etkinlikleri','Atölye Çalışması|Uygulamalı Eğitim|Eğitici Eğitimi|Beceri Geliştirme|Bilgilendirme Toplantısı'],
    ['Kurs Etkinlikleri','Ücretsiz Deneme Dersi|Açık Ders|Kurs Tanıtımı|Kayıt Günü|Seviye Belirleme'],
    ['Seminer Etkinlikleri','Konferans|Panel|Söyleşi|Webinar|Uzman Buluşması']]],
  ['Etkinlik','TANITIM & SPOR FESTİVALLERİ',[
    ['Salon & Kulüp & Akademi Tanıtımları','Açılış Etkinliği|Tanıtım Günü|Açık Kapı Etkinliği|Tesis Gezisi|Üyelik Tanıtımı'],
    ['Marka & Ürün Tanıtımları','Ürün Lansmanı|Ürün Deneyimi|Demo Etkinliği|Marka Buluşması|Yeni Sezon Tanıtımı'],
    ['Festivaller & Şenlikler','Spor Festivali|Çocuk Şenliği|Aile Etkinliği|Spor Gösterileri|Halk Katılımlı Etkinlikler']]],
  ['Etkinlik','SPOR KAMPI & SAĞLIKLI YAŞAM',[
    ['Spor Kampları','Yaz Kampı|Kış Kampı|Hazırlık Kampı|Gelişim Kampı|Performans Kampı'],
    ['Sağlıklı Yaşam Kampları','Aktif Yaşam|Sağlıklı Beslenme|Zihin ve Beden|Stres Yönetimi|Dinlenme ve Yenilenme'],
    ['Doğa & Macera Etkinlikleri','Doğa Keşfi|Rehberli Etkinlik|Açık Hava Deneyimi|Macera Parkuru|Günübirlik Etkinlik']]],
  ['Kampanya','Spor Kursu & Eğitim Kampanyaları',[['Spor Kursu Kampanyaları',''],['Hazırlık Kursu Kampanyaları',''],['Belge & Sertifika Eğitimi Kampanyaları','']]],
  ['Kampanya','Spor Salonu & Üyelik Kampanyaları',[['Spor Salonu Üyelikleri',''],['Kulüp & Akademi Üyelikleri',''],['Özel Ders & Antrenman Paketleri','']]],
  ['Kampanya','Spor Ürünleri & Mağaza Kampanyaları',[['Spor Giyim & Ayakkabı',''],['Spor Malzemeleri & Ekipmanları',''],['Spor Teknolojileri & Aksesuarları','']]],
  ['Kampanya','Etkinlik & Kamp Kampanyaları',[['Turnuva & Yarışma Kampanyaları',''],['Festival & Organizasyon Kampanyaları',''],['Spor Kampı & Sağlıklı Yaşam Kampanyaları','']]],
  ['Kampanya','Sponsorluk & Sporcu Destek Kampanyaları',[['Sporcu Destek Kampanyaları',''],['Kulüp & Takım Sponsorlukları',''],['Spor Bursları & Sosyal Destek Kampanyaları','']]],
  ['İş İlanları','ANTRENÖRLÜK & EĞİTMENLİK İŞ İLANLARI',[
    ['Antrenör İş İlanları','Baş Antrenör|Yardımcı Antrenör|Altyapı Antrenörü|Takım Antrenörü|Bireysel Antrenör'],
    ['Eğitmen İş İlanları','Spor Eğitmeni|Grup Eğitmeni|Özel Ders Eğitmeni|Çocuk Spor Eğitmeni|Uyarlanmış Spor Eğitmeni'],
    ['Kondisyoner & Performans Uzmanı İş İlanları','Kondisyoner|Atletik Performans|Kuvvet ve Kondisyon|Performans Geliştirme|Fiziksel Performans Analizi']]],
  ['İş İlanları','SPOR SAĞLIĞI & PERFORMANS İŞ İLANLARI',[
    ['Fizyoterapist İş İlanları','Spor Fizyoterapisi|Rehabilitasyon|Sakatlık Önleme|Fonksiyonel Değerlendirme|Spora Dönüş'],
    ['Diyetisyen & Beslenme Uzmanı İş İlanları','Sporcu Beslenmesi|Performans Beslenmesi|Takım Diyetisyenliği|Beslenme Danışmanlığı|Beslenme Planlaması'],
    ['Spor Psikoloğu & Performans Analisti İş İlanları','Spor Psikolojisi|Mental Performans|Motivasyon|Müsabaka Analizi|Performans Analizi']]],
  ['İş İlanları','KULÜP & TESİS İŞ İLANLARI',[
    ['Spor Yöneticisi & Koordinatör İş İlanları','Kulüp Yönetimi|Tesis Yönetimi|Spor Koordinatörlüğü|Akademi Yönetimi|Sportif Direktörlük'],
    ['Danışma & Kayıt Personeli İş İlanları','Resepsiyon|Üye Kayıt|Müşteri İlişkileri|Ön Büro|Üyelik Danışmanlığı'],
    ['Tesis & Operasyon Personeli İş İlanları','Tesis Operasyonları|Saha Görevlisi|Teknik Bakım|Temizlik Hizmetleri|Güvenlik Hizmetleri']]],
  ['İş İlanları','ORGANİZASYON & HAKEMLİK İŞ İLANLARI',[
    ['Hakem & Müsabaka Görevlisi İlanları','Hakemlik|Masa Hakemliği|Gözlemcilik|Zaman Hakemliği|Müsabaka Görevlisi'],
    ['Spor Organizasyon Personeli İlanları','Etkinlik Personeli|Organizasyon Asistanı|Saha Operasyonu|Katılımcı Kayıt|Lojistik Destek'],
    ['Etkinlik & Turnuva Koordinatörü İlanları','Turnuva Yönetimi|Etkinlik Planlama|Organizasyon Koordinasyonu|Yarışma Operasyonları|Proje Yönetimi']]],
  ['İş İlanları','SPOR TİCARET & İLETİŞİM İŞ İLANLARI',[
    ['Spor Mağazası & Satış İş İlanları','Satış Danışmanı|Mağaza Yönetimi|E-Ticaret|Stok Yönetimi|Ürün Danışmanlığı'],
    ['Üyelik & Pazarlama İş İlanları','Üyelik Satışı|Dijital Pazarlama|Sponsorluk|Kurumsal Satış|Müşteri Kazanımı'],
    ['Spor Medyası & Sosyal Medya İş İlanları','Spor Muhabirliği|Sosyal Medya|İçerik Üretimi|Fotoğraf ve Video|Spor Editörlüğü']]],
  ['İş İlanları','STAJ & GÖNÜLLÜLÜK İLANLARI',[
    ['Antrenörlük & Eğitmenlik Stajları','Antrenörlük Stajı|Yardımcı Eğitmenlik|Altyapı Stajı|Performans Stajı|Spor Okulu Stajı'],
    ['Spor Yönetimi & Medya Stajları','Spor Yönetimi|Spor Pazarlaması|Sosyal Medya|Spor Muhabirliği|Tesis Yönetimi'],
    ['Spor Organizasyonu Gönüllülük İlanları','Turnuva Gönüllüsü|Etkinlik Gönüllüsü|Yarışma Destek Ekibi|Sosyal Sorumluluk|Festival Gönüllüsü']]],
  ['Mağazalar','SPOR GİYİM & AYAKKABI MAĞAZALARI',[
    ['Spor Giyim Mağazaları','Antrenman Kıyafetleri|Eşofman|Tayt & Şort|Spor Üst Giyim|Termal Giyim'],
    ['Spor Ayakkabı Mağazaları','Koşu Ayakkabıları|Antrenman Ayakkabıları|Salon Ayakkabıları|Günlük Spor Ayakkabıları|Çocuk Spor Ayakkabıları'],
    ['Forma & Takım Giyimi Mağazaları','Maç Formaları|Antrenman Formaları|Takım Setleri|Lisanslı Ürünler|İsim & Numara Baskısı']]],
  ['Mağazalar','SPOR MALZEMELERİ & EKİPMAN MAĞAZALARI',[
    ['Antrenman Malzemeleri','Antrenman Konileri|Koordinasyon Merdivenleri|Direnç Bantları|Antrenman Çemberleri|Slalom Çubukları'],
    ['Koruyucu Spor Ekipmanları','Dizlik|Dirseklik|Bileklik|Koruyucu Kask|Dişlik'],
    ['Müsabaka & Yarışma Ekipmanları','Hakem Ekipmanları|Skor Tabelaları|Kronometreler|Yarış Numaraları|Saha İşaretleme Malzemeleri']]],
  ['Mağazalar','FİTNESS & SPORCU YAŞAMI MAĞAZALARI',[
    ['Fitness & Kondisyon Ekipmanları','Ağırlık Setleri|Kardiyo Cihazları|Kondisyon Aletleri|Fonksiyonel Antrenman Ekipmanları|Ev Tipi Spor Aletleri'],
    ['Sporcu Beslenme Ürünleri','Proteinli Atıştırmalıklar|Enerji Barları|Enerji Jelleri|Elektrolit İçecekleri|Sporcu Gıdaları'],
    ['Sporcu Bakım & Toparlanma Ürünleri','Masaj Ruloları|Masaj Topları|Kompresyon Ürünleri|Soğuk Uygulama Ürünleri|Esneme Ekipmanları']]],
  ['Mağazalar','OUTDOOR & KAMP MAĞAZALARI',[
    ['Kamp Malzemeleri','Kamp Çadırları|Uyku Tulumları|Kamp Matları|Kamp Mutfak Ekipmanları|Kamp Aydınlatmaları'],
    ['Doğa & Macera Ekipmanları','Trekking Batonları|Tırmanış Ekipmanları|Dağcılık Malzemeleri|Navigasyon Ekipmanları|Su Taşıma Sistemleri'],
    ['Outdoor Giyim & Aksesuar','Outdoor Montlar|Trekking Ayakkabıları|Su Geçirmez Giyim|Outdoor Çantalar|Outdoor Eldiven & Aksesuarlar']]],
  ['Mağazalar','SPOR TEKNOLOJİLERİ MAĞAZALARI',[
    ['Akıllı Saat & Giyilebilir Teknoloji','Akıllı Saatler|GPS Spor Saatleri|Akıllı Bileklikler|Nabız Bantları|Aktivite Takip Cihazları'],
    ['Performans Ölçüm Cihazları','Hız Ölçüm Sistemleri|Hareket Sensörleri|Sıçrama Ölçüm Cihazları|Zamanlama Sistemleri|Performans Takip Sistemleri'],
    ['Spor Elektroniği & Aksesuarları','Aksiyon Kameraları|Spor Kulaklıkları|Kamera Bağlantı Aparatları|Taşınabilir Şarj Cihazları|Elektronik Spor Aksesuarları']]],
  ['Mağazalar','KULÜP & TESİS TEDARİK MAĞAZALARI',[
    ['Kulüp & Takım Ekipmanları','Takım Antrenman Setleri|Takım Çantaları|Taktik Tahtaları|Kulüp Malzemeleri|Soyunma Odası Ürünleri'],
    ['Spor Tesisi & Salon Ekipmanları','Spor Zemin Kaplamaları|Kale & File Sistemleri|Tribün & Oturma Sistemleri|Soyunma Odası Donanımları|Ekipman Depolama Sistemleri'],
    ['Toplu Sipariş & Özel Üretim Ürünleri','Toptan Spor Ürünleri|Özel Forma Üretimi|Logo & Nakış Baskı|Özel Madalya & Kupa|Kurumsal Promosyon Ürünleri']]]
];
export const SHARED_TAGS={
 Haber:{
 'Müsabaka ve Organizasyon':'Müsabaka|Yarışma|Karşılaşma|Turnuva|Şampiyona|Lig|Kupa|Fikstür',
 'Sonuç ve Başarı':'Sonuç|Rekor|Başarı|Madalya|Ödül|Şampiyonluk|Derece|Puan Durumu',
 'Gündem ve Gelişmeler':'Transfer|Sakatlık|Ceza|Atama|Kural Değişikliği|Açıklama|Kadro|İstatistik'},
 Kampanya:{'Kampanya Türleri':'İndirim|Erken Kayıt|Ücretsiz Deneme|Hediye|Çekiliş|1 Alana 1 Bedava|Paket Fırsatı|Öğrenci İndirimi|Aile İndirimi|Grup İndirimi|Sezon Sonu|Özel Gün|Kupon Kodu|Yeni Üye Fırsatı|Sınırlı Süre'}
};
export const COMMON_FILTERS={
 Kurs:'Spor Branşı|İl / İlçe|Yaş Grubu|Eğitim Seviyesi|Bireysel / Grup|Yüz Yüze / Online|Ücretli / Ücretsiz|Kurs Tarihleri|Erişilebilirlik|Belge Türü',
 Etkinlik:'Spor Branşı|İl / İlçe|Etkinlik Tarihi|Yaş Grubu|Katılım Seviyesi|Bireysel / Takım|Ücretli / Ücretsiz|Yüz Yüze / Online|Erişilebilirlik|Katılım / Kayıt Durumu|Organizatör|Etkinlik Yeri',
 'İş İlanları':'İl / İlçe|Spor Branşı|Çalışma Türü|Çalışma Modeli (Yüz Yüze / Uzaktan / Hibrit)|Çalışma Süresi (Tam / Yarı Zamanlı)|Eğitim Durumu|Deneyim Seviyesi|Belge & Sertifika|Maaş / Ücret Aralığı|Kurum Türü|İlan Tarihi|Son Başvuru Tarihi|Erişilebilirlik|Başvuru Durumu',
 Mağazalar:'Spor Branşı|İl / İlçe|Fiziksel / Online Mağaza|Ürün Kategorisi|Marka|Fiyat Aralığı|İndirim / Kampanya|Stok Durumu|Yeni / İkinci El|Kargo / Teslimat|Erişilebilirlik|Toptan / Perakende'
};
const split=(s)=>s?s.split('|'):[];
export const CATEGORY_TREE={Haber:[],Kurs:[],Etkinlik:[],Kampanya:[],'İş İlanları':[],Mağazalar:[]};
for (const [category,subcategory,items] of rows) CATEGORY_TREE[category].push({name:subcategory,items:items.map(([name,tags])=>({name,tags:split(tags)}))});
export const TAXONOMY={version:'2.0',categories:CATEGORY_TREE,sharedTopicTags:Object.fromEntries(Object.entries(SHARED_TAGS).map(([k,v])=>[k,Object.fromEntries(Object.entries(v).map(([g,t])=>[g,split(t)]))])),commonFilters:Object.fromEntries(Object.entries(COMMON_FILTERS).map(([k,v])=>[k,split(v)]))};
export const CATEGORY_FROM_CORE={news:'Haber',course:'Kurs',event:'Etkinlik',campaign:'Kampanya',jobs:'İş İlanları',stores:'Mağazalar'};
export function classifyWithTaxonomy(post){
 const category=CATEGORY_FROM_CORE[String(post.discoveryCategory||'').toLowerCase()] || CATEGORY_FROM_CORE[String(post.category||'').toLowerCase()] || 'Haber';
 const text=`${post.originalTitle||''} ${post.originalText||''}`.toLocaleLowerCase('tr');
 const candidates=CATEGORY_TREE[category]||[];
 const matches=[];
 for (const sub of candidates) for(const item of sub.items){
   const hits=item.tags.filter(t=>text.includes(t.toLocaleLowerCase('tr')));
   if(hits.length)matches.push({subcategory:sub.name,contentTitle:item.name,tags:hits,score:hits.length});
 }
 matches.sort((a,b)=>b.score-a.score);
 const match=matches[0];
 const tags=[...(match?.tags||[])];
 for(const group of Object.values(TAXONOMY.sharedTopicTags[category]||{}))for(const tag of group)if(text.includes(tag.toLocaleLowerCase('tr')) && !tags.includes(tag))tags.push(tag);
 return {category,subcategory:match?.subcategory||null,contentTitle:match?.contentTitle||null,tags:tags.slice(0,12),confidence:match?Math.min(.85,.4+match.score*.12):.35};
}
