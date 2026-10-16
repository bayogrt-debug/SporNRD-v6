/* =========================================================
   SporNRD
   worker/intelligence/factEngine.js

   Ortak Yapılandırılmış Gerçek Çıkarım Motoru

   Sürüm: 6.1.3

   AMAÇ
   ---------------------------------------------------------
   - Başlık + gövdeyi birlikte okumak
   - Şehir çıkarmak
   - Kademe çıkarmak
   - Gerçek etkinlik tarihini çıkarmak
   - Tarih aralığını başlangıç / bitiş olarak ayırmak
   - Deadline tarihini etkinlik tarihinden ayırmak
   - İş günü bilgisi çıkarmak
   - Türkçe büyük harfli ayları güvenli anlamak
   - Structured ISO tarih üretmek
   - Eski v6 alanlarını korumak

   KRİTİK 6.1.3
   ---------------------------------------------------------
   Aşağıdaki tarih biçimlerinin tamamı desteklenir:

   26-30 Ekim 2026
   26-30 EKİM 2026
   26-30 EKİM 2026 ANKARA
   26-30 EKİM ANKARA 2026
   26-30 EKİM SAMSUN 2026

   26 Ekim 2026
   26 EKİM SAMSUN 2026

   25 Ekim - 1 Kasım 2026
   25 EKİM - 1 KASIM SAMSUN 2026

   26.10.2026 - 30.10.2026
   26-30.10.2026

   TEMEL KURAL
   ---------------------------------------------------------
   Yayın tarihi olay tarihi değildir.

   source published date:
   → burada etkinlik tarihi olarak üretilmez.

   ========================================================= */


import {
  cleanHtml,
  normalize
} from "../utils/html.js";


/* =========================================================
   VERSION
   ========================================================= */

export const FACT_ENGINE_VERSION =
  "1.3";


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

  OCAK:
    1,

  SUBAT:
    2,

  MART:
    3,

  NISAN:
    4,

  MAYIS:
    5,

  HAZIRAN:
    6,

  TEMMUZ:
    7,

  AGUSTOS:
    8,

  EYLUL:
    9,

  EKIM:
    10,

  KASIM:
    11,

  ARALIK:
    12

};


const MONTH_LABELS = {

  1:
    "Ocak",

  2:
    "Şubat",

  3:
    "Mart",

  4:
    "Nisan",

  5:
    "Mayıs",

  6:
    "Haziran",

  7:
    "Temmuz",

  8:
    "Ağustos",

  9:
    "Eylül",

  10:
    "Ekim",

  11:
    "Kasım",

  12:
    "Aralık"

};


const MONTH_PATTERN =
  "OCAK|SUBAT|MART|NISAN|MAYIS|HAZIRAN|TEMMUZ|AGUSTOS|EYLUL|EKIM|KASIM|ARALIK";


/* =========================================================
   ŞEHİR REGEX

   Uzun şehirler önce değerlendirilir.
   ========================================================= */

const CITY_PATTERN =

  CITY_MAP

    .map(
      item =>
        item[0]
    )

    .sort(
      (a, b) =>
        b.length -
        a.length
    )

    .map(
      escapeRegex
    )

    .join(
      "|"
    );


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


  /* =======================================================
     KONUM
     ========================================================= */

  const location =
    getLocation(
      title,
      body
    );


  /* =======================================================
     ETKİNLİK TARİHİ

     Önce başlık.

     Çünkü resmi kaynak başlıklarında çoğunlukla gerçek
     organizasyon tarihi bulunuyor.
     ========================================================= */

  let eventDateInfo =
    getEventDateInfo(
      title,
      {
        ignoreDeadlineContext:
          true
      }
    );


  /*
    Başlıkta gerçek olay tarihi bulunmadıysa gövde.
  */

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


  /* =======================================================
     DEADLINE

     Etkinlik yılı bulunmuşsa yıl yazılmayan deadline için
     ileride kullanabileceğimiz yearHint gönderilir.

     Örn:
     Kurs 26-30 Ekim 2026
     Son başvuru 20 Ekim
     ========================================================= */

  const deadlineInfo =
    getDeadlineInfo(
      combined,
      {

        yearHint:

          eventDateInfo?.startYear

          ||

          eventDateInfo?.endYear

          ||

          null

      }
    );


  /* =======================================================
     DİĞER GERÇEKLER
     ========================================================= */

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


  /* =======================================================
     SONUÇ
     ========================================================= */

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
       DEADLINE
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
       ÖZEL İÇERİK SİNYALLERİ
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
   ESKİ EVENT DATE API
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


/* =========================================================
   ESKİ DATE RANGE API
   ========================================================= */

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
   ESKİ DEADLINE API
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

  value,

  {
    yearHint =
      null
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


  const fullCandidates =
    findDateCandidates(
      text
    );


  const candidates = [
    ...fullCandidates
  ];


  /*
    Örnek:

    Kurs:
    26-30 Ekim 2026

    Son başvuru:
    20 Ekim

    Etkinlik yılından deadline yılı çıkarılabilir.
  */

  if (
    Number.isInteger(
      Number(
        yearHint
      )
    )
  ) {

    candidates.push(

      ...findYearlessDeadlineCandidates(
        text,
        Number(
          yearHint
        ),
        fullCandidates
      )

    );

  }


  const ranked =
    candidates

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

      /*
        Ufak bir "başvuru" kelimesi tek başına
        etkinlik tarihini deadline yapmamalı.
      */

      .filter(
        item =>
          item.score >=
          4
      )

      .sort(
        (a, b) => {

          if (
            b.score !==
            a.score
          ) {

            return (
              b.score -
              a.score
            );

          }


          return (
            a.candidate.index -
            b.candidate.index
          );

        }
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
     Deadline tarih aralığıysa son gün kullanılır.
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


  /* =======================================================
     1.
     26.10.2026 - 30.10.2026
     ========================================================= */

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


  /* =======================================================
     2.
     26-30.10.2026
     ========================================================= */

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


  /* =======================================================
     3.
     26 EKIM 2026 - 30 EKIM 2026
     ========================================================= */

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


  /* =======================================================
     4.
     25 EKIM - 1 KASIM 2026

     25 EKIM - 1 KASIM SAMSUN 2026
     ========================================================= */

  collectDateMatches(

    candidates,

    text,

    new RegExp(

      `\\b(\\d{1,2})\\s+(${MONTH_PATTERN})` +

      `\\s*[-–—]\\s*` +

      `(\\d{1,2})\\s+(${MONTH_PATTERN})` +

      `(?:\\s+(?:${CITY_PATTERN}))?` +

      `\\s+(20\\d{2})\\b`,

      "g"

    ),

    match => {

      const startMonth =
        monthNumber(
          match[2]
        );


      const endMonth =
        monthNumber(
          match[4]
        );


      const endYear =
        Number(
          match[5]
        );


      /*
        Örnek:
        28 Aralık - 4 Ocak 2027

        başlangıç yılı:
        2026
      */

      const startYear =

        startMonth >
        endMonth

          ? endYear - 1

          : endYear;


      return createDateCandidate({

        match:
          match,

        startDay:
          Number(
            match[1]
          ),

        startMonth:
          startMonth,

        startYear:
          startYear,

        endDay:
          Number(
            match[3]
          ),

        endMonth:
          endMonth,

        endYear:
          endYear

      });

    }

  );


  /* =======================================================
     5.
     26-30 EKIM 2026

     26-30 EKIM ANKARA 2026

     26-30 EKIM SAMSUN 2026

     KRİTİK 6.1.3 DÜZELTMESİ
     ========================================================= */

  collectDateMatches(

    candidates,

    text,

    new RegExp(

      `\\b(\\d{1,2})\\s*[-–—]\\s*` +

      `(\\d{1,2})\\s+(${MONTH_PATTERN})` +

      `(?:\\s+(?:${CITY_PATTERN}))?` +

      `\\s+(20\\d{2})\\b`,

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


  /* =======================================================
     6.
     26 EKIM 2026

     26 EKIM SAMSUN 2026
     ========================================================= */

  collectDateMatches(

    candidates,

    text,

    new RegExp(

      `\\b(\\d{1,2})\\s+(${MONTH_PATTERN})` +

      `(?:\\s+(?:${CITY_PATTERN}))?` +

      `\\s+(20\\d{2})\\b`,

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


  /* =======================================================
     7.
     26.10.2026
     ========================================================= */

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


  /* =======================================================
     UZUN MATCH ÖNCE
     ========================================================= */

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


  /* =======================================================
     RANGE İÇİNDEKİ TEK TARİHLERİ AT
     ========================================================= */

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
      overlaps
    ) {

      continue;

    }


    output.push(
      candidate
    );

  }


  return output.sort(
    (a, b) =>
      a.index -
      b.index
  );

}


/* =========================================================
   YILI YAZILMAYAN DEADLINE

   Örnek:
   Etkinlik:
   26-30 Ekim 2026

   Metin:
   Son başvuru 20 Ekim.

   yearHint = 2026
   ========================================================= */

function findYearlessDeadlineCandidates(

  text,
  yearHint,
  existingCandidates = []

) {

  const candidates =
    [];


  if (
    !Number.isInteger(
      yearHint
    )
    ||
    yearHint < 2000
    ||
    yearHint > 2100
  ) {

    return candidates;

  }


  const regex =
    new RegExp(

      `\\b(\\d{1,2})\\s+(${MONTH_PATTERN})\\b`,

      "g"

    );


  let match;


  while (
    (
      match =
        regex.exec(
          text
        )
    ) !== null
  ) {

    const start =
      match.index;


    const end =
      match.index +
      match[0].length;


    /*
      Tam tarih veya tarih aralığının parçasıysa
      yeniden ekleme.
    */

    const overlaps =
      existingCandidates.some(
        candidate =>
          rangesOverlap(

            start,

            end,

            candidate.index,

            candidate.index +
            candidate.length

          )
      );


    if (
      overlaps
    ) {

      continue;

    }


    const candidate =
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
          yearHint

      });


    if (
      !candidate
    ) {

      continue;

    }


    /*
      Yılı olmayan tarihi yalnız deadline bağlamında
      kabul ediyoruz.
    */

    if (
      deadlineContextScore(
        text,
        candidate.index,
        candidate.length
      ) <
      4
    ) {

      continue;

    }


    candidates.push(
      candidate
    );

  }


  return candidates;

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


    /*
      Sonsuz regex döngüsü güvenliği.
    */

    if (
      match[0] ===
      ""
    ) {

      regex.lastIndex++;

    }

  }

}


/* =========================================================
   TARİH ADAYI OLUŞTUR
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


  const startDateIso =
    formatIsoDate(
      startDay,
      startMonth,
      startYear
    );


  const endDateIso =
    hasEnd

      ? formatIsoDate(
          endDay,
          endMonth,
          endYear
        )

      : "";


  /*
    Bozuk tarih aralığını kabul etme.
  */

  if (
    hasEnd
    &&
    compareIsoDates(
      startDateIso,
      endDateIso
    ) >
    0
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


    /* -----------------------------------------------------
       PARÇALAR
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       LEGACY TARİH
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       STRUCTURED ISO
       ----------------------------------------------------- */

    startDateIso:
      startDateIso,

    endDateIso:
      endDateIso,


    /* -----------------------------------------------------
       DISPLAY
       ----------------------------------------------------- */

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
        100
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
        100

      )

    );


  let score =
    0;


  /* -------------------------------------------------------
     Güçlü doğrudan sinyaller
     ------------------------------------------------------- */

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
      10;

  }


  /*
    Tarihten sonra "son başvuru" yazılması daha zayıf
    bir sinyaldir.
  */

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


  /* -------------------------------------------------------
     Başvuru / kayıt
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     Kapanış
     ------------------------------------------------------- */

  const afterHasClosing =
    containsAny(
      after,
      [

        "SONA ERECEK",

        "SONA ERECEKTIR",

        "SONA ERIYOR",

        "TAMAMLANACAK",

        "BITIYOR",

        "BITIS",

        "KAPANACAK",

        "KAPANIYOR"

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
        60
      ),

      Math.min(

        text.length,

        index +
        length +
        80

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

    !Number.isInteger(
      hour
    )

    ||

    !Number.isInteger(
      minute
    )

    ||

    hour < 0

    ||

    hour > 23

    ||

    minute < 0

    ||

    minute > 59

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

   EKİM
   → EKIM

   AĞUSTOS
   → AGUSTOS

   ŞUBAT
   → SUBAT
   ========================================================= */

function normalizeDateText(
  value
) {

  return String(
    value ??
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
      "İ",
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
        value ??
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

    year < 2000

    ||

    year > 2100

    ||

    month < 1

    ||

    month > 12

    ||

    day < 1

    ||

    day > 31

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
   TARİH KARŞILAŞTIR
   ========================================================= */

function compareIsoDates(
  first,
  second
) {

  const firstTime =
    isoDateTime(
      first
    );


  const secondTime =
    isoDateTime(
      second
    );


  if (
    firstTime ===
    null
    ||
    secondTime ===
    null
  ) {

    return 0;

  }


  return (
    firstTime -
    secondTime
  );

}


/* =========================================================
   ISO → TIME
   ========================================================= */

function isoDateTime(
  value
) {

  const match =
    String(
      value ||
      ""
    )
      .match(
        /^(\d{4})-(\d{2})-(\d{2})$/
      );


  if (
    !match
  ) {

    return null;

  }


  const year =
    Number(
      match[1]
    );


  const month =
    Number(
      match[2]
    );


  const day =
    Number(
      match[3]
    );


  if (
    !isValidDateParts(
      day,
      month,
      year
    )
  ) {

    return null;

  }


  return Date.UTC(
    year,
    month - 1,
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

    !day

    ||

    !month

    ||

    !year

    ||

    !MONTH_LABELS[
      month
    ]

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
    value ??
    ""
  )
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

}