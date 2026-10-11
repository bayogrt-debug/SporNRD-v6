/* =========================================================
   SporNRD
   worker/intelligence/selectionEngine.js

   SporNRD İçerik Seçim / Değer Motoru

   Sürüm: 6.1.0

   AMAÇ
   ---------------------------------------------------------
   Kaynaklardan gelen her içeriği doğrudan akışa almak yerine
   önce kullanıcı değeri açısından değerlendirmek.

   6 ANA ÖLÇÜT
   ---------------------------------------------------------
   1. usefulness   → Kullanıcı yararı
   2. importance   → Önem / haber değeri
   3. opportunity  → Fırsat / aksiyon değeri
   4. timeliness   → Zaman değeri
   5. trust        → Güvenilirlik
   6. interest     → İlgi / dikkat çekme potansiyeli

   ANA KATEGORİLER
   ---------------------------------------------------------
   news
   course
   event
   campaign
   jobs
   stores

   TEMEL PRENSİP
   ---------------------------------------------------------
   Çok sayıda küçük sinyal
        ↓
   6 ana ölçüt
        ↓
   Kategori / alt kategori ağırlıkları
        ↓
   Selection Score
        ↓
   selected / borderline / rejected

   NOT
   ---------------------------------------------------------
   Bu motor internet arama hacmini zorunlu kabul etmez.
   Eğer ileride gerçek trend / arama verisi sağlanırsa
   interest metriğine ek sinyal olarak kullanılabilir.
   ========================================================= */


/* =========================================================
   VERSION
   ========================================================= */

export const SELECTION_ENGINE_VERSION =
  "1.0";


/* =========================================================
   DECISIONS
   ========================================================= */

export const SELECTION_DECISIONS = {

  selected:
    "selected",

  borderline:
    "borderline",

  rejected:
    "rejected"

};


/* =========================================================
   THRESHOLDS
   ========================================================= */

const SELECT_THRESHOLD =
  62;


const BORDERLINE_THRESHOLD =
  48;


/* =========================================================
   CATEGORY WEIGHTS

   Toplam her profilde 1.00 olmalıdır.
   ========================================================= */

const CATEGORY_WEIGHTS = {

  news: {

    usefulness:
      0.15,

    importance:
      0.28,

    opportunity:
      0.05,

    timeliness:
      0.12,

    trust:
      0.15,

    interest:
      0.25

  },


  course: {

    usefulness:
      0.28,

    importance:
      0.10,

    opportunity:
      0.24,

    timeliness:
      0.20,

    trust:
      0.13,

    interest:
      0.05

  },


  event: {

    usefulness:
      0.20,

    importance:
      0.12,

    opportunity:
      0.20,

    timeliness:
      0.23,

    trust:
      0.13,

    interest:
      0.12

  },


  campaign: {

    usefulness:
      0.18,

    importance:
      0.05,

    opportunity:
      0.30,

    timeliness:
      0.25,

    trust:
      0.17,

    interest:
      0.05

  },


  jobs: {

    usefulness:
      0.27,

    importance:
      0.08,

    opportunity:
      0.26,

    timeliness:
      0.18,

    trust:
      0.16,

    interest:
      0.05

  },


  stores: {

    usefulness:
      0.19,

    importance:
      0.05,

    opportunity:
      0.23,

    timeliness:
      0.12,

    trust:
      0.21,

    interest:
      0.20

  },


  default: {

    usefulness:
      0.20,

    importance:
      0.20,

    opportunity:
      0.15,

    timeliness:
      0.15,

    trust:
      0.15,

    interest:
      0.15

  }

};


/* =========================================================
   ANA ANALİZ
   ========================================================= */

export function analyzeSelection(
  post
) {

  if (
    !post ||
    typeof post !==
    "object"
  ) {

    return createFallbackSelection();

  }


  const category =
    normalizeCategory(
      post.category
    );


  const subCategory =
    normalizeId(
      post.subCategory
    );


  const section =
    normalizeId(
      post.section
    );


  const contentIntent =
    normalizeId(
      post.contentIntent
    );


  const text =
    buildSearchText(
      post
    );


  const metrics = {

    usefulness:
      calculateUsefulness({

        post:
          post,

        category:
          category,

        subCategory:
          subCategory,

        section:
          section,

        contentIntent:
          contentIntent,

        text:
          text

      }),


    importance:
      calculateImportance({

        post:
          post,

        category:
          category,

        subCategory:
          subCategory,

        contentIntent:
          contentIntent,

        text:
          text

      }),


    opportunity:
      calculateOpportunity({

        post:
          post,

        category:
          category,

        contentIntent:
          contentIntent,

        text:
          text

      }),


    timeliness:
      calculateTimeliness({

        post:
          post,

        category:
          category,

        contentIntent:
          contentIntent

      }),


    trust:
      calculateTrust({

        post:
          post

      }),


    interest:
      calculateInterest({

        post:
          post,

        category:
          category,

        subCategory:
          subCategory,

        contentIntent:
          contentIntent,

        text:
          text

      })

  };


  const weights =
    resolveWeights({

      category:
        category,

      subCategory:
        subCategory,

      contentIntent:
        contentIntent

    });


  const baseScore =
    weightedScore(
      metrics,
      weights
    );


  const adjustments =
    calculateAdjustments({

      post:
        post,

      category:
        category,

      subCategory:
        subCategory,

      section:
        section,

      contentIntent:
        contentIntent,

      text:
        text,

      metrics:
        metrics

    });


  const selectionScore =
    clamp(

      round1(

        baseScore +
        adjustments.total

      ),

      0,
      100

    );


  const hardDecision =
    determineHardDecision({

      post:
        post,

      category:
        category,

      contentIntent:
        contentIntent,

      text:
        text

    });


  const decision =
    hardDecision

    ||

    scoreToDecision(
      selectionScore
    );


  const selected =
    decision ===
    SELECTION_DECISIONS.selected;


  const userValue =
    scoreToValueBand(
      selectionScore
    );


  const reasons = [

    ...buildMetricReasons(
      metrics
    ),

    ...adjustments.reasons

  ];


  if (
    hardDecision ===
    SELECTION_DECISIONS.rejected
  ) {

    reasons.unshift(
      "İçerik güçlü eleme kuralına takıldı."
    );

  }


  return {

    version:
      SELECTION_ENGINE_VERSION,


    selected:
      selected,


    decision:
      decision,


    selectionScore:
      selectionScore,


    userValue:
      userValue,


    category:
      category ||
      "unknown",


    subCategory:
      subCategory ||
      "unknown",


    section:
      section ||
      "unknown",


    contentIntent:
      contentIntent ||
      "unknown",


    metrics:
      roundMetricMap(
        metrics
      ),


    weights:
      roundMetricMap(
        weights
      ),


    baseScore:
      round1(
        baseScore
      ),


    adjustmentTotal:
      round1(
        adjustments.total
      ),


    adjustments:
      adjustments.items,


    reasons:
      [
        ...new Set(
          reasons
        )
      ],


    analyzedAt:
      new Date()
        .toISOString()

  };

}


/* =========================================================
   POSTA UYGULA
   ========================================================= */

export function applySelection(
  post
) {

  if (
    !post ||
    typeof post !==
    "object"
  ) {

    return post;

  }


  const selection =
    analyzeSelection(
      post
    );


  return {

    ...post,


    selected:
      selection.selected,


    selectionScore:
      selection.selectionScore,


    selectionMeta: {

      version:
        selection.version,


      decision:
        selection.decision,


      userValue:
        selection.userValue,


      metrics:
        selection.metrics,


      weights:
        selection.weights,


      baseScore:
        selection.baseScore,


      adjustmentTotal:
        selection.adjustmentTotal,


      adjustments:
        selection.adjustments,


      reasons:
        selection.reasons,


      analyzedAt:
        selection.analyzedAt

    }

  };

}


/* =========================================================
   LİSTEYE UYGULA
   ========================================================= */

export function applySelectionToPosts(
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
      applySelection
    )

    .filter(
      Boolean
    );

}


/* =========================================================
   SEÇİLENLERİ FİLTRELE
   ========================================================= */

export function filterSelectedPosts(
  posts,
  {
    includeBorderline = false
  } = {}
) {

  if (
    !Array.isArray(
      posts
    )
  ) {

    return [];

  }


  return posts.filter(
    post => {

      const decision =
        normalizeId(
          post?.selectionMeta?.decision
        );


      if (
        decision ===
        SELECTION_DECISIONS.selected
      ) {

        return true;

      }


      if (
        includeBorderline &&
        decision ===
        SELECTION_DECISIONS.borderline
      ) {

        return true;

      }


      return false;

    }
  );

}


/* =========================================================
   SUMMARY
   ========================================================= */

export function createSelectionSummary(
  posts
) {

  const items =
    Array.isArray(
      posts
    )
      ? posts
      : [];


  const decisions =
    {};


  const values =
    {};


  const categories =
    {};


  let totalScore =
    0;


  let counted =
    0;


  for (
    const post
    of items
  ) {

    const decision =
      normalizeId(
        post?.selectionMeta?.decision
      )
      ||
      "unknown";


    const valueBand =
      normalizeId(
        post?.selectionMeta?.userValue
      )
      ||
      "unknown";


    const category =
      normalizeCategory(
        post?.category
      )
      ||
      "unknown";


    increment(
      decisions,
      decision
    );


    increment(
      values,
      valueBand
    );


    increment(
      categories,
      category
    );


    const score =
      Number(
        post?.selectionScore
      );


    if (
      Number.isFinite(
        score
      )
    ) {

      totalScore +=
        score;


      counted++;

    }

  }


  return {

    version:
      SELECTION_ENGINE_VERSION,


    count:
      items.length,


    averageScore:
      counted

        ? round1(
            totalScore /
            counted
          )

        : 0,


    decisions:
      decisions,


    userValues:
      values,


    categories:
      categories

  };

}


/* =========================================================
   1. KULLANICI YARARI
   ========================================================= */

function calculateUsefulness({

  post,
  category,
  subCategory,
  section,
  contentIntent,
  text

}) {

  let score =
    35;


  if (
    [
      "course",
      "event",
      "campaign",
      "jobs"
    ].includes(
      category
    )
  ) {

    score +=
      20;

  }


  if (
    [
      "registration",
      "job",
      "campaign",
      "opportunity"
    ].includes(
      contentIntent
    )
  ) {

    score +=
      20;

  }


  if (
    post?.actionable ===
    true
  ) {

    score +=
      10;

  }


  if (
    hasUsefulStructuredData(
      post
    )
  ) {

    score +=
      10;

  }


  if (
    section ===
    "trainer_coach"

    &&

    containsAnyPhrase(
      text,
      [
        "antrenor",
        "hakem",
        "seminer",
        "kurs",
        "vize",
        "sertifika"
      ]
    )
  ) {

    score +=
      8;

  }


  if (
    category ===
    "news"

    &&

    [
      "result",
      "achievement",
      "assignment",
      "transfer"
    ].includes(
      contentIntent
    )
  ) {

    score +=
      8;

  }


  if (
    subCategory ===
    "announcement"

    &&

    !hasUsefulStructuredData(
      post
    )
  ) {

    score -=
      8;

  }


  return clamp(
    score,
    0,
    100
  );

}


/* =========================================================
   2. ÖNEM / HABER DEĞERİ
   ========================================================= */

function calculateImportance({

  post,
  category,
  contentIntent,
  text

}) {

  let score =
    30;


  if (
    category ===
    "news"
  ) {

    score +=
      15;

  }


  if (
    contentIntent ===
    "result"
  ) {

    score +=
      22;

  }


  if (
    contentIntent ===
    "achievement"
  ) {

    score +=
      25;

  }


  if (
    contentIntent ===
    "assignment"
  ) {

    score +=
      12;

  }


  if (
    contentIntent ===
    "transfer"
  ) {

    score +=
      12;

  }


  if (
    containsAnyPhrase(
      text,
      [
        "dunya sampiyon",
        "avrupa sampiyon",
        "turkiye sampiyon",
        "milli takim",
        "rekor kirdi",
        "madalya kazandi",
        "kupa",
        "final",
        "sampiyon oldu"
      ]
    )
  ) {

    score +=
      12;

  }


  if (
    post?.trust?.verified ===
    true

    ||

    post?.source?.verified ===
    true
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
   3. FIRSAT / AKSİYON DEĞERİ
   ========================================================= */

function calculateOpportunity({

  post,
  category,
  contentIntent,
  text

}) {

  let score =
    15;


  if (
    [
      "registration",
      "campaign",
      "job",
      "product",
      "opportunity"
    ].includes(
      contentIntent
    )
  ) {

    score +=
      35;

  }


  if (
    post?.actionable ===
    true
  ) {

    score +=
      20;

  }


  if (
    [
      "course",
      "event",
      "campaign",
      "jobs",
      "stores"
    ].includes(
      category
    )
  ) {

    score +=
      10;

  }


  if (
    containsAnyPhrase(
      text,
      [
        "son basvuru",
        "kayitlar basladi",
        "basvurular basladi",
        "bilet",
        "katilim",
        "satin al",
        "indirim",
        "personel araniyor",
        "antrenor araniyor"
      ]
    )
  ) {

    score +=
      15;

  }


  if (
    [
      "result",
      "achievement",
      "news",
      "announcement"
    ].includes(
      contentIntent
    )
  ) {

    score -=
      10;

  }


  return clamp(
    score,
    0,
    100
  );

}


/* =========================================================
   4. ZAMAN DEĞERİ
   ========================================================= */

function calculateTimeliness({

  post,
  category,
  contentIntent

}) {

  const temporal =
    isPlainObject(
      post?.temporal
    )
      ? post.temporal
      : {};


  const state =
    normalizeId(
      temporal.state
    );


  const freshness =
    normalizeId(
      temporal.freshness
    );


  const actionState =
    normalizeId(
      temporal.actionState
    );


  const daysUntilStart =
    nullableNumber(
      temporal.daysUntilStart
    );


  const daysUntilDeadline =
    nullableNumber(
      temporal.daysUntilDeadline
    );


  let score =
    35;


  if (
    state ===
    "future"
  ) {

    score +=
      20;

  }


  if (
    state ===
    "present"
  ) {

    score +=
      25;

  }


  if (
    state ===
    "past"
  ) {

    if (
      category ===
      "news"

      ||

      [
        "result",
        "achievement",
        "assignment",
        "transfer"
      ].includes(
        contentIntent
      )
    ) {

      score +=
        5;

    }

    else {

      score -=
        30;

    }

  }


  if (
    [
      "today",
      "yesterday",
      "recent"
    ].includes(
      freshness
    )
  ) {

    score +=
      15;

  }


  if (
    freshness ===
    "current"
  ) {

    score +=
      8;

  }


  if (
    [
      "older",
      "old"
    ].includes(
      freshness
    )
  ) {

    score -=
      8;

  }


  if (
    actionState ===
    "closing_today"
  ) {

    score +=
      20;

  }


  if (
    actionState ===
    "closed"
  ) {

    score -=
      35;

  }


  if (
    daysUntilDeadline !==
    null

    &&

    daysUntilDeadline >=
    0

    &&

    daysUntilDeadline <=
    7
  ) {

    score +=
      15;

  }


  if (
    daysUntilStart !==
    null

    &&

    daysUntilStart >=
    0

    &&

    daysUntilStart <=
    14
  ) {

    score +=
      10;

  }


  return clamp(
    score,
    0,
    100
  );

}


/* =========================================================
   5. GÜVENİLİRLİK
   ========================================================= */

function calculateTrust({
  post
}) {

  let score =
    35;


  if (
    post?.source?.verified ===
    true

    ||

    post?.trust?.verified ===
    true
  ) {

    score +=
      35;

  }


  const confidence =
    nullableNumber(
      post?.trust?.confidenceScore
    );


  if (
    confidence !==
    null
  ) {

    score +=
      Math.min(
        20,
        confidence *
        0.2
      );

  }


  const evidenceCount =
    nullableNumber(
      post?.trust?.evidenceCount
    );


  if (
    evidenceCount !==
    null

    &&

    evidenceCount >
    0
  ) {

    score +=
      Math.min(
        10,
        evidenceCount *
        2
      );

  }


  if (
    cleanString(
      post?.source?.url
    )
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
   6. İLGİ DEĞERİ
   ========================================================= */

function calculateInterest({

  post,
  category,
  contentIntent,
  text

}) {

  let score =
    30;


  if (
    [
      "result",
      "achievement",
      "transfer",
      "assignment"
    ].includes(
      contentIntent
    )
  ) {

    score +=
      20;

  }


  if (
    containsAnyPhrase(
      text,
      [
        "sampiyon",
        "rekor",
        "madalya",
        "final",
        "kupa",
        "milli takim",
        "transfer",
        "fiba",
        "euroleague"
      ]
    )
  ) {

    score +=
      15;

  }


  if (
    category ===
    "course"

    &&

    containsAnyPhrase(
      text,
      [
        "1 kademe",
        "2 kademe",
        "3 kademe",
        "antrenor",
        "hakem"
      ]
    )
  ) {

    score +=
      10;

  }


  /*
    İleride dış trend / arama verisi gelirse
    burada kullanılabilir.
  */

  const externalInterest =
    firstNumber(

      post?.trendScore,

      post?.metrics?.trendScore,

      post?.metrics?.searchInterest,

      post?.searchInterest

    );


  if (
    externalInterest !==
    null
  ) {

    score +=
      Math.min(
        25,
        externalInterest *
        0.25
      );

  }


  const interactions =
    isPlainObject(
      post?.interactions
    )
      ? post.interactions
      : {};


  const engagement =

    safeNumber(
      interactions.wow
    ) *
    2

    +

    safeNumber(
      interactions.save
    ) *
    1.5

    +

    safeNumber(
      interactions.share
    ) *
    2;


  if (
    engagement >
    0
  ) {

    score +=
      Math.min(

        20,

        Math.log10(
          engagement +
          1
        ) *
        10

      );

  }


  return clamp(
    score,
    0,
    100
  );

}


/* =========================================================
   CATEGORY / SUBCATEGORY WEIGHTS
   ========================================================= */

function resolveWeights({

  category,
  subCategory,
  contentIntent

}) {

  const base = {

    ...(
      CATEGORY_WEIGHTS[
        category
      ]
      ||
      CATEGORY_WEIGHTS.default
    )

  };


  /* -------------------------------------------------------
     HABER ALT TÜRLERİ
     ------------------------------------------------------- */

  if (
    category ===
    "news"
  ) {

    if (
      [
        "result",
        "achievement"
      ].includes(
        contentIntent
      )
    ) {

      base.importance +=
        0.05;


      base.interest +=
        0.05;


      base.opportunity -=
        0.05;


      base.usefulness -=
        0.05;

    }


    if (
      [
        "assignment",
        "transfer"
      ].includes(
        contentIntent
      )
    ) {

      base.importance +=
        0.04;


      base.usefulness +=
        0.02;


      base.interest +=
        0.04;


      base.opportunity -=
        0.05;


      base.timeliness -=
        0.05;

    }

  }


  /* -------------------------------------------------------
     KURS
     ------------------------------------------------------- */

  if (
    category ===
    "course"

    &&

    [
      "registration",
      "opportunity"
    ].includes(
      contentIntent
    )
  ) {

    base.opportunity +=
      0.04;


    base.timeliness +=
      0.03;


    base.importance -=
      0.04;


    base.interest -=
      0.03;

  }


  /* -------------------------------------------------------
     ETKİNLİK EĞİTİM / SEMİNER
     ------------------------------------------------------- */

  if (
    category ===
    "event"

    &&

    [
      "education",
      "seminar"
    ].includes(
      subCategory
    )
  ) {

    base.usefulness +=
      0.04;


    base.opportunity +=
      0.03;


    base.interest -=
      0.04;


    base.importance -=
      0.03;

  }


  return normalizeWeights(
    base
  );

}


/* =========================================================
   AYARLAMALAR
   ========================================================= */

function calculateAdjustments({

  post,
  category,
  contentIntent,
  text,
  metrics

}) {

  let total =
    0;


  const items =
    [];


  const reasons =
    [];


  function add(
    value,
    code,
    reason
  ) {

    total +=
      value;


    items.push({

      code:
        code,

      value:
        value,

      reason:
        reason

    });


    reasons.push(
      reason
    );

  }


  /* -------------------------------------------------------
     DOĞRULANMIŞ KAYNAK
     ------------------------------------------------------- */

  if (
    post?.source?.verified ===
    true

    ||

    post?.trust?.verified ===
    true
  ) {

    add(
      3,
      "verified-source",
      "Doğrulanmış kaynak."
    );

  }


  /* -------------------------------------------------------
     YÜKSEK VERİ KALİTESİ
     ------------------------------------------------------- */

  if (
    metrics.trust >=
    80

    &&

    hasUsefulStructuredData(
      post
    )
  ) {

    add(
      3,
      "rich-trusted-data",
      "Güvenilir ve yapılandırılmış bilgi birlikte mevcut."
    );

  }


  /* -------------------------------------------------------
     SONUÇ / BAŞARI HABERİ
     ------------------------------------------------------- */

  if (
    category ===
    "news"

    &&

    [
      "result",
      "achievement"
    ].includes(
      contentIntent
    )
  ) {

    add(
      5,
      "sports-value",
      "Gerçek spor sonucu veya başarı değeri taşıyor."
    );

  }


  /* -------------------------------------------------------
     AKTİF FIRSAT
     ------------------------------------------------------- */

  if (
    post?.actionable ===
    true

    &&

    [
      "course",
      "event",
      "campaign",
      "jobs",
      "stores"
    ].includes(
      category
    )
  ) {

    add(
      5,
      "actionable-value",
      "Kullanıcının değerlendirebileceği aktif işlem/fırsat sinyali var."
    );

  }


  /* -------------------------------------------------------
     RUTİN KURUMSAL GÜRÜLTÜ
     ------------------------------------------------------- */

  if (
    category ===
    "news"

    &&

    containsAnyPhrase(
      text,
      [
        "nezaket ziyareti",
        "makaminda ziyaret",
        "ziyarette bulundu",
        "hatira fotografi",
        "tesekkur ziyareti"
      ]
    )

    &&

    !containsAnyPhrase(
      text,
      [
        "protokol imzalandi",
        "is birligi protokolu",
        "yeni proje",
        "yatirim",
        "tesis acilisi"
      ]
    )
  ) {

    add(
      -22,
      "institutional-noise",
      "Rutin kurumsal/ziyaret içeriği kullanıcı değerini düşürüyor."
    );

  }


  /* -------------------------------------------------------
     TEKNİK / SİTE DUYURUSU
     ------------------------------------------------------- */

  if (
    containsAnyPhrase(
      text,
      [
        "web sitesi bakim",
        "sistem bakim",
        "teknik bakim",
        "sunucu bakim",
        "site erisim sorunu"
      ]
    )
  ) {

    add(
      -30,
      "technical-noise",
      "Teknik sistem duyurusu SporNRD ana akışı için düşük değerli."
    );

  }


  /* -------------------------------------------------------
     EKSİK İÇERİK
     ------------------------------------------------------- */

  if (
    !hasMeaningfulEditorialContent(
      post
    )
  ) {

    add(
      -25,
      "thin-content",
      "İçerik yeterli başlık/açıklama bilgisi taşımıyor."
    );

  }


  /* -------------------------------------------------------
     KAPANMIŞ FIRSAT
     ------------------------------------------------------- */

  if (
    normalizeId(
      post?.temporal?.actionState
    ) ===
    "closed"

    &&

    category !==
    "news"
  ) {

    add(
      -20,
      "closed-opportunity",
      "Kullanıcı aksiyonu kapanmış içerik."
    );

  }


  return {

    total:
      total,

    items:
      items,

    reasons:
      reasons

  };

}


/* =========================================================
   HARD DECISION
   ========================================================= */

function determineHardDecision({

  post,
  category,
  contentIntent,
  text

}) {

  if (
    !hasMeaningfulEditorialContent(
      post
    )
  ) {

    return SELECTION_DECISIONS.rejected;

  }


  if (
    containsAnyPhrase(
      text,
      [
        "web sitesi bakim",
        "sistem bakim",
        "teknik bakim",
        "sunucu bakim"
      ]
    )
  ) {

    return SELECTION_DECISIONS.rejected;

  }


  /*
    Güçlü spor haberleri sırf aksiyon içermediği için
    zorla elenmez.
  */

  if (
    category ===
    "news"

    &&

    [
      "result",
      "achievement",
      "assignment",
      "transfer"
    ].includes(
      contentIntent
    )
  ) {

    return null;

  }


  return null;

}


/* =========================================================
   SCORE → DECISION
   ========================================================= */

function scoreToDecision(
  score
) {

  if (
    score >=
    SELECT_THRESHOLD
  ) {

    return SELECTION_DECISIONS.selected;

  }


  if (
    score >=
    BORDERLINE_THRESHOLD
  ) {

    return SELECTION_DECISIONS.borderline;

  }


  return SELECTION_DECISIONS.rejected;

}


/* =========================================================
   SCORE → VALUE BAND
   ========================================================= */

function scoreToValueBand(
  score
) {

  if (
    score >=
    82
  ) {

    return "very_high";

  }


  if (
    score >=
    68
  ) {

    return "high";

  }


  if (
    score >=
    52
  ) {

    return "medium";

  }


  return "low";

}


/* =========================================================
   WEIGHTED SCORE
   ========================================================= */

function weightedScore(
  metrics,
  weights
) {

  let total =
    0;


  for (
    const key
    of [
      "usefulness",
      "importance",
      "opportunity",
      "timeliness",
      "trust",
      "interest"
    ]
  ) {

    total +=

      safeNumber(
        metrics[
          key
        ]
      )

      *

      safeNumber(
        weights[
          key
        ]
      );

  }


  return total;

}


/* =========================================================
   NORMALIZE WEIGHTS
   ========================================================= */

function normalizeWeights(
  weights
) {

  const output = {

    usefulness:
      Math.max(
        0,
        safeNumber(
          weights.usefulness
        )
      ),

    importance:
      Math.max(
        0,
        safeNumber(
          weights.importance
        )
      ),

    opportunity:
      Math.max(
        0,
        safeNumber(
          weights.opportunity
        )
      ),

    timeliness:
      Math.max(
        0,
        safeNumber(
          weights.timeliness
        )
      ),

    trust:
      Math.max(
        0,
        safeNumber(
          weights.trust
        )
      ),

    interest:
      Math.max(
        0,
        safeNumber(
          weights.interest
        )
      )

  };


  const total =
    Object.values(
      output
    )
      .reduce(
        (sum, value) =>
          sum +
          value,
        0
      );


  if (
    total <=
    0
  ) {

    return {
      ...CATEGORY_WEIGHTS.default
    };

  }


  for (
    const key
    of Object.keys(
      output
    )
  ) {

    output[
      key
    ] =
      output[
        key
      ]
      /
      total;

  }


  return output;

}


/* =========================================================
   METRIC REASONS
   ========================================================= */

function buildMetricReasons(
  metrics
) {

  const reasons =
    [];


  if (
    metrics.usefulness >=
    70
  ) {

    reasons.push(
      "Kullanıcı yararı yüksek."
    );

  }


  if (
    metrics.importance >=
    70
  ) {

    reasons.push(
      "Önem/haber değeri yüksek."
    );

  }


  if (
    metrics.opportunity >=
    70
  ) {

    reasons.push(
      "Fırsat/aksiyon değeri yüksek."
    );

  }


  if (
    metrics.timeliness >=
    70
  ) {

    reasons.push(
      "Zaman değeri yüksek."
    );

  }


  if (
    metrics.trust >=
    80
  ) {

    reasons.push(
      "Kaynak güveni yüksek."
    );

  }


  if (
    metrics.interest >=
    70
  ) {

    reasons.push(
      "İlgi potansiyeli yüksek."
    );

  }


  return reasons;

}


/* =========================================================
   STRUCTURED DATA VAR MI?
   ========================================================= */

function hasUsefulStructuredData(
  post
) {

  const details =
    isPlainObject(
      post?.details
    )
      ? post.details
      : {};


  const location =
    isPlainObject(
      post?.location
    )
      ? post.location
      : {};


  const fields = [

    details.startDate,

    details.endDate,

    details.startDateIso,

    details.endDateIso,

    details.registrationDeadline,

    details.applicationDeadline,

    details.deadlineIso,

    details.position,

    details.price,

    details.salePrice,

    details.discountRate,

    details.ageMin,

    details.ageMax,

    details.level,

    location.city,

    location.district,

    location.venue

  ];


  return fields.some(
    hasUsefulValue
  );

}


/* =========================================================
   ANLAMLI İÇERİK VAR MI?
   ========================================================= */

function hasMeaningfulEditorialContent(
  post
) {

  const title =
    firstString(

      post?.editorial?.originalTitle,

      post?.originalTitle,

      post?.editorial?.headline,

      post?.title

    );


  const body =
    firstString(

      post?.editorial?.originalText,

      post?.originalText,

      post?.editorial?.influencerText,

      post?.summary

    );


  return Boolean(

    title.length >=
    5

    ||

    body.length >=
    20

  );

}


/* =========================================================
   SEARCH TEXT
   ========================================================= */

function buildSearchText(
  post
) {

  const values = [

    post?.editorial?.originalTitle,

    post?.editorial?.originalText,

    post?.editorial?.headline,

    post?.editorial?.influencerText,

    post?.originalTitle,

    post?.originalText,

    post?.title,

    post?.summary,

    post?.source?.name,

    post?.source?.shortName,

    post?.sport,

    post?.section,

    post?.category,

    post?.subCategory,

    post?.contentType,

    post?.contentIntent,

    post?.providerType

  ];


  if (
    Array.isArray(
      post?.tags
    )
  ) {

    values.push(
      ...post.tags
    );

  }


  if (
    isPlainObject(
      post?.details
    )
  ) {

    values.push(
      ...flattenValues(
        post.details
      )
    );

  }


  return normalizeText(

    values
      .filter(
        value =>
          value !==
          null

          &&

          value !==
          undefined
      )
      .join(
        " "
      )

  );

}


/* =========================================================
   CATEGORY NORMALIZE
   ========================================================= */

function normalizeCategory(
  value
) {

  const id =
    normalizeId(
      value
    );


  const aliases = {

    sports_news:
      "news",

    courses:
      "course",

    events:
      "event",

    campaigns:
      "campaign"

  };


  return (

    aliases[
      id
    ]

    ||

    id

  );

}


/* =========================================================
   PHRASE MATCH
   ========================================================= */

function containsPhrase(
  text,
  value
) {

  const haystack =
    ` ${normalizeText(
      text
    )} `;


  const needle =
    normalizeText(
      value
    );


  if (
    !needle
  ) {

    return false;

  }


  return haystack.includes(
    ` ${needle} `
  );

}


function containsAnyPhrase(
  text,
  values
) {

  return values.some(
    value =>
      containsPhrase(
        text,
        value
      )
  );

}


/* =========================================================
   FLATTEN
   ========================================================= */

function flattenValues(
  value
) {

  const output =
    [];


  if (
    !isPlainObject(
      value
    )
  ) {

    return output;

  }


  for (
    const item
    of Object.values(
      value
    )
  ) {

    if (
      item ===
      null

      ||

      item ===
      undefined
    ) {

      continue;

    }


    if (
      Array.isArray(
        item
      )
    ) {

      output.push(
        ...item
      );


      continue;

    }


    if (
      isPlainObject(
        item
      )
    ) {

      output.push(
        ...flattenValues(
          item
        )
      );


      continue;

    }


    output.push(
      item
    );

  }


  return output;

}


/* =========================================================
   FALLBACK
   ========================================================= */

function createFallbackSelection() {

  return {

    version:
      SELECTION_ENGINE_VERSION,


    selected:
      false,


    decision:
      SELECTION_DECISIONS.rejected,


    selectionScore:
      0,


    userValue:
      "low",


    category:
      "unknown",


    subCategory:
      "unknown",


    section:
      "unknown",


    contentIntent:
      "unknown",


    metrics: {

      usefulness:
        0,

      importance:
        0,

      opportunity:
        0,

      timeliness:
        0,

      trust:
        0,

      interest:
        0

    },


    weights:
      {
        ...CATEGORY_WEIGHTS.default
      },


    baseScore:
      0,


    adjustmentTotal:
      0,


    adjustments:
      [],


    reasons:
      [],


    analyzedAt:
      new Date()
        .toISOString()

  };

}


/* =========================================================
   HELPERS
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


function firstNumber(
  ...values
) {

  for (
    const value
    of values
  ) {

    const number =
      nullableNumber(
        value
      );


    if (
      number !==
      null
    ) {

      return number;

    }

  }


  return null;

}


function hasUsefulValue(
  value
) {

  if (
    value ===
    null

    ||

    value ===
    undefined
  ) {

    return false;

  }


  if (
    typeof value ===
    "string"
  ) {

    return Boolean(
      value.trim()
    );

  }


  if (
    Array.isArray(
      value
    )
  ) {

    return value.length >
    0;

  }


  return true;

}


function increment(
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

    safeNumber(
      target[
        safeKey
      ]
    )

    +

    1;

}


function roundMetricMap(
  value
) {

  const output =
    {};


  for (
    const [
      key,
      item
    ]
    of Object.entries(
      value ||
      {}
    )
  ) {

    output[
      key
    ] =
      round2(
        item
      );

  }


  return output;

}


function round1(
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


function round2(
  value
) {

  return Math.round(

    safeNumber(
      value
    )

    *

    100

  )
  /
  100;

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


function normalizeText(
  value
) {

  return String(
    value ??
    ""
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
      /[^a-z0-9%]+/g,
      " "
    )

    .replace(
      /\s+/g,
      " "
    )

    .trim();

}


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
