import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { LoggerService } from "@app/logger";
import { AdminModule } from "./admin.module";

async function bootstrap() {
  const app = await NestFactory.create(AdminModule, { bufferLogs: true });
  app.useLogger(await app.resolve(LoggerService));

  const configService = app.get(ConfigService);
  const port = configService.get<number>("app.adminPort", 3001);

  await app.listen(port);
}
bootstrap();
