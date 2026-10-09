/* =========================================================
   SporNRD
   worker/sources/tbf.js

   Türkiye Basketbol Federasyonu
   Gerçek Haber Kaynak Motoru

   SporNRD v6 Multi Source
   ========================================================= */


const BASE_URL =
  "https://www.tbf.org.tr";


const NEWS_URL =
  BASE_URL +
  "/ligler/haberler/haberler";


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
    BASE_URL

};


/* =========================================================
   ŞEHİRLER
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
  limit = 20,
  env = null
} = {}) {

  /*
    env ileride global learning için kullanılacak.
    Şimdilik kaynağın çalışmasını etkilemez.
  */

  void env;


  const html =
    await fetchHtml(
      NEWS_URL
    );


  const articleUrls =
    extractArticleUrls(
      html
    )
      .slice(
        0,
        35
      );


  const results =
    await Promise.allSettled(

      articleUrls.map(
        readArticle
      )

    );


  const articles =
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
        article =>
          Number(
            article.relevanceScore ||
            0
          ) >= 3
      );


  const uniqueArticles =
    removeDuplicates(
      articles
    );


  uniqueArticles.sort(
    compareArticles
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
      uniqueArticles.slice(
        0,
        safeLimit
      )

  };

}


/* =========================================================
   TEK HABERİ OKU
   ========================================================= */

async function readArticle(
  url
) {

  try {

    const html =
      await fetchHtml(
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


    const originalText =
      extractArticleText(
        html,
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


    const location =
      extractLocation(
        originalTitle,
        originalText
      );


    const eventDate =
      extractEventDate(
        originalTitle +
        " " +
        originalText
      );


    const deadline =
      extractRegistrationDeadline(
        originalText
      );


    const grade =
      extractGrade(
        originalTitle
      );


    const published =
      extractPublishedDate(
        html
      );


    const image =
      extractImage(
        html
      );


    const editorial =
      buildEditorial({

        originalTitle:
          originalTitle,

        originalText:
          originalText,

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


    const qualityScore =
      calculateQualityScore({

        title:
          editorial.title,

        summary:
          editorial.summary,

        image:
          image,

        location:
          location,

        eventDate:
          eventDate

      });


    const relevanceScore =
      analysis.score;


    const finalScore =
      (
        relevanceScore *
        10
      )
      +
      qualityScore;


    return {

      id:
        makeId(
          url
        ),

      externalId:
        makeId(
          url
        ),


      /* -----------------------------------------------
         SporNRD başlık ve açıklaması
         ----------------------------------------------- */

      title:
        editorial.title,

      summary:
        editorial.summary,


      /* -----------------------------------------------
         Gerçek kaynak
         ----------------------------------------------- */

      originalTitle:
        originalTitle,

      originalText:
        originalText,


      /* -----------------------------------------------
         SporNRD Editör
         ----------------------------------------------- */

      editorial:
        true,

      editorialLabel:
        "SporNRD Özeti",

      editorialVersion:
        "6.0-TBF",


      /* -----------------------------------------------
         Kaynak
         ----------------------------------------------- */

      sourceId:
        SOURCE.id,

      source:
        SOURCE.name,

      sourceShortName:
        SOURCE.shortName,

      sourceType:
        SOURCE.sourceType,

      sport:
        SOURCE.sport,

      verified:
        true,


      /* -----------------------------------------------
         Analiz
         ----------------------------------------------- */

      category:
        analysis.category,

      audience:
        analysis.audience,

      relevanceScore:
        relevanceScore,

      qualityScore:
        qualityScore,

      finalScore:
        finalScore,


      /* -----------------------------------------------
         Haber DNA
         ----------------------------------------------- */

      topic:
        editorial.topic,

      urgency:
        deadline
          ? "important"
          : "normal",

      actionRequired:
        analysis.actionRequired,

      actionLabel:
        editorial.actionLabel,

      tags:
        editorial.tags,


      /* -----------------------------------------------
         Gerçekler
         ----------------------------------------------- */

      facts: {

        organization:
          SOURCE.name,

        sport:
          "Basketbol",

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


      /* -----------------------------------------------
         Tarih / konum
         ----------------------------------------------- */

      date:
        published.text,

      timestamp:
        published.timestamp,

      location:
        location,


      /* -----------------------------------------------
         Medya
         ----------------------------------------------- */

      image:
        image,

      url:
        url,

      pdfUrl:
        "",


      emoji:
        emojiFor(
          analysis.category
        )

    };

  }

  catch (error) {

    console.log(
      "TBF haber detayı okunamadı:",
      url,
      getErrorMessage(
        error
      )
    );


    return null;

  }

}


/* =========================================================
   SAYFA ÇEK
   ========================================================= */

async function fetchHtml(
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
            "Mozilla/5.0 SporNRD/6.0"

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
      response.status +
      ": " +
      url
    );

  }


  return response.text();

}


/* =========================================================
   HABER LİNKLERİNİ BUL
   ========================================================= */

function extractArticleUrls(
  html
) {

  const urls =
    [];


  const seen =
    new Set();


  /*
    TBF'de örnekler:

    /haber/...
    /ligler/hatay/haber/...
    /ligler/12216/haber/...
  */

  const regex =
    /href\s*=\s*["']([^"']*\/haber\/[^"'#]+)["']/gi;


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


    let absoluteUrl;


    try {

      absoluteUrl =
        new URL(
          href,
          BASE_URL
        ).href;

    }

    catch {

      continue;

    }


    if (
      !absoluteUrl
        .toLowerCase()
        .includes(
          "tbf.org.tr"
        )
    ) {

      continue;

    }


    /*
      Fragment temizle.
    */

    absoluteUrl =
      absoluteUrl.split(
        "#"
      )[0];


    if (
      seen.has(
        absoluteUrl
      )
    ) {

      continue;

    }


    seen.add(
      absoluteUrl
    );


    urls.push(
      absoluteUrl
    );

  }


  return urls;

}


/* =========================================================
   BAŞLIK
   ========================================================= */

function extractTitle(
  html
) {

  const h1 =
    html.match(
      /<h1\b[^>]*>([\s\S]*?)<\/h1>/i
    );


  if (
    h1
  ) {

    const title =
      cleanText(
        h1[1]
      );


    if (
      title
    ) {

      return title;

    }

  }


  const og1 =
    html.match(
      /<meta\b[^>]*(?:property|name)=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i
    );


  if (
    og1
  ) {

    return cleanText(
      og1[1]
    );

  }


  const og2 =
    html.match(
      /<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:title["'][^>]*>/i
    );


  if (
    og2
  ) {

    return cleanText(
      og2[1]
    );

  }


  const normalTitle =
    html.match(
      /<title\b[^>]*>([\s\S]*?)<\/title>/i
    );


  return normalTitle
    ? cleanText(
        normalTitle[1]
      )
    : "";

}


/* =========================================================
   HABER METNİ
   ========================================================= */

function extractArticleText(
  html,
  title
) {

  const pieces =
    [];


  /*
    TBF haber detaylarında gerçek haber metni
    çoğunlukla paragraf elementlerinde.
  */

  const regex =
    /<(p|h2|h3|h4|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;


  let match;


  while (
    (
      match =
        regex.exec(
          html
        )
    ) !== null
  ) {

    const text =
      cleanText(
        match[2]
      );


    if (
      !text ||
      text.length < 20
    ) {

      continue;

    }


    if (
      normalize(
        text
      ) ===
      normalize(
        title
      )
    ) {

      continue;

    }


    if (
      isNoiseText(
        text
      )
    ) {

      continue;

    }


    pieces.push(
      text
    );

  }


  const unique =
    [
      ...new Set(
        pieces
      )
    ];


  if (
    unique.length
  ) {

    return unique
      .join(
        " "
      )
      .slice(
        0,
        2600
      );

  }


  /*
    Yedek:
    meta description.
  */

  const meta1 =
    html.match(
      /<meta\b[^>]*(?:name=["']description["']|property=["']og:description["'])[^>]*content=["']([^"']+)["'][^>]*>/i
    );


  if (
    meta1
  ) {

    return cleanText(
      meta1[1]
    );

  }


  const meta2 =
    html.match(
      /<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:name=["']description["']|property=["']og:description["'])[^>]*>/i
    );


  return meta2
    ? cleanText(
        meta2[1]
      )
    : "";

}


/* =========================================================
   GEREKSİZ METİN
   ========================================================= */

function isNoiseText(
  value
) {

  const text =
    normalize(
      value
    );


  const noise = [

    "TUM HAKLARI SAKLIDIR",

    "TURKIYE BASKETBOL FEDERASYONU KAZLICESME",

    "GIZLILIK",

    "CEREZ",

    "KVKK",

    "FACEBOOK",

    "INSTAGRAM",

    "YOUTUBE",

    "TWITTER",

    "ILETISIM",

    "DEVAMINI GOR",

    "ANA SAYFA",

    "HIZLI ERISIM"

  ];


  return noise.some(
    item =>
      text.includes(
        item
      )
  );

}


/* =========================================================
   SINIFLANDIRMA
   ========================================================= */

function classifyArticle(
  title,
  body
) {

  const titleText =
    normalize(
      title
    );


  const allText =
    normalize(
      title +
      " " +
      body
    );


  /* -------------------------------------------------------
     Akışa alınmayacak içerikler
     ------------------------------------------------------- */

  if (
    hasAny(
      titleText,
      [

        "VEFAT",

        "BASSAGLIGI",

        "DISIPLIN KURULU",

        "YONETIM KURULU",

        "BASKAN MESAJI",

        "ZIYARET",

        "HAKEM GOREVLENDIRMELERI"

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
     ANTRENÖR
     ------------------------------------------------------- */

  if (
    hasAny(
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
        hasAny(
          allText,
          [
            "BASVURU",
            "KAYIT",
            "SONA ERECEK",
            "SONA ERECEKTIR"
          ]
        )

    };

  }


  /* -------------------------------------------------------
     SPORCU / OYUNCU / MİLLİ TAKIM
     ------------------------------------------------------- */

  if (
    hasAny(
      titleText,
      [

        "SPORCU",

        "OYUNCU",

        "MILLI TAKIM",

        "MILLI TAKIMIMIZ",

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
     EĞİTİM
     ------------------------------------------------------- */

  if (
    hasAny(
      titleText,
      [

        "SEMINER",

        "EGITIM",

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
        hasAny(
          allText,
          [
            "BASVURU",
            "KAYIT"
          ]
        )

    };

  }


  /* -------------------------------------------------------
     YARIŞMA / LİG / KUPA
     ------------------------------------------------------- */

  if (
    hasAny(
      titleText,
      [

        "FIBA",

        "EUROLEAGUE",

        "EUROCUP",

        "LIG",

        "KUPA",

        "SAMPIYON",

        "SAMPIYONA",

        "FINAL",

        "FINAL FOUR",

        "MUSABAKA",

        "MAC",

        "SEZONU BASLIYOR",

        "SEZON BASLIYOR"

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
     ÖNEMLİ DUYURU
     ------------------------------------------------------- */

  if (
    hasAny(
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


/* =========================================================
   SPORNRD EDİTÖR
   ========================================================= */

function buildEditorial({

  originalTitle,
  originalText,
  category,
  location,
  eventDate,
  deadline,
  grade

}) {

  let title =
    cleanText(
      originalTitle
    );


  let summary =
    "";


  let actionLabel =
    "Detayı Gör";


  let topic =
    title;


  const tags =
    [
      "Basketbol"
    ];


  /* -------------------------------------------------------
     ANTRENÖR KURSU
     ------------------------------------------------------- */

  if (
    category === "coach" &&
    normalize(
      originalTitle
    ).includes(
      "KURS"
    )
  ) {

    const level =
      grade
        ? grade +
          ". Kademe"

        : "Basketbol";


    title =
      level +
      " basketbol antrenör kursu";


    if (
      location !==
      "Türkiye"
    ) {

      title +=
        " " +
        location +
        "’da";

    }


    if (
      eventDate
    ) {

      title +=
        ": " +
        eventDate;

    }


    topic =
      level +
      " Basketbol Antrenör Kursu";


    summary =
      "TBF, " +
      level +
      " Basketbol Antrenör Kursu’nun ayrıntılarını açıkladı.";


    if (
      eventDate &&
      location !==
      "Türkiye"
    ) {

      summary =
        "TBF, " +
        level +
        " Basketbol Antrenör Kursu’nu " +
        eventDate +
        " tarihlerinde " +
        location +
        "’da düzenleyecek.";

    }


    if (
      deadline
    ) {

      summary +=
        " Kayıtlar " +
        deadline +
        " tarihinde sona erecek.";

    }


    summary +=
      " Başvuru ve katılım ayrıntıları federasyonun resmî duyurusunda yer alıyor.";


    actionLabel =
      "Kurs Detayları";


    tags.push(
      "Antrenör",
      "Kurs"
    );

  }


  /* -------------------------------------------------------
     DİĞER ANTRENÖR İÇERİĞİ
     ------------------------------------------------------- */

  else if (
    category ===
    "coach"
  ) {

    summary =
      createSourceSummary(
        originalText,
        "TBF, basketbol antrenörlerini ilgilendiren yeni bir resmî duyuru yayımladı."
      );


    actionLabel =
      "Antrenör Duyurusunu İncele";


    tags.push(
      "Antrenör"
    );

  }


  /* -------------------------------------------------------
     SPORCU
     ------------------------------------------------------- */

  else if (
    category ===
    "athlete"
  ) {

    summary =
      createSourceSummary(
        originalText,
        "TBF, basketbolcuları veya milli takım sporcularını ilgilendiren yeni bir gelişmeyi duyurdu."
      );


    actionLabel =
      "Sporcu Duyurusunu İncele";


    tags.push(
      "Sporcu"
    );

  }


  /* -------------------------------------------------------
     EĞİTİM
     ------------------------------------------------------- */

  else if (
    category ===
    "education"
  ) {

    summary =
      createSourceSummary(
        originalText,
        "TBF, basketbol camiasına yönelik yeni eğitim veya seminer duyurusunu yayımladı."
      );


    actionLabel =
      "Eğitimi İncele";


    tags.push(
      "Eğitim"
    );

  }


  /* -------------------------------------------------------
     YARIŞMA
     ------------------------------------------------------- */

  else if (
    category ===
    "event"
  ) {

    summary =
      createSourceSummary(
        originalText,
        "TBF, basketbol organizasyonlarıyla ilgili yeni gelişmeyi duyurdu."
      );


    actionLabel =
      "Haberi İncele";


    tags.push(
      "Yarışma"
    );

  }


  /* -------------------------------------------------------
     GENEL
     ------------------------------------------------------- */

  else {

    summary =
      createSourceSummary(
        originalText,
        "Türkiye Basketbol Federasyonu yeni bir resmî duyuru yayımladı."
      );


    tags.push(
      "Duyuru"
    );

  }


  if (
    location &&
    location !==
    "Türkiye"
  ) {

    tags.push(
      location
    );

  }


  return {

    title:
      shorten(
        title,
        120
      ),

    summary:
      shorten(
        summary,
        360
      ),

    actionLabel:
      actionLabel,

    topic:
      topic,

    tags:
      [
        ...new Set(
          tags
        )
      ]

  };

}


/* =========================================================
   GERÇEK METİNDEN ÖZET
   ========================================================= */

function createSourceSummary(
  originalText,
  fallback
) {

  const text =
    cleanText(
      originalText
    );


  if (
    text.length < 50
  ) {

    return (
      fallback +
      " Ayrıntılar federasyonun resmî kaynağında yer alıyor."
    );

  }


  const sentences =
    splitSentences(
      text
    );


  const selected =
    [];


  for (
    const sentence
    of sentences
  ) {

    if (
      sentence.length < 25
    ) {

      continue;

    }


    if (
      isNoiseText(
        sentence
      )
    ) {

      continue;

    }


    selected.push(
      sentence
    );


    if (
      selected.length >= 2
    ) {

      break;

    }

  }


  if (
    !selected.length
  ) {

    return fallback;

  }


  return selected.join(
    " "
  );

}


/* =========================================================
   YAYIN TARİHİ
   ========================================================= */

function extractPublishedDate(
  html
) {

  const text =
    cleanText(
      html
    );


  /*
    TBF:
    Yayın Tarihi: 07.10.2026
  */

  const preferred =
    text.match(
      /Yayın\s*Tarihi\s*:\s*(\d{1,2})[.\/-](\d{1,2})[.\/-](20\d{2})/i
    );


  const fallback =
    text.match(
      /\b(\d{1,2})[.](\d{1,2})[.](20\d{2})\b/
    );


  const match =
    preferred ||
    fallback;


  if (
    !match
  ) {

    return {

      text:
        "",

      timestamp:
        0

    };

  }


  const day =
    Number(
      match[1]
    );


  const month =
    Number(
      match[2]
    );


  const year =
    Number(
      match[3]
    );


  return {

    text:
      pad2(
        day
      ) +
      "." +
      pad2(
        month
      ) +
      "." +
      year,

    timestamp:
      Date.UTC(
        year,
        month - 1,
        day
      )

  };

}


/* =========================================================
   ETKİNLİK TARİHİ
   ========================================================= */

function extractEventDate(
  value
) {

  const text =
    cleanText(
      value
    );


  const months =
    "Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık";


  /* -------------------------------------------------------
     25 Ekim - 1 Kasım 2026
     ------------------------------------------------------- */

  let match =
    text.match(

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


  /* -------------------------------------------------------
     24 - 31 Ekim 2026
     ------------------------------------------------------- */

  match =
    text.match(

      new RegExp(

        "(\\d{1,2})\\s*[-–]\\s*(\\d{1,2})\\s+(" +
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
      "–" +
      match[2] +
      " " +
      match[3] +
      " " +
      match[4]
    );

  }


  return "";

}


/* =========================================================
   KAYIT SON TARİHİ
   ========================================================= */

function extractRegistrationDeadline(
  value
) {

  const text =
    cleanText(
      value
    );


  const months =
    "Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık";


  /*
    Örnek:
    kurs kayıtları 15 Ekim saat 16:00'da sona erecektir.
  */

  let match =
    text.match(

      new RegExp(

        "kayıt(?:ları|lar)?[^.]{0,80}?" +
        "(\\d{1,2})\\s+(" +
        months +
        ")" +
        "(?:\\s+(20\\d{2}))?" +
        "[^.]{0,30}?" +
        "(\\d{1,2}:\\d{2})" +
        "[^.]*(?:sona\\s+erecek|sona\\s+erecektir)",

        "i"

      )

    );


  if (
    !match
  ) {

    /*
      Daha genel yedek.
    */

    match =
      text.match(

        new RegExp(

          "(\\d{1,2})\\s+(" +
          months +
          ")" +
          "(?:\\s+(20\\d{2}))?" +
          "\\s+(?:saat\\s+)?" +
          "(\\d{1,2}:\\d{2})" +
          "[^.]*(?:sona\\s+erecek|sona\\s+erecektir)",

          "i"

        )

      );

  }


  if (
    !match
  ) {

    return "";

  }


  let result =
    match[1] +
    " " +
    match[2];


  if (
    match[3]
  ) {

    result +=
      " " +
      match[3];

  }


  if (
    match[4]
  ) {

    result +=
      " " +
      match[4];

  }


  return result;

}


/* =========================================================
   KADEME
   ========================================================= */

function extractGrade(
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
   KONUM
   ========================================================= */

function extractLocation(
  title,
  body
) {

  /*
    Önce başlığa bakıyoruz.
    Başlık en güvenilir alan.
  */

  const normalizedTitle =
    normalize(
      title
    );


  for (
    const city
    of CITIES
  ) {

    if (
      normalizedTitle.includes(
        normalize(
          city
        )
      )
    ) {

      return city;

    }

  }


  /*
    Gövdede yalnızca
    "Konya'da / Mersin’de / İstanbul'da"
    gibi açık kullanım varsa kabul et.
  */

  const normalizedBody =
    normalize(
      body
    );


  for (
    const city
    of CITIES
  ) {

    const cityText =
      normalize(
        city
      );


    const pattern =
      new RegExp(

        "\\b" +
        escapeRegex(
          cityText
        ) +
        "\\s*['’]?(?:DA|DE|TA|TE)\\b",

        "i"

      );


    if (
      pattern.test(
        normalizedBody
      )
    ) {

      return city;

    }

  }


  return "Türkiye";

}


/* =========================================================
   GÖRSEL
   ========================================================= */

function extractImage(
  html
) {

  const patterns = [

    /<meta\b[^>]*(?:property|name)=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i,

    /<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image["'][^>]*>/i

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
        BASE_URL
      ).href;

    }

    catch {

      /* diğer kalıba geç */

    }

  }


  return "";

}


/* =========================================================
   KALİTE PUANI
   ========================================================= */

function calculateQualityScore({

  title,
  summary,
  image,
  location,
  eventDate

}) {

  let score =
    35;


  if (
    title &&
    title.length >= 20 &&
    title.length <= 120
  ) {

    score += 18;

  }


  if (
    summary &&
    summary.length >= 60 &&
    summary.length <= 360
  ) {

    score += 18;

  }


  if (
    image
  ) {

    score += 12;

  }


  if (
    location &&
    location !==
    "Türkiye"
  ) {

    score += 8;

  }


  if (
    eventDate
  ) {

    score += 9;

  }


  return Math.min(
    score,
    100
  );

}


/* =========================================================
   TEKRAR TEMİZLE
   ========================================================= */

function removeDuplicates(
  items
) {

  const output =
    [];


  const titles =
    new Set();


  const urls =
    new Set();


  for (
    const item
    of items
  ) {

    const titleKey =
      normalize(
        item.originalTitle ||
        item.title
      );


    const urlKey =
      String(
        item.url ||
        ""
      )
        .trim()
        .toLowerCase();


    if (
      titleKey &&
      titles.has(
        titleKey
      )
    ) {

      continue;

    }


    if (
      urlKey &&
      urls.has(
        urlKey
      )
    ) {

      continue;

    }


    if (
      titleKey
    ) {

      titles.add(
        titleKey
      );

    }


    if (
      urlKey
    ) {

      urls.add(
        urlKey
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

  const scoreA =
    Number(
      a.finalScore ||
      0
    );


  const scoreB =
    Number(
      b.finalScore ||
      0
    );


  if (
    scoreA !== scoreB
  ) {

    return (
      scoreB -
      scoreA
    );

  }


  return (
    Number(
      b.timestamp ||
      0
    )
    -
    Number(
      a.timestamp ||
      0
    )
  );

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
    "tbf-" +
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
      "🏀",

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
    "🏀"
  );

}


/* =========================================================
   HTML ENTITY ÇÖZ
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


          const code =
            parseInt(
              raw,
              isHex
                ? 16
                : 10
            );


          if (
            Number.isFinite(
              code
            )
          ) {

            try {

              return String
                .fromCodePoint(
                  code
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
   NORMALIZE
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
   ARRAY KEYWORD
   ========================================================= */

function hasAny(
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
   CÜMLELER
   ========================================================= */

function splitSentences(
  value
) {

  const matches =
    String(
      value ||
      ""
    ).match(
      /[^.!?]+[.!?]+|[^.!?]+$/g
    );


  return matches
    ? matches
        .map(
          sentence =>
            sentence.trim()
        )
        .filter(
          Boolean
        )
    : [];

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


  const partial =
    text.slice(
      0,
      max
    );


  const space =
    partial.lastIndexOf(
      " "
    );


  return (
    partial.slice(
      0,
      space > 0
        ? space
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
  ).replace(
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
  ).padStart(
    2,
    "0"
  );

}


/* =========================================================
   HATA
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
