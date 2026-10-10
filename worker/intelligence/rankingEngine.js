/* =========================================================
   SporNRD
   worker/intelligence/rankingEngine.js

   SporNRD Akış Sıralama / Ranking Motoru

   Sürüm: 6.1.0

   AMAÇ
   ---------------------------------------------------------
   SporNRD pipeline tarafından analiz edilmiş postları
   kullanıcı açısından anlamlı bir sıraya koymak.

   Ranking Engine:

   - İçeriğin kategorisini DEĞİŞTİRMEZ.
   - Section bilgisini DEĞİŞTİRMEZ.
   - Content Intent kararını DEĞİŞTİRMEZ.
   - Temporal kararını DEĞİŞTİRMEZ.
   - Persona metnini DEĞİŞTİRMEZ.

   Yalnızca:

   "Bu içerik akışta ne kadar yukarıda olmalı?"

   sorusunu cevaplar.

   =========================================================
   ANA GİRDİLER
   ---------------------------------------------------------

   scoring.relevance
   scoring.quality
   scoring.learning

   category
   subCategory
   section
   contentIntent

   temporal.state
   temporal.eventStatus
   temporal.freshness
   temporal.actionState
   temporal.daysUntilStart
   temporal.daysUntilDeadline

   lifecycle.status

   trust.verified
   trust.confidenceScore
   trust.evidenceCount

   actionable
   interactions

   =========================================================
   TEMEL PRENSİP
   ---------------------------------------------------------

   HABER:
   - Yeni ve önemliyse yukarı çıkar.
   - Aksiyon alınamıyor diye cezalandırılmaz.
   - Sonuç / başarı haberi değerini korur.

   KURS / ETKİNLİK:
   - Yaklaşan ve güncel olan yukarı çıkar.
   - Başvurusu kapanmış içerik aşağı iner.
   - Geçmiş içerik güçlü biçimde aşağı iner.

   KAMPANYA / İŞ:
   - Aktif ve süresi devam eden içerik öne çıkar.
   - Deadline yaklaşınca önemi artar.
   - Süresi geçen içerik geriye düşer.

   MAĞAZA:
   - Kalite, güncellik, güven ve ilgi önemlidir.

   =========================================================
   GÜVEN KURALI
   ---------------------------------------------------------

   Ranking Engine hiçbir gerçek üretmez.

   Yalnızca mevcut post alanlarını puanlar.
   ========================================================= */


/* =========================================================
   VERSION
   ========================================================= */

export const RANKING_VERSION =
  "1.0";


/* =========================================================
   SCORE LIMIT
   ========================================================= */

const MIN_SCORE =
  0;


const MAX_SCORE =
  100;


/* =========================================================
   ANA RANKING
   ========================================================= */

export function calculateRanking(
  post,
  options = {}
) {

  void options;


  if (
    !post ||
    typeof post !==
    "object"
  ) {

    return createFallbackRanking();

  }


  /* =======================================================
     TEMEL VERİLER
     ========================================================= */

  const scoring =
    isPlainObject(
      post.scoring
    )
      ? post.scoring
      : {};


  const temporal =
    isPlainObject(
      post.temporal
    )
      ? post.temporal
      : {};


  const trust =
    isPlainObject(
      post.trust
    )
      ? post.trust
      : {};


  const lifecycle =
    isPlainObject(
      post.lifecycle
    )
      ? post.lifecycle
      : {};


  const interactions =
    isPlainObject(
      post.interactions
    )
      ? post.interactions
      : {};


  /* =======================================================
     NORMALİZE DEĞERLER
     ========================================================= */

  const category =
    normalizeId(
      post.category
    );


  const section =
    normalizeId(
      post.section
    );


  const subCategory =
    normalizeId(
      post.subCategory
    );


  const contentIntent =
    normalizeId(
      post.contentIntent
    );


  const timeState =
    normalizeId(
      temporal.state
    );


  const eventStatus =
    normalizeId(

      temporal.eventStatus

      ||

      post.eventStatus

    );


  const freshness =
    normalizeId(
      temporal.freshness
    );


  const actionState =
    normalizeId(
      temporal.actionState
    );


  const lifecycleStatus =
    normalizeId(
      lifecycle.status
    );


  /* =======================================================
     PUAN BİLEŞENLERİ
     ========================================================= */

  const components = {

    relevance:
      calculateRelevanceScore(
        scoring.relevance
      ),

    quality:
      calculateQualityScore(
        scoring.quality
      ),

    trust:
      calculateTrustScore(
        trust
      ),

    freshness:
      calculateFreshnessScore({

        category:
          category,

        freshness:
          freshness,

        timeState:
          timeState,

        eventStatus:
          eventStatus

      }),

    temporal:
      calculateTemporalScore({

        category:
          category,

        timeState:
          timeState,

        eventStatus:
          eventStatus,

        actionState:
          actionState,

        daysUntilStart:
          nullableNumber(
            temporal.daysUntilStart
          ),

        daysUntilDeadline:
          nullableNumber(
            temporal.daysUntilDeadline
          )

      }),

    intent:
      calculateIntentScore({

        category:
          category,

        contentIntent:
          contentIntent,

        subCategory:
          subCategory

      }),

    actionable:
      calculateActionableScore({

        category:
          category,

        actionable:
          post.actionable ===
          true,

        actionState:
          actionState

      }),

    learning:
      calculateLearningScore(
        scoring.learning
      ),

    interaction:
      calculateInteractionScore(
        interactions
      ),

    lifecycle:
      calculateLifecycleScore(
        lifecycleStatus
      )

  };


  /* =======================================================
     AĞIRLIKLAR

     Toplam 100 puanlık temel model.

     Bazı kategori / zaman düzeltmeleri daha sonra
     bonus veya ceza olarak uygulanır.
     ========================================================= */

  const weights = {

    relevance:
      0.18,

    quality:
      0.13,

    trust:
      0.10,

    freshness:
      0.14,

    temporal:
      0.14,

    intent:
      0.10,

    actionable:
      0.06,

    learning:
      0.08,

    interaction:
      0.04,

    lifecycle:
      0.03

  };


  /* =======================================================
     BASE SCORE
     ========================================================= */

  let baseScore =
    0;


  for (
    const [
      key,
      weight
    ]
    of Object.entries(
      weights
    )
  ) {

    baseScore +=
      safeNumber(
        components[
          key
        ]
      )
      *
      weight;

  }


  /* =======================================================
     BONUS / PENALTY
     ========================================================= */

  const adjustments =
    [];


  /* =======================================================
     KATEGORİYE ÖZEL DÜZELTME
     ========================================================= */

  applyCategoryAdjustments({

    post:
      post,

    category:
      category,

    contentIntent:
      contentIntent,

    timeState:
      timeState,

    eventStatus:
      eventStatus,

    actionState:
      actionState,

    freshness:
      freshness,

    adjustments:
      adjustments

  });


  /* =======================================================
     DEADLINE YAKLAŞIYOR
     ========================================================= */

  applyDeadlineAdjustment({

    category:
      category,

    actionState:
      actionState,

    daysUntilDeadline:
      nullableNumber(
        temporal.daysUntilDeadline
      ),

    adjustments:
      adjustments

  });


  /* =======================================================
     BAŞLANGIÇ TARİHİ YAKLAŞIYOR
     ========================================================= */

  applyUpcomingAdjustment({

    category:
      category,

    timeState:
      timeState,

    daysUntilStart:
      nullableNumber(
        temporal.daysUntilStart
      ),

    adjustments:
      adjustments

  });


  /* =======================================================
     GÜVEN DÜZELTMESİ
     ========================================================= */

  if (
    trust.verified ===
    true
  ) {

    adjustments.push({

      id:
        "verified-source",

      value:
        3,

      reason:
        "Doğrulanmış kaynak."

    });

  }


  if (
    safeNumber(
      trust.confidenceScore
    ) >=
    95
  ) {

    adjustments.push({

      id:
        "high-confidence",

      value:
        2,

      reason:
        "Yüksek veri güveni."

    });

  }


  /* =======================================================
     SECTION

     Section sıralamada küçük bir sinyal olabilir,
     fakat içerik değerinin önüne geçmez.
     ========================================================= */

  if (
    [
      "individual_athlete",
      "trainer_coach",
      "business_institution"
    ].includes(
      section
    )
  ) {

    adjustments.push({

      id:
        "valid-section",

      value:
        1,

      reason:
        "İçerik SporNRD bölüm yapısında sınıflandırılmış."

    });

  }


  /* =======================================================
     TOPLAM DÜZELTME
     ========================================================= */

  const adjustmentTotal =
    adjustments.reduce(

      (
        total,
        item
      ) =>
        total +
        safeNumber(
          item.value
        ),

      0

    );


  /* =======================================================
     FINAL SCORE
     ========================================================= */

  const rawScore =
    baseScore +
    adjustmentTotal;


  const finalScore =
    roundScore(
      clamp(
        rawScore,
        MIN_SCORE,
        MAX_SCORE
      )
    );


  /* =======================================================
     RANKING BAND
     ========================================================= */

  const band =
    getRankingBand(
      finalScore
    );


  /* =======================================================
     SONUÇ
     ========================================================= */

  return {

    version:
      RANKING_VERSION,

    score:
      finalScore,

    baseScore:
      roundScore(
        baseScore
      ),

    adjustmentTotal:
      roundScore(
        adjustmentTotal
      ),

    band:
      band,

    components:
      mapRoundedScores(
        components
      ),

    weights:
      weights,

    adjustments:
      adjustments,

    category:
      category,

    section:
      section,

    contentIntent:
      contentIntent,

    timeState:
      timeState ||
      "unknown",

    eventStatus:
      eventStatus ||
      "unknown",

    freshness:
      freshness ||
      "unknown",

    actionState:
      actionState ||
      "unknown",

    rankedAt:
      new Date()
        .toISOString()

  };

}


/* =========================================================
   RANKING POSTA UYGULA
   ========================================================= */

export function applyRanking(
  post,
  options = {}
) {

  if (
    !post ||
    typeof post !==
    "object"
  ) {

    return post;

  }


  const ranking =
    calculateRanking(
      post,
      options
    );


  const currentScoring =
    isPlainObject(
      post.scoring
    )
      ? post.scoring
      : {};


  return {

    ...post,


    /* -----------------------------------------------------
       Kolay erişim
       ----------------------------------------------------- */

    rankingScore:
      ranking.score,


    /* -----------------------------------------------------
       Mevcut scoring modeliyle uyumluluk

       final artık akış sıralama puanıdır.

       Eski final değerini kaybetmemek için
       previousFinal tutulur.
       ----------------------------------------------------- */

    scoring: {

      ...currentScoring,

      previousFinal:
        safeNumber(
          currentScoring.final
        ),

      final:
        ranking.score

    },


    /* -----------------------------------------------------
       Açıklanabilir ranking
       ----------------------------------------------------- */

    rankingMeta:
      ranking

  };

}


/* =========================================================
   POST LİSTESİNE RANKING UYGULA
   ========================================================= */

export function applyRankingToPosts(
  posts,
  options = {}
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
      post =>
        applyRanking(
          post,
          options
        )
    )

    .filter(
      Boolean
    );

}


/* =========================================================
   POSTLARI SIRALA

   Büyük rankingScore önce gelir.

   Eşitse:
   1. quality
   2. relevance
   3. publishedAt
   ========================================================= */

export function compareRankedPosts(
  a,
  b
) {

  const rankingDifference =
    getPostRankingScore(
      b
    )
    -
    getPostRankingScore(
      a
    );


  if (
    rankingDifference !==
    0
  ) {

    return rankingDifference;

  }


  const qualityDifference =
    safeNumber(
      b?.scoring?.quality
    )
    -
    safeNumber(
      a?.scoring?.quality
    );


  if (
    qualityDifference !==
    0
  ) {

    return qualityDifference;

  }


  const relevanceDifference =
    normalizeLegacyRelevance(
      b?.scoring?.relevance
    )
    -
    normalizeLegacyRelevance(
      a?.scoring?.relevance
    );


  if (
    relevanceDifference !==
    0
  ) {

    return relevanceDifference;

  }


  return (
    getPublishedTimestamp(
      b
    )
    -
    getPublishedTimestamp(
      a
    )
  );

}


/* =========================================================
   LİSTEYİ RANK ET + SIRALA
   ========================================================= */

export function rankPosts(
  posts,
  options = {}
) {

  return applyRankingToPosts(
    posts,
    options
  )
    .sort(
      compareRankedPosts
    );

}


/* =========================================================
   RANKING SUMMARY
   ========================================================= */

export function createRankingSummary(
  posts
) {

  const items =
    Array.isArray(
      posts
    )
      ? posts
      : [];


  const bands = {

    priority:
      0,

    high:
      0,

    normal:
      0,

    low:
      0

  };


  const categories =
    {};


  let scoreTotal =
    0;


  let scoredCount =
    0;


  for (
    const post
    of items
  ) {

    const score =
      getPostRankingScore(
        post
      );


    if (
      Number.isFinite(
        score
      )
    ) {

      scoreTotal +=
        score;

      scoredCount++;

    }


    const band =
      post?.rankingMeta?.band

      ||

      getRankingBand(
        score
      );


    if (
      Object.prototype.hasOwnProperty.call(
        bands,
        band
      )
    ) {

      bands[
        band
      ]++;

    }


    const category =
      normalizeId(
        post?.category
      )
      ||
      "unknown";


    categories[
      category
    ] =
      safeNumber(
        categories[
          category
        ]
      )
      +
      1;

  }


  return {

    version:
      RANKING_VERSION,

    count:
      items.length,

    averageScore:
      scoredCount

        ? roundScore(
            scoreTotal /
            scoredCount
          )

        : 0,

    bands:
      bands,

    categories:
      categories

  };

}


/* =========================================================
   RELEVANCE
   ========================================================= */

function calculateRelevanceScore(
  value
) {

  return clamp(
    normalizeLegacyRelevance(
      value
    ),
    0,
    100
  );

}


/* =========================================================
   LEGACY RELEVANCE

   Eski sistem:
   10 / 9 / 8 / 7 ...

   Yeni sistem:
   0-100

   Her ikisini destekler.
   ========================================================= */

function normalizeLegacyRelevance(
  value
) {

  const number =
    safeNumber(
      value
    );


  if (
    number <=
    10
  ) {

    return number *
    10;

  }


  return clamp(
    number,
    0,
    100
  );

}


/* =========================================================
   QUALITY
   ========================================================= */

function calculateQualityScore(
  value
) {

  return clamp(
    safeNumber(
      value
    ),
    0,
    100
  );

}


/* =========================================================
   TRUST
   ========================================================= */

function calculateTrustScore(
  trust
) {

  let score =
    clamp(
      safeNumber(
        trust?.confidenceScore
      ),
      0,
      100
    );


  if (
    trust?.verified ===
    true
  ) {

    score =
      Math.max(
        score,
        85
      );

  }


  const evidenceCount =
    safeNumber(
      trust?.evidenceCount
    );


  if (
    evidenceCount >=
    3
  ) {

    score +=
      5;

  }


  if (
    evidenceCount >=
    5
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
   FRESHNESS
   ========================================================= */

function calculateFreshnessScore({

  category,
  freshness,
  timeState,
  eventStatus

}) {

  const map = {

    today:
      100,

    yesterday:
      94,

    recent:
      88,

    current:
      76,

    older:
      52,

    old:
      25,

    future_dated:
      35,

    unknown:
      45

  };


  let score =
    map[
      freshness
    ] ??
    45;


  /*
    Haberlerde güncellik daha önemlidir.
  */

  if (
    category ===
    "news"
  ) {

    if (
      freshness ===
      "today"
    ) {

      score =
        100;

    }


    else if (
      freshness ===
      "recent"
      ||
      freshness ===
      "yesterday"
    ) {

      score =
        Math.max(
          score,
          92
        );

    }

  }


  /*
    Gelecek kurs/etkinlik eski tarihte yayımlanmış olsa bile
    hâlâ kullanıcı için değerli olabilir.

    Bu nedenle freshness tek başına fazla ceza vermez.
  */

  if (
    [
      "course",
      "event",
      "campaign",
      "jobs"
    ].includes(
      category
    )
    &&
    timeState ===
    "future"
  ) {

    score =
      Math.max(
        score,
        70
      );

  }


  if (
    eventStatus ===
    "ongoing"
  ) {

    score =
      Math.max(
        score,
        85
      );

  }


  return clamp(
    score,
    0,
    100
  );

}


/* =========================================================
   TEMPORAL SCORE
   ========================================================= */

function calculateTemporalScore({

  category,
  timeState,
  eventStatus,
  actionState,
  daysUntilStart,
  daysUntilDeadline

}) {

  /* -------------------------------------------------------
     HABER

     Haber geçmiş bir olayı anlatabilir.
     Bu normaldir.

     Bu yüzden "past" olması ceza değildir.
     ------------------------------------------------------- */

  if (
    category ===
    "news"
  ) {

    if (
      eventStatus ===
      "completed"
      ||
      timeState ===
      "past"
    ) {

      return 82;

    }


    if (
      timeState ===
      "present"
    ) {

      return 92;

    }


    if (
      timeState ===
      "future"
    ) {

      return 80;

    }


    return 70;

  }


  /* -------------------------------------------------------
     SÜRESİ KAPALI
     ------------------------------------------------------- */

  if (
    actionState ===
    "closed"
  ) {

    return 15;

  }


  /* -------------------------------------------------------
     DEVAM EDİYOR
     ------------------------------------------------------- */

  if (
    eventStatus ===
    "ongoing"
    ||
    timeState ===
    "present"
  ) {

    return 100;

  }


  /* -------------------------------------------------------
     GELECEK
     ------------------------------------------------------- */

  if (
    timeState ===
    "future"
  ) {

    if (
      daysUntilStart !==
      null
    ) {

      if (
        daysUntilStart <=
        3
      ) {

        return 98;

      }


      if (
        daysUntilStart <=
        7
      ) {

        return 94;

      }


      if (
        daysUntilStart <=
        14
      ) {

        return 88;

      }


      if (
        daysUntilStart <=
        30
      ) {

        return 80;

      }


      if (
        daysUntilStart <=
        60
      ) {

        return 68;

      }

    }


    return 72;

  }


  /* -------------------------------------------------------
     DEADLINE
     ------------------------------------------------------- */

  if (
    daysUntilDeadline !==
    null
    &&
    daysUntilDeadline >=
    0
  ) {

    if (
      daysUntilDeadline <=
      2
    ) {

      return 100;

    }


    if (
      daysUntilDeadline <=
      7
    ) {

      return 94;

    }


    return 80;

  }


  /* -------------------------------------------------------
     GEÇMİŞ

     Haber dışı içerikte güçlü ceza.
     ------------------------------------------------------- */

  if (
    timeState ===
    "past"
    ||
    eventStatus ===
    "completed"
  ) {

    return 18;

  }


  return 55;

}


/* =========================================================
   INTENT SCORE
   ========================================================= */

function calculateIntentScore({

  category,
  contentIntent,
  subCategory

}) {

  const intentScores = {

    result:
      88,

    achievement:
      92,

    assignment:
      78,

    transfer:
      80,

    news:
      72,

    announcement:
      68,

    registration:
      92,

    opportunity:
      88,

    campaign:
      86,

    job:
      88,

    product:
      70,

    event:
      78,

    education:
      76,

    unknown:
      55

  };


  let score =
    intentScores[
      contentIntent
    ]
    ??
    60;


  /*
    Başarı haberleri haber akışında güçlüdür.
  */

  if (
    category ===
    "news"
    &&
    subCategory ===
    "achievement"
  ) {

    score =
      Math.max(
        score,
        95
      );

  }


  /*
    Sonuç haberleri de akışta değerini korur.
  */

  if (
    category ===
    "news"
    &&
    subCategory ===
    "result"
  ) {

    score =
      Math.max(
        score,
        90
      );

  }


  return clamp(
    score,
    0,
    100
  );

}


/* =========================================================
   ACTIONABLE SCORE
   ========================================================= */

function calculateActionableScore({

  category,
  actionable,
  actionState

}) {

  /*
    Haber aksiyon gerektirmez.
    Bu nedenle cezalandırılmaz.
  */

  if (
    category ===
    "news"
  ) {

    return 72;

  }


  if (
    actionState ===
    "closed"
  ) {

    return 0;

  }


  if (
    actionState ===
    "closing_today"
  ) {

    return 100;

  }


  if (
    actionState ===
    "open"
  ) {

    return 95;

  }


  if (
    actionState ===
    "possible_unverified"
  ) {

    return actionable
      ? 75
      : 55;

  }


  if (
    actionable
  ) {

    return 70;

  }


  return 45;

}


/* =========================================================
   LEARNING
   ========================================================= */

function calculateLearningScore(
  value
) {

  const number =
    safeNumber(
      value
    );


  /*
    Başlangıçta öğrenme verisi yoksa
    içeriği cezalandırmıyoruz.
  */

  if (
    number ===
    0
  ) {

    return 50;

  }


  /*
    -100 → 0
       0 → 50
    +100 → 100
  */

  return clamp(
    50 +
    (
      number /
      2
    ),
    0,
    100
  );

}


/* =========================================================
   INTERACTION SCORE
   ========================================================= */

function calculateInteractionScore(
  interactions
) {

  const wow =
    nonNegativeNumber(
      interactions?.wow
    );


  const save =
    nonNegativeNumber(
      interactions?.save
    );


  const share =
    nonNegativeNumber(
      interactions?.share
    );


  const trash =
    nonNegativeNumber(
      interactions?.trash
    );


  /*
    Save ve share daha güçlü sinyal.
    Trash negatif sinyal.
  */

  const raw =
    (
      wow *
      1
    )
    +
    (
      save *
      2.5
    )
    +
    (
      share *
      3
    )
    -
    (
      trash *
      4
    );


  /*
    Henüz etkileşim yoksa nötr.
  */

  if (
    wow ===
    0
    &&
    save ===
    0
    &&
    share ===
    0
    &&
    trash ===
    0
  ) {

    return 50;

  }


  return clamp(
    50 +
    raw,
    0,
    100
  );

}


/* =========================================================
   LIFECYCLE SCORE
   ========================================================= */

function calculateLifecycleScore(
  status
) {

  const map = {

    new:
      100,

    active:
      85,

    closing_soon:
      100,

    updated:
      92,

    expired:
      10,

    removed:
      0

  };


  return (
    map[
      status
    ]
    ??
    60
  );

}


/* =========================================================
   KATEGORİ DÜZELTMELERİ
   ========================================================= */

function applyCategoryAdjustments({

  post,
  category,
  contentIntent,
  timeState,
  eventStatus,
  actionState,
  freshness,
  adjustments

}) {

  /* =======================================================
     HABER
     ========================================================= */

  if (
    category ===
    "news"
  ) {

    if (
      [
        "today",
        "yesterday",
        "recent"
      ].includes(
        freshness
      )
    ) {

      adjustments.push({

        id:
          "fresh-news",

        value:
          6,

        reason:
          "Yeni yayımlanmış haber."

      });

    }


    if (
      contentIntent ===
      "achievement"
    ) {

      adjustments.push({

        id:
          "achievement-news",

        value:
          5,

        reason:
          "Başarı haberi."

      });

    }


    if (
      contentIntent ===
      "result"
      ||
      eventStatus ===
      "completed"
    ) {

      adjustments.push({

        id:
          "result-news",

        value:
          3,

        reason:
          "Tamamlanmış spor sonucu haber niteliğinde."

      });

    }


    /*
      Haber geçmiş olayı anlatıyor diye cezalandırılmaz.
    */

    return;

  }


  /* =======================================================
     KURS
     ========================================================= */

  if (
    category ===
    "course"
  ) {

    if (
      timeState ===
      "future"
    ) {

      adjustments.push({

        id:
          "upcoming-course",

        value:
          6,

        reason:
          "Yaklaşan kurs."

      });

    }


    if (
      actionState ===
      "open"
      ||
      actionState ===
      "closing_today"
    ) {

      adjustments.push({

        id:
          "course-registration",

        value:
          5,

        reason:
          "Kurs için işlem süresi açık."

      });

    }


    if (
      actionState ===
      "closed"
    ) {

      adjustments.push({

        id:
          "course-closed",

        value:
          -24,

        reason:
          "Kurs başvuru/kayıt süresi kapanmış."

      });

    }


    if (
      timeState ===
      "past"
    ) {

      adjustments.push({

        id:
          "course-past",

        value:
          -25,

        reason:
          "Kurs tarihi geçmiş."

      });

    }


    return;

  }


  /* =======================================================
     ETKİNLİK
     ========================================================= */

  if (
    category ===
    "event"
  ) {

    if (
      timeState ===
      "future"
    ) {

      adjustments.push({

        id:
          "upcoming-event",

        value:
          6,

        reason:
          "Yaklaşan etkinlik."

      });

    }


    if (
      timeState ===
      "present"
      ||
      eventStatus ===
      "ongoing"
    ) {

      adjustments.push({

        id:
          "ongoing-event",

        value:
          8,

        reason:
          "Etkinlik şu anda devam ediyor."

      });

    }


    if (
      timeState ===
      "past"
      ||
      eventStatus ===
      "completed"
    ) {

      adjustments.push({

        id:
          "past-event",

        value:
          -25,

        reason:
          "Etkinlik tamamlanmış."

      });

    }


    return;

  }


  /* =======================================================
     KAMPANYA
     ========================================================= */

  if (
    category ===
    "campaign"
  ) {

    if (
      timeState ===
      "present"
      ||
      actionState ===
      "open"
    ) {

      adjustments.push({

        id:
          "active-campaign",

        value:
          7,

        reason:
          "Kampanya aktif."

      });

    }


    if (
      timeState ===
      "future"
    ) {

      adjustments.push({

        id:
          "future-campaign",

        value:
          2,

        reason:
          "Kampanya henüz başlamamış."

      });

    }


    if (
      timeState ===
      "past"
      ||
      actionState ===
      "closed"
    ) {

      adjustments.push({

        id:
          "expired-campaign",

        value:
          -30,

        reason:
          "Kampanya süresi geçmiş."

      });

    }


    return;

  }


  /* =======================================================
     İŞ İLANI
     ========================================================= */

  if (
    category ===
    "jobs"
  ) {

    if (
      actionState ===
      "open"
      ||
      actionState ===
      "closing_today"
    ) {

      adjustments.push({

        id:
          "active-job",

        value:
          7,

        reason:
          "İş ilanı başvuruya açık."

      });

    }


    if (
      actionState ===
      "closed"
    ) {

      adjustments.push({

        id:
          "expired-job",

        value:
          -30,

        reason:
          "İş ilanı başvuru süresi geçmiş."

      });

    }


    return;

  }


  /* =======================================================
     MAĞAZA
     ========================================================= */

  if (
    category ===
    "stores"
  ) {

    if (
      post?.details?.stockStatus
    ) {

      adjustments.push({

        id:
          "stock-info",

        value:
          2,

        reason:
          "Ürün stok bilgisi mevcut."

      });

    }

  }

}


/* =========================================================
   DEADLINE DÜZELTMESİ
   ========================================================= */

function applyDeadlineAdjustment({

  category,
  actionState,
  daysUntilDeadline,
  adjustments

}) {

  if (
    category ===
    "news"
  ) {

    return;

  }


  if (
    daysUntilDeadline ===
    null
  ) {

    return;

  }


  if (
    daysUntilDeadline <
    0
  ) {

    adjustments.push({

      id:
        "deadline-passed",

      value:
        -18,

      reason:
        "Belirtilen son işlem tarihi geçmiş."

    });


    return;

  }


  if (
    actionState ===
    "closing_today"
    ||
    daysUntilDeadline ===
    0
  ) {

    adjustments.push({

      id:
        "deadline-today",

      value:
        10,

      reason:
        "Son başvuru/kayıt tarihi bugün."

    });


    return;

  }


  if (
    daysUntilDeadline <=
    2
  ) {

    adjustments.push({

      id:
        "deadline-very-close",

      value:
        8,

      reason:
        "Son başvuru/kayıt tarihine çok az kaldı."

    });


    return;

  }


  if (
    daysUntilDeadline <=
    7
  ) {

    adjustments.push({

      id:
        "deadline-close",

      value:
        5,

      reason:
        "Son başvuru/kayıt tarihi yaklaşıyor."

    });

  }

}


/* =========================================================
   YAKLAŞAN BAŞLANGIÇ
   ========================================================= */

function applyUpcomingAdjustment({

  category,
  timeState,
  daysUntilStart,
  adjustments

}) {

  if (
    ![
      "course",
      "event"
    ].includes(
      category
    )
  ) {

    return;

  }


  if (
    timeState !==
    "future"
    ||
    daysUntilStart ===
    null
    ||
    daysUntilStart <
    0
  ) {

    return;

  }


  if (
    daysUntilStart <=
    3
  ) {

    adjustments.push({

      id:
        "starts-very-soon",

      value:
        7,

      reason:
        "İçerik birkaç gün içinde başlıyor."

    });


    return;

  }


  if (
    daysUntilStart <=
    7
  ) {

    adjustments.push({

      id:
        "starts-soon",

      value:
        5,

      reason:
        "İçerik bir hafta içinde başlıyor."

    });


    return;

  }


  if (
    daysUntilStart <=
    21
  ) {

    adjustments.push({

      id:
        "starts-current-window",

      value:
        3,

      reason:
        "Başlangıç tarihi yakın dönem içinde."

    });

  }

}


/* =========================================================
   RANKING BAND
   ========================================================= */

function getRankingBand(
  score
) {

  const value =
    safeNumber(
      score
    );


  if (
    value >=
    85
  ) {

    return "priority";

  }


  if (
    value >=
    70
  ) {

    return "high";

  }


  if (
    value >=
    45
  ) {

    return "normal";

  }


  return "low";

}


/* =========================================================
   POST RANKING SCORE
   ========================================================= */

function getPostRankingScore(
  post
) {

  const direct =
    nullableNumber(
      post?.rankingScore
    );


  if (
    direct !==
    null
  ) {

    return direct;

  }


  const meta =
    nullableNumber(
      post?.rankingMeta?.score
    );


  if (
    meta !==
    null
  ) {

    return meta;

  }


  return safeNumber(
    post?.scoring?.final
  );

}


/* =========================================================
   PUBLISHED TIMESTAMP
   ========================================================= */

function getPublishedTimestamp(
  post
) {

  const values = [

    post?.temporal?.publishedAt,

    post?.source?.publishedAt,

    post?.lifecycle?.publishedAt

  ];


  for (
    const value
    of values
  ) {

    const timestamp =
      parseLooseDateTimestamp(
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
   TARİH → TIMESTAMP
   ========================================================= */

function parseLooseDateTimestamp(
  value
) {

  const text =
    cleanString(
      value
    );


  if (
    !text
  ) {

    return 0;

  }


  /* -------------------------------------------------------
     ISO
     ------------------------------------------------------- */

  const isoTimestamp =
    Date.parse(
      text
    );


  if (
    Number.isFinite(
      isoTimestamp
    )
  ) {

    return isoTimestamp;

  }


  /* -------------------------------------------------------
     08.10.2026
     ------------------------------------------------------- */

  let match =
    text.match(
      /^(\d{1,2})[.\/-](\d{1,2})[.\/-](20\d{2})$/
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
     8 Ekim 2026
     ------------------------------------------------------- */

  match =
    text.match(

      /^(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+(20\d{2})$/i

    );


  if (
    match
  ) {

    const month =
      turkishMonthNumber(
        match[2]
      );


    if (
      month >
      0
    ) {

      return Date.UTC(

        Number(
          match[3]
        ),

        month -
        1,

        Number(
          match[1]
        )

      );

    }

  }


  return 0;

}


/* =========================================================
   TÜRKÇE AY
   ========================================================= */

function turkishMonthNumber(
  value
) {

  const map = {

    ocak:
      1,

    subat:
      2,

    mart:
      3,

    nisan:
      4,

    mayis:
      5,

    haziran:
      6,

    temmuz:
      7,

    agustos:
      8,

    eylul:
      9,

    ekim:
      10,

    kasim:
      11,

    aralik:
      12

  };


  return (
    map[
      normalizeText(
        value
      )
    ]
    ||
    0
  );

}


/* =========================================================
   SCORE MAP ROUND
   ========================================================= */

function mapRoundedScores(
  values
) {

  const output =
    {};


  for (
    const [
      key,
      value
    ]
    of Object.entries(
      values
    )
  ) {

    output[
      key
    ] =
      roundScore(
        value
      );

  }


  return output;

}


/* =========================================================
   FALLBACK
   ========================================================= */

function createFallbackRanking() {

  return {

    version:
      RANKING_VERSION,

    score:
      0,

    baseScore:
      0,

    adjustmentTotal:
      0,

    band:
      "low",

    components:
      {},

    weights:
      {},

    adjustments:
      [],

    category:
      "",

    section:
      "",

    contentIntent:
      "",

    timeState:
      "unknown",

    eventStatus:
      "unknown",

    freshness:
      "unknown",

    actionState:
      "unknown",

    rankedAt:
      new Date()
        .toISOString()

  };

}


/* =========================================================
   ROUND
   ========================================================= */

function roundScore(
  value
) {

  return Math.round(
    safeNumber(
      value
    )
    *
    10
  )
  /
  10;

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
   NON NEGATIVE
   ========================================================= */

function nonNegativeNumber(
  value
) {

  return Math.max(
    0,
    safeNumber(
      value
    )
  );

}


/* =========================================================
   NULLABLE NUMBER

   0 geçerli değerdir.
   ========================================================= */

function nullableNumber(
  value
) {

  if (
    value ===
    null
    ||
    value ===
    undefined
    ||
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


/* =========================================================
   CLAMP
   ========================================================= */

function clamp(
  value,
  min,
  max
) {

  const number =
    safeNumber(
      value
    );


  return Math.max(

    min,

    Math.min(
      max,
      number
    )

  );

}


/* =========================================================
   ID NORMALİZE
   ========================================================= */

function normalizeId(
  value
) {

  return normalizeText(
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
   TEXT NORMALİZE
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
    );

}


/* =========================================================
   CLEAN STRING
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
