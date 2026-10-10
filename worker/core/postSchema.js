/* =========================================================
   SporNRD
   worker/core/postSchema.js

   Ortak SporNRD Post Veri Modeli

   Sürüm: 6.1.0

   Amaç:
   - Bütün kaynakları tek post modelinde birleştirmek
   - Eksik alanları güvenli şekilde tamamlamak
   - Kategoriye göre details alanını standartlaştırmak
   - Medya / aksiyon / kaynak / konum yapısını ortaklaştırmak
   ========================================================= */


import {

  DEFAULT_CURRENCY,

  getCategory,

  getSubCategory,

  getProviderType,

  getContentType,

  getPostStatus,

  getActionType,

  getSport

} from "./taxonomy.js";


/* =========================================================
   POST SCHEMA VERSION
   ========================================================= */

export const POST_SCHEMA_VERSION =
  "1.0";


/* =========================================================
   BOŞ POST
   ========================================================= */

export function createEmptyPost() {

  return {

    schemaVersion:
      POST_SCHEMA_VERSION,


    /* -----------------------------------------------------
       KİMLİK
       ----------------------------------------------------- */

    id:
      "",

    externalId:
      "",


    /* -----------------------------------------------------
       SINIFLANDIRMA
       ----------------------------------------------------- */

    sport:
      "",

    category:
      "",

    subCategory:
      "",

    contentType:
      "general",

    providerType:
      "other",


    /* -----------------------------------------------------
       KAYNAK
       ----------------------------------------------------- */

    source: {

      id:
        "",

      name:
        "",

      shortName:
        "",

      sourceType:
        "",

      website:
        "",

      url:
        "",

      publishedAt:
        "",

      verified:
        false

    },


    /* -----------------------------------------------------
       SPORNRD EDİTÖR
       ----------------------------------------------------- */

    editorial: {

      enabled:
        true,

      label:
        "SporNRD Özeti",

      version:
        "",

      headline:
        "",

      influencerText:
        "",

      originalTitle:
        "",

      originalText:
        "",

      style:
        "",

      angle:
        ""

    },


    /* -----------------------------------------------------
       MEDYA
       ----------------------------------------------------- */

    media:
      [],


    /* -----------------------------------------------------
       KONUM
       ----------------------------------------------------- */

    location: {

      country:
        "Türkiye",

      city:
        "",

      district:
        "",

      neighborhood:
        "",

      venue:
        "",

      address:
        "",

      latitude:
        null,

      longitude:
        null

    },


    /* -----------------------------------------------------
       KATEGORİYE ÖZEL DETAYLAR
       ----------------------------------------------------- */

    details:
      {},


    /* -----------------------------------------------------
       İŞLEM BUTONLARI
       ----------------------------------------------------- */

    actions:
      [],


    /* -----------------------------------------------------
       SOSYAL ETKİLEŞİMLER
       ----------------------------------------------------- */

    interactions: {

      wow:
        0,

      save:
        0,

      share:
        0,

      trash:
        0

    },


    /* -----------------------------------------------------
       GÜVEN / DOĞRULAMA
       ----------------------------------------------------- */

    trust: {

      verified:
        false,

      confidenceScore:
        0,

      evidenceCount:
        0,

      lastCheckedAt:
        "",

      notes:
        []

    },


    /* -----------------------------------------------------
       YAŞAM DÖNGÜSÜ
       ----------------------------------------------------- */

    lifecycle: {

      status:
        "active",

      firstSeenAt:
        "",

      lastSeenAt:
        "",

      publishedAt:
        "",

      updatedAt:
        "",

      startsAt:
        "",

      endsAt:
        "",

      expiresAt:
        ""

    },


    /* -----------------------------------------------------
       PUANLAR
       ----------------------------------------------------- */

    scoring: {

      relevance:
        0,

      quality:
        0,

      freshness:
        0,

      learning:
        0,

      final:
        0

    },


    /* -----------------------------------------------------
       ARAMA / ETİKET
       ----------------------------------------------------- */

    tags:
      [],


    /* -----------------------------------------------------
       FRONTEND KOLAYLIĞI
       ----------------------------------------------------- */

    display: {

      emoji:
        "🏆",

      badge:
        "",

      featured:
        false

    }

  };

}


/* =========================================================
   POST OLUŞTUR

   Partial veri alır ve güvenli standart post döndürür.
   ========================================================= */

export function createPost(
  input = {}
) {

  const post =
    createEmptyPost();


  /* =======================================================
     KİMLİK
     ======================================================= */

  post.id =
    cleanString(
      input.id
    );


  post.externalId =
    cleanString(
      input.externalId ||
      input.id
    );


  /* =======================================================
     SINIFLANDIRMA
     ======================================================= */

  post.sport =
    normalizeSport(
      input.sport
    );


  post.category =
    normalizeCategory(
      input.category
    );


  post.subCategory =
    normalizeSubCategory(
      post.category,
      input.subCategory
    );


  post.contentType =
    normalizeContentType(
      input.contentType
    );


  post.providerType =
    normalizeProviderType(
      input.providerType
    );


  /* =======================================================
     KAYNAK
     ======================================================= */

  post.source =
    normalizeSource(
      input.source
    );


  /* =======================================================
     EDİTÖR
     ======================================================= */

  post.editorial =
    normalizeEditorial(
      input.editorial
    );


  /* =======================================================
     MEDYA
     ======================================================= */

  post.media =
    normalizeMedia(
      input.media
    );


  /* =======================================================
     KONUM
     ======================================================= */

  post.location =
    normalizeLocation(
      input.location
    );


  /* =======================================================
     DETAYLAR
     ======================================================= */

  post.details =
    normalizeDetails(
      post.category,
      input.details
    );


  /* =======================================================
     ACTIONS
     ======================================================= */

  post.actions =
    normalizeActions(
      input.actions
    );


  /* =======================================================
     INTERACTIONS
     ======================================================= */

  post.interactions =
    normalizeInteractions(
      input.interactions
    );


  /* =======================================================
     TRUST
     ======================================================= */

  post.trust =
    normalizeTrust(
      input.trust
    );


  /* =======================================================
     LIFECYCLE
     ======================================================= */

  post.lifecycle =
    normalizeLifecycle(
      input.lifecycle
    );


  /* =======================================================
     SCORING
     ======================================================= */

  post.scoring =
    normalizeScoring(
      input.scoring
    );


  /* =======================================================
     TAGS
     ======================================================= */

  post.tags =
    normalizeTags(
      input.tags
    );


  /* =======================================================
     DISPLAY
     ======================================================= */

  post.display =
    normalizeDisplay(
      input.display,
      post.sport
    );


  /* =======================================================
     OTOMATİK TAMAMLAMA
     ======================================================= */

  applyAutomaticDefaults(
    post
  );


  return post;

}


/* =========================================================
   POST GEÇERLİ Mİ?
   ========================================================= */

export function validatePost(
  post
) {

  const errors =
    [];


  if (
    !post ||
    typeof post !==
    "object"
  ) {

    return {

      valid:
        false,

      errors:
        [
          "Post nesnesi geçersiz."
        ]

    };

  }


  if (
    !cleanString(
      post.id
    )
  ) {

    errors.push(
      "Post id gerekli."
    );

  }


  if (
    !cleanString(
      post.editorial?.headline
    )
  ) {

    errors.push(
      "Post başlığı gerekli."
    );

  }


  if (
    !cleanString(
      post.source?.name
    )
  ) {

    errors.push(
      "Kaynak adı gerekli."
    );

  }


  if (
    !post.sport
  ) {

    errors.push(
      "Branş gerekli."
    );

  }


  return {

    valid:
      errors.length ===
      0,

    errors:
      errors

  };

}


/* =========================================================
   LEGACY POST → YENİ POST

   TYF / TBF mevcut veri modelini
   yeni ortak modele taşımak için kullanılacak.
   ========================================================= */

export function fromLegacyPost(
  item = {}
) {

  const sourceId =
    cleanString(
      item.sourceId
    );


  const sourceShortName =
    cleanString(
      item.sourceShortName
    );


  const media =
    [];


  if (
    item.image
  ) {

    media.push({

      type:
        "image",

      url:
        item.image

    });

  }


  const actions =
    [

      {

        type:
          "detail",

        label:
          item.actionLabel ||
          "Detay"

      }

    ];


  if (
    item.url
  ) {

    actions.push({

      type:
        "source",

      label:
        "Resmî Kaynak",

      url:
        item.url

    });

  }


  return createPost({

    id:
      item.id,

    externalId:
      item.externalId,


    sport:
      mapLegacySport(
        item.sport
      ),


    category:
      mapLegacyCategory(
        item
      ),


    subCategory:
      mapLegacySubCategory(
        item
      ),


    contentType:
      mapLegacyContentType(
        item.category
      ),


    providerType:
      mapLegacyProviderType(
        item
      ),


    source: {

      id:
        sourceId,

      name:
        item.source,

      shortName:
        sourceShortName,

      sourceType:
        item.sourceType,

      website:
        "",

      url:
        item.url,

      publishedAt:
        item.date,

      verified:
        item.verified ===
        true

    },


    editorial: {

      enabled:
        item.editorial !==
        false,

      label:
        item.editorialLabel ||
        "SporNRD Özeti",

      version:
        item.editorialVersion ||
        "",

      headline:
        item.title ||
        item.originalTitle ||
        "",

      influencerText:
        item.summary ||
        "",

      originalTitle:
        item.originalTitle ||
        "",

      originalText:
        item.originalText ||
        "",

      style:
        item.headlineStyle ||
        "",

      angle:
        ""

    },


    media:
      media,


    location: {

      country:
        "Türkiye",

      city:
        item.location &&
        item.location !==
        "Türkiye"

          ? item.location

          : "",

      district:
        "",

      neighborhood:
        "",

      venue:
        "",

      address:
        ""

    },


    details:
      buildLegacyDetails(
        item
      ),


    actions:
      actions,


    trust: {

      verified:
        item.verified ===
        true,

      confidenceScore:
        item.verified ===
        true
          ? 90
          : 60,

      evidenceCount:
        item.url
          ? 1
          : 0,

      lastCheckedAt:
        new Date()
          .toISOString()

    },


    lifecycle: {

      status:
        "active",

      publishedAt:
        item.date ||
        "",

      lastSeenAt:
        new Date()
          .toISOString()

    },


    scoring: {

      relevance:
        numberValue(
          item.relevanceScore
        ),

      quality:
        numberValue(
          item.qualityScore
        ),

      final:
        numberValue(
          item.finalScore
        )

    },


    tags:
      item.tags || [],


    display: {

      emoji:
        item.emoji ||
        ""

    }

  });

}


/* =========================================================
   SOURCE NORMALİZE
   ========================================================= */

function normalizeSource(
  value
) {

  const input =
    plainObject(
      value
    )
      ? value
      : {};


  return {

    id:
      cleanString(
        input.id
      ),

    name:
      cleanString(
        input.name
      ),

    shortName:
      cleanString(
        input.shortName
      ),

    sourceType:
      cleanString(
        input.sourceType
      ),

    website:
      cleanString(
        input.website
      ),

    url:
      cleanString(
        input.url
      ),

    publishedAt:
      cleanString(
        input.publishedAt
      ),

    verified:
      Boolean(
        input.verified
      )

  };

}


/* =========================================================
   EDITORIAL NORMALİZE
   ========================================================= */

function normalizeEditorial(
  value
) {

  const input =
    plainObject(
      value
    )
      ? value
      : {};


  return {

    enabled:
      input.enabled !==
      false,

    label:
      cleanString(
        input.label ||
        "SporNRD Özeti"
      ),

    version:
      cleanString(
        input.version
      ),

    headline:
      cleanString(
        input.headline
      ),

    influencerText:
      cleanString(
        input.influencerText
      ),

    originalTitle:
      cleanString(
        input.originalTitle
      ),

    originalText:
      cleanString(
        input.originalText
      ),

    style:
      cleanString(
        input.style
      ),

    angle:
      cleanString(
        input.angle
      )

  };

}


/* =========================================================
   MEDIA NORMALİZE
   ========================================================= */

function normalizeMedia(
  value
) {

  if (
    !Array.isArray(
      value
    )
  ) {

    return [];

  }


  return value

    .map(
      function (
        media,
        index
      ) {

        if (
          !plainObject(
            media
          )
        ) {

          return null;

        }


        const type =
          cleanString(
            media.type
          )
            .toLowerCase();


        if (
          ![
            "image",
            "video",
            "audio"
          ].includes(
            type
          )
        ) {

          return null;

        }


        const url =
          cleanString(
            media.url
          );


        if (
          !url
        ) {

          return null;

        }


        return {

          id:
            cleanString(
              media.id ||
              `media-${index + 1}`
            ),

          type:
            type,

          url:
            url,

          thumbnail:
            cleanString(
              media.thumbnail
            ),

          alt:
            cleanString(
              media.alt
            ),

          sourceUrl:
            cleanString(
              media.sourceUrl
            ),

          order:
            numberValue(
              media.order,
              index
            ),

          licensed:
            Boolean(
              media.licensed
            )

        };

      }
    )

    .filter(
      Boolean
    )

    .sort(
      function (
        a,
        b
      ) {

        return (
          a.order -
          b.order
        );

      }
    );

}


/* =========================================================
   LOCATION NORMALİZE
   ========================================================= */

function normalizeLocation(
  value
) {

  const input =
    plainObject(
      value
    )
      ? value
      : {};


  return {

    country:
      cleanString(
        input.country ||
        "Türkiye"
      ),

    city:
      cleanString(
        input.city
      ),

    district:
      cleanString(
        input.district
      ),

    neighborhood:
      cleanString(
        input.neighborhood
      ),

    venue:
      cleanString(
        input.venue
      ),

    address:
      cleanString(
        input.address
      ),

    latitude:
      nullableNumber(
        input.latitude
      ),

    longitude:
      nullableNumber(
        input.longitude
      )

  };

}


/* =========================================================
   DETAILS NORMALİZE
   ========================================================= */

function normalizeDetails(
  category,
  value
) {

  const input =
    plainObject(
      value
    )
      ? value
      : {};


  switch (
    category
  ) {

    case "courses":

      return normalizeCourseDetails(
        input
      );


    case "events":

      return normalizeEventDetails(
        input
      );


    case "campaigns":

      return normalizeCampaignDetails(
        input
      );


    case "jobs":

      return normalizeJobDetails(
        input
      );


    case "stores":

      return normalizeStoreDetails(
        input
      );


    default:

      return {
        ...input
      };

  }

}


/* =========================================================
   COURSE DETAILS
   ========================================================= */

function normalizeCourseDetails(
  input
) {

  return {

    days:
      stringArray(
        input.days
      ),

    startTime:
      cleanString(
        input.startTime
      ),

    endTime:
      cleanString(
        input.endTime
      ),

    price:
      nullableNumber(
        input.price
      ),

    currency:
      cleanString(
        input.currency ||
        DEFAULT_CURRENCY
      ),

    priceUnit:
      cleanString(
        input.priceUnit
      ),

    ageMin:
      nullableNumber(
        input.ageMin
      ),

    ageMax:
      nullableNumber(
        input.ageMax
      ),

    ageGroup:
      cleanString(
        input.ageGroup
      ),

    level:
      cleanString(
        input.level
      ),

    lessonType:
      cleanString(
        input.lessonType
      ),

    capacity:
      nullableNumber(
        input.capacity
      ),

    startDate:
      cleanString(
        input.startDate
      ),

    registrationDeadline:
      cleanString(
        input.registrationDeadline
      ),

    trialLesson:
      nullableBoolean(
        input.trialLesson
      )

  };

}


/* =========================================================
   EVENT DETAILS
   ========================================================= */

function normalizeEventDetails(
  input
) {

  return {

    startDate:
      cleanString(
        input.startDate
      ),

    endDate:
      cleanString(
        input.endDate
      ),

    startTime:
      cleanString(
        input.startTime
      ),

    endTime:
      cleanString(
        input.endTime
      ),

    price:
      nullableNumber(
        input.price
      ),

    currency:
      cleanString(
        input.currency ||
        DEFAULT_CURRENCY
      ),

    ageMin:
      nullableNumber(
        input.ageMin
      ),

    ageMax:
      nullableNumber(
        input.ageMax
      ),

    registrationDeadline:
      cleanString(
        input.registrationDeadline
      ),

    capacity:
      nullableNumber(
        input.capacity
      ),

    participationRequirements:
      cleanString(
        input.participationRequirements
      ),

    spectatorAllowed:
      nullableBoolean(
        input.spectatorAllowed
      ),

    accommodation:
      cleanString(
        input.accommodation
      ),

    meals:
      cleanString(
        input.meals
      )

  };

}


/* =========================================================
   CAMPAIGN DETAILS
   ========================================================= */

function normalizeCampaignDetails(
  input
) {

  return {

    oldPrice:
      nullableNumber(
        input.oldPrice
      ),

    newPrice:
      nullableNumber(
        input.newPrice
      ),

    currency:
      cleanString(
        input.currency ||
        DEFAULT_CURRENCY
      ),

    discountRate:
      nullableNumber(
        input.discountRate
      ),

    startDate:
      cleanString(
        input.startDate
      ),

    endDate:
      cleanString(
        input.endDate
      ),

    eligibility:
      cleanString(
        input.eligibility
      ),

    conditions:
      cleanString(
        input.conditions
      ),

    couponCode:
      cleanString(
        input.couponCode
      ),

    channel:
      cleanString(
        input.channel
      )

  };

}


/* =========================================================
   JOB DETAILS
   ========================================================= */

function normalizeJobDetails(
  input
) {

  return {

    position:
      cleanString(
        input.position
      ),

    employmentType:
      cleanString(
        input.employmentType
      ),

    workMode:
      cleanString(
        input.workMode
      ),

    days:
      stringArray(
        input.days
      ),

    startTime:
      cleanString(
        input.startTime
      ),

    endTime:
      cleanString(
        input.endTime
      ),

    experience:
      cleanString(
        input.experience
      ),

    certificateLevel:
      cleanString(
        input.certificateLevel
      ),

    salaryMin:
      nullableNumber(
        input.salaryMin
      ),

    salaryMax:
      nullableNumber(
        input.salaryMax
      ),

    currency:
      cleanString(
        input.currency ||
        DEFAULT_CURRENCY
      ),

    applicationDeadline:
      cleanString(
        input.applicationDeadline
      )

  };

}


/* =========================================================
   STORE DETAILS
   ========================================================= */

function normalizeStoreDetails(
  input
) {

  return {

    brand:
      cleanString(
        input.brand
      ),

    productName:
      cleanString(
        input.productName
      ),

    price:
      nullableNumber(
        input.price
      ),

    salePrice:
      nullableNumber(
        input.salePrice
      ),

    currency:
      cleanString(
        input.currency ||
        DEFAULT_CURRENCY
      ),

    discountRate:
      nullableNumber(
        input.discountRate
      ),

    stockStatus:
      cleanString(
        input.stockStatus
      ),

    variants:
      stringArray(
        input.variants
      ),

    channel:
      cleanString(
        input.channel
      ),

    shipping:
      cleanString(
        input.shipping
      )

  };

}


/* =========================================================
   ACTIONS NORMALİZE
   ========================================================= */

function normalizeActions(
  value
) {

  if (
    !Array.isArray(
      value
    )
  ) {

    return [];

  }


  const output =
    [];


  const used =
    new Set();


  for (
    const action
    of value
  ) {

    if (
      !plainObject(
        action
      )
    ) {

      continue;

    }


    const type =
      cleanString(
        action.type
      )
        .toLowerCase();


    const definition =
      getActionType(
        type
      );


    if (
      !definition ||
      used.has(
        type
      )
    ) {

      continue;

    }


    used.add(
      type
    );


    output.push({

      type:
        type,

      label:
        cleanString(
          action.label ||
          definition.label
        ),

      url:
        cleanString(
          action.url
        ),

      enabled:
        action.enabled !==
        false

    });

  }


  return output;

}


/* =========================================================
   INTERACTIONS NORMALİZE
   ========================================================= */

function normalizeInteractions(
  value
) {

  const input =
    plainObject(
      value
    )
      ? value
      : {};


  return {

    wow:
      nonNegativeNumber(
        input.wow
      ),

    save:
      nonNegativeNumber(
        input.save
      ),

    share:
      nonNegativeNumber(
        input.share
      ),

    trash:
      nonNegativeNumber(
        input.trash
      )

  };

}


/* =========================================================
   TRUST NORMALİZE
   ========================================================= */

function normalizeTrust(
  value
) {

  const input =
    plainObject(
      value
    )
      ? value
      : {};


  return {

    verified:
      Boolean(
        input.verified
      ),

    confidenceScore:
      clamp(
        numberValue(
          input.confidenceScore
        ),
        0,
        100
      ),

    evidenceCount:
      nonNegativeNumber(
        input.evidenceCount
      ),

    lastCheckedAt:
      cleanString(
        input.lastCheckedAt
      ),

    notes:
      stringArray(
        input.notes
      )

  };

}


/* =========================================================
   LIFECYCLE NORMALİZE
   ========================================================= */

function normalizeLifecycle(
  value
) {

  const input =
    plainObject(
      value
    )
      ? value
      : {};


  const requestedStatus =
    cleanString(
      input.status ||
      "active"
    )
      .toLowerCase();


  const status =
    getPostStatus(
      requestedStatus
    )
      ? requestedStatus
      : "active";


  return {

    status:
      status,

    firstSeenAt:
      cleanString(
        input.firstSeenAt
      ),

    lastSeenAt:
      cleanString(
        input.lastSeenAt
      ),

    publishedAt:
      cleanString(
        input.publishedAt
      ),

    updatedAt:
      cleanString(
        input.updatedAt
      ),

    startsAt:
      cleanString(
        input.startsAt
      ),

    endsAt:
      cleanString(
        input.endsAt
      ),

    expiresAt:
      cleanString(
        input.expiresAt
      )

  };

}


/* =========================================================
   SCORING NORMALİZE
   ========================================================= */

function normalizeScoring(
  value
) {

  const input =
    plainObject(
      value
    )
      ? value
      : {};


  return {

    relevance:
      numberValue(
        input.relevance
      ),

    quality:
      numberValue(
        input.quality
      ),

    freshness:
      numberValue(
        input.freshness
      ),

    learning:
      numberValue(
        input.learning
      ),

    final:
      numberValue(
        input.final
      )

  };

}


/* =========================================================
   DISPLAY NORMALİZE
   ========================================================= */

function normalizeDisplay(
  value,
  sport
) {

  const input =
    plainObject(
      value
    )
      ? value
      : {};


  return {

    emoji:
      cleanString(
        input.emoji ||
        sportEmoji(
          sport
        )
      ),

    badge:
      cleanString(
        input.badge
      ),

    featured:
      Boolean(
        input.featured
      )

  };

}


/* =========================================================
   OTOMATİK DEFAULTLAR
   ========================================================= */

function applyAutomaticDefaults(
  post
) {

  const now =
    new Date()
      .toISOString();


  if (
    !post.lifecycle.firstSeenAt
  ) {

    post.lifecycle.firstSeenAt =
      now;

  }


  if (
    !post.lifecycle.lastSeenAt
  ) {

    post.lifecycle.lastSeenAt =
      now;

  }


  if (
    !post.trust.lastCheckedAt
  ) {

    post.trust.lastCheckedAt =
      now;

  }


  if (
    post.source.verified
  ) {

    post.trust.verified =
      true;

  }


  if (
    post.trust.verified &&
    post.trust.confidenceScore <
    80
  ) {

    post.trust.confidenceScore =
      80;

  }


  if (
    !post.actions.some(
      action =>
        action.type ===
        "detail"
    )
  ) {

    post.actions.unshift({

      type:
        "detail",

      label:
        "Detay",

      url:
        "",

      enabled:
        true

    });

  }

}


/* =========================================================
   LEGACY DETAILS
   ========================================================= */

function buildLegacyDetails(
  item
) {

  const facts =
    plainObject(
      item.facts
    )
      ? item.facts
      : {};


  return {

    startDate:
      cleanString(
        facts.eventDate ||
        item.date
      ),

    registrationDeadline:
      cleanString(
        facts.deadline ||
        facts.deadlineText
      ),

    ageGroup:
      cleanString(
        facts.ageGroup
      ),

    level:
      cleanString(
        facts.grade
      )

  };

}


/* =========================================================
   LEGACY SPORT
   ========================================================= */

function mapLegacySport(
  value
) {

  const text =
    cleanString(
      value
    )
      .toLocaleLowerCase(
        "tr-TR"
      );


  if (
    text.includes(
      "basket"
    )
  ) {

    return "basketball";

  }


  if (
    text.includes(
      "yüz"
    ) ||
    text.includes(
      "yuz"
    )
  ) {

    return "swimming";

  }


  if (
    text.includes(
      "voley"
    )
  ) {

    return "volleyball";

  }


  if (
    text.includes(
      "cimnast"
    ) ||
    text.includes(
      "jimnast"
    )
  ) {

    return "gymnastics";

  }


  return "other";

}


/* =========================================================
   LEGACY CATEGORY
   ========================================================= */

function mapLegacyCategory(
  item
) {

  const legacy =
    cleanString(
      item.category
    )
      .toLowerCase();


  if (
    legacy ===
    "education"
  ) {

    return "events";

  }


  if (
    legacy ===
    "event"
  ) {

    return "events";

  }


  if (
    legacy ===
    "coach"
  ) {

    return "events";

  }


  if (
    legacy ===
    "athlete"
  ) {

    return "events";

  }


  if (
    legacy ===
    "announcement"
  ) {

    return "events";

  }


  return "events";

}


/* =========================================================
   LEGACY SUBCATEGORY
   ========================================================= */

function mapLegacySubCategory(
  item
) {

  const category =
    cleanString(
      item.category
    )
      .toLowerCase();


  if (
    category ===
    "education"
  ) {

    return "education";

  }


  if (
    category ===
    "event"
  ) {

    return "competition";

  }


  return "education";

}


/* =========================================================
   LEGACY CONTENT TYPE
   ========================================================= */

function mapLegacyContentType(
  category
) {

  const value =
    cleanString(
      category
    )
      .toLowerCase();


  if (
    value ===
    "event"
  ) {

    return "competition";

  }


  if (
    [
      "coach",
      "athlete",
      "education",
      "announcement"
    ].includes(
      value
    )
  ) {

    return value;

  }


  return "general";

}


/* =========================================================
   LEGACY PROVIDER TYPE
   ========================================================= */

function mapLegacyProviderType(
  item
) {

  const sourceType =
    cleanString(
      item.sourceType
    )
      .toLocaleUpperCase(
        "tr-TR"
      );


  if (
    sourceType.includes(
      "FEDERASYON"
    )
  ) {

    return "federation";

  }


  return "other";

}


/* =========================================================
   TAXONOMY NORMALİZE
   ========================================================= */

function normalizeSport(
  value
) {

  const id =
    cleanString(
      value
    )
      .toLowerCase();


  return getSport(
    id
  )
    ? id
    : "";
}


function normalizeCategory(
  value
) {

  const id =
    cleanString(
      value
    )
      .toLowerCase();


  return getCategory(
    id
  )
    ? id
    : "";
}


function normalizeSubCategory(
  category,
  value
) {

  const id =
    cleanString(
      value
    )
      .toLowerCase();


  return getSubCategory(
    category,
    id
  )
    ? id
    : "";
}


function normalizeProviderType(
  value
) {

  const id =
    cleanString(
      value ||
      "other"
    )
      .toLowerCase();


  return getProviderType(
    id
  )
    ? id
    : "other";
}


function normalizeContentType(
  value
) {

  const id =
    cleanString(
      value ||
      "general"
    )
      .toLowerCase();


  return getContentType(
    id
  )
    ? id
    : "general";
}


/* =========================================================
   TAGS
   ========================================================= */

function normalizeTags(
  value
) {

  return [
    ...new Set(
      stringArray(
        value
      )
    )
  ];

}


/* =========================================================
   SPORT EMOJI
   ========================================================= */

function sportEmoji(
  sport
) {

  return getSport(
    sport
  )?.emoji ||
  "🏆";

}


/* =========================================================
   HELPERS
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


function plainObject(
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


function stringArray(
  value
) {

  if (
    !Array.isArray(
      value
    )
  ) {

    return [];

  }


  return value

    .map(
      cleanString
    )

    .filter(
      Boolean
    );

}


function numberValue(
  value,
  fallback = 0
) {

  const number =
    Number(
      value
    );


  return Number.isFinite(
    number
  )
    ? number
    : fallback;

}


function nonNegativeNumber(
  value
) {

  return Math.max(
    0,
    numberValue(
      value
    )
  );

}


function nullableNumber(
  value
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return null;

  }


  const number =
    Number(
      value
    );


  return Number.isFinite(
    number
  )
    ? number
    : null;

}


function nullableBoolean(
  value
) {

  if (
    value === true ||
    value === false
  ) {

    return value;

  }


  return null;

}


function clamp(
  value,
  min,
  max
) {

  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );

        }
