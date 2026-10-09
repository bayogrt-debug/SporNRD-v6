/* =========================================================
   SporNRD
   worker/intelligence/factEngine.js

   TYF haberlerinden yapılandırılmış gerçekleri çıkarır.
   SporNRD v6.0.4
   ========================================================= */


import {
  cleanHtml,
  normalize
} from "../utils/html.js";


/* =========================================================
   ŞEHİR HARİTASI
   ========================================================= */

const CITY_MAP = [

  ["ADANA", "Adana"],
  ["ADIYAMAN", "Adıyaman"],
  ["AFYONKARAHISAR", "Afyonkarahisar"],
  ["AGRI", "Ağrı"],
  ["AKSARAY", "Aksaray"],
  ["AMASYA", "Amasya"],
  ["ANKARA", "Ankara"],
  ["ANTALYA", "Antalya"],
  ["ARDAHAN", "Ardahan"],
  ["ARTVIN", "Artvin"],
  ["AYDIN", "Aydın"],
  ["BALIKESIR", "Balıkesir"],
  ["BARTIN", "Bartın"],
  ["BATMAN", "Batman"],
  ["BAYBURT", "Bayburt"],
  ["BILECIK", "Bilecik"],
  ["BINGOL", "Bingöl"],
  ["BITLIS", "Bitlis"],
  ["BOLU", "Bolu"],
  ["BURDUR", "Burdur"],
  ["BURSA", "Bursa"],
  ["CANAKKALE", "Çanakkale"],
  ["CANKIRI", "Çankırı"],
  ["CORUM", "Çorum"],
  ["DENIZLI", "Denizli"],
  ["DIYARBAKIR", "Diyarbakır"],
  ["DUZCE", "Düzce"],
  ["EDIRNE", "Edirne"],
  ["ELAZIG", "Elazığ"],
  ["ERZINCAN", "Erzincan"],
  ["ERZURUM", "Erzurum"],
  ["ESKISEHIR", "Eskişehir"],
  ["GAZIANTEP", "Gaziantep"],
  ["GIRESUN", "Giresun"],
  ["GUMUSHANE", "Gümüşhane"],
  ["HAKKARI", "Hakkari"],
  ["HATAY", "Hatay"],
  ["IGDIR", "Iğdır"],
  ["ISPARTA", "Isparta"],
  ["ISTANBUL", "İstanbul"],
  ["IZMIR", "İzmir"],
  ["KAHRAMANMARAS", "Kahramanmaraş"],
  ["KARABUK", "Karabük"],
  ["KARAMAN", "Karaman"],
  ["KARS", "Kars"],
  ["KASTAMONU", "Kastamonu"],
  ["KAYSERI", "Kayseri"],
  ["KIRIKKALE", "Kırıkkale"],
  ["KIRKLARELI", "Kırklareli"],
  ["KIRSEHIR", "Kırşehir"],
  ["KILIS", "Kilis"],
  ["KOCAELI", "Kocaeli"],
  ["KONYA", "Konya"],
  ["KUTAHYA", "Kütahya"],
  ["MALATYA", "Malatya"],
  ["MANISA", "Manisa"],
  ["MARDIN", "Mardin"],
  ["MERSIN", "Mersin"],
  ["MUGLA", "Muğla"],
  ["MUS", "Muş"],
  ["NEVSEHIR", "Nevşehir"],
  ["NIGDE", "Niğde"],
  ["ORDU", "Ordu"],
  ["OSMANIYE", "Osmaniye"],
  ["RIZE", "Rize"],
  ["SAKARYA", "Sakarya"],
  ["SAMSUN", "Samsun"],
  ["SIIRT", "Siirt"],
  ["SINOP", "Sinop"],
  ["SIVAS", "Sivas"],
  ["SANLIURFA", "Şanlıurfa"],
  ["SIRNAK", "Şırnak"],
  ["TEKIRDAG", "Tekirdağ"],
  ["TOKAT", "Tokat"],
  ["TRABZON", "Trabzon"],
  ["TUNCELI", "Tunceli"],
  ["USAK", "Uşak"],
  ["VAN", "Van"],
  ["YALOVA", "Yalova"],
  ["YOZGAT", "Yozgat"],
  ["ZONGULDAK", "Zonguldak"]

];


/* =========================================================
   ANA GERÇEK ÇIKARIMI
   ========================================================= */

export function extractFacts({
  title = "",
  body = "",
  category = "announcement",
  audience = "general"
} = {}) {

  const combined =
    `${title} ${body}`;


  const location =
    getLocation(
      title,
      body
    );


  const eventDate =
    getEventDate(
      combined
    );


  const dateRange =
    getDateRange(
      combined
    );


  const deadlineText =
    getDeadline(
      combined
    );


  const grade =
    getGrade(
      title
    );


  const businessDays =
    getBusinessDays(
      body
    );


  const actionRequired =
    detectActionRequired(
      combined
    );


  const urgency =
    detectUrgency(
      combined
    );


  const topic =
    detectTopic(
      title,
      category
    );


  const normalizedTitle =
    normalize(
      title
    );


  return {

    /* -----------------------------------------------------
       Kaynak
       ----------------------------------------------------- */

    sport:
      "Yüzme",

    organization:
      "Türkiye Yüzme Federasyonu",


    /* -----------------------------------------------------
       Sınıflandırma
       ----------------------------------------------------- */

    category:
      category,

    audience:
      audience,


    /* -----------------------------------------------------
       Temel gerçekler
       ----------------------------------------------------- */

    location:
      location,

    grade:
      grade,

    eventDate:
      eventDate,

    dateRange:
      dateRange,

    deadlineText:
      deadlineText,

    businessDays:
      businessDays,


    /* -----------------------------------------------------
       Haber davranışı
       ----------------------------------------------------- */

    actionRequired:
      actionRequired,

    urgency:
      urgency,

    topic:
      topic,


    /* -----------------------------------------------------
       Özel haber türleri
       Editorial engine kullanabilir.
       ----------------------------------------------------- */

    isSem:
      normalizedTitle.includes(
        "SEM"
      ),

    isSemResult:
      normalizedTitle.includes(
        "SEM"
      ) &&
      (
        normalizedTitle.includes(
          "KAYIT HAKKI"
        ) ||
        normalizedTitle.includes(
          "HAK KAZANAN"
        ) ||
        normalizedTitle.includes(
          "SONUC"
        )
      ),

    isTohm:
      normalizedTitle.includes(
        "TOHM"
      ),

    isCoachCourse:
      normalizedTitle.includes(
        "ANTRENOR"
      ) &&
      normalizedTitle.includes(
        "KURS"
      ),

    isCoachVisa:
      normalizedTitle.includes(
        "ANTRENOR"
      ) &&
      normalizedTitle.includes(
        "VIZE"
      ),

    isBabySwimming:
      normalizedTitle.includes(
        "BEBEK"
      ) &&
      (
        normalizedTitle.includes(
          "YUZME"
        ) ||
        normalizedTitle.includes(
          "SEMINER"
        )
      )

  };

}


/* =========================================================
   KONUM
   ========================================================= */

export function getLocation(
  title,
  body
) {

  const titleText =
    normalize(
      title
    );


  /* -------------------------------------------------------
     Önce başlık
     ------------------------------------------------------- */

  for (
    const [
      key,
      value
    ]
    of CITY_MAP
  ) {

    if (
      titleText.includes(
        key
      )
    ) {

      return value;

    }

  }


  /* -------------------------------------------------------
     Sonra gövde
     ------------------------------------------------------- */

  const bodyText =
    normalize(
      body
    );


  for (
    const [
      key,
      value
    ]
    of CITY_MAP
  ) {

    const escaped =
      escapeRegex(
        key
      );


    const pattern =
      new RegExp(

        `\\b${escaped}\\b(?:'?` +
        `(?:DA|DE|TA|TE)|` +
        `\\s+ILINDE|` +
        `\\s+ILINDEKI|` +
        `\\s+ILINDEKI)`,

        "i"

      );


    if (
      pattern.test(
        bodyText
      )
    ) {

      return value;

    }

  }


  return "Türkiye";

}


/* =========================================================
   ANTRENÖR KADEMESİ
   ========================================================= */

export function getGrade(
  title
) {

  const match =
    String(
      title ||
      ""
    )
      .match(
        /(\d+)\.\s*KADEME/i
      );


  return match
    ? match[1]
    : "";

}


/* =========================================================
   ETKİNLİK TARİHİ
   ========================================================= */

export function getEventDate(
  value
) {

  const text =
    cleanHtml(
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

        `(\\d{1,2})\\s+(${months})` +
        `\\s*[-–]\\s*` +
        `(\\d{1,2})\\s+(${months})` +
        `\\s+(20\\d{2})`,

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
    text.match(

      new RegExp(

        `(\\d{1,2})\\s*[-–]\\s*` +
        `(\\d{1,2})\\s+(${months})` +
        `\\s+(20\\d{2})`,

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
     Tek tarih:
     26 Ekim 2026
     ------------------------------------------------------- */

  match =
    text.match(

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
   TARİH ARALIĞI
   ========================================================= */

export function getDateRange(
  value
) {

  return getEventDate(
    cleanHtml(
      value
    )
  );

}


/* =========================================================
   SON BAŞVURU / KAYIT TARİHİ
   ========================================================= */

export function getDeadline(
  value
) {

  const text =
    cleanHtml(
      value
    );


  const months =
    "Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık";


  const patterns = [

    new RegExp(

      `(\\d{1,2})\\s+(${months})` +
      `(?:\\s+(20\\d{2}))?` +
      `(?:[^.]{0,40}?)(\\d{1,2}:\\d{2})?` +
      `(?:[^.]{0,70}?)` +
      `(?:sona\\s+erecek|sona\\s+erecektir|son\\s+başvuru|son\\s+basvuru)`,

      "i"

    ),

    new RegExp(

      `(?:son\\s+başvuru|son\\s+basvuru|son\\s+tarih)` +
      `(?:[^.]{0,30}?)` +
      `(\\d{1,2})\\s+(${months})` +
      `(?:\\s+(20\\d{2}))?` +
      `(?:[^.]{0,20}?)(\\d{1,2}:\\d{2})?`,

      "i"

    )

  ];


  for (
    const pattern
    of patterns
  ) {

    const match =
      text.match(
        pattern
      );


    if (
      !match
    ) {

      continue;

    }


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


  return "";

}


/* =========================================================
   İŞ GÜNÜ
   ========================================================= */

export function getBusinessDays(
  value
) {

  const match =
    cleanHtml(
      value
    )
      .match(
        /(\d+)\s*iş\s*günü/i
      );


  return match
    ? Number(
        match[1]
      )
    : null;

}


/* =========================================================
   AKSİYON GEREKİYOR MU?
   ========================================================= */

export function detectActionRequired(
  value
) {

  const text =
    normalize(
      value
    );


  return [

    "GEREKMEKTEDIR",

    "GEREKLIDIR",

    "BASVURU",

    "KAYIT ISLEMLERINI",

    "KAYIT YAPTIRMALARI",

    "BELGE",

    "SON TARIH",

    "SON BASVURU",

    "IS GUNU ICINDE",

    "BASVURULAR"

  ]
    .some(
      item =>
        text.includes(
          item
        )
    );

}


/* =========================================================
   ACİLİYET
   ========================================================= */

export function detectUrgency(
  value
) {

  const text =
    normalize(
      value
    );


  if (
    text.includes(
      "SON BASVURU"
    ) ||
    text.includes(
      "SON TARIH"
    ) ||
    text.includes(
      "SON GUN"
    )
  ) {

    return "high";

  }


  if (
    text.includes(
      "10 IS GUNU"
    ) ||
    text.includes(
      "IS GUNU ICINDE"
    ) ||
    text.includes(
      "KAYIT ISLEMLERINI"
    )
  ) {

    return "medium";

  }


  if (
    text.includes(
      "BASVURU"
    ) ||
    text.includes(
      "KAYIT"
    )
  ) {

    return "important";

  }


  return "normal";

}


/* =========================================================
   HABER KONUSU
   ========================================================= */

function detectTopic(
  title,
  category
) {

  const text =
    normalize(
      title
    );


  if (
    text.includes(
      "SEM"
    ) &&
    (
      text.includes(
        "KAYIT HAKKI KAZANAN"
      ) ||
      text.includes(
        "HAK KAZANAN"
      ) ||
      text.includes(
        "SONUC"
      )
    )
  ) {

    return "SEM sonuçları";

  }


  if (
    text.includes(
      "ANTRENOR"
    ) &&
    text.includes(
      "KURS"
    )
  ) {

    return "Antrenör kursu";

  }


  if (
    text.includes(
      "ANTRENOR"
    ) &&
    text.includes(
      "VIZE"
    )
  ) {

    return "Antrenör vize";

  }


  if (
    text.includes(
      "TOHM"
    )
  ) {

    return "TOHM";

  }


  if (
    text.includes(
      "MASTER"
    ) &&
    text.includes(
      "SAMPIYONA"
    )
  ) {

    return "Master şampiyonası";

  }


  if (
    text.includes(
      "BEBEK"
    ) &&
    (
      text.includes(
        "SEMINER"
      ) ||
      text.includes(
        "YUZME"
      )
    )
  ) {

    return "Bebek yüzme semineri";

  }


  return (
    category ||
    "announcement"
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
