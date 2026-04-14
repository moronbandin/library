let metadata;

const state = {
  book: null,
  chapter: null,
  mode: "greek"
};

let morphPopup = null;

/* =========================================================
   UTIL
========================================================= */

function qs(id) {
  return document.getElementById(id);
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function updateURL() {
  const params = new URLSearchParams({
    book: state.book,
    chapter: state.chapter,
    mode: state.mode
  });
  history.replaceState(null, "", "?" + params.toString());
}

/* =========================================================
   THEME
========================================================= */

function toggleTheme() {
  document.documentElement.classList.toggle("dark");

  if (document.documentElement.classList.contains("dark")) {
    localStorage.setItem("theme", "dark");
  } else {
    localStorage.setItem("theme", "light");
  }
}

function applySavedTheme() {
  if (localStorage.getItem("theme") === "dark") {
    document.documentElement.classList.add("dark");
  }
}

/* =========================================================
   MODE (parallel / greek / galician)
========================================================= */

function applyMode() {
  document.body.classList.remove("mode-greek", "mode-galician");
  if (state.mode !== "parallel") {
    document.body.classList.add("mode-" + state.mode);
  }
}

function setMode(mode) {
  state.mode = mode;
  applyMode();
  updateURL();
}

/* =========================================================
   NAVIGATION
========================================================= */

function syncSelectors() {
  qs("bookSelect").value = state.book;
  populateChapters(state.book);
  qs("chapterSelect").value = state.chapter;
}

function nextChapter() {

  const bookIndex = metadata.books.findIndex(b => b.id === state.book);
  const bookObj = metadata.books[bookIndex];

  if (parseInt(state.chapter) < bookObj.chapters) {
    state.chapter = pad(parseInt(state.chapter) + 1);
  } else if (bookIndex < metadata.books.length - 1) {
    state.book = metadata.books[bookIndex + 1].id;
    state.chapter = "01";
  }

  syncSelectors();
  loadChapter();
}

function prevChapter() {

  const bookIndex = metadata.books.findIndex(b => b.id === state.book);

  if (parseInt(state.chapter) > 1) {
    state.chapter = pad(parseInt(state.chapter) - 1);
  } else if (bookIndex > 0) {
    const prevBook = metadata.books[bookIndex - 1];
    state.book = prevBook.id;
    state.chapter = pad(prevBook.chapters);
  }

  syncSelectors();
  loadChapter();
}

/* =========================================================
   MORPH DECODER
========================================================= */

function decodeMorph(morph, pos) {

  if (!morph || morph === "--------") {
    return "Forma invariable";
  }

  const mapCase = { N: "nominativo", G: "xenitivo", D: "dativo", A: "acusativo" };
  const mapNumber = { S: "singular", P: "plural" };
  const mapGender = { M: "masculino", F: "feminino", N: "neutro" };

  const mapTense = {
    P: "presente",
    I: "imperfecto",
    F: "futuro",
    A: "aoristo",
    X: "perfecto",
    Y: "pluscuamperfecto"
  };

  const mapVoice = { A: "activa", M: "media", P: "pasiva" };

  const mapMood = {
    I: "indicativo",
    D: "imperativo",
    S: "subxuntivo",
    O: "optativo",
    N: "infinitivo",
    P: "participio"
  };

  let result = [];

  if (pos && pos.startsWith("V")) {
    const tense = morph[1];
    const voice = morph[2];
    const mood = morph[3];

    if (mapTense[tense]) result.push(mapTense[tense]);
    if (mapVoice[voice]) result.push("voz " + mapVoice[voice]);
    if (mapMood[mood]) result.push(mapMood[mood]);
  }

  const caseLetter = morph[4];
  const number = morph[5];
  const gender = morph[6];

  if (mapCase[caseLetter]) result.push(mapCase[caseLetter]);
  if (mapNumber[number]) result.push(mapNumber[number]);
  if (mapGender[gender]) result.push(mapGender[gender]);

  return result.join(", ");
}

/* =========================================================
   POS LABEL
========================================================= */

function getPOSLabel(pos) {

  if (!pos) return { label: "Descoñecido", class: "chip-other" };

  if (pos.startsWith("RA")) return { label: "Artigo", class: "chip-article" };

  if (pos.startsWith("RP") || pos.startsWith("RD") || pos.startsWith("RI") || pos.startsWith("RR"))
    return { label: "Pronome", class: "chip-pron" };

  if (pos.startsWith("N")) return { label: "Substantivo", class: "chip-noun" };
  if (pos.startsWith("V")) return { label: "Verbo", class: "chip-verb" };
  if (pos.startsWith("A")) return { label: "Adxectivo", class: "chip-adj" };
  if (pos.startsWith("P-")) return { label: "Preposición", class: "chip-prep" };
  if (pos.startsWith("C-")) return { label: "Conxunción", class: "chip-conj" };

  return { label: pos, class: "chip-other" };
}

/* =========================================================
   MORPH POPUP
========================================================= */

function showMorphPopup(span) {

  removeMorphPopup();

  const posInfo = getPOSLabel(span.dataset.pos);
  const analysis = decodeMorph(span.dataset.morph, span.dataset.pos);

  morphPopup = document.createElement("div");
  morphPopup.className = "morph-popup";

  morphPopup.innerHTML = `
    <div class="morph-form">${span.dataset.form}</div>
    <div class="morph-chip ${posInfo.class}">${posInfo.label}</div>
    <div class="morph-section">
      <div class="morph-label">Lema</div>
      <div class="morph-lemma">${span.dataset.lemma}</div>
    </div>
    <div class="morph-section">
      <div class="morph-label">Análise</div>
      <div>${analysis}</div>
    </div>
  `;

  document.body.appendChild(morphPopup);

  const rect = span.getBoundingClientRect();
  const popupWidth = 280;

  let left = rect.left;
  if (left + popupWidth > window.innerWidth - 20) {
    left = window.innerWidth - popupWidth - 20;
  }

  morphPopup.style.top = rect.bottom + 10 + "px";
  morphPopup.style.left = left + "px";

  setTimeout(() => {
    document.addEventListener("click", (e) => {
      if (morphPopup && !morphPopup.contains(e.target)) {
        removeMorphPopup();
      }
    }, { once: true });
  }, 10);
}

function removeMorphPopup() {
  if (morphPopup) {
    morphPopup.remove();
    morphPopup = null;
  }
}

/* =========================================================
   DATA
========================================================= */

async function loadMetadata() {
  const res = await fetch("data/metadata.json");
  return await res.json();
}

async function fetchJSON(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/* =========================================================
   CHAPTER
========================================================= */

async function loadChapter() {

  const content = qs("content");
  const title = qs("chapterTitle");

  content.innerHTML = "";
  removeMorphPopup();

  const bookObj = metadata.books.find(b => b.id === state.book);

  const greek = await fetchJSON(`data/${state.book}/${state.chapter}.json`);
  const galician = await fetchJSON(`trad/gl/${state.book}/${state.chapter}.json`);

  title.textContent = `${bookObj.name} ${parseInt(state.chapter)}`;

  greek.forEach((v, i) => {

    const verse = document.createElement("div");
    verse.className = "verse";

    const left = document.createElement("div");
    left.className = "gr";

    const num = document.createElement("span");
    num.className = "num";
    num.textContent = v.v;
    left.appendChild(num);
    left.appendChild(document.createTextNode(" "));

    if (v.tokens) {
      v.tokens.forEach(token => {
        const span = document.createElement("span");
        span.className = "token";
        span.textContent = token.form + " ";

        span.dataset.form = token.form;
        span.dataset.lemma = token.lemma;
        span.dataset.morph = token.morph;
        span.dataset.pos = token.pos;

        span.addEventListener("click", (e) => {
          e.stopPropagation();
          showMorphPopup(span);
        });

        left.appendChild(span);
      });
    } else {
      left.appendChild(document.createTextNode(v.text));
    }

    const right = document.createElement("div");
    right.className = "gl";

    if (galician[i]) {
      right.innerHTML =
        `<span class="num">${galician[i].v}</span> ${galician[i].text}`;
    }

    verse.appendChild(left);
    verse.appendChild(right);
    content.appendChild(verse);
  });

  updateURL();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* =========================================================
   INIT
========================================================= */

let populateChapters;

async function init() {

  metadata = await loadMetadata();

  const bookSelect = qs("bookSelect");
  const chapterSelect = qs("chapterSelect");

  metadata.books.forEach(book => {
    const opt = document.createElement("option");
    opt.value = book.id;
    opt.textContent = book.name;
    bookSelect.appendChild(opt);
  });

  populateChapters = function (bookId) {
    chapterSelect.innerHTML = "";
    const book = metadata.books.find(b => b.id === bookId);
    for (let i = 1; i <= book.chapters; i++) {
      const opt = document.createElement("option");
      opt.value = pad(i);
      opt.textContent = i;
      chapterSelect.appendChild(opt);
    }
  };

  bookSelect.addEventListener("change", () => {
    state.book = bookSelect.value;
    state.chapter = "01";
    syncSelectors();
    loadChapter();

    // Pechar sidebar en móbil
    qs("sidebar").classList.remove("open");
    qs("overlay").classList.remove("active");
  });

  chapterSelect.addEventListener("change", () => {
    state.chapter = chapterSelect.value;
    loadChapter();

    // Pechar sidebar en móbil
    qs("sidebar").classList.remove("open");
    qs("overlay").classList.remove("active");
  });

  qs("modeParallel").onclick = () => setMode("parallel");
  qs("modeGreek").onclick = () => setMode("greek");
  qs("modeGalician").onclick = () => setMode("galician");

  qs("themeToggle").onclick = toggleTheme;
  qs("nextChapter").onclick = nextChapter;
  qs("prevChapter").onclick = prevChapter;

  /* =============================
     MOBILE MENU TOGGLE
  ============================= */

  qs("menuToggle").onclick = () => {
    qs("sidebar").classList.toggle("open");
    qs("overlay").classList.toggle("active");
  };

  qs("overlay").onclick = () => {
    qs("sidebar").classList.remove("open");
    qs("overlay").classList.remove("active");
  };

  /* ============================= */

  state.book = metadata.books[0].id;
  state.chapter = "01";

  applySavedTheme();
  applyMode();
  populateChapters(state.book);
  loadChapter();
}

init();
