import { useEffect, useRef } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { pathToRoute } from "../lib/pathToRoute";
import { useAuth } from "../auth/useAuth";
import { AppShell, Card, Button, Icon } from "../components/ui";
import { ROUTES } from "../routes/routes";
import "./styles/home.css";

const ASSET = (path) => `/assets/${path}`;

export default function Home() {
  const rootRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Default landing: unauthenticated users go to login (auth loading handled by App).
  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  useEffect(() => {
    window.__REACT_NAVIGATE = (path) => navigate(pathToRoute(path));
    if (typeof window.initHome === "function") {
      window.initHome();
    }
    return () => {
      window.__REACT_NAVIGATE = null;
    };
  }, [navigate]);

  return (
    <AppShell>
      <div ref={rootRef}>
        <header className="header">
          <div className="header-content">
            <Button
              className="menu-btn"
              onClick={() => window.toggleSidebar && window.toggleSidebar()}
            >
              ☰
            </Button>
            <a href="/" className="logo">
              <Icon
                alt="logo"
                className="_2lOwd _1I5iz _33JSt"
                src={ASSET("sna-icon-bird.png")}
                loading="eager"
                fetchPriority="high"
              />
            </a>
            <div className="header-icons">
              {user && (
                <Link to={ROUTES.LOGOUT} className="header-sign-out">
                  Sign out
                </Link>
              )}
              <div className="icon-decoration">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 48 48"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="#f8f9fa"
                    stroke="#FFF3E0"
                    strokeWidth="1"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="14"
                    fill="#FFF3E0"
                    stroke="#ffc515"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M24 12L26.472 18.944L34 18.944L28.764 23.056L31.236 30L24 25.888L16.764 30L19.236 23.056L14 18.944L21.528 18.944L24 12Z"
                    fill="#ffc515"
                  />
                  <circle cx="24" cy="8" r="2" fill="#ffc515" />
                  <circle cx="24" cy="40" r="2" fill="#ffc515" />
                  <circle cx="8" cy="24" r="2" fill="#ffc800" />
                  <circle cx="40" cy="24" r="2" fill="#ffc800" />
                  <circle cx="35.5" cy="12.5" r="1.5" fill="#ff4b4b" />
                  <circle cx="12.5" cy="12.5" r="1.5" fill="#ff4b4b" />
                  <circle cx="35.5" cy="35.5" r="1.5" fill="#ff4b4b" />
                  <circle cx="12.5" cy="35.5" r="1.5" fill="#ff4b4b" />
                </svg>
              </div>
            </div>
          </div>
        </header>

        <div className="app-container">
          <aside className="sidebar" id="sidebar">
            <div className="sidebar-content">
              <div className="sidebar-item active">
                <img alt="" className="_3HbAQ" src={ASSET("5.svg")} />
                <span>MY TESTS</span>
              </div>
              <div className="sidebar-item highlighted">
                <img alt="" className="_3HbAQ" src={ASSET("4.svg")} />
                <span>PRACTICE</span>
              </div>
              <div className="sidebar-item">
                <img alt="" className="_3HbAQ" src={ASSET("7.svg")} />
                <span>TEST INFO</span>
              </div>
            </div>
            <div className="sidebar-help">
              <div className="help-container">
                <div className="help-menu" id="helpMenu">
                  <a
                    href="#!"
                    className="help-menu-item"
                    onClick={(e) => {
                      e.preventDefault();
                      window.openWhatsApp && window.openWhatsApp();
                    }}
                  >
                    <div className="help-menu-icon whatsapp-icon">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="#25D366"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                      </svg>
                    </div>
                    <span>WhatsApp Support</span>
                  </a>
                </div>
                <Button
                  className="help-button"
                  onClick={() =>
                    window.toggleHelpMenu && window.toggleHelpMenu()
                  }
                >
                  <span className="help-icon-text">
                    <Icon alt="speech" src={ASSET("1.svg")} />
                  </span>
                  <span>HELP</span>
                </Button>
              </div>
            </div>
          </aside>

          <main className="main-content">
            <section
              className="my-tests-content"
              id="myTestsContent"
              style={{ display: "none" }}
            >
              <div className="certification-hero">
                <div className="certification-text">
                  <h1>
                    Certify your English and access
                    <br />
                    5,500+ institutions globally
                  </h1>
                  <button type="button" className="purchase-test-btn">
                    <a
                      href="/"
                      style={{ textDecoration: "none", color: "#fff" }}
                    >
                      PRACTICE ON A TEST
                    </a>
                  </button>
                </div>
                <div className="certification-characters">
                  <img
                    alt=""
                    className="_3PEpx"
                    src="https://dy8n3onijof8f.cloudfront.net/static/images/wp/f104a14cc2ea377b5143.svg"
                  />
                </div>
              </div>
              <div className="action-cards">
                <Card className="action-card practice-card">
                  <div className="card-icon">
                    <Icon alt="" className="uAGm2" src={ASSET("4.svg")} />
                  </div>
                  <div className="card-content">
                    <h3>Practice free</h3>
                  </div>
                </Card>
                <Card className="action-card learn-card">
                  <div className="card-icon">
                    <Icon alt="" className="uAGm2" src={ASSET("7.svg")} />
                  </div>
                  <div className="card-content">
                    <h3>Learn about the test</h3>
                  </div>
                </Card>
              </div>
            </section>

            <section
              className="test-info-content"
              id="testInfoContent"
              style={{ display: "none" }}
            >
              <div className="test-info-hero">
                <div className="test-info-text">
                  <h1>Learn about the test</h1>
                </div>
                <div className="test-info-characters">
                  <img
                    alt=""
                    className="test-info-img"
                    src="https://dy8n3onijof8f.cloudfront.net/static/images/wp/03740b1e7e77ad332349.svg"
                  />
                </div>
              </div>
              <div className="info-cards">
                <div className="info-cards-row">
                  <div className="info-card">
                    <div className="info-card-icon">
                      <img alt="" className="uAGm2" src={ASSET("41.svg")} />
                    </div>
                    <div className="info-card-content">
                      <h3>Review rules</h3>
                    </div>
                  </div>
                  <div className="info-card">
                    <div className="info-card-icon">
                      <img alt="" className="uAGm2" src={ASSET("40.svg")} />
                    </div>
                    <div className="info-card-content">
                      <h3>Prepare your space</h3>
                    </div>
                  </div>
                </div>
                <div className="info-cards-row">
                  <div className="info-card">
                    <div className="info-card-icon">
                      <img alt="" className="uAGm2" src={ASSET("39.svg")} />
                    </div>
                    <div className="info-card-content">
                      <h3>Understand scoring</h3>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="practice-content" id="practiceContent">
              <Card className="overall-progress-card">
                <div className="overall-progress-header">
                  <span className="overall-progress-label">
                    Overall Progress
                  </span>
                  <span
                    className="overall-progress-percent"
                    id="overallProgressPercent"
                  >
                    0%
                  </span>
                </div>
                <div className="overall-progress-bar">
                  <div
                    className="overall-progress-fill"
                    id="overallProgressFill"
                  />
                </div>
              </Card>
              <section className="hero-section">
                <div className="hero-content">
                  <div className="hero-text">
                    <h1>Take a full length practice test</h1>
                    <Button className="practice-free-btn">PRACTICE NOW</Button>
                  </div>
                  <div className="hero-image">
                    <img
                      alt=""
                      className="_3klvD _3zRF-"
                      src={ASSET("38.svg")}
                    />
                  </div>
                </div>
              </section>
              <section className="practice-skills">
                <h2>Practice skills</h2>
                <div className="skill-categories">
                  <Button className="category-btn active">ALL</Button>
                  <Button className="category-btn">SPEAKING</Button>
                  <Button className="category-btn">WRITING</Button>
                  <Button className="category-btn">READING</Button>
                  <Button className="category-btn">LISTENING</Button>
                </div>
                <div className="skills-grid">
                  {[
                    [
                      {
                        name: "Read and Select",
                        icon: "37.svg",
                        total: 6,
                        iconClass: "read-select-icon",
                      },
                      {
                        name: "Fill in the Blanks",
                        icon: "36.svg",
                        total: 6,
                        iconClass: "fill-blanks-icon",
                        wrap: "brackets",
                      },
                    ],
                    [
                      {
                        name: "Read and Complete",
                        icon: "35.svg",
                        total: 6,
                        iconClass: "read-complete-icon",
                        wrap: "lines",
                      },
                      {
                        name: "Listen and Type",
                        icon: "34.svg",
                        total: 6,
                        iconClass: "listen-type-icon",
                      },
                    ],
                    [
                      {
                        name: "Write About the Photo",
                        icon: "33.svg",
                        total: 3,
                        iconClass: "write-photo-icon",
                      },
                      {
                        name: "Speak About the Photo",
                        icon: "32.svg",
                        total: 3,
                        iconClass: "speak-photo-icon",
                      },
                    ],
                    [
                      {
                        name: "Read, Then Speak",
                        icon: "31.svg",
                        total: 3,
                        iconClass: "read-speak-icon",
                      },
                      {
                        name: "Interactive Reading",
                        icon: "30.svg",
                        total: 6,
                        iconClass: "interactive-reading-icon",
                      },
                    ],
                    [
                      {
                        name: "Interactive Listening",
                        icon: "29.svg",
                        total: 6,
                        iconClass: "interactive-listening-icon",
                      },
                      {
                        name: "Writing Sample",
                        icon: "28.svg",
                        total: 3,
                        iconClass: "writing-sample-icon",
                      },
                    ],
                    [
                      {
                        name: "Speaking Sample",
                        icon: "27.svg",
                        total: 3,
                        iconClass: "speaking-sample-icon",
                      },
                    ],
                  ].map((row, rowIndex) => (
                    <div key={rowIndex} className="skills-row">
                      {row.map((skill) => (
                        <div key={skill.name} className="skill-card">
                          <div className={`skill-icon ${skill.iconClass}`}>
                            {skill.wrap === "brackets" ? (
                              <span className="brackets-icon">
                                <img
                                  alt=""
                                  className="_1DNrh"
                                  src={ASSET(skill.icon)}
                                />
                              </span>
                            ) : skill.wrap === "lines" ? (
                              <span className="lines-icon">
                                <img
                                  alt=""
                                  className="_1DNrh"
                                  src={ASSET(skill.icon)}
                                />
                              </span>
                            ) : (
                              <img
                                alt=""
                                className="_1DNrh"
                                src={ASSET(skill.icon)}
                              />
                            )}
                          </div>
                          <div className="skill-info">
                            <h3>{skill.name}</h3>
                            <div className="progress-container">
                              <div className="progress-bar">
                                <div className="progress-fill" />
                              </div>
                              <span className="progress-text">
                                0/{skill.total}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            </section>

            {/* Sub-pages: Review Rules, Prepare Space, Understand Scoring - same structure as index */}
            <section
              className="review-rules-content"
              id="reviewRulesContent"
              style={{ display: "none" }}
            >
              <div className="review-rules-header">
                <Button
                  className="back-btn"
                  onClick={() =>
                    window.navigateToTestInfo && window.navigateToTestInfo()
                  }
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M10 12L6 8L10 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Back
                </Button>
                <div className="rules-hero">
                  <div className="rules-text">
                    <h1>Review rules</h1>
                  </div>
                  <div className="rules-video">
                    <div className="video-container">
                      <img
                        src="https://dy8n3onijof8f.cloudfront.net/static/images/wp/03740b1e7e77ad332349.svg"
                        alt="Review rules video"
                        className="video-thumbnail"
                      />
                      <div className="play-button">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="white"
                        >
                          <path d="M8 5V19L19 12L8 5Z" />
                        </svg>
                      </div>
                      <div className="video-duration">1:31</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="rules-sections">
                <div className="rules-section">
                  <h2>During the test</h2>
                  <div className="rules-list">
                    {[
                      {
                        text: "Don't look away from the screen, except when typing",
                        icon: "no-eyes.svg",
                      },
                      {
                        text: "Don't memorize or read answers from other sources",
                        icon: "25.svg",
                      },
                      {
                        text: "Don't speak until instructed to",
                        icon: "24.svg",
                      },
                      {
                        text: "Don't take notes or record questions",
                        icon: "23.svg",
                      },
                      {
                        text: "Don't interact with anyone during the test",
                        icon: "22.svg",
                      },
                      {
                        text: "Don't use a VPN, virtual machine, or assistive software",
                        icon: "21.svg",
                      },
                      {
                        text: "Don't use headphones or earbuds, and keep your ears visible",
                        icon: "20.svg",
                      },
                    ].map((item, i) => (
                      <div key={i} className="rule-item">
                        <div className="rule-icon prohibition">
                          <img
                            alt="icon"
                            className="_1FsFu"
                            src={ASSET(item.icon)}
                          />
                        </div>
                        <p>{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rules-section">
                  <h2>Computer setup</h2>
                  <div className="rules-list">
                    <div className="rule-item">
                      <div className="rule-icon allowed">
                        <img
                          alt="icon"
                          className="_1FsFu"
                          src={ASSET("19.svg")}
                        />
                      </div>
                      <p>Use only one keyboard, mouse, and phone camera</p>
                    </div>
                    <div className="rule-item">
                      <div className="rule-icon allowed">
                        <img
                          alt="icon"
                          className="_1FsFu"
                          src={ASSET("18.svg")}
                        />
                      </div>
                      <p>
                        Stay in the camera frame and keep your ears, eyes, and
                        mouth visible
                      </p>
                    </div>
                    <div className="rule-item">
                      <div className="rule-icon prohibition">
                        <img
                          alt="icon"
                          className="_1FsFu"
                          src={ASSET("17.svg")}
                        />
                      </div>
                      <p>
                        Remove extra screens, devices, and paper from the
                        testing area
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rules-section">
                  <h2>Phone camera</h2>
                  <div className="rules-list">
                    <div className="rule-item">
                      <div className="rule-icon allowed">
                        <img
                          alt="icon"
                          className="_1FsFu"
                          src={ASSET("16.svg")}
                        />
                      </div>
                      <p>
                        Capture your entire screen and keyboard with your phone
                        camera
                      </p>
                    </div>
                    <div className="rule-item">
                      <div className="rule-icon prohibition">
                        <img
                          alt="icon"
                          className="_1FsFu"
                          src={ASSET("15.svg")}
                        />
                      </div>
                      <p>Don't interfere with the phone camera recording</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section
              className="prepare-space-content"
              id="prepareSpaceContent"
              style={{ display: "none" }}
            >
              <div className="prepare-space-header">
                <Button
                  className="back-btn"
                  onClick={() =>
                    window.navigateToTestInfo && window.navigateToTestInfo()
                  }
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M10 12L6 8L10 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Back
                </Button>
                <div className="prepare-space-hero">
                  <h1>Prepare your space</h1>
                </div>
              </div>
              <div className="space-requirements">
                {[
                  "A quiet, well-lit room without distractions",
                  "Reliable internet",
                  "A computer with camera, microphone, and speakers",
                  "Passport, government ID, or driver's license",
                  "A fully charged phone with a camera",
                ].map((text, i) => (
                  <div key={i} className="requirement-item">
                    <div className="requirement-icon">
                      <img
                        alt="icon"
                        className="_1FsFu"
                        src={ASSET(`${14 - i}.svg`)}
                      />
                    </div>
                    <p>{text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section
              className="understand-scoring-content"
              id="understandScoringContent"
              style={{ display: "none" }}
            >
              <div className="understand-scoring-header">
                <Button
                  className="back-btn"
                  onClick={() =>
                    window.navigateToTestInfo && window.navigateToTestInfo()
                  }
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M10 12L6 8L10 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Back
                </Button>
                <div className="scoring-hero">
                  <h1>Understand scoring</h1>
                </div>
              </div>
              <div className="scoring-section">
                <p className="scoring-title">
                  Scores are on a scale of 10–160. Individual subscores average
                  to the overall score.
                </p>
                <div className="subscores-grid">
                  {["Speaking", "Writing", "Reading", "Listening"].map(
                    (label, i) => (
                      <div key={label} className="subscore-item">
                        <div className={`subscore-icon ${label.toLowerCase()}`}>
                          <img
                            alt={label}
                            className="_10ECt"
                            src={ASSET(`${9 - i}.svg`)}
                          />
                        </div>
                        <span>{label}</span>
                      </div>
                    ),
                  )}
                </div>
                <p className="integrated-description">
                  Integrated subscores are the average of two individual
                  subscores.
                </p>
                <div className="integrated-subscores">
                  {[
                    "Production",
                    "Literacy",
                    "Comprehension",
                    "Conversation",
                  ].map((name, i) => (
                    <div key={name} className="integrated-item">
                      <div className="integrated-icons">
                        <div className="small-icon writing">
                          <img
                            alt="Writing"
                            className="_1MoQq"
                            src={ASSET(
                              i === 0
                                ? "8.svg"
                                : i === 1
                                  ? "7.svg"
                                  : i === 2
                                    ? "6.svg"
                                    : "9.svg",
                            )}
                            style={{ width: 50, height: 50 }}
                          />
                        </div>
                        <p className="plus-symbol">+</p>
                        <div className="small-icon speaking">
                          <img
                            alt="Speaking"
                            className="_1MoQq"
                            src={ASSET(
                              i === 0
                                ? "9.svg"
                                : i === 1
                                  ? "8.svg"
                                  : i === 2
                                    ? "7.svg"
                                    : "6.svg",
                            )}
                            style={{ width: 50, height: 50 }}
                          />
                        </div>
                      </div>
                      <span>{name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="scoring-section">
                <h2>Overall score comparison</h2>
                <div className="comparison-table">
                  <div className="comparison-column">
                    <div className="test-header sna">
                      <div className="test-logo">
                        <img alt="logo" src={ASSET("2.svg")} />
                      </div>
                      <span className="test-name">CEFR</span>
                    </div>
                    {[
                      160, 155, 150, 145, 140, 135, 130, 125, 120, 115, 110,
                      105, 100, 95, 90, 85, 80, 75, 70, 65, 60,
                    ].map((n, i) => (
                      <div
                        key={`cefr-${n}`}
                        className={`score-row ${i === 20 ? "bottom" : ""}`}
                      >
                        {i === 20 ? "10-55" : n}
                      </div>
                    ))}
                    {["C2", "C1", "B2", "B1", "A1 A2"].map((level) => (
                      <div
                        key={level}
                        className={`cefr-level ${level.toLowerCase().replace(" ", "-")}`}
                      >
                        {level}
                      </div>
                    ))}
                  </div>
                  <div className="comparison-column">
                    <div className="test-header toefl">
                      <div className="test-logo">
                        <img alt="logo" src={ASSET("2.svg")} />
                      </div>
                      <span className="test-name">TOEFL iBT</span>
                    </div>
                    {[
                      160, 155, 150, 145, 140, 135, 130, 125, 120, 115, 110,
                      105, 100, 95, 90, 85, 80, 75, 70, 65, 60,
                    ].map((n, i) => (
                      <div
                        key={`toefl-row-${n}`}
                        className={`score-row ${i === 20 ? "bottom" : ""}`}
                      >
                        {i === 20 ? "10-55" : n}
                      </div>
                    ))}
                    {[
                      "120",
                      "119",
                      "117-118",
                      "113-116",
                      "109-112",
                      "104-108",
                      "98-103",
                      "93-97",
                      "87-92",
                      "82-86",
                      "76-81",
                      "76-75",
                      "65-69",
                      "59-64",
                      "53-58",
                      "47-52",
                      "41-46",
                      "35-40",
                      "30-34",
                      "24-29",
                      "18-23",
                      "0-17",
                    ].map((score, i) => (
                      <div key={`toefl-${i}`} className="toefl-score">
                        {score}
                      </div>
                    ))}
                  </div>
                  <div className="comparison-column">
                    <div className="test-header ielts">
                      <div className="test-logo">
                        <img alt="logo" src={ASSET("2.svg")} />
                      </div>
                      <span className="test-name">IELTS</span>
                    </div>
                    {[
                      160, 155, 150, 145, 140, 135, 130, 125, 120, 115, 110,
                      105, 100, 95, 90, 85, 80, 75, 70, 65, 60,
                    ].map((n, i) => (
                      <div
                        key={`ielts-row-${n}`}
                        className={`score-row ${i === 20 ? "bottom" : ""}`}
                      >
                        {i === 20 ? "10-55" : n}
                      </div>
                    ))}
                    {[
                      "8.5-9",
                      "8",
                      "7.5",
                      "7",
                      "6.5",
                      "6",
                      "5.5",
                      "5",
                      "4.5",
                      "4",
                      "0-4",
                    ].map((score, i) => (
                      <div key={`ielts-${i}`} className="ielts-score">
                        {score}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </AppShell>
  );
}
