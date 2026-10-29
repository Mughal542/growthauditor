(function () {
  "use strict";

  const config = window.AUDIT_CONFIG;
  const scoring = window.AuditScoring;
  const app = document.getElementById("app");
  const AUDITS_KEY = "creatix-growth-auditor:audit-history:v1";
  const PREFS_KEY = "creatix-growth-auditor:preferences:v1";
  const stepTitles = ["Website details", ...config.categories.map((category) => category.short), "Review"];
  const priorityLabels = { high: "High priority", medium: "Medium priority", low: "Low priority" };
  const state = {
    view: "home", step: 0, business: emptyBusiness(), answers: {}, errors: {},
    activeAuditId: null, recommendationFilter: "all", recommendationSort: "priority",
    compareNewerId: null, compareOlderId: null, toast: "", processing: false,
    preferences: loadObject(PREFS_KEY, { contactUrl: config.brand.profileUrl })
  };
  let audits = loadAudits();

  function emptyBusiness() {
    return { name: "", url: "" };
  }

  function loadObject(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? { ...fallback, ...JSON.parse(value) } : { ...fallback };
    } catch (_) {
      return { ...fallback };
    }
  }

  function loadAudits() {
    try {
      const value = localStorage.getItem(AUDITS_KEY);
      const parsed = value ? JSON.parse(value) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item) => item && typeof item.id === "string" && item.business && typeof item.business.name === "string" && item.answers && typeof item.answers === "object")
        .map((item) => ({ ...item, result: scoring.scoreAudit(item.answers),
          completedRecommendations: Array.isArray(item.completedRecommendations) ? item.completedRecommendations.filter((id) => scoring.allQuestions().some((question) => question.id === id)) : [],
          completedPlanDays: Array.isArray(item.completedPlanDays) ? item.completedPlanDays.filter((id) => /^day-[1-7]$/.test(id)) : [] }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (_) {
      return [];
    }
  }

  function persistAudits() {
    try {
      localStorage.setItem(AUDITS_KEY, JSON.stringify(audits));
      return true;
    } catch (_) {
      state.toast = "This browser could not save the audit. Check its available site storage and try again.";
      return false;
    }
  }

  function persistPreferences() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(state.preferences));
      return true;
    } catch (_) {
      state.toast = "This browser could not save the contact link preference.";
      return false;
    }
  }

  function el(tag, attrs, ...children) {
    const element = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value === null || value === undefined || value === false) continue;
      if (key === "className") element.className = value;
      else if (key === "htmlFor") element.htmlFor = value;
      else if (key === "value") element.value = value;
      else if (key === "checked" || key === "disabled" || key === "required" || key === "selected" || key === "multiple") element[key] = Boolean(value);
      else if (key === "style" && typeof value === "object") Object.entries(value).forEach(([styleKey, styleValue]) => element.style.setProperty(styleKey, styleValue));
      else if (key === "dataset" && typeof value === "object") Object.entries(value).forEach(([dataKey, dataValue]) => { element.dataset[dataKey] = String(dataValue); });
      else element.setAttribute(key, value === true ? "" : String(value));
    }
    for (const child of children.flat(Infinity)) {
      if (child === null || child === undefined || child === false) continue;
      element.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return element;
  }

  const paths = {
    arrow: "M5 12h14M13 6l6 6-6 6", sparkle: "M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Zm7 12 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z",
    search: "M20 20l-4.5-4.5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z", compass: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm4.2-14.2-2.7 6.5-6.5 2.7 2.7-6.5 6.5-2.7Z",
    target: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-5a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-5h.01", checklist: "M9 6h11M9 12h11M9 18h11M4 6l1.5 1.5L7.5 5M4 12l1.5 1.5L7.5 11M4 18l1.5 1.5L7.5 17", file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6M8 15h8M8 19h8",
    chart: "M4 19V5m0 14h17M8 15l3-4 3 2 5-7", shield: "M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Zm-3-11 2 2 4-4", check: "m5 12 4 4L19 6",
    clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-16v6l4 2", book: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22Zm0 0V22m4-15h8m-8 4h8", cursor: "M5 3l14 10-7 1-3 7L5 3Z",
    close: "m6 6 12 12M18 6 6 18", plus: "M12 5v14M5 12h14", info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 11v6m0-10h.01", globe: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm-9-10h18M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"
  };

  function icon(name, className = "icon") {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.7");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", className);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", paths[name] || paths.sparkle);
    svg.append(path);
    return svg;
  }

  function button(label, action, kind = "secondary", attrs = {}) {
    return el("button", { type: "button", className: `button ${kind}`, "data-action": action, ...attrs }, label);
  }

  function setToast(message) {
    state.toast = message;
    renderApp();
  }

  function logo() {
    return el("a", { href: "#top", className: "brand-lockup", "data-action": "home-link", "aria-label": "Growth Auditor by Creatix Studio home" },
      el("img", { className: "brand-symbol", src: "./assets/creatix-studio-symbol.png", alt: "" }),
      el("span", { className: "brand-copy" }, el("strong", {}, "Growth Auditor"), el("small", {}, "BY CREATIX STUDIO"))
    );
  }

  function header() {
    const nav = el("nav", { className: "main-nav", "aria-label": "Main navigation" },
      el("button", { type: "button", className: state.view === "home" ? "nav-link active" : "nav-link", "data-action": "navigate", "data-view": "home" }, "Growth Auditor"),
      el("button", { type: "button", className: state.view === "about" ? "nav-link active" : "nav-link", "data-action": "navigate", "data-view": "about" }, "About"),
      el("button", { type: "button", className: state.view === "history" ? "nav-link active" : "nav-link", "data-action": "navigate", "data-view": "history" }, "Saved audits")
    );
    return el("header", { className: "site-header", id: "top" }, el("div", { className: "header-inner shell" }, logo(), nav,
      button("Start an audit", "start-audit", "primary header-cta", { "aria-label": "Start a new website audit" })));
  }

  function footer() {
    return el("footer", { className: "site-footer" },
      el("div", { className: "shell footer-inner" },
        el("div", { className: "footer-brand" }, el("img", { className: "brand-symbol footer-symbol", src: "./assets/creatix-studio-symbol.png", alt: "" }), el("div", {}, el("strong", {}, "Growth Auditor"), el("small", {}, "by Creatix Studio"))),
        el("p", {}, "A private, practical checklist for your next website improvement."),
        el("div", { className: "footer-links" }, button("About Creatix Studio", "navigate", "text-button", { "data-view": "about" }), el("a", { className: "text-button profile-link", href: config.brand.profileUrl, target: "_blank", rel: "noopener noreferrer" }, "Visit Creatix Studio"), button("Contact settings", "contact-open", "text-button")),
        el("small", { className: "footer-privacy" }, "Your answers stay in this browser. No website scanning, analytics, or external services.")
      ));
  }

  function contactDialog() {
    const dialog = el("dialog", { className: "contact-dialog", id: "contactDialog", "aria-labelledby": "contactTitle" },
      el("div", { className: "dialog-top" }, el("div", {}, el("span", { className: "eyebrow" }, "Creatix Studio"), el("h2", { id: "contactTitle" }, "Set a contact destination")),
        el("button", { type: "button", className: "icon-button", "data-action": "contact-close", "aria-label": "Close contact settings" }, icon("close"))),
      el("p", { className: "muted" }, "Creatix Studio’s main profile is prefilled. You can replace it with a separate contact destination if the Studio provides one. This app does not send messages; it only opens the destination you configure."),
      el("label", { className: "field-label", htmlFor: "contactUrl" }, "Contact URL or mail link"),
      el("input", { id: "contactUrl", type: "text", className: "text-input", placeholder: "https://… or mailto:…", autocomplete: "url", value: state.preferences.contactUrl || "", "aria-describedby": "contactHint" }),
      el("p", { className: "field-hint", id: "contactHint" }, "Saved only in this browser. Leave blank to keep the call to action unconfigured."),
      el("p", { className: "contact-error", id: "contactError", role: "alert" }),
      el("div", { className: "dialog-actions" }, button("Save link", "contact-save", "secondary"), button("Open configured link", "contact-open-link", "primary", { disabled: !state.preferences.contactUrl }))
    );
    return dialog;
  }

  function shellView(content) {
    app.replaceChildren(header(), el("main", { id: "mainContent" }, content), footer(), contactDialog());
  }

  function sectionHeading(eyebrow, title, description) {
    return el("div", { className: "section-heading" }, el("span", { className: "eyebrow" }, eyebrow), el("h2", {}, title), el("p", {}, description));
  }

  function demoRing() {
    return el("div", { className: "score-ring demo-ring", style: { "--score": "76%" } }, el("span", {}, "76"), el("small", {}, "/100"));
  }

  function demoPreview() {
    const demos = [
      ["SEO readiness", 76], ["User experience", 80], ["Conversion", 70],
      ["Content quality", 74], ["Branding", 82], ["Mobile & technical", 72]
    ];
    return el("div", { className: "preview-wrap" },
      el("section", { className: "preview-card", "aria-label": "Illustrative audit score preview" },
        el("div", { className: "preview-card-head" }, el("div", {}, el("span", { className: "eyebrow" }, "GROWTH SNAPSHOT"), el("h2", {}, "Your website overview")), el("span", { className: "preview-dot" }, "Demo")),
        el("div", { className: "preview-score-row" }, demoRing(), el("div", { className: "preview-score-copy" }, el("strong", {}, "Good Foundation"), el("span", {}, "Room to improve"), el("small", {}, "Sample score only"))),
        el("div", { className: "preview-bars" }, ...demos.map(([label, score]) => el("div", { className: "preview-bar-row" }, el("span", {}, label), el("div", { className: "bar-track" }, el("span", { style: { width: `${score}%` } })), el("b", {}, score)))),
        el("div", { className: "preview-foot" }, icon("shield"), el("span", {}, "A checklist-based sample, never a live scan."))
      ),
      el("div", { className: "preview-float" }, el("span", { className: "float-icon" }, icon("checklist")), el("div", {}, el("strong", {}, "Clear next steps"), el("small", {}, "Built around your answers")))
    );
  }

  function featureCard(iconName, title, text) {
    return el("article", { className: "feature-card" }, el("span", { className: "feature-icon" }, icon(iconName)), el("h3", {}, title), el("p", {}, text));
  }

  function renderHome() {
    const heroTitle = el("h1", {}, "Discover What’s Holding Your ", el("span", { className: "highlight" }, "Website Back."));
    const features = el("section", { className: "section shell", id: "features" }, sectionHeading("A clearer view of your website", "One practical audit. Six useful perspectives.", "A guided self-assessment helps you spot what is working and decide what to improve next."),
      el("div", { className: "feature-grid" },
        featureCard("search", "SEO readiness", "Review titles, page structure, links, and useful search content."),
        featureCard("compass", "User experience", "Check navigation, readability, forms, and the path to action."),
        featureCard("target", "Conversion clarity", "Look at your offer, calls to action, trust, and next steps."),
        featureCard("book", "Content quality", "Review how clearly your site answers your audience’s needs."),
        featureCard("sparkle", "Brand consistency", "Check the details that make your website feel cohesive and credible."),
        featureCard("globe", "Mobile & technical", "Think through small screens, HTTPS, images, and essential flows.")
      ));
    const steps = el("section", { className: "section how-section", id: "how-it-works" }, el("div", { className: "shell" }, sectionHeading("A simple process", "From checklist to next step.", "No account, crawler, or outside service. Just a useful review you can complete at your own pace."),
      el("div", { className: "steps-grid" },
        ["Add your website details", "Answer the guided checklist", "Review your scores and priorities", "Print a report or plan your week"].map((title, index) => el("article", { className: "how-step" }, el("span", { className: "step-number" }, `0${index + 1}`), el("h3", {}, title), el("p", {}, ["Add the name and website address that identify your report and saved audit.", "Work through six categories. “Not sure” is a valid answer.", "See what your answers suggest, with coverage shown alongside the score.", "Keep the report or turn the relevant recommendations into a seven-day plan."][index])))
      )));
    const benefits = el("section", { className: "section shell benefit-section" },
      el("div", { className: "benefit-copy" }, el("span", { className: "eyebrow" }, "Make the next move clearer"), el("h2", {}, "Useful direction, without the noise."), el("p", {}, "Your score is a weighted summary of the checklist answers you provide. Category scores, coverage, and specific recommendations help you focus on changes that are practical for your business."), el("ul", { className: "check-list" },
        ["Recommendations connect directly to checklist answers", "Unknown items are treated as things to verify", "Audit history and progress stay in your browser", "No claims about rankings or guaranteed revenue"].map((item) => el("li", {}, icon("check"), el("span", {}, item))))),
      el("div", { className: "privacy-card" }, el("span", { className: "privacy-icon" }, icon("shield")), el("span", { className: "eyebrow" }, "Private by design"), el("h3", {}, "Your answers stay yours."), el("p", {}, "The app does not scan your website or send information anywhere. Reports and preferences are stored locally in this browser."), el("small", {}, "Clearing browser site data can remove saved audits."))
    );
    const contact = el("section", { className: "agency-cta shell" }, el("div", {}, el("span", { className: "eyebrow" }, "CREATIX STUDIO"), el("h2", {}, "Ready to turn your website into a growth asset?"), el("p", {}, "Get expert help from Creatix Studio to improve your website, brand experience, and digital performance.")), button("Visit Creatix Studio", "contact-open-link", "light-button"));
    const hero = el("section", { className: "hero shell" }, el("div", { className: "hero-copy" }, el("p", { className: "hero-tag" }, "Create your future · a practical website growth checklist"), heroTitle,
      el("p", { className: "hero-description" }, "Evaluate your website’s SEO, user experience, content, branding, and conversion readiness with a practical growth audit."),
      el("div", { className: "hero-actions" }, button("Start free website audit", "start-audit", "primary large-button"), el("a", { href: "#features", className: "button secondary large-button" }, "Explore audit features", icon("arrow"))),
      el("p", { className: "hero-footnote" }, icon("shield"), "Free to use · No sign-in · Your answers stay in this browser")), demoPreview());
    shellView(el("div", { className: "home-view" }, hero, features, steps, benefits, contact));
  }

  function field(labelText, name, value, options = {}) {
    const id = `field-${name}`;
    const control = options.select
      ? el("select", { id, name, className: "text-input", required: options.required, "aria-describedby": `error-${name}` },
        el("option", { value: "" }, options.placeholder || "Choose one"),
        ...options.select.map((option) => el("option", { value: option, selected: value === option }, option)))
      : options.textarea
        ? el("textarea", { id, name, className: "text-input", required: options.required, rows: 3, placeholder: options.placeholder || "", "aria-describedby": `error-${name}` }, value)
        : el("input", { id, name, className: "text-input", type: options.type || "text", value, required: options.required, placeholder: options.placeholder || "", autocomplete: options.autocomplete || "off", "aria-describedby": `error-${name}` });
    if (state.errors[name]) control.setAttribute("aria-invalid", "true");
    return el("div", { className: "field" }, el("label", { htmlFor: id }, labelText, options.required ? el("span", { className: "required-dot", "aria-hidden": "true" }, " *") : null), control,
      el("small", { className: "field-error", id: `error-${name}`, role: "alert" }, state.errors[name] || ""));
  }

  function businessStep() {
    return el("div", { className: "wizard-panel" }, el("div", { className: "panel-intro" }, el("span", { className: "eyebrow" }, "STEP 01 · WEBSITE"), el("h2", {}, "Which website are you reviewing?"), el("p", {}, "These details label your report and saved audit. Your website address is not scanned.")),
      el("form", { id: "businessForm", className: "business-form", novalidate: "true" },
        field("Business or brand name", "name", state.business.name, { required: true, placeholder: "e.g. Northstar Studio" }),
        field("Website URL", "url", state.business.url, { required: true, placeholder: "yourwebsite.com", autocomplete: "url" })
      ),
      el("div", { className: "notice info-notice" }, icon("info"), el("p", {}, "This is a self-assessment audit for growth.")));
  }

  function questionCard(item, answer) {
    const answerOptions = [["yes", "Yes"], ["no", "No"], ["unsure", "Not sure"]];
    return el("fieldset", { className: "question-card" }, el("legend", {}, item.prompt),
      el("div", { className: "answer-options" }, ...answerOptions.map(([value, label]) => {
        const inputId = `answer-${item.id}-${value}`;
        return el("label", { className: answer === value ? "answer-option selected" : "answer-option", htmlFor: inputId },
          el("input", { id: inputId, type: "radio", name: `answer-${item.id}`, value, checked: answer === value, "data-question-id": item.id }),
          el("span", { className: "answer-indicator" }), el("span", { className: "answer-label" }, label));
      })));
  }

  function reviewStep() {
    const total = scoring.allQuestions().length;
    const answered = Object.keys(state.answers).filter((id) => ["yes", "no", "unsure"].includes(state.answers[id])).length;
    const categories = config.categories.map((category, index) => {
      const counts = { yes: 0, no: 0, unsure: 0, unanswered: 0 };
      category.questions.forEach((item) => { const value = state.answers[item.id]; counts[value] = (counts[value] || 0) + 1; if (!value) counts.unanswered += 1; });
      return el("article", { className: "review-category" }, el("div", { className: "review-category-title" }, el("h3", {}, category.title), button("Edit", "wizard-go-step", "text-button", { "data-step": index + 1 })),
        el("div", { className: "review-counts" }, el("span", {}, `${counts.yes} Yes`), el("span", {}, `${counts.no} No`), el("span", {}, `${counts.unsure} Not sure`), el("span", { className: counts.unanswered ? "count-unanswered" : "" }, `${counts.unanswered} unanswered`)));
    });
    return el("div", { className: "wizard-panel review-panel" }, el("div", { className: "panel-intro" }, el("span", { className: "eyebrow" }, "STEP 08 · REVIEW"), el("h2", {}, "A quick look before your report."), el("p", {}, "Unanswered items remain unscored. You can come back and change any response.")),
      el("div", { className: "review-business" }, el("div", {}, el("span", { className: "eyebrow" }, "BUSINESS"), el("strong", {}, state.business.name), el("a", { href: state.business.url, target: "_blank", rel: "noopener noreferrer" }, state.business.url)), button("Edit details", "wizard-go-step", "text-button", { "data-step": "0" })),
      el("div", { className: "review-coverage" }, el("span", {}, `${answered} of ${total} questions answered`), el("strong", {}, `${Math.round(answered / total * 100)}%`)),
      el("div", { className: "review-categories" }, ...categories),
      el("div", { className: "notice info-notice" }, icon("info"), el("p", {}, "Your score is a weighted summary of confirmed Yes and No answers. “Not sure” items are excluded from category scores and shown as verification recommendations.")));
  }

  function renderWizard() {
    const lastStep = stepTitles.length - 1;
    const category = state.step > 0 && state.step < lastStep ? config.categories[state.step - 1] : null;
    const pct = Math.round(((state.step + 1) / stepTitles.length) * 100);
    let panel;
    if (state.step === 0) panel = businessStep();
    else if (state.step === lastStep) panel = reviewStep();
    else panel = el("div", { className: "wizard-panel questions-panel" }, el("div", { className: "panel-intro" }, el("span", { className: "eyebrow" }, `STEP 0${state.step + 1} · CHECKLIST`), el("h2", {}, category.title), el("p", {}, category.description), el("p", { className: "answer-guidance" }, "Choose Yes, No, or Not sure for each item. Not sure is excluded from scoring and creates a prompt to verify.")),
      el("div", { className: "question-list" }, ...category.questions.map((item) => questionCard(item, state.answers[item.id]))));

    const progress = el("div", { className: "wizard-progress" }, el("div", { className: "progress-head" }, el("span", {}, `Step ${state.step + 1} of ${stepTitles.length}`), el("strong", {}, stepTitles[state.step])),
      el("div", { className: "progress-track" }, el("span", { style: { width: `${pct}%` } })),
      el("div", { className: "step-chips" }, ...stepTitles.map((title, index) => el("button", { type: "button", className: `step-chip ${index === state.step ? "current" : index < state.step ? "done" : ""}`, "data-action": "wizard-go-step", "data-step": String(index), "aria-label": `Go to step ${index + 1}: ${title}`, title }, index < state.step ? icon("check") : String(index + 1)))));
    const navigation = el("div", { className: "wizard-navigation" },
      button(state.step === 0 ? "Back to overview" : "Back", state.step === 0 ? "navigate" : "wizard-back", "secondary", state.step === 0 ? { "data-view": "home" } : {}),
      state.step === lastStep
        ? button(state.processing ? "Preparing your report…" : "Generate my growth report", "generate-report", "primary", { disabled: state.processing })
        : button("Continue", "wizard-next", "primary", { "aria-label": `Continue to ${stepTitles[state.step + 1]}` })
    );
    shellView(el("section", { className: "wizard-view shell" }, el("div", { className: "wizard-topline" }, el("div", {}, el("span", { className: "eyebrow" }, "YOUR WEBSITE AUDIT"), el("h1", {}, "Build your growth snapshot.")), button("Exit audit", "navigate", "text-button", { "data-view": "home" })), progress, panel, navigation));
  }

  function activeAudit() {
    return audits.find((audit) => audit.id === state.activeAuditId) || null;
  }

  function updateAudit(audit) {
    const index = audits.findIndex((item) => item.id === audit.id);
    if (index >= 0) audits[index] = audit;
    persistAudits();
  }

  function currentRecommendations(audit) {
    return scoring.getRecommendations(audit.answers);
  }

  function scoreRing(score, preliminary) {
    const display = score === null ? "—" : String(score);
    return el("div", { className: `score-ring ${preliminary ? "preliminary-ring" : ""}`, style: { "--score": `${score === null ? 0 : score}%` }, role: "img", "aria-label": score === null ? "Overall score not assessed" : `Overall checklist score ${score} out of 100` }, el("span", {}, display), el("small", {}, score === null ? "not assessed" : "/100"));
  }

  function categoryBars(result) {
    return el("div", { className: "category-bars" }, ...result.categoryScores.map((category) => {
      const scoreLabel = category.score === null ? "Not assessed" : `${category.score}/100`;
      return el("div", { className: "category-row" }, el("div", { className: "category-row-head" }, el("span", {}, category.title), el("strong", {}, scoreLabel)),
        el("div", { className: "bar-track large-track", role: "img", "aria-label": `${category.title}: ${scoreLabel}` }, category.score === null ? null : el("span", { style: { width: `${category.score}%` } })));
    }));
  }

  function resultMetrics(audit, result, recommendations) {
    return el("div", { className: "result-metrics" },
      el("article", { className: "metric-card" }, el("span", { className: "metric-icon" }, icon("check")), el("strong", {}, `${result.responseCount}/${result.totalQuestions}`), el("small", {}, "questions answered")),
      el("article", { className: "metric-card" }, el("span", { className: "metric-icon" }, icon("chart")), el("strong", {}, `${result.coverage}%`), el("small", {}, "response coverage")),
      el("article", { className: "metric-card" }, el("span", { className: "metric-icon" }, icon("target")), el("strong", {}, String(recommendations.length)), el("small", {}, "items to review")),
      el("article", { className: "metric-card" }, el("span", { className: "metric-icon" }, icon("clock")), el("strong", {}, formatDate(audit.createdAt, true)), el("small", {}, "assessment date"))
    );
  }

  function formatDate(value, short = false) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date unavailable";
    return date.toLocaleString(undefined, short ? { dateStyle: "medium" } : { dateStyle: "medium", timeStyle: "short" });
  }

  function scoreSummary(audit) {
    const result = audit.result;
    const recommendations = currentRecommendations(audit);
    return el("section", { className: "score-summary-card" },
      el("div", { className: "score-card-main" }, scoreRing(result.overall, result.preliminary),
        el("div", { className: "score-card-copy" }, el("span", { className: result.preliminary ? "status-pill preliminary" : "status-pill" }, result.preliminary ? "Preliminary assessment" : result.band),
          el("h2", {}, result.overall === null ? "Keep going to build your assessment." : `${result.band}.`),
          el("p", {}, scoring.getSummary(result)),
          result.preliminary ? el("small", { className: "preliminary-note" }, "Answer more Yes/No items to strengthen the assessment. Not sure answers count toward coverage but not the score.") : null)),
      el("div", { className: "score-card-side" }, el("span", { className: "eyebrow" }, "ASSESSMENT COVERAGE"), el("strong", {}, `${result.coverage}%`), el("span", {}, `${result.unansweredCount} unanswered · ${result.scoredCoverage}% scored answers`),
        el("div", { className: "coverage-track" }, el("span", { style: { width: `${result.coverage}%` } })),
        el("div", { className: "strength-pair" }, el("div", {}, el("small", {}, "Strongest assessed"), el("strong", {}, result.strongest ? `${result.strongest.short} · ${result.strongest.score}` : "Not assessed")), el("div", {}, el("small", {}, "Most to review"), el("strong", {}, result.weakest ? `${result.weakest.short} · ${result.weakest.score}` : "Not assessed")))));
  }

  function recommendationCard(recommendation, audit, compact = false) {
    const completed = audit.completedRecommendations.includes(recommendation.id);
    const classes = `recommendation-card ${compact ? "compact" : ""} ${completed ? "completed" : ""}`;
    return el("article", { className: classes },
      el("div", { className: "recommendation-head" }, el("div", { className: "recommendation-labels" }, el("span", { className: `priority-badge ${recommendation.priority}` }, priorityLabels[recommendation.priority]), el("span", { className: "category-tag" }, recommendation.category), recommendation.answer === "unsure" ? el("span", { className: "category-tag verify-tag" }, "Needs verification") : null),
        el("label", { className: "complete-check", htmlFor: `complete-${recommendation.id}` }, el("input", { id: `complete-${recommendation.id}`, type: "checkbox", checked: completed, "data-action": "toggle-recommendation", "data-id": recommendation.id }), el("span", { className: "custom-check" }, icon("check")), el("span", {}, completed ? "Completed" : "Mark complete"))),
      el("h3", {}, recommendation.title),
      el("p", { className: "source-question" }, "Based on your answer: “", recommendation.question, "” · ", recommendation.answer === "unsure" ? "Not sure" : "No"),
      compact ? el("p", {}, recommendation.action) : el("div", { className: "recommendation-details" }, el("p", {}, el("strong", {}, "Why it matters: "), recommendation.why), el("p", {}, el("strong", {}, "Recommended action: "), recommendation.action),
        el("div", { className: "effort-row" }, el("span", {}, `Effort: ${recommendation.effort}`), el("span", {}, `Priority: ${priorityLabels[recommendation.priority]}`)),
        el("div", { className: "checklist" }, el("strong", {}, "A few useful checks"), el("ul", {}, ...recommendation.checklist.map((item) => el("li", {}, item))))));
  }

  function planCard(task, audit) {
    const completed = audit.completedPlanDays.includes(task.id);
    return el("label", { className: `plan-day ${completed ? "completed" : ""}`, htmlFor: `plan-${task.id}` },
      el("input", { id: `plan-${task.id}`, type: "checkbox", checked: completed, "data-action": "toggle-plan", "data-id": task.id }),
      el("span", { className: "plan-day-number" }, `DAY ${String(task.day).padStart(2, "0")}`),
      el("span", { className: "custom-check" }, icon("check")),
      el("span", { className: "plan-day-copy" }, el("strong", {}, task.title), el("small", {}, task.action))
    );
  }

  function resultToolbar() {
    return el("div", { className: "result-toolbar no-print" },
      button("Copy report summary", "copy-summary", "secondary", { "aria-label": "Copy report summary to clipboard" }),
      button("Print or save as PDF", "print-report", "secondary"),
      button("View all saved audits", "navigate", "secondary", { "data-view": "history" }),
      button("Start new audit", "start-audit", "primary")
    );
  }

  function resultContact() {
    return el("section", { className: "results-contact" }, el("div", {}, el("span", { className: "eyebrow" }, "CREATIX STUDIO"), el("h2", {}, "Want help improving your website?"), el("p", {}, "Turn your audit findings into a practical improvement plan with Creatix Studio.")), button("Visit Creatix Studio", "contact-open-link", "light-button"));
  }

  function renderResults() {
    const audit = activeAudit();
    if (!audit) { state.view = "history"; return renderHistory(); }
    audit.result = scoring.scoreAudit(audit.answers);
    const recommendations = currentRecommendations(audit);
    const plan = scoring.getActionPlan(recommendations);
    const top = recommendations.slice(0, 3);
    const dashboard = el("div", { className: "results-view shell" },
      el("div", { className: "results-heading" }, el("div", {}, el("span", { className: "eyebrow" }, "YOUR GROWTH AUDIT"), el("h1", {}, `${audit.business.name} growth snapshot`), el("p", {}, el("a", { href: audit.business.url, target: "_blank", rel: "noopener noreferrer" }, audit.business.url), " · ", formatDate(audit.createdAt))),
        el("span", { className: "report-id" }, "Private browser report")),
      resultToolbar(),
      scoreSummary(audit),
      resultMetrics(audit, audit.result, recommendations),
      el("div", { className: "dashboard-grid" },
        el("section", { className: "content-card category-card" }, el("div", { className: "card-heading" }, el("div", {}, el("span", { className: "eyebrow" }, "THE BREAKDOWN"), el("h2", {}, "Category scores")), button("View recommendations", "navigate", "text-button", { "data-view": "recommendations" })), categoryBars(audit.result), el("small", { className: "card-note" }, "The weighted overall score uses assessed category scores only; unassessed categories do not count as zero.")),
        el("section", { className: "content-card insight-card" }, el("div", { className: "card-heading" }, el("div", {}, el("span", { className: "eyebrow" }, "START HERE"), el("h2", {}, "Your next useful moves"))),
          top.length ? el("div", { className: "mini-recommendations" }, ...top.map((item) => recommendationCard(item, audit, true))) : el("p", { className: "empty-inline" }, "No checklist gaps were flagged. Use the action plan to review and maintain the basics."),
          button("Explore all recommendations", "navigate", "secondary full-width", { "data-view": "recommendations" }))),
      el("section", { className: "content-card plan-card-section" }, el("div", { className: "card-heading plan-heading" }, el("div", {}, el("span", { className: "eyebrow" }, "A PRACTICAL WEEK"), el("h2", {}, "Your 7-day action plan"), el("p", {}, "Tasks follow your answers and highest-priority review items. Progress saves locally.")), el("span", { className: "plan-progress" }, `${audit.completedPlanDays.length}/7 done`)),
        el("div", { className: "plan-list" }, ...plan.map((task) => planCard(task, audit)))),
      resultContact(),
      el("div", { className: "assessment-disclaimer" }, icon("info"), el("p", {}, "This checklist is based on information you provided. It does not inspect your live website, verify technical settings, predict search rankings, or guarantee business results."))
    );
    const printReport = buildPrintReport(audit, recommendations, plan);
    shellView(el("div", {}, dashboard, printReport));
  }

  function buildPrintReport(audit, recommendations, plan) {
    const result = audit.result;
    const top = recommendations.slice(0, 8);
    const completedPlan = new Set(audit.completedPlanDays);
    return el("article", { className: "print-report", id: "printReport" },
      el("header", { className: "print-header" }, el("div", { className: "print-logo" }, el("img", { className: "brand-symbol print-symbol", src: "./assets/creatix-studio-symbol.png", alt: "" }), el("div", {}, el("strong", {}, "Growth Auditor"), el("small", {}, "by Creatix Studio"))), el("span", { className: "print-date" }, formatDate(audit.createdAt))),
      el("h1", {}, "Website growth audit"), el("p", { className: "print-business" }, audit.business.name, " · ", audit.business.url),
      el("div", { className: "print-score-block" }, el("div", {}, el("span", { className: "eyebrow" }, result.preliminary ? "PRELIMINARY ASSESSMENT" : result.band), el("strong", {}, result.overall === null ? "Not assessed" : `${result.overall}/100`), el("span", {}, `${result.coverage}% response coverage · ${result.unansweredCount} unanswered`)), el("p", {}, scoring.getSummary(result))),
      el("section", { className: "print-section" }, el("h2", {}, "Category breakdown"), el("div", { className: "print-categories" }, ...result.categoryScores.map((category) => el("div", { className: "print-category" }, el("span", {}, category.title), el("strong", {}, category.score === null ? "Not assessed" : `${category.score}/100`), el("small", {}, `${category.weight}% weight · ${category.answered}/${category.total} responded`))))),
      el("section", { className: "print-section" }, el("h2", {}, "Key strengths"), el("p", {}, result.strongest ? `${result.strongest.title} is your strongest assessed category at ${result.strongest.score}/100.` : "No categories had confirmed Yes/No answers."), el("h2", {}, "Areas to improve"), recommendations.length ? el("ol", {}, ...top.map((item) => el("li", {}, el("strong", {}, item.title), ` (${priorityLabels[item.priority]}) — ${item.action}`))) : el("p", {}, "No checklist issues were flagged by your answers.")),
      el("section", { className: "print-section print-plan" }, el("h2", {}, "Your 7-day action plan"), el("ol", {}, ...plan.map((task) => el("li", {}, el("span", {}, `Day ${task.day}: `), task.title, " — ", task.action, completedPlan.has(task.id) ? " (Completed)" : "")))),
      el("footer", { className: "print-disclaimer" }, el("strong", {}, "Assessment limits"), el("p", {}, "This report is based on user-provided checklist answers. Growth Auditor by Creatix Studio does not crawl or verify the live website. Scores summarize this checklist and are not measurements of real-world performance, search rankings, or guaranteed business outcomes."))
    );
  }

  function renderRecommendations() {
    const audit = activeAudit();
    if (!audit) { state.view = "history"; return renderHistory(); }
    const all = currentRecommendations(audit);
    const completed = new Set(audit.completedRecommendations);
    let filtered = all.filter((item) => {
      if (state.recommendationFilter === "completed") return completed.has(item.id);
      if (["high", "medium", "low"].includes(state.recommendationFilter)) return item.priority === state.recommendationFilter;
      return true;
    });
    if (state.recommendationSort === "effort") filtered = [...filtered].sort((a, b) => scoring.effortRank[a.effort] - scoring.effortRank[b.effort] || scoring.priorityRank[a.priority] - scoring.priorityRank[b.priority]);
    else if (state.recommendationSort === "category") filtered = [...filtered].sort((a, b) => a.category.localeCompare(b.category) || scoring.priorityRank[a.priority] - scoring.priorityRank[b.priority]);
    else filtered.sort((a, b) => scoring.priorityRank[a.priority] - scoring.priorityRank[b.priority] || scoring.effortRank[a.effort] - scoring.effortRank[b.effort]);
    const filters = [["all", "All"], ["high", "High"], ["medium", "Medium"], ["low", "Low"], ["completed", "Completed"]];
    shellView(el("section", { className: "recommendations-view shell" },
      el("div", { className: "page-heading" }, el("div", {}, el("span", { className: "eyebrow" }, "ANSWER-LINKED GUIDANCE"), el("h1", {}, "Detailed recommendations"), el("p", {}, `Recommendations for ${audit.business.name}, based on the answers in this audit.`)), button("Back to results", "navigate", "secondary", { "data-view": "results" })),
      el("div", { className: "recommendation-controls" }, el("div", { className: "filter-chips", role: "group", "aria-label": "Filter recommendations" }, ...filters.map(([value, label]) => el("button", { type: "button", className: state.recommendationFilter === value ? "filter-chip active" : "filter-chip", "data-action": "set-filter", "data-filter": value }, label))),
        el("label", { className: "sort-control" }, "Sort by", el("select", { className: "text-input compact-select", "data-action": "set-sort", "aria-label": "Sort recommendations" }, ...[["priority", "Priority"], ["effort", "Effort"], ["category", "Category"]].map(([value, label]) => el("option", { value, selected: value === state.recommendationSort }, label))))),
      filtered.length ? el("div", { className: "recommendation-list" }, ...filtered.map((item) => recommendationCard(item, audit))) : el("div", { className: "empty-state" }, el("span", { className: "empty-icon" }, icon("check")), el("h2", {}, all.length ? "No items in this filter." : "No recommendations to review."), el("p", {}, all.length ? "Choose another priority or clear the filter to see more." : "Your answers did not flag any checklist issues. Revisit the action plan for useful validation tasks.")),
      el("div", { className: "assessment-disclaimer" }, icon("info"), el("p", {}, "For “Not sure” answers, recommendations ask you to verify an item and do not claim it is missing."))));
  }

  function setComparisonDefaults() {
    if (!audits.some((audit) => audit.id === state.compareNewerId)) state.compareNewerId = audits[0]?.id || null;
    if (!audits.some((audit) => audit.id === state.compareOlderId) || state.compareOlderId === state.compareNewerId) state.compareOlderId = audits[1]?.id || null;
  }

  function comparisonPanel() {
    if (audits.length < 2) return el("div", { className: "comparison-empty" }, icon("chart"), el("div", {}, el("strong", {}, "Compare progress over time"), el("p", {}, "Complete another audit to see overall and category-level score changes.")));
    setComparisonDefaults();
    const newer = audits.find((audit) => audit.id === state.compareNewerId);
    const older = audits.find((audit) => audit.id === state.compareOlderId);
    const selectAudit = (key, value) => el("label", { className: "compare-select-label" }, key === "newer" ? "Audit to compare" : "Baseline audit", el("select", { className: "text-input", "data-action": "compare-select", "data-key": key }, ...audits.map((audit) => el("option", { value: audit.id, selected: value === audit.id }, `${audit.business.name} · ${formatDate(audit.createdAt, true)}`))));
    const coverageChanged = newer && older && newer.result.coverage !== older.result.coverage;
    const overallDelta = newer?.result.overall === null || older?.result.overall === null ? null : newer.result.overall - older.result.overall;
    const rows = config.categories.map((category) => {
      const first = newer?.result.categoryScores.find((item) => item.id === category.id);
      const second = older?.result.categoryScores.find((item) => item.id === category.id);
      const delta = first?.score === null || second?.score === null || first?.score === undefined || second?.score === undefined ? null : first.score - second.score;
      return el("div", { className: "compare-row" }, el("span", {}, category.title), el("strong", {}, first?.score == null ? "—" : `${first.score}`), el("strong", { className: "baseline-score" }, second?.score == null ? "—" : `${second.score}`), el("span", { className: delta === null ? "delta neutral" : delta > 0 ? "delta up" : delta < 0 ? "delta down" : "delta neutral" }, delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta}`));
    });
    return el("section", { className: "content-card comparison-panel" }, el("div", { className: "card-heading" }, el("div", {}, el("span", { className: "eyebrow" }, "TRACK YOUR PROGRESS"), el("h2", {}, "Compare audits"))),
      el("div", { className: "compare-selects" }, selectAudit("newer", state.compareNewerId), selectAudit("older", state.compareOlderId)),
      coverageChanged ? el("div", { className: "notice compare-notice" }, icon("info"), el("p", {}, `Coverage differs (${older.result.coverage}% for the baseline, ${newer.result.coverage}% for the compared audit). This score comparison may not be directly equivalent.`)) : null,
      el("div", { className: "overall-delta" }, el("div", {}, el("span", {}, "Compared audit vs baseline"), el("small", {}, `${newer.result.overall === null ? "Not assessed" : `${newer.result.overall}/100`} vs ${older.result.overall === null ? "Not assessed" : `${older.result.overall}/100`}`)), el("strong", { className: overallDelta === null ? "delta neutral" : overallDelta > 0 ? "delta up" : overallDelta < 0 ? "delta down" : "delta neutral" }, overallDelta === null ? "Not comparable" : `${overallDelta > 0 ? "+" : ""}${overallDelta} pts`)),
      el("div", { className: "compare-table" }, el("div", { className: "compare-row compare-row-header" }, el("span", {}, "Category"), el("span", {}, "Compared"), el("span", {}, "Baseline"), el("span", {}, "Change")), ...rows));
  }

  function auditHistoryCard(audit) {
    const score = audit.result.overall;
    const opportunities = currentRecommendations(audit).length;
    return el("article", { className: "history-card" }, el("div", { className: "history-score" }, score === null ? "—" : score, el("small", {}, "/100")),
      el("div", { className: "history-copy" }, el("div", { className: "history-title-row" }, el("h3", {}, audit.business.name), el("span", { className: "history-band" }, score === null ? "Not assessed" : audit.result.band)), el("a", { className: "history-url", href: audit.business.url, target: "_blank", rel: "noopener noreferrer" }, audit.business.url),
        el("p", {}, `${formatDate(audit.createdAt)} · ${audit.result.coverage}% coverage · ${opportunities} review ${opportunities === 1 ? "item" : "items"}`)),
      el("div", { className: "history-actions" }, button("Open report", "open-audit", "secondary", { "data-id": audit.id }), button("Delete", "delete-audit", "text-button danger-text", { "data-id": audit.id, "aria-label": `Delete ${audit.business.name} audit` })));
  }

  function renderHistory() {
    const content = el("section", { className: "history-view shell" }, el("div", { className: "page-heading" }, el("div", {}, el("span", { className: "eyebrow" }, "SAVED IN THIS BROWSER"), el("h1", {}, "Your audit history"), el("p", {}, "Open a previous report, compare scores, or clear saved audit data.")), audits.length ? button("Clear all saved audits", "clear-history", "text-button danger-text") : null),
      audits.length ? el("div", { className: "history-layout" }, el("div", { className: "history-list" }, ...audits.map(auditHistoryCard)), comparisonPanel())
        : el("div", { className: "empty-state history-empty" }, el("span", { className: "empty-icon" }, icon("clock")), el("h2", {}, "Your saved audits will appear here."), el("p", {}, "Finish an audit to keep its report and action-plan progress in this browser."), button("Start your first audit", "start-audit", "primary")),
      el("div", { className: "notice privacy-notice" }, icon("shield"), el("p", {}, "Your saved audits are stored in this browser and may not appear on another device or browser. Clearing this browser’s site data may remove them.")));
    shellView(content);
  }

  function renderAbout() {
    shellView(el("section", { className: "about-view shell" }, el("div", { className: "about-hero" }, el("span", { className: "eyebrow" }, "ABOUT THE TOOL"), el("h1", {}, "A thoughtful starting point for website growth."), el("p", {}, "Growth Auditor by Creatix Studio is a practical self-assessment that helps teams organize website improvement ideas into a clear, manageable plan.")),
      el("section", { className: "profile-card" }, el("div", { className: "profile-logo-frame" }, el("img", { className: "profile-lockup", src: "./assets/creatix-studio-lockup.png", alt: "Creatix Studio — Create your future." })),
        el("div", { className: "profile-copy" }, el("span", { className: "eyebrow" }, "THE STUDIO BEHIND THE AUDIT"), el("h2", {}, "Create your future."), el("p", {}, "Explore Creatix Studio’s main profile and the work behind this practical growth tool."),
          el("a", { className: "button primary", href: config.brand.profileUrl, target: "_blank", rel: "noopener noreferrer" }, "Visit Creatix Studio", icon("arrow")))),
      el("div", { className: "about-grid" }, el("article", { className: "content-card" }, el("span", { className: "feature-icon" }, icon("compass")), el("h2", {}, "Designed to guide, not grade."), el("p", {}, "The score is a weighted summary of your answers to a defined checklist. It is not a live-site test, performance measurement, SEO ranking prediction, or guarantee of business results.")),
        el("article", { className: "content-card" }, el("span", { className: "feature-icon" }, icon("shield")), el("h2", {}, "Private and local."), el("p", {}, "No account or sign-in is needed. Your answers and saved reports stay in this browser, so you can return to them on this device."))),
      el("section", { className: "agency-cta about-cta" }, el("div", {}, el("span", { className: "eyebrow" }, "CREATIX STUDIO"), el("h2", {}, "Want help improving your website?"), el("p", {}, "Open the Studio’s main profile to learn more. If the Studio shares another contact destination, update it through Contact settings.")), button("Visit Creatix Studio", "contact-open-link", "light-button")),
      el("div", { className: "content-card privacy-detail" }, el("h2", {}, "Data and deletion"), el("p", {}, "Audit answers and progress are stored on this device in your browser. You can delete an individual audit or clear all saved audits from the history page. Browser site-data cleanup can also remove local records."), button("View saved audits", "navigate", "secondary", { "data-view": "history" }))));
  }

  function renderApp() {
    state.toast = state.toast || "";
    if (state.view === "home") renderHome();
    else if (state.view === "wizard") renderWizard();
    else if (state.view === "results") renderResults();
    else if (state.view === "recommendations") renderRecommendations();
    else if (state.view === "history") renderHistory();
    else if (state.view === "about") renderAbout();
    if (state.toast) {
      const toast = el("div", { className: "toast-message", role: "status" }, el("span", {}, state.toast), el("button", { type: "button", "data-action": "dismiss-toast", "aria-label": "Dismiss message" }, icon("close")));
      app.append(toast);
    }
  }

  function normalizedWebsiteUrl(raw) {
    const text = String(raw || "").trim();
    if (!text) return null;
    const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(text) ? text : `https://${text}`;
    try {
      const url = new URL(candidate);
      if (!["https:", "http:"].includes(url.protocol) || !url.hostname || (!url.hostname.includes(".") && url.hostname !== "localhost")) return null;
      return url.href;
    } catch (_) { return null; }
  }

  function validContactUrl(raw) {
    const value = String(raw || "").trim();
    if (!value) return "";
    if (/[\r\n]/.test(value)) return null;
    try {
      const url = new URL(value);
      if (!["https:", "http:", "mailto:"].includes(url.protocol)) return null;
      if ((url.protocol === "https:" || url.protocol === "http:") && !url.hostname.includes(".")) return null;
      if (url.protocol === "mailto:" && !url.pathname.includes("@")) return null;
      return url.href;
    } catch (_) { return null; }
  }

  function validateBusiness() {
    state.errors = {};
    for (const key of ["name", "url"]) {
      if (!String(state.business[key] || "").trim()) state.errors[key] = "This field is required.";
    }
    if (!state.errors.url) {
      const normalized = normalizedWebsiteUrl(state.business.url);
      if (!normalized) state.errors.url = "Enter a valid website address, such as yourwebsite.com.";
      else state.business.url = normalized;
    }
    return Object.keys(state.errors).length === 0;
  }

  function generateId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function generateReport() {
    state.processing = true;
    renderApp();
    window.setTimeout(() => {
      const audit = {
        id: generateId(), createdAt: new Date().toISOString(),
        business: { name: state.business.name.trim(), url: state.business.url },
        answers: { ...state.answers }, completedRecommendations: [], completedPlanDays: []
      };
      audit.result = scoring.scoreAudit(audit.answers);
      audits.unshift(audit);
      const saved = persistAudits();
      state.activeAuditId = audit.id;
      state.view = "results";
      state.processing = false;
      state.recommendationFilter = "all";
      state.toast = saved ? "Your report is ready. It is saved in this browser." : "Your report is ready, but this browser could not save it. Print or copy it now.";
      renderApp();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 280);
  }

  function startAudit() {
    state.step = 0;
    state.business = emptyBusiness();
    state.answers = {};
    state.errors = {};
    state.processing = false;
    state.view = "wizard";
    state.toast = "";
    renderApp();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleRecommendation(id) {
    const audit = activeAudit();
    if (!audit) return;
    const set = new Set(audit.completedRecommendations);
    set.has(id) ? set.delete(id) : set.add(id);
    audit.completedRecommendations = [...set];
    updateAudit(audit);
    renderApp();
  }

  function togglePlanDay(id) {
    const audit = activeAudit();
    if (!audit) return;
    const set = new Set(audit.completedPlanDays);
    set.has(id) ? set.delete(id) : set.add(id);
    audit.completedPlanDays = [...set];
    updateAudit(audit);
    renderApp();
  }

  async function copySummary() {
    const audit = activeAudit();
    if (!audit) return;
    const text = scoring.makeReportSummary(audit);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text);
      else throw new Error("Clipboard API unavailable");
      setToast("Report summary copied to your clipboard.");
    } catch (_) {
      const textarea = el("textarea", { className: "copy-fallback", readonly: true, "aria-hidden": "true" }, text);
      document.body.append(textarea); textarea.select();
      const copied = document.execCommand("copy"); textarea.remove();
      setToast(copied ? "Report summary copied to your clipboard." : "Clipboard access is unavailable in this browser. You can print the report instead.");
    }
  }

  function openContactDialog() {
    const dialog = document.getElementById("contactDialog");
    if (!dialog) return;
    const input = document.getElementById("contactUrl");
    if (input) input.value = state.preferences.contactUrl || "";
    const error = document.getElementById("contactError");
    if (error) error.textContent = "";
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    input?.focus();
  }

  function saveContactLink() {
    const input = document.getElementById("contactUrl");
    const error = document.getElementById("contactError");
    const value = validContactUrl(input?.value);
    if (value === null) {
      if (error) error.textContent = "Enter a valid http, https, or mailto destination.";
      input?.setAttribute("aria-invalid", "true");
      input?.focus();
      return;
    }
    state.preferences.contactUrl = value;
    const saved = persistPreferences();
    input?.removeAttribute("aria-invalid");
    if (error) error.textContent = saved ? (value ? "Contact destination saved in this browser." : "Contact destination cleared.") : "This browser could not save the contact destination.";
    const openButton = document.querySelector('[data-action="contact-open-link"]');
    if (openButton) openButton.disabled = !value;
  }

  function openConfiguredContact() {
    const destination = validContactUrl(state.preferences.contactUrl);
    if (!destination) {
      openContactDialog();
      return;
    }
    const opened = window.open(destination, "_blank");
    if (opened) opened.opener = null;
    const dialog = document.getElementById("contactDialog");
    if (dialog?.open) dialog.close();
    if (!opened && !destination.startsWith("mailto:")) setToast("Your browser blocked the new tab. Use the configured link again or allow pop-ups for this page.");
  }

  function deleteAudit(id) {
    const audit = audits.find((item) => item.id === id);
    if (!audit || !window.confirm(`Delete the saved audit for “${audit.business.name}”? This cannot be undone.`)) return;
    audits = audits.filter((item) => item.id !== id);
    const saved = persistAudits();
    if (state.activeAuditId === id) {
      state.activeAuditId = audits[0]?.id || null;
      state.view = state.activeAuditId ? "results" : "history";
    }
    state.compareNewerId = null;
    state.compareOlderId = null;
    state.toast = saved ? "Audit deleted from this browser." : "Audit removed for this session, but this browser could not save the change.";
    renderApp();
  }

  function clearHistory() {
    if (!audits.length || !window.confirm(`Clear all ${audits.length} saved audits and local progress from this browser?`)) return;
    audits = [];
    const saved = persistAudits();
    state.activeAuditId = null;
    state.compareNewerId = null;
    state.compareOlderId = null;
    state.view = "history";
    state.toast = saved ? "All saved audits were cleared from this browser." : "Audits cleared for this session, but this browser could not save the change.";
    renderApp();
  }

  app.addEventListener("input", (event) => {
    const target = event.target;
    if (target.closest("#businessForm") && target.name) {
      state.business[target.name] = target.value;
      target.removeAttribute("aria-invalid");
      const error = document.getElementById(`error-${target.name}`);
      if (error) error.textContent = "";
    }
  });

  app.addEventListener("change", (event) => {
    const target = event.target;
    if (target.closest("#businessForm") && target.name) {
      state.business[target.name] = target.value;
      target.removeAttribute("aria-invalid");
      const error = document.getElementById(`error-${target.name}`);
      if (error) error.textContent = "";
    }
    if (target.matches("input[type=radio][data-question-id]")) {
      state.answers[target.dataset.questionId] = target.value;
      target.closest(".answer-options")?.querySelectorAll(".answer-option").forEach((label) => label.classList.toggle("selected", label.contains(target)));
    }
    if (target.matches("[data-action='compare-select']")) {
      if (target.dataset.key === "newer") state.compareNewerId = target.value;
      else state.compareOlderId = target.value;
      if (state.compareNewerId === state.compareOlderId) {
        const alternative = audits.find((item) => item.id !== target.value);
        if (alternative) {
          if (target.dataset.key === "newer") state.compareOlderId = alternative.id;
          else state.compareNewerId = alternative.id;
        }
      }
      renderApp();
    }
    if (target.matches("[data-action='set-sort']")) {
      state.recommendationSort = target.value;
      renderApp();
    }
  });

  app.addEventListener("click", (event) => {
    const actionElement = event.target.closest("[data-action]");
    if (!actionElement || !app.contains(actionElement)) return;
    const action = actionElement.dataset.action;
    if (action === "start-audit") startAudit();
    else if (action === "home-link") { event.preventDefault(); state.view = "home"; state.toast = ""; renderApp(); window.scrollTo(0, 0); }
    else if (action === "navigate") { state.view = actionElement.dataset.view || "home"; state.toast = ""; renderApp(); window.scrollTo(0, 0); }
    else if (action === "wizard-back") { state.step = Math.max(0, state.step - 1); state.errors = {}; renderApp(); window.scrollTo(0, 0); }
    else if (action === "wizard-next") {
      if (state.step === 0 && !validateBusiness()) { renderApp(); document.querySelector("[aria-invalid='true']")?.focus(); return; }
      state.errors = {}; state.step = Math.min(stepTitles.length - 1, state.step + 1); renderApp(); window.scrollTo(0, 0);
    }
    else if (action === "wizard-go-step") {
      const step = Number(actionElement.dataset.step);
      if (step > 0 && state.step === 0 && !validateBusiness()) { renderApp(); document.querySelector("[aria-invalid='true']")?.focus(); return; }
      state.errors = {}; state.step = Math.max(0, Math.min(stepTitles.length - 1, step)); renderApp(); window.scrollTo(0, 0);
    }
    else if (action === "generate-report") { if (!state.processing) generateReport(); }
    else if (action === "open-audit") { state.activeAuditId = actionElement.dataset.id; state.recommendationFilter = "all"; state.view = "results"; state.toast = ""; renderApp(); window.scrollTo(0, 0); }
    else if (action === "copy-summary") copySummary();
    else if (action === "print-report") window.print();
    else if (action === "toggle-recommendation") { event.preventDefault(); toggleRecommendation(actionElement.dataset.id); }
    else if (action === "toggle-plan") { event.preventDefault(); togglePlanDay(actionElement.dataset.id); }
    else if (action === "set-filter") { state.recommendationFilter = actionElement.dataset.filter; renderApp(); }
    else if (action === "delete-audit") deleteAudit(actionElement.dataset.id);
    else if (action === "clear-history") clearHistory();
    else if (action === "contact-open") openContactDialog();
    else if (action === "contact-close") document.getElementById("contactDialog")?.close();
    else if (action === "contact-save") saveContactLink();
    else if (action === "contact-open-link") openConfiguredContact();
    else if (action === "dismiss-toast") { state.toast = ""; renderApp(); }
  });

  app.addEventListener("submit", (event) => {
    if (event.target.id !== "businessForm") return;
    event.preventDefault();
    document.querySelector("[data-action='wizard-next']")?.click();
  });

  renderApp();
})();
