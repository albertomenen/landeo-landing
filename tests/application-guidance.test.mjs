import test from "node:test";
import assert from "node:assert/strict";
import { applicationGuide } from "../lib/application-guidance.ts";

const application = (status, overrides = {}) => ({
  status,
  actionUrl: null,
  requiredFields: [],
  tracking: {
    stage: "applied",
    updatedAt: null,
    nextAction: "",
    nextActionAt: null,
  },
  ...overrides,
});

test("distinguishes a pending Landeo submission from recruiter response", () => {
  const guide = applicationGuide(application("queued"), "es");
  assert.equal(guide.waitingOn, "Landeo");
  assert.match(guide.description, /no hay confirmación de envío/i);
});

test("shows the candidate's required action and requested fields", () => {
  const guide = applicationGuide(application("action_required", {
    actionUrl: "https://example.com/apply",
    requiredFields: ["teléfono"],
  }), "es");
  assert.equal(guide.tone, "action");
  assert.equal(guide.waitingOn, "Tú");
  assert.match(guide.nextStep, /teléfono/);
});

test("treats a sent application as waiting for a company response", () => {
  const guide = applicationGuide(application("sent"), "en");
  assert.equal(guide.waitingOn, "Company");
  assert.match(guide.description, /do not have a company response yet/);
});

test("labels a manually tracked interview without claiming company verification", () => {
  const guide = applicationGuide(application("sent", {
    tracking: { stage: "interview", updatedAt: "2026-10-01T10:00:00Z" },
  }), "en");
  assert.equal(guide.source, "personal");
  assert.match(guide.description, /personal tracking/);
});

test("closed applications do not ask the user to wait", () => {
  const guide = applicationGuide(application("rejected"), "es");
  assert.equal(guide.waitingOn, "Nadie");
  assert.equal(guide.tone, "closed");
});
