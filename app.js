"use strict";

/* =========================
   STUDYSNAP APP
========================= */

let studySets = load("studysnap_sets", []);
let activities = Number(localStorage.getItem("studysnap_activities") || 0);
let bestScore = Number(localStorage.getItem("studysnap_best_score") || 0);

let flashcards = [];
let flashcardIndex = 0;
let showingAnswer = false;

let quizQuestions = [];
let quizIndex = 0;
let quizScore = 0;


/* =========================
   ELEMENTS
========================= */

const notes = document.getElementById("notes");
const setName = document.getElementById("setName");
const results = document.getElementById("results");
const resultContent = document.getElementById("resultContent");
const resultTitle = document.getElementById("resultTitle");


/* =========================
   SAFE STORAGE
========================= */

function load(key, fallback) {

  try {

    const value = localStorage.getItem(key);

    return value ? JSON.parse(value) : fallback;

  } catch {

    return fallback;

  }

}


function save(key, value) {

  localStorage.setItem(
    key,
    JSON.stringify(value)
  );

}


/* =========================
   NAVIGATION
========================= */

document.querySelectorAll(".nav-item").forEach(button => {

  button.addEventListener("click", () => {

    const page = button.dataset.page;

    document.querySelectorAll(".nav-item")
      .forEach(item => item.classList.remove("active"));

    button.classList.add("active");

    document.querySelectorAll(".page")
      .forEach(item => item.classList.remove("active"));

    document.getElementById(page)
      .classList.add("active");

    if (page === "sets") {
      renderSets();
    }

    if (page === "progress") {
      updateStats();
    }

  });

});


/* =========================
   PROFILE
========================= */

const profileButton =
  document.getElementById("profileButton");

const profileMenu =
  document.getElementById("profileMenu");

profileButton.addEventListener("click", event => {

  event.stopPropagation();

  profileMenu.classList.toggle("hidden");

});


document.addEventListener("click", event => {

  if (!event.target.closest(".profile-wrap")) {
    profileMenu.classList.add("hidden");
  }

});


document
  .getElementById("profileProgress")
  .addEventListener("click", () => {

    profileMenu.classList.add("hidden");

    document
      .querySelector('[data-page="progress"]')
      .click();

  });


/* =========================
   CHARACTER COUNTER
========================= */

notes.addEventListener("input", () => {

  document.getElementById("charCount")
    .textContent = notes.value.length.toLocaleString();

});


/* =========================
   TOOL BUTTONS
========================= */

document
  .getElementById("generateButton")
  .addEventListener("click", generateStudyGuide);


document.querySelectorAll(".tool").forEach(button => {

  button.addEventListener("click", () => {

    const tool = button.dataset.tool;

    if (tool === "guide") {
      generateStudyGuide();
    }

    if (tool === "flashcards") {
      generateFlashcards();
    }

    if (tool === "quiz") {
      generateQuiz();
    }

  });

});


/* =========================
   TEXT ANALYSIS
========================= */

function getSentences(text) {

  return text
    .replace(/\r/g, " ")
    .replace(/\n+/g, ". ")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map(x => x.trim())
    .filter(x => x.length >= 20);

}


function cleanSentence(sentence) {

  return sentence
    .replace(/^[-•*]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

}


/* =========================
   SMART IMPORTANCE SCORING
========================= */

function scoreSentence(sentence) {

  const text = sentence.toLowerCase();

  let score = 0;

  const importantWords = [
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
    "refers to",
    "known as",
    "purpose",
    "function",
    "main",
    "key",
    "include",
    "includes",
    "example",
    "difference",
    "similar",
    "requires",
    "produces",
    "allows",
    "leads to",
    "consists",
    "occurs",
    "energy",
    "reaction",
    "system",
    "theory",
    "law",
    "evidence"
  ];

  importantWords.forEach(word => {

    if (text.includes(word)) {
      score += 3;
    }

  });

  /* Definitions */

  if (
    /\bis\b/i.test(sentence) ||
    /\bare\b/i.test(sentence)
  ) {
    score += 2;
  }

  /* Numbers / dates */

  if (/\d/.test(sentence)) {
    score += 2;
  }

  /* Longer complete explanations */

  if (sentence.length >= 50) {
    score += 1;
  }

  /* Very long sentences are often less useful */

  if (sentence.length > 230) {
    score -= 2;
  }

  return score;

}


function getImportantIdeas(text) {

  const sentences =
    getSentences(text)
      .map(cleanSentence);

  if (!sentences.length) {
    return [];
  }

  const scored =
    sentences.map(sentence => ({
      sentence,
      score: scoreSentence(sentence)
    }));

  scored.sort((a,b) => b.score - a.score);

  /*
    Don't dump everything.
    Maximum 6 actual ideas.
  */

  const limit =
    sentences.length <= 4
      ? sentences.length
      : 6;

  return scored
    .slice(0, limit)
    .map(item => shorten(item.sentence));

}


function shorten(sentence) {

  const words = sentence.split(" ");

  if (words.length <= 28) {
    return sentence;
  }

  return words
    .slice(0, 28)
    .join(" ") + "...";

}


/* =========================
   VOCABULARY DETECTION
========================= */

function findDefinitions(text) {

  const sentences = getSentences(text);

  const definitions = [];

  sentences.forEach(sentence => {

    const match =
      sentence.match(
        /^(.{2,60}?)\s+(?:is|are|means|refers to|is defined as)\s+(.{5,180})$/i
      );

    if (match) {

      definitions.push({
        term: match[1].trim(),
        definition: match[2].trim()
      });

    }

  });

  return definitions.slice(0, 6);

}


/* =========================
   STUDY GUIDE
========================= */

function generateStudyGuide() {

  const text = notes.value.trim();

  if (text.length < 30) {

    showMessage(
      "Add more notes",
      "Paste a few complete sentences so StudySnap can analyze them."
    );

    return;

  }

  const ideas = getImportantIdeas(text);
  const definitions = findDefinitions(text);

  resultTitle.textContent = "Study Guide";

  let html = `
    <div class="summary-list">

      <div class="summary-card">

        <div class="number">QUICK SUMMARY</div>

        <p>
          ${escapeHTML(makeOverview(ideas))}
        </p>

      </div>
  `;


  ideas.forEach((idea, index) => {

    html += `
      <div class="summary-card">

        <div class="number">
          KEY IDEA ${index + 1}
        </div>

        <p>
          ${escapeHTML(idea)}
        </p>

      </div>
    `;

  });


  if (definitions.length) {

    html += `
      <div class="summary-card">

        <div class="number">
          VOCABULARY
        </div>
    `;

    definitions.forEach(item => {

      html += `
        <p style="margin-bottom:10px;">
          <strong>${escapeHTML(item.term)}</strong>
          — ${escapeHTML(item.definition)}
        </p>
      `;

    });

    html += `</div>`;

  }


  html += `
    </div>

    <div class="review">

      <strong>LOCK-IN TIP</strong>

      <p>
        Read the key ideas, hide your notes, and explain each one without looking.
      </p>

    </div>
  `;

  showResults(html);

  saveCurrentSet("Study Guide");

  recordActivity();

}


/* =========================
   OVERVIEW
========================= */

function makeOverview(ideas) {

  if (!ideas.length) {
    return "Your notes contain useful information to review.";
  }

  return ideas
    .slice(0, 2)
    .join(" ");

}


/* =========================
   FLASHCARDS
========================= */

function generateFlashcards() {

  const text = notes.value.trim();

  if (text.length < 30) {

    showMessage(
      "Add more notes",
      "Paste some material before creating flashcards."
    );

    return;

  }

  const ideas = getImportantIdeas(text);

  flashcards = ideas.map((idea, index) => {

    const definition =
      findDefinitions(text)
        .find(item =>
          idea.toLowerCase()
            .includes(item.term.toLowerCase())
        );

    if (definition) {

      return {
        question: `What is ${definition.term}?`,
        answer: definition.definition
      };

    }

    return {
      question: `What is the main idea of point ${index + 1}?`,
      answer: idea
    };

  });

  if (!flashcards.length) {

    showMessage(
      "Couldn't create cards",
      "Try adding clearer notes with complete sentences."
    );

    return;

  }

  flashcardIndex = 0;
  showingAnswer = false;

  document
    .getElementById("flashcardModal")
    .classList.remove("hidden");

  renderFlashcard();

  recordActivity();

}


/* =========================
   FLASHCARD RENDER
========================= */

function renderFlashcard() {

  const card =
    flashcards[flashcardIndex];

  const content =
    document.getElementById("flashcardContent");

  document
    .getElementById("flashcardNumber")
    .textContent =
    `${flashcardIndex + 1} / ${flashcards.length}`;


  if (!showingAnswer) {

    content.innerHTML = `
      <div class="flashcard-body">

        <div>

          <div class="eyebrow">
            QUESTION
          </div>

          <h2>
            ${escapeHTML(card.question)}
          </h2>

          <p>
            Think of the answer before revealing it.
          </p>

        </div>

      </div>
    `;

    document
      .getElementById("flashcardAction")
      .textContent = "Reveal Answer";

  } else {

    content.innerHTML = `
      <div class="flashcard-body">

        <div>

          <div class="eyebrow">
            ANSWER
          </div>

          <h2>
            ${escapeHTML(card.answer)}
          </h2>

        </div>

      </div>
    `;

    document
      .getElementById("flashcardAction")
      .textContent =
      flashcardIndex === flashcards.length - 1
        ? "Finish"
        : "Next →";

  }

}


/* =========================
   FLASHCARD BUTTON
========================= */

document
  .getElementById("flashcardAction")
  .addEventListener("click", () => {

    if (!showingAnswer) {

      showingAnswer = true;
      renderFlashcard();

      return;

    }

    if (flashcardIndex < flashcards.length - 1) {

      flashcardIndex++;
      showingAnswer = false;

      renderFlashcard();

    } else {

      document
        .getElementById("flashcardModal")
        .classList.add("hidden");

    }

  });


document
  .getElementById("closeFlashcards")
  .addEventListener("click", () => {

    document
      .getElementById("flashcardModal")
      .classList.add("hidden");

  });


/* =========================
   QUIZ GENERATION
========================= */

function generateQuiz() {

  const text = notes.value.trim();

  if (text.length < 30) {

    showMessage(
      "Add more notes",
      "Paste some material before creating a quiz."
    );

    return;

  }

  const ideas = getImportantIdeas(text);

  if (ideas.length < 2) {

    showMessage(
      "Need more information",
      "Add a few more complete sentences for a better quiz."
    );

    return;

  }

  quizQuestions =
    ideas.slice(0, 5).map((idea, index) => {

      const wrongAnswers =
        ideas
          .filter((_, i) => i !== index)
          .slice(0, 3);

      const choices =
        shuffle([
          idea,
          ...wrongAnswers
        ]);

      return {
        question:
          `Which statement best matches key concept ${index + 1}?`,
        correct: idea,
        choices
      };

    });

  quizIndex = 0;
  quizScore = 0;

  renderQuiz();

}


/* =========================
   QUIZ RENDER
========================= */

function renderQuiz() {

  resultTitle.textContent = "Practice Quiz";

  results.classList.remove("hidden");

  const question =
    quizQuestions[quizIndex];

  let html = `
    <div class="quiz-card">

      <div class="quiz-label">
        QUESTION ${quizIndex + 1} / ${quizQuestions.length}
      </div>

      <div class="quiz-question">
        ${escapeHTML(question.question)}
      </div>
  `;


  question.choices.forEach(choice => {

    html += `
      <button
        class="answer-btn"
        data-answer="${encodeURIComponent(choice)}"
      >
        ${escapeHTML(choice)}
      </button>
    `;

  });


  html += `</div>`;

  resultContent.innerHTML = html;


  document
    .querySelectorAll(".answer-btn")
    .forEach(button => {

      button.addEventListener("click", () => {

        const answer =
          decodeURIComponent(
            button.dataset.answer
          );

        checkAnswer(answer);

      });

    });


  results.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


/* =========================
   QUIZ CHECK
========================= */

function checkAnswer(answer) {

  const question =
    quizQuestions[quizIndex];

  const buttons =
    document.querySelectorAll(".answer-btn");

  buttons.forEach(button => {

    button.disabled = true;

    const buttonAnswer =
      decodeURIComponent(
        button.dataset.answer
      );

    if (buttonAnswer === question.correct) {
      button.classList.add("correct");
    }

    if (
      buttonAnswer === answer &&
      answer !== question.correct
    ) {
      button.classList.add("wrong");
    }

  });


  if (answer === question.correct) {
    quizScore++;
  }


  setTimeout(() => {

    quizIndex++;

    if (quizIndex < quizQuestions.length) {

      renderQuiz();

    } else {

      finishQuiz();

    }

  }, 800);

}


/* =========================
   QUIZ RESULTS
========================= */

function finishQuiz() {

  const percent =
    Math.round(
      (quizScore / quizQuestions.length) * 100
    );

  if (percent > bestScore) {

    bestScore = percent;

    localStorage.setItem(
      "studysnap_best_score",
      bestScore
    );

  }

  resultTitle.textContent = "Quiz Complete";

  resultContent.innerHTML = `

    <div class="quiz-score">

      <div class="eyebrow">
        FINAL SCORE
      </div>

      <strong>
        ${percent}%
      </strong>

      <p>
        You got ${quizScore} out of
        ${quizQuestions.length} correct.
      </p>

      <br>

      <button
        class="primary"
        id="retryQuiz"
      >
        Try Again
      </button>

    </div>

  `;

  document
    .getElementById("retryQuiz")
    .addEventListener("click", () => {

      quizIndex = 0;
      quizScore = 0;

      renderQuiz();

    });

  saveCurrentSet("Practice Quiz");

  recordActivity();

}


/* =========================
   RESULTS
========================= */

function showResults(html) {

  resultContent.innerHTML = html;

  results.classList.remove("hidden");

  results.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


function showMessage(title, message) {

  resultTitle.textContent = "StudySnap";

  showResults(`
    <div class="review">

      <strong>
        ${escapeHTML(title)}
      </strong>

      <p>
        ${escapeHTML(message)}
      </p>

    </div>
  `);

}


/* =========================
   SAVE SET
========================= */

function saveCurrentSet(type) {

  const text = notes.value.trim();

  if (!text) {
    return;
  }

  const name =
    setName.value.trim() ||
    "Untitled Study Set";

  studySets.unshift({

    id: Date.now(),

    name,

    type,

    notes: text,

    date: new Date().toLocaleDateString()

  });

  studySets =
    studySets.slice(0, 50);

  save(
    "studysnap_sets",
    studySets
  );

}


/* =========================
   SET LIBRARY
========================= */

function renderSets() {

  const container =
    document.getElementById("setsContainer");

  if (!studySets.length) {

    container.innerHTML = `
      <div class="empty">

        <h3>No study sets yet.</h3>

        <p>Create one from the dashboard.</p>

      </div>
    `;

    return;

  }

  container.innerHTML =
    studySets.map(set => `

      <div class="set-card">

        <h3>
          ${escapeHTML(set.name)}
        </h3>

        <small>
          ${escapeHTML(set.type)}
          ·
          ${escapeHTML(set.date)}
        </small>

        <br>

        <button
          data-open-set="${set.id}"
        >
          Open Set →
        </button>

      </div>

    `).join("");


  document
    .querySelectorAll("[data-open-set]")
    .forEach(button => {

      button.addEventListener("click", () => {

        openSet(
          Number(button.dataset.openSet)
        );

      });

    });

}


/* =========================
   OPEN SET
========================= */

function openSet(id) {

  const set =
    studySets.find(item => item.id === id);

  if (!set) {
    return;
  }

  notes.value = set.notes;
  setName.value = set.name;

  document.getElementById("charCount")
    .textContent =
    set.notes.length.toLocaleString();

  document
    .querySelector('[data-page="dashboard"]')
    .click();

}


/* =========================
   ACTIVITY
========================= */

function recordActivity() {

  activities++;

  localStorage.setItem(
    "studysnap_activities",
    activities
  );

  updateStats();

}


/* =========================
   STATS
========================= */

function updateStats() {

  document.getElementById("setsStat")
    .textContent = studySets.length;

  document.getElementById("activityStat")
    .textContent = activities;

  document.getElementById("scoreStat")
    .textContent =
    bestScore ? `${bestScore}%` : "—";

  document.getElementById("profileSets")
    .textContent = studySets.length;

  document.getElementById("profileActivities")
    .textContent = activities;

  document.getElementById("streak")
    .textContent =
    activities > 0 ? "1" : "0";

}


/* =========================
   COPY
========================= */

document
  .getElementById("copyButton")
  .addEventListener("click", async () => {

    const text =
      resultContent.innerText.trim();

    if (!text) {
      return;
    }

    try {

      await navigator.clipboard.writeText(text);

      const button =
        document.getElementById("copyButton");

      button.textContent = "Copied ✓";

      setTimeout(() => {
        button.textContent = "Copy";
      }, 1500);

    } catch {

      alert("Copy failed.");

    }

  });


/* =========================
   SHUFFLE
========================= */

function shuffle(array) {

  const result = [...array];

  for (
    let i = result.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(Math.random() * (i + 1));

    [
      result[i],
      result[j]
    ] =
    [
      result[j],
      result[i]
    ];

  }

  return result;

}


/* =========================
   ESCAPE HTML
========================= */

function escapeHTML(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


/* =========================
   START
========================= */

updateStats();
renderSets();
