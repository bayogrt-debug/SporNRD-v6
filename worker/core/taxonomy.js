/* =========================================================
   SporNRD
   worker/core/taxonomy.js

   SporNRD Ortak Sınıflandırma Sözlüğü

   Sürüm: 6.1.2

   TEMEL MİMARİ
   ---------------------------------------------------------
   1. BRANŞ
      basketball
      swimming
      volleyball
      gymnastics
      other

   2. BÖLÜM
      individual_athlete
      trainer_coach
      business_institution

   3. ANA KATEGORİ
      news
      course
      event
      campaign
      jobs
      stores

   4. ALT KATEGORİ
      Ana kategoriye göre değişir.

   5. PROVIDER TYPE
      İçeriği yayımlayan / sunan taraf.

   =========================================================
   KULLANICI EKRANI
   ---------------------------------------------------------

   Yüzme Haber
   Yüzme Kurs
   Yüzme Etkinlik
   Yüzme Kampanya
   Yüzme İş İlanı
   Yüzme Mağaza

   Basketbol Haber
   Basketbol Kurs
   Basketbol Etkinlik
   ...

   =========================================================
   BÖLÜM KURALI
   ---------------------------------------------------------

   Bölüm kullanıcı kartında gösterilmek zorunda değildir.

   Örnek:

   Türkiye Yüzme Federasyonu
   → business_institution

   Fenerbahçe Spor Kulübü
   → business_institution

   Bir antrenörün kendi hesabı
   → trainer_coach

   Bir sporcunun kendi hesabı
   → individual_athlete

   ========================================================= */


/* =========================================================
   VERSION
   ========================================================= */

export const TAXONOMY_VERSION =
  "6.1.2";


/* =========================================================
   BRANŞLAR
   ========================================================= */

export const SPORTS = {

  basketball: {

    id:
      "basketball",

    label:
      "Basketbol",

    emoji:
      "🏀",

    enabled:
      true

  },


  swimming: {

    id:
      "swimming",

    label:
      "Yüzme",

    emoji:
      "🏊",

    enabled:
      true

  },


  volleyball: {

    id:
      "volleyball",

    label:
      "Voleybol",

    emoji:
      "🏐",

    enabled:
      true

  },


  gymnastics: {

    id:
      "gymnastics",

    label:
      "Cimnastik",

    emoji:
      "🤸",

    enabled:
      true

  },


  other: {

    id:
      "other",

    label:
      "Diğer",

    emoji:
      "🏆",

    enabled:
      true

  }

};


/* =========================================================
   BRANŞ FİLTRELERİ

   Mobil uygulamanın üst yuvarlakları.
   ========================================================= */

export const SPORT_FILTERS = [

  {

    id:
      "all",

    label:
      "Tümü",

    emoji:
      "★"

  },

  ...Object.values(
    SPORTS
  )

];


/* =========================================================
   BÖLÜMLER

   Şimdilik arka planda kullanılır.

   İleride profil / kayıt sistemi için de
   temel hesap bölümleri olacaktır.
   ========================================================= */

export const SECTIONS = {

  individual_athlete: {

    id:
      "individual_athlete",

    label:
      "Bireysel & Sporcu",

    shortLabel:
      "Bireysel & Sporcu",

    enabled:
      true

  },


  trainer_coach: {

    id:
      "trainer_coach",

    label:
      "Eğitmen & Antrenör",

    shortLabel:
      "Eğitmen & Antrenör",

    enabled:
      true

  },


  business_institution: {

    id:
      "business_institution",

    label:
      "İşletme & Kurum",

    shortLabel:
      "İşletme & Kurum",

    enabled:
      true

  }

};


/* =========================================================
   ANA KATEGORİLER

   KESİN SPORNRD KATEGORİLERİ

   Bunların dışına yeni ana kategori oluşturulmaz.
   ========================================================= */

export const CATEGORIES = {


  /* -------------------------------------------------------
     HABER
     ------------------------------------------------------- */

  news: {

    id:
      "news",

    label:
      "Haber",

    shortLabel:
      "Haber",

    enabled:
      true

  },


  /* -------------------------------------------------------
     KURS
     ------------------------------------------------------- */

  course: {

    id:
      "course",

    label:
      "Kurs",

    shortLabel:
      "Kurs",

    enabled:
      true

  },


  /* -------------------------------------------------------
     ETKİNLİK
     ------------------------------------------------------- */

  event: {

    id:
      "event",

    label:
      "Etkinlik",

    shortLabel:
      "Etkinlik",

    enabled:
      true

  },


  /* -------------------------------------------------------
     KAMPANYA
     ------------------------------------------------------- */

  campaign: {

    id:
      "campaign",

    label:
      "Kampanya",

    shortLabel:
      "Kampanya",

    enabled:
      true

  },


  /* -------------------------------------------------------
     İŞ İLANLARI
     ------------------------------------------------------- */

  jobs: {

    id:
      "jobs",

    label:
      "İş İlanları",

    shortLabel:
      "İş İlanı",

    enabled:
      true

  },


  /* -------------------------------------------------------
     MAĞAZALAR
     ------------------------------------------------------- */

  stores: {

    id:
      "stores",

    label:
      "Mağazalar",

    shortLabel:
      "Mağaza",

    enabled:
      true

  }

};


/* =========================================================
   ALT KATEGORİLER

   Kullanıcıya tamamının gösterilmesi zorunlu değildir.

   Özellikle HABER alt kategorileri sistemin
   içeriği anlamasına yardımcı olan arka plan bilgisidir.
   ========================================================= */

export const SUBCATEGORIES = {


  /* =======================================================
     HABER

     Kullanıcı kartında:

     Basketbol Haber
     Yüzme Haber

     görür.

     Aşağıdaki alanlar ise sistemin
     "ne oldu?" sorusunun cevabıdır.
     ========================================================= */

  news: {


    /* -----------------------------------------------------
       Sonuç
       ----------------------------------------------------- */

    result: {

      id:
        "result",

      label:
        "Müsabaka & Sonuç"

    },


    /* -----------------------------------------------------
       Başarı
       ----------------------------------------------------- */

    achievement: {

      id:
        "achievement",

      label:
        "Başarı & Derece"

    },


    /* -----------------------------------------------------
       Görevlendirme
       ----------------------------------------------------- */

    assignment: {

      id:
        "assignment",

      label:
        "Görevlendirme & Atama"

    },


    /* -----------------------------------------------------
       Transfer
       ----------------------------------------------------- */

    transfer: {

      id:
        "transfer",

      label:
        "Transfer & Kariyer"

    },


    /* -----------------------------------------------------
       Duyuru / Açıklama
       ----------------------------------------------------- */

    announcement: {

      id:
        "announcement",

      label:
        "Duyuru & Açıklama"

    },


    /* -----------------------------------------------------
       Genel gelişme
       ----------------------------------------------------- */

    development: {

      id:
        "development",

      label:
        "Gündem & Gelişme"

    }

  },


  /* =======================================================
     KURS

     Kursun alt kategorisi branştır.

     Örnek:

     sport       = swimming
     category    = course
     subCategory = swimming

     Kullanıcı:
     Yüzme Kurs

     görür.
     ========================================================= */

  course: {

    basketball: {

      id:
        "basketball",

      label:
        "Basketbol"

    },


    swimming: {

      id:
        "swimming",

      label:
        "Yüzme"

    },


    volleyball: {

      id:
        "volleyball",

      label:
        "Voleybol"

    },


    gymnastics: {

      id:
        "gymnastics",

      label:
        "Cimnastik"

    },


    other: {

      id:
        "other",

      label:
        "Diğer Spor Kursları"

    }

  },


  /* =======================================================
     ETKİNLİK
     ========================================================= */

  event: {


    /* -----------------------------------------------------
       TURNUVA & SPOR YARIŞMALARI
       ----------------------------------------------------- */

    competition: {

      id:
        "competition",

      label:
        "Turnuva & Spor Yarışmaları"

    },


    /* -----------------------------------------------------
       EĞİTİM / SEMİNER

       DİKKAT:
       Kurs artık buraya girmez.

       Kurs kendi ana kategorisidir.
       ----------------------------------------------------- */

    education: {

      id:
        "education",

      label:
        "Eğitim & Seminer"

    },


    /* -----------------------------------------------------
       TANITIM & FESTİVAL
       ----------------------------------------------------- */

    festival: {

      id:
        "festival",

      label:
        "Tanıtım & Spor Festivali"

    },


    /* -----------------------------------------------------
       KAMP / SAĞLIKLI YAŞAM
       ----------------------------------------------------- */

    camp: {

      id:
        "camp",

      label:
        "Spor Kampı & Sağlıklı Yaşam"

    }

  },


  /* =======================================================
     KAMPANYA
     ========================================================= */

  campaign: {

    course_campaign: {

      id:
        "course_campaign",

      label:
        "Kurs Kampanyası"

    },


    membership_campaign: {

      id:
        "membership_campaign",

      label:
        "Üyelik Kampanyası"

    },


    store_campaign: {

      id:
        "store_campaign",

      label:
        "Mağaza Kampanyası"

    }

  },


  /* =======================================================
     İŞ İLANLARI
     ========================================================= */

  jobs: {

    job_seeker: {

      id:
        "job_seeker",

      label:
        "İş Arayan İlanı"

    },


    employer: {

      id:
        "employer",

      label:
        "İş Veren İlanı"

    }

  },


  /* =======================================================
     MAĞAZALAR
     ========================================================= */

  stores: {

    accessories: {

      id:
        "accessories",

      label:
        "Aksesuar & Destek Ürünleri"

    },


    nutrition: {

      id:
        "nutrition",

      label:
        "Beslenme & Takviye"

    },


    clothing: {

      id:
        "clothing",

      label:
        "Giyim & Ayakkabı"

    },


    equipment: {

      id:
        "equipment",

      label:
        "Ekipman & Malzemeler"

    }

  }

};


/* =========================================================
   PROVIDER / KAYNAK TÜRLERİ

   Provider ana kategori değildir.

   "İçeriği kim yayımlıyor / sunuyor?"
   sorusunun cevabıdır.
   ========================================================= */

export const PROVIDER_TYPES = {


  /* -------------------------------------------------------
     BİREYSEL / SPORCU
     ------------------------------------------------------- */

  athlete: {

    id:
      "athlete",

    label:
      "Sporcu",

    section:
      "individual_athlete"

  },


  individual: {

    id:
      "individual",

    label:
      "Bireysel",

    section:
      "individual_athlete"

  },


  /* -------------------------------------------------------
     EĞİTMEN / ANTRENÖR
     ------------------------------------------------------- */

  coach: {

    id:
      "coach",

    label:
      "Antrenör",

    section:
      "trainer_coach"

  },


  trainer: {

    id:
      "trainer",

    label:
      "Eğitmen",

    section:
      "trainer_coach"

  },


  /* -------------------------------------------------------
     KULÜP
     ------------------------------------------------------- */

  club: {

    id:
      "club",

    label:
      "Spor Kulübü",

    section:
      "business_institution"

  },


  /* -------------------------------------------------------
     AKADEMİ
     ------------------------------------------------------- */

  academy: {

    id:
      "academy",

    label:
      "Spor Akademisi",

    section:
      "business_institution"

  },


  /* -------------------------------------------------------
     SPOR SALONU
     ------------------------------------------------------- */

  gym: {

    id:
      "gym",

    label:
      "Spor Salonu",

    section:
      "business_institution"

  },


  /* -------------------------------------------------------
     TESİS
     ------------------------------------------------------- */

  facility: {

    id:
      "facility",

    label:
      "Spor Tesisi",

    section:
      "business_institution"

  },


  /* -------------------------------------------------------
     FEDERASYON / KAMU
     ------------------------------------------------------- */

  federation: {

    id:
      "federation",

    label:
      "Federasyon / Kamu",

    section:
      "business_institution"

  },


  /* -------------------------------------------------------
     MAĞAZA
     ------------------------------------------------------- */

  store: {

    id:
      "store",

    label:
      "Spor Mağazası",

    section:
      "business_institution"

  },


  /* -------------------------------------------------------
     ORGANİZATÖR
     ------------------------------------------------------- */

  organizer: {

    id:
      "organizer",

    label:
      "Organizatör",

    section:
      "business_institution"

  },


  /* -------------------------------------------------------
     MEDYA
     ------------------------------------------------------- */

  media: {

    id:
      "media",

    label:
      "Medya",

    section:
      "business_institution"

  },


  /* -------------------------------------------------------
     DİĞER
     ------------------------------------------------------- */

  other: {

    id:
      "other",

    label:
      "Diğer",

    section:
      "business_institution"

  }

};


/* =========================================================
   İÇERİK TÜRLERİ

   Bunlar kullanıcı ana kategorisi değildir.

   Kaynağın içeriğinin teknik / semantik türünü
   anlamak için kullanılır.
   ========================================================= */

export const CONTENT_TYPES = {

  coach: {

    id:
      "coach",

    label:
      "Antrenör İçeriği"

  },


  athlete: {

    id:
      "athlete",

    label:
      "Sporcu İçeriği"

  },


  competition: {

    id:
      "competition",

    label:
      "Yarışma / Müsabaka"

  },


  education: {

    id:
      "education",

    label:
      "Eğitim"

  },


  announcement: {

    id:
      "announcement",

    label:
      "Duyuru"

  },


  campaign: {

    id:
      "campaign",

    label:
      "Kampanya"

  },


  job: {

    id:
      "job",

    label:
      "İş İlanı"

  },


  product: {

    id:
      "product",

    label:
      "Ürün"

  },


  general: {

    id:
      "general",

    label:
      "Genel Spor İçeriği"

  }

};


/* =========================================================
   POST DURUMLARI

   lifecycle.status ile temporal.eventStatus
   birbirinden farklı kavramlardır.

   Örnek:

   lifecycle.status = new
   temporal.state   = past
   eventStatus      = completed

   mümkündür.

   Bu:
   "Yeni yayımlanmış geçmiş olay haberi"
   anlamına gelebilir.
   ========================================================= */

export const POST_STATUSES = {

  active: {

    id:
      "active",

    label:
      "Aktif"

  },


  new: {

    id:
      "new",

    label:
      "Yeni"

  },


  closing_soon: {

    id:
      "closing_soon",

    label:
      "Son Günler"

  },


  updated: {

    id:
      "updated",

    label:
      "Güncellendi"

  },


  expired: {

    id:
      "expired",

    label:
      "Süresi Doldu"

  },


  removed: {

    id:
      "removed",

    label:
      "Kaynaktan Kaldırıldı"

  }

};


/* =========================================================
   POST AKSİYONLARI
   ========================================================= */

export const ACTION_TYPES = {

  detail: {

    id:
      "detail",

    label:
      "Detay"

  },


  register: {

    id:
      "register",

    label:
      "Kayıt Ol"

  },


  buy: {

    id:
      "buy",

    label:
      "Satın Al"

  },


  apply: {

    id:
      "apply",

    label:
      "Başvur"

  },


  ticket: {

    id:
      "ticket",

    label:
      "Bilet Al"

  },


  join: {

    id:
      "join",

    label:
      "Katıl"

  },


  campaign: {

    id:
      "campaign",

    label:
      "Kampanyayı Gör"

  },


  product: {

    id:
      "product",

    label:
      "Ürünü Gör"

  },


  contact: {

    id:
      "contact",

    label:
      "İletişime Geç"

  },


  source: {

    id:
      "source",

    label:
      "Resmî Kaynak"

  }

};


/* =========================================================
   MEDYA TÜRLERİ
   ========================================================= */

export const MEDIA_TYPES = {

  image:
    "image",

  video:
    "video",

  audio:
    "audio"

};


/* =========================================================
   KATEGORİYE ÖZEL FİLTRE / VERİ ALANLARI

   Bunlar ileride:

   - crawler
   - extraction engine
   - filtre ekranı
   - arama sistemi
   - ranking

   tarafından ortak kullanılabilir.
   ========================================================= */

export const CATEGORY_FILTER_FIELDS = {


  /* =======================================================
     HABER

     Haberlerde:

     sport
     section
     source
     providerType
     subCategory
     contentIntent
     temporal
     eventStatus

     zaten post seviyesinde tutulur.

     Bu nedenle details altında zorunlu ticari alan yoktur.
     ========================================================= */

  news: [],


  /* =======================================================
     KURS
     ========================================================= */

  course: [

    "city",

    "district",

    "venue",

    "days",

    "startTime",

    "endTime",

    "price",

    "currency",

    "priceUnit",

    "ageMin",

    "ageMax",

    "ageGroup",

    "level",

    "lessonType",

    "capacity",

    "startDate",

    "endDate",

    "registrationDeadline",

    "trialLesson"

  ],


  /* =======================================================
     ETKİNLİK
     ========================================================= */

  event: [

    "city",

    "district",

    "venue",

    "startDate",

    "endDate",

    "startTime",

    "endTime",

    "price",

    "currency",

    "ageMin",

    "ageMax",

    "registrationDeadline",

    "capacity",

    "participationRequirements",

    "spectatorAllowed",

    "accommodation",

    "meals"

  ],


  /* =======================================================
     KAMPANYA
     ========================================================= */

  campaign: [

    "city",

    "district",

    "oldPrice",

    "newPrice",

    "price",

    "currency",

    "discountRate",

    "startDate",

    "endDate",

    "eligibility",

    "conditions",

    "couponCode",

    "channel"

  ],


  /* =======================================================
     İŞ İLANLARI
     ========================================================= */

  jobs: [

    "position",

    "city",

    "district",

    "employmentType",

    "workMode",

    "days",

    "startTime",

    "endTime",

    "experience",

    "certificateLevel",

    "salaryMin",

    "salaryMax",

    "currency",

    "applicationDeadline"

  ],


  /* =======================================================
     MAĞAZALAR
     ========================================================= */

  stores: [

    "brand",

    "productName",

    "price",

    "salePrice",

    "currency",

    "discountRate",

    "stockStatus",

    "variants",

    "channel",

    "shipping"

  ]

};


/* =========================================================
   VARSAYILAN PARA BİRİMİ
   ========================================================= */

export const DEFAULT_CURRENCY =
  "TRY";


/* =========================================================
   LEGACY CATEGORY ALIASES

   Geçiş döneminde eski dosyalardan:

   courses
   events
   campaigns
   sports_news

   gelebilir.

   Bunları yeni sisteme güvenli biçimde çeviririz.

   Böylece tek seferde bütün eski dosyaların
   çökmesini önleriz.
   ========================================================= */

const CATEGORY_ALIASES = {

  news:
    "news",

  haber:
    "news",

  sports_news:
    "news",

  sports_news_category:
    "news",


  course:
    "course",

  courses:
    "course",

  kurs:
    "course",

  kurslar:
    "course",


  event:
    "event",

  events:
    "event",

  etkinlik:
    "event",

  etkinlikler:
    "event",


  campaign:
    "campaign",

  campaigns:
    "campaign",

  kampanya:
    "campaign",

  kampanyalar:
    "campaign",


  job:
    "jobs",

  jobs:
    "jobs",

  is_ilani:
    "jobs",

  is_ilanlari:
    "jobs",


  store:
    "stores",

  stores:
    "stores",

  magaza:
    "stores",

  magazalar:
    "stores"

};


/* =========================================================
   SPORT BUL
   ========================================================= */

export function getSport(
  id
) {

  const key =
    normalizeTaxonomyId(
      id
    );


  return (
    SPORTS[
      key
    ]
    ||
    null
  );

}


/* =========================================================
   SECTION BUL
   ========================================================= */

export function getSection(
  id
) {

  const key =
    normalizeTaxonomyId(
      id
    );


  return (
    SECTIONS[
      key
    ]
    ||
    null
  );

}


/* =========================================================
   CATEGORY ID NORMALİZE

   Legacy plural ID'leri yeni canonical ID'ye çevirir.
   ========================================================= */

export function normalizeCategoryId(
  value
) {

  const key =
    normalizeTaxonomyId(
      value
    );


  return (
    CATEGORY_ALIASES[
      key
    ]
    ||
    key
  );

}


/* =========================================================
   CATEGORY BUL
   ========================================================= */

export function getCategory(
  id
) {

  const key =
    normalizeCategoryId(
      id
    );


  return (
    CATEGORIES[
      key
    ]
    ||
    null
  );

}


/* =========================================================
   SUBCATEGORY BUL
   ========================================================= */

export function getSubCategory(
  categoryId,
  subCategoryId
) {

  const category =
    normalizeCategoryId(
      categoryId
    );


  const subCategory =
    normalizeTaxonomyId(
      subCategoryId
    );


  return (
    SUBCATEGORIES[
      category
    ]?.[
      subCategory
    ]
    ||
    null
  );

}


/* =========================================================
   PROVIDER TYPE BUL
   ========================================================= */

export function getProviderType(
  id
) {

  const key =
    normalizeTaxonomyId(
      id
    );


  return (
    PROVIDER_TYPES[
      key
    ]
    ||
    null
  );

}


/* =========================================================
   PROVIDER → SECTION

   Provider türünden bölüm bulmak için ortak yardımcı.

   Örnek:

   federation
   → business_institution

   coach
   → trainer_coach

   athlete
   → individual_athlete
   ========================================================= */

export function getSectionByProviderType(
  providerType
) {

  const provider =
    getProviderType(
      providerType
    );


  if (
    !provider ||
    !provider.section
  ) {

    return null;

  }


  return getSection(
    provider.section
  );

}


/* =========================================================
   CONTENT TYPE BUL
   ========================================================= */

export function getContentType(
  id
) {

  const key =
    normalizeTaxonomyId(
      id
    );


  return (
    CONTENT_TYPES[
      key
    ]
    ||
    null
  );

}


/* =========================================================
   POST STATUS BUL
   ========================================================= */

export function getPostStatus(
  id
) {

  const key =
    normalizeTaxonomyId(
      id
    );


  return (
    POST_STATUSES[
      key
    ]
    ||
    null
  );

}


/* =========================================================
   ACTION TYPE BUL
   ========================================================= */

export function getActionType(
  id
) {

  const key =
    normalizeTaxonomyId(
      id
    );


  return (
    ACTION_TYPES[
      key
    ]
    ||
    null
  );

}


/* =========================================================
   CATEGORY FILTER ALANLARI
   ========================================================= */

export function getCategoryFilterFields(
  categoryId
) {

  const category =
    normalizeCategoryId(
      categoryId
    );


  const fields =
    CATEGORY_FILTER_FIELDS[
      category
    ];


  return Array.isArray(
    fields
  )

    ? [
        ...fields
      ]

    : [];

}


/* =========================================================
   KULLANICI ETİKETİ OLUŞTUR

   Örnek:

   swimming + news
   → "Yüzme Haber"

   swimming + course
   → "Yüzme Kurs"

   basketball + event
   → "Basketbol Etkinlik"
   ========================================================= */

export function buildSportCategoryLabel(
  sportId,
  categoryId
) {

  const sport =
    getSport(
      sportId
    );


  const category =
    getCategory(
      categoryId
    );


  const sportLabel =
    sport?.label ||
    "Spor";


  const categoryLabel =
    category?.shortLabel ||
    category?.label ||
    "";


  return [

    sportLabel,

    categoryLabel

  ]
    .filter(
      Boolean
    )
    .join(
      " "
    );

}


/* =========================================================
   GEÇERLİ BRANŞ MI?
   ========================================================= */

export function isValidSport(
  id
) {

  return Boolean(
    getSport(
      id
    )
  );

}


/* =========================================================
   GEÇERLİ BÖLÜM MÜ?
   ========================================================= */

export function isValidSection(
  id
) {

  return Boolean(
    getSection(
      id
    )
  );

}


/* =========================================================
   GEÇERLİ KATEGORİ Mİ?
   ========================================================= */

export function isValidCategory(
  id
) {

  return Boolean(
    getCategory(
      id
    )
  );

}


/* =========================================================
   GEÇERLİ ALT KATEGORİ Mİ?
   ========================================================= */

export function isValidSubCategory(
  categoryId,
  subCategoryId
) {

  return Boolean(
    getSubCategory(
      categoryId,
      subCategoryId
    )
  );

}


/* =========================================================
   GEÇERLİ PROVIDER TYPE MI?
   ========================================================= */

export function isValidProviderType(
  id
) {

  return Boolean(
    getProviderType(
      id
    )
  );

}


/* =========================================================
   TÜM AKTİF BRANŞLAR
   ========================================================= */

export function getEnabledSports() {

  return Object
    .values(
      SPORTS
    )
    .filter(
      item =>
        item?.enabled ===
        true
    );

}


/* =========================================================
   TÜM AKTİF BÖLÜMLER
   ========================================================= */

export function getEnabledSections() {

  return Object
    .values(
      SECTIONS
    )
    .filter(
      item =>
        item?.enabled ===
        true
    );

}


/* =========================================================
   TÜM AKTİF KATEGORİLER
   ========================================================= */

export function getEnabledCategories() {

  return Object
    .values(
      CATEGORIES
    )
    .filter(
      item =>
        item?.enabled ===
        true
    );

}


/* =========================================================
   ID NORMALİZE

   Örnek:

   "İşletme & Kurum"
   → "isletme_kurum"

   "İş İlanları"
   → "is_ilanlari"

   Ancak sistem içinde mümkün olduğunca
   sabit teknik ID kullanacağız.
   ========================================================= */

export function normalizeTaxonomyId(
  value
) {

  return String(
    value ||
    ""
  )

    .trim()

    .toLocaleLowerCase(
      "tr-TR"
    )

    .replaceAll(
      "ç",
      "c"
    )

    .replaceAll(
      "ğ",
      "g"
    )

    .replaceAll(
      "ı",
      "i"
    )

    .replaceAll(
      "ö",
      "o"
    )

    .replaceAll(
      "ş",
      "s"
    )

    .replaceAll(
      "ü",
      "u"
    )

    .replace(
      /[^a-z0-9]+/g,
      "_"
    )

    .replace(
      /^_+|_+$/g,
      ""
    );

}