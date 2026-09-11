document.addEventListener("DOMContentLoaded", () => {
  let studySets = JSON.parse(localStorage.getItem("studysnap_sets") || "[]");
  let activities = JSON.parse(localStorage.getItem("studysnap_activities") || "[]");
  let bestScore = Number(localStorage.getItem("studysnap_best") || 0);

  let currentTool = "guide";
  let currentQuiz = [];
  let quizIndex = 0;
  let quizScore = 0;
  let currentFlashcards = [];
  let flashcardIndex = 0;
  let answerRevealed = false;

  const notes = document.getElementById("notes");
  const setName = document.getElementById("setName");
  const charCount = document.getElementById("charCount");
  const generateButton = document.getElementById("generateButton");
  const results = document.getElementById("results");
  const resultTitle = document.getElementById("resultTitle");
  const resultContent = document.getElementById("resultContent");
  const copyResult = document.getElementById("copyResult");

  /* ---------------- NAVIGATION ---------------- */

  document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
      const page = button.dataset.page;

      document.querySelectorAll(".nav-item").forEach(b => {
        b.classList.remove("active");
      });

      button.classList.add("active");

      document.querySelectorAll(".page").forEach(p => {
        p.classList.remove("active");
      });

      const target = document.getElementById(page);

      if (target) {
        target.classList.add("active");
      }

      if (page === "sets") {
        renderSets();
      }

      if (page === "progress") {
        updateStats();
      }
    });
  });

  /* ---------------- PROFILE ---------------- */

  const profileButton = document.getElementById("profileButton");
  const profileMenu = document.getElementById("profileMenu");

  if (profileButton && profileMenu) {
    profileButton.addEventListener("click", e => {
      e.stopPropagation();
      profileMenu.classList.toggle("show");
    });

    document.addEventListener("click", () => {
      profileMenu.classList.remove("show");
    });
  }

  /* ---------------- CHARACTER COUNT ---------------- */

  if (notes) {
    notes.addEventListener("input", () => {
      if (charCount) {
        charCount.textContent = `${notes.value.length} characters`;
      }
    });
  }

  /* ---------------- TOOL BUTTONS ---------------- */

  document.querySelectorAll(".tool-button").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tool-button").forEach(b => {
        b.classList.remove("active");
      });

      button.classList.add("active");
      currentTool = button.dataset.tool || "guide";
    });
  });

  /* ---------------- TEXT PROCESSING ---------------- */

  function getSentences(text) {
    return text
      .replace(/\n+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 25);
  }

  function cleanSentence(sentence) {
    return sentence
      .replace(/\s+/g, " ")
      .replace(/^[•\-–—]\s*/, "")
      .trim();
  }

  function shorten(text, max = 180) {
    if (text.length <= max) return text;

    const shortened = text.slice(0, max);
    const lastSpace = shortened.lastIndexOf(" ");

    return shortened.slice(0, lastSpace) + "...";
  }

  function scoreSentence(sentence) {
    const keywords = [
      "is",
      "are",
      "means",
      "because",
      "important",
      "main",
      "purpose",
      "process",
      "energy",
      "cause",
      "effect",
      "includes",
      "produces",
      "requires",
      "used",
      "called",
      "defined",
      "example",
      "result",
      "function"
    ];

    let score = 0;
    const lower = sentence.toLowerCase();

    keywords.forEach(word => {
      if (lower.includes(word)) score++;
    });

    if (sentence.length > 50) score++;
    if (sentence.length > 90) score++;

    return score;
  }

  function getImportantIdeas(text) {
    const sentences = getSentences(text)
      .map(cleanSentence)
      .filter(Boolean);

    return [...sentences]
      .sort((a, b) => scoreSentence(b) - scoreSentence(a))
      .slice(0, 8);
  }

  function findDefinitions(text) {
    const sentences = getSentences(text);
    const definitions = [];

    sentences.forEach(sentence => {
      const match = sentence.match(
        /^(.{2,45}?)\s+(?:is|are|means|refers to)\s+(.{10,180})[.!?]?$/i
      );

      if (match) {
        definitions.push({
          term: match[1].trim(),
          definition: match[2].trim()
        });
      }
    });

    return definitions.slice(0, 8);
  }

  /* ---------------- STUDY GUIDE ---------------- */

  function generateStudyGuide(text) {
    const ideas = getImportantIdeas(text);
    const definitions = findDefinitions(text);

    if (!ideas.length) {
      return `
        <div class="empty-result">
          <h3>Add a little more</h3>
          <p>Paste at least a few sentences of notes so StudySnap can create your study guide.</p>
        </div>
      `;
    }

    let html = `
      <div class="study-guide">
        <h3>QUICK SUMMARY</h3>
        <p>${escapeHTML(
          shorten(ideas.slice(0, 2).join(" "))
        )}</p>

        <h3>KEY IDEAS</h3>
    `;

    ideas.forEach((idea, index) => {
      html += `
        <div class="idea">
          <strong>${index + 1}. ${escapeHTML(
            shorten(idea, 220)
          )}</strong>
        </div>
      `;
    });

    if (definitions.length) {
      html += `<h3>VOCABULARY</h3>`;

      definitions.forEach(item => {
        html += `
          <div class="vocab-item">
            <strong>${escapeHTML(item.term)}</strong>
            <p>${escapeHTML(item.definition)}</p>
          </div>
        `;
      });
    }

    html += `
        <h3>LOCK-IN TIP</h3>
        <p>Know the key ideas first, then test yourself without looking at your notes.</p>
      </div>
    `;

    return html;
  }

  /* ---------------- FLASHCARDS ---------------- */

  function buildFlashcards(text) {
    const ideas = getImportantIdeas(text);
    const definitions = findDefinitions(text);
    const cards = [];

    definitions.forEach(item => {
      cards.push({
        question: `What is ${item.term}?`,
        answer: item.definition
      });
    });

    ideas.forEach(idea => {
      if (cards.length >= 8) return;

      cards.push({
        question: `What is the important idea in this statement?`,
        answer: idea
      });
    });

    return cards.slice(0, 8);
  }

  function openFlashcards(cards) {
    currentFlashcards = cards;
    flashcardIndex = 0;
    answerRevealed = false;

    const modal = document.getElementById("flashcardModal");

    if (modal) {
      modal.classList.add("show");
    }

    renderFlashcard();
  }

  function renderFlashcard() {
    const content = document.getElementById("flashcardContent");
    const number = document.getElementById("flashcardNumber");
    const action = document.getElementById("flashcardAction");

    if (!content || !currentFlashcards.length) return;

    const card = currentFlashcards[flashcardIndex];

    if (number) {
      number.textContent =
        `Card ${flashcardIndex + 1} of ${currentFlashcards.length}`;
    }

    if (action) {
      action.textContent = answerRevealed
        ? flashcardIndex === currentFlashcards.length - 1
          ? "Finish"
          : "Next"
        : "Reveal Answer";
    }

    content.innerHTML = `
      <div class="flashcard-question">
        <h2>${escapeHTML(card.question)}</h2>

        ${
          answerRevealed
            ? `<div class="flashcard-answer">
                <span>Answer</span>
                <p>${escapeHTML(card.answer)}</p>
              </div>`
            : `<p class="flashcard-hidden">Think of the answer before revealing it.</p>`
        }
      </div>
    `;
  }

  const flashcardAction = document.getElementById("flashcardAction");

  if (flashcardAction) {
    flashcardAction.addEventListener("click", () => {
      if (!answerRevealed) {
        answerRevealed = true;
        renderFlashcard();
        return;
      }

      if (flashcardIndex < currentFlashcards.length - 1) {
        flashcardIndex++;
        answerRevealed = false;
        renderFlashcard();
      } else {
        closeFlashcards();
      }
    });
  }

  function closeFlashcards() {
    const modal = document.getElementById("flashcardModal");

    if (modal) {
      modal.classList.remove("show");
    }
  }

  const closeFlashcardsButton =
    document.getElementById("closeFlashcards");

  if (closeFlashcardsButton) {
    closeFlashcardsButton.addEventListener("click", closeFlashcards);
  }

  /* ==================================================
     IMPROVED QUIZ GENERATOR
     ================================================== */

  function buildQuiz(text) {
    const ideas = getImportantIdeas(text);
    const definitions = findDefinitions(text);

    if (ideas.length < 2) {
      return [];
    }

    const questions = [];

    /*
      QUESTION TYPE 1
      Definition question
    */

    definitions.forEach(def => {
      if (questions.length >= 5) return;

      const wrongAnswers = definitions
        .filter(d => d.term.toLowerCase() !== def.term.toLowerCase())
        .map(d => d.definition);

      if (wrongAnswers.length >= 2) {
        questions.push({
          question: `What is ${def.term}?`,
          correct: def.definition,
          choices: createChoices(
            def.definition,
            wrongAnswers
          )
        });
      }
    });

    /*
      QUESTION TYPE 2
      "Which statement is true?"
    */

    ideas.forEach((idea, index) => {
      if (questions.length >= 5) return;

      const wrongAnswers = ideas
        .filter((_, i) => i !== index)
        .map(x => shorten(x, 150));

      if (wrongAnswers.length >= 2) {
        questions.push({
          question: "Which statement is supported by the notes?",
          correct: shorten(idea, 150),
          choices: createChoices(
            shorten(idea, 150),
            wrongAnswers
          )
        });
      }
    });

    /*
      QUESTION TYPE 3
      Main purpose
    */

    if (ideas.length >= 3 && questions.length < 5) {
      const mainIdea = ideas[0];

      questions.push({
        question: "Which choice best describes a main idea from these notes?",
        correct: shorten(mainIdea, 150),
        choices: createChoices(
          shorten(mainIdea, 150),
          ideas.slice(1).map(x => shorten(x, 150))
        )
      });
    }

    /*
      QUESTION TYPE 4
      What happens / result question
    */

    if (ideas.length >= 3 && questions.length < 5) {
      const resultIdea =
        ideas.find(i =>
          /produces|causes|results|happens|creates|leads|allows|requires/i.test(i)
        ) || ideas[1];

      const wrongAnswers = ideas
        .filter(i => i !== resultIdea)
        .map(x => shorten(x, 150));

      questions.push({
        question: "Which choice best describes a result, effect, or outcome mentioned in the notes?",
        correct: shorten(resultIdea, 150),
        choices: createChoices(
          shorten(resultIdea, 150),
          wrongAnswers
        )
      });
    }

    /*
      QUESTION TYPE 5
      Why / purpose
    */

    if (ideas.length >= 3 && questions.length < 5) {
      const purposeIdea =
        ideas.find(i =>
          /purpose|important|used to|function|allows/i.test(i)
        ) || ideas[0];

      const wrongAnswers = ideas
        .filter(i => i !== purposeIdea)
        .map(x => shorten(x, 150));

      questions.push({
        question: "Which choice best explains the purpose or importance described in the notes?",
        correct: shorten(purposeIdea, 150),
        choices: createChoices(
          shorten(purposeIdea, 150),
          wrongAnswers
        )
      });
    }

    return removeDuplicateQuestions(
      shuffle(questions)
    ).slice(0, 5);
  }

  function createChoices(correct, wrongAnswers) {
    const uniqueWrong = [...new Set(
      wrongAnswers.filter(
        answer =>
          answer &&
          answer.trim().toLowerCase() !==
            correct.trim().toLowerCase()
      )
    )];

    const selectedWrong = shuffle(uniqueWrong).slice(0, 3);

    return shuffle([
      correct,
      ...selectedWrong
    ]);
  }

  function removeDuplicateQuestions(questions) {
    const seen = new Set();

    return questions.filter(q => {
      const key = q.question.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  function renderQuiz() {
    if (!results || !resultTitle || !resultContent) return;

    resultTitle.textContent = "Practice Quiz";

    if (!currentQuiz.length) {
      resultContent.innerHTML = `
        <div class="empty-result">
          <h3>Not enough information</h3>
          <p>Add more notes so StudySnap can create better questions.</p>
        </div>
      `;
      return;
    }

    if (quizIndex >= currentQuiz.length) {
      const percentage = Math.round(
        (quizScore / currentQuiz.length) * 100
      );

      if (percentage > bestScore) {
        bestScore = percentage;
        localStorage.setItem(
          "studysnap_best",
          bestScore
        );
      }

      activities.push({
        type: "quiz",
        score: percentage,
        date: new Date().toLocaleDateString()
      });

      localStorage.setItem(
        "studysnap_activities",
        JSON.stringify(activities)
      );

      resultContent.innerHTML = `
        <div class="quiz-score">
          <h2>${percentage}%</h2>
          <p>You got ${quizScore} out of ${currentQuiz.length} correct.</p>

          <button class="primary-button" id="retryQuiz">
            Try Again
          </button>
        </div>
      `;

      document
        .getElementById("retryQuiz")
        ?.addEventListener("click", () => {
          quizIndex = 0;
          quizScore = 0;
          currentQuiz = shuffle(currentQuiz);
          renderQuiz();
        });

      updateStats();
      return;
    }

    const q = currentQuiz[quizIndex];

    resultContent.innerHTML = `
      <div class="quiz-card">

        <div class="quiz-progress">
          Question ${quizIndex + 1} of ${currentQuiz.length}
        </div>

        <h2>${escapeHTML(q.question)}</h2>

        <div class="quiz-choices">
          ${q.choices
            .map(
              (choice, index) => `
                <button
                  class="answer-btn"
                  data-choice="${index}"
                >
                  ${escapeHTML(choice)}
                </button>
              `
            )
            .join("")}
        </div>

        <div id="quizFeedback"></div>

      </div>
    `;

    document
      .querySelectorAll(".answer-btn")
      .forEach(button => {
        button.addEventListener("click", () => {
          handleAnswer(button, q);
        });
      });
  }

  function handleAnswer(button, question) {
    const buttons =
      document.querySelectorAll(".answer-btn");

    buttons.forEach(btn => {
      btn.disabled = true;
    });

    const selected = button.textContent.trim();
    const correct = question.correct.trim();

    const feedback =
      document.getElementById("quizFeedback");

    if (selected === correct) {
      button.classList.add("correct");
      quizScore++;

      if (feedback) {
        feedback.innerHTML = `
          <div class="quiz-feedback correct-text">
            ✓ Correct!
          </div>
          <button class="primary-button" id="nextQuestion">
            ${
              quizIndex === currentQuiz.length - 1
                ? "See Results"
                : "Next Question"
            }
          </button>
        `;
      }
    } else {
      button.classList.add("wrong");

      buttons.forEach(btn => {
        if (btn.textContent.trim() === correct) {
          btn.classList.add("correct");
        }
      });

      if (feedback) {
        feedback.innerHTML = `
          <div class="quiz-feedback wrong-text">
            ✕ Not quite.
            <br>
            <strong>Correct answer:</strong>
            ${escapeHTML(correct)}
          </div>

          <button class="primary-button" id="nextQuestion">
            ${
              quizIndex === currentQuiz.length - 1
                ? "See Results"
                : "Next Question"
            }
          </button>
        `;
      }
    }

    document
      .getElementById("nextQuestion")
      ?.addEventListener("click", () => {
        quizIndex++;
        renderQuiz();
      });
  }

  /* ---------------- GENERATE BUTTON ---------------- */

  if (generateButton) {
    generateButton.addEventListener("click", () => {
      const text = notes?.value.trim();

      if (!text || text.length < 30) {
        resultTitle.textContent = "StudySnap";
        resultContent.innerHTML = `
          <div class="empty-result">
            <h3>Add more notes</h3>
            <p>Paste a few sentences first.</p>
          </div>
        `;
        return;
      }

      const name =
        setName?.value.trim() || "Untitled Study Set";

      /*
        SAVE STUDY SET
      */

      const newSet = {
        id: Date.now(),
        name,
        notes: text,
        date: new Date().toLocaleDateString()
      };

      studySets.unshift(newSet);

      localStorage.setItem(
        "studysnap_sets",
        JSON.stringify(studySets)
      );

      /*
        SELECT TOOL
      */

      if (currentTool === "guide") {
        resultTitle.textContent = "Study Guide";
        resultContent.innerHTML =
          generateStudyGuide(text);
      }

      if (currentTool === "flashcards") {
        const cards = buildFlashcards(text);

        if (!cards.length) {
          resultTitle.textContent = "Flashcards";
          resultContent.innerHTML = `
            <div class="empty-result">
              <h3>Not enough information</h3>
              <p>Add more detailed notes to create flashcards.</p>
            </div>
          `;
        } else {
          openFlashcards(cards);
        }
      }

      if (currentTool === "quiz") {
        currentQuiz = buildQuiz(text);
        quizIndex = 0;
        quizScore = 0;

        renderQuiz();
      }

      updateStats();
      renderSets();
    });
  }

  /* ---------------- SAVED SETS ---------------- */

  function renderSets() {
    const container =
      document.getElementById("setsContainer");

    if (!container) return;

    if (!studySets.length) {
      container.innerHTML = `
        <div class="empty-result">
          <h3>No study sets yet</h3>
          <p>Create your first study set from the dashboard.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = studySets
      .map(
        set => `
          <div class="set-card">
            <h3>${escapeHTML(set.name)}</h3>
            <p>${escapeHTML(
              shorten(set.notes, 120)
            )}</p>

            <small>${escapeHTML(set.date)}</small>

            <button
              class="secondary-button open-set"
              data-id="${set.id}"
            >
              Open
            </button>
          </div>
        `
      )
      .join("");

    document
      .querySelectorAll(".open-set")
      .forEach(button => {
        button.addEventListener("click", () => {
          const id = Number(button.dataset.id);

          const set = studySets.find(
            s => s.id === id
          );

          if (!set) return;

          if (setName) {
            setName.value = set.name;
          }

          if (notes) {
            notes.value = set.notes;

            if (charCount) {
              charCount.textContent =
                `${set.notes.length} characters`;
            }
          }

          document
            .querySelector('[data-page="dashboard"]')
            ?.click();

          window.scrollTo({
            top: 0,
            behavior: "smooth"
          });
        });
      });
  }

  /* ---------------- STATS ---------------- */

  function updateStats() {
    const setsStat =
      document.getElementById("setsStat");

    const activityStat =
      document.getElementById("activityStat");

    const scoreStat =
      document.getElementById("scoreStat");

    if (setsStat) {
      setsStat.textContent = studySets.length;
    }

    if (activityStat) {
      activityStat.textContent = activities.length;
    }

    if (scoreStat) {
      scoreStat.textContent =
        bestScore > 0 ? `${bestScore}%` : "—";
    }
  }

  /* ---------------- COPY ---------------- */

  if (copyResult) {
    copyResult.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(
          resultContent.innerText
        );

        copyResult.textContent = "Copied!";

        setTimeout(() => {
          copyResult.textContent = "Copy";
        }, 1200);
      } catch {
        copyResult.textContent = "Copy failed";
      }
    });
  }

  /* ---------------- HELPERS ---------------- */

  function shuffle(array) {
    const arr = [...array];

    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr;
  }

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* ---------------- STARTUP ---------------- */

  updateStats();
  renderSets();
});
