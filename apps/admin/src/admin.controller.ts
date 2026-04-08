import { Controller, Get } from "@nestjs/common";
import { Public } from "@app/auth";
import { AdminService } from "./admin.service";

@Controller()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @Public()
  getHello(): string {
    return this.adminService.getHello();
  }

  @Get("db/ping")
  @Public()
  testDbConnection(): Promise<{ status: "ok" }> {
    return this.adminService.testDbConnection();
  }
}
