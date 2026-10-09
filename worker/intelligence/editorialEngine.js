import {
  scoreTitleCandidate,
  scoreSummaryCandidate
} from "./qualityEngine.js";


/* =========================================================
   SporNRD v6
   AKILLI EDİTÖR MOTORU

   Görevleri:
   - Gerçeklerden başlık adayları üretmek
   - Birden fazla özet üretmek
   - Clickbait'i sınırlamak
   - Hedef kitleye göre dili değiştirmek
   - En kaliteli başlığı seçmek
   - En kaliteli özeti seçmek
   ========================================================= */


/* =========================================================
   ANA EDİTÖR
   ========================================================= */

export function buildEditorial({
  originalTitle = "",
  originalText = "",
  category = "announcement",
  facts = {},
  pdfUrl = ""
}) {

  const titleCandidates =
    generateTitleCandidates({
      originalTitle,
      category,
      facts
    });


  const rankedTitles =
    titleCandidates

      .map(
        candidate => {

          return {

            ...candidate,

            score:
              scoreTitleCandidate(
                candidate.text,
                {
                  originalTitle,
                  category,
                  facts
                }
              )

          };

        }
      )

      .sort(
        (a, b) =>
          b.score -
          a.score
      );


  const selectedTitle =
    rankedTitles.length

      ? rankedTitles[0].text

      : fallbackTitle(
          originalTitle
        );


  const summaryCandidates =
    generateSummaryCandidates({
      originalTitle,
      originalText,
      category,
      facts,
      pdfUrl
    });


  const rankedSummaries =
    summaryCandidates

      .map(
        candidate => {

          return {

            ...candidate,

            score:
              scoreSummaryCandidate(
                candidate.text,
                {
                  category,
                  facts
                }
              )

          };

        }
      )

      .sort(
        (a, b) =>
          b.score -
          a.score
      );


  const selectedSummary =
    rankedSummaries.length

      ? rankedSummaries[0].text

      : fallbackSummary(
          facts
        );


  const qualityScore =
    calculateOverallEditorialScore(
      rankedTitles,
      rankedSummaries
    );


  return {

    title:
      selectedTitle,

    summary:
      selectedSummary,

    actionLabel:
      createActionLabel(
        category,
        facts
      ),

    tags:
      createTags(
        category,
        facts
      ),

    qualityScore:
      qualityScore,


    /* Öğrenme motoru için adaylar */

    titleCandidates:
      rankedTitles.map(
        item => ({
          text:
            item.text,

          style:
            item.style,

          score:
            round(
              item.score
            )
        })
      ),


    summaryCandidates:
      rankedSummaries.map(
        item => ({
          text:
            item.text,

          style:
            item.style,

          score:
            round(
              item.score
            )
        })
      )

  };

}


/* =========================================================
   BAŞLIK ADAYLARI
   ========================================================= */

function generateTitleCandidates({
  originalTitle,
  category,
  facts
}) {

  const candidates =
    [];


  const topic =
    clean(
      facts.topic
    );


  const location =
    validLocation(
      facts.location
    );


  const eventDate =
    clean(
      facts.eventDate
    );


  const dateRange =
    clean(
      facts.dateRange
    );


  const grade =
    clean(
      facts.grade
    );


  /* =======================================================
     SPORCU
     ======================================================= */

  if (
    category ===
    "athlete"
  ) {

    if (
      facts.isSemResult
    ) {

      candidates.push({

        text:
          "SEM’de kayıt hakkı kazanan yüzücüler açıklandı 🏊",

        style:
          "direct"

      });


      candidates.push({

        text:
          "SEM yüzme sonuçları belli oldu: Kayıt hakkı kazanan sporcular açıklandı",

        style:
          "informative"

      });


      if (
        facts.actionRequired
      ) {

        candidates.push({

          text:
            "SEM sonuçları açıklandı: Hak kazanan sporcular için kayıt süreci başladı",

          style:
            "action"

        });

      }

    }


    else if (
      facts.isTohm
    ) {

      candidates.push({

        text:
          "TOHM sporcu sürecinde yeni dönem başladı",

        style:
          "direct"

      });


      candidates.push({

        text:
          "TOHM sporcu başvurularıyla ilgili yeni duyuru yayımlandı",

        style:
          "informative"

      });

    }


    else {

      candidates.push({

        text:
          topic
            ? topic +
              ": Sporcuları ilgilendiren yeni gelişme"
            : "Yüzücüleri ilgilendiren yeni duyuru yayımlandı",

        style:
          "interest"

      });


      candidates.push({

        text:
          cleanTitle(
            originalTitle
          ),

        style:
          "source"

      });

    }

  }


  /* =======================================================
     ANTRENÖR
     ======================================================= */

  else if (
    category ===
    "coach"
  ) {

    if (
      facts.isCoachCourse
    ) {

      const base =
        grade

          ? grade +
            ". Kademe yüzme antrenörlüğü kursu"

          : "Yüzme antrenörlüğü kursu";


      if (
        location &&
        eventDate
      ) {

        candidates.push({

          text:
            base +
            " " +
            location +
            "’da: " +
            eventDate,

          style:
            "fact-rich"

        });

      }


      if (
        location
      ) {

        candidates.push({

          text:
            base +
            " " +
            location +
            "’da düzenlenecek",

          style:
            "location"

        });

      }


      candidates.push({

        text:
          base +
          " için yeni başvuru duyurusu",

        style:
          "action"

      });

    }


    else if (
      facts.isCoachVisa
    ) {

      candidates.push({

        text:
          "Yüzme antrenörleri için vize işlemleri açıklandı",

        style:
          "direct"

      });


      candidates.push({

        text:
          "Antrenörler dikkat: Yeni vize duyurusu yayımlandı",

        style:
          "interest"

      });

    }


    else {

      candidates.push({

        text:
          topic
            ? topic +
              ": Antrenörleri ilgilendiren yeni duyuru"
            : "Yüzme antrenörlerini ilgilendiren yeni duyuru",

        style:
          "direct"

      });


      candidates.push({

        text:
          cleanTitle(
            originalTitle
          ),

        style:
          "source"

      });

    }

  }


  /* =======================================================
     EĞİTİM / SEMİNER
     ======================================================= */

  else if (
    category ===
    "education"
  ) {

    if (
      facts.isBabySwimming
    ) {

      if (
        location &&
        eventDate
      ) {

        candidates.push({

          text:
            "Bebek yüzme gelişim semineri " +
            location +
            "’da: " +
            eventDate +
            " 🏊",

          style:
            "fact-rich"

        });

      }


      candidates.push({

        text:
          "Bebek yüzme gelişim semineri için yeni dönem başlıyor",

        style:
          "interest"

      });


      candidates.push({

        text:
          "Bebek yüzme gelişim seminerinin detayları açıklandı",

        style:
          "informative"

      });

    }


    else {

      if (
        topic &&
        location
      ) {

        candidates.push({

          text:
            topic +
            " " +
            location +
            "’da düzenlenecek",

          style:
            "location"

        });

      }


      if (
        topic
      ) {

        candidates.push({

          text:
            topic +
            " için yeni eğitim duyurusu",

          style:
            "direct"

        });

      }


      candidates.push({

        text:
          cleanTitle(
            originalTitle
          ),

        style:
          "source"

      });

    }

  }


  /* =======================================================
     YARIŞMA
     ======================================================= */

  else if (
    category ===
    "event"
  ) {

    if (
      topic &&
      location
    ) {

      candidates.push({

        text:
          topic +
          " " +
          location +
          "’da 🏆",

        style:
          "location"

      });

    }


    if (
      topic &&
      eventDate
    ) {

      candidates.push({

        text:
          topic +
          ": " +
          eventDate,

        style:
          "date"

      });

    }


    if (
      topic
    ) {

      candidates.push({

        text:
          topic +
          " için geri sayım başladı 🏆",

        style:
          "interest"

      });

    }


    candidates.push({

      text:
        cleanTitle(
          originalTitle
        ),

      style:
        "source"

    });

  }


  /* =======================================================
     GENEL DUYURU
     ======================================================= */

  else {

    if (
      facts.actionRequired &&
      topic
    ) {

      candidates.push({

        text:
          topic +
          ": Yapılması gerekenler açıklandı",

        style:
          "action"

      });

    }


    if (
      topic
    ) {

      candidates.push({

        text:
          topic +
          " hakkında yeni duyuru yayımlandı",

        style:
          "direct"

      });

    }


    candidates.push({

      text:
        cleanTitle(
          originalTitle
        ),

      style:
        "source"

    });

  }


  /* =======================================================
     BOŞ / TEKRAR ADAYLARI TEMİZLE
     ======================================================= */

  return uniqueCandidates(
    candidates
  )

    .filter(
      item =>
        item.text.length >= 12
    )

    .slice(
      0,
      6
    );

}


/* =========================================================
   ÖZET ADAYLARI
   ========================================================= */

function generateSummaryCandidates({
  originalTitle,
  originalText,
  category,
  facts,
  pdfUrl
}) {

  const candidates =
    [];


  const location =
    validLocation(
      facts.location
    );


  const eventDate =
    clean(
      facts.eventDate
    );


  const dateRange =
    clean(
      facts.dateRange
    );


  const deadline =
    clean(
      facts.deadlineText
    );


  /* =======================================================
     SEM SONUCU
     ======================================================= */

  if (
    facts.isSemResult
  ) {

    let first =
      "TYF, SEM yüzme branşında kayıt hakkı kazanan sporcuları açıkladı.";


    if (
      dateRange
    ) {

      first =
        dateRange +
        " tarihleri arasında yapılan başvuruların ardından SEM yüzme branşında kayıt hakkı kazanan sporcular açıklandı.";

    }


    let second =
      "Hak kazanan sporcuların kayıt işlemlerini federasyonun belirlediği süreçte tamamlaması gerekiyor.";


    if (
      deadline
    ) {

      second =
        "Hak kazanan sporcuların kayıt işlemlerini " +
        deadline +
        " içinde tamamlaması gerekiyor.";

    }


    candidates.push({

      text:
        first +
        " " +
        second,

      style:
        "action"

    });


    candidates.push({

      text:
        "SEM yüzme branşındaki sonuçlar açıklandı. " +
        (
          deadline
            ? "Listede yer alan sporcular için kayıt süresi " +
              deadline +
              "."
            : "Listede yer alan sporcuların kayıt sürecini resmî duyurudan takip etmesi gerekiyor."
        ),

      style:
        "short"

    });

  }


  /* =======================================================
     ANTRENÖR KURSU
     ======================================================= */

  else if (
    facts.isCoachCourse
  ) {

    let first =
      "TYF, yüzme antrenörlüğü kursuna ilişkin yeni duyuruyu yayımladı.";


    if (
      facts.grade
    ) {

      first =
        "TYF, " +
        facts.grade +
        ". Kademe yüzme antrenörlüğü kursunun ayrıntılarını açıkladı.";

    }


    const details =
      [];


    if (
      eventDate
    ) {

      details.push(
        eventDate
      );

    }


    if (
      location
    ) {

      details.push(
        location
      );

    }


    if (
      details.length
    ) {

      first +=
        " Kurs " +
        details.join(
          " · "
        ) +
        " bilgileriyle duyuruldu.";

    }


    candidates.push({

      text:
        first +
        " Başvuru, katılım ve gerekli belgeler resmî duyuruda yer alıyor.",

      style:
        "informative"

    });


    candidates.push({

      text:
        "Antrenörlerin kurs tarihleri, başvuru şartları ve gerekli belgeleri TYF’nin resmî duyurusundan kontrol etmesi gerekiyor.",

      style:
        "action"

    });

  }


  /* =======================================================
     BEBEK YÜZME SEMİNERİ
     ======================================================= */

  else if (
    facts.isBabySwimming
  ) {

    let text =
      "TYF, Bebek Yüzme Gelişim Semineri’nin yeni dönemini duyurdu.";


    if (
      eventDate &&
      location
    ) {

      text =
        "TYF, Bebek Yüzme Gelişim Semineri’ni " +
        eventDate +
        " tarihlerinde " +
        location +
        "’da düzenleyecek.";

    }


    candidates.push({

      text:
        text +
        " Katılım, program ve başvuru ayrıntıları federasyonun resmî duyurusunda yer alıyor.",

      style:
        "informative"

    });


    candidates.push({

      text:
        "Bebek yüzme alanıyla ilgilenen antrenörler ve uzmanlar için düzenlenen seminerin tarih, program ve katılım bilgileri açıklandı.",

      style:
        "audience"

    });

  }


  /* =======================================================
     YARIŞMA
     ======================================================= */

  else if (
    category ===
    "event"
  ) {

    let text =
      "TYF yeni yarışma veya şampiyona duyurusunu yayımladı.";


    if (
      facts.topic
    ) {

      text =
        "TYF, " +
        lowerFirst(
          facts.topic
        ) +
        " için organizasyon ayrıntılarını açıkladı.";

    }


    const details =
      [];


    if (
      eventDate
    ) {

      details.push(
        eventDate
      );

    }


    if (
      location
    ) {

      details.push(
        location
      );

    }


    if (
      details.length
    ) {

      text +=
        " Etkinlik " +
        details.join(
          " · "
        ) +
        " bilgileriyle duyuruldu.";

    }


    candidates.push({

      text:
        text +
        " Katılım ve organizasyon ayrıntıları resmî kaynakta yer alıyor.",

      style:
        "informative"

    });

  }


  /* =======================================================
     EĞİTİM
     ======================================================= */

  else if (
    category ===
    "education"
  ) {

    candidates.push({

      text:
        "TYF, yüzme camiasına yönelik yeni eğitim veya seminer duyurusunu yayımladı. Tarih, program, katılım ve başvuru ayrıntıları resmî kaynakta yer alıyor.",

      style:
        "informative"

    });

  }


  /* =======================================================
     SPORCU
     ======================================================= */

  else if (
    category ===
    "athlete"
  ) {

    candidates.push({

      text:
        "TYF, sporcuları ilgilendiren yeni bir resmî duyuru yayımladı. Kayıt, başvuru veya katılım bilgileri federasyonun resmî kaynağında yer alıyor.",

      style:
        "informative"

    });

  }


  /* =======================================================
     GENEL
     ======================================================= */

  else {

    candidates.push({

      text:
        "Türkiye Yüzme Federasyonu yeni bir resmî duyuru yayımladı. Sporcu, antrenör veya kulüpleri ilgilendiren ayrıntılar federasyonun resmî kaynağında yer alıyor.",

      style:
        "general"

    });

  }


  /* =======================================================
     GERÇEK METİNDEN YEDEK ÖZET
     ======================================================= */

  const extracted =
    extractUsefulSentences(
      originalText
    );


  if (
    extracted
  ) {

    candidates.push({

      text:
        extracted,

      style:
        "source-derived"

    });

  }


  /* =======================================================
     PDF VARSA BİLGİ
     ======================================================= */

  if (
    pdfUrl
  ) {

    candidates.push({

      text:
        "Federasyon duyurusunda başvuru, katılım ve diğer ayrıntılar için ayrıca resmî PDF dokümanı yayımlandı.",

      style:
        "document"

    });

  }


  return uniqueCandidates(
    candidates
  )

    .filter(
      item =>
        item.text.length >= 40
    )

    .map(
      item => ({
        ...item,

        text:
          shorten(
            item.text,
            360
          )
      })
    )

    .slice(
      0,
      6
    );

}


/* =========================================================
   AKSİYON BUTONU
   ========================================================= */

function createActionLabel(
  category,
  facts
) {

  if (
    facts.isSemResult
  ) {

    return "Listeyi Kontrol Et";

  }


  if (
    facts.isCoachCourse
  ) {

    return "Kurs Detayları";

  }


  if (
    facts.isCoachVisa
  ) {

    return "Vize Detayları";

  }


  if (
    facts.isTohm
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


  return "Detayı Gör";

}


/* =========================================================
   ETİKETLER
   ========================================================= */

function createTags(
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
    facts.isSem
  ) {

    tags.push(
      "SEM"
    );

  }


  if (
    facts.isTohm
  ) {

    tags.push(
      "TOHM"
    );

  }


  if (
    facts.grade
  ) {

    tags.push(
      facts.grade +
      ". Kademe"
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
      tags
    )
  ];

}


/* =========================================================
   GENEL EDİTÖR PUANI
   ========================================================= */

function calculateOverallEditorialScore(
  titles,
  summaries
) {

  const titleScore =
    titles.length

      ? Number(
          titles[0].score || 0
        )

      : 0;


  const summaryScore =
    summaries.length

      ? Number(
          summaries[0].score || 0
        )

      : 0;


  return round(

    (
      titleScore *
      0.55
    )

    +

    (
      summaryScore *
      0.45
    )

  );

}


/* =========================================================
   KAYNAK METİNDEN ÖZET
   ========================================================= */

function extractUsefulSentences(
  text
) {

  const source =
    clean(
      text
    );


  if (
    source.length < 80
  ) {

    return "";

  }


  const sentences =
    source.match(
      /[^.!?]+[.!?]+|[^.!?]+$/g
    ) || [];


  const useful =
    sentences

      .map(
        item =>
          item.trim()
      )

      .filter(
        sentence => {

          const lower =
            sentence
              .toLocaleLowerCase(
                "tr-TR"
              );


          return (

            sentence.length >= 35 &&

            (
              lower.includes(
                "başvuru"
              ) ||

              lower.includes(
                "kayıt"
              ) ||

              lower.includes(
                "sporcu"
              ) ||

              lower.includes(
                "antrenör"
              ) ||

              lower.includes(
                "tarih"
              ) ||

              lower.includes(
                "seminer"
              ) ||

              lower.includes(
                "kurs"
              ) ||

              lower.includes(
                "şampiyona"
              )

            )

          );

        }
      )

      .slice(
        0,
        2
      );


  return shorten(
    useful.join(
      " "
    ),
    340
  );

}


/* =========================================================
   YEDEK BAŞLIK
   ========================================================= */

function fallbackTitle(
  originalTitle
) {

  const cleaned =
    cleanTitle(
      originalTitle
    );


  return (
    cleaned ||
    "Türkiye Yüzme Federasyonu yeni duyuru yayımladı"
  );

}


/* =========================================================
   YEDEK ÖZET
   ========================================================= */

function fallbackSummary(
  facts
) {

  if (
    facts.actionRequired
  ) {

    return (
      "Türkiye Yüzme Federasyonu yeni bir duyuru yayımladı. Kullanıcıların gerekli işlemleri ve tarihleri resmî kaynaktan kontrol etmesi gerekiyor."
    );

  }


  return (
    "Türkiye Yüzme Federasyonu yeni bir resmî spor duyurusu yayımladı. Ayrıntılar federasyonun resmî kaynağında yer alıyor."
  );

}


/* =========================================================
   BAŞLIK TEMİZLE
   ========================================================= */

function cleanTitle(
  value
) {

  let text =
    clean(
      value
    );


  text =
    text.replace(
      /\s+INTERNATIONAL\b[\s\S]*$/i,
      ""
    );


  text =
    text.replace(
      /\s+SHORT\s+COURSE\b[\s\S]*$/i,
      ""
    );


  if (
    text.length > 110
  ) {

    text =
      shorten(
        text,
        110
      );

  }


  return sentenceCase(
    text
  );

}


/* =========================================================
   BENZERSİZ ADAYLAR
   ========================================================= */

function uniqueCandidates(
  candidates
) {

  const result =
    [];


  const used =
    new Set();


  for (
    const item
    of candidates
  ) {

    const text =
      clean(
        item.text
      );


    if (
      !text
    ) {

      continue;

    }


    const key =
      text
        .toLocaleLowerCase(
          "tr-TR"
        );


    if (
      used.has(
        key
      )
    ) {

      continue;

    }


    used.add(
      key
    );


    result.push({

      ...item,

      text:
        text

    });

  }


  return result;

}


/* =========================================================
   KONUM KONTROL
   ========================================================= */

function validLocation(
  location
) {

  const value =
    clean(
      location
    );


  if (
    !value ||
    value === "Türkiye"
  ) {

    return "";

  }


  return value;

}


/* =========================================================
   METİN TEMİZLE
   ========================================================= */

function clean(
  value
) {

  return String(
    value || ""
  )

    .replace(
      /<[^>]+>/g,
      " "
    )

    .replace(
      /[\u00A0\u2007\u202F]/g,
      " "
    )

    .replace(
      /\s+/g,
      " "
    )

    .trim();

}


/* =========================================================
   CÜMLE BİÇİMİ
   ========================================================= */

function sentenceCase(
  value
) {

  const text =
    clean(
      value
    );


  if (
    !text
  ) {

    return "";

  }


  const lower =
    text
      .toLocaleLowerCase(
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
   İLK HARF KÜÇÜK
   ========================================================= */

function lowerFirst(
  value
) {

  const text =
    clean(
      value
    );


  if (
    !text
  ) {

    return "";

  }


  return (
    text
      .charAt(0)
      .toLocaleLowerCase(
        "tr-TR"
      )
    +
    text.slice(1)
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
    clean(
      value
    );


  if (
    text.length <= max
  ) {

    return text;

  }


  const partial =
    text.slice(
      0,
      max
    );


  const lastSpace =
    partial.lastIndexOf(
      " "
    );


  return (
    partial.slice(
      0,
      lastSpace > 0
        ? lastSpace
        : max
    )
    +
    "…"
  );

}


/* =========================================================
   PUAN YUVARLA
   ========================================================= */

function round(
  value
) {

  return Math.round(
    Number(
      value || 0
    ) *
    10
  ) / 10;

}
