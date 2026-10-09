/* =========================================================
   SporNRD
   worker/worker.js

   Sürüm: 6.0.2
   Mimari: Multi Source Modular

   AKTİF KAYNAKLAR
   ---------------------------------------------------------
   1. Türkiye Yüzme Federasyonu
   2. Türkiye Basketbol Federasyonu

   ENDPOINTLER
   ---------------------------------------------------------
   /
   /api/health
   /api/sources
   /api/feed
   /api/tyf
   /api/tbf
   /api/feedback
   /api/learning
   ========================================================= */


import {
  getTyfFeed
} from "./sources/tyf.js";


import {
  getTbfFeed
} from "./sources/tbf.js";


import {
  recordFeedback
} from "./learning/feedbackEngine.js";


import {
  readLearningState
} from "./learning/learningStore.js";


import {
  CORS,
  json
} from "./utils/response.js";


/* =========================================================
   SİSTEM
   ========================================================= */

const VERSION =
  "6.0.2";


const DEFAULT_LIMIT =
  20;


const MAX_LIMIT =
  30;


/* =========================================================
   KAYNAK KAYIT MERKEZİ
   ========================================================= */

const SOURCE_PROVIDERS = {

  /* -------------------------------------------------------
     TÜRKİYE YÜZME FEDERASYONU
     ------------------------------------------------------- */

  tyf: {

    id:
      "tyf",

    name:
      "Türkiye Yüzme Federasyonu",

    shortName:
      "TYF",

    sport:
      "Yüzme",

    sourceType:
      "FEDERASYON",

    verified:
      true,

    enabled:
      true,

    endpoint:
      "/api/tyf",

    getFeed:
      getTyfFeed

  },


  /* -------------------------------------------------------
     TÜRKİYE BASKETBOL FEDERASYONU
     ------------------------------------------------------- */

  tbf: {

    id:
      "tbf",

    name:
      "Türkiye Basketbol Federasyonu",

    shortName:
      "TBF",

    sport:
      "Basketbol",

    sourceType:
      "FEDERASYON",

    verified:
      true,

    enabled:
      true,

    endpoint:
      "/api/tbf",

    getFeed:
      getTbfFeed

  }

};


/* =========================================================
   WORKER
   ========================================================= */

export default {

  async fetch(
    request,
    env
  ) {

    /* =====================================================
       CORS
       ===================================================== */

    if (
      request.method ===
      "OPTIONS"
    ) {

      return new Response(
        null,
        {

          status:
            204,

          headers:
            CORS

        }
      );

    }


    const url =
      new URL(
        request.url
      );


    const pathname =
      normalizePath(
        url.pathname
      );


    /* =====================================================
       ANA SERVİS
       ===================================================== */

    if (
      pathname === "/" &&
      request.method === "GET"
    ) {

      const providers =
        getActiveProviders();


      return json({

        ok:
          true,

        service:
          "SporNRD Öğrenen Spor Editörü",

        status:
          "running",

        version:
          VERSION,

        architecture:
          "multi-source-modular",

        activeSourceCount:
          providers.length,

        activeSources:
          providers.map(
            provider => ({

              id:
                provider.id,

              name:
                provider.name,

              shortName:
                provider.shortName,

              sport:
                provider.sport,

              verified:
                provider.verified

            })
          ),

        learning:

          env &&
          env.SPORNRD_LEARNING

            ? "global-kv"

            : "local-fallback",

        endpoints: {

          feed:
            "/api/feed?limit=20",

          sources:
            "/api/sources",

          tyf:
            "/api/tyf?limit=10",

          tbf:
            "/api/tbf?limit=10",

          feedback:
            "/api/feedback",

          learning:
            "/api/learning",

          health:
            "/api/health"

        }

      });

    }


    /* =====================================================
       HEALTH
       ===================================================== */

    if (
      pathname === "/api/health" &&
      request.method === "GET"
    ) {

      return json({

        ok:
          true,

        status:
          "healthy",

        service:
          "SporNRD",

        version:
          VERSION,

        timestamp:
          new Date()
            .toISOString(),

        activeSourceCount:
          getActiveProviders()
            .length

      });

    }


    /* =====================================================
       KAYNAKLAR
       ===================================================== */

    if (
      pathname === "/api/sources" &&
      request.method === "GET"
    ) {

      const sources =
        getActiveProviders()
          .map(
            provider => ({

              id:
                provider.id,

              name:
                provider.name,

              shortName:
                provider.shortName,

              sport:
                provider.sport,

              sourceType:
                provider.sourceType,

              verified:
                provider.verified,

              enabled:
                provider.enabled,

              endpoint:
                provider.endpoint

            })
          );


      return json({

        ok:
          true,

        count:
          sources.length,

        sources:
          sources

      });

    }


    /* =====================================================
       BİRLEŞİK SPORNRD AKIŞI

       TYF + TBF
       ===================================================== */

    if (
      pathname === "/api/feed" &&
      request.method === "GET"
    ) {

      try {

        const limit =
          getLimit(
            url
          );


        const requestedSources =
          parseRequestedSources(
            url
          );


        const result =
          await buildUnifiedFeed({

            env:
              env,

            limit:
              limit,

            requestedSources:
              requestedSources

          });


        return json(
          {

            ok:
              true,

            type:
              "SPORNRD_FEED",

            version:
              VERSION,

            fetchedAt:
              new Date()
                .toISOString(),

            sourceCount:
              result.sources.length,

            sources:
              result.sources,

            count:
              result.items.length,

            items:
              result.items,

            errors:
              result.errors

          },

          200,

          120

        );

      }

      catch (error) {

        return json(
          {

            ok:
              false,

            error:
              "SporNRD birleşik akışı oluşturulamadı.",

            detail:
              errorMessage(
                error
              )

          },

          502

        );

      }

    }


    /* =====================================================
       TEK FEDERASYON ENDPOINTİ

       /api/tyf
       /api/tbf
       ===================================================== */

    const provider =
      findProviderByEndpoint(
        pathname
      );


    if (
      provider &&
      request.method === "GET"
    ) {

      return handleProviderFeed({

        provider:
          provider,

        url:
          url,

        env:
          env

      });

    }


    /* =====================================================
       FEEDBACK
       ===================================================== */

    if (
      pathname === "/api/feedback" &&
      request.method === "POST"
    ) {

      try {

        const payload =
          await readJsonBody(
            request
          );


        validateFeedback(
          payload
        );


        const result =
          await recordFeedback(
            env,
            payload
          );


        return json({

          ok:
            true,

          persisted:
            Boolean(
              result &&
              result.persisted
            ),

          mode:

            result &&
            result.persisted

              ? "global-kv"

              : "local-fallback",

          receivedAt:
            new Date()
              .toISOString()

        });

      }

      catch (error) {

        return json(
          {

            ok:
              false,

            error:
              "Feedback işlenemedi.",

            detail:
              errorMessage(
                error
              )

          },

          400

        );

      }

    }


    /* =====================================================
       ÖĞRENME
       ===================================================== */

    if (
      pathname === "/api/learning" &&
      request.method === "GET"
    ) {

      try {

        const learning =
          await readLearningState(
            env
          );


        return json({

          ok:
            true,

          version:
            VERSION,

          mode:

            env &&
            env.SPORNRD_LEARNING

              ? "global-kv"

              : "local-fallback",

          learning:
            learning

        });

      }

      catch (error) {

        return json(
          {

            ok:
              false,

            error:
              "Öğrenme durumu okunamadı.",

            detail:
              errorMessage(
                error
              )

          },

          500

        );

      }

    }


    /* =====================================================
       BİLİNEN ENDPOINT / YANLIŞ METHOD
       ===================================================== */

    if (
      isKnownPath(
        pathname
      )
    ) {

      return json(
        {

          ok:
            false,

          error:
            "Bu endpoint için HTTP yöntemi desteklenmiyor.",

          method:
            request.method,

          path:
            pathname

        },

        405

      );

    }


    /* =====================================================
       404
       ===================================================== */

    return json(
      {

        ok:
          false,

        error:
          "Endpoint bulunamadı.",

        path:
          pathname,

        availableEndpoints: [

          "/",

          "/api/health",

          "/api/sources",

          "/api/feed?limit=20",

          "/api/tyf?limit=10",

          "/api/tbf?limit=10",

          "/api/feedback",

          "/api/learning"

        ]

      },

      404

    );

  }

};


/* =========================================================
   TEK FEDERASYON AKIŞI
   ========================================================= */

async function handleProviderFeed({

  provider,
  url,
  env

}) {

  try {

    const limit =
      getLimit(
        url
      );


    const feed =
      await provider.getFeed({

        limit:
          limit,

        env:
          env

      });


    const items =
      Array.isArray(
        feed &&
        feed.items
      )

        ? feed.items

        : [];


    return json(
      {

        ok:
          true,

        version:
          VERSION,

        source:
          feed.source ||
          createSourceInfo(
            provider
          ),

        fetchedAt:
          new Date()
            .toISOString(),

        count:
          items.length,

        items:
          items

      },

      200,

      180

    );

  }

  catch (error) {

    return json(
      {

        ok:
          false,

        source: {

          id:
            provider.id,

          name:
            provider.name

        },

        error:
          provider.shortName +
          " verileri alınamadı.",

        detail:
          errorMessage(
            error
          )

      },

      502

    );

  }

}


/* =========================================================
   BİRLEŞİK AKIŞ
   ========================================================= */

async function buildUnifiedFeed({

  env,
  limit,
  requestedSources

}) {

  let providers =
    getActiveProviders();


  /* -------------------------------------------------------
     Örnek:
     /api/feed?sources=tyf,tbf
     ------------------------------------------------------- */

  if (
    requestedSources.length
  ) {

    const requested =
      new Set(
        requestedSources
      );


    providers =
      providers.filter(
        provider =>
          requested.has(
            provider.id
          )
      );

  }


  if (
    !providers.length
  ) {

    return {

      sources:
        [],

      items:
        [],

      errors:
        []

    };

  }


  /* -------------------------------------------------------
     Kaynakları paralel oku.
     TBF hata verirse TYF devam eder.
     TYF hata verirse TBF devam eder.
     ------------------------------------------------------- */

  const results =
    await Promise.allSettled(

      providers.map(

        async provider => {

          const feed =
            await provider.getFeed({

              limit:
                MAX_LIMIT,

              env:
                env

            });


          return {

            provider:
              provider,

            feed:
              feed

          };

        }

      )

    );


  const items =
    [];


  const sources =
    [];


  const errors =
    [];


  for (
    let index = 0;
    index < results.length;
    index++
  ) {

    const result =
      results[
        index
      ];


    const provider =
      providers[
        index
      ];


    if (
      result.status ===
      "fulfilled"
    ) {

      const feed =
        result.value.feed;


      sources.push(
        feed.source ||
        createSourceInfo(
          provider
        )
      );


      if (
        Array.isArray(
          feed.items
        )
      ) {

        for (
          const item
          of feed.items
        ) {

          items.push(

            normalizeFeedItem(
              item,
              provider
            )

          );

        }

      }

    }

    else {

      errors.push({

        sourceId:
          provider.id,

        source:
          provider.name,

        error:
          errorMessage(
            result.reason
          )

      });

    }

  }


  /* -------------------------------------------------------
     Tekrarları temizle
     ------------------------------------------------------- */

  const uniqueItems =
    dedupeUnifiedItems(
      items
    );


  /* -------------------------------------------------------
     Puan + tarihe göre sırala
     ------------------------------------------------------- */

  uniqueItems.sort(
    compareFeedItems
  );


  return {

    sources:
      sources,

    items:
      uniqueItems.slice(
        0,
        limit
      ),

    errors:
      errors

  };

}


/* =========================================================
   ORTAK HABER MODELİ
   ========================================================= */

function normalizeFeedItem(
  item,
  provider
) {

  return {

    ...item,


    sourceId:

      item.sourceId ||
      provider.id,


    source:

      item.source ||
      provider.name,


    sourceShortName:

      item.sourceShortName ||
      provider.shortName,


    sourceType:

      item.sourceType ||
      provider.sourceType,


    sport:

      item.sport ||
      provider.sport,


    verified:

      typeof item.verified ===
      "boolean"

        ? item.verified

        : provider.verified

  };

}


/* =========================================================
   KAYNAKLAR ARASI TEKRAR
   ========================================================= */

function dedupeUnifiedItems(
  items
) {

  const output =
    [];


  const usedIds =
    new Set();


  const usedUrls =
    new Set();


  const usedTitles =
    new Set();


  for (
    const item
    of items
  ) {

    const id =
      String(
        item.id ||
        item.externalId ||
        ""
      )
        .trim();


    const url =
      String(
        item.url ||
        ""
      )
        .trim()
        .toLowerCase();


    const title =
      normalizeTitle(
        item.originalTitle ||
        item.title
      );


    if (
      id &&
      usedIds.has(
        id
      )
    ) {

      continue;

    }


    if (
      url &&
      usedUrls.has(
        url
      )
    ) {

      continue;

    }


    if (
      title &&
      usedTitles.has(
        title
      )
    ) {

      continue;

    }


    if (
      id
    ) {

      usedIds.add(
        id
      );

    }


    if (
      url
    ) {

      usedUrls.add(
        url
      );

    }


    if (
      title
    ) {

      usedTitles.add(
        title
      );

    }


    output.push(
      item
    );

  }


  return output;

}


/* =========================================================
   AKIŞ SIRALAMASI
   ========================================================= */

function compareFeedItems(
  a,
  b
) {

  const scoreA =
    getItemScore(
      a
    );


  const scoreB =
    getItemScore(
      b
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


  return (

    Number(
      b.timestamp ||
      0
    )

    -

    Number(
      a.timestamp ||
      0
    )

  );

}


/* =========================================================
   PUAN
   ========================================================= */

function getItemScore(
  item
) {

  const finalScore =
    Number(
      item.finalScore
    );


  if (
    Number.isFinite(
      finalScore
    )
  ) {

    return finalScore;

  }


  const relevance =
    Number(
      item.relevanceScore ||
      0
    );


  const quality =
    Number(
      item.qualityScore ||
      0
    );


  return (
    relevance *
    10
    +
    quality
  );

}


/* =========================================================
   ENDPOINT → PROVIDER
   ========================================================= */

function findProviderByEndpoint(
  pathname
) {

  return (
    getActiveProviders()
      .find(
        provider =>
          normalizePath(
            provider.endpoint
          ) ===
          pathname
      )
    ||
    null
  );

}


/* =========================================================
   AKTİF KAYNAKLAR
   ========================================================= */

function getActiveProviders() {

  return Object
    .values(
      SOURCE_PROVIDERS
    )
    .filter(

      provider =>

        provider &&

        provider.enabled ===
        true &&

        typeof provider.getFeed ===
        "function"

    );

}


/* =========================================================
   SOURCE INFO
   ========================================================= */

function createSourceInfo(
  provider
) {

  return {

    id:
      provider.id,

    name:
      provider.name,

    shortName:
      provider.shortName,

    sourceType:
      provider.sourceType,

    sport:
      provider.sport,

    verified:
      provider.verified

  };

}


/* =========================================================
   LIMIT
   ========================================================= */

function getLimit(
  url
) {

  let limit =
    parseInt(
      url.searchParams.get(
        "limit"
      )
      ||
      String(
        DEFAULT_LIMIT
      ),
      10
    );


  if (
    !Number.isFinite(
      limit
    )
  ) {

    limit =
      DEFAULT_LIMIT;

  }


  return Math.max(

    1,

    Math.min(
      limit,
      MAX_LIMIT
    )

  );

}


/* =========================================================
   SOURCES PARAMETRESİ
   ========================================================= */

function parseRequestedSources(
  url
) {

  const raw =
    String(

      url.searchParams.get(
        "sources"
      )

      ||

      url.searchParams.get(
        "source"
      )

      ||

      ""

    );


  if (
    !raw.trim()
  ) {

    return [];

  }


  return [

    ...new Set(

      raw
        .split(
          ","
        )
        .map(
          value =>
            value
              .trim()
              .toLowerCase()
        )
        .filter(
          Boolean
        )

    )

  ];

}


/* =========================================================
   JSON BODY
   ========================================================= */

async function readJsonBody(
  request
) {

  const text =
    await request.text();


  if (
    !text
  ) {

    return {};

  }


  try {

    return JSON.parse(
      text
    );

  }

  catch {

    throw new Error(
      "Geçersiz JSON gönderildi."
    );

  }

}


/* =========================================================
   FEEDBACK KONTROLÜ
   ========================================================= */

function validateFeedback(
  payload
) {

  if (
    !payload ||
    typeof payload !==
    "object"
  ) {

    throw new Error(
      "Feedback verisi geçersiz."
    );

  }


  if (
    !payload.action
  ) {

    throw new Error(
      "Feedback action alanı gerekli."
    );

  }


  const allowedActions = [

    "wow",

    "trash",

    "save",

    "share",

    "detail",

    "source",

    "fire",

    "clap",

    "strong",

    "surprised",

    "trophy"

  ];


  const action =
    String(
      payload.action
    )
      .trim()
      .toLowerCase();


  if (
    !allowedActions.includes(
      action
    )
  ) {

    throw new Error(
      "Desteklenmeyen feedback türü."
    );

  }


  payload.action =
    action;

}


/* =========================================================
   BİLİNEN ENDPOINT
   ========================================================= */

function isKnownPath(
  pathname
) {

  if (
    pathname === "/" ||

    pathname ===
    "/api/feed" ||

    pathname ===
    "/api/sources" ||

    pathname ===
    "/api/health" ||

    pathname ===
    "/api/feedback" ||

    pathname ===
    "/api/learning"
  ) {

    return true;

  }


  return Boolean(
    findProviderByEndpoint(
      pathname
    )
  );

}


/* =========================================================
   PATH
   ========================================================= */

function normalizePath(
  value
) {

  let path =
    String(
      value ||
      "/"
    )
      .trim();


  if (
    !path.startsWith(
      "/"
    )
  ) {

    path =
      "/" +
      path;

  }


  if (
    path.length > 1
  ) {

    path =
      path.replace(
        /\/+$/,
        ""
      );

  }


  return (
    path ||
    "/"
  );

}


/* =========================================================
   BAŞLIK NORMALİZE
   ========================================================= */

function normalizeTitle(
  value
) {

  return String(
    value ||
    ""
  )

    .toLocaleLowerCase(
      "tr-TR"
    )

    .replace(
      /[^a-z0-9çğıöşü\s]/gi,
      " "
    )

    .replace(
      /\s+/g,
      " "
    )

    .trim();

}


/* =========================================================
   HATA
   ========================================================= */

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
