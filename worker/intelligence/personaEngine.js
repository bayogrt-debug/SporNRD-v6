/* =========================================================
   SporNRD
   worker/intelligence/personaEngine.js

   SporNRD Persona / Influencer Motoru

   Sürüm: 6.1.0

   Amaç:
   ---------------------------------------------------------
   Ham ve yapılandırılmış spor bilgisini
   son tüketiciye sıcak, dikkat çekici,
   anlaşılır ve güvenilir SporNRD diliyle sunmak.

   TEMEL KURAL:
   ---------------------------------------------------------
   - Gerçek veri ASLA uydurulmaz.
   - Kaynakta olmayan fiyat üretilmez.
   - Kaynakta olmayan tarih üretilmez.
   - Kaynakta olmayan kontenjan üretilmez.
   - Kaynakta olmayan yaş bilgisi üretilmez.
   - Clickbait yapılmaz.
   - Sahte övgü yapılmaz.
   - Reklam dili kullanılmaz.

   Persona:
   ---------------------------------------------------------
   Samimi
   Enerjik
   Merak uyandıran
   Son tüketici odaklı
   Kısa
   Net
   Fayda odaklı
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
  "1.0";


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
    "informative"

};


/* =========================================================
   ANA PERSONA ÜRETİMİ
   ========================================================= */

export function buildPersona(
  post,
  options = {}
) {

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

   Orijinal postu değiştirmez.
   Yeni nesne döndürür.
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

   Postu hangi açıdan anlatacağız?
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
    price !==
    null
  ) {

    used.push(
      "price"
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

    used:
      used

  };

}


/* =========================================================
   AÇI SEÇ
   ========================================================= */

function chooseAngle(
  post,
  facts
) {

  /* -------------------------------------------------------
     Son başvuru
     ------------------------------------------------------- */

  if (
    facts.lifecycleStatus ===
    "closing_soon"
    ||
    facts.deadline
  ) {

    return "deadline";

  }


  /* -------------------------------------------------------
     Kampanya / indirim
     ------------------------------------------------------- */

  if (
    post.category ===
    "campaigns"
    ||
    facts.discountRate !==
    null
  ) {

    return "opportunity";

  }


  /* -------------------------------------------------------
     Çocuk / genç yaş grubu
     ------------------------------------------------------- */

  if (
    isChildAudience(
      facts
    )
  ) {

    return "family";

  }


  /* -------------------------------------------------------
     İş ilanı
     ------------------------------------------------------- */

  if (
    post.category ===
    "jobs"
  ) {

    return "career";

  }


  /* -------------------------------------------------------
     Mağaza
     ------------------------------------------------------- */

  if (
    post.category ===
    "stores"
  ) {

    return "product";

  }


  /* -------------------------------------------------------
     Kurs
     ------------------------------------------------------- */

  if (
    post.category ===
    "courses"
  ) {

    return "course";

  }


  /* -------------------------------------------------------
     Etkinlik
     ------------------------------------------------------- */

  if (
    post.category ===
    "events"
  ) {

    return "event";

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


  /* -------------------------------------------------------
     SON TARİH
     ------------------------------------------------------- */

  if (
    angle ===
    "deadline"
  ) {

    if (
      post.category ===
      "jobs"
    ) {

      return shorten(
        `💼 ${facts.sport} tarafında başvuru düşünenler, bu ilanı gözden kaçırmayın`,
        120
      );

    }


    if (
      post.category ===
      "courses"
    ) {

      return shorten(
        `⏳ ${facts.sport} kursu arayanlar, kayıt tarihine dikkat`,
        120
      );

    }


    return shorten(
      `⏳ Takvime bakın: ${original}`,
      120
    );

  }


  /* -------------------------------------------------------
     AİLE / ÇOCUK
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     KURS
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     ETKİNLİK
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     KAMPANYA
     ------------------------------------------------------- */

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
        )} indirimle dikkatimizi çeken bir spor fırsatı`,
        120
      );

    }


    return shorten(
      "👀 Spor tarafında dikkatimizi çeken yeni bir kampanya",
      120
    );

  }


  /* -------------------------------------------------------
     İŞ
     ------------------------------------------------------- */

  if (
    angle ===
    "career"
  ) {

    if (
      facts.position
    ) {

      return shorten(
        `💼 ${facts.position} arayanlar veya bu alanda çalışanlar, bu ilana bakın`,
        120
      );

    }


    return shorten(
      `💼 ${facts.sport} alanında yeni bir iş ilanı var`,
      120
    );

  }


  /* -------------------------------------------------------
     MAĞAZA / ÜRÜN
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     GENEL
     ------------------------------------------------------- */

  return shorten(
    `${facts.sportEmoji} ${original}`,
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
          )} seçeneği arayanların bakabileceği bir kurs bulduk.`

        : `Çocuğu için ${facts.sport.toLocaleLowerCase(
            "tr-TR"
          )} kursu arayanların bakabileceği bir seçenek bulduk.`

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
      `Kayıt için belirtilen son tarihi ayrıca kontrol etmekte fayda var.`
    );

  }


  return finalizeText(
    sentences,
    "Ayrıntıları ve güncel kayıt durumunu resmî kaynaktan kontrol edebilirsin."
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


  if (
    location
  ) {

    sentences.push(
      `${location} tarafında spor planına eklenebilecek bir etkinlik var.`
    );

  }

  else {

    sentences.push(
      `${facts.sport} tarafında yeni bir etkinlik radarımıza girdi.`
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
      "Katılım düşünüyorsan kayıt tarihini kaçırmamak önemli."
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
      )} indirim bilgisiyle dikkat çeken bir kampanya bulduk.`
    );

  }

  else {

    sentences.push(
      "Spor tarafında yeni bir kampanya dikkatimizi çekti."
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
      "Kampanyanın geçerlilik tarihini işlem yapmadan önce kontrol etmeni öneririz."
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
      `${facts.sport} tarafında dikkatimizi çeken yeni bir içerik var: ${title}.`
    ],

    "Ayrıntıları resmî kaynaktan kontrol edebilirsin."

  );

}


/* =========================================================
   SPORNRD NOTU

   Kartın arka yüzünde ileride
   küçük editör notu olarak kullanılabilir.
   ========================================================= */

function buildSporNRDNote(
  post,
  facts,
  angle
) {

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

    facts.currentHeadline ||

    facts.originalTitle ||

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
