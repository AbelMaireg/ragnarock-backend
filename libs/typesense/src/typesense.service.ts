import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client } from "typesense";
import type { SearchResponse } from "typesense/lib/Typesense/Documents";
import type { SearchParams } from "typesense/lib/Typesense/Types";
import {
  USER_COLLECTION_NAME,
  UserDocument,
  mapUserToDocument,
  userCollectionSchema,
} from "./collections/user.collection";

@Injectable()
export class TypesenseService implements OnModuleInit {
  private readonly logger = new Logger(TypesenseService.name);
  private readonly client: Client;

  constructor(private readonly configService: ConfigService) {
    this.client = new Client({
      nodes: [
        {
          host: this.configService.getOrThrow<string>("typesense.host"),
          port: this.configService.getOrThrow<number>("typesense.port"),
          protocol: this.configService.get<string>("typesense.protocol", "http"),
        },
      ],
      apiKey: this.configService.getOrThrow<string>("typesense.apiKey"),
      connectionTimeoutSeconds: 5,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureCollections();
  }

  // ── User operations ─────────────────────────────────────────────────────────

  async upsertUser(user: Parameters<typeof mapUserToDocument>[0]): Promise<void> {
    const doc = mapUserToDocument(user);
    try {
      await this.client.collections<UserDocument>(USER_COLLECTION_NAME).documents().upsert(doc);
    } catch (error) {
      this.logger.error(`Failed to upsert user ${user.id} in Typesense`, error);
    }
  }

  async searchUsers(
    params: Pick<
      SearchParams<UserDocument>,
      "q" | "query_by" | "filter_by" | "sort_by" | "page" | "per_page"
    >,
  ): Promise<SearchResponse<UserDocument>> {
    return this.client
      .collections<UserDocument>(USER_COLLECTION_NAME)
      .documents()
      .search({
        query_by: "name,email",
        per_page: 20,
        ...params,
      });
  }

  async deleteUser(id: string): Promise<void> {
    try {
      await this.client.collections<UserDocument>(USER_COLLECTION_NAME).documents(id).delete();
    } catch (error) {
      this.logger.error(`Failed to delete user ${id} from Typesense`, error);
    }
  }

  // ── Collection bootstrap ─────────────────────────────────────────────────────

  private async ensureCollections(): Promise<void> {
    await this.ensureCollection(USER_COLLECTION_NAME, () =>
      this.client.collections().create(userCollectionSchema),
    );
    // Future collections: add more ensureCollection calls here.
  }

  private async ensureCollection(name: string, create: () => Promise<unknown>): Promise<void> {
    try {
      await this.client.collections(name).retrieve();
      this.logger.log(`Typesense collection "${name}" already exists`);
    } catch {
      await create();
      this.logger.log(`Typesense collection "${name}" created`);
    }
  }
}
