import { Controller, Get } from "@nestjs/common";
import { Public } from "@app/auth";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get("db/ping")
  @Public()
  testDbConnection(): Promise<{ status: "ok" }> {
    return this.appService.testDbConnection();
  }
}
