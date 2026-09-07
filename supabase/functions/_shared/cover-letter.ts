export type CoverLetterProfile = {
  enabled?: boolean;
  motivation?: string;
  valueProposition?: string;
  achievement?: string;
  companyPreferences?: string;
  doNotMention?: string;
  tone?: "professional" | "warm" | "direct";
};

type CoverLetterResult = {
  text: string;
  model: string;
  generatedAt: string;
};

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function coverLetterProfileFrom(value: unknown): CoverLetterProfile | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const nested = candidate.coverLetter;
  if (!nested || typeof nested !== "object") return null;
  const profile = nested as Record<string, unknown>;
  const motivation = cleanText(profile.motivation, 1_500);
  const valueProposition = cleanText(profile.valueProposition, 1_500);
  const achievement = cleanText(profile.achievement, 1_500);
  const companyPreferences = cleanText(profile.companyPreferences, 1_000);
  if (profile.enabled === false || !motivation || !valueProposition || !achievement || !companyPreferences) return null;
  const tone = ["professional", "warm", "direct"].includes(String(profile.tone))
    ? profile.tone as CoverLetterProfile["tone"]
    : "professional";
  return {
    enabled: true,
    motivation,
    valueProposition,
    achievement,
    companyPreferences,
    doNotMention: cleanText(profile.doNotMention, 700),
    tone,
  };
}

async function safetyIdentifier(userId: string) {
  const bytes = new TextEncoder().encode(userId);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function outputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") return payload.output_text.trim();
  const output = Array.isArray(payload.output) ? payload.output : [];
  return output.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? (item as Record<string, unknown>).content as Array<Record<string, unknown>>
      : [];
    return content.flatMap((part) => part.type === "output_text" && typeof part.text === "string" ? [part.text] : []);
  }).join("\n").trim();
}

export async function generateCoverLetter(input: {
  userId: string;
  profile: Record<string, unknown>;
  job: Record<string, unknown>;
}): Promise<CoverLetterResult | null> {
  const preferences = coverLetterProfileFrom(input.profile.universal_profile);
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!preferences || !apiKey) return null;

  const model = Deno.env.get("OPENAI_COVER_LETTER_MODEL") || "gpt-5.4-mini";
  const universal = input.profile.universal_profile && typeof input.profile.universal_profile === "object"
    ? input.profile.universal_profile as Record<string, unknown>
    : {};
  const jobMetadata = input.job.metadata && typeof input.job.metadata === "object"
    ? input.job.metadata as Record<string, unknown>
    : {};
  const payload = {
    candidate: {
      name: cleanText(input.profile.full_name, 120),
      currentRole: cleanText(input.profile.role, 160),
      skills: Array.isArray(input.profile.skills) ? input.profile.skills.slice(0, 15).map((skill) => cleanText(skill, 80)) : [],
      yearsExperience: Number(universal.yearsExperience) || 0,
      motivation: preferences.motivation,
      valueProposition: preferences.valueProposition,
      achievement: preferences.achievement,
      companyPreferences: preferences.companyPreferences,
      doNotMention: preferences.doNotMention,
      tone: preferences.tone,
    },
    job: {
      title: cleanText(input.job.title, 180),
      company: cleanText(input.job.company, 180),
      location: cleanText(input.job.location, 180),
      seniority: cleanText(input.job.seniority, 100),
      contractType: cleanText(input.job.contract_type, 100),
      summary: cleanText(input.job.summary, 2_000),
      description: cleanText(input.job.description, 6_000),
      requirements: Array.isArray(jobMetadata.requirements)
        ? jobMetadata.requirements.slice(0, 15).map((item) => cleanText(item, 180))
        : [],
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        store: false,
        safety_identifier: await safetyIdentifier(input.userId),
        max_output_tokens: 700,
        instructions: [
          "Write one tailored cover letter for the job application supplied as JSON.",
          "Use the language of the job description; if unclear, use Spanish.",
          "Use only facts present in the JSON. Never invent employers, dates, metrics, qualifications, skills, or personal claims.",
          "Write 220-320 words in plain text, with short paragraphs, no markdown, no postal address, and no placeholders.",
          "Open with a natural greeting to the hiring team and close with the candidate's real name.",
          "Connect the candidate's stated motivation, value and achievement to the role and company without sounding generic.",
          "Respect the doNotMention field. If a detail is missing, omit it rather than guessing.",
        ].join(" "),
        input: JSON.stringify(payload),
      }),
    });
    const result = await response.json() as Record<string, unknown>;
    if (!response.ok) {
      console.error("OpenAI cover-letter request failed", response.status);
      return null;
    }
    const text = outputText(result).slice(0, 5_000);
    return text ? { text, model, generatedAt: new Date().toISOString() } : null;
  } catch (error) {
    console.error("Cover-letter generation failed", error instanceof Error ? error.name : "unknown");
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
