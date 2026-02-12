let metadata;

const state = {
  book: null,
  chapter: null,
  mode: "parallel"
};

let selectedVerse = null;

/* ---------------- UTIL ---------------- */

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

function saveLastPosition() {
  localStorage.setItem("nt-last", JSON.stringify({
    book: state.book,
    chapter: state.chapter
  }));
}

function restoreLastPosition() {
  const saved = localStorage.getItem("nt-last");
  if (!saved) return null;
  return JSON.parse(saved);
}

/* ---------------- MODE ---------------- */

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

/* ---------------- DATA ---------------- */

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

/* ---------------- VERSE SELECTION ---------------- */

function selectVerse(element, greek, galician) {

  document.querySelectorAll(".verse").forEach(v =>
    v.classList.remove("selected")
  );

  element.classList.add("selected");

  selectedVerse = {
    number: greek.v,
    greek: greek.text,
    galician: galician ? galician.text : ""
  };
}

function clearSelection() {
  document.querySelectorAll(".verse").forEach(v =>
    v.classList.remove("selected")
  );
  selectedVerse = null;
}

/* ---------------- CHAPTER ---------------- */

async function loadChapter() {

  const content = qs("content");
  const title = qs("chapterTitle");

  content.style.opacity = 0;
  clearSelection();

  const bookObj = metadata.books.find(b => b.id === state.book);

  const greek = await fetchJSON(`data/${state.book}/${state.chapter}.json`);
  const galician = await fetchJSON(`trad/gl/${state.book}/${state.chapter}.json`);

  content.innerHTML = "";
  title.textContent = `${bookObj.name} ${parseInt(state.chapter)}`;

  greek.forEach((v, i) => {

    const verse = document.createElement("div");
    verse.className = "verse";
    verse.dataset.verse = v.v;

    const left = document.createElement("div");
    left.className = "gr";
    left.innerHTML = `<span class="num">${v.v}</span>${v.text}`;

    const right = document.createElement("div");
    right.className = "gl";

    if (galician[i]) {
      right.innerHTML = `<span class="num">${galician[i].v}</span>${galician[i].text}`;
    }

    verse.appendChild(left);
    verse.appendChild(right);
    content.appendChild(verse);

    verse.addEventListener("click", () => {
      selectVerse(verse, v, galician[i]);
    });
  });

  syncSelectors();
  saveLastPosition();
  updateURL();

  window.scrollTo({ top: 0, behavior: "smooth" });

  setTimeout(() => content.style.opacity = 1, 120);

  /* --- HASH SUPPORT --- */

  if (window.location.hash) {
    const num = window.location.hash.replace("#v", "");
    const target = document.querySelector(`[data-verse='${num}']`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("selected");
    }
  }
}

/* ---------------- NAVIGATION ---------------- */

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

  loadChapter();
}

/* ---------------- SIDEBAR ---------------- */

function toggleSidebar() {
  qs("sidebar").classList.toggle("closed");
}

/* ---------------- SHARE ---------------- */

function openShareMenu(e) {

  const existing = document.querySelector(".share-menu");
  if (existing) existing.remove();

  const menu = document.createElement("div");
  menu.className = "share-menu";

  const rect = e.target.getBoundingClientRect();
  menu.style.top = rect.bottom + 8 + "px";
  menu.style.left = rect.left + "px";

  const copyURL = document.createElement("button");
  copyURL.textContent = "Copy link";

  const copyText = document.createElement("button");
  copyText.textContent = "Copy text";

  menu.appendChild(copyURL);
  menu.appendChild(copyText);
  document.body.appendChild(menu);

  copyURL.onclick = async () => {

    let url = window.location.origin +
      window.location.pathname +
      `?book=${state.book}&chapter=${state.chapter}&mode=${state.mode}`;

    if (selectedVerse) {
      url += `#v${selectedVerse.number}`;
    }

    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copied");
    } catch {
      prompt("Copy this link:", url);
    }

    menu.remove();
  };

  copyText.onclick = async () => {

    let text;

    if (selectedVerse) {
      text =
        `${state.book.toUpperCase()} ${parseInt(state.chapter)}:${selectedVerse.number}\n\n` +
        selectedVerse.greek +
        (selectedVerse.galician ? "\n\n" + selectedVerse.galician : "");
    } else {
      text = `${state.book.toUpperCase()} ${parseInt(state.chapter)}`;
    }

    try {
      await navigator.clipboard.writeText(text);
      showToast("Text copied");
    } catch {
      prompt("Copy this text:", text);
    }

    menu.remove();
  };

  setTimeout(() => {
    document.addEventListener("click", () => menu.remove(), { once: true });
  }, 10);
}

/* ---------------- INIT ---------------- */

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
    loadChapter();
  });

  chapterSelect.addEventListener("change", () => {
    state.chapter = chapterSelect.value;
    loadChapter();
  });

  qs("modeParallel").onclick = () => setMode("parallel");
  qs("modeGreek").onclick = () => setMode("greek");
  qs("modeGalician").onclick = () => setMode("galician");

  qs("nextChapter").onclick = nextChapter;
  qs("prevChapter").onclick = prevChapter;

  qs("themeToggle").onclick = () => {
    document.body.classList.toggle("dark");
    localStorage.setItem(
      "nt-theme",
      document.body.classList.contains("dark") ? "dark" : "light"
    );
  };

  qs("shareBtn").onclick = openShareMenu;

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") nextChapter();
    if (e.key === "ArrowLeft") prevChapter();
  });

  const params = new URLSearchParams(window.location.search);

  state.book = params.get("book");
  state.chapter = params.get("chapter");
  state.mode = params.get("mode") || "parallel";

  if (!state.book || !state.chapter) {
    const saved = restoreLastPosition();
    if (saved) {
      state.book = saved.book;
      state.chapter = saved.chapter;
    } else {
      state.book = metadata.books[0].id;
      state.chapter = "01";
    }
  }

  if (localStorage.getItem("nt-theme") === "dark") {
    document.body.classList.add("dark");
  }

  applyMode();
  populateChapters(state.book);
  loadChapter();
}

/* ---------------- TOAST ---------------- */

function showToast(text) {

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = text;

  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 50);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 1600);
}

init();
