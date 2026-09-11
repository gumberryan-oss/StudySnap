const notesBox = document.getElementById("notes");
const output = document.getElementById("output");

function getNotes() {
  return notesBox.value
    .split(/\n+/)
    .map(note => note.trim())
    .filter(note => note.length > 0);
}

function generateStudyGuide() {
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
      <h3>Quick Review</h3>
      <p>
        Read each key idea once, cover your notes, and try explaining
        each idea from memory.
      </p>
    </div>

    <div class="result-section">
      <h3>⭐ Active Recall Challenge</h3>
      <p>
        Without looking at your notes, explain the most important
        concept you learned in 30 seconds.
      </p>
    </div>
  `;

  output.innerHTML = html;
}

function generateQuiz() {
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
        <strong>${index + 1}. Explain this concept in your own words:</strong>
        <p>${escapeHTML(note)}</p>
        <br>
        <span>Answer: ______________________________</span>
      </div>
    `;
  });

  output.innerHTML = html;
}

function clearNotes() {
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
}

function copyResult() {
  const text = output.innerText;

  if (!text.trim()) return;

  navigator.clipboard.writeText(text);

  const button = document.querySelector(".copy-button");
  button.textContent = "Copied!";

  setTimeout(() => {
    button.textContent = "Copy";
  }, 1500);
}

function scrollToApp() {
  document.getElementById("app").scrollIntoView({
    behavior: "smooth"
  });
}

function escapeHTML(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}