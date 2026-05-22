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

/** Which specialist agent should handle the turn. Matches an AgentDefinition.key. */
export type AgentType = string;

export type AiRequirementsQueuedJob = {
  /** Discriminates job kind on the FastAPI side. */
  jobType: "chat_turn";
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

// ─── One-shot architecture document generation ───────────────────────────────

/** Supported architecture document types that the AI can generate. */
export type ArchDocType = "sad" | "hld" | "lld" | "adr";

export type AiArchDocQueuedJob = {
  /** Discriminates job kind on the FastAPI side. */
  jobType: "arch_doc";
  jobId: string;
  projectId: string;
  organizationId: string;
  userId: string;
  /** Which layer (e.g. "backend", "frontend", "mobile") — becomes part of the doc title. */
  layer?: string;
  docType: ArchDocType;
  projectContext?: AiProjectContext;
  partialSrs?: AgentPartialSrs;
  attempts: number;
  queuedAt: string;
};

export type AiArchDocAcceptedResponse = {
  jobId: string;
  status: "queued";
};

export type AiArchDocSucceededResult = {
  jobId: string;
  projectId: string;
  userId: string;
  status: "arch_doc_succeeded";
  docType: ArchDocType;
  layer?: string;
  content: string;
  title: string;
  completedAt?: string;
};

export type AiArchDocFailedResult = {
  jobId: string;
  projectId: string;
  userId: string;
  status: "arch_doc_failed";
  error: string;
  failedAt?: string;
};

export type AiArchDocResultEvent = AiArchDocSucceededResult | AiArchDocFailedResult;
