/* =========================================================
   SporNRD
   worker/learning/learningStore.js

   Global öğrenme durumunu okuma / yazma
   Cloudflare KV + güvenli fallback

   SporNRD v6.0.4
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

   Böylece ileride DEFAULT_LEARNING_STATE içine
   yeni alanlar eklenirse eski KV kaydı sistemi bozmaz.
   ========================================================= */

function mergeLearningState(
  stored
) {

  const defaults =
    createDefaultState();


  if (
    !isPlainObject(
      stored
    )
  ) {

    return defaults;

  }


  return {

    /* -----------------------------------------------------
       Genel alanlar
       ----------------------------------------------------- */

    ...defaults,

    ...stored,


    /* -----------------------------------------------------
       Kategori öğrenmesi
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       Federasyon / kaynak öğrenmesi
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       Başlık stili öğrenmesi
       ----------------------------------------------------- */

    headlineStyleBoosts: {

      ...(
        defaults.headlineStyleBoosts ||
        {}
      ),

      ...(
        isPlainObject(
          stored.headlineStyleBoosts
        )
          ? stored.headlineStyleBoosts
          : {}
      )

    },


    /* -----------------------------------------------------
       Kullanıcı aksiyon sayaçları
       ----------------------------------------------------- */

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
     Cloudflare KV bağlı değilse
     varsayılan öğrenme durumunu kullan.
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
     KV bağlı değilse kayıt yapılamaz.
     Uygulama yine çalışmaya devam eder.
     ------------------------------------------------------- */

  if (
    !env?.SPORNRD_LEARNING ||
    typeof env.SPORNRD_LEARNING.put !==
    "function"
  ) {

    return false;

  }


  /* -------------------------------------------------------
     State kontrolü
     ------------------------------------------------------- */

  if (
    !isPlainObject(
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
