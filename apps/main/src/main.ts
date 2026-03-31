import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { LoggerService } from "@app/logger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(await app.resolve(LoggerService));

  const configService = app.get(ConfigService);
  const port = configService.get<number>("app.port", 3000);

  await app.listen(port);
}
bootstrap();
