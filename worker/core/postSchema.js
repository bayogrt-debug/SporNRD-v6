/* =========================================================
   SporNRD
   worker/core/postSchema.js

   Ortak SporNRD Post Veri Modeli

   Sürüm: 6.1.2

   Amaç:
   ---------------------------------------------------------
   - Bütün kaynakları tek post modelinde birleştirmek
   - Legacy kaynakları yeni SporNRD modeline taşımak
   - Section / kategori / alt kategori yapısını korumak
   - Fact Engine gerçeklerini kaybetmeden aktarmak
   - Etkinlik tarihi ile yayın tarihini ayırmak
   - Temporal Engine için güvenilir structured data üretmek
   - Kategoriye göre details alanını standartlaştırmak

   KRİTİK KURAL:
   ---------------------------------------------------------
   source.publishedAt
   olay tarihi DEĞİLDİR.

   Yayın tarihi hiçbir zaman otomatik olarak:
   details.startDate

   alanına yazılmaz.

   Zincir:

   Kaynak
      ↓
   Fact Engine
      ↓
   Post Schema
      ↓
   Content Intent
      ↓
   Discovery
      ↓
   Temporal
      ↓
   Persona
   ========================================================= */


import {

  DEFAULT_CURRENCY,

  getSection,

  getCategory,

  getSubCategory,

  getProviderType,

  getContentType,

  getPostStatus,

  getActionType,

  getSport

} from "./taxonomy.js";


/* =========================================================
   VERSION
   ========================================================= */

export const POST_SCHEMA_VERSION =
  "1.2";


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

    section:
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
        "",

      note:
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
       DETAYLAR
       ----------------------------------------------------- */

    details:
      {},


    /* -----------------------------------------------------
       AKSİYONLAR
       ----------------------------------------------------- */

    actions:
      [],


    /* -----------------------------------------------------
       ETKİLEŞİM
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
       GÜVEN
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
       PUAN
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
       ETİKET
       ----------------------------------------------------- */

    tags:
      [],


    /* -----------------------------------------------------
       DISPLAY
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
   ========================================================= */

export function createPost(
  input = {}
) {

  const post =
    createEmptyPost();


  /* =======================================================
     KİMLİK
     ========================================================= */

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
     ========================================================= */

  post.sport =
    normalizeSport(
      input.sport
    );


  post.section =
    normalizeSection(
      input.section
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
     ========================================================= */

  post.source =
    normalizeSource(
      input.source
    );


  /* =======================================================
     EDİTÖR
     ========================================================= */

  post.editorial =
    normalizeEditorial(
      input.editorial
    );


  /* =======================================================
     MEDYA
     ========================================================= */

  post.media =
    normalizeMedia(
      input.media
    );


  /* =======================================================
     KONUM
     ========================================================= */

  post.location =
    normalizeLocation(
      input.location
    );


  /* =======================================================
     DETAYLAR
     ========================================================= */

  post.details =
    normalizeDetails(
      post.category,
      input.details
    );


  /* =======================================================
     ACTIONS
     ========================================================= */

  post.actions =
    normalizeActions(
      input.actions
    );


  /* =======================================================
     INTERACTIONS
     ========================================================= */

  post.interactions =
    normalizeInteractions(
      input.interactions
    );


  /* =======================================================
     TRUST
     ========================================================= */

  post.trust =
    normalizeTrust(
      input.trust
    );


  /* =======================================================
     LIFECYCLE
     ========================================================= */

  post.lifecycle =
    normalizeLifecycle(
      input.lifecycle
    );


  /* =======================================================
     SCORING
     ========================================================= */

  post.scoring =
    normalizeScoring(
      input.scoring
    );


  /* =======================================================
     TAGS
     ========================================================= */

  post.tags =
    normalizeTags(
      input.tags
    );


  /* =======================================================
     DISPLAY
     ========================================================= */

  post.display =
    normalizeDisplay(
      input.display,
      post.sport
    );


  /* =======================================================
     OTOMATİK DEFAULTLAR
     ========================================================= */

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

      errors: [
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
    !cleanString(
      post.sport
    )
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
   yeni ortak modele taşır.
   ========================================================= */

export function fromLegacyPost(
  item = {}
) {

  const facts =
    plainObject(
      item.facts
    )
      ? item.facts
      : {};


  const sourceId =
    cleanString(
      item.sourceId
    );


  const sourceShortName =
    cleanString(
      item.sourceShortName
    );


  /* =======================================================
     FACT ENGINE GERÇEKLERİNİ AKTAR
     ========================================================= */

  const legacyDetails =
    buildLegacyDetails(
      item
    );


  const legacyLocation =
    buildLegacyLocation(
      item
    );


  /* =======================================================
     MEDYA
     ========================================================= */

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


  /* =======================================================
     ACTIONS
     ========================================================= */

  const actions = [

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


  /* =======================================================
     POST
     ========================================================= */

  return createPost({

    id:
      item.id,

    externalId:
      item.externalId,


    /* -----------------------------------------------------
       SINIFLANDIRMA

       Discovery Engine daha sonra bu değerleri
       yeniden değerlendirebilir.
       ----------------------------------------------------- */

    sport:
      mapLegacySport(
        item.sport
      ),


    section:
      mapLegacySection(
        item
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


    /* -----------------------------------------------------
       KAYNAK
       ----------------------------------------------------- */

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

      /*
        KRİTİK:

        item.date yayın tarihidir.
        Burada doğru yerde tutulur.
      */

      publishedAt:
        item.date,

      verified:
        item.verified ===
        true

    },


    /* -----------------------------------------------------
       EDİTÖR
       ----------------------------------------------------- */

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
        "",

      note:
        ""

    },


    /* -----------------------------------------------------
       MEDYA
       ----------------------------------------------------- */

    media:
      media,


    /* -----------------------------------------------------
       KONUM
       ----------------------------------------------------- */

    location:
      legacyLocation,


    /* -----------------------------------------------------
       FACT ENGINE → DETAILS
       ----------------------------------------------------- */

    details:
      legacyDetails,


    /* -----------------------------------------------------
       ACTIONS
       ----------------------------------------------------- */

    actions:
      actions,


    /* -----------------------------------------------------
       TRUST
       ----------------------------------------------------- */

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
        calculateLegacyEvidenceCount(
          item
        ),

      lastCheckedAt:
        new Date()
          .toISOString()

    },


    /* -----------------------------------------------------
       LIFECYCLE

       KRİTİK:

       publishedAt = yayın tarihi
       startsAt    = gerçek başlangıç tarihi
       endsAt      = gerçek bitiş tarihi
       expiresAt   = deadline

       Birbirine karıştırılmaz.
       ----------------------------------------------------- */

    lifecycle: {

      status:
        "active",

      publishedAt:
        item.date ||
        "",

      startsAt:
        legacyDetails.startDate ||
        "",

      endsAt:
        legacyDetails.endDate ||
        "",

      expiresAt:

        legacyDetails.registrationDeadline

        ||

        legacyDetails.applicationDeadline

        ||

        "",

      lastSeenAt:
        new Date()
          .toISOString()

    },


    /* -----------------------------------------------------
       SCORING
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       TAGS
       ----------------------------------------------------- */

    tags:
      item.tags ||
      [],


    /* -----------------------------------------------------
       DISPLAY
       ----------------------------------------------------- */

    display: {

      emoji:
        item.emoji ||
        ""

    },


    /*
      facts burada doğrudan createPost modeline
      eklenmiyor.

      Fact Engine gerçekleri yukarıda:
      location
      details
      lifecycle

      yapılarına ayrılmıştır.
    */

    _legacyFacts:
      facts

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
      ),

    note:
      cleanString(
        input.note
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

   Yeni ana kategoriler:

   news
   course
   event
   campaign
   jobs
   stores

   Eski çoğul ID'lere de geçiş desteği vardır.
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

    case "course":
    case "courses":

      return normalizeCourseDetails(
        input
      );


    case "event":
    case "events":

      return normalizeEventDetails(
        input
      );


    case "campaign":
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


    case "news":

      return normalizeNewsDetails(
        input
      );


    default:

      return normalizeGenericDetails(
        input
      );

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

    /*
      Fact Engine tarafından çıkarılan
      gerçek etkinlik tarihleri.
    */

    startDate:
      cleanString(
        input.startDate
      ),

    endDate:
      cleanString(
        input.endDate
      ),

    startDateIso:
      cleanString(
        input.startDateIso
      ),

    endDateIso:
      cleanString(
        input.endDateIso
      ),

    eventDate:
      cleanString(
        input.eventDate
      ),

    registrationDeadline:
      cleanString(
        input.registrationDeadline
      ),

    deadlineIso:
      cleanString(
        input.deadlineIso
      ),

    deadlineTime:
      cleanString(
        input.deadlineTime
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

    startDateIso:
      cleanString(
        input.startDateIso
      ),

    endDateIso:
      cleanString(
        input.endDateIso
      ),

    eventDate:
      cleanString(
        input.eventDate
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

    deadlineIso:
      cleanString(
        input.deadlineIso
      ),

    deadlineTime:
      cleanString(
        input.deadlineTime
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

    price:
      nullableNumber(
        input.price
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

    startDateIso:
      cleanString(
        input.startDateIso
      ),

    endDateIso:
      cleanString(
        input.endDateIso
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
      ),

    deadlineIso:
      cleanString(
        input.deadlineIso
      ),

    deadlineTime:
      cleanString(
        input.deadlineTime
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
   NEWS DETAILS

   Haberlerde ticari alan zorunlu değildir.

   Fakat olay tarihi gerçekten varsa kaybedilmez.
   ========================================================= */

function normalizeNewsDetails(
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

    startDateIso:
      cleanString(
        input.startDateIso
      ),

    endDateIso:
      cleanString(
        input.endDateIso
      ),

    eventDate:
      cleanString(
        input.eventDate
      ),

    result:
      cleanString(
        input.result
      ),

    achievement:
      cleanString(
        input.achievement
      )

  };

}


/* =========================================================
   GENERIC DETAILS
   ========================================================= */

function normalizeGenericDetails(
  input
) {

  return {

    ...input,

    startDate:
      cleanString(
        input.startDate
      ),

    endDate:
      cleanString(
        input.endDate
      ),

    startDateIso:
      cleanString(
        input.startDateIso
      ),

    endDateIso:
      cleanString(
        input.endDateIso
      ),

    eventDate:
      cleanString(
        input.eventDate
      ),

    registrationDeadline:
      cleanString(
        input.registrationDeadline
      ),

    applicationDeadline:
      cleanString(
        input.applicationDeadline
      ),

    deadlineIso:
      cleanString(
        input.deadlineIso
      ),

    deadlineTime:
      cleanString(
        input.deadlineTime
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


  /* -------------------------------------------------------
     Structured tarih → lifecycle

     Yalnızca GERÇEK details alanlarından yapılır.
     source.publishedAt burada kullanılmaz.
     ------------------------------------------------------- */

  if (
    !post.lifecycle.startsAt &&
    post.details?.startDate
  ) {

    post.lifecycle.startsAt =
      cleanString(
        post.details.startDate
      );

  }


  if (
    !post.lifecycle.endsAt &&
    post.details?.endDate
  ) {

    post.lifecycle.endsAt =
      cleanString(
        post.details.endDate
      );

  }


  if (
    !post.lifecycle.expiresAt
  ) {

    post.lifecycle.expiresAt =
      cleanString(

        post.details?.registrationDeadline

        ||

        post.details?.applicationDeadline

      );

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
   LEGACY FACTS → DETAILS

   EN KRİTİK GEÇİŞ NOKTASI
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


  /*
    ÖNEMLİ:

    item.date burada YOK.

    Çünkü item.date:
    → haberin yayın tarihi.

    Etkinlik başlangıcı değildir.
  */

  const startDate =
    firstString(

      facts.startDate,

      /*
        Eski Fact Engine'lerde yalnız eventDate
        olabilir.

        Fakat dateRange varsa eventDate'in
        tamamını startDate yapmak istemiyoruz.

        Yeni Fact Engine startDate ürettiği için
        öncelik ondadır.
      */

      !facts.endDate
        ? facts.eventDate
        : ""

    );


  const endDate =
    firstString(
      facts.endDate
    );


  const registrationDeadline =
    firstString(

      facts.registrationDeadline,

      facts.deadline,

      facts.deadlineText

    );


  const applicationDeadline =
    firstString(

      facts.applicationDeadline,

      facts.registrationDeadline,

      facts.deadline,

      facts.deadlineText

    );


  return {

    /* -----------------------------------------------------
       TARİH
       ----------------------------------------------------- */

    startDate:
      startDate,

    endDate:
      endDate,

    startDateIso:
      cleanString(
        facts.startDateIso
      ),

    endDateIso:
      cleanString(
        facts.endDateIso
      ),

    eventDate:
      cleanString(
        facts.eventDate ||
        facts.dateRange
      ),


    /* -----------------------------------------------------
       DEADLINE
       ----------------------------------------------------- */

    registrationDeadline:
      registrationDeadline,

    applicationDeadline:
      applicationDeadline,

    deadlineIso:
      cleanString(
        facts.deadlineIso
      ),

    deadlineTime:
      cleanString(
        facts.deadlineTime
      ),


    /* -----------------------------------------------------
       KURS
       ----------------------------------------------------- */

    ageMin:
      nullableNumber(
        facts.ageMin
      ),

    ageMax:
      nullableNumber(
        facts.ageMax
      ),

    ageGroup:
      cleanString(
        facts.ageGroup
      ),

    level:
      cleanString(
        facts.grade ||
        facts.level
      ),

    lessonType:
      cleanString(
        facts.lessonType
      ),

    capacity:
      nullableNumber(
        facts.capacity
      ),


    /* -----------------------------------------------------
       PROGRAM
       ----------------------------------------------------- */

    days:
      stringArray(
        facts.days
      ),

    startTime:
      cleanString(
        facts.startTime
      ),

    endTime:
      cleanString(
        facts.endTime
      ),


    /* -----------------------------------------------------
       FİYAT
       ----------------------------------------------------- */

    price:
      nullableNumber(
        facts.price
      ),

    oldPrice:
      nullableNumber(
        facts.oldPrice
      ),

    newPrice:
      nullableNumber(
        facts.newPrice
      ),

    salePrice:
      nullableNumber(
        facts.salePrice
      ),

    currency:
      cleanString(
        facts.currency ||
        DEFAULT_CURRENCY
      ),

    priceUnit:
      cleanString(
        facts.priceUnit
      ),

    discountRate:
      nullableNumber(
        facts.discountRate
      ),


    /* -----------------------------------------------------
       İŞ
       ----------------------------------------------------- */

    position:
      cleanString(
        facts.position
      ),

    employmentType:
      cleanString(
        facts.employmentType
      ),

    workMode:
      cleanString(
        facts.workMode
      ),

    experience:
      cleanString(
        facts.experience
      ),

    certificateLevel:
      cleanString(
        facts.certificateLevel
      ),

    salaryMin:
      nullableNumber(
        facts.salaryMin
      ),

    salaryMax:
      nullableNumber(
        facts.salaryMax
      ),


    /* -----------------------------------------------------
       ÜRÜN
       ----------------------------------------------------- */

    brand:
      cleanString(
        facts.brand
      ),

    productName:
      cleanString(
        facts.productName
      ),

    stockStatus:
      cleanString(
        facts.stockStatus
      )

  };

}


/* =========================================================
   LEGACY LOCATION
   ========================================================= */

function buildLegacyLocation(
  item
) {

  const facts =
    plainObject(
      item.facts
    )
      ? item.facts
      : {};


  const rawLocation =
    firstString(

      facts.city,

      facts.location,

      item.location

    );


  const city =
    rawLocation &&
    normalizeSimpleText(
      rawLocation
    ) !==
    "turkiye"

      ? rawLocation

      : "";


  return {

    country:
      cleanString(
        facts.country ||
        "Türkiye"
      ),

    city:
      city,

    district:
      cleanString(
        facts.district
      ),

    neighborhood:
      cleanString(
        facts.neighborhood
      ),

    venue:
      cleanString(
        facts.venue
      ),

    address:
      cleanString(
        facts.address
      ),

    latitude:
      nullableNumber(
        facts.latitude
      ),

    longitude:
      nullableNumber(
        facts.longitude
      )

  };

}


/* =========================================================
   LEGACY EVIDENCE
   ========================================================= */

function calculateLegacyEvidenceCount(
  item
) {

  let count =
    0;


  if (
    item.url
  ) {

    count++;

  }


  if (
    item.originalTitle
  ) {

    count++;

  }


  if (
    item.originalText
  ) {

    count++;

  }


  if (
    item.image
  ) {

    count++;

  }


  if (
    item.pdfUrl
  ) {

    count++;

  }


  return count;

}


/* =========================================================
   LEGACY SPORT
   ========================================================= */

function mapLegacySport(
  value
) {

  const text =
    normalizeSimpleText(
      value
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
   LEGACY SECTION

   Kaynağa / eski kategoriye göre başlangıç section.

   Discovery daha sonra daha güçlü karar verebilir.
   ========================================================= */

function mapLegacySection(
  item
) {

  const providerType =
    mapLegacyProviderType(
      item
    );


  const category =
    normalizeSimpleText(
      item.category
    );


  if (
    providerType ===
    "federation" ||
    providerType ===
    "club" ||
    providerType ===
    "academy" ||
    providerType ===
    "gym" ||
    providerType ===
    "facility" ||
    providerType ===
    "store" ||
    providerType ===
    "organizer"
  ) {

    return "business_institution";

  }


  if (
    category ===
    "coach"
  ) {

    return "trainer_coach";

  }


  if (
    category ===
    "athlete"
  ) {

    return "individual_athlete";

  }


  return "";

}


/* =========================================================
   LEGACY CATEGORY

   Bu yalnız başlangıç değeridir.

   Discovery Engine gerçek içeriği okuyarak
   nihai kategoriyi belirler.
   ========================================================= */

function mapLegacyCategory(
  item
) {

  const facts =
    plainObject(
      item.facts
    )
      ? item.facts
      : {};


  /* -------------------------------------------------------
     Açık kurs sinyali
     ------------------------------------------------------- */

  if (
    facts.isCoachCourse ===
    true
  ) {

    return "course";

  }


  const legacy =
    normalizeSimpleText(
      item.category
    );


  /*
    Legacy sistemdeki event/education vb.
    doğrudan yeni kategoriyle aynı anlamda değildir.

    Ancak createPost geçerli kategori isterse
    güvenli başlangıç "event" olur.

    Discovery daha sonra:
    news / course / event / ...
    kararını verecektir.
  */

  if (
    [
      "event",
      "education",
      "coach"
    ].includes(
      legacy
    )
  ) {

    return "event";

  }


  if (
    [
      "athlete",
      "announcement"
    ].includes(
      legacy
    )
  ) {

    return "news";

  }


  return "event";

}


/* =========================================================
   LEGACY SUBCATEGORY
   ========================================================= */

function mapLegacySubCategory(
  item
) {

  const facts =
    plainObject(
      item.facts
    )
      ? item.facts
      : {};


  if (
    facts.isCoachCourse ===
    true
  ) {

    return mapLegacySport(
      item.sport
    );

  }


  const category =
    normalizeSimpleText(
      item.category
    );


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


  return "";

}


/* =========================================================
   LEGACY CONTENT TYPE
   ========================================================= */

function mapLegacyContentType(
  category
) {

  const value =
    normalizeSimpleText(
      category
    );


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


  if (
    sourceType.includes(
      "KULÜP"
    ) ||
    sourceType.includes(
      "KULUP"
    )
  ) {

    return "club";

  }


  if (
    sourceType.includes(
      "AKADEM"
    )
  ) {

    return "academy";

  }


  if (
    sourceType.includes(
      "MAĞAZA"
    ) ||
    sourceType.includes(
      "MAGAZA"
    )
  ) {

    return "store";

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
    normalizeTaxonomyValue(
      value
    );


  return getSport(
    id
  )
    ? id
    : "";

}


/* =========================================================
   SECTION
   ========================================================= */

function normalizeSection(
  value
) {

  const id =
    normalizeTaxonomyValue(
      value
    );


  return getSection(
    id
  )
    ? id
    : "";

}


/* =========================================================
   CATEGORY

   Eski isimlere geçiş desteği:
   courses   → course
   events    → event
   campaigns → campaign
   sports_news → news
   ========================================================= */

function normalizeCategory(
  value
) {

  let id =
    normalizeTaxonomyValue(
      value
    );


  const aliases = {

    courses:
      "course",

    events:
      "event",

    campaigns:
      "campaign",

    sports_news:
      "news"

  };


  id =
    aliases[
      id
    ]
    ||
    id;


  return getCategory(
    id
  )
    ? id
    : "";

}


/* =========================================================
   SUBCATEGORY
   ========================================================= */

function normalizeSubCategory(
  category,
  value
) {

  const id =
    normalizeTaxonomyValue(
      value
    );


  if (
    !category ||
    !id
  ) {

    return "";

  }


  return getSubCategory(
    category,
    id
  )
    ? id
    : "";

}


/* =========================================================
   PROVIDER TYPE
   ========================================================= */

function normalizeProviderType(
  value
) {

  const id =
    normalizeTaxonomyValue(
      value ||
      "other"
    );


  return getProviderType(
    id
  )
    ? id
    : "other";

}


/* =========================================================
   CONTENT TYPE
   ========================================================= */

function normalizeContentType(
  value
) {

  const id =
    normalizeTaxonomyValue(
      value ||
      "general"
    );


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

  return (
    getSport(
      sport
    )?.emoji
    ||
    "🏆"
  );

}


/* =========================================================
   FIRST STRING
   ========================================================= */

function firstString(
  ...values
) {

  for (
    const value
    of values
  ) {

    const text =
      cleanString(
        value
      );


    if (
      text
    ) {

      return text;

    }

  }


  return "";

}


/* =========================================================
   TAXONOMY VALUE
   ========================================================= */

function normalizeTaxonomyValue(
  value
) {

  return normalizeSimpleText(
    value
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


/* =========================================================
   SIMPLE TEXT
   ========================================================= */

function normalizeSimpleText(
  value
) {

  return cleanString(
    value
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
    );

}


/* =========================================================
   HELPERS
   ========================================================= */

function cleanString(
  value
) {

  return String(
    value ??
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
    value ===
    null ||
    value ===
    undefined ||
    value ===
    ""
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
    value ===
    true ||
    value ===
    false
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
