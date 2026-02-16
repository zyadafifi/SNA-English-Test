const fs = require('fs');
const path = require('path');

const rawPath = path.join(__dirname, 'src', 'legacy', 'read-and-select.legacy.raw.js');
let code = fs.readFileSync(rawPath, 'utf8');

// Remove leading spaces from each line (optional, keep for readability)
// Replace document.getElementById( with getEl(containerEl, 
code = code.split('document.getElementById(').join('getEl(containerEl, ');
// Replace document.querySelector( with containerEl.querySelector(
code = code.split('document.querySelector(').join('containerEl.querySelector(');
// Replace document.querySelectorAll( with containerEl.querySelectorAll(
code = code.split('document.querySelectorAll(').join('containerEl.querySelectorAll(');
// Fetch path
code = code.split('fetch("read and select data.json")').join('fetch("/data/read and select data.json")');
// Play sound - use absolute path
code = code.split('new Audio(filename)').join('new Audio(filename.startsWith("/") ? filename : "/" + filename)');
// goBack: use navigate(-1) when available
code = code.split('window.history.back();').join('if (typeof options.navigate === "function") options.navigate(-1); else window.history.back();');
// goToPractice
code = code.split('window.location.href = "index.html";').join('if (typeof options.navigate === "function") options.navigate("/"); else window.location.href = "index.html";');
// continueToNextStage - getNextQuizUrl from options
code = code.split('const nextUrl = getNextQuizUrl("Read and Select");').join('const getNextQuizUrlFn = options.getNextQuizUrl || (typeof getNextQuizUrl !== "undefined" ? getNextQuizUrl : null); const nextUrl = getNextQuizUrlFn ? getNextQuizUrlFn("Read and Select") : null;');
code = code.split('window.location.href = nextUrl;').join('if (typeof options.navigate === "function") options.navigate(nextUrl); else window.location.href = nextUrl;');
// Keyboard: use containerEl for getElementById inside the handler - already replaced above
// Remove window load listener and call loadQuizData() directly; add keydown cleanup
code = code.split(`      // Initialize App on Load
      window.addEventListener("load", function () {
        loadQuizData();
      });`).join(`      // Keyboard listener for cleanup
      const keydownHandler = function (event) {
        if (!dataLoaded || getEl(containerEl, "quizContainer").style.display === "none") return;
        if (event.key === "y" || event.key === "Y") {
          if (!getEl(containerEl, "yesBtn").disabled) selectAnswer(true);
        } else if (event.key === "n" || event.key === "N") {
          if (!getEl(containerEl, "noBtn").disabled) selectAnswer(false);
        } else if (event.key === "Enter" || event.key === " ") {
          const feedbackSection = getEl(containerEl, "feedbackSection");
          if (feedbackSection && feedbackSection.style.display === "flex") nextQuestion();
          event.preventDefault();
        } else if (event.key === "Escape") goBack();
      };
      document.addEventListener("keydown", keydownHandler);

      loadQuizData();

      return function cleanup() {
        document.removeEventListener("keydown", keydownHandler);
        if (timerInterval) clearInterval(timerInterval);
        if (feedbackAutoAdvanceTimeout) clearTimeout(feedbackAutoAdvanceTimeout);
      };`);

// Fix the duplicate keydown block - the original had document.addEventListener("keydown", ...). We need to remove that and use the new keydownHandler. So we replaced the "Initialize App on Load" block. But the keydown block is still there with document.getElementById. Let me check - we already replaced all document.getElementById with getEl(containerEl,. So the keydown handler in the middle of the file now has getEl(containerEl, "quizContainer") etc. But we're adding a NEW keydownHandler and loadQuizData and return cleanup. So we need to REMOVE the old "// Keyboard Support" block and the old addEventListener("keydown" ...). Let me do another replacement: remove the old keydown block.
const oldKeydown = `      // Keyboard Support
      document.addEventListener("keydown", function (event) {
        // Only handle keys if quiz is active
        if (
          !dataLoaded ||
          getEl(containerEl, "quizContainer").style.display === "none"
        ) {
          return;
        }

        if (event.key === "y" || event.key === "Y") {
          if (!getEl(containerEl, "yesBtn").disabled) {
            selectAnswer(true);
          }
        } else if (event.key === "n" || event.key === "N") {
          if (!getEl(containerEl, "noBtn").disabled) {
            selectAnswer(false);
          }
        } else if (event.key === "Enter" || event.key === " ") {
          const feedbackSection = getEl(containerEl, "feedbackSection");
          if (feedbackSection.style.display === "flex") {
            nextQuestion();
          }
          event.preventDefault();
        } else if (event.key === "Escape") {
          goBack();
        }
      });

      // Initialize App on Load`;
if (code.includes(oldKeydown)) {
  code = code.replace(oldKeydown, '      // Initialize App on Load');
}
// If the above didn't match due to whitespace, try without "Initialize App on Load"
const altKeydown = `      // Keyboard Support
      document.addEventListener("keydown", function (event) {
        // Only handle keys if quiz is active
        if (
          !dataLoaded ||
          getEl(containerEl, "quizContainer").style.display === "none"
        ) {
          return;
        }

        if (event.key === "y" || event.key === "Y") {
          if (!getEl(containerEl, "yesBtn").disabled) {
            selectAnswer(true);
          }
        } else if (event.key === "n" || event.key === "N") {
          if (!getEl(containerEl, "noBtn").disabled) {
            selectAnswer(false);
          }
        } else if (event.key === "Enter" || event.key === " ") {
          const feedbackSection = getEl(containerEl, "feedbackSection");
          if (feedbackSection.style.display === "flex") {
            nextQuestion();
          }
          event.preventDefault();
        } else if (event.key === "Escape") {
          goBack();
        }
      });`;
code = code.replace(altKeydown, '');

const wrapper = `import { getNextQuizUrl } from './skills-config.legacy.js';

export function init(containerEl, options = {}) {
  if (!containerEl) return function noop() {};
  const getEl = (root, id) => root.querySelector('[id="' + id + '"]') || document.getElementById(id);

`;
const footer = `
}
`;

const full = wrapper + code + footer;
fs.writeFileSync(path.join(__dirname, 'src', 'legacy', 'read-and-select.legacy.js'), full, 'utf8');
console.log('Wrote read-and-select.legacy.js');
