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

export type AiRequirementsResultEvent = AiRequirementsSucceededResult | AiRequirementsFailedResult;

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

// ─── Project Planner — one-shot task breakdown ───────────────────────────────

export type AiPlannerQueuedJob = {
  /** Discriminates job kind on the FastAPI side. */
  jobType: "planner";
  jobId: string;
  projectId: string;
  organizationId: string;
  userId: string;
  projectContext?: AiProjectContext;
  /** Full or partial SRS — the planner reads features and requirements from here. */
  partialSrs?: AgentPartialSrs;
  attempts: number;
  queuedAt: string;
};

export type AiPlannerAcceptedResponse = {
  jobId: string;
  status: "queued";
};

/**
 * Shape of each task inside AiPlannerSucceededResult.tasks.
 * Mirrors PlannerTask in ragnarock-ai/app/schemas/planner.py (camelCase aliases).
 * Maps directly to CreateProjectTaskDto fields used for bulk-create.
 */
export type AiPlannerTask = {
  featureId: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  phase: "discovery" | "planning" | "build" | "test" | "release";
  labels: string[];
  dependsOn: string[];
  executionOrder: number;
  effortEstimate: "xs" | "s" | "m" | "l" | "xl";
};

export type AiPlannerSucceededResult = {
  jobId: string;
  projectId: string;
  userId: string;
  status: "planner_succeeded";
  tasks: AiPlannerTask[];
  completedAt?: string;
};

export type AiPlannerFailedResult = {
  jobId: string;
  projectId: string;
  userId: string;
  status: "planner_failed";
  error: string;
  failedAt?: string;
};

export type AiPlannerResultEvent = AiPlannerSucceededResult | AiPlannerFailedResult;

// ─── QA Intelligence — one-shot test suite generation ────────────────────────

export type AiQaIntelligenceQueuedJob = {
  jobType: "qa_intelligence";
  jobId: string;
  projectId: string;
  organizationId: string;
  userId: string;
  projectContext?: AiProjectContext;
  partialSrs?: AgentPartialSrs;
  /** Markdown content of the latest architecture doc — null if none exists yet. */
  archContext?: string | null;
  attempts: number;
  queuedAt: string;
};

export type AiQaIntelligenceAcceptedResponse = {
  jobId: string;
  status: "queued";
};

export type QaTestCase = {
  id: string;
  type: "unit" | "integration" | "e2e";
  title: string;
  preconditions: string[];
  steps: string[];
  expectedResult: string;
  requirementId?: string | null;
};

export type QaTestSuite = {
  featureId: string;
  featureName: string;
  acceptanceCriteria: string[];
  testCases: QaTestCase[];
};

export type AiQaIntelligenceSucceededResult = {
  jobId: string;
  projectId: string;
  userId: string;
  status: "qa_intelligence_succeeded";
  content: string;
  title: string;
  testSuites: QaTestSuite[];
  completedAt?: string;
};

export type AiQaIntelligenceFailedResult = {
  jobId: string;
  projectId: string;
  userId: string;
  status: "qa_intelligence_failed";
  error: string;
  failedAt?: string;
};

export type AiQaIntelligenceResultEvent =
  | AiQaIntelligenceSucceededResult
  | AiQaIntelligenceFailedResult;

// ─── Ragnarock Chat — project Q&A + intent routing ───────────────────────────

export type RagnarockDetectedAction = {
  type: "generate_srs" | "generate_plan" | "generate_doc" | "none";
  docType?: string;
  confirmationText: string;
};

export type RagnarockTaskSummary = {
  id: string;
  title: string;
  status: string;
  phase?: string | null;
  priority: string;
  assigneeName?: string | null;
};

export type RagnarockDocSummary = {
  id: string;
  title: string;
  type: string;
  status: string;
};

export type RagnarockMemberSummary = {
  userId: string;
  name?: string | null;
  email?: string | null;
  role: string;
  personas: string[];
};

export type RagnarockActivitySummary = {
  action: string;
  entityType: string;
  actorName?: string | null;
  createdAt: string;
};

export type RagnarockProjectSnapshot = {
  projectId: string;
  name: string;
  description?: string | null;
  status: string;
  hasSrs: boolean;
  srsSummary?: string | null;
  tasks: RagnarockTaskSummary[];
  docs: RagnarockDocSummary[];
  members: RagnarockMemberSummary[];
  recentActivity: RagnarockActivitySummary[];
};

export type RagnarockChatQueuedJob = {
  jobType: "ragnarock_chat";
  jobId: string;
  projectId: string;
  organizationId: string;
  userId: string;
  sessionId: string;
  message: string;
  projectSnapshot: RagnarockProjectSnapshot;
  attempts: number;
  queuedAt: string;
};

export type RagnarockChatAcceptedResponse = { jobId: string; status: "queued" };

export type RagnarockChatSucceededResult = {
  jobId: string;
  projectId: string;
  userId: string;
  sessionId: string;
  status: "ragnarock_chat_succeeded";
  answer: string;
  detectedAction?: RagnarockDetectedAction | null;
  completedAt?: string;
};

export type RagnarockChatFailedResult = {
  jobId: string;
  projectId: string;
  userId: string;
  status: "ragnarock_chat_failed";
  error: string;
};

export type RagnarockChatResultEvent = RagnarockChatSucceededResult | RagnarockChatFailedResult;
