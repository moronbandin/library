let metadata;
let state = {
  book: null,
  chapter: null,
  mode: "parallel"
};

async function loadMetadata() {
  const res = await fetch("data/metadata.json");
  return await res.json();
}

function updateURL() {
  const params = new URLSearchParams({
    book: state.book,
    chapter: state.chapter,
    mode: state.mode
  });
  history.replaceState(null, "", "?" + params.toString());
}

function setMode(mode) {

  if (mode === "parallel") {
    if (state.mode === "parallel") {
      // Se xa está en paralelo → pasamos a modo grego
      state.mode = "greek";
      document.body.classList.remove("mode-galician");
      document.body.classList.add("mode-greek");
    } else {
      // Se estamos en outro modo → volvemos a paralelo
      state.mode = "parallel";
      document.body.classList.remove("mode-greek", "mode-galician");
    }

  } else {
    // Se clicamos GR ou GL
    if (state.mode === mode) {
      // Se xa está activo → volver a paralelo
      state.mode = "parallel";
      document.body.classList.remove("mode-greek", "mode-galician");
    } else {
      state.mode = mode;
      document.body.classList.remove("mode-greek", "mode-galician");
      document.body.classList.add("mode-" + mode);
    }
  }

  updateURL();
}


async function loadChapter() {
  const content = document.getElementById("content");
  const title = document.getElementById("chapterTitle");

  content.style.opacity = 0;

  const bookObj = metadata.books.find(b => b.id === state.book);

  let greek = [];
  let galician = [];

  try {
    greek = await fetch(`data/${state.book}/${state.chapter}.json`).then(r => r.json());
  } catch {}

  try {
    galician = await fetch(`trad/gl/${state.book}/${state.chapter}.json`).then(r => r.json());
  } catch {}

  content.innerHTML = "";
  title.textContent = `${bookObj.name} ${parseInt(state.chapter)}`;

  greek.forEach((v, i) => {
    const verse = document.createElement("div");
    verse.className = "verse";

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
  });

  setTimeout(() => content.style.opacity = 1, 100);
  updateURL();
}

function nextChapter() {
  const bookObj = metadata.books.find(b => b.id === state.book);
  if (parseInt(state.chapter) < bookObj.chapters) {
    state.chapter = String(parseInt(state.chapter) + 1).padStart(2, "0");
    loadChapter();
  }
}

function prevChapter() {
  if (parseInt(state.chapter) > 1) {
    state.chapter = String(parseInt(state.chapter) - 1).padStart(2, "0");
    loadChapter();
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const main = document.querySelector(".main");

  sidebar.classList.toggle("closed");
  main.classList.toggle("full");
}

async function init() {
  metadata = await loadMetadata();

  const bookSelect = document.getElementById("bookSelect");
  const chapterSelect = document.getElementById("chapterSelect");

  metadata.books.forEach(book => {
    const opt = document.createElement("option");
    opt.value = book.id;
    opt.textContent = book.name;
    bookSelect.appendChild(opt);
  });

  function populateChapters(bookId) {
    chapterSelect.innerHTML = "";
    const book = metadata.books.find(b => b.id === bookId);
    for (let i = 1; i <= book.chapters; i++) {
      const opt = document.createElement("option");
      opt.value = String(i).padStart(2, "0");
      opt.textContent = i;
      chapterSelect.appendChild(opt);
    }
  }

  bookSelect.addEventListener("change", () => {
    state.book = bookSelect.value;
    populateChapters(state.book);
    state.chapter = "01";
    loadChapter();
  });

  chapterSelect.addEventListener("change", () => {
    state.chapter = chapterSelect.value;
    loadChapter();
  });

  document.getElementById("modeParallel").onclick = () => setMode("parallel");
  document.getElementById("modeGreek").onclick = () => setMode("greek");
  document.getElementById("modeGalician").onclick = () => setMode("galician");

  document.getElementById("menuToggle").onclick = toggleSidebar;

  document.getElementById("themeToggle").onclick = () => {
    document.body.classList.toggle("dark");
  };

  document.getElementById("shareBtn").onclick = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") nextChapter();
    if (e.key === "ArrowLeft") prevChapter();
  });

  state.book = metadata.books[0].id;
  state.chapter = "01";

  populateChapters(state.book);
  loadChapter();
}

init();
