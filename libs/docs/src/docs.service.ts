import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import { ApiDocsSetupOptions } from "./docs.types";

export const setupApiDocs = (app: INestApplication, options: ApiDocsSetupOptions): void => {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle(options.title)
      .setDescription(options.description)
      .setVersion(options.version)
      .build(),
  );

  SwaggerModule.setup(options.openApiPath, app, document, {
    jsonDocumentUrl: options.openApiPath,
    ui: false,
  });

  app.use(
    options.docsPath,
    apiReference({
      url: options.openApiPath,
    }),
  );
};
