/* =========================================================
   SporNRD
   worker/sources/tbf.js

   Türkiye Basketbol Federasyonu
   Liste tabanlı güvenli kaynak okuyucu

   v6.0.4
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
  40;


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
    Global learning daha sonra burada kullanılabilir.
    Şimdilik TBF kaynağının çalışmasını etkilemez.
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
      )

      .sort(
        compareArticles
      );


  return {

    source:
      {
        ...SOURCE
      },

    items:
      items.slice(
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
      `TBF HTTP ${response.status}: ${url}`
    );

  }


  return response.text();

}


/* =========================================================
   HABERLERİ LİSTE SAYFASINDAN ÇIKAR

   TBF detay sayfasına bağımlı değil.
   Haber kartlarını /haberler sayfasından okur.
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

    let url;


    try {

      url =
        new URL(
          decodeEntities(
            match[2]
          ),
          BASE
        )
          .href
          .split(
            "#"
          )[0];

    }

    catch {

      continue;

    }


    if (
      !isTbfUrl(
        url
      ) ||
      usedUrls.has(
        url
      )
    ) {

      continue;

    }


    const anchorBlock =
      match[4] ||
      "";


    const anchorText =
      cleanText(
        anchorBlock
      )
        .replace(
          /Devamını\s+Gör/gi,
          " "
        )
        .replace(
          /\s+/g,
          " "
        )
        .trim();


    if (
      !anchorText ||
      anchorText.length < 6
    ) {

      continue;

    }


    /*
      Anchor'ın yakın çevresini de okuyarak
      tarih, görsel ve kısa açıklamayı yakalar.
    */

    const start =
      Math.max(
        0,
        match.index -
        700
      );


    const end =
      Math.min(
        html.length,
        anchorRegex.lastIndex +
        1200
      );


    const context =
      html.slice(
        start,
        end
      );


    const contextText =
      cleanText(
        context
      );


    const title =
      extractCardTitle(
        anchorText,
        contextText
      );


    if (
      !title ||
      title.length < 6
    ) {

      continue;

    }


    const date =
      extractCardDate(
        contextText
      );


    const summary =
      extractCardSummary(
        contextText,
        title,
        date
      );


    const image =
      extractImageFromBlock(
        context
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


    return (
      url.hostname ===
      "www.tbf.org.tr" ||
      url.hostname ===
      "tbf.org.tr"
    );

  }

  catch {

    return false;

  }

}


/* =========================================================
   KART BAŞLIĞI
   ========================================================= */

function extractCardTitle(
  anchorText,
  contextText
) {

  let title =
    anchorText

      .replace(
        /^\d{1,2}[.\/-]\d{1,2}[.\/-]20\d{2}\s*/i,
        ""
      )

      .replace(
        /Devamını\s+Gör/gi,
        " "
      )

      .replace(
        /\s+/g,
        " "
      )

      .trim();


  if (
    title.length >= 6 &&
    title.length <= 180
  ) {

    return title;

  }


  const contextWithoutDate =
    contextText

      .replace(
        /\b\d{1,2}[.\/-]\d{1,2}[.\/-]20\d{2}\b/g,
        " "
      )

      .replace(
        /Devamını\s+Gör/gi,
        " "
      )

      .replace(
        /\s+/g,
        " "
      )

      .trim();


  if (
    contextWithoutDate.length <= 180
  ) {

    return contextWithoutDate;

  }


  return shorten(
    contextWithoutDate,
    180
  );

}


/* =========================================================
   KART TARİHİ
   ========================================================= */

function extractCardDate(
  text
) {

  const match =
    String(
      text ||
      ""
    )
      .match(
        /\b(\d{1,2})[.\/-](\d{1,2})[.\/-](20\d{2})\b/
      );


  if (
    !match
  ) {

    return "";

  }


  return (
    `${pad2(match[1])}.` +
    `${pad2(match[2])}.` +
    `${match[3]}`
  );

}


/* =========================================================
   KART AÇIKLAMASI
   ========================================================= */

function extractCardSummary(
  contextText,
  title,
  date
) {

  let text =
    cleanText(
      contextText
    )

      .replace(
        /Devamını\s+Gör/gi,
        " "
      )

      .replace(
        /\s+/g,
        " "
      )

      .trim();


  if (
    date
  ) {

    text =
      text.replace(
        new RegExp(
          escapeRegex(
            date
          ),
          "g"
        ),
        " "
      );

  }


  if (
    title
  ) {

    text =
      text.replace(
        new RegExp(
          escapeRegex(
            title
          ),
          "gi"
        ),
        " "
      );

  }


  text =
    text
      .replace(
        /\s+/g,
        " "
      )
      .trim();


  if (
    !text ||
    text.length < 25
  ) {

    return "";

  }


  return shorten(
    text,
    420
  );

}


/* =========================================================
   HABER MODELİ
   ========================================================= */

function createArticle(
  raw
) {

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
    `${raw.title} ${raw.summary}`;


  const location =
    findLocation(
      combined
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

    id:
      id,

    externalId:
      id,


    /* -----------------------------------------------------
       SporNRD içeriği
       ----------------------------------------------------- */

    title:
      editorial.title,

    summary:
      editorial.summary,


    /* -----------------------------------------------------
       Orijinal kaynak
       ----------------------------------------------------- */

    originalTitle:
      raw.title,

    originalText:
      raw.summary,


    /* -----------------------------------------------------
       SporNRD Editör
       ----------------------------------------------------- */

    editorial:
      true,

    editorialLabel:
      "SporNRD Özeti",

    editorialVersion:
      "6.0.4-TBF",


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
       Analiz
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
       Haber DNA
       ----------------------------------------------------- */

    topic:
      editorial.topic,

    urgency:
      (
        analysis.actionRequired ||
        deadline
      )
        ? "important"
        : "normal",

    actionRequired:
      analysis.actionRequired,

    actionLabel:
      editorial.actionLabel,

    tags:
      editorial.tags,


    /* -----------------------------------------------------
       Gerçekler
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
       Tarih / konum
       ----------------------------------------------------- */

    date:
      raw.date,

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
      `${title} ${summary}`
    );


  /* -------------------------------------------------------
     Akıştan çıkarılacak içerikler
     ------------------------------------------------------- */

  if (
    containsAny(
      titleText,
      [

        "VEFAT",

        "BASSAGLIGI",

        "DISIPLIN KURULU",

        "ZIYARET",

        "BASKAN MESAJI"

      ]
    )
  ) {

    return {

      keep:
        false,

      category:
        "announcement",

      audience:
        "general",

      score:
        0,

      actionRequired:
        false

    };

  }


  /* -------------------------------------------------------
     Antrenör
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

    return {

      keep:
        true,

      category:
        "coach",

      audience:
        "antrenör",

      score:
        10,

      actionRequired:
        containsAny(
          allText,
          [

            "BASVURU",

            "KAYIT",

            "SON BASVURU"

          ]
        )

    };

  }


  /* -------------------------------------------------------
     Sporcu / Milli takım
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

    return {

      keep:
        true,

      category:
        "athlete",

      audience:
        "sporcu",

      score:
        9,

      actionRequired:
        false

    };

  }


  /* -------------------------------------------------------
     Eğitim
     ------------------------------------------------------- */

  if (
    containsAny(
      titleText,
      [

        "EGITIM",

        "SEMINER",

        "SERTIFIKA",

        "AKADEMI"

      ]
    )
  ) {

    return {

      keep:
        true,

      category:
        "education",

      audience:
        "general",

      score:
        8,

      actionRequired:
        containsAny(
          allText,
          [

            "BASVURU",

            "KAYIT"

          ]
        )

    };

  }


  /* -------------------------------------------------------
     Lig / kupa / maç / organizasyon
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

        "SEZON"

      ]
    )
  ) {

    return {

      keep:
        true,

      category:
        "event",

      audience:
        "general",

      score:
        7,

      actionRequired:
        false

    };

  }


  /* -------------------------------------------------------
     Önemli duyuru
     ------------------------------------------------------- */

  if (
    containsAny(
      allText,
      [

        "BASVURU",

        "KAYIT",

        "DUYURU",

        "FAALIYET PROGRAMI",

        "PROGRAMI ACIKLANDI"

      ]
    )
  ) {

    return {

      keep:
        true,

      category:
        "announcement",

      audience:
        "general",

      score:
        5,

      actionRequired:
        true

    };

  }


  /*
    Diğer gerçek basketbol haberlerini
    tamamen çöpe atmıyoruz.
  */

  return {

    keep:
      true,

    category:
      "event",

    audience:
      "general",

    score:
      4,

    actionRequired:
      false

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


  /* -------------------------------------------------------
     Antrenör kursu
     ------------------------------------------------------- */

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
      `TBF, ${level} Basketbol Antrenör Kursu’nun ayrıntılarını açıkladı.`;


    if (
      eventDate &&
      location !==
      "Türkiye"
    ) {

      newSummary =
        `TBF, ${level} Basketbol Antrenör Kursu’nu ${eventDate} tarihlerinde ${location}’da düzenleyecek.`;

    }


    if (
      deadline
    ) {

      newSummary +=
        ` Kayıtlar ${deadline} tarihinde sona erecek.`;

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
    "event"
  ) {

    tags.push(
      "Yarışma"
    );

  }


  else {

    tags.push(
      "Duyuru"
    );

  }


  if (
    location !==
    "Türkiye"
  ) {

    tags.push(
      location
    );

  }


  /* -------------------------------------------------------
     Açıklama yoksa güvenli yedek
     ------------------------------------------------------- */

  if (
    !newSummary ||
    newSummary.length < 25
  ) {

    newSummary =
      "Türkiye Basketbol Federasyonu bu konuyla ilgili yeni bir resmî içerik yayımladı. Ayrıntılar federasyonun resmî kaynağında yer alıyor.";

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
      topic,

    actionLabel:
      actionLabel,

    tags:
      [
        ...new Set(
          tags
        )
      ]

  };

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
      html.match(
        pattern
      );


    if (
      !match
    ) {

      continue;

    }


    try {

      const url =
        new URL(
          decodeEntities(
            match[1]
          ),
          BASE
        ).href;


      if (
        !/^data:/i.test(
          url
        )
      ) {

        return url;

      }

    }

    catch {

      /* diğer kalıba geç */

    }

  }


  return "";

}


/* =========================================================
   KONUM
   ========================================================= */

function findLocation(
  text
) {

  const normalized =
    normalize(
      text
    );


  for (
    const city
    of CITIES
  ) {

    if (
      normalized.includes(
        normalize(
          city
        )
      )
    ) {

      return city;

    }

  }


  return "Türkiye";

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

        `(\\d{1,2})\\s+(${months})\\s*[-–]\\s*(\\d{1,2})\\s+(${months})\\s+(20\\d{2})`,

        "i"

      )

    );


  if (
    match
  ) {

    return (
      `${match[1]} ${match[2]}` +
      `–${match[3]} ${match[4]} ${match[5]}`
    );

  }


  /* -------------------------------------------------------
     24 - 31 Ekim 2026
     ------------------------------------------------------- */

  match =
    value.match(

      new RegExp(

        `(\\d{1,2})\\s*[-–]\\s*(\\d{1,2})\\s+(${months})\\s+(20\\d{2})`,

        "i"

      )

    );


  if (
    match
  ) {

    return (
      `${match[1]}–${match[2]} ` +
      `${match[3]} ${match[4]}`
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


  const match =
    value.match(

      new RegExp(

        `(\\d{1,2})\\s+(${months})` +
        `(?:\\s+(20\\d{2}))?` +
        `(?:[^.]{0,40}?)(\\d{1,2}:\\d{2})?` +
        `(?:[^.]{0,70}?)` +
        `(?:sona\\s+erecek|sona\\s+erecektir|son\\s+basvuru|son\\s+başvuru)`,

        "i"

      )

    );


  if (
    !match
  ) {

    return "";

  }


  let result =
    `${match[1]} ${match[2]}`;


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

  const match =
    String(
      value ||
      ""
    )
      .match(
        /(\d{1,2})[.\/-](\d{1,2})[.\/-](20\d{2})/
      );


  if (
    !match
  ) {

    return 0;

  }


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
   SIRALAMA
   ========================================================= */

function compareArticles(
  a,
  b
) {

  const scoreDiff =
    Number(
      b?.finalScore ||
      0
    )
    -
    Number(
      a?.finalScore ||
      0
    );


  if (
    scoreDiff !== 0
  ) {

    return scoreDiff;

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
   HTML ENTITY
   ========================================================= */

function decodeEntities(
  value
) {

  const named = {

    amp:
      "&",

    quot:
      "\"",

    apos:
      "'",

    nbsp:
      " ",

    lt:
      "<",

    gt:
      ">",

    uuml:
      "ü",

    Uuml:
      "Ü",

    ouml:
      "ö",

    Ouml:
      "Ö",

    ccedil:
      "ç",

    Ccedil:
      "Ç",

    scedil:
      "ş",

    Scedil:
      "Ş",

    gbreve:
      "ğ",

    Gbreve:
      "Ğ",

    rsquo:
      "’",

    lsquo:
      "‘",

    ldquo:
      "“",

    rdquo:
      "”",

    ndash:
      "–",

    mdash:
      "—",

    hellip:
      "…"

  };


  return String(
    value ||
    ""
  )

    .replace(

      /&(#x?[0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]+);/g,

      function (
        original,
        entity
      ) {

        if (
          entity.startsWith(
            "#"
          )
        ) {

          const isHex =
            entity
              .charAt(1)
              .toLowerCase() ===
            "x";


          const raw =
            isHex
              ? entity.slice(2)
              : entity.slice(1);


          const number =
            parseInt(
              raw,
              isHex
                ? 16
                : 10
            );


          if (
            Number.isFinite(
              number
            )
          ) {

            try {

              return String
                .fromCodePoint(
                  number
                );

            }

            catch {

              return original;

            }

          }


          return original;

        }


        return Object
          .prototype
          .hasOwnProperty
          .call(
            named,
            entity
          )

          ? named[
              entity
            ]

          : original;

      }

    );

}


/* =========================================================
   METİN TEMİZLE
   ========================================================= */

function cleanText(
  value
) {

  return decodeEntities(
    String(
      value ||
      ""
    )
  )

    .replace(
      /<script[\s\S]*?<\/script>/gi,
      " "
    )

    .replace(
      /<style[\s\S]*?<\/style>/gi,
      " "
    )

    .replace(
      /<[^>]+>/g,
      " "
    )

    .replace(
      /[\u00A0\u2007\u202F]/g,
      " "
    )

    .replace(
      /\s+/g,
      " "
    )

    .trim();

}


/* =========================================================
   NORMALİZE
   ========================================================= */

function normalize(
  value
) {

  return String(
    value ||
    ""
  )

    .toLocaleUpperCase(
      "tr-TR"
    )

    .replaceAll(
      "Ç",
      "C"
    )

    .replaceAll(
      "Ğ",
      "G"
    )

    .replaceAll(
      "İ",
      "I"
    )

    .replaceAll(
      "Ö",
      "O"
    )

    .replaceAll(
      "Ş",
      "S"
    )

    .replaceAll(
      "Ü",
      "U"
    );

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
    text.length <= max
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
    value
  )
    .padStart(
      2,
      "0"
    );

       }
