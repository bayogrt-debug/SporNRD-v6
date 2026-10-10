/* =========================================================
   SporNRD
   worker/intelligence/temporalEngine.js

   SporNRD Zaman / Temporal Motoru

   Sürüm: 6.1.1

   AMAÇ
   ---------------------------------------------------------
   İçerikteki gerçek tarihleri BUGÜN ile karşılaştırarak:

   - past
   - present
   - future
   - unknown

   kararını üretmek.

   KRİTİK 6.1.1 DÜZELTMESİ
   ---------------------------------------------------------
   Structured ISO alanları her zaman metinsel tarihten önce
   değerlendirilir:

   details.startDateIso
   details.endDateIso
   details.deadlineIso

   Ayrıca tarih aralıkları tek tarih gibi okunmaz.

   Örnek:
   26-30 Ekim 2026

   → startDate = 2026-10-26
   → endDate   = 2026-10-30

   Yayın tarihi olay tarihi değildir.

   TÜRKİYE SAATİ
   ---------------------------------------------------------
   Europe/Istanbul
   ========================================================= */


/* =========================================================
   VERSION
   ========================================================= */

export const TEMPORAL_VERSION =
  "1.1";


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
     GERÇEK OLAY TARİHLERİNİ ÇÖZ

     Structured ISO alanları en yüksek önceliktedir.
     ========================================================= */

  const resolvedDates =
    resolveEventDates({

      post:
        post,

      details:
        details,

      lifecycle:
        lifecycle,

      facts:
        facts

    });


  const startDate =
    resolvedDates.startDate;


  const endDate =
    resolvedDates.endDate;


  const eventDate =
    resolvedDates.eventDate;


  /* =======================================================
     DEADLINE
     ========================================================= */

  const deadlineAt =
    firstDate(

      details.deadlineIso,

      facts.deadlineIso,

      details.registrationDeadline,

      details.applicationDeadline,

      details.deadline,

      lifecycle.expiresAt,

      facts.registrationDeadline,

      facts.applicationDeadline,

      facts.deadline,

      facts.deadlineText

    );


  /* =======================================================
     YAYIN TARİHİ

     Olay tarihi değildir.
     ========================================================= */

  const publishedAt =
    firstDate(

      source.publishedAt,

      lifecycle.publishedAt,

      post.date,

      facts.publishedAt

    );


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


  const reasons = [
    ...resolvedDates.reasons
  ];


  /* =======================================================
     1. BAŞLANGIÇ + BİTİŞ TARİHİ
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
      startDiff !== null &&
      endDiff !== null
    ) {

      if (
        startDiff > 0
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
        endDiff < 0
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
        resolvedDates.structured
          ? 100
          : 95;

    }

  }


  /* =======================================================
     2. TEK ETKİNLİK TARİHİ
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
      difference !== null
    ) {

      if (
        difference > 0
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
        difference < 0
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

  }


  /* =======================================================
     3. SADECE BAŞLANGIÇ TARİHİ
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
      difference !== null
    ) {

      if (
        difference > 0
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
        difference === 0
      ) {

        state =
          TIME_STATES.present;


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
      difference !== null
    ) {

      if (
        difference > 0
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
        difference === 0
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

  }


  /* =======================================================
     6. SADECE YAYIN TARİHİ VAR
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


  const publishedDifference =
    publishedAt

      ? dayDifference(
          publishedAt,
          today
        )

      : null;


  const daysSincePublished =
    publishedDifference === null

      ? null

      : publishedDifference > 0

        ? 0

        : Math.abs(
            publishedDifference
          );


  /* =======================================================
     SAYISAL TARİH FARKLARI
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


    state:
      state,

    basis:
      basis,

    eventStatus:
      eventStatus,

    languageMode:
      languageMode,


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


    daysUntilStart:
      daysUntilStart,

    daysUntilEnd:
      daysUntilEnd,

    daysUntilDeadline:
      daysUntilDeadline,

    daysSincePublished:
      daysSincePublished,


    freshness:
      freshness,


    actionState:
      actionState,


    confidenceScore:
      clamp(
        confidenceScore,
        0,
        100
      ),

    reasons: [
      ...new Set(
        reasons
      )
    ],

    analyzedAt:
      new Date()
        .toISOString()

  };

}


/* =========================================================
   GERÇEK OLAY TARİHLERİNİ ÇÖZ
   ========================================================= */

function resolveEventDates({

  post,
  details,
  lifecycle,
  facts

}) {

  const reasons =
    [];


  /* -------------------------------------------------------
     Structured ISO başlangıç/bitiş
     ------------------------------------------------------- */

  const structuredStart =
    firstDate(

      details.startDateIso,

      facts.startDateIso

    );


  const structuredEnd =
    firstDate(

      details.endDateIso,

      facts.endDateIso

    );


  let startDate =
    structuredStart;


  let endDate =
    structuredEnd;


  const structured =
    Boolean(
      structuredStart ||
      structuredEnd
    );


  if (
    structuredStart
  ) {

    reasons.push(
      "Başlangıç tarihi structured ISO alandan alındı."
    );

  }


  if (
    structuredEnd
  ) {

    reasons.push(
      "Bitiş tarihi structured ISO alandan alındı."
    );

  }


  /* -------------------------------------------------------
     Metinsel tarih aralığı

     Örnek:
     26-30 Ekim 2026
     ------------------------------------------------------- */

  const range =
    firstDateRange(

      details.eventDate,

      details.dateRange,

      details.startDate,

      facts.eventDate,

      facts.dateRange,

      facts.startDate,

      post.eventDate

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


    reasons.push(
      "Metinsel tarih aralığı başlangıç ve bitiş olarak ayrıştırıldı."
    );

  }


  /* -------------------------------------------------------
     Tekil başlangıç
     ------------------------------------------------------- */

  if (
    !startDate
  ) {

    startDate =
      firstStartDate(

        details.startDate,

        lifecycle.startsAt,

        facts.startDate

      );

  }


  /* -------------------------------------------------------
     Tekil bitiş
     ------------------------------------------------------- */

  if (
    !endDate
  ) {

    endDate =
      firstEndDate(

        details.endDate,

        lifecycle.endsAt,

        facts.endDate

      );

  }


  /* -------------------------------------------------------
     Tek eventDate

     Range bulunduysa eventDate boş kalır.
     ------------------------------------------------------- */

  let eventDate =
    "";


  if (
    !range
  ) {

    eventDate =
      firstDate(

        details.eventDate,

        facts.eventDate,

        post.eventDate

      );

  }


  /* -------------------------------------------------------
     Tarih sırası güvenliği
     ------------------------------------------------------- */

  if (
    startDate &&
    endDate
  ) {

    const order =
      compareIsoDates(
        startDate,
        endDate
      );


    if (
      order > 0
    ) {

      if (
        range &&
        compareIsoDates(
          range.startDate,
          range.endDate
        ) <= 0
      ) {

        startDate =
          range.startDate;

        endDate =
          range.endDate;


        reasons.push(
          "Tutarsız başlangıç/bitiş sırası tarih aralığına göre düzeltildi."
        );

      }

      else {

        endDate =
          "";


        reasons.push(
          "Bitiş tarihi başlangıçtan önce olduğu için güvenli şekilde yok sayıldı."
        );

      }

    }

  }


  return {

    startDate:
      startDate,

    endDate:
      endDate,

    eventDate:
      eventDate,

    structured:
      structured,

    reasons:
      reasons

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
    post.actionable === true;


  if (
    temporal.actionState ===
    ACTION_STATES.closed
    ||
    temporal.actionState ===
    ACTION_STATES.not_applicable
  ) {

    actionable =
      false;

  }


  return {

    ...post,

    temporal:
      temporal,

    eventStatus:
      temporal.eventStatus,

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
      difference !== null
    ) {

      if (
        difference < 0
      ) {

        return ACTION_STATES.closed;

      }


      if (
        difference === 0
      ) {

        return ACTION_STATES.closing_today;

      }


      return ACTION_STATES.open;

    }

  }


  if (
    eventStatus ===
    EVENT_STATES.completed
    ||
    (
      state ===
      TIME_STATES.past
      &&
      normalizeId(
        post.contentIntent
      ) ===
      "result"
    )
  ) {

    return ACTION_STATES.not_applicable;

  }


  if (
    post.actionable === true
  ) {

    return ACTION_STATES.possible_unverified;

  }


  return ACTION_STATES.not_applicable;

}


/* =========================================================
   PERSONA LANGUAGE MODE
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
      ||
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


  if (
    difference === null
  ) {

    return "unknown";

  }


  if (
    difference > 0
  ) {

    return "future_dated";

  }


  const age =
    Math.abs(
      difference
    );


  if (
    age === 0
  ) {

    return "today";

  }


  if (
    age === 1
  ) {

    return "yesterday";

  }


  if (
    age <= 3
  ) {

    return "recent";

  }


  if (
    age <= 7
  ) {

    return "current";

  }


  if (
    age <= 30
  ) {

    return "older";

  }


  return "old";

}


/* =========================================================
   BUGÜNÜ ÇÖZ
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

    /* fallback */

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

   +5 = 5 gün sonra
    0 = bugün
   -5 = 5 gün önce
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
    targetKey === null
    ||
    todayKey === null
  ) {

    return null;

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
      ) - 1,

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
   İLK GEÇERLİ TEKİL TARİH
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
   İLK BAŞLANGIÇ TARİHİ

   Range gelirse başlangıç tarafını döndürür.
   ========================================================= */

function firstStartDate(
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
      !text
    ) {

      continue;

    }


    const range =
      parseDateRange(
        text
      );


    if (
      range?.startDate
    ) {

      return range.startDate;

    }


    const parsed =
      parseDateOnly(
        text
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
   İLK BİTİŞ TARİHİ

   Range gelirse bitiş tarafını döndürür.
   ========================================================= */

function firstEndDate(
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
      !text
    ) {

      continue;

    }


    const range =
      parseDateRange(
        text
      );


    if (
      range?.endDate
    ) {

      return range.endDate;

    }


    const parsed =
      parseDateOnly(
        text
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
   İLK TARİH ARALIĞI
   ========================================================= */

function firstDateRange(
  ...values
) {

  for (
    const value
    of values
  ) {

    const range =
      parseDateRange(
        value
      );


    if (
      range?.startDate &&
      range?.endDate
    ) {

      return range;

    }

  }


  return null;

}


/* =========================================================
   TARİH PARSE

   DİKKAT:
   Tarih aralığını tek tarih gibi yorumlamaz.
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


  /*
    26-30 Ekim 2026 gibi bir değer
    "30 Ekim" olarak okunmamalı.
  */

  if (
    parseDateRange(
      text
    )
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
   2026-10-26 - 2026-10-30
   26.10.2026 - 30.10.2026
   25 Ekim - 1 Kasım 2026
   26 Ekim - 30 Ekim 2026
   26-30 Ekim 2026
   26 – 30 Ekim 2026
   26-30.10.2026
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
     2026-10-26 - 2026-10-30
     ------------------------------------------------------- */

  let match =
    text.match(
      /\b(20\d{2})-(\d{1,2})-(\d{1,2})\s*[-–—]\s*(20\d{2})-(\d{1,2})-(\d{1,2})\b/
    );


  if (
    match
  ) {

    return buildDateRangeResult(

      buildIsoDate(
        Number(match[1]),
        Number(match[2]),
        Number(match[3])
      ),

      buildIsoDate(
        Number(match[4]),
        Number(match[5]),
        Number(match[6])
      )

    );

  }


  /* -------------------------------------------------------
     26.10.2026 - 30.10.2026
     ------------------------------------------------------- */

  match =
    text.match(
      /\b(\d{1,2})[.\/](\d{1,2})[.\/](20\d{2})\s*[-–—]\s*(\d{1,2})[.\/](\d{1,2})[.\/](20\d{2})\b/
    );


  if (
    match
  ) {

    return buildDateRangeResult(

      buildIsoDate(
        Number(match[3]),
        Number(match[2]),
        Number(match[1])
      ),

      buildIsoDate(
        Number(match[6]),
        Number(match[5]),
        Number(match[4])
      )

    );

  }


  /* -------------------------------------------------------
     25 Ekim - 1 Kasım 2026
     ------------------------------------------------------- */

  match =
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

    const endYear =
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

      const startYear =
        startMonth > endMonth

          ? endYear - 1

          : endYear;


      return buildDateRangeResult(

        buildIsoDate(

          startYear,

          startMonth,

          Number(
            match[1]
          )

        ),

        buildIsoDate(

          endYear,

          endMonth,

          Number(
            match[3]
          )

        )

      );

    }

  }


  /* -------------------------------------------------------
     26-30 Ekim 2026
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

      return buildDateRangeResult(

        buildIsoDate(

          Number(
            match[4]
          ),

          month,

          Number(
            match[1]
          )

        ),

        buildIsoDate(

          Number(
            match[4]
          ),

          month,

          Number(
            match[2]
          )

        )

      );

    }

  }


  /* -------------------------------------------------------
     26-30.10.2026
     ------------------------------------------------------- */

  match =
    text.match(
      /\b(\d{1,2})\s*[-–—]\s*(\d{1,2})[.\/](\d{1,2})[.\/](20\d{2})\b/
    );


  if (
    match
  ) {

    return buildDateRangeResult(

      buildIsoDate(

        Number(match[4]),

        Number(match[3]),

        Number(match[1])

      ),

      buildIsoDate(

        Number(match[4]),

        Number(match[3]),

        Number(match[2])

      )

    );

  }


  return null;

}


/* =========================================================
   DATE RANGE RESULT
   ========================================================= */

function buildDateRangeResult(
  startDate,
  endDate
) {

  if (
    !startDate ||
    !endDate
  ) {

    return null;

  }


  if (
    compareIsoDates(
      startDate,
      endDate
    ) > 0
  ) {

    return null;

  }


  return {

    startDate:
      startDate,

    endDate:
      endDate

  };

}


/* =========================================================
   ISO TARİH KARŞILAŞTIR
   ========================================================= */

function compareIsoDates(
  a,
  b
) {

  const keyA =
    dateToDayKey(
      a
    );


  const keyB =
    dateToDayKey(
      b
    );


  if (
    keyA === null
    ||
    keyB === null
  ) {

    return 0;

  }


  return (
    keyA -
    keyB
  );

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
        month - 1,
        day
      )
    );


  return (

    date.getUTCFullYear() === year

    &&

    date.getUTCMonth() ===
    month - 1

    &&

    date.getUTCDate() === day

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
      /[^a-z0-9]+/g,
      "_"
    )
    .replace(
      /^_+|_+$/g,
      ""
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
    value ??
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

  const number =
    Number(
      value
    );


  const safe =
    Number.isFinite(
      number
    )
      ? number
      : 0;


  return Math.max(

    min,

    Math.min(
      max,
      safe
    )

  );

}
