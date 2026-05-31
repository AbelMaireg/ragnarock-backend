jest.mock("@app/prisma", () => ({ PrismaService: jest.fn() }));
import { Test, TestingModule } from "@nestjs/testing";
import { AdminService } from "./admin.service";
import { PrismaService } from "@app/prisma";

const mockPrisma = {
  $queryRawUnsafe: jest.fn(),
};

describe("AdminService", () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it("getHello returns greeting", () => {
    expect(service.getHello()).toBe("Hello World!");
  });

  it("testDbConnection calls prisma and returns ok", async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([1]);
    const res = await service.testDbConnection();
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith("SELECT 1");
    expect(res).toEqual({ status: "ok" });
  });
});
