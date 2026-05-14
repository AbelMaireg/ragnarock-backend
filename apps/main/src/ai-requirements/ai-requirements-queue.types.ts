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
