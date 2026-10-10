/* =========================================================
   SporNRD
   worker/core/coreTest.js

   SporNRD v6.1 Core Test Sistemi

   Amaç:
   ---------------------------------------------------------
   - taxonomy.js
   - postSchema.js
   - sourceRegistry.js
   - normalizer.js
   - lifecycle.js
   - discoveryEngine.js
   - personaEngine.js

   dosyalarının birbirleriyle doğru çalıştığını
   canlı sistemi bozmadan kontrol etmek.

   Bu dosya gerçek internet kaynağına bağlanmaz.
   Test verileri kullanır.
   ========================================================= */


import {

  SPORTS,
  CATEGORIES,
  PROVIDER_TYPES,
  getSport,
  getCategory

} from "./taxonomy.js";


import {

  createPost,
  validatePost,
  POST_SCHEMA_VERSION

} from "./postSchema.js";


import {

  getActiveSources,
  getPublicSources,
  validateSourceRegistry,
  SOURCE_REGISTRY_VERSION

} from "./sourceRegistry.js";


import {

  normalizeLegacyItem,
  NORMALIZER_VERSION

} from "./normalizer.js";


import {

  applyLifecycle,
  createLifecycleSummary,
  LIFECYCLE_VERSION

} from "./lifecycle.js";


import {

  applyDiscovery,
  DISCOVERY_VERSION

} from "./discoveryEngine.js";


import {

  applyPersona,
  PERSONA_VERSION

} from "../intelligence/personaEngine.js";


/* =========================================================
   CORE TEST VERSION
   ========================================================= */

export const CORE_TEST_VERSION =
  "1.0";


/* =========================================================
   ANA TEST
   ========================================================= */

export function runCoreTest() {

  const startedAt =
    new Date()
      .toISOString();


  const tests =
    [];


  /* =======================================================
     1. TAXONOMY TEST
     ========================================================= */

  const taxonomyTest =
    testTaxonomy();


  tests.push(
    taxonomyTest
  );


  /* =======================================================
     2. SOURCE REGISTRY TEST
     ========================================================= */

  const registryTest =
    testSourceRegistry();


  tests.push(
    registryTest
  );


  /* =======================================================
     3. TÜKETİCİ KURS POSTU
     ========================================================= */

  const courseResult =
    testConsumerCourse();


  tests.push(
    courseResult.test
  );


  /* =======================================================
     4. LEGACY FEDERASYON POSTU
     ========================================================= */

  const legacyResult =
    testLegacyFederationPost();


  tests.push(
    legacyResult.test
  );


  /* =======================================================
     GENEL DURUM
     ========================================================= */

  const failed =
    tests.filter(
      test =>
        test.ok !==
        true
    );


  const passed =
    tests.length -
    failed.length;


  return {

    ok:
      failed.length ===
      0,

    service:
      "SporNRD Core Test",

    coreTestVersion:
      CORE_TEST_VERSION,


    versions: {

      postSchema:
        POST_SCHEMA_VERSION,

      sourceRegistry:
        SOURCE_REGISTRY_VERSION,

      normalizer:
        NORMALIZER_VERSION,

      lifecycle:
        LIFECYCLE_VERSION,

      discovery:
        DISCOVERY_VERSION,

      persona:
        PERSONA_VERSION

    },


    startedAt:
      startedAt,

    finishedAt:
      new Date()
        .toISOString(),


    summary: {

      total:
        tests.length,

      passed:
        passed,

      failed:
        failed.length

    },


    tests:
      tests,


    samples: {

      consumerCourse:
        createReadableSample(
          courseResult.post
        ),

      legacyFederation:
        createReadableSample(
          legacyResult.post
        )

    }

  };

}


/* =========================================================
   TAXONOMY TEST
   ========================================================= */

function testTaxonomy() {

  const errors =
    [];


  if (
    !getSport(
      "swimming"
    )
  ) {

    errors.push(
      "swimming branşı bulunamadı."
    );

  }


  if (
    !getSport(
      "basketball"
    )
  ) {

    errors.push(
      "basketball branşı bulunamadı."
    );

  }


  if (
    !getCategory(
      "courses"
    )
  ) {

    errors.push(
      "courses kategorisi bulunamadı."
    );

  }


  if (
    !getCategory(
      "events"
    )
  ) {

    errors.push(
      "events kategorisi bulunamadı."
    );

  }


  if (
    Object.keys(
      SPORTS
    ).length <
    4
  ) {

    errors.push(
      "Branş kayıtları eksik."
    );

  }


  if (
    Object.keys(
      CATEGORIES
    ).length !==
    5
  ) {

    errors.push(
      "Ana kategori sayısı 5 değil."
    );

  }


  if (
    !PROVIDER_TYPES.federation
  ) {

    errors.push(
      "federation providerType bulunamadı."
    );

  }


  return {

    id:
      "taxonomy",

    name:
      "Taxonomy",

    ok:
      errors.length ===
      0,

    errors:
      errors

  };

}


/* =========================================================
   SOURCE REGISTRY TEST
   ========================================================= */

function testSourceRegistry() {

  const registry =
    validateSourceRegistry();


  const activeSources =
    getActiveSources();


  const publicSources =
    getPublicSources();


  const errors =
    [
      ...(
        Array.isArray(
          registry.errors
        )
          ? registry.errors
          : []
      )
    ];


  if (
    activeSources.length <
    2
  ) {

    errors.push(
      "En az TYF ve TBF aktif kaynak olmalı."
    );

  }


  const ids =
    new Set(
      activeSources.map(
        source =>
          source.id
      )
    );


  if (
    !ids.has(
      "tyf"
    )
  ) {

    errors.push(
      "TYF registry içinde bulunamadı."
    );

  }


  if (
    !ids.has(
      "tbf"
    )
  ) {

    errors.push(
      "TBF registry içinde bulunamadı."
    );

  }


  return {

    id:
      "source-registry",

    name:
      "Source Registry",

    ok:
      errors.length ===
      0,

    sourceCount:
      activeSources.length,

    publicSourceCount:
      publicSources.length,

    warnings:
      registry.warnings || [],

    errors:
      errors

  };

}


/* =========================================================
   TÜKETİCİ KURSU TESTİ

   Bu test özellikle şu ayrımı kontrol eder:

   Akademi + çocuk yüzme kursu
   =
   Spor Kursları > Yüzme
   ========================================================= */

function testConsumerCourse() {

  const errors =
    [];


  let post =
    createPost({

      id:
        "test-course-001",


      sport:
        "swimming",


      providerType:
        "academy",


      source: {

        id:
          "test-academy",

        name:
          "Test Yüzme Akademisi",

        shortName:
          "TEST",

        sourceType:
          "AKADEMİ",

        website:
          "https://example.com",

        url:
          "https://example.com/yuzme-kursu",

        verified:
          false

      },


      editorial: {

        enabled:
          true,

        originalTitle:
          "7-12 Yaş Çocuk Yüzme Kursu Kayıtları Başladı",

        originalText:
          "Bornova'da Salı ve Perşembe günleri 18:00-19:00 saatleri arasında çocuk yüzme kursu.",

        headline:
          "7-12 Yaş Çocuk Yüzme Kursu",

        influencerText:
          ""

      },


      location: {

        country:
          "Türkiye",

        city:
          "İzmir",

        district:
          "Bornova",

        venue:
          "Test Yüzme Akademisi"

      },


      details: {

        days: [
          "Salı",
          "Perşembe"
        ],

        startTime:
          "18:00",

        endTime:
          "19:00",

        price:
          2500,

        currency:
          "TRY",

        priceUnit:
          "ay",

        ageMin:
          7,

        ageMax:
          12,

        capacity:
          12

      },


      actions: [

        {

          type:
            "detail",

          label:
            "Detay"

        },

        {

          type:
            "register",

          label:
            "Kayıt Bilgisi",

          url:
            "https://example.com/yuzme-kursu"

        }

      ],


      lifecycle: {

        firstSeenAt:
          new Date()
            .toISOString(),

        lastSeenAt:
          new Date()
            .toISOString()

      }

    });


  /*
    Önce keşif.
  */

  post =
    applyDiscovery(
      post
    );


  /*
    Sonra yaşam döngüsü.
  */

  post =
    applyLifecycle(
      post
    );


  /*
    Sonra SporNRD Persona.
  */

  post =
    applyPersona(
      post
    );


  const validation =
    validatePost(
      post
    );


  if (
    !validation.valid
  ) {

    errors.push(
      ...validation.errors
    );

  }


  if (
    post.category !==
    "courses"
  ) {

    errors.push(
      `Beklenen category courses, gelen: ${post.category}`
    );

  }


  if (
    post.subCategory !==
    "swimming"
  ) {

    errors.push(
      `Beklenen subCategory swimming, gelen: ${post.subCategory}`
    );

  }


  if (
    post.providerType !==
    "academy"
  ) {

    errors.push(
      `Beklenen providerType academy, gelen: ${post.providerType}`
    );

  }


  if (
    post.sport !==
    "swimming"
  ) {

    errors.push(
      `Beklenen sport swimming, gelen: ${post.sport}`
    );

  }


  if (
    !post.editorial?.headline
  ) {

    errors.push(
      "Persona başlığı üretilemedi."
    );

  }


  if (
    !post.editorial?.influencerText
  ) {

    errors.push(
      "Persona açıklaması üretilemedi."
    );

  }


  return {

    test: {

      id:
        "consumer-course",

      name:
        "Consumer Course Discovery",

      ok:
        errors.length ===
        0,

      errors:
        errors

    },

    post:
      post

  };

}


/* =========================================================
   LEGACY FEDERASYON TESTİ

   Mevcut TYF/TBF yapısındaki postun
   v6.1 standardına dönüşmesini test eder.

   Federasyon + Antrenör Kursu
   tüketici kursu DEĞİL;
   Etkinlik > Eğitim olmalı.
   ========================================================= */

function testLegacyFederationPost() {

  const errors =
    [];


  const legacyItem = {

    id:
      "tyf-test-001",

    externalId:
      "tyf-test-001",


    title:
      "2. Kademe Yüzme Antrenörlüğü Kursu",

    summary:
      "Türkiye Yüzme Federasyonu antrenörlük kursuna ilişkin yeni duyuru yayımladı.",


    originalTitle:
      "2. Kademe Yüzme Antrenörlük Kursu Duyurusu",

    originalText:
      "Antrenörlük kursuna başvurular federasyonun resmî kaynağından yapılacaktır.",


    editorial:
      true,

    editorialLabel:
      "SporNRD Özeti",

    editorialVersion:
      "6.0.4",


    sourceId:
      "tyf",

    source:
      "Türkiye Yüzme Federasyonu",

    sourceShortName:
      "TYF",

    sourceType:
      "FEDERASYON",

    verified:
      true,

    sport:
      "Yüzme",


    category:
      "coach",

    audience:
      "antrenör",

    relevanceScore:
      10,

    qualityScore:
      80,

    finalScore:
      116,


    facts: {

      organization:
        "Türkiye Yüzme Federasyonu",

      sport:
        "Yüzme",

      grade:
        "2",

      location:
        "Ankara"

    },


    date:
      "10.10.2026",

    location:
      "Ankara",


    url:
      "https://www.tyf.gov.tr/haber/test.html",

    image:
      "",

    pdfUrl:
      "",


    emoji:
      "🧑‍🏫"

  };


  let post =
    normalizeLegacyItem(
      legacyItem,
      "tyf"
    );


  if (
    !post
  ) {

    return {

      test: {

        id:
          "legacy-federation",

        name:
          "Legacy Federation Conversion",

        ok:
          false,

        errors: [
          "Legacy post normalize edilemedi."
        ]

      },

      post:
        null

    };

  }


  post =
    applyDiscovery(
      post
    );


  post =
    applyLifecycle(
      post
    );


  post =
    applyPersona(
      post
    );


  if (
    post.sport !==
    "swimming"
  ) {

    errors.push(
      `Beklenen sport swimming, gelen: ${post.sport}`
    );

  }


  if (
    post.providerType !==
    "federation"
  ) {

    errors.push(
      `Beklenen providerType federation, gelen: ${post.providerType}`
    );

  }


  if (
    post.category !==
    "events"
  ) {

    errors.push(
      `Beklenen category events, gelen: ${post.category}`
    );

  }


  if (
    post.subCategory !==
    "education"
  ) {

    errors.push(
      `Beklenen subCategory education, gelen: ${post.subCategory}`
    );

  }


  return {

    test: {

      id:
        "legacy-federation",

      name:
        "Legacy Federation Conversion",

      ok:
        errors.length ===
        0,

      errors:
        errors

    },

    post:
      post

  };

}


/* =========================================================
   OKUNABİLİR ÖRNEK
   ========================================================= */

function createReadableSample(
  post
) {

  if (
    !post
  ) {

    return null;

  }


  return {

    id:
      post.id,


    sport:
      post.sport,

    sportLabel:
      getSport(
        post.sport
      )?.label ||
      "",


    category:
      post.category,

    categoryLabel:
      getCategory(
        post.category
      )?.label ||
      "",


    subCategory:
      post.subCategory,


    providerType:
      post.providerType,


    contentType:
      post.contentType,


    status:
      post.lifecycle?.status ||
      "",


    headline:
      post.editorial?.headline ||
      "",


    influencerText:
      post.editorial?.influencerText ||
      "",


    personaStyle:
      post.editorial?.style ||
      "",


    personaAngle:
      post.editorial?.angle ||
      "",


    confidenceScore:
      post.discoveryMeta?.confidenceScore ||
      0,


    missingFields:
      post.discoveryMeta?.missingFields ||
      [],


    lifecycle:
      createLifecycleSummary(
        [
          post
        ]
      )

  };

      }
