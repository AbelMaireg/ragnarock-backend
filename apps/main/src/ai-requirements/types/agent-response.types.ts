/** Responses from FastAPI agent (discriminator `status`). */

export type SrsFeature = {
  featureId: string;
  name: string;
  description: string;
};

export type AgentPartialSrs = {
  project_name?: string | null;
  summary?: string | null;
  features?: SrsFeature[];
  user_roles?: string[];
  functional_requirements?: string[];
  non_functional_requirements?: string[];
  user_stories?: { role: string; goal: string; benefit: string }[];
  acceptance_criteria?: string[];
  out_of_scope?: string[];
};

export type AgentClarificationResponse = {
  status: "needs_clarification";
  questions: string[];
  partial_srs: AgentPartialSrs;
};

export type AgentRequirementResponse = {
  status: "complete";
  project_name: string;
  summary: string;
  features: SrsFeature[];
  functional_requirements: string[];
  non_functional_requirements: string[];
  user_stories: { role: string; goal: string; benefit: string }[];
  acceptance_criteria: string[];
  out_of_scope?: string[];
  business_owner_summary: string;
};

export type AgentDevIntelligenceResponse = {
  status: "answer";
  answer: string;
  references: string[];
  follow_up_suggestions: string[];
};

export type AgentOrchestratorResponse =
  | AgentClarificationResponse
  | AgentRequirementResponse
  | AgentDevIntelligenceResponse;

export function parseAgentResponse(raw: unknown): AgentOrchestratorResponse {
  if (!raw || typeof raw !== "object") {
    throw new Error("Agent response is not an object");
  }
  const o = raw as Record<string, unknown>;
  const status = o.status;

  if (status === "needs_clarification") {
    const questions = o.questions;
    if (!Array.isArray(questions) || !questions.every((q) => typeof q === "string")) {
      throw new Error("Invalid clarification response");
    }
    return {
      status: "needs_clarification",
      questions,
      partial_srs: (o.partial_srs as AgentPartialSrs) ?? {},
    };
  }

  if (status === "complete") {
    return raw as AgentRequirementResponse;
  }

  if (status === "answer") {
    return {
      status: "answer",
      answer: typeof o.answer === "string" ? o.answer : "",
      references: Array.isArray(o.references) ? (o.references as string[]) : [],
      follow_up_suggestions: Array.isArray(o.follow_up_suggestions)
        ? (o.follow_up_suggestions as string[])
        : [],
    };
  }

  throw new Error(`Unknown agent status: ${String(status)}`);
}

/** Compute 0-100 progress from a partial SRS object. */
export function computeSrsProgress(partial: AgentPartialSrs | null | undefined): number {
  if (!partial) return 0;
  const fields: (keyof AgentPartialSrs)[] = [
    "project_name",
    "summary",
    "features",
    "user_roles",
    "functional_requirements",
    "non_functional_requirements",
    "user_stories",
    "acceptance_criteria",
    "out_of_scope",
  ];
  const filled = fields.filter((f) => {
    const v = partial[f];
    if (v === null || v === undefined) return false;
    if (Array.isArray(v)) return v.length > 0;
    return Boolean(v);
  });
  return Math.round((filled.length / fields.length) * 100);
}
