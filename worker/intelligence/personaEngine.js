/* =========================================================
   SporNRD
   worker/intelligence/personaEngine.js

   SporNRD Persona / Influencer Motoru

   Sürüm: 6.1.2

   AMAÇ
   ---------------------------------------------------------
   Yapılandırılmış SporNRD postunu:

   - sıcak
   - dikkat çekici
   - Instagram / influencer hissi taşıyan
   - kısa
   - anlaşılır
   - son tüketici odaklı
   - ama GERÇEĞİ DEĞİŞTİRMEYEN

   bir anlatıma dönüştürmek.

   =========================================================
   YENİ ANA KATEGORİLER
   ---------------------------------------------------------

   news
   course
   event
   campaign
   jobs
   stores

   =========================================================
   PERSONA KARAR GİRDİLERİ
   ---------------------------------------------------------

   sport
   section
   category
   subCategory
   providerType

   contentIntent
   eventStatus
   actionable

   temporal.state
   temporal.basis
   temporal.languageMode
   temporal.actionState
   temporal.freshness

   location
   details
   source
   lifecycle

   =========================================================
   ZAMAN KURALI
   ---------------------------------------------------------

   PAST
   → oldu
   → tamamlandı
   → sona erdi
   → kazandı

   PRESENT
   → devam ediyor
   → bugün
   → şu anda geçerli

   FUTURE
   → yapılacak
   → başlayacak
   → geliyor

   UNKNOWN + PUBLISHED DATE
   → olayın zamanı uydurulmaz

   Sadece:

   "bugün yayımlandı"
   "kısa süre önce yayımlandı"
   "daha önce yayımlanmış"

   gibi yayın güncelliği dili kullanılır.

   =========================================================
   TEMEL GÜVEN KURALI
   ---------------------------------------------------------

   Sistem gerçeği çıkartırken editör değildir.
   Editör olurken gerçeği değiştiremez.

   - Fiyat uydurulmaz.
   - Tarih uydurulmaz.
   - Yaş uydurulmaz.
   - Konum uydurulmaz.
   - Kontenjan uydurulmaz.
   - İndirim uydurulmaz.
   - Başvuru açık değilse "kayıt ol" denmez.
   - Tamamlanmış olay yaklaşan etkinlik gibi sunulmaz.
   - Yayın tarihi olay tarihi kabul edilmez.
   - Clickbait yapılmaz.
   - Sahte reklam dili kullanılmaz.
   ========================================================= */


import {

  getSport,
  getSection,
  getCategory,
  getSubCategory,
  getProviderType

} from "../core/taxonomy.js";


/* =========================================================
   VERSION
   ========================================================= */

export const PERSONA_VERSION =
  "1.2";


/* =========================================================
   PERSONA STİLLERİ
   ========================================================= */

export const PERSONA_STYLES = {

  discovery:
    "discovery",

  opportunity:
    "opportunity",

  reminder:
    "reminder",

  family:
    "family",

  professional:
    "professional",

  practical:
    "practical",

  informative:
    "informative",

  result:
    "result",

  news:
    "news"

};


/* =========================================================
   ANA PERSONA
   ========================================================= */

export function buildPersona(
  post,
  options = {}
) {

  void options;


  if (
    !post ||
    typeof post !==
    "object"
  ) {

    return createFallbackPersona();

  }


  const facts =
    collectFacts(
      post
    );


  const angle =
    chooseAngle(
      post,
      facts
    );


  const style =
    chooseStyle(
      angle
    );


  const headline =
    buildHeadline(
      post,
      facts,
      angle
    );


  const influencerText =
    buildInfluencerText(
      post,
      facts,
      angle
    );


  const note =
    buildSporNRDNote(
      post,
      facts,
      angle
    );


  return {

    version:
      PERSONA_VERSION,

    style:
      style,

    angle:
      angle,

    headline:
      headline,

    influencerText:
      influencerText,

    note:
      note,

    languageMode:
      facts.languageMode,

    timeState:
      facts.timeState,

    factsUsed:
      facts.used,

    generatedAt:
      new Date()
        .toISOString()

  };

}


/* =========================================================
   PERSONAYI POSTA UYGULA
   ========================================================= */

export function applyPersona(
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


  const persona =
    buildPersona(
      post,
      options
    );


  return {

    ...post,

    editorial: {

      ...(
        isPlainObject(
          post.editorial
        )
          ? post.editorial
          : {}
      ),

      enabled:
        true,

      label:
        "SporNRD Özeti",

      version:
        `6.1.2-persona-${PERSONA_VERSION}`,

      headline:
        persona.headline,

      influencerText:
        persona.influencerText,

      style:
        persona.style,

      angle:
        persona.angle,

      note:
        persona.note

    },


    personaMeta: {

      version:
        persona.version,

      style:
        persona.style,

      angle:
        persona.angle,

      languageMode:
        persona.languageMode,

      timeState:
        persona.timeState,

      factsUsed:
        persona.factsUsed,

      generatedAt:
        persona.generatedAt

    }

  };

}


/* =========================================================
   SADECE PERSONA AÇISI
   ========================================================= */

export function choosePersonaAngle(
  post
) {

  const facts =
    collectFacts(
      post
    );


  return chooseAngle(
    post,
    facts
  );

}


/* =========================================================
   GERÇEKLERİ TOPLA
   ========================================================= */

function collectFacts(
  post
) {

  const details =
    isPlainObject(
      post.details
    )
      ? post.details
      : {};


  const location =
    isPlainObject(
      post.location
    )
      ? post.location
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


  const temporal =
    isPlainObject(
      post.temporal
    )
      ? post.temporal
      : {};


  const intentMeta =
    isPlainObject(
      post.intentMeta
    )
      ? post.intentMeta
      : {};


  /* =======================================================
     TAXONOMY
     ========================================================= */

  const sportDefinition =
    getSport(
      post.sport
    );


  const sectionDefinition =
    getSection(
      post.section
    );


  const categoryDefinition =
    getCategory(
      post.category
    );


  const subCategoryDefinition =
    getSubCategory(
      post.category,
      post.subCategory
    );


  const providerDefinition =
    getProviderType(
      post.providerType
    );


  /* =======================================================
     FİYAT
     ========================================================= */

  const price =
    firstNumber(

      details.price,

      details.newPrice,

      details.salePrice

    );


  const oldPrice =
    nullableNumber(
      details.oldPrice
    );


  const discountRate =
    resolveDiscountRate(
      details,
      oldPrice,
      price
    );


  /* =======================================================
     YAŞ
     ========================================================= */

  const ageMin =
    nullableNumber(
      details.ageMin
    );


  const ageMax =
    nullableNumber(
      details.ageMax
    );


  /* =======================================================
     PROGRAM
     ========================================================= */

  const days =
    stringArray(
      details.days
    );


  /* =======================================================
     TARİHLER

     Öncelik Temporal Engine.

     Çünkü artık gerçek tarih kararı merkezi olarak
     temporalEngine.js tarafından veriliyor.
     ========================================================= */

  const startDate =
    cleanString(

      temporal.startDate ||

      details.startDate ||

      lifecycle.startsAt

    );


  const endDate =
    cleanString(

      temporal.endDate ||

      details.endDate ||

      lifecycle.endsAt

    );


  const deadline =
    cleanString(

      temporal.deadlineAt ||

      details.registrationDeadline ||

      details.applicationDeadline ||

      lifecycle.expiresAt

    );


  const publishedAt =
    cleanString(

      temporal.publishedAt ||

      source.publishedAt ||

      lifecycle.publishedAt

    );


  /* =======================================================
     INTENT
     ========================================================= */

  const contentIntent =
    normalizeId(
      post.contentIntent
    );


  const eventStatus =
    normalizeId(

      temporal.eventStatus ||

      post.eventStatus

    );


  const timeState =
    normalizeId(
      temporal.state
    )
    ||
    "unknown";


  const languageMode =
    normalizeId(
      temporal.languageMode
    )
    ||
    "neutral";


  const actionState =
    normalizeId(
      temporal.actionState
    )
    ||
    "unknown";


  const temporalBasis =
    normalizeId(
      temporal.basis
    )
    ||
    "none";


  const freshness =
    normalizeId(
      temporal.freshness
    )
    ||
    "unknown";


  /* =======================================================
     KULLANILAN GERÇEKLER
     ========================================================= */

  const used =
    [];


  if (
    sportDefinition?.label
  ) {

    used.push(
      "sport"
    );

  }


  if (
    post.section
  ) {

    used.push(
      "section"
    );

  }


  if (
    post.category
  ) {

    used.push(
      "category"
    );

  }


  if (
    contentIntent
  ) {

    used.push(
      "contentIntent"
    );

  }


  if (
    timeState
  ) {

    used.push(
      "temporal"
    );

  }


  if (
    location.city
  ) {

    used.push(
      "city"
    );

  }


  if (
    location.district
  ) {

    used.push(
      "district"
    );

  }


  if (
    days.length
  ) {

    used.push(
      "days"
    );

  }


  if (
    details.startTime
  ) {

    used.push(
      "startTime"
    );

  }


  if (
    ageMin !==
    null ||
    ageMax !==
    null
  ) {

    used.push(
      "age"
    );

  }


  if (
    price !==
    null
  ) {

    used.push(
      "price"
    );

  }


  if (
    deadline
  ) {

    used.push(
      "deadline"
    );

  }


  if (
    discountRate !==
    null
  ) {

    used.push(
      "discount"
    );

  }


  /* =======================================================
     SONUÇ
     ========================================================= */

  return {

    sport:
      sportDefinition?.label ||
      cleanString(
        post.sport
      )
      ||
      "Spor",

    sportEmoji:
      sportDefinition?.emoji ||
      "🏆",


    section:
      sectionDefinition?.label ||
      "",


    category:
      categoryDefinition?.label ||
      cleanString(
        post.category
      ),


    subCategory:
      subCategoryDefinition?.label ||
      cleanString(
        post.subCategory
      ),


    providerType:
      providerDefinition?.label ||
      cleanString(
        post.providerType
      ),


    /* -----------------------------------------------------
       Kaynak
       ----------------------------------------------------- */

    sourceName:
      cleanString(
        source.name
      ),

    sourceShortName:
      cleanString(
        source.shortName
      ),


    /* -----------------------------------------------------
       Orijinal
       ----------------------------------------------------- */

    originalTitle:
      cleanString(

        post.editorial?.originalTitle ||

        post.originalTitle ||

        post.title

      ),

    originalText:
      cleanString(

        post.editorial?.originalText ||

        post.originalText ||

        post.summary

      ),

    currentHeadline:
      cleanString(
        post.editorial?.headline
      ),


    /* -----------------------------------------------------
       Konum
       ----------------------------------------------------- */

    city:
      cleanString(
        location.city
      ),

    district:
      cleanString(
        location.district
      ),

    venue:
      cleanString(
        location.venue
      ),


    /* -----------------------------------------------------
       Fiyat
       ----------------------------------------------------- */

    price:
      price,

    oldPrice:
      oldPrice,

    currency:
      cleanString(
        details.currency ||
        "TRY"
      ),

    priceUnit:
      cleanString(
        details.priceUnit
      ),

    discountRate:
      discountRate,


    /* -----------------------------------------------------
       Program
       ----------------------------------------------------- */

    days:
      days,

    startTime:
      cleanString(
        details.startTime
      ),

    endTime:
      cleanString(
        details.endTime
      ),

    startDate:
      startDate,

    endDate:
      endDate,

    deadline:
      deadline,

    publishedAt:
      publishedAt,


    /* -----------------------------------------------------
       Yaş
       ----------------------------------------------------- */

    ageMin:
      ageMin,

    ageMax:
      ageMax,

    ageGroup:
      cleanString(
        details.ageGroup
      ),


    /* -----------------------------------------------------
       Kurs
       ----------------------------------------------------- */

    level:
      cleanString(
        details.level
      ),

    lessonType:
      cleanString(
        details.lessonType
      ),

    capacity:
      nullableNumber(
        details.capacity
      ),


    /* -----------------------------------------------------
       İş
       ----------------------------------------------------- */

    position:
      cleanString(
        details.position
      ),

    employmentType:
      cleanString(
        details.employmentType
      ),

    workMode:
      cleanString(
        details.workMode
      ),

    salaryMin:
      nullableNumber(
        details.salaryMin
      ),

    salaryMax:
      nullableNumber(
        details.salaryMax
      ),


    /* -----------------------------------------------------
       Ürün
       ----------------------------------------------------- */

    brand:
      cleanString(
        details.brand
      ),

    productName:
      cleanString(
        details.productName
      ),

    stockStatus:
      cleanString(
        details.stockStatus
      ),


    /* -----------------------------------------------------
       Anlam
       ----------------------------------------------------- */

    contentIntent:
      contentIntent,

    eventStatus:
      eventStatus,

    actionable:
      post.actionable ===
      true,

    feedTreatment:
      cleanString(
        intentMeta.feedTreatment
      ),


    /* -----------------------------------------------------
       Temporal
       ----------------------------------------------------- */

    timeState:
      timeState,

    languageMode:
      languageMode,

    actionState:
      actionState,

    temporalBasis:
      temporalBasis,

    freshness:
      freshness,

    daysUntilStart:
      nullableNumber(
        temporal.daysUntilStart
      ),

    daysUntilEnd:
      nullableNumber(
        temporal.daysUntilEnd
      ),

    daysUntilDeadline:
      nullableNumber(
        temporal.daysUntilDeadline
      ),


    /* -----------------------------------------------------
       Lifecycle
       ----------------------------------------------------- */

    lifecycleStatus:
      normalizeId(
        lifecycle.status
      ),


    used:
      [
        ...new Set(
          used
        )
      ]

  };

}


/* =========================================================
   AÇI SEÇ
   ========================================================= */

function chooseAngle(
  post,
  facts
) {

  /* =======================================================
     HABER

     Haber kendi başına bir ana kategoridir.
     ========================================================= */

  if (
    post.category ===
    "news"
  ) {

    switch (
      normalizeId(
        post.subCategory
      )
    ) {

      case "result":

        return "result";


      case "achievement":

        return "achievement";


      case "assignment":

        return "assignment";


      case "transfer":

        return "transfer";


      case "announcement":

        return "announcement";


      default:

        return "news";

    }

  }


  /* =======================================================
     TAMAMLANMIŞ SONUÇ

     Discovery yanlış sınıflandırmış olsa bile
     güvenlik katmanı.
     ========================================================= */

  if (
    facts.contentIntent ===
    "result"
    ||
    facts.eventStatus ===
    "completed"
  ) {

    return "result";

  }


  /* =======================================================
     KURS
     ========================================================= */

  if (
    post.category ===
    "course"
  ) {

    if (
      facts.actionState ===
      "closed"
    ) {

      return "expired";

    }


    if (
      facts.lifecycleStatus ===
      "closing_soon"
      ||
      facts.actionState ===
      "closing_today"
    ) {

      return "deadline";

    }


    if (
      isChildAudience(
        facts
      )
    ) {

      return "family";

    }


    if (
      facts.contentIntent ===
      "registration"
    ) {

      return "registration";

    }


    return "course";

  }


  /* =======================================================
     ETKİNLİK
     ========================================================= */

  if (
    post.category ===
    "event"
  ) {

    if (
      facts.timeState ===
      "past"
    ) {

      return "past_event";

    }


    if (
      facts.actionState ===
      "closed"
    ) {

      return "expired";

    }


    return "event";

  }


  /* =======================================================
     KAMPANYA
     ========================================================= */

  if (
    post.category ===
    "campaign"
  ) {

    if (
      facts.timeState ===
      "past"
      ||
      facts.actionState ===
      "closed"
    ) {

      return "expired";

    }


    return "opportunity";

  }


  /* =======================================================
     İŞ
     ========================================================= */

  if (
    post.category ===
    "jobs"
  ) {

    if (
      facts.actionState ===
      "closed"
    ) {

      return "expired";

    }


    return "career";

  }


  /* =======================================================
     MAĞAZA
     ========================================================= */

  if (
    post.category ===
    "stores"
  ) {

    return "product";

  }


  return "discovery";

}


/* =========================================================
   STYLE SEÇ
   ========================================================= */

function chooseStyle(
  angle
) {

  if (
    [
      "result",
      "achievement"
    ].includes(
      angle
    )
  ) {

    return PERSONA_STYLES.result;

  }


  if (
    [
      "news",
      "assignment",
      "transfer",
      "announcement"
    ].includes(
      angle
    )
  ) {

    return PERSONA_STYLES.news;

  }


  if (
    angle ===
    "family"
  ) {

    return PERSONA_STYLES.family;

  }


  if (
    angle ===
    "career"
  ) {

    return PERSONA_STYLES.professional;

  }


  if (
    [
      "deadline",
      "expired"
    ].includes(
      angle
    )
  ) {

    return PERSONA_STYLES.reminder;

  }


  if (
    [
      "opportunity",
      "product"
    ].includes(
      angle
    )
  ) {

    return PERSONA_STYLES.opportunity;

  }


  if (
    [
      "course",
      "registration"
    ].includes(
      angle
    )
  ) {

    return PERSONA_STYLES.practical;

  }


  if (
    angle ===
    "event"
  ) {

    return PERSONA_STYLES.discovery;

  }


  return PERSONA_STYLES.informative;

}


/* =========================================================
   BAŞLIK ÜRET
   ========================================================= */

function buildHeadline(
  post,
  facts,
  angle
) {

  const original =
    getBaseTitle(
      facts
    );


  /* =======================================================
     HABER
     ========================================================= */

  if (
    post.category ===
    "news"
  ) {

    return buildNewsHeadline(
      facts,
      angle
    );

  }


  /* =======================================================
     SÜRESİ GEÇMİŞ
     ========================================================= */

  if (
    angle ===
    "expired"
  ) {

    return shorten(
      `⏳ ${original}`,
      120
    );

  }


  /* =======================================================
     KAYIT SON TARİHİ
     ========================================================= */

  if (
    angle ===
    "deadline"
  ) {

    return shorten(
      `⏳ ${original}`,
      120
    );

  }


  /* =======================================================
     AİLE
     ========================================================= */

  if (
    angle ===
    "family"
  ) {

    return shorten(

      `${facts.sportEmoji} ${original}`,

      120

    );

  }


  /* =======================================================
     KURS
     ========================================================= */

  if (
    [
      "course",
      "registration"
    ].includes(
      angle
    )
  ) {

    return shorten(
      `${facts.sportEmoji} ${original}`,
      120
    );

  }


  /* =======================================================
     ETKİNLİK
     ========================================================= */

  if (
    [
      "event",
      "past_event"
    ].includes(
      angle
    )
  ) {

    return shorten(
      `${facts.sportEmoji} ${original}`,
      120
    );

  }


  /* =======================================================
     KAMPANYA
     ========================================================= */

  if (
    angle ===
    "opportunity"
  ) {

    if (
      facts.discountRate !==
      null
    ) {

      return shorten(

        `👀 %${formatNumber(
          facts.discountRate
        )} indirim: ${original}`,

        120

      );

    }


    return shorten(
      `👀 ${original}`,
      120
    );

  }


  /* =======================================================
     İŞ
     ========================================================= */

  if (
    angle ===
    "career"
  ) {

    return shorten(
      `💼 ${original}`,
      120
    );

  }


  /* =======================================================
     MAĞAZA
     ========================================================= */

  if (
    angle ===
    "product"
  ) {

    const product =
      facts.productName ||
      original;


    if (
      facts.price !==
      null
    ) {

      return shorten(

        `🛍️ ${product} · ${formatMoney(
          facts.price,
          facts.currency
        )}`,

        120

      );

    }


    return shorten(
      `🛍️ ${product}`,
      120
    );

  }


  return shorten(
    `${facts.sportEmoji} ${original}`,
    120
  );

}


/* =========================================================
   HABER BAŞLIĞI
   ========================================================= */

function buildNewsHeadline(
  facts,
  angle
) {

  const title =
    cleanHeadline(
      facts.originalTitle ||
      facts.currentHeadline
    );


  if (
    !title
  ) {

    return `${facts.sportEmoji} ${facts.sport} Haber`;

  }


  if (
    angle ===
    "result"
  ) {

    return shorten(
      `🏆 ${title}`,
      120
    );

  }


  if (
    angle ===
    "achievement"
  ) {

    return shorten(
      `👏 ${title}`,
      120
    );

  }


  if (
    angle ===
    "assignment"
  ) {

    return shorten(
      `📣 ${title}`,
      120
    );

  }


  if (
    angle ===
    "transfer"
  ) {

    return shorten(
      `🔄 ${title}`,
      120
    );

  }


  if (
    angle ===
    "announcement"
  ) {

    return shorten(
      `📢 ${title}`,
      120
    );

  }


  return shorten(
    `${facts.sportEmoji} ${title}`,
    120
  );

}


/* =========================================================
   INFLUENCER METNİ
   ========================================================= */

function buildInfluencerText(
  post,
  facts,
  angle
) {

  switch (
    post.category
  ) {

    case "news":

      return buildNewsText(
        facts,
        angle
      );


    case "course":

      return buildCourseText(
        facts,
        angle
      );


    case "event":

      return buildEventText(
        facts,
        angle
      );


    case "campaign":

      return buildCampaignText(
        facts,
        angle
      );


    case "jobs":

      return buildJobText(
        facts,
        angle
      );


    case "stores":

      return buildStoreText(
        facts
      );


    default:

      return buildGenericText(
        facts
      );

  }

}


/* =========================================================
   HABER METNİ
   ========================================================= */

function buildNewsText(
  facts,
  angle
) {

  const sentences =
    [];


  const publishLead =
    buildPublishFreshnessSentence(
      facts
    );


  if (
    publishLead
  ) {

    sentences.push(
      publishLead
    );

  }


  /* -------------------------------------------------------
     Haber türü
     ------------------------------------------------------- */

  if (
    angle ===
    "result"
  ) {

    sentences.push(
      "Sonuç netleşti."
    );

  }


  else if (
    angle ===
    "achievement"
  ) {

    sentences.push(
      "Spor tarafında dikkat çeken bir başarı haberi var."
    );

  }


  else if (
    angle ===
    "assignment"
  ) {

    sentences.push(
      "Yeni bir görevlendirme gelişmesi paylaşıldı."
    );

  }


  else if (
    angle ===
    "transfer"
  ) {

    sentences.push(
      "Kariyer tarafında yeni bir gelişme var."
    );

  }


  else if (
    angle ===
    "announcement"
  ) {

    sentences.push(
      "Yeni bir açıklama veya duyuru paylaşıldı."
    );

  }


  /* -------------------------------------------------------
     Kaynaktaki gerçek açıklama
     ------------------------------------------------------- */

  if (
    facts.originalText
  ) {

    sentences.push(
      shorten(
        facts.originalText,
        340
      )
    );

  }

  else if (
    facts.originalTitle
  ) {

    sentences.push(
      `${cleanHeadline(
        facts.originalTitle
      )}.`
    );

  }


  return finalizeText(
    sentences,
    "Ayrıntıları kaynağın kendi paylaşımından inceleyebilirsin."
  );

}


/* =========================================================
   KURS METNİ
   ========================================================= */

function buildCourseText(
  facts,
  angle
) {

  const sentences =
    [];


  const location =
    readableLocation(
      facts
    );


  /* -------------------------------------------------------
     ZAMAN
     ------------------------------------------------------- */

  if (
    facts.actionState ===
    "closed"
  ) {

    sentences.push(
      "Bu kurs için belirtilen kayıt veya başvuru süresi sona ermiş görünüyor."
    );

  }


  else if (
    facts.timeState ===
    "future"
  ) {

    sentences.push(

      location

        ? `${location} tarafında yaklaşan bir ${facts.sport.toLocaleLowerCase(
            "tr-TR"
          )} kursu var.`

        : `${facts.sport} tarafında yaklaşan bir kurs var.`

    );

  }


  else if (
    facts.timeState ===
    "present"
  ) {

    sentences.push(

      location

        ? `${location} tarafındaki bu ${facts.sport.toLocaleLowerCase(
            "tr-TR"
          )} programı şu anda devam ediyor.`

        : `Bu ${facts.sport.toLocaleLowerCase(
            "tr-TR"
          )} programı şu anda devam ediyor.`

    );

  }


  else if (
    facts.timeState ===
    "past"
  ) {

    sentences.push(
      "Kaynakta belirtilen kurs dönemi geçmiş durumda."
    );

  }


  else {

    const freshness =
      buildPublishFreshnessSentence(
        facts
      );


    if (
      freshness
    ) {

      sentences.push(
        freshness
      );

    }


    sentences.push(

      location

        ? `${location} tarafında ${facts.sport.toLocaleLowerCase(
            "tr-TR"
          )} kursu arayanların inceleyebileceği bir seçenek.`

        : `${facts.sport} kursu arayanların inceleyebileceği bir seçenek.`

    );

  }


  /* -------------------------------------------------------
     Başlangıç
     ------------------------------------------------------- */

  if (
    facts.startDate
  ) {

    sentences.push(
      `Başlangıç tarihi ${facts.startDate}.`
    );

  }


  /* -------------------------------------------------------
     Program
     ------------------------------------------------------- */

  const schedule =
    buildScheduleSentence(
      facts
    );


  if (
    schedule
  ) {

    sentences.push(
      schedule
    );

  }


  /* -------------------------------------------------------
     Yaş
     ------------------------------------------------------- */

  const age =
    buildAgeSentence(
      facts
    );


  if (
    age
  ) {

    sentences.push(
      age
    );

  }


  /* -------------------------------------------------------
     Fiyat
     ------------------------------------------------------- */

  const price =
    buildPriceSentence(
      facts
    );


  if (
    price
  ) {

    sentences.push(
      price
    );

  }


  /* -------------------------------------------------------
     Kontenjan
     ------------------------------------------------------- */

  if (
    facts.capacity !==
    null
  ) {

    sentences.push(
      `Kaynakta kontenjan ${formatNumber(
        facts.capacity
      )} kişi olarak belirtilmiş.`
    );

  }


  /* -------------------------------------------------------
     Deadline
     ------------------------------------------------------- */

  if (
    facts.deadline
  ) {

    sentences.push(
      `Belirtilen son kayıt / başvuru tarihi ${facts.deadline}.`
    );

  }


  /* -------------------------------------------------------
     Bitiş
     ------------------------------------------------------- */

  if (
    facts.actionState ===
    "closed"
  ) {

    return finalizeText(
      sentences,
      "Yeni dönem veya güncel kayıt bilgisi için kaynağı kontrol edebilirsin."
    );

  }


  return finalizeText(
    sentences,
    "Güncel kayıt durumunu ve şartları kaynağın kendi sayfasından kontrol edebilirsin."
  );

}


/* =========================================================
   ETKİNLİK METNİ
   ========================================================= */

function buildEventText(
  facts,
  angle
) {

  const sentences =
    [];


  const location =
    readableLocation(
      facts
    );


  /* -------------------------------------------------------
     Geçmiş
     ------------------------------------------------------- */

  if (
    angle ===
    "past_event"
    ||
    facts.timeState ===
    "past"
  ) {

    sentences.push(
      "Bu etkinlik için belirtilen tarih geçmiş durumda."
    );

  }


  /* -------------------------------------------------------
     Şimdi
     ------------------------------------------------------- */

  else if (
    facts.timeState ===
    "present"
  ) {

    sentences.push(

      location

        ? `${location} tarafındaki etkinlik şu anda devam ediyor.`

        : "Etkinlik şu anda devam ediyor."

    );

  }


  /* -------------------------------------------------------
     Gelecek
     ------------------------------------------------------- */

  else if (
    facts.timeState ===
    "future"
  ) {

    sentences.push(

      location

        ? `${location} tarafında yaklaşan bir spor etkinliği var.`

        : `${facts.sport} tarafında yaklaşan bir etkinlik var.`

    );

  }


  /* -------------------------------------------------------
     Tarih bilinmiyor
     ------------------------------------------------------- */

  else {

    const freshness =
      buildPublishFreshnessSentence(
        facts
      );


    if (
      freshness
    ) {

      sentences.push(
        freshness
      );

    }


    sentences.push(
      `${facts.sport} tarafında bir etkinlik duyurusu bulunuyor.`
    );

  }


  /* -------------------------------------------------------
     Tarihler
     ------------------------------------------------------- */

  if (
    facts.startDate
  ) {

    sentences.push(
      `Başlangıç: ${facts.startDate}.`
    );

  }


  if (
    facts.endDate
  ) {

    sentences.push(
      `Bitiş: ${facts.endDate}.`
    );

  }


  /* -------------------------------------------------------
     Saat
     ------------------------------------------------------- */

  const time =
    buildTimeText(
      facts
    );


  if (
    time
  ) {

    sentences.push(
      `Saat bilgisi ${time}.`
    );

  }


  /* -------------------------------------------------------
     Fiyat
     ------------------------------------------------------- */

  const price =
    buildPriceSentence(
      facts
    );


  if (
    price
  ) {

    sentences.push(
      price
    );

  }


  /* -------------------------------------------------------
     Kayıt son tarihi
     ------------------------------------------------------- */

  if (
    facts.deadline
  ) {

    sentences.push(
      `Belirtilen kayıt / başvuru son tarihi ${facts.deadline}.`
    );

  }


  if (
    facts.actionState ===
    "closed"
  ) {

    sentences.push(
      "Katılım tarihi ileride olsa bile belirtilen başvuru süresi sona ermiş olabilir."
    );

  }


  return finalizeText(
    sentences,
    "Program ve katılım şartlarını kaynağın kendi sayfasından kontrol edebilirsin."
  );

}


/* =========================================================
   KAMPANYA METNİ
   ========================================================= */

function buildCampaignText(
  facts,
  angle
) {

  const sentences =
    [];


  if (
    angle ===
    "expired"
    ||
    facts.timeState ===
    "past"
    ||
    facts.actionState ===
    "closed"
  ) {

    sentences.push(
      "Bu kampanya için belirtilen geçerlilik süresi sona ermiş görünüyor."
    );

  }


  else if (
    facts.timeState ===
    "future"
  ) {

    sentences.push(
      "Bu kampanya henüz başlamamış; belirtilen başlangıç tarihini takip etmekte fayda var."
    );

  }


  else if (
    facts.timeState ===
    "present"
  ) {

    sentences.push(
      "Kaynakta yer alan tarihlere göre kampanya şu anda geçerli."
    );

  }


  else {

    const freshness =
      buildPublishFreshnessSentence(
        facts
      );


    if (
      freshness
    ) {

      sentences.push(
        freshness
      );

    }


    sentences.push(
      "Spor tarafında dikkat çeken bir kampanya paylaşılmış."
    );

  }


  if (
    facts.discountRate !==
    null
  ) {

    sentences.push(
      `Belirtilen indirim oranı %${formatNumber(
        facts.discountRate
      )}.`
    );

  }


  if (
    facts.oldPrice !==
    null &&
    facts.price !==
    null
  ) {

    sentences.push(
      `Kaynakta ${formatMoney(
        facts.oldPrice,
        facts.currency
      )} yerine ${formatMoney(
        facts.price,
        facts.currency
      )} olarak görünüyor.`
    );

  }

  else if (
    facts.price !==
    null
  ) {

    sentences.push(
      `Belirtilen fiyat ${formatMoney(
        facts.price,
        facts.currency
      )}.`
    );

  }


  if (
    facts.endDate
  ) {

    sentences.push(
      `Belirtilen bitiş tarihi ${facts.endDate}.`
    );

  }


  return finalizeText(
    sentences,
    "Fiyat ve kampanya koşulları değişebileceği için işlem öncesinde kaynağı kontrol etmek iyi olur."
  );

}


/* =========================================================
   İŞ İLANI METNİ
   ========================================================= */

function buildJobText(
  facts,
  angle
) {

  const sentences =
    [];


  const location =
    readableLocation(
      facts
    );


  if (
    angle ===
    "expired"
    ||
    facts.actionState ===
    "closed"
  ) {

    sentences.push(
      "Bu ilan için belirtilen başvuru süresi sona ermiş görünüyor."
    );

  }

  else {

    const freshness =
      buildPublishFreshnessSentence(
        facts
      );


    if (
      freshness
    ) {

      sentences.push(
        freshness
      );

    }


    if (
      facts.position
    ) {

      sentences.push(
        `${facts.position} pozisyonuyla ilgilenenler için bir ilan var.`
      );

    }

    else {

      sentences.push(
        `${facts.sport} alanında yeni bir iş fırsatı bulunuyor.`
      );

    }

  }


  if (
    location
  ) {

    sentences.push(
      `Konum: ${location}.`
    );

  }


  const work =
    [

      facts.employmentType,

      facts.workMode

    ]
      .filter(
        Boolean
      )
      .join(
        " · "
      );


  if (
    work
  ) {

    sentences.push(
      `Çalışma şekli: ${work}.`
    );

  }


  const salary =
    buildSalaryText(
      facts
    );


  if (
    salary
  ) {

    sentences.push(
      salary
    );

  }


  if (
    facts.deadline
  ) {

    sentences.push(
      `Son başvuru tarihi ${facts.deadline}.`
    );

  }


  return finalizeText(
    sentences,
    "Şartların tamamını ve başvuru yöntemini ilanın asıl kaynağından kontrol edebilirsin."
  );

}


/* =========================================================
   MAĞAZA METNİ
   ========================================================= */

function buildStoreText(
  facts
) {

  const sentences =
    [];


  const product =
    facts.productName ||
    facts.originalTitle ||
    "Bu ürün";


  if (
    facts.brand
  ) {

    sentences.push(
      `${facts.brand} imzalı ${product} spor alışverişi yapanların radarına girebilir.`
    );

  }

  else {

    sentences.push(
      `${product} spor alışverişi yapanların radarına girebilir.`
    );

  }


  if (
    facts.oldPrice !==
    null &&
    facts.price !==
    null
  ) {

    sentences.push(
      `Kaynakta ${formatMoney(
        facts.oldPrice,
        facts.currency
      )} yerine ${formatMoney(
        facts.price,
        facts.currency
      )} olarak listeleniyor.`
    );

  }

  else if (
    facts.price !==
    null
  ) {

    sentences.push(
      `Listelenen fiyat ${formatMoney(
        facts.price,
        facts.currency
      )}.`
    );

  }


  if (
    facts.stockStatus
  ) {

    sentences.push(
      `Stok bilgisi “${facts.stockStatus}” olarak belirtilmiş.`
    );

  }


  return finalizeText(
    sentences,
    "Fiyat ve stok değişebileceği için satın almadan önce mağaza kaynağını kontrol etmek iyi olur."
  );

}


/* =========================================================
   GENEL METİN
   ========================================================= */

function buildGenericText(
  facts
) {

  const sentences =
    [];


  const freshness =
    buildPublishFreshnessSentence(
      facts
    );


  if (
    freshness
  ) {

    sentences.push(
      freshness
    );

  }


  sentences.push(
    `${facts.sport} tarafında yeni bir içerik var: ${getBaseTitle(
      facts
    )}.`
  );


  return finalizeText(
    sentences,
    "Ayrıntıları asıl kaynaktan inceleyebilirsin."
  );

}


/* =========================================================
   YAYIN GÜNCELLİĞİ DİLİ

   Burada yayın tarihi olay tarihi yapılmaz.
   ========================================================= */

function buildPublishFreshnessSentence(
  facts
) {

  if (
    facts.temporalBasis !==
    "published_at"
    &&
    !facts.publishedAt
  ) {

    return "";

  }


  switch (
    facts.languageMode
  ) {

    case "published_today":

      return facts.sourceName
        ? `${facts.sourceName} bu içeriği bugün yayımladı.`
        : "Bu içerik bugün yayımlandı.";


    case "published_recent":

      return facts.sourceName
        ? `${facts.sourceName} bu içeriği kısa süre önce yayımladı.`
        : "Bu içerik kısa süre önce yayımlandı.";


    case "published_current":

      return facts.sourceName
        ? `${facts.sourceName} bu içeriği yakın zamanda yayımladı.`
        : "Bu içerik yakın zamanda yayımlandı.";


    case "published_old":

      return "Bu içerik daha önce yayımlanmış; güncel durumu yeniden kontrol etmekte fayda var.";


    default:

      return "";

  }

}


/* =========================================================
   SPORNRD NOTU
   ========================================================= */

function buildSporNRDNote(
  post,
  facts,
  angle
) {

  if (
    post.category ===
    "news"
    &&
    [
      "result",
      "achievement"
    ].includes(
      angle
    )
  ) {

    return "Bu içerik haber niteliğinde; yaklaşan etkinlik olarak değerlendirilmemeli.";

  }


  if (
    facts.actionState ===
    "closed"
  ) {

    return "Belirtilen işlem süresi geçmiş; kullanıcıya aktif başvuru veya kayıt çağrısı yapılmamalı.";

  }


  if (
    facts.timeState ===
    "future"
  ) {

    return "İçerik ileri tarihli; gelecek zaman dili kullanılmalı.";

  }


  if (
    facts.timeState ===
    "present"
  ) {

    return "İçerik bugün veya devam eden zaman aralığında.";

  }


  if (
    facts.timeState ===
    "past"
  ) {

    return "İçerikteki gerçek tarih geçmiş durumda; yaklaşan fırsat dili kullanılmamalı.";

  }


  if (
    facts.temporalBasis ===
    "published_at"
  ) {

    return "Olay tarihi bilinmiyor; yayın tarihi yalnızca güncellik anlatımı için kullanılmalı.";

  }


  return "";

}


/* =========================================================
   TAKVİM CÜMLESİ
   ========================================================= */

function buildScheduleSentence(
  facts
) {

  const parts =
    [];


  if (
    facts.days.length
  ) {

    parts.push(
      facts.days.join(
        ", "
      )
    );

  }


  const time =
    buildTimeText(
      facts
    );


  if (
    time
  ) {

    parts.push(
      time
    );

  }


  if (
    !parts.length
  ) {

    return "";

  }


  return (
    `Program ${parts.join(
      " · "
    )} şeklinde belirtilmiş.`
  );

}


/* =========================================================
   SAAT
   ========================================================= */

function buildTimeText(
  facts
) {

  if (
    facts.startTime &&
    facts.endTime
  ) {

    return (
      `${facts.startTime}–${facts.endTime}`
    );

  }


  if (
    facts.startTime
  ) {

    return facts.startTime;

  }


  return "";

}


/* =========================================================
   YAŞ
   ========================================================= */

function buildAgeSentence(
  facts
) {

  if (
    facts.ageMin !==
    null &&
    facts.ageMax !==
    null
  ) {

    return (
      `${formatNumber(
        facts.ageMin
      )}–${formatNumber(
        facts.ageMax
      )} yaş grubu için belirtilmiş.`
    );

  }


  if (
    facts.ageMin !==
    null
  ) {

    return (
      `${formatNumber(
        facts.ageMin
      )} yaş ve üzeri için belirtilmiş.`
    );

  }


  if (
    facts.ageMax !==
    null
  ) {

    return (
      `${formatNumber(
        facts.ageMax
      )} yaşa kadar katılım bilgisi bulunuyor.`
    );

  }


  if (
    facts.ageGroup
  ) {

    return (
      `Yaş grubu: ${facts.ageGroup}.`
    );

  }


  return "";

}


/* =========================================================
   FİYAT
   ========================================================= */

function buildPriceSentence(
  facts
) {

  if (
    facts.price ===
    null
  ) {

    return "";

  }


  let text =
    `Kaynakta ücret ${formatMoney(
      facts.price,
      facts.currency
    )}`;


  if (
    facts.priceUnit
  ) {

    text +=
      ` / ${facts.priceUnit}`;

  }


  return (
    text +
    " olarak belirtilmiş."
  );

}


/* =========================================================
   MAAŞ
   ========================================================= */

function buildSalaryText(
  facts
) {

  if (
    facts.salaryMin ===
    null &&
    facts.salaryMax ===
    null
  ) {

    return "";

  }


  if (
    facts.salaryMin !==
    null &&
    facts.salaryMax !==
    null
  ) {

    return (
      `Ücret aralığı ${formatMoney(
        facts.salaryMin,
        facts.currency
      )} – ${formatMoney(
        facts.salaryMax,
        facts.currency
      )} olarak belirtilmiş.`
    );

  }


  if (
    facts.salaryMin !==
    null
  ) {

    return (
      `Belirtilen başlangıç ücreti ${formatMoney(
        facts.salaryMin,
        facts.currency
      )}.`
    );

  }


  return (
    `Belirtilen ücret ${formatMoney(
      facts.salaryMax,
      facts.currency
    )}.`
  );

}


/* =========================================================
   FİYAT FORMAT
   ========================================================= */

function formatMoney(
  value,
  currency
) {

  const number =
    nullableNumber(
      value
    );


  if (
    number ===
    null
  ) {

    return "";

  }


  const currencyCode =
    cleanString(
      currency ||
      "TRY"
    )
      .toUpperCase();


  try {

    return new Intl.NumberFormat(

      "tr-TR",

      {

        style:
          "currency",

        currency:
          currencyCode,

        maximumFractionDigits:
          number % 1 ===
          0
            ? 0
            : 2

      }

    ).format(
      number
    );

  }

  catch {

    return (
      `${formatNumber(
        number
      )} ${currencyCode}`
    );

  }

}


/* =========================================================
   İNDİRİM ORANI
   ========================================================= */

function resolveDiscountRate(
  details,
  oldPrice,
  currentPrice
) {

  const explicit =
    nullableNumber(
      details.discountRate
    );


  if (
    explicit !==
    null
  ) {

    return clamp(
      explicit,
      0,
      100
    );

  }


  if (
    oldPrice ===
    null ||
    currentPrice ===
    null ||
    oldPrice <=
    0 ||
    currentPrice >=
    oldPrice
  ) {

    return null;

  }


  return Math.round(

    (
      (
        oldPrice -
        currentPrice
      )
      /
      oldPrice
    )
    *
    100

  );

}


/* =========================================================
   ÇOCUK HEDEF KİTLE
   ========================================================= */

function isChildAudience(
  facts
) {

  if (
    facts.ageMax !==
    null &&
    facts.ageMax <=
    17
  ) {

    return true;

  }


  if (
    facts.ageMin !==
    null &&
    facts.ageMin <
    18
  ) {

    return true;

  }


  const text =
    normalizeText(
      facts.ageGroup
    );


  return Boolean(

    text.includes(
      "cocuk"
    )

    ||

    text.includes(
      "minik"
    )

    ||

    text.includes(
      "genc"
    )

  );

}


/* =========================================================
   KONUM
   ========================================================= */

function readableLocation(
  facts
) {

  const parts =
    [

      facts.district,

      facts.city

    ]
      .filter(
        Boolean
      );


  return [
    ...new Set(
      parts
    )
  ].join(
    " / "
  );

}


/* =========================================================
   TEMEL BAŞLIK
   ========================================================= */

function getBaseTitle(
  facts
) {

  return (

    cleanHeadline(
      facts.originalTitle
    )

    ||

    cleanHeadline(
      facts.currentHeadline
    )

    ||

    facts.subCategory

    ||

    facts.category

    ||

    `${facts.sport} içeriği`

  );

}


/* =========================================================
   BAŞLIK TEMİZLE
   ========================================================= */

function cleanHeadline(
  value
) {

  return cleanString(
    value
  )
    .replace(
      /[.!…]+$/,
      ""
    )
    .trim();

}


/* =========================================================
   METNİ SONLANDIR
   ========================================================= */

function finalizeText(
  sentences,
  fallbackEnding
) {

  const clean =
    sentences

      .map(
        cleanString
      )

      .filter(
        Boolean
      );


  if (
    fallbackEnding
  ) {

    clean.push(
      cleanString(
        fallbackEnding
      )
    );

  }


  return shorten(
    clean.join(
      " "
    ),
    560
  );

}


/* =========================================================
   FALLBACK
   ========================================================= */

function createFallbackPersona() {

  return {

    version:
      PERSONA_VERSION,

    style:
      PERSONA_STYLES.informative,

    angle:
      "discovery",

    headline:
      "SporNRD’de yeni bir spor içeriği",

    influencerText:
      "İçeriğin ayrıntılarını kaynağın kendi paylaşımından kontrol edebilirsin.",

    note:
      "",

    languageMode:
      "neutral",

    timeState:
      "unknown",

    factsUsed:
      [],

    generatedAt:
      new Date()
        .toISOString()

  };

}


/* =========================================================
   SAYI FORMAT
   ========================================================= */

function formatNumber(
  value
) {

  const number =
    Number(
      value
    );


  if (
    !Number.isFinite(
      number
    )
  ) {

    return "";

  }


  return new Intl.NumberFormat(
    "tr-TR"
  ).format(
    number
  );

}


/* =========================================================
   FIRST NUMBER
   ========================================================= */

function firstNumber(
  ...values
) {

  for (
    const value
    of values
  ) {

    const number =
      nullableNumber(
        value
      );


    if (
      number !==
      null
    ) {

      return number;

    }

  }


  return null;

}


/* =========================================================
   NULLABLE NUMBER

   DİKKAT:
   0 geçerli değerdir.
   ========================================================= */

function nullableNumber(
  value
) {

  if (
    value ===
    null ||
    value ===
    undefined ||
    value ===
    ""
  ) {

    return null;

  }


  const number =
    Number(
      value
    );


  return Number.isFinite(
    number
  )
    ? number
    : null;

}


/* =========================================================
   ARRAY
   ========================================================= */

function stringArray(
  value
) {

  if (
    !Array.isArray(
      value
    )
  ) {

    return [];

  }


  return value

    .map(
      cleanString
    )

    .filter(
      Boolean
    );

}


/* =========================================================
   ID NORMALİZE
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
   TEXT NORMALIZE
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


/* =========================================================
   SHORTEN
   ========================================================= */

function shorten(
  value,
  max
) {

  const text =
    cleanString(
      value
    );


  if (
    text.length <=
    max
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

      lastSpace >
      0
        ? lastSpace
        : max

    )
    +
    "…"
  );

       }
