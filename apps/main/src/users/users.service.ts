import { Injectable } from "@nestjs/common";
import { PrismaService } from "@app/prisma";
import { TypesenseService } from "@app/typesense";

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly typesenseService: TypesenseService,
  ) {}

  async search(q: string, page = 1, perPage = 20) {
    const result = await this.typesenseService.searchUsers({ q, page, per_page: perPage });
    return {
      found: result.found,
      page: result.page,
      hits: result.hits?.map((hit) => hit.document) ?? [],
    };
  }

  async reindex() {
    const users = await this.prismaService.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        banned: true,
        createdAt: true,
      },
    });

    await Promise.all(users.map((user) => this.typesenseService.upsertUser(user)));

    return { indexed: users.length };
  }
}
