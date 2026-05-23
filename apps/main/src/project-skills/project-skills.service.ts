import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@app/prisma";

import { CreateProjectSkillDto, UpdateProjectSkillDto } from "./dto/project-skill.dto";

function slugifyTitle(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base.length > 0 ? base : "skill";
}

@Injectable()
export class ProjectSkillsService {
  constructor(private readonly prismaService: PrismaService) {}

  private async ensureProjectInOrg(projectId: string, organizationId: string) {
    const project = await this.prismaService.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true, name: true },
    });
    if (!project) {
      throw new NotFoundException("Project not found");
    }
    return project;
  }

  async list(projectId: string, organizationId: string) {
    await this.ensureProjectInOrg(projectId, organizationId);
    return this.prismaService.skill.findMany({
      where: { projectId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getById(projectId: string, organizationId: string, skillId: string) {
    await this.ensureProjectInOrg(projectId, organizationId);
    const skill = await this.prismaService.skill.findFirst({
      where: { id: skillId, projectId },
    });
    if (!skill) {
      throw new NotFoundException("Skill not found");
    }
    return skill;
  }

  async create(
    projectId: string,
    organizationId: string,
    userId: string,
    dto: CreateProjectSkillDto,
  ) {
    await this.ensureProjectInOrg(projectId, organizationId);
    const slug = dto.slug ?? slugifyTitle(dto.title);
    try {
      return await this.prismaService.skill.create({
        data: {
          projectId,
          title: dto.title.trim(),
          slug,
          summary: dto.summary?.trim() || null,
          bodyMarkdown: dto.bodyMarkdown,
          createdBy: userId,
        },
      });
    } catch (e: unknown) {
      if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
        throw new ConflictException("A skill with this slug already exists in the project");
      }
      throw e;
    }
  }

  async update(
    projectId: string,
    organizationId: string,
    skillId: string,
    userId: string,
    dto: UpdateProjectSkillDto,
  ) {
    await this.getById(projectId, organizationId, skillId);
    return this.prismaService.skill.update({
      where: { id: skillId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.summary !== undefined
          ? { summary: dto.summary === null ? null : dto.summary.trim() }
          : {}),
        ...(dto.bodyMarkdown !== undefined ? { bodyMarkdown: dto.bodyMarkdown } : {}),
        updatedAt: new Date(),
      },
    });
  }

  async remove(projectId: string, organizationId: string, skillId: string) {
    await this.getById(projectId, organizationId, skillId);
    await this.prismaService.skill.delete({ where: { id: skillId } });
    return { deleted: true };
  }

  buildExportMarkdown(
    skill: {
      title: string;
      slug: string;
      summary: string | null;
      bodyMarkdown: string;
      updatedAt: Date;
    },
    projectId: string,
  ): string {
    const frontmatter = [
      "---",
      `title: ${JSON.stringify(skill.title)}`,
      `slug: ${JSON.stringify(skill.slug)}`,
      `projectId: ${JSON.stringify(projectId)}`,
      `summary: ${JSON.stringify(skill.summary ?? "")}`,
      `updatedAt: ${skill.updatedAt.toISOString()}`,
      "---",
      "",
      skill.bodyMarkdown.trimEnd(),
      "",
    ].join("\n");
    return frontmatter;
  }

  buildExportTxt(skill: { title: string; summary: string | null; bodyMarkdown: string }): string {
    const parts = [
      skill.title,
      "",
      skill.summary?.trim() || "",
      "",
      skill.bodyMarkdown.trimEnd(),
      "",
    ];
    return parts.join("\n");
  }
}
