import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AiAgentHttpService {
  private readonly logger = new Logger(AiAgentHttpService.name);

  constructor(private readonly configService: ConfigService) {}

  private ensureEnabled(): { baseUrl: string; internalApiKey: string } {
    const enabled = this.configService.get<boolean>("aiAgent.enabled", false);
    if (!enabled) {
      throw new ServiceUnavailableException(
        "AI agent is not configured. Set AI_AGENT_BASE_URL and AI_AGENT_INTERNAL_API_KEY.",
      );
    }
    const baseUrl = this.configService.get<string>("aiAgent.baseUrl", "");
    const internalApiKey = this.configService.get<string>("aiAgent.internalApiKey", "");
    if (!baseUrl || !internalApiKey) {
      throw new ServiceUnavailableException("AI agent configuration is incomplete.");
    }
    return { baseUrl, internalApiKey };
  }

  async postRequirementsJson(body: Record<string, unknown>): Promise<unknown> {
    const { baseUrl, internalApiKey } = this.ensureEnabled();
    const url = `${baseUrl}/ai/requirements`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-API-Key": internalApiKey,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.warn(`AI agent fetch failed: ${url} — ${err instanceof Error ? err.message : err}`);
      throw new BadGatewayException("Could not reach AI agent service.");
    }

    return this.parseResponse(res, url);
  }

  async postRequirementsMultipart(formData: FormData): Promise<unknown> {
    const { baseUrl, internalApiKey } = this.ensureEnabled();
    const url = `${baseUrl}/ai/requirements/upload`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "X-Internal-API-Key": internalApiKey,
        },
        body: formData,
      });
    } catch (err) {
      this.logger.warn(`AI agent fetch failed: ${url} — ${err instanceof Error ? err.message : err}`);
      throw new BadGatewayException("Could not reach AI agent service.");
    }

    return this.parseResponse(res, url);
  }

  private async parseResponse(res: Response, urlForLog: string): Promise<unknown> {
    const text = await res.text();
    if (!res.ok) {
      const preview = text.length > 2000 ? `${text.slice(0, 2000)}…` : text;
      let detail = preview;
      try {
        const j = JSON.parse(text) as { detail?: unknown };
        if (typeof j.detail === "string") {
          detail = j.detail;
        }
      } catch {
        /* keep preview */
      }
      this.logger.warn(`AI agent error ${res.status} ${urlForLog}: ${preview}`);
      throw new BadGatewayException(detail || `AI agent returned ${res.status}`);
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      this.logger.warn(`AI agent non-JSON response from ${urlForLog}: ${text.slice(0, 500)}`);
      throw new BadGatewayException("AI agent returned invalid JSON.");
    }
  }
}
