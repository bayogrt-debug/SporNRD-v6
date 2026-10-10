/* =========================================================
   SporNRD
   worker/sources/tbf.js

   Türkiye Basketbol Federasyonu
   Liste tabanlı güvenli kaynak okuyucu

   SporNRD v6.0.4
   Safe Location Patch: 6.1
   ========================================================= */


import {
  cleanHtml,
  decodeEntities,
  normalize
} from "../utils/html.js";


/* =========================================================
   KAYNAK AYARLARI
   ========================================================= */

const BASE =
  "https://www.tbf.org.tr";


const NEWS =
  `${BASE}/haberler`;


const SOURCE = {

  id:
    "tbf",

  name:
    "Türkiye Basketbol Federasyonu",

  shortName:
    "TBF",

  sourceType:
    "FEDERASYON",

  sport:
    "Basketbol",

  verified:
    true,

  website:
    BASE

};


const DEFAULT_LIMIT =
  20;


const MAX_LIMIT =
  30;


const MAX_SCAN =
  50;


/* =========================================================
   TÜRKİYE İLLERİ
   ========================================================= */

const CITIES = [

  "Adana",
  "Adıyaman",
  "Afyonkarahisar",
  "Ağrı",
  "Aksaray",
  "Amasya",
  "Ankara",
  "Antalya",
  "Ardahan",
  "Artvin",
  "Aydın",
  "Balıkesir",
  "Bartın",
  "Batman",
  "Bayburt",
  "Bilecik",
  "Bingöl",
  "Bitlis",
  "Bolu",
  "Burdur",
  "Bursa",
  "Çanakkale",
  "Çankırı",
  "Çorum",
  "Denizli",
  "Diyarbakır",
  "Düzce",
  "Edirne",
  "Elazığ",
  "Erzincan",
  "Erzurum",
  "Eskişehir",
  "Gaziantep",
  "Giresun",
  "Gümüşhane",
  "Hakkari",
  "Hatay",
  "Iğdır",
  "Isparta",
  "İstanbul",
  "İzmir",
  "Kahramanmaraş",
  "Karabük",
  "Karaman",
  "Kars",
  "Kastamonu",
  "Kayseri",
  "Kırıkkale",
  "Kırklareli",
  "Kırşehir",
  "Kilis",
  "Kocaeli",
  "Konya",
  "Kütahya",
  "Malatya",
  "Manisa",
  "Mardin",
  "Mersin",
  "Muğla",
  "Muş",
  "Nevşehir",
  "Niğde",
  "Ordu",
  "Osmaniye",
  "Rize",
  "Sakarya",
  "Samsun",
  "Siirt",
  "Sinop",
  "Sivas",
  "Şanlıurfa",
  "Şırnak",
  "Tekirdağ",
  "Tokat",
  "Trabzon",
  "Tunceli",
  "Uşak",
  "Van",
  "Yalova",
  "Yozgat",
  "Zonguldak"

];


/* =========================================================
   ANA TBF AKIŞI
   ========================================================= */

export async function getTbfFeed({
  limit = DEFAULT_LIMIT,
  env = null
} = {}) {

  /*
    TBF için learning entegrasyonu ileride
    ortak relevance motoruna bağlanabilir.

    Şimdilik kaynak okumasını etkilemez.
  */

  void env;


  const html =
    await getHtml(
      NEWS
    );


  const rawItems =
    extractNews(
      html
    )
      .slice(
        0,
        MAX_SCAN
      );


  const items =
    rawItems

      .map(
        createArticle
      )

      .filter(
        Boolean
      );


  /* -------------------------------------------------------
     Aynı haberleri temizle
     ------------------------------------------------------- */

  const uniqueItems =
    dedupeArticles(
      items
    );


  /* -------------------------------------------------------
     Puan + tarih
     ------------------------------------------------------- */

  uniqueItems.sort(
    compareArticles
  );


  return {

    source: {
      ...SOURCE
    },

    items:
      uniqueItems.slice(
        0,
        normalizeLimit(
          limit
        )
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

        method:
          "GET",

        headers: {

          "Accept":
            "text/html,application/xhtml+xml",

          "Accept-Language":
            "tr-TR,tr;q=0.9,en;q=0.8",

          "User-Agent":
            "Mozilla/5.0 (compatible; SporNRD/6.0.4)"

        },

        redirect:
          "follow"

      }
    );


  if (
    !response.ok
  ) {

    throw new Error(
      `TBF HTTP ${response.status}: ${url}`
    );

  }


  const html =
    await response.text();


  if (
    !html ||
    html.length < 100
  ) {

    throw new Error(
      "TBF boş veya geçersiz HTML döndürdü."
    );

  }


  return html;

}


/* =========================================================
   HABERLERİ LİSTE SAYFASINDAN ÇIKAR

   Komşu haberlerin metnini almaz.
   Yalnızca ilgili /haber/... kartını okur.
   ========================================================= */

function extractNews(
  html
) {

  const output =
    [];


  const usedUrls =
    new Set();


  const anchorRegex =
    /<a\b([^>]*?)href=["']([^"']*\/haber\/[^"'#]+)["']([^>]*)>([\s\S]*?)<\/a>/gi;


  let match;


  while (
    (
      match =
        anchorRegex.exec(
          html
        )
    ) !== null
  ) {

    /* -----------------------------------------------------
       URL
       ----------------------------------------------------- */

    const url =
      resolveNewsUrl(
        match[2]
      );


    if (
      !url ||
      usedUrls.has(
        url
      )
    ) {

      continue;

    }


    /* -----------------------------------------------------
       SADECE BU HABERİN KARTI
       ----------------------------------------------------- */

    const cardHtml =
      String(
        match[4] ||
        ""
      );


    if (
      !cardHtml
    ) {

      continue;

    }


    const cardText =
      cleanCardText(
        cardHtml
      );


    if (
      !cardText ||
      cardText.length < 6
    ) {

      continue;

    }


    /* -----------------------------------------------------
       TARİH
       ----------------------------------------------------- */

    const date =
      extractCardDate(
        cardText
      );


    /* -----------------------------------------------------
       BAŞLIK
       ----------------------------------------------------- */

    const title =
      extractCardTitle(
        cardHtml,
        cardText,
        date
      );


    if (
      !isValidTitle(
        title
      )
    ) {

      continue;

    }


    /* -----------------------------------------------------
       ÖZET
       ----------------------------------------------------- */

    const summary =
      extractCardSummary(
        cardHtml,
        cardText,
        title,
        date
      );


    /* -----------------------------------------------------
       GÖRSEL
       ----------------------------------------------------- */

    const image =
      extractImageFromBlock(
        cardHtml
      );


    usedUrls.add(
      url
    );


    output.push({

      url:
        url,

      title:
        title,

      summary:
        summary,

      date:
        date,

      image:
        image

    });

  }


  return output;

}


/* =========================================================
   HABER URL
   ========================================================= */

function resolveNewsUrl(
  href
) {

  try {

    const url =
      new URL(
        decodeEntities(
          href
        ),
        BASE
      );


    url.hash =
      "";


    if (
      !isTbfUrl(
        url.href
      )
    ) {

      return "";

    }


    if (
      !url.pathname
        .toLocaleLowerCase(
          "tr-TR"
        )
        .includes(
          "/haber/"
        )
    ) {

      return "";

    }


    return url.href;

  }

  catch {

    return "";

  }

}


/* =========================================================
   TBF URL KONTROLÜ
   ========================================================= */

function isTbfUrl(
  value
) {

  try {

    const url =
      new URL(
        value
      );


    const hostname =
      url.hostname
        .toLowerCase();


    return (
      hostname ===
      "www.tbf.org.tr" ||
      hostname ===
      "tbf.org.tr"
    );

  }

  catch {

    return false;

  }

}


/* =========================================================
   KART BAŞLIĞI

   Öncelik:
   1. h1-h6
   2. title class
   3. img alt
   4. kart metni
   ========================================================= */

function extractCardTitle(
  cardHtml,
  cardText,
  date
) {

  /* -------------------------------------------------------
     H1-H6
     ------------------------------------------------------- */

  const headingRegex =
    /<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi;


  let headingMatch;


  while (
    (
      headingMatch =
        headingRegex.exec(
          cardHtml
        )
    ) !== null
  ) {

    const value =
      cleanCandidateTitle(
        headingMatch[1],
        date
      );


    if (
      isValidTitle(
        value
      )
    ) {

      return value;

    }

  }


  /* -------------------------------------------------------
     class="...title..."
     ------------------------------------------------------- */

  const titleClassRegex =
    /<(?:div|span|p)\b[^>]*class=["'][^"']*(?:title|baslik|headline)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|span|p)>/gi;


  let classMatch;


  while (
    (
      classMatch =
        titleClassRegex.exec(
          cardHtml
        )
    ) !== null
  ) {

    const value =
      cleanCandidateTitle(
        classMatch[1],
        date
      );


    if (
      isValidTitle(
        value
      )
    ) {

      return value;

    }

  }


  /* -------------------------------------------------------
     IMG ALT FALLBACK
     ------------------------------------------------------- */

  const altMatch =
    cardHtml.match(
      /<img\b[^>]*alt=["']([^"']+)["'][^>]*>/i
    );


  if (
    altMatch
  ) {

    const value =
      cleanCandidateTitle(
        altMatch[1],
        date
      );


    if (
      isValidTitle(
        value
      ) &&
      !isGenericImageAlt(
        value
      )
    ) {

      return value;

    }

  }


  /* -------------------------------------------------------
     KART METNİ
     ------------------------------------------------------- */

  let text =
    String(
      cardText ||
      ""
    );


  if (
    date
  ) {

    text =
      removeAll(
        text,
        date
      );

  }


  text =
    removeCtaText(
      text
    );


  text =
    collapseRepeatedText(
      text
    );


  const sentence =
    text.match(
      /^(.{6,180}?)(?:[.!?](?:\s|$)|$)/
    );


  if (
    sentence
  ) {

    const candidate =
      cleanCandidateTitle(
        sentence[1],
        ""
      );


    if (
      isValidTitle(
        candidate
      )
    ) {

      return candidate;

    }

  }


  return shorten(
    cleanCandidateTitle(
      text,
      ""
    ),
    160
  );

}


/* =========================================================
   BAŞLIK TEMİZLE
   ========================================================= */

function cleanCandidateTitle(
  value,
  date
) {

  let text =
    cleanText(
      value
    );


  if (
    date
  ) {

    text =
      removeAll(
        text,
        date
      );

  }


  text =
    removeCtaText(
      text
    );


  text =
    text

      .replace(
        /^[|•·\-–—:]+/,
        ""
      )

      .replace(
        /[|•·\-–—:]+$/,
        ""
      )

      .replace(
        /\s+/g,
        " "
      )

      .trim();


  return text;

}


/* =========================================================
   BAŞLIK GEÇERLİ Mİ?
   ========================================================= */

function isValidTitle(
  value
) {

  const text =
    cleanText(
      value
    );


  if (
    !text ||
    text.length < 6 ||
    text.length > 200
  ) {

    return false;

  }


  if (
    isDateOnly(
      text
    )
  ) {

    return false;

  }


  const normalized =
    normalize(
      text
    );


  const invalid = [

    "DEVAMINI GOR",
    "DETAYLAR",
    "HABERLER",
    "TUM HABERLER",
    "DAHA FAZLA",
    "INCELE"

  ];


  if (
    invalid.some(
      item =>
        normalized ===
        item
    )
  ) {

    return false;

  }


  return true;

}


/* =========================================================
   KART TARİHİ
   ========================================================= */

function extractCardDate(
  text
) {

  const value =
    String(
      text ||
      ""
    );


  /* -------------------------------------------------------
     09.10.2026
     ------------------------------------------------------- */

  let match =
    value.match(
      /\b(\d{1,2})[.\/-](\d{1,2})[.\/-](20\d{2})\b/
    );


  if (
    match
  ) {

    return (
      `${pad2(match[1])}.` +
      `${pad2(match[2])}.` +
      `${match[3]}`
    );

  }


  /* -------------------------------------------------------
     9 Ekim 2026
     ------------------------------------------------------- */

  match =
    value.match(

      /\b(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+(20\d{2})\b/i

    );


  if (
    match
  ) {

    return (
      `${Number(match[1])} ` +
      `${match[2]} ` +
      `${match[3]}`
    );

  }


  return "";

}


/* =========================================================
   KART ÖZETİ

   Öncelik:
   1. description/summary class
   2. p elementleri
   3. kartın kalan temiz metni
   ========================================================= */

function extractCardSummary(
  cardHtml,
  cardText,
  title,
  date
) {

  const candidates =
    [];


  /* -------------------------------------------------------
     SUMMARY / DESCRIPTION CLASS
     ------------------------------------------------------- */

  const summaryClassRegex =
    /<(?:div|span|p)\b[^>]*class=["'][^"']*(?:summary|description|desc|excerpt|spot|text|content)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|span|p)>/gi;


  let summaryMatch;


  while (
    (
      summaryMatch =
        summaryClassRegex.exec(
          cardHtml
        )
    ) !== null
  ) {

    const value =
      cleanSummaryCandidate(
        summaryMatch[1],
        title,
        date
      );


    if (
      isValidSummary(
        value
      )
    ) {

      candidates.push(
        value
      );

    }

  }


  /* -------------------------------------------------------
     P ELEMENTLERİ
     ------------------------------------------------------- */

  const paragraphRegex =
    /<p\b[^>]*>([\s\S]*?)<\/p>/gi;


  let paragraphMatch;


  while (
    (
      paragraphMatch =
        paragraphRegex.exec(
          cardHtml
        )
    ) !== null
  ) {

    const value =
      cleanSummaryCandidate(
        paragraphMatch[1],
        title,
        date
      );


    if (
      isValidSummary(
        value
      )
    ) {

      candidates.push(
        value
      );

    }

  }


  /* -------------------------------------------------------
     İLK KALİTELİ ADAY
     ------------------------------------------------------- */

  const uniqueCandidates =
    uniqueTexts(
      candidates
    );


  if (
    uniqueCandidates.length
  ) {

    return shorten(
      uniqueCandidates[0],
      360
    );

  }


  /* -------------------------------------------------------
     KART METNİ FALLBACK
     ------------------------------------------------------- */

  const fallback =
    cleanSummaryCandidate(
      cardText,
      title,
      date
    );


  if (
    !isValidSummary(
      fallback
    )
  ) {

    return "";

  }


  return shorten(
    fallback,
    360
  );

}


/* =========================================================
   ÖZET TEMİZLE
   ========================================================= */

function cleanSummaryCandidate(
  value,
  title,
  date
) {

  let text =
    cleanText(
      value
    );


  text =
    removeCtaText(
      text
    );


  if (
    date
  ) {

    text =
      removeAll(
        text,
        date
      );

  }


  if (
    title
  ) {

    text =
      removeAll(
        text,
        title
      );

  }


  text =
    collapseRepeatedText(
      text
    );


  return text
    .replace(
      /\s+/g,
      " "
    )
    .trim();

}


/* =========================================================
   ÖZET GEÇERLİ Mİ?
   ========================================================= */

function isValidSummary(
  value
) {

  const text =
    cleanText(
      value
    );


  if (
    !text ||
    text.length < 25
  ) {

    return false;

  }


  if (
    isDateOnly(
      text
    )
  ) {

    return false;

  }


  return true;

}


/* =========================================================
   CTA METNİ TEMİZLE
   ========================================================= */

function removeCtaText(
  value
) {

  return String(
    value ||
    ""
  )

    .replace(
      /Devamını\s+Gör/gi,
      " "
    )

    .replace(
      /Haberi\s+Oku/gi,
      " "
    )

    .replace(
      /Detay(?:lar)?/gi,
      " "
    )

    .replace(
      /İncele/gi,
      " "
    )

    .replace(
      /\s+/g,
      " "
    )

    .trim();

}


/* =========================================================
   TEKRAR EDEN METNİ AZALT
   ========================================================= */

function collapseRepeatedText(
  value
) {

  let text =
    String(
      value ||
      ""
    )
      .replace(
        /\s+/g,
        " "
      )
      .trim();


  if (
    !text
  ) {

    return "";

  }


  const words =
    text.split(
      " "
    );


  if (
    words.length >= 6 &&
    words.length % 2 === 0
  ) {

    const half =
      words.length /
      2;


    const first =
      words
        .slice(
          0,
          half
        )
        .join(
          " "
        );


    const second =
      words
        .slice(
          half
        )
        .join(
          " "
        );


    if (
      normalize(
        first
      ) ===
      normalize(
        second
      )
    ) {

      text =
        first;

    }

  }


  return text;

}


/* =========================================================
   HABER MODELİ
   ========================================================= */

function createArticle(
  raw
) {

  if (
    !raw ||
    !isValidTitle(
      raw.title
    )
  ) {

    return null;

  }


  const analysis =
    classify(
      raw.title,
      raw.summary
    );


  if (
    !analysis.keep
  ) {

    return null;

  }


  const combined =
    `${raw.title} ${raw.summary || ""}`;


  /*
    Konum artık başlık + özet ayrı ayrı analiz edilir.

    Böylece:
    "Çimsa ÇBK Mersin"
    gibi takım adlarından yanlış konum çıkarılmaz.
  */

  const location =
    findLocation(
      raw.title,
      raw.summary
    );


  const eventDate =
    findEventDate(
      combined
    );


  const deadline =
    findDeadline(
      combined
    );


  const grade =
    findGrade(
      raw.title
    );


  const editorial =
    createEditorial({

      title:
        raw.title,

      summary:
        raw.summary,

      category:
        analysis.category,

      location:
        location,

      eventDate:
        eventDate,

      deadline:
        deadline,

      grade:
        grade

    });


  const timestamp =
    parseDateTimestamp(
      raw.date
    );


  const qualityScore =
    calculateQuality({

      title:
        editorial.title,

      summary:
        editorial.summary,

      image:
        raw.image,

      location:
        location,

      eventDate:
        eventDate

    });


  const id =
    createId(
      raw.url
    );


  return {

    /* -----------------------------------------------------
       KİMLİK
       ----------------------------------------------------- */

    id:
      id,

    externalId:
      id,


    /* -----------------------------------------------------
       SPORNRD İÇERİĞİ
       ----------------------------------------------------- */

    title:
      editorial.title,

    summary:
      editorial.summary,


    /* -----------------------------------------------------
       ORİJİNAL KAYNAK
       ----------------------------------------------------- */

    originalTitle:
      raw.title,

    originalText:
      raw.summary ||
      "",


    /* -----------------------------------------------------
       SPORNRD EDİTÖR
       ----------------------------------------------------- */

    editorial:
      true,

    editorialLabel:
      "SporNRD Özeti",

    editorialVersion:
      "6.0.4-TBF-safe-location",


    /* -----------------------------------------------------
       KAYNAK
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       ANALİZ
       ----------------------------------------------------- */

    category:
      analysis.category,

    audience:
      analysis.audience,

    relevanceScore:
      analysis.score,

    qualityScore:
      qualityScore,

    finalScore:
      (
        analysis.score *
        10
      )
      +
      qualityScore,


    /* -----------------------------------------------------
       HABER DNA
       ----------------------------------------------------- */

    topic:
      editorial.topic,

    urgency:
      deadline

        ? "high"

        : analysis.actionRequired

          ? "important"

          : "normal",

    actionRequired:
      Boolean(
        analysis.actionRequired ||
        deadline
      ),

    actionLabel:
      editorial.actionLabel,

    tags:
      editorial.tags,


    /* -----------------------------------------------------
       GERÇEKLER
       ----------------------------------------------------- */

    facts: {

      organization:
        SOURCE.name,

      sport:
        SOURCE.sport,

      category:
        analysis.category,

      audience:
        analysis.audience,

      location:
        location,

      eventDate:
        eventDate,

      deadline:
        deadline,

      grade:
        grade

    },


    /* -----------------------------------------------------
       TARİH / KONUM
       ----------------------------------------------------- */

    date:
      raw.date ||
      "",

    timestamp:
      timestamp,

    /*
      Bilinmiyorsa boş bırakılır.
      "Türkiye" artık şehir gibi kullanılmaz.
    */

    location:
      location,


    /* -----------------------------------------------------
       MEDYA
       ----------------------------------------------------- */

    image:
      raw.image ||
      "",

    url:
      raw.url,

    pdfUrl:
      "",


    /* -----------------------------------------------------
       GÖRSEL KATEGORİ
       ----------------------------------------------------- */

    emoji:
      getEmoji(
        analysis.category
      )

  };

}


/* =========================================================
   SINIFLANDIRMA
   ========================================================= */

function classify(
  title,
  summary
) {

  const titleText =
    normalize(
      title
    );


  const allText =
    normalize(
      `${title || ""} ${summary || ""}`
    );


  /* -------------------------------------------------------
     AKIŞ DIŞI
     ------------------------------------------------------- */

  if (
    containsAny(
      titleText,
      [

        "VEFAT",
        "BASSAGLIGI",
        "DISIPLIN KURULU",
        "ZIYARET",
        "BASKAN MESAJI",
        "GENEL KURUL",
        "IHALE",
        "SATIN ALMA"

      ]
    )
  ) {

    return classificationResult(
      false,
      "announcement",
      "general",
      0,
      false
    );

  }


  /* -------------------------------------------------------
     ANTRENÖR
     ------------------------------------------------------- */

  if (
    containsAny(
      titleText,
      [

        "ANTRENOR",
        "ANTRENORLUK",
        "BASANTRENOR"

      ]
    )
  ) {

    return classificationResult(

      true,

      "coach",

      "antrenör",

      10,

      containsAny(
        allText,
        [
          "BASVURU",
          "KAYIT",
          "SON BASVURU",
          "KURS"
        ]
      )

    );

  }


  /* -------------------------------------------------------
     SPORCU / MİLLİ TAKIM
     ------------------------------------------------------- */

  if (
    containsAny(
      titleText,
      [

        "MILLI TAKIM",
        "MILLI TAKIMIMIZ",
        "SPORCU",
        "OYUNCU",
        "ADAY KADRO",
        "KADROSU",
        "U14",
        "U15",
        "U16",
        "U17",
        "U18",
        "U19",
        "U20"

      ]
    )
  ) {

    return classificationResult(
      true,
      "athlete",
      "sporcu",
      9,
      false
    );

  }


  /* -------------------------------------------------------
     EĞİTİM
     ------------------------------------------------------- */

  if (
    containsAny(
      titleText,
      [

        "EGITIM",
        "SEMINER",
        "SERTIFIKA",
        "AKADEMI",
        "KURS"

      ]
    )
  ) {

    return classificationResult(

      true,

      "education",

      "general",

      8,

      containsAny(
        allText,
        [
          "BASVURU",
          "KAYIT"
        ]
      )

    );

  }


  /* -------------------------------------------------------
     LİG / KUPA / MAÇ
     ------------------------------------------------------- */

  if (
    containsAny(
      titleText,
      [

        "LIG",
        "KUPA",
        "SAMPIYON",
        "SAMPIYONA",
        "FINAL",
        "FINAL FOUR",
        "MAC",
        "MUSABAKA",
        "FIBA",
        "EUROCUP",
        "EUROLEAGUE",
        "SEZON",
        "PLAY-OFF",
        "PLAYOFF"

      ]
    )
  ) {

    return classificationResult(
      true,
      "event",
      "general",
      7,
      false
    );

  }


  /* -------------------------------------------------------
     ÖNEMLİ DUYURU
     ------------------------------------------------------- */

  if (
    containsAny(
      allText,
      [

        "BASVURU",
        "KAYIT",
        "DUYURU",
        "FAALIYET PROGRAMI",
        "PROGRAMI ACIKLANDI",
        "TAKVIM"

      ]
    )
  ) {

    return classificationResult(
      true,
      "announcement",
      "general",
      5,
      true
    );

  }


  /* -------------------------------------------------------
     GENEL BASKETBOL HABERİ
     ------------------------------------------------------- */

  return classificationResult(
    true,
    "event",
    "general",
    4,
    false
  );

}


/* =========================================================
   SINIFLANDIRMA SONUCU
   ========================================================= */

function classificationResult(
  keep,
  category,
  audience,
  score,
  actionRequired
) {

  return {

    keep:
      Boolean(
        keep
      ),

    category:
      category,

    audience:
      audience,

    score:
      Number(
        score ||
        0
      ),

    actionRequired:
      Boolean(
        actionRequired
      )

  };

}


/* =========================================================
   SPORNRD EDİTÖR
   ========================================================= */

function createEditorial({

  title,
  summary,
  category,
  location,
  eventDate,
  deadline,
  grade

}) {

  const normalizedTitle =
    normalize(
      title
    );


  let newTitle =
    cleanText(
      title
    );


  let newSummary =
    cleanText(
      summary
    );


  let actionLabel =
    "Haberi İncele";


  let topic =
    newTitle;


  const tags =
    [
      "Basketbol"
    ];


  /* =======================================================
     ANTRENÖR KURSU
     ======================================================= */

  if (
    category ===
    "coach" &&
    normalizedTitle.includes(
      "KURS"
    )
  ) {

    const level =
      grade
        ? `${grade}. Kademe`
        : "Basketbol";


    newTitle =
      `${level} basketbol antrenör kursu`;


    if (
      location &&
      location !==
      "Türkiye"
    ) {

      newTitle +=
        ` ${location}’da`;

    }


    if (
      eventDate
    ) {

      newTitle +=
        `: ${eventDate}`;

    }


    topic =
      `${level} Basketbol Antrenör Kursu`;


    newSummary =
      `TBF, ${level} Basketbol Antrenör Kursu’na ilişkin yeni duyuruyu yayımladı.`;


    if (
      eventDate &&
      location &&
      location !==
      "Türkiye"
    ) {

      newSummary =
        `TBF, ${level} Basketbol Antrenör Kursu’nu ${eventDate} tarihlerinde ${location}’da düzenleyecek.`;

    }


    else if (
      eventDate
    ) {

      newSummary +=
        ` Kurs tarihi ${eventDate}.`;

    }


    else if (
      location &&
      location !==
      "Türkiye"
    ) {

      newSummary +=
        ` Kurs ${location}’da gerçekleştirilecek.`;

    }


    if (
      deadline
    ) {

      newSummary +=
        ` Son başvuru/kayıt bilgisi: ${deadline}.`;

    }


    newSummary +=
      " Başvuru ve katılım ayrıntıları federasyonun resmî duyurusunda yer alıyor.";


    actionLabel =
      "Kurs Detayları";


    tags.push(
      "Antrenör",
      "Kurs"
    );

  }


  /* =======================================================
     ANTRENÖR
     ======================================================= */

  else if (
    category ===
    "coach"
  ) {

    actionLabel =
      "Antrenör Duyurusunu İncele";


    tags.push(
      "Antrenör"
    );

  }


  /* =======================================================
     SPORCU
     ======================================================= */

  else if (
    category ===
    "athlete"
  ) {

    actionLabel =
      "Sporcu Duyurusunu İncele";


    tags.push(
      "Sporcu"
    );

  }


  /* =======================================================
     EĞİTİM
     ======================================================= */

  else if (
    category ===
    "education"
  ) {

    actionLabel =
      "Eğitimi İncele";


    tags.push(
      "Eğitim"
    );

  }


  /* =======================================================
     ETKİNLİK / HABER
     ======================================================= */

  else if (
    category ===
    "event"
  ) {

    actionLabel =
      "Haberi İncele";

  }


  /* =======================================================
     DUYURU
     ======================================================= */

  else {

    actionLabel =
      "Duyuruyu İncele";


    tags.push(
      "Duyuru"
    );

  }


  /* -------------------------------------------------------
     KONUM ETİKETİ
     ------------------------------------------------------- */

  if (
    location &&
    location !==
    "Türkiye"
  ) {

    tags.push(
      location
    );

  }


  /* -------------------------------------------------------
     KADEME
     ------------------------------------------------------- */

  if (
    grade
  ) {

    tags.push(
      `${grade}. Kademe`
    );

  }


  /* -------------------------------------------------------
     AÇIKLAMA GÜVENLİĞİ
     ------------------------------------------------------- */

  if (
    !newSummary ||
    newSummary.length < 25
  ) {

    newSummary =
      fallbackSummary(
        category
      );

  }


  /* -------------------------------------------------------
     BAŞLIK GÜVENLİĞİ
     ------------------------------------------------------- */

  if (
    !newTitle ||
    newTitle.length < 6
  ) {

    newTitle =
      "Türkiye Basketbol Federasyonu duyurusu";

  }


  return {

    title:
      shorten(
        newTitle,
        120
      ),

    summary:
      shorten(
        newSummary,
        360
      ),

    topic:
      shorten(
        topic,
        140
      ),

    actionLabel:
      actionLabel,

    tags:
      [
        ...new Set(
          tags.filter(
            Boolean
          )
        )
      ]

  };

}


/* =========================================================
   YEDEK ÖZET
   ========================================================= */

function fallbackSummary(
  category
) {

  const map = {

    coach:
      "Türkiye Basketbol Federasyonu, antrenörleri ilgilendiren yeni bir resmî duyuru yayımladı. Ayrıntılar federasyonun resmî kaynağında yer alıyor.",

    athlete:
      "Türkiye Basketbol Federasyonu, sporcuları ilgilendiren yeni bir resmî içerik yayımladı. Ayrıntılar federasyonun resmî kaynağında yer alıyor.",

    education:
      "Türkiye Basketbol Federasyonu, yeni bir eğitim veya seminer duyurusu yayımladı. Ayrıntılar federasyonun resmî kaynağında yer alıyor.",

    event:
      "Türkiye Basketbol Federasyonu yeni bir basketbol içeriği yayımladı. Ayrıntılar federasyonun resmî kaynağında yer alıyor.",

    announcement:
      "Türkiye Basketbol Federasyonu yeni bir resmî duyuru yayımladı. Ayrıntılar federasyonun resmî kaynağında yer alıyor."

  };


  return (
    map[
      category
    ] ||
    map.announcement
  );

}


/* =========================================================
   GÖRSEL
   ========================================================= */

function extractImageFromBlock(
  html
) {

  const patterns = [

    /<img\b[^>]*(?:data-src|data-original|data-lazy-src)=["']([^"']+)["'][^>]*>/i,

    /<img\b[^>]*src=["']([^"']+)["'][^>]*>/i

  ];


  for (
    const pattern
    of patterns
  ) {

    const match =
      String(
        html ||
        ""
      )
        .match(
          pattern
        );


    if (
      !match
    ) {

      continue;

    }


    try {

      const raw =
        decodeEntities(
          match[1]
        );


      if (
        !raw ||
        /^data:/i.test(
          raw
        )
      ) {

        continue;

      }


      const url =
        new URL(
          raw,
          BASE
        ).href;


      if (
        isBadImage(
          url
        )
      ) {

        continue;

      }


      return url;

    }

    catch {

      /* sonraki pattern */

    }

  }


  return "";

}


/* =========================================================
   KÖTÜ GÖRSEL
   ========================================================= */

function isBadImage(
  value
) {

  const text =
    String(
      value ||
      ""
    )
      .toLowerCase();


  const bad = [

    "logo",
    "favicon",
    "icon",
    "spinner",
    "loading",
    "placeholder",
    "avatar"

  ];


  return bad.some(
    item =>
      text.includes(
        item
      )
  );

}


/* =========================================================
   GÜVENLİ KONUM ÇIKARIMI

   TEMEL KURAL
   ---------------------------------------------------------
   Bir şehir adı yalnızca metinde geçiyor diye
   etkinlik konumu kabul edilmez.

   Örnek:

   "Çimsa ÇBK Mersin"
   → takım adı
   → Mersin konumu değildir.

   "Mersin'de düzenlenecek"
   → Mersin konumdur.

   "Mersin Spor Salonu"
   → güçlü konum kanıtıdır.

   "Ankara 2. Kademe Antrenör Kursu"
   → başlık bağlamında güçlü konum kanıtıdır.

   Emin değilsek boş bırakılır.
   ========================================================= */

function findLocation(
  title,
  summary
) {

  const cleanTitle =
    cleanText(
      title
    );


  const cleanSummary =
    cleanText(
      summary
    );


  const normalizedTitle =
    normalize(
      cleanTitle
    );


  const normalizedSummary =
    normalize(
      cleanSummary
    );


  const normalizedAll =
    normalize(
      `${cleanTitle} ${cleanSummary}`
    );


  if (
    !normalizedAll
  ) {

    return "";

  }


  for (
    const city
    of CITIES
  ) {

    const cityNormalized =
      normalize(
        city
      );


    const cityPattern =
      escapeRegex(
        cityNormalized
      );


    /* =====================================================
       1. ŞEHİR + BULUNMA EKİ

       Ankara'da
       İzmir'de
       Mersin’de
       Antalya'daki
       ===================================================== */

    const locativePattern =
      new RegExp(

        `(?:^|[^A-Z0-9])` +
        `${cityPattern}` +
        `(?:'|’)?` +
        `(?:DA|DE|TA|TE)` +
        `(?:KI)?` +
        `(?:[^A-Z0-9]|$)`,

        "i"

      );


    if (
      locativePattern.test(
        normalizedAll
      )
    ) {

      return city;

    }


    /* =====================================================
       2. ŞEHİR İLİ / İLİNDE / İLİNDEKİ
       ===================================================== */

    const provincePattern =
      new RegExp(

        `(?:^|[^A-Z0-9])` +
        `${cityPattern}` +
        `\\s+` +
        `IL(?:I|INDE|INDEKI)` +
        `(?:[^A-Z0-9]|$)`,

        "i"

      );


    if (
      provincePattern.test(
        normalizedAll
      )
    ) {

      return city;

    }


    /* =====================================================
       3. EV SAHİPLİĞİ
       ===================================================== */

    const hostPattern =
      new RegExp(

        `(?:^|[^A-Z0-9])` +
        `${cityPattern}` +
        `(?:[^.!?]{0,45})` +
        `(?:` +
          `EV SAHIPLIGINDE|` +
          `EV SAHIPLIGI YAPACAK|` +
          `EV SAHIPLIGI YAPTI` +
        `)`,

        "i"

      );


    if (
      hostPattern.test(
        normalizedAll
      )
    ) {

      return city;

    }


    /* =====================================================
       4. ŞEHİR + SALON / TESİS / ARENA
       ===================================================== */

    const cityVenuePattern =
      new RegExp(

        `(?:^|[^A-Z0-9])` +
        `${cityPattern}` +
        `(?:[^.!?]{0,55})` +
        `(?:` +
          `SPOR SALONU|` +
          `SALONU|` +
          `ARENA|` +
          `STADYUM|` +
          `STADI|` +
          `SPOR TESISI|` +
          `TESISLERI|` +
          `TESISI|` +
          `SPOR MERKEZI|` +
          `KOMPLEKSI` +
        `)`,

        "i"

      );


    if (
      cityVenuePattern.test(
        normalizedAll
      )
    ) {

      return city;

    }


    /* =====================================================
       5. SALON / TESİS + ŞEHİR
       ===================================================== */

    const venueCityPattern =
      new RegExp(

        `(?:` +
          `SPOR SALONU|` +
          `SALONU|` +
          `ARENA|` +
          `STADYUM|` +
          `STADI|` +
          `SPOR TESISI|` +
          `TESISLERI|` +
          `TESISI|` +
          `SPOR MERKEZI|` +
          `KOMPLEKSI` +
        `)` +
        `(?:[^.!?]{0,55})` +
        `${cityPattern}` +
        `(?:[^A-Z0-9]|$)`,

        "i"

      );


    if (
      venueCityPattern.test(
        normalizedAll
      )
    ) {

      return city;

    }


    /* =====================================================
       6. BAŞLIKTA ŞEHİR + EĞİTİM / KURS

       Ankara 2. Kademe Antrenör Kursu
       İzmir Basketbol Semineri
       ===================================================== */

    const titleEducationAfterCity =
      new RegExp(

        `(?:^|[^A-Z0-9])` +
        `${cityPattern}` +
        `(?:[^.!?]{0,65})` +
        `(?:` +
          `KURS|` +
          `KURSU|` +
          `SEMINER|` +
          `SEMINERI|` +
          `EGITIM|` +
          `EGITIMI|` +
          `KAMP|` +
          `FESTIVAL` +
        `)`,

        "i"

      );


    if (
      titleEducationAfterCity.test(
        normalizedTitle
      )
    ) {

      return city;

    }


    /* =====================================================
       7. BAŞLIKTA EĞİTİM / KURS + ŞEHİR
       ===================================================== */

    const titleEducationBeforeCity =
      new RegExp(

        `(?:` +
          `KURS|` +
          `KURSU|` +
          `SEMINER|` +
          `SEMINERI|` +
          `EGITIM|` +
          `EGITIMI|` +
          `KAMP|` +
          `FESTIVAL` +
        `)` +
        `(?:[^.!?]{0,65})` +
        `${cityPattern}` +
        `(?:[^A-Z0-9]|$)`,

        "i"

      );


    if (
      titleEducationBeforeCity.test(
        normalizedTitle
      )
    ) {

      return city;

    }


    /* =====================================================
       8. AÇIK KONUM / ADRES İFADESİ

       adresi Ankara...
       konumu Ankara...
       oynanacağı yer Ankara...
       düzenleneceği yer Ankara...
       ===================================================== */

    const explicitLocationPattern =
      new RegExp(

        `(?:` +
          `ADRESI|` +
          `ADRES|` +
          `KONUMU|` +
          `YERI|` +
          `OYNANACAGI YER|` +
          `DUZENLENECEGI YER|` +
          `GERCEKLESECEGI YER` +
        `)` +
        `(?:[^.!?]{0,45})` +
        `${cityPattern}` +
        `(?:[^A-Z0-9]|$)`,

        "i"

      );


    if (
      explicitLocationPattern.test(
        normalizedSummary
      )
    ) {

      return city;

    }

  }


  /*
    KRİTİK:

    Konum bilinmiyorsa "Türkiye" döndürmüyoruz.

    Yeni model:

    country = "Türkiye"
    city    = ""

    şeklinde çalışmalıdır.
  */

  return "";

}


/* =========================================================
   ETKİNLİK TARİHİ
   ========================================================= */

function findEventDate(
  text
) {

  const value =
    cleanText(
      text
    );


  const months =
    "Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık";


  /* -------------------------------------------------------
     25 Ekim - 1 Kasım 2026
     ------------------------------------------------------- */

  let match =
    value.match(

      new RegExp(

        `(\\d{1,2})\\s+(${months})\\s*[-–]\\s*` +
        `(\\d{1,2})\\s+(${months})\\s+(20\\d{2})`,

        "i"

      )

    );


  if (
    match
  ) {

    return (
      `${Number(match[1])} ${match[2]}` +
      `–${Number(match[3])} ${match[4]} ${match[5]}`
    );

  }


  /* -------------------------------------------------------
     24 - 31 Ekim 2026
     ------------------------------------------------------- */

  match =
    value.match(

      new RegExp(

        `(\\d{1,2})\\s*[-–]\\s*` +
        `(\\d{1,2})\\s+(${months})\\s+(20\\d{2})`,

        "i"

      )

    );


  if (
    match
  ) {

    return (
      `${Number(match[1])}–${Number(match[2])} ` +
      `${match[3]} ${match[4]}`
    );

  }


  /* -------------------------------------------------------
     TEK TARİH

     Not:
     Content Intent / Lifecycle katmanı bunun gerçekten
     etkinlik tarihi olup olmadığını ayrıca değerlendirecek.
     ------------------------------------------------------- */

  match =
    value.match(

      new RegExp(

        `(\\d{1,2})\\s+(${months})\\s+(20\\d{2})`,

        "i"

      )

    );


  if (
    match
  ) {

    return (
      `${Number(match[1])} ${match[2]} ${match[3]}`
    );

  }


  return "";

}


/* =========================================================
   SON BAŞVURU / KAYIT TARİHİ
   ========================================================= */

function findDeadline(
  text
) {

  const value =
    cleanText(
      text
    );


  const months =
    "Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık";


  /* -------------------------------------------------------
     Son başvuru 20 Ekim 2026
     ------------------------------------------------------- */

  let match =
    value.match(

      new RegExp(

        `(?:son\\s+başvuru|son\\s+basvuru|son\\s+tarih|kayıtlar|kayitlar)` +
        `[^.]{0,50}?` +
        `(\\d{1,2})\\s+(${months})` +
        `(?:\\s+(20\\d{2}))?` +
        `(?:[^.]{0,20}?)(\\d{1,2}:\\d{2})?`,

        "i"

      )

    );


  if (
    match
  ) {

    return buildDeadlineText(
      match
    );

  }


  /* -------------------------------------------------------
     20 Ekim 2026 tarihinde sona erecek
     ------------------------------------------------------- */

  match =
    value.match(

      new RegExp(

        `(\\d{1,2})\\s+(${months})` +
        `(?:\\s+(20\\d{2}))?` +
        `(?:[^.]{0,40}?)(\\d{1,2}:\\d{2})?` +
        `(?:[^.]{0,70}?)` +
        `(?:sona\\s+erecek|sona\\s+erecektir|son\\s+başvuru|son\\s+basvuru)`,

        "i"

      )

    );


  if (
    match
  ) {

    return buildDeadlineText(
      match
    );

  }


  return "";

}


/* =========================================================
   DEADLINE METNİ
   ========================================================= */

function buildDeadlineText(
  match
) {

  let result =
    `${Number(match[1])} ${match[2]}`;


  if (
    match[3]
  ) {

    result +=
      ` ${match[3]}`;

  }


  if (
    match[4]
  ) {

    result +=
      ` ${match[4]}`;

  }


  return result;

}


/* =========================================================
   KADEME
   ========================================================= */

function findGrade(
  value
) {

  const match =
    String(
      value ||
      ""
    )
      .match(
        /(\d+)\.\s*Kademe/i
      );


  return match
    ? match[1]
    : "";

}


/* =========================================================
   TARİH → TIMESTAMP
   ========================================================= */

function parseDateTimestamp(
  value
) {

  const text =
    String(
      value ||
      ""
    );


  /* -------------------------------------------------------
     09.10.2026
     ------------------------------------------------------- */

  let match =
    text.match(
      /(\d{1,2})[.\/-](\d{1,2})[.\/-](20\d{2})/
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
      ) - 1,

      Number(
        match[1]
      )

    );

  }


  /* -------------------------------------------------------
     9 Ekim 2026
     ------------------------------------------------------- */

  match =
    text.match(
      /(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+(20\d{2})/i
    );


  if (
    !match
  ) {

    return 0;

  }


  const months = [

    "OCAK",
    "SUBAT",
    "MART",
    "NISAN",
    "MAYIS",
    "HAZIRAN",
    "TEMMUZ",
    "AGUSTOS",
    "EYLUL",
    "EKIM",
    "KASIM",
    "ARALIK"

  ];


  const month =
    months.indexOf(
      normalize(
        match[2]
      )
    );


  if (
    month < 0
  ) {

    return 0;

  }


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


/* =========================================================
   KALİTE PUANI
   ========================================================= */

function calculateQuality({

  title,
  summary,
  image,
  location,
  eventDate

}) {

  let score =
    40;


  if (
    title &&
    title.length >= 20 &&
    title.length <= 120
  ) {

    score +=
      15;

  }


  if (
    summary &&
    summary.length >= 50 &&
    summary.length <= 360
  ) {

    score +=
      15;

  }


  if (
    image
  ) {

    score +=
      10;

  }


  /*
    Yalnızca gerçekten doğrulanmış şehir varsa
    konum kalite puanı verir.
  */

  if (
    location &&
    location !==
    "Türkiye"
  ) {

    score +=
      10;

  }


  if (
    eventDate
  ) {

    score +=
      10;

  }


  return Math.min(
    score,
    100
  );

}


/* =========================================================
   HABER TEKRARI
   ========================================================= */

function dedupeArticles(
  items
) {

  const output =
    [];


  const ids =
    new Set();


  const urls =
    new Set();


  for (
    const item
    of items
  ) {

    const id =
      String(
        item?.id ||
        ""
      );


    const url =
      String(
        item?.url ||
        ""
      )
        .toLowerCase();


    if (
      id &&
      ids.has(
        id
      )
    ) {

      continue;

    }


    if (
      url &&
      urls.has(
        url
      )
    ) {

      continue;

    }


    if (
      id
    ) {

      ids.add(
        id
      );

    }


    if (
      url
    ) {

      urls.add(
        url
      );

    }


    output.push(
      item
    );

  }


  return output;

}


/* =========================================================
   SIRALAMA
   ========================================================= */

function compareArticles(
  a,
  b
) {

  const scoreDiff =
    safeNumber(
      b?.finalScore
    )
    -
    safeNumber(
      a?.finalScore
    );


  if (
    scoreDiff !== 0
  ) {

    return scoreDiff;

  }


  return (
    safeNumber(
      b?.timestamp
    )
    -
    safeNumber(
      a?.timestamp
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
   ID
   ========================================================= */

function createId(
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
    let index = 0;
    index < text.length;
    index++
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
        index
      );


    hash |=
      0;

  }


  return (
    `tbf-${Math.abs(hash)}`
  );

}


/* =========================================================
   EMOJİ
   ========================================================= */

function getEmoji(
  category
) {

  const map = {

    coach:
      "🧑‍🏫",

    athlete:
      "🏀",

    education:
      "🎓",

    event:
      "🏆",

    announcement:
      "📢"

  };


  return (
    map[
      category
    ]
    ||
    "🏀"
  );

}


/* =========================================================
   KART METNİ
   ========================================================= */

function cleanCardText(
  value
) {

  return removeCtaText(
    cleanText(
      value
    )
  );

}


/* =========================================================
   METİN TEMİZLE
   ========================================================= */

function cleanText(
  value
) {

  return cleanHtml(
    value
  )

    .replace(
      /\s+/g,
      " "
    )

    .trim();

}


/* =========================================================
   AYNI METNİ KALDIR
   ========================================================= */

function removeAll(
  value,
  search
) {

  const text =
    String(
      value ||
      ""
    );


  const target =
    String(
      search ||
      ""
    )
      .trim();


  if (
    !target
  ) {

    return text;

  }


  return text
    .replace(
      new RegExp(
        escapeRegex(
          target
        ),
        "gi"
      ),
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();

}


/* =========================================================
   TARİH Mİ?
   ========================================================= */

function isDateOnly(
  value
) {

  const text =
    cleanText(
      value
    );


  return Boolean(

    /^\d{1,2}[.\/-]\d{1,2}[.\/-]20\d{2}$/.test(
      text
    )

    ||

    /^\d{1,2}\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+20\d{2}$/i.test(
      text
    )

  );

}


/* =========================================================
   IMG ALT GENERIC Mİ?
   ========================================================= */

function isGenericImageAlt(
  value
) {

  const text =
    normalize(
      value
    );


  return containsAny(
    text,
    [

      "TBF",
      "LOGO",
      "BASKETBOL",
      "TURKIYE BASKETBOL FEDERASYONU",
      "IMAGE",
      "GORSEL"

    ]
  );

}


/* =========================================================
   TEKİL METİNLER
   ========================================================= */

function uniqueTexts(
  values
) {

  const output =
    [];


  const used =
    new Set();


  for (
    const value
    of values
  ) {

    const text =
      cleanText(
        value
      );


    if (
      !text
    ) {

      continue;

    }


    const key =
      normalize(
        text
      );


    if (
      used.has(
        key
      )
    ) {

      continue;

    }


    used.add(
      key
    );


    output.push(
      text
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

  if (
    !text ||
    !Array.isArray(
      values
    )
  ) {

    return false;

  }


  return values.some(
    value =>
      text.includes(
        value
      )
  );

}


/* =========================================================
   KISALT
   ========================================================= */

function shorten(
  value,
  max
) {

  const text =
    cleanText(
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
   REGEX ESCAPE
   ========================================================= */

function escapeRegex(
  value
) {

  return String(
    value ||
    ""
  )
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

}


/* =========================================================
   2 HANE
   ========================================================= */

function pad2(
  value
) {

  return String(
    Number(
      value
    )
  )
    .padStart(
      2,
      "0"
    );

}


/* =========================================================
   SAYI
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
