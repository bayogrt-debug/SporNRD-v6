/* =========================================================
   SporNRD
   worker/intelligence/editorialEngine.js

   Akıllı başlık + özet üretim motoru
   SporNRD v6.0.4
   ========================================================= */


import {
  cleanHtml,
  normalize,
  splitSentences
} from "../utils/html.js";


import {
  scoreHeadline,
  scoreSummary
} from "./qualityEngine.js";


/* =========================================================
   ANA EDİTÖR
   ========================================================= */

export function buildEditorial({
  originalTitle = "",
  originalText = "",
  category = "announcement",
  facts = {},
  pdfUrl = ""
} = {}) {

  /* =======================================================
     BAŞLIK ADAYLARI
     ======================================================= */

  const titleCandidates =
    buildTitleCandidates(
      originalTitle,
      category,
      facts
    );


  const scoredTitles =
    titleCandidates

      .map(
        candidate => ({

          title:
            candidate.title,

          style:
            candidate.style,

          score:
            safeScore(
              scoreHeadline(
                candidate.title,
                facts
              )
            )

        })
      )

      .sort(
        (a, b) =>
          b.score -
          a.score
      );


  const selectedTitle =
    scoredTitles[0] ||
    {

      title:
        cleanDisplayTitle(
          originalTitle
        ),

      style:
        "source",

      score:
        0

    };


  /* =======================================================
     ÖZET ADAYLARI
     ======================================================= */

  const summaryCandidates =
    buildSummaryCandidates({

      originalTitle:
        originalTitle,

      originalText:
        originalText,

      category:
        category,

      facts:
        facts,

      pdfUrl:
        pdfUrl

    });


  const scoredSummaries =
    summaryCandidates

      .map(
        candidate => ({

          summary:
            candidate.summary,

          style:
            candidate.style,

          score:
            safeScore(
              scoreSummary(
                candidate.summary,
                facts
              )
            )

        })
      )

      .sort(
        (a, b) =>
          b.score -
          a.score
      );


  const selectedSummary =
    scoredSummaries[0] ||
    {

      summary:
        fallbackSummary(
          category,
          pdfUrl
        ),

      style:
        "fallback",

      score:
        0

    };


  /* =======================================================
     GENEL KALİTE
     ======================================================= */

  const qualityScore =
    Math.round(

      (
        selectedTitle.score +
        selectedSummary.score
      )
      /
      2

    );


  /* =======================================================
     SONUÇ
     ======================================================= */

  return {

    title:
      selectedTitle.title,

    summary:
      selectedSummary.summary,


    /* Öğrenme sistemi için */

    headlineStyle:
      selectedTitle.style,

    summaryStyle:
      selectedSummary.style,


    titleCandidates:
      scoredTitles.slice(
        0,
        4
      ),


    summaryCandidates:
      scoredSummaries.slice(
        0,
        3
      ),


    actionLabel:
      actionLabelFor(
        category,
        facts
      ),


    tags:
      buildTags(
        category,
        facts
      ),


    qualityScore:
      qualityScore

  };

}


/* =========================================================
   BAŞLIK ADAYLARI
   ========================================================= */

function buildTitleCandidates(
  originalTitle,
  category,
  facts
) {

  const normalizedTitle =
    normalize(
      originalTitle
    );


  const candidates =
    [];


  /* =======================================================
     SEM SONUÇLARI
     ======================================================= */

  if (
    facts.isSemResult ||
    (
      normalizedTitle.includes(
        "SEM"
      ) &&
      normalizedTitle.includes(
        "KAYIT HAKKI KAZANAN"
      )
    )
  ) {

    candidates.push(

      {
        title:
          "SEM’de kayıt hakkı kazanan yüzücüler açıklandı 🏊",

        style:
          "direct"
      },

      {
        title:
          "SEM yüzme sonuçları belli oldu: Kayıt hakkı kazanan sporcular açıklandı",

        style:
          "informative"
      },

      {
        title:
          "SEM yüzme listesi yayımlandı: Kayıt hakkı kazanan sporcular belli oldu",

        style:
          "action"
      }

    );

  }


  /* =======================================================
     BEBEK YÜZME SEMİNERİ
     ======================================================= */

  if (
    facts.isBabySwimming ||
    (
      normalizedTitle.includes(
        "BEBEK"
      ) &&
      normalizedTitle.includes(
        "SEMINER"
      )
    )
  ) {

    const when =
      facts.eventDate
        ? `: ${facts.eventDate}`
        : "";


    const where =
      validLocation(
        facts.location
      )
        ? `${facts.location}’da`
        : "";


    candidates.push(

      {
        title:
          `Bebek yüzme gelişim semineri ${where}${when} 🏊‍♀️`
            .replace(
              /\s+/g,
              " "
            )
            .trim(),

        style:
          "fact-rich"
      },

      {
        title:
          `Bebek yüzme eğitimi için yeni seminer duyuruldu${
            validLocation(
              facts.location
            )
              ? `: ${facts.location}`
              : ""
          }`,

        style:
          "location"
      },

      {
        title:
          `TYF’den bebek yüzme gelişim semineri duyurusu${when}`,

        style:
          "informative"
      }

    );

  }


  /* =======================================================
     ANTRENÖR KURSU
     ======================================================= */

  if (
    facts.isCoachCourse ||
    (
      normalizedTitle.includes(
        "ANTRENOR"
      ) &&
      normalizedTitle.includes(
        "KURS"
      )
    )
  ) {

    const grade =
      facts.grade
        ? `${facts.grade}. Kademe `
        : "";


    const place =
      validLocation(
        facts.location
      )
        ? ` ${facts.location}’da`
        : "";


    const when =
      facts.eventDate
        ? `: ${facts.eventDate}`
        : "";


    candidates.push(

      {
        title:
          `${grade}yüzme antrenörlüğü kursu${place}${when}`,

        style:
          "fact-rich"
      },

      {
        title:
          `${grade}antrenörlük kursu için yeni dönem duyuruldu${place}`,

        style:
          "location"
      },

      {
        title:
          `Yüzme antrenörleri için ${grade.toLocaleLowerCase(
            "tr-TR"
          )}kurs duyurusu yayımlandı`,

        style:
          "direct"
      }

    );

  }


  /* =======================================================
     ANTRENÖR VİZE
     ======================================================= */

  if (
    facts.isCoachVisa ||
    normalizedTitle.includes(
      "ANTRENOR VIZE"
    )
  ) {

    candidates.push(

      {
        title:
          "Yüzme antrenörleri için vize işlemleri duyuruldu",

        style:
          "direct"
      },

      {
        title:
          "Antrenör vize süreci için yeni TYF duyurusu",

        style:
          "informative"
      },

      {
        title:
          "Yüzme antrenörlerinin vize işlemlerinde yeni bilgilendirme",

        style:
          "action"
      }

    );

  }


  /* =======================================================
     TOHM
     ======================================================= */

  if (
    facts.isTohm ||
    (
      normalizedTitle.includes(
        "TOHM"
      ) &&
      normalizedTitle.includes(
        "BASVURU"
      )
    )
  ) {

    candidates.push(

      {
        title:
          "TOHM sporcu başvurularında yeni dönem",

        style:
          "direct"
      },

      {
        title:
          "TOHM başvuruları için yeni bilgilendirme yayımlandı",

        style:
          "informative"
      },

      {
        title:
          "TOHM’a başvuracak sporcular için önemli duyuru",

        style:
          "action"
      }

    );

  }


  /* =======================================================
     YARIŞMA
     ======================================================= */

  if (
    category ===
    "event"
  ) {

    const cleaned =
      cleanDisplayTitle(
        stripBilingualTail(
          originalTitle
        )
      );


    candidates.push(

      {
        title:
          `${cleaned} 🏆`,

        style:
          "source"
      },

      {
        title:
          `Yüzmede yeni yarışma duyurusu: ${cleaned}`,

        style:
          "direct"
      }

    );

  }


  /* =======================================================
     EĞİTİM
     ======================================================= */

  if (
    category ===
    "education"
  ) {

    const cleaned =
      cleanDisplayTitle(
        stripBilingualTail(
          originalTitle
        )
      );


    candidates.push(

      {
        title:
          cleaned,

        style:
          "source"
      },

      {
        title:
          `Yüzme camiasına yeni eğitim duyurusu: ${cleaned}`,

        style:
          "informative"
      }

    );

  }


  /* =======================================================
     SPORCU
     ======================================================= */

  if (
    category ===
    "athlete"
  ) {

    candidates.push(

      {
        title:
          cleanDisplayTitle(
            stripBilingualTail(
              originalTitle
            )
          ),

        style:
          "source"
      },

      {
        title:
          "Yüzücüleri ilgilendiren yeni TYF duyurusu",

        style:
          "direct"
      }

    );

  }


  /* =======================================================
     GENEL DUYURU
     ======================================================= */

  if (
    category ===
    "announcement"
  ) {

    const cleaned =
      cleanDisplayTitle(
        stripBilingualTail(
          originalTitle
        )
      );


    candidates.push(

      {
        title:
          cleaned,

        style:
          "source"
      },

      {
        title:
          `TYF’den yeni duyuru: ${cleaned}`,

        style:
          "informative"
      }

    );

  }


  /* =======================================================
     YEDEK
     ======================================================= */

  if (
    !candidates.length
  ) {

    candidates.push({

      title:
        cleanDisplayTitle(
          originalTitle
        ),

      style:
        "source"

    });

  }


  return uniqueTitleCandidates(
    candidates
  );

}


/* =========================================================
   ÖZET ADAYLARI
   ========================================================= */

function buildSummaryCandidates({

  originalTitle,
  originalText,
  category,
  facts,
  pdfUrl

}) {

  const title =
    normalize(
      originalTitle
    );


  const body =
    cleanHtml(
      originalText
    );


  const summaries =
    [];


  /* =======================================================
     SEM
     ======================================================= */

  if (
    facts.isSemResult ||
    (
      title.includes(
        "SEM"
      ) &&
      title.includes(
        "KAYIT HAKKI KAZANAN"
      )
    )
  ) {

    const first =
      facts.dateRange

        ? `${facts.dateRange} tarihleri arasında yapılan başvuruların ardından SEM yüzme branşında kayıt hakkı kazanan sporcular açıklandı.`

        : "SEM yüzme branşında kayıt hakkı kazanan sporcular açıklandı.";


    const second =
      facts.businessDays

        ? `Hak kazanan sporcuların kayıt işlemlerini ${facts.businessDays} iş günü içinde tamamlaması gerekiyor.`

        : facts.deadlineText

          ? `Hak kazanan sporcuların kayıt işlemlerini ${facts.deadlineText} tarihine kadar tamamlaması gerekiyor.`

          : "Hak kazanan sporcuların kayıt sürecini resmî duyurudaki takvime göre tamamlaması gerekiyor.";


    summaries.push({

      summary:
        `${first} ${second}`,

      style:
        "action"

    });

  }


  /* =======================================================
     BEBEK YÜZME
     ======================================================= */

  if (
    facts.isBabySwimming ||
    (
      title.includes(
        "BEBEK"
      ) &&
      title.includes(
        "SEMINER"
      )
    )
  ) {

    const when =
      facts.eventDate
        ? `${facts.eventDate} tarihlerinde`
        : "yaklaşan dönemde";


    const where =
      validLocation(
        facts.location
      )
        ? `${facts.location}’da`
        : "";


    summaries.push({

      summary:
        `TYF, Bebek Yüzme Gelişim Semineri’ni ${when} ${where} düzenleyecek. Katılım, program ve başvuru ayrıntıları federasyonun resmî duyurusunda yer alıyor.`
          .replace(
            /\s+/g,
            " "
          )
          .trim(),

      style:
        "fact-rich"

    });

  }


  /* =======================================================
     ANTRENÖR KURSU
     ======================================================= */

  if (
    facts.isCoachCourse ||
    (
      title.includes(
        "ANTRENOR"
      ) &&
      title.includes(
        "KURS"
      )
    )
  ) {

    const grade =
      facts.grade
        ? `${facts.grade}. Kademe `
        : "";


    const details =
      [

        facts.eventDate,

        validLocation(
          facts.location
        )
          ? facts.location
          : ""

      ]
        .filter(
          Boolean
        )
        .join(
          " · "
        );


    let text =
      `TYF, ${grade}yüzme antrenörlüğü kursuna ilişkin yeni duyuruyu yayımladı.`;


    if (
      details
    ) {

      text +=
        ` Kurs ${details} bilgileriyle duyuruldu.`;

    }


    if (
      facts.deadlineText
    ) {

      text +=
        ` Son başvuru/kayıt bilgisi: ${facts.deadlineText}.`;

    }


    text +=
      pdfUrl

        ? " Başvuru ve katılım ayrıntıları resmî PDF duyurusunda yer alıyor."

        : " Başvuru ve katılım ayrıntıları resmî kaynakta yer alıyor.";


    summaries.push({

      summary:
        text,

      style:
        "informative"

    });

  }


  /* =======================================================
     ANTRENÖR VİZE
     ======================================================= */

  if (
    facts.isCoachVisa ||
    title.includes(
      "ANTRENOR VIZE"
    )
  ) {

    summaries.push({

      summary:
        "TYF, yüzme antrenörlerinin vize işlemlerine ilişkin yeni bilgilendirme yayımladı. İşlem koşulları ve gerekli adımlar resmî duyuruda yer alıyor.",

      style:
        "informative"

    });

  }


  /* =======================================================
     TOHM
     ======================================================= */

  if (
    facts.isTohm &&
    title.includes(
      "BASVURU"
    )
  ) {

    summaries.push({

      summary:
        "TYF, TOHM sporcu başvurularına ilişkin yeni bilgilendirme yayımladı. Başvuru koşulları, tarihler ve gerekli belgeler için resmî duyurunun kontrol edilmesi gerekiyor.",

      style:
        "action"

    });

  }


  /* =======================================================
     GERÇEK METİNDEN EN İYİ CÜMLELER
     ======================================================= */

  const factual =
    bestSentences(

      body,

      [

        "başvuru",
        "kayıt",
        "gerekmektedir",
        "tarih",
        "sporcu",
        "antrenör",
        "şampiyona",
        "müsabaka",
        "duyurulur",
        "son başvuru",
        "katılım"

      ],

      2

    );


  if (
    factual
  ) {

    summaries.push({

      summary:
        shorten(
          factual,
          360
        ),

      style:
        "source"
    });

  }


  /* =======================================================
     KATEGORİ YEDEKLERİ
     ======================================================= */

  if (
    category ===
    "event"
  ) {

    summaries.push({

      summary:
        `TYF, ${toSentenceCase(
          stripBilingualTail(
            originalTitle
          )
        )} için yeni yarışma duyurusunu yayımladı. Katılım, tarih ve organizasyon ayrıntıları resmî kaynakta yer alıyor.`,

      style:
        "informative"

    });

  }


  if (
    category ===
    "education"
  ) {

    summaries.push({

      summary:
        "TYF, yüzme camiasına yönelik yeni bir eğitim veya seminer duyurusu yayımladı. Tarih, katılım ve başvuru ayrıntıları resmî kaynakta yer alıyor.",

      style:
        "informative"

    });

  }


  if (
    category ===
    "athlete"
  ) {

    summaries.push({

      summary:
        "TYF, sporcuları ilgilendiren yeni bir resmî duyuru yayımladı. Kayıt, başvuru veya katılım ayrıntıları federasyonun resmî kaynağında yer alıyor.",

      style:
        "informative"

    });

  }


  if (
    !summaries.length
  ) {

    summaries.push({

      summary:
        fallbackSummary(
          category,
          pdfUrl
        ),

      style:
        "fallback"

    });

  }


  return uniqueSummaryCandidates(
    summaries
  );

}


/* =========================================================
   AKSİYON BUTONU
   ========================================================= */

function actionLabelFor(
  category,
  facts
) {

  if (
    facts.isSemResult ||
    facts.topic ===
    "SEM sonuçları"
  ) {

    return "Listeyi Kontrol Et";

  }


  if (
    facts.isCoachCourse ||
    facts.topic ===
    "Antrenör kursu"
  ) {

    return "Kurs Detayları";

  }


  if (
    facts.isCoachVisa ||
    facts.topic ===
    "Antrenör vize"
  ) {

    return "Vize Detayları";

  }


  if (
    facts.isTohm ||
    facts.topic ===
    "TOHM"
  ) {

    return "Başvuruyu İncele";

  }


  if (
    category ===
    "event"
  ) {

    return "Yarışmayı İncele";

  }


  if (
    category ===
    "education"
  ) {

    return "Eğitimi İncele";

  }


  if (
    category ===
    "athlete"
  ) {

    return "Sporcu Duyurusunu İncele";

  }


  return "Detay";

}


/* =========================================================
   ETİKETLER
   ========================================================= */

function buildTags(
  category,
  facts
) {

  const tags =
    [
      "Yüzme"
    ];


  if (
    category ===
    "coach"
  ) {

    tags.push(
      "Antrenör"
    );

  }


  if (
    category ===
    "athlete"
  ) {

    tags.push(
      "Sporcu"
    );

  }


  if (
    category ===
    "event"
  ) {

    tags.push(
      "Yarışma"
    );

  }


  if (
    category ===
    "education"
  ) {

    tags.push(
      "Eğitim"
    );

  }


  if (
    facts.isSem ||
    facts.topic ===
    "SEM sonuçları"
  ) {

    tags.push(
      "SEM"
    );

  }


  if (
    facts.isTohm ||
    facts.topic ===
    "TOHM"
  ) {

    tags.push(
      "TOHM"
    );

  }


  if (
    facts.grade
  ) {

    tags.push(
      `${facts.grade}. Kademe`
    );

  }


  if (
    validLocation(
      facts.location
    )
  ) {

    tags.push(
      facts.location
    );

  }


  return [
    ...new Set(
      tags.filter(
        Boolean
      )
    )
  ];

}


/* =========================================================
   YEDEK ÖZET
   ========================================================= */

function fallbackSummary(
  category,
  pdfUrl
) {

  const map = {

    coach:
      "TYF, antrenörleri ilgilendiren yeni bir resmî duyuru yayımladı.",

    athlete:
      "TYF, sporcuları ilgilendiren yeni bir resmî duyuru yayımladı.",

    event:
      "TYF, yeni bir yarışma veya şampiyona duyurusu yayımladı.",

    education:
      "TYF, yeni bir eğitim veya seminer duyurusu yayımladı.",

    announcement:
      "TYF, yeni bir resmî spor duyurusu yayımladı."

  };


  return (
    (
      map[
        category
      ] ||
      map.announcement
    )
    +
    " "
    +
    (
      pdfUrl
        ? "Ayrıntılar resmî PDF duyurusunda yer alıyor."
        : "Ayrıntılar resmî kaynakta yer alıyor."
    )
  );

}


/* =========================================================
   GERÇEK METİNDEN EN İYİ CÜMLELER
   ========================================================= */

function bestSentences(
  text,
  keywords,
  count
) {

  const sentences =
    splitSentences(
      text
    );


  const ranked =
    sentences.map(
      (
        sentence,
        index
      ) => {

        const lower =
          String(
            sentence ||
            ""
          )
            .toLocaleLowerCase(
              "tr-TR"
            );


        let score =
          0;


        for (
          const keyword
          of keywords
        ) {

          if (
            lower.includes(
              String(
                keyword
              )
                .toLocaleLowerCase(
                  "tr-TR"
                )
            )
          ) {

            score +=
              3;

          }

        }


        if (
          /\d/.test(
            sentence
          )
        ) {

          score +=
            1;

        }


        return {

          sentence:
            sentence,

          index:
            index,

          score:
            score

        };

      }
    );


  return ranked

    .filter(
      item =>
        item.score >
        0
    )

    .sort(
      (a, b) =>
        b.score -
        a.score
    )

    .slice(
      0,
      count
    )

    .sort(
      (a, b) =>
        a.index -
        b.index
    )

    .map(
      item =>
        item.sentence
    )

    .join(
      " "
    );

}


/* =========================================================
   ÇİFT DİLLİ BAŞLIK KUYRUĞUNU TEMİZLE
   ========================================================= */

function stripBilingualTail(
  title
) {

  return cleanHtml(
    title
  )

    .replace(
      /\s+INTERNATIONAL\b[\s\S]*$/i,
      ""
    )

    .replace(
      /\s+SHORT\s+COURSE\b[\s\S]*$/i,
      ""
    )

    .trim();

}


/* =========================================================
   BAŞLIK TEMİZLE
   ========================================================= */

function cleanDisplayTitle(
  title
) {

  const text =
    toSentenceCase(
      cleanHtml(
        title
      )
    );


  return (
    text.length <= 105

      ? text

      : shorten(
          text,
          105
        )
  );

}


/* =========================================================
   CÜMLE BİÇİMİ
   ========================================================= */

function toSentenceCase(
  value
) {

  const text =
    cleanHtml(
      value
    );


  if (
    !text
  ) {

    return "";

  }


  const lower =
    text.toLocaleLowerCase(
      "tr-TR"
    );


  return (
    lower
      .charAt(0)
      .toLocaleUpperCase(
        "tr-TR"
      )
    +
    lower.slice(1)
  );

}


/* =========================================================
   METİN KISALT
   ========================================================= */

function shorten(
  value,
  max
) {

  const text =
    cleanHtml(
      value
    );


  if (
    text.length <= max
  ) {

    return text;

  }


  const part =
    text.slice(
      0,
      max
    );


  const space =
    part.lastIndexOf(
      " "
    );


  return (
    part.slice(
      0,
      space > 0
        ? space
        : max
    )
    +
    "…"
  );

}


/* =========================================================
   KONUM GEÇERLİ Mİ?
   ========================================================= */

function validLocation(
  value
) {

  const location =
    String(
      value ||
      ""
    )
      .trim();


  return Boolean(
    location &&
    location !==
    "Türkiye"
  );

}


/* =========================================================
   BAŞLIK ADAYLARINI TEKİLLEŞTİR
   ========================================================= */

function uniqueTitleCandidates(
  candidates
) {

  const result =
    [];


  const seen =
    new Set();


  for (
    const candidate
    of candidates
  ) {

    const title =
      cleanHtml(
        candidate?.title ||
        ""
      );


    if (
      !title
    ) {

      continue;

    }


    const key =
      title.toLocaleLowerCase(
        "tr-TR"
      );


    if (
      seen.has(
        key
      )
    ) {

      continue;

    }


    seen.add(
      key
    );


    result.push({

      title:
        title,

      style:
        candidate.style ||
        "source"

    });

  }


  return result;

}


/* =========================================================
   ÖZET ADAYLARINI TEKİLLEŞTİR
   ========================================================= */

function uniqueSummaryCandidates(
  candidates
) {

  const result =
    [];


  const seen =
    new Set();


  for (
    const candidate
    of candidates
  ) {

    const summary =
      cleanHtml(
        candidate?.summary ||
        ""
      );


    if (
      !summary
    ) {

      continue;

    }


    const key =
      summary.toLocaleLowerCase(
        "tr-TR"
      );


    if (
      seen.has(
        key
      )
    ) {

      continue;

    }


    seen.add(
      key
    );


    result.push({

      summary:
        summary,

      style:
        candidate.style ||
        "source"

    });

  }


  return result;

}


/* =========================================================
   PUAN GÜVENLİĞİ
   ========================================================= */

function safeScore(
  value
) {

  const number =
    Number(
      value
    );


  return Number.isFinite(
    number
  )
    ? number
    : 0;

      }
