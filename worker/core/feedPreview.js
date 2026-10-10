/* =========================================================
   SporNRD
   worker/core/feedPreview.js

   Gerçek Kaynak → v6.1 Preview Pipeline

   Sürüm: 6.1.1-preview

   Amaç:
   ---------------------------------------------------------
   Gerçek TYF / TBF verisini:

   Legacy Feed
        ↓
   Normalizer
        ↓
   Content Intent Engine
        ↓
   Discovery Engine
        ↓
   Lifecycle Engine
        ↓
   Persona Engine
        ↓
   SporNRD v6.1 Post

   zincirinden geçirmek.

   ÖNEMLİ:
   ---------------------------------------------------------
   Bu dosya mevcut /api/feed sistemini değiştirmez.
   Yalnızca /api/feed-preview için kullanılır.
   ========================================================= */


import {

  normalizeLegacyFeed,
  dedupePosts,
  comparePosts,
  createNormalizationSummary

} from "./normalizer.js";


import {

  applyContentIntent,
  CONTENT_INTENT_VERSION

} from "../intelligence/contentIntentEngine.js";


import {

  applyDiscovery

} from "./discoveryEngine.js";


import {

  applyLifecycle,
  filterVisiblePosts,
  createLifecycleSummary

} from "./lifecycle.js";


import {

  applyPersona

} from "../intelligence/personaEngine.js";


/* =========================================================
   VERSION
   ========================================================= */

export const FEED_PREVIEW_VERSION =
  "1.1";


const DEFAULT_LIMIT =
  20;


const MAX_LIMIT =
  30;


/* =========================================================
   ANA PREVIEW PIPELINE
   ========================================================= */

export async function buildFeedPreview({

  providers = [],
  env = null,
  limit = DEFAULT_LIMIT,
  requestedSources = []

} = {}) {

  const startedAt =
    new Date()
      .toISOString();


  const safeLimit =
    normalizeLimit(
      limit
    );


  const requested =
    normalizeRequestedSources(
      requestedSources
    );


  /* =======================================================
     PROVIDER KONTROLÜ
     ========================================================= */

  let activeProviders =
    Array.isArray(
      providers
    )

      ? providers.filter(
          isUsableProvider
        )

      : [];


  /* =======================================================
     SOURCE FİLTRESİ
     ========================================================= */

  if (
    requested.length
  ) {

    const requestedSet =
      new Set(
        requested
      );


    activeProviders =
      activeProviders.filter(
        provider =>
          requestedSet.has(
            normalizeId(
              provider.id
            )
          )
      );

  }


  /* =======================================================
     KAYNAK YOK
     ========================================================= */

  if (
    !activeProviders.length
  ) {

    return {

      ok:
        true,

      type:
        "SPORNRD_FEED_PREVIEW",

      version:
        FEED_PREVIEW_VERSION,

      contentIntentVersion:
        CONTENT_INTENT_VERSION,

      startedAt:
        startedAt,

      finishedAt:
        new Date()
          .toISOString(),

      requestedSources:
        requested,

      sourceCount:
        0,

      sources:
        [],

      rawPostCount:
        0,

      uniquePostCount:
        0,

      visiblePostCount:
        0,

      count:
        0,

      items:
        [],

      errors:
        requested.length

          ? [
              {

                sourceId:
                  "",

                error:
                  "İstenen aktif kaynak bulunamadı."

              }
            ]

          : [],

      summary: {

        normalization:
          createNormalizationSummary(
            []
          ),

        intent:
          createIntentSummary(
            []
          ),

        lifecycle:
          createLifecycleSummary(
            []
          )

      }

    };

  }


  /* =======================================================
     GERÇEK KAYNAKLARI PARALEL OKU
     ========================================================= */

  const results =
    await Promise.allSettled(

      activeProviders.map(

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
              `${provider.shortName || provider.id} geçerli feed döndürmedi.`
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


  /* =======================================================
     SONUÇ HAVUZLARI
     ========================================================= */

  const allPosts =
    [];


  const sources =
    [];


  const errors =
    [];


  /* =======================================================
     HER KAYNAĞI YENİ MOTORLARDAN GEÇİR
     ========================================================= */

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
      activeProviders[
        index
      ];


    /* -------------------------------------------------------
       Kaynak başarısız
       ------------------------------------------------------- */

    if (
      result.status !==
      "fulfilled"
    ) {

      errors.push({

        sourceId:
          provider?.id ||
          "",

        source:
          provider?.name ||
          "",

        stage:
          "source-fetch",

        error:
          errorMessage(
            result.reason
          )

      });


      continue;

    }


    try {

      const feed =
        result.value.feed;


      /* =====================================================
         1. LEGACY → YENİ POST
         ===================================================== */

      const normalized =
        normalizeLegacyFeed(

          feed,

          provider.id

        );


      if (
        normalized.source
      ) {

        sources.push(
          normalized.source
        );

      }


      /* -----------------------------------------------------
         Normalizer uyarıları
         ----------------------------------------------------- */

      if (
        Array.isArray(
          normalized.errors
        )
      ) {

        for (
          const item
          of normalized.errors
        ) {

          errors.push({

            sourceId:
              provider.id,

            source:
              provider.name,

            stage:
              "normalizer",

            ...item

          });

        }

      }


      const normalizedItems =
        Array.isArray(
          normalized.items
        )

          ? normalized.items

          : [];


      /* =====================================================
         2. HER POSTU İŞLE
         ===================================================== */

      for (
        const normalizedPost
        of normalizedItems
      ) {

        try {

          /*
            Legacy postlarda createPost()
            firstSeenAt alanını "şimdi" yapabilir.

            Eski haberleri yanlışlıkla yeni göstermemek için
            yayın tarihi biliniyorsa onu koruyoruz.
          */

          let post =
            stabilizeLegacyLifecycle(
              normalizedPost
            );


          /* =================================================
             CONTENT INTENT

             Önce içeriğin NE ANLATTIĞINI anlamaya çalışır.

             result
             registration
             opportunity
             announcement
             campaign
             job
             product
             news

             Ayrıca:

             upcoming
             ongoing
             completed
             unknown

             durumunu üretir.
             ================================================= */

          post =
            applyContentIntent(
              post
            );


          /* =================================================
             DISCOVERY

             Content Intent kararından SONRA:

             Branş
             Ana kategori
             Alt kategori
             Provider
             Eksik filtre alanları
             ================================================= */

          post =
            applyDiscovery(
              post
            );


          /* =================================================
             LIFECYCLE
             ================================================= */

          post =
            applyLifecycle(
              post
            );


          /* =================================================
             PERSONA

             Şimdilik mevcut persona motoru çalışıyor.

             Bir sonraki aşamada contentIntent/result bilgisini
             kullanarak geçmiş sonuç haberlerinde
             "gidilecek etkinlik" dili üretmesini engelleyeceğiz.
             ================================================= */

          post =
            applyPersona(
              post
            );


          allPosts.push(
            post
          );

        }

        catch (
          error
        ) {

          errors.push({

            sourceId:
              provider.id,

            source:
              provider.name,

            itemId:
              normalizedPost?.id ||
              "",

            stage:
              "post-pipeline",

            error:
              errorMessage(
                error
              )

          });

        }

      }

    }

    catch (
      error
    ) {

      errors.push({

        sourceId:
          provider.id,

        source:
          provider.name,

        stage:
          "source-pipeline",

        error:
          errorMessage(
            error
          )

      });

    }

  }


  /* =======================================================
     TEKRARLARI TEMİZLE
     ========================================================= */

  const uniquePosts =
    dedupePosts(
      allPosts
    );


  /* =======================================================
     SÜRESİ GEÇEN / KALDIRILAN POSTLARI AYIR
     ========================================================= */

  const visiblePosts =
    filterVisiblePosts(
      uniquePosts,
      {

        showExpired:
          false,

        showRemoved:
          false

      }
    );


  /* =======================================================
     SIRALA
     ========================================================= */

  visiblePosts.sort(
    comparePosts
  );


  /* =======================================================
     LIMIT
     ========================================================= */

  const finalItems =
    visiblePosts.slice(
      0,
      safeLimit
    );


  /* =======================================================
     SONUÇ
     ========================================================= */

  return {

    ok:
      true,

    type:
      "SPORNRD_FEED_PREVIEW",

    version:
      FEED_PREVIEW_VERSION,

    contentIntentVersion:
      CONTENT_INTENT_VERSION,

    startedAt:
      startedAt,

    finishedAt:
      new Date()
        .toISOString(),

    requestedSources:
      requested,

    sourceCount:
      uniqueSources(
        sources
      ).length,

    sources:
      uniqueSources(
        sources
      ),

    rawPostCount:
      allPosts.length,

    uniquePostCount:
      uniquePosts.length,

    visiblePostCount:
      visiblePosts.length,

    count:
      finalItems.length,

    items:
      finalItems,

    errors:
      errors,

    summary: {

      normalization:
        createNormalizationSummary(
          uniquePosts
        ),

      intent:
        createIntentSummary(
          uniquePosts
        ),

      lifecycle:
        createLifecycleSummary(
          uniquePosts
        )

    }

  };

}


/* =========================================================
   INTENT SUMMARY

   Preview ekranında motorun genel kararlarını
   kolayca görmemizi sağlar.
   ========================================================= */

function createIntentSummary(
  posts
) {

  const items =
    Array.isArray(
      posts
    )
      ? posts
      : [];


  const intents =
    {};


  const statuses =
    {};


  const treatments =
    {};


  let actionable =
    0;


  let nonActionable =
    0;


  for (
    const post
    of items
  ) {

    incrementCounter(
      intents,
      post?.contentIntent ||
      "unknown"
    );


    incrementCounter(
      statuses,
      post?.eventStatus ||
      "unknown"
    );


    incrementCounter(
      treatments,
      post?.intentMeta?.feedTreatment ||
      "unknown"
    );


    if (
      post?.actionable ===
      true
    ) {

      actionable++;

    }

    else {

      nonActionable++;

    }

  }


  return {

    count:
      items.length,

    intents:
      intents,

    eventStatuses:
      statuses,

    feedTreatments:
      treatments,

    actionable:
      actionable,

    nonActionable:
      nonActionable

  };

}


/* =========================================================
   LEGACY LIFECYCLE DÜZELTME

   Preview'da eski haberlerin her istekte
   yeniden "YENİ" sayılmasını önler.
   ========================================================= */

function stabilizeLegacyLifecycle(
  post
) {

  if (
    !post ||
    typeof post !==
    "object"
  ) {

    return post;

  }


  const lifecycle =
    isPlainObject(
      post.lifecycle
    )

      ? post.lifecycle

      : {};


  const source =
    isPlainObject(
      post.source
    )

      ? post.source

      : {};


  const publishedAt =
    cleanString(

      lifecycle.publishedAt ||

      source.publishedAt

    );


  if (
    !publishedAt
  ) {

    return post;

  }


  return {

    ...post,

    lifecycle: {

      ...lifecycle,

      firstSeenAt:
        publishedAt,

      publishedAt:
        publishedAt

    }

  };

}


/* =========================================================
   PROVIDER GEÇERLİ Mİ?
   ========================================================= */

function isUsableProvider(
  provider
) {

  return Boolean(

    provider &&

    typeof provider ===
    "object" &&

    provider.enabled ===
    true &&

    typeof provider.getFeed ===
    "function"

  );

}


/* =========================================================
   REQUESTED SOURCES
   ========================================================= */

function normalizeRequestedSources(
  value
) {

  if (
    !Array.isArray(
      value
    )
  ) {

    return [];

  }


  return [

    ...new Set(

      value
        .map(
          normalizeId
        )
        .filter(
          Boolean
        )

    )

  ];

}


/* =========================================================
   SOURCE TEKRARLARI
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

    if (
      !source ||
      typeof source !==
      "object"
    ) {

      continue;

    }


    const id =
      normalizeId(
        source.id
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
   LIMIT
   ========================================================= */

function normalizeLimit(
  value
) {

  let limit =
    parseInt(
      value,
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
   COUNTER
   ========================================================= */

function incrementCounter(
  target,
  key
) {

  const safeKey =
    cleanString(
      key ||
      "unknown"
    );


  target[
    safeKey
  ] =
    Number(
      target[
        safeKey
      ] ||
      0
    )
    +
    1;

}


/* =========================================================
   ID NORMALİZE
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
    );

}


/* =========================================================
   STRING
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
