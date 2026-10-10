/* =========================================================
   SporNRD
   worker/core/lifecycle.js

   Post Yaşam Döngüsü Motoru

   Sürüm: 6.1.0

   Amaç:
   ---------------------------------------------------------
   - Yeni postları belirlemek
   - Aktif içerikleri belirlemek
   - Son günü yaklaşan içerikleri işaretlemek
   - Güncellenen içerikleri belirlemek
   - Süresi geçen içerikleri tespit etmek
   - Kaynaktan kaldırılan içerikleri işaretlemek
   - Ana akışta gösterilip gösterilmeyeceğine karar vermek

   DURUMLAR
   ---------------------------------------------------------
   new
   active
   closing_soon
   updated
   expired
   removed

   ÖNEMLİ:
   Bu motor gerçek tarihlere göre karar verir.
   Kaynakta tarih yoksa bilgi uydurmaz.
   ========================================================= */


import {
  getPostStatus
} from "./taxonomy.js";


/* =========================================================
   LIFECYCLE VERSION
   ========================================================= */

export const LIFECYCLE_VERSION =
  "1.0";


/* =========================================================
   VARSAYILAN AYARLAR
   ========================================================= */

export const DEFAULT_LIFECYCLE_OPTIONS = {

  /*
    İlk görüldükten sonra kaç saat
    "Yeni" sayılacağı.
  */

  newHours:
    72,


  /*
    Son tarih kaç gün kaldığında
    "Son Günler" durumuna geçeceği.
  */

  closingSoonDays:
    3,


  /*
    Güncellendikten sonra kaç saat
    "Güncellendi" etiketi taşıyacağı.
  */

  updatedHours:
    48,


  /*
    Süresi geçmiş postları ana
    akışta gösterme.
  */

  showExpired:
    false,


  /*
    Kaynaktan kaldırılmış postları
    ana akışta gösterme.
  */

  showRemoved:
    false

};


/* =========================================================
   POST YAŞAM DÖNGÜSÜNÜ HESAPLA
   ========================================================= */

export function evaluatePostLifecycle(
  post,
  options = {}
) {

  const settings =
    mergeOptions(
      options
    );


  const now =
    resolveNow(
      settings.now
    );


  const lifecycle =
    isPlainObject(
      post?.lifecycle
    )
      ? post.lifecycle
      : {};


  const details =
    isPlainObject(
      post?.details
    )
      ? post.details
      : {};


  /* -------------------------------------------------------
     ZAMANLARI TOPLA
     ------------------------------------------------------- */

  const firstSeenAt =
    parseDate(
      lifecycle.firstSeenAt
    );


  const lastSeenAt =
    parseDate(
      lifecycle.lastSeenAt
    );


  const publishedAt =
    parseDate(
      lifecycle.publishedAt ||
      post?.source?.publishedAt
    );


  const updatedAt =
    parseDate(
      lifecycle.updatedAt
    );


  const startsAt =
    firstValidDate(
      [

        lifecycle.startsAt,

        details.startDate

      ]
    );


  const endsAt =
    firstValidDate(
      [

        lifecycle.endsAt,

        details.endDate

      ]
    );


  const expiresAt =
    firstValidDate(
      [

        lifecycle.expiresAt,

        details.registrationDeadline,

        details.applicationDeadline,

        details.endDate

      ]
    );


  /* =======================================================
     1. KAYNAKTAN KALDIRILMIŞ
     ======================================================= */

  if (
    shouldMarkRemoved(
      post,
      settings
    )
  ) {

    return createLifecycleResult({

      status:
        "removed",

      now:
        now,

      firstSeenAt:
        firstSeenAt,

      lastSeenAt:
        lastSeenAt,

      publishedAt:
        publishedAt,

      updatedAt:
        updatedAt,

      startsAt:
        startsAt,

      endsAt:
        endsAt,

      expiresAt:
        expiresAt,

      reason:
        "İçerik kaynakta artık aktif değil."

    });

  }


  /* =======================================================
     2. SÜRESİ DOLMUŞ
     ======================================================= */

  if (
    expiresAt &&
    expiresAt.getTime() <
    now.getTime()
  ) {

    return createLifecycleResult({

      status:
        "expired",

      now:
        now,

      firstSeenAt:
        firstSeenAt,

      lastSeenAt:
        lastSeenAt,

      publishedAt:
        publishedAt,

      updatedAt:
        updatedAt,

      startsAt:
        startsAt,

      endsAt:
        endsAt,

      expiresAt:
        expiresAt,

      reason:
        "İçeriğin son geçerlilik tarihi geçti."

    });

  }


  /*
    Etkinliğin açık bir bitiş tarihi varsa
    onu da kontrol ediyoruz.
  */

  if (
    endsAt &&
    endsAt.getTime() <
    now.getTime()
  ) {

    return createLifecycleResult({

      status:
        "expired",

      now:
        now,

      firstSeenAt:
        firstSeenAt,

      lastSeenAt:
        lastSeenAt,

      publishedAt:
        publishedAt,

      updatedAt:
        updatedAt,

      startsAt:
        startsAt,

      endsAt:
        endsAt,

      expiresAt:
        expiresAt,

      reason:
        "Etkinlik veya içerik bitiş tarihi geçti."

    });

  }


  /* =======================================================
     3. SON GÜNLER
     ======================================================= */

  if (
    expiresAt
  ) {

    const remainingMilliseconds =
      expiresAt.getTime() -
      now.getTime();


    const closingWindow =
      settings.closingSoonDays *
      24 *
      60 *
      60 *
      1000;


    if (
      remainingMilliseconds >=
      0
      &&
      remainingMilliseconds <=
      closingWindow
    ) {

      return createLifecycleResult({

        status:
          "closing_soon",

        now:
          now,

        firstSeenAt:
          firstSeenAt,

        lastSeenAt:
          lastSeenAt,

        publishedAt:
          publishedAt,

        updatedAt:
          updatedAt,

        startsAt:
          startsAt,

        endsAt:
          endsAt,

        expiresAt:
          expiresAt,

        reason:
          "Son başvuru veya geçerlilik tarihi yaklaşıyor.",

        remainingDays:
          calculateRemainingDays(
            now,
            expiresAt
          )

      });

    }

  }


  /* =======================================================
     4. GÜNCELLENDİ
     ======================================================= */

  if (
    isRecentlyUpdated(
      updatedAt,
      publishedAt,
      firstSeenAt,
      now,
      settings.updatedHours
    )
  ) {

    return createLifecycleResult({

      status:
        "updated",

      now:
        now,

      firstSeenAt:
        firstSeenAt,

      lastSeenAt:
        lastSeenAt,

      publishedAt:
        publishedAt,

      updatedAt:
        updatedAt,

      startsAt:
        startsAt,

      endsAt:
        endsAt,

      expiresAt:
        expiresAt,

      reason:
        "İçerik yakın zamanda güncellendi."

    });

  }


  /* =======================================================
     5. YENİ
     ======================================================= */

  const newReference =
    firstSeenAt ||
    publishedAt;


  if (
    isWithinHours(
      newReference,
      now,
      settings.newHours
    )
  ) {

    return createLifecycleResult({

      status:
        "new",

      now:
        now,

      firstSeenAt:
        firstSeenAt,

      lastSeenAt:
        lastSeenAt,

      publishedAt:
        publishedAt,

      updatedAt:
        updatedAt,

      startsAt:
        startsAt,

      endsAt:
        endsAt,

      expiresAt:
        expiresAt,

      reason:
        "İçerik yakın zamanda bulundu veya yayımlandı."

    });

  }


  /* =======================================================
     6. AKTİF
     ======================================================= */

  return createLifecycleResult({

    status:
      "active",

    now:
      now,

    firstSeenAt:
      firstSeenAt,

    lastSeenAt:
      lastSeenAt,

    publishedAt:
      publishedAt,

    updatedAt:
      updatedAt,

    startsAt:
      startsAt,

    endsAt:
      endsAt,

    expiresAt:
      expiresAt,

    reason:
      "İçerik aktif."

  });

}


/* =========================================================
   POSTA YAŞAM DÖNGÜSÜNÜ UYGULA

   Orijinal postu değiştirmez.
   Yeni nesne döndürür.
   ========================================================= */

export function applyLifecycle(
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


  const result =
    evaluatePostLifecycle(
      post,
      options
    );


  return {

    ...post,

    lifecycle: {

      ...(
        isPlainObject(
          post.lifecycle
        )
          ? post.lifecycle
          : {}
      ),

      status:
        result.status,

      firstSeenAt:
        result.firstSeenAt,

      lastSeenAt:
        result.lastSeenAt,

      publishedAt:
        result.publishedAt,

      updatedAt:
        result.updatedAt,

      startsAt:
        result.startsAt,

      endsAt:
        result.endsAt,

      expiresAt:
        result.expiresAt

    },


    lifecycleMeta: {

      version:
        LIFECYCLE_VERSION,

      reason:
        result.reason,

      remainingDays:
        result.remainingDays,

      evaluatedAt:
        result.evaluatedAt

    }

  };

}


/* =========================================================
   POST LİSTESİNE UYGULA
   ========================================================= */

export function applyLifecycleToPosts(
  posts,
  options = {}
) {

  if (
    !Array.isArray(
      posts
    )
  ) {

    return [];

  }


  return posts
    .map(
      post =>
        applyLifecycle(
          post,
          options
        )
    )
    .filter(
      Boolean
    );

}


/* =========================================================
   ANA AKIŞTA GÖSTERİLEBİLİR Mİ?
   ========================================================= */

export function isPostVisible(
  post,
  options = {}
) {

  if (
    !post ||
    typeof post !==
    "object"
  ) {

    return false;

  }


  const settings =
    mergeOptions(
      options
    );


  const status =
    post.lifecycle?.status ||
    evaluatePostLifecycle(
      post,
      settings
    ).status;


  if (
    status ===
    "removed"
  ) {

    return Boolean(
      settings.showRemoved
    );

  }


  if (
    status ===
    "expired"
  ) {

    return Boolean(
      settings.showExpired
    );

  }


  return true;

}


/* =========================================================
   AKTİF AKIŞI FİLTRELE
   ========================================================= */

export function filterVisiblePosts(
  posts,
  options = {}
) {

  if (
    !Array.isArray(
      posts
    )
  ) {

    return [];

  }


  return posts.filter(
    post =>
      isPostVisible(
        post,
        options
      )
  );

}


/* =========================================================
   DURUMA GÖRE POSTLAR
   ========================================================= */

export function getPostsByStatus(
  posts,
  status
) {

  if (
    !Array.isArray(
      posts
    )
  ) {

    return [];

  }


  const normalizedStatus =
    normalizeStatus(
      status
    );


  if (
    !normalizedStatus
  ) {

    return [];

  }


  return posts.filter(
    post =>
      post?.lifecycle?.status ===
      normalizedStatus
  );

}


/* =========================================================
   LIFECYCLE ROZETİ

   Frontend isterse doğrudan kullanabilir.
   ========================================================= */

export function getLifecycleBadge(
  status
) {

  const normalized =
    normalizeStatus(
      status
    );


  const badges = {

    new: {

      label:
        "YENİ",

      priority:
        4

    },


    active: {

      label:
        "",

      priority:
        1

    },


    closing_soon: {

      label:
        "SON GÜNLER",

      priority:
        5

    },


    updated: {

      label:
        "GÜNCELLENDİ",

      priority:
        3

    },


    expired: {

      label:
        "SÜRESİ DOLDU",

      priority:
        0

    },


    removed: {

      label:
        "KALDIRILDI",

      priority:
        0

    }

  };


  return (
    badges[
      normalized
    ]
    ||
    {

      label:
        "",

      priority:
        0

    }
  );

}


/* =========================================================
   YAŞAM DÖNGÜSÜ ÖZETİ

   Debug / health için.
   ========================================================= */

export function createLifecycleSummary(
  posts
) {

  const summary = {

    total:
      0,

    active:
      0,

    new:
      0,

    closing_soon:
      0,

    updated:
      0,

    expired:
      0,

    removed:
      0,

    unknown:
      0

  };


  if (
    !Array.isArray(
      posts
    )
  ) {

    return summary;

  }


  for (
    const post
    of posts
  ) {

    summary.total++;


    const status =
      post?.lifecycle?.status;


    if (
      Object.prototype.hasOwnProperty.call(
        summary,
        status
      )
    ) {

      summary[
        status
      ]++;

    }

    else {

      summary.unknown++;

    }

  }


  return summary;

}


/* =========================================================
   KAYNAKTAN KALDIRILDI MI?
   ========================================================= */

function shouldMarkRemoved(
  post,
  settings
) {

  /*
    Adapter açıkça kaynağın artık
    bulunmadığını söylerse.
  */

  if (
    post?.sourceAvailable ===
    false
  ) {

    return true;

  }


  if (
    post?.removed ===
    true
  ) {

    return true;

  }


  if (
    post?.lifecycle?.status ===
    "removed"
  ) {

    return true;

  }


  /*
    İleride kaynak tarama motoru
    missingFromSource değerini verebilir.
  */

  if (
    settings.respectMissingFromSource !==
    false
    &&
    post?.missingFromSource ===
    true
  ) {

    return true;

  }


  return false;

}


/* =========================================================
   YAKIN ZAMANDA GÜNCELLENDİ Mİ?
   ========================================================= */

function isRecentlyUpdated(
  updatedAt,
  publishedAt,
  firstSeenAt,
  now,
  updatedHours
) {

  if (
    !updatedAt
  ) {

    return false;

  }


  const reference =
    publishedAt ||
    firstSeenAt;


  /*
    Güncelleme zamanı ilk yayınla
    aynıysa "güncellendi" saymıyoruz.
  */

  if (
    reference
    &&
    Math.abs(
      updatedAt.getTime() -
      reference.getTime()
    ) <
    60 *
    1000
  ) {

    return false;

  }


  return isWithinHours(
    updatedAt,
    now,
    updatedHours
  );

}


/* =========================================================
   SAAT ARALIĞI
   ========================================================= */

function isWithinHours(
  date,
  now,
  hours
) {

  if (
    !date ||
    !now
  ) {

    return false;

  }


  const difference =
    now.getTime() -
    date.getTime();


  if (
    difference <
    0
  ) {

    return false;

  }


  const maximum =
    Number(
      hours
    )
    *
    60 *
    60 *
    1000;


  return (
    difference <=
    maximum
  );

}


/* =========================================================
   KALAN GÜN
   ========================================================= */

function calculateRemainingDays(
  now,
  futureDate
) {

  if (
    !now ||
    !futureDate
  ) {

    return null;

  }


  const difference =
    futureDate.getTime() -
    now.getTime();


  if (
    difference <
    0
  ) {

    return 0;

  }


  return Math.ceil(
    difference /
    (
      24 *
      60 *
      60 *
      1000
    )
  );

}


/* =========================================================
   SONUÇ NESNESİ
   ========================================================= */

function createLifecycleResult({

  status,
  now,

  firstSeenAt,
  lastSeenAt,

  publishedAt,
  updatedAt,

  startsAt,
  endsAt,
  expiresAt,

  reason = "",
  remainingDays = null

}) {

  const normalizedStatus =
    normalizeStatus(
      status
    )
    ||
    "active";


  return {

    status:
      normalizedStatus,

    firstSeenAt:
      toIso(
        firstSeenAt
      ),

    lastSeenAt:
      toIso(
        lastSeenAt
      ),

    publishedAt:
      toIsoOrOriginal(
        publishedAt
      ),

    updatedAt:
      toIso(
        updatedAt
      ),

    startsAt:
      toIso(
        startsAt
      ),

    endsAt:
      toIso(
        endsAt
      ),

    expiresAt:
      toIso(
        expiresAt
      ),

    reason:
      String(
        reason ||
        ""
      ),

    remainingDays:
      remainingDays,

    evaluatedAt:
      now
        .toISOString()

  };

}


/* =========================================================
   İLK GEÇERLİ TARİH
   ========================================================= */

function firstValidDate(
  values
) {

  for (
    const value
    of values
  ) {

    const date =
      parseDate(
        value
      );


    if (
      date
    ) {

      return date;

    }

  }


  return null;

}


/* =========================================================
   TARİH OKU

   Destek:
   ---------------------------------------------------------
   ISO
   2026-10-10

   dd.mm.yyyy
   10.10.2026

   10 Ekim 2026

   10 Ekim 2026 18:30
   ========================================================= */

export function parseLifecycleDate(
  value
) {

  return parseDate(
    value
  );

}


function parseDate(
  value
) {

  if (
    value instanceof Date
  ) {

    return Number.isFinite(
      value.getTime()
    )
      ? new Date(
          value.getTime()
        )
      : null;

  }


  const text =
    String(
      value ||
      ""
    )
      .trim();


  if (
    !text
  ) {

    return null;

  }


  /* -------------------------------------------------------
     ISO / standart JavaScript tarihi
     ------------------------------------------------------- */

  const direct =
    Date.parse(
      text
    );


  /*
    Türkçe "10 Ekim 2026" gibi değerlerde
    Date.parse platformdan platforma değişebileceği
    için önce özel formatları da kontrol ediyoruz.
  */


  /* -------------------------------------------------------
     DD.MM.YYYY + opsiyonel saat
     ------------------------------------------------------- */

  let match =
    text.match(

      /^(\d{1,2})[.\/-](\d{1,2})[.\/-](20\d{2})(?:\s+(\d{1,2}):(\d{2}))?/

    );


  if (
    match
  ) {

    return safeDateUtc({

      year:
        Number(
          match[3]
        ),

      month:
        Number(
          match[2]
        ) -
        1,

      day:
        Number(
          match[1]
        ),

      hour:
        Number(
          match[4] ||
          23
        ),

      minute:
        Number(
          match[5] ||
          59
        )

    });

  }


  /* -------------------------------------------------------
     10 Ekim 2026 + opsiyonel saat
     ------------------------------------------------------- */

  match =
    text.match(

      /^(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+(20\d{2})(?:\s+(\d{1,2}):(\d{2}))?/i

    );


  if (
    match
  ) {

    const month =
      turkishMonthIndex(
        match[2]
      );


    if (
      month <
      0
    ) {

      return null;

    }


    return safeDateUtc({

      year:
        Number(
          match[3]
        ),

      month:
        month,

      day:
        Number(
          match[1]
        ),

      hour:
        Number(
          match[4] ||
          23
        ),

      minute:
        Number(
          match[5] ||
          59
        )

    });

  }


  /* -------------------------------------------------------
     ISO fallback
     ------------------------------------------------------- */

  if (
    Number.isFinite(
      direct
    )
  ) {

    return new Date(
      direct
    );

  }


  return null;

}


/* =========================================================
   GÜVENLİ UTC TARİH
   ========================================================= */

function safeDateUtc({

  year,
  month,
  day,
  hour = 0,
  minute = 0

}) {

  const timestamp =
    Date.UTC(

      year,

      month,

      day,

      hour,

      minute,

      0,

      0

    );


  const date =
    new Date(
      timestamp
    );


  if (
    !Number.isFinite(
      date.getTime()
    )
  ) {

    return null;

  }


  /*
    31 Şubat gibi geçersiz girişlerin
    başka aya taşmasını engelle.
  */

  if (
    date.getUTCFullYear() !==
    year
    ||
    date.getUTCMonth() !==
    month
    ||
    date.getUTCDate() !==
    day
  ) {

    return null;

  }


  return date;

}


/* =========================================================
   TÜRKÇE AY
   ========================================================= */

function turkishMonthIndex(
  value
) {

  const months = {

    OCAK:
      0,

    SUBAT:
      1,

    MART:
      2,

    NISAN:
      3,

    MAYIS:
      4,

    HAZIRAN:
      5,

    TEMMUZ:
      6,

    AGUSTOS:
      7,

    EYLUL:
      8,

    EKIM:
      9,

    KASIM:
      10,

    ARALIK:
      11

  };


  const normalized =
    normalizeTurkish(
      value
    );


  return Object.prototype
    .hasOwnProperty
    .call(
      months,
      normalized
    )

      ? months[
          normalized
        ]

      : -1;

}


/* =========================================================
   STATUS NORMALİZE
   ========================================================= */

function normalizeStatus(
  value
) {

  const status =
    String(
      value ||
      ""
    )
      .trim()
      .toLowerCase();


  return getPostStatus(
    status
  )
    ? status
    : "";

}


/* =========================================================
   OPTIONS
   ========================================================= */

function mergeOptions(
  options
) {

  const input =
    isPlainObject(
      options
    )
      ? options
      : {};


  return {

    ...DEFAULT_LIFECYCLE_OPTIONS,

    ...input,

    newHours:
      positiveNumber(
        input.newHours,
        DEFAULT_LIFECYCLE_OPTIONS.newHours
      ),

    closingSoonDays:
      positiveNumber(
        input.closingSoonDays,
        DEFAULT_LIFECYCLE_OPTIONS.closingSoonDays
      ),

    updatedHours:
      positiveNumber(
        input.updatedHours,
        DEFAULT_LIFECYCLE_OPTIONS.updatedHours
      )

  };

}


/* =========================================================
   NOW
   ========================================================= */

function resolveNow(
  value
) {

  const parsed =
    parseDate(
      value
    );


  return parsed ||
  new Date();

}


/* =========================================================
   ISO
   ========================================================= */

function toIso(
  value
) {

  if (
    !value
  ) {

    return "";

  }


  try {

    return value.toISOString();

  }

  catch {

    return "";

  }

}


/* =========================================================
   PUBLISHED DATE

   Şimdilik standartlaştırılmış ISO döndürür.
   ========================================================= */

function toIsoOrOriginal(
  value
) {

  return toIso(
    value
  );

}


/* =========================================================
   TÜRKÇE NORMALİZE
   ========================================================= */

function normalizeTurkish(
  value
) {

  return String(
    value ||
    ""
  )

    .trim()

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
   HELPERS
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


function positiveNumber(
  value,
  fallback
) {

  const number =
    Number(
      value
    );


  return (
    Number.isFinite(
      number
    )
    &&
    number >=
    0
  )

    ? number

    : fallback;

    }
