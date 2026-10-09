/* =========================================================
   SporNRD
   worker/intelligence/duplicateEngine.js

   Aynı / çok benzer haberleri temizleme motoru
   SporNRD v6.0.4
   ========================================================= */


import {
  normalize
} from "../utils/html.js";


/* =========================================================
   AYARLAR
   ========================================================= */

const TITLE_SIMILARITY_THRESHOLD =
  0.78;


/* =========================================================
   ANA TEKRAR TEMİZLEME
   ========================================================= */

export function dedupeArticles(
  items
) {

  if (
    !Array.isArray(
      items
    )
  ) {

    return [];

  }


  const kept =
    [];


  for (
    const item
    of items
  ) {

    if (
      !item ||
      typeof item !==
      "object"
    ) {

      continue;

    }


    const duplicateIndex =
      findDuplicateIndex(
        kept,
        item
      );


    /* -----------------------------------------------------
       Tekrar değilse ekle
       ----------------------------------------------------- */

    if (
      duplicateIndex === -1
    ) {

      kept.push(
        item
      );

      continue;

    }


    /* -----------------------------------------------------
       Tekrarsa daha kaliteli olanı koru
       ----------------------------------------------------- */

    const existing =
      kept[
        duplicateIndex
      ];


    if (
      isBetterArticle(
        item,
        existing
      )
    ) {

      kept[
        duplicateIndex
      ] =
        item;

    }

  }


  return kept;

}


/* =========================================================
   TEKRAR HABER BUL
   ========================================================= */

function findDuplicateIndex(
  kept,
  candidate
) {

  for (
    let index = 0;
    index < kept.length;
    index++
  ) {

    const existing =
      kept[
        index
      ];


    /* -----------------------------------------------------
       ID aynıysa kesin tekrar
       ----------------------------------------------------- */

    if (
      sameId(
        existing,
        candidate
      )
    ) {

      return index;

    }


    /* -----------------------------------------------------
       URL aynıysa kesin tekrar
       ----------------------------------------------------- */

    if (
      sameUrl(
        existing,
        candidate
      )
    ) {

      return index;

    }


    /* -----------------------------------------------------
       Başlık benzerliği
       ----------------------------------------------------- */

    const existingTitle =
      getArticleTitle(
        existing
      );


    const candidateTitle =
      getArticleTitle(
        candidate
      );


    if (
      !existingTitle ||
      !candidateTitle
    ) {

      continue;

    }


    const titleSimilarity =
      similarity(
        existingTitle,
        candidateTitle
      );


    if (
      titleSimilarity >=
      TITLE_SIMILARITY_THRESHOLD
    ) {

      return index;

    }

  }


  return -1;

}


/* =========================================================
   AYNI ID
   ========================================================= */

function sameId(
  left,
  right
) {

  const leftId =
    String(
      left?.id ||
      left?.externalId ||
      ""
    )
      .trim();


  const rightId =
    String(
      right?.id ||
      right?.externalId ||
      ""
    )
      .trim();


  return Boolean(

    leftId &&

    rightId &&

    leftId ===
    rightId

  );

}


/* =========================================================
   AYNI URL
   ========================================================= */

function sameUrl(
  left,
  right
) {

  const leftUrl =
    normalizeUrl(
      left?.url
    );


  const rightUrl =
    normalizeUrl(
      right?.url
    );


  return Boolean(

    leftUrl &&

    rightUrl &&

    leftUrl ===
    rightUrl

  );

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


    /* Fragment takip için önemli değil */

    url.hash =
      "";


    /* Sondaki / farkını kaldır */

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
   HABER BAŞLIĞI
   ========================================================= */

function getArticleTitle(
  item
) {

  return String(

    item?.originalTitle ||

    item?.title ||

    ""

  )
    .trim();

}


/* =========================================================
   BAŞLIK BENZERLİĞİ

   Jaccard benzerliği:
   ortak kelimeler / toplam benzersiz kelime
   ========================================================= */

function similarity(
  leftValue,
  rightValue
) {

  const left =
    tokens(
      leftValue
    );


  const right =
    tokens(
      rightValue
    );


  if (
    !left.size ||
    !right.size
  ) {

    return 0;

  }


  let intersection =
    0;


  for (
    const token
    of left
  ) {

    if (
      right.has(
        token
      )
    ) {

      intersection +=
        1;

    }

  }


  const union =
    new Set([
      ...left,
      ...right
    ]).size;


  if (
    !union
  ) {

    return 0;

  }


  return (
    intersection /
    union
  );

}


/* =========================================================
   BAŞLIĞI KELİMELERE AYIR
   ========================================================= */

function tokens(
  value
) {

  const normalized =
    normalize(
      value
    )

      .replace(
        /[^A-Z0-9ÇĞİÖŞÜ ]/g,
        " "
      )

      .replace(
        /\s+/g,
        " "
      )

      .trim();


  if (
    !normalized
  ) {

    return new Set();

  }


  return new Set(

    normalized

      .split(
        /\s+/
      )

      .filter(
        token =>
          token.length >=
          3
      )

  );

}


/* =========================================================
   HANGİ HABER DAHA İYİ?
   ========================================================= */

function isBetterArticle(
  candidate,
  existing
) {

  const candidateScore =
    articleScore(
      candidate
    );


  const existingScore =
    articleScore(
      existing
    );


  /* -------------------------------------------------------
     Önce toplam puan
     ----------------------------------------------------- */

  if (
    candidateScore !==
    existingScore
  ) {

    return (
      candidateScore >
      existingScore
    );

  }


  /* -------------------------------------------------------
     Sonra kalite
     ----------------------------------------------------- */

  const candidateQuality =
    safeNumber(
      candidate?.qualityScore
    );


  const existingQuality =
    safeNumber(
      existing?.qualityScore
    );


  if (
    candidateQuality !==
    existingQuality
  ) {

    return (
      candidateQuality >
      existingQuality
    );

  }


  /* -------------------------------------------------------
     Sonra yeni tarih
     ----------------------------------------------------- */

  const candidateTime =
    safeNumber(
      candidate?.timestamp
    );


  const existingTime =
    safeNumber(
      existing?.timestamp
    );


  return (
    candidateTime >
    existingTime
  );

}


/* =========================================================
   HABER PUANI
   ========================================================= */

function articleScore(
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
