import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "libs/prisma/src/schema.prisma",
  migrations: {
    path: "libs/prisma/src/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
