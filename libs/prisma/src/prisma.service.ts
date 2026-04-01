import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

const { PrismaClient } = require("@prisma/client") as {
  PrismaClient: new () => {
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
  };
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
