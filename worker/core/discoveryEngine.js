/* =========================================================
   SporNRD
   worker/core/discoveryEngine.js

   SporNRD Keşif / Sınıflandırma Motoru

   Sürüm: 6.1.0

   Amaç:
   ---------------------------------------------------------
   - İçeriğin branşını belirlemek
   - 5 ana kategoriden uygun olanı seçmek
   - Alt kategoriyi belirlemek
   - Provider / kaynak türünü belirlemek
   - İçerik türünü belirlemek
   - Kategori için gerekli bilgi alanlarını belirlemek
   - Eksik kritik bilgileri tespit etmek

   ANA KATEGORİLER
   ---------------------------------------------------------
   courses
   events
   campaigns
   jobs
   stores

   TEMEL PRENSİP
   ---------------------------------------------------------
   Aynı kelime farklı kaynaklarda farklı anlama gelebilir.

   Örnek:
   Federasyon + Antrenör Kursu
   → Spor Etkinlikleri > Eğitim & Seminerler

   Akademi + Çocuk Yüzme Kursu
   → Spor Kursları > Yüzme
   ========================================================= */


import {

  getSport,
  getCategory,
  getSubCategory,
  getProviderType,
  getContentType,
  getCategoryFilterFields

} from "./taxonomy.js";


import {

  getSource

} from "./sourceRegistry.js";


/* =========================================================
   VERSION
   ========================================================= */

export const DISCOVERY_VERSION =
  "1.0";


/* =========================================================
   ANA KEŞİF
   ========================================================= */

export function discoverPost(
  post,
  options = {}
) {

  if (
    !post ||
    typeof post !==
    "object"
  ) {

    return createFallbackDiscovery();

  }


  const text =
    buildSearchText(
      post
    );


  const source =
    resolveSource(
      post
    );


  const providerType =
    resolveProviderType(
      post,
      source,
      text
    );


  const sport =
    resolveSport(
      post,
      source,
      text
    );


  const category =
    resolveCategory({

      post:
        post,

      text:
        text,

      source:
        source,

      providerType:
        providerType,

      sport:
        sport

    });


  const subCategory =
    resolveSubCategory({

      post:
        post,

      text:
        text,

      category:
        category,

      providerType:
        providerType,

      sport:
        sport

    });


  const contentType =
    resolveContentType({

      post:
        post,

      text:
        text,

      category:
        category,

      subCategory:
        subCategory

    });


  const requiredFields =
    getCategoryFilterFields(
      category
    );


  const missingFields =
    findMissingFields(
      post,
      requiredFields
    );


  const confidenceScore =
    calculateDiscoveryConfidence({

      sport:
        sport,

      category:
        category,

      subCategory:
        subCategory,

      providerType:
        providerType,

      source:
        source,

      text:
        text

    });


  const signals =
    collectSignals({

      text:
        text,

      category:
        category,

      subCategory:
        subCategory,

      providerType:
        providerType,

      sport:
        sport

    });


  return {

    version:
      DISCOVERY_VERSION,


    sport:
      sport,


    category:
      category,


    subCategory:
      subCategory,


    providerType:
      providerType,


    contentType:
      contentType,


    requiredFields:
      requiredFields,


    missingFields:
      missingFields,


    confidenceScore:
      confidenceScore,


    signals:
      signals,


    discoveredAt:
      new Date()
        .toISOString()

  };

}


/* =========================================================
   KEŞFİ POSTA UYGULA

   Orijinal post değişmez.
   Yeni nesne döndürür.
   ========================================================= */

export function applyDiscovery(
  post,
  options = {}
) {

  if (
    !post ||
    typeof post !==
    "object"
  ) {

    return post;

  }


  const discovery =
    discoverPost(
      post,
      options
    );


  return {

    ...post,


    sport:
      discovery.sport,


    category:
      discovery.category,


    subCategory:
      discovery.subCategory,


    providerType:
      discovery.providerType,


    contentType:
      discovery.contentType,


    discoveryMeta: {

      version:
        discovery.version,

      confidenceScore:
        discovery.confidenceScore,

      requiredFields:
        discovery.requiredFields,

      missingFields:
        discovery.missingFields,

      signals:
        discovery.signals,

      discoveredAt:
        discovery.discoveredAt

    }

  };

}


/* =========================================================
   POST LİSTESİNE UYGULA
   ========================================================= */

export function applyDiscoveryToPosts(
  posts,
  options = {}
) {

  if (
    !Array.isArray(
      posts
    )
  ) {

    return [];

  }


  return posts

    .map(
      post =>
        applyDiscovery(
          post,
          options
        )
    )

    .filter(
      Boolean
    );

}


/* =========================================================
   SADECE SINIFLANDIRMA
   ========================================================= */

export function classifyDiscovery(
  post
) {

  const result =
    discoverPost(
      post
    );


  return {

    sport:
      result.sport,

    category:
      result.category,

    subCategory:
      result.subCategory,

    providerType:
      result.providerType,

    contentType:
      result.contentType,

    confidenceScore:
      result.confidenceScore

  };

}


/* =========================================================
   SOURCE ÇÖZ
   ========================================================= */

function resolveSource(
  post
) {

  const sourceId =
    cleanString(

      post?.source?.id ||

      post?.sourceId

    )
      .toLowerCase();


  if (
    sourceId
  ) {

    const registrySource =
      getSource(
        sourceId
      );


    if (
      registrySource
    ) {

      return registrySource;

    }

  }


  if (
    isPlainObject(
      post.source
    )
  ) {

    return post.source;

  }


  return {};

}


/* =========================================================
   PROVIDER TYPE
   ========================================================= */

function resolveProviderType(
  post,
  source,
  text
) {

  /* -------------------------------------------------------
     Postta geçerli providerType varsa koru.
     ------------------------------------------------------- */

  const existing =
    normalizeId(
      post.providerType
    );


  if (
    getProviderType(
      existing
    )
  ) {

    return existing;

  }


  /* -------------------------------------------------------
     Registry otoritesi
     ------------------------------------------------------- */

  const sourceProviderType =
    normalizeId(
      source.providerType
    );


  if (
    getProviderType(
      sourceProviderType
    )
  ) {

    return sourceProviderType;

  }


  /* -------------------------------------------------------
     Kaynak tipinden
     ------------------------------------------------------- */

  const sourceType =
    normalizeText(

      source.sourceType ||

      post.sourceType

    );


  if (
    sourceType.includes(
      "federasyon"
    )
    ||
    sourceType.includes(
      "bakanlik"
    )
    ||
    sourceType.includes(
      "mudurluk"
    )
  ) {

    return "federation";

  }


  /* -------------------------------------------------------
     Metinden tahmin
     ------------------------------------------------------- */

  if (
    containsAny(
      text,
      [
        "spor akademisi",
        "yuzme akademisi",
        "basketbol akademisi",
        "voleybol akademisi"
      ]
    )
  ) {

    return "academy";

  }


  if (
    containsAny(
      text,
      [
        "spor kulubu",
        "basketbol kulubu",
        "yuzme kulubu",
        "voleybol kulubu"
      ]
    )
  ) {

    return "club";

  }


  if (
    containsAny(
      text,
      [
        "spor salonu",
        "fitness salonu",
        "gym"
      ]
    )
  ) {

    return "gym";

  }


  if (
    containsAny(
      text,
      [
        "spor tesisi",
        "yuzme havuzu",
        "tesis"
      ]
    )
  ) {

    return "facility";

  }


  if (
    containsAny(
      text,
      [
        "magaza",
        "spor magazasi",
        "sports store"
      ]
    )
  ) {

    return "store";

  }


  if (
    containsAny(
      text,
      [
        "organizator",
        "organizasyon"
      ]
    )
  ) {

    return "organizer";

  }


  if (
    containsAny(
      text,
      [
        "antrenor",
        "trainer",
        "coach"
      ]
    )
  ) {

    return "coach";

  }


  return "other";

}


/* =========================================================
   SPORT
   ========================================================= */

function resolveSport(
  post,
  source,
  text
) {

  /* -------------------------------------------------------
     Yeni modeldeki geçerli sport
     ------------------------------------------------------- */

  const existing =
    normalizeId(
      post.sport
    );


  if (
    getSport(
      existing
    )
  ) {

    return existing;

  }


  /* -------------------------------------------------------
     Registry
     ------------------------------------------------------- */

  const sourceSport =
    normalizeId(
      source.sport
    );


  if (
    getSport(
      sourceSport
    )
  ) {

    return sourceSport;

  }


  /* -------------------------------------------------------
     Legacy Türkçe sport
     ------------------------------------------------------- */

  const legacySport =
    normalizeText(
      post.sport
    );


  if (
    legacySport.includes(
      "basketbol"
    )
  ) {

    return "basketball";

  }


  if (
    legacySport.includes(
      "yuzme"
    )
  ) {

    return "swimming";

  }


  if (
    legacySport.includes(
      "voleybol"
    )
  ) {

    return "volleyball";

  }


  if (
    legacySport.includes(
      "cimnastik"
    )
    ||
    legacySport.includes(
      "jimnastik"
    )
  ) {

    return "gymnastics";

  }


  /* -------------------------------------------------------
     İçerik metni
     ------------------------------------------------------- */

  if (
    containsAny(
      text,
      [
        "basketbol",
        "basketball",
        "fiba",
        "euroleague",
        "eurocup"
      ]
    )
  ) {

    return "basketball";

  }


  if (
    containsAny(
      text,
      [
        "yuzme",
        "yuzucu",
        "swimming",
        "havuz"
      ]
    )
  ) {

    return "swimming";

  }


  if (
    containsAny(
      text,
      [
        "voleybol",
        "volleyball"
      ]
    )
  ) {

    return "volleyball";

  }


  if (
    containsAny(
      text,
      [
        "cimnastik",
        "jimnastik",
        "gymnastics"
      ]
    )
  ) {

    return "gymnastics";

  }


  return "other";

}


/* =========================================================
   ANA KATEGORİ
   ========================================================= */

function resolveCategory({

  post,
  text,
  source,
  providerType,
  sport

}) {

  /* -------------------------------------------------------
     Post zaten yeni taxonomy kullanıyorsa koru.
     ------------------------------------------------------- */

  const existing =
    normalizeId(
      post.category
    );


  if (
    getCategory(
      existing
    )
  ) {

    return existing;

  }


  /* =======================================================
     1. İŞ İLANLARI
     ======================================================= */

  if (
    isJobContent(
      text
    )
  ) {

    return "jobs";

  }


  /* =======================================================
     2. KAMPANYALAR
     ======================================================= */

  if (
    isCampaignContent(
      text
    )
  ) {

    return "campaigns";

  }


  /* =======================================================
     3. MAĞAZA / ÜRÜN
     ======================================================= */

  if (
    isStoreContent(
      text,
      providerType
    )
  ) {

    return "stores";

  }


  /* =======================================================
     4. KURS

     Federasyon tarafından yayımlanan antrenörlük,
     hakemlik, gelişim, sertifika vb. kursları
     tüketici spor kursu değildir.

     Bunlar etkinlik/eğitim olarak tutulur.
     ======================================================= */

  if (
    isCourseContent(
      text
    )
  ) {

    if (
      providerType ===
      "federation"
      &&
      isProfessionalEducation(
        text
      )
    ) {

      return "events";

    }


    if (
      [
        "academy",
        "club",
        "coach",
        "gym",
        "facility",
        "other"
      ].includes(
        providerType
      )
    ) {

      return "courses";

    }

  }


  /* =======================================================
     5. ETKİNLİK
     ======================================================= */

  if (
    isEventContent(
      text
    )
  ) {

    return "events";

  }


  /* =======================================================
     LEGACY CATEGORY
     ======================================================= */

  const legacyCategory =
    normalizeId(
      post.category ||
      post.contentType
    );


  if (
    [
      "coach",
      "athlete",
      "event",
      "education",
      "announcement",
      "competition"
    ].includes(
      legacyCategory
    )
  ) {

    return "events";

  }


  /*
    Şu an TYF / TBF haberleri için en güvenli
    varsayılan kategori etkinliklerdir.

    İleride general/news alanını ayrıca
    değerlendirebiliriz.
  */

  return "events";

}


/* =========================================================
   ALT KATEGORİ
   ========================================================= */

function resolveSubCategory({

  post,
  text,
  category,
  providerType,
  sport

}) {

  /* -------------------------------------------------------
     Mevcut geçerli alt kategori
     ------------------------------------------------------- */

  const existing =
    normalizeId(
      post.subCategory
    );


  if (
    getSubCategory(
      category,
      existing
    )
  ) {

    return existing;

  }


  /* =======================================================
     KURSLAR
     ======================================================= */

  if (
    category ===
    "courses"
  ) {

    if (
      [
        "basketball",
        "swimming",
        "volleyball",
        "gymnastics"
      ].includes(
        sport
      )
    ) {

      return sport;

    }


    return "other";

  }


  /* =======================================================
     ETKİNLİKLER
     ======================================================= */

  if (
    category ===
    "events"
  ) {

    if (
      containsAny(
        text,
        [
          "kamp",
          "spor kampi",
          "hazirlik kampi",
          "saglikli yasam",
          "wellness"
        ]
      )
    ) {

      return "camp";

    }


    if (
      containsAny(
        text,
        [
          "festival",
          "spor festivali",
          "tanitim",
          "spor senligi",
          "senlik"
        ]
      )
    ) {

      return "festival";

    }


    if (
      containsAny(
        text,
        [
          "egitim",
          "seminer",
          "kurs",
          "sertifika",
          "antrenor gelisim",
          "antrenorluk",
          "hakem kursu",
          "vize"
        ]
      )
    ) {

      return "education";

    }


    if (
      containsAny(
        text,
        [
          "turnuva",
          "yarisma",
          "sampiyona",
          "musabaka",
          "mac",
          "lig",
          "kupa",
          "final",
          "fiba",
          "euroleague",
          "eurocup"
        ]
      )
    ) {

      return "competition";

    }


    /*
      Federasyon içeriklerinde bilinmeyen genel duyuruyu
      yanlışlıkla tüketici kursuna çevirmemek için
      güvenli varsayılan.
    */

    return "competition";

  }


  /* =======================================================
     KAMPANYALAR
     ======================================================= */

  if (
    category ===
    "campaigns"
  ) {

    if (
      containsAny(
        text,
        [
          "kurs indirimi",
          "kurs kampanyasi",
          "egitim kampanyasi",
          "ilk ders",
          "deneme dersi"
        ]
      )
    ) {

      return "course_campaign";

    }


    if (
      containsAny(
        text,
        [
          "uyelik",
          "abonelik",
          "spor salonu uyeligi",
          "yillik uyelik",
          "aylik uyelik"
        ]
      )
    ) {

      return "membership_campaign";

    }


    return "store_campaign";

  }


  /* =======================================================
     İŞ
     ======================================================= */

  if (
    category ===
    "jobs"
  ) {

    if (
      isJobSeekerContent(
        text
      )
    ) {

      return "job_seeker";

    }


    return "employer";

  }


  /* =======================================================
     MAĞAZALAR
     ======================================================= */

  if (
    category ===
    "stores"
  ) {

    if (
      containsAny(
        text,
        [
          "protein",
          "takviye",
          "supplement",
          "beslenme",
          "vitamin",
          "mineral"
        ]
      )
    ) {

      return "nutrition";

    }


    if (
      containsAny(
        text,
        [
          "ayakkabi",
          "forma",
          "sort",
          "tayt",
          "tisort",
          "giyim",
          "esofman",
          "ceket"
        ]
      )
    ) {

      return "clothing";

    }


    if (
      containsAny(
        text,
        [
          "top",
          "raket",
          "mayo",
          "gozluk",
          "palet",
          "mat",
          "agirlik",
          "ekipman",
          "malzeme"
        ]
      )
    ) {

      return "equipment";

    }


    return "accessories";

  }


  return "";

}


/* =========================================================
   CONTENT TYPE
   ========================================================= */

function resolveContentType({

  post,
  text,
  category,
  subCategory

}) {

  const existing =
    normalizeId(
      post.contentType
    );


  if (
    getContentType(
      existing
    )
  ) {

    return existing;

  }


  if (
    category ===
    "campaigns"
  ) {

    return "campaign";

  }


  if (
    category ===
    "jobs"
  ) {

    return "job";

  }


  if (
    category ===
    "stores"
  ) {

    return "product";

  }


  if (
    category ===
    "events"
  ) {

    if (
      subCategory ===
      "education"
    ) {

      return "education";

    }


    if (
      subCategory ===
      "competition"
    ) {

      return "competition";

    }

  }


  if (
    containsAny(
      text,
      [
        "antrenor"
      ]
    )
  ) {

    return "coach";

  }


  if (
    containsAny(
      text,
      [
        "sporcu",
        "oyuncu",
        "milli takim"
      ]
    )
  ) {

    return "athlete";

  }


  return "general";

}


/* =========================================================
   İŞ İLANI MI?
   ========================================================= */

function isJobContent(
  text
) {

  return containsAny(
    text,
    [

      "is ilani",

      "personel araniyor",

      "antrenor araniyor",

      "egitmen araniyor",

      "calisma arkadasi",

      "takim arkadasi ariyoruz",

      "ise alim",

      "basvuru yap",

      "cv gonder",

      "ozgecmis gonder",

      "pozisyon",

      "tam zamanli",

      "yari zamanli",

      "part time",

      "full time"

    ]
  );

}


/* =========================================================
   İŞ ARAYAN MI?
   ========================================================= */

function isJobSeekerContent(
  text
) {

  return containsAny(
    text,
    [

      "is ariyorum",

      "is arayan",

      "antrenor olarak is ariyorum",

      "egitmen olarak is ariyorum",

      "calisabilecegim",

      "is talebi"

    ]
  );

}


/* =========================================================
   KAMPANYA MI?
   ========================================================= */

function isCampaignContent(
  text
) {

  return containsAny(
    text,
    [

      "kampanya",

      "indirim",

      "firsat",

      "ozel fiyat",

      "erken kayit indirimi",

      "uyelik indirimi",

      "ilk ay",

      "ilk ders ucretsiz",

      "deneme dersi ucretsiz",

      "kupon",

      "promosyon",

      "yuzde indirim"

    ]
  );

}


/* =========================================================
   MAĞAZA / ÜRÜN MÜ?
   ========================================================= */

function isStoreContent(
  text,
  providerType
) {

  if (
    providerType ===
    "store"
  ) {

    return true;

  }


  return containsAny(
    text,
    [

      "sepete ekle",

      "satin al",

      "urun",

      "stokta",

      "stok",

      "kargo",

      "beden",

      "numara",

      "magaza fiyati",

      "urun fiyati"

    ]
  );

}


/* =========================================================
   KURS MU?
   ========================================================= */

function isCourseContent(
  text
) {

  return containsAny(
    text,
    [

      "spor kursu",

      "yuzme kursu",

      "basketbol kursu",

      "voleybol kursu",

      "cimnastik kursu",

      "jimnastik kursu",

      "ozel ders",

      "grup dersi",

      "spor okulu",

      "yaz okulu",

      "kis okulu",

      "kayitlar basladi",

      "kurs kaydi",

      "ders kaydi",

      "kursumuz"

    ]
  );

}


/* =========================================================
   PROFESYONEL EĞİTİM Mİ?
   ========================================================= */

function isProfessionalEducation(
  text
) {

  return containsAny(
    text,
    [

      "antrenor",

      "antrenorluk",

      "hakem",

      "kademe",

      "sertifika",

      "vize",

      "seminer",

      "gelisim egitimi",

      "hizmet ici",

      "e-devlet basvuru"

    ]
  );

}


/* =========================================================
   ETKİNLİK Mİ?
   ========================================================= */

function isEventContent(
  text
) {

  return containsAny(
    text,
    [

      "turnuva",

      "yarisma",

      "sampiyona",

      "musabaka",

      "mac",

      "lig",

      "kupa",

      "final",

      "festival",

      "senlik",

      "kamp",

      "seminer",

      "egitim",

      "organizasyon",

      "etkinlik",

      "fiba",

      "euroleague",

      "eurocup"

    ]
  );

}


/* =========================================================
   ARAMA METNİ
   ========================================================= */

function buildSearchText(
  post
) {

  const values =
    [

      post?.editorial?.headline,

      post?.editorial?.originalTitle,

      post?.editorial?.influencerText,

      post?.editorial?.originalText,

      post?.title,

      post?.summary,

      post?.originalTitle,

      post?.originalText,

      post?.source?.name,

      post?.source?.shortName,

      post?.sourceName,

      post?.source,

      post?.sport,

      post?.category,

      post?.subCategory,

      post?.contentType,

      post?.providerType

    ];


  if (
    Array.isArray(
      post?.tags
    )
  ) {

    values.push(
      ...post.tags
    );

  }


  if (
    isPlainObject(
      post?.details
    )
  ) {

    values.push(
      ...flattenObjectValues(
        post.details
      )
    );

  }


  return normalizeText(
    values
      .filter(
        Boolean
      )
      .join(
        " "
      )
  );

}


/* =========================================================
   EKSİK ALANLAR

   Burada "eksik" demek zorunlu hata değildir.

   Sistem daha sonra tarayıcılara:
   "Bu kategoride özellikle bunları ara"
   diyebilir.
   ========================================================= */

function findMissingFields(
  post,
  requiredFields
) {

  if (
    !Array.isArray(
      requiredFields
    )
  ) {

    return [];

  }


  const missing =
    [];


  for (
    const field
    of requiredFields
  ) {

    if (
      !hasFieldValue(
        post,
        field
      )
    ) {

      missing.push(
        field
      );

    }

  }


  return missing;

}


/* =========================================================
   FIELD VAR MI?
   ========================================================= */

function hasFieldValue(
  post,
  field
) {

  /* -------------------------------------------------------
     Konum alanları
     ------------------------------------------------------- */

  if (
    [
      "city",
      "district",
      "venue",
      "address"
    ].includes(
      field
    )
  ) {

    return hasUsefulValue(
      post?.location?.[
        field
      ]
    );

  }


  /* -------------------------------------------------------
     Details
     ------------------------------------------------------- */

  return hasUsefulValue(
    post?.details?.[
      field
    ]
  );

}


/* =========================================================
   DEĞER VAR MI?
   ========================================================= */

function hasUsefulValue(
  value
) {

  if (
    value ===
    null ||
    value ===
    undefined
  ) {

    return false;

  }


  if (
    Array.isArray(
      value
    )
  ) {

    return value.length >
    0;

  }


  if (
    typeof value ===
    "string"
  ) {

    return Boolean(
      value.trim()
    );

  }


  return true;

}


/* =========================================================
   DISCOVERY CONFIDENCE
   ========================================================= */

function calculateDiscoveryConfidence({

  sport,
  category,
  subCategory,
  providerType,
  source,
  text

}) {

  let score =
    20;


  if (
    sport &&
    sport !==
    "other"
  ) {

    score +=
      20;

  }


  if (
    getCategory(
      category
    )
  ) {

    score +=
      20;

  }


  if (
    getSubCategory(
      category,
      subCategory
    )
  ) {

    score +=
      15;

  }


  if (
    providerType &&
    providerType !==
    "other"
  ) {

    score +=
      10;

  }


  if (
    source?.verified ===
    true
  ) {

    score +=
      10;

  }


  if (
    text.length >
    80
  ) {

    score +=
      5;

  }


  return Math.max(
    0,
    Math.min(
      score,
      100
    )
  );

}


/* =========================================================
   SIGNALS
   ========================================================= */

function collectSignals({

  text,
  category,
  subCategory,
  providerType,
  sport

}) {

  const signals =
    [];


  signals.push(
    `sport:${sport}`
  );


  signals.push(
    `category:${category}`
  );


  signals.push(
    `subcategory:${subCategory}`
  );


  signals.push(
    `provider:${providerType}`
  );


  if (
    containsAny(
      text,
      [
        "basvuru",
        "kayit"
      ]
    )
  ) {

    signals.push(
      "action:registration"
    );

  }


  if (
    containsAny(
      text,
      [
        "son basvuru",
        "son gun",
        "sona erecek"
      ]
    )
  ) {

    signals.push(
      "urgency:deadline"
    );

  }


  if (
    containsAny(
      text,
      [
        "ucretsiz"
      ]
    )
  ) {

    signals.push(
      "price:free"
    );

  }


  if (
    containsAny(
      text,
      [
        "indirim",
        "kampanya"
      ]
    )
  ) {

    signals.push(
      "commercial:campaign"
    );

  }


  return [
    ...new Set(
      signals
    )
  ];

}


/* =========================================================
   FALLBACK
   ========================================================= */

function createFallbackDiscovery() {

  return {

    version:
      DISCOVERY_VERSION,

    sport:
      "other",

    category:
      "events",

    subCategory:
      "competition",

    providerType:
      "other",

    contentType:
      "general",

    requiredFields:
      getCategoryFilterFields(
        "events"
      ),

    missingFields:
      getCategoryFilterFields(
        "events"
      ),

    confidenceScore:
      0,

    signals:
      [],

    discoveredAt:
      new Date()
        .toISOString()

  };

}


/* =========================================================
   OBJEDEN METİN DEĞERLERİ
   ========================================================= */

function flattenObjectValues(
  value
) {

  const output =
    [];


  if (
    !isPlainObject(
      value
    )
  ) {

    return output;

  }


  for (
    const item
    of Object.values(
      value
    )
  ) {

    if (
      Array.isArray(
        item
      )
    ) {

      output.push(
        ...item
      );

      continue;

    }


    if (
      isPlainObject(
        item
      )
    ) {

      output.push(
        ...flattenObjectValues(
          item
        )
      );

      continue;

    }


    if (
      item !==
      null &&
      item !==
      undefined
    ) {

      output.push(
        item
      );

    }

  }


  return output;

}


/* =========================================================
   KEYWORD
   ========================================================= */

function containsAny(
  text,
  values
) {

  return values.some(
    value =>
      text.includes(
        normalizeText(
          value
        )
      )
  );

}


/* =========================================================
   NORMALIZE ID
   ========================================================= */

function normalizeId(
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
      /[^a-z0-9_-]+/g,
      "_"
    )

    .replace(
      /^_+|_+$/g,
      ""
    );

}


/* =========================================================
   NORMALIZE TEXT
   ========================================================= */

function normalizeText(
  value
) {

  return String(
    value ||
    ""
  )

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
      /[^a-z0-9%]+/g,
      " "
    )

    .replace(
      /\s+/g,
      " "
    )

    .trim();

}


/* =========================================================
   CLEAN STRING
   ========================================================= */

function cleanString(
  value
) {

  return String(
    value ||
    ""
  )
    .replace(
      /\s+/g,
      " "
    )
    .trim();

}


/* =========================================================
   PLAIN OBJECT
   ========================================================= */

function isPlainObject(
  value
) {

  return Boolean(

    value &&

    typeof value ===
    "object" &&

    !Array.isArray(
      value
    )

  );

      }
