/* =========================================================
   SporNRD Worker
   v6.0.2
   TYF + TBF
   GitHub düz dosya yapısı
   ========================================================= */

import {
  getTyfFeed
} from "./tyf.js";

import {
  getTbfFeed
} from "./tbf.js";

import {
  recordFeedback
} from "./feedbackEngine.js";

import {
  readLearningState
} from "./learningStore.js";

import {
  CORS,
  json
} from "./response.js";


const VERSION = "6.0.3";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 30;


/* =========================================================
   KAYNAKLAR
   ========================================================= */

const SOURCES = {

  tyf: {
    id: "tyf",
    name: "Türkiye Yüzme Federasyonu",
    shortName: "TYF",
    sport: "Yüzme",
    sourceType: "FEDERASYON",
    verified: true,
    enabled: true,
    endpoint: "/api/tyf",
    getFeed: getTyfFeed
  },

  tbf: {
    id: "tbf",
    name: "Türkiye Basketbol Federasyonu",
    shortName: "TBF",
    sport: "Basketbol",
    sourceType: "FEDERASYON",
    verified: true,
    enabled: true,
    endpoint: "/api/tbf",
    getFeed: getTbfFeed
  }

};


/* =========================================================
   WORKER
   ========================================================= */

export default {

  async fetch(request, env) {

    /* -----------------------------------------------------
       CORS
       ----------------------------------------------------- */

    if (request.method === "OPTIONS") {

      return new Response(null, {
        status: 204,
        headers: CORS
      });

    }


    const url = new URL(request.url);

    const path = normalizePath(
      url.pathname
    );


    /* -----------------------------------------------------
       ANA DURUM
       ----------------------------------------------------- */

    if (
      path === "/" &&
      request.method === "GET"
    ) {

      const activeSources =
        getActiveSources();

      return json({

        ok: true,

        service:
          "SporNRD Akıllı Spor Editörü",

        status:
          "running",

        version:
          VERSION,

        architecture:
          "multi-source",

        activeSourceCount:
          activeSources.length,

        activeSources:
          activeSources.map(source => ({

            id:
              source.id,

            name:
              source.name,

            shortName:
              source.shortName,

            sport:
              source.sport,

            verified:
              source.verified

          })),

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


    /* -----------------------------------------------------
       HEALTH
       ----------------------------------------------------- */

    if (
      path === "/api/health" &&
      request.method === "GET"
    ) {

      return json({

        ok: true,

        status:
          "healthy",

        version:
          VERSION,

        timestamp:
          new Date().toISOString(),

        activeSourceCount:
          getActiveSources().length

      });

    }


    /* -----------------------------------------------------
       KAYNAK LİSTESİ
       ----------------------------------------------------- */

    if (
      path === "/api/sources" &&
      request.method === "GET"
    ) {

      const sources =
        getActiveSources()
          .map(source => ({

            id:
              source.id,

            name:
              source.name,

            shortName:
              source.shortName,

            sport:
              source.sport,

            sourceType:
              source.sourceType,

            verified:
              source.verified,

            endpoint:
              source.endpoint

          }));


      return json({

        ok: true,

        count:
          sources.length,

        sources:
          sources

      });

    }


    /* -----------------------------------------------------
       BİRLEŞİK AKIŞ
       TYF + TBF
       ----------------------------------------------------- */

    if (
      path === "/api/feed" &&
      request.method === "GET"
    ) {

      try {

        const limit =
          getLimit(url);


        const requestedSources =
          getRequestedSources(url);


        const result =
          await createUnifiedFeed({

            env,
            limit,
            requestedSources

          });


        return json({

          ok: true,

          type:
            "SPORNRD_FEED",

          version:
            VERSION,

          fetchedAt:
            new Date().toISOString(),

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

        });

      }

      catch (error) {

        return json(
          {

            ok: false,

            error:
              "SporNRD akışı oluşturulamadı.",

            detail:
              getErrorMessage(error)

          },
          502
        );

      }

    }


    /* -----------------------------------------------------
       TEK FEDERASYON
       /api/tyf
       /api/tbf
       ----------------------------------------------------- */

    const source =
      findSourceByEndpoint(path);


    if (
      source &&
      request.method === "GET"
    ) {

      return handleSingleSource({

        source,
        url,
        env

      });

    }


    /* -----------------------------------------------------
       FEEDBACK
       ----------------------------------------------------- */

    if (
      path === "/api/feedback" &&
      request.method === "POST"
    ) {

      try {

        const payload =
          await request.json();


        if (
          !payload ||
          !payload.action
        ) {

          throw new Error(
            "Feedback action alanı gerekli."
          );

        }


        const result =
          await recordFeedback(
            env,
            payload
          );


        return json({

          ok: true,

          persisted:
            Boolean(
              result &&
              result.persisted
            ),

          mode:
            result &&
            result.persisted
              ? "global-kv"
              : "local-fallback"

        });

      }

      catch (error) {

        return json(
          {

            ok: false,

            error:
              "Feedback işlenemedi.",

            detail:
              getErrorMessage(error)

          },
          400
        );

      }

    }


    /* -----------------------------------------------------
       ÖĞRENME DURUMU
       ----------------------------------------------------- */

    if (
      path === "/api/learning" &&
      request.method === "GET"
    ) {

      try {

        const learning =
          await readLearningState(env);


        return json({

          ok: true,

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

            ok: false,

            error:
              "Öğrenme durumu okunamadı.",

            detail:
              getErrorMessage(error)

          },
          500
        );

      }

    }


    /* -----------------------------------------------------
       ENDPOINT YOK
       ----------------------------------------------------- */

    return json(
      {

        ok: false,

        error:
          "Endpoint bulunamadı",

        path:
          path,

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
   TEK KAYNAK
   ========================================================= */

async function handleSingleSource({
  source,
  url,
  env
}) {

  try {

    const limit =
      getLimit(url);


    const feed =
      await source.getFeed({

        limit,
        env

      });


    const items =
      Array.isArray(
        feed &&
        feed.items
      )
        ? feed.items
        : [];


    return json({

      ok: true,

      version:
        VERSION,

      source:
        feed.source ||
        createSourceInfo(source),

      fetchedAt:
        new Date().toISOString(),

      count:
        items.length,

      items:
        items

    });

  }

  catch (error) {

    return json(
      {

        ok: false,

        source: {

          id:
            source.id,

          name:
            source.name

        },

        error:
          source.shortName +
          " verileri alınamadı.",

        detail:
          getErrorMessage(error)

      },
      502
    );

  }

}


/* =========================================================
   BİRLEŞİK AKIŞ
   ========================================================= */

async function createUnifiedFeed({
  env,
  limit,
  requestedSources
}) {

  let sources =
    getActiveSources();


  if (
    requestedSources.length
  ) {

    const requested =
      new Set(
        requestedSources
      );


    sources =
      sources.filter(
        source =>
          requested.has(
            source.id
          )
      );

  }


  const results =
    await Promise.allSettled(

      sources.map(
        async source => {

          const feed =
            await source.getFeed({

              limit:
                MAX_LIMIT,

              env

            });


          return {
            source,
            feed
          };

        }
      )

    );


  const items = [];
  const successfulSources = [];
  const errors = [];


  for (
    let i = 0;
    i < results.length;
    i++
  ) {

    const result =
      results[i];

    const source =
      sources[i];


    if (
      result.status ===
      "fulfilled"
    ) {

      const feed =
        result.value.feed;


      successfulSources.push(
        feed.source ||
        createSourceInfo(source)
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
            normalizeItem(
              item,
              source
            )
          );

        }

      }

    }

    else {

      errors.push({

        sourceId:
          source.id,

        source:
          source.name,

        error:
          getErrorMessage(
            result.reason
          )

      });

    }

  }


  const uniqueItems =
    removeDuplicates(items);


  uniqueItems.sort(
    sortItems
  );


  return {

    sources:
      successfulSources,

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
   HABERİ ORTAK FORMATA GETİR
   ========================================================= */

function normalizeItem(
  item,
  source
) {

  return {

    ...item,

    sourceId:
      item.sourceId ||
      source.id,

    source:
      item.source ||
      source.name,

    sourceShortName:
      item.sourceShortName ||
      source.shortName,

    sourceType:
      item.sourceType ||
      source.sourceType,

    sport:
      item.sport ||
      source.sport,

    verified:
      typeof item.verified ===
      "boolean"
        ? item.verified
        : source.verified

  };

}


/* =========================================================
   TEKRAR TEMİZLE
   ========================================================= */

function removeDuplicates(
  items
) {

  const output = [];

  const ids = new Set();
  const urls = new Set();
  const titles = new Set();


  for (
    const item
    of items
  ) {

    const id =
      String(
        item.id ||
        item.externalId ||
        ""
      ).trim();


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
      ids.has(id)
    ) {

      continue;

    }


    if (
      url &&
      urls.has(url)
    ) {

      continue;

    }


    if (
      title &&
      titles.has(title)
    ) {

      continue;

    }


    if (id) {
      ids.add(id);
    }


    if (url) {
      urls.add(url);
    }


    if (title) {
      titles.add(title);
    }


    output.push(item);

  }


  return output;

}


/* =========================================================
   SIRALA
   ========================================================= */

function sortItems(
  a,
  b
) {

  const scoreA =
    getScore(a);

  const scoreB =
    getScore(b);


  if (
    scoreA !== scoreB
  ) {

    return scoreB - scoreA;

  }


  return (
    Number(
      b.timestamp || 0
    )
    -
    Number(
      a.timestamp || 0
    )
  );

}


/* =========================================================
   PUAN
   ========================================================= */

function getScore(
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


  return (
    Number(
      item.relevanceScore || 0
    ) *
    10
    +
    Number(
      item.qualityScore || 0
    )
  );

}


/* =========================================================
   AKTİF KAYNAKLAR
   ========================================================= */

function getActiveSources() {

  return Object
    .values(SOURCES)
    .filter(
      source =>
        source.enabled === true &&
        typeof source.getFeed ===
        "function"
    );

}


/* =========================================================
   ENDPOINT'TEN KAYNAK BUL
   ========================================================= */

function findSourceByEndpoint(
  path
) {

  return (
    getActiveSources()
      .find(
        source =>
          source.endpoint === path
      )
    ||
    null
  );

}


/* =========================================================
   KAYNAK BİLGİSİ
   ========================================================= */

function createSourceInfo(
  source
) {

  return {

    id:
      source.id,

    name:
      source.name,

    shortName:
      source.shortName,

    sport:
      source.sport,

    sourceType:
      source.sourceType,

    verified:
      source.verified

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
      ) ||
      String(
        DEFAULT_LIMIT
      ),
      10
    );


  if (
    !Number.isFinite(limit)
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

   /api/feed?sources=tyf,tbf
   ========================================================= */

function getRequestedSources(
  url
) {

  const raw =
    String(
      url.searchParams.get(
        "sources"
      ) ||
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
        .split(",")
        .map(
          value =>
            value
              .trim()
              .toLowerCase()
        )
        .filter(Boolean)

    )

  ];

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
    ).trim();


  if (
    !path.startsWith("/")
  ) {

    path =
      "/" + path;

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


  return path || "/";

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

function getErrorMessage(
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


