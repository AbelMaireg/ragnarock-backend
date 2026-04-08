import { registerAs } from "@nestjs/config";
import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsString, Max, Min } from "class-validator";
import { validateConfig } from "./validate-config";

enum NodeEnvironment {
  Development = "development",
  Test = "test",
  Production = "production",
}

class AppEnvironmentVariables {
  @IsEnum(NodeEnvironment)
  NODE_ENV: NodeEnvironment = NodeEnvironment.Development;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(65535)
  ADMIN_PORT = 3001;

  @IsString()
  DOCS_PATH_MAIN = "/docs";

  @IsString()
  DOCS_PATH_ADMIN = "/docs";

  @IsString()
  DOCS_OPENAPI_PATH_MAIN = "/docs/openapi.json";

  @IsString()
  DOCS_OPENAPI_PATH_ADMIN = "/docs/openapi.json";

  @IsString()
  DOCS_TITLE_MAIN = "Makeup Main API";

  @IsString()
  DOCS_DESCRIPTION_MAIN = "Main service API documentation";

  @IsString()
  DOCS_VERSION_MAIN = "1.0.0";

  @IsString()
  DOCS_TITLE_ADMIN = "Makeup Admin API";

  @IsString()
  DOCS_DESCRIPTION_ADMIN = "Admin service API documentation";

  @IsString()
  DOCS_VERSION_ADMIN = "1.0.0";
}

export default registerAs("app", () => {
  const env = validateConfig(AppEnvironmentVariables, process.env);

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    adminPort: env.ADMIN_PORT,
    docsPathMain: env.DOCS_PATH_MAIN,
    docsPathAdmin: env.DOCS_PATH_ADMIN,
    docsOpenApiPathMain: env.DOCS_OPENAPI_PATH_MAIN,
    docsOpenApiPathAdmin: env.DOCS_OPENAPI_PATH_ADMIN,
    docsTitleMain: env.DOCS_TITLE_MAIN,
    docsDescriptionMain: env.DOCS_DESCRIPTION_MAIN,
    docsVersionMain: env.DOCS_VERSION_MAIN,
    docsTitleAdmin: env.DOCS_TITLE_ADMIN,
    docsDescriptionAdmin: env.DOCS_DESCRIPTION_ADMIN,
    docsVersionAdmin: env.DOCS_VERSION_ADMIN,
  };
});
