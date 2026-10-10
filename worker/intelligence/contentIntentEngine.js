/* =========================================================
   SporNRD
   worker/intelligence/contentIntentEngine.js

   İçerik Niyet / Durum Anlama Motoru

   Sürüm: 6.1.0

   AMAÇ
   ---------------------------------------------------------
   Bir içeriği kategoriye atmadan ÖNCE şunu anlamak:

   - Bu içerik aslında ne anlatıyor?
   - Kullanıcı burada bir şey yapabilir mi?
   - Etkinlik geçmiş mi, yaklaşan mı?
   - Sonuç haberi mi?
   - Kayıt / başvuru duyurusu mu?
   - Kampanya mı?
   - İş ilanı mı?
   - Ürün mü?
   - Yalnızca haber / kurumsal içerik mi?

   TEMEL KURAL
   ---------------------------------------------------------
   Önce ANLA
   sonra SINIFLANDIR
   sonra YAZ.

   Bu motor kaynakta olmayan bilgiyi üretmez.
   Emin olmadığı durumda "unknown" bırakır.
   ========================================================= */


/* =========================================================
   VERSION
   ========================================================= */

export const CONTENT_INTENT_VERSION =
  "1.0";


/* =========================================================
   CONTENT INTENT TÜRLERİ
   ========================================================= */

export const CONTENT_INTENTS = {

  opportunity:
    "opportunity",

  registration:
    "registration",

  result:
    "result",

  announcement:
    "announcement",

  campaign:
    "campaign",

  job:
    "job",

  product:
    "product",

  news:
    "news"

};


/* =========================================================
   EVENT STATUS
   ========================================================= */

export const EVENT_STATUSES = {

  upcoming:
    "upcoming",

  ongoing:
    "ongoing",

  completed:
    "completed",

  unknown:
    "unknown"

};


/* =========================================================
   ANA ANALİZ
   ========================================================= */

export function analyzeContentIntent(
  post
) {

  if (
    !post ||
    typeof post !==
    "object"
  ) {

    return createFallbackResult();

  }


  const text =
    buildSearchText(
      post
    );


  const titleText =
    buildTitleText(
      post
    );


  const scores = {

    opportunity:
      0,

    registration:
      0,

    result:
      0,

    announcement:
      0,

    campaign:
      0,

    job:
      0,

    product:
      0,

    news:
      0

  };


  const reasons =
    [];


  /* =======================================================
     1. İŞ İLANI
     ======================================================= */

  scorePatterns({

    text:
      text,

    target:
      scores,

    key:
      "job",

    patterns: [

      ["is ilani", 8],

      ["personel araniyor", 10],

      ["antrenor araniyor", 10],

      ["egitmen araniyor", 10],

      ["calisma arkadasi ariyoruz", 9],

      ["cv gonder", 9],

      ["ozgecmis gonder", 8],

      ["ise alim", 8],

      ["tam zamanli", 5],

      ["yari zamanli", 5],

      ["part time", 5],

      ["full time", 5]

    ],

    reasons:
      reasons,

    reasonLabel:
      "İş ilanı sinyali"

  });


  /* =======================================================
     2. ÜRÜN / MAĞAZA
     ======================================================= */

  scorePatterns({

    text:
      text,

    target:
      scores,

    key:
      "product",

    patterns: [

      ["sepete ekle", 10],

      ["satin al", 8],

      ["stokta", 8],

      ["stok", 4],

      ["urun fiyati", 7],

      ["kargo", 5],

      ["beden", 3],

      ["numara", 3],

      ["urun", 2]

    ],

    reasons:
      reasons,

    reasonLabel:
      "Ürün / mağaza sinyali"

  });


  /* =======================================================
     3. KAMPANYA
     ======================================================= */

  scorePatterns({

    text:
      text,

    target:
      scores,

    key:
      "campaign",

    patterns: [

      ["kampanya", 10],

      ["indirim", 8],

      ["firsat", 7],

      ["ozel fiyat", 7],

      ["erken kayit indirimi", 10],

      ["uyelik indirimi", 9],

      ["ilk ay ucretsiz", 10],

      ["ilk ders ucretsiz", 9],

      ["deneme dersi ucretsiz", 9],

      ["promosyon", 7],

      ["kupon", 6]

    ],

    reasons:
      reasons,

    reasonLabel:
      "Kampanya sinyali"

  });


  /* =======================================================
     4. SONUÇ / TAMAMLANMIŞ OLAY

     Özellikle:
     "Şampiyon Fenerbahçe"
     "kupayı kazandı"
     "finalde..."
     "tebrik ederiz"

     gibi içerikleri yakalar.
     ======================================================= */

  scorePatterns({

    text:
      text,

    target:
      scores,

    key:
      "result",

    patterns: [

      ["sampiyon oldu", 12],

      ["sampiyonlugunu ilan etti", 12],

      ["sampiyonluga ulasti", 12],

      ["sampiyon", 7],

      ["kupayi kazandi", 12],

      ["kupayi kaldirdi", 12],

      ["kazandi", 7],

      ["maglup etti", 8],

      ["galip geldi", 8],

      ["finalde", 5],

      ["final macinda", 6],

      ["derece elde etti", 8],

      ["madalya kazandi", 9],

      ["altin madalya", 7],

      ["gumus madalya", 7],

      ["bronz madalya", 7],

      ["sonuclandi", 10],

      ["tamamlandi", 9],

      ["sona erdi", 9],

      ["tebrik ederiz", 6],

      ["basari elde etti", 6],

      ["rekor kirdi", 8]

    ],

    reasons:
      reasons,

    reasonLabel:
      "Tamamlanmış sonuç sinyali"

  });


  /* -------------------------------------------------------
     Başlıkta güçlü sonuç sinyali daha değerli.
     ------------------------------------------------------- */

  if (
    containsAny(
      titleText,
      [

        "sampiyon",

        "kazandi",

        "maglup etti",

        "galip geldi",

        "kupayi kazandi",

        "madalya kazandi",

        "rekor kirdi"

      ]
    )
  ) {

    scores.result +=
      8;


    reasons.push(
      "Başlık doğrudan sonuç / başarı bildiriyor."
    );

  }


  /* =======================================================
     5. KAYIT / BAŞVURU

     Bu alan sonuçtan sonra değil,
     bağımsız skorlanıyor.

     Örneğin:
     "SEM kayıt hakkı kazanan sporcular açıklandı"
     ama devamında
     "10 iş günü içinde kayıt işlemlerini tamamlamalı"
     deniyorsa kullanıcı aksiyonu vardır.
     ======================================================= */

  scorePatterns({

    text:
      text,

    target:
      scores,

    key:
      "registration",

    patterns: [

      ["basvurular basladi", 12],

      ["kayitlar basladi", 12],

      ["kayit yaptir", 10],

      ["basvuru yap", 10],

      ["basvuru formu", 8],

      ["basvuru", 5],

      ["kayit islemleri", 8],

      ["kayit", 4],

      ["son basvuru", 10],

      ["son kayit", 10],

      ["basvuru tarihi", 7],

      ["kayit tarihi", 7],

      ["e devlet uzerinden", 5],

      ["is gunu icinde", 6],

      ["tamamlamalari gerekmektedir", 8],

      ["gerekli belgeler", 5]

    ],

    reasons:
      reasons,

    reasonLabel:
      "Kayıt / başvuru sinyali"

  });


  /* =======================================================
     6. YAKLAŞAN FIRSAT / ETKİNLİK

     Gelecek zaman fiillerine ağırlık veriyoruz.
     ======================================================= */

  scorePatterns({

    text:
      text,

    target:
      scores,

    key:
      "opportunity",

    patterns: [

      ["duzenlenecek", 10],

      ["gerceklesecek", 10],

      ["yapilacak", 8],

      ["oynanacak", 9],

      ["baslayacak", 9],

      ["basliyor", 7],

      ["katilim", 4],

      ["katilabilir", 6],

      ["katilimcilari", 3],

      ["program", 2],

      ["turnuva", 3],

      ["festival", 4],

      ["kamp", 3],

      ["seminer", 3],

      ["kurs", 3]

    ],

    reasons:
      reasons,

    reasonLabel:
      "Yaklaşan fırsat sinyali"

  });


  /* =======================================================
     7. DUYURU
     ======================================================= */

  scorePatterns({

    text:
      text,

    target:
      scores,

    key:
      "announcement",

    patterns: [

      ["duyuru", 6],

      ["duyuruldu", 5],

      ["duyurusu", 5],

      ["aciklandi", 4],

      ["bilgilendirme", 6],

      ["ilan edildi", 5],

      ["yayimlandi", 4],

      ["yayınlandı", 4],

      ["programi aciklandi", 6],

      ["liste aciklandi", 5]

    ],

    reasons:
      reasons,

    reasonLabel:
      "Duyuru sinyali"

  });


  /* =======================================================
     8. GENEL HABER
     ======================================================= */

  scorePatterns({

    text:
      text,

    target:
      scores,

    key:
      "news",

    patterns: [

      ["ziyaret etti", 5],

      ["bir araya geldi", 5],

      ["toplanti", 4],

      ["aciklama yapti", 4],

      ["protokol", 4],

      ["tarihinde", 1],

      ["federasyonu", 1]

    ],

    reasons:
      reasons,

    reasonLabel:
      "Genel haber sinyali"

  });


  /* =======================================================
     ÖZEL ÇAKIŞMA KURALLARI
     ======================================================= */

  applySpecialRules({

    post:
      post,

    text:
      text,

    titleText:
      titleText,

    scores:
      scores,

    reasons:
      reasons

  });


  /* =======================================================
     NİHAİ INTENT
     ======================================================= */

  const contentIntent =
    selectIntent(
      scores
    );


  /* =======================================================
     EVENT STATUS
     ======================================================= */

  const eventStatus =
    determineEventStatus({

      post:
        post,

      text:
        text,

      contentIntent:
        contentIntent,

      scores:
        scores,

      reasons:
        reasons

    });


  /* =======================================================
     ACTIONABLE
     ======================================================= */

  const actionable =
    determineActionable({

      post:
        post,

      text:
        text,

      contentIntent:
        contentIntent,

      eventStatus:
        eventStatus

    });


  /* =======================================================
     OPPORTUNITY SCORE
     ======================================================= */

  const opportunityScore =
    calculateOpportunityScore({

      contentIntent:
        contentIntent,

      eventStatus:
        eventStatus,

      actionable:
        actionable,

      scores:
        scores

    });


  /* =======================================================
     CONFIDENCE
     ======================================================= */

  const confidenceScore =
    calculateConfidenceScore(
      scores,
      contentIntent
    );


  /* =======================================================
     AKIŞ DAVRANIŞI
     ======================================================= */

  const feedTreatment =
    determineFeedTreatment({

      contentIntent:
        contentIntent,

      eventStatus:
        eventStatus,

      actionable:
        actionable,

      opportunityScore:
        opportunityScore

    });


  return {

    version:
      CONTENT_INTENT_VERSION,

    contentIntent:
      contentIntent,

    eventStatus:
      eventStatus,

    actionable:
      actionable,

    opportunityScore:
      opportunityScore,

    confidenceScore:
      confidenceScore,

    feedTreatment:
      feedTreatment,

    scores:
      roundScores(
        scores
      ),

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

export function applyContentIntent(
  post
) {

  if (
    !post ||
    typeof post !==
    "object"
  ) {

    return post;

  }


  const analysis =
    analyzeContentIntent(
      post
    );


  return {

    ...post,


    /*
      Mevcut contentType alanını bozmayalım.
      Daha özel anlam alanını ayrıca ekliyoruz.
    */

    contentIntent:
      analysis.contentIntent,


    eventStatus:
      analysis.eventStatus,


    actionable:
      analysis.actionable,


    opportunityScore:
      analysis.opportunityScore,


    intentMeta: {

      version:
        analysis.version,

      confidenceScore:
        analysis.confidenceScore,

      feedTreatment:
        analysis.feedTreatment,

      scores:
        analysis.scores,

      reasons:
        analysis.reasons,

      analyzedAt:
        analysis.analyzedAt

    }

  };

}


/* =========================================================
   LİSTEYE UYGULA
   ========================================================= */

export function applyContentIntentToPosts(
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
      applyContentIntent
    )

    .filter(
      Boolean
    );

}


/* =========================================================
   ÖZEL KURALLAR
   ========================================================= */

function applySpecialRules({

  post,
  text,
  titleText,
  scores,
  reasons

}) {

  /* -------------------------------------------------------
     ŞAMPİYON + TEBRİK
     yaklaşan etkinlik değildir.
     ------------------------------------------------------- */

  if (
    containsAny(
      titleText,
      [
        "sampiyon",
        "kupayi kazandi"
      ]
    )
    &&
    containsAny(
      text,
      [
        "tebrik",
        "final",
        "sampiyonluga ulasti",
        "kazandi"
      ]
    )
  ) {

    scores.result +=
      15;


    scores.opportunity -=
      8;


    reasons.push(
      "Şampiyonluk/sonuç dili yaklaşan etkinlik yorumunu bastırdı."
    );

  }


  /* -------------------------------------------------------
     "Kayıt hakkı kazananlar açıklandı"

     Sonuç vardır ama hâlâ kayıt işlemi gerekiyorsa
     kullanıcı aksiyonu da vardır.
     ------------------------------------------------------- */

  if (
    containsAny(
      text,
      [
        "kayit hakki kazanan",
        "hak kazanan sporcular"
      ]
    )
  ) {

    scores.result +=
      7;


    scores.announcement +=
      5;


    if (
      containsAny(
        text,
        [
          "kayit islemlerini",
          "is gunu icinde",
          "tamamlamalari gerekmektedir",
          "kayit yaptirmalari"
        ]
      )
    ) {

      scores.registration +=
        15;


      reasons.push(
        "Sonuç duyurusu sonrası kullanıcıdan kayıt işlemi bekleniyor."
      );

    }

  }


  /* -------------------------------------------------------
     Gelecek zaman varsa result skorunu biraz azalt.
     ------------------------------------------------------- */

  if (
    containsAny(
      text,
      [
        "duzenlenecek",
        "gerceklesecek",
        "oynanacak",
        "yapilacak",
        "baslayacak"
      ]
    )
  ) {

    scores.result -=
      3;

  }


  /* -------------------------------------------------------
     Doğrudan geçmiş zaman + başarı dili
     ------------------------------------------------------- */

  if (
    containsAny(
      text,
      [
        "tamamlandi",
        "sona erdi",
        "sampiyon oldu",
        "kazandi",
        "maglup etti",
        "galip geldi"
      ]
    )
  ) {

    scores.result +=
      5;

  }


  /* -------------------------------------------------------
     Postta transactional action varsa
     registration / opportunity desteği.
     ------------------------------------------------------- */

  if (
    hasActionType(
      post,
      [
        "register",
        "apply",
        "ticket",
        "join",
        "contact"
      ]
    )
  ) {

    scores.registration +=
      5;

    scores.opportunity +=
      3;

  }


  if (
    hasActionType(
      post,
      [
        "buy",
        "product"
      ]
    )
  ) {

    scores.product +=
      8;

  }


  if (
    hasActionType(
      post,
      [
        "campaign"
      ]
    )
  ) {

    scores.campaign +=
      8;

  }

}


/* =========================================================
   INTENT SEÇ
   ========================================================= */

function selectIntent(
  scores
) {

  /*
    Ticari / iş içerikleri yüksek özgüllüğe sahip.
  */

  const priority = [

    "job",

    "product",

    "campaign",

    "registration",

    "result",

    "opportunity",

    "announcement",

    "news"

  ];


  let bestKey =
    "news";


  let bestScore =
    -Infinity;


  for (
    const key
    of priority
  ) {

    const score =
      Number(
        scores[
          key
        ] ||
        0
      );


    if (
      score >
      bestScore
    ) {

      bestScore =
        score;

      bestKey =
        key;

    }

  }


  /*
    Hiçbir anlamlı sinyal yoksa genel haber.
  */

  if (
    bestScore <=
    0
  ) {

    return "news";

  }


  return bestKey;

}


/* =========================================================
   EVENT STATUS
   ========================================================= */

function determineEventStatus({

  post,
  text,
  contentIntent,
  scores,
  reasons

}) {

  /* -------------------------------------------------------
     Sonuç içerikleri doğrudan tamamlanmış sayılır.
     ------------------------------------------------------- */

  if (
    contentIntent ===
    "result"
  ) {

    reasons.push(
      "Sonuç içeriği olduğu için eventStatus completed."
    );


    return "completed";

  }


  /* -------------------------------------------------------
     Açık geçmiş zaman sinyalleri
     ------------------------------------------------------- */

  if (
    containsAny(
      text,
      [

        "tamamlandi",

        "sona erdi",

        "sampiyon oldu",

        "kazandi",

        "maglup etti",

        "galip geldi",

        "duzenlendi",

        "gerceklestirildi"

      ]
    )
  ) {

    return "completed";

  }


  /* -------------------------------------------------------
     Devam ediyor
     ------------------------------------------------------- */

  if (
    containsAny(
      text,
      [

        "devam ediyor",

        "suruyor",

        "devam etmekte",

        "halen devam eden"

      ]
    )
  ) {

    return "ongoing";

  }


  /* -------------------------------------------------------
     Gelecek zaman
     ------------------------------------------------------- */

  if (
    containsAny(
      text,
      [

        "duzenlenecek",

        "gerceklesecek",

        "oynanacak",

        "yapilacak",

        "baslayacak",

        "gerceklestirilecek"

      ]
    )
  ) {

    return "upcoming";

  }


  /* -------------------------------------------------------
     Structured dates

     Normalizer artık publication date'i
     startDate'e koymadığı için burada daha güvenli.
     ------------------------------------------------------- */

  const startDate =
    cleanString(
      post?.details?.startDate
    );


  const endDate =
    cleanString(
      post?.details?.endDate
    );


  const startTimestamp =
    parseDateValue(
      startDate
    );


  const endTimestamp =
    parseDateValue(
      endDate
    );


  const now =
    Date.now();


  if (
    endTimestamp >
    0 &&
    endTimestamp <
    now
  ) {

    return "completed";

  }


  if (
    startTimestamp >
    now
  ) {

    return "upcoming";

  }


  if (
    startTimestamp >
    0 &&
    startTimestamp <=
    now &&
    (
      endTimestamp ===
      0 ||
      endTimestamp >=
      now
    )
  ) {

    return "ongoing";

  }


  /* -------------------------------------------------------
     Registration tek başına etkinlik tarihi anlamına gelmez.
     ------------------------------------------------------- */

  if (
    contentIntent ===
    "registration"
  ) {

    return "unknown";

  }


  return "unknown";

}


/* =========================================================
   ACTIONABLE
   ========================================================= */

function determineActionable({

  post,
  text,
  contentIntent,
  eventStatus

}) {

  /* -------------------------------------------------------
     Açık kullanıcı aksiyonu
     ------------------------------------------------------- */

  if (
    hasActionType(
      post,
      [

        "register",

        "apply",

        "buy",

        "ticket",

        "join",

        "campaign",

        "product",

        "contact"

      ]
    )
  ) {

    return true;

  }


  /* -------------------------------------------------------
     Intent bazlı
     ------------------------------------------------------- */

  if (
    [
      "registration",
      "campaign",
      "job",
      "product"
    ].includes(
      contentIntent
    )
  ) {

    return true;

  }


  if (
    contentIntent ===
    "opportunity" &&
    eventStatus !==
    "completed"
  ) {

    return true;

  }


  /* -------------------------------------------------------
     Metinsel aksiyon
     ------------------------------------------------------- */

  if (
    containsAny(
      text,
      [

        "basvuru yap",

        "kayit yaptir",

        "bilet al",

        "satin al",

        "cv gonder",

        "katilim icin",

        "basvurular devam ediyor"

      ]
    )
  ) {

    return true;

  }


  /*
    Sonuç haberi kullanıcı aksiyonu değildir.
  */

  if (
    contentIntent ===
    "result"
  ) {

    return false;

  }


  return false;

}


/* =========================================================
   OPPORTUNITY SCORE
   ========================================================= */

function calculateOpportunityScore({

  contentIntent,
  eventStatus,
  actionable,
  scores

}) {

  let score =
    0;


  if (
    contentIntent ===
    "registration"
  ) {

    score +=
      85;

  }


  else if (
    contentIntent ===
    "opportunity"
  ) {

    score +=
      75;

  }


  else if (
    contentIntent ===
    "campaign"
  ) {

    score +=
      80;

  }


  else if (
    contentIntent ===
    "job"
  ) {

    score +=
      80;

  }


  else if (
    contentIntent ===
    "product"
  ) {

    score +=
      70;

  }


  else if (
    contentIntent ===
    "announcement"
  ) {

    score +=
      35;

  }


  else if (
    contentIntent ===
    "news"
  ) {

    score +=
      15;

  }


  else if (
    contentIntent ===
    "result"
  ) {

    score =
      5;

  }


  if (
    actionable
  ) {

    score +=
      10;

  }


  if (
    eventStatus ===
    "upcoming"
  ) {

    score +=
      10;

  }


  if (
    eventStatus ===
    "completed"
  ) {

    score -=
      20;

  }


  /*
    registration skoru çok güçlüyse
    birkaç puan destek.
  */

  if (
    Number(
      scores.registration ||
      0
    ) >=
    15
  ) {

    score +=
      5;

  }


  return clamp(
    Math.round(
      score
    ),
    0,
    100
  );

}


/* =========================================================
   FEED TREATMENT
   ========================================================= */

function determineFeedTreatment({

  contentIntent,
  eventStatus,
  actionable,
  opportunityScore

}) {

  if (
    contentIntent ===
    "result" ||
    eventStatus ===
    "completed"
  ) {

    return "deprioritize";

  }


  if (
    actionable &&
    opportunityScore >=
    70
  ) {

    return "promote";

  }


  if (
    contentIntent ===
    "news"
  ) {

    return "inform";

  }


  return "normal";

}


/* =========================================================
   CONFIDENCE
   ========================================================= */

function calculateConfidenceScore(
  scores,
  selected
) {

  const values =
    Object.entries(
      scores
    )
      .map(
        ([key, score]) => ({

          key:
            key,

          score:
            Number(
              score ||
              0
            )

        })
      )
      .sort(
        (a, b) =>
          b.score -
          a.score
      );


  const first =
    values[0]?.score ||
    0;


  const second =
    values[1]?.score ||
    0;


  let confidence =
    40;


  if (
    first >=
    10
  ) {

    confidence +=
      20;

  }


  if (
    first >=
    20
  ) {

    confidence +=
      15;

  }


  const difference =
    first -
    second;


  if (
    difference >=
    10
  ) {

    confidence +=
      15;

  }


  if (
    difference >=
    20
  ) {

    confidence +=
      10;

  }


  if (
    selected ===
    "news" &&
    first <=
    2
  ) {

    confidence =
      35;

  }


  return clamp(
    confidence,
    0,
    100
  );

}


/* =========================================================
   SEARCH TEXT

   Postun mümkün olduğu kadar bütün içeriğini okur.
   ========================================================= */

function buildSearchText(
  post
) {

  const values = [

    post?.editorial?.headline,

    post?.editorial?.originalTitle,

    post?.editorial?.influencerText,

    post?.editorial?.originalText,

    post?.title,

    post?.summary,

    post?.originalTitle,

    post?.originalText,

    post?.source?.name,

    post?.source?.shortName,

    post?.sport,

    post?.category,

    post?.subCategory,

    post?.contentType,

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


  if (
    isPlainObject(
      post?.facts
    )
  ) {

    values.push(
      ...flattenValues(
        post.facts
      )
    );

  }


  return normalizeText(
    values
      .filter(
        value =>
          value !==
          null &&
          value !==
          undefined
      )
      .join(
        " "
      )
  );

}


/* =========================================================
   BAŞLIK METNİ
   ========================================================= */

function buildTitleText(
  post
) {

  return normalizeText(

    post?.editorial?.originalTitle ||

    post?.originalTitle ||

    post?.editorial?.headline ||

    post?.title ||

    ""

  );

}


/* =========================================================
   SCORE PATTERNS
   ========================================================= */

function scorePatterns({

  text,
  target,
  key,
  patterns,
  reasons,
  reasonLabel

}) {

  for (
    const [
      pattern,
      weight
    ]
    of patterns
  ) {

    const normalizedPattern =
      normalizeText(
        pattern
      );


    if (
      !normalizedPattern
    ) {

      continue;

    }


    if (
      text.includes(
        normalizedPattern
      )
    ) {

      target[
        key
      ] +=
        Number(
          weight
        ) ||
        0;


      if (
        Number(
          weight
        ) >=
        7
      ) {

        reasons.push(
          `${reasonLabel}: "${pattern}"`
        );

      }

    }

  }

}


/* =========================================================
   ACTION TYPE
   ========================================================= */

function hasActionType(
  post,
  types
) {

  if (
    !Array.isArray(
      post?.actions
    )
  ) {

    return false;

  }


  return post.actions.some(
    action => {

      if (
        !action ||
        action.enabled ===
        false
      ) {

        return false;

      }


      return types.includes(
        cleanString(
          action.type
        )
          .toLowerCase()
      );

    }
  );

}


/* =========================================================
   DATE PARSE

   Publication date burada kullanılmaz.
   Yalnızca explicit details tarihleri çağrılır.
   ========================================================= */

function parseDateValue(
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
     dd.mm.yyyy
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
     7 Ekim 2026
     ------------------------------------------------------- */

  match =
    text.match(

      /\b(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+(20\d{2})\b/i

    );


  if (
    match
  ) {

    const month =
      turkishMonthIndex(
        match[2]
      );


    if (
      month >=
      0
    ) {

      return Date.UTC(

        Number(
          match[3]
        ),

        month,

        Number(
          match[1]
        )

      );

    }

  }


  const parsed =
    Date.parse(
      text
    );


  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;

}


/* =========================================================
   TÜRKÇE AY
   ========================================================= */

function turkishMonthIndex(
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
   FLATTEN OBJECT VALUES
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
      null ||
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
   KEYWORD
   ========================================================= */

function containsAny(
  text,
  values
) {

  return values.some(
    value =>
      text.includes(
        normalizeText(
          value
        )
      )
  );

}


/* =========================================================
   SCORE ROUND
   ========================================================= */

function roundScores(
  scores
) {

  const result =
    {};


  for (
    const [
      key,
      value
    ]
    of Object.entries(
      scores
    )
  ) {

    result[
      key
    ] =
      Math.round(
        Number(
          value ||
          0
        ) *
        100
      )
      /
      100;

  }


  return result;

}


/* =========================================================
   FALLBACK
   ========================================================= */

function createFallbackResult() {

  return {

    version:
      CONTENT_INTENT_VERSION,

    contentIntent:
      "news",

    eventStatus:
      "unknown",

    actionable:
      false,

    opportunityScore:
      0,

    confidenceScore:
      0,

    feedTreatment:
      "inform",

    scores: {

      opportunity:
        0,

      registration:
        0,

      result:
        0,

      announcement:
        0,

      campaign:
        0,

      job:
        0,

      product:
        0,

      news:
        0

    },

    reasons:
      [],

    analyzedAt:
      new Date()
        .toISOString()

  };

}


/* =========================================================
   NORMALIZE TEXT
   ========================================================= */

function normalizeText(
  value
) {

  return String(
    value ||
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


function clamp(
  value,
  min,
  max
) {

  return Math.max(

    min,

    Math.min(
      max,
      Number(
        value
      ) ||
      0
    )

  );

      }
