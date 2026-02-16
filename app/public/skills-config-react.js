/* Skill order with React route paths - loaded before script.js on Home page */
(function () {
  var SKILLS_ORDER = [
    { name: "Read and Select", url: "/read-and-select" },
    { name: "Fill in the Blanks", url: "/fill-in-the-blanks" },
    { name: "Read and Complete", url: "/read-and-complete" },
    { name: "Listen and Type", url: "/listen-and-type" },
    { name: "Write About the Photo", url: "/write-about-the-photo" },
    { name: "Speak About the Photo", url: "/speak-about-the-photo" },
    { name: "Read, Then Speak", url: "/read-then-speak" },
    { name: "Interactive Reading", url: "/interactive-reading" },
    { name: "Interactive Listening", url: "/interactive-listening" },
    { name: "Writing Sample", url: "/writing-sample" },
    { name: "Speaking Sample", url: "/speaking-sample" }
  ];

  function getNextQuizUrl(currentSkillName) {
    var idx = SKILLS_ORDER.findIndex(function (s) { return s.name === currentSkillName; });
    if (idx === -1 || idx >= SKILLS_ORDER.length - 1) return null;
    return SKILLS_ORDER[idx + 1].url;
  }

  function isSkillCompleted(skillName) {
    try {
      var stored = localStorage.getItem("skillProgress");
      if (!stored) return false;
      var allProgress = JSON.parse(stored);
      var p = allProgress[skillName];
      return p && p.completed >= p.total;
    } catch (e) {
      return false;
    }
  }

  window.SKILLS_ORDER = SKILLS_ORDER;
  window.getNextQuizUrl = getNextQuizUrl;
  window.isSkillCompleted = isSkillCompleted;
})();
