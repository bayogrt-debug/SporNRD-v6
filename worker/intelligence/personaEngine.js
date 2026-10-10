/* =========================================================
   SporNRD
   worker/intelligence/personaEngine.js

   SporNRD Persona / Influencer Motoru

   Sürüm: 6.1.1

   Amaç:
   ---------------------------------------------------------
   Ham ve yapılandırılmış spor bilgisini
   son tüketiciye sıcak, dikkat çekici,
   anlaşılır ve güvenilir SporNRD diliyle sunmak.

   YENİ 6.1.1 MANTIĞI
   ---------------------------------------------------------
   Persona artık yalnız kategoriye bakmaz.

   Öncelikle:
   - contentIntent
   - eventStatus
   - actionable
   - intentMeta.feedTreatment

   alanlarını dikkate alır.

   Böylece:
   SONUÇ HABERİ
   yaklaşan etkinlik gibi anlatılmaz.

   TEMEL KURAL:
   ---------------------------------------------------------
   - Gerçek veri ASLA uydurulmaz.
   - Kaynakta olmayan fiyat üretilmez.
   - Kaynakta olmayan tarih üretilmez.
   - Kaynakta olmayan konum kesin bilgi gibi kullanılmaz.
   - Kaynakta olmayan kontenjan üretilmez.
   - Kaynakta olmayan yaş bilgisi üretilmez.
   - Tamamlanmış olay yaklaşan etkinlik gibi sunulmaz.
   - Clickbait yapılmaz.
   - Sahte övgü yapılmaz.
   - Reklam dili kullanılmaz.
   ========================================================= */


import {

  getSport,
  getCategory,
  getSubCategory,
  getProviderType

} from "../core/taxonomy.js";


/* =========================================================
   PERSONA VERSION
   ========================================================= */

export const PERSONA_VERSION =
  "1.1";


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

  weekend:
    "weekend",

  practical:
    "practical",

  informative:
    "informative",

  result:
    "result"

};


/* =========================================================
   ANA PERSONA ÜRETİMİ
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
      post,
      facts,
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
        post.editorial &&
        typeof post.editorial ===
        "object"

          ? post.editorial

          : {}
      ),

      enabled:
        true,

      label:
        "SporNRD Özeti",

      version:
        `6.1.0-persona-${PERSONA_VERSION}`,

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

      factsUsed:
        persona.factsUsed,

      generatedAt:
        persona.generatedAt

    }

  };

}


/* =========================================================
   PERSONA AÇISI
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


  const intentMeta =
    isPlainObject(
      post.intentMeta
    )
      ? post.intentMeta
      : {};


  const sportDefinition =
    getSport(
      post.sport
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


  const ageMin =
    nullableNumber(
      details.ageMin
    );


  const ageMax =
    nullableNumber(
      details.ageMax
    );


  const days =
    stringArray(
      details.days
    );


  const startDate =
    cleanString(

      details.startDate ||

      lifecycle.startsAt

    );


  const endDate =
    cleanString(

      details.endDate ||

      lifecycle.endsAt

    );


  const deadline =
    cleanString(

      details.registrationDeadline ||

      details.applicationDeadline ||

      lifecycle.expiresAt

    );


  const contentIntent =
    cleanString(
      post.contentIntent
    );


  const eventStatus =
    cleanString(
      post.eventStatus
    );


  const actionable =
    post.actionable ===
    true;


  const feedTreatment =
    cleanString(
      intentMeta.feedTreatment
    );


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
    contentIntent
  ) {

    used.push(
      "contentIntent"
    );

  }


  if (
    eventStatus
  ) {

    used.push(
      "eventStatus"
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


  /*
    Result/completed içeriklerde konum
    persona anlatımında kullanılmayacak.

    Çünkü takım/kurum adlarından gelen
    sahte konum ihtimali daha yüksek.
  */

  if (
    location.city &&
    !isCompletedResult({
      contentIntent,
      eventStatus
    })
  ) {

    used.push(
      "city"
    );

  }


  if (
    location.district &&
    !isCompletedResult({
      contentIntent,
      eventStatus
    })
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

    category:
      categoryDefinition?.label ||
      "",

    subCategory:
      subCategoryDefinition?.label ||
      "",

    providerType:
      providerDefinition?.label ||
      "",

    sourceName:
      cleanString(
        source.name
      ),

    sourceShortName:
      cleanString(
        source.shortName
      ),

    originalTitle:
      cleanString(
        post.editorial?.originalTitle
      ),

    currentHeadline:
      cleanString(
        post.editorial?.headline
      ),

    originalText:
      cleanString(
        post.editorial?.originalText
      ),

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

    ageMin:
      ageMin,

    ageMax:
      ageMax,

    ageGroup:
      cleanString(
        details.ageGroup
      ),

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

    lifecycleStatus:
      cleanString(
        lifecycle.status
      ),

    contentIntent:
      contentIntent,

    eventStatus:
      eventStatus,

    actionable:
      actionable,

    opportunityScore:
      safeNumber(
        post.opportunityScore
      ),

    feedTreatment:
      feedTreatment,

    used:
      used

  };

}


/* =========================================================
   AÇI SEÇ

   KRİTİK:
   İçeriğin anlamı kategori seçiminden önce gelir.
   ========================================================= */

function chooseAngle(
  post,
  facts
) {

  /* =======================================================
     1. SONUÇ / TAMAMLANMIŞ OLAY

     En yüksek öncelik.

     Örn:
     Şampiyon oldu
     Kazandı
     Final tamamlandı
     Madalya aldı

     Bunlar ASLA yaklaşan etkinlik değildir.
     ======================================================= */

  if (
    isCompletedResult(
      facts
    )
  ) {

    return "result";

  }


  /* =======================================================
     2. KAYIT / BAŞVURU
     ======================================================= */

  if (
    facts.contentIntent ===
    "registration"
  ) {

    return facts.deadline
      ? "deadline"
      : "registration";

  }


  /* =======================================================
     3. SON BAŞVURU
     ======================================================= */

  if (
    facts.lifecycleStatus ===
    "closing_soon"
    ||
    facts.deadline
  ) {

    return "deadline";

  }


  /* =======================================================
     4. KAMPANYA
     ======================================================= */

  if (
    facts.contentIntent ===
    "campaign"
    ||
    post.category ===
    "campaigns"
    ||
    facts.discountRate !==
    null
  ) {

    return "opportunity";

  }


  /* =======================================================
     5. İŞ
     ======================================================= */

  if (
    facts.contentIntent ===
    "job"
    ||
    post.category ===
    "jobs"
  ) {

    return "career";

  }


  /* =======================================================
     6. ÜRÜN
     ======================================================= */

  if (
    facts.contentIntent ===
    "product"
    ||
    post.category ===
    "stores"
  ) {

    return "product";

  }


  /* =======================================================
     7. ÇOCUK / AİLE
     ======================================================= */

  if (
    isChildAudience(
      facts
    )
  ) {

    return "family";

  }


  /* =======================================================
     8. KURS
     ======================================================= */

  if (
    post.category ===
    "courses"
  ) {

    return "course";

  }


  /* =======================================================
     9. YAKLAŞAN / AKSİYON ALINABİLİR ETKİNLİK
     ======================================================= */

  if (
    post.category ===
    "events"
    &&
    facts.eventStatus !==
    "completed"
    &&
    facts.contentIntent !==
    "result"
  ) {

    return "event";

  }


  /* =======================================================
     10. DUYURU / HABER
     ======================================================= */

  if (
    facts.contentIntent ===
    "announcement"
  ) {

    return "announcement";

  }


  return "discovery";

}


/* =========================================================
   STYLE SEÇ
   ========================================================= */

function chooseStyle(
  post,
  facts,
  angle
) {

  void post;
  void facts;


  if (
    angle ===
    "result"
  ) {

    return PERSONA_STYLES.result;

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
    angle ===
    "deadline"
  ) {

    return PERSONA_STYLES.reminder;

  }


  if (
    angle ===
    "opportunity"
    ||
    angle ===
    "product"
  ) {

    return PERSONA_STYLES.opportunity;

  }


  if (
    angle ===
    "course"
    ||
    angle ===
    "registration"
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


  const location =
    shortLocation(
      facts
    );


  /* =======================================================
     SONUÇ

     Konum kullanılmaz.
     Katılım çağrısı kullanılmaz.
     ======================================================= */

  if (
    angle ===
    "result"
  ) {

    return buildResultHeadline(
      facts
    );

  }


  /* =======================================================
     SON TARİH
     ======================================================= */

  if (
    angle ===
    "deadline"
  ) {

    if (
      post.category ===
      "jobs"
    ) {

      return shorten(
        `💼 ${facts.sport} tarafında başvuru düşünenler, son tarihi kaçırmayın`,
        120
      );

    }


    if (
      post.category ===
      "courses"
    ) {

      return shorten(
        `⏳ ${facts.sport} kursunda kayıt takvimine dikkat`,
        120
      );

    }


    return shorten(
      `⏳ Son tarih yaklaşırken: ${original}`,
      120
    );

  }


  /* =======================================================
     KAYIT
     ======================================================= */

  if (
    angle ===
    "registration"
  ) {

    return shorten(
      `📌 ${original}`,
      120
    );

  }


  /* =======================================================
     AİLE / ÇOCUK
     ======================================================= */

  if (
    angle ===
    "family"
  ) {

    return shorten(

      `${facts.sportEmoji} Çocuğu için ${facts.sport.toLocaleLowerCase(
        "tr-TR"
      )} arayanlara ${
        location
          ? `${location} tarafında `
          : ""
      }bir seçenek`,

      120

    );

  }


  /* =======================================================
     KURS
     ======================================================= */

  if (
    angle ===
    "course"
  ) {

    if (
      location
    ) {

      return shorten(
        `${facts.sportEmoji} ${location}’da ${facts.sport.toLocaleLowerCase(
          "tr-TR"
        )} kursu arayanlar buraya`,
        120
      );

    }


    return shorten(
      `${facts.sportEmoji} ${facts.sport} kursu arayanlar için yeni bir seçenek`,
      120
    );

  }


  /* =======================================================
     ETKİNLİK

     Yalnız completed/result olmayan içerikler buraya gelir.
     ======================================================= */

  if (
    angle ===
    "event"
  ) {

    if (
      location
    ) {

      return shorten(
        `${facts.sportEmoji} ${location}’da spor planı yapanların radarına`,
        120
      );

    }


    return shorten(
      `${facts.sportEmoji} Spor planına eklenebilecek yeni bir etkinlik`,
      120
    );

  }


  /* =======================================================
     KAMPANYA
     ======================================================= */

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
        )} indirimle dikkat çeken bir spor fırsatı`,
        120
      );

    }


    return shorten(
      "👀 Spor tarafında dikkat çeken yeni bir kampanya",
      120
    );

  }


  /* =======================================================
     İŞ
     ======================================================= */

  if (
    angle ===
    "career"
  ) {

    if (
      facts.position
    ) {

      return shorten(
        `💼 ${facts.position} arayanlar, bu ilana göz atabilir`,
        120
      );

    }


    return shorten(
      `💼 ${facts.sport} alanında yeni bir iş ilanı`,
      120
    );

  }


  /* =======================================================
     MAĞAZA / ÜRÜN
     ======================================================= */

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
        `🛍️ ${product}: ${formatMoney(
          facts.price,
          facts.currency
        )}`,
        120
      );

    }


    return shorten(
      `🛍️ Spor alışverişi yapanların radarına: ${product}`,
      120
    );

  }


  /* =======================================================
     DUYURU
     ======================================================= */

  if (
    angle ===
    "announcement"
  ) {

    return shorten(
      `📢 ${original}`,
      120
    );

  }


  /* =======================================================
     GENEL
     ======================================================= */

  return shorten(
    `${facts.sportEmoji} ${original}`,
    120
  );

}


/* =========================================================
   SONUÇ BAŞLIĞI

   Kaynağın gerçek başlığını temel alır.
   Yeni olay/fakt uydurmaz.
   ========================================================= */

function buildResultHeadline(
  facts
) {

  const original =
    cleanResultTitle(
      facts.originalTitle ||
      facts.currentHeadline
    );


  if (
    original
  ) {

    /*
      Orijinal başlık zaten güçlü sonuç dili taşıyorsa
      onu koruyoruz.
    */

    return shorten(
      `🏆 ${original}`,
      120
    );

  }


  return shorten(
    `🏆 ${facts.sport} tarafında sonuç belli oldu`,
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

  /* -------------------------------------------------------
     RESULT her kategorinin önüne geçer.
     ------------------------------------------------------- */

  if (
    angle ===
    "result"
  ) {

    return buildResultText(
      facts
    );

  }


  if (
    angle ===
    "registration"
  ) {

    return buildRegistrationText(
      facts
    );

  }


  switch (
    post.category
  ) {

    case "courses":

      return buildCourseText(
        facts,
        angle
      );


    case "events":

      return buildEventText(
        facts,
        angle
      );


    case "campaigns":

      return buildCampaignText(
        facts
      );


    case "jobs":

      return buildJobText(
        facts
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
   SONUÇ METNİ

   ÖNEMLİ:
   - Katılım çağrısı yok.
   - Gelecek zaman yok.
   - "Planına ekle" yok.
   - Şehir üzerinden çıkarım yok.
   ========================================================= */

function buildResultText(
  facts
) {

  const sentences =
    [];


  const originalText =
    cleanString(
      facts.originalText
    );


  const originalTitle =
    cleanResultTitle(
      facts.originalTitle
    );


  /*
    Kaynak açıklaması varsa onu esas alıyoruz.
  */

  if (
    originalText
  ) {

    const summary =
      shorten(
        originalText,
        360
      );


    sentences.push(
      summary
    );

  }

  else if (
    originalTitle
  ) {

    sentences.push(
      `${originalTitle}.`
    );

  }

  else {

    sentences.push(
      `${facts.sport} tarafında sonuçlanan bir organizasyonla ilgili yeni bilgi paylaşıldı.`
    );

  }


  return finalizeText(
    sentences,
    "Sonucun ayrıntılarını resmî kaynaktan inceleyebilirsin."
  );

}


/* =========================================================
   KAYIT / BAŞVURU METNİ
   ========================================================= */

function buildRegistrationText(
  facts
) {

  const sentences =
    [];


  const title =
    getBaseTitle(
      facts
    );


  sentences.push(
    `${title} için kullanıcıdan işlem gerektiren bir kayıt veya başvuru süreci bulunuyor.`
  );


  if (
    facts.deadline
  ) {

    sentences.push(
      `Kaynakta belirtilen son tarih: ${facts.deadline}.`
    );

  }


  if (
    facts.startDate
  ) {

    sentences.push(
      `İlgili tarih bilgisi ${facts.startDate} olarak belirtilmiş.`
    );

  }


  return finalizeText(
    sentences,
    "Başvuru şartlarını ve gerekli adımları resmî kaynaktan kontrol edebilirsin."
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


  if (
    angle ===
    "family"
  ) {

    sentences.push(

      location

        ? `${location} çevresinde çocuğu için ${facts.sport.toLocaleLowerCase(
            "tr-TR"
          )} seçeneği arayanların bakabileceği bir kurs var.`

        : `Çocuğu için ${facts.sport.toLocaleLowerCase(
            "tr-TR"
          )} kursu arayanların bakabileceği bir seçenek var.`

    );

  }

  else {

    sentences.push(

      location

        ? `${location} tarafında ${facts.sport.toLocaleLowerCase(
            "tr-TR"
          )} kursu arayanların değerlendirebileceği bir seçenek var.`

        : `${facts.sport} kursu arayanların değerlendirebileceği yeni bir seçenek var.`

    );

  }


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


  if (
    facts.deadline
  ) {

    sentences.push(
      "Kayıt için belirtilen son tarihi ayrıca kontrol etmekte fayda var."
    );

  }


  return finalizeText(
    sentences,
    "Ayrıntıları ve güncel kayıt durumunu resmî kaynaktan kontrol edebilirsin."
  );

}


/* =========================================================
   ETKİNLİK METNİ

   Bu fonksiyon RESULT için artık çağrılmaz.
   ========================================================= */

function buildEventText(
  facts,
  angle
) {

  void angle;


  const sentences =
    [];


  const location =
    readableLocation(
      facts
    );


  if (
    location
  ) {

    sentences.push(
      `${location} tarafında spor planına eklenebilecek bir etkinlik var.`
    );

  }

  else {

    sentences.push(
      `${facts.sport} tarafında yaklaşan bir etkinlik bulunuyor.`
    );

  }


  if (
    facts.startDate
  ) {

    sentences.push(
      `Etkinlik tarihi kaynakta ${facts.startDate} olarak belirtiliyor.`
    );

  }


  const time =
    buildTimeText(
      facts
    );


  if (
    time
  ) {

    sentences.push(
      `Saat bilgisi: ${time}.`
    );

  }


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


  if (
    facts.deadline
  ) {

    sentences.push(
      "Katılım düşünüyorsan kayıt tarihini kontrol etmek önemli."
    );

  }


  return finalizeText(
    sentences,
    "Program ve katılım koşullarını resmî kaynaktan kontrol edebilirsin."
  );

}


/* =========================================================
   KAMPANYA METNİ
   ========================================================= */

function buildCampaignText(
  facts
) {

  const sentences =
    [];


  if (
    facts.discountRate !==
    null
  ) {

    sentences.push(
      `Spor tarafında %${formatNumber(
        facts.discountRate
      )} indirim bilgisiyle dikkat çeken bir kampanya var.`
    );

  }

  else {

    sentences.push(
      "Spor tarafında yeni bir kampanya var."
    );

  }


  if (
    facts.oldPrice !==
    null &&
    facts.price !==
    null
  ) {

    sentences.push(
      `Kaynakta fiyat ${formatMoney(
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
    facts.deadline ||
    facts.endDate
  ) {

    sentences.push(
      "Kampanyanın geçerlilik tarihini işlem yapmadan önce kontrol etmek önemli."
    );

  }


  return finalizeText(
    sentences,
    "Kampanya koşulları ve güncel fiyat için resmî kaynağa göz atabilirsin."
  );

}


/* =========================================================
   İŞ İLANI METNİ
   ========================================================= */

function buildJobText(
  facts
) {

  const sentences =
    [];


  const location =
    readableLocation(
      facts
    );


  if (
    facts.position
  ) {

    sentences.push(
      `${facts.position} pozisyonuyla ilgilenen spor profesyonelleri için yeni bir ilan var.`
    );

  }

  else {

    sentences.push(
      `${facts.sport} alanında çalışanların ilgisini çekebilecek yeni bir iş ilanı var.`
    );

  }


  if (
    location
  ) {

    sentences.push(
      `İlanın konumu ${location}.`
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
      "Başvuru düşünüyorsan son tarihi ayrıca kontrol et."
    );

  }


  return finalizeText(
    sentences,
    "Şartların tamamını ve başvuru yöntemini resmî ilandan kontrol edebilirsin."
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
      `${facts.brand} imzalı ${product} spor alışverişi yapanların ilgisini çekebilir.`
    );

  }

  else {

    sentences.push(
      `${product} spor alışverişi yapanların ilgisini çekebilir.`
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
      `Gördüğümüz fiyat ${formatMoney(
        facts.price,
        facts.currency
      )}.`
    );

  }


  if (
    facts.stockStatus
  ) {

    sentences.push(
      `Stok bilgisi kaynakta “${facts.stockStatus}” olarak görünüyor.`
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

  const title =
    getBaseTitle(
      facts
    );


  return finalizeText(

    [
      `${facts.sport} tarafında yeni bir içerik var: ${title}.`
    ],

    "Ayrıntıları resmî kaynaktan kontrol edebilirsin."

  );

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
    angle ===
    "result"
  ) {

    return "Bu içerik tamamlanmış bir sonuç/haber; yaklaşan etkinlik olarak değerlendirilmemeli.";

  }


  if (
    angle ===
    "deadline"
  ) {

    return "Takvim bilgisi bu postta en önemli detay.";

  }


  if (
    angle ===
    "family" &&
    (
      facts.ageMin !==
      null ||
      facts.ageMax !==
      null
    )
  ) {

    return "Yaş grubunun uygunluğu karar verirken ilk bakılacak bilgilerden biri.";

  }


  if (
    facts.price !==
    null &&
    post.category ===
    "courses"
  ) {

    return "Gün, saat ve fiyatı birlikte değerlendirmek bu seçenek için daha anlamlı.";

  }


  if (
    facts.discountRate !==
    null
  ) {

    return "İndirim oranı dikkat çekiyor; son fiyatı yine resmî kaynaktan doğrulamak önemli.";

  }


  if (
    post.category ===
    "jobs"
  ) {

    return "Pozisyon şartları ve çalışma düzeni başvuru öncesinde kontrol edilmeli.";

  }


  return "";

}


/* =========================================================
   COMPLETED RESULT?
   ========================================================= */

function isCompletedResult(
  facts
) {

  return Boolean(

    facts?.contentIntent ===
    "result"

    ||

    facts?.eventStatus ===
    "completed"

  );

}


/* =========================================================
   SONUÇ BAŞLIĞI TEMİZLE
   ========================================================= */

function cleanResultTitle(
  value
) {

  let text =
    cleanString(
      value
    );


  if (
    !text
  ) {

    return "";

  }


  /*
    Son noktadaki gereksiz noktalama temizliği.
  */

  text =
    text
      .replace(
        /\s+/g,
        " "
      )
      .replace(
        /[.!…]+$/,
        ""
      )
      .trim();


  return text;

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
   SAAT METNİ
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
   YAŞ CÜMLESİ
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
      )} yaş grubu için uygun olduğu belirtilmiş.`
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
   FİYAT CÜMLESİ
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
      `İlanda ücret aralığı ${formatMoney(
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
      `İlanda belirtilen başlangıç ücreti ${formatMoney(
        facts.salaryMin,
        facts.currency
      )}.`
    );

  }


  return (
    `İlanda belirtilen ücret ${formatMoney(
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

    return Math.max(
      0,
      Math.min(
        explicit,
        100
      )
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


  return (
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
   KISA KONUM
   ========================================================= */

function shortLocation(
  facts
) {

  /*
    Tamamlanmış sonuçlarda konum kullanma.
  */

  if (
    isCompletedResult(
      facts
    )
  ) {

    return "";

  }


  if (
    facts.district
  ) {

    return facts.district;

  }


  if (
    facts.city
  ) {

    return facts.city;

  }


  return "";

}


/* =========================================================
   OKUNABİLİR KONUM
   ========================================================= */

function readableLocation(
  facts
) {

  if (
    isCompletedResult(
      facts
    )
  ) {

    return "";

  }


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

    facts.originalTitle ||

    facts.currentHeadline ||

    facts.subCategory ||

    facts.category ||

    `${facts.sport} içeriği`

  );

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
      fallbackEnding
    );

  }


  return shorten(
    clean.join(
      " "
    ),
    520
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
      "Yeni spor içeriğinin ayrıntılarını resmî kaynaktan kontrol edebilirsin.",

    note:
      "",

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
   SAFE NUMBER
   ========================================================= */

function safeNumber(
  value
) {

  const number =
    Number(
      value
    );


  return Number.isFinite(
    number
  )
    ? number
    : 0;

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
