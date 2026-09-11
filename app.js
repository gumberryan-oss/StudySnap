document.addEventListener("DOMContentLoaded", () => {

  const notesBox = document.getElementById("notes");
  const output = document.getElementById("output");

  if (!notesBox || !output) {
    console.error("StudySnap: notes or output element was not found.");
    return;
  }

  function getNotes() {
    return notesBox.value
      .split(/\n+/)
      .map(note => note.trim())
      .filter(note => note.length > 0);
  }

  window.generateStudyGuide = function () {

    const notes = getNotes();

    if (notes.length === 0) {
      output.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">😭</div>
          <h3>Paste your notes first</h3>
          <p>Give StudySnap something to work with.</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="result-title">
        📚 Study Guide
      </div>

      <div class="result-section">
        <h3>Key Ideas</h3>
        <ul>
    `;

    notes.forEach(note => {
      html += `<li>${escapeHTML(note)}</li>`;
    });

    html += `
        </ul>
      </div>

      <div class="result-section">
        <h3>⚡ Quick Review</h3>
        <p>
          Cover your notes and explain each idea from memory.
          If you can't explain it, review that section again.
        </p>
      </div>

      <div class="result-section">
        <h3>⭐ Active Recall Challenge</h3>
        <p>
          Without looking at your notes, explain the most important
          concept in 30 seconds.
        </p>
      </div>
    `;

    output.innerHTML = html;
  };


  window.generateQuiz = function () {

    const notes = getNotes();

    if (notes.length === 0) {
      output.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">😭</div>
          <h3>Paste your notes first</h3>
          <p>Then we'll turn them into practice questions.</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="result-title">
        🧠 Practice Quiz
      </div>
    `;

    notes.slice(0, 10).forEach((note, index) => {

      html += `
        <div class="quiz-question">

          <strong>
            ${index + 1}. Explain this concept in your own words:
          </strong>

          <p>${escapeHTML(note)}</p>

          <br>

          <span>
            Answer: ______________________________
          </span>

        </div>
      `;
    });

    output.innerHTML = html;
  };


  window.clearNotes = function () {

    notesBox.value = "";

    output.innerHTML = `
      <div class="empty-state">

        <div class="empty-icon">✨</div>

        <h3>Nothing here yet</h3>

        <p>
          Paste your notes above and choose
          <strong>Study Guide</strong> or
          <strong>Quiz</strong>.
        </p>

      </div>
    `;
  };


  window.copyResult = async function () {

    const text = output.innerText;

    if (!text.trim()) return;

    try {

      await navigator.clipboard.writeText(text);

      const button = document.querySelector(".copy-button");

      if (button) {

        button.textContent = "Copied!";

        setTimeout(() => {
          button.textContent = "Copy";
        }, 1500);

      }

    } catch (error) {

      console.error("Copy failed:", error);

    }
  };


  window.scrollToApp = function () {

    const app = document.getElementById("app");

    if (app) {
      app.scrollIntoView({
        behavior: "smooth"
      });
    }

  };


  function escapeHTML(text) {

    return text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  }

});
