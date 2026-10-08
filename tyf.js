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


/* =========================================================
   TYF ANA AKIŞ
   ========================================================= */

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
          item.relevanceScore >= 3
      );


  /* =======================================================
     TEKRAR EDEN HABERLERİ TEMİZLE
     ======================================================= */

  const deduped =
    dedupeArticles(
      items
    );


  /* =======================================================
     ÖĞRENME + İLGİ PUANI
     ======================================================= */

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


  /* =======================================================
     PUAN + TARİHE GÖRE SIRALA
     ======================================================= */

  deduped.sort(
    (a, b) => {

      const scoreDifference =
        Number(
          b.finalScore || 0
        )
        -
        Number(
          a.finalScore || 0
        );


      if (
        scoreDifference !== 0
      ) {

        return scoreDifference;

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

      shortName:
        "TYF",

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
   TEK HABER OKU
   ========================================================= */

async function readArticle(
  url
) {

  try {

    const html =
      await getHtml(
        url
      );


    /* -----------------------------------------------------
       ORİJİNAL BAŞLIK
       ----------------------------------------------------- */

    const originalTitle =
      extractTitle(
        html
      );


    if (
      !originalTitle
    ) {

      return null;

    }


    /* -----------------------------------------------------
       SADECE GERÇEK HABER BÖLÜMÜ
       ----------------------------------------------------- */

    const region =
      extractArticleRegion(
        html
      );


    const originalText =
      extractBody(
        region,
        originalTitle
      );


    /* -----------------------------------------------------
       KATEGORİ + HEDEF KİTLE
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       GERÇEKLERİ ÇIKAR
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       TARİH
       ----------------------------------------------------- */

    const date =
      extractDate(
        region || html
      );


    /* -----------------------------------------------------
       GÖRSEL
       ----------------------------------------------------- */

    const image =
      extractImage(
        html,
        BASE
      );


    /* -----------------------------------------------------
       PDF
       ----------------------------------------------------- */

    const pdfUrl =
      extractPdf(
        region || html,
        BASE
      );


    /* -----------------------------------------------------
       SPORNRD EDİTÖRÜ
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       SON HABER NESNESİ
       ----------------------------------------------------- */

    return {

      id:
        makeId(
          url
        ),

      externalId:
        makeId(
          url
        ),


      /* Kullanıcının gördüğü */

      title:
        editorial.title,

      summary:
        editorial.summary,


      /* Orijinal kaynak */

      originalTitle:
        originalTitle,

      originalText:
        originalText,


      /* Editör bilgisi */

      editorial:
        true,

      editorialLabel:
        "SporNRD Özeti",

      editorialVersion:
        "6.0.0",

      titleCandidates:
        editorial.titleCandidates || [],


      /* Kaynak */

      source:
        "Türkiye Yüzme Federasyonu",

      sourceShortName:
        "TYF",

      sourceType:
        "FEDERASYON",

      verified:
        true,

      sport:
        "Yüzme",


      /* Analiz */

      category:
        analysis.category,

      audience:
        analysis.audience,

      relevanceScore:
        analysis.score,

      qualityScore:
        editorial.qualityScore || 0,


      /* Haber DNA */

      topic:
        facts.topic,

      urgency:
        facts.urgency,

      actionRequired:
        facts.actionRequired,

      actionLabel:
        editorial.actionLabel,

      tags:
        editorial.tags || [],


      /* Yapılandırılmış gerçekler */

      facts:
        facts,


      /* Tarih / konum */

      date:
        date.text,

      timestamp:
        date.time,

      location:
        facts.location || "Türkiye",


      /* Medya */

      image:
        image,

      url:
        url,

      pdfUrl:
        pdfUrl,


      /* Görsel kategori */

      emoji:
        emojiFor(
          analysis.category
        )

    };

  }

  catch (error) {

    console.log(

      "TYF haber detayı okunamadı:",

      url,

      String(
        error &&
        error.message

          ? error.message

          : error
      )

    );


    return null;

  }

}


/* =========================================================
   HTML İNDİR
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

      "TYF HTTP " +
      response.status +
      ": " +
      url

    );

  }


  return response.text();

}


/* =========================================================
   TYF HABER LİNKLERİNİ BUL
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
   HABER ID
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


    hash |= 0;

  }


  return (
    "tyf-" +
    Math.abs(
      hash
    )
  );

}


/* =========================================================
   KATEGORİ EMOJİSİ
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
    ]
    ||
    "🏊"
  );

  }
