/* =========================================================
   SporNRD
   worker/utils/response.js

   HTTP / JSON / CORS yardımcıları
   SporNRD v6.0.4
   ========================================================= */


/* =========================================================
   CORS
   ========================================================= */

export const CORS = {

  "Access-Control-Allow-Origin":
    "*",

  "Access-Control-Allow-Methods":
    "GET, POST, OPTIONS",

  "Access-Control-Allow-Headers":
    "Content-Type, Accept",

  "Access-Control-Max-Age":
    "86400"

};


/* =========================================================
   JSON RESPONSE
   ========================================================= */

export function json(
  data,
  status = 200,
  cacheSeconds = 0
) {

  /* -------------------------------------------------------
     HTTP status güvenliği
     ------------------------------------------------------- */

  let safeStatus =
    Number(
      status
    );


  if (
    !Number.isInteger(
      safeStatus
    ) ||
    safeStatus < 100 ||
    safeStatus > 599
  ) {

    safeStatus =
      200;

  }


  /* -------------------------------------------------------
     Cache süresi güvenliği
     ------------------------------------------------------- */

  let safeCacheSeconds =
    Number(
      cacheSeconds
    );


  if (
    !Number.isFinite(
      safeCacheSeconds
    ) ||
    safeCacheSeconds < 0
  ) {

    safeCacheSeconds =
      0;

  }


  safeCacheSeconds =
    Math.floor(
      safeCacheSeconds
    );


  /* -------------------------------------------------------
     Headers
     ------------------------------------------------------- */

  const headers = {

    ...CORS,

    "Content-Type":
      "application/json; charset=utf-8",

    "X-Content-Type-Options":
      "nosniff"

  };


  /* -------------------------------------------------------
     Cache
     ------------------------------------------------------- */

  if (
    safeCacheSeconds > 0
  ) {

    headers[
      "Cache-Control"
    ] =
      `public, max-age=${safeCacheSeconds}`;

  }

  else {

    headers[
      "Cache-Control"
    ] =
      "no-store";

  }


  /* -------------------------------------------------------
     JSON oluştur
     ------------------------------------------------------- */

  let body;


  try {

    body =
      JSON.stringify(
        data,
        null,
        2
      );

  }

  catch (
    error
  ) {

    safeStatus =
      500;


    headers[
      "Cache-Control"
    ] =
      "no-store";


    body =
      JSON.stringify(
        {

          ok:
            false,

          error:
            "JSON yanıtı oluşturulamadı.",

          detail:
            error &&
            typeof error.message ===
            "string"

              ? error.message

              : "Bilinmeyen JSON hatası"

        },
        null,
        2
      );

  }


  return new Response(
    body,
    {

      status:
        safeStatus,

      headers:
        headers

    }
  );

}
