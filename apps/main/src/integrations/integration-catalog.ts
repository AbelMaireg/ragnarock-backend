import type { IntegrationAuthMode, IntegrationProviderKey } from "@prisma/client";

export type IntegrationCatalogEntry = {
  provider: IntegrationProviderKey;
  displayName: string;
  description: string;
  authModes: IntegrationAuthMode[];
  /** When true, UI may show connect as disabled until implemented */
  connectImplemented: boolean;
};

export const INTEGRATION_CATALOG: IntegrationCatalogEntry[] = [
  {
    provider: "linear",
    displayName: "Linear",
    description: "Link issues and workspace activity using a Linear personal API token (PAT).",
    authModes: ["pat"],
    connectImplemented: true,
  },
  {
    provider: "figma",
    displayName: "Figma",
    description: "Design files and comments (coming soon).",
    authModes: ["api_key"],
    connectImplemented: false,
  },
  {
    provider: "cursor_workspace",
    displayName: "Cursor",
    description: "Workspace guidance and API keys for Cursor workflows (metadata only in v1).",
    authModes: ["api_key"],
    connectImplemented: false,
  },
];
