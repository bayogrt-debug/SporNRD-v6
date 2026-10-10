/* =========================================================
   SporNRD
   worker/core/normalizer.js

   Kaynak Verisi → SporNRD Post Standardı

   Sürüm: 6.1.1

   Amaç:
   ---------------------------------------------------------
   - TYF / TBF mevcut veri modelini yeni post modeline çevirmek
   - Kaynak kayıt merkezindeki bilgileri posta eklemek
   - Bütün kaynaklardan gelen veriyi tek standarda oturtmak
   - Yayın tarihi ile etkinlik tarihini kesin olarak ayırmak
   - Hatalı postların bütün akışı bozmasını engellemek
   - Tekrarları temizlemek
   - Yeni post modelini eski frontend formatına geri çevirmek

   TARİH KURALI
   ---------------------------------------------------------
   source.publishedAt
   lifecycle.publishedAt
   =
   HABERİN YAYIN TARİHİ

   details.startDate
   details.endDate
   lifecycle.startsAt
   lifecycle.endsAt
   =
   YALNIZCA ETKİNLİĞE AİT KANITLI TARİHLER

   item.date ASLA otomatik olarak etkinlik tarihi değildir.
   ========================================================= */


import {

  createPost,
  fromLegacyPost,
  validatePost

} from "./postSchema.js";


import {

  getSource,
  createPublicSourceInfo

} from "./sourceRegistry.js";


import {

  getSport

} from "./taxonomy.js";


/* =========================================================
   NORMALIZER VERSION
   ========================================================= */

export const NORMALIZER_VERSION =
  "1.1";


/* =========================================================
   TEK LEGACY ITEM → SPORNRD POST
   ========================================================= */

export function normalizeLegacyItem(
  item,
  sourceId = ""
) {

  if (
    !isPlainObject(
      item
    )
  ) {

    return null;

  }


  /* -------------------------------------------------------
     Kaynak ID
     ------------------------------------------------------- */

  const resolvedSourceId =
    cleanString(

      sourceId ||

      item.sourceId ||

      item.sourceShortName

    )
      .toLowerCase();


  /* -------------------------------------------------------
     Registry kaynağı
     ------------------------------------------------------- */

  const registrySource =
    getSource(
      resolvedSourceId
    );


  /* -------------------------------------------------------
     Eski postu yeni modele çevir
     ------------------------------------------------------- */

  const legacyPost =
    fromLegacyPost(
      item
    );


  if (
    !legacyPost ||
    typeof legacyPost !==
    "object"
  ) {

    return null;

  }


  /* =======================================================
     YAYIN TARİHİ

     ÖNEMLİ:
     Bu tarih haberin yayın tarihidir.
     Etkinlik başlangıcı değildir.
     ======================================================= */

  const publishedAt =
    resolvePublishedAt(
      item,
      legacyPost
    );


  /* =======================================================
     ETKİNLİK TARİHLERİ

     item.date burada kullanılmaz.
     ======================================================= */

  const eventDates =
    resolveEventDates(
      item,
      legacyPost,
      publishedAt
    );


  /* =======================================================
     DETAILS

     fromLegacyPost yanlışlıkla publication date'i
     startDate'e koyduysa burada kesin olarak temizlenir.
     ======================================================= */

  const details =
    normalizeDetails({

      item:
        item,

      legacyPost:
        legacyPost,

      publishedAt:
        publishedAt,

      eventDates:
        eventDates

    });


  /* =======================================================
     LIFECYCLE

     publishedAt ≠ startsAt
     ======================================================= */

  const lifecycle =
    normalizeLifecycle({

      legacyPost:
        legacyPost,

      publishedAt:
        publishedAt,

      eventDates:
        eventDates

    });


  /* -------------------------------------------------------
     Registry bilgileriyle zenginleştir
     ------------------------------------------------------- */

  const enriched =
    createPost({

      ...legacyPost,


      /* ---------------------------------------------------
         Branş

         Registry varsa onun branşı otoritedir.
         --------------------------------------------------- */

      sport:

        registrySource?.sport ||

        legacyPost.sport,


      /* ---------------------------------------------------
         Provider Type
         --------------------------------------------------- */

      providerType:

        registrySource?.providerType ||

        legacyPost.providerType,


      /* ---------------------------------------------------
         Details
         --------------------------------------------------- */

      details:
        details,


      /* ---------------------------------------------------
         Kaynak
         --------------------------------------------------- */

      source: {

        ...legacyPost.source,

        id:

          registrySource?.id ||

          legacyPost.source?.id ||

          resolvedSourceId,

        name:

          registrySource?.name ||

          legacyPost.source?.name ||

          cleanString(
            item.source
          ),

        shortName:

          registrySource?.shortName ||

          legacyPost.source?.shortName ||

          cleanString(
            item.sourceShortName
          ),

        sourceType:

          registrySource?.sourceType ||

          legacyPost.source?.sourceType ||

          cleanString(
            item.sourceType
          ),

        website:

          registrySource?.website ||

          legacyPost.source?.website ||

          "",

        url:

          cleanString(
            item.url
          )
          ||
          legacyPost.source?.url
          ||
          "",


        /*
          HABER YAYIN TARİHİ
        */

        publishedAt:
          publishedAt,


        verified:

          registrySource?.verified ===
          true

          ||

          legacyPost.source?.verified ===
          true

      },


      /* ---------------------------------------------------
         Güven
         --------------------------------------------------- */

      trust: {

        ...legacyPost.trust,

        verified:

          registrySource?.verified ===
          true

          ||

          legacyPost.trust?.verified ===
          true,

        confidenceScore:

          calculateConfidenceScore(
            item,
            registrySource
          ),

        evidenceCount:

          countEvidence(
            item
          ),

        lastCheckedAt:

          new Date()
            .toISOString(),

        notes:

          buildTrustNotes(
            item,
            registrySource
          )

      },


      /* ---------------------------------------------------
         Lifecycle
         --------------------------------------------------- */

      lifecycle:
        lifecycle

    });


  /* -------------------------------------------------------
     Post geçerli mi?
     ------------------------------------------------------- */

  const validation =
    validatePost(
      enriched
    );


  if (
    !validation.valid
  ) {

    return null;

  }


  return enriched;

}


/* =========================================================
   LEGACY FEED → YENİ FEED
   ========================================================= */

export function normalizeLegacyFeed(
  feed,
  fallbackSourceId = ""
) {

  const errors =
    [];


  if (
    !feed ||
    typeof feed !==
    "object"
  ) {

    return {

      ok:
        false,

      version:
        NORMALIZER_VERSION,

      source:
        null,

      count:
        0,

      items:
        [],

      errors: [
        {
          index:
            null,

          error:
            "Geçersiz feed verisi."
        }
      ]

    };

  }


  const rawItems =
    Array.isArray(
      feed.items
    )
      ? feed.items
      : [];


  const resolvedSourceId =
    cleanString(

      fallbackSourceId ||

      feed.source?.id ||

      feed.sourceId

    )
      .toLowerCase();


  const registrySource =
    getSource(
      resolvedSourceId
    );


  const normalizedItems =
    [];


  for (
    let index = 0;
    index < rawItems.length;
    index++
  ) {

    const item =
      rawItems[
        index
      ];


    try {

      const normalized =
        normalizeLegacyItem(
          item,
          resolvedSourceId
        );


      if (
        !normalized
      ) {

        errors.push({

          index:
            index,

          id:
            cleanString(
              item?.id
            ),

          error:
            "İçerik yeni SporNRD post standardına dönüştürülemedi."

        });


        continue;

      }


      normalizedItems.push(
        normalized
      );

    }

    catch (
      error
    ) {

      errors.push({

        index:
          index,

        id:
          cleanString(
            item?.id
          ),

        error:
          errorMessage(
            error
          )

      });

    }

  }


  /* -------------------------------------------------------
     Tekrarları temizle
     ------------------------------------------------------- */

  const uniqueItems =
    dedupePosts(
      normalizedItems
    );


  /* -------------------------------------------------------
     Yeni model puanına göre sırala
     ------------------------------------------------------- */

  uniqueItems.sort(
    comparePosts
  );


  return {

    ok:
      true,

    version:
      NORMALIZER_VERSION,

    source:

      registrySource

        ? createPublicSourceInfo(
            registrySource
          )

        : normalizeUnknownSource(
            feed.source,
            resolvedSourceId
          ),

    count:
      uniqueItems.length,

    items:
      uniqueItems,

    errors:
      errors

  };

}


/* =========================================================
   BİRDEN FAZLA FEED BİRLEŞTİR
   ========================================================= */

export function normalizeAndMergeFeeds(
  feeds = []
) {

  if (
    !Array.isArray(
      feeds
    )
  ) {

    return {

      ok:
        false,

      count:
        0,

      sourceCount:
        0,

      sources:
        [],

      items:
        [],

      errors: [
        {
          error:
            "Feed listesi geçersiz."
        }
      ]

    };

  }


  const allItems =
    [];


  const sources =
    [];


  const errors =
    [];


  for (
    let index = 0;
    index < feeds.length;
    index++
  ) {

    const entry =
      feeds[
        index
      ];


    if (
      !entry
    ) {

      continue;

    }


    const feed =
      entry.feed ||
      entry;


    const sourceId =
      cleanString(

        entry.sourceId ||

        feed.source?.id

      );


    const normalized =
      normalizeLegacyFeed(
        feed,
        sourceId
      );


    if (
      normalized.source
    ) {

      sources.push(
        normalized.source
      );

    }


    if (
      Array.isArray(
        normalized.items
      )
    ) {

      allItems.push(
        ...normalized.items
      );

    }


    if (
      Array.isArray(
        normalized.errors
      )
    ) {

      for (
        const error
        of normalized.errors
      ) {

        errors.push({

          sourceId:
            sourceId ||
            normalized.source?.id ||
            "",

          ...error

        });

      }

    }

  }


  const uniqueItems =
    dedupePosts(
      allItems
    );


  uniqueItems.sort(
    comparePosts
  );


  return {

    ok:
      true,

    version:
      NORMALIZER_VERSION,

    sourceCount:
      uniqueSources(
        sources
      ).length,

    sources:
      uniqueSources(
        sources
      ),

    count:
      uniqueItems.length,

    items:
      uniqueItems,

    errors:
      errors

  };

}


/* =========================================================
   YENİ POST → ESKİ FRONTEND POSTU
   ========================================================= */

export function toLegacyPost(
  post
) {

  if (
    !post ||
    typeof post !==
    "object"
  ) {

    return null;

  }


  const primaryImage =
    getPrimaryImage(
      post
    );


  const source =
    post.source ||
    {};


  const editorial =
    post.editorial ||
    {};


  const location =
    post.location ||
    {};


  const scoring =
    post.scoring ||
    {};


  const lifecycle =
    post.lifecycle ||
    {};


  const details =
    post.details ||
    {};


  const mainAction =
    Array.isArray(
      post.actions
    )

      ? post.actions.find(
          action =>
            action.type !==
            "source" &&
            action.enabled !==
            false
        )

      : null;


  return {

    /* -----------------------------------------------------
       Kimlik
       ----------------------------------------------------- */

    id:
      post.id,

    externalId:
      post.externalId ||
      post.id,


    /* -----------------------------------------------------
       Kullanıcının gördüğü
       ----------------------------------------------------- */

    title:
      editorial.headline ||
      "",

    summary:
      editorial.influencerText ||
      "",


    /* -----------------------------------------------------
       Orijinal
       ----------------------------------------------------- */

    originalTitle:
      editorial.originalTitle ||
      "",

    originalText:
      editorial.originalText ||
      "",


    /* -----------------------------------------------------
       Editör
       ----------------------------------------------------- */

    editorial:
      editorial.enabled !==
      false,

    editorialLabel:
      editorial.label ||
      "SporNRD Özeti",

    editorialVersion:
      editorial.version ||
      "",


    /* -----------------------------------------------------
       Kaynak
       ----------------------------------------------------- */

    sourceId:
      source.id ||
      "",

    source:
      source.name ||
      "",

    sourceShortName:
      source.shortName ||
      "",

    sourceType:
      source.sourceType ||
      "",

    verified:
      source.verified ===
      true,


    /* -----------------------------------------------------
       Branş
       ----------------------------------------------------- */

    sport:
      getSport(
        post.sport
      )?.label ||
      post.sport ||
      "",


    /* -----------------------------------------------------
       Yeni kategori alanları
       ----------------------------------------------------- */

    discoveryCategory:
      post.category ||
      "",

    subCategory:
      post.subCategory ||
      "",

    providerType:
      post.providerType ||
      "",

    contentType:
      post.contentType ||
      "",


    /* -----------------------------------------------------
       Legacy category
       ----------------------------------------------------- */

    category:
      mapNewContentTypeToLegacyCategory(
        post.contentType
      ),


    /* -----------------------------------------------------
       Puan
       ----------------------------------------------------- */

    relevanceScore:
      safeNumber(
        scoring.relevance
      ),

    qualityScore:
      safeNumber(
        scoring.quality
      ),

    finalScore:
      safeNumber(
        scoring.final
      ),


    /* -----------------------------------------------------
       Haber DNA
       ----------------------------------------------------- */

    topic:
      editorial.angle ||
      editorial.headline ||
      "",

    urgency:
      mapLifecycleToUrgency(
        lifecycle.status
      ),

    actionRequired:
      hasTransactionalAction(
        post.actions
      ),

    actionLabel:
      mainAction?.label ||
      "Detay",

    tags:
      Array.isArray(
        post.tags
      )
        ? post.tags
        : [],


    /* -----------------------------------------------------
       Gerçekler
       ----------------------------------------------------- */

    facts: {

      sport:
        getSport(
          post.sport
        )?.label ||
        "",

      organization:
        source.name ||
        "",

      providerType:
        post.providerType ||
        "",

      location:
        location.city ||
        "Türkiye",

      district:
        location.district ||
        "",

      venue:
        location.venue ||
        "",


      /*
        Artık yalnızca GERÇEK etkinlik tarihi.
      */

      startDate:
        details.startDate ||
        "",

      endDate:
        details.endDate ||
        "",


      registrationDeadline:
        details.registrationDeadline ||
        details.applicationDeadline ||
        "",

      price:
        firstDefined(

          details.price,

          details.newPrice,

          details.salePrice

        ),

      currency:
        details.currency ||
        "",

      ageMin:
        details.ageMin ??
        null,

      ageMax:
        details.ageMax ??
        null

    },


    /* -----------------------------------------------------
       HABER YAYIN TARİHİ

       Etkinlik tarihi değildir.
       ----------------------------------------------------- */

    date:

      source.publishedAt ||

      lifecycle.publishedAt ||

      "",

    timestamp:
      dateToTimestamp(

        lifecycle.publishedAt ||

        source.publishedAt

      ),

    location:
      location.city ||
      "Türkiye",


    /* -----------------------------------------------------
       Medya
       ----------------------------------------------------- */

    image:
      primaryImage,

    media:
      Array.isArray(
        post.media
      )
        ? post.media
        : [],

    url:
      source.url ||
      "",

    pdfUrl:
      findPdfActionUrl(
        post.actions
      ),


    /* -----------------------------------------------------
       Yeni sistem alanları
       ----------------------------------------------------- */

    status:
      lifecycle.status ||
      "active",

    confidenceScore:
      safeNumber(
        post.trust?.confidenceScore
      ),

    lastCheckedAt:
      post.trust?.lastCheckedAt ||
      "",


    /* -----------------------------------------------------
       Görsel
       ----------------------------------------------------- */

    emoji:
      post.display?.emoji ||
      getSport(
        post.sport
      )?.emoji ||
      "🏆"

  };

}


/* =========================================================
   YENİ POST LİSTESİ → LEGACY
   ========================================================= */

export function toLegacyItems(
  posts
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
      toLegacyPost
    )

    .filter(
      Boolean
    );

}


/* =========================================================
   DETAILS NORMALIZE

   Buradaki temel iş:
   yayın tarihini etkinlik tarihinden ayırmak.
   ========================================================= */

function normalizeDetails({

  item,
  legacyPost,
  publishedAt,
  eventDates

}) {

  const existing =
    isPlainObject(
      legacyPost.details
    )
      ? legacyPost.details
      : {};


  const details = {

    ...existing,


    /*
      Etkinlik tarihleri yalnızca
      resolveEventDates() sonucundan gelir.
    */

    startDate:
      eventDates.startDate,

    endDate:
      eventDates.endDate

  };


  /* -------------------------------------------------------
     Eski modelden sızmış publication date temizliği
     ------------------------------------------------------- */

  if (
    sameDateValue(
      details.startDate,
      publishedAt
    )
    &&
    !eventDates.startDateExplicit
  ) {

    details.startDate =
      "";

  }


  if (
    sameDateValue(
      details.endDate,
      publishedAt
    )
    &&
    !eventDates.endDateExplicit
  ) {

    details.endDate =
      "";

  }


  return details;

}


/* =========================================================
   LIFECYCLE NORMALIZE
   ========================================================= */

function normalizeLifecycle({

  legacyPost,
  publishedAt,
  eventDates

}) {

  const existing =
    isPlainObject(
      legacyPost.lifecycle
    )
      ? legacyPost.lifecycle
      : {};


  return {

    ...existing,

    status:
      existing.status ||
      "active",


    /*
      Haber yayın tarihi.
    */

    publishedAt:
      publishedAt,


    /*
      Etkinlik tarihleri.
      Publication date burada kullanılmaz.
    */

    startsAt:
      eventDates.startDate ||
      "",

    endsAt:
      eventDates.endDate ||
      "",


    lastSeenAt:
      new Date()
        .toISOString()

  };

}


/* =========================================================
   HABER YAYIN TARİHİ

   Buradaki değer yalnızca yayın zamanıdır.
   ========================================================= */

function resolvePublishedAt(
  item,
  legacyPost
) {

  const candidates = [

    item.date,

    item.publishedAt,

    legacyPost?.source?.publishedAt,

    legacyPost?.lifecycle?.publishedAt

  ];


  for (
    const candidate
    of candidates
  ) {

    const value =
      cleanString(
        candidate
      );


    if (
      value
    ) {

      return value;

    }

  }


  /*
    Timestamp varsa okunabilir ISO tarihine çevir.
  */

  const timestamp =
    safeNumber(
      item.timestamp
    );


  if (
    timestamp >
    0
  ) {

    try {

      return new Date(
        timestamp
      )
        .toISOString();

    }

    catch {

      return "";

    }

  }


  return "";

}


/* =========================================================
   GERÇEK ETKİNLİK TARİHLERİ

   KRİTİK KURAL:
   item.date BURADA YOK.
   ========================================================= */

function resolveEventDates(
  item,
  legacyPost,
  publishedAt
) {

  const facts =
    isPlainObject(
      item.facts
    )
      ? item.facts
      : {};


  const legacyDetails =
    isPlainObject(
      legacyPost?.details
    )
      ? legacyPost.details
      : {};


  const legacyLifecycle =
    isPlainObject(
      legacyPost?.lifecycle
    )
      ? legacyPost.lifecycle
      : {};


  /* =======================================================
     START DATE

     En güvenilir kaynaklardan sırayla.
     ======================================================= */

  const explicitStartCandidates = [

    item.eventDate,

    facts.eventDate,

    facts.startDate,

    facts.dateRange,

    item.startDate

  ];


  let startDate =
    "";


  let startDateExplicit =
    false;


  for (
    const candidate
    of explicitStartCandidates
  ) {

    const value =
      cleanString(
        candidate
      );


    if (
      !value
    ) {

      continue;

    }


    startDate =
      value;

    startDateExplicit =
      true;

    break;

  }


  /* -------------------------------------------------------
     Eski details.startDate yalnızca publication date
     değilse yedek olarak kabul edilir.
     ------------------------------------------------------- */

  if (
    !startDate
  ) {

    const legacyCandidate =
      cleanString(
        legacyDetails.startDate
      );


    if (
      legacyCandidate &&
      !sameDateValue(
        legacyCandidate,
        publishedAt
      )
    ) {

      startDate =
        legacyCandidate;

    }

  }


  /* -------------------------------------------------------
     Eski lifecycle.startsAt da publication date değilse
     son yedek olarak kabul edilir.
     ------------------------------------------------------- */

  if (
    !startDate
  ) {

    const lifecycleCandidate =
      cleanString(
        legacyLifecycle.startsAt
      );


    if (
      lifecycleCandidate &&
      !sameDateValue(
        lifecycleCandidate,
        publishedAt
      )
    ) {

      startDate =
        lifecycleCandidate;

    }

  }


  /* =======================================================
     END DATE
     ======================================================= */

  const explicitEndCandidates = [

    item.endDate,

    facts.endDate

  ];


  let endDate =
    "";


  let endDateExplicit =
    false;


  for (
    const candidate
    of explicitEndCandidates
  ) {

    const value =
      cleanString(
        candidate
      );


    if (
      !value
    ) {

      continue;

    }


    endDate =
      value;

    endDateExplicit =
      true;

    break;

  }


  if (
    !endDate
  ) {

    const legacyCandidate =
      cleanString(
        legacyDetails.endDate
      );


    if (
      legacyCandidate &&
      !sameDateValue(
        legacyCandidate,
        publishedAt
      )
    ) {

      endDate =
        legacyCandidate;

    }

  }


  if (
    !endDate
  ) {

    const lifecycleCandidate =
      cleanString(
        legacyLifecycle.endsAt
      );


    if (
      lifecycleCandidate &&
      !sameDateValue(
        lifecycleCandidate,
        publishedAt
      )
    ) {

      endDate =
        lifecycleCandidate;

    }

  }


  return {

    startDate:
      startDate,

    endDate:
      endDate,

    startDateExplicit:
      startDateExplicit,

    endDateExplicit:
      endDateExplicit

  };

}


/* =========================================================
   AYNI TARİH Mİ?

   Farklı formatlardaki:
   07.10.2026
   2026-10-07
   gibi değerleri karşılaştırabilir.
   ========================================================= */

function sameDateValue(
  left,
  right
) {

  if (
    !left ||
    !right
  ) {

    return false;

  }


  const leftTimestamp =
    dateToTimestamp(
      left
    );


  const rightTimestamp =
    dateToTimestamp(
      right
    );


  if (
    leftTimestamp >
    0 &&
    rightTimestamp >
    0
  ) {

    return (
      getUtcDay(
        leftTimestamp
      ) ===
      getUtcDay(
        rightTimestamp
      )
    );

  }


  return (
    normalizeText(
      left
    ) ===
    normalizeText(
      right
    )
  );

}


/* =========================================================
   UTC GÜN ANAHTARI
   ========================================================= */

function getUtcDay(
  timestamp
) {

  try {

    const date =
      new Date(
        timestamp
      );


    return [

      date.getUTCFullYear(),

      String(
        date.getUTCMonth() + 1
      )
        .padStart(
          2,
          "0"
        ),

      String(
        date.getUTCDate()
      )
        .padStart(
          2,
          "0"
        )

    ].join(
      "-"
    );

  }

  catch {

    return "";

  }

}


/* =========================================================
   TEKRAR KONTROLÜ
   ========================================================= */

export function dedupePosts(
  posts
) {

  if (
    !Array.isArray(
      posts
    )
  ) {

    return [];

  }


  const output =
    [];


  const ids =
    new Set();


  const urls =
    new Set();


  const fingerprints =
    new Set();


  for (
    const post
    of posts
  ) {

    if (
      !post ||
      typeof post !==
      "object"
    ) {

      continue;

    }


    const id =
      cleanString(
        post.id
      );


    const url =
      normalizeUrl(
        post.source?.url
      );


    const fingerprint =
      createFingerprint(
        post
      );


    if (
      id &&
      ids.has(
        id
      )
    ) {

      continue;

    }


    if (
      url &&
      urls.has(
        url
      )
    ) {

      continue;

    }


    if (
      fingerprint &&
      fingerprints.has(
        fingerprint
      )
    ) {

      continue;

    }


    if (
      id
    ) {

      ids.add(
        id
      );

    }


    if (
      url
    ) {

      urls.add(
        url
      );

    }


    if (
      fingerprint
    ) {

      fingerprints.add(
        fingerprint
      );

    }


    output.push(
      post
    );

  }


  return output;

}


/* =========================================================
   POST SIRALAMA
   ========================================================= */

export function comparePosts(
  a,
  b
) {

  const scoreA =
    safeNumber(
      a?.scoring?.final
    );


  const scoreB =
    safeNumber(
      b?.scoring?.final
    );


  if (
    scoreA !==
    scoreB
  ) {

    return (
      scoreB -
      scoreA
    );

  }


  const timeA =
    getPostTimestamp(
      a
    );


  const timeB =
    getPostTimestamp(
      b
    );


  return (
    timeB -
    timeA
  );

}


/* =========================================================
   NORMALIZATION SUMMARY
   ========================================================= */

export function createNormalizationSummary(
  posts
) {

  const items =
    Array.isArray(
      posts
    )
      ? posts
      : [];


  const sports =
    {};


  const categories =
    {};


  const providers =
    {};


  for (
    const post
    of items
  ) {

    incrementCounter(
      sports,
      post?.sport
    );


    incrementCounter(
      categories,
      post?.category
    );


    incrementCounter(
      providers,
      post?.providerType
    );

  }


  return {

    count:
      items.length,

    sports:
      sports,

    categories:
      categories,

    providerTypes:
      providers

  };

}


/* =========================================================
   CONFIDENCE SCORE
   ========================================================= */

function calculateConfidenceScore(
  item,
  registrySource
) {

  let score =
    40;


  if (
    registrySource?.verified ===
    true
  ) {

    score +=
      35;

  }


  if (
    item.url
  ) {

    score +=
      10;

  }


  if (
    item.title ||
    item.originalTitle
  ) {

    score +=
      5;

  }


  if (
    item.date ||
    item.timestamp
  ) {

    score +=
      5;

  }


  if (
    item.image
  ) {

    score +=
      5;

  }


  return clamp(
    score,
    0,
    100
  );

}


/* =========================================================
   EVIDENCE COUNT
   ========================================================= */

function countEvidence(
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
   TRUST NOTES
   ========================================================= */

function buildTrustNotes(
  item,
  registrySource
) {

  const notes =
    [];


  if (
    registrySource?.trust?.official ===
    true
  ) {

    notes.push(
      "Resmî kaynaktan alındı."
    );

  }


  if (
    item.url
  ) {

    notes.push(
      "Orijinal kaynak bağlantısı mevcut."
    );

  }


  if (
    item.pdfUrl
  ) {

    notes.push(
      "Resmî PDF kanıtı mevcut."
    );

  }


  return notes;

}


/* =========================================================
   BİLİNMEYEN KAYNAK
   ========================================================= */

function normalizeUnknownSource(
  source,
  fallbackId
) {

  const value =
    isPlainObject(
      source
    )
      ? source
      : {};


  return {

    id:
      cleanString(
        value.id ||
        fallbackId
      ),

    name:
      cleanString(
        value.name
      ),

    shortName:
      cleanString(
        value.shortName
      ),

    sourceType:
      cleanString(
        value.sourceType
      ),

    providerType:
      "other",

    sport:
      "other",

    sportLabel:
      "Diğer",

    sportEmoji:
      "🏆",

    verified:
      Boolean(
        value.verified
      ),

    enabled:
      true,

    website:
      cleanString(
        value.website
      ),

    endpoint:
      ""

  };

}


/* =========================================================
   FINGERPRINT
   ========================================================= */

function createFingerprint(
  post
) {

  const headline =
    normalizeText(
      post?.editorial?.originalTitle ||
      post?.editorial?.headline
    );


  const sourceId =
    normalizeText(
      post?.source?.id
    );


  const sport =
    normalizeText(
      post?.sport
    );


  if (
    !headline
  ) {

    return "";

  }


  return [
    sourceId,
    sport,
    headline
  ]
    .filter(
      Boolean
    )
    .join(
      "|"
    );

}


/* =========================================================
   PRIMARY IMAGE
   ========================================================= */

function getPrimaryImage(
  post
) {

  if (
    !Array.isArray(
      post?.media
    )
  ) {

    return "";

  }


  const image =
    post.media.find(
      media =>
        media?.type ===
        "image" &&
        media?.url
    );


  return image?.url ||
  "";

}


/* =========================================================
   LEGACY CATEGORY
   ========================================================= */

function mapNewContentTypeToLegacyCategory(
  contentType
) {

  const map = {

    coach:
      "coach",

    athlete:
      "athlete",

    competition:
      "event",

    education:
      "education",

    announcement:
      "announcement",

    campaign:
      "announcement",

    job:
      "announcement",

    product:
      "announcement",

    general:
      "event"

  };


  return (
    map[
      contentType
    ]
    ||
    "announcement"
  );

}


/* =========================================================
   TRANSACTIONAL ACTION
   ========================================================= */

function hasTransactionalAction(
  actions
) {

  if (
    !Array.isArray(
      actions
    )
  ) {

    return false;

  }


  const transactional = [

    "register",

    "buy",

    "apply",

    "ticket",

    "join",

    "campaign",

    "product",

    "contact"

  ];


  return actions.some(
    action =>
      action?.enabled !==
      false
      &&
      transactional.includes(
        action?.type
      )
  );

}


/* =========================================================
   LIFECYCLE → URGENCY
   ========================================================= */

function mapLifecycleToUrgency(
  status
) {

  if (
    status ===
    "closing_soon"
  ) {

    return "high";

  }


  if (
    status ===
    "updated" ||
    status ===
    "new"
  ) {

    return "medium";

  }


  return "normal";

}


/* =========================================================
   PDF ACTION
   ========================================================= */

function findPdfActionUrl(
  actions
) {

  if (
    !Array.isArray(
      actions
    )
  ) {

    return "";

  }


  const action =
    actions.find(
      item =>
        /\.pdf(?:$|\?)/i.test(
          item?.url ||
          ""
        )
    );


  return action?.url ||
  "";

}


/* =========================================================
   UNIQUE SOURCES
   ========================================================= */

function uniqueSources(
  sources
) {

  const output =
    [];


  const used =
    new Set();


  for (
    const source
    of sources
  ) {

    const id =
      cleanString(
        source?.id
      );


    if (
      !id ||
      used.has(
        id
      )
    ) {

      continue;

    }


    used.add(
      id
    );


    output.push(
      source
    );

  }


  return output;

}


/* =========================================================
   POST TIMESTAMP

   Sıralamada önce yayın tarihi kullanılır.
   ========================================================= */

function getPostTimestamp(
  post
) {

  const candidates = [

    post?.lifecycle?.publishedAt,

    post?.source?.publishedAt,

    post?.lifecycle?.updatedAt,

    post?.lifecycle?.firstSeenAt

  ];


  for (
    const value
    of candidates
  ) {

    const timestamp =
      dateToTimestamp(
        value
      );


    if (
      timestamp >
      0
    ) {

      return timestamp;

    }

  }


  return 0;

}


/* =========================================================
   DATE → TIMESTAMP
   ========================================================= */

function dateToTimestamp(
  value
) {

  if (
    !value
  ) {

    return 0;

  }


  const text =
    cleanString(
      value
    );


  /* -------------------------------------------------------
     dd.mm.yyyy / dd-mm-yyyy / dd/mm/yyyy
     ------------------------------------------------------- */

  let match =
    text.match(
      /\b(\d{1,2})[.\/-](\d{1,2})[.\/-](20\d{2})\b/
    );


  if (
    match
  ) {

    return Date.UTC(

      Number(
        match[3]
      ),

      Number(
        match[2]
      ) -
      1,

      Number(
        match[1]
      )

    );

  }


  /* -------------------------------------------------------
     Türkçe:
     7 Ekim 2026
     ------------------------------------------------------- */

  match =
    text.match(

      /\b(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+(20\d{2})\b/i

    );


  if (
    match
  ) {

    const monthIndex =
      getTurkishMonthIndex(
        match[2]
      );


    if (
      monthIndex >=
      0
    ) {

      return Date.UTC(

        Number(
          match[3]
        ),

        monthIndex,

        Number(
          match[1]
        )

      );

    }

  }


  /* -------------------------------------------------------
     ISO / standart parse
     ------------------------------------------------------- */

  const direct =
    Date.parse(
      text
    );


  return Number.isFinite(
    direct
  )
    ? direct
    : 0;

}


/* =========================================================
   TÜRKÇE AY
   ========================================================= */

function getTurkishMonthIndex(
  value
) {

  const months = [

    "ocak",

    "subat",

    "mart",

    "nisan",

    "mayis",

    "haziran",

    "temmuz",

    "agustos",

    "eylul",

    "ekim",

    "kasim",

    "aralik"

  ];


  return months.indexOf(
    normalizeText(
      value
    )
  );

}


/* =========================================================
   FIRST DEFINED
   ========================================================= */

function firstDefined(
  ...values
) {

  for (
    const value
    of values
  ) {

    if (
      value !==
      undefined &&
      value !==
      null &&
      value !==
      ""
    ) {

      return value;

    }

  }


  return null;

}


/* =========================================================
   COUNTER
   ========================================================= */

function incrementCounter(
  object,
  key
) {

  const safeKey =
    cleanString(
      key ||
      "unknown"
    );


  object[
    safeKey
  ] =
    safeNumber(
      object[
        safeKey
      ]
    )
    +
    1;

}


/* =========================================================
   NORMALIZE URL
   ========================================================= */

function normalizeUrl(
  value
) {

  const text =
    cleanString(
      value
    );


  if (
    !text
  ) {

    return "";

  }


  try {

    const url =
      new URL(
        text
      );


    url.hash =
      "";


    return url
      .href
      .replace(
        /\/$/,
        ""
      )
      .toLowerCase();

  }

  catch {

    return text
      .replace(
        /#.*$/,
        ""
      )
      .replace(
        /\/$/,
        ""
      )
      .toLowerCase();

  }

}


/* =========================================================
   NORMALIZE TEXT
   ========================================================= */

function normalizeText(
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
    )

    .replace(
      /[^a-z0-9]+/g,
      " "
    )

    .replace(
      /\s+/g,
      " "
    )

    .trim();

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


function safeNumber(
  value
) {

  const number =
    Number(
      value
    );


  return Number.isFinite(
    number
  )
    ? number
    : 0;

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


function errorMessage(
  error
) {

  if (
    error &&
    typeof error.message ===
    "string"
  ) {

    return error.message;

  }


  return String(
    error ||
    "Bilinmeyen hata"
  );

}
