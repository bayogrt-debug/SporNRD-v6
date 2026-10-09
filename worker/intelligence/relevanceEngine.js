/* =========================================================
   SporNRD
   worker/intelligence/relevanceEngine.js

   Haber önem + kalite + öğrenme puanı
   SporNRD v6.0.4
   ========================================================= */


import {
  DEFAULT_WEIGHTS
} from "./defaultWeights.js";


/* =========================================================
   ANA PUANLAMA
   ========================================================= */

export function calculateFinalScore(
  article,
  learningState
) {

  if (
    !article ||
    typeof article !== "object"
  ) {

    return 0;

  }


  /* -------------------------------------------------------
     1. TEMEL İLGİ PUANI
     ------------------------------------------------------- */

  const relevanceScore =
    safeNumber(
      article.relevanceScore
    );


  const base =
    relevanceScore *
    10 *
    getWeight(
      "relevance",
      1
    );


  /* -------------------------------------------------------
     2. ACİLİYET
     ------------------------------------------------------- */

  const urgency =
    calculateUrgencyScore(
      article.urgency
    )
    *
    getWeight(
      "urgency",
      1
    );


  /* -------------------------------------------------------
     3. AKSİYON GEREKTİRİYOR MU?
     ------------------------------------------------------- */

  const actionRequired =
    article.actionRequired === true
      ? 5 *
        getWeight(
          "actionRequired",
          1
        )
      : 0;


  /* -------------------------------------------------------
     4. İÇERİK KALİTESİ
     ------------------------------------------------------- */

  const qualityScore =
    safeNumber(
      article.qualityScore
    );


  const quality =
    qualityScore *
    0.2 *
    getWeight(
      "quality",
      1
    );


  /* -------------------------------------------------------
     5. DOĞRULANMIŞ KAYNAK
     ------------------------------------------------------- */

  const verified =
    article.verified === true
      ? 3 *
        getWeight(
          "verifiedSource",
          1
        )
      : 0;


  /* -------------------------------------------------------
     6. KATEGORİ ÖĞRENMESİ
     ------------------------------------------------------- */

  const category =
    normalizeKey(
      article.category ||
      "announcement"
    );


  const categoryBoost =
    safeNumber(
      learningState
        ?.categoryBoosts
        ?.[category]
    )
    *
    getWeight(
      "learning",
      1
    );


  /* -------------------------------------------------------
     7. KAYNAK ÖĞRENMESİ

     Öncelik:
     sourceId → sourceShortName → source
     ------------------------------------------------------- */

  const sourceKeys =
    [

      normalizeKey(
        article.sourceId
      ),

      normalizeKey(
        article.sourceShortName
      ),

      normalizeKey(
        article.source
      )

    ]
      .filter(
        Boolean
      );


  let sourceBoost =
    0;


  for (
    const key
    of sourceKeys
  ) {

    const value =
      learningState
        ?.sourceBoosts
        ?.[key];


    if (
      value !== undefined
    ) {

      sourceBoost =
        safeNumber(
          value
        );

      break;

    }

  }


  sourceBoost *=
    getWeight(
      "learning",
      1
    );


  /* -------------------------------------------------------
     8. BAŞLIK STİLİ ÖĞRENMESİ

     Şimdilik varsa kullanılır.
     Yoksa sistemi etkilemez.
     ------------------------------------------------------- */

  const headlineStyle =
    normalizeKey(
      article.headlineStyle ||
      article.editorialStyle ||
      ""
    );


  const headlineBoost =
    headlineStyle

      ? safeNumber(
          learningState
            ?.headlineStyleBoosts
            ?.[headlineStyle]
        )
        *
        getWeight(
          "learning",
          1
        )

      : 0;


  /* -------------------------------------------------------
     TOPLAM
     ------------------------------------------------------- */

  const total =
    base +
    urgency +
    actionRequired +
    quality +
    verified +
    categoryBoost +
    sourceBoost +
    headlineBoost;


  return roundScore(
    total
  );

}


/* =========================================================
   ACİLİYET PUANI
   ========================================================= */

function calculateUrgencyScore(
  value
) {

  const urgency =
    normalizeKey(
      value
    );


  switch (
    urgency
  ) {

    case "critical":
    case "urgent":

      return 16;


    case "high":

      return 12;


    case "important":

      return 8;


    case "medium":

      return 6;


    case "low":

      return 2;


    case "normal":
    default:

      return 0;

  }

}


/* =========================================================
   VARSAYILAN AĞIRLIK
   ========================================================= */

function getWeight(
  key,
  fallback
) {

  const value =
    Number(
      DEFAULT_WEIGHTS
        ?.[key]
    );


  return Number.isFinite(
    value
  )
    ? value
    : fallback;

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
   ÖĞRENME ANAHTARI NORMALİZE
   ========================================================= */

function normalizeKey(
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
   PUANI YUVARLA
   ========================================================= */

function roundScore(
  value
) {

  const number =
    safeNumber(
      value
    );


  return (
    Math.round(
      number *
      100
    )
    /
    100
  );

    }
