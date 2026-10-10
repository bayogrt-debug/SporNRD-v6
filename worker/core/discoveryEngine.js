/* =========================================================
   SporNRD
   worker/core/discoveryEngine.js

   SporNRD Keşif / Sınıflandırma Motoru

   Sürüm: 6.1.1

   ANA GÖREV
   ---------------------------------------------------------
   Bir içeriğin:

   - Branşını
   - Bölümünü
   - Ana kategorisini
   - Alt kategorisini
   - Provider türünü
   - İçerik türünü
   - Filtre alanlarını
   - Eksik kritik bilgilerini

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

   Kullanıcı ekranında:

   Yüzme Haber
   Yüzme Kurs
   Yüzme Etkinlik
   Yüzme Kampanya
   Yüzme İş İlanı
   Yüzme Mağaza

   =========================================================
   SPORNRD BÖLÜMLERİ
   =========================================================

   individual_athlete
   trainer_coach
   business_institution

   NOT:
   Bölüm kart üzerinde gösterilmek zorunda değildir.

   Bölümün temel anlamı:

   "Bu içeriği kim sunuyor / yayımlıyor?"

   Örnek:

   Türkiye Yüzme Federasyonu
   → business_institution

   Bir antrenörün kendi hesabı
   → trainer_coach

   Bir sporcunun kendi hesabı
   → individual_athlete

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

   Federasyonun yayımlaması kursu etkinliğe çevirmez.

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
  "1.1";


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
     GENEL İÇERİK METNİ
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


  /*
    Provider belirlerken haber metninin tamamını
    kullanmak tehlikelidir.

    Örnek:
    TBF haberi içinde "antrenör" kelimesi geçmesi
    TBF'yi antrenöre dönüştürmemeli.

    Bu nedenle provider için kaynak odaklı metin
    ayrıca oluşturulur.
  */

  const providerText =
    buildProviderText(
      post,
      source
    );


  /* =======================================================
     PROVIDER
     ========================================================= */

  const providerType =
    resolveProviderType(
      post,
      source,
      providerText
    );


  /* =======================================================
     BÖLÜM
     ========================================================= */

  const section =
    resolveSection({

      providerType:
        providerType,

      source:
        source,

      providerText:
        providerText

    });


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

      section:
        section,

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

      section:
        section,

      sport:
        sport

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
        subCategory

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
        text

    });


  /* =======================================================
     SİNYALLER
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
        sport

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
       Bölüm

       Şimdilik arka planda.
       İleride profil tipiyle bağlanabilir.
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
       Provider
       ----------------------------------------------------- */

    providerType:
      providerType,


    /* -----------------------------------------------------
       İçerik türü
       ----------------------------------------------------- */

    contentType:
      contentType,


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


    /* -----------------------------------------------------
       Branş
       ----------------------------------------------------- */

    sport:
      discovery.sport,


    /* -----------------------------------------------------
       Bölüm
       ----------------------------------------------------- */

    section:
      discovery.section,


    /* -----------------------------------------------------
       Ana kategori
       ----------------------------------------------------- */

    category:
      discovery.category,


    /* -----------------------------------------------------
       Alt kategori
       ----------------------------------------------------- */

    subCategory:
      discovery.subCategory,


    /* -----------------------------------------------------
       Provider
       ----------------------------------------------------- */

    providerType:
      discovery.providerType,


    /* -----------------------------------------------------
       İçerik tipi
       ----------------------------------------------------- */

    contentType:
      discovery.contentType,


    /* -----------------------------------------------------
       Discovery meta
       ----------------------------------------------------- */

    discoveryMeta: {

      version:
        discovery.version,

      confidenceScore:
        discovery.confidenceScore,

      section:
        discovery.section,

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

   İçeriğin konusuyla kaynağın kimliğini
   birbirine karıştırmıyoruz.
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
   ========================================================= */

function resolveProviderType(
  post,
  source,
  providerText
) {

  /* -------------------------------------------------------
     Posttaki geçerli providerType
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     Registry otoritesi
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     Source Type
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     Kulüp
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     Akademi
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     Spor salonu
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     Tesis
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     Mağaza
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     Organizatör
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     Medya
     ------------------------------------------------------- */

  if (
    containsAny(
      providerText,
      [

        "gazete",
        "haber",
        "medya",
        "tv",
        "televizyon"

      ]
    )
  ) {

    return "media";

  }


  /* -------------------------------------------------------
     Antrenör / eğitmen

     Burada yalnızca provider kaynak metnine bakılır.
     Haber içindeki "antrenör" kelimesine değil.
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     Gelecekte taxonomy'ye eklendiğinde
     athlete / individual da desteklenebilir.
     ------------------------------------------------------- */

  if (
    [
      "athlete",
      "individual"
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

   Bölüm = içeriği yayımlayan / sunan taraf.
   ========================================================= */

function resolveSection({

  providerType,
  source,
  providerText

}) {

  const type =
    normalizeId(
      providerType
    );


  /* -------------------------------------------------------
     Eğitmen / Antrenör
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     Bireysel / Sporcu
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     Kaynak adı açıkça antrenör/eğitmen hesabıysa
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     Federasyon, kulüp, akademi, tesis, mağaza,
     medya, organizatör vb.
     ------------------------------------------------------- */

  if (
    [

      "federation",
      "club",
      "academy",
      "gym",
      "facility",
      "store",
      "organizer",
      "media"

    ].includes(
      type
    )
  ) {

    return SECTIONS.business_institution;

  }


  /*
    Şu an taranan kaynakların büyük bölümü
    kurum/işletme niteliğinde olduğu için güvenli fallback.

    Profil sistemi geldiğinde kimliği doğrulanmış
    kişi hesaplarında bu değer doğrudan profilden gelecektir.
  */

  void source;


  return SECTIONS.business_institution;

}


/* =========================================================
   SPORT
   ========================================================= */

function resolveSport(
  post,
  source,
  text
) {

  /* -------------------------------------------------------
     Yeni modelde geçerli sport
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     Registry
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     Legacy Türkçe sport
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     İçerik
     ------------------------------------------------------- */

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

   KESİN 6 KATEGORİ:

   news
   course
   event
   campaign
   jobs
   stores
   ========================================================= */

function resolveCategory({

  post,
  text,
  source,
  providerType,
  section,
  sport

}) {

  void source;
  void section;
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
     1. İŞ İLANLARI

     En güçlü işlem türlerinden biri.
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

     ÇOK ÖNEMLİ:

     Federasyon tarafından yayımlanan

     "2. Kademe Yüzme Antrenörlük Kursu"

     artık Etkinlik DEĞİL.

     → Yüzme Kurs

     Provider yalnızca bölümün
     İşletme & Kurum olmasını sağlar.
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
     5. TAMAMLANMIŞ OLAY / SONUÇ

     Tamamlanmış müsabaka artık yaklaşan etkinlik değildir.

     Örnek:

     Fenerbahçe şampiyon oldu
     → Haber

     Maç sonucu açıklandı
     → Haber

     Murat Ciner A Klasmanına yükseldi
     → Haber
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
     6. GERÇEK GELECEK / DEVAM EDEN ETKİNLİK

     Etkinlik olması için yalnızca "FIBA" veya "kupa"
     kelimesi yeterli değildir.

     Gerçek etkinlik sinyali aranır.
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
     7. CONTENT INTENT NEWS / ANNOUNCEMENT
     ========================================================= */

  if (
    [
      "news",
      "announcement"
    ].includes(
      intent
    )
  ) {

    return "news";

  }


  /* =======================================================
     8. ESKİ KATEGORİ SADECE ZAYIF SİNYAL

     Eski sistemde events çok geniş kullanıldığı için
     doğrudan korunmaz.
     ========================================================= */

  const existing =
    normalizeCategoryAlias(
      post.category
    );


  if (
    CANONICAL_CATEGORIES.includes(
      existing
    )
  ) {

    /*
      Eski event değeri, güçlü event kanıtı yoksa
      korunmaz.

      Böylece eski yanlış sınıflandırmalar
      yeni sistemi kirletmez.
    */

    if (
      existing !==
      "event"
    ) {

      return existing;

    }

  }


  /* =======================================================
     VARSAYILAN

     Bir içerik kurs/etkinlik/kampanya/iş/ürün
     olduğuna dair güçlü kanıt taşımıyorsa
     en güvenli sınıf HABER'dir.
     ========================================================= */

  return "news";

}


/* =========================================================
   ALT KATEGORİ
   ========================================================= */

function resolveSubCategory({

  post,
  text,
  category,
  providerType,
  section,
  sport

}) {

  void providerType;
  void section;


  /* =======================================================
     HABER

     Kullanıcı kartında alt kategori göstermek zorunda değiliz.

     Arka planda karar motoru için tutulur.
     ========================================================= */

  if (
    category ===
    "news"
  ) {

    return resolveNewsSubCategory(
      post,
      text
    );

  }


  /* =======================================================
     KURS

     Kullanıcının daha önce belirlediği yapı:

     Basketbol
     Yüzme
     Voleybol
     Cimnastik

     Bu nedenle course subCategory branştır.

     Kartta:

     Yüzme Kurs
     Basketbol Kurs

     gibi görünür.
     ========================================================= */

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


  /* =======================================================
     ETKİNLİK
     ========================================================= */

  if (
    category ===
    "event"
  ) {

    /* -----------------------------------------------------
       Kamp / Sağlıklı Yaşam
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       Festival / Tanıtım
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       Eğitim / Seminer

       Kurs kelimesi burada kullanılmaz.
       Kurs artık kendi ana kategorisidir.
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       Turnuva / Spor Yarışması
       ----------------------------------------------------- */

    return "competition";

  }


  /* =======================================================
     KAMPANYA
     ========================================================= */

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


  /* =======================================================
     İŞ İLANLARI
     ========================================================= */

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


  /* =======================================================
     MAĞAZALAR
     ========================================================= */

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

   Bunlar kullanıcıya gösterilmek zorunda değildir.

   Sistem karar mekanizması için tutulur.
   ========================================================= */

function resolveNewsSubCategory(
  post,
  text
) {

  const intent =
    normalizeId(
      post.contentIntent
    );


  /* -------------------------------------------------------
     Görevlendirme / Atama
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     Transfer
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     Başarı
     ------------------------------------------------------- */

  if (
    containsAny(
      text,
      [

        "sampiyon oldu",
        "sampiyonluga ulasti",
        "sampiyon",
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


  /* -------------------------------------------------------
     Müsabaka sonucu
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     Duyuru / Açıklama
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     Genel gelişme
     ------------------------------------------------------- */

  return "development";

}


/* =========================================================
   CONTENT TYPE
   ========================================================= */

function resolveContentType({

  post,
  text,
  category,
  subCategory

}) {

  /* =======================================================
     KAMPANYA
     ========================================================= */

  if (
    category ===
    "campaign"
  ) {

    return "campaign";

  }


  /* =======================================================
     İŞ
     ========================================================= */

  if (
    category ===
    "jobs"
  ) {

    return "job";

  }


  /* =======================================================
     MAĞAZA
     ========================================================= */

  if (
    category ===
    "stores"
  ) {

    return "product";

  }


  /* =======================================================
     KURS
     ========================================================= */

  if (
    category ===
    "course"
  ) {

    return "education";

  }


  /* =======================================================
     ETKİNLİK
     ========================================================= */

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


  /* =======================================================
     HABER
     ========================================================= */

  if (
    category ===
    "news"
  ) {

    if (
      subCategory ===
      "result"
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
      containsAny(
        text,
        [

          "antrenor",
          "basantrenor",
          "teknik direktor"

        ]
      )
    ) {

      return "coach";

    }


    if (
      containsAny(
        text,
        [

          "sporcu",
          "oyuncu",
          "yuzucu",
          "basketbolcu",
          "voleybolcu",
          "milli sporcu"

        ]
      )
    ) {

      return "athlete";

    }


    return "general";

  }


  /* -------------------------------------------------------
     Eski content type yalnızca son fallback.
     ------------------------------------------------------- */

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


  return "general";

}


/* =========================================================
   İŞ İLANI MI?

   "Başvuru yap" tek başına iş ilanı sayılmaz.

   İş bağlamı gerekir.
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
        "deneyim",
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
        "ise"

      ]
    );


  return (
    positionContext &&
    applicationContext
  );

}


/* =========================================================
   İŞ ARAYAN MI?
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
   KAMPANYA MI?
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
   MAĞAZA / ÜRÜN MÜ?
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
   KURS MU?

   Federasyon kursları dahil.
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


  /*
    Registration intent tek başına kurs değildir.

    Kurs/eğitim sinyaliyle birlikte olmalıdır.
  */

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

   Tarih bulunmasa bile dil geçmişte tamamlanmış
   bir gelişmeyi açıkça anlatabilir.
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
   ETKİNLİK Mİ?

   "FIBA" kelimesi tek başına event değildir.

   Gerçek organizasyon / takvim / katılım
   sinyali gerekir.
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


  /* -------------------------------------------------------
     Sonuç / tamamlanmış olay artık HABER.
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     Açık etkinlik türleri
     ------------------------------------------------------- */

  const eventObject =
    containsAny(
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

        "spor kampi",

        "hazirlik kampi",

        "organizasyon",

        "etkinlik"

      ]
    );


  if (
    !eventObject
  ) {

    return false;

  }


  /* -------------------------------------------------------
     Yaklaşan / devam eden kararı Content Intent'ten geldiyse
     güçlü event sinyalidir.
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     Gelecek zaman dili
     ------------------------------------------------------- */

  if (
    hasFutureEventLanguage(
      text
    )
  ) {

    return true;

  }


  /* -------------------------------------------------------
     Katılım / program sinyali
     ------------------------------------------------------- */

  if (
    containsAny(
      text,
      [

        "katilim",
        "kayit",
        "program",
        "takvim",
        "baslayacak",
        "duzenlenecek",
        "gerceklestirilecek"

      ]
    )
  ) {

    return true;

  }


  /*
    Açıkça etkinlik nesnesi var ama zaman bilinmiyorsa
    event olarak tutulabilir.

    Ancak tamamlanmış sonuç dili yukarıda zaten elendi.
  */

  return eventObject;

}


/* =========================================================
   GELECEK ETKİNLİK DİLİ
   ========================================================= */

function hasFutureEventLanguage(
  text
) {

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
   ARAMA METNİ

   Burada kaynağın orijinal metni önemlidir.

   Persona'nın önceki yanlış yorumunun sisteme
   geri beslenmesini azaltmak için orijinal alanlara
   daha çok güveniyoruz.
   ========================================================= */

function buildSearchText(
  post
) {

  const values =
    [

      post?.editorial?.originalTitle,

      post?.editorial?.originalText,

      post?.originalTitle,

      post?.originalText,

      post?.title,

      post?.summary,

      post?.source?.name,

      post?.source?.shortName,

      post?.sourceName,

      post?.sport,

      post?.contentIntent,

      post?.eventStatus,

      post?.contentType,

      post?.providerType

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
          undefined &&
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

   Eksik alan hata değildir.

   İleride crawler / extraction motoruna:

   "Bu tür içerikte özellikle bu bilgileri ara"

   demek için kullanılır.
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

  /* -------------------------------------------------------
     Konum
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     Yayın tarihi
     ------------------------------------------------------- */

  if (
    field ===
    "publishedAt"
  ) {

    return hasUsefulValue(

      post?.source?.publishedAt ||

      post?.lifecycle?.publishedAt

    );

  }


  /* -------------------------------------------------------
     Başlangıç / bitiş
     ------------------------------------------------------- */

  if (
    field ===
    "startDate"
  ) {

    return hasUsefulValue(

      post?.details?.startDate ||

      post?.lifecycle?.startsAt

    );

  }


  if (
    field ===
    "endDate"
  ) {

    return hasUsefulValue(

      post?.details?.endDate ||

      post?.lifecycle?.endsAt

    );

  }


  /* -------------------------------------------------------
     Details
     ------------------------------------------------------- */

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
    null ||
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
  text

}) {

  let score =
    15;


  /* -------------------------------------------------------
     Branş
     ------------------------------------------------------- */

  if (
    sport &&
    sport !==
    "other"
  ) {

    score +=
      20;

  }


  /* -------------------------------------------------------
     Bölüm
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     Ana kategori

     Taxonomy güncellendiğinde getCategory()
     doğrudan doğrulayacaktır.

     Geçiş döneminde canonical ID de kabul edilir.
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     Alt kategori
     ------------------------------------------------------- */

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

      /*
        Taxonomy güncellemesi tamamlanana kadar
        yeni news subcategory'lerini tamamen
        güvensiz saymıyoruz.
      */

      score +=
        8;

    }

  }


  /* -------------------------------------------------------
     Provider
     ------------------------------------------------------- */

  if (
    providerType &&
    providerType !==
    "other"
  ) {

    score +=
      10;

  }


  /* -------------------------------------------------------
     Doğrulanmış kaynak
     ------------------------------------------------------- */

  if (
    source?.verified ===
    true
  ) {

    score +=
      10;

  }


  /* -------------------------------------------------------
     İçerik zenginliği
     ------------------------------------------------------- */

  if (
    text.length >
    80
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
  sport

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


  if (
    containsAny(
      text,
      [
        "basvuru",
        "kayit"
      ]
    )
  ) {

    signals.push(
      "action:registration"
    );

  }


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


  if (
    hasFutureEventLanguage(
      text
    )
  ) {

    signals.push(
      "temporal-language:future"
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

   Eski taxonomy'den gelen:

   courses
   events
   campaigns

   yeni tekil ID'lere çevrilir.
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
      null ||
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
    !normalizedText ||
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

        normalizedValue &&

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
