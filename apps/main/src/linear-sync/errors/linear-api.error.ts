export class LinearApiError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "LinearApiError";
  }
}

export const LINEAR_ERROR_CODES = {
  NOT_CONNECTED: "LINEAR_NOT_CONNECTED",
  NOT_LINKED: "LINEAR_NOT_LINKED",
  SYNC_IN_PROGRESS: "LINEAR_SYNC_IN_PROGRESS",
} as const;
