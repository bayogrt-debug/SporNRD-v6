/* =========================================================
   SporNRD
   worker/core/taxonomy.js

   SporNRD ortak sınıflandırma sözlüğü

   Sürüm: 6.1.0
   Amaç:
   - Branş
   - Ana kategori
   - Alt kategori
   - Kaynak / sağlayıcı türü
   - İçerik türü
   - Post durumu
   - Aksiyon türleri
   - Kategoriye özel veri / filtre alanları

   Bu dosya SporNRD'nin ortak dilidir.
   ========================================================= */


/* =========================================================
   BRANŞLAR

   Kullanıcının ana akışın üst kısmında gördüğü
   yatay branş filtresi.

   "all" yalnızca UI filtresidir.
   Gerçek postlarda sport = "all" kullanılmaz.
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

   Ana ekran üst yuvarlakları.
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
   ANA KATEGORİLER

   Bunlar kullanıcının "Ne arıyorsun?" sorusunun cevabı.
   ========================================================= */

export const CATEGORIES = {

  courses: {

    id:
      "courses",

    label:
      "Spor Kursları",

    shortLabel:
      "Kurslar",

    enabled:
      true

  },


  events: {

    id:
      "events",

    label:
      "Spor Etkinlikleri",

    shortLabel:
      "Etkinlikler",

    enabled:
      true

  },


  campaigns: {

    id:
      "campaigns",

    label:
      "Kampanyalar",

    shortLabel:
      "Kampanyalar",

    enabled:
      true

  },


  jobs: {

    id:
      "jobs",

    label:
      "İş İlanları",

    shortLabel:
      "İş İlanları",

    enabled:
      true

  },


  stores: {

    id:
      "stores",

    label:
      "Mağazalar",

    shortLabel:
      "Mağazalar",

    enabled:
      true

  }

};


/* =========================================================
   ALT KATEGORİLER

   Spor Kurslarında mevcut tasarım gereği branş
   alt kategorisi de tutulabilir.

   Ayrıca postun bağımsız "sport" alanı bulunacaktır.
   Böylece ileride yapı bozulmadan büyüyebilir.
   ========================================================= */

export const SUBCATEGORIES = {


  /* -------------------------------------------------------
     SPOR KURSLARI
     ------------------------------------------------------- */

  courses: {

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


  /* -------------------------------------------------------
     SPOR ETKİNLİKLERİ
     ------------------------------------------------------- */

  events: {

    competition: {

      id:
        "competition",

      label:
        "Turnuva & Spor Yarışmaları"

    },

    education: {

      id:
        "education",

      label:
        "Eğitim & Seminerler"

    },

    festival: {

      id:
        "festival",

      label:
        "Tanıtım & Spor Festivalleri"

    },

    camp: {

      id:
        "camp",

      label:
        "Spor Kampı & Sağlıklı Yaşam"

    }

  },


  /* -------------------------------------------------------
     KAMPANYALAR
     ------------------------------------------------------- */

  campaigns: {

    course_campaign: {

      id:
        "course_campaign",

      label:
        "Kurs Kampanyaları"

    },

    membership_campaign: {

      id:
        "membership_campaign",

      label:
        "Üyelik Kampanyaları"

    },

    store_campaign: {

      id:
        "store_campaign",

      label:
        "Mağaza Kampanyaları"

    }

  },


  /* -------------------------------------------------------
     İŞ İLANLARI
     ------------------------------------------------------- */

  jobs: {

    job_seeker: {

      id:
        "job_seeker",

      label:
        "İş Arayan İlanları"

    },

    employer: {

      id:
        "employer",

      label:
        "İş Veren İlanları"

    }

  },


  /* -------------------------------------------------------
     MAĞAZALAR
     ------------------------------------------------------- */

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
   SAĞLAYICI / KAYNAK TÜRLERİ

   Bunlar kategori DEĞİLDİR.

   İçeriği yayımlayan veya hizmeti sunan tarafı anlatır.
   ========================================================= */

export const PROVIDER_TYPES = {

  coach: {

    id:
      "coach",

    label:
      "Antrenör"

  },


  club: {

    id:
      "club",

    label:
      "Spor Kulübü"

  },


  academy: {

    id:
      "academy",

    label:
      "Spor Akademisi"

  },


  gym: {

    id:
      "gym",

    label:
      "Spor Salonu"

  },


  facility: {

    id:
      "facility",

    label:
      "Spor Tesisi"

  },


  federation: {

    id:
      "federation",

    label:
      "Federasyon / Kamu"

  },


  store: {

    id:
      "store",

    label:
      "Spor Mağazası"

  },


  organizer: {

    id:
      "organizer",

    label:
      "Organizatör"

  },


  media: {

    id:
      "media",

    label:
      "Medya"

  },


  other: {

    id:
      "other",

    label:
      "Diğer"

  }

};


/* =========================================================
   İÇERİK TÜRLERİ

   Mevcut TYF / TBF sistemindeki:
   coach
   athlete
   event
   education
   announcement

   bilgisini kaybetmiyoruz.

   Ancak bunlar artık ana kullanıcı kategorisi değildir.
   Arka plandaki içerik türüdür.
   ========================================================= */

export const CONTENT_TYPES = {

  coach: {

    id:
      "coach",

    label:
      "Antrenör"

  },


  athlete: {

    id:
      "athlete",

    label:
      "Sporcu"

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

   Yaşam döngüsü motoru daha sonra bu değerleri kullanacak.
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

   Kullanıcıya gösterilecek gerçek işlem butonları.
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

   Uygulama ileride filtre arayüzünü bu yapıdan
   otomatik üretebilir.
   ========================================================= */

export const CATEGORY_FILTER_FIELDS = {


  /* -------------------------------------------------------
     SPOR KURSLARI
     ------------------------------------------------------- */

  courses: [

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

    "registrationDeadline",

    "trialLesson"

  ],


  /* -------------------------------------------------------
     SPOR ETKİNLİKLERİ
     ------------------------------------------------------- */

  events: [

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


  /* -------------------------------------------------------
     KAMPANYALAR
     ------------------------------------------------------- */

  campaigns: [

    "city",

    "district",

    "oldPrice",

    "newPrice",

    "currency",

    "discountRate",

    "startDate",

    "endDate",

    "eligibility",

    "conditions",

    "couponCode",

    "channel"

  ],


  /* -------------------------------------------------------
     İŞ İLANLARI
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     MAĞAZALAR
     ------------------------------------------------------- */

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
    ] ||
    null
  );

}


/* =========================================================
   CATEGORY BUL
   ========================================================= */

export function getCategory(
  id
) {

  const key =
    normalizeTaxonomyId(
      id
    );


  return (
    CATEGORIES[
      key
    ] ||
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
    normalizeTaxonomyId(
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
    ] ||
    null
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
    ] ||
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
    ] ||
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
    ] ||
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
    normalizeTaxonomyId(
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
   ID NORMALİZE

   "Spor Kursları"
   → "spor_kurslari"

   "İş Veren"
   → "is_veren"

   Fakat uygulama içinde mümkün olduğunca
   hazır sabit ID'leri kullanacağız.
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
