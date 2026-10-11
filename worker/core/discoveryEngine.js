/* =========================================================
   SporNRD
   worker/core/discoveryEngine.js

   SporNRD Keşif / Sınıflandırma Motoru

   Sürüm: 6.1.2

   ANA GÖREV
   ---------------------------------------------------------
   Bir içeriğin:

   - Branşını
   - Kullanıcı bölümünü
   - Ana kategorisini
   - Alt kategorisini
   - Provider türünü
   - İçerik türünü
   - Filtre alanlarını
   - Eksik kritik bilgilerini
   - Profesyonel hedef kitlesini

   belirlemek.

   =========================================================
   SPORNRD ANA KATEGORİLERİ
   =========================================================

   news
   course
   event
   campaign
   jobs
   stores

   =========================================================
   SPORNRD BÖLÜMLERİ
   =========================================================

   individual_athlete
   trainer_coach
   business_institution

   =========================================================
   KRİTİK MİMARİ AYRIM
   =========================================================

   providerType:

   "Bu içeriği kim yayımlıyor?"

   section:

   "Bu içerik SporNRD içinde esas olarak
    hangi kullanıcı bölümünü ilgilendiriyor?"

   ÖRNEK:

   Türkiye Yüzme Federasyonu tarafından yayımlanan:

   "Antrenör Vize İşlemleri Hakkında Duyuru"

   providerType:
   federation

   section:
   trainer_coach

   category:
   news

   subCategory:
   announcement

   ---------------------------------------------------------

   Türkiye Basketbol Federasyonu tarafından yayımlanan:

   "Kadınlar Süper Ligi 3. Hafta Programı"

   providerType:
   federation

   section:
   business_institution

   category:
   event

   ---------------------------------------------------------

   Bir sporcunun kişisel hesabından yayımlanan içerik:

   providerType:
   athlete / individual

   section:
   individual_athlete

   =========================================================
   ÇOK ÖNEMLİ KURAL
   =========================================================

   HABER ile ETKİNLİK aynı şey değildir.

   "Fenerbahçe kupayı kazandı"
   → news

   "Murat Ciner A Klasmanına yükseldi"
   → news

   "20 Ekim'de basketbol turnuvası yapılacak"
   → event

   "2. Kademe yüzme antrenörlük kursu"
   → course

   "Antrenör vize işlemleri 1 Ekim'de başlayacak"
   → news / announcement
   → event değildir.

   Yayıncı federasyon olabilir.

   Bu durum içeriğin trainer_coach bölümünde
   değerlendirilmesine engel değildir.
   ========================================================= */


import {

  getSport,
  getCategory,
  getSubCategory,
  getProviderType,
  getContentType,
  getCategoryFilterFields

} from "./taxonomy.js";


import {

  getSource

} from "./sourceRegistry.js";


/* =========================================================
   VERSION
   ========================================================= */

export const DISCOVERY_VERSION =
  "1.2";


/* =========================================================
   SABİT KATEGORİLER
   ========================================================= */

const CANONICAL_CATEGORIES = [

  "news",
  "course",
  "event",
  "campaign",
  "jobs",
  "stores"

];


/* =========================================================
   BÖLÜMLER
   ========================================================= */

const SECTIONS = {

  individual_athlete:
    "individual_athlete",

  trainer_coach:
    "trainer_coach",

  business_institution:
    "business_institution"

};


/* =========================================================
   ANA KEŞİF
   ========================================================= */

export function discoverPost(
  post,
  options = {}
) {

  void options;


  if (
    !post ||
    typeof post !==
    "object"
  ) {

    return createFallbackDiscovery();

  }


  /* =======================================================
     İÇERİK METNİ

     Öncelik gerçek/orijinal kaynak metnidir.
     ========================================================= */

  const text =
    buildSearchText(
      post
    );


  /* =======================================================
     KAYNAK
     ========================================================= */

  const source =
    resolveSource(
      post
    );


  /* =======================================================
     PROVIDER METNİ

     İçerikte geçen "antrenör", "sporcu" gibi kelimeler
     yayıncı kimliğini değiştirmemelidir.

     Bu nedenle provider için ayrı kaynak metni kullanılır.
     ========================================================= */

  const providerText =
    buildProviderText(
      post,
      source
    );


  /* =======================================================
     PROVIDER TYPE

     Kim yayımlıyor?
     ========================================================= */

  const providerType =
    resolveProviderType(
      post,
      source,
      providerText
    );


  /* =======================================================
     BRANŞ
     ========================================================= */

  const sport =
    resolveSport(
      post,
      source,
      text
    );


  /* =======================================================
     ANA KATEGORİ
     ========================================================= */

  const category =
    resolveCategory({

      post:
        post,

      text:
        text,

      source:
        source,

      providerType:
        providerType,

      sport:
        sport

    });


  /* =======================================================
     ALT KATEGORİ
     ========================================================= */

  const subCategory =
    resolveSubCategory({

      post:
        post,

      text:
        text,

      category:
        category,

      providerType:
        providerType,

      sport:
        sport

    });


  /* =======================================================
     BÖLÜM

     Artık yayıncı tipi değildir.

     İçeriğin ağırlıklı olarak kimi ilgilendirdiğini
     gösterir.
     ========================================================= */

  const section =
    resolveSection({

      post:
        post,

      text:
        text,

      providerType:
        providerType,

      providerText:
        providerText,

      category:
        category,

      subCategory:
        subCategory

    });


  /* =======================================================
     PROFESYONEL HEDEF KİTLE

     Selection Engine gibi sonraki katmanların
     kullanabilmesi için ayrıca açık alan üretilir.
     ========================================================= */

  const professionalAudience =
    resolveProfessionalAudience({

      post:
        post,

      text:
        text,

      section:
        section,

      category:
        category,

      subCategory:
        subCategory

    });


  /* =======================================================
     CONTENT TYPE
     ========================================================= */

  const contentType =
    resolveContentType({

      post:
        post,

      text:
        text,

      category:
        category,

      subCategory:
        subCategory,

      section:
        section

    });


  /* =======================================================
     KATEGORİ FİLTRE ALANLARI
     ========================================================= */

  const requiredFields =
    getCategoryFilterFields(
      category
    );


  const missingFields =
    findMissingFields(
      post,
      requiredFields
    );


  /* =======================================================
     GÜVEN
     ========================================================= */

  const confidenceScore =
    calculateDiscoveryConfidence({

      sport:
        sport,

      section:
        section,

      category:
        category,

      subCategory:
        subCategory,

      providerType:
        providerType,

      source:
        source,

      text:
        text,

      professionalAudience:
        professionalAudience

    });


  /* =======================================================
     DEBUG SİNYALLERİ
     ========================================================= */

  const signals =
    collectSignals({

      post:
        post,

      text:
        text,

      section:
        section,

      category:
        category,

      subCategory:
        subCategory,

      providerType:
        providerType,

      sport:
        sport,

      professionalAudience:
        professionalAudience

    });


  return {

    version:
      DISCOVERY_VERSION,


    /* -----------------------------------------------------
       Branş
       ----------------------------------------------------- */

    sport:
      sport,


    /* -----------------------------------------------------
       Kullanıcı bölümü
       ----------------------------------------------------- */

    section:
      section,


    /* -----------------------------------------------------
       Ana kategori
       ----------------------------------------------------- */

    category:
      category,


    /* -----------------------------------------------------
       Alt kategori
       ----------------------------------------------------- */

    subCategory:
      subCategory,


    /* -----------------------------------------------------
       Yayıncı / sağlayıcı tipi
       ----------------------------------------------------- */

    providerType:
      providerType,


    /* -----------------------------------------------------
       İçerik tipi
       ----------------------------------------------------- */

    contentType:
      contentType,


    /* -----------------------------------------------------
       Profesyonel hedef
       ----------------------------------------------------- */

    professionalAudience:
      professionalAudience,


    /* -----------------------------------------------------
       Filtre sistemi
       ----------------------------------------------------- */

    requiredFields:
      requiredFields,

    missingFields:
      missingFields,


    /* -----------------------------------------------------
       Güven
       ----------------------------------------------------- */

    confidenceScore:
      confidenceScore,


    /* -----------------------------------------------------
       Debug
       ----------------------------------------------------- */

    signals:
      signals,


    discoveredAt:
      new Date()
        .toISOString()

  };

}


/* =========================================================
   KEŞFİ POSTA UYGULA
   ========================================================= */

export function applyDiscovery(
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


  const discovery =
    discoverPost(
      post,
      options
    );


  return {

    ...post,


    sport:
      discovery.sport,


    section:
      discovery.section,


    category:
      discovery.category,


    subCategory:
      discovery.subCategory,


    providerType:
      discovery.providerType,


    contentType:
      discovery.contentType,


    professionalAudience:
      discovery.professionalAudience,


    discoveryMeta: {

      version:
        discovery.version,

      confidenceScore:
        discovery.confidenceScore,

      section:
        discovery.section,

      professionalAudience:
        discovery.professionalAudience,

      requiredFields:
        discovery.requiredFields,

      missingFields:
        discovery.missingFields,

      signals:
        discovery.signals,

      discoveredAt:
        discovery.discoveredAt

    }

  };

}


/* =========================================================
   POST LİSTESİNE UYGULA
   ========================================================= */

export function applyDiscoveryToPosts(
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
        applyDiscovery(
          post,
          options
        )
    )

    .filter(
      Boolean
    );

}


/* =========================================================
   SADECE SINIFLANDIRMA
   ========================================================= */

export function classifyDiscovery(
  post
) {

  const result =
    discoverPost(
      post
    );


  return {

    sport:
      result.sport,

    section:
      result.section,

    category:
      result.category,

    subCategory:
      result.subCategory,

    providerType:
      result.providerType,

    contentType:
      result.contentType,

    professionalAudience:
      result.professionalAudience,

    confidenceScore:
      result.confidenceScore

  };

}


/* =========================================================
   SOURCE ÇÖZ
   ========================================================= */

function resolveSource(
  post
) {

  const sourceId =
    cleanString(

      post?.source?.id ||

      post?.sourceId

    )
      .toLowerCase();


  if (
    sourceId
  ) {

    const registrySource =
      getSource(
        sourceId
      );


    if (
      registrySource
    ) {

      return registrySource;

    }

  }


  if (
    isPlainObject(
      post.source
    )
  ) {

    return post.source;

  }


  return {};

}


/* =========================================================
   PROVIDER İÇİN KAYNAK METNİ
   ========================================================= */

function buildProviderText(
  post,
  source
) {

  return normalizeText(

    [

      source?.name,

      source?.shortName,

      source?.sourceType,

      source?.providerType,

      post?.sourceName,

      post?.sourceShortName,

      post?.sourceType

    ]
      .filter(
        Boolean
      )
      .join(
        " "
      )

  );

}


/* =========================================================
   PROVIDER TYPE

   Yalnız yayıncı kimliği.
   ========================================================= */

function resolveProviderType(
  post,
  source,
  providerText
) {

  const existing =
    normalizeId(
      post.providerType
    );


  if (
    getProviderType(
      existing
    )
  ) {

    return existing;

  }


  const sourceProviderType =
    normalizeId(
      source.providerType
    );


  if (
    getProviderType(
      sourceProviderType
    )
  ) {

    return sourceProviderType;

  }


  const sourceType =
    normalizeText(

      source.sourceType ||

      post.sourceType

    );


  if (
    containsAny(
      sourceType,
      [

        "federasyon",
        "bakanlik",
        "mudurluk",
        "belediye",
        "kamu"

      ]
    )
  ) {

    return "federation";

  }


  if (
    containsAny(
      providerText,
      [

        "spor kulubu",
        "basketbol kulubu",
        "yuzme kulubu",
        "voleybol kulubu",
        "futbol kulubu"

      ]
    )
  ) {

    return "club";

  }


  if (
    containsAny(
      providerText,
      [

        "spor akademisi",
        "yuzme akademisi",
        "basketbol akademisi",
        "voleybol akademisi",
        "akademi"

      ]
    )
  ) {

    return "academy";

  }


  if (
    containsAny(
      providerText,
      [

        "spor salonu",
        "fitness salonu",
        "fitness center",
        "gym"

      ]
    )
  ) {

    return "gym";

  }


  if (
    containsAny(
      providerText,
      [

        "spor tesisi",
        "yuzme havuzu",
        "tesis"

      ]
    )
  ) {

    return "facility";

  }


  if (
    containsAny(
      providerText,
      [

        "spor magazasi",
        "magaza",
        "sports store"

      ]
    )
  ) {

    return "store";

  }


  if (
    containsAny(
      providerText,
      [

        "organizator",
        "organizasyon"

      ]
    )
  ) {

    return "organizer";

  }


  if (
    containsAny(
      providerText,
      [

        "gazete",
        "haber",
        "medya",
        "televizyon"

      ]
    )
  ) {

    return "media";

  }


  if (
    containsAny(
      providerText,
      [

        "antrenor",
        "egitmen",
        "trainer",
        "coach"

      ]
    )
  ) {

    return "coach";

  }


  if (
    [
      "athlete",
      "individual",
      "player"
    ].includes(
      existing
    )
  ) {

    return existing;

  }


  return "other";

}


/* =========================================================
   BÖLÜM

   section artık yayıncı değil,
   içeriğin ana kullanıcı / hedef bölümüdür.

   providerType yayıncı bilgisini zaten korur.
   ========================================================= */

function resolveSection({

  post,
  text,
  providerType,
  providerText,
  category,
  subCategory

}) {

  const type =
    normalizeId(
      providerType
    );


  /* =======================================================
     1. DOĞRUDAN KİŞİSEL PROVIDER
     ========================================================= */

  if (
    [
      "coach",
      "trainer",
      "instructor"
    ].includes(
      type
    )
  ) {

    return SECTIONS.trainer_coach;

  }


  if (
    [
      "athlete",
      "individual",
      "player"
    ].includes(
      type
    )
  ) {

    return SECTIONS.individual_athlete;

  }


  /* =======================================================
     2. GÜÇLÜ ANTRENÖR / HAKEM / EĞİTMEN İÇERİĞİ

     Yayıncı federasyon olsa bile bu içerikler
     trainer_coach bölümüne girer.

     Tek başına "antrenör" kelimesi yeterli değildir.

     Örnek:
     "Takımın antrenörü maç sonrası konuştu"
     otomatik trainer_coach değildir.
     ========================================================= */

  if (
    isProfessionalTrainerContent(
      text,
      category,
      subCategory
    )
  ) {

    return SECTIONS.trainer_coach;

  }


  /* =======================================================
     3. GÜÇLÜ SPORCU HEDEFLİ İÇERİK
     ========================================================= */

  if (
    isAthleteTargetContent(
      text,
      category,
      subCategory
    )
  ) {

    return SECTIONS.individual_athlete;

  }


  /* =======================================================
     4. PROVIDER ADI KİŞİSEL ANTRENÖR HESABIYSA
     ========================================================= */

  if (
    containsAny(
      providerText,
      [

        "antrenor",
        "egitmen",
        "coach",
        "trainer"

      ]
    )
  ) {

    return SECTIONS.trainer_coach;

  }


  /* =======================================================
     5. VARSAYILAN

     Federasyon, kulüp, akademi, tesis, mağaza,
     medya, organizatör veya genel içerik.

     İçerik özel olarak sporcu/antrenör bölümüne
     yönelmiyorsa business_institution.
     ========================================================= */

  void post;


  return SECTIONS.business_institution;

}


/* =========================================================
   ANTRENÖR / HAKEM / EĞİTMEN HEDEFLİ İÇERİK
   ========================================================= */

function isProfessionalTrainerContent(
  text,
  category,
  subCategory
) {

  const strongProfessionalSignals = [

    "antrenor vize",

    "antrenor vizesi",

    "antrenor vize islemleri",

    "antrenor vize basvuru",

    "antrenorluk kursu",

    "antrenor kursu",

    "antrenor semineri",

    "antrenor egitimi",

    "antrenor gelisim",

    "antrenor sertifika",

    "antrenor sinavi",

    "antrenor denklik",

    "antrenor belgesi",

    "antrenor lisansi",

    "hakem kursu",

    "hakemlik kursu",

    "hakem semineri",

    "hakem egitimi",

    "hakem sinavi",

    "hakem vize",

    "hakem klasman",

    "hakem klasmani",

    "hakem terfi",

    "hakem gelisim",

    "hakem lisansi",

    "egitmen kursu",

    "egitmen egitimi",

    "egitmen semineri"

  ];


  if (
    containsAny(
      text,
      strongProfessionalSignals
    )
  ) {

    return true;

  }


  /*
    Course + antrenör/hakem doğrudan profesyonel bölümdür.
  */

  if (
    category ===
    "course"

    &&

    containsAny(
      text,
      [
        "antrenor",
        "hakem",
        "egitmen"
      ]
    )
  ) {

    return true;

  }


  /*
    Duyuru içeriğinde profesyonel işlem bağlamı.
  */

  if (
    category ===
    "news"

    &&

    subCategory ===
    "announcement"

    &&

    containsAny(
      text,
      [
        "antrenorler",
        "antrenorlerin",
        "hakemler",
        "hakemlerin",
        "egitmenler",
        "egitmenlerin"
      ]
    )

    &&

    containsAny(
      text,
      [
        "vize",
        "lisans",
        "belge",
        "basvuru",
        "kayit",
        "sertifika",
        "sinav",
        "seminer",
        "egitim",
        "kurs"
      ]
    )
  ) {

    return true;

  }


  return false;

}


/* =========================================================
   SPORCU HEDEFLİ İÇERİK
   ========================================================= */

function isAthleteTargetContent(
  text,
  category,
  subCategory
) {

  const strongSignals = [

    "sporcu secmeleri",

    "sporcu secimi",

    "sporcu basvurulari",

    "sporcu kayitlari",

    "sporcu lisans",

    "sporcu vize",

    "sporcular icin",

    "sporcularin katilimi",

    "yuzucu secmeleri",

    "yuzucu kayitlari",

    "milli takim secmeleri",

    "milli takim aday kadro",

    "aday kadro",

    "oyuncu secmeleri",

    "oyuncu kayitlari",

    "altyapi secmeleri",

    "altyapi sporcu secmeleri"

  ];


  if (
    containsAny(
      text,
      strongSignals
    )
  ) {

    return true;

  }


  /*
    Sadece başarı/sonuç haberinde "sporcu" kelimesi
    geçmesi içeriği otomatik bireysel bölüme taşımaz.
  */

  if (
    category ===
    "news"

    &&

    [
      "achievement",
      "result"
    ].includes(
      subCategory
    )
  ) {

    return false;

  }


  return false;

}


/* =========================================================
   PROFESYONEL HEDEF KİTLE
   ========================================================= */

function resolveProfessionalAudience({

  post,
  text,
  section,
  category,
  subCategory

}) {

  if (
    section ===
    SECTIONS.trainer_coach
  ) {

    if (
      containsAny(
        text,
        [
          "hakem",
          "hakemlik"
        ]
      )
    ) {

      return "referee";

    }


    if (
      containsAny(
        text,
        [
          "egitmen"
        ]
      )
    ) {

      return "instructor";

    }


    return "trainer_coach";

  }


  if (
    section ===
    SECTIONS.individual_athlete
  ) {

    return "athlete";

  }


  /*
    Legacy audience alanı yalnız zayıf fallback.
  */

  const audience =
    normalizeId(
      post?.audience
    );


  if (
    [
      "antrenor",
      "coach",
      "trainer"
    ].includes(
      audience
    )
  ) {

    return "trainer_coach";

  }


  if (
    [
      "sporcu",
      "athlete",
      "player"
    ].includes(
      audience
    )
  ) {

    return "athlete";

  }


  void category;
  void subCategory;


  return "general";

}


/* =========================================================
   SPORT
   ========================================================= */

function resolveSport(
  post,
  source,
  text
) {

  const existing =
    normalizeId(
      post.sport
    );


  if (
    getSport(
      existing
    )
  ) {

    return existing;

  }


  const sourceSport =
    normalizeId(
      source.sport
    );


  if (
    getSport(
      sourceSport
    )
  ) {

    return sourceSport;

  }


  const legacySport =
    normalizeText(
      post.sport
    );


  if (
    legacySport.includes(
      "basketbol"
    )
  ) {

    return "basketball";

  }


  if (
    legacySport.includes(
      "yuzme"
    )
  ) {

    return "swimming";

  }


  if (
    legacySport.includes(
      "voleybol"
    )
  ) {

    return "volleyball";

  }


  if (
    legacySport.includes(
      "cimnastik"
    )

    ||

    legacySport.includes(
      "jimnastik"
    )
  ) {

    return "gymnastics";

  }


  if (
    containsAny(
      text,
      [

        "basketbol",
        "basketball",
        "fiba",
        "euroleague",
        "eurocup"

      ]
    )
  ) {

    return "basketball";

  }


  if (
    containsAny(
      text,
      [

        "yuzme",
        "yuzucu",
        "swimming",
        "havuz"

      ]
    )
  ) {

    return "swimming";

  }


  if (
    containsAny(
      text,
      [

        "voleybol",
        "volleyball"

      ]
    )
  ) {

    return "volleyball";

  }


  if (
    containsAny(
      text,
      [

        "cimnastik",
        "jimnastik",
        "gymnastics"

      ]
    )
  ) {

    return "gymnastics";

  }


  return "other";

}


/* =========================================================
   ANA KATEGORİ
   ========================================================= */

function resolveCategory({

  post,
  text,
  source,
  providerType,
  sport

}) {

  void source;
  void sport;


  const intent =
    normalizeId(
      post.contentIntent
    );


  const eventStatus =
    normalizeId(
      post.eventStatus
    );


  /* =======================================================
     1. İŞ İLANI
     ========================================================= */

  if (
    isJobContent(
      text
    )
  ) {

    return "jobs";

  }


  /* =======================================================
     2. KAMPANYA
     ========================================================= */

  if (
    isCampaignContent(
      text
    )
  ) {

    return "campaign";

  }


  /* =======================================================
     3. MAĞAZA / ÜRÜN
     ========================================================= */

  if (
    isStoreContent(
      text,
      providerType,
      intent
    )
  ) {

    return "stores";

  }


  /* =======================================================
     4. KURS
     ========================================================= */

  if (
    isCourseContent(
      text,
      intent
    )
  ) {

    return "course";

  }


  /* =======================================================
     5. PROFESYONEL DUYURU

     KRİTİK:

     "Antrenör vize işlemleri başlayacak"

     geleceğe ait bir işlem olabilir fakat
     etkinlik değildir.

     Bu nedenle event kontrolünden ÖNCE yapılır.
     ========================================================= */

  if (
    isProfessionalAnnouncement(
      text
    )
  ) {

    return "news";

  }


  /* =======================================================
     6. TAMAMLANMIŞ OLAY / SONUÇ
     ========================================================= */

  if (
    intent ===
    "result"

    ||

    eventStatus ===
    "completed"

    ||

    isCompletedNewsContent(
      text
    )
  ) {

    return "news";

  }


  /* =======================================================
     7. GERÇEK ETKİNLİK
     ========================================================= */

  if (
    isEventContent(
      text,
      post
    )
  ) {

    return "event";

  }


  /* =======================================================
     8. CONTENT INTENT
     ========================================================= */

  if (
    [
      "news",
      "announcement",
      "achievement",
      "assignment",
      "transfer",
      "result"
    ].includes(
      intent
    )
  ) {

    return "news";

  }


  /* =======================================================
     9. ESKİ KATEGORİ

     Eski "event" doğrudan korunmaz.
     ========================================================= */

  const existing =
    normalizeCategoryAlias(
      post.category
    );


  if (
    CANONICAL_CATEGORIES.includes(
      existing
    )

    &&

    existing !==
    "event"
  ) {

    return existing;

  }


  /* =======================================================
     10. FALLBACK
     ========================================================= */

  return "news";

}


/* =========================================================
   PROFESYONEL DUYURU MU?
   ========================================================= */

function isProfessionalAnnouncement(
  text
) {

  const professionalObject =
    containsAny(
      text,
      [

        "antrenor vize",
        "antrenor vizesi",
        "antrenor lisans",
        "antrenor belge",
        "antrenor denklik",
        "hakem vize",
        "hakem lisans",
        "hakem klasman",
        "hakem terfi",
        "hakem gorevlendirme"

      ]
    );


  if (
    professionalObject
  ) {

    return true;

  }


  const professionalAudience =
    containsAny(
      text,
      [
        "antrenorler",
        "antrenorlerin",
        "hakemler",
        "hakemlerin"
      ]
    );


  const administrativeAction =
    containsAny(
      text,
      [
        "vize islemleri",
        "lisans islemleri",
        "belgelendirme",
        "denklik islemleri",
        "basvuru rehberi",
        "odeme yontemleri",
        "islem rehberi"
      ]
    );


  return (
    professionalAudience &&
    administrativeAction
  );

}


/* =========================================================
   ALT KATEGORİ
   ========================================================= */

function resolveSubCategory({

  post,
  text,
  category,
  providerType,
  sport

}) {

  void providerType;


  if (
    category ===
    "news"
  ) {

    return resolveNewsSubCategory(
      post,
      text
    );

  }


  if (
    category ===
    "course"
  ) {

    if (
      [
        "basketball",
        "swimming",
        "volleyball",
        "gymnastics"
      ].includes(
        sport
      )
    ) {

      return sport;

    }


    return "other";

  }


  if (
    category ===
    "event"
  ) {

    if (
      containsAny(
        text,
        [

          "spor kampi",
          "hazirlik kampi",
          "yaz kampi",
          "kamp programi",
          "saglikli yasam",
          "wellness"

        ]
      )
    ) {

      return "camp";

    }


    if (
      containsAny(
        text,
        [

          "spor festivali",
          "festival",
          "spor senligi",
          "senlik",
          "tanitim gunu",
          "tanitim etkinligi"

        ]
      )
    ) {

      return "festival";

    }


    if (
      containsAny(
        text,
        [

          "seminer",
          "panel",
          "konferans",
          "workshop",
          "atolye",
          "egitim etkinligi",
          "bilgilendirme toplantisi"

        ]
      )
    ) {

      return "education";

    }


    return "competition";

  }


  if (
    category ===
    "campaign"
  ) {

    if (
      containsAny(
        text,
        [

          "kurs kampanyasi",
          "kurs indirimi",
          "egitim indirimi",
          "erken kayit indirimi",
          "ilk ders ucretsiz",
          "deneme dersi ucretsiz"

        ]
      )
    ) {

      return "course_campaign";

    }


    if (
      containsAny(
        text,
        [

          "uyelik",
          "abonelik",
          "spor salonu uyeligi",
          "yillik uyelik",
          "aylik uyelik"

        ]
      )
    ) {

      return "membership_campaign";

    }


    return "store_campaign";

  }


  if (
    category ===
    "jobs"
  ) {

    if (
      isJobSeekerContent(
        text
      )
    ) {

      return "job_seeker";

    }


    return "employer";

  }


  if (
    category ===
    "stores"
  ) {

    if (
      containsAny(
        text,
        [

          "protein",
          "takviye",
          "supplement",
          "beslenme",
          "vitamin",
          "mineral",
          "enerji jeli",
          "sporcu icecegi"

        ]
      )
    ) {

      return "nutrition";

    }


    if (
      containsAny(
        text,
        [

          "ayakkabi",
          "forma",
          "sort",
          "tayt",
          "tisort",
          "giyim",
          "esofman",
          "ceket",
          "mayo"

        ]
      )
    ) {

      return "clothing";

    }


    if (
      containsAny(
        text,
        [

          "top",
          "raket",
          "palet",
          "mat",
          "agirlik",
          "ekipman",
          "malzeme",
          "pota",
          "kale",
          "file"

        ]
      )
    ) {

      return "equipment";

    }


    return "accessories";

  }


  return "";

}


/* =========================================================
   HABER ALT KATEGORİSİ
   ========================================================= */

function resolveNewsSubCategory(
  post,
  text
) {

  const intent =
    normalizeId(
      post.contentIntent
    );


  if (
    containsAny(
      text,
      [

        "gorevlendirildi",
        "gorev aldi",
        "gorevine getirildi",
        "goreve getirildi",
        "atandi",
        "hakem olarak gorevlendirildi",
        "basantrenor oldu",
        "teknik direktor oldu"

      ]
    )
  ) {

    return "assignment";

  }


  if (
    containsAny(
      text,
      [

        "transfer oldu",
        "transfer edildi",
        "transferini acikladi",
        "kadroya katildi",
        "sozlesme imzaladi",
        "yeni transfer"

      ]
    )
  ) {

    return "transfer";

  }


  if (
    containsAny(
      text,
      [

        "sampiyon oldu",
        "sampiyonluga ulasti",
        "kupayi kazandi",
        "kupayi kaldirdi",
        "madalya kazandi",
        "altin madalya",
        "gumus madalya",
        "bronz madalya",
        "rekor kirdi",
        "derece elde etti",
        "klasmanina yukseldi",
        "klasmana yukseldi",
        "bir ust klasmana",
        "odul kazandi",
        "odulun sahibi"

      ]
    )
  ) {

    return "achievement";

  }


  if (
    intent ===
    "result"

    ||

    containsAny(
      text,
      [

        "mac sonucu",
        "musabaka sonucu",
        "karsilasma sonucu",
        "galip geldi",
        "maglup etti",
        "kazandi",
        "berabere",
        "sonuclandi"

      ]
    )
  ) {

    return "result";

  }


  if (
    isProfessionalAnnouncement(
      text
    )
  ) {

    return "announcement";

  }


  if (
    containsAny(
      text,
      [

        "duyuru",
        "aciklama yapti",
        "aciklama yayinladi",
        "bilgilendirme",
        "kamuoyu duyurusu"

      ]
    )
  ) {

    return "announcement";

  }


  return "development";

}


/* =========================================================
   CONTENT TYPE
   ========================================================= */

function resolveContentType({

  post,
  text,
  category,
  subCategory,
  section

}) {

  if (
    category ===
    "campaign"
  ) {

    return "campaign";

  }


  if (
    category ===
    "jobs"
  ) {

    return "job";

  }


  if (
    category ===
    "stores"
  ) {

    return "product";

  }


  if (
    category ===
    "course"
  ) {

    return "education";

  }


  if (
    category ===
    "event"
  ) {

    if (
      subCategory ===
      "education"
    ) {

      return "education";

    }


    if (
      subCategory ===
      "competition"
    ) {

      return "competition";

    }


    return "general";

  }


  if (
    category ===
    "news"
  ) {

    if (
      subCategory ===
      "result"

      ||

      subCategory ===
      "achievement"
    ) {

      return "competition";

    }


    if (
      subCategory ===
      "announcement"
    ) {

      return "announcement";

    }


    if (
      section ===
      SECTIONS.trainer_coach
    ) {

      return "coach";

    }


    if (
      section ===
      SECTIONS.individual_athlete
    ) {

      return "athlete";

    }


    return "general";

  }


  const existing =
    normalizeId(
      post.contentType
    );


  if (
    getContentType(
      existing
    )
  ) {

    return existing;

  }


  void text;


  return "general";

}


/* =========================================================
   İŞ İLANI
   ========================================================= */

function isJobContent(
  text
) {

  const strongSignals = [

    "is ilani",

    "personel araniyor",

    "antrenor araniyor",

    "egitmen araniyor",

    "calisma arkadasi araniyor",

    "ise alim",

    "eleman araniyor",

    "cv gonder",

    "ozgecmis gonder",

    "kariyer firsati",

    "acik pozisyon",

    "tam zamanli",

    "yari zamanli",

    "part time",

    "full time"

  ];


  if (
    containsAny(
      text,
      strongSignals
    )
  ) {

    return true;

  }


  const positionContext =
    containsAny(
      text,
      [

        "pozisyon",
        "maas",
        "ucret araligi",
        "calisma sekli",
        "is deneyimi"

      ]
    );


  const applicationContext =
    containsAny(
      text,
      [

        "basvuru",
        "aday",
        "cv",
        "ise alim"

      ]
    );


  return (
    positionContext &&
    applicationContext
  );

}


/* =========================================================
   İŞ ARAYAN
   ========================================================= */

function isJobSeekerContent(
  text
) {

  return containsAny(
    text,
    [

      "is ariyorum",
      "is arayan",
      "antrenor olarak is ariyorum",
      "egitmen olarak is ariyorum",
      "calisabilecegim",
      "is talebi",
      "is arayisim"

    ]
  );

}


/* =========================================================
   KAMPANYA
   ========================================================= */

function isCampaignContent(
  text
) {

  return containsAny(
    text,
    [

      "kampanya",
      "indirim",
      "ozel fiyat",
      "erken kayit indirimi",
      "uyelik indirimi",
      "ilk ay ucretsiz",
      "ilk ders ucretsiz",
      "deneme dersi ucretsiz",
      "kupon kodu",
      "promosyon",
      "% indirim",
      "yuzde indirim"

    ]
  );

}


/* =========================================================
   MAĞAZA / ÜRÜN
   ========================================================= */

function isStoreContent(
  text,
  providerType,
  intent
) {

  if (
    intent ===
    "product"
  ) {

    return true;

  }


  if (
    providerType ===
    "store"

    &&

    containsAny(
      text,
      [

        "urun",
        "fiyat",
        "stok",
        "satin al",
        "sepete ekle"

      ]
    )
  ) {

    return true;

  }


  return containsAny(
    text,
    [

      "sepete ekle",
      "satin al",
      "urun fiyati",
      "magaza fiyati",
      "stokta",
      "stok durumu",
      "kargo",
      "beden sec",
      "numara sec"

    ]
  );

}


/* =========================================================
   KURS
   ========================================================= */

function isCourseContent(
  text,
  intent
) {

  if (
    containsAny(
      text,
      [

        "spor kursu",

        "yuzme kursu",

        "basketbol kursu",

        "voleybol kursu",

        "cimnastik kursu",

        "jimnastik kursu",

        "antrenorluk kursu",

        "antrenor kursu",

        "hakemlik kursu",

        "hakem kursu",

        "kademe kursu",

        "1 kademe",

        "2 kademe",

        "3 kademe",

        "4 kademe",

        "5 kademe",

        "ozel ders",

        "grup dersi",

        "spor okulu",

        "yaz okulu",

        "kis okulu",

        "kurs kaydi",

        "kursumuz"

      ]
    )
  ) {

    return true;

  }


  if (
    intent ===
    "registration"

    &&

    containsAny(
      text,
      [

        "kurs",
        "ders",
        "spor okulu",
        "egitim programi"

      ]
    )
  ) {

    return true;

  }


  return false;

}


/* =========================================================
   TAMAMLANMIŞ HABER SİNYALİ
   ========================================================= */

function isCompletedNewsContent(
  text
) {

  return containsAny(
    text,
    [

      "sampiyon oldu",

      "sampiyonluga ulasti",

      "kupayi kazandi",

      "kupayi kaldirdi",

      "madalya kazandi",

      "rekor kirdi",

      "derece elde etti",

      "klasmana yukseldi",

      "klasmanina yukseldi",

      "gorevlendirildi",

      "gorev aldi",

      "atandi",

      "transfer oldu",

      "transfer edildi",

      "galip geldi",

      "maglup etti",

      "mac sona erdi",

      "musabaka sona erdi",

      "sonuclandi",

      "tamamlandi"

    ]
  );

}


/* =========================================================
   GERÇEK ETKİNLİK NESNESİ VAR MI?
   ========================================================= */

function hasEventObject(
  text
) {

  return containsAny(
    text,
    [

      "turnuva",

      "spor yarismasi",

      "yarisma",

      "sampiyona",

      "musabaka",

      "karsilasma",

      "mac",

      "festival",

      "spor senligi",

      "seminer",

      "panel",

      "konferans",

      "workshop",

      "atolye",

      "spor kampi",

      "hazirlik kampi",

      "organizasyon",

      "etkinlik"

    ]
  );

}


/* =========================================================
   ETKİNLİK Mİ?
   ========================================================= */

function isEventContent(
  text,
  post
) {

  const intent =
    normalizeId(
      post.contentIntent
    );


  const eventStatus =
    normalizeId(
      post.eventStatus
    );


  if (
    intent ===
    "result"

    ||

    eventStatus ===
    "completed"

    ||

    isCompletedNewsContent(
      text
    )
  ) {

    return false;

  }


  /*
    Profesyonel idari işlem event değildir.

    Örnek:
    Antrenör vize işlemleri başlayacak.
  */

  if (
    isProfessionalAnnouncement(
      text
    )
  ) {

    return false;

  }


  const eventObject =
    hasEventObject(
      text
    );


  if (
    !eventObject
  ) {

    return false;

  }


  if (
    [
      "upcoming",
      "ongoing"
    ].includes(
      eventStatus
    )
  ) {

    return true;

  }


  if (
    hasFutureEventLanguage(
      text
    )
  ) {

    return true;

  }


  if (
    containsAny(
      text,
      [

        "katilim",
        "kayit",
        "program",
        "takvim",
        "duzenlenecek",
        "gerceklestirilecek"

      ]
    )
  ) {

    return true;

  }


  /*
    Gerçek bir etkinlik nesnesi varsa fakat zamanı
    çıkarılamadıysa event olarak korunabilir.

    Geçmiş sonuç dili yukarıda zaten engellendi.
  */

  return true;

}


/* =========================================================
   GELECEK ETKİNLİK DİLİ

   KRİTİK:
   "başlayacak" tek başına yeterli değildir.

   Mutlaka etkinlik nesnesi de bulunmalıdır.
   ========================================================= */

function hasFutureEventLanguage(
  text
) {

  if (
    !hasEventObject(
      text
    )
  ) {

    return false;

  }


  return containsAny(
    text,
    [

      "duzenlenecek",

      "gerceklestirilecek",

      "yapilacak",

      "baslayacak",

      "basliyor",

      "duzenliyor",

      "gerceklestiriyor",

      "katilim saglanacak",

      "kayitlar devam ediyor",

      "kayitlar basladi",

      "programi aciklandi",

      "takvimi aciklandi",

      "gerceklesecek"

    ]
  );

}


/* =========================================================
   GERÇEK KAYIT / BAŞVURU AKSİYONU

   Her "kayıt" veya "başvuru" kelimesi kullanıcı aksiyonu
   değildir.

   Örnek:

   "başvuru rehberi yayımlandı"
   tek başına açık kayıt anlamına gelmez.

   "kayıtlar başladı"
   güçlü aksiyon sinyalidir.
   ========================================================= */

function hasRegistrationAction(
  post,
  text
) {

  const intent =
    normalizeId(
      post?.contentIntent
    );


  if (
    intent ===
    "registration"
  ) {

    return true;

  }


  if (
    containsAny(
      text,
      [

        "basvurular basladi",

        "basvurular devam ediyor",

        "basvuru yap",

        "basvuru formu",

        "son basvuru",

        "kayitlar basladi",

        "kayitlar devam ediyor",

        "kayit yaptir",

        "kayit formu",

        "son kayit",

        "kayit islemlerini tamamla",

        "kayit islemlerini tamamlamalari"

      ]
    )
  ) {

    return true;

  }


  /*
    Upstream Content Intent gerçekten actionable demişse
    ve kayıt/başvuru bağlamı varsa destek sinyalidir.
  */

  if (
    post?.actionable ===
    true

    &&

    containsAny(
      text,
      [
        "basvuru",
        "kayit"
      ]
    )
  ) {

    return true;

  }


  return false;

}


/* =========================================================
   ARAMA METNİ

   Persona'nın ürettiği metinden çok gerçek kaynak
   başlık/gövdesine ağırlık verilir.
   ========================================================= */

function buildSearchText(
  post
) {

  const values = [

    post?.editorial?.originalTitle,

    post?.editorial?.originalText,

    post?.originalTitle,

    post?.originalText,

    post?.title,

    post?.summary,

    post?.source?.name,

    post?.source?.shortName,

    post?.sourceName,

    post?.sport

  ];


  if (
    Array.isArray(
      post?.tags
    )
  ) {

    values.push(
      ...post.tags
    );

  }


  if (
    isPlainObject(
      post?.facts
    )
  ) {

    values.push(
      ...flattenObjectValues(
        post.facts
      )
    );

  }


  if (
    isPlainObject(
      post?.details
    )
  ) {

    values.push(
      ...flattenObjectValues(
        post.details
      )
    );

  }


  return normalizeText(

    values
      .filter(
        value =>
          value !==
          undefined

          &&

          value !==
          null
      )
      .join(
        " "
      )

  );

}


/* =========================================================
   EKSİK ALANLAR
   ========================================================= */

function findMissingFields(
  post,
  requiredFields
) {

  if (
    !Array.isArray(
      requiredFields
    )
  ) {

    return [];

  }


  const missing =
    [];


  for (
    const field
    of requiredFields
  ) {

    if (
      !hasFieldValue(
        post,
        field
      )
    ) {

      missing.push(
        field
      );

    }

  }


  return missing;

}


/* =========================================================
   FIELD VAR MI?
   ========================================================= */

function hasFieldValue(
  post,
  field
) {

  if (
    [
      "city",
      "district",
      "venue",
      "address"
    ].includes(
      field
    )
  ) {

    return hasUsefulValue(
      post?.location?.[
        field
      ]
    );

  }


  if (
    field ===
    "publishedAt"
  ) {

    return hasUsefulValue(

      post?.source?.publishedAt

      ||

      post?.lifecycle?.publishedAt

    );

  }


  if (
    field ===
    "startDate"
  ) {

    return hasUsefulValue(

      post?.details?.startDate

      ||

      post?.lifecycle?.startsAt

    );

  }


  if (
    field ===
    "endDate"
  ) {

    return hasUsefulValue(

      post?.details?.endDate

      ||

      post?.lifecycle?.endsAt

    );

  }


  return hasUsefulValue(
    post?.details?.[
      field
    ]
  );

}


/* =========================================================
   DEĞER VAR MI?
   ========================================================= */

function hasUsefulValue(
  value
) {

  if (
    value ===
    null

    ||

    value ===
    undefined
  ) {

    return false;

  }


  if (
    Array.isArray(
      value
    )
  ) {

    return value.length >
    0;

  }


  if (
    typeof value ===
    "string"
  ) {

    return Boolean(
      value.trim()
    );

  }


  return true;

}


/* =========================================================
   DISCOVERY CONFIDENCE
   ========================================================= */

function calculateDiscoveryConfidence({

  sport,
  section,
  category,
  subCategory,
  providerType,
  source,
  text,
  professionalAudience

}) {

  let score =
    15;


  if (
    sport

    &&

    sport !==
    "other"
  ) {

    score +=
      20;

  }


  if (
    Object.values(
      SECTIONS
    ).includes(
      section
    )
  ) {

    score +=
      10;

  }


  if (
    getCategory(
      category
    )

    ||

    CANONICAL_CATEGORIES.includes(
      category
    )
  ) {

    score +=
      20;

  }


  if (
    subCategory
  ) {

    if (
      getSubCategory(
        category,
        subCategory
      )
    ) {

      score +=
        15;

    }

    else {

      score +=
        8;

    }

  }


  if (
    providerType

    &&

    providerType !==
    "other"
  ) {

    score +=
      10;

  }


  if (
    source?.verified ===
    true
  ) {

    score +=
      10;

  }


  if (
    text.length >
    80
  ) {

    score +=
      5;

  }


  if (
    professionalAudience

    &&

    professionalAudience !==
    "general"
  ) {

    score +=
      5;

  }


  return clamp(
    score,
    0,
    100
  );

}


/* =========================================================
   SIGNALS
   ========================================================= */

function collectSignals({

  post,
  text,
  section,
  category,
  subCategory,
  providerType,
  sport,
  professionalAudience

}) {

  const signals =
    [];


  signals.push(
    `sport:${sport}`
  );


  signals.push(
    `section:${section}`
  );


  signals.push(
    `category:${category}`
  );


  signals.push(
    `subcategory:${subCategory || "none"}`
  );


  signals.push(
    `provider:${providerType}`
  );


  signals.push(
    `audience:${professionalAudience || "general"}`
  );


  if (
    post?.contentIntent
  ) {

    signals.push(
      `intent:${normalizeId(
        post.contentIntent
      )}`
    );

  }


  if (
    post?.eventStatus
  ) {

    signals.push(
      `event-status:${normalizeId(
        post.eventStatus
      )}`
    );

  }


  /* -------------------------------------------------------
     Gerçek kayıt/başvuru aksiyonu
     ------------------------------------------------------- */

  if (
    hasRegistrationAction(
      post,
      text
    )
  ) {

    signals.push(
      "action:registration"
    );

  }


  /* -------------------------------------------------------
     Deadline
     ------------------------------------------------------- */

  if (
    containsAny(
      text,
      [

        "son basvuru",
        "son gun",
        "sona erecek",
        "son kayit"

      ]
    )
  ) {

    signals.push(
      "urgency:deadline"
    );

  }


  if (
    containsAny(
      text,
      [
        "ucretsiz"
      ]
    )
  ) {

    signals.push(
      "price:free"
    );

  }


  if (
    containsAny(
      text,
      [
        "indirim",
        "kampanya"
      ]
    )
  ) {

    signals.push(
      "commercial:campaign"
    );

  }


  if (
    isCompletedNewsContent(
      text
    )
  ) {

    signals.push(
      "temporal-language:completed"
    );

  }


  /*
    "başlayacak" tek başına artık future event sinyali
    üretmez.

    Gerçek etkinlik nesnesi gerekir.
  */

  if (
    hasFutureEventLanguage(
      text
    )
  ) {

    signals.push(
      "temporal-language:future-event"
    );

  }


  if (
    isProfessionalAnnouncement(
      text
    )
  ) {

    signals.push(
      "professional:announcement"
    );

  }


  return [

    ...new Set(
      signals.filter(
        Boolean
      )
    )

  ];

}


/* =========================================================
   CATEGORY ALIAS
   ========================================================= */

function normalizeCategoryAlias(
  value
) {

  const id =
    normalizeId(
      value
    );


  const aliases = {

    news:
      "news",

    haber:
      "news",


    course:
      "course",

    courses:
      "course",

    kurs:
      "course",


    event:
      "event",

    events:
      "event",

    etkinlik:
      "event",


    campaign:
      "campaign",

    campaigns:
      "campaign",

    kampanya:
      "campaign",


    jobs:
      "jobs",

    job:
      "jobs",

    is_ilanlari:
      "jobs",


    stores:
      "stores",

    store:
      "stores",

    magazalar:
      "stores",

    magaza:
      "stores"

  };


  return (

    aliases[
      id
    ]

    ||

    ""

  );

}


/* =========================================================
   FALLBACK
   ========================================================= */

function createFallbackDiscovery() {

  const category =
    "news";


  return {

    version:
      DISCOVERY_VERSION,

    sport:
      "other",

    section:
      SECTIONS.business_institution,

    category:
      category,

    subCategory:
      "development",

    providerType:
      "other",

    contentType:
      "general",

    professionalAudience:
      "general",

    requiredFields:
      getCategoryFilterFields(
        category
      ),

    missingFields:
      getCategoryFilterFields(
        category
      ),

    confidenceScore:
      0,

    signals:
      [],

    discoveredAt:
      new Date()
        .toISOString()

  };

}


/* =========================================================
   OBJEDEN METİN DEĞERLERİ
   ========================================================= */

function flattenObjectValues(
  value
) {

  const output =
    [];


  if (
    !isPlainObject(
      value
    )
  ) {

    return output;

  }


  for (
    const item
    of Object.values(
      value
    )
  ) {

    if (
      item ===
      null

      ||

      item ===
      undefined
    ) {

      continue;

    }


    if (
      Array.isArray(
        item
      )
    ) {

      output.push(
        ...item
      );


      continue;

    }


    if (
      isPlainObject(
        item
      )
    ) {

      output.push(
        ...flattenObjectValues(
          item
        )
      );


      continue;

    }


    output.push(
      item
    );

  }


  return output;

}


/* =========================================================
   KEYWORD
   ========================================================= */

function containsAny(
  text,
  values
) {

  const normalizedText =
    normalizeText(
      text
    );


  if (
    !normalizedText

    ||

    !Array.isArray(
      values
    )
  ) {

    return false;

  }


  return values.some(
    value => {

      const normalizedValue =
        normalizeText(
          value
        );


      return Boolean(

        normalizedValue

        &&

        normalizedText.includes(
          normalizedValue
        )

      );

    }
  );

}


/* =========================================================
   NORMALIZE ID
   ========================================================= */

function normalizeId(
  value
) {

  return String(
    value ||
    ""
  )

    .trim()

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
    )

    .replace(
      /[^a-z0-9_-]+/g,
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

  return String(
    value ||
    ""
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
    )

    .replace(
      /[^a-z0-9%]+/g,
      " "
    )

    .replace(
      /\s+/g,
      " "
    )

    .trim();

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

    value

    &&

    typeof value ===
    "object"

    &&

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
