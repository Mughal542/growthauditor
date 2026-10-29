const test = require("node:test");
const assert = require("node:assert/strict");
const config = require("../src/config.js");
const scoring = require("../src/scoring.js");

test("checklist contains all six weighted categories and 53 editable questions", () => {
  assert.equal(config.categories.length, 6);
  assert.equal(config.categories.reduce((sum, category) => sum + category.weight, 0), 100);
  assert.equal(scoring.allQuestions().length, 53);
  assert.ok(scoring.allQuestions().every((question) => question.recommendation && question.recommendation.verify));
  assert.equal(config.brand.profileUrl, "https://creatixstudio.vercel.app/");
  assert.equal(config.brand.tagline, "Create your future.");
});

test("Yes and No score, while Not Sure is excluded from its category denominator", () => {
  const answers = { "seo-title": "yes", "seo-meta": "no", "seo-headings": "unsure" };
  const result = scoring.scoreAudit(answers);
  const seo = result.categoryScores.find((category) => category.id === "seo");
  assert.equal(seo.score, 50);
  assert.equal(seo.yes, 1);
  assert.equal(seo.no, 1);
  assert.equal(seo.unsure, 1);
  assert.equal(result.responseCount, 3);
  assert.equal(result.unansweredCount, 50);
  assert.equal(result.coverage, 6);
});

test("unanswered categories are not treated as zero and overall weights are normalized", () => {
  const result = scoring.scoreAudit({ "seo-title": "yes", "ux-nav": "no" });
  assert.equal(result.overall, 56);
  assert.equal(result.assessedCategoryCount, 2);
  assert.equal(result.categoryScores.find((category) => category.id === "conversion").score, null);
});

test("all Not Sure answers create no false zero scores and remain preliminary", () => {
  const answers = Object.fromEntries(scoring.allQuestions().map((question) => [question.id, "unsure"]));
  const result = scoring.scoreAudit(answers);
  assert.equal(result.overall, null);
  assert.ok(result.categoryScores.every((category) => category.score === null));
  assert.equal(result.coverage, 100);
  assert.equal(result.scoredCoverage, 0);
  assert.equal(result.preliminary, true);
});

test("recommendations match No and Not Sure answers without asserting an unknown issue", () => {
  const recommendations = scoring.getRecommendations({ "conversion-cta": "no", "seo-sitemap": "unsure", "seo-title": "yes" });
  assert.equal(recommendations.length, 2);
  const cta = recommendations.find((item) => item.id === "conversion-cta");
  const sitemap = recommendations.find((item) => item.id === "seo-sitemap");
  assert.equal(cta.priority, "high");
  assert.match(cta.title, /call to action/i);
  assert.equal(sitemap.answer, "unsure");
  assert.match(sitemap.title, /^Verify:/);
  assert.match(sitemap.action, /Verify whether your website has an XML sitemap/i);
  assert.match(sitemap.action, /if one is in place/i);
  assert.equal(sitemap.priority, "low");
});

test("action plan contains seven deterministic, answer-linked or review tasks", () => {
  const plan = scoring.getActionPlan(scoring.getRecommendations({ "conversion-cta": "no" }));
  assert.equal(plan.length, 7);
  assert.equal(plan[0].recommendationId, "conversion-cta");
  assert.equal(plan[1].recommendationId, null);
  assert.equal(plan[6].day, 7);
});
