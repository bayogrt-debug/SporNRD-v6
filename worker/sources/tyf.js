/* =========================================================
   SporNRD
   worker/sources/tyf.js

   Türkiye Yüzme Federasyonu Kaynak Motoru

   Mimari:
   worker/
   ├── sources/
   │   └── tyf.js
   ├── intelligence/
   ├── learning/
   └── utils/

   SporNRD v6
   ========================================================= */


/* =========================================================
   HTML YARDIMCILARI
   ========================================================= */

import {
  decodeEntities,
  extractTitle,
  extractArticleRegion,
  extractBody,
  extractDate,
  extractImage,
  extractPdf
} from "../utils/html.js";


/* =========================================================
   AKILLI SINIFLANDIRMA
   ========================================================= */

import {
  classifyArticle
} from "../intelligence/classifier.js";


/* =========================================================
   GERÇEK BİLGİ ÇIKARIMI
   ========================================================= */

import {
  extractFacts
} from "../intelligence/factEngine.js";


/* =========================================================
   SPORNRD EDİTÖR MOTORU
   ========================================================= */

import {
  buildEditorial
} from "../intelligence/editorialEngine.js";


/* =========================================================
   TEKRAR EDEN HABERLER
   ========================================================= */

import {
  dedupeArticles
} from "../intelligence/duplicateEngine.js";


/* =========================================================
   İLGİ / ÖĞRENME PUANI
   ========================================================= */

import {
  calculateFinalScore
} from "../intelligence/relevanceEngine.js";


/* =========================================================
   GLOBAL ÖĞRENME DURUMU
   ========================================================= */

import {
  readLearningState
} from "../learning/learningStore.js";


/* =========================================================
   KAYNAK AYARLARI
   ========================================================= */

const BASE =
  "https://www.tyf.gov.tr";


const NEWS =
  BASE + "/haberler/";


const SOURCE = {

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

};


/* =========================================================
   AYARLAR
   ========================================================= */

const DEFAULT_LIMIT =
  20;


const MAX_LIMIT =
  30;


const MAX_ARTICLE_SCAN =
  30;


/* =========================================================
   TYF ANA AKIŞ
   ========================================================= */

export async function getTyfFeed({
  limit = DEFAULT_LIMIT,
  env = null
} = {}) {

  /* -------------------------------------------------------
     Limit güvenliği
     ------------------------------------------------------- */

  const safeLimit =
    normalizeLimit(
      limit
    );


  /* -------------------------------------------------------
     Haber liste sayfasını indir
     ------------------------------------------------------- */

  const html =
    await getHtml(
      NEWS
    );


  /* -------------------------------------------------------
     Haber bağlantılarını çıkar
     ------------------------------------------------------- */

  const links =
    findLinks(
      html
    )
      .slice(
        0,
        MAX_ARTICLE_SCAN
      );


  /* -------------------------------------------------------
     Öğrenme durumunu oku
     ------------------------------------------------------- */

  const learningState =
    await readLearningState(
      env
    );


  /* -------------------------------------------------------
     Haberleri paralel oku

     Bir haber hata verirse diğerleri çalışmaya devam eder.
     ------------------------------------------------------- */

  const results =
    await Promise.allSettled(

      links.map(
        readArticle
      )

    );


  /* -------------------------------------------------------
     Başarılı ve anlamlı haberleri al
     ------------------------------------------------------- */

  const items =
    results

      .filter(
        result =>
          result.status ===
          "fulfilled" &&
          Boolean(
            result.value
          )
      )

      .map(
        result =>
          result.value
      )

      .filter(
        item =>
          Number(
            item.relevanceScore ||
            0
          ) >= 3
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

    const score =
      calculateFinalScore(
        item,
        learningState
      );


    item.finalScore =
      Number.isFinite(
        Number(
          score
        )
      )
        ? Number(
            score
          )
        : Number(
            item.relevanceScore ||
            0
          );

  }


  /* =======================================================
     PUAN + TARİHE GÖRE SIRALA
     ======================================================= */

  deduped.sort(
    compareArticles
  );


  /* =======================================================
     SONUÇ
     ======================================================= */

  return {

    source:
      {
        ...SOURCE
      },

    items:
      deduped.slice(
        0,
        safeLimit
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

    /* -----------------------------------------------------
       Haber HTML
       ----------------------------------------------------- */

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
       GERÇEK HABER BÖLÜMÜ
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
      !analysis ||
      analysis.keep !== true
    ) {

      return null;

    }


    /* -----------------------------------------------------
       GERÇEK BİLGİLER
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
        region ||
        html
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
        region ||
        html,
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
       ID
       ----------------------------------------------------- */

    const id =
      makeId(
        url
      );


    /* =====================================================
       SON HABER NESNESİ
       ===================================================== */

    return {

      id:
        id,

      externalId:
        id,


      /* ---------------------------------------------------
         Kullanıcının gördüğü SporNRD içeriği
         --------------------------------------------------- */

      title:
        editorial.title,

      summary:
        editorial.summary,


      /* ---------------------------------------------------
         Orijinal kaynak
         --------------------------------------------------- */

      originalTitle:
        originalTitle,

      originalText:
        originalText,


      /* ---------------------------------------------------
         SporNRD Editörü
         --------------------------------------------------- */

      editorial:
        true,

      editorialLabel:
        "SporNRD Özeti",

      editorialVersion:
        "6.0.4",

      titleCandidates:
        Array.isArray(
          editorial.titleCandidates
        )
          ? editorial.titleCandidates
          : [],


      /* ---------------------------------------------------
         Kaynak
         --------------------------------------------------- */

      sourceId:
        SOURCE.id,

      source:
        SOURCE.name,

      sourceShortName:
        SOURCE.shortName,

      sourceType:
        SOURCE.sourceType,

      verified:
        SOURCE.verified,

      sport:
        SOURCE.sport,


      /* ---------------------------------------------------
         Analiz
         --------------------------------------------------- */

      category:
        analysis.category,

      audience:
        analysis.audience,

      relevanceScore:
        Number(
          analysis.score ||
          0
        ),

      qualityScore:
        Number(
          editorial.qualityScore ||
          0
        ),


      /* ---------------------------------------------------
         Haber DNA
         --------------------------------------------------- */

      topic:
        facts?.topic ||
        originalTitle,

      urgency:
        facts?.urgency ||
        "normal",

      actionRequired:
        Boolean(
          facts?.actionRequired
        ),

      actionLabel:
        editorial.actionLabel ||
        "Detay",

      tags:
        Array.isArray(
          editorial.tags
        )
          ? editorial.tags
          : [],


      /* ---------------------------------------------------
         Yapılandırılmış gerçekler
         --------------------------------------------------- */

      facts:
        facts ||
        {},


      /* ---------------------------------------------------
         Tarih / konum
         --------------------------------------------------- */

      date:
        date?.text ||
        "",

      timestamp:
        Number(
          date?.time ||
          0
        ),

      location:
        facts?.location ||
        "Türkiye",


      /* ---------------------------------------------------
         Medya
         --------------------------------------------------- */

      image:
        image ||
        "",

      url:
        url,

      pdfUrl:
        pdfUrl ||
        "",


      /* ---------------------------------------------------
         Görsel kategori
         --------------------------------------------------- */

      emoji:
        emojiFor(
          analysis.category
        )

    };

  }

  catch (
    error
  ) {

    console.log(

      "TYF haber detayı okunamadı:",

      url,

      getErrorMessage(
        error
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

        method:
          "GET",

        headers: {

          "Accept":
            "text/html,application/xhtml+xml",

          "Accept-Language":
            "tr-TR,tr;q=0.9,en;q=0.8",

          "User-Agent":
            "Mozilla/5.0 (compatible; SporNRD/6.0)"

        },

        redirect:
          "follow"

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
    (
      match =
        regex.exec(
          html
        )
    ) !== null
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


    /* -----------------------------------------------------
       Sadece TYF domaini
       ----------------------------------------------------- */

    try {

      const parsed =
        new URL(
          url
        );


      if (
        parsed.hostname !==
        "www.tyf.gov.tr" &&
        parsed.hostname !==
        "tyf.gov.tr"
      ) {

        continue;

      }

    }

    catch {

      continue;

    }


    /* -----------------------------------------------------
       URL fragment temizliği
       ----------------------------------------------------- */

    url =
      url.split(
        "#"
      )[0];


    /* -----------------------------------------------------
       Tekrar kontrolü
       ----------------------------------------------------- */

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
   HABER SIRALAMASI
   ========================================================= */

function compareArticles(
  a,
  b
) {

  const scoreA =
    Number(
      a?.finalScore ||
      0
    );


  const scoreB =
    Number(
      b?.finalScore ||
      0
    );


  if (
    scoreA !==
    scoreB
  ) {

    return (
      scoreB -
      scoreA
    );

  }


  return (

    Number(
      b?.timestamp ||
      0
    )

    -

    Number(
      a?.timestamp ||
      0
    )

  );

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
   HABER ID
   ========================================================= */

function makeId(
  value
) {

  let hash =
    0;


  const text =
    String(
      value ||
      ""
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


/* =========================================================
   HATA METNİ
   ========================================================= */

function getErrorMessage(
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
