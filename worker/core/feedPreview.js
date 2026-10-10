/* =========================================================
   SporNRD
   worker/core/feedPreview.js

   Gerçek Kaynak → v6.1 Preview Pipeline

   Sürüm: 6.1.3-preview

   AMAÇ
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
   Temporal Engine
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
   TEMPORAL ENGINE
   ---------------------------------------------------------
   İçeriğin gerçek tarihlerini bugünün tarihiyle
   karşılaştırır.

   past
   present
   future
   unknown

   kararını üretir.

   Yayın tarihi olay tarihi değildir.

   Gerçek olay tarihi yoksa yayın tarihi yalnızca:
   - güncellik
   - yeni/eski içerik dili

   için kullanılır.

   =========================================================
   RANKING ENGINE
   ---------------------------------------------------------
   İçeriğin anlamını değiştirmez.

   Yalnızca:

   "Bu içerik kullanıcıya akışta
   ne kadar yukarıda gösterilmeli?"

   sorusunu cevaplar.

   Ranking;

   - relevance
   - quality
   - trust
   - freshness
   - temporal
   - intent
   - actionable
   - learning
   - interaction
   - lifecycle

   sinyallerini birlikte değerlendirir.

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
  "1.3";


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

      temporalVersion:
        TEMPORAL_VERSION,

      rankingVersion:
        RANKING_VERSION,

      pipeline:
        [
          ...PIPELINE_STAGES
        ],

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

            Eski haberleri yanlışlıkla her preview
            isteğinde yeniden "yeni" göstermemek için
            yayın tarihi biliniyorsa onu koruyoruz.

            Bu işlem yayın tarihini olay tarihi yapmaz.
          */

          let post =
            stabilizeLegacyLifecycle(
              normalizedPost
            );


          /* =================================================
             CONTENT INTENT ENGINE

             Önce içerik NE ANLATIYOR?

             Örnek:

             result
             achievement
             registration
             opportunity
             announcement
             campaign
             job
             product
             news

             ================================================= */

          post =
            applyContentIntent(
              post
            );


          /* =================================================
             DISCOVERY ENGINE

             İçerik hangi yapıya ait?

             -------------------------------------------------
             sport:
             swimming
             basketball
             ...

             -------------------------------------------------
             section:
             individual_athlete
             trainer_coach
             business_institution

             -------------------------------------------------
             category:
             news
             course
             event
             campaign
             jobs
             stores

             -------------------------------------------------
             subCategory:
             kategoriye göre değişir
             ================================================= */

          post =
            applyDiscovery(
              post
            );


          /* =================================================
             TEMPORAL ENGINE

             İçerik NE ZAMAN?

             -------------------------------------------------
             state:
             past
             present
             future
             unknown

             -------------------------------------------------
             eventStatus:
             upcoming
             ongoing
             completed
             unknown

             -------------------------------------------------
             actionState:
             open
             closing_today
             closed
             possible_unverified
             not_applicable

             -------------------------------------------------
             KRİTİK:

             publishedAt olay tarihi değildir.
             ================================================= */

          post =
            applyTemporal(
              post
            );


          /* =================================================
             LIFECYCLE ENGINE

             İçeriğin SporNRD içindeki yaşam döngüsü.

             Örnek:

             new
             active
             closing_soon
             updated
             expired
             removed

             Temporal ile lifecycle farklı kavramlardır.

             Örneğin:

             lifecycle.status = "new"
             temporal.state   = "past"

             olabilir.

             Bu:

             "Yeni yayımlanmış fakat geçmişte
             gerçekleşmiş olay"

             anlamına gelebilir.
             ================================================= */

          post =
            applyLifecycle(
              post
            );


          /* =================================================
             PERSONA ENGINE

             Yapılandırılmış gerçekleri kullanıcıya
             anlaşılır ve dikkat çekici SporNRD diliyle
             anlatır.

             -------------------------------------------------
             past:
             oldu / kazandı / tamamlandı

             present:
             devam ediyor / bugün

             future:
             başlayacak / yapılacak

             unknown:
             yalnız yayın güncelliği kullanılır

             -------------------------------------------------
             Persona gerçek üretmez.
             ================================================= */

          post =
            applyPersona(
              post
            );


          /* =================================================
             RANKING ENGINE

             Artık postun:

             - anlamı
             - kategorisi
             - zamanı
             - güveni
             - güncelliği
             - kullanıcı açısından değeri
             - öğrenme puanı
             - etkileşimleri

             belli.

             Ranking Engine bu postun akıştaki
             önceliğini hesaplar.

             Örnek çıktı:

             rankingScore: 86.4

             rankingMeta.band:
             priority
             high
             normal
             low
             ================================================= */

          post =
            applyRanking(
              post
            );


          /* =================================================
             POST HAVUZUNA EKLE
             ================================================= */

          if (
            post &&
            typeof post ===
            "object"
          ) {

            allPosts.push(
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

     KRİTİK:

     Geçmiş bir HABER otomatik expired değildir.

     Örneğin:

     Fenerbahçe kupayı kazandı.

     temporal.state:
     past

     eventStatus:
     completed

     olabilir.

     Ancak category = news ise haber olarak görünmeye
     devam edebilir.

     Lifecycle görünürlük kararını ayrıca verir.
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
     RANKING SIRALAMASI

     Eski comparePosts() artık kullanılmıyor.

     Ranking Engine'in ürettiği rankingScore
     ana sıralama ölçütüdür.

     Eşitlik durumunda rankingEngine.js:

     1. quality
     2. relevance
     3. publishedAt

     değerlerine bakar.
     ========================================================= */

  visiblePosts.sort(
    compareRankedPosts
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

    temporalVersion:
      TEMPORAL_VERSION,

    rankingVersion:
      RANKING_VERSION,

    pipeline:
      [
        ...PIPELINE_STAGES
      ],

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

      temporal:
        createTemporalSummary(
          uniquePosts
        ),

      lifecycle:
        createLifecycleSummary(
          uniquePosts
        ),

      ranking:
        createRankingSummary(
          visiblePosts
        )

    }

  };

}


/* =========================================================
   INTENT SUMMARY

   Preview ekranında Content Intent motorunun
   genel kararlarını görmemizi sağlar.
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

   Geçmiş / Şimdi / Gelecek kararlarını
   tek bakışta test etmeyi sağlar.
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
   LEGACY LIFECYCLE DÜZELTME

   Preview'da eski haberlerin her istekte
   yeniden "YENİ" sayılmasını önler.

   Yayın tarihi biliniyorsa firstSeenAt için
   geçici ve güvenli referans olarak kullanılır.

   DİKKAT:

   Bu işlem yayın tarihini olay tarihi yapmaz.
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
