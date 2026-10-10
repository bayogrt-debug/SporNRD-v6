/* =========================================================
   SporNRD
   worker/worker.js

   Üretim Sürümü: 6.0.4
   Core Preview: 6.1.0

   Mimari:
   Multi Source Modular + v6.1 Preview Pipeline

   AKTİF KAYNAKLAR
   ---------------------------------------------------------
   1. Türkiye Yüzme Federasyonu
   2. Türkiye Basketbol Federasyonu

   ENDPOINTLER
   ---------------------------------------------------------
   /
   /api/health
   /api/core-test
   /api/feed-preview
   /api/sources
   /api/feed
   /api/tyf
   /api/tbf
   /api/feedback
   /api/learning

   ÖNEMLİ
   ---------------------------------------------------------
   /api/feed
   halen çalışan güvenli 6.0.4 akışıdır.

   /api/feed-preview
   gerçek TYF + TBF verisini yeni v6.1 çekirdeğinden geçirir.

   Telefon uygulaması henüz preview endpointine bağlı değildir.
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
  runCoreTest
} from "./core/coreTest.js";


import {
  buildFeedPreview
} from "./core/feedPreview.js";


import {
  CORS,
  json
} from "./utils/response.js";


/* =========================================================
   SİSTEM
   ========================================================= */

const VERSION =
  "6.0.4";


const CORE_PREVIEW_VERSION =
  "6.1.0";


const SERVICE_NAME =
  "SporNRD Öğrenen Spor Editörü";


const DEFAULT_LIMIT =
  20;


const MAX_LIMIT =
  30;


/* =========================================================
   KAYNAK KAYIT MERKEZİ

   Geçiş döneminde mevcut çalışan registry korunuyor.

   v6.1 sourceRegistry.js ayrıca hazır ve
   preview/test sistemi tarafından kullanılıyor.
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
          SERVICE_NAME,

        status:
          "running",

        version:
          VERSION,

        corePreview:
          CORE_PREVIEW_VERSION,

        architecture:
          "multi-source-modular",

        activeSourceCount:
          providers.length,

        activeSources:
          providers.map(
            provider =>
              createSourceInfo(
                provider
              )
          ),

        learning:
          hasLearningKv(
            env
          )
            ? "global-kv"
            : "local-fallback",

        endpoints: {

          feed:
            "/api/feed?limit=20",

          feedPreview:
            "/api/feed-preview?limit=20",

          coreTest:
            "/api/core-test",

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
          SERVICE_NAME,

        version:
          VERSION,

        corePreview:
          CORE_PREVIEW_VERSION,

        architecture:
          "multi-source-modular",

        previewPipeline:
          true,

        timestamp:
          new Date()
            .toISOString(),

        activeSourceCount:
          getActiveProviders()
            .length,

        learning:
          hasLearningKv(
            env
          )
            ? "global-kv"
            : "local-fallback"

      });

    }


    /* =====================================================
       v6.1 CORE TEST
       ===================================================== */

    if (
      pathname === "/api/core-test" &&
      request.method === "GET"
    ) {

      try {

        const result =
          runCoreTest();


        return json(
          {

            ...result,

            productionVersion:
              VERSION,

            targetVersion:
              CORE_PREVIEW_VERSION

          },

          result?.ok === true
            ? 200
            : 500

        );

      }

      catch (
        error
      ) {

        return json(
          {

            ok:
              false,

            service:
              "SporNRD Core Test",

            productionVersion:
              VERSION,

            targetVersion:
              CORE_PREVIEW_VERSION,

            error:
              "SporNRD v6.1 Core Test çalıştırılamadı.",

            detail:
              errorMessage(
                error
              ),

            testedAt:
              new Date()
                .toISOString()

          },

          500

        );

      }

    }


    /* =====================================================
       v6.1 GERÇEK FEED PREVIEW

       Gerçek TYF + TBF
              ↓
       Normalizer
              ↓
       Discovery
              ↓
       Lifecycle
              ↓
       Persona
              ↓
       v6.1 Preview Posts

       Örnek:
       /api/feed-preview?limit=10

       Belirli kaynak:
       /api/feed-preview?sources=tyf

       Birden fazla:
       /api/feed-preview?sources=tyf,tbf&limit=20
       ===================================================== */

    if (
      pathname === "/api/feed-preview" &&
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
          await buildFeedPreview({

            providers:
              getActiveProviders(),

            env:
              env,

            limit:
              limit,

            requestedSources:
              requestedSources

          });


        return json(
          {

            ...result,

            productionVersion:
              VERSION,

            targetVersion:
              CORE_PREVIEW_VERSION

          },

          200

        );

      }

      catch (
        error
      ) {

        return json(
          {

            ok:
              false,

            type:
              "SPORNRD_FEED_PREVIEW",

            productionVersion:
              VERSION,

            targetVersion:
              CORE_PREVIEW_VERSION,

            error:
              "SporNRD v6.1 preview akışı oluşturulamadı.",

            detail:
              errorMessage(
                error
              ),

            fetchedAt:
              new Date()
                .toISOString()

          },

          500

        );

      }

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

              ...createSourceInfo(
                provider
              ),

              enabled:
                provider.enabled,

              endpoint:
                provider.endpoint

            })
          );


      return json({

        ok:
          true,

        version:
          VERSION,

        count:
          sources.length,

        sources:
          sources

      });

    }


    /* =====================================================
       BİRLEŞİK SPORNRD ÜRETİM AKIŞI

       BU ENDPOINT HÂLÂ 6.0.4
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

            requestedSources:
              requestedSources,

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

      catch (
        error
      ) {

        return json(
          {

            ok:
              false,

            version:
              VERSION,

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

          version:
            VERSION,

          persisted:
            Boolean(
              result?.persisted
            ),

          mode:
            result?.persisted
              ? "global-kv"
              : "local-fallback",

          feedback: {

            action:
              result?.action ||
              payload.action,

            category:
              result?.category ||
              payload.category ||
              "announcement",

            source:
              result?.source ||
              payload.sourceId ||
              payload.source ||
              "unknown"

          },

          receivedAt:
            new Date()
              .toISOString()

        });

      }

      catch (
        error
      ) {

        return json(
          {

            ok:
              false,

            version:
              VERSION,

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
       ÖĞRENME DURUMU
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
            hasLearningKv(
              env
            )
              ? "global-kv"
              : "local-fallback",

          learning:
            learning

        });

      }

      catch (
        error
      ) {

        return json(
          {

            ok:
              false,

            version:
              VERSION,

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

          version:
            VERSION,

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

        version:
          VERSION,

        error:
          "Endpoint bulunamadı.",

        path:
          pathname,

        availableEndpoints: [

          "/",

          "/api/health",

          "/api/core-test",

          "/api/feed-preview?limit=20",

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


    if (
      !feed ||
      typeof feed !==
      "object"
    ) {

      throw new Error(
        `${provider.shortName} geçerli bir feed döndürmedi.`
      );

    }


    const items =
      Array.isArray(
        feed.items
      )
        ? feed.items
            .filter(
              item =>
                item &&
                typeof item ===
                "object"
            )
            .map(
              item =>
                normalizeFeedItem(
                  item,
                  provider
                )
            )
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

  catch (
    error
  ) {

    return json(
      {

        ok:
          false,

        version:
          VERSION,

        source:
          createSourceInfo(
            provider
          ),

        error:
          `${provider.shortName} verileri alınamadı.`,

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
   BİRLEŞİK ÜRETİM AKIŞI
   ========================================================= */

async function buildUnifiedFeed({

  env,
  limit,
  requestedSources

}) {

  let providers =
    getActiveProviders();


  /* -------------------------------------------------------
     Belirli kaynaklar istenmişse filtrele
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


  /* -------------------------------------------------------
     Geçerli kaynak yok
     ------------------------------------------------------- */

  if (
    !providers.length
  ) {

    return {

      sources:
        [],

      items:
        [],

      errors:
        requestedSources.length

          ? [
              {

                sourceId:
                  null,

                source:
                  null,

                error:
                  "İstenen aktif kaynak bulunamadı."

              }
            ]

          : []

    };

  }


  /* -------------------------------------------------------
     Kaynakları paralel oku
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


          if (
            !feed ||
            typeof feed !==
            "object"
          ) {

            throw new Error(
              `${provider.shortName} geçerli feed döndürmedi.`
            );

          }


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


  /* -------------------------------------------------------
     Sonuçları birleştir
     ------------------------------------------------------- */

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


      const providerItems =
        Array.isArray(
          feed.items
        )
          ? feed.items
          : [];


      for (
        const item
        of providerItems
      ) {

        if (
          !item ||
          typeof item !==
          "object"
        ) {

          continue;

        }


        items.push(
          normalizeFeedItem(
            item,
            provider
          )
        );

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
     Kaynaklar arası tekrarları temizle
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
      normalizeSourceId(
        item.sourceId ||
        provider.id
      ),


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
        item?.id ||
        item?.externalId ||
        ""
      )
        .trim();


    const url =
      normalizeUrl(
        item?.url
      );


    const title =
      normalizeTitle(
        item?.originalTitle ||
        item?.title
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
    safeNumber(
      b?.timestamp
    )
    -
    safeNumber(
      a?.timestamp
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
      item?.finalScore
    );


  if (
    Number.isFinite(
      finalScore
    )
  ) {

    return finalScore;

  }


  const relevance =
    safeNumber(
      item?.relevanceScore
    );


  const quality =
    safeNumber(
      item?.qualityScore
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
          normalizeSourceId
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
    "object" ||
    Array.isArray(
      payload
    )
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

    /* Eski sürüm uyumluluğu */

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
      .toLocaleLowerCase(
        "tr-TR"
      );


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


  if (
    payload.sourceId
  ) {

    payload.sourceId =
      normalizeSourceId(
        payload.sourceId
      );

  }


  if (
    payload.category
  ) {

    payload.category =
      String(
        payload.category
      )
        .trim()
        .toLocaleLowerCase(
          "tr-TR"
        );

  }

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
    "/api/feed-preview" ||

    pathname ===
    "/api/sources" ||

    pathname ===
    "/api/health" ||

    pathname ===
    "/api/core-test" ||

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
   SOURCE ID NORMALİZE
   ========================================================= */

function normalizeSourceId(
  value
) {

  return String(
    value ||
    ""
  )
    .trim()
    .toLocaleLowerCase(
      "tr-TR"
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
   URL NORMALİZE
   ========================================================= */

function normalizeUrl(
  value
) {

  const text =
    String(
      value ||
      ""
    )
      .trim();


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
   LEARNING KV VAR MI?
   ========================================================= */

function hasLearningKv(
  env
) {

  return Boolean(

    env?.SPORNRD_LEARNING &&

    typeof env.SPORNRD_LEARNING.get ===
    "function" &&

    typeof env.SPORNRD_LEARNING.put ===
    "function"

  );

}


/* =========================================================
   GÜVENLİ SAYI
   ========================================================= */

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
