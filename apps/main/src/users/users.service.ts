import { Injectable } from "@nestjs/common";
import { PaginatedResponseBase } from "@app/common";
import { PrismaService } from "@app/prisma";
import { TypesenseService } from "@app/typesense";
import type { UserDocument } from "@app/typesense/collections/user.collection";
import { SearchUsersQueryDto } from "./dto/search-users.query.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly typesenseService: TypesenseService,
  ) {}

  async search(query: SearchUsersQueryDto): Promise<PaginatedResponseBase<UserDocument>> {
    const page = Number(query.page) || 1;
    const perPage = Number(query.perPage) || 20;
    const q = query.q || "*";
    const result = await this.typesenseService.searchUsers({ q, page, per_page: perPage });

    const total = result.found ?? 0;
    const totalPages = total > 0 ? Math.ceil(total / perPage) : 0;

    return {
      items: result.hits?.map((hit) => hit.document) ?? [],
      page: result.page ?? page,
      perPage,
      total,
      totalPages,
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
