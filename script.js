// Global Variables
let sidebarOpen = false;
let activeCategory = "ALL";
const OVERALL_PROGRESS_TOTAL = 51;

// Initialize the application - Optimized single DOMContentLoaded listener
(function () {
  let initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;

    initializeApp();
    navigateToPractice();
  }

  // Use DOMContentLoaded or execute immediately if already loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

function initializeApp() {
  // Add event listeners
  addEventListeners();

  // Initialize skill cards
  initializeSkillCards();

  // Initialize category buttons
  initializeCategoryButtons();

  // Add keyboard shortcuts
  addKeyboardShortcuts();

  // Add hover effects
  addHoverEffects();

  // Initialize new buttons for My Tests page
  initializeMyTestsButtons();

  // Initialize Test Info cards
  initializeTestInfoCards();

  // Initialize Review Rules functionality
  initializeReviewRules();

  // Load saved progress
  loadSkillProgress();

  // Check for new progress from other pages
  checkForNewProgress();

  // Refresh progress when returning to this page (e.g. back button, tab switch)
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) {
      loadSkillProgress();
      checkForNewProgress();
    }
  });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      loadSkillProgress();
      checkForNewProgress();
    }
  });

  window.addEventListener("progressUpdated", function (e) {
    if (e.detail.skill === "Read, Then Speak") {
      updateSkillProgress(
        "Read, Then Speak",
        e.detail.progress.completed,
        e.detail.progress.total
      );

      // Show notification
      showNotification(
        `Read, Then Speak progress: ${e.detail.progress.completed}/${e.detail.progress.total}! 🎤`
      );
    }
  });
}
function initializeTestInfoCards() {
  const infoCards = document.querySelectorAll(".info-card");

  infoCards.forEach((card) => {
    card.addEventListener("click", function () {
      const cardTitle = this.querySelector("h3").textContent;
      handleInfoCardClick(cardTitle);
    });

    // Add keyboard support
    card.setAttribute("tabindex", "0");
    card.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.click();
      }
    });

    // Add hover animation
    card.addEventListener("mouseenter", function () {
      this.style.transform = "translateY(-2px)";
    });

    card.addEventListener("mouseleave", function () {
      this.style.transform = "translateY(0)";
    });
  });
}

function handleInfoCardClick(cardTitle) {
  switch (cardTitle) {
    case "Review rules":
      navigateToReviewRules();
      break;
    case "Prepare your space":
      navigateToPrepareSpace();
      break;
    case "Understand scoring":
      navigateToUnderstandScoring();
      break;

    default:
      showNotification(`Opening ${cardTitle}...`);
  }
}
function navigateToUnderstandScoring() {
  // Hide all content sections
  const practiceContent = document.getElementById("practiceContent");
  const myTestsContent = document.getElementById("myTestsContent");
  const testInfoContent = document.getElementById("testInfoContent");
  const institutionsContent = document.getElementById("institutionsContent");
  const reviewRulesContent = document.getElementById("reviewRulesContent");
  const prepareSpaceContent = document.getElementById("prepareSpaceContent");
  const understandScoringContent = document.getElementById(
    "understandScoringContent"
  );

  if (practiceContent) practiceContent.style.display = "none";
  if (myTestsContent) myTestsContent.style.display = "none";
  if (testInfoContent) testInfoContent.style.display = "none";
  if (institutionsContent) institutionsContent.style.display = "none";
  if (reviewRulesContent) reviewRulesContent.style.display = "none";
  if (prepareSpaceContent) prepareSpaceContent.style.display = "none";
  if (understandScoringContent)
    understandScoringContent.style.display = "block";

  // Keep TEST INFO highlighted in sidebar since this is a sub-page
  updateSidebarActiveState("TEST INFO");
}
function navigateToPrepareSpace() {
  // Hide all content sections
  const practiceContent = document.getElementById("practiceContent");
  const myTestsContent = document.getElementById("myTestsContent");
  const testInfoContent = document.getElementById("testInfoContent");
  const institutionsContent = document.getElementById("institutionsContent");
  const reviewRulesContent = document.getElementById("reviewRulesContent");
  const prepareSpaceContent = document.getElementById("prepareSpaceContent");

  if (practiceContent) practiceContent.style.display = "none";
  if (myTestsContent) myTestsContent.style.display = "none";
  if (testInfoContent) testInfoContent.style.display = "none";
  if (institutionsContent) institutionsContent.style.display = "none";
  if (reviewRulesContent) reviewRulesContent.style.display = "none";
  if (prepareSpaceContent) prepareSpaceContent.style.display = "block";

  // Keep TEST INFO highlighted in sidebar since this is a sub-page
  updateSidebarActiveState("TEST INFO");
}
function navigateToReviewRules() {
  // Hide all content sections
  const practiceContent = document.getElementById("practiceContent");
  const myTestsContent = document.getElementById("myTestsContent");
  const testInfoContent = document.getElementById("testInfoContent");
  const institutionsContent = document.getElementById("institutionsContent");
  const reviewRulesContent = document.getElementById("reviewRulesContent");

  if (practiceContent) practiceContent.style.display = "none";
  if (myTestsContent) myTestsContent.style.display = "none";
  if (testInfoContent) testInfoContent.style.display = "none";
  if (institutionsContent) institutionsContent.style.display = "none";
  if (reviewRulesContent) reviewRulesContent.style.display = "block";

  // Keep TEST INFO highlighted in sidebar since this is a sub-page
  updateSidebarActiveState("TEST INFO");
}
function initializeMyTestsButtons() {
  // Purchase test button
  const purchaseTestBtn = document.querySelector(".purchase-test-btn");
  if (purchaseTestBtn) {
    purchaseTestBtn.addEventListener("click", function () {
      // Redirect to index.html instead of showing notification
      window.location.href = "index.html";
    });
  }

  // Action cards
  const practiceCard = document.querySelector(".practice-card");
  const learnCard = document.querySelector(".learn-card");

  if (practiceCard) {
    practiceCard.addEventListener("click", function () {
      navigateToPractice(); // This will switch to Practice tab
    });
  }

  if (learnCard) {
    learnCard.addEventListener("click", function () {
      navigateToTestInfo();
    });
  }
}
function addEventListeners() {
  // Practice Free button
  const practiceFreeBtn = document.querySelector(".practice-free-btn");
  if (practiceFreeBtn) {
    practiceFreeBtn.addEventListener("click", startFullPracticeTest);
  }

  // Sidebar items
  const sidebarItems = document.querySelectorAll(".sidebar-item");
  sidebarItems.forEach((item) => {
    item.addEventListener("click", handleSidebarItemClick);
  });

  // Close sidebar when clicking outside
  document.addEventListener("click", function (event) {
    const sidebar = document.getElementById("sidebar");
    const menuBtn = document.querySelector(".menu-btn");

    if (
      sidebarOpen &&
      !sidebar.contains(event.target) &&
      !menuBtn.contains(event.target)
    ) {
      toggleSidebar();
    }
  });

  // Header scroll effect - add background when scrolled
  const header = document.querySelector(".header");
  if (header) {
    function updateHeaderScrollState() {
      if (window.scrollY > 10) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
    }
    window.addEventListener("scroll", updateHeaderScrollState, { passive: true });
    updateHeaderScrollState(); // Check initial state
  }
}

function initializeSkillCards() {
  const skillCards = document.querySelectorAll(".skill-card");

  skillCards.forEach((card) => {
    const skillName = card.querySelector("h3").textContent;

    // Special handling for Read and Select
    if (skillName === "Read and Select") {
      card.addEventListener("click", function () {
        // Add a brief loading state before redirect
        this.style.opacity = "0.7";
        this.style.transform = "translateY(-2px)";

        setTimeout(() => {
          window.location.href = "read and select.html";
        }, 200);
      });
    }
    // Special handling for Fill in the Blanks
    else if (skillName === "Fill in the Blanks") {
      card.addEventListener("click", function () {
        // Add a brief loading state before redirect
        this.style.opacity = "0.7";
        this.style.transform = "translateY(-2px)";

        setTimeout(() => {
          window.location.href = "fill in the blanks.html";
        }, 200);
      });
    }
    // Special handling for Listen and Type
    else if (skillName === "Listen and Type") {
      card.addEventListener("click", function () {
        this.style.opacity = "0.7";
        this.style.transform = "translateY(-2px)";

        setTimeout(() => {
          window.location.href = "listen and type.html";
        }, 200);
      });
    }
    // Special handling for Read and Complete - NEW
    else if (skillName === "Read and Complete") {
      card.addEventListener("click", function () {
        this.style.opacity = "0.7";
        this.style.transform = "translateY(-2px)";

        setTimeout(() => {
          window.location.href = "read and complete.html";
        }, 200);
      });
    }
    // Special handling for Write About the Photo - NEW
    else if (skillName === "Write About the Photo") {
      card.addEventListener("click", function () {
        this.style.opacity = "0.7";
        this.style.transform = "translateY(-2px)";

        setTimeout(() => {
          window.location.href = "write about the photo.html";
        }, 200);
      });
    }
    // Special handling for Interactive Reading
    else if (skillName === "Interactive Reading") {
      card.addEventListener("click", function () {
        this.style.opacity = "0.7";
        this.style.transform = "translateY(-2px)";

        setTimeout(() => {
          window.location.href = "interactive reading.html";
        }, 200);
      });
    }
    // Special handling for Interactive Listening - NEW
    else if (skillName === "Interactive Listening") {
      card.addEventListener("click", function () {
        this.style.opacity = "0.7";
        this.style.transform = "translateY(-2px)";

        setTimeout(() => {
          window.location.href = "interactive listening.html";
        }, 200);
      });
    }
    // Special handling for Writing Sample- NEW
    else if (skillName === "Writing Sample") {
      card.addEventListener("click", function () {
        this.style.opacity = "0.7";
        this.style.transform = "translateY(-2px)";

        setTimeout(() => {
          window.location.href = "writing sample.html";
        }, 200);
      });
    }
    // Special handling for Speak About the Photo - NEW
    else if (skillName === "Speak About the Photo") {
      card.addEventListener("click", function () {
        this.style.opacity = "0.7";
        this.style.transform = "translateY(-2px)";

        setTimeout(() => {
          window.location.href = "speak about the photo.html";
        }, 200);
      });
    }
    // Special handling for Read then speak - NEW
    else if (skillName === "Read, Then Speak") {
      card.addEventListener("click", function () {
        this.style.opacity = "0.7";
        this.style.transform = "translateY(-2px)";

        setTimeout(() => {
          window.location.href = "read then speak.html";
        }, 200);
      });
    }
    // Special handling for Speaking sample
    else if (skillName === "Speaking Sample") {
      card.addEventListener("click", function () {
        this.style.opacity = "0.7";
        this.style.transform = "translateY(-2px)";

        setTimeout(() => {
          window.location.href = "speaking sample.html";
        }, 200);
      });
    } else {
      // Default behavior for other cards
      card.addEventListener("click", function () {
        startSkillPractice(skillName);
      });
    }

    // Add keyboard support for accessibility
    card.setAttribute("tabindex", "0");
    card.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.click();
      }
    });

    // Add hover animations
    card.addEventListener("mouseenter", function () {
      this.style.transform = "translateY(-2px)";
      this.style.transition = "all 0.2s ease";
    });

    card.addEventListener("mouseleave", function () {
      this.style.transform = "translateY(0)";
    });

    // Add focus styles for keyboard navigation
    card.addEventListener("focus", function () {
      this.style.outline = "2px solid #ffc515";
      this.style.outlineOffset = "2px";
    });

    card.addEventListener("blur", function () {
      this.style.outline = "none";
    });

    // Add click animation
    card.addEventListener("mousedown", function () {
      this.style.transform = "translateY(0) scale(0.98)";
    });

    card.addEventListener("mouseup", function () {
      this.style.transform = "translateY(-2px) scale(1)";
    });

    // Track analytics for skill card clicks (integrated with existing click handlers above)
  });
}

function initializeCategoryButtons() {
  const categoryButtons = document.querySelectorAll(".category-btn");

  categoryButtons.forEach((button) => {
    button.addEventListener("click", function () {
      // Remove active class from all buttons
      categoryButtons.forEach((btn) => btn.classList.remove("active"));

      // Add active class to clicked button
      this.classList.add("active");

      // Update active category
      activeCategory = this.textContent;

      // Filter skills based on category
      filterSkillsByCategory(activeCategory);
    });
  });
}

function addHoverEffects() {
  // Add subtle animations to interactive elements
  const interactiveElements = document.querySelectorAll(
    ".icon-btn, .sidebar-item, .help-button"
  );

  interactiveElements.forEach((element) => {
    element.addEventListener("mouseenter", function () {
      this.style.transition = "all 0.2s ease";
    });
  });
}

// Sidebar Functions
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebarOpen = !sidebarOpen;

  if (sidebarOpen) {
    sidebar.classList.add("open");
    document.body.style.overflow = "hidden";
  } else {
    sidebar.classList.remove("open");
    document.body.style.overflow = "auto";
  }
}

function handleSidebarItemClick(event) {
  const itemText =
    event.currentTarget.querySelector("span:last-child").textContent;

  switch (itemText) {
    case "MY TESTS":
      navigateToMyTests();
      break;
    case "PRACTICE":
      navigateToPractice();
      break;
    case "TEST INFO":
      navigateToTestInfo();
      break;

    case "SETTINGS":
      navigateToSettings();
      break;
    case "SITE LANGUAGE":
      openLanguageSettings();
      break;
    case "LOG OUT":
      handleLogout();
      break;
  }

  // Close sidebar on mobile after selection
  if (window.innerWidth <= 768) {
    toggleSidebar();
  }
}

// Practice Functions
function startFullPracticeTest() {
  // عرض حالة التحمين (اختياري)
  const btn = document.querySelector(".practice-free-btn");
  const originalText = btn.textContent;
  btn.textContent = "Loading...";
  btn.disabled = true;

  // توجيه بعد تأخير بسيط لمحاكاة التحميل
  setTimeout(() => {
    window.location.href = "read and select.html";
  }, 500);
}

function startSkillPractice(skillName) {
  // Show loading state
  showNotification(`Starting ${skillName} practice...`);

  // Simulate starting practice
  setTimeout(() => {
    alert(
      `${skillName} practice would start here! This would open the specific skill practice interface.`
    );
  }, 1000);
}

function filterSkillsByCategory(category) {
  const skillCards = document.querySelectorAll(".skill-card");

  skillCards.forEach((card) => {
    const skillName = card.querySelector("h3").textContent;
    let shouldShow = true;

    if (category !== "ALL") {
      shouldShow = getSkillCategory(skillName) === category;
    }

    if (shouldShow) {
      card.style.display = "flex";
      card.style.animation = "fadeIn 0.3s ease-in-out";
    } else {
      card.style.display = "none";
    }
  });
}

function getSkillCategory(skillName) {
  const categoryMap = {
    "Read and Select": "READING",
    "Fill in the Blanks": "READING",
    "Read and Complete": "READING",
    "Interactive Reading": "READING",
    "Listen and Type": "LISTENING",
    "Interactive Listening": "LISTENING",
    "Write About the Photo": "WRITING",
    "Writing Sample": "WRITING",
    "Speak About the Photo": "SPEAKING",
    "Read, Then Speak": "SPEAKING",
    "Speaking Sample": "SPEAKING",
  };

  return categoryMap[skillName] || "ALL";
}

// Navigation Functions
function navigateToMyTests() {
  hideAllSubPages(); // Hide all sub-pages first

  const practiceContent = document.getElementById("practiceContent");
  const myTestsContent = document.getElementById("myTestsContent");
  const testInfoContent = document.getElementById("testInfoContent");
  const institutionsContent = document.getElementById("institutionsContent");

  if (practiceContent) practiceContent.style.display = "none";
  if (myTestsContent) myTestsContent.style.display = "block";
  if (testInfoContent) testInfoContent.style.display = "none";
  if (institutionsContent) institutionsContent.style.display = "none";

  updateSidebarActiveState("MY TESTS");
}

function navigateToPractice() {
  hideAllSubPages(); // Hide all sub-pages first

  const practiceContent = document.getElementById("practiceContent");
  const myTestsContent = document.getElementById("myTestsContent");
  const testInfoContent = document.getElementById("testInfoContent");
  const institutionsContent = document.getElementById("institutionsContent");

  if (practiceContent) practiceContent.style.display = "block";
  if (myTestsContent) myTestsContent.style.display = "none";
  if (testInfoContent) testInfoContent.style.display = "none";
  if (institutionsContent) institutionsContent.style.display = "none";

  updateSidebarActiveState("PRACTICE");
}
function hideAllSubPages() {
  const subPages = [
    "reviewRulesContent",
    "prepareSpaceContent",
    "understandScoringContent",
  ];

  subPages.forEach((pageId) => {
    const page = document.getElementById(pageId);
    if (page) page.style.display = "none";
  });
}
function navigateToTestInfo() {
  // Hide other content sections
  const practiceContent = document.getElementById("practiceContent");
  const myTestsContent = document.getElementById("myTestsContent");
  const testInfoContent = document.getElementById("testInfoContent");
  const institutionsContent = document.getElementById("institutionsContent");
  const reviewRulesContent = document.getElementById("reviewRulesContent");
  const prepareSpaceContent = document.getElementById("prepareSpaceContent");
  const understandScoringContent = document.getElementById(
    "understandScoringContent"
  );

  if (practiceContent) practiceContent.style.display = "none";
  if (myTestsContent) myTestsContent.style.display = "none";
  if (testInfoContent) testInfoContent.style.display = "block";
  if (institutionsContent) institutionsContent.style.display = "none";
  if (reviewRulesContent) reviewRulesContent.style.display = "none";
  if (prepareSpaceContent) prepareSpaceContent.style.display = "none";
  if (understandScoringContent) understandScoringContent.style.display = "none";

  // Update sidebar active state
  updateSidebarActiveState("TEST INFO");
}
function initializeReviewRules() {
  const videoContainer = document.querySelector(".video-container");
  if (videoContainer) {
    videoContainer.addEventListener("click", function () {
      showNotification("Video would play here in the actual app");
      // In a real app, this would open a video player or modal
    });
  }
}

function updateSidebarActiveState(activeItem) {
  const sidebarItems = document.querySelectorAll(".sidebar-item");
  sidebarItems.forEach((item) => {
    const itemText = item.querySelector("span:last-child").textContent;

    // Remove all active states first
    item.classList.remove("active", "highlighted", "test-info-active");

    // Add appropriate class based on the active item
    if (itemText === activeItem) {
      if (activeItem === "MY TESTS") {
        item.classList.add("active");
      } else if (activeItem === "PRACTICE") {
        item.classList.add("highlighted");
      } else if (activeItem === "TEST INFO") {
        item.classList.add("test-info-active");
      }
    }
  });
}

function navigateToSettings() {
  showNotification("Opening Settings...");
}

function openLanguageSettings() {
  showNotification("Opening Language Settings...");
}

function handleLogout() {
  if (confirm("Are you sure you want to log out?")) {
    showNotification("Logging out...");
    // In a real app, this would handle the logout process
    setTimeout(() => {
      alert("You have been logged out successfully!");
    }, 1500);
  }
}

// Utility Functions
function showNotification(message) {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = "notification";
  notification.textContent = message;

  // Style the notification
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ffc515;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 500;
        z-index: 3000;
        animation: slideInRight 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;

  // Add to page
  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = "slideOutRight 0.3s ease-in";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

function simulateProgress(skillCard) {
  const progressBar = skillCard.querySelector(".progress-fill");
  const progressText = skillCard.querySelector(".progress-text");

  if (progressBar && progressText) {
    const currentProgress = parseInt(progressText.textContent.split("/")[0]);
    const maxProgress = parseInt(progressText.textContent.split("/")[1]);

    if (currentProgress < maxProgress) {
      const newProgress = currentProgress + 1;
      const percentage = (newProgress / maxProgress) * 100;

      progressBar.style.width = `${percentage}%`;
      progressText.textContent = `${newProgress}/${maxProgress}`;

      // Add completion animation if finished
      if (newProgress === maxProgress) {
        setTimeout(() => {
          skillCard.style.background =
            "linear-gradient(135deg, #FFF3E0, #FFE8B0)";
          showNotification("Skill completed! 🎉");
        }, 500);
      }
    }
  }
}

// Add CSS animations dynamically
function addDynamicStyles() {
  const style = document.createElement("style");
  style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        .notification {
            transition: all 0.3s ease;
        }
        
        .skill-card {
            transition: all 0.3s ease;
        }
        
        .progress-fill {
            transition: width 0.5s ease;
        }
    `;
  document.head.appendChild(style);
}

// Performance optimization
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Resize handler
const handleResize = debounce(() => {
  // Close sidebar on desktop
  if (window.innerWidth > 768 && sidebarOpen) {
    toggleSidebar();
  }
}, 250);

window.addEventListener("resize", handleResize);

// Initialize dynamic styles - Optimized to run once
(function () {
  let stylesAdded = false;
  function addStyles() {
    if (stylesAdded) return;
    stylesAdded = true;
    addDynamicStyles();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addStyles);
  } else {
    addStyles();
  }
})();

// Accessibility improvements
function enhanceAccessibility() {
  // Add ARIA labels
  const practiceBtn = document.querySelector(".practice-free-btn");
  if (practiceBtn) {
    practiceBtn.setAttribute("aria-label", "Start free practice test");
  }

  const menuBtn = document.querySelector(".menu-btn");
  if (menuBtn) {
    menuBtn.setAttribute("aria-label", "Open navigation menu");
    menuBtn.setAttribute("aria-expanded", "false");
  }

  const helpBtn = document.querySelector(".help-btn");
  if (helpBtn) {
    helpBtn.setAttribute("aria-label", "Get help and support");
  }

  // Update ARIA states
  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    sidebar.setAttribute("aria-hidden", "true");
  }
}

// Update ARIA states when sidebar toggles
function updateAriaStates() {
  const sidebar = document.getElementById("sidebar");
  const menuBtn = document.querySelector(".menu-btn");

  if (sidebar && menuBtn) {
    sidebar.setAttribute("aria-hidden", sidebarOpen ? "false" : "true");
    menuBtn.setAttribute("aria-expanded", sidebarOpen ? "true" : "false");
  }
}

// Call accessibility improvements on load - Optimized
(function () {
  let accessibilityEnhanced = false;
  function enhance() {
    if (accessibilityEnhanced) return;
    accessibilityEnhanced = true;
    enhanceAccessibility();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhance);
  } else {
    enhance();
  }
})();

// Update ARIA states when sidebar state changes - Optimized
(function () {
  let ariaUpdated = false;
  function updateAria() {
    if (ariaUpdated) return;
    ariaUpdated = true;
    const originalToggleSidebar = toggleSidebar;
    toggleSidebar = function () {
      originalToggleSidebar();
      updateAriaStates();
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateAria);
  } else {
    updateAria();
  }
})();

// Service Worker registration for offline support (optional)
// Commented out to prevent 404 error - uncomment and create sw.js if needed
/*
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("/sw.js")
      .then(function (registration) {
        console.log("ServiceWorker registration successful");
      })
      .catch(function (err) {
        console.log("ServiceWorker registration failed");
      });
  });
}
*/

// Analytics tracking (placeholder)
function trackEvent(eventName, eventData = {}) {
  // In a real app, this would send data to analytics service
  console.log(`Event: ${eventName}`, eventData);
}

// Track skill card clicks - Optimized (moved to initializeSkillCards to avoid duplicate listeners)

// Error handling
window.addEventListener("error", function (event) {
  console.error("JavaScript error:", event.error);
  showNotification("An error occurred. Please refresh the page.");
});

// Unhandled promise rejection handling
window.addEventListener("unhandledrejection", function (event) {
  console.error("Unhandled promise rejection:", event.reason);
  showNotification("A network error occurred. Please check your connection.");
});

console.log("SNAEnglish Test Practice App initialized successfully!");
// Function to update skill progress
// Function to update skill progress
function updateSkillProgress(skillName, completed, total) {
  const skillCards = document.querySelectorAll(".skill-card");

  skillCards.forEach((card) => {
    const cardSkillName = card.querySelector("h3").textContent;

    if (cardSkillName === skillName) {
      const progressBar = card.querySelector(".progress-fill");
      const progressText = card.querySelector(".progress-text");

      if (progressBar && progressText) {
        // Calculate percentage
        const percentage = (completed / total) * 100;

        // Update progress bar
        progressBar.style.width = `${percentage}%`;
        progressBar.style.background =
          "linear-gradient(90deg, #ffc515, #ffd84d)";

        // Update text
        progressText.textContent = `${completed}/${total}`;

        // Add visual effect if completed
        if (completed === total) {
          setTimeout(() => {
            card.style.background = "linear-gradient(135deg, #FFF3E0, #FFE8B0)";
            card.style.border = "1px solid #ffc515";
            showNotification(`${skillName} completed! 🎉`);

            // Check if all skills are completed
            setTimeout(() => {
              checkAllSkillsCompleted();
            }, 500);
          }, 500);
        }

        // Save progress to localStorage
        saveSkillProgress(skillName, completed, total);
      }
    }
  });
}

// Function to get current progress for a skill
function getSkillCurrentProgress(skillName) {
  const progressKey = "skillProgress";

  try {
    const stored = localStorage.getItem(progressKey);
    if (stored) {
      const allProgress = JSON.parse(stored);
      if (allProgress[skillName]) {
        return allProgress[skillName].completed || 0;
      }
    }
  } catch (error) {
    console.error("Error reading current progress:", error);
  }

  return 0; // Default to 0 if no progress found
}

// Function to save skill progress
function saveSkillProgress(skillName, completed, total) {
  const progressKey = "skillProgress";
  let allProgress = {};

  try {
    const stored = localStorage.getItem(progressKey);
    if (stored) {
      allProgress = JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error reading progress:", error);
  }

  allProgress[skillName] = {
    completed: completed,
    total: total,
    percentage: (completed / total) * 100,
    timestamp: new Date().toISOString(),
  };

  try {
    localStorage.setItem(progressKey, JSON.stringify(allProgress));
    console.log(`Saved progress: ${skillName} - ${completed}/${total}`);
  } catch (error) {
    console.error("Error saving progress:", error);
  }
}

// Function to update the overall percentage progress bar
function updateOverallProgressBar() {
  const fillEl = document.getElementById("overallProgressFill");
  const percentEl = document.getElementById("overallProgressPercent");
  if (!fillEl || !percentEl) return;

  let totalCompleted = 0;
  try {
    const stored = localStorage.getItem("skillProgress");
    if (stored) {
      const allProgress = JSON.parse(stored);
      Object.values(allProgress).forEach((p) => {
        totalCompleted += p.completed || 0;
      });
    }
  } catch (e) {
    console.error("Error reading overall progress:", e);
  }

  const percent = Math.round((totalCompleted / OVERALL_PROGRESS_TOTAL) * 100);
  fillEl.style.width = `${percent}%`;
  percentEl.textContent = `${percent}%`;
}

// Function to load saved progress
function loadSkillProgress() {
  const progressKey = "skillProgress";

  try {
    const stored = localStorage.getItem(progressKey);
    if (stored) {
      const allProgress = JSON.parse(stored);

      // Apply progress to all skills
      Object.keys(allProgress).forEach((skillName) => {
        const progress = allProgress[skillName];
        updateSkillProgress(skillName, progress.completed, progress.total);
      });
    }
    updateOverallProgressBar();
  } catch (error) {
    console.error("Error loading progress:", error);
  }
}

// Function to check for new progress from other pages
function checkForNewProgress() {
  // Check for Read and Select progress
  const readSelectProgress = localStorage.getItem("readAndSelectProgress");
  if (readSelectProgress) {
    try {
      const progressData = JSON.parse(readSelectProgress);
      updateSkillProgress(
        progressData.skill,
        progressData.completed,
        progressData.total
      );
      localStorage.removeItem("readAndSelectProgress");

      setTimeout(() => {
        showNotification(
          `${progressData.skill} progress: ${progressData.completed}/${progressData.total}! 📈`
        );
      }, 500);
    } catch (error) {
      console.error("Error processing new progress:", error);
    }
  }

  // Check for Fill in the Blanks progress
  const fillBlanksProgress = localStorage.getItem("fillBlanksProgress");
  if (fillBlanksProgress) {
    try {
      const progressData = JSON.parse(fillBlanksProgress);
      updateSkillProgress(
        progressData.skill,
        progressData.completed,
        progressData.total
      );
      localStorage.removeItem("fillBlanksProgress");

      setTimeout(() => {
        showNotification(
          `${progressData.skill} progress: ${progressData.completed}/${progressData.total}! 📈`
        );
      }, 500);
    } catch (error) {
      console.error("Error processing Fill in the Blanks progress:", error);
    }
  }

  // Check for Listen and Type progress
  const listenTypeProgress = localStorage.getItem("listenTypeProgress");
  if (listenTypeProgress) {
    try {
      const progressData = JSON.parse(listenTypeProgress);
      updateSkillProgress(
        progressData.skill,
        progressData.completed,
        progressData.total
      );
      localStorage.removeItem("listenTypeProgress");

      setTimeout(() => {
        showNotification(
          `${progressData.skill} progress: ${progressData.completed}/${progressData.total}! 🎧`
        );
      }, 500);
    } catch (error) {
      console.error("Error processing Listen and Type progress:", error);
    }
  }

  // Check for Read and Complete progress - NEW
  const readCompleteProgress = localStorage.getItem("readCompleteProgress");
  if (readCompleteProgress) {
    try {
      const progressData = JSON.parse(readCompleteProgress);
      updateSkillProgress(
        progressData.skill,
        progressData.completed,
        progressData.total
      );
      localStorage.removeItem("readCompleteProgress");

      setTimeout(() => {
        showNotification(
          `${progressData.skill} progress: ${progressData.completed}/${progressData.total}! 📚`
        );
      }, 500);
    } catch (error) {
      console.error("Error processing Read and Complete progress:", error);
    }
  }
  // Check for Write About the Photo progress - NEW
  const writePhotoProgress = localStorage.getItem("writePhotoProgress");
  if (writePhotoProgress) {
    try {
      const progressData = JSON.parse(writePhotoProgress);
      updateSkillProgress(
        progressData.skill,
        progressData.completed,
        progressData.total
      );
      localStorage.removeItem("writePhotoProgress");

      setTimeout(() => {
        showNotification(
          `${progressData.skill} progress: ${progressData.completed}/${progressData.total}! ✍️`
        );
      }, 500);
    } catch (error) {
      console.error("Error processing Write About the Photo progress:", error);
    }
  }
  // Check for Interactive Reading progress - NEW
  const interactiveReadingProgress = localStorage.getItem(
    "interactiveReadingProgress"
  );
  if (interactiveReadingProgress) {
    try {
      const progressData = JSON.parse(interactiveReadingProgress);
      updateSkillProgress(
        progressData.skill,
        progressData.completed,
        progressData.total
      );
      localStorage.removeItem("interactiveReadingProgress");

      setTimeout(() => {
        showNotification(
          `${progressData.skill} progress: ${progressData.completed}/${progressData.total}! 📖`
        );
      }, 500);
    } catch (error) {
      console.error("Error processing Interactive Reading progress:", error);
    }
  }
  // Check for Interactive Listening progress - NEW
  const interactiveListeningProgress = localStorage.getItem(
    "interactiveListeningProgress"
  );
  if (interactiveListeningProgress) {
    try {
      const progressData = JSON.parse(interactiveListeningProgress);
      updateSkillProgress(
        progressData.skill,
        progressData.completed,
        progressData.total
      );
      localStorage.removeItem("interactiveListeningProgress");

      setTimeout(() => {
        showNotification(
          `${progressData.skill} progress: ${progressData.completed}/${progressData.total}! 🎧`
        );
      }, 500);
    } catch (error) {
      console.error("Error processing Interactive Listening progress:", error);
    }
  }
  const writingSampleProgress = localStorage.getItem("writingSampleProgress");
  if (writingSampleProgress) {
    try {
      const progressData = JSON.parse(writingSampleProgress);
      updateSkillProgress(
        progressData.skill,
        progressData.completed,
        progressData.total
      );
      localStorage.removeItem("writingSampleProgress");

      setTimeout(() => {
        showNotification(
          `${progressData.skill} progress: ${progressData.completed}/${progressData.total}! 🎧`
        );
      }, 500);
    } catch (error) {
      console.error("Error processing Writing Sample progress:", error);
    }
  }
  // Check for Speak About the Photo progress - NEW
  const speakPhotoProgress = localStorage.getItem("speakPhotoProgress");
  if (speakPhotoProgress) {
    try {
      const progressData = JSON.parse(speakPhotoProgress);
      updateSkillProgress(
        progressData.skill,
        progressData.completed,
        progressData.total
      );
      localStorage.removeItem("speakPhotoProgress");

      setTimeout(() => {
        showNotification(
          `${progressData.skill} progress: ${progressData.completed}/${progressData.total}! 🎤`
        );
      }, 500);
    } catch (error) {
      console.error("Error processing Speak About the Photo progress:", error);
    }
  }
  // In the checkForNewProgress() function, update the Read, Then Speak section to:
  const readThenSpeakProgress = localStorage.getItem("readThenSpeakProgress");
  if (readThenSpeakProgress) {
    try {
      const progressData = JSON.parse(readThenSpeakProgress);
      updateSkillProgress(
        "Read, Then Speak", // Make sure this matches exactly with the HTML
        progressData.completed,
        progressData.total
      );
      localStorage.removeItem("readThenSpeakProgress");
    } catch (error) {
      console.error("Error processing Read Then Speak progress:", error);
    }
  }
  // Check for Speaking Sample progress - NEW
  const speakingSampleProgress = localStorage.getItem("speakingSampleProgress");
  if (speakingSampleProgress) {
    try {
      const progressData = JSON.parse(speakingSampleProgress);
      updateSkillProgress(
        progressData.skill,
        progressData.completed,
        progressData.total
      );
      localStorage.removeItem("speakingSampleProgress");

      setTimeout(() => {
        showNotification(
          `${progressData.skill} progress: ${progressData.completed}/${progressData.total}! 🎤`
        );
      }, 500);
    } catch (error) {
      console.error("Error processing Speaking Sample progress:", error);
    }
  }
  updateOverallProgressBar();
}
// =========================
// WHATSAPP HELP MENU
// =========================

// Variable to control the menu state
let helpMenuOpen = false;

// Function to open/close the menu
function toggleHelpMenu() {
  const helpMenu = document.getElementById("helpMenu");
  if (!helpMenu) return; // Safety check

  helpMenuOpen = !helpMenuOpen;

  if (helpMenuOpen) {
    helpMenu.classList.add("show");
  } else {
    helpMenu.classList.remove("show");
  }
}

// Function to open WhatsApp
function openWhatsApp() {
  const phoneNumber = "966578288175"; // Your phone number
  const message = "Hello, I need help with the SNA English Test";
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
    message
  )}`;

  window.open(whatsappUrl, "_blank");
  toggleHelpMenu(); // Close the menu after clicking
}

// Close menu when clicking outside
document.addEventListener("click", function (event) {
  if (!helpMenuOpen) return; // No need to check if menu is not open

  const helpButton = document.querySelector(".help-button");
  const helpMenu = document.getElementById("helpMenu");
  const helpContainer = document.querySelector(".help-container");

  // Check if elements exist and if click is outside the help container
  if (helpContainer && !helpContainer.contains(event.target)) {
    toggleHelpMenu();
  }
});

// Close menu with ESC key
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && helpMenuOpen) {
    toggleHelpMenu();
  }
});

// Update keyboard shortcuts to include help menu
function addKeyboardShortcuts() {
  document.addEventListener("keydown", function (event) {
    // ESC to close modals and menus
    if (event.key === "Escape") {
      if (helpMenuOpen) {
        toggleHelpMenu();
      } else if (sidebarOpen) {
        toggleSidebar();
      }
    }

    // Ctrl/Cmd + / to open help menu
    if ((event.ctrlKey || event.metaKey) && event.key === "/") {
      event.preventDefault();
      toggleHelpMenu();
    }

    // Ctrl/Cmd + M to toggle sidebar
    if ((event.ctrlKey || event.metaKey) && event.key === "m") {
      event.preventDefault();
      toggleSidebar();
    }
  });
}

// Initialize WhatsApp help menu on page load - Optimized
(function () {
  let helpMenuInitialized = false;
  function initHelpMenu() {
    if (helpMenuInitialized) return;
    helpMenuInitialized = true;

    const helpMenu = document.getElementById("helpMenu");
    const helpButton = document.querySelector(".help-button");

    if (!helpMenu) {
      console.warn("Help menu element not found");
    }

    if (!helpButton) {
      console.warn("Help button element not found");
    }

    if (helpButton) {
      helpButton.setAttribute("aria-haspopup", "true");
      helpButton.setAttribute("aria-expanded", "false");
    }

    if (helpMenu) {
      helpMenu.setAttribute("role", "menu");
      helpMenu.setAttribute("aria-hidden", "true");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHelpMenu);
  } else {
    initHelpMenu();
  }
})();

// Update ARIA states when menu toggles
function updateHelpMenuAriaStates() {
  const helpButton = document.querySelector(".help-button");
  const helpMenu = document.getElementById("helpMenu");

  if (helpButton) {
    helpButton.setAttribute("aria-expanded", helpMenuOpen ? "true" : "false");
  }

  if (helpMenu) {
    helpMenu.setAttribute("aria-hidden", helpMenuOpen ? "false" : "true");
  }
}

// Override the original toggleHelpMenu to include ARIA updates
const originalToggleHelpMenu = toggleHelpMenu;
toggleHelpMenu = function () {
  originalToggleHelpMenu();
  updateHelpMenuAriaStates();
};
// Skill categories mapping
const SKILL_CATEGORIES = {
  READING: [
    "Read and Select",
    "Fill in the Blanks",
    "Read and Complete",
    "Interactive Reading",
  ],
  WRITING: ["Write About the Photo", "Writing Sample"],
  LISTENING: ["Listen and Type", "Interactive Listening"],
  SPEAKING: ["Speak About the Photo", "Read, Then Speak", "Speaking Sample"],
};

// Score conversion tables (updated with more precise mappings)
const SCORE_CONVERSIONS = {
  CEFR: {
    160: { level: "C2", range: "155-160" },
    155: { level: "C2", range: "155-160" },
    150: { level: "C1", range: "135-150" },
    145: { level: "C1", range: "135-150" },
    140: { level: "C1", range: "135-150" },
    135: { level: "C1", range: "135-150" },
    130: { level: "B2", range: "110-130" },
    125: { level: "B2", range: "110-130" },
    120: { level: "B2", range: "110-130" },
    115: { level: "B2", range: "110-130" },
    110: { level: "B2", range: "110-130" },
    105: { level: "B1", range: "75-105" },
    100: { level: "B1", range: "75-105" },
    95: { level: "B1", range: "75-105" },
    90: { level: "B1", range: "75-105" },
    85: { level: "B1", range: "75-105" },
    80: { level: "B1", range: "75-105" },
    75: { level: "B1", range: "75-105" },
    70: { level: "A1 - A2", range: "10-70" },
    65: { level: "A1 - A2", range: "10-70" },
    60: { level: "A1 - A2", range: "10-70" },
    55: { level: "A1 - A2", range: "10-70" },
    default: { level: "A1 - A2", range: "10-55" },
  },

  TOEFL: {
    160: "120",
    155: "119",
    150: "117-118",
    145: "113-116",
    140: "109-112",
    135: "104-108",
    130: "98-103",
    125: "93-97",
    120: "87-92",
    115: "82-86",
    110: "76-81",
    105: "70-75",
    100: "65-69",
    95: "59-64",
    90: "53-58",
    85: "47-52",
    80: "41-46",
    75: "35-40",
    70: "30-34",
    65: "24-29",
    60: "18-23",
    default: "0-17",
  },

  IELTS: {
    160: "8.5-9",
    155: "8",
    150: "8",
    145: "7.5",
    140: "7",
    135: "7",
    130: "6.5",
    125: "6.5",
    120: "6",
    115: "6",
    110: "5.5",
    105: "5.5",
    100: "5",
    95: "5",
    90: "5",
    85: "4.5",
    80: "4.5",
    75: "4",
    70: "4",
    65: "4",
    60: "4",
    default: "0-4",
  },
};

// Function to check if all skills are completed
function checkAllSkillsCompleted() {
  const skillCards = document.querySelectorAll(".skill-card");
  let completedCategories = {
    READING: { completed: 0, total: 0 },
    WRITING: { completed: 0, total: 0 },
    LISTENING: { completed: 0, total: 0 },
    SPEAKING: { completed: 0, total: 0 },
  };

  skillCards.forEach((card) => {
    const skillName = card.querySelector("h3").textContent;
    const progressText = card.querySelector(".progress-text");

    if (progressText) {
      const [completed, total] = progressText.textContent
        .split("/")
        .map(Number);

      // Find which category this skill belongs to
      for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
        if (skills.includes(skillName)) {
          completedCategories[category].completed += completed;
          completedCategories[category].total += total;
          break;
        }
      }
    }
  });

  // Check if all categories are fully completed
  const allCompleted = Object.values(completedCategories).every(
    (cat) => cat.completed === cat.total && cat.total > 0
  );

  if (allCompleted) {
    setTimeout(() => {
      showAverageScoreResults();
    }, 1000);
  }

  return allCompleted;
}

// Function to calculate average scores from session data
function calculateAverageScores() {
  const categories = ["reading", "writing", "listening", "speaking"];
  let categoryScores = {};

  categories.forEach((category) => {
    const sessions = getSessionsForCategory(category);
    if (sessions.length > 0) {
      const avgScore =
        sessions.reduce((sum, session) => sum + session.sessionScore, 0) /
        sessions.length;
      categoryScores[category.toUpperCase()] = Math.round(avgScore);
    } else {
      // Default scores if no sessions found
      categoryScores[category.toUpperCase()] =
        getDefaultCategoryScore(category);
    }
  });

  // Calculate overall average
  const overallAverage = Math.round(
    Object.values(categoryScores).reduce((sum, score) => sum + score, 0) / 4
  );

  return { ...categoryScores, OVERALL: overallAverage };
}

// Function to get sessions for a specific category
function getSessionsForCategory(category) {
  const sessions = [];
  const skillNames = SKILL_CATEGORIES[category.toUpperCase()] || [];

  skillNames.forEach((skillName) => {
    const sessionKey = `${skillName
      .replace(/\s+/g, "_")
      .toLowerCase()}_sessions`;
    try {
      const sessionData = localStorage.getItem(sessionKey);
      if (sessionData) {
        const skillSessions = JSON.parse(sessionData);
        sessions.push(...skillSessions);
      }
    } catch (error) {
      console.error(`Error loading sessions for ${skillName}:`, error);
    }
  });

  return sessions;
}

// Function to get default category score based on completion
function getDefaultCategoryScore(category) {
  // Base scores for completed categories (can be adjusted)
  const baseScores = {
    reading: 85,
    writing: 80,
    listening: 82,
    speaking: 78,
  };

  return baseScores[category] || 75;
}

// Function to convert scores to different standards
function convertScores(snaScore) {
  const conversions = {};

  // Handle CEFR conversion based on comparison table
  if (snaScore >= 160) {
    conversions.CEFR = "C2";
  } else if (snaScore >= 155) {
    conversions.CEFR = "C2";
  } else if (snaScore >= 135) {
    conversions.CEFR = "C1";
  } else if (snaScore >= 110) {
    conversions.CEFR = "B2";
  } else if (snaScore >= 75) {
    conversions.CEFR = "B1";
  } else {
    conversions.CEFR = "A1-A2";
  }

  // Handle TOEFL conversion based on comparison table
  if (snaScore >= 160) {
    conversions.TOEFL = "120";
  } else if (snaScore >= 155) {
    conversions.TOEFL = "119";
  } else if (snaScore >= 150) {
    conversions.TOEFL = "117-118";
  } else if (snaScore >= 145) {
    conversions.TOEFL = "113-116";
  } else if (snaScore >= 140) {
    conversions.TOEFL = "109-112";
  } else if (snaScore >= 135) {
    conversions.TOEFL = "104-108";
  } else if (snaScore >= 130) {
    conversions.TOEFL = "98-103";
  } else if (snaScore >= 125) {
    conversions.TOEFL = "93-97";
  } else if (snaScore >= 120) {
    conversions.TOEFL = "87-92";
  } else if (snaScore >= 115) {
    conversions.TOEFL = "82-86";
  } else if (snaScore >= 110) {
    conversions.TOEFL = "76-81";
  } else if (snaScore >= 105) {
    conversions.TOEFL = "70-75";
  } else if (snaScore >= 100) {
    conversions.TOEFL = "65-69";
  } else if (snaScore >= 95) {
    conversions.TOEFL = "59-64";
  } else if (snaScore >= 90) {
    conversions.TOEFL = "53-58";
  } else if (snaScore >= 85) {
    conversions.TOEFL = "47-52";
  } else if (snaScore >= 80) {
    conversions.TOEFL = "41-46";
  } else if (snaScore >= 75) {
    conversions.TOEFL = "35-40";
  } else if (snaScore >= 70) {
    conversions.TOEFL = "30-34";
  } else if (snaScore >= 65) {
    conversions.TOEFL = "24-29";
  } else if (snaScore >= 60) {
    conversions.TOEFL = "18-23";
  } else {
    conversions.TOEFL = "0-17";
  }

  // Handle IELTS conversion based on comparison table
  if (snaScore >= 160) {
    conversions.IELTS = "8.5-9";
  } else if (snaScore >= 155) {
    conversions.IELTS = "8";
  } else if (snaScore >= 150) {
    conversions.IELTS = "8";
  } else if (snaScore >= 145) {
    conversions.IELTS = "7.5";
  } else if (snaScore >= 140) {
    conversions.IELTS = "7";
  } else if (snaScore >= 135) {
    conversions.IELTS = "7";
  } else if (snaScore >= 130) {
    conversions.IELTS = "6.5";
  } else if (snaScore >= 125) {
    conversions.IELTS = "6.5";
  } else if (snaScore >= 120) {
    conversions.IELTS = "6";
  } else if (snaScore >= 115) {
    conversions.IELTS = "6";
  } else if (snaScore >= 110) {
    conversions.IELTS = "5.5";
  } else if (snaScore >= 105) {
    conversions.IELTS = "5.5";
  } else if (snaScore >= 85) {
    conversions.IELTS = "5";
  } else if (snaScore >= 80) {
    conversions.IELTS = "4.5";
  } else if (snaScore >= 70) {
    conversions.IELTS = "4";
  } else {
    conversions.IELTS = "0-4";
  }

  return conversions;
}

// Function to toggle score table visibility

function showScoreConversions(snaScore) {
  const conversions = convertScores(snaScore);

  return `
    <div class="score-conversion-card">
      <h3>Score Equivalents</h3>
      <div class="conversion-grid">
        <div class="conversion-item">
          <div class="conversion-header">
            <img src="assets/cefr-logo.png" alt="CEFR" class="conversion-logo">
            <span>CEFR</span>
          </div>
          <div class="conversion-score cefr-score">
            <span class="cefr-level" data-level="${conversions.CEFR}">${conversions.CEFR}</span>
            <span class="cefr-actual-score">${conversions.CEFR_SCORE}</span>
          </div>
        </div>
        
        <div class="conversion-item">
          <div class="conversion-header">
            <img src="assets/toefl-logo.png" alt="TOEFL" class="conversion-logo">
            <span>TOEFL iBT</span>
          </div>
          <div class="conversion-score toefl-score">${conversions.TOEFL}</div>
        </div>
        
        <div class="conversion-item">
          <div class="conversion-header">
            <img src="assets/ielts-logo.png" alt="IELTS" class="conversion-logo">
            <span>IELTS</span>
          </div>
          <div class="conversion-score ielts-score">${conversions.IELTS}</div>
        </div>
      </div>
      
      <div class="conversion-note">
        <p>These conversions are based on SNA's official score concordance tables.</p>
        <p>Actual test results may vary slightly.</p>
      </div>
    </div>
  `;
}
// Function to show average score results
function showAverageScoreResults() {
  const scores = calculateAverageScores();
  const overallConversions = convertScores(scores.OVERALL);

  // Determine the score range based on the user's score
  const scoreRange = getScoreRange(scores.OVERALL);
  const proficiencyLevel = getProficiencyLevel(scores.OVERALL);

  // Create modal HTML
  const modalHTML = `
    <div class="score-modal-overlay" id="scoreModalOverlay">
      <div class="score-modal large-modal">
        <div class="score-modal-header">
          <h2>🎉 Well done!</h2>
          <p>You completed the practice test.</p>
          <button class="score-modal-close" onclick="closeScoreModal()">&times;</button>
        </div>
        
        <div class="score-modal-content">
          <!-- Overall Score -->
          <div class="overall-score-section">
            <div class="overall-score-display">
              <div class="score-circle">
                <div class="score-number">${scores.OVERALL}</div>
                <div class="score-range">${scoreRange}</div>
                <div class="score-label">${proficiencyLevel}</div>
              </div>
            </div>
            
            <!-- Quick Conversions -->
            <div class="equivalents-grid">
              <div class="equivalent-box">
                <div class="equivalent-label">IELTS EQUIVALENT</div>
                <div class="equivalent-score">${overallConversions.IELTS}</div>
              </div>
              <div class="equivalent-box">
                <div class="equivalent-label">TOEFL iBT EQUIVALENT</div>
                <div class="equivalent-score">${overallConversions.TOEFL}</div>
              </div>
            </div>
          </div>
          
          <!-- Category Breakdown -->
          <div class="category-breakdown">
            <h3>Category Breakdown</h3>
            <div class="category-scores">
              ${Object.entries(scores)
                .filter(([key]) => key !== "OVERALL")
                .map(([category, score]) => {
                  const conversions = convertScores(score);
                  return `
                  <div class="category-score-item">
                    <div class="category-header">
                      <div class="category-icon ${category.toLowerCase()}-icon">
                        ${getCategoryIcon(category)}
                      </div>
                      <div class="category-info">
                        <div class="category-name">${category}</div>
                        <div class="category-sna-score">${score}</div>
                      </div>
                    </div>
                    <div class="category-conversions">
                      <span class="mini-conversion">CEFR: ${
                        conversions.CEFR
                      }</span>
                      <span class="mini-conversion">TOEFL: ${
                        conversions.TOEFL
                      }</span>
                      <span class="mini-conversion">IELTS: ${
                        conversions.IELTS
                      }</span>
                    </div>
                  </div>
                `;
                })
                .join("")}
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="score-modal-actions">
            <button class="btn-secondary" onclick="shareScores()">Share Results</button>
            <button class="btn-primary" onclick="startNewPractice()">Continue Practicing</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add modal to page
  document.body.insertAdjacentHTML("beforeend", modalHTML);
  setTimeout(() => {
    const scoreCircle = document.querySelector(".score-circle");
    if (scoreCircle) {
      scoreCircle.style.setProperty("--score", scores.OVERALL);
      scoreCircle.setAttribute("data-score", scores.OVERALL);
    }
    document.getElementById("scoreModalOverlay").classList.add("show");
  }, 100);
  // Add animation
  setTimeout(() => {
    document.getElementById("scoreModalOverlay").classList.add("show");
  }, 100);

  // Save completion achievement
  saveCompletionAchievement(scores);
}
// Function to determine score range based on user's score
function getScoreRange(userScore) {
  return `${userScore}-160`;
}

// Function to determine proficiency level based on user's score
function getProficiencyLevel(userScore) {
  if (userScore >= 145) return "ADVANCED";
  if (userScore >= 125) return "INTERMEDIATE";
  if (userScore >= 100) return "ELEMENTARY";
  if (userScore >= 75) return "BEGINNER";
  return "BASIC";
}
// Function to get category icon
function getCategoryIcon(category) {
  const icons = {
    READING: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
    </svg>`,
    WRITING: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
    </svg>`,
    LISTENING: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
    </svg>`,
    SPEAKING: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10h5.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5H16v-2.74c0-.92-.74-1.66-1.66-1.66-.68 0-1.28.42-1.53 1.05L12 17l-.81-.95c-.25-.63-.85-1.05-1.53-1.05C8.74 15 8 15.74 8 16.66V19.5H5.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5H12c3.53 0 6.43-2.61 6.92-6H17.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5H18.92C18.43 8.61 15.53 6 12 6s-6.43 2.61-6.92 6H3.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h1.58C5.57 17.39 8.47 20 12 20z"/>
    </svg>`,
  };
  return icons[category] || "";
}

// Function to close score modal
function closeScoreModal() {
  const modal = document.getElementById("scoreModalOverlay");
  if (modal) {
    modal.classList.remove("show");
    setTimeout(() => {
      modal.remove();
    }, 300);
  }
}

// Function to share scores
function shareScores() {
  const scores = calculateAverageScores();
  const overallConversions = convertScores(scores.OVERALL);

  const shareText = `🎉 I completed all SNAEnglish Test practice skills!

My Average Scores:
• Overall: ${scores.OVERALL}/160
• CEFR: ${overallConversions.CEFR} (${overallConversions.CEFR_RANGE})
• TOEFL iBT: ${overallConversions.TOEFL}  
• IELTS: ${overallConversions.IELTS}

Category Breakdown:
• Reading: ${scores.READING}
• Writing: ${scores.WRITING}
• Listening: ${scores.LISTENING}
• Speaking: ${scores.SPEAKING}

#SNAEnglishTest #EnglishProficiency`;

  if (navigator.share) {
    navigator.share({
      title: "My SNAEnglish Test Scores",
      text: shareText,
    });
  } else {
    navigator.clipboard.writeText(shareText).then(() => {
      showNotification("Scores copied to clipboard! 📋");
    });
  }
}

// Function to start new practice
function startNewPractice() {
  closeScoreModal();
  showNotification("Great job! Keep practicing to improve your scores! 🚀");
}

// Function to save completion achievement
function saveCompletionAchievement(scores) {
  const achievement = {
    timestamp: new Date().toISOString(),
    scores: scores,
    conversions: convertScores(scores.OVERALL),
    completionId: Date.now(),
  };

  try {
    const existingAchievements = localStorage.getItem("completionAchievements");
    const achievements = existingAchievements
      ? JSON.parse(existingAchievements)
      : [];
    achievements.push(achievement);

    // Keep only last 10 achievements
    if (achievements.length > 10) {
      achievements.splice(0, achievements.length - 10);
    }

    localStorage.setItem(
      "completionAchievements",
      JSON.stringify(achievements)
    );
  } catch (error) {
    console.error("Error saving completion achievement:", error);
  }
}
