/** Responses from FastAPI /ai/requirements (discriminator `status`). */
export type AgentClarificationResponse = {
  status: "needs_clarification";
  questions: string[];
};

export type AgentRequirementResponse = {
  status: "complete";
  project_name: string;
  summary: string;
  features: { name: string; description: string }[];
  functional_requirements: string[];
  non_functional_requirements: string[];
  user_stories: { role: string; goal: string; benefit: string }[];
  acceptance_criteria: string[];
  out_of_scope?: string[];
  business_owner_summary: string;
};

export type AgentOrchestratorResponse = AgentClarificationResponse | AgentRequirementResponse;

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
    return { status: "needs_clarification", questions };
  }
  if (status === "complete") {
    return raw as AgentRequirementResponse;
  }
  throw new Error(`Unknown agent status: ${String(status)}`);
}
