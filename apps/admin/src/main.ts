import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AdminModule } from "./admin.module";

async function bootstrap() {
  const app = await NestFactory.create(AdminModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>("ADMIN_PORT", 3001);

  await app.listen(port);
}
bootstrap();
