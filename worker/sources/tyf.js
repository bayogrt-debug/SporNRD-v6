/* =========================================================
   SporNRD
   worker/sources/tyf.js

   Türkiye Yüzme Federasyonu Kaynak Motoru

   Sürüm: 6.1.3

   AMAÇ
   ---------------------------------------------------------
   TYF haber listesini taramak, haber detaylarını okumak ve
   mümkün olduğunca ham/gerçek kaynak bilgisini SporNRD
   pipeline'ına aday içerik olarak teslim etmek.

   YENİ MİMARİ KURAL
   ---------------------------------------------------------
   Kaynak motoru artık nihai "SEÇ / ELE" kararı vermez.

   Kaynak motorunun görevi:
   - bağlantıları bulmak
   - haber detayını okumak
   - başlık/gövde/tarih/görsel/PDF çıkarmak
   - classifier sonucunu yardımcı metadata olarak korumak
   - Fact Engine gerçeklerini üretmek
   - legacy uyumluluk için editorial çıktısı üretmek

   Nihai içerik seçimi:
   Selection Engine tarafından yapılır.

   Bu nedenle bu dosyada artık:
   - analysis.keep filtresi YOK
   - relevanceScore >= 3 filtresi YOK
   - kullanıcı ilgisine göre kaynak seviyesinde eleme YOK
   - learning/relevance sıralaması YOK

   Böylece TYF'deki aday içerikler merkezi SporNRD karar
   mekanizmasına ulaşabilir.
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
   LEGACY / YARDIMCI SINIFLANDIRMA

   DİKKAT:
   classifier artık kaynak seviyesinde içerik ELEMEZ.
   Yalnızca yardımcı kategori/audience/score sinyali üretir.
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
   LEGACY EDİTÖR UYUMLULUĞU

   Preview pipeline içinde Persona Engine daha sonra
   kullanıcıya gösterilecek yeni anlatımı yeniden üretir.
   ========================================================= */

import {
  buildEditorial
} from "../intelligence/editorialEngine.js";


/* =========================================================
   VERSION
   ========================================================= */

export const TYF_SOURCE_VERSION =
  "1.1";


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
    BASE,

  sourceVersion:
    TYF_SOURCE_VERSION

};


/* =========================================================
   AYARLAR
   ========================================================= */

const DEFAULT_LIMIT =
  20;


const MAX_LIMIT =
  30;


/*
  Cloudflare Worker subrequest maliyetini kontrollü tutmak
  için kaynak başına taranan maksimum detay sayısı.
*/
const MAX_ARTICLE_SCAN =
  30;


/* =========================================================
   TYF ANA AKIŞ
   ========================================================= */

export async function getTyfFeed({

  limit = DEFAULT_LIMIT,
  env = null

} = {}) {

  /*
    env şu anda TYF kaynak okuma aşamasında kullanılmıyor.
    Parametre provider sözleşmesiyle uyumluluk için korunur.
  */
  void env;


  const safeLimit =
    normalizeLimit(
      limit
    );


  /* =======================================================
     1. HABER LİSTE SAYFASINI OKU
     ========================================================= */

  const html =
    await getHtml(
      NEWS
    );


  /* =======================================================
     2. HABER BAĞLANTILARINI BUL

     findLinks kendi içinde URL tekrarlarını temizler.
     ========================================================= */

  const links =
    findLinks(
      html
    )
      .slice(
        0,
        MAX_ARTICLE_SCAN
      );


  /* =======================================================
     3. HABER DETAYLARINI PARALEL OKU

     Tek bir haber hata verirse diğer adaylar kaybolmaz.
     ========================================================= */

  const results =
    await Promise.allSettled(

      links.map(
        readArticle
      )

    );


  /* =======================================================
     4. BAŞARILI ADAYLARI AL

     KRİTİK:
     Burada relevance / keep / kategori bazlı ELEME YOK.

     Selection Engine bütün anlamlı adayları görmelidir.
     ========================================================= */

  const items =
    results

      .filter(
        result =>
          result.status ===
          "fulfilled"
          &&
          Boolean(
            result.value
          )
      )

      .map(
        result =>
          result.value
      );


  /* =======================================================
     5. KAYNAK KRONOLOJİSİ

     Bu nihai SporNRD ranking değildir.

     Yalnızca TYF aday havuzunu mümkün olduğunca kaynak
     kronolojisine göre düzenler.

     Nihai akış sırası Ranking Engine tarafından verilir.
     ========================================================= */

  items.sort(
    compareByPublicationDate
  );


  /* =======================================================
     6. SONUÇ
     ========================================================= */

  return {

    source:
      {
        ...SOURCE
      },

    candidateCount:
      items.length,

    scannedLinkCount:
      links.length,

    items:
      items.slice(
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

    /* =====================================================
       1. HTML
       ===================================================== */

    const html =
      await getHtml(
        url
      );


    /* =====================================================
       2. ORİJİNAL BAŞLIK

       Başlığı olmayan içerik güvenilir bir aday post
       üretmek için yeterli değildir.
       ===================================================== */

    const originalTitle =
      cleanString(
        extractTitle(
          html
        )
      );


    if (
      !originalTitle
    ) {

      return null;

    }


    /* =====================================================
       3. GERÇEK HABER BÖLGESİ + GÖVDE
       ===================================================== */

    const region =
      extractArticleRegion(
        html
      );


    const originalText =
      cleanString(
        extractBody(
          region,
          originalTitle
        )
      );


    /* =====================================================
       4. CLASSIFIER

       Artık yalnız yardımcı legacy sinyaldir.

       analysis.keep false olsa bile içerik atılmaz.
       Nihai seçim Selection Engine'e aittir.
       ===================================================== */

    const analysis =
      safeClassify(
        originalTitle,
        originalText
      );


    /* =====================================================
       5. FACT ENGINE
       ===================================================== */

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


    /* =====================================================
       6. YAYIN TARİHİ

       KRİTİK:
       Bu değer olay tarihi değildir.
       ===================================================== */

    const date =
      extractDate(
        region ||
        html
      );


    /* =====================================================
       7. MEDYA
       ===================================================== */

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


    /* =====================================================
       8. LEGACY EDITORIAL

       Normalizer'ın mevcut legacy sözleşmesini bozmamak
       için korunur.

       Persona Engine preview pipeline'ın ilerleyen
       aşamasında kullanıcı anlatımını yeniden oluşturur.
       ===================================================== */

    const editorial =
      safeBuildEditorial({

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


    /* =====================================================
       9. ID
       ===================================================== */

    const id =
      makeId(
        url
      );


    /* =====================================================
       10. ADAY LEGACY POST
       ===================================================== */

    return {

      id:
        id,

      externalId:
        id,


      /* ---------------------------------------------------
         Legacy kullanıcı içeriği
         --------------------------------------------------- */

      title:
        cleanString(
          editorial.title ||
          originalTitle
        ),

      summary:
        cleanString(
          editorial.summary ||
          originalText
        ),


      /* ---------------------------------------------------
         Orijinal kaynak içeriği
         --------------------------------------------------- */

      originalTitle:
        originalTitle,

      originalText:
        originalText,


      /* ---------------------------------------------------
         Legacy editorial metadata
         --------------------------------------------------- */

      editorial:
        true,

      editorialLabel:
        "SporNRD Özeti",

      editorialVersion:
        "6.1.3-source-legacy",

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

      sourceWebsite:
        SOURCE.website,

      sourceVersion:
        TYF_SOURCE_VERSION,

      verified:
        SOURCE.verified,

      sport:
        SOURCE.sport,


      /* ---------------------------------------------------
         Classifier yardımcı sinyalleri

         Bunlar kaynak seviyesinde eleme yapmaz.
         --------------------------------------------------- */

      category:
        analysis.category,

      audience:
        analysis.audience,

      relevanceScore:
        safeNumber(
          analysis.score
        ),

      classifierKeep:
        analysis.keep ===
        true,

      classifierReason:
        cleanString(
          analysis.reason ||
          analysis.reasons ||
          ""
        ),


      /* ---------------------------------------------------
         Editorial kalite sinyali
         --------------------------------------------------- */

      qualityScore:
        safeNumber(
          editorial.qualityScore
        ),


      /* ---------------------------------------------------
         Haber DNA
         --------------------------------------------------- */

      topic:
        cleanString(
          facts?.topic ||
          originalTitle
        ),

      urgency:
        cleanString(
          facts?.urgency ||
          "normal"
        ),

      actionRequired:
        Boolean(
          facts?.actionRequired
        ),

      actionLabel:
        cleanString(
          editorial.actionLabel ||
          "Detay"
        ),

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
        facts &&
        typeof facts ===
        "object"

          ? facts

          : {},


      /* ---------------------------------------------------
         YAYIN TARİHİ / KAYNAK KONUMU

         date = publication date

         Gerçek olay tarihleri facts içinde ayrı tutulur.
         --------------------------------------------------- */

      date:
        cleanString(
          date?.text ||
          ""
        ),

      timestamp:
        safeNumber(
          date?.time
        ),

      location:
        cleanString(
          facts?.location ||
          "Türkiye"
        ),


      /* ---------------------------------------------------
         Medya / bağlantı
         --------------------------------------------------- */

      image:
        cleanString(
          image ||
          ""
        ),

      url:
        url,

      pdfUrl:
        cleanString(
          pdfUrl ||
          ""
        ),


      /* ---------------------------------------------------
         Legacy görsel kategori
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
   CLASSIFIER GÜVENLİ ÇAĞRI

   Classifier hata verirse kaynak içeriği kaybedilmez.
   ========================================================= */

function safeClassify(
  title,
  body
) {

  try {

    const result =
      classifyArticle(
        title,
        body
      );


    if (
      result &&
      typeof result ===
      "object"
    ) {

      return {

        category:
          cleanString(
            result.category ||
            "announcement"
          ),

        audience:
          cleanString(
            result.audience ||
            "general"
          ),

        score:
          safeNumber(
            result.score
          ),

        keep:
          result.keep ===
          true,

        reason:
          result.reason ||
          result.reasons ||
          ""

      };

    }

  }

  catch (
    error
  ) {

    console.log(

      "TYF classifier uyarısı:",

      getErrorMessage(
        error
      )

    );

  }


  return {

    category:
      "announcement",

    audience:
      "general",

    score:
      0,

    keep:
      false,

    reason:
      ""

  };

}


/* =========================================================
   EDITORIAL GÜVENLİ ÇAĞRI

   Eski editorial motorundaki hata kaynak içeriğini
   Selection Engine'e ulaşmadan yok etmemelidir.
   ========================================================= */

function safeBuildEditorial({

  originalTitle,
  originalText,
  category,
  facts,
  pdfUrl

}) {

  try {

    const result =
      buildEditorial({

        originalTitle:
          originalTitle,

        originalText:
          originalText,

        category:
          category,

        facts:
          facts,

        pdfUrl:
          pdfUrl

      });


    if (
      result &&
      typeof result ===
      "object"
    ) {

      return result;

    }

  }

  catch (
    error
  ) {

    console.log(

      "TYF legacy editorial uyarısı:",

      getErrorMessage(
        error
      )

    );

  }


  return {

    title:
      originalTitle,

    summary:
      shorten(
        originalText,
        420
      ),

    titleCandidates:
      [],

    qualityScore:
      originalText
        ? 50
        : 25,

    actionLabel:
      "Detay",

    tags:
      []

  };

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
            "Mozilla/5.0 (compatible; SporNRD/6.1)"

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
       Yalnız TYF domaini
       ----------------------------------------------------- */

    try {

      const parsed =
        new URL(
          url
        );


      if (
        parsed.hostname !==
        "www.tyf.gov.tr"
        &&
        parsed.hostname !==
        "tyf.gov.tr"
      ) {

        continue;

      }


      /*
        Fragment seçim kararına katkı sağlamaz.
      */

      parsed.hash =
        "";


      url =
        parsed.href;

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
   YAYIN TARİHİNE GÖRE KAYNAK SIRASI

   Bu RANKING değildir.
   ========================================================= */

function compareByPublicationDate(
  a,
  b
) {

  const timestampA =
    safeNumber(
      a?.timestamp
    );


  const timestampB =
    safeNumber(
      b?.timestamp
    );


  if (
    timestampA !==
    timestampB
  ) {

    return (
      timestampB -
      timestampA
    );

  }


  return cleanString(
    a?.originalTitle
  ).localeCompare(
    cleanString(
      b?.originalTitle
    ),
    "tr-TR"
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
   LEGACY KATEGORİ EMOJİSİ
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
      cleanString(
        category
      )
        .toLowerCase()
    ]
    ||
    "🏊"
  );

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
   CLEAN STRING
   ========================================================= */

function cleanString(
  value
) {

  if (
    Array.isArray(
      value
    )
  ) {

    return value
      .map(
        cleanString
      )
      .filter(
        Boolean
      )
      .join(
        " · "
      );

  }


  if (
    value &&
    typeof value ===
    "object"
  ) {

    return "";

  }


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
   SHORTEN
   ========================================================= */

function shorten(
  value,
  max
) {

  const text =
    cleanString(
      value
    );


  if (
    text.length <=
    max
  ) {

    return text;

  }


  const part =
    text.slice(
      0,
      max
    );


  const lastSpace =
    part.lastIndexOf(
      " "
    );


  return (
    part.slice(
      0,
      lastSpace > 0
        ? lastSpace
        : max
    )
    +
    "…"
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