/* =========================================================
   SporNRD
   worker/core/feedPreview.js

   Gerçek Kaynak → v6.1 Preview Pipeline

   Sürüm: 6.1.4-preview

   AMAÇ
   ---------------------------------------------------------
   Gerçek TYF / TBF / diğer kaynak verisini:

   Legacy Feed
        ↓
   Normalizer
        ↓
   Content Intent Engine
        ↓
   Discovery Engine
        ↓
   Temporal Engine
        ↓
   Selection Engine
        ↓
   Dedupe
        ↓
   Lifecycle Engine
        ↓
   Persona Engine
        ↓
   Ranking Engine
        ↓
   SporNRD v6.1 Post

   zincirinden geçirmek.

   =========================================================
   SELECTION ENGINE
   ---------------------------------------------------------
   Kaynakta bulunan her içerik doğrudan kullanıcı akışına
   girmez.

   Selection Engine şu 6 ana ölçütü birlikte değerlendirir:

   - kullanıcı yararı
   - önem / haber değeri
   - fırsat / aksiyon değeri
   - zaman değeri
   - güvenilirlik
   - ilgi değeri

   Ayrıca kategori ve alt kategori bağlamını kullanır.

   Karar:

   selected
   borderline
   rejected

   Varsayılan olarak yalnız "selected" içerikler gerçek
   preview akışına devam eder.

   includeBorderline = true verilirse borderline içerikler de
   test amacıyla akışa alınabilir.

   =========================================================
   TEMPORAL ENGINE
   ---------------------------------------------------------
   Yayın tarihi olay tarihi değildir.

   Gerçek olay tarihi yoksa yayın tarihi yalnızca:
   - güncellik
   - yeni/eski içerik dili

   için kullanılır.

   =========================================================
   RANKING ENGINE
   ---------------------------------------------------------
   Ranking içerik seçmez.

   Selection Engine tarafından kabul edilmiş içeriklerin
   kullanıcı akışındaki sırasını belirler.

   =========================================================
   ÖNEMLİ
   ---------------------------------------------------------
   Bu dosya mevcut /api/feed sistemini değiştirmez.

   Yalnızca:

   /api/feed-preview

   için kullanılır.
   ========================================================= */


import {

  normalizeLegacyFeed,
  dedupePosts,
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

  applyTemporal,
  TEMPORAL_VERSION

} from "../intelligence/temporalEngine.js";


import {

  applySelection,
  filterSelectedPosts,
  createSelectionSummary,
  SELECTION_ENGINE_VERSION

} from "../intelligence/selectionEngine.js";


import {

  applyLifecycle,
  filterVisiblePosts,
  createLifecycleSummary

} from "./lifecycle.js";


import {

  applyPersona

} from "../intelligence/personaEngine.js";


import {

  applyRanking,
  compareRankedPosts,
  createRankingSummary,
  RANKING_VERSION

} from "../intelligence/rankingEngine.js";


/* =========================================================
   VERSION
   ========================================================= */

export const FEED_PREVIEW_VERSION =
  "1.4";


const DEFAULT_LIMIT =
  20;


const MAX_LIMIT =
  30;


/* =========================================================
   PIPELINE TANIMI
   ========================================================= */

const PIPELINE_STAGES = [

  "normalizer",

  "content-intent",

  "discovery",

  "temporal",

  "selection",

  "dedupe",

  "lifecycle",

  "persona",

  "ranking"

];


/* =========================================================
   ANA PREVIEW PIPELINE
   ========================================================= */

export async function buildFeedPreview({

  providers = [],
  env = null,
  limit = DEFAULT_LIMIT,
  requestedSources = [],
  includeBorderline = false

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


  const allowBorderline =
    includeBorderline ===
    true;


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

      temporalVersion:
        TEMPORAL_VERSION,

      selectionEngineVersion:
        SELECTION_ENGINE_VERSION,

      rankingVersion:
        RANKING_VERSION,

      pipeline:
        [
          ...PIPELINE_STAGES
        ],

      selectionMode:
        allowBorderline
          ? "selected_and_borderline"
          : "selected_only",

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

      selectedPostCount:
        0,

      borderlinePostCount:
        0,

      rejectedPostCount:
        0,

      eligiblePostCount:
        0,

      visiblePostCount:
        0,

      count:
        0,

      items:
        [],

      selectionReview:
        [],

      errors:
        requested.length

          ? [

              {

                sourceId:
                  "",

                source:
                  "",

                stage:
                  "provider-filter",

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

        temporal:
          createTemporalSummary(
            []
          ),

        selection:
          createSelectionSummary(
            []
          ),

        lifecycle:
          createLifecycleSummary(
            []
          ),

        ranking:
          createRankingSummary(
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

  const candidatePosts =
    [];


  const sources =
    [];


  const errors =
    [];


  /* =======================================================
     HER KAYNAĞI OKU VE SELECTION NOKTASINA KADAR İŞLE
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
       KAYNAK BAŞARISIZ
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
         NORMALIZER UYARILARI
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
         2. HER POSTU SELECTION NOKTASINA KADAR İŞLE
         ===================================================== */

      for (
        const normalizedPost
        of normalizedItems
      ) {

        try {

          let post =
            stabilizeLegacyLifecycle(
              normalizedPost
            );


          /* =================================================
             CONTENT INTENT ENGINE

             İçerik ne anlatıyor?
             ================================================= */

          post =
            applyContentIntent(
              post
            );


          /* =================================================
             DISCOVERY ENGINE

             İçerik hangi:

             - branş
             - bölüm
             - kategori
             - alt kategori
             - provider türü

             yapısına ait?
             ================================================= */

          post =
            applyDiscovery(
              post
            );


          /* =================================================
             TEMPORAL ENGINE

             İçerik ne zaman?

             Yayın tarihi olay tarihi değildir.
             ================================================= */

          post =
            applyTemporal(
              post
            );


          /* =================================================
             SELECTION ENGINE

             İçerik SporNRD kullanıcı akışına girmeye
             değer mi?

             6 ana ölçüt:

             - usefulness
             - importance
             - opportunity
             - timeliness
             - trust
             - interest

             Karar:

             selected
             borderline
             rejected
             ================================================= */

          post =
            applySelection(
              post
            );


          if (
            post &&
            typeof post ===
            "object"
          ) {

            candidatePosts.push(
              post
            );

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

            itemId:
              normalizedPost?.id ||
              "",

            stage:
              "candidate-pipeline",

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

     Selection özeti unique içerikler üzerinden hesaplanır.
     Böylece aynı haber iki kez geldiyse karar istatistiğini
     şişirmez.
     ========================================================= */

  const uniquePosts =
    dedupePosts(
      candidatePosts
    );


  /* =======================================================
     SELECTION SUMMARY
     ========================================================= */

  const selectionSummary =
    createSelectionSummary(
      uniquePosts
    );


  const selectionCounts =
    readSelectionCounts(
      selectionSummary
    );


  /* =======================================================
     SEÇİLEN İÇERİKLER

     Varsayılan:
     sadece selected

     Debug/test:
     includeBorderline = true
     ========================================================= */

  const eligiblePosts =
    filterSelectedPosts(
      uniquePosts,
      {

        includeBorderline:
          allowBorderline

      }
    );


  /* =======================================================
     LIFECYCLE

     Artık yalnız Selection Engine tarafından kabul edilmiş
     içeriklerin yaşam döngüsü işlenir.
     ========================================================= */

  const lifecyclePosts =
    [];


  for (
    const post
    of eligiblePosts
  ) {

    try {

      const lifecyclePost =
        applyLifecycle(
          post
        );


      if (
        lifecyclePost &&
        typeof lifecyclePost ===
        "object"
      ) {

        lifecyclePosts.push(
          lifecyclePost
        );

      }

    }

    catch (
      error
    ) {

      errors.push({

        sourceId:
          post?.source?.id ||
          "",

        source:
          post?.source?.name ||
          "",

        itemId:
          post?.id ||
          "",

        stage:
          "lifecycle",

        error:
          errorMessage(
            error
          )

      });

    }

  }


  /* =======================================================
     SÜRESİ GEÇEN / KALDIRILAN POSTLARI AYIR

     Geçmiş bir HABER otomatik expired değildir.
     ========================================================= */

  const lifecycleVisiblePosts =
    filterVisiblePosts(
      lifecyclePosts,
      {

        showExpired:
          false,

        showRemoved:
          false

      }
    );


  /* =======================================================
     PERSONA + RANKING

     Yalnız gerçekten görünür içeriklerde çalıştırılır.
     ========================================================= */

  const rankedPosts =
    [];


  for (
    const post
    of lifecycleVisiblePosts
  ) {

    try {

      let preparedPost =
        applyPersona(
          post
        );


      preparedPost =
        applyRanking(
          preparedPost
        );


      if (
        preparedPost &&
        typeof preparedPost ===
        "object"
      ) {

        rankedPosts.push(
          preparedPost
        );

      }

    }

    catch (
      error
    ) {

      errors.push({

        sourceId:
          post?.source?.id ||
          "",

        source:
          post?.source?.name ||
          "",

        itemId:
          post?.id ||
          "",

        stage:
          "presentation-ranking",

        error:
          errorMessage(
            error
          )

      });

    }

  }


  /* =======================================================
     RANKING SIRALAMASI
     ========================================================= */

  rankedPosts.sort(
    compareRankedPosts
  );


  /* =======================================================
     LIMIT
     ========================================================= */

  const finalItems =
    rankedPosts.slice(
      0,
      safeLimit
    );


  /* =======================================================
     SOURCE LİSTESİ
     ========================================================= */

  const finalSources =
    uniqueSources(
      sources
    );


  /* =======================================================
     SELECTION REVIEW

     Preview sırasında hangi içeriğin neden seçildiğini
     hızlıca görmek için tam post yerine hafif özet döner.
     ========================================================= */

  const selectionReview =
    createSelectionReview(
      uniquePosts
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

    temporalVersion:
      TEMPORAL_VERSION,

    selectionEngineVersion:
      SELECTION_ENGINE_VERSION,

    rankingVersion:
      RANKING_VERSION,

    pipeline:
      [
        ...PIPELINE_STAGES
      ],

    selectionMode:
      allowBorderline
        ? "selected_and_borderline"
        : "selected_only",

    startedAt:
      startedAt,

    finishedAt:
      new Date()
        .toISOString(),

    requestedSources:
      requested,

    sourceCount:
      finalSources.length,

    sources:
      finalSources,

    rawPostCount:
      candidatePosts.length,

    uniquePostCount:
      uniquePosts.length,

    selectedPostCount:
      selectionCounts.selected,

    borderlinePostCount:
      selectionCounts.borderline,

    rejectedPostCount:
      selectionCounts.rejected,

    eligiblePostCount:
      eligiblePosts.length,

    visiblePostCount:
      rankedPosts.length,

    count:
      finalItems.length,

    items:
      finalItems,

    selectionReview:
      selectionReview,

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

      temporal:
        createTemporalSummary(
          uniquePosts
        ),

      selection:
        selectionSummary,

      lifecycle:
        createLifecycleSummary(
          lifecyclePosts
        ),

      ranking:
        createRankingSummary(
          rankedPosts
        )

    }

  };

}


/* =========================================================
   INTENT SUMMARY
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
   TEMPORAL SUMMARY
   ========================================================= */

function createTemporalSummary(
  posts
) {

  const items =
    Array.isArray(
      posts
    )
      ? posts
      : [];


  const states =
    {};


  const eventStatuses =
    {};


  const freshness =
    {};


  const languageModes =
    {};


  const actionStates =
    {};


  const bases =
    {};


  for (
    const post
    of items
  ) {

    const temporal =
      isPlainObject(
        post?.temporal
      )

        ? post.temporal

        : {};


    incrementCounter(

      states,

      temporal.state ||
      "unknown"

    );


    incrementCounter(

      eventStatuses,

      temporal.eventStatus ||
      post?.eventStatus ||
      "unknown"

    );


    incrementCounter(

      freshness,

      temporal.freshness ||
      "unknown"

    );


    incrementCounter(

      languageModes,

      temporal.languageMode ||
      "neutral"

    );


    incrementCounter(

      actionStates,

      temporal.actionState ||
      "unknown"

    );


    incrementCounter(

      bases,

      temporal.basis ||
      "none"

    );

  }


  return {

    count:
      items.length,

    states:
      states,

    eventStatuses:
      eventStatuses,

    freshness:
      freshness,

    languageModes:
      languageModes,

    actionStates:
      actionStates,

    bases:
      bases

  };

}


/* =========================================================
   SELECTION COUNTS
   ========================================================= */

function readSelectionCounts(
  summary
) {

  const decisions =
    isPlainObject(
      summary?.decisions
    )
      ? summary.decisions
      : {};


  return {

    selected:
      safeCount(
        decisions.selected
      ),

    borderline:
      safeCount(
        decisions.borderline
      ),

    rejected:
      safeCount(
        decisions.rejected
      )

  };

}


/* =========================================================
   SELECTION REVIEW

   Bu alan preview/debug içindir.

   Ana items alanına yalnız kabul edilen postlar gider.
   ========================================================= */

function createSelectionReview(
  posts
) {

  const items =
    Array.isArray(
      posts
    )
      ? posts
      : [];


  return items

    .map(
      post => ({

        id:
          cleanString(
            post?.id
          ),

        sourceId:
          cleanString(
            post?.source?.id
          ),

        source:
          cleanString(
            post?.source?.shortName ||
            post?.source?.name
          ),

        title:
          firstString(

            post?.editorial?.originalTitle,

            post?.editorial?.headline,

            post?.title

          ),

        sport:
          cleanString(
            post?.sport
          ),

        section:
          cleanString(
            post?.section
          ),

        category:
          cleanString(
            post?.category
          ),

        subCategory:
          cleanString(
            post?.subCategory
          ),

        contentIntent:
          cleanString(
            post?.contentIntent
          ),

        temporalState:
          cleanString(
            post?.temporal?.state
          ),

        decision:
          cleanString(
            post?.selectionMeta?.decision
          ),

        selectionScore:
          safeNumber(
            post?.selectionScore
          ),

        userValue:
          cleanString(
            post?.selectionMeta?.userValue
          ),

        reasons:
          Array.isArray(
            post?.selectionMeta?.reasons
          )

            ? post.selectionMeta.reasons.slice(
                0,
                5
              )

            : []

      })
    )

    .sort(
      (a, b) => {

        if (
          a.selectionScore !==
          b.selectionScore
        ) {

          return (
            b.selectionScore -
            a.selectionScore
          );

        }


        return a.title.localeCompare(
          b.title,
          "tr-TR"
        );

      }
    );

}


/* =========================================================
   LEGACY LIFECYCLE DÜZELTME
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

      lifecycle.publishedAt

      ||

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

    provider

    &&

    typeof provider ===
    "object"

    &&

    provider.enabled ===
    true

    &&

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
   SAFE NUMBER
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
   SAFE COUNT
   ========================================================= */

function safeCount(
  value
) {

  return Math.max(

    0,

    Math.floor(
      safeNumber(
        value
      )
    )

  );

}


/* =========================================================
   ID NORMALİZE
   ========================================================= */

function normalizeId(
  value
) {

  return String(
    value ??
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
    value ??
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

    value

    &&

    typeof value ===
    "object"

    &&

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
