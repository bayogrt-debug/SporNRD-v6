/* =========================================================
   SporNRD
   worker/intelligence/temporalEngine.js

   SporNRD Zaman / Temporal Motoru

   Sürüm: 6.1.0

   AMAÇ
   ---------------------------------------------------------
   İçerikteki gerçek tarihleri BUGÜN ile karşılaştırarak:

   - past
   - present
   - future
   - unknown

   kararını üretmek.

   AYRICA:
   ---------------------------------------------------------
   - Etkinlik başladı mı?
   - Bitti mi?
   - Son başvuru geçti mi?
   - İçerik bugün mü yayımlandı?
   - Yayın yeni mi, eski mi?
   - Kullanıcı hâlâ işlem yapabilir mi?

   sorularını cevaplamak.

   TEMEL GÜVEN KURALI
   ---------------------------------------------------------
   Yayın tarihi olay tarihi değildir.

   Eğer gerçek etkinlik / başlangıç / bitiş tarihi
   yoksa yayın tarihi yalnızca "güncellik" için kullanılır.

   Örnek:

   publishedAt = 10.10.2026
   eventDate   = ""

   → olay bugün oldu DENMEZ.
   → "bugün yayımlanan yeni duyuru" denebilir.

   TÜRKİYE SAATİ
   ---------------------------------------------------------
   Europe/Istanbul
   ========================================================= */


/* =========================================================
   VERSION
   ========================================================= */

export const TEMPORAL_VERSION =
  "1.0";


/* =========================================================
   TIMEZONE
   ========================================================= */

export const TEMPORAL_TIMEZONE =
  "Europe/Istanbul";


/* =========================================================
   ZAMAN DURUMLARI
   ========================================================= */

export const TIME_STATES = {

  past:
    "past",

  present:
    "present",

  future:
    "future",

  unknown:
    "unknown"

};


/* =========================================================
   EVENT DURUMLARI
   ========================================================= */

export const EVENT_STATES = {

  upcoming:
    "upcoming",

  ongoing:
    "ongoing",

  completed:
    "completed",

  unknown:
    "unknown"

};


/* =========================================================
   ACTION DURUMLARI
   ========================================================= */

export const ACTION_STATES = {

  open:
    "open",

  closing_today:
    "closing_today",

  closed:
    "closed",

  possible_unverified:
    "possible_unverified",

  not_applicable:
    "not_applicable",

  unknown:
    "unknown"

};


/* =========================================================
   ANA ANALİZ
   ========================================================= */

export function analyzeTemporal(
  post,
  options = {}
) {

  if (
    !post ||
    typeof post !==
    "object"
  ) {

    return createFallbackTemporal();

  }


  /* -------------------------------------------------------
     Bugünün tarihi

     Testlerde options.now kullanılabilir.
     Gerçek sistemde otomatik olarak İstanbul tarihidir.
     ------------------------------------------------------- */

  const today =
    resolveToday(
      options.now
    );


  const details =
    isPlainObject(
      post.details
    )
      ? post.details
      : {};


  const lifecycle =
    isPlainObject(
      post.lifecycle
    )
      ? post.lifecycle
      : {};


  const source =
    isPlainObject(
      post.source
    )
      ? post.source
      : {};


  const facts =
    isPlainObject(
      post.facts
    )
      ? post.facts
      : {};


  /* =======================================================
     TARİHLERİ TOPLA
     ========================================================= */

  let startDate =
    firstDate(

      details.startDate,

      lifecycle.startsAt,

      facts.startDate

    );


  let endDate =
    firstDate(

      details.endDate,

      lifecycle.endsAt,

      facts.endDate

    );


  const deadlineAt =
    firstDate(

      details.registrationDeadline,

      details.applicationDeadline,

      details.deadline,

      lifecycle.expiresAt,

      facts.registrationDeadline,

      facts.applicationDeadline,

      facts.deadline

    );


  const publishedAt =
    firstDate(

      source.publishedAt,

      lifecycle.publishedAt,

      post.date,

      facts.publishedAt

    );


  /* =======================================================
     EVENT DATE / DATE RANGE

     Eski kaynaklarda:

     facts.eventDate
     facts.dateRange

     şeklinde gelebilir.
     ========================================================= */

  const eventDateRaw =
    firstString(

      details.eventDate,

      facts.eventDate,

      facts.dateRange,

      post.eventDate

    );


  let eventDate =
    "";


  if (
    eventDateRaw
  ) {

    const range =
      parseDateRange(
        eventDateRaw
      );


    if (
      range
    ) {

      if (
        !startDate
      ) {

        startDate =
          range.startDate;

      }


      if (
        !endDate
      ) {

        endDate =
          range.endDate;

      }

    }

    else {

      eventDate =
        parseDateOnly(
          eventDateRaw
        );

    }

  }


  /* =======================================================
     KARAR DEĞİŞKENLERİ
     ========================================================= */

  let state =
    TIME_STATES.unknown;


  let basis =
    publishedAt
      ? "published_at"
      : "none";


  let eventStatus =
    normalizeEventStatus(
      post.eventStatus
    );


  let confidenceScore =
    30;


  const reasons =
    [];


  /* =======================================================
     1. BAŞLANGIÇ + BİTİŞ TARİHİ

     En güvenilir zaman modeli.
     ========================================================= */

  if (
    startDate &&
    endDate
  ) {

    basis =
      "date_range";


    const startDiff =
      dayDifference(
        startDate,
        today
      );


    const endDiff =
      dayDifference(
        endDate,
        today
      );


    if (
      startDiff >
      0
    ) {

      state =
        TIME_STATES.future;


      eventStatus =
        EVENT_STATES.upcoming;


      reasons.push(
        "Başlangıç tarihi bugünden ileride."
      );

    }

    else if (
      endDiff <
      0
    ) {

      state =
        TIME_STATES.past;


      eventStatus =
        EVENT_STATES.completed;


      reasons.push(
        "Bitiş tarihi geçmiş."
      );

    }

    else {

      state =
        TIME_STATES.present;


      eventStatus =
        EVENT_STATES.ongoing;


      reasons.push(
        "Bugün başlangıç ve bitiş tarihleri arasında."
      );

    }


    confidenceScore =
      100;

  }


  /* =======================================================
     2. TEK ETKİNLİK TARİHİ

     Örneğin:
     18 Ekim 2026 müsabakası
     ========================================================= */

  else if (
    eventDate
  ) {

    basis =
      "event_date";


    const difference =
      dayDifference(
        eventDate,
        today
      );


    if (
      difference >
      0
    ) {

      state =
        TIME_STATES.future;


      eventStatus =
        EVENT_STATES.upcoming;


      reasons.push(
        "Etkinlik tarihi bugünden ileride."
      );

    }

    else if (
      difference <
      0
    ) {

      state =
        TIME_STATES.past;


      eventStatus =
        EVENT_STATES.completed;


      reasons.push(
        "Etkinlik tarihi geçmiş."
      );

    }

    else {

      state =
        TIME_STATES.present;


      eventStatus =
        EVENT_STATES.ongoing;


      reasons.push(
        "Etkinlik tarihi bugün."
      );

    }


    confidenceScore =
      100;

  }


  /* =======================================================
     3. SADECE BAŞLANGIÇ TARİHİ

     Başlangıç geçmişse programın kesin olarak
     bittiğini söylemeyiz.

     Sadece başlangıç tarihinin geçtiğini biliriz.
     ========================================================= */

  else if (
    startDate
  ) {

    basis =
      "start_date";


    const difference =
      dayDifference(
        startDate,
        today
      );


    if (
      difference >
      0
    ) {

      state =
        TIME_STATES.future;


      eventStatus =
        EVENT_STATES.upcoming;


      reasons.push(
        "Belirtilen başlangıç tarihi bugünden ileride."
      );


      confidenceScore =
        95;

    }

    else if (
      difference ===
      0
    ) {

      state =
        TIME_STATES.present;


      /*
        Başladı diyebiliriz;
        fakat ne zaman biteceğini bilmiyoruz.
      */

      if (
        eventStatus ===
        EVENT_STATES.unknown
      ) {

        eventStatus =
          EVENT_STATES.ongoing;

      }


      reasons.push(
        "Belirtilen başlangıç tarihi bugün."
      );


      confidenceScore =
        90;

    }

    else {

      /*
        Başlangıç geçmiş.

        Eğer Content Intent zaten result diyorsa
        tamamlanmış olduğunu biliyoruz.

        Aksi halde kurs/kampanya gibi uzun süreli
        bir şey hâlâ devam ediyor olabilir.
      */

      if (
        normalizeId(
          post.contentIntent
        ) ===
        "result"
        ||
        eventStatus ===
        EVENT_STATES.completed
      ) {

        state =
          TIME_STATES.past;


        eventStatus =
          EVENT_STATES.completed;


        reasons.push(
          "Başlangıç tarihi geçmiş ve içerik sonuç/tamamlanmış olay bildiriyor."
        );


        confidenceScore =
          95;

      }

      else {

        state =
          TIME_STATES.unknown;


        reasons.push(
          "Başlangıç tarihi geçmiş ancak bitiş tarihi bilinmiyor."
        );


        confidenceScore =
          65;

      }

    }

  }


  /* =======================================================
     4. CONTENT INTENT / SEMANTİK SONUÇ

     Tarih bulunmasa bile:

     "şampiyon oldu"
     "kazandı"
     "tamamlandı"

     gibi güçlü sonuç kararı varsa olay geçmiş kabul edilir.
     ========================================================= */

  else if (
    normalizeId(
      post.contentIntent
    ) ===
    "result"
    ||
    eventStatus ===
    EVENT_STATES.completed
  ) {

    state =
      TIME_STATES.past;


    basis =
      "semantic_result";


    eventStatus =
      EVENT_STATES.completed;


    reasons.push(
      "İçerik anlam analizi tamamlanmış sonuç bildiriyor."
    );


    confidenceScore =
      90;

  }


  /* =======================================================
     5. SADECE DEADLINE VAR

     Bu durumda olayın zamanı bilinmiyor.

     Ancak kullanıcının eylem süresi hakkında
     bilgi verebiliriz.
     ========================================================= */

  else if (
    deadlineAt
  ) {

    basis =
      "deadline";


    const difference =
      dayDifference(
        deadlineAt,
        today
      );


    if (
      difference >
      0
    ) {

      state =
        TIME_STATES.future;


      reasons.push(
        "Son başvuru/kayıt tarihi bugünden ileride."
      );


      confidenceScore =
        85;

    }

    else if (
      difference ===
      0
    ) {

      state =
        TIME_STATES.present;


      reasons.push(
        "Son başvuru/kayıt tarihi bugün."
      );


      confidenceScore =
        90;

    }

    else {

      state =
        TIME_STATES.past;


      reasons.push(
        "Son başvuru/kayıt tarihi geçmiş."
      );


      confidenceScore =
        95;

    }

  }


  /* =======================================================
     6. HİÇ OLAY TARİHİ YOK

     Yayın tarihi SADECE güncellik için kullanılır.

     Olayın geçmiş / bugün / gelecek olduğu uydurulmaz.
     ========================================================= */

  else if (
    publishedAt
  ) {

    state =
      TIME_STATES.unknown;


    basis =
      "published_at";


    reasons.push(
      "Olay tarihi bulunamadı; yayın tarihi yalnızca güncellik için kullanıldı."
    );


    confidenceScore =
      55;

  }


  /* =======================================================
     YAYIN GÜNCELLİĞİ
     ========================================================= */

  const freshness =
    calculateFreshness(
      publishedAt,
      today
    );


  const daysSincePublished =
    publishedAt

      ? Math.max(
          0,
          -dayDifference(
            publishedAt,
            today
          )
        )

      : null;


  /* =======================================================
     START / DEADLINE FARKLARI
     ========================================================= */

  const daysUntilStart =
    startDate

      ? dayDifference(
          startDate,
          today
        )

      : eventDate

        ? dayDifference(
            eventDate,
            today
          )

        : null;


  const daysUntilEnd =
    endDate

      ? dayDifference(
          endDate,
          today
        )

      : null;


  const daysUntilDeadline =
    deadlineAt

      ? dayDifference(
          deadlineAt,
          today
        )

      : null;


  /* =======================================================
     ACTION STATE
     ========================================================= */

  const actionState =
    determineActionState({

      post:
        post,

      deadlineAt:
        deadlineAt,

      today:
        today,

      state:
        state,

      eventStatus:
        eventStatus

    });


  /* =======================================================
     PERSONA LANGUAGE MODE
     ========================================================= */

  const languageMode =
    determineLanguageMode({

      state:
        state,

      basis:
        basis,

      freshness:
        freshness,

      eventStatus:
        eventStatus

    });


  return {

    version:
      TEMPORAL_VERSION,

    timezone:
      TEMPORAL_TIMEZONE,

    today:
      today,


    /* -----------------------------------------------------
       ANA ZAMAN KARARI
       ----------------------------------------------------- */

    state:
      state,

    basis:
      basis,

    eventStatus:
      eventStatus,

    languageMode:
      languageMode,


    /* -----------------------------------------------------
       TARİHLER
       ----------------------------------------------------- */

    startDate:
      startDate,

    endDate:
      endDate,

    eventDate:
      eventDate,

    deadlineAt:
      deadlineAt,

    publishedAt:
      publishedAt,


    /* -----------------------------------------------------
       SAYISAL FARKLAR
       ----------------------------------------------------- */

    daysUntilStart:
      daysUntilStart,

    daysUntilEnd:
      daysUntilEnd,

    daysUntilDeadline:
      daysUntilDeadline,

    daysSincePublished:
      daysSincePublished,


    /* -----------------------------------------------------
       GÜNCELLİK
       ----------------------------------------------------- */

    freshness:
      freshness,


    /* -----------------------------------------------------
       EYLEM
       ----------------------------------------------------- */

    actionState:
      actionState,


    /* -----------------------------------------------------
       GÜVEN
       ----------------------------------------------------- */

    confidenceScore:
      clamp(
        confidenceScore,
        0,
        100
      ),

    reasons:
      reasons,

    analyzedAt:
      new Date()
        .toISOString()

  };

}


/* =========================================================
   POSTA UYGULA
   ========================================================= */

export function applyTemporal(
  post,
  options = {}
) {

  if (
    !post ||
    typeof post !==
    "object"
  ) {

    return post;

  }


  const temporal =
    analyzeTemporal(
      post,
      options
    );


  let actionable =
    post.actionable ===
    true;


  /*
    Son başvuru kesin olarak geçmişse
    kullanıcıya artık "kayıt ol / başvur"
    dememeliyiz.
  */

  if (
    temporal.actionState ===
    ACTION_STATES.closed
  ) {

    actionable =
      false;

  }


  return {

    ...post,


    /* -----------------------------------------------------
       Ana temporal alan
       ----------------------------------------------------- */

    temporal:
      temporal,


    /* -----------------------------------------------------
       Mevcut sistemle uyumluluk

       eventStatus artık temporal motorun
       doğruladığı değer olur.
       ----------------------------------------------------- */

    eventStatus:
      temporal.eventStatus,


    /* -----------------------------------------------------
       Deadline geçmişse aksiyon kapatılır.
       ----------------------------------------------------- */

    actionable:
      actionable

  };

}


/* =========================================================
   ACTION STATE
   ========================================================= */

function determineActionState({

  post,
  deadlineAt,
  today,
  state,
  eventStatus

}) {

  if (
    deadlineAt
  ) {

    const difference =
      dayDifference(
        deadlineAt,
        today
      );


    if (
      difference <
      0
    ) {

      return ACTION_STATES.closed;

    }


    if (
      difference ===
      0
    ) {

      return ACTION_STATES.closing_today;

    }


    return ACTION_STATES.open;

  }


  /*
    Olay kesin olarak tamamlandıysa
    işlem yapılamaz.
  */

  if (
    eventStatus ===
    EVENT_STATES.completed
    ||
    state ===
    TIME_STATES.past
    &&
    normalizeId(
      post.contentIntent
    ) ===
    "result"
  ) {

    return ACTION_STATES.not_applicable;

  }


  /*
    Kaynak/action motoru işlem yapılabilir demiş,
    fakat açık deadline kanıtımız yok.

    "open" demiyoruz.
    "possible_unverified" diyoruz.
  */

  if (
    post.actionable ===
    true
  ) {

    return ACTION_STATES.possible_unverified;

  }


  return ACTION_STATES.not_applicable;

}


/* =========================================================
   PERSONA LANGUAGE MODE

   Persona motoru daha sonra bunu doğrudan kullanacak.
   ========================================================= */

function determineLanguageMode({

  state,
  basis,
  freshness,
  eventStatus

}) {

  if (
    state ===
    TIME_STATES.past
    ||
    eventStatus ===
    EVENT_STATES.completed
  ) {

    return "past";

  }


  if (
    state ===
    TIME_STATES.present
  ) {

    return "present";

  }


  if (
    state ===
    TIME_STATES.future
  ) {

    return "future";

  }


  /*
    Gerçek olay tarihi bulunamadı.

    Yayın tarihi üzerinden yalnızca
    güncellik dili kullanılır.
  */

  if (
    basis ===
    "published_at"
  ) {

    if (
      freshness ===
      "today"
    ) {

      return "published_today";

    }


    if (
      freshness ===
      "yesterday"
    ) {

      return "published_recent";

    }


    if (
      freshness ===
      "recent"
    ) {

      return "published_recent";

    }


    if (
      freshness ===
      "current"
    ) {

      return "published_current";

    }


    return "published_old";

  }


  return "neutral";

}


/* =========================================================
   YAYIN GÜNCELLİĞİ
   ========================================================= */

function calculateFreshness(
  publishedAt,
  today
) {

  if (
    !publishedAt
  ) {

    return "unknown";

  }


  const difference =
    dayDifference(
      publishedAt,
      today
    );


  /*
    Gelecek yayın tarihi normal değildir.
    Veri hatası olabilir.
  */

  if (
    difference >
    0
  ) {

    return "future_dated";

  }


  const age =
    Math.abs(
      difference
    );


  if (
    age ===
    0
  ) {

    return "today";

  }


  if (
    age ===
    1
  ) {

    return "yesterday";

  }


  if (
    age <=
    3
  ) {

    return "recent";

  }


  if (
    age <=
    7
  ) {

    return "current";

  }


  if (
    age <=
    30
  ) {

    return "older";

  }


  return "old";

}


/* =========================================================
   BUGÜNÜ ÇÖZ

   options.now:
   ---------------------------------------------------------
   Test için Date veya ISO string verilebilir.

   Normal kullanım:
   ---------------------------------------------------------
   İstanbul yerel tarihi alınır.
   ========================================================= */

function resolveToday(
  now
) {

  const date =
    now

      ? new Date(
          now
        )

      : new Date();


  const safeDate =
    Number.isNaN(
      date.getTime()
    )

      ? new Date()

      : date;


  try {

    const parts =
      new Intl.DateTimeFormat(

        "en-CA",

        {

          timeZone:
            TEMPORAL_TIMEZONE,

          year:
            "numeric",

          month:
            "2-digit",

          day:
            "2-digit"

        }

      )
        .formatToParts(
          safeDate
        );


    const map =
      {};


    for (
      const part
      of parts
    ) {

      if (
        part.type !==
        "literal"
      ) {

        map[
          part.type
        ] =
          part.value;

      }

    }


    if (
      map.year &&
      map.month &&
      map.day
    ) {

      return (
        `${map.year}-` +
        `${map.month}-` +
        `${map.day}`
      );

    }

  }

  catch {

    /* fallback aşağıda */

  }


  return safeDate
    .toISOString()
    .slice(
      0,
      10
    );

}


/* =========================================================
   TARİH FARKI

   target - today

   +5 → 5 gün sonra
   0  → bugün
   -5 → 5 gün önce
   ========================================================= */

function dayDifference(
  targetDate,
  today
) {

  const targetKey =
    dateToDayKey(
      targetDate
    );


  const todayKey =
    dateToDayKey(
      today
    );


  if (
    targetKey ===
    null
    ||
    todayKey ===
    null
  ) {

    return 0;

  }


  return (
    targetKey -
    todayKey
  );

}


/* =========================================================
   DATE → DAY KEY
   ========================================================= */

function dateToDayKey(
  value
) {

  const parsed =
    parseDateOnly(
      value
    );


  if (
    !parsed
  ) {

    return null;

  }


  const match =
    parsed.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );


  if (
    !match
  ) {

    return null;

  }


  const time =
    Date.UTC(

      Number(
        match[1]
      ),

      Number(
        match[2]
      ) -
      1,

      Number(
        match[3]
      )

    );


  return Math.floor(
    time /
    86400000
  );

}


/* =========================================================
   İLK GEÇERLİ TARİH
   ========================================================= */

function firstDate(
  ...values
) {

  for (
    const value
    of values
  ) {

    const parsed =
      parseDateOnly(
        value
      );


    if (
      parsed
    ) {

      return parsed;

    }

  }


  return "";

}


/* =========================================================
   İLK STRING
   ========================================================= */

function firstString(
  ...values
) {

  for (
    const value
    of values
  ) {

    const text =
      cleanString(
        value
      );


    if (
      text
    ) {

      return text;

    }

  }


  return "";

}


/* =========================================================
   TARİH PARSE

   Destek:
   ---------------------------------------------------------
   2026-10-18
   2026-10-18T12:00:00Z
   18.10.2026
   18/10/2026
   18-10-2026
   18 Ekim 2026
   ========================================================= */

export function parseDateOnly(
  value
) {

  const text =
    cleanString(
      value
    );


  if (
    !text
  ) {

    return "";

  }


  /* -------------------------------------------------------
     ISO
     ------------------------------------------------------- */

  let match =
    text.match(
      /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/
    );


  if (
    match
  ) {

    return buildIsoDate(

      Number(
        match[1]
      ),

      Number(
        match[2]
      ),

      Number(
        match[3]
      )

    );

  }


  /* -------------------------------------------------------
     dd.mm.yyyy
     dd/mm/yyyy
     dd-mm-yyyy
     ------------------------------------------------------- */

  match =
    text.match(
      /\b(\d{1,2})[.\/-](\d{1,2})[.\/-](20\d{2})\b/
    );


  if (
    match
  ) {

    return buildIsoDate(

      Number(
        match[3]
      ),

      Number(
        match[2]
      ),

      Number(
        match[1]
      )

    );

  }


  /* -------------------------------------------------------
     18 Ekim 2026
     ------------------------------------------------------- */

  match =
    text.match(

      /\b(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+(20\d{2})\b/i

    );


  if (
    match
  ) {

    const month =
      getTurkishMonthNumber(
        match[2]
      );


    if (
      month
    ) {

      return buildIsoDate(

        Number(
          match[3]
        ),

        month,

        Number(
          match[1]
        )

      );

    }

  }


  return "";

}


/* =========================================================
   TARİH ARALIĞI

   Destek:
   ---------------------------------------------------------
   25 Ekim - 1 Kasım 2026
   25 Ekim – 1 Kasım 2026
   24 - 31 Ekim 2026
   ========================================================= */

export function parseDateRange(
  value
) {

  const text =
    cleanString(
      value
    );


  if (
    !text
  ) {

    return null;

  }


  const months =
    "Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık";


  /* -------------------------------------------------------
     25 Ekim - 1 Kasım 2026
     ------------------------------------------------------- */

  let match =
    text.match(

      new RegExp(

        `(\\d{1,2})\\s+(${months})\\s*[-–—]\\s*` +
        `(\\d{1,2})\\s+(${months})\\s+(20\\d{2})`,

        "i"

      )

    );


  if (
    match
  ) {

    const year =
      Number(
        match[5]
      );


    const startMonth =
      getTurkishMonthNumber(
        match[2]
      );


    const endMonth =
      getTurkishMonthNumber(
        match[4]
      );


    if (
      startMonth &&
      endMonth
    ) {

      return {

        startDate:
          buildIsoDate(

            year,

            startMonth,

            Number(
              match[1]
            )

          ),

        endDate:
          buildIsoDate(

            year,

            endMonth,

            Number(
              match[3]
            )

          )

      };

    }

  }


  /* -------------------------------------------------------
     24 - 31 Ekim 2026
     ------------------------------------------------------- */

  match =
    text.match(

      new RegExp(

        `(\\d{1,2})\\s*[-–—]\\s*` +
        `(\\d{1,2})\\s+(${months})\\s+(20\\d{2})`,

        "i"

      )

    );


  if (
    match
  ) {

    const month =
      getTurkishMonthNumber(
        match[3]
      );


    if (
      month
    ) {

      return {

        startDate:
          buildIsoDate(

            Number(
              match[4]
            ),

            month,

            Number(
              match[1]
            )

          ),

        endDate:
          buildIsoDate(

            Number(
              match[4]
            ),

            month,

            Number(
              match[2]
            )

          )

      };

    }

  }


  return null;

}


/* =========================================================
   TÜRKÇE AY
   ========================================================= */

function getTurkishMonthNumber(
  value
) {

  const map = {

    ocak:
      1,

    subat:
      2,

    mart:
      3,

    nisan:
      4,

    mayis:
      5,

    haziran:
      6,

    temmuz:
      7,

    agustos:
      8,

    eylul:
      9,

    ekim:
      10,

    kasim:
      11,

    aralik:
      12

  };


  return (
    map[
      normalizeText(
        value
      )
    ]
    ||
    null
  );

}


/* =========================================================
   ISO TARİH OLUŞTUR
   ========================================================= */

function buildIsoDate(
  year,
  month,
  day
) {

  if (
    !isValidCalendarDate(
      year,
      month,
      day
    )
  ) {

    return "";

  }


  return (
    `${String(
      year
    ).padStart(
      4,
      "0"
    )}-` +
    `${String(
      month
    ).padStart(
      2,
      "0"
    )}-` +
    `${String(
      day
    ).padStart(
      2,
      "0"
    )}`
  );

}


/* =========================================================
   TAKVİM TARİHİ GEÇERLİ Mİ?
   ========================================================= */

function isValidCalendarDate(
  year,
  month,
  day
) {

  if (
    !Number.isInteger(
      year
    )
    ||
    !Number.isInteger(
      month
    )
    ||
    !Number.isInteger(
      day
    )
  ) {

    return false;

  }


  if (
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
        month - 1,
        day
      )
    );


  return (

    date.getUTCFullYear() ===
    year

    &&

    date.getUTCMonth() ===
    month - 1

    &&

    date.getUTCDate() ===
    day

  );

}


/* =========================================================
   EVENT STATUS NORMALİZE
   ========================================================= */

function normalizeEventStatus(
  value
) {

  const normalized =
    normalizeId(
      value
    );


  if (
    normalized ===
    "upcoming"
  ) {

    return EVENT_STATES.upcoming;

  }


  if (
    normalized ===
    "ongoing"
  ) {

    return EVENT_STATES.ongoing;

  }


  if (
    normalized ===
    "completed"
  ) {

    return EVENT_STATES.completed;

  }


  return EVENT_STATES.unknown;

}


/* =========================================================
   FALLBACK
   ========================================================= */

function createFallbackTemporal() {

  return {

    version:
      TEMPORAL_VERSION,

    timezone:
      TEMPORAL_TIMEZONE,

    today:
      resolveToday(),

    state:
      TIME_STATES.unknown,

    basis:
      "none",

    eventStatus:
      EVENT_STATES.unknown,

    languageMode:
      "neutral",

    startDate:
      "",

    endDate:
      "",

    eventDate:
      "",

    deadlineAt:
      "",

    publishedAt:
      "",

    daysUntilStart:
      null,

    daysUntilEnd:
      null,

    daysUntilDeadline:
      null,

    daysSincePublished:
      null,

    freshness:
      "unknown",

    actionState:
      ACTION_STATES.unknown,

    confidenceScore:
      0,

    reasons:
      [],

    analyzedAt:
      new Date()
        .toISOString()

  };

}


/* =========================================================
   NORMALIZE ID
   ========================================================= */

function normalizeId(
  value
) {

  return normalizeText(
    value
  )
    .replace(
      /\s+/g,
      "_"
    );

}


/* =========================================================
   NORMALIZE TEXT
   ========================================================= */

function normalizeText(
  value
) {

  return cleanString(
    value
  )

    .toLocaleLowerCase(
      "tr-TR"
    )

    .replaceAll(
      "ç",
      "c"
    )

    .replaceAll(
      "ğ",
      "g"
    )

    .replaceAll(
      "ı",
      "i"
    )

    .replaceAll(
      "ö",
      "o"
    )

    .replaceAll(
      "ş",
      "s"
    )

    .replaceAll(
      "ü",
      "u"
    );

}


/* =========================================================
   CLEAN STRING
   ========================================================= */

function cleanString(
  value
) {

  return String(
    value ||
    ""
  )
    .replace(
      /\s+/g,
      " "
    )
    .trim();

}


/* =========================================================
   PLAIN OBJECT
   ========================================================= */

function isPlainObject(
  value
) {

  return Boolean(

    value &&

    typeof value ===
    "object" &&

    !Array.isArray(
      value
    )

  );

}


/* =========================================================
   CLAMP
   ========================================================= */

function clamp(
  value,
  min,
  max
) {

  return Math.max(

    min,

    Math.min(
      max,
      Number(
        value
      ) ||
      0
    )

  );

      }
