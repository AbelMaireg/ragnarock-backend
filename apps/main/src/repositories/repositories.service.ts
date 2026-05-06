import {
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { RequestError } from "@octokit/request-error";
import { Octokit } from "@octokit/rest";
import { Prisma } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import { BETTER_AUTH_INSTANCE, type AuthInstance } from "@app/auth";
import type { Request } from "express";
import { GITHUB_ERROR_CODES } from "./github-errors";
import type {
  BrowseRepositoryQueryDto,
  LinkProjectRepositoryDto,
  ListIssuesQueryDto,
  ListMyGithubReposQueryDto,
  ListPullsQueryDto,
  ListRepositoryCommitsQueryDto,
} from "./dto/repositories.dto";

class TtlCache<T> {
  private readonly store = new Map<string, { expiresAt: number; value: T }>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const row = this.store.get(key);
    if (!row) {
      return undefined;
    }
    if (Date.now() > row.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return row.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { expiresAt: Date.now() + this.ttlMs, value });
  }
}

type RestRepo = {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  description: string | null;
  private: boolean;
  visibility?: string | null;
  default_branch: string | null;
  html_url: string;
  stargazers_count: number;
  pushed_at: string | null;
};

function expressHeadersToFetchHeaders(req: Request): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
    } else {
      headers.set(key, value);
    }
  }
  return headers;
}

function safeDecodeURIComponent(value: string): string {
  try {
    // Express keeps `%2F` encoded in query strings; GitHub expects real slashes.
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

@Injectable()
export class RepositoriesService {
  private readonly hotCache = new TtlCache<unknown>(60_000);
  private readonly maxFileChars = 250_000;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(BETTER_AUTH_INSTANCE)
    private readonly auth: AuthInstance,
  ) {}

  async browseRepository(
    organizationId: string,
    projectId: string,
    repositoryId: string,
    userId: string,
    req: Request,
    query: BrowseRepositoryQueryDto,
  ) {
    const row = await this.ensureLinkedRow(organizationId, projectId, repositoryId);
    const headers = expressHeadersToFetchHeaders(req);
    const octokit = await this.createOctokitForUser(userId, headers);

    const path = safeDecodeURIComponent(query.path ?? "").replace(/^\/+/, "").trim();
    const ref = safeDecodeURIComponent(query.ref?.trim() || row.defaultBranch);

    const cacheKey = `browse:${repositoryId}:${ref}:${path || "<root>"}`;
    const cached = this.hotCache.get(cacheKey);
    if (cached) return cached;

    let data: Awaited<ReturnType<Octokit["rest"]["repos"]["getContent"]>>["data"];
    try {
      const res = await octokit.rest.repos.getContent({
        owner: row.owner,
        repo: row.name,
        path,
        ref,
      });
      data = res.data;
    } catch (e) {
      this.rethrowOctokit(e);
    }

    if (!Array.isArray(data)) {
      // If the path points to a file, the UI should call `getRepositoryFile`.
      throw new HttpException({ message: "Path is a file. Use /file endpoint." }, HttpStatus.BAD_REQUEST);
    }

    const items = data
      .filter((it) => it.type === "dir" || it.type === "file")
      .map((it) => ({
        type: it.type,
        name: it.name,
        path: it.path,
        sha: it.sha,
        size: "size" in it && typeof it.size === "number" ? it.size : null,
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    const payload = {
      ref,
      path,
      items,
    };
    this.hotCache.set(cacheKey, payload);
    return payload;
  }

  async getRepositoryFile(
    organizationId: string,
    projectId: string,
    repositoryId: string,
    userId: string,
    req: Request,
    query: BrowseRepositoryQueryDto,
  ) {
    const row = await this.ensureLinkedRow(organizationId, projectId, repositoryId);
    const headers = expressHeadersToFetchHeaders(req);
    const octokit = await this.createOctokitForUser(userId, headers);

    const path = safeDecodeURIComponent(query.path ?? "").replace(/^\/+/, "").trim();
    if (!path) {
      throw new HttpException({ message: "File path is required" }, HttpStatus.BAD_REQUEST);
    }
    const ref = safeDecodeURIComponent(query.ref?.trim() || row.defaultBranch);

    const cacheKey = `file:${repositoryId}:${ref}:${path}`;
    const cached = this.hotCache.get(cacheKey);
    if (cached) return cached;

    let data: Awaited<ReturnType<Octokit["rest"]["repos"]["getContent"]>>["data"];
    try {
      const res = await octokit.rest.repos.getContent({
        owner: row.owner,
        repo: row.name,
        path,
        ref,
      });
      data = res.data;
    } catch (e) {
      this.rethrowOctokit(e);
    }

    if (Array.isArray(data) || data.type !== "file") {
      throw new HttpException({ message: "Path is not a file" }, HttpStatus.BAD_REQUEST);
    }

    const encoding = data.encoding;
    const rawContent = typeof data.content === "string" ? data.content : "";
    let text = "";
    if (encoding === "base64" && rawContent) {
      try {
        text = Buffer.from(rawContent.replace(/\n/g, ""), "base64").toString("utf8");
      } catch {
        text = "";
      }
    }

    const truncated = text.length > this.maxFileChars;
    const content = truncated ? text.slice(0, this.maxFileChars) : text;

    const payload = {
      ref,
      path,
      name: data.name,
      sha: data.sha,
      size: typeof data.size === "number" ? data.size : null,
      truncated,
      content,
    };
    this.hotCache.set(cacheKey, payload);
    return payload;
  }

  async listMyGithubRepos(userId: string, req: Request, query: ListMyGithubReposQueryDto) {
    const headers = expressHeadersToFetchHeaders(req);
    const octokit = await this.createOctokitForUser(userId, headers);
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 20;
    const q = query.q?.trim() ?? "";

    const cacheKey = `myrepos:${userId}:${q}:${page}:${perPage}`;
    const cached = this.hotCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    let data: Awaited<ReturnType<Octokit["rest"]["search"]["repos"]>>["data"];
    try {
      const { data: authUser } = await octokit.rest.users.getAuthenticated();
      const login = authUser.login;
      const searchQuery = q ? `${q} user:${login}` : `user:${login}`;
      const res = await octokit.rest.search.repos({
        q: searchQuery,
        page,
        per_page: perPage,
        sort: "updated",
        order: "desc",
      });
      data = res.data;
    } catch (e) {
      this.rethrowOctokit(e);
    }

    const payload = {
      items: data.items.map((r) => this.mapSearchRepo(r)),
      totalCount: data.total_count,
      page,
      perPage,
    };
    this.hotCache.set(cacheKey, payload);
    return payload;
  }

  async listLinked(organizationId: string, projectId: string) {
    const rows = await this.prisma.projectRepository.findMany({
      where: { projectId, project: { organizationId } },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((row) => this.mapLinkedRow(row));
  }

  async getLinkedDetail(
    organizationId: string,
    projectId: string,
    repositoryId: string,
    userId: string,
    req: Request,
  ) {
    const row = await this.ensureLinkedRow(organizationId, projectId, repositoryId);
    const headers = expressHeadersToFetchHeaders(req);
    const token = await this.tryGetGithubToken(userId, headers);
    if (!token) {
      return { ...this.mapLinkedRow(row), live: null as null };
    }
    const octokit = new Octokit({ auth: token });
    try {
      const { data } = await octokit.rest.repos.get({
        owner: row.owner,
        repo: row.name,
      });
      const live = this.mapRestRepo(data as RestRepo);
      return { ...this.mapLinkedRow(row), live };
    } catch (e) {
      if (e instanceof RequestError && e.status === 404) {
        return { ...this.mapLinkedRow(row), live: null as null };
      }
      this.rethrowOctokit(e);
    }
  }

  async linkRepository(
    organizationId: string,
    projectId: string,
    userId: string,
    req: Request,
    dto: LinkProjectRepositoryDto,
  ) {
    const headers = expressHeadersToFetchHeaders(req);
    const octokit = await this.createOctokitForUser(userId, headers);
    const owner = dto.owner.trim();
    const name = dto.name.trim();
    let repo: RestRepo;
    try {
      const { data } = await octokit.rest.repos.get({ owner, repo: name });
      repo = data as RestRepo;
    } catch (e) {
      this.rethrowOctokit(e);
    }

    try {
      const created = await this.prisma.projectRepository.create({
        data: {
          projectId,
          githubRepoId: String(repo.id),
          owner: repo.owner.login,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          visibility: repo.visibility ?? (repo.private ? "private" : "public"),
          defaultBranch: repo.default_branch ?? "main",
          htmlUrl: repo.html_url,
          stargazersCount: repo.stargazers_count,
          pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
          cachedAt: new Date(),
          linkedByUserId: userId,
        },
      });
      return this.mapLinkedRow(created);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException("This repository is already linked to the project");
      }
      throw e;
    }
  }

  async unlinkRepository(organizationId: string, projectId: string, repositoryId: string) {
    await this.ensureLinkedRow(organizationId, projectId, repositoryId);
    await this.prisma.projectRepository.delete({ where: { id: repositoryId } });
    return { success: true as const };
  }

  async refreshRepository(
    organizationId: string,
    projectId: string,
    repositoryId: string,
    userId: string,
    req: Request,
  ) {
    const row = await this.ensureLinkedRow(organizationId, projectId, repositoryId);
    const headers = expressHeadersToFetchHeaders(req);
    const octokit = await this.createOctokitForUser(userId, headers);
    let repo: RestRepo;
    try {
      const { data } = await octokit.rest.repos.get({ owner: row.owner, repo: row.name });
      repo = data as RestRepo;
    } catch (e) {
      this.rethrowOctokit(e);
    }
    const updated = await this.prisma.projectRepository.update({
      where: { id: repositoryId },
      data: {
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        visibility: repo.visibility ?? (repo.private ? "private" : "public"),
        defaultBranch: repo.default_branch ?? "main",
        htmlUrl: repo.html_url,
        stargazersCount: repo.stargazers_count,
        pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
        cachedAt: new Date(),
      },
    });
    return this.mapLinkedRow(updated);
  }

  async listCommits(
    organizationId: string,
    projectId: string,
    repositoryId: string,
    userId: string,
    req: Request,
    query: ListRepositoryCommitsQueryDto,
  ) {
    const row = await this.ensureLinkedRow(organizationId, projectId, repositoryId);
    const headers = expressHeadersToFetchHeaders(req);
    const octokit = await this.createOctokitForUser(userId, headers);
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 20;
    const sha = query.branch?.trim() || row.defaultBranch;
    const cacheKey = `commits:${repositoryId}:${sha}:${page}:${perPage}`;
    const cached = this.hotCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    let data: Awaited<ReturnType<Octokit["rest"]["repos"]["listCommits"]>>["data"];
    try {
      const res = await octokit.rest.repos.listCommits({
        owner: row.owner,
        repo: row.name,
        sha,
        page,
        per_page: perPage,
      });
      data = res.data;
    } catch (e) {
      this.rethrowOctokit(e);
    }

    const payload = data.map((c) => ({
      sha: c.sha,
      message: (c.commit.message ?? "").split("\n")[0] ?? "",
      authorName: c.commit.author?.name ?? c.author?.login ?? "unknown",
      authorLogin: c.author?.login ?? null,
      authorAvatarUrl: c.author?.avatar_url ?? null,
      committedAt: c.commit.author?.date ?? null,
      htmlUrl: c.html_url,
    }));
    this.hotCache.set(cacheKey, payload);
    return payload;
  }

  async listContributors(
    organizationId: string,
    projectId: string,
    repositoryId: string,
    userId: string,
    req: Request,
  ) {
    const row = await this.ensureLinkedRow(organizationId, projectId, repositoryId);
    const headers = expressHeadersToFetchHeaders(req);
    const octokit = await this.createOctokitForUser(userId, headers);
    const cacheKey = `contributors:${repositoryId}`;
    const cached = this.hotCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    let data: Awaited<ReturnType<Octokit["rest"]["repos"]["listContributors"]>>["data"];
    try {
      const res = await octokit.rest.repos.listContributors({
        owner: row.owner,
        repo: row.name,
        per_page: 100,
      });
      data = res.data;
    } catch (e) {
      this.rethrowOctokit(e);
    }

    const payload = data
      .filter((c): c is typeof c & { type: "User" } => c.type === "User" && Boolean(c.login))
      .slice(0, 30)
      .map((c) => ({
        login: c.login as string,
        avatarUrl: c.avatar_url,
        contributions: c.contributions,
        htmlUrl: c.html_url,
      }));
    this.hotCache.set(cacheKey, payload);
    return payload;
  }

  async listPulls(
    organizationId: string,
    projectId: string,
    repositoryId: string,
    userId: string,
    req: Request,
    query: ListPullsQueryDto,
  ) {
    const row = await this.ensureLinkedRow(organizationId, projectId, repositoryId);
    const headers = expressHeadersToFetchHeaders(req);
    const octokit = await this.createOctokitForUser(userId, headers);
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 20;
    const state = query.state ?? "open";
    const cacheKey = `pulls:${repositoryId}:${state}:${page}:${perPage}`;
    const cached = this.hotCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    let data: Awaited<ReturnType<Octokit["rest"]["pulls"]["list"]>>["data"];
    try {
      const res = await octokit.rest.pulls.list({
        owner: row.owner,
        repo: row.name,
        state,
        page,
        per_page: perPage,
        sort: "updated",
        direction: "desc",
      });
      data = res.data;
    } catch (e) {
      this.rethrowOctokit(e);
    }

    const payload = data.map((pr) => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      draft: pr.draft,
      authorLogin: pr.user?.login ?? null,
      authorAvatarUrl: pr.user?.avatar_url ?? null,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      htmlUrl: pr.html_url,
    }));
    this.hotCache.set(cacheKey, payload);
    return payload;
  }

  async listIssues(
    organizationId: string,
    projectId: string,
    repositoryId: string,
    userId: string,
    req: Request,
    query: ListIssuesQueryDto,
  ) {
    const row = await this.ensureLinkedRow(organizationId, projectId, repositoryId);
    const headers = expressHeadersToFetchHeaders(req);
    const octokit = await this.createOctokitForUser(userId, headers);
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 20;
    const state = query.state ?? "open";
    const cacheKey = `issues:${repositoryId}:${state}:${page}:${perPage}`;
    const cached = this.hotCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    let data: Awaited<ReturnType<Octokit["rest"]["issues"]["listForRepo"]>>["data"];
    try {
      const res = await octokit.rest.issues.listForRepo({
        owner: row.owner,
        repo: row.name,
        state,
        page,
        per_page: perPage,
        sort: "updated",
        direction: "desc",
      });
      data = res.data;
    } catch (e) {
      this.rethrowOctokit(e);
    }

    const issuesOnly = data.filter((issue) => !("pull_request" in issue && issue.pull_request));

    const payload = issuesOnly.map((issue) => ({
      number: issue.number,
      title: issue.title,
      state: issue.state,
      authorLogin: issue.user?.login ?? null,
      authorAvatarUrl: issue.user?.avatar_url ?? null,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      htmlUrl: issue.html_url,
    }));
    this.hotCache.set(cacheKey, payload);
    return payload;
  }

  private mapLinkedRow(row: {
    id: string;
    projectId: string;
    githubRepoId: string;
    owner: string;
    name: string;
    fullName: string;
    description: string | null;
    visibility: string;
    defaultBranch: string;
    htmlUrl: string;
    stargazersCount: number;
    pushedAt: Date | null;
    cachedAt: Date;
    linkedByUserId: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      projectId: row.projectId,
      githubRepoId: row.githubRepoId,
      owner: row.owner,
      name: row.name,
      fullName: row.fullName,
      description: row.description,
      visibility: row.visibility,
      defaultBranch: row.defaultBranch,
      htmlUrl: row.htmlUrl,
      stargazersCount: row.stargazersCount,
      pushedAt: row.pushedAt?.toISOString() ?? null,
      cachedAt: row.cachedAt.toISOString(),
      linkedByUserId: row.linkedByUserId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapRestRepo(repo: RestRepo) {
    return {
      githubRepoId: String(repo.id),
      owner: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      visibility: repo.visibility ?? (repo.private ? "private" : "public"),
      defaultBranch: repo.default_branch ?? "main",
      htmlUrl: repo.html_url,
      stargazersCount: repo.stargazers_count,
      pushedAt: repo.pushed_at,
    };
  }

  private mapSearchRepo(r: {
    id: number;
    name: string;
    full_name: string;
    owner: { login: string } | null;
    description: string | null;
    private: boolean;
    visibility?: string | null;
    default_branch: string | null;
    html_url: string;
    stargazers_count: number;
    pushed_at: string | null;
  }) {
    const ownerLogin = r.owner?.login ?? "unknown";
    return {
      githubRepoId: String(r.id),
      owner: ownerLogin,
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      visibility: r.visibility ?? (r.private ? "private" : "public"),
      defaultBranch: r.default_branch ?? "main",
      htmlUrl: r.html_url,
      stargazersCount: r.stargazers_count,
      pushedAt: r.pushed_at,
    };
  }

  private async ensureLinkedRow(organizationId: string, projectId: string, repositoryId: string) {
    const row = await this.prisma.projectRepository.findFirst({
      where: { id: repositoryId, projectId, project: { organizationId } },
    });
    if (!row) {
      throw new NotFoundException("Linked repository not found");
    }
    return row;
  }

  private async tryGetGithubToken(userId: string, headers: Headers): Promise<string | null> {
    const account = await this.prisma.account.findFirst({
      where: { userId, providerId: "github" },
      select: { id: true },
    });
    if (!account) {
      return null;
    }
    try {
      const data = await this.auth.api.getAccessToken({
        body: { providerId: "github" },
        headers,
      });
      const token = data?.accessToken;
      return typeof token === "string" && token.length > 0 ? token : null;
    } catch {
      return null;
    }
  }

  private async createOctokitForUser(userId: string, headers: Headers): Promise<Octokit> {
    const account = await this.prisma.account.findFirst({
      where: { userId, providerId: "github" },
      select: { id: true },
    });
    if (!account) {
      throw new HttpException(
        {
          code: GITHUB_ERROR_CODES.NOT_LINKED,
          message:
            "Connect your GitHub account under Account → Preferences to link and browse repositories.",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const data = await this.auth.api.getAccessToken({
        body: { providerId: "github" },
        headers,
      });
      const token = data?.accessToken;
      if (typeof token !== "string" || !token) {
        throw new Error("missing token");
      }
      return new Octokit({ auth: token });
    } catch {
      throw new HttpException(
        {
          code: GITHUB_ERROR_CODES.NOT_LINKED,
          message:
            "Could not use your GitHub connection. Reconnect GitHub under Account → Preferences.",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private rethrowOctokit(e: unknown): never {
    if (e instanceof RequestError) {
      if (e.status === 401) {
        throw new HttpException(
          {
            code: GITHUB_ERROR_CODES.NOT_LINKED,
            message: "GitHub rejected the request. Reconnect your GitHub account and try again.",
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      if (e.status === 403) {
        throw new HttpException(
          {
            code: GITHUB_ERROR_CODES.FORBIDDEN,
            message: "Your GitHub account cannot access this resource (permissions or token scope).",
          },
          HttpStatus.FORBIDDEN,
        );
      }
      if (e.status === 404) {
        throw new NotFoundException("Repository not found on GitHub");
      }
      if (e.status === 403 && e.message.includes("rate limit")) {
        throw new HttpException(
          { code: GITHUB_ERROR_CODES.RATE_LIMIT, message: "GitHub API rate limit exceeded. Try again shortly." },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
    throw e;
  }
}
