import { getTyfFeed } from "./tyf.js";

import {
  recordFeedback
} from "./feedbackEngine.js";

import {
  readLearningState
} from "./learningStore.js";

import {
  CORS,
  json
} from "./response.js";


export default {

  async fetch(request, env) {

    if (
      request.method ===
      "OPTIONS"
    ) {

      return new Response(
        null,
        {
          status: 204,
          headers: CORS
        }
      );

    }


    const url =
      new URL(
        request.url
      );


    /* =====================================================
       ANA TEST
       ===================================================== */

    if (
      url.pathname === "/"
    ) {

      return json({

        ok:
          true,

        service:
          "SporNRD Öğrenen Spor Editörü",

        status:
          "running",

        version:
          "6.0.0",

        source:
          "Türkiye Yüzme Federasyonu",

        architecture:
          "modular-flat",

        learning:
          env?.SPORNRD_LEARNING
            ? "global-kv"
            : "local-fallback"

      });

    }


    /* =====================================================
       TYF AKIŞI
       ===================================================== */

    if (
      url.pathname === "/api/tyf" &&
      request.method === "GET"
    ) {

      try {

        let limit =
          parseInt(
            url.searchParams.get(
              "limit"
            ) || "20",
            10
          );


        if (
          !Number.isFinite(
            limit
          )
        ) {

          limit =
            20;

        }


        limit =
          Math.max(
            1,
            Math.min(
              limit,
              30
            )
          );


        const feed =
          await getTyfFeed({
            limit,
            env
          });


        return json(
          {

            ok:
              true,

            source:
              feed.source,

            fetchedAt:
              new Date()
                .toISOString(),

            count:
              feed.items.length,

            items:
              feed.items

          },
          200,
          180
        );

      }

      catch (error) {

        return json(
          {

            ok:
              false,

            error:
              "TYF verileri alınamadı",

            detail:
              String(
                error?.message ||
                error
              )

          },
          502
        );

      }

    }


    /* =====================================================
       GERİ BİLDİRİM
       ===================================================== */

    if (
      url.pathname === "/api/feedback" &&
      request.method === "POST"
    ) {

      try {

        const payload =
          await request.json();


        const result =
          await recordFeedback(
            env,
            payload
          );


        return json({

          ok:
            true,

          persisted:
            result.persisted,

          mode:
            result.persisted
              ? "global-kv"
              : "local-fallback"

        });

      }

      catch (error) {

        return json(
          {

            ok:
              false,

            error:
              "Feedback işlenemedi",

            detail:
              String(
                error?.message ||
                error
              )

          },
          400
        );

      }

    }


    /* =====================================================
       ÖĞRENME DURUMU
       ===================================================== */

    if (
      url.pathname === "/api/learning" &&
      request.method === "GET"
    ) {

      try {

        const learning =
          await readLearningState(
            env
          );


        return json({

          ok:
            true,

          mode:
            env?.SPORNRD_LEARNING
              ? "global-kv"
              : "local-fallback",

          learning:
            learning

        });

      }

      catch (error) {

        return json(
          {

            ok:
              false,

            error:
              "Öğrenme durumu okunamadı",

            detail:
              String(
                error?.message ||
                error
              )

          },
          500
        );

      }

    }


    /* =====================================================
       ENDPOINT YOK
       ===================================================== */

    return json(
      {

        ok:
          false,

        error:
          "Endpoint bulunamadı",

        availableEndpoints: [
          "/",
          "/api/tyf?limit=20",
          "/api/feedback",
          "/api/learning"
        ]

      },
      404
    );

  }

};
