/* =========================================================
   SporNRD - js/config.js
   Sürüm: 6.1.7-profile-preview
   Temel: Çalışan 6.1.6-preview
   Kaynak profili bilgileri eklenmiştir.
   ========================================================= */

window.SPORNRD_CONFIG = {
  appName: "SporNRD",
  slogan: "Ara Bul Seç Hemen Başla",
  version: "6.1.7-profile-preview",
  sourceRefreshMinutes: 5,

  api: {
    baseUrl: "https://spornrd-v6.bayogrt.workers.dev",
    feedEndpoint: "/api/feed-preview",
    feedPreviewEndpoint: "/api/feed-preview",
    legacyFeedEndpoint: "/api/feed",
    tyfEndpoint: "/api/tyf",
    tbfEndpoint: "/api/tbf",
    sourcesEndpoint: "/api/sources",
    coreTestEndpoint: "/api/core-test",
    feedbackEndpoint: "/api/feedback",
    learningEndpoint: "/api/learning",
    healthEndpoint: "/api/health",
    defaultLimit: 20,
    maxLimit: 30,
    timeout: 25000
  },

  preview: {
    enabled: true,
    endpoint: "/api/feed-preview",
    selectedOnly: true,
    includeBorderline: false,
    showSelectionDebug: false,
    showRankingDebug: false,
    showTemporalDebug: false
  },

  editorial: {
    enabled: true,
    label: "SporNRD Özeti",
    showOriginalTitle: true,
    showOriginalSource: true
  },

  learning: {
    enabled: true,
    localStorageKey: "spornrd_learning_v2",
    localFallback: true
  },

  /* Profil alanları yalnızca doğrulanabilen bilgilerle doldurulur.
     logoUrl boşsa kaynak kısa adından avatar oluşturulur. */
  sources: {
    tyf: {
      id: "tyf",
      name: "Türkiye Yüzme Federasyonu",
      shortName: "TYF",
      sport: "swimming",
      sportLabel: "Yüzme",
      sourceType: "FEDERASYON",
      providerType: "federation",
      section: "business_institution",
      verified: true,
      enabled: true,
      endpoint: "/api/tyf",
      website: "https://www.tyf.gov.tr",
      profile: {
        city: "Ankara",
        district: "Yenimahalle",
        address: "Beştepeler Mahallesi 33. Sokak No:13, Yenimahalle / Ankara",
        country: "Türkiye",
        description: "Yüzme branşındaki resmî duyurular, yarışmalar, eğitimler ve federasyon haberleri.",
        contactUrl: "https://www.tyf.gov.tr/sayfa/iletisim.html",
        email: "info@tyf.gov.tr",
        phone: "0312 310 09 05",
        logoUrl: "",
        coverUrl: "",
        socials: {}
      }
    },
    tbf: {
      id: "tbf",
      name: "Türkiye Basketbol Federasyonu",
      shortName: "TBF",
      sport: "basketball",
      sportLabel: "Basketbol",
      sourceType: "FEDERASYON",
      providerType: "federation",
      section: "business_institution",
      verified: true,
      enabled: true,
      endpoint: "/api/tbf",
      website: "https://www.tbf.org.tr",
      profile: {
        city: "İstanbul",
        district: "Zeytinburnu",
        address: "Kazlıçeşme Mahallesi 10. Yıl Caddesi No:2/1, Zeytinburnu / İstanbul",
        country: "Türkiye",
        description: "Basketbol branşındaki resmî haberler, ligler, müsabakalar, eğitimler ve federasyon duyuruları.",
        contactUrl: "https://www.tbf.org.tr/iletisim",
        email: "",
        phone: "+90 850 535 0 180",
        logoUrl: "",
        coverUrl: "",
        socials: {}
      }
    }
  },

  features: {
    liveFeed: true,
    previewFeed: true,
    multiSource: true,
    smartEditorial: true,
    contentIntent: true,
    discovery: true,
    temporal: true,
    selection: true,
    lifecycle: true,
    persona: true,
    ranking: true,
    search: true,
    filters: true,
    categories: true,
    sports: true,
    cities: true,
    subCategories: true,
    details: true,
    sourceLinks: true,
    sourceProfiles: true,
    wow: true,
    trash: true,
    save: true,
    share: true,
    quickReactions: false,
    localCache: true,
    learning: true
  },

  categories: [
    { id: "all", label: "Tümü", shortLabel: "Tümü", symbol: "★" },
    { id: "news", label: "Haber", shortLabel: "Haber", symbol: "H" },
    { id: "course", label: "Kurs", shortLabel: "Kurs", symbol: "K" },
    { id: "event", label: "Etkinlik", shortLabel: "Etkinlik", symbol: "E" },
    { id: "campaign", label: "Kampanya", shortLabel: "Kampanya", symbol: "%" },
    { id: "jobs", label: "İş İlanı", shortLabel: "İş İlanı", symbol: "İ" },
    { id: "stores", label: "Mağaza", shortLabel: "Mağaza", symbol: "M" }
  ],

  sports: [
    { id: "all", label: "Tümü", symbol: "★" },
    { id: "swimming", label: "Yüzme", symbol: "🏊" },
    { id: "basketball", label: "Basketbol", symbol: "🏀" }
  ],

  subCategories: {
    news: [
      { id: "all", label: "Tümü", symbol: "★" },
      { id: "development", label: "Gelişme", symbol: "G" },
      { id: "announcement", label: "Duyuru", symbol: "D" },
      { id: "result", label: "Sonuç", symbol: "S" },
      { id: "achievement", label: "Başarı", symbol: "🏆" },
      { id: "assignment", label: "Görevlendirme", symbol: "G" },
      { id: "transfer", label: "Transfer", symbol: "T" }
    ],
    course: [
      { id: "all", label: "Tümü", symbol: "★" },
      { id: "swimming", label: "Yüzme Kursu", symbol: "🏊" },
      { id: "basketball", label: "Basketbol Kursu", symbol: "🏀" },
      { id: "volleyball", label: "Voleybol Kursu", symbol: "V" },
      { id: "gymnastics", label: "Cimnastik Kursu", symbol: "C" },
      { id: "other", label: "Diğer", symbol: "D" }
    ],
    event: [
      { id: "all", label: "Tümü", symbol: "★" },
      { id: "competition", label: "Yarışma", symbol: "Y" },
      { id: "education", label: "Eğitim / Seminer", symbol: "E" },
      { id: "camp", label: "Kamp", symbol: "K" },
      { id: "festival", label: "Festival", symbol: "F" }
    ],
    campaign: [
      { id: "all", label: "Tümü", symbol: "★" },
      { id: "course_campaign", label: "Kurs Kampanyası", symbol: "K" },
      { id: "membership_campaign", label: "Üyelik", symbol: "Ü" },
      { id: "store_campaign", label: "Mağaza", symbol: "M" }
    ],
    jobs: [
      { id: "all", label: "Tümü", symbol: "★" },
      { id: "employer", label: "İşveren İlanı", symbol: "İ" },
      { id: "job_seeker", label: "İş Arayan", symbol: "A" }
    ],
    stores: [
      { id: "all", label: "Tümü", symbol: "★" },
      { id: "equipment", label: "Ekipman", symbol: "E" },
      { id: "clothing", label: "Giyim", symbol: "G" },
      { id: "nutrition", label: "Beslenme", symbol: "B" },
      { id: "accessories", label: "Aksesuar", symbol: "A" }
    ]
  },

  /* Section filtre değildir. Gelecek profil türlerinde kullanılır. */
  sections: [
    { id: "individual_athlete", label: "Sporcu" },
    { id: "trainer_coach", label: "Antrenör & Eğitmen" },
    { id: "business_institution", label: "İşletme & Kurum" }
  ]
};
