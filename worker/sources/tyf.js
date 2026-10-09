import {
  decodeEntities,
  extractTitle,
  extractArticleRegion,
  extractBody,
  extractDate,
  extractImage,
  extractPdf
} from "./html.js";

import {
  classifyArticle
} from "./classifier.js";

import {
  extractFacts
} from "./factEngine.js";

import {
  buildEditorial
} from "./editorialEngine.js";

import {
  dedupeArticles
} from "./duplicateEngine.js";

import {
  calculateFinalScore
} from "./relevanceEngine.js";

import {
  readLearningState
} from "./learningStore.js";


const BASE =
  "https://www.tyf.gov.tr";

const NEWS =
  BASE + "/haberler/";


export async function getTyfFeed({
  limit = 20,
  env
}) {

  const html =
    await getHtml(
      NEWS
    );


  const links =
    findLinks(html)
      .slice(
        0,
        30
      );


  const learningState =
    await readLearningState(
      env
    );


  const results =
    await Promise.allSettled(
      links.map(
        readArticle
      )
    );


  const items =
    results

      .filter(
        result =>
          result.status ===
          "fulfilled" &&
          result.value
      )

      .map(
        result =>
          result.value
      )

      .filter(
        item =>
          item.relevanceScore >=
          3
      );


  const deduped =
    dedupeArticles(
      items
    );


  for (
    const item
    of deduped
  ) {

    item.finalScore =
      calculateFinalScore(
        item,
        learningState
      );

  }


  deduped.sort(
    (a, b) => {

      const score =
        Number(
          b.finalScore || 0
        )
        -
        Number(
          a.finalScore || 0
        );


      if (
        score !== 0
      ) {

        return score;

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
  );


  return {

    source: {

      id:
        "tyf",

      name:
        "Türkiye Yüzme Federasyonu",

      sourceType:
        "FEDERASYON",

      sport:
        "Yüzme",

      verified:
        true,

      website:
        BASE

    },


    items:
      deduped.slice(
        0,
        limit
      )

  };

}


/* =========================================================
   TEK HABER
   ========================================================= */

async function readArticle(
  url
) {

  const html =
    await getHtml(
      url
    );


  const originalTitle =
    extractTitle(
      html
    );


  if (
    !originalTitle
  ) {

    return null;

  }


  const region =
    extractArticleRegion(
      html
    );


  const originalText =
    extractBody(
      region,
      originalTitle
    );


  const analysis =
    classifyArticle(
      originalTitle,
      originalText
    );


  if (
    !analysis.keep
  ) {

    return null;

  }


  const facts =
    extractFacts({

      title:
        originalTitle,

      body:
        originalText,

      category:
        analysis.category,

      audience:
        analysis.audience

    });


  const date =
    extractDate(
      region ||
      html
    );


  const image =
    extractImage(
      html,
      BASE
    );


  const pdfUrl =
    extractPdf(
      region ||
      html,
      BASE
    );


  const editorial =
    buildEditorial({

      originalTitle:
        originalTitle,

      originalText:
        originalText,

      category:
        analysis.category,

      facts:
        facts,

      pdfUrl:
        pdfUrl

    });


  return {

    id:
      makeId(
        url
      ),

    externalId:
      makeId(
        url
      ),


    title:
      editorial.title,

    summary:
      editorial.summary,


    originalTitle:
      originalTitle,

    originalText:
      originalText,


    editorial:
      true,

    editorialLabel:
      "SporNRD Özeti",

    editorialVersion:
      "6.0.0",

    titleCandidates:
      editorial.titleCandidates,


    source:
      "Türkiye Yüzme Federasyonu",

    sourceType:
      "FEDERASYON",

    verified:
      true,

    sport:
      "Yüzme",


    category:
      analysis.category,

    audience:
      analysis.audience,

    relevanceScore:
      analysis.score,

    qualityScore:
      editorial.qualityScore,


    topic:
      facts.topic,

    urgency:
      facts.urgency,

    actionRequired:
      facts.actionRequired,

    actionLabel:
      editorial.actionLabel,

    tags:
      editorial.tags,


    facts:
      facts,


    date:
      date.text,

    timestamp:
      date.time,

    location:
      facts.location,


    image:
      image,

    url:
      url,

    pdfUrl:
      pdfUrl,


    emoji:
      emojiFor(
        analysis.category
      )

  };

}


/* =========================================================
   HTML AL
   ========================================================= */

async function getHtml(
  url
) {

  const response =
    await fetch(
      url,
      {

        headers: {

          "Accept":
            "text/html,application/xhtml+xml",

          "Accept-Language":
            "tr-TR,tr;q=0.9",

          "User-Agent":
            "SporNRD/6.0"

        }

      }
    );


  if (
    !response.ok
  ) {

    throw new Error(
      `TYF HTTP ${response.status}: ${url}`
    );

  }


  return response.text();

}


/* =========================================================
   HABER LİNKLERİ
   ========================================================= */

function findLinks(
  html
) {

  const list =
    [];


  const used =
    new Set();


  const regex =
    /href=["']([^"']*\/haber\/[^"']+\.html(?:\?[^"']*)?)["']/gi;


  let match;


  while (
    (match = regex.exec(html)) !== null
  ) {

    let url;


    try {

      url =
        new URL(

          decodeEntities(
            match[1]
          ),

          BASE

        ).href;

    }

    catch {

      continue;

    }


    if (
      used.has(
        url
      )
    ) {

      continue;

    }


    used.add(
      url
    );


    list.push(
      url
    );

  }


  return list;

}


/* =========================================================
   ID
   ========================================================= */

function makeId(
  value
) {

  let hash =
    0;


  const text =
    String(
      value || ""
    );


  for (
    let i = 0;
    i < text.length;
    i++
  ) {

    hash =
      (
        (
          hash << 5
        )
        -
        hash
      )
      +
      text.charCodeAt(
        i
      );


    hash |=
      0;

  }


  return (
    "tyf-" +
    Math.abs(
      hash
    )
  );

}


/* =========================================================
   EMOJİ
   ========================================================= */

function emojiFor(
  category
) {

  const map = {

    coach:
      "🧑‍🏫",

    athlete:
      "🏊",

    event:
      "🏆",

    education:
      "🎓",

    announcement:
      "📢"

  };


  return (
    map[
      category
    ] ||
    "🏊"
  );

        }
