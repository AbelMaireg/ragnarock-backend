import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { setupApiDocs } from "@app/docs";
import { LoggerService } from "@app/logger";
import { AdminModule } from "./admin.module";

async function bootstrap() {
  const app = await NestFactory.create(AdminModule, { bufferLogs: true });
  app.useLogger(await app.resolve(LoggerService));

  const configService = app.get(ConfigService);
  const port = configService.get<number>("app.adminPort", 3001);
  const docsPath = configService.get<string>("app.docsPathAdmin", "/docs");
  const openApiPath = configService.get<string>("app.docsOpenApiPathAdmin", "/docs/openapi.json");

  setupApiDocs(app, {
    title: configService.get<string>("app.docsTitleAdmin", "Admin API"),
    description: configService.get<string>(
      "app.docsDescriptionAdmin",
      "Admin service API documentation",
    ),
    version: configService.get<string>("app.docsVersionAdmin", "1.0.0"),
    docsPath,
    openApiPath,
  });

  await app.listen(port);
}
bootstrap();
