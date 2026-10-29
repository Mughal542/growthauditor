/* Deterministic scoring and recommendation helpers, kept separate from the interface. */
(function (root) {
  const config = root.AUDIT_CONFIG || (typeof require === "function" ? require("./config.js") : null);
  if (!config) throw new Error("Audit configuration is not available.");

  const allQuestions = () => config.categories.flatMap((category) => category.questions.map((item) => ({ ...item, categoryId: category.id, categoryTitle: category.title })));
  const priorityRank = { high: 0, medium: 1, low: 2 };
  const effortRank = { Low: 0, Medium: 1, High: 2 };

  function scoreAudit(answers = {}) {
    const total = allQuestions().length;
    let responseCount = 0;
    let scoredCount = 0;
    const categoryScores = config.categories.map((category) => {
      let yes = 0;
      let no = 0;
      let unsure = 0;
      for (const item of category.questions) {
        const answer = answers[item.id];
        if (answer === "yes") { yes += 1; scoredCount += 1; responseCount += 1; }
        else if (answer === "no") { no += 1; scoredCount += 1; responseCount += 1; }
        else if (answer === "unsure") { unsure += 1; responseCount += 1; }
      }
      const applicable = yes + no;
      return {
        id: category.id, title: category.title, short: category.short, weight: category.weight,
        score: applicable ? Math.round((yes / applicable) * 100) : null,
        yes, no, unsure, applicable,
        answered: applicable + unsure,
        total: category.questions.length
      };
    });

    const assessed = categoryScores.filter((category) => category.score !== null);
    const assessedWeight = assessed.reduce((sum, category) => sum + category.weight, 0);
    const overall = assessedWeight
      ? Math.round(assessed.reduce((sum, category) => sum + category.score * category.weight, 0) / assessedWeight)
      : null;
    const coverage = total ? Math.round((responseCount / total) * 100) : 0;
    const scoredCoverage = total ? Math.round((scoredCount / total) * 100) : 0;
    // Partial or mostly unconfirmed checklists are clearly labeled as preliminary.
    const preliminary = overall === null || coverage < 60 || scoredCoverage < 40;
    const ordered = [...assessed].sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
    const strongest = ordered[0] || null;
    const weakest = ordered[ordered.length - 1] || null;
    const band = overall === null ? null : config.scoreBands.find((item) => overall >= item.min) || config.scoreBands.at(-1);

    return {
      overall, categoryScores, assessedCategoryCount: assessed.length,
      totalQuestions: total, responseCount, unansweredCount: total - responseCount,
      scoredCount, coverage, scoredCoverage, preliminary,
      strongest, weakest, band: band ? band.label : "Not Assessed"
    };
  }

  function getRecommendations(answers = {}) {
    const recommendations = [];
    for (const category of config.categories) {
      for (const item of category.questions) {
        const answer = answers[item.id];
        if (answer !== "no" && answer !== "unsure") continue;
        const base = item.recommendation;
        const uncertain = answer === "unsure";
        let priority = base.priority;
        if (uncertain && priority === "high") priority = "medium";
        recommendations.push({
          id: item.id, question: item.prompt, categoryId: category.id, category: category.title,
          priority, effort: base.effort,
          title: uncertain ? base.verify.title : base.title,
          why: uncertain ? base.verify.why : base.why,
          action: uncertain ? base.verify.action : base.action,
          checklist: base.checklist,
          answer
        });
      }
    }
    return recommendations.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || effortRank[a.effort] - effortRank[b.effort] || a.category.localeCompare(b.category));
  }

  function getActionPlan(recommendations) {
    const plan = recommendations.slice(0, 7).map((recommendation, index) => ({
      id: `day-${index + 1}`,
      day: index + 1,
      title: recommendation.title,
      action: recommendation.action,
      recommendationId: recommendation.id
    }));
    while (plan.length < 7) {
      const day = plan.length + 1;
      plan.push({ id: `day-${day}`, day, title: "Review and validate", action: config.actionPlanFallback[day - 1], recommendationId: null });
    }
    return plan;
  }

  function getSummary(result) {
    if (result.overall === null) return "There are not enough confirmed answers to calculate a checklist score yet. Answer Yes or No for more items to build a useful assessment.";
    if (result.strongest && result.weakest && result.strongest.id !== result.weakest.id) {
      return `Your checklist shows the strongest foundation in ${result.strongest.title} (${result.strongest.score}/100). ${result.weakest.title} has the most opportunities to review (${result.weakest.score}/100). These scores reflect your answers, not a live website inspection or a measure of business performance.`;
    }
    return `Your assessed checklist areas are currently aligned, with ${result.strongest ? `${result.strongest.title} at ${result.strongest.score}/100` : "no category score yet"}. Use the recommendations to choose practical next steps. These scores reflect your answers, not a live website inspection or a measure of business performance.`;
  }

  function makeReportSummary(audit) {
    const result = audit.result || scoreAudit(audit.answers);
    const recommendations = getRecommendations(audit.answers);
    const date = new Date(audit.createdAt).toLocaleString();
    const categoryLines = result.categoryScores.map((category) => `- ${category.title}: ${category.score === null ? "Not Assessed" : `${category.score}/100`}`).join("\n");
    const nextSteps = recommendations.slice(0, 3).map((item, index) => `${index + 1}. ${item.title} — ${item.action}`).join("\n");
    return [
      `${config.brand.product} | ${config.brand.studio}`,
      `Business: ${audit.business.name}`,
      `Website: ${audit.business.url}`,
      `Audit date: ${date}`,
      `Overall: ${result.overall === null ? "Not Assessed" : `${result.overall}/100 — ${result.band}`}`,
      `Checklist coverage: ${result.coverage}% (${result.responseCount}/${result.totalQuestions} responses)`,
      `Unanswered questions: ${result.unansweredCount}`,
      "Category scores:", categoryLines,
      "Recommended next steps:", nextSteps || "No flagged checklist items. Review the action plan to maintain current practices.",
      "Assessment based on user-provided answers; this tool does not inspect or verify the live website."
    ].join("\n");
  }

  const api = { allQuestions, scoreAudit, getRecommendations, getActionPlan, getSummary, makeReportSummary, priorityRank, effortRank };
  root.AuditScoring = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
