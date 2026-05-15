import type { AgentOrchestratorResponse, AgentPartialSrs } from "./types/agent-response.types";

export type AiConversationTurn = {
  role: "assistant" | "user";
  content: string;
};

export type AiRequirementsQueuedUpload = {
  key: string;
  location: string;
  filename: string;
  contentType?: string;
  size: number;
};

export type AiProjectContext = {
  name: string;
  description?: string | null;
};

/** SDLC persona of the user — used by the router agent to pick the right specialist. */
export type UserPersona =
  | "business_owner"
  | "developer"
  | "qa_engineer"
  | "project_manager"
  | "stakeholder";

/** Which specialist agent should handle the turn. */
export type AgentType = "requirements" | "developer_advisor";

export type AiRequirementsQueuedJob = {
  jobId: string;
  projectId: string;
  organizationId: string;
  userId: string;
  sessionId: string;
  userMessageId: string;
  type: "text" | "url" | "upload";
  input: string;
  conversationHistory: AiConversationTurn[];
  upload?: AiRequirementsQueuedUpload;
  partialSrs?: AgentPartialSrs;
  projectContext?: AiProjectContext;
  /** Persona of the submitting user — routing hint for the FastAPI router agent. */
  userPersona?: UserPersona;
  /** Agent type for this session, resolved at turn-submission time. */
  agentType: AgentType;
  attempts: number;
  queuedAt: string;
};

export type AiRequirementsAcceptedResponse = {
  jobId: string;
  userMessageId: string;
  status: "queued";
};

export type AiRequirementsSucceededResult = {
  jobId: string;
  projectId: string;
  userId: string;
  sessionId: string;
  userMessageId: string;
  status: "succeeded";
  response: AgentOrchestratorResponse;
  attempts?: number;
  completedAt?: string;
};

export type AiRequirementsFailedResult = {
  jobId: string;
  projectId: string;
  userId: string;
  sessionId: string;
  userMessageId: string;
  status: "failed";
  error: string;
  attempts?: number;
  failedAt?: string;
};

export type AiRequirementsResultEvent =
  | AiRequirementsSucceededResult
  | AiRequirementsFailedResult;
