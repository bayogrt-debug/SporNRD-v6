/* =========================================================
   SporNRD
   worker/core/sourceRegistry.js

   Merkezi Kaynak Kayıt Sistemi

   Sürüm: 6.1.0

   Amaç:
   - SporNRD'nin takip ettiği bütün kaynakları tek yerde tutmak
   - Kaynağın branşını bilmek
   - Kaynak / sağlayıcı türünü bilmek
   - Güven seviyesini bilmek
   - Hangi okuyucunun kullanılacağını bilmek
   - Kaynağın aktif / pasif durumunu yönetmek
   - Gelecekte yüzlerce kaynağa ölçeklenmek

   ÖNEMLİ:
   Bu dosya şu anda metadata merkezidir.
   Mevcut çalışan worker.js henüz buna bağlanmayacak.
   ========================================================= */


import {

  getSport,
  getProviderType

} from "./taxonomy.js";


/* =========================================================
   REGISTRY VERSION
   ========================================================= */

export const SOURCE_REGISTRY_VERSION =
  "1.0";


/* =========================================================
   KAYNAK KAYIT MERKEZİ
   ========================================================= */

export const SOURCE_REGISTRY = {


  /* =======================================================
     TÜRKİYE YÜZME FEDERASYONU
     ======================================================= */

  tyf: {

    /* -----------------------------------------------------
       Kimlik
       ----------------------------------------------------- */

    id:
      "tyf",

    name:
      "Türkiye Yüzme Federasyonu",

    shortName:
      "TYF",


    /* -----------------------------------------------------
       Kaynak sınıfı
       ----------------------------------------------------- */

    sourceType:
      "FEDERASYON",

    providerType:
      "federation",


    /* -----------------------------------------------------
       Spor
       ----------------------------------------------------- */

    sport:
      "swimming",


    /* -----------------------------------------------------
       Web
       ----------------------------------------------------- */

    website:
      "https://www.tyf.gov.tr",

    contentUrl:
      "https://www.tyf.gov.tr/haberler/",


    /* -----------------------------------------------------
       SporNRD endpoint
       ----------------------------------------------------- */

    endpoint:
      "/api/tyf",


    /* -----------------------------------------------------
       Okuyucu / adapter

       Daha sonra Worker bu değeri
       gerçek fonksiyonla eşleştirecek.
       ----------------------------------------------------- */

    adapter:
      "tyf",


    /* -----------------------------------------------------
       Durum
       ----------------------------------------------------- */

    enabled:
      true,

    verified:
      true,


    /* -----------------------------------------------------
       Güven
       ----------------------------------------------------- */

    trust: {

      level:
        "official",

      score:
        100,

      official:
        true

    },


    /* -----------------------------------------------------
       Kontrol sıklığı
       Dakika
       ----------------------------------------------------- */

    refreshMinutes:
      10,


    /* -----------------------------------------------------
       İçerik yetenekleri

       Bu kaynakta hangi tür içerikler
       bulunabileceğini anlatır.
       ----------------------------------------------------- */

    capabilities: {

      news:
        true,

      courses:
        true,

      events:
        true,

      campaigns:
        false,

      jobs:
        false,

      products:
        false

    },


    /* -----------------------------------------------------
       Medya
       ----------------------------------------------------- */

    mediaCapabilities: {

      images:
        true,

      multipleImages:
        false,

      video:
        false,

      audio:
        false,

      pdf:
        true

    },


    /* -----------------------------------------------------
       Kaynak notları
       ----------------------------------------------------- */

    notes: [

      "Resmî federasyon kaynağı",

      "Detay sayfaları okunabiliyor",

      "PDF duyuruları bulunabiliyor",

      "TYF akışı SporNRD editör ve öğrenme motoruna bağlı"

    ]

  },



  /* =======================================================
     TÜRKİYE BASKETBOL FEDERASYONU
     ======================================================= */

  tbf: {

    /* -----------------------------------------------------
       Kimlik
       ----------------------------------------------------- */

    id:
      "tbf",

    name:
      "Türkiye Basketbol Federasyonu",

    shortName:
      "TBF",


    /* -----------------------------------------------------
       Kaynak sınıfı
       ----------------------------------------------------- */

    sourceType:
      "FEDERASYON",

    providerType:
      "federation",


    /* -----------------------------------------------------
       Spor
       ----------------------------------------------------- */

    sport:
      "basketball",


    /* -----------------------------------------------------
       Web
       ----------------------------------------------------- */

    website:
      "https://www.tbf.org.tr",

    contentUrl:
      "https://www.tbf.org.tr/haberler",


    /* -----------------------------------------------------
       SporNRD endpoint
       ----------------------------------------------------- */

    endpoint:
      "/api/tbf",


    /* -----------------------------------------------------
       Okuyucu
       ----------------------------------------------------- */

    adapter:
      "tbf",


    /* -----------------------------------------------------
       Durum
       ----------------------------------------------------- */

    enabled:
      true,

    verified:
      true,


    /* -----------------------------------------------------
       Güven
       ----------------------------------------------------- */

    trust: {

      level:
        "official",

      score:
        100,

      official:
        true

    },


    /* -----------------------------------------------------
       Kontrol sıklığı
       ----------------------------------------------------- */

    refreshMinutes:
      10,


    /* -----------------------------------------------------
       İçerik yetenekleri
       ----------------------------------------------------- */

    capabilities: {

      news:
        true,

      courses:
        true,

      events:
        true,

      campaigns:
        false,

      jobs:
        false,

      products:
        false

    },


    /* -----------------------------------------------------
       Medya
       ----------------------------------------------------- */

    mediaCapabilities: {

      images:
        true,

      multipleImages:
        false,

      video:
        false,

      audio:
        false,

      pdf:
        false

    },


    /* -----------------------------------------------------
       Kaynak notları
       ----------------------------------------------------- */

    notes: [

      "Resmî federasyon kaynağı",

      "Liste sayfası güvenli şekilde okunuyor",

      "Detay sayfasına bağımlı olmadan içerik çıkarılıyor",

      "TBF kart ayrıştırma sistemi aktif"

    ]

  }

};


/* =========================================================
   TEK KAYNAK BUL
   ========================================================= */

export function getSource(
  id
) {

  const key =
    normalizeSourceId(
      id
    );


  const source =
    SOURCE_REGISTRY[
      key
    ];


  return source
    ? clone(
        source
      )
    : null;

}


/* =========================================================
   TÜM KAYNAKLAR
   ========================================================= */

export function getAllSources() {

  return Object
    .values(
      SOURCE_REGISTRY
    )
    .map(
      clone
    );

}


/* =========================================================
   AKTİF KAYNAKLAR
   ========================================================= */

export function getActiveSources() {

  return Object
    .values(
      SOURCE_REGISTRY
    )
    .filter(
      function (
        source
      ) {

        return Boolean(
          source?.enabled
        );

      }
    )
    .map(
      clone
    );

}


/* =========================================================
   PASİF KAYNAKLAR
   ========================================================= */

export function getDisabledSources() {

  return Object
    .values(
      SOURCE_REGISTRY
    )
    .filter(
      function (
        source
      ) {

        return (
          source?.enabled ===
          false
        );

      }
    )
    .map(
      clone
    );

}


/* =========================================================
   BRANŞA GÖRE KAYNAKLAR
   ========================================================= */

export function getSourcesBySport(
  sportId
) {

  const sport =
    normalizeSourceId(
      sportId
    );


  if (
    !getSport(
      sport
    )
  ) {

    return [];

  }


  return Object
    .values(
      SOURCE_REGISTRY
    )
    .filter(
      function (
        source
      ) {

        return (
          source?.enabled ===
          true
          &&
          source?.sport ===
          sport
        );

      }
    )
    .map(
      clone
    );

}


/* =========================================================
   PROVIDER TYPE'A GÖRE KAYNAKLAR
   ========================================================= */

export function getSourcesByProviderType(
  providerTypeId
) {

  const providerType =
    normalizeSourceId(
      providerTypeId
    );


  if (
    !getProviderType(
      providerType
    )
  ) {

    return [];

  }


  return Object
    .values(
      SOURCE_REGISTRY
    )
    .filter(
      function (
        source
      ) {

        return (
          source?.enabled ===
          true
          &&
          source?.providerType ===
          providerType
        );

      }
    )
    .map(
      clone
    );

}


/* =========================================================
   ENDPOINT → KAYNAK
   ========================================================= */

export function getSourceByEndpoint(
  endpoint
) {

  const path =
    normalizePath(
      endpoint
    );


  const source =
    Object
      .values(
        SOURCE_REGISTRY
      )
      .find(
        function (
          item
        ) {

          return (
            normalizePath(
              item.endpoint
            ) ===
            path
          );

        }
      );


  return source
    ? clone(
        source
      )
    : null;

}


/* =========================================================
   ADAPTER → KAYNAK
   ========================================================= */

export function getSourceByAdapter(
  adapter
) {

  const adapterId =
    normalizeSourceId(
      adapter
    );


  const source =
    Object
      .values(
        SOURCE_REGISTRY
      )
      .find(
        function (
          item
        ) {

          return (
            normalizeSourceId(
              item.adapter
            ) ===
            adapterId
          );

        }
      );


  return source
    ? clone(
        source
      )
    : null;

}


/* =========================================================
   KAYNAK AKTİF Mİ?
   ========================================================= */

export function isSourceEnabled(
  id
) {

  const source =
    getSource(
      id
    );


  return Boolean(
    source &&
    source.enabled ===
    true
  );

}


/* =========================================================
   KAYNAK DOĞRULANMIŞ MI?
   ========================================================= */

export function isSourceVerified(
  id
) {

  const source =
    getSource(
      id
    );


  return Boolean(
    source &&
    source.verified ===
    true
  );

}


/* =========================================================
   AKTİF KAYNAK ID'LERİ
   ========================================================= */

export function getActiveSourceIds() {

  return Object
    .values(
      SOURCE_REGISTRY
    )
    .filter(
      function (
        source
      ) {

        return (
          source?.enabled ===
          true
        );

      }
    )
    .map(
      function (
        source
      ) {

        return source.id;

      }
    );

}


/* =========================================================
   API İÇİN KISA SOURCE INFO

   Worker /api/sources çıktısında kullanılabilir.
   ========================================================= */

export function createPublicSourceInfo(
  source
) {

  if (
    !source ||
    typeof source !==
    "object"
  ) {

    return null;

  }


  const sport =
    getSport(
      source.sport
    );


  const providerType =
    getProviderType(
      source.providerType
    );


  return {

    id:
      source.id,

    name:
      source.name,

    shortName:
      source.shortName,

    sourceType:
      source.sourceType,

    providerType:
      source.providerType,

    providerTypeLabel:
      providerType?.label ||
      "",

    sport:
      source.sport,

    sportLabel:
      sport?.label ||
      "",

    sportEmoji:
      sport?.emoji ||
      "🏆",

    verified:
      Boolean(
        source.verified
      ),

    enabled:
      Boolean(
        source.enabled
      ),

    website:
      source.website,

    endpoint:
      source.endpoint

  };

}


/* =========================================================
   TÜM PUBLIC SOURCE INFO
   ========================================================= */

export function getPublicSources() {

  return getActiveSources()

    .map(
      createPublicSourceInfo
    )

    .filter(
      Boolean
    );

}


/* =========================================================
   REGISTRY KONTROLÜ

   Deploy öncesinde veya health endpointinde
   kaynak tanımlarındaki sorunları bulabiliriz.
   ========================================================= */

export function validateSourceRegistry() {

  const errors =
    [];


  const warnings =
    [];


  const ids =
    new Set();


  const endpoints =
    new Set();


  const adapters =
    new Set();


  for (
    const source
    of Object.values(
      SOURCE_REGISTRY
    )
  ) {

    if (
      !source ||
      typeof source !==
      "object"
    ) {

      errors.push(
        "Geçersiz kaynak kaydı bulundu."
      );

      continue;

    }


    /* -----------------------------------------------------
       ID
       ----------------------------------------------------- */

    if (
      !source.id
    ) {

      errors.push(
        "Kaynak id alanı eksik."
      );

    }

    else if (
      ids.has(
        source.id
      )
    ) {

      errors.push(
        `Tekrarlanan kaynak id: ${source.id}`
      );

    }

    else {

      ids.add(
        source.id
      );

    }


    /* -----------------------------------------------------
       NAME
       ----------------------------------------------------- */

    if (
      !source.name
    ) {

      errors.push(
        `${source.id || "unknown"} kaynak adı eksik.`
      );

    }


    /* -----------------------------------------------------
       SPORT
       ----------------------------------------------------- */

    if (
      !getSport(
        source.sport
      )
    ) {

      errors.push(
        `${source.id || "unknown"} geçersiz sport: ${source.sport}`
      );

    }


    /* -----------------------------------------------------
       PROVIDER TYPE
       ----------------------------------------------------- */

    if (
      !getProviderType(
        source.providerType
      )
    ) {

      errors.push(
        `${source.id || "unknown"} geçersiz providerType: ${source.providerType}`
      );

    }


    /* -----------------------------------------------------
       ENDPOINT
       ----------------------------------------------------- */

    const endpoint =
      normalizePath(
        source.endpoint
      );


    if (
      !endpoint ||
      endpoint ===
      "/"
    ) {

      warnings.push(
        `${source.id || "unknown"} geçerli endpoint tanımlamadı.`
      );

    }

    else if (
      endpoints.has(
        endpoint
      )
    ) {

      errors.push(
        `Tekrarlanan endpoint: ${endpoint}`
      );

    }

    else {

      endpoints.add(
        endpoint
      );

    }


    /* -----------------------------------------------------
       ADAPTER
       ----------------------------------------------------- */

    const adapter =
      normalizeSourceId(
        source.adapter
      );


    if (
      !adapter
    ) {

      errors.push(
        `${source.id || "unknown"} adapter alanı eksik.`
      );

    }

    else if (
      adapters.has(
        adapter
      )
    ) {

      errors.push(
        `Tekrarlanan adapter: ${adapter}`
      );

    }

    else {

      adapters.add(
        adapter
      );

    }


    /* -----------------------------------------------------
       WEBSITE
       ----------------------------------------------------- */

    if (
      !isHttpUrl(
        source.website
      )
    ) {

      warnings.push(
        `${source.id || "unknown"} website adresi geçersiz.`
      );

    }


    /* -----------------------------------------------------
       TRUST
       ----------------------------------------------------- */

    const trustScore =
      Number(
        source.trust?.score
      );


    if (
      !Number.isFinite(
        trustScore
      ) ||
      trustScore < 0 ||
      trustScore > 100
    ) {

      warnings.push(
        `${source.id || "unknown"} trust score 0-100 arasında olmalı.`
      );

    }

  }


  return {

    valid:
      errors.length ===
      0,

    sourceCount:
      Object.keys(
        SOURCE_REGISTRY
      ).length,

    activeSourceCount:
      getActiveSources()
        .length,

    errors:
      errors,

    warnings:
      warnings

  };

}


/* =========================================================
   ID NORMALİZE
   ========================================================= */

function normalizeSourceId(
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
   PATH NORMALİZE
   ========================================================= */

function normalizePath(
  value
) {

  let path =
    String(
      value ||
      ""
    )
      .trim();


  if (
    !path
  ) {

    return "";

  }


  if (
    !path.startsWith(
      "/"
    )
  ) {

    path =
      "/" +
      path;

  }


  if (
    path.length >
    1
  ) {

    path =
      path.replace(
        /\/+$/,
        ""
      );

  }


  return path;

}


/* =========================================================
   URL KONTROLÜ
   ========================================================= */

function isHttpUrl(
  value
) {

  try {

    const url =
      new URL(
        String(
          value ||
          ""
        )
      );


    return (
      url.protocol ===
      "https:"
      ||
      url.protocol ===
      "http:"
    );

  }

  catch {

    return false;

  }

}


/* =========================================================
   DERİN KOPYA
   ========================================================= */

function clone(
  value
) {

  return JSON.parse(
    JSON.stringify(
      value
    )
  );

    }
