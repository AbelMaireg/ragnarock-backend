import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { setupApiDocs } from "@app/docs";
import { LoggerService } from "@app/logger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(await app.resolve(LoggerService));

  const configService = app.get(ConfigService);
  const port = configService.get<number>("app.port", 3000);
  const docsPath = configService.get<string>("app.docsPathMain", "/docs");
  const openApiPath = configService.get<string>("app.docsOpenApiPathMain", "/docs/openapi.json");

  setupApiDocs(app, {
    title: configService.get<string>("app.docsTitleMain", "Main API"),
    description: configService.get<string>(
      "app.docsDescriptionMain",
      "Main service API documentation",
    ),
    version: configService.get<string>("app.docsVersionMain", "1.0.0"),
    docsPath,
    openApiPath,
  });

  await app.listen(port);
}
bootstrap();
