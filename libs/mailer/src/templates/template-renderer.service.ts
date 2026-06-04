import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Handlebars from "handlebars";
import { readdir, readFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";

@Injectable()
export class TemplateRendererService {
  private partialsReady = false;

  constructor(private readonly configService: ConfigService) {}

  async render(templateFileName: string, context: Record<string, unknown>): Promise<string> {
    await this.registerPartials();
    const templatePath = join(this.resolveViewsRoot(), templateFileName);
    const source = await readFile(templatePath, "utf8");
    const compiled = Handlebars.compile(source);
    return compiled(context);
  }

  private async registerPartials(): Promise<void> {
    if (this.partialsReady) {
      return;
    }

    const partialsDir = join(this.resolveViewsRoot(), "partials");
    try {
      const files = await readdir(partialsDir);
      await Promise.all(
        files
          .filter((fileName) => fileName.endsWith(".hbs"))
          .map(async (fileName) => {
            const partialName = fileName.replace(".hbs", "");
            const partialContent = await readFile(join(partialsDir, fileName), "utf8");
            Handlebars.registerPartial(partialName, partialContent);
          }),
      );
    } catch {
      // Partials directory is optional.
    }

    this.partialsReady = true;
  }

  private resolveViewsRoot(): string {
    const defaultRoot = join(process.cwd(), "libs/mailer/src/templates/views");
    const configuredRoot = this.configService.get<string>("mail.templateRoot");
    if (!configuredRoot) {
      return defaultRoot;
    }
    return isAbsolute(configuredRoot) ? configuredRoot : resolve(process.cwd(), configuredRoot);
  }
}
