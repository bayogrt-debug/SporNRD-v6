/* =========================================================
   SporNRD
   worker/sources/tbf.js

   Türkiye Basketbol Federasyonu
   Liste tabanlı güvenli kaynak okuyucu

   SporNRD v6.1.4
   Candidate Source Architecture

   AMAÇ
   ---------------------------------------------------------
   Bu dosyanın görevi TBF içeriklerini SEÇMEK değildir.

   Kaynak motoru yalnızca:
   - haberi bulur
   - başlık / özet / tarih / görseli okur
   - güvenli yardımcı gerçekleri çıkarır
   - legacy sınıflandırma ipuçlarını üretir
   - bütün okunabilir adayları merkezi pipeline'a yollar

   Nihai karar:
   ---------------------------------------------------------
   selected
   borderline
   rejected

   worker/intelligence/selectionEngine.js tarafından verilir.

   Bu nedenle kaynak katmanında:
   - analysis.keep filtresi YOKTUR
   - relevanceScore alt sınırı YOKTUR
   - kurumsal / düşük değerli içerik erken silinmez

   Böylece Selection Engine aynı ölçütlerle:
   news / course / event / campaign / jobs / stores
   içeriklerini merkezi olarak değerlendirebilir.
   ========================================================= */


import {
  cleanHtml,
  decodeEntities,
  normalize
} from "../utils/html.js";


/* =========================================================
   VERSION
   ========================================================= */

export const TBF_SOURCE_VERSION =
  "6.1.4";


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
    TBF kaynak motoru artık içerik seçimi yapmaz.

    env ileride kaynak seviyesinde cache / learning gibi
    amaçlarla kullanılabilir. Şimdilik okuma davranışını
    değiştirmez.
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


  /* -------------------------------------------------------
     KRİTİK:

     createArticle() okunabilir her haberi aday posta çevirir.

     Burada:
     - keep
     - minimum relevance
     - kategori bazlı eleme

     yapılmaz.
     ------------------------------------------------------- */

  const items =
    rawItems

      .map(
        createArticle
      )

      .filter(
        Boolean
      );


  /* -------------------------------------------------------
     Aynı URL / id tekrarlarını temizle.

     Bu içerik seçimi değildir; teknik dedupe işlemidir.
     ------------------------------------------------------- */

  const uniqueItems =
    dedupeArticles(
      items
    );


  /* -------------------------------------------------------
     Kaynak çıktısı deterministik olsun.

     Nihai kullanıcı akış sıralaması burada yapılmaz.
     Selection + Ranking Engine daha sonra karar verir.
     ------------------------------------------------------- */

  uniqueItems.sort(
    compareArticles
  );


  return {

    source: {
      ...SOURCE
    },

    sourceVersion:
      TBF_SOURCE_VERSION,

    candidateCount:
      uniqueItems.length,

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
            "Mozilla/5.0 (compatible; SporNRD/6.1.4)"

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


    const date =
      extractCardDate(
        cardText
      );


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


    const summary =
      extractCardSummary(
        cardHtml,
        cardText,
        title,
        date
      );


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


  return text

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


  return !invalid.some(
    item =>
      normalized ===
      item
  );

}


/* =========================================================
   KART TARİHİ

   Bu tarih HABERİN YAYIN TARİHİDİR.
   Event startDate değildir.
   ========================================================= */

function extractCardDate(
  text
) {

  const value =
    String(
      text ||
      ""
    );


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
   ========================================================= */

function extractCardSummary(
  cardHtml,
  cardText,
  title,
  date
) {

  const candidates =
    [];


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


  return !isDateOnly(
    text
  );

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

   KRİTİK:
   ---------------------------------------------------------
   Bu fonksiyon artık classifier'ın keep kararına göre
   içerik ELEMEZ.

   Classifier yalnızca legacy metadata üretir.

   Nihai seçim Selection Engine'indir.
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


  const combined =
    `${raw.title} ${raw.summary || ""}`;


  const location =
    findLocation(
      raw.title,
      raw.summary
    );


  const deadline =
    findDeadline(
      combined
    );


  /*
    Deadline önce bulunur.

    Böylece mümkün olduğunca son başvuru tarihi ile
    etkinlik tarihini ayırmaya çalışırız.
  */

  const eventDate =
    findEventDate(
      combined,
      deadline
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

    id:
      id,

    externalId:
      id,


    /* -----------------------------------------------------
       Kullanıcının gördüğü legacy SporNRD alanları
       ----------------------------------------------------- */

    title:
      editorial.title,

    summary:
      editorial.summary,


    /* -----------------------------------------------------
       Kaynağın gerçek metni
       ----------------------------------------------------- */

    originalTitle:
      raw.title,

    originalText:
      raw.summary ||
      "",


    /* -----------------------------------------------------
       SporNRD Editörü
       ----------------------------------------------------- */

    editorial:
      true,

    editorialLabel:
      "SporNRD Özeti",

    editorialVersion:
      "6.1.4-TBF-candidate-source",


    /* -----------------------------------------------------
       Kaynak
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
       Legacy sınıflandırma ipucu

       Bunlar nihai kategori / seçim kararı değildir.
       Discovery + Selection daha sonra yeniden değerlendirir.
       ----------------------------------------------------- */

    category:
      analysis.category,

    audience:
      analysis.audience,

    relevanceScore:
      analysis.score,

    qualityScore:
      qualityScore,

    /*
      Eski normalizer uyumluluğu için tutulur.
      Nihai kullanıcı sıralaması Ranking Engine'indir.
    */

    finalScore:
      qualityScore,


    /* -----------------------------------------------------
       Haber DNA
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
       Yapılandırılmış gerçekler
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

      city:
        location,

      country:
        "Türkiye",

      eventDate:
        eventDate,

      dateRange:
        eventDate,

      deadline:
        deadline,

      deadlineText:
        deadline,

      registrationDeadline:
        deadline,

      applicationDeadline:
        deadline,

      grade:
        grade,

      actionRequired:
        Boolean(
          analysis.actionRequired ||
          deadline
        ),

      sourceClassification:
        analysis.category,

      sourcePriorityHint:
        analysis.priorityHint

    },


    /* -----------------------------------------------------
       Yayın tarihi / konum

       raw.date olay tarihi değildir.
       ----------------------------------------------------- */

    date:
      raw.date ||
      "",

    timestamp:
      timestamp,

    location:
      location,


    /* -----------------------------------------------------
       Medya
       ----------------------------------------------------- */

    image:
      raw.image ||
      "",

    url:
      raw.url,

    pdfUrl:
      "",


    /* -----------------------------------------------------
       Görsel kategori
       ----------------------------------------------------- */

    emoji:
      getEmoji(
        analysis.category
      )

  };

}


/* =========================================================
   YARDIMCI SINIFLANDIRMA

   ÖNEMLİ:
   ---------------------------------------------------------
   Bu sınıflandırıcı artık "keep / reject" kararı vermez.

   Yalnızca kaynak seviyesinde başlangıç metadata'sı üretir.
   Nihai anlam Content Intent + Discovery,
   nihai seçim Selection Engine tarafından yapılır.
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
     DÜŞÜK ÖNCELİKLİ KURUMSAL İÇERİK

     Eskiden burada keep=false ile atılıyordu.
     Artık ADAY olarak kalır.
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
      "announcement",
      "general",
      1,
      false,
      "low"
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
      ),

      "high"

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
      "athlete",
      "sporcu",
      9,
      false,
      "high"
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

      "education",

      "general",

      8,

      containsAny(
        allText,
        [
          "BASVURU",
          "KAYIT"
        ]
      ),

      "high"

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
      "event",
      "general",
      7,
      false,
      "normal"
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
      "announcement",
      "general",
      5,
      true,
      "normal"
    );

  }


  /* -------------------------------------------------------
     GENEL BASKETBOL HABERİ
     ------------------------------------------------------- */

  return classificationResult(
    "event",
    "general",
    4,
    false,
    "normal"
  );

}


/* =========================================================
   SINIFLANDIRMA SONUCU
   ========================================================= */

function classificationResult(
  category,
  audience,
  score,
  actionRequired,
  priorityHint = "normal"
) {

  return {

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
      ),

    priorityHint:
      priorityHint

  };

}


/* =========================================================
   SPORNRD EDİTÖR

   Bu legacy editör yalnız kaynak çıktısının okunabilir
   kalmasını sağlar.

   Feed Preview içinde Persona Engine daha sonra
   yeniden editorial üretir.
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


  const tags = [
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
      location
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
      location
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
      location
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


  else if (
    category ===
    "announcement"
  ) {

    actionLabel =
      "Duyuruyu İncele";


    tags.push(
      "Duyuru"
    );

  }


  if (
    location
  ) {

    tags.push(
      location
    );

  }


  if (
    grade
  ) {

    tags.push(
      `${grade}. Kademe`
    );

  }


  if (
    !newSummary ||
    newSummary.length < 25
  ) {

    newSummary =
      fallbackSummary(
        category
      );

  }


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


  return "";

}


/* =========================================================
   ETKİNLİK TARİHİ

   Deadline tarihi mümkün olduğunca eventDate olarak
   kullanılmaz.
   ========================================================= */

function findEventDate(
  text,
  deadline = ""
) {

  let value =
    cleanText(
      text
    );


  /*
    Deadline bulunduysa aynı literal tarih ifadesini
    eventDate aramasında çıkarmaya çalışırız.

    Bu tam semantik çözüm değildir; nihai zaman kararı
    Temporal Engine tarafından verilir.
  */

  if (
    deadline
  ) {

    value =
      removeAll(
        value,
        deadline
      );

  }


  const months =
    "Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık";


  let match =
    value.match(

      new RegExp(

        `(\\d{1,2})\\s+(${months})\\s*[-–—]\\s*` +
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


  match =
    value.match(

      new RegExp(

        `(\\d{1,2})\\s*[-–—]\\s*` +
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


  let match =
    value.match(

      new RegExp(

        `(?:son\\s+başvuru|son\\s+basvuru|son\\s+tarih|son\\s+kayıt|son\\s+kayit)` +
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


  match =
    value.match(

      new RegExp(

        `(\\d{1,2})\\s+(${months})` +
        `(?:\\s+(20\\d{2}))?` +
        `(?:[^.]{0,40}?)(\\d{1,2}:\\d{2})?` +
        `(?:[^.]{0,70}?)` +
        `(?:sona\\s+erecek|sona\\s+erecektir|sona\\s+eriyor|son\\s+başvuru|son\\s+basvuru|son\\s+kayıt|son\\s+kayit)`,

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
   YAYIN TARİHİ → TIMESTAMP
   ========================================================= */

function parseDateTimestamp(
  value
) {

  const text =
    String(
      value ||
      ""
    );


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

   Bu puan içerik seçimi değildir.
   Kaynak verisinin ne kadar dolu olduğunu anlatır.
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


  if (
    location
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
   KAYNAK İÇİ STABİL SIRALAMA

   Nihai feed ranking değildir.

   1. yayın tarihi
   2. veri kalitesi
   3. legacy relevance ipucu
   ========================================================= */

function compareArticles(
  a,
  b
) {

  const dateDiff =
    safeNumber(
      b?.timestamp
    )
    -
    safeNumber(
      a?.timestamp
    );


  if (
    dateDiff !== 0
  ) {

    return dateDiff;

  }


  const qualityDiff =
    safeNumber(
      b?.qualityScore
    )
    -
    safeNumber(
      a?.qualityScore
    );


  if (
    qualityDiff !== 0
  ) {

    return qualityDiff;

  }


  return (
    safeNumber(
      b?.relevanceScore
    )
    -
    safeNumber(
      a?.relevanceScore
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
    ] ||
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
