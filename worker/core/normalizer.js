/* =========================================================
   SporNRD
   worker/core/normalizer.js

   Kaynak Verisi → SporNRD Post Standardı

   Sürüm: 6.1.0

   Amaç:
   ---------------------------------------------------------
   - TYF / TBF mevcut veri modelini yeni post modeline çevirmek
   - Kaynak kayıt merkezindeki bilgileri posta eklemek
   - Bütün kaynaklardan gelen veriyi tek standarda oturtmak
   - Hatalı postların bütün akışı bozmasını engellemek
   - Tekrarları temizlemek
   - Yeni post modelini eski frontend formatına geri çevirebilmek

   ÖNEMLİ:
   Şimdilik mevcut worker.js buna bağlanmayacak.
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
  "1.0";


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

        publishedAt:

          cleanString(
            item.date
          )
          ||
          legacyPost.source?.publishedAt
          ||
          "",

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

      lifecycle: {

        ...legacyPost.lifecycle,

        status:
          "active",

        publishedAt:

          cleanString(
            item.date
          )
          ||
          legacyPost.lifecycle?.publishedAt
          ||
          "",

        lastSeenAt:

          new Date()
            .toISOString()

      }

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

   İleride:
   TYF + TBF + Akademi + Kulüp + ...
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

   Bu fonksiyon çok önemli.

   Böylece Worker içeride yeni v6.1 modelini kullanırken
   mevcut telefon arayüzü bozulmadan çalışabilir.
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

       Eski frontend Türkçe branş adı bekliyor.
       ----------------------------------------------------- */

    sport:
      getSport(
        post.sport
      )?.label ||
      post.sport ||
      "",


    /* -----------------------------------------------------
       Yeni kategori alanları da korunuyor
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


    /*
      Eski frontend henüz coach / athlete / event...
      bekleyebilir.

      Geçiş döneminde içerik türünü legacy category
      olarak kullanıyoruz.
    */

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

      startDate:
        details.startDate ||
        lifecycle.startsAt ||
        "",

      endDate:
        details.endDate ||
        lifecycle.endsAt ||
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
       Tarih / konum
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

   Health / debug için kullanılabilir.
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


  /* -------------------------------------------------------
     Resmî kaynak
     ------------------------------------------------------- */

  if (
    registrySource?.verified ===
    true
  ) {

    score +=
      35;

  }


  /* -------------------------------------------------------
     Kaynak URL
     ------------------------------------------------------- */

  if (
    item.url
  ) {

    score +=
      10;

  }


  /* -------------------------------------------------------
     Başlık
     ------------------------------------------------------- */

  if (
    item.title ||
    item.originalTitle
  ) {

    score +=
      5;

  }


  /* -------------------------------------------------------
     Tarih
     ------------------------------------------------------- */

  if (
    item.date ||
    item.timestamp
  ) {

    score +=
      5;

  }


  /* -------------------------------------------------------
     Görsel
     ------------------------------------------------------- */

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

   Farklı URL'deki aynı içeriği yakalamaya yardımcı olur.
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
   ========================================================= */

function getPostTimestamp(
  post
) {

  const candidates = [

    post?.lifecycle?.publishedAt,

    post?.lifecycle?.updatedAt,

    post?.lifecycle?.firstSeenAt,

    post?.source?.publishedAt

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


  const direct =
    Date.parse(
      value
    );


  if (
    Number.isFinite(
      direct
    )
  ) {

    return direct;

  }


  /* -------------------------------------------------------
     dd.mm.yyyy
     ------------------------------------------------------- */

  const match =
    String(
      value
    )
      .match(
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


  return 0;

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
