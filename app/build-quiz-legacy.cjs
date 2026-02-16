const fs = require('fs');
const path = require('path');

const quizConfig = {
  'read-and-complete': { skill: 'Read and Complete', json: 'read and complete data.json' },
  'listen-and-type': { skill: 'Listen and Type', json: 'listen and type data.json' },
  'write-about-the-photo': { skill: 'Write About the Photo', json: 'write about photo data.json' },
  'speak-about-the-photo': { skill: 'Speak About the Photo', json: 'speak about the photo data.json' },
  'read-then-speak': { skill: 'Read, Then Speak', json: 'read then speak data.json' },
  'interactive-reading': { skill: 'Interactive Reading', json: 'interactive reading data.json' },
  'interactive-listening': { skill: 'Interactive Listening', json: 'interactive listening data.json' },
  'writing-sample': { skill: 'Writing Sample', json: 'writing sample data.json' },
  'speaking-sample': { skill: 'Speaking Sample', json: 'speaking sample data.json' },
};

const legacyName = process.argv[2];
if (!legacyName || !quizConfig[legacyName]) {
  console.log('Usage: node build-quiz-legacy.cjs <legacy-name>');
  console.log('e.g. read-and-complete, listen-and-type, ...');
  process.exit(1);
}

const config = quizConfig[legacyName];
const rawPath = path.join(__dirname, 'src', 'legacy', legacyName + '.legacy.raw.js');
let code = fs.readFileSync(rawPath, 'utf8');

const skill = config.skill;
const json = config.json;

code = code.split('document.getElementById(').join('getEl(containerEl, ');
code = code.split('document.querySelector(').join('containerEl.querySelector(');
code = code.split('document.querySelectorAll(').join('containerEl.querySelectorAll(');
code = code.split('fetch("' + json + '")').join('fetch("/data/' + json + '")');

code = code.split('const hasNextQuiz = typeof getNextQuizUrl === "function" && getNextQuizUrl("' + skill + '");').join('const hasNextQuiz = getNextQuizUrlFn && getNextQuizUrlFn("' + skill + '");');
code = code.split('if (stagesCompletedThisSession >= STAGES_TOTAL && typeof getNextQuizUrl === "function")').join('if (stagesCompletedThisSession >= STAGES_TOTAL && getNextQuizUrlFn)');
code = code.split('const nextUrl = getNextQuizUrl("' + skill + '");').join('const nextUrl = getNextQuizUrlFn("' + skill + '");');
code = code.split('window.location.href = nextUrl;').join('if (typeof options.navigate === "function") options.navigate(nextUrl); else window.location.href = nextUrl;');
code = code.split('window.location.href = "index.html";').join('if (typeof options.navigate === "function") options.navigate("/"); else window.location.href = "index.html";');
code = code.split('window.history.back();').join('if (typeof options.navigate === "function") options.navigate(-1); else window.history.back();');

// Convert keydown anonymous to named for cleanup: document.addEventListener("keydown", function (event) { -> keydownHandler = function (event) {
// and the closing }); of that listener to }; document.addEventListener("keydown", keydownHandler);
const keydownStart = 'document.addEventListener("keydown", function (event) ';
if (code.includes(keydownStart)) {
  code = code.replace(keydownStart, 'const keydownHandler = function (event) ');
  // Replace the FIRST "});" that closes the keydown listener (after keydownHandler body) - it's the one followed by blank line and "// Initialize App on Load"
  const initMark = '// Initialize App on Load';
  const idx = code.indexOf(initMark);
  if (idx !== -1) {
    const before = code.slice(0, idx);
    const after = code.slice(idx);
    const lastParen = before.lastIndexOf('});');
    if (lastParen !== -1) {
      code = before.slice(0, lastParen) + '}; document.addEventListener("keydown", keydownHandler);' + before.slice(lastParen + 3) + after;
    }
  }
}

// Replace window load with button bindings + loadQuizData + return cleanup
const loadBlock = `      // Initialize App on Load
      window.addEventListener("load", function () {
        loadQuizData();
      });`;
const newBlock = `      const unbind = [];
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
code = code.replace(loadBlock, newBlock);

const wrapper = `import { getNextQuizUrl } from './skills-config.legacy.js';

export function init(containerEl, options = {}) {
  if (!containerEl) return function noop() {};
  const getEl = (root, id) => root.querySelector('[id="' + id + '"]') || document.getElementById(id);
  const getNextQuizUrlFn = options.getNextQuizUrl || getNextQuizUrl;

`;
const out = wrapper + code + '\n}\n';
fs.writeFileSync(path.join(__dirname, 'src', 'legacy', legacyName + '.legacy.js'), out, 'utf8');
console.log('Wrote', legacyName + '.legacy.js');