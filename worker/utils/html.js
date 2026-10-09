/* =========================================================
   SporNRD
   worker/utils/html.js

   HTML temizleme + veri çıkarma yardımcıları
   SporNRD v6.0.4
   ========================================================= */


/* =========================================================
   HTML ENTITY ÇÖZÜMLEME
   ========================================================= */

export function decodeEntities(
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

    Idot:
      "İ",

    inodot:
      "ı",

    rsquo:
      "’",

    lsquo:
      "‘",

    rdquo:
      "”",

    ldquo:
      "“",

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

        /* -------------------------------------------------
           Sayısal entity
           &#287;
           &#x11F;
           ------------------------------------------------- */

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
              ? entity.slice(
                  2
                )
              : entity.slice(
                  1
                );


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


        /* -------------------------------------------------
           İsimli entity
           ------------------------------------------------- */

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
   HTML TEMİZLE
   ========================================================= */

export function cleanHtml(
  value
) {

  return decodeEntities(
    String(
      value ||
      ""
    )
  )

    /* script */

    .replace(
      /<script\b[\s\S]*?<\/script>/gi,
      " "
    )

    /* style */

    .replace(
      /<style\b[\s\S]*?<\/style>/gi,
      " "
    )

    /* noscript */

    .replace(
      /<noscript\b[\s\S]*?<\/noscript>/gi,
      " "
    )

    /* HTML yorumları */

    .replace(
      /<!--[\s\S]*?-->/g,
      " "
    )

    /* satır geçişi üreten elementler */

    .replace(
      /<(?:br|hr)\b[^>]*\/?>/gi,
      " "
    )

    /* tüm HTML tagları */

    .replace(
      /<[^>]+>/g,
      " "
    )

    /* özel boşluk karakterleri */

    .replace(
      /[\u00A0\u2007\u202F]/g,
      " "
    )

    /* fazla boşluk */

    .replace(
      /\s+/g,
      " "
    )

    .trim();

}


/* =========================================================
   NORMALİZE

   Arama / sınıflandırma için Türkçe karakterleri
   karşılaştırılabilir hale getirir.
   ========================================================= */

export function normalize(
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
   BAŞLIK ÇIKAR
   ========================================================= */

export function extractTitle(
  html
) {

  const source =
    String(
      html ||
      ""
    );


  /* -------------------------------------------------------
     1. H1
     ------------------------------------------------------- */

  const h1 =
    source.match(
      /<h1\b[^>]*>([\s\S]*?)<\/h1>/i
    );


  if (
    h1
  ) {

    const title =
      cleanHtml(
        h1[1]
      );


    if (
      title
    ) {

      return title;

    }

  }


  /* -------------------------------------------------------
     2. og:title
     property önce
     ------------------------------------------------------- */

  const ogPropertyFirst =
    source.match(
      /<meta\b[^>]*(?:property|name)=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i
    );


  if (
    ogPropertyFirst
  ) {

    const title =
      cleanHtml(
        ogPropertyFirst[1]
      );


    if (
      title
    ) {

      return title;

    }

  }


  /* -------------------------------------------------------
     3. og:title
     content önce
     ------------------------------------------------------- */

  const ogContentFirst =
    source.match(
      /<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:title["'][^>]*>/i
    );


  if (
    ogContentFirst
  ) {

    const title =
      cleanHtml(
        ogContentFirst[1]
      );


    if (
      title
    ) {

      return title;

    }

  }


  /* -------------------------------------------------------
     4. twitter:title
     ------------------------------------------------------- */

  const twitter =
    source.match(
      /<meta\b[^>]*(?:property|name)=["']twitter:title["'][^>]*content=["']([^"']+)["'][^>]*>/i
    );


  if (
    twitter
  ) {

    const title =
      cleanHtml(
        twitter[1]
      );


    if (
      title
    ) {

      return title;

    }

  }


  /* -------------------------------------------------------
     5. title tag
     ------------------------------------------------------- */

  const documentTitle =
    source.match(
      /<title\b[^>]*>([\s\S]*?)<\/title>/i
    );


  if (
    documentTitle
  ) {

    return cleanHtml(
      documentTitle[1]
    );

  }


  return "";

}


/* =========================================================
   GERÇEK HABER BÖLÜMÜNÜ ÇIKAR
   ========================================================= */

export function extractArticleRegion(
  html
) {

  const source =
    String(
      html ||
      ""
    );


  if (
    !source
  ) {

    return "";

  }


  /* -------------------------------------------------------
     H1 sonrasından başla
     ------------------------------------------------------- */

  const h1Close =
    /<\/h1\s*>/i
      .exec(
        source
      );


  const start =
    h1Close

      ? h1Close.index +
        h1Close[0].length

      : 0;


  const tail =
    source.slice(
      start
    );


  /* -------------------------------------------------------
     Haber sonu işaretleri
     ------------------------------------------------------- */

  const markers = [

    /Temsilcilikler/i,

    /Üyelikler/i,

    /Di(?:ğ|&#287;|&gbreve;)er\s+Haberler/i,

    /İlgili\s+Haberler/i,

    /Son\s+Haberler/i,

    /Hizmet\s+Sözleşmesi/i,

    /GENEL\s+KOŞULLAR/i,

    /İptal\s+İade/i,

    /Kişisel\s+Bilgi/i,

    /Footer/i,

    /<footer\b/i

  ];


  let end =
    tail.length;


  for (
    const marker
    of markers
  ) {

    const found =
      marker.exec(
        tail
      );


    if (
      found &&
      found.index > 100 &&
      found.index < end
    ) {

      end =
        found.index;

    }

  }


  return tail.slice(
    0,
    end
  );

}


/* =========================================================
   HABER GÖVDESİ
   ========================================================= */

export function extractBody(
  region,
  title = ""
) {

  if (
    !region
  ) {

    return "";

  }


  const parts =
    [];


  const regex =
    /<(p|h2|h3|h4|h5|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi;


  let match;


  while (
    (
      match =
        regex.exec(
          region
        )
    ) !== null
  ) {

    const text =
      cleanHtml(
        match[2]
      );


    if (
      !text ||
      text.length < 18
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


    parts.push(
      text
    );

  }


  /* -------------------------------------------------------
     Aynı paragraf tekrarlarını temizle
     ------------------------------------------------------- */

  const unique =
    [];


  const seen =
    new Set();


  for (
    const part
    of parts
  ) {

    const key =
      normalize(
        part
      );


    if (
      seen.has(
        key
      )
    ) {

      continue;

    }


    seen.add(
      key
    );


    unique.push(
      part
    );

  }


  if (
    unique.length
  ) {

    return unique
      .join(
        " "
      )
      .slice(
        0,
        3200
      );

  }


  /* -------------------------------------------------------
     Yedek:
     region içindeki bütün okunabilir metin
     ------------------------------------------------------- */

  const fallback =
    cleanHtml(
      region
    );


  if (
    !fallback ||
    isNoiseText(
      fallback
    )
  ) {

    return "";

  }


  return fallback.slice(
    0,
    2200
  );

}


/* =========================================================
   TARİH ÇIKAR
   ========================================================= */

export function extractDate(
  htmlOrRegion
) {

  const text =
    cleanHtml(
      htmlOrRegion
    );


  if (
    !text
  ) {

    return {

      text:
        "",

      time:
        0

    };

  }


  /* -------------------------------------------------------
     Türkçe yazılı tarih
     9 Ekim 2026
     ------------------------------------------------------- */

  const writtenRegex =
    /(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+(20\d{2})/i;


  const writtenMatch =
    text.match(
      writtenRegex
    );


  if (
    writtenMatch
  ) {

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
          writtenMatch[2]
        )
      );


    const day =
      Number(
        writtenMatch[1]
      );


    const year =
      Number(
        writtenMatch[3]
      );


    return {

      text:
        `${day} ${writtenMatch[2]} ${year}`,

      time:
        month >= 0

          ? Date.UTC(
              year,
              month,
              day
            )

          : 0

    };

  }


  /* -------------------------------------------------------
     Sayısal tarih
     09.10.2026
     09/10/2026
     09-10-2026
     ------------------------------------------------------- */

  const numericMatch =
    text.match(
      /\b(\d{1,2})[.\/-](\d{1,2})[.\/-](20\d{2})\b/
    );


  if (
    numericMatch
  ) {

    const day =
      Number(
        numericMatch[1]
      );


    const month =
      Number(
        numericMatch[2]
      );


    const year =
      Number(
        numericMatch[3]
      );


    if (
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {

      return {

        text:
          `${pad2(day)}.${pad2(month)}.${year}`,

        time:
          Date.UTC(
            year,
            month - 1,
            day
          )

      };

    }

  }


  return {

    text:
      "",

    time:
      0

  };

}


/* =========================================================
   GÖRSEL ÇIKAR
   ========================================================= */

export function extractImage(
  html,
  baseUrl
) {

  const source =
    String(
      html ||
      ""
    );


  const patterns = [

    /* og:image */

    /<meta\b[^>]*(?:property|name)=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["'][^>]*>/i,

    /* og:image ters attribute */

    /<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image(?::secure_url)?["'][^>]*>/i,

    /* twitter:image */

    /<meta\b[^>]*(?:property|name)=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i,

    /* lazy image */

    /<img\b[^>]*(?:data-src|data-original|data-lazy-src)=["']([^"']+)["'][^>]*>/i

  ];


  for (
    const pattern
    of patterns
  ) {

    const match =
      source.match(
        pattern
      );


    if (
      !match
    ) {

      continue;

    }


    const resolved =
      resolveUrl(
        match[1],
        baseUrl
      );


    if (
      resolved &&
      !isBadImage(
        resolved
      )
    ) {

      return resolved;

    }

  }


  /* -------------------------------------------------------
     TYF dosya sunucusu
     ------------------------------------------------------- */

  const direct =
    source.match(
      /https?:\/\/dosya\.tyf\.gov\.tr\/[^"'<> ]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'<> ]*)?/i
    );


  if (
    direct
  ) {

    const image =
      decodeEntities(
        direct[0]
      );


    if (
      !isBadImage(
        image
      )
    ) {

      return image;

    }

  }


  /* -------------------------------------------------------
     Genel img fallback
     ------------------------------------------------------- */

  const imgRegex =
    /<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi;


  let match;


  while (
    (
      match =
        imgRegex.exec(
          source
        )
    ) !== null
  ) {

    const resolved =
      resolveUrl(
        match[1],
        baseUrl
      );


    if (
      resolved &&
      !isBadImage(
        resolved
      )
    ) {

      return resolved;

    }

  }


  return "";

}


/* =========================================================
   PDF ÇIKAR
   ========================================================= */

export function extractPdf(
  region,
  baseUrl
) {

  const source =
    String(
      region ||
      ""
    );


  const regex =
    /href=["']([^"']+\.pdf(?:\?[^"']*)?)["']/gi;


  let match;


  while (
    (
      match =
        regex.exec(
          source
        )
    ) !== null
  ) {

    const resolved =
      resolveUrl(
        match[1],
        baseUrl
      );


    if (
      resolved
    ) {

      return resolved;

    }

  }


  /* -------------------------------------------------------
     Doğrudan PDF URL
     ------------------------------------------------------- */

  const direct =
    source.match(
      /https?:\/\/[^"'<> ]+\.pdf(?:\?[^"'<> ]*)?/i
    );


  return direct
    ? decodeEntities(
        direct[0]
      )
    : "";

}


/* =========================================================
   CÜMLELERE AYIR
   ========================================================= */

export function splitSentences(
  text
) {

  const cleaned =
    cleanHtml(
      text
    );


  if (
    !cleaned
  ) {

    return [];

  }


  const matches =
    cleaned.match(
      /[^.!?]+[.!?]+|[^.!?]+$/g
    );


  return matches

    ? matches
        .map(
          item =>
            item.trim()
        )
        .filter(
          item =>
            item.length >= 5
        )

    : [];

}


/* =========================================================
   GÜRÜLTÜ METNİ KONTROLÜ
   ========================================================= */

export function isNoiseText(
  text
) {

  const value =
    normalize(
      text
    );


  if (
    !value
  ) {

    return true;

  }


  const noise = [

    "BILGILERI PDF FORMATINDA GORUNTULEMEK",

    "PDF FORMATINDA GORUNTULEMEK",

    "TIKLAYINIZ",

    "DEVAMINI GOR",

    "TUM HAKLARI SAKLIDIR",

    "TEMSILCILIKLER",

    "UYELIKLER",

    "DIGER HABERLER",

    "ILGILI HABERLER",

    "SON HABERLER",

    "HIZMET SOZLESMESI",

    "GENEL KOSULLAR",

    "IPTAL IADE KOSULLARI",

    "KISISSEL BILGI GUVENLIGI",

    "ODEME BILGILERI GUVENLIGI",

    "KREDI KARTI",

    "SPORCU VIZE ODEMESI",

    "KVKK",

    "CEREZ",

    "FACEBOOK",

    "INSTAGRAM",

    "YOUTUBE",

    "TWITTER",

    "ILETISIM"

  ];


  return noise.some(
    item =>
      value.includes(
        item
      )
  );

}


/* =========================================================
   URL ÇÖZ
   ========================================================= */

function resolveUrl(
  value,
  baseUrl
) {

  const raw =
    decodeEntities(
      String(
        value ||
        ""
      )
    )
      .trim();


  if (
    !raw ||
    /^data:/i.test(
      raw
    ) ||
    /^javascript:/i.test(
      raw
    )
  ) {

    return "";

  }


  try {

    return new URL(
      raw,
      baseUrl
    ).href;

  }

  catch {

    return "";

  }

}


/* =========================================================
   KÖTÜ / DEKORATİF GÖRSEL KONTROLÜ
   ========================================================= */

function isBadImage(
  value
) {

  const url =
    String(
      value ||
      ""
    )
      .toLowerCase();


  if (
    !url
  ) {

    return true;

  }


  const bad = [

    "logo",

    "favicon",

    "icon",

    "avatar",

    "spinner",

    "loading",

    "placeholder",

    "blank.gif",

    "transparent"

  ];


  return bad.some(
    item =>
      url.includes(
        item
      )
  );

}


/* =========================================================
   İKİ HANE
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
