-- Add partialSrs (incremental SRS built across clarification turns) and
-- srsProgress (0-100 integer for UI progress bar) to projectAiChatSession.

ALTER TABLE "projectAiChatSession"
    ADD COLUMN "partialSrs"  JSONB,
    ADD COLUMN "srsProgress" INTEGER NOT NULL DEFAULT 0;
