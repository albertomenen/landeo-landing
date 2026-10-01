import assert from "node:assert/strict";
import test from "node:test";
import { coverLetterLanguage } from "../supabase/functions/_shared/cover-letter-language.ts";
import { generateCoverLetter } from "../supabase/functions/_shared/cover-letter.ts";

test("writes in English for an English posting even when the candidate answers are Spanish", () => {
  assert.equal(coverLetterLanguage({
    title: "Software Engineering Intern",
    description: "We are looking for an engineer to build products with our team. You will work with design and product managers and have experience with TypeScript.",
  }), "en");
});

test("uses Spanish when the posting is Spanish despite an English role title", () => {
  assert.equal(coverLetterLanguage({
    title: "Software Engineer",
    description: "Buscamos una persona con experiencia para trabajar en nuestro equipo. El puesto consiste en desarrollar productos para nuestros clientes.",
  }), "es");
});

test("uses the role title when a posting has no description", () => {
  assert.equal(coverLetterLanguage({ title: "Product Designer" }), "en");
  assert.equal(coverLetterLanguage({ title: "Ingeniera de software" }), "es");
});

test("instructs the generator to translate Spanish candidate answers into English for an English job", async () => {
  const originalDeno = globalThis.Deno;
  const originalFetch = globalThis.fetch;
  let sentBody;
  globalThis.Deno = { env: { get: (name) => name === "OPENAI_API_KEY" ? "test-key" : undefined } };
  globalThis.fetch = async (_url, options) => {
    sentBody = JSON.parse(options.body);
    return { ok: true, json: async () => ({ output_text: "Dear hiring team, I am excited to apply for this role. My experience and skills can help your team build products. Thank you for your consideration." }) };
  };
  try {
    const letter = await generateCoverLetter({
      userId: "test-user",
      profile: {
        full_name: "Test Candidate",
        universal_profile: { coverLetter: {
          enabled: true,
          motivation: "Quiero crecer profesionalmente",
          valueProposition: "Aporto experiencia técnica",
          achievement: "Lideré un proyecto",
          companyPreferences: "Busco un buen equipo",
        } },
      },
      job: {
        title: "Software Engineer",
        description: "We are looking for an engineer to build our products with a global team. You will work with designers and managers.",
      },
    });
    assert.equal(letter?.language, "en");
    assert.match(sentBody.instructions, /entire cover letter in English/);
    assert.equal(JSON.parse(sentBody.input).writingLanguage, "English");
  } finally {
    globalThis.Deno = originalDeno;
    globalThis.fetch = originalFetch;
  }
});

test("does not return a Spanish letter for an English posting", async () => {
  const originalDeno = globalThis.Deno;
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.Deno = { env: { get: (name) => name === "OPENAI_API_KEY" ? "test-key" : undefined } };
  globalThis.fetch = async () => {
    attempts++;
    return { ok: true, json: async () => ({ output_text: "Estimado equipo, quiero presentar mi candidatura para este puesto. Tengo experiencia y puedo aportar valor a su empresa. Muchas gracias por considerar mi solicitud." }) };
  };
  try {
    const letter = await generateCoverLetter({
      userId: "test-user",
      profile: {
        full_name: "Test Candidate",
        universal_profile: { coverLetter: {
          enabled: true,
          motivation: "Quiero crecer",
          valueProposition: "Aporto experiencia",
          achievement: "Lideré un proyecto",
          companyPreferences: "Busco un equipo",
        } },
      },
      job: {
        title: "Software Engineer",
        description: "We are looking for an engineer to build products with our global team. You will work with designers and managers.",
      },
    });
    assert.equal(letter, null);
    assert.equal(attempts, 2);
  } finally {
    globalThis.Deno = originalDeno;
    globalThis.fetch = originalFetch;
  }
});
