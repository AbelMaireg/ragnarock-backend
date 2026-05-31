jest.mock("@app/prisma", () => ({ PrismaService: jest.fn() }));
import { Test, TestingModule } from "@nestjs/testing";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

describe("AdminController", () => {
  let controller: AdminController;

  const mockService = {
    getHello: () => "Hello World!",
    testDbConnection: jest.fn().mockResolvedValue({ status: "ok" }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it("GET / returns Hello World!", () => {
    expect(controller.getHello()).toBe("Hello World!");
  });

  it("GET /db/ping returns ok", async () => {
    const r = await controller.testDbConnection();
    expect(r).toEqual({ status: "ok" });
  });
});

