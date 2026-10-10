/* =========================================================
   SporNRD
   worker/intelligence/factEngine.js

   Ortak Yapılandırılmış Gerçek Çıkarım Motoru
   Sürüm: 6.1.2

   Amaç:
   - Başlık + gövdeyi birlikte okumak
   - Şehir, kademe, tarih aralığı, deadline, iş günü çıkarmak
   - Etkinlik tarihi ile son başvuru tarihini ayırmak
   - Türkçe büyük harfli ayları (EKİM, AĞUSTOS vb.) güvenle anlamak
   - Eski v6 alanlarını korurken yeni startDate/endDate alanlarını üretmek
   ========================================================= */


import {
  cleanHtml,
  normalize
} from "../utils/html.js";


export const FACT_ENGINE_VERSION =
  "1.2";


/* =========================================================
   ŞEHİRLER
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
   AYLAR
   ========================================================= */

const MONTHS = {

  OCAK: 1,
  SUBAT: 2,
  MART: 3,
  NISAN: 4,
  MAYIS: 5,
  HAZIRAN: 6,
  TEMMUZ: 7,
  AGUSTOS: 8,
  EYLUL: 9,
  EKIM: 10,
  KASIM: 11,
  ARALIK: 12

};


const MONTH_LABELS = {

  1: "Ocak",
  2: "Şubat",
  3: "Mart",
  4: "Nisan",
  5: "Mayıs",
  6: "Haziran",
  7: "Temmuz",
  8: "Ağustos",
  9: "Eylül",
  10: "Ekim",
  11: "Kasım",
  12: "Aralık"

};


const MONTH_PATTERN =
  "OCAK|SUBAT|MART|NISAN|MAYIS|HAZIRAN|TEMMUZ|AGUSTOS|EYLUL|EKIM|KASIM|ARALIK";


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


  /* -------------------------------------------------------
     Önce deadline bulunur.

     Böylece:
     "Son başvuru 20 Ekim"

     etkinlik tarihi sanılmaz.
     ------------------------------------------------------- */

  const deadlineInfo =
    getDeadlineInfo(
      combined
    );


  /* -------------------------------------------------------
     Etkinlik tarihi önce başlıktan aranır.

     Örnek:
     3. Kademe ... 26-30 Ekim 2026 Ankara
     ------------------------------------------------------- */

  let eventDateInfo =
    getEventDateInfo(
      title,
      {
        ignoreDeadlineContext:
          true
      }
    );


  /* -------------------------------------------------------
     Başlıkta yoksa gövde
     ------------------------------------------------------- */

  if (
    !eventDateInfo
  ) {

    eventDateInfo =
      getEventDateInfo(
        body,
        {
          ignoreDeadlineContext:
            true
        }
      );

  }


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
       MOTOR
       ----------------------------------------------------- */

    factEngineVersion:
      FACT_ENGINE_VERSION,


    /* -----------------------------------------------------
       KAYNAK
       ----------------------------------------------------- */

    sport:
      "Yüzme",

    organization:
      "Türkiye Yüzme Federasyonu",


    /* -----------------------------------------------------
       SINIFLANDIRMA
       ----------------------------------------------------- */

    category:
      category,

    audience:
      audience,


    /* -----------------------------------------------------
       KONUM
       ----------------------------------------------------- */

    location:
      location,

    city:
      location ===
      "Türkiye"
        ? ""
        : location,

    country:
      "Türkiye",


    /* -----------------------------------------------------
       KADEME
       ----------------------------------------------------- */

    grade:
      grade,


    /* -----------------------------------------------------
       ETKİNLİK TARİHİ

       Eski ve yeni alanlar beraber tutuluyor.
       ----------------------------------------------------- */

    startDate:
      eventDateInfo?.startDate ||
      "",

    endDate:
      eventDateInfo?.endDate ||
      "",

    startDateIso:
      eventDateInfo?.startDateIso ||
      "",

    endDateIso:
      eventDateInfo?.endDateIso ||
      "",

    eventDate:
      eventDateInfo?.display ||
      "",

    dateRange:
      eventDateInfo?.display ||
      "",

    eventDatePrecision:
      eventDateInfo?.precision ||
      "unknown",


    /* -----------------------------------------------------
       SON BAŞVURU / KAYIT
       ----------------------------------------------------- */

    deadlineText:
      deadlineInfo?.display ||
      "",

    registrationDeadline:
      deadlineInfo?.date ||
      "",

    applicationDeadline:
      deadlineInfo?.date ||
      "",

    deadlineIso:
      deadlineInfo?.dateIso ||
      "",

    deadlineTime:
      deadlineInfo?.time ||
      "",


    /* -----------------------------------------------------
       DİĞER
       ----------------------------------------------------- */

    businessDays:
      businessDays,

    actionRequired:
      actionRequired,

    urgency:
      urgency,

    topic:
      topic,


    /* -----------------------------------------------------
       ÖZEL HABER TÜRLERİ
       ----------------------------------------------------- */

    isSem:
      normalizedTitle.includes(
        "SEM"
      ),


    isSemResult:

      normalizedTitle.includes(
        "SEM"
      )

      &&

      (

        normalizedTitle.includes(
          "KAYIT HAKKI"
        )

        ||

        normalizedTitle.includes(
          "HAK KAZANAN"
        )

        ||

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
      )

      &&

      normalizedTitle.includes(
        "KURS"
      ),


    isCoachVisa:

      normalizedTitle.includes(
        "ANTRENOR"
      )

      &&

      normalizedTitle.includes(
        "VIZE"
      ),


    isBabySwimming:

      normalizedTitle.includes(
        "BEBEK"
      )

      &&

      (

        normalizedTitle.includes(
          "YUZME"
        )

        ||

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
      containsWholeWord(
        titleText,
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

    if (
      containsWholeWord(
        bodyText,
        key
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

  const text =
    normalizeDateText(
      title
    );


  const match =

    text.match(
      /(\d+)\.\s*KADEME\b/i
    )

    ||

    text.match(
      /\b(\d+)\s*KADEME\b/i
    );


  return match
    ? match[1]
    : "";

}


/* =========================================================
   ETKİNLİK TARİHİ
   ESKİ API KORUNUYOR
   ========================================================= */

export function getEventDate(
  value
) {

  return (

    getEventDateInfo(
      value,
      {
        ignoreDeadlineContext:
          true
      }
    )?.display

    ||

    ""

  );

}


export function getDateRange(
  value
) {

  return getEventDate(
    value
  );

}


/* =========================================================
   YAPILANDIRILMIŞ ETKİNLİK TARİHİ
   ========================================================= */

export function getEventDateInfo(

  value,

  {
    ignoreDeadlineContext =
      true
  } = {}

) {

  const text =
    normalizeDateText(
      cleanHtml(
        value
      )
    );


  if (
    !text
  ) {

    return null;

  }


  const candidates =
    findDateCandidates(
      text
    );


  for (
    const candidate
    of candidates
  ) {

    if (

      ignoreDeadlineContext

      &&

      isDeadlineContext(
        text,
        candidate.index,
        candidate.length
      )

    ) {

      continue;

    }


    return candidate;

  }


  return null;

}


/* =========================================================
   DEADLINE
   ESKİ API KORUNUYOR
   ========================================================= */

export function getDeadline(
  value
) {

  return (

    getDeadlineInfo(
      value
    )?.display

    ||

    ""

  );

}


/* =========================================================
   YAPILANDIRILMIŞ DEADLINE
   ========================================================= */

export function getDeadlineInfo(
  value
) {

  const text =
    normalizeDateText(
      cleanHtml(
        value
      )
    );


  if (
    !text
  ) {

    return null;

  }


  const ranked =
    findDateCandidates(
      text
    )

      .map(
        candidate => ({

          candidate:
            candidate,

          score:
            deadlineContextScore(
              text,
              candidate.index,
              candidate.length
            )

        })
      )

      .filter(
        item =>
          item.score >
          0
      )

      .sort(
        (a, b) =>
          b.score -
          a.score
      );


  if (
    !ranked.length
  ) {

    return null;

  }


  const candidate =
    ranked[0]
      .candidate;


  /* -------------------------------------------------------
     Deadline bir tarih aralığıysa son tarih seçilir.
     ------------------------------------------------------- */

  const selected =
    candidate.endDate

      ? {

          day:
            candidate.endDay,

          month:
            candidate.endMonth,

          year:
            candidate.endYear,

          date:
            candidate.endDate,

          dateIso:
            candidate.endDateIso

        }

      : {

          day:
            candidate.startDay,

          month:
            candidate.startMonth,

          year:
            candidate.startYear,

          date:
            candidate.startDate,

          dateIso:
            candidate.startDateIso

        };


  const time =
    findNearbyTime(
      text,
      candidate.index,
      candidate.length
    );


  const label =
    formatHumanDate({

      day:
        selected.day,

      month:
        selected.month,

      year:
        selected.year

    });


  return {

    date:
      selected.date ||
      "",

    dateIso:
      selected.dateIso ||
      "",

    time:
      time,

    display:
      [
        label,
        time
      ]
        .filter(
          Boolean
        )
        .join(
          " "
        )

  };

}


/* =========================================================
   TARİH ADAYLARI
   ========================================================= */

function findDateCandidates(
  text
) {

  const candidates =
    [];


  /* -------------------------------------------------------
     26.10.2026 - 30.10.2026
     ------------------------------------------------------- */

  collectDateMatches(

    candidates,

    text,

    /\b(\d{1,2})[./](\d{1,2})[./](20\d{2})\s*[-–—]\s*(\d{1,2})[./](\d{1,2})[./](20\d{2})\b/g,

    match =>
      createDateCandidate({

        match:
          match,

        startDay:
          Number(
            match[1]
          ),

        startMonth:
          Number(
            match[2]
          ),

        startYear:
          Number(
            match[3]
          ),

        endDay:
          Number(
            match[4]
          ),

        endMonth:
          Number(
            match[5]
          ),

        endYear:
          Number(
            match[6]
          )

      })

  );


  /* -------------------------------------------------------
     26-30.10.2026
     ------------------------------------------------------- */

  collectDateMatches(

    candidates,

    text,

    /\b(\d{1,2})\s*[-–—]\s*(\d{1,2})[./](\d{1,2})[./](20\d{2})\b/g,

    match =>
      createDateCandidate({

        match:
          match,

        startDay:
          Number(
            match[1]
          ),

        startMonth:
          Number(
            match[3]
          ),

        startYear:
          Number(
            match[4]
          ),

        endDay:
          Number(
            match[2]
          ),

        endMonth:
          Number(
            match[3]
          ),

        endYear:
          Number(
            match[4]
          )

      })

  );


  /* -------------------------------------------------------
     26 EKIM 2026 - 30 EKIM 2026
     ------------------------------------------------------- */

  collectDateMatches(

    candidates,

    text,

    new RegExp(

      `\\b(\\d{1,2})\\s+(${MONTH_PATTERN})\\s+(20\\d{2})` +
      `\\s*[-–—]\\s*` +
      `(\\d{1,2})\\s+(${MONTH_PATTERN})\\s+(20\\d{2})\\b`,

      "g"

    ),

    match =>
      createDateCandidate({

        match:
          match,

        startDay:
          Number(
            match[1]
          ),

        startMonth:
          monthNumber(
            match[2]
          ),

        startYear:
          Number(
            match[3]
          ),

        endDay:
          Number(
            match[4]
          ),

        endMonth:
          monthNumber(
            match[5]
          ),

        endYear:
          Number(
            match[6]
          )

      })

  );


  /* -------------------------------------------------------
     25 EKIM - 1 KASIM 2026
     ------------------------------------------------------- */

  collectDateMatches(

    candidates,

    text,

    new RegExp(

      `\\b(\\d{1,2})\\s+(${MONTH_PATTERN})` +
      `\\s*[-–—]\\s*` +
      `(\\d{1,2})\\s+(${MONTH_PATTERN})\\s+(20\\d{2})\\b`,

      "g"

    ),

    match =>
      createDateCandidate({

        match:
          match,

        startDay:
          Number(
            match[1]
          ),

        startMonth:
          monthNumber(
            match[2]
          ),

        startYear:
          Number(
            match[5]
          ),

        endDay:
          Number(
            match[3]
          ),

        endMonth:
          monthNumber(
            match[4]
          ),

        endYear:
          Number(
            match[5]
          )

      })

  );


  /* -------------------------------------------------------
     26-30 EKIM 2026
     ------------------------------------------------------- */

  collectDateMatches(

    candidates,

    text,

    new RegExp(

      `\\b(\\d{1,2})\\s*[-–—]\\s*(\\d{1,2})\\s+(${MONTH_PATTERN})\\s+(20\\d{2})\\b`,

      "g"

    ),

    match =>
      createDateCandidate({

        match:
          match,

        startDay:
          Number(
            match[1]
          ),

        startMonth:
          monthNumber(
            match[3]
          ),

        startYear:
          Number(
            match[4]
          ),

        endDay:
          Number(
            match[2]
          ),

        endMonth:
          monthNumber(
            match[3]
          ),

        endYear:
          Number(
            match[4]
          )

      })

  );


  /* -------------------------------------------------------
     26 EKIM 2026
     ------------------------------------------------------- */

  collectDateMatches(

    candidates,

    text,

    new RegExp(

      `\\b(\\d{1,2})\\s+(${MONTH_PATTERN})\\s+(20\\d{2})\\b`,

      "g"

    ),

    match =>
      createDateCandidate({

        match:
          match,

        startDay:
          Number(
            match[1]
          ),

        startMonth:
          monthNumber(
            match[2]
          ),

        startYear:
          Number(
            match[3]
          )

      })

  );


  /* -------------------------------------------------------
     26.10.2026
     ------------------------------------------------------- */

  collectDateMatches(

    candidates,

    text,

    /\b(\d{1,2})[./](\d{1,2})[./](20\d{2})\b/g,

    match =>
      createDateCandidate({

        match:
          match,

        startDay:
          Number(
            match[1]
          ),

        startMonth:
          Number(
            match[2]
          ),

        startYear:
          Number(
            match[3]
          )

      })

  );


  /* -------------------------------------------------------
     Uzun tarih aralığı tek tarihten önce gelsin.
     ------------------------------------------------------- */

  candidates.sort(
    (a, b) => {

      if (
        a.index !==
        b.index
      ) {

        return (
          a.index -
          b.index
        );

      }


      return (
        b.length -
        a.length
      );

    }
  );


  /* -------------------------------------------------------
     Bir aralığın içinde tekrar bulunan tek tarihi çıkar.
     ------------------------------------------------------- */

  const output =
    [];


  for (
    const candidate
    of candidates
  ) {

    const overlaps =
      output.some(
        item =>
          rangesOverlap(

            candidate.index,

            candidate.index +
            candidate.length,

            item.index,

            item.index +
            item.length

          )
      );


    if (
      !overlaps
    ) {

      output.push(
        candidate
      );

    }

  }


  return output.sort(
    (a, b) =>
      a.index -
      b.index
  );

}


/* =========================================================
   TARİH MATCH TOPLA
   ========================================================= */

function collectDateMatches(

  output,
  text,
  regex,
  mapper

) {

  let match;


  while (
    (
      match =
        regex.exec(
          text
        )
    ) !== null
  ) {

    const candidate =
      mapper(
        match
      );


    if (
      candidate
    ) {

      output.push(
        candidate
      );

    }


    if (
      match[0] ===
      ""
    ) {

      regex.lastIndex++;

    }

  }

}


/* =========================================================
   TARİH NESNESİ
   ========================================================= */

function createDateCandidate({

  match,

  startDay,
  startMonth,
  startYear,

  endDay = null,
  endMonth = null,
  endYear = null

}) {

  if (
    !isValidDateParts(
      startDay,
      startMonth,
      startYear
    )
  ) {

    return null;

  }


  const hasEnd =
    endDay !==
    null;


  if (

    hasEnd

    &&

    !isValidDateParts(
      endDay,
      endMonth,
      endYear
    )

  ) {

    return null;

  }


  return {

    index:
      match.index,

    length:
      match[0].length,

    raw:
      match[0],


    startDay:
      startDay,

    startMonth:
      startMonth,

    startYear:
      startYear,


    endDay:
      hasEnd
        ? endDay
        : null,

    endMonth:
      hasEnd
        ? endMonth
        : null,

    endYear:
      hasEnd
        ? endYear
        : null,


    startDate:
      formatNumericDate(
        startDay,
        startMonth,
        startYear
      ),

    endDate:
      hasEnd

        ? formatNumericDate(
            endDay,
            endMonth,
            endYear
          )

        : "",


    startDateIso:
      formatIsoDate(
        startDay,
        startMonth,
        startYear
      ),

    endDateIso:
      hasEnd

        ? formatIsoDate(
            endDay,
            endMonth,
            endYear
          )

        : "",


    display:
      hasEnd

        ? formatHumanRange({

            startDay:
              startDay,

            startMonth:
              startMonth,

            startYear:
              startYear,

            endDay:
              endDay,

            endMonth:
              endMonth,

            endYear:
              endYear

          })

        : formatHumanDate({

            day:
              startDay,

            month:
              startMonth,

            year:
              startYear

          }),


    precision:
      hasEnd
        ? "range"
        : "day"

  };

}


/* =========================================================
   DEADLINE BAĞLAMI
   ========================================================= */

function isDeadlineContext(

  text,
  index,
  length

) {

  return (

    deadlineContextScore(
      text,
      index,
      length
    )

    >=

    4

  );

}


/* =========================================================
   DEADLINE BAĞLAM PUANI

   Böylece:

   26-30 Ekim 2026 Ankara.
   Başvurular 20 Ekim 2026 tarihinde sona erecek.

   örneğinde 26-30 Ekim etkinlik tarihi,
   20 Ekim ise son başvuru olur.
   ========================================================= */

function deadlineContextScore(

  text,
  index,
  length

) {

  const before =
    text.slice(

      Math.max(
        0,
        index -
        90
      ),

      index

    );


  const after =
    text.slice(

      index +
      length,

      Math.min(

        text.length,

        index +
        length +
        90

      )

    );


  let score =
    0;


  const directSignals = [

    "SON BASVURU",

    "SON TARIH",

    "SON KAYIT",

    "KAYIT ICIN SON",

    "BASVURU ICIN SON",

    "BASVURU SON GUN",

    "KAYIT SON GUN",

    "SON GUN"

  ];


  if (
    directSignals.some(
      signal =>
        before.includes(
          signal
        )
    )
  ) {

    score +=
      8;

  }


  if (
    directSignals.some(
      signal =>
        after.includes(
          signal
        )
    )
  ) {

    score +=
      3;

  }


  const beforeHasApplication =
    containsAny(
      before,
      [

        "BASVURU",

        "BASVURULAR",

        "KAYIT",

        "KAYITLAR"

      ]
    );


  const afterHasClosing =
    containsAny(
      after,
      [

        "SONA ERECEK",

        "SONA ERECEKTIR",

        "SONA ERIYOR",

        "TAMAMLANACAK",

        "BITIYOR",

        "BITIS"

      ]
    );


  if (
    beforeHasApplication
  ) {

    score +=
      5;

  }


  if (
    afterHasClosing
  ) {

    score +=
      5;

  }


  if (
    beforeHasApplication &&
    afterHasClosing
  ) {

    score +=
      6;

  }


  return score;

}


/* =========================================================
   DEADLINE SAATİ
   ========================================================= */

function findNearbyTime(

  text,
  index,
  length

) {

  const context =
    text.slice(

      Math.max(
        0,
        index -
        50
      ),

      Math.min(

        text.length,

        index +
        length +
        70

      )

    );


  const match =
    context.match(
      /(?:SAAT\s*)?(\d{1,2}:\d{2})\b/
    );


  if (
    !match
  ) {

    return "";

  }


  const [
    hourText,
    minuteText
  ] =
    match[1]
      .split(
        ":"
      );


  const hour =
    Number(
      hourText
    );


  const minute =
    Number(
      minuteText
    );


  if (

    hour <
    0

    ||

    hour >
    23

    ||

    minute <
    0

    ||

    minute >
    59

  ) {

    return "";

  }


  return (
    `${pad2(hour)}:${pad2(minute)}`
  );

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
    )

    ||

    text.includes(
      "SON TARIH"
    )

    ||

    text.includes(
      "SON GUN"
    )

  ) {

    return "high";

  }


  if (

    text.includes(
      "10 IS GUNU"
    )

    ||

    text.includes(
      "IS GUNU ICINDE"
    )

    ||

    text.includes(
      "KAYIT ISLEMLERINI"
    )

  ) {

    return "medium";

  }


  if (

    text.includes(
      "BASVURU"
    )

    ||

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
    )

    &&

    (

      text.includes(
        "KAYIT HAKKI KAZANAN"
      )

      ||

      text.includes(
        "HAK KAZANAN"
      )

      ||

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
    )

    &&

    text.includes(
      "KURS"
    )

  ) {

    return "Antrenör kursu";

  }


  if (

    text.includes(
      "ANTRENOR"
    )

    &&

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
    )

    &&

    text.includes(
      "SAMPIYONA"
    )

  ) {

    return "Master şampiyonası";

  }


  if (

    text.includes(
      "BEBEK"
    )

    &&

    (

      text.includes(
        "SEMINER"
      )

      ||

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
   TARİH NORMALİZASYONU

   KRİTİK:

   /Ekim/i

   Türkçe "EKİM" için her durumda güvenilir değildir.

   Bu nedenle:

   EKİM    → EKIM
   ŞUBAT   → SUBAT
   AĞUSTOS → AGUSTOS
   ========================================================= */

function normalizeDateText(
  value
) {

  return String(
    value ||
    ""
  )

    .replace(
      /\u00A0/g,
      " "
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
    )

    .replace(
      /\s+/g,
      " "
    )

    .trim();

}


/* =========================================================
   AY NUMARASI
   ========================================================= */

function monthNumber(
  value
) {

  return (

    MONTHS[

      String(
        value ||
        ""
      )
        .trim()
        .toUpperCase()

    ]

    ||

    0

  );

}


/* =========================================================
   TARİH DOĞRULAMA
   ========================================================= */

function isValidDateParts(

  day,
  month,
  year

) {

  if (

    !Number.isInteger(
      day
    )

    ||

    !Number.isInteger(
      month
    )

    ||

    !Number.isInteger(
      year
    )

    ||

    year <
    2000

    ||

    year >
    2100

    ||

    month <
    1

    ||

    month >
    12

    ||

    day <
    1

    ||

    day >
    31

  ) {

    return false;

  }


  const date =
    new Date(

      Date.UTC(

        year,

        month -
        1,

        day

      )

    );


  return (

    date.getUTCFullYear() ===
    year

    &&

    date.getUTCMonth() ===
    month -
    1

    &&

    date.getUTCDate() ===
    day

  );

}


/* =========================================================
   DD.MM.YYYY
   ========================================================= */

function formatNumericDate(

  day,
  month,
  year

) {

  return (

    `${pad2(day)}.` +

    `${pad2(month)}.` +

    `${year}`

  );

}


/* =========================================================
   YYYY-MM-DD
   ========================================================= */

function formatIsoDate(

  day,
  month,
  year

) {

  return (

    `${year}-` +

    `${pad2(month)}-` +

    `${pad2(day)}`

  );

}


/* =========================================================
   İNSAN DOSTU TARİH
   ========================================================= */

function formatHumanDate({

  day,
  month,
  year

}) {

  if (

    !day ||
    !month ||
    !year

  ) {

    return "";

  }


  return (

    `${day} ` +

    `${MONTH_LABELS[month]} ` +

    `${year}`

  );

}


/* =========================================================
   İNSAN DOSTU TARİH ARALIĞI
   ========================================================= */

function formatHumanRange({

  startDay,
  startMonth,
  startYear,

  endDay,
  endMonth,
  endYear

}) {

  if (

    startYear ===
    endYear

    &&

    startMonth ===
    endMonth

  ) {

    return (

      `${startDay}–${endDay} ` +

      `${MONTH_LABELS[startMonth]} ` +

      `${startYear}`

    );

  }


  if (
    startYear ===
    endYear
  ) {

    return (

      `${startDay} ${MONTH_LABELS[startMonth]}` +

      `–${endDay} ${MONTH_LABELS[endMonth]} ` +

      `${startYear}`

    );

  }


  return (

    `${startDay} ${MONTH_LABELS[startMonth]} ${startYear}` +

    `–${endDay} ${MONTH_LABELS[endMonth]} ${endYear}`

  );

}


/* =========================================================
   KELİME KONTROLÜ
   ========================================================= */

function containsWholeWord(
  text,
  value
) {

  const escaped =
    escapeRegex(
      value
    );


  return new RegExp(

    `(?:^|[^A-Z0-9])${escaped}(?:[^A-Z0-9]|$)`,

    "i"

  ).test(
    text
  );

}


/* =========================================================
   ANY
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
   ARALIK ÇAKIŞMASI
   ========================================================= */

function rangesOverlap(

  startA,
  endA,

  startB,
  endB

) {

  return (

    startA <
    endB

    &&

    startB <
    endA

  );

}


/* =========================================================
   PAD
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
