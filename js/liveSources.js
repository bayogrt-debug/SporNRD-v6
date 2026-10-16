/* =========================================================
   SporNRD
   js/liveSources.js

   Canlı kaynak bağlantı katmanı
   SporNRD v6.0.4

   ANA WORKER
   ---------------------------------------------------------
   https://spornrd-v6.bayogrt.workers.dev

   ENDPOINTLER
   ---------------------------------------------------------
   /api/feed
   /api/tyf
   /api/tbf
   /api/sources
   /api/feedback
   /api/learning
   /api/health
   ========================================================= */


(function () {

  "use strict";


  /* =======================================================
     SABİTLER
     ======================================================= */

  const DEFAULT_LIMIT =
    20;


  const MAX_LIMIT =
    30;


  const CACHE_KEYS = {

    feed:
      "spornrd_last_feed_data",

    feedTime:
      "spornrd_last_feed_time",

    tyf:
      "spornrd_last_tyf_data",

    tyfTime:
      "spornrd_last_tyf_time",

    tbf:
      "spornrd_last_tbf_data",

    tbfTime:
      "spornrd_last_tbf_time"

  };


  /* =======================================================
     CONFIG
     ======================================================= */

  function getConfig() {

    const config =
      window.SPORNRD_CONFIG;


    if (
      !config ||
      !config.api
    ) {

      throw new Error(
        "SporNRD API ayarları bulunamadı."
      );

    }


    if (
      !config.api.baseUrl
    ) {

      throw new Error(
        "Cloudflare Worker adresi config.js içinde tanımlı değil."
      );

    }


    return config;

  }


  /* =======================================================
     BASE URL
     ======================================================= */

  function getBaseUrl() {

    const config =
      getConfig();


    const baseUrl =
      String(
        config.api.baseUrl ||
        ""
      )
        .trim()
        .replace(
          /\/+$/,
          ""
        );


    if (
      !baseUrl ||
      baseUrl.includes(
        "BURAYA_"
      )
    ) {

      throw new Error(
        "Geçerli Worker adresi bulunamadı."
      );

    }


    return baseUrl;

  }


  /* =======================================================
     LIMIT
     ======================================================= */

  function normalizeLimit(
    value
  ) {

    const config =
      getConfig();


    let limit =
      Number(
        value
      );


    if (
      !Number.isFinite(
        limit
      ) ||
      limit <= 0
    ) {

      limit =
        Number(
          config.api.defaultLimit
        ) ||
        DEFAULT_LIMIT;

    }


    return Math.max(

      1,

      Math.min(
        Math.floor(
          limit
        ),
        MAX_LIMIT
      )

    );

  }


  /* =======================================================
     TIMEOUT
     ======================================================= */

  function createTimeout(
    milliseconds
  ) {

    const controller =
      new AbortController();


    const timer =
      setTimeout(

        function () {

          controller.abort();

        },

        milliseconds

      );


    return {

      controller:
        controller,

      timer:
        timer

    };

  }


  /* =======================================================
     PATH + QUERY
     ======================================================= */

  function buildPath(
    path,
    params = {}
  ) {

    const query =
      new URLSearchParams();


    Object
      .entries(
        params
      )
      .forEach(

        function (
          entry
        ) {

          const key =
            entry[0];


          const value =
            entry[1];


          if (
            value === undefined ||
            value === null ||
            value === ""
          ) {

            return;

          }


          query.set(
            key,
            String(
              value
            )
          );

        }

      );


    const queryString =
      query.toString();


    if (
      !queryString
    ) {

      return path;

    }


    return (
      path +
      (
        path.includes(
          "?"
        )
          ? "&"
          : "?"
      ) +
      queryString
    );

  }


  /* =======================================================
     GENEL API İSTEĞİ
     ======================================================= */

  async function request(
    path,
    options = {}
  ) {

    const config =
      getConfig();


    const baseUrl =
      getBaseUrl();


    const timeout =
      Number(
        config.api.timeout
      ) ||
      15000;


    const timeoutState =
      createTimeout(
        timeout
      );


    try {

      const response =
        await fetch(

          baseUrl +
          path,

          {

            method:
              options.method ||
              "GET",

            body:
              options.body,

            signal:
              timeoutState.controller.signal,

            cache:
              "no-store",

            headers: {

              "Accept":
                "application/json",

              ...(
                options.body
                  ? {
                      "Content-Type":
                        "application/json"
                    }
                  : {}
              ),

              ...(
                options.headers ||
                {}
              )

            }

          }

        );


      const text =
        await response.text();


      let data;


      try {

        data =
          JSON.parse(
            text
          );

      }

      catch {

        throw new Error(
          "API geçerli JSON döndürmedi."
        );

      }


      if (
        !response.ok
      ) {

        throw new Error(
          data?.error ||
          `API HTTP ${response.status}`
        );

      }


      if (
        data &&
        data.ok === false
      ) {

        throw new Error(
          data.error ||
          "API isteği başarısız oldu."
        );

      }


      return data;

    }

    catch (
      error
    ) {

      if (
        error &&
        error.name ===
        "AbortError"
      ) {

        throw new Error(
          "SporNRD kaynağı zaman aşımına uğradı."
        );

      }


      throw error;

    }

    finally {

      clearTimeout(
        timeoutState.timer
      );

    }

  }


  /* =======================================================
     LOCAL CACHE YAZ
     ======================================================= */

  function saveCache(
    dataKey,
    timeKey,
    data
  ) {

    try {

      localStorage.setItem(
        dataKey,
        JSON.stringify(
          data
        )
      );


      localStorage.setItem(
        timeKey,
        new Date()
          .toISOString()
      );

    }

    catch {

      /*
        localStorage kapalı olsa bile
        canlı sistem çalışmaya devam eder.
      */

    }

  }


  /* =======================================================
     LOCAL CACHE OKU
     ======================================================= */

  function readCache(
    dataKey
  ) {

    try {

      const saved =
        localStorage.getItem(
          dataKey
        );


      if (
        !saved
      ) {

        return null;

      }


      const data =
        JSON.parse(
          saved
        );


      if (
        !data ||
        !Array.isArray(
          data.items
        )
      ) {

        return null;

      }


      return data;

    }

    catch {

      return null;

    }

  }


  /* =======================================================
     ANA SPORNRD AKIŞI
     TYF + TBF
     ======================================================= */

  async function getFeed(
    limit = DEFAULT_LIMIT,
    sources = []
  ) {

    const config =
      getConfig();


    const finalLimit =
      normalizeLimit(
        limit
      );


    const endpoint =
      config.api.feedEndpoint ||
      "/api/feed";


    let sourceParameter =
      "";


    if (
      Array.isArray(
        sources
      ) &&
      sources.length
    ) {

      sourceParameter =
        sources

          .map(
            function (
              value
            ) {

              return String(
                value ||
                ""
              )
                .trim()
                .toLowerCase();

            }
          )

          .filter(
            Boolean
          )

          .join(
            ","
          );

    }


    const path =
      buildPath(
        endpoint,
        {

          limit:
            finalLimit,

          sources:
            sourceParameter

        }
      );


    const data =
      await request(
        path
      );


    if (
      !data ||
      data.ok !== true
    ) {

      throw new Error(
        "SporNRD ana akışı başarılı yanıt vermedi."
      );

    }


    if (
      !Array.isArray(
        data.items
      )
    ) {

      throw new Error(
        "SporNRD haber listesi geçersiz."
      );

    }


    saveCache(

      CACHE_KEYS.feed,

      CACHE_KEYS.feedTime,

      data

    );


    return data;

  }


  /* =======================================================
     ANA AKIŞ ALIAS
     ======================================================= */

  async function getMainFeed(
    limit
  ) {

    return getFeed(
      limit
    );

  }


  /* =======================================================
     TÜM HABERLER ALIAS
     ======================================================= */

  async function getAllNews(
    limit
  ) {

    return getFeed(
      limit
    );

  }


  /* =======================================================
     TYF HABERLERİ
     ======================================================= */

  async function getTYFNews(
    limit
  ) {

    const config =
      getConfig();


    const finalLimit =
      normalizeLimit(
        limit
      );


    const endpoint =
      config.api.tyfEndpoint ||
      "/api/tyf";


    const data =
      await request(

        buildPath(
          endpoint,
          {
            limit:
              finalLimit
          }
        )

      );


    validateSingleSourceResponse(
      data,
      "TYF"
    );


    saveCache(

      CACHE_KEYS.tyf,

      CACHE_KEYS.tyfTime,

      data

    );


    return data;

  }


  /* =======================================================
     TBF HABERLERİ
     ======================================================= */

  async function getTBFNews(
    limit
  ) {

    const config =
      getConfig();


    const finalLimit =
      normalizeLimit(
        limit
      );


    const endpoint =
      config.api.tbfEndpoint ||
      "/api/tbf";


    const data =
      await request(

        buildPath(
          endpoint,
          {
            limit:
              finalLimit
          }
        )

      );


    validateSingleSourceResponse(
      data,
      "TBF"
    );


    saveCache(

      CACHE_KEYS.tbf,

      CACHE_KEYS.tbfTime,

      data

    );


    return data;

  }


  /* =======================================================
     TEK KAYNAK CEVABI KONTROL
     ======================================================= */

  function validateSingleSourceResponse(
    data,
    sourceName
  ) {

    if (
      !data ||
      data.ok !== true
    ) {

      throw new Error(
        `${sourceName} API başarılı yanıt vermedi.`
      );

    }


    if (
      !Array.isArray(
        data.items
      )
    ) {

      throw new Error(
        `${sourceName} haber listesi geçersiz.`
      );

    }

  }


  /* =======================================================
     KAYNAK LİSTESİ
     ======================================================= */

  async function getSources() {

    const config =
      getConfig();


    const endpoint =
      config.api.sourcesEndpoint ||
      "/api/sources";


    const data =
      await request(
        endpoint
      );


    if (
      !data ||
      data.ok !== true ||
      !Array.isArray(
        data.sources
      )
    ) {

      throw new Error(
        "SporNRD kaynak listesi alınamadı."
      );

    }


    return data;

  }


  /* =======================================================
     CACHE - ANA AKIŞ
     ======================================================= */

  function getCachedFeed() {

    return readCache(
      CACHE_KEYS.feed
    );

  }


  /* =======================================================
     CACHE - TYF
     ======================================================= */

  function getCachedTYFNews() {

    return readCache(
      CACHE_KEYS.tyf
    );

  }


  /* =======================================================
     CACHE - TBF
     ======================================================= */

  function getCachedTBFNews() {

    return readCache(
      CACHE_KEYS.tbf
    );

  }


  /* =======================================================
     FEEDBACK
     ======================================================= */

  async function sendFeedback(
    payload
  ) {

    const config =
      getConfig();


    const endpoint =
      config.api.feedbackEndpoint ||
      "/api/feedback";


    try {

      return await request(

        endpoint,

        {

          method:
            "POST",

          body:
            JSON.stringify(
              payload ||
              {}
            )

        }

      );

    }

    catch (
      error
    ) {

      console.warn(
        "SporNRD feedback yerel olarak tutulacak:",
        error.message
      );


      return {

        ok:
          false,

        persisted:
          false,

        localOnly:
          true

      };

    }

  }


  /* =======================================================
     ÖĞRENME DURUMU
     ======================================================= */

  async function getLearningState() {

    const config =
      getConfig();


    const endpoint =
      config.api.learningEndpoint ||
      "/api/learning";


    try {

      return await request(
        endpoint
      );

    }

    catch (
      error
    ) {

      console.warn(
        "SporNRD global learning okunamadı:",
        error.message
      );


      return null;

    }

  }


  /* =======================================================
     HEALTH
     ======================================================= */

  async function healthCheck() {

    const config =
      getConfig();


    const endpoint =
      config.api.healthEndpoint ||
      "/api/health";


    try {

      const data =
        await request(
          endpoint
        );


      return {

        ok:
          data?.ok === true,

        data:
          data

      };

    }

    catch (
      error
    ) {

      return {

        ok:
          false,

        error:
          error.message

      };

    }

  }


  /* =======================================================
     ROOT SERVICE TEST
     ======================================================= */

  async function serviceInfo() {

    return request(
      "/"
    );

  }


  /* =======================================================
     DIŞARI AÇ
     ======================================================= */

  window.SPORNRD_LIVE_SOURCES = {

    /* Ana çok kaynaklı akış */

    getFeed:
      getFeed,

    getMainFeed:
      getMainFeed,

    getAllNews:
      getAllNews,


    /* Federasyonlar */

    getTYFNews:
      getTYFNews,

    getTBFNews:
      getTBFNews,


    /* Kaynaklar */

    getSources:
      getSources,


    /* Cache */

    getCachedFeed:
      getCachedFeed,

    getCachedTYFNews:
      getCachedTYFNews,

    getCachedTBFNews:
      getCachedTBFNews,


    /* Öğrenme */

    sendFeedback:
      sendFeedback,

    getLearningState:
      getLearningState,


    /* Sistem */

    healthCheck:
      healthCheck,

    serviceInfo:
      serviceInfo

  };


  console.log(
    "SporNRD Live Sources v6.0.4 hazır: TYF + TBF + Unified Feed."
  );

})();