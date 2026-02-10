// Skill order and URLs - shared across index and quiz pages
const SKILLS_ORDER = [
  { name: "Read and Select", url: "read and select.html" },
  { name: "Fill in the Blanks", url: "fill in the blanks.html" },
  { name: "Read and Complete", url: "read and complete.html" },
  { name: "Listen and Type", url: "listen and type.html" },
  { name: "Write About the Photo", url: "write about the photo.html" },
  { name: "Speak About the Photo", url: "speak about the photo.html" },
  { name: "Read, Then Speak", url: "read then speak.html" },
  { name: "Interactive Reading", url: "interactive reading.html" },
  { name: "Interactive Listening", url: "interactive listening.html" },
  { name: "Writing Sample", url: "writing sample.html" },
  { name: "Speaking Sample", url: "speaking sample.html" }
];

function getNextQuizUrl(currentSkillName) {
  const idx = SKILLS_ORDER.findIndex((s) => s.name === currentSkillName);
  if (idx === -1 || idx >= SKILLS_ORDER.length - 1) return null;
  return SKILLS_ORDER[idx + 1].url;
}

function isSkillCompleted(skillName) {
  try {
    const stored = localStorage.getItem("skillProgress");
    if (!stored) return false;
    const allProgress = JSON.parse(stored);
    const p = allProgress[skillName];
    return p && p.completed >= p.total;
  } catch (e) {
    return false;
  }
}
