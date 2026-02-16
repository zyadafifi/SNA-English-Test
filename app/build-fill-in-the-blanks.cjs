const fs = require('fs');
const path = require('path');
const rawPath = path.join(__dirname, 'src', 'legacy', 'fill-in-the-blanks.legacy.raw.js');
let code = fs.readFileSync(rawPath, 'utf8');

code = code.split('document.getElementById(').join('getEl(containerEl, ');
code = code.split('document.querySelector(').join('containerEl.querySelector(');
code = code.split('document.querySelectorAll(').join('containerEl.querySelectorAll(');
code = code.split('fetch("fill in the blanks data.json")').join('fetch("/data/fill in the blanks data.json")');
code = code.split('const hasNextQuiz = typeof getNextQuizUrl === "function" && getNextQuizUrl("Fill in the Blanks");').join('const hasNextQuiz = getNextQuizUrlFn && getNextQuizUrlFn("Fill in the Blanks");');
code = code.split('if (stagesCompletedThisSession >= STAGES_TOTAL && typeof getNextQuizUrl === "function") {\n          const nextUrl = getNextQuizUrl("Fill in the Blanks");\n          if (nextUrl) {\n            window.location.href = nextUrl;').join('if (stagesCompletedThisSession >= STAGES_TOTAL && getNextQuizUrlFn) {\n          const nextUrl = getNextQuizUrlFn("Fill in the Blanks");\n          if (nextUrl) {\n            if (typeof options.navigate === "function") options.navigate(nextUrl); else window.location.href = nextUrl;');
code = code.split('window.location.href = "index.html";').join('if (typeof options.navigate === "function") options.navigate("/"); else window.location.href = "index.html";');
code = code.split('window.history.back();').join('if (typeof options.navigate === "function") options.navigate(-1); else window.history.back();');

const oldKeydown = `      // Keyboard Support
      document.addEventListener("keydown", function (event) {
        if (
          !dataLoaded ||
          getEl(containerEl, "quizContainer").style.display === "none"
        ) {
          return;
        }

        if (event.key === "Escape") {
          goBack();
        }
      });

      // Initialize App on Load
      window.addEventListener("load", function () {
        loadQuizData();
      });`;

const newBlock = `      const keydownHandler = function (event) {
        if (!dataLoaded || getEl(containerEl, "quizContainer").style.display === "none") return;
        if (event.key === "Escape") goBack();
      };
      document.addEventListener("keydown", keydownHandler);
      const unbind = [];
      const errScreen = getEl(containerEl, "errorScreen");
      if (errScreen) {
        const errorBtns = errScreen.querySelectorAll(".retry-data-btn");
        if (errorBtns[0]) { errorBtns[0].addEventListener("click", loadQuizData); unbind.push(() => errorBtns[0].removeEventListener("click", loadQuizData)); }
        if (errorBtns[1]) { errorBtns[1].addEventListener("click", goBack); unbind.push(() => errorBtns[1].removeEventListener("click", goBack)); }
      }
      const closeBtn = containerEl.querySelector(".close-btn");
      if (closeBtn) { closeBtn.addEventListener("click", goBack); unbind.push(() => closeBtn.removeEventListener("click", goBack)); }
      const contBtn = getEl(containerEl, "continueBtn");
      if (contBtn) { contBtn.addEventListener("click", checkAnswer); unbind.push(() => contBtn.removeEventListener("click", checkAnswer)); }
      const resultsContBtn = getEl(containerEl, "resultsContinueBtn");
      if (resultsContBtn) { resultsContBtn.addEventListener("click", continueToNextStage); unbind.push(() => resultsContBtn.removeEventListener("click", continueToNextStage)); }
      const doneBtn = containerEl.querySelector(".done-btn");
      if (doneBtn) { doneBtn.addEventListener("click", goToPractice); unbind.push(() => doneBtn.removeEventListener("click", goToPractice)); }
      loadQuizData();
      return function cleanup() {
        document.removeEventListener("keydown", keydownHandler);
        unbind.forEach((f) => f());
        if (timerInterval) clearInterval(timerInterval);
        if (feedbackAutoAdvanceTimeout) clearTimeout(feedbackAutoAdvanceTimeout);
      };`;

code = code.replace(oldKeydown, newBlock);

const wrapper = `import { getNextQuizUrl } from './skills-config.legacy.js';

export function init(containerEl, options = {}) {
  if (!containerEl) return function noop() {};
  const getEl = (root, id) => root.querySelector('[id="' + id + '"]') || document.getElementById(id);
  const getNextQuizUrlFn = options.getNextQuizUrl || getNextQuizUrl;

`;
const out = wrapper + code + '\n}\n';
fs.writeFileSync(path.join(__dirname, 'src', 'legacy', 'fill-in-the-blanks.legacy.js'), out, 'utf8');
console.log('Wrote fill-in-the-blanks.legacy.js');