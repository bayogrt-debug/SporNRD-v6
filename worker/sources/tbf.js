/* =========================================================
   SporNRD
   worker/sources/tbf.js

   Türkiye Basketbol Federasyonu
   Liste tabanlı güvenli kaynak okuyucu

   v6.0.3
   ========================================================= */

const BASE =
  "https://www.tbf.org.tr";

const NEWS =
  BASE + "/haberler";


const SOURCE = {

  id: "tbf",

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


/* =========================================================
   ANA AKIŞ
   ========================================================= */

export async function getTbfFeed({
  limit = 20,
  env = null
} = {}) {

  void env;


  const html =
    await getHtml(
      NEWS
    );


  const items =
    extractNews(
      html
    );


  const filtered =
    items
      .map(
        createArticle
      )
      .filter(Boolean);


  filtered.sort(
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


  const safeLimit =
    Math.max(
      1,
      Math.min(
        Number(limit) || 20,
        30
      )
    );


  return {

    source:
      SOURCE,

    items:
      filtered.slice(
        0,
        safeLimit
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
            "tr-TR,tr;q=0.9",

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
      "TBF HTTP " +
      response.status
    );

  }


  return response.text();

}


/* =========================================================
   HABERLERİ LİSTE SAYFASINDAN ÇIKAR

   Detay sayfasına gitmiyoruz.
   Böylece TBF'nin 403 korumasına takılmıyoruz.
   ========================================================= */

function extractNews(
  html
) {

  const output =
    [];


  const usedUrls =
    new Set();


  const regex =
    /<a\b[^>]*href=["']([^"']*\/haber\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;


  let match;


  while (
    (
      match =
        regex.exec(
          html
        )
    ) !== null
  ) {

    const href =
      decodeEntities(
        match[1]
      );


    const block =
      match[2];


    let url;


    try {

      url =
        new URL(
          href,
          BASE
        ).href;

    }

    catch {

      continue;

    }


    if (
      usedUrls.has(
        url
      )
    ) {

      continue;

    }


    const text =
      cleanText(
        block
      );


    if (
      !text ||
      text.length < 20
    ) {

      continue;

    }


    const parsed =
      parseCardText(
        text
      );


    if (
      !parsed.title
    ) {

      continue;

    }


    const image =
      extractImageFromBlock(
        block
      );


    usedUrls.add(
      url
    );


    output.push({

      url:
        url,

      title:
        parsed.title,

      summary:
        parsed.summary,

      date:
        parsed.date,

      image:
        image

    });

  }


  return output;

}


/* =========================================================
   KART METNİNİ AYIR

   Örnek yapı:
   07.10.2026
   2. Kademe Antrenör Kursu...
   07.10.2026
   2. Kademe Antrenör Kursu...
   Devamını Gör
   ========================================================= */

function parseCardText(
  input
) {

  let text =
    cleanText(
      input
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


  const dateRegex =
    /\b(\d{1,2})[.](\d{1,2})[.](20\d{2})\b/g;


  const dates =
    [
      ...text.matchAll(
        dateRegex
      )
    ];


  if (
    !dates.length
  ) {

    return {

      date:
        "",

      title:
        text,

      summary:
        ""

    };

  }


  const first =
    dates[0];


  const dateText =
    first[0];


  let title =
    "";


  let summary =
    "";


  if (
    dates.length >= 2
  ) {

    const second =
      dates[1];


    title =
      text
        .slice(
          first.index +
          first[0].length,
          second.index
        )
        .trim();


    summary =
      text
        .slice(
          second.index +
          second[0].length
        )
        .trim();

  }

  else {

    const remainder =
      text
        .slice(
          first.index +
          first[0].length
        )
        .trim();


    const sentence =
      remainder.match(
        /^(.{20,160}?)(?=\s{2,}|[.!?]\s|$)/
      );


    if (
      sentence
    ) {

      title =
        sentence[1]
          .trim();


      summary =
        remainder
          .slice(
            sentence[1].length
          )
          .trim();

    }

    else {

      title =
        remainder;

    }

  }


  return {

    date:
      dateText,

    title:
      title,

    summary:
      summary

  };

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


  const location =
    findLocation(
      raw.title +
      " " +
      raw.summary
    );


  const eventDate =
    findEventDate(
      raw.title +
      " " +
      raw.summary
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
        eventDate

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


  return {

    id:
      createId(
        raw.url
      ),

    externalId:
      createId(
        raw.url
      ),


    title:
      editorial.title,

    summary:
      editorial.summary,


    originalTitle:
      raw.title,

    originalText:
      raw.summary,


    editorial:
      true,

    editorialLabel:
      "SporNRD Özeti",

    editorialVersion:
      "6.0.3-TBF",


    sourceId:
      "tbf",

    source:
      SOURCE.name,

    sourceShortName:
      "TBF",

    sourceType:
      "FEDERASYON",

    verified:
      true,

    sport:
      "Basketbol",


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


    topic:
      editorial.topic,

    urgency:
      analysis.actionRequired
        ? "important"
        : "normal",

    actionRequired:
      analysis.actionRequired,

    actionLabel:
      editorial.actionLabel,

    tags:
      editorial.tags,


    facts: {

      sport:
        "Basketbol",

      organization:
        SOURCE.name,

      location:
        location,

      eventDate:
        eventDate

    },


    date:
      raw.date,

    timestamp:
      timestamp,

    location:
      location,


    image:
      raw.image,

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
      title +
      " " +
      summary
    );


  /* Gereksiz içerikler */

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


  /* Antrenör */

  if (
    containsAny(
      titleText,
      [

        "ANTRENOR",

        "ANTRENORLUK"

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
            "KAYIT"
          ]
        )

    };

  }


  /* Sporcu / milli takım */

  if (
    containsAny(
      titleText,
      [

        "MILLI TAKIM",

        "SPORCU",

        "OYUNCU",

        "ADAY KADRO",

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


  /* Eğitim */

  if (
    containsAny(
      titleText,
      [

        "EGITIM",

        "SEMINER",

        "SERTIFIKA",

        "KURS"

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


  /* Organizasyon */

  if (
    containsAny(
      titleText,
      [

        "LIG",

        "KUPA",

        "SAMPIYON",

        "FINAL",

        "MAC",

        "MUSABAKA",

        "FIBA",

        "EUROCUP",

        "EUROLEAGUE"

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


  /* Başvuru / önemli duyuru */

  if (
    containsAny(
      allText,
      [

        "BASVURU",

        "KAYIT",

        "DUYURU",

        "FAALIYET PROGRAMI"

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
    Genel basketbol haberlerini de artık
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
  eventDate

}) {

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


  const tags =
    [
      "Basketbol"
    ];


  if (
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
      newTitle,

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

    /<img\b[^>]*src=["']([^"']+)["'][^>]*>/i,

    /<img\b[^>]*(?:data-src|data-original)=["']([^"']+)["'][^>]*>/i

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

      return new URL(
        decodeEntities(
          match[1]
        ),
        BASE
      ).href;

    }

    catch {

      /* devam */

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

  const cities = [

    "Adana",
    "Ankara",
    "Antalya",
    "Aydın",
    "Balıkesir",
    "Bursa",
    "Denizli",
    "Diyarbakır",
    "Erzurum",
    "Eskişehir",
    "Gaziantep",
    "İstanbul",
    "İzmir",
    "Kayseri",
    "Kocaeli",
    "Konya",
    "Manisa",
    "Mersin",
    "Muğla",
    "Sakarya",
    "Samsun",
    "Trabzon",
    "Şanlıurfa"

  ];


  const normalized =
    normalize(
      text
    );


  for (
    const city
    of cities
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

  const months =
    "Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık";


  const value =
    cleanText(
      text
    );


  let match =
    value.match(

      new RegExp(

        "(\\d{1,2})\\s+(" +
        months +
        ")\\s*[-–]\\s*(\\d{1,2})\\s+(" +
        months +
        ")\\s+(20\\d{2})",

        "i"

      )

    );


  if (
    match
  ) {

    return (
      match[1] +
      " " +
      match[2] +
      "–" +
      match[3] +
      " " +
      match[4] +
      " " +
      match[5]
    );

  }


  return "";

}


/* =========================================================
   TARİH → TIMESTAMP
   ========================================================= */

function parseDateTimestamp(
  value
) {

  const match =
    String(
      value || ""
    ).match(
      /(\d{1,2})[.](\d{1,2})[.](20\d{2})/
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
   KALİTE
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
    title.length >= 20
  ) {

    score += 15;

  }


  if (
    summary.length >= 50
  ) {

    score += 15;

  }


  if (
    image
  ) {

    score += 10;

  }


  if (
    location !==
    "Türkiye"
  ) {

    score += 10;

  }


  if (
    eventDate
  ) {

    score += 10;

  }


  return Math.min(
    score,
    100
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
    "tbf-" +
    Math.abs(
      hash
    )
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
   HTML ENTITY
   ========================================================= */

function decodeEntities(
  value
) {

  const map = {

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

    rsquo:
      "’",

    ndash:
      "–",

    mdash:
      "—"

  };


  return String(
    value || ""
  ).replace(

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

        const hex =
          entity
            .charAt(1)
            .toLowerCase() ===
          "x";


        const raw =
          hex
            ? entity.slice(2)
            : entity.slice(1);


        const number =
          parseInt(
            raw,
            hex
              ? 16
              : 10
          );


        if (
          Number.isFinite(
            number
          )
        ) {

          try {

            return String.fromCodePoint(
              number
            );

          }

          catch {

            return original;

          }

        }

      }


      return Object.prototype
        .hasOwnProperty
        .call(
          map,
          entity
        )

        ? map[
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
      value || ""
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
    value || ""
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
