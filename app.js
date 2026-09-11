/* =========================
   STUDYSNAP
   Simple browser-based app
========================= */

let studySets = JSON.parse(
  localStorage.getItem("studysnap_sets") || "[]"
);

let activities = Number(
  localStorage.getItem("studysnap_activities") || "0"
);

let flashcards = [];
let currentCard = 0;
let showingAnswer = false;


/* =========================
   ELEMENTS
========================= */

const notesInput = document.getElementById("notes");
const setNameInput = document.getElementById("setName");
const output = document.getElementById("output");
const outputSection = document.getElementById("outputSection");
const outputTitle = document.getElementById("outputTitle");
const charCount = document.getElementById("charCount");


/* =========================
   NOTES CHARACTER COUNTER
========================= */

notesInput.addEventListener("input", () => {
  charCount.textContent = notesInput.value.length.toLocaleString();
});


/* =========================
   NAVIGATION
========================= */

function showPage(pageId, button = null) {

  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });

  const page = document.getElementById(pageId);

  if (page) {
    page.classList.add("active");
  }

  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.remove("active");
  });

  if (button) {
    button.classList.add("active");
  }

  if (pageId === "sets") {
    renderSets();
  }

  if (pageId === "progress") {
    updateProgress();
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================
   TEXT PROCESSING
========================= */

function cleanText(text) {

  return text
    .replace(/\s+/g, " ")
    .replace(/^[•\-*]\s*/gm, "")
    .trim();
}


function splitIntoSentences(text) {

  return cleanText(text)
    .split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length >= 25);
}


/* =========================
   IMPORTANT IDEA DETECTION
========================= */

/*
  This is NOT real AI yet.

  Instead of dumping every sentence,
  this function scores sentences based
  on useful study words and length.
*/

function findImportantIdeas(text) {

  const sentences = splitIntoSentences(text);

  if (sentences.length === 0) {
    return [];
  }

  const keywords = [
    "important",
    "because",
    "therefore",
    "causes",
    "caused",
    "results",
    "result",
    "process",
    "defined",
    "definition",
    "means",
    "known as",
    "refers to",
    "purpose",
    "function",
    "main",
    "include",
    "includes",
    "example",
    "difference",
    "similar",
    "energy",
    "reaction",
    "system",
    "theory",
    "law",
    "evidence",
    "change",
    "increase",
    "decrease",
    "produces",
    "requires",
    "allows",
    "helps"
  ];

  const scored = sentences.map(sentence => {

    const lower = sentence.toLowerCase();

    let score = 0;

    keywords.forEach(word => {
      if (lower.includes(word)) {
        score += 2;
      }
    });

    if (sentence.length >= 45) {
      score += 1;
    }

    if (sentence.length >= 180) {
      score -= 1;
    }

    if (/\d/.test(sentence)) {
      score += 1;
    }

    return {
      sentence,
      score
    };

  });

  scored.sort((a, b) => b.score - a.score);

  const maxIdeas = Math.min(6, scored.length);

  return scored
    .slice(0, maxIdeas)
    .map(item => shortenSentence(item.sentence));
}


function shortenSentence(sentence) {

  const words = sentence.split(/\s+/);

  if (words.length <= 25) {
    return sentence;
  }

  return words.slice(0, 25).join(" ") + "...";
}


/* =========================
   STUDY GUIDE
========================= */

function generateStudyGuide() {

  const rawNotes = notesInput.value.trim();

  if (rawNotes.length < 30) {
    showError(
      "Add a little more.",
      "Paste at least a few sentences of notes so StudySnap can find the important ideas."
    );
    return;
  }

  const ideas = findImportantIdeas(rawNotes);

  if (ideas.length === 0) {
    showError(
      "Couldn't find clear ideas.",
      "Try adding complete sentences to your notes."
    );
    return;
  }

  outputTitle.textContent = "Study Guide";
  outputSection.classList.remove("hidden");

  let html = `
    <div class="study-summary">
  `;

  ideas.forEach((idea, index) => {

    html += `
      <div class="summary-card">

        <div class="summary-number">
          KEY IDEA ${index + 1}
        </div>

        <p>${escapeHTML(idea)}</p>

      </div>
    `;

  });

  html += `
    </div>

    <div class="review-box">

      <strong>QUICK REVIEW</strong>

      <p>
        Read these ideas once, hide your notes, and try to explain each one from memory.
      </p>

    </div>
  `;

  output.innerHTML = html;

  saveStudySet("Study Guide");
  recordActivity();

  outputSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


/* =========================
   FLASHCARDS
========================= */

function generateFlashcards() {

  const rawNotes = notesInput.value.trim();

  if (rawNotes.length < 30) {
    showError(
      "Add some notes first.",
      "StudySnap needs material to make flashcards."
    );
    return;
  }

  const ideas = findImportantIdeas(rawNotes);

  if (!ideas.length) {
    showError(
      "Couldn't make flashcards.",
      "Try adding complete sentences to your notes."
    );
    return;
  }

  flashcards = ideas.map((idea, index) => ({
    question: makeQuestion(idea, index),
    answer: idea
  }));

  currentCard = 0;
  showingAnswer = false;

  openFlashcardModal();
}


/* =========================
   FLASHCARD QUESTION
========================= */

function makeQuestion(sentence, index) {

  const lower = sentence.toLowerCase();

  if (lower.includes(" is ")) {

    const parts = sentence.split(/\s+is\s+/i);

    if (parts.length === 2) {
      return `What is ${parts[0].replace(/^the\s+/i, "")}?`;
    }

  }

  if (lower.includes(" are ")) {

    const parts = sentence.split(/\s+are\s+/i);

    if (parts.length === 2) {
      return `What are ${parts[0].replace(/^the\s+/i, "")}?`;
    }

  }

  if (lower.includes("because")) {
    return "Why is this important?";
  }

  if (
    lower.includes("causes") ||
    lower.includes("caused") ||
    lower.includes("results")
  ) {
    return "What does this cause or result in?";
  }

  return `What is the main idea from key point ${index + 1}?`;
}


/* =========================
   FLASHCARD MODAL
========================= */

function openFlashcardModal() {

  document
    .getElementById("flashcardModal")
    .classList.remove("hidden");

  renderFlashcard();

  recordActivity();
}


function closeModal() {

  document
    .getElementById("flashcardModal")
    .classList.add("hidden");
}


function renderFlashcard() {

  if (!flashcards.length) {
    return;
  }

  const card = flashcards[currentCard];

  const content =
    document.getElementById("flashcardContent");

  document.getElementById("cardNumber").textContent =
    `${currentCard + 1} / ${flashcards.length}`;

  if (!showingAnswer) {

    content.innerHTML = `
      <div class="flashcard-main">

        <div class="label">QUESTION</div>

        <h2>
          ${escapeHTML(card.question)}
        </h2>

        <p>
          Think of the answer before revealing it.
        </p>

      </div>
    `;

    document.getElementById("nextCardBtn").textContent =
      "Reveal Answer";

  } else {

    content.innerHTML = `
      <div class="flashcard-main">

        <div class="label">ANSWER</div>

        <h2>
          ${escapeHTML(card.answer)}
        </h2>

      </div>
    `;

    if (currentCard === flashcards.length - 1) {
      document.getElementById("nextCardBtn").textContent =
        "Finish";
    } else {
      document.getElementById("nextCardBtn").textContent =
        "Next →";
    }

  }
}


function nextCard() {

  if (!showingAnswer) {

    showingAnswer = true;
    renderFlashcard();

    return;
  }

  if (currentCard < flashcards.length - 1) {

    currentCard++;
    showingAnswer = false;

    renderFlashcard();

  } else {

    closeModal();

    alert("Flashcards completed 🔥");

  }
}


/* =========================
   QUIZ
========================= */

function generateQuiz() {

  const rawNotes = notesInput.value.trim();

  if (rawNotes.length < 30) {
    showError(
      "Add some notes first.",
      "StudySnap needs material to create a quiz."
    );
    return;
  }

  const ideas = findImportantIdeas(rawNotes);

  if (!ideas.length) {
    showError(
      "Couldn't make a quiz.",
      "Try adding complete sentences to your notes."
    );
    return;
  }

  outputTitle.textContent = "Practice Quiz";
  outputSection.classList.remove("hidden");

  let html = `
    <div class="study-summary">
  `;

  ideas.slice(0, 5).forEach((idea, index) => {

    html += `
      <div class="summary-card">

        <div class="summary-number">
          QUESTION ${index + 1}
        </div>

        <p>
          Explain this idea in your own words:
        </p>

        <br>

        <p style="color:#777e87;">
          ${escapeHTML(idea)}
        </p>

      </div>
    `;

  });

  html += `
    </div>

    <div class="review-box">

      <strong>QUIZ TIP</strong>

      <p>
        Answer without looking at your notes. If you can't explain it, review that idea again.
      </p>

    </div>
  `;

  output.innerHTML = html;

  saveStudySet("Practice Quiz");
  recordActivity();

  outputSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


/* =========================
   SAVE STUDY SET
========================= */

function saveStudySet(type) {

  const notes = notesInput.value.trim();

  if (!notes) {
    return;
  }

  const name =
    setNameInput.value.trim() ||
    "Untitled Study Set";

  const studySet = {

    id: Date.now(),

    name: name,

    type: type,

    notes: notes,

    date: new Date().toLocaleDateString()

  };

  studySets.unshift(studySet);

  /*
    Keep the library from growing forever.
  */
  studySets = studySets.slice(0, 50);

  localStorage.setItem(
    "studysnap_sets",
    JSON.stringify(studySets)
  );
}


/* =========================
   STUDY SET LIBRARY
========================= */

function renderSets() {

  const container =
    document.getElementById("setsContainer");

  if (!studySets.length) {

    container.innerHTML = `
      <div class="empty">

        <div class="empty-icon">▣</div>

        <h3>No study sets yet.</h3>

        <p>Create your first one from the dashboard.</p>

      </div>
    `;

    return;
  }

  container.innerHTML = studySets.map(set => {

    return `
      <div class="set-card">

        <h3>
          ${escapeHTML(set.name)}
        </h3>

        <div class="set-meta">
          ${escapeHTML(set.type)}
          ·
          ${escapeHTML(set.date)}
        </div>

        <button onclick="openSet(${set.id})">
          Open Set →
        </button>

      </div>
    `;

  }).join("");
}


function openSet(id) {

  const set =
    studySets.find(item => item.id === id);

  if (!set) {
    return;
  }

  setNameInput.value = set.name;
  notesInput.value = set.notes;

  charCount.textContent =
    set.notes.length.toLocaleString();

  showPage("dashboard");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================
   PROGRESS
========================= */

function recordActivity() {

  activities++;

  localStorage.setItem(
    "studysnap_activities",
    activities
  );

  updateProgress();
}


function updateProgress() {

  document.getElementById("progressSets").textContent =
    studySets.length;

  document.getElementById("progressActivities").textContent =
    activities;

  document.getElementById("progressQuizzes").textContent =
    studySets.filter(
      set => set.type === "Practice Quiz"
    ).length;

  document.getElementById("streak").textContent =
    activities > 0 ? "1" : "0";
}


/* =========================
   COPY
========================= */

function copyResult() {

  const text = output.innerText.trim();

  if (!text) {
    return;
  }

  navigator.clipboard.writeText(text)
    .then(() => {

      const button =
        document.querySelector(".copy-btn");

      const oldText = button.textContent;

      button.textContent = "Copied ✓";

      setTimeout(() => {
        button.textContent = oldText;
      }, 1500);

    })
    .catch(() => {
      alert("Couldn't copy automatically.");
    });
}


/* =========================
   ERROR MESSAGE
========================= */

function showError(title, message) {

  outputTitle.textContent = "StudySnap";
  outputSection.classList.remove("hidden");

  output.innerHTML = `
    <div class="review-box">

      <strong>${escapeHTML(title)}</strong>

      <p>
        ${escapeHTML(message)}
      </p>

    </div>
  `;

  outputSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


/* =========================
   SECURITY
========================= */

function escapeHTML(text) {

  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================
   STARTUP
========================= */

updateProgress();
