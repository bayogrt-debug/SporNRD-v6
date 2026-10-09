/* =========================================================
   SporNRD
   worker/learning/learningStore.js

   Global öğrenme durumunu okuma / yazma
   Cloudflare KV + güvenli local fallback
   ========================================================= */


import {
  DEFAULT_LEARNING_STATE
} from "../intelligence/defaultWeights.js";


/* =========================================================
   AYARLAR
   ========================================================= */

const KEY =
  "global-learning-v1";


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


/* =========================================================
   VARSAYILAN DURUM
   ========================================================= */

function createDefaultState() {

  return clone(
    DEFAULT_LEARNING_STATE
  );

}


/* =========================================================
   KAYITLI DURUMU VARSAYILANLA BİRLEŞTİR
   ========================================================= */

function mergeLearningState(
  stored
) {

  const defaults =
    createDefaultState();


  if (
    !stored ||
    typeof stored !==
    "object" ||
    Array.isArray(
      stored
    )
  ) {

    return defaults;

  }


  return {

    ...defaults,

    ...stored,


    categoryBoosts: {

      ...(
        defaults.categoryBoosts ||
        {}
      ),

      ...(
        isPlainObject(
          stored.categoryBoosts
        )
          ? stored.categoryBoosts
          : {}
      )

    },


    sourceBoosts: {

      ...(
        defaults.sourceBoosts ||
        {}
      ),

      ...(
        isPlainObject(
          stored.sourceBoosts
        )
          ? stored.sourceBoosts
          : {}
      )

    },


    actionCounts: {

      ...(
        defaults.actionCounts ||
        {}
      ),

      ...(
        isPlainObject(
          stored.actionCounts
        )
          ? stored.actionCounts
          : {}
      )

    }

  };

}


/* =========================================================
   ÖĞRENME DURUMUNU OKU
   ========================================================= */

export async function readLearningState(
  env
) {

  /* -------------------------------------------------------
     KV yoksa varsayılan öğrenme durumu
     ------------------------------------------------------- */

  if (
    !env?.SPORNRD_LEARNING ||
    typeof env.SPORNRD_LEARNING.get !==
    "function"
  ) {

    return createDefaultState();

  }


  try {

    const stored =
      await env.SPORNRD_LEARNING.get(
        KEY,
        "json"
      );


    return mergeLearningState(
      stored
    );

  }

  catch (
    error
  ) {

    console.warn(
      "SporNRD learning state okunamadı:",
      getErrorMessage(
        error
      )
    );


    return createDefaultState();

  }

}


/* =========================================================
   ÖĞRENME DURUMUNU YAZ
   ========================================================= */

export async function writeLearningState(
  env,
  state
) {

  /* -------------------------------------------------------
     KV bağlı değilse local fallback
     ------------------------------------------------------- */

  if (
    !env?.SPORNRD_LEARNING ||
    typeof env.SPORNRD_LEARNING.put !==
    "function"
  ) {

    return false;

  }


  if (
    !state ||
    typeof state !==
    "object" ||
    Array.isArray(
      state
    )
  ) {

    return false;

  }


  try {

    const normalizedState =
      mergeLearningState(
        state
      );


    normalizedState.updatedAt =
      state.updatedAt ||
      new Date()
        .toISOString();


    await env.SPORNRD_LEARNING.put(
      KEY,
      JSON.stringify(
        normalizedState
      )
    );


    return true;

  }

  catch (
    error
  ) {

    console.warn(
      "SporNRD learning state kaydedilemedi:",
      getErrorMessage(
        error
      )
    );


    return false;

  }

}


/* =========================================================
   DÜZ NESNE KONTROLÜ
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
   HATA METNİ
   ========================================================= */

function getErrorMessage(
  error
) {

  if (
    error &&
    typeof error.message ===
    "string"
  ) {

    return error.message;

  }


  return String(
    error ||
    "Bilinmeyen hata"
  );

        }
